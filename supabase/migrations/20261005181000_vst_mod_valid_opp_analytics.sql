-- VST-01/03/06 Soft-local: predicate cơ hội hợp lệ + mẫu số phụ phiếu WHO + ELSE NULL.
-- CHỈ GHI FILE — không apply. Prod 0/31876 dòng lỗi → không đổi số lịch sử.
-- Bản nền: GS-05 (fn_session_analytics_stype). Timestamp > 175200.

BEGIN;

-- 5 nhãn thời điểm DB (không đổi chuỗi).
CREATE OR REPLACE FUNCTION public.fn_vst_is_valid_opportunity(
  p_hanh_dong text,
  p_thoi_diem text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO public
AS $$
  SELECT
    COALESCE(btrim(p_hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn', 'Bỏ sót')
    AND EXISTS (
      SELECT 1
      FROM regexp_split_to_table(
        regexp_replace(COALESCE(p_thoi_diem, ''), '，', ',', 'g'),
        E'\\s*,\\s*'
      ) AS m(moment_part)
      WHERE btrim(m.moment_part, E' \t\n\r') IN (
        'Trước khi tiếp xúc người bệnh',
        'Trước khi làm thủ thuật vô khuẩn',
        'Sau khi có nguy cơ tiếp xúc với dịch',
        'Sau khi tiếp xúc người bệnh',
        'Sau khi tiếp xúc xung quanh người bệnh'
      )
    );
$$;

COMMENT ON FUNCTION public.fn_vst_is_valid_opportunity(text, text) IS
  'VST-01: cơ hội hợp lệ = hành động ∈ {3} và ≥1 thời điểm thuộc 5 nhãn WHO.';

-- View summary: chỉ dòng hợp lệ (compare matrices / KPI phụ).
CREATE OR REPLACE VIEW public.gstt_fact_vst_opportunities_summary WITH (security_invoker = true) AS
SELECT
  d.id AS opportunity_id,
  d.session_id,
  s.ngay_giam_sat,
  COALESCE(d.khoa_id, s.khoa_id) AS khoa_id,
  COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS khu_vuc_id,
  d.nghe_nghiep_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  (COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')) AS is_tuan_thu,
  d.dung_ky_thuat,
  d.du_thoi_gian,
  d.co_deo_gang,
  1::bigint AS so_co_hoi,
  CASE
    WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 1
    ELSE 0
  END::bigint AS da_tuan_thu,
  CASE
    WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 0
    ELSE 1
  END::bigint AS bo_sot,
  CASE
    WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
      AND d.dung_ky_thuat = false THEN 1
    ELSE 0
  END::bigint AS loi_ky_thuat,
  CASE
    WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
      AND d.du_thoi_gian = false THEN 1
    ELSE 0
  END::bigint AS loi_thoi_gian,
  CASE
    WHEN COALESCE(btrim(d.hanh_dong), '') = 'Bỏ sót' AND d.co_deo_gang = true THEN 1
    ELSE 0
  END::bigint AS lam_dung_gang,
  d.created_at
FROM public.gstt_fact_vst d
JOIN public.gstt_fact_vst_sessions s ON d.session_id = s.id
WHERE COALESCE(s.is_active, true) = true
  AND public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem);

CREATE OR REPLACE VIEW public.fact_vst_opportunities_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_vst_opportunities_summary;

-- Moments summary: bỏ nhánh «Chưa ghi thời điểm»; chỉ dòng hợp lệ + 5 nhãn.
CREATE OR REPLACE VIEW public.gstt_fact_vst_moments_summary WITH (security_invoker = true) AS
SELECT
  d.id AS opportunity_id,
  btrim(m.moment_part, E' \t\n\r') AS moment_label,
  d.session_id,
  s.ngay_giam_sat,
  COALESCE(d.khoa_id, s.khoa_id) AS khoa_id,
  COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS khu_vuc_id,
  d.nghe_nghiep_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  (COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')) AS is_tuan_thu,
  d.co_deo_gang,
  1::bigint AS so_quan_sat,
  d.created_at
FROM public.gstt_fact_vst d
JOIN public.gstt_fact_vst_sessions s ON d.session_id = s.id
CROSS JOIN LATERAL regexp_split_to_table(
  regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
  E'\\s*,\\s*'
) AS m(moment_part)
WHERE COALESCE(s.is_active, true) = true
  AND public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem)
  AND btrim(m.moment_part, E' \t\n\r') IN (
    'Trước khi tiếp xúc người bệnh',
    'Trước khi làm thủ thuật vô khuẩn',
    'Sau khi có nguy cơ tiếp xúc với dịch',
    'Sau khi tiếp xúc người bệnh',
    'Sau khi tiếp xúc xung quanh người bệnh'
  );

CREATE OR REPLACE VIEW public.fact_vst_moments_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_vst_moments_summary;

-- Lịch sử phiên: tổng cơ hội chỉ đếm dòng hợp lệ.
CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_sessions_full WITH (security_invoker = true) AS
SELECT
  s.id, s.khoa_id, s.khu_vuc_id, s.vi_tri_cu_the, s.hinh_thuc_id, s.cach_thuc_id,
  ht.ten_hinh_thuc AS hinh_thuc_giam_sat, ct.ten_cach_thuc AS cach_thuc_giam_sat,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
  s.nguoi_giam_sat_id, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc, s.ngay_giam_sat,
  s.created_at, s.updated_at, s.is_active, s.is_seen,
  k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat,
  COALESCE(agg.tong_co_hoi, 0::numeric) AS tong_co_hoi,
  COALESCE(agg.da_tuan_thu, 0::numeric) AS da_tuan_thu,
  COALESCE((s.metadata ->> 'is_bo_sung_nguoi_benh')::boolean, false) AS is_bo_sung_nguoi_benh,
  s.metadata ->> 'ma_benh_an' AS ma_benh_an,
  s.metadata ->> 'ma_nguoi_benh' AS ma_nguoi_benh,
  s.metadata ->> 'ten_nguoi_benh' AS ten_nguoi_benh,
  s.metadata ->> 'so_giuong_nguoi_benh' AS so_giuong_nguoi_benh
FROM public.gstt_fact_vst_sessions s
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
LEFT JOIN (
  SELECT
    d.session_id,
    count(*) FILTER (WHERE public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem))::numeric AS tong_co_hoi,
    sum(
      CASE
        WHEN public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem)
          AND coalesce(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 1
        ELSE 0
      END
    )::numeric AS da_tuan_thu
  FROM public.gstt_fact_vst d
  GROUP BY d.session_id
) agg ON agg.session_id = s.id
WHERE COALESCE(s.is_active, true) = true;

GRANT SELECT ON public.v_gstt_giam_sat_vst_sessions_full TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rpc_dashboard_vst_strategic_analytics_impl(
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
  v_result jsonb;
BEGIN
  WITH session_base AS MATERIALIZED (
    SELECT
      s.id AS session_id,
      s.ngay_giam_sat,
      s.khoa_id,
      s.khu_vuc_id,
      s.nguoi_giam_sat_id,
      public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype
    FROM public.gstt_fact_vst_sessions s
    WHERE COALESCE(s.is_active, true) = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
  ),
  session_scoped AS MATERIALIZED (
    SELECT sb.*, k.khoi_id, k.ma_khoa, k.ten_khoa
    FROM session_base sb
    LEFT JOIN public.mdm_dm_khoa_phong k ON sb.khoa_id = k.id
    WHERE (p_khoa_ids IS NULL OR sb.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_khu_vuc_ids IS NULL OR sb.khu_vuc_id = ANY(p_khu_vuc_ids))
  ),
  -- Mọi dòng (kể cả không hợp lệ) trong scope — để báo so_dong_khong_hop_le.
  opp_all AS MATERIALIZED (
    SELECT
      ss.session_id,
      d.hanh_dong,
      d.thoi_diem,
      public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem) AS is_valid,
      ss.stype,
      d.nghe_nghiep_id
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    WHERE (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
  ),
  opp_core AS MATERIALIZED (
    SELECT
      ss.session_id,
      ss.ngay_giam_sat,
      COALESCE(d.khoa_id, ss.khoa_id) AS khoa_id,
      COALESCE(d.khu_vuc_id, ss.khu_vuc_id) AS khu_vuc_id,
      d.nghe_nghiep_id,
      ss.stype,
      1::bigint AS so_co_hoi,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 1
        ELSE 0
      END::bigint AS da_tuan_thu,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') = 'Bỏ sót' THEN 1
        ELSE 0
      END::bigint AS bo_sot,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.dung_ky_thuat IS NOT NULL THEN 1
        ELSE 0
      END::bigint AS danh_gia_ky_thuat,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.dung_ky_thuat = true THEN 1
        ELSE 0
      END::bigint AS dung_ky_thuat_cnt,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.dung_ky_thuat = false THEN 1
        ELSE 0
      END::bigint AS loi_ky_thuat,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.du_thoi_gian IS NOT NULL THEN 1
        ELSE 0
      END::bigint AS danh_gia_thoi_gian,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.du_thoi_gian = true THEN 1
        ELSE 0
      END::bigint AS du_thoi_gian_cnt,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.du_thoi_gian = false THEN 1
        ELSE 0
      END::bigint AS loi_thoi_gian,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') = 'Bỏ sót' AND d.co_deo_gang IS NOT NULL THEN 1
        ELSE 0
      END::bigint AS danh_gia_gang,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') = 'Bỏ sót' AND d.co_deo_gang = true THEN 1
        ELSE 0
      END::bigint AS lam_dung_gang,
      ss.khoi_id,
      ss.ma_khoa,
      ss.ten_khoa
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    WHERE (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem)
  ),
  opp_filtered AS (
    SELECT *
    FROM opp_core
    WHERE (p_hinh_thuc_ids IS NULL OR stype = ANY(p_hinh_thuc_ids))
  ),
  moments_filtered AS MATERIALIZED (
    SELECT
      btrim(m.moment_part, E' \t\n\r') AS moment_label,
      (COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')) AS is_tuan_thu,
      1::bigint AS so_quan_sat
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    CROSS JOIN LATERAL regexp_split_to_table(
      regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
      E'\\s*,\\s*'
    ) AS m(moment_part)
    WHERE (p_hinh_thuc_ids IS NULL OR ss.stype = ANY(p_hinh_thuc_ids))
      AND (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem)
      AND btrim(m.moment_part, E' \t\n\r') IN (
        'Trước khi tiếp xúc người bệnh',
        'Trước khi làm thủ thuật vô khuẩn',
        'Sau khi có nguy cơ tiếp xúc với dịch',
        'Sau khi tiếp xúc người bệnh',
        'Sau khi tiếp xúc xung quanh người bệnh'
      )
  ),
  opp_window AS MATERIALIZED (
    SELECT COALESCE(d.khoa_id, sb.khoa_id) AS khoa_id, sb.stype, 1::bigint AS so_co_hoi
    FROM public.gstt_fact_vst d
    INNER JOIN session_base sb ON d.session_id = sb.session_id
    WHERE public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem)
  ),
  kpis AS (
    SELECT jsonb_build_object(
      'tong_phien', COALESCE(COUNT(DISTINCT session_id), 0),
      'tong_co_hoi', COALESCE(SUM(so_co_hoi), 0),
      'da_tuan_thu', COALESCE(SUM(da_tuan_thu), 0),
      'bo_sot', COALESCE(SUM(bo_sot), 0),
      'loi_ky_thuat', COALESCE(SUM(loi_ky_thuat), 0),
      'loi_thoi_gian', COALESCE(SUM(loi_thoi_gian), 0),
      'lam_dung_gang', COALESCE(SUM(lam_dung_gang), 0),
      'danh_gia_ky_thuat', COALESCE(SUM(danh_gia_ky_thuat), 0),
      'danh_gia_thoi_gian', COALESCE(SUM(danh_gia_thoi_gian), 0),
      'danh_gia_gang', COALESCE(SUM(danh_gia_gang), 0),
      'dung_ky_thuat', COALESCE(SUM(dung_ky_thuat_cnt), 0),
      'du_thoi_gian', COALESCE(SUM(du_thoi_gian_cnt), 0),
      'so_dong_khong_hop_le', (
        SELECT COUNT(*)::bigint
        FROM opp_all oa
        WHERE NOT oa.is_valid
          AND (p_hinh_thuc_ids IS NULL OR oa.stype = ANY(p_hinh_thuc_ids))
      ),
      'ty_le_tuan_thu', CASE WHEN SUM(so_co_hoi) > 0
        THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE NULL END,
      'ty_le_dung_ky_thuat', CASE WHEN SUM(danh_gia_ky_thuat) > 0
        THEN ROUND((SUM(dung_ky_thuat_cnt)::numeric * 100) / SUM(danh_gia_ky_thuat), 1) ELSE NULL END,
      'ty_le_du_thoi_gian', CASE WHEN SUM(danh_gia_thoi_gian) > 0
        THEN ROUND((SUM(du_thoi_gian_cnt)::numeric * 100) / SUM(danh_gia_thoi_gian), 1) ELSE NULL END,
      'ty_le_lam_dung_gang', CASE WHEN SUM(danh_gia_gang) > 0
        THEN ROUND((SUM(lam_dung_gang)::numeric * 100) / SUM(danh_gia_gang), 1) ELSE NULL END
    ) AS payload
    FROM opp_filtered
  ),
  trendline AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY min_date), '[]'::jsonb) AS payload
    FROM (
      SELECT
        'Tuần ' || to_char(ngay_giam_sat, 'IW') || ' (' || to_char(date_trunc('week', ngay_giam_sat), 'DD/MM') || ')' AS label,
        MIN(ngay_giam_sat) AS min_date,
        SUM(so_co_hoi) AS tong_co_hoi,
        SUM(da_tuan_thu) AS da_tuan_thu,
        CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE NULL END AS ty_le_tuan_thu
      FROM opp_filtered
      GROUP BY 1
    ) t
  ),
  matrix_khoa AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC NULLS LAST), '[]'::jsonb) AS payload
    FROM (
      SELECT
        khoa_id AS id,
        ma_khoa,
        ten_khoa AS ten,
        SUM(so_co_hoi) AS tong_co_hoi,
        SUM(da_tuan_thu) AS da_tuan_thu,
        CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE NULL END AS ty_le_tuan_thu
      FROM opp_filtered
      WHERE khoa_id IS NOT NULL
      GROUP BY khoa_id, ma_khoa, ten_khoa
    ) t
  ),
  matrix_nghe AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY tong_co_hoi DESC), '[]'::jsonb) AS payload
    FROM (
      SELECT
        COALESCE(n.id, md5('unknown')::uuid) AS id,
        COALESCE(n.name, 'Không rõ') AS ten,
        SUM(s.so_co_hoi) AS tong_co_hoi,
        SUM(s.da_tuan_thu) AS da_tuan_thu,
        CASE WHEN SUM(s.so_co_hoi) > 0 THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE NULL END AS ty_le_tuan_thu
      FROM opp_filtered s
      LEFT JOIN public.sys_lookup_value n ON s.nghe_nghiep_id = n.id
      GROUP BY n.id, n.name
    ) t
  ),
  moments AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY tong_co_hoi DESC), '[]'::jsonb) AS payload
    FROM (
      SELECT
        moment_label AS ten,
        SUM(so_quan_sat) AS tong_co_hoi,
        SUM(CASE WHEN is_tuan_thu THEN so_quan_sat ELSE 0 END) AS da_tuan_thu,
        CASE WHEN SUM(so_quan_sat) > 0
          THEN ROUND((SUM(CASE WHEN is_tuan_thu THEN so_quan_sat ELSE 0 END)::numeric * 100) / SUM(so_quan_sat), 1)
          ELSE NULL END AS ty_le_tuan_thu
      FROM moments_filtered
      GROUP BY moment_label
    ) t
  ),
  gap_analysis AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY ten), '[]'::jsonb) AS payload
    FROM (
      SELECT
        khoa_id AS id,
        ma_khoa,
        ten_khoa AS ten,
        SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END) AS tgs_co_hoi,
        SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN da_tuan_thu ELSE 0 END) AS tgs_dat,
        CASE WHEN SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END), 1)
          ELSE NULL END AS ty_le_tgs,
        SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END) AS ksnk_co_hoi,
        SUM(CASE WHEN stype = 'KSNK' THEN da_tuan_thu ELSE 0 END) AS ksnk_dat,
        CASE WHEN SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN stype = 'KSNK' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END), 1)
          ELSE NULL END AS ty_le_ksnk,
        CASE
          WHEN SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END) > 0
           AND SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END), 1)
            - ROUND((SUM(CASE WHEN stype = 'KSNK' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END), 1)
          ELSE NULL
        END AS do_lech
      FROM opp_filtered
      WHERE khoa_id IS NOT NULL
      GROUP BY khoa_id, ma_khoa, ten_khoa
      HAVING SUM(so_co_hoi) > 0
    ) t
  ),
  workload AS (
    SELECT jsonb_build_object(
      'khoa_tu_giam_sat', (
        SELECT COUNT(DISTINCT khoa_id) FROM opp_window WHERE stype = 'TU_GIAM_SAT'
      ),
      'khoa_duoc_ksnk_giam_sat', (
        SELECT COUNT(DISTINCT khoa_id) FROM opp_window WHERE stype = 'KSNK'
      ),
      'ksnk_so_co_hoi', (
        SELECT COALESCE(SUM(so_co_hoi), 0) FROM opp_window WHERE stype = 'KSNK'
      ),
      'ksnk_so_phien', (
        SELECT COUNT(*) FROM session_base WHERE stype = 'KSNK'
      ),
      'co_cau_giam_sat', (
        SELECT COALESCE(jsonb_agg(src), '[]'::jsonb)
        FROM (
          SELECT 'KSNK' AS ten, COALESCE(SUM(so_co_hoi), 0) AS so_co_hoi
          FROM opp_window WHERE stype = 'KSNK'
          UNION ALL
          SELECT 'TU_GIAM_SAT', COALESCE(SUM(so_co_hoi), 0)
          FROM opp_window WHERE stype = 'TU_GIAM_SAT'
          UNION ALL
          SELECT 'CHEO', COALESCE(SUM(so_co_hoi), 0)
          FROM opp_window WHERE stype = 'CHEO'
        ) src
      )
    ) AS payload
  )
  SELECT jsonb_build_object(
    'kpis', COALESCE((SELECT payload FROM kpis), '{}'::jsonb),
    'trendline', COALESCE((SELECT payload FROM trendline), '[]'::jsonb),
    'matrix_khoa', COALESCE((SELECT payload FROM matrix_khoa), '[]'::jsonb),
    'matrix_nghe', COALESCE((SELECT payload FROM matrix_nghe), '[]'::jsonb),
    'moments', COALESCE((SELECT payload FROM moments), '[]'::jsonb),
    'gap_analysis', COALESCE((SELECT payload FROM gap_analysis), '[]'::jsonb),
    'workload', COALESCE((SELECT payload FROM workload), '{}'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.rpc_dashboard_vst_strategic_analytics_impl IS
  'VST-01/03/06: chỉ cơ hội hợp lệ; mẫu phụ phiếu WHO theo ô đã đánh giá; tỷ lệ NULL khi mẫu 0.';

NOTIFY pgrst, 'reload schema';

COMMIT;
