-- Khu vực: metadata trên view (cột mới append cuối) + registry RPC sort + dashboard v4 gom 4 vùng IPAC.

CREATE OR REPLACE VIEW public.gstt_dm_khu_vuc_giam_sat WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_khu_vuc,
    name AS ten_khu_vuc,
    is_active,
    created_at,
    updated_at,
    metadata ->> 'nhom_mau' AS nhom_mau,
    COALESCE((metadata ->> 'thu_tu')::integer, 999) AS thu_tu
   FROM public.sys_lookup_value
  WHERE category_type = 'KHU_VUC_GIAM_SAT';

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

CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_v4(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoa_id uuid DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO public, pg_catalog
    AS $$
DECLARE
  v_vung_nguy_co jsonb;
  v_top_vi_pham  jsonb;
  v_summary      jsonb;
BEGIN
  WITH vung_stats AS (
    SELECT
      COALESCE(l.metadata ->> 'nhom_mau', 'UNK') AS ma_khu_vuc,
      CASE COALESCE(l.metadata ->> 'nhom_mau', 'UNK')
        WHEN 'TR' THEN 'Vùng Trắng — vô khuẩn cao'
        WHEN 'DO' THEN 'Vùng Đỏ — lây nhiễm cao'
        WHEN 'VA' THEN 'Vùng Vàng — lây nhiễm trung bình'
        WHEN 'XA' THEN 'Vùng Xanh — lây nhiễm thấp'
        ELSE 'Khác'
      END AS ten_khu_vuc,
      COUNT(s.id)::int AS tong_so_phien,
      ROUND(AVG(s.tong_diem), 1)::numeric AS ty_le_trung_binh
    FROM public.gstt_fact_chung_sessions s
    JOIN public.sys_lookup_value l ON s.khu_vuc_id = l.id
    WHERE s.is_active = true
      AND (p_khoa_id IS NULL OR s.khoa_id = p_khoa_id)
      AND (p_tu_ngay IS NULL OR s.ngay_giam_sat >= p_tu_ngay)
      AND (p_den_ngay IS NULL OR s.ngay_giam_sat <= p_den_ngay)
    GROUP BY l.metadata ->> 'nhom_mau'
    ORDER BY CASE COALESCE(l.metadata ->> 'nhom_mau', 'UNK')
      WHEN 'TR' THEN 1
      WHEN 'DO' THEN 2
      WHEN 'VA' THEN 3
      WHEN 'XA' THEN 4
      ELSE 5
    END
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
