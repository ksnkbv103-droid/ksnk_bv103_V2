# Giám sát (VST / GSC)

| Đọc khi | File |
|---------|------|
| Nghiệp vụ | [`../../core/domain-specification.md`](../../core/domain-specification.md) + [`../../wiki/entities.md`](../../wiki/entities.md#giám-sát-vst--gsc) |
| Bảng kiểm 36 mẫu | [`bang-kiem-overview.md`](bang-kiem-overview.md) — **không** mở `data/bang-kiem/canonical-36.md` |
| Layout / scoring | [`../../wiki/concepts.md`](../../wiki/concepts.md) |

Rule: `13-giam-sat-spec-context.mdc`, `16-bang-kiem-spec-context.mdc`

## Route structure (function-based, 2026-06)

Sau tái cấu trúc, **Form / Thống kê / Lịch sử** tách route — không còn `?tab=` trên trang form (redirect backward-compat).

| Chức năng | VST | GSC (tất cả loại) | GSC theo loại |
|-----------|-----|-------------------|---------------|
| **Form nhập liệu** | `/giam-sat-vst` | `/giam-sat-chung` | `/giam-sat-chung/tuan-thu`, `/nhat-ky`, `/he-thong` |
| **Thống kê** | `/thong-ke/vst` | `/thong-ke/gsc` | Deep link `/thong-ke/gsc?loai=` (redirect từ URL cũ) |
| **Lịch sử** | `/lich-su/vst` | `/lich-su/gsc` | edit quay về `basePath?edit=id` |

**GSC analytics — một shell canonical:**

- `/thong-ke/gsc` — tổng hợp mọi `loai_giam_sat`; query `?loai=tuan-thu|nhat-ky|he-thong` khi vào từ form chuyên đề.
- Bookmark cũ `/giam-sat-chung/{loai}/thong-ke` → **redirect** `next.config.ts` sang `/thong-ke/gsc?loai=…` (không còn page shadow).

**Khóa module:** [`module-lock.md`](module-lock.md)

Deep link từ Command Center / Báo cáo tổng hợp: `buildAnalyticsDeepLink` → `/thong-ke/{vst,gsc}?tu_ngay=…`.

Bookmark cũ: `next.config.ts` redirect `/giam-sat-vst/lich-su` → `/lich-su/vst`; server redirect `?tab=analytics|history` trên form pages.

## Pilot gấp (VST + GSC)

Checklist tay: [`pilot-checklist-202606.md`](pilot-checklist-202606.md) · Go-live: [`../../core/pilot-core-modules-go-live.md`](../../core/pilot-core-modules-go-live.md)

E2E (cần `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`): `npm run test:e2e -- e2e/gsc-vst-supervision.spec.ts`
