-- RPC lấy bảng tổng hợp chuyên đề giám sát (Sử dụng cho tab Overview)
DROP FUNCTION IF EXISTS public.rpc_get_dashboard_summary_table(date, date, uuid[], uuid[]);

CREATE OR REPLACE FUNCTION "public"."rpc_get_dashboard_summary_table"(
  "p_tu_ngay" "date", "p_den_ngay" "date", 
  "p_khoi_ids" "uuid"[] DEFAULT NULL, "p_khoa_ids" "uuid"[] DEFAULT NULL
) RETURNS json LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Tạo bảng tạm chứa tất cả sessions đã lọc theo thời gian và đơn vị
  CREATE TEMP TABLE _all_sess ON COMMIT DROP AS
    -- Sessions VST
    SELECT 
      'VST_WHO' as ma_bk, 'Vệ sinh tay (WHO)' as ten_bk,
      CASE 
        WHEN (k_ns.ma_khoa IN ('KSNK','C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') 
             AND (k_t.ma_khoa NOT IN ('KSNK','C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
        WHEN ((k_ns.ma_khoa IN ('KSNK','C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_t.ma_khoa IN ('KSNK','C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
             OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END as stype
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY(p_khoi_ids))
    
    UNION ALL
    
    -- Sessions Giám sát chung
    SELECT 
      s.loai_bang_kiem as ma_bk, COALESCE(dbk.ten_bang_kiem, s.loai_bang_kiem) as ten_bk,
      CASE 
        WHEN (k_ns.ma_khoa IN ('KSNK','C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') 
             AND (k_t.ma_khoa NOT IN ('KSNK','C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
        WHEN ((k_ns.ma_khoa IN ('KSNK','C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_t.ma_khoa IN ('KSNK','C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
             OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END as stype
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.dm_bang_kiem dbk ON s.loai_bang_kiem = dbk.ma_bk
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY(p_khoi_ids));

  -- Tổng hợp kết quả
  SELECT jsonb_agg(t) INTO v_result FROM (
    SELECT 
      ma_bk, ten_bk,
      count(*) as tong,
      count(*) FILTER (WHERE stype = 'KSNK') as ksnk,
      count(*) FILTER (WHERE stype = 'TU_GIAM_SAT') as tu_gs,
      count(*) FILTER (WHERE stype = 'CHEO') as cheo
    FROM _all_sess
    GROUP BY ma_bk, ten_bk
    ORDER BY tong DESC
  ) t;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
