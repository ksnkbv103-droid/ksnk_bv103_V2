-- ME-01 · BI sổ BM.02 (ống đối chứng / ống thử / giờ ủ·đọc / lô)
-- File only — CHƯA apply. App tương thích khi chưa apply (ghi bm02 vào tk_qc_json + fallback RPC cũ).
-- Dữ liệu cũ: mẻ đã nhả giữ nguyên; thiếu đối chứng → nhãn nghiệp vụ «trước ME-01».

-- 1) Mở rộng trang_thai_bi: DANG_U = đã đặt BI đang ủ (hơi nước tuần)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cssd_fact_lo_tiet_khuan_trang_thai_bi_chk'
  ) THEN
    ALTER TABLE public.cssd_fact_lo_tiet_khuan
      DROP CONSTRAINT cssd_fact_lo_tiet_khuan_trang_thai_bi_chk;
  END IF;
  ALTER TABLE public.cssd_fact_lo_tiet_khuan
    ADD CONSTRAINT cssd_fact_lo_tiet_khuan_trang_thai_bi_chk
    CHECK (trang_thai_bi IS NULL OR trang_thai_bi IN ('CHUA_CO', 'DANG_U', 'AM', 'DUONG'));
END $$;

COMMENT ON COLUMN public.cssd_fact_lo_tiet_khuan.trang_thai_bi IS
  'BI: CHUA_CO | DANG_U (đang ủ) | AM | DUONG. Sổ BM.02 (đối chứng/giờ/lô) trong tk_qc_json.';

-- 2) Helper: kiểm sổ BM.02 trong jsonb (đối chứng phải DUONG)
CREATE OR REPLACE FUNCTION public.fn_cssd_me_bi_bm02_hop_le(p_bi jsonb, p_ket_qua text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_doi text := upper(btrim(coalesce(p_bi->>'ong_doi_chung', '')));
  v_thu text := upper(btrim(coalesce(p_bi->>'ong_thu', '')));
  v_kq text := upper(btrim(coalesce(p_ket_qua, '')));
  v_lo text := btrim(coalesce(p_bi->>'so_lo_bi', ''));
  v_u text := btrim(coalesce(p_bi->>'gio_bat_dau_u', ''));
  v_doc text := btrim(coalesce(p_bi->>'gio_doc', ''));
BEGIN
  IF v_kq NOT IN ('AM', 'DUONG') THEN
    RAISE EXCEPTION 'Kết quả BI chỉ nhận âm hoặc dương khi ghi sổ BM.02.';
  END IF;
  IF v_doi IS DISTINCT FROM 'DUONG' THEN
    RAISE EXCEPTION 'Kết quả BI không hợp lệ — ống đối chứng phải dương tính; chạy lại thử nghiệm.';
  END IF;
  IF v_thu IS DISTINCT FROM v_kq THEN
    RAISE EXCEPTION 'Ống thử phải khớp kết quả BI đã chọn.';
  END IF;
  IF v_lo = '' THEN
    RAISE EXCEPTION 'Nhập số lô BI (cùng lô ống đối chứng và ống thử).';
  END IF;
  IF v_u = '' OR v_doc = '' THEN
    RAISE EXCEPTION 'Thiếu giờ bắt đầu ủ hoặc giờ đọc BI.';
  END IF;
END;
$$;

-- 3) rpc_cssd_me_nhap_bi_am — thêm p_qc_bi_json (BM.02); từ chối khi thiếu/sai đối chứng
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_nhap_bi_am(
  p_me_id uuid,
  p_actor_user_id uuid,
  p_nguoi_nhan_su_id uuid,
  p_qc_bi_json jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_ids uuid[];
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
  v_bi jsonb := coalesce(p_qc_bi_json, '{}'::jsonb);
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;

  PERFORM public.fn_cssd_me_bi_bm02_hop_le(v_bi || jsonb_build_object('trang_thai_bi', 'AM'), 'AM');

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ tiệt khuẩn.';
  END IF;
  IF coalesce(v_me.trang_thai_me, '') IS DISTINCT FROM 'CHO_BI' THEN
    RAISE EXCEPTION 'Chỉ nhập BI cho mẻ đang chờ BI.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả — không ghi đè.';
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
    RAISE EXCEPTION 'Không có bộ đang ở trạm tiệt khuẩn — không nhả mẻ.';
  END IF;

  v_n := public.fn_cssd_me_chuyen_bo_kho_vo_khuan(p_me_id, v_ids, v_now, p_nguoi_nhan_su_id);
  IF v_n <> v_expect THEN
    RAISE EXCEPTION 'Không cập nhật đủ bộ khi nhả sau BI âm — thao tác đã hủy.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET
    ket_qua_test = true,
    ket_qua_bi = true,
    trang_thai_bi = 'AM',
    trang_thai_me = 'HOAN_THANH',
    nguoi_nha_id = p_actor_user_id,
    thoi_gian_nha = v_now,
    tk_qc_json = coalesce(tk_qc_json, '{}'::jsonb) || v_bi || jsonb_build_object(
      'trang_thai_bi', 'AM',
      'nha_sau_bi_am', true
    ),
    updated_at = v_now
  WHERE id = p_me_id
    AND ket_qua_test IS NULL
    AND trang_thai_me = 'CHO_BI';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Không nhả được mẻ sau BI âm.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_ids', to_jsonb(v_ids), 'trang_thai_me', 'HOAN_THANH');
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_me_bi_bm02_hop_le(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_nhap_bi_am(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_me_bi_bm02_hop_le(jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_nhap_bi_am(uuid, uuid, uuid, jsonb) TO service_role;

-- Giữ overload 3-arg cũ gọi qua DEFAULT NULL vẫn khớp signature mới (4 tham số với default).
-- Nếu môi trường còn bản 3-arg riêng: drop sau khi deploy app đã gửi p_qc_bi_json.
DROP FUNCTION IF EXISTS public.rpc_cssd_me_nhap_bi_am(uuid, uuid, uuid);

-- 4) rpc_cssd_me_ket_luan_dat — khi nhả với BI AM bắt buộc sổ BM.02 hợp lệ
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
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
  v_actor uuid;
  v_qc jsonb := coalesce(p_qc_json, '{}'::jsonb);
BEGIN
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
$$;

REVOKE ALL ON FUNCTION public.rpc_cssd_me_ket_luan_dat(uuid, text, jsonb, boolean, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_ket_luan_dat(uuid, text, jsonb, boolean, boolean, uuid) TO service_role;
