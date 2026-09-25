-- ME-S5: lọc bộ theo phương pháp ngay khi nạp + gỡ bộ khi đang nạp.
-- Additive: CREATE OR REPLACE / hàm mới. Không ALTER bảng, không chạy remote từ file này.
-- rpc_cssd_me_bat_dau giữ kiểm nhiệt hơi nước như S1 (không thay hàm đó).
-- Rollback: DROP FUNCTION rpc_cssd_me_remove_quy_trinh, fn_cssd_me_ly_do_lech_phuong_phap;
-- rồi CREATE OR REPLACE rpc_cssd_me_add_quy_trinh về bản S1 nếu cần.

BEGIN;

-- null = được nạp; text = lý do chặn (tiếng Việt).
-- Hơi nước: mọi dòng is_chiu_nhiet IS TRUE.
-- Plasma/EO: có ít nhất một dòng FALSE, không dòng null.
-- Thiếu bộ, thiếu dòng, thiếu loại, hoặc không rõ phương pháp → fail closed.
CREATE OR REPLACE FUNCTION public.fn_cssd_me_ly_do_lech_phuong_phap(
  p_bo_id uuid,
  p_phuong_phap text
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
BEGIN
  IF v_pp NOT IN ('HOI_NUOC', 'PLASMA_H2O2', 'EO') THEN
    RETURN 'Không xác định được phương pháp máy — đã chặn nạp.';
  END IF;

  IF p_bo_id IS NULL THEN
    RETURN 'Không kiểm tra được chịu nhiệt — đã chặn thao tác.';
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
    RETURN NULL;
  END IF;

  IF v_false = 0 THEN
    RETURN 'Bộ chịu nhiệt cao — chỉ nạp máy hơi nước, không nạp máy Plasma hoặc EO.';
  END IF;
  RETURN NULL;
END;
$$;

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
  v_heat := public.fn_cssd_me_ly_do_lech_phuong_phap(v_qt.bo_dung_cu_id, v_pp);
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

-- Một transaction: khóa mẻ + chu kỳ, gỡ lo_tiet_khuan_id, giữ/trả trạm Đóng gói,
-- ghi ngoai_le GỠ_KHỎI_ME, đếm lại số bộ còn trong phiếu.
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_remove_quy_trinh(
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
  v_ma text;
  v_n int;
  v_so_bo int;
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
    RAISE EXCEPTION 'Mẻ đã bắt đầu tiệt khuẩn — không bỏ bộ khỏi phiếu.';
  END IF;
  IF coalesce(v_me.trang_thai_me, 'DANG_CHUAN_NAP') IS DISTINCT FROM 'DANG_CHUAN_NAP' THEN
    RAISE EXCEPTION 'Chỉ bỏ bộ khi mẻ đang nạp.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã kết thúc đánh giá — không bỏ bộ khỏi phiếu.';
  END IF;

  SELECT * INTO v_qt
  FROM public.cssd_fact_quy_trinh
  WHERE id = p_quy_trinh_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy bộ.';
  END IF;
  IF v_qt.lo_tiet_khuan_id IS DISTINCT FROM p_me_id THEN
    RAISE EXCEPTION 'Bộ không nằm trong phiếu mẻ này.';
  END IF;

  v_ma := coalesce(nullif(btrim(v_qt.ma_qr_quy_trinh), ''), p_quy_trinh_id::text);

  SELECT t.ma_tram INTO v_tram
  FROM public.cssd_dm_tram t
  WHERE t.id = v_qt.tram_hien_tai_id;
  IF coalesce(v_tram, '') <> 'DONG_GOI' THEN
    RAISE EXCEPTION 'Bộ % không còn ở Đóng gói — không gỡ khỏi phiếu.', v_ma;
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
    lo_tiet_khuan_id = NULL,
    tram_hien_tai_id = v_dong_goi,
    updated_at = now(),
    metadata = jsonb_set(
      coalesce(q.metadata, '{}'::jsonb),
      '{ngoai_le}',
      coalesce(q.metadata -> 'ngoai_le', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'su_kien', 'GỠ_KHỎI_ME',
          'hanh_dong', 'GỠ_KHỎI_ME',
          'tu_tram', 'DONG_GOI',
          'den_tram', 'DONG_GOI',
          'ly_do', 'Phiếu TK ' || coalesce(v_me.ma_lo_tiet_khuan, '') || ': gỡ bộ ' || v_ma || ' khỏi mẻ',
          'nguoi_thao_tac', p_actor_user_id::text,
          'thoi_gian', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
      ),
      true
    )
  WHERE q.id = p_quy_trinh_id
    AND q.lo_tiet_khuan_id = p_me_id
    AND q.is_active = true
    AND q.tram_hien_tai_id = v_dong_goi;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Bộ % không còn trong phiếu đang nạp.', v_ma;
  END IF;

  SELECT count(*)::int INTO v_so_bo
  FROM public.cssd_fact_quy_trinh q
  WHERE q.lo_tiet_khuan_id = p_me_id
    AND coalesce(q.is_active, false) = true;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET updated_at = now()
  WHERE id = p_me_id;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_id', p_quy_trinh_id, 'so_bo', v_so_bo);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_me_ly_do_lech_phuong_phap(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_add_quy_trinh(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_remove_quy_trinh(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_cssd_me_ly_do_lech_phuong_phap(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_add_quy_trinh(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_remove_quy_trinh(uuid, uuid, uuid) TO service_role;

COMMIT;
