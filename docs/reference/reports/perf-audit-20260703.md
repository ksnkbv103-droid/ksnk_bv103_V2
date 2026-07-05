# Perf audit — 2026-07-03 (cải tổ Đợt 4)

> Đo trên local (dev server + production build Next 16.2.9 Turbopack). Linked/staging chưa đo được (token Supabase hết hạn — xem `db-hygiene-20260703.md`).

## 1. Số đo server (dev log, session thao tác thật)

| Route | Số request | TB | Max |
|-------|-----------|----|----|
| `/cssd-su-co` | 15 | 687ms | 2.500ms (lần compile đầu dev) |
| `/thong-ke/gsc` | 13 | 475ms | 806ms |
| `/` | 5 | 466ms | 713ms |
| `/thong-ke/vst` | 13 | 419ms | 867ms |
| `/login` | 9 | 241ms | 615ms |

Server action chậm nhất: `fetchSuCoFormCatalog` (TB 220ms), `checkStaffSessionAllowed` (TB 123ms) — đều ở mức chấp nhận cho pilot; max 2.5s là chi phí compile dev, không phải production.

## 2. Bundle client (production build)

**Trước:** chunk `exceljs` **917KB** được nạp *eager* trên hầu hết trang (xuất hiện trong client-reference-manifest của 20+ page) dù user chỉ cần khi bấm Import/Export Excel.

**Đã sửa:** chuyển 5 điểm import tĩnh `exceljs` sang `await import("exceljs")` bên trong handler (chỉ tải khi bấm nút):

- `src/hooks/useExcelImport.ts`, `src/hooks/useExcelExport.ts`
- `src/hooks/importExport.utils.ts` (→ `import type`, không còn runtime)
- `src/modules/quan-tri-he-thong/lib/excel-io.helpers.ts` (template + parse)
- `src/modules/quan-ly-cong-viec/components/QlcvImportDialog.tsx`

**Sau:** chunk exceljs (909KB) **không còn nằm trong entry files của bất kỳ page nào** (kiểm bằng `build-manifest.json` + client-reference-manifest = 0 tham chiếu eager) — tiết kiệm ~900KB first-load JS cho các trang danh mục/QLCV.

## 3. Ghi nhận, chưa xử lý (không đáng đổi rủi ro pilot)

- **recharts nhân bản 5 chunk ~393KB**: Turbopack tách recharts vào 5 chunk theo nhóm route thay vì 1 chunk chung. Mỗi trang chỉ tải 1 bản nên first-load không đổi; chỉ tốn khi điều hướng giữa nhiều trang thống kê. Theo dõi khi nâng Next.
- Đo RPC dashboard trên DB thật: local trống dữ liệu nên số đo vô nghĩa; đo trên linked khi PO cấp token mới.

## 4. Verify

`npm run verify` PASS toàn bộ (lint, tsc, 49/49 test, engineering gate, legacy guard, build).
