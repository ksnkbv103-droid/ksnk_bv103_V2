-- Soft-local MOD-QLCV · QLCV-06 (CHƯA apply).
-- SET_TRANG_THAI: bảng chuyển hợp lệ; HOAN_THANH chỉ DINH_KY@100 hoặc qua NGHIEM_THU.
-- fn_qlcv_update_checklist: từ chối HOAN_THANH khi loại ≠ DINH_KY.

CREATE OR REPLACE FUNCTION public.fn_qlcv_transition(
  p_cong_viec_id uuid,
  p_action text,
  p_actor_nhan_su_id uuid,
  p_ly_do text DEFAULT NULL,
  p_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_cv public.qlcv_fact_cong_viec%ROWTYPE;
  v_next text;
  v_loai_hd text;
  v_noi_dung text;
  v_updated_id uuid;
  v_pct int;
  v_from text;
BEGIN
  SELECT * INTO v_cv FROM public.qlcv_fact_cong_viec WHERE id = p_cong_viec_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy công việc'; END IF;

  v_pct := coalesce(v_cv.phan_tram_hoan_thanh, 0);
  v_from := v_cv.trang_thai;

  CASE upper(trim(p_action))
    WHEN 'NGHIEM_THU' THEN
      IF upper(coalesce(v_cv.loai_cong_viec, '')) = 'DINH_KY' THEN
        RAISE EXCEPTION 'Việc định kỳ (DINH_KY) không nghiệm thu — tick đủ 100%% sẽ hoàn thành tự động (không CHO_DUYET).';
      END IF;
      IF v_cv.trang_thai IN ('HOAN_THANH', 'DA_HUY') THEN
        RAISE EXCEPTION 'Công việc đã hoàn thành hoặc đã hủy';
      END IF;
      IF NOT (
        v_cv.trang_thai = 'CHO_DUYET'
        OR (v_cv.trang_thai IN ('DANG_LAM', 'DANG_THUC_HIEN', 'QUA_HAN', 'TU_CHOI') AND v_pct >= 100)
      ) THEN
        RAISE EXCEPTION 'Chỉ nghiệm thu khi việc đã báo 100%%';
      END IF;
      -- Tự nghiệm thu: chặn ở app (N-QLCV-5, trừ Chủ nhiệm/quản trị).
      v_next := 'HOAN_THANH'; v_loai_hd := 'HOAN_THANH';
      v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Đã nghiệm thu và đóng công việc.');
      UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, phan_tram_hoan_thanh = 100, updated_at = now()
      WHERE id = p_cong_viec_id AND trang_thai = v_cv.trang_thai RETURNING id INTO v_updated_id;
      v_pct := 100;

    WHEN 'TU_CHOI_NGHIEM_THU' THEN
      IF upper(coalesce(v_cv.loai_cong_viec, '')) = 'DINH_KY' THEN
        RAISE EXCEPTION 'Việc định kỳ (DINH_KY) không dùng từ chối nghiệm thu.';
      END IF;
      IF NOT (
        v_cv.trang_thai = 'CHO_DUYET' OR v_cv.trang_thai = 'CHO_XAC_NHAN_HOAN_THANH'
        OR (v_cv.trang_thai IN ('DANG_LAM', 'DANG_THUC_HIEN', 'QUA_HAN') AND v_pct >= 100)
      ) THEN RAISE EXCEPTION 'Công việc không ở trạng thái chờ nghiệm thu'; END IF;
      v_next := 'TU_CHOI'; v_loai_hd := 'TU_CHOI_HOAN_THANH';
      v_noi_dung := 'Nghiệm thu không đạt — trả làm lại: ' || coalesce(nullif(trim(p_ly_do), ''), 'Không có');
      UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, updated_at = now()
      WHERE id = p_cong_viec_id AND trang_thai = v_cv.trang_thai RETURNING id INTO v_updated_id;

    WHEN 'HUY' THEN
      IF v_cv.trang_thai IN ('HOAN_THANH', 'DA_HUY') THEN RAISE EXCEPTION 'Công việc đã hoàn thành hoặc đã hủy'; END IF;
      v_next := 'DA_HUY'; v_loai_hd := 'CAP_NHAT';
      v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Hủy công việc');
      UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, updated_at = now()
      WHERE id = p_cong_viec_id AND trang_thai = v_cv.trang_thai RETURNING id INTO v_updated_id;

    WHEN 'PHE_DUYET_DEXUAT' THEN
      IF v_cv.is_active = true OR v_cv.trang_thai = 'DA_HUY' THEN RAISE EXCEPTION 'Không phải đề xuất chờ duyệt'; END IF;
      v_next := coalesce(nullif(p_patch->>'trang_thai', ''), 'MOI'); v_loai_hd := 'PHE_DUYET';
      v_noi_dung := coalesce(nullif(p_patch->>'noi_dung_hoat_dong', ''), 'Đã phê duyệt đề xuất');
      UPDATE public.qlcv_fact_cong_viec SET
        trang_thai = v_next, is_active = true,
        tieu_de = coalesce(nullif(p_patch->>'tieu_de', ''), tieu_de),
        mo_ta = CASE WHEN p_patch ? 'mo_ta' THEN p_patch->>'mo_ta' ELSE mo_ta END,
        loai_cong_viec = coalesce(nullif(p_patch->>'loai_cong_viec', ''), loai_cong_viec),
        muc_do_uu_tien = coalesce(nullif(p_patch->>'muc_do_uu_tien', ''), muc_do_uu_tien),
        han_hoan_thanh = CASE WHEN p_patch ? 'han_hoan_thanh' AND nullif(p_patch->>'han_hoan_thanh', '') IS NOT NULL
          THEN (p_patch->>'han_hoan_thanh')::date ELSE han_hoan_thanh END,
        nguoi_phu_trach_id = CASE WHEN p_patch ? 'nguoi_phu_trach_id' AND nullif(p_patch->>'nguoi_phu_trach_id', '') IS NOT NULL
          THEN (p_patch->>'nguoi_phu_trach_id')::uuid ELSE nguoi_phu_trach_id END,
        to_cong_tac_id = CASE WHEN p_patch ? 'to_cong_tac_id' AND nullif(p_patch->>'to_cong_tac_id', '') IS NOT NULL
          THEN (p_patch->>'to_cong_tac_id')::uuid ELSE to_cong_tac_id END,
        nguoi_giao_viec_id = CASE WHEN p_patch ? 'nguoi_giao_viec_id' AND nullif(p_patch->>'nguoi_giao_viec_id', '') IS NOT NULL
          THEN (p_patch->>'nguoi_giao_viec_id')::uuid ELSE nguoi_giao_viec_id END,
        updated_at = now()
      WHERE id = p_cong_viec_id AND is_active = false AND trang_thai IS DISTINCT FROM 'DA_HUY'
      RETURNING id INTO v_updated_id;

    WHEN 'TU_CHOI_DEXUAT' THEN
      IF v_cv.is_active = true OR v_cv.trang_thai = 'DA_HUY' THEN RAISE EXCEPTION 'Không phải đề xuất chờ duyệt'; END IF;
      v_next := 'DA_HUY'; v_loai_hd := 'PHE_DUYET';
      v_noi_dung := 'Đã từ chối đề xuất. Lý do: ' || coalesce(nullif(trim(p_ly_do), ''), 'Không có');
      UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, is_active = false, updated_at = now()
      WHERE id = p_cong_viec_id AND is_active = false AND trang_thai IS DISTINCT FROM 'DA_HUY'
      RETURNING id INTO v_updated_id;

    WHEN 'SET_TRANG_THAI' THEN
      v_next := upper(nullif(p_patch->>'next_trang_thai', ''));
      IF v_next IS NULL THEN RAISE EXCEPTION 'Thiếu next_trang_thai'; END IF;
      -- QLCV-06: chuyển hợp lệ theo 19:57-67
      IF upper(coalesce(v_cv.loai_cong_viec, '')) = 'DINH_KY' THEN
        IF v_next = 'CHO_DUYET' THEN
          RAISE EXCEPTION 'Việc định kỳ (DINH_KY) không vào CHO_DUYET — dùng HOAN_THANH khi đủ 100%%.';
        END IF;
        IF v_next = 'HOAN_THANH' AND v_pct < 100 THEN
          RAISE EXCEPTION 'DINH_KY chỉ hoàn thành khi đủ 100%%.';
        END IF;
      ELSE
        IF v_next = 'HOAN_THANH' THEN
          RAISE EXCEPTION 'DOT/KHAN chỉ đóng qua NGHIEM_THU — không SET_TRANG_THAI → HOAN_THANH.';
        END IF;
        IF v_next = 'CHO_DUYET' AND v_pct < 100 THEN
          RAISE EXCEPTION 'Chỉ vào CHO_DUYET khi đã báo 100%%.';
        END IF;
      END IF;
      IF v_next = 'HOAN_THANH' AND v_from IN ('DA_HUY') THEN
        RAISE EXCEPTION 'Không mở lại việc đã hủy thành HOAN_THANH.';
      END IF;
      v_loai_hd := coalesce(nullif(p_patch->>'loai_hoat_dong', ''), 'CAP_NHAT');
      v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Cập nhật trạng thái');
      UPDATE public.qlcv_fact_cong_viec SET
        trang_thai = v_next, updated_at = now(),
        phan_tram_hoan_thanh = CASE WHEN p_patch ? 'phan_tram_hoan_thanh'
          THEN (p_patch->>'phan_tram_hoan_thanh')::integer ELSE phan_tram_hoan_thanh END
      WHERE id = p_cong_viec_id AND (
        nullif(p_patch->>'current_trang_thai', '') IS NULL OR trang_thai = p_patch->>'current_trang_thai'
      ) RETURNING id INTO v_updated_id;
      IF p_patch ? 'phan_tram_hoan_thanh' THEN v_pct := (p_patch->>'phan_tram_hoan_thanh')::integer; END IF;

    ELSE RAISE EXCEPTION 'Action không hợp lệ: %', p_action;
  END CASE;

  IF v_updated_id IS NULL THEN RAISE EXCEPTION 'Trạng thái công việc đã thay đổi hoặc không cập nhật được'; END IF;

  PERFORM public.fn_qlcv_append_nhat_ky(
    p_cong_viec_id, v_loai_hd, p_actor_nhan_su_id, v_noi_dung, v_next, v_pct
  );

  RETURN jsonb_build_object('id', v_updated_id, 'trang_thai', v_next);
END;
$function$;

COMMENT ON FUNCTION public.fn_qlcv_transition(uuid, text, uuid, text, jsonb) IS
  'QLCV-06: NT cấm tự nghiệm thu; SET_TRANG_THAI có lý do + chuyển hợp lệ; DINH_KY không CHO_DUYET.';

CREATE OR REPLACE FUNCTION public.fn_qlcv_update_checklist(
  p_cong_viec_id uuid,
  p_checklist jsonb,
  p_phan_tram_hoan_thanh integer DEFAULT NULL,
  p_trang_thai_ma text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_pct integer;
  v_tt text;
  v_loai text;
BEGIN
  IF p_cong_viec_id IS NULL THEN
    RAISE EXCEPTION 'p_cong_viec_id bắt buộc';
  END IF;

  SELECT loai_cong_viec INTO v_loai FROM public.qlcv_fact_cong_viec WHERE id = p_cong_viec_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy công việc %', p_cong_viec_id;
  END IF;

  v_pct := COALESCE(p_phan_tram_hoan_thanh, 0);

  IF p_trang_thai_ma IS NOT NULL AND btrim(p_trang_thai_ma) <> '' THEN
    v_tt := upper(btrim(p_trang_thai_ma));
    v_tt := CASE v_tt
      WHEN 'CHUA_BAT_DAU' THEN 'MOI'
      WHEN 'CHO_NHAN_VIEC' THEN 'DANG_LAM'
      WHEN 'DANG_THUC_HIEN' THEN 'DANG_LAM'
      WHEN 'CHO_XAC_NHAN_HOAN_THANH' THEN 'CHO_DUYET'
      ELSE v_tt
    END;
    IF upper(coalesce(v_loai, '')) = 'DINH_KY' THEN
      IF v_pct >= 100 OR v_tt = 'CHO_DUYET' OR v_tt = 'HOAN_THANH' THEN
        IF v_pct >= 100 THEN
          v_tt := 'HOAN_THANH';
        ELSIF v_tt = 'CHO_DUYET' THEN
          RAISE EXCEPTION 'Việc định kỳ (DINH_KY) không vào CHO_DUYET.';
        END IF;
      END IF;
    ELSE
      -- QLCV-06: DOT/KHAN không đóng HOAN_THANH qua checklist
      IF v_tt = 'HOAN_THANH' THEN
        RAISE EXCEPTION 'DOT/KHAN không đặt HOAN_THANH qua checklist — dùng nghiệm thu.';
      END IF;
    END IF;
    IF v_tt <> ALL (ARRAY[
      'MOI'::text,
      'DANG_LAM'::text,
      'CHO_DUYET'::text,
      'HOAN_THANH'::text,
      'TU_CHOI'::text,
      'QUA_HAN'::text,
      'DA_HUY'::text
    ]) THEN
      RAISE EXCEPTION 'Trạng thái không hợp lệ: %', p_trang_thai_ma;
    END IF;
  ELSIF upper(coalesce(v_loai, '')) = 'DINH_KY' AND v_pct >= 100 THEN
    v_tt := 'HOAN_THANH';
  END IF;

  UPDATE public.qlcv_fact_cong_viec
     SET checklist = COALESCE(p_checklist, '[]'::jsonb),
         phan_tram_hoan_thanh = v_pct,
         trang_thai = COALESCE(v_tt, trang_thai),
         updated_at = now()
   WHERE id = p_cong_viec_id;

  RETURN jsonb_build_object(
    'id', p_cong_viec_id,
    'phan_tram_hoan_thanh', v_pct,
    'checklist', COALESCE(p_checklist, '[]'::jsonb),
    'trang_thai', v_tt
  );
END;
$function$;

COMMENT ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) IS
  'QLCV-06: DINH_KY@100→HOAN_THANH; DOT/KHAN cấm HOAN_THANH qua checklist.';

NOTIFY pgrst, 'reload schema';
