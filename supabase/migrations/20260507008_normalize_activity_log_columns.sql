-- Migration: Chuẩn hóa tên cột fact_activity_log (camelCase -> snake_case)
-- Lý do: Tuân thủ chuẩn AGENTS.md mục 4 (snake_case nhất quán)
-- Tham chiếu: Audit Report 2026-05-07

DO $$
BEGIN
    -- Rename userid to user_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_activity_log' AND column_name = 'userid') THEN
        ALTER TABLE public.fact_activity_log RENAME COLUMN userid TO user_id;
    END IF;

    -- Rename tablename to table_name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_activity_log' AND column_name = 'tablename') THEN
        ALTER TABLE public.fact_activity_log RENAME COLUMN tablename TO table_name;
    END IF;

    -- Rename recordid to record_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_activity_log' AND column_name = 'recordid') THEN
        ALTER TABLE public.fact_activity_log RENAME COLUMN recordid TO record_id;
    END IF;

    -- Rename olddata to old_data
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_activity_log' AND column_name = 'olddata') THEN
        ALTER TABLE public.fact_activity_log RENAME COLUMN olddata TO old_data;
    END IF;

    -- Rename newdata to new_data
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_activity_log' AND column_name = 'newdata') THEN
        ALTER TABLE public.fact_activity_log RENAME COLUMN newdata TO new_data;
    END IF;
END $$;

-- 2. Định nghĩa lại function audit log sử dụng tên cột mới
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

-- 3. Cập nhật index
DROP INDEX IF EXISTS idx_activity_log_userid;
DROP INDEX IF EXISTS idx_activity_log_tablename;
DROP INDEX IF EXISTS idx_activity_log_recordid;
DROP INDEX IF EXISTS idx_activity_log_table_created;

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.fact_activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_table_name ON public.fact_activity_log (table_name);
CREATE INDEX IF NOT EXISTS idx_activity_log_record_id ON public.fact_activity_log (record_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_table_created ON public.fact_activity_log (table_name, created_at DESC);
