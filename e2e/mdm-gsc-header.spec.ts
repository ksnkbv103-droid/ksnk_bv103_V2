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

test.describe("MDM khoa-phong → GSC header (pilot kịch bản 1)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run E2E");
    await login(page);
  });

  test("Hub khoa phòng load và GSC header có chọn khoa", async ({ page }) => {
    await page.goto("/quan-tri-he-thong/danh-muc/khoa-phong");
    await expect(page.getByText(/khoa phòng/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("table, [role='table']").first()).toBeVisible({ timeout: 30_000 });

    await page.goto("/giam-sat-chung");
    await expect(page.getByText(/giám sát/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/khoa|đơn vị/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("body")).not.toContainText("Không tải được dữ liệu master", { timeout: 30_000 });
  });
});
