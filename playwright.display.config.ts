import { defineConfig, devices } from "@playwright/test";
import playerConfig from "./playwright.player.config";
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  : {};
export default defineConfig({
  ...playerConfig,
  testDir: "./tests/display",
  projects: [
    {
      name: "projector-720p",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 }, launchOptions },
    },
    {
      name: "projector-1080p",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 }, launchOptions },
    },
    {
      name: "desktop-webkit",
      use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 720 } },
    },
  ],
});
