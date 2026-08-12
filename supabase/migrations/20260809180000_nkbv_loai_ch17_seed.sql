-- Seed 16 mã loại NKBV Chương 17 (Phần II) vào LOAI_NKBV — idempotent.
INSERT INTO public.sys_lookup_value (id, category_type, code, name, is_active, metadata)
SELECT gen_random_uuid(), 'LOAI_NKBV', v.code, v.name, true, v.meta::jsonb
FROM (
  VALUES
    ('BONE', 'Viêm xương tủy (BONE)', '{"thu_tu":100,"group":"BJ","ch17":true}'),
    ('DISC', 'Nhiễm trùng khoang đĩa đệm (DISC)', '{"thu_tu":101,"group":"BJ","ch17":true}'),
    ('JNT', 'Nhiễm trùng khớp tự nhiên (JNT)', '{"thu_tu":102,"group":"BJ","ch17":true}'),
    ('PJI', 'Nhiễm trùng khớp nhân tạo (PJI)', '{"thu_tu":103,"group":"BJ","ch17":true}'),
    ('IC', 'Nhiễm trùng nội sọ (IC)', '{"thu_tu":110,"group":"CNS","ch17":true}'),
    ('MEN', 'Viêm màng não / não thất (MEN)', '{"thu_tu":111,"group":"CNS","ch17":true}'),
    ('SA', 'Áp xe tủy sống (SA)', '{"thu_tu":112,"group":"CNS","ch17":true}'),
    ('CARD', 'Viêm cơ tim / màng ngoài tim (CARD)', '{"thu_tu":120,"group":"CVS","ch17":true}'),
    ('MED', 'Viêm trung thất (MED)', '{"thu_tu":121,"group":"CVS","ch17":true}'),
    ('VASC', 'Nhiễm trùng động / tĩnh mạch (VASC)', '{"thu_tu":122,"group":"CVS","ch17":true}'),
    ('ENDO', 'Viêm nội tâm mạc nhiễm khuẩn (ENDO)', '{"thu_tu":123,"group":"CVS","ch17":true}'),
    ('CDI', 'Viêm đại tràng do C. difficile (CDI)', '{"thu_tu":130,"group":"GI","ch17":true}'),
    ('GE', 'Viêm dạ dày ruột (GE)', '{"thu_tu":131,"group":"GI","ch17":true}'),
    ('GIT', 'Nhiễm trùng đường tiêu hóa (GIT)', '{"thu_tu":132,"group":"GI","ch17":true}'),
    ('IAB', 'Nhiễm trùng khoang ổ bụng (IAB)', '{"thu_tu":133,"group":"GI","ch17":true}'),
    ('LUNG', 'Áp xe phổi / tràn mủ màng phổi (LUNG)', '{"thu_tu":140,"group":"LRI","ch17":true}')
) AS v(code, name, meta)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sys_lookup_value existing
  WHERE existing.category_type = 'LOAI_NKBV'
    AND existing.code = v.code
);
