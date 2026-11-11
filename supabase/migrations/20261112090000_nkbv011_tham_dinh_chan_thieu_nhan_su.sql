-- NKBV-011: rpc_nkbv_tham_dinh_ca bỏ qua luật «không tự thẩm định ca do chính mình ghi nhận»
-- khi người gọi không có hồ sơ mdm_nhan_su đang hoạt động (v_ns NULL), và khi đó ghi
-- nguoi_tham_dinh_id = NULL (mất vết người duyệt).
--  - Sửa: v_ns NULL → từ chối «Tài khoản chưa gắn hồ sơ nhân sự, không thể thẩm định.».
--  - Hàm không có nhánh ADMIN nào dựa vào v_ns NULL; đường gọi duy nhất là server action
--    (callThamDinhRpc, luôn truyền p_actor_user_id).
--  - Giữ nguyên chữ ký, SECURITY DEFINER, search_path, mọi nhánh khác. CREATE OR REPLACE giữ
--    ACL (chỉ service_role, 20261021060000) — không GRANT thêm.
-- Gốc: pg_get_functiondef trên DB local ngày 2026-11-12.

CREATE OR REPLACE FUNCTION public.rpc_nkbv_tham_dinh_ca(p_id uuid, p_decision text, p_ly_do text, p_notes_patch jsonb, p_actor_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  IF v_ns IS NULL THEN
    RAISE EXCEPTION 'Tài khoản chưa gắn hồ sơ nhân sự, không thể thẩm định.';
  END IF;
  IF v_ca.nguoi_ghi_id IS NOT NULL AND v_ns = v_ca.nguoi_ghi_id THEN
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

-- ============================================================================
-- CHƯA APPLY PROD — chờ PO
-- SQL kiểm prod (chỉ đọc):
--   SELECT pg_get_functiondef('public.rpc_nkbv_tham_dinh_ca'::regproc) ILIKE '%chưa gắn hồ sơ nhân sự%' AS da_apply;
--   SELECT proacl FROM pg_proc WHERE proname = 'rpc_nkbv_tham_dinh_ca';  -- kỳ vọng chỉ postgres + service_role
--   -- Người có quyền GIAM_SAT_NKBV approve nhưng chưa gắn hồ sơ nhân sự sẽ bị chặn sau migration:
--   SELECT u.id, u.email FROM auth.users u
--    WHERE NOT EXISTS (SELECT 1 FROM public.mdm_nhan_su ns WHERE ns.auth_user_id = u.id AND ns.is_active);
--   SELECT count(*) FROM public.nkbv_fact_su_kien
--    WHERE tham_dinh_luc IS NOT NULL AND nguoi_tham_dinh_id IS NULL;      -- ca đã duyệt mất vết người duyệt
-- ============================================================================
-- Rollback (chạy nguyên khối dưới, bỏ dấu comment) — bản trước migration này:
-- CREATE OR REPLACE FUNCTION public.rpc_nkbv_tham_dinh_ca(p_id uuid, p_decision text, p_ly_do text, p_notes_patch jsonb, p_actor_user_id uuid)
--  RETURNS uuid
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_decision text := upper(btrim(coalesce(p_decision, '')));
--   v_ly_do text := nullif(btrim(coalesce(p_ly_do, '')), '');
--   v_ca record;
--   v_cur text;
--   v_target_id uuid;
--   v_ns uuid;
-- BEGIN
--   IF v_decision NOT IN ('APPROVE', 'EXCLUDE') THEN
--     RAISE EXCEPTION 'Quyết định thẩm định không hợp lệ.';
--   END IF;
--
--   SELECT c.id, c.trang_thai_id, c.nguoi_ghi_id, c.clinical_notes, c.verification_data, c.is_active
--     INTO v_ca
--     FROM public.nkbv_fact_su_kien c
--    WHERE c.id = p_id
--    FOR UPDATE;
--   IF NOT FOUND THEN
--     RAISE EXCEPTION 'Không tìm thấy phiếu.';
--   END IF;
--   IF NOT v_ca.is_active THEN
--     RAISE EXCEPTION 'Phiếu đã bị ẩn — không thẩm định.';
--   END IF;
--
--   SELECT t.ma_trang_thai INTO v_cur FROM public.nkbv_dm_trang_thai_ca t WHERE t.id = v_ca.trang_thai_id;
--   IF v_cur IN ('XAC_NHAN', 'LOAI_TRU', 'DA_DONG') THEN
--     RAISE EXCEPTION 'Ca đã chốt (%) — không thẩm định lại.', v_cur;
--   END IF;
--
--   IF v_decision = 'APPROVE' THEN
--     IF v_cur NOT IN ('CHO_DUYET', 'CHO_XAC_NHAN') THEN
--       RAISE EXCEPTION 'Chỉ duyệt ca đang chờ xác nhận (hiện: %).', coalesce(v_cur, '?');
--     END IF;
--     IF coalesce(v_ca.verification_data ->> 'is_positive', '') <> 'true' THEN
--       RAISE EXCEPTION 'Kết luận không phải NKBV — chỉ phê duyệt khi engine dương tính (HAI đủ tiêu chí).';
--     END IF;
--   ELSE
--     IF v_cur NOT IN ('DANG_GHI_NHAN', 'CHO_DUYET', 'CHO_XAC_NHAN') THEN
--       RAISE EXCEPTION 'Không loại trừ được ca ở trạng thái %.', coalesce(v_cur, '?');
--     END IF;
--     IF v_ly_do IS NULL OR char_length(v_ly_do) < 3 THEN
--       RAISE EXCEPTION 'Cần nhập lý do loại trừ ca bệnh (tối thiểu 3 ký tự).';
--     END IF;
--   END IF;
--
--   SELECT ns.id INTO v_ns FROM public.mdm_nhan_su ns
--    WHERE ns.auth_user_id = p_actor_user_id AND ns.is_active = true LIMIT 1;
--   IF v_ns IS NOT NULL AND v_ca.nguoi_ghi_id IS NOT NULL AND v_ns = v_ca.nguoi_ghi_id THEN
--     RAISE EXCEPTION 'Người ghi phiếu không được tự thẩm định ca của mình.';
--   END IF;
--
--   SELECT t.id INTO v_target_id FROM public.nkbv_dm_trang_thai_ca t
--    WHERE t.ma_trang_thai = CASE v_decision WHEN 'APPROVE' THEN 'XAC_NHAN' ELSE 'LOAI_TRU' END
--      AND t.is_active = true;
--   IF v_target_id IS NULL THEN
--     RAISE EXCEPTION 'Thiếu danh mục trạng thái đích — liên hệ quản trị.';
--   END IF;
--
--   PERFORM set_config('app.nkbv_tham_dinh', 'on', true);
--   UPDATE public.nkbv_fact_su_kien
--      SET trang_thai_id = v_target_id,
--          clinical_notes = coalesce(v_ca.clinical_notes, '{}'::jsonb)
--                           || coalesce(p_notes_patch, '{}'::jsonb)
--                           || jsonb_build_object('ly_do_loai_tru', CASE v_decision WHEN 'EXCLUDE' THEN to_jsonb(v_ly_do) ELSE 'null'::jsonb END),
--          nguoi_tham_dinh_id = v_ns,
--          tham_dinh_luc = now(),
--          updated_at = now()
--    WHERE id = p_id;
--   PERFORM set_config('app.nkbv_tham_dinh', 'off', true);
--
--   RETURN p_id;
-- END;
-- $function$;
