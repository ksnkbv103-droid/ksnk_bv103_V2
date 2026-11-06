-- CSSD lát 1: nhật ký chu kỳ `metadata.nhat_ky` (chỉ-thêm) — mỗi lượt quét/chọn bộ ghi người + giờ server.
-- Không bảng mới. Quét trạm: tài khoản chưa gắn hồ sơ nhân sự → từ chối (không ghi lặng lẽ người NULL).
-- Phần tử: {su_kien, tram, nhan_su_id, ten, thoi_gian, nguon?, chi_tiet?}. `ngoai_le` giữ nguyên (gỡ ở lát sau).
-- Hoàn tác: khôi phục thân hàm rpc_scan_workflow_station_impl từ 20261021020000, DROP trigger/hàm fn_cssd_*nhat_ky*.
-- CHƯA APPLY PROD — chờ PO.

-- 1) Người thao tác: ưu tiên phiên đăng nhập (auth.uid()), dự phòng nhãn email như bản cũ.
CREATE OR REPLACE FUNCTION public.fn_cssd_operator_nhan_su_id(p_label text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT coalesce(
    (SELECT ns.id FROM public.mdm_nhan_su ns
      WHERE ns.is_active = true AND auth.uid() IS NOT NULL AND ns.auth_user_id = auth.uid()
      LIMIT 1),
    (SELECT ns.id
       FROM public.mdm_nhan_su ns
       LEFT JOIN auth.users au ON au.id = ns.auth_user_id
      WHERE ns.is_active = true
        AND nullif(trim(coalesce(p_label, '')), '') IS NOT NULL
        AND (
          lower(trim(coalesce(ns.extra_data ->> 'email', ''))) = lower(trim(p_label))
          OR lower(trim(coalesce(au.email, ''))) = lower(trim(p_label))
        )
      LIMIT 1)
  );
$$;
REVOKE ALL ON FUNCTION public.fn_cssd_operator_nhan_su_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_cssd_operator_nhan_su_id(text) TO authenticated, service_role;

-- 2) Một dòng nhật ký (giờ server, tên lấy từ nhân sự).
CREATE OR REPLACE FUNCTION public.fn_cssd_nhat_ky_dong(
  p_su_kien text, p_tram text, p_nhan_su_id uuid, p_nguon text DEFAULT NULL, p_chi_tiet jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'su_kien', p_su_kien,
    'tram', p_tram,
    'nhan_su_id', p_nhan_su_id,
    'ten', (SELECT ns.ho_ten FROM public.mdm_nhan_su ns WHERE ns.id = p_nhan_su_id),
    'thoi_gian', to_jsonb(clock_timestamp()),
    'nguon', p_nguon,
    'chi_tiet', p_chi_tiet
  ));
$$;

-- 3) Nối thêm vào cuối mảng bằng SQL (không đọc-rồi-ghi từ app → không đua).
CREATE OR REPLACE FUNCTION public.fn_cssd_nhat_ky_them(
  p_quy_trinh_id uuid, p_su_kien text, p_tram text, p_nhan_su_id uuid, p_nguon text DEFAULT NULL, p_chi_tiet jsonb DEFAULT NULL
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.cssd_fact_quy_trinh q
  SET metadata = jsonb_set(
    coalesce(q.metadata, '{}'::jsonb),
    '{nhat_ky}',
    coalesce(q.metadata -> 'nhat_ky', '[]'::jsonb)
      || jsonb_build_array(public.fn_cssd_nhat_ky_dong(p_su_kien, p_tram, p_nhan_su_id, p_nguon, p_chi_tiet)),
    true
  )
  WHERE q.id = p_quy_trinh_id;
$$;
REVOKE ALL ON FUNCTION public.fn_cssd_nhat_ky_them(uuid, text, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- 4) Cổng cho app: người ghi lấy từ phiên đăng nhập (không nhận từ client), sự kiện trong danh sách cho phép.
CREATE OR REPLACE FUNCTION public.rpc_cssd_nhat_ky_ghi(
  p_quy_trinh_id uuid, p_su_kien text, p_tram text, p_nguon text DEFAULT NULL, p_chi_tiet jsonb DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_ns uuid;
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();
  IF p_su_kien NOT IN ('TRA_VE', 'CHON_BO') THEN
    RETURN json_build_object('success', false, 'message', 'Sự kiện nhật ký không hợp lệ: ' || coalesce(p_su_kien, ''));
  END IF;
  v_ns := public.fn_cssd_operator_nhan_su_id(NULL);
  IF v_ns IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Tài khoản chưa gắn hồ sơ nhân sự — không ghi được người thao tác.');
  END IF;
  PERFORM public.fn_cssd_nhat_ky_them(p_quy_trinh_id, p_su_kien, p_tram, v_ns, p_nguon, p_chi_tiet);
  RETURN json_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_cssd_nhat_ky_ghi(uuid, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_nhat_ky_ghi(uuid, text, text, text, jsonb) TO authenticated, service_role;

-- 5) Chỉ-thêm: mảng mới phải giữ nguyên mọi phần tử cũ theo đúng thứ tự.
CREATE OR REPLACE FUNCTION public.fn_cssd_guard_nhat_ky_chi_them()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_old jsonb := OLD.metadata -> 'nhat_ky';
  v_new jsonb := NEW.metadata -> 'nhat_ky';
  i int;
BEGIN
  IF v_old IS NULL OR jsonb_typeof(v_old) <> 'array' OR jsonb_array_length(v_old) = 0 THEN
    RETURN NEW;
  END IF;
  IF v_new IS NULL OR jsonb_typeof(v_new) <> 'array' OR jsonb_array_length(v_new) < jsonb_array_length(v_old) THEN
    RAISE EXCEPTION 'Nhật ký chu kỳ chỉ được thêm, không xóa/rút ngắn.' USING ERRCODE = 'check_violation';
  END IF;
  FOR i IN 0 .. jsonb_array_length(v_old) - 1 LOOP
    IF v_new -> i IS DISTINCT FROM v_old -> i THEN
      RAISE EXCEPTION 'Nhật ký chu kỳ chỉ được thêm, không sửa dòng đã ghi (vị trí %).', i USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cssd_guard_nhat_ky_chi_them ON public.cssd_fact_quy_trinh;
CREATE TRIGGER trg_cssd_guard_nhat_ky_chi_them
  BEFORE UPDATE OF metadata ON public.cssd_fact_quy_trinh
  FOR EACH ROW
  WHEN (OLD.metadata ? 'nhat_ky')
  EXECUTE FUNCTION public.fn_cssd_guard_nhat_ky_chi_them();

-- 6) Quét trạm: giữ nguyên bản 20261021020000, chỉ đổi (a) người từ fn_cssd_operator_nhan_su_id, NULL → từ chối,
--    (b) ghi nhật ký mỗi lượt quét (cả chu kỳ mới khi CAP_PHAT → TIEP_NHAN).
CREATE OR REPLACE FUNCTION public.rpc_scan_workflow_station_impl(p_ma_qr text, p_target_station text, p_operator_label text DEFAULT 'CSSD'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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

  v_operator_id := public.fn_cssd_operator_nhan_su_id(p_operator_label);
  IF v_operator_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Tài khoản chưa gắn hồ sơ nhân sự — không ghi được người thao tác. Nhờ quản trị gắn nhân sự cho tài khoản rồi quét lại.'
    );
  END IF;

  v_qt_id := public.fn_cssd_resolve_active_quy_trinh_id(p_ma_qr);
  IF v_qt_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ hoặc bộ chưa được tiếp nhận.');
  END IF;

  PERFORM 1
  FROM public.cssd_fact_quy_trinh q
  WHERE q.id = v_qt_id
    AND q.is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Bộ ' || p_ma_qr || ' vừa được thao tác ở phiên khác — quét lại để xem trạng thái mới.'
    );
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

  IF v_current_ma = 'TIEP_NHAN' AND upper(trim(p_target_station)) = 'TIEP_NHAN' THEN
    IF v_row.thoi_gian_tiep_nhan IS NOT NULL THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Bộ đã tiếp nhận — chuyển sang Làm sạch.'
      );
    END IF;
  ELSIF NOT (v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN') THEN
    IF v_target_idx != v_current_idx + 1 THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Sai trạm! Quy trình đang ở bước ' || coalesce(nullif(v_current_ma, ''), '—')
      );
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
    WHERE id = v_row.lo_tiet_khuan_id
    FOR SHARE;

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
      nguoi_tiep_nhan_id,
      metadata
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
      v_operator_id,
      jsonb_build_object('nhat_ky', jsonb_build_array(
        public.fn_cssd_nhat_ky_dong('QUET_TRAM', 'TIEP_NHAN', v_operator_id)
      ))
    );
    UPDATE public.cssd_fact_quy_trinh
    SET is_active = false, updated_at = now()
    WHERE id = v_row.id;
  ELSE
    UPDATE public.cssd_fact_quy_trinh
    SET
      tram_hien_tai_id = v_target_id,
      updated_at = now(),
      thoi_gian_tiep_nhan = CASE WHEN upper(trim(p_target_station)) = 'TIEP_NHAN' THEN now() ELSE thoi_gian_tiep_nhan END,
      nguoi_tiep_nhan_id = CASE WHEN upper(trim(p_target_station)) = 'TIEP_NHAN' THEN v_operator_id ELSE nguoi_tiep_nhan_id END,
      thoi_gian_lam_sach = CASE WHEN p_target_station = 'LAM_SACH' THEN now() ELSE thoi_gian_lam_sach END,
      nguoi_lam_sach_id = CASE WHEN p_target_station = 'LAM_SACH' THEN v_operator_id ELSE nguoi_lam_sach_id END,
      thoi_gian_qc = CASE WHEN p_target_station = 'QC' THEN now() ELSE thoi_gian_qc END,
      nguoi_kiem_tra_id = CASE WHEN p_target_station = 'QC' THEN v_operator_id ELSE nguoi_kiem_tra_id END,
      thoi_gian_dong_goi = CASE WHEN p_target_station = 'DONG_GOI' THEN now() ELSE thoi_gian_dong_goi END,
      nguoi_dong_goi_id = CASE WHEN p_target_station = 'DONG_GOI' THEN v_operator_id ELSE nguoi_dong_goi_id END,
      thoi_gian_tiet_khuan = CASE WHEN p_target_station = 'TIET_KHUAN' THEN now() ELSE thoi_gian_tiet_khuan END,
      nguoi_tiet_khuan_id = CASE WHEN p_target_station = 'TIET_KHUAN' THEN v_operator_id ELSE nguoi_tiet_khuan_id END,
      thoi_gian_cap_phat = CASE WHEN p_target_station = 'CAP_PHAT' THEN now() ELSE thoi_gian_cap_phat END,
      nguoi_cap_phat_id = CASE WHEN p_target_station = 'CAP_PHAT' THEN v_operator_id ELSE nguoi_cap_phat_id END
    WHERE id = v_row.id;

    PERFORM public.fn_cssd_nhat_ky_them(v_row.id, 'QUET_TRAM', upper(trim(p_target_station)), v_operator_id);
  END IF;

  RETURN json_build_object(
    'success', true,
    'data', jsonb_build_object('den', upper(trim(p_target_station)), 'operator', p_operator_label)
  );
END;
$function$;
