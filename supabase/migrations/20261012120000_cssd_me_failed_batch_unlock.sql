-- Lát CS-ME · Mẻ không đạt làm máy bị khóa mãi (sửa hệ quả ME-10, 20261010160000).
-- Lỗi: rpc_cssd_me_thu_hoi (ME-10) bỏ ghi ket_qua_test → mẻ hỏng gốc (QC_KHONG_DAT) để NULL,
-- nên điều kiện «mẻ mở» (ket_qua_test IS NULL) trong rpc_cssd_me_tao + uq_cssd_fact_lo_mo_mot_may
-- vẫn coi là mở: máy sau bảo trì về READY không tạo được mẻ mới.
-- Sửa:
--   (a) rpc_cssd_me_thu_hoi: ket_qua_test = coalesce(cũ, false) — mẻ đã đạt rồi thu hồi GIỮ true (ME-10),
--       mẻ chưa từng kết luận ghi false. Chỉ đổi một dòng trong UPDATE; phần còn lại giữ nguyên bản 20261010160000.
--   (b) Backfill QC_KHONG_DAT có ket_qua_test NULL → false.
--   (c) «Mẻ mở» = ket_qua_test NULL VÀ trang_thai_me không thuộc CHO_BI/HOAN_THANH/QC_KHONG_DAT/THU_HOI
--       (rpc_cssd_me_tao + chỉ mục unique). Điều kiện hẹp hơn cũ → không thể sinh vi phạm khi tạo lại chỉ mục.
-- Giữ: chữ ký, SECURITY INVOKER, search_path=public, EXECUTE chỉ postgres/service_role (SEC-1).

-- (a) -------------------------------------------------------------------------
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
    -- ME-10: mẻ đã đạt (ket_qua_test = true) rồi bị thu hồi → GIỮ true (THU_HOI = quyết định quản lý rủi ro).
    -- CS-ME: mẻ chưa từng có kết luận (NULL: QC không đạt, BI dương khi CHO_BI, mẻ CHO_BI trong cửa sổ) → false.
    ket_qua_test = coalesce(m.ket_qua_test, false),
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

-- (c) rpc_cssd_me_tao: điều kiện mẻ mở theo trang_thai_me --------------------
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_tao(p_thiet_bi_id uuid, p_actor_user_id uuid, p_ghi_chu text DEFAULT NULL::text, p_chuong_trinh text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tb public.cssd_dm_thiet_bi%ROWTYPE;
  v_pp text;
  v_token text;
  v_ddmmyy text;
  v_seq int;
  v_ma text;
  v_chuong text;
  v_today date;
  v_id uuid;
  v_open text;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;
  IF p_thiet_bi_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu máy tiệt khuẩn.';
  END IF;

  SELECT * INTO v_tb
  FROM public.cssd_dm_thiet_bi
  WHERE id = p_thiet_bi_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy thiết bị.';
  END IF;
  IF coalesce(v_tb.trang_thai, '') NOT IN ('READY', 'HOAT_DONG') THEN
    RAISE EXCEPTION 'Thiết bị không sẵn sàng. Không tạo mẻ.';
  END IF;

  v_pp := public.fn_cssd_me_phuong_phap(p_thiet_bi_id);
  IF v_pp IS NULL THEN
    RAISE EXCEPTION 'Chỉ máy tiệt khuẩn (hơi nước, plasma, EO) mới tạo được mẻ.';
  END IF;

  v_today := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  IF v_pp = 'HOI_NUOC' THEN
    IF coalesce(v_tb.specs->>'bd_dau_ngay_ymd', '') IS DISTINCT FROM to_char(v_today, 'YYYY-MM-DD')
       OR upper(coalesce(v_tb.specs->>'bd_dau_ngay_ket_qua', '')) IS DISTINCT FROM 'DAT' THEN
      RAISE EXCEPTION 'Máy hơi nước chưa có Bowie–Dick đầu ngày ĐẠT. Ghi BD đạt trước khi tạo mẻ.';
    END IF;
  END IF;

  SELECT ma_lo_tiet_khuan INTO v_open
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE thiet_bi_id = p_thiet_bi_id
    AND is_active = true
    AND ket_qua_test IS NULL
    AND coalesce(trang_thai_me, '') NOT IN ('CHO_BI', 'HOAN_THANH', 'QC_KHONG_DAT', 'THU_HOI')
  LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'Máy đang có mẻ chưa kết luận (%). Kết thúc mẻ đó trước khi tạo mẻ mới.', v_open;
  END IF;

  v_token := left(
    upper(regexp_replace(coalesce(nullif(btrim(v_tb.ma_thiet_bi), ''), nullif(btrim(v_tb.ten_thiet_bi), ''), 'MAY'), '[^A-Za-z0-9]+', '', 'g')),
    12
  );
  IF coalesce(v_token, '') = '' THEN
    v_token := 'MAY';
  END IF;
  v_ddmmyy := to_char(v_today, 'DDMMYY');
  SELECT count(*)::int INTO v_seq
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE thiet_bi_id = p_thiet_bi_id
    AND (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = v_today;
  v_seq := coalesce(v_seq, 0);
  LOOP
    v_seq := v_seq + 1;
    v_ma := v_token || '-' || v_ddmmyy || '-' || v_seq::text;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.cssd_fact_lo_tiet_khuan WHERE ma_lo_tiet_khuan = v_ma
    );
    IF v_seq > 500 THEN
      RAISE EXCEPTION 'Không sinh được mã mẻ.';
    END IF;
  END LOOP;

  v_chuong := nullif(left(btrim(coalesce(p_chuong_trinh, '')), 80), '');
  IF v_chuong IS NULL THEN
    SELECT nullif(left(btrim(chuong_trinh), 80), '') INTO v_chuong
    FROM public.cssd_fact_lo_tiet_khuan
    WHERE thiet_bi_id = p_thiet_bi_id
      AND nullif(btrim(chuong_trinh), '') IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  IF v_chuong IS NULL THEN
    v_chuong := nullif(left(btrim(coalesce(v_tb.specs->>'chuong_trinh', v_tb.specs->>'chuong_trinh_mac_dinh', '')), 80), '');
  END IF;

  INSERT INTO public.cssd_fact_lo_tiet_khuan (
    ma_lo_tiet_khuan, thiet_bi_id, loai_may_id, phuong_phap, chuong_trinh,
    ghi_chu, is_active, trang_thai_me, updated_at
  ) VALUES (
    v_ma, p_thiet_bi_id, v_tb.loai_may_id, v_pp, v_chuong,
    nullif(btrim(coalesce(p_ghi_chu, '')), ''), true, 'DANG_CHUAN_NAP', now()
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'ma_lo_tiet_khuan', v_ma,
    'phuong_phap', v_pp,
    'chuong_trinh', v_chuong,
    'loai_may_id', v_tb.loai_may_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_me_thu_hoi(uuid, text, uuid, uuid, text, text, text, text, jsonb, boolean, boolean, numeric, numeric, integer, text, boolean, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_thu_hoi(uuid, text, uuid, uuid, text, text, text, text, jsonb, boolean, boolean, numeric, numeric, integer, text, boolean, text, text, text, text, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_tao(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_tao(uuid, uuid, text, text) TO service_role;

-- (b) Backfill. Liệt kê trước khi sửa (local 2026-10-12: 1 dòng — TKHN3-121026-1):
--   SELECT id, ma_lo_tiet_khuan, thiet_bi_id, trang_thai_bi FROM public.cssd_fact_lo_tiet_khuan
--   WHERE trang_thai_me = 'QC_KHONG_DAT' AND ket_qua_test IS NULL;
DO $$
DECLARE v_n int;
BEGIN
  UPDATE public.cssd_fact_lo_tiet_khuan
  SET ket_qua_test = false, updated_at = now()
  WHERE trang_thai_me = 'QC_KHONG_DAT' AND ket_qua_test IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'CS-ME backfill QC_KHONG_DAT ket_qua_test NULL -> false: % dòng', v_n;
END $$;

-- (c) Chỉ mục: một mẻ mở mỗi máy, theo trang_thai_me ---------------------------
DROP INDEX IF EXISTS public.uq_cssd_fact_lo_mo_mot_may;
CREATE UNIQUE INDEX uq_cssd_fact_lo_mo_mot_may
  ON public.cssd_fact_lo_tiet_khuan (thiet_bi_id)
  WHERE is_active = true
    AND ket_qua_test IS NULL
    AND thiet_bi_id IS NOT NULL
    AND coalesce(trang_thai_me, '') NOT IN ('CHO_BI', 'HOAN_THANH', 'QC_KHONG_DAT', 'THU_HOI');

-- CHƯA APPLY PROD — chờ PO. (ME-10 20261010160000 đã apply prod 10/10 → prod có thể có mẻ kẹt.)
-- Kiểm prod TRƯỚC khi apply (chỉ đọc):
--   SELECT m.id, m.ma_lo_tiet_khuan, m.trang_thai_me, m.trang_thai_bi, m.updated_at,
--          tb.ten_thiet_bi, tb.trang_thai AS trang_thai_may
--   FROM public.cssd_fact_lo_tiet_khuan m
--   LEFT JOIN public.cssd_dm_thiet_bi tb ON tb.id = m.thiet_bi_id
--   WHERE m.is_active = true AND m.ket_qua_test IS NULL
--     AND m.trang_thai_me IN ('QC_KHONG_DAT', 'THU_HOI')
--   ORDER BY m.updated_at DESC;
-- Máy READY/HOAT_DONG/HOLD_QC đang bị chặn tạo mẻ bởi mẻ đã đóng:
--   SELECT tb.ten_thiet_bi, tb.trang_thai, m.ma_lo_tiet_khuan, m.trang_thai_me
--   FROM public.cssd_dm_thiet_bi tb
--   JOIN public.cssd_fact_lo_tiet_khuan m ON m.thiet_bi_id = tb.id AND m.is_active = true AND m.ket_qua_test IS NULL
--   WHERE tb.trang_thai IN ('READY', 'HOAT_DONG', 'HOLD_QC')
--     AND m.trang_thai_me IN ('HOAN_THANH', 'QC_KHONG_DAT', 'THU_HOI');
-- Sau apply: has_function_privilege('authenticated', 'public.rpc_cssd_me_tao(uuid,uuid,text,text)', 'EXECUTE') = false.
