-- Migration: Audit trigger v2 + actor coverage cho 12 bảng admin core.
-- Date: 26/05/2026
-- Slice 3 (admin-module hardening plan).
--
-- Bối cảnh:
--   * Trước 25/05/2026: `fn_bv103_audit_row()` ghi `sys_audit_log` nhưng KHÔNG capture actor (`changed_by` NULL).
--   * `fn_trigger_audit_vst_gsc()` capture được `auth.uid()` nhưng chỉ attach 2 bảng phiên VST/GSC.
--   * Thiếu vết các thao tác admin nhạy cảm: thay đổi RBAC, sửa MDM registry, sửa nhân sự,
--     thay đổi lookup giá trị, sửa khoa/phòng, sửa bảng kiểm. → log "no-actor" + thiếu coverage.
--
-- Kết quả mong đợi:
--   * `fn_sys_audit_row()` unified: capture actor, fallback NULL nếu không có session.
--   * Mọi audit trigger trên 12 bảng admin trả về row có `changed_by` đúng.
--   * Migration idempotent (DROP TRIGGER IF EXISTS + DO-block kiểm tra bảng tồn tại).
--   * Không thay schema `sys_audit_log` (Slice 6 sẽ thêm các view).

-- ----------------------------------------------------
-- 1. Tạo / cập nhật hàm audit unified có capture actor
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sys_audit_row() RETURNS trigger
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

-- ----------------------------------------------------
-- 2. Helper: attach trigger nếu bảng tồn tại
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sys_audit_attach(p_table regclass) RETURNS void
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

-- ----------------------------------------------------
-- 3. Attach audit trigger cho 12 bảng admin core
-- ----------------------------------------------------
DO $$
DECLARE
  v_target text;
  v_targets text[] := ARRAY[
    -- System / lookup
    'public.sys_lookup_value',
    'public.sys_mdm_registry',
    'public.sys_mdm_suggestion',
    -- RBAC (tên ổn định post-000010; nếu DB đang ở state 000001 thì các tên sys_* sẽ được thử ở vòng fallback)
    'public.auth_dm_roles',
    'public.auth_dm_permissions',
    'public.auth_rel_role_permissions',
    'public.auth_rel_user_roles',
    -- MDM organization core
    'public.mdm_nhan_su',
    'public.mdm_dm_khoa_phong',
    'public.mdm_dm_khoi_khoa',
    -- Giám sát tuân thủ - bảng kiểm
    'public.gstt_dm_bang_kiem',
    'public.gstt_dm_tieu_chi_bang_kiem'
  ];
  v_fallbacks text[] := ARRAY[
    'public.sys_roles',
    'public.sys_permissions',
    'public.sys_role_permissions',
    'public.sys_user_roles',
    'public.dm_bang_kiem',
    'public.dm_tieu_chi_bang_kiem'
  ];
BEGIN
  FOREACH v_target IN ARRAY v_targets LOOP
    BEGIN
      PERFORM public.fn_sys_audit_attach(v_target::regclass);
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '[audit-coverage] Bảng % không tồn tại - bỏ qua', v_target;
      WHEN OTHERS THEN
        RAISE NOTICE '[audit-coverage] Lỗi attach % : %', v_target, SQLERRM;
    END;
  END LOOP;

  -- Fallback: nếu DB chưa apply chuỗi rename `auth_*` (000010), attach trên tên cũ `sys_*` / `dm_*`
  FOREACH v_target IN ARRAY v_fallbacks LOOP
    BEGIN
      PERFORM public.fn_sys_audit_attach(v_target::regclass);
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
      WHEN OTHERS THEN
        RAISE NOTICE '[audit-coverage-fallback] Lỗi attach % : %', v_target, SQLERRM;
    END;
  END LOOP;
END $$;

-- ----------------------------------------------------
-- 4. Khử trigger cũ `trg_bv103_audit_*` (no-actor) nếu còn sót
-- ----------------------------------------------------
DO $$
DECLARE
  v_trg record;
BEGIN
  FOR v_trg IN
    SELECT n.nspname, c.relname, t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND p.proname = 'fn_bv103_audit_row'
      AND t.tgname LIKE 'trg_bv103_audit_%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', v_trg.tgname, v_trg.nspname, v_trg.relname);
    RAISE NOTICE '[audit-cleanup] Đã gỡ trigger no-actor cũ %.%/%', v_trg.nspname, v_trg.relname, v_trg.tgname;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.fn_sys_audit_row() IS
  'Audit row trigger thống nhất - capture auth.uid() vào sys_audit_log.changed_by; thay thế fn_bv103_audit_row.';
COMMENT ON FUNCTION public.fn_sys_audit_attach(regclass) IS
  'Helper attach trigger trg_sys_audit_<table> trên bảng vật lý; bỏ qua nếu không tồn tại hoặc là view.';
