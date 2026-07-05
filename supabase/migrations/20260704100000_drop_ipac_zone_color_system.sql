-- Loại bỏ hoàn toàn nhóm màu IPAC (TR/DO/VA/XA): metadata.nhom_mau, matrix_khu_vuc_nhom, rollup vùng màu.
-- Giữ chức năng phòng (KHU_VUC_GIAM_SAT) + matrix_khu_vuc chi tiết.

BEGIN;

-- 1. Xóa nhom_mau khỏi metadata lookup
UPDATE public.sys_lookup_value
   SET metadata = metadata - 'nhom_mau',
       updated_at = now()
 WHERE category_type = 'KHU_VUC_GIAM_SAT'
   AND metadata ? 'nhom_mau';

-- 2. View danh mục — nhom_mau luôn NULL (PG không cho REPLACE khi bỏ cột; dependent views giữ nguyên)
CREATE OR REPLACE VIEW public.gstt_dm_khu_vuc_giam_sat WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_khu_vuc,
    name AS ten_khu_vuc,
    is_active,
    created_at,
    updated_at,
    NULL::text AS nhom_mau,
    COALESCE((metadata ->> 'thu_tu')::integer, 999) AS thu_tu,
    metadata
   FROM public.sys_lookup_value
  WHERE category_type = 'KHU_VUC_GIAM_SAT';

-- 3. Registry RPC — không trả nhom_mau
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
            SELECT id, ten_khoa AS ten, ma_khoa AS ma, specs
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
            SELECT id, ten_khu_vuc AS ten, ma_khu_vuc AS ma, thu_tu, metadata
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

-- 4. Compare matrices — bỏ matrix_khu_vuc_nhom; matrix_khu_vuc theo chức năng phòng
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
SET search_path TO public, pg_catalog
AS $$
DECLARE
  v_khoi jsonb;
  v_khu_vuc jsonb;
  v_nghe jsonb;
  v_hinh_thuc jsonb;
  v_cach_thuc jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(t ORDER BY t.ten), '[]'::jsonb) INTO v_khoi FROM (
    SELECT
      COALESCE(kk.ten_khoi, 'Không rõ') AS ten,
      COALESCE(kk.ma_khoi, '') AS ma_khoi,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.mdm_dm_khoi_khoa kk ON kk.id = k.khoi_id
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
    GROUP BY kk.id, kk.ten_khoi, kk.ma_khoi
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.thu_tu, t.ten), '[]'::jsonb) INTO v_khu_vuc FROM (
    SELECT
      COALESCE(kv.name, 'Không rõ') AS ten,
      COALESCE((kv.metadata ->> 'thu_tu')::integer, 999) AS thu_tu,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
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
    GROUP BY COALESCE(kv.name, 'Không rõ'), COALESCE((kv.metadata ->> 'thu_tu')::integer, 999)
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_nghe FROM (
    SELECT
      COALESCE(nn.name, 'Không rõ') AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
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
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
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
    GROUP BY 1
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_cach_thuc FROM (
    SELECT
      COALESCE(ct.name, 'Không rõ') AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
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
    'matrix_khoi', v_khoi,
    'matrix_khu_vuc', v_khu_vuc,
    'matrix_nghe', v_nghe,
    'matrix_hinh_thuc', v_hinh_thuc,
    'matrix_cach_thuc', v_cach_thuc
  );
END;
$$;

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
SET search_path TO public, pg_catalog
AS $$
DECLARE
  v_khoi jsonb;
  v_khu_vuc jsonb;
  v_hinh_thuc jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(t ORDER BY t.ten), '[]'::jsonb) INTO v_khoi FROM (
    SELECT
      COALESCE(kk.ten_khoi, 'Không rõ') AS ten,
      COALESCE(kk.ma_khoi, '') AS ma_khoi,
      SUM(s.so_co_hoi) AS tong_co_hoi,
      SUM(s.da_tuan_thu) AS da_tuan_thu,
      CASE WHEN SUM(s.so_co_hoi) > 0
        THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_vst_opportunities_summary s
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.mdm_dm_khoi_khoa kk ON kk.id = k.khoi_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY kk.id, kk.ten_khoi, kk.ma_khoi
    HAVING SUM(s.so_co_hoi) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.thu_tu, t.ten), '[]'::jsonb) INTO v_khu_vuc FROM (
    SELECT
      COALESCE(kv.name, 'Không rõ') AS ten,
      COALESCE((kv.metadata ->> 'thu_tu')::integer, 999) AS thu_tu,
      SUM(s.so_co_hoi) AS tong_co_hoi,
      SUM(s.da_tuan_thu) AS da_tuan_thu,
      CASE WHEN SUM(s.so_co_hoi) > 0
        THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_vst_opportunities_summary s
    LEFT JOIN public.sys_lookup_value kv ON kv.id = s.khu_vuc_id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY COALESCE(kv.name, 'Không rõ'), COALESCE((kv.metadata ->> 'thu_tu')::integer, 999)
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
        THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_vst_opportunities_summary s
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
    'matrix_khoi', v_khoi,
    'matrix_khu_vuc', v_khu_vuc,
    'matrix_hinh_thuc', v_hinh_thuc
  );
END;
$$;

-- 5. Dashboard v4 legacy — rollup theo chức năng phòng (không gom 4 màu)
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
      COALESCE(l.code, 'UNK') AS ma_khu_vuc,
      COALESCE(l.name, 'Không rõ') AS ten_khu_vuc,
      COUNT(s.id)::int AS tong_so_phien,
      ROUND(AVG(s.tong_diem), 1)::numeric AS ty_le_trung_binh,
      COALESCE((l.metadata ->> 'thu_tu')::integer, 999) AS thu_tu
    FROM public.gstt_fact_chung_sessions s
    JOIN public.sys_lookup_value l ON s.khu_vuc_id = l.id
    WHERE s.is_active = true
      AND (p_khoa_id IS NULL OR s.khoa_id = p_khoa_id)
      AND (p_tu_ngay IS NULL OR s.ngay_giam_sat >= p_tu_ngay)
      AND (p_den_ngay IS NULL OR s.ngay_giam_sat <= p_den_ngay)
    GROUP BY l.id, l.code, l.name, COALESCE((l.metadata ->> 'thu_tu')::integer, 999)
    ORDER BY COALESCE((l.metadata ->> 'thu_tu')::integer, 999), COALESCE(l.name, 'Không rõ')
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

COMMENT ON FUNCTION public.rpc_get_compliance_dashboard_v4(date, date, uuid)
  IS 'Dashboard tuân thủ v4: theo chức năng phòng + top vi phạm + tổng quan phiên.';

NOTIFY pgrst, 'reload schema';

COMMIT;
