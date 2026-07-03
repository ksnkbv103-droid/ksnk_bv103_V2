-- CSSD dụng cụ: liên kết sổ giao dịch với biên bản sự cố + RPC ghi sổ atomic

ALTER TABLE public.cssd_fact_kho_giao_dich
  ADD COLUMN IF NOT EXISTS su_co_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_kho_dc_su_co_id_fkey'
  ) THEN
    ALTER TABLE public.cssd_fact_kho_giao_dich
      ADD CONSTRAINT cssd_fact_kho_dc_su_co_id_fkey
      FOREIGN KEY (su_co_id) REFERENCES public.cssd_fact_su_co(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fact_kho_dc_su_co ON public.cssd_fact_kho_giao_dich (su_co_id)
  WHERE su_co_id IS NOT NULL;

-- Ghi sổ biến động dụng cụ gắn biên bản sự cố (Hỏng/Mất/Bổ sung/Điều chuyển)
CREATE OR REPLACE FUNCTION public.rpc_cssd_apply_instrument_ledger(
  p_su_co_id uuid,
  p_loai_dung_cu_id uuid,
  p_bo_dung_cu_id uuid,
  p_quy_trinh_id uuid,
  p_loai_giao_dich text,
  p_so_luong_thay_doi integer,
  p_ghi_chu text DEFAULT NULL,
  p_bo_dung_cu_id_den uuid DEFAULT NULL,
  p_nguoi_thuc_hien_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_thuc_te integer;
  v_reserve integer;
  v_abs_qty integer;
BEGIN
  IF p_loai_dung_cu_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Thiếu loại dụng cụ.');
  END IF;

  v_abs_qty := abs(p_so_luong_thay_doi);
  IF v_abs_qty <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Số lượng phải lớn hơn 0.');
  END IF;

  IF p_loai_giao_dich IN ('BAO_HONG', 'BAO_MAT', 'DIEU_CHUYEN') AND p_bo_dung_cu_id IS NOT NULL THEN
    SELECT COALESCE(SUM(tx.so_luong_thay_doi), 0)::integer + COALESCE(ct.so_luong, 0)::integer
      INTO v_thuc_te
      FROM public.cssd_dm_bo_dung_cu_chi_tiet ct
      LEFT JOIN public.cssd_fact_kho_giao_dich tx
        ON tx.loai_dung_cu_id = ct.loai_dung_cu_id
       AND tx.bo_dung_cu_id = ct.bo_dung_cu_id
       AND tx.is_active = true
     WHERE ct.bo_dung_cu_id = p_bo_dung_cu_id
       AND ct.loai_dung_cu_id = p_loai_dung_cu_id
       AND ct.is_active = true
     LIMIT 1;

    IF v_thuc_te IS NULL OR v_thuc_te < v_abs_qty THEN
      RETURN json_build_object(
        'success', false,
        'message', format('Số lượng vượt quá số thực tế (%s).', COALESCE(v_thuc_te, 0))
      );
    END IF;
  END IF;

  IF p_loai_giao_dich = 'BO_SUNG' THEN
    SELECT COALESCE(so_luong_kho_du_phong, 0)::integer
      INTO v_reserve
      FROM public.cssd_dm_loai_dung_cu
     WHERE id = p_loai_dung_cu_id
       AND is_active = true;

    IF v_reserve IS NULL OR v_reserve < v_abs_qty THEN
      RETURN json_build_object(
        'success', false,
        'message', format('Kho dự phòng không đủ (hiện có %s).', COALESCE(v_reserve, 0))
      );
    END IF;

    UPDATE public.cssd_dm_loai_dung_cu
       SET so_luong_kho_du_phong = v_reserve - v_abs_qty,
           updated_at = now()
     WHERE id = p_loai_dung_cu_id;
  END IF;

  INSERT INTO public.cssd_fact_kho_giao_dich (
    loai_dung_cu_id,
    bo_dung_cu_id,
    quy_trinh_id,
    loai_giao_dich,
    so_luong_thay_doi,
    ghi_chu,
    su_co_id,
    nguoi_thuc_hien_id,
    created_at,
    updated_at
  ) VALUES (
    p_loai_dung_cu_id,
    p_bo_dung_cu_id,
    p_quy_trinh_id,
    p_loai_giao_dich,
    p_so_luong_thay_doi,
    NULLIF(trim(p_ghi_chu), ''),
    p_su_co_id,
    p_nguoi_thuc_hien_id,
    now(),
    now()
  );

  IF p_loai_giao_dich = 'DIEU_CHUYEN' AND p_bo_dung_cu_id_den IS NOT NULL THEN
    INSERT INTO public.cssd_fact_kho_giao_dich (
      loai_dung_cu_id,
      bo_dung_cu_id,
      quy_trinh_id,
      loai_giao_dich,
      so_luong_thay_doi,
      ghi_chu,
      su_co_id,
      nguoi_thuc_hien_id,
      created_at,
      updated_at
    ) VALUES (
      p_loai_dung_cu_id,
      p_bo_dung_cu_id_den,
      p_quy_trinh_id,
      'DIEU_CHUYEN',
      v_abs_qty,
      COALESCE(NULLIF(trim(p_ghi_chu), ''), 'Nhận điều chuyển'),
      p_su_co_id,
      p_nguoi_thuc_hien_id,
      now(),
      now()
    );
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_cssd_apply_instrument_ledger(
  uuid, uuid, uuid, uuid, text, integer, text, uuid, uuid
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_apply_instrument_ledger(
  uuid, uuid, uuid, uuid, text, integer, text, uuid, uuid
) TO service_role;
