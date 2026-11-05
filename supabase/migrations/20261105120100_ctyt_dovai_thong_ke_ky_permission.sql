-- Migration: 20261105120100_ctyt_dovai_thong_ke_ky_permission.sql
-- Lát B1 / việc 2. rpc_ctyt_dovai_thong_ke_ky (20261105110000) là SECURITY DEFINER, GRANT authenticated, không kiểm quyền
-- → mọi user đăng nhập (kể cả không có quyền module) đọc được số liệu toàn viện, vượt RLS của 3 bảng ctyt_dovai_*.
-- Chọn phương án kiểm quyền trong hàm (không REVOKE authenticated) vì: đây là RPC chỉ đọc phục vụ dashboard/báo cáo,
-- khớp mẫu RPC SECURITY DEFINER client-callable trong repo (20260908235742, 20261004013016: bỏ qua khi
-- auth.role()='service_role', còn lại fn_sys_is_admin() OR fn_sys_has_permission(module, action)) và cùng điều kiện
-- với RLS SELECT của bảng (HAU_CAN_MOI_TRUONG). Mẫu REVOKE→service_role của repo dành cho RPC GHI nhận p_actor (QLCV).
-- Không quyền → trả {"error": ...} (cùng dạng lỗi khoảng ngày sẵn có), không raise. Thân hàm còn lại giữ nguyên.
-- Giữ chữ ký (date, date) RETURNS jsonb.

CREATE OR REPLACE FUNCTION public.rpc_ctyt_dovai_thong_ke_ky(
  p_tu_ngay date,
  p_den_ngay date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res jsonb;
  v_kg_sac_nhon numeric := 0;
  v_kg_con_lai numeric := 0;
  v_kg_thong_thuong numeric := 0;
  v_tong_ctln numeric := 0;
  v_tong_ct numeric := 0;
  v_ty_le_ctln numeric := 0;
  
  v_kg_ban_thuong numeric := 0;
  v_kg_ban_ln numeric := 0;
  v_tong_ban numeric := 0;
  v_ty_le_ban_ln numeric := 0;
  v_kg_sach_ve numeric := 0;
  v_chenh_lech numeric := 0;
  v_ty_le_chenh_lech numeric := 0;
  
  v_tong_ngay_giuong numeric := 0;
  v_ct_rate_1000 numeric := 0;
  v_dv_rate_1000 numeric := 0;
  
  v_so_ngay_ky int := 0;
  v_so_ngay_co_du_lieu int := 0;
  v_ty_le_day_du numeric := 0;
  
  v_su_co_chat_thai_count int := 0;
  v_su_co_do_vai_count int := 0;
  v_su_co_sac_nhon_count int := 0;
BEGIN
  -- B1: kiểm quyền (mẫu 20260908235742): service_role (admin client) bỏ qua; client phải có HAU_CAN_MOI_TRUONG:view.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RETURN jsonb_build_object('error', 'Chưa đăng nhập.');
    END IF;
    IF NOT (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'view')) THEN
      RETURN jsonb_build_object('error', 'Không đủ quyền xem thống kê chất thải / đồ vải.');
    END IF;
  END IF;

  IF p_tu_ngay IS NULL OR p_den_ngay IS NULL OR p_tu_ngay > p_den_ngay THEN
    RETURN jsonb_build_object('error', 'Khoảng ngày không hợp lệ');
  END IF;

  v_so_ngay_ky := (p_den_ngay - p_tu_ngay) + 1;

  -- 1. Tổng hợp số cân
  SELECT
    COALESCE(SUM(CASE WHEN loai_muc = 'CT_LAY_NHIEM_SAC_NHON' THEN khoi_luong_kg ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN loai_muc = 'CT_LAY_NHIEM_CON_LAI' THEN khoi_luong_kg ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN loai_muc = 'CT_THONG_THUONG' THEN khoi_luong_kg ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN loai_muc = 'DO_VAI_BAN_THUONG' THEN khoi_luong_kg ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN loai_muc = 'DO_VAI_BAN_LAY_NHIEM' THEN khoi_luong_kg ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN loai_muc = 'DO_VAI_SACH_VE' THEN khoi_luong_kg ELSE 0 END), 0),
    COUNT(DISTINCT ngay_can)
  INTO
    v_kg_sac_nhon,
    v_kg_con_lai,
    v_kg_thong_thuong,
    v_kg_ban_thuong,
    v_kg_ban_ln,
    v_kg_sach_ve,
    v_so_ngay_co_du_lieu
  FROM public.ctyt_dovai_fact_so_can
  WHERE is_active = true
    AND ngay_can BETWEEN p_tu_ngay AND p_den_ngay;

  v_tong_ctln := v_kg_sac_nhon + v_kg_con_lai;
  v_tong_ct := v_tong_ctln + v_kg_thong_thuong;
  IF v_tong_ct > 0 THEN
    v_ty_le_ctln := ROUND((v_tong_ctln / v_tong_ct) * 100, 2);
  END IF;

  v_tong_ban := v_kg_ban_thuong + v_kg_ban_ln;
  IF v_tong_ban > 0 THEN
    v_ty_le_ban_ln := ROUND((v_kg_ban_ln / v_tong_ban) * 100, 2);
    v_chenh_lech := v_tong_ban - v_kg_sach_ve;
    v_ty_le_chenh_lech := ROUND((v_chenh_lech / v_tong_ban) * 100, 2);
  END IF;

  IF v_so_ngay_ky > 0 THEN
    v_ty_le_day_du := ROUND((v_so_ngay_co_du_lieu::numeric / v_so_ngay_ky::numeric) * 100, 1);
  END IF;

  -- 2. Ngày giường từ danh mục mẫu số theo các tháng giao thoa
  SELECT COALESCE(SUM(
    so_ngay_giuong * (
      -- Tỷ lệ ngày của tháng nằm trong khoảng lọc
      LEAST(p_den_ngay, (make_date(nam, thang, 1) + interval '1 month - 1 day')::date) - 
      GREATEST(p_tu_ngay, make_date(nam, thang, 1)) + 1
    )::numeric / EXTRACT(DAY FROM (make_date(nam, thang, 1) + interval '1 month - 1 day'))::numeric
  ), 0)
  INTO v_tong_ngay_giuong
  FROM public.ctyt_dovai_dm_ngay_giuong
  WHERE make_date(nam, thang, 1) <= p_den_ngay
    AND (make_date(nam, thang, 1) + interval '1 month - 1 day')::date >= p_tu_ngay;

  IF v_tong_ngay_giuong > 0 THEN
    v_ct_rate_1000 := ROUND((v_tong_ct / v_tong_ngay_giuong) * 1000, 2);
    v_dv_rate_1000 := ROUND((v_tong_ban / v_tong_ngay_giuong) * 1000, 2);
  END IF;

  -- 3. Tổng hợp sự cố
  SELECT
    COUNT(*) FILTER (WHERE phan_he = 'CHAT_THAI'),
    COUNT(*) FILTER (WHERE phan_he = 'DO_VAI'),
    COUNT(*) FILTER (WHERE loai_su_co = 'LAN_SAC_NHON_DO_VAI')
  INTO
    v_su_co_chat_thai_count,
    v_su_co_do_vai_count,
    v_su_co_sac_nhon_count
  FROM public.ctyt_dovai_fact_su_co
  WHERE is_active = true
    AND ngay_ghi_nhan BETWEEN p_tu_ngay AND p_den_ngay;

  RETURN jsonb_build_object(
    'tu_ngay', p_tu_ngay,
    'den_ngay', p_den_ngay,
    'so_ngay_ky', v_so_ngay_ky,
    'so_ngay_co_du_lieu', v_so_ngay_co_du_lieu,
    'ty_le_day_du_pct', v_ty_le_day_du,
    'tong_ngay_giuong', v_tong_ngay_giuong,
    'chat_thai', jsonb_build_object(
      'kg_sac_nhon', v_kg_sac_nhon,
      'kg_con_lai', v_kg_con_lai,
      'kg_thong_thuong', v_kg_thong_thuong,
      'tong_ctln_kg', v_tong_ctln,
      'tong_chat_thai_kg', v_tong_ct,
      'ty_le_ctln_pct', v_ty_le_ctln,
      'chat_thai_per_1000_ngay_giuong', v_ct_rate_1000,
      'so_su_co', v_su_co_chat_thai_count
    ),
    'do_vai', jsonb_build_object(
      'kg_ban_thuong', v_kg_ban_thuong,
      'kg_ban_lay_nhiem', v_kg_ban_ln,
      'tong_ban_kg', v_tong_ban,
      'ty_le_ban_ln_pct', v_ty_le_ban_ln,
      'kg_sach_ve', v_kg_sach_ve,
      'chenh_lech_kg', v_chenh_lech,
      'ty_le_chenh_lech_pct', v_ty_le_chenh_lech,
      'do_vai_per_1000_ngay_giuong', v_dv_rate_1000,
      'so_su_co_chung', v_su_co_do_vai_count,
      'so_su_co_sac_nhon', v_su_co_sac_nhon_count
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_ctyt_dovai_thong_ke_ky(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_ctyt_dovai_thong_ke_ky(date, date) TO authenticated, service_role;

-- CHƯA APPLY PROD — chờ PO. Phụ thuộc 20261105110000.
-- Kiểm prod (chỉ đọc): hàm có guard + anon không EXECUTE (mong đợi t|f):
--   SELECT pg_get_functiondef('public.rpc_ctyt_dovai_thong_ke_ky(date,date)'::regprocedure) LIKE '%fn_sys_has_permission(''HAU_CAN_MOI_TRUONG'', ''view'')%',
--          has_function_privilege('anon', 'public.rpc_ctyt_dovai_thong_ke_ky(date,date)', 'EXECUTE');
