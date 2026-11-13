-- CHƯA APPLY PROD — chờ PO.
--
-- L3b-2: sửa/xóa muộn phiên VST phải qua yêu cầu chờ chủ nhiệm khoa duyệt.
-- @dac-ta R1.24, R1.25
--  - Bảng yêu cầu: chỉ server action (service_role) đọc/ghi; không cấp cho anon/authenticated.
--  - Quyền GIAM_SAT_VST.approve cho ADMIN và CHU_NHIEM_KHOA (kèm view để đọc hàng chờ).
--  - KHÔNG gán vai trò cho tài khoản nào: gán người thật là cổng PO (màn Phân quyền).
-- Chỉ thêm, chạy lại an toàn.
-- Rollback: DROP TABLE public.gstt_fact_vst_yeu_cau_dieu_chinh;
--           DELETE FROM public.sys_permissions WHERE module_name = 'GIAM_SAT_VST' AND action = 'approve';

CREATE TABLE IF NOT EXISTS public.gstt_fact_vst_yeu_cau_dieu_chinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gstt_fact_vst_sessions(id) ON DELETE CASCADE,
  loai text NOT NULL CHECK (loai IN ('XOA', 'SUA')),
  ly_do text NOT NULL CHECK (char_length(btrim(ly_do)) >= 10),
  -- SUA: nội dung đề nghị (phiên + cơ hội) đã kiểm ở server; XOA: NULL.
  payload jsonb,
  trang_thai text NOT NULL DEFAULT 'CHO_DUYET' CHECK (trang_thai IN ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI')),
  nguoi_yeu_cau_auth_id uuid NOT NULL,
  nguoi_yeu_cau_nhan_su_id uuid REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL,
  nguoi_duyet_auth_id uuid,
  ly_do_tu_choi text,
  created_at timestamptz NOT NULL DEFAULT now(),
  xu_ly_luc timestamptz,
  CHECK (loai <> 'SUA' OR payload IS NOT NULL)
);

-- Mỗi phiên tối đa một yêu cầu đang chờ.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vst_yeu_cau_dieu_chinh_cho_duyet
  ON public.gstt_fact_vst_yeu_cau_dieu_chinh (session_id)
  WHERE trang_thai = 'CHO_DUYET';

CREATE INDEX IF NOT EXISTS idx_vst_yeu_cau_dieu_chinh_trang_thai
  ON public.gstt_fact_vst_yeu_cau_dieu_chinh (trang_thai, created_at DESC);

ALTER TABLE public.gstt_fact_vst_yeu_cau_dieu_chinh ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gstt_fact_vst_yeu_cau_dieu_chinh FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.gstt_fact_vst_yeu_cau_dieu_chinh TO service_role;

INSERT INTO public.sys_permissions (module_name, action, description)
VALUES ('GIAM_SAT_VST', 'approve', 'Duyệt yêu cầu sửa/xóa muộn phiên giám sát VST')
ON CONFLICT (module_name, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.sys_roles r
 CROSS JOIN public.sys_permissions p
 WHERE p.module_name = 'GIAM_SAT_VST'
   AND (
        (r.name = 'ADMIN' AND p.action = 'approve')
     OR (r.name = 'CHU_NHIEM_KHOA' AND p.action IN ('approve', 'view'))
   )
ON CONFLICT (role_id, permission_id) DO NOTHING;
