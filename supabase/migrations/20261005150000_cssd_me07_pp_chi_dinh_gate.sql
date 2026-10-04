-- ME-07 (CSSD-10): fn_cssd_me_ly_do_lech_phuong_phap — thêm cổng PP chỉ định danh mục.
-- Thiếu PP chỉ định: không chặn ở DB (app cảnh báo). PP rõ mà lệch máy/chu trình → chặn.
-- Đổi default PP loại DC: NULL cho dòng mới (bỏ STEAM_134 mặc định).

BEGIN;

ALTER TABLE public.cssd_dm_loai_dung_cu
  ALTER COLUMN phuong_phap_tiet_khuan_chi_dinh DROP NOT NULL;

ALTER TABLE public.cssd_dm_loai_dung_cu
  ALTER COLUMN phuong_phap_tiet_khuan_chi_dinh DROP DEFAULT;

ALTER TABLE public.cssd_dm_loai_dung_cu
  ALTER COLUMN phuong_phap_tiet_khuan_chi_dinh SET DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.fn_cssd_me_ly_do_lech_phuong_phap(
  p_bo_id uuid,
  p_phuong_phap text,
  p_chuong_trinh text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pp text := upper(btrim(coalesce(p_phuong_phap, '')));
  v_n int;
  v_true int;
  v_false int;
  v_missing int;
  v_steam_cycle text := NULL;
  v_ct text := upper(btrim(coalesce(p_chuong_trinh, '')));
  v_line_pp text;
  r record;
BEGIN
  IF v_pp NOT IN ('HOI_NUOC', 'PLASMA_H2O2', 'EO') THEN
    RETURN 'Không xác định được phương pháp máy — đã chặn nạp.';
  END IF;

  IF p_bo_id IS NULL THEN
    RETURN 'Không kiểm tra được chịu nhiệt — đã chặn thao tác.';
  END IF;

  IF v_pp = 'HOI_NUOC' AND v_ct <> '' THEN
    IF v_ct ~ '(121|HN_121|STEAM_121)' THEN
      v_steam_cycle := 'STEAM_121';
    ELSIF v_ct ~ '(134|HN_134|STEAM_134)' THEN
      v_steam_cycle := 'STEAM_134';
    END IF;
  END IF;

  SELECT
    count(*)::int,
    count(*) FILTER (WHERE l.is_chiu_nhiet IS TRUE)::int,
    count(*) FILTER (WHERE l.is_chiu_nhiet IS FALSE)::int,
    count(*) FILTER (WHERE l.id IS NULL OR l.is_chiu_nhiet IS NULL)::int
  INTO v_n, v_true, v_false, v_missing
  FROM public.cssd_dm_bo_dung_cu_chi_tiet c
  LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
  WHERE c.bo_dung_cu_id = p_bo_id
    AND coalesce(c.is_active, true) = true;

  IF v_n = 0 OR v_missing > 0 THEN
    RETURN 'Không kiểm tra được chịu nhiệt — đã chặn thao tác.';
  END IF;

  IF v_pp = 'HOI_NUOC' THEN
    IF v_true IS DISTINCT FROM v_n THEN
      RETURN 'Bộ nhạy nhiệt hoặc thiếu dữ liệu chịu nhiệt — không thêm vào mẻ máy hơi nước.';
    END IF;
  ELSE
    IF v_false = 0 THEN
      RETURN 'Bộ chịu nhiệt cao — chỉ nạp máy hơi nước, không nạp máy Plasma hoặc EO.';
    END IF;
  END IF;

  FOR r IN
    SELECT upper(btrim(coalesce(l.phuong_phap_tiet_khuan_chi_dinh, ''))) AS pp
    FROM public.cssd_dm_bo_dung_cu_chi_tiet c
    JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
    WHERE c.bo_dung_cu_id = p_bo_id
      AND coalesce(c.is_active, true) = true
  LOOP
    v_line_pp := r.pp;
    IF v_line_pp = '' THEN
      CONTINUE;
    END IF;
    IF v_pp = 'HOI_NUOC' THEN
      IF v_line_pp IN ('PLASMA', 'EO') THEN
        RETURN 'Bộ chỉ định hơi nước — không nạp máy Plasma hoặc EO.';
      END IF;
      IF v_steam_cycle IS NOT NULL AND v_line_pp IN ('STEAM_121', 'STEAM_134') AND v_line_pp IS DISTINCT FROM v_steam_cycle THEN
        RETURN 'PP chỉ định bộ không khớp chu trình hơi nước (121°C/134°C) — không thêm vào mẻ.';
      END IF;
    ELSIF v_pp = 'PLASMA_H2O2' THEN
      IF v_line_pp = 'EO' THEN
        RETURN 'PP chỉ định bộ không khớp máy (Plasma/EO) — không thêm vào mẻ.';
      END IF;
      IF v_line_pp IN ('STEAM_121', 'STEAM_134') THEN
        RETURN 'Bộ chỉ định hơi nước — không nạp máy Plasma hoặc EO.';
      END IF;
    ELSIF v_pp = 'EO' THEN
      IF v_line_pp = 'PLASMA' THEN
        RETURN 'PP chỉ định bộ không khớp máy (Plasma/EO) — không thêm vào mẻ.';
      END IF;
      IF v_line_pp IN ('STEAM_121', 'STEAM_134') THEN
        RETURN 'Bộ chỉ định hơi nước — không nạp máy Plasma hoặc EO.';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

-- rpc_cssd_me_add_quy_trinh: truyền chuong_trinh mẻ vào cổng PP (chỉ đổi lời gọi fn)
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_add_quy_trinh(
  p_me_id uuid,
  p_quy_trinh_id uuid,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_qt public.cssd_fact_quy_trinh%ROWTYPE;
  v_tram text;
  v_dong_goi uuid;
  v_may_tt text;
  v_ma text;
  v_heat text;
  v_pp text;
  v_n int;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ.';
  END IF;
  IF v_me.tk_chot_nap_at IS NOT NULL THEN
    RAISE EXCEPTION 'Đã xác nhận bắt đầu tiệt khuẩn — không thể nạp thêm bộ vào mẻ này.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã kết thúc đánh giá — không thể nạp thêm bộ.';
  END IF;

  IF v_me.thiet_bi_id IS NOT NULL THEN
    SELECT tb.trang_thai INTO v_may_tt
    FROM public.cssd_dm_thiet_bi tb
    WHERE tb.id = v_me.thiet_bi_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy thiết bị.';
    END IF;
    IF coalesce(v_may_tt, '') NOT IN ('READY', 'HOAT_DONG') THEN
      RAISE EXCEPTION 'Thiết bị không sẵn sàng (%). Không thể thêm bộ vào mẻ.', coalesce(v_may_tt, '—');
    END IF;
  END IF;

  SELECT * INTO v_qt
  FROM public.cssd_fact_quy_trinh
  WHERE id = p_quy_trinh_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy bộ.';
  END IF;

  v_ma := coalesce(nullif(btrim(v_qt.ma_qr_quy_trinh), ''), p_quy_trinh_id::text);

  SELECT t.ma_tram INTO v_tram
  FROM public.cssd_dm_tram t
  WHERE t.id = v_qt.tram_hien_tai_id;

  IF coalesce(v_qt.is_active, false) = false THEN
    RAISE EXCEPTION 'Bộ % không còn hiệu lực.', v_ma;
  END IF;
  IF coalesce(v_qt.is_dong_bang, false) THEN
    RAISE EXCEPTION 'Bộ đang bị khóa an toàn (đóng băng) — cần quản trị mở khóa trước khi đưa vào mẻ tiệt khuẩn.';
  END IF;
  IF v_qt.lo_tiet_khuan_id IS NOT NULL AND v_qt.lo_tiet_khuan_id = p_me_id THEN
    RAISE EXCEPTION 'Bộ đã có trong phiếu/mẻ tiệt khuẩn này.';
  END IF;
  IF v_qt.lo_tiet_khuan_id IS NOT NULL AND v_qt.lo_tiet_khuan_id IS DISTINCT FROM p_me_id THEN
    RAISE EXCEPTION 'Bộ đã gắn mẻ tiệt khuẩn khác — không thể thêm vào mẻ này.';
  END IF;
  IF coalesce(v_tram, '') <> 'DONG_GOI' THEN
    RAISE EXCEPTION 'Chỉ đưa bộ vào phiếu khi đang ở ĐÓNG GÓI. Hiện tại: %.', coalesce(v_tram, '—');
  END IF;
  IF public.fn_cssd_me_la_bo_me_sub(v_qt.id, v_qt.ma_vai_tro_bo) THEN
    RAISE EXCEPTION 'Bộ % là bộ mẹ đã có SUB — chỉ quét bộ thành phần vào mẻ.', v_ma;
  END IF;

  v_pp := nullif(btrim(coalesce(v_me.phuong_phap, '')), '');
  IF v_pp IS NULL THEN
    v_pp := public.fn_cssd_me_phuong_phap(v_me.thiet_bi_id);
  END IF;
  v_heat := public.fn_cssd_me_ly_do_lech_phuong_phap(v_qt.bo_dung_cu_id, v_pp, v_me.chuong_trinh);
  IF v_heat IS NOT NULL THEN
    RAISE EXCEPTION '% Bộ %.', v_heat, v_ma;
  END IF;

  SELECT t.id INTO v_dong_goi
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'DONG_GOI'
    AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_dong_goi IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm ĐÓNG GÓI.';
  END IF;

  UPDATE public.cssd_fact_quy_trinh AS q
  SET
    lo_tiet_khuan_id = p_me_id,
    updated_at = now(),
    metadata = jsonb_set(
      coalesce(q.metadata, '{}'::jsonb),
      '{ngoai_le}',
      coalesce(q.metadata -> 'ngoai_le', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'su_kien', 'VAO_ME_TIET_KHUAN',
          'tu_tram', 'DONG_GOI',
          'den_tram', 'TIET_KHUAN',
          'ly_do', 'Phiếu TK ' || coalesce(v_me.ma_lo_tiet_khuan, '') || ': nhận bộ ' || v_ma || ' vào mẻ',
          'nguoi_thao_tac', p_actor_user_id::text,
          'thoi_gian', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
      ),
      true
    )
  WHERE q.id = p_quy_trinh_id
    AND q.lo_tiet_khuan_id IS NULL
    AND q.tram_hien_tai_id = v_dong_goi
    AND q.is_active = true
    AND coalesce(q.is_dong_bang, false) = false
    AND coalesce(upper(btrim(q.ma_vai_tro_bo)), '') <> 'MAIN'
    AND NOT EXISTS (
      SELECT 1
      FROM public.cssd_fact_quy_trinh c
      WHERE c.quy_trinh_cha_id = q.id
        AND c.is_active = true
        AND c.ma_vai_tro_bo = 'SUB'
    );

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Bộ % không còn đủ điều kiện nạp mẻ (đổi trạm hoặc đã gắn mẻ).', v_ma;
  END IF;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_id', p_quy_trinh_id);
END;
$$;

COMMIT;
