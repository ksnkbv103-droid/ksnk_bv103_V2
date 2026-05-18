-- Audit: cột denorm còn trên bảng gốc + uuid *_id chưa có FK (read-only)

-- 1) Cột text denorm (sẽ DROP khi apply 20260716012)
SELECT 'denorm_columns_remaining' AS section, table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'fact_giam_sat_vst_sessions' AND column_name IN ('hinh_thuc_giam_sat', 'cach_thuc_giam_sat'))
    OR (table_name = 'fact_giam_sat_chung_sessions' AND column_name IN ('hinh_thuc_giam_sat', 'cach_thuc_giam_sat', 'loai_bang_kiem'))
    OR (table_name = 'fact_cong_viec' AND column_name IN ('loai_cong_viec', 'trang_thai', 'ma_trang_thai'))
    OR (table_name = 'dm_thiet_bi' AND column_name = 'loai_thiet_bi')
    OR (table_name = 'fact_lo_tiet_khuan' AND column_name = 'loai_tiet_khuan')
    OR (table_name = 'fact_su_co' AND column_name = 'ma_loai_su_co')
  )
ORDER BY table_name, column_name;

-- 2) uuid *_id trên fact_/dm_ chưa có FK
SELECT 'uuid_cols_without_fk' AS section, cols.table_name, cols.column_name
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
ORDER BY cols.table_name, cols.column_name;

-- 3) Orphan FK candidates (sample — QLCV / thiết bị)
SELECT 'orphan_qlcv_loai' AS section, count(*)::bigint AS cnt
FROM public.fact_cong_viec cv
WHERE cv.loai_cong_viec_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.dm_loai_cong_viec d WHERE d.id = cv.loai_cong_viec_id);

SELECT 'orphan_gsc_bang_kiem' AS section, count(*)::bigint AS cnt
FROM public.fact_giam_sat_chung_sessions s
WHERE s.bang_kiem_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.dm_bang_kiem bk WHERE bk.id = s.bang_kiem_id);
