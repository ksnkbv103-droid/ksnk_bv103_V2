-- Báo cáo FK / SSOT sau migration 20260716012 (read-only).

SELECT 'qlcv_missing_loai_fk' AS metric, count(*)::bigint AS value
FROM public.fact_cong_viec
WHERE loai_cong_viec_id IS NULL AND is_active = true
UNION ALL
SELECT 'qlcv_missing_trang_thai_fk', count(*)::bigint
FROM public.fact_cong_viec
WHERE trang_thai_id IS NULL AND is_active = true
UNION ALL
SELECT 'thiet_bi_missing_loai_may_fk', count(*)::bigint
FROM public.dm_thiet_bi
WHERE loai_may_id IS NULL AND is_active = true
UNION ALL
SELECT 'vst_sessions_missing_hinh_thuc_fk', count(*)::bigint
FROM public.fact_giam_sat_vst_sessions
WHERE coalesce(is_active, true) AND hinh_thuc_id IS NULL
UNION ALL
SELECT 'uuid_cols_without_fk_remaining', (
  SELECT count(*)::bigint
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
);
