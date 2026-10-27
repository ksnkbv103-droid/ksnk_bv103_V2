-- NK-AUTH (handover-roadmap §5): thẩm định ca NKBV chỉ qua RPC; trigger chặn đổi trạng thái chốt ngoài RPC.
-- Giả định (PO giao tự quyết 2026-10-21, chờ duyệt):
--  G1. Chỉ vai có GIAM_SAT_NKBV.approve (hiện chỉ ADMIN) được thẩm định; kiểm ở server action, RPC chỉ service_role.
--  G2. APPROVE chỉ từ CHO_DUYET/CHO_XAC_NHAN và khi verification_data.is_positive = true; EXCLUDE từ DANG_GHI_NHAN/CHO_DUYET/CHO_XAC_NHAN, lý do >= 3 ký tự.
--  G3. Chặn tự duyệt: người thẩm định (mdm_nhan_su theo auth_user_id) trùng nguoi_ghi_id của ca thì từ chối. Ca nguoi_ghi_id NULL không bị chặn.
--  G4. Trigger chặn: đổi trang_thai_id sang XAC_NHAN/LOAI_TRU, hoặc rời khỏi XAC_NHAN/LOAI_TRU/DA_DONG, khi chưa bật cờ app.nkbv_tham_dinh (RPC bật cờ cục bộ giao dịch). INSERT không bị chặn.
--  G5. Ca đã chốt không mở lại ở lát này (không có route «mở lại»); cần PO nếu muốn.

ALTER TABLE public.nkbv_fact_su_kien
  ADD COLUMN IF NOT EXISTS nguoi_tham_dinh_id uuid,
  ADD COLUMN IF NOT EXISTS tham_dinh_luc timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nkbv_su_kien_nguoi_tham_dinh') THEN
    ALTER TABLE public.nkbv_fact_su_kien
      ADD CONSTRAINT fk_nkbv_su_kien_nguoi_tham_dinh
      FOREIGN KEY (nguoi_tham_dinh_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.nkbv_fact_su_kien.nguoi_tham_dinh_id IS
  'NK-AUTH: nhân sự thẩm định (best-effort theo auth_user_id); NULL với ca chốt trước NK-AUTH.';
COMMENT ON COLUMN public.nkbv_fact_su_kien.tham_dinh_luc IS
  'NK-AUTH: thời điểm thẩm định (XAC_NHAN/LOAI_TRU) qua rpc_nkbv_tham_dinh_ca.';

CREATE OR REPLACE FUNCTION public.rpc_nkbv_tham_dinh_ca(
  p_id uuid,
  p_decision text,
  p_ly_do text,
  p_notes_patch jsonb,
  p_actor_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_decision text := upper(btrim(coalesce(p_decision, '')));
  v_ly_do text := nullif(btrim(coalesce(p_ly_do, '')), '');
  v_ca record;
  v_cur text;
  v_target_id uuid;
  v_ns uuid;
BEGIN
  IF v_decision NOT IN ('APPROVE', 'EXCLUDE') THEN
    RAISE EXCEPTION 'Quyết định thẩm định không hợp lệ.';
  END IF;

  SELECT c.id, c.trang_thai_id, c.nguoi_ghi_id, c.clinical_notes, c.verification_data, c.is_active
    INTO v_ca
    FROM public.nkbv_fact_su_kien c
   WHERE c.id = p_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu.';
  END IF;
  IF NOT v_ca.is_active THEN
    RAISE EXCEPTION 'Phiếu đã bị ẩn — không thẩm định.';
  END IF;

  SELECT t.ma_trang_thai INTO v_cur FROM public.nkbv_dm_trang_thai_ca t WHERE t.id = v_ca.trang_thai_id;
  IF v_cur IN ('XAC_NHAN', 'LOAI_TRU', 'DA_DONG') THEN
    RAISE EXCEPTION 'Ca đã chốt (%) — không thẩm định lại.', v_cur;
  END IF;

  IF v_decision = 'APPROVE' THEN
    IF v_cur NOT IN ('CHO_DUYET', 'CHO_XAC_NHAN') THEN
      RAISE EXCEPTION 'Chỉ duyệt ca đang chờ xác nhận (hiện: %).', coalesce(v_cur, '?');
    END IF;
    IF coalesce(v_ca.verification_data ->> 'is_positive', '') <> 'true' THEN
      RAISE EXCEPTION 'Kết luận không phải NKBV — chỉ phê duyệt khi engine dương tính (HAI đủ tiêu chí).';
    END IF;
  ELSE
    IF v_cur NOT IN ('DANG_GHI_NHAN', 'CHO_DUYET', 'CHO_XAC_NHAN') THEN
      RAISE EXCEPTION 'Không loại trừ được ca ở trạng thái %.', coalesce(v_cur, '?');
    END IF;
    IF v_ly_do IS NULL OR char_length(v_ly_do) < 3 THEN
      RAISE EXCEPTION 'Cần nhập lý do loại trừ ca bệnh (tối thiểu 3 ký tự).';
    END IF;
  END IF;

  SELECT ns.id INTO v_ns FROM public.mdm_nhan_su ns
   WHERE ns.auth_user_id = p_actor_user_id AND ns.is_active = true LIMIT 1;
  IF v_ns IS NOT NULL AND v_ca.nguoi_ghi_id IS NOT NULL AND v_ns = v_ca.nguoi_ghi_id THEN
    RAISE EXCEPTION 'Người ghi phiếu không được tự thẩm định ca của mình.';
  END IF;

  SELECT t.id INTO v_target_id FROM public.nkbv_dm_trang_thai_ca t
   WHERE t.ma_trang_thai = CASE v_decision WHEN 'APPROVE' THEN 'XAC_NHAN' ELSE 'LOAI_TRU' END
     AND t.is_active = true;
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu danh mục trạng thái đích — liên hệ quản trị.';
  END IF;

  PERFORM set_config('app.nkbv_tham_dinh', 'on', true);
  UPDATE public.nkbv_fact_su_kien
     SET trang_thai_id = v_target_id,
         clinical_notes = coalesce(v_ca.clinical_notes, '{}'::jsonb)
                          || coalesce(p_notes_patch, '{}'::jsonb)
                          || jsonb_build_object('ly_do_loai_tru', CASE v_decision WHEN 'EXCLUDE' THEN to_jsonb(v_ly_do) ELSE 'null'::jsonb END),
         nguoi_tham_dinh_id = v_ns,
         tham_dinh_luc = now(),
         updated_at = now()
   WHERE id = p_id;
  PERFORM set_config('app.nkbv_tham_dinh', 'off', true);

  RETURN p_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_nkbv_tham_dinh_ca(uuid, text, text, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_nkbv_tham_dinh_ca(uuid, text, text, jsonb, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.fn_nkbv_su_kien_guard_trang_thai()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_old text;
  v_new text;
BEGIN
  IF NEW.trang_thai_id IS NOT DISTINCT FROM OLD.trang_thai_id THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.nkbv_tham_dinh', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  SELECT ma_trang_thai INTO v_old FROM public.nkbv_dm_trang_thai_ca WHERE id = OLD.trang_thai_id;
  SELECT ma_trang_thai INTO v_new FROM public.nkbv_dm_trang_thai_ca WHERE id = NEW.trang_thai_id;
  IF v_new IN ('XAC_NHAN', 'LOAI_TRU') OR v_old IN ('XAC_NHAN', 'LOAI_TRU', 'DA_DONG') THEN
    RAISE EXCEPTION 'Trạng thái chốt (xác nhận/loại trừ) chỉ đổi qua thẩm định (rpc_nkbv_tham_dinh_ca).';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_nkbv_su_kien_guard_trang_thai ON public.nkbv_fact_su_kien;
CREATE TRIGGER trg_nkbv_su_kien_guard_trang_thai
  BEFORE UPDATE OF trang_thai_id ON public.nkbv_fact_su_kien
  FOR EACH ROW EXECUTE FUNCTION public.fn_nkbv_su_kien_guard_trang_thai();
