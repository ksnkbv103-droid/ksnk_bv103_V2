-- Probe ma trận 5 vai trò KSNK (taxonomy sau 20260718100000).
-- Chạy: npm run trial:rbac:roles:local | npm run trial:rbac:roles
-- Pass khi: đủ 5 role active; không còn user gán legacy soft-deprecate;
--           mỗi role có ≥1 permission (ADMIN = full registry).

SELECT jsonb_build_object(
  'active_roles', (
    SELECT jsonb_agg(jsonb_build_object('name', name, 'is_active', is_active) ORDER BY name)
    FROM public.sys_roles
    WHERE name IN (
      'ADMIN',
      'NHAN_VIEN_KSNK',
      'HOI_DONG_KSNK',
      'MANG_LUOI_KSNK',
      'KHACH_THONG_KE_GSTT'
    )
  ),
  'missing_active_roles', (
    SELECT coalesce(jsonb_agg(expected ORDER BY expected), '[]'::jsonb)
    FROM (
      SELECT unnest(ARRAY[
        'ADMIN',
        'NHAN_VIEN_KSNK',
        'HOI_DONG_KSNK',
        'MANG_LUOI_KSNK',
        'KHACH_THONG_KE_GSTT'
      ]) AS expected
    ) e
    WHERE NOT EXISTS (
      SELECT 1 FROM public.sys_roles r
      WHERE r.name = e.expected AND coalesce(r.is_active, true) = true
    )
  ),
  'legacy_assignments', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'role', r.name,
      'user_count', c.cnt
    ) ORDER BY r.name), '[]'::jsonb)
    FROM public.sys_roles r
    JOIN LATERAL (
      SELECT count(*)::int AS cnt FROM public.sys_user_roles ur WHERE ur.role_id = r.id
    ) c ON true
    WHERE r.name IN (
      'TO_TRUONG_MANG_LUOI_KSNK',
      'THANH_VIEN_MANG_LUOI_KSNK',
      'BAN_QLCL',
      'KHOA_TRANG_BI'
    )
    AND c.cnt > 0
  ),
  'role_permission_counts', (
    SELECT jsonb_object_agg(r.name, c.cnt)
    FROM public.sys_roles r
    JOIN LATERAL (
      SELECT count(*)::int AS cnt
      FROM public.sys_role_permissions rp
      WHERE rp.role_id = r.id
    ) c ON true
    WHERE r.name IN (
      'ADMIN',
      'NHAN_VIEN_KSNK',
      'HOI_DONG_KSNK',
      'MANG_LUOI_KSNK',
      'KHACH_THONG_KE_GSTT'
    )
  ),
  'bang_kiem_permissive_policies', (
    SELECT coalesce(jsonb_agg(polname ORDER BY polname), '[]'::jsonb)
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'gstt_dm_bang_kiem'
      AND polname IN ('Authenticated read access', 'Admin full access')
  ),
  'qlcv_select_policy', (
    SELECT coalesce(jsonb_agg(polname ORDER BY polname), '[]'::jsonb)
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'qlcv_fact_cong_viec'
      AND polcmd = 'r'
  )
);
