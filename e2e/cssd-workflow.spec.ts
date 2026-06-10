import { test, expect, type Page } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email|tài khoản/i).fill(email!);
  await page.getByLabel(/mật khẩu|password/i).fill(password!);
  await page.getByRole("button", { name: /đăng nhập|login/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
}

test.describe("CSSD workflow E2E (Phase 3–4)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run E2E");
    await login(page);
  });

  test("Quy trình 6 trạm — shell loads", async ({ page }) => {
    await page.goto("/cssd-quy-trinh");
    const body = page.locator("body");
    await expect(body).not.toContainText("404", { timeout: 15_000 });
    await expect(body.getByText(/quy trình|cssd|trạm/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("Mẻ tiệt khuẩn — batch page loads", async ({ page }) => {
    await page.goto("/cssd-erp/batch");
    const body = page.locator("body");
    await expect(body).not.toContainText("404", { timeout: 15_000 });
    await expect(body.getByText(/tiệt khuẩn|mẻ|batch/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("Hóa chất — kho page shell", async ({ page }) => {
    await page.goto("/cssd-hoa-chat");
    const body = page.locator("body");
    await expect(body).not.toContainText("404", { timeout: 15_000 });
    await expect(body.getByText(/hóa chất|vật tư|kho/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("Thiết bị — maintenance tab", async ({ page }) => {
    await page.goto("/cssd-thiet-bi?tab=maintenance");
    const body = page.locator("body");
    await expect(body).not.toContainText("404", { timeout: 15_000 });
    await expect(body.getByText(/bảo dưỡng|thiết bị|máy/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("GSC analytics — lazy cluster button (no auto fan-out)", async ({ page }) => {
    await page.goto("/thong-ke/gsc");
    await expect(page.getByRole("button", { name: /tải lại/i })).toBeVisible({ timeout: 30_000 });
    const lazyBtn = page.getByRole("button", { name: /tải theo biểu mẫu/i });
    if (await lazyBtn.isVisible().catch(() => false)) {
      await lazyBtn.click();
      await expect(page.getByText(/đang tải thống kê theo từng biểu mẫu/i)).toBeVisible({ timeout: 15_000 });
    }
  });
});
