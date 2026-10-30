-- CSSD lát 2: phiếu tiệt khuẩn ghi người + giờ từng bước (PO 2026-10-30).
-- Luồng mẻ: DANG_CHUAN_NAP → (rpc_cssd_me_ket_thuc_nap) DA_CHOT_NAP → (rpc_cssd_me_bat_dau) DANG_TIET_KHUAN
--   → (rpc_cssd_me_ket_thuc_tiet_khuan) CHO_DANH_GIA_QC → rpc_cssd_me_ghi_test (mỗi test một dòng người + giờ)
--   → rpc_cssd_me_ket_luan_dat (HOAN_THANH, bộ sang kho vô khuẩn). Test KHÔNG ĐẠT / BI dương → QC_KHONG_DAT, chặn cứng.
-- Nhật ký mẻ: tk_qc_json.nhat_ky (chỉ-thêm, chỉ hàm fn_cssd_me_nhat_ky_them được nối; ghi đè tk_qc_json từ nơi khác
--   tự giữ nguyên nhat_ky cũ). Nhật ký từng bộ: metadata.nhat_ky (lát 1).
-- Người thao tác: phiên đăng nhập (auth.uid() → mdm_nhan_su). App CSSD gọi bằng admin client (service_role) — khi đó
--   lấy p_actor_user_id do server truyền từ phiên (requireSessionActorId); người dùng đăng nhập không giả được (auth.uid() có giá trị thì bỏ qua tham số).
-- Cột nguoi_bat_dau_id / nguoi_ket_thuc_id giữ quy ước cũ = auth user id (bản in đọc qua loadHoTenByAuthUserId);
--   nguoi_nap_id = mdm_nhan_su.id (FK). Thời gian tiệt khuẩn = thoi_gian_ket_thuc − thoi_gian_bat_dau.
-- Hoàn tác: khôi phục rpc_cssd_me_bat_dau, rpc_cssd_me_ket_luan_dat từ bản trước (pg_get_functiondef trước khi apply);
--   DROP FUNCTION rpc_cssd_me_ket_thuc_nap, rpc_cssd_me_ket_thuc_tiet_khuan, rpc_cssd_me_ghi_test, fn_cssd_me_nguoi_thao_tac,
--   fn_cssd_me_nhat_ky_them; DROP TRIGGER trg_cssd_guard_me_nhat_ky_chi_them, trg_cssd_chan_bo_me_khong_dat + hàm;
--   UPDATE trang_thai_me DA_CHOT_NAP → DANG_CHUAN_NAP rồi khôi phục constraint 7 trạng thái.

-- 1) Trạng thái mới DA_CHOT_NAP.
ALTER TABLE public.cssd_fact_lo_tiet_khuan DROP CONSTRAINT IF EXISTS cssd_fact_lo_tiet_khuan_trang_thai_me_chk;
ALTER TABLE public.cssd_fact_lo_tiet_khuan ADD CONSTRAINT cssd_fact_lo_tiet_khuan_trang_thai_me_chk CHECK (
  trang_thai_me IS NULL OR trang_thai_me = ANY (ARRAY[
    'DANG_CHUAN_NAP', 'DA_CHOT_NAP', 'DANG_TIET_KHUAN', 'CHO_DANH_GIA_QC', 'CHO_BI', 'HOAN_THANH', 'QC_KHONG_DAT', 'THU_HOI'
  ])
);

-- 2) Người thao tác (nhân sự) từ phiên; service_role → auth user id do server truyền.
CREATE OR REPLACE FUNCTION public.fn_cssd_me_nguoi_thao_tac(p_actor_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN public.fn_cssd_operator_nhan_su_id(NULL);
  END IF;
  IF coalesce(auth.role(), '') = 'service_role' AND p_actor_user_id IS NOT NULL THEN
    RETURN (SELECT ns.id FROM public.mdm_nhan_su ns
             WHERE ns.is_active = true AND ns.auth_user_id = p_actor_user_id LIMIT 1);
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_cssd_me_nguoi_thao_tac(uuid) FROM PUBLIC, anon, authenticated;

-- 3) Nhật ký mẻ (tk_qc_json.nhat_ky) + nhật ký từng bộ đang thuộc mẻ.
CREATE OR REPLACE FUNCTION public.fn_cssd_me_nhat_ky_them(
  p_me_id uuid, p_su_kien text, p_nhan_su_id uuid, p_chi_tiet jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_qt uuid;
BEGIN
  PERFORM set_config('cssd.me_nhat_ky_them', '1', true);
  UPDATE public.cssd_fact_lo_tiet_khuan m
  SET tk_qc_json = jsonb_set(
    coalesce(m.tk_qc_json, '{}'::jsonb),
    '{nhat_ky}',
    CASE WHEN jsonb_typeof(m.tk_qc_json -> 'nhat_ky') = 'array' THEN m.tk_qc_json -> 'nhat_ky' ELSE '[]'::jsonb END
      || jsonb_build_array(public.fn_cssd_nhat_ky_dong(p_su_kien, 'TIET_KHUAN', p_nhan_su_id, NULL, p_chi_tiet)),
    true
  )
  WHERE m.id = p_me_id;
  PERFORM set_config('cssd.me_nhat_ky_them', '', true);

  FOR v_qt IN
    SELECT q.id FROM public.cssd_fact_quy_trinh q
    WHERE q.lo_tiet_khuan_id = p_me_id AND q.is_active = true
    ORDER BY q.id
  LOOP
    PERFORM public.fn_cssd_nhat_ky_them(v_qt, p_su_kien, 'TIET_KHUAN', p_nhan_su_id, 'PHIEU_TK', p_chi_tiet);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_cssd_me_nhat_ky_them(uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- 4) tk_qc_json.nhat_ky chỉ-thêm: ngoài fn_cssd_me_nhat_ky_them, mọi ghi đè tk_qc_json giữ nguyên nhat_ky cũ
--    (ket_luan_dat / thu_hoi / ghi_cho_bi thay cả JSON vẫn không xóa được nhật ký, client không chèn được dòng giả).
CREATE OR REPLACE FUNCTION public.fn_cssd_guard_me_nhat_ky_chi_them()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_old jsonb := CASE WHEN jsonb_typeof(OLD.tk_qc_json -> 'nhat_ky') = 'array' THEN OLD.tk_qc_json -> 'nhat_ky' ELSE '[]'::jsonb END;
  v_new jsonb;
  i int;
BEGIN
  IF coalesce(current_setting('cssd.me_nhat_ky_them', true), '') <> '1' THEN
    IF jsonb_array_length(v_old) = 0 THEN
      NEW.tk_qc_json := coalesce(NEW.tk_qc_json, '{}'::jsonb) - 'nhat_ky';
    ELSE
      NEW.tk_qc_json := jsonb_set(coalesce(NEW.tk_qc_json, '{}'::jsonb), '{nhat_ky}', v_old, true);
    END IF;
    RETURN NEW;
  END IF;
  v_new := NEW.tk_qc_json -> 'nhat_ky';
  IF v_new IS NULL OR jsonb_typeof(v_new) <> 'array' OR jsonb_array_length(v_new) < jsonb_array_length(v_old) THEN
    RAISE EXCEPTION 'Nhật ký mẻ chỉ được thêm, không xóa/rút ngắn.' USING ERRCODE = 'check_violation';
  END IF;
  FOR i IN 0 .. jsonb_array_length(v_old) - 1 LOOP
    IF v_new -> i IS DISTINCT FROM v_old -> i THEN
      RAISE EXCEPTION 'Nhật ký mẻ chỉ được thêm, không sửa dòng đã ghi (vị trí %).', i USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cssd_guard_me_nhat_ky_chi_them ON public.cssd_fact_lo_tiet_khuan;
CREATE TRIGGER trg_cssd_guard_me_nhat_ky_chi_them
  BEFORE UPDATE OF tk_qc_json ON public.cssd_fact_lo_tiet_khuan
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cssd_guard_me_nhat_ky_chi_them();

-- 5) Mẻ QC_KHONG_DAT: không cho bộ của mẻ sang kho vô khuẩn (CAP_PHAT), không gán HSD, không cấp phát.
CREATE OR REPLACE FUNCTION public.fn_cssd_chan_bo_me_khong_dat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ma text;
BEGIN
  SELECT m.ma_lo_tiet_khuan INTO v_ma
  FROM public.cssd_fact_lo_tiet_khuan m
  WHERE m.id = NEW.lo_tiet_khuan_id AND m.trang_thai_me = 'QC_KHONG_DAT';
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  IF (NEW.tram_hien_tai_id IS DISTINCT FROM OLD.tram_hien_tai_id
        AND EXISTS (SELECT 1 FROM public.cssd_dm_tram t WHERE t.id = NEW.tram_hien_tai_id AND t.ma_tram = 'CAP_PHAT'))
     OR (NEW.han_su_dung IS NOT NULL AND NEW.han_su_dung IS DISTINCT FROM OLD.han_su_dung)
     OR (NEW.ngay_het_han IS NOT NULL AND NEW.ngay_het_han IS DISTINCT FROM OLD.ngay_het_han)
     OR (NEW.thoi_gian_cap_phat IS NOT NULL AND NEW.thoi_gian_cap_phat IS DISTINCT FROM OLD.thoi_gian_cap_phat) THEN
    RAISE EXCEPTION 'Lô hỏng, cần xem lại — mẻ % không đạt QC, không đưa bộ vào kho vô khuẩn / cấp phát.', coalesce(v_ma, NEW.lo_tiet_khuan_id::text)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cssd_chan_bo_me_khong_dat ON public.cssd_fact_quy_trinh;
CREATE TRIGGER trg_cssd_chan_bo_me_khong_dat
  BEFORE UPDATE OF tram_hien_tai_id, han_su_dung, ngay_het_han, thoi_gian_cap_phat ON public.cssd_fact_quy_trinh
  FOR EACH ROW
  WHEN (NEW.lo_tiet_khuan_id IS NOT NULL)
  EXECUTE FUNCTION public.fn_cssd_chan_bo_me_khong_dat();

-- 6) Kết thúc nạp (chốt nạp): người nạp = người bấm.
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_ket_thuc_nap(p_me_id uuid, p_actor_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_ns uuid;
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_now timestamptz := now();
  v_so_bo int;
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();
  v_ns := public.fn_cssd_me_nguoi_thao_tac(p_actor_user_id);
  IF v_ns IS NULL THEN
    RETURN jsonb_build_object('success', false, 'ok', false, 'message', 'Tài khoản chưa gắn hồ sơ nhân sự — không ghi được người nạp.');
  END IF;

  SELECT * INTO v_me FROM public.cssd_fact_lo_tiet_khuan WHERE id = p_me_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'ok', false, 'message', 'Không tìm thấy mẻ.');
  END IF;
  IF coalesce(v_me.trang_thai_me, 'DANG_CHUAN_NAP') <> 'DANG_CHUAN_NAP'
     OR v_me.tk_chot_nap_at IS NOT NULL OR v_me.ket_qua_test IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'ok', false,
      'message', 'Mẻ không ở bước chuẩn nạp (hiện ' || coalesce(v_me.trang_thai_me, '—') || ') — không chốt nạp.');
  END IF;

  SELECT count(*)::int INTO v_so_bo
  FROM public.cssd_fact_quy_trinh q
  WHERE q.lo_tiet_khuan_id = p_me_id AND q.is_active = true;
  IF v_so_bo = 0 THEN
    RETURN jsonb_build_object('success', false, 'ok', false, 'message', 'Chưa có bộ nào trong mẻ — không chốt nạp.');
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET tk_chot_nap_at = v_now, nguoi_nap_id = v_ns, trang_thai_me = 'DA_CHOT_NAP', updated_at = v_now
  WHERE id = p_me_id;

  PERFORM public.fn_cssd_me_nhat_ky_them(p_me_id, 'KET_THUC_NAP', v_ns, jsonb_build_object('so_bo', v_so_bo));

  RETURN jsonb_build_object('success', true, 'ok', true, 'trang_thai_me', 'DA_CHOT_NAP',
    'nguoi_nap_id', v_ns, 'tk_chot_nap_at', v_now, 'so_bo', v_so_bo);
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_ket_thuc_nap(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_ket_thuc_nap(uuid, uuid) TO authenticated, service_role;

-- 7) Bắt đầu tiệt khuẩn: chỉ từ DA_CHOT_NAP; giữ mọi cổng cũ (máy, BD đầu ngày, phương pháp, nhiệt) của bản trước.
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_bat_dau(p_me_id uuid, p_actor_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_ids uuid[];
  v_id uuid;
  v_ma text;
  v_tram text;
  v_active boolean;
  v_dong boolean;
  v_role text;
  v_bo uuid;
  v_may_tt text;
  v_steam boolean;
  v_heat text;
  v_dong_goi uuid;
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
  v_pp_may text;
  v_pp_me text;
  v_ns uuid;
  v_auth uuid;
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();
  v_ns := public.fn_cssd_me_nguoi_thao_tac(p_actor_user_id);
  IF v_ns IS NULL THEN
    RETURN jsonb_build_object('success', false, 'ok', false, 'message', 'Tài khoản chưa gắn hồ sơ nhân sự — không ghi được người bắt đầu tiệt khuẩn.');
  END IF;
  v_auth := coalesce(auth.uid(), p_actor_user_id);

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ.';
  END IF;
  IF coalesce(v_me.trang_thai_me, '') <> 'DA_CHOT_NAP' OR v_me.tk_chot_nap_at IS NULL THEN
    RAISE EXCEPTION 'Mẻ chưa kết thúc nạp (hiện %) — bấm «Kết thúc nạp» trước khi bắt đầu tiệt khuẩn.', coalesce(v_me.trang_thai_me, '—');
  END IF;
  IF v_me.thoi_gian_bat_dau IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã bắt đầu tiệt khuẩn trước đó.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã kết thúc đánh giá — không thể bắt đầu lại.';
  END IF;
  IF v_me.thiet_bi_id IS NULL THEN
    RAISE EXCEPTION 'Mẻ chưa gắn máy — không bắt đầu tiệt khuẩn.';
  END IF;

  SELECT tb.trang_thai INTO v_may_tt
  FROM public.cssd_dm_thiet_bi tb
  WHERE tb.id = v_me.thiet_bi_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy thiết bị.';
  END IF;
  IF coalesce(v_may_tt, '') NOT IN ('READY', 'HOAT_DONG') THEN
    RAISE EXCEPTION 'Thiết bị không sẵn sàng (%). Không thể bắt đầu mẻ.', coalesce(v_may_tt, '—');
  END IF;

  -- CS-GATE: phương pháp mẻ phải khớp máy; BD đầu ngày ĐẠT cho máy hơi nước.
  v_pp_may := public.fn_cssd_me_phuong_phap(v_me.thiet_bi_id);
  IF v_pp_may IS NULL THEN
    RAISE EXCEPTION 'Chỉ máy tiệt khuẩn (hơi nước, plasma, EO) mới bắt đầu được mẻ.';
  END IF;
  v_pp_me := upper(nullif(btrim(coalesce(v_me.phuong_phap, '')), ''));
  IF v_pp_me IS NOT NULL AND v_pp_me IS DISTINCT FROM v_pp_may THEN
    RAISE EXCEPTION 'Phương pháp mẻ (%) không khớp máy (%) — không bắt đầu mẻ.', v_pp_me, v_pp_may;
  END IF;
  PERFORM public.fn_cssd_me_assert_bd_dau_ngay(v_me.thiet_bi_id);

  SELECT coalesce(array_agg(s.id), ARRAY[]::uuid[])
  INTO v_ids
  FROM (
    SELECT q.id
    FROM public.cssd_fact_quy_trinh q
    WHERE q.lo_tiet_khuan_id = p_me_id
    ORDER BY q.id
    FOR UPDATE OF q
  ) s;

  v_expect := coalesce(cardinality(v_ids), 0);
  IF v_expect = 0 THEN
    RAISE EXCEPTION 'Chưa có bộ nào trong mẻ — không thể bắt đầu tiệt khuẩn.';
  END IF;

  v_steam := public.fn_cssd_me_may_la_hoi_nuoc(v_me.thiet_bi_id);

  FOREACH v_id IN ARRAY v_ids LOOP
    SELECT
      coalesce(nullif(btrim(q.ma_qr_quy_trinh), ''), v_id::text),
      coalesce(q.is_active, false),
      coalesce(q.is_dong_bang, false),
      q.ma_vai_tro_bo,
      q.bo_dung_cu_id,
      t.ma_tram
    INTO v_ma, v_active, v_dong, v_role, v_bo, v_tram
    FROM public.cssd_fact_quy_trinh q
    LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
    WHERE q.id = v_id;

    IF NOT v_active THEN
      RAISE EXCEPTION 'Bộ % không còn hiệu lực — không bắt đầu mẻ.', v_ma;
    END IF;
    IF v_dong THEN
      RAISE EXCEPTION 'Bộ % đang khóa an toàn — không bắt đầu mẻ.', v_ma;
    END IF;
    IF coalesce(v_tram, '') <> 'DONG_GOI' THEN
      RAISE EXCEPTION 'Bộ % không ở ĐÓNG GÓI (hiện %) — không bắt đầu mẻ.', v_ma, coalesce(v_tram, '—');
    END IF;
    IF public.fn_cssd_me_la_bo_me_sub(v_id, v_role) THEN
      RAISE EXCEPTION 'Bộ % là bộ mẹ đã có SUB — chỉ quét bộ thành phần vào mẻ.', v_ma;
    END IF;
    IF v_steam THEN
      v_heat := public.fn_cssd_me_ly_do_chan_nhiet(v_bo);
      IF v_heat IS NOT NULL THEN
        RAISE EXCEPTION '% Bộ %.', v_heat, v_ma;
      END IF;
    END IF;
    v_heat := public.fn_cssd_me_ly_do_lech_phuong_phap(v_bo, v_pp_may, v_me.chuong_trinh);
    IF v_heat IS NOT NULL THEN
      RAISE EXCEPTION '% Bộ %.', v_heat, v_ma;
    END IF;
  END LOOP;

  SELECT t.id INTO v_dong_goi
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'DONG_GOI' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_dong_goi IS NULL OR v_tk IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm ĐÓNG GÓI hoặc TIỆT KHUẨN.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET thoi_gian_bat_dau = v_now,
      nguoi_bat_dau_id = v_auth,
      trang_thai_me = 'DANG_TIET_KHUAN',
      updated_at = v_now
  WHERE id = p_me_id
    AND trang_thai_me = 'DA_CHOT_NAP'
    AND thoi_gian_bat_dau IS NULL
    AND ket_qua_test IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Mẻ đã bắt đầu hoặc đã kết luận — không ghi đè.';
  END IF;

  UPDATE public.cssd_fact_quy_trinh AS q
  SET tram_hien_tai_id = v_tk,
      nguoi_tiet_khuan_id = v_ns,
      thoi_gian_tiet_khuan = v_now,
      updated_at = v_now
  WHERE q.lo_tiet_khuan_id = p_me_id
    AND q.id = ANY (v_ids)
    AND q.is_active = true
    AND coalesce(q.is_dong_bang, false) = false
    AND q.tram_hien_tai_id = v_dong_goi;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> v_expect THEN
    RAISE EXCEPTION 'Không cập nhật đủ bộ khi bắt đầu mẻ — thao tác đã hủy.';
  END IF;

  PERFORM public.fn_cssd_me_nhat_ky_them(p_me_id, 'BAT_DAU_TIET_KHUAN', v_ns, NULL);

  RETURN jsonb_build_object('success', true, 'ok', true, 'trang_thai_me', 'DANG_TIET_KHUAN',
    'thoi_gian_bat_dau', v_now, 'nguoi_tiet_khuan_id', v_ns, 'quy_trinh_ids', to_jsonb(v_ids));
END;
$function$;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_bat_dau(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_bat_dau(uuid, uuid) TO service_role;

-- 8) Kết thúc tiệt khuẩn: người tích + giờ; mở bước đánh giá QC.
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_ket_thuc_tiet_khuan(p_me_id uuid, p_actor_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_ns uuid;
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_now timestamptz := now();
  v_phut numeric;
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();
  v_ns := public.fn_cssd_me_nguoi_thao_tac(p_actor_user_id);
  IF v_ns IS NULL THEN
    RETURN jsonb_build_object('success', false, 'ok', false, 'message', 'Tài khoản chưa gắn hồ sơ nhân sự — không ghi được người kết thúc tiệt khuẩn.');
  END IF;

  SELECT * INTO v_me FROM public.cssd_fact_lo_tiet_khuan WHERE id = p_me_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'ok', false, 'message', 'Không tìm thấy mẻ.');
  END IF;
  IF coalesce(v_me.trang_thai_me, '') <> 'DANG_TIET_KHUAN' OR v_me.thoi_gian_bat_dau IS NULL THEN
    RETURN jsonb_build_object('success', false, 'ok', false,
      'message', 'Mẻ không đang tiệt khuẩn (hiện ' || coalesce(v_me.trang_thai_me, '—') || ') — không kết thúc.');
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET thoi_gian_ket_thuc = v_now,
      nguoi_ket_thuc_id = coalesce(auth.uid(), p_actor_user_id),
      tk_mo_form_qc_at = coalesce(tk_mo_form_qc_at, v_now),
      trang_thai_me = 'CHO_DANH_GIA_QC',
      updated_at = v_now
  WHERE id = p_me_id;

  v_phut := round(extract(epoch FROM (v_now - v_me.thoi_gian_bat_dau)) / 60.0, 1);
  PERFORM public.fn_cssd_me_nhat_ky_them(p_me_id, 'KET_THUC_TIET_KHUAN', v_ns, jsonb_build_object('thoi_gian_tiet_khuan_phut', v_phut));

  RETURN jsonb_build_object('success', true, 'ok', true, 'trang_thai_me', 'CHO_DANH_GIA_QC',
    'thoi_gian_bat_dau', v_me.thoi_gian_bat_dau, 'thoi_gian_ket_thuc', v_now, 'thoi_gian_tiet_khuan_phut', v_phut);
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_ket_thuc_tiet_khuan(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_ket_thuc_tiet_khuan(uuid, uuid) TO authenticated, service_role;

-- 9) Ghi một test (người + giờ riêng). Không đạt / BI dương → QC_KHONG_DAT «Lô hỏng, cần xem lại».
--    BI âm KHÔNG ghi trang_thai_bi ở đây (vẫn qua rpc_cssd_me_nhap_bi_am + sổ BM.02).
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
  IF coalesce(v_me.trang_thai_me, '') NOT IN ('DA_CHOT_NAP', 'DANG_TIET_KHUAN', 'CHO_DANH_GIA_QC', 'CHO_BI', 'HOAN_THANH') THEN
    RETURN jsonb_build_object('success', false, 'ok', false,
      'message', 'Mẻ ở trạng thái ' || coalesce(v_me.trang_thai_me, '—') || ' — không ghi test.');
  END IF;

  PERFORM public.fn_cssd_me_nhat_ky_them(p_me_id, 'GHI_TEST', v_ns,
    jsonb_strip_nulls(jsonb_build_object('loai', v_loai, 'ket_qua', v_kq, 'dat', v_dat, 'ghi_chu', p_chi_tiet)));

  IF v_dat THEN
    RETURN jsonb_build_object('success', true, 'ok', true, 'dat', true, 'trang_thai_me', v_me.trang_thai_me);
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

-- 10) Kết luận ĐẠT: giữ nguyên bản trước, thêm quyền + chặn cứng mẻ QC_KHONG_DAT / có test KHÔNG ĐẠT trong nhật ký.
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_ket_luan_dat(p_me_id uuid, p_ghi_chu text, p_qc_json jsonb, p_ket_qua_bi boolean, p_ket_qua_ci boolean, p_nguoi_nhan_su_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_ids uuid[];
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
  v_actor uuid;
  v_qc jsonb := coalesce(p_qc_json, '{}'::jsonb);
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();
  IF EXISTS (
    SELECT 1 FROM public.cssd_fact_lo_tiet_khuan m
    WHERE m.id = p_me_id
      AND (
        m.trang_thai_me = 'QC_KHONG_DAT'
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(m.tk_qc_json -> 'nhat_ky') = 'array' THEN m.tk_qc_json -> 'nhat_ky' ELSE '[]'::jsonb END) e
          WHERE e ->> 'su_kien' = 'GHI_TEST' AND e -> 'chi_tiet' ->> 'dat' = 'false'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Lô hỏng, cần xem lại — mẻ có test KHÔNG ĐẠT, không nhả mẻ.' USING ERRCODE = 'check_violation';
  END IF;

  IF coalesce(v_qc->>'thong_so_vat_ly', '') IS DISTINCT FROM 'DAT'
     OR coalesce(v_qc->>'ci_ngoai_goi', '') IS DISTINCT FROM 'DAT'
     OR coalesce(v_qc->>'ci_pcd', '') IS DISTINCT FROM 'DAT' THEN
    RAISE EXCEPTION 'Nhả mẻ chỉ khi thông số vật lý, CI ngoài gói và CI PCD đều ĐẠT.';
  END IF;
  IF coalesce(v_qc->>'trang_thai_bi', '') = 'DUONG' THEN
    RAISE EXCEPTION 'BI dương — không nhả mẻ.';
  END IF;
  IF coalesce(v_qc->>'bi_bat_buoc', '') IN ('true', 't')
     AND coalesce(v_qc->>'trang_thai_bi', '') IS DISTINCT FROM 'AM' THEN
    RAISE EXCEPTION 'BI bắt buộc chưa âm — không nhả mẻ.';
  END IF;
  IF coalesce(v_qc->>'trang_thai_bi', '') = 'AM' THEN
    PERFORM public.fn_cssd_me_bi_bm02_hop_le(v_qc, 'AM');
  END IF;

  BEGIN
    IF coalesce(v_qc->>'actor_user_id', '') <> '' THEN
      v_actor := (v_qc->>'actor_user_id')::uuid;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Người thực hiện không hợp lệ.';
  END;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người nhả mẻ.';
  END IF;

  -- ME-04: implant / BI bắt buộc → nha_implant (fallback qc nếu chưa seed)
  IF coalesce(v_qc->>'bi_bat_buoc', '') IN ('true', 't')
     OR coalesce(v_qc->>'co_implant', '') IN ('true', 't') THEN
    PERFORM public.fn_cssd_me_assert_nha_implant(v_actor);
  END IF;

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ tiệt khuẩn.';
  END IF;
  -- ME-04+: cờ implant suy từ DB (mẻ đã ghi implant HOẶC có bộ is_implant trong mẻ),
  -- không tin hoàn toàn p_qc_json do app gửi. Implant → BI âm bắt buộc + quyền nhả implant.
  IF coalesce(v_me.co_implant, false)
     OR EXISTS (
       SELECT 1
       FROM public.cssd_fact_quy_trinh qi
       JOIN public.cssd_dm_bo_dung_cu bi ON bi.id = qi.bo_dung_cu_id
       WHERE qi.lo_tiet_khuan_id = p_me_id
         AND qi.is_active = true
         AND coalesce(bi.is_implant, false)
     ) THEN
    IF coalesce(v_qc->>'trang_thai_bi', '') IS DISTINCT FROM 'AM' THEN
      RAISE EXCEPTION 'Mẻ có dụng cụ cấy ghép (implant) — BI âm bắt buộc, chưa nhả mẻ.';
    END IF;
    PERFORM public.fn_cssd_me_assert_nha_implant(v_actor);
    v_qc := v_qc || jsonb_build_object('co_implant', true, 'bi_bat_buoc', true);
  END IF;

  IF v_me.tk_mo_form_qc_at IS NULL THEN
    RAISE EXCEPTION 'Chưa mở bước đánh giá QC — bấm «Xong máy — mở đánh giá QC» trước.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL OR coalesce(v_me.trang_thai_me, '') IN ('HOAN_THANH', 'QC_KHONG_DAT', 'CHO_BI') THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả QC — không ghi đè.';
  END IF;

  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_tk IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm TIỆT KHUẨN.';
  END IF;

  SELECT coalesce(array_agg(s.id), ARRAY[]::uuid[])
  INTO v_ids
  FROM (
    SELECT q.id
    FROM public.cssd_fact_quy_trinh q
    WHERE q.lo_tiet_khuan_id = p_me_id
      AND q.is_active = true
      AND q.tram_hien_tai_id = v_tk
    ORDER BY q.id
    FOR UPDATE OF q
  ) s;

  v_expect := coalesce(cardinality(v_ids), 0);
  IF v_expect = 0 THEN
    RAISE EXCEPTION 'Không có bộ đang ở trạm tiệt khuẩn trong mẻ — không kết luận ĐẠT.';
  END IF;

  v_n := public.fn_cssd_me_chuyen_bo_kho_vo_khuan(p_me_id, v_ids, v_now, p_nguoi_nhan_su_id);
  IF v_n <> v_expect THEN
    RAISE EXCEPTION 'Không cập nhật đủ bộ khi kết luận ĐẠT — thao tác đã hủy.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET
    ket_qua_test = true,
    ghi_chu = p_ghi_chu,
    ghi_chu_qc = p_ghi_chu,
    tk_qc_json = v_qc,
    thoi_gian_ket_thuc = coalesce(thoi_gian_ket_thuc, v_now),
    ket_qua_bi = p_ket_qua_bi,
    ket_qua_ci = p_ket_qua_ci,
    nhiet_do = CASE
      WHEN jsonb_typeof(v_qc->'nhiet_do') = 'number' THEN (v_qc->>'nhiet_do')::numeric
      ELSE nhiet_do
    END,
    ap_suat = CASE
      WHEN jsonb_typeof(v_qc->'ap_suat') = 'number' THEN (v_qc->>'ap_suat')::numeric
      ELSE ap_suat
    END,
    thoi_gian_chu_ky = CASE
      WHEN jsonb_typeof(v_qc->'thoi_gian_chu_ky') = 'number' THEN (v_qc->>'thoi_gian_chu_ky')::integer
      ELSE thoi_gian_chu_ky
    END,
    chuong_trinh = coalesce(nullif(left(btrim(v_qc->>'chuong_trinh'), 80), ''), chuong_trinh),
    phuong_phap = coalesce(nullif(v_qc->>'phuong_phap', ''), phuong_phap),
    co_implant = CASE WHEN v_qc->>'co_implant' IN ('true', 't') THEN true ELSE co_implant END,
    trang_thai_bi = nullif(v_qc->>'trang_thai_bi', ''),
    nguoi_ket_thuc_id = coalesce(nguoi_ket_thuc_id, v_actor),
    nguoi_nha_id = v_actor,
    thoi_gian_nha = v_now,
    trang_thai_me = 'HOAN_THANH',
    nguoi_van_hanh_id = coalesce(p_nguoi_nhan_su_id, nguoi_van_hanh_id),
    updated_at = v_now
  WHERE id = p_me_id
    AND ket_qua_test IS NULL
    AND tk_mo_form_qc_at IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả QC — không ghi đè.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_ids', to_jsonb(v_ids), 'trang_thai_me', 'HOAN_THANH');
END;
$function$;

-- CHƯA APPLY PROD — chờ PO.
-- Kiểm prod (chỉ đọc) trước khi apply:
--   SELECT trang_thai_me, count(*) FROM public.cssd_fact_lo_tiet_khuan GROUP BY 1;  -- mẻ DANG_CHUAN_NAP có tk_chot_nap_at?
--   SELECT count(*) FROM public.cssd_fact_lo_tiet_khuan WHERE trang_thai_me = 'DANG_CHUAN_NAP' AND tk_chot_nap_at IS NOT NULL;
--   SELECT count(*) FROM public.cssd_fact_lo_tiet_khuan WHERE tk_qc_json ? 'nhat_ky';  -- kỳ vọng 0
--   SELECT md5(pg_get_functiondef('public.rpc_cssd_me_bat_dau(uuid,uuid)'::regprocedure)),
--          md5(pg_get_functiondef('public.rpc_cssd_me_ket_luan_dat(uuid,text,jsonb,boolean,boolean,uuid)'::regprocedure));
