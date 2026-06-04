SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  t.table_type,
  fk.ref_table,
  fk.ref_column
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
LEFT JOIN LATERAL (
  SELECT ccu.table_name AS ref_table, ccu.column_name AS ref_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = c.table_name
    AND kcu.column_name = c.column_name
  LIMIT 1
) fk ON true
WHERE c.table_schema = 'public'
  AND c.column_name LIKE '%\_id' ESCAPE '\'
  AND c.column_name NOT IN ('id', 'created_by_id', 'updated_by_id')
  AND t.table_type = 'BASE TABLE'
  AND c.table_name NOT LIKE 'sys\_%' ESCAPE '\'
ORDER BY c.table_name, c.column_name;
