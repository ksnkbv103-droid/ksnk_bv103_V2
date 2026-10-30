-- Cổng nạp máy theo TỪNG cấu phần: mỗi dòng chi tiết của bộ phải cho phép phương pháp của máy
-- (cssd_dm_loai_dung_cu.phuong_phap_cho_phep). Thay luật cũ «cả bộ chịu nhiệt / không chịu nhiệt».
-- Giữ nguyên chữ ký hàm. CHƯA APPLY PROD — chờ PO.
-- Hoàn tác: áp lại định nghĩa trong 20261021020000_cssd_gate_scan_race_batch_gates.sql (fn_cssd_me_ly_do_lech_phuong_phap)
--           và 20260925010333_cssd_me_s2_qc_release.sql (fn_cssd_me_ly_do_chan_nhiet).

-- Bản 2 tham số cũ (luật is_chiu_nhiet cả bộ) không còn nơi gọi; bỏ để tránh nhập nhằng overload.
DROP FUNCTION IF EXISTS public.fn_cssd_me_ly_do_lech_phuong_phap(uuid, text);

CREATE OR REPLACE FUNCTION public.fn_cssd_me_ly_do_lech_phuong_phap(
  p_bo_id uuid, p_phuong_phap text, p_chuong_trinh text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $$
DECLARE
  v_pp text := upper(btrim(coalesce(p_phuong_phap, '')));
  v_ct text := upper(btrim(coalesce(p_chuong_trinh, '')));
  v_cho text[];
  v_n int;
  r record;
BEGIN
  IF v_pp NOT IN ('HOI_NUOC', 'PLASMA_H2O2', 'EO') THEN
    RETURN 'Không xác định được phương pháp máy — đã chặn nạp.';
  END IF;
  IF p_bo_id IS NULL THEN
    RETURN 'Không kiểm tra được phương pháp tiệt khuẩn — đã chặn thao tác.';
  END IF;

  IF v_pp = 'HOI_NUOC' THEN
    IF v_ct ~ '(121|HN_121|STEAM_121)' THEN v_cho := ARRAY['STEAM_121'];
    ELSIF v_ct ~ '(134|HN_134|STEAM_134)' THEN v_cho := ARRAY['STEAM_134'];
    ELSE v_cho := ARRAY['STEAM_134','STEAM_121'];
    END IF;
  ELSIF v_pp = 'PLASMA_H2O2' THEN v_cho := ARRAY['PLASMA'];
  ELSE v_cho := ARRAY['EO'];
  END IF;

  SELECT count(*)::int INTO v_n
  FROM public.cssd_dm_bo_dung_cu_chi_tiet c
  WHERE c.bo_dung_cu_id = p_bo_id AND coalesce(c.is_active, true);
  IF v_n = 0 THEN
    RETURN 'Không kiểm tra được phương pháp tiệt khuẩn — đã chặn thao tác.';
  END IF;

  FOR r IN
    SELECT coalesce(nullif(btrim(c.ten_dung_cu_le), ''), l.ten_loai, 'cấu phần') AS ten,
           l.id AS loai_id, l.phuong_phap_cho_phep AS cho_phep
    FROM public.cssd_dm_bo_dung_cu_chi_tiet c
    LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
    WHERE c.bo_dung_cu_id = p_bo_id AND coalesce(c.is_active, true)
  LOOP
    IF r.loai_id IS NULL OR r.cho_phep IS NULL OR cardinality(r.cho_phep) = 0 THEN
      RETURN 'Không kiểm tra được phương pháp tiệt khuẩn — đã chặn thao tác.';
    END IF;
    IF NOT (r.cho_phep && v_cho) THEN
      RETURN format('Cấu phần «%s» không được tiệt khuẩn bằng máy này (cho phép: %s) — không thêm vào mẻ. Nếu là bộ gộp, tách thành phần tại danh mục.',
                    r.ten, array_to_string(r.cho_phep, ', '));
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_me_ly_do_chan_nhiet(p_bo_id uuid)
RETURNS text
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT public.fn_cssd_me_ly_do_lech_phuong_phap(p_bo_id, 'HOI_NUOC', NULL);
$$;
