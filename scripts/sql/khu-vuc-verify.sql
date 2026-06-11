-- Khu vực giám sát SSOT + guard prefix cũ (một dòng JSON + danh sách).
WITH kv AS (
  SELECT code, name, metadata->>'nhom_mau' AS nhom, is_active
  FROM public.sys_lookup_value
  WHERE category_type = 'KHU_VUC_GIAM_SAT'
)
SELECT jsonb_build_object(
  'no_legacy_prefix_ok', NOT EXISTS (
    SELECT 1 FROM kv WHERE code ~ '^KV_(TR|DO|VA|XA)_'
  ),
  'active_count', (SELECT count(*) FROM kv WHERE is_active),
  'inactive_count', (SELECT count(*) FROM kv WHERE NOT is_active),
  'rows', (
    SELECT coalesce(jsonb_agg(
      jsonb_build_object('code', code, 'name', name, 'nhom', nhom, 'is_active', is_active)
      ORDER BY code
    ), '[]'::jsonb)
    FROM kv
  )
) AS khu_vuc_ssot;
