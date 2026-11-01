-- CSSD K3 (PO 2026-11-01): test không đạt vẫn phải ghi các test còn lại (CI PCD...) với người + giờ.
-- rpc_cssd_me_ghi_test nhận thêm trạng thái QC_KHONG_DAT: chỉ ghi nhật ký GHI_TEST, không đổi trạng thái, không thu hồi lại.
-- Hoàn tác: CREATE OR REPLACE lại hàm từ migration 20261030020000 (bỏ 'QC_KHONG_DAT' khỏi danh sách trạng thái và nhánh mới).

CREATE OR REPLACE FUNCTION public.rpc_cssd_me_ghi_test(
  p_me_id uuid, p_loai text, p_ket_qua text, p_chi_tiet jsonb DEFAULT NULL, p_actor_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_ns uuid;
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_loai text := upper(btrim(coalesce(p_loai, '')));
  v_kq text := upper(btrim(coalesce(p_ket_qua, '')));
  v_dat boolean;
  v_now timestamptz := now();
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();
  IF v_loai NOT IN ('THONG_SO_VAT_LY', 'CI_NGOAI_GOI', 'CI_PCD', 'BI', 'BOWIE_DICK') THEN
    RETURN jsonb_build_object('success', false, 'ok', false, 'message', 'Loại test không hợp lệ: ' || coalesce(p_loai, ''));
  END IF;
  IF v_kq NOT IN ('DAT', 'KHONG_DAT') AND NOT (v_loai = 'BI' AND v_kq IN ('AM', 'DUONG')) THEN
    RETURN jsonb_build_object('success', false, 'ok', false, 'message', 'Kết quả test không hợp lệ: ' || coalesce(p_ket_qua, ''));
  END IF;
  IF v_loai = 'BI' THEN
    v_kq := CASE v_kq WHEN 'DAT' THEN 'AM' WHEN 'KHONG_DAT' THEN 'DUONG' ELSE v_kq END;
  END IF;
  v_dat := v_kq IN ('DAT', 'AM');

  v_ns := public.fn_cssd_me_nguoi_thao_tac(p_actor_user_id);
  IF v_ns IS NULL THEN
    RETURN jsonb_build_object('success', false, 'ok', false, 'message', 'Tài khoản chưa gắn hồ sơ nhân sự — không ghi được người đọc test.');
  END IF;

  SELECT * INTO v_me FROM public.cssd_fact_lo_tiet_khuan WHERE id = p_me_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'ok', false, 'message', 'Không tìm thấy mẻ.');
  END IF;
  IF coalesce(v_me.trang_thai_me, '') NOT IN ('DA_CHOT_NAP', 'DANG_TIET_KHUAN', 'CHO_DANH_GIA_QC', 'CHO_BI', 'HOAN_THANH', 'QC_KHONG_DAT') THEN
    RETURN jsonb_build_object('success', false, 'ok', false,
      'message', 'Mẻ ở trạng thái ' || coalesce(v_me.trang_thai_me, '—') || ' — không ghi test.');
  END IF;

  PERFORM public.fn_cssd_me_nhat_ky_them(p_me_id, 'GHI_TEST', v_ns,
    jsonb_strip_nulls(jsonb_build_object('loai', v_loai, 'ket_qua', v_kq, 'dat', v_dat, 'ghi_chu', p_chi_tiet)));

  IF v_dat THEN
    RETURN jsonb_build_object('success', true, 'ok', true, 'dat', true, 'trang_thai_me', v_me.trang_thai_me);
  END IF;

  -- Mẻ đã QC_KHONG_DAT (test trước hỏng): chỉ ghi nhật ký người + giờ, không đổi trạng thái (PO 2026-11-01, K3).
  IF v_me.trang_thai_me = 'QC_KHONG_DAT' THEN
    RETURN jsonb_build_object('success', true, 'ok', true, 'dat', false, 'trang_thai_me', 'QC_KHONG_DAT',
      'message', 'Lô hỏng, cần xem lại');
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET trang_thai_me = 'QC_KHONG_DAT',
      ket_qua_test = coalesce(ket_qua_test, false),
      trang_thai_bi = CASE WHEN v_loai = 'BI' THEN 'DUONG' ELSE trang_thai_bi END,
      ket_qua_bi = CASE WHEN v_loai = 'BI' THEN false ELSE ket_qua_bi END,
      updated_at = v_now
  WHERE id = p_me_id;

  RETURN jsonb_build_object('success', true, 'ok', true, 'dat', false, 'trang_thai_me', 'QC_KHONG_DAT',
    'trang_thai_me_truoc', v_me.trang_thai_me,
    'can_thu_hoi', true,
    'message', 'Lô hỏng, cần xem lại');
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_ghi_test(uuid, text, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_ghi_test(uuid, text, text, jsonb, uuid) TO authenticated, service_role;
