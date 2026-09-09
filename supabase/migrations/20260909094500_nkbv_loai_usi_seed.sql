-- Seed USI (Ch.17 hệ tiết niệu sâu) vào LOAI_NKBV — idempotent.
INSERT INTO public.sys_lookup_value (id, category_type, code, name, is_active, metadata)
SELECT gen_random_uuid(), 'LOAI_NKBV', v.code, v.name, true, v.meta::jsonb
FROM (
  VALUES
    ('USI', 'Nhiễm trùng hệ tiết niệu sâu (USI)', '{"thu_tu":141,"group":"USI","ch17":true}')
) AS v(code, name, meta)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sys_lookup_value existing
  WHERE existing.category_type = 'LOAI_NKBV'
    AND existing.code = v.code
);
