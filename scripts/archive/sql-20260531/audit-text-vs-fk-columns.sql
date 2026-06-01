-- Cột text có thể trùng với cột *_id cùng bảng (heuristic read-only)
WITH fk_cols AS (
  SELECT
    cl.relname AS table_name,
    att.attname AS column_name,
    clf.relname AS ref_table
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = cl.relnamespace AND n.nspname = 'public'
  JOIN unnest(con.conkey) WITH ORDINALITY ck(attnum, ord) ON true
  JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ck.attnum
  JOIN pg_class clf ON clf.oid = con.confrelid
  WHERE con.contype = 'f'
),
uuid_fk AS (
  SELECT table_name, column_name, ref_table
  FROM fk_cols
  WHERE column_name ~ '_id$' AND column_name <> 'id'
)
SELECT
  u.table_name,
  u.column_name AS fk_column,
  u.ref_table,
  c2.column_name AS possible_text_dup,
  c2.data_type AS text_type
FROM uuid_fk u
JOIN information_schema.columns c2
  ON c2.table_schema = 'public'
  AND c2.table_name = u.table_name
  AND c2.data_type IN ('character varying', 'text')
  AND c2.column_name <> u.column_name
  AND (
    c2.column_name LIKE replace(u.column_name, '_id', '%')
    OR c2.column_name IN (
      'loai_bang_kiem', 'hinh_thuc_giam_sat', 'cach_thuc_giam_sat',
      'loai_cong_viec', 'trang_thai', 'ma_trang_thai', 'loai_thiet_bi',
      'loai_tiet_khuan', 'ma_loai_su_co', 'khu_vuc', 'nghe_nghiep'
    )
  )
ORDER BY u.table_name, u.column_name, c2.column_name;
