import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const cmsRoot = path.join(repositoryRoot, "apps", "cms");
const nextBinary = path.join(
  repositoryRoot,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const child = spawn(process.execPath, [nextBinary, "build", "--webpack"], {
  cwd: cmsRoot,
  env: {
    ...process.env,
    CMS_BUILD_DIR: ".next-release",
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("CMS release build could not start.", error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`CMS release build stopped by signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
