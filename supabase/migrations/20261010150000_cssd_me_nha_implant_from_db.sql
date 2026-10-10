-- CSSD-L11: nhả mẻ — cờ implant suy từ DB, không chỉ tin p_qc_json do app gửi.
-- ĐÃ APPLY PROD 2026-10-10 qua MCP `apply_migration` (PO duyệt). Version trên prod do MCP đặt, khác tên file — không đổi tên file.
-- Gốc: 20261005141000_cssd_me04_nha_implant_perm.sql (hàm này được thay nguyên thân + 1 khối ME-04+).
-- Rủi ro: mẻ có bộ is_implant nhưng app/QC gửi thiếu cờ trước đây vẫn nhả được không cần BI âm.
-- Sau apply: mẻ implant mà BI chưa âm sẽ bị chặn đúng quy định (đi đường CHO_BI).

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
