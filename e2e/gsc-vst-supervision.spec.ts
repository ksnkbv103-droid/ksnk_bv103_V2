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

async function openSupervisionTab(page: Page, tabLabel: RegExp) {
  const tab = page.getByRole("tab", { name: tabLabel });
  await expect(tab).toBeVisible({ timeout: 30_000 });
  await tab.click();
}

test.describe("GSC + VST supervision E2E", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run E2E");
    await login(page);
  });

  test("GSC — Form, Thống kê, Lịch sử", async ({ page }) => {
    await page.goto("/giam-sat-chung");
    await expect(page.getByRole("tab", { name: /form giám sát/i })).toBeVisible({ timeout: 30_000 });

    await openSupervisionTab(page, /^thống kê$/i);
    await expect(page.locator("body")).not.toContainText("column \"so_co_hoi\" does not exist", { timeout: 60_000 });
    await expect(page.getByText("Tổng hợp (mọi chuyên đề trong kỳ)")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: /tải lại/i })).toBeVisible();

    const errBanner = page.locator(".border-red-200.bg-red-50");
    await expect(errBanner).toHaveCount(0);

    await openSupervisionTab(page, /lịch sử phiên/i);
    await expect(page.locator("body")).not.toContainText("Đang tải…", { timeout: 60_000 });
    await expect(page.locator("table, [role='table'], .text-slate-500").first()).toBeVisible({ timeout: 30_000 });
  });

  test("VST — Form, Thống kê (Tải lại), Lịch sử", async ({ page }) => {
    await page.goto("/giam-sat-vst");
    await expect(page.getByRole("tab", { name: /form giám sát/i })).toBeVisible({ timeout: 30_000 });

    await openSupervisionTab(page, /^thống kê$/i);
    await expect(page.getByRole("button", { name: /tải lại/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /tải lại/i }).click();
    await expect(page.locator("body")).not.toContainText("column \"so_co_hoi\" does not exist", { timeout: 60_000 });
    await expect(page.getByText("Tỷ lệ tuân thủ").first()).toBeVisible({ timeout: 60_000 });

    await openSupervisionTab(page, /lịch sử phiên/i);
    await expect(page.locator("body")).not.toContainText("Đang tải…", { timeout: 60_000 });
  });
});
