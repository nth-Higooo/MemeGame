import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/player",
  timeout: 60000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:8790", trace: "retain-on-failure" },
  projects: [
    {
      name: "player-chrome",
      use: {
        ...devices["Pixel 7"],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
          : {},
      },
    },
    { name: "player-webkit", use: { ...devices["iPhone 15"] } },
  ],
  webServer: {
    command:
      "node node_modules/wrangler/bin/wrangler.js dev --config apps/worker/wrangler.jsonc --port 8790 --persist-to .wrangler/player-e2e --var ADMIN_SESSION_SECRET:player-e2e-only-long-test-secret --var ADMIN_BOOTSTRAP_PASSWORD:player-e2e-bootstrap",
    url: "http://127.0.0.1:8790/api/health",
    reuseExistingServer: !process.env.CI,
  },
});
