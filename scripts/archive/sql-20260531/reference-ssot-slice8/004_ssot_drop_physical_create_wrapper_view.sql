-- Slice 8 - Bước 4: DROP bảng vật lý, CREATE wrapper view filter theo category_type.
--
-- PRE-CONDITIONS:
--   [ ] Đã chạy 002 + 003 (FK đã trỏ sys_lookup_value).
--   [ ] Đã backup `pg_dump --table` cho 14 bảng vật lý.
--   [ ] App code chấp nhận tên `*_dm_*` ở dạng VIEW (test trên staging).
--
-- Output:
--   Mỗi bảng vật lý chuyên biệt → trở thành view có cùng tên, expose đủ cột cũ
--   (mã/tên/specifc) đọc từ `sys_lookup_value` lọc theo category_type.

DO $$ BEGIN
  RAISE EXCEPTION 'Slice 8 Step 4 chưa được enable. Bỏ comment "-- ENABLE" để proceed.';
END $$;
-- ENABLE

BEGIN;

-- DROP các bảng vật lý chuyên biệt (CASCADE để bỏ FK còn lại; an toàn vì step 3 đã retarget).
DROP TABLE IF EXISTS public.mdm_dm_to_cong_tac          CASCADE;
DROP TABLE IF EXISTS public.mdm_dm_chuc_danh            CASCADE;
DROP TABLE IF EXISTS public.mdm_dm_chuc_vu              CASCADE;
DROP TABLE IF EXISTS public.mdm_dm_nghe_nghiep          CASCADE;
DROP TABLE IF EXISTS public.mdm_dm_khoi_khoa            CASCADE;
DROP TABLE IF EXISTS public.cssd_dm_loai_may            CASCADE;
DROP TABLE IF EXISTS public.cssd_dm_tram                CASCADE;
DROP TABLE IF EXISTS public.gstt_dm_hinh_thuc_giam_sat  CASCADE;
DROP TABLE IF EXISTS public.gstt_dm_cach_thuc_giam_sat  CASCADE;
DROP TABLE IF EXISTS public.qlcv_dm_loai_cong_viec      CASCADE;
DROP TABLE IF EXISTS public.qlcv_dm_trang_thai_cong_viec CASCADE;
DROP TABLE IF EXISTS public.nkbv_dm_loai                CASCADE;
DROP TABLE IF EXISTS public.nkbv_dm_trang_thai_ca       CASCADE;
DROP TABLE IF EXISTS public.dm_loai_su_co               CASCADE;

-- Tạo lại dạng VIEW. Mỗi view alias đúng tên cột cũ để app code không cần đổi.
CREATE OR REPLACE VIEW public.mdm_dm_to_cong_tac WITH (security_invoker='true') AS
SELECT id, code AS ma_to, name AS ten_to, is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'TO_CONG_TAC';

CREATE OR REPLACE VIEW public.mdm_dm_chuc_danh WITH (security_invoker='true') AS
SELECT id, code AS ma_chuc_danh, name AS ten_chuc_danh, is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'CHUC_DANH';

CREATE OR REPLACE VIEW public.mdm_dm_chuc_vu WITH (security_invoker='true') AS
SELECT id, code AS ma_chuc_vu, name AS ten_chuc_vu, is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'CHUC_VU';

CREATE OR REPLACE VIEW public.mdm_dm_nghe_nghiep WITH (security_invoker='true') AS
SELECT id, code AS ma_nghe_nghiep, name AS ten_nghe_nghiep, is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'NGHE_NGHIEP';

CREATE OR REPLACE VIEW public.mdm_dm_khoi_khoa WITH (security_invoker='true') AS
SELECT id, code AS ma_khoi, name AS ten_khoi, is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'KHOI_KHOA';

CREATE OR REPLACE VIEW public.cssd_dm_loai_may WITH (security_invoker='true') AS
SELECT id, code AS ma_loai_may, name AS ten_loai_may, is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'LOAI_MAY_TIET_KHUAN';

CREATE OR REPLACE VIEW public.cssd_dm_tram WITH (security_invoker='true') AS
SELECT id, code AS ma_tram, name AS ten_tram,
       (metadata->>'thu_tu')::int AS thu_tu,
       is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'TRAM_CSSD';

CREATE OR REPLACE VIEW public.gstt_dm_hinh_thuc_giam_sat WITH (security_invoker='true') AS
SELECT id, code AS ma_hinh_thuc, name AS ten_hinh_thuc, is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'HINH_THUC_GIAM_SAT';

CREATE OR REPLACE VIEW public.gstt_dm_cach_thuc_giam_sat WITH (security_invoker='true') AS
SELECT id, code AS ma_cach_thuc, name AS ten_cach_thuc, is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'CACH_THUC_GIAM_SAT';

CREATE OR REPLACE VIEW public.qlcv_dm_loai_cong_viec WITH (security_invoker='true') AS
SELECT id, code AS ma, name AS ten,
       (metadata->>'thu_tu')::int AS thu_tu,
       is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'LOAI_CONG_VIEC';

CREATE OR REPLACE VIEW public.qlcv_dm_trang_thai_cong_viec WITH (security_invoker='true') AS
SELECT id, code AS ma, name AS ten,
       metadata->>'mau_sac' AS mau_sac,
       (metadata->>'thu_tu')::int AS thu_tu,
       is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'TRANG_THAI_CONG_VIEC';

CREATE OR REPLACE VIEW public.nkbv_dm_loai WITH (security_invoker='true') AS
SELECT id, code AS ma_loai, name AS ten_loai, is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'LOAI_NKBV';

CREATE OR REPLACE VIEW public.nkbv_dm_trang_thai_ca WITH (security_invoker='true') AS
SELECT id, code AS ma_trang_thai, name AS ten_trang_thai,
       (metadata->>'thu_tu')::int AS thu_tu,
       is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA';

CREATE OR REPLACE VIEW public.dm_loai_su_co WITH (security_invoker='true') AS
SELECT id, code AS ma_loai_su_co, name AS ten_loai_su_co, is_active, created_at, updated_at, metadata
  FROM public.sys_lookup_value WHERE category_type = 'LOAI_SU_CO';

-- Tái tạo các view tương thích cũ (dm_*) nếu code app vẫn dùng — đa số là view-on-view 1 tầng.
CREATE OR REPLACE VIEW public.dm_to_cong_tac    WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_to_cong_tac;
CREATE OR REPLACE VIEW public.dm_chuc_danh      WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_chuc_danh;
CREATE OR REPLACE VIEW public.dm_chuc_vu        WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_chuc_vu;
CREATE OR REPLACE VIEW public.dm_nghe_nghiep    WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_nghe_nghiep;
CREATE OR REPLACE VIEW public.dm_khoi_khoa      WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_khoi_khoa;
CREATE OR REPLACE VIEW public.dm_loai_may_tiet_khuan WITH (security_invoker='true') AS SELECT * FROM public.cssd_dm_loai_may;
CREATE OR REPLACE VIEW public.dm_tram_cssd      WITH (security_invoker='true') AS SELECT * FROM public.cssd_dm_tram;
CREATE OR REPLACE VIEW public.dm_hinh_thuc_giam_sat WITH (security_invoker='true') AS SELECT * FROM public.gstt_dm_hinh_thuc_giam_sat;
CREATE OR REPLACE VIEW public.dm_cach_thuc_giam_sat WITH (security_invoker='true') AS SELECT * FROM public.gstt_dm_cach_thuc_giam_sat;
CREATE OR REPLACE VIEW public.dm_loai_cong_viec WITH (security_invoker='true') AS SELECT * FROM public.qlcv_dm_loai_cong_viec;
CREATE OR REPLACE VIEW public.dm_trang_thai_cong_viec WITH (security_invoker='true') AS SELECT * FROM public.qlcv_dm_trang_thai_cong_viec;
CREATE OR REPLACE VIEW public.dm_loai_nkbv      WITH (security_invoker='true') AS SELECT * FROM public.nkbv_dm_loai;
CREATE OR REPLACE VIEW public.dm_trang_thai_nkbv_ca WITH (security_invoker='true') AS SELECT * FROM public.nkbv_dm_trang_thai_ca;

COMMIT;

-- ROLLBACK: chỉ qua pg_restore từ backup. KHÔNG có rollback in-place.
