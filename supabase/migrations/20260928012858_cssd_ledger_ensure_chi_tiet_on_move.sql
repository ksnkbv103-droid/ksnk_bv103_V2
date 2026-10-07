-- Soft/Cloud DoD Approach A (local draft — Lead applies prod; Soft does NOT apply).
-- On BO_SUNG and DIEU_CHUYEN dest: ensure active cssd_dm_bo_dung_cu_chi_tiet for (bo, loai)
-- in the same TX as ledger writes so v_cssd_bo_dung_cu_chi_tiet_realtime / LOAI totals see stock.
-- so_luong baseline = 0; qty comes from cssd_fact_kho_giao_dich (Domain-safe until §5 locks otherwise).
-- TRA_KHO (NHAP_KHO) / BAO_HONG / BAO_MAT unchanged. Idempotent under uq_cssd_bom_chi_tiet_bo_loai_active.
-- Lock order: loai row → chi_tiet → tx insert.

CREATE OR REPLACE FUNCTION public.fn_cssd_ensure_chi_tiet_for_ledger(
  p_bo_dung_cu_id uuid,
  p_loai_dung_cu_id uuid,
  p_ten_dung_cu_le text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_chi uuid;
  v_ten text;
BEGIN
  IF p_bo_dung_cu_id IS NULL OR p_loai_dung_cu_id IS NULL THEN
    RETURN;
  END IF;

  -- 1) loai row lock (same TX; BO_SUNG may already hold it via kho UPDATE)
  PERFORM 1
    FROM public.cssd_dm_loai_dung_cu
   WHERE id = p_loai_dung_cu_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy loại dụng cụ.';
  END IF;

  -- 2) existing active chi_tiet lock
  SELECT ct.id INTO v_chi
    FROM public.cssd_dm_bo_dung_cu_chi_tiet ct
   WHERE ct.bo_dung_cu_id = p_bo_dung_cu_id
     AND ct.loai_dung_cu_id = p_loai_dung_cu_id
     AND ct.is_active = true
   ORDER BY ct.created_at, ct.id
   LIMIT 1
   FOR UPDATE;
  IF v_chi IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(
           NULLIF(trim(COALESCE(p_ten_dung_cu_le, '')), ''),
           NULLIF(trim(l.ten_loai), ''),
           '—'
         )
    INTO v_ten
    FROM public.cssd_dm_loai_dung_cu l
   WHERE l.id = p_loai_dung_cu_id;

  BEGIN
    INSERT INTO public.cssd_dm_bo_dung_cu_chi_tiet (
      bo_dung_cu_id,
      loai_dung_cu_id,
      ten_dung_cu_le,
      ten_chi_tiet,
      so_luong,
      is_active,
      specs,
      created_at,
      updated_at
    ) VALUES (
      p_bo_dung_cu_id,
      p_loai_dung_cu_id,
      COALESCE(v_ten, '—'),
      COALESCE(v_ten, '—'),
      0,
      true,
      '{}'::jsonb,
      now(),
      now()
    );
  EXCEPTION WHEN unique_violation THEN
    -- concurrent ensure under partial unique — lock winner and continue
    SELECT ct.id INTO v_chi
      FROM public.cssd_dm_bo_dung_cu_chi_tiet ct
     WHERE ct.bo_dung_cu_id = p_bo_dung_cu_id
       AND ct.loai_dung_cu_id = p_loai_dung_cu_id
       AND ct.is_active = true
     ORDER BY ct.created_at, ct.id
     LIMIT 1
     FOR UPDATE;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_apply_instrument_ledger_tx(
  p_su_co_id uuid,
  p_loai_dung_cu_id uuid,
  p_bo_dung_cu_id uuid,
  p_quy_trinh_id uuid,
  p_loai_giao_dich text,
  p_so_luong_thay_doi integer,
  p_ghi_chu text,
  p_bo_dung_cu_id_den uuid,
  p_nguoi_thuc_hien_id uuid,
  p_chi_tiet_id uuid,
  p_issue_type text,
  p_ten_dung_cu_le text,
  p_ma_qr_nguon text,
  p_ma_qr_den text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_abs integer;
  v_thuc integer;
  v_reserve integer;
  v_den uuid;
  v_qt_tu uuid;
  v_qt_den uuid;
  v_issue text;
  v_ma_den text;
  v_ma_nguon text;
BEGIN
  IF p_loai_dung_cu_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu loại dụng cụ.';
  END IF;
  IF p_so_luong_thay_doi IS NULL OR p_so_luong_thay_doi = 0 THEN
    RAISE EXCEPTION 'Số lượng phải lớn hơn 0.';
  END IF;
  v_abs := abs(p_so_luong_thay_doi);
  IF v_abs <= 0 THEN
    RAISE EXCEPTION 'Số lượng phải lớn hơn 0.';
  END IF;
  IF p_loai_giao_dich NOT IN ('NHAP_KHO', 'BAO_HONG', 'BAO_MAT', 'BO_SUNG', 'DIEU_CHUYEN') THEN
    RAISE EXCEPTION 'Loại giao dịch không hợp lệ.';
  END IF;

  IF p_loai_giao_dich IN ('BAO_HONG', 'BAO_MAT', 'DIEU_CHUYEN', 'NHAP_KHO')
     AND p_bo_dung_cu_id IS NOT NULL THEN
    v_thuc := public.fn_cssd_set_thuc_te(p_bo_dung_cu_id, p_loai_dung_cu_id);
    IF v_thuc IS NULL OR v_thuc < v_abs THEN
      IF p_loai_giao_dich = 'NHAP_KHO' THEN
        RAISE EXCEPTION 'Bộ không đủ số để trả kho (hiện có %).', COALESCE(v_thuc, 0);
      END IF;
      RAISE EXCEPTION 'Số lượng vượt quá số thực tế (%).', COALESCE(v_thuc, 0);
    END IF;
  END IF;

  IF p_loai_giao_dich = 'BO_SUNG' THEN
    UPDATE public.cssd_dm_loai_dung_cu
       SET so_luong_kho_du_phong = so_luong_kho_du_phong - v_abs,
           updated_at = now()
     WHERE id = p_loai_dung_cu_id
       AND is_active = true
       AND so_luong_kho_du_phong >= v_abs;
    IF NOT FOUND THEN
      SELECT COALESCE(so_luong_kho_du_phong, 0) INTO v_reserve
        FROM public.cssd_dm_loai_dung_cu
       WHERE id = p_loai_dung_cu_id;
      RAISE EXCEPTION 'Kho dự phòng không đủ (hiện có %).', COALESCE(v_reserve, 0);
    END IF;
    -- Approach A: bộ đích (nguồn BO_SUNG) must have chi_tiet so realtime view shows stock
    PERFORM public.fn_cssd_ensure_chi_tiet_for_ledger(
      p_bo_dung_cu_id, p_loai_dung_cu_id, p_ten_dung_cu_le
    );
  ELSIF p_loai_giao_dich = 'NHAP_KHO' THEN
    UPDATE public.cssd_dm_loai_dung_cu
       SET so_luong_kho_du_phong = so_luong_kho_du_phong + v_abs,
           updated_at = now()
     WHERE id = p_loai_dung_cu_id
       AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy loại dụng cụ để cộng kho dự phòng.';
    END IF;
  END IF;

  v_issue := NULLIF(upper(trim(COALESCE(p_issue_type, ''))), '');
  IF v_issue IS NULL AND p_loai_giao_dich = 'BAO_HONG' THEN
    v_issue := 'HONG';
  ELSIF v_issue IS NULL AND p_loai_giao_dich = 'BAO_MAT' THEN
    v_issue := 'MAT';
  END IF;
  IF p_chi_tiet_id IS NOT NULL AND v_issue IN ('HONG', 'MAT') THEN
    PERFORM public.fn_cssd_append_chi_tiet_issue_note(p_chi_tiet_id, v_issue, p_ghi_chu, v_abs);
  END IF;

  v_den := p_bo_dung_cu_id_den;
  v_ma_den := NULLIF(upper(trim(COALESCE(p_ma_qr_den, ''))), '');
  v_ma_nguon := NULLIF(upper(trim(COALESCE(p_ma_qr_nguon, ''))), '');
  IF p_loai_giao_dich = 'DIEU_CHUYEN' AND v_den IS NULL AND v_ma_den IS NOT NULL THEN
    SELECT b.id INTO v_den
      FROM public.cssd_dm_bo_dung_cu b
     WHERE upper(b.ma_bo) = v_ma_den
       AND b.is_active = true
     LIMIT 1;
    IF v_den IS NULL THEN
      RAISE EXCEPTION 'Không tìm thấy bộ đích theo QR.';
    END IF;
  END IF;

  IF p_loai_giao_dich = 'DIEU_CHUYEN'
     AND v_ma_nguon IS NOT NULL
     AND v_ma_den IS NOT NULL
     AND NULLIF(trim(COALESCE(p_ten_dung_cu_le, '')), '') IS NOT NULL THEN
    SELECT q.id INTO v_qt_tu
      FROM public.cssd_fact_quy_trinh q
     WHERE upper(q.ma_qr_quy_trinh) = v_ma_nguon
       AND q.is_active = true
     ORDER BY q.created_at DESC
     LIMIT 1;
    SELECT q.id INTO v_qt_den
      FROM public.cssd_fact_quy_trinh q
     WHERE upper(q.ma_qr_quy_trinh) = v_ma_den
       AND q.is_active = true
     ORDER BY q.created_at DESC
     LIMIT 1;
    IF v_qt_tu IS NOT NULL AND v_qt_den IS NOT NULL THEN
      PERFORM public.fn_cssd_transfer_bom_metadata(
        v_qt_tu, v_qt_den, trim(p_ten_dung_cu_le), v_abs
      );
    END IF;
  END IF;

  -- Approach A: DIEU_CHUYEN dest — ensure chi_tiet before dual tx so dest thuc_te visible
  IF p_loai_giao_dich = 'DIEU_CHUYEN' AND v_den IS NOT NULL THEN
    PERFORM public.fn_cssd_ensure_chi_tiet_for_ledger(
      v_den, p_loai_dung_cu_id, p_ten_dung_cu_le
    );
  END IF;

  INSERT INTO public.cssd_fact_kho_giao_dich (
    loai_dung_cu_id, bo_dung_cu_id, quy_trinh_id, loai_giao_dich,
    so_luong_thay_doi, ghi_chu, su_co_id, nguoi_thuc_hien_id, created_at, updated_at
  ) VALUES (
    p_loai_dung_cu_id, p_bo_dung_cu_id, p_quy_trinh_id, p_loai_giao_dich,
    p_so_luong_thay_doi, NULLIF(trim(COALESCE(p_ghi_chu, '')), ''),
    p_su_co_id, p_nguoi_thuc_hien_id, now(), now()
  );

  IF p_loai_giao_dich = 'DIEU_CHUYEN' AND v_den IS NOT NULL THEN
    INSERT INTO public.cssd_fact_kho_giao_dich (
      loai_dung_cu_id, bo_dung_cu_id, quy_trinh_id, loai_giao_dich,
      so_luong_thay_doi, ghi_chu, su_co_id, nguoi_thuc_hien_id, created_at, updated_at
    ) VALUES (
      p_loai_dung_cu_id, v_den, p_quy_trinh_id, 'DIEU_CHUYEN',
      v_abs, COALESCE(NULLIF(trim(COALESCE(p_ghi_chu, '')), ''), 'Nhận điều chuyển'),
      p_su_co_id, p_nguoi_thuc_hien_id, now(), now()
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_ensure_chi_tiet_for_ledger(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cssd_apply_instrument_ledger_tx(uuid, uuid, uuid, uuid, text, integer, text, uuid, uuid, uuid, text, text, text, text) FROM PUBLIC;

COMMENT ON FUNCTION public.fn_cssd_ensure_chi_tiet_for_ledger(uuid, uuid, text) IS
  'CSSD 2026-09-28 Approach A: idempotent ensure active BOM chi_tiet (so_luong=0) before BO_SUNG/DIEU_CHUYEN dest ledger tx.';
