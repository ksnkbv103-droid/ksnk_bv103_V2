-- Migration Rollback: Revert all changes from 20260608030000_khu_vuc_constraints_and_naming
-- Restores all 24 lookup values, original names, view structure, and RPC behavior.

BEGIN;

-- 1. Revert the view public.gstt_dm_khu_vuc_giam_sat (we keep metadata column to avoid pg drop column view error)
CREATE OR REPLACE VIEW public.gstt_dm_khu_vuc_giam_sat WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_khu_vuc,
    name AS ten_khu_vuc,
    is_active,
    created_at,
    updated_at,
    metadata ->> 'nhom_mau' AS nhom_mau,
    COALESCE((metadata ->> 'thu_tu')::integer, 999) AS thu_tu,
    metadata
   FROM public.sys_lookup_value
  WHERE category_type = 'KHU_VUC_GIAM_SAT';

-- 2. Restore all 24 lookup values to original names, descriptions and active status
DELETE FROM public.sys_lookup_value WHERE category_type = 'KHU_VUC_GIAM_SAT';

INSERT INTO public.sys_lookup_value (id, category_type, code, name, description, is_active, metadata)
VALUES
  ('c1010001-0000-4000-8000-000000000001', 'KHU_VUC_GIAM_SAT', 'KV_TR_ICU_SACH', 'ICU sạch / ICU chuyên sâu',
   'ICU có yêu cầu vô khuẩn cao; không dùng cho ICU hồi sức thông thường.', true,
   '{"nhom_mau":"TR","thu_tu":101}'::jsonb),
  ('c1010002-0000-4000-8000-000000000002', 'KHU_VUC_GIAM_SAT', 'KV_TR_NB_MIEN_DICH', 'Khu NB suy giảm miễn dịch',
   'Ung thư, ghép tủy, bỏng, sơ sinh non tháng và NB suy giảm miễn dịch.', true,
   '{"nhom_mau":"TR","thu_tu":102}'::jsonb),
  ('c1010003-0000-4000-8000-000000000003', 'KHU_VUC_GIAM_SAT', 'KV_TR_PHONG_MO', 'Phòng mổ',
   'Phòng phẫu thuật có yêu cầu vô khuẩn/aseptic.', true,
   '{"nhom_mau":"TR","thu_tu":103}'::jsonb),
  ('c1010004-0000-4000-8000-000000000004', 'KHU_VUC_GIAM_SAT', 'KV_TR_PHONG_SINH', 'Phòng sinh',
   'Phòng đỡ đẻ, sinh mổ có yêu cầu vô khuẩn.', true,
   '{"nhom_mau":"TR","thu_tu":104}'::jsonb),
  ('c1010005-0000-4000-8000-000000000005', 'KHU_VUC_GIAM_SAT', 'KV_TR_CAN_THIEP', 'Phòng can thiệp mạch',
   'Buồng can thiệp nội mạch, thủ thuật mạch máu có yêu cầu vô khuẩn.', true,
   '{"nhom_mau":"TR","thu_tu":105}'::jsonb),
  ('c1010006-0000-4000-8000-000000000006', 'KHU_VUC_GIAM_SAT', 'KV_TR_THU_THUAT_SACH', 'Phòng thay băng sạch / thủ thuật vô khuẩn',
   'Thay băng vết mổ sạch, thủ thuật có yêu cầu vô khuẩn.', true,
   '{"nhom_mau":"TR","thu_tu":106}'::jsonb),
  ('c1010007-0000-4000-8000-000000000007', 'KHU_VUC_GIAM_SAT', 'KV_TR_CSSD_SACH', 'Trung tâm tiệt khuẩn — khu sạch',
   'Khu đóng gói, khu sạch sau tiệt khuẩn; không phải khu tiếp nhận/rửa bẩn.', true,
   '{"nhom_mau":"TR","thu_tu":107}'::jsonb),
  ('c1010008-0000-4000-8000-000000000008', 'KHU_VUC_GIAM_SAT', 'KV_TR_PHA_CHE', 'Pha chế dịch / thuốc vô khuẩn',
   'Đơn vị pha chế thuốc tập trung, pha chế dịch vô khuẩn.', true,
   '{"nhom_mau":"TR","thu_tu":108}'::jsonb),

  ('c1020001-0000-4000-8000-000000000001', 'KHU_VUC_GIAM_SAT', 'KV_DO_ICU_CHUNG', 'ICU chung (hồi sức thường)',
   'ICU hồi sức tích cực không thuộc nhóm vô khuẩn cao (Trắng).', true,
   '{"nhom_mau":"DO","thu_tu":201}'::jsonb),
  ('c1020002-0000-4000-8000-000000000002', 'KHU_VUC_GIAM_SAT', 'KV_DO_LOC_MAU', 'Khu lọc máu',
   'Đơn vị/chức năng lọc máu, chạy thận nhân tạo.', true,
   '{"nhom_mau":"DO","thu_tu":202}'::jsonb),
  ('c1020003-0000-4000-8000-000000000003', 'KHU_VUC_GIAM_SAT', 'KV_DO_CAP_CUU', 'Khu cấp cứu',
   'Khu cấp cứu, hồi sức cấp cứu có tiếp xúc máu/dịch cơ thể.', true,
   '{"nhom_mau":"DO","thu_tu":203}'::jsonb),
  ('c1020004-0000-4000-8000-000000000004', 'KHU_VUC_GIAM_SAT', 'KV_DO_CACH_LY', 'Tiếp nhận / cách ly truyền nhiễm',
   'NB truyền nhiễm theo quy định (cúm, SARS-CoV-2, sởi…).', true,
   '{"nhom_mau":"DO","thu_tu":204}'::jsonb),
  ('c1020005-0000-4000-8000-000000000005', 'KHU_VUC_GIAM_SAT', 'KV_DO_DA_KHANG', 'Khu điều trị NB đa kháng kháng sinh',
   'NB mang hoặc nghi ngờ vi sinh vật đa kháng kháng sinh.', true,
   '{"nhom_mau":"DO","thu_tu":205}'::jsonb),
  ('c1020006-0000-4000-8000-000000000006', 'KHU_VUC_GIAM_SAT', 'KV_DO_CSSD_BAN', 'Trung tâm tiệt khuẩn — khu bẩn',
   'Khu tiếp nhận, rửa sơ bộ, xử lý ban đầu dụng cụ bẩn trước tiệt khuẩn.', true,
   '{"nhom_mau":"DO","thu_tu":206}'::jsonb),
  ('c1020007-0000-4000-8000-000000000007', 'KHU_VUC_GIAM_SAT', 'KV_DO_CHAT_THAI', 'Khu lưu chất thải y tế tạm',
   'Khu tạm giữ rác y tế, chất thải lây nhiễm.', true,
   '{"nhom_mau":"DO","thu_tu":207}'::jsonb),
  ('c1020008-0000-4000-8000-000000000008', 'KHU_VUC_GIAM_SAT', 'KV_DO_VE_SINH', 'Nhà vệ sinh thuộc khu nguy cơ cao',
   'WC thuộc khu lây nhiễm cao (bồn cầu, bồn tiểu, sàn nhà vệ sinh).', true,
   '{"nhom_mau":"DO","thu_tu":208}'::jsonb),

  ('c1030001-0000-4000-8000-000000000001', 'KHU_VUC_GIAM_SAT', 'KV_VA_NOI_TRU', 'Buồng bệnh nội trú thông thường',
   'Nội, ngoại, sản, nhi và phòng lâm sàng thông thường.', true,
   '{"nhom_mau":"VA","thu_tu":301}'::jsonb),
  ('c1030002-0000-4000-8000-000000000002', 'KHU_VUC_GIAM_SAT', 'KV_VA_KHAM_TT', 'Phòng khám / buồng thủ thuật',
   'Khám bệnh, thủ thuật lâm sàng không thuộc vô khuẩn cao.', true,
   '{"nhom_mau":"VA","thu_tu":302}'::jsonb),
  ('c1030003-0000-4000-8000-000000000003', 'KHU_VUC_GIAM_SAT', 'KV_VA_CDHA', 'Chẩn đoán hình ảnh',
   'X-quang, siêu âm, CT/MRI tại khu tiếp xúc NB.', true,
   '{"nhom_mau":"VA","thu_tu":303}'::jsonb),
  ('c1030004-0000-4000-8000-000000000004', 'KHU_VUC_GIAM_SAT', 'KV_VA_XET_NGHIEM', 'Khu xét nghiệm lâm sàng',
   'Phòng lấy mẫu và xét nghiệm tiếp xúc NB.', true,
   '{"nhom_mau":"VA","thu_tu":304}'::jsonb),
  ('c1030005-0000-4000-8000-000000000005', 'KHU_VUC_GIAM_SAT', 'KV_VA_VE_SINH', 'WC & khu giữ đồ bẩn khoa lâm sàng',
   'Nhà vệ sinh buồng bệnh, khu giữ đồ bẩn.', true,
   '{"nhom_mau":"VA","thu_tu":305}'::jsonb),
  ('c1030006-0000-4000-8000-000000000006', 'KHU_VUC_GIAM_SAT', 'KV_VA_BE_MAT_TBYT', 'Bề mặt TBYT tiếp xúc gần NB',
   'Giường, monitor, tay vịn và thiết bị tiếp xúc gần NB.', true,
   '{"nhom_mau":"VA","thu_tu":306}'::jsonb),

  ('c1040001-0000-4000-8000-000000000001', 'KHU_VUC_GIAM_SAT', 'KV_XA_HANH_CHINH', 'Khu hành chính / văn phòng',
   'Văn phòng, giao ban, phòng họp, buồng hành chính.', true,
   '{"nhom_mau":"XA","thu_tu":401}'::jsonb),
  ('c1040002-0000-4000-8000-000000000002', 'KHU_VUC_GIAM_SAT', 'KV_XA_SANH_CHO', 'Sảnh, hành lang, buồng chờ',
   'Quầy tiếp đón, sảnh, hành lang, khu chờ người nhà.', true,
   '{"nhom_mau":"XA","thu_tu":402}'::jsonb),
  ('c1040003-0000-4000-8000-000000000003', 'KHU_VUC_GIAM_SAT', 'KV_XA_NHAN_VIEN', 'Buồng nhân viên nội bộ',
   'Phòng nghỉ ca, buồng nhân viên.', true,
   '{"nhom_mau":"XA","thu_tu":403}'::jsonb),
  ('c1040004-0000-4000-8000-000000000004', 'KHU_VUC_GIAM_SAT', 'KV_XA_NHA_AN', 'Nhà ăn / khu ăn uống',
   'Khu ăn nhân viên hoặc công cộng (không khu NB).', true,
   '{"nhom_mau":"XA","thu_tu":404}'::jsonb),
  ('c1040005-0000-4000-8000-000000000005', 'KHU_VUC_GIAM_SAT', 'KV_XA_BE_MAT', 'Bề mặt công cộng không tiếp xúc NB',
   'Tay vịn hành lang, cửa… không phơi nhiễm máu/dịch, không tiếp xúc NB trực tiếp.', true,
   '{"nhom_mau":"XA","thu_tu":405}'::jsonb);

-- 3. Recreate the RPC function public.rpc_get_registry_options to select original fields (no metadata)
CREATE OR REPLACE FUNCTION public.rpc_get_registry_options(p_categories text[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO public, pg_catalog
    AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_cat TEXT;
BEGIN
  FOREACH v_cat IN ARRAY p_categories LOOP
    CASE v_cat
      WHEN 'KHOA_PHONG' THEN
        v_result := v_result || jsonb_build_object('KHOA_PHONG', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_khoa AS ten, ma_khoa AS ma
              FROM public.mdm_dm_khoa_phong WHERE is_active = true
          ) t
        ));
      WHEN 'NGHE_NGHIEP' THEN
        v_result := v_result || jsonb_build_object('NGHE_NGHIEP', (
          SELECT json_agg(t ORDER BY t.thu_tu, t.ten) FROM (
            SELECT id, name AS ten, code AS ma,
                   COALESCE((metadata ->> 'thu_tu')::integer, 999) AS thu_tu
              FROM public.sys_lookup_value
             WHERE category_type = 'NGHE_NGHIEP' AND is_active = true
          ) t
        ));
      WHEN 'CHUC_VU' THEN
        v_result := v_result || jsonb_build_object('CHUC_VU', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_chuc_vu AS ten FROM public.mdm_dm_chuc_vu WHERE is_active = true
          ) t
        ));
      WHEN 'TO_CONG_TAC' THEN
        v_result := v_result || jsonb_build_object('TO_CONG_TAC', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_to AS ten FROM public.mdm_dm_to_cong_tac WHERE is_active = true
          ) t
        ));
      WHEN 'CHUC_DANH' THEN
        v_result := v_result || jsonb_build_object('CHUC_DANH', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_chuc_danh AS ten FROM public.mdm_dm_chuc_danh WHERE is_active = true
          ) t
        ));
      WHEN 'ROLE' THEN
        v_result := v_result || jsonb_build_object('ROLE', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, name AS ten FROM public.sys_roles
          ) t
        ));
      WHEN 'LOAI_DUNG_CU' THEN
        v_result := v_result || jsonb_build_object('LOAI_DUNG_CU', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_loai_dung_cu AS ten, ma_loai_dung_cu AS ma
              FROM public.cssd_dm_loai_dung_cu WHERE is_active = true
          ) t
        ));
      WHEN 'BO_DUNG_CU' THEN
        v_result := v_result || jsonb_build_object('BO_DUNG_CU', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_bo AS ten, ma_bo AS ma FROM public.cssd_dm_bo_dung_cu WHERE is_active = true
          ) t
        ));
      WHEN 'KHU_VUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('KHU_VUC_GIAM_SAT', (
          SELECT json_agg(t ORDER BY t.thu_tu, t.ten) FROM (
            SELECT id, ten_khu_vuc AS ten, ma_khu_vuc AS ma, nhom_mau, thu_tu
              FROM public.gstt_dm_khu_vuc_giam_sat WHERE is_active = true
          ) t
        ));
      WHEN 'HINH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('HINH_THUC_GIAM_SAT', (
          SELECT json_agg(t ORDER BY t.thu_tu, t.ten) FROM (
            SELECT id, name AS ten, code AS ma,
                   COALESCE((metadata ->> 'thu_tu')::integer, 999) AS thu_tu
              FROM public.sys_lookup_value
             WHERE category_type = 'HINH_THUC_GIAM_SAT' AND is_active = true
          ) t
        ));
      WHEN 'CACH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('CACH_THUC_GIAM_SAT', (
          SELECT json_agg(t ORDER BY t.thu_tu, t.ten) FROM (
            SELECT id, name AS ten, code AS ma,
                   COALESCE((metadata ->> 'thu_tu')::integer, 999) AS thu_tu
              FROM public.sys_lookup_value
             WHERE category_type = 'CACH_THUC_GIAM_SAT' AND is_active = true
          ) t
        ));
      ELSE
        NULL;
    END CASE;
  END LOOP;
  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
