-- BV103 DB health audit (read-only) — chạy sau phase FK + drop denorm

-- A) Migration sanity: cột denorm đã DROP (mong đợi 0 dòng)
SELECT 'denorm_columns_should_be_empty' AS check_id, table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'fact_giam_sat_vst_sessions' AND column_name IN ('hinh_thuc_giam_sat', 'cach_thuc_giam_sat'))
    OR (table_name = 'fact_giam_sat_chung_sessions' AND column_name IN ('hinh_thuc_giam_sat', 'cach_thuc_giam_sat', 'loai_bang_kiem'))
    OR (table_name = 'fact_cong_viec' AND column_name IN ('loai_cong_viec', 'trang_thai', 'ma_trang_thai'))
    OR (table_name = 'dm_thiet_bi' AND column_name = 'loai_thiet_bi')
    OR (table_name = 'fact_lo_tiet_khuan' AND column_name = 'loai_tiet_khuan')
    OR (table_name = 'fact_su_co' AND column_name = 'ma_loai_su_co')
    OR (table_name = 'fact_giam_sat_vst' AND column_name IN ('khu_vuc', 'nghe_nghiep'))
    OR (table_name = 'mdm_nhan_su' AND column_name IN ('chuc_vu', 'chuc_danh', 'vai_tro_he_thong_ksnk'))
  );

-- B) uuid *_id trên fact_/dm_ chưa có FK
SELECT 'uuid_fk_gaps' AS check_id, cols.table_name, cols.column_name
FROM (
  SELECT c.table_name, c.column_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name ~ '^(fact_|dm_)'
    AND c.column_name ~ '_id$'
    AND c.column_name <> 'id'
    AND c.data_type = 'uuid'
    AND c.column_name <> 'legacy_danh_muc_id'
) cols
LEFT JOIN (
  SELECT cl.relname AS table_name, att.attname AS column_name
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = cl.relnamespace AND n.nspname = 'public'
  JOIN unnest(con.conkey) WITH ORDINALITY ck(attnum, ord) ON true
  JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ck.attnum
  WHERE con.contype = 'f'
) fks ON fks.table_name = cols.table_name AND fks.column_name = cols.column_name
WHERE fks.column_name IS NULL
ORDER BY 1, 2;

-- C) Orphan FK samples (active rows)
SELECT 'orphan_qlcv_loai' AS check_id, count(*)::bigint AS cnt
FROM public.fact_cong_viec cv
WHERE cv.loai_cong_viec_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.dm_loai_cong_viec d WHERE d.id = cv.loai_cong_viec_id);

SELECT 'orphan_qlcv_trang_thai' AS check_id, count(*)::bigint AS cnt
FROM public.fact_cong_viec cv
WHERE cv.trang_thai_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.dm_trang_thai_cong_viec d WHERE d.id = cv.trang_thai_id);

SELECT 'orphan_vst_obs_khu_vuc' AS check_id, count(*)::bigint AS cnt
FROM public.fact_giam_sat_vst o
WHERE o.khu_vuc_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.dm_khu_vuc_giam_sat d WHERE d.id = o.khu_vuc_id);

SELECT 'orphan_vst_obs_nghe' AS check_id, count(*)::bigint AS cnt
FROM public.fact_giam_sat_vst o
WHERE o.nghe_nghiep_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.dm_nghe_nghiep d WHERE d.id = o.nghe_nghiep_id);

SELECT 'orphan_gsc_bang_kiem' AS check_id, count(*)::bigint AS cnt
FROM public.fact_giam_sat_chung_sessions s
WHERE s.bang_kiem_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.dm_bang_kiem bk WHERE bk.id = s.bang_kiem_id);

SELECT 'orphan_mdm_chuc_vu' AS check_id, count(*)::bigint AS cnt
FROM public.mdm_nhan_su ns
WHERE ns.chuc_vu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.dm_chuc_vu d WHERE d.id = ns.chuc_vu_id);

-- D) FK trỏ danh_muc_tuy_bien (sunset)
SELECT 'fk_to_danh_muc_tuy_bien' AS check_id, tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND ccu.table_name = 'danh_muc_tuy_bien';

-- E) View SSOT tồn tại
SELECT 'required_views' AS check_id, v.table_name
FROM information_schema.views v
WHERE v.table_schema = 'public'
  AND v.table_name IN (
    'v_fact_cong_viec_full',
    'v_fact_giam_sat_vst_sessions_full',
    'v_fact_giam_sat_chung_sessions_full',
    'v_fact_giam_sat_vst_full',
    'v_mdm_nhan_su_full',
    'v_dm_thiet_bi_full',
    'v_fact_lo_tiet_khuan_full',
    'v_fact_su_co_full'
  )
ORDER BY 1;

-- F) Active rows thiếu FK bắt buộc nghiệp vụ
SELECT 'vst_session_missing_hinh_thuc' AS check_id, count(*)::bigint
FROM public.fact_giam_sat_vst_sessions s
WHERE coalesce(s.is_active, true) AND s.hinh_thuc_id IS NULL;

SELECT 'qlcv_active_missing_trang_thai' AS check_id, count(*)::bigint
FROM public.fact_cong_viec cv
WHERE cv.is_active = true AND cv.trang_thai_id IS NULL;
