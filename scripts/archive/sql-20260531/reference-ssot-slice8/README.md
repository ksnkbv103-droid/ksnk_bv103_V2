# Slice 8 - Dứt điểm Double SSOT cho 14 loại lookup

> **⚠ ĐÃ HOÀN THÀNH NGẦM TRƯỚC ĐÓ — KHÔNG CẦN APPLY.**
>
> Probe DB ngày 26/05/2026 (script `scripts/sql/admin-slice-pre-apply-probe.sql`)
> xác nhận: các bảng "vật lý" như `mdm_dm_to_cong_tac`, `mdm_dm_khoi_khoa`, `mdm_dm_chuc_danh`,
> `mdm_dm_chuc_vu`, `mdm_dm_nghe_nghiep`, `cssd_dm_loai_may`, `cssd_dm_tram`,
> `gstt_dm_hinh_thuc_giam_sat`, `gstt_dm_cach_thuc_giam_sat`, `gstt_dm_khu_vuc_giam_sat`,
> `qlcv_dm_loai_cong_viec`, `qlcv_dm_trang_thai_cong_viec`, `nkbv_dm_loai`,
> `nkbv_dm_trang_thai_ca` **đều đã là VIEW lọc từ `sys_lookup_value` theo `category_type`**.
>
> Tức là SSOT vật lý duy nhất đã là `sys_lookup_value`. Không còn Double SSOT.
> App code `master-crud-core.ts` (CONSOLIDATED_MAPS) đã viết đúng vào `sys_lookup_value`.
>
> **5 file SQL trong thư mục này** được giữ lại như tham khảo và làm template phòng khi có
> bảng lookup mới nào đó cần consolidate trong tương lai. Không apply vào `supabase/migrations/`.

## Bối cảnh

Sau 2 đợt migration:

1. `20260520000006_consolidate_lookups.sql` đã **COPY** dữ liệu của 11 bảng `dm_*` chuyên biệt
   vào `dm_lookup_value` (giờ là `sys_lookup_value`) nhưng **không xóa** bảng nguồn.
2. `20260525000010` đổi tên các bảng nguồn (`dm_to_cong_tac` → `mdm_dm_to_cong_tac`, v.v.).

Kết quả: 14 `category_type` trong `sys_lookup_value` tồn tại song song với bảng vật lý
prefix mới. FK ngoại bộ tiếp tục trỏ về bảng vật lý → 2 nguồn cập nhật khác nhau,
nguy cơ lệch dữ liệu danh mục giữa Quản trị Danh mục (ghi qua `sys_lookup_value`)
và các luồng nghiệp vụ JOIN bảng vật lý.

Các loại đang trùng (theo `CONSOLIDATED_MAPS` trong `master-crud-core.ts`):

| `category_type`         | Bảng vật lý trùng                  | Nhóm FK trỏ tới |
|-------------------------|-------------------------------------|------------------|
| `TO_CONG_TAC`           | `public.mdm_dm_to_cong_tac`         | `mdm_nhan_su.to_id`, … |
| `CHUC_DANH`             | `public.mdm_dm_chuc_danh`           | `mdm_nhan_su.chuc_danh_id` |
| `CHUC_VU`               | `public.mdm_dm_chuc_vu`             | `mdm_nhan_su.chuc_vu_id` |
| `NGHE_NGHIEP`           | `public.mdm_dm_nghe_nghiep`         | `gstt_fact_vst.nghe_nghiep_id`, `gstt_fact_chung_sessions.nghe_nghiep_id` |
| `KHOI_KHOA`             | `public.mdm_dm_khoi_khoa`           | `mdm_dm_khoa_phong.khoi_id` |
| `LOAI_MAY_TIET_KHUAN`   | `public.cssd_dm_loai_may`           | `cssd_dm_thiet_bi.loai_may_id` |
| `TRAM_CSSD`             | `public.cssd_dm_tram`               | `cssd_fact_quy_trinh.tram_hien_tai_id` |
| `LOAI_SU_CO`            | `public.dm_loai_su_co` (nếu còn)   | `cssd_fact_su_co.loai_su_co_id` |
| `LOAI_CONG_VIEC`        | `public.qlcv_dm_loai_cong_viec`     | `qlcv_fact_cong_viec.loai_cv_id` |
| `TRANG_THAI_CONG_VIEC`  | `public.qlcv_dm_trang_thai_cong_viec` | `qlcv_fact_cong_viec.trang_thai_id` |
| `LOAI_NKBV`             | `public.nkbv_dm_loai`               | nhiều fact NKBV |
| `TRANG_THAI_NKBV_CA`    | `public.nkbv_dm_trang_thai_ca`      | nhiều fact NKBV |
| `HINH_THUC_GIAM_SAT`    | `public.gstt_dm_hinh_thuc_giam_sat` | `gstt_fact_*_sessions.hinh_thuc_id` |
| `CACH_THUC_GIAM_SAT`    | `public.gstt_dm_cach_thuc_giam_sat` | `gstt_fact_*_sessions.cach_thuc_id` |

## Chiến lược chốt

`sys_lookup_value` được chọn làm **SSOT vật lý duy nhất**. Bảng `*_dm_*` tương ứng
sẽ được drop và thay bằng VIEW lọc theo `category_type` + INSTEAD OF triggers để
giữ tương thích ngược cho CRUD code.

## Thứ tự áp dụng

1. **`001_ssot_reconcile_report.sql`** - SELECT-only. Chạy `psql` rồi đọc output để biết:
   - Số dòng có ở `sys_lookup_value` nhưng không có ở bảng vật lý.
   - Số dòng có ở bảng vật lý nhưng không có ở `sys_lookup_value`.
   - Cặp `code` trùng nhưng `name` lệch (data drift cần resolve thủ công).
2. Resolve drift xong → bật flag `_PROCEED_` ở đầu các file 002-005 (xem comment),
   sau đó **copy** từng file sang `supabase/migrations/` theo thứ tự, mỗi file 1 PR.
3. **`002_ssot_backfill_lookup_from_physical.sql`** - INSERT bổ sung vào
   `sys_lookup_value` các dòng đang chỉ tồn tại ở bảng vật lý (nếu reconcile phát hiện).
4. **`003_ssot_retarget_fk_to_sys_lookup.sql`** - DROP CONSTRAINT các FK đang trỏ
   bảng vật lý → CREATE CONSTRAINT mới trỏ `sys_lookup_value(id)`.
5. **`004_ssot_drop_physical_create_wrapper_view.sql`** - DROP TABLE các bảng vật lý
   trùng + CREATE OR REPLACE VIEW cùng tên (filter `category_type`).
6. **`005_ssot_instead_of_triggers.sql`** - Trigger INSTEAD OF INSERT/UPDATE/DELETE
   trên các view wrapper để CRUD app vẫn ghi vào `sys_lookup_value`.

## Rollback

Mỗi file 002-005 có section `-- ROLLBACK` ở cuối. Trong trường hợp lỗi sau bước 3
(FK đã retarget), rollback bằng cách restore từ backup; KHÔNG re-create bảng vật lý
thủ công vì sẽ phá tính nhất quán.

## Checklist trước khi proceed

- [ ] Chạy `001_ssot_reconcile_report.sql` trên môi trường staging gần production.
- [ ] Đọc kỹ từng dòng drift; xác nhận với chủ data (KSNK / IT BV103) cách giải quyết.
- [ ] Backup `sys_lookup_value` + 14 bảng vật lý (`pg_dump --table`).
- [ ] Backup tất cả bảng có FK trỏ về 14 bảng trên (xem cột "Nhóm FK trỏ tới").
- [ ] Lên lịch maintenance window (15-30 phút) vì DROP TABLE chặn DDL.
