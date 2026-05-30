-- Migration: MDM Smart Data Integrity Validation Triggers and Automated Schema Configuration hooks.
-- Date: 25/05/2026

-- ----------------------------------------------------
-- 1. Dynamic Check Constraint Trigger Function
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mdm_validate_lookup_integrity() RETURNS trigger
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

COMMENT ON FUNCTION public.fn_mdm_validate_lookup_integrity() IS 'Hàm trigger động kiểm soát toàn vẹn liên kết lookup động dựa trên mdm_field_registry.';

-- ----------------------------------------------------
-- 2. Automated Schema Self-Configuration Hook Function
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mdm_field_registry_attach_trigger() RETURNS trigger
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

COMMENT ON FUNCTION public.fn_mdm_field_registry_attach_trigger() IS 'Tự động sinh hoặc gỡ trigger kiểm toán trên bảng đích tương ứng khi registry thay đổi.';

-- Attach trigger to mdm_field_registry
DROP TRIGGER IF EXISTS trg_mdm_field_registry_on_change ON public.mdm_field_registry;
CREATE TRIGGER trg_mdm_field_registry_on_change
AFTER INSERT OR UPDATE ON public.mdm_field_registry
FOR EACH ROW EXECUTE FUNCTION public.fn_mdm_field_registry_attach_trigger();

-- ----------------------------------------------------
-- 3. Run Initialization Scan & Trigger Binding
-- ----------------------------------------------------
DO $$
DECLARE
  v_table text;
BEGIN
  FOR v_table IN 
    SELECT DISTINCT table_name 
    FROM public.mdm_field_registry
    WHERE field_role = 'FK_TO_DM'
      AND source_table = 'dm_lookup_value'
      AND is_active = true
  LOOP
    -- Ensure trigger is dynamically attached to all active pre-registered tables
    EXECUTE format('DROP TRIGGER IF EXISTS trg_mdm_validate_lookup_%I ON public.%I', v_table, v_table);
    EXECUTE format('
      CREATE TRIGGER trg_mdm_validate_lookup_%I
      BEFORE INSERT OR UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.fn_mdm_validate_lookup_integrity()',
      v_table, v_table
    );
  END LOOP;
END;
$$;
