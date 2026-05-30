-- Migration: 20260528000002_gstt_dashboard_v4.sql
-- Description: Tạo RPC rpc_get_compliance_dashboard_v4 thống kê tuân thủ tinh gọn, tính toán theo 4 phân vùng nguy cơ lây nhiễm IPAC (Trắng - Đỏ - Vàng - Xanh) và xếp hạng Top 10 tiêu chí vi phạm.

BEGIN;

-- =========================================================================
-- 1. DROP CÁC FUNCTION DASHBOARD V3 CŨ
-- =========================================================================
DROP FUNCTION IF EXISTS public.rpc_get_compliance_dashboard_v3(date, date, uuid[]) CASCADE;

-- =========================================================================
-- 2. TẠO FUNCTION DASHBOARD V4 TINH GỌN (SECURITY INVOKER)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_v4(
  p_tu_ngay  date,
  p_den_ngay date,
  p_khoa_id  uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_vung_nguy_co       jsonb;
  v_top_vi_pham        jsonb;
  v_summary            jsonb;
BEGIN

  -- 2.1 Thống kê Tỷ lệ tuân thủ trung bình theo 4 vùng nguy cơ vô khuẩn
  WITH vung_stats AS (
    SELECT 
      l.code as ma_khu_vuc,
      l.name as ten_khu_vuc,
      COUNT(s.id)::int as tong_so_phien,
      ROUND(AVG(s.tong_diem), 1)::numeric as ty_le_trung_binh
    FROM public.gstt_fact_chung_sessions s
    JOIN public.sys_lookup_value l ON s.khu_vuc_id = l.id
    WHERE s.is_active = true
      AND (p_khoa_id IS NULL OR s.khoa_id = p_khoa_id)
      AND (p_tu_ngay IS NULL OR s.ngay_giam_sat >= p_tu_ngay)
      AND (p_den_ngay IS NULL OR s.ngay_giam_sat <= p_den_ngay)
    GROUP BY l.code, l.name
    ORDER BY CASE l.code 
      WHEN 'TRANG' THEN 1 
      WHEN 'DO' THEN 2 
      WHEN 'VANG' THEN 3 
      WHEN 'XANH' THEN 4 ELSE 5 END
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'ma_khu_vuc',     ma_khu_vuc,
    'ten_khu_vuc',    ten_khu_vuc,
    'tong_so_phien',  tong_so_phien,
    'ty_le_trung_binh', ty_le_trung_binh
  )), '[]'::jsonb)
  INTO v_vung_nguy_co
  FROM vung_stats;

  -- 2.2 Top 10 tiêu chí vi phạm nhiều nhất (Không đạt) trong kỳ
  WITH vi_pham_stats AS (
    SELECT 
      (elem->>'criterion_id')::uuid as criterion_id,
      tc.noi_dung as criterion_label,
      COUNT(*)::int as so_lan_vi_pham
    FROM public.gstt_fact_chung_sessions s,
         jsonb_array_elements(COALESCE(s.results_jsonb, '[]'::jsonb)) elem
    JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON (elem->>'criterion_id')::uuid = tc.id
    WHERE s.is_active = true
      AND elem->>'value' = 'KHONG_DAT'
      AND (p_khoa_id IS NULL OR s.khoa_id = p_khoa_id)
      AND (p_tu_ngay IS NULL OR s.ngay_giam_sat >= p_tu_ngay)
      AND (p_den_ngay IS NULL OR s.ngay_giam_sat <= p_den_ngay)
    GROUP BY (elem->>'criterion_id')::uuid, tc.noi_dung
    ORDER BY so_lan_vi_pham DESC
    LIMIT 10
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'criterion_id',     criterion_id,
    'criterion_label',  criterion_label,
    'so_lan_vi_pham',   so_lan_vi_pham
  )), '[]'::jsonb)
  INTO v_top_vi_pham
  FROM vi_pham_stats;

  -- 2.3 Tổng hợp số liệu chung
  WITH summary_stats AS (
    SELECT 
      COUNT(s.id)::int as tong_phien,
      ROUND(AVG(s.tong_diem), 1)::numeric as ty_le_chung
    FROM public.gstt_fact_chung_sessions s
    WHERE s.is_active = true
      AND (p_khoa_id IS NULL OR s.khoa_id = p_khoa_id)
      AND (p_tu_ngay IS NULL OR s.ngay_giam_sat >= p_tu_ngay)
      AND (p_den_ngay IS NULL OR s.ngay_giam_sat <= p_den_ngay)
  )
  SELECT jsonb_build_object(
    'tong_so_phien',      COALESCE(tong_phien, 0),
    'ty_le_tuan_thu_chung', COALESCE(ty_le_chung, 0.0)
  )
  INTO v_summary
  FROM summary_stats;

  RETURN jsonb_build_object(
    'tu_ngay',          p_tu_ngay,
    'den_ngay',         p_den_ngay,
    'khoa_id',          p_khoa_id,
    'vung_nguy_co',     v_vung_nguy_co,
    'top_vi_pham',      v_top_vi_pham,
    'summary',          v_summary
  );

END;
$$;

COMMENT ON FUNCTION public.rpc_get_compliance_dashboard_v4(date, date, uuid) IS
  'Cải tổ Simplicity Phase 2: RPC thống kê tuân thủ theo 4 phân vùng nguy cơ IPAC và Top 10 tiêu chí lỗi vi phạm phổ biến nhất.';

COMMIT;
