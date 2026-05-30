-- Gỡ Phần 3–4 khỏi vận hành: làm sạch JSONB master/fact + RPC dashboard v4 chỉ còn vùng IPAC & top vi phạm.
-- Defensive: chỉ UPDATE cột nếu còn tồn tại (remote có thể chưa apply Slice 8 VST).
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gstt_dm_bang_kiem'
      AND column_name = 'nguyen_nhan_cho_phep_jsonb'
  ) THEN
    UPDATE public.gstt_dm_bang_kiem
    SET
      nguyen_nhan_cho_phep_jsonb = '[]'::jsonb,
      hanh_dong_khac_phuc_jsonb = '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gstt_fact_chung_sessions'
      AND column_name = 'phieu_phan_tich_jsonb'
  ) THEN
    UPDATE public.gstt_fact_chung_sessions
    SET phieu_phan_tich_jsonb = '{}'::jsonb
    WHERE phieu_phan_tich_jsonb IS DISTINCT FROM '{}'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gstt_fact_vst'
      AND column_name = 'nguyen_nhan_loi_id'
  ) THEN
    UPDATE public.gstt_fact_vst
    SET
      nguyen_nhan_loi_id = NULL,
      da_can_thiep_ngay = false
    WHERE nguyen_nhan_loi_id IS NOT NULL
       OR COALESCE(da_can_thiep_ngay, false) = true;
  END IF;
END $$;

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
  v_vung_nguy_co jsonb;
  v_top_vi_pham  jsonb;
  v_summary      jsonb;
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
    'summary', v_summary
  );
END;
$$;

COMMENT ON FUNCTION public.rpc_get_compliance_dashboard_v4(date, date, uuid) IS
  'Dashboard tuân thủ v4 (slim): vùng nguy cơ IPAC + top tiêu chí Không đạt + tổng quan phiên.';

COMMIT;
