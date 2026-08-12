-- NKBV P0 — tỷ suất/SIR: RPC trỏ đúng bảng, tử số theo classification của Rules Engine,
-- suppression numPred < 1 (SSOT §18.4), RLS bảng baseline, index cho cột lọc nóng.
--
-- Bối cảnh: fn_nkbv_dich_te_hoc_rates / fn_nkbv_ssi_rates_by_surgery còn đọc
-- public.fact_giam_sat_nkbv_ca (bảng không tồn tại từ 20260602180000) nên luôn lỗi runtime;
-- ngoài ra tử số cũ lọc theo vi_tri_nhiem_khuan (text tự do, app ghi nhãn tiếng Việt) → luôn 0.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Ánh xạ classification (output Rules Engine) → major type NKBV
--    SSOT phía app: src/modules/giam-sat-nkbv/lib/nkbv-classification-taxonomy.ts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_nkbv_major_type_from_classification(p_classification text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN upper(btrim(coalesce(p_classification, ''))) = '' THEN 'OTHER'
    WHEN upper(btrim(p_classification)) IN
      ('CLABSI', 'MBI_LCBI', 'PRIMARY_BSI_NON_CLABSI', 'SECONDARY_BSI') THEN 'BSI'
    WHEN upper(btrim(p_classification)) IN
      ('CAUTI_SUTI', 'CAUTI_SUTI_2', 'CAUTI_ABUTI', 'SUTI', 'SUTI_2', 'ABUTI') THEN 'UTI'
    WHEN upper(btrim(p_classification)) IN ('VAC', 'IVAC', 'PVAP') THEN 'VAE'
    WHEN upper(btrim(p_classification)) ~ '^PNU[123]_(VAP|HAP)$' THEN 'PNEU'
    WHEN upper(btrim(p_classification)) IN ('SIP', 'SIS', 'DIP', 'DIS')
      OR upper(btrim(p_classification)) LIKE 'ORGAN_SPACE%' THEN 'SSI'
    ELSE 'OTHER'
  END;
$$;

COMMENT ON FUNCTION public.fn_nkbv_major_type_from_classification(text) IS
  'Major type NKBV từ verification_data->>classification (Rules Engine). Mirror của nkbv-classification-taxonomy.ts.';

-- ---------------------------------------------------------------------------
-- 2. Index cho cột lọc nóng của RPC tỷ suất và danh sách phiếu
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_nkbv_su_kien_ngay_khoa_tt
  ON public.nkbv_fact_su_kien (ngay_phat_hien DESC, khoa_ghi_nhan_id, trang_thai_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_nkbv_benh_an_khoa
  ON public.nkbv_fact_benh_an (khoa_dieu_tri_id);

CREATE INDEX IF NOT EXISTS idx_nkbv_mau_so_pt_khoa_ngay
  ON public.nkbv_fact_mau_so_phau_thuat (khoa_id, ngay_phau_thuat)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 3. RPC dịch tễ học — tử số theo classification, SIR/SUR có suppression
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_nkbv_dich_te_hoc_rates(
  "p_tu_ngay" date,
  "p_den_ngay" date,
  "p_khoa_id" uuid DEFAULT NULL::uuid
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
AS $$
BEGIN
  RETURN QUERY
  WITH ca_lock AS (
    SELECT
      s.khoa_ghi_nhan_id,
      upper(btrim(coalesce(s.verification_data->>'classification', ''))) AS cls
    FROM public.nkbv_fact_su_kien s
    WHERE s.is_active = true
      AND s.ngay_phat_hien >= p_tu_ngay
      AND s.ngay_phat_hien <= p_den_ngay
      AND s.verification_data->'is_positive' = 'true'::jsonb
      AND s.trang_thai_id IN (
        SELECT lv.id FROM public.sys_lookup_value lv
        WHERE lv.category_type = 'TRANG_THAI_NKBV_CA' AND lv.code = 'XAC_NHAN'
      )
  ),
  ca_counts AS (
    SELECT
      l.khoa_ghi_nhan_id,
      COUNT(*) FILTER (WHERE l.cls ~ '^PNU[123]_VAP$') AS vap_cases,
      COUNT(*) FILTER (WHERE l.cls IN ('VAC', 'IVAC', 'PVAP')) AS vae_cases,
      COUNT(*) FILTER (WHERE l.cls = 'CLABSI') AS clabsi_cases,
      COUNT(*) FILTER (WHERE l.cls = 'MBI_LCBI') AS mbi_lcbi_cases,
      COUNT(*) FILTER (WHERE l.cls LIKE 'CAUTI%') AS cauti_cases,
      COUNT(*) FILTER (
        WHERE public.fn_nkbv_major_type_from_classification(l.cls) = 'SSI'
      ) AS ssi_cases
    FROM ca_lock l
    GROUP BY l.khoa_ghi_nhan_id
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
  joined AS (
    SELECT
      k.id AS khoa_id,
      k.ma_khoa::text AS ma_khoa,
      k.ten_khoa::text AS ten_khoa,
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
    FROM public.mdm_dm_khoa_phong k
    LEFT JOIN ca_counts c ON k.id = c.khoa_ghi_nhan_id
    LEFT JOIN mau_so_sums m ON k.id = m.khoa_id
    LEFT JOIN baselines b ON k.id = b.khoa_id
    LEFT JOIN ssi_sums s ON k.id = s.khoa_id
    WHERE k.is_active = true
      AND (p_khoa_id IS NULL OR k.id = p_khoa_id)
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

    -- CLABSI
    CASE WHEN p.cvc_days > 0
      THEN ROUND((p.clabsi_cases::numeric / p.cvc_days) * 1000, 2) END,
    CASE WHEN p.cvc_days > 0
      THEN ROUND((p.mbi_lcbi_cases::numeric / p.cvc_days) * 1000, 2) END,
    CASE WHEN p.patient_days > 0
      THEN ROUND(p.cvc_days::numeric / p.patient_days, 4) END,
    -- SSOT §18.4: numPred < 1 → không in SIR
    CASE WHEN p.pred_clabsi >= 1
      THEN ROUND(p.clabsi_cases::numeric / p.pred_clabsi, 2) END,
    CASE WHEN p.patient_days > 0 AND p.b_cvc_dur > 0
      THEN ROUND(p.cvc_days::numeric / (p.patient_days * p.b_cvc_dur), 2) END,

    -- VAP / VAE
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

    -- CAUTI
    CASE WHEN p.foley_days > 0
      THEN ROUND((p.cauti_cases::numeric / p.foley_days) * 1000, 2) END,
    CASE WHEN p.patient_days > 0
      THEN ROUND(p.foley_days::numeric / p.patient_days, 4) END,
    CASE WHEN p.pred_cauti >= 1
      THEN ROUND(p.cauti_cases::numeric / p.pred_cauti, 2) END,
    CASE WHEN p.patient_days > 0 AND p.b_foley_dur > 0
      THEN ROUND(p.foley_days::numeric / (p.patient_days * p.b_foley_dur), 2) END,

    -- SSI
    CASE WHEN p.total_surgeries > 0
      THEN ROUND((p.ssi_cases::numeric / p.total_surgeries) * 100, 2) END,
    CASE WHEN p.expected_ssi_cases >= 1
      THEN ROUND(p.ssi_cases::numeric / p.expected_ssi_cases, 2) END
  FROM predicted p;
END;
$$;

COMMENT ON FUNCTION public.fn_nkbv_dich_te_hoc_rates(date, date, uuid) IS
  'Tỷ suất/SIR/SUR NKBV theo khoa. Tử số = ca XAC_NHAN có verification_data.is_positive, phân loại theo classification. SIR trả NULL khi predicted < 1 (SSOT §18.4) hoặc chưa cấu hình baseline.';

-- ---------------------------------------------------------------------------
-- 4. RPC SSI theo loại phẫu thuật
-- ---------------------------------------------------------------------------

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
AS $$
BEGIN
  RETURN QUERY
  WITH ssi_cases AS (
    SELECT
      NULLIF(btrim(coalesce(
        c.verification_data->>'loai_phau_thuat_nhsn',
        c.verification_data#>>'{ssi_reporting,loai_phau_thuat_nhsn}'
      )), '') AS loai_pt_nhsn,
      COUNT(c.id) AS obs_ssi
    FROM public.nkbv_fact_su_kien c
    WHERE c.is_active = true
      AND c.ngay_phat_hien >= p_tu_ngay
      AND c.ngay_phat_hien <= p_den_ngay
      AND c.verification_data->'is_positive' = 'true'::jsonb
      AND public.fn_nkbv_major_type_from_classification(
            c.verification_data->>'classification'
          ) = 'SSI'
      AND c.trang_thai_id IN (
        SELECT lv.id FROM public.sys_lookup_value lv
        WHERE lv.category_type = 'TRANG_THAI_NKBV_CA' AND lv.code = 'XAC_NHAN'
      )
    GROUP BY 1
  ),
  surgeries AS (
    SELECT
      s.loai_phau_thuat_nhsn::text AS loai_pt_nhsn,
      COUNT(s.id) AS total_surg,
      SUM(s.expected_ssi_prob) AS expected_ssi
    FROM public.nkbv_fact_mau_so_phau_thuat s
    WHERE s.is_active = true
      AND s.ngay_phau_thuat >= p_tu_ngay
      AND s.ngay_phau_thuat <= p_den_ngay
    GROUP BY s.loai_phau_thuat_nhsn
  )
  SELECT
    COALESCE(s.loai_pt_nhsn, c.loai_pt_nhsn),
    COALESCE(s.total_surg, 0)::bigint,
    COALESCE(c.obs_ssi, 0)::bigint,
    COALESCE(s.expected_ssi, 0)::numeric,
    CASE WHEN COALESCE(s.total_surg, 0) > 0
      THEN ROUND((COALESCE(c.obs_ssi, 0)::numeric / s.total_surg) * 100, 2) END,
    CASE WHEN COALESCE(s.expected_ssi, 0) >= 1
      THEN ROUND(COALESCE(c.obs_ssi, 0)::numeric / s.expected_ssi, 2) END
  FROM surgeries s
  FULL OUTER JOIN ssi_cases c ON s.loai_pt_nhsn = c.loai_pt_nhsn;
END;
$$;

COMMENT ON FUNCTION public.fn_nkbv_ssi_rates_by_surgery(date, date) IS
  'SSI observed/predicted theo mã phẫu thuật NHSN. SIR NULL khi predicted < 1 (SSOT §18.4).';

-- ---------------------------------------------------------------------------
-- 5. RLS — nkbv_dm_cdc_baseline còn USING (true); labid thiếu policy DELETE
-- ---------------------------------------------------------------------------

ALTER TABLE public.nkbv_dm_cdc_baseline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_nkbv_cdc_baselines_select ON public.nkbv_dm_cdc_baseline;
DROP POLICY IF EXISTS dm_nkbv_cdc_baselines_insert ON public.nkbv_dm_cdc_baseline;
DROP POLICY IF EXISTS dm_nkbv_cdc_baselines_update ON public.nkbv_dm_cdc_baseline;
DROP POLICY IF EXISTS dm_nkbv_cdc_baselines_delete ON public.nkbv_dm_cdc_baseline;
DROP POLICY IF EXISTS nkbv_dm_cdc_baseline_select ON public.nkbv_dm_cdc_baseline;
DROP POLICY IF EXISTS nkbv_dm_cdc_baseline_insert ON public.nkbv_dm_cdc_baseline;
DROP POLICY IF EXISTS nkbv_dm_cdc_baseline_update ON public.nkbv_dm_cdc_baseline;
DROP POLICY IF EXISTS nkbv_dm_cdc_baseline_delete ON public.nkbv_dm_cdc_baseline;

CREATE POLICY nkbv_dm_cdc_baseline_select ON public.nkbv_dm_cdc_baseline
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_dm_cdc_baseline_insert ON public.nkbv_dm_cdc_baseline
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin());
CREATE POLICY nkbv_dm_cdc_baseline_update ON public.nkbv_dm_cdc_baseline
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin())
  WITH CHECK (public.fn_sys_is_admin());
CREATE POLICY nkbv_dm_cdc_baseline_delete ON public.nkbv_dm_cdc_baseline
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin());

DROP POLICY IF EXISTS nkbv_fact_labid_event_delete ON public.nkbv_fact_labid_event;
CREATE POLICY nkbv_fact_labid_event_delete ON public.nkbv_fact_labid_event
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete'));

GRANT DELETE ON public.nkbv_fact_labid_event TO authenticated;

COMMIT;
