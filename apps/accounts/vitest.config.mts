import { fileURLToPath } from "node:url";
import path from "node:path";

import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": srcDir,
      // `server-only` is a build-time marker with no runtime export; vitest's
      // Node environment cannot resolve the (uninstalled) package, so map it
      // to an empty module for tests.
      "server-only": path.join(srcDir, "..", "test-stubs", "server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    reporters: "default",
  },
});
