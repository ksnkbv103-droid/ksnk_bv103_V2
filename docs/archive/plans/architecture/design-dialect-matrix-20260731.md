# Design Dialect Matrix — BV103 (2026-07-31)

> Wave 1.1 — **cấm shell thứ 4**. Mọi màn hình mới phải chọn đúng một vai trò dưới đây.  
> Visual SSOT: [`../guides/bv103-visual-language.md`](../guides/bv103-visual-language.md) · tokens `bv103-design-tokens.ts`.  
> **L1 chrome:** [`page-chrome-contract-20260731.md`](./page-chrome-contract-20260731.md) — primitive `KsnkPageChrome` duy nhất.

## Ba vai trò trang (duy nhất)

| Vai trò | Dùng khi | Shell / header (L1 = `KsnkPageChrome`) | Panel nội dung | Tab |
|---------|----------|----------------------------------------|----------------|-----|
| **Ops** | Nhập liệu / vận hành ca (VST, GSC, NKBV, CSSD, QLCV) | ModeNav trong chrome (`showTitle={false}`); CSSD: chrome + eyebrow CSSD | `KsnkSupervisionPanel` hoặc `radius-shell` mỏng | ModeNav Nhập · Lịch sử · Thống kê; CSSD = sidebar |
| **Analytics** | Điều hành / thống kê / BCTH | `Bv103AnalyticsPageFrame` → chrome + filters; `/thong-ke`: tab+filter **một** sticky | Section `radius-shell`; không stack card dày | Tab module trong cùng band |
| **Admin** | Quản trị / RBAC / đào tạo | `KsnkPageHeader` / `KsnkListPageHeader` → cùng chrome | `radius-shell` + border nhẹ | Hub query tab |

## Quy tắc cứng

1. Width trang: chỉ `KsnkPageShell` — **cấm** `max-w-5/6/7xl` trong view (modal/drawer được phép `max-w-*` hẹp hơn shell).  
2. Nhịp dọc: `pageOuter` duy nhất (`pageOuterAnalytics` = alias).  
3. Banner ngữ cảnh: `KsnkContextBanner` (tone sky/amber/violet/emerald).  
4. Typography: label ≥ `text-[11px]`; title-case nội dung; IN HOA chỉ nav.  
5. Đào tạo = **Admin** chrome + back link. CSSD body giảm `rounded-2xl` (Boy Scout).

## Ánh xạ module hiện tại

| Module | Vai trò |
|--------|---------|
| VST/GSC form · lịch sử | Ops |
| `/thong-ke/*` · `/` · BCTH | Analytics |
| Quản trị · danh mục · RBAC | Admin |
| CSSD quy trình / kho / mẻ | Ops (CSSDPageShell) |
| CSSD report | Analytics-in-module (frame hoặc hero + thin sections) |
| QLCV board | Ops |
| Đào tạo hub / thi / admin ngân hàng | Admin |
