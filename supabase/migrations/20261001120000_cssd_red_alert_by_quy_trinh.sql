-- S-F2: cờ đỏ kho theo quy_trinh_id của phiếu còn hiệu lực.
-- Cùng luật countsTowardCssdSafetyTally: is_active, không nháp, không luân chuyển.
-- Không khớp ma_qr (mã bộ dùng chung mọi chu kỳ). File only — chưa apply.

CREATE OR REPLACE FUNCTION public.cssd_su_co_counts_for_red_alert(
  p_is_active boolean,
  p_attributes jsonb,
  p_include_draft boolean DEFAULT false
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_is_active IS DISTINCT FROM false
    AND upper(btrim(coalesce(
      p_attributes ->> 'INCIDENT_TYPE_CODE',
      p_attributes ->> 'incident_type_code',
      ''
    ))) NOT IN (
      'INSTRUMENT_MOVE',
      'INSTRUMENT_TRANSFER',
      'INSTRUMENT_REPLENISH',
      'INSTRUMENT_RETURN_KHO'
    )
    AND (
      p_include_draft
      OR upper(btrim(coalesce(
        p_attributes ->> 'SET_RECONCILE_STATUS',
        p_attributes ->> 'set_reconcile_status',
        ''
      ))) IS DISTINCT FROM 'DRAFT'
    );
$$;

COMMENT ON FUNCTION public.cssd_su_co_counts_for_red_alert(boolean, jsonb, boolean) IS
  'S-F2: phiếu sự cố còn hiệu lực cho cờ đỏ (active, không luân chuyển; nháp chỉ khi p_include_draft).';

REVOKE ALL ON FUNCTION public.cssd_su_co_counts_for_red_alert(boolean, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cssd_su_co_counts_for_red_alert(boolean, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cssd_su_co_counts_for_red_alert(boolean, jsonb, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_station_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      q.id,
      t.ma_tram AS ma_trang_thai,
      q.tinh_trang,
      COALESCE(q.is_red_alert, false) AS is_red_alert,
      NULLIF(btrim(q.metadata ->> 'ma_ca_mo_id'), '') AS ma_ca_mo_id,
      (q.han_su_dung AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS han_ymd
    FROM public.cssd_fact_quy_trinh q
    LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
    WHERE q.is_active = true
  ),
  red AS (
    SELECT DISTINCT sc.quy_trinh_id
    FROM public.cssd_fact_su_co sc
    WHERE sc.is_red_alert = true
      AND sc.quy_trinh_id IS NOT NULL
      AND public.cssd_su_co_counts_for_red_alert(sc.is_active, sc.attributes, false)
  ),
  today_vn AS (
    SELECT (timezone('Asia/Ho_Chi_Minh', now()))::date AS d
  )
  SELECT jsonb_build_object(
    'dang_xu_ly', count(*) FILTER (
      WHERE ma_trang_thai IN ('LAM_SACH', 'QC', 'DONG_GOI', 'TIET_KHUAN')
    ),
    'san_sang', count(*) FILTER (
      WHERE ma_trang_thai = 'CAP_PHAT' AND ma_ca_mo_id IS NULL
    ),
    'da_cap', count(*) FILTER (
      WHERE ma_trang_thai = 'CAP_PHAT' AND ma_ca_mo_id IS NOT NULL
    ),
    'broken', count(*) FILTER (
      WHERE is_red_alert
         OR tinh_trang IN ('HONG', 'MAT')
         OR id IN (SELECT quy_trinh_id FROM red)
    ),
    'fefo_le_7d', count(*) FILTER (
      WHERE ma_trang_thai = 'CAP_PHAT'
        AND han_ymd IS NOT NULL
        AND han_ymd <= (SELECT d FROM today_vn) + 7
    ),
    'total_active', count(*)
  )
  FROM base;
$$;

COMMENT ON FUNCTION public.rpc_cssd_kho_station_counts() IS
  'Kho dụng cụ — chip đếm; cờ đỏ = phiếu còn hiệu lực theo quy_trinh_id (S-F2).';

GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_station_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_station_counts() TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_cssd_station_flow_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      q.id,
      t.ma_tram AS station,
      coalesce(q.is_dong_bang, false) AS is_dong_bang,
      coalesce(q.is_red_alert, false) AS is_red_alert
    FROM public.cssd_fact_quy_trinh q
    INNER JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
    WHERE q.is_active = true
      AND nullif(btrim(t.ma_tram), '') IS NOT NULL
  ),
  red AS (
    SELECT DISTINCT sc.quy_trinh_id
    FROM public.cssd_fact_su_co sc
    WHERE sc.is_red_alert = true
      AND sc.quy_trinh_id IS NOT NULL
      AND public.cssd_su_co_counts_for_red_alert(sc.is_active, sc.attributes, false)
  ),
  stations AS (
    SELECT unnest(ARRAY[
      'TIEP_NHAN',
      'LAM_SACH',
      'QC',
      'DONG_GOI',
      'TIET_KHUAN',
      'CAP_PHAT'
    ]::text[]) AS station
  ),
  agg AS (
    SELECT
      b.station,
      count(*)::int AS count,
      count(*) FILTER (
        WHERE b.is_red_alert OR b.id IN (SELECT quy_trinh_id FROM red)
      )::int AS red_alert_count,
      count(*) FILTER (WHERE b.is_dong_bang)::int AS frozen_count
    FROM base b
    GROUP BY b.station
  )
  SELECT jsonb_build_object(
    'cells',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'station', s.station,
            'count', coalesce(a.count, 0),
            'red_alert_count', coalesce(a.red_alert_count, 0),
            'frozen_count', coalesce(a.frozen_count, 0)
          )
          ORDER BY array_position(
            ARRAY[
              'TIEP_NHAN',
              'LAM_SACH',
              'QC',
              'DONG_GOI',
              'TIET_KHUAN',
              'CAP_PHAT'
            ]::text[],
            s.station
          )
        )
        FROM stations s
        LEFT JOIN agg a ON a.station = s.station
      ),
      '[]'::jsonb
    ),
    'red_alert_total', (SELECT coalesce(sum(a.red_alert_count), 0)::int FROM agg a),
    'frozen_total', (SELECT coalesce(sum(a.frozen_count), 0)::int FROM agg a)
  );
$$;

COMMENT ON FUNCTION public.rpc_cssd_station_flow_counts() IS
  'Đếm quy trình active theo trạm; cờ đỏ = phiếu còn hiệu lực theo quy_trinh_id (S-F2).';

GRANT EXECUTE ON FUNCTION public.rpc_cssd_station_flow_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_station_flow_counts() TO service_role;

UPDATE public.cssd_fact_quy_trinh q
SET
  is_red_alert = src.red,
  updated_at = now()
FROM (
  SELECT
    q2.id,
    EXISTS (
      SELECT 1
      FROM public.cssd_fact_su_co sc
      WHERE sc.quy_trinh_id = q2.id
        AND sc.is_red_alert = true
        AND public.cssd_su_co_counts_for_red_alert(sc.is_active, sc.attributes, false)
    ) AS red
  FROM public.cssd_fact_quy_trinh q2
) src
WHERE q.id = src.id
  AND q.is_red_alert IS DISTINCT FROM src.red;

-- Thu hồi mẻ: ngưỡng đỏ theo chu kỳ hiện tại, cùng lọc phiếu còn hiệu lực (kể cả nháp đang mở).
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_thu_hoi(
  p_me_id uuid,
  p_mode text,
  p_actor_user_id uuid,
  p_nguoi_nhan_su_id uuid,
  p_type_id text,
  p_type_ten text,
  p_mo_ta text,
  p_ghi_chu text DEFAULT NULL,
  p_qc_json jsonb DEFAULT NULL,
  p_ket_qua_bi boolean DEFAULT NULL,
  p_ket_qua_ci boolean DEFAULT NULL,
  p_nhiet_do numeric DEFAULT NULL,
  p_ap_suat numeric DEFAULT NULL,
  p_thoi_gian_chu_ky integer DEFAULT NULL,
  p_chuong_trinh text DEFAULT NULL,
  p_co_implant boolean DEFAULT NULL,
  p_phuong_phap text DEFAULT NULL,
  p_trang_thai_bi text DEFAULT NULL,
  p_reporter_email text DEFAULT NULL,
  p_ma_qr text DEFAULT NULL,
  p_quy_trinh_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_now timestamptz := now();
  v_mode text := upper(btrim(coalesce(p_mode, '')));
  v_type_id text := btrim(coalesce(p_type_id, ''));
  v_batch_ids uuid[];
  v_tiep_nhan uuid;
  v_machine uuid;
  v_held boolean := false;
  v_n int;
  v_row record;
  v_new_id uuid;
  v_recalled jsonb := '[]'::jsonb;
  v_listed jsonb := '[]'::jsonb;
  v_moved_text text := '';
  v_listed_text text := '';
  v_mo_ta text;
  v_attrs jsonb;
  v_incident uuid;
  v_created boolean := false;
  v_red boolean := false;
  v_loai uuid;
  v_ma_lo text;
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
    -- Cùng luật selectBiRecallBatchIds: sau BI âm gần nhất, đến hết mẻ dương.
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
    ket_qua_test = false,
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

  SELECT t.id INTO v_tiep_nhan
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIEP_NHAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_tiep_nhan IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm TIẾP NHẬN.';
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
      nullif(btrim(q.metadata ->> 'ma_ca_mo_id'), '') AS ma_ca_mo,
      coalesce((q.metadata ->> 'used_clinically')::boolean, false) AS used_clinically,
      nullif(btrim(q.metadata ->> 'used_clinically_at'), '') AS used_at,
      nullif(btrim(q.metadata ->> 'used_clinically_by'), '') AS used_by,
      coalesce(nullif(btrim(b.ma_bo), ''), nullif(btrim(q.ma_qr_quy_trinh), ''), q.id::text) AS ma_bo,
      coalesce(nullif(btrim(b.ten_bo), ''), '—') AS ten_bo,
      coalesce(m.ma_lo_tiet_khuan, '') AS ma_lo
    FROM public.cssd_fact_quy_trinh q
    JOIN public.cssd_fact_lo_tiet_khuan m ON m.id = q.lo_tiet_khuan_id
    LEFT JOIN public.cssd_dm_bo_dung_cu b ON b.id = q.bo_dung_cu_id
    WHERE q.lo_tiet_khuan_id = ANY (v_batch_ids)
      AND q.is_active = true
    ORDER BY q.id
    FOR UPDATE OF q
  LOOP
    -- Domain 23 A / M-23: listed used chỉ khi used_clinically + actor + timestamp (không invent từ ma_ca_mo).
    IF v_row.used_clinically IS TRUE
       AND v_row.used_at IS NOT NULL
       AND v_row.used_by IS NOT NULL THEN
      v_listed := v_listed || jsonb_build_array(jsonb_build_object(
        'quy_trinh_id', v_row.id,
        'ma_bo', v_row.ma_bo,
        'ten_bo', v_row.ten_bo,
        'ma_lo', v_row.ma_lo,
        'lo_id', v_row.lo_tiet_khuan_id,
        'ma_ca_mo_id', v_row.ma_ca_mo,
        'used_clinically', true,
        'used_clinically_at', v_row.used_at,
        'used_clinically_by', v_row.used_by
      ));
      CONTINUE;
    END IF;

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
      thoi_gian_tiep_nhan
    ) VALUES (
      v_row.ma_qr_quy_trinh,
      v_row.ma_qr_bo_vinh_vien,
      v_row.bo_dung_cu_id,
      v_tiep_nhan,
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

    UPDATE public.cssd_fact_quy_trinh
    SET
      is_active = false,
      is_dong_bang = true,
      updated_at = v_now,
      metadata = jsonb_set(
        coalesce(metadata, '{}'::jsonb),
        '{ngoai_le}',
        coalesce(metadata -> 'ngoai_le', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'su_kien', 'ME_THU_HOI_VE_TIEP_NHAN',
          'den_tram', 'TIEP_NHAN',
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
      'lo_id', v_row.lo_tiet_khuan_id
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

  SELECT coalesce(string_agg(x->>'ma_bo' || ' (' || x->>'ma_lo' || ')', ', '), '')
  INTO v_moved_text
  FROM jsonb_array_elements(v_recalled) x;

  SELECT coalesce(string_agg(x->>'ma_bo' || ' (' || x->>'ma_lo' || ', ca ' || x->>'ma_ca_mo_id' || ')', ', '), '')
  INTO v_listed_text
  FROM jsonb_array_elements(v_listed) x;

  v_mo_ta := coalesce(p_mo_ta, '');
  IF v_moved_text <> '' THEN
    v_mo_ta := v_mo_ta || E'\nThu hồi về Tiếp nhận: ' || v_moved_text || '.';
  END IF;
  IF v_listed_text <> '' THEN
    v_mo_ta := v_mo_ta || E'\nĐã dùng lâm sàng — không đổi trạng thái, KSNK đánh giá: ' || v_listed_text || '.';
  END IF;

  v_attrs := jsonb_build_object(
    'INCIDENT_GROUP', 'PROCESS',
    'INCIDENT_TYPE_LABEL', coalesce(nullif(btrim(p_type_ten), ''), v_type_id),
    'INCIDENT_TYPE_CODE', v_type_id,
    'INCIDENT_KIND', 'process_failure',
    'ROLLBACK_TARGET_STATION', 'TIEP_NHAN',
    'CAUSE_CLASS', 'SC_QUY_TRINH',
    'CAUSE_LABEL', 'Lỗi quy trình kỹ thuật',
    'LO_TIET_KHUAN_ID', p_me_id::text,
    'MA_LO', v_ma_lo,
    'BATCH_RECALL', '1',
    'BATCH_RECALL_COUNT', coalesce(jsonb_array_length(v_recalled), 0)::text,
    'MACHINE_HOLD_QC', CASE WHEN v_held THEN '1' ELSE '0' END,
    'RECALL_MOVED', v_moved_text,
    'RECALL_LISTED_USED', v_listed_text
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
    SELECT count(*) >= 2 INTO v_red
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

  SELECT s.id INTO v_incident
  FROM public.cssd_fact_su_co s
  WHERE s.is_active = true
    AND s.attributes ->> 'LO_TIET_KHUAN_ID' = p_me_id::text
    AND s.attributes ->> 'INCIDENT_TYPE_CODE' = v_type_id
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_incident IS NOT NULL THEN
    UPDATE public.cssd_fact_su_co
    SET
      mo_ta = v_mo_ta,
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

  RETURN jsonb_build_object(
    'ok', true,
    'incident_id', v_incident,
    'incident_created', v_created,
    'is_red_alert', v_red,
    'machine_held', v_held,
    'machine_id', v_machine,
    'recalled', v_recalled,
    'listed_used', v_listed,
    'batch_ids', to_jsonb(v_batch_ids)
  );
END;
$$;
