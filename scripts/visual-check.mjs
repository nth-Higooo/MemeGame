import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("artifacts/phase02");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
});

const cases = [
  { name: "player-iphone-se", path: "/play/MT2026", viewport: { width: 320, height: 700 } },
  { name: "display-projector", path: "/display/MT2026", viewport: { width: 1600, height: 900 } },
  { name: "admin-desktop", path: "/admin/MT2026", viewport: { width: 1440, height: 1000 } },
  {
    name: "design-system",
    path: "/dev/design-system",
    viewport: { width: 1440, height: 1000 },
    fullPage: true,
  },
];

const results = [];
for (const item of cases) {
  const page = await browser.newPage({ viewport: item.viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`http://127.0.0.1:5173${item.path}`, {
    waitUntil: "networkidle",
  });
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  const screenshot = path.join(outputDir, `${item.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: item.fullPage ?? false });
  results.push({
    name: item.name,
    status: response?.status(),
    screenshot,
    horizontalOverflow: dimensions.scrollWidth > dimensions.clientWidth,
    consoleErrors: errors,
  });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));

if (
  results.some(
    (result) => result.status !== 200 || result.horizontalOverflow || result.consoleErrors.length,
  )
) {
  process.exitCode = 1;
}
