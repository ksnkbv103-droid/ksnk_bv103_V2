# Hoàn tác phiếu đề nghị danh mục (2026-09-18)

## Quy tắc

Admin (quyền duyệt `DC_LE` / `BO_DC` edit) xóa phiếu đề nghị danh mục:

| Trạng thái phiếu | Hành vi |
| --- | --- |
| **PENDING** | Hard-delete phiếu. Không đụng master. |
| **REJECTED** | Hard-delete phiếu. Không đụng master. |
| **APPROVED** | (1) Chặn nếu có phiếu **APPROVED sau** chạm cùng đích; (2) `revertCatalogDeNghiOverwrite`; (3) hard-delete phiếu. |

## Hoàn tác master (`revertCatalogDeNghiOverwrite`)

- Chuẩn hóa dòng qua `normalizeDeNghiItems`.
- **CREATE** (op / `__op`): soft-delete master (`cssd_dm_loai_dung_cu` / `cssd_dm_bo_dung_cu` → `is_active=false`) theo `targetId` hoặc mã trong `payload_after`. BOM: ưu tiên re-apply `before.lines`; không có snapshot thì soft-delete chi_tiet UPSERT mới (không `chiTietId`).
- **UPDATE**: apply lại `payload_before` qua `applyLoai` / `applyBo` / `applyBom`. Snapshot trước trống → lỗi «Không có snapshot trước duyệt — không hoàn tác được».

## Conflict (phiếu APPROVED sau)

Cùng đích nếu trùng khóa: `target_id`, hoặc `kind+target_ma`, hoặc mục MIXED chồng nhau (`collectCatalogDeNghiTargetKeys`). Phiếu sau = `created_at` hoặc `approved_at` lớn hơn phiếu đang xóa. Thông báo: hoàn tác / xóa phiếu mới hơn trước.

## UI

1. **Quản trị → Dụng cụ → hàng đợi đề nghị** (`CatalogDeNghiApproveQueue`): khối «Đã duyệt gần đây» + nút «Xóa & hoàn tác» (và trong dialog xem).
2. **CSSD → tab Đề nghị** (`CSSDCatalogDeNghiTab`): nút trên dòng APPROVED + dialog «Xóa & hoàn tác» (PENDING/REJECTED: «Xóa phiếu»).

## Không migrate

Bảng không có `deleted_at` / `REVERTED` — hard-delete phiếu sau khi revert thành công; audit nhẹ qua `ghi_chu` trên bộ khi soft-delete CREATE BO.

## Bugfix (2026-09-19)

`payload_before.lines` là snapshot trạng thái (không có `op`). `applyBom` trước đây bắt `op === UPSERT|DELETE` → xóa phiếu APPROVED BOM báo «op dòng BOM không hợp lệ.»

Fix: `normalizeBomLinesForApply` (thiếu op + có chiTietId/loai/maLoai → UPSERT); `revertBomUpdate` soft-delete dòng phiếu thêm rồi apply lại before.
