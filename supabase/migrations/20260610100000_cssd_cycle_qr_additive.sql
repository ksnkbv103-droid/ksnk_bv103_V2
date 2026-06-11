-- Phase 5.1: Tách QR bộ vĩnh viễn vs QR chu trình (additive — ma_qr_quy_trinh vẫn resolve song song).

ALTER TABLE public.cssd_fact_quy_trinh
  ADD COLUMN IF NOT EXISTS ma_cycle_qr text,
  ADD COLUMN IF NOT EXISTS ma_qr_bo_vinh_vien text;

COMMENT ON COLUMN public.cssd_fact_quy_trinh.ma_cycle_qr IS 'QR chu trình (niêm phong sau đóng gói) — BV103-CYC-*';
COMMENT ON COLUMN public.cssd_fact_quy_trinh.ma_qr_bo_vinh_vien IS 'QR bộ vĩnh viễn trên hộp — quét trạm 1–2';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cssd_quy_trinh_ma_cycle_qr
  ON public.cssd_fact_quy_trinh (upper(trim(ma_cycle_qr)))
  WHERE ma_cycle_qr IS NOT NULL AND trim(ma_cycle_qr) <> '';

CREATE INDEX IF NOT EXISTS idx_cssd_quy_trinh_ma_qr_bo_vinh_vien
  ON public.cssd_fact_quy_trinh (upper(trim(ma_qr_bo_vinh_vien)))
  WHERE ma_qr_bo_vinh_vien IS NOT NULL;

-- Backfill song song 1 tuần (reform P3): bộ vĩnh viễn + cycle = mã legacy.
UPDATE public.cssd_fact_quy_trinh
SET ma_qr_bo_vinh_vien = ma_qr_quy_trinh
WHERE ma_qr_bo_vinh_vien IS NULL AND ma_qr_quy_trinh IS NOT NULL;

UPDATE public.cssd_fact_quy_trinh
SET ma_cycle_qr = ma_qr_quy_trinh
WHERE ma_cycle_qr IS NULL
  AND ma_qr_quy_trinh IS NOT NULL
  AND is_active = true;

CREATE OR REPLACE FUNCTION public.fn_cssd_gen_cycle_qr()
RETURNS text
LANGUAGE plpgsql
SET search_path TO public
AS $$
DECLARE
  v_candidate text;
  v_try int := 0;
BEGIN
  LOOP
    v_try := v_try + 1;
    v_candidate := 'BV103-CYC-' || to_char(now(), 'YYMMDD') || '-'
      || upper(substr(md5(random()::text || clock_timestamp()::text || v_try::text), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.cssd_fact_quy_trinh q
      WHERE upper(trim(q.ma_cycle_qr)) = upper(trim(v_candidate))
    );
    IF v_try > 24 THEN
      RAISE EXCEPTION 'fn_cssd_gen_cycle_qr: không sinh được mã duy nhất sau % lần', v_try;
    END IF;
  END LOOP;
  RETURN v_candidate;
END;
$$;

COMMENT ON FUNCTION public.fn_cssd_gen_cycle_qr() IS 'Sinh mã QR chu trình BV103-CYC-YYMMDD-XXXXXXXX (unique trên cssd_fact_quy_trinh.ma_cycle_qr).';

CREATE OR REPLACE FUNCTION public.fn_cssd_resolve_active_quy_trinh_id(p_ma_qr text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT q.id
  FROM public.cssd_fact_quy_trinh q
  WHERE q.is_active = true
    AND (
      upper(trim(q.ma_qr_quy_trinh)) = upper(trim(p_ma_qr))
      OR upper(trim(q.ma_cycle_qr)) = upper(trim(p_ma_qr))
      OR upper(trim(q.ma_qr_bo_vinh_vien)) = upper(trim(p_ma_qr))
    )
  ORDER BY q.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cssd_assign_cycle_qr(p_quy_trinh_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_cycle text;
BEGIN
  IF p_quy_trinh_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Thiếu quy_trinh_id.');
  END IF;

  UPDATE public.cssd_fact_quy_trinh q
  SET
    ma_qr_bo_vinh_vien = coalesce(q.ma_qr_bo_vinh_vien, q.ma_qr_quy_trinh),
    ma_cycle_qr = coalesce(q.ma_cycle_qr, public.fn_cssd_gen_cycle_qr()),
    updated_at = now()
  WHERE q.id = p_quy_trinh_id
    AND q.is_active = true
  RETURNING q.ma_cycle_qr INTO v_cycle;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy quy trình active.');
  END IF;

  RETURN json_build_object('success', true, 'ma_cycle_qr', v_cycle);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_cssd_assign_cycle_qr(uuid) TO authenticated, service_role;

-- Gán cycle QR sau BOM checkpoint (trạm Đóng gói).
CREATE OR REPLACE FUNCTION public.rpc_cssd_persist_bom_checkpoint(
  p_quy_trinh_id uuid,
  p_lines jsonb,
  p_deltas jsonb,
  p_do_split text,
  p_operator_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_line jsonb;
  v_delta jsonb;
  v_thanh_phan_id uuid;
  v_thuc_te int;
  v_hong int;
  v_loai_id uuid;
  v_bo_id uuid;
  v_so_luong_thay_doi int;
  v_ghi_chu text;
  v_loai_giao_dich text;
  v_cycle json;
BEGIN
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_thanh_phan_id := (v_line->>'thanh_phan_id')::uuid;
    v_thuc_te := (v_line->>'so_luong_thuc_te')::int;
    v_hong := COALESCE((v_line->>'so_luong_hong')::int, 0);

    UPDATE public.cssd_fact_quy_trinh_thanh_phan
       SET so_luong_thuc_te = v_thuc_te,
           updated_at = now()
     WHERE id = v_thanh_phan_id
       AND quy_trinh_id = p_quy_trinh_id;
  END LOOP;

  IF p_deltas IS NOT NULL AND jsonb_array_length(p_deltas) > 0 THEN
    FOR v_delta IN SELECT * FROM jsonb_array_elements(p_deltas) LOOP
      v_loai_id := (v_delta->>'loai_id')::uuid;
      v_bo_id := NULLIF(v_delta->>'bo_id', '')::uuid;
      v_loai_giao_dich := v_delta->>'loai_giao_dich';
      v_so_luong_thay_doi := (v_delta->>'so_luong_thay_doi')::int;
      v_ghi_chu := v_delta->>'ghi_chu';

      INSERT INTO public.cssd_fact_kho_giao_dich(
        loai_dung_cu_id,
        bo_dung_cu_id,
        quy_trinh_id,
        loai_giao_dich,
        so_luong_thay_doi,
        ghi_chu,
        nguoi_thuc_hien_id,
        created_at,
        updated_at
      ) VALUES (
        v_loai_id,
        v_bo_id,
        p_quy_trinh_id,
        v_loai_giao_dich,
        v_so_luong_thay_doi,
        v_ghi_chu,
        p_operator_id,
        now(),
        now()
      );
    END LOOP;
  END IF;

  INSERT INTO public.cssd_fact_lifecycle_event(
    quy_trinh_id,
    ma_su_kien,
    ma_tram,
    payload,
    created_at,
    updated_at
  ) VALUES (
    p_quy_trinh_id,
    'KIEM_DEM_BOM',
    'DONG_GOI',
    jsonb_build_object(
      'do_split', p_do_split,
      'so_lines', jsonb_array_length(p_lines)
    ),
    now(),
    now()
  );

  v_cycle := public.rpc_cssd_assign_cycle_qr(p_quy_trinh_id);

  RETURN json_build_object(
    'success', true,
    'ma_cycle_qr', coalesce(v_cycle->>'ma_cycle_qr', null)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Resolve QR 3 cột trong rpc_scan_workflow_station.
CREATE OR REPLACE FUNCTION public.rpc_scan_workflow_station(
  p_ma_qr text,
  p_target_station text,
  p_operator_label text DEFAULT 'CSSD'::text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_row RECORD;
  v_qt_id uuid;
  v_current_ma text;
  v_target_id uuid;
  v_current_idx int;
  v_target_idx int;
  v_operator_id uuid;
  v_me RECORD;
  v_sub_block int;
  v_sub_codes text;
  v_bo_vinh_vien text;
BEGIN
  IF upper(trim(coalesce(p_target_station, ''))) = 'TIET_KHUAN' THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Không xử lý tiệt khuẩn bằng quét tại trang này khi chưa có phiếu mẻ. Vào Mẻ tiệt khuẩn: tạo phiếu, rồi quét QR bộ trong màn hình mẻ.'
    );
  END IF;

  SELECT id INTO v_operator_id
  FROM public.mdm_nhan_su
  WHERE lower(email) = lower(trim(p_operator_label)) AND is_active = true
  LIMIT 1;

  v_qt_id := public.fn_cssd_resolve_active_quy_trinh_id(p_ma_qr);
  IF v_qt_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ hoặc bộ chưa được tiếp nhận.');
  END IF;

  SELECT q.*, t.ma_tram AS ma_tram_hien_tai
  INTO v_row
  FROM public.cssd_fact_quy_trinh q
  LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
  WHERE q.id = v_qt_id;

  IF coalesce(v_row.is_dong_bang, false) = true THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Bộ dụng cụ ' || p_ma_qr || ' đang bị khóa an toàn (đóng băng).'
    );
  END IF;

  SELECT id INTO v_target_id
  FROM public.cssd_dm_tram
  WHERE upper(trim(ma_tram)) = upper(trim(p_target_station)) AND is_active = true
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Trạm không hợp lệ: ' || coalesce(p_target_station, ''));
  END IF;

  v_current_ma := coalesce(v_row.ma_tram_hien_tai, '');

  v_current_idx := CASE v_current_ma
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  v_target_idx := CASE upper(trim(p_target_station))
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  IF v_current_ma = 'TIET_KHUAN' AND upper(trim(p_target_station)) = 'CAP_PHAT' THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Bộ đang ở tiệt khuẩn: hoàn tất mẻ TK (QC) trước — hệ thống tự chuyển Cấp phát khi mẻ đạt.'
    );
  END IF;

  IF NOT (v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN') THEN
    IF v_target_idx != v_current_idx + 1 THEN
      RETURN json_build_object('success', false, 'message', 'Sai trạm! Quy trình đang ở bước ' || v_current_ma);
    END IF;
  END IF;

  IF upper(trim(p_target_station)) = 'CAP_PHAT' THEN
    IF v_row.lo_tiet_khuan_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Bộ dụng cụ này CHƯA VÀO MẺ TIỆT KHUẨN. Không thể cấp phát.'
      );
    END IF;

    SELECT ma_lo_tiet_khuan, ket_qua_test
    INTO v_me
    FROM public.cssd_fact_lo_tiet_khuan
    WHERE id = v_row.lo_tiet_khuan_id;

    IF NOT FOUND OR v_me.ket_qua_test IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Mẻ tiệt khuẩn ' || coalesce(v_me.ma_lo_tiet_khuan, 'liên quan') || ' CHƯA CÓ KẾT QUẢ NỘI KIỂM.'
      );
    END IF;

    IF v_me.ket_qua_test = false THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Mẻ tiệt khuẩn ' || v_me.ma_lo_tiet_khuan || ' KHÔNG ĐẠT. Bộ phải được tái xử lý.'
      );
    END IF;

    SELECT count(*)::int, string_agg(upper(trim(sub.ma_qr_quy_trinh)), ', ' ORDER BY sub.ma_qr_quy_trinh)
    INTO v_sub_block, v_sub_codes
    FROM public.cssd_fact_quy_trinh sub
    LEFT JOIN public.cssd_dm_tram tr ON tr.id = sub.tram_hien_tai_id
    WHERE sub.quy_trinh_cha_id = v_row.id
      AND sub.is_active = true
      AND coalesce(sub.ma_vai_tro_bo, 'DON') = 'SUB'
      AND coalesce(upper(tr.ma_tram), '') <> 'CAP_PHAT';

    IF coalesce(v_sub_block, 0) > 0 THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Cảnh báo hội quân (merge): bộ còn ' || v_sub_block || ' kiện phụ chưa ở Cấp phát. QR phụ: ' || coalesce(v_sub_codes, '—') || '.'
      );
    END IF;
  END IF;

  v_bo_vinh_vien := coalesce(v_row.ma_qr_bo_vinh_vien, v_row.ma_qr_quy_trinh);

  IF v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN' THEN
    INSERT INTO public.cssd_fact_quy_trinh(
      ma_qr_quy_trinh,
      ma_qr_bo_vinh_vien,
      bo_dung_cu_id,
      tram_hien_tai_id,
      suds_count,
      tinh_trang,
      is_dong_bang,
      is_active,
      created_at,
      updated_at,
      thoi_gian_tiep_nhan,
      nguoi_tiep_nhan_id
    ) VALUES (
      p_ma_qr,
      v_bo_vinh_vien,
      v_row.bo_dung_cu_id,
      v_target_id,
      coalesce(v_row.suds_count, 0) + 1,
      'BINH_THUONG',
      false,
      true,
      now(),
      now(),
      now(),
      v_operator_id
    );
    UPDATE public.cssd_fact_quy_trinh
    SET is_active = false, updated_at = now()
    WHERE id = v_row.id;
  ELSE
    UPDATE public.cssd_fact_quy_trinh
    SET
      tram_hien_tai_id = v_target_id,
      updated_at = now(),
      thoi_gian_lam_sach = CASE WHEN p_target_station = 'LAM_SACH' THEN now() ELSE thoi_gian_lam_sach END,
      nguoi_lam_sach_id = CASE WHEN p_target_station = 'LAM_SACH' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_lam_sach_id END,
      thoi_gian_qc = CASE WHEN p_target_station = 'QC' THEN now() ELSE thoi_gian_qc END,
      nguoi_kiem_tra_id = CASE WHEN p_target_station = 'QC' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_kiem_tra_id END,
      thoi_gian_dong_goi = CASE WHEN p_target_station = 'DONG_GOI' THEN now() ELSE thoi_gian_dong_goi END,
      nguoi_dong_goi_id = CASE WHEN p_target_station = 'DONG_GOI' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_dong_goi_id END,
      thoi_gian_tiet_khuan = CASE WHEN p_target_station = 'TIET_KHUAN' THEN now() ELSE thoi_gian_tiet_khuan END,
      nguoi_tiet_khuan_id = CASE WHEN p_target_station = 'TIET_KHUAN' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_tiet_khuan_id END,
      thoi_gian_cap_phat = CASE WHEN p_target_station = 'CAP_PHAT' THEN now() ELSE thoi_gian_cap_phat END,
      nguoi_cap_phat_id = CASE WHEN p_target_station = 'CAP_PHAT' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_cap_phat_id END
    WHERE id = v_row.id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'data', jsonb_build_object('den', upper(trim(p_target_station)), 'operator', p_operator_label)
  );
END;
$$;

DROP VIEW IF EXISTS public.v_cssd_quy_trinh_full;

CREATE VIEW public.v_cssd_quy_trinh_full WITH (security_invoker = true) AS
SELECT
  q.id,
  q.ma_qr_quy_trinh,
  q.ma_cycle_qr,
  q.ma_qr_bo_vinh_vien,
  q.bo_dung_cu_id,
  q.tram_hien_tai_id,
  t.ma_tram AS ma_trang_thai_hien_tai,
  t.ten_tram AS ten_tram_hien_tai,
  q.nguoi_dang_giu_id,
  q.nguoi_tiep_nhan_id,
  q.nguoi_lam_sach_id,
  q.nguoi_kiem_tra_id,
  q.nguoi_dong_goi_id,
  q.nguoi_tiet_khuan_id,
  q.nguoi_cap_phat_id,
  q.thoi_gian_tiep_nhan,
  q.thoi_gian_lam_sach,
  q.thoi_gian_qc,
  q.thoi_gian_dong_goi,
  q.thoi_gian_tiet_khuan,
  q.thoi_gian_cap_phat,
  q.lo_tiet_khuan_id,
  q.suds_count,
  q.ngay_tiet_khuan,
  q.han_su_dung,
  q.tinh_trang,
  q.is_dong_bang,
  q.quy_trinh_cha_id,
  q.ma_vai_tro_bo,
  q.metadata ->> 'ma_ca_mo_id' AS ma_ca_mo_id,
  q.ngay_het_han,
  q.is_active,
  b.ten_bo,
  b.ma_bo,
  k.ten_khoa,
  l.ten_loai AS ten_loai_dung_cu,
  q.created_at,
  q.updated_at
FROM public.cssd_fact_quy_trinh q
LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
LEFT JOIN public.cssd_dm_bo_dung_cu b ON q.bo_dung_cu_id = b.id
LEFT JOIN public.mdm_dm_khoa_phong k ON b.khoa_su_dung_id = k.id
LEFT JOIN public.cssd_dm_loai_dung_cu l ON b.loai_dung_cu_id = l.id;

GRANT SELECT ON public.v_cssd_quy_trinh_full TO anon, authenticated, service_role;
