import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001",
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
