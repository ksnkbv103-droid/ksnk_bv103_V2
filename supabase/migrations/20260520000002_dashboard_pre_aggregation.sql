-- Migration: 20260520000002_dashboard_pre_aggregation.sql
-- Description: Implement Pre-aggregated tables, Triggers, and refactor RPCs for KSNK Command Center Dashboard.

-- 1. DROP EXISTING TRIGGERS AND PL/PGSQL OBJECTS TO BE IDEMPOTENT
DROP TRIGGER IF EXISTS trg_sync_gsc_session ON public.fact_giam_sat_chung_sessions;
DROP TRIGGER IF EXISTS trg_sync_gsc_result ON public.fact_giam_sat_chung_results;
DROP TRIGGER IF EXISTS trg_sync_vst_session ON public.fact_giam_sat_vst_sessions;
DROP TRIGGER IF EXISTS trg_sync_vst_opp ON public.fact_giam_sat_vst;

DROP FUNCTION IF EXISTS public.fn_trigger_sync_gsc_session_row() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_gsc_result_row() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_vst_session_row() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_vst_opp_row() CASCADE;

DROP FUNCTION IF EXISTS public.fn_sync_single_gsc_session(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fn_sync_single_vst_session(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fn_sync_dashboard_pre_aggregates() CASCADE;
DROP FUNCTION IF EXISTS public.fn_get_session_stype(uuid, uuid) CASCADE;

-- DROP OLD OVERLOADS OF REFACTORED RPCS TO PREVENT TECHNICAL DEBT
DROP FUNCTION IF EXISTS public.rpc_get_compliance_dashboard_v2(date, date, text[], uuid[], uuid[], uuid[], text) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_get_vst_dashboard_v2(date, date, uuid[], text) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_get_vst_dashboard_v2(date, date, uuid[], uuid[], text, text) CASCADE;


-- 2. CREATE PRE-AGGREGATED TABLES
CREATE TABLE IF NOT EXISTS public.fact_gsc_dashboard_summary (
    session_id uuid NOT NULL,
    ngay_giam_sat date NOT NULL,
    bang_kiem_id uuid NOT NULL,
    khoa_id uuid,
    khu_vuc_id uuid,
    nghe_nghiep_id uuid,
    stype text NOT NULL,
    nguoi_giam_sat_id uuid,
    tong_phien bigint NOT NULL DEFAULT 1,
    tong_quan_sat bigint NOT NULL DEFAULT 0,
    tong_dat bigint NOT NULL DEFAULT 0,
    tong_vi_pham bigint NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_gsc_dashboard_summary_pkey PRIMARY KEY (session_id)
);

CREATE TABLE IF NOT EXISTS public.fact_gsc_violations_summary (
    session_id uuid NOT NULL,
    criterion_id uuid NOT NULL,
    ngay_giam_sat date NOT NULL,
    bang_kiem_id uuid NOT NULL,
    khoa_id uuid,
    khu_vuc_id uuid,
    nghe_nghiep_id uuid,
    stype text NOT NULL,
    nguoi_giam_sat_id uuid,
    tong_quan_sat bigint NOT NULL DEFAULT 0,
    tong_vi_pham bigint NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_gsc_violations_summary_pkey PRIMARY KEY (session_id, criterion_id)
);

CREATE TABLE IF NOT EXISTS public.fact_vst_sessions_summary (
    session_id uuid NOT NULL,
    ngay_giam_sat date NOT NULL,
    khoa_id uuid,
    khu_vuc_id uuid,
    stype text NOT NULL,
    nguoi_giam_sat_id uuid,
    tong_phien bigint NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_vst_sessions_summary_pkey PRIMARY KEY (session_id)
);

CREATE TABLE IF NOT EXISTS public.fact_vst_opportunities_summary (
    opportunity_id uuid NOT NULL,
    session_id uuid NOT NULL,
    ngay_giam_sat date NOT NULL,
    khoa_id uuid,
    khu_vuc_id uuid,
    nghe_nghiep_id uuid,
    stype text NOT NULL,
    nguoi_giam_sat_id uuid,
    is_tuan_thu boolean NOT NULL,
    dung_ky_thuat boolean,
    du_thoi_gian boolean,
    co_deo_gang boolean,
    so_co_hoi bigint NOT NULL DEFAULT 1,
    da_tuan_thu bigint NOT NULL DEFAULT 0,
    bo_sot bigint NOT NULL DEFAULT 0,
    loi_ky_thuat bigint NOT NULL DEFAULT 0,
    loi_thoi_gian bigint NOT NULL DEFAULT 0,
    lam_dung_gang bigint NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_vst_opportunities_summary_pkey PRIMARY KEY (opportunity_id)
);

CREATE TABLE IF NOT EXISTS public.fact_vst_moments_summary (
    opportunity_id uuid NOT NULL,
    moment_label text NOT NULL,
    session_id uuid NOT NULL,
    ngay_giam_sat date NOT NULL,
    khoa_id uuid,
    khu_vuc_id uuid,
    nghe_nghiep_id uuid,
    stype text NOT NULL,
    nguoi_giam_sat_id uuid,
    is_tuan_thu boolean NOT NULL,
    co_deo_gang boolean,
    so_quan_sat bigint NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_vst_moments_summary_pkey PRIMARY KEY (opportunity_id, moment_label)
);

-- 3. CREATE INDICES ON PRE-AGGREGATED TABLES
CREATE INDEX IF NOT EXISTS idx_gsc_sum_filters ON public.fact_gsc_dashboard_summary (ngay_giam_sat, khoa_id, nghe_nghiep_id, khu_vuc_id, stype);
CREATE INDEX IF NOT EXISTS idx_gsc_sum_supervisor ON public.fact_gsc_dashboard_summary (nguoi_giam_sat_id);

CREATE INDEX IF NOT EXISTS idx_gsc_viol_filters ON public.fact_gsc_violations_summary (ngay_giam_sat, khoa_id, nghe_nghiep_id, criterion_id);

CREATE INDEX IF NOT EXISTS idx_vst_sess_sum_filters ON public.fact_vst_sessions_summary (ngay_giam_sat, khoa_id, khu_vuc_id, stype);
CREATE INDEX IF NOT EXISTS idx_vst_sess_sum_supervisor ON public.fact_vst_sessions_summary (nguoi_giam_sat_id);

CREATE INDEX IF NOT EXISTS idx_vst_opp_sum_filters ON public.fact_vst_opportunities_summary (ngay_giam_sat, khoa_id, nghe_nghiep_id, khu_vuc_id, stype);
CREATE INDEX IF NOT EXISTS idx_vst_opp_sum_supervisor ON public.fact_vst_opportunities_summary (nguoi_giam_sat_id);

CREATE INDEX IF NOT EXISTS idx_vst_mom_sum_filters ON public.fact_vst_moments_summary (ngay_giam_sat, khoa_id, nghe_nghiep_id, moment_label);

-- 4. CREATE HELPER FUNCTION FOR SESSION STYPE
CREATE OR REPLACE FUNCTION public.fn_get_session_stype(p_nguoi_giam_sat_id uuid, p_target_khoa_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_ns_khoa_id uuid;
  v_ns_ma_khoa text;
  v_ns_ten_khoa text;
  v_t_ma_khoa text;
  v_t_ten_khoa text;
  v_stype text;
BEGIN
  IF p_nguoi_giam_sat_id IS NOT NULL THEN
    SELECT ns.khoa_id, k.ma_khoa, k.ten_khoa
    INTO v_ns_khoa_id, v_ns_ma_khoa, v_ns_ten_khoa
    FROM public.mdm_nhan_su ns
    LEFT JOIN public.dm_khoa_phong k ON ns.khoa_id = k.id
    WHERE ns.id = p_nguoi_giam_sat_id;
  END IF;

  IF p_target_khoa_id IS NOT NULL THEN
    SELECT k.ma_khoa, k.ten_khoa
    INTO v_t_ma_khoa, v_t_ten_khoa
    FROM public.dm_khoa_phong k
    WHERE k.id = p_target_khoa_id;
  END IF;

  IF (v_ns_ma_khoa IN ('KSNK', 'C18') OR v_ns_ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
     AND (v_t_ma_khoa IS NULL OR (v_t_ma_khoa NOT IN ('KSNK', 'C18') AND v_t_ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN
    v_stype := 'KSNK';
  ELSIF (
    (v_ns_ma_khoa IN ('KSNK', 'C18') OR v_ns_ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
    AND (v_t_ma_khoa IN ('KSNK', 'C18') OR v_t_ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
  )
  OR (v_ns_khoa_id IS NOT NULL AND p_target_khoa_id = v_ns_khoa_id) THEN
    v_stype := 'TU_GIAM_SAT';
  ELSIF v_ns_khoa_id IS NULL AND p_nguoi_giam_sat_id IS NULL THEN
    IF p_target_khoa_id IS NULL OR (v_t_ma_khoa NOT IN ('KSNK', 'C18') AND v_t_ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN
      v_stype := 'KSNK';
    ELSE
      v_stype := 'TU_GIAM_SAT';
    END IF;
  ELSE
    v_stype := 'CHEO';
  END IF;

  RETURN v_stype;
END;
$$;

-- 5. CREATE SYNC HELPER FUNCTIONS FOR INDIVIDUAL SESSIONS
CREATE OR REPLACE FUNCTION public.fn_sync_single_gsc_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.fact_gsc_dashboard_summary WHERE session_id = p_session_id;
  DELETE FROM public.fact_gsc_violations_summary WHERE session_id = p_session_id;

  IF EXISTS (SELECT 1 FROM public.fact_giam_sat_chung_sessions WHERE id = p_session_id AND is_active = true) THEN
    INSERT INTO public.fact_gsc_dashboard_summary (
      session_id, ngay_giam_sat, bang_kiem_id, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
      tong_phien, tong_quan_sat, tong_dat, tong_vi_pham
    )
    SELECT
      s.id, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id,
      1, COUNT(r.id), COUNT(r.id) FILTER (WHERE r.value = 'DAT'), COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT')
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    WHERE s.id = p_session_id
    GROUP BY s.id;

    INSERT INTO public.fact_gsc_violations_summary (
      session_id, criterion_id, ngay_giam_sat, bang_kiem_id, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
      tong_quan_sat, tong_vi_pham
    )
    SELECT
      s.id, r.criterion_id, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype, s.nguoi_giam_sat_id,
      COUNT(r.id), COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT')
    FROM public.fact_giam_sat_chung_sessions s
    INNER JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    WHERE s.id = p_session_id
    GROUP BY s.id, r.criterion_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_single_vst_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.fact_vst_sessions_summary WHERE session_id = p_session_id;
  DELETE FROM public.fact_vst_opportunities_summary WHERE session_id = p_session_id;
  DELETE FROM public.fact_vst_moments_summary WHERE session_id = p_session_id;

  IF EXISTS (SELECT 1 FROM public.fact_giam_sat_vst_sessions WHERE id = p_session_id AND is_active = true) THEN
    INSERT INTO public.fact_vst_sessions_summary (
      session_id, ngay_giam_sat, khoa_id, khu_vuc_id, stype, nguoi_giam_sat_id, tong_phien
    )
    SELECT
      s.id, s.ngay_giam_sat, s.khoa_id, s.khu_vuc_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id, 1
    FROM public.fact_giam_sat_vst_sessions s
    WHERE s.id = p_session_id;

    INSERT INTO public.fact_vst_opportunities_summary (
      opportunity_id, session_id, ngay_giam_sat, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
      is_tuan_thu, dung_ky_thuat, du_thoi_gian, co_deo_gang,
      so_co_hoi, da_tuan_thu, bo_sot, loi_ky_thuat, loi_thoi_gian, lam_dung_gang
    )
    SELECT
      d.id, d.session_id, s.ngay_giam_sat,
      COALESCE(d.khoa_id, s.khoa_id) AS eff_khoa,
      COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS eff_khu_vuc,
      d.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id,
      CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN true ELSE false END AS is_tuan_thu,
      d.dung_ky_thuat, d.du_thoi_gian, d.co_deo_gang,
      1,
      CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 1 ELSE 0 END,
      CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 0 ELSE 1 END,
      CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.dung_ky_thuat = false THEN 1 ELSE 0 END,
      CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.du_thoi_gian = false THEN 1 ELSE 0 END,
      CASE WHEN COALESCE(btrim(d.hanh_dong), '') NOT IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.co_deo_gang = true THEN 1 ELSE 0 END
    FROM public.fact_giam_sat_vst d
    JOIN public.fact_giam_sat_vst_sessions s ON d.session_id = s.id
    WHERE s.id = p_session_id;

    INSERT INTO public.fact_vst_moments_summary (
      opportunity_id, moment_label, session_id, ngay_giam_sat, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
      is_tuan_thu, co_deo_gang, so_quan_sat
    )
    SELECT
      d.id,
      btrim(m.moment_part, E' \t\n\r') AS moment_label,
      d.session_id, s.ngay_giam_sat,
      COALESCE(d.khoa_id, s.khoa_id) AS eff_khoa,
      COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS eff_khu_vuc,
      d.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id,
      CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN true ELSE false END AS is_tuan_thu,
      d.co_deo_gang, 1
    FROM public.fact_giam_sat_vst d
    JOIN public.fact_giam_sat_vst_sessions s ON d.session_id = s.id
    CROSS JOIN LATERAL regexp_split_to_table(regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'), E'\\s*,\\s*') AS m(moment_part)
    WHERE s.id = p_session_id AND btrim(m.moment_part, E' \t\n\r') <> ''
    
    UNION ALL
    
    SELECT
      d.id,
      '— Chưa ghi thời điểm trong phiếu'::text AS moment_label,
      d.session_id, s.ngay_giam_sat,
      COALESCE(d.khoa_id, s.khoa_id) AS eff_khoa,
      COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS eff_khu_vuc,
      d.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id,
      CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN true ELSE false END AS is_tuan_thu,
      d.co_deo_gang, 1
    FROM public.fact_giam_sat_vst d
    JOIN public.fact_giam_sat_vst_sessions s ON d.session_id = s.id
    WHERE s.id = p_session_id
      AND NOT EXISTS (
        SELECT 1
        FROM regexp_split_to_table(
          regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
          E'\\s*,\\s*'
        ) AS mp(part)
        WHERE btrim(mp.part, E' \t\n\r') <> ''
      );
  END IF;
END;
$$;

-- 6. CREATE TRIGGER FUNCTIONS FOR EVENTS
CREATE OR REPLACE FUNCTION public.fn_trigger_sync_gsc_session_row()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_sync_single_gsc_session(OLD.id);
  ELSE
    PERFORM public.fn_sync_single_gsc_session(NEW.id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_trigger_sync_gsc_result_row()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_sync_single_gsc_session(OLD.session_id);
  ELSE
    PERFORM public.fn_sync_single_gsc_session(NEW.session_id);
    IF TG_OP = 'UPDATE' AND OLD.session_id <> NEW.session_id THEN
      PERFORM public.fn_sync_single_gsc_session(OLD.session_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_trigger_sync_vst_session_row()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_sync_single_vst_session(OLD.id);
  ELSE
    PERFORM public.fn_sync_single_vst_session(NEW.id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_trigger_sync_vst_opp_row()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_sync_single_vst_session(OLD.session_id);
  ELSE
    PERFORM public.fn_sync_single_vst_session(NEW.session_id);
    IF TG_OP = 'UPDATE' AND OLD.session_id <> NEW.session_id THEN
      PERFORM public.fn_sync_single_vst_session(OLD.session_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. ATTACH TRIGGERS
CREATE TRIGGER trg_sync_gsc_session
AFTER INSERT OR UPDATE OR DELETE ON public.fact_giam_sat_chung_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_sync_gsc_session_row();

CREATE TRIGGER trg_sync_gsc_result
AFTER INSERT OR UPDATE OR DELETE ON public.fact_giam_sat_chung_results
FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_sync_gsc_result_row();

CREATE TRIGGER trg_sync_vst_session
AFTER INSERT OR UPDATE OR DELETE ON public.fact_giam_sat_vst_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_sync_vst_session_row();

CREATE TRIGGER trg_sync_vst_opp
AFTER INSERT OR UPDATE OR DELETE ON public.fact_giam_sat_vst
FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_sync_vst_opp_row();

-- 8. CREATE BULK SYNC FUNCTION
CREATE OR REPLACE FUNCTION public.fn_sync_dashboard_pre_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE public.fact_gsc_dashboard_summary;
  TRUNCATE TABLE public.fact_gsc_violations_summary;
  TRUNCATE TABLE public.fact_vst_sessions_summary;
  TRUNCATE TABLE public.fact_vst_opportunities_summary;
  TRUNCATE TABLE public.fact_vst_moments_summary;

  -- 1. GSC Sessions Summary
  INSERT INTO public.fact_gsc_dashboard_summary (
    session_id, ngay_giam_sat, bang_kiem_id, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
    tong_phien, tong_quan_sat, tong_dat, tong_vi_pham
  )
  SELECT
    s.id, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
    public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
    s.nguoi_giam_sat_id,
    1, COUNT(r.id), COUNT(r.id) FILTER (WHERE r.value = 'DAT'), COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT')
  FROM public.fact_giam_sat_chung_sessions s
  LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
  WHERE s.is_active = true
  GROUP BY s.id;

  -- 2. GSC Violations Summary
  INSERT INTO public.fact_gsc_violations_summary (
    session_id, criterion_id, ngay_giam_sat, bang_kiem_id, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
    tong_quan_sat, tong_vi_pham
  )
  SELECT
    s.id, r.criterion_id, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
    public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype, s.nguoi_giam_sat_id,
    COUNT(r.id), COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT')
  FROM public.fact_giam_sat_chung_sessions s
  INNER JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
  WHERE s.is_active = true
  GROUP BY s.id, r.criterion_id;

  -- 3. VST Sessions Summary
  INSERT INTO public.fact_vst_sessions_summary (
    session_id, ngay_giam_sat, khoa_id, khu_vuc_id, stype, nguoi_giam_sat_id, tong_phien
  )
  SELECT
    s.id, s.ngay_giam_sat, s.khoa_id, s.khu_vuc_id,
    public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
    s.nguoi_giam_sat_id, 1
  FROM public.fact_giam_sat_vst_sessions s
  WHERE s.is_active = true;

  -- 4. VST Opportunities Summary
  INSERT INTO public.fact_vst_opportunities_summary (
    opportunity_id, session_id, ngay_giam_sat, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
    is_tuan_thu, dung_ky_thuat, du_thoi_gian, co_deo_gang,
    so_co_hoi, da_tuan_thu, bo_sot, loi_ky_thuat, loi_thoi_gian, lam_dung_gang
  )
  SELECT
    d.id, d.session_id, s.ngay_giam_sat,
    COALESCE(d.khoa_id, s.khoa_id) AS eff_khoa,
    COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS eff_khu_vuc,
    d.nghe_nghiep_id,
    public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
    s.nguoi_giam_sat_id,
    CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN true ELSE false END AS is_tuan_thu,
    d.dung_ky_thuat, d.du_thoi_gian, d.co_deo_gang,
    1,
    CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 1 ELSE 0 END,
    CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 0 ELSE 1 END,
    CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.dung_ky_thuat = false THEN 1 ELSE 0 END,
    CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.du_thoi_gian = false THEN 1 ELSE 0 END,
    CASE WHEN COALESCE(btrim(d.hanh_dong), '') NOT IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.co_deo_gang = true THEN 1 ELSE 0 END
  FROM public.fact_giam_sat_vst d
  JOIN public.fact_giam_sat_vst_sessions s ON d.session_id = s.id
  WHERE s.is_active = true;

  -- 5. VST Moments Summary
  INSERT INTO public.fact_vst_moments_summary (
    opportunity_id, moment_label, session_id, ngay_giam_sat, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
    is_tuan_thu, co_deo_gang, so_quan_sat
  )
  SELECT
    d.id,
    btrim(m.moment_part, E' \t\n\r') AS moment_label,
    d.session_id, s.ngay_giam_sat,
    COALESCE(d.khoa_id, s.khoa_id) AS eff_khoa,
    COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS eff_khu_vuc,
    d.nghe_nghiep_id,
    public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
    s.nguoi_giam_sat_id,
    CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN true ELSE false END AS is_tuan_thu,
    d.co_deo_gang, 1
  FROM public.fact_giam_sat_vst d
  JOIN public.fact_giam_sat_vst_sessions s ON d.session_id = s.id
  CROSS JOIN LATERAL regexp_split_to_table(regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'), E'\\s*,\\s*') AS m(moment_part)
  WHERE s.is_active = true AND btrim(m.moment_part, E' \t\n\r') <> ''
  
  UNION ALL
  
  SELECT
    d.id,
    '— Chưa ghi thời điểm trong phiếu'::text AS moment_label,
    d.session_id, s.ngay_giam_sat,
    COALESCE(d.khoa_id, s.khoa_id) AS eff_khoa,
    COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS eff_khu_vuc,
    d.nghe_nghiep_id,
    public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
    s.nguoi_giam_sat_id,
    CASE WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN true ELSE false END AS is_tuan_thu,
    d.co_deo_gang, 1
  FROM public.fact_giam_sat_vst d
  JOIN public.fact_giam_sat_vst_sessions s ON d.session_id = s.id
  WHERE s.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM regexp_split_to_table(
        regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
        E'\\s*,\\s*'
      ) AS mp(part)
      WHERE btrim(mp.part, E' \t\n\r') <> ''
    );
END;
$$;

-- 9. REFACTOR RPC: rpc_get_compliance_dashboard_v2
CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_v2(
  p_tu_ngay date, p_den_ngay date, p_bang_kiem_mas text[] DEFAULT NULL::text[],
  p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[],
  p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[],
  p_supervision_type text DEFAULT 'ALL'::text
) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_sum jsonb;
  v_khoa jsonb;
  v_nghe jsonb;
  v_khu jsonb;
  v_trend jsonb;
  v_violation jsonb;
  v_source jsonb;
  v_part jsonb;
BEGIN
  -- 1. Summary KPIs
  SELECT jsonb_build_object(
    'tong_phien', COALESCE(SUM(tong_phien), 0),
    'tong_quan_sat', COALESCE(SUM(tong_quan_sat), 0),
    'tong_vi_pham', COALESCE(SUM(tong_vi_pham), 0),
    'ty_le_tuan_thu', CASE WHEN SUM(tong_quan_sat) > 0 THEN ROUND((SUM(tong_dat)::numeric * 100) / SUM(tong_quan_sat), 1) ELSE 0 END
  ) INTO v_sum
  FROM public.fact_gsc_dashboard_summary s
  LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_supervision_type = 'ALL' OR s.stype = p_supervision_type)
    AND (
      p_bang_kiem_mas IS NULL
      OR s.bang_kiem_id::text = ANY (p_bang_kiem_mas)
      OR EXISTS (
        SELECT 1 FROM public.dm_bang_kiem dbk
        WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY (p_bang_kiem_mas)
      )
    )
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
    AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids));

  -- 2. by department
  SELECT jsonb_agg(t) INTO v_khoa FROM (
    SELECT k.id, k.ten_khoa AS ten, SUM(s.tong_quan_sat) AS tong, SUM(s.tong_dat) AS dat,
           CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le
    FROM public.fact_gsc_dashboard_summary s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_supervision_type = 'ALL' OR s.stype = p_supervision_type)
      AND (
        p_bang_kiem_mas IS NULL
        OR s.bang_kiem_id::text = ANY (p_bang_kiem_mas)
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY (p_bang_kiem_mas)
        )
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    GROUP BY k.id, k.ten_khoa
    ORDER BY ty_le DESC LIMIT 50
  ) t;

  -- 3. by occupation
  SELECT jsonb_agg(t) INTO v_nghe FROM (
    SELECT COALESCE(n.id, md5(COALESCE(n.ten_nghe_nghiep, 'unknown'))::uuid) AS id, COALESCE(n.ten_nghe_nghiep, 'Không rõ') AS ten,
           SUM(s.tong_quan_sat) AS tong, SUM(s.tong_dat) AS dat,
           CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le
    FROM public.fact_gsc_dashboard_summary s
    LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_supervision_type = 'ALL' OR s.stype = p_supervision_type)
      AND (
        p_bang_kiem_mas IS NULL
        OR s.bang_kiem_id::text = ANY (p_bang_kiem_mas)
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY (p_bang_kiem_mas)
        )
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    GROUP BY n.id, n.ten_nghe_nghiep
    ORDER BY tong DESC
  ) t;

  -- 4. by area
  SELECT jsonb_agg(t) INTO v_khu FROM (
    SELECT COALESCE(kv.id, md5(COALESCE(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, COALESCE(kv.ten_khu_vuc, 'Không rõ') AS ten,
           SUM(s.tong_quan_sat) AS tong, SUM(s.tong_dat) AS dat,
           CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le
    FROM public.fact_gsc_dashboard_summary s
    LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_supervision_type = 'ALL' OR s.stype = p_supervision_type)
      AND (
        p_bang_kiem_mas IS NULL
        OR s.bang_kiem_id::text = ANY (p_bang_kiem_mas)
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY (p_bang_kiem_mas)
        )
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    GROUP BY kv.id, kv.ten_khu_vuc
    ORDER BY tong DESC
  ) t;

  -- 5. trend by month
  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') AS label, MIN(s.ngay_giam_sat) AS min_date,
           SUM(s.tong_quan_sat) AS tong, SUM(s.tong_dat) AS dat,
           CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le
    FROM public.fact_gsc_dashboard_summary s
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_supervision_type = 'ALL' OR s.stype = p_supervision_type)
      AND (
        p_bang_kiem_mas IS NULL
        OR s.bang_kiem_id::text = ANY (p_bang_kiem_mas)
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY (p_bang_kiem_mas)
        )
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    GROUP BY 1
  ) t;

  -- 6. by criterion violations
  SELECT jsonb_agg(t) INTO v_violation FROM (
    SELECT tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, SUM(s.tong_vi_pham) AS so_vi_pham, SUM(s.tong_quan_sat) AS tong_quan_sat,
           CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_vi_pham)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_vi_pham
    FROM public.fact_gsc_violations_summary s
    JOIN public.dm_tieu_chi_bang_kiem tc ON s.criterion_id = tc.id
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_supervision_type = 'ALL' OR s.stype = p_supervision_type)
      AND (
        p_bang_kiem_mas IS NULL
        OR s.bang_kiem_id::text = ANY (p_bang_kiem_mas)
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY (p_bang_kiem_mas)
        )
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    GROUP BY tc.id, tc.noi_dung
    HAVING SUM(s.tong_vi_pham) > 0
    ORDER BY so_vi_pham DESC LIMIT 20
  ) t;

  -- 7. by stype source
  SELECT jsonb_agg(t) INTO v_source FROM (
    SELECT 'Khoa KSNK' AS ten, COALESCE(SUM(tong_phien) FILTER (WHERE stype = 'KSNK'), 0) AS so_phien
    FROM public.fact_gsc_dashboard_summary s
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_bang_kiem_mas IS NULL
        OR s.bang_kiem_id::text = ANY (p_bang_kiem_mas)
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY (p_bang_kiem_mas)
        )
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    
    UNION ALL
    
    SELECT 'Giám sát chéo' AS ten, COALESCE(SUM(tong_phien) FILTER (WHERE stype = 'CHEO'), 0) AS so_phien
    FROM public.fact_gsc_dashboard_summary s
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_bang_kiem_mas IS NULL
        OR s.bang_kiem_id::text = ANY (p_bang_kiem_mas)
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY (p_bang_kiem_mas)
        )
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))

    UNION ALL

    SELECT 'Tự giám sát' AS ten, COALESCE(SUM(tong_phien) FILTER (WHERE stype = 'TU_GIAM_SAT'), 0) AS so_phien
    FROM public.fact_gsc_dashboard_summary s
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_bang_kiem_mas IS NULL
        OR s.bang_kiem_id::text = ANY (p_bang_kiem_mas)
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY (p_bang_kiem_mas)
        )
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
  ) t;

  -- 8. participation
  SELECT jsonb_agg(t) INTO v_part FROM (
    SELECT k.id, k.ten_khoa AS ten, COALESCE(SUM(s.tong_phien) FILTER (WHERE s.stype = 'TU_GIAM_SAT'), 0)::bigint AS so_phien
    FROM public.dm_khoa_phong k
    LEFT JOIN public.fact_gsc_dashboard_summary s ON k.id = s.khoa_id
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_bang_kiem_mas IS NULL
        OR s.bang_kiem_id::text = ANY (p_bang_kiem_mas)
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY (p_bang_kiem_mas)
        )
      )
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    WHERE k.is_active = true
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_khoa_ids IS NULL OR k.id = ANY (p_khoa_ids))
    GROUP BY k.id, k.ten_khoa
    ORDER BY so_phien ASC, k.ten_khoa ASC
  ) t;

  RETURN jsonb_build_object(
    'summary', v_sum,
    'by_khoa', COALESCE(v_khoa, '[]'::jsonb),
    'by_nghe_nghiep', COALESCE(v_nghe, '[]'::jsonb),
    'by_khu_vuc', COALESCE(v_khu, '[]'::jsonb),
    'trend', COALESCE(v_trend, '[]'::jsonb),
    'violations', COALESCE(v_violation, '[]'::jsonb),
    'supervision_sources', COALESCE(v_source, '[]'::jsonb),
    'participation', COALESCE(v_part, '[]'::jsonb)
  );
END;
$$;

-- 10. REFACTOR RPC: rpc_get_dashboard_khoa_overview_rows
CREATE OR REPLACE FUNCTION public.rpc_get_dashboard_khoa_overview_rows(
  p_tu_ngay date, p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[],
  p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[]
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH kscope AS (
    SELECT kp.id, kp.ten_khoa
    FROM public.dm_khoa_phong kp
    WHERE COALESCE(kp.is_active, true)
      AND (p_khoa_ids IS NULL OR kp.id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR kp.khoi_id IS NULL OR kp.khoi_id = ANY (p_khoi_ids))
  ),
  vst_co_tu AS (
    SELECT khoa_id, SUM(so_co_hoi)::bigint AS n
    FROM public.fact_vst_opportunities_summary
    WHERE ngay_giam_sat >= p_tu_ngay AND ngay_giam_sat <= p_den_ngay
      AND stype = 'TU_GIAM_SAT'
      AND (p_khoa_ids IS NULL OR khoa_id = ANY (p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR khu_vuc_id = ANY (p_khu_vuc_ids))
      AND (p_khoi_ids IS NULL OR EXISTS (
        SELECT 1 FROM public.dm_khoa_phong kp
        WHERE kp.id = khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
      ))
    GROUP BY khoa_id
  ),
  vst_ph_tu AS (
    SELECT s.khoa_id, SUM(s.tong_phien)::bigint AS n
    FROM public.fact_vst_sessions_summary s
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND s.stype = 'TU_GIAM_SAT'
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
      AND (p_khoi_ids IS NULL OR EXISTS (
        SELECT 1 FROM public.dm_khoa_phong kp
        WHERE kp.id = s.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
      ))
      AND (
        p_nghe_nghiep_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM public.fact_vst_opportunities_summary opp
          WHERE opp.session_id = s.session_id AND opp.nghe_nghiep_id = ANY (p_nghe_nghiep_ids)
        )
      )
    GROUP BY s.khoa_id
  ),
  gsc_tu AS (
    SELECT s.khoa_id, SUM(s.tong_phien)::bigint AS n
    FROM public.fact_gsc_dashboard_summary s
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND s.stype = 'TU_GIAM_SAT'
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
      AND (p_khoi_ids IS NULL OR EXISTS (
        SELECT 1 FROM public.dm_khoa_phong kp
        WHERE kp.id = s.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
      ))
    GROUP BY s.khoa_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'khoa_id', k.id::text,
        'ten_khoa', k.ten_khoa,
        'tu_gs_vst_co_hoi', COALESCE(vco.n, 0),
        'tu_gs_vst_phien', COALESCE(vph.n, 0),
        'tu_gs_gsc_phien', COALESCE(gt.n, 0)
      )
      ORDER BY k.ten_khoa
    ),
    '[]'::jsonb
  )
  FROM kscope k
  LEFT JOIN vst_co_tu vco ON vco.khoa_id = k.id
  LEFT JOIN vst_ph_tu vph ON vph.khoa_id = k.id
  LEFT JOIN gsc_tu gt ON gt.khoa_id = k.id
  WHERE
    COALESCE(vco.n, 0) > 0
    OR COALESCE(vph.n, 0) > 0
    OR COALESCE(gt.n, 0) > 0;
$$;

-- 11. REFACTOR RPC: rpc_get_dashboard_summary_table
CREATE OR REPLACE FUNCTION public.rpc_get_dashboard_summary_table(
  p_tu_ngay date, p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[]
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  CREATE TEMP TABLE _all_sess ON COMMIT DROP AS
  SELECT 'VST_WHO'::text AS ma_bk, 'Vệ sinh tay (WHO)'::text AS ten_bk, s.stype
  FROM public.fact_vst_sessions_summary s
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
    AND (p_khoi_ids IS NULL OR EXISTS (
      SELECT 1 FROM public.dm_khoa_phong kp
      WHERE kp.id = s.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
    ))

  UNION ALL

  SELECT COALESCE(NULLIF(btrim(dbk.ma_bk), ''), 'UNKNOWN') AS ma_bk,
         COALESCE(dbk.ten_bang_kiem, 'Không rõ') AS ten_bk,
         s.stype
  FROM public.fact_gsc_dashboard_summary s
  LEFT JOIN public.dm_bang_kiem dbk ON dbk.id = s.bang_kiem_id
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
    AND (p_khoi_ids IS NULL OR EXISTS (
      SELECT 1 FROM public.dm_khoa_phong kp
      WHERE kp.id = s.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
    ));

  SELECT jsonb_agg(t)
  INTO v_result
  FROM (
    SELECT ma_bk, ten_bk, count(*) AS tong, count(*) FILTER (WHERE stype = 'KSNK') AS ksnk,
           count(*) FILTER (WHERE stype = 'TU_GIAM_SAT') AS tu_gs, count(*) FILTER (WHERE stype = 'CHEO') AS cheo
    FROM _all_sess
    GROUP BY ma_bk, ten_bk
    ORDER BY tong DESC
  ) t;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 12. REFACTOR RPC: rpc_get_dashboard_ksnk_staff_supervision_stats
CREATE OR REPLACE FUNCTION public.rpc_get_dashboard_ksnk_staff_supervision_stats(
  p_tu_ngay date, p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[],
  p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    WITH ksnk_staff AS (
      SELECT DISTINCT ON (ns.id)
        ns.id,
        COALESCE(NULLIF(btrim(ns.ho_ten), ''), NULLIF(btrim(ns.ma_nv), ''), ns.id::text) AS ho_ten,
        COALESCE(NULLIF(btrim(ns.ma_nv), ''), '—') AS ma_nv
      FROM public.mdm_nhan_su ns
      LEFT JOIN public.dm_khoa_phong k ON ns.khoa_id = k.id
      LEFT JOIN public.dm_roles r ON ns.vai_tro_he_thong_id = r.id
      WHERE COALESCE(ns.is_active, true)
        AND (
          (
            k.id IS NOT NULL
            AND (k.ma_khoa IN ('KSNK', 'C18') OR k.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
          )
          OR (
            r.name IS NOT NULL
            AND (
              r.name ILIKE '%KSNK%'
              OR r.name ILIKE '%Kiểm soát%'
              OR r.name ILIKE '%Mạng lưới%'
              OR r.name ILIKE '%Tổ trưởng%'
            )
          )
        )
      ORDER BY ns.id
    ),
    vst_agg AS (
      SELECT
        o.nguoi_giam_sat_id AS ns_id,
        SUM(o.so_co_hoi)::bigint AS so_co_hoi_vst,
        COUNT(DISTINCT o.session_id)::bigint AS so_phien_vst
      FROM public.fact_vst_opportunities_summary o
      INNER JOIN ksnk_staff ks ON ks.id = o.nguoi_giam_sat_id
      WHERE o.ngay_giam_sat >= p_tu_ngay AND o.ngay_giam_sat <= p_den_ngay
        AND (p_khoa_ids IS NULL OR o.khoa_id = ANY (p_khoa_ids))
        AND (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
        AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY (p_khu_vuc_ids))
        AND (p_khoi_ids IS NULL OR EXISTS (
          SELECT 1 FROM public.dm_khoa_phong kp
          WHERE kp.id = o.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
        ))
      GROUP BY 1
    ),
    gsc_agg AS (
      SELECT
        s.nguoi_giam_sat_id AS ns_id,
        SUM(s.tong_phien)::bigint AS so_phien_gsc
      FROM public.fact_gsc_dashboard_summary s
      INNER JOIN ksnk_staff ks ON ks.id = s.nguoi_giam_sat_id
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
        AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
        AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
        AND (p_khoi_ids IS NULL OR EXISTS (
          SELECT 1 FROM public.dm_khoa_phong kp
          WHERE kp.id = s.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
        ))
      GROUP BY 1
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ks.id,
          'ho_ten', ks.ho_ten,
          'ma_nv', ks.ma_nv,
          'so_co_hoi_vst', COALESCE(v.so_co_hoi_vst, 0),
          'so_phien_vst', COALESCE(v.so_phien_vst, 0),
          'so_phien_gsc', COALESCE(g.so_phien_gsc, 0)
        )
        ORDER BY
          (COALESCE(v.so_co_hoi_vst, 0) + COALESCE(v.so_phien_vst, 0) + COALESCE(g.so_phien_gsc, 0)) DESC,
          ks.ho_ten
      ),
      '[]'::jsonb
    )
    FROM ksnk_staff ks
    LEFT JOIN vst_agg v ON v.ns_id = ks.id
    LEFT JOIN gsc_agg g ON g.ns_id = ks.id
  );
END;
$$;

-- 13. REFACTOR RPC: rpc_get_vst_dashboard_v2
CREATE OR REPLACE FUNCTION public.rpc_get_vst_dashboard_v2(
  p_tu_ngay date, p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[],
  p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[],
  p_trend_type text DEFAULT 'month'::text, p_supervision_type text DEFAULT 'ALL'::text
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'tu_ngay', p_tu_ngay,
    'den_ngay', p_den_ngay,
    'kpis', (
      SELECT jsonb_build_object(
        'tong_phien', COUNT(DISTINCT s.session_id),
        'tong_co_hoi', COALESCE(SUM(o.so_co_hoi), 0),
        'da_tuan_thu', COALESCE(SUM(o.da_tuan_thu), 0),
        'bo_sot', COALESCE(SUM(o.bo_sot), 0),
        'ty_le_tuan_thu', ROUND(COALESCE(SUM(o.da_tuan_thu) * 100.0 / NULLIF(SUM(o.so_co_hoi), 0), 0), 1)
      )
      FROM public.fact_vst_opportunities_summary o
      JOIN public.fact_vst_sessions_summary s ON o.session_id = s.session_id
      WHERE o.ngay_giam_sat >= p_tu_ngay AND o.ngay_giam_sat <= p_den_ngay
        AND (p_supervision_type = 'ALL' OR o.stype = p_supervision_type)
        AND (p_khoa_ids IS NULL OR o.khoa_id = ANY (p_khoa_ids))
        AND (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
        AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY (p_khu_vuc_ids))
        AND (p_khoi_ids IS NULL OR EXISTS (
          SELECT 1 FROM public.dm_khoa_phong kp
          WHERE kp.id = o.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
        ))
    ),
    'supervision_sources', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_phien DESC), '[]'::jsonb) FROM (
        SELECT
          CASE s.stype
            WHEN 'KSNK' THEN 'Chuyên trách (KSNK)'
            WHEN 'CHEO' THEN 'Giám sát chéo'
            ELSE 'Tự giám sát'
          END AS ten,
          SUM(s.tong_phien)::bigint AS so_phien
        FROM public.fact_vst_sessions_summary s
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
          AND (p_supervision_type = 'ALL' OR s.stype = p_supervision_type)
          AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
          AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
          AND (p_khoi_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.dm_khoa_phong kp
            WHERE kp.id = s.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
          ))
          AND (
            p_nghe_nghiep_ids IS NULL
            OR EXISTS (
              SELECT 1 FROM public.fact_vst_opportunities_summary opp
              WHERE opp.session_id = s.session_id AND opp.nghe_nghiep_id = ANY (p_nghe_nghiep_ids)
            )
          )
        GROUP BY s.stype
      ) t
    ),
    'by_moment_table', (
      WITH agg AS (
        SELECT
          m.moment_label,
          SUM(m.so_quan_sat)::bigint AS cnt_all,
          COUNT(*) FILTER (WHERE m.is_tuan_thu = false)::bigint AS n_bo_sot,
          SUM(m.so_quan_sat) FILTER (WHERE m.is_tuan_thu = true)::bigint AS n_dat,
          MIN(
            CASE m.moment_label
              WHEN 'Trước khi tiếp xúc người bệnh' THEN 1
              WHEN 'Trước khi làm thủ thuật vô khuẩn' THEN 2
              WHEN 'Sau khi có nguy cơ tiếp xúc với dịch' THEN 3
              WHEN 'Sau khi tiếp xúc người bệnh' THEN 4
              WHEN 'Sau khi tiếp xúc xung quanh người bệnh' THEN 5
              ELSE 99
            END
          ) AS sort_ord
        FROM public.fact_vst_moments_summary m
        WHERE m.ngay_giam_sat >= p_tu_ngay AND m.ngay_giam_sat <= p_den_ngay
          AND (p_supervision_type = 'ALL' OR m.stype = p_supervision_type)
          AND (p_khoa_ids IS NULL OR m.khoa_id = ANY (p_khoa_ids))
          AND (p_nghe_nghiep_ids IS NULL OR m.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
          AND (p_khu_vuc_ids IS NULL OR m.khu_vuc_id = ANY (p_khu_vuc_ids))
          AND (p_khoi_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.dm_khoa_phong kp
            WHERE kp.id = m.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
          ))
        GROUP BY m.moment_label
      ),
      tot AS (
        SELECT
          COALESCE(SUM(n_bo_sot), 0)::numeric AS t_bo_sot,
          COALESCE(SUM(n_dat), 0)::numeric AS t_dat
        FROM agg
      )
      SELECT COALESCE(jsonb_agg(j.obj ORDER BY j.sort_ord), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'ten', a.moment_label,
            'tong', a.cnt_all,
            'n_bo_sot', a.n_bo_sot,
            'n_dat', a.n_dat,
            'ty_le_bo_sot', COALESCE(ROUND(a.n_bo_sot * 100.0 / NULLIF((SELECT t_bo_sot FROM tot), 0), 1), 0),
            'ty_le_tuan_thu', COALESCE(ROUND(a.n_dat * 100.0 / NULLIF((SELECT t_dat FROM tot), 0), 1), 0)
          ) AS obj,
          a.sort_ord
        FROM agg a
      ) j
    ),
    'participation', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_phien DESC), '[]'::jsonb) FROM (
        SELECT
          k_eff.id::text AS id,
          k_eff.ten_khoa AS ten,
          COUNT(DISTINCT s.session_id)::bigint AS so_phien
        FROM public.fact_vst_sessions_summary s
        LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
        LEFT JOIN public.dm_khoa_phong k_eff ON k_eff.id = COALESCE(s.khoa_id, ns.khoa_id)
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
          AND (p_supervision_type = 'ALL' OR s.stype = p_supervision_type)
          AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
          AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
          AND (p_khoi_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.dm_khoa_phong kp
            WHERE kp.id = s.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
          ))
          AND (
            p_nghe_nghiep_ids IS NULL
            OR EXISTS (
              SELECT 1 FROM public.fact_vst_opportunities_summary opp
              WHERE opp.session_id = s.session_id AND opp.nghe_nghiep_id = ANY (p_nghe_nghiep_ids)
            )
          )
          AND k_eff.id IS NOT NULL
        GROUP BY k_eff.id, k_eff.ten_khoa
      ) t
    ),
    'by_khoa', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          k_eff.id::text AS id,
          COALESCE(k_eff.ten_khoa, '—') AS ten,
          SUM(o.so_co_hoi)::bigint AS tong,
          SUM(o.da_tuan_thu)::bigint AS dat,
          ROUND(SUM(o.da_tuan_thu) * 100.0 / NULLIF(SUM(o.so_co_hoi), 0), 1) AS ty_le
        FROM public.fact_vst_opportunities_summary o
        LEFT JOIN public.dm_khoa_phong k_eff ON k_eff.id = o.khoa_id
        WHERE o.ngay_giam_sat >= p_tu_ngay AND o.ngay_giam_sat <= p_den_ngay
          AND (p_supervision_type = 'ALL' OR o.stype = p_supervision_type)
          AND (p_khoa_ids IS NULL OR o.khoa_id = ANY (p_khoa_ids))
          AND (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
          AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY (p_khu_vuc_ids))
          AND (p_khoi_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.dm_khoa_phong kp
            WHERE kp.id = o.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
          ))
        GROUP BY k_eff.id, k_eff.ten_khoa
      ) t
    ),
    'by_khoi', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          COALESCE(kk.ten_khoi, '—') AS ten,
          SUM(o.so_co_hoi)::bigint AS tong,
          SUM(o.da_tuan_thu)::bigint AS dat,
          ROUND(SUM(o.da_tuan_thu) * 100.0 / NULLIF(SUM(o.so_co_hoi), 0), 1) AS ty_le
        FROM public.fact_vst_opportunities_summary o
        LEFT JOIN public.dm_khoa_phong k_eff ON k_eff.id = o.khoa_id
        LEFT JOIN public.dm_khoi_khoa kk ON kk.id = k_eff.khoi_id
        WHERE o.ngay_giam_sat >= p_tu_ngay AND o.ngay_giam_sat <= p_den_ngay
          AND (p_supervision_type = 'ALL' OR o.stype = p_supervision_type)
          AND (p_khoa_ids IS NULL OR o.khoa_id = ANY (p_khoa_ids))
          AND (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
          AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY (p_khu_vuc_ids))
          AND (p_khoi_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.dm_khoa_phong kp
            WHERE kp.id = o.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
          ))
        GROUP BY kk.id, kk.ten_khoi
      ) t
    ),
    'by_doi_tuong', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          COALESCE(nn.ten_nghe_nghiep, '—') AS ten,
          SUM(o.so_co_hoi)::bigint AS tong,
          SUM(o.da_tuan_thu)::bigint AS dat,
          ROUND(SUM(o.da_tuan_thu) * 100.0 / NULLIF(SUM(o.so_co_hoi), 0), 1) AS ty_le
        FROM public.fact_vst_opportunities_summary o
        LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
        WHERE o.ngay_giam_sat >= p_tu_ngay AND o.ngay_giam_sat <= p_den_ngay
          AND (p_supervision_type = 'ALL' OR o.stype = p_supervision_type)
          AND (p_khoa_ids IS NULL OR o.khoa_id = ANY (p_khoa_ids))
          AND (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
          AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY (p_khu_vuc_ids))
          AND (p_khoi_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.dm_khoa_phong kp
            WHERE kp.id = o.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
          ))
        GROUP BY nn.ten_nghe_nghiep
      ) t
    ),
    'by_khu_vuc', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          COALESCE(kv.ten_khu_vuc, '—') AS ten,
          SUM(o.so_co_hoi)::bigint AS tong,
          SUM(o.da_tuan_thu)::bigint AS dat,
          ROUND(SUM(o.da_tuan_thu) * 100.0 / NULLIF(SUM(o.so_co_hoi), 0), 1) AS ty_le
        FROM public.fact_vst_opportunities_summary o
        LEFT JOIN public.dm_khu_vuc_giam_sat kv ON o.khu_vuc_id = kv.id
        WHERE o.ngay_giam_sat >= p_tu_ngay AND o.ngay_giam_sat <= p_den_ngay
          AND (p_supervision_type = 'ALL' OR o.stype = p_supervision_type)
          AND (p_khoa_ids IS NULL OR o.khoa_id = ANY (p_khoa_ids))
          AND (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
          AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY (p_khu_vuc_ids))
          AND (p_khoi_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.dm_khoa_phong kp
            WHERE kp.id = o.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
          ))
        GROUP BY kv.ten_khu_vuc
      ) t
    ),
    'moment_missed', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_lan DESC), '[]'::jsonb) FROM (
        SELECT m.moment_label AS ten, COUNT(*) FILTER (WHERE m.is_tuan_thu = false)::bigint AS so_lan
        FROM public.fact_vst_moments_summary m
        WHERE m.ngay_giam_sat >= p_tu_ngay AND m.ngay_giam_sat <= p_den_ngay
          AND (p_supervision_type = 'ALL' OR m.stype = p_supervision_type)
          AND (p_khoa_ids IS NULL OR m.khoa_id = ANY (p_khoa_ids))
          AND (p_nghe_nghiep_ids IS NULL OR m.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
          AND (p_khu_vuc_ids IS NULL OR m.khu_vuc_id = ANY (p_khu_vuc_ids))
          AND (p_khoi_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.dm_khoa_phong kp
            WHERE kp.id = m.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
          ))
        GROUP BY m.moment_label
      ) t
    ),
    'glove_abuse_by_moment', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_lan DESC), '[]'::jsonb) FROM (
        SELECT m.moment_label AS ten, COUNT(*) FILTER (WHERE m.co_deo_gang = true AND m.is_tuan_thu = false)::bigint AS so_lan
        FROM public.fact_vst_moments_summary m
        WHERE m.ngay_giam_sat >= p_tu_ngay AND m.ngay_giam_sat <= p_den_ngay
          AND (p_supervision_type = 'ALL' OR m.stype = p_supervision_type)
          AND (p_khoa_ids IS NULL OR m.khoa_id = ANY (p_khoa_ids))
          AND (p_nghe_nghiep_ids IS NULL OR m.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
          AND (p_khu_vuc_ids IS NULL OR m.khu_vuc_id = ANY (p_khu_vuc_ids))
          AND (p_khoi_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.dm_khoa_phong kp
            WHERE kp.id = m.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
          ))
        GROUP BY m.moment_label
      ) t
    ),
    'trend', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ky), '[]'::jsonb) FROM (
        SELECT
          to_char(o.ngay_giam_sat, 'YYYY-MM') AS ky,
          to_char(o.ngay_giam_sat, 'MM/YYYY') AS label,
          SUM(o.so_co_hoi)::bigint AS so_co_hoi,
          ROUND(SUM(o.da_tuan_thu) * 100.0 / NULLIF(SUM(o.so_co_hoi), 0), 1) AS ty_le
        FROM public.fact_vst_opportunities_summary o
        WHERE o.ngay_giam_sat >= p_tu_ngay AND o.ngay_giam_sat <= p_den_ngay
          AND (p_supervision_type = 'ALL' OR o.stype = p_supervision_type)
          AND (p_khoa_ids IS NULL OR o.khoa_id = ANY (p_khoa_ids))
          AND (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
          AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY (p_khu_vuc_ids))
          AND (p_khoi_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.dm_khoa_phong kp
            WHERE kp.id = o.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
          ))
        GROUP BY 1, 2
      ) t
    ),
    'error_breakdown', (
      SELECT jsonb_build_object(
        'loi_ky_thuat', SUM(o.loi_ky_thuat),
        'loi_thoi_gian', SUM(o.loi_thoi_gian),
        'lam_dung_gang', SUM(o.lam_dung_gang),
        'ty_le_lam_dung_gang', COALESCE(ROUND(SUM(o.lam_dung_gang) * 100.0 / NULLIF(SUM(o.bo_sot), 0), 1), 0),
        'ty_le_dung_ky_thuat', COALESCE(ROUND(SUM(o.da_tuan_thu - o.loi_ky_thuat) * 100.0 / NULLIF(SUM(o.da_tuan_thu), 0), 1), 0),
        'ty_le_du_thoi_gian', COALESCE(ROUND(SUM(o.da_tuan_thu - o.loi_thoi_gian) * 100.0 / NULLIF(SUM(o.da_tuan_thu), 0), 1), 0)
      )
      FROM public.fact_vst_opportunities_summary o
      WHERE o.ngay_giam_sat >= p_tu_ngay AND o.ngay_giam_sat <= p_den_ngay
        AND (p_supervision_type = 'ALL' OR o.stype = p_supervision_type)
        AND (p_khoa_ids IS NULL OR o.khoa_id = ANY (p_khoa_ids))
        AND (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
        AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY (p_khu_vuc_ids))
        AND (p_khoi_ids IS NULL OR EXISTS (
          SELECT 1 FROM public.dm_khoa_phong kp
          WHERE kp.id = o.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
        ))
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 14. REFACTOR RPC: rpc_get_vst_moment_table_only
CREATE OR REPLACE FUNCTION public.rpc_get_vst_moment_table_only(
  p_tu_ngay date, p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[],
  p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[],
  p_trend_type text DEFAULT 'month'::text, p_supervision_type text DEFAULT 'ALL'::text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH agg AS (
    SELECT
      m.moment_label,
      SUM(m.so_quan_sat)::bigint AS cnt_all,
      COUNT(*) FILTER (WHERE m.is_tuan_thu = false)::bigint AS n_bo_sot,
      SUM(m.so_quan_sat) FILTER (WHERE m.is_tuan_thu = true)::bigint AS n_dat,
      MIN(
        CASE m.moment_label
          WHEN 'Trước khi tiếp xúc người bệnh' THEN 1
          WHEN 'Trước khi làm thủ thuật vô khuẩn' THEN 2
          WHEN 'Sau khi có nguy cơ tiếp xúc với dịch' THEN 3
          WHEN 'Sau khi tiếp xúc người bệnh' THEN 4
          WHEN 'Sau khi tiếp xúc xung quanh người bệnh' THEN 5
          ELSE 99
        END
      ) AS sort_ord
    FROM public.fact_vst_moments_summary m
    WHERE m.ngay_giam_sat >= p_tu_ngay AND m.ngay_giam_sat <= p_den_ngay
      AND (p_supervision_type = 'ALL' OR m.stype = p_supervision_type)
      AND (p_khoa_ids IS NULL OR m.khoa_id = ANY (p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR m.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR m.khu_vuc_id = ANY (p_khu_vuc_ids))
      AND (p_khoi_ids IS NULL OR EXISTS (
        SELECT 1 FROM public.dm_khoa_phong kp
        WHERE kp.id = m.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
      ))
    GROUP BY m.moment_label
  ),
  tot AS (
    SELECT
      COALESCE(SUM(n_bo_sot), 0)::numeric AS t_bo_sot,
      COALESCE(SUM(n_dat), 0)::numeric AS t_dat
    FROM agg
  )
  SELECT COALESCE(jsonb_agg(j.obj ORDER BY j.sort_ord), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      jsonb_build_object(
        'ten', a.moment_label,
        'tong', a.cnt_all,
        'n_bo_sot', a.n_bo_sot,
        'n_dat', a.n_dat,
        'ty_le_bo_sot', COALESCE(ROUND(a.n_bo_sot * 100.0 / NULLIF((SELECT t_bo_sot FROM tot), 0), 1), 0),
        'ty_le_tuan_thu', COALESCE(ROUND(a.n_dat * 100.0 / NULLIF((SELECT t_dat FROM tot), 0), 1), 0)
      ) AS obj,
      a.sort_ord
    FROM agg a
  ) j;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 15. ENABLE ROW LEVEL SECURITY AND ADD SELECT POLICIES
ALTER TABLE public.fact_gsc_dashboard_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_gsc_violations_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_vst_sessions_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_vst_opportunities_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_vst_moments_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.fact_gsc_dashboard_summary;
CREATE POLICY "Allow select for authenticated users" ON public.fact_gsc_dashboard_summary
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.fact_gsc_violations_summary;
CREATE POLICY "Allow select for authenticated users" ON public.fact_gsc_violations_summary
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.fact_vst_sessions_summary;
CREATE POLICY "Allow select for authenticated users" ON public.fact_vst_sessions_summary
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.fact_vst_opportunities_summary;
CREATE POLICY "Allow select for authenticated users" ON public.fact_vst_opportunities_summary
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.fact_vst_moments_summary;
CREATE POLICY "Allow select for authenticated users" ON public.fact_vst_moments_summary
    FOR SELECT TO authenticated USING (true);

-- 16. NIGHTLY CRON JOB FOR PRE-AGGREGATES RESYNC
-- Enable pg_cron if it exists in the catalog or can be enabled
-- We use a DO block to execute this safely without throwing errors on environments where pg_cron is disabled/unavailable.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
    ) THEN
        -- Enable pg_cron extension
        CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
        
        -- Unschedule existing job if exists to be idempotent
        BEGIN
            PERFORM cron.unschedule('nightly-sync-dashboard-pre-aggregates');
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
        
        -- Schedule the nightly sync at 01:30 AM
        PERFORM cron.schedule(
            'nightly-sync-dashboard-pre-aggregates',
            '30 1 * * *',
            'SELECT public.fn_sync_dashboard_pre_aggregates()'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron extension setup skipped: %', SQLERRM;
END;
$$;


