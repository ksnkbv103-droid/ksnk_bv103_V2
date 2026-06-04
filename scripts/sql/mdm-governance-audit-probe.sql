-- Probe OPEN suggestions vs real FK targets (run with service role / supabase db query)
SELECT suggestion_type, COUNT(*) AS n
FROM public.sys_mdm_suggestion
WHERE status = 'OPEN'
GROUP BY 1
ORDER BY 1;

-- FK constraints on *_id columns (public schema, user tables only)
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS ref_table,
  ccu.column_name AS ref_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND kcu.column_name LIKE '%\_id' ESCAPE '\'
ORDER BY 1, 2;

-- Registry source_table distribution
SELECT field_role, source_table, COUNT(*) AS n
FROM public.sys_mdm_registry
WHERE is_active = true
GROUP BY 1, 2
ORDER BY 3 DESC;
