-- Migration: VST Trigger Statement Optimization
-- Description: Chuyển đổi trigger từ cấp dòng (FOR EACH ROW) sang cấp câu lệnh (FOR EACH STATEMENT) sử dụng transition tables (REFERENCING new_table/old_table)
-- Điều này giúp tối ưu hóa hiệu năng, giảm từ N lần gọi fn_sync_single_vst_session xuống còn duy nhất 1 lần cho mỗi câu lệnh INSERT/DELETE/UPDATE.

-- 1. Drop trigger cũ cấp dòng
DROP TRIGGER IF EXISTS "trg_sync_vst_opp" ON "public"."gstt_fact_vst";

-- 2. Tạo hàm trigger cho INSERT (cấp câu lệnh)
CREATE OR REPLACE FUNCTION "public"."fn_trigger_sync_vst_opp_insert_stmt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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

-- 3. Tạo hàm trigger cho DELETE (cấp câu lệnh)
CREATE OR REPLACE FUNCTION "public"."fn_trigger_sync_vst_opp_delete_stmt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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

-- 4. Tạo hàm trigger cho UPDATE (cấp câu lệnh)
CREATE OR REPLACE FUNCTION "public"."fn_trigger_sync_vst_opp_update_stmt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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

-- 5. Tạo các trigger cấp câu lệnh tương ứng
CREATE TRIGGER "trg_sync_vst_opp_insert"
    AFTER INSERT ON "public"."gstt_fact_vst"
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT
    EXECUTE FUNCTION "public"."fn_trigger_sync_vst_opp_insert_stmt"();

CREATE TRIGGER "trg_sync_vst_opp_delete"
    AFTER DELETE ON "public"."gstt_fact_vst"
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT
    EXECUTE FUNCTION "public"."fn_trigger_sync_vst_opp_delete_stmt"();

CREATE TRIGGER "trg_sync_vst_opp_update"
    AFTER UPDATE ON "public"."gstt_fact_vst"
    REFERENCING NEW TABLE AS new_table OLD TABLE AS old_table
    FOR EACH STATEMENT
    EXECUTE FUNCTION "public"."fn_trigger_sync_vst_opp_update_stmt"();
