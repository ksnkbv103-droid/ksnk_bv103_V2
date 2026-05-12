-- Migration: Kích hoạt Audit Log tự động cho toàn bộ hệ thống
-- Mục tiêu: Đảm bảo mọi hành động Sửa/Xóa trên các bảng nghiệp vụ và master data đều được ghi vết.
-- Tham chiếu: AGENTS.md 7 (Traceability) và Audit Findings 2026-05-07

-- 1. Đảm bảo function fn_auto_audit_log đã tồn tại và chuẩn hóa (đã làm ở migration 008, nhưng khai báo lại để an toàn)
CREATE OR REPLACE FUNCTION public.fn_auto_audit_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.fact_activity_log (table_name, record_id, action, old_data, new_data, note)
    VALUES (TG_TABLE_NAME, OLD.id, 'AUTO_UPDATE', to_jsonb(OLD), to_jsonb(NEW), 'Tự động ghi vết thay đổi');
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.fact_activity_log (table_name, record_id, action, old_data, note)
    VALUES (TG_TABLE_NAME, OLD.id, 'AUTO_DELETE', to_jsonb(OLD), 'Tự động ghi vết xóa');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 2. Gắn trigger cho Master Data (mdm_*)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_mdm_nhan_su') THEN
        CREATE TRIGGER trg_audit_mdm_nhan_su AFTER DELETE OR UPDATE ON public.mdm_nhan_su FOR EACH ROW EXECUTE FUNCTION public.fn_auto_audit_log();
    END IF;
END $$;

-- 3. Gắn trigger cho Danh mục nghiệp vụ (dm_*)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['dm_khoa_phong', 'dm_hoa_chat', 'dm_thiet_bi', 'dm_bang_kiem', 'dm_khu_vuc_giam_sat', 'dm_nghe_nghiep'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_audit_' || t, t);
        EXECUTE format('CREATE TRIGGER %I AFTER DELETE OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_auto_audit_log()', 'trg_audit_' || t, t);
    END LOOP;
END $$;

-- 4. Gắn trigger cho các bảng nghiệp vụ chính (fact_*)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'fact_giam_sat_chung_sessions', 
        'fact_giam_sat_vst_sessions', 
        'fact_giam_sat_nkbv_ca',
        'fact_kho_giao_dich',
        'fact_kho_hoa_chat_giao_dich',
        'fact_cong_viec',
        'fact_su_co'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_audit_' || t, t);
        EXECUTE format('CREATE TRIGGER %I AFTER DELETE OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_auto_audit_log()', 'trg_audit_' || t, t);
    END LOOP;
END $$;
