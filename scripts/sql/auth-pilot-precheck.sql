-- Pilot auth checklist: mdm_nhan_su ↔ auth.users (chạy sau migrate / restore).
-- Usage: npx supabase db query --linked -f scripts/sql/auth-pilot-precheck.sql -o table

SELECT 'auth.users' AS metric, count(*)::bigint AS n FROM auth.users
UNION ALL
SELECT 'mdm_nhan_su', count(*) FROM public.mdm_nhan_su WHERE COALESCE(is_active, true)
UNION ALL
SELECT 'mdm_with_auth_user_id', count(*) FROM public.mdm_nhan_su
  WHERE auth_user_id IS NOT NULL AND COALESCE(is_active, true)
UNION ALL
SELECT 'mdm_email_no_auth', count(*) FROM public.mdm_nhan_su m
  WHERE COALESCE(m.is_active, true)
    AND m.email IS NOT NULL AND btrim(m.email) <> ''
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(m.email))
UNION ALL
SELECT 'auth_no_mdm_profile', count(*) FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mdm_nhan_su m
    WHERE m.auth_user_id = u.id OR lower(m.email) = lower(u.email)
  );
