-- Nhân viên KSNK thử cho Quản lý công việc — CHỈ local/dev (cùng mật khẩu mặc định như 01-pilot-nhan-su.sql).
-- KHÔNG chạy trên staging/prod. Chạy lại an toàn (ON CONFLICT / WHERE NOT EXISTS).
-- Vai trò NHAN_VIEN_KSNK: tạo/sửa việc, nhưng KHÔNG có CONG_VIEC.approve (chỉ ADMIN duyệt) — đúng để thử luồng giao → làm → nộp → duyệt.

BEGIN;

WITH staff(auth_id, ma_nv, ho_ten, email) AS (
  VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb101'::uuid, 'NV_TEST01', 'Nhân viên KSNK Thử 1', 'nv.test1@local.test'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb102'::uuid, 'NV_TEST02', 'Nhân viên KSNK Thử 2', 'nv.test2@local.test')
),
u AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  SELECT
    '00000000-0000-0000-0000-000000000000', s.auth_id, 'authenticated', 'authenticated', s.email,
    extensions.crypt('Pilot@103', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', s.ho_ten), now(), now(), '', '', '', ''
  FROM staff s
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), s.auth_id,
  jsonb_build_object('sub', s.auth_id::text, 'email', s.email, 'email_verified', true),
  'email', s.email, now(), now(), now()
FROM staff s
WHERE NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.provider = 'email' AND i.provider_id = s.email);

INSERT INTO public.mdm_nhan_su (id, ho_ten, ma_nv, khoa_id, is_active, auth_user_id, extra_data)
SELECT gen_random_uuid(), s.ho_ten, s.ma_nv, k.id, true, s.auth_id, jsonb_build_object('email', s.email)
FROM (VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb101'::uuid, 'NV_TEST01', 'Nhân viên KSNK Thử 1', 'nv.test1@local.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb102'::uuid, 'NV_TEST02', 'Nhân viên KSNK Thử 2', 'nv.test2@local.test')
) AS s(auth_id, ma_nv, ho_ten, email)
JOIN public.mdm_dm_khoa_phong k ON k.ma_khoa = 'KSNK'
WHERE NOT EXISTS (SELECT 1 FROM public.mdm_nhan_su n WHERE n.ma_nv = s.ma_nv);

INSERT INTO public.sys_user_roles (user_id, role_id)
SELECT n.auth_user_id, r.id
FROM public.mdm_nhan_su n
JOIN public.sys_roles r ON r.name = 'NHAN_VIEN_KSNK'
WHERE n.ma_nv IN ('NV_TEST01', 'NV_TEST02')
ON CONFLICT (user_id, role_id) DO NOTHING;

COMMIT;
