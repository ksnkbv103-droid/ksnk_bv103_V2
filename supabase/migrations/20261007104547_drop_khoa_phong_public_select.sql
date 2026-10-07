-- Bỏ SELECT public trên mdm_dm_khoa_phong (policy áp cho anon).
-- Giữ "Authenticated users can read dm_khoa_phong" USING (true) cho JWT đã đăng nhập.
DROP POLICY IF EXISTS "Users can read own department" ON public.mdm_dm_khoa_phong;
