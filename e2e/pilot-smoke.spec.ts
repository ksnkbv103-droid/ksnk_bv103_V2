import { test, expect } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("BV103 pilot smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run E2E");
    await page.goto("/login");
    await page.getByLabel(/email|tài khoản/i).fill(email!);
    await page.getByLabel(/mật khẩu|password/i).fill(password!);
    await page.getByRole("button", { name: /đăng nhập|login/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
  });

  test("dashboard command center loads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /command center|trung tâm/i })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("supervision tabs visible when permitted", async ({ page }) => {
    await page.goto("/dashboard");
    const ksnk = page.getByRole("tab", { name: /chuyên trách|ksnk/i });
    if (await ksnk.isVisible().catch(() => false)) {
      await ksnk.click();
      await expect(page.locator("body")).not.toContainText("Đang tải");
    }
  });
});
