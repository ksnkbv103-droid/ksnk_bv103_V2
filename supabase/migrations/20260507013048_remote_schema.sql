


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."block_writes_for_migrated_danh_muc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."block_writes_for_migrated_danh_muc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_auto_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.fact_activity_log (tableName, recordId, action, oldData, newData, note)
    VALUES (TG_TABLE_NAME, OLD.id, 'AUTO_UPDATE', to_jsonb(OLD), to_jsonb(NEW), 'Tự động ghi vết thay đổi');
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.fact_activity_log (tableName, recordId, action, oldData, note)
    VALUES (TG_TABLE_NAME, OLD.id, 'AUTO_DELETE', to_jsonb(OLD), 'Tự động ghi vết xóa');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."fn_auto_audit_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = COALESCE(p_user_id, auth.uid())
      AND r.name = 'ADMIN'
  );
$$;


ALTER FUNCTION "public"."is_admin_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mdm_refresh_governance_suggestions"() RETURNS TABLE("inserted_count" integer)
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."mdm_refresh_governance_suggestions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
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


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_assign_staff_ksnk_role"("p_staff_id" "uuid", "p_role_name" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_uid UUID;
  v_target_role_id UUID;
  v_ksnk_role_ids UUID[];
BEGIN
  -- 1. Lấy auth_user_id của nhân sự
  SELECT auth_user_id INTO v_uid FROM public.mdm_nhan_su WHERE id = p_staff_id;
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nhân sự chưa có tài khoản Auth.');
  END IF;

  -- 2. Lấy danh sách ID của các vai trò KSNK chuẩn
  SELECT ARRAY_AGG(id) INTO v_ksnk_role_ids 
  FROM public.dm_roles 
  WHERE name IN ('ADMIN', 'CAN_BO_KSNK', 'NHAN_VIEN_KHOA', 'GIAM_SAT_VIEN');

  -- 3. Tìm ID của vai trò mục tiêu
  SELECT id INTO v_target_role_id FROM public.dm_roles WHERE name = p_role_name;
  IF v_target_role_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Vai trò mục tiêu không tồn tại.');
  END IF;

  -- 4. Thực hiện nguyên tử: Xóa cũ, Thêm mới
  DELETE FROM public.rel_user_roles 
  WHERE user_id = v_uid AND role_id = ANY(v_ksnk_role_ids);

  INSERT INTO public.rel_user_roles (user_id, role_id)
  VALUES (v_uid, v_target_role_id);

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."rpc_assign_staff_ksnk_role"("p_staff_id" "uuid", "p_role_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[] DEFAULT NULL::"text"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_summary JSONB;
  v_by_khoa JSONB;
  v_by_nghe JSONB;
  v_by_khu JSONB;
  v_trend JSONB;
  v_violations JSONB;
BEGIN
  -- 1. Tính toán summary tổng quát
  WITH filtered_sessions AS (
    SELECT id, khoa_id, nghe_nghiep_id, khu_vuc_id, ngay_giam_sat
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

  -- 2. Thống kê theo Khoa
  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT 
      k.id, k.ten_khoa as ten,
      COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat,
      COUNT(r.id) as tong,
      COUNT(DISTINCT s.id) as so_phien,
      CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM public.fact_giam_sat_chung_sessions s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY k.id, k.ten_khoa
    ORDER BY ty_le DESC, tong DESC
  ) t;

  -- 3. Thống kê theo Nghề nghiệp
  SELECT jsonb_agg(t) INTO v_by_nghe FROM (
    SELECT 
      n.id, n.ten_nghe_nghiep as ten,
      COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat,
      COUNT(r.id) as tong,
      COUNT(DISTINCT s.id) as so_phien,
      CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM public.fact_giam_sat_chung_sessions s
    JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY n.id, n.ten_nghe_nghiep
    ORDER BY ty_le DESC, tong DESC
  ) t;

  -- 4. Thống kê theo Khu vực
  SELECT jsonb_agg(t) INTO v_by_khu FROM (
    SELECT 
      kv.id, kv.ten_khu_vuc as ten,
      COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat,
      COUNT(r.id) as tong,
      COUNT(DISTINCT s.id) as so_phien,
      CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM public.fact_giam_sat_chung_sessions s
    JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY kv.id, kv.ten_khu_vuc
    ORDER BY ty_le DESC, tong DESC
  ) t;

  -- 5. Xu hướng theo tháng
  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT 
      to_char(date_trunc('month', s.ngay_giam_sat), 'YYYY-MM') as ky,
      to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label,
      COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat,
      COUNT(r.id) as tong,
      CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY 1, 2
    ORDER BY 1 ASC
  ) t;

  -- 6. Top 20 vi phạm tiêu chí
  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT 
      tc.id as criterion_id, tc.noi_dung as ten_tieu_chi,
      COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham,
      COUNT(r.id) as tong_quan_sat,
      CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le_vi_pham
    FROM public.fact_giam_sat_chung_results r
    JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id
    JOIN public.fact_giam_sat_chung_sessions s ON r.session_id = s.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY tc.id, tc.noi_dung
    HAVING COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0
    ORDER BY so_vi_pham DESC
    LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb),
    'by_nghe_nghiep', COALESCE(v_by_nghe, '[]'::jsonb),
    'by_khu_vuc', COALESCE(v_by_khu, '[]'::jsonb),
    'trend', COALESCE(v_trend, '[]'::jsonb),
    'violations', COALESCE(v_violations, '[]'::jsonb)
  );
END;
$$;


ALTER FUNCTION "public"."rpc_get_compliance_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_registry_options"("p_categories" "text"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    END CASE;
  END LOOP;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."rpc_get_registry_options"("p_categories" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_vst_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."rpc_get_vst_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reorder_tieu_chi_bang_kiem"("p_bang_kiem_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."rpc_reorder_tieu_chi_bang_kiem"("p_bang_kiem_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_scan_workflow_station"("p_ma_qr" "text", "p_target_station" "text", "p_operator_label" "text" DEFAULT 'CSSD'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_row RECORD;
  v_current_idx INT;
  v_target_idx INT;
  v_lifecycle_code TEXT;
BEGIN
  -- 1. Tìm bản ghi quy trình
  SELECT * INTO v_row FROM public.fact_quy_trinh 
  WHERE UPPER(ma_qr_quy_trinh) = UPPER(p_ma_qr) AND is_active = true 
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ hoặc bộ chưa được tiếp nhận.');
  END IF;

  -- 2. Kiểm tra đóng băng
  IF v_row.is_dong_bang = true THEN
    RETURN json_build_object('success', false, 'message', 'Bộ dụng cụ ' || p_ma_qr || ' đang bị khóa an toàn (đóng băng).');
  END IF;

  -- 3. Kiểm tra thứ tự trạm (Logic từ cssd-state-engine)
  -- Quy trình: TIEP_NHAN(0), LAM_SACH(1), QC(2), DONG_GOI(3), TIET_KHUAN(4), CAP_PHAT(5)
  v_current_idx := CASE v_row.ma_trang_thai_hien_tai
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2 
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;
    
  v_target_idx := CASE p_target_station
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2 
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  -- Ngoại lệ: Cho phép quay vòng từ CAP_PHAT về TIEP_NHAN
  IF NOT (v_row.ma_trang_thai_hien_tai = 'CAP_PHAT' AND p_target_station = 'TIEP_NHAN') THEN
    IF v_target_idx != v_current_idx + 1 THEN
      RETURN json_build_object('success', false, 'message', 'Sai trạm! Quy trình đang ở bước ' || v_row.ma_trang_thai_hien_tai);
    END IF;
  END IF;

  -- 4. Cập nhật trạng thái
  UPDATE public.fact_quy_trinh 
  SET ma_trang_thai_hien_tai = p_target_station, updated_at = now()
  WHERE id = v_row.id;

  -- 5. Ghi log sự kiện (Custom Activity Log)
  v_lifecycle_code := CASE p_target_station
    WHEN 'LAM_SACH' THEN 'BAT_DAU_LAM_SACH' WHEN 'QC' THEN 'HOAN_QC'
    WHEN 'DONG_GOI' THEN 'HOAN_DONG_GOI' WHEN 'CAP_PHAT' THEN 'XAC_NHAN_CAP_PHAT'
    WHEN 'TIEP_NHAN' THEN 'TIEP_NHAN_CHU_KY_MOI' ELSE 'CHUYEN_TRAM' END;

  INSERT INTO public.fact_activity_log (tableName, recordId, action, note, metadata)
  VALUES ('fact_quy_trinh', v_row.id, v_lifecycle_code, 
          'Quét trạm: ' || v_row.ma_trang_thai_hien_tai || ' -> ' || p_target_station,
          jsonb_build_object('qr', p_ma_qr, 'operator', p_operator_label));

  RETURN json_build_object('success', true, 'data', jsonb_build_object('den', p_target_station));
END;
$$;


ALTER FUNCTION "public"."rpc_scan_workflow_station"("p_ma_qr" "text", "p_target_station" "text", "p_operator_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at_mdm_registry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_updated_at_mdm_registry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."dm_bang_kiem" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_bk" "text" NOT NULL,
    "ten_bang_kiem" "text" NOT NULL,
    "nhom_chuyen_de" "text",
    "mo_ta" "text",
    "is_active" boolean DEFAULT true,
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "loai_hinh_giam_sat" "text" DEFAULT 'TRUC_TIEP'::"text"
);


ALTER TABLE "public"."dm_bang_kiem" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_bo_dung_cu" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_bo" character varying(50) NOT NULL,
    "ten_bo" "text" NOT NULL,
    "loai_dung_cu_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "trang_thai" character varying(50) DEFAULT 'ACTIVE'::character varying,
    "ghi_chu" "text",
    "ngay_kiem_ke_gan_nhat" timestamp with time zone,
    "quy_cach" "text",
    "khoa_su_dung_id" "uuid"
);


ALTER TABLE "public"."dm_bo_dung_cu" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_bo_dung_cu_chi_tiet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bo_dung_cu_id" "uuid",
    "ten_dung_cu_le" "text" NOT NULL,
    "so_luong" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "max_suds_count" integer DEFAULT 100,
    "trong_luong" numeric,
    "ghi_chu" "text",
    "ma_qr_mau" "text",
    "ma_chi_tiet" character varying(50),
    "ten_chi_tiet" "text",
    "loai_dung_cu_id" "uuid",
    "ma_loai" "text"
);


ALTER TABLE "public"."dm_bo_dung_cu_chi_tiet" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_cach_thuc_giam_sat" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_cach_thuc" "text" NOT NULL,
    "ten_cach_thuc" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dm_cach_thuc_giam_sat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_chuc_danh" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_chuc_danh" "text" NOT NULL,
    "ten_chuc_danh" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legacy_danh_muc_id" "uuid"
);


ALTER TABLE "public"."dm_chuc_danh" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_chuc_vu" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_chuc_vu" "text" NOT NULL,
    "ten_chuc_vu" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legacy_danh_muc_id" "uuid"
);


ALTER TABLE "public"."dm_chuc_vu" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_hinh_thuc_giam_sat" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_hinh_thuc" "text" NOT NULL,
    "ten_hinh_thuc" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dm_hinh_thuc_giam_sat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_hoa_chat" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_hoa_chat" character varying(50) NOT NULL,
    "ten_hoa_chat" "text" NOT NULL,
    "loai_hoa_chat" character varying(50) DEFAULT 'HOA_CHAT'::character varying,
    "don_vi_tinh" character varying(20),
    "quy_cach" "text",
    "ghi_chu" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nong_do" "text",
    "han_su_dung" "date",
    "nguong_ton_toi_thieu" numeric(18,4)
);


ALTER TABLE "public"."dm_hoa_chat" OWNER TO "postgres";


COMMENT ON COLUMN "public"."dm_hoa_chat"."nguong_ton_toi_thieu" IS 'KSNK kho: cảnh báo khi tổng tồn <= giá trị (theo đơn vị dm_hoa_chat).';



CREATE TABLE IF NOT EXISTS "public"."dm_khoa_phong" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_khoa" character varying(50) NOT NULL,
    "ten_khoa" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "khoi_id" "uuid",
    "mo_ta_chuc_nang" "text",
    "so_bac_si" integer DEFAULT 0,
    "so_dieu_duong" integer DEFAULT 0,
    "so_giuong_benh_thuong" integer DEFAULT 0,
    "so_giuong_cap_cuu" integer DEFAULT 0
);


ALTER TABLE "public"."dm_khoa_phong" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_khoi_khoa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_khoi" "text" NOT NULL,
    "ten_khoi" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legacy_danh_muc_id" "uuid"
);


ALTER TABLE "public"."dm_khoi_khoa" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_khu_vuc_giam_sat" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_khu_vuc" "text" NOT NULL,
    "ten_khu_vuc" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legacy_danh_muc_id" "uuid"
);


ALTER TABLE "public"."dm_khu_vuc_giam_sat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_loai_cong_viec" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_loai" "text" NOT NULL,
    "ten_loai" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dm_loai_cong_viec" OWNER TO "postgres";


COMMENT ON TABLE "public"."dm_loai_cong_viec" IS 'DM loại công việc — khớp cột text loai_cong_viec trên cong_viec (NOI_BO, MANG_LUOI, …).';



CREATE TABLE IF NOT EXISTS "public"."dm_loai_dung_cu" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_loai" character varying(50) NOT NULL,
    "ten_loai" "text" NOT NULL,
    "mo_ta" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "ma_loai_dung_cu" "text",
    "ten_loai_dung_cu" "text",
    "hinh_dang" "text",
    "kich_thuoc" "text",
    "cong_dung" "text",
    "kha_nang_chiu_nhiet" "text",
    "phuong_phap_tiet_khuan" "text",
    "legacy_danh_muc_id" "uuid"
);


ALTER TABLE "public"."dm_loai_dung_cu" OWNER TO "postgres";


COMMENT ON TABLE "public"."dm_loai_dung_cu" IS 'Danh mục phân loại dụng cụ (Phẫu thuật, Nội soi, v.v.)';



CREATE TABLE IF NOT EXISTS "public"."dm_loai_may_tiet_khuan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_loai_may" "text" NOT NULL,
    "ten_loai_may" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legacy_danh_muc_id" "uuid"
);


ALTER TABLE "public"."dm_loai_may_tiet_khuan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_loai_nkbv" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_loai" "text" NOT NULL,
    "ten_loai" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dm_loai_nkbv" OWNER TO "postgres";


COMMENT ON TABLE "public"."dm_loai_nkbv" IS 'Loại ca NKBV / HAI (SSI, VAP, …) — SSOT dropdown module giam-sat-nkbv.';



CREATE TABLE IF NOT EXISTS "public"."dm_loai_su_co" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_loai_su_co" "text" NOT NULL,
    "ten_loai_su_co" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legacy_danh_muc_id" "uuid"
);


ALTER TABLE "public"."dm_loai_su_co" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_nghe_nghiep" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_nghe_nghiep" "text" NOT NULL,
    "ten_nghe_nghiep" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legacy_danh_muc_id" "uuid"
);


ALTER TABLE "public"."dm_nghe_nghiep" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "action" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dm_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dm_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_thiet_bi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_thiet_bi" character varying(50) NOT NULL,
    "ten_thiet_bi" "text" NOT NULL,
    "loai_thiet_bi" character varying(50),
    "trang_thai" character varying(50) DEFAULT 'READY'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "ngay_dua_vao_su_dung" "date" DEFAULT CURRENT_DATE,
    "ghi_chu" "text",
    "chu_ky_bao_tri_ngay" integer DEFAULT 180,
    "ngay_bao_tri_gan_nhat" "date",
    "ngay_bao_tri_tiep_theo" "date",
    "hang_san_xuat" "text",
    "nam_san_xuat" integer
);


ALTER TABLE "public"."dm_thiet_bi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_tieu_chi_bang_kiem" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_tc" "text",
    "bang_kiem_id" "uuid",
    "stt" integer,
    "noi_dung" "text" NOT NULL,
    "ghi_chu" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "diem_toi_da" integer DEFAULT 1
);


ALTER TABLE "public"."dm_tieu_chi_bang_kiem" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_to_cong_tac" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_to" "text" NOT NULL,
    "ten_to" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legacy_danh_muc_id" "uuid"
);


ALTER TABLE "public"."dm_to_cong_tac" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dm_trang_thai_cong_viec" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_trang_thai" "text" NOT NULL,
    "ten_trang_thai" "text" NOT NULL,
    "thu_tu" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dm_trang_thai_cong_viec" OWNER TO "postgres";


COMMENT ON TABLE "public"."dm_trang_thai_cong_viec" IS 'DM trạng thái phiếu công việc — mã trùng chuỗi trang_thai trên cong_viec (workflow app).';



CREATE TABLE IF NOT EXISTS "public"."dm_trang_thai_nkbv_ca" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_trang_thai" "text" NOT NULL,
    "ten_trang_thai" "text" NOT NULL,
    "thu_tu" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dm_trang_thai_nkbv_ca" OWNER TO "postgres";


COMMENT ON TABLE "public"."dm_trang_thai_nkbv_ca" IS 'Trạng thái phiếu ca NKBV trên luồng ghi nhận — xử lý thủ công trước Rules Engine HIS.';



CREATE TABLE IF NOT EXISTS "public"."fact_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "userid" "uuid" DEFAULT "auth"."uid"(),
    "tablename" "text" NOT NULL,
    "recordid" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "olddata" "jsonb",
    "newdata" "jsonb",
    "note" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."fact_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fact_bao_tri_thiet_bi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_phieu" character varying(80) NOT NULL,
    "thiet_bi_id" "uuid" NOT NULL,
    "trang_thai" character varying(40) NOT NULL,
    "ly_do" "text",
    "ket_qua_ghi_nhan" "text",
    "thoi_gian_bat_dau" timestamp with time zone DEFAULT "now"() NOT NULL,
    "thoi_gian_ket_thuc" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fact_bao_tri_thiet_bi_trang_thai_check" CHECK ((("trang_thai")::"text" = ANY ((ARRAY['DANG_THUC_HIEN'::character varying, 'HOAN_THANH'::character varying, 'HUY'::character varying])::"text"[])))
);


ALTER TABLE "public"."fact_bao_tri_thiet_bi" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_bao_tri_thiet_bi" IS 'CSSD: phiếu bảo trì thiết bị — tối đa một phiếu DANG_THUC_HIEN / máy; đồng bộ dm_thiet_bi.trang_thai.';



CREATE TABLE IF NOT EXISTS "public"."fact_cong_viec" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cong_viec_cha_id" "uuid",
    "ma_cong_viec" "text",
    "ten_cong_viec" "text" NOT NULL,
    "mo_ta" "text",
    "ma_trang_thai" "text" DEFAULT 'DE_XUAT_CHO_DUYET'::"text" NOT NULL,
    "tien_do" integer DEFAULT 0 NOT NULL,
    "ma_loai_cong_viec" "text" DEFAULT 'NOI_BO'::"text" NOT NULL,
    "khoa_thuc_hien_id" "uuid",
    "to_cong_tac_id" "uuid",
    "nhan_vien_mang_luoi_id" "uuid",
    "nguoi_giao_viec_id" "uuid",
    "nguoi_thuc_hien_viec_id" "uuid",
    "nguoi_de_xuat_viec_id" "uuid",
    "ngay_han_chot" "date",
    "ket_qua_tong_hop" "text",
    "ngay_hoan_thanh" "date",
    "form_mau_id" "uuid",
    "minh_chung" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "tai_lieu_dinh_kem" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "xac_nhan_at" timestamp with time zone,
    "nguoi_nhan_da_xem" boolean DEFAULT false NOT NULL,
    "da_xem_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cong_viec_tien_do_check" CHECK ((("tien_do" >= 0) AND ("tien_do" <= 100)))
);


ALTER TABLE "public"."fact_cong_viec" OWNER TO "postgres";


COMMENT ON COLUMN "public"."fact_cong_viec"."form_mau_id" IS 'Chưa gắn FK cứng: chờ bảng mẫu form chuyên biệt (dict/dm_*). Giá trị có thể vẫn là uuid legacy danh_muc_tuy_bien.';



CREATE TABLE IF NOT EXISTS "public"."fact_cong_viec_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cong_viec_id" "uuid" NOT NULL,
    "nguoi_dung_id" "uuid",
    "noi_dung_binh_luan" "text" DEFAULT ''::"text" NOT NULL,
    "is_direction" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fact_cong_viec_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fact_cssd_dieu_chuyen_thanh_phan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tu_quy_trinh_id" "uuid" NOT NULL,
    "den_quy_trinh_id" "uuid" NOT NULL,
    "ten_dung_cu_le" "text" NOT NULL,
    "so_luong" integer NOT NULL,
    "dm_bo_dung_cu_chi_tiet_id" "uuid",
    "ghi_chu" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fact_cssd_dieu_chuyen_thanh_phan_so_luong_check" CHECK (("so_luong" > 0))
);


ALTER TABLE "public"."fact_cssd_dieu_chuyen_thanh_phan" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_cssd_dieu_chuyen_thanh_phan" IS 'CSSD: nhật ký điều chuyển cấu phần giữa hai bộ QR.';



CREATE TABLE IF NOT EXISTS "public"."fact_cssd_lifecycle_event" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quy_trinh_id" "uuid" NOT NULL,
    "ma_su_kien" character varying(80) NOT NULL,
    "ma_tram" character varying(50),
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ghi_chu" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fact_cssd_lifecycle_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_cssd_lifecycle_event" IS 'CSSD: nhật ký sự kiện vòng đời (bổ sung fact_nhat_ky_quet), phục vụ domino/audit.';



CREATE TABLE IF NOT EXISTS "public"."fact_giam_sat_chung_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "criterion_id" "uuid" NOT NULL,
    "value" "text" DEFAULT ''::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fact_giam_sat_chung_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fact_giam_sat_chung_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "loai_bang_kiem" "text",
    "khoa_id" "uuid",
    "khu_vuc_id" "uuid",
    "vi_tri" "text",
    "hinh_thuc_giam_sat" "text",
    "cach_thuc_giam_sat" "text",
    "nguoi_giam_sat_id" "uuid",
    "is_giam_sat_ca_nhan" boolean DEFAULT false NOT NULL,
    "nhan_vien_id" "uuid",
    "nghe_nghiep_id" "uuid",
    "ngay_giam_sat" "date",
    "thoi_gian_ghi_nhan" timestamp with time zone,
    "tong_diem" numeric,
    "ghi_chu_chung" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_seen" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."fact_giam_sat_chung_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_giam_sat_chung_sessions" IS 'Phiên giám sát chung — stub greenfield.';



COMMENT ON COLUMN "public"."fact_giam_sat_chung_sessions"."is_seen" IS 'Người dùng đã mở xem/in phiên từ lịch sử.';



CREATE TABLE IF NOT EXISTS "public"."fact_giam_sat_nkbv_ca" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_ca" "text" NOT NULL,
    "khoa_ghi_nhan_id" "uuid",
    "ma_benh_nhan" "text",
    "ho_ten_benh_nhan" "text" NOT NULL,
    "ngay_sinh" "date",
    "gioi_tinh" "text",
    "ngay_vao_vien" "date",
    "ngay_phat_hien" "date" DEFAULT CURRENT_DATE NOT NULL,
    "vi_tri_nhiem_khuan" "text",
    "tac_nhan_vi_khuan" "text",
    "tom_tat_dien_bien" "text",
    "bien_phap_phong_ngua" "text",
    "loai_nkbv_id" "uuid" NOT NULL,
    "trang_thai_id" "uuid" NOT NULL,
    "ly_do_loai_tru" "text",
    "nguoi_ghi_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fact_giam_sat_nkbv_ca" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_giam_sat_nkbv_ca" IS 'Phiếu giám sát ca NKBV / HAI — nhập tay tại BV103 MVP.';



CREATE TABLE IF NOT EXISTS "public"."fact_giam_sat_vst" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "nhan_vien_id" "uuid",
    "ten_nhan_vien_ngoai" "text",
    "khoa_id" "uuid",
    "khu_vuc" "text",
    "vi_tri" "text",
    "nghe_nghiep" "text",
    "ngay_giam_sat" "date",
    "thoi_diem" "text",
    "hanh_dong" "text",
    "dung_ky_thuat" boolean,
    "du_thoi_gian" boolean,
    "co_deo_gang" boolean,
    "thoi_gian_ghi_nhan" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fact_giam_sat_vst" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fact_giam_sat_vst_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khoa_id" "uuid",
    "khu_vuc_id" "uuid",
    "vi_tri_cu_the" "text",
    "hinh_thuc_giam_sat" "text",
    "cach_thuc_giam_sat" "text",
    "nguoi_giam_sat_id" "uuid",
    "thoi_gian_bat_dau" timestamp with time zone,
    "thoi_gian_ket_thuc" timestamp with time zone,
    "ngay_giam_sat" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_seen" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."fact_giam_sat_vst_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_giam_sat_vst_sessions" IS 'Phiên giám sát VST — stub greenfield đồng bộ luồng migrations.';



COMMENT ON COLUMN "public"."fact_giam_sat_vst_sessions"."is_seen" IS 'Người dùng đã mở xem/in phiên từ lịch sử.';



CREATE TABLE IF NOT EXISTS "public"."fact_kho_chi_tiet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "giao_dich_id" "uuid",
    "vat_tu_id" "uuid",
    "so_luong" integer NOT NULL,
    "han_su_dung" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "anh_minh_chung" "text",
    "ghi_chu" "text",
    "quy_trinh_id" "uuid"
);


ALTER TABLE "public"."fact_kho_chi_tiet" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fact_kho_giao_dich" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_giao_dich" character varying(50) NOT NULL,
    "loai_giao_dich" character varying(50),
    "khoa_phong_id" "uuid",
    "nguoi_thuc_hien_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."fact_kho_giao_dich" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fact_kho_hoa_chat_giao_dich" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_phieu" character varying(80) NOT NULL,
    "dm_hoa_chat_id" "uuid" NOT NULL,
    "loai_giao_dich" character varying(24) NOT NULL,
    "so_luong_co_dau" numeric(18,4) NOT NULL,
    "ma_lo" character varying(80),
    "han_su_dung" "date",
    "ghi_chu" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fact_kho_hc_so_luong_loai" CHECK ((((("loai_giao_dich")::"text" = 'NHAP'::"text") AND ("so_luong_co_dau" > (0)::numeric)) OR ((("loai_giao_dich")::"text" = 'XUAT'::"text") AND ("so_luong_co_dau" < (0)::numeric)) OR ((("loai_giao_dich")::"text" = 'DIEU_CHINH'::"text") AND ("so_luong_co_dau" <> (0)::numeric)))),
    CONSTRAINT "fact_kho_hoa_chat_giao_dich_loai_giao_dich_check" CHECK ((("loai_giao_dich")::"text" = ANY ((ARRAY['NHAP'::character varying, 'XUAT'::character varying, 'DIEU_CHINH'::character varying])::"text"[])))
);


ALTER TABLE "public"."fact_kho_hoa_chat_giao_dich" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_kho_hoa_chat_giao_dich" IS 'KSNK kho hóa chất/vật tư: NHAP >0, XUAT <0, DIEU_CHINH có thể +/- ; tồn theo lô = SUM(so_luong_co_dau) GROUP BY dm_hoa_chat_id, ma_lo, han_su_dung.';



CREATE TABLE IF NOT EXISTS "public"."fact_lo_tiet_khuan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_lo_tiet_khuan" character varying(50) NOT NULL,
    "thiet_bi_id" "uuid",
    "thoi_gian_bat_dau" timestamp with time zone,
    "thoi_gian_ket_thuc" timestamp with time zone,
    "ket_qua_test" boolean,
    "nguoi_van_hanh_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "nhiet_do" numeric,
    "ap_suat" numeric,
    "thoi_gian_chu_ky" integer,
    "ghi_chu" "text",
    "loai_tiet_khuan" character varying(50),
    "ket_qua_bi" boolean,
    "ket_qua_ci" boolean,
    "ghi_chu_qc" "text"
);


ALTER TABLE "public"."fact_lo_tiet_khuan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fact_nhat_ky_quet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quy_trinh_id" "uuid",
    "ma_hanh_dong" character varying(50),
    "thiet_bi_id" "uuid",
    "nguoi_thuc_hien_id" "uuid",
    "ghi_chu" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "ma_tram" character varying(50),
    "nguoi_thuc_hien" "text"
);


ALTER TABLE "public"."fact_nhat_ky_quet" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fact_quy_trinh" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_qr_quy_trinh" character varying(100) NOT NULL,
    "bo_dung_cu_id" "uuid",
    "ma_trang_thai_hien_tai" character varying(50) NOT NULL,
    "nguoi_dang_giu_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "nguoi_tiep_nhan_id" "uuid",
    "nguoi_lam_sach_id" "uuid",
    "nguoi_kiem_tra_id" "uuid",
    "nguoi_dong_goi_id" "uuid",
    "nguoi_tiet_khuan_id" "uuid",
    "nguoi_cap_phat_id" "uuid",
    "thoi_gian_tiep_nhan" timestamp with time zone,
    "thoi_gian_lam_sach" timestamp with time zone,
    "thoi_gian_qc" timestamp with time zone,
    "thoi_gian_dong_goi" timestamp with time zone,
    "thoi_gian_tiet_khuan" timestamp with time zone,
    "thoi_gian_cap_phat" timestamp with time zone,
    "lo_tiet_khuan_id" "uuid",
    "suds_count" integer DEFAULT 0,
    "ngay_tiet_khuan" timestamp with time zone,
    "han_su_dung" timestamp with time zone,
    "tinh_trang" character varying(50) DEFAULT 'BINH_THUONG'::character varying,
    "tram_hien_tai" character varying(50),
    "trang_thai" character varying(50),
    "is_dong_bang" boolean DEFAULT false NOT NULL,
    "quy_trinh_cha_id" "uuid",
    "ma_vai_tro_bo" character varying(20) DEFAULT 'DON'::character varying NOT NULL
);


ALTER TABLE "public"."fact_quy_trinh" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_quy_trinh" IS 'Bảng quy trình (Cho phép lưu lịch sử nhiều chu kỳ của cùng 1 mã QR)';



COMMENT ON COLUMN "public"."fact_quy_trinh"."nguoi_tiep_nhan_id" IS 'Người thực hiện bước tiếp nhận';



COMMENT ON COLUMN "public"."fact_quy_trinh"."is_dong_bang" IS 'Khóa an toàn: thiếu/hỏng cấu phần — chỉ quản trị mở.';



COMMENT ON COLUMN "public"."fact_quy_trinh"."quy_trinh_cha_id" IS 'QR phụ (SUB) trỏ về quy trình MAIN khi tách mã đóng gói.';



COMMENT ON COLUMN "public"."fact_quy_trinh"."ma_vai_tro_bo" IS 'DON | MAIN | SUB — hội quân cấp phát.';



CREATE TABLE IF NOT EXISTS "public"."fact_quy_trinh_thanh_phan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quy_trinh_id" "uuid" NOT NULL,
    "dm_bo_dung_cu_chi_tiet_id" "uuid",
    "ten_dung_cu_le" "text" NOT NULL,
    "so_luong_ke_hoach" integer DEFAULT 0 NOT NULL,
    "so_luong_thuc_te" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fact_quy_trinh_thanh_phan" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_quy_trinh_thanh_phan" IS 'CSSD: cấu phần theo từng QR vòng đời (bám dm_bo_dung_cu_chi_tiet).';



CREATE TABLE IF NOT EXISTS "public"."fact_su_co" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quy_trinh_id" "uuid",
    "ma_qr_quy_trinh" "text" NOT NULL,
    "ma_tram_phat_hien" "text" NOT NULL,
    "ma_tram_gay_loi" "text",
    "ma_loai_su_co" "text" NOT NULL,
    "mo_ta" "text",
    "is_red_alert" boolean DEFAULT false,
    "nguoi_bao_id" "uuid",
    "nguoi_xac_nhan_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fact_su_co" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_su_co" IS 'Bảng lưu tất cả sự cố CSSD - Configuration-Driven Hybrid EAV';



CREATE TABLE IF NOT EXISTS "public"."fact_su_co_chi_tiet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "su_co_id" "uuid",
    "ma_chi_tiet_su_co" "text" NOT NULL,
    "gia_tri_chi_tiet" "text" NOT NULL
);


ALTER TABLE "public"."fact_su_co_chi_tiet" OWNER TO "postgres";


COMMENT ON TABLE "public"."fact_su_co_chi_tiet" IS 'Bảng EAV lưu các thuộc tính động của sự cố';



CREATE TABLE IF NOT EXISTS "public"."mdm_field_registry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "column_name" "text" NOT NULL,
    "field_role" "text" NOT NULL,
    "source_table" "text",
    "source_column" "text" DEFAULT 'id'::"text",
    "source_loai_danh_muc" "text",
    "owner_module" "text",
    "suggestion_policy" "text" DEFAULT 'MANUAL_REVIEW'::"text" NOT NULL,
    "is_required" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mdm_field_registry_field_role_check" CHECK (("field_role" = ANY (ARRAY['FK_TO_DM'::"text", 'FK_TO_SPECIALIZED'::"text", 'TEXT_ENUM'::"text", 'DOMAIN_ATTRIBUTE'::"text", 'FACT_REFERENCE'::"text"]))),
    CONSTRAINT "mdm_field_registry_suggestion_policy_check" CHECK (("suggestion_policy" = ANY (ARRAY['MANUAL_REVIEW'::"text", 'AUTO_SUGGEST'::"text", 'AUTO_ENFORCE'::"text"])))
);


ALTER TABLE "public"."mdm_field_registry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mdm_governance_suggestion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "column_name" "text" NOT NULL,
    "suggestion_type" "text" NOT NULL,
    "confidence" smallint DEFAULT 50 NOT NULL,
    "reason" "text" NOT NULL,
    "proposed_field_role" "text",
    "proposed_source_table" "text",
    "proposed_source_loai_danh_muc" "text",
    "status" "text" DEFAULT 'OPEN'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mdm_governance_suggestion_confidence_check" CHECK ((("confidence" >= 0) AND ("confidence" <= 100))),
    CONSTRAINT "mdm_governance_suggestion_status_check" CHECK (("status" = ANY (ARRAY['OPEN'::"text", 'APPROVED'::"text", 'REJECTED'::"text", 'DONE'::"text"]))),
    CONSTRAINT "mdm_governance_suggestion_suggestion_type_check" CHECK (("suggestion_type" = ANY (ARRAY['REGISTER_FK'::"text", 'CONSIDER_ENUM_TO_DM'::"text", 'REVIEW_SOURCE_OF_TRUTH'::"text"])))
);


ALTER TABLE "public"."mdm_governance_suggestion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mdm_nhan_su" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ho_ten" "text",
    "ma_nv" "text",
    "khoa_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_sinh" "date",
    "gioi_tinh" "text",
    "to_id" "uuid",
    "chuc_vu" "text",
    "chuc_danh" "text",
    "vai_tro_he_thong_ksnk" "text",
    "so_dien_thoai" "text",
    "email" "text",
    "extra_data" "jsonb" DEFAULT '{}'::"jsonb",
    "chuc_vu_id" "uuid",
    "chuc_danh_id" "uuid",
    "vai_tro_he_thong_id" "uuid",
    "auth_user_id" "uuid",
    "nghe_nghiep_id" "uuid"
);


ALTER TABLE "public"."mdm_nhan_su" OWNER TO "postgres";


COMMENT ON COLUMN "public"."mdm_nhan_su"."auth_user_id" IS 'Tài khoản đăng nhập gắn với hồ sơ (nếu có). Nhân sự chỉ danh bạ để chọn trong form: để null.';



CREATE TABLE IF NOT EXISTS "public"."rel_role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rel_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rel_user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rel_user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_fact_giam_sat_vst_sessions_full" AS
 SELECT "s"."id",
    "s"."khoa_id",
    "s"."khu_vuc_id",
    "s"."vi_tri_cu_the",
    "s"."hinh_thuc_giam_sat",
    "s"."cach_thuc_giam_sat",
    "s"."nguoi_giam_sat_id",
    "s"."thoi_gian_bat_dau",
    "s"."thoi_gian_ket_thuc",
    "s"."ngay_giam_sat",
    "s"."created_at",
    "s"."updated_at",
    "s"."is_active",
    "s"."is_seen",
    "k"."ten_khoa" AS "ten_khoa_phong",
    "kv"."ten_khu_vuc" AS "ten_khu_vuc_giam_sat",
    "ns"."ho_ten" AS "ten_nguoi_giam_sat",
    ( SELECT "count"(*) AS "count"
           FROM "public"."fact_giam_sat_vst"
          WHERE ("fact_giam_sat_vst"."session_id" = "s"."id")) AS "tong_co_hoi",
    ( SELECT "count"(*) AS "count"
           FROM "public"."fact_giam_sat_vst"
          WHERE (("fact_giam_sat_vst"."session_id" = "s"."id") AND (("lower"("public"."unaccent"("fact_giam_sat_vst"."hanh_dong")) = 'rua tay bang nuoc'::"text") OR ("lower"("public"."unaccent"("fact_giam_sat_vst"."hanh_dong")) = 'cha tay bang con'::"text")))) AS "da_tuan_thu"
   FROM ((("public"."fact_giam_sat_vst_sessions" "s"
     LEFT JOIN "public"."dm_khoa_phong" "k" ON (("s"."khoa_id" = "k"."id")))
     LEFT JOIN "public"."dm_khu_vuc_giam_sat" "kv" ON (("s"."khu_vuc_id" = "kv"."id")))
     LEFT JOIN "public"."mdm_nhan_su" "ns" ON (("s"."nguoi_giam_sat_id" = "ns"."id")))
  WHERE ("s"."is_active" = true);


ALTER VIEW "public"."v_fact_giam_sat_vst_sessions_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_fact_quy_trinh_full" AS
 SELECT "q"."id",
    "q"."ma_qr_quy_trinh",
    "q"."bo_dung_cu_id",
    "q"."ma_trang_thai_hien_tai",
    "q"."nguoi_dang_giu_id",
    "q"."created_at",
    "q"."updated_at",
    "q"."is_active",
    "q"."nguoi_tiep_nhan_id",
    "q"."nguoi_lam_sach_id",
    "q"."nguoi_kiem_tra_id",
    "q"."nguoi_dong_goi_id",
    "q"."nguoi_tiet_khuan_id",
    "q"."nguoi_cap_phat_id",
    "q"."thoi_gian_tiep_nhan",
    "q"."thoi_gian_lam_sach",
    "q"."thoi_gian_qc",
    "q"."thoi_gian_dong_goi",
    "q"."thoi_gian_tiet_khuan",
    "q"."thoi_gian_cap_phat",
    "q"."lo_tiet_khuan_id",
    "q"."suds_count",
    "q"."ngay_tiet_khuan",
    "q"."han_su_dung",
    "q"."tinh_trang",
    "q"."tram_hien_tai",
    "q"."trang_thai",
    "q"."is_dong_bang",
    "q"."quy_trinh_cha_id",
    "q"."ma_vai_tro_bo",
    "b"."ten_bo",
    "b"."ma_bo",
    "k"."ten_khoa",
    "l"."ten_loai_dung_cu"
   FROM ((("public"."fact_quy_trinh" "q"
     LEFT JOIN "public"."dm_bo_dung_cu" "b" ON (("q"."bo_dung_cu_id" = "b"."id")))
     LEFT JOIN "public"."dm_khoa_phong" "k" ON (("b"."khoa_su_dung_id" = "k"."id")))
     LEFT JOIN "public"."dm_loai_dung_cu" "l" ON (("b"."loai_dung_cu_id" = "l"."id")));


ALTER VIEW "public"."v_fact_quy_trinh_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_mdm_nhan_su_full" AS
 SELECT "ns"."id",
    "ns"."ho_ten",
    "ns"."ma_nv",
    "ns"."khoa_id",
    "ns"."is_active",
    "ns"."created_at",
    "ns"."updated_at",
    "ns"."ngay_sinh",
    "ns"."gioi_tinh",
    "ns"."to_id",
    "ns"."chuc_vu",
    "ns"."chuc_danh",
    "ns"."vai_tro_he_thong_ksnk",
    "ns"."so_dien_thoai",
    "ns"."email",
    "ns"."extra_data",
    "ns"."chuc_vu_id",
    "ns"."chuc_danh_id",
    "ns"."vai_tro_he_thong_id",
    "ns"."auth_user_id",
    "ns"."nghe_nghiep_id",
    "k"."ten_khoa",
    "nn"."ten_nghe_nghiep",
    "cd"."ten_chuc_danh",
    "cv"."ten_chuc_vu",
    "t"."ten_to",
    "r"."name" AS "ten_vai_tro"
   FROM (((((("public"."mdm_nhan_su" "ns"
     LEFT JOIN "public"."dm_khoa_phong" "k" ON (("ns"."khoa_id" = "k"."id")))
     LEFT JOIN "public"."dm_nghe_nghiep" "nn" ON (("ns"."nghe_nghiep_id" = "nn"."id")))
     LEFT JOIN "public"."dm_chuc_danh" "cd" ON (("ns"."chuc_danh_id" = "cd"."id")))
     LEFT JOIN "public"."dm_chuc_vu" "cv" ON (("ns"."chuc_vu_id" = "cv"."id")))
     LEFT JOIN "public"."dm_to_cong_tac" "t" ON (("ns"."to_id" = "t"."id")))
     LEFT JOIN "public"."dm_roles" "r" ON (("ns"."vai_tro_he_thong_id" = "r"."id")));


ALTER VIEW "public"."v_mdm_nhan_su_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_role_permissions_matrix" AS
 SELECT "r"."id" AS "role_id",
    "r"."name" AS "role_name",
    "array_agg"("rp"."permission_id") FILTER (WHERE ("rp"."permission_id" IS NOT NULL)) AS "permission_ids"
   FROM ("public"."dm_roles" "r"
     LEFT JOIN "public"."rel_role_permissions" "rp" ON (("r"."id" = "rp"."role_id")))
  GROUP BY "r"."id", "r"."name";


ALTER VIEW "public"."v_role_permissions_matrix" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_staff_auth_overview" AS
 SELECT "ns"."id",
    "ns"."ma_nv",
    "ns"."ho_ten",
    "ns"."email",
    "ns"."is_active",
    "ns"."auth_user_id",
    "array_agg"("r"."name") FILTER (WHERE ("r"."name" IS NOT NULL)) AS "role_names"
   FROM (("public"."mdm_nhan_su" "ns"
     LEFT JOIN "public"."rel_user_roles" "ur" ON (("ns"."auth_user_id" = "ur"."user_id")))
     LEFT JOIN "public"."dm_roles" "r" ON (("ur"."role_id" = "r"."id")))
  GROUP BY "ns"."id", "ns"."ma_nv", "ns"."ho_ten", "ns"."email", "ns"."is_active", "ns"."auth_user_id";


ALTER VIEW "public"."v_staff_auth_overview" OWNER TO "postgres";


ALTER TABLE ONLY "public"."fact_cong_viec_comments"
    ADD CONSTRAINT "cong_viec_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_cong_viec"
    ADD CONSTRAINT "cong_viec_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_bang_kiem"
    ADD CONSTRAINT "danh_muc_bang_kiem_ma_bk_key" UNIQUE ("ma_bk");



ALTER TABLE ONLY "public"."dm_bang_kiem"
    ADD CONSTRAINT "danh_muc_bang_kiem_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_bo_dung_cu_chi_tiet"
    ADD CONSTRAINT "dm_bo_dung_cu_chi_tiet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_bo_dung_cu"
    ADD CONSTRAINT "dm_bo_dung_cu_ma_bo_key" UNIQUE ("ma_bo");



ALTER TABLE ONLY "public"."dm_bo_dung_cu"
    ADD CONSTRAINT "dm_bo_dung_cu_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_cach_thuc_giam_sat"
    ADD CONSTRAINT "dm_cach_thuc_giam_sat_ma_cach_thuc_key" UNIQUE ("ma_cach_thuc");



ALTER TABLE ONLY "public"."dm_cach_thuc_giam_sat"
    ADD CONSTRAINT "dm_cach_thuc_giam_sat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_chuc_danh"
    ADD CONSTRAINT "dm_chuc_danh_legacy_danh_muc_id_key" UNIQUE ("legacy_danh_muc_id");



ALTER TABLE ONLY "public"."dm_chuc_danh"
    ADD CONSTRAINT "dm_chuc_danh_ma_chuc_danh_key" UNIQUE ("ma_chuc_danh");



ALTER TABLE ONLY "public"."dm_chuc_danh"
    ADD CONSTRAINT "dm_chuc_danh_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_chuc_vu"
    ADD CONSTRAINT "dm_chuc_vu_legacy_danh_muc_id_key" UNIQUE ("legacy_danh_muc_id");



ALTER TABLE ONLY "public"."dm_chuc_vu"
    ADD CONSTRAINT "dm_chuc_vu_ma_chuc_vu_key" UNIQUE ("ma_chuc_vu");



ALTER TABLE ONLY "public"."dm_chuc_vu"
    ADD CONSTRAINT "dm_chuc_vu_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_hinh_thuc_giam_sat"
    ADD CONSTRAINT "dm_hinh_thuc_giam_sat_ma_hinh_thuc_key" UNIQUE ("ma_hinh_thuc");



ALTER TABLE ONLY "public"."dm_hinh_thuc_giam_sat"
    ADD CONSTRAINT "dm_hinh_thuc_giam_sat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_hoa_chat"
    ADD CONSTRAINT "dm_hoa_chat_ma_hoa_chat_key" UNIQUE ("ma_hoa_chat");



ALTER TABLE ONLY "public"."dm_hoa_chat"
    ADD CONSTRAINT "dm_hoa_chat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_khoa_phong"
    ADD CONSTRAINT "dm_khoa_phong_ma_khoa_key" UNIQUE ("ma_khoa");



ALTER TABLE ONLY "public"."dm_khoa_phong"
    ADD CONSTRAINT "dm_khoa_phong_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_khoi_khoa"
    ADD CONSTRAINT "dm_khoi_khoa_legacy_danh_muc_id_key" UNIQUE ("legacy_danh_muc_id");



ALTER TABLE ONLY "public"."dm_khoi_khoa"
    ADD CONSTRAINT "dm_khoi_khoa_ma_khoi_key" UNIQUE ("ma_khoi");



ALTER TABLE ONLY "public"."dm_khoi_khoa"
    ADD CONSTRAINT "dm_khoi_khoa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_khu_vuc_giam_sat"
    ADD CONSTRAINT "dm_khu_vuc_giam_sat_legacy_danh_muc_id_key" UNIQUE ("legacy_danh_muc_id");



ALTER TABLE ONLY "public"."dm_khu_vuc_giam_sat"
    ADD CONSTRAINT "dm_khu_vuc_giam_sat_ma_khu_vuc_key" UNIQUE ("ma_khu_vuc");



ALTER TABLE ONLY "public"."dm_khu_vuc_giam_sat"
    ADD CONSTRAINT "dm_khu_vuc_giam_sat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_loai_cong_viec"
    ADD CONSTRAINT "dm_loai_cong_viec_ma_loai_key" UNIQUE ("ma_loai");



ALTER TABLE ONLY "public"."dm_loai_cong_viec"
    ADD CONSTRAINT "dm_loai_cong_viec_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_loai_dung_cu"
    ADD CONSTRAINT "dm_loai_dung_cu_ma_loai_key" UNIQUE ("ma_loai");



ALTER TABLE ONLY "public"."dm_loai_dung_cu"
    ADD CONSTRAINT "dm_loai_dung_cu_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_loai_may_tiet_khuan"
    ADD CONSTRAINT "dm_loai_may_tiet_khuan_legacy_danh_muc_id_key" UNIQUE ("legacy_danh_muc_id");



ALTER TABLE ONLY "public"."dm_loai_may_tiet_khuan"
    ADD CONSTRAINT "dm_loai_may_tiet_khuan_ma_loai_may_key" UNIQUE ("ma_loai_may");



ALTER TABLE ONLY "public"."dm_loai_may_tiet_khuan"
    ADD CONSTRAINT "dm_loai_may_tiet_khuan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_loai_nkbv"
    ADD CONSTRAINT "dm_loai_nkbv_ma_loai_key" UNIQUE ("ma_loai");



ALTER TABLE ONLY "public"."dm_loai_nkbv"
    ADD CONSTRAINT "dm_loai_nkbv_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_loai_su_co"
    ADD CONSTRAINT "dm_loai_su_co_legacy_danh_muc_id_key" UNIQUE ("legacy_danh_muc_id");



ALTER TABLE ONLY "public"."dm_loai_su_co"
    ADD CONSTRAINT "dm_loai_su_co_ma_loai_su_co_key" UNIQUE ("ma_loai_su_co");



ALTER TABLE ONLY "public"."dm_loai_su_co"
    ADD CONSTRAINT "dm_loai_su_co_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_nghe_nghiep"
    ADD CONSTRAINT "dm_nghe_nghiep_legacy_danh_muc_id_key" UNIQUE ("legacy_danh_muc_id");



ALTER TABLE ONLY "public"."dm_nghe_nghiep"
    ADD CONSTRAINT "dm_nghe_nghiep_ma_nghe_nghiep_key" UNIQUE ("ma_nghe_nghiep");



ALTER TABLE ONLY "public"."dm_nghe_nghiep"
    ADD CONSTRAINT "dm_nghe_nghiep_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_thiet_bi"
    ADD CONSTRAINT "dm_thiet_bi_ma_thiet_bi_key" UNIQUE ("ma_thiet_bi");



ALTER TABLE ONLY "public"."dm_thiet_bi"
    ADD CONSTRAINT "dm_thiet_bi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_to_cong_tac"
    ADD CONSTRAINT "dm_to_cong_tac_legacy_danh_muc_id_key" UNIQUE ("legacy_danh_muc_id");



ALTER TABLE ONLY "public"."dm_to_cong_tac"
    ADD CONSTRAINT "dm_to_cong_tac_ma_to_key" UNIQUE ("ma_to");



ALTER TABLE ONLY "public"."dm_to_cong_tac"
    ADD CONSTRAINT "dm_to_cong_tac_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_trang_thai_cong_viec"
    ADD CONSTRAINT "dm_trang_thai_cong_viec_ma_trang_thai_key" UNIQUE ("ma_trang_thai");



ALTER TABLE ONLY "public"."dm_trang_thai_cong_viec"
    ADD CONSTRAINT "dm_trang_thai_cong_viec_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_trang_thai_nkbv_ca"
    ADD CONSTRAINT "dm_trang_thai_nkbv_ca_ma_trang_thai_key" UNIQUE ("ma_trang_thai");



ALTER TABLE ONLY "public"."dm_trang_thai_nkbv_ca"
    ADD CONSTRAINT "dm_trang_thai_nkbv_ca_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_activity_log"
    ADD CONSTRAINT "fact_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_bao_tri_thiet_bi"
    ADD CONSTRAINT "fact_bao_tri_thiet_bi_ma_phieu_key" UNIQUE ("ma_phieu");



ALTER TABLE ONLY "public"."fact_bao_tri_thiet_bi"
    ADD CONSTRAINT "fact_bao_tri_thiet_bi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_cssd_dieu_chuyen_thanh_phan"
    ADD CONSTRAINT "fact_cssd_dieu_chuyen_thanh_phan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_cssd_lifecycle_event"
    ADD CONSTRAINT "fact_cssd_lifecycle_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_kho_hoa_chat_giao_dich"
    ADD CONSTRAINT "fact_kho_hc_ma_phieu_key" UNIQUE ("ma_phieu");



ALTER TABLE ONLY "public"."fact_kho_hoa_chat_giao_dich"
    ADD CONSTRAINT "fact_kho_hoa_chat_giao_dich_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_quy_trinh_thanh_phan"
    ADD CONSTRAINT "fact_quy_trinh_thanh_phan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_giam_sat_chung_results"
    ADD CONSTRAINT "giam_sat_chung_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_giam_sat_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_giam_sat_nkbv_ca"
    ADD CONSTRAINT "giam_sat_nkbv_ca_ma_ca_key" UNIQUE ("ma_ca");



ALTER TABLE ONLY "public"."fact_giam_sat_nkbv_ca"
    ADD CONSTRAINT "giam_sat_nkbv_ca_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_giam_sat_vst"
    ADD CONSTRAINT "giam_sat_vst_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_giam_sat_vst_sessions"
    ADD CONSTRAINT "giam_sat_vst_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."fact_giam_sat_chung_sessions"
    ADD CONSTRAINT "gsgc_cach_thuc_check" CHECK ((("cach_thuc_giam_sat" IS NULL) OR ("cach_thuc_giam_sat" = ANY (ARRAY['Giám sát trực tiếp tại chỗ'::"text", 'Giám sát trực tiếp qua camera'::"text", 'Giám sát lại qua camera'::"text"])))) NOT VALID;



ALTER TABLE "public"."fact_giam_sat_chung_sessions"
    ADD CONSTRAINT "gsgc_hinh_thuc_check" CHECK ((("hinh_thuc_giam_sat" IS NULL) OR ("hinh_thuc_giam_sat" = ANY (ARRAY['Tự giám sát'::"text", 'Giám sát khách quan'::"text"])))) NOT VALID;



ALTER TABLE "public"."fact_giam_sat_vst_sessions"
    ADD CONSTRAINT "gsvst_cach_thuc_check" CHECK ((("cach_thuc_giam_sat" IS NULL) OR ("cach_thuc_giam_sat" = ANY (ARRAY['Giám sát trực tiếp tại chỗ'::"text", 'Giám sát trực tiếp qua camera'::"text", 'Giám sát lại qua camera'::"text"])))) NOT VALID;



ALTER TABLE "public"."fact_giam_sat_vst_sessions"
    ADD CONSTRAINT "gsvst_hinh_thuc_check" CHECK ((("hinh_thuc_giam_sat" IS NULL) OR ("hinh_thuc_giam_sat" = ANY (ARRAY['Tự giám sát'::"text", 'Giám sát khách quan'::"text"])))) NOT VALID;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_ma_nv_key" UNIQUE ("ma_nv");



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_kho_chi_tiet"
    ADD CONSTRAINT "kho_chi_tiet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_kho_giao_dich"
    ADD CONSTRAINT "kho_giao_dich_ma_giao_dich_key" UNIQUE ("ma_giao_dich");



ALTER TABLE ONLY "public"."fact_kho_giao_dich"
    ADD CONSTRAINT "kho_giao_dich_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_lo_tiet_khuan"
    ADD CONSTRAINT "lo_tiet_khuan_ma_lo_tiet_khuan_key" UNIQUE ("ma_lo_tiet_khuan");



ALTER TABLE ONLY "public"."fact_lo_tiet_khuan"
    ADD CONSTRAINT "lo_tiet_khuan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mdm_field_registry"
    ADD CONSTRAINT "mdm_field_registry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mdm_governance_suggestion"
    ADD CONSTRAINT "mdm_governance_suggestion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mdm_governance_suggestion"
    ADD CONSTRAINT "mdm_governance_suggestion_table_name_column_name_suggestion_key" UNIQUE ("table_name", "column_name", "suggestion_type", "status");



ALTER TABLE ONLY "public"."fact_nhat_ky_quet"
    ADD CONSTRAINT "nhat_ky_quet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_quy_trinh"
    ADD CONSTRAINT "quy_trinh_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rel_role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."dm_roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_su_co_chi_tiet"
    ADD CONSTRAINT "su_co_chi_tiet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fact_su_co"
    ADD CONSTRAINT "su_co_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dm_tieu_chi_bang_kiem"
    ADD CONSTRAINT "tieu_chi_bang_kiem_ma_tc_key" UNIQUE ("ma_tc");



ALTER TABLE ONLY "public"."dm_tieu_chi_bang_kiem"
    ADD CONSTRAINT "tieu_chi_bang_kiem_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mdm_field_registry"
    ADD CONSTRAINT "uq_mdm_field_registry" UNIQUE ("table_name", "column_name");



ALTER TABLE ONLY "public"."dm_permissions"
    ADD CONSTRAINT "uq_permissions_module_action" UNIQUE ("module_name", "action");



ALTER TABLE ONLY "public"."rel_role_permissions"
    ADD CONSTRAINT "uq_role_permissions" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."rel_user_roles"
    ADD CONSTRAINT "uq_user_roles" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."rel_user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "cong_viec_ma_cv_root_unique" ON "public"."fact_cong_viec" USING "btree" ("ma_cong_viec") WHERE (("cong_viec_cha_id" IS NULL) AND ("ma_cong_viec" IS NOT NULL) AND ("btrim"("ma_cong_viec") <> ''::"text"));



CREATE INDEX "idx_cong_viec_comments_task" ON "public"."fact_cong_viec_comments" USING "btree" ("cong_viec_id");



CREATE INDEX "idx_cong_viec_created_at" ON "public"."fact_cong_viec" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_cong_viec_khoa_thuc_hien_id" ON "public"."fact_cong_viec" USING "btree" ("khoa_thuc_hien_id");



CREATE INDEX "idx_cong_viec_loai" ON "public"."fact_cong_viec" USING "btree" ("ma_loai_cong_viec");



CREATE INDEX "idx_cong_viec_parent_id" ON "public"."fact_cong_viec" USING "btree" ("cong_viec_cha_id");



CREATE INDEX "idx_cong_viec_to_id" ON "public"."fact_cong_viec" USING "btree" ("to_cong_tac_id");



CREATE INDEX "idx_cssd_dieu_chuyen_den" ON "public"."fact_cssd_dieu_chuyen_thanh_phan" USING "btree" ("den_quy_trinh_id");



CREATE INDEX "idx_cssd_dieu_chuyen_tu" ON "public"."fact_cssd_dieu_chuyen_thanh_phan" USING "btree" ("tu_quy_trinh_id");



CREATE INDEX "idx_danh_muc_bk_ma" ON "public"."dm_bang_kiem" USING "btree" ("ma_bk");



CREATE INDEX "idx_dm_bo_dung_cu_chi_tiet_loai_id" ON "public"."dm_bo_dung_cu_chi_tiet" USING "btree" ("loai_dung_cu_id");



CREATE INDEX "idx_dm_bo_dung_cu_chi_tiet_ma_loai" ON "public"."dm_bo_dung_cu_chi_tiet" USING "btree" ("ma_loai");



CREATE INDEX "idx_dm_bo_dung_cu_khoa_su_dung_id" ON "public"."dm_bo_dung_cu" USING "btree" ("khoa_su_dung_id");



CREATE INDEX "idx_dm_bo_dung_cu_loai_dung_cu_id" ON "public"."dm_bo_dung_cu" USING "btree" ("loai_dung_cu_id");



CREATE INDEX "idx_dm_bo_dung_cu_ma" ON "public"."dm_bo_dung_cu" USING "btree" ("ma_bo");



CREATE INDEX "idx_dm_cach_thuc_giam_sat_active" ON "public"."dm_cach_thuc_giam_sat" USING "btree" ("is_active");



CREATE INDEX "idx_dm_chuc_danh_active" ON "public"."dm_chuc_danh" USING "btree" ("is_active");



CREATE INDEX "idx_dm_chuc_vu_active" ON "public"."dm_chuc_vu" USING "btree" ("is_active");



CREATE INDEX "idx_dm_hinh_thuc_giam_sat_active" ON "public"."dm_hinh_thuc_giam_sat" USING "btree" ("is_active");



CREATE INDEX "idx_dm_khoa_phong_khoi_id" ON "public"."dm_khoa_phong" USING "btree" ("khoi_id");



CREATE INDEX "idx_dm_khoi_khoa_active" ON "public"."dm_khoi_khoa" USING "btree" ("is_active");



CREATE INDEX "idx_dm_khu_vuc_giam_sat_active" ON "public"."dm_khu_vuc_giam_sat" USING "btree" ("is_active");



CREATE INDEX "idx_dm_loai_cong_viec_active" ON "public"."dm_loai_cong_viec" USING "btree" ("is_active");



CREATE INDEX "idx_dm_loai_dung_cu_active" ON "public"."dm_loai_dung_cu" USING "btree" ("is_active");



CREATE INDEX "idx_dm_loai_may_tiet_khuan_active" ON "public"."dm_loai_may_tiet_khuan" USING "btree" ("is_active");



CREATE INDEX "idx_dm_loai_su_co_active" ON "public"."dm_loai_su_co" USING "btree" ("is_active");



CREATE INDEX "idx_dm_nghe_nghiep_active" ON "public"."dm_nghe_nghiep" USING "btree" ("is_active");



CREATE INDEX "idx_dm_to_cong_tac_active" ON "public"."dm_to_cong_tac" USING "btree" ("is_active");



CREATE INDEX "idx_dm_trang_thai_cong_viec_active" ON "public"."dm_trang_thai_cong_viec" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_fact_bao_tri_one_dang_per_tb" ON "public"."fact_bao_tri_thiet_bi" USING "btree" ("thiet_bi_id") WHERE ((("trang_thai")::"text" = 'DANG_THUC_HIEN'::"text") AND COALESCE("is_active", true));



CREATE INDEX "idx_fact_bao_tri_tb" ON "public"."fact_bao_tri_thiet_bi" USING "btree" ("thiet_bi_id");



CREATE INDEX "idx_fact_bao_tri_trang" ON "public"."fact_bao_tri_thiet_bi" USING "btree" ("trang_thai");



CREATE INDEX "idx_fact_cssd_lifecycle_created" ON "public"."fact_cssd_lifecycle_event" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fact_cssd_lifecycle_quy_trinh" ON "public"."fact_cssd_lifecycle_event" USING "btree" ("quy_trinh_id");



CREATE INDEX "idx_fact_kho_hc_created" ON "public"."fact_kho_hoa_chat_giao_dich" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fact_kho_hc_dm" ON "public"."fact_kho_hoa_chat_giao_dich" USING "btree" ("dm_hoa_chat_id");



CREATE INDEX "idx_fact_kho_hc_loai" ON "public"."fact_kho_hoa_chat_giao_dich" USING "btree" ("loai_giao_dich");



CREATE INDEX "idx_fact_quy_trinh_cha" ON "public"."fact_quy_trinh" USING "btree" ("quy_trinh_cha_id");



CREATE INDEX "idx_fact_quy_trinh_thanh_phan_qt" ON "public"."fact_quy_trinh_thanh_phan" USING "btree" ("quy_trinh_id");



CREATE INDEX "idx_giam_sat_chung_results_session_id" ON "public"."fact_giam_sat_chung_results" USING "btree" ("session_id");



CREATE INDEX "idx_giam_sat_nkbv_ca_khoa" ON "public"."fact_giam_sat_nkbv_ca" USING "btree" ("khoa_ghi_nhan_id");



CREATE INDEX "idx_giam_sat_nkbv_ca_loai" ON "public"."fact_giam_sat_nkbv_ca" USING "btree" ("loai_nkbv_id");



CREATE INDEX "idx_giam_sat_nkbv_ca_ngay_phat" ON "public"."fact_giam_sat_nkbv_ca" USING "btree" ("ngay_phat_hien" DESC);



CREATE INDEX "idx_giam_sat_nkbv_ca_trang_thai" ON "public"."fact_giam_sat_nkbv_ca" USING "btree" ("trang_thai_id");



CREATE INDEX "idx_giam_sat_vst_session_id" ON "public"."fact_giam_sat_vst" USING "btree" ("session_id");



CREATE INDEX "idx_ho_so_nhan_vien_chuc_danh_id" ON "public"."mdm_nhan_su" USING "btree" ("chuc_danh_id");



CREATE INDEX "idx_ho_so_nhan_vien_chuc_vu_id" ON "public"."mdm_nhan_su" USING "btree" ("chuc_vu_id");



CREATE INDEX "idx_ho_so_nhan_vien_is_active" ON "public"."mdm_nhan_su" USING "btree" ("is_active");



CREATE INDEX "idx_ho_so_nhan_vien_khoa_id" ON "public"."mdm_nhan_su" USING "btree" ("khoa_id");



CREATE INDEX "idx_ho_so_nhan_vien_to_id" ON "public"."mdm_nhan_su" USING "btree" ("to_id");



CREATE INDEX "idx_ho_so_nhan_vien_vai_tro_he_thong_id" ON "public"."mdm_nhan_su" USING "btree" ("vai_tro_he_thong_id");



CREATE INDEX "idx_kho_chi_tiet_quy_trinh" ON "public"."fact_kho_chi_tiet" USING "btree" ("quy_trinh_id");



CREATE INDEX "idx_lo_tiet_khuan_created_at" ON "public"."fact_lo_tiet_khuan" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lo_tiet_khuan_ma" ON "public"."fact_lo_tiet_khuan" USING "btree" ("ma_lo_tiet_khuan");



CREATE INDEX "idx_mdm_field_registry_active" ON "public"."mdm_field_registry" USING "btree" ("table_name", "is_active");



CREATE INDEX "idx_mdm_governance_suggestion_status" ON "public"."mdm_governance_suggestion" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_quy_trinh_han_su_dung" ON "public"."fact_quy_trinh" USING "btree" ("han_su_dung");



CREATE INDEX "idx_quy_trinh_lo_tiet_khuan" ON "public"."fact_quy_trinh" USING "btree" ("lo_tiet_khuan_id");



CREATE INDEX "idx_quy_trinh_ma_vach_qr" ON "public"."fact_quy_trinh" USING "btree" ("ma_qr_quy_trinh");



CREATE INDEX "idx_quy_trinh_tinh_trang" ON "public"."fact_quy_trinh" USING "btree" ("tinh_trang");



CREATE INDEX "idx_quy_trinh_trang_thai" ON "public"."fact_quy_trinh" USING "btree" ("ma_trang_thai_hien_tai");



CREATE INDEX "idx_role_permissions_permission_id" ON "public"."rel_role_permissions" USING "btree" ("permission_id");



CREATE INDEX "idx_role_permissions_role_id" ON "public"."rel_role_permissions" USING "btree" ("role_id");



CREATE INDEX "idx_su_co_chi_tiet_key" ON "public"."fact_su_co_chi_tiet" USING "btree" ("ma_chi_tiet_su_co");



CREATE INDEX "idx_su_co_chi_tiet_su_co" ON "public"."fact_su_co_chi_tiet" USING "btree" ("su_co_id");



CREATE INDEX "idx_su_co_is_active" ON "public"."fact_su_co" USING "btree" ("is_active");



CREATE INDEX "idx_su_co_ma_vach" ON "public"."fact_su_co" USING "btree" ("ma_qr_quy_trinh");



CREATE INDEX "idx_su_co_quy_trinh" ON "public"."fact_su_co" USING "btree" ("quy_trinh_id");



CREATE INDEX "idx_su_co_red_alert" ON "public"."fact_su_co" USING "btree" ("is_red_alert");



CREATE INDEX "idx_su_co_updated_at" ON "public"."fact_su_co" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_tieu_chi_bk_ma" ON "public"."dm_tieu_chi_bang_kiem" USING "btree" ("ma_tc");



CREATE INDEX "idx_tieu_chi_bk_parent" ON "public"."dm_tieu_chi_bang_kiem" USING "btree" ("bang_kiem_id");



CREATE INDEX "idx_user_roles_role_id" ON "public"."rel_user_roles" USING "btree" ("role_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."rel_user_roles" USING "btree" ("user_id");



CREATE UNIQUE INDEX "uq_fact_quy_trinh_thanh_phan_qt_ten" ON "public"."fact_quy_trinh_thanh_phan" USING "btree" ("quy_trinh_id", "ten_dung_cu_le");



CREATE UNIQUE INDEX "uq_ho_so_nhan_vien_auth_user_id" ON "public"."mdm_nhan_su" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_mdm_nhan_su_email_active_lower" ON "public"."mdm_nhan_su" USING "btree" ("lower"(TRIM(BOTH FROM "email"))) WHERE (("is_active" IS TRUE) AND ("email" IS NOT NULL) AND (TRIM(BOTH FROM "email") <> ''::"text"));



CREATE OR REPLACE TRIGGER "trg_audit_fact_quy_trinh" AFTER DELETE OR UPDATE ON "public"."fact_quy_trinh" FOR EACH ROW EXECUTE FUNCTION "public"."fn_auto_audit_log"();



CREATE OR REPLACE TRIGGER "trg_touch_updated_at_mdm_field_registry" BEFORE UPDATE ON "public"."mdm_field_registry" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at_mdm_registry"();



CREATE OR REPLACE TRIGGER "trg_touch_updated_at_mdm_governance_suggestion" BEFORE UPDATE ON "public"."mdm_governance_suggestion" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at_mdm_registry"();



CREATE OR REPLACE TRIGGER "trg_update_danh_muc_bk_updated_at" BEFORE UPDATE ON "public"."dm_bang_kiem" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_update_tieu_chi_bk_updated_at" BEFORE UPDATE ON "public"."dm_tieu_chi_bang_kiem" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."fact_cong_viec_comments"
    ADD CONSTRAINT "cong_viec_comments_cong_viec_id_fkey" FOREIGN KEY ("cong_viec_id") REFERENCES "public"."fact_cong_viec"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_cong_viec_comments"
    ADD CONSTRAINT "cong_viec_comments_nguoi_dung_id_fkey" FOREIGN KEY ("nguoi_dung_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_cong_viec"
    ADD CONSTRAINT "cong_viec_khoa_thuc_hien_id_fkey" FOREIGN KEY ("khoa_thuc_hien_id") REFERENCES "public"."dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_cong_viec"
    ADD CONSTRAINT "cong_viec_nguoi_de_xuat_id_fkey" FOREIGN KEY ("nguoi_de_xuat_viec_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_cong_viec"
    ADD CONSTRAINT "cong_viec_nguoi_giao_id_fkey" FOREIGN KEY ("nguoi_giao_viec_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_cong_viec"
    ADD CONSTRAINT "cong_viec_nguoi_thuc_hien_id_fkey" FOREIGN KEY ("nguoi_thuc_hien_viec_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_cong_viec"
    ADD CONSTRAINT "cong_viec_parent_id_fkey" FOREIGN KEY ("cong_viec_cha_id") REFERENCES "public"."fact_cong_viec"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_cong_viec"
    ADD CONSTRAINT "cong_viec_thanh_vien_mang_luoi_id_fkey" FOREIGN KEY ("nhan_vien_mang_luoi_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_cong_viec"
    ADD CONSTRAINT "cong_viec_to_id_fkey" FOREIGN KEY ("to_cong_tac_id") REFERENCES "public"."dm_to_cong_tac"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dm_bo_dung_cu_chi_tiet"
    ADD CONSTRAINT "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey" FOREIGN KEY ("bo_dung_cu_id") REFERENCES "public"."dm_bo_dung_cu"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dm_bo_dung_cu_chi_tiet"
    ADD CONSTRAINT "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey" FOREIGN KEY ("loai_dung_cu_id") REFERENCES "public"."dm_loai_dung_cu"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dm_bo_dung_cu"
    ADD CONSTRAINT "dm_bo_dung_cu_khoa_su_dung_id_fkey" FOREIGN KEY ("khoa_su_dung_id") REFERENCES "public"."dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dm_bo_dung_cu"
    ADD CONSTRAINT "dm_bo_dung_cu_loai_dung_cu_id_fkey" FOREIGN KEY ("loai_dung_cu_id") REFERENCES "public"."dm_loai_dung_cu"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dm_khoa_phong"
    ADD CONSTRAINT "dm_khoa_phong_khoi_id_fkey" FOREIGN KEY ("khoi_id") REFERENCES "public"."dm_khoi_khoa"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_bao_tri_thiet_bi"
    ADD CONSTRAINT "fact_bao_tri_thiet_bi_thiet_bi_id_fkey" FOREIGN KEY ("thiet_bi_id") REFERENCES "public"."dm_thiet_bi"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fact_cssd_dieu_chuyen_thanh_phan"
    ADD CONSTRAINT "fact_cssd_dieu_chuyen_thanh_phan_den_quy_trinh_id_fkey" FOREIGN KEY ("den_quy_trinh_id") REFERENCES "public"."fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_cssd_dieu_chuyen_thanh_phan"
    ADD CONSTRAINT "fact_cssd_dieu_chuyen_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey" FOREIGN KEY ("dm_bo_dung_cu_chi_tiet_id") REFERENCES "public"."dm_bo_dung_cu_chi_tiet"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_cssd_dieu_chuyen_thanh_phan"
    ADD CONSTRAINT "fact_cssd_dieu_chuyen_thanh_phan_tu_quy_trinh_id_fkey" FOREIGN KEY ("tu_quy_trinh_id") REFERENCES "public"."fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_cssd_lifecycle_event"
    ADD CONSTRAINT "fact_cssd_lifecycle_event_quy_trinh_id_fkey" FOREIGN KEY ("quy_trinh_id") REFERENCES "public"."fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_kho_hoa_chat_giao_dich"
    ADD CONSTRAINT "fact_kho_hoa_chat_giao_dich_dm_hoa_chat_id_fkey" FOREIGN KEY ("dm_hoa_chat_id") REFERENCES "public"."dm_hoa_chat"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fact_quy_trinh"
    ADD CONSTRAINT "fact_quy_trinh_quy_trinh_cha_id_fkey" FOREIGN KEY ("quy_trinh_cha_id") REFERENCES "public"."fact_quy_trinh"("id");



ALTER TABLE ONLY "public"."fact_quy_trinh_thanh_phan"
    ADD CONSTRAINT "fact_quy_trinh_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey" FOREIGN KEY ("dm_bo_dung_cu_chi_tiet_id") REFERENCES "public"."dm_bo_dung_cu_chi_tiet"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_quy_trinh_thanh_phan"
    ADD CONSTRAINT "fact_quy_trinh_thanh_phan_quy_trinh_id_fkey" FOREIGN KEY ("quy_trinh_id") REFERENCES "public"."fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_giam_sat_chung_results"
    ADD CONSTRAINT "giam_sat_chung_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."fact_giam_sat_chung_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_giam_sat_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_khoa_id_fkey" FOREIGN KEY ("khoa_id") REFERENCES "public"."dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_khu_vuc_id_fkey" FOREIGN KEY ("khu_vuc_id") REFERENCES "public"."dm_khu_vuc_giam_sat"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_nghe_nghiep_id_fkey" FOREIGN KEY ("nghe_nghiep_id") REFERENCES "public"."dm_nghe_nghiep"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey" FOREIGN KEY ("nguoi_giam_sat_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_nkbv_ca"
    ADD CONSTRAINT "giam_sat_nkbv_ca_khoa_ghi_nhan_id_fkey" FOREIGN KEY ("khoa_ghi_nhan_id") REFERENCES "public"."dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_nkbv_ca"
    ADD CONSTRAINT "giam_sat_nkbv_ca_loai_nkbv_id_fkey" FOREIGN KEY ("loai_nkbv_id") REFERENCES "public"."dm_loai_nkbv"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fact_giam_sat_nkbv_ca"
    ADD CONSTRAINT "giam_sat_nkbv_ca_nguoi_ghi_id_fkey" FOREIGN KEY ("nguoi_ghi_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_nkbv_ca"
    ADD CONSTRAINT "giam_sat_nkbv_ca_trang_thai_id_fkey" FOREIGN KEY ("trang_thai_id") REFERENCES "public"."dm_trang_thai_nkbv_ca"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fact_giam_sat_vst"
    ADD CONSTRAINT "giam_sat_vst_khoa_id_fkey" FOREIGN KEY ("khoa_id") REFERENCES "public"."dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_vst"
    ADD CONSTRAINT "giam_sat_vst_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_vst"
    ADD CONSTRAINT "giam_sat_vst_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."fact_giam_sat_vst_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_giam_sat_vst_sessions"
    ADD CONSTRAINT "giam_sat_vst_sessions_khoa_id_fkey" FOREIGN KEY ("khoa_id") REFERENCES "public"."dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_vst_sessions"
    ADD CONSTRAINT "giam_sat_vst_sessions_khu_vuc_id_fkey" FOREIGN KEY ("khu_vuc_id") REFERENCES "public"."dm_khu_vuc_giam_sat"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_giam_sat_vst_sessions"
    ADD CONSTRAINT "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey" FOREIGN KEY ("nguoi_giam_sat_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_chuc_danh_id_fkey" FOREIGN KEY ("chuc_danh_id") REFERENCES "public"."dm_chuc_danh"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_chuc_vu_id_fkey" FOREIGN KEY ("chuc_vu_id") REFERENCES "public"."dm_chuc_vu"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_khoa_id_fkey" FOREIGN KEY ("khoa_id") REFERENCES "public"."dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "public"."dm_to_cong_tac"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_kho_chi_tiet"
    ADD CONSTRAINT "kho_chi_tiet_giao_dich_id_fkey" FOREIGN KEY ("giao_dich_id") REFERENCES "public"."fact_kho_giao_dich"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_kho_chi_tiet"
    ADD CONSTRAINT "kho_chi_tiet_quy_trinh_id_fkey" FOREIGN KEY ("quy_trinh_id") REFERENCES "public"."fact_quy_trinh"("id");



ALTER TABLE ONLY "public"."fact_kho_giao_dich"
    ADD CONSTRAINT "kho_giao_dich_khoa_phong_id_fkey" FOREIGN KEY ("khoa_phong_id") REFERENCES "public"."dm_khoa_phong"("id");



ALTER TABLE ONLY "public"."fact_lo_tiet_khuan"
    ADD CONSTRAINT "lo_tiet_khuan_thiet_bi_id_fkey" FOREIGN KEY ("thiet_bi_id") REFERENCES "public"."dm_thiet_bi"("id");



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "mdm_nhan_su_nghe_nghiep_id_fkey" FOREIGN KEY ("nghe_nghiep_id") REFERENCES "public"."dm_nghe_nghiep"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "mdm_nhan_su_vai_tro_he_thong_id_fkey" FOREIGN KEY ("vai_tro_he_thong_id") REFERENCES "public"."dm_roles"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fact_nhat_ky_quet"
    ADD CONSTRAINT "nhat_ky_quet_quy_trinh_id_fkey" FOREIGN KEY ("quy_trinh_id") REFERENCES "public"."fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_nhat_ky_quet"
    ADD CONSTRAINT "nhat_ky_quet_thiet_bi_id_fkey" FOREIGN KEY ("thiet_bi_id") REFERENCES "public"."dm_thiet_bi"("id");



ALTER TABLE ONLY "public"."fact_quy_trinh"
    ADD CONSTRAINT "quy_trinh_bo_dung_cu_id_fkey" FOREIGN KEY ("bo_dung_cu_id") REFERENCES "public"."dm_bo_dung_cu"("id");



ALTER TABLE ONLY "public"."fact_quy_trinh"
    ADD CONSTRAINT "quy_trinh_lo_tiet_khuan_id_fkey" FOREIGN KEY ("lo_tiet_khuan_id") REFERENCES "public"."fact_lo_tiet_khuan"("id");



ALTER TABLE ONLY "public"."rel_role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."dm_permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rel_role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."dm_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fact_su_co"
    ADD CONSTRAINT "su_co_nguoi_bao_id_fkey" FOREIGN KEY ("nguoi_bao_id") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."fact_su_co"
    ADD CONSTRAINT "su_co_nguoi_xac_nhan_id_fkey" FOREIGN KEY ("nguoi_xac_nhan_id") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."fact_su_co"
    ADD CONSTRAINT "su_co_quy_trinh_id_fkey" FOREIGN KEY ("quy_trinh_id") REFERENCES "public"."fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dm_tieu_chi_bang_kiem"
    ADD CONSTRAINT "tieu_chi_bang_kiem_bang_kiem_id_fkey" FOREIGN KEY ("bang_kiem_id") REFERENCES "public"."dm_bang_kiem"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rel_user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."dm_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rel_user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin full access" ON "public"."dm_bang_kiem" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access" ON "public"."dm_tieu_chi_bang_kiem" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access" ON "public"."fact_cong_viec" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rel_user_roles" "ur"
     JOIN "public"."dm_roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access" ON "public"."fact_cong_viec_comments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rel_user_roles" "ur"
     JOIN "public"."dm_roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access" ON "public"."fact_giam_sat_chung_results" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rel_user_roles" "ur"
     JOIN "public"."dm_roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access" ON "public"."fact_giam_sat_chung_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rel_user_roles" "ur"
     JOIN "public"."dm_roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access" ON "public"."fact_giam_sat_vst" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rel_user_roles" "ur"
     JOIN "public"."dm_roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access" ON "public"."fact_giam_sat_vst_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rel_user_roles" "ur"
     JOIN "public"."dm_roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'ADMIN'::"text")))));



CREATE POLICY "Authenticated read access" ON "public"."dm_bang_kiem" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."dm_tieu_chi_bang_kiem" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."fact_cong_viec" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."fact_cong_viec_comments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."fact_giam_sat_chung_results" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."fact_giam_sat_chung_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."fact_giam_sat_vst" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."fact_giam_sat_vst_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Cho phép User xem log của mình" ON "public"."fact_activity_log" FOR SELECT TO "authenticated" USING ((("userid" = "auth"."uid"()) OR ("userid" IS NULL)));



ALTER TABLE "public"."dm_bang_kiem" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_bo_dung_cu" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_bo_dung_cu_chi_tiet" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_cach_thuc_giam_sat" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_cach_thuc_giam_sat_select_all" ON "public"."dm_cach_thuc_giam_sat" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."dm_chuc_danh" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_chuc_vu" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_hinh_thuc_giam_sat" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_hinh_thuc_giam_sat_select_all" ON "public"."dm_hinh_thuc_giam_sat" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."dm_hoa_chat" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_hoa_chat_admin_all" ON "public"."dm_hoa_chat" TO "authenticated" USING (true);



CREATE POLICY "dm_hoa_chat_select_all" ON "public"."dm_hoa_chat" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."dm_khoa_phong" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_khoi_khoa" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_khu_vuc_giam_sat" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_loai_cong_viec" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_loai_cong_viec_select_auth" ON "public"."dm_loai_cong_viec" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."dm_loai_dung_cu" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_loai_may_select_anon" ON "public"."dm_loai_may_tiet_khuan" FOR SELECT TO "anon" USING (true);



CREATE POLICY "dm_loai_may_select_auth" ON "public"."dm_loai_may_tiet_khuan" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."dm_loai_may_tiet_khuan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_loai_nkbv" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_loai_nkbv_select_auth" ON "public"."dm_loai_nkbv" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."dm_loai_su_co" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_loai_su_co_select_anon" ON "public"."dm_loai_su_co" FOR SELECT TO "anon" USING (true);



CREATE POLICY "dm_loai_su_co_select_auth" ON "public"."dm_loai_su_co" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."dm_nghe_nghiep" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_thiet_bi" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_tieu_chi_bang_kiem" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_to_cong_tac" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dm_trang_thai_cong_viec" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_trang_thai_cong_viec_select_auth" ON "public"."dm_trang_thai_cong_viec" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."dm_trang_thai_nkbv_ca" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_trang_thai_nkbv_ca_select_auth" ON "public"."dm_trang_thai_nkbv_ca" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."fact_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_bao_tri_thiet_bi" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fact_bao_tri_thiet_bi_all_auth" ON "public"."fact_bao_tri_thiet_bi" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_bao_tri_thiet_bi_select_auth" ON "public"."fact_bao_tri_thiet_bi" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."fact_cong_viec" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_cong_viec_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_cssd_dieu_chuyen_thanh_phan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_cssd_lifecycle_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_giam_sat_chung_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_giam_sat_chung_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_giam_sat_nkbv_ca" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_giam_sat_vst" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_giam_sat_vst_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_kho_chi_tiet" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_kho_giao_dich" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fact_kho_hc_all_auth" ON "public"."fact_kho_hoa_chat_giao_dich" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_kho_hc_select_auth" ON "public"."fact_kho_hoa_chat_giao_dich" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."fact_kho_hoa_chat_giao_dich" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_lo_tiet_khuan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_nhat_ky_quet" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_quy_trinh" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_quy_trinh_thanh_phan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_su_co" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fact_su_co_chi_tiet" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "giam_sat_nkbv_ca_insert" ON "public"."fact_giam_sat_nkbv_ca" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "giam_sat_nkbv_ca_select" ON "public"."fact_giam_sat_nkbv_ca" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "giam_sat_nkbv_ca_update" ON "public"."fact_giam_sat_nkbv_ca" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."mdm_field_registry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mdm_governance_suggestion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mdm_nhan_su" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permissions_admin_full_access_v2" ON "public"."dm_permissions" TO "authenticated" USING ("public"."is_admin_user"("auth"."uid"())) WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "permissions_select_all_authenticated_v2" ON "public"."dm_permissions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."rel_role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rel_user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_admin_full_access_v2" ON "public"."rel_role_permissions" TO "authenticated" USING ("public"."is_admin_user"("auth"."uid"())) WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "role_permissions_select_all_authenticated_v2" ON "public"."rel_role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "roles_admin_full_access_v2" ON "public"."dm_roles" TO "authenticated" USING ("public"."is_admin_user"("auth"."uid"())) WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "roles_select_all_authenticated_v2" ON "public"."dm_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "user_roles_admin_full_access_v2" ON "public"."rel_user_roles" TO "authenticated" USING ("public"."is_admin_user"("auth"."uid"())) WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "user_roles_self_or_admin_select_v2" ON "public"."rel_user_roles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin_user"("auth"."uid"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."block_writes_for_migrated_danh_muc"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_writes_for_migrated_danh_muc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_writes_for_migrated_danh_muc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_auto_audit_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_auto_audit_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_auto_audit_log"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin_user"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mdm_refresh_governance_suggestions"() TO "anon";
GRANT ALL ON FUNCTION "public"."mdm_refresh_governance_suggestions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mdm_refresh_governance_suggestions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_assign_staff_ksnk_role"("p_staff_id" "uuid", "p_role_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_assign_staff_ksnk_role"("p_staff_id" "uuid", "p_role_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_assign_staff_ksnk_role"("p_staff_id" "uuid", "p_role_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_registry_options"("p_categories" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_registry_options"("p_categories" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_registry_options"("p_categories" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_vst_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_vst_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_vst_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reorder_tieu_chi_bang_kiem"("p_bang_kiem_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reorder_tieu_chi_bang_kiem"("p_bang_kiem_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reorder_tieu_chi_bang_kiem"("p_bang_kiem_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_scan_workflow_station"("p_ma_qr" "text", "p_target_station" "text", "p_operator_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_scan_workflow_station"("p_ma_qr" "text", "p_target_station" "text", "p_operator_label" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_scan_workflow_station"("p_ma_qr" "text", "p_target_station" "text", "p_operator_label" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at_mdm_registry"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at_mdm_registry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at_mdm_registry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."dm_bang_kiem" TO "anon";
GRANT ALL ON TABLE "public"."dm_bang_kiem" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_bang_kiem" TO "service_role";



GRANT ALL ON TABLE "public"."dm_bo_dung_cu" TO "anon";
GRANT ALL ON TABLE "public"."dm_bo_dung_cu" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_bo_dung_cu" TO "service_role";



GRANT ALL ON TABLE "public"."dm_bo_dung_cu_chi_tiet" TO "anon";
GRANT ALL ON TABLE "public"."dm_bo_dung_cu_chi_tiet" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_bo_dung_cu_chi_tiet" TO "service_role";



GRANT ALL ON TABLE "public"."dm_cach_thuc_giam_sat" TO "anon";
GRANT ALL ON TABLE "public"."dm_cach_thuc_giam_sat" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_cach_thuc_giam_sat" TO "service_role";



GRANT ALL ON TABLE "public"."dm_chuc_danh" TO "anon";
GRANT ALL ON TABLE "public"."dm_chuc_danh" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_chuc_danh" TO "service_role";



GRANT ALL ON TABLE "public"."dm_chuc_vu" TO "anon";
GRANT ALL ON TABLE "public"."dm_chuc_vu" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_chuc_vu" TO "service_role";



GRANT ALL ON TABLE "public"."dm_hinh_thuc_giam_sat" TO "anon";
GRANT ALL ON TABLE "public"."dm_hinh_thuc_giam_sat" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_hinh_thuc_giam_sat" TO "service_role";



GRANT ALL ON TABLE "public"."dm_hoa_chat" TO "anon";
GRANT ALL ON TABLE "public"."dm_hoa_chat" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_hoa_chat" TO "service_role";



GRANT ALL ON TABLE "public"."dm_khoa_phong" TO "anon";
GRANT ALL ON TABLE "public"."dm_khoa_phong" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_khoa_phong" TO "service_role";



GRANT ALL ON TABLE "public"."dm_khoi_khoa" TO "anon";
GRANT ALL ON TABLE "public"."dm_khoi_khoa" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_khoi_khoa" TO "service_role";



GRANT ALL ON TABLE "public"."dm_khu_vuc_giam_sat" TO "anon";
GRANT ALL ON TABLE "public"."dm_khu_vuc_giam_sat" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_khu_vuc_giam_sat" TO "service_role";



GRANT ALL ON TABLE "public"."dm_loai_cong_viec" TO "anon";
GRANT ALL ON TABLE "public"."dm_loai_cong_viec" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_loai_cong_viec" TO "service_role";



GRANT ALL ON TABLE "public"."dm_loai_dung_cu" TO "anon";
GRANT ALL ON TABLE "public"."dm_loai_dung_cu" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_loai_dung_cu" TO "service_role";



GRANT ALL ON TABLE "public"."dm_loai_may_tiet_khuan" TO "anon";
GRANT ALL ON TABLE "public"."dm_loai_may_tiet_khuan" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_loai_may_tiet_khuan" TO "service_role";



GRANT ALL ON TABLE "public"."dm_loai_nkbv" TO "anon";
GRANT ALL ON TABLE "public"."dm_loai_nkbv" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_loai_nkbv" TO "service_role";



GRANT ALL ON TABLE "public"."dm_loai_su_co" TO "anon";
GRANT ALL ON TABLE "public"."dm_loai_su_co" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_loai_su_co" TO "service_role";



GRANT ALL ON TABLE "public"."dm_nghe_nghiep" TO "anon";
GRANT ALL ON TABLE "public"."dm_nghe_nghiep" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_nghe_nghiep" TO "service_role";



GRANT ALL ON TABLE "public"."dm_permissions" TO "anon";
GRANT ALL ON TABLE "public"."dm_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."dm_roles" TO "anon";
GRANT ALL ON TABLE "public"."dm_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_roles" TO "service_role";



GRANT ALL ON TABLE "public"."dm_thiet_bi" TO "anon";
GRANT ALL ON TABLE "public"."dm_thiet_bi" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_thiet_bi" TO "service_role";



GRANT ALL ON TABLE "public"."dm_tieu_chi_bang_kiem" TO "anon";
GRANT ALL ON TABLE "public"."dm_tieu_chi_bang_kiem" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_tieu_chi_bang_kiem" TO "service_role";



GRANT ALL ON TABLE "public"."dm_to_cong_tac" TO "anon";
GRANT ALL ON TABLE "public"."dm_to_cong_tac" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_to_cong_tac" TO "service_role";



GRANT ALL ON TABLE "public"."dm_trang_thai_cong_viec" TO "anon";
GRANT ALL ON TABLE "public"."dm_trang_thai_cong_viec" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_trang_thai_cong_viec" TO "service_role";



GRANT ALL ON TABLE "public"."dm_trang_thai_nkbv_ca" TO "anon";
GRANT ALL ON TABLE "public"."dm_trang_thai_nkbv_ca" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_trang_thai_nkbv_ca" TO "service_role";



GRANT ALL ON TABLE "public"."fact_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."fact_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."fact_bao_tri_thiet_bi" TO "anon";
GRANT ALL ON TABLE "public"."fact_bao_tri_thiet_bi" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_bao_tri_thiet_bi" TO "service_role";



GRANT ALL ON TABLE "public"."fact_cong_viec" TO "anon";
GRANT ALL ON TABLE "public"."fact_cong_viec" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_cong_viec" TO "service_role";



GRANT ALL ON TABLE "public"."fact_cong_viec_comments" TO "anon";
GRANT ALL ON TABLE "public"."fact_cong_viec_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_cong_viec_comments" TO "service_role";



GRANT ALL ON TABLE "public"."fact_cssd_dieu_chuyen_thanh_phan" TO "anon";
GRANT ALL ON TABLE "public"."fact_cssd_dieu_chuyen_thanh_phan" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_cssd_dieu_chuyen_thanh_phan" TO "service_role";



GRANT ALL ON TABLE "public"."fact_cssd_lifecycle_event" TO "anon";
GRANT ALL ON TABLE "public"."fact_cssd_lifecycle_event" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_cssd_lifecycle_event" TO "service_role";



GRANT ALL ON TABLE "public"."fact_giam_sat_chung_results" TO "anon";
GRANT ALL ON TABLE "public"."fact_giam_sat_chung_results" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_giam_sat_chung_results" TO "service_role";



GRANT ALL ON TABLE "public"."fact_giam_sat_chung_sessions" TO "anon";
GRANT ALL ON TABLE "public"."fact_giam_sat_chung_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_giam_sat_chung_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."fact_giam_sat_nkbv_ca" TO "anon";
GRANT ALL ON TABLE "public"."fact_giam_sat_nkbv_ca" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_giam_sat_nkbv_ca" TO "service_role";



GRANT ALL ON TABLE "public"."fact_giam_sat_vst" TO "anon";
GRANT ALL ON TABLE "public"."fact_giam_sat_vst" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_giam_sat_vst" TO "service_role";



GRANT ALL ON TABLE "public"."fact_giam_sat_vst_sessions" TO "anon";
GRANT ALL ON TABLE "public"."fact_giam_sat_vst_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_giam_sat_vst_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."fact_kho_chi_tiet" TO "anon";
GRANT ALL ON TABLE "public"."fact_kho_chi_tiet" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_kho_chi_tiet" TO "service_role";



GRANT ALL ON TABLE "public"."fact_kho_giao_dich" TO "anon";
GRANT ALL ON TABLE "public"."fact_kho_giao_dich" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_kho_giao_dich" TO "service_role";



GRANT ALL ON TABLE "public"."fact_kho_hoa_chat_giao_dich" TO "anon";
GRANT ALL ON TABLE "public"."fact_kho_hoa_chat_giao_dich" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_kho_hoa_chat_giao_dich" TO "service_role";



GRANT ALL ON TABLE "public"."fact_lo_tiet_khuan" TO "anon";
GRANT ALL ON TABLE "public"."fact_lo_tiet_khuan" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_lo_tiet_khuan" TO "service_role";



GRANT ALL ON TABLE "public"."fact_nhat_ky_quet" TO "anon";
GRANT ALL ON TABLE "public"."fact_nhat_ky_quet" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_nhat_ky_quet" TO "service_role";



GRANT ALL ON TABLE "public"."fact_quy_trinh" TO "anon";
GRANT ALL ON TABLE "public"."fact_quy_trinh" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_quy_trinh" TO "service_role";



GRANT ALL ON TABLE "public"."fact_quy_trinh_thanh_phan" TO "anon";
GRANT ALL ON TABLE "public"."fact_quy_trinh_thanh_phan" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_quy_trinh_thanh_phan" TO "service_role";



GRANT ALL ON TABLE "public"."fact_su_co" TO "anon";
GRANT ALL ON TABLE "public"."fact_su_co" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_su_co" TO "service_role";



GRANT ALL ON TABLE "public"."fact_su_co_chi_tiet" TO "anon";
GRANT ALL ON TABLE "public"."fact_su_co_chi_tiet" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_su_co_chi_tiet" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_field_registry" TO "anon";
GRANT ALL ON TABLE "public"."mdm_field_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_field_registry" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_governance_suggestion" TO "anon";
GRANT ALL ON TABLE "public"."mdm_governance_suggestion" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_governance_suggestion" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_nhan_su" TO "anon";
GRANT ALL ON TABLE "public"."mdm_nhan_su" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_nhan_su" TO "service_role";



GRANT ALL ON TABLE "public"."rel_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."rel_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."rel_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."rel_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."rel_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."rel_user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."v_fact_giam_sat_vst_sessions_full" TO "anon";
GRANT ALL ON TABLE "public"."v_fact_giam_sat_vst_sessions_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fact_giam_sat_vst_sessions_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_fact_quy_trinh_full" TO "anon";
GRANT ALL ON TABLE "public"."v_fact_quy_trinh_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fact_quy_trinh_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_mdm_nhan_su_full" TO "anon";
GRANT ALL ON TABLE "public"."v_mdm_nhan_su_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_mdm_nhan_su_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_role_permissions_matrix" TO "anon";
GRANT ALL ON TABLE "public"."v_role_permissions_matrix" TO "authenticated";
GRANT ALL ON TABLE "public"."v_role_permissions_matrix" TO "service_role";



GRANT ALL ON TABLE "public"."v_staff_auth_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_staff_auth_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_staff_auth_overview" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";

alter table "public"."fact_bao_tri_thiet_bi" drop constraint "fact_bao_tri_thiet_bi_trang_thai_check";

alter table "public"."fact_kho_hoa_chat_giao_dich" drop constraint "fact_kho_hoa_chat_giao_dich_loai_giao_dich_check";

alter table "public"."fact_bao_tri_thiet_bi" add constraint "fact_bao_tri_thiet_bi_trang_thai_check" CHECK (((trang_thai)::text = ANY ((ARRAY['DANG_THUC_HIEN'::character varying, 'HOAN_THANH'::character varying, 'HUY'::character varying])::text[]))) not valid;

alter table "public"."fact_bao_tri_thiet_bi" validate constraint "fact_bao_tri_thiet_bi_trang_thai_check";

alter table "public"."fact_kho_hoa_chat_giao_dich" add constraint "fact_kho_hoa_chat_giao_dich_loai_giao_dich_check" CHECK (((loai_giao_dich)::text = ANY ((ARRAY['NHAP'::character varying, 'XUAT'::character varying, 'DIEU_CHINH'::character varying])::text[]))) not valid;

alter table "public"."fact_kho_hoa_chat_giao_dich" validate constraint "fact_kho_hoa_chat_giao_dich_loai_giao_dich_check";


