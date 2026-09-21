# CSSD tồn loại — sửa lệch Trong bộ / Khoa (2026-09-18)

## Bug
1. **Trong bộ** trên tab Kho dự phòng cộng `so_luong_thuc_te` mọi dòng chi tiết active, **kể cả bộ `is_active=false`**. Chi tiết «bộ đang dùng» lại chỉ hiện bộ active → ví dụ Trocar `020206-01`: list 6 (=2+2+2), chi tiết 2+2, kho 0.
2. **Khoa** trên bảng bộ-theo-loại không resolve `khoa_su_dung_id` → luôn «Chưa phân bổ» dù bộ đã gắn khoa (vd. B02).

## Fix code
- `sumTrongBoByLoaiIds` — chỉ Σ trên bộ active (`src/lib/master-data/cssd-loai-trong-bo.ts`).
- `searchKhoCatalogLoaiAction` + `getLoaiDungCuRowsAction` dùng helper.
- `getBosContainingLoaiAction` — dùng realtime `so_luong_thuc_te`, resolve `ten_khoa` từ `mdm_dm_khoa_phong`.

## Fix data (prod 2026-09-18)
- 524 dòng chi tiết active trên bộ ngưng (801 cái) → cộng vào `so_luong_kho_du_phong`, soft-delete dòng chi tiết + ghi chú.
- Trocar `020206-01` sau sửa: kho **2**, trong bộ active **4**, tổng **6**.
