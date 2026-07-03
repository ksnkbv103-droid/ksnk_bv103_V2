-- SSOT 3 bản chất nguyên nhân sự cố CSSD (LOAI_SU_CO) — idempotent seed
INSERT INTO public.sys_lookup_value (id, category_type, code, name, is_active, metadata)
SELECT gen_random_uuid(), 'LOAI_SU_CO', v.code, v.name, true, v.meta::jsonb
FROM (
  VALUES
    ('SC_QUY_TRINH', 'Lỗi quy trình kỹ thuật', '{"thu_tu":1}'),
    ('SC_CHU_QUAN', 'Lỗi chủ quan cá nhân', '{"thu_tu":2}'),
    ('SC_HE_THONG', 'Lỗi hệ thống/Dữ liệu', '{"thu_tu":3}')
) AS v(code, name, meta)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sys_lookup_value existing
  WHERE existing.category_type = 'LOAI_SU_CO'
    AND existing.code = v.code
);

-- Backfill CAUSE_CLASS trên bản ghi cũ từ loai_su_co_id nếu có
UPDATE public.cssd_fact_su_co sc
SET attributes = sc.attributes || jsonb_build_object('CAUSE_CLASS', ls.code, 'CAUSE_LABEL', ls.name)
FROM public.sys_lookup_value ls
WHERE sc.loai_su_co_id = ls.id
  AND ls.category_type = 'LOAI_SU_CO'
  AND COALESCE(sc.attributes ->> 'CAUSE_CLASS', '') = '';
