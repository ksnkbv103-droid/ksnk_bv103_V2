-- MDM governance: fix lookup trigger SSOT + seed physical-table registry + prune noise suggestions.
-- Pilot slice: chỉ FK_TO_DM → sys_lookup_value; không ép TEXT_ENUM.

-- 1) Trigger attach + validate: chấp nhận sys_lookup_value (app) và dm_lookup_value (compat view)
CREATE OR REPLACE FUNCTION public.fn_mdm_field_registry_attach_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF to_regclass(format('public.%I', COALESCE(NEW.table_name, OLD.table_name))) IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NEW.field_role = 'FK_TO_DM'
     AND NEW.source_table IN ('dm_lookup_value', 'sys_lookup_value')
     AND NEW.is_active = true THEN
    EXECUTE format('DROP TRIGGER IF EXISTS trg_mdm_validate_lookup_%I ON public.%I', NEW.table_name, NEW.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_mdm_validate_lookup_%I
       BEFORE INSERT OR UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.fn_mdm_validate_lookup_integrity()',
      NEW.table_name,
      NEW.table_name
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false
        AND to_regclass(format('public.%I', OLD.table_name)) IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.sys_mdm_registry
      WHERE table_name = OLD.table_name
        AND field_role = 'FK_TO_DM'
        AND source_table IN ('dm_lookup_value', 'sys_lookup_value')
        AND is_active = true
        AND id <> OLD.id
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_mdm_validate_lookup_%I ON public.%I', OLD.table_name, OLD.table_name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mdm_validate_lookup_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_rec record;
  v_val text;
  v_actual_type text;
  v_actual_active boolean;
BEGIN
  FOR v_rec IN
    SELECT column_name, source_loai_danh_muc, is_required
    FROM public.sys_mdm_registry
    WHERE table_name = TG_TABLE_NAME
      AND field_role = 'FK_TO_DM'
      AND source_table IN ('dm_lookup_value', 'sys_lookup_value')
      AND is_active = true
  LOOP
    v_val := to_jsonb(NEW) ->> v_rec.column_name;

    IF v_val IS NOT NULL AND v_val <> '' THEN
      SELECT category_type, is_active
      INTO v_actual_type, v_actual_active
      FROM public.sys_lookup_value
      WHERE id = v_val::uuid;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Lỗi toàn vẹn dữ liệu (MDM): Cột % trong bảng % có giá trị % không tồn tại trong sys_lookup_value.',
          v_rec.column_name, TG_TABLE_NAME, v_val;
      END IF;

      IF v_actual_type IS DISTINCT FROM v_rec.source_loai_danh_muc THEN
        RAISE EXCEPTION 'Lỗi toàn vẹn dữ liệu (MDM): Cột % trong bảng % trỏ đến bản ghi có loại % nhưng yêu cầu loại %.',
          v_rec.column_name, TG_TABLE_NAME, v_actual_type, v_rec.source_loai_danh_muc;
      END IF;

      IF NOT v_actual_active THEN
        RAISE EXCEPTION 'Lỗi toàn vẹn dữ liệu (MDM): Cột % trong bảng % trỏ đến bản ghi danh mục % đã ngưng hoạt động.',
          v_rec.column_name, TG_TABLE_NAME, v_val;
      END IF;
    ELSIF v_rec.is_required THEN
      RAISE EXCEPTION 'Lỗi toàn vẹn dữ liệu (MDM): Cột bắt buộc % trong bảng % không được phép trống.',
        v_rec.column_name, TG_TABLE_NAME;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_mdm_field_registry_attach_trigger() IS
  'Gắn/gỡ trigger fn_mdm_validate_lookup_integrity theo sys_mdm_registry (FK_TO_DM → sys_lookup_value/dm_lookup_value).';

COMMENT ON FUNCTION public.fn_mdm_validate_lookup_integrity() IS
  'Kiểm tra FK lookup theo sys_mdm_registry; đọc SSOT sys_lookup_value.';

-- 2) Deactivate registry trỏ bảng compat đã DROP (không còn BASE TABLE)
UPDATE public.sys_mdm_registry r
SET is_active = false,
    notes = COALESCE(notes, '') || ' [auto-deactivated: legacy table dropped 2026-06-04]',
    updated_at = now()
WHERE r.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name = r.table_name
      AND t.table_type = 'BASE TABLE'
  );

-- 3) Bulk seed FK_TO_DM trên bảng vật lý (đối chiếu FK → sys_lookup_value, 2026-06-04 linked probe)
INSERT INTO public.sys_mdm_registry (
  table_name, column_name, field_role, source_table, source_column,
  source_loai_danh_muc, is_required, is_active, suggestion_policy, notes
)
VALUES
  ('mdm_dm_khoa_phong', 'khoi_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'KHOI_KHOA', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('mdm_nhan_su', 'to_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'TO_CONG_TAC', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('mdm_nhan_su', 'chuc_vu_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'CHUC_VU', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('mdm_nhan_su', 'chuc_danh_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'CHUC_DANH', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('mdm_nhan_su', 'nghe_nghiep_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'NGHE_NGHIEP', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('gstt_fact_chung_sessions', 'hinh_thuc_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'HINH_THUC_GIAM_SAT', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('gstt_fact_chung_sessions', 'cach_thuc_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'CACH_THUC_GIAM_SAT', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('gstt_fact_chung_sessions', 'khu_vuc_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'KHU_VUC_GIAM_SAT', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('gstt_fact_chung_sessions', 'nghe_nghiep_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'NGHE_NGHIEP', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('gstt_fact_vst', 'khu_vuc_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'KHU_VUC_GIAM_SAT', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('gstt_fact_vst', 'nghe_nghiep_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'NGHE_NGHIEP', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('gstt_fact_vst_sessions', 'hinh_thuc_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'HINH_THUC_GIAM_SAT', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('gstt_fact_vst_sessions', 'cach_thuc_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'CACH_THUC_GIAM_SAT', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('gstt_fact_vst_sessions', 'khu_vuc_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'KHU_VUC_GIAM_SAT', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('cssd_fact_lo_tiet_khuan', 'loai_may_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'LOAI_MAY_TIET_KHUAN', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('cssd_fact_quy_trinh', 'tram_hien_tai_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'TRAM_CSSD', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('cssd_fact_su_co', 'loai_su_co_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'LOAI_SU_CO', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('nkbv_fact_su_kien', 'loai_nkbv_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'LOAI_NKBV', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('nkbv_fact_su_kien', 'trang_thai_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'TRANG_THAI_NKBV_CA', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('qlcv_fact_cong_viec', 'loai_cong_viec_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'LOAI_CONG_VIEC', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('qlcv_fact_cong_viec', 'to_cong_tac_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'TO_CONG_TAC', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard'),
  ('qlcv_fact_cong_viec_dinh_ky', 'to_cong_tac_id', 'FK_TO_DM', 'sys_lookup_value', 'id', 'TO_CONG_TAC', false, true, 'AUTO_ENFORCE', 'Bulk seed lookup guard')
ON CONFLICT (table_name, column_name) DO UPDATE SET
  field_role = EXCLUDED.field_role,
  source_table = EXCLUDED.source_table,
  source_column = EXCLUDED.source_column,
  source_loai_danh_muc = EXCLUDED.source_loai_danh_muc,
  is_active = true,
  suggestion_policy = EXCLUDED.suggestion_policy,
  notes = EXCLUDED.notes,
  updated_at = now();

-- 4) Re-fire attach trigger cho mọi FK_TO_DM active trên bảng vật lý
UPDATE public.sys_mdm_registry
SET updated_at = now()
WHERE is_active = true
  AND field_role = 'FK_TO_DM'
  AND source_table IN ('dm_lookup_value', 'sys_lookup_value')
  AND EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name = sys_mdm_registry.table_name
      AND t.table_type = 'BASE TABLE'
  );

-- 5) Dọn gợi ý: enum/text (chưa chuẩn hóa schema), VIEW, bảng hệ thống
UPDATE public.sys_mdm_suggestion s
SET status = 'REJECTED',
    reason = reason || ' [auto-reject: enum/view/not-write-path 2026-06-04]',
    updated_at = now()
WHERE s.status = 'OPEN'
  AND (
    s.suggestion_type = 'CONSIDER_ENUM_TO_DM'
    OR EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_name = s.table_name
        AND t.table_type = 'VIEW'
    )
    OR s.table_name LIKE 'sys\_%' ESCAPE '\'
    OR s.table_name LIKE 'v\_%' ESCAPE '\'
    OR s.table_name LIKE '%\_summary' ESCAPE '\'
    OR s.table_name IN ('mdm_field_registry', 'mdm_governance_suggestion', 'sys_mdm_registry', 'sys_mdm_suggestion')
  );

-- 6) Đánh dấu DONE gợi ý REGISTER_FK đã có registry active tương ứng
UPDATE public.sys_mdm_suggestion s
SET status = 'DONE',
    updated_at = now()
WHERE s.status = 'OPEN'
  AND s.suggestion_type = 'REGISTER_FK'
  AND EXISTS (
    SELECT 1
    FROM public.sys_mdm_registry r
    WHERE r.table_name = s.table_name
      AND r.column_name = s.column_name
      AND r.is_active = true
  );

-- 7) Còn lại: FK chuyên biệt (mdm_nhan_su, cssd_dm_*, …) — Postgres đã có CONSTRAINT, không cần lookup trigger
UPDATE public.sys_mdm_suggestion s
SET status = 'REJECTED',
    reason = s.reason || ' [auto-reject: FK chuyên biệt — PostgreSQL constraint đủ, không dùng lookup trigger]',
    updated_at = now()
WHERE s.status = 'OPEN'
  AND s.suggestion_type = 'REGISTER_FK';
