-- P0: Harden rpc_scan_workflow_station — gate CAP_PHAT + merge SUB tại DB (SSOT runtime).

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
  v_current_ma text;
  v_target_id uuid;
  v_current_idx int;
  v_target_idx int;
  v_operator_id uuid;
  v_me RECORD;
  v_sub_block int;
  v_sub_codes text;
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

  SELECT q.*, t.ma_tram AS ma_tram_hien_tai
  INTO v_row
  FROM public.cssd_fact_quy_trinh q
  LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
  WHERE upper(q.ma_qr_quy_trinh) = upper(trim(p_ma_qr))
    AND q.is_active = true
  ORDER BY q.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ hoặc bộ chưa được tiếp nhận.');
  END IF;

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
    SELECT id INTO v_target_id
    FROM public.dm_tram_cssd
    WHERE upper(trim(ma_tram)) = upper(trim(p_target_station)) AND is_active = true
    LIMIT 1;
  END IF;

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

  IF v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN' THEN
    INSERT INTO public.cssd_fact_quy_trinh(
      ma_qr_quy_trinh,
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

COMMENT ON FUNCTION public.rpc_scan_workflow_station(text, text, text) IS
  'Quét chuyển trạm CSSD (atomic). Gate CAP_PHAT: mẻ TK đạt, merge SUB; chặn quét TK tại luồng 6 trạm.';
