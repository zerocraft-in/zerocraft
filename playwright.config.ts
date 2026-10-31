import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  webServer: {
    command: "npx next dev --port 3011 --hostname 127.0.0.1",
    cwd: "apps/store",
    url: "http://127.0.0.1:3011/shop",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3011",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...[320, 375, 390, 430, 768].map((width) => ({
      name: `mobile-${width}`,
      use: { ...devices["Desktop Chrome"], viewport: { width, height: 900 } },
    })),
  ],
});
