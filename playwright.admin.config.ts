import { defineConfig, devices } from "@playwright/test";
import playerConfig from "./playwright.player.config";
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  : {};
export default defineConfig({
  ...playerConfig,
  testDir: "./tests/admin",
  timeout: 90000,
  projects: [
    {
      name: "admin-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 }, launchOptions },
    },
    {
      name: "admin-webkit",
      use: { ...devices["Desktop Safari"], viewport: { width: 1024, height: 1000 } },
    },
  ],
});
