import { expect, test } from "@playwright/test";

test("home exposes all three interfaces", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Meme đúng lúc/i })).toBeVisible();
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
});

test("player shell is usable on mobile", async ({ page }) => {
  await page.goto("/play/MT2026");
  await expect(page.getByRole("heading", { name: "Tham gia phòng" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xác nhận tham gia" })).toBeVisible();
});

test("display and admin shells resolve session routes", async ({ page }) => {
  await page.goto("/display/MT2026");
  await expect(page.getByText("28 người chơi")).toBeVisible();
  await page.goto("/admin/MT2026");
  await expect(page.getByRole("heading", { name: /Chào buổi tiệc/i })).toBeVisible();
});
