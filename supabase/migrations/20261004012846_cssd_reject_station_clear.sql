-- S-D: RPC trả lui 1 trạm — FOR UPDATE, clear stamp trạm hủy, append ngoai_le (before).
-- File-only trên tip; TS application layer đã clear stamp local-first (chưa wire RPC).
-- Apply khi Nghĩa lệnh migrate.

CREATE OR REPLACE FUNCTION public.rpc_cssd_reject_station(
  p_quy_trinh_id uuid,
  p_ly_do text,
  p_operator_label text DEFAULT 'CSSD'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row public.cssd_fact_quy_trinh%ROWTYPE;
  v_ma_tram text;
  v_prev text;
  v_prev_id uuid;
  v_from_id uuid;
  v_ly_do text := nullif(trim(coalesce(p_ly_do, '')), '');
  v_op text := nullif(trim(coalesce(p_operator_label, '')), '');
  v_before jsonb := '{}'::jsonb;
  v_clear text[] := ARRAY[]::text[];
  v_clear_lo boolean := false;
  v_n int;
BEGIN
  IF p_quy_trinh_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu quy trình.';
  END IF;
  IF v_ly_do IS NULL THEN
    RAISE EXCEPTION 'Vui lòng nhập lý do trả lui.';
  END IF;
  IF v_op IS NULL THEN
    v_op := 'CSSD';
  END IF;

  SELECT * INTO v_row
  FROM public.cssd_fact_quy_trinh
  WHERE id = p_quy_trinh_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy quy trình.';
  END IF;
  IF coalesce(v_row.is_active, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Quy trình không còn active.';
  END IF;
  IF coalesce(v_row.is_dong_bang, false) IS TRUE THEN
    RAISE EXCEPTION 'Đang khóa an toàn — không trả lui thủ công.';
  END IF;

  SELECT upper(trim(t.ma_tram)) INTO v_ma_tram
  FROM public.cssd_dm_tram t
  WHERE t.id = v_row.tram_hien_tai_id;
  IF v_ma_tram IS NULL THEN
    RAISE EXCEPTION 'Trạm hiện tại không hợp lệ.';
  END IF;
  IF v_ma_tram IN ('TIET_KHUAN', 'CAP_PHAT') THEN
    RAISE EXCEPTION
      'Không trả lui thủ công từ Tiệt khuẩn hoặc Cấp phát — dùng phiếu mẻ và báo sự cố theo quy định.';
  END IF;
  IF v_ma_tram = 'TIEP_NHAN' THEN
    RAISE EXCEPTION 'Không thể trả lui từ trạm Tiếp nhận.';
  END IF;

  v_prev := CASE v_ma_tram
    WHEN 'LAM_SACH' THEN 'TIEP_NHAN'
    WHEN 'QC' THEN 'LAM_SACH'
    WHEN 'DONG_GOI' THEN 'QC'
    ELSE NULL
  END;
  IF v_prev IS NULL THEN
    RAISE EXCEPTION 'Không xác định được trạm trước.';
  END IF;

  SELECT t.id INTO v_prev_id FROM public.cssd_dm_tram t
  WHERE upper(trim(t.ma_tram)) = v_prev AND t.is_active = true
  LIMIT 1;
  IF v_prev_id IS NULL THEN
    RAISE EXCEPTION 'Trạm CSSD không hợp lệ: %', v_prev;
  END IF;
  v_from_id := v_row.tram_hien_tai_id;

  -- Snapshot before (chỉ field khác null)
  IF v_ma_tram = 'LAM_SACH' THEN
    v_clear := ARRAY['LAM_SACH'];
    v_before := v_before
      || CASE WHEN v_row.thoi_gian_lam_sach IS NOT NULL THEN jsonb_build_object('thoi_gian_lam_sach', v_row.thoi_gian_lam_sach) ELSE '{}'::jsonb END
      || CASE WHEN v_row.nguoi_lam_sach_id IS NOT NULL THEN jsonb_build_object('nguoi_lam_sach_id', v_row.nguoi_lam_sach_id) ELSE '{}'::jsonb END;
  ELSIF v_ma_tram = 'QC' THEN
    v_clear := ARRAY['QC'];
    v_before := v_before
      || CASE WHEN v_row.thoi_gian_qc IS NOT NULL THEN jsonb_build_object('thoi_gian_qc', v_row.thoi_gian_qc) ELSE '{}'::jsonb END
      || CASE WHEN v_row.nguoi_kiem_tra_id IS NOT NULL THEN jsonb_build_object('nguoi_kiem_tra_id', v_row.nguoi_kiem_tra_id) ELSE '{}'::jsonb END;
  ELSIF v_ma_tram = 'DONG_GOI' THEN
    v_clear := ARRAY['DONG_GOI'];
    v_before := v_before
      || CASE WHEN v_row.thoi_gian_dong_goi IS NOT NULL THEN jsonb_build_object('thoi_gian_dong_goi', v_row.thoi_gian_dong_goi) ELSE '{}'::jsonb END
      || CASE WHEN v_row.nguoi_dong_goi_id IS NOT NULL THEN jsonb_build_object('nguoi_dong_goi_id', v_row.nguoi_dong_goi_id) ELSE '{}'::jsonb END
      || CASE WHEN nullif(trim(coalesce(v_row.ma_cycle_qr, '')), '') IS NOT NULL THEN jsonb_build_object('ma_cycle_qr', v_row.ma_cycle_qr) ELSE '{}'::jsonb END
      || CASE WHEN v_row.bom_kiem_dem_at IS NOT NULL THEN jsonb_build_object('bom_kiem_dem_at', v_row.bom_kiem_dem_at) ELSE '{}'::jsonb END
      || CASE WHEN v_row.bom_kiem_dem_boi_id IS NOT NULL THEN jsonb_build_object('bom_kiem_dem_boi_id', v_row.bom_kiem_dem_boi_id) ELSE '{}'::jsonb END;
    IF v_row.lo_tiet_khuan_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.cssd_fact_lo_tiet_khuan m
        WHERE m.id = v_row.lo_tiet_khuan_id AND m.tk_chot_nap_at IS NOT NULL
      ) THEN
        v_clear_lo := true;
      END IF;
    END IF;
  END IF;

  UPDATE public.cssd_fact_quy_trinh q
  SET
    tram_hien_tai_id = v_prev_id,
    updated_at = now(),
    thoi_gian_lam_sach = CASE WHEN v_ma_tram = 'LAM_SACH' THEN NULL ELSE q.thoi_gian_lam_sach END,
    nguoi_lam_sach_id = CASE WHEN v_ma_tram = 'LAM_SACH' THEN NULL ELSE q.nguoi_lam_sach_id END,
    thoi_gian_qc = CASE WHEN v_ma_tram = 'QC' THEN NULL ELSE q.thoi_gian_qc END,
    nguoi_kiem_tra_id = CASE WHEN v_ma_tram = 'QC' THEN NULL ELSE q.nguoi_kiem_tra_id END,
    thoi_gian_dong_goi = CASE WHEN v_ma_tram = 'DONG_GOI' THEN NULL ELSE q.thoi_gian_dong_goi END,
    nguoi_dong_goi_id = CASE WHEN v_ma_tram = 'DONG_GOI' THEN NULL ELSE q.nguoi_dong_goi_id END,
    ma_cycle_qr = CASE WHEN v_ma_tram = 'DONG_GOI' THEN NULL ELSE q.ma_cycle_qr END,
    bom_kiem_dem_at = CASE WHEN v_ma_tram = 'DONG_GOI' THEN NULL ELSE q.bom_kiem_dem_at END,
    bom_kiem_dem_boi_id = CASE WHEN v_ma_tram = 'DONG_GOI' THEN NULL ELSE q.bom_kiem_dem_boi_id END,
    lo_tiet_khuan_id = CASE WHEN v_clear_lo THEN NULL ELSE q.lo_tiet_khuan_id END
  WHERE q.id = p_quy_trinh_id
    AND q.tram_hien_tai_id = v_from_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Bộ đã đổi trạm — không trả lui.';
  END IF;

  PERFORM public.rpc_cssd_quy_trinh_append_ngoai_le(
    p_quy_trinh_id,
    jsonb_build_object(
      'su_kien', 'TRA_LUI_VOLUNTARY_ONE_STEP',
      'tu_tram', v_ma_tram,
      'den_tram', v_prev,
      'ly_do', v_ly_do,
      'nguoi_thao_tac', v_op,
      'thoi_gian', now(),
      'chi_tiet', jsonb_build_object(
        'clear_stations', to_jsonb(v_clear),
        'before', v_before,
        'clear_lo_tiet_khuan', v_clear_lo
      )
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'from', v_ma_tram,
    'to', v_prev,
    'clear_stations', to_jsonb(v_clear)
  );
END;
$$;

COMMENT ON FUNCTION public.rpc_cssd_reject_station(uuid, text, text) IS
  'S-D: trả lui 1 trạm atomic (FOR UPDATE + clear stamp + ngoai_le before). TS local-first chưa gọi.';

REVOKE ALL ON FUNCTION public.rpc_cssd_reject_station(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_reject_station(uuid, text, text) TO service_role;
