-- Fix rpc_vst_compare_matrices: ORDER BY tong_co_hoi (không phải so_co_hoi ngoài subquery).
-- Làm tròn % 2 chữ số thập phân trên compare matrices.

BEGIN;

CREATE OR REPLACE FUNCTION public.rpc_vst_compare_matrices(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_hinh_thuc_ids text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_khu_vuc jsonb;
  v_hinh_thuc jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_khu_vuc FROM (
    SELECT
      COALESCE(kv.name, 'Không rõ') AS ten,
      SUM(s.so_co_hoi) AS tong_co_hoi,
      SUM(s.da_tuan_thu) AS da_tuan_thu,
      CASE WHEN SUM(s.so_co_hoi) > 0
        THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 2) ELSE 0 END AS ty_le_tuan_thu
    FROM public.fact_vst_opportunities_summary s
    LEFT JOIN public.sys_lookup_value kv ON kv.id = s.khu_vuc_id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY COALESCE(kv.name, 'Không rõ')
    HAVING SUM(s.so_co_hoi) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY tong_co_hoi DESC), '[]'::jsonb) INTO v_hinh_thuc FROM (
    SELECT
      CASE s.stype
        WHEN 'KSNK' THEN 'Chuyên trách (KSNK)'
        WHEN 'TU_GIAM_SAT' THEN 'Tự giám sát'
        WHEN 'CHEO' THEN 'Giám sát chéo'
        ELSE COALESCE(s.stype, 'Không rõ')
      END AS ten,
      SUM(s.so_co_hoi) AS tong_co_hoi,
      SUM(s.da_tuan_thu) AS da_tuan_thu,
      CASE WHEN SUM(s.so_co_hoi) > 0
        THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 2) ELSE 0 END AS ty_le_tuan_thu
    FROM public.fact_vst_opportunities_summary s
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY 1
    HAVING SUM(s.so_co_hoi) > 0
  ) t;

  RETURN jsonb_build_object(
    'matrix_khu_vuc', v_khu_vuc,
    'matrix_hinh_thuc', v_hinh_thuc
  );
END;
$$;

-- GSC compare matrices: làm tròn 2 chữ số thập phân
CREATE OR REPLACE FUNCTION public.rpc_gsc_compare_matrices(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_hinh_thuc_ids text[] DEFAULT NULL,
  p_bang_kiem_mas text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_khu_vuc jsonb;
  v_nghe jsonb;
  v_hinh_thuc jsonb;
  v_cach_thuc jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_khu_vuc FROM (
    SELECT
      COALESCE(kv.name, 'Không rõ') AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    LEFT JOIN public.sys_lookup_value kv ON kv.id = s.khu_vuc_id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL OR EXISTS (
          SELECT 1 FROM public.gstt_dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY COALESCE(kv.name, 'Không rõ')
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_nghe FROM (
    SELECT
      COALESCE(nn.name, 'Không rõ') AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    LEFT JOIN public.sys_lookup_value nn ON nn.id = s.nghe_nghiep_id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL OR EXISTS (
          SELECT 1 FROM public.gstt_dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY COALESCE(nn.name, 'Không rõ')
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_hinh_thuc FROM (
    SELECT
      COALESCE(ht.name, 'Không rõ') AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.gstt_fact_chung_sessions sess ON sess.id = s.session_id
    LEFT JOIN public.sys_lookup_value ht ON ht.id = sess.hinh_thuc_id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL OR EXISTS (
          SELECT 1 FROM public.gstt_dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY COALESCE(ht.name, 'Không rõ')
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_cach_thuc FROM (
    SELECT
      COALESCE(ct.name, 'Không rõ') AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.gstt_fact_chung_sessions sess ON sess.id = s.session_id
    LEFT JOIN public.sys_lookup_value ct ON ct.id = sess.cach_thuc_id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL OR EXISTS (
          SELECT 1 FROM public.gstt_dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY COALESCE(ct.name, 'Không rõ')
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  RETURN jsonb_build_object(
    'matrix_khu_vuc', v_khu_vuc,
    'matrix_nghe', v_nghe,
    'matrix_hinh_thuc', v_hinh_thuc,
    'matrix_cach_thuc', v_cach_thuc
  );
END;
$$;

COMMIT;
