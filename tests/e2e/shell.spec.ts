import { expect, test } from "@playwright/test";

test("home exposes all three interfaces", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Chọn meme/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Người chơi/i })).toHaveAttribute(
    "href",
    "/play/MT2026",
  );
  await expect(page.getByRole("link", { name: /Màn hình/i })).toHaveAttribute(
    "href",
    "/display/MT2026",
  );
  await expect(page.getByRole("link", { name: /Điều phối/i })).toHaveAttribute(
    "href",
    "/admin/MT2026",
  );
  await page.screenshot({
    path: `artifacts/phase02/${testInfo.project.name}-home.png`,
    fullPage: true,
  });
});

test("player shell is usable on mobile", async ({ page }) => {
  await page.goto("/play/MT2026");
  await expect(page.getByRole("heading", { name: "Tham gia phòng" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xác nhận tham gia" })).toBeVisible();
  await expect(page.locator("nav .brand-mark")).toBeVisible();
  await expect(page.locator('nav a[href="/"]')).toHaveCount(0);
});

test("display and admin shells resolve session routes", async ({ page }) => {
  await page.goto("/display/MT2026");
  await expect(page.getByTestId("presentation")).toBeVisible();
  await expect(page.locator(".presentation-room")).toHaveText("MT2026");
  await expect(page.locator(".presentation-room")).toBeVisible();
  await page.goto("/admin/MT2026");
  await expect(page.getByRole("heading", { name: "Bàn điều khiển bữa tiệc" })).toBeVisible();
});
