-- Slice 8 - Bước 1: Reconcile report cho 14 cặp (category_type, physical_table).
-- READ-ONLY. Chạy qua psql trên staging/local; dùng \i hoặc copy/paste vào Supabase SQL editor.
-- KHÔNG đặt file này vào supabase/migrations/ vì chỉ là dump report.

-- ----------------------------------------------------
-- Định nghĩa các cặp cần reconcile
-- (category_type, physical_table, ma_col, ten_col)
-- ----------------------------------------------------
DROP TABLE IF EXISTS _slice8_pairs;
CREATE TEMP TABLE _slice8_pairs (
  category_type   text,
  physical_table  regclass,
  ma_col          text,
  ten_col         text
);

INSERT INTO _slice8_pairs(category_type, physical_table, ma_col, ten_col) VALUES
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

-- ----------------------------------------------------
-- 1. Đếm tổng quan
-- ----------------------------------------------------
\echo '=== Tổng quan dòng theo (category, physical_count, lookup_count) ==='

DO $$
DECLARE
  r record;
  v_phys bigint;
  v_lookup bigint;
BEGIN
  FOR r IN SELECT * FROM _slice8_pairs ORDER BY category_type LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM %s', r.physical_table) INTO v_phys;
    EXCEPTION WHEN undefined_table THEN
      v_phys := -1; -- không tồn tại
    END;
    SELECT count(*) INTO v_lookup
      FROM public.sys_lookup_value
     WHERE category_type = r.category_type;

    RAISE NOTICE 'category=% | physical_table=% | physical_count=% | lookup_count=%',
      rpad(r.category_type, 24), rpad(r.physical_table::text, 38), v_phys, v_lookup;
  END LOOP;
END $$;

-- ----------------------------------------------------
-- 2. Detail drift: rows in physical NOT in sys_lookup_value (by code)
-- ----------------------------------------------------
\echo ''
\echo '=== Rows tồn tại ở physical NHƯNG thiếu ở sys_lookup_value (cần backfill) ==='

DO $$
DECLARE
  r record;
  v_sql text;
  v_missing record;
BEGIN
  FOR r IN SELECT * FROM _slice8_pairs ORDER BY category_type LOOP
    BEGIN
      v_sql := format($f$
        SELECT %L AS cat, p.%I::text AS code, p.%I::text AS name
          FROM %s p
          LEFT JOIN public.sys_lookup_value lv
            ON lv.category_type = %L AND lv.code = p.%I::text
         WHERE lv.id IS NULL
         LIMIT 100
      $f$, r.category_type, r.ma_col, r.ten_col, r.physical_table, r.category_type, r.ma_col);

      FOR v_missing IN EXECUTE v_sql LOOP
        RAISE NOTICE '[missing_in_lookup] cat=% code=% name=%',
          v_missing.cat, v_missing.code, v_missing.name;
      END LOOP;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ----------------------------------------------------
-- 3. Detail drift: rows in sys_lookup_value NOT in physical
-- ----------------------------------------------------
\echo ''
\echo '=== Rows tồn tại ở sys_lookup_value NHƯNG thiếu ở physical (có thể bỏ qua) ==='

DO $$
DECLARE
  r record;
  v_sql text;
  v_missing record;
BEGIN
  FOR r IN SELECT * FROM _slice8_pairs ORDER BY category_type LOOP
    BEGIN
      v_sql := format($f$
        SELECT %L AS cat, lv.code, lv.name
          FROM public.sys_lookup_value lv
          LEFT JOIN %s p
            ON p.%I::text = lv.code
         WHERE lv.category_type = %L AND p.%I IS NULL
         LIMIT 100
      $f$, r.category_type, r.physical_table, r.ma_col, r.category_type, r.ma_col);

      FOR v_missing IN EXECUTE v_sql LOOP
        RAISE NOTICE '[missing_in_physical] cat=% code=% name=%',
          v_missing.cat, v_missing.code, v_missing.name;
      END LOOP;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ----------------------------------------------------
-- 4. Detail drift: trùng code nhưng lệch name
-- ----------------------------------------------------
\echo ''
\echo '=== Trùng code nhưng lệch name (DATA DRIFT - cần resolve thủ công) ==='

DO $$
DECLARE
  r record;
  v_sql text;
  v_drift record;
BEGIN
  FOR r IN SELECT * FROM _slice8_pairs ORDER BY category_type LOOP
    BEGIN
      v_sql := format($f$
        SELECT %L AS cat, p.%I::text AS code,
               p.%I::text AS name_physical,
               lv.name AS name_lookup
          FROM %s p
          JOIN public.sys_lookup_value lv
            ON lv.category_type = %L AND lv.code = p.%I::text
         WHERE p.%I::text IS DISTINCT FROM lv.name
         LIMIT 100
      $f$, r.category_type, r.ma_col, r.ten_col, r.physical_table,
            r.category_type, r.ma_col, r.ten_col);

      FOR v_drift IN EXECUTE v_sql LOOP
        RAISE NOTICE '[name_drift] cat=% code=% physical=% lookup=%',
          v_drift.cat, v_drift.code, v_drift.name_physical, v_drift.name_lookup;
      END LOOP;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ----------------------------------------------------
-- 5. List FK đang trỏ về 14 bảng vật lý (để Slice 8 step 3 retarget)
-- ----------------------------------------------------
\echo ''
\echo '=== Foreign keys đang trỏ về 14 bảng vật lý (cần retarget ở Step 3) ==='

SELECT
  con.conname,
  src.relname  AS src_table,
  att_src.attname AS src_column,
  tgt.relname  AS tgt_table,
  att_tgt.attname AS tgt_column
FROM pg_constraint con
JOIN pg_class tgt        ON tgt.oid = con.confrelid
JOIN pg_class src        ON src.oid = con.conrelid
JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
JOIN unnest(con.conkey)  WITH ORDINALITY k(attnum, ord) ON TRUE
JOIN pg_attribute att_src ON att_src.attrelid = src.oid AND att_src.attnum = k.attnum
JOIN unnest(con.confkey) WITH ORDINALITY fk(attnum, ord) ON fk.ord = k.ord
JOIN pg_attribute att_tgt ON att_tgt.attrelid = tgt.oid AND att_tgt.attnum = fk.attnum
WHERE con.contype = 'f'
  AND tgt_ns.nspname = 'public'
  AND tgt.relname IN (
    SELECT split_part(physical_table::text, '.', 2) FROM _slice8_pairs
  )
ORDER BY src.relname, con.conname;

DROP TABLE IF EXISTS _slice8_pairs;
