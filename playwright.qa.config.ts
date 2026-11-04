import { defineConfig } from "@playwright/test";
import playerConfig from "./playwright.player.config";

export default defineConfig({
  ...playerConfig,
  testDir: "./tests/qa",
  timeout: 360000,
  expect: { timeout: 30000 },
  workers: 1,
  retries: 0,
  projects: [
    {
      name: "qa-chrome",
      use: {
        viewport: { width: 390, height: 844 },
        launchOptions: {
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
            : {}),
          args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
        },
      },
    },
  ],
});
