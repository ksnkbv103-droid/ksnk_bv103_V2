-- Migration: Mở rộng RLS additive cho 6 bảng master-data CSSD còn lại.
-- Date: 26/05/2026 (Phase A — đóng admin module).
--
-- Bối cảnh:
-- - Migration 20260526000005 + _000006 đã RLS cho 10 admin core (sys_*, mdm_dm_khoa_phong,
--   mdm_nhan_su, gstt_dm_bang_kiem).
-- - Probe 26/05 cho thấy còn 6 bảng vật lý master-data CSSD chưa có RLS đầy đủ:
--     · cssd_dm_thiet_bi (ENABLE RLS nhưng KHÔNG policy → đang block auth read)
--     · cssd_dm_hoa_chat (có policy ALL admin + SELECT all, không có insert/update/delete chặt)
--     · cssd_dm_loai_dung_cu (RLS chưa enable)
--     · cssd_dm_bo_dung_cu, cssd_dm_bo_dung_cu_chi_tiet (chỉ có SELECT v1, thiếu IUD)
--     · cssd_dm_bo_phan_bo (RLS chưa enable)
--
-- Mapping module ↔ bảng (theo sys_permissions hiện có):
--   THIET_BI         → cssd_dm_thiet_bi
--   HOA_CHAT         → cssd_dm_hoa_chat
--   LOAI_DC          → cssd_dm_loai_dung_cu
--   BO_DC            → cssd_dm_bo_dung_cu, cssd_dm_bo_dung_cu_chi_tiet
--   CSSD_KHO_DUNGCU  → cssd_dm_bo_phan_bo
--
-- Policy thêm vào là ADDITIVE (PERMISSIVE OR) — tồn tại song song với policy v1 cũ.
-- Service_role bypass RLS qua attribute BYPASSRLS → app dùng createAdminSupabaseClient
-- không bị ảnh hưởng. Khi app chuyển sang user client (làm sau), policy mới sẽ là gate chính.

DO $$
DECLARE
  v_pair jsonb;
  v_pairs jsonb := jsonb_build_array(
    jsonb_build_array('public.cssd_dm_thiet_bi',            'THIET_BI'),
    jsonb_build_array('public.cssd_dm_hoa_chat',            'HOA_CHAT'),
    jsonb_build_array('public.cssd_dm_loai_dung_cu',        'LOAI_DC'),
    jsonb_build_array('public.cssd_dm_bo_dung_cu',          'BO_DC'),
    jsonb_build_array('public.cssd_dm_bo_dung_cu_chi_tiet', 'BO_DC'),
    jsonb_build_array('public.cssd_dm_bo_phan_bo',          'CSSD_KHO_DUNGCU')
  );
BEGIN
  FOR v_pair IN SELECT jsonb_array_elements(v_pairs) LOOP
    BEGIN
      PERFORM public.fn_sys_attach_admin_rls(
        (v_pair->>0)::regclass,
        (v_pair->>1)
      );
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '[rls-expand] Bảng % không tồn tại, bỏ qua', v_pair->>0;
      WHEN OTHERS THEN
        RAISE NOTICE '[rls-expand] Lỗi % : %', v_pair->>0, SQLERRM;
    END;
  END LOOP;
END $$;
