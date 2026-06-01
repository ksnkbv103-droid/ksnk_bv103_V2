-- BV103 pilot baseline (squashed 2026-05-30)
-- Replaces pilot_chain_20260520_20260529 (90 files in archive_legacy/)
-- Fresh local: npm run mdm:migrate:local  OR  npx supabase db reset --local

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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


CREATE OR REPLACE FUNCTION "public"."bv103_norm_label"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
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


ALTER FUNCTION "public"."bv103_norm_label"("p" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bv103_norm_label"("p" "text") IS 'Chuẩn hóa nhãn tiếng Việt để backfill FK từ dữ liệu text legacy (VST/GSC).';



CREATE OR REPLACE FUNCTION "public"."fn_admin_module_stats"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH core AS (
    SELECT 'loai'::text AS k,
           jsonb_build_object('count', count(*), 'last', max(updated_at)) AS v
      FROM public.dm_loai_dung_cu
    UNION ALL
    SELECT 'bo',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_bo_dung_cu
    UNION ALL
    SELECT 'le',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_bo_dung_cu_chi_tiet
    UNION ALL
    SELECT 'tb',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_thiet_bi
    UNION ALL
    SELECT 'hc',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_hoa_chat
    UNION ALL
    SELECT 'khoa',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_khoa_phong
    UNION ALL
    SELECT 'ns',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.mdm_nhan_su
    UNION ALL
    SELECT 'bk',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_bang_kiem
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
      FROM public.dm_khoa_phong
    UNION ALL
    SELECT 'LOAI_DUNG_CU',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_loai_dung_cu
    UNION ALL
    SELECT 'VAI_TRO_HE_THONG_KSNK',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_roles
    UNION ALL
    SELECT 'KHU_VUC_GIAM_SAT',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_khu_vuc_giam_sat
  )
  SELECT jsonb_build_object(
    'core',     (SELECT jsonb_object_agg(k, v) FROM core),
    'registry', COALESCE((SELECT jsonb_object_agg(k, v) FROM lookup_by_cat), '{}'::jsonb)
              || COALESCE((SELECT jsonb_object_agg(k, v) FROM non_lookup_registry), '{}'::jsonb)
  );
$$;


ALTER FUNCTION "public"."fn_admin_module_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_admin_module_stats"() IS '1 round-trip dashboard stats cho trang Quản trị Danh mục (core 9 bảng + registry 18 loại).';



CREATE OR REPLACE FUNCTION "public"."fn_assert_vst_gsc_not_locked"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_lock_date date;
    v_record_date date;
    v_module text;
BEGIN
    -- Xác định module tương ứng với bảng
    IF TG_TABLE_NAME = 'fact_giam_sat_vst_sessions' THEN
        v_module := 'VST';
    ELSIF TG_TABLE_NAME = 'fact_giam_sat_chung_sessions' THEN
        v_module := 'GSC';
    ELSE
        RETURN NEW;
    END IF;

    -- Lấy ngày khóa từ bảng cấu hình
    SELECT locked_until_date INTO v_lock_date 
    FROM public.sys_module_locks 
    WHERE module_name = v_module 
    LIMIT 1;
    
    IF v_lock_date IS NOT NULL THEN
        -- Bản ghi VST hoặc GSC bị cập nhật hoặc xóa
        -- Ở đây OLD là bản ghi cũ chuẩn bị bị chỉnh sửa/xóa
        v_record_date := OLD.ngay_giam_sat;
        
        IF v_record_date IS NOT NULL AND v_record_date <= v_lock_date THEN
            RAISE EXCEPTION 'Dữ liệu giám sát % ngày % đã bị khóa cứng để chốt báo cáo thi đua. Không cho phép sửa đổi hoặc xóa!', v_module, v_record_date;
        END IF;
    END IF;
    
    -- Nếu là thao tác UPDATE, trả về bản ghi mới, nếu là DELETE trả về bản ghi cũ để thực hiện
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."fn_assert_vst_gsc_not_locked"() OWNER TO "postgres";


-- fn_bv103_audit_row deprecated and unified to fn_sys_audit_row


CREATE OR REPLACE FUNCTION "public"."fn_cssd_check_set_heat_resistance"("p_bo_dung_cu_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."fn_cssd_check_set_heat_resistance"("p_bo_dung_cu_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_fact_cong_viec_spawn_dinh_ky_hom_nay"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."fn_fact_cong_viec_spawn_dinh_ky_hom_nay"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_fact_cong_viec_spawn_dinh_ky_hom_nay"() IS 'Sinh fact_cong_viec cho mẫu định kỳ active; idempotent theo (dinh_ky_mau_id, han_hoan_thanh). Gọi hàng ngày (pg_cron / Edge).';



CREATE OR REPLACE FUNCTION "public"."fn_get_session_stype"("p_nguoi_giam_sat_id" "uuid", "p_target_khoa_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
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
    LEFT JOIN public.dm_khoa_phong k ON ns.khoa_id = k.id
    WHERE ns.id = p_nguoi_giam_sat_id;
  END IF;

  IF p_target_khoa_id IS NOT NULL THEN
    SELECT k.ma_khoa, k.ten_khoa
    INTO v_t_ma_khoa, v_t_ten_khoa
    FROM public.dm_khoa_phong k
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


ALTER FUNCTION "public"."fn_get_session_stype"("p_nguoi_giam_sat_id" "uuid", "p_target_khoa_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_gstt_failure_reason_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_gstt_failure_reason_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_gstt_rca_gen_ma_ticket"("p_created" timestamp with time zone) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
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


ALTER FUNCTION "public"."fn_gstt_rca_gen_ma_ticket"("p_created" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_gstt_rca_gen_ma_ticket"("p_created" timestamp with time zone) IS 'Slice 9: sinh mã ticket RCA-YYYYMMDD-NNNN. SECURITY DEFINER để đếm bypass RLS khi trigger gọi.';



CREATE OR REPLACE FUNCTION "public"."fn_inc_gia_han_so_lan"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."fn_inc_gia_han_so_lan"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_inc_gia_han_so_lan"() IS 'Tự động tăng gia_han_so_lan khi han_hoan_thanh bị dời sang ngày xa hơn (gia hạn thực sự).';



CREATE OR REPLACE FUNCTION "public"."fn_mdm_field_registry_attach_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."fn_mdm_field_registry_attach_trigger"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_mdm_field_registry_attach_trigger"() IS 'Tự động sinh hoặc gỡ trigger kiểm toán trên bảng đích tương ứng khi registry thay đổi.';



CREATE OR REPLACE FUNCTION "public"."fn_mdm_validate_lookup_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
      FROM public.dm_lookup_value
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


ALTER FUNCTION "public"."fn_mdm_validate_lookup_integrity"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_mdm_validate_lookup_integrity"() IS 'Hàm trigger động kiểm soát toàn vẹn liên kết lookup động dựa trên mdm_field_registry.';



CREATE OR REPLACE FUNCTION "public"."fn_nkbv_dich_te_hoc_rates"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("khoa_id" "uuid", "ma_khoa" "text", "ten_khoa" "text", "obs_vap_cases" bigint, "obs_vae_cases" bigint, "obs_clabsi_cases" bigint, "obs_mbi_lcbi_cases" bigint, "obs_cauti_cases" bigint, "obs_ssi_cases" bigint, "obs_vent_days" bigint, "obs_cvc_days" bigint, "obs_foley_days" bigint, "obs_patient_days" bigint, "obs_emv_episodes" bigint, "obs_total_surgeries" bigint, "clabsi_rate_per_1000" numeric, "mbi_lcbi_rate_per_1000" numeric, "cvc_dur" numeric, "clabsi_sir" numeric, "cvc_sur" numeric, "vap_rate_per_1000" numeric, "vae_rate_per_1000" numeric, "vae_rate_per_100_emv" numeric, "vent_dur" numeric, "vae_sir" numeric, "vent_sur" numeric, "cauti_rate_per_1000" numeric, "foley_dur" numeric, "cauti_sir" numeric, "foley_sur" numeric, "ssi_raw_rate" numeric, "ssi_sir" numeric)
    LANGUAGE "plpgsql"
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
          AND c.trang_thai_id IN (SELECT id FROM public.dm_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA' AND code = 'XAC_NHAN')
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
        FROM public.fact_nkbv_mau_so_daily m
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
        FROM public.dm_nkbv_cdc_baselines b
        WHERE b.is_active = true
        GROUP BY b.khoa_id
    ),
    ssi_sums AS (
        SELECT 
            s.khoa_id,
            COUNT(s.id) AS total_surgeries,
            SUM(s.expected_ssi_prob) AS expected_ssi_cases
        FROM public.fact_nkbv_mau_so_phau_thuat s
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

    FROM public.dm_khoa_phong k
    LEFT JOIN ca_counts c ON k.id = c.khoa_ghi_nhan_id
    LEFT JOIN mau_so_sums m ON k.id = m.khoa_id
    LEFT JOIN baselines b ON k.id = b.khoa_id
    LEFT JOIN ssi_sums s ON k.id = s.khoa_id
    WHERE k.is_active = true
      AND (p_khoa_id IS NULL OR k.id = p_khoa_id);
END;
$$;


ALTER FUNCTION "public"."fn_nkbv_dich_te_hoc_rates"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_nkbv_ssi_rates_by_surgery"("p_tu_ngay" "date", "p_den_ngay" "date") RETURNS TABLE("loai_phau_thuat_nhsn" "text", "total_surgeries" bigint, "obs_ssi_cases" bigint, "expected_ssi_cases" numeric, "ssi_raw_rate" numeric, "ssi_sir" numeric)
    LANGUAGE "plpgsql"
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
          AND c.trang_thai_id IN (SELECT id FROM public.dm_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA' AND code = 'XAC_NHAN')
        GROUP BY (c.verification_data->>'loai_phau_thuat_nhsn')
    ),
    surgeries AS (
        SELECT 
            s.loai_phau_thuat_nhsn::text AS loai_pt_nhsn,
            COUNT(s.id) AS total_surg,
            SUM(s.expected_ssi_prob) AS expected_ssi
        FROM public.fact_nkbv_mau_so_phau_thuat s
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


ALTER FUNCTION "public"."fn_nkbv_ssi_rates_by_surgery"("p_tu_ngay" "date", "p_den_ngay" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_qlcv_analytics_summary"("p_khoa_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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
    FROM public.fact_cong_viec cv
    WHERE cv.cong_viec_cha_id IS NULL
      AND cv.is_active = true
      AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id)
    GROUP BY cv.trang_thai_id
  ) cnt
  JOIN public.fact_cong_viec cv ON TRUE -- bogus join for outer filter
  LEFT JOIN public.dm_lookup_value ts
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
  FROM public.fact_cong_viec cv
  LEFT JOIN public.dm_lookup_value lv
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
  FROM public.fact_cong_viec cv
  LEFT JOIN public.dm_lookup_value lv
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
  FROM public.fact_cong_viec cv
  LEFT JOIN public.dm_lookup_value lv
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
    FROM public.fact_cong_viec cv
    LEFT JOIN public.dm_lookup_value lv
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
  FROM public.fact_cong_viec cv
  LEFT JOIN public.dm_lookup_value lv
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


ALTER FUNCTION "public"."fn_qlcv_analytics_summary"("p_khoa_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_qlcv_analytics_summary"("p_khoa_id" "uuid") IS 'Analytics QLCV server-side: đếm theo trạng thái, 3 cổng, top assignee, on-time rate, pct overdue. p_khoa_id=NULL → tất cả khoa.';



CREATE OR REPLACE FUNCTION "public"."fn_qlcv_get_actor_khoa_id"("p_nhan_su_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT khoa_id FROM public.mdm_nhan_su WHERE id = p_nhan_su_id LIMIT 1;
$$;


ALTER FUNCTION "public"."fn_qlcv_get_actor_khoa_id"("p_nhan_su_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_qlcv_get_actor_khoa_id"("p_nhan_su_id" "uuid") IS 'Trả về khoa_id của nhân sự để áp dụng filter khoa trong QLCV (multi-tenant isolation).';



CREATE OR REPLACE FUNCTION "public"."fn_qlcv_tong_hop_thang"("p_thang" "date") RETURNS TABLE("nhan_su_id" "uuid", "ho_ten" "text", "phieu_trong_thang" bigint, "hoan_thanh_trong_thang" bigint, "dung_han" bigint, "on_time_pct" numeric, "completion_pct" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH bounds AS (
    SELECT
      date_trunc('month', p_thang::timestamp)::date                          AS ms_date,
      (date_trunc('month', p_thang::timestamp) + interval '1 month')::date  AS me_date,
      date_trunc('month', p_thang::timestamp)::timestamptz                  AS ms_tz,
      (date_trunc('month', p_thang::timestamp) + interval '1 month')::timestamptz AS me_tz
  ),
  roots AS (
    SELECT
      cv.*,
      lv.code AS trang_thai,
      b.ms_date,
      b.me_date,
      b.ms_tz,
      b.me_tz
    FROM public.fact_cong_viec cv
    CROSS JOIN bounds b
    LEFT JOIN public.dm_lookup_value lv
      ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
    WHERE cv.cong_viec_cha_id IS NULL
      AND cv.nguoi_phu_trach_id IS NOT NULL
      AND (
        (cv.created_at  >= b.ms_tz AND cv.created_at  < b.me_tz)
        OR (cv.updated_at >= b.ms_tz AND cv.updated_at < b.me_tz)
        OR (
          cv.han_hoan_thanh IS NOT NULL
          AND cv.han_hoan_thanh >= b.ms_date
          AND cv.han_hoan_thanh <  b.me_date
        )
        OR (
          -- Phiếu hoàn thành trong tháng (theo timestamp nghiệm thu)
          cv.hoan_thanh_luc IS NOT NULL
          AND cv.hoan_thanh_luc >= b.ms_tz
          AND cv.hoan_thanh_luc <  b.me_tz
        )
      )
  ),
  agg AS (
    SELECT
      r.nguoi_phu_trach_id AS sid,
      count(*)::bigint AS phieu_trong_thang,
      -- Hoàn thành: dùng hoan_thanh_luc (timestamp nghiệm thu thực tế)
      count(*) FILTER (
        WHERE r.trang_thai = 'HOAN_THANH'
          AND r.hoan_thanh_luc IS NOT NULL
          AND r.hoan_thanh_luc >= r.ms_tz
          AND r.hoan_thanh_luc <  r.me_tz
      )::bigint AS hoan_thanh_trong_thang,
      -- Đúng hạn: hoan_thanh_luc <= cuối ngày hạn chót
      count(*) FILTER (
        WHERE r.trang_thai = 'HOAN_THANH'
          AND r.hoan_thanh_luc IS NOT NULL
          AND r.hoan_thanh_luc >= r.ms_tz
          AND r.hoan_thanh_luc <  r.me_tz
          AND (
            r.han_hoan_thanh IS NULL
            OR r.hoan_thanh_luc::date <= r.han_hoan_thanh
          )
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
      WHEN a.hoan_thanh_trong_thang > 0
        THEN round(100.0 * a.dung_han / a.hoan_thanh_trong_thang, 2)
      ELSE 0::numeric
    END AS on_time_pct,
    CASE
      WHEN a.phieu_trong_thang > 0
        THEN round(100.0 * a.hoan_thanh_trong_thang / a.phieu_trong_thang, 2)
      ELSE 0::numeric
    END AS completion_pct
  FROM agg a
  LEFT JOIN public.mdm_nhan_su ns ON ns.id = a.sid
  WHERE a.phieu_trong_thang > 0
  ORDER BY completion_pct DESC NULLS LAST, on_time_pct DESC NULLS LAST, ho_ten ASC;
$$;


ALTER FUNCTION "public"."fn_qlcv_tong_hop_thang"("p_thang" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_qlcv_tong_hop_thang"("p_thang" "date") IS 'QLCV: KPI tháng theo người phụ trách — dùng hoan_thanh_luc (timestamp nghiệm thu thực tế) thay updated_at để tính đúng hạn. Phạm vi: phiếu gốc tạo/cập nhật/hạn/hoàn thành trong tháng.';



CREATE OR REPLACE FUNCTION "public"."fn_refresh_mv_gsc_session_daily"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_gsc_session_daily;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_gsc_session_daily;
END;
$$;


ALTER FUNCTION "public"."fn_refresh_mv_gsc_session_daily"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_hoan_thanh_luc"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  FROM public.dm_lookup_value
  WHERE id = NEW.trang_thai_id AND category_type = 'TRANG_THAI_CONG_VIEC'
  LIMIT 1;

  -- Resolve mã trạng thái cũ
  SELECT code INTO v_ma_cu
  FROM public.dm_lookup_value
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


ALTER FUNCTION "public"."fn_set_hoan_thanh_luc"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_set_hoan_thanh_luc"() IS 'Tự động set/reset hoan_thanh_luc khi fact_cong_viec chuyển sang/rời HOAN_THANH.';



CREATE OR REPLACE FUNCTION "public"."fn_sync_dashboard_pre_aggregates"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_session record;
BEGIN
  TRUNCATE TABLE public.fact_gsc_dashboard_summary;
  TRUNCATE TABLE public.fact_gsc_violations_summary;
  TRUNCATE TABLE public.fact_vst_sessions_summary;
  TRUNCATE TABLE public.fact_vst_opportunities_summary;
  TRUNCATE TABLE public.fact_vst_moments_summary;

  -- Re-use fn_sync_single_gsc_session to populate GSC summary tables
  FOR v_session IN 
    SELECT id FROM public.fact_giam_sat_chung_sessions WHERE is_active = true
  LOOP
    PERFORM public.fn_sync_single_gsc_session(v_session.id);
  END LOOP;

  -- Re-use fn_sync_single_vst_session to populate VST summary tables
  FOR v_session IN 
    SELECT id FROM public.fact_giam_sat_vst_sessions WHERE is_active = true
  LOOP
    PERFORM public.fn_sync_single_vst_session(v_session.id);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."fn_sync_dashboard_pre_aggregates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_overdue_tasks"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_qua_han_id   UUID;
  v_hoan_thanh_id UUID;
  v_da_huy_id    UUID;
  v_count        INTEGER := 0;
BEGIN
  -- Resolve trạng thái IDs
  SELECT id INTO v_qua_han_id
  FROM public.dm_lookup_value
  WHERE category_type = 'TRANG_THAI_CONG_VIEC' AND code = 'QUA_HAN'
  LIMIT 1;

  SELECT id INTO v_hoan_thanh_id
  FROM public.dm_lookup_value
  WHERE category_type = 'TRANG_THAI_CONG_VIEC' AND code = 'HOAN_THANH'
  LIMIT 1;

  SELECT id INTO v_da_huy_id
  FROM public.dm_lookup_value
  WHERE category_type = 'TRANG_THAI_CONG_VIEC' AND code = 'DA_HUY'
  LIMIT 1;

  IF v_qua_han_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạng thái QUA_HAN trong dm_lookup_value (category_type=TRANG_THAI_CONG_VIEC).';
  END IF;

  -- Batch UPDATE: tất cả công việc quá hạn chưa kết thúc
  WITH updated_rows AS (
    UPDATE public.fact_cong_viec
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
    INSERT INTO public.fact_cong_viec_hoat_dong (
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


ALTER FUNCTION "public"."fn_sync_overdue_tasks"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_sync_overdue_tasks"() IS 'Batch đồng bộ trạng thái QUA_HAN cho tất cả công việc quá hạn (batch UPDATE + bulk INSERT hoạt động). Idempotent. Gọi bởi pg_cron hoặc Server Action.';



CREATE OR REPLACE FUNCTION "public"."fn_sync_single_gsc_session"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."fn_sync_single_gsc_session"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_single_vst_session"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."fn_sync_single_vst_session"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sys_attach_admin_rls"("p_table" "regclass", "p_module" "text") RETURNS "void"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."fn_sys_attach_admin_rls"("p_table" "regclass", "p_module" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_sys_attach_admin_rls"("p_table" "regclass", "p_module" "text") IS 'Helper attach 4 policies (select/insert/update/delete) trên bảng admin theo module quyền (DANH_MUC/PHAN_QUYEN/BANG_KIEM/NHAN_SU).';



CREATE OR REPLACE FUNCTION "public"."fn_sys_audit_attach"("p_table" "regclass") RETURNS "void"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."fn_sys_audit_attach"("p_table" "regclass") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_sys_audit_attach"("p_table" "regclass") IS 'Helper attach trigger trg_sys_audit_<table> trên bảng vật lý; bỏ qua nếu không tồn tại hoặc là view.';



CREATE OR REPLACE FUNCTION "public"."fn_sys_audit_log_purge"("p_retain_days" integer DEFAULT 365) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."fn_sys_audit_log_purge"("p_retain_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_sys_audit_log_purge"("p_retain_days" integer) IS 'Xóa audit log cũ hơn p_retain_days (mặc định 365). Chỉ admin/cron gọi.';



CREATE OR REPLACE FUNCTION "public"."fn_sys_audit_row"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."fn_sys_audit_row"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_sys_audit_row"() IS 'Audit row trigger thống nhất - capture auth.uid() vào sys_audit_log.changed_by; thay thế fn_bv103_audit_row.';



CREATE OR REPLACE FUNCTION "public"."fn_sys_has_permission"("p_module" "text", "p_action" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."fn_sys_has_permission"("p_module" "text", "p_action" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_sys_has_permission"("p_module" "text", "p_action" "text") IS 'true nếu user có quyền module/action (qua v_sys_user_permissions) hoặc là Admin.';



CREATE OR REPLACE FUNCTION "public"."fn_sys_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.v_sys_user_permissions
     WHERE auth_user_id = auth.uid()
       AND roles ? 'ADMIN'
  );
$$;


ALTER FUNCTION "public"."fn_sys_is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_sys_is_admin"() IS 'true nếu auth.uid() có role ADMIN.';



-- fn_trigger_audit_vst_gsc deprecated and unified to fn_sys_audit_row


CREATE OR REPLACE FUNCTION "public"."fn_trigger_sync_gsc_result_row"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_trigger_sync_gsc_result_row"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_trigger_sync_vst_opp_row"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."fn_trigger_sync_vst_opp_row"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_trigger_sync_vst_session_row"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."fn_trigger_sync_vst_session_row"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."rpc_assign_staff_ksnk_role"("p_staff_id" "uuid", "p_role_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_dashboard_gsc_strategic_analytics"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_hinh_thuc_ids" "text"[] DEFAULT NULL::"text"[], "p_bang_kiem_mas" "text"[] DEFAULT NULL::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  FROM public.fact_gsc_dashboard_summary s
  LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    AND (
      p_bang_kiem_mas IS NULL
      OR EXISTS (
        SELECT 1 FROM public.dm_bang_kiem dbk
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
    FROM public.fact_gsc_dashboard_summary s
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
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
    FROM public.fact_gsc_dashboard_summary s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
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
    FROM public.fact_gsc_violations_summary s
    JOIN public.dm_tieu_chi_bang_kiem tc ON s.criterion_id = tc.id
    JOIN public.dm_bang_kiem bk ON s.bang_kiem_id = bk.id
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
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
    FROM public.fact_gsc_dashboard_summary s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
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
    FROM public.fact_gsc_dashboard_summary s
    JOIN public.dm_bang_kiem bk ON s.bang_kiem_id = bk.id
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
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
      FROM public.fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
    ),
    'khoa_duoc_ksnk_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'chuyen_de_duoc_ksnk_phu', (
      SELECT COUNT(DISTINCT s.bang_kiem_id)
      FROM public.fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'ksnk_so_phien', (
      SELECT COALESCE(SUM(s.tong_phien), 0)
      FROM public.fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'co_cau_giam_sat', (
      SELECT jsonb_agg(src) FROM (
        SELECT 'KSNK' as ten, COALESCE(SUM(s.tong_phien), 0) as so_phien 
        FROM public.fact_gsc_dashboard_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
        UNION ALL
        SELECT 'TU_GIAM_SAT' as ten, COALESCE(SUM(s.tong_phien), 0) as so_phien 
        FROM public.fact_gsc_dashboard_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
        UNION ALL
        SELECT 'CHEO' as ten, COALESCE(SUM(s.tong_phien), 0) as so_phien 
        FROM public.fact_gsc_dashboard_summary s 
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


ALTER FUNCTION "public"."rpc_dashboard_gsc_strategic_analytics"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_hinh_thuc_ids" "text"[], "p_bang_kiem_mas" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_dashboard_vst_strategic_analytics"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_hinh_thuc_ids" "text"[] DEFAULT NULL::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  FROM public.fact_vst_opportunities_summary s
  LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
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
    FROM public.fact_vst_opportunities_summary s
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
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
    FROM public.fact_vst_opportunities_summary s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
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
    FROM public.fact_vst_opportunities_summary s
    LEFT JOIN public.dm_lookup_value n ON s.nghe_nghiep_id = n.id AND n.category_type = 'NGHE_NGHIEP'
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
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
    FROM public.fact_vst_moments_summary m
    LEFT JOIN public.dm_khoa_phong k ON m.khoa_id = k.id
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
    FROM public.fact_vst_opportunities_summary s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
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
      FROM public.fact_vst_opportunities_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
    ),
    'khoa_duoc_ksnk_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.fact_vst_opportunities_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'ksnk_so_co_hoi', (
      SELECT COALESCE(SUM(s.so_co_hoi), 0)
      FROM public.fact_vst_opportunities_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'ksnk_so_phien', (
      SELECT COALESCE(SUM(s.tong_phien), 0)
      FROM public.fact_vst_sessions_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'co_cau_giam_sat', (
      SELECT jsonb_agg(src) FROM (
        SELECT 'KSNK' as ten, COALESCE(SUM(s.so_co_hoi), 0) as so_co_hoi 
        FROM public.fact_vst_opportunities_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
        UNION ALL
        SELECT 'TU_GIAM_SAT' as ten, COALESCE(SUM(s.so_co_hoi), 0) as so_co_hoi 
        FROM public.fact_vst_opportunities_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
        UNION ALL
        SELECT 'CHEO' as ten, COALESCE(SUM(s.so_co_hoi), 0) as so_co_hoi 
        FROM public.fact_vst_opportunities_summary s 
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


ALTER FUNCTION "public"."rpc_dashboard_vst_strategic_analytics"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_hinh_thuc_ids" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_dm_bang_kiem_max_numeric_suffix"("p_prefix" "text") RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."rpc_dm_bang_kiem_max_numeric_suffix"("p_prefix" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_dm_bang_kiem_max_numeric_suffix"("p_prefix" "text") IS 'Sinh mã bảng kiểm: max phần số sau tiền tố ma_bk (dm_bang_kiem, is_active), RLS theo người gọi.';



CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[] DEFAULT NULL::"text"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_phien', so_phien)) INTO v_supervision_sources FROM sources;

  -- Các phần khác giữ nguyên (by_khoa, trend, vi phạm...)
  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY date_trunc('month', s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.v_gsc_dashboard_rows r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered_sessions s ON r.session_id = s.id
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


ALTER FUNCTION "public"."rpc_get_compliance_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard_multi_v1"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_supervision_type" "text" DEFAULT 'ALL'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."rpc_get_compliance_dashboard_multi_v1"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard_multi_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_supervision_type" "text" DEFAULT 'ALL'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    WHERE s.loai_bang_kiem = v_ma_bk;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb)
    INTO v_khoa
    FROM (
      SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
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
      LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
      LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2 ORDER BY 3 DESC
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_khu FROM (
      SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
             count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
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


ALTER FUNCTION "public"."rpc_get_compliance_dashboard_multi_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[] DEFAULT NULL::"text"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_supervision_type" "text" DEFAULT 'ALL'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    FROM filtered_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY date_trunc('month', s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.v_gsc_dashboard_rows r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered_sessions s ON r.session_id = s.id
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


ALTER FUNCTION "public"."rpc_get_compliance_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[] DEFAULT NULL::"text"[], "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_supervision_type" "text" DEFAULT 'ALL'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id;

  SELECT jsonb_agg(t) INTO v_khoa FROM (
    SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 5 DESC LIMIT 50
  ) t;

  SELECT jsonb_agg(t) INTO v_nghe FROM (
    SELECT coalesce(n.id, md5(coalesce(n.ten_nghe_nghiep, 'unknown'))::uuid) AS id, coalesce(n.ten_nghe_nghiep, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_khu FROM (
    SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
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


ALTER FUNCTION "public"."rpc_get_compliance_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard_v4"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."rpc_get_compliance_dashboard_v4"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_get_compliance_dashboard_v4"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid") IS 'Dashboard tuân thủ v4 (slim): vùng nguy cơ IPAC + top tiêu chí Không đạt + tổng quan phiên.';



CREATE OR REPLACE FUNCTION "public"."rpc_get_dashboard_khoa_overview_rows"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."rpc_get_dashboard_khoa_overview_rows"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_get_dashboard_khoa_overview_rows"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) IS 'Command Center: theo khoa — Tự GS (VST/GSC). Phân loại stype + lọc phiên VST khớp rpc_get_dashboard_summary_table; GSC gom theo COALESCE(khoa phiên, khoa NS).';



CREATE OR REPLACE FUNCTION "public"."rpc_get_dashboard_ksnk_staff_supervision_stats"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."rpc_get_dashboard_ksnk_staff_supervision_stats"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_get_dashboard_ksnk_staff_supervision_stats"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) IS 'Command Center: nhân sự KSNK (khoa KSNK hoặc vai_tro_he_thong_ksnk) — toàn bộ cơ hội/phiên VST + phiên GSC do họ là người giám sát (theo bộ lọc), mọi phân loại nguồn.';



CREATE OR REPLACE FUNCTION "public"."rpc_get_dashboard_summary_table"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."rpc_get_dashboard_summary_table"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[]) OWNER TO "postgres";


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
      WHEN 'HINH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('HINH_THUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_hinh_thuc as ten, ma_hinh_thuc as ma FROM public.dm_hinh_thuc_giam_sat WHERE is_active = true ORDER BY ten_hinh_thuc) t));
      WHEN 'CACH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('CACH_THUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_cach_thuc as ten, ma_cach_thuc as ma FROM public.dm_cach_thuc_giam_sat WHERE is_active = true ORDER BY ten_cach_thuc) t));
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


CREATE OR REPLACE FUNCTION "public"."rpc_get_vst_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_trend_type" "text" DEFAULT 'month'::"text", "p_supervision_type" "text" DEFAULT 'ALL'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."rpc_get_vst_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_trend_type" "text", "p_supervision_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_vst_moment_table_only"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_trend_type" "text" DEFAULT 'month'::"text", "p_supervision_type" "text" DEFAULT 'ALL'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."rpc_get_vst_moment_table_only"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_trend_type" "text", "p_supervision_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_mdm_nhan_su_max_numeric_suffix"("p_prefix" "text") RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."rpc_mdm_nhan_su_max_numeric_suffix"("p_prefix" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_mdm_nhan_su_max_numeric_suffix"("p_prefix" "text") IS 'Sinh mã nhân sự: max phần số sau tiền tố ma_nv (mdm_nhan_su), RLS theo người gọi.';



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
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row RECORD;
  v_current_ma text;
  v_target_id uuid;
  v_current_idx INT;
  v_target_idx INT;
  v_operator_id uuid;
BEGIN
  -- Lấy UUID của nhân viên thực hiện từ operator email
  SELECT id INTO v_operator_id FROM public.mdm_nhan_su
  WHERE lower(email) = lower(trim(p_operator_label)) AND is_active = true
  LIMIT 1;

  SELECT q.*, t.ma_tram AS ma_tram_hien_tai
  INTO v_row
  FROM public.cssd_fact_quy_trinh q
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

  IF v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN' THEN
    -- Khi tiếp nhận chu kỳ mới cho mã bộ, gán ngay thời gian tiếp nhận và người tiếp nhận
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
    -- Deactivate dòng chu kỳ cũ
    UPDATE public.cssd_fact_quy_trinh
    SET is_active = false, updated_at = now()
    WHERE id = v_row.id;
  ELSE
    -- Chuyển trạm trung gian, cập nhật mốc thời gian và người thực hiện tương ứng của trạm đích
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


ALTER FUNCTION "public"."rpc_scan_workflow_station"("p_ma_qr" "text", "p_target_station" "text", "p_operator_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_fact_qlcv_danh_gia_thang"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_fact_qlcv_danh_gia_thang"() OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."cssd_dm_bo_dung_cu" (
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
    "khoa_su_dung_id" "uuid",
    "phan_loai_bo" "text" DEFAULT 'PHAU_THUAT'::"text" NOT NULL,
    "co_ma_dinh_danh_rieng" boolean DEFAULT true NOT NULL,
    CONSTRAINT "dm_bo_dung_cu_phan_loai_bo_check" CHECK (("phan_loai_bo" = ANY (ARRAY['PHAU_THUAT'::"text", 'THU_THUAT'::"text"])))
);

ALTER TABLE ONLY "public"."cssd_dm_bo_dung_cu" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_dm_bo_dung_cu" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cssd_dm_bo_dung_cu_chi_tiet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bo_dung_cu_id" "uuid",
    "ten_dung_cu_le" "text" NOT NULL,
    "so_luong" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "ghi_chu" "text",
    "ten_chi_tiet" "text",
    "loai_dung_cu_id" "uuid",
    "specs" "jsonb" DEFAULT '{}'::"jsonb"
);

ALTER TABLE ONLY "public"."cssd_dm_bo_dung_cu_chi_tiet" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_dm_bo_dung_cu_chi_tiet" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cssd_dm_bo_phan_bo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bo_dung_cu_id" "uuid" NOT NULL,
    "khoa_phong_id" "uuid" NOT NULL,
    "so_luong_co_so" integer DEFAULT 0 NOT NULL,
    "so_luong_hien_tai" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."cssd_dm_bo_phan_bo" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_dm_bo_phan_bo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cssd_dm_hoa_chat" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_hoa_chat" character varying(50) NOT NULL,
    "ten_hoa_chat" "text" NOT NULL,
    "loai_hoa_chat" character varying(50) DEFAULT 'HOA_CHAT'::character varying,
    "don_vi_tinh" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "han_su_dung" "date",
    "nguong_ton_toi_thieu" numeric(18,4),
    "specs" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

ALTER TABLE ONLY "public"."cssd_dm_hoa_chat" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_dm_hoa_chat" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cssd_dm_hoa_chat"."nguong_ton_toi_thieu" IS 'KSNK kho: cảnh báo khi tổng tồn <= giá trị (theo đơn vị dm_hoa_chat).';



COMMENT ON COLUMN "public"."cssd_dm_hoa_chat"."specs" IS 'Thông số kỹ thuật tùy biến của hóa chất dưới dạng JSONB (quy_cach, nong_do, ghi_chu, v.v.)';



CREATE TABLE IF NOT EXISTS "public"."cssd_dm_loai_dung_cu" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_loai" character varying(50) NOT NULL,
    "ten_loai" "text" NOT NULL,
    "mo_ta" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "so_ngay_han_dung" integer DEFAULT 30,
    "phan_loai" "text" DEFAULT 'PHAU_THUAT'::"text" NOT NULL,
    "so_luong_kho_du_phong" integer DEFAULT 0 NOT NULL,
    "specs" "jsonb" DEFAULT '{}'::"jsonb",
    "phan_loai_spaulding" "text" DEFAULT 'CRITICAL'::"text" NOT NULL,
    "is_chiu_nhiet" boolean DEFAULT true NOT NULL,
    "phuong_phap_tiet_khuan_chi_dinh" "text" DEFAULT 'STEAM_134'::"text" NOT NULL,
    CONSTRAINT "cssd_dm_loai_dung_cu_phan_loai_spaulding_check" CHECK (("phan_loai_spaulding" = ANY (ARRAY['CRITICAL'::"text", 'SEMI_CRITICAL'::"text", 'NON_CRITICAL'::"text"]))),
    CONSTRAINT "cssd_dm_loai_dung_cu_phuong_phap_tiet_khuan_chi_dinh_check" CHECK (("phuong_phap_tiet_khuan_chi_dinh" = ANY (ARRAY['STEAM_134'::"text", 'STEAM_121'::"text", 'PLASMA'::"text", 'EO'::"text"]))),
    CONSTRAINT "dm_loai_dung_cu_phan_loai_check" CHECK (("phan_loai" = ANY (ARRAY['PHAU_THUAT'::"text", 'THU_THUAT'::"text"])))
);

ALTER TABLE ONLY "public"."cssd_dm_loai_dung_cu" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_dm_loai_dung_cu" OWNER TO "postgres";


COMMENT ON TABLE "public"."cssd_dm_loai_dung_cu" IS 'Bảng danh mục vật lý độc lập quản lý phân loại dụng cụ y tế CSSD (Phẫu thuật, Nội soi, v.v.).';



CREATE TABLE IF NOT EXISTS "public"."sys_lookup_value" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_type" "text" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."sys_lookup_value" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."sys_lookup_value" OWNER TO "postgres";


COMMENT ON TABLE "public"."sys_lookup_value" IS 'Bảng danh mục lookup hợp nhất từ 11 bảng danh mục phụ để chuẩn hóa tinh gọn DB KSNK BV103.';



CREATE OR REPLACE VIEW "public"."cssd_dm_loai_may" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_loai_may",
    "name" AS "ten_loai_may",
    "is_active",
    "created_at",
    "updated_at",
    NULL::"uuid" AS "legacy_danh_muc_id"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'LOAI_MAY_TIET_KHUAN'::"text");


ALTER VIEW "public"."cssd_dm_loai_may" OWNER TO "postgres";


COMMENT ON VIEW "public"."cssd_dm_loai_may" IS 'View tương thích ngược cho loại máy tiệt khuẩn, trỏ sang dm_lookup_value.';



CREATE TABLE IF NOT EXISTS "public"."cssd_dm_thiet_bi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_thiet_bi" character varying(50) NOT NULL,
    "ten_thiet_bi" "text" NOT NULL,
    "trang_thai" character varying(50) DEFAULT 'READY'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "ngay_dua_vao_su_dung" "date" DEFAULT CURRENT_DATE,
    "chu_ky_bao_tri_ngay" integer DEFAULT 180,
    "ngay_bao_tri_gan_nhat" "date",
    "ngay_bao_tri_tiep_theo" "date",
    "loai_may_id" "uuid",
    "specs" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

ALTER TABLE ONLY "public"."cssd_dm_thiet_bi" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_dm_thiet_bi" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cssd_dm_thiet_bi"."specs" IS 'Thông số kỹ thuật tùy biến của thiết bị dưới dạng JSONB (hang_san_xuat, nam_san_xuat, ghi_chu, v.v.)';



CREATE OR REPLACE VIEW "public"."cssd_dm_tram" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_tram",
    "name" AS "ten_tram",
    COALESCE((("metadata" ->> 'thu_tu'::"text"))::smallint, (0)::smallint) AS "thu_tu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'TRAM_CSSD'::"text");


ALTER VIEW "public"."cssd_dm_tram" OWNER TO "postgres";


COMMENT ON VIEW "public"."cssd_dm_tram" IS 'View tương thích ngược cho Trạm workflow CSSD, trỏ sang dm_lookup_value (TRAM_CSSD).';



CREATE TABLE IF NOT EXISTS "public"."cssd_fact_bao_tri" (
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
    CONSTRAINT "fact_bao_tri_thiet_bi_trang_thai_check" CHECK ((("trang_thai")::"text" = ANY (ARRAY[('DANG_THUC_HIEN'::character varying)::"text", ('HOAN_THANH'::character varying)::"text", ('HUY'::character varying)::"text"])))
);


ALTER TABLE "public"."cssd_fact_bao_tri" OWNER TO "postgres";


COMMENT ON TABLE "public"."cssd_fact_bao_tri" IS 'CSSD: phiếu bảo trì thiết bị — tối đa một phiếu DANG_THUC_HIEN / máy; đồng bộ dm_thiet_bi.trang_thai.';



CREATE TABLE IF NOT EXISTS "public"."cssd_fact_dieu_chuyen_thanh_phan" (
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


ALTER TABLE "public"."cssd_fact_dieu_chuyen_thanh_phan" OWNER TO "postgres";


COMMENT ON TABLE "public"."cssd_fact_dieu_chuyen_thanh_phan" IS 'CSSD: nhật ký điều chuyển cấu phần giữa hai bộ QR.';



CREATE TABLE IF NOT EXISTS "public"."cssd_fact_kho_chi_tiet" (
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


ALTER TABLE "public"."cssd_fact_kho_chi_tiet" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cssd_fact_kho_giao_dich" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "loai_dung_cu_id" "uuid" NOT NULL,
    "bo_dung_cu_id" "uuid",
    "quy_trinh_id" "uuid",
    "loai_giao_dich" "text" NOT NULL,
    "so_luong_thay_doi" integer NOT NULL,
    "ghi_chu" "text",
    "nguoi_thuc_hien_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "fact_kho_dung_cu_giao_dich_loai_giao_dich_check" CHECK (("loai_giao_dich" = ANY (ARRAY['NHAP_KHO'::"text", 'BAO_HONG'::"text", 'BAO_MAT'::"text", 'BO_SUNG'::"text", 'DIEU_CHUYEN'::"text"])))
);


ALTER TABLE "public"."cssd_fact_kho_giao_dich" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cssd_fact_kho_hoa_chat_giao_dich" (
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
    CONSTRAINT "fact_kho_hoa_chat_giao_dich_loai_giao_dich_check" CHECK ((("loai_giao_dich")::"text" = ANY (ARRAY[('NHAP'::character varying)::"text", ('XUAT'::character varying)::"text", ('DIEU_CHINH'::character varying)::"text"])))
);


ALTER TABLE "public"."cssd_fact_kho_hoa_chat_giao_dich" OWNER TO "postgres";


COMMENT ON TABLE "public"."cssd_fact_kho_hoa_chat_giao_dich" IS 'KSNK kho hóa chất/vật tư: NHAP >0, XUAT <0, DIEU_CHINH có thể +/- ; tồn theo lô = SUM(so_luong_co_dau) GROUP BY dm_hoa_chat_id, ma_lo, han_su_dung.';



CREATE TABLE IF NOT EXISTS "public"."cssd_fact_lifecycle_event" (
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


ALTER TABLE "public"."cssd_fact_lifecycle_event" OWNER TO "postgres";


COMMENT ON TABLE "public"."cssd_fact_lifecycle_event" IS 'CSSD: nhật ký sự kiện vòng đời (bổ sung fact_nhat_ky_quet), phục vụ domino/audit.';



CREATE TABLE IF NOT EXISTS "public"."cssd_fact_lo_tiet_khuan" (
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
    "ket_qua_bi" boolean,
    "ket_qua_ci" boolean,
    "ghi_chu_qc" "text",
    "tk_chot_nap_at" timestamp with time zone,
    "tk_mo_form_qc_at" timestamp with time zone,
    "tk_qc_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "loai_may_id" "uuid"
);


ALTER TABLE "public"."cssd_fact_lo_tiet_khuan" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cssd_fact_lo_tiet_khuan"."tk_chot_nap_at" IS 'Xác nhận bắt đầu tiệt khuẩn: khóa nạp thêm, chuyển bộ trong mẻ sang trạm TIET_KHUAN.';



COMMENT ON COLUMN "public"."cssd_fact_lo_tiet_khuan"."tk_mo_form_qc_at" IS 'Kết thúc chu trình tiệt khuẩn (vật lý): cho phép nhập thông số/đánh giá QC.';



COMMENT ON COLUMN "public"."cssd_fact_lo_tiet_khuan"."tk_qc_json" IS 'Thông số QC mẻ (máy, chỉ thị, test tùy chọn, URL ảnh minh chứng).';



CREATE TABLE IF NOT EXISTS "public"."cssd_fact_quy_trinh" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_qr_quy_trinh" character varying(100) NOT NULL,
    "bo_dung_cu_id" "uuid",
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
    "is_dong_bang" boolean DEFAULT false NOT NULL,
    "quy_trinh_cha_id" "uuid",
    "ma_vai_tro_bo" character varying(20) DEFAULT 'DON'::character varying NOT NULL,
    "ngay_het_han" timestamp with time zone,
    "tram_hien_tai_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."cssd_fact_quy_trinh" OWNER TO "postgres";


COMMENT ON TABLE "public"."cssd_fact_quy_trinh" IS 'Bảng quy trình (Cho phép lưu lịch sử nhiều chu kỳ của cùng 1 mã QR)';



COMMENT ON COLUMN "public"."cssd_fact_quy_trinh"."nguoi_tiep_nhan_id" IS 'Người thực hiện bước tiếp nhận';



COMMENT ON COLUMN "public"."cssd_fact_quy_trinh"."is_dong_bang" IS 'Khóa an toàn: thiếu/hỏng cấu phần — chỉ quản trị mở.';



COMMENT ON COLUMN "public"."cssd_fact_quy_trinh"."quy_trinh_cha_id" IS 'QR phụ (SUB) trỏ về quy trình MAIN khi tách mã đóng gói.';



COMMENT ON COLUMN "public"."cssd_fact_quy_trinh"."ma_vai_tro_bo" IS 'DON | MAIN | SUB — hội quân cấp phát.';



COMMENT ON COLUMN "public"."cssd_fact_quy_trinh"."ngay_het_han" IS 'Hạn sử dụng của bộ dụng cụ (tính từ ngày tiệt khuẩn đạt)';



CREATE TABLE IF NOT EXISTS "public"."cssd_fact_quy_trinh_thanh_phan" (
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


ALTER TABLE "public"."cssd_fact_quy_trinh_thanh_phan" OWNER TO "postgres";


COMMENT ON TABLE "public"."cssd_fact_quy_trinh_thanh_phan" IS 'CSSD: cấu phần theo từng QR vòng đời (bám dm_bo_dung_cu_chi_tiet).';



CREATE TABLE IF NOT EXISTS "public"."cssd_fact_su_co" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quy_trinh_id" "uuid",
    "ma_qr_quy_trinh" "text",
    "ma_tram_phat_hien" "text" NOT NULL,
    "ma_tram_gay_loi" "text",
    "mo_ta" "text",
    "is_red_alert" boolean DEFAULT false,
    "nguoi_bao_id" "uuid",
    "nguoi_xac_nhan_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "loai_su_co_id" "uuid",
    "attributes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."cssd_fact_su_co" OWNER TO "postgres";


COMMENT ON TABLE "public"."cssd_fact_su_co" IS 'Bảng lưu tất cả sự cố CSSD - Configuration-Driven Hybrid EAV';



COMMENT ON COLUMN "public"."cssd_fact_su_co"."ma_qr_quy_trinh" IS 'Mã QR của quy trình bộ dụng cụ. Nullable khi báo cáo sự cố máy móc hoặc hóa chất chung.';



COMMENT ON COLUMN "public"."cssd_fact_su_co"."attributes" IS 'Chứa toàn bộ các thuộc tính động mở rộng của sự cố dưới dạng JSONB (thay thế EAV)';



CREATE TABLE IF NOT EXISTS "public"."gstt_dm_bang_kiem" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_bk" "text" NOT NULL,
    "ten_bang_kiem" "text" NOT NULL,
    "nhom_chuyen_de" "text",
    "mo_ta" "text",
    "is_active" boolean DEFAULT true,
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "loai_hinh_giam_sat" "text" DEFAULT 'TRUC_TIEP'::"text",
    "tieu_chi_jsonb" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "phan_loai_chuyen_mon" "text",
    "loai_giam_sat" "text",
    "doi_tuong_giam_sat" "text",
    "cach_tinh_diem" "text",
    "phien_ban" "text" DEFAULT '1.0'::"text",
    CONSTRAINT "chk_gstt_bk_cach_tinh_diem" CHECK ((("cach_tinh_diem" IS NULL) OR ("cach_tinh_diem" = ANY (ARRAY['TY_LE'::"text", 'TRON_GOI'::"text", 'DAT_KHONG_DAT'::"text", 'NHAT_KY'::"text"])))),
    CONSTRAINT "chk_gstt_bk_doi_tuong_giam_sat" CHECK ((("doi_tuong_giam_sat" IS NULL) OR ("doi_tuong_giam_sat" = ANY (ARRAY['NHAN_VIEN'::"text", 'NGUOI_BENH'::"text", 'MOI_TRUONG'::"text", 'THIET_BI'::"text", 'ME_TIET_KHUAN'::"text"])))),
    CONSTRAINT "chk_gstt_bk_loai_giam_sat" CHECK ((("loai_giam_sat" IS NULL) OR ("loai_giam_sat" = ANY (ARRAY['TUAN_THU'::"text", 'NHAT_KY_VAN_HANH'::"text", 'DANH_GIA_HE_THONG'::"text"])))),
    CONSTRAINT "chk_gstt_bk_phan_loai_chuyen_mon" CHECK ((("phan_loai_chuyen_mon" IS NULL) OR ("phan_loai_chuyen_mon" = ANY (ARRAY['PHONG_NGUA_CHUAN'::"text", 'GOI_CAN_THIEP'::"text", 'XU_LY_DUNG_CU'::"text", 'MOI_TRUONG_CHAT_THAI'::"text", 'CHUYEN_KHOA'::"text", 'QUAN_TRI_HE_THONG'::"text"]))))
);

ALTER TABLE ONLY "public"."gstt_dm_bang_kiem" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."gstt_dm_bang_kiem" OWNER TO "postgres";


COMMENT ON COLUMN "public"."gstt_dm_bang_kiem"."tieu_chi_jsonb" IS 'Danh sách mảng các tiêu chí kiểm tra dưới dạng JSONB (thay thế EAV)';



COMMENT ON COLUMN "public"."gstt_dm_bang_kiem"."phan_loai_chuyen_mon" IS 'Phân loại chuyên môn KSNK (Category): PHONG_NGUA_CHUAN | GOI_CAN_THIEP | XU_LY_DUNG_CU | MOI_TRUONG_CHAT_THAI | CHUYEN_KHOA. Ánh xạ Dim_Checklist_Template.Category trong tài liệu.';



COMMENT ON COLUMN "public"."gstt_dm_bang_kiem"."loai_giam_sat" IS 'Loại hoạt động giám sát (Super_Category): TUAN_THU=mạng lưới audit hành vi NVYT; NHAT_KY_VAN_HANH=NVYT khoa tự log số liệu (nhiệt độ lò TK, áp suất AIIR, MEC, RO); DANH_GIA_HE_THONG=thanh tra JCI/APSIC dùng nội bộ.';



COMMENT ON COLUMN "public"."gstt_dm_bang_kiem"."doi_tuong_giam_sat" IS 'Đối tượng được quan sát (Target_Type): NHAN_VIEN | NGUOI_BENH | MOI_TRUONG | THIET_BI | ME_TIET_KHUAN. Quyết định form fields ở Slice 5 (NHAN_VIEN bắt nghề nghiệp, NGUOI_BENH bắt mã NB...).';



COMMENT ON COLUMN "public"."gstt_dm_bang_kiem"."cach_tinh_diem" IS 'Thuật toán scoring (Scoring_Logic): TY_LE=PERCENTAGE %; TRON_GOI=ALL_OR_NONE care bundle; DAT_KHONG_DAT=PASS_FAIL ngưỡng cứng; NHAT_KY=LOG_ENTRY chỉ ghi không tính rate. Slice 4 implement engine.';



COMMENT ON COLUMN "public"."gstt_dm_bang_kiem"."phien_ban" IS 'Phiên bản bảng kiểm (Dim_Checklist_Template.Version) — text linh hoạt (1.0, 2.1...). Cho audit thay đổi nội dung tiêu chí.';



CREATE OR REPLACE VIEW "public"."dm_bang_kiem" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_bk",
    "ten_bang_kiem",
    "nhom_chuyen_de",
    "mo_ta",
    "is_active",
    "is_system",
    "created_at",
    "updated_at",
    "loai_hinh_giam_sat",
    "tieu_chi_jsonb"
   FROM "public"."gstt_dm_bang_kiem";


ALTER VIEW "public"."dm_bang_kiem" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_bo_dung_cu" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_bo",
    "ten_bo",
    "loai_dung_cu_id",
    "created_at",
    "updated_at",
    "is_active",
    "trang_thai",
    "ghi_chu",
    "ngay_kiem_ke_gan_nhat",
    "quy_cach",
    "khoa_su_dung_id",
    "phan_loai_bo",
    "co_ma_dinh_danh_rieng"
   FROM "public"."cssd_dm_bo_dung_cu";


ALTER VIEW "public"."dm_bo_dung_cu" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_bo_dung_cu_chi_tiet" WITH ("security_invoker"='true') AS
 SELECT "id",
    "bo_dung_cu_id",
    "ten_dung_cu_le",
    "so_luong",
    "created_at",
    "updated_at",
    "is_active",
    "ghi_chu",
    "ten_chi_tiet",
    "loai_dung_cu_id",
    "specs"
   FROM "public"."cssd_dm_bo_dung_cu_chi_tiet";


ALTER VIEW "public"."dm_bo_dung_cu_chi_tiet" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_bo_dung_cu_phan_bo" WITH ("security_invoker"='true') AS
 SELECT "id",
    "bo_dung_cu_id",
    "khoa_phong_id",
    "so_luong_co_so",
    "so_luong_hien_tai",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."cssd_dm_bo_phan_bo";


ALTER VIEW "public"."dm_bo_dung_cu_phan_bo" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."gstt_dm_cach_thuc_giam_sat" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_cach_thuc",
    "name" AS "ten_cach_thuc",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'CACH_THUC_GIAM_SAT'::"text");


ALTER VIEW "public"."gstt_dm_cach_thuc_giam_sat" OWNER TO "postgres";


COMMENT ON VIEW "public"."gstt_dm_cach_thuc_giam_sat" IS 'View tương thích ngược cho cách thức giám sát, trỏ sang dm_lookup_value.';



CREATE OR REPLACE VIEW "public"."dm_cach_thuc_giam_sat" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_cach_thuc",
    "ten_cach_thuc",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."gstt_dm_cach_thuc_giam_sat";


ALTER VIEW "public"."dm_cach_thuc_giam_sat" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mdm_dm_chuc_danh" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_chuc_danh",
    "name" AS "ten_chuc_danh",
    "is_active",
    "created_at",
    "updated_at",
    NULL::"uuid" AS "legacy_danh_muc_id"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'CHUC_DANH'::"text");


ALTER VIEW "public"."mdm_dm_chuc_danh" OWNER TO "postgres";


COMMENT ON VIEW "public"."mdm_dm_chuc_danh" IS 'View tương thích ngược cho chức danh, trỏ sang dm_lookup_value.';



CREATE OR REPLACE VIEW "public"."dm_chuc_danh" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_chuc_danh",
    "ten_chuc_danh",
    "is_active",
    "created_at",
    "updated_at",
    "legacy_danh_muc_id"
   FROM "public"."mdm_dm_chuc_danh";


ALTER VIEW "public"."dm_chuc_danh" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mdm_dm_chuc_vu" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_chuc_vu",
    "name" AS "ten_chuc_vu",
    "is_active",
    "created_at",
    "updated_at",
    NULL::"uuid" AS "legacy_danh_muc_id"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'CHUC_VU'::"text");


ALTER VIEW "public"."mdm_dm_chuc_vu" OWNER TO "postgres";


COMMENT ON VIEW "public"."mdm_dm_chuc_vu" IS 'View tương thích ngược cho chức vụ, trỏ sang dm_lookup_value.';



CREATE OR REPLACE VIEW "public"."dm_chuc_vu" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_chuc_vu",
    "ten_chuc_vu",
    "is_active",
    "created_at",
    "updated_at",
    "legacy_danh_muc_id"
   FROM "public"."mdm_dm_chuc_vu";


ALTER VIEW "public"."dm_chuc_vu" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."gstt_dm_hinh_thuc_giam_sat" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_hinh_thuc",
    "name" AS "ten_hinh_thuc",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'HINH_THUC_GIAM_SAT'::"text");


ALTER VIEW "public"."gstt_dm_hinh_thuc_giam_sat" OWNER TO "postgres";


COMMENT ON VIEW "public"."gstt_dm_hinh_thuc_giam_sat" IS 'View tương thích ngược cho hình thức giám sát, trỏ sang dm_lookup_value.';



CREATE OR REPLACE VIEW "public"."dm_hinh_thuc_giam_sat" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_hinh_thuc",
    "ten_hinh_thuc",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."gstt_dm_hinh_thuc_giam_sat";


ALTER VIEW "public"."dm_hinh_thuc_giam_sat" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_hoa_chat" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_hoa_chat",
    "ten_hoa_chat",
    "loai_hoa_chat",
    "don_vi_tinh",
    "created_at",
    "is_active",
    "updated_at",
    "han_su_dung",
    "nguong_ton_toi_thieu",
    "specs"
   FROM "public"."cssd_dm_hoa_chat";


ALTER VIEW "public"."dm_hoa_chat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mdm_dm_khoa_phong" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_khoa" character varying(50) NOT NULL,
    "ten_khoa" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "khoi_id" "uuid",
    "specs" "jsonb" DEFAULT '{}'::"jsonb"
);

ALTER TABLE ONLY "public"."mdm_dm_khoa_phong" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."mdm_dm_khoa_phong" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_khoa_phong" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_khoa",
    "ten_khoa",
    "created_at",
    "updated_at",
    "is_active",
    "khoi_id",
    "specs"
   FROM "public"."mdm_dm_khoa_phong";


ALTER VIEW "public"."dm_khoa_phong" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mdm_dm_khoi_khoa" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_khoi",
    "name" AS "ten_khoi",
    "is_active",
    "created_at",
    "updated_at",
    NULL::"uuid" AS "legacy_danh_muc_id"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'KHOI_KHOA'::"text");


ALTER VIEW "public"."mdm_dm_khoi_khoa" OWNER TO "postgres";


COMMENT ON VIEW "public"."mdm_dm_khoi_khoa" IS 'View tương thích ngược cho Khối khoa, trỏ sang dm_lookup_value (KHOI_KHOA).';



CREATE OR REPLACE VIEW "public"."dm_khoi_khoa" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_khoi",
    "ten_khoi",
    "is_active",
    "created_at",
    "updated_at",
    "legacy_danh_muc_id"
   FROM "public"."mdm_dm_khoi_khoa";


ALTER VIEW "public"."dm_khoi_khoa" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_khu_vuc_giam_sat" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_khu_vuc",
    "name" AS "ten_khu_vuc",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'KHU_VUC_GIAM_SAT'::"text");


ALTER VIEW "public"."dm_khu_vuc_giam_sat" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."qlcv_dm_loai_cong_viec" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma",
    "name" AS "ten",
    COALESCE((("metadata" ->> 'thu_tu'::"text"))::integer, 0) AS "thu_tu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'LOAI_CONG_VIEC'::"text");


ALTER VIEW "public"."qlcv_dm_loai_cong_viec" OWNER TO "postgres";


COMMENT ON VIEW "public"."qlcv_dm_loai_cong_viec" IS 'View tương thích ngược cho loại công việc, trỏ sang dm_lookup_value.';



CREATE OR REPLACE VIEW "public"."dm_loai_cong_viec" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma",
    "ten",
    "thu_tu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."qlcv_dm_loai_cong_viec";


ALTER VIEW "public"."dm_loai_cong_viec" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_loai_dung_cu" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_loai",
    "ten_loai",
    "mo_ta",
    "created_at",
    "updated_at",
    "is_active",
    "so_ngay_han_dung",
    "phan_loai",
    "so_luong_kho_du_phong",
    "specs",
    "phan_loai_spaulding",
    "is_chiu_nhiet",
    "phuong_phap_tiet_khuan_chi_dinh"
   FROM "public"."cssd_dm_loai_dung_cu";


ALTER VIEW "public"."dm_loai_dung_cu" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_loai_may_tiet_khuan" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_loai_may",
    "ten_loai_may",
    "is_active",
    "created_at",
    "updated_at",
    "legacy_danh_muc_id"
   FROM "public"."cssd_dm_loai_may";


ALTER VIEW "public"."dm_loai_may_tiet_khuan" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."nkbv_dm_loai" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_loai",
    "name" AS "ten_loai",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'LOAI_NKBV'::"text");


ALTER VIEW "public"."nkbv_dm_loai" OWNER TO "postgres";


COMMENT ON VIEW "public"."nkbv_dm_loai" IS 'View tương thích ngược cho loại ca NKBV, trỏ sang dm_lookup_value.';



CREATE OR REPLACE VIEW "public"."dm_loai_nkbv" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_loai",
    "ten_loai",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."nkbv_dm_loai";


ALTER VIEW "public"."dm_loai_nkbv" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_loai_su_co" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_loai_su_co",
    "name" AS "ten_loai_su_co",
    "is_active",
    "created_at",
    "updated_at",
    NULL::"uuid" AS "legacy_danh_muc_id"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'LOAI_SU_CO'::"text");


ALTER VIEW "public"."dm_loai_su_co" OWNER TO "postgres";


COMMENT ON VIEW "public"."dm_loai_su_co" IS 'View tương thích ngược cho loại sự cố CSSD, trỏ sang dm_lookup_value.';



CREATE OR REPLACE VIEW "public"."dm_lookup_value" WITH ("security_invoker"='true') AS
 SELECT "id",
    "category_type",
    "code",
    "name",
    "description",
    "is_active",
    "metadata",
    "created_at",
    "updated_at"
   FROM "public"."sys_lookup_value";


ALTER VIEW "public"."dm_lookup_value" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mdm_dm_nghe_nghiep" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_nghe_nghiep",
    "name" AS "ten_nghe_nghiep",
    "is_active",
    "created_at",
    "updated_at",
    NULL::"uuid" AS "legacy_danh_muc_id"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'NGHE_NGHIEP'::"text");


ALTER VIEW "public"."mdm_dm_nghe_nghiep" OWNER TO "postgres";


COMMENT ON VIEW "public"."mdm_dm_nghe_nghiep" IS 'View tương thích ngược cho nghề nghiệp, trỏ sang dm_lookup_value.';



CREATE OR REPLACE VIEW "public"."dm_nghe_nghiep" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_nghe_nghiep",
    "ten_nghe_nghiep",
    "is_active",
    "created_at",
    "updated_at",
    "legacy_danh_muc_id"
   FROM "public"."mdm_dm_nghe_nghiep";


ALTER VIEW "public"."dm_nghe_nghiep" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nkbv_dm_cdc_baseline" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khoa_id" "uuid",
    "loai_thiet_bi" "text" NOT NULL,
    "expected_infection_rate_per_1000" numeric(10,4) NOT NULL,
    "expected_dur" numeric(10,4) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dm_nkbv_cdc_baselines_loai_thiet_bi_check" CHECK (("loai_thiet_bi" = ANY (ARRAY['CVC'::"text", 'FOLEY'::"text", 'VENT'::"text"])))
);


ALTER TABLE "public"."nkbv_dm_cdc_baseline" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_nkbv_cdc_baselines" WITH ("security_invoker"='true') AS
 SELECT "id",
    "khoa_id",
    "loai_thiet_bi",
    "expected_infection_rate_per_1000",
    "expected_dur",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."nkbv_dm_cdc_baseline";


ALTER VIEW "public"."dm_nkbv_cdc_baselines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sys_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "action" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."sys_permissions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."sys_permissions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_permissions" WITH ("security_invoker"='true') AS
 SELECT "id",
    "module_name",
    "action",
    "description",
    "created_at"
   FROM "public"."sys_permissions";


ALTER VIEW "public"."dm_permissions" OWNER TO "postgres";


COMMENT ON VIEW "public"."dm_permissions" IS 'Compat view 1-tầng → sys_permissions. Flatten 26/05/2026.';



CREATE TABLE IF NOT EXISTS "public"."sys_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);

ALTER TABLE ONLY "public"."sys_roles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."sys_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_roles" WITH ("security_invoker"='true') AS
 SELECT "id",
    "name",
    "description",
    "created_at",
    "updated_at",
    "is_active"
   FROM "public"."sys_roles";


ALTER VIEW "public"."dm_roles" OWNER TO "postgres";


COMMENT ON VIEW "public"."dm_roles" IS 'Compat view 1-tầng → sys_roles. Flatten 26/05/2026.';



CREATE OR REPLACE VIEW "public"."dm_thiet_bi" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_thiet_bi",
    "ten_thiet_bi",
    "trang_thai",
    "created_at",
    "updated_at",
    "is_active",
    "ngay_dua_vao_su_dung",
    "chu_ky_bao_tri_ngay",
    "ngay_bao_tri_gan_nhat",
    "ngay_bao_tri_tiep_theo",
    "loai_may_id",
    "specs"
   FROM "public"."cssd_dm_thiet_bi";


ALTER VIEW "public"."dm_thiet_bi" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."gstt_dm_tieu_chi_bang_kiem" WITH ("security_invoker"='true') AS
 SELECT (("r"."elem" ->> 'id'::"text"))::"uuid" AS "id",
    ("r"."elem" ->> 'ma_tc'::"text") AS "ma_tc",
    "s"."id" AS "bang_kiem_id",
    (("r"."elem" ->> 'stt'::"text"))::integer AS "stt",
    ("r"."elem" ->> 'noi_dung'::"text") AS "noi_dung",
    ("r"."elem" ->> 'ghi_chu'::"text") AS "ghi_chu",
    COALESCE((("r"."elem" ->> 'is_active'::"text"))::boolean, true) AS "is_active",
    COALESCE((("r"."elem" ->> 'created_at'::"text"))::timestamp with time zone, "s"."created_at") AS "created_at",
    COALESCE((("r"."elem" ->> 'updated_at'::"text"))::timestamp with time zone, "s"."updated_at") AS "updated_at",
    COALESCE((("r"."elem" ->> 'diem_toi_da'::"text"))::integer, 1) AS "diem_toi_da",
    ("r"."elem" ->> 'phan_muc'::"text") AS "phan_muc",
    COALESCE(NULLIF(("r"."elem" ->> 'kieu_du_lieu'::"text"), ''::"text"), 'BOOLEAN'::"text") AS "kieu_du_lieu",
    COALESCE((("r"."elem" ->> 'la_then_chot'::"text"))::boolean, false) AS "la_then_chot",
    COALESCE((("r"."elem" ->> 'cho_phep_kpa'::"text"))::boolean, true) AS "cho_phep_kpa",
        CASE
            WHEN ("jsonb_typeof"(("r"."elem" -> 'cac_lua_chon'::"text")) = 'array'::"text") THEN ARRAY( SELECT "jsonb_array_elements_text"(("r"."elem" -> 'cac_lua_chon'::"text")) AS "jsonb_array_elements_text")
            ELSE NULL::"text"[]
        END AS "cac_lua_chon",
    ("r"."elem" ->> 'ma_csv_goc'::"text") AS "ma_csv_goc"
   FROM "public"."gstt_dm_bang_kiem" "s",
    LATERAL "jsonb_array_elements"("s"."tieu_chi_jsonb") "r"("elem");


ALTER VIEW "public"."gstt_dm_tieu_chi_bang_kiem" OWNER TO "postgres";


COMMENT ON VIEW "public"."gstt_dm_tieu_chi_bang_kiem" IS 'Unpack tieu_chi_jsonb thành rows phẳng để app SELECT. Slice 3 (reform v4): thêm 6 key phan_muc/kieu_du_lieu/la_then_chot/cho_phep_kpa/cac_lua_chon/ma_csv_goc với default backward-compat.';



CREATE OR REPLACE VIEW "public"."dm_tieu_chi_bang_kiem" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_tc",
    "bang_kiem_id",
    "stt",
    "noi_dung",
    "ghi_chu",
    "is_active",
    "created_at",
    "updated_at",
    "diem_toi_da",
    "phan_muc",
    "kieu_du_lieu",
    "la_then_chot",
    "cho_phep_kpa",
    "cac_lua_chon",
    "ma_csv_goc"
   FROM "public"."gstt_dm_tieu_chi_bang_kiem";


ALTER VIEW "public"."dm_tieu_chi_bang_kiem" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mdm_dm_to_cong_tac" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_to",
    "name" AS "ten_to",
    "is_active",
    "created_at",
    "updated_at",
    NULL::"uuid" AS "legacy_danh_muc_id"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'TO_CONG_TAC'::"text");


ALTER VIEW "public"."mdm_dm_to_cong_tac" OWNER TO "postgres";


COMMENT ON VIEW "public"."mdm_dm_to_cong_tac" IS 'View tương thích ngược cho tổ công tác, trỏ sang dm_lookup_value.';



CREATE OR REPLACE VIEW "public"."dm_to_cong_tac" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_to",
    "ten_to",
    "is_active",
    "created_at",
    "updated_at",
    "legacy_danh_muc_id"
   FROM "public"."mdm_dm_to_cong_tac";


ALTER VIEW "public"."dm_to_cong_tac" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dm_tram_cssd" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_tram",
    "ten_tram",
    "thu_tu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."cssd_dm_tram";


ALTER VIEW "public"."dm_tram_cssd" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."qlcv_dm_trang_thai_cong_viec" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma",
    "name" AS "ten",
    ("metadata" ->> 'mau_sac'::"text") AS "mau_sac",
    COALESCE((("metadata" ->> 'thu_tu'::"text"))::integer, 0) AS "thu_tu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'TRANG_THAI_CONG_VIEC'::"text");


ALTER VIEW "public"."qlcv_dm_trang_thai_cong_viec" OWNER TO "postgres";


COMMENT ON VIEW "public"."qlcv_dm_trang_thai_cong_viec" IS 'View tương thích ngược cho trạng thái công việc với màu sắc và thứ tự sắp xếp.';



CREATE OR REPLACE VIEW "public"."dm_trang_thai_cong_viec" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma",
    "ten",
    "mau_sac",
    "thu_tu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."qlcv_dm_trang_thai_cong_viec";


ALTER VIEW "public"."dm_trang_thai_cong_viec" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."nkbv_dm_trang_thai_ca" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_trang_thai",
    "name" AS "ten_trang_thai",
    COALESCE((("metadata" ->> 'thu_tu'::"text"))::integer, 0) AS "thu_tu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'TRANG_THAI_NKBV_CA'::"text");


ALTER VIEW "public"."nkbv_dm_trang_thai_ca" OWNER TO "postgres";


COMMENT ON VIEW "public"."nkbv_dm_trang_thai_ca" IS 'View tương thích ngược cho trạng thái ca NKBV với thứ tự sắp xếp.';



CREATE OR REPLACE VIEW "public"."dm_trang_thai_nkbv_ca" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_trang_thai",
    "ten_trang_thai",
    "thu_tu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."nkbv_dm_trang_thai_ca";


ALTER VIEW "public"."dm_trang_thai_nkbv_ca" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_bao_tri_thiet_bi" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_phieu",
    "thiet_bi_id",
    "trang_thai",
    "ly_do",
    "ket_qua_ghi_nhan",
    "thoi_gian_bat_dau",
    "thoi_gian_ket_thuc",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."cssd_fact_bao_tri";


ALTER VIEW "public"."fact_bao_tri_thiet_bi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sys_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_by" "uuid" DEFAULT "auth"."uid"(),
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fact_bv103_audit_log_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."sys_audit_log" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_bv103_audit_log" WITH ("security_invoker"='true') AS
 SELECT "id",
    "table_name",
    "record_id",
    "action",
    "old_data",
    "new_data",
    "changed_by",
    "changed_at"
   FROM "public"."sys_audit_log";


ALTER VIEW "public"."fact_bv103_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qlcv_fact_cong_viec" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tieu_de" "text" NOT NULL,
    "mo_ta" "text",
    "muc_do_uu_tien" "text" DEFAULT 'TRUNG_BINH'::"text",
    "han_hoan_thanh" "date",
    "nguoi_tao_id" "uuid",
    "nguoi_phu_trach_id" "uuid",
    "khoa_thuc_hien_id" "uuid",
    "to_cong_tac_id" "uuid",
    "cong_viec_cha_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "phan_tram_hoan_thanh" integer DEFAULT 0,
    "nguoi_giao_viec_id" "uuid",
    "dinh_ky_mau_id" "uuid",
    "loai_cong_viec_id" "uuid",
    "trang_thai_id" "uuid",
    "hoan_thanh_luc" timestamp with time zone,
    "gia_han_so_lan" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."qlcv_fact_cong_viec" OWNER TO "postgres";


COMMENT ON COLUMN "public"."qlcv_fact_cong_viec"."hoan_thanh_luc" IS 'Timestamp chính xác khi công việc được nghiệm thu (trang_thai → HOAN_THANH). Reset về NULL nếu bị trả làm lại. Dùng cho KPI đúng hạn thay vì updated_at.';



COMMENT ON COLUMN "public"."qlcv_fact_cong_viec"."gia_han_so_lan" IS 'Số lần hạn hoàn thành đã bị gia hạn (han_hoan_thanh bị dời sang ngày sau). Audit trail không xóa được qua history.';



CREATE OR REPLACE VIEW "public"."fact_cong_viec" WITH ("security_invoker"='true') AS
 SELECT "id",
    "tieu_de",
    "mo_ta",
    "muc_do_uu_tien",
    "han_hoan_thanh",
    "nguoi_tao_id",
    "nguoi_phu_trach_id",
    "khoa_thuc_hien_id",
    "to_cong_tac_id",
    "cong_viec_cha_id",
    "is_active",
    "created_at",
    "updated_at",
    "phan_tram_hoan_thanh",
    "nguoi_giao_viec_id",
    "dinh_ky_mau_id",
    "loai_cong_viec_id",
    "trang_thai_id",
    "hoan_thanh_luc",
    "gia_han_so_lan"
   FROM "public"."qlcv_fact_cong_viec";


ALTER VIEW "public"."fact_cong_viec" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qlcv_fact_cong_viec_dinh_ky" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tieu_de" "text" NOT NULL,
    "mo_ta" "text",
    "ma_chu_ky" "text" NOT NULL,
    "ngay_bat_dau" "date" DEFAULT CURRENT_DATE NOT NULL,
    "nguoi_phu_trach_id" "uuid",
    "to_cong_tac_id" "uuid",
    "nguoi_tao_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fact_cong_viec_dinh_ky_ma_chu_ky_check" CHECK (("ma_chu_ky" = ANY (ARRAY['WEEKLY'::"text", 'MONTHLY'::"text"])))
);


ALTER TABLE "public"."qlcv_fact_cong_viec_dinh_ky" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_cong_viec_dinh_ky" WITH ("security_invoker"='true') AS
 SELECT "id",
    "tieu_de",
    "mo_ta",
    "ma_chu_ky",
    "ngay_bat_dau",
    "nguoi_phu_trach_id",
    "to_cong_tac_id",
    "nguoi_tao_id",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."qlcv_fact_cong_viec_dinh_ky";


ALTER VIEW "public"."fact_cong_viec_dinh_ky" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qlcv_fact_cong_viec_hoat_dong" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_cong_viec" "uuid" NOT NULL,
    "loai_hoat_dong" "text" NOT NULL,
    "nguoi_thuc_hien_id" "uuid",
    "trang_thai" "text",
    "noi_dung" "text",
    "phan_tram_hoan_thanh" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fact_cong_viec_hoat_dong_loai_hoat_dong_check" CHECK (("loai_hoat_dong" = ANY (ARRAY['PHAN_CONG'::"text", 'DE_XUAT'::"text", 'BAO_CAO_TIEN_DO'::"text", 'PHE_DUYET'::"text", 'CAP_NHAT'::"text", 'HOAN_THANH'::"text", 'XAC_NHAN_NHAN'::"text", 'DUYET_HOAN_THANH'::"text", 'TU_CHOI_HOAN_THANH'::"text", 'GIA_HAN'::"text"]))),
    CONSTRAINT "fact_cong_viec_hoat_dong_phan_tram_hoan_thanh_check" CHECK ((("phan_tram_hoan_thanh" >= 0) AND ("phan_tram_hoan_thanh" <= 100)))
);


ALTER TABLE "public"."qlcv_fact_cong_viec_hoat_dong" OWNER TO "postgres";


COMMENT ON TABLE "public"."qlcv_fact_cong_viec_hoat_dong" IS 'Audit trail QLCV. RLS: service_role full access; authenticated read-only (no direct write).';



CREATE OR REPLACE VIEW "public"."fact_cong_viec_hoat_dong" WITH ("security_invoker"='true') AS
 SELECT "id",
    "id_cong_viec",
    "loai_hoat_dong",
    "nguoi_thuc_hien_id",
    "trang_thai",
    "noi_dung",
    "phan_tram_hoan_thanh",
    "created_at"
   FROM "public"."qlcv_fact_cong_viec_hoat_dong";


ALTER VIEW "public"."fact_cong_viec_hoat_dong" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_cssd_dieu_chuyen_thanh_phan" WITH ("security_invoker"='true') AS
 SELECT "id",
    "tu_quy_trinh_id",
    "den_quy_trinh_id",
    "ten_dung_cu_le",
    "so_luong",
    "dm_bo_dung_cu_chi_tiet_id",
    "ghi_chu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."cssd_fact_dieu_chuyen_thanh_phan";


ALTER VIEW "public"."fact_cssd_dieu_chuyen_thanh_phan" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_cssd_lifecycle_event" WITH ("security_invoker"='true') AS
 SELECT "id",
    "quy_trinh_id",
    "ma_su_kien",
    "ma_tram",
    "payload",
    "ghi_chu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."cssd_fact_lifecycle_event";


ALTER VIEW "public"."fact_cssd_lifecycle_event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gstt_fact_chung_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khoa_id" "uuid",
    "khu_vuc_id" "uuid",
    "vi_tri" "text",
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
    "is_seen" boolean DEFAULT false NOT NULL,
    "thoi_gian_bat_dau" timestamp with time zone,
    "thoi_gian_ket_thuc" timestamp with time zone,
    "hinh_thuc_id" "uuid",
    "cach_thuc_id" "uuid",
    "bang_kiem_id" "uuid",
    "results_jsonb" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "dat_tron_goi" boolean,
    "du_lieu_nghi_van" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."gstt_fact_chung_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."gstt_fact_chung_sessions" IS 'Phiên giám sát chung — stub greenfield.';



COMMENT ON COLUMN "public"."gstt_fact_chung_sessions"."is_seen" IS 'Người dùng đã mở xem/in phiên từ lịch sử.';



COMMENT ON COLUMN "public"."gstt_fact_chung_sessions"."thoi_gian_bat_dau" IS 'Giờ bắt đầu khung giám sát trong ngày (ưu tiên khi giám sát qua camera).';



COMMENT ON COLUMN "public"."gstt_fact_chung_sessions"."thoi_gian_ket_thuc" IS 'Giờ kết thúc khung giám sát trong ngày.';



COMMENT ON COLUMN "public"."gstt_fact_chung_sessions"."hinh_thuc_id" IS 'FK dm_hinh_thuc_giam_sat — link chuẩn; hinh_thuc_giam_sat là nhãn đồng bộ.';



COMMENT ON COLUMN "public"."gstt_fact_chung_sessions"."cach_thuc_id" IS 'FK dm_cach_thuc_giam_sat — link chuẩn; cach_thuc_giam_sat là nhãn đồng bộ.';



COMMENT ON COLUMN "public"."gstt_fact_chung_sessions"."bang_kiem_id" IS 'FK dm_bang_kiem — SSOT; loai_bang_kiem giữ mã/legacy cho RPC dashboard.';



COMMENT ON COLUMN "public"."gstt_fact_chung_sessions"."results_jsonb" IS 'Danh sách mảng kết quả chi tiết các tiêu chí dưới dạng JSONB (thay thế EAV)';



COMMENT ON COLUMN "public"."gstt_fact_chung_sessions"."dat_tron_goi" IS 'Slice 4 (reform v4): kết quả All-or-None cho care bundle (cach_tinh_diem=TRON_GOI). NULL khi bảng kiểm không phải bundle. TRUE chỉ khi mọi tiêu chí then chốt (`la_then_chot=true` hoặc tất cả) DAT.';



COMMENT ON COLUMN "public"."gstt_fact_chung_sessions"."du_lieu_nghi_van" IS 'Slice 4 (reform v4): Anti-Hawthorne flag — TRUE nếu phiên có dấu hiệu nghi ngờ (tốc độ quan sát >30/phút, hoặc thoi_gian_bat_dau = thoi_gian_ket_thuc). Dashboard Slice 7 cảnh báo nhưng KHÔNG loại trừ khỏi KPI (chính sách Just Culture defer v2).';



CREATE OR REPLACE VIEW "public"."fact_giam_sat_chung_sessions" WITH ("security_invoker"='true') AS
 SELECT "id",
    "khoa_id",
    "khu_vuc_id",
    "vi_tri",
    "nguoi_giam_sat_id",
    "is_giam_sat_ca_nhan",
    "nhan_vien_id",
    "nghe_nghiep_id",
    "ngay_giam_sat",
    "thoi_gian_ghi_nhan",
    "tong_diem",
    "ghi_chu_chung",
    "is_active",
    "created_at",
    "updated_at",
    "is_seen",
    "thoi_gian_bat_dau",
    "thoi_gian_ket_thuc",
    "hinh_thuc_id",
    "cach_thuc_id",
    "bang_kiem_id",
    "results_jsonb",
    "metadata"
   FROM "public"."gstt_fact_chung_sessions";


ALTER VIEW "public"."fact_giam_sat_chung_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gstt_fact_vst" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "nhan_vien_id" "uuid",
    "khoa_id" "uuid",
    "vi_tri" "text",
    "ngay_giam_sat" "date",
    "thoi_diem" "text",
    "hanh_dong" "text",
    "dung_ky_thuat" boolean,
    "du_thoi_gian" boolean,
    "co_deo_gang" boolean,
    "thoi_gian_ghi_nhan" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ghi_chu" "text",
    "khu_vuc_id" "uuid",
    "nghe_nghiep_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."gstt_fact_vst" OWNER TO "postgres";


COMMENT ON COLUMN "public"."gstt_fact_vst"."ghi_chu" IS 'Ghi chú phiếu quan sát (legacy / nhập tay).';



COMMENT ON COLUMN "public"."gstt_fact_vst"."khu_vuc_id" IS 'FK dm_khu_vuc_giam_sat — SSOT; cột khu_vuc (text) giữ nhãn legacy / denorm.';



COMMENT ON COLUMN "public"."gstt_fact_vst"."nghe_nghiep_id" IS 'FK dm_nghe_nghiep — SSOT; cột nghe_nghiep (text) giữ nhãn legacy / denorm.';



CREATE OR REPLACE VIEW "public"."fact_giam_sat_vst" WITH ("security_invoker"='true') AS
 SELECT "id",
    "session_id",
    "nhan_vien_id",
    "khoa_id",
    "vi_tri",
    "ngay_giam_sat",
    "thoi_diem",
    "hanh_dong",
    "dung_ky_thuat",
    "du_thoi_gian",
    "co_deo_gang",
    "thoi_gian_ghi_nhan",
    "created_at",
    "ghi_chu",
    "khu_vuc_id",
    "nghe_nghiep_id",
    "metadata"
   FROM "public"."gstt_fact_vst";


ALTER VIEW "public"."fact_giam_sat_vst" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gstt_fact_vst_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khoa_id" "uuid",
    "khu_vuc_id" "uuid",
    "vi_tri_cu_the" "text",
    "nguoi_giam_sat_id" "uuid",
    "thoi_gian_bat_dau" timestamp with time zone,
    "thoi_gian_ket_thuc" timestamp with time zone,
    "ngay_giam_sat" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_seen" boolean DEFAULT false NOT NULL,
    "hinh_thuc_id" "uuid",
    "cach_thuc_id" "uuid"
);


ALTER TABLE "public"."gstt_fact_vst_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."gstt_fact_vst_sessions" IS 'Phiên VST. Legacy hinh_thuc "Giám sát khách quan" đã map → dm Giám sát chuyên trách (20260716010).';



COMMENT ON COLUMN "public"."gstt_fact_vst_sessions"."is_seen" IS 'Người dùng đã mở xem/in phiên từ lịch sử.';



COMMENT ON COLUMN "public"."gstt_fact_vst_sessions"."hinh_thuc_id" IS 'FK dm_hinh_thuc_giam_sat — link chuẩn; hinh_thuc_giam_sat là nhãn đồng bộ.';



COMMENT ON COLUMN "public"."gstt_fact_vst_sessions"."cach_thuc_id" IS 'FK dm_cach_thuc_giam_sat — link chuẩn; cach_thuc_giam_sat là nhãn đồng bộ.';



CREATE OR REPLACE VIEW "public"."fact_giam_sat_vst_sessions" WITH ("security_invoker"='true') AS
 SELECT "id",
    "khoa_id",
    "khu_vuc_id",
    "vi_tri_cu_the",
    "nguoi_giam_sat_id",
    "thoi_gian_bat_dau",
    "thoi_gian_ket_thuc",
    "ngay_giam_sat",
    "created_at",
    "updated_at",
    "is_active",
    "is_seen",
    "hinh_thuc_id",
    "cach_thuc_id"
   FROM "public"."gstt_fact_vst_sessions";


ALTER VIEW "public"."fact_giam_sat_vst_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gstt_fact_gsc_dashboard_summary" (
    "session_id" "uuid" NOT NULL,
    "ngay_giam_sat" "date" NOT NULL,
    "bang_kiem_id" "uuid" NOT NULL,
    "khoa_id" "uuid",
    "khu_vuc_id" "uuid",
    "nghe_nghiep_id" "uuid",
    "stype" "text" NOT NULL,
    "nguoi_giam_sat_id" "uuid",
    "tong_phien" bigint DEFAULT 1 NOT NULL,
    "tong_quan_sat" bigint DEFAULT 0 NOT NULL,
    "tong_dat" bigint DEFAULT 0 NOT NULL,
    "tong_vi_pham" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gstt_fact_gsc_dashboard_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_gsc_dashboard_summary" WITH ("security_invoker"='true') AS
 SELECT "session_id",
    "ngay_giam_sat",
    "bang_kiem_id",
    "khoa_id",
    "khu_vuc_id",
    "nghe_nghiep_id",
    "stype",
    "nguoi_giam_sat_id",
    "tong_phien",
    "tong_quan_sat",
    "tong_dat",
    "tong_vi_pham",
    "created_at"
   FROM "public"."gstt_fact_gsc_dashboard_summary";


ALTER VIEW "public"."fact_gsc_dashboard_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gstt_fact_gsc_violations_summary" (
    "session_id" "uuid" NOT NULL,
    "criterion_id" "uuid" NOT NULL,
    "ngay_giam_sat" "date" NOT NULL,
    "bang_kiem_id" "uuid" NOT NULL,
    "khoa_id" "uuid",
    "khu_vuc_id" "uuid",
    "nghe_nghiep_id" "uuid",
    "stype" "text" NOT NULL,
    "nguoi_giam_sat_id" "uuid",
    "tong_quan_sat" bigint DEFAULT 0 NOT NULL,
    "tong_vi_pham" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gstt_fact_gsc_violations_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_gsc_violations_summary" WITH ("security_invoker"='true') AS
 SELECT "session_id",
    "criterion_id",
    "ngay_giam_sat",
    "bang_kiem_id",
    "khoa_id",
    "khu_vuc_id",
    "nghe_nghiep_id",
    "stype",
    "nguoi_giam_sat_id",
    "tong_quan_sat",
    "tong_vi_pham",
    "created_at"
   FROM "public"."gstt_fact_gsc_violations_summary";


ALTER VIEW "public"."fact_gsc_violations_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_kho_chi_tiet" WITH ("security_invoker"='true') AS
 SELECT "id",
    "giao_dich_id",
    "vat_tu_id",
    "so_luong",
    "han_su_dung",
    "created_at",
    "updated_at",
    "is_active",
    "anh_minh_chung",
    "ghi_chu",
    "quy_trinh_id"
   FROM "public"."cssd_fact_kho_chi_tiet";


ALTER VIEW "public"."fact_kho_chi_tiet" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_kho_dung_cu_giao_dich" WITH ("security_invoker"='true') AS
 SELECT "id",
    "loai_dung_cu_id",
    "bo_dung_cu_id",
    "quy_trinh_id",
    "loai_giao_dich",
    "so_luong_thay_doi",
    "ghi_chu",
    "nguoi_thuc_hien_id",
    "created_at",
    "is_active"
   FROM "public"."cssd_fact_kho_giao_dich";


ALTER VIEW "public"."fact_kho_dung_cu_giao_dich" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_kho_giao_dich" WITH ("security_invoker"='true') AS
 SELECT "id",
    "loai_dung_cu_id",
    "bo_dung_cu_id",
    "quy_trinh_id",
    "loai_giao_dich",
    "so_luong_thay_doi",
    "ghi_chu",
    "nguoi_thuc_hien_id",
    "created_at",
    "is_active"
   FROM "public"."cssd_fact_kho_giao_dich";


ALTER VIEW "public"."fact_kho_giao_dich" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_kho_hoa_chat_giao_dich" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_phieu",
    "dm_hoa_chat_id",
    "loai_giao_dich",
    "so_luong_co_dau",
    "ma_lo",
    "han_su_dung",
    "ghi_chu",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."cssd_fact_kho_hoa_chat_giao_dich";


ALTER VIEW "public"."fact_kho_hoa_chat_giao_dich" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_lo_tiet_khuan" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_lo_tiet_khuan",
    "thiet_bi_id",
    "thoi_gian_bat_dau",
    "thoi_gian_ket_thuc",
    "ket_qua_test",
    "nguoi_van_hanh_id",
    "created_at",
    "updated_at",
    "is_active",
    "nhiet_do",
    "ap_suat",
    "thoi_gian_chu_ky",
    "ghi_chu",
    "ket_qua_bi",
    "ket_qua_ci",
    "ghi_chu_qc",
    "tk_chot_nap_at",
    "tk_mo_form_qc_at",
    "tk_qc_json",
    "loai_may_id"
   FROM "public"."cssd_fact_lo_tiet_khuan";


ALTER VIEW "public"."fact_lo_tiet_khuan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nkbv_fact_benh_an" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_benh_an" "text" NOT NULL,
    "ma_benh_nhan" "text" NOT NULL,
    "ho_ten_benh_nhan" "text" NOT NULL,
    "ngay_sinh" "date",
    "gioi_tinh" "text",
    "ngay_vao_vien" timestamp with time zone,
    "ngay_ra_vien" timestamp with time zone,
    "ket_cuc_dieu_tri" "text",
    "ly_do_tu_vong" "text",
    "tu_vong_lien_quan_nkbv" boolean,
    "khoa_dieu_tri_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."nkbv_fact_benh_an" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_nkbv_benh_an" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_benh_an",
    "ma_benh_nhan",
    "ho_ten_benh_nhan",
    "ngay_sinh",
    "gioi_tinh",
    "ngay_vao_vien",
    "ngay_ra_vien",
    "ket_cuc_dieu_tri",
    "ly_do_tu_vong",
    "tu_vong_lien_quan_nkbv",
    "khoa_dieu_tri_id",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."nkbv_fact_benh_an";


ALTER VIEW "public"."fact_nkbv_benh_an" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nkbv_fact_mau_so_daily" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khoa_id" "uuid" NOT NULL,
    "ngay_ghi_nhan" "date" NOT NULL,
    "so_ngay_tho_may" integer DEFAULT 0 NOT NULL,
    "so_ngay_catheter_cvc" integer DEFAULT 0 NOT NULL,
    "so_ngay_sonde_tieu" integer DEFAULT 0 NOT NULL,
    "so_ngay_dieu_tri" integer DEFAULT 0 NOT NULL,
    "so_dot_tho_may_emv" integer DEFAULT 0 NOT NULL,
    "nguoi_bao_cao_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."nkbv_fact_mau_so_daily" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_nkbv_mau_so_daily" WITH ("security_invoker"='true') AS
 SELECT "id",
    "khoa_id",
    "ngay_ghi_nhan",
    "so_ngay_tho_may",
    "so_ngay_catheter_cvc",
    "so_ngay_sonde_tieu",
    "so_ngay_dieu_tri",
    "so_dot_tho_may_emv",
    "nguoi_bao_cao_id",
    "created_at",
    "updated_at",
    "metadata"
   FROM "public"."nkbv_fact_mau_so_daily";


ALTER VIEW "public"."fact_nkbv_mau_so_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nkbv_fact_mau_so_phau_thuat" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khoa_id" "uuid" NOT NULL,
    "ngay_phau_thuat" "date" NOT NULL,
    "ma_benh_nhan" "text" NOT NULL,
    "ho_ten_benh_nhan" "text" NOT NULL,
    "ten_phau_thuat" "text" NOT NULL,
    "loai_phau_thuat_nhsn" "text" NOT NULL,
    "phan_loai_vet_mo" "text" NOT NULL,
    "co_dat_implant" boolean DEFAULT false NOT NULL,
    "asa_score" integer,
    "thoi_gian_mo_phut" integer NOT NULL,
    "thoi_gian_nguong_nhsn" integer DEFAULT 120 NOT NULL,
    "is_laparoscopic" boolean DEFAULT false NOT NULL,
    "expected_ssi_prob" numeric(6,5) DEFAULT 0.01500 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "fact_nkbv_mau_so_phau_thuat_asa_score_check" CHECK ((("asa_score" >= 1) AND ("asa_score" <= 5))),
    CONSTRAINT "fact_nkbv_mau_so_phau_thuat_phan_loai_vet_mo_check" CHECK (("phan_loai_vet_mo" = ANY (ARRAY['SACH'::"text", 'SACH_NHIEM'::"text", 'NHIEM'::"text", 'BAN'::"text"])))
);


ALTER TABLE "public"."nkbv_fact_mau_so_phau_thuat" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_nkbv_mau_so_phau_thuat" WITH ("security_invoker"='true') AS
 SELECT "id",
    "khoa_id",
    "ngay_phau_thuat",
    "ma_benh_nhan",
    "ho_ten_benh_nhan",
    "ten_phau_thuat",
    "loai_phau_thuat_nhsn",
    "phan_loai_vet_mo",
    "co_dat_implant",
    "asa_score",
    "thoi_gian_mo_phut",
    "thoi_gian_nguong_nhsn",
    "is_laparoscopic",
    "expected_ssi_prob",
    "is_active",
    "created_at",
    "updated_at",
    "metadata"
   FROM "public"."nkbv_fact_mau_so_phau_thuat";


ALTER VIEW "public"."fact_nkbv_mau_so_phau_thuat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nkbv_fact_su_kien" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_ca" "text" NOT NULL,
    "khoa_ghi_nhan_id" "uuid",
    "ma_benh_nhan" "text" NOT NULL,
    "ho_ten_benh_nhan" "text" NOT NULL,
    "ngay_sinh" "date",
    "gioi_tinh" "text",
    "ngay_vao_vien" timestamp with time zone,
    "ngay_phat_hien" "date" NOT NULL,
    "vi_tri_nhiem_khuan" "text",
    "tac_nhan_vi_khuan" "text",
    "clinical_notes" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "vi_sinh_record_id" "uuid",
    "verification_data" "jsonb" DEFAULT '{}'::"jsonb",
    "loai_nkbv_id" "uuid" NOT NULL,
    "trang_thai_id" "uuid" NOT NULL,
    "nguoi_ghi_id" "uuid",
    "ma_benh_an" "text",
    "ma_benh_pham" "text",
    "loai_benh_pham" "text",
    "so_luong" "text"
);


ALTER TABLE "public"."nkbv_fact_su_kien" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_nkbv_su_kien" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_ca",
    "khoa_ghi_nhan_id",
    "ma_benh_nhan",
    "ho_ten_benh_nhan",
    "ngay_sinh",
    "gioi_tinh",
    "ngay_vao_vien",
    "ngay_phat_hien",
    "vi_tri_nhiem_khuan",
    "tac_nhan_vi_khuan",
    "clinical_notes",
    "is_active",
    "created_at",
    "updated_at",
    "vi_sinh_record_id",
    "verification_data",
    "loai_nkbv_id",
    "trang_thai_id",
    "nguoi_ghi_id",
    "ma_benh_an",
    "ma_benh_pham",
    "loai_benh_pham",
    "so_luong"
   FROM "public"."nkbv_fact_su_kien";


ALTER VIEW "public"."fact_nkbv_su_kien" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nkbv_fact_vi_sinh" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_benh_nhan" "text" NOT NULL,
    "ma_benh_an" "text" NOT NULL,
    "ma_benh_pham" "text",
    "ho_ten_benh_nhan" "text" NOT NULL,
    "ngay_sinh" "date",
    "gioi_tinh" "text",
    "ngay_vao_vien" timestamp with time zone,
    "ngay_lay_mau" timestamp with time zone NOT NULL,
    "khoa_yeu_cau_id" "uuid",
    "loai_benh_pham" "text" NOT NULL,
    "tac_nhan" "text" NOT NULL,
    "ket_qua_duong_tinh" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "so_luong" "text"
);


ALTER TABLE "public"."nkbv_fact_vi_sinh" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_nkbv_vi_sinh" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_benh_nhan",
    "ma_benh_an",
    "ma_benh_pham",
    "ho_ten_benh_nhan",
    "ngay_sinh",
    "gioi_tinh",
    "ngay_vao_vien",
    "ngay_lay_mau",
    "khoa_yeu_cau_id",
    "loai_benh_pham",
    "tac_nhan",
    "ket_qua_duong_tinh",
    "is_active",
    "metadata",
    "created_at",
    "updated_at",
    "so_luong"
   FROM "public"."nkbv_fact_vi_sinh";


ALTER VIEW "public"."fact_nkbv_vi_sinh" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qlcv_fact_danh_gia_thang" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nhan_su_id" "uuid" NOT NULL,
    "thang" "date" NOT NULL,
    "on_time_rate" numeric(6,2) DEFAULT 0 NOT NULL,
    "completion_rate" numeric(6,2) DEFAULT 0 NOT NULL,
    "quality_score" smallint,
    "final_score" numeric(6,2),
    "manager_comment" "text",
    "evaluated_by" "uuid",
    "evaluated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fact_qlcv_danh_gia_thang_quality_ck" CHECK ((("quality_score" IS NULL) OR (("quality_score" >= 1) AND ("quality_score" <= 5)))),
    CONSTRAINT "fact_qlcv_danh_gia_thang_thang_first_day" CHECK (("thang" = ("date_trunc"('month'::"text", ("thang")::timestamp with time zone))::"date"))
);


ALTER TABLE "public"."qlcv_fact_danh_gia_thang" OWNER TO "postgres";


COMMENT ON TABLE "public"."qlcv_fact_danh_gia_thang" IS 'Điểm đánh giá tháng QLCV (on_time_rate, completion_rate snapshot + chất lượng 1–5 + final_score).';



COMMENT ON COLUMN "public"."qlcv_fact_danh_gia_thang"."thang" IS 'Ngày đầu tháng (YYYY-MM-01).';



CREATE OR REPLACE VIEW "public"."fact_qlcv_danh_gia_thang" WITH ("security_invoker"='true') AS
 SELECT "id",
    "nhan_su_id",
    "thang",
    "on_time_rate",
    "completion_rate",
    "quality_score",
    "final_score",
    "manager_comment",
    "evaluated_by",
    "evaluated_at",
    "created_at",
    "updated_at"
   FROM "public"."qlcv_fact_danh_gia_thang";


ALTER VIEW "public"."fact_qlcv_danh_gia_thang" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_quy_trinh_thanh_phan" WITH ("security_invoker"='true') AS
 SELECT "id",
    "quy_trinh_id",
    "dm_bo_dung_cu_chi_tiet_id",
    "ten_dung_cu_le",
    "so_luong_ke_hoach",
    "so_luong_thuc_te",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."cssd_fact_quy_trinh_thanh_phan";


ALTER VIEW "public"."fact_quy_trinh_thanh_phan" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_su_co" WITH ("security_invoker"='true') AS
 SELECT "id",
    "quy_trinh_id",
    "ma_qr_quy_trinh",
    "ma_tram_phat_hien",
    "ma_tram_gay_loi",
    "mo_ta",
    "is_red_alert",
    "nguoi_bao_id",
    "nguoi_xac_nhan_id",
    "created_at",
    "is_active",
    "updated_at",
    "loai_su_co_id",
    "attributes"
   FROM "public"."cssd_fact_su_co";


ALTER VIEW "public"."fact_su_co" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gstt_fact_vst_moments_summary" (
    "opportunity_id" "uuid" NOT NULL,
    "moment_label" "text" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "ngay_giam_sat" "date" NOT NULL,
    "khoa_id" "uuid",
    "khu_vuc_id" "uuid",
    "nghe_nghiep_id" "uuid",
    "stype" "text" NOT NULL,
    "nguoi_giam_sat_id" "uuid",
    "is_tuan_thu" boolean NOT NULL,
    "co_deo_gang" boolean,
    "so_quan_sat" bigint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gstt_fact_vst_moments_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_vst_moments_summary" WITH ("security_invoker"='true') AS
 SELECT "opportunity_id",
    "moment_label",
    "session_id",
    "ngay_giam_sat",
    "khoa_id",
    "khu_vuc_id",
    "nghe_nghiep_id",
    "stype",
    "nguoi_giam_sat_id",
    "is_tuan_thu",
    "co_deo_gang",
    "so_quan_sat",
    "created_at"
   FROM "public"."gstt_fact_vst_moments_summary";


ALTER VIEW "public"."fact_vst_moments_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gstt_fact_vst_opportunities_summary" (
    "opportunity_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "ngay_giam_sat" "date" NOT NULL,
    "khoa_id" "uuid",
    "khu_vuc_id" "uuid",
    "nghe_nghiep_id" "uuid",
    "stype" "text" NOT NULL,
    "nguoi_giam_sat_id" "uuid",
    "is_tuan_thu" boolean NOT NULL,
    "dung_ky_thuat" boolean,
    "du_thoi_gian" boolean,
    "co_deo_gang" boolean,
    "so_co_hoi" bigint DEFAULT 1 NOT NULL,
    "da_tuan_thu" bigint DEFAULT 0 NOT NULL,
    "bo_sot" bigint DEFAULT 0 NOT NULL,
    "loi_ky_thuat" bigint DEFAULT 0 NOT NULL,
    "loi_thoi_gian" bigint DEFAULT 0 NOT NULL,
    "lam_dung_gang" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gstt_fact_vst_opportunities_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_vst_opportunities_summary" WITH ("security_invoker"='true') AS
 SELECT "opportunity_id",
    "session_id",
    "ngay_giam_sat",
    "khoa_id",
    "khu_vuc_id",
    "nghe_nghiep_id",
    "stype",
    "nguoi_giam_sat_id",
    "is_tuan_thu",
    "dung_ky_thuat",
    "du_thoi_gian",
    "co_deo_gang",
    "so_co_hoi",
    "da_tuan_thu",
    "bo_sot",
    "loi_ky_thuat",
    "loi_thoi_gian",
    "lam_dung_gang",
    "created_at"
   FROM "public"."gstt_fact_vst_opportunities_summary";


ALTER VIEW "public"."fact_vst_opportunities_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gstt_fact_vst_sessions_summary" (
    "session_id" "uuid" NOT NULL,
    "ngay_giam_sat" "date" NOT NULL,
    "khoa_id" "uuid",
    "khu_vuc_id" "uuid",
    "stype" "text" NOT NULL,
    "nguoi_giam_sat_id" "uuid",
    "tong_phien" bigint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gstt_fact_vst_sessions_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fact_vst_sessions_summary" WITH ("security_invoker"='true') AS
 SELECT "session_id",
    "ngay_giam_sat",
    "khoa_id",
    "khu_vuc_id",
    "stype",
    "nguoi_giam_sat_id",
    "tong_phien",
    "created_at"
   FROM "public"."gstt_fact_vst_sessions_summary";


ALTER VIEW "public"."fact_vst_sessions_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."gstt_dm_khu_vuc_giam_sat" WITH ("security_invoker"='true') AS
 SELECT "id",
    "code" AS "ma_khu_vuc",
    "name" AS "ten_khu_vuc",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."sys_lookup_value"
  WHERE ("category_type" = 'KHU_VUC_GIAM_SAT'::"text");


ALTER VIEW "public"."gstt_dm_khu_vuc_giam_sat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sys_mdm_registry" (
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

ALTER TABLE ONLY "public"."sys_mdm_registry" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."sys_mdm_registry" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mdm_field_registry" WITH ("security_invoker"='true') AS
 SELECT "id",
    "table_name",
    "column_name",
    "field_role",
    "source_table",
    "source_column",
    "source_loai_danh_muc",
    "owner_module",
    "suggestion_policy",
    "is_required",
    "is_active",
    "notes",
    "created_at",
    "updated_at"
   FROM "public"."sys_mdm_registry";


ALTER VIEW "public"."mdm_field_registry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sys_mdm_suggestion" (
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

ALTER TABLE ONLY "public"."sys_mdm_suggestion" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."sys_mdm_suggestion" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mdm_governance_suggestion" WITH ("security_invoker"='true') AS
 SELECT "id",
    "table_name",
    "column_name",
    "suggestion_type",
    "confidence",
    "reason",
    "proposed_field_role",
    "proposed_source_table",
    "proposed_source_loai_danh_muc",
    "status",
    "created_at",
    "updated_at"
   FROM "public"."sys_mdm_suggestion";


ALTER VIEW "public"."mdm_governance_suggestion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mdm_nhan_su" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ho_ten" "text",
    "ma_nv" "text",
    "khoa_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "to_id" "uuid",
    "extra_data" "jsonb" DEFAULT '{}'::"jsonb",
    "chuc_vu_id" "uuid",
    "chuc_danh_id" "uuid",
    "vai_tro_he_thong_id" "uuid",
    "auth_user_id" "uuid",
    "nghe_nghiep_id" "uuid"
);

ALTER TABLE ONLY "public"."mdm_nhan_su" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."mdm_nhan_su" OWNER TO "postgres";


COMMENT ON COLUMN "public"."mdm_nhan_su"."auth_user_id" IS 'Tài khoản đăng nhập gắn với hồ sơ (nếu có). Nhân sự chỉ danh bạ để chọn trong form: để null.';



CREATE TABLE IF NOT EXISTS "public"."sys_role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."sys_role_permissions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."sys_role_permissions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."rel_role_permissions" WITH ("security_invoker"='true') AS
 SELECT "id",
    "role_id",
    "permission_id",
    "created_at"
   FROM "public"."sys_role_permissions";


ALTER VIEW "public"."rel_role_permissions" OWNER TO "postgres";


COMMENT ON VIEW "public"."rel_role_permissions" IS 'Compat view 1-tầng → sys_role_permissions. Flatten 26/05/2026.';



CREATE TABLE IF NOT EXISTS "public"."sys_user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."sys_user_roles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."sys_user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."rel_user_roles" WITH ("security_invoker"='true') AS
 SELECT "id",
    "user_id",
    "role_id",
    "created_at"
   FROM "public"."sys_user_roles";


ALTER VIEW "public"."rel_user_roles" OWNER TO "postgres";


COMMENT ON VIEW "public"."rel_user_roles" IS 'Compat view 1-tầng → sys_user_roles. Flatten 26/05/2026.';



CREATE TABLE IF NOT EXISTS "public"."sys_module_locks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "locked_until_date" "date" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sys_module_locks_module_name_check" CHECK (("module_name" = ANY (ARRAY['VST'::"text", 'GSC'::"text"])))
);


ALTER TABLE "public"."sys_module_locks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_sys_user_permissions" WITH ("security_invoker"='true') AS
 WITH "user_perms" AS (
         SELECT "ur"."user_id",
            "jsonb_agg"(DISTINCT "r"."name") AS "roles",
            "jsonb_agg"(DISTINCT "jsonb_build_object"('module', "p"."module_name", 'action', "p"."action")) AS "permissions"
           FROM ((("public"."sys_user_roles" "ur"
             JOIN "public"."sys_roles" "r" ON (("ur"."role_id" = "r"."id")))
             LEFT JOIN "public"."sys_role_permissions" "rp" ON (("r"."id" = "rp"."role_id")))
             LEFT JOIN "public"."sys_permissions" "p" ON (("rp"."permission_id" = "p"."id")))
          GROUP BY "ur"."user_id"
        )
 SELECT "ns"."id" AS "staff_id",
    "ns"."auth_user_id",
    "ns"."ho_ten",
    "ns"."ma_nv",
    ("ns"."extra_data" ->> 'email'::"text") AS "email",
    "ns"."khoa_id",
    "ns"."is_active",
    "k"."ten_khoa" AS "ten_khoa_phong",
    "k"."ma_khoa" AS "ma_khoa_phong",
    COALESCE("up"."roles", '[]'::"jsonb") AS "roles",
    COALESCE("up"."permissions", '[]'::"jsonb") AS "permissions"
   FROM (("public"."mdm_nhan_su" "ns"
     LEFT JOIN "public"."mdm_dm_khoa_phong" "k" ON (("ns"."khoa_id" = "k"."id")))
     LEFT JOIN "user_perms" "up" ON (("ns"."auth_user_id" = "up"."user_id")));


ALTER VIEW "public"."v_sys_user_permissions" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_sys_user_permissions" IS 'Aggregate RBAC: nhân sự + khoa + roles + permissions. Re-pointed sys_* 26/05/2026.';



CREATE OR REPLACE VIEW "public"."v_auth_user_permissions" WITH ("security_invoker"='true') AS
 SELECT "staff_id",
    "auth_user_id",
    "ho_ten",
    "ma_nv",
    "email",
    "khoa_id",
    "is_active",
    "ten_khoa_phong",
    "ma_khoa_phong",
    "roles",
    "permissions"
   FROM "public"."v_sys_user_permissions";


ALTER VIEW "public"."v_auth_user_permissions" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_auth_user_permissions" IS '[compat alias 26/05/2026] -> v_sys_user_permissions. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_qlcv_cong_viec_full" WITH ("security_invoker"='true') AS
 SELECT "cv"."id",
    "cv"."cong_viec_cha_id",
    "cv"."tieu_de",
    "cv"."mo_ta",
    "cv"."loai_cong_viec_id",
    "lc"."ma" AS "loai_cong_viec",
    "lc"."ten" AS "ten_loai_cong_viec",
    "cv"."trang_thai_id",
    "ts"."ma" AS "trang_thai",
    "ts"."ten" AS "ten_trang_thai_hien_thi",
    "cv"."muc_do_uu_tien",
    "cv"."han_hoan_thanh",
    "cv"."phan_tram_hoan_thanh",
    "cv"."nguoi_tao_id",
    "cv"."nguoi_giao_viec_id",
    "cv"."nguoi_phu_trach_id",
    "cv"."khoa_thuc_hien_id",
    "cv"."to_cong_tac_id",
    "cv"."dinh_ky_mau_id",
    "cv"."is_active",
    "cv"."created_at",
    "cv"."updated_at",
    "ns_tao"."ho_ten" AS "nguoi_tao_ten",
    "ns_phu"."ho_ten" AS "nguoi_phu_trach_ten",
    "ns_giao"."ho_ten" AS "nguoi_giao_ten",
    "k"."ten_khoa" AS "khoa_thuc_hien_ten",
    "t"."ten_to" AS "to_cong_tac_ten",
    (("cv"."han_hoan_thanh" IS NOT NULL) AND ("cv"."han_hoan_thanh" < CURRENT_DATE) AND (COALESCE("ts"."ma", ''::"text") <> ALL (ARRAY['HOAN_THANH'::"text", 'DA_HUY'::"text"]))) AS "is_qua_han",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."qlcv_fact_cong_viec" "sub"
          WHERE (("sub"."cong_viec_cha_id" = "cv"."id") AND ("sub"."is_active" = true))) AS "cong_viec_con_count"
   FROM ((((((("public"."qlcv_fact_cong_viec" "cv"
     LEFT JOIN "public"."qlcv_dm_loai_cong_viec" "lc" ON (("lc"."id" = "cv"."loai_cong_viec_id")))
     LEFT JOIN "public"."qlcv_dm_trang_thai_cong_viec" "ts" ON (("ts"."id" = "cv"."trang_thai_id")))
     LEFT JOIN "public"."mdm_nhan_su" "ns_tao" ON (("cv"."nguoi_tao_id" = "ns_tao"."id")))
     LEFT JOIN "public"."mdm_nhan_su" "ns_phu" ON (("cv"."nguoi_phu_trach_id" = "ns_phu"."id")))
     LEFT JOIN "public"."mdm_nhan_su" "ns_giao" ON (("cv"."nguoi_giao_viec_id" = "ns_giao"."id")))
     LEFT JOIN "public"."mdm_dm_khoa_phong" "k" ON (("cv"."khoa_thuc_hien_id" = "k"."id")))
     LEFT JOIN "public"."dm_to_cong_tac" "t" ON (("cv"."to_cong_tac_id" = "t"."id")));


ALTER VIEW "public"."v_qlcv_cong_viec_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_qlcv_cong_viec_qua_han" WITH ("security_invoker"='true') AS
 SELECT "id",
    "cong_viec_cha_id",
    "tieu_de",
    "mo_ta",
    "loai_cong_viec_id",
    "loai_cong_viec",
    "ten_loai_cong_viec",
    "trang_thai_id",
    "trang_thai",
    "ten_trang_thai_hien_thi",
    "muc_do_uu_tien",
    "han_hoan_thanh",
    "phan_tram_hoan_thanh",
    "nguoi_tao_id",
    "nguoi_giao_viec_id",
    "nguoi_phu_trach_id",
    "khoa_thuc_hien_id",
    "to_cong_tac_id",
    "dinh_ky_mau_id",
    "is_active",
    "created_at",
    "updated_at",
    "nguoi_tao_ten",
    "nguoi_phu_trach_ten",
    "nguoi_giao_ten",
    "khoa_thuc_hien_ten",
    "to_cong_tac_ten",
    "is_qua_han",
    "cong_viec_con_count"
   FROM "public"."v_qlcv_cong_viec_full"
  WHERE ("is_qua_han" = true);


ALTER VIEW "public"."v_qlcv_cong_viec_qua_han" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cong_viec_qua_han" WITH ("security_invoker"='true') AS
 SELECT "id",
    "cong_viec_cha_id",
    "tieu_de",
    "mo_ta",
    "loai_cong_viec_id",
    "loai_cong_viec",
    "ten_loai_cong_viec",
    "trang_thai_id",
    "trang_thai",
    "ten_trang_thai_hien_thi",
    "muc_do_uu_tien",
    "han_hoan_thanh",
    "phan_tram_hoan_thanh",
    "nguoi_tao_id",
    "nguoi_giao_viec_id",
    "nguoi_phu_trach_id",
    "khoa_thuc_hien_id",
    "to_cong_tac_id",
    "dinh_ky_mau_id",
    "is_active",
    "created_at",
    "updated_at",
    "nguoi_tao_ten",
    "nguoi_phu_trach_ten",
    "nguoi_giao_ten",
    "khoa_thuc_hien_ten",
    "to_cong_tac_ten",
    "is_qua_han",
    "cong_viec_con_count"
   FROM "public"."v_qlcv_cong_viec_qua_han";


ALTER VIEW "public"."v_cong_viec_qua_han" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_cong_viec_qua_han" IS '[compat alias 26/05/2026] -> v_qlcv_cong_viec_qua_han. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_cssd_bo_dung_cu_bien_dong" AS
 SELECT "bo_dung_cu_id",
    "loai_dung_cu_id",
    (COALESCE("sum"("so_luong_thay_doi"), (0)::bigint))::integer AS "so_luong_bien_dong"
   FROM "public"."cssd_fact_kho_giao_dich"
  WHERE (("is_active" = true) AND ("bo_dung_cu_id" IS NOT NULL))
  GROUP BY "bo_dung_cu_id", "loai_dung_cu_id";


ALTER VIEW "public"."v_cssd_bo_dung_cu_bien_dong" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_bo_dung_cu_chi_tiet_full" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."bo_dung_cu_id",
    "b"."ma_bo",
    "b"."ten_bo",
    "c"."loai_dung_cu_id",
    "l"."ma_loai" AS "ma_loai_dung_cu",
    "l"."ten_loai" AS "ten_loai_dung_cu",
    ("c"."specs" ->> 'ma_chi_tiet'::"text") AS "ma_chi_tiet",
    "c"."ten_chi_tiet",
    "c"."ten_dung_cu_le",
    "c"."so_luong",
    ("c"."specs" ->> 'ma_qr_mau'::"text") AS "ma_qr_mau",
    (("c"."specs" ->> 'co_ma_khac'::"text"))::boolean AS "co_ma_khac",
    ("c"."specs" ->> 'ma_khac'::"text") AS "ma_khac",
    "c"."is_active",
    "c"."ghi_chu",
    "c"."created_at",
    "c"."updated_at",
    "c"."specs"
   FROM (("public"."cssd_dm_bo_dung_cu_chi_tiet" "c"
     LEFT JOIN "public"."cssd_dm_bo_dung_cu" "b" ON (("b"."id" = "c"."bo_dung_cu_id")))
     LEFT JOIN "public"."cssd_dm_loai_dung_cu" "l" ON (("l"."id" = "c"."loai_dung_cu_id")));


ALTER VIEW "public"."v_cssd_bo_dung_cu_chi_tiet_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_bo_dung_cu_chi_tiet_realtime" AS
 SELECT "c"."id" AS "chi_tiet_id",
    "c"."bo_dung_cu_id",
    "b"."ma_bo",
    "b"."ten_bo",
    "c"."loai_dung_cu_id",
    "l"."ma_loai" AS "ma_loai_dung_cu",
    "l"."ten_loai" AS "ten_loai_dung_cu",
    "l"."is_chiu_nhiet",
    "l"."phan_loai_spaulding",
    "l"."phuong_phap_tiet_khuan_chi_dinh" AS "phuong_phap_tiet_khuan",
    "c"."so_luong" AS "so_luong_tieu_chuan",
    ("c"."so_luong" + COALESCE("v"."so_luong_bien_dong", 0)) AS "so_luong_thuc_te",
        CASE
            WHEN (("c"."so_luong" + COALESCE("v"."so_luong_bien_dong", 0)) < "c"."so_luong") THEN true
            ELSE false
        END AS "is_missing",
        CASE
            WHEN (("c"."so_luong" + COALESCE("v"."so_luong_bien_dong", 0)) < "c"."so_luong") THEN ("c"."so_luong" - ("c"."so_luong" + COALESCE("v"."so_luong_bien_dong", 0)))
            ELSE 0
        END AS "missing_count",
    "c"."is_active",
    "c"."ghi_chu"
   FROM ((("public"."cssd_dm_bo_dung_cu_chi_tiet" "c"
     JOIN "public"."cssd_dm_bo_dung_cu" "b" ON (("b"."id" = "c"."bo_dung_cu_id")))
     JOIN "public"."cssd_dm_loai_dung_cu" "l" ON (("l"."id" = "c"."loai_dung_cu_id")))
     LEFT JOIN "public"."v_cssd_bo_dung_cu_bien_dong" "v" ON ((("v"."bo_dung_cu_id" = "c"."bo_dung_cu_id") AND ("v"."loai_dung_cu_id" = "c"."loai_dung_cu_id"))));


ALTER VIEW "public"."v_cssd_bo_dung_cu_chi_tiet_realtime" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_bo_dung_cu_full" WITH ("security_invoker"='true') AS
 SELECT "b"."id",
    "b"."ma_bo",
    "b"."ten_bo",
    "b"."loai_dung_cu_id",
    "l"."ma_loai" AS "ma_loai_dung_cu",
    "l"."ten_loai" AS "ten_loai_dung_cu",
    "b"."khoa_su_dung_id",
    "k"."ma_khoa" AS "ma_khoa_su_dung",
    "k"."ten_khoa" AS "ten_khoa_su_dung",
    "b"."trang_thai",
    "b"."quy_cach",
    "b"."ghi_chu",
    "b"."ngay_kiem_ke_gan_nhat",
    "b"."is_active",
    "b"."created_at",
    "b"."updated_at"
   FROM (("public"."cssd_dm_bo_dung_cu" "b"
     LEFT JOIN "public"."cssd_dm_loai_dung_cu" "l" ON (("l"."id" = "b"."loai_dung_cu_id")))
     LEFT JOIN "public"."mdm_dm_khoa_phong" "k" ON (("k"."id" = "b"."khoa_su_dung_id")));


ALTER VIEW "public"."v_cssd_bo_dung_cu_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_bo_dung_cu_summary" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::character varying(50) AS "ma_bo",
    NULL::"text" AS "ten_bo",
    NULL::"uuid" AS "loai_dung_cu_id",
    NULL::"uuid" AS "khoa_su_dung_id",
    NULL::character varying(50) AS "trang_thai",
    NULL::"text" AS "quy_cach",
    NULL::"text" AS "ghi_chu",
    NULL::timestamp with time zone AS "ngay_kiem_ke_gan_nhat",
    NULL::boolean AS "is_active",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::integer AS "so_luong_bo",
    NULL::integer AS "so_khoan",
    NULL::integer AS "tong_so_luong_dung_cu",
    NULL::integer AS "tong_phan_bo";


ALTER VIEW "public"."v_cssd_bo_dung_cu_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_hoa_chat_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_hoa_chat",
    "ten_hoa_chat",
    "loai_hoa_chat",
    "don_vi_tinh",
    ("specs" ->> 'quy_cach'::"text") AS "quy_cach",
    ("specs" ->> 'nong_do'::"text") AS "nong_do",
    "han_su_dung",
    ("specs" ->> 'ghi_chu'::"text") AS "ghi_chu",
    "nguong_ton_toi_thieu",
    "is_active",
    "created_at",
    "updated_at",
    "specs"
   FROM "public"."cssd_dm_hoa_chat";


ALTER VIEW "public"."v_cssd_hoa_chat_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_kho_hoa_chat_ton_lo" WITH ("security_invoker"='true') AS
 SELECT "dm_hoa_chat_id",
    "ma_lo",
    "han_su_dung",
    "sum"("so_luong_co_dau") AS "ton_so_luong"
   FROM "public"."cssd_fact_kho_hoa_chat_giao_dich" "g"
  WHERE (COALESCE("is_active", true) = true)
  GROUP BY "dm_hoa_chat_id", "ma_lo", "han_su_dung";


ALTER VIEW "public"."v_cssd_kho_hoa_chat_ton_lo" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_cssd_kho_hoa_chat_ton_lo" IS 'Tồn theo lô = SUM(so_luong_co_dau) nhóm theo dm_hoa_chat_id + ma_lo + han_su_dung.';



CREATE OR REPLACE VIEW "public"."v_cssd_kho_le_realtime_qty" AS
SELECT
    NULL::"uuid" AS "loai_dung_cu_id",
    NULL::character varying(50) AS "ma_loai",
    NULL::"text" AS "ten_loai",
    NULL::boolean AS "is_chiu_nhiet",
    NULL::"text" AS "phan_loai_spaulding",
    NULL::"text" AS "phuong_phap_tiet_khuan",
    NULL::integer AS "so_luong_thuc_te";


ALTER VIEW "public"."v_cssd_kho_le_realtime_qty" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_lo_tiet_khuan_full" WITH ("security_invoker"='true') AS
 SELECT "lot"."id",
    "lot"."ma_lo_tiet_khuan",
    "lot"."thiet_bi_id",
    "tb"."ten_thiet_bi",
    "lot"."loai_may_id",
    "lm"."code" AS "ma_loai_may",
    "lm"."name" AS "ten_loai_tiet_khuan",
        CASE
            WHEN ("lot"."ket_qua_test" IS TRUE) THEN 'HOAN_THANH'::"text"
            WHEN ("lot"."ket_qua_test" IS FALSE) THEN 'QC_KHONG_DAT'::"text"
            WHEN ("lot"."tk_mo_form_qc_at" IS NOT NULL) THEN 'CHO_DANH_GIA_QC'::"text"
            WHEN ("lot"."tk_chot_nap_at" IS NOT NULL) THEN 'DANG_TIET_KHUAN'::"text"
            ELSE 'DANG_CHUAN_NAP'::"text"
        END AS "trang_thai",
    "lot"."tk_chot_nap_at",
    "lot"."tk_mo_form_qc_at",
    "lot"."tk_qc_json",
    "lot"."ket_qua_test",
    "lot"."is_active",
    "lot"."created_at",
    "lot"."updated_at"
   FROM (("public"."cssd_fact_lo_tiet_khuan" "lot"
     LEFT JOIN "public"."cssd_dm_thiet_bi" "tb" ON (("tb"."id" = "lot"."thiet_bi_id")))
     LEFT JOIN "public"."sys_lookup_value" "lm" ON ((("lm"."id" = "lot"."loai_may_id") AND ("lm"."category_type" = 'LOAI_MAY_TIET_KHUAN'::"text"))));


ALTER VIEW "public"."v_cssd_lo_tiet_khuan_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_loai_dung_cu_summary" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::character varying(50) AS "ma_loai",
    NULL::"text" AS "ten_loai",
    NULL::"text" AS "mo_ta",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::boolean AS "is_active",
    NULL::"text" AS "ma_loai_dung_cu",
    NULL::"text" AS "ten_loai_dung_cu",
    NULL::"text" AS "hinh_dang",
    NULL::"text" AS "kich_thuoc",
    NULL::"text" AS "cong_dung",
    NULL::boolean AS "is_chiu_nhiet",
    NULL::"text" AS "phuong_phap_tiet_khuan",
    NULL::"text" AS "phan_loai_spaulding",
    NULL::integer AS "so_ngay_han_dung",
    NULL::"text" AS "phan_loai",
    NULL::integer AS "so_luong_kho_du_phong",
    NULL::integer AS "so_luong_tong",
    NULL::"jsonb" AS "bo_dung_cu_chua";


ALTER VIEW "public"."v_cssd_loai_dung_cu_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_quy_trinh_full" WITH ("security_invoker"='true') AS
 SELECT "q"."id",
    "q"."ma_qr_quy_trinh",
    "q"."bo_dung_cu_id",
    "q"."tram_hien_tai_id",
    "t"."ma_tram" AS "ma_trang_thai_hien_tai",
    "t"."ten_tram" AS "ten_tram_hien_tai",
    "q"."nguoi_dang_giu_id",
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
    "q"."is_dong_bang",
    "q"."quy_trinh_cha_id",
    "q"."ma_vai_tro_bo",
    ("q"."metadata" ->> 'ma_ca_mo_id'::"text") AS "ma_ca_mo_id",
    "q"."ngay_het_han",
    "q"."is_active",
    "b"."ten_bo",
    "b"."ma_bo",
    "k"."ten_khoa",
    "l"."ten_loai" AS "ten_loai_dung_cu",
    "q"."created_at",
    "q"."updated_at"
   FROM (((("public"."cssd_fact_quy_trinh" "q"
     LEFT JOIN "public"."cssd_dm_tram" "t" ON (("t"."id" = "q"."tram_hien_tai_id")))
     LEFT JOIN "public"."cssd_dm_bo_dung_cu" "b" ON (("q"."bo_dung_cu_id" = "b"."id")))
     LEFT JOIN "public"."mdm_dm_khoa_phong" "k" ON (("b"."khoa_su_dung_id" = "k"."id")))
     LEFT JOIN "public"."cssd_dm_loai_dung_cu" "l" ON (("b"."loai_dung_cu_id" = "l"."id")));


ALTER VIEW "public"."v_cssd_quy_trinh_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_su_co_full" WITH ("security_invoker"='true') AS
 SELECT "sc"."id",
    "sc"."quy_trinh_id",
    "sc"."ma_qr_quy_trinh",
    "sc"."ma_tram_phat_hien",
    "sc"."loai_su_co_id",
    "ls"."name" AS "ten_loai_su_co",
    ("sc"."attributes" ->> 'incident_group'::"text") AS "incident_group",
    ("sc"."attributes" ->> 'incident_type_label'::"text") AS "incident_type_label",
    COALESCE(NULLIF("concat"(("sc"."attributes" ->> 'incident_group'::"text"), ':', ("sc"."attributes" ->> 'incident_type_label'::"text")), ':'::"text"), "ls"."code") AS "ma_loai_su_co",
    "sc"."mo_ta",
    "sc"."is_red_alert",
    "sc"."ma_tram_gay_loi",
    "sc"."created_at",
    "sc"."attributes"
   FROM ("public"."cssd_fact_su_co" "sc"
     LEFT JOIN "public"."sys_lookup_value" "ls" ON ((("ls"."id" = "sc"."loai_su_co_id") AND ("ls"."category_type" = 'LOAI_SU_CO'::"text"))));


ALTER VIEW "public"."v_cssd_su_co_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cssd_thiet_bi_full" WITH ("security_invoker"='true') AS
 SELECT "tb"."id",
    "tb"."ma_thiet_bi",
    "tb"."ten_thiet_bi",
    "tb"."loai_may_id",
    "lm"."ma_loai_may",
    "lm"."ten_loai_may" AS "ten_loai_may_hien_thi",
    "lm"."ma_loai_may" AS "loai_thiet_bi",
    "tb"."trang_thai",
    ("tb"."specs" ->> 'hang_san_xuat'::"text") AS "hang_san_xuat",
    (("tb"."specs" ->> 'nam_san_xuat'::"text"))::integer AS "nam_san_xuat",
    "tb"."ngay_dua_vao_su_dung",
    "tb"."chu_ky_bao_tri_ngay",
    "tb"."ngay_bao_tri_gan_nhat",
    "tb"."ngay_bao_tri_tiep_theo",
    ("tb"."specs" ->> 'ghi_chu'::"text") AS "ghi_chu",
    "tb"."specs",
    "tb"."is_active",
    "tb"."created_at",
    "tb"."updated_at"
   FROM ("public"."cssd_dm_thiet_bi" "tb"
     LEFT JOIN "public"."cssd_dm_loai_may" "lm" ON (("lm"."id" = "tb"."loai_may_id")));


ALTER VIEW "public"."v_cssd_thiet_bi_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_gstt_bang_kiem_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_bk",
    "ten_bang_kiem",
    "nhom_chuyen_de",
    "mo_ta",
    "loai_hinh_giam_sat",
    "is_active",
    "is_system",
    "created_at",
    "updated_at"
   FROM "public"."gstt_dm_bang_kiem";


ALTER VIEW "public"."v_gstt_bang_kiem_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_dm_bang_kiem_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_bk",
    "ten_bang_kiem",
    "nhom_chuyen_de",
    "mo_ta",
    "loai_hinh_giam_sat",
    "is_active",
    "is_system",
    "created_at",
    "updated_at"
   FROM "public"."v_gstt_bang_kiem_full";


ALTER VIEW "public"."v_dm_bang_kiem_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_dm_bang_kiem_full" IS '[compat alias 26/05/2026] -> v_gstt_bang_kiem_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_dm_bo_dung_cu_chi_tiet_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "bo_dung_cu_id",
    "ma_bo",
    "ten_bo",
    "loai_dung_cu_id",
    "ma_loai_dung_cu",
    "ten_loai_dung_cu",
    "ma_chi_tiet",
    "ten_chi_tiet",
    "ten_dung_cu_le",
    "so_luong",
    "ma_qr_mau",
    "co_ma_khac",
    "ma_khac",
    "is_active",
    "ghi_chu",
    "created_at",
    "updated_at",
    "specs"
   FROM "public"."v_cssd_bo_dung_cu_chi_tiet_full";


ALTER VIEW "public"."v_dm_bo_dung_cu_chi_tiet_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_dm_bo_dung_cu_chi_tiet_full" IS '[compat alias 26/05/2026] -> v_cssd_bo_dung_cu_chi_tiet_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_dm_bo_dung_cu_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_bo",
    "ten_bo",
    "loai_dung_cu_id",
    "ma_loai_dung_cu",
    "ten_loai_dung_cu",
    "khoa_su_dung_id",
    "ma_khoa_su_dung",
    "ten_khoa_su_dung",
    "trang_thai",
    "quy_cach",
    "ghi_chu",
    "ngay_kiem_ke_gan_nhat",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."v_cssd_bo_dung_cu_full";


ALTER VIEW "public"."v_dm_bo_dung_cu_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_dm_bo_dung_cu_full" IS '[compat alias 26/05/2026] -> v_cssd_bo_dung_cu_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_dm_bo_dung_cu_summary" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_bo",
    "ten_bo",
    "loai_dung_cu_id",
    "khoa_su_dung_id",
    "trang_thai",
    "quy_cach",
    "ghi_chu",
    "ngay_kiem_ke_gan_nhat",
    "is_active",
    "created_at",
    "updated_at",
    "so_luong_bo",
    "so_khoan",
    "tong_so_luong_dung_cu",
    "tong_phan_bo"
   FROM "public"."v_cssd_bo_dung_cu_summary";


ALTER VIEW "public"."v_dm_bo_dung_cu_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_dm_bo_dung_cu_summary" IS '[compat alias 26/05/2026] -> v_cssd_bo_dung_cu_summary. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_dm_hoa_chat_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_hoa_chat",
    "ten_hoa_chat",
    "loai_hoa_chat",
    "don_vi_tinh",
    "quy_cach",
    "nong_do",
    "han_su_dung",
    "ghi_chu",
    "nguong_ton_toi_thieu",
    "is_active",
    "created_at",
    "updated_at",
    "specs"
   FROM "public"."v_cssd_hoa_chat_full";


ALTER VIEW "public"."v_dm_hoa_chat_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_dm_hoa_chat_full" IS '[compat alias 26/05/2026] -> v_cssd_hoa_chat_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_mdm_khoa_phong_full" WITH ("security_invoker"='true') AS
 SELECT "kp"."id",
    "kp"."ma_khoa",
    "kp"."ten_khoa",
    "kp"."khoi_id",
    "kk"."ma_khoi",
    "kk"."ten_khoi",
    ("kp"."specs" ->> 'mo_ta_chuc_nang'::"text") AS "mo_ta_chuc_nang",
    (("kp"."specs" ->> 'so_bac_si'::"text"))::integer AS "so_bac_si",
    (("kp"."specs" ->> 'so_dieu_duong'::"text"))::integer AS "so_dieu_duong",
    (("kp"."specs" ->> 'so_giuong_benh_thuong'::"text"))::integer AS "so_giuong_benh_thuong",
    (("kp"."specs" ->> 'so_giuong_cap_cuu'::"text"))::integer AS "so_giuong_cap_cuu",
    "kp"."is_active",
    "kp"."created_at",
    "kp"."updated_at",
    "kp"."specs"
   FROM ("public"."mdm_dm_khoa_phong" "kp"
     LEFT JOIN "public"."mdm_dm_khoi_khoa" "kk" ON (("kk"."id" = "kp"."khoi_id")));


ALTER VIEW "public"."v_mdm_khoa_phong_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_dm_khoa_phong_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_khoa",
    "ten_khoa",
    "khoi_id",
    "ma_khoi",
    "ten_khoi",
    "mo_ta_chuc_nang",
    "so_bac_si",
    "so_dieu_duong",
    "so_giuong_benh_thuong",
    "so_giuong_cap_cuu",
    "is_active",
    "created_at",
    "updated_at",
    "specs"
   FROM "public"."v_mdm_khoa_phong_full";


ALTER VIEW "public"."v_dm_khoa_phong_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_dm_khoa_phong_full" IS '[compat alias 26/05/2026] -> v_mdm_khoa_phong_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_dm_loai_dung_cu_summary" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_loai",
    "ten_loai",
    "mo_ta",
    "created_at",
    "updated_at",
    "is_active",
    "ma_loai_dung_cu",
    "ten_loai_dung_cu",
    "hinh_dang",
    "kich_thuoc",
    "cong_dung",
    "is_chiu_nhiet",
    "phuong_phap_tiet_khuan",
    "phan_loai_spaulding",
    "so_ngay_han_dung",
    "phan_loai",
    "so_luong_kho_du_phong",
    "so_luong_tong",
    "bo_dung_cu_chua"
   FROM "public"."v_cssd_loai_dung_cu_summary";


ALTER VIEW "public"."v_dm_loai_dung_cu_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_dm_loai_dung_cu_summary" IS '[compat alias 26/05/2026] -> v_cssd_loai_dung_cu_summary. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_dm_thiet_bi_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_thiet_bi",
    "ten_thiet_bi",
    "loai_may_id",
    "ma_loai_may",
    "ten_loai_may_hien_thi",
    "loai_thiet_bi",
    "trang_thai",
    "hang_san_xuat",
    "nam_san_xuat",
    "ngay_dua_vao_su_dung",
    "chu_ky_bao_tri_ngay",
    "ngay_bao_tri_gan_nhat",
    "ngay_bao_tri_tiep_theo",
    "ghi_chu",
    "specs",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."v_cssd_thiet_bi_full";


ALTER VIEW "public"."v_dm_thiet_bi_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_dm_thiet_bi_full" IS '[compat alias 26/05/2026] -> v_cssd_thiet_bi_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_dm_tieu_chi_bang_kiem_full" WITH ("security_invoker"='true') AS
 SELECT "tc"."id",
    "tc"."bang_kiem_id",
    "bk"."ma_bk" AS "ma_bang_kiem",
    "bk"."ten_bang_kiem",
    "tc"."noi_dung",
    "tc"."stt",
    "tc"."diem_toi_da",
    "tc"."is_active",
    "tc"."created_at",
    "tc"."updated_at",
    "tc"."phan_muc",
    "tc"."kieu_du_lieu",
    "tc"."la_then_chot",
    "tc"."cho_phep_kpa",
    "tc"."cac_lua_chon",
    "tc"."ma_csv_goc"
   FROM ("public"."gstt_dm_tieu_chi_bang_kiem" "tc"
     LEFT JOIN "public"."gstt_dm_bang_kiem" "bk" ON (("bk"."id" = "tc"."bang_kiem_id")));


ALTER VIEW "public"."v_dm_tieu_chi_bang_kiem_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_fact_cong_viec_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "cong_viec_cha_id",
    "tieu_de",
    "mo_ta",
    "loai_cong_viec_id",
    "loai_cong_viec",
    "ten_loai_cong_viec",
    "trang_thai_id",
    "trang_thai",
    "ten_trang_thai_hien_thi",
    "muc_do_uu_tien",
    "han_hoan_thanh",
    "phan_tram_hoan_thanh",
    "nguoi_tao_id",
    "nguoi_giao_viec_id",
    "nguoi_phu_trach_id",
    "khoa_thuc_hien_id",
    "to_cong_tac_id",
    "dinh_ky_mau_id",
    "is_active",
    "created_at",
    "updated_at",
    "nguoi_tao_ten",
    "nguoi_phu_trach_ten",
    "nguoi_giao_ten",
    "khoa_thuc_hien_ten",
    "to_cong_tac_ten",
    "is_qua_han",
    "cong_viec_con_count"
   FROM "public"."v_qlcv_cong_viec_full";


ALTER VIEW "public"."v_fact_cong_viec_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_fact_cong_viec_full" IS '[compat alias 26/05/2026] -> v_qlcv_cong_viec_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_fact_giam_sat_chung_sessions_full" WITH ("security_invoker"='true') AS
 SELECT "s"."id",
    "s"."bang_kiem_id",
    "bk"."ma_bk" AS "loai_bang_kiem",
    "bk"."loai_giam_sat",
    "s"."khoa_id",
    "s"."khu_vuc_id",
    "s"."vi_tri",
    "s"."hinh_thuc_id",
    "s"."cach_thuc_id",
    "s"."nguoi_giam_sat_id",
    "s"."is_giam_sat_ca_nhan",
    "s"."nhan_vien_id",
    "s"."nghe_nghiep_id",
    "s"."ngay_giam_sat",
    "s"."thoi_gian_ghi_nhan",
    "s"."thoi_gian_bat_dau",
    "s"."thoi_gian_ket_thuc",
    "s"."tong_diem",
    "s"."ghi_chu_chung",
    COALESCE((("s"."metadata" ->> 'is_manual_nhan_vien'::"text"))::boolean, false) AS "is_manual_nhan_vien",
    ("s"."metadata" ->> 'ten_manual_nhan_vien'::"text") AS "ten_manual_nhan_vien",
    COALESCE((("s"."metadata" ->> 'is_bo_sung_nguoi_benh'::"text"))::boolean, false) AS "is_bo_sung_nguoi_benh",
    ("s"."metadata" ->> 'ma_nguoi_benh'::"text") AS "ma_nguoi_benh",
    ("s"."metadata" ->> 'ten_nguoi_benh'::"text") AS "ten_nguoi_benh",
    ("s"."metadata" ->> 'so_giuong_nguoi_benh'::"text") AS "so_giuong_nguoi_benh",
    "s"."is_active",
    "s"."is_seen",
    "s"."created_at",
    "s"."updated_at",
    "s"."results_jsonb",
    "s"."dat_tron_goi",
    "s"."du_lieu_nghi_van",
    "k"."ma_khoa" AS "ma_khoa_phong",
    "k"."ten_khoa" AS "ten_khoa_phong",
    "kv"."ma_khu_vuc" AS "ma_khu_vuc_giam_sat",
    "kv"."ten_khu_vuc" AS "ten_khu_vuc_giam_sat",
    "ns_gs"."ho_ten" AS "ten_nguoi_giam_sat",
    "ns_gs"."ma_nv" AS "ma_nguoi_giam_sat",
    "ns_nv"."ho_ten" AS "ten_nhan_vien",
    "ns_nv"."ma_nv" AS "ma_nhan_vien",
    "nn"."ma_nghe_nghiep",
    "nn"."ten_nghe_nghiep",
    "ht"."ma_hinh_thuc" AS "ma_hinh_thuc_giam_sat",
    "ht"."ten_hinh_thuc" AS "ten_hinh_thuc_danh_muc",
    "ht"."ten_hinh_thuc" AS "hinh_thuc_giam_sat",
    "ct"."ma_cach_thuc" AS "ma_cach_thuc_giam_sat",
    "ct"."ten_cach_thuc" AS "ten_cach_thuc_danh_muc",
    "ct"."ten_cach_thuc" AS "cach_thuc_giam_sat",
    "bk"."ten_bang_kiem" AS "ten_bang_kiem_hien_thi"
   FROM (((((((("public"."gstt_fact_chung_sessions" "s"
     LEFT JOIN "public"."gstt_dm_bang_kiem" "bk" ON (("bk"."id" = "s"."bang_kiem_id")))
     LEFT JOIN "public"."mdm_dm_khoa_phong" "k" ON (("k"."id" = "s"."khoa_id")))
     LEFT JOIN "public"."gstt_dm_khu_vuc_giam_sat" "kv" ON (("kv"."id" = "s"."khu_vuc_id")))
     LEFT JOIN "public"."mdm_nhan_su" "ns_gs" ON (("ns_gs"."id" = "s"."nguoi_giam_sat_id")))
     LEFT JOIN "public"."mdm_nhan_su" "ns_nv" ON (("ns_nv"."id" = "s"."nhan_vien_id")))
     LEFT JOIN "public"."mdm_dm_nghe_nghiep" "nn" ON (("nn"."id" = "s"."nghe_nghiep_id")))
     LEFT JOIN "public"."gstt_dm_hinh_thuc_giam_sat" "ht" ON (("ht"."id" = "s"."hinh_thuc_id")))
     LEFT JOIN "public"."gstt_dm_cach_thuc_giam_sat" "ct" ON (("ct"."id" = "s"."cach_thuc_id")))
  WHERE (COALESCE("s"."is_active", true) = true);


ALTER VIEW "public"."v_fact_giam_sat_chung_sessions_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_fact_giam_sat_vst_full" WITH ("security_invoker"='true') AS
 SELECT "o"."id",
    "o"."session_id",
    "o"."nhan_vien_id",
    ("o"."metadata" ->> 'ten_nhan_vien_ngoai'::"text") AS "ten_nhan_vien_ngoai",
    "o"."khoa_id",
    "o"."khu_vuc_id",
    "o"."nghe_nghiep_id",
    "o"."vi_tri",
    "o"."ngay_giam_sat",
    "o"."thoi_diem",
    "o"."hanh_dong",
    "o"."dung_ky_thuat",
    "o"."du_thoi_gian",
    "o"."co_deo_gang",
    "o"."thoi_gian_ghi_nhan",
    "o"."ghi_chu",
    "kv"."ma_khu_vuc" AS "ma_khu_vuc_giam_sat",
    COALESCE("kv"."ten_khu_vuc", ''::"text") AS "khu_vuc",
    COALESCE("kv"."ten_khu_vuc", ''::"text") AS "ten_khu_vuc_hien_thi",
    "nn"."ma_nghe_nghiep",
    COALESCE("nn"."ten_nghe_nghiep", ''::"text") AS "nghe_nghiep",
    COALESCE("nn"."ten_nghe_nghiep", ''::"text") AS "ten_nghe_nghiep_hien_thi",
    "k"."ten_khoa" AS "ten_khoa_phong",
    "o"."created_at"
   FROM ((("public"."gstt_fact_vst" "o"
     LEFT JOIN "public"."gstt_dm_khu_vuc_giam_sat" "kv" ON (("kv"."id" = "o"."khu_vuc_id")))
     LEFT JOIN "public"."mdm_dm_nghe_nghiep" "nn" ON (("nn"."id" = "o"."nghe_nghiep_id")))
     LEFT JOIN "public"."mdm_dm_khoa_phong" "k" ON (("k"."id" = "o"."khoa_id")));


ALTER VIEW "public"."v_fact_giam_sat_vst_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_fact_kho_hoa_chat_ton_lo" WITH ("security_invoker"='true') AS
 SELECT "dm_hoa_chat_id",
    "ma_lo",
    "han_su_dung",
    "ton_so_luong"
   FROM "public"."v_cssd_kho_hoa_chat_ton_lo";


ALTER VIEW "public"."v_fact_kho_hoa_chat_ton_lo" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_fact_kho_hoa_chat_ton_lo" IS '[compat alias 26/05/2026] -> v_cssd_kho_hoa_chat_ton_lo. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_fact_lo_tiet_khuan_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_lo_tiet_khuan",
    "thiet_bi_id",
    "ten_thiet_bi",
    "loai_may_id",
    "ma_loai_may",
    "ten_loai_tiet_khuan",
    "trang_thai",
    "tk_chot_nap_at",
    "tk_mo_form_qc_at",
    "tk_qc_json",
    "ket_qua_test",
    "is_active",
    "created_at",
    "updated_at"
   FROM "public"."v_cssd_lo_tiet_khuan_full";


ALTER VIEW "public"."v_fact_lo_tiet_khuan_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_fact_lo_tiet_khuan_full" IS '[compat alias 26/05/2026] -> v_cssd_lo_tiet_khuan_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_nkbv_su_kien_full" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."ma_ca",
    "c"."khoa_ghi_nhan_id",
    "c"."ma_benh_nhan",
    "c"."ho_ten_benh_nhan",
    "c"."ngay_sinh",
    "c"."gioi_tinh",
    "c"."ngay_vao_vien",
    "c"."ngay_phat_hien",
    "c"."vi_tri_nhiem_khuan",
    "c"."tac_nhan_vi_khuan",
    ("c"."clinical_notes" ->> 'tom_tat_dien_bien'::"text") AS "tom_tat_dien_bien",
    ("c"."clinical_notes" ->> 'bien_phap_phong_ngua'::"text") AS "bien_phap_phong_ngua",
    "c"."loai_nkbv_id",
    "c"."trang_thai_id",
    ("c"."clinical_notes" ->> 'ly_do_loai_tru'::"text") AS "ly_do_loai_tru",
    "c"."nguoi_ghi_id",
    "c"."is_active",
    "c"."created_at",
    "c"."updated_at",
    "c"."clinical_notes",
    "c"."vi_sinh_record_id",
    "c"."verification_data",
    "c"."ma_benh_an",
    "c"."ma_benh_pham",
    "c"."loai_benh_pham",
    "c"."so_luong",
    "s"."ngay_ra_vien",
    "s"."ket_cuc_dieu_tri",
    "s"."ly_do_tu_vong",
    "s"."tu_vong_lien_quan_nkbv",
    "k"."ma_khoa" AS "khoa_ma",
    "k"."ten_khoa" AS "khoa_ten",
    "l"."code" AS "loai_ma",
    "l"."name" AS "loai_ten",
    "t"."code" AS "trang_thai_ma",
    "t"."name" AS "trang_thai_ten"
   FROM (((("public"."nkbv_fact_su_kien" "c"
     LEFT JOIN "public"."nkbv_fact_benh_an" "s" ON (("s"."ma_benh_an" = "c"."ma_benh_an")))
     LEFT JOIN "public"."mdm_dm_khoa_phong" "k" ON (("k"."id" = "c"."khoa_ghi_nhan_id")))
     LEFT JOIN "public"."sys_lookup_value" "l" ON ((("l"."id" = "c"."loai_nkbv_id") AND ("l"."category_type" = 'LOAI_NKBV'::"text"))))
     LEFT JOIN "public"."sys_lookup_value" "t" ON ((("t"."id" = "c"."trang_thai_id") AND ("t"."category_type" = 'TRANG_THAI_NKBV_CA'::"text"))));


ALTER VIEW "public"."v_nkbv_su_kien_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_fact_nkbv_su_kien_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_ca",
    "khoa_ghi_nhan_id",
    "ma_benh_nhan",
    "ho_ten_benh_nhan",
    "ngay_sinh",
    "gioi_tinh",
    "ngay_vao_vien",
    "ngay_phat_hien",
    "vi_tri_nhiem_khuan",
    "tac_nhan_vi_khuan",
    "tom_tat_dien_bien",
    "bien_phap_phong_ngua",
    "loai_nkbv_id",
    "trang_thai_id",
    "ly_do_loai_tru",
    "nguoi_ghi_id",
    "is_active",
    "created_at",
    "updated_at",
    "clinical_notes",
    "vi_sinh_record_id",
    "verification_data",
    "ma_benh_an",
    "ma_benh_pham",
    "loai_benh_pham",
    "so_luong",
    "ngay_ra_vien",
    "ket_cuc_dieu_tri",
    "ly_do_tu_vong",
    "tu_vong_lien_quan_nkbv",
    "khoa_ma",
    "khoa_ten",
    "loai_ma",
    "loai_ten",
    "trang_thai_ma",
    "trang_thai_ten"
   FROM "public"."v_nkbv_su_kien_full";


ALTER VIEW "public"."v_fact_nkbv_su_kien_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_fact_nkbv_su_kien_full" IS '[compat alias 26/05/2026] -> v_nkbv_su_kien_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_fact_quy_trinh_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_qr_quy_trinh",
    "bo_dung_cu_id",
    "tram_hien_tai_id",
    "ma_trang_thai_hien_tai",
    "ten_tram_hien_tai",
    "nguoi_dang_giu_id",
    "nguoi_tiep_nhan_id",
    "nguoi_lam_sach_id",
    "nguoi_kiem_tra_id",
    "nguoi_dong_goi_id",
    "nguoi_tiet_khuan_id",
    "nguoi_cap_phat_id",
    "thoi_gian_tiep_nhan",
    "thoi_gian_lam_sach",
    "thoi_gian_qc",
    "thoi_gian_dong_goi",
    "thoi_gian_tiet_khuan",
    "thoi_gian_cap_phat",
    "lo_tiet_khuan_id",
    "suds_count",
    "ngay_tiet_khuan",
    "han_su_dung",
    "tinh_trang",
    "is_dong_bang",
    "quy_trinh_cha_id",
    "ma_vai_tro_bo",
    "ma_ca_mo_id",
    "ngay_het_han",
    "is_active",
    "ten_bo",
    "ma_bo",
    "ten_khoa",
    "ten_loai_dung_cu",
    "created_at",
    "updated_at"
   FROM "public"."v_cssd_quy_trinh_full";


ALTER VIEW "public"."v_fact_quy_trinh_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_fact_quy_trinh_full" IS '[compat alias 26/05/2026] -> v_cssd_quy_trinh_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_fact_su_co_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "quy_trinh_id",
    "ma_qr_quy_trinh",
    "ma_tram_phat_hien",
    "loai_su_co_id",
    "ten_loai_su_co",
    "incident_group",
    "incident_type_label",
    "ma_loai_su_co",
    "mo_ta",
    "is_red_alert",
    "ma_tram_gay_loi",
    "created_at",
    "attributes"
   FROM "public"."v_cssd_su_co_full";


ALTER VIEW "public"."v_fact_su_co_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_fact_su_co_full" IS '[compat alias 26/05/2026] -> v_cssd_su_co_full. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_gsc_dashboard_rows" WITH ("security_invoker"='true') AS
 SELECT "s"."id" AS "session_id",
    "s"."ngay_giam_sat",
    "s"."created_at",
    COALESCE("bk"."ma_bk", ''::"text") AS "loai_bang_kiem",
    "s"."tong_diem",
    "s"."khoa_id",
    "kp"."ten_khoa",
    (("r"."elem" ->> 'criterion_id'::"text"))::"uuid" AS "id",
    (("r"."elem" ->> 'criterion_id'::"text"))::"uuid" AS "result_id",
    (("r"."elem" ->> 'criterion_id'::"text"))::"uuid" AS "criterion_id",
    ("r"."elem" ->> 'value'::"text") AS "value",
    ("r"."elem" ->> 'value'::"text") AS "result_value",
    ("r"."elem" ->> 'note'::"text") AS "note"
   FROM ((("public"."gstt_fact_chung_sessions" "s"
     LEFT JOIN "public"."gstt_dm_bang_kiem" "bk" ON (("bk"."id" = "s"."bang_kiem_id")))
     LEFT JOIN "public"."mdm_dm_khoa_phong" "kp" ON (("kp"."id" = "s"."khoa_id")))
     LEFT JOIN LATERAL "jsonb_array_elements"("s"."results_jsonb") "r"("elem") ON (true))
  WHERE ("s"."is_active" = true);


ALTER VIEW "public"."v_gsc_dashboard_rows" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_gsc_dashboard_rows" IS '[compat alias 26/05/2026] -> v_gstt_gsc_dashboard_rows. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_gstt_dashboard_bundle_rate_v3" WITH ("security_invoker"='true') AS
 SELECT "bk"."id" AS "bang_kiem_id",
    "bk"."ma_bk",
    "bk"."ten_bang_kiem",
    "s"."khoa_id",
    "s"."ngay_giam_sat" AS "ngay",
    "count"("s"."id") AS "tong_phien",
    "count"("s"."id") FILTER (WHERE ("s"."dat_tron_goi" IS TRUE)) AS "so_dat",
    "count"("s"."id") FILTER (WHERE ("s"."dat_tron_goi" IS FALSE)) AS "so_khong_dat",
        CASE
            WHEN ("count"("s"."id") FILTER (WHERE ("s"."dat_tron_goi" IS NOT NULL)) > 0) THEN "round"(((("count"("s"."id") FILTER (WHERE ("s"."dat_tron_goi" IS TRUE)))::numeric * (100)::numeric) / (NULLIF("count"("s"."id") FILTER (WHERE ("s"."dat_tron_goi" IS NOT NULL)), 0))::numeric), 1)
            ELSE NULL::numeric
        END AS "ty_le_dat"
   FROM ("public"."gstt_fact_chung_sessions" "s"
     JOIN "public"."gstt_dm_bang_kiem" "bk" ON ((("bk"."id" = "s"."bang_kiem_id") AND ("bk"."cach_tinh_diem" = 'TRON_GOI'::"text"))))
  WHERE (COALESCE("s"."is_active", true) = true)
  GROUP BY "bk"."id", "bk"."ma_bk", "bk"."ten_bang_kiem", "s"."khoa_id", "s"."ngay_giam_sat";


ALTER VIEW "public"."v_gstt_dashboard_bundle_rate_v3" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_gstt_dashboard_bundle_rate_v3" IS 'Slice 7 (reform v4): Bundle Compliance Rate per khoa+ngay+template (chỉ cach_tinh_diem=TRON_GOI). Gauge dashboard tính ty_le trung bình trên N phiên.';



CREATE OR REPLACE VIEW "public"."v_gstt_dashboard_nhsn_denominator_v3" WITH ("security_invoker"='true') AS
 SELECT "khoa_id",
    "ngay_ghi_nhan" AS "ngay",
    "so_ngay_tho_may",
    "so_ngay_catheter_cvc",
    "so_ngay_sonde_tieu",
    "so_ngay_dieu_tri"
   FROM "public"."nkbv_fact_mau_so_daily" "d";


ALTER VIEW "public"."v_gstt_dashboard_nhsn_denominator_v3" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_gstt_dashboard_nhsn_denominator_v3" IS 'Slice 7 (reform v4): denominator NHSN per 1000 device-days. Numerator (ca NKBV thật) đến từ giam-sat-nkbv module — phase sau JOIN qua RPC.';



CREATE OR REPLACE VIEW "public"."v_gstt_gsc_dashboard_rows" WITH ("security_invoker"='true') AS
 SELECT "s"."id" AS "session_id",
    "s"."ngay_giam_sat",
    "s"."created_at",
    COALESCE("bk"."ma_bk", ''::"text") AS "loai_bang_kiem",
    "s"."tong_diem",
    "s"."khoa_id",
    "kp"."ten_khoa",
    (("r"."elem" ->> 'criterion_id'::"text"))::"uuid" AS "id",
    (("r"."elem" ->> 'criterion_id'::"text"))::"uuid" AS "result_id",
    (("r"."elem" ->> 'criterion_id'::"text"))::"uuid" AS "criterion_id",
    ("r"."elem" ->> 'value'::"text") AS "value",
    ("r"."elem" ->> 'value'::"text") AS "result_value",
    ("r"."elem" ->> 'note'::"text") AS "note"
   FROM ((("public"."gstt_fact_chung_sessions" "s"
     LEFT JOIN "public"."gstt_dm_bang_kiem" "bk" ON (("bk"."id" = "s"."bang_kiem_id")))
     LEFT JOIN "public"."mdm_dm_khoa_phong" "kp" ON (("kp"."id" = "s"."khoa_id")))
     LEFT JOIN LATERAL "jsonb_array_elements"("s"."results_jsonb") "r"("elem") ON (true))
  WHERE ("s"."is_active" = true);


ALTER VIEW "public"."v_gstt_gsc_dashboard_rows" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_gstt_vst_hotpath" WITH ("security_invoker"='true') AS
 SELECT "id",
    "session_id",
    "nhan_vien_id",
    ("metadata" ->> 'ten_nhan_vien_ngoai'::"text") AS "ten_nhan_vien_ngoai",
    "khoa_id",
    "vi_tri",
    "ngay_giam_sat",
    "thoi_diem",
    "hanh_dong",
    "dung_ky_thuat",
    "du_thoi_gian",
    "co_deo_gang",
    "thoi_gian_ghi_nhan",
    "created_at",
    "ghi_chu",
    "khu_vuc_id",
    "nghe_nghiep_id"
   FROM "public"."gstt_fact_vst";


ALTER VIEW "public"."v_gstt_vst_hotpath" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_mdm_nhan_su_full" AS
 SELECT "ns"."id",
    "ns"."ma_nv",
    "ns"."ho_ten",
    "ns"."khoa_id",
    "ns"."to_id",
    "ns"."nghe_nghiep_id",
    "ns"."chuc_vu_id",
    "ns"."chuc_danh_id",
    "ns"."vai_tro_he_thong_id",
    "ns"."auth_user_id",
    (("ns"."extra_data" ->> 'ngay_sinh'::"text"))::"date" AS "ngay_sinh",
    ("ns"."extra_data" ->> 'gioi_tinh'::"text") AS "gioi_tinh",
    ("ns"."extra_data" ->> 'so_dien_thoai'::"text") AS "so_dien_thoai",
    ("ns"."extra_data" ->> 'email'::"text") AS "email",
    "ns"."extra_data",
    "ns"."is_active",
    "k"."ten_khoa",
    "t"."name" AS "ten_to",
    "nn"."name" AS "ten_nghe_nghiep",
    "cv"."name" AS "chuc_vu",
    "cd"."name" AS "chuc_danh",
    "r"."name" AS "vai_tro_he_thong_ksnk",
    "cv"."name" AS "ten_chuc_vu",
    "cd"."name" AS "ten_chuc_danh",
    "r"."name" AS "ten_vai_tro",
    "ns"."created_at",
    "ns"."updated_at"
   FROM (((((("public"."mdm_nhan_su" "ns"
     LEFT JOIN "public"."mdm_dm_khoa_phong" "k" ON (("ns"."khoa_id" = "k"."id")))
     LEFT JOIN "public"."sys_lookup_value" "nn" ON ((("ns"."nghe_nghiep_id" = "nn"."id") AND ("nn"."category_type" = 'NGHE_NGHIEP'::"text"))))
     LEFT JOIN "public"."sys_lookup_value" "cd" ON ((("ns"."chuc_danh_id" = "cd"."id") AND ("cd"."category_type" = 'CHUC_DANH'::"text"))))
     LEFT JOIN "public"."sys_lookup_value" "cv" ON ((("ns"."chuc_vu_id" = "cv"."id") AND ("cv"."category_type" = 'CHUC_VU'::"text"))))
     LEFT JOIN "public"."sys_lookup_value" "t" ON ((("ns"."to_id" = "t"."id") AND ("t"."category_type" = 'TO_CONG_TAC'::"text"))))
     LEFT JOIN "public"."sys_roles" "r" ON (("ns"."vai_tro_he_thong_id" = "r"."id")));


ALTER VIEW "public"."v_mdm_nhan_su_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_sys_role_permissions_matrix" WITH ("security_invoker"='true') AS
 SELECT "r"."id" AS "role_id",
    "r"."name" AS "role_name",
    "array_agg"("rp"."permission_id") FILTER (WHERE ("rp"."permission_id" IS NOT NULL)) AS "permission_ids"
   FROM ("public"."sys_roles" "r"
     LEFT JOIN "public"."sys_role_permissions" "rp" ON (("r"."id" = "rp"."role_id")))
  GROUP BY "r"."id", "r"."name";


ALTER VIEW "public"."v_sys_role_permissions_matrix" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_role_permissions_matrix" WITH ("security_invoker"='true') AS
 SELECT "role_id",
    "role_name",
    "permission_ids"
   FROM "public"."v_sys_role_permissions_matrix";


ALTER VIEW "public"."v_role_permissions_matrix" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_role_permissions_matrix" IS '[compat alias 26/05/2026] -> v_sys_role_permissions_matrix. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_sys_staff_auth_overview" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "ma_nv",
    NULL::"text" AS "ho_ten",
    NULL::"text" AS "email",
    NULL::boolean AS "is_active",
    NULL::"uuid" AS "auth_user_id",
    NULL::"text"[] AS "role_names";


ALTER VIEW "public"."v_sys_staff_auth_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_staff_auth_overview" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_nv",
    "ho_ten",
    "email",
    "is_active",
    "auth_user_id",
    "role_names"
   FROM "public"."v_sys_staff_auth_overview";


ALTER VIEW "public"."v_staff_auth_overview" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_staff_auth_overview" IS '[compat alias 26/05/2026] -> v_sys_staff_auth_overview. DROP sau khi app migrate sạch.';



CREATE OR REPLACE VIEW "public"."v_sys_audit_log_full" WITH ("security_invoker"='true') AS
 SELECT "al"."id",
    "al"."table_name",
    "al"."record_id",
    "al"."action",
    "al"."old_data",
    "al"."new_data",
    "al"."changed_by",
    "al"."changed_at",
    "ns"."ho_ten" AS "user_fullname",
    ("ns"."extra_data" ->> 'email'::"text") AS "user_email",
    "ns"."ma_nv" AS "user_ma_nv"
   FROM ("public"."sys_audit_log" "al"
     LEFT JOIN "public"."mdm_nhan_su" "ns" ON (("ns"."auth_user_id" = "al"."changed_by")));


ALTER VIEW "public"."v_sys_audit_log_full" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_sys_audit_log_full" IS 'View phẳng cho UI audit trail: join sẵn người thao tác (ho_ten, email, ma_nv).';



CREATE OR REPLACE VIEW "public"."v_sys_audit_table_choices" WITH ("security_invoker"='true') AS
 SELECT "table_name",
    "count"(*) AS "log_count",
    "max"("changed_at") AS "last_changed_at"
   FROM "public"."sys_audit_log"
  GROUP BY "table_name";


ALTER VIEW "public"."v_sys_audit_table_choices" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_sys_audit_table_choices" IS 'Distinct table_name + count cho dropdown filter UI; tránh quét toàn bảng client-side.';



CREATE OR REPLACE VIEW "public"."vw_vst_hotpath" WITH ("security_invoker"='true') AS
 SELECT "id",
    "session_id",
    "nhan_vien_id",
    "ten_nhan_vien_ngoai",
    "khoa_id",
    "vi_tri",
    "ngay_giam_sat",
    "thoi_diem",
    "hanh_dong",
    "dung_ky_thuat",
    "du_thoi_gian",
    "co_deo_gang",
    "thoi_gian_ghi_nhan",
    "created_at",
    "ghi_chu",
    "khu_vuc_id",
    "nghe_nghiep_id"
   FROM "public"."v_gstt_vst_hotpath";


ALTER VIEW "public"."vw_vst_hotpath" OWNER TO "postgres";


COMMENT ON VIEW "public"."vw_vst_hotpath" IS '[compat alias 26/05/2026] -> v_gstt_vst_hotpath. DROP sau khi app migrate sạch.';



ALTER TABLE ONLY "public"."cssd_dm_bo_phan_bo"
    ADD CONSTRAINT "cssd_dm_bo_phan_bo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gstt_dm_bang_kiem"
    ADD CONSTRAINT "danh_muc_bang_kiem_ma_bk_key" UNIQUE ("ma_bk");



ALTER TABLE ONLY "public"."gstt_dm_bang_kiem"
    ADD CONSTRAINT "danh_muc_bang_kiem_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_dm_bo_dung_cu_chi_tiet"
    ADD CONSTRAINT "dm_bo_dung_cu_chi_tiet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_dm_bo_dung_cu"
    ADD CONSTRAINT "dm_bo_dung_cu_ma_bo_key" UNIQUE ("ma_bo");



ALTER TABLE ONLY "public"."cssd_dm_bo_dung_cu"
    ADD CONSTRAINT "dm_bo_dung_cu_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_dm_hoa_chat"
    ADD CONSTRAINT "dm_hoa_chat_ma_hoa_chat_key" UNIQUE ("ma_hoa_chat");



ALTER TABLE ONLY "public"."cssd_dm_hoa_chat"
    ADD CONSTRAINT "dm_hoa_chat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mdm_dm_khoa_phong"
    ADD CONSTRAINT "dm_khoa_phong_ma_khoa_key" UNIQUE ("ma_khoa");



ALTER TABLE ONLY "public"."mdm_dm_khoa_phong"
    ADD CONSTRAINT "dm_khoa_phong_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_dm_loai_dung_cu"
    ADD CONSTRAINT "dm_loai_dung_cu_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sys_lookup_value"
    ADD CONSTRAINT "dm_lookup_value_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nkbv_dm_cdc_baseline"
    ADD CONSTRAINT "dm_nkbv_cdc_baselines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nkbv_dm_cdc_baseline"
    ADD CONSTRAINT "dm_nkbv_cdc_baselines_unique" UNIQUE ("khoa_id", "loai_thiet_bi");



ALTER TABLE ONLY "public"."cssd_dm_thiet_bi"
    ADD CONSTRAINT "dm_thiet_bi_ma_thiet_bi_key" UNIQUE ("ma_thiet_bi");



ALTER TABLE ONLY "public"."cssd_dm_thiet_bi"
    ADD CONSTRAINT "dm_thiet_bi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_fact_bao_tri"
    ADD CONSTRAINT "fact_bao_tri_thiet_bi_ma_phieu_key" UNIQUE ("ma_phieu");



ALTER TABLE ONLY "public"."cssd_fact_bao_tri"
    ADD CONSTRAINT "fact_bao_tri_thiet_bi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec_dinh_ky"
    ADD CONSTRAINT "fact_cong_viec_dinh_ky_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec_hoat_dong"
    ADD CONSTRAINT "fact_cong_viec_hoat_dong_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec"
    ADD CONSTRAINT "fact_cong_viec_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_fact_dieu_chuyen_thanh_phan"
    ADD CONSTRAINT "fact_cssd_dieu_chuyen_thanh_phan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_fact_lifecycle_event"
    ADD CONSTRAINT "fact_cssd_lifecycle_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gstt_fact_gsc_dashboard_summary"
    ADD CONSTRAINT "fact_gsc_dashboard_summary_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."gstt_fact_gsc_violations_summary"
    ADD CONSTRAINT "fact_gsc_violations_summary_pkey" PRIMARY KEY ("session_id", "criterion_id");



ALTER TABLE ONLY "public"."cssd_fact_kho_giao_dich"
    ADD CONSTRAINT "fact_kho_dung_cu_giao_dich_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_fact_kho_hoa_chat_giao_dich"
    ADD CONSTRAINT "fact_kho_hc_ma_phieu_key" UNIQUE ("ma_phieu");



ALTER TABLE ONLY "public"."cssd_fact_kho_hoa_chat_giao_dich"
    ADD CONSTRAINT "fact_kho_hoa_chat_giao_dich_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nkbv_fact_benh_an"
    ADD CONSTRAINT "fact_nkbv_benh_an_ma_benh_an_key" UNIQUE ("ma_benh_an");



ALTER TABLE ONLY "public"."nkbv_fact_benh_an"
    ADD CONSTRAINT "fact_nkbv_benh_an_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nkbv_fact_mau_so_daily"
    ADD CONSTRAINT "fact_nkbv_mau_so_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nkbv_fact_mau_so_daily"
    ADD CONSTRAINT "fact_nkbv_mau_so_daily_unique_key" UNIQUE ("khoa_id", "ngay_ghi_nhan");



ALTER TABLE ONLY "public"."nkbv_fact_mau_so_phau_thuat"
    ADD CONSTRAINT "fact_nkbv_mau_so_phau_thuat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nkbv_fact_su_kien"
    ADD CONSTRAINT "fact_nkbv_su_kien_ma_ca_key" UNIQUE ("ma_ca");



ALTER TABLE ONLY "public"."nkbv_fact_su_kien"
    ADD CONSTRAINT "fact_nkbv_su_kien_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nkbv_fact_vi_sinh"
    ADD CONSTRAINT "fact_nkbv_vi_sinh_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qlcv_fact_danh_gia_thang"
    ADD CONSTRAINT "fact_qlcv_danh_gia_thang_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qlcv_fact_danh_gia_thang"
    ADD CONSTRAINT "fact_qlcv_danh_gia_thang_uq" UNIQUE ("nhan_su_id", "thang");



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh_thanh_phan"
    ADD CONSTRAINT "fact_quy_trinh_thanh_phan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gstt_fact_vst_moments_summary"
    ADD CONSTRAINT "fact_vst_moments_summary_pkey" PRIMARY KEY ("opportunity_id", "moment_label");



ALTER TABLE ONLY "public"."gstt_fact_vst_opportunities_summary"
    ADD CONSTRAINT "fact_vst_opportunities_summary_pkey" PRIMARY KEY ("opportunity_id");



ALTER TABLE ONLY "public"."gstt_fact_vst_sessions_summary"
    ADD CONSTRAINT "fact_vst_sessions_summary_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."gstt_fact_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gstt_fact_vst"
    ADD CONSTRAINT "giam_sat_vst_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gstt_fact_vst_sessions"
    ADD CONSTRAINT "giam_sat_vst_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_ma_nv_key" UNIQUE ("ma_nv");



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_fact_kho_chi_tiet"
    ADD CONSTRAINT "kho_chi_tiet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_fact_lo_tiet_khuan"
    ADD CONSTRAINT "lo_tiet_khuan_ma_lo_tiet_khuan_key" UNIQUE ("ma_lo_tiet_khuan");



ALTER TABLE ONLY "public"."cssd_fact_lo_tiet_khuan"
    ADD CONSTRAINT "lo_tiet_khuan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sys_mdm_registry"
    ADD CONSTRAINT "mdm_field_registry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sys_mdm_suggestion"
    ADD CONSTRAINT "mdm_governance_suggestion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sys_mdm_suggestion"
    ADD CONSTRAINT "mdm_governance_suggestion_table_name_column_name_suggestion_key" UNIQUE ("table_name", "column_name", "suggestion_type", "status");



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "quy_trinh_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_fact_su_co"
    ADD CONSTRAINT "su_co_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sys_audit_log"
    ADD CONSTRAINT "sys_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sys_module_locks"
    ADD CONSTRAINT "sys_module_locks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sys_module_locks"
    ADD CONSTRAINT "sys_module_locks_unique" UNIQUE ("module_name");



ALTER TABLE ONLY "public"."sys_permissions"
    ADD CONSTRAINT "sys_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sys_role_permissions"
    ADD CONSTRAINT "sys_role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sys_roles"
    ADD CONSTRAINT "sys_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."sys_roles"
    ADD CONSTRAINT "sys_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sys_user_roles"
    ADD CONSTRAINT "sys_user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cssd_dm_bo_phan_bo"
    ADD CONSTRAINT "unique_bo_khoa" UNIQUE ("bo_dung_cu_id", "khoa_phong_id");



ALTER TABLE ONLY "public"."sys_lookup_value"
    ADD CONSTRAINT "uq_category_type_code" UNIQUE ("category_type", "code");



ALTER TABLE ONLY "public"."sys_mdm_registry"
    ADD CONSTRAINT "uq_mdm_field_registry" UNIQUE ("table_name", "column_name");



ALTER TABLE ONLY "public"."sys_permissions"
    ADD CONSTRAINT "uq_sys_permissions_module_action" UNIQUE ("module_name", "action");



ALTER TABLE ONLY "public"."sys_role_permissions"
    ADD CONSTRAINT "uq_sys_role_permissions" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."sys_user_roles"
    ADD CONSTRAINT "uq_sys_user_roles" UNIQUE ("user_id", "role_id");



CREATE INDEX "brin_gsc_sessions_ngay_giam_sat" ON "public"."gstt_fact_chung_sessions" USING "brin" ("ngay_giam_sat");



CREATE INDEX "brin_vst_sessions_ngay_giam_sat" ON "public"."gstt_fact_vst_sessions" USING "brin" ("ngay_giam_sat");



CREATE INDEX "idx_cssd_dieu_chuyen_den" ON "public"."cssd_fact_dieu_chuyen_thanh_phan" USING "btree" ("den_quy_trinh_id");



CREATE INDEX "idx_cssd_dieu_chuyen_tu" ON "public"."cssd_fact_dieu_chuyen_thanh_phan" USING "btree" ("tu_quy_trinh_id");



CREATE INDEX "idx_cssd_dm_bo_dung_cu_chi_tiet_bo_dung_cu_id" ON "public"."cssd_dm_bo_dung_cu_chi_tiet" USING "btree" ("bo_dung_cu_id");



COMMENT ON INDEX "public"."idx_cssd_dm_bo_dung_cu_chi_tiet_bo_dung_cu_id" IS 'B.3 26/05/2026 — phục vụ JOIN v_cssd_bo_dung_cu_summary + mọi query lấy chi tiết theo bo_dung_cu.';



CREATE INDEX "idx_cssd_dm_loai_dung_cu_chiu_nhiet" ON "public"."cssd_dm_loai_dung_cu" USING "btree" ("is_chiu_nhiet");



CREATE INDEX "idx_danh_muc_bk_ma" ON "public"."gstt_dm_bang_kiem" USING "btree" ("ma_bk");



CREATE INDEX "idx_dm_bo_dung_cu_chi_tiet_loai_id" ON "public"."cssd_dm_bo_dung_cu_chi_tiet" USING "btree" ("loai_dung_cu_id");



CREATE INDEX "idx_dm_bo_dung_cu_khoa_su_dung_id" ON "public"."cssd_dm_bo_dung_cu" USING "btree" ("khoa_su_dung_id");



CREATE INDEX "idx_dm_bo_dung_cu_loai_dung_cu_id" ON "public"."cssd_dm_bo_dung_cu" USING "btree" ("loai_dung_cu_id");



CREATE INDEX "idx_dm_bo_dung_cu_ma" ON "public"."cssd_dm_bo_dung_cu" USING "btree" ("ma_bo");



CREATE INDEX "idx_dm_khoa_phong_khoi_id" ON "public"."mdm_dm_khoa_phong" USING "btree" ("khoi_id");



CREATE INDEX "idx_dm_loai_dung_cu_active" ON "public"."cssd_dm_loai_dung_cu" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_dm_lookup_value_code" ON "public"."sys_lookup_value" USING "btree" ("category_type", "code");



CREATE INDEX "idx_dm_lookup_value_type" ON "public"."sys_lookup_value" USING "btree" ("category_type") WHERE ("is_active" = true);



CREATE INDEX "idx_dm_roles_is_active" ON "public"."sys_roles" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_fact_bao_tri_one_dang_per_tb" ON "public"."cssd_fact_bao_tri" USING "btree" ("thiet_bi_id") WHERE ((("trang_thai")::"text" = 'DANG_THUC_HIEN'::"text") AND COALESCE("is_active", true));



CREATE INDEX "idx_fact_bao_tri_tb" ON "public"."cssd_fact_bao_tri" USING "btree" ("thiet_bi_id");



CREATE INDEX "idx_fact_bao_tri_trang" ON "public"."cssd_fact_bao_tri" USING "btree" ("trang_thai");



CREATE INDEX "idx_fact_cong_viec_hoat_dong_cv_created" ON "public"."qlcv_fact_cong_viec_hoat_dong" USING "btree" ("id_cong_viec", "created_at" DESC);



CREATE INDEX "idx_fact_cong_viec_loai_cong_viec_id" ON "public"."qlcv_fact_cong_viec" USING "btree" ("loai_cong_viec_id") WHERE ("loai_cong_viec_id" IS NOT NULL);



CREATE INDEX "idx_fact_cong_viec_trang_thai_han_active" ON "public"."qlcv_fact_cong_viec" USING "btree" ("trang_thai_id", "han_hoan_thanh") WHERE ("is_active" = true);



CREATE INDEX "idx_fact_cong_viec_trang_thai_id" ON "public"."qlcv_fact_cong_viec" USING "btree" ("trang_thai_id") WHERE ("trang_thai_id" IS NOT NULL);



CREATE INDEX "idx_fact_cssd_lifecycle_created" ON "public"."cssd_fact_lifecycle_event" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fact_cssd_lifecycle_quy_trinh" ON "public"."cssd_fact_lifecycle_event" USING "btree" ("quy_trinh_id");



CREATE INDEX "idx_fact_cv_cha" ON "public"."qlcv_fact_cong_viec" USING "btree" ("cong_viec_cha_id");



CREATE INDEX "idx_fact_cv_dinh_ky_active" ON "public"."qlcv_fact_cong_viec_dinh_ky" USING "btree" ("is_active");



CREATE INDEX "idx_fact_cv_hd_cv" ON "public"."qlcv_fact_cong_viec_hoat_dong" USING "btree" ("id_cong_viec");



CREATE INDEX "idx_fact_cv_hoat_dong_cv" ON "public"."qlcv_fact_cong_viec_hoat_dong" USING "btree" ("id_cong_viec");



CREATE INDEX "idx_fact_gsc_sessions_cach_thuc_id" ON "public"."gstt_fact_chung_sessions" USING "btree" ("cach_thuc_id") WHERE ("cach_thuc_id" IS NOT NULL);



CREATE INDEX "idx_fact_gsc_sessions_hinh_thuc_id" ON "public"."gstt_fact_chung_sessions" USING "btree" ("hinh_thuc_id") WHERE ("hinh_thuc_id" IS NOT NULL);



CREATE INDEX "idx_fact_kho_hc_created" ON "public"."cssd_fact_kho_hoa_chat_giao_dich" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fact_kho_hc_dm" ON "public"."cssd_fact_kho_hoa_chat_giao_dich" USING "btree" ("dm_hoa_chat_id");



CREATE INDEX "idx_fact_kho_hc_loai" ON "public"."cssd_fact_kho_hoa_chat_giao_dich" USING "btree" ("loai_giao_dich");



CREATE INDEX "idx_fact_qlcv_dgt_nhan_su" ON "public"."qlcv_fact_danh_gia_thang" USING "btree" ("nhan_su_id");



CREATE INDEX "idx_fact_qlcv_dgt_thang" ON "public"."qlcv_fact_danh_gia_thang" USING "btree" ("thang" DESC);



CREATE INDEX "idx_fact_quy_trinh_bo_dung_cu_id" ON "public"."cssd_fact_quy_trinh" USING "btree" ("bo_dung_cu_id") WHERE ("bo_dung_cu_id" IS NOT NULL);



CREATE INDEX "idx_fact_quy_trinh_cha" ON "public"."cssd_fact_quy_trinh" USING "btree" ("quy_trinh_cha_id");



CREATE INDEX "idx_fact_quy_trinh_thanh_phan_qt" ON "public"."cssd_fact_quy_trinh_thanh_phan" USING "btree" ("quy_trinh_id");



CREATE INDEX "idx_fact_quy_trinh_tram_hien_tai_id" ON "public"."cssd_fact_quy_trinh" USING "btree" ("tram_hien_tai_id") WHERE ("tram_hien_tai_id" IS NOT NULL);



CREATE INDEX "idx_fact_vst_obs_khoa_id" ON "public"."gstt_fact_vst" USING "btree" ("khoa_id") WHERE ("khoa_id" IS NOT NULL);



CREATE INDEX "idx_fact_vst_obs_khu_vuc_id" ON "public"."gstt_fact_vst" USING "btree" ("khu_vuc_id") WHERE ("khu_vuc_id" IS NOT NULL);



CREATE INDEX "idx_fact_vst_obs_nghe_nghiep_id" ON "public"."gstt_fact_vst" USING "btree" ("nghe_nghiep_id") WHERE ("nghe_nghiep_id" IS NOT NULL);



CREATE INDEX "idx_fact_vst_obs_nhan_vien_id" ON "public"."gstt_fact_vst" USING "btree" ("nhan_vien_id") WHERE ("nhan_vien_id" IS NOT NULL);



CREATE INDEX "idx_fact_vst_sessions_cach_thuc_id" ON "public"."gstt_fact_vst_sessions" USING "btree" ("cach_thuc_id") WHERE ("cach_thuc_id" IS NOT NULL);



CREATE INDEX "idx_fact_vst_sessions_hinh_thuc_id" ON "public"."gstt_fact_vst_sessions" USING "btree" ("hinh_thuc_id") WHERE ("hinh_thuc_id" IS NOT NULL);



CREATE INDEX "idx_giam_sat_chung_supervisor" ON "public"."gstt_fact_chung_sessions" USING "btree" ("nguoi_giam_sat_id");



CREATE INDEX "idx_giam_sat_vst_session_id" ON "public"."gstt_fact_vst" USING "btree" ("session_id");



CREATE INDEX "idx_giam_sat_vst_supervisor" ON "public"."gstt_fact_vst_sessions" USING "btree" ("nguoi_giam_sat_id");



CREATE INDEX "idx_gsc_results_jsonb" ON "public"."gstt_fact_chung_sessions" USING "gin" ("results_jsonb" "jsonb_path_ops");



CREATE INDEX "idx_gsc_sessions_active_ngay_bang_kiem" ON "public"."gstt_fact_chung_sessions" USING "btree" ("is_active", "ngay_giam_sat", "bang_kiem_id") WHERE ("is_active" = true);



CREATE INDEX "idx_gsc_sessions_bang_kiem_id" ON "public"."gstt_fact_chung_sessions" USING "btree" ("bang_kiem_id") WHERE ("bang_kiem_id" IS NOT NULL);



CREATE INDEX "idx_gsc_sessions_created_at" ON "public"."gstt_fact_chung_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_gsc_sessions_khoa_created" ON "public"."gstt_fact_chung_sessions" USING "btree" ("khoa_id", "created_at" DESC);



CREATE INDEX "idx_gsc_sessions_khoa_id" ON "public"."gstt_fact_chung_sessions" USING "btree" ("khoa_id");



CREATE INDEX "idx_gsc_sessions_khoa_ngay_bk" ON "public"."gstt_fact_chung_sessions" USING "btree" ("khoa_id", "ngay_giam_sat", "bang_kiem_id") WHERE ("is_active" = true);



CREATE INDEX "idx_gsc_sessions_khu_vuc_id" ON "public"."gstt_fact_chung_sessions" USING "btree" ("khu_vuc_id");



CREATE INDEX "idx_gsc_sessions_ngay_bang_kiem_active" ON "public"."gstt_fact_chung_sessions" USING "btree" ("ngay_giam_sat", "bang_kiem_id") WHERE ("is_active" = true);



CREATE INDEX "idx_gsc_sessions_nghe_nghiep_id" ON "public"."gstt_fact_chung_sessions" USING "btree" ("nghe_nghiep_id");



CREATE INDEX "idx_gsc_sessions_nguoi_giam_sat_id" ON "public"."gstt_fact_chung_sessions" USING "btree" ("nguoi_giam_sat_id");



CREATE INDEX "idx_gsc_sessions_nhan_vien_id" ON "public"."gstt_fact_chung_sessions" USING "btree" ("nhan_vien_id");



CREATE INDEX "idx_gsc_sum_filters" ON "public"."gstt_fact_gsc_dashboard_summary" USING "btree" ("ngay_giam_sat", "khoa_id", "nghe_nghiep_id", "khu_vuc_id", "stype");



CREATE INDEX "idx_gsc_sum_supervisor" ON "public"."gstt_fact_gsc_dashboard_summary" USING "btree" ("nguoi_giam_sat_id");



CREATE INDEX "idx_gsc_viol_filters" ON "public"."gstt_fact_gsc_violations_summary" USING "btree" ("ngay_giam_sat", "khoa_id", "nghe_nghiep_id", "criterion_id");



CREATE INDEX "idx_gstt_bk_cach_tinh_diem" ON "public"."gstt_dm_bang_kiem" USING "btree" ("cach_tinh_diem") WHERE (("is_active" = true) AND ("cach_tinh_diem" IS NOT NULL));



CREATE INDEX "idx_gstt_bk_loai_doi_tuong" ON "public"."gstt_dm_bang_kiem" USING "btree" ("loai_giam_sat", "doi_tuong_giam_sat") WHERE ("is_active" = true);



CREATE INDEX "idx_gstt_session_dat_tron_goi" ON "public"."gstt_fact_chung_sessions" USING "btree" ("bang_kiem_id", "dat_tron_goi") WHERE (("is_active" = true) AND ("dat_tron_goi" IS NOT NULL));



CREATE INDEX "idx_ho_so_nhan_vien_chuc_danh_id" ON "public"."mdm_nhan_su" USING "btree" ("chuc_danh_id");



CREATE INDEX "idx_ho_so_nhan_vien_chuc_vu_id" ON "public"."mdm_nhan_su" USING "btree" ("chuc_vu_id");



CREATE INDEX "idx_ho_so_nhan_vien_is_active" ON "public"."mdm_nhan_su" USING "btree" ("is_active");



CREATE INDEX "idx_ho_so_nhan_vien_khoa_id" ON "public"."mdm_nhan_su" USING "btree" ("khoa_id");



CREATE INDEX "idx_ho_so_nhan_vien_to_id" ON "public"."mdm_nhan_su" USING "btree" ("to_id");



CREATE INDEX "idx_ho_so_nhan_vien_vai_tro_he_thong_id" ON "public"."mdm_nhan_su" USING "btree" ("vai_tro_he_thong_id");



CREATE INDEX "idx_kho_chi_tiet_quy_trinh" ON "public"."cssd_fact_kho_chi_tiet" USING "btree" ("quy_trinh_id");



CREATE INDEX "idx_lo_tiet_khuan_created_at" ON "public"."cssd_fact_lo_tiet_khuan" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lo_tiet_khuan_ma" ON "public"."cssd_fact_lo_tiet_khuan" USING "btree" ("ma_lo_tiet_khuan");



CREATE INDEX "idx_lo_tiet_khuan_thiet_bi_id" ON "public"."cssd_fact_lo_tiet_khuan" USING "btree" ("thiet_bi_id") WHERE ("thiet_bi_id" IS NOT NULL);



CREATE INDEX "idx_mdm_field_registry_active" ON "public"."sys_mdm_registry" USING "btree" ("table_name", "is_active");



CREATE INDEX "idx_mdm_governance_suggestion_status" ON "public"."sys_mdm_suggestion" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_mdm_nhan_su_auth_user_id" ON "public"."mdm_nhan_su" USING "btree" ("auth_user_id");



CREATE INDEX "idx_mdm_nhan_su_list_order" ON "public"."mdm_nhan_su" USING "btree" ("is_active" DESC, "created_at" DESC);



CREATE INDEX "idx_mdm_nhan_su_nghe_nghiep_id" ON "public"."mdm_nhan_su" USING "btree" ("nghe_nghiep_id") WHERE ("nghe_nghiep_id" IS NOT NULL);



CREATE INDEX "idx_nkbv_mau_so_daily_date" ON "public"."nkbv_fact_mau_so_daily" USING "btree" ("ngay_ghi_nhan" DESC);



CREATE INDEX "idx_nkbv_mau_so_pt_ngay" ON "public"."nkbv_fact_mau_so_phau_thuat" USING "btree" ("ngay_phau_thuat" DESC);



CREATE INDEX "idx_nkbv_su_kien_ma_ba" ON "public"."nkbv_fact_su_kien" USING "btree" ("ma_benh_an");



CREATE INDEX "idx_nkbv_su_kien_ma_bn" ON "public"."nkbv_fact_su_kien" USING "btree" ("ma_benh_nhan");



CREATE INDEX "idx_nkbv_vi_sinh_ma_ba" ON "public"."nkbv_fact_vi_sinh" USING "btree" ("ma_benh_an");



CREATE INDEX "idx_nkbv_vi_sinh_ma_bn" ON "public"."nkbv_fact_vi_sinh" USING "btree" ("ma_benh_nhan");



CREATE INDEX "idx_nkbv_vi_sinh_ngay_lay" ON "public"."nkbv_fact_vi_sinh" USING "btree" ("ngay_lay_mau" DESC);



CREATE UNIQUE INDEX "idx_nkbv_vi_sinh_unique_key" ON "public"."nkbv_fact_vi_sinh" USING "btree" ((("metadata" ->> 'unique_key'::"text"))) WHERE ("is_active" = true);



CREATE INDEX "idx_quy_trinh_han_su_dung" ON "public"."cssd_fact_quy_trinh" USING "btree" ("han_su_dung");



CREATE INDEX "idx_quy_trinh_lo_tiet_khuan" ON "public"."cssd_fact_quy_trinh" USING "btree" ("lo_tiet_khuan_id");



CREATE INDEX "idx_quy_trinh_ma_vach_qr" ON "public"."cssd_fact_quy_trinh" USING "btree" ("ma_qr_quy_trinh");



CREATE INDEX "idx_quy_trinh_tinh_trang" ON "public"."cssd_fact_quy_trinh" USING "btree" ("tinh_trang");



CREATE INDEX "idx_role_permissions_permission_id" ON "public"."sys_role_permissions" USING "btree" ("permission_id");



CREATE INDEX "idx_role_permissions_role_id" ON "public"."sys_role_permissions" USING "btree" ("role_id");



CREATE INDEX "idx_su_co_attr_incident_group" ON "public"."cssd_fact_su_co" USING "btree" ((("attributes" ->> 'INCIDENT_GROUP'::"text")));



CREATE INDEX "idx_su_co_attr_rollback_target" ON "public"."cssd_fact_su_co" USING "btree" ((("attributes" ->> 'ROLLBACK_TARGET_STATION'::"text")));



CREATE INDEX "idx_su_co_attributes" ON "public"."cssd_fact_su_co" USING "gin" ("attributes" "jsonb_path_ops");



CREATE INDEX "idx_su_co_is_active" ON "public"."cssd_fact_su_co" USING "btree" ("is_active");



CREATE INDEX "idx_su_co_ma_vach" ON "public"."cssd_fact_su_co" USING "btree" ("ma_qr_quy_trinh");



CREATE INDEX "idx_su_co_quy_trinh" ON "public"."cssd_fact_su_co" USING "btree" ("quy_trinh_id");



CREATE INDEX "idx_su_co_red_alert" ON "public"."cssd_fact_su_co" USING "btree" ("is_red_alert");



CREATE INDEX "idx_su_co_updated_at" ON "public"."cssd_fact_su_co" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_sys_audit_log_action_changed_at" ON "public"."sys_audit_log" USING "btree" ("action", "changed_at" DESC);



CREATE INDEX "idx_sys_audit_log_changed_at_desc" ON "public"."sys_audit_log" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_sys_audit_log_changed_by" ON "public"."sys_audit_log" USING "btree" ("changed_by") WHERE ("changed_by" IS NOT NULL);



CREATE INDEX "idx_sys_audit_log_table_name_changed_at" ON "public"."sys_audit_log" USING "btree" ("table_name", "changed_at" DESC);



CREATE INDEX "idx_sys_audit_log_table_record" ON "public"."sys_audit_log" USING "btree" ("table_name", "record_id", "changed_at" DESC);



CREATE INDEX "idx_user_roles_role_id" ON "public"."sys_user_roles" USING "btree" ("role_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."sys_user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_vst_mom_sum_filters" ON "public"."gstt_fact_vst_moments_summary" USING "btree" ("ngay_giam_sat", "khoa_id", "nghe_nghiep_id", "moment_label");



CREATE INDEX "idx_vst_obs_session_id" ON "public"."gstt_fact_vst" USING "btree" ("session_id");



CREATE INDEX "idx_vst_opp_sum_filters" ON "public"."gstt_fact_vst_opportunities_summary" USING "btree" ("ngay_giam_sat", "khoa_id", "nghe_nghiep_id", "khu_vuc_id", "stype");



CREATE INDEX "idx_vst_opp_sum_supervisor" ON "public"."gstt_fact_vst_opportunities_summary" USING "btree" ("nguoi_giam_sat_id");



CREATE INDEX "idx_vst_sess_sum_filters" ON "public"."gstt_fact_vst_sessions_summary" USING "btree" ("ngay_giam_sat", "khoa_id", "khu_vuc_id", "stype");



CREATE INDEX "idx_vst_sess_sum_supervisor" ON "public"."gstt_fact_vst_sessions_summary" USING "btree" ("nguoi_giam_sat_id");



CREATE INDEX "idx_vst_sessions_created_at" ON "public"."gstt_fact_vst_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_vst_sessions_khoa_created" ON "public"."gstt_fact_vst_sessions" USING "btree" ("khoa_id", "created_at" DESC);



CREATE INDEX "idx_vst_sessions_khoa_id" ON "public"."gstt_fact_vst_sessions" USING "btree" ("khoa_id");



CREATE INDEX "idx_vst_sessions_khoa_ngay_active" ON "public"."gstt_fact_vst_sessions" USING "btree" ("khoa_id", "ngay_giam_sat") WHERE ("is_active" = true);



CREATE INDEX "idx_vst_sessions_khu_vuc_id" ON "public"."gstt_fact_vst_sessions" USING "btree" ("khu_vuc_id");



CREATE INDEX "idx_vst_sessions_ngay_khoa_active" ON "public"."gstt_fact_vst_sessions" USING "btree" ("ngay_giam_sat", "khoa_id") WHERE (COALESCE("is_active", true) = true);



CREATE INDEX "idx_vst_sessions_nguoi_giam_sat_id" ON "public"."gstt_fact_vst_sessions" USING "btree" ("nguoi_giam_sat_id");



CREATE INDEX "idx_vst_sessions_perf_filter" ON "public"."gstt_fact_vst_sessions" USING "btree" ("is_active", "ngay_giam_sat");



CREATE UNIQUE INDEX "uq_fact_quy_trinh_thanh_phan_qt_ten" ON "public"."cssd_fact_quy_trinh_thanh_phan" USING "btree" ("quy_trinh_id", "ten_dung_cu_le");



CREATE UNIQUE INDEX "uq_ho_so_nhan_vien_auth_user_id" ON "public"."mdm_nhan_su" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE OR REPLACE VIEW "public"."v_cssd_bo_dung_cu_summary" WITH ("security_invoker"='true') AS
 SELECT "b"."id",
    "b"."ma_bo",
    "b"."ten_bo",
    "b"."loai_dung_cu_id",
    "b"."khoa_su_dung_id",
    "b"."trang_thai",
    "b"."quy_cach",
    "b"."ghi_chu",
    "b"."ngay_kiem_ke_gan_nhat",
    "b"."is_active",
    "b"."created_at",
    "b"."updated_at",
    (COALESCE("q_active"."cnt", (0)::bigint))::integer AS "so_luong_bo",
    (COALESCE("count"(DISTINCT "c"."id") FILTER (WHERE ("c"."is_active" = true)), (0)::bigint))::integer AS "so_khoan",
    (COALESCE("sum"("c"."so_luong") FILTER (WHERE ("c"."is_active" = true)), (0)::bigint))::integer AS "tong_so_luong_dung_cu",
    (COALESCE("sum"("p"."so_luong_hien_tai") FILTER (WHERE ("p"."is_active" = true)), (0)::bigint))::integer AS "tong_phan_bo"
   FROM ((("public"."cssd_dm_bo_dung_cu" "b"
     LEFT JOIN ( SELECT "cssd_fact_quy_trinh"."bo_dung_cu_id",
            "count"("cssd_fact_quy_trinh"."id") AS "cnt"
           FROM "public"."cssd_fact_quy_trinh"
          WHERE (("cssd_fact_quy_trinh"."is_active" = true) AND (("cssd_fact_quy_trinh"."tinh_trang")::"text" IS DISTINCT FROM 'MAT'::"text"))
          GROUP BY "cssd_fact_quy_trinh"."bo_dung_cu_id") "q_active" ON (("q_active"."bo_dung_cu_id" = "b"."id")))
     LEFT JOIN "public"."cssd_dm_bo_dung_cu_chi_tiet" "c" ON (("c"."bo_dung_cu_id" = "b"."id")))
     LEFT JOIN "public"."cssd_dm_bo_phan_bo" "p" ON (("p"."bo_dung_cu_id" = "b"."id")))
  GROUP BY "b"."id", "q_active"."cnt";



CREATE OR REPLACE VIEW "public"."v_cssd_kho_le_realtime_qty" AS
 SELECT "l"."id" AS "loai_dung_cu_id",
    "l"."ma_loai",
    "l"."ten_loai",
    "l"."is_chiu_nhiet",
    "l"."phan_loai_spaulding",
    "l"."phuong_phap_tiet_khuan_chi_dinh" AS "phuong_phap_tiet_khuan",
    ((COALESCE("l"."so_luong_kho_du_phong", 0) + COALESCE("sum"("tx"."so_luong_thay_doi"), (0)::bigint)))::integer AS "so_luong_thuc_te"
   FROM ("public"."cssd_dm_loai_dung_cu" "l"
     LEFT JOIN "public"."cssd_fact_kho_giao_dich" "tx" ON ((("tx"."loai_dung_cu_id" = "l"."id") AND ("tx"."bo_dung_cu_id" IS NULL) AND ("tx"."is_active" = true))))
  GROUP BY "l"."id";



CREATE OR REPLACE VIEW "public"."v_cssd_loai_dung_cu_summary" WITH ("security_invoker"='true') AS
 SELECT "l"."id",
    "l"."ma_loai",
    "l"."ten_loai",
    "l"."mo_ta",
    "l"."created_at",
    "l"."updated_at",
    "l"."is_active",
    ("l"."specs" ->> 'ma_loai_dung_cu'::"text") AS "ma_loai_dung_cu",
    ("l"."specs" ->> 'ten_loai_dung_cu'::"text") AS "ten_loai_dung_cu",
    ("l"."specs" ->> 'hinh_dang'::"text") AS "hinh_dang",
    ("l"."specs" ->> 'kich_thuoc'::"text") AS "kich_thuoc",
    ("l"."specs" ->> 'cong_dung'::"text") AS "cong_dung",
    "l"."is_chiu_nhiet",
    "l"."phuong_phap_tiet_khuan_chi_dinh" AS "phuong_phap_tiet_khuan",
    "l"."phan_loai_spaulding",
    "l"."so_ngay_han_dung",
    "l"."phan_loai",
    "l"."so_luong_kho_du_phong",
    ((COALESCE("l"."so_luong_kho_du_phong", 0) + COALESCE("sum"(
        CASE
            WHEN (("b"."is_active" = true) AND ("c"."is_active" = true)) THEN "c"."so_luong"
            ELSE 0
        END), (0)::bigint)))::integer AS "so_luong_tong",
    COALESCE("jsonb_agg"(DISTINCT "jsonb_build_object"('id', "b"."id", 'ma_bo', "b"."ma_bo", 'ten_bo', "b"."ten_bo")) FILTER (WHERE (("b"."id" IS NOT NULL) AND ("b"."is_active" = true) AND ("c"."is_active" = true))), '[]'::"jsonb") AS "bo_dung_cu_chua"
   FROM (("public"."cssd_dm_loai_dung_cu" "l"
     LEFT JOIN "public"."cssd_dm_bo_dung_cu_chi_tiet" "c" ON (("c"."loai_dung_cu_id" = "l"."id")))
     LEFT JOIN "public"."cssd_dm_bo_dung_cu" "b" ON (("c"."bo_dung_cu_id" = "b"."id")))
  GROUP BY "l"."id";



CREATE OR REPLACE VIEW "public"."v_sys_staff_auth_overview" WITH ("security_invoker"='true') AS
 SELECT "ns"."id",
    "ns"."ma_nv",
    "ns"."ho_ten",
    ("ns"."extra_data" ->> 'email'::"text") AS "email",
    "ns"."is_active",
    "ns"."auth_user_id",
    COALESCE("array_agg"(DISTINCT "r"."name") FILTER (WHERE ("r"."name" IS NOT NULL)), ARRAY[]::"text"[]) AS "role_names"
   FROM (("public"."mdm_nhan_su" "ns"
     LEFT JOIN "public"."sys_user_roles" "ur" ON (("ur"."user_id" = "ns"."auth_user_id")))
     LEFT JOIN "public"."sys_roles" "r" ON (("r"."id" = "ur"."role_id")))
  GROUP BY "ns"."id";



CREATE OR REPLACE TRIGGER "trg_assert_gsc_sessions_not_locked" BEFORE DELETE OR UPDATE ON "public"."gstt_fact_chung_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_assert_vst_gsc_not_locked"();



CREATE OR REPLACE TRIGGER "trg_assert_vst_sessions_not_locked" BEFORE DELETE OR UPDATE ON "public"."gstt_fact_vst_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_assert_vst_gsc_not_locked"();



CREATE OR REPLACE TRIGGER "trg_audit_gsc_sessions" AFTER INSERT OR DELETE OR UPDATE ON "public"."gstt_fact_chung_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_audit_vst_sessions" AFTER INSERT OR DELETE OR UPDATE ON "public"."gstt_fact_vst_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_cssd_fact_bao_tri_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."cssd_fact_bao_tri" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_cssd_fact_dieu_chuyen_thanh_phan_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."cssd_fact_dieu_chuyen_thanh_phan" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_cssd_fact_kho_chi_tiet_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."cssd_fact_kho_chi_tiet" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_cssd_fact_kho_giao_dich_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."cssd_fact_kho_giao_dich" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_cssd_fact_kho_hoa_chat_giao_dich_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."cssd_fact_kho_hoa_chat_giao_dich" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_cssd_fact_lifecycle_event_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."cssd_fact_lifecycle_event" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_cssd_fact_lo_tiet_khuan_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."cssd_fact_lo_tiet_khuan" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_cssd_fact_quy_trinh_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."cssd_fact_quy_trinh" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_cssd_fact_quy_trinh_thanh_phan_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."cssd_fact_quy_trinh_thanh_phan" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_cssd_fact_su_co_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."cssd_fact_su_co" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_fact_qlcv_danh_gia_thang_touch" BEFORE UPDATE ON "public"."qlcv_fact_danh_gia_thang" FOR EACH ROW EXECUTE FUNCTION "public"."touch_fact_qlcv_danh_gia_thang"();



CREATE OR REPLACE TRIGGER "trg_inc_gia_han_so_lan" BEFORE UPDATE ON "public"."qlcv_fact_cong_viec" FOR EACH ROW EXECUTE FUNCTION "public"."fn_inc_gia_han_so_lan"();



CREATE OR REPLACE TRIGGER "trg_mdm_field_registry_on_change" AFTER INSERT OR UPDATE ON "public"."sys_mdm_registry" FOR EACH ROW EXECUTE FUNCTION "public"."fn_mdm_field_registry_attach_trigger"();



CREATE OR REPLACE TRIGGER "trg_set_hoan_thanh_luc" BEFORE UPDATE ON "public"."qlcv_fact_cong_viec" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_hoan_thanh_luc"();



CREATE OR REPLACE TRIGGER "trg_sync_vst_opp" AFTER INSERT OR DELETE OR UPDATE ON "public"."gstt_fact_vst" FOR EACH ROW EXECUTE FUNCTION "public"."fn_trigger_sync_vst_opp_row"();



CREATE OR REPLACE TRIGGER "trg_sync_vst_session" AFTER INSERT OR DELETE OR UPDATE ON "public"."gstt_fact_vst_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_trigger_sync_vst_session_row"();



CREATE OR REPLACE TRIGGER "trg_sys_audit_" AFTER INSERT OR DELETE OR UPDATE ON "public"."gstt_dm_bang_kiem" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_sys_audit_" AFTER INSERT OR DELETE OR UPDATE ON "public"."mdm_dm_khoa_phong" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_sys_audit_" AFTER INSERT OR DELETE OR UPDATE ON "public"."mdm_nhan_su" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_sys_audit_" AFTER INSERT OR DELETE OR UPDATE ON "public"."sys_lookup_value" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_sys_audit_" AFTER INSERT OR DELETE OR UPDATE ON "public"."sys_mdm_registry" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_sys_audit_" AFTER INSERT OR DELETE OR UPDATE ON "public"."sys_mdm_suggestion" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_sys_audit_" AFTER INSERT OR DELETE OR UPDATE ON "public"."sys_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_sys_audit_" AFTER INSERT OR DELETE OR UPDATE ON "public"."sys_role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_sys_audit_" AFTER INSERT OR DELETE OR UPDATE ON "public"."sys_roles" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_sys_audit_" AFTER INSERT OR DELETE OR UPDATE ON "public"."sys_user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sys_audit_row"();



CREATE OR REPLACE TRIGGER "trg_touch_updated_at_mdm_field_registry" BEFORE UPDATE ON "public"."sys_mdm_registry" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at_mdm_registry"();



CREATE OR REPLACE TRIGGER "trg_touch_updated_at_mdm_governance_suggestion" BEFORE UPDATE ON "public"."sys_mdm_suggestion" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at_mdm_registry"();



CREATE OR REPLACE TRIGGER "trg_update_danh_muc_bk_updated_at" BEFORE UPDATE ON "public"."gstt_dm_bang_kiem" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."cssd_dm_bo_phan_bo"
    ADD CONSTRAINT "cssd_dm_bo_phan_bo_bo_dung_cu_id_fkey" FOREIGN KEY ("bo_dung_cu_id") REFERENCES "public"."cssd_dm_bo_dung_cu"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cssd_dm_bo_phan_bo"
    ADD CONSTRAINT "cssd_dm_bo_phan_bo_khoa_phong_id_fkey" FOREIGN KEY ("khoa_phong_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cssd_dm_bo_dung_cu_chi_tiet"
    ADD CONSTRAINT "dm_bo_dung_cu_chi_tiet_bo_dung_cu_id_fkey" FOREIGN KEY ("bo_dung_cu_id") REFERENCES "public"."cssd_dm_bo_dung_cu"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cssd_dm_bo_dung_cu_chi_tiet"
    ADD CONSTRAINT "dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey" FOREIGN KEY ("loai_dung_cu_id") REFERENCES "public"."cssd_dm_loai_dung_cu"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_dm_bo_dung_cu"
    ADD CONSTRAINT "dm_bo_dung_cu_khoa_su_dung_id_fkey" FOREIGN KEY ("khoa_su_dung_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_dm_bo_dung_cu"
    ADD CONSTRAINT "dm_bo_dung_cu_loai_dung_cu_id_fkey" FOREIGN KEY ("loai_dung_cu_id") REFERENCES "public"."cssd_dm_loai_dung_cu"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_dm_khoa_phong"
    ADD CONSTRAINT "dm_khoa_phong_khoi_id_fkey" FOREIGN KEY ("khoi_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_bao_tri"
    ADD CONSTRAINT "fact_bao_tri_thiet_bi_thiet_bi_id_fkey" FOREIGN KEY ("thiet_bi_id") REFERENCES "public"."cssd_dm_thiet_bi"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec"
    ADD CONSTRAINT "fact_cong_viec_cong_viec_cha_id_fkey" FOREIGN KEY ("cong_viec_cha_id") REFERENCES "public"."qlcv_fact_cong_viec"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec"
    ADD CONSTRAINT "fact_cong_viec_dinh_ky_mau_fk" FOREIGN KEY ("dinh_ky_mau_id") REFERENCES "public"."qlcv_fact_cong_viec_dinh_ky"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec_dinh_ky"
    ADD CONSTRAINT "fact_cong_viec_dinh_ky_nguoi_phu_trach_id_fkey" FOREIGN KEY ("nguoi_phu_trach_id") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec_dinh_ky"
    ADD CONSTRAINT "fact_cong_viec_dinh_ky_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec_dinh_ky"
    ADD CONSTRAINT "fact_cong_viec_dinh_ky_to_cong_tac_id_fkey" FOREIGN KEY ("to_cong_tac_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec_hoat_dong"
    ADD CONSTRAINT "fact_cong_viec_hoat_dong_id_cong_viec_fkey" FOREIGN KEY ("id_cong_viec") REFERENCES "public"."qlcv_fact_cong_viec"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec_hoat_dong"
    ADD CONSTRAINT "fact_cong_viec_hoat_dong_nguoi_thuc_hien_id_fkey" FOREIGN KEY ("nguoi_thuc_hien_id") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec"
    ADD CONSTRAINT "fact_cong_viec_khoa_thuc_hien_id_fkey" FOREIGN KEY ("khoa_thuc_hien_id") REFERENCES "public"."mdm_dm_khoa_phong"("id");



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec"
    ADD CONSTRAINT "fact_cong_viec_nguoi_giao_viec_id_fkey" FOREIGN KEY ("nguoi_giao_viec_id") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec"
    ADD CONSTRAINT "fact_cong_viec_nguoi_phu_trach_id_fkey" FOREIGN KEY ("nguoi_phu_trach_id") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec"
    ADD CONSTRAINT "fact_cong_viec_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec"
    ADD CONSTRAINT "fact_cong_viec_to_cong_tac_id_fkey" FOREIGN KEY ("to_cong_tac_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_dieu_chuyen_thanh_phan"
    ADD CONSTRAINT "fact_cssd_dieu_chuyen_thanh_phan_den_quy_trinh_id_fkey" FOREIGN KEY ("den_quy_trinh_id") REFERENCES "public"."cssd_fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cssd_fact_dieu_chuyen_thanh_phan"
    ADD CONSTRAINT "fact_cssd_dieu_chuyen_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey" FOREIGN KEY ("dm_bo_dung_cu_chi_tiet_id") REFERENCES "public"."cssd_dm_bo_dung_cu_chi_tiet"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_dieu_chuyen_thanh_phan"
    ADD CONSTRAINT "fact_cssd_dieu_chuyen_thanh_phan_tu_quy_trinh_id_fkey" FOREIGN KEY ("tu_quy_trinh_id") REFERENCES "public"."cssd_fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cssd_fact_lifecycle_event"
    ADD CONSTRAINT "fact_cssd_lifecycle_event_quy_trinh_id_fkey" FOREIGN KEY ("quy_trinh_id") REFERENCES "public"."cssd_fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gstt_fact_chung_sessions"
    ADD CONSTRAINT "fact_giam_sat_chung_sessions_cach_thuc_id_fkey" FOREIGN KEY ("cach_thuc_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_chung_sessions"
    ADD CONSTRAINT "fact_giam_sat_chung_sessions_hinh_thuc_id_fkey" FOREIGN KEY ("hinh_thuc_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_vst_sessions"
    ADD CONSTRAINT "fact_giam_sat_vst_sessions_cach_thuc_id_fkey" FOREIGN KEY ("cach_thuc_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_vst_sessions"
    ADD CONSTRAINT "fact_giam_sat_vst_sessions_hinh_thuc_id_fkey" FOREIGN KEY ("hinh_thuc_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_kho_giao_dich"
    ADD CONSTRAINT "fact_kho_dung_cu_giao_dich_bo_dung_cu_id_fkey" FOREIGN KEY ("bo_dung_cu_id") REFERENCES "public"."cssd_dm_bo_dung_cu"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_kho_giao_dich"
    ADD CONSTRAINT "fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey" FOREIGN KEY ("loai_dung_cu_id") REFERENCES "public"."cssd_dm_loai_dung_cu"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cssd_fact_kho_giao_dich"
    ADD CONSTRAINT "fact_kho_dung_cu_giao_dich_quy_trinh_id_fkey" FOREIGN KEY ("quy_trinh_id") REFERENCES "public"."cssd_fact_quy_trinh"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_kho_hoa_chat_giao_dich"
    ADD CONSTRAINT "fact_kho_hoa_chat_giao_dich_dm_hoa_chat_id_fkey" FOREIGN KEY ("dm_hoa_chat_id") REFERENCES "public"."cssd_dm_hoa_chat"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."nkbv_fact_benh_an"
    ADD CONSTRAINT "fact_nkbv_benh_an_khoa_dieu_tri_fkey" FOREIGN KEY ("khoa_dieu_tri_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nkbv_fact_mau_so_daily"
    ADD CONSTRAINT "fact_nkbv_mau_so_daily_khoa_fkey" FOREIGN KEY ("khoa_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nkbv_fact_mau_so_phau_thuat"
    ADD CONSTRAINT "fact_nkbv_mau_so_pt_khoa_fkey" FOREIGN KEY ("khoa_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nkbv_fact_su_kien"
    ADD CONSTRAINT "fact_nkbv_su_kien_khoa_ghi_nhan_fkey" FOREIGN KEY ("khoa_ghi_nhan_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."nkbv_fact_su_kien"
    ADD CONSTRAINT "fact_nkbv_su_kien_loai_nkbv_fkey" FOREIGN KEY ("loai_nkbv_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."nkbv_fact_su_kien"
    ADD CONSTRAINT "fact_nkbv_su_kien_ma_benh_an_fkey" FOREIGN KEY ("ma_benh_an") REFERENCES "public"."nkbv_fact_benh_an"("ma_benh_an") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nkbv_fact_su_kien"
    ADD CONSTRAINT "fact_nkbv_su_kien_nguoi_ghi_fkey" FOREIGN KEY ("nguoi_ghi_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nkbv_fact_su_kien"
    ADD CONSTRAINT "fact_nkbv_su_kien_trang_thai_fkey" FOREIGN KEY ("trang_thai_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."nkbv_fact_su_kien"
    ADD CONSTRAINT "fact_nkbv_su_kien_vi_sinh_record_fkey" FOREIGN KEY ("vi_sinh_record_id") REFERENCES "public"."nkbv_fact_vi_sinh"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nkbv_fact_vi_sinh"
    ADD CONSTRAINT "fact_nkbv_vi_sinh_khoa_yeu_cau_fkey" FOREIGN KEY ("khoa_yeu_cau_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nkbv_fact_vi_sinh"
    ADD CONSTRAINT "fact_nkbv_vi_sinh_ma_benh_an_fkey" FOREIGN KEY ("ma_benh_an") REFERENCES "public"."nkbv_fact_benh_an"("ma_benh_an") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qlcv_fact_danh_gia_thang"
    ADD CONSTRAINT "fact_qlcv_danh_gia_thang_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."qlcv_fact_danh_gia_thang"
    ADD CONSTRAINT "fact_qlcv_danh_gia_thang_nhan_su_id_fkey" FOREIGN KEY ("nhan_su_id") REFERENCES "public"."mdm_nhan_su"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "fact_quy_trinh_quy_trinh_cha_id_fkey" FOREIGN KEY ("quy_trinh_cha_id") REFERENCES "public"."cssd_fact_quy_trinh"("id");



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh_thanh_phan"
    ADD CONSTRAINT "fact_quy_trinh_thanh_phan_dm_bo_dung_cu_chi_tiet_id_fkey" FOREIGN KEY ("dm_bo_dung_cu_chi_tiet_id") REFERENCES "public"."cssd_dm_bo_dung_cu_chi_tiet"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh_thanh_phan"
    ADD CONSTRAINT "fact_quy_trinh_thanh_phan_quy_trinh_id_fkey" FOREIGN KEY ("quy_trinh_id") REFERENCES "public"."cssd_fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qlcv_fact_cong_viec"
    ADD CONSTRAINT "fk_cong_viec_loai_cong_viec" FOREIGN KEY ("loai_cong_viec_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_kho_giao_dich"
    ADD CONSTRAINT "fk_cssd_kho_giao_dich_nguoi_thuc_hien" FOREIGN KEY ("nguoi_thuc_hien_id") REFERENCES "public"."mdm_nhan_su"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_dm_thiet_bi"
    ADD CONSTRAINT "fk_dm_thiet_bi_loai_may" FOREIGN KEY ("loai_may_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_chung_sessions"
    ADD CONSTRAINT "fk_gsc_sessions_bang_kiem" FOREIGN KEY ("bang_kiem_id") REFERENCES "public"."gstt_dm_bang_kiem"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_kho_chi_tiet"
    ADD CONSTRAINT "fk_kho_chi_tiet_vat_tu" FOREIGN KEY ("vat_tu_id") REFERENCES "public"."cssd_dm_hoa_chat"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_lo_tiet_khuan"
    ADD CONSTRAINT "fk_lo_tiet_khuan_loai_may" FOREIGN KEY ("loai_may_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_lo_tiet_khuan"
    ADD CONSTRAINT "fk_lo_tiet_khuan_nguoi_van_hanh" FOREIGN KEY ("nguoi_van_hanh_id") REFERENCES "public"."mdm_nhan_su"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "fk_quy_trinh_nguoi_cap_phat" FOREIGN KEY ("nguoi_cap_phat_id") REFERENCES "public"."mdm_nhan_su"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "fk_quy_trinh_nguoi_dang_giu" FOREIGN KEY ("nguoi_dang_giu_id") REFERENCES "public"."mdm_nhan_su"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "fk_quy_trinh_nguoi_dong_goi" FOREIGN KEY ("nguoi_dong_goi_id") REFERENCES "public"."mdm_nhan_su"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "fk_quy_trinh_nguoi_kiem_tra" FOREIGN KEY ("nguoi_kiem_tra_id") REFERENCES "public"."mdm_nhan_su"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "fk_quy_trinh_nguoi_lam_sach" FOREIGN KEY ("nguoi_lam_sach_id") REFERENCES "public"."mdm_nhan_su"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "fk_quy_trinh_nguoi_tiep_nhan" FOREIGN KEY ("nguoi_tiep_nhan_id") REFERENCES "public"."mdm_nhan_su"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "fk_quy_trinh_nguoi_tiet_khuan" FOREIGN KEY ("nguoi_tiet_khuan_id") REFERENCES "public"."mdm_nhan_su"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "fk_quy_trinh_tram_hien_tai" FOREIGN KEY ("tram_hien_tai_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cssd_fact_su_co"
    ADD CONSTRAINT "fk_su_co_loai_su_co" FOREIGN KEY ("loai_su_co_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_vst"
    ADD CONSTRAINT "fk_vst_obs_nghe_nghiep" FOREIGN KEY ("nghe_nghiep_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_khoa_id_fkey" FOREIGN KEY ("khoa_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_nghe_nghiep_id_fkey" FOREIGN KEY ("nghe_nghiep_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_nguoi_giam_sat_id_fkey" FOREIGN KEY ("nguoi_giam_sat_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_chung_sessions"
    ADD CONSTRAINT "giam_sat_chung_sessions_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_vst"
    ADD CONSTRAINT "giam_sat_vst_khoa_id_fkey" FOREIGN KEY ("khoa_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_vst"
    ADD CONSTRAINT "giam_sat_vst_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_vst"
    ADD CONSTRAINT "giam_sat_vst_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."gstt_fact_vst_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gstt_fact_vst_sessions"
    ADD CONSTRAINT "giam_sat_vst_sessions_khoa_id_fkey" FOREIGN KEY ("khoa_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gstt_fact_vst_sessions"
    ADD CONSTRAINT "giam_sat_vst_sessions_nguoi_giam_sat_id_fkey" FOREIGN KEY ("nguoi_giam_sat_id") REFERENCES "public"."mdm_nhan_su"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_chuc_danh_id_fkey" FOREIGN KEY ("chuc_danh_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_chuc_vu_id_fkey" FOREIGN KEY ("chuc_vu_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_khoa_id_fkey" FOREIGN KEY ("khoa_id") REFERENCES "public"."mdm_dm_khoa_phong"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "ho_so_nhan_vien_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_kho_chi_tiet"
    ADD CONSTRAINT "kho_chi_tiet_quy_trinh_id_fkey" FOREIGN KEY ("quy_trinh_id") REFERENCES "public"."cssd_fact_quy_trinh"("id");



ALTER TABLE ONLY "public"."cssd_fact_lo_tiet_khuan"
    ADD CONSTRAINT "lo_tiet_khuan_thiet_bi_id_fkey" FOREIGN KEY ("thiet_bi_id") REFERENCES "public"."cssd_dm_thiet_bi"("id");



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "mdm_nhan_su_nghe_nghiep_id_fkey" FOREIGN KEY ("nghe_nghiep_id") REFERENCES "public"."sys_lookup_value"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mdm_nhan_su"
    ADD CONSTRAINT "mdm_nhan_su_vai_tro_he_thong_id_fkey" FOREIGN KEY ("vai_tro_he_thong_id") REFERENCES "public"."sys_roles"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "quy_trinh_bo_dung_cu_id_fkey" FOREIGN KEY ("bo_dung_cu_id") REFERENCES "public"."cssd_dm_bo_dung_cu"("id");



ALTER TABLE ONLY "public"."cssd_fact_quy_trinh"
    ADD CONSTRAINT "quy_trinh_lo_tiet_khuan_id_fkey" FOREIGN KEY ("lo_tiet_khuan_id") REFERENCES "public"."cssd_fact_lo_tiet_khuan"("id");



ALTER TABLE ONLY "public"."sys_role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."sys_permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sys_role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."sys_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cssd_fact_su_co"
    ADD CONSTRAINT "su_co_nguoi_bao_id_fkey" FOREIGN KEY ("nguoi_bao_id") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."cssd_fact_su_co"
    ADD CONSTRAINT "su_co_nguoi_xac_nhan_id_fkey" FOREIGN KEY ("nguoi_xac_nhan_id") REFERENCES "public"."mdm_nhan_su"("id");



ALTER TABLE ONLY "public"."cssd_fact_su_co"
    ADD CONSTRAINT "su_co_quy_trinh_id_fkey" FOREIGN KEY ("quy_trinh_id") REFERENCES "public"."cssd_fact_quy_trinh"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sys_user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."sys_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sys_user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin full access" ON "public"."gstt_dm_bang_kiem" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access" ON "public"."gstt_fact_chung_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sys_user_roles" "ur"
     JOIN "public"."sys_roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access" ON "public"."gstt_fact_vst" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sys_user_roles" "ur"
     JOIN "public"."sys_roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'ADMIN'::"text")))));



CREATE POLICY "Admin full access" ON "public"."gstt_fact_vst_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sys_user_roles" "ur"
     JOIN "public"."sys_roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'ADMIN'::"text")))));



CREATE POLICY "Allow all for auth users" ON "public"."qlcv_fact_cong_viec" USING (true);



CREATE POLICY "Allow select for authenticated users" ON "public"."gstt_fact_gsc_dashboard_summary" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow select for authenticated users" ON "public"."gstt_fact_gsc_violations_summary" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow select for authenticated users" ON "public"."gstt_fact_vst_moments_summary" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow select for authenticated users" ON "public"."gstt_fact_vst_opportunities_summary" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow select for authenticated users" ON "public"."gstt_fact_vst_sessions_summary" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."gstt_dm_bang_kiem" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."gstt_fact_chung_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."gstt_fact_vst" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read access" ON "public"."gstt_fact_vst_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Cho phép thao tác fact_cong_viec" ON "public"."qlcv_fact_cong_viec" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."cssd_dm_bo_dung_cu" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_dm_bo_dung_cu_chi_tiet" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cssd_dm_bo_dung_cu_chi_tiet_delete" ON "public"."cssd_dm_bo_dung_cu_chi_tiet" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('BO_DC'::"text", 'delete'::"text"));



CREATE POLICY "cssd_dm_bo_dung_cu_chi_tiet_insert" ON "public"."cssd_dm_bo_dung_cu_chi_tiet" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('BO_DC'::"text", 'create'::"text"));



CREATE POLICY "cssd_dm_bo_dung_cu_chi_tiet_select" ON "public"."cssd_dm_bo_dung_cu_chi_tiet" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('BO_DC'::"text", 'view'::"text"));



CREATE POLICY "cssd_dm_bo_dung_cu_chi_tiet_update" ON "public"."cssd_dm_bo_dung_cu_chi_tiet" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('BO_DC'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('BO_DC'::"text", 'edit'::"text"));



CREATE POLICY "cssd_dm_bo_dung_cu_delete" ON "public"."cssd_dm_bo_dung_cu" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('BO_DC'::"text", 'delete'::"text"));



CREATE POLICY "cssd_dm_bo_dung_cu_insert" ON "public"."cssd_dm_bo_dung_cu" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('BO_DC'::"text", 'create'::"text"));



CREATE POLICY "cssd_dm_bo_dung_cu_select" ON "public"."cssd_dm_bo_dung_cu" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('BO_DC'::"text", 'view'::"text"));



CREATE POLICY "cssd_dm_bo_dung_cu_update" ON "public"."cssd_dm_bo_dung_cu" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('BO_DC'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('BO_DC'::"text", 'edit'::"text"));



ALTER TABLE "public"."cssd_dm_bo_phan_bo" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cssd_dm_bo_phan_bo_delete" ON "public"."cssd_dm_bo_phan_bo" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('CSSD_KHO_DUNGCU'::"text", 'delete'::"text"));



CREATE POLICY "cssd_dm_bo_phan_bo_insert" ON "public"."cssd_dm_bo_phan_bo" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('CSSD_KHO_DUNGCU'::"text", 'create'::"text"));



CREATE POLICY "cssd_dm_bo_phan_bo_select" ON "public"."cssd_dm_bo_phan_bo" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('CSSD_KHO_DUNGCU'::"text", 'view'::"text"));



CREATE POLICY "cssd_dm_bo_phan_bo_update" ON "public"."cssd_dm_bo_phan_bo" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('CSSD_KHO_DUNGCU'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('CSSD_KHO_DUNGCU'::"text", 'edit'::"text"));



ALTER TABLE "public"."cssd_dm_hoa_chat" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cssd_dm_hoa_chat_delete" ON "public"."cssd_dm_hoa_chat" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('HOA_CHAT'::"text", 'delete'::"text"));



CREATE POLICY "cssd_dm_hoa_chat_insert" ON "public"."cssd_dm_hoa_chat" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('HOA_CHAT'::"text", 'create'::"text"));



CREATE POLICY "cssd_dm_hoa_chat_select" ON "public"."cssd_dm_hoa_chat" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('HOA_CHAT'::"text", 'view'::"text"));



CREATE POLICY "cssd_dm_hoa_chat_update" ON "public"."cssd_dm_hoa_chat" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('HOA_CHAT'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('HOA_CHAT'::"text", 'edit'::"text"));



ALTER TABLE "public"."cssd_dm_loai_dung_cu" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cssd_dm_loai_dung_cu_delete" ON "public"."cssd_dm_loai_dung_cu" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('LOAI_DC'::"text", 'delete'::"text"));



CREATE POLICY "cssd_dm_loai_dung_cu_insert" ON "public"."cssd_dm_loai_dung_cu" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('LOAI_DC'::"text", 'create'::"text"));



CREATE POLICY "cssd_dm_loai_dung_cu_select" ON "public"."cssd_dm_loai_dung_cu" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('LOAI_DC'::"text", 'view'::"text"));



CREATE POLICY "cssd_dm_loai_dung_cu_update" ON "public"."cssd_dm_loai_dung_cu" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('LOAI_DC'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('LOAI_DC'::"text", 'edit'::"text"));



ALTER TABLE "public"."cssd_dm_thiet_bi" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cssd_dm_thiet_bi_delete" ON "public"."cssd_dm_thiet_bi" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('THIET_BI'::"text", 'delete'::"text"));



CREATE POLICY "cssd_dm_thiet_bi_insert" ON "public"."cssd_dm_thiet_bi" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('THIET_BI'::"text", 'create'::"text"));



CREATE POLICY "cssd_dm_thiet_bi_select" ON "public"."cssd_dm_thiet_bi" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('THIET_BI'::"text", 'view'::"text"));



CREATE POLICY "cssd_dm_thiet_bi_update" ON "public"."cssd_dm_thiet_bi" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('THIET_BI'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('THIET_BI'::"text", 'edit'::"text"));



ALTER TABLE "public"."cssd_fact_bao_tri" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_fact_dieu_chuyen_thanh_phan" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cssd_fact_dieu_chuyen_thanh_phan_all_authenticated" ON "public"."cssd_fact_dieu_chuyen_thanh_phan" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "cssd_fact_dieu_chuyen_thanh_phan_select_authenticated" ON "public"."cssd_fact_dieu_chuyen_thanh_phan" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cssd_fact_kho_chi_tiet" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cssd_fact_kho_chi_tiet_all_authenticated" ON "public"."cssd_fact_kho_chi_tiet" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "cssd_fact_kho_chi_tiet_select_authenticated" ON "public"."cssd_fact_kho_chi_tiet" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cssd_fact_kho_giao_dich" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_fact_kho_hoa_chat_giao_dich" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_fact_lifecycle_event" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cssd_fact_lifecycle_event_all_authenticated" ON "public"."cssd_fact_lifecycle_event" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "cssd_fact_lifecycle_event_select_authenticated" ON "public"."cssd_fact_lifecycle_event" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cssd_fact_lo_tiet_khuan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_fact_quy_trinh" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_fact_quy_trinh_thanh_phan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cssd_fact_su_co" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dm_bo_dung_cu_chi_tiet_select_auth_v1" ON "public"."cssd_dm_bo_dung_cu_chi_tiet" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dm_bo_dung_cu_chi_tiet_update_auth_v1" ON "public"."cssd_dm_bo_dung_cu_chi_tiet" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "dm_bo_dung_cu_select_auth_v1" ON "public"."cssd_dm_bo_dung_cu" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dm_hoa_chat_admin_all" ON "public"."cssd_dm_hoa_chat" TO "authenticated" USING (true);



CREATE POLICY "dm_hoa_chat_select_all" ON "public"."cssd_dm_hoa_chat" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dm_khoa_phong_select_auth_v1" ON "public"."mdm_dm_khoa_phong" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dm_nkbv_cdc_baselines_delete" ON "public"."nkbv_dm_cdc_baseline" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "dm_nkbv_cdc_baselines_insert" ON "public"."nkbv_dm_cdc_baseline" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "dm_nkbv_cdc_baselines_select" ON "public"."nkbv_dm_cdc_baseline" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dm_nkbv_cdc_baselines_update" ON "public"."nkbv_dm_cdc_baseline" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_bao_tri_thiet_bi_all_auth" ON "public"."cssd_fact_bao_tri" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_bao_tri_thiet_bi_select_auth" ON "public"."cssd_fact_bao_tri" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_kho_dung_cu_giao_dich_all_auth" ON "public"."cssd_fact_kho_giao_dich" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_kho_dung_cu_giao_dich_select_auth" ON "public"."cssd_fact_kho_giao_dich" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_kho_hc_all_auth" ON "public"."cssd_fact_kho_hoa_chat_giao_dich" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_kho_hc_select_auth" ON "public"."cssd_fact_kho_hoa_chat_giao_dich" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_lo_tiet_khuan_select_authenticated" ON "public"."cssd_fact_lo_tiet_khuan" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_benh_an_delete" ON "public"."nkbv_fact_benh_an" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_benh_an_insert" ON "public"."nkbv_fact_benh_an" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "fact_nkbv_benh_an_select" ON "public"."nkbv_fact_benh_an" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_benh_an_update" ON "public"."nkbv_fact_benh_an" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_nkbv_mau_so_daily_delete" ON "public"."nkbv_fact_mau_so_daily" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_mau_so_daily_insert" ON "public"."nkbv_fact_mau_so_daily" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "fact_nkbv_mau_so_daily_select" ON "public"."nkbv_fact_mau_so_daily" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_mau_so_daily_update" ON "public"."nkbv_fact_mau_so_daily" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_nkbv_mau_so_phau_thuat_delete" ON "public"."nkbv_fact_mau_so_phau_thuat" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_mau_so_phau_thuat_insert" ON "public"."nkbv_fact_mau_so_phau_thuat" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "fact_nkbv_mau_so_phau_thuat_select" ON "public"."nkbv_fact_mau_so_phau_thuat" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_mau_so_phau_thuat_update" ON "public"."nkbv_fact_mau_so_phau_thuat" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_nkbv_su_kien_delete" ON "public"."nkbv_fact_su_kien" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_su_kien_insert" ON "public"."nkbv_fact_su_kien" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "fact_nkbv_su_kien_select" ON "public"."nkbv_fact_su_kien" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_su_kien_update" ON "public"."nkbv_fact_su_kien" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_nkbv_vi_sinh_delete" ON "public"."nkbv_fact_vi_sinh" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_vi_sinh_insert" ON "public"."nkbv_fact_vi_sinh" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "fact_nkbv_vi_sinh_select" ON "public"."nkbv_fact_vi_sinh" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_nkbv_vi_sinh_update" ON "public"."nkbv_fact_vi_sinh" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "fact_qlcv_danh_gia_thang_select_authenticated" ON "public"."qlcv_fact_danh_gia_thang" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."mdm_nhan_su" "m"
  WHERE ("m"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "fact_quy_trinh_select_authenticated" ON "public"."cssd_fact_quy_trinh" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_quy_trinh_thanh_phan_select_authenticated" ON "public"."cssd_fact_quy_trinh_thanh_phan" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "fact_su_co_select_authenticated" ON "public"."cssd_fact_su_co" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "gsc_sessions_select_authenticated" ON "public"."gstt_fact_chung_sessions" FOR SELECT TO "authenticated" USING ((COALESCE("is_active", true) = true));



ALTER TABLE "public"."gstt_dm_bang_kiem" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gstt_dm_bang_kiem_delete" ON "public"."gstt_dm_bang_kiem" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('BANG_KIEM'::"text", 'delete'::"text"));



CREATE POLICY "gstt_dm_bang_kiem_insert" ON "public"."gstt_dm_bang_kiem" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('BANG_KIEM'::"text", 'create'::"text"));



CREATE POLICY "gstt_dm_bang_kiem_select" ON "public"."gstt_dm_bang_kiem" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('BANG_KIEM'::"text", 'view'::"text"));



CREATE POLICY "gstt_dm_bang_kiem_update" ON "public"."gstt_dm_bang_kiem" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('BANG_KIEM'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('BANG_KIEM'::"text", 'edit'::"text"));



ALTER TABLE "public"."gstt_fact_chung_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gstt_fact_gsc_dashboard_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gstt_fact_gsc_violations_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gstt_fact_vst" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gstt_fact_vst_moments_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gstt_fact_vst_opportunities_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gstt_fact_vst_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gstt_fact_vst_sessions_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mdm_dm_khoa_phong" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mdm_dm_khoa_phong_delete" ON "public"."mdm_dm_khoa_phong" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'delete'::"text"));



CREATE POLICY "mdm_dm_khoa_phong_insert" ON "public"."mdm_dm_khoa_phong" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'create'::"text"));



CREATE POLICY "mdm_dm_khoa_phong_select" ON "public"."mdm_dm_khoa_phong" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'view'::"text"));



CREATE POLICY "mdm_dm_khoa_phong_update" ON "public"."mdm_dm_khoa_phong" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'edit'::"text"));



ALTER TABLE "public"."mdm_nhan_su" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mdm_nhan_su_delete" ON "public"."mdm_nhan_su" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('NHAN_SU'::"text", 'delete'::"text"));



CREATE POLICY "mdm_nhan_su_insert" ON "public"."mdm_nhan_su" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('NHAN_SU'::"text", 'create'::"text"));



CREATE POLICY "mdm_nhan_su_select" ON "public"."mdm_nhan_su" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('NHAN_SU'::"text", 'view'::"text"));



CREATE POLICY "mdm_nhan_su_select_auth_v1" ON "public"."mdm_nhan_su" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "mdm_nhan_su_select_authenticated" ON "public"."mdm_nhan_su" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "mdm_nhan_su_update" ON "public"."mdm_nhan_su" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('NHAN_SU'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('NHAN_SU'::"text", 'edit'::"text"));



ALTER TABLE "public"."nkbv_dm_cdc_baseline" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nkbv_fact_benh_an" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nkbv_fact_mau_so_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nkbv_fact_mau_so_phau_thuat" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nkbv_fact_su_kien" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nkbv_fact_vi_sinh" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permissions_admin_full_access_v2" ON "public"."sys_permissions" TO "authenticated" USING ("public"."is_admin_user"("auth"."uid"())) WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "permissions_select_all_authenticated_v2" ON "public"."sys_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "qlcv_delete_service_role" ON "public"."qlcv_fact_cong_viec" FOR DELETE TO "service_role" USING (true);



ALTER TABLE "public"."qlcv_fact_cong_viec" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qlcv_fact_cong_viec_dinh_ky" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qlcv_fact_cong_viec_hoat_dong" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qlcv_fact_danh_gia_thang" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qlcv_hd_insert_service_role" ON "public"."qlcv_fact_cong_viec_hoat_dong" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "qlcv_hd_select_authenticated" ON "public"."qlcv_fact_cong_viec_hoat_dong" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "qlcv_hd_select_service_role" ON "public"."qlcv_fact_cong_viec_hoat_dong" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "qlcv_insert_service_role" ON "public"."qlcv_fact_cong_viec" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "qlcv_select_authenticated_own_khoa" ON "public"."qlcv_fact_cong_viec" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "qlcv_select_authenticated_own_khoa" ON "public"."qlcv_fact_cong_viec" IS 'Phase 1: permissive — enforcement ở application layer (Server Actions + verifyPermission). Phase 2: sẽ thêm strict khoa filter sau khi xác nhận khoa_id đầy đủ trong mdm_nhan_su.';



CREATE POLICY "qlcv_select_service_role" ON "public"."qlcv_fact_cong_viec" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "qlcv_update_service_role" ON "public"."qlcv_fact_cong_viec" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "role_permissions_admin_full_access_v2" ON "public"."sys_role_permissions" TO "authenticated" USING ("public"."is_admin_user"("auth"."uid"())) WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "role_permissions_select_all_authenticated_v2" ON "public"."sys_role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "roles_admin_full_access_v2" ON "public"."sys_roles" TO "authenticated" USING ("public"."is_admin_user"("auth"."uid"())) WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "roles_select_all_authenticated_v2" ON "public"."sys_roles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."sys_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sys_audit_log_select_policy" ON "public"."sys_audit_log" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."sys_user_roles" "ur"
     JOIN "public"."sys_roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("upper"(TRIM(BOTH FROM "r"."name")) = 'ADMIN'::"text") AND ("r"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM ((("public"."sys_user_roles" "ur"
     JOIN "public"."sys_roles" "r" ON (("ur"."role_id" = "r"."id")))
     JOIN "public"."sys_role_permissions" "rp" ON (("r"."id" = "rp"."role_id")))
     JOIN "public"."sys_permissions" "p" ON (("rp"."permission_id" = "p"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("p"."module_name" = 'PHAN_QUYEN'::"text") AND ("p"."action" = 'view'::"text") AND ("r"."is_active" = true)))) OR ("changed_by" = "auth"."uid"()) OR ("changed_by" IS NULL)));



ALTER TABLE "public"."sys_lookup_value" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sys_lookup_value_delete" ON "public"."sys_lookup_value" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'delete'::"text"));



CREATE POLICY "sys_lookup_value_insert" ON "public"."sys_lookup_value" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'create'::"text"));



CREATE POLICY "sys_lookup_value_select" ON "public"."sys_lookup_value" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'view'::"text"));



CREATE POLICY "sys_lookup_value_update" ON "public"."sys_lookup_value" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'edit'::"text"));



ALTER TABLE "public"."sys_mdm_registry" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sys_mdm_registry_delete" ON "public"."sys_mdm_registry" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'delete'::"text"));



CREATE POLICY "sys_mdm_registry_insert" ON "public"."sys_mdm_registry" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'create'::"text"));



CREATE POLICY "sys_mdm_registry_select" ON "public"."sys_mdm_registry" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'view'::"text"));



CREATE POLICY "sys_mdm_registry_update" ON "public"."sys_mdm_registry" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'edit'::"text"));



ALTER TABLE "public"."sys_mdm_suggestion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sys_mdm_suggestion_delete" ON "public"."sys_mdm_suggestion" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'delete'::"text"));



CREATE POLICY "sys_mdm_suggestion_insert" ON "public"."sys_mdm_suggestion" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'create'::"text"));



CREATE POLICY "sys_mdm_suggestion_select" ON "public"."sys_mdm_suggestion" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'view'::"text"));



CREATE POLICY "sys_mdm_suggestion_update" ON "public"."sys_mdm_suggestion" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('DANH_MUC'::"text", 'edit'::"text"));



ALTER TABLE "public"."sys_module_locks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sys_module_locks_all" ON "public"."sys_module_locks" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "sys_module_locks_select" ON "public"."sys_module_locks" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."sys_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sys_permissions_delete" ON "public"."sys_permissions" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'delete'::"text"));



CREATE POLICY "sys_permissions_insert" ON "public"."sys_permissions" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'create'::"text"));



CREATE POLICY "sys_permissions_select" ON "public"."sys_permissions" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'view'::"text"));



CREATE POLICY "sys_permissions_update" ON "public"."sys_permissions" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'edit'::"text"));



ALTER TABLE "public"."sys_role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sys_role_permissions_delete" ON "public"."sys_role_permissions" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'delete'::"text"));



CREATE POLICY "sys_role_permissions_insert" ON "public"."sys_role_permissions" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'create'::"text"));



CREATE POLICY "sys_role_permissions_select" ON "public"."sys_role_permissions" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'view'::"text"));



CREATE POLICY "sys_role_permissions_update" ON "public"."sys_role_permissions" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'edit'::"text"));



ALTER TABLE "public"."sys_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sys_roles_delete" ON "public"."sys_roles" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'delete'::"text"));



CREATE POLICY "sys_roles_insert" ON "public"."sys_roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'create'::"text"));



CREATE POLICY "sys_roles_select" ON "public"."sys_roles" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'view'::"text"));



CREATE POLICY "sys_roles_update" ON "public"."sys_roles" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'edit'::"text"));



ALTER TABLE "public"."sys_user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sys_user_roles_delete" ON "public"."sys_user_roles" FOR DELETE TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'delete'::"text"));



CREATE POLICY "sys_user_roles_insert" ON "public"."sys_user_roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'create'::"text"));



CREATE POLICY "sys_user_roles_select" ON "public"."sys_user_roles" FOR SELECT TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'view'::"text"));



CREATE POLICY "sys_user_roles_update" ON "public"."sys_user_roles" FOR UPDATE TO "authenticated" USING ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'edit'::"text")) WITH CHECK ("public"."fn_sys_has_permission"('PHAN_QUYEN'::"text", 'edit'::"text"));



CREATE POLICY "user_roles_admin_full_access_v2" ON "public"."sys_user_roles" TO "authenticated" USING ("public"."is_admin_user"("auth"."uid"())) WITH CHECK ("public"."is_admin_user"("auth"."uid"()));



CREATE POLICY "user_roles_self_or_admin_select_v2" ON "public"."sys_user_roles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin_user"("auth"."uid"())));



CREATE POLICY "vst_sessions_select_authenticated" ON "public"."gstt_fact_vst_sessions" FOR SELECT TO "authenticated" USING ((COALESCE("is_active", true) = true));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."block_writes_for_migrated_danh_muc"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_writes_for_migrated_danh_muc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_writes_for_migrated_danh_muc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bv103_norm_label"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."bv103_norm_label"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bv103_norm_label"("p" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_admin_module_stats"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_admin_module_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_admin_module_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_admin_module_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_assert_vst_gsc_not_locked"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_assert_vst_gsc_not_locked"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_assert_vst_gsc_not_locked"() TO "service_role";



-- fn_bv103_audit_row grants removed



GRANT ALL ON FUNCTION "public"."fn_cssd_check_set_heat_resistance"("p_bo_dung_cu_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_cssd_check_set_heat_resistance"("p_bo_dung_cu_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_cssd_check_set_heat_resistance"("p_bo_dung_cu_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_fact_cong_viec_spawn_dinh_ky_hom_nay"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_fact_cong_viec_spawn_dinh_ky_hom_nay"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_fact_cong_viec_spawn_dinh_ky_hom_nay"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_session_stype"("p_nguoi_giam_sat_id" "uuid", "p_target_khoa_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_session_stype"("p_nguoi_giam_sat_id" "uuid", "p_target_khoa_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_session_stype"("p_nguoi_giam_sat_id" "uuid", "p_target_khoa_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_gstt_failure_reason_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_gstt_failure_reason_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_gstt_failure_reason_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_gstt_rca_gen_ma_ticket"("p_created" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_gstt_rca_gen_ma_ticket"("p_created" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_gstt_rca_gen_ma_ticket"("p_created" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_inc_gia_han_so_lan"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_inc_gia_han_so_lan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_inc_gia_han_so_lan"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_mdm_field_registry_attach_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_mdm_field_registry_attach_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_mdm_field_registry_attach_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_mdm_validate_lookup_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_mdm_validate_lookup_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_mdm_validate_lookup_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_nkbv_dich_te_hoc_rates"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_nkbv_dich_te_hoc_rates"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_nkbv_dich_te_hoc_rates"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_nkbv_ssi_rates_by_surgery"("p_tu_ngay" "date", "p_den_ngay" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_nkbv_ssi_rates_by_surgery"("p_tu_ngay" "date", "p_den_ngay" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_nkbv_ssi_rates_by_surgery"("p_tu_ngay" "date", "p_den_ngay" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_qlcv_analytics_summary"("p_khoa_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_qlcv_analytics_summary"("p_khoa_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_qlcv_analytics_summary"("p_khoa_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_qlcv_get_actor_khoa_id"("p_nhan_su_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_qlcv_get_actor_khoa_id"("p_nhan_su_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_qlcv_get_actor_khoa_id"("p_nhan_su_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_qlcv_tong_hop_thang"("p_thang" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_qlcv_tong_hop_thang"("p_thang" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_qlcv_tong_hop_thang"("p_thang" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_refresh_mv_gsc_session_daily"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_refresh_mv_gsc_session_daily"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_refresh_mv_gsc_session_daily"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_set_hoan_thanh_luc"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_set_hoan_thanh_luc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_set_hoan_thanh_luc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_dashboard_pre_aggregates"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_dashboard_pre_aggregates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_dashboard_pre_aggregates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_overdue_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_overdue_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_overdue_tasks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_single_gsc_session"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_single_gsc_session"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_single_gsc_session"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sync_single_vst_session"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_single_vst_session"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_single_vst_session"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sys_attach_admin_rls"("p_table" "regclass", "p_module" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sys_attach_admin_rls"("p_table" "regclass", "p_module" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sys_attach_admin_rls"("p_table" "regclass", "p_module" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sys_audit_attach"("p_table" "regclass") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sys_audit_attach"("p_table" "regclass") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sys_audit_attach"("p_table" "regclass") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sys_audit_log_purge"("p_retain_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sys_audit_log_purge"("p_retain_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sys_audit_log_purge"("p_retain_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sys_audit_row"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sys_audit_row"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sys_audit_row"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sys_has_permission"("p_module" "text", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sys_has_permission"("p_module" "text", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sys_has_permission"("p_module" "text", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sys_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sys_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sys_is_admin"() TO "service_role";



-- fn_trigger_audit_vst_gsc grants removed



GRANT ALL ON FUNCTION "public"."fn_trigger_sync_gsc_result_row"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_trigger_sync_gsc_result_row"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_trigger_sync_gsc_result_row"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_trigger_sync_vst_opp_row"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_trigger_sync_vst_opp_row"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_trigger_sync_vst_opp_row"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_trigger_sync_vst_session_row"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_trigger_sync_vst_session_row"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_trigger_sync_vst_session_row"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."rpc_dashboard_gsc_strategic_analytics"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_hinh_thuc_ids" "text"[], "p_bang_kiem_mas" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_gsc_strategic_analytics"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_hinh_thuc_ids" "text"[], "p_bang_kiem_mas" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_gsc_strategic_analytics"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_hinh_thuc_ids" "text"[], "p_bang_kiem_mas" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_dashboard_vst_strategic_analytics"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_hinh_thuc_ids" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_vst_strategic_analytics"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_hinh_thuc_ids" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_dashboard_vst_strategic_analytics"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_hinh_thuc_ids" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_dm_bang_kiem_max_numeric_suffix"("p_prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_dm_bang_kiem_max_numeric_suffix"("p_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_dm_bang_kiem_max_numeric_suffix"("p_prefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_multi_v1"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_multi_v1"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_multi_v1"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_multi_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_multi_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_multi_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_bang_kiem_mas" "text"[], "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_supervision_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_v4"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_v4"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_compliance_dashboard_v4"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_khoa_overview_rows"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_khoa_overview_rows"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_khoa_overview_rows"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_ksnk_staff_supervision_stats"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_ksnk_staff_supervision_stats"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_ksnk_staff_supervision_stats"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_summary_table"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_summary_table"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_dashboard_summary_table"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_registry_options"("p_categories" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_registry_options"("p_categories" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_registry_options"("p_categories" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_vst_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_vst_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_vst_dashboard"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoa_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_vst_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_trend_type" "text", "p_supervision_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_vst_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_trend_type" "text", "p_supervision_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_vst_dashboard_v2"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_trend_type" "text", "p_supervision_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_vst_moment_table_only"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_trend_type" "text", "p_supervision_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_vst_moment_table_only"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_trend_type" "text", "p_supervision_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_vst_moment_table_only"("p_tu_ngay" "date", "p_den_ngay" "date", "p_khoi_ids" "uuid"[], "p_khoa_ids" "uuid"[], "p_nghe_nghiep_ids" "uuid"[], "p_khu_vuc_ids" "uuid"[], "p_trend_type" "text", "p_supervision_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_mdm_nhan_su_max_numeric_suffix"("p_prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_mdm_nhan_su_max_numeric_suffix"("p_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_mdm_nhan_su_max_numeric_suffix"("p_prefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reorder_tieu_chi_bang_kiem"("p_bang_kiem_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reorder_tieu_chi_bang_kiem"("p_bang_kiem_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reorder_tieu_chi_bang_kiem"("p_bang_kiem_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_scan_workflow_station"("p_ma_qr" "text", "p_target_station" "text", "p_operator_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_scan_workflow_station"("p_ma_qr" "text", "p_target_station" "text", "p_operator_label" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_scan_workflow_station"("p_ma_qr" "text", "p_target_station" "text", "p_operator_label" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_fact_qlcv_danh_gia_thang"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_fact_qlcv_danh_gia_thang"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_fact_qlcv_danh_gia_thang"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at_mdm_registry"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at_mdm_registry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at_mdm_registry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."cssd_dm_bo_dung_cu" TO "anon";
GRANT ALL ON TABLE "public"."cssd_dm_bo_dung_cu" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_dm_bo_dung_cu" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_dm_bo_dung_cu_chi_tiet" TO "anon";
GRANT ALL ON TABLE "public"."cssd_dm_bo_dung_cu_chi_tiet" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_dm_bo_dung_cu_chi_tiet" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_dm_bo_phan_bo" TO "anon";
GRANT ALL ON TABLE "public"."cssd_dm_bo_phan_bo" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_dm_bo_phan_bo" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_dm_hoa_chat" TO "anon";
GRANT ALL ON TABLE "public"."cssd_dm_hoa_chat" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_dm_hoa_chat" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_dm_loai_dung_cu" TO "anon";
GRANT ALL ON TABLE "public"."cssd_dm_loai_dung_cu" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_dm_loai_dung_cu" TO "service_role";



GRANT ALL ON TABLE "public"."sys_lookup_value" TO "anon";
GRANT ALL ON TABLE "public"."sys_lookup_value" TO "authenticated";
GRANT ALL ON TABLE "public"."sys_lookup_value" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_dm_loai_may" TO "anon";
GRANT ALL ON TABLE "public"."cssd_dm_loai_may" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_dm_loai_may" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_dm_thiet_bi" TO "anon";
GRANT ALL ON TABLE "public"."cssd_dm_thiet_bi" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_dm_thiet_bi" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_dm_tram" TO "anon";
GRANT ALL ON TABLE "public"."cssd_dm_tram" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_dm_tram" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_fact_bao_tri" TO "anon";
GRANT ALL ON TABLE "public"."cssd_fact_bao_tri" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_fact_bao_tri" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_fact_dieu_chuyen_thanh_phan" TO "anon";
GRANT ALL ON TABLE "public"."cssd_fact_dieu_chuyen_thanh_phan" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_fact_dieu_chuyen_thanh_phan" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_fact_kho_chi_tiet" TO "anon";
GRANT ALL ON TABLE "public"."cssd_fact_kho_chi_tiet" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_fact_kho_chi_tiet" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_fact_kho_giao_dich" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_fact_kho_giao_dich" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_fact_kho_hoa_chat_giao_dich" TO "anon";
GRANT ALL ON TABLE "public"."cssd_fact_kho_hoa_chat_giao_dich" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_fact_kho_hoa_chat_giao_dich" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_fact_lifecycle_event" TO "anon";
GRANT ALL ON TABLE "public"."cssd_fact_lifecycle_event" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_fact_lifecycle_event" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_fact_lo_tiet_khuan" TO "anon";
GRANT ALL ON TABLE "public"."cssd_fact_lo_tiet_khuan" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_fact_lo_tiet_khuan" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_fact_quy_trinh" TO "anon";
GRANT ALL ON TABLE "public"."cssd_fact_quy_trinh" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_fact_quy_trinh" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_fact_quy_trinh_thanh_phan" TO "anon";
GRANT ALL ON TABLE "public"."cssd_fact_quy_trinh_thanh_phan" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_fact_quy_trinh_thanh_phan" TO "service_role";



GRANT ALL ON TABLE "public"."cssd_fact_su_co" TO "anon";
GRANT ALL ON TABLE "public"."cssd_fact_su_co" TO "authenticated";
GRANT ALL ON TABLE "public"."cssd_fact_su_co" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_dm_bang_kiem" TO "anon";
GRANT ALL ON TABLE "public"."gstt_dm_bang_kiem" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_dm_bang_kiem" TO "service_role";



GRANT ALL ON TABLE "public"."dm_bang_kiem" TO "anon";
GRANT ALL ON TABLE "public"."dm_bang_kiem" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_bang_kiem" TO "service_role";



GRANT ALL ON TABLE "public"."dm_bo_dung_cu" TO "anon";
GRANT ALL ON TABLE "public"."dm_bo_dung_cu" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_bo_dung_cu" TO "service_role";



GRANT ALL ON TABLE "public"."dm_bo_dung_cu_chi_tiet" TO "anon";
GRANT ALL ON TABLE "public"."dm_bo_dung_cu_chi_tiet" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_bo_dung_cu_chi_tiet" TO "service_role";



GRANT ALL ON TABLE "public"."dm_bo_dung_cu_phan_bo" TO "anon";
GRANT ALL ON TABLE "public"."dm_bo_dung_cu_phan_bo" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_bo_dung_cu_phan_bo" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_dm_cach_thuc_giam_sat" TO "anon";
GRANT ALL ON TABLE "public"."gstt_dm_cach_thuc_giam_sat" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_dm_cach_thuc_giam_sat" TO "service_role";



GRANT ALL ON TABLE "public"."dm_cach_thuc_giam_sat" TO "anon";
GRANT ALL ON TABLE "public"."dm_cach_thuc_giam_sat" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_cach_thuc_giam_sat" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_dm_chuc_danh" TO "anon";
GRANT ALL ON TABLE "public"."mdm_dm_chuc_danh" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_dm_chuc_danh" TO "service_role";



GRANT ALL ON TABLE "public"."dm_chuc_danh" TO "anon";
GRANT ALL ON TABLE "public"."dm_chuc_danh" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_chuc_danh" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_dm_chuc_vu" TO "anon";
GRANT ALL ON TABLE "public"."mdm_dm_chuc_vu" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_dm_chuc_vu" TO "service_role";



GRANT ALL ON TABLE "public"."dm_chuc_vu" TO "anon";
GRANT ALL ON TABLE "public"."dm_chuc_vu" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_chuc_vu" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_dm_hinh_thuc_giam_sat" TO "anon";
GRANT ALL ON TABLE "public"."gstt_dm_hinh_thuc_giam_sat" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_dm_hinh_thuc_giam_sat" TO "service_role";



GRANT ALL ON TABLE "public"."dm_hinh_thuc_giam_sat" TO "anon";
GRANT ALL ON TABLE "public"."dm_hinh_thuc_giam_sat" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_hinh_thuc_giam_sat" TO "service_role";



GRANT ALL ON TABLE "public"."dm_hoa_chat" TO "anon";
GRANT ALL ON TABLE "public"."dm_hoa_chat" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_hoa_chat" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_dm_khoa_phong" TO "anon";
GRANT ALL ON TABLE "public"."mdm_dm_khoa_phong" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_dm_khoa_phong" TO "service_role";



GRANT ALL ON TABLE "public"."dm_khoa_phong" TO "anon";
GRANT ALL ON TABLE "public"."dm_khoa_phong" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_khoa_phong" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_dm_khoi_khoa" TO "anon";
GRANT ALL ON TABLE "public"."mdm_dm_khoi_khoa" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_dm_khoi_khoa" TO "service_role";



GRANT ALL ON TABLE "public"."dm_khoi_khoa" TO "anon";
GRANT ALL ON TABLE "public"."dm_khoi_khoa" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_khoi_khoa" TO "service_role";



GRANT ALL ON TABLE "public"."dm_khu_vuc_giam_sat" TO "anon";
GRANT ALL ON TABLE "public"."dm_khu_vuc_giam_sat" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_khu_vuc_giam_sat" TO "service_role";



GRANT ALL ON TABLE "public"."qlcv_dm_loai_cong_viec" TO "anon";
GRANT ALL ON TABLE "public"."qlcv_dm_loai_cong_viec" TO "authenticated";
GRANT ALL ON TABLE "public"."qlcv_dm_loai_cong_viec" TO "service_role";



GRANT ALL ON TABLE "public"."dm_loai_cong_viec" TO "anon";
GRANT ALL ON TABLE "public"."dm_loai_cong_viec" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_loai_cong_viec" TO "service_role";



GRANT ALL ON TABLE "public"."dm_loai_dung_cu" TO "anon";
GRANT ALL ON TABLE "public"."dm_loai_dung_cu" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_loai_dung_cu" TO "service_role";



GRANT ALL ON TABLE "public"."dm_loai_may_tiet_khuan" TO "anon";
GRANT ALL ON TABLE "public"."dm_loai_may_tiet_khuan" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_loai_may_tiet_khuan" TO "service_role";



GRANT ALL ON TABLE "public"."nkbv_dm_loai" TO "anon";
GRANT ALL ON TABLE "public"."nkbv_dm_loai" TO "authenticated";
GRANT ALL ON TABLE "public"."nkbv_dm_loai" TO "service_role";



GRANT ALL ON TABLE "public"."dm_loai_nkbv" TO "anon";
GRANT ALL ON TABLE "public"."dm_loai_nkbv" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_loai_nkbv" TO "service_role";



GRANT ALL ON TABLE "public"."dm_loai_su_co" TO "anon";
GRANT ALL ON TABLE "public"."dm_loai_su_co" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_loai_su_co" TO "service_role";



GRANT ALL ON TABLE "public"."dm_lookup_value" TO "anon";
GRANT ALL ON TABLE "public"."dm_lookup_value" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_lookup_value" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_dm_nghe_nghiep" TO "anon";
GRANT ALL ON TABLE "public"."mdm_dm_nghe_nghiep" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_dm_nghe_nghiep" TO "service_role";



GRANT ALL ON TABLE "public"."dm_nghe_nghiep" TO "anon";
GRANT ALL ON TABLE "public"."dm_nghe_nghiep" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_nghe_nghiep" TO "service_role";



GRANT ALL ON TABLE "public"."nkbv_dm_cdc_baseline" TO "anon";
GRANT ALL ON TABLE "public"."nkbv_dm_cdc_baseline" TO "authenticated";
GRANT ALL ON TABLE "public"."nkbv_dm_cdc_baseline" TO "service_role";



GRANT ALL ON TABLE "public"."dm_nkbv_cdc_baselines" TO "anon";
GRANT ALL ON TABLE "public"."dm_nkbv_cdc_baselines" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_nkbv_cdc_baselines" TO "service_role";



GRANT ALL ON TABLE "public"."sys_permissions" TO "anon";
GRANT ALL ON TABLE "public"."sys_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."sys_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."dm_permissions" TO "anon";
GRANT ALL ON TABLE "public"."dm_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."sys_roles" TO "anon";
GRANT ALL ON TABLE "public"."sys_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."sys_roles" TO "service_role";



GRANT ALL ON TABLE "public"."dm_roles" TO "anon";
GRANT ALL ON TABLE "public"."dm_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_roles" TO "service_role";



GRANT ALL ON TABLE "public"."dm_thiet_bi" TO "anon";
GRANT ALL ON TABLE "public"."dm_thiet_bi" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_thiet_bi" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_dm_tieu_chi_bang_kiem" TO "anon";
GRANT ALL ON TABLE "public"."gstt_dm_tieu_chi_bang_kiem" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_dm_tieu_chi_bang_kiem" TO "service_role";



GRANT ALL ON TABLE "public"."dm_tieu_chi_bang_kiem" TO "anon";
GRANT ALL ON TABLE "public"."dm_tieu_chi_bang_kiem" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_tieu_chi_bang_kiem" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_dm_to_cong_tac" TO "anon";
GRANT ALL ON TABLE "public"."mdm_dm_to_cong_tac" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_dm_to_cong_tac" TO "service_role";



GRANT ALL ON TABLE "public"."dm_to_cong_tac" TO "anon";
GRANT ALL ON TABLE "public"."dm_to_cong_tac" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_to_cong_tac" TO "service_role";



GRANT ALL ON TABLE "public"."dm_tram_cssd" TO "anon";
GRANT ALL ON TABLE "public"."dm_tram_cssd" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_tram_cssd" TO "service_role";



GRANT ALL ON TABLE "public"."qlcv_dm_trang_thai_cong_viec" TO "anon";
GRANT ALL ON TABLE "public"."qlcv_dm_trang_thai_cong_viec" TO "authenticated";
GRANT ALL ON TABLE "public"."qlcv_dm_trang_thai_cong_viec" TO "service_role";



GRANT ALL ON TABLE "public"."dm_trang_thai_cong_viec" TO "anon";
GRANT ALL ON TABLE "public"."dm_trang_thai_cong_viec" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_trang_thai_cong_viec" TO "service_role";



GRANT ALL ON TABLE "public"."nkbv_dm_trang_thai_ca" TO "anon";
GRANT ALL ON TABLE "public"."nkbv_dm_trang_thai_ca" TO "authenticated";
GRANT ALL ON TABLE "public"."nkbv_dm_trang_thai_ca" TO "service_role";



GRANT ALL ON TABLE "public"."dm_trang_thai_nkbv_ca" TO "anon";
GRANT ALL ON TABLE "public"."dm_trang_thai_nkbv_ca" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_trang_thai_nkbv_ca" TO "service_role";



GRANT ALL ON TABLE "public"."fact_bao_tri_thiet_bi" TO "anon";
GRANT ALL ON TABLE "public"."fact_bao_tri_thiet_bi" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_bao_tri_thiet_bi" TO "service_role";



GRANT ALL ON TABLE "public"."sys_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."sys_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."sys_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."fact_bv103_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."fact_bv103_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_bv103_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."qlcv_fact_cong_viec" TO "anon";
GRANT ALL ON TABLE "public"."qlcv_fact_cong_viec" TO "authenticated";
GRANT ALL ON TABLE "public"."qlcv_fact_cong_viec" TO "service_role";



GRANT ALL ON TABLE "public"."fact_cong_viec" TO "anon";
GRANT ALL ON TABLE "public"."fact_cong_viec" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_cong_viec" TO "service_role";



GRANT ALL ON TABLE "public"."qlcv_fact_cong_viec_dinh_ky" TO "anon";
GRANT ALL ON TABLE "public"."qlcv_fact_cong_viec_dinh_ky" TO "authenticated";
GRANT ALL ON TABLE "public"."qlcv_fact_cong_viec_dinh_ky" TO "service_role";



GRANT ALL ON TABLE "public"."fact_cong_viec_dinh_ky" TO "anon";
GRANT ALL ON TABLE "public"."fact_cong_viec_dinh_ky" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_cong_viec_dinh_ky" TO "service_role";



GRANT ALL ON TABLE "public"."qlcv_fact_cong_viec_hoat_dong" TO "anon";
GRANT ALL ON TABLE "public"."qlcv_fact_cong_viec_hoat_dong" TO "authenticated";
GRANT ALL ON TABLE "public"."qlcv_fact_cong_viec_hoat_dong" TO "service_role";



GRANT ALL ON TABLE "public"."fact_cong_viec_hoat_dong" TO "anon";
GRANT ALL ON TABLE "public"."fact_cong_viec_hoat_dong" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_cong_viec_hoat_dong" TO "service_role";



GRANT ALL ON TABLE "public"."fact_cssd_dieu_chuyen_thanh_phan" TO "anon";
GRANT ALL ON TABLE "public"."fact_cssd_dieu_chuyen_thanh_phan" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_cssd_dieu_chuyen_thanh_phan" TO "service_role";



GRANT ALL ON TABLE "public"."fact_cssd_lifecycle_event" TO "anon";
GRANT ALL ON TABLE "public"."fact_cssd_lifecycle_event" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_cssd_lifecycle_event" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_fact_chung_sessions" TO "anon";
GRANT ALL ON TABLE "public"."gstt_fact_chung_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_fact_chung_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."fact_giam_sat_chung_sessions" TO "anon";
GRANT ALL ON TABLE "public"."fact_giam_sat_chung_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_giam_sat_chung_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_fact_vst" TO "anon";
GRANT ALL ON TABLE "public"."gstt_fact_vst" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_fact_vst" TO "service_role";



GRANT ALL ON TABLE "public"."fact_giam_sat_vst" TO "anon";
GRANT ALL ON TABLE "public"."fact_giam_sat_vst" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_giam_sat_vst" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_fact_vst_sessions" TO "anon";
GRANT ALL ON TABLE "public"."gstt_fact_vst_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_fact_vst_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."fact_giam_sat_vst_sessions" TO "anon";
GRANT ALL ON TABLE "public"."fact_giam_sat_vst_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_giam_sat_vst_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_fact_gsc_dashboard_summary" TO "anon";
GRANT ALL ON TABLE "public"."gstt_fact_gsc_dashboard_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_fact_gsc_dashboard_summary" TO "service_role";



GRANT ALL ON TABLE "public"."fact_gsc_dashboard_summary" TO "anon";
GRANT ALL ON TABLE "public"."fact_gsc_dashboard_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_gsc_dashboard_summary" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_fact_gsc_violations_summary" TO "anon";
GRANT ALL ON TABLE "public"."gstt_fact_gsc_violations_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_fact_gsc_violations_summary" TO "service_role";



GRANT ALL ON TABLE "public"."fact_gsc_violations_summary" TO "anon";
GRANT ALL ON TABLE "public"."fact_gsc_violations_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_gsc_violations_summary" TO "service_role";



GRANT ALL ON TABLE "public"."fact_kho_chi_tiet" TO "anon";
GRANT ALL ON TABLE "public"."fact_kho_chi_tiet" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_kho_chi_tiet" TO "service_role";



GRANT ALL ON TABLE "public"."fact_kho_dung_cu_giao_dich" TO "anon";
GRANT ALL ON TABLE "public"."fact_kho_dung_cu_giao_dich" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_kho_dung_cu_giao_dich" TO "service_role";



GRANT ALL ON TABLE "public"."fact_kho_giao_dich" TO "anon";
GRANT ALL ON TABLE "public"."fact_kho_giao_dich" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_kho_giao_dich" TO "service_role";



GRANT ALL ON TABLE "public"."fact_kho_hoa_chat_giao_dich" TO "anon";
GRANT ALL ON TABLE "public"."fact_kho_hoa_chat_giao_dich" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_kho_hoa_chat_giao_dich" TO "service_role";



GRANT ALL ON TABLE "public"."fact_lo_tiet_khuan" TO "anon";
GRANT ALL ON TABLE "public"."fact_lo_tiet_khuan" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_lo_tiet_khuan" TO "service_role";



GRANT ALL ON TABLE "public"."nkbv_fact_benh_an" TO "anon";
GRANT ALL ON TABLE "public"."nkbv_fact_benh_an" TO "authenticated";
GRANT ALL ON TABLE "public"."nkbv_fact_benh_an" TO "service_role";



GRANT ALL ON TABLE "public"."fact_nkbv_benh_an" TO "anon";
GRANT ALL ON TABLE "public"."fact_nkbv_benh_an" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_nkbv_benh_an" TO "service_role";



GRANT ALL ON TABLE "public"."nkbv_fact_mau_so_daily" TO "anon";
GRANT ALL ON TABLE "public"."nkbv_fact_mau_so_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."nkbv_fact_mau_so_daily" TO "service_role";



GRANT ALL ON TABLE "public"."fact_nkbv_mau_so_daily" TO "anon";
GRANT ALL ON TABLE "public"."fact_nkbv_mau_so_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_nkbv_mau_so_daily" TO "service_role";



GRANT ALL ON TABLE "public"."nkbv_fact_mau_so_phau_thuat" TO "anon";
GRANT ALL ON TABLE "public"."nkbv_fact_mau_so_phau_thuat" TO "authenticated";
GRANT ALL ON TABLE "public"."nkbv_fact_mau_so_phau_thuat" TO "service_role";



GRANT ALL ON TABLE "public"."fact_nkbv_mau_so_phau_thuat" TO "anon";
GRANT ALL ON TABLE "public"."fact_nkbv_mau_so_phau_thuat" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_nkbv_mau_so_phau_thuat" TO "service_role";



GRANT ALL ON TABLE "public"."nkbv_fact_su_kien" TO "anon";
GRANT ALL ON TABLE "public"."nkbv_fact_su_kien" TO "authenticated";
GRANT ALL ON TABLE "public"."nkbv_fact_su_kien" TO "service_role";



GRANT ALL ON TABLE "public"."fact_nkbv_su_kien" TO "anon";
GRANT ALL ON TABLE "public"."fact_nkbv_su_kien" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_nkbv_su_kien" TO "service_role";



GRANT ALL ON TABLE "public"."nkbv_fact_vi_sinh" TO "anon";
GRANT ALL ON TABLE "public"."nkbv_fact_vi_sinh" TO "authenticated";
GRANT ALL ON TABLE "public"."nkbv_fact_vi_sinh" TO "service_role";



GRANT ALL ON TABLE "public"."fact_nkbv_vi_sinh" TO "anon";
GRANT ALL ON TABLE "public"."fact_nkbv_vi_sinh" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_nkbv_vi_sinh" TO "service_role";



GRANT ALL ON TABLE "public"."qlcv_fact_danh_gia_thang" TO "anon";
GRANT ALL ON TABLE "public"."qlcv_fact_danh_gia_thang" TO "authenticated";
GRANT ALL ON TABLE "public"."qlcv_fact_danh_gia_thang" TO "service_role";



GRANT ALL ON TABLE "public"."fact_qlcv_danh_gia_thang" TO "anon";
GRANT ALL ON TABLE "public"."fact_qlcv_danh_gia_thang" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_qlcv_danh_gia_thang" TO "service_role";



GRANT ALL ON TABLE "public"."fact_quy_trinh_thanh_phan" TO "anon";
GRANT ALL ON TABLE "public"."fact_quy_trinh_thanh_phan" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_quy_trinh_thanh_phan" TO "service_role";



GRANT ALL ON TABLE "public"."fact_su_co" TO "anon";
GRANT ALL ON TABLE "public"."fact_su_co" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_su_co" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_fact_vst_moments_summary" TO "anon";
GRANT ALL ON TABLE "public"."gstt_fact_vst_moments_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_fact_vst_moments_summary" TO "service_role";



GRANT ALL ON TABLE "public"."fact_vst_moments_summary" TO "anon";
GRANT ALL ON TABLE "public"."fact_vst_moments_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_vst_moments_summary" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_fact_vst_opportunities_summary" TO "anon";
GRANT ALL ON TABLE "public"."gstt_fact_vst_opportunities_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_fact_vst_opportunities_summary" TO "service_role";



GRANT ALL ON TABLE "public"."fact_vst_opportunities_summary" TO "anon";
GRANT ALL ON TABLE "public"."fact_vst_opportunities_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_vst_opportunities_summary" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_fact_vst_sessions_summary" TO "anon";
GRANT ALL ON TABLE "public"."gstt_fact_vst_sessions_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_fact_vst_sessions_summary" TO "service_role";



GRANT ALL ON TABLE "public"."fact_vst_sessions_summary" TO "anon";
GRANT ALL ON TABLE "public"."fact_vst_sessions_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."fact_vst_sessions_summary" TO "service_role";



GRANT ALL ON TABLE "public"."gstt_dm_khu_vuc_giam_sat" TO "anon";
GRANT ALL ON TABLE "public"."gstt_dm_khu_vuc_giam_sat" TO "authenticated";
GRANT ALL ON TABLE "public"."gstt_dm_khu_vuc_giam_sat" TO "service_role";



GRANT ALL ON TABLE "public"."sys_mdm_registry" TO "anon";
GRANT ALL ON TABLE "public"."sys_mdm_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."sys_mdm_registry" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_field_registry" TO "anon";
GRANT ALL ON TABLE "public"."mdm_field_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_field_registry" TO "service_role";



GRANT ALL ON TABLE "public"."sys_mdm_suggestion" TO "anon";
GRANT ALL ON TABLE "public"."sys_mdm_suggestion" TO "authenticated";
GRANT ALL ON TABLE "public"."sys_mdm_suggestion" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_governance_suggestion" TO "anon";
GRANT ALL ON TABLE "public"."mdm_governance_suggestion" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_governance_suggestion" TO "service_role";



GRANT ALL ON TABLE "public"."mdm_nhan_su" TO "anon";
GRANT ALL ON TABLE "public"."mdm_nhan_su" TO "authenticated";
GRANT ALL ON TABLE "public"."mdm_nhan_su" TO "service_role";



GRANT ALL ON TABLE "public"."sys_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."sys_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."sys_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."rel_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."rel_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."rel_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."sys_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."sys_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."sys_user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."rel_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."rel_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."rel_user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."sys_module_locks" TO "anon";
GRANT ALL ON TABLE "public"."sys_module_locks" TO "authenticated";
GRANT ALL ON TABLE "public"."sys_module_locks" TO "service_role";



GRANT ALL ON TABLE "public"."v_sys_user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."v_sys_user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sys_user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."v_auth_user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."v_auth_user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."v_auth_user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."v_qlcv_cong_viec_full" TO "anon";
GRANT ALL ON TABLE "public"."v_qlcv_cong_viec_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_qlcv_cong_viec_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_qlcv_cong_viec_qua_han" TO "anon";
GRANT ALL ON TABLE "public"."v_qlcv_cong_viec_qua_han" TO "authenticated";
GRANT ALL ON TABLE "public"."v_qlcv_cong_viec_qua_han" TO "service_role";



GRANT ALL ON TABLE "public"."v_cong_viec_qua_han" TO "anon";
GRANT ALL ON TABLE "public"."v_cong_viec_qua_han" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cong_viec_qua_han" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_bien_dong" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_bien_dong" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_bien_dong" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_chi_tiet_full" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_chi_tiet_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_chi_tiet_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_chi_tiet_realtime" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_chi_tiet_realtime" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_chi_tiet_realtime" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_full" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_bo_dung_cu_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_hoa_chat_full" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_hoa_chat_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_hoa_chat_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_kho_hoa_chat_ton_lo" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_kho_hoa_chat_ton_lo" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_kho_hoa_chat_ton_lo" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_kho_le_realtime_qty" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_kho_le_realtime_qty" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_kho_le_realtime_qty" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_lo_tiet_khuan_full" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_lo_tiet_khuan_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_lo_tiet_khuan_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_loai_dung_cu_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_loai_dung_cu_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_loai_dung_cu_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_quy_trinh_full" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_quy_trinh_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_quy_trinh_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_su_co_full" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_su_co_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_su_co_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_cssd_thiet_bi_full" TO "anon";
GRANT ALL ON TABLE "public"."v_cssd_thiet_bi_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cssd_thiet_bi_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_gstt_bang_kiem_full" TO "anon";
GRANT ALL ON TABLE "public"."v_gstt_bang_kiem_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_gstt_bang_kiem_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_dm_bang_kiem_full" TO "anon";
GRANT ALL ON TABLE "public"."v_dm_bang_kiem_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dm_bang_kiem_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_dm_bo_dung_cu_chi_tiet_full" TO "anon";
GRANT ALL ON TABLE "public"."v_dm_bo_dung_cu_chi_tiet_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dm_bo_dung_cu_chi_tiet_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_dm_bo_dung_cu_full" TO "anon";
GRANT ALL ON TABLE "public"."v_dm_bo_dung_cu_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dm_bo_dung_cu_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_dm_bo_dung_cu_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_dm_bo_dung_cu_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dm_bo_dung_cu_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_dm_hoa_chat_full" TO "anon";
GRANT ALL ON TABLE "public"."v_dm_hoa_chat_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dm_hoa_chat_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_mdm_khoa_phong_full" TO "anon";
GRANT ALL ON TABLE "public"."v_mdm_khoa_phong_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_mdm_khoa_phong_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_dm_khoa_phong_full" TO "anon";
GRANT ALL ON TABLE "public"."v_dm_khoa_phong_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dm_khoa_phong_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_dm_loai_dung_cu_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_dm_loai_dung_cu_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dm_loai_dung_cu_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_dm_thiet_bi_full" TO "anon";
GRANT ALL ON TABLE "public"."v_dm_thiet_bi_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dm_thiet_bi_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_dm_tieu_chi_bang_kiem_full" TO "anon";
GRANT ALL ON TABLE "public"."v_dm_tieu_chi_bang_kiem_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dm_tieu_chi_bang_kiem_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_fact_cong_viec_full" TO "anon";
GRANT ALL ON TABLE "public"."v_fact_cong_viec_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fact_cong_viec_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_fact_giam_sat_chung_sessions_full" TO "anon";
GRANT ALL ON TABLE "public"."v_fact_giam_sat_chung_sessions_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fact_giam_sat_chung_sessions_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_fact_giam_sat_vst_full" TO "anon";
GRANT ALL ON TABLE "public"."v_fact_giam_sat_vst_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fact_giam_sat_vst_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_fact_kho_hoa_chat_ton_lo" TO "anon";
GRANT ALL ON TABLE "public"."v_fact_kho_hoa_chat_ton_lo" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fact_kho_hoa_chat_ton_lo" TO "service_role";



GRANT ALL ON TABLE "public"."v_fact_lo_tiet_khuan_full" TO "anon";
GRANT ALL ON TABLE "public"."v_fact_lo_tiet_khuan_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fact_lo_tiet_khuan_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_nkbv_su_kien_full" TO "anon";
GRANT ALL ON TABLE "public"."v_nkbv_su_kien_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_nkbv_su_kien_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_fact_nkbv_su_kien_full" TO "anon";
GRANT ALL ON TABLE "public"."v_fact_nkbv_su_kien_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fact_nkbv_su_kien_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_fact_quy_trinh_full" TO "anon";
GRANT ALL ON TABLE "public"."v_fact_quy_trinh_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fact_quy_trinh_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_fact_su_co_full" TO "anon";
GRANT ALL ON TABLE "public"."v_fact_su_co_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fact_su_co_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_gsc_dashboard_rows" TO "anon";
GRANT ALL ON TABLE "public"."v_gsc_dashboard_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."v_gsc_dashboard_rows" TO "service_role";



GRANT ALL ON TABLE "public"."v_gstt_dashboard_bundle_rate_v3" TO "anon";
GRANT ALL ON TABLE "public"."v_gstt_dashboard_bundle_rate_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."v_gstt_dashboard_bundle_rate_v3" TO "service_role";



GRANT ALL ON TABLE "public"."v_gstt_dashboard_nhsn_denominator_v3" TO "anon";
GRANT ALL ON TABLE "public"."v_gstt_dashboard_nhsn_denominator_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."v_gstt_dashboard_nhsn_denominator_v3" TO "service_role";



GRANT ALL ON TABLE "public"."v_gstt_gsc_dashboard_rows" TO "anon";
GRANT ALL ON TABLE "public"."v_gstt_gsc_dashboard_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."v_gstt_gsc_dashboard_rows" TO "service_role";



GRANT ALL ON TABLE "public"."v_gstt_vst_hotpath" TO "anon";
GRANT ALL ON TABLE "public"."v_gstt_vst_hotpath" TO "authenticated";
GRANT ALL ON TABLE "public"."v_gstt_vst_hotpath" TO "service_role";



GRANT ALL ON TABLE "public"."v_mdm_nhan_su_full" TO "anon";
GRANT ALL ON TABLE "public"."v_mdm_nhan_su_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_mdm_nhan_su_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_sys_role_permissions_matrix" TO "anon";
GRANT ALL ON TABLE "public"."v_sys_role_permissions_matrix" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sys_role_permissions_matrix" TO "service_role";



GRANT ALL ON TABLE "public"."v_role_permissions_matrix" TO "anon";
GRANT ALL ON TABLE "public"."v_role_permissions_matrix" TO "authenticated";
GRANT ALL ON TABLE "public"."v_role_permissions_matrix" TO "service_role";



GRANT ALL ON TABLE "public"."v_sys_staff_auth_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_sys_staff_auth_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sys_staff_auth_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_staff_auth_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_staff_auth_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_staff_auth_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_sys_audit_log_full" TO "anon";
GRANT ALL ON TABLE "public"."v_sys_audit_log_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sys_audit_log_full" TO "service_role";



GRANT ALL ON TABLE "public"."v_sys_audit_table_choices" TO "anon";
GRANT ALL ON TABLE "public"."v_sys_audit_table_choices" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sys_audit_table_choices" TO "service_role";



GRANT ALL ON TABLE "public"."vw_vst_hotpath" TO "anon";
GRANT ALL ON TABLE "public"."vw_vst_hotpath" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_vst_hotpath" TO "service_role";



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







