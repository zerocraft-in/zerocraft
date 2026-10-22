import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const cmsRoot = path.join(repositoryRoot, "apps", "cms");
const nextBinary = path.join(repositoryRoot, "node_modules", "next", "dist", "bin", "next");
const smokeScript = path.join(scriptDirectory, "smoke-cms.mjs");
const port = process.env.CMS_SMOKE_PORT || "3102";
const baseUrl = `http://127.0.0.1:${port}`;
const buildId = path.join(cmsRoot, ".next-release", "BUILD_ID");

if (!existsSync(buildId)) {
  throw new Error(
    "CMS release artifact is missing. Run `npm run build:cms:release` before the artifact smoke test.",
  );
}

const server = spawn(process.execPath, [nextBinary, "start", "--port", port], {
  cwd: cmsRoot,
  env: {
    ...process.env,
    CMS_BUILD_DIR: ".next-release",
    HOSTNAME: "127.0.0.1",
  },
  stdio: "inherit",
});

let serverExit;
const serverExited = new Promise((resolve) => {
  server.once("exit", (code, signal) => {
    serverExit = { code, signal };
    resolve(serverExit);
  });
});

async function waitUntilReady() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serverExit) {
      throw new Error(`CMS server exited before readiness (code ${serverExit.code}, signal ${serverExit.signal}).`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
      if (response.ok) return;
    } catch {
      // The server socket is not accepting requests yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("CMS server did not become ready within 30 seconds.");
}

function runSmokeChecks() {
  return new Promise((resolve, reject) => {
    const smoke = spawn(process.execPath, [smokeScript], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        CMS_BASE_URL: baseUrl,
        CMS_SMOKE_MODE: "artifact",
      },
      stdio: "inherit",
    });
    smoke.once("error", reject);
    smoke.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`CMS artifact smoke checks failed (code ${code}, signal ${signal}).`));
    });
  });
}

async function stopServer() {
  if (serverExit) return;
  server.kill("SIGTERM");
  await Promise.race([
    serverExited,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (!serverExit) server.kill("SIGKILL");
}

try {
  await waitUntilReady();
  await runSmokeChecks();
  console.log("CMS release artifact booted and passed smoke validation.");
} finally {
  await stopServer();
}
