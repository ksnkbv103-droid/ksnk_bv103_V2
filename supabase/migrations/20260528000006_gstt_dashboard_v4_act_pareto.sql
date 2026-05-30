-- Extend dashboard v4: Pareto mã ACT từ phieu_phan_tich_jsonb (ghi nhận, không workflow)
BEGIN;

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
  v_top_hanh_dong_act  jsonb;
  v_summary            jsonb;
BEGIN

  WITH vung_stats AS (
    SELECT
      l.code AS ma_khu_vuc,
      l.name AS ten_khu_vuc,
      COUNT(s.id)::int AS tong_so_phien,
      ROUND(AVG(s.tong_diem), 1)::numeric AS ty_le_trung_binh
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
    'ma_khu_vuc', ma_khu_vuc,
    'ten_khu_vuc', ten_khu_vuc,
    'tong_so_phien', tong_so_phien,
    'ty_le_trung_binh', ty_le_trung_binh
  )), '[]'::jsonb)
  INTO v_vung_nguy_co
  FROM vung_stats;

  WITH vi_pham_stats AS (
    SELECT
      (elem->>'criterion_id')::uuid AS criterion_id,
      tc.noi_dung AS criterion_label,
      COUNT(*)::int AS so_lan_vi_pham
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
    'criterion_id', criterion_id,
    'criterion_label', criterion_label,
    'so_lan_vi_pham', so_lan_vi_pham
  )), '[]'::jsonb)
  INTO v_top_vi_pham
  FROM vi_pham_stats;

  WITH act_stats AS (
    SELECT
      act.elem->>'action_code' AS action_code,
      COUNT(*)::int AS so_lan_ghi_nhan
    FROM public.gstt_fact_chung_sessions s,
         jsonb_array_elements(COALESCE(s.phieu_phan_tich_jsonb->'hanh_dong_khac_phuc', '[]'::jsonb)) act(elem)
    WHERE s.is_active = true
      AND COALESCE((act.elem->>'da_chon')::boolean, false) = true
      AND COALESCE(act.elem->>'action_code', '') <> ''
      AND (p_khoa_id IS NULL OR s.khoa_id = p_khoa_id)
      AND (p_tu_ngay IS NULL OR s.ngay_giam_sat >= p_tu_ngay)
      AND (p_den_ngay IS NULL OR s.ngay_giam_sat <= p_den_ngay)
    GROUP BY act.elem->>'action_code'
    ORDER BY so_lan_ghi_nhan DESC
    LIMIT 10
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'action_code', a.action_code,
    'ten_hanh_dong', COALESCE(l.name, a.action_code),
    'so_lan_ghi_nhan', a.so_lan_ghi_nhan
  ) ORDER BY a.so_lan_ghi_nhan DESC), '[]'::jsonb)
  INTO v_top_hanh_dong_act
  FROM act_stats a
  LEFT JOIN public.sys_lookup_value l
    ON l.category_type = 'HANH_DONG_CAN_THIEP' AND l.code = a.action_code;

  WITH summary_stats AS (
    SELECT
      COUNT(s.id)::int AS tong_phien,
      ROUND(AVG(s.tong_diem), 1)::numeric AS ty_le_chung
    FROM public.gstt_fact_chung_sessions s
    WHERE s.is_active = true
      AND (p_khoa_id IS NULL OR s.khoa_id = p_khoa_id)
      AND (p_tu_ngay IS NULL OR s.ngay_giam_sat >= p_tu_ngay)
      AND (p_den_ngay IS NULL OR s.ngay_giam_sat <= p_den_ngay)
  )
  SELECT jsonb_build_object(
    'tong_so_phien', COALESCE(tong_phien, 0),
    'ty_le_tuan_thu_chung', COALESCE(ty_le_chung, 0.0)
  )
  INTO v_summary
  FROM summary_stats;

  RETURN jsonb_build_object(
    'tu_ngay', p_tu_ngay,
    'den_ngay', p_den_ngay,
    'khoa_id', p_khoa_id,
    'vung_nguy_co', v_vung_nguy_co,
    'top_vi_pham', v_top_vi_pham,
    'top_hanh_dong_act', v_top_hanh_dong_act,
    'summary', v_summary
  );
END;
$$;

COMMENT ON FUNCTION public.rpc_get_compliance_dashboard_v4(date, date, uuid) IS
  'Dashboard tuân thủ v4: vùng nguy cơ, top tiêu chí vi phạm, top mã ACT (phieu_phan_tich_jsonb).';

COMMIT;
