-- ME-S1: toàn vẹn phiếu mẻ tiệt khuẩn (additive).
-- Không ALTER bảng. RPC SECURITY INVOKER, chỉ service_role (action đã verify quyền).
-- Unique index: một máy tối đa một mẻ mở (is_active, ket_qua_test null).
-- Dữ liệu cũ có >1 mẻ mở/máy: không xóa dòng; index chỉ áp mẻ tạo từ mốc này.
-- Rollback: DROP FUNCTION các hàm dưới + DROP INDEX uq_cssd_fact_lo_mo_mot_may.

BEGIN;

DO $$
DECLARE
  v_dup int;
BEGIN
  SELECT count(*)::int INTO v_dup
  FROM (
    SELECT thiet_bi_id
    FROM public.cssd_fact_lo_tiet_khuan
    WHERE is_active = true
      AND ket_qua_test IS NULL
      AND thiet_bi_id IS NOT NULL
    GROUP BY thiet_bi_id
    HAVING count(*) > 1
  ) d;

  IF v_dup > 0 THEN
    RAISE NOTICE 'ME-S1: % máy đang có hơn một mẻ mở — không xóa dữ liệu. Unique index chỉ áp mẻ tạo từ 2026-09-25 09:00+07.', v_dup;
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS uq_cssd_fact_lo_mo_mot_may
      ON public.cssd_fact_lo_tiet_khuan (thiet_bi_id)
      WHERE is_active = true
        AND ket_qua_test IS NULL
        AND thiet_bi_id IS NOT NULL
        AND created_at >= TIMESTAMPTZ '2026-09-25 09:00:00+07'
    $idx$;
  ELSE
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS uq_cssd_fact_lo_mo_mot_may
      ON public.cssd_fact_lo_tiet_khuan (thiet_bi_id)
      WHERE is_active = true
        AND ket_qua_test IS NULL
        AND thiet_bi_id IS NOT NULL
    $idx$;
  END IF;
END $$;

COMMENT ON INDEX public.uq_cssd_fact_lo_mo_mot_may IS
  'ME-S1: mỗi máy chỉ một mẻ tiệt khuẩn chưa kết luận (mẻ cũ trùng thì index chỉ từ mốc migration).';

CREATE OR REPLACE FUNCTION public.fn_cssd_me_may_la_hoi_nuoc(p_thiet_bi_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_thiet_bi_id IS NULL THEN false
    ELSE coalesce((
      SELECT lower(
        coalesce(tb.ten_thiet_bi, '') || ' ' ||
        coalesce(lm.ten_loai_may, '') || ' ' ||
        coalesce(lm.ma_loai_may, '')
      ) ~ '(hơi|hoi|steam|nước|nuoc|134|121)'
      FROM public.cssd_dm_thiet_bi tb
      LEFT JOIN public.cssd_dm_loai_may lm ON lm.id = tb.loai_may_id
      WHERE tb.id = p_thiet_bi_id
    ), false)
  END;
$$;

-- null = được nạp hơi nước; text = lý do chặn. Thiếu dòng / is_chiu_nhiet không true → chặn.
CREATE OR REPLACE FUNCTION public.fn_cssd_me_ly_do_chan_nhiet(p_bo_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_n int;
  v_ok int;
BEGIN
  IF p_bo_id IS NULL THEN
    RETURN 'Bộ nhạy nhiệt hoặc thiếu dữ liệu chịu nhiệt — không thêm vào mẻ máy hơi nước.';
  END IF;

  SELECT
    count(*)::int,
    count(*) FILTER (WHERE l.is_chiu_nhiet IS TRUE)::int
  INTO v_n, v_ok
  FROM public.cssd_dm_bo_dung_cu_chi_tiet c
  LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
  WHERE c.bo_dung_cu_id = p_bo_id
    AND coalesce(c.is_active, true) = true;

  IF v_n = 0 OR v_ok IS DISTINCT FROM v_n THEN
    RETURN 'Bộ nhạy nhiệt hoặc thiếu dữ liệu chịu nhiệt — không thêm vào mẻ máy hơi nước.';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_me_la_bo_me_sub(p_quy_trinh_id uuid, p_ma_vai_tro text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(upper(btrim(coalesce(p_ma_vai_tro, ''))), '') = 'MAIN'
    OR EXISTS (
      SELECT 1
      FROM public.cssd_fact_quy_trinh c
      WHERE c.quy_trinh_cha_id = p_quy_trinh_id
        AND c.is_active = true
        AND c.ma_vai_tro_bo = 'SUB'
    );
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

  IF public.fn_cssd_me_may_la_hoi_nuoc(v_me.thiet_bi_id) THEN
    v_heat := public.fn_cssd_me_ly_do_chan_nhiet(v_qt.bo_dung_cu_id);
    IF v_heat IS NOT NULL THEN
      RAISE EXCEPTION '% Bộ %.', v_heat, v_ma;
    END IF;
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

CREATE OR REPLACE FUNCTION public.rpc_cssd_me_bat_dau(p_me_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
BEGIN
  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ.';
  END IF;
  IF v_me.tk_chot_nap_at IS NOT NULL THEN
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
  WHERE tb.id = v_me.thiet_bi_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy thiết bị.';
  END IF;
  IF coalesce(v_may_tt, '') NOT IN ('READY', 'HOAT_DONG') THEN
    RAISE EXCEPTION 'Thiết bị không sẵn sàng (%). Không thể bắt đầu mẻ.', coalesce(v_may_tt, '—');
  END IF;

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
  SET tk_chot_nap_at = v_now,
      thoi_gian_bat_dau = v_now,
      updated_at = v_now
  WHERE id = p_me_id
    AND tk_chot_nap_at IS NULL
    AND ket_qua_test IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Mẻ đã bắt đầu hoặc đã kết luận — không ghi đè.';
  END IF;

  UPDATE public.cssd_fact_quy_trinh AS q
  SET tram_hien_tai_id = v_tk,
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

  RETURN jsonb_build_object('ok', true, 'quy_trinh_ids', to_jsonb(v_ids));
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cssd_me_ket_luan_dat(
  p_me_id uuid,
  p_ghi_chu text,
  p_qc_json jsonb,
  p_ket_qua_bi boolean,
  p_ket_qua_ci boolean,
  p_nguoi_nhan_su_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_ids uuid[];
  v_cap uuid;
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
BEGIN
  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ tiệt khuẩn.';
  END IF;
  IF v_me.tk_mo_form_qc_at IS NULL THEN
    RAISE EXCEPTION 'Chưa mở bước đánh giá QC — bấm «Xong máy — mở đánh giá QC» trước.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả QC — không ghi đè.';
  END IF;

  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  SELECT t.id INTO v_cap
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'CAP_PHAT' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_tk IS NULL OR v_cap IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm TIỆT KHUẨN hoặc CẤP PHÁT.';
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

  UPDATE public.cssd_fact_quy_trinh AS q
  SET
    tram_hien_tai_id = v_cap,
    thoi_gian_tiet_khuan = v_now,
    thoi_gian_cap_phat = v_now,
    ngay_het_han = v_now + make_interval(days => coalesce(src.so_ngay, 30)),
    han_su_dung = v_now + make_interval(days => coalesce(src.so_ngay, 30)),
    tinh_trang = 'BINH_THUONG',
    nguoi_tiet_khuan_id = coalesce(p_nguoi_nhan_su_id, q.nguoi_tiet_khuan_id),
    nguoi_cap_phat_id = coalesce(p_nguoi_nhan_su_id, q.nguoi_cap_phat_id),
    updated_at = v_now
  FROM (
    SELECT q1.id, l.so_ngay_han_dung AS so_ngay
    FROM public.cssd_fact_quy_trinh q1
    LEFT JOIN public.cssd_dm_bo_dung_cu b ON b.id = q1.bo_dung_cu_id
    LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = b.loai_dung_cu_id
    WHERE q1.id = ANY (v_ids)
  ) src
  WHERE q.id = src.id
    AND q.lo_tiet_khuan_id = p_me_id
    AND q.is_active = true
    AND q.tram_hien_tai_id = v_tk;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> v_expect THEN
    RAISE EXCEPTION 'Không cập nhật đủ bộ khi kết luận ĐẠT — thao tác đã hủy.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET
    ket_qua_test = true,
    ghi_chu = p_ghi_chu,
    ghi_chu_qc = p_ghi_chu,
    tk_qc_json = coalesce(p_qc_json, '{}'::jsonb),
    thoi_gian_ket_thuc = v_now,
    ket_qua_bi = coalesce(p_ket_qua_bi, false),
    ket_qua_ci = coalesce(p_ket_qua_ci, false),
    updated_at = v_now
  WHERE id = p_me_id
    AND ket_qua_test IS NULL
    AND tk_mo_form_qc_at IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả QC — không ghi đè.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_ids', to_jsonb(v_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_me_may_la_hoi_nuoc(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cssd_me_ly_do_chan_nhiet(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cssd_me_la_bo_me_sub(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_add_quy_trinh(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_bat_dau(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_ket_luan_dat(uuid, text, jsonb, boolean, boolean, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_cssd_me_may_la_hoi_nuoc(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cssd_me_ly_do_chan_nhiet(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cssd_me_la_bo_me_sub(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_add_quy_trinh(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_bat_dau(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_ket_luan_dat(uuid, text, jsonb, boolean, boolean, uuid) TO service_role;

COMMIT;
