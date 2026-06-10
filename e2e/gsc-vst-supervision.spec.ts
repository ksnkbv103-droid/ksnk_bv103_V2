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

test.describe("GSC + VST supervision E2E (function-based routes)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run E2E");
    await login(page);
  });

  test("GSC — Form, /thong-ke/gsc KPI, /lich-su/gsc", async ({ page }) => {
    await page.goto("/giam-sat-chung");
    await expect(page.getByText(/giám sát/i).first()).toBeVisible({ timeout: 30_000 });

    await page.goto("/thong-ke/gsc");
    await expect(page.locator("body")).not.toContainText('column "so_co_hoi" does not exist', { timeout: 60_000 });
    await expect(page.getByText("Tổng hợp (mọi chuyên đề trong kỳ)")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: /tải lại/i })).toBeVisible();
    await expect(page.locator(".border-red-200.bg-red-50")).toHaveCount(0);

    await page.goto("/lich-su/gsc");
    await expect(page.locator("body")).not.toContainText("Đang tải…", { timeout: 60_000 });
    await expect(page.locator("table, [role='table'], .text-slate-500").first()).toBeVisible({ timeout: 30_000 });
  });

  test("VST — Form, /thong-ke/vst KPI, /lich-su/vst", async ({ page }) => {
    await page.goto("/giam-sat-vst");
    await expect(page.getByText(/vệ sinh tay|who/i).first()).toBeVisible({ timeout: 30_000 });

    await page.goto("/thong-ke/vst");
    await expect(page.getByRole("button", { name: /tải lại/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /tải lại/i }).click();
    await expect(page.locator("body")).not.toContainText('column "so_co_hoi" does not exist', { timeout: 60_000 });
    await expect(page.getByText("Tỷ lệ tuân thủ").first()).toBeVisible({ timeout: 60_000 });

    await page.goto("/lich-su/vst");
    await expect(page.locator("body")).not.toContainText("Đang tải…", { timeout: 60_000 });
  });

  test("GSC per-loai analytics shows scope banner + canonical link", async ({ page }) => {
    await page.goto("/giam-sat-chung/tuan-thu/thong-ke");
    await expect(page.getByText(/đang lọc theo chuyên đề/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: /tổng hợp mọi chuyên đề/i })).toHaveAttribute("href", "/thong-ke/gsc");
  });

  test("VST — form shell ready for data entry", async ({ page }) => {
    await page.goto("/giam-sat-vst");
    await expect(page.getByRole("button", { name: /hoàn thành|lưu phiên/i }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/khoa|khu vực/i).first()).toBeVisible();
  });

  test("VST — analytics KPI stable after double refresh", async ({ page }) => {
    await page.goto("/thong-ke/vst");
    const reload = page.getByRole("button", { name: /tải lại/i });
    await expect(reload).toBeVisible({ timeout: 30_000 });
    await reload.click();
    await expect(page.getByText("Tỷ lệ tuân thủ").first()).toBeVisible({ timeout: 60_000 });
    await reload.click();
    await expect(page.locator(".border-red-200.bg-red-50")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText('column "so_co_hoi" does not exist');
  });

  test("Legacy ?tab= redirects to canonical routes", async ({ page }) => {
    await page.goto("/giam-sat-vst?tab=analytics");
    await page.waitForURL(/\/thong-ke\/vst/, { timeout: 15_000 });

    await page.goto("/giam-sat-chung?tab=history");
    await page.waitForURL(/\/lich-su\/gsc/, { timeout: 15_000 });
  });
});
