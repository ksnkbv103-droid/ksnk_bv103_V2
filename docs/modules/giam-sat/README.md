# Giám sát (VST / GSC)

> Ghi chú phiên AI (`_agent-*`) chỉ trong [`../../archive/agent-notes/`](../../archive/agent-notes/) — không đọc khi sửa hệ thống. Bản đồ: [`../../ssot-map.md`](../../ssot-map.md).

| Đọc khi | File |
|---------|------|
| **Kế hoạch chỉnh VST/GSC (2026-09-17)** | [`../../reference/reports/BV103-GSC-KE-HOACH-CHINH-20260917.md`](../../reference/reports/BV103-GSC-KE-HOACH-CHINH-20260917.md) |
| **Chẩn đoán «đơn giản mà mãi chưa xong» (2026-09-17)** | [`../../reference/reports/BV103-GSC-CHAN-DOAN-DON-GIAN-20260917.md`](../../reference/reports/BV103-GSC-CHAN-DOAN-DON-GIAN-20260917.md) |
| **Đề cương vận hành + biện pháp (2026-09-17)** | [`../../reference/reports/BV103-GSC-DE-CUONG-20260917.md`](../../reference/reports/BV103-GSC-DE-CUONG-20260917.md) |
| Nghiệp vụ | [`../../core/domain-specification.md`](../../core/domain-specification.md) + [`../../wiki/entities.md`](../../wiki/entities.md#giám-sát-vst--gsc) |
| Bảng kiểm 36 mẫu | [`bang-kiem-overview.md`](bang-kiem-overview.md) — **không** mở `data/bang-kiem/canonical-36.md` |
| Điểm nguy cơ P×I×S (khả thi) | [`bang-kiem-rui-ro-pis-feasibility-20260731.md`](bang-kiem-rui-ro-pis-feasibility-20260731.md) — phân tích; chưa implement |
| Layout / scoring | [`../../wiki/concepts.md`](../../wiki/concepts.md) |
| Banner khóa → `KsnkContextBanner` (B+3 S4) | [`../../reference/architecture/ui-consistency-program-20260802.md`](../../reference/architecture/ui-consistency-program-20260802.md) § S4 |

Rule: `13-giam-sat-spec-context.mdc`, `16-bang-kiem-spec-context.mdc`



## IA P.A (2026-09-17)

Bốn tầng, một chiều: Ghi nhận → Lịch sử → Thống kê khoa (`/thong-ke`) → Báo cáo chính thức (in). ModeNav là công tắc duy nhất trong module. BCTH chỉ điều hành/in; «Chi tiết thống kê» là link 1 chiều.


## IA điều hành (H2 — 2026-09-17)

- **Báo cáo chính thức** (`/bao-cao-tong-hop`) là cửa nhìn số + in; `/` redirect vào đây (đã bỏ Tổng quan KSNK / «Việc hôm nay»).
- **Công việc** (`/quan-ly-cong-viec`) tách riêng — không link tạo việc từ Tổng quan / Thống kê GSC (TGS).
- Chi tiết: [`../../reference/reports/BV103-GSC-KE-HOACH-CHINH-20260917.md`](../../reference/reports/BV103-GSC-KE-HOACH-CHINH-20260917.md) §11.


## Route structure (function-based, 2026-06)

Sau tái cấu trúc, **Form / Thống kê / Lịch sử** tách route — không còn `?tab=` trên trang form (redirect backward-compat).

| Chức năng | VST | GSC (tất cả loại) | GSC theo loại |
|-----------|-----|-------------------|---------------|
| **Form nhập liệu** | `/giam-sat-vst` | `/giam-sat-chung` | `/giam-sat-chung/tuan-thu`, `/nhat-ky`, `/he-thong` |
| **Thống kê** | `/thong-ke/vst` | `/thong-ke/gsc` | Deep link `/thong-ke/gsc?loai=` (redirect từ URL cũ) |
| **Lịch sử** | `/lich-su/vst` | `/lich-su/gsc` | edit quay về `basePath?edit=id` |

**GSC analytics / lịch sử — `?loai=` SSOT:**

- `/thong-ke/gsc` **mặc định = tuân thủ** (`TUAN_THU`) khi không có `?loai=` — không phải «mọi loại».
- Query chấp nhận **kebab** `tuan-thu|nhat-ky|he-thong` **và** enum `TUAN_THU|NHAT_KY_VAN_HANH|DANH_GIA_HE_THONG` (`parseGscLoaiParam`).
- Nhật ký / hệ thống: `/thong-ke/gsc?loai=NHAT_KY_VAN_HANH` (hoặc `nhat-ky`) · `?loai=DANH_GIA_HE_THONG` (hoặc `he-thong`).
- Lịch sử chuyên đề: `/lich-su/gsc?loai=TUAN_THU|…` (helpers `gscLichSuHref` luôn gắn loai khi biết loại). `/lich-su/gsc` không query = mọi loại.
- Bookmark cũ `/giam-sat-chung/{loai}/thong-ke|lich-su` → redirect `next.config.ts` (kèm `?loai=`).

**Khóa module:** [`module-lock.md`](module-lock.md)

**Import Excel phiên GSC:** Đã gỡ triệt để (D-21, 2026-08-02). Pilot chỉ nhập phiên qua form. VST: không import Excel (đã gỡ cố ý).

Deep link từ Command Center / Báo cáo tổng hợp: `buildAnalyticsDeepLink` → `/thong-ke/{vst,gsc}?tu_ngay=…`.

Bookmark cũ: `next.config.ts` redirect `/giam-sat-vst/lich-su` → `/lich-su/vst`; server redirect `?tab=analytics|history` trên form pages.

## Pilot gấp (VST + GSC)

Checklist tay: [`pilot-checklist-202606.md`](pilot-checklist-202606.md) · Go-live: [`../../core/pilot-core-modules-go-live.md`](../../core/pilot-core-modules-go-live.md)

E2E (cần `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`): `npm run test:e2e -- e2e/gsc-vst-supervision.spec.ts`
