-- Migration: GSC Trigger Statement Optimization
-- Description: Chuyển đổi và thiết lập trigger đồng bộ dữ liệu Giám sát chung (gSC) từ cấp dòng sang cấp câu lệnh (Statement-level) sử dụng transition tables.
-- Đảm bảo đồng bộ chính xác và hiệu năng cao cho OLAP pre-aggregated dashboard.

BEGIN;

-- 1. Xóa các trigger cũ nếu tồn tại trên bảng vật lý
DROP TRIGGER IF EXISTS "trg_sync_gsc_session" ON "public"."gstt_fact_chung_sessions";
DROP TRIGGER IF EXISTS "trg_sync_gsc_session_insert" ON "public"."gstt_fact_chung_sessions";
DROP TRIGGER IF EXISTS "trg_sync_gsc_session_delete" ON "public"."gstt_fact_chung_sessions";
DROP TRIGGER IF EXISTS "trg_sync_gsc_session_update" ON "public"."gstt_fact_chung_sessions";


-- 2. Xóa các hàm trigger cấp dòng cũ
DROP FUNCTION IF EXISTS "public"."fn_trigger_sync_gsc_session_row"() CASCADE;
DROP FUNCTION IF EXISTS "public"."fn_trigger_sync_gsc_result_row"() CASCADE;

-- 3. Tạo hàm trigger cho INSERT (cấp câu lệnh)
CREATE OR REPLACE FUNCTION "public"."fn_trigger_sync_gsc_session_insert_stmt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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

ALTER FUNCTION "public"."fn_trigger_sync_gsc_session_insert_stmt"() OWNER TO "postgres";

-- 4. Tạo hàm trigger cho DELETE (cấp câu lệnh)
CREATE OR REPLACE FUNCTION "public"."fn_trigger_sync_gsc_session_delete_stmt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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

ALTER FUNCTION "public"."fn_trigger_sync_gsc_session_delete_stmt"() OWNER TO "postgres";

-- 5. Tạo hàm trigger cho UPDATE (cấp câu lệnh)
CREATE OR REPLACE FUNCTION "public"."fn_trigger_sync_gsc_session_update_stmt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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

ALTER FUNCTION "public"."fn_trigger_sync_gsc_session_update_stmt"() OWNER TO "postgres";

-- 6. Tạo các trigger cấp câu lệnh trên bảng vật lý public.gstt_fact_chung_sessions
CREATE TRIGGER "trg_sync_gsc_session_insert"
    AFTER INSERT ON "public"."gstt_fact_chung_sessions"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT
    EXECUTE FUNCTION "public"."fn_trigger_sync_gsc_session_insert_stmt"();

CREATE TRIGGER "trg_sync_gsc_session_delete"
    AFTER DELETE ON "public"."gstt_fact_chung_sessions"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT
    EXECUTE FUNCTION "public"."fn_trigger_sync_gsc_session_delete_stmt"();

CREATE TRIGGER "trg_sync_gsc_session_update"
    AFTER UPDATE ON "public"."gstt_fact_chung_sessions"
    REFERENCING NEW TABLE AS new_table OLD TABLE AS old_table
    FOR EACH STATEMENT
    EXECUTE FUNCTION "public"."fn_trigger_sync_gsc_session_update_stmt"();

-- 7. Đồng bộ lại toàn bộ dữ liệu hiện có để lấp đầy Dashboard nếu bị khuyết thiếu
DO $$
DECLARE
  v_session RECORD;
BEGIN
  FOR v_session IN SELECT id FROM public.gstt_fact_chung_sessions WHERE is_active = true LOOP
    PERFORM public.fn_sync_single_gsc_session(v_session.id);
  END LOOP;
END;
$$;

COMMIT;
