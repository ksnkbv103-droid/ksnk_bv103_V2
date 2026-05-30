-- Slice 8 - Bước 2: Backfill sys_lookup_value từ bảng vật lý.
-- Mục tiêu: đảm bảo sys_lookup_value có TẤT CẢ rows mà các bảng vật lý có
--           (vì FK ngoại bộ đang trỏ tới id của bảng vật lý → cần mapping).
--
-- PRE-CONDITIONS:
--   [ ] Đã chạy `001_ssot_reconcile_report.sql` và đọc output.
--   [ ] Đã giải quyết `[name_drift]` thủ công (UPDATE sys_lookup_value hoặc UPDATE bảng vật lý).
--   [ ] Đã backup `sys_lookup_value` + 14 bảng vật lý.

-- An toàn: chặn không cho chạy nhầm. Bỏ comment `-- ENABLE` khi sẵn sàng.
DO $$ BEGIN
  RAISE EXCEPTION 'Slice 8 Step 2 chưa được enable. Bỏ comment dòng "-- ENABLE" ở đầu file để proceed.';
END $$;
-- ENABLE

BEGIN;

DROP TABLE IF EXISTS _slice8_pairs;
CREATE TEMP TABLE _slice8_pairs (
  category_type   text,
  physical_table  regclass,
  ma_col          text,
  ten_col         text
);
INSERT INTO _slice8_pairs VALUES
  ('TO_CONG_TAC',          'public.mdm_dm_to_cong_tac',          'ma_to',           'ten_to'),
  ('CHUC_DANH',            'public.mdm_dm_chuc_danh',            'ma_chuc_danh',    'ten_chuc_danh'),
  ('CHUC_VU',              'public.mdm_dm_chuc_vu',              'ma_chuc_vu',      'ten_chuc_vu'),
  ('NGHE_NGHIEP',          'public.mdm_dm_nghe_nghiep',          'ma_nghe_nghiep',  'ten_nghe_nghiep'),
  ('KHOI_KHOA',            'public.mdm_dm_khoi_khoa',            'ma_khoi',         'ten_khoi'),
  ('LOAI_MAY_TIET_KHUAN',  'public.cssd_dm_loai_may',            'ma_loai_may',     'ten_loai_may'),
  ('TRAM_CSSD',            'public.cssd_dm_tram',                'ma_tram',         'ten_tram'),
  ('HINH_THUC_GIAM_SAT',   'public.gstt_dm_hinh_thuc_giam_sat',  'ma_hinh_thuc',    'ten_hinh_thuc'),
  ('CACH_THUC_GIAM_SAT',   'public.gstt_dm_cach_thuc_giam_sat',  'ma_cach_thuc',    'ten_cach_thuc'),
  ('LOAI_CONG_VIEC',       'public.qlcv_dm_loai_cong_viec',      'ma',              'ten'),
  ('TRANG_THAI_CONG_VIEC', 'public.qlcv_dm_trang_thai_cong_viec','ma',              'ten'),
  ('LOAI_NKBV',            'public.nkbv_dm_loai',                'ma_loai',         'ten_loai'),
  ('TRANG_THAI_NKBV_CA',   'public.nkbv_dm_trang_thai_ca',       'ma_trang_thai',   'ten_trang_thai'),
  ('LOAI_SU_CO',           'public.dm_loai_su_co',               'ma_loai_su_co',   'ten_loai_su_co');

-- Bảng phụ ánh xạ id_physical → id_lookup (dùng ở step 3 retarget FK).
CREATE TABLE IF NOT EXISTS public.sys_slice8_id_map (
  category_type    text NOT NULL,
  physical_table   text NOT NULL,
  physical_id      uuid NOT NULL,
  lookup_id        uuid NOT NULL,
  created_at       timestamptz DEFAULT now(),
  PRIMARY KEY (category_type, physical_id)
);

DO $$
DECLARE
  r record;
  v_sql text;
  v_inserted bigint;
  v_mapped bigint;
BEGIN
  FOR r IN SELECT * FROM _slice8_pairs ORDER BY category_type LOOP
    BEGIN
      -- (a) Insert missing rows vào sys_lookup_value (giữ nguyên id của bảng vật lý nếu có thể).
      --     Trick: khi backfill, copy id để FK ngoại bộ vẫn tham chiếu được mà không cần update.
      v_sql := format($f$
        INSERT INTO public.sys_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
        SELECT p.id, %L, p.%I::text, p.%I::text, COALESCE(p.is_active, true), COALESCE(p.created_at, now()), COALESCE(p.updated_at, now())
          FROM %s p
          LEFT JOIN public.sys_lookup_value lv
            ON lv.category_type = %L AND lv.code = p.%I::text
         WHERE lv.id IS NULL
         ON CONFLICT (id) DO NOTHING
      $f$, r.category_type, r.ma_col, r.ten_col, r.physical_table, r.category_type, r.ma_col);
      EXECUTE v_sql;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;

      -- (b) Lập map id_physical → id_lookup cho mọi row bảng vật lý.
      v_sql := format($f$
        INSERT INTO public.sys_slice8_id_map(category_type, physical_table, physical_id, lookup_id)
        SELECT %L, %L, p.id, lv.id
          FROM %s p
          JOIN public.sys_lookup_value lv
            ON lv.category_type = %L AND lv.code = p.%I::text
         ON CONFLICT (category_type, physical_id) DO UPDATE
           SET lookup_id = EXCLUDED.lookup_id
      $f$, r.category_type, r.physical_table::text, r.physical_table, r.category_type, r.ma_col);
      EXECUTE v_sql;
      GET DIAGNOSTICS v_mapped = ROW_COUNT;

      RAISE NOTICE '[backfill] cat=% inserted_lookup=% mapped_rows=%',
        rpad(r.category_type, 24), v_inserted, v_mapped;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE '[backfill] cat=% bỏ qua (bảng vật lý không tồn tại)', r.category_type;
    END;
  END LOOP;
END $$;

DROP TABLE IF EXISTS _slice8_pairs;

COMMIT;

-- ROLLBACK:
--   BEGIN;
--   DELETE FROM public.sys_lookup_value lv
--     WHERE lv.id IN (SELECT lookup_id FROM public.sys_slice8_id_map);
--   DROP TABLE public.sys_slice8_id_map;
--   COMMIT;
