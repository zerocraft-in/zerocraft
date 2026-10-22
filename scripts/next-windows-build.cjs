const { spawnSync } = require("node:child_process");

const nextBin = require.resolve("next/dist/bin/next");
const nextWindowsFsHook = require.resolve("./next-windows-fs.cjs");
const nodeOptions = process.platform === "win32"
  ? `${process.env.NODE_OPTIONS ?? ""} --require ${nextWindowsFsHook}`.trim()
  : process.env.NODE_OPTIONS;
const result = spawnSync(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
