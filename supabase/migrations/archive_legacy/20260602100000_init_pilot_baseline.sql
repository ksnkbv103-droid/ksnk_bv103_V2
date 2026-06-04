-- BV103 pilot baseline v2 (squashed 2026-06-02)
-- Replaces: baseline 20260530000000 + post_baseline chain (25 files in archive_legacy/post_baseline_20260530_20260602/)
-- Fresh local: npx supabase db reset --local

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: block_writes_for_migrated_danh_muc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.block_writes_for_migrated_danh_muc() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  blocked_types text[] := ARRAY[
    'KHOI_KHOA',
    'KHOA_PHONG',
    'TO_CONG_TAC',
    'CHUC_VU',
    'CHUC_DANH',
    'VAI_TRO_HE_THONG_KSNK',
    'KHU_VUC_GIAM_SAT',
    'NGHE_NGHIEP',
    'LOAI_DUNG_CU',
    'LOAI_SU_CO',
    'LOAI_MAY_TIET_KHUAN'
  ];
  target_type text;
BEGIN
  target_type := COALESCE(NEW.loai_danh_muc, OLD.loai_danh_muc);
  IF target_type = ANY(blocked_types) THEN
    RAISE EXCEPTION 'Loại danh mục % đã chuyển sang bảng dm_* — không được INSERT/UPDATE/DELETE trên danh_muc_tuy_bien', target_type;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: bv103_norm_label(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bv103_norm_label(p text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    AS $$
  SELECT trim(
    regexp_replace(
      translate(lower(public.unaccent(coalesce(p, ''))), 'đ', 'd'),
      '\s+',
      ' ',
      'g'
    )
  );
$$;


--
-- Name: FUNCTION bv103_norm_label(p text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.bv103_norm_label(p text) IS 'Chuẩn hóa nhãn tiếng Việt để backfill FK từ dữ liệu text legacy (VST/GSC).';


--
-- Name: fn_admin_module_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_admin_module_stats() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH core AS (
    SELECT 'loai'::text AS k,
           jsonb_build_object('count', count(*), 'last', max(updated_at)) AS v
      FROM public.cssd_dm_loai_dung_cu
    UNION ALL
    SELECT 'bo',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.cssd_dm_bo_dung_cu
    UNION ALL
    SELECT 'le',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.cssd_dm_bo_dung_cu_chi_tiet
    UNION ALL
    SELECT 'tb',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.cssd_dm_thiet_bi
    UNION ALL
    SELECT 'hc',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.cssd_dm_hoa_chat
    UNION ALL
    SELECT 'khoa',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.mdm_dm_khoa_phong
    UNION ALL
    SELECT 'ns',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.mdm_nhan_su
    UNION ALL
    SELECT 'bk',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.gstt_dm_bang_kiem
    UNION ALL
    SELECT 'tk',
           jsonb_build_object('count', count(*), 'last', NULL)
      FROM public.v_sys_user_permissions
  ),
  lookup_by_cat AS (
    SELECT category_type::text AS k,
           jsonb_build_object('count', count(*), 'last', max(updated_at)) AS v
      FROM public.sys_lookup_value
     GROUP BY category_type
  ),
  non_lookup_registry AS (
    SELECT 'KHOA_PHONG'::text AS k,
           jsonb_build_object('count', count(*), 'last', max(updated_at)) AS v
      FROM public.mdm_dm_khoa_phong
    UNION ALL
    SELECT 'LOAI_DUNG_CU',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.cssd_dm_loai_dung_cu
    UNION ALL
    SELECT 'VAI_TRO_HE_THONG_KSNK',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.sys_roles
    UNION ALL
    SELECT 'KHU_VUC_GIAM_SAT',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.gstt_dm_khu_vuc_giam_sat
  )
  SELECT jsonb_build_object(
    'core',     (SELECT jsonb_object_agg(k, v) FROM core),
    'registry', COALESCE((SELECT jsonb_object_agg(k, v) FROM lookup_by_cat), '{}'::jsonb)
              || COALESCE((SELECT jsonb_object_agg(k, v) FROM non_lookup_registry), '{}'::jsonb)
  );
$$;


--
-- Name: FUNCTION fn_admin_module_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_admin_module_stats() IS '1 round-trip dashboard stats cho trang Quản trị Danh mục (core 9 bảng + registry 18 loại).';


--
-- Name: fn_assert_vst_gsc_not_locked(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_assert_vst_gsc_not_locked() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_lock_date date;
  v_record_date date;
  v_module text;
BEGIN
  IF TG_TABLE_NAME = 'gstt_fact_vst_sessions' THEN
    v_module := 'VST';
  ELSIF TG_TABLE_NAME = 'gstt_fact_chung_sessions' THEN
    v_module := 'GSC';
  ELSE
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  SELECT locked_until_date INTO v_lock_date
  FROM public.sys_module_locks
  WHERE module_name = v_module
  LIMIT 1;

  IF v_lock_date IS NOT NULL THEN
    v_record_date := OLD.ngay_giam_sat;
    IF v_record_date IS NOT NULL AND v_record_date <= v_lock_date THEN
      RAISE EXCEPTION 'Dữ liệu giám sát % ngày % đã bị khóa cứng để chốt báo cáo thi đua. Không cho phép sửa đổi hoặc xóa!', v_module, v_record_date;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_cssd_check_set_heat_resistance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cssd_check_set_heat_resistance(p_bo_dung_cu_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_has_chiu_nhiet boolean := false;
    v_has_khong_chiu_nhiet boolean := false;
    v_result jsonb;
BEGIN
    -- Kiểm tra xem bộ có chứa dụng cụ chịu nhiệt cao hay không (is_chiu_nhiet = true)
    SELECT EXISTS (
        SELECT 1 FROM public.cssd_dm_bo_dung_cu_chi_tiet c
        JOIN public.cssd_dm_loai_dung_cu l ON c.loai_dung_cu_id = l.id
        WHERE c.bo_dung_cu_id = p_bo_dung_cu_id AND l.is_chiu_nhiet = true AND c.is_active = true
    ) INTO v_has_chiu_nhiet;

    -- Kiểm tra xem bộ có chứa dụng cụ không chịu nhiệt hay không (is_chiu_nhiet = false)
    SELECT EXISTS (
        SELECT 1 FROM public.cssd_dm_bo_dung_cu_chi_tiet c
        JOIN public.cssd_dm_loai_dung_cu l ON c.loai_dung_cu_id = l.id
        WHERE c.bo_dung_cu_id = p_bo_dung_cu_id AND l.is_chiu_nhiet = false AND c.is_active = true
    ) INTO v_has_khong_chiu_nhiet;

    IF v_has_chiu_nhiet AND v_has_khong_chiu_nhiet THEN
        v_result := jsonb_build_object(
            'is_hybrid', true,
            'lock_steam_134', true,
            'message', 'Bộ dụng cụ hỗn hợp (chứa cả cấu phần chịu nhiệt và KHÔNG chịu nhiệt). HỆ THỐNG KHÓA HẤP HƠI NƯỚC STEAM 134°C. Yêu cầu tách bộ!'
        );
    ELSE
        v_result := jsonb_build_object(
            'is_hybrid', false,
            'lock_steam_134', false,
            'message', 'Đồng nhất về tính chất chịu nhiệt.'
        );
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_session_stype(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_session_stype(p_nguoi_giam_sat_id uuid, p_target_khoa_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_ns_khoa_id uuid;
  v_ns_ma_khoa text;
  v_ns_ten_khoa text;
  v_t_ma_khoa text;
  v_t_ten_khoa text;
  v_stype text;
  v_is_ns_ksnk boolean := false;
  v_is_t_ksnk boolean := false;
BEGIN
  IF p_nguoi_giam_sat_id IS NOT NULL THEN
    SELECT ns.khoa_id, k.ma_khoa, k.ten_khoa
    INTO v_ns_khoa_id, v_ns_ma_khoa, v_ns_ten_khoa
    FROM public.mdm_nhan_su ns
    LEFT JOIN public.mdm_dm_khoa_phong k ON ns.khoa_id = k.id
    WHERE ns.id = p_nguoi_giam_sat_id;
  END IF;

  IF p_target_khoa_id IS NOT NULL THEN
    SELECT k.ma_khoa, k.ten_khoa
    INTO v_t_ma_khoa, v_t_ten_khoa
    FROM public.mdm_dm_khoa_phong k
    WHERE k.id = p_target_khoa_id;
  END IF;

  -- Xác định xem khoa có phải khoa KSNK không (dựa trên config trong lookup hoặc fallback cứng nếu lookup trống)
  v_is_ns_ksnk := (
    v_ns_ma_khoa IN ('KSNK', 'C18') 
    OR v_ns_ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'
    OR EXISTS (
      SELECT 1 FROM public.sys_lookup_value 
      WHERE category_type = 'KHOA_KSNK_CONFIG' 
        AND is_active = true 
        AND (code = v_ns_ma_khoa OR name = v_ns_ten_khoa)
    )
  );

  v_is_t_ksnk := (
    v_t_ma_khoa IN ('KSNK', 'C18')
    OR v_t_ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'
    OR EXISTS (
      SELECT 1 FROM public.sys_lookup_value 
      WHERE category_type = 'KHOA_KSNK_CONFIG' 
        AND is_active = true 
        AND (code = v_t_ma_khoa OR name = v_t_ten_khoa)
    )
  );

  IF v_is_ns_ksnk AND (v_t_ma_khoa IS NULL OR NOT v_is_t_ksnk) THEN
    v_stype := 'KSNK';
  ELSIF (v_is_ns_ksnk AND v_is_t_ksnk) OR (v_ns_khoa_id IS NOT NULL AND p_target_khoa_id = v_ns_khoa_id) THEN
    v_stype := 'TU_GIAM_SAT';
  ELSIF v_ns_khoa_id IS NULL AND p_nguoi_giam_sat_id IS NULL THEN
    IF p_target_khoa_id IS NULL OR NOT v_is_t_ksnk THEN
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


--
-- Name: fn_gstt_failure_reason_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_gstt_failure_reason_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: fn_gstt_rca_gen_ma_ticket(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_gstt_rca_gen_ma_ticket(p_created timestamp with time zone) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_date_part text;
  v_count     int;
BEGIN
  v_date_part := to_char(p_created AT TIME ZONE 'UTC', 'YYYYMMDD');
  SELECT count(*) INTO v_count
    FROM public.gstt_fact_rca_ticket
   WHERE (created_at AT TIME ZONE 'UTC')::date = (p_created AT TIME ZONE 'UTC')::date;
  RETURN format('RCA-%s-%s', v_date_part, lpad((v_count + 1)::text, 4, '0'));
END;
$$;


--
-- Name: FUNCTION fn_gstt_rca_gen_ma_ticket(p_created timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_gstt_rca_gen_ma_ticket(p_created timestamp with time zone) IS 'Slice 9: sinh mã ticket RCA-YYYYMMDD-NNNN. SECURITY DEFINER để đếm bypass RLS khi trigger gọi.';


--
-- Name: fn_inc_gia_han_so_lan(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_inc_gia_han_so_lan() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Chỉ tăng khi:
  --   1. han_hoan_thanh thực sự thay đổi
  --   2. Hạn mới > hạn cũ (gia hạn, không phải rút ngắn)
  --   3. Hạn cũ không NULL (không tính khi set hạn lần đầu)
  IF OLD.han_hoan_thanh IS NOT NULL
     AND NEW.han_hoan_thanh IS NOT NULL
     AND NEW.han_hoan_thanh > OLD.han_hoan_thanh
  THEN
    NEW.gia_han_so_lan := COALESCE(OLD.gia_han_so_lan, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_inc_gia_han_so_lan(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_inc_gia_han_so_lan() IS 'Tự động tăng gia_han_so_lan khi han_hoan_thanh bị dời sang ngày xa hơn (gia hạn thực sự).';


--
-- Name: fn_mdm_field_registry_attach_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_mdm_field_registry_attach_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Trigger attachment: on insert or active update
  IF NEW.field_role = 'FK_TO_DM' AND NEW.source_table = 'dm_lookup_value' AND NEW.is_active = true THEN
    EXECUTE format('DROP TRIGGER IF EXISTS trg_mdm_validate_lookup_%I ON public.%I', NEW.table_name, NEW.table_name);
    EXECUTE format('
      CREATE TRIGGER trg_mdm_validate_lookup_%I
      BEFORE INSERT OR UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.fn_mdm_validate_lookup_integrity()',
      NEW.table_name, NEW.table_name
    );
  ELSIF (TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false) THEN
    -- Trigger removal: on deactivation, check if any other active FK_TO_DM mapping exists for the table
    IF NOT EXISTS (
      SELECT 1 FROM public.mdm_field_registry
      WHERE table_name = OLD.table_name
        AND field_role = 'FK_TO_DM'
        AND source_table = 'dm_lookup_value'
        AND is_active = true
        AND id <> OLD.id
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_mdm_validate_lookup_%I ON public.%I', OLD.table_name, OLD.table_name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_mdm_field_registry_attach_trigger(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_mdm_field_registry_attach_trigger() IS 'Tự động sinh hoặc gỡ trigger kiểm toán trên bảng đích tương ứng khi registry thay đổi.';


--
-- Name: fn_mdm_validate_lookup_integrity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_mdm_validate_lookup_integrity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_rec record;
  v_val text;
  v_actual_type text;
  v_actual_active boolean;
BEGIN
  -- Fetch all active metadata constraints for the current table
  FOR v_rec IN 
    SELECT column_name, source_loai_danh_muc, is_required
    FROM public.mdm_field_registry
    WHERE table_name = TG_TABLE_NAME
      AND field_role = 'FK_TO_DM'
      AND source_table = 'dm_lookup_value'
      AND is_active = true
  LOOP
    -- Dynamically extract foreign key value from the NEW record
    v_val := to_jsonb(NEW)->>v_rec.column_name;
    
    IF v_val IS NOT NULL AND v_val <> '' THEN
      -- Query category_type and is_active flag in dm_lookup_value
      SELECT category_type, is_active 
      INTO v_actual_type, v_actual_active
      FROM public.sys_lookup_value
      WHERE id = v_val::uuid;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Lỗi toàn vẹn dữ liệu (MDM): Cột % trong bảng % có giá trị % không tồn tại trong dm_lookup_value.',
          v_rec.column_name, TG_TABLE_NAME, v_val;
      END IF;
      
      -- 1. Validate matching category_type (Smart Foreign Key Constraint)
      IF v_actual_type IS DISTINCT FROM v_rec.source_loai_danh_muc THEN
        RAISE EXCEPTION 'Lỗi toàn vẹn dữ liệu (MDM): Cột % trong bảng % trỏ đến bản ghi có loại % nhưng yêu cầu loại %.',
          v_rec.column_name, TG_TABLE_NAME, v_actual_type, v_rec.source_loai_danh_muc;
      END IF;
      
      -- 2. Validate active status (Real-time active lookups constraint)
      IF NOT v_actual_active THEN
        RAISE EXCEPTION 'Lỗi toàn vẹn dữ liệu (MDM): Cột % trong bảng % trỏ đến bản ghi danh mục % đã ngưng hoạt động.',
          v_rec.column_name, TG_TABLE_NAME, v_val;
      END IF;
      
    ELSIF v_rec.is_required THEN
      -- Validate NOT NULL if required
      RAISE EXCEPTION 'Lỗi toàn vẹn dữ liệu (MDM): Cột bắt buộc % trong bảng % không được phép trống.',
        v_rec.column_name, TG_TABLE_NAME;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_mdm_validate_lookup_integrity(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_mdm_validate_lookup_integrity() IS 'Hàm trigger động kiểm soát toàn vẹn liên kết lookup động dựa trên mdm_field_registry.';


--
-- Name: fn_nkbv_dich_te_hoc_rates(date, date, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_nkbv_dich_te_hoc_rates(p_tu_ngay date, p_den_ngay date, p_khoa_id uuid DEFAULT NULL::uuid) RETURNS TABLE(khoa_id uuid, ma_khoa text, ten_khoa text, obs_vap_cases bigint, obs_vae_cases bigint, obs_clabsi_cases bigint, obs_mbi_lcbi_cases bigint, obs_cauti_cases bigint, obs_ssi_cases bigint, obs_vent_days bigint, obs_cvc_days bigint, obs_foley_days bigint, obs_patient_days bigint, obs_emv_episodes bigint, obs_total_surgeries bigint, clabsi_rate_per_1000 numeric, mbi_lcbi_rate_per_1000 numeric, cvc_dur numeric, clabsi_sir numeric, cvc_sur numeric, vap_rate_per_1000 numeric, vae_rate_per_1000 numeric, vae_rate_per_100_emv numeric, vent_dur numeric, vae_sir numeric, vent_sur numeric, cauti_rate_per_1000 numeric, foley_dur numeric, cauti_sir numeric, foley_sur numeric, ssi_raw_rate numeric, ssi_sir numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH ca_counts AS (
        SELECT 
            c.khoa_ghi_nhan_id,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'VAP') AS vap_cases,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'VAE') AS vae_cases,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'BSI' AND (c.verification_data->>'classification') = 'CLABSI') AS clabsi_cases,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'BSI' AND (c.verification_data->>'classification') = 'MBI_LCBI') AS mbi_lcbi_cases,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'UTI' AND (c.verification_data->>'is_cauti') = 'true') AS cauti_cases,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'SSI') AS ssi_cases
        FROM public.fact_giam_sat_nkbv_ca c
        WHERE c.is_active = true 
          AND c.ngay_phat_hien >= p_tu_ngay 
          AND c.ngay_phat_hien <= p_den_ngay
          AND c.trang_thai_id IN (SELECT id FROM public.sys_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA' AND code = 'XAC_NHAN')
        GROUP BY c.khoa_ghi_nhan_id
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
            MAX(b.expected_infection_rate_per_1000) FILTER (WHERE b.loai_thiet_bi = 'VENT') AS b_vap_rate,
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
    )
    SELECT 
        k.id AS khoa_id,
        k.ma_khoa::text,
        k.ten_khoa::text,
        COALESCE(c.vap_cases, 0)::bigint AS obs_vap_cases,
        COALESCE(c.vae_cases, 0)::bigint AS obs_vae_cases,
        COALESCE(c.clabsi_cases, 0)::bigint AS obs_clabsi_cases,
        COALESCE(c.mbi_lcbi_cases, 0)::bigint AS obs_mbi_lcbi_cases,
        COALESCE(c.cauti_cases, 0)::bigint AS obs_cauti_cases,
        COALESCE(c.ssi_cases, 0)::bigint AS obs_ssi_cases,
        COALESCE(m.total_vent_days, 0)::bigint AS obs_vent_days,
        COALESCE(m.total_cvc_days, 0)::bigint AS obs_cvc_days,
        COALESCE(m.total_foley_days, 0)::bigint AS obs_foley_days,
        COALESCE(m.total_patient_days, 0)::bigint AS obs_patient_days,
        COALESCE(m.total_emv_episodes, 0)::bigint AS obs_emv_episodes,
        COALESCE(s.total_surgeries, 0)::bigint AS obs_total_surgeries,

        -- CLABSI rates
        CASE WHEN COALESCE(m.total_cvc_days, 0) > 0 THEN ROUND((COALESCE(c.clabsi_cases, 0)::numeric / m.total_cvc_days) * 1000, 2) ELSE 0 END::numeric AS clabsi_rate_per_1000,
        CASE WHEN COALESCE(m.total_cvc_days, 0) > 0 THEN ROUND((COALESCE(c.mbi_lcbi_cases, 0)::numeric / m.total_cvc_days) * 1000, 2) ELSE 0 END::numeric AS mbi_lcbi_rate_per_1000,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 THEN ROUND(m.total_cvc_days::numeric / m.total_patient_days, 4) ELSE 0 END::numeric AS cvc_dur,
        CASE WHEN COALESCE(m.total_cvc_days, 0) > 0 AND COALESCE(b.b_clabsi_rate, 0) > 0 
             THEN ROUND(COALESCE(c.clabsi_cases, 0)::numeric / ((m.total_cvc_days * b.b_clabsi_rate) / 1000), 2) ELSE 0 END::numeric AS clabsi_sir,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 AND COALESCE(b.b_cvc_dur, 0) > 0 
             THEN ROUND(m.total_cvc_days::numeric / (m.total_patient_days * b.b_cvc_dur), 2) ELSE 0 END::numeric AS cvc_sur,

        -- VAE & VAP rates
        CASE WHEN COALESCE(m.total_vent_days, 0) > 0 THEN ROUND((COALESCE(c.vap_cases, 0)::numeric / m.total_vent_days) * 1000, 2) ELSE 0 END::numeric AS vap_rate_per_1000,
        CASE WHEN COALESCE(m.total_vent_days, 0) > 0 THEN ROUND((COALESCE(c.vae_cases, 0)::numeric / m.total_vent_days) * 1000, 2) ELSE 0 END::numeric AS vae_rate_per_1000,
        CASE WHEN COALESCE(m.total_emv_episodes, 0) > 0 THEN ROUND((COALESCE(c.vae_cases, 0)::numeric / m.total_emv_episodes) * 100, 2) ELSE 0 END::numeric AS vae_rate_per_100_emv,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 THEN ROUND(m.total_vent_days::numeric / m.total_patient_days, 4) ELSE 0 END::numeric AS vent_dur,
        CASE WHEN COALESCE(m.total_vent_days, 0) > 0 AND COALESCE(b.b_vap_rate, 0) > 0 
             THEN ROUND(COALESCE(c.vae_cases, 0)::numeric / ((m.total_vent_days * b.b_vap_rate) / 1000), 2) ELSE 0 END::numeric AS vae_sir,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 AND COALESCE(b.b_vent_dur, 0) > 0 
             THEN ROUND(m.total_vent_days::numeric / (m.total_patient_days * b.b_vent_dur), 2) ELSE 0 END::numeric AS vent_sur,

        -- CAUTI rates
        CASE WHEN COALESCE(m.total_foley_days, 0) > 0 THEN ROUND((COALESCE(c.cauti_cases, 0)::numeric / m.total_foley_days) * 1000, 2) ELSE 0 END::numeric AS cauti_rate_per_1000,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 THEN ROUND(m.total_foley_days::numeric / m.total_patient_days, 4) ELSE 0 END::numeric AS foley_dur,
        CASE WHEN COALESCE(m.total_foley_days, 0) > 0 AND COALESCE(b.b_cauti_rate, 0) > 0 
             THEN ROUND(COALESCE(c.cauti_cases, 0)::numeric / ((m.total_foley_days * b.b_cauti_rate) / 1000), 2) ELSE 0 END::numeric AS cauti_sir,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 AND COALESCE(b.b_foley_dur, 0) > 0 
             THEN ROUND(m.total_foley_days::numeric / (m.total_patient_days * b.b_foley_dur), 2) ELSE 0 END::numeric AS foley_sur,

        -- SSI rates
        CASE WHEN COALESCE(s.total_surgeries, 0) > 0 THEN ROUND((COALESCE(c.ssi_cases, 0)::numeric / s.total_surgeries) * 100, 2) ELSE 0 END::numeric AS ssi_raw_rate,
        CASE WHEN COALESCE(s.expected_ssi_cases, 0) > 0 THEN ROUND(COALESCE(c.ssi_cases, 0)::numeric / s.expected_ssi_cases, 2) ELSE 0 END::numeric AS ssi_sir

    FROM public.mdm_dm_khoa_phong k
    LEFT JOIN ca_counts c ON k.id = c.khoa_ghi_nhan_id
    LEFT JOIN mau_so_sums m ON k.id = m.khoa_id
    LEFT JOIN baselines b ON k.id = b.khoa_id
    LEFT JOIN ssi_sums s ON k.id = s.khoa_id
    WHERE k.is_active = true
      AND (p_khoa_id IS NULL OR k.id = p_khoa_id);
END;
$$;


--
-- Name: fn_nkbv_ssi_rates_by_surgery(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_nkbv_ssi_rates_by_surgery(p_tu_ngay date, p_den_ngay date) RETURNS TABLE(loai_phau_thuat_nhsn text, total_surgeries bigint, obs_ssi_cases bigint, expected_ssi_cases numeric, ssi_raw_rate numeric, ssi_sir numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH ssi_cases AS (
        SELECT 
            (c.verification_data->>'loai_phau_thuat_nhsn')::text AS loai_pt_nhsn,
            COUNT(c.id) AS obs_ssi
        FROM public.fact_giam_sat_nkbv_ca c
        WHERE c.is_active = true 
          AND c.vi_tri_nhiem_khuan = 'SSI'
          AND c.ngay_phat_hien >= p_tu_ngay 
          AND c.ngay_phat_hien <= p_den_ngay
          AND c.trang_thai_id IN (SELECT id FROM public.sys_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA' AND code = 'XAC_NHAN')
        GROUP BY (c.verification_data->>'loai_phau_thuat_nhsn')
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
        COALESCE(s.loai_pt_nhsn, c.loai_pt_nhsn) AS loai_phau_thuat_nhsn,
        COALESCE(s.total_surg, 0)::bigint AS total_surgeries,
        COALESCE(c.obs_ssi, 0)::bigint AS obs_ssi_cases,
        COALESCE(s.expected_ssi, 0)::numeric AS expected_ssi_cases,
        CASE WHEN COALESCE(s.total_surg, 0) > 0 THEN ROUND((COALESCE(c.obs_ssi, 0)::numeric / s.total_surg) * 100, 2) ELSE 0 END::numeric AS ssi_raw_rate,
        CASE WHEN COALESCE(s.expected_ssi, 0) > 0 THEN ROUND(COALESCE(c.obs_ssi, 0)::numeric / s.expected_ssi, 2) ELSE 0 END::numeric AS ssi_sir
    FROM surgeries s
    FULL OUTER JOIN ssi_cases c ON s.loai_pt_nhsn = c.loai_pt_nhsn;
END;
$$;


--
-- Name: fn_qlcv_analytics_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_qlcv_analytics_summary(p_khoa_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_by_trang_thai  JSONB;
  v_gate_counts    JSONB;
  v_by_assignee    JSONB;
  v_on_time_rate   NUMERIC;
  v_pct_overdue    NUMERIC;
  v_tong           BIGINT;
  v_hoan_thanh     BIGINT;
  v_qua_han        BIGINT;
BEGIN
  -- 1. Đếm theo trạng thái (phiếu gốc, is_active=true)
  SELECT
    jsonb_object_agg(ts.code, cnt.n ORDER BY cnt.n DESC),
    SUM(cnt.n) FILTER (WHERE TRUE),
    SUM(cnt.n) FILTER (WHERE ts.code = 'HOAN_THANH'),
    SUM(cnt.n) FILTER (WHERE ts.code = 'QUA_HAN'
                          OR (cv.han_hoan_thanh < CURRENT_DATE
                              AND ts.code NOT IN ('HOAN_THANH','DA_HUY')))
  INTO v_by_trang_thai, v_tong, v_hoan_thanh, v_qua_han
  FROM (
    SELECT
      cv.trang_thai_id,
      COUNT(*) AS n
    FROM public.qlcv_fact_cong_viec cv
    WHERE cv.cong_viec_cha_id IS NULL
      AND cv.is_active = true
      AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id)
    GROUP BY cv.trang_thai_id
  ) cnt
  JOIN public.qlcv_fact_cong_viec cv ON TRUE -- bogus join for outer filter
  LEFT JOIN public.sys_lookup_value ts
    ON ts.id = cnt.trang_thai_id AND ts.category_type = 'TRANG_THAI_CONG_VIEC'
  GROUP BY TRUE;

  -- Simpler approach: đếm riêng từng bucket
  SELECT
    jsonb_build_object(
      'TONG', COUNT(*),
      'DANG_LAM', COUNT(*) FILTER (WHERE lv.code IN ('DANG_LAM','DANG_THUC_HIEN','CHO_NHAN_VIEC','CHUA_BAT_DAU')),
      'CHO_DUYET', COUNT(*) FILTER (WHERE lv.code IN ('CHO_DUYET','CHO_XAC_NHAN_HOAN_THANH')),
      'HOAN_THANH', COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH'),
      'QUA_HAN', COUNT(*) FILTER (WHERE lv.code = 'QUA_HAN'
                                     OR (cv.han_hoan_thanh < CURRENT_DATE AND lv.code NOT IN ('HOAN_THANH','DA_HUY'))),
      'DA_HUY', COUNT(*) FILTER (WHERE lv.code = 'DA_HUY'),
      'MOI', COUNT(*) FILTER (WHERE lv.code = 'MOI')
    )
  INTO v_by_trang_thai
  FROM public.qlcv_fact_cong_viec cv
  LEFT JOIN public.sys_lookup_value lv
    ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
  WHERE cv.cong_viec_cha_id IS NULL
    AND cv.is_active = true
    AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id);

  -- Tổng / hoàn thành / quá hạn
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH'),
    COUNT(*) FILTER (WHERE lv.code = 'QUA_HAN'
                       OR (cv.han_hoan_thanh < CURRENT_DATE AND lv.code NOT IN ('HOAN_THANH','DA_HUY')))
  INTO v_tong, v_hoan_thanh, v_qua_han
  FROM public.qlcv_fact_cong_viec cv
  LEFT JOIN public.sys_lookup_value lv
    ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
  WHERE cv.cong_viec_cha_id IS NULL
    AND cv.is_active = true
    AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id);

  -- 2. Gate counts (3 cổng)
  SELECT jsonb_build_object(
    'gate_dexuat',   COUNT(*) FILTER (WHERE cv.is_active = false AND lv.code NOT IN ('DA_HUY')),
    'gate_nhan',     COUNT(*) FILTER (WHERE lv.code IN ('CHO_NHAN_VIEC','MOI','CHUA_BAT_DAU') AND cv.is_active = true AND cv.nguoi_phu_trach_id IS NOT NULL),
    'gate_nghiemthu', COUNT(*) FILTER (WHERE lv.code IN ('CHO_DUYET','CHO_XAC_NHAN_HOAN_THANH'))
  )
  INTO v_gate_counts
  FROM public.qlcv_fact_cong_viec cv
  LEFT JOIN public.sys_lookup_value lv
    ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
  WHERE cv.cong_viec_cha_id IS NULL
    AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id);

  -- 3. By assignee — top 10 theo tổng, loại chưa phân công
  SELECT coalesce(jsonb_agg(t ORDER BY t->>'tong' DESC), '[]'::jsonb)
  INTO v_by_assignee
  FROM (
    SELECT jsonb_build_object(
      'nhan_su_id', cv.nguoi_phu_trach_id,
      'ho_ten', ns.ho_ten,
      'tong', COUNT(*),
      'hoan_thanh', COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH'),
      'qua_han', COUNT(*) FILTER (WHERE lv.code = 'QUA_HAN'
                                    OR (cv.han_hoan_thanh < CURRENT_DATE AND lv.code NOT IN ('HOAN_THANH','DA_HUY'))),
      'completion_pct', CASE WHEN COUNT(*) > 0
                              THEN ROUND(COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH')::NUMERIC * 100 / COUNT(*), 1)
                              ELSE 0 END
    ) AS t
    FROM public.qlcv_fact_cong_viec cv
    LEFT JOIN public.sys_lookup_value lv
      ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
    LEFT JOIN public.mdm_nhan_su ns ON ns.id = cv.nguoi_phu_trach_id
    WHERE cv.cong_viec_cha_id IS NULL
      AND cv.is_active = true
      AND cv.nguoi_phu_trach_id IS NOT NULL
      AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id)
    GROUP BY cv.nguoi_phu_trach_id, ns.ho_ten
    ORDER BY COUNT(*) DESC
    LIMIT 15
  ) sub;

  -- 4. On-time rate (dùng hoan_thanh_luc từ Sprint 1)
  SELECT
    CASE WHEN COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH') > 0
         THEN ROUND(
           COUNT(*) FILTER (
             WHERE lv.code = 'HOAN_THANH'
               AND cv.hoan_thanh_luc IS NOT NULL
               AND (cv.han_hoan_thanh IS NULL OR cv.hoan_thanh_luc::date <= cv.han_hoan_thanh)
           )::NUMERIC * 100 /
           COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH'), 1)
         ELSE 0
    END
  INTO v_on_time_rate
  FROM public.qlcv_fact_cong_viec cv
  LEFT JOIN public.sys_lookup_value lv
    ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
  WHERE cv.cong_viec_cha_id IS NULL
    AND cv.is_active = true
    AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id);

  -- 5. Pct overdue
  v_pct_overdue := CASE WHEN v_tong > 0 THEN ROUND(v_qua_han::NUMERIC * 100 / v_tong, 1) ELSE 0 END;

  RETURN jsonb_build_object(
    'tong',          v_tong,
    'hoan_thanh',    v_hoan_thanh,
    'qua_han',       v_qua_han,
    'on_time_rate',  v_on_time_rate,
    'pct_overdue',   v_pct_overdue,
    'by_trang_thai', COALESCE(v_by_trang_thai, '{}'::jsonb),
    'gate_counts',   COALESCE(v_gate_counts, '{}'::jsonb),
    'by_assignee',   COALESCE(v_by_assignee, '[]'::jsonb)
  );
END;
$$;


--
-- Name: FUNCTION fn_qlcv_analytics_summary(p_khoa_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_qlcv_analytics_summary(p_khoa_id uuid) IS 'Analytics QLCV server-side: đếm theo trạng thái, 3 cổng, top assignee, on-time rate, pct overdue. p_khoa_id=NULL → tất cả khoa.';


--
-- Name: fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  inserted int := 0;
  r record;
  due date := CURRENT_DATE;
  match_due boolean;
  v_loai_id uuid;
  v_tt_id uuid;
  v_checklist jsonb;
  anchor_months int;
  due_months int;
BEGIN
  SELECT id INTO v_loai_id FROM public.qlcv_dm_loai_cong_viec WHERE ma = 'DINH_KY' LIMIT 1;

  FOR r IN SELECT * FROM public.qlcv_fact_cong_viec_dinh_ky WHERE is_active = true LOOP
    IF r.ngay_bat_dau > due THEN CONTINUE; END IF;

    match_due := false;
    CASE r.ma_chu_ky
      WHEN 'DAILY' THEN
        match_due := true;
      WHEN 'WEEKLY' THEN
        match_due := mod((due - r.ngay_bat_dau)::integer, 7) = 0;
      WHEN 'MONTHLY' THEN
        match_due := extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
      WHEN 'QUARTERLY' THEN
        IF extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp) THEN
          anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau)::int;
          due_months := date_part('year', due)::int * 12 + date_part('month', due)::int;
          match_due := mod(due_months - anchor_months, 3) = 0;
        END IF;
      ELSE
        CONTINUE;
    END CASE;

    IF NOT match_due THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM public.qlcv_fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id AND c.han_hoan_thanh = due
    ) THEN CONTINUE; END IF;

    IF r.nguoi_phu_trach_id IS NOT NULL OR r.to_cong_tac_id IS NOT NULL THEN
      SELECT id INTO v_tt_id FROM public.qlcv_dm_trang_thai_cong_viec WHERE ma = 'DANG_LAM' LIMIT 1;
    ELSE
      SELECT id INTO v_tt_id FROM public.qlcv_dm_trang_thai_cong_viec WHERE ma = 'MOI' LIMIT 1;
    END IF;

    v_checklist := public.fn_qlcv_mo_ta_to_checklist(r.mo_ta);

    INSERT INTO public.qlcv_fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec_id, trang_thai_id, muc_do_uu_tien, han_hoan_thanh,
      nguoi_phu_trach_id, khoa_thuc_hien_id, to_cong_tac_id, dinh_ky_mau_id,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist
    ) VALUES (
      r.tieu_de, r.mo_ta, v_loai_id, v_tt_id, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      r.nguoi_phu_trach_id, r.khoa_thuc_hien_id, r.to_cong_tac_id, r.id,
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true, v_checklist
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$$;


--
-- Name: fn_qlcv_get_actor_khoa_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_qlcv_get_actor_khoa_id(p_nhan_su_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT khoa_id FROM public.mdm_nhan_su WHERE id = p_nhan_su_id LIMIT 1;
$$;


--
-- Name: FUNCTION fn_qlcv_get_actor_khoa_id(p_nhan_su_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_qlcv_get_actor_khoa_id(p_nhan_su_id uuid) IS 'Trả về khoa_id của nhân sự để áp dụng filter khoa trong QLCV (multi-tenant isolation).';


--
-- Name: fn_qlcv_mo_ta_to_checklist(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_qlcv_mo_ta_to_checklist(p_mo_ta text) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'label', trim(both from line),
        'done', false
      )
      ORDER BY ord
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      ord,
      regexp_replace(
        regexp_replace(trim(both from t.line), '^[-*•]\s+', ''),
        '^\d+[.)]\s+',
        ''
      ) AS line
    FROM regexp_split_to_table(COALESCE(p_mo_ta, ''), E'\n') WITH ORDINALITY AS t(line, ord)
  ) sub
  WHERE trim(both from line) <> '';
$$;


--
-- Name: fn_qlcv_update_checklist(uuid, jsonb, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_qlcv_update_checklist(p_cong_viec_id uuid, p_checklist jsonb, p_phan_tram_hoan_thanh integer DEFAULT NULL::integer, p_trang_thai_ma text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tt_id uuid;
  v_pct integer;
BEGIN
  IF p_cong_viec_id IS NULL THEN RAISE EXCEPTION 'p_cong_viec_id bắt buộc'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.qlcv_fact_cong_viec WHERE id = p_cong_viec_id) THEN
    RAISE EXCEPTION 'Không tìm thấy công việc %', p_cong_viec_id;
  END IF;
  v_pct := COALESCE(p_phan_tram_hoan_thanh, 0);
  IF p_trang_thai_ma IS NOT NULL AND btrim(p_trang_thai_ma) <> '' THEN
    SELECT id INTO v_tt_id FROM public.qlcv_dm_trang_thai_cong_viec WHERE ma = p_trang_thai_ma LIMIT 1;
    IF v_tt_id IS NULL THEN RAISE EXCEPTION 'Trạng thái không hợp lệ: %', p_trang_thai_ma; END IF;
  END IF;
  UPDATE public.qlcv_fact_cong_viec
     SET checklist = COALESCE(p_checklist, '[]'::jsonb),
         phan_tram_hoan_thanh = v_pct,
         trang_thai_id = COALESCE(v_tt_id, trang_thai_id),
         updated_at = now()
   WHERE id = p_cong_viec_id;
  RETURN jsonb_build_object('id', p_cong_viec_id, 'phan_tram_hoan_thanh', v_pct, 'checklist', COALESCE(p_checklist, '[]'::jsonb));
END;
$$;


--
-- Name: FUNCTION fn_qlcv_update_checklist(p_cong_viec_id uuid, p_checklist jsonb, p_phan_tram_hoan_thanh integer, p_trang_thai_ma text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_qlcv_update_checklist(p_cong_viec_id uuid, p_checklist jsonb, p_phan_tram_hoan_thanh integer, p_trang_thai_ma text) IS 'Cập nhật checklist + % tiến độ (+ trạng thái tuỳ chọn). App QLCV gọi qua Supabase RPC.';


--
-- Name: fn_refresh_mv_gsc_session_daily(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_refresh_mv_gsc_session_daily() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_gsc_session_daily;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_gsc_session_daily;
END;
$$;


--
-- Name: fn_set_hoan_thanh_luc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_hoan_thanh_luc() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ma_moi TEXT;
  v_ma_cu  TEXT;
BEGIN
  -- Chỉ xử lý khi trang_thai_id thay đổi
  IF OLD.trang_thai_id IS NOT DISTINCT FROM NEW.trang_thai_id THEN
    RETURN NEW;
  END IF;

  -- Resolve mã trạng thái mới
  SELECT code INTO v_ma_moi
  FROM public.sys_lookup_value
  WHERE id = NEW.trang_thai_id AND category_type = 'TRANG_THAI_CONG_VIEC'
  LIMIT 1;

  -- Resolve mã trạng thái cũ
  SELECT code INTO v_ma_cu
  FROM public.sys_lookup_value
  WHERE id = OLD.trang_thai_id AND category_type = 'TRANG_THAI_CONG_VIEC'
  LIMIT 1;

  IF v_ma_moi = 'HOAN_THANH' AND COALESCE(v_ma_cu, '') <> 'HOAN_THANH' THEN
    -- Chuyển vào HOAN_THANH → ghi timestamp
    NEW.hoan_thanh_luc := NOW();
  ELSIF v_ma_moi <> 'HOAN_THANH' AND COALESCE(v_ma_cu, '') = 'HOAN_THANH' THEN
    -- Rời khỏi HOAN_THANH (bị trả làm lại) → xóa timestamp
    NEW.hoan_thanh_luc := NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_set_hoan_thanh_luc(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_set_hoan_thanh_luc() IS 'Tự động set/reset hoan_thanh_luc khi fact_cong_viec chuyển sang/rời HOAN_THANH.';


--
-- Name: fn_sync_dashboard_pre_aggregates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sync_dashboard_pre_aggregates() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_session record;
BEGIN
  TRUNCATE TABLE public.gstt_fact_gsc_dashboard_summary;
  TRUNCATE TABLE public.gstt_fact_gsc_violations_summary;
  TRUNCATE TABLE public.gstt_fact_vst_sessions_summary;
  TRUNCATE TABLE public.gstt_fact_vst_opportunities_summary;
  TRUNCATE TABLE public.gstt_fact_vst_moments_summary;

  -- Re-use fn_sync_single_gsc_session to populate GSC summary tables
  FOR v_session IN 
    SELECT id FROM public.gstt_fact_chung_sessions WHERE is_active = true
  LOOP
    PERFORM public.fn_sync_single_gsc_session(v_session.id);
  END LOOP;

  -- Re-use fn_sync_single_vst_session to populate VST summary tables
  FOR v_session IN 
    SELECT id FROM public.gstt_fact_vst_sessions WHERE is_active = true
  LOOP
    PERFORM public.fn_sync_single_vst_session(v_session.id);
  END LOOP;
END;
$$;


--
-- Name: fn_sync_overdue_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sync_overdue_tasks() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_qua_han_id   UUID;
  v_hoan_thanh_id UUID;
  v_da_huy_id    UUID;
  v_count        INTEGER := 0;
BEGIN
  -- Resolve trạng thái IDs
  SELECT id INTO v_qua_han_id
  FROM public.sys_lookup_value
  WHERE category_type = 'TRANG_THAI_CONG_VIEC' AND code = 'QUA_HAN'
  LIMIT 1;

  SELECT id INTO v_hoan_thanh_id
  FROM public.sys_lookup_value
  WHERE category_type = 'TRANG_THAI_CONG_VIEC' AND code = 'HOAN_THANH'
  LIMIT 1;

  SELECT id INTO v_da_huy_id
  FROM public.sys_lookup_value
  WHERE category_type = 'TRANG_THAI_CONG_VIEC' AND code = 'DA_HUY'
  LIMIT 1;

  IF v_qua_han_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạng thái QUA_HAN trong dm_lookup_value (category_type=TRANG_THAI_CONG_VIEC).';
  END IF;

  -- Batch UPDATE: tất cả công việc quá hạn chưa kết thúc
  WITH updated_rows AS (
    UPDATE public.qlcv_fact_cong_viec
    SET
      trang_thai_id = v_qua_han_id,
      updated_at    = NOW()
    WHERE
      han_hoan_thanh < CURRENT_DATE
      AND is_active = true
      AND trang_thai_id IS DISTINCT FROM v_qua_han_id
      AND (v_hoan_thanh_id IS NULL OR trang_thai_id IS DISTINCT FROM v_hoan_thanh_id)
      AND (v_da_huy_id    IS NULL OR trang_thai_id IS DISTINCT FROM v_da_huy_id)
    RETURNING id, phan_tram_hoan_thanh, han_hoan_thanh
  ),
  -- Bulk INSERT hoạt động
  inserted_hoat_dong AS (
    INSERT INTO public.qlcv_fact_cong_viec_hoat_dong (
      id_cong_viec,
      loai_hoat_dong,
      noi_dung,
      phan_tram_hoan_thanh,
      nguoi_thuc_hien_id
    )
    SELECT
      u.id,
      'CAP_NHAT',
      'Hệ thống tự động: chuyển Quá hạn (hạn chót ' || u.han_hoan_thanh::text || ').',
      COALESCE(u.phan_tram_hoan_thanh, 0),
      NULL -- system actor
    FROM updated_rows u
    RETURNING id_cong_viec
  )
  SELECT COUNT(*) INTO v_count FROM inserted_hoat_dong;

  RETURN v_count;
END;
$$;


--
-- Name: FUNCTION fn_sync_overdue_tasks(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_sync_overdue_tasks() IS 'Batch đồng bộ trạng thái QUA_HAN cho tất cả công việc quá hạn (batch UPDATE + bulk INSERT hoạt động). Idempotent. Gọi bởi pg_cron hoặc Server Action.';


--
-- Name: fn_sync_single_gsc_session(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sync_single_gsc_session(p_session_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.gstt_fact_gsc_dashboard_summary WHERE session_id = p_session_id;
  DELETE FROM public.gstt_fact_gsc_violations_summary WHERE session_id = p_session_id;

  IF EXISTS (SELECT 1 FROM public.gstt_fact_chung_sessions WHERE id = p_session_id AND is_active = true) THEN
    INSERT INTO public.gstt_fact_gsc_dashboard_summary (
      session_id, ngay_giam_sat, bang_kiem_id, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
      tong_phien, tong_quan_sat, tong_dat, tong_vi_pham
    )
    SELECT
      s.id, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id, 1,
      COUNT(r.elem),
      COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'DAT'),
      COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'KHONG_DAT')
    FROM public.gstt_fact_chung_sessions s
    LEFT JOIN LATERAL jsonb_array_elements(s.results_jsonb) AS r(elem) ON true
    WHERE s.id = p_session_id
    GROUP BY s.id;

    INSERT INTO public.gstt_fact_gsc_violations_summary (
      session_id, criterion_id, ngay_giam_sat, bang_kiem_id, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
      tong_quan_sat, tong_vi_pham
    )
    SELECT
      s.id, (r.elem ->> 'criterion_id')::uuid AS criterion_id,
      s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id,
      COUNT(r.elem),
      COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'KHONG_DAT')
    FROM public.gstt_fact_chung_sessions s
    INNER JOIN LATERAL jsonb_array_elements(s.results_jsonb) AS r(elem) ON true
    WHERE s.id = p_session_id AND r.elem ->> 'criterion_id' IS NOT NULL
    GROUP BY s.id, (r.elem ->> 'criterion_id');
  END IF;
END;
$$;


--
-- Name: fn_sync_single_vst_session(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sync_single_vst_session(p_session_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.gstt_fact_vst_sessions_summary WHERE session_id = p_session_id;
  DELETE FROM public.gstt_fact_vst_opportunities_summary WHERE session_id = p_session_id;
  DELETE FROM public.gstt_fact_vst_moments_summary WHERE session_id = p_session_id;

  IF EXISTS (SELECT 1 FROM public.gstt_fact_vst_sessions WHERE id = p_session_id AND is_active = true) THEN
    INSERT INTO public.gstt_fact_vst_sessions_summary (
      session_id, ngay_giam_sat, khoa_id, khu_vuc_id, stype, nguoi_giam_sat_id, tong_phien
    )
    SELECT
      s.id, s.ngay_giam_sat, s.khoa_id, s.khu_vuc_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id, 1
    FROM public.gstt_fact_vst_sessions s
    WHERE s.id = p_session_id;

    INSERT INTO public.gstt_fact_vst_opportunities_summary (
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
    FROM public.gstt_fact_vst d
    JOIN public.gstt_fact_vst_sessions s ON d.session_id = s.id
    WHERE s.id = p_session_id;

    INSERT INTO public.gstt_fact_vst_moments_summary (
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
    FROM public.gstt_fact_vst d
    JOIN public.gstt_fact_vst_sessions s ON d.session_id = s.id
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
    FROM public.gstt_fact_vst d
    JOIN public.gstt_fact_vst_sessions s ON d.session_id = s.id
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


--
-- Name: fn_sys_attach_admin_rls(regclass, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sys_attach_admin_rls(p_table regclass, p_module text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_relname text;
BEGIN
  SELECT relname INTO v_relname
    FROM pg_class
   WHERE oid = p_table::oid AND relkind = 'r';

  IF v_relname IS NULL THEN
    RAISE NOTICE '[rls] Bỏ qua %; không phải bảng vật lý.', p_table;
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', p_table);

  -- Drop policy cũ tên rỗng-prefix (từ 000005)
  EXECUTE format('DROP POLICY IF EXISTS "_select" ON %s', p_table);
  EXECUTE format('DROP POLICY IF EXISTS "_insert" ON %s', p_table);
  EXECUTE format('DROP POLICY IF EXISTS "_update" ON %s', p_table);
  EXECUTE format('DROP POLICY IF EXISTS "_delete" ON %s', p_table);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_relname || '_select', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR SELECT TO authenticated USING (public.fn_sys_has_permission(%L, %L))',
    v_relname || '_select', p_table, p_module, 'view'
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_relname || '_insert', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission(%L, %L))',
    v_relname || '_insert', p_table, p_module, 'create'
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_relname || '_update', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR UPDATE TO authenticated USING (public.fn_sys_has_permission(%L, %L)) WITH CHECK (public.fn_sys_has_permission(%L, %L))',
    v_relname || '_update', p_table, p_module, 'edit', p_module, 'edit'
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_relname || '_delete', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR DELETE TO authenticated USING (public.fn_sys_has_permission(%L, %L))',
    v_relname || '_delete', p_table, p_module, 'delete'
  );
END;
$$;


--
-- Name: FUNCTION fn_sys_attach_admin_rls(p_table regclass, p_module text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_sys_attach_admin_rls(p_table regclass, p_module text) IS 'Helper attach 4 policies (select/insert/update/delete) trên bảng admin theo module quyền (DANH_MUC/PHAN_QUYEN/BANG_KIEM/NHAN_SU).';


--
-- Name: fn_sys_audit_attach(regclass); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sys_audit_attach(p_table regclass) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_trigger_name text;
  v_table_oid oid;
BEGIN
  v_table_oid := p_table::oid;
  v_trigger_name := 'trg_sys_audit_' || split_part(p_table::text, '.', 2);

  -- Chỉ attach trên BẢNG (relkind='r'), không attach lên view.
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = v_table_oid AND relkind = 'r') THEN
    RAISE NOTICE '[fn_sys_audit_attach] Bỏ qua %; không phải bảng vật lý', p_table;
    RETURN;
  END IF;

  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', v_trigger_name, p_table);
  EXECUTE format(
    'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %s
       FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row()',
    v_trigger_name,
    p_table
  );
END;
$$;


--
-- Name: FUNCTION fn_sys_audit_attach(p_table regclass); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_sys_audit_attach(p_table regclass) IS 'Helper attach trigger trg_sys_audit_<table> trên bảng vật lý; bỏ qua nếu không tồn tại hoặc là view.';


--
-- Name: fn_sys_audit_log_purge(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sys_audit_log_purge(p_retain_days integer DEFAULT 365) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cutoff timestamptz := now() - make_interval(days => p_retain_days);
  v_count bigint;
BEGIN
  IF p_retain_days < 30 THEN
    RAISE EXCEPTION '[audit-purge] retain_days phải >= 30 (giá trị: %)', p_retain_days;
  END IF;

  DELETE FROM public.sys_audit_log
   WHERE changed_at < v_cutoff;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[audit-purge] cutoff=%, đã xóa % rows', v_cutoff, v_count;
  RETURN v_count;
END;
$$;


--
-- Name: FUNCTION fn_sys_audit_log_purge(p_retain_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_sys_audit_log_purge(p_retain_days integer) IS 'Xóa audit log cũ hơn p_retain_days (mặc định 365). Chỉ admin/cron gọi.';


--
-- Name: fn_sys_audit_row(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sys_audit_row() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor uuid;
  v_id text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  v_id := coalesce(
    to_jsonb(NEW)->>'id',
    to_jsonb(OLD)->>'id'
  );

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    INSERT INTO public.sys_audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old, v_actor);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    INSERT INTO public.sys_audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old, v_new, v_actor);
    RETURN NEW;
  ELSE
    v_new := to_jsonb(NEW);
    INSERT INTO public.sys_audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_new, v_actor);
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: FUNCTION fn_sys_audit_row(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_sys_audit_row() IS 'Audit row trigger thống nhất - capture auth.uid() vào sys_audit_log.changed_by; thay thế fn_bv103_audit_row.';


--
-- Name: fn_sys_has_permission(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sys_has_permission(p_module text, p_action text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.v_sys_user_permissions
     WHERE auth_user_id = auth.uid()
       AND permissions @> jsonb_build_array(
             jsonb_build_object('module', p_module, 'action', p_action)
           )
  )
  OR public.fn_sys_is_admin();
$$;


--
-- Name: FUNCTION fn_sys_has_permission(p_module text, p_action text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_sys_has_permission(p_module text, p_action text) IS 'true nếu user có quyền module/action (qua v_sys_user_permissions) hoặc là Admin.';


--
-- Name: fn_sys_is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sys_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.v_sys_user_permissions
     WHERE auth_user_id = auth.uid()
       AND roles ? 'ADMIN'
  );
$$;


--
-- Name: FUNCTION fn_sys_is_admin(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_sys_is_admin() IS 'true nếu auth.uid() có role ADMIN.';


--
-- Name: fn_trigger_sync_gsc_session_delete_stmt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trigger_sync_gsc_session_delete_stmt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_session_id uuid;
BEGIN
  FOR v_session_id IN SELECT DISTINCT id FROM old_table LOOP
    IF v_session_id IS NOT NULL THEN
      PERFORM public.fn_sync_single_gsc_session(v_session_id);
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;


--
-- Name: fn_trigger_sync_gsc_session_insert_stmt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trigger_sync_gsc_session_insert_stmt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_session_id uuid;
BEGIN
  FOR v_session_id IN SELECT DISTINCT id FROM new_table LOOP
    IF v_session_id IS NOT NULL THEN
      PERFORM public.fn_sync_single_gsc_session(v_session_id);
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;


--
-- Name: fn_trigger_sync_gsc_session_update_stmt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trigger_sync_gsc_session_update_stmt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_session_id uuid;
BEGIN
  FOR v_session_id IN 
    SELECT DISTINCT id FROM old_table WHERE id IS NOT NULL
    UNION
    SELECT DISTINCT id FROM new_table WHERE id IS NOT NULL
  LOOP
    PERFORM public.fn_sync_single_gsc_session(v_session_id);
  END LOOP;
  RETURN NULL;
END;
$$;


--
-- Name: fn_trigger_sync_vst_opp_delete_stmt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trigger_sync_vst_opp_delete_stmt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_session_id uuid;
BEGIN
  FOR v_session_id IN SELECT DISTINCT session_id FROM old_table LOOP
    IF v_session_id IS NOT NULL THEN
      PERFORM public.fn_sync_single_vst_session(v_session_id);
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;


--
-- Name: fn_trigger_sync_vst_opp_insert_stmt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trigger_sync_vst_opp_insert_stmt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_session_id uuid;
BEGIN
  FOR v_session_id IN SELECT DISTINCT session_id FROM new_table LOOP
    IF v_session_id IS NOT NULL THEN
      PERFORM public.fn_sync_single_vst_session(v_session_id);
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;


--
-- Name: fn_trigger_sync_vst_opp_row(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trigger_sync_vst_opp_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_trigger_sync_vst_opp_update_stmt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trigger_sync_vst_opp_update_stmt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Gom cả cũ và mới để đồng bộ đầy đủ các phiên bị ảnh hưởng
  FOR v_session_id IN 
    SELECT DISTINCT session_id FROM old_table WHERE session_id IS NOT NULL
    UNION
    SELECT DISTINCT session_id FROM new_table WHERE session_id IS NOT NULL
  LOOP
    PERFORM public.fn_sync_single_vst_session(v_session_id);
  END LOOP;
  RETURN NULL;
END;
$$;


--
-- Name: fn_trigger_sync_vst_session_row(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_trigger_sync_vst_session_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_sync_single_vst_session(OLD.id);
  ELSE
    PERFORM public.fn_sync_single_vst_session(NEW.id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: is_admin_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_user(p_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = COALESCE(p_user_id, auth.uid())
      AND r.name = 'ADMIN'
  );
$$;


--
-- Name: mdm_refresh_governance_suggestions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mdm_refresh_governance_suggestions() RETURNS TABLE(inserted_count integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
  inserted_fk integer := 0;
  inserted_enum integer := 0;
BEGIN
  WITH candidates AS (
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name LIKE '%\_id' ESCAPE '\'
      AND c.column_name NOT IN (
        'id',
        'created_by_id',
        'updated_by_id'
      )
      AND c.table_name NOT IN ('mdm_field_registry', 'mdm_governance_suggestion')
  )
  INSERT INTO public.mdm_governance_suggestion (
    table_name, column_name, suggestion_type, confidence, reason, proposed_field_role, proposed_source_table
  )
  SELECT
    c.table_name,
    c.column_name,
    'REGISTER_FK',
    90,
    'Phát hiện cột *_id chưa được khai báo trong mdm_field_registry.',
    'FK_TO_SPECIALIZED',
    NULL
  FROM candidates c
  LEFT JOIN public.mdm_field_registry r
    ON r.table_name = c.table_name
   AND r.column_name = c.column_name
   AND r.is_active = true
  WHERE r.id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.mdm_governance_suggestion s
      WHERE s.table_name = c.table_name
        AND s.column_name = c.column_name
        AND s.suggestion_type = 'REGISTER_FK'
        AND s.status = 'OPEN'
    );
  GET DIAGNOSTICS inserted_fk = ROW_COUNT;

  -- Gợi ý chuẩn hóa text enum → bảng dm_* đã đăng ký (không còn hub tùy biến)
  WITH enum_candidates AS (
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('text', 'character varying')
      AND (
        c.column_name LIKE '%hinh_thuc%'
        OR c.column_name LIKE '%cach_thuc%'
        OR c.column_name LIKE '%vai_tro%'
        OR c.column_name LIKE '%chuc_vu%'
        OR c.column_name LIKE '%chuc_danh%'
        OR c.column_name LIKE '%nghe_nghiep%'
        OR c.column_name LIKE '%loai_%'
      )
      AND c.table_name NOT IN ('mdm_field_registry', 'mdm_governance_suggestion')
  )
  INSERT INTO public.mdm_governance_suggestion (
    table_name, column_name, suggestion_type, confidence, reason, proposed_field_role, proposed_source_table
  )
  SELECT
    c.table_name,
    c.column_name,
    'CONSIDER_ENUM_TO_DM',
    70,
    'Cột text có pattern enum nghiệp vụ; cân nhắc chuẩn hóa sang bảng dm_* phù hợp + *_id (đăng ký trong mdm_field_registry).',
    'TEXT_ENUM',
    NULL
  FROM enum_candidates c
  LEFT JOIN public.mdm_field_registry r
    ON r.table_name = c.table_name
   AND r.column_name = c.column_name
   AND r.is_active = true
  WHERE r.id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.mdm_governance_suggestion s
      WHERE s.table_name = c.table_name
        AND s.column_name = c.column_name
        AND s.suggestion_type = 'CONSIDER_ENUM_TO_DM'
        AND s.status = 'OPEN'
    );
  GET DIAGNOSTICS inserted_enum = ROW_COUNT;

  RETURN QUERY SELECT inserted_fk + inserted_enum;
END;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: rpc_assign_staff_ksnk_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_assign_staff_ksnk_role(p_staff_id uuid, p_role_name text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_uid UUID;
  v_target_role_id UUID;
  v_ksnk_role_ids UUID[];
BEGIN
  SELECT auth_user_id INTO v_uid FROM public.mdm_nhan_su WHERE id = p_staff_id;
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nhân sự chưa có tài khoản Auth.');
  END IF;

  SELECT id INTO v_target_role_id
  FROM public.sys_roles
  WHERE name = p_role_name AND is_active = true
  LIMIT 1;
  IF v_target_role_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Vai trò mục tiêu không tồn tại hoặc đã ngưng hoạt động.');
  END IF;

  -- Chỉ xóa nhóm vai trò KSNK hệ thống, không đụng các role ngoài phạm vi.
  SELECT ARRAY_AGG(id) INTO v_ksnk_role_ids
  FROM public.sys_roles
  WHERE name IN (
    'CAN_BO_KSNK',
    'NHAN_VIEN_KHOA',
    'GIAM_SAT_VIEN',
    'NHAN_VIEN_KSNK',
    'HOI_DONG_KSNK',
    'MANG_LUOI_KSNK',
    'TO_TRUONG_MANG_LUOI_KSNK',
    'THANH_VIEN_MANG_LUOI_KSNK'
  );

  DELETE FROM public.rel_user_roles
  WHERE user_id = v_uid
    AND role_id = ANY(COALESCE(v_ksnk_role_ids, ARRAY[]::uuid[]));

  INSERT INTO public.rel_user_roles(user_id, role_id)
  VALUES (v_uid, v_target_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: rpc_cssd_persist_bom_checkpoint(uuid, jsonb, jsonb, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_cssd_persist_bom_checkpoint(p_quy_trinh_id uuid, p_lines jsonb, p_deltas jsonb, p_do_split text, p_operator_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_line jsonb;
  v_delta jsonb;
  v_thanh_phan_id uuid;
  v_thuc_te int;
  v_hong int;
  v_loai_id uuid;
  v_bo_id uuid;
  v_giao_dich_id uuid;
  v_so_luong_thay_doi int;
  v_ghi_chu text;
  v_loai_giao_dich text;
BEGIN
  -- 1. Cập nhật số lượng thực tế và số lượng hỏng trong cssd_fact_quy_trinh_thanh_phan
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_thanh_phan_id := (v_line->>'thanh_phan_id')::uuid;
    v_thuc_te := (v_line->>'so_luong_thuc_te')::int;
    v_hong := COALESCE((v_line->>'so_luong_hong')::int, 0);

    UPDATE public.cssd_fact_quy_trinh_thanh_phan
       SET so_luong_thuc_te = v_thuc_te,
           updated_at = now()
     WHERE id = v_thanh_phan_id
       AND quy_trinh_id = p_quy_trinh_id;
  END LOOP;

  -- 2. Ghi nhận giao dịch biến động kho nếu có deltas
  IF p_deltas IS NOT NULL AND jsonb_array_length(p_deltas) > 0 THEN
    FOR v_delta IN SELECT * FROM jsonb_array_elements(p_deltas) LOOP
      v_loai_id := (v_delta->>'loai_id')::uuid;
      v_bo_id := NULLIF(v_delta->>'bo_id', '')::uuid;
      v_loai_giao_dich := v_delta->>'loai_giao_dich';
      v_so_luong_thay_doi := (v_delta->>'so_luong_thay_doi')::int;
      v_ghi_chu := v_delta->>'ghi_chu';

      INSERT INTO public.cssd_fact_kho_giao_dich(
        loai_dung_cu_id, 
        bo_dung_cu_id, 
        quy_trinh_id,
        loai_giao_dich, 
        so_luong_thay_doi, 
        ghi_chu,
        nguoi_thuc_hien_id, 
        created_at, 
        updated_at
      ) VALUES (
        v_loai_id,
        v_bo_id,
        p_quy_trinh_id,
        v_loai_giao_dich,
        v_so_luong_thay_doi,
        v_ghi_chu,
        p_operator_id, 
        now(), 
        now()
      );
    END LOOP;
  END IF;

  -- 3. Ghi sự kiện vòng đời KIEM_DEM_BOM
  INSERT INTO public.cssd_fact_lifecycle_event(
    quy_trinh_id, 
    ma_su_kien, 
    ma_tram, 
    payload, 
    created_at, 
    updated_at
  ) VALUES (
    p_quy_trinh_id, 
    'KIEM_DEM_BOM', 
    'DONG_GOI',
    jsonb_build_object(
      'do_split', p_do_split, 
      'so_lines', jsonb_array_length(p_lines)
    ),
    now(), 
    now()
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: rpc_dashboard_gsc_strategic_analytics(date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_dashboard_gsc_strategic_analytics(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_hinh_thuc_ids text[] DEFAULT NULL::text[], p_bang_kiem_mas text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_kpis jsonb;
  v_trendline jsonb;
  v_matrix_khoa jsonb;
  v_matrix_nghe jsonb;
  v_top_violations jsonb;
  v_gap_analysis jsonb;
  v_workload jsonb;
  v_dynamic_checklists jsonb;
BEGIN
  -- 1. KPIs
  SELECT jsonb_build_object(
    'tong_phien', COALESCE(SUM(tong_phien), 0),
    'tong_quan_sat', COALESCE(SUM(tong_quan_sat), 0),
    'tong_dat', COALESCE(SUM(tong_dat), 0),
    'tong_vi_pham', COALESCE(SUM(tong_vi_pham), 0),
    'ty_le_tuan_thu', CASE WHEN SUM(tong_quan_sat) > 0 THEN ROUND((SUM(tong_dat)::numeric * 100) / SUM(tong_quan_sat), 1) ELSE 0 END
  ) INTO v_kpis
  FROM public.gstt_fact_gsc_dashboard_summary s
  LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    AND (
      p_bang_kiem_mas IS NULL
      OR EXISTS (
        SELECT 1 FROM public.gstt_dm_bang_kiem dbk
        WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
      )
    );

  -- 2. Trendline (by Week)
  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trendline FROM (
    SELECT 
      'Tuần ' || to_char(s.ngay_giam_sat, 'IW') || ' (' || to_char(date_trunc('week', s.ngay_giam_sat), 'DD/MM') || ')' AS label, 
      MIN(s.ngay_giam_sat) AS min_date,
      SUM(s.tong_quan_sat) AS tong_quan_sat, 
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL
        OR EXISTS (
          SELECT 1 FROM public.gstt_dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY 1
  ) t;

  -- 3. Matrix: By Khoa
  SELECT jsonb_agg(t) INTO v_matrix_khoa FROM (
    SELECT 
      k.id, k.ma_khoa, k.ten_khoa AS ten, 
      SUM(s.tong_quan_sat) AS tong_quan_sat, 
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL
        OR EXISTS (
          SELECT 1 FROM public.gstt_dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY k.id, k.ma_khoa, k.ten_khoa
    ORDER BY ty_le_tuan_thu DESC
  ) t;

  -- 4. Top 10 Violations
  SELECT jsonb_agg(t) INTO v_top_violations FROM (
    SELECT 
      tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, bk.ten_bang_kiem,
      SUM(s.tong_vi_pham) AS so_vi_pham, 
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_vi_pham)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_vi_pham
    FROM public.gstt_fact_gsc_violations_summary s
    JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON s.criterion_id = tc.id
    JOIN public.gstt_dm_bang_kiem bk ON s.bang_kiem_id = bk.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
    GROUP BY tc.id, tc.noi_dung, bk.ten_bang_kiem
    HAVING SUM(s.tong_vi_pham) > 0
    ORDER BY so_vi_pham DESC LIMIT 10
  ) t;

  -- 5. Gap Analysis (TGS vs KSNK)
  SELECT jsonb_agg(t) INTO v_gap_analysis FROM (
    SELECT 
      k.id, k.ma_khoa, k.ten_khoa AS ten,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) AS tgs_quan_sat,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END) AS tgs_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) > 0 
           THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END), 1) 
           ELSE NULL END AS ty_le_tgs,
           
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) AS ksnk_quan_sat,
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END) AS ksnk_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) > 0 
           THEN ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END), 1) 
           ELSE NULL END AS ty_le_ksnk,
           
      CASE 
        WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) > 0 AND SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) > 0 
        THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END), 1) 
             - ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END), 1)
        ELSE NULL 
      END AS do_lech
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL
        OR EXISTS (
          SELECT 1 FROM public.gstt_dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY k.id, k.ma_khoa, k.ten_khoa
    HAVING SUM(s.tong_quan_sat) > 0
    ORDER BY k.ten_khoa
  ) t;

  -- 6. Dynamic Checklists (Smart Hiding - Only checkists with data)
  SELECT jsonb_agg(t) INTO v_dynamic_checklists FROM (
    SELECT 
      bk.ma_bk, bk.ten_bang_kiem,
      SUM(s.tong_phien) AS tong_phien,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.gstt_dm_bang_kiem bk ON s.bang_kiem_id = bk.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
    GROUP BY bk.ma_bk, bk.ten_bang_kiem
    HAVING SUM(s.tong_phien) > 0
    ORDER BY ty_le_tuan_thu DESC
  ) t;

  -- 7. Workload KSNK & Coverage
  SELECT jsonb_build_object(
    'khoa_tu_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.gstt_fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
    ),
    'khoa_duoc_ksnk_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.gstt_fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'chuyen_de_duoc_ksnk_phu', (
      SELECT COUNT(DISTINCT s.bang_kiem_id)
      FROM public.gstt_fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'ksnk_so_phien', (
      SELECT COALESCE(SUM(s.tong_phien), 0)
      FROM public.gstt_fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'co_cau_giam_sat', (
      SELECT jsonb_agg(src) FROM (
        SELECT 'KSNK' as ten, COALESCE(SUM(s.tong_phien), 0) as so_phien 
        FROM public.gstt_fact_gsc_dashboard_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
        UNION ALL
        SELECT 'TU_GIAM_SAT' as ten, COALESCE(SUM(s.tong_phien), 0) as so_phien 
        FROM public.gstt_fact_gsc_dashboard_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
        UNION ALL
        SELECT 'CHEO' as ten, COALESCE(SUM(s.tong_phien), 0) as so_phien 
        FROM public.gstt_fact_gsc_dashboard_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'CHEO'
      ) src
    )
  ) INTO v_workload;

  RETURN jsonb_build_object(
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'trendline', COALESCE(v_trendline, '[]'::jsonb),
    'matrix_khoa', COALESCE(v_matrix_khoa, '[]'::jsonb),
    'top_violations', COALESCE(v_top_violations, '[]'::jsonb),
    'gap_analysis', COALESCE(v_gap_analysis, '[]'::jsonb),
    'dynamic_checklists', COALESCE(v_dynamic_checklists, '[]'::jsonb),
    'workload', COALESCE(v_workload, '{}'::jsonb)
  );
END;
$$;


--
-- Name: rpc_dashboard_vst_strategic_analytics(date, date, uuid[], uuid[], uuid[], uuid[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_dashboard_vst_strategic_analytics(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_hinh_thuc_ids text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_kpis jsonb;
  v_trendline jsonb;
  v_matrix_khoa jsonb;
  v_matrix_nghe jsonb;
  v_matrix_khu_vuc jsonb;
  v_moments jsonb;
  v_gap_analysis jsonb;
  v_workload jsonb;
BEGIN
  -- 1. KPIs
  SELECT jsonb_build_object(
    'tong_phien', COALESCE(COUNT(DISTINCT session_id), 0),
    'tong_co_hoi', COALESCE(SUM(so_co_hoi), 0),
    'da_tuan_thu', COALESCE(SUM(da_tuan_thu), 0),
    'bo_sot', COALESCE(SUM(bo_sot), 0),
    'loi_ky_thuat', COALESCE(SUM(loi_ky_thuat), 0),
    'loi_thoi_gian', COALESCE(SUM(loi_thoi_gian), 0),
    'lam_dung_gang', COALESCE(SUM(lam_dung_gang), 0),
    'dung_ky_thuat', COALESCE(SUM(da_tuan_thu) - SUM(loi_ky_thuat), 0),
    'du_thoi_gian', COALESCE(SUM(da_tuan_thu) - SUM(loi_thoi_gian), 0),
    'ty_le_tuan_thu', CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE 0 END,
    'ty_le_dung_ky_thuat', CASE WHEN SUM(da_tuan_thu) > 0 THEN ROUND(((SUM(da_tuan_thu) - SUM(loi_ky_thuat))::numeric * 100) / SUM(da_tuan_thu), 1) ELSE 0 END,
    'ty_le_du_thoi_gian', CASE WHEN SUM(da_tuan_thu) > 0 THEN ROUND(((SUM(da_tuan_thu) - SUM(loi_thoi_gian))::numeric * 100) / SUM(da_tuan_thu), 1) ELSE 0 END,
    'ty_le_lam_dung_gang', CASE WHEN SUM(bo_sot) > 0 THEN ROUND((SUM(lam_dung_gang)::numeric * 100) / SUM(bo_sot), 1) ELSE 0 END
  ) INTO v_kpis
  FROM public.gstt_fact_vst_opportunities_summary s
  LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids));

  -- 2. Trendline (by Week)
  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trendline FROM (
    SELECT 
      'Tuần ' || to_char(s.ngay_giam_sat, 'IW') || ' (' || to_char(date_trunc('week', s.ngay_giam_sat), 'DD/MM') || ')' AS label, 
      MIN(s.ngay_giam_sat) AS min_date,
      SUM(s.so_co_hoi) AS tong_co_hoi, 
      SUM(s.da_tuan_thu) AS da_tuan_thu,
      CASE WHEN SUM(s.so_co_hoi) > 0 THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_vst_opportunities_summary s
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY 1
  ) t;

  -- 3. Matrix: By Khoa
  SELECT jsonb_agg(t) INTO v_matrix_khoa FROM (
    SELECT 
      k.id, k.ma_khoa, k.ten_khoa AS ten, 
      SUM(s.so_co_hoi) AS tong_co_hoi, 
      SUM(s.da_tuan_thu) AS da_tuan_thu,
      CASE WHEN SUM(s.so_co_hoi) > 0 THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_vst_opportunities_summary s
    JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY k.id, k.ma_khoa, k.ten_khoa
    ORDER BY ty_le_tuan_thu DESC
  ) t;

  -- 4. Matrix: By Nghe
  SELECT jsonb_agg(t) INTO v_matrix_nghe FROM (
    SELECT 
      COALESCE(n.id, md5('unknown')::uuid) AS id, COALESCE(n.name, 'Không rõ') AS ten,
      SUM(s.so_co_hoi) AS tong_co_hoi, 
      SUM(s.da_tuan_thu) AS da_tuan_thu,
      CASE WHEN SUM(s.so_co_hoi) > 0 THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_vst_opportunities_summary s
    LEFT JOIN public.sys_lookup_value n ON s.nghe_nghiep_id = n.id AND n.category_type = 'NGHE_NGHIEP'
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY n.id, n.name
    ORDER BY tong_co_hoi DESC
  ) t;

  -- 5. Moments (5 Thời điểm)
  SELECT jsonb_agg(t) INTO v_moments FROM (
    SELECT 
      m.moment_label AS ten,
      SUM(m.so_quan_sat) AS tong_co_hoi,
      SUM(CASE WHEN m.is_tuan_thu THEN m.so_quan_sat ELSE 0 END) AS da_tuan_thu,
      CASE WHEN SUM(m.so_quan_sat) > 0 THEN ROUND((SUM(CASE WHEN m.is_tuan_thu THEN m.so_quan_sat ELSE 0 END)::numeric * 100) / SUM(m.so_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_vst_moments_summary m
    LEFT JOIN public.mdm_dm_khoa_phong k ON m.khoa_id = k.id
    WHERE m.ngay_giam_sat >= p_tu_ngay AND m.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR m.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR m.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR m.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR m.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY m.moment_label
    ORDER BY tong_co_hoi DESC
  ) t;

  -- 6. Gap Analysis (Tự giám sát vs Chuyên trách KSNK) by Khoa
  SELECT jsonb_agg(t) INTO v_gap_analysis FROM (
    SELECT 
      k.id, k.ma_khoa, k.ten_khoa AS ten,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.so_co_hoi ELSE 0 END) AS tgs_co_hoi,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.da_tuan_thu ELSE 0 END) AS tgs_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.so_co_hoi ELSE 0 END) > 0 
           THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.da_tuan_thu ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.so_co_hoi ELSE 0 END), 1) 
           ELSE NULL END AS ty_le_tgs,
           
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.so_co_hoi ELSE 0 END) AS ksnk_co_hoi,
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.da_tuan_thu ELSE 0 END) AS ksnk_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'KSNK' THEN s.so_co_hoi ELSE 0 END) > 0 
           THEN ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.da_tuan_thu ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'KSNK' THEN s.so_co_hoi ELSE 0 END), 1) 
           ELSE NULL END AS ty_le_ksnk,
           
      -- Gap = TGS - KSNK
      CASE 
        WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.so_co_hoi ELSE 0 END) > 0 AND SUM(CASE WHEN s.stype = 'KSNK' THEN s.so_co_hoi ELSE 0 END) > 0 
        THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.da_tuan_thu ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.so_co_hoi ELSE 0 END), 1) 
             - ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.da_tuan_thu ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'KSNK' THEN s.so_co_hoi ELSE 0 END), 1)
        ELSE NULL 
      END AS do_lech
    FROM public.gstt_fact_vst_opportunities_summary s
    JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY k.id, k.ma_khoa, k.ten_khoa
    HAVING SUM(s.so_co_hoi) > 0
    ORDER BY k.ten_khoa
  ) t;

  -- 7. Workload KSNK & Coverage
  SELECT jsonb_build_object(
    'khoa_tu_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.gstt_fact_vst_opportunities_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
    ),
    'khoa_duoc_ksnk_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.gstt_fact_vst_opportunities_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'ksnk_so_co_hoi', (
      SELECT COALESCE(SUM(s.so_co_hoi), 0)
      FROM public.gstt_fact_vst_opportunities_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'ksnk_so_phien', (
      SELECT COALESCE(SUM(s.tong_phien), 0)
      FROM public.gstt_fact_vst_sessions_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'co_cau_giam_sat', (
      SELECT jsonb_agg(src) FROM (
        SELECT 'KSNK' as ten, COALESCE(SUM(s.so_co_hoi), 0) as so_co_hoi 
        FROM public.gstt_fact_vst_opportunities_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
        UNION ALL
        SELECT 'TU_GIAM_SAT' as ten, COALESCE(SUM(s.so_co_hoi), 0) as so_co_hoi 
        FROM public.gstt_fact_vst_opportunities_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
        UNION ALL
        SELECT 'CHEO' as ten, COALESCE(SUM(s.so_co_hoi), 0) as so_co_hoi 
        FROM public.gstt_fact_vst_opportunities_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'CHEO'
      ) src
    )
  ) INTO v_workload;

  RETURN jsonb_build_object(
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'trendline', COALESCE(v_trendline, '[]'::jsonb),
    'matrix_khoa', COALESCE(v_matrix_khoa, '[]'::jsonb),
    'matrix_nghe', COALESCE(v_matrix_nghe, '[]'::jsonb),
    'moments', COALESCE(v_moments, '[]'::jsonb),
    'gap_analysis', COALESCE(v_gap_analysis, '[]'::jsonb),
    'workload', COALESCE(v_workload, '{}'::jsonb)
  );
END;
$$;


--
-- Name: rpc_dm_bang_kiem_max_numeric_suffix(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_dm_bang_kiem_max_numeric_suffix(p_prefix text) RETURNS integer
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $_$
  SELECT coalesce(
    max(
      (substring(upper(btrim(d.ma_bk)) from (char_length(b.prefix) + 1)))::bigint
    ),
    0
  )::integer
  FROM public.gstt_dm_bang_kiem d
  CROSS JOIN LATERAL (
    SELECT upper(btrim(coalesce(p_prefix, ''))) AS prefix
  ) b
  WHERE b.prefix <> ''
    AND char_length(b.prefix) BETWEEN 1 AND 12
    AND d.ma_bk IS NOT NULL
    AND d.is_active = true
    AND upper(btrim(d.ma_bk)) LIKE b.prefix || '%'
    AND substring(upper(btrim(d.ma_bk)) from char_length(b.prefix) + 1) ~ '^[0-9]+$';
$_$;


--
-- Name: FUNCTION rpc_dm_bang_kiem_max_numeric_suffix(p_prefix text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_dm_bang_kiem_max_numeric_suffix(p_prefix text) IS 'Sinh mã bảng kiểm: max phần số sau tiền tố ma_bk (dm_bang_kiem, is_active), RLS theo người gọi.';


--
-- Name: rpc_get_compliance_dashboard(date, date, text[], uuid[], uuid[], uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_compliance_dashboard(p_tu_ngay date, p_den_ngay date, p_bang_kiem_mas text[] DEFAULT NULL::text[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_summary JSONB;
  v_by_khoa JSONB;
  v_by_nghe JSONB;
  v_trend JSONB;
  v_violations JSONB;
  v_supervision_sources JSONB;
BEGIN
  -- 1. Tính toán summary tổng quát
  WITH filtered_sessions AS (
    SELECT id, khoa_id, nghe_nghiep_id, khu_vuc_id, ngay_giam_sat, nguoi_giam_sat_id
    FROM public.gstt_fact_chung_sessions
    WHERE is_active = true
      AND ngay_giam_sat >= p_tu_ngay AND ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR khu_vuc_id = ANY(p_khu_vuc_ids))
  ),
  results_summary AS (
    SELECT 
      COUNT(DISTINCT s.id) as tong_phien,
      COUNT(r.id) as tong_quan_sat,
      COUNT(r.id) FILTER (WHERE r.value = 'DAT') as tong_dat,
      COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as tong_vi_pham
    FROM filtered_sessions s
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
  )
  SELECT jsonb_build_object(
    'tong_phien', tong_phien,
    'tong_quan_sat', tong_quan_sat,
    'tong_vi_pham', tong_vi_pham,
    'ty_le_tuan_thu', CASE WHEN tong_quan_sat > 0 THEN ROUND((tong_dat::numeric * 100) / tong_quan_sat, 1) ELSE 0 END
  ) INTO v_summary FROM results_summary;

  -- Nguồn giám sát
  WITH sources AS (
    SELECT 
      CASE 
        WHEN k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK' THEN 'Khoa KSNK'
        WHEN s.khoa_id = ns.khoa_id THEN 'Tự giám sát'
        ELSE 'Giám sát chéo'
      END as ten,
      count(DISTINCT s.id) as so_phien
    FROM filtered_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.mdm_dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_phien', so_phien)) INTO v_supervision_sources FROM sources;

  -- Các phần khác giữ nguyên (by_khoa, trend, vi phạm...)
  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY date_trunc('month', s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.v_gsc_dashboard_rows r JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered_sessions s ON r.session_id = s.id
    GROUP BY 1 HAVING COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0 ORDER BY 2 DESC LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb),
    'trend', COALESCE(v_trend, '[]'::jsonb),
    'violations', COALESCE(v_violations, '[]'::jsonb),
    'supervision_sources', COALESCE(v_supervision_sources, '[]'::jsonb)
  );
END;
$$;


--
-- Name: rpc_get_compliance_dashboard_multi_v1(date, date, text[], uuid[], uuid[], uuid[], uuid[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_compliance_dashboard_multi_v1(p_tu_ngay date, p_den_ngay date, p_bang_kiem_mas text[], p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_supervision_type text DEFAULT 'ALL'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ma_bk text;
  v_result jsonb := '{}'::jsonb;
  v_sub_res jsonb;
BEGIN
  IF p_bang_kiem_mas IS NULL OR array_length(p_bang_kiem_mas, 1) IS NULL THEN
    RETURN '{}'::json;
  END IF;

  IF array_length(p_bang_kiem_mas, 1) = 1 THEN
    v_ma_bk := p_bang_kiem_mas[1];
    SELECT rpc_get_compliance_dashboard_v2(
      p_tu_ngay, p_den_ngay, ARRAY[v_ma_bk],
      p_khoi_ids, p_khoa_ids, p_nghe_nghiep_ids, p_khu_vuc_ids, p_supervision_type
    ) INTO v_sub_res;
    RETURN jsonb_build_object(v_ma_bk, v_sub_res);
  END IF;

  FOREACH v_ma_bk IN ARRAY p_bang_kiem_mas
  LOOP
    SELECT rpc_get_compliance_dashboard_v2(
      p_tu_ngay, p_den_ngay, ARRAY[v_ma_bk],
      p_khoi_ids, p_khoa_ids, p_nghe_nghiep_ids, p_khu_vuc_ids, p_supervision_type
    ) INTO v_sub_res;
    v_result := v_result || jsonb_build_object(v_ma_bk, coalesce(v_sub_res, '{}'::jsonb));
  END LOOP;

  RETURN v_result;
END;
$$;


--
-- Name: rpc_get_compliance_dashboard_multi_v2(date, date, text[], uuid[], uuid[], uuid[], uuid[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_compliance_dashboard_multi_v2(p_tu_ngay date, p_den_ngay date, p_bang_kiem_mas text[], p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_supervision_type text DEFAULT 'ALL'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ma_bk text;
  v_result jsonb := '{}'::jsonb;
  v_sub_res jsonb;
  v_sum jsonb;
  v_khoa jsonb;
  v_nghe jsonb;
  v_khu jsonb;
  v_trend jsonb;
  v_violation jsonb;
  v_source jsonb;
  v_part jsonb;
BEGIN
  IF p_bang_kiem_mas IS NULL OR array_length(p_bang_kiem_mas, 1) IS NULL THEN
    RETURN '{}'::json;
  END IF;

  IF array_length(p_bang_kiem_mas, 1) = 1 THEN
    RETURN public.rpc_get_compliance_dashboard_multi_v1(
      p_tu_ngay, p_den_ngay, p_bang_kiem_mas,
      p_khoi_ids, p_khoa_ids, p_nghe_nghiep_ids, p_khu_vuc_ids, p_supervision_type
    );
  END IF;

  CREATE TEMP TABLE _gsc_sessions_multi ON COMMIT DROP AS
    SELECT
      s.id,
      s.khoa_id,
      s.nghe_nghiep_id,
      s.khu_vuc_id,
      s.ngay_giam_sat,
      coalesce(bk.ma_bk, '') AS loai_bang_kiem,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
        WHEN (
          (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
          AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
        )
        OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.gstt_fact_chung_sessions s
    LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.mdm_dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.mdm_dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_supervision_type = 'ALL'
        OR (
          CASE
            WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                 AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
            WHEN (
              (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
              AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
            )
            OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
            ELSE 'CHEO'
          END = p_supervision_type
        )
      )
      AND (
        bk.ma_bk = ANY (p_bang_kiem_mas)
        OR bk.id::text = ANY (p_bang_kiem_mas)
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids));

  FOREACH v_ma_bk IN ARRAY p_bang_kiem_mas
  LOOP
    SELECT jsonb_build_object(
      'tong_phien', count(DISTINCT s.id),
      'tong_quan_sat', count(r.id),
      'tong_vi_pham', count(r.id) FILTER (WHERE r.value = 'KHONG_DAT'),
      'ty_le_tuan_thu',
      CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END
    )
    INTO v_sum
    FROM _gsc_sessions_multi s
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    WHERE s.loai_bang_kiem = v_ma_bk;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb)
    INTO v_khoa
    FROM (
      SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
      LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2
      ORDER BY 5 DESC
      LIMIT 50
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_nghe FROM (
      SELECT coalesce(n.id, md5(coalesce(n.ten_nghe_nghiep, 'unknown'))::uuid) AS id, coalesce(n.ten_nghe_nghiep, 'Không rõ') AS ten,
             count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.mdm_dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
      LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2 ORDER BY 3 DESC
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_khu FROM (
      SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
             count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
      LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2 ORDER BY 3 DESC
    ) t;

    SELECT coalesce(jsonb_agg(t ORDER BY min_date), '[]'::jsonb) INTO v_trend FROM (
      SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') AS label, min(ngay_giam_sat) AS min_date, count(r.id) AS tong,
             count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_violation FROM (
      SELECT tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') AS so_vi_pham, count(r.id) AS tong_quan_sat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le_vi_pham
      FROM public.v_gsc_dashboard_rows r
      JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id
      JOIN _gsc_sessions_multi s ON r.session_id = s.id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2
      HAVING count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0
      ORDER BY 3 DESC LIMIT 20
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_source FROM (
      SELECT 'Khoa KSNK' AS ten, count(DISTINCT id) FILTER (WHERE stype = 'KSNK') AS so_phien FROM _gsc_sessions_multi WHERE loai_bang_kiem = v_ma_bk
      UNION ALL
      SELECT 'Giám sát chéo', count(DISTINCT id) FILTER (WHERE stype = 'CHEO') FROM _gsc_sessions_multi WHERE loai_bang_kiem = v_ma_bk
      UNION ALL
      SELECT 'Tự giám sát', count(DISTINCT id) FILTER (WHERE stype = 'TU_GIAM_SAT') FROM _gsc_sessions_multi WHERE loai_bang_kiem = v_ma_bk
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_part FROM (
      SELECT k.id, k.ten_khoa AS ten, count(DISTINCT s.id) FILTER (WHERE s.stype = 'TU_GIAM_SAT') AS so_phien
      FROM public.mdm_dm_khoa_phong k
      LEFT JOIN _gsc_sessions_multi s ON k.id = s.khoa_id AND s.loai_bang_kiem = v_ma_bk
      WHERE k.is_active = true
        AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
        AND (p_khoa_ids IS NULL OR k.id = ANY (p_khoa_ids))
      GROUP BY 1, 2
      ORDER BY 3 ASC, 2 ASC
    ) t;

    v_sub_res := jsonb_build_object(
      'summary', v_sum,
      'by_khoa', coalesce(v_khoa, '[]'::jsonb),
      'by_nghe_nghiep', coalesce(v_nghe, '[]'::jsonb),
      'by_khu_vuc', coalesce(v_khu, '[]'::jsonb),
      'trend', coalesce(v_trend, '[]'::jsonb),
      'violations', coalesce(v_violation, '[]'::jsonb),
      'supervision_sources', coalesce(v_source, '[]'::jsonb),
      'participation', coalesce(v_part, '[]'::jsonb)
    );

    v_result := v_result || jsonb_build_object(v_ma_bk, v_sub_res);
  END LOOP;

  RETURN v_result;
END;
$$;


--
-- Name: rpc_get_compliance_dashboard_v2(date, date, text[], uuid[], uuid[], uuid[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_compliance_dashboard_v2(p_tu_ngay date, p_den_ngay date, p_bang_kiem_mas text[] DEFAULT NULL::text[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_supervision_type text DEFAULT 'ALL'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_summary JSONB;
  v_by_khoa JSONB;
  v_by_nghe JSONB;
  v_trend JSONB;
  v_violations JSONB;
  v_supervision_sources JSONB;
  v_participation JSONB;
BEGIN
  -- 1. Tính toán summary tổng quát với bộ lọc nguồn
  WITH filtered_sessions AS (
    SELECT s.id, s.khoa_id, s.nghe_nghiep_id, s.khu_vuc_id, s.ngay_giam_sat, s.nguoi_giam_sat_id
    FROM public.gstt_fact_chung_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.mdm_dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_supervision_type = 'ALL'
        OR (p_supervision_type = 'KSNK' AND (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK'))
        OR (p_supervision_type = 'TU_GIAM_SAT' AND s.khoa_id = ns.khoa_id AND NOT (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK'))
        OR (p_supervision_type = 'CHEO' AND s.khoa_id != ns.khoa_id AND NOT (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK'))
      )
  ),
  results_summary AS (
    SELECT 
      COUNT(DISTINCT s.id) as tong_phien,
      COUNT(r.id) as tong_quan_sat,
      COUNT(r.id) FILTER (WHERE r.value = 'DAT') as tong_dat,
      COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as tong_vi_pham
    FROM filtered_sessions s
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
  )
  SELECT jsonb_build_object(
    'tong_phien', tong_phien,
    'tong_quan_sat', tong_quan_sat,
    'tong_vi_pham', tong_vi_pham,
    'ty_le_tuan_thu', CASE WHEN tong_quan_sat > 0 THEN ROUND((tong_dat::numeric * 100) / tong_quan_sat, 1) ELSE 0 END
  ) INTO v_summary FROM results_summary;

  -- Nguồn giám sát (luôn tính trên tập filtered để báo cáo khớp)
  WITH sources AS (
    SELECT 
      CASE 
        WHEN k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK' THEN 'Khoa KSNK'
        WHEN s.khoa_id = ns.khoa_id THEN 'Tự giám sát'
        ELSE 'Giám sát chéo'
      END as ten,
      count(DISTINCT s.id) as so_phien
    FROM filtered_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.mdm_dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_phien', so_phien)) INTO v_supervision_sources FROM sources;

  -- Thống kê tham gia (Cơ cấu nguồn)
  WITH participation AS (
    SELECT k.id, k.ten_khoa as ten, count(DISTINCT s.id) as so_phien
    FROM public.mdm_dm_khoa_phong k
    LEFT JOIN public.gstt_fact_chung_sessions s ON k.id = s.khoa_id 
      AND s.is_active = true 
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    -- Chỉ tính tự giám sát cho cơ cấu nguồn theo yêu cầu
    WHERE (s.id IS NULL OR (s.khoa_id = ns.khoa_id))
    GROUP BY 1, 2
  )
  SELECT jsonb_agg(jsonb_build_object('id', id, 'ten', ten, 'so_phien', so_phien)) INTO v_participation FROM participation;

  -- Các phần khác (by_khoa, trend, violations)
  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY date_trunc('month', s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.v_gsc_dashboard_rows r JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered_sessions s ON r.session_id = s.id
    GROUP BY 1 HAVING COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0 ORDER BY 2 DESC LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb),
    'trend', COALESCE(v_trend, '[]'::jsonb),
    'violations', COALESCE(v_violations, '[]'::jsonb),
    'supervision_sources', COALESCE(v_supervision_sources, '[]'::jsonb),
    'participation', COALESCE(v_participation, '[]'::jsonb)
  );
END;
$$;


--
-- Name: rpc_get_compliance_dashboard_v2(date, date, text[], uuid[], uuid[], uuid[], uuid[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_compliance_dashboard_v2(p_tu_ngay date, p_den_ngay date, p_bang_kiem_mas text[] DEFAULT NULL::text[], p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_supervision_type text DEFAULT 'ALL'::text) RETURNS json
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
  DROP TABLE IF EXISTS _gsc_sessions;

  CREATE TEMP TABLE _gsc_sessions ON COMMIT DROP AS
    SELECT
      s.id,
      s.khoa_id,
      s.nghe_nghiep_id,
      s.khu_vuc_id,
      s.ngay_giam_sat,
      coalesce(bk.ma_bk, '') AS loai_bang_kiem,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
        WHEN (
          (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
          AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
        )
        OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.gstt_fact_chung_sessions s
    LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.mdm_dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.mdm_dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_supervision_type = 'ALL'
        OR (
          CASE
            WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                 AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
            WHEN (
              (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
              AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
            )
            OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
            ELSE 'CHEO'
          END = p_supervision_type
        )
      )
      AND (
        p_bang_kiem_mas IS NULL
        OR bk.ma_bk = ANY (p_bang_kiem_mas)
        OR bk.id::text = ANY (p_bang_kiem_mas)
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids));

  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT s.id),
    'tong_quan_sat', count(r.id),
    'tong_vi_pham', count(r.id) FILTER (WHERE r.value = 'KHONG_DAT'),
    'ty_le_tuan_thu',
    CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END
  )
  INTO v_sum
  FROM _gsc_sessions s
  LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id;

  SELECT jsonb_agg(t) INTO v_khoa FROM (
    SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 5 DESC LIMIT 50
  ) t;

  SELECT jsonb_agg(t) INTO v_nghe FROM (
    SELECT coalesce(n.id, md5(coalesce(n.ten_nghe_nghiep, 'unknown'))::uuid) AS id, coalesce(n.ten_nghe_nghiep, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.mdm_dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_khu FROM (
    SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') AS label, min(ngay_giam_sat) AS min_date, count(r.id) AS tong,
           count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    GROUP BY 1
  ) t;

  SELECT jsonb_agg(t) INTO v_violation FROM (
    SELECT tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') AS so_vi_pham, count(r.id) AS tong_quan_sat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le_vi_pham
    FROM public.v_gsc_dashboard_rows r
    JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id
    JOIN _gsc_sessions s ON r.session_id = s.id
    GROUP BY 1, 2
    HAVING count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0
    ORDER BY 3 DESC LIMIT 20
  ) t;

  SELECT jsonb_agg(t) INTO v_source FROM (
    SELECT 'Khoa KSNK' AS ten, count(DISTINCT id) FILTER (WHERE stype = 'KSNK') AS so_phien FROM _gsc_sessions
    UNION ALL
    SELECT 'Giám sát chéo', count(DISTINCT id) FILTER (WHERE stype = 'CHEO') FROM _gsc_sessions
    UNION ALL
    SELECT 'Tự giám sát', count(DISTINCT id) FILTER (WHERE stype = 'TU_GIAM_SAT') FROM _gsc_sessions
  ) t;

  SELECT jsonb_agg(t) INTO v_part FROM (
    SELECT k.id, k.ten_khoa AS ten, count(DISTINCT s.id) FILTER (WHERE s.stype = 'TU_GIAM_SAT') AS so_phien
    FROM public.mdm_dm_khoa_phong k
    LEFT JOIN _gsc_sessions s ON k.id = s.khoa_id
    WHERE k.is_active = true
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_khoa_ids IS NULL OR k.id = ANY (p_khoa_ids))
    GROUP BY 1, 2 ORDER BY 3 ASC, 2 ASC
  ) t;

  RETURN jsonb_build_object(
    'summary', v_sum,
    'by_khoa', coalesce(v_khoa, '[]'::jsonb),
    'by_nghe_nghiep', coalesce(v_nghe, '[]'::jsonb),
    'by_khu_vuc', coalesce(v_khu, '[]'::jsonb),
    'trend', coalesce(v_trend, '[]'::jsonb),
    'violations', coalesce(v_violation, '[]'::jsonb),
    'supervision_sources', coalesce(v_source, '[]'::jsonb),
    'participation', coalesce(v_part, '[]'::jsonb)
  );
END;
$$;


--
-- Name: rpc_get_compliance_dashboard_v4(date, date, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_compliance_dashboard_v4(p_tu_ngay date, p_den_ngay date, p_khoa_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_catalog'
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


--
-- Name: FUNCTION rpc_get_compliance_dashboard_v4(p_tu_ngay date, p_den_ngay date, p_khoa_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_get_compliance_dashboard_v4(p_tu_ngay date, p_den_ngay date, p_khoa_id uuid) IS 'Dashboard tuân thủ v4 (slim): vùng nguy cơ IPAC + top tiêu chí Không đạt + tổng quan phiên.';


--
-- Name: rpc_get_dashboard_khoa_overview_rows(date, date, uuid[], uuid[], uuid[], uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_dashboard_khoa_overview_rows(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[]) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH kscope AS (
    SELECT kp.id, kp.ten_khoa
    FROM public.mdm_dm_khoa_phong kp
    WHERE COALESCE(kp.is_active, true)
      AND (p_khoa_ids IS NULL OR kp.id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR kp.khoi_id IS NULL OR kp.khoi_id = ANY (p_khoi_ids))
  ),
  vst_co_tu AS (
    SELECT khoa_id, SUM(so_co_hoi)::bigint AS n
    FROM public.gstt_fact_vst_opportunities_summary
    WHERE ngay_giam_sat >= p_tu_ngay AND ngay_giam_sat <= p_den_ngay
      AND stype = 'TU_GIAM_SAT'
      AND (p_khoa_ids IS NULL OR khoa_id = ANY (p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR khu_vuc_id = ANY (p_khu_vuc_ids))
      AND (p_khoi_ids IS NULL OR EXISTS (
        SELECT 1 FROM public.mdm_dm_khoa_phong kp
        WHERE kp.id = khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
      ))
    GROUP BY khoa_id
  ),
  vst_ph_tu AS (
    SELECT s.khoa_id, SUM(s.tong_phien)::bigint AS n
    FROM public.gstt_fact_vst_sessions_summary s
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND s.stype = 'TU_GIAM_SAT'
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
      AND (p_khoi_ids IS NULL OR EXISTS (
        SELECT 1 FROM public.mdm_dm_khoa_phong kp
        WHERE kp.id = s.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
      ))
      AND (
        p_nghe_nghiep_ids IS NULL
        OR EXISTS (
          SELECT 1 FROM public.gstt_fact_vst_opportunities_summary opp
          WHERE opp.session_id = s.session_id AND opp.nghe_nghiep_id = ANY (p_nghe_nghiep_ids)
        )
      )
    GROUP BY s.khoa_id
  ),
  gsc_tu AS (
    SELECT s.khoa_id, SUM(s.tong_phien)::bigint AS n
    FROM public.gstt_fact_gsc_dashboard_summary s
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND s.stype = 'TU_GIAM_SAT'
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
      AND (p_khoi_ids IS NULL OR EXISTS (
        SELECT 1 FROM public.mdm_dm_khoa_phong kp
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


--
-- Name: FUNCTION rpc_get_dashboard_khoa_overview_rows(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[], p_khoa_ids uuid[], p_nghe_nghiep_ids uuid[], p_khu_vuc_ids uuid[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_get_dashboard_khoa_overview_rows(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[], p_khoa_ids uuid[], p_nghe_nghiep_ids uuid[], p_khu_vuc_ids uuid[]) IS 'Command Center: theo khoa — Tự GS (VST/GSC). Phân loại stype + lọc phiên VST khớp rpc_get_dashboard_summary_table; GSC gom theo COALESCE(khoa phiên, khoa NS).';


--
-- Name: rpc_get_dashboard_ksnk_staff_supervision_stats(date, date, uuid[], uuid[], uuid[], uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_dashboard_ksnk_staff_supervision_stats(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[]) RETURNS jsonb
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
      LEFT JOIN public.mdm_dm_khoa_phong k ON ns.khoa_id = k.id
      LEFT JOIN public.sys_roles r ON ns.vai_tro_he_thong_id = r.id
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
      FROM public.gstt_fact_vst_opportunities_summary o
      INNER JOIN ksnk_staff ks ON ks.id = o.nguoi_giam_sat_id
      WHERE o.ngay_giam_sat >= p_tu_ngay AND o.ngay_giam_sat <= p_den_ngay
        AND (p_khoa_ids IS NULL OR o.khoa_id = ANY (p_khoa_ids))
        AND (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
        AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY (p_khu_vuc_ids))
        AND (p_khoi_ids IS NULL OR EXISTS (
          SELECT 1 FROM public.mdm_dm_khoa_phong kp
          WHERE kp.id = o.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
        ))
      GROUP BY 1
    ),
    gsc_agg AS (
      SELECT
        s.nguoi_giam_sat_id AS ns_id,
        SUM(s.tong_phien)::bigint AS so_phien_gsc
      FROM public.gstt_fact_gsc_dashboard_summary s
      INNER JOIN ksnk_staff ks ON ks.id = s.nguoi_giam_sat_id
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
        AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
        AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
        AND (p_khoi_ids IS NULL OR EXISTS (
          SELECT 1 FROM public.mdm_dm_khoa_phong kp
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


--
-- Name: FUNCTION rpc_get_dashboard_ksnk_staff_supervision_stats(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[], p_khoa_ids uuid[], p_nghe_nghiep_ids uuid[], p_khu_vuc_ids uuid[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_get_dashboard_ksnk_staff_supervision_stats(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[], p_khoa_ids uuid[], p_nghe_nghiep_ids uuid[], p_khu_vuc_ids uuid[]) IS 'Command Center: nhân sự KSNK (khoa KSNK hoặc vai_tro_he_thong_ksnk) — toàn bộ cơ hội/phiên VST + phiên GSC do họ là người giám sát (theo bộ lọc), mọi phân loại nguồn.';


--
-- Name: rpc_get_dashboard_summary_table(date, date, uuid[], uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_dashboard_summary_table(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  CREATE TEMP TABLE _all_sess ON COMMIT DROP AS
  SELECT 'VST_WHO'::text AS ma_bk, 'Vệ sinh tay (WHO)'::text AS ten_bk, s.stype
  FROM public.gstt_fact_vst_sessions_summary s
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
    AND (p_khoi_ids IS NULL OR EXISTS (
      SELECT 1 FROM public.mdm_dm_khoa_phong kp
      WHERE kp.id = s.khoa_id AND kp.khoi_id = ANY (p_khoi_ids)
    ))

  UNION ALL

  SELECT COALESCE(NULLIF(btrim(dbk.ma_bk), ''), 'UNKNOWN') AS ma_bk,
         COALESCE(dbk.ten_bang_kiem, 'Không rõ') AS ten_bk,
         s.stype
  FROM public.gstt_fact_gsc_dashboard_summary s
  LEFT JOIN public.gstt_dm_bang_kiem dbk ON dbk.id = s.bang_kiem_id
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
    AND (p_khoi_ids IS NULL OR EXISTS (
      SELECT 1 FROM public.mdm_dm_khoa_phong kp
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


--
-- Name: rpc_get_registry_options(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_registry_options(p_categories text[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_cat TEXT;
BEGIN
  FOREACH v_cat IN ARRAY p_categories LOOP
    CASE v_cat
      WHEN 'KHOA_PHONG' THEN
        v_result := v_result || jsonb_build_object('KHOA_PHONG', (SELECT json_agg(t) FROM (SELECT id, ten_khoa as ten, ma_khoa as ma FROM public.mdm_dm_khoa_phong WHERE is_active = true ORDER BY ten_khoa) t));
      WHEN 'NGHE_NGHIEP' THEN
        v_result := v_result || jsonb_build_object('NGHE_NGHIEP', (SELECT json_agg(t) FROM (SELECT id, ten_nghe_nghiep as ten, ma_nghe_nghiep as ma FROM public.mdm_dm_nghe_nghiep WHERE is_active = true ORDER BY ten_nghe_nghiep) t));
      WHEN 'CHUC_VU' THEN
        v_result := v_result || jsonb_build_object('CHUC_VU', (SELECT json_agg(t) FROM (SELECT id, ten_chuc_vu as ten FROM public.mdm_dm_chuc_vu WHERE is_active = true ORDER BY ten_chuc_vu) t));
      WHEN 'TO_CONG_TAC' THEN
        v_result := v_result || jsonb_build_object('TO_CONG_TAC', (SELECT json_agg(t) FROM (SELECT id, ten_to as ten FROM public.mdm_dm_to_cong_tac WHERE is_active = true ORDER BY ten_to) t));
      WHEN 'CHUC_DANH' THEN
        v_result := v_result || jsonb_build_object('CHUC_DANH', (SELECT json_agg(t) FROM (SELECT id, ten_chuc_danh as ten FROM public.mdm_dm_chuc_danh WHERE is_active = true ORDER BY ten_chuc_danh) t));
      WHEN 'ROLE' THEN
        v_result := v_result || jsonb_build_object('ROLE', (SELECT json_agg(t) FROM (SELECT id, name as ten FROM public.sys_roles ORDER BY name) t));
      WHEN 'LOAI_DUNG_CU' THEN
        v_result := v_result || jsonb_build_object('LOAI_DUNG_CU', (SELECT json_agg(t) FROM (SELECT id, ten_loai_dung_cu as ten, ma_loai_dung_cu as ma FROM public.cssd_dm_loai_dung_cu WHERE is_active = true ORDER BY ten_loai_dung_cu) t));
      WHEN 'BO_DUNG_CU' THEN
        v_result := v_result || jsonb_build_object('BO_DUNG_CU', (SELECT json_agg(t) FROM (SELECT id, ten_bo as ten, ma_bo as ma FROM public.cssd_dm_bo_dung_cu WHERE is_active = true ORDER BY ten_bo) t));
      WHEN 'KHU_VUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('KHU_VUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_khu_vuc as ten, ma_khu_vuc as ma FROM public.gstt_dm_khu_vuc_giam_sat WHERE is_active = true ORDER BY ten_khu_vuc) t));
      WHEN 'HINH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('HINH_THUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_hinh_thuc as ten, ma_hinh_thuc as ma FROM public.gstt_dm_hinh_thuc_giam_sat WHERE is_active = true ORDER BY ten_hinh_thuc) t));
      WHEN 'CACH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('CACH_THUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_cach_thuc as ten, ma_cach_thuc as ma FROM public.gstt_dm_cach_thuc_giam_sat WHERE is_active = true ORDER BY ten_cach_thuc) t));
    END CASE;
  END LOOP;
  RETURN v_result;
END;
$$;


--
-- Name: rpc_get_vst_dashboard(date, date, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_vst_dashboard(p_tu_ngay date, p_den_ngay date, p_khoa_ids uuid[] DEFAULT NULL::uuid[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RAISE EXCEPTION
    'rpc_get_vst_dashboard is deprecated (2026-06-02). Use rpc_dashboard_vst_strategic_analytics instead.'
    USING ERRCODE = '57000';
END;
$$;


--
-- Name: FUNCTION rpc_get_vst_dashboard(p_tu_ngay date, p_den_ngay date, p_khoa_ids uuid[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_get_vst_dashboard(p_tu_ngay date, p_den_ngay date, p_khoa_ids uuid[]) IS 'DEPRECATED 2026-06-02: superseded by rpc_dashboard_vst_strategic_analytics.';


--
-- Name: rpc_get_vst_dashboard_v2(date, date, uuid[], uuid[], uuid[], uuid[], text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_vst_dashboard_v2(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_trend_type text DEFAULT 'month'::text, p_supervision_type text DEFAULT 'ALL'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RAISE EXCEPTION
    'rpc_get_vst_dashboard_v2 is deprecated (2026-06-02). Use rpc_dashboard_vst_strategic_analytics instead.'
    USING ERRCODE = '57000';
END;
$$;


--
-- Name: FUNCTION rpc_get_vst_dashboard_v2(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[], p_khoa_ids uuid[], p_nghe_nghiep_ids uuid[], p_khu_vuc_ids uuid[], p_trend_type text, p_supervision_type text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_get_vst_dashboard_v2(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[], p_khoa_ids uuid[], p_nghe_nghiep_ids uuid[], p_khu_vuc_ids uuid[], p_trend_type text, p_supervision_type text) IS 'DEPRECATED 2026-06-02: superseded by rpc_dashboard_vst_strategic_analytics.';


--
-- Name: rpc_get_vst_moment_table_only(date, date, uuid[], uuid[], uuid[], uuid[], text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_vst_moment_table_only(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_trend_type text DEFAULT 'month'::text, p_supervision_type text DEFAULT 'ALL'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RAISE EXCEPTION
    'rpc_get_vst_moment_table_only is deprecated (2026-06-02). Use rpc_dashboard_vst_strategic_analytics instead.'
    USING ERRCODE = '57000';
END;
$$;


--
-- Name: FUNCTION rpc_get_vst_moment_table_only(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[], p_khoa_ids uuid[], p_nghe_nghiep_ids uuid[], p_khu_vuc_ids uuid[], p_trend_type text, p_supervision_type text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_get_vst_moment_table_only(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[], p_khoa_ids uuid[], p_nghe_nghiep_ids uuid[], p_khu_vuc_ids uuid[], p_trend_type text, p_supervision_type text) IS 'DEPRECATED 2026-06-02: superseded by rpc_dashboard_vst_strategic_analytics.';


--
-- Name: rpc_mdm_nhan_su_max_numeric_suffix(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_mdm_nhan_su_max_numeric_suffix(p_prefix text) RETURNS integer
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $_$
  SELECT coalesce(
    max(
      (substring(upper(btrim(m.ma_nv)) from (char_length(b.prefix) + 1)))::bigint
    ),
    0
  )::integer
  FROM public.mdm_nhan_su m
  CROSS JOIN LATERAL (
    SELECT upper(btrim(coalesce(p_prefix, ''))) AS prefix
  ) b
  WHERE b.prefix <> ''
    AND char_length(b.prefix) BETWEEN 1 AND 12
    AND m.ma_nv IS NOT NULL
    AND upper(btrim(m.ma_nv)) LIKE b.prefix || '%'
    AND substring(upper(btrim(m.ma_nv)) from char_length(b.prefix) + 1) ~ '^[0-9]+$';
$_$;


--
-- Name: FUNCTION rpc_mdm_nhan_su_max_numeric_suffix(p_prefix text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_mdm_nhan_su_max_numeric_suffix(p_prefix text) IS 'Sinh mã nhân sự: max phần số sau tiền tố ma_nv (mdm_nhan_su), RLS theo người gọi.';


--
-- Name: rpc_reorder_tieu_chi_bang_kiem(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_reorder_tieu_chi_bang_kiem(p_bang_kiem_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Cập nhật STT dựa trên thứ tự STT cũ và thời gian tạo
  WITH reordered AS (
    SELECT id, row_number() OVER (ORDER BY stt ASC, created_at ASC) as new_stt
    FROM public.gstt_dm_tieu_chi_bang_kiem
    WHERE bang_kiem_id = p_bang_kiem_id AND is_active = true
  )
  UPDATE public.gstt_dm_tieu_chi_bang_kiem t
  SET stt = r.new_stt, updated_at = now()
  FROM reordered r
  WHERE t.id = r.id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: rpc_scan_workflow_station(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_scan_workflow_station(p_ma_qr text, p_target_station text, p_operator_label text DEFAULT 'CSSD'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row RECORD;
  v_current_ma text;
  v_target_id uuid;
  v_current_idx int;
  v_target_idx int;
  v_operator_id uuid;
  v_me RECORD;
  v_sub_block int;
  v_sub_codes text;
BEGIN
  IF upper(trim(coalesce(p_target_station, ''))) = 'TIET_KHUAN' THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Không xử lý tiệt khuẩn bằng quét tại trang này khi chưa có phiếu mẻ. Vào Mẻ tiệt khuẩn: tạo phiếu, rồi quét QR bộ trong màn hình mẻ.'
    );
  END IF;

  SELECT id INTO v_operator_id
  FROM public.mdm_nhan_su
  WHERE lower(email) = lower(trim(p_operator_label)) AND is_active = true
  LIMIT 1;

  SELECT q.*, t.ma_tram AS ma_tram_hien_tai
  INTO v_row
  FROM public.cssd_fact_quy_trinh q
  LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
  WHERE upper(q.ma_qr_quy_trinh) = upper(trim(p_ma_qr))
    AND q.is_active = true
  ORDER BY q.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ hoặc bộ chưa được tiếp nhận.');
  END IF;

  IF coalesce(v_row.is_dong_bang, false) = true THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Bộ dụng cụ ' || p_ma_qr || ' đang bị khóa an toàn (đóng băng).'
    );
  END IF;

  SELECT id INTO v_target_id
  FROM public.cssd_dm_tram
  WHERE upper(trim(ma_tram)) = upper(trim(p_target_station)) AND is_active = true
  LIMIT 1;

  IF v_target_id IS NULL THEN
    SELECT id INTO v_target_id
    FROM public.cssd_dm_tram
    WHERE upper(trim(ma_tram)) = upper(trim(p_target_station)) AND is_active = true
    LIMIT 1;
  END IF;

  IF v_target_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Trạm không hợp lệ: ' || coalesce(p_target_station, ''));
  END IF;

  v_current_ma := coalesce(v_row.ma_tram_hien_tai, '');

  v_current_idx := CASE v_current_ma
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  v_target_idx := CASE upper(trim(p_target_station))
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  IF v_current_ma = 'TIET_KHUAN' AND upper(trim(p_target_station)) = 'CAP_PHAT' THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Bộ đang ở tiệt khuẩn: hoàn tất mẻ TK (QC) trước — hệ thống tự chuyển Cấp phát khi mẻ đạt.'
    );
  END IF;

  IF NOT (v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN') THEN
    IF v_target_idx != v_current_idx + 1 THEN
      RETURN json_build_object('success', false, 'message', 'Sai trạm! Quy trình đang ở bước ' || v_current_ma);
    END IF;
  END IF;

  IF upper(trim(p_target_station)) = 'CAP_PHAT' THEN
    IF v_row.lo_tiet_khuan_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Bộ dụng cụ này CHƯA VÀO MẺ TIỆT KHUẨN. Không thể cấp phát.'
      );
    END IF;

    SELECT ma_lo_tiet_khuan, ket_qua_test
    INTO v_me
    FROM public.cssd_fact_lo_tiet_khuan
    WHERE id = v_row.lo_tiet_khuan_id;

    IF NOT FOUND OR v_me.ket_qua_test IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Mẻ tiệt khuẩn ' || coalesce(v_me.ma_lo_tiet_khuan, 'liên quan') || ' CHƯA CÓ KẾT QUẢ NỘI KIỂM.'
      );
    END IF;

    IF v_me.ket_qua_test = false THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Mẻ tiệt khuẩn ' || v_me.ma_lo_tiet_khuan || ' KHÔNG ĐẠT. Bộ phải được tái xử lý.'
      );
    END IF;

    SELECT count(*)::int, string_agg(upper(trim(sub.ma_qr_quy_trinh)), ', ' ORDER BY sub.ma_qr_quy_trinh)
    INTO v_sub_block, v_sub_codes
    FROM public.cssd_fact_quy_trinh sub
    LEFT JOIN public.cssd_dm_tram tr ON tr.id = sub.tram_hien_tai_id
    WHERE sub.quy_trinh_cha_id = v_row.id
      AND sub.is_active = true
      AND coalesce(sub.ma_vai_tro_bo, 'DON') = 'SUB'
      AND coalesce(upper(tr.ma_tram), '') <> 'CAP_PHAT';

    IF coalesce(v_sub_block, 0) > 0 THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Cảnh báo hội quân (merge): bộ còn ' || v_sub_block || ' kiện phụ chưa ở Cấp phát. QR phụ: ' || coalesce(v_sub_codes, '—') || '.'
      );
    END IF;
  END IF;

  IF v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN' THEN
    INSERT INTO public.cssd_fact_quy_trinh(
      ma_qr_quy_trinh,
      bo_dung_cu_id,
      tram_hien_tai_id,
      suds_count,
      tinh_trang,
      is_dong_bang,
      is_active,
      created_at,
      updated_at,
      thoi_gian_tiep_nhan,
      nguoi_tiep_nhan_id
    ) VALUES (
      p_ma_qr,
      v_row.bo_dung_cu_id,
      v_target_id,
      coalesce(v_row.suds_count, 0) + 1,
      'BINH_THUONG',
      false,
      true,
      now(),
      now(),
      now(),
      v_operator_id
    );
    UPDATE public.cssd_fact_quy_trinh
    SET is_active = false, updated_at = now()
    WHERE id = v_row.id;
  ELSE
    UPDATE public.cssd_fact_quy_trinh
    SET
      tram_hien_tai_id = v_target_id,
      updated_at = now(),
      thoi_gian_lam_sach = CASE WHEN p_target_station = 'LAM_SACH' THEN now() ELSE thoi_gian_lam_sach END,
      nguoi_lam_sach_id = CASE WHEN p_target_station = 'LAM_SACH' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_lam_sach_id END,
      thoi_gian_qc = CASE WHEN p_target_station = 'QC' THEN now() ELSE thoi_gian_qc END,
      nguoi_kiem_tra_id = CASE WHEN p_target_station = 'QC' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_kiem_tra_id END,
      thoi_gian_dong_goi = CASE WHEN p_target_station = 'DONG_GOI' THEN now() ELSE thoi_gian_dong_goi END,
      nguoi_dong_goi_id = CASE WHEN p_target_station = 'DONG_GOI' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_dong_goi_id END,
      thoi_gian_tiet_khuan = CASE WHEN p_target_station = 'TIET_KHUAN' THEN now() ELSE thoi_gian_tiet_khuan END,
      nguoi_tiet_khuan_id = CASE WHEN p_target_station = 'TIET_KHUAN' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_tiet_khuan_id END,
      thoi_gian_cap_phat = CASE WHEN p_target_station = 'CAP_PHAT' THEN now() ELSE thoi_gian_cap_phat END,
      nguoi_cap_phat_id = CASE WHEN p_target_station = 'CAP_PHAT' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_cap_phat_id END
    WHERE id = v_row.id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'data', jsonb_build_object('den', upper(trim(p_target_station)), 'operator', p_operator_label)
  );
END;
$$;


--
-- Name: FUNCTION rpc_scan_workflow_station(p_ma_qr text, p_target_station text, p_operator_label text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rpc_scan_workflow_station(p_ma_qr text, p_target_station text, p_operator_label text) IS 'Quét chuyển trạm CSSD (atomic). Gate CAP_PHAT: mẻ TK đạt, merge SUB; chặn quét TK tại luồng 6 trạm.';


--
-- Name: touch_updated_at_mdm_registry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_updated_at_mdm_registry() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cssd_dm_bo_dung_cu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_dm_bo_dung_cu (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_bo character varying(50) NOT NULL,
    ten_bo text NOT NULL,
    loai_dung_cu_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    trang_thai character varying(50) DEFAULT 'ACTIVE'::character varying,
    ghi_chu text,
    ngay_kiem_ke_gan_nhat timestamp with time zone,
    quy_cach text,
    khoa_su_dung_id uuid,
    phan_loai_bo text DEFAULT 'PHAU_THUAT'::text NOT NULL,
    co_ma_dinh_danh_rieng boolean DEFAULT true NOT NULL,
    CONSTRAINT dm_bo_dung_cu_phan_loai_bo_check CHECK ((phan_loai_bo = ANY (ARRAY['PHAU_THUAT'::text, 'THU_THUAT'::text])))
);

ALTER TABLE ONLY public.cssd_dm_bo_dung_cu FORCE ROW LEVEL SECURITY;


--
-- Name: cssd_dm_bo_dung_cu_chi_tiet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_dm_bo_dung_cu_chi_tiet (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bo_dung_cu_id uuid,
    ten_dung_cu_le text NOT NULL,
    so_luong integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    ghi_chu text,
    ten_chi_tiet text,
    loai_dung_cu_id uuid,
    specs jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE ONLY public.cssd_dm_bo_dung_cu_chi_tiet FORCE ROW LEVEL SECURITY;


--
-- Name: cssd_dm_bo_phan_bo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_dm_bo_phan_bo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bo_dung_cu_id uuid NOT NULL,
    khoa_phong_id uuid NOT NULL,
    so_luong_co_so integer DEFAULT 0 NOT NULL,
    so_luong_hien_tai integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.cssd_dm_bo_phan_bo FORCE ROW LEVEL SECURITY;


--
-- Name: cssd_dm_hoa_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_dm_hoa_chat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_hoa_chat character varying(50) NOT NULL,
    ten_hoa_chat text NOT NULL,
    loai_hoa_chat character varying(50) DEFAULT 'HOA_CHAT'::character varying,
    don_vi_tinh character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now(),
    han_su_dung date,
    nguong_ton_toi_thieu numeric(18,4),
    specs jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY public.cssd_dm_hoa_chat FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN cssd_dm_hoa_chat.nguong_ton_toi_thieu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_dm_hoa_chat.nguong_ton_toi_thieu IS 'KSNK kho: cảnh báo khi tổng tồn <= giá trị (theo đơn vị dm_hoa_chat).';


--
-- Name: COLUMN cssd_dm_hoa_chat.specs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_dm_hoa_chat.specs IS 'Thông số kỹ thuật tùy biến của hóa chất dưới dạng JSONB (quy_cach, nong_do, ghi_chu, v.v.)';


--
-- Name: cssd_dm_loai_dung_cu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_dm_loai_dung_cu (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_loai character varying(50) NOT NULL,
    ten_loai text NOT NULL,
    mo_ta text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    so_ngay_han_dung integer DEFAULT 30,
    phan_loai text DEFAULT 'PHAU_THUAT'::text NOT NULL,
    so_luong_kho_du_phong integer DEFAULT 0 NOT NULL,
    specs jsonb DEFAULT '{}'::jsonb,
    phan_loai_spaulding text DEFAULT 'CRITICAL'::text NOT NULL,
    is_chiu_nhiet boolean DEFAULT true NOT NULL,
    phuong_phap_tiet_khuan_chi_dinh text DEFAULT 'STEAM_134'::text NOT NULL,
    CONSTRAINT cssd_dm_loai_dung_cu_phan_loai_spaulding_check CHECK ((phan_loai_spaulding = ANY (ARRAY['CRITICAL'::text, 'SEMI_CRITICAL'::text, 'NON_CRITICAL'::text]))),
    CONSTRAINT cssd_dm_loai_dung_cu_phuong_phap_tiet_khuan_chi_dinh_check CHECK ((phuong_phap_tiet_khuan_chi_dinh = ANY (ARRAY['STEAM_134'::text, 'STEAM_121'::text, 'PLASMA'::text, 'EO'::text]))),
    CONSTRAINT dm_loai_dung_cu_phan_loai_check CHECK ((phan_loai = ANY (ARRAY['PHAU_THUAT'::text, 'THU_THUAT'::text])))
);

ALTER TABLE ONLY public.cssd_dm_loai_dung_cu FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE cssd_dm_loai_dung_cu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cssd_dm_loai_dung_cu IS 'Bảng danh mục vật lý độc lập quản lý phân loại dụng cụ y tế CSSD (Phẫu thuật, Nội soi, v.v.).';


--
-- Name: sys_lookup_value; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_lookup_value (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_type text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.sys_lookup_value FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE sys_lookup_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sys_lookup_value IS 'Bảng danh mục lookup hợp nhất từ 11 bảng danh mục phụ để chuẩn hóa tinh gọn DB KSNK BV103.';


--
-- Name: cssd_dm_loai_may; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cssd_dm_loai_may WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_loai_may,
    name AS ten_loai_may,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'LOAI_MAY_TIET_KHUAN'::text);


--
-- Name: VIEW cssd_dm_loai_may; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.cssd_dm_loai_may IS 'SSOT module CSSD — loại máy tiệt khuẩn (sys_lookup_value LOAI_MAY_TIET_KHUAN).';


--
-- Name: cssd_dm_loai_su_co; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cssd_dm_loai_su_co WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_loai_su_co,
    name AS ten_loai_su_co,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'LOAI_SU_CO'::text);


--
-- Name: cssd_dm_thiet_bi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_dm_thiet_bi (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_thiet_bi character varying(50) NOT NULL,
    ten_thiet_bi text NOT NULL,
    trang_thai character varying(50) DEFAULT 'READY'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    ngay_dua_vao_su_dung date DEFAULT CURRENT_DATE,
    chu_ky_bao_tri_ngay integer DEFAULT 180,
    ngay_bao_tri_gan_nhat date,
    ngay_bao_tri_tiep_theo date,
    loai_may_id uuid,
    specs jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY public.cssd_dm_thiet_bi FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN cssd_dm_thiet_bi.specs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_dm_thiet_bi.specs IS 'Thông số kỹ thuật tùy biến của thiết bị dưới dạng JSONB (hang_san_xuat, nam_san_xuat, ghi_chu, v.v.)';


--
-- Name: cssd_dm_tram; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cssd_dm_tram WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_tram,
    name AS ten_tram,
    COALESCE(((metadata ->> 'thu_tu'::text))::smallint, (0)::smallint) AS thu_tu,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'TRAM_CSSD'::text);


--
-- Name: VIEW cssd_dm_tram; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.cssd_dm_tram IS 'SSOT module CSSD — trạm workflow (sys_lookup_value TRAM_CSSD).';


--
-- Name: cssd_fact_bao_tri; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_fact_bao_tri (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_phieu character varying(80) NOT NULL,
    thiet_bi_id uuid NOT NULL,
    trang_thai character varying(40) NOT NULL,
    ly_do text,
    ket_qua_ghi_nhan text,
    thoi_gian_bat_dau timestamp with time zone DEFAULT now() NOT NULL,
    thoi_gian_ket_thuc timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_bao_tri_thiet_bi_trang_thai_check CHECK (((trang_thai)::text = ANY (ARRAY[('DANG_THUC_HIEN'::character varying)::text, ('HOAN_THANH'::character varying)::text, ('HUY'::character varying)::text])))
);


--
-- Name: TABLE cssd_fact_bao_tri; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cssd_fact_bao_tri IS 'CSSD: phiếu bảo trì thiết bị — tối đa một phiếu DANG_THUC_HIEN / máy; đồng bộ dm_thiet_bi.trang_thai.';


--
-- Name: cssd_fact_dieu_chuyen_thanh_phan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_fact_dieu_chuyen_thanh_phan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tu_quy_trinh_id uuid NOT NULL,
    den_quy_trinh_id uuid NOT NULL,
    ten_dung_cu_le text NOT NULL,
    so_luong integer NOT NULL,
    dm_bo_dung_cu_chi_tiet_id uuid,
    ghi_chu text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_cssd_dieu_chuyen_thanh_phan_so_luong_check CHECK ((so_luong > 0))
);


--
-- Name: TABLE cssd_fact_dieu_chuyen_thanh_phan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cssd_fact_dieu_chuyen_thanh_phan IS 'CSSD: nhật ký điều chuyển cấu phần giữa hai bộ QR.';


--
-- Name: cssd_fact_kho_chi_tiet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_fact_kho_chi_tiet (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    giao_dich_id uuid,
    vat_tu_id uuid,
    so_luong integer NOT NULL,
    han_su_dung date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    anh_minh_chung text,
    ghi_chu text,
    quy_trinh_id uuid
);


--
-- Name: cssd_fact_kho_giao_dich; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_fact_kho_giao_dich (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loai_dung_cu_id uuid NOT NULL,
    bo_dung_cu_id uuid,
    quy_trinh_id uuid,
    loai_giao_dich text NOT NULL,
    so_luong_thay_doi integer NOT NULL,
    ghi_chu text,
    nguoi_thuc_hien_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT fact_kho_dung_cu_giao_dich_loai_giao_dich_check CHECK ((loai_giao_dich = ANY (ARRAY['NHAP_KHO'::text, 'BAO_HONG'::text, 'BAO_MAT'::text, 'BO_SUNG'::text, 'DIEU_CHUYEN'::text])))
);


--
-- Name: cssd_fact_kho_hoa_chat_giao_dich; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_fact_kho_hoa_chat_giao_dich (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_phieu character varying(80) NOT NULL,
    dm_hoa_chat_id uuid NOT NULL,
    loai_giao_dich character varying(24) NOT NULL,
    so_luong_co_dau numeric(18,4) NOT NULL,
    ma_lo character varying(80),
    han_su_dung date,
    ghi_chu text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_kho_hc_so_luong_loai CHECK (((((loai_giao_dich)::text = 'NHAP'::text) AND (so_luong_co_dau > (0)::numeric)) OR (((loai_giao_dich)::text = 'XUAT'::text) AND (so_luong_co_dau < (0)::numeric)) OR (((loai_giao_dich)::text = 'DIEU_CHINH'::text) AND (so_luong_co_dau <> (0)::numeric)))),
    CONSTRAINT fact_kho_hoa_chat_giao_dich_loai_giao_dich_check CHECK (((loai_giao_dich)::text = ANY (ARRAY[('NHAP'::character varying)::text, ('XUAT'::character varying)::text, ('DIEU_CHINH'::character varying)::text])))
);


--
-- Name: TABLE cssd_fact_kho_hoa_chat_giao_dich; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cssd_fact_kho_hoa_chat_giao_dich IS 'KSNK kho hóa chất/vật tư: NHAP >0, XUAT <0, DIEU_CHINH có thể +/- ; tồn theo lô = SUM(so_luong_co_dau) GROUP BY dm_hoa_chat_id, ma_lo, han_su_dung.';


--
-- Name: cssd_fact_lifecycle_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_fact_lifecycle_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quy_trinh_id uuid NOT NULL,
    ma_su_kien character varying(80) NOT NULL,
    ma_tram character varying(50),
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    ghi_chu text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE cssd_fact_lifecycle_event; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cssd_fact_lifecycle_event IS 'CSSD: nhật ký sự kiện vòng đời (bổ sung fact_nhat_ky_quet), phục vụ domino/audit.';


--
-- Name: cssd_fact_lo_tiet_khuan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_fact_lo_tiet_khuan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_lo_tiet_khuan character varying(50) NOT NULL,
    thiet_bi_id uuid,
    thoi_gian_bat_dau timestamp with time zone,
    thoi_gian_ket_thuc timestamp with time zone,
    ket_qua_test boolean,
    nguoi_van_hanh_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    nhiet_do numeric,
    ap_suat numeric,
    thoi_gian_chu_ky integer,
    ghi_chu text,
    ket_qua_bi boolean,
    ket_qua_ci boolean,
    ghi_chu_qc text,
    tk_chot_nap_at timestamp with time zone,
    tk_mo_form_qc_at timestamp with time zone,
    tk_qc_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    loai_may_id uuid
);


--
-- Name: COLUMN cssd_fact_lo_tiet_khuan.tk_chot_nap_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_fact_lo_tiet_khuan.tk_chot_nap_at IS 'Xác nhận bắt đầu tiệt khuẩn: khóa nạp thêm, chuyển bộ trong mẻ sang trạm TIET_KHUAN.';


--
-- Name: COLUMN cssd_fact_lo_tiet_khuan.tk_mo_form_qc_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_fact_lo_tiet_khuan.tk_mo_form_qc_at IS 'Kết thúc chu trình tiệt khuẩn (vật lý): cho phép nhập thông số/đánh giá QC.';


--
-- Name: COLUMN cssd_fact_lo_tiet_khuan.tk_qc_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_fact_lo_tiet_khuan.tk_qc_json IS 'Thông số QC mẻ (máy, chỉ thị, test tùy chọn, URL ảnh minh chứng).';


--
-- Name: cssd_fact_quy_trinh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_fact_quy_trinh (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_qr_quy_trinh character varying(100) NOT NULL,
    bo_dung_cu_id uuid,
    nguoi_dang_giu_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    nguoi_tiep_nhan_id uuid,
    nguoi_lam_sach_id uuid,
    nguoi_kiem_tra_id uuid,
    nguoi_dong_goi_id uuid,
    nguoi_tiet_khuan_id uuid,
    nguoi_cap_phat_id uuid,
    thoi_gian_tiep_nhan timestamp with time zone,
    thoi_gian_lam_sach timestamp with time zone,
    thoi_gian_qc timestamp with time zone,
    thoi_gian_dong_goi timestamp with time zone,
    thoi_gian_tiet_khuan timestamp with time zone,
    thoi_gian_cap_phat timestamp with time zone,
    lo_tiet_khuan_id uuid,
    suds_count integer DEFAULT 0,
    ngay_tiet_khuan timestamp with time zone,
    han_su_dung timestamp with time zone,
    tinh_trang character varying(50) DEFAULT 'BINH_THUONG'::character varying,
    is_dong_bang boolean DEFAULT false NOT NULL,
    quy_trinh_cha_id uuid,
    ma_vai_tro_bo character varying(20) DEFAULT 'DON'::character varying NOT NULL,
    ngay_het_han timestamp with time zone,
    tram_hien_tai_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: TABLE cssd_fact_quy_trinh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cssd_fact_quy_trinh IS 'Bảng quy trình (Cho phép lưu lịch sử nhiều chu kỳ của cùng 1 mã QR)';


--
-- Name: COLUMN cssd_fact_quy_trinh.nguoi_tiep_nhan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_fact_quy_trinh.nguoi_tiep_nhan_id IS 'Người thực hiện bước tiếp nhận';


--
-- Name: COLUMN cssd_fact_quy_trinh.is_dong_bang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_fact_quy_trinh.is_dong_bang IS 'Khóa an toàn: thiếu/hỏng cấu phần — chỉ quản trị mở.';


--
-- Name: COLUMN cssd_fact_quy_trinh.quy_trinh_cha_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_fact_quy_trinh.quy_trinh_cha_id IS 'QR phụ (SUB) trỏ về quy trình MAIN khi tách mã đóng gói.';


--
-- Name: COLUMN cssd_fact_quy_trinh.ma_vai_tro_bo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_fact_quy_trinh.ma_vai_tro_bo IS 'DON | MAIN | SUB — hội quân cấp phát.';


--
-- Name: COLUMN cssd_fact_quy_trinh.ngay_het_han; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_fact_quy_trinh.ngay_het_han IS 'Hạn sử dụng của bộ dụng cụ (tính từ ngày tiệt khuẩn đạt)';


--
-- Name: cssd_fact_quy_trinh_thanh_phan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_fact_quy_trinh_thanh_phan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quy_trinh_id uuid NOT NULL,
    dm_bo_dung_cu_chi_tiet_id uuid,
    ten_dung_cu_le text NOT NULL,
    so_luong_ke_hoach integer DEFAULT 0 NOT NULL,
    so_luong_thuc_te integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE cssd_fact_quy_trinh_thanh_phan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cssd_fact_quy_trinh_thanh_phan IS 'CSSD: cấu phần theo từng QR vòng đời (bám dm_bo_dung_cu_chi_tiet).';


--
-- Name: cssd_fact_su_co; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cssd_fact_su_co (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quy_trinh_id uuid,
    ma_qr_quy_trinh text,
    ma_tram_phat_hien text NOT NULL,
    ma_tram_gay_loi text,
    mo_ta text,
    is_red_alert boolean DEFAULT false,
    nguoi_bao_id uuid,
    nguoi_xac_nhan_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    loai_su_co_id uuid,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: TABLE cssd_fact_su_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cssd_fact_su_co IS 'Bảng lưu tất cả sự cố CSSD - Configuration-Driven Hybrid EAV';


--
-- Name: COLUMN cssd_fact_su_co.ma_qr_quy_trinh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_fact_su_co.ma_qr_quy_trinh IS 'Mã QR của quy trình bộ dụng cụ. Nullable khi báo cáo sự cố máy móc hoặc hóa chất chung.';


--
-- Name: COLUMN cssd_fact_su_co.attributes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cssd_fact_su_co.attributes IS 'Chứa toàn bộ các thuộc tính động mở rộng của sự cố dưới dạng JSONB (thay thế EAV)';


--
-- Name: gstt_dm_bang_kiem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gstt_dm_bang_kiem (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_bk text NOT NULL,
    ten_bang_kiem text NOT NULL,
    mo_ta text,
    is_active boolean DEFAULT true,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    loai_hinh_giam_sat text DEFAULT 'TRUC_TIEP'::text,
    tieu_chi_jsonb jsonb DEFAULT '[]'::jsonb NOT NULL,
    phan_loai_chuyen_mon text,
    loai_giam_sat text,
    doi_tuong_giam_sat text,
    cach_tinh_diem text,
    phien_ban text DEFAULT '1.0'::text,
    CONSTRAINT chk_gstt_bk_cach_tinh_diem CHECK (((cach_tinh_diem IS NULL) OR (cach_tinh_diem = ANY (ARRAY['TY_LE'::text, 'TRON_GOI'::text, 'DAT_KHONG_DAT'::text, 'NHAT_KY'::text])))),
    CONSTRAINT chk_gstt_bk_doi_tuong_giam_sat CHECK (((doi_tuong_giam_sat IS NULL) OR (doi_tuong_giam_sat = ANY (ARRAY['NHAN_VIEN'::text, 'NGUOI_BENH'::text, 'MOI_TRUONG'::text, 'THIET_BI'::text, 'ME_TIET_KHUAN'::text])))),
    CONSTRAINT chk_gstt_bk_loai_giam_sat CHECK (((loai_giam_sat IS NULL) OR (loai_giam_sat = ANY (ARRAY['TUAN_THU'::text, 'NHAT_KY_VAN_HANH'::text, 'DANH_GIA_HE_THONG'::text])))),
    CONSTRAINT chk_gstt_bk_phan_loai_chuyen_mon CHECK (((phan_loai_chuyen_mon IS NULL) OR (phan_loai_chuyen_mon = ANY (ARRAY['PHONG_NGUA_CHUAN'::text, 'GOI_CAN_THIEP'::text, 'XU_LY_DUNG_CU'::text, 'MOI_TRUONG_CHAT_THAI'::text, 'CHUYEN_KHOA'::text, 'QUAN_TRI_HE_THONG'::text]))))
);

ALTER TABLE ONLY public.gstt_dm_bang_kiem FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN gstt_dm_bang_kiem.tieu_chi_jsonb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_dm_bang_kiem.tieu_chi_jsonb IS 'Danh sách mảng các tiêu chí kiểm tra dưới dạng JSONB (thay thế EAV)';


--
-- Name: COLUMN gstt_dm_bang_kiem.phan_loai_chuyen_mon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_dm_bang_kiem.phan_loai_chuyen_mon IS 'Phân loại chuyên môn KSNK (Category): PHONG_NGUA_CHUAN | GOI_CAN_THIEP | XU_LY_DUNG_CU | MOI_TRUONG_CHAT_THAI | CHUYEN_KHOA. Ánh xạ Dim_Checklist_Template.Category trong tài liệu.';


--
-- Name: COLUMN gstt_dm_bang_kiem.loai_giam_sat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_dm_bang_kiem.loai_giam_sat IS 'Loại hoạt động giám sát (Super_Category): TUAN_THU=mạng lưới audit hành vi NVYT; NHAT_KY_VAN_HANH=NVYT khoa tự log số liệu (nhiệt độ lò TK, áp suất AIIR, MEC, RO); DANH_GIA_HE_THONG=thanh tra JCI/APSIC dùng nội bộ.';


--
-- Name: COLUMN gstt_dm_bang_kiem.doi_tuong_giam_sat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_dm_bang_kiem.doi_tuong_giam_sat IS 'Đối tượng được quan sát (Target_Type): NHAN_VIEN | NGUOI_BENH | MOI_TRUONG | THIET_BI | ME_TIET_KHUAN. Quyết định form fields ở Slice 5 (NHAN_VIEN bắt nghề nghiệp, NGUOI_BENH bắt mã NB...).';


--
-- Name: COLUMN gstt_dm_bang_kiem.cach_tinh_diem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_dm_bang_kiem.cach_tinh_diem IS 'Thuật toán scoring (Scoring_Logic): TY_LE=PERCENTAGE %; TRON_GOI=ALL_OR_NONE care bundle; DAT_KHONG_DAT=PASS_FAIL ngưỡng cứng; NHAT_KY=LOG_ENTRY chỉ ghi không tính rate. Slice 4 implement engine.';


--
-- Name: COLUMN gstt_dm_bang_kiem.phien_ban; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_dm_bang_kiem.phien_ban IS 'Phiên bản bảng kiểm (Dim_Checklist_Template.Version) — text linh hoạt (1.0, 2.1...). Cho audit thay đổi nội dung tiêu chí.';


--
-- Name: gstt_dm_cach_thuc_giam_sat; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.gstt_dm_cach_thuc_giam_sat WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_cach_thuc,
    name AS ten_cach_thuc,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'CACH_THUC_GIAM_SAT'::text);


--
-- Name: gstt_dm_hinh_thuc_giam_sat; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.gstt_dm_hinh_thuc_giam_sat WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_hinh_thuc,
    name AS ten_hinh_thuc,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'HINH_THUC_GIAM_SAT'::text);


--
-- Name: gstt_dm_khu_vuc_giam_sat; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.gstt_dm_khu_vuc_giam_sat WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_khu_vuc,
    name AS ten_khu_vuc,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'KHU_VUC_GIAM_SAT'::text);


--
-- Name: gstt_dm_tieu_chi_bang_kiem; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.gstt_dm_tieu_chi_bang_kiem WITH (security_invoker='true') AS
 SELECT ((r.elem ->> 'id'::text))::uuid AS id,
    (r.elem ->> 'ma_tc'::text) AS ma_tc,
    s.id AS bang_kiem_id,
    ((r.elem ->> 'stt'::text))::integer AS stt,
    (r.elem ->> 'noi_dung'::text) AS noi_dung,
    (r.elem ->> 'ghi_chu'::text) AS ghi_chu,
    COALESCE(((r.elem ->> 'is_active'::text))::boolean, true) AS is_active,
    COALESCE(((r.elem ->> 'created_at'::text))::timestamp with time zone, s.created_at) AS created_at,
    COALESCE(((r.elem ->> 'updated_at'::text))::timestamp with time zone, s.updated_at) AS updated_at,
    COALESCE(((r.elem ->> 'diem_toi_da'::text))::integer, 1) AS diem_toi_da,
    (r.elem ->> 'phan_muc'::text) AS phan_muc,
    COALESCE(NULLIF((r.elem ->> 'kieu_du_lieu'::text), ''::text), 'BOOLEAN'::text) AS kieu_du_lieu,
    COALESCE(((r.elem ->> 'la_then_chot'::text))::boolean, false) AS la_then_chot,
    COALESCE(((r.elem ->> 'cho_phep_kpa'::text))::boolean, true) AS cho_phep_kpa,
        CASE
            WHEN (jsonb_typeof((r.elem -> 'cac_lua_chon'::text)) = 'array'::text) THEN ARRAY( SELECT jsonb_array_elements_text((r.elem -> 'cac_lua_chon'::text)) AS jsonb_array_elements_text)
            ELSE NULL::text[]
        END AS cac_lua_chon,
    (r.elem ->> 'ma_csv_goc'::text) AS ma_csv_goc
   FROM public.gstt_dm_bang_kiem s,
    LATERAL jsonb_array_elements(s.tieu_chi_jsonb) r(elem);


--
-- Name: VIEW gstt_dm_tieu_chi_bang_kiem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.gstt_dm_tieu_chi_bang_kiem IS 'Unpack tieu_chi_jsonb thành rows phẳng để app SELECT. Slice 3 (reform v4): thêm 6 key phan_muc/kieu_du_lieu/la_then_chot/cho_phep_kpa/cac_lua_chon/ma_csv_goc với default backward-compat.';


--
-- Name: gstt_fact_chung_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gstt_fact_chung_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    khoa_id uuid,
    khu_vuc_id uuid,
    vi_tri text,
    nguoi_giam_sat_id uuid,
    is_giam_sat_ca_nhan boolean DEFAULT false NOT NULL,
    nhan_vien_id uuid,
    nghe_nghiep_id uuid,
    ngay_giam_sat date,
    thoi_gian_ghi_nhan timestamp with time zone,
    tong_diem numeric,
    ghi_chu_chung text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_seen boolean DEFAULT false NOT NULL,
    thoi_gian_bat_dau timestamp with time zone,
    thoi_gian_ket_thuc timestamp with time zone,
    hinh_thuc_id uuid,
    cach_thuc_id uuid,
    bang_kiem_id uuid,
    results_jsonb jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    dat_tron_goi boolean,
    du_lieu_nghi_van boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE gstt_fact_chung_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gstt_fact_chung_sessions IS 'Phiên giám sát chung — stub greenfield.';


--
-- Name: COLUMN gstt_fact_chung_sessions.is_seen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_chung_sessions.is_seen IS 'Người dùng đã mở xem/in phiên từ lịch sử.';


--
-- Name: COLUMN gstt_fact_chung_sessions.thoi_gian_bat_dau; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_chung_sessions.thoi_gian_bat_dau IS 'Giờ bắt đầu khung giám sát trong ngày (ưu tiên khi giám sát qua camera).';


--
-- Name: COLUMN gstt_fact_chung_sessions.thoi_gian_ket_thuc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_chung_sessions.thoi_gian_ket_thuc IS 'Giờ kết thúc khung giám sát trong ngày.';


--
-- Name: COLUMN gstt_fact_chung_sessions.hinh_thuc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_chung_sessions.hinh_thuc_id IS 'FK dm_hinh_thuc_giam_sat — link chuẩn; hinh_thuc_giam_sat là nhãn đồng bộ.';


--
-- Name: COLUMN gstt_fact_chung_sessions.cach_thuc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_chung_sessions.cach_thuc_id IS 'FK dm_cach_thuc_giam_sat — link chuẩn; cach_thuc_giam_sat là nhãn đồng bộ.';


--
-- Name: COLUMN gstt_fact_chung_sessions.bang_kiem_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_chung_sessions.bang_kiem_id IS 'FK dm_bang_kiem — SSOT; loai_bang_kiem giữ mã/legacy cho RPC dashboard.';


--
-- Name: COLUMN gstt_fact_chung_sessions.results_jsonb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_chung_sessions.results_jsonb IS 'Danh sách mảng kết quả chi tiết các tiêu chí dưới dạng JSONB (thay thế EAV)';


--
-- Name: COLUMN gstt_fact_chung_sessions.dat_tron_goi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_chung_sessions.dat_tron_goi IS 'Slice 4 (reform v4): kết quả All-or-None cho care bundle (cach_tinh_diem=TRON_GOI). NULL khi bảng kiểm không phải bundle. TRUE chỉ khi mọi tiêu chí then chốt (`la_then_chot=true` hoặc tất cả) DAT.';


--
-- Name: COLUMN gstt_fact_chung_sessions.du_lieu_nghi_van; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_chung_sessions.du_lieu_nghi_van IS 'Slice 4 (reform v4): Anti-Hawthorne flag — TRUE nếu phiên có dấu hiệu nghi ngờ (tốc độ quan sát >30/phút, hoặc thoi_gian_bat_dau = thoi_gian_ket_thuc). Dashboard Slice 7 cảnh báo nhưng KHÔNG loại trừ khỏi KPI (chính sách Just Culture defer v2).';


--
-- Name: gstt_fact_gsc_dashboard_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gstt_fact_gsc_dashboard_summary (
    session_id uuid NOT NULL,
    ngay_giam_sat date NOT NULL,
    bang_kiem_id uuid NOT NULL,
    khoa_id uuid,
    khu_vuc_id uuid,
    nghe_nghiep_id uuid,
    stype text NOT NULL,
    nguoi_giam_sat_id uuid,
    tong_phien bigint DEFAULT 1 NOT NULL,
    tong_quan_sat bigint DEFAULT 0 NOT NULL,
    tong_dat bigint DEFAULT 0 NOT NULL,
    tong_vi_pham bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gstt_fact_gsc_violations_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gstt_fact_gsc_violations_summary (
    session_id uuid NOT NULL,
    criterion_id uuid NOT NULL,
    ngay_giam_sat date NOT NULL,
    bang_kiem_id uuid NOT NULL,
    khoa_id uuid,
    khu_vuc_id uuid,
    nghe_nghiep_id uuid,
    stype text NOT NULL,
    nguoi_giam_sat_id uuid,
    tong_quan_sat bigint DEFAULT 0 NOT NULL,
    tong_vi_pham bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gstt_fact_vst; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gstt_fact_vst (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    nhan_vien_id uuid,
    khoa_id uuid,
    vi_tri text,
    ngay_giam_sat date,
    thoi_diem text,
    hanh_dong text,
    dung_ky_thuat boolean,
    du_thoi_gian boolean,
    co_deo_gang boolean,
    thoi_gian_ghi_nhan timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ghi_chu text,
    khu_vuc_id uuid,
    nghe_nghiep_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: COLUMN gstt_fact_vst.ghi_chu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_vst.ghi_chu IS 'Ghi chú phiếu quan sát (legacy / nhập tay).';


--
-- Name: COLUMN gstt_fact_vst.khu_vuc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_vst.khu_vuc_id IS 'FK dm_khu_vuc_giam_sat — SSOT; cột khu_vuc (text) giữ nhãn legacy / denorm.';


--
-- Name: COLUMN gstt_fact_vst.nghe_nghiep_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_vst.nghe_nghiep_id IS 'FK dm_nghe_nghiep — SSOT; cột nghe_nghiep (text) giữ nhãn legacy / denorm.';


--
-- Name: gstt_fact_vst_moments_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gstt_fact_vst_moments_summary (
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
    so_quan_sat bigint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gstt_fact_vst_opportunities_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gstt_fact_vst_opportunities_summary (
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
    so_co_hoi bigint DEFAULT 1 NOT NULL,
    da_tuan_thu bigint DEFAULT 0 NOT NULL,
    bo_sot bigint DEFAULT 0 NOT NULL,
    loi_ky_thuat bigint DEFAULT 0 NOT NULL,
    loi_thoi_gian bigint DEFAULT 0 NOT NULL,
    lam_dung_gang bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gstt_fact_vst_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gstt_fact_vst_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    khoa_id uuid,
    khu_vuc_id uuid,
    vi_tri_cu_the text,
    nguoi_giam_sat_id uuid,
    thoi_gian_bat_dau timestamp with time zone,
    thoi_gian_ket_thuc timestamp with time zone,
    ngay_giam_sat date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_seen boolean DEFAULT false NOT NULL,
    hinh_thuc_id uuid,
    cach_thuc_id uuid
);


--
-- Name: TABLE gstt_fact_vst_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gstt_fact_vst_sessions IS 'Phiên VST. Legacy hinh_thuc "Giám sát khách quan" đã map → dm Giám sát chuyên trách (20260716010).';


--
-- Name: COLUMN gstt_fact_vst_sessions.is_seen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_vst_sessions.is_seen IS 'Người dùng đã mở xem/in phiên từ lịch sử.';


--
-- Name: COLUMN gstt_fact_vst_sessions.hinh_thuc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_vst_sessions.hinh_thuc_id IS 'FK dm_hinh_thuc_giam_sat — link chuẩn; hinh_thuc_giam_sat là nhãn đồng bộ.';


--
-- Name: COLUMN gstt_fact_vst_sessions.cach_thuc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gstt_fact_vst_sessions.cach_thuc_id IS 'FK dm_cach_thuc_giam_sat — link chuẩn; cach_thuc_giam_sat là nhãn đồng bộ.';


--
-- Name: gstt_fact_vst_sessions_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gstt_fact_vst_sessions_summary (
    session_id uuid NOT NULL,
    ngay_giam_sat date NOT NULL,
    khoa_id uuid,
    khu_vuc_id uuid,
    stype text NOT NULL,
    nguoi_giam_sat_id uuid,
    tong_phien bigint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mdm_dm_chuc_danh; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.mdm_dm_chuc_danh WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_chuc_danh,
    name AS ten_chuc_danh,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'CHUC_DANH'::text);


--
-- Name: mdm_dm_chuc_vu; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.mdm_dm_chuc_vu WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_chuc_vu,
    name AS ten_chuc_vu,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'CHUC_VU'::text);


--
-- Name: mdm_dm_khoa_phong; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mdm_dm_khoa_phong (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_khoa character varying(50) NOT NULL,
    ten_khoa text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    khoi_id uuid,
    specs jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE ONLY public.mdm_dm_khoa_phong FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_dm_khoi_khoa; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.mdm_dm_khoi_khoa WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_khoi,
    name AS ten_khoi,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'KHOI_KHOA'::text);


--
-- Name: mdm_dm_nghe_nghiep; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.mdm_dm_nghe_nghiep WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_nghe_nghiep,
    name AS ten_nghe_nghiep,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'NGHE_NGHIEP'::text);


--
-- Name: mdm_dm_to_cong_tac; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.mdm_dm_to_cong_tac WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_to,
    name AS ten_to,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'TO_CONG_TAC'::text);


--
-- Name: sys_mdm_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_mdm_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    column_name text NOT NULL,
    field_role text NOT NULL,
    source_table text,
    source_column text DEFAULT 'id'::text,
    source_loai_danh_muc text,
    owner_module text,
    suggestion_policy text DEFAULT 'MANUAL_REVIEW'::text NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_field_registry_field_role_check CHECK ((field_role = ANY (ARRAY['FK_TO_DM'::text, 'FK_TO_SPECIALIZED'::text, 'TEXT_ENUM'::text, 'DOMAIN_ATTRIBUTE'::text, 'FACT_REFERENCE'::text]))),
    CONSTRAINT mdm_field_registry_suggestion_policy_check CHECK ((suggestion_policy = ANY (ARRAY['MANUAL_REVIEW'::text, 'AUTO_SUGGEST'::text, 'AUTO_ENFORCE'::text])))
);

ALTER TABLE ONLY public.sys_mdm_registry FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_field_registry; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.mdm_field_registry WITH (security_invoker='true') AS
 SELECT id,
    table_name,
    column_name,
    field_role,
    source_table,
    source_column,
    source_loai_danh_muc,
    owner_module,
    suggestion_policy,
    is_required,
    is_active,
    notes,
    created_at,
    updated_at
   FROM public.sys_mdm_registry;


--
-- Name: sys_mdm_suggestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_mdm_suggestion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    column_name text NOT NULL,
    suggestion_type text NOT NULL,
    confidence smallint DEFAULT 50 NOT NULL,
    reason text NOT NULL,
    proposed_field_role text,
    proposed_source_table text,
    proposed_source_loai_danh_muc text,
    status text DEFAULT 'OPEN'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mdm_governance_suggestion_confidence_check CHECK (((confidence >= 0) AND (confidence <= 100))),
    CONSTRAINT mdm_governance_suggestion_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'APPROVED'::text, 'REJECTED'::text, 'DONE'::text]))),
    CONSTRAINT mdm_governance_suggestion_suggestion_type_check CHECK ((suggestion_type = ANY (ARRAY['REGISTER_FK'::text, 'CONSIDER_ENUM_TO_DM'::text, 'REVIEW_SOURCE_OF_TRUTH'::text])))
);

ALTER TABLE ONLY public.sys_mdm_suggestion FORCE ROW LEVEL SECURITY;


--
-- Name: mdm_governance_suggestion; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.mdm_governance_suggestion WITH (security_invoker='true') AS
 SELECT id,
    table_name,
    column_name,
    suggestion_type,
    confidence,
    reason,
    proposed_field_role,
    proposed_source_table,
    proposed_source_loai_danh_muc,
    status,
    created_at,
    updated_at
   FROM public.sys_mdm_suggestion;


--
-- Name: mdm_nhan_su; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mdm_nhan_su (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ho_ten text,
    ma_nv text,
    khoa_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    to_id uuid,
    extra_data jsonb DEFAULT '{}'::jsonb,
    chuc_vu_id uuid,
    chuc_danh_id uuid,
    vai_tro_he_thong_id uuid,
    auth_user_id uuid,
    nghe_nghiep_id uuid
);

ALTER TABLE ONLY public.mdm_nhan_su FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN mdm_nhan_su.auth_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mdm_nhan_su.auth_user_id IS 'Tài khoản đăng nhập gắn với hồ sơ (nếu có). Nhân sự chỉ danh bạ để chọn trong form: để null.';


--
-- Name: nkbv_dm_cdc_baseline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nkbv_dm_cdc_baseline (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    khoa_id uuid,
    loai_thiet_bi text NOT NULL,
    expected_infection_rate_per_1000 numeric(10,4) NOT NULL,
    expected_dur numeric(10,4) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dm_nkbv_cdc_baselines_loai_thiet_bi_check CHECK ((loai_thiet_bi = ANY (ARRAY['CVC'::text, 'FOLEY'::text, 'VENT'::text])))
);


--
-- Name: nkbv_dm_loai; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.nkbv_dm_loai WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_loai,
    name AS ten_loai,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'LOAI_NKBV'::text);


--
-- Name: nkbv_dm_trang_thai_ca; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.nkbv_dm_trang_thai_ca WITH (security_invoker='true') AS
 SELECT id,
    code AS ma_trang_thai,
    name AS ten_trang_thai,
    COALESCE(((metadata ->> 'thu_tu'::text))::integer, 0) AS thu_tu,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'TRANG_THAI_NKBV_CA'::text);


--
-- Name: nkbv_fact_benh_an; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nkbv_fact_benh_an (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_benh_an text NOT NULL,
    ma_benh_nhan text NOT NULL,
    ho_ten_benh_nhan text NOT NULL,
    ngay_sinh date,
    gioi_tinh text,
    ngay_vao_vien timestamp with time zone,
    ngay_ra_vien timestamp with time zone,
    ket_cuc_dieu_tri text,
    ly_do_tu_vong text,
    tu_vong_lien_quan_nkbv boolean,
    khoa_dieu_tri_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: nkbv_fact_mau_so_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nkbv_fact_mau_so_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    khoa_id uuid NOT NULL,
    ngay_ghi_nhan date NOT NULL,
    so_ngay_tho_may integer DEFAULT 0 NOT NULL,
    so_ngay_catheter_cvc integer DEFAULT 0 NOT NULL,
    so_ngay_sonde_tieu integer DEFAULT 0 NOT NULL,
    so_ngay_dieu_tri integer DEFAULT 0 NOT NULL,
    so_dot_tho_may_emv integer DEFAULT 0 NOT NULL,
    nguoi_bao_cao_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: nkbv_fact_mau_so_phau_thuat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nkbv_fact_mau_so_phau_thuat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    khoa_id uuid NOT NULL,
    ngay_phau_thuat date NOT NULL,
    ma_benh_nhan text NOT NULL,
    ho_ten_benh_nhan text NOT NULL,
    ten_phau_thuat text NOT NULL,
    loai_phau_thuat_nhsn text NOT NULL,
    phan_loai_vet_mo text NOT NULL,
    co_dat_implant boolean DEFAULT false NOT NULL,
    asa_score integer,
    thoi_gian_mo_phut integer NOT NULL,
    thoi_gian_nguong_nhsn integer DEFAULT 120 NOT NULL,
    is_laparoscopic boolean DEFAULT false NOT NULL,
    expected_ssi_prob numeric(6,5) DEFAULT 0.01500 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fact_nkbv_mau_so_phau_thuat_asa_score_check CHECK (((asa_score >= 1) AND (asa_score <= 5))),
    CONSTRAINT fact_nkbv_mau_so_phau_thuat_phan_loai_vet_mo_check CHECK ((phan_loai_vet_mo = ANY (ARRAY['SACH'::text, 'SACH_NHIEM'::text, 'NHIEM'::text, 'BAN'::text])))
);


--
-- Name: nkbv_fact_su_kien; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nkbv_fact_su_kien (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_ca text NOT NULL,
    khoa_ghi_nhan_id uuid,
    ma_benh_nhan text NOT NULL,
    ho_ten_benh_nhan text NOT NULL,
    ngay_sinh date,
    gioi_tinh text,
    ngay_vao_vien timestamp with time zone,
    ngay_phat_hien date NOT NULL,
    vi_tri_nhiem_khuan text,
    tac_nhan_vi_khuan text,
    clinical_notes jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    vi_sinh_record_id uuid,
    verification_data jsonb DEFAULT '{}'::jsonb,
    loai_nkbv_id uuid NOT NULL,
    trang_thai_id uuid NOT NULL,
    nguoi_ghi_id uuid,
    ma_benh_an text,
    ma_benh_pham text,
    loai_benh_pham text,
    so_luong text,
    quy_trinh_id uuid,
    lo_tiet_khuan_id uuid,
    ma_cycle_qr_lien_quan text
);


--
-- Name: COLUMN nkbv_fact_su_kien.quy_trinh_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nkbv_fact_su_kien.quy_trinh_id IS 'FK tới cssd_fact_quy_trinh — truy vết bộ dụng cụ từ ca SSI.';


--
-- Name: COLUMN nkbv_fact_su_kien.lo_tiet_khuan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nkbv_fact_su_kien.lo_tiet_khuan_id IS 'FK mẻ tiệt khuẩn liên quan (nếu có).';


--
-- Name: COLUMN nkbv_fact_su_kien.ma_cycle_qr_lien_quan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.nkbv_fact_su_kien.ma_cycle_qr_lien_quan IS 'Mã QR chu trình CSSD người dùng nhập (denormalized để tìm nhanh).';


--
-- Name: nkbv_fact_vi_sinh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nkbv_fact_vi_sinh (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_benh_nhan text NOT NULL,
    ma_benh_an text NOT NULL,
    ma_benh_pham text,
    ho_ten_benh_nhan text NOT NULL,
    ngay_sinh date,
    gioi_tinh text,
    ngay_vao_vien timestamp with time zone,
    ngay_lay_mau timestamp with time zone NOT NULL,
    khoa_yeu_cau_id uuid,
    loai_benh_pham text NOT NULL,
    tac_nhan text NOT NULL,
    ket_qua_duong_tinh boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    so_luong text
);


--
-- Name: qlcv_dm_loai_cong_viec; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.qlcv_dm_loai_cong_viec WITH (security_invoker='true') AS
 SELECT id,
    code AS ma,
    name AS ten,
    COALESCE(((metadata ->> 'thu_tu'::text))::integer, 0) AS thu_tu,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'LOAI_CONG_VIEC'::text);


--
-- Name: qlcv_dm_trang_thai_cong_viec; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.qlcv_dm_trang_thai_cong_viec WITH (security_invoker='true') AS
 SELECT id,
    code AS ma,
    name AS ten,
    (metadata ->> 'mau_sac'::text) AS mau_sac,
    COALESCE(((metadata ->> 'thu_tu'::text))::integer, 0) AS thu_tu,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE (category_type = 'TRANG_THAI_CONG_VIEC'::text);


--
-- Name: qlcv_fact_cong_viec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qlcv_fact_cong_viec (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tieu_de text NOT NULL,
    mo_ta text,
    muc_do_uu_tien text DEFAULT 'TRUNG_BINH'::text,
    han_hoan_thanh date,
    nguoi_tao_id uuid,
    nguoi_phu_trach_id uuid,
    khoa_thuc_hien_id uuid,
    to_cong_tac_id uuid,
    cong_viec_cha_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    phan_tram_hoan_thanh integer DEFAULT 0,
    nguoi_giao_viec_id uuid,
    dinh_ky_mau_id uuid,
    loai_cong_viec_id uuid,
    trang_thai_id uuid,
    hoan_thanh_luc timestamp with time zone,
    gia_han_so_lan integer DEFAULT 0 NOT NULL,
    checklist jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: COLUMN qlcv_fact_cong_viec.hoan_thanh_luc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.qlcv_fact_cong_viec.hoan_thanh_luc IS 'Timestamp chính xác khi công việc được nghiệm thu (trang_thai → HOAN_THANH). Reset về NULL nếu bị trả làm lại. Dùng cho KPI đúng hạn thay vì updated_at.';


--
-- Name: COLUMN qlcv_fact_cong_viec.gia_han_so_lan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.qlcv_fact_cong_viec.gia_han_so_lan IS 'Số lần hạn hoàn thành đã bị gia hạn (han_hoan_thanh bị dời sang ngày sau). Audit trail không xóa được qua history.';


--
-- Name: COLUMN qlcv_fact_cong_viec.checklist; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.qlcv_fact_cong_viec.checklist IS 'Mảng [{id,label,done}]. % hoàn thành sync khi gọi fn_qlcv_update_checklist.';


--
-- Name: qlcv_fact_cong_viec_dinh_ky; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qlcv_fact_cong_viec_dinh_ky (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tieu_de text NOT NULL,
    mo_ta text,
    ma_chu_ky text NOT NULL,
    ngay_bat_dau date DEFAULT CURRENT_DATE NOT NULL,
    nguoi_phu_trach_id uuid,
    to_cong_tac_id uuid,
    nguoi_tao_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    muc_do_uu_tien text DEFAULT 'TRUNG_BINH'::text,
    khoa_thuc_hien_id uuid,
    CONSTRAINT fact_cong_viec_dinh_ky_ma_chu_ky_check CHECK ((ma_chu_ky = ANY (ARRAY['DAILY'::text, 'WEEKLY'::text, 'MONTHLY'::text, 'QUARTERLY'::text]))),
    CONSTRAINT qlcv_fact_cong_viec_dinh_ky_muc_do_uu_tien_check CHECK ((muc_do_uu_tien = ANY (ARRAY['THAP'::text, 'TRUNG_BINH'::text, 'CAO'::text, 'KHAN_CAP'::text])))
);


--
-- Name: qlcv_fact_cong_viec_hoat_dong; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qlcv_fact_cong_viec_hoat_dong (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cong_viec uuid NOT NULL,
    loai_hoat_dong text NOT NULL,
    nguoi_thuc_hien_id uuid,
    trang_thai text,
    noi_dung text,
    phan_tram_hoan_thanh integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT fact_cong_viec_hoat_dong_loai_hoat_dong_check CHECK ((loai_hoat_dong = ANY (ARRAY['PHAN_CONG'::text, 'DE_XUAT'::text, 'BAO_CAO_TIEN_DO'::text, 'PHE_DUYET'::text, 'CAP_NHAT'::text, 'HOAN_THANH'::text, 'XAC_NHAN_NHAN'::text, 'DUYET_HOAN_THANH'::text, 'TU_CHOI_HOAN_THANH'::text, 'GIA_HAN'::text]))),
    CONSTRAINT fact_cong_viec_hoat_dong_phan_tram_hoan_thanh_check CHECK (((phan_tram_hoan_thanh >= 0) AND (phan_tram_hoan_thanh <= 100)))
);


--
-- Name: TABLE qlcv_fact_cong_viec_hoat_dong; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.qlcv_fact_cong_viec_hoat_dong IS 'Audit trail QLCV. RLS: service_role full access; authenticated read-only (no direct write).';


--
-- Name: sys_role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.sys_role_permissions FORCE ROW LEVEL SECURITY;


--
-- Name: rel_role_permissions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rel_role_permissions WITH (security_invoker='true') AS
 SELECT id,
    role_id,
    permission_id,
    created_at
   FROM public.sys_role_permissions;


--
-- Name: VIEW rel_role_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.rel_role_permissions IS 'Compat view 1-tầng → sys_role_permissions. Flatten 26/05/2026.';


--
-- Name: sys_user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.sys_user_roles FORCE ROW LEVEL SECURITY;


--
-- Name: rel_user_roles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rel_user_roles WITH (security_invoker='true') AS
 SELECT id,
    user_id,
    role_id,
    created_at
   FROM public.sys_user_roles;


--
-- Name: VIEW rel_user_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.rel_user_roles IS 'Compat view 1-tầng → sys_user_roles. Flatten 26/05/2026.';


--
-- Name: sys_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id text NOT NULL,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by uuid DEFAULT auth.uid(),
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_bv103_audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: sys_module_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_module_locks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_name text NOT NULL,
    locked_until_date date NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sys_module_locks_module_name_check CHECK ((module_name = ANY (ARRAY['VST'::text, 'GSC'::text])))
);


--
-- Name: sys_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_name text NOT NULL,
    action text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.sys_permissions FORCE ROW LEVEL SECURITY;


--
-- Name: sys_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

ALTER TABLE ONLY public.sys_roles FORCE ROW LEVEL SECURITY;


--
-- Name: v_cssd_bo_dung_cu_bien_dong; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cssd_bo_dung_cu_bien_dong AS
 SELECT bo_dung_cu_id,
    loai_dung_cu_id,
    (COALESCE(sum(so_luong_thay_doi), (0)::bigint))::integer AS so_luong_bien_dong
   FROM public.cssd_fact_kho_giao_dich
  WHERE ((is_active = true) AND (bo_dung_cu_id IS NOT NULL))
  GROUP BY bo_dung_cu_id, loai_dung_cu_id;


--
-- Name: v_cssd_bo_dung_cu_chi_tiet_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cssd_bo_dung_cu_chi_tiet_full WITH (security_invoker='true') AS
 SELECT c.id,
    c.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    c.loai_dung_cu_id,
    l.ma_loai AS ma_loai_dung_cu,
    l.ten_loai AS ten_loai_dung_cu,
    (c.specs ->> 'ma_chi_tiet'::text) AS ma_chi_tiet,
    c.ten_chi_tiet,
    c.ten_dung_cu_le,
    c.so_luong,
    (c.specs ->> 'ma_qr_mau'::text) AS ma_qr_mau,
    ((c.specs ->> 'co_ma_khac'::text))::boolean AS co_ma_khac,
    (c.specs ->> 'ma_khac'::text) AS ma_khac,
    c.is_active,
    c.ghi_chu,
    c.created_at,
    c.updated_at,
    c.specs
   FROM ((public.cssd_dm_bo_dung_cu_chi_tiet c
     LEFT JOIN public.cssd_dm_bo_dung_cu b ON ((b.id = c.bo_dung_cu_id)))
     LEFT JOIN public.cssd_dm_loai_dung_cu l ON ((l.id = c.loai_dung_cu_id)));


--
-- Name: v_cssd_bo_dung_cu_chi_tiet_realtime; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cssd_bo_dung_cu_chi_tiet_realtime AS
 SELECT c.id AS chi_tiet_id,
    c.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    c.loai_dung_cu_id,
    l.ma_loai AS ma_loai_dung_cu,
    l.ten_loai AS ten_loai_dung_cu,
    l.is_chiu_nhiet,
    l.phan_loai_spaulding,
    l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan,
    c.so_luong AS so_luong_tieu_chuan,
    (c.so_luong + COALESCE(v.so_luong_bien_dong, 0)) AS so_luong_thuc_te,
        CASE
            WHEN ((c.so_luong + COALESCE(v.so_luong_bien_dong, 0)) < c.so_luong) THEN true
            ELSE false
        END AS is_missing,
        CASE
            WHEN ((c.so_luong + COALESCE(v.so_luong_bien_dong, 0)) < c.so_luong) THEN (c.so_luong - (c.so_luong + COALESCE(v.so_luong_bien_dong, 0)))
            ELSE 0
        END AS missing_count,
    c.is_active,
    c.ghi_chu
   FROM (((public.cssd_dm_bo_dung_cu_chi_tiet c
     JOIN public.cssd_dm_bo_dung_cu b ON ((b.id = c.bo_dung_cu_id)))
     JOIN public.cssd_dm_loai_dung_cu l ON ((l.id = c.loai_dung_cu_id)))
     LEFT JOIN public.v_cssd_bo_dung_cu_bien_dong v ON (((v.bo_dung_cu_id = c.bo_dung_cu_id) AND (v.loai_dung_cu_id = c.loai_dung_cu_id))));


--
-- Name: v_cssd_bo_dung_cu_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cssd_bo_dung_cu_summary AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(50) AS ma_bo,
    NULL::text AS ten_bo,
    NULL::uuid AS loai_dung_cu_id,
    NULL::uuid AS khoa_su_dung_id,
    NULL::character varying(50) AS trang_thai,
    NULL::text AS quy_cach,
    NULL::text AS ghi_chu,
    NULL::timestamp with time zone AS ngay_kiem_ke_gan_nhat,
    NULL::boolean AS is_active,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::integer AS so_luong_bo,
    NULL::integer AS so_khoan,
    NULL::integer AS tong_so_luong_dung_cu,
    NULL::integer AS tong_phan_bo;


--
-- Name: v_cssd_hoa_chat_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cssd_hoa_chat_full WITH (security_invoker='true') AS
 SELECT id,
    ma_hoa_chat,
    ten_hoa_chat,
    loai_hoa_chat,
    don_vi_tinh,
    (specs ->> 'quy_cach'::text) AS quy_cach,
    (specs ->> 'nong_do'::text) AS nong_do,
    han_su_dung,
    (specs ->> 'ghi_chu'::text) AS ghi_chu,
    nguong_ton_toi_thieu,
    is_active,
    created_at,
    updated_at,
    specs
   FROM public.cssd_dm_hoa_chat;


--
-- Name: v_cssd_kho_hoa_chat_ton_lo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cssd_kho_hoa_chat_ton_lo WITH (security_invoker='true') AS
 SELECT dm_hoa_chat_id,
    ma_lo,
    han_su_dung,
    sum(so_luong_co_dau) AS ton_so_luong
   FROM public.cssd_fact_kho_hoa_chat_giao_dich g
  WHERE (COALESCE(is_active, true) = true)
  GROUP BY dm_hoa_chat_id, ma_lo, han_su_dung;


--
-- Name: VIEW v_cssd_kho_hoa_chat_ton_lo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_cssd_kho_hoa_chat_ton_lo IS 'Tồn theo lô = SUM(so_luong_co_dau) nhóm theo dm_hoa_chat_id + ma_lo + han_su_dung.';


--
-- Name: v_cssd_loai_dung_cu_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cssd_loai_dung_cu_summary AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(50) AS ma_loai,
    NULL::text AS ten_loai,
    NULL::text AS mo_ta,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::boolean AS is_active,
    NULL::text AS ma_loai_dung_cu,
    NULL::text AS ten_loai_dung_cu,
    NULL::text AS hinh_dang,
    NULL::text AS kich_thuoc,
    NULL::text AS cong_dung,
    NULL::boolean AS is_chiu_nhiet,
    NULL::text AS phuong_phap_tiet_khuan,
    NULL::text AS phan_loai_spaulding,
    NULL::integer AS so_ngay_han_dung,
    NULL::text AS phan_loai,
    NULL::integer AS so_luong_kho_du_phong,
    NULL::integer AS so_luong_tong,
    NULL::jsonb AS bo_dung_cu_chua;


--
-- Name: v_cssd_quy_trinh_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cssd_quy_trinh_full WITH (security_invoker='true') AS
 SELECT q.id,
    q.ma_qr_quy_trinh,
    q.bo_dung_cu_id,
    q.tram_hien_tai_id,
    t.ma_tram AS ma_trang_thai_hien_tai,
    t.ten_tram AS ten_tram_hien_tai,
    q.nguoi_dang_giu_id,
    q.nguoi_tiep_nhan_id,
    q.nguoi_lam_sach_id,
    q.nguoi_kiem_tra_id,
    q.nguoi_dong_goi_id,
    q.nguoi_tiet_khuan_id,
    q.nguoi_cap_phat_id,
    q.thoi_gian_tiep_nhan,
    q.thoi_gian_lam_sach,
    q.thoi_gian_qc,
    q.thoi_gian_dong_goi,
    q.thoi_gian_tiet_khuan,
    q.thoi_gian_cap_phat,
    q.lo_tiet_khuan_id,
    q.suds_count,
    q.ngay_tiet_khuan,
    q.han_su_dung,
    q.tinh_trang,
    q.is_dong_bang,
    q.quy_trinh_cha_id,
    q.ma_vai_tro_bo,
    (q.metadata ->> 'ma_ca_mo_id'::text) AS ma_ca_mo_id,
    q.ngay_het_han,
    q.is_active,
    b.ten_bo,
    b.ma_bo,
    k.ten_khoa,
    l.ten_loai AS ten_loai_dung_cu,
    q.created_at,
    q.updated_at
   FROM ((((public.cssd_fact_quy_trinh q
     LEFT JOIN public.cssd_dm_tram t ON ((t.id = q.tram_hien_tai_id)))
     LEFT JOIN public.cssd_dm_bo_dung_cu b ON ((q.bo_dung_cu_id = b.id)))
     LEFT JOIN public.mdm_dm_khoa_phong k ON ((b.khoa_su_dung_id = k.id)))
     LEFT JOIN public.cssd_dm_loai_dung_cu l ON ((b.loai_dung_cu_id = l.id)));


--
-- Name: v_cssd_su_co_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cssd_su_co_full WITH (security_invoker='true') AS
 SELECT sc.id,
    sc.quy_trinh_id,
    sc.ma_qr_quy_trinh,
    sc.ma_tram_phat_hien,
    sc.loai_su_co_id,
    ls.name AS ten_loai_su_co,
    (sc.attributes ->> 'incident_group'::text) AS incident_group,
    (sc.attributes ->> 'incident_type_label'::text) AS incident_type_label,
    COALESCE(NULLIF(concat((sc.attributes ->> 'incident_group'::text), ':', (sc.attributes ->> 'incident_type_label'::text)), ':'::text), ls.code) AS ma_loai_su_co,
    sc.mo_ta,
    sc.is_red_alert,
    sc.ma_tram_gay_loi,
    sc.created_at,
    sc.attributes
   FROM (public.cssd_fact_su_co sc
     LEFT JOIN public.sys_lookup_value ls ON (((ls.id = sc.loai_su_co_id) AND (ls.category_type = 'LOAI_SU_CO'::text))));


--
-- Name: v_cssd_thiet_bi_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cssd_thiet_bi_full WITH (security_invoker='true') AS
 SELECT tb.id,
    tb.ma_thiet_bi,
    tb.ten_thiet_bi,
    tb.loai_may_id,
    lm.ma_loai_may,
    lm.ten_loai_may AS ten_loai_may_hien_thi,
    lm.ma_loai_may AS loai_thiet_bi,
    tb.trang_thai,
    (tb.specs ->> 'hang_san_xuat'::text) AS hang_san_xuat,
    ((tb.specs ->> 'nam_san_xuat'::text))::integer AS nam_san_xuat,
    tb.ngay_dua_vao_su_dung,
    tb.chu_ky_bao_tri_ngay,
    tb.ngay_bao_tri_gan_nhat,
    tb.ngay_bao_tri_tiep_theo,
    (tb.specs ->> 'ghi_chu'::text) AS ghi_chu,
    tb.specs,
    tb.is_active,
    tb.created_at,
    tb.updated_at
   FROM (public.cssd_dm_thiet_bi tb
     LEFT JOIN public.cssd_dm_loai_may lm ON ((lm.id = tb.loai_may_id)));


--
-- Name: v_gstt_dashboard_bundle_rate_v3; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gstt_dashboard_bundle_rate_v3 WITH (security_invoker='true') AS
 SELECT bk.id AS bang_kiem_id,
    bk.ma_bk,
    bk.ten_bang_kiem,
    s.khoa_id,
    s.ngay_giam_sat AS ngay,
    count(s.id) AS tong_phien,
    count(s.id) FILTER (WHERE (s.dat_tron_goi IS TRUE)) AS so_dat,
    count(s.id) FILTER (WHERE (s.dat_tron_goi IS FALSE)) AS so_khong_dat,
        CASE
            WHEN (count(s.id) FILTER (WHERE (s.dat_tron_goi IS NOT NULL)) > 0) THEN round((((count(s.id) FILTER (WHERE (s.dat_tron_goi IS TRUE)))::numeric * (100)::numeric) / (NULLIF(count(s.id) FILTER (WHERE (s.dat_tron_goi IS NOT NULL)), 0))::numeric), 1)
            ELSE NULL::numeric
        END AS ty_le_dat
   FROM (public.gstt_fact_chung_sessions s
     JOIN public.gstt_dm_bang_kiem bk ON (((bk.id = s.bang_kiem_id) AND (bk.cach_tinh_diem = 'TRON_GOI'::text))))
  WHERE (COALESCE(s.is_active, true) = true)
  GROUP BY bk.id, bk.ma_bk, bk.ten_bang_kiem, s.khoa_id, s.ngay_giam_sat;


--
-- Name: VIEW v_gstt_dashboard_bundle_rate_v3; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_gstt_dashboard_bundle_rate_v3 IS 'Slice 7 (reform v4): Bundle Compliance Rate per khoa+ngay+template (chỉ cach_tinh_diem=TRON_GOI). Gauge dashboard tính ty_le trung bình trên N phiên.';


--
-- Name: v_gstt_dashboard_nhsn_denominator_v3; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gstt_dashboard_nhsn_denominator_v3 WITH (security_invoker='true') AS
 SELECT khoa_id,
    ngay_ghi_nhan AS ngay,
    so_ngay_tho_may,
    so_ngay_catheter_cvc,
    so_ngay_sonde_tieu,
    so_ngay_dieu_tri
   FROM public.nkbv_fact_mau_so_daily d;


--
-- Name: VIEW v_gstt_dashboard_nhsn_denominator_v3; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_gstt_dashboard_nhsn_denominator_v3 IS 'Slice 7 (reform v4): denominator NHSN per 1000 device-days. Numerator (ca NKBV thật) đến từ giam-sat-nkbv module — phase sau JOIN qua RPC.';


--
-- Name: v_gstt_giam_sat_chung_sessions_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gstt_giam_sat_chung_sessions_full WITH (security_invoker='true') AS
 SELECT s.id,
    s.bang_kiem_id,
    bk.ma_bk AS loai_bang_kiem,
    bk.loai_giam_sat,
    bk.cach_tinh_diem,
    s.khoa_id,
    s.khu_vuc_id,
    s.vi_tri,
    s.hinh_thuc_id,
    s.cach_thuc_id,
    s.nguoi_giam_sat_id,
    s.is_giam_sat_ca_nhan,
    s.nhan_vien_id,
    s.nghe_nghiep_id,
    s.ngay_giam_sat,
    s.thoi_gian_ghi_nhan,
    s.thoi_gian_bat_dau,
    s.thoi_gian_ket_thuc,
    s.tong_diem,
    s.ghi_chu_chung,
    COALESCE(((s.metadata ->> 'is_manual_nhan_vien'::text))::boolean, false) AS is_manual_nhan_vien,
    (s.metadata ->> 'ten_manual_nhan_vien'::text) AS ten_manual_nhan_vien,
    COALESCE(((s.metadata ->> 'is_bo_sung_nguoi_benh'::text))::boolean, false) AS is_bo_sung_nguoi_benh,
    (s.metadata ->> 'ma_nguoi_benh'::text) AS ma_nguoi_benh,
    (s.metadata ->> 'ten_nguoi_benh'::text) AS ten_nguoi_benh,
    (s.metadata ->> 'so_giuong_nguoi_benh'::text) AS so_giuong_nguoi_benh,
    s.is_active,
    s.is_seen,
    s.created_at,
    s.updated_at,
    s.results_jsonb,
    s.dat_tron_goi,
    s.du_lieu_nghi_van,
    k.ma_khoa AS ma_khoa_phong,
    k.ten_khoa AS ten_khoa_phong,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
    ns_gs.ho_ten AS ten_nguoi_giam_sat,
    ns_gs.ma_nv AS ma_nguoi_giam_sat,
    ns_nv.ho_ten AS ten_nhan_vien,
    ns_nv.ma_nv AS ma_nhan_vien,
    nn.ma_nghe_nghiep,
    nn.ten_nghe_nghiep,
    ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
    ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc,
    ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
    ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
    ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
    ct.ten_cach_thuc AS cach_thuc_giam_sat,
    bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
   FROM ((((((((public.gstt_fact_chung_sessions s
     LEFT JOIN public.gstt_dm_bang_kiem bk ON ((bk.id = s.bang_kiem_id)))
     LEFT JOIN public.mdm_dm_khoa_phong k ON ((k.id = s.khoa_id)))
     LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON ((kv.id = s.khu_vuc_id)))
     LEFT JOIN public.mdm_nhan_su ns_gs ON ((ns_gs.id = s.nguoi_giam_sat_id)))
     LEFT JOIN public.mdm_nhan_su ns_nv ON ((ns_nv.id = s.nhan_vien_id)))
     LEFT JOIN public.mdm_dm_nghe_nghiep nn ON ((nn.id = s.nghe_nghiep_id)))
     LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ((ht.id = s.hinh_thuc_id)))
     LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ((ct.id = s.cach_thuc_id)))
  WHERE (COALESCE(s.is_active, true) = true);


--
-- Name: v_gstt_giam_sat_vst_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gstt_giam_sat_vst_full WITH (security_invoker='true') AS
 SELECT o.id,
    o.session_id,
    o.nhan_vien_id,
    (o.metadata ->> 'ten_nhan_vien_ngoai'::text) AS ten_nhan_vien_ngoai,
    COALESCE(ns.ho_ten, (o.metadata ->> 'ten_nhan_vien_ngoai'::text)) AS ten_nhan_vien,
    o.khoa_id,
    o.khu_vuc_id,
    o.nghe_nghiep_id,
    o.vi_tri,
    o.ngay_giam_sat,
    o.thoi_diem,
    o.hanh_dong,
    o.dung_ky_thuat,
    o.du_thoi_gian,
    o.co_deo_gang,
    o.thoi_gian_ghi_nhan,
    o.ghi_chu,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    COALESCE(kv.ten_khu_vuc, ''::text) AS khu_vuc,
    COALESCE(kv.ten_khu_vuc, ''::text) AS ten_khu_vuc_hien_thi,
    nn.ma_nghe_nghiep,
    COALESCE(nn.ten_nghe_nghiep, ''::text) AS nghe_nghiep,
    COALESCE(nn.ten_nghe_nghiep, ''::text) AS ten_nghe_nghiep_hien_thi,
    k.ten_khoa AS ten_khoa_phong,
    (o.metadata ->> 'legacy_csv_row_id'::text) AS legacy_csv_row_id,
    o.created_at
   FROM ((((public.gstt_fact_vst o
     LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON ((kv.id = o.khu_vuc_id)))
     LEFT JOIN public.mdm_dm_nghe_nghiep nn ON ((nn.id = o.nghe_nghiep_id)))
     LEFT JOIN public.mdm_dm_khoa_phong k ON ((k.id = o.khoa_id)))
     LEFT JOIN public.mdm_nhan_su ns ON ((ns.id = o.nhan_vien_id)));


--
-- Name: v_gstt_giam_sat_vst_sessions_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gstt_giam_sat_vst_sessions_full WITH (security_invoker='true') AS
 SELECT s.id,
    s.khoa_id,
    s.khu_vuc_id,
    s.vi_tri_cu_the,
    s.hinh_thuc_id,
    s.cach_thuc_id,
    ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
    ct.ten_cach_thuc AS cach_thuc_giam_sat,
    ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
    ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
    ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc,
    ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
    s.nguoi_giam_sat_id,
    s.thoi_gian_bat_dau,
    s.thoi_gian_ket_thuc,
    s.ngay_giam_sat,
    s.created_at,
    s.updated_at,
    s.is_active,
    s.is_seen,
    k.ma_khoa AS ma_khoa_phong,
    k.ten_khoa AS ten_khoa_phong,
    kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
    ns_gs.ho_ten AS ten_nguoi_giam_sat,
    COALESCE(agg.tong_co_hoi, ((0)::bigint)::numeric) AS tong_co_hoi,
    COALESCE(agg.da_tuan_thu, ((0)::bigint)::numeric) AS da_tuan_thu
   FROM ((((((public.gstt_fact_vst_sessions s
     LEFT JOIN public.mdm_dm_khoa_phong k ON ((k.id = s.khoa_id)))
     LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON ((kv.id = s.khu_vuc_id)))
     LEFT JOIN public.mdm_nhan_su ns_gs ON ((ns_gs.id = s.nguoi_giam_sat_id)))
     LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ((ht.id = s.hinh_thuc_id)))
     LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ((ct.id = s.cach_thuc_id)))
     LEFT JOIN ( SELECT gstt_fact_vst_opportunities_summary.session_id,
            sum(gstt_fact_vst_opportunities_summary.so_co_hoi) AS tong_co_hoi,
            sum(gstt_fact_vst_opportunities_summary.da_tuan_thu) AS da_tuan_thu
           FROM public.gstt_fact_vst_opportunities_summary
          GROUP BY gstt_fact_vst_opportunities_summary.session_id) agg ON ((agg.session_id = s.id)))
  WHERE (COALESCE(s.is_active, true) = true);


--
-- Name: v_gstt_gsc_dashboard_rows; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gstt_gsc_dashboard_rows WITH (security_invoker='true') AS
 SELECT s.id AS session_id,
    s.ngay_giam_sat,
    s.created_at,
    COALESCE(bk.ma_bk, ''::text) AS loai_bang_kiem,
    s.tong_diem,
    s.khoa_id,
    kp.ten_khoa,
    ((r.elem ->> 'criterion_id'::text))::uuid AS id,
    ((r.elem ->> 'criterion_id'::text))::uuid AS result_id,
    ((r.elem ->> 'criterion_id'::text))::uuid AS criterion_id,
    (r.elem ->> 'value'::text) AS value,
    (r.elem ->> 'value'::text) AS result_value,
    (r.elem ->> 'note'::text) AS note
   FROM (((public.gstt_fact_chung_sessions s
     LEFT JOIN public.gstt_dm_bang_kiem bk ON ((bk.id = s.bang_kiem_id)))
     LEFT JOIN public.mdm_dm_khoa_phong kp ON ((kp.id = s.khoa_id)))
     LEFT JOIN LATERAL jsonb_array_elements(s.results_jsonb) r(elem) ON (true))
  WHERE (s.is_active = true);


--
-- Name: v_gstt_vst_hotpath; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gstt_vst_hotpath WITH (security_invoker='true') AS
 SELECT id,
    session_id,
    nhan_vien_id,
    (metadata ->> 'ten_nhan_vien_ngoai'::text) AS ten_nhan_vien_ngoai,
    khoa_id,
    vi_tri,
    ngay_giam_sat,
    thoi_diem,
    hanh_dong,
    dung_ky_thuat,
    du_thoi_gian,
    co_deo_gang,
    thoi_gian_ghi_nhan,
    created_at,
    ghi_chu,
    khu_vuc_id,
    nghe_nghiep_id
   FROM public.gstt_fact_vst;


--
-- Name: v_mdm_nhan_su_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_mdm_nhan_su_full AS
 SELECT ns.id,
    ns.ma_nv,
    ns.ho_ten,
    ns.khoa_id,
    ns.to_id,
    ns.nghe_nghiep_id,
    ns.chuc_vu_id,
    ns.chuc_danh_id,
    ns.vai_tro_he_thong_id,
    ns.auth_user_id,
    ((ns.extra_data ->> 'ngay_sinh'::text))::date AS ngay_sinh,
    (ns.extra_data ->> 'gioi_tinh'::text) AS gioi_tinh,
    (ns.extra_data ->> 'so_dien_thoai'::text) AS so_dien_thoai,
    (ns.extra_data ->> 'email'::text) AS email,
    ns.extra_data,
    ns.is_active,
    k.ten_khoa,
    t.name AS ten_to,
    nn.name AS ten_nghe_nghiep,
    cv.name AS chuc_vu,
    cd.name AS chuc_danh,
    r.name AS vai_tro_he_thong_ksnk,
    cv.name AS ten_chuc_vu,
    cd.name AS ten_chuc_danh,
    r.name AS ten_vai_tro,
    ns.created_at,
    ns.updated_at
   FROM ((((((public.mdm_nhan_su ns
     LEFT JOIN public.mdm_dm_khoa_phong k ON ((ns.khoa_id = k.id)))
     LEFT JOIN public.sys_lookup_value nn ON (((ns.nghe_nghiep_id = nn.id) AND (nn.category_type = 'NGHE_NGHIEP'::text))))
     LEFT JOIN public.sys_lookup_value cd ON (((ns.chuc_danh_id = cd.id) AND (cd.category_type = 'CHUC_DANH'::text))))
     LEFT JOIN public.sys_lookup_value cv ON (((ns.chuc_vu_id = cv.id) AND (cv.category_type = 'CHUC_VU'::text))))
     LEFT JOIN public.sys_lookup_value t ON (((ns.to_id = t.id) AND (t.category_type = 'TO_CONG_TAC'::text))))
     LEFT JOIN public.sys_roles r ON ((ns.vai_tro_he_thong_id = r.id)));


--
-- Name: v_nkbv_su_kien_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_nkbv_su_kien_full WITH (security_invoker='true') AS
 SELECT c.id,
    c.ma_ca,
    c.khoa_ghi_nhan_id,
    c.ma_benh_nhan,
    c.ho_ten_benh_nhan,
    c.ngay_sinh,
    c.gioi_tinh,
    c.ngay_vao_vien,
    c.ngay_phat_hien,
    c.vi_tri_nhiem_khuan,
    c.tac_nhan_vi_khuan,
    (c.clinical_notes ->> 'tom_tat_dien_bien'::text) AS tom_tat_dien_bien,
    (c.clinical_notes ->> 'bien_phap_phong_ngua'::text) AS bien_phap_phong_ngua,
    c.loai_nkbv_id,
    c.trang_thai_id,
    (c.clinical_notes ->> 'ly_do_loai_tru'::text) AS ly_do_loai_tru,
    c.nguoi_ghi_id,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.clinical_notes,
    c.vi_sinh_record_id,
    c.verification_data,
    c.ma_benh_an,
    c.ma_benh_pham,
    c.loai_benh_pham,
    c.so_luong,
    c.quy_trinh_id,
    c.lo_tiet_khuan_id,
    c.ma_cycle_qr_lien_quan,
    s.ngay_ra_vien,
    s.ket_cuc_dieu_tri,
    s.ly_do_tu_vong,
    s.tu_vong_lien_quan_nkbv,
    k.ma_khoa AS khoa_ma,
    k.ten_khoa AS khoa_ten,
    l.code AS loai_ma,
    l.name AS loai_ten,
    t.code AS trang_thai_ma,
    t.name AS trang_thai_ten
   FROM ((((public.nkbv_fact_su_kien c
     LEFT JOIN public.nkbv_fact_benh_an s ON ((s.ma_benh_an = c.ma_benh_an)))
     LEFT JOIN public.mdm_dm_khoa_phong k ON ((k.id = c.khoa_ghi_nhan_id)))
     LEFT JOIN public.sys_lookup_value l ON (((l.id = c.loai_nkbv_id) AND (l.category_type = 'LOAI_NKBV'::text))))
     LEFT JOIN public.sys_lookup_value t ON (((t.id = c.trang_thai_id) AND (t.category_type = 'TRANG_THAI_NKBV_CA'::text))));


--
-- Name: v_qlcv_cong_viec_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker='true') AS
 SELECT cv.id,
    cv.cong_viec_cha_id,
    cv.tieu_de,
    cv.mo_ta,
    cv.loai_cong_viec_id,
    lc.ma AS loai_cong_viec,
    lc.ten AS ten_loai_cong_viec,
    cv.trang_thai_id,
    ts.ma AS trang_thai,
    ts.ten AS ten_trang_thai_hien_thi,
    cv.muc_do_uu_tien,
    cv.han_hoan_thanh,
    cv.phan_tram_hoan_thanh,
    cv.nguoi_tao_id,
    cv.nguoi_giao_viec_id,
    cv.nguoi_phu_trach_id,
    cv.khoa_thuc_hien_id,
    cv.to_cong_tac_id,
    cv.dinh_ky_mau_id,
    cv.is_active,
    cv.created_at,
    cv.updated_at,
    ns_tao.ho_ten AS nguoi_tao_ten,
    ns_phu.ho_ten AS nguoi_phu_trach_ten,
    ns_giao.ho_ten AS nguoi_giao_ten,
    k.ten_khoa AS khoa_thuc_hien_ten,
    t.ten_to AS to_cong_tac_ten,
    ((cv.han_hoan_thanh IS NOT NULL) AND (cv.han_hoan_thanh < CURRENT_DATE) AND (COALESCE(ts.ma, ''::text) <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text]))) AS is_qua_han,
    ( SELECT (count(*))::integer AS count
           FROM public.qlcv_fact_cong_viec sub
          WHERE ((sub.cong_viec_cha_id = cv.id) AND (sub.is_active = true))) AS cong_viec_con_count,
    cv.checklist
   FROM (((((((public.qlcv_fact_cong_viec cv
     LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON ((lc.id = cv.loai_cong_viec_id)))
     LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ((ts.id = cv.trang_thai_id)))
     LEFT JOIN public.mdm_nhan_su ns_tao ON ((cv.nguoi_tao_id = ns_tao.id)))
     LEFT JOIN public.mdm_nhan_su ns_phu ON ((cv.nguoi_phu_trach_id = ns_phu.id)))
     LEFT JOIN public.mdm_nhan_su ns_giao ON ((cv.nguoi_giao_viec_id = ns_giao.id)))
     LEFT JOIN public.mdm_dm_khoa_phong k ON ((cv.khoa_thuc_hien_id = k.id)))
     LEFT JOIN public.mdm_dm_to_cong_tac t ON ((cv.to_cong_tac_id = t.id)));


--
-- Name: v_sys_audit_log_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sys_audit_log_full WITH (security_invoker='true') AS
 SELECT al.id,
    al.table_name,
    al.record_id,
    al.action,
    al.old_data,
    al.new_data,
    al.changed_by,
    al.changed_at,
    ns.ho_ten AS user_fullname,
    (ns.extra_data ->> 'email'::text) AS user_email,
    ns.ma_nv AS user_ma_nv
   FROM (public.sys_audit_log al
     LEFT JOIN public.mdm_nhan_su ns ON ((ns.auth_user_id = al.changed_by)));


--
-- Name: VIEW v_sys_audit_log_full; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_sys_audit_log_full IS 'View phẳng cho UI audit trail: join sẵn người thao tác (ho_ten, email, ma_nv).';


--
-- Name: v_sys_audit_table_choices; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sys_audit_table_choices WITH (security_invoker='true') AS
 SELECT table_name,
    count(*) AS log_count,
    max(changed_at) AS last_changed_at
   FROM public.sys_audit_log
  GROUP BY table_name;


--
-- Name: VIEW v_sys_audit_table_choices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_sys_audit_table_choices IS 'Distinct table_name + count cho dropdown filter UI; tránh quét toàn bảng client-side.';


--
-- Name: v_sys_role_permissions_matrix; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sys_role_permissions_matrix WITH (security_invoker='true') AS
 SELECT r.id AS role_id,
    r.name AS role_name,
    array_agg(rp.permission_id) FILTER (WHERE (rp.permission_id IS NOT NULL)) AS permission_ids
   FROM (public.sys_roles r
     LEFT JOIN public.sys_role_permissions rp ON ((r.id = rp.role_id)))
  GROUP BY r.id, r.name;


--
-- Name: v_sys_staff_auth_overview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sys_staff_auth_overview AS
SELECT
    NULL::uuid AS id,
    NULL::text AS ma_nv,
    NULL::text AS ho_ten,
    NULL::text AS email,
    NULL::boolean AS is_active,
    NULL::uuid AS auth_user_id,
    NULL::text[] AS role_names;


--
-- Name: v_sys_user_permissions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sys_user_permissions WITH (security_invoker='true') AS
 WITH user_perms AS (
         SELECT ur.user_id,
            jsonb_agg(DISTINCT r.name) AS roles,
            jsonb_agg(DISTINCT jsonb_build_object('module', p.module_name, 'action', p.action)) AS permissions
           FROM (((public.sys_user_roles ur
             JOIN public.sys_roles r ON ((ur.role_id = r.id)))
             LEFT JOIN public.sys_role_permissions rp ON ((r.id = rp.role_id)))
             LEFT JOIN public.sys_permissions p ON ((rp.permission_id = p.id)))
          GROUP BY ur.user_id
        )
 SELECT ns.id AS staff_id,
    ns.auth_user_id,
    ns.ho_ten,
    ns.ma_nv,
    (ns.extra_data ->> 'email'::text) AS email,
    ns.khoa_id,
    ns.is_active,
    k.ten_khoa AS ten_khoa_phong,
    k.ma_khoa AS ma_khoa_phong,
    COALESCE(up.roles, '[]'::jsonb) AS roles,
    COALESCE(up.permissions, '[]'::jsonb) AS permissions
   FROM ((public.mdm_nhan_su ns
     LEFT JOIN public.mdm_dm_khoa_phong k ON ((ns.khoa_id = k.id)))
     LEFT JOIN user_perms up ON ((ns.auth_user_id = up.user_id)));


--
-- Name: VIEW v_sys_user_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_sys_user_permissions IS 'Aggregate RBAC: nhân sự + khoa + roles + permissions. Re-pointed sys_* 26/05/2026.';


--
-- Name: cssd_dm_bo_phan_bo cssd_dm_bo_phan_bo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_phan_bo
    ADD CONSTRAINT cssd_dm_bo_phan_bo_pkey PRIMARY KEY (id);


--
-- Name: gstt_dm_bang_kiem danh_muc_bang_kiem_ma_bk_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_dm_bang_kiem
    ADD CONSTRAINT danh_muc_bang_kiem_ma_bk_key UNIQUE (ma_bk);


--
-- Name: gstt_dm_bang_kiem danh_muc_bang_kiem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_dm_bang_kiem
    ADD CONSTRAINT danh_muc_bang_kiem_pkey PRIMARY KEY (id);


--
-- Name: cssd_dm_bo_dung_cu_chi_tiet dm_bo_dung_cu_chi_tiet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_dung_cu_chi_tiet
    ADD CONSTRAINT dm_bo_dung_cu_chi_tiet_pkey PRIMARY KEY (id);


--
-- Name: cssd_dm_bo_dung_cu dm_bo_dung_cu_ma_bo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_dung_cu
    ADD CONSTRAINT dm_bo_dung_cu_ma_bo_key UNIQUE (ma_bo);


--
-- Name: cssd_dm_bo_dung_cu dm_bo_dung_cu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_dung_cu
    ADD CONSTRAINT dm_bo_dung_cu_pkey PRIMARY KEY (id);


--
-- Name: cssd_dm_hoa_chat dm_hoa_chat_ma_hoa_chat_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_hoa_chat
    ADD CONSTRAINT dm_hoa_chat_ma_hoa_chat_key UNIQUE (ma_hoa_chat);


--
-- Name: cssd_dm_hoa_chat dm_hoa_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_hoa_chat
    ADD CONSTRAINT dm_hoa_chat_pkey PRIMARY KEY (id);


--
-- Name: mdm_dm_khoa_phong dm_khoa_phong_ma_khoa_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_dm_khoa_phong
    ADD CONSTRAINT dm_khoa_phong_ma_khoa_key UNIQUE (ma_khoa);


--
-- Name: mdm_dm_khoa_phong dm_khoa_phong_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_dm_khoa_phong
    ADD CONSTRAINT dm_khoa_phong_pkey PRIMARY KEY (id);


--
-- Name: cssd_dm_loai_dung_cu dm_loai_dung_cu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_loai_dung_cu
    ADD CONSTRAINT dm_loai_dung_cu_pkey PRIMARY KEY (id);


--
-- Name: sys_lookup_value dm_lookup_value_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_lookup_value
    ADD CONSTRAINT dm_lookup_value_pkey PRIMARY KEY (id);


--
-- Name: nkbv_dm_cdc_baseline dm_nkbv_cdc_baselines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_dm_cdc_baseline
    ADD CONSTRAINT dm_nkbv_cdc_baselines_pkey PRIMARY KEY (id);


--
-- Name: nkbv_dm_cdc_baseline dm_nkbv_cdc_baselines_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_dm_cdc_baseline
    ADD CONSTRAINT dm_nkbv_cdc_baselines_unique UNIQUE (khoa_id, loai_thiet_bi);


--
-- Name: cssd_dm_thiet_bi dm_thiet_bi_ma_thiet_bi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_thiet_bi
    ADD CONSTRAINT dm_thiet_bi_ma_thiet_bi_key UNIQUE (ma_thiet_bi);


--
-- Name: cssd_dm_thiet_bi dm_thiet_bi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_thiet_bi
    ADD CONSTRAINT dm_thiet_bi_pkey PRIMARY KEY (id);


--
-- Name: cssd_fact_bao_tri fact_bao_tri_thiet_bi_ma_phieu_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_bao_tri
    ADD CONSTRAINT fact_bao_tri_thiet_bi_ma_phieu_key UNIQUE (ma_phieu);


--
-- Name: cssd_fact_bao_tri fact_bao_tri_thiet_bi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_bao_tri
    ADD CONSTRAINT fact_bao_tri_thiet_bi_pkey PRIMARY KEY (id);


--
-- Name: qlcv_fact_cong_viec_dinh_ky fact_cong_viec_dinh_ky_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec_dinh_ky
    ADD CONSTRAINT fact_cong_viec_dinh_ky_pkey PRIMARY KEY (id);


--
-- Name: qlcv_fact_cong_viec_hoat_dong fact_cong_viec_hoat_dong_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec_hoat_dong
    ADD CONSTRAINT fact_cong_viec_hoat_dong_pkey PRIMARY KEY (id);


--
-- Name: qlcv_fact_cong_viec fact_cong_viec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_pkey PRIMARY KEY (id);


--
-- Name: cssd_fact_dieu_chuyen_thanh_phan fact_cssd_dieu_chuyen_thanh_phan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_dieu_chuyen_thanh_phan
    ADD CONSTRAINT fact_cssd_dieu_chuyen_thanh_phan_pkey PRIMARY KEY (id);


--
-- Name: cssd_fact_lifecycle_event fact_cssd_lifecycle_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_lifecycle_event
    ADD CONSTRAINT fact_cssd_lifecycle_event_pkey PRIMARY KEY (id);


--
-- Name: gstt_fact_gsc_dashboard_summary fact_gsc_dashboard_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_gsc_dashboard_summary
    ADD CONSTRAINT fact_gsc_dashboard_summary_pkey PRIMARY KEY (session_id);


--
-- Name: gstt_fact_gsc_violations_summary fact_gsc_violations_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_gsc_violations_summary
    ADD CONSTRAINT fact_gsc_violations_summary_pkey PRIMARY KEY (session_id, criterion_id);


--
-- Name: cssd_fact_kho_giao_dich fact_kho_dung_cu_giao_dich_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_giao_dich
    ADD CONSTRAINT fact_kho_dung_cu_giao_dich_pkey PRIMARY KEY (id);


--
-- Name: cssd_fact_kho_hoa_chat_giao_dich fact_kho_hc_ma_phieu_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_hoa_chat_giao_dich
    ADD CONSTRAINT fact_kho_hc_ma_phieu_key UNIQUE (ma_phieu);


--
-- Name: cssd_fact_kho_hoa_chat_giao_dich fact_kho_hoa_chat_giao_dich_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_hoa_chat_giao_dich
    ADD CONSTRAINT fact_kho_hoa_chat_giao_dich_pkey PRIMARY KEY (id);


--
-- Name: nkbv_fact_benh_an fact_nkbv_benh_an_ma_benh_an_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_benh_an
    ADD CONSTRAINT fact_nkbv_benh_an_ma_benh_an_key UNIQUE (ma_benh_an);


--
-- Name: nkbv_fact_benh_an fact_nkbv_benh_an_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_benh_an
    ADD CONSTRAINT fact_nkbv_benh_an_pkey PRIMARY KEY (id);


--
-- Name: nkbv_fact_mau_so_daily fact_nkbv_mau_so_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_mau_so_daily
    ADD CONSTRAINT fact_nkbv_mau_so_daily_pkey PRIMARY KEY (id);


--
-- Name: nkbv_fact_mau_so_daily fact_nkbv_mau_so_daily_unique_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_mau_so_daily
    ADD CONSTRAINT fact_nkbv_mau_so_daily_unique_key UNIQUE (khoa_id, ngay_ghi_nhan);


--
-- Name: nkbv_fact_mau_so_phau_thuat fact_nkbv_mau_so_phau_thuat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_mau_so_phau_thuat
    ADD CONSTRAINT fact_nkbv_mau_so_phau_thuat_pkey PRIMARY KEY (id);


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_ma_ca_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_su_kien
    ADD CONSTRAINT fact_nkbv_su_kien_ma_ca_key UNIQUE (ma_ca);


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_su_kien
    ADD CONSTRAINT fact_nkbv_su_kien_pkey PRIMARY KEY (id);


--
-- Name: nkbv_fact_vi_sinh fact_nkbv_vi_sinh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_vi_sinh
    ADD CONSTRAINT fact_nkbv_vi_sinh_pkey PRIMARY KEY (id);


--
-- Name: cssd_fact_quy_trinh_thanh_phan fact_quy_trinh_thanh_phan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh_thanh_phan
    ADD CONSTRAINT fact_quy_trinh_thanh_phan_pkey PRIMARY KEY (id);


--
-- Name: gstt_fact_vst_moments_summary fact_vst_moments_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst_moments_summary
    ADD CONSTRAINT fact_vst_moments_summary_pkey PRIMARY KEY (opportunity_id, moment_label);


--
-- Name: gstt_fact_vst_opportunities_summary fact_vst_opportunities_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst_opportunities_summary
    ADD CONSTRAINT fact_vst_opportunities_summary_pkey PRIMARY KEY (opportunity_id);


--
-- Name: gstt_fact_vst_sessions_summary fact_vst_sessions_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst_sessions_summary
    ADD CONSTRAINT fact_vst_sessions_summary_pkey PRIMARY KEY (session_id);


--
-- Name: gstt_fact_chung_sessions giam_sat_chung_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_pkey PRIMARY KEY (id);


--
-- Name: gstt_fact_vst giam_sat_vst_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst
    ADD CONSTRAINT giam_sat_vst_pkey PRIMARY KEY (id);


--
-- Name: gstt_fact_vst_sessions giam_sat_vst_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst_sessions
    ADD CONSTRAINT giam_sat_vst_sessions_pkey PRIMARY KEY (id);


--
-- Name: mdm_nhan_su ho_so_nhan_vien_ma_nv_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT ho_so_nhan_vien_ma_nv_key UNIQUE (ma_nv);


--
-- Name: mdm_nhan_su ho_so_nhan_vien_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT ho_so_nhan_vien_pkey PRIMARY KEY (id);


--
-- Name: cssd_fact_kho_chi_tiet kho_chi_tiet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_chi_tiet
    ADD CONSTRAINT kho_chi_tiet_pkey PRIMARY KEY (id);


--
-- Name: cssd_fact_lo_tiet_khuan lo_tiet_khuan_ma_lo_tiet_khuan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_lo_tiet_khuan
    ADD CONSTRAINT lo_tiet_khuan_ma_lo_tiet_khuan_key UNIQUE (ma_lo_tiet_khuan);


--
-- Name: cssd_fact_lo_tiet_khuan lo_tiet_khuan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_lo_tiet_khuan
    ADD CONSTRAINT lo_tiet_khuan_pkey PRIMARY KEY (id);


--
-- Name: sys_mdm_registry mdm_field_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_mdm_registry
    ADD CONSTRAINT mdm_field_registry_pkey PRIMARY KEY (id);


--
-- Name: sys_mdm_suggestion mdm_governance_suggestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_mdm_suggestion
    ADD CONSTRAINT mdm_governance_suggestion_pkey PRIMARY KEY (id);


--
-- Name: sys_mdm_suggestion mdm_governance_suggestion_table_name_column_name_suggestion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_mdm_suggestion
    ADD CONSTRAINT mdm_governance_suggestion_table_name_column_name_suggestion_key UNIQUE (table_name, column_name, suggestion_type, status);


--
-- Name: cssd_fact_quy_trinh quy_trinh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT quy_trinh_pkey PRIMARY KEY (id);


--
-- Name: cssd_fact_su_co su_co_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_su_co
    ADD CONSTRAINT su_co_pkey PRIMARY KEY (id);


--
-- Name: sys_audit_log sys_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_audit_log
    ADD CONSTRAINT sys_audit_log_pkey PRIMARY KEY (id);


--
-- Name: sys_module_locks sys_module_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_module_locks
    ADD CONSTRAINT sys_module_locks_pkey PRIMARY KEY (id);


--
-- Name: sys_module_locks sys_module_locks_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_module_locks
    ADD CONSTRAINT sys_module_locks_unique UNIQUE (module_name);


--
-- Name: sys_permissions sys_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_permissions
    ADD CONSTRAINT sys_permissions_pkey PRIMARY KEY (id);


--
-- Name: sys_role_permissions sys_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_permissions
    ADD CONSTRAINT sys_role_permissions_pkey PRIMARY KEY (id);


--
-- Name: sys_roles sys_roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_roles
    ADD CONSTRAINT sys_roles_name_key UNIQUE (name);


--
-- Name: sys_roles sys_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_roles
    ADD CONSTRAINT sys_roles_pkey PRIMARY KEY (id);


--
-- Name: sys_user_roles sys_user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_roles
    ADD CONSTRAINT sys_user_roles_pkey PRIMARY KEY (id);


--
-- Name: cssd_dm_bo_phan_bo unique_bo_khoa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_phan_bo
    ADD CONSTRAINT unique_bo_khoa UNIQUE (bo_dung_cu_id, khoa_phong_id);


--
-- Name: sys_lookup_value uq_category_type_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_lookup_value
    ADD CONSTRAINT uq_category_type_code UNIQUE (category_type, code);


--
-- Name: sys_mdm_registry uq_mdm_field_registry; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_mdm_registry
    ADD CONSTRAINT uq_mdm_field_registry UNIQUE (table_name, column_name);


--
-- Name: sys_permissions uq_sys_permissions_module_action; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_permissions
    ADD CONSTRAINT uq_sys_permissions_module_action UNIQUE (module_name, action);


--
-- Name: sys_role_permissions uq_sys_role_permissions; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_permissions
    ADD CONSTRAINT uq_sys_role_permissions UNIQUE (role_id, permission_id);


--
-- Name: sys_user_roles uq_sys_user_roles; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_roles
    ADD CONSTRAINT uq_sys_user_roles UNIQUE (user_id, role_id);


--
-- Name: brin_gsc_sessions_ngay_giam_sat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brin_gsc_sessions_ngay_giam_sat ON public.gstt_fact_chung_sessions USING brin (ngay_giam_sat);


--
-- Name: brin_vst_sessions_ngay_giam_sat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brin_vst_sessions_ngay_giam_sat ON public.gstt_fact_vst_sessions USING brin (ngay_giam_sat);


--
-- Name: idx_cssd_dieu_chuyen_den; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cssd_dieu_chuyen_den ON public.cssd_fact_dieu_chuyen_thanh_phan USING btree (den_quy_trinh_id);


--
-- Name: idx_cssd_dieu_chuyen_tu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cssd_dieu_chuyen_tu ON public.cssd_fact_dieu_chuyen_thanh_phan USING btree (tu_quy_trinh_id);


--
-- Name: idx_cssd_dm_bo_dung_cu_chi_tiet_bo_dung_cu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cssd_dm_bo_dung_cu_chi_tiet_bo_dung_cu_id ON public.cssd_dm_bo_dung_cu_chi_tiet USING btree (bo_dung_cu_id);


--
-- Name: INDEX idx_cssd_dm_bo_dung_cu_chi_tiet_bo_dung_cu_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_cssd_dm_bo_dung_cu_chi_tiet_bo_dung_cu_id IS 'B.3 26/05/2026 — phục vụ JOIN v_cssd_bo_dung_cu_summary + mọi query lấy chi tiết theo bo_dung_cu.';


--
-- Name: idx_cssd_dm_loai_dung_cu_chiu_nhiet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cssd_dm_loai_dung_cu_chiu_nhiet ON public.cssd_dm_loai_dung_cu USING btree (is_chiu_nhiet);


--
-- Name: idx_danh_muc_bk_ma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_danh_muc_bk_ma ON public.gstt_dm_bang_kiem USING btree (ma_bk);


--
-- Name: idx_dm_bo_dung_cu_chi_tiet_loai_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_bo_dung_cu_chi_tiet_loai_id ON public.cssd_dm_bo_dung_cu_chi_tiet USING btree (loai_dung_cu_id);


--
-- Name: idx_dm_bo_dung_cu_khoa_su_dung_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_bo_dung_cu_khoa_su_dung_id ON public.cssd_dm_bo_dung_cu USING btree (khoa_su_dung_id);


--
-- Name: idx_dm_bo_dung_cu_loai_dung_cu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_bo_dung_cu_loai_dung_cu_id ON public.cssd_dm_bo_dung_cu USING btree (loai_dung_cu_id);


--
-- Name: idx_dm_bo_dung_cu_ma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_bo_dung_cu_ma ON public.cssd_dm_bo_dung_cu USING btree (ma_bo);


--
-- Name: idx_dm_khoa_phong_khoi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_khoa_phong_khoi_id ON public.mdm_dm_khoa_phong USING btree (khoi_id);


--
-- Name: idx_dm_loai_dung_cu_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_loai_dung_cu_active ON public.cssd_dm_loai_dung_cu USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_dm_lookup_value_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_lookup_value_code ON public.sys_lookup_value USING btree (category_type, code);


--
-- Name: idx_dm_lookup_value_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_lookup_value_type ON public.sys_lookup_value USING btree (category_type) WHERE (is_active = true);


--
-- Name: idx_dm_roles_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_roles_is_active ON public.sys_roles USING btree (is_active);


--
-- Name: idx_fact_bao_tri_one_dang_per_tb; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_fact_bao_tri_one_dang_per_tb ON public.cssd_fact_bao_tri USING btree (thiet_bi_id) WHERE (((trang_thai)::text = 'DANG_THUC_HIEN'::text) AND COALESCE(is_active, true));


--
-- Name: idx_fact_bao_tri_tb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_bao_tri_tb ON public.cssd_fact_bao_tri USING btree (thiet_bi_id);


--
-- Name: idx_fact_bao_tri_trang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_bao_tri_trang ON public.cssd_fact_bao_tri USING btree (trang_thai);


--
-- Name: idx_fact_cong_viec_hoat_dong_cv_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cong_viec_hoat_dong_cv_created ON public.qlcv_fact_cong_viec_hoat_dong USING btree (id_cong_viec, created_at DESC);


--
-- Name: idx_fact_cong_viec_loai_cong_viec_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cong_viec_loai_cong_viec_id ON public.qlcv_fact_cong_viec USING btree (loai_cong_viec_id) WHERE (loai_cong_viec_id IS NOT NULL);


--
-- Name: idx_fact_cong_viec_trang_thai_han_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cong_viec_trang_thai_han_active ON public.qlcv_fact_cong_viec USING btree (trang_thai_id, han_hoan_thanh) WHERE (is_active = true);


--
-- Name: idx_fact_cong_viec_trang_thai_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cong_viec_trang_thai_id ON public.qlcv_fact_cong_viec USING btree (trang_thai_id) WHERE (trang_thai_id IS NOT NULL);


--
-- Name: idx_fact_cssd_lifecycle_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cssd_lifecycle_created ON public.cssd_fact_lifecycle_event USING btree (created_at DESC);


--
-- Name: idx_fact_cssd_lifecycle_quy_trinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cssd_lifecycle_quy_trinh ON public.cssd_fact_lifecycle_event USING btree (quy_trinh_id);


--
-- Name: idx_fact_cv_cha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cv_cha ON public.qlcv_fact_cong_viec USING btree (cong_viec_cha_id);


--
-- Name: idx_fact_cv_dinh_ky_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cv_dinh_ky_active ON public.qlcv_fact_cong_viec_dinh_ky USING btree (is_active);


--
-- Name: idx_fact_cv_hd_cv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cv_hd_cv ON public.qlcv_fact_cong_viec_hoat_dong USING btree (id_cong_viec);


--
-- Name: idx_fact_cv_hoat_dong_cv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cv_hoat_dong_cv ON public.qlcv_fact_cong_viec_hoat_dong USING btree (id_cong_viec);


--
-- Name: idx_fact_gsc_sessions_cach_thuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_gsc_sessions_cach_thuc_id ON public.gstt_fact_chung_sessions USING btree (cach_thuc_id) WHERE (cach_thuc_id IS NOT NULL);


--
-- Name: idx_fact_gsc_sessions_hinh_thuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_gsc_sessions_hinh_thuc_id ON public.gstt_fact_chung_sessions USING btree (hinh_thuc_id) WHERE (hinh_thuc_id IS NOT NULL);


--
-- Name: idx_fact_kho_hc_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_kho_hc_created ON public.cssd_fact_kho_hoa_chat_giao_dich USING btree (created_at DESC);


--
-- Name: idx_fact_kho_hc_dm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_kho_hc_dm ON public.cssd_fact_kho_hoa_chat_giao_dich USING btree (dm_hoa_chat_id);


--
-- Name: idx_fact_kho_hc_loai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_kho_hc_loai ON public.cssd_fact_kho_hoa_chat_giao_dich USING btree (loai_giao_dich);


--
-- Name: idx_fact_quy_trinh_bo_dung_cu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_quy_trinh_bo_dung_cu_id ON public.cssd_fact_quy_trinh USING btree (bo_dung_cu_id) WHERE (bo_dung_cu_id IS NOT NULL);


--
-- Name: idx_fact_quy_trinh_cha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_quy_trinh_cha ON public.cssd_fact_quy_trinh USING btree (quy_trinh_cha_id);


--
-- Name: idx_fact_quy_trinh_thanh_phan_qt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_quy_trinh_thanh_phan_qt ON public.cssd_fact_quy_trinh_thanh_phan USING btree (quy_trinh_id);


--
-- Name: idx_fact_quy_trinh_tram_hien_tai_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_quy_trinh_tram_hien_tai_id ON public.cssd_fact_quy_trinh USING btree (tram_hien_tai_id) WHERE (tram_hien_tai_id IS NOT NULL);


--
-- Name: idx_fact_vst_obs_khoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_obs_khoa_id ON public.gstt_fact_vst USING btree (khoa_id) WHERE (khoa_id IS NOT NULL);


--
-- Name: idx_fact_vst_obs_khu_vuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_obs_khu_vuc_id ON public.gstt_fact_vst USING btree (khu_vuc_id) WHERE (khu_vuc_id IS NOT NULL);


--
-- Name: idx_fact_vst_obs_nghe_nghiep_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_obs_nghe_nghiep_id ON public.gstt_fact_vst USING btree (nghe_nghiep_id) WHERE (nghe_nghiep_id IS NOT NULL);


--
-- Name: idx_fact_vst_obs_nhan_vien_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_obs_nhan_vien_id ON public.gstt_fact_vst USING btree (nhan_vien_id) WHERE (nhan_vien_id IS NOT NULL);


--
-- Name: idx_fact_vst_sessions_cach_thuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_sessions_cach_thuc_id ON public.gstt_fact_vst_sessions USING btree (cach_thuc_id) WHERE (cach_thuc_id IS NOT NULL);


--
-- Name: idx_fact_vst_sessions_hinh_thuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_sessions_hinh_thuc_id ON public.gstt_fact_vst_sessions USING btree (hinh_thuc_id) WHERE (hinh_thuc_id IS NOT NULL);


--
-- Name: idx_giam_sat_chung_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_chung_supervisor ON public.gstt_fact_chung_sessions USING btree (nguoi_giam_sat_id);


--
-- Name: idx_giam_sat_vst_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_vst_session_id ON public.gstt_fact_vst USING btree (session_id);


--
-- Name: idx_giam_sat_vst_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_vst_supervisor ON public.gstt_fact_vst_sessions USING btree (nguoi_giam_sat_id);


--
-- Name: idx_gsc_results_jsonb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_results_jsonb ON public.gstt_fact_chung_sessions USING gin (results_jsonb jsonb_path_ops);


--
-- Name: idx_gsc_sessions_active_ngay_bang_kiem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_active_ngay_bang_kiem ON public.gstt_fact_chung_sessions USING btree (is_active, ngay_giam_sat, bang_kiem_id) WHERE (is_active = true);


--
-- Name: idx_gsc_sessions_bang_kiem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_bang_kiem_id ON public.gstt_fact_chung_sessions USING btree (bang_kiem_id) WHERE (bang_kiem_id IS NOT NULL);


--
-- Name: idx_gsc_sessions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_created_at ON public.gstt_fact_chung_sessions USING btree (created_at DESC);


--
-- Name: idx_gsc_sessions_khoa_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_khoa_created ON public.gstt_fact_chung_sessions USING btree (khoa_id, created_at DESC);


--
-- Name: idx_gsc_sessions_khoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_khoa_id ON public.gstt_fact_chung_sessions USING btree (khoa_id);


--
-- Name: idx_gsc_sessions_khoa_ngay_bk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_khoa_ngay_bk ON public.gstt_fact_chung_sessions USING btree (khoa_id, ngay_giam_sat, bang_kiem_id) WHERE (is_active = true);


--
-- Name: idx_gsc_sessions_khu_vuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_khu_vuc_id ON public.gstt_fact_chung_sessions USING btree (khu_vuc_id);


--
-- Name: idx_gsc_sessions_ngay_bang_kiem_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_ngay_bang_kiem_active ON public.gstt_fact_chung_sessions USING btree (ngay_giam_sat, bang_kiem_id) WHERE (is_active = true);


--
-- Name: idx_gsc_sessions_nghe_nghiep_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_nghe_nghiep_id ON public.gstt_fact_chung_sessions USING btree (nghe_nghiep_id);


--
-- Name: idx_gsc_sessions_nguoi_giam_sat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_nguoi_giam_sat_id ON public.gstt_fact_chung_sessions USING btree (nguoi_giam_sat_id);


--
-- Name: idx_gsc_sessions_nhan_vien_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_nhan_vien_id ON public.gstt_fact_chung_sessions USING btree (nhan_vien_id);


--
-- Name: idx_gsc_sum_filters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sum_filters ON public.gstt_fact_gsc_dashboard_summary USING btree (ngay_giam_sat, khoa_id, nghe_nghiep_id, khu_vuc_id, stype);


--
-- Name: idx_gsc_sum_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sum_supervisor ON public.gstt_fact_gsc_dashboard_summary USING btree (nguoi_giam_sat_id);


--
-- Name: idx_gsc_viol_filters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_viol_filters ON public.gstt_fact_gsc_violations_summary USING btree (ngay_giam_sat, khoa_id, nghe_nghiep_id, criterion_id);


--
-- Name: idx_gstt_bk_cach_tinh_diem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gstt_bk_cach_tinh_diem ON public.gstt_dm_bang_kiem USING btree (cach_tinh_diem) WHERE ((is_active = true) AND (cach_tinh_diem IS NOT NULL));


--
-- Name: idx_gstt_bk_loai_doi_tuong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gstt_bk_loai_doi_tuong ON public.gstt_dm_bang_kiem USING btree (loai_giam_sat, doi_tuong_giam_sat) WHERE (is_active = true);


--
-- Name: idx_gstt_session_dat_tron_goi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gstt_session_dat_tron_goi ON public.gstt_fact_chung_sessions USING btree (bang_kiem_id, dat_tron_goi) WHERE ((is_active = true) AND (dat_tron_goi IS NOT NULL));


--
-- Name: idx_ho_so_nhan_vien_chuc_danh_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ho_so_nhan_vien_chuc_danh_id ON public.mdm_nhan_su USING btree (chuc_danh_id);


--
-- Name: idx_ho_so_nhan_vien_chuc_vu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ho_so_nhan_vien_chuc_vu_id ON public.mdm_nhan_su USING btree (chuc_vu_id);


--
-- Name: idx_ho_so_nhan_vien_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ho_so_nhan_vien_is_active ON public.mdm_nhan_su USING btree (is_active);


--
-- Name: idx_ho_so_nhan_vien_khoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ho_so_nhan_vien_khoa_id ON public.mdm_nhan_su USING btree (khoa_id);


--
-- Name: idx_ho_so_nhan_vien_to_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ho_so_nhan_vien_to_id ON public.mdm_nhan_su USING btree (to_id);


--
-- Name: idx_ho_so_nhan_vien_vai_tro_he_thong_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ho_so_nhan_vien_vai_tro_he_thong_id ON public.mdm_nhan_su USING btree (vai_tro_he_thong_id);


--
-- Name: idx_kho_chi_tiet_quy_trinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kho_chi_tiet_quy_trinh ON public.cssd_fact_kho_chi_tiet USING btree (quy_trinh_id);


--
-- Name: idx_lo_tiet_khuan_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lo_tiet_khuan_created_at ON public.cssd_fact_lo_tiet_khuan USING btree (created_at DESC);


--
-- Name: idx_lo_tiet_khuan_ma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lo_tiet_khuan_ma ON public.cssd_fact_lo_tiet_khuan USING btree (ma_lo_tiet_khuan);


--
-- Name: idx_lo_tiet_khuan_thiet_bi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lo_tiet_khuan_thiet_bi_id ON public.cssd_fact_lo_tiet_khuan USING btree (thiet_bi_id) WHERE (thiet_bi_id IS NOT NULL);


--
-- Name: idx_mdm_field_registry_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mdm_field_registry_active ON public.sys_mdm_registry USING btree (table_name, is_active);


--
-- Name: idx_mdm_governance_suggestion_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mdm_governance_suggestion_status ON public.sys_mdm_suggestion USING btree (status, created_at DESC);


--
-- Name: idx_mdm_nhan_su_auth_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mdm_nhan_su_auth_user_id ON public.mdm_nhan_su USING btree (auth_user_id);


--
-- Name: idx_mdm_nhan_su_list_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mdm_nhan_su_list_order ON public.mdm_nhan_su USING btree (is_active DESC, created_at DESC);


--
-- Name: idx_mdm_nhan_su_nghe_nghiep_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mdm_nhan_su_nghe_nghiep_id ON public.mdm_nhan_su USING btree (nghe_nghiep_id) WHERE (nghe_nghiep_id IS NOT NULL);


--
-- Name: idx_nkbv_mau_so_daily_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nkbv_mau_so_daily_date ON public.nkbv_fact_mau_so_daily USING btree (ngay_ghi_nhan DESC);


--
-- Name: idx_nkbv_mau_so_pt_ngay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nkbv_mau_so_pt_ngay ON public.nkbv_fact_mau_so_phau_thuat USING btree (ngay_phau_thuat DESC);


--
-- Name: idx_nkbv_su_kien_ma_ba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nkbv_su_kien_ma_ba ON public.nkbv_fact_su_kien USING btree (ma_benh_an);


--
-- Name: idx_nkbv_su_kien_ma_bn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nkbv_su_kien_ma_bn ON public.nkbv_fact_su_kien USING btree (ma_benh_nhan);


--
-- Name: idx_nkbv_su_kien_ma_cycle_qr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nkbv_su_kien_ma_cycle_qr ON public.nkbv_fact_su_kien USING btree (upper(ma_cycle_qr_lien_quan)) WHERE (ma_cycle_qr_lien_quan IS NOT NULL);


--
-- Name: idx_nkbv_su_kien_quy_trinh_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nkbv_su_kien_quy_trinh_id ON public.nkbv_fact_su_kien USING btree (quy_trinh_id) WHERE (quy_trinh_id IS NOT NULL);


--
-- Name: idx_nkbv_vi_sinh_ma_ba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nkbv_vi_sinh_ma_ba ON public.nkbv_fact_vi_sinh USING btree (ma_benh_an);


--
-- Name: idx_nkbv_vi_sinh_ma_bn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nkbv_vi_sinh_ma_bn ON public.nkbv_fact_vi_sinh USING btree (ma_benh_nhan);


--
-- Name: idx_nkbv_vi_sinh_ngay_lay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nkbv_vi_sinh_ngay_lay ON public.nkbv_fact_vi_sinh USING btree (ngay_lay_mau DESC);


--
-- Name: idx_nkbv_vi_sinh_unique_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_nkbv_vi_sinh_unique_key ON public.nkbv_fact_vi_sinh USING btree (((metadata ->> 'unique_key'::text))) WHERE (is_active = true);


--
-- Name: idx_quy_trinh_han_su_dung; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quy_trinh_han_su_dung ON public.cssd_fact_quy_trinh USING btree (han_su_dung);


--
-- Name: idx_quy_trinh_lo_tiet_khuan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quy_trinh_lo_tiet_khuan ON public.cssd_fact_quy_trinh USING btree (lo_tiet_khuan_id);


--
-- Name: idx_quy_trinh_ma_vach_qr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quy_trinh_ma_vach_qr ON public.cssd_fact_quy_trinh USING btree (ma_qr_quy_trinh);


--
-- Name: idx_quy_trinh_tinh_trang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quy_trinh_tinh_trang ON public.cssd_fact_quy_trinh USING btree (tinh_trang);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_permission_id ON public.sys_role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON public.sys_role_permissions USING btree (role_id);


--
-- Name: idx_su_co_attr_incident_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_attr_incident_group ON public.cssd_fact_su_co USING btree (((attributes ->> 'INCIDENT_GROUP'::text)));


--
-- Name: idx_su_co_attr_rollback_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_attr_rollback_target ON public.cssd_fact_su_co USING btree (((attributes ->> 'ROLLBACK_TARGET_STATION'::text)));


--
-- Name: idx_su_co_attributes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_attributes ON public.cssd_fact_su_co USING gin (attributes jsonb_path_ops);


--
-- Name: idx_su_co_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_is_active ON public.cssd_fact_su_co USING btree (is_active);


--
-- Name: idx_su_co_ma_vach; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_ma_vach ON public.cssd_fact_su_co USING btree (ma_qr_quy_trinh);


--
-- Name: idx_su_co_quy_trinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_quy_trinh ON public.cssd_fact_su_co USING btree (quy_trinh_id);


--
-- Name: idx_su_co_red_alert; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_red_alert ON public.cssd_fact_su_co USING btree (is_red_alert);


--
-- Name: idx_su_co_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_updated_at ON public.cssd_fact_su_co USING btree (updated_at DESC);


--
-- Name: idx_sys_audit_log_action_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_audit_log_action_changed_at ON public.sys_audit_log USING btree (action, changed_at DESC);


--
-- Name: idx_sys_audit_log_changed_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_audit_log_changed_at_desc ON public.sys_audit_log USING btree (changed_at DESC);


--
-- Name: idx_sys_audit_log_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_audit_log_changed_by ON public.sys_audit_log USING btree (changed_by) WHERE (changed_by IS NOT NULL);


--
-- Name: idx_sys_audit_log_table_name_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_audit_log_table_name_changed_at ON public.sys_audit_log USING btree (table_name, changed_at DESC);


--
-- Name: idx_sys_audit_log_table_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_audit_log_table_record ON public.sys_audit_log USING btree (table_name, record_id, changed_at DESC);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role_id ON public.sys_user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.sys_user_roles USING btree (user_id);


--
-- Name: idx_vst_mom_sum_filters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_mom_sum_filters ON public.gstt_fact_vst_moments_summary USING btree (ngay_giam_sat, khoa_id, nghe_nghiep_id, moment_label);


--
-- Name: idx_vst_obs_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_obs_session_id ON public.gstt_fact_vst USING btree (session_id);


--
-- Name: idx_vst_opp_sum_filters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_opp_sum_filters ON public.gstt_fact_vst_opportunities_summary USING btree (ngay_giam_sat, khoa_id, nghe_nghiep_id, khu_vuc_id, stype);


--
-- Name: idx_vst_opp_sum_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_opp_sum_supervisor ON public.gstt_fact_vst_opportunities_summary USING btree (nguoi_giam_sat_id);


--
-- Name: idx_vst_sess_sum_filters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sess_sum_filters ON public.gstt_fact_vst_sessions_summary USING btree (ngay_giam_sat, khoa_id, khu_vuc_id, stype);


--
-- Name: idx_vst_sess_sum_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sess_sum_supervisor ON public.gstt_fact_vst_sessions_summary USING btree (nguoi_giam_sat_id);


--
-- Name: idx_vst_sessions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_created_at ON public.gstt_fact_vst_sessions USING btree (created_at DESC);


--
-- Name: idx_vst_sessions_khoa_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_khoa_created ON public.gstt_fact_vst_sessions USING btree (khoa_id, created_at DESC);


--
-- Name: idx_vst_sessions_khoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_khoa_id ON public.gstt_fact_vst_sessions USING btree (khoa_id);


--
-- Name: idx_vst_sessions_khoa_ngay_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_khoa_ngay_active ON public.gstt_fact_vst_sessions USING btree (khoa_id, ngay_giam_sat) WHERE (is_active = true);


--
-- Name: idx_vst_sessions_khu_vuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_khu_vuc_id ON public.gstt_fact_vst_sessions USING btree (khu_vuc_id);


--
-- Name: idx_vst_sessions_ngay_khoa_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_ngay_khoa_active ON public.gstt_fact_vst_sessions USING btree (ngay_giam_sat, khoa_id) WHERE (COALESCE(is_active, true) = true);


--
-- Name: idx_vst_sessions_nguoi_giam_sat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_nguoi_giam_sat_id ON public.gstt_fact_vst_sessions USING btree (nguoi_giam_sat_id);


--
-- Name: idx_vst_sessions_perf_filter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_perf_filter ON public.gstt_fact_vst_sessions USING btree (is_active, ngay_giam_sat);


--
-- Name: uq_fact_quy_trinh_thanh_phan_qt_ten; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_fact_quy_trinh_thanh_phan_qt_ten ON public.cssd_fact_quy_trinh_thanh_phan USING btree (quy_trinh_id, ten_dung_cu_le);


--
-- Name: uq_ho_so_nhan_vien_auth_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ho_so_nhan_vien_auth_user_id ON public.mdm_nhan_su USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);


--
-- Name: v_cssd_bo_dung_cu_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_cssd_bo_dung_cu_summary WITH (security_invoker='true') AS
 SELECT b.id,
    b.ma_bo,
    b.ten_bo,
    b.loai_dung_cu_id,
    b.khoa_su_dung_id,
    b.trang_thai,
    b.quy_cach,
    b.ghi_chu,
    b.ngay_kiem_ke_gan_nhat,
    b.is_active,
    b.created_at,
    b.updated_at,
    (COALESCE(q_active.cnt, (0)::bigint))::integer AS so_luong_bo,
    (COALESCE(count(DISTINCT c.id) FILTER (WHERE (c.is_active = true)), (0)::bigint))::integer AS so_khoan,
    (COALESCE(sum(c.so_luong) FILTER (WHERE (c.is_active = true)), (0)::bigint))::integer AS tong_so_luong_dung_cu,
    (COALESCE(sum(p.so_luong_hien_tai) FILTER (WHERE (p.is_active = true)), (0)::bigint))::integer AS tong_phan_bo
   FROM (((public.cssd_dm_bo_dung_cu b
     LEFT JOIN ( SELECT cssd_fact_quy_trinh.bo_dung_cu_id,
            count(cssd_fact_quy_trinh.id) AS cnt
           FROM public.cssd_fact_quy_trinh
          WHERE ((cssd_fact_quy_trinh.is_active = true) AND ((cssd_fact_quy_trinh.tinh_trang)::text IS DISTINCT FROM 'MAT'::text))
          GROUP BY cssd_fact_quy_trinh.bo_dung_cu_id) q_active ON ((q_active.bo_dung_cu_id = b.id)))
     LEFT JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON ((c.bo_dung_cu_id = b.id)))
     LEFT JOIN public.cssd_dm_bo_phan_bo p ON ((p.bo_dung_cu_id = b.id)))
  GROUP BY b.id, q_active.cnt;


--
-- Name: v_cssd_loai_dung_cu_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_cssd_loai_dung_cu_summary WITH (security_invoker='true') AS
 SELECT l.id,
    l.ma_loai,
    l.ten_loai,
    l.mo_ta,
    l.created_at,
    l.updated_at,
    l.is_active,
    (l.specs ->> 'ma_loai_dung_cu'::text) AS ma_loai_dung_cu,
    (l.specs ->> 'ten_loai_dung_cu'::text) AS ten_loai_dung_cu,
    (l.specs ->> 'hinh_dang'::text) AS hinh_dang,
    (l.specs ->> 'kich_thuoc'::text) AS kich_thuoc,
    (l.specs ->> 'cong_dung'::text) AS cong_dung,
    l.is_chiu_nhiet,
    l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan,
    l.phan_loai_spaulding,
    l.so_ngay_han_dung,
    l.phan_loai,
    l.so_luong_kho_du_phong,
    ((COALESCE(l.so_luong_kho_du_phong, 0) + COALESCE(sum(
        CASE
            WHEN (b.is_active AND c.is_active) THEN c.so_luong
            ELSE 0
        END), (0)::bigint)))::integer AS so_luong_tong,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', b.id, 'ma_bo', b.ma_bo, 'ten_bo', b.ten_bo)) FILTER (WHERE ((b.id IS NOT NULL) AND b.is_active AND c.is_active)), '[]'::jsonb) AS bo_dung_cu_chua
   FROM ((public.cssd_dm_loai_dung_cu l
     LEFT JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON ((c.loai_dung_cu_id = l.id)))
     LEFT JOIN public.cssd_dm_bo_dung_cu b ON ((c.bo_dung_cu_id = b.id)))
  GROUP BY l.id;


--
-- Name: v_sys_staff_auth_overview _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_sys_staff_auth_overview WITH (security_invoker='true') AS
 SELECT ns.id,
    ns.ma_nv,
    ns.ho_ten,
    (ns.extra_data ->> 'email'::text) AS email,
    ns.is_active,
    ns.auth_user_id,
    COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE (r.name IS NOT NULL)), ARRAY[]::text[]) AS role_names
   FROM ((public.mdm_nhan_su ns
     LEFT JOIN public.sys_user_roles ur ON ((ur.user_id = ns.auth_user_id)))
     LEFT JOIN public.sys_roles r ON ((r.id = ur.role_id)))
  GROUP BY ns.id;


--
-- Name: gstt_fact_chung_sessions trg_assert_gsc_sessions_not_locked; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assert_gsc_sessions_not_locked BEFORE DELETE OR UPDATE ON public.gstt_fact_chung_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_assert_vst_gsc_not_locked();


--
-- Name: gstt_fact_vst_sessions trg_assert_vst_sessions_not_locked; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assert_vst_sessions_not_locked BEFORE DELETE OR UPDATE ON public.gstt_fact_vst_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_assert_vst_gsc_not_locked();


--
-- Name: gstt_fact_chung_sessions trg_audit_gsc_sessions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_gsc_sessions AFTER INSERT OR DELETE OR UPDATE ON public.gstt_fact_chung_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: gstt_fact_vst_sessions trg_audit_vst_sessions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_vst_sessions AFTER INSERT OR DELETE OR UPDATE ON public.gstt_fact_vst_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: cssd_fact_bao_tri trg_cssd_fact_bao_tri_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cssd_fact_bao_tri_audit AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_bao_tri FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: cssd_fact_dieu_chuyen_thanh_phan trg_cssd_fact_dieu_chuyen_thanh_phan_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cssd_fact_dieu_chuyen_thanh_phan_audit AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_dieu_chuyen_thanh_phan FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: cssd_fact_kho_chi_tiet trg_cssd_fact_kho_chi_tiet_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cssd_fact_kho_chi_tiet_audit AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_kho_chi_tiet FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: cssd_fact_kho_giao_dich trg_cssd_fact_kho_giao_dich_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cssd_fact_kho_giao_dich_audit AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_kho_giao_dich FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: cssd_fact_kho_hoa_chat_giao_dich trg_cssd_fact_kho_hoa_chat_giao_dich_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cssd_fact_kho_hoa_chat_giao_dich_audit AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_kho_hoa_chat_giao_dich FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: cssd_fact_lifecycle_event trg_cssd_fact_lifecycle_event_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cssd_fact_lifecycle_event_audit AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_lifecycle_event FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: cssd_fact_lo_tiet_khuan trg_cssd_fact_lo_tiet_khuan_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cssd_fact_lo_tiet_khuan_audit AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_lo_tiet_khuan FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: cssd_fact_quy_trinh trg_cssd_fact_quy_trinh_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cssd_fact_quy_trinh_audit AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_quy_trinh FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: cssd_fact_quy_trinh_thanh_phan trg_cssd_fact_quy_trinh_thanh_phan_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cssd_fact_quy_trinh_thanh_phan_audit AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_quy_trinh_thanh_phan FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: cssd_fact_su_co trg_cssd_fact_su_co_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cssd_fact_su_co_audit AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_su_co FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: qlcv_fact_cong_viec trg_inc_gia_han_so_lan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inc_gia_han_so_lan BEFORE UPDATE ON public.qlcv_fact_cong_viec FOR EACH ROW EXECUTE FUNCTION public.fn_inc_gia_han_so_lan();


--
-- Name: sys_mdm_registry trg_mdm_field_registry_on_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mdm_field_registry_on_change AFTER INSERT OR UPDATE ON public.sys_mdm_registry FOR EACH ROW EXECUTE FUNCTION public.fn_mdm_field_registry_attach_trigger();


--
-- Name: qlcv_fact_cong_viec trg_set_hoan_thanh_luc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_hoan_thanh_luc BEFORE UPDATE ON public.qlcv_fact_cong_viec FOR EACH ROW EXECUTE FUNCTION public.fn_set_hoan_thanh_luc();


--
-- Name: gstt_fact_chung_sessions trg_sync_gsc_session_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_gsc_session_delete AFTER DELETE ON public.gstt_fact_chung_sessions REFERENCING OLD TABLE AS old_table FOR EACH STATEMENT EXECUTE FUNCTION public.fn_trigger_sync_gsc_session_delete_stmt();


--
-- Name: gstt_fact_chung_sessions trg_sync_gsc_session_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_gsc_session_insert AFTER INSERT ON public.gstt_fact_chung_sessions REFERENCING NEW TABLE AS new_table FOR EACH STATEMENT EXECUTE FUNCTION public.fn_trigger_sync_gsc_session_insert_stmt();


--
-- Name: gstt_fact_chung_sessions trg_sync_gsc_session_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_gsc_session_update AFTER UPDATE ON public.gstt_fact_chung_sessions REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table FOR EACH STATEMENT EXECUTE FUNCTION public.fn_trigger_sync_gsc_session_update_stmt();


--
-- Name: gstt_fact_vst trg_sync_vst_opp_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_vst_opp_delete AFTER DELETE ON public.gstt_fact_vst REFERENCING OLD TABLE AS old_table FOR EACH STATEMENT EXECUTE FUNCTION public.fn_trigger_sync_vst_opp_delete_stmt();


--
-- Name: gstt_fact_vst trg_sync_vst_opp_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_vst_opp_insert AFTER INSERT ON public.gstt_fact_vst REFERENCING NEW TABLE AS new_table FOR EACH STATEMENT EXECUTE FUNCTION public.fn_trigger_sync_vst_opp_insert_stmt();


--
-- Name: gstt_fact_vst trg_sync_vst_opp_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_vst_opp_update AFTER UPDATE ON public.gstt_fact_vst REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table FOR EACH STATEMENT EXECUTE FUNCTION public.fn_trigger_sync_vst_opp_update_stmt();


--
-- Name: gstt_fact_vst_sessions trg_sync_vst_session; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_vst_session AFTER INSERT OR DELETE OR UPDATE ON public.gstt_fact_vst_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_sync_vst_session_row();


--
-- Name: gstt_dm_bang_kiem trg_sys_audit_; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sys_audit_ AFTER INSERT OR DELETE OR UPDATE ON public.gstt_dm_bang_kiem FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: mdm_dm_khoa_phong trg_sys_audit_; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sys_audit_ AFTER INSERT OR DELETE OR UPDATE ON public.mdm_dm_khoa_phong FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: mdm_nhan_su trg_sys_audit_; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sys_audit_ AFTER INSERT OR DELETE OR UPDATE ON public.mdm_nhan_su FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: sys_lookup_value trg_sys_audit_; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sys_audit_ AFTER INSERT OR DELETE OR UPDATE ON public.sys_lookup_value FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: sys_mdm_registry trg_sys_audit_; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sys_audit_ AFTER INSERT OR DELETE OR UPDATE ON public.sys_mdm_registry FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: sys_mdm_suggestion trg_sys_audit_; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sys_audit_ AFTER INSERT OR DELETE OR UPDATE ON public.sys_mdm_suggestion FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: sys_permissions trg_sys_audit_; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sys_audit_ AFTER INSERT OR DELETE OR UPDATE ON public.sys_permissions FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: sys_role_permissions trg_sys_audit_; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sys_audit_ AFTER INSERT OR DELETE OR UPDATE ON public.sys_role_permissions FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: sys_roles trg_sys_audit_; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sys_audit_ AFTER INSERT OR DELETE OR UPDATE ON public.sys_roles FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: sys_user_roles trg_sys_audit_; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sys_audit_ AFTER INSERT OR DELETE OR UPDATE ON public.sys_user_roles FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();


--
-- Name: sys_mdm_registry trg_touch_updated_at_mdm_field_registry; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_updated_at_mdm_field_registry BEFORE UPDATE ON public.sys_mdm_registry FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_mdm_registry();


--
-- Name: sys_mdm_suggestion trg_touch_updated_at_mdm_governance_suggestion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_updated_at_mdm_governance_suggestion BEFORE UPDATE ON public.sys_mdm_suggestion FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_mdm_registry();


--
-- Name: gstt_dm_bang_kiem trg_update_danh_muc_bk_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_danh_muc_bk_updated_at BEFORE UPDATE ON public.gstt_dm_bang_kiem FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cssd_dm_bo_phan_bo cssd_dm_bo_phan_bo_bo_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_phan_bo
    ADD CONSTRAINT cssd_dm_bo_phan_bo_bo_dung_cu_id_fkey FOREIGN KEY (bo_dung_cu_id) REFERENCES public.cssd_dm_bo_dung_cu(id) ON DELETE CASCADE;


--
-- Name: cssd_dm_bo_phan_bo cssd_dm_bo_phan_bo_khoa_phong_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_phan_bo
    ADD CONSTRAINT cssd_dm_bo_phan_bo_khoa_phong_id_fkey FOREIGN KEY (khoa_phong_id) REFERENCES public.mdm_dm_khoa_phong(id) ON DELETE CASCADE;


--
-- Name: cssd_dm_bo_dung_cu_chi_tiet dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_dung_cu_chi_tiet
    ADD CONSTRAINT dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey FOREIGN KEY (bo_dung_cu_id) REFERENCES public.cssd_dm_bo_dung_cu(id) ON DELETE CASCADE;


--
-- Name: cssd_dm_bo_dung_cu_chi_tiet dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_dung_cu_chi_tiet
    ADD CONSTRAINT dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey FOREIGN KEY (loai_dung_cu_id) REFERENCES public.cssd_dm_loai_dung_cu(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cssd_dm_bo_dung_cu dm_bo_dung_cu_khoa_su_dung_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_dung_cu
    ADD CONSTRAINT dm_bo_dung_cu_khoa_su_dung_id_fkey FOREIGN KEY (khoa_su_dung_id) REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cssd_dm_bo_dung_cu dm_bo_dung_cu_loai_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_bo_dung_cu
    ADD CONSTRAINT dm_bo_dung_cu_loai_dung_cu_id_fkey FOREIGN KEY (loai_dung_cu_id) REFERENCES public.cssd_dm_loai_dung_cu(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mdm_dm_khoa_phong dm_khoa_phong_khoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_dm_khoa_phong
    ADD CONSTRAINT dm_khoa_phong_khoi_id_fkey FOREIGN KEY (khoi_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cssd_fact_bao_tri fact_bao_tri_thiet_bi_thiet_bi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_bao_tri
    ADD CONSTRAINT fact_bao_tri_thiet_bi_thiet_bi_id_fkey FOREIGN KEY (thiet_bi_id) REFERENCES public.cssd_dm_thiet_bi(id) ON DELETE RESTRICT;


--
-- Name: qlcv_fact_cong_viec fact_cong_viec_cong_viec_cha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_cong_viec_cha_id_fkey FOREIGN KEY (cong_viec_cha_id) REFERENCES public.qlcv_fact_cong_viec(id) ON DELETE CASCADE;


--
-- Name: qlcv_fact_cong_viec fact_cong_viec_dinh_ky_mau_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_dinh_ky_mau_fk FOREIGN KEY (dinh_ky_mau_id) REFERENCES public.qlcv_fact_cong_viec_dinh_ky(id) ON DELETE SET NULL;


--
-- Name: qlcv_fact_cong_viec_dinh_ky fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec_dinh_ky
    ADD CONSTRAINT fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey FOREIGN KEY (nguoi_phu_trach_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: qlcv_fact_cong_viec_dinh_ky fact_cong_viec_dinh_ky_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec_dinh_ky
    ADD CONSTRAINT fact_cong_viec_dinh_ky_nguoi_tao_id_fkey FOREIGN KEY (nguoi_tao_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: qlcv_fact_cong_viec_dinh_ky fact_cong_viec_dinh_ky_to_cong_tac_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec_dinh_ky
    ADD CONSTRAINT fact_cong_viec_dinh_ky_to_cong_tac_id_fkey FOREIGN KEY (to_cong_tac_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: qlcv_fact_cong_viec_hoat_dong fact_cong_viec_hoat_dong_id_cong_viec_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec_hoat_dong
    ADD CONSTRAINT fact_cong_viec_hoat_dong_id_cong_viec_fkey FOREIGN KEY (id_cong_viec) REFERENCES public.qlcv_fact_cong_viec(id) ON DELETE CASCADE;


--
-- Name: qlcv_fact_cong_viec_hoat_dong fact_cong_viec_hoat_dong_nguoi_thuc_hien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec_hoat_dong
    ADD CONSTRAINT fact_cong_viec_hoat_dong_nguoi_thuc_hien_id_fkey FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: qlcv_fact_cong_viec fact_cong_viec_khoa_thuc_hien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_khoa_thuc_hien_id_fkey FOREIGN KEY (khoa_thuc_hien_id) REFERENCES public.mdm_dm_khoa_phong(id);


--
-- Name: qlcv_fact_cong_viec fact_cong_viec_nguoi_giao_viec_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_nguoi_giao_viec_id_fkey FOREIGN KEY (nguoi_giao_viec_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: qlcv_fact_cong_viec fact_cong_viec_nguoi_phu_trach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_nguoi_phu_trach_id_fkey FOREIGN KEY (nguoi_phu_trach_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: qlcv_fact_cong_viec fact_cong_viec_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_nguoi_tao_id_fkey FOREIGN KEY (nguoi_tao_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: qlcv_fact_cong_viec fact_cong_viec_to_cong_tac_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_to_cong_tac_id_fkey FOREIGN KEY (to_cong_tac_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cssd_fact_dieu_chuyen_thanh_phan fact_cssd_dieu_chuyen_thanh_phan_den_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_dieu_chuyen_thanh_phan
    ADD CONSTRAINT fact_cssd_dieu_chuyen_thanh_phan_den_quy_trinh_id_fkey FOREIGN KEY (den_quy_trinh_id) REFERENCES public.cssd_fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: cssd_fact_dieu_chuyen_thanh_phan fact_cssd_dieu_chuyen_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_dieu_chuyen_thanh_phan
    ADD CONSTRAINT fact_cssd_dieu_chuyen_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey FOREIGN KEY (dm_bo_dung_cu_chi_tiet_id) REFERENCES public.cssd_dm_bo_dung_cu_chi_tiet(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_dieu_chuyen_thanh_phan fact_cssd_dieu_chuyen_thanh_phan_tu_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_dieu_chuyen_thanh_phan
    ADD CONSTRAINT fact_cssd_dieu_chuyen_thanh_phan_tu_quy_trinh_id_fkey FOREIGN KEY (tu_quy_trinh_id) REFERENCES public.cssd_fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: cssd_fact_lifecycle_event fact_cssd_lifecycle_event_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_lifecycle_event
    ADD CONSTRAINT fact_cssd_lifecycle_event_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.cssd_fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: gstt_fact_chung_sessions fact_giam_sat_chung_sessions_cach_thuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_chung_sessions
    ADD CONSTRAINT fact_giam_sat_chung_sessions_cach_thuc_id_fkey FOREIGN KEY (cach_thuc_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_chung_sessions fact_giam_sat_chung_sessions_hinh_thuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_chung_sessions
    ADD CONSTRAINT fact_giam_sat_chung_sessions_hinh_thuc_id_fkey FOREIGN KEY (hinh_thuc_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_vst_sessions fact_giam_sat_vst_sessions_cach_thuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst_sessions
    ADD CONSTRAINT fact_giam_sat_vst_sessions_cach_thuc_id_fkey FOREIGN KEY (cach_thuc_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_vst_sessions fact_giam_sat_vst_sessions_hinh_thuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst_sessions
    ADD CONSTRAINT fact_giam_sat_vst_sessions_hinh_thuc_id_fkey FOREIGN KEY (hinh_thuc_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cssd_fact_kho_giao_dich fact_kho_dung_cu_giao_dich_bo_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_giao_dich
    ADD CONSTRAINT fact_kho_dung_cu_giao_dich_bo_dung_cu_id_fkey FOREIGN KEY (bo_dung_cu_id) REFERENCES public.cssd_dm_bo_dung_cu(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_kho_giao_dich fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_giao_dich
    ADD CONSTRAINT fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey FOREIGN KEY (loai_dung_cu_id) REFERENCES public.cssd_dm_loai_dung_cu(id) ON DELETE CASCADE;


--
-- Name: cssd_fact_kho_giao_dich fact_kho_dung_cu_giao_dich_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_giao_dich
    ADD CONSTRAINT fact_kho_dung_cu_giao_dich_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.cssd_fact_quy_trinh(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_kho_hoa_chat_giao_dich fact_kho_hoa_chat_giao_dich_dm_hoa_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_hoa_chat_giao_dich
    ADD CONSTRAINT fact_kho_hoa_chat_giao_dich_dm_hoa_chat_id_fkey FOREIGN KEY (dm_hoa_chat_id) REFERENCES public.cssd_dm_hoa_chat(id) ON DELETE RESTRICT;


--
-- Name: nkbv_fact_benh_an fact_nkbv_benh_an_khoa_dieu_tri_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_benh_an
    ADD CONSTRAINT fact_nkbv_benh_an_khoa_dieu_tri_fkey FOREIGN KEY (khoa_dieu_tri_id) REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: nkbv_fact_mau_so_daily fact_nkbv_mau_so_daily_khoa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_mau_so_daily
    ADD CONSTRAINT fact_nkbv_mau_so_daily_khoa_fkey FOREIGN KEY (khoa_id) REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: nkbv_fact_mau_so_phau_thuat fact_nkbv_mau_so_pt_khoa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_mau_so_phau_thuat
    ADD CONSTRAINT fact_nkbv_mau_so_pt_khoa_fkey FOREIGN KEY (khoa_id) REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_khoa_ghi_nhan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_su_kien
    ADD CONSTRAINT fact_nkbv_su_kien_khoa_ghi_nhan_fkey FOREIGN KEY (khoa_ghi_nhan_id) REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_loai_nkbv_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_su_kien
    ADD CONSTRAINT fact_nkbv_su_kien_loai_nkbv_fkey FOREIGN KEY (loai_nkbv_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_ma_benh_an_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_su_kien
    ADD CONSTRAINT fact_nkbv_su_kien_ma_benh_an_fkey FOREIGN KEY (ma_benh_an) REFERENCES public.nkbv_fact_benh_an(ma_benh_an) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_nguoi_ghi_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_su_kien
    ADD CONSTRAINT fact_nkbv_su_kien_nguoi_ghi_fkey FOREIGN KEY (nguoi_ghi_id) REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_trang_thai_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_su_kien
    ADD CONSTRAINT fact_nkbv_su_kien_trang_thai_fkey FOREIGN KEY (trang_thai_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_vi_sinh_record_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_su_kien
    ADD CONSTRAINT fact_nkbv_su_kien_vi_sinh_record_fkey FOREIGN KEY (vi_sinh_record_id) REFERENCES public.nkbv_fact_vi_sinh(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: nkbv_fact_vi_sinh fact_nkbv_vi_sinh_khoa_yeu_cau_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_vi_sinh
    ADD CONSTRAINT fact_nkbv_vi_sinh_khoa_yeu_cau_fkey FOREIGN KEY (khoa_yeu_cau_id) REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: nkbv_fact_vi_sinh fact_nkbv_vi_sinh_ma_benh_an_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_vi_sinh
    ADD CONSTRAINT fact_nkbv_vi_sinh_ma_benh_an_fkey FOREIGN KEY (ma_benh_an) REFERENCES public.nkbv_fact_benh_an(ma_benh_an) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cssd_fact_quy_trinh fact_quy_trinh_quy_trinh_cha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT fact_quy_trinh_quy_trinh_cha_id_fkey FOREIGN KEY (quy_trinh_cha_id) REFERENCES public.cssd_fact_quy_trinh(id);


--
-- Name: cssd_fact_quy_trinh_thanh_phan fact_quy_trinh_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh_thanh_phan
    ADD CONSTRAINT fact_quy_trinh_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey FOREIGN KEY (dm_bo_dung_cu_chi_tiet_id) REFERENCES public.cssd_dm_bo_dung_cu_chi_tiet(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_quy_trinh_thanh_phan fact_quy_trinh_thanh_phan_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh_thanh_phan
    ADD CONSTRAINT fact_quy_trinh_thanh_phan_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.cssd_fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: qlcv_fact_cong_viec fk_cong_viec_loai_cong_viec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec
    ADD CONSTRAINT fk_cong_viec_loai_cong_viec FOREIGN KEY (loai_cong_viec_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cssd_fact_kho_giao_dich fk_cssd_kho_giao_dich_nguoi_thuc_hien; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_giao_dich
    ADD CONSTRAINT fk_cssd_kho_giao_dich_nguoi_thuc_hien FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: cssd_dm_thiet_bi fk_dm_thiet_bi_loai_may; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_dm_thiet_bi
    ADD CONSTRAINT fk_dm_thiet_bi_loai_may FOREIGN KEY (loai_may_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_chung_sessions fk_gsc_sessions_bang_kiem; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_chung_sessions
    ADD CONSTRAINT fk_gsc_sessions_bang_kiem FOREIGN KEY (bang_kiem_id) REFERENCES public.gstt_dm_bang_kiem(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_kho_chi_tiet fk_kho_chi_tiet_vat_tu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_chi_tiet
    ADD CONSTRAINT fk_kho_chi_tiet_vat_tu FOREIGN KEY (vat_tu_id) REFERENCES public.cssd_dm_hoa_chat(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_lo_tiet_khuan fk_lo_tiet_khuan_loai_may; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_lo_tiet_khuan
    ADD CONSTRAINT fk_lo_tiet_khuan_loai_may FOREIGN KEY (loai_may_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cssd_fact_lo_tiet_khuan fk_lo_tiet_khuan_nguoi_van_hanh; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_lo_tiet_khuan
    ADD CONSTRAINT fk_lo_tiet_khuan_nguoi_van_hanh FOREIGN KEY (nguoi_van_hanh_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_quy_trinh fk_quy_trinh_nguoi_cap_phat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_cap_phat FOREIGN KEY (nguoi_cap_phat_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_quy_trinh fk_quy_trinh_nguoi_dang_giu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_dang_giu FOREIGN KEY (nguoi_dang_giu_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_quy_trinh fk_quy_trinh_nguoi_dong_goi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_dong_goi FOREIGN KEY (nguoi_dong_goi_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_quy_trinh fk_quy_trinh_nguoi_kiem_tra; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_kiem_tra FOREIGN KEY (nguoi_kiem_tra_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_quy_trinh fk_quy_trinh_nguoi_lam_sach; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_lam_sach FOREIGN KEY (nguoi_lam_sach_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_quy_trinh fk_quy_trinh_nguoi_tiep_nhan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_tiep_nhan FOREIGN KEY (nguoi_tiep_nhan_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_quy_trinh fk_quy_trinh_nguoi_tiet_khuan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_tiet_khuan FOREIGN KEY (nguoi_tiet_khuan_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_quy_trinh fk_quy_trinh_tram_hien_tai; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_tram_hien_tai FOREIGN KEY (tram_hien_tai_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cssd_fact_su_co fk_su_co_loai_su_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_su_co
    ADD CONSTRAINT fk_su_co_loai_su_co FOREIGN KEY (loai_su_co_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_vst fk_vst_obs_nghe_nghiep; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst
    ADD CONSTRAINT fk_vst_obs_nghe_nghiep FOREIGN KEY (nghe_nghiep_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_chung_sessions giam_sat_chung_sessions_khoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_khoa_id_fkey FOREIGN KEY (khoa_id) REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_chung_sessions giam_sat_chung_sessions_nghe_nghiep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_nghe_nghiep_id_fkey FOREIGN KEY (nghe_nghiep_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_chung_sessions giam_sat_chung_sessions_nguoi_giam_sat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_nguoi_giam_sat_id_fkey FOREIGN KEY (nguoi_giam_sat_id) REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_chung_sessions giam_sat_chung_sessions_nhan_vien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_nhan_vien_id_fkey FOREIGN KEY (nhan_vien_id) REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_vst giam_sat_vst_khoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst
    ADD CONSTRAINT giam_sat_vst_khoa_id_fkey FOREIGN KEY (khoa_id) REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_vst giam_sat_vst_nhan_vien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst
    ADD CONSTRAINT giam_sat_vst_nhan_vien_id_fkey FOREIGN KEY (nhan_vien_id) REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_vst giam_sat_vst_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst
    ADD CONSTRAINT giam_sat_vst_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.gstt_fact_vst_sessions(id) ON DELETE CASCADE;


--
-- Name: gstt_fact_vst_sessions giam_sat_vst_sessions_khoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst_sessions
    ADD CONSTRAINT giam_sat_vst_sessions_khoa_id_fkey FOREIGN KEY (khoa_id) REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: gstt_fact_vst_sessions giam_sat_vst_sessions_nguoi_giam_sat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gstt_fact_vst_sessions
    ADD CONSTRAINT giam_sat_vst_sessions_nguoi_giam_sat_id_fkey FOREIGN KEY (nguoi_giam_sat_id) REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mdm_nhan_su ho_so_nhan_vien_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT ho_so_nhan_vien_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mdm_nhan_su ho_so_nhan_vien_chuc_danh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT ho_so_nhan_vien_chuc_danh_id_fkey FOREIGN KEY (chuc_danh_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mdm_nhan_su ho_so_nhan_vien_chuc_vu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT ho_so_nhan_vien_chuc_vu_id_fkey FOREIGN KEY (chuc_vu_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mdm_nhan_su ho_so_nhan_vien_khoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT ho_so_nhan_vien_khoa_id_fkey FOREIGN KEY (khoa_id) REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mdm_nhan_su ho_so_nhan_vien_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT ho_so_nhan_vien_to_id_fkey FOREIGN KEY (to_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cssd_fact_kho_chi_tiet kho_chi_tiet_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_kho_chi_tiet
    ADD CONSTRAINT kho_chi_tiet_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.cssd_fact_quy_trinh(id);


--
-- Name: cssd_fact_lo_tiet_khuan lo_tiet_khuan_thiet_bi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_lo_tiet_khuan
    ADD CONSTRAINT lo_tiet_khuan_thiet_bi_id_fkey FOREIGN KEY (thiet_bi_id) REFERENCES public.cssd_dm_thiet_bi(id);


--
-- Name: mdm_nhan_su mdm_nhan_su_nghe_nghiep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT mdm_nhan_su_nghe_nghiep_id_fkey FOREIGN KEY (nghe_nghiep_id) REFERENCES public.sys_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mdm_nhan_su mdm_nhan_su_vai_tro_he_thong_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT mdm_nhan_su_vai_tro_he_thong_id_fkey FOREIGN KEY (vai_tro_he_thong_id) REFERENCES public.sys_roles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: nkbv_fact_su_kien nkbv_fact_su_kien_lo_tiet_khuan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_su_kien
    ADD CONSTRAINT nkbv_fact_su_kien_lo_tiet_khuan_id_fkey FOREIGN KEY (lo_tiet_khuan_id) REFERENCES public.cssd_fact_lo_tiet_khuan(id) ON DELETE SET NULL;


--
-- Name: nkbv_fact_su_kien nkbv_fact_su_kien_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nkbv_fact_su_kien
    ADD CONSTRAINT nkbv_fact_su_kien_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.cssd_fact_quy_trinh(id) ON DELETE SET NULL;


--
-- Name: qlcv_fact_cong_viec_dinh_ky qlcv_fact_cong_viec_dinh_ky_khoa_thuc_hien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlcv_fact_cong_viec_dinh_ky
    ADD CONSTRAINT qlcv_fact_cong_viec_dinh_ky_khoa_thuc_hien_id_fkey FOREIGN KEY (khoa_thuc_hien_id) REFERENCES public.mdm_dm_khoa_phong(id) ON DELETE SET NULL;


--
-- Name: cssd_fact_quy_trinh quy_trinh_bo_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT quy_trinh_bo_dung_cu_id_fkey FOREIGN KEY (bo_dung_cu_id) REFERENCES public.cssd_dm_bo_dung_cu(id);


--
-- Name: cssd_fact_quy_trinh quy_trinh_lo_tiet_khuan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_quy_trinh
    ADD CONSTRAINT quy_trinh_lo_tiet_khuan_id_fkey FOREIGN KEY (lo_tiet_khuan_id) REFERENCES public.cssd_fact_lo_tiet_khuan(id);


--
-- Name: sys_role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.sys_permissions(id) ON DELETE CASCADE;


--
-- Name: sys_role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.sys_roles(id) ON DELETE CASCADE;


--
-- Name: cssd_fact_su_co su_co_nguoi_bao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_su_co
    ADD CONSTRAINT su_co_nguoi_bao_id_fkey FOREIGN KEY (nguoi_bao_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: cssd_fact_su_co su_co_nguoi_xac_nhan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_su_co
    ADD CONSTRAINT su_co_nguoi_xac_nhan_id_fkey FOREIGN KEY (nguoi_xac_nhan_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: cssd_fact_su_co su_co_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cssd_fact_su_co
    ADD CONSTRAINT su_co_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.cssd_fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: sys_user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.sys_roles(id) ON DELETE CASCADE;


--
-- Name: sys_user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: gstt_dm_bang_kiem Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON public.gstt_dm_bang_kiem TO authenticated USING (true) WITH CHECK (true);


--
-- Name: gstt_fact_chung_sessions Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON public.gstt_fact_chung_sessions TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sys_user_roles ur
     JOIN public.sys_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'ADMIN'::text)))));


--
-- Name: gstt_fact_vst Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON public.gstt_fact_vst TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sys_user_roles ur
     JOIN public.sys_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'ADMIN'::text)))));


--
-- Name: gstt_fact_vst_sessions Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON public.gstt_fact_vst_sessions TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sys_user_roles ur
     JOIN public.sys_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'ADMIN'::text)))));


--
-- Name: qlcv_fact_cong_viec Allow all for auth users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for auth users" ON public.qlcv_fact_cong_viec USING (true);


--
-- Name: gstt_fact_gsc_dashboard_summary Allow select for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select for authenticated users" ON public.gstt_fact_gsc_dashboard_summary FOR SELECT TO authenticated USING (true);


--
-- Name: gstt_fact_gsc_violations_summary Allow select for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select for authenticated users" ON public.gstt_fact_gsc_violations_summary FOR SELECT TO authenticated USING (true);


--
-- Name: gstt_fact_vst_moments_summary Allow select for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select for authenticated users" ON public.gstt_fact_vst_moments_summary FOR SELECT TO authenticated USING (true);


--
-- Name: gstt_fact_vst_opportunities_summary Allow select for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select for authenticated users" ON public.gstt_fact_vst_opportunities_summary FOR SELECT TO authenticated USING (true);


--
-- Name: gstt_fact_vst_sessions_summary Allow select for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select for authenticated users" ON public.gstt_fact_vst_sessions_summary FOR SELECT TO authenticated USING (true);


--
-- Name: gstt_dm_bang_kiem Authenticated read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access" ON public.gstt_dm_bang_kiem FOR SELECT TO authenticated USING (true);


--
-- Name: gstt_fact_chung_sessions Authenticated read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access" ON public.gstt_fact_chung_sessions FOR SELECT TO authenticated USING (true);


--
-- Name: gstt_fact_vst Authenticated read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access" ON public.gstt_fact_vst FOR SELECT TO authenticated USING (true);


--
-- Name: gstt_fact_vst_sessions Authenticated read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access" ON public.gstt_fact_vst_sessions FOR SELECT TO authenticated USING (true);


--
-- Name: qlcv_fact_cong_viec Cho phép thao tác fact_cong_viec; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cho phép thao tác fact_cong_viec" ON public.qlcv_fact_cong_viec TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cssd_dm_bo_dung_cu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_dm_bo_dung_cu ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_dm_bo_dung_cu_chi_tiet; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_dm_bo_dung_cu_chi_tiet ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_dm_bo_dung_cu_chi_tiet cssd_dm_bo_dung_cu_chi_tiet_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_delete ON public.cssd_dm_bo_dung_cu_chi_tiet FOR DELETE TO authenticated USING (public.fn_sys_has_permission('BO_DC'::text, 'delete'::text));


--
-- Name: cssd_dm_bo_dung_cu_chi_tiet cssd_dm_bo_dung_cu_chi_tiet_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_insert ON public.cssd_dm_bo_dung_cu_chi_tiet FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('BO_DC'::text, 'create'::text));


--
-- Name: cssd_dm_bo_dung_cu_chi_tiet cssd_dm_bo_dung_cu_chi_tiet_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_select ON public.cssd_dm_bo_dung_cu_chi_tiet FOR SELECT TO authenticated USING (public.fn_sys_has_permission('BO_DC'::text, 'view'::text));


--
-- Name: cssd_dm_bo_dung_cu_chi_tiet cssd_dm_bo_dung_cu_chi_tiet_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_update ON public.cssd_dm_bo_dung_cu_chi_tiet FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('BO_DC'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('BO_DC'::text, 'edit'::text));


--
-- Name: cssd_dm_bo_dung_cu cssd_dm_bo_dung_cu_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_dung_cu_delete ON public.cssd_dm_bo_dung_cu FOR DELETE TO authenticated USING (public.fn_sys_has_permission('BO_DC'::text, 'delete'::text));


--
-- Name: cssd_dm_bo_dung_cu cssd_dm_bo_dung_cu_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_dung_cu_insert ON public.cssd_dm_bo_dung_cu FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('BO_DC'::text, 'create'::text));


--
-- Name: cssd_dm_bo_dung_cu cssd_dm_bo_dung_cu_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_dung_cu_select ON public.cssd_dm_bo_dung_cu FOR SELECT TO authenticated USING (public.fn_sys_has_permission('BO_DC'::text, 'view'::text));


--
-- Name: cssd_dm_bo_dung_cu cssd_dm_bo_dung_cu_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_dung_cu_update ON public.cssd_dm_bo_dung_cu FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('BO_DC'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('BO_DC'::text, 'edit'::text));


--
-- Name: cssd_dm_bo_phan_bo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_dm_bo_phan_bo ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_dm_bo_phan_bo cssd_dm_bo_phan_bo_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_phan_bo_delete ON public.cssd_dm_bo_phan_bo FOR DELETE TO authenticated USING (public.fn_sys_has_permission('CSSD_KHO_DUNGCU'::text, 'delete'::text));


--
-- Name: cssd_dm_bo_phan_bo cssd_dm_bo_phan_bo_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_phan_bo_insert ON public.cssd_dm_bo_phan_bo FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('CSSD_KHO_DUNGCU'::text, 'create'::text));


--
-- Name: cssd_dm_bo_phan_bo cssd_dm_bo_phan_bo_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_phan_bo_select ON public.cssd_dm_bo_phan_bo FOR SELECT TO authenticated USING (public.fn_sys_has_permission('CSSD_KHO_DUNGCU'::text, 'view'::text));


--
-- Name: cssd_dm_bo_phan_bo cssd_dm_bo_phan_bo_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_bo_phan_bo_update ON public.cssd_dm_bo_phan_bo FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('CSSD_KHO_DUNGCU'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('CSSD_KHO_DUNGCU'::text, 'edit'::text));


--
-- Name: cssd_dm_hoa_chat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_dm_hoa_chat ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_dm_hoa_chat cssd_dm_hoa_chat_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_hoa_chat_delete ON public.cssd_dm_hoa_chat FOR DELETE TO authenticated USING (public.fn_sys_has_permission('HOA_CHAT'::text, 'delete'::text));


--
-- Name: cssd_dm_hoa_chat cssd_dm_hoa_chat_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_hoa_chat_insert ON public.cssd_dm_hoa_chat FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('HOA_CHAT'::text, 'create'::text));


--
-- Name: cssd_dm_hoa_chat cssd_dm_hoa_chat_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_hoa_chat_select ON public.cssd_dm_hoa_chat FOR SELECT TO authenticated USING (public.fn_sys_has_permission('HOA_CHAT'::text, 'view'::text));


--
-- Name: cssd_dm_hoa_chat cssd_dm_hoa_chat_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_hoa_chat_update ON public.cssd_dm_hoa_chat FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('HOA_CHAT'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('HOA_CHAT'::text, 'edit'::text));


--
-- Name: cssd_dm_loai_dung_cu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_dm_loai_dung_cu ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_dm_loai_dung_cu cssd_dm_loai_dung_cu_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_loai_dung_cu_delete ON public.cssd_dm_loai_dung_cu FOR DELETE TO authenticated USING (public.fn_sys_has_permission('LOAI_DC'::text, 'delete'::text));


--
-- Name: cssd_dm_loai_dung_cu cssd_dm_loai_dung_cu_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_loai_dung_cu_insert ON public.cssd_dm_loai_dung_cu FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('LOAI_DC'::text, 'create'::text));


--
-- Name: cssd_dm_loai_dung_cu cssd_dm_loai_dung_cu_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_loai_dung_cu_select ON public.cssd_dm_loai_dung_cu FOR SELECT TO authenticated USING (public.fn_sys_has_permission('LOAI_DC'::text, 'view'::text));


--
-- Name: cssd_dm_loai_dung_cu cssd_dm_loai_dung_cu_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_loai_dung_cu_update ON public.cssd_dm_loai_dung_cu FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('LOAI_DC'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('LOAI_DC'::text, 'edit'::text));


--
-- Name: cssd_dm_thiet_bi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_dm_thiet_bi ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_dm_thiet_bi cssd_dm_thiet_bi_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_thiet_bi_delete ON public.cssd_dm_thiet_bi FOR DELETE TO authenticated USING (public.fn_sys_has_permission('THIET_BI'::text, 'delete'::text));


--
-- Name: cssd_dm_thiet_bi cssd_dm_thiet_bi_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_thiet_bi_insert ON public.cssd_dm_thiet_bi FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('THIET_BI'::text, 'create'::text));


--
-- Name: cssd_dm_thiet_bi cssd_dm_thiet_bi_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_thiet_bi_select ON public.cssd_dm_thiet_bi FOR SELECT TO authenticated USING (public.fn_sys_has_permission('THIET_BI'::text, 'view'::text));


--
-- Name: cssd_dm_thiet_bi cssd_dm_thiet_bi_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_dm_thiet_bi_update ON public.cssd_dm_thiet_bi FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('THIET_BI'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('THIET_BI'::text, 'edit'::text));


--
-- Name: cssd_fact_bao_tri; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_fact_bao_tri ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_fact_dieu_chuyen_thanh_phan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_fact_dieu_chuyen_thanh_phan ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_fact_dieu_chuyen_thanh_phan cssd_fact_dieu_chuyen_thanh_phan_all_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_fact_dieu_chuyen_thanh_phan_all_authenticated ON public.cssd_fact_dieu_chuyen_thanh_phan TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cssd_fact_dieu_chuyen_thanh_phan cssd_fact_dieu_chuyen_thanh_phan_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_fact_dieu_chuyen_thanh_phan_select_authenticated ON public.cssd_fact_dieu_chuyen_thanh_phan FOR SELECT TO authenticated USING (true);


--
-- Name: cssd_fact_kho_chi_tiet; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_fact_kho_chi_tiet ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_fact_kho_chi_tiet cssd_fact_kho_chi_tiet_all_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_fact_kho_chi_tiet_all_authenticated ON public.cssd_fact_kho_chi_tiet TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cssd_fact_kho_chi_tiet cssd_fact_kho_chi_tiet_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_fact_kho_chi_tiet_select_authenticated ON public.cssd_fact_kho_chi_tiet FOR SELECT TO authenticated USING (true);


--
-- Name: cssd_fact_kho_giao_dich; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_fact_kho_giao_dich ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_fact_kho_hoa_chat_giao_dich; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_fact_lifecycle_event; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_fact_lifecycle_event ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_fact_lifecycle_event cssd_fact_lifecycle_event_all_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_fact_lifecycle_event_all_authenticated ON public.cssd_fact_lifecycle_event TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cssd_fact_lifecycle_event cssd_fact_lifecycle_event_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cssd_fact_lifecycle_event_select_authenticated ON public.cssd_fact_lifecycle_event FOR SELECT TO authenticated USING (true);


--
-- Name: cssd_fact_lo_tiet_khuan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_fact_lo_tiet_khuan ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_fact_quy_trinh; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_fact_quy_trinh ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_fact_quy_trinh_thanh_phan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_fact_quy_trinh_thanh_phan ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_fact_su_co; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cssd_fact_su_co ENABLE ROW LEVEL SECURITY;

--
-- Name: cssd_dm_bo_dung_cu_chi_tiet dm_bo_dung_cu_chi_tiet_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_bo_dung_cu_chi_tiet_select_auth_v1 ON public.cssd_dm_bo_dung_cu_chi_tiet FOR SELECT TO authenticated USING (true);


--
-- Name: cssd_dm_bo_dung_cu_chi_tiet dm_bo_dung_cu_chi_tiet_update_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_bo_dung_cu_chi_tiet_update_auth_v1 ON public.cssd_dm_bo_dung_cu_chi_tiet FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cssd_dm_bo_dung_cu dm_bo_dung_cu_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_bo_dung_cu_select_auth_v1 ON public.cssd_dm_bo_dung_cu FOR SELECT TO authenticated USING (true);


--
-- Name: cssd_dm_hoa_chat dm_hoa_chat_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_hoa_chat_admin_all ON public.cssd_dm_hoa_chat TO authenticated USING (true);


--
-- Name: cssd_dm_hoa_chat dm_hoa_chat_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_hoa_chat_select_all ON public.cssd_dm_hoa_chat FOR SELECT TO authenticated USING (true);


--
-- Name: mdm_dm_khoa_phong dm_khoa_phong_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_khoa_phong_select_auth_v1 ON public.mdm_dm_khoa_phong FOR SELECT TO authenticated USING (true);


--
-- Name: nkbv_dm_cdc_baseline dm_nkbv_cdc_baselines_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_nkbv_cdc_baselines_delete ON public.nkbv_dm_cdc_baseline FOR DELETE TO authenticated USING (true);


--
-- Name: nkbv_dm_cdc_baseline dm_nkbv_cdc_baselines_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_nkbv_cdc_baselines_insert ON public.nkbv_dm_cdc_baseline FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nkbv_dm_cdc_baseline dm_nkbv_cdc_baselines_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_nkbv_cdc_baselines_select ON public.nkbv_dm_cdc_baseline FOR SELECT TO authenticated USING (true);


--
-- Name: nkbv_dm_cdc_baseline dm_nkbv_cdc_baselines_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_nkbv_cdc_baselines_update ON public.nkbv_dm_cdc_baseline FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cssd_fact_bao_tri fact_bao_tri_thiet_bi_all_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_bao_tri_thiet_bi_all_auth ON public.cssd_fact_bao_tri TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cssd_fact_bao_tri fact_bao_tri_thiet_bi_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_bao_tri_thiet_bi_select_auth ON public.cssd_fact_bao_tri FOR SELECT TO authenticated USING (true);


--
-- Name: cssd_fact_kho_giao_dich fact_kho_dung_cu_giao_dich_all_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_kho_dung_cu_giao_dich_all_auth ON public.cssd_fact_kho_giao_dich TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cssd_fact_kho_giao_dich fact_kho_dung_cu_giao_dich_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_kho_dung_cu_giao_dich_select_auth ON public.cssd_fact_kho_giao_dich FOR SELECT TO authenticated USING (true);


--
-- Name: cssd_fact_kho_hoa_chat_giao_dich fact_kho_hc_all_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_kho_hc_all_auth ON public.cssd_fact_kho_hoa_chat_giao_dich TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cssd_fact_kho_hoa_chat_giao_dich fact_kho_hc_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_kho_hc_select_auth ON public.cssd_fact_kho_hoa_chat_giao_dich FOR SELECT TO authenticated USING (true);


--
-- Name: cssd_fact_lo_tiet_khuan fact_lo_tiet_khuan_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_lo_tiet_khuan_select_authenticated ON public.cssd_fact_lo_tiet_khuan FOR SELECT TO authenticated USING (true);


--
-- Name: nkbv_fact_benh_an fact_nkbv_benh_an_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_benh_an_delete ON public.nkbv_fact_benh_an FOR DELETE TO authenticated USING (true);


--
-- Name: nkbv_fact_benh_an fact_nkbv_benh_an_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_benh_an_insert ON public.nkbv_fact_benh_an FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nkbv_fact_benh_an fact_nkbv_benh_an_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_benh_an_select ON public.nkbv_fact_benh_an FOR SELECT TO authenticated USING (true);


--
-- Name: nkbv_fact_benh_an fact_nkbv_benh_an_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_benh_an_update ON public.nkbv_fact_benh_an FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nkbv_fact_mau_so_daily fact_nkbv_mau_so_daily_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_mau_so_daily_delete ON public.nkbv_fact_mau_so_daily FOR DELETE TO authenticated USING (true);


--
-- Name: nkbv_fact_mau_so_daily fact_nkbv_mau_so_daily_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_mau_so_daily_insert ON public.nkbv_fact_mau_so_daily FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nkbv_fact_mau_so_daily fact_nkbv_mau_so_daily_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_mau_so_daily_select ON public.nkbv_fact_mau_so_daily FOR SELECT TO authenticated USING (true);


--
-- Name: nkbv_fact_mau_so_daily fact_nkbv_mau_so_daily_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_mau_so_daily_update ON public.nkbv_fact_mau_so_daily FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nkbv_fact_mau_so_phau_thuat fact_nkbv_mau_so_phau_thuat_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_mau_so_phau_thuat_delete ON public.nkbv_fact_mau_so_phau_thuat FOR DELETE TO authenticated USING (true);


--
-- Name: nkbv_fact_mau_so_phau_thuat fact_nkbv_mau_so_phau_thuat_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_mau_so_phau_thuat_insert ON public.nkbv_fact_mau_so_phau_thuat FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nkbv_fact_mau_so_phau_thuat fact_nkbv_mau_so_phau_thuat_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_mau_so_phau_thuat_select ON public.nkbv_fact_mau_so_phau_thuat FOR SELECT TO authenticated USING (true);


--
-- Name: nkbv_fact_mau_so_phau_thuat fact_nkbv_mau_so_phau_thuat_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_mau_so_phau_thuat_update ON public.nkbv_fact_mau_so_phau_thuat FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_su_kien_delete ON public.nkbv_fact_su_kien FOR DELETE TO authenticated USING (true);


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_su_kien_insert ON public.nkbv_fact_su_kien FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_su_kien_select ON public.nkbv_fact_su_kien FOR SELECT TO authenticated USING (true);


--
-- Name: nkbv_fact_su_kien fact_nkbv_su_kien_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_su_kien_update ON public.nkbv_fact_su_kien FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nkbv_fact_vi_sinh fact_nkbv_vi_sinh_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_vi_sinh_delete ON public.nkbv_fact_vi_sinh FOR DELETE TO authenticated USING (true);


--
-- Name: nkbv_fact_vi_sinh fact_nkbv_vi_sinh_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_vi_sinh_insert ON public.nkbv_fact_vi_sinh FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nkbv_fact_vi_sinh fact_nkbv_vi_sinh_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_vi_sinh_select ON public.nkbv_fact_vi_sinh FOR SELECT TO authenticated USING (true);


--
-- Name: nkbv_fact_vi_sinh fact_nkbv_vi_sinh_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nkbv_vi_sinh_update ON public.nkbv_fact_vi_sinh FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: cssd_fact_quy_trinh fact_quy_trinh_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_quy_trinh_select_authenticated ON public.cssd_fact_quy_trinh FOR SELECT TO authenticated USING (true);


--
-- Name: cssd_fact_quy_trinh_thanh_phan fact_quy_trinh_thanh_phan_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_quy_trinh_thanh_phan_select_authenticated ON public.cssd_fact_quy_trinh_thanh_phan FOR SELECT TO authenticated USING (true);


--
-- Name: cssd_fact_su_co fact_su_co_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_su_co_select_authenticated ON public.cssd_fact_su_co FOR SELECT TO authenticated USING (true);


--
-- Name: gstt_fact_chung_sessions gsc_sessions_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gsc_sessions_select_authenticated ON public.gstt_fact_chung_sessions FOR SELECT TO authenticated USING ((COALESCE(is_active, true) = true));


--
-- Name: gstt_dm_bang_kiem; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gstt_dm_bang_kiem ENABLE ROW LEVEL SECURITY;

--
-- Name: gstt_dm_bang_kiem gstt_dm_bang_kiem_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gstt_dm_bang_kiem_delete ON public.gstt_dm_bang_kiem FOR DELETE TO authenticated USING (public.fn_sys_has_permission('BANG_KIEM'::text, 'delete'::text));


--
-- Name: gstt_dm_bang_kiem gstt_dm_bang_kiem_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gstt_dm_bang_kiem_insert ON public.gstt_dm_bang_kiem FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('BANG_KIEM'::text, 'create'::text));


--
-- Name: gstt_dm_bang_kiem gstt_dm_bang_kiem_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gstt_dm_bang_kiem_select ON public.gstt_dm_bang_kiem FOR SELECT TO authenticated USING (public.fn_sys_has_permission('BANG_KIEM'::text, 'view'::text));


--
-- Name: gstt_dm_bang_kiem gstt_dm_bang_kiem_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gstt_dm_bang_kiem_update ON public.gstt_dm_bang_kiem FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('BANG_KIEM'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('BANG_KIEM'::text, 'edit'::text));


--
-- Name: gstt_fact_chung_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gstt_fact_chung_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: gstt_fact_gsc_dashboard_summary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gstt_fact_gsc_dashboard_summary ENABLE ROW LEVEL SECURITY;

--
-- Name: gstt_fact_gsc_violations_summary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gstt_fact_gsc_violations_summary ENABLE ROW LEVEL SECURITY;

--
-- Name: gstt_fact_vst; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gstt_fact_vst ENABLE ROW LEVEL SECURITY;

--
-- Name: gstt_fact_vst_moments_summary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gstt_fact_vst_moments_summary ENABLE ROW LEVEL SECURITY;

--
-- Name: gstt_fact_vst_opportunities_summary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gstt_fact_vst_opportunities_summary ENABLE ROW LEVEL SECURITY;

--
-- Name: gstt_fact_vst_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gstt_fact_vst_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: gstt_fact_vst_sessions_summary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gstt_fact_vst_sessions_summary ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_dm_khoa_phong; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mdm_dm_khoa_phong ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_dm_khoa_phong mdm_dm_khoa_phong_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_dm_khoa_phong_delete ON public.mdm_dm_khoa_phong FOR DELETE TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'delete'::text));


--
-- Name: mdm_dm_khoa_phong mdm_dm_khoa_phong_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_dm_khoa_phong_insert ON public.mdm_dm_khoa_phong FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('DANH_MUC'::text, 'create'::text));


--
-- Name: mdm_dm_khoa_phong mdm_dm_khoa_phong_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_dm_khoa_phong_select ON public.mdm_dm_khoa_phong FOR SELECT TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'view'::text));


--
-- Name: mdm_dm_khoa_phong mdm_dm_khoa_phong_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_dm_khoa_phong_update ON public.mdm_dm_khoa_phong FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('DANH_MUC'::text, 'edit'::text));


--
-- Name: mdm_nhan_su; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mdm_nhan_su ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_nhan_su mdm_nhan_su_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_nhan_su_delete ON public.mdm_nhan_su FOR DELETE TO authenticated USING (public.fn_sys_has_permission('NHAN_SU'::text, 'delete'::text));


--
-- Name: mdm_nhan_su mdm_nhan_su_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_nhan_su_insert ON public.mdm_nhan_su FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('NHAN_SU'::text, 'create'::text));


--
-- Name: mdm_nhan_su mdm_nhan_su_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_nhan_su_select ON public.mdm_nhan_su FOR SELECT TO authenticated USING (public.fn_sys_has_permission('NHAN_SU'::text, 'view'::text));


--
-- Name: mdm_nhan_su mdm_nhan_su_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_nhan_su_select_auth_v1 ON public.mdm_nhan_su FOR SELECT TO authenticated USING (true);


--
-- Name: mdm_nhan_su mdm_nhan_su_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_nhan_su_select_authenticated ON public.mdm_nhan_su FOR SELECT TO authenticated USING (true);


--
-- Name: mdm_nhan_su mdm_nhan_su_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_nhan_su_update ON public.mdm_nhan_su FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('NHAN_SU'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('NHAN_SU'::text, 'edit'::text));


--
-- Name: nkbv_dm_cdc_baseline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nkbv_dm_cdc_baseline ENABLE ROW LEVEL SECURITY;

--
-- Name: nkbv_fact_benh_an; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nkbv_fact_benh_an ENABLE ROW LEVEL SECURITY;

--
-- Name: nkbv_fact_mau_so_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nkbv_fact_mau_so_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: nkbv_fact_mau_so_phau_thuat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nkbv_fact_mau_so_phau_thuat ENABLE ROW LEVEL SECURITY;

--
-- Name: nkbv_fact_su_kien; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nkbv_fact_su_kien ENABLE ROW LEVEL SECURITY;

--
-- Name: nkbv_fact_vi_sinh; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nkbv_fact_vi_sinh ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_permissions permissions_admin_full_access_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY permissions_admin_full_access_v2 ON public.sys_permissions TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: sys_permissions permissions_select_all_authenticated_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY permissions_select_all_authenticated_v2 ON public.sys_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: qlcv_fact_cong_viec qlcv_delete_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qlcv_delete_service_role ON public.qlcv_fact_cong_viec FOR DELETE TO service_role USING (true);


--
-- Name: qlcv_fact_cong_viec; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qlcv_fact_cong_viec ENABLE ROW LEVEL SECURITY;

--
-- Name: qlcv_fact_cong_viec_dinh_ky; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky ENABLE ROW LEVEL SECURITY;

--
-- Name: qlcv_fact_cong_viec_hoat_dong; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qlcv_fact_cong_viec_hoat_dong ENABLE ROW LEVEL SECURITY;

--
-- Name: qlcv_fact_cong_viec_hoat_dong qlcv_hd_insert_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qlcv_hd_insert_service_role ON public.qlcv_fact_cong_viec_hoat_dong FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: qlcv_fact_cong_viec_hoat_dong qlcv_hd_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qlcv_hd_select_authenticated ON public.qlcv_fact_cong_viec_hoat_dong FOR SELECT TO authenticated USING (true);


--
-- Name: qlcv_fact_cong_viec_hoat_dong qlcv_hd_select_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qlcv_hd_select_service_role ON public.qlcv_fact_cong_viec_hoat_dong FOR SELECT TO service_role USING (true);


--
-- Name: qlcv_fact_cong_viec qlcv_insert_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qlcv_insert_service_role ON public.qlcv_fact_cong_viec FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: qlcv_fact_cong_viec qlcv_select_authenticated_own_khoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qlcv_select_authenticated_own_khoa ON public.qlcv_fact_cong_viec FOR SELECT TO authenticated USING (true);


--
-- Name: POLICY qlcv_select_authenticated_own_khoa ON qlcv_fact_cong_viec; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY qlcv_select_authenticated_own_khoa ON public.qlcv_fact_cong_viec IS 'Phase 1: permissive — enforcement ở application layer (Server Actions + verifyPermission). Phase 2: sẽ thêm strict khoa filter sau khi xác nhận khoa_id đầy đủ trong mdm_nhan_su.';


--
-- Name: qlcv_fact_cong_viec qlcv_select_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qlcv_select_service_role ON public.qlcv_fact_cong_viec FOR SELECT TO service_role USING (true);


--
-- Name: qlcv_fact_cong_viec qlcv_update_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qlcv_update_service_role ON public.qlcv_fact_cong_viec FOR UPDATE TO service_role USING (true) WITH CHECK (true);


--
-- Name: sys_role_permissions role_permissions_admin_full_access_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY role_permissions_admin_full_access_v2 ON public.sys_role_permissions TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: sys_role_permissions role_permissions_select_all_authenticated_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY role_permissions_select_all_authenticated_v2 ON public.sys_role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: sys_roles roles_admin_full_access_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_admin_full_access_v2 ON public.sys_roles TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: sys_roles roles_select_all_authenticated_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_select_all_authenticated_v2 ON public.sys_roles FOR SELECT TO authenticated USING (true);


--
-- Name: sys_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_audit_log sys_audit_log_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_audit_log_select_policy ON public.sys_audit_log FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM (public.sys_user_roles ur
     JOIN public.sys_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (upper(TRIM(BOTH FROM r.name)) = 'ADMIN'::text) AND (r.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM (((public.sys_user_roles ur
     JOIN public.sys_roles r ON ((ur.role_id = r.id)))
     JOIN public.sys_role_permissions rp ON ((r.id = rp.role_id)))
     JOIN public.sys_permissions p ON ((rp.permission_id = p.id)))
  WHERE ((ur.user_id = auth.uid()) AND (p.module_name = 'PHAN_QUYEN'::text) AND (p.action = 'view'::text) AND (r.is_active = true)))) OR (changed_by = auth.uid()) OR (changed_by IS NULL)));


--
-- Name: sys_lookup_value; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_lookup_value ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_lookup_value sys_lookup_value_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_lookup_value_delete ON public.sys_lookup_value FOR DELETE TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'delete'::text));


--
-- Name: sys_lookup_value sys_lookup_value_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_lookup_value_insert ON public.sys_lookup_value FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('DANH_MUC'::text, 'create'::text));


--
-- Name: sys_lookup_value sys_lookup_value_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_lookup_value_select ON public.sys_lookup_value FOR SELECT TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'view'::text));


--
-- Name: sys_lookup_value sys_lookup_value_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_lookup_value_update ON public.sys_lookup_value FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('DANH_MUC'::text, 'edit'::text));


--
-- Name: sys_mdm_registry; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_mdm_registry ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_mdm_registry sys_mdm_registry_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_mdm_registry_delete ON public.sys_mdm_registry FOR DELETE TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'delete'::text));


--
-- Name: sys_mdm_registry sys_mdm_registry_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_mdm_registry_insert ON public.sys_mdm_registry FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('DANH_MUC'::text, 'create'::text));


--
-- Name: sys_mdm_registry sys_mdm_registry_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_mdm_registry_select ON public.sys_mdm_registry FOR SELECT TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'view'::text));


--
-- Name: sys_mdm_registry sys_mdm_registry_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_mdm_registry_update ON public.sys_mdm_registry FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('DANH_MUC'::text, 'edit'::text));


--
-- Name: sys_mdm_suggestion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_mdm_suggestion ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_mdm_suggestion sys_mdm_suggestion_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_mdm_suggestion_delete ON public.sys_mdm_suggestion FOR DELETE TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'delete'::text));


--
-- Name: sys_mdm_suggestion sys_mdm_suggestion_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_mdm_suggestion_insert ON public.sys_mdm_suggestion FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('DANH_MUC'::text, 'create'::text));


--
-- Name: sys_mdm_suggestion sys_mdm_suggestion_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_mdm_suggestion_select ON public.sys_mdm_suggestion FOR SELECT TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'view'::text));


--
-- Name: sys_mdm_suggestion sys_mdm_suggestion_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_mdm_suggestion_update ON public.sys_mdm_suggestion FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('DANH_MUC'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('DANH_MUC'::text, 'edit'::text));


--
-- Name: sys_module_locks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_module_locks ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_module_locks sys_module_locks_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_module_locks_all ON public.sys_module_locks TO authenticated USING (true) WITH CHECK (true);


--
-- Name: sys_module_locks sys_module_locks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_module_locks_select ON public.sys_module_locks FOR SELECT TO authenticated USING (true);


--
-- Name: sys_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_permissions sys_permissions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_permissions_delete ON public.sys_permissions FOR DELETE TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'delete'::text));


--
-- Name: sys_permissions sys_permissions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_permissions_insert ON public.sys_permissions FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'create'::text));


--
-- Name: sys_permissions sys_permissions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_permissions_select ON public.sys_permissions FOR SELECT TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'view'::text));


--
-- Name: sys_permissions sys_permissions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_permissions_update ON public.sys_permissions FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'edit'::text));


--
-- Name: sys_role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_role_permissions sys_role_permissions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_role_permissions_delete ON public.sys_role_permissions FOR DELETE TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'delete'::text));


--
-- Name: sys_role_permissions sys_role_permissions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_role_permissions_insert ON public.sys_role_permissions FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'create'::text));


--
-- Name: sys_role_permissions sys_role_permissions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_role_permissions_select ON public.sys_role_permissions FOR SELECT TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'view'::text));


--
-- Name: sys_role_permissions sys_role_permissions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_role_permissions_update ON public.sys_role_permissions FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'edit'::text));


--
-- Name: sys_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_roles sys_roles_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_roles_delete ON public.sys_roles FOR DELETE TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'delete'::text));


--
-- Name: sys_roles sys_roles_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_roles_insert ON public.sys_roles FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'create'::text));


--
-- Name: sys_roles sys_roles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_roles_select ON public.sys_roles FOR SELECT TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'view'::text));


--
-- Name: sys_roles sys_roles_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_roles_update ON public.sys_roles FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'edit'::text));


--
-- Name: sys_user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_user_roles sys_user_roles_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_user_roles_delete ON public.sys_user_roles FOR DELETE TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'delete'::text));


--
-- Name: sys_user_roles sys_user_roles_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_user_roles_insert ON public.sys_user_roles FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'create'::text));


--
-- Name: sys_user_roles sys_user_roles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_user_roles_select ON public.sys_user_roles FOR SELECT TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'view'::text));


--
-- Name: sys_user_roles sys_user_roles_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sys_user_roles_update ON public.sys_user_roles FOR UPDATE TO authenticated USING (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'edit'::text)) WITH CHECK (public.fn_sys_has_permission('PHAN_QUYEN'::text, 'edit'::text));


--
-- Name: sys_user_roles user_roles_admin_full_access_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_admin_full_access_v2 ON public.sys_user_roles TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: sys_user_roles user_roles_self_or_admin_select_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_self_or_admin_select_v2 ON public.sys_user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin_user(auth.uid())));


--
-- Name: gstt_fact_vst_sessions vst_sessions_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vst_sessions_select_authenticated ON public.gstt_fact_vst_sessions FOR SELECT TO authenticated USING ((COALESCE(is_active, true) = true));


--
-- PostgreSQL database dump complete
--


