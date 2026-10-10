-- CSSD-L8: mẻ hỏng (QC không đạt / BI dương) → bộ còn trong CSSD quay về ĐÓNG GÓI (chu trình mới), không về TIẾP NHẬN.
-- PO duyệt 2026-10-10 («Hỏng về đóng gói»). Gốc: 20261005144000_cssd_me10_recall_preserve_qc.sql (thay nguyên thân hàm).
-- ĐÃ APPLY PROD 2026-10-10 qua MCP `apply_migration` (PO duyệt). Version trên prod do MCP đặt, khác tên file — không đổi tên file.
-- Giữ nguyên: bộ đã cấp phát → CHO_THU_VE (nhận lại ở Tiếp nhận); bộ đã dùng lâm sàng → chỉ liệt kê.
-- Chu trình mới ở DONG_GOI được gán mã chu trình (Cycle QR) mới, thoi_gian_dong_goi = lúc thu hồi,
-- nạp lại vào phiếu mẻ ngay (rpc_cssd_me_add_quy_trinh chỉ yêu cầu bộ đang ở ĐÓNG GÓI, chưa gắn mẻ).

CREATE OR REPLACE FUNCTION public.rpc_cssd_me_thu_hoi(p_me_id uuid, p_mode text, p_actor_user_id uuid, p_nguoi_nhan_su_id uuid, p_type_id text, p_type_ten text, p_mo_ta text, p_ghi_chu text DEFAULT NULL::text, p_qc_json jsonb DEFAULT NULL::jsonb, p_ket_qua_bi boolean DEFAULT NULL::boolean, p_ket_qua_ci boolean DEFAULT NULL::boolean, p_nhiet_do numeric DEFAULT NULL::numeric, p_ap_suat numeric DEFAULT NULL::numeric, p_thoi_gian_chu_ky integer DEFAULT NULL::integer, p_chuong_trinh text DEFAULT NULL::text, p_co_implant boolean DEFAULT NULL::boolean, p_phuong_phap text DEFAULT NULL::text, p_trang_thai_bi text DEFAULT NULL::text, p_reporter_email text DEFAULT NULL::text, p_ma_qr text DEFAULT NULL::text, p_quy_trinh_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_now timestamptz := now();
  v_mode text := upper(btrim(coalesce(p_mode, '')));
  v_type_id text := btrim(coalesce(p_type_id, ''));
  v_batch_ids uuid[];
  v_dong_goi uuid;
  v_machine uuid;
  v_held boolean := false;
  v_n int;
  v_row record;
  v_new_id uuid;
  v_recalled jsonb := '[]'::jsonb;
  v_hold jsonb := '[]'::jsonb;
  v_listed jsonb := '[]'::jsonb;
  v_mo_ta text;
  v_attrs jsonb;
  v_incident uuid;
  v_created boolean := false;
  v_red boolean := false;
  v_loai uuid;
  v_ma_lo text;
  v_existing_attrs jsonb;
  v_batch_ma text := '';
  v_scope text;
  v_issued int := 0;
BEGIN
  IF v_mode NOT IN ('QC_FAIL', 'BI_DUONG') THEN
    RAISE EXCEPTION 'Chế độ thu hồi không hợp lệ.';
  END IF;
  IF v_type_id = '' THEN
    RAISE EXCEPTION 'Thiếu loại sự cố mẻ.';
  END IF;

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ tiệt khuẩn.';
  END IF;

  v_machine := v_me.thiet_bi_id;
  v_ma_lo := coalesce(v_me.ma_lo_tiet_khuan, '');

  IF v_mode = 'QC_FAIL' THEN
    v_batch_ids := ARRAY[p_me_id];
  ELSIF v_machine IS NULL THEN
    v_batch_ids := ARRAY[p_me_id];
  ELSE
    WITH machine_batches AS (
      SELECT
        id,
        coalesce(thoi_gian_bat_dau, tk_chot_nap_at, created_at) AS at,
        trang_thai_bi,
        ket_qua_bi
      FROM public.cssd_fact_lo_tiet_khuan
      WHERE thiet_bi_id = v_machine
        AND is_active = true
    ),
    anchor AS (
      SELECT * FROM machine_batches WHERE id = p_me_id
    ),
    last_am AS (
      SELECT mb.at, mb.id
      FROM machine_batches mb
      CROSS JOIN anchor a
      WHERE (
          mb.trang_thai_bi = 'AM'
          OR (mb.trang_thai_bi IS NULL AND mb.ket_qua_bi IS TRUE)
        )
        AND (mb.at, mb.id) < (a.at, a.id)
      ORDER BY mb.at DESC, mb.id DESC
      LIMIT 1
    )
    SELECT coalesce(array_agg(mb.id ORDER BY mb.at, mb.id), ARRAY[p_me_id])
    INTO v_batch_ids
    FROM machine_batches mb
    CROSS JOIN anchor a
    LEFT JOIN last_am la ON true
    WHERE (la.at IS NULL OR (mb.at, mb.id) > (la.at, la.id))
      AND (mb.at, mb.id) <= (a.at, a.id);
  END IF;

  IF v_batch_ids IS NULL OR cardinality(v_batch_ids) = 0 THEN
    v_batch_ids := ARRAY[p_me_id];
  END IF;

  PERFORM 1
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = ANY (v_batch_ids)
  ORDER BY id
  FOR UPDATE;

  UPDATE public.cssd_fact_lo_tiet_khuan AS m
  SET
    -- ME-10: không ghi đè ket_qua_test (giữ kết quả QC gốc; THU_HOI = quyết định quản lý rủi ro)
    trang_thai_me = CASE
      WHEN m.id = p_me_id AND v_mode = 'BI_DUONG' AND m.trang_thai_me = 'HOAN_THANH' THEN 'THU_HOI'
      WHEN m.id = p_me_id THEN 'QC_KHONG_DAT'
      ELSE 'THU_HOI'
    END,
    trang_thai_bi = CASE
      WHEN m.id = p_me_id AND v_mode = 'BI_DUONG' THEN 'DUONG'
      WHEN m.id = p_me_id AND p_qc_json IS NOT NULL THEN nullif(btrim(coalesce(p_trang_thai_bi, '')), '')
      ELSE m.trang_thai_bi
    END,
    ket_qua_bi = CASE
      WHEN m.id = p_me_id AND v_mode = 'BI_DUONG' THEN false
      WHEN m.id = p_me_id AND p_qc_json IS NOT NULL THEN p_ket_qua_bi
      ELSE m.ket_qua_bi
    END,
    ket_qua_ci = CASE
      WHEN m.id = p_me_id AND p_qc_json IS NOT NULL THEN p_ket_qua_ci
      ELSE m.ket_qua_ci
    END,
    nhiet_do = CASE
      WHEN m.id = p_me_id AND p_nhiet_do IS NOT NULL THEN p_nhiet_do
      ELSE m.nhiet_do
    END,
    ap_suat = CASE
      WHEN m.id = p_me_id AND p_ap_suat IS NOT NULL THEN p_ap_suat
      ELSE m.ap_suat
    END,
    thoi_gian_chu_ky = CASE
      WHEN m.id = p_me_id AND p_thoi_gian_chu_ky IS NOT NULL THEN p_thoi_gian_chu_ky
      ELSE m.thoi_gian_chu_ky
    END,
    chuong_trinh = CASE
      WHEN m.id = p_me_id AND nullif(btrim(coalesce(p_chuong_trinh, '')), '') IS NOT NULL
        THEN left(btrim(p_chuong_trinh), 80)
      ELSE m.chuong_trinh
    END,
    co_implant = CASE
      WHEN m.id = p_me_id AND p_qc_json IS NOT NULL THEN coalesce(p_co_implant, m.co_implant)
      ELSE m.co_implant
    END,
    phuong_phap = CASE
      WHEN m.id = p_me_id AND nullif(btrim(coalesce(p_phuong_phap, '')), '') IS NOT NULL THEN p_phuong_phap
      ELSE m.phuong_phap
    END,
    ghi_chu = CASE
      WHEN m.id = p_me_id AND p_ghi_chu IS NOT NULL THEN p_ghi_chu
      ELSE m.ghi_chu
    END,
    ghi_chu_qc = CASE
      WHEN m.id = p_me_id AND p_ghi_chu IS NOT NULL THEN p_ghi_chu
      ELSE m.ghi_chu_qc
    END,
    tk_qc_json = CASE
      WHEN m.id = p_me_id AND p_qc_json IS NOT NULL THEN coalesce(m.tk_qc_json, '{}'::jsonb) || p_qc_json
      ELSE m.tk_qc_json
    END,
    nguoi_ket_thuc_id = CASE
      WHEN m.id = p_me_id THEN coalesce(m.nguoi_ket_thuc_id, p_actor_user_id)
      ELSE m.nguoi_ket_thuc_id
    END,
    updated_at = v_now
  WHERE m.id = ANY (v_batch_ids);

  -- PO 2026-10-10: mẻ hỏng (QC không đạt / BI dương) → bộ còn trong CSSD quay về ĐÓNG GÓI
  -- (đóng gói + tiệt khuẩn lại), không về TIẾP NHẬN. Bộ đã cấp phát vẫn chờ thu về rồi nhận lại ở Tiếp nhận.
  SELECT t.id INTO v_dong_goi
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'DONG_GOI' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_dong_goi IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm ĐÓNG GÓI.';
  END IF;

  FOR v_row IN
    SELECT
      q.id,
      q.lo_tiet_khuan_id,
      q.ma_qr_quy_trinh,
      q.ma_qr_bo_vinh_vien,
      q.bo_dung_cu_id,
      q.ma_vai_tro_bo,
      q.quy_trinh_cha_id,
      q.suds_count,
      q.khoa_nhan_id,
      q.thoi_gian_cap_phat,
      nullif(btrim(q.metadata ->> 'ma_ca_mo_id'), '') AS ma_ca_mo,
      coalesce((q.metadata ->> 'used_clinically')::boolean, false) AS used_clinically,
      nullif(btrim(q.metadata ->> 'used_clinically_at'), '') AS used_at,
      nullif(btrim(q.metadata ->> 'used_clinically_by'), '') AS used_by,
      coalesce(nullif(btrim(b.ma_bo), ''), nullif(btrim(q.ma_qr_quy_trinh), ''), q.id::text) AS ma_bo,
      coalesce(nullif(btrim(b.ten_bo), ''), '—') AS ten_bo,
      coalesce(m.ma_lo_tiet_khuan, '') AS ma_lo,
      coalesce(nullif(btrim(k.ten_khoa), ''), '') AS khoa_ten
    FROM public.cssd_fact_quy_trinh q
    JOIN public.cssd_fact_lo_tiet_khuan m ON m.id = q.lo_tiet_khuan_id
    LEFT JOIN public.cssd_dm_bo_dung_cu b ON b.id = q.bo_dung_cu_id
    LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = q.khoa_nhan_id
    WHERE q.lo_tiet_khuan_id = ANY (v_batch_ids)
      AND q.is_active = true
    ORDER BY q.id
    FOR UPDATE OF q
  LOOP
    -- Domain 23 A / M-23: đã dùng lâm sàng → chỉ liệt kê.
    IF v_row.used_clinically IS TRUE
       AND v_row.used_at IS NOT NULL
       AND v_row.used_by IS NOT NULL THEN
      v_listed := v_listed || jsonb_build_array(jsonb_build_object(
        'quy_trinh_id', v_row.id,
        'ma_bo', v_row.ma_bo,
        'ten_bo', v_row.ten_bo,
        'ma_lo', v_row.ma_lo,
        'lo_id', v_row.lo_tiet_khuan_id,
        'khoa_nhan_id', v_row.khoa_nhan_id,
        'khoa_ten', v_row.khoa_ten,
        'ma_ca_mo_id', v_row.ma_ca_mo,
        'used_clinically', true,
        'used_clinically_at', v_row.used_at,
        'used_clinically_by', v_row.used_by,
        'trang_thai', 'USED'
      ));
      CONTINUE;
    END IF;

    -- SC-01: đã cấp phát (có thoi_gian_cap_phat) → chờ thu về, không mở vòng mới.
    IF v_row.thoi_gian_cap_phat IS NOT NULL THEN
      v_issued := v_issued + 1;
      UPDATE public.cssd_fact_quy_trinh
      SET
        is_dong_bang = true,
        updated_at = v_now,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'thu_hoi', jsonb_build_object(
            'su_co_id', null,
            'khoa_nhan_id', v_row.khoa_nhan_id,
            'thoi_gian_cap_phat', to_char(v_row.thoi_gian_cap_phat AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'trang_thai', 'CHO_THU_VE',
            'ma_lo', v_row.ma_lo
          )
        )
      WHERE id = v_row.id
        AND is_active = true;

      v_hold := v_hold || jsonb_build_array(jsonb_build_object(
        'quy_trinh_id', v_row.id,
        'ma_bo', v_row.ma_bo,
        'ten_bo', v_row.ten_bo,
        'ma_lo', v_row.ma_lo,
        'lo_id', v_row.lo_tiet_khuan_id,
        'khoa_nhan_id', v_row.khoa_nhan_id,
        'khoa_ten', v_row.khoa_ten,
        'thoi_gian_cap_phat', to_char(v_row.thoi_gian_cap_phat AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'trang_thai', 'CHO_THU_VE'
      ));
      CONTINUE;
    END IF;

    -- Còn trong CSSD → chu trình mới ở DONG_GOI ngay (gán mã chu trình mới).
    INSERT INTO public.cssd_fact_quy_trinh (
      ma_qr_quy_trinh,
      ma_qr_bo_vinh_vien,
      bo_dung_cu_id,
      tram_hien_tai_id,
      suds_count,
      tinh_trang,
      is_dong_bang,
      is_active,
      ma_vai_tro_bo,
      quy_trinh_cha_id,
      created_at,
      updated_at,
      thoi_gian_dong_goi
    ) VALUES (
      v_row.ma_qr_quy_trinh,
      v_row.ma_qr_bo_vinh_vien,
      v_row.bo_dung_cu_id,
      v_dong_goi,
      coalesce(v_row.suds_count, 0) + 1,
      'BINH_THUONG',
      false,
      true,
      coalesce(nullif(btrim(v_row.ma_vai_tro_bo), ''), 'DON'),
      v_row.quy_trinh_cha_id,
      v_now,
      v_now,
      v_now
    )
    RETURNING id INTO v_new_id;

    PERFORM public.rpc_cssd_assign_cycle_qr_impl(v_new_id);

    UPDATE public.cssd_fact_quy_trinh
    SET
      is_active = false,
      is_dong_bang = true,
      updated_at = v_now,
      metadata = jsonb_set(
        coalesce(metadata, '{}'::jsonb),
        '{ngoai_le}',
        coalesce(metadata -> 'ngoai_le', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'su_kien', 'ME_THU_HOI_VE_DONG_GOI',
          'den_tram', 'DONG_GOI',
          'ly_do', 'Thu hồi mẻ ' || v_row.ma_lo || ' — chu kỳ cũ giữ liên kết mẻ',
          'nguoi_thao_tac', coalesce(p_reporter_email, 'CSSD'),
          'thoi_gian', to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )),
        true
      )
    WHERE id = v_row.id
      AND is_active = true;

    v_recalled := v_recalled || jsonb_build_array(jsonb_build_object(
      'quy_trinh_id', v_row.id,
      'new_quy_trinh_id', v_new_id,
      'ma_bo', v_row.ma_bo,
      'ten_bo', v_row.ten_bo,
      'ma_lo', v_row.ma_lo,
      'lo_id', v_row.lo_tiet_khuan_id,
      'trang_thai', 'MOVED'
    ));
  END LOOP;

  IF v_machine IS NOT NULL THEN
    UPDATE public.cssd_dm_thiet_bi
    SET trang_thai = 'HOLD_QC', updated_at = v_now
    WHERE id = v_machine
      AND (
        trang_thai IS NULL
        OR btrim(trang_thai) = ''
        OR upper(trang_thai) IN ('READY', 'HOAT_DONG')
      );
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_held := v_n = 1;
  END IF;

  SELECT coalesce(string_agg(coalesce(m.ma_lo_tiet_khuan, m.id::text), ', ' ORDER BY m.ma_lo_tiet_khuan), '')
  INTO v_batch_ma
  FROM public.cssd_fact_lo_tiet_khuan m
  WHERE m.id = ANY (v_batch_ids);

  v_scope := CASE
    WHEN cardinality(v_batch_ids) > 1 THEN 'MULTI_BATCH'
    ELSE 'BATCH'
  END;

  v_mo_ta := coalesce(p_mo_ta, '');
  IF jsonb_array_length(v_recalled) > 0 THEN
    v_mo_ta := v_mo_ta || E'\nThu hồi về Đóng gói (trong CSSD): ' || jsonb_array_length(v_recalled)::text || ' bộ.';
  END IF;
  IF jsonb_array_length(v_hold) > 0 THEN
    v_mo_ta := v_mo_ta || E'\nChờ thu về từ khoa: ' || jsonb_array_length(v_hold)::text || ' bộ.';
  END IF;
  IF jsonb_array_length(v_listed) > 0 THEN
    v_mo_ta := v_mo_ta || E'\nĐã dùng lâm sàng — theo dõi NB: ' || jsonb_array_length(v_listed)::text || ' bộ.';
  END IF;

  v_attrs := jsonb_build_object(
    'INCIDENT_GROUP', 'PROCESS',
    'INCIDENT_TYPE_LABEL', coalesce(nullif(btrim(p_type_ten), ''), v_type_id),
    'INCIDENT_TYPE_CODE', v_type_id,
    'INCIDENT_KIND', 'process_failure',
    'ROLLBACK_TARGET_STATION', 'DONG_GOI',
    'CAUSE_CLASS', 'SC_QUY_TRINH',
    'CAUSE_LABEL', 'Lỗi quy trình kỹ thuật',
    'LO_TIET_KHUAN_ID', p_me_id::text,
    'MA_LO', v_ma_lo,
    'BATCH_RECALL', '1',
    'BATCH_RECALL_COUNT', (coalesce(jsonb_array_length(v_recalled), 0) + coalesce(jsonb_array_length(v_hold), 0))::text,
    'MACHINE_HOLD_QC', CASE WHEN v_held THEN '1' ELSE '0' END,
    'RECALL_MOVED', v_recalled,
    'RECALL_HOLD_PENDING', v_hold,
    'RECALL_LISTED_USED', v_listed,
    'RECALL_BATCH_IDS', array_to_string(v_batch_ids, ','),
    'RECALL_BATCH_MA', v_batch_ma,
    'RECALL_SCOPE', v_scope,
    'RECALL_ISSUED_COUNT', v_issued::text,
    'RECALL_RETURNED_COUNT', '0',
    'RECALL_USED_COUNT', coalesce(jsonb_array_length(v_listed), 0)::text
  );
  IF v_machine IS NOT NULL THEN
    v_attrs := v_attrs || jsonb_build_object('MACHINE_ID', v_machine::text);
  END IF;
  IF nullif(btrim(coalesce(p_reporter_email, '')), '') IS NOT NULL THEN
    v_attrs := v_attrs || jsonb_build_object('REPORTER_EMAIL', btrim(p_reporter_email));
  END IF;
  IF p_actor_user_id IS NOT NULL THEN
    v_attrs := v_attrs || jsonb_build_object('REPORTER_AUTH_USER_ID', p_actor_user_id::text);
  END IF;

  IF p_quy_trinh_id IS NOT NULL THEN
    SELECT count(*) >= 3 INTO v_red
    FROM public.cssd_fact_su_co sc
    WHERE sc.quy_trinh_id = p_quy_trinh_id
      AND public.cssd_su_co_counts_for_red_alert(sc.is_active, sc.attributes, true);
  END IF;

  SELECT id INTO v_loai
  FROM public.sys_lookup_value
  WHERE category_type = 'LOAI_SU_CO'
    AND code = 'SC_QUY_TRINH'
    AND is_active = true
  LIMIT 1;

  SELECT s.id, s.attributes INTO v_incident, v_existing_attrs
  FROM public.cssd_fact_su_co s
  WHERE s.is_active = true
    AND s.attributes ->> 'LO_TIET_KHUAN_ID' = p_me_id::text
    AND s.attributes ->> 'INCIDENT_TYPE_CODE' = v_type_id
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_incident IS NOT NULL THEN
    -- SC-07: gộp, không ghi đè trạng thái / người phát hiện.
    v_attrs := coalesce(v_existing_attrs, '{}'::jsonb) || v_attrs;
    IF v_existing_attrs ? 'INCIDENT_STATUS' THEN
      v_attrs := jsonb_set(v_attrs, '{INCIDENT_STATUS}', v_existing_attrs -> 'INCIDENT_STATUS', true);
    END IF;
    IF v_existing_attrs ? 'INCIDENT_CONFIRMED_AT' THEN
      v_attrs := jsonb_set(v_attrs, '{INCIDENT_CONFIRMED_AT}', v_existing_attrs -> 'INCIDENT_CONFIRMED_AT', true);
    END IF;
    IF v_existing_attrs ? 'INCIDENT_CONFIRMED_BY_ID' THEN
      v_attrs := jsonb_set(v_attrs, '{INCIDENT_CONFIRMED_BY_ID}', v_existing_attrs -> 'INCIDENT_CONFIRMED_BY_ID', true);
    END IF;
    IF v_existing_attrs ? 'INCIDENT_CONFIRMED_BY_NAME' THEN
      v_attrs := jsonb_set(v_attrs, '{INCIDENT_CONFIRMED_BY_NAME}', v_existing_attrs -> 'INCIDENT_CONFIRMED_BY_NAME', true);
    END IF;
    IF v_existing_attrs ? 'NGUOI_PHAT_HIEN' THEN
      v_attrs := jsonb_set(v_attrs, '{NGUOI_PHAT_HIEN}', v_existing_attrs -> 'NGUOI_PHAT_HIEN', true);
    END IF;
    IF v_existing_attrs ? 'NGUOI_PHAT_HIEN_ID' THEN
      v_attrs := jsonb_set(v_attrs, '{NGUOI_PHAT_HIEN_ID}', v_existing_attrs -> 'NGUOI_PHAT_HIEN_ID', true);
    END IF;
    IF v_existing_attrs ? 'THOI_GIAN_PHAT_HIEN' THEN
      v_attrs := jsonb_set(v_attrs, '{THOI_GIAN_PHAT_HIEN}', v_existing_attrs -> 'THOI_GIAN_PHAT_HIEN', true);
    END IF;
    IF v_existing_attrs ? 'ANH_MINH_CHUNG' THEN
      v_attrs := jsonb_set(v_attrs, '{ANH_MINH_CHUNG}', v_existing_attrs -> 'ANH_MINH_CHUNG', true);
    END IF;
    UPDATE public.cssd_fact_su_co
    SET
      mo_ta = coalesce(mo_ta, '') || E'\n---\n' || v_mo_ta,
      attributes = v_attrs,
      is_red_alert = v_red,
      ma_tram_gay_loi = 'TIET_KHUAN',
      updated_at = v_now
    WHERE id = v_incident;
  ELSE
    INSERT INTO public.cssd_fact_su_co (
      ma_qr_quy_trinh,
      quy_trinh_id,
      ma_tram_phat_hien,
      mo_ta,
      is_red_alert,
      ma_tram_gay_loi,
      attributes,
      loai_su_co_id,
      nguoi_bao_id
    ) VALUES (
      nullif(btrim(coalesce(p_ma_qr, '')), ''),
      p_quy_trinh_id,
      'TIET_KHUAN',
      v_mo_ta,
      v_red,
      'TIET_KHUAN',
      v_attrs,
      v_loai,
      p_nguoi_nhan_su_id
    )
    RETURNING id INTO v_incident;
    v_created := true;
  END IF;

  -- Gắn su_co_id vào metadata thu_hoi của bộ chờ.
  UPDATE public.cssd_fact_quy_trinh q
  SET metadata = jsonb_set(
    coalesce(q.metadata, '{}'::jsonb),
    '{thu_hoi,su_co_id}',
    to_jsonb(v_incident::text),
    true
  )
  WHERE q.id IN (
    SELECT (x->>'quy_trinh_id')::uuid
    FROM jsonb_array_elements(v_hold) x
    WHERE nullif(x->>'quy_trinh_id', '') IS NOT NULL
  );

  RETURN jsonb_build_object(
    'ok', true,
    'incident_id', v_incident,
    'incident_created', v_created,
    'is_red_alert', v_red,
    'machine_held', v_held,
    'machine_id', v_machine,
    'recalled', v_recalled,
    'hold_pending', v_hold,
    'listed_used', v_listed,
    'batch_ids', to_jsonb(v_batch_ids),
    'recall_scope', v_scope
  );
END;
$function$;
