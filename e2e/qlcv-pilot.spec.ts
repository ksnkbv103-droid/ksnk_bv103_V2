import { test, expect } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("QLCV pilot", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run E2E");
    await page.goto("/login");
    await page.getByLabel(/email|tài khoản/i).fill(email!);
    await page.getByLabel(/mật khẩu|password/i).fill(password!);
    await page.getByRole("button", { name: /đăng nhập|login/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
  });

  test("QLCV page loads main tabs", async ({ page }) => {
    await page.goto("/quan-ly-cong-viec");
    await expect(page.getByRole("tab", { name: /danh sách công việc/i })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("tab", { name: /thống kê/i })).toBeVisible();
  });

  test("QLCV kanban or table region visible", async ({ page }) => {
    await page.goto("/quan-ly-cong-viec");
    await expect(
      page.getByRole("tab", { name: /kanban/i }).or(page.getByRole("tab", { name: /bảng/i })),
    ).toBeVisible({ timeout: 60_000 });
  });
});
