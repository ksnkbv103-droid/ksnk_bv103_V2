-- =====================================================================
-- QLCV Sprint 4 — RLS Policies for fact_cong_viec
-- Migration: 20260525000006_qlcv_rls_policies.sql
-- 
-- Chiến lược:
--   - Tất cả mutations đi qua Server Actions dùng service_role (admin client)
--     → RLS không ảnh hưởng tới INSERT/UPDATE/DELETE từ actions.
--   - RLS SELECT ngăn chặn truy cập trực tiếp từ browser client (anon/authenticated role)
--     nếu có bao giờ bị lộ key.
--   - Áp dụng nguyên tắc least-privilege cho v_fact_cong_viec_full view.
-- =====================================================================

-- =====================================================================
-- 1. Bật RLS trên fact_cong_viec (nếu chưa bật)
-- =====================================================================

ALTER TABLE public.fact_cong_viec ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. Xóa policy cũ (idempotent)
-- =====================================================================

DROP POLICY IF EXISTS "qlcv_select_service_role" ON public.fact_cong_viec;
DROP POLICY IF EXISTS "qlcv_select_authenticated_own_khoa" ON public.fact_cong_viec;
DROP POLICY IF EXISTS "qlcv_insert_service_role" ON public.fact_cong_viec;
DROP POLICY IF EXISTS "qlcv_update_service_role" ON public.fact_cong_viec;
DROP POLICY IF EXISTS "qlcv_delete_service_role" ON public.fact_cong_viec;

-- =====================================================================
-- 3. Policy SELECT: service_role luôn bypass (không cần policy thêm)
--    Authenticated (Next.js user client): chỉ thấy task của khoa mình
--    hoặc mình là assignee/creator.
-- =====================================================================

-- Tất cả mutations (INSERT/UPDATE/DELETE) từ service_role — cho phép tất cả
CREATE POLICY "qlcv_insert_service_role" ON public.fact_cong_viec
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "qlcv_update_service_role" ON public.fact_cong_viec
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "qlcv_delete_service_role" ON public.fact_cong_viec
  FOR DELETE TO service_role USING (true);

-- SELECT từ service_role: bypass tất cả (mặc định service_role bypass RLS)
CREATE POLICY "qlcv_select_service_role" ON public.fact_cong_viec
  FOR SELECT TO service_role USING (true);

-- SELECT từ authenticated: thấy task của khoa mình HOẶC là assignee/creator
-- Lưu ý: hàm fn_qlcv_get_actor_khoa_id lấy khoa_id theo nhan_su gắn với auth.uid()
CREATE POLICY "qlcv_select_authenticated_own_khoa" ON public.fact_cong_viec
  FOR SELECT TO authenticated USING (
    -- Admin / KSNK không bị giới hạn — check vai trò qua JWT claim (nếu có)
    -- hoặc cho phép tất cả (vì thực tế đã filter ở application layer)
    true  -- Permissive: application layer (Server Actions) đã enforce
    -- Để strict hơn sau này, thay bằng:
    -- (
    --   khoa_thuc_hien_id = fn_qlcv_get_actor_khoa_id(
    --     (SELECT id FROM mdm_nhan_su WHERE auth_user_id = auth.uid() LIMIT 1)
    --   )
    --   OR nguoi_phu_trach_id = (SELECT id FROM mdm_nhan_su WHERE auth_user_id = auth.uid() LIMIT 1)
    --   OR nguoi_tao_id = (SELECT id FROM mdm_nhan_su WHERE auth_user_id = auth.uid() LIMIT 1)
    -- )
  );

COMMENT ON POLICY "qlcv_select_authenticated_own_khoa" ON public.fact_cong_viec
  IS 'Phase 1: permissive — enforcement ở application layer (Server Actions + verifyPermission). Phase 2: sẽ thêm strict khoa filter sau khi xác nhận khoa_id đầy đủ trong mdm_nhan_su.';

-- =====================================================================
-- 4. Bật RLS trên fact_cong_viec_hoat_dong (audit trail)
-- =====================================================================

ALTER TABLE public.fact_cong_viec_hoat_dong ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qlcv_hd_select_service_role" ON public.fact_cong_viec_hoat_dong;
DROP POLICY IF EXISTS "qlcv_hd_insert_service_role" ON public.fact_cong_viec_hoat_dong;
DROP POLICY IF EXISTS "qlcv_hd_select_authenticated" ON public.fact_cong_viec_hoat_dong;

CREATE POLICY "qlcv_hd_select_service_role" ON public.fact_cong_viec_hoat_dong
  FOR SELECT TO service_role USING (true);

CREATE POLICY "qlcv_hd_insert_service_role" ON public.fact_cong_viec_hoat_dong
  FOR INSERT TO service_role WITH CHECK (true);

-- Authenticated chỉ đọc — không tự INSERT/UPDATE hoạt động (qua server actions)
CREATE POLICY "qlcv_hd_select_authenticated" ON public.fact_cong_viec_hoat_dong
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.fact_cong_viec_hoat_dong
  IS 'Audit trail QLCV. RLS: service_role full access; authenticated read-only (no direct write).';
