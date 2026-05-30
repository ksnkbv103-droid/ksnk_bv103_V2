-- Slice 8 - Bước 3: Retarget FK từ bảng vật lý sang sys_lookup_value(id).
--
-- PRE-CONDITIONS:
--   [ ] Đã chạy `002_ssot_backfill_lookup_from_physical.sql` (bảng `sys_slice8_id_map` đã đầy đủ).
--   [ ] Output `001` đã in danh sách FK cần retarget; đối chiếu với danh sách dưới đây.
--
-- Chiến lược:
--   1. UPDATE từng FK column theo `sys_slice8_id_map` để các id trỏ đúng id mới (lookup_id).
--      (Vì step 2 cố gắng giữ id_physical = id_lookup khi insert mới → đa số no-op,
--       nhưng vẫn UPDATE để bảo vệ trường hợp khác id.)
--   2. DROP CONSTRAINT cũ; CREATE CONSTRAINT mới REFERENCES sys_lookup_value(id).

DO $$ BEGIN
  RAISE EXCEPTION 'Slice 8 Step 3 chưa được enable. Bỏ comment "-- ENABLE" để proceed.';
END $$;
-- ENABLE

BEGIN;

-- Bảng cấu hình FK cần retarget. Bổ sung khi reconcile phát hiện FK khác.
-- (src_table, src_column, fk_constraint_name, category_type_dùng_để_lọc)
DROP TABLE IF EXISTS _slice8_fks;
CREATE TEMP TABLE _slice8_fks (
  src_table        regclass,
  src_column       text,
  fk_name          text,
  category_type    text
);

INSERT INTO _slice8_fks VALUES
  ('public.mdm_nhan_su',       'to_id',         'mdm_nhan_su_to_id_fkey',         'TO_CONG_TAC'),
  ('public.mdm_nhan_su',       'chuc_danh_id',  'mdm_nhan_su_chuc_danh_id_fkey',  'CHUC_DANH'),
  ('public.mdm_nhan_su',       'chuc_vu_id',    'mdm_nhan_su_chuc_vu_id_fkey',    'CHUC_VU'),
  ('public.mdm_dm_khoa_phong', 'khoi_id',       'mdm_dm_khoa_phong_khoi_id_fkey', 'KHOI_KHOA'),
  ('public.cssd_dm_thiet_bi',  'loai_may_id',   'cssd_dm_thiet_bi_loai_may_id_fkey', 'LOAI_MAY_TIET_KHUAN'),
  ('public.cssd_fact_quy_trinh','tram_hien_tai_id','cssd_fact_quy_trinh_tram_hien_tai_id_fkey','TRAM_CSSD'),
  ('public.gstt_fact_vst',     'nghe_nghiep_id','gstt_fact_vst_nghe_nghiep_id_fkey','NGHE_NGHIEP'),
  ('public.gstt_fact_chung_sessions','nghe_nghiep_id','gstt_fact_chung_sessions_nghe_nghiep_id_fkey','NGHE_NGHIEP'),
  ('public.gstt_fact_vst_sessions','hinh_thuc_id','gstt_fact_vst_sessions_hinh_thuc_id_fkey','HINH_THUC_GIAM_SAT'),
  ('public.gstt_fact_vst_sessions','cach_thuc_id','gstt_fact_vst_sessions_cach_thuc_id_fkey','CACH_THUC_GIAM_SAT'),
  ('public.gstt_fact_chung_sessions','hinh_thuc_id','gstt_fact_chung_sessions_hinh_thuc_id_fkey','HINH_THUC_GIAM_SAT'),
  ('public.gstt_fact_chung_sessions','cach_thuc_id','gstt_fact_chung_sessions_cach_thuc_id_fkey','CACH_THUC_GIAM_SAT');

-- Bước A: Cập nhật id ở src_column theo sys_slice8_id_map (no-op nếu id đã giữ nguyên).
DO $$
DECLARE
  r record;
  v_sql text;
  v_updated bigint;
BEGIN
  FOR r IN SELECT * FROM _slice8_fks LOOP
    BEGIN
      v_sql := format($f$
        UPDATE %s s
           SET %I = m.lookup_id
          FROM public.sys_slice8_id_map m
         WHERE m.category_type = %L
           AND s.%I = m.physical_id
           AND s.%I <> m.lookup_id
      $f$, r.src_table, r.src_column, r.category_type, r.src_column, r.src_column);
      EXECUTE v_sql;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      RAISE NOTICE '[retarget-A] %.% updated_rows=%', r.src_table, r.src_column, v_updated;
    EXCEPTION WHEN undefined_column OR undefined_table THEN
      RAISE NOTICE '[retarget-A] bỏ qua %.% (cột hoặc bảng không tồn tại)', r.src_table, r.src_column;
    END;
  END LOOP;
END $$;

-- Bước B: Drop FK cũ; create FK mới REFERENCES sys_lookup_value(id).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM _slice8_fks LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.src_table, r.fk_name);
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.sys_lookup_value(id) DEFERRABLE INITIALLY DEFERRED',
        r.src_table, r.fk_name || '_v2', r.src_column
      );
      RAISE NOTICE '[retarget-B] %.% FK retargeted -> sys_lookup_value(id)', r.src_table, r.src_column;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[retarget-B] FAIL %.% : %', r.src_table, r.src_column, SQLERRM;
    END;
  END LOOP;
END $$;

DROP TABLE IF EXISTS _slice8_fks;

COMMIT;

-- ROLLBACK: phải có backup pg_dump trước Step 3.
-- Reverse Step B bằng cách restore và DROP constraint *_v2 + CREATE lại constraint cũ.
