-- Bổ sung EMET / OREP / VCUF vào LOAI_NKBV (đóng gap SSI OB/GYN) — idempotent.
INSERT INTO public.sys_lookup_value (id, category_type, code, name, is_active, metadata)
SELECT gen_random_uuid(), 'LOAI_NKBV', v.code, v.name, true, v.meta::jsonb
FROM (
  VALUES
    ('EMET', 'Viêm nội mạc tử cung (EMET)', '{"thu_tu":150,"group":"REPR","ch17":true}'),
    ('OREP', 'Nhiễm trùng đường sinh sản sâu (OREP)', '{"thu_tu":151,"group":"REPR","ch17":true}'),
    ('VCUF', 'Nhiễm trùng mỏm cắt âm đạo (VCUF)', '{"thu_tu":152,"group":"REPR","ch17":true}')
) AS v(code, name, meta)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sys_lookup_value existing
  WHERE existing.category_type = 'LOAI_NKBV'
    AND existing.code = v.code
);
