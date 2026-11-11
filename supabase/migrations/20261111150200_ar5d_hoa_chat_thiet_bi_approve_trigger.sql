-- AR-5d (PO 2026-11-10): chặn ghi thẳng PostgREST bỏ qua quyền approve.
-- Chỉ áp cho role `authenticated` (JWT người dùng). service_role / hàm DEFINER (owner postgres) đi qua:
-- app đã kiểm approve ở server action trước khi ghi bằng admin client.
-- Nhạy cảm: INSERT; UPDATE đổi is_active; hóa chất thêm: nồng độ (specs->nong_do), định mức, tỷ lệ cảnh báo, ngày chờ hàng.
-- Không đổi RLS/policy/quyền vai trò. Rollback: DROP TRIGGER + DROP FUNCTION bên dưới.

CREATE OR REPLACE FUNCTION public.fn_cssd_dm_approve_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_module text := CASE TG_TABLE_NAME WHEN 'cssd_dm_hoa_chat' THEN 'HOA_CHAT' ELSE 'THIET_BI' END;
  v_sensitive boolean := false;
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_sensitive := true;
  ELSE
    v_sensitive := NEW.is_active IS DISTINCT FROM OLD.is_active;
    IF TG_TABLE_NAME = 'cssd_dm_hoa_chat' THEN
      v_sensitive := v_sensitive
        OR (NEW.specs ->> 'nong_do') IS DISTINCT FROM (OLD.specs ->> 'nong_do')
        OR NEW.nguong_ton_toi_thieu IS DISTINCT FROM OLD.nguong_ton_toi_thieu
        OR NEW.ty_le_canh_bao_pct IS DISTINCT FROM OLD.ty_le_canh_bao_pct
        OR NEW.so_ngay_cho_hang IS DISTINCT FROM OLD.so_ngay_cho_hang;
    END IF;
  END IF;

  IF v_sensitive AND NOT public.fn_sys_has_permission(v_module, 'approve') THEN
    RAISE EXCEPTION 'Thay đổi cần chủ nhiệm khoa duyệt (quyền approve trên %).', v_module
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cssd_dm_hoa_chat_approve_guard ON public.cssd_dm_hoa_chat;
CREATE TRIGGER trg_cssd_dm_hoa_chat_approve_guard
  BEFORE INSERT OR UPDATE ON public.cssd_dm_hoa_chat
  FOR EACH ROW EXECUTE FUNCTION public.fn_cssd_dm_approve_guard();

DROP TRIGGER IF EXISTS trg_cssd_dm_thiet_bi_approve_guard ON public.cssd_dm_thiet_bi;
CREATE TRIGGER trg_cssd_dm_thiet_bi_approve_guard
  BEFORE INSERT OR UPDATE ON public.cssd_dm_thiet_bi
  FOR EACH ROW EXECUTE FUNCTION public.fn_cssd_dm_approve_guard();

-- Rollback:
--   DROP TRIGGER trg_cssd_dm_hoa_chat_approve_guard ON public.cssd_dm_hoa_chat;
--   DROP TRIGGER trg_cssd_dm_thiet_bi_approve_guard ON public.cssd_dm_thiet_bi;
--   DROP FUNCTION public.fn_cssd_dm_approve_guard();
