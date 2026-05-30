-- Migration: 20260525000003_vst_gsc_data_locking_and_audit_trigger.sql
-- Description: Khởi tạo bảng sys_module_locks lưu ngày khóa dữ liệu báo cáo, trigger chặn sửa dữ liệu quá hạn, và trigger tự động ghi vết thay đổi vào fact_bv103_audit_log cho VST và GSC.
-- Date: 25/05/2026

-- 1. Tạo bảng cấu hình khóa sys_module_locks
CREATE TABLE IF NOT EXISTS public.sys_module_locks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    module_name text NOT NULL CHECK (module_name IN ('VST', 'GSC')),
    locked_until_date date NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sys_module_locks_unique UNIQUE (module_name)
);

-- Bật RLS bảo mật cho bảng sys_module_locks
ALTER TABLE public.sys_module_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sys_module_locks_select ON public.sys_module_locks;
CREATE POLICY sys_module_locks_select ON public.sys_module_locks 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sys_module_locks_all ON public.sys_module_locks;
CREATE POLICY sys_module_locks_all ON public.sys_module_locks 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Viết Trigger Function chặn sửa dữ liệu đã khóa
CREATE OR REPLACE FUNCTION public.fn_assert_vst_gsc_not_locked()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn Trigger Data Locking vào các bảng phiên
DROP TRIGGER IF EXISTS trg_assert_vst_sessions_not_locked ON public.fact_giam_sat_vst_sessions;
CREATE TRIGGER trg_assert_vst_sessions_not_locked
    BEFORE UPDATE OR DELETE ON public.fact_giam_sat_vst_sessions
    FOR EACH ROW EXECUTE FUNCTION public.fn_assert_vst_gsc_not_locked();

DROP TRIGGER IF EXISTS trg_assert_gsc_sessions_not_locked ON public.fact_giam_sat_chung_sessions;
CREATE TRIGGER trg_assert_gsc_sessions_not_locked
    BEFORE UPDATE OR DELETE ON public.fact_giam_sat_chung_sessions
    FOR EACH ROW EXECUTE FUNCTION public.fn_assert_vst_gsc_not_locked();

-- 3. Viết Trigger Function Audit Trail tự động đẩy vết thay đổi vào fact_bv103_audit_log
CREATE OR REPLACE FUNCTION public.fn_trigger_audit_vst_gsc()
RETURNS trigger AS $$
DECLARE
    v_actor_id text;
BEGIN
    -- Lấy ID người dùng thực hiện thao tác từ session Supabase context
    BEGIN
        v_actor_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_actor_id := NULL;
    END;
    
    INSERT INTO public.fact_bv103_audit_log(table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id)::text,
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        CASE WHEN v_actor_id IS NOT NULL THEN v_actor_id::uuid ELSE NULL END
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn Trigger Audit Trail vào các bảng phiên
DROP TRIGGER IF EXISTS trg_audit_vst_sessions_vst_gsc ON public.fact_giam_sat_vst_sessions;
CREATE TRIGGER trg_audit_vst_sessions_vst_gsc
    AFTER INSERT OR UPDATE OR DELETE ON public.fact_giam_sat_vst_sessions
    FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_audit_vst_gsc();

DROP TRIGGER IF EXISTS trg_audit_gsc_sessions_vst_gsc ON public.fact_giam_sat_chung_sessions;
CREATE TRIGGER trg_audit_gsc_sessions_vst_gsc
    AFTER INSERT OR UPDATE OR DELETE ON public.fact_giam_sat_chung_sessions
    FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_audit_vst_gsc();

-- 4. Tạo Supabase Storage bucket 'gsc-evidences' cho bằng chứng sai phạm
INSERT INTO storage.buckets (id, name, public)
VALUES ('gsc-evidences', 'gsc-evidences', true)
ON CONFLICT (id) DO NOTHING;

-- Thiết lập RLS policies cho storage bucket gsc-evidences
CREATE POLICY "Allow authenticated select on gsc-evidences" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'gsc-evidences');

CREATE POLICY "Allow authenticated insert on gsc-evidences" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gsc-evidences');

CREATE POLICY "Allow authenticated delete on gsc-evidences" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'gsc-evidences');

