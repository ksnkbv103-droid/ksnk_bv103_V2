-- NKBV-03 — cột báo cáo DOE / LOA / ngày mổ SSI + RPC lọc theo DOE (SSI theo ngày mổ).
-- FILE ONLY — chưa apply. App fallback: đọc verification_data.calculated_doe / attributed_khoa_id
-- khi cột chưa có (schema cache error → bỏ patch cột).

BEGIN;

ALTER TABLE public.nkbv_fact_su_kien
  ADD COLUMN IF NOT EXISTS doe date,
  ADD COLUMN IF NOT EXISTS loa_khoa_id uuid REFERENCES public.mdm_dm_khoa_phong(id),
  ADD COLUMN IF NOT EXISTS ngay_phau_thuat date;

COMMENT ON COLUMN public.nkbv_fact_su_kien.doe IS
  'DOE báo cáo (= calculated_doe). ngay_phat_hien giữ Index.';
COMMENT ON COLUMN public.nkbv_fact_su_kien.loa_khoa_id IS
  'Khoa quy kết Transfer Rule (LOA). Khác khoa_ghi_nhan_id lúc tạo phiếu.';
COMMENT ON COLUMN public.nkbv_fact_su_kien.ngay_phau_thuat IS
  'Ngày mổ SSI — kỳ tử số SSI theo ngày mổ (NHSN Ch.9).';

-- Backfill từ verification_data (không đoán Index).
-- Cast an toàn: chuỗi lệch ISO date/UUID → bỏ qua (không FAIL cả transaction).
UPDATE public.nkbv_fact_su_kien s
SET
  doe = COALESCE(
    s.doe,
    CASE
      WHEN NULLIF(btrim(s.verification_data->>'calculated_doe'), '')
        ~ '^\d{4}-\d{2}-\d{2}$'
      THEN (NULLIF(btrim(s.verification_data->>'calculated_doe'), ''))::date
      ELSE NULL
    END
  ),
  loa_khoa_id = COALESCE(
    s.loa_khoa_id,
    CASE
      WHEN NULLIF(btrim(s.verification_data->>'attributed_khoa_id'), '')
        ~ '^[0-9a-fA-F-]{36}$'
      THEN (NULLIF(btrim(s.verification_data->>'attributed_khoa_id'), ''))::uuid
      ELSE NULL
    END
  ),
  ngay_phau_thuat = COALESCE(
    s.ngay_phau_thuat,
    CASE
      WHEN NULLIF(btrim(s.verification_data->>'ngay_phau_thuat'), '')
        ~ '^\d{4}-\d{2}-\d{2}$'
      THEN (NULLIF(btrim(s.verification_data->>'ngay_phau_thuat'), ''))::date
      ELSE NULL
    END,
    CASE
      WHEN NULLIF(btrim(s.verification_data->>'surgery_date'), '')
        ~ '^\d{4}-\d{2}-\d{2}$'
      THEN (NULLIF(btrim(s.verification_data->>'surgery_date'), ''))::date
      ELSE NULL
    END
  )
WHERE s.is_active = true
  AND (
    s.doe IS NULL
    OR s.loa_khoa_id IS NULL
    OR s.ngay_phau_thuat IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_nkbv_su_kien_doe
  ON public.nkbv_fact_su_kien (doe)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_nkbv_su_kien_loa_khoa
  ON public.nkbv_fact_su_kien (loa_khoa_id)
  WHERE is_active = true AND loa_khoa_id IS NOT NULL;

-- RPC: kỳ theo DOE (SSI theo ngày mổ); khoa theo loa_khoa_id; null khoa → dòng «Chưa quy kết khoa»
CREATE OR REPLACE FUNCTION public.fn_nkbv_dich_te_hoc_rates(
  "p_tu_ngay" date,
  "p_den_ngay" date,
  "p_khoa_id" uuid DEFAULT NULL
)
RETURNS TABLE(
  "khoa_id" uuid, "ma_khoa" text, "ten_khoa" text,
  "obs_vap_cases" bigint, "obs_vae_cases" bigint, "obs_clabsi_cases" bigint,
  "obs_mbi_lcbi_cases" bigint, "obs_cauti_cases" bigint, "obs_ssi_cases" bigint,
  "obs_vent_days" bigint, "obs_cvc_days" bigint, "obs_foley_days" bigint,
  "obs_patient_days" bigint, "obs_emv_episodes" bigint, "obs_total_surgeries" bigint,
  "clabsi_rate_per_1000" numeric, "mbi_lcbi_rate_per_1000" numeric, "cvc_dur" numeric,
  "clabsi_sir" numeric, "cvc_sur" numeric,
  "vap_rate_per_1000" numeric, "vae_rate_per_1000" numeric, "vae_rate_per_100_emv" numeric,
  "vent_dur" numeric, "vae_sir" numeric, "vent_sur" numeric,
  "cauti_rate_per_1000" numeric, "foley_dur" numeric, "cauti_sir" numeric, "foley_sur" numeric,
  "ssi_raw_rate" numeric, "ssi_sir" numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  WITH ca_lock AS (
    SELECT
      COALESCE(
        s.loa_khoa_id,
        NULLIF(btrim(s.verification_data->>'attributed_khoa_id'), '')::uuid,
        s.khoa_ghi_nhan_id
      ) AS report_khoa_id,
      upper(btrim(coalesce(s.verification_data->>'classification', ''))) AS cls,
      CASE
        WHEN public.fn_nkbv_major_type_from_classification(
          upper(btrim(coalesce(s.verification_data->>'classification', '')))
        ) = 'SSI' THEN COALESCE(
          s.ngay_phau_thuat,
          NULLIF(btrim(s.verification_data->>'ngay_phau_thuat'), '')::date,
          NULLIF(btrim(s.verification_data->>'surgery_date'), '')::date,
          s.doe,
          NULLIF(btrim(s.verification_data->>'calculated_doe'), '')::date
        )
        ELSE COALESCE(
          s.doe,
          NULLIF(btrim(s.verification_data->>'calculated_doe'), '')::date
        )
      END AS report_date
    FROM public.nkbv_fact_su_kien s
    WHERE s.is_active = true
      AND s.verification_data->'is_positive' = 'true'::jsonb
      AND s.trang_thai_id IN (
        SELECT t.id FROM public.nkbv_dm_trang_thai_ca t
        WHERE t.ma_trang_thai = 'XAC_NHAN' AND t.is_active = true
      )
  ),
  ca_in_range AS (
    SELECT * FROM ca_lock c
    WHERE c.report_date IS NOT NULL
      AND c.report_date >= p_tu_ngay
      AND c.report_date <= p_den_ngay
  ),
  ca_counts AS (
    SELECT
      c.report_khoa_id AS khoa_ghi_nhan_id,
      COUNT(*) FILTER (WHERE c.cls ~ '^PNU[123]_VAP$') AS vap_cases,
      COUNT(*) FILTER (WHERE c.cls IN ('VAC', 'IVAC', 'PVAP')) AS vae_cases,
      COUNT(*) FILTER (WHERE c.cls = 'CLABSI') AS clabsi_cases,
      COUNT(*) FILTER (WHERE c.cls = 'MBI_LCBI') AS mbi_lcbi_cases,
      COUNT(*) FILTER (WHERE c.cls LIKE 'CAUTI%') AS cauti_cases,
      COUNT(*) FILTER (
        WHERE public.fn_nkbv_major_type_from_classification(c.cls) = 'SSI'
      ) AS ssi_cases
    FROM ca_in_range c
    GROUP BY c.report_khoa_id
  ),
  mau_so_sums AS (
    SELECT
      m.khoa_id,
      SUM(m.so_ngay_tho_may) AS total_vent_days,
      SUM(m.so_ngay_catheter_cvc) AS total_cvc_days,
      SUM(m.so_ngay_sonde_tieu) AS total_foley_days,
      SUM(m.so_ngay_dieu_tri) AS total_patient_days,
      SUM(m.so_dot_tho_may_emv) AS total_emv_episodes
    FROM public.nkbv_fact_mau_so_daily m
    WHERE m.ngay_ghi_nhan >= p_tu_ngay AND m.ngay_ghi_nhan <= p_den_ngay
    GROUP BY m.khoa_id
  ),
  baselines AS (
    SELECT
      b.khoa_id,
      MAX(b.expected_infection_rate_per_1000) FILTER (WHERE b.loai_thiet_bi = 'VENT') AS b_vae_rate,
      MAX(b.expected_dur) FILTER (WHERE b.loai_thiet_bi = 'VENT') AS b_vent_dur,
      MAX(b.expected_infection_rate_per_1000) FILTER (WHERE b.loai_thiet_bi = 'CVC') AS b_clabsi_rate,
      MAX(b.expected_dur) FILTER (WHERE b.loai_thiet_bi = 'CVC') AS b_cvc_dur,
      MAX(b.expected_infection_rate_per_1000) FILTER (WHERE b.loai_thiet_bi = 'FOLEY') AS b_cauti_rate,
      MAX(b.expected_dur) FILTER (WHERE b.loai_thiet_bi = 'FOLEY') AS b_foley_dur
    FROM public.nkbv_dm_cdc_baseline b
    WHERE b.is_active = true
    GROUP BY b.khoa_id
  ),
  ssi_sums AS (
    SELECT
      s.khoa_id,
      COUNT(s.id) AS total_surgeries,
      SUM(s.expected_ssi_prob) AS expected_ssi_cases
    FROM public.nkbv_fact_mau_so_phau_thuat s
    WHERE s.is_active = true
      AND s.ngay_phau_thuat >= p_tu_ngay
      AND s.ngay_phau_thuat <= p_den_ngay
    GROUP BY s.khoa_id
  ),
  khoa_keys AS (
    SELECT id AS khoa_id, ma_khoa::text AS ma_khoa, ten_khoa::text AS ten_khoa
    FROM public.mdm_dm_khoa_phong
    WHERE is_active = true
    UNION ALL
    SELECT NULL::uuid, NULL::text, 'Chưa quy kết khoa'::text
    WHERE EXISTS (SELECT 1 FROM ca_counts c WHERE c.khoa_ghi_nhan_id IS NULL)
  ),
  joined AS (
    SELECT
      k.khoa_id,
      k.ma_khoa,
      k.ten_khoa,
      COALESCE(c.vap_cases, 0) AS vap_cases,
      COALESCE(c.vae_cases, 0) AS vae_cases,
      COALESCE(c.clabsi_cases, 0) AS clabsi_cases,
      COALESCE(c.mbi_lcbi_cases, 0) AS mbi_lcbi_cases,
      COALESCE(c.cauti_cases, 0) AS cauti_cases,
      COALESCE(c.ssi_cases, 0) AS ssi_cases,
      COALESCE(m.total_vent_days, 0) AS vent_days,
      COALESCE(m.total_cvc_days, 0) AS cvc_days,
      COALESCE(m.total_foley_days, 0) AS foley_days,
      COALESCE(m.total_patient_days, 0) AS patient_days,
      COALESCE(m.total_emv_episodes, 0) AS emv_episodes,
      COALESCE(s.total_surgeries, 0) AS total_surgeries,
      s.expected_ssi_cases,
      b.b_clabsi_rate, b.b_cvc_dur,
      b.b_vae_rate, b.b_vent_dur,
      b.b_cauti_rate, b.b_foley_dur
    FROM khoa_keys k
    LEFT JOIN ca_counts c ON c.khoa_ghi_nhan_id IS NOT DISTINCT FROM k.khoa_id
    LEFT JOIN mau_so_sums m ON m.khoa_id IS NOT DISTINCT FROM k.khoa_id
    LEFT JOIN baselines b ON b.khoa_id IS NOT DISTINCT FROM k.khoa_id
    LEFT JOIN ssi_sums s ON s.khoa_id IS NOT DISTINCT FROM k.khoa_id
    WHERE (p_khoa_id IS NULL OR k.khoa_id IS NOT DISTINCT FROM p_khoa_id)
  ),
  predicted AS (
    SELECT
      j.*,
      (j.cvc_days * j.b_clabsi_rate) / 1000.0 AS pred_clabsi,
      (j.vent_days * j.b_vae_rate) / 1000.0 AS pred_vae,
      (j.foley_days * j.b_cauti_rate) / 1000.0 AS pred_cauti
    FROM joined j
  )
  SELECT
    p.khoa_id,
    p.ma_khoa,
    p.ten_khoa,
    p.vap_cases::bigint,
    p.vae_cases::bigint,
    p.clabsi_cases::bigint,
    p.mbi_lcbi_cases::bigint,
    p.cauti_cases::bigint,
    p.ssi_cases::bigint,
    p.vent_days::bigint,
    p.cvc_days::bigint,
    p.foley_days::bigint,
    p.patient_days::bigint,
    p.emv_episodes::bigint,
    p.total_surgeries::bigint,
    CASE WHEN p.cvc_days > 0
      THEN ROUND((p.clabsi_cases::numeric / p.cvc_days) * 1000, 2) END,
    CASE WHEN p.cvc_days > 0
      THEN ROUND((p.mbi_lcbi_cases::numeric / p.cvc_days) * 1000, 2) END,
    CASE WHEN p.patient_days > 0
      THEN ROUND(p.cvc_days::numeric / p.patient_days, 4) END,
    CASE WHEN p.pred_clabsi >= 1
      THEN ROUND(p.clabsi_cases::numeric / p.pred_clabsi, 2) END,
    CASE WHEN p.patient_days > 0 AND p.b_cvc_dur > 0
      THEN ROUND(p.cvc_days::numeric / (p.patient_days * p.b_cvc_dur), 2) END,
    CASE WHEN p.vent_days > 0
      THEN ROUND((p.vap_cases::numeric / p.vent_days) * 1000, 2) END,
    CASE WHEN p.vent_days > 0
      THEN ROUND((p.vae_cases::numeric / p.vent_days) * 1000, 2) END,
    CASE WHEN p.emv_episodes > 0
      THEN ROUND((p.vae_cases::numeric / p.emv_episodes) * 100, 2) END,
    CASE WHEN p.patient_days > 0
      THEN ROUND(p.vent_days::numeric / p.patient_days, 4) END,
    CASE WHEN p.pred_vae >= 1
      THEN ROUND(p.vae_cases::numeric / p.pred_vae, 2) END,
    CASE WHEN p.patient_days > 0 AND p.b_vent_dur > 0
      THEN ROUND(p.vent_days::numeric / (p.patient_days * p.b_vent_dur), 2) END,
    CASE WHEN p.foley_days > 0
      THEN ROUND((p.cauti_cases::numeric / p.foley_days) * 1000, 2) END,
    CASE WHEN p.patient_days > 0
      THEN ROUND(p.foley_days::numeric / p.patient_days, 4) END,
    CASE WHEN p.pred_cauti >= 1
      THEN ROUND(p.cauti_cases::numeric / p.pred_cauti, 2) END,
    CASE WHEN p.patient_days > 0 AND p.b_foley_dur > 0
      THEN ROUND(p.foley_days::numeric / (p.patient_days * p.b_foley_dur), 2) END,
    CASE WHEN p.total_surgeries > 0
      THEN ROUND((p.ssi_cases::numeric / p.total_surgeries) * 100, 2) END,
    CASE WHEN p.expected_ssi_cases >= 1
      THEN ROUND(p.ssi_cases::numeric / p.expected_ssi_cases, 2) END
  FROM predicted p;
END;
$$;

COMMENT ON FUNCTION public.fn_nkbv_dich_te_hoc_rates(date, date, uuid) IS
  'NKBV-03: kỳ theo DOE (SSI theo ngày mổ); khoa theo loa_khoa_id; null khoa = Chưa quy kết khoa. Fallback JSON nếu cột chưa backfill.';

-- SSI by surgery: tử số theo ngày mổ cột / JSON
CREATE OR REPLACE FUNCTION public.fn_nkbv_ssi_rates_by_surgery(
  "p_tu_ngay" date,
  "p_den_ngay" date
)
RETURNS TABLE(
  "loai_phau_thuat_nhsn" text,
  "total_surgeries" bigint,
  "obs_ssi_cases" bigint,
  "expected_ssi_cases" numeric,
  "ssi_raw_rate" numeric,
  "ssi_sir" numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  WITH ssi_cases AS (
    SELECT
      upper(btrim(coalesce(
        s.verification_data->>'loai_phau_thuat_nhsn',
        s.verification_data->'ssi_reporting'->>'loai_phau_thuat_nhsn',
        ''
      ))) AS proc_code
    FROM public.nkbv_fact_su_kien s
    WHERE s.is_active = true
      AND s.verification_data->'is_positive' = 'true'::jsonb
      AND public.fn_nkbv_major_type_from_classification(
        upper(btrim(coalesce(s.verification_data->>'classification', '')))
      ) = 'SSI'
      AND s.trang_thai_id IN (
        SELECT t.id FROM public.nkbv_dm_trang_thai_ca t
        WHERE t.ma_trang_thai = 'XAC_NHAN' AND t.is_active = true
      )
      AND COALESCE(
        s.ngay_phau_thuat,
        NULLIF(btrim(s.verification_data->>'ngay_phau_thuat'), '')::date,
        NULLIF(btrim(s.verification_data->>'surgery_date'), '')::date
      ) BETWEEN p_tu_ngay AND p_den_ngay
  ),
  case_counts AS (
    SELECT proc_code AS loai_phau_thuat_nhsn, COUNT(*)::bigint AS obs_ssi_cases
    FROM ssi_cases
    WHERE proc_code <> ''
    GROUP BY proc_code
  ),
  surg AS (
    SELECT
      upper(btrim(coalesce(s.loai_phau_thuat_nhsn, ''))) AS loai_phau_thuat_nhsn,
      COUNT(s.id)::bigint AS total_surgeries,
      SUM(s.expected_ssi_prob) AS expected_ssi_cases
    FROM public.nkbv_fact_mau_so_phau_thuat s
    WHERE s.is_active = true
      AND s.ngay_phau_thuat >= p_tu_ngay
      AND s.ngay_phau_thuat <= p_den_ngay
    GROUP BY 1
  )
  SELECT
    coalesce(s.loai_phau_thuat_nhsn, c.loai_phau_thuat_nhsn),
    coalesce(s.total_surgeries, 0),
    coalesce(c.obs_ssi_cases, 0),
    s.expected_ssi_cases,
    CASE WHEN coalesce(s.total_surgeries, 0) > 0
      THEN ROUND((coalesce(c.obs_ssi_cases, 0)::numeric / s.total_surgeries) * 100, 2) END,
    CASE WHEN coalesce(s.expected_ssi_cases, 0) >= 1
      THEN ROUND(coalesce(c.obs_ssi_cases, 0)::numeric / s.expected_ssi_cases, 2) END
  FROM surg s
  FULL OUTER JOIN case_counts c ON c.loai_phau_thuat_nhsn = s.loai_phau_thuat_nhsn;
END;
$$;

COMMIT;
