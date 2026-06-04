-- Pilot auth checklist: mdm_nhan_su ↔ auth.users (chạy sau migrate / restore).
-- Usage: npm run trial:auth:precheck  |  trial:auth:precheck:local
-- Email nhân sự: extra_data->>'email' (không cột vật lý email trên mdm_nhan_su).

SELECT 'auth.users' AS metric, count(*)::bigint AS n FROM auth.users
UNION ALL
SELECT 'mdm_nhan_su', count(*) FROM public.mdm_nhan_su WHERE COALESCE(is_active, true)
UNION ALL
SELECT 'mdm_with_auth_user_id', count(*) FROM public.mdm_nhan_su
  WHERE auth_user_id IS NOT NULL AND COALESCE(is_active, true)
UNION ALL
SELECT 'mdm_email_no_auth', count(*) FROM public.mdm_nhan_su m
  WHERE COALESCE(m.is_active, true)
    AND nullif(btrim(m.extra_data->>'email'), '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM auth.users u
      WHERE lower(u.email) = lower(m.extra_data->>'email')
    )
UNION ALL
SELECT 'auth_no_mdm_profile', count(*) FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mdm_nhan_su m
    WHERE m.auth_user_id = u.id
       OR (
         nullif(btrim(m.extra_data->>'email'), '') IS NOT NULL
         AND lower(m.extra_data->>'email') = lower(u.email)
       )
  );
