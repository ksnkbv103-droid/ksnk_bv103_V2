import { test, expect, type Page } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder(/NV001|email@/i).fill(email!);
  await page.getByPlaceholder("••••••••").fill(password!);
  await page.getByRole("button", { name: /đăng nhập|login/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
}

test.describe("GSC + VST supervision E2E (function-based routes)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run E2E");
    await login(page);
  });

  test("GSC — Form, /thong-ke/gsc chỉ số, /lich-su/gsc", async ({ page }) => {
    await page.goto("/giam-sat-chung");
    // /giam-sat-chung tự chuyển sang chuyên đề mặc định; chờ xong để cú chuyển trễ không hủy goto kế tiếp (ERR_ABORTED).
    await page.waitForURL(/\/giam-sat-chung\/tuan-thu/, { timeout: 30_000 });
    await expect(page.getByText(/giám sát/i).first()).toBeVisible({ timeout: 30_000 });

    await page.goto("/thong-ke/gsc");
    await expect(page.locator("body")).not.toContainText('column "so_co_hoi" does not exist', { timeout: 60_000 });
    await expect(page.getByText("Tỷ lệ tuân thủ").first()).toBeVisible({ timeout: 25_000 }); // gate-ok: tiêu đề «Tổng hợp (mọi chuyên đề trong kỳ)» đã bỏ khỏi UI, thay bằng chỉ số thật
    await expect(page.getByRole("button", { name: /tải lại/i })).toBeVisible();
    await expect(page.locator(".border-red-200.bg-red-50")).toHaveCount(0);

    await page.goto("/lich-su/gsc");
    await expect(page.locator("body")).not.toContainText("Đang tải…", { timeout: 60_000 });
    await expect(page.locator("table, [role='table']").first()).toBeVisible({ timeout: 30_000 }); // gate-ok: .text-slate-500 đầu tiên là phần tử ẩn; kiểm bảng lịch sử thật
  });

  test("VST — Form, /thong-ke/vst chỉ số, /lich-su/vst", async ({ page }) => {
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
    // next.config.ts: /giam-sat-chung/tuan-thu/thong-ke → /thong-ke/gsc?loai=TUAN_THU
    await page.goto("/giam-sat-chung/tuan-thu/thong-ke", { waitUntil: "commit" });
    await expect(page.getByText("Chuyên đề:").first()).toBeVisible({ timeout: 30_000 }); // gate-ok: chữ «đang lọc theo chuyên đề» đã đổi (f6600f26)
    await expect(page.getByRole("link", { name: /thống kê tuân thủ/i })).toHaveAttribute("href", "/thong-ke/gsc"); // gate-ok: tên liên kết đã đổi (GscAnalyticsScopeBanner), vẫn kiểm href
  });

  test("VST — form shell ready for data entry", async ({ page }) => {
    await page.goto("/giam-sat-vst");
    await expect(page.getByRole("button", { name: /hoàn thành|lưu phiên/i }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/khoa|khu vực/i).first()).toBeVisible();
  });

  test("VST — analytics chỉ số stable after double refresh", async ({ page }) => {
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
