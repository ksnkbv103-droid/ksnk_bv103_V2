--
-- PostgreSQL database dump
--

\restrict bVSTD4AHEZEBKyJQxMJDfXR7pVoIVHNVt5l81DBeOBZh7iyMMlofxOd9sVvT1sj

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

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

CREATE SCHEMA public;


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
-- Name: fn_bv103_audit_row(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bv103_audit_row() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  v_id := coalesce(
    to_jsonb(NEW)->>'id',
    to_jsonb(OLD)->>'id'
  );
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    INSERT INTO public.fact_bv103_audit_log (table_name, record_id, action, old_data)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    INSERT INTO public.fact_bv103_audit_log (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old, v_new);
    RETURN NEW;
  ELSE
    v_new := to_jsonb(NEW);
    INSERT INTO public.fact_bv103_audit_log (table_name, record_id, action, new_data)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_new);
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: fn_fact_cong_viec_spawn_dinh_ky_hom_nay(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  inserted int := 0;
  r record;
  due date := CURRENT_DATE;
  match_due boolean;
  v_loai_id uuid;
  v_tt_moi_id uuid;
BEGIN
  SELECT id INTO v_loai_id FROM public.dm_loai_cong_viec WHERE ma = 'DINH_KY' LIMIT 1;
  SELECT id INTO v_tt_moi_id
  FROM public.dm_trang_thai_cong_viec
  WHERE ma = 'MOI'
  LIMIT 1;

  FOR r IN SELECT * FROM public.fact_cong_viec_dinh_ky WHERE is_active = true LOOP
    match_due := false;
    IF r.ma_chu_ky = 'WEEKLY' THEN
      match_due := (r.ngay_bat_dau <= due) AND mod((due - r.ngay_bat_dau)::integer, 7) = 0;
    ELSE
      match_due := (r.ngay_bat_dau <= due)
        AND extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
    END IF;
    IF NOT match_due THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM public.fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id AND c.han_hoan_thanh = due
    ) THEN CONTINUE; END IF;

    INSERT INTO public.fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec_id, trang_thai_id, muc_do_uu_tien, han_hoan_thanh,
      nguoi_phu_trach_id, khoa_thuc_hien_id, to_cong_tac_id, dinh_ky_mau_id,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active
    ) VALUES (
      r.tieu_de, r.mo_ta, v_loai_id, v_tt_moi_id, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      r.nguoi_phu_trach_id, r.khoa_thuc_hien_id, r.to_cong_tac_id, r.id,
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$$;


--
-- Name: FUNCTION fn_fact_cong_viec_spawn_dinh_ky_hom_nay(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() IS 'Sinh fact_cong_viec cho mẫu định kỳ active; idempotent theo (dinh_ky_mau_id, han_hoan_thanh). Gọi hàng ngày (pg_cron / Edge).';


--
-- Name: fn_qlcv_tong_hop_thang(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_qlcv_tong_hop_thang(p_thang date) RETURNS TABLE(nhan_su_id uuid, ho_ten text, phieu_trong_thang bigint, hoan_thanh_trong_thang bigint, dung_han bigint, on_time_pct numeric, completion_pct numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH bounds AS (
    SELECT
      date_trunc('month', p_thang::timestamp)::date AS ms_date,
      (date_trunc('month', p_thang::timestamp) + interval '1 month')::date AS me_date,
      date_trunc('month', p_thang::timestamp)::timestamptz AS ms_tz,
      (date_trunc('month', p_thang::timestamp) + interval '1 month')::timestamptz AS me_tz
  ),
  roots AS (
    SELECT
      cv.*,
      b.ms_tz,
      b.me_tz
    FROM public.fact_cong_viec cv
    CROSS JOIN bounds b
    WHERE cv.cong_viec_cha_id IS NULL
      AND cv.nguoi_phu_trach_id IS NOT NULL
      AND (
        (cv.created_at >= b.ms_tz AND cv.created_at < b.me_tz)
        OR (cv.updated_at >= b.ms_tz AND cv.updated_at < b.me_tz)
        OR (
          cv.han_hoan_thanh IS NOT NULL
          AND cv.han_hoan_thanh >= b.ms_date
          AND cv.han_hoan_thanh < b.me_date
        )
      )
  ),
  agg AS (
    SELECT
      r.nguoi_phu_trach_id AS sid,
      count(*)::bigint AS phieu_trong_thang,
      count(*) FILTER (
        WHERE r.trang_thai = 'HOAN_THANH'
          AND r.updated_at >= r.ms_tz
          AND r.updated_at < r.me_tz
      )::bigint AS hoan_thanh_trong_thang,
      count(*) FILTER (
        WHERE r.trang_thai = 'HOAN_THANH'
          AND r.updated_at >= r.ms_tz
          AND r.updated_at < r.me_tz
          AND (r.han_hoan_thanh IS NULL OR r.updated_at::date <= r.han_hoan_thanh)
      )::bigint AS dung_han
    FROM roots r
    GROUP BY r.nguoi_phu_trach_id
  )
  SELECT
    a.sid AS nhan_su_id,
    coalesce(ns.ho_ten, '')::text AS ho_ten,
    a.phieu_trong_thang,
    a.hoan_thanh_trong_thang,
    a.dung_han,
    CASE
      WHEN a.hoan_thanh_trong_thang > 0 THEN round(100.0 * a.dung_han / a.hoan_thanh_trong_thang, 2)
      ELSE 0::numeric
    END AS on_time_pct,
    CASE
      WHEN a.phieu_trong_thang > 0 THEN round(100.0 * a.hoan_thanh_trong_thang / a.phieu_trong_thang, 2)
      ELSE 0::numeric
    END AS completion_pct
  FROM agg a
  LEFT JOIN public.mdm_nhan_su ns ON ns.id = a.sid
  WHERE a.phieu_trong_thang > 0
  ORDER BY completion_pct DESC NULLS LAST, on_time_pct DESC NULLS LAST, ho_ten ASC;
$$;


--
-- Name: FUNCTION fn_qlcv_tong_hop_thang(p_thang date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_qlcv_tong_hop_thang(p_thang date) IS 'QLCV: KPI tháng theo người phụ trách — chỉ phiếu gốc; phạm vi = tạo/cập nhật/hạn trong tháng.';


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
  FROM public.dm_roles
  WHERE name = p_role_name AND is_active = true
  LIMIT 1;
  IF v_target_role_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Vai trò mục tiêu không tồn tại hoặc đã ngưng hoạt động.');
  END IF;

  -- Chỉ xóa nhóm vai trò KSNK hệ thống, không đụng các role ngoài phạm vi.
  SELECT ARRAY_AGG(id) INTO v_ksnk_role_ids
  FROM public.dm_roles
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
  FROM public.dm_bang_kiem d
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
    FROM public.fact_giam_sat_chung_sessions
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
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
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
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_phien', so_phien)) INTO v_supervision_sources FROM sources;

  -- Các phần khác giữ nguyên (by_khoa, trend, vi phạm...)
  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY date_trunc('month', s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.fact_giam_sat_chung_results r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered_sessions s ON r.session_id = s.id
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
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.dm_bang_kiem bk ON bk.id = s.bang_kiem_id
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
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
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    WHERE s.loai_bang_kiem = v_ma_bk;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb)
    INTO v_khoa
    FROM (
      SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
      LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
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
      LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
      LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2 ORDER BY 3 DESC
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_khu FROM (
      SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
             count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
      LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2 ORDER BY 3 DESC
    ) t;

    SELECT coalesce(jsonb_agg(t ORDER BY min_date), '[]'::jsonb) INTO v_trend FROM (
      SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') AS label, min(ngay_giam_sat) AS min_date, count(r.id) AS tong,
             count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_violation FROM (
      SELECT tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') AS so_vi_pham, count(r.id) AS tong_quan_sat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le_vi_pham
      FROM public.fact_giam_sat_chung_results r
      JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id
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
      FROM public.dm_khoa_phong k
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
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
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
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
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
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_phien', so_phien)) INTO v_supervision_sources FROM sources;

  -- Thống kê tham gia (Cơ cấu nguồn)
  WITH participation AS (
    SELECT k.id, k.ten_khoa as ten, count(DISTINCT s.id) as so_phien
    FROM public.dm_khoa_phong k
    LEFT JOIN public.fact_giam_sat_chung_sessions s ON k.id = s.khoa_id 
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
    FROM filtered_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY date_trunc('month', s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.fact_giam_sat_chung_results r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered_sessions s ON r.session_id = s.id
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
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.dm_bang_kiem bk ON bk.id = s.bang_kiem_id
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
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
  LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id;

  SELECT jsonb_agg(t) INTO v_khoa FROM (
    SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 5 DESC LIMIT 50
  ) t;

  SELECT jsonb_agg(t) INTO v_nghe FROM (
    SELECT coalesce(n.id, md5(coalesce(n.ten_nghe_nghiep, 'unknown'))::uuid) AS id, coalesce(n.ten_nghe_nghiep, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_khu FROM (
    SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') AS label, min(ngay_giam_sat) AS min_date, count(r.id) AS tong,
           count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1
  ) t;

  SELECT jsonb_agg(t) INTO v_violation FROM (
    SELECT tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') AS so_vi_pham, count(r.id) AS tong_quan_sat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le_vi_pham
    FROM public.fact_giam_sat_chung_results r
    JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id
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
    FROM public.dm_khoa_phong k
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
-- Name: rpc_get_dashboard_khoa_overview_rows(date, date, uuid[], uuid[], uuid[], uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_dashboard_khoa_overview_rows(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[]) RETURNS jsonb
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
  vst_s0 AS (
    SELECT
      s.id,
      s.khoa_id,
      s.khu_vuc_id,
      ns.khoa_id AS ns_khoa_id,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
        WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
             OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
  ),
  vst_o AS (
    SELECT
      d.session_id,
      COALESCE(d.khoa_id, s.khoa_id) AS eff_khoa
    FROM public.fact_giam_sat_vst d
    JOIN vst_s0 s ON d.session_id = s.id
    WHERE (p_khoa_ids IS NULL OR COALESCE(d.khoa_id, s.khoa_id) = ANY (p_khoa_ids))
      AND (
        p_khoi_ids IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.dm_khoa_phong ke
          WHERE ke.id = COALESCE(d.khoa_id, s.khoa_id)
            AND ke.khoi_id IS NOT NULL
            AND ke.khoi_id = ANY (p_khoi_ids)
        )
      )
      AND (
        p_nghe_nghiep_ids IS NULL
        OR d.nghe_nghiep_id = ANY (p_nghe_nghiep_ids)
      )
  ),
  vst_co_k AS (
    SELECT o.eff_khoa AS khoa_id, s.stype, count(*)::bigint AS n
    FROM vst_o o
    JOIN vst_s0 s ON o.session_id = s.id
    GROUP BY 1, 2
  ),
  vst_co_tu AS (
    SELECT khoa_id, n FROM vst_co_k WHERE stype = 'TU_GIAM_SAT'
  ),
  vst_ph_k AS (
    SELECT
      COALESCE(s.khoa_id, s.ns_khoa_id) AS khoa_id,
      s.stype,
      count(DISTINCT s.id)::bigint AS n
    FROM vst_s0 s
    WHERE EXISTS (SELECT 1 FROM vst_o o WHERE o.session_id = s.id)
      AND (p_khoa_ids IS NULL OR COALESCE(s.khoa_id, s.ns_khoa_id) = ANY (p_khoa_ids))
    GROUP BY 1, 2
  ),
  vst_ph_tu AS (
    SELECT khoa_id, n FROM vst_ph_k WHERE stype = 'TU_GIAM_SAT'
  ),
  gsc_s AS (
    SELECT
      COALESCE(s.khoa_id, ns.khoa_id) AS roll_khoa_id,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
        WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
             OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
  ),
  gsc_tu AS (
    SELECT roll_khoa_id AS khoa_id, count(*)::bigint AS n
    FROM gsc_s
    WHERE roll_khoa_id IS NOT NULL AND stype = 'TU_GIAM_SAT'
    GROUP BY roll_khoa_id
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
      LEFT JOIN public.dm_khoa_phong k ON ns.khoa_id = k.id
      WHERE COALESCE(ns.is_active, true)
        AND (
          (
            k.id IS NOT NULL
            AND (k.ma_khoa IN ('KSNK', 'C18') OR k.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
          )
          OR (
            NULLIF(btrim(COALESCE(ns.vai_tro_he_thong_ksnk, '')), '') IS NOT NULL
            AND (
              upper(ns.vai_tro_he_thong_ksnk) LIKE '%KSNK%'
              OR upper(ns.vai_tro_he_thong_ksnk) LIKE '%NHAN_VIEN%'
              OR upper(ns.vai_tro_he_thong_ksnk) LIKE '%MANG_LUOI%'
              OR upper(ns.vai_tro_he_thong_ksnk) LIKE '%TO_TRUONG%'
              OR upper(ns.vai_tro_he_thong_ksnk) LIKE '%THANH_VIEN%'
              OR ns.vai_tro_he_thong_ksnk ILIKE '%Kiểm soát%'
              OR lower(unaccent(COALESCE(ns.vai_tro_he_thong_ksnk, ''))) LIKE '%kiem soat%'
            )
          )
        )
      ORDER BY ns.id
    ),
    vst_sess0 AS (
      SELECT
        s.id,
        s.khoa_id,
        s.khu_vuc_id,
        s.nguoi_giam_sat_id
      FROM public.fact_giam_sat_vst_sessions s
      LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
      WHERE s.is_active = true
        AND s.ngay_giam_sat >= p_tu_ngay
        AND s.ngay_giam_sat <= p_den_ngay
        AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
        AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    ),
    vst_opp AS (
      SELECT
        d.id,
        d.session_id,
        s.nguoi_giam_sat_id
      FROM public.fact_giam_sat_vst d
      INNER JOIN vst_sess0 s ON d.session_id = s.id AND s.nguoi_giam_sat_id IS NOT NULL
      INNER JOIN ksnk_staff ks ON ks.id = s.nguoi_giam_sat_id
      WHERE (p_khoa_ids IS NULL OR COALESCE(d.khoa_id, s.khoa_id) = ANY (p_khoa_ids))
        AND (
          p_khoi_ids IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.dm_khoa_phong ke
            WHERE ke.id = COALESCE(d.khoa_id, s.khoa_id)
              AND ke.khoi_id IS NOT NULL
              AND ke.khoi_id = ANY (p_khoi_ids)
          )
        )
        AND (
          p_nghe_nghiep_ids IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.dm_nghe_nghiep nn
            WHERE nn.id = ANY (p_nghe_nghiep_ids)
              AND nn.is_active IS NOT FALSE
              AND d.nghe_nghiep IS NOT NULL
              AND btrim(d.nghe_nghiep) <> ''
              AND nn.ten_nghe_nghiep = d.nghe_nghiep
          )
        )
    ),
    vst_agg AS (
      SELECT
        o.nguoi_giam_sat_id AS ns_id,
        count(*)::bigint AS so_co_hoi_vst,
        count(DISTINCT o.session_id)::bigint AS so_phien_vst
      FROM vst_opp o
      GROUP BY 1
    ),
    gsc_sess AS (
      SELECT s.id, s.nguoi_giam_sat_id
      FROM public.fact_giam_sat_chung_sessions s
      LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
      INNER JOIN ksnk_staff ks ON ks.id = s.nguoi_giam_sat_id
      WHERE s.is_active = true
        AND s.ngay_giam_sat >= p_tu_ngay
        AND s.ngay_giam_sat <= p_den_ngay
        AND s.nguoi_giam_sat_id IS NOT NULL
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
        AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
        AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
        AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    ),
    gsc_agg AS (
      SELECT g.nguoi_giam_sat_id AS ns_id, count(*)::bigint AS so_phien_gsc
      FROM gsc_sess g
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
  SELECT 'VST_WHO'::text AS ma_bk, 'Vệ sinh tay (WHO)'::text AS ten_bk,
         CASE
           WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
           WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
                OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
           ELSE 'CHEO'
         END AS stype
  FROM public.fact_giam_sat_vst_sessions s
  LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
  LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
  LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
  WHERE s.is_active = true
    AND s.ngay_giam_sat >= p_tu_ngay
    AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))

  UNION ALL

  SELECT coalesce(nullif(btrim(dbk.ma_bk), ''), 'UNKNOWN') AS ma_bk,
         coalesce(dbk.ten_bang_kiem, 'Không rõ') AS ten_bk,
         CASE
           WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
           WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
                OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
           ELSE 'CHEO'
         END AS stype
  FROM public.fact_giam_sat_chung_sessions s
  LEFT JOIN public.dm_bang_kiem dbk ON dbk.id = s.bang_kiem_id
  LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
  LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
  LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
  WHERE s.is_active = true
    AND s.ngay_giam_sat >= p_tu_ngay
    AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids));

  SELECT jsonb_agg(t)
  INTO v_result
  FROM (
    SELECT ma_bk, ten_bk, count(*) AS tong, count(*) FILTER (WHERE stype = 'KSNK') AS ksnk,
           count(*) FILTER (WHERE stype = 'TU_GIAM_SAT') AS tu_gs, count(*) FILTER (WHERE stype = 'CHEO') AS cheo
    FROM _all_sess
    GROUP BY ma_bk, ten_bk
    ORDER BY tong DESC
  ) t;

  RETURN coalesce(v_result, '[]'::jsonb);
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
        v_result := v_result || jsonb_build_object('KHOA_PHONG', (SELECT json_agg(t) FROM (SELECT id, ten_khoa as ten, ma_khoa as ma FROM public.dm_khoa_phong WHERE is_active = true ORDER BY ten_khoa) t));
      WHEN 'NGHE_NGHIEP' THEN
        v_result := v_result || jsonb_build_object('NGHE_NGHIEP', (SELECT json_agg(t) FROM (SELECT id, ten_nghe_nghiep as ten, ma_nghe_nghiep as ma FROM public.dm_nghe_nghiep WHERE is_active = true ORDER BY ten_nghe_nghiep) t));
      WHEN 'CHUC_VU' THEN
        v_result := v_result || jsonb_build_object('CHUC_VU', (SELECT json_agg(t) FROM (SELECT id, ten_chuc_vu as ten FROM public.dm_chuc_vu WHERE is_active = true ORDER BY ten_chuc_vu) t));
      WHEN 'TO_CONG_TAC' THEN
        v_result := v_result || jsonb_build_object('TO_CONG_TAC', (SELECT json_agg(t) FROM (SELECT id, ten_to as ten FROM public.dm_to_cong_tac WHERE is_active = true ORDER BY ten_to) t));
      WHEN 'CHUC_DANH' THEN
        v_result := v_result || jsonb_build_object('CHUC_DANH', (SELECT json_agg(t) FROM (SELECT id, ten_chuc_danh as ten FROM public.dm_chuc_danh WHERE is_active = true ORDER BY ten_chuc_danh) t));
      WHEN 'ROLE' THEN
        v_result := v_result || jsonb_build_object('ROLE', (SELECT json_agg(t) FROM (SELECT id, name as ten FROM public.dm_roles ORDER BY name) t));
      WHEN 'LOAI_DUNG_CU' THEN
        v_result := v_result || jsonb_build_object('LOAI_DUNG_CU', (SELECT json_agg(t) FROM (SELECT id, ten_loai_dung_cu as ten, ma_loai_dung_cu as ma FROM public.dm_loai_dung_cu WHERE is_active = true ORDER BY ten_loai_dung_cu) t));
      WHEN 'BO_DUNG_CU' THEN
        v_result := v_result || jsonb_build_object('BO_DUNG_CU', (SELECT json_agg(t) FROM (SELECT id, ten_bo as ten, ma_bo as ma FROM public.dm_bo_dung_cu WHERE is_active = true ORDER BY ten_bo) t));
      WHEN 'KHU_VUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('KHU_VUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_khu_vuc as ten, ma_khu_vuc as ma FROM public.dm_khu_vuc_giam_sat WHERE is_active = true ORDER BY ten_khu_vuc) t));
      WHEN 'HINH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('HINH_THUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_hinh_thuc as ten, ma_hinh_thuc as ma FROM public.dm_hinh_thuc_giam_sat WHERE is_active = true ORDER BY ten_hinh_thuc) t));
      WHEN 'CACH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('CACH_THUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_cach_thuc as ten, ma_cach_thuc as ma FROM public.dm_cach_thuc_giam_sat WHERE is_active = true ORDER BY ten_cach_thuc) t));
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
    AS $$
DECLARE
  v_result JSONB;
  v_kpis JSONB;
  v_monthly JSONB;
  v_by_khoa JSONB;
  v_by_nghe JSONB;
  v_by_khu_vuc JSONB;
  v_by_hanh_dong JSONB;
  v_moment_missed JSONB;
  v_moment_good JSONB;
  v_error_breakdown JSONB;
BEGIN
  -- 1. Tính KPI tổng quát
  WITH stats AS (
    SELECT 
      count(DISTINCT s.id) as tong_phien,
      count(o.id) as tong_co_hoi,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as da_tuan_thu,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) = 'bo sot') as bo_sot
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
  )
  SELECT jsonb_build_object(
    'tong_phien', tong_phien,
    'tong_co_hoi', tong_co_hoi,
    'da_tuan_thu', da_tuan_thu,
    'bo_sot', bo_sot,
    'ty_le_tuan_thu', CASE WHEN tong_co_hoi > 0 THEN ROUND((da_tuan_thu * 100.0) / tong_co_hoi) ELSE 0 END
  ) INTO v_kpis FROM stats;

  -- 2. Thống kê theo tháng
  WITH monthly_stats AS (
    SELECT 
      TO_CHAR(date_trunc('month', s.ngay_giam_sat), 'YYYY-MM') as ky,
      count(DISTINCT s.id) as so_phien,
      count(o.id) as so_co_hoi,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
    GROUP BY 1
    ORDER BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'ky', ky,
    'label', RIGHT(ky, 2) || '/' || LEFT(ky, 4),
    'so_phien', so_phien,
    'so_co_hoi', so_co_hoi,
    'ty_le', CASE WHEN so_co_hoi > 0 THEN ROUND((dat * 100.0) / so_co_hoi) ELSE 0 END
  )) INTO v_monthly FROM monthly_stats;

  -- 3. Thống kê theo Khoa
  WITH khoa_stats AS (
    SELECT 
      k.ten_khoa as ten,
      count(o.id) as tong,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'ten', ten,
    'dat', dat,
    'tong', tong,
    'ty_le', CASE WHEN tong > 0 THEN ROUND((dat * 100.0) / tong, 1) ELSE 0 END
  )) INTO v_by_khoa FROM khoa_stats;

  -- 4. Thống kê theo Nghề nghiệp
  WITH nghe_stats AS (
    SELECT 
      COALESCE(o.nghe_nghiep, 'Không rõ') as ten,
      count(o.id) as tong,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'ten', ten,
    'dat', dat,
    'tong', tong,
    'ty_le', CASE WHEN tong > 0 THEN ROUND((dat * 100.0) / tong, 1) ELSE 0 END
  )) INTO v_by_nghe FROM nghe_stats;

  -- 5. Thống kê lỗi kỹ thuật/thời gian
  SELECT jsonb_build_object(
    'loi_ky_thuat', count(o.id) FILTER (WHERE o.dung_ky_thuat = false),
    'loi_thoi_gian', count(o.id) FILTER (WHERE o.du_thoi_gian = false),
    'lam_dung_gang', count(o.id) FILTER (WHERE o.co_deo_gang = true),
    'du_thoi_gian_dat', count(o.id) FILTER (WHERE o.du_thoi_gian = true)
  ) INTO v_error_breakdown
  FROM public.fact_giam_sat_vst_sessions s
  JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND s.is_active = true;

  -- Gom kết quả
  v_result := jsonb_build_object(
    'tu_ngay', p_tu_ngay,
    'den_ngay', p_den_ngay,
    'kpis', v_kpis,
    'monthly', COALESCE(v_monthly, '[]'::jsonb),
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb),
    'by_doi_tuong', COALESCE(v_by_nghe, '[]'::jsonb),
    'error_breakdown', v_error_breakdown
  );

  RETURN v_result;
END;
$$;


--
-- Name: rpc_get_vst_dashboard_v2(date, date, uuid[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_vst_dashboard_v2(p_tu_ngay date, p_den_ngay date, p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_trend_type text DEFAULT 'month'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
  v_kpis JSONB;
  v_trend JSONB;
  v_by_khoa JSONB;
  v_by_nghe JSONB;
  v_by_khu_vuc JSONB;
  v_moment_missed JSONB;
  v_moment_good JSONB;
  v_error_breakdown JSONB;
  v_glove_abuse_by_moment JSONB;
BEGIN
  -- 1. Tính KPI tổng quát
  WITH stats AS (
    SELECT 
      count(DISTINCT s.id) as tong_phien,
      count(o.id) as tong_co_hoi,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as da_tuan_thu,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) = 'bo sot') as bo_sot
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
  )
  SELECT jsonb_build_object(
    'tong_phien', tong_phien,
    'tong_co_hoi', tong_co_hoi,
    'da_tuan_thu', da_tuan_thu,
    'bo_sot', bo_sot,
    'ty_le_tuan_thu', CASE WHEN tong_co_hoi > 0 THEN ROUND((da_tuan_thu * 100.0) / tong_co_hoi, 1) ELSE 0 END
  ) INTO v_kpis FROM stats;

  -- 2. Thống kê xu hướng (Trend)
  WITH trend_stats AS (
    SELECT 
      CASE 
        WHEN p_trend_type = 'day' THEN TO_CHAR(date_trunc('day', s.ngay_giam_sat), 'YYYY-MM-DD')
        WHEN p_trend_type = 'week' THEN TO_CHAR(date_trunc('week', s.ngay_giam_sat), 'IYYY-IW')
        ELSE TO_CHAR(date_trunc('month', s.ngay_giam_sat), 'YYYY-MM')
      END as ky,
      CASE 
        WHEN p_trend_type = 'day' THEN TO_CHAR(date_trunc('day', s.ngay_giam_sat), 'DD/MM')
        WHEN p_trend_type = 'week' THEN 'Tuần ' || TO_CHAR(date_trunc('week', s.ngay_giam_sat), 'IW')
        ELSE RIGHT(TO_CHAR(date_trunc('month', s.ngay_giam_sat), 'YYYY-MM'), 2) || '/' || LEFT(TO_CHAR(date_trunc('month', s.ngay_giam_sat), 'YYYY-MM'), 4)
      END as label,
      count(o.id) as so_co_hoi,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
    GROUP BY 1, 2
    ORDER BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'ky', ky,
    'label', label,
    'so_co_hoi', so_co_hoi,
    'ty_le', CASE WHEN so_co_hoi > 0 THEN ROUND((dat * 100.0) / so_co_hoi, 1) ELSE 0 END
  )) INTO v_trend FROM trend_stats;

  -- 3. Thống kê theo Khoa (So sánh)
  WITH khoa_stats AS (
    SELECT 
      k.ten_khoa as ten,
      count(o.id) as tong,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
    GROUP BY 1
    ORDER BY count(o.id) DESC
  )
  SELECT jsonb_agg(jsonb_build_object(
    'ten', ten,
    'dat', dat,
    'tong', tong,
    'ty_le', CASE WHEN tong > 0 THEN ROUND((dat * 100.0) / tong, 1) ELSE 0 END
  )) INTO v_by_khoa FROM khoa_stats;

  -- 4. Thống kê theo Nghề nghiệp (So sánh đối tượng)
  WITH nghe_stats AS (
    SELECT 
      COALESCE(o.nghe_nghiep, 'Không rõ') as ten,
      count(o.id) as tong,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
    GROUP BY 1
    ORDER BY count(o.id) DESC
  )
  SELECT jsonb_agg(jsonb_build_object(
    'ten', ten,
    'dat', dat,
    'tong', tong,
    'ty_le', CASE WHEN tong > 0 THEN ROUND((dat * 100.0) / tong, 1) ELSE 0 END
  )) INTO v_by_nghe FROM nghe_stats;

  -- 5. Lỗi kỹ thuật / Thời gian / Lạm dụng găng (Error Breakdown)
  -- Phân tích sâu: % đúng kỹ thuật, % đủ thời gian TÍNH TRÊN SỐ CA CÓ TUÂN THỦ
  WITH error_stats AS (
    SELECT
      count(o.id) as tong_co_hoi,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as so_ca_tuan_thu,
      count(o.id) FILTER (WHERE o.dung_ky_thuat = false) as loi_ky_thuat,
      count(o.id) FILTER (WHERE o.du_thoi_gian = false) as loi_thoi_gian,
      count(o.id) FILTER (WHERE o.co_deo_gang = true) as lam_dung_gang,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND o.dung_ky_thuat = true) as dung_ky_thuat_dat,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND o.du_thoi_gian = true) as du_thoi_gian_dat
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
  )
  SELECT jsonb_build_object(
    'loi_ky_thuat', loi_ky_thuat,
    'loi_thoi_gian', loi_thoi_gian,
    'lam_dung_gang', lam_dung_gang,
    'ty_le_lam_dung_gang', CASE WHEN tong_co_hoi > 0 THEN ROUND((lam_dung_gang * 100.0) / tong_co_hoi, 1) ELSE 0 END,
    'ty_le_dung_ky_thuat', CASE WHEN so_ca_tuan_thu > 0 THEN ROUND((dung_ky_thuat_dat * 100.0) / so_ca_tuan_thu, 1) ELSE 0 END,
    'ty_le_du_thoi_gian', CASE WHEN so_ca_tuan_thu > 0 THEN ROUND((du_thoi_gian_dat * 100.0) / so_ca_tuan_thu, 1) ELSE 0 END
  ) INTO v_error_breakdown FROM error_stats;

  -- 6. Thời điểm bỏ sót (Kém nhất)
  WITH missed AS (
    SELECT 
      COALESCE(o.thoi_diem, 'Không rõ') as ten,
      count(o.id) as so_lan
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND LOWER(UNACCENT(o.hanh_dong)) = 'bo sot'
      AND s.is_active = true
    GROUP BY 1
    ORDER BY 2 DESC
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_lan', so_lan)) INTO v_moment_missed FROM missed;

  -- 7. Thời điểm lạm dụng găng (Khi không tuân thủ)
  WITH glove_abuse AS (
    SELECT 
      COALESCE(o.thoi_diem, 'Không rõ') as ten,
      count(o.id) as so_lan
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND o.co_deo_gang = true
      AND LOWER(UNACCENT(o.hanh_dong)) = 'bo sot'
      AND s.is_active = true
    GROUP BY 1
    ORDER BY 2 DESC
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_lan', so_lan)) INTO v_glove_abuse_by_moment FROM glove_abuse;

  -- Gom kết quả
  v_result := jsonb_build_object(
    'tu_ngay', p_tu_ngay,
    'den_ngay', p_den_ngay,
    'kpis', v_kpis,
    'trend', COALESCE(v_trend, '[]'::jsonb),
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb),
    'by_doi_tuong', COALESCE(v_by_nghe, '[]'::jsonb),
    'by_khu_vuc', '[]'::jsonb, -- Dữ liệu khu vực có thể add sau nếu table hỗ trợ
    'error_breakdown', v_error_breakdown,
    'moment_missed', COALESCE(v_moment_missed, '[]'::jsonb),
    'glove_abuse_by_moment', COALESCE(v_glove_abuse_by_moment, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;


--
-- Name: rpc_get_vst_dashboard_v2(date, date, uuid[], uuid[], text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_vst_dashboard_v2(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_trend_type text DEFAULT 'month'::text, p_supervision_type text DEFAULT 'ALL'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_kpis JSONB;
  v_trend JSONB;
  v_by_khoa JSONB;
  v_by_nghe JSONB;
  v_by_khu_vuc JSONB;
  v_moment_missed JSONB;
  v_glove_abuse_by_moment JSONB;
  v_supervision_sources JSONB;
  v_participation JSONB;
  v_error_breakdown JSONB;
BEGIN
  WITH base_sessions AS (
    SELECT s.id, s.khoa_id, s.ngay_giam_sat, s.nguoi_giam_sat_id,
           CASE 
             WHEN (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND NOT (k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_target.ma_khoa = 'KSNK') THEN 'KSNK'
             WHEN ((k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND (k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_target.ma_khoa = 'KSNK'))
                  OR (NOT (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
             ELSE 'CHEO'
           END as calc_supervision_type,
           CASE 
             WHEN (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND NOT (k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_target.ma_khoa = 'KSNK') THEN 'Khoa KSNK'
             WHEN ((k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND (k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_target.ma_khoa = 'KSNK'))
                  OR (NOT (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND s.khoa_id = ns.khoa_id) THEN 'Tự giám sát'
             ELSE 'Giám sát chéo'
           END as calc_source_name
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_target ON s.khoa_id = k_target.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_target.khoi_id = ANY(p_khoi_ids))
  ),
  final_sessions AS (
    SELECT * FROM base_sessions
    WHERE (p_supervision_type = 'ALL' OR calc_supervision_type = p_supervision_type)
  )
  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT s.id),
    'tong_co_hoi', count(o.id),
    'da_tuan_thu', count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')),
    'bo_sot', count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) = 'bo sot'),
    'ty_le_tuan_thu', CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(o.id), 1) ELSE 0 END
  ) INTO v_kpis FROM final_sessions s LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT ky, ky as label, so_co_hoi, CASE WHEN so_co_hoi > 0 THEN ROUND((dat * 100.0) / so_co_hoi, 1) ELSE 0 END as ty_le
    FROM (
      SELECT CASE WHEN p_trend_type = 'day' THEN TO_CHAR(s.ngay_giam_sat, 'YYYY-MM-DD') ELSE TO_CHAR(s.ngay_giam_sat, 'YYYY-MM') END as ky, count(o.id) as so_co_hoi, count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
      FROM final_sessions s LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id GROUP BY 1 ORDER BY 1
    ) sub
  ) t;

  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, count(o.id) as tong, count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat, CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(o.id), 1) ELSE 0 END as ty_le
    FROM final_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_by_nghe FROM (
    SELECT COALESCE(o.nghe_nghiep, 'Không rõ') as ten, count(o.id) as tong, count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat, CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(o.id), 1) ELSE 0 END as ty_le
    FROM final_sessions s JOIN public.fact_giam_sat_vst o ON s.id = o.session_id GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_moment_missed FROM (
    SELECT COALESCE(o.thoi_diem, 'Không rõ') as ten, count(o.id) as so_lan
    FROM final_sessions s JOIN public.fact_giam_sat_vst o ON s.id = o.session_id WHERE LOWER(UNACCENT(o.hanh_dong)) = 'bo sot' GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_glove_abuse_by_moment FROM (
    SELECT COALESCE(o.thoi_diem, 'Không rõ') as ten, count(o.id) as so_lan
    FROM final_sessions s JOIN public.fact_giam_sat_vst o ON s.id = o.session_id WHERE o.co_deo_gang = true AND LOWER(UNACCENT(o.hanh_dong)) = 'bo sot' GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_build_object(
    'loi_ky_thuat', count(o.id) FILTER (WHERE o.dung_ky_thuat = false),
    'loi_thoi_gian', count(o.id) FILTER (WHERE o.du_thoi_gian = false),
    'lam_dung_gang', count(o.id) FILTER (WHERE o.co_deo_gang = true AND LOWER(UNACCENT(o.hanh_dong)) = 'bo sot'),
    'ty_le_lam_dung_gang', CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE o.co_deo_gang = true AND LOWER(UNACCENT(o.hanh_dong)) = 'bo sot') * 100.0) / count(o.id), 1) ELSE 0 END,
    'ty_le_dung_ky_thuat', CASE WHEN count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND o.dung_ky_thuat = true) * 100.0) / count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')), 1) ELSE 0 END,
    'ty_le_du_thoi_gian', CASE WHEN count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND o.du_thoi_gian = true) * 100.0) / count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')), 1) ELSE 0 END
  ) INTO v_error_breakdown FROM final_sessions s LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id;

  WITH sources AS (
    SELECT calc_source_name as ten, count(DISTINCT id) as so_phien FROM final_sessions GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_phien', so_phien)) INTO v_supervision_sources FROM sources;

  WITH part AS (
    SELECT k.id, k.ten_khoa as ten, count(DISTINCT s.id) as so_phien
    FROM public.dm_khoa_phong k
    LEFT JOIN final_sessions s ON k.id = s.khoa_id AND s.calc_supervision_type = 'TU_GIAM_SAT'
    WHERE (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_khoa_ids IS NULL OR k.id = ANY(p_khoa_ids))
    GROUP BY 1, 2
  )
  SELECT jsonb_agg(jsonb_build_object('id', id, 'ten', ten, 'so_phien', so_phien)) INTO v_participation FROM part;

  RETURN jsonb_build_object(
    'tu_ngay', p_tu_ngay, 'den_ngay', p_den_ngay, 'kpis', v_kpis, 
    'trend', COALESCE(v_trend, '[]'::jsonb), 
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb), 
    'by_doi_tuong', COALESCE(v_by_nghe, '[]'::jsonb), 
    'by_khu_vuc', '[]'::jsonb, 
    'moment_missed', COALESCE(v_moment_missed, '[]'::jsonb), 
    'glove_abuse_by_moment', COALESCE(v_glove_abuse_by_moment, '[]'::jsonb), 
    'supervision_sources', COALESCE(v_supervision_sources, '[]'::jsonb), 
    'participation', COALESCE(v_participation, '[]'::jsonb), 
    'error_breakdown', v_error_breakdown
  );
END;
$$;


--
-- Name: rpc_get_vst_dashboard_v2(date, date, uuid[], uuid[], uuid[], uuid[], text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_vst_dashboard_v2(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_trend_type text DEFAULT 'month'::text, p_supervision_type text DEFAULT 'ALL'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  CREATE TEMP TABLE _vst_sess0 ON COMMIT DROP AS
  SELECT s.*,
         k_ns.ma_khoa AS ns_ma_khoa,
         k_ns.ten_khoa AS ns_ten_khoa,
         k_t.ma_khoa AS t_ma_khoa,
         k_t.ten_khoa AS t_ten_khoa,
         k_t.ten_khoa AS ten_khoa_duoc_gs,
         CASE
           WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
           WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
                OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
           WHEN ns.khoa_id IS NULL
                AND (
                  k_t.id IS NULL
                  OR (
                    (k_t.ma_khoa IS NULL OR k_t.ma_khoa NOT IN ('KSNK', 'C18'))
                    AND (k_t.ten_khoa IS NULL OR k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')
                  )
                ) THEN 'KSNK'
           WHEN ns.khoa_id IS NULL
                AND k_t.id IS NOT NULL
                AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'TU_GIAM_SAT'
           ELSE 'CHEO'
         END AS stype
  FROM public.fact_giam_sat_vst_sessions s
  LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
  LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
  LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
  WHERE s.is_active = true
    AND s.ngay_giam_sat >= p_tu_ngay
    AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids));

  IF p_supervision_type IS NOT NULL AND p_supervision_type <> 'ALL' THEN
    DELETE FROM _vst_sess0 WHERE stype <> p_supervision_type;
  END IF;

  CREATE TEMP TABLE _vst_opp ON COMMIT DROP AS
  SELECT d.*,
         CASE
           WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN true
           WHEN lower(
             regexp_replace(
               translate(lower(unaccent(coalesce(d.hanh_dong, ''))), 'đ', 'd'),
               E'\\s+',
               ' ',
               'g'
             )
           ) IN ('rua tay bang nuoc', 'cha tay bang con') THEN true
           ELSE false
         END AS is_tuan_thu
  FROM public.fact_giam_sat_vst d
  JOIN _vst_sess0 s ON d.session_id = s.id
  WHERE (p_khoa_ids IS NULL OR COALESCE(d.khoa_id, s.khoa_id) = ANY (p_khoa_ids))
    AND (
      p_khoi_ids IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.dm_khoa_phong ke
        WHERE ke.id = COALESCE(d.khoa_id, s.khoa_id)
          AND ke.khoi_id IS NOT NULL
          AND ke.khoi_id = ANY (p_khoi_ids)
      )
    )
    AND (
      p_nghe_nghiep_ids IS NULL
      OR d.nghe_nghiep_id = ANY (p_nghe_nghiep_ids)
    );

  CREATE TEMP TABLE _vst_sess ON COMMIT DROP AS
  SELECT s.*
  FROM _vst_sess0 s
  WHERE EXISTS (SELECT 1 FROM _vst_opp o WHERE o.session_id = s.id);

  CREATE TEMP TABLE _vst_moment_rows ON COMMIT DROP AS
  SELECT d.session_id,
         d.is_tuan_thu,
         d.dung_ky_thuat,
         d.du_thoi_gian,
         d.co_deo_gang,
         d.ngay_giam_sat,
         btrim(m.moment_part, E' \t\n\r') AS moment_label
  FROM _vst_opp d
  CROSS JOIN LATERAL unnest(string_to_array(COALESCE(d.thoi_diem, ''), ',')) AS m(moment_part)
  WHERE btrim(m.moment_part, E' \t\n\r') <> '';

  SELECT jsonb_build_object(
    'tu_ngay', p_tu_ngay,
    'den_ngay', p_den_ngay,
    'kpis', (
      SELECT jsonb_build_object(
        'tong_phien', count(DISTINCT session_id),
        'tong_co_hoi', count(*),
        'da_tuan_thu', count(*) FILTER (WHERE is_tuan_thu = true),
        'bo_sot', count(*) FILTER (WHERE is_tuan_thu = false),
        'ty_le_tuan_thu', ROUND(count(*) FILTER (WHERE is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1)
      ) FROM _vst_opp
    ),
    'supervision_sources', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_phien DESC), '[]'::jsonb) FROM (
        SELECT
          CASE stype
            WHEN 'KSNK' THEN 'Chuyên trách (KSNK)'
            WHEN 'CHEO' THEN 'Giám sát chéo'
            ELSE 'Tự giám sát'
          END AS ten,
          count(*)::bigint AS so_phien
        FROM _vst_sess
        GROUP BY stype
      ) t
    ),
    'by_moment_table', (
      WITH agg AS (
        SELECT
          mr.moment_label,
          count(*)::bigint AS cnt_all,
          count(*) FILTER (WHERE mr.is_tuan_thu = false)::bigint AS n_bo_sot,
          count(*) FILTER (WHERE mr.is_tuan_thu = true)::bigint AS n_dat,
          MIN(
            CASE mr.moment_label
              WHEN 'Trước khi tiếp xúc người bệnh' THEN 1
              WHEN 'Trước khi làm thủ thuật vô khuẩn' THEN 2
              WHEN 'Sau khi có nguy cơ tiếp xúc với dịch' THEN 3
              WHEN 'Sau khi tiếp xúc người bệnh' THEN 4
              WHEN 'Sau khi tiếp xúc xung quanh người bệnh' THEN 5
              ELSE 99
            END
          ) AS sort_ord
        FROM _vst_moment_rows mr
        GROUP BY mr.moment_label
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
          count(DISTINCT s.id)::bigint AS so_phien
        FROM _vst_sess s
        JOIN _vst_opp o ON o.session_id = s.id
        LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
        LEFT JOIN public.dm_khoa_phong k_eff ON k_eff.id = COALESCE(s.khoa_id, ns.khoa_id)
        WHERE k_eff.id IS NOT NULL
        GROUP BY k_eff.id, k_eff.ten_khoa
      ) t
    ),
    'by_khoa', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          k_eff.id::text AS id,
          COALESCE(k_eff.ten_khoa, '—') AS ten,
          count(*)::bigint AS tong,
          count(*) FILTER (WHERE o.is_tuan_thu = true)::bigint AS dat,
          ROUND(count(*) FILTER (WHERE o.is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) AS ty_le
        FROM _vst_opp o
        JOIN _vst_sess s ON o.session_id = s.id
        LEFT JOIN public.dm_khoa_phong k_eff ON k_eff.id = COALESCE(o.khoa_id, s.khoa_id)
        GROUP BY k_eff.id, k_eff.ten_khoa
      ) t
    ),
    'by_khoi', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          COALESCE(kk.ten_khoi, '—') AS ten,
          count(*)::bigint AS tong,
          count(*) FILTER (WHERE o.is_tuan_thu = true)::bigint AS dat,
          ROUND(count(*) FILTER (WHERE o.is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) AS ty_le
        FROM _vst_opp o
        JOIN _vst_sess s ON o.session_id = s.id
        LEFT JOIN public.dm_khoa_phong k_eff ON k_eff.id = COALESCE(o.khoa_id, s.khoa_id)
        LEFT JOIN public.dm_khoi_khoa kk ON kk.id = k_eff.khoi_id
        GROUP BY kk.id, kk.ten_khoi
      ) t
    ),
    'by_doi_tuong', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          COALESCE(nn.ten_nghe_nghiep, '—') AS ten,
          count(*)::bigint AS tong,
          count(*) FILTER (WHERE o.is_tuan_thu = true)::bigint AS dat,
          ROUND(count(*) FILTER (WHERE o.is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) AS ty_le
        FROM _vst_opp o
        LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
        GROUP BY nn.ten_nghe_nghiep
      ) t
    ),
    'by_khu_vuc', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          COALESCE(kv.ten_khu_vuc, '—') AS ten,
          count(*)::bigint AS tong,
          count(*) FILTER (WHERE o.is_tuan_thu = true)::bigint AS dat,
          ROUND(count(*) FILTER (WHERE o.is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) AS ty_le
        FROM _vst_opp o
        JOIN _vst_sess s ON o.session_id = s.id
        LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
        GROUP BY kv.ten_khu_vuc
      ) t
    ),
    'moment_missed', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_lan DESC), '[]'::jsonb) FROM (
        SELECT mr.moment_label AS ten, count(*) FILTER (WHERE mr.is_tuan_thu = false)::bigint AS so_lan
        FROM _vst_moment_rows mr
        GROUP BY mr.moment_label
      ) t
    ),
    'glove_abuse_by_moment', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_lan DESC), '[]'::jsonb) FROM (
        SELECT mr.moment_label AS ten, count(*) FILTER (WHERE mr.co_deo_gang = true AND mr.is_tuan_thu = false)::bigint AS so_lan
        FROM _vst_moment_rows mr
        GROUP BY mr.moment_label
      ) t
    ),
    'trend', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ky), '[]'::jsonb) FROM (
        SELECT
          to_char(o.ngay_giam_sat, 'YYYY-MM') AS ky,
          to_char(o.ngay_giam_sat, 'MM/YYYY') AS label,
          count(*)::bigint AS so_co_hoi,
          ROUND(count(*) FILTER (WHERE o.is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) AS ty_le
        FROM _vst_opp o
        GROUP BY 1, 2
      ) t
    ),
    'error_breakdown', (
      SELECT jsonb_build_object(
        'loi_ky_thuat', count(*) FILTER (WHERE is_tuan_thu = true AND dung_ky_thuat = false),
        'loi_thoi_gian', count(*) FILTER (WHERE is_tuan_thu = true AND du_thoi_gian = false),
        'lam_dung_gang', count(*) FILTER (WHERE co_deo_gang = true AND is_tuan_thu = false),
        'ty_le_lam_dung_gang', COALESCE(ROUND(count(*) FILTER (WHERE co_deo_gang = true AND is_tuan_thu = false) * 100.0 / NULLIF(count(*) FILTER (WHERE is_tuan_thu = false), 0), 1), 0),
        'ty_le_dung_ky_thuat', ROUND(count(*) FILTER (WHERE is_tuan_thu = true AND dung_ky_thuat = true) * 100.0 / NULLIF(count(*) FILTER (WHERE is_tuan_thu = true), 0), 1),
        'ty_le_du_thoi_gian', ROUND(count(*) FILTER (WHERE is_tuan_thu = true AND du_thoi_gian = true) * 100.0 / NULLIF(count(*) FILTER (WHERE is_tuan_thu = true), 0), 1)
      ) FROM _vst_opp
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;


--
-- Name: rpc_get_vst_moment_table_only(date, date, uuid[], uuid[], uuid[], uuid[], text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rpc_get_vst_moment_table_only(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_trend_type text DEFAULT 'month'::text, p_supervision_type text DEFAULT 'ALL'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  CREATE TEMP TABLE _vst_sess_m ON COMMIT DROP AS
  SELECT s.*,
         k_ns.ma_khoa AS ns_ma_khoa,
         k_ns.ten_khoa AS ns_ten_khoa,
         k_t.ma_khoa AS t_ma_khoa,
         k_t.ten_khoa AS t_ten_khoa,
         k_t.ten_khoa AS ten_khoa_duoc_gs,
         CASE
           WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
           WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
                OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
           ELSE 'CHEO'
         END AS stype
  FROM public.fact_giam_sat_vst_sessions s
  LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
  LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
  LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
  WHERE s.is_active = true
    AND s.ngay_giam_sat >= p_tu_ngay
    AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY(p_khoi_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids));

  IF p_supervision_type IS NOT NULL AND p_supervision_type <> 'ALL' THEN
    DELETE FROM _vst_sess_m WHERE stype <> p_supervision_type;
  END IF;

  CREATE TEMP TABLE _vst_opp_m ON COMMIT DROP AS
  SELECT d.*,
         CASE
           WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN true
           WHEN lower(
             regexp_replace(
               translate(lower(unaccent(coalesce(d.hanh_dong, ''))), 'đ', 'd'),
               E'\\s+',
               ' ',
               'g'
             )
           ) IN ('rua tay bang nuoc', 'cha tay bang con') THEN true
           ELSE false
         END AS is_tuan_thu
  FROM public.fact_giam_sat_vst d
  JOIN _vst_sess_m s ON d.session_id = s.id
  WHERE (
    p_nghe_nghiep_ids IS NULL
    OR d.nghe_nghiep_id = ANY (p_nghe_nghiep_ids)
  );

  CREATE TEMP TABLE _vst_moment_rows_m ON COMMIT DROP AS
  SELECT * FROM (
    SELECT d.session_id,
           d.is_tuan_thu,
           d.dung_ky_thuat,
           d.du_thoi_gian,
           d.co_deo_gang,
           d.ngay_giam_sat,
           btrim(m.moment_part, E' \t\n\r') AS moment_label
    FROM _vst_opp_m d
    CROSS JOIN LATERAL regexp_split_to_table(
      regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
      E'\\s*,\\s*'
    ) AS m(moment_part)
    WHERE btrim(m.moment_part, E' \t\n\r') <> ''

    UNION ALL

    SELECT d.session_id,
           d.is_tuan_thu,
           d.dung_ky_thuat,
           d.du_thoi_gian,
           d.co_deo_gang,
           d.ngay_giam_sat,
           '— Chưa ghi thời điểm trong phiếu'::text AS moment_label
    FROM _vst_opp_m d
    WHERE NOT EXISTS (
      SELECT 1
      FROM regexp_split_to_table(
        regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
        E'\\s*,\\s*'
      ) AS mp(part)
      WHERE btrim(mp.part, E' \t\n\r') <> ''
    )
  ) _mr;

  WITH agg AS (
    SELECT
      mr.moment_label,
      count(*)::bigint AS cnt_all,
      count(*) FILTER (WHERE mr.is_tuan_thu = false)::bigint AS n_bo_sot,
      count(*) FILTER (WHERE mr.is_tuan_thu = true)::bigint AS n_dat,
      MIN(
        CASE mr.moment_label
          WHEN 'Trước khi tiếp xúc người bệnh' THEN 1
          WHEN 'Trước khi làm thủ thuật vô khuẩn' THEN 2
          WHEN 'Sau khi có nguy cơ tiếp xúc với dịch' THEN 3
          WHEN 'Sau khi tiếp xúc người bệnh' THEN 4
          WHEN 'Sau khi tiếp xúc xung quanh người bệnh' THEN 5
          WHEN '— Chưa ghi thời điểm trong phiếu' THEN 6
          ELSE 99
        END
      ) AS sort_ord
    FROM _vst_moment_rows_m mr
    GROUP BY mr.moment_label
  ),
  tot AS (
    SELECT
      COALESCE(SUM(n_bo_sot), 0)::numeric AS t_bo_sot,
      COALESCE(SUM(n_dat), 0)::numeric AS t_dat
    FROM agg
  )
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'ten', a.moment_label,
          'tong', a.cnt_all,
          'n_bo_sot', a.n_bo_sot,
          'n_dat', a.n_dat,
          'ty_le_bo_sot', COALESCE(ROUND(a.n_bo_sot * 100.0 / NULLIF(t.t_bo_sot, 0), 1), 0),
          'ty_le_tuan_thu', COALESCE(ROUND(a.n_dat * 100.0 / NULLIF(t.t_dat, 0), 1), 0)
        )
        ORDER BY a.sort_ord
      )
      FROM agg a
      CROSS JOIN tot t
    ),
    '[]'::jsonb
  )
  INTO v_result;

  RETURN v_result;
END;
$$;


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
    FROM public.dm_tieu_chi_bang_kiem
    WHERE bang_kiem_id = p_bang_kiem_id AND is_active = true
  )
  UPDATE public.dm_tieu_chi_bang_kiem t
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
  v_current_idx INT;
  v_target_idx INT;
BEGIN
  SELECT q.*, t.ma_tram AS ma_tram_hien_tai
  INTO v_row
  FROM public.fact_quy_trinh q
  LEFT JOIN public.dm_tram_cssd t ON t.id = q.tram_hien_tai_id
  WHERE upper(q.ma_qr_quy_trinh) = upper(trim(p_ma_qr))
    AND q.is_active = true
  ORDER BY q.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ hoặc bộ chưa được tiếp nhận.');
  END IF;

  IF v_row.is_dong_bang = true THEN
    RETURN json_build_object('success', false, 'message', 'Bộ dụng cụ ' || p_ma_qr || ' đang bị khóa an toàn (đóng băng).');
  END IF;

  SELECT id INTO v_target_id FROM public.dm_tram_cssd
  WHERE upper(trim(ma_tram)) = upper(trim(p_target_station)) AND is_active = true
  LIMIT 1;

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

  IF NOT (v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN') THEN
    IF v_target_idx != v_current_idx + 1 THEN
      RETURN json_build_object('success', false, 'message', 'Sai trạm! Quy trình đang ở bước ' || v_current_ma);
    END IF;
  END IF;

  UPDATE public.fact_quy_trinh
  SET tram_hien_tai_id = v_target_id, updated_at = now()
  WHERE id = v_row.id;

  RETURN json_build_object(
    'success', true,
    'data', jsonb_build_object('den', upper(trim(p_target_station)), 'operator', p_operator_label)
  );
END;
$$;


--
-- Name: touch_fact_qlcv_danh_gia_thang(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_fact_qlcv_danh_gia_thang() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


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
-- Name: dm_bang_kiem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_bang_kiem (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_bk text NOT NULL,
    ten_bang_kiem text NOT NULL,
    nhom_chuyen_de text,
    mo_ta text,
    is_active boolean DEFAULT true,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    loai_hinh_giam_sat text DEFAULT 'TRUC_TIEP'::text
);


--
-- Name: dm_bo_dung_cu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_bo_dung_cu (
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
    khoa_su_dung_id uuid
);


--
-- Name: dm_bo_dung_cu_chi_tiet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_bo_dung_cu_chi_tiet (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bo_dung_cu_id uuid,
    ten_dung_cu_le text NOT NULL,
    so_luong integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    max_suds_count integer DEFAULT 100,
    trong_luong numeric,
    ghi_chu text,
    ma_qr_mau text,
    ma_chi_tiet character varying(50),
    ten_chi_tiet text,
    loai_dung_cu_id uuid,
    ma_loai text
);


--
-- Name: dm_cach_thuc_giam_sat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_cach_thuc_giam_sat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_cach_thuc text NOT NULL,
    ten_cach_thuc text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dm_chuc_danh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_chuc_danh (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_chuc_danh text NOT NULL,
    ten_chuc_danh text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    legacy_danh_muc_id uuid
);


--
-- Name: dm_chuc_vu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_chuc_vu (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_chuc_vu text NOT NULL,
    ten_chuc_vu text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    legacy_danh_muc_id uuid
);


--
-- Name: dm_hinh_thuc_giam_sat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_hinh_thuc_giam_sat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_hinh_thuc text NOT NULL,
    ten_hinh_thuc text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dm_hoa_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_hoa_chat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_hoa_chat character varying(50) NOT NULL,
    ten_hoa_chat text NOT NULL,
    loai_hoa_chat character varying(50) DEFAULT 'HOA_CHAT'::character varying,
    don_vi_tinh character varying(20),
    quy_cach text,
    ghi_chu text,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now(),
    nong_do text,
    han_su_dung date,
    nguong_ton_toi_thieu numeric(18,4)
);


--
-- Name: COLUMN dm_hoa_chat.nguong_ton_toi_thieu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dm_hoa_chat.nguong_ton_toi_thieu IS 'KSNK kho: cảnh báo khi tổng tồn <= giá trị (theo đơn vị dm_hoa_chat).';


--
-- Name: dm_khoa_phong; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_khoa_phong (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_khoa character varying(50) NOT NULL,
    ten_khoa text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    khoi_id uuid,
    mo_ta_chuc_nang text,
    so_bac_si integer DEFAULT 0,
    so_dieu_duong integer DEFAULT 0,
    so_giuong_benh_thuong integer DEFAULT 0,
    so_giuong_cap_cuu integer DEFAULT 0
);


--
-- Name: dm_khoi_khoa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_khoi_khoa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_khoi text NOT NULL,
    ten_khoi text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    legacy_danh_muc_id uuid
);


--
-- Name: dm_khu_vuc_giam_sat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_khu_vuc_giam_sat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_khu_vuc text NOT NULL,
    ten_khu_vuc text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    legacy_danh_muc_id uuid
);


--
-- Name: dm_loai_cong_viec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_loai_cong_viec (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma text NOT NULL,
    ten text NOT NULL,
    thu_tu integer DEFAULT 0
);


--
-- Name: dm_loai_dung_cu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_loai_dung_cu (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_loai character varying(50) NOT NULL,
    ten_loai text NOT NULL,
    mo_ta text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    ma_loai_dung_cu text,
    ten_loai_dung_cu text,
    hinh_dang text,
    kich_thuoc text,
    cong_dung text,
    kha_nang_chiu_nhiet text,
    phuong_phap_tiet_khuan text,
    legacy_danh_muc_id uuid,
    so_ngay_han_dung integer DEFAULT 30
);


--
-- Name: TABLE dm_loai_dung_cu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dm_loai_dung_cu IS 'Danh mục phân loại dụng cụ (Phẫu thuật, Nội soi, v.v.)';


--
-- Name: COLUMN dm_loai_dung_cu.so_ngay_han_dung; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dm_loai_dung_cu.so_ngay_han_dung IS 'Số ngày hạn dùng mặc định sau khi tiệt khuẩn';


--
-- Name: dm_loai_may_tiet_khuan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_loai_may_tiet_khuan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_loai_may text NOT NULL,
    ten_loai_may text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    legacy_danh_muc_id uuid
);


--
-- Name: dm_loai_nkbv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_loai_nkbv (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_loai text NOT NULL,
    ten_loai text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE dm_loai_nkbv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dm_loai_nkbv IS 'Loại ca NKBV / HAI (SSI, VAP, …) — SSOT dropdown module giam-sat-nkbv.';


--
-- Name: dm_loai_su_co; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_loai_su_co (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_loai_su_co text NOT NULL,
    ten_loai_su_co text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    legacy_danh_muc_id uuid
);


--
-- Name: dm_nghe_nghiep; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_nghe_nghiep (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_nghe_nghiep text NOT NULL,
    ten_nghe_nghiep text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    legacy_danh_muc_id uuid
);


--
-- Name: dm_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_name text NOT NULL,
    action text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dm_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: dm_thiet_bi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_thiet_bi (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_thiet_bi character varying(50) NOT NULL,
    ten_thiet_bi text NOT NULL,
    trang_thai character varying(50) DEFAULT 'READY'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    ngay_dua_vao_su_dung date DEFAULT CURRENT_DATE,
    ghi_chu text,
    chu_ky_bao_tri_ngay integer DEFAULT 180,
    ngay_bao_tri_gan_nhat date,
    ngay_bao_tri_tiep_theo date,
    hang_san_xuat text,
    nam_san_xuat integer,
    loai_may_id uuid
);


--
-- Name: dm_tieu_chi_bang_kiem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_tieu_chi_bang_kiem (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_tc text,
    bang_kiem_id uuid,
    stt integer,
    noi_dung text NOT NULL,
    ghi_chu text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    diem_toi_da integer DEFAULT 1
);


--
-- Name: dm_to_cong_tac; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_to_cong_tac (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_to text NOT NULL,
    ten_to text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    legacy_danh_muc_id uuid
);


--
-- Name: dm_tram_cssd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_tram_cssd (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_tram text NOT NULL,
    ten_tram text NOT NULL,
    thu_tu smallint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE dm_tram_cssd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dm_tram_cssd IS 'Danh mục trạm workflow CSSD (QR scan). SSOT mã trạm; fact_quy_trinh.tram_hien_tai_id.';


--
-- Name: dm_trang_thai_cong_viec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_trang_thai_cong_viec (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma text NOT NULL,
    ten text NOT NULL,
    mau_sac text,
    thu_tu integer DEFAULT 0
);


--
-- Name: dm_trang_thai_nkbv_ca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_trang_thai_nkbv_ca (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_trang_thai text NOT NULL,
    ten_trang_thai text NOT NULL,
    thu_tu integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE dm_trang_thai_nkbv_ca; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dm_trang_thai_nkbv_ca IS 'Trạng thái phiếu ca NKBV trên luồng ghi nhận — xử lý thủ công trước Rules Engine HIS.';


--
-- Name: dm_vi_tri_kho; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_vi_tri_kho (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_vi_tri text NOT NULL,
    ten_vi_tri text NOT NULL,
    ghi_chu text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE dm_vi_tri_kho; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dm_vi_tri_kho IS 'Danh mục vị trí lưu kho dụng cụ vô khuẩn (Kệ, Tầng, Ô)';


--
-- Name: fact_bao_tri_thiet_bi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_bao_tri_thiet_bi (
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
    CONSTRAINT fact_bao_tri_thiet_bi_trang_thai_check CHECK (((trang_thai)::text = ANY ((ARRAY['DANG_THUC_HIEN'::character varying, 'HOAN_THANH'::character varying, 'HUY'::character varying])::text[])))
);


--
-- Name: TABLE fact_bao_tri_thiet_bi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_bao_tri_thiet_bi IS 'CSSD: phiếu bảo trì thiết bị — tối đa một phiếu DANG_THUC_HIEN / máy; đồng bộ dm_thiet_bi.trang_thai.';


--
-- Name: fact_bv103_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_bv103_audit_log (
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
-- Name: fact_cong_viec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_cong_viec (
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
    trang_thai_id uuid
);


--
-- Name: fact_cong_viec_dinh_ky; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_cong_viec_dinh_ky (
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
    CONSTRAINT fact_cong_viec_dinh_ky_ma_chu_ky_check CHECK ((ma_chu_ky = ANY (ARRAY['WEEKLY'::text, 'MONTHLY'::text])))
);


--
-- Name: fact_cong_viec_hoat_dong; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_cong_viec_hoat_dong (
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
-- Name: fact_cssd_dieu_chuyen_thanh_phan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_cssd_dieu_chuyen_thanh_phan (
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
-- Name: TABLE fact_cssd_dieu_chuyen_thanh_phan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_cssd_dieu_chuyen_thanh_phan IS 'CSSD: nhật ký điều chuyển cấu phần giữa hai bộ QR.';


--
-- Name: fact_cssd_lifecycle_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_cssd_lifecycle_event (
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
-- Name: TABLE fact_cssd_lifecycle_event; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_cssd_lifecycle_event IS 'CSSD: nhật ký sự kiện vòng đời (bổ sung fact_nhat_ky_quet), phục vụ domino/audit.';


--
-- Name: fact_giam_sat_chung_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_giam_sat_chung_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    criterion_id uuid NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fact_giam_sat_chung_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_giam_sat_chung_sessions (
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
    is_manual_nhan_vien boolean DEFAULT false NOT NULL,
    ten_manual_nhan_vien text,
    is_bo_sung_nguoi_benh boolean DEFAULT false NOT NULL,
    ma_nguoi_benh text,
    ten_nguoi_benh text,
    so_giuong_nguoi_benh text,
    hinh_thuc_id uuid,
    cach_thuc_id uuid,
    bang_kiem_id uuid
);


--
-- Name: TABLE fact_giam_sat_chung_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_giam_sat_chung_sessions IS 'Phiên giám sát chung — stub greenfield.';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.is_seen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.is_seen IS 'Người dùng đã mở xem/in phiên từ lịch sử.';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.thoi_gian_bat_dau; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.thoi_gian_bat_dau IS 'Giờ bắt đầu khung giám sát trong ngày (ưu tiên khi giám sát qua camera).';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.thoi_gian_ket_thuc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.thoi_gian_ket_thuc IS 'Giờ kết thúc khung giám sát trong ngày.';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.is_manual_nhan_vien; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.is_manual_nhan_vien IS 'TRUE = nhập tên đối tượng giám sát tay (không có hồ sơ trong mdm_nhan_su). FALSE/NULL = dùng nhan_vien_id.';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.ten_manual_nhan_vien; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.ten_manual_nhan_vien IS 'Tên đối tượng giám sát gõ tay khi is_manual_nhan_vien=TRUE; ngược lại nên NULL.';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.is_bo_sung_nguoi_benh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.is_bo_sung_nguoi_benh IS 'Người dùng bật bổ sung thông tin người bệnh đang được chăm sóc (tùy chọn).';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.ma_nguoi_benh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.ma_nguoi_benh IS 'Mã người bệnh (nhập tay, tùy chọn).';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.ten_nguoi_benh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.ten_nguoi_benh IS 'Tên người bệnh (nhập tay, tùy chọn).';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.so_giuong_nguoi_benh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.so_giuong_nguoi_benh IS 'Số giường người bệnh (nhập tay, tùy chọn).';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.hinh_thuc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.hinh_thuc_id IS 'FK dm_hinh_thuc_giam_sat — link chuẩn; hinh_thuc_giam_sat là nhãn đồng bộ.';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.cach_thuc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.cach_thuc_id IS 'FK dm_cach_thuc_giam_sat — link chuẩn; cach_thuc_giam_sat là nhãn đồng bộ.';


--
-- Name: COLUMN fact_giam_sat_chung_sessions.bang_kiem_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.bang_kiem_id IS 'FK dm_bang_kiem — SSOT; loai_bang_kiem giữ mã/legacy cho RPC dashboard.';


--
-- Name: fact_giam_sat_nkbv_ca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_giam_sat_nkbv_ca (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_ca text NOT NULL,
    khoa_ghi_nhan_id uuid,
    ma_benh_nhan text,
    ho_ten_benh_nhan text NOT NULL,
    ngay_sinh date,
    gioi_tinh text,
    ngay_vao_vien date,
    ngay_phat_hien date DEFAULT CURRENT_DATE NOT NULL,
    vi_tri_nhiem_khuan text,
    tac_nhan_vi_khuan text,
    tom_tat_dien_bien text,
    bien_phap_phong_ngua text,
    loai_nkbv_id uuid NOT NULL,
    trang_thai_id uuid NOT NULL,
    ly_do_loai_tru text,
    nguoi_ghi_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE fact_giam_sat_nkbv_ca; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_giam_sat_nkbv_ca IS 'Phiếu giám sát ca NKBV / HAI — nhập tay tại BV103 MVP.';


--
-- Name: fact_giam_sat_vst; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_giam_sat_vst (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    nhan_vien_id uuid,
    ten_nhan_vien_ngoai text,
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
    legacy_csv_row_id text,
    ghi_chu text,
    khu_vuc_id uuid,
    nghe_nghiep_id uuid
);


--
-- Name: COLUMN fact_giam_sat_vst.legacy_csv_row_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_vst.legacy_csv_row_id IS 'Khóa ID dòng file CSV import (vd. GSVSTTQ) — idempotent import.';


--
-- Name: COLUMN fact_giam_sat_vst.ghi_chu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_vst.ghi_chu IS 'Ghi chú phiếu quan sát (legacy / nhập tay).';


--
-- Name: COLUMN fact_giam_sat_vst.khu_vuc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_vst.khu_vuc_id IS 'FK dm_khu_vuc_giam_sat — SSOT; cột khu_vuc (text) giữ nhãn legacy / denorm.';


--
-- Name: COLUMN fact_giam_sat_vst.nghe_nghiep_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_vst.nghe_nghiep_id IS 'FK dm_nghe_nghiep — SSOT; cột nghe_nghiep (text) giữ nhãn legacy / denorm.';


--
-- Name: fact_giam_sat_vst_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_giam_sat_vst_sessions (
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
-- Name: TABLE fact_giam_sat_vst_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_giam_sat_vst_sessions IS 'Phiên VST. Legacy hinh_thuc "Giám sát khách quan" đã map → dm Giám sát chuyên trách (20260716010).';


--
-- Name: COLUMN fact_giam_sat_vst_sessions.is_seen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_vst_sessions.is_seen IS 'Người dùng đã mở xem/in phiên từ lịch sử.';


--
-- Name: COLUMN fact_giam_sat_vst_sessions.hinh_thuc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_vst_sessions.hinh_thuc_id IS 'FK dm_hinh_thuc_giam_sat — link chuẩn; hinh_thuc_giam_sat là nhãn đồng bộ.';


--
-- Name: COLUMN fact_giam_sat_vst_sessions.cach_thuc_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_giam_sat_vst_sessions.cach_thuc_id IS 'FK dm_cach_thuc_giam_sat — link chuẩn; cach_thuc_giam_sat là nhãn đồng bộ.';


--
-- Name: fact_kho_chi_tiet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_kho_chi_tiet (
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
-- Name: fact_kho_giao_dich; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_kho_giao_dich (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_giao_dich character varying(50) NOT NULL,
    loai_giao_dich character varying(50),
    khoa_phong_id uuid,
    nguoi_thuc_hien_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: fact_kho_hoa_chat_giao_dich; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_kho_hoa_chat_giao_dich (
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
    CONSTRAINT fact_kho_hoa_chat_giao_dich_loai_giao_dich_check CHECK (((loai_giao_dich)::text = ANY ((ARRAY['NHAP'::character varying, 'XUAT'::character varying, 'DIEU_CHINH'::character varying])::text[])))
);


--
-- Name: TABLE fact_kho_hoa_chat_giao_dich; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_kho_hoa_chat_giao_dich IS 'KSNK kho hóa chất/vật tư: NHAP >0, XUAT <0, DIEU_CHINH có thể +/- ; tồn theo lô = SUM(so_luong_co_dau) GROUP BY dm_hoa_chat_id, ma_lo, han_su_dung.';


--
-- Name: fact_lo_tiet_khuan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_lo_tiet_khuan (
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
-- Name: COLUMN fact_lo_tiet_khuan.tk_chot_nap_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_lo_tiet_khuan.tk_chot_nap_at IS 'Xác nhận bắt đầu tiệt khuẩn: khóa nạp thêm, chuyển bộ trong mẻ sang trạm TIET_KHUAN.';


--
-- Name: COLUMN fact_lo_tiet_khuan.tk_mo_form_qc_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_lo_tiet_khuan.tk_mo_form_qc_at IS 'Kết thúc chu trình tiệt khuẩn (vật lý): cho phép nhập thông số/đánh giá QC.';


--
-- Name: COLUMN fact_lo_tiet_khuan.tk_qc_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_lo_tiet_khuan.tk_qc_json IS 'Thông số QC mẻ (máy, chỉ thị, test tùy chọn, URL ảnh minh chứng).';


--
-- Name: fact_nhat_ky_quet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_nhat_ky_quet (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quy_trinh_id uuid,
    ma_hanh_dong character varying(50),
    thiet_bi_id uuid,
    nguoi_thuc_hien_id uuid,
    ghi_chu text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    ma_tram character varying(50),
    nguoi_thuc_hien text
);


--
-- Name: fact_qlcv_danh_gia_thang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_qlcv_danh_gia_thang (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nhan_su_id uuid NOT NULL,
    thang date NOT NULL,
    on_time_rate numeric(6,2) DEFAULT 0 NOT NULL,
    completion_rate numeric(6,2) DEFAULT 0 NOT NULL,
    quality_score smallint,
    final_score numeric(6,2),
    manager_comment text,
    evaluated_by uuid,
    evaluated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_qlcv_danh_gia_thang_quality_ck CHECK (((quality_score IS NULL) OR ((quality_score >= 1) AND (quality_score <= 5)))),
    CONSTRAINT fact_qlcv_danh_gia_thang_thang_first_day CHECK ((thang = (date_trunc('month'::text, (thang)::timestamp with time zone))::date))
);


--
-- Name: TABLE fact_qlcv_danh_gia_thang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_qlcv_danh_gia_thang IS 'Điểm đánh giá tháng QLCV (on_time_rate, completion_rate snapshot + chất lượng 1–5 + final_score).';


--
-- Name: COLUMN fact_qlcv_danh_gia_thang.thang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_qlcv_danh_gia_thang.thang IS 'Ngày đầu tháng (YYYY-MM-01).';


--
-- Name: fact_quy_trinh; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_quy_trinh (
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
    ma_ca_mo_id text,
    vi_tri_kho_id uuid,
    ngay_het_han timestamp with time zone,
    tram_hien_tai_id uuid
);


--
-- Name: TABLE fact_quy_trinh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_quy_trinh IS 'Bảng quy trình (Cho phép lưu lịch sử nhiều chu kỳ của cùng 1 mã QR)';


--
-- Name: COLUMN fact_quy_trinh.nguoi_tiep_nhan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_quy_trinh.nguoi_tiep_nhan_id IS 'Người thực hiện bước tiếp nhận';


--
-- Name: COLUMN fact_quy_trinh.is_dong_bang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_quy_trinh.is_dong_bang IS 'Khóa an toàn: thiếu/hỏng cấu phần — chỉ quản trị mở.';


--
-- Name: COLUMN fact_quy_trinh.quy_trinh_cha_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_quy_trinh.quy_trinh_cha_id IS 'QR phụ (SUB) trỏ về quy trình MAIN khi tách mã đóng gói.';


--
-- Name: COLUMN fact_quy_trinh.ma_vai_tro_bo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_quy_trinh.ma_vai_tro_bo IS 'DON | MAIN | SUB — hội quân cấp phát.';


--
-- Name: COLUMN fact_quy_trinh.ma_ca_mo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_quy_trinh.ma_ca_mo_id IS 'Truy vết dụng cụ đến từng ca mổ/bệnh nhân';


--
-- Name: COLUMN fact_quy_trinh.vi_tri_kho_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_quy_trinh.vi_tri_kho_id IS 'Vị trí lưu trữ bộ dụng cụ sau khi tiệt khuẩn';


--
-- Name: COLUMN fact_quy_trinh.ngay_het_han; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fact_quy_trinh.ngay_het_han IS 'Hạn sử dụng của bộ dụng cụ (tính từ ngày tiệt khuẩn đạt)';


--
-- Name: fact_quy_trinh_thanh_phan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_quy_trinh_thanh_phan (
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
-- Name: TABLE fact_quy_trinh_thanh_phan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_quy_trinh_thanh_phan IS 'CSSD: cấu phần theo từng QR vòng đời (bám dm_bo_dung_cu_chi_tiet).';


--
-- Name: fact_su_co; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_su_co (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quy_trinh_id uuid,
    ma_qr_quy_trinh text NOT NULL,
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
    incident_group text,
    incident_type_label text
);


--
-- Name: TABLE fact_su_co; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_su_co IS 'Bảng lưu tất cả sự cố CSSD - Configuration-Driven Hybrid EAV';


--
-- Name: fact_su_co_chi_tiet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_su_co_chi_tiet (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_co_id uuid,
    ma_chi_tiet_su_co text NOT NULL,
    gia_tri_chi_tiet text NOT NULL
);


--
-- Name: TABLE fact_su_co_chi_tiet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fact_su_co_chi_tiet IS 'Bảng EAV lưu các thuộc tính động của sự cố';


--
-- Name: mdm_field_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mdm_field_registry (
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


--
-- Name: mdm_governance_suggestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mdm_governance_suggestion (
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
    ngay_sinh date,
    gioi_tinh text,
    to_id uuid,
    so_dien_thoai text,
    email text,
    extra_data jsonb DEFAULT '{}'::jsonb,
    chuc_vu_id uuid,
    chuc_danh_id uuid,
    vai_tro_he_thong_id uuid,
    auth_user_id uuid,
    nghe_nghiep_id uuid
);


--
-- Name: COLUMN mdm_nhan_su.auth_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mdm_nhan_su.auth_user_id IS 'Tài khoản đăng nhập gắn với hồ sơ (nếu có). Nhân sự chỉ danh bạ để chọn trong form: để null.';


--
-- Name: mv_gsc_session_daily; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_gsc_session_daily AS
 SELECT s.ngay_giam_sat AS ngay,
    COALESCE(bk.ma_bk, ''::text) AS ma_bk,
    s.khoa_id,
    count(DISTINCT s.id) AS tong_phien,
    count(r.id) AS tong_quan_sat,
    count(r.id) FILTER (WHERE (r.value = 'DAT'::text)) AS tong_dat,
    count(r.id) FILTER (WHERE (r.value = 'KHONG_DAT'::text)) AS tong_khong_dat
   FROM ((public.fact_giam_sat_chung_sessions s
     LEFT JOIN public.dm_bang_kiem bk ON ((bk.id = s.bang_kiem_id)))
     LEFT JOIN public.fact_giam_sat_chung_results r ON ((r.session_id = s.id)))
  WHERE (COALESCE(s.is_active, true) = true)
  GROUP BY s.ngay_giam_sat, COALESCE(bk.ma_bk, ''::text), s.khoa_id
  WITH NO DATA;


--
-- Name: rel_role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rel_role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rel_user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rel_user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: v_auth_user_permissions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_auth_user_permissions AS
 WITH user_perms AS (
         SELECT ur.user_id,
            jsonb_agg(DISTINCT r.name) AS roles,
            jsonb_agg(DISTINCT jsonb_build_object('module', p.module_name, 'action', p.action)) AS permissions
           FROM (((public.rel_user_roles ur
             JOIN public.dm_roles r ON ((ur.role_id = r.id)))
             LEFT JOIN public.rel_role_permissions rp ON ((r.id = rp.role_id)))
             LEFT JOIN public.dm_permissions p ON ((rp.permission_id = p.id)))
          GROUP BY ur.user_id
        )
 SELECT ns.id AS staff_id,
    ns.auth_user_id,
    ns.ho_ten,
    ns.ma_nv,
    ns.email,
    ns.khoa_id,
    ns.is_active,
    k.ten_khoa AS ten_khoa_phong,
    k.ma_khoa AS ma_khoa_phong,
    COALESCE(up.roles, '[]'::jsonb) AS roles,
    COALESCE(up.permissions, '[]'::jsonb) AS permissions
   FROM ((public.mdm_nhan_su ns
     LEFT JOIN public.dm_khoa_phong k ON ((ns.khoa_id = k.id)))
     LEFT JOIN user_perms up ON ((ns.auth_user_id = up.user_id)));


--
-- Name: v_fact_cong_viec_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_cong_viec_full WITH (security_invoker='true') AS
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
           FROM public.fact_cong_viec sub
          WHERE ((sub.cong_viec_cha_id = cv.id) AND (sub.is_active = true))) AS cong_viec_con_count
   FROM (((((((public.fact_cong_viec cv
     LEFT JOIN public.dm_loai_cong_viec lc ON ((lc.id = cv.loai_cong_viec_id)))
     LEFT JOIN public.dm_trang_thai_cong_viec ts ON ((ts.id = cv.trang_thai_id)))
     LEFT JOIN public.mdm_nhan_su ns_tao ON ((cv.nguoi_tao_id = ns_tao.id)))
     LEFT JOIN public.mdm_nhan_su ns_phu ON ((cv.nguoi_phu_trach_id = ns_phu.id)))
     LEFT JOIN public.mdm_nhan_su ns_giao ON ((cv.nguoi_giao_viec_id = ns_giao.id)))
     LEFT JOIN public.dm_khoa_phong k ON ((cv.khoa_thuc_hien_id = k.id)))
     LEFT JOIN public.dm_to_cong_tac t ON ((cv.to_cong_tac_id = t.id)));


--
-- Name: v_cong_viec_qua_han; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cong_viec_qua_han AS
 SELECT id,
    cong_viec_cha_id,
    tieu_de,
    mo_ta,
    loai_cong_viec_id,
    loai_cong_viec,
    ten_loai_cong_viec,
    trang_thai_id,
    trang_thai,
    ten_trang_thai_hien_thi,
    muc_do_uu_tien,
    han_hoan_thanh,
    phan_tram_hoan_thanh,
    nguoi_tao_id,
    nguoi_giao_viec_id,
    nguoi_phu_trach_id,
    khoa_thuc_hien_id,
    to_cong_tac_id,
    dinh_ky_mau_id,
    is_active,
    created_at,
    updated_at,
    nguoi_tao_ten,
    nguoi_phu_trach_ten,
    nguoi_giao_ten,
    khoa_thuc_hien_ten,
    to_cong_tac_ten,
    is_qua_han,
    cong_viec_con_count
   FROM public.v_fact_cong_viec_full
  WHERE (is_qua_han = true);


--
-- Name: v_dm_bang_kiem_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_dm_bang_kiem_full WITH (security_invoker='true') AS
 SELECT id,
    ma_bk,
    ten_bang_kiem,
    nhom_chuyen_de,
    mo_ta,
    loai_hinh_giam_sat,
    is_active,
    is_system,
    created_at,
    updated_at
   FROM public.dm_bang_kiem bk;


--
-- Name: v_dm_bo_dung_cu_chi_tiet_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_dm_bo_dung_cu_chi_tiet_full WITH (security_invoker='true') AS
 SELECT c.id,
    c.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    c.loai_dung_cu_id,
    l.ma_loai AS ma_loai_dung_cu,
    l.ten_loai AS ten_loai_dung_cu,
    c.ma_chi_tiet,
    c.ten_chi_tiet,
    c.ten_dung_cu_le,
    c.so_luong,
    c.ma_qr_mau,
    c.is_active,
    c.created_at,
    c.updated_at
   FROM ((public.dm_bo_dung_cu_chi_tiet c
     LEFT JOIN public.dm_bo_dung_cu b ON ((b.id = c.bo_dung_cu_id)))
     LEFT JOIN public.dm_loai_dung_cu l ON ((l.id = c.loai_dung_cu_id)));


--
-- Name: v_dm_bo_dung_cu_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_dm_bo_dung_cu_full WITH (security_invoker='true') AS
 SELECT b.id,
    b.ma_bo,
    b.ten_bo,
    b.loai_dung_cu_id,
    l.ma_loai AS ma_loai_dung_cu,
    l.ten_loai AS ten_loai_dung_cu,
    b.khoa_su_dung_id,
    k.ma_khoa AS ma_khoa_su_dung,
    k.ten_khoa AS ten_khoa_su_dung,
    b.trang_thai,
    b.quy_cach,
    b.ghi_chu,
    b.ngay_kiem_ke_gan_nhat,
    b.is_active,
    b.created_at,
    b.updated_at
   FROM ((public.dm_bo_dung_cu b
     LEFT JOIN public.dm_loai_dung_cu l ON ((l.id = b.loai_dung_cu_id)))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = b.khoa_su_dung_id)));


--
-- Name: v_dm_khoa_phong_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_dm_khoa_phong_full WITH (security_invoker='true') AS
 SELECT kp.id,
    kp.ma_khoa,
    kp.ten_khoa,
    kp.khoi_id,
    kk.ma_khoi,
    kk.ten_khoi,
    kp.mo_ta_chuc_nang,
    kp.so_bac_si,
    kp.so_dieu_duong,
    kp.so_giuong_benh_thuong,
    kp.so_giuong_cap_cuu,
    kp.is_active,
    kp.created_at,
    kp.updated_at
   FROM (public.dm_khoa_phong kp
     LEFT JOIN public.dm_khoi_khoa kk ON ((kk.id = kp.khoi_id)));


--
-- Name: VIEW v_dm_khoa_phong_full; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_dm_khoa_phong_full IS 'Khoa phòng + tên khối (đọc). FK khoi_id vẫn trên dm_khoa_phong; INSERT/UPDATE dùng bảng gốc.';


--
-- Name: v_dm_thiet_bi_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_dm_thiet_bi_full WITH (security_invoker='true') AS
 SELECT tb.id,
    tb.ma_thiet_bi,
    tb.ten_thiet_bi,
    tb.loai_may_id,
    lm.ma_loai_may,
    lm.ten_loai_may AS ten_loai_may_hien_thi,
    lm.ma_loai_may AS loai_thiet_bi,
    tb.trang_thai,
    tb.hang_san_xuat,
    tb.nam_san_xuat,
    tb.ngay_dua_vao_su_dung,
    tb.chu_ky_bao_tri_ngay,
    tb.ngay_bao_tri_gan_nhat,
    tb.ngay_bao_tri_tiep_theo,
    tb.ghi_chu,
    tb.is_active,
    tb.created_at,
    tb.updated_at
   FROM (public.dm_thiet_bi tb
     LEFT JOIN public.dm_loai_may_tiet_khuan lm ON ((lm.id = tb.loai_may_id)));


--
-- Name: v_dm_tieu_chi_bang_kiem_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_dm_tieu_chi_bang_kiem_full WITH (security_invoker='true') AS
 SELECT tc.id,
    tc.bang_kiem_id,
    bk.ma_bk AS ma_bang_kiem,
    bk.ten_bang_kiem,
    tc.noi_dung,
    tc.stt,
    tc.diem_toi_da,
    tc.is_active,
    tc.created_at,
    tc.updated_at
   FROM (public.dm_tieu_chi_bang_kiem tc
     LEFT JOIN public.dm_bang_kiem bk ON ((bk.id = tc.bang_kiem_id)));


--
-- Name: v_fact_giam_sat_chung_sessions_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_giam_sat_chung_sessions_full WITH (security_invoker='true') AS
 SELECT s.id,
    s.bang_kiem_id,
    bk.ma_bk AS loai_bang_kiem,
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
    s.is_manual_nhan_vien,
    s.ten_manual_nhan_vien,
    s.is_bo_sung_nguoi_benh,
    s.ma_nguoi_benh,
    s.ten_nguoi_benh,
    s.so_giuong_nguoi_benh,
    s.is_active,
    s.is_seen,
    s.created_at,
    s.updated_at,
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
   FROM ((((((((public.fact_giam_sat_chung_sessions s
     LEFT JOIN public.dm_bang_kiem bk ON ((bk.id = s.bang_kiem_id)))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = s.khoa_id)))
     LEFT JOIN public.dm_khu_vuc_giam_sat kv ON ((kv.id = s.khu_vuc_id)))
     LEFT JOIN public.mdm_nhan_su ns_gs ON ((ns_gs.id = s.nguoi_giam_sat_id)))
     LEFT JOIN public.mdm_nhan_su ns_nv ON ((ns_nv.id = s.nhan_vien_id)))
     LEFT JOIN public.dm_nghe_nghiep nn ON ((nn.id = s.nghe_nghiep_id)))
     LEFT JOIN public.dm_hinh_thuc_giam_sat ht ON ((ht.id = s.hinh_thuc_id)))
     LEFT JOIN public.dm_cach_thuc_giam_sat ct ON ((ct.id = s.cach_thuc_id)))
  WHERE (COALESCE(s.is_active, true) = true);


--
-- Name: v_fact_giam_sat_nkbv_ca_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_giam_sat_nkbv_ca_full WITH (security_invoker='true') AS
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
    c.tom_tat_dien_bien,
    c.bien_phap_phong_ngua,
    c.loai_nkbv_id,
    c.trang_thai_id,
    c.ly_do_loai_tru,
    c.nguoi_ghi_id,
    c.is_active,
    c.created_at,
    c.updated_at,
    k.ma_khoa AS khoa_ma,
    k.ten_khoa AS khoa_ten,
    l.ma_loai AS loai_ma,
    l.ten_loai AS loai_ten,
    t.ma_trang_thai AS trang_thai_ma,
    t.ten_trang_thai AS trang_thai_ten
   FROM (((public.fact_giam_sat_nkbv_ca c
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = c.khoa_ghi_nhan_id)))
     LEFT JOIN public.dm_loai_nkbv l ON ((l.id = c.loai_nkbv_id)))
     LEFT JOIN public.dm_trang_thai_nkbv_ca t ON ((t.id = c.trang_thai_id)));


--
-- Name: v_fact_giam_sat_vst_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_giam_sat_vst_full WITH (security_invoker='true') AS
 SELECT o.id,
    o.session_id,
    o.nhan_vien_id,
    o.ten_nhan_vien_ngoai,
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
    o.legacy_csv_row_id,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    COALESCE(kv.ten_khu_vuc, ''::text) AS khu_vuc,
    COALESCE(kv.ten_khu_vuc, ''::text) AS ten_khu_vuc_hien_thi,
    nn.ma_nghe_nghiep,
    COALESCE(nn.ten_nghe_nghiep, ''::text) AS nghe_nghiep,
    COALESCE(nn.ten_nghe_nghiep, ''::text) AS ten_nghe_nghiep_hien_thi,
    k.ten_khoa AS ten_khoa_phong,
    o.created_at
   FROM (((public.fact_giam_sat_vst o
     LEFT JOIN public.dm_khu_vuc_giam_sat kv ON ((kv.id = o.khu_vuc_id)))
     LEFT JOIN public.dm_nghe_nghiep nn ON ((nn.id = o.nghe_nghiep_id)))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = o.khoa_id)));


--
-- Name: VIEW v_fact_giam_sat_vst_full; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_fact_giam_sat_vst_full IS 'VST dòng quan sát: FK trên fact_giam_sat_vst; khu_vuc/nghe_nghiep là alias JOIN dm_*.';


--
-- Name: v_fact_giam_sat_vst_sessions_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_giam_sat_vst_sessions_full WITH (security_invoker='true') AS
 SELECT s.id,
    s.khoa_id,
    s.khu_vuc_id,
    s.vi_tri_cu_the,
    s.hinh_thuc_id,
    s.cach_thuc_id,
    s.nguoi_giam_sat_id,
    s.thoi_gian_bat_dau,
    s.thoi_gian_ket_thuc,
    s.ngay_giam_sat,
    s.is_active,
    s.is_seen,
    s.created_at,
    s.updated_at,
    k.ma_khoa AS ma_khoa_phong,
    k.ten_khoa AS ten_khoa_phong,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
    ns.ho_ten AS ten_nguoi_giam_sat,
    ns.ma_nv AS ma_nguoi_giam_sat,
    ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
    ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc,
    ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
    ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
    ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
    ct.ten_cach_thuc AS cach_thuc_giam_sat,
    ( SELECT count(*) AS count
           FROM public.fact_giam_sat_vst o
          WHERE (o.session_id = s.id)) AS tong_co_hoi,
    ( SELECT count(*) AS count
           FROM public.fact_giam_sat_vst o
          WHERE ((o.session_id = s.id) AND ((lower(public.unaccent(o.hanh_dong)) = 'rua tay bang nuoc'::text) OR (lower(public.unaccent(o.hanh_dong)) = 'cha tay bang con'::text)))) AS da_tuan_thu
   FROM (((((public.fact_giam_sat_vst_sessions s
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = s.khoa_id)))
     LEFT JOIN public.dm_khu_vuc_giam_sat kv ON ((kv.id = s.khu_vuc_id)))
     LEFT JOIN public.mdm_nhan_su ns ON ((ns.id = s.nguoi_giam_sat_id)))
     LEFT JOIN public.dm_hinh_thuc_giam_sat ht ON ((ht.id = s.hinh_thuc_id)))
     LEFT JOIN public.dm_cach_thuc_giam_sat ct ON ((ct.id = s.cach_thuc_id)))
  WHERE (COALESCE(s.is_active, true) = true);


--
-- Name: v_fact_kho_hoa_chat_ton_lo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_kho_hoa_chat_ton_lo AS
 SELECT dm_hoa_chat_id,
    ma_lo,
    han_su_dung,
    sum(so_luong_co_dau) AS ton_so_luong
   FROM public.fact_kho_hoa_chat_giao_dich g
  WHERE (COALESCE(is_active, true) = true)
  GROUP BY dm_hoa_chat_id, ma_lo, han_su_dung;


--
-- Name: VIEW v_fact_kho_hoa_chat_ton_lo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_fact_kho_hoa_chat_ton_lo IS 'Tồn theo lô = SUM(so_luong_co_dau) nhóm theo dm_hoa_chat_id + ma_lo + han_su_dung.';


--
-- Name: v_fact_lo_tiet_khuan_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_lo_tiet_khuan_full WITH (security_invoker='true') AS
 SELECT lot.id,
    lot.ma_lo_tiet_khuan,
    lot.thiet_bi_id,
    tb.ten_thiet_bi,
    lot.loai_may_id,
    lm.ma_loai_may,
    lm.ten_loai_may AS ten_loai_tiet_khuan,
        CASE
            WHEN (lot.ket_qua_test IS TRUE) THEN 'HOAN_THANH'::text
            WHEN (lot.ket_qua_test IS FALSE) THEN 'QC_KHONG_DAT'::text
            WHEN (lot.tk_mo_form_qc_at IS NOT NULL) THEN 'CHO_DANH_GIA_QC'::text
            WHEN (lot.tk_chot_nap_at IS NOT NULL) THEN 'DANG_TIET_KHUAN'::text
            ELSE 'DANG_CHUAN_NAP'::text
        END AS trang_thai,
    lot.tk_chot_nap_at,
    lot.tk_mo_form_qc_at,
    lot.tk_qc_json,
    lot.ket_qua_test,
    lot.is_active,
    lot.created_at,
    lot.updated_at
   FROM ((public.fact_lo_tiet_khuan lot
     LEFT JOIN public.dm_thiet_bi tb ON ((tb.id = lot.thiet_bi_id)))
     LEFT JOIN public.dm_loai_may_tiet_khuan lm ON ((lm.id = lot.loai_may_id)));


--
-- Name: v_fact_quy_trinh_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_quy_trinh_full WITH (security_invoker='true') AS
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
    q.ma_ca_mo_id,
    q.vi_tri_kho_id,
    q.ngay_het_han,
    q.is_active,
    b.ten_bo,
    b.ma_bo,
    k.ten_khoa,
    l.ten_loai_dung_cu,
    q.created_at,
    q.updated_at
   FROM ((((public.fact_quy_trinh q
     LEFT JOIN public.dm_tram_cssd t ON ((t.id = q.tram_hien_tai_id)))
     LEFT JOIN public.dm_bo_dung_cu b ON ((q.bo_dung_cu_id = b.id)))
     LEFT JOIN public.dm_khoa_phong k ON ((b.khoa_su_dung_id = k.id)))
     LEFT JOIN public.dm_loai_dung_cu l ON ((b.loai_dung_cu_id = l.id)));


--
-- Name: VIEW v_fact_quy_trinh_full; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_fact_quy_trinh_full IS 'CSSD quy trình đọc: tram_hien_tai_id + alias ma_trang_thai_hien_tai từ dm_tram_cssd.';


--
-- Name: v_fact_su_co_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_su_co_full WITH (security_invoker='true') AS
 SELECT sc.id,
    sc.quy_trinh_id,
    sc.ma_qr_quy_trinh,
    sc.ma_tram_phat_hien,
    sc.loai_su_co_id,
    ls.ten_loai_su_co,
    sc.incident_group,
    sc.incident_type_label,
    COALESCE(NULLIF(concat(sc.incident_group, ':', sc.incident_type_label), ':'::text), ls.ma_loai_su_co) AS ma_loai_su_co,
    sc.mo_ta,
    sc.is_red_alert,
    sc.ma_tram_gay_loi,
    sc.created_at
   FROM (public.fact_su_co sc
     LEFT JOIN public.dm_loai_su_co ls ON ((ls.id = sc.loai_su_co_id)));


--
-- Name: v_gsc_dashboard_rows; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gsc_dashboard_rows WITH (security_invoker='true') AS
 SELECT s.id AS session_id,
    s.ngay_giam_sat,
    s.created_at,
    COALESCE(bk.ma_bk, ''::text) AS loai_bang_kiem,
    s.tong_diem,
    s.khoa_id,
    kp.ten_khoa,
    r.id AS result_id,
    r.value AS result_value
   FROM (((public.fact_giam_sat_chung_sessions s
     LEFT JOIN public.dm_bang_kiem bk ON ((bk.id = s.bang_kiem_id)))
     LEFT JOIN public.dm_khoa_phong kp ON ((kp.id = s.khoa_id)))
     LEFT JOIN public.fact_giam_sat_chung_results r ON ((r.session_id = s.id)))
  WHERE (s.is_active = true);


--
-- Name: v_mdm_nhan_su_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_mdm_nhan_su_full WITH (security_invoker='true') AS
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
    ns.ngay_sinh,
    ns.gioi_tinh,
    ns.so_dien_thoai,
    ns.email,
    ns.extra_data,
    ns.is_active,
    k.ten_khoa,
    t.ten_to,
    nn.ten_nghe_nghiep,
    cv.ten_chuc_vu AS chuc_vu,
    cd.ten_chuc_danh AS chuc_danh,
    r.name AS vai_tro_he_thong_ksnk,
    cv.ten_chuc_vu,
    cd.ten_chuc_danh,
    r.name AS ten_vai_tro,
    ns.created_at,
    ns.updated_at
   FROM ((((((public.mdm_nhan_su ns
     LEFT JOIN public.dm_khoa_phong k ON ((ns.khoa_id = k.id)))
     LEFT JOIN public.dm_nghe_nghiep nn ON ((ns.nghe_nghiep_id = nn.id)))
     LEFT JOIN public.dm_chuc_danh cd ON ((ns.chuc_danh_id = cd.id)))
     LEFT JOIN public.dm_chuc_vu cv ON ((ns.chuc_vu_id = cv.id)))
     LEFT JOIN public.dm_to_cong_tac t ON ((ns.to_id = t.id)))
     LEFT JOIN public.dm_roles r ON ((ns.vai_tro_he_thong_id = r.id)));


--
-- Name: VIEW v_mdm_nhan_su_full; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_mdm_nhan_su_full IS 'MDM nhân sự: FK trên mdm_nhan_su; chuc_vu/chuc_danh/vai_tro_he_thong_ksnk là alias JOIN dm_*.';


--
-- Name: v_role_permissions_matrix; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_role_permissions_matrix AS
 SELECT r.id AS role_id,
    r.name AS role_name,
    array_agg(rp.permission_id) FILTER (WHERE (rp.permission_id IS NOT NULL)) AS permission_ids
   FROM (public.dm_roles r
     LEFT JOIN public.rel_role_permissions rp ON ((r.id = rp.role_id)))
  GROUP BY r.id, r.name;


--
-- Name: v_staff_auth_overview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_staff_auth_overview AS
 SELECT ns.id,
    ns.ma_nv,
    ns.ho_ten,
    ns.email,
    ns.is_active,
    ns.auth_user_id,
    array_agg(r.name) FILTER (WHERE (r.name IS NOT NULL)) AS role_names
   FROM ((public.mdm_nhan_su ns
     LEFT JOIN public.rel_user_roles ur ON ((ns.auth_user_id = ur.user_id)))
     LEFT JOIN public.dm_roles r ON ((ur.role_id = r.id)))
  GROUP BY ns.id, ns.ma_nv, ns.ho_ten, ns.email, ns.is_active, ns.auth_user_id;


--
-- Name: dm_bang_kiem danh_muc_bang_kiem_ma_bk_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_bang_kiem
    ADD CONSTRAINT danh_muc_bang_kiem_ma_bk_key UNIQUE (ma_bk);


--
-- Name: dm_bang_kiem danh_muc_bang_kiem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_bang_kiem
    ADD CONSTRAINT danh_muc_bang_kiem_pkey PRIMARY KEY (id);


--
-- Name: dm_bo_dung_cu_chi_tiet dm_bo_dung_cu_chi_tiet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_bo_dung_cu_chi_tiet
    ADD CONSTRAINT dm_bo_dung_cu_chi_tiet_pkey PRIMARY KEY (id);


--
-- Name: dm_bo_dung_cu dm_bo_dung_cu_ma_bo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_bo_dung_cu
    ADD CONSTRAINT dm_bo_dung_cu_ma_bo_key UNIQUE (ma_bo);


--
-- Name: dm_bo_dung_cu dm_bo_dung_cu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_bo_dung_cu
    ADD CONSTRAINT dm_bo_dung_cu_pkey PRIMARY KEY (id);


--
-- Name: dm_cach_thuc_giam_sat dm_cach_thuc_giam_sat_ma_cach_thuc_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_cach_thuc_giam_sat
    ADD CONSTRAINT dm_cach_thuc_giam_sat_ma_cach_thuc_key UNIQUE (ma_cach_thuc);


--
-- Name: dm_cach_thuc_giam_sat dm_cach_thuc_giam_sat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_cach_thuc_giam_sat
    ADD CONSTRAINT dm_cach_thuc_giam_sat_pkey PRIMARY KEY (id);


--
-- Name: dm_chuc_danh dm_chuc_danh_legacy_danh_muc_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_chuc_danh
    ADD CONSTRAINT dm_chuc_danh_legacy_danh_muc_id_key UNIQUE (legacy_danh_muc_id);


--
-- Name: dm_chuc_danh dm_chuc_danh_ma_chuc_danh_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_chuc_danh
    ADD CONSTRAINT dm_chuc_danh_ma_chuc_danh_key UNIQUE (ma_chuc_danh);


--
-- Name: dm_chuc_danh dm_chuc_danh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_chuc_danh
    ADD CONSTRAINT dm_chuc_danh_pkey PRIMARY KEY (id);


--
-- Name: dm_chuc_vu dm_chuc_vu_legacy_danh_muc_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_chuc_vu
    ADD CONSTRAINT dm_chuc_vu_legacy_danh_muc_id_key UNIQUE (legacy_danh_muc_id);


--
-- Name: dm_chuc_vu dm_chuc_vu_ma_chuc_vu_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_chuc_vu
    ADD CONSTRAINT dm_chuc_vu_ma_chuc_vu_key UNIQUE (ma_chuc_vu);


--
-- Name: dm_chuc_vu dm_chuc_vu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_chuc_vu
    ADD CONSTRAINT dm_chuc_vu_pkey PRIMARY KEY (id);


--
-- Name: dm_hinh_thuc_giam_sat dm_hinh_thuc_giam_sat_ma_hinh_thuc_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_hinh_thuc_giam_sat
    ADD CONSTRAINT dm_hinh_thuc_giam_sat_ma_hinh_thuc_key UNIQUE (ma_hinh_thuc);


--
-- Name: dm_hinh_thuc_giam_sat dm_hinh_thuc_giam_sat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_hinh_thuc_giam_sat
    ADD CONSTRAINT dm_hinh_thuc_giam_sat_pkey PRIMARY KEY (id);


--
-- Name: dm_hoa_chat dm_hoa_chat_ma_hoa_chat_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_hoa_chat
    ADD CONSTRAINT dm_hoa_chat_ma_hoa_chat_key UNIQUE (ma_hoa_chat);


--
-- Name: dm_hoa_chat dm_hoa_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_hoa_chat
    ADD CONSTRAINT dm_hoa_chat_pkey PRIMARY KEY (id);


--
-- Name: dm_khoa_phong dm_khoa_phong_ma_khoa_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_khoa_phong
    ADD CONSTRAINT dm_khoa_phong_ma_khoa_key UNIQUE (ma_khoa);


--
-- Name: dm_khoa_phong dm_khoa_phong_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_khoa_phong
    ADD CONSTRAINT dm_khoa_phong_pkey PRIMARY KEY (id);


--
-- Name: dm_khoi_khoa dm_khoi_khoa_legacy_danh_muc_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_khoi_khoa
    ADD CONSTRAINT dm_khoi_khoa_legacy_danh_muc_id_key UNIQUE (legacy_danh_muc_id);


--
-- Name: dm_khoi_khoa dm_khoi_khoa_ma_khoi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_khoi_khoa
    ADD CONSTRAINT dm_khoi_khoa_ma_khoi_key UNIQUE (ma_khoi);


--
-- Name: dm_khoi_khoa dm_khoi_khoa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_khoi_khoa
    ADD CONSTRAINT dm_khoi_khoa_pkey PRIMARY KEY (id);


--
-- Name: dm_khu_vuc_giam_sat dm_khu_vuc_giam_sat_legacy_danh_muc_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_khu_vuc_giam_sat
    ADD CONSTRAINT dm_khu_vuc_giam_sat_legacy_danh_muc_id_key UNIQUE (legacy_danh_muc_id);


--
-- Name: dm_khu_vuc_giam_sat dm_khu_vuc_giam_sat_ma_khu_vuc_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_khu_vuc_giam_sat
    ADD CONSTRAINT dm_khu_vuc_giam_sat_ma_khu_vuc_key UNIQUE (ma_khu_vuc);


--
-- Name: dm_khu_vuc_giam_sat dm_khu_vuc_giam_sat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_khu_vuc_giam_sat
    ADD CONSTRAINT dm_khu_vuc_giam_sat_pkey PRIMARY KEY (id);


--
-- Name: dm_loai_cong_viec dm_loai_cong_viec_ma_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_cong_viec
    ADD CONSTRAINT dm_loai_cong_viec_ma_key UNIQUE (ma);


--
-- Name: dm_loai_cong_viec dm_loai_cong_viec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_cong_viec
    ADD CONSTRAINT dm_loai_cong_viec_pkey PRIMARY KEY (id);


--
-- Name: dm_loai_dung_cu dm_loai_dung_cu_ma_loai_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_dung_cu
    ADD CONSTRAINT dm_loai_dung_cu_ma_loai_key UNIQUE (ma_loai);


--
-- Name: dm_loai_dung_cu dm_loai_dung_cu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_dung_cu
    ADD CONSTRAINT dm_loai_dung_cu_pkey PRIMARY KEY (id);


--
-- Name: dm_loai_may_tiet_khuan dm_loai_may_tiet_khuan_legacy_danh_muc_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_may_tiet_khuan
    ADD CONSTRAINT dm_loai_may_tiet_khuan_legacy_danh_muc_id_key UNIQUE (legacy_danh_muc_id);


--
-- Name: dm_loai_may_tiet_khuan dm_loai_may_tiet_khuan_ma_loai_may_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_may_tiet_khuan
    ADD CONSTRAINT dm_loai_may_tiet_khuan_ma_loai_may_key UNIQUE (ma_loai_may);


--
-- Name: dm_loai_may_tiet_khuan dm_loai_may_tiet_khuan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_may_tiet_khuan
    ADD CONSTRAINT dm_loai_may_tiet_khuan_pkey PRIMARY KEY (id);


--
-- Name: dm_loai_nkbv dm_loai_nkbv_ma_loai_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_nkbv
    ADD CONSTRAINT dm_loai_nkbv_ma_loai_key UNIQUE (ma_loai);


--
-- Name: dm_loai_nkbv dm_loai_nkbv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_nkbv
    ADD CONSTRAINT dm_loai_nkbv_pkey PRIMARY KEY (id);


--
-- Name: dm_loai_su_co dm_loai_su_co_legacy_danh_muc_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_su_co
    ADD CONSTRAINT dm_loai_su_co_legacy_danh_muc_id_key UNIQUE (legacy_danh_muc_id);


--
-- Name: dm_loai_su_co dm_loai_su_co_ma_loai_su_co_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_su_co
    ADD CONSTRAINT dm_loai_su_co_ma_loai_su_co_key UNIQUE (ma_loai_su_co);


--
-- Name: dm_loai_su_co dm_loai_su_co_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_loai_su_co
    ADD CONSTRAINT dm_loai_su_co_pkey PRIMARY KEY (id);


--
-- Name: dm_nghe_nghiep dm_nghe_nghiep_legacy_danh_muc_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_nghe_nghiep
    ADD CONSTRAINT dm_nghe_nghiep_legacy_danh_muc_id_key UNIQUE (legacy_danh_muc_id);


--
-- Name: dm_nghe_nghiep dm_nghe_nghiep_ma_nghe_nghiep_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_nghe_nghiep
    ADD CONSTRAINT dm_nghe_nghiep_ma_nghe_nghiep_key UNIQUE (ma_nghe_nghiep);


--
-- Name: dm_nghe_nghiep dm_nghe_nghiep_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_nghe_nghiep
    ADD CONSTRAINT dm_nghe_nghiep_pkey PRIMARY KEY (id);


--
-- Name: dm_thiet_bi dm_thiet_bi_ma_thiet_bi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_thiet_bi
    ADD CONSTRAINT dm_thiet_bi_ma_thiet_bi_key UNIQUE (ma_thiet_bi);


--
-- Name: dm_thiet_bi dm_thiet_bi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_thiet_bi
    ADD CONSTRAINT dm_thiet_bi_pkey PRIMARY KEY (id);


--
-- Name: dm_to_cong_tac dm_to_cong_tac_legacy_danh_muc_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_to_cong_tac
    ADD CONSTRAINT dm_to_cong_tac_legacy_danh_muc_id_key UNIQUE (legacy_danh_muc_id);


--
-- Name: dm_to_cong_tac dm_to_cong_tac_ma_to_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_to_cong_tac
    ADD CONSTRAINT dm_to_cong_tac_ma_to_key UNIQUE (ma_to);


--
-- Name: dm_to_cong_tac dm_to_cong_tac_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_to_cong_tac
    ADD CONSTRAINT dm_to_cong_tac_pkey PRIMARY KEY (id);


--
-- Name: dm_tram_cssd dm_tram_cssd_ma_tram_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_tram_cssd
    ADD CONSTRAINT dm_tram_cssd_ma_tram_key UNIQUE (ma_tram);


--
-- Name: dm_tram_cssd dm_tram_cssd_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_tram_cssd
    ADD CONSTRAINT dm_tram_cssd_pkey PRIMARY KEY (id);


--
-- Name: dm_trang_thai_cong_viec dm_trang_thai_cong_viec_ma_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_trang_thai_cong_viec
    ADD CONSTRAINT dm_trang_thai_cong_viec_ma_key UNIQUE (ma);


--
-- Name: dm_trang_thai_cong_viec dm_trang_thai_cong_viec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_trang_thai_cong_viec
    ADD CONSTRAINT dm_trang_thai_cong_viec_pkey PRIMARY KEY (id);


--
-- Name: dm_trang_thai_nkbv_ca dm_trang_thai_nkbv_ca_ma_trang_thai_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_trang_thai_nkbv_ca
    ADD CONSTRAINT dm_trang_thai_nkbv_ca_ma_trang_thai_key UNIQUE (ma_trang_thai);


--
-- Name: dm_trang_thai_nkbv_ca dm_trang_thai_nkbv_ca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_trang_thai_nkbv_ca
    ADD CONSTRAINT dm_trang_thai_nkbv_ca_pkey PRIMARY KEY (id);


--
-- Name: dm_vi_tri_kho dm_vi_tri_kho_ma_vi_tri_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_vi_tri_kho
    ADD CONSTRAINT dm_vi_tri_kho_ma_vi_tri_key UNIQUE (ma_vi_tri);


--
-- Name: dm_vi_tri_kho dm_vi_tri_kho_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_vi_tri_kho
    ADD CONSTRAINT dm_vi_tri_kho_pkey PRIMARY KEY (id);


--
-- Name: fact_bao_tri_thiet_bi fact_bao_tri_thiet_bi_ma_phieu_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_bao_tri_thiet_bi
    ADD CONSTRAINT fact_bao_tri_thiet_bi_ma_phieu_key UNIQUE (ma_phieu);


--
-- Name: fact_bao_tri_thiet_bi fact_bao_tri_thiet_bi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_bao_tri_thiet_bi
    ADD CONSTRAINT fact_bao_tri_thiet_bi_pkey PRIMARY KEY (id);


--
-- Name: fact_bv103_audit_log fact_bv103_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_bv103_audit_log
    ADD CONSTRAINT fact_bv103_audit_log_pkey PRIMARY KEY (id);


--
-- Name: fact_cong_viec_dinh_ky fact_cong_viec_dinh_ky_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec_dinh_ky
    ADD CONSTRAINT fact_cong_viec_dinh_ky_pkey PRIMARY KEY (id);


--
-- Name: fact_cong_viec_hoat_dong fact_cong_viec_hoat_dong_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec_hoat_dong
    ADD CONSTRAINT fact_cong_viec_hoat_dong_pkey PRIMARY KEY (id);


--
-- Name: fact_cong_viec fact_cong_viec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_pkey PRIMARY KEY (id);


--
-- Name: fact_cssd_dieu_chuyen_thanh_phan fact_cssd_dieu_chuyen_thanh_phan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cssd_dieu_chuyen_thanh_phan
    ADD CONSTRAINT fact_cssd_dieu_chuyen_thanh_phan_pkey PRIMARY KEY (id);


--
-- Name: fact_cssd_lifecycle_event fact_cssd_lifecycle_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cssd_lifecycle_event
    ADD CONSTRAINT fact_cssd_lifecycle_event_pkey PRIMARY KEY (id);


--
-- Name: fact_kho_hoa_chat_giao_dich fact_kho_hc_ma_phieu_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_hoa_chat_giao_dich
    ADD CONSTRAINT fact_kho_hc_ma_phieu_key UNIQUE (ma_phieu);


--
-- Name: fact_kho_hoa_chat_giao_dich fact_kho_hoa_chat_giao_dich_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_hoa_chat_giao_dich
    ADD CONSTRAINT fact_kho_hoa_chat_giao_dich_pkey PRIMARY KEY (id);


--
-- Name: fact_qlcv_danh_gia_thang fact_qlcv_danh_gia_thang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_qlcv_danh_gia_thang
    ADD CONSTRAINT fact_qlcv_danh_gia_thang_pkey PRIMARY KEY (id);


--
-- Name: fact_qlcv_danh_gia_thang fact_qlcv_danh_gia_thang_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_qlcv_danh_gia_thang
    ADD CONSTRAINT fact_qlcv_danh_gia_thang_uq UNIQUE (nhan_su_id, thang);


--
-- Name: fact_quy_trinh_thanh_phan fact_quy_trinh_thanh_phan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh_thanh_phan
    ADD CONSTRAINT fact_quy_trinh_thanh_phan_pkey PRIMARY KEY (id);


--
-- Name: fact_giam_sat_chung_results giam_sat_chung_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_results
    ADD CONSTRAINT giam_sat_chung_results_pkey PRIMARY KEY (id);


--
-- Name: fact_giam_sat_chung_sessions giam_sat_chung_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_pkey PRIMARY KEY (id);


--
-- Name: fact_giam_sat_nkbv_ca giam_sat_nkbv_ca_ma_ca_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_nkbv_ca
    ADD CONSTRAINT giam_sat_nkbv_ca_ma_ca_key UNIQUE (ma_ca);


--
-- Name: fact_giam_sat_nkbv_ca giam_sat_nkbv_ca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_nkbv_ca
    ADD CONSTRAINT giam_sat_nkbv_ca_pkey PRIMARY KEY (id);


--
-- Name: fact_giam_sat_vst giam_sat_vst_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst
    ADD CONSTRAINT giam_sat_vst_pkey PRIMARY KEY (id);


--
-- Name: fact_giam_sat_vst_sessions giam_sat_vst_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst_sessions
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
-- Name: fact_kho_chi_tiet kho_chi_tiet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_chi_tiet
    ADD CONSTRAINT kho_chi_tiet_pkey PRIMARY KEY (id);


--
-- Name: fact_kho_giao_dich kho_giao_dich_ma_giao_dich_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_giao_dich
    ADD CONSTRAINT kho_giao_dich_ma_giao_dich_key UNIQUE (ma_giao_dich);


--
-- Name: fact_kho_giao_dich kho_giao_dich_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_giao_dich
    ADD CONSTRAINT kho_giao_dich_pkey PRIMARY KEY (id);


--
-- Name: fact_lo_tiet_khuan lo_tiet_khuan_ma_lo_tiet_khuan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_lo_tiet_khuan
    ADD CONSTRAINT lo_tiet_khuan_ma_lo_tiet_khuan_key UNIQUE (ma_lo_tiet_khuan);


--
-- Name: fact_lo_tiet_khuan lo_tiet_khuan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_lo_tiet_khuan
    ADD CONSTRAINT lo_tiet_khuan_pkey PRIMARY KEY (id);


--
-- Name: mdm_field_registry mdm_field_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_field_registry
    ADD CONSTRAINT mdm_field_registry_pkey PRIMARY KEY (id);


--
-- Name: mdm_governance_suggestion mdm_governance_suggestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_governance_suggestion
    ADD CONSTRAINT mdm_governance_suggestion_pkey PRIMARY KEY (id);


--
-- Name: mdm_governance_suggestion mdm_governance_suggestion_table_name_column_name_suggestion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_governance_suggestion
    ADD CONSTRAINT mdm_governance_suggestion_table_name_column_name_suggestion_key UNIQUE (table_name, column_name, suggestion_type, status);


--
-- Name: fact_nhat_ky_quet nhat_ky_quet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_nhat_ky_quet
    ADD CONSTRAINT nhat_ky_quet_pkey PRIMARY KEY (id);


--
-- Name: dm_permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: fact_quy_trinh quy_trinh_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT quy_trinh_pkey PRIMARY KEY (id);


--
-- Name: rel_role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rel_role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: dm_roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: dm_roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: fact_su_co_chi_tiet su_co_chi_tiet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_su_co_chi_tiet
    ADD CONSTRAINT su_co_chi_tiet_pkey PRIMARY KEY (id);


--
-- Name: fact_su_co su_co_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_su_co
    ADD CONSTRAINT su_co_pkey PRIMARY KEY (id);


--
-- Name: dm_tieu_chi_bang_kiem tieu_chi_bang_kiem_ma_tc_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_tieu_chi_bang_kiem
    ADD CONSTRAINT tieu_chi_bang_kiem_ma_tc_key UNIQUE (ma_tc);


--
-- Name: dm_tieu_chi_bang_kiem tieu_chi_bang_kiem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_tieu_chi_bang_kiem
    ADD CONSTRAINT tieu_chi_bang_kiem_pkey PRIMARY KEY (id);


--
-- Name: mdm_field_registry uq_mdm_field_registry; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_field_registry
    ADD CONSTRAINT uq_mdm_field_registry UNIQUE (table_name, column_name);


--
-- Name: dm_permissions uq_permissions_module_action; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_permissions
    ADD CONSTRAINT uq_permissions_module_action UNIQUE (module_name, action);


--
-- Name: rel_role_permissions uq_role_permissions; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rel_role_permissions
    ADD CONSTRAINT uq_role_permissions UNIQUE (role_id, permission_id);


--
-- Name: rel_user_roles uq_user_roles; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rel_user_roles
    ADD CONSTRAINT uq_user_roles UNIQUE (user_id, role_id);


--
-- Name: rel_user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rel_user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: brin_gsc_sessions_ngay_giam_sat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brin_gsc_sessions_ngay_giam_sat ON public.fact_giam_sat_chung_sessions USING brin (ngay_giam_sat);


--
-- Name: brin_vst_sessions_ngay_giam_sat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brin_vst_sessions_ngay_giam_sat ON public.fact_giam_sat_vst_sessions USING brin (ngay_giam_sat);


--
-- Name: idx_cssd_dieu_chuyen_den; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cssd_dieu_chuyen_den ON public.fact_cssd_dieu_chuyen_thanh_phan USING btree (den_quy_trinh_id);


--
-- Name: idx_cssd_dieu_chuyen_tu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cssd_dieu_chuyen_tu ON public.fact_cssd_dieu_chuyen_thanh_phan USING btree (tu_quy_trinh_id);


--
-- Name: idx_danh_muc_bk_ma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_danh_muc_bk_ma ON public.dm_bang_kiem USING btree (ma_bk);


--
-- Name: idx_dm_bo_dung_cu_chi_tiet_loai_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_bo_dung_cu_chi_tiet_loai_id ON public.dm_bo_dung_cu_chi_tiet USING btree (loai_dung_cu_id);


--
-- Name: idx_dm_bo_dung_cu_chi_tiet_ma_loai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_bo_dung_cu_chi_tiet_ma_loai ON public.dm_bo_dung_cu_chi_tiet USING btree (ma_loai);


--
-- Name: idx_dm_bo_dung_cu_khoa_su_dung_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_bo_dung_cu_khoa_su_dung_id ON public.dm_bo_dung_cu USING btree (khoa_su_dung_id);


--
-- Name: idx_dm_bo_dung_cu_loai_dung_cu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_bo_dung_cu_loai_dung_cu_id ON public.dm_bo_dung_cu USING btree (loai_dung_cu_id);


--
-- Name: idx_dm_bo_dung_cu_ma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_bo_dung_cu_ma ON public.dm_bo_dung_cu USING btree (ma_bo);


--
-- Name: idx_dm_cach_thuc_giam_sat_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_cach_thuc_giam_sat_active ON public.dm_cach_thuc_giam_sat USING btree (is_active);


--
-- Name: idx_dm_chuc_danh_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_chuc_danh_active ON public.dm_chuc_danh USING btree (is_active);


--
-- Name: idx_dm_chuc_vu_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_chuc_vu_active ON public.dm_chuc_vu USING btree (is_active);


--
-- Name: idx_dm_hinh_thuc_giam_sat_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_hinh_thuc_giam_sat_active ON public.dm_hinh_thuc_giam_sat USING btree (is_active);


--
-- Name: idx_dm_khoa_phong_khoi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_khoa_phong_khoi_id ON public.dm_khoa_phong USING btree (khoi_id);


--
-- Name: idx_dm_khoi_khoa_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_khoi_khoa_active ON public.dm_khoi_khoa USING btree (is_active);


--
-- Name: idx_dm_khu_vuc_giam_sat_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_khu_vuc_giam_sat_active ON public.dm_khu_vuc_giam_sat USING btree (is_active);


--
-- Name: idx_dm_loai_dung_cu_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_loai_dung_cu_active ON public.dm_loai_dung_cu USING btree (is_active);


--
-- Name: idx_dm_loai_may_tiet_khuan_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_loai_may_tiet_khuan_active ON public.dm_loai_may_tiet_khuan USING btree (is_active);


--
-- Name: idx_dm_loai_su_co_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_loai_su_co_active ON public.dm_loai_su_co USING btree (is_active);


--
-- Name: idx_dm_nghe_nghiep_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_nghe_nghiep_active ON public.dm_nghe_nghiep USING btree (is_active);


--
-- Name: idx_dm_roles_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_roles_is_active ON public.dm_roles USING btree (is_active);


--
-- Name: idx_dm_to_cong_tac_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_to_cong_tac_active ON public.dm_to_cong_tac USING btree (is_active);


--
-- Name: idx_fact_bao_tri_one_dang_per_tb; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_fact_bao_tri_one_dang_per_tb ON public.fact_bao_tri_thiet_bi USING btree (thiet_bi_id) WHERE (((trang_thai)::text = 'DANG_THUC_HIEN'::text) AND COALESCE(is_active, true));


--
-- Name: idx_fact_bao_tri_tb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_bao_tri_tb ON public.fact_bao_tri_thiet_bi USING btree (thiet_bi_id);


--
-- Name: idx_fact_bao_tri_trang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_bao_tri_trang ON public.fact_bao_tri_thiet_bi USING btree (trang_thai);


--
-- Name: idx_fact_bv103_audit_log_table_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_bv103_audit_log_table_record ON public.fact_bv103_audit_log USING btree (table_name, record_id, changed_at DESC);


--
-- Name: idx_fact_cong_viec_hoat_dong_cv_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cong_viec_hoat_dong_cv_created ON public.fact_cong_viec_hoat_dong USING btree (id_cong_viec, created_at DESC);


--
-- Name: idx_fact_cong_viec_loai_cong_viec_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cong_viec_loai_cong_viec_id ON public.fact_cong_viec USING btree (loai_cong_viec_id) WHERE (loai_cong_viec_id IS NOT NULL);


--
-- Name: idx_fact_cong_viec_trang_thai_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cong_viec_trang_thai_id ON public.fact_cong_viec USING btree (trang_thai_id) WHERE (trang_thai_id IS NOT NULL);


--
-- Name: idx_fact_cssd_lifecycle_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cssd_lifecycle_created ON public.fact_cssd_lifecycle_event USING btree (created_at DESC);


--
-- Name: idx_fact_cssd_lifecycle_quy_trinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cssd_lifecycle_quy_trinh ON public.fact_cssd_lifecycle_event USING btree (quy_trinh_id);


--
-- Name: idx_fact_cv_cha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cv_cha ON public.fact_cong_viec USING btree (cong_viec_cha_id);


--
-- Name: idx_fact_cv_dinh_ky_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cv_dinh_ky_active ON public.fact_cong_viec_dinh_ky USING btree (is_active);


--
-- Name: idx_fact_cv_hd_cv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cv_hd_cv ON public.fact_cong_viec_hoat_dong USING btree (id_cong_viec);


--
-- Name: idx_fact_cv_hoat_dong_cv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_cv_hoat_dong_cv ON public.fact_cong_viec_hoat_dong USING btree (id_cong_viec);


--
-- Name: idx_fact_gsc_sessions_cach_thuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_gsc_sessions_cach_thuc_id ON public.fact_giam_sat_chung_sessions USING btree (cach_thuc_id) WHERE (cach_thuc_id IS NOT NULL);


--
-- Name: idx_fact_gsc_sessions_hinh_thuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_gsc_sessions_hinh_thuc_id ON public.fact_giam_sat_chung_sessions USING btree (hinh_thuc_id) WHERE (hinh_thuc_id IS NOT NULL);


--
-- Name: idx_fact_kho_hc_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_kho_hc_created ON public.fact_kho_hoa_chat_giao_dich USING btree (created_at DESC);


--
-- Name: idx_fact_kho_hc_dm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_kho_hc_dm ON public.fact_kho_hoa_chat_giao_dich USING btree (dm_hoa_chat_id);


--
-- Name: idx_fact_kho_hc_loai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_kho_hc_loai ON public.fact_kho_hoa_chat_giao_dich USING btree (loai_giao_dich);


--
-- Name: idx_fact_qlcv_dgt_nhan_su; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_qlcv_dgt_nhan_su ON public.fact_qlcv_danh_gia_thang USING btree (nhan_su_id);


--
-- Name: idx_fact_qlcv_dgt_thang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_qlcv_dgt_thang ON public.fact_qlcv_danh_gia_thang USING btree (thang DESC);


--
-- Name: idx_fact_quy_trinh_bo_dung_cu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_quy_trinh_bo_dung_cu_id ON public.fact_quy_trinh USING btree (bo_dung_cu_id) WHERE (bo_dung_cu_id IS NOT NULL);


--
-- Name: idx_fact_quy_trinh_cha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_quy_trinh_cha ON public.fact_quy_trinh USING btree (quy_trinh_cha_id);


--
-- Name: idx_fact_quy_trinh_thanh_phan_qt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_quy_trinh_thanh_phan_qt ON public.fact_quy_trinh_thanh_phan USING btree (quy_trinh_id);


--
-- Name: idx_fact_quy_trinh_tram_hien_tai_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_quy_trinh_tram_hien_tai_id ON public.fact_quy_trinh USING btree (tram_hien_tai_id) WHERE (tram_hien_tai_id IS NOT NULL);


--
-- Name: idx_fact_vst_obs_khoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_obs_khoa_id ON public.fact_giam_sat_vst USING btree (khoa_id) WHERE (khoa_id IS NOT NULL);


--
-- Name: idx_fact_vst_obs_khu_vuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_obs_khu_vuc_id ON public.fact_giam_sat_vst USING btree (khu_vuc_id) WHERE (khu_vuc_id IS NOT NULL);


--
-- Name: idx_fact_vst_obs_nghe_nghiep_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_obs_nghe_nghiep_id ON public.fact_giam_sat_vst USING btree (nghe_nghiep_id) WHERE (nghe_nghiep_id IS NOT NULL);


--
-- Name: idx_fact_vst_obs_nhan_vien_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_obs_nhan_vien_id ON public.fact_giam_sat_vst USING btree (nhan_vien_id) WHERE (nhan_vien_id IS NOT NULL);


--
-- Name: idx_fact_vst_sessions_cach_thuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_sessions_cach_thuc_id ON public.fact_giam_sat_vst_sessions USING btree (cach_thuc_id) WHERE (cach_thuc_id IS NOT NULL);


--
-- Name: idx_fact_vst_sessions_hinh_thuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_vst_sessions_hinh_thuc_id ON public.fact_giam_sat_vst_sessions USING btree (hinh_thuc_id) WHERE (hinh_thuc_id IS NOT NULL);


--
-- Name: idx_giam_sat_chung_results_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_chung_results_session_id ON public.fact_giam_sat_chung_results USING btree (session_id);


--
-- Name: idx_giam_sat_chung_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_chung_supervisor ON public.fact_giam_sat_chung_sessions USING btree (nguoi_giam_sat_id);


--
-- Name: idx_giam_sat_nkbv_ca_khoa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_nkbv_ca_khoa ON public.fact_giam_sat_nkbv_ca USING btree (khoa_ghi_nhan_id);


--
-- Name: idx_giam_sat_nkbv_ca_loai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_nkbv_ca_loai ON public.fact_giam_sat_nkbv_ca USING btree (loai_nkbv_id);


--
-- Name: idx_giam_sat_nkbv_ca_ngay_phat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_nkbv_ca_ngay_phat ON public.fact_giam_sat_nkbv_ca USING btree (ngay_phat_hien DESC);


--
-- Name: idx_giam_sat_nkbv_ca_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_nkbv_ca_trang_thai ON public.fact_giam_sat_nkbv_ca USING btree (trang_thai_id);


--
-- Name: idx_giam_sat_vst_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_vst_session_id ON public.fact_giam_sat_vst USING btree (session_id);


--
-- Name: idx_giam_sat_vst_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_giam_sat_vst_supervisor ON public.fact_giam_sat_vst_sessions USING btree (nguoi_giam_sat_id);


--
-- Name: idx_gsc_results_criterion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_results_criterion_id ON public.fact_giam_sat_chung_results USING btree (criterion_id);


--
-- Name: idx_gsc_results_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_results_session_id ON public.fact_giam_sat_chung_results USING btree (session_id);


--
-- Name: idx_gsc_sessions_active_ngay_bang_kiem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_active_ngay_bang_kiem ON public.fact_giam_sat_chung_sessions USING btree (is_active, ngay_giam_sat, bang_kiem_id) WHERE (is_active = true);


--
-- Name: idx_gsc_sessions_bang_kiem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_bang_kiem_id ON public.fact_giam_sat_chung_sessions USING btree (bang_kiem_id) WHERE (bang_kiem_id IS NOT NULL);


--
-- Name: idx_gsc_sessions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_created_at ON public.fact_giam_sat_chung_sessions USING btree (created_at DESC);


--
-- Name: idx_gsc_sessions_khoa_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_khoa_created ON public.fact_giam_sat_chung_sessions USING btree (khoa_id, created_at DESC);


--
-- Name: idx_gsc_sessions_khoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_khoa_id ON public.fact_giam_sat_chung_sessions USING btree (khoa_id);


--
-- Name: idx_gsc_sessions_khu_vuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_khu_vuc_id ON public.fact_giam_sat_chung_sessions USING btree (khu_vuc_id);


--
-- Name: idx_gsc_sessions_ngay_bang_kiem_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_ngay_bang_kiem_active ON public.fact_giam_sat_chung_sessions USING btree (ngay_giam_sat, bang_kiem_id) WHERE (is_active = true);


--
-- Name: idx_gsc_sessions_nghe_nghiep_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_nghe_nghiep_id ON public.fact_giam_sat_chung_sessions USING btree (nghe_nghiep_id);


--
-- Name: idx_gsc_sessions_nguoi_giam_sat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_nguoi_giam_sat_id ON public.fact_giam_sat_chung_sessions USING btree (nguoi_giam_sat_id);


--
-- Name: idx_gsc_sessions_nhan_vien_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_sessions_nhan_vien_id ON public.fact_giam_sat_chung_sessions USING btree (nhan_vien_id);


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

CREATE INDEX idx_kho_chi_tiet_quy_trinh ON public.fact_kho_chi_tiet USING btree (quy_trinh_id);


--
-- Name: idx_lo_tiet_khuan_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lo_tiet_khuan_created_at ON public.fact_lo_tiet_khuan USING btree (created_at DESC);


--
-- Name: idx_lo_tiet_khuan_ma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lo_tiet_khuan_ma ON public.fact_lo_tiet_khuan USING btree (ma_lo_tiet_khuan);


--
-- Name: idx_lo_tiet_khuan_thiet_bi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lo_tiet_khuan_thiet_bi_id ON public.fact_lo_tiet_khuan USING btree (thiet_bi_id) WHERE (thiet_bi_id IS NOT NULL);


--
-- Name: idx_mdm_field_registry_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mdm_field_registry_active ON public.mdm_field_registry USING btree (table_name, is_active);


--
-- Name: idx_mdm_governance_suggestion_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mdm_governance_suggestion_status ON public.mdm_governance_suggestion USING btree (status, created_at DESC);


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
-- Name: idx_quy_trinh_han_su_dung; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quy_trinh_han_su_dung ON public.fact_quy_trinh USING btree (han_su_dung);


--
-- Name: idx_quy_trinh_lo_tiet_khuan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quy_trinh_lo_tiet_khuan ON public.fact_quy_trinh USING btree (lo_tiet_khuan_id);


--
-- Name: idx_quy_trinh_ma_vach_qr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quy_trinh_ma_vach_qr ON public.fact_quy_trinh USING btree (ma_qr_quy_trinh);


--
-- Name: idx_quy_trinh_tinh_trang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quy_trinh_tinh_trang ON public.fact_quy_trinh USING btree (tinh_trang);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_permission_id ON public.rel_role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON public.rel_role_permissions USING btree (role_id);


--
-- Name: idx_su_co_chi_tiet_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_chi_tiet_key ON public.fact_su_co_chi_tiet USING btree (ma_chi_tiet_su_co);


--
-- Name: idx_su_co_chi_tiet_su_co; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_chi_tiet_su_co ON public.fact_su_co_chi_tiet USING btree (su_co_id);


--
-- Name: idx_su_co_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_is_active ON public.fact_su_co USING btree (is_active);


--
-- Name: idx_su_co_ma_vach; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_ma_vach ON public.fact_su_co USING btree (ma_qr_quy_trinh);


--
-- Name: idx_su_co_quy_trinh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_quy_trinh ON public.fact_su_co USING btree (quy_trinh_id);


--
-- Name: idx_su_co_red_alert; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_red_alert ON public.fact_su_co USING btree (is_red_alert);


--
-- Name: idx_su_co_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_co_updated_at ON public.fact_su_co USING btree (updated_at DESC);


--
-- Name: idx_tieu_chi_bk_ma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tieu_chi_bk_ma ON public.dm_tieu_chi_bang_kiem USING btree (ma_tc);


--
-- Name: idx_tieu_chi_bk_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tieu_chi_bk_parent ON public.dm_tieu_chi_bang_kiem USING btree (bang_kiem_id);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role_id ON public.rel_user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.rel_user_roles USING btree (user_id);


--
-- Name: idx_vst_obs_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_obs_session_id ON public.fact_giam_sat_vst USING btree (session_id);


--
-- Name: idx_vst_sessions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_created_at ON public.fact_giam_sat_vst_sessions USING btree (created_at DESC);


--
-- Name: idx_vst_sessions_khoa_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_khoa_created ON public.fact_giam_sat_vst_sessions USING btree (khoa_id, created_at DESC);


--
-- Name: idx_vst_sessions_khoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_khoa_id ON public.fact_giam_sat_vst_sessions USING btree (khoa_id);


--
-- Name: idx_vst_sessions_khu_vuc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_khu_vuc_id ON public.fact_giam_sat_vst_sessions USING btree (khu_vuc_id);


--
-- Name: idx_vst_sessions_ngay_khoa_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_ngay_khoa_active ON public.fact_giam_sat_vst_sessions USING btree (ngay_giam_sat, khoa_id) WHERE (COALESCE(is_active, true) = true);


--
-- Name: idx_vst_sessions_nguoi_giam_sat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_nguoi_giam_sat_id ON public.fact_giam_sat_vst_sessions USING btree (nguoi_giam_sat_id);


--
-- Name: idx_vst_sessions_perf_filter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vst_sessions_perf_filter ON public.fact_giam_sat_vst_sessions USING btree (is_active, ngay_giam_sat);


--
-- Name: uq_fact_giam_sat_vst_legacy_csv_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_fact_giam_sat_vst_legacy_csv_row_id ON public.fact_giam_sat_vst USING btree (legacy_csv_row_id) WHERE (legacy_csv_row_id IS NOT NULL);


--
-- Name: uq_fact_quy_trinh_thanh_phan_qt_ten; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_fact_quy_trinh_thanh_phan_qt_ten ON public.fact_quy_trinh_thanh_phan USING btree (quy_trinh_id, ten_dung_cu_le);


--
-- Name: uq_ho_so_nhan_vien_auth_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ho_so_nhan_vien_auth_user_id ON public.mdm_nhan_su USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);


--
-- Name: uq_mdm_nhan_su_email_active_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mdm_nhan_su_email_active_lower ON public.mdm_nhan_su USING btree (lower(TRIM(BOTH FROM email))) WHERE ((is_active IS TRUE) AND (email IS NOT NULL) AND (TRIM(BOTH FROM email) <> ''::text));


--
-- Name: uq_mv_gsc_session_daily; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mv_gsc_session_daily ON public.mv_gsc_session_daily USING btree (ngay, ma_bk, khoa_id);


--
-- Name: fact_giam_sat_chung_sessions trg_audit_gsc_sessions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_gsc_sessions AFTER INSERT OR DELETE OR UPDATE ON public.fact_giam_sat_chung_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_bv103_audit_row();


--
-- Name: fact_giam_sat_vst_sessions trg_audit_vst_sessions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_vst_sessions AFTER INSERT OR DELETE OR UPDATE ON public.fact_giam_sat_vst_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_bv103_audit_row();


--
-- Name: fact_qlcv_danh_gia_thang trg_fact_qlcv_danh_gia_thang_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fact_qlcv_danh_gia_thang_touch BEFORE UPDATE ON public.fact_qlcv_danh_gia_thang FOR EACH ROW EXECUTE FUNCTION public.touch_fact_qlcv_danh_gia_thang();


--
-- Name: mdm_field_registry trg_touch_updated_at_mdm_field_registry; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_updated_at_mdm_field_registry BEFORE UPDATE ON public.mdm_field_registry FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_mdm_registry();


--
-- Name: mdm_governance_suggestion trg_touch_updated_at_mdm_governance_suggestion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_updated_at_mdm_governance_suggestion BEFORE UPDATE ON public.mdm_governance_suggestion FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_mdm_registry();


--
-- Name: dm_bang_kiem trg_update_danh_muc_bk_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_danh_muc_bk_updated_at BEFORE UPDATE ON public.dm_bang_kiem FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dm_tieu_chi_bang_kiem trg_update_tieu_chi_bk_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_tieu_chi_bk_updated_at BEFORE UPDATE ON public.dm_tieu_chi_bang_kiem FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dm_bo_dung_cu_chi_tiet dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_bo_dung_cu_chi_tiet
    ADD CONSTRAINT dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey FOREIGN KEY (bo_dung_cu_id) REFERENCES public.dm_bo_dung_cu(id) ON DELETE CASCADE;


--
-- Name: dm_bo_dung_cu_chi_tiet dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_bo_dung_cu_chi_tiet
    ADD CONSTRAINT dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey FOREIGN KEY (loai_dung_cu_id) REFERENCES public.dm_loai_dung_cu(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dm_bo_dung_cu dm_bo_dung_cu_khoa_su_dung_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_bo_dung_cu
    ADD CONSTRAINT dm_bo_dung_cu_khoa_su_dung_id_fkey FOREIGN KEY (khoa_su_dung_id) REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dm_bo_dung_cu dm_bo_dung_cu_loai_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_bo_dung_cu
    ADD CONSTRAINT dm_bo_dung_cu_loai_dung_cu_id_fkey FOREIGN KEY (loai_dung_cu_id) REFERENCES public.dm_loai_dung_cu(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dm_khoa_phong dm_khoa_phong_khoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_khoa_phong
    ADD CONSTRAINT dm_khoa_phong_khoi_id_fkey FOREIGN KEY (khoi_id) REFERENCES public.dm_khoi_khoa(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_bao_tri_thiet_bi fact_bao_tri_thiet_bi_thiet_bi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_bao_tri_thiet_bi
    ADD CONSTRAINT fact_bao_tri_thiet_bi_thiet_bi_id_fkey FOREIGN KEY (thiet_bi_id) REFERENCES public.dm_thiet_bi(id) ON DELETE RESTRICT;


--
-- Name: fact_cong_viec fact_cong_viec_cong_viec_cha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_cong_viec_cha_id_fkey FOREIGN KEY (cong_viec_cha_id) REFERENCES public.fact_cong_viec(id) ON DELETE CASCADE;


--
-- Name: fact_cong_viec fact_cong_viec_dinh_ky_mau_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_dinh_ky_mau_fk FOREIGN KEY (dinh_ky_mau_id) REFERENCES public.fact_cong_viec_dinh_ky(id) ON DELETE SET NULL;


--
-- Name: fact_cong_viec_dinh_ky fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec_dinh_ky
    ADD CONSTRAINT fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey FOREIGN KEY (nguoi_phu_trach_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: fact_cong_viec_dinh_ky fact_cong_viec_dinh_ky_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec_dinh_ky
    ADD CONSTRAINT fact_cong_viec_dinh_ky_nguoi_tao_id_fkey FOREIGN KEY (nguoi_tao_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: fact_cong_viec_dinh_ky fact_cong_viec_dinh_ky_to_cong_tac_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec_dinh_ky
    ADD CONSTRAINT fact_cong_viec_dinh_ky_to_cong_tac_id_fkey FOREIGN KEY (to_cong_tac_id) REFERENCES public.dm_to_cong_tac(id);


--
-- Name: fact_cong_viec_hoat_dong fact_cong_viec_hoat_dong_id_cong_viec_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec_hoat_dong
    ADD CONSTRAINT fact_cong_viec_hoat_dong_id_cong_viec_fkey FOREIGN KEY (id_cong_viec) REFERENCES public.fact_cong_viec(id) ON DELETE CASCADE;


--
-- Name: fact_cong_viec_hoat_dong fact_cong_viec_hoat_dong_nguoi_thuc_hien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec_hoat_dong
    ADD CONSTRAINT fact_cong_viec_hoat_dong_nguoi_thuc_hien_id_fkey FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: fact_cong_viec fact_cong_viec_khoa_thuc_hien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_khoa_thuc_hien_id_fkey FOREIGN KEY (khoa_thuc_hien_id) REFERENCES public.dm_khoa_phong(id);


--
-- Name: fact_cong_viec fact_cong_viec_nguoi_giao_viec_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_nguoi_giao_viec_id_fkey FOREIGN KEY (nguoi_giao_viec_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: fact_cong_viec fact_cong_viec_nguoi_phu_trach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_nguoi_phu_trach_id_fkey FOREIGN KEY (nguoi_phu_trach_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: fact_cong_viec fact_cong_viec_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_nguoi_tao_id_fkey FOREIGN KEY (nguoi_tao_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: fact_cong_viec fact_cong_viec_to_cong_tac_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec
    ADD CONSTRAINT fact_cong_viec_to_cong_tac_id_fkey FOREIGN KEY (to_cong_tac_id) REFERENCES public.dm_to_cong_tac(id);


--
-- Name: fact_cssd_dieu_chuyen_thanh_phan fact_cssd_dieu_chuyen_thanh_phan_den_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cssd_dieu_chuyen_thanh_phan
    ADD CONSTRAINT fact_cssd_dieu_chuyen_thanh_phan_den_quy_trinh_id_fkey FOREIGN KEY (den_quy_trinh_id) REFERENCES public.fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: fact_cssd_dieu_chuyen_thanh_phan fact_cssd_dieu_chuyen_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cssd_dieu_chuyen_thanh_phan
    ADD CONSTRAINT fact_cssd_dieu_chuyen_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey FOREIGN KEY (dm_bo_dung_cu_chi_tiet_id) REFERENCES public.dm_bo_dung_cu_chi_tiet(id) ON DELETE SET NULL;


--
-- Name: fact_cssd_dieu_chuyen_thanh_phan fact_cssd_dieu_chuyen_thanh_phan_tu_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cssd_dieu_chuyen_thanh_phan
    ADD CONSTRAINT fact_cssd_dieu_chuyen_thanh_phan_tu_quy_trinh_id_fkey FOREIGN KEY (tu_quy_trinh_id) REFERENCES public.fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: fact_cssd_lifecycle_event fact_cssd_lifecycle_event_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cssd_lifecycle_event
    ADD CONSTRAINT fact_cssd_lifecycle_event_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: fact_giam_sat_chung_sessions fact_giam_sat_chung_sessions_cach_thuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_sessions
    ADD CONSTRAINT fact_giam_sat_chung_sessions_cach_thuc_id_fkey FOREIGN KEY (cach_thuc_id) REFERENCES public.dm_cach_thuc_giam_sat(id);


--
-- Name: fact_giam_sat_chung_sessions fact_giam_sat_chung_sessions_hinh_thuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_sessions
    ADD CONSTRAINT fact_giam_sat_chung_sessions_hinh_thuc_id_fkey FOREIGN KEY (hinh_thuc_id) REFERENCES public.dm_hinh_thuc_giam_sat(id);


--
-- Name: fact_giam_sat_vst_sessions fact_giam_sat_vst_sessions_cach_thuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst_sessions
    ADD CONSTRAINT fact_giam_sat_vst_sessions_cach_thuc_id_fkey FOREIGN KEY (cach_thuc_id) REFERENCES public.dm_cach_thuc_giam_sat(id);


--
-- Name: fact_giam_sat_vst_sessions fact_giam_sat_vst_sessions_hinh_thuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst_sessions
    ADD CONSTRAINT fact_giam_sat_vst_sessions_hinh_thuc_id_fkey FOREIGN KEY (hinh_thuc_id) REFERENCES public.dm_hinh_thuc_giam_sat(id);


--
-- Name: fact_kho_hoa_chat_giao_dich fact_kho_hoa_chat_giao_dich_dm_hoa_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_hoa_chat_giao_dich
    ADD CONSTRAINT fact_kho_hoa_chat_giao_dich_dm_hoa_chat_id_fkey FOREIGN KEY (dm_hoa_chat_id) REFERENCES public.dm_hoa_chat(id) ON DELETE RESTRICT;


--
-- Name: fact_qlcv_danh_gia_thang fact_qlcv_danh_gia_thang_evaluated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_qlcv_danh_gia_thang
    ADD CONSTRAINT fact_qlcv_danh_gia_thang_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES public.mdm_nhan_su(id);


--
-- Name: fact_qlcv_danh_gia_thang fact_qlcv_danh_gia_thang_nhan_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_qlcv_danh_gia_thang
    ADD CONSTRAINT fact_qlcv_danh_gia_thang_nhan_su_id_fkey FOREIGN KEY (nhan_su_id) REFERENCES public.mdm_nhan_su(id) ON DELETE CASCADE;


--
-- Name: fact_quy_trinh fact_quy_trinh_quy_trinh_cha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT fact_quy_trinh_quy_trinh_cha_id_fkey FOREIGN KEY (quy_trinh_cha_id) REFERENCES public.fact_quy_trinh(id);


--
-- Name: fact_quy_trinh_thanh_phan fact_quy_trinh_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh_thanh_phan
    ADD CONSTRAINT fact_quy_trinh_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey FOREIGN KEY (dm_bo_dung_cu_chi_tiet_id) REFERENCES public.dm_bo_dung_cu_chi_tiet(id) ON DELETE SET NULL;


--
-- Name: fact_quy_trinh_thanh_phan fact_quy_trinh_thanh_phan_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh_thanh_phan
    ADD CONSTRAINT fact_quy_trinh_thanh_phan_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: fact_quy_trinh fact_quy_trinh_vi_tri_kho_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT fact_quy_trinh_vi_tri_kho_id_fkey FOREIGN KEY (vi_tri_kho_id) REFERENCES public.dm_vi_tri_kho(id);


--
-- Name: fact_cong_viec fk_cong_viec_loai_cong_viec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec
    ADD CONSTRAINT fk_cong_viec_loai_cong_viec FOREIGN KEY (loai_cong_viec_id) REFERENCES public.dm_loai_cong_viec(id) ON DELETE SET NULL;


--
-- Name: fact_cong_viec fk_cong_viec_trang_thai_dm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_cong_viec
    ADD CONSTRAINT fk_cong_viec_trang_thai_dm FOREIGN KEY (trang_thai_id) REFERENCES public.dm_trang_thai_cong_viec(id) ON DELETE SET NULL;


--
-- Name: dm_thiet_bi fk_dm_thiet_bi_loai_may; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_thiet_bi
    ADD CONSTRAINT fk_dm_thiet_bi_loai_may FOREIGN KEY (loai_may_id) REFERENCES public.dm_loai_may_tiet_khuan(id) ON DELETE SET NULL;


--
-- Name: fact_giam_sat_chung_results fk_gsc_results_criterion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_results
    ADD CONSTRAINT fk_gsc_results_criterion FOREIGN KEY (criterion_id) REFERENCES public.dm_tieu_chi_bang_kiem(id) ON DELETE RESTRICT;


--
-- Name: fact_giam_sat_chung_sessions fk_gsc_sessions_bang_kiem; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_sessions
    ADD CONSTRAINT fk_gsc_sessions_bang_kiem FOREIGN KEY (bang_kiem_id) REFERENCES public.dm_bang_kiem(id) ON DELETE SET NULL;


--
-- Name: fact_kho_chi_tiet fk_kho_chi_tiet_vat_tu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_chi_tiet
    ADD CONSTRAINT fk_kho_chi_tiet_vat_tu FOREIGN KEY (vat_tu_id) REFERENCES public.dm_hoa_chat(id) ON DELETE SET NULL;


--
-- Name: fact_kho_giao_dich fk_kho_giao_dich_nguoi_thuc_hien; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_giao_dich
    ADD CONSTRAINT fk_kho_giao_dich_nguoi_thuc_hien FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: fact_lo_tiet_khuan fk_lo_tiet_khuan_loai_may; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_lo_tiet_khuan
    ADD CONSTRAINT fk_lo_tiet_khuan_loai_may FOREIGN KEY (loai_may_id) REFERENCES public.dm_loai_may_tiet_khuan(id) ON DELETE SET NULL;


--
-- Name: fact_lo_tiet_khuan fk_lo_tiet_khuan_nguoi_van_hanh; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_lo_tiet_khuan
    ADD CONSTRAINT fk_lo_tiet_khuan_nguoi_van_hanh FOREIGN KEY (nguoi_van_hanh_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: fact_nhat_ky_quet fk_nhat_ky_quet_nguoi_thuc_hien; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_nhat_ky_quet
    ADD CONSTRAINT fk_nhat_ky_quet_nguoi_thuc_hien FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: fact_quy_trinh fk_quy_trinh_nguoi_cap_phat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_cap_phat FOREIGN KEY (nguoi_cap_phat_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: fact_quy_trinh fk_quy_trinh_nguoi_dang_giu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_dang_giu FOREIGN KEY (nguoi_dang_giu_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: fact_quy_trinh fk_quy_trinh_nguoi_dong_goi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_dong_goi FOREIGN KEY (nguoi_dong_goi_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: fact_quy_trinh fk_quy_trinh_nguoi_kiem_tra; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_kiem_tra FOREIGN KEY (nguoi_kiem_tra_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: fact_quy_trinh fk_quy_trinh_nguoi_lam_sach; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_lam_sach FOREIGN KEY (nguoi_lam_sach_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: fact_quy_trinh fk_quy_trinh_nguoi_tiep_nhan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_tiep_nhan FOREIGN KEY (nguoi_tiep_nhan_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: fact_quy_trinh fk_quy_trinh_nguoi_tiet_khuan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_tiet_khuan FOREIGN KEY (nguoi_tiet_khuan_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;


--
-- Name: fact_quy_trinh fk_quy_trinh_tram_hien_tai; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_tram_hien_tai FOREIGN KEY (tram_hien_tai_id) REFERENCES public.dm_tram_cssd(id) ON DELETE RESTRICT;


--
-- Name: fact_su_co_chi_tiet fk_su_co_chi_tiet_su_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_su_co_chi_tiet
    ADD CONSTRAINT fk_su_co_chi_tiet_su_co FOREIGN KEY (su_co_id) REFERENCES public.fact_su_co(id) ON DELETE CASCADE;


--
-- Name: fact_su_co fk_su_co_loai_su_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_su_co
    ADD CONSTRAINT fk_su_co_loai_su_co FOREIGN KEY (loai_su_co_id) REFERENCES public.dm_loai_su_co(id) ON DELETE SET NULL;


--
-- Name: fact_giam_sat_vst fk_vst_obs_khu_vuc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst
    ADD CONSTRAINT fk_vst_obs_khu_vuc FOREIGN KEY (khu_vuc_id) REFERENCES public.dm_khu_vuc_giam_sat(id) ON DELETE SET NULL;


--
-- Name: fact_giam_sat_vst fk_vst_obs_nghe_nghiep; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst
    ADD CONSTRAINT fk_vst_obs_nghe_nghiep FOREIGN KEY (nghe_nghiep_id) REFERENCES public.dm_nghe_nghiep(id) ON DELETE SET NULL;


--
-- Name: fact_giam_sat_chung_results giam_sat_chung_results_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_results
    ADD CONSTRAINT giam_sat_chung_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.fact_giam_sat_chung_sessions(id) ON DELETE CASCADE;


--
-- Name: fact_giam_sat_chung_sessions giam_sat_chung_sessions_khoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_khoa_id_fkey FOREIGN KEY (khoa_id) REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_chung_sessions giam_sat_chung_sessions_khu_vuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_khu_vuc_id_fkey FOREIGN KEY (khu_vuc_id) REFERENCES public.dm_khu_vuc_giam_sat(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_chung_sessions giam_sat_chung_sessions_nghe_nghiep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_nghe_nghiep_id_fkey FOREIGN KEY (nghe_nghiep_id) REFERENCES public.dm_nghe_nghiep(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_chung_sessions giam_sat_chung_sessions_nguoi_giam_sat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_nguoi_giam_sat_id_fkey FOREIGN KEY (nguoi_giam_sat_id) REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_chung_sessions giam_sat_chung_sessions_nhan_vien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_chung_sessions
    ADD CONSTRAINT giam_sat_chung_sessions_nhan_vien_id_fkey FOREIGN KEY (nhan_vien_id) REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_nkbv_ca giam_sat_nkbv_ca_khoa_ghi_nhan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_nkbv_ca
    ADD CONSTRAINT giam_sat_nkbv_ca_khoa_ghi_nhan_id_fkey FOREIGN KEY (khoa_ghi_nhan_id) REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_nkbv_ca giam_sat_nkbv_ca_loai_nkbv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_nkbv_ca
    ADD CONSTRAINT giam_sat_nkbv_ca_loai_nkbv_id_fkey FOREIGN KEY (loai_nkbv_id) REFERENCES public.dm_loai_nkbv(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fact_giam_sat_nkbv_ca giam_sat_nkbv_ca_nguoi_ghi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_nkbv_ca
    ADD CONSTRAINT giam_sat_nkbv_ca_nguoi_ghi_id_fkey FOREIGN KEY (nguoi_ghi_id) REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_nkbv_ca giam_sat_nkbv_ca_trang_thai_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_nkbv_ca
    ADD CONSTRAINT giam_sat_nkbv_ca_trang_thai_id_fkey FOREIGN KEY (trang_thai_id) REFERENCES public.dm_trang_thai_nkbv_ca(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fact_giam_sat_vst giam_sat_vst_khoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst
    ADD CONSTRAINT giam_sat_vst_khoa_id_fkey FOREIGN KEY (khoa_id) REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_vst giam_sat_vst_nhan_vien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst
    ADD CONSTRAINT giam_sat_vst_nhan_vien_id_fkey FOREIGN KEY (nhan_vien_id) REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_vst giam_sat_vst_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst
    ADD CONSTRAINT giam_sat_vst_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.fact_giam_sat_vst_sessions(id) ON DELETE CASCADE;


--
-- Name: fact_giam_sat_vst_sessions giam_sat_vst_sessions_khoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst_sessions
    ADD CONSTRAINT giam_sat_vst_sessions_khoa_id_fkey FOREIGN KEY (khoa_id) REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_vst_sessions giam_sat_vst_sessions_khu_vuc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst_sessions
    ADD CONSTRAINT giam_sat_vst_sessions_khu_vuc_id_fkey FOREIGN KEY (khu_vuc_id) REFERENCES public.dm_khu_vuc_giam_sat(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_giam_sat_vst_sessions giam_sat_vst_sessions_nguoi_giam_sat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_giam_sat_vst_sessions
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
    ADD CONSTRAINT ho_so_nhan_vien_chuc_danh_id_fkey FOREIGN KEY (chuc_danh_id) REFERENCES public.dm_chuc_danh(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mdm_nhan_su ho_so_nhan_vien_chuc_vu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT ho_so_nhan_vien_chuc_vu_id_fkey FOREIGN KEY (chuc_vu_id) REFERENCES public.dm_chuc_vu(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mdm_nhan_su ho_so_nhan_vien_khoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT ho_so_nhan_vien_khoa_id_fkey FOREIGN KEY (khoa_id) REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: mdm_nhan_su ho_so_nhan_vien_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT ho_so_nhan_vien_to_id_fkey FOREIGN KEY (to_id) REFERENCES public.dm_to_cong_tac(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_kho_chi_tiet kho_chi_tiet_giao_dich_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_chi_tiet
    ADD CONSTRAINT kho_chi_tiet_giao_dich_id_fkey FOREIGN KEY (giao_dich_id) REFERENCES public.fact_kho_giao_dich(id) ON DELETE CASCADE;


--
-- Name: fact_kho_chi_tiet kho_chi_tiet_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_chi_tiet
    ADD CONSTRAINT kho_chi_tiet_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.fact_quy_trinh(id);


--
-- Name: fact_kho_giao_dich kho_giao_dich_khoa_phong_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kho_giao_dich
    ADD CONSTRAINT kho_giao_dich_khoa_phong_id_fkey FOREIGN KEY (khoa_phong_id) REFERENCES public.dm_khoa_phong(id);


--
-- Name: fact_lo_tiet_khuan lo_tiet_khuan_thiet_bi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_lo_tiet_khuan
    ADD CONSTRAINT lo_tiet_khuan_thiet_bi_id_fkey FOREIGN KEY (thiet_bi_id) REFERENCES public.dm_thiet_bi(id);


--
-- Name: mdm_nhan_su mdm_nhan_su_nghe_nghiep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT mdm_nhan_su_nghe_nghiep_id_fkey FOREIGN KEY (nghe_nghiep_id) REFERENCES public.dm_nghe_nghiep(id) ON DELETE SET NULL;


--
-- Name: mdm_nhan_su mdm_nhan_su_vai_tro_he_thong_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mdm_nhan_su
    ADD CONSTRAINT mdm_nhan_su_vai_tro_he_thong_id_fkey FOREIGN KEY (vai_tro_he_thong_id) REFERENCES public.dm_roles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fact_nhat_ky_quet nhat_ky_quet_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_nhat_ky_quet
    ADD CONSTRAINT nhat_ky_quet_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: fact_nhat_ky_quet nhat_ky_quet_thiet_bi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_nhat_ky_quet
    ADD CONSTRAINT nhat_ky_quet_thiet_bi_id_fkey FOREIGN KEY (thiet_bi_id) REFERENCES public.dm_thiet_bi(id);


--
-- Name: fact_quy_trinh quy_trinh_bo_dung_cu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT quy_trinh_bo_dung_cu_id_fkey FOREIGN KEY (bo_dung_cu_id) REFERENCES public.dm_bo_dung_cu(id);


--
-- Name: fact_quy_trinh quy_trinh_lo_tiet_khuan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_quy_trinh
    ADD CONSTRAINT quy_trinh_lo_tiet_khuan_id_fkey FOREIGN KEY (lo_tiet_khuan_id) REFERENCES public.fact_lo_tiet_khuan(id);


--
-- Name: rel_role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rel_role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.dm_permissions(id) ON DELETE CASCADE;


--
-- Name: rel_role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rel_role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.dm_roles(id) ON DELETE CASCADE;


--
-- Name: fact_su_co su_co_nguoi_bao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_su_co
    ADD CONSTRAINT su_co_nguoi_bao_id_fkey FOREIGN KEY (nguoi_bao_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: fact_su_co su_co_nguoi_xac_nhan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_su_co
    ADD CONSTRAINT su_co_nguoi_xac_nhan_id_fkey FOREIGN KEY (nguoi_xac_nhan_id) REFERENCES public.mdm_nhan_su(id);


--
-- Name: fact_su_co su_co_quy_trinh_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_su_co
    ADD CONSTRAINT su_co_quy_trinh_id_fkey FOREIGN KEY (quy_trinh_id) REFERENCES public.fact_quy_trinh(id) ON DELETE CASCADE;


--
-- Name: dm_tieu_chi_bang_kiem tieu_chi_bang_kiem_bang_kiem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_tieu_chi_bang_kiem
    ADD CONSTRAINT tieu_chi_bang_kiem_bang_kiem_id_fkey FOREIGN KEY (bang_kiem_id) REFERENCES public.dm_bang_kiem(id) ON DELETE CASCADE;


--
-- Name: rel_user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rel_user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.dm_roles(id) ON DELETE CASCADE;


--
-- Name: rel_user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rel_user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: dm_bang_kiem Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON public.dm_bang_kiem TO authenticated USING (true) WITH CHECK (true);


--
-- Name: dm_tieu_chi_bang_kiem Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON public.dm_tieu_chi_bang_kiem TO authenticated USING (true) WITH CHECK (true);


--
-- Name: fact_giam_sat_chung_results Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON public.fact_giam_sat_chung_results TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.rel_user_roles ur
     JOIN public.dm_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'ADMIN'::text)))));


--
-- Name: fact_giam_sat_chung_sessions Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON public.fact_giam_sat_chung_sessions TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.rel_user_roles ur
     JOIN public.dm_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'ADMIN'::text)))));


--
-- Name: fact_giam_sat_vst Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON public.fact_giam_sat_vst TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.rel_user_roles ur
     JOIN public.dm_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'ADMIN'::text)))));


--
-- Name: fact_giam_sat_vst_sessions Admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access" ON public.fact_giam_sat_vst_sessions TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.rel_user_roles ur
     JOIN public.dm_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.name = 'ADMIN'::text)))));


--
-- Name: fact_cong_viec Allow all for auth users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all for auth users" ON public.fact_cong_viec USING (true);


--
-- Name: dm_bang_kiem Authenticated read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access" ON public.dm_bang_kiem FOR SELECT TO authenticated USING (true);


--
-- Name: dm_tieu_chi_bang_kiem Authenticated read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access" ON public.dm_tieu_chi_bang_kiem FOR SELECT TO authenticated USING (true);


--
-- Name: fact_giam_sat_chung_results Authenticated read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access" ON public.fact_giam_sat_chung_results FOR SELECT TO authenticated USING (true);


--
-- Name: fact_giam_sat_chung_sessions Authenticated read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access" ON public.fact_giam_sat_chung_sessions FOR SELECT TO authenticated USING (true);


--
-- Name: fact_giam_sat_vst Authenticated read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access" ON public.fact_giam_sat_vst FOR SELECT TO authenticated USING (true);


--
-- Name: fact_giam_sat_vst_sessions Authenticated read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access" ON public.fact_giam_sat_vst_sessions FOR SELECT TO authenticated USING (true);


--
-- Name: fact_cong_viec Cho phép thao tác fact_cong_viec; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cho phép thao tác fact_cong_viec" ON public.fact_cong_viec TO authenticated USING (true) WITH CHECK (true);


--
-- Name: dm_loai_cong_viec Cho phép đọc danh mục loại công việc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cho phép đọc danh mục loại công việc" ON public.dm_loai_cong_viec FOR SELECT TO authenticated USING (true);


--
-- Name: dm_trang_thai_cong_viec Cho phép đọc danh mục trạng thái; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cho phép đọc danh mục trạng thái" ON public.dm_trang_thai_cong_viec FOR SELECT TO authenticated USING (true);


--
-- Name: dm_bang_kiem; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_bang_kiem ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_bo_dung_cu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_bo_dung_cu ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_bo_dung_cu_chi_tiet; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_bo_dung_cu_chi_tiet ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_bo_dung_cu_chi_tiet dm_bo_dung_cu_chi_tiet_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_bo_dung_cu_chi_tiet_select_auth_v1 ON public.dm_bo_dung_cu_chi_tiet FOR SELECT TO authenticated USING (true);


--
-- Name: dm_bo_dung_cu_chi_tiet dm_bo_dung_cu_chi_tiet_update_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_bo_dung_cu_chi_tiet_update_auth_v1 ON public.dm_bo_dung_cu_chi_tiet FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: dm_bo_dung_cu dm_bo_dung_cu_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_bo_dung_cu_select_auth_v1 ON public.dm_bo_dung_cu FOR SELECT TO authenticated USING (true);


--
-- Name: dm_cach_thuc_giam_sat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_cach_thuc_giam_sat ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_cach_thuc_giam_sat dm_cach_thuc_giam_sat_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_cach_thuc_giam_sat_select_all ON public.dm_cach_thuc_giam_sat FOR SELECT TO authenticated USING (true);


--
-- Name: dm_chuc_danh; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_chuc_danh ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_chuc_danh dm_chuc_danh_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_chuc_danh_select_auth_v1 ON public.dm_chuc_danh FOR SELECT TO authenticated USING (true);


--
-- Name: dm_chuc_vu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_chuc_vu ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_chuc_vu dm_chuc_vu_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_chuc_vu_select_auth_v1 ON public.dm_chuc_vu FOR SELECT TO authenticated USING (true);


--
-- Name: dm_hinh_thuc_giam_sat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_hinh_thuc_giam_sat ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_hinh_thuc_giam_sat dm_hinh_thuc_giam_sat_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_hinh_thuc_giam_sat_select_all ON public.dm_hinh_thuc_giam_sat FOR SELECT TO authenticated USING (true);


--
-- Name: dm_hoa_chat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_hoa_chat ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_hoa_chat dm_hoa_chat_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_hoa_chat_admin_all ON public.dm_hoa_chat TO authenticated USING (true);


--
-- Name: dm_hoa_chat dm_hoa_chat_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_hoa_chat_select_all ON public.dm_hoa_chat FOR SELECT TO authenticated USING (true);


--
-- Name: dm_khoa_phong; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_khoa_phong ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_khoa_phong dm_khoa_phong_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_khoa_phong_select_auth_v1 ON public.dm_khoa_phong FOR SELECT TO authenticated USING (true);


--
-- Name: dm_khoi_khoa; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_khoi_khoa ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_khoi_khoa dm_khoi_khoa_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_khoi_khoa_select_auth_v1 ON public.dm_khoi_khoa FOR SELECT TO authenticated USING (true);


--
-- Name: dm_khu_vuc_giam_sat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_khu_vuc_giam_sat ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_khu_vuc_giam_sat dm_khu_vuc_giam_sat_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_khu_vuc_giam_sat_select_auth_v1 ON public.dm_khu_vuc_giam_sat FOR SELECT TO authenticated USING (true);


--
-- Name: dm_loai_cong_viec; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_loai_cong_viec ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_loai_cong_viec dm_loai_cong_viec_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_loai_cong_viec_select_authenticated ON public.dm_loai_cong_viec FOR SELECT TO authenticated USING (true);


--
-- Name: dm_loai_dung_cu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_loai_dung_cu ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_loai_dung_cu dm_loai_dung_cu_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_loai_dung_cu_select_auth_v1 ON public.dm_loai_dung_cu FOR SELECT TO authenticated USING (true);


--
-- Name: dm_loai_may_tiet_khuan dm_loai_may_select_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_loai_may_select_anon ON public.dm_loai_may_tiet_khuan FOR SELECT TO anon USING (true);


--
-- Name: dm_loai_may_tiet_khuan dm_loai_may_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_loai_may_select_auth ON public.dm_loai_may_tiet_khuan FOR SELECT TO authenticated USING (true);


--
-- Name: dm_loai_may_tiet_khuan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_loai_may_tiet_khuan ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_loai_nkbv; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_loai_nkbv ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_loai_nkbv dm_loai_nkbv_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_loai_nkbv_select_auth ON public.dm_loai_nkbv FOR SELECT TO authenticated USING (true);


--
-- Name: dm_loai_su_co; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_loai_su_co ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_loai_su_co dm_loai_su_co_select_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_loai_su_co_select_anon ON public.dm_loai_su_co FOR SELECT TO anon USING (true);


--
-- Name: dm_loai_su_co dm_loai_su_co_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_loai_su_co_select_auth ON public.dm_loai_su_co FOR SELECT TO authenticated USING (true);


--
-- Name: dm_nghe_nghiep; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_nghe_nghiep ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_nghe_nghiep dm_nghe_nghiep_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_nghe_nghiep_select_auth_v1 ON public.dm_nghe_nghiep FOR SELECT TO authenticated USING (true);


--
-- Name: dm_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_thiet_bi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_thiet_bi ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_tieu_chi_bang_kiem; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_tieu_chi_bang_kiem ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_to_cong_tac; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_to_cong_tac ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_to_cong_tac dm_to_cong_tac_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_to_cong_tac_select_auth_v1 ON public.dm_to_cong_tac FOR SELECT TO authenticated USING (true);


--
-- Name: dm_tram_cssd; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_tram_cssd ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_tram_cssd dm_tram_cssd_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_tram_cssd_select_authenticated ON public.dm_tram_cssd FOR SELECT TO authenticated USING (true);


--
-- Name: dm_trang_thai_cong_viec; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_trang_thai_cong_viec ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_trang_thai_cong_viec dm_trang_thai_cong_viec_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_trang_thai_cong_viec_select_authenticated ON public.dm_trang_thai_cong_viec FOR SELECT TO authenticated USING (true);


--
-- Name: dm_trang_thai_nkbv_ca; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_trang_thai_nkbv_ca ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_trang_thai_nkbv_ca dm_trang_thai_nkbv_ca_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_trang_thai_nkbv_ca_select_auth ON public.dm_trang_thai_nkbv_ca FOR SELECT TO authenticated USING (true);


--
-- Name: dm_vi_tri_kho; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_vi_tri_kho ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_bao_tri_thiet_bi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_bao_tri_thiet_bi ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_bao_tri_thiet_bi fact_bao_tri_thiet_bi_all_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_bao_tri_thiet_bi_all_auth ON public.fact_bao_tri_thiet_bi TO authenticated USING (true) WITH CHECK (true);


--
-- Name: fact_bao_tri_thiet_bi fact_bao_tri_thiet_bi_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_bao_tri_thiet_bi_select_auth ON public.fact_bao_tri_thiet_bi FOR SELECT TO authenticated USING (true);


--
-- Name: fact_bv103_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_bv103_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_bv103_audit_log fact_bv103_audit_log_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_bv103_audit_log_select_authenticated ON public.fact_bv103_audit_log FOR SELECT TO authenticated USING (((changed_by = auth.uid()) OR (changed_by IS NULL)));


--
-- Name: fact_cong_viec; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_cong_viec ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_cong_viec_dinh_ky; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_cong_viec_dinh_ky ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_cong_viec_hoat_dong; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_cong_viec_hoat_dong ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_cssd_dieu_chuyen_thanh_phan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_cssd_dieu_chuyen_thanh_phan ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_cssd_lifecycle_event; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_cssd_lifecycle_event ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_giam_sat_chung_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_giam_sat_chung_results ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_giam_sat_chung_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_giam_sat_chung_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_giam_sat_nkbv_ca; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_giam_sat_nkbv_ca ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_giam_sat_vst; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_giam_sat_vst ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_giam_sat_vst_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_giam_sat_vst_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_kho_chi_tiet; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_kho_chi_tiet ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_kho_giao_dich; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_kho_giao_dich ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_kho_hoa_chat_giao_dich fact_kho_hc_all_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_kho_hc_all_auth ON public.fact_kho_hoa_chat_giao_dich TO authenticated USING (true) WITH CHECK (true);


--
-- Name: fact_kho_hoa_chat_giao_dich fact_kho_hc_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_kho_hc_select_auth ON public.fact_kho_hoa_chat_giao_dich FOR SELECT TO authenticated USING (true);


--
-- Name: fact_kho_hoa_chat_giao_dich; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_kho_hoa_chat_giao_dich ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_lo_tiet_khuan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_lo_tiet_khuan ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_lo_tiet_khuan fact_lo_tiet_khuan_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_lo_tiet_khuan_select_authenticated ON public.fact_lo_tiet_khuan FOR SELECT TO authenticated USING (true);


--
-- Name: fact_nhat_ky_quet; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_nhat_ky_quet ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_nhat_ky_quet fact_nhat_ky_quet_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_nhat_ky_quet_select_authenticated ON public.fact_nhat_ky_quet FOR SELECT TO authenticated USING (true);


--
-- Name: fact_qlcv_danh_gia_thang; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_qlcv_danh_gia_thang ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_qlcv_danh_gia_thang fact_qlcv_danh_gia_thang_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_qlcv_danh_gia_thang_select_authenticated ON public.fact_qlcv_danh_gia_thang FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.mdm_nhan_su m
  WHERE (m.auth_user_id = auth.uid()))));


--
-- Name: fact_quy_trinh; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_quy_trinh ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_quy_trinh fact_quy_trinh_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_quy_trinh_select_authenticated ON public.fact_quy_trinh FOR SELECT TO authenticated USING (true);


--
-- Name: fact_quy_trinh_thanh_phan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_quy_trinh_thanh_phan ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_quy_trinh_thanh_phan fact_quy_trinh_thanh_phan_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_quy_trinh_thanh_phan_select_authenticated ON public.fact_quy_trinh_thanh_phan FOR SELECT TO authenticated USING (true);


--
-- Name: fact_su_co; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_su_co ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_su_co_chi_tiet; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fact_su_co_chi_tiet ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_su_co fact_su_co_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fact_su_co_select_authenticated ON public.fact_su_co FOR SELECT TO authenticated USING (true);


--
-- Name: fact_giam_sat_nkbv_ca giam_sat_nkbv_ca_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY giam_sat_nkbv_ca_insert ON public.fact_giam_sat_nkbv_ca FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: fact_giam_sat_nkbv_ca giam_sat_nkbv_ca_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY giam_sat_nkbv_ca_select ON public.fact_giam_sat_nkbv_ca FOR SELECT TO authenticated USING (true);


--
-- Name: fact_giam_sat_nkbv_ca giam_sat_nkbv_ca_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY giam_sat_nkbv_ca_update ON public.fact_giam_sat_nkbv_ca FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: fact_giam_sat_chung_sessions gsc_sessions_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gsc_sessions_select_authenticated ON public.fact_giam_sat_chung_sessions FOR SELECT TO authenticated USING ((COALESCE(is_active, true) = true));


--
-- Name: mdm_field_registry; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mdm_field_registry ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_governance_suggestion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mdm_governance_suggestion ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_nhan_su; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mdm_nhan_su ENABLE ROW LEVEL SECURITY;

--
-- Name: mdm_nhan_su mdm_nhan_su_select_auth_v1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_nhan_su_select_auth_v1 ON public.mdm_nhan_su FOR SELECT TO authenticated USING (true);


--
-- Name: mdm_nhan_su mdm_nhan_su_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mdm_nhan_su_select_authenticated ON public.mdm_nhan_su FOR SELECT TO authenticated USING (true);


--
-- Name: dm_permissions permissions_admin_full_access_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY permissions_admin_full_access_v2 ON public.dm_permissions TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: dm_permissions permissions_select_all_authenticated_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY permissions_select_all_authenticated_v2 ON public.dm_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: rel_role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rel_role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: rel_user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rel_user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: rel_role_permissions role_permissions_admin_full_access_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY role_permissions_admin_full_access_v2 ON public.rel_role_permissions TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: rel_role_permissions role_permissions_select_all_authenticated_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY role_permissions_select_all_authenticated_v2 ON public.rel_role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: dm_roles roles_admin_full_access_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_admin_full_access_v2 ON public.dm_roles TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: dm_roles roles_select_all_authenticated_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_select_all_authenticated_v2 ON public.dm_roles FOR SELECT TO authenticated USING (true);


--
-- Name: rel_user_roles user_roles_admin_full_access_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_admin_full_access_v2 ON public.rel_user_roles TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: rel_user_roles user_roles_self_or_admin_select_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_self_or_admin_select_v2 ON public.rel_user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin_user(auth.uid())));


--
-- Name: fact_giam_sat_vst_sessions vst_sessions_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vst_sessions_select_authenticated ON public.fact_giam_sat_vst_sessions FOR SELECT TO authenticated USING ((COALESCE(is_active, true) = true));


--
-- PostgreSQL database dump complete
--

\unrestrict bVSTD4AHEZEBKyJQxMJDfXR7pVoIVHNVt5l81DBeOBZh7iyMMlofxOd9sVvT1sj

