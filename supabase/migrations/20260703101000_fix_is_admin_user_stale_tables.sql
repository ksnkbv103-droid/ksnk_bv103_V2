-- Sửa lỗi tồn đọng phát hiện khi kiểm quyền theo vai (G-11):
-- is_admin_user() còn tham chiếu public.user_roles / public.roles (đã đổi tên thành
-- sys_user_roles / sys_roles từ baseline). Hậu quả: user non-admin truy vấn bảng có
-- policy chứa subquery vào sys_user_roles (vd "Admin full access") sẽ lỗi
-- 'relation "public.user_roles" does not exist' vì RLS sys_user_roles gọi hàm này.
-- App dùng service_role nên không lộ lỗi; chỉ lộ khi truy cập bằng authenticated.
-- Rollback: khôi phục thân hàm cũ (tham chiếu user_roles/roles) — không khuyến nghị.

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sys_user_roles ur
    JOIN public.sys_roles r ON r.id = ur.role_id
    WHERE ur.user_id = COALESCE(p_user_id, auth.uid())
      AND r.name = 'ADMIN'
  );
$$;
