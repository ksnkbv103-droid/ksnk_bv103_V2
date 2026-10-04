-- S-A: sổ CSSD atomic.
-- SC1: tồn thực tế = (SELECT SUM) + (SELECT so_luong), không trộn aggregate.
-- SC2: rpc_cssd_commit_instrument_report — phiếu + sổ + metadata + ghi chú một transaction.
-- SC3: rpc_cssd_apply_instrument_lines — batch, idempotent theo su_co_id, gồm ngày kiểm kê.
-- SC4: trừ/cộng kho dự phòng bằng UPDATE ... SET cot = cot ± n trong cùng transaction với dòng sổ.
-- Không DROP bảng. Hàm nội bộ không GRANT cho anon/authenticated.

ALTER TABLE public.cssd_fact_kho_giao_dich
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.fn_cssd_set_thuc_te(
  p_bo_dung_cu_id uuid,
  p_loai_dung_cu_id uuid
) RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE((
    SELECT SUM(tx.so_luong_thay_doi)::integer
    FROM public.cssd_fact_kho_giao_dich tx
    WHERE tx.loai_dung_cu_id = p_loai_dung_cu_id
      AND tx.bo_dung_cu_id = p_bo_dung_cu_id
      AND tx.is_active = true
  ), 0)
  + COALESCE((
    SELECT ct.so_luong
    FROM public.cssd_dm_bo_dung_cu_chi_tiet ct
    WHERE ct.bo_dung_cu_id = p_bo_dung_cu_id
      AND ct.loai_dung_cu_id = p_loai_dung_cu_id
      AND ct.is_active = true
    LIMIT 1
  ), 0);
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_assert_ledger_write()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Chưa đăng nhập.';
    END IF;
    IF NOT (
      public.fn_sys_is_admin()
      OR public.fn_sys_has_permission('BAO_SU_CO', 'create')
      OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
    ) THEN
      RAISE EXCEPTION 'Không đủ quyền ghi sổ dụng cụ.';
    END IF;
  END IF;
END;
$$;

-- JWT: luôn lấy nhân sự từ auth.uid(). service_role: id do server truyền sau khi đã verifyPermission.
CREATE OR REPLACE FUNCTION public.fn_cssd_resolve_ledger_actor(p_fallback uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    SELECT ns.id INTO v_id
      FROM public.mdm_nhan_su ns
     WHERE ns.auth_user_id = auth.uid()
       AND ns.is_active = true
     LIMIT 1;
    RETURN v_id;
  END IF;
  RETURN p_fallback;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_append_chi_tiet_issue_note(
  p_chi_tiet_id uuid,
  p_issue_type text,
  p_note text,
  p_quantity integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_old text;
  v_total integer;
  v_qty integer;
  v_now text;
  v_line text;
  v_note text;
  v_next text;
BEGIN
  IF p_chi_tiet_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu id dụng cụ chi tiết.';
  END IF;
  IF p_issue_type NOT IN ('HONG', 'MAT') THEN
    RAISE EXCEPTION 'Loại ghi chú thành phần không hợp lệ.';
  END IF;

  SELECT COALESCE(ghi_chu, ''), GREATEST(1, COALESCE(so_luong, 1))
    INTO v_old, v_total
    FROM public.cssd_dm_bo_dung_cu_chi_tiet
   WHERE id = p_chi_tiet_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy dòng thành phần.';
  END IF;

  v_qty := GREATEST(1, COALESCE(p_quantity, v_total));
  v_now := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS');
  v_note := NULLIF(trim(COALESCE(p_note, '')), '');
  v_line := format('[%s] %s', p_issue_type, v_now);
  IF v_qty < v_total THEN
    v_line := v_line || format(' (SL %s/%s)', v_qty, v_total);
  END IF;
  IF v_note IS NOT NULL THEN
    v_line := v_line || ' - ' || v_note;
  END IF;
  IF length(trim(v_old)) = 0 THEN
    v_next := v_line;
  ELSE
    v_next := trim(v_old) || E'\n' || v_line;
  END IF;

  UPDATE public.cssd_dm_bo_dung_cu_chi_tiet
     SET ghi_chu = v_next,
         updated_at = now()
   WHERE id = p_chi_tiet_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_ensure_bom_lines(p_quy_trinh_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_meta jsonb;
  v_bo uuid;
  v_lines jsonb;
BEGIN
  SELECT COALESCE(metadata, '{}'::jsonb), bo_dung_cu_id
    INTO v_meta, v_bo
    FROM public.cssd_fact_quy_trinh
   WHERE id = p_quy_trinh_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy quy trình.';
  END IF;

  v_lines := v_meta->'bom_lines';
  IF jsonb_typeof(v_lines) = 'array' AND jsonb_array_length(v_lines) > 0 THEN
    RETURN;
  END IF;
  IF v_bo IS NULL THEN
    RAISE EXCEPTION 'Chưa gán bộ dụng cụ — không có khuôn mẫu cấu phần.';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'line_key', c.id::text,
      'chi_tiet_id', c.id::text,
      'ten_dung_cu_le', COALESCE(NULLIF(trim(c.ten_dung_cu_le), ''), '—'),
      'so_luong_ke_hoach', COALESCE(c.so_luong, 1),
      'so_luong_thuc_te', COALESCE(c.so_luong, 1)
    ) ORDER BY c.created_at, c.id
  ), '[]'::jsonb)
    INTO v_lines
    FROM public.cssd_dm_bo_dung_cu_chi_tiet c
   WHERE c.bo_dung_cu_id = v_bo
     AND c.is_active = true;

  IF v_lines = '[]'::jsonb THEN
    RETURN;
  END IF;

  UPDATE public.cssd_fact_quy_trinh
     SET metadata = jsonb_set(v_meta, '{bom_lines}', v_lines, true),
         updated_at = now()
   WHERE id = p_quy_trinh_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_transfer_bom_metadata(
  p_tu_id uuid,
  p_den_id uuid,
  p_ten text,
  p_qty integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_tu_meta jsonb;
  v_den_meta jsonb;
  v_tu_lines jsonb;
  v_den_lines jsonb;
  v_line jsonb;
  v_idx integer := 0;
  v_found boolean := false;
  v_thuc integer;
  v_den_idx integer := 0;
  v_den_found boolean := false;
  v_new jsonb;
  v_ten text := trim(COALESCE(p_ten, ''));
BEGIN
  IF v_ten = '' OR COALESCE(p_qty, 0) < 1 THEN
    RAISE EXCEPTION 'Thiếu tên cấu phần hoặc số lượng không hợp lệ.';
  END IF;

  PERFORM public.fn_cssd_ensure_bom_lines(p_tu_id);
  PERFORM public.fn_cssd_ensure_bom_lines(p_den_id);

  SELECT COALESCE(metadata, '{}'::jsonb) INTO v_tu_meta
    FROM public.cssd_fact_quy_trinh WHERE id = p_tu_id FOR UPDATE;
  SELECT COALESCE(metadata, '{}'::jsonb) INTO v_den_meta
    FROM public.cssd_fact_quy_trinh WHERE id = p_den_id FOR UPDATE;

  v_tu_lines := COALESCE(v_tu_meta->'bom_lines', '[]'::jsonb);
  v_den_lines := COALESCE(v_den_meta->'bom_lines', '[]'::jsonb);
  IF jsonb_typeof(v_tu_lines) IS DISTINCT FROM 'array' THEN
    v_tu_lines := '[]'::jsonb;
  END IF;
  IF jsonb_typeof(v_den_lines) IS DISTINCT FROM 'array' THEN
    v_den_lines := '[]'::jsonb;
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(v_tu_lines)
  LOOP
    IF v_line->>'ten_dung_cu_le' = v_ten THEN
      v_found := true;
      EXIT;
    END IF;
    v_idx := v_idx + 1;
  END LOOP;
  IF NOT v_found THEN
    RAISE EXCEPTION 'Không tìm thấy cấu phần trên bộ nguồn.';
  END IF;

  v_thuc := COALESCE((v_tu_lines->v_idx->>'so_luong_thuc_te')::numeric, 0)::integer;
  IF v_thuc < p_qty THEN
    RAISE EXCEPTION 'Không đủ số lượng thực tế trên nguồn (còn %).', v_thuc;
  END IF;
  v_tu_lines := jsonb_set(
    v_tu_lines,
    ARRAY[v_idx::text, 'so_luong_thuc_te'],
    to_jsonb(v_thuc - p_qty),
    false
  );

  FOR v_line IN SELECT value FROM jsonb_array_elements(v_den_lines)
  LOOP
    IF v_line->>'ten_dung_cu_le' = v_ten THEN
      v_den_found := true;
      EXIT;
    END IF;
    v_den_idx := v_den_idx + 1;
  END LOOP;

  IF v_den_found THEN
    v_thuc := COALESCE((v_den_lines->v_den_idx->>'so_luong_thuc_te')::numeric, 0)::integer;
    v_den_lines := jsonb_set(
      v_den_lines,
      ARRAY[v_den_idx::text, 'so_luong_thuc_te'],
      to_jsonb(v_thuc + p_qty),
      false
    );
  ELSE
    v_new := jsonb_set(v_tu_lines->v_idx, '{so_luong_thuc_te}', to_jsonb(p_qty), false);
    v_den_lines := v_den_lines || jsonb_build_array(v_new);
  END IF;

  UPDATE public.cssd_fact_quy_trinh
     SET metadata = jsonb_set(v_tu_meta, '{bom_lines}', v_tu_lines, true),
         updated_at = now()
   WHERE id = p_tu_id;
  UPDATE public.cssd_fact_quy_trinh
     SET metadata = jsonb_set(v_den_meta, '{bom_lines}', v_den_lines, true),
         updated_at = now()
   WHERE id = p_den_id;
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

CREATE OR REPLACE FUNCTION public.fn_cssd_apply_instrument_lines_tx(
  p_lines jsonb,
  p_su_co_id uuid,
  p_bo_dung_cu_id uuid,
  p_touch_ngay_kiem_ke boolean,
  p_attributes jsonb,
  p_nguoi_thuc_hien_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_attrs jsonb;
  v_line jsonb;
  v_did boolean := false;
  v_chi uuid;
  v_ma text;
  v_goc text;
  v_loai uuid;
  v_bo uuid;
  v_qt uuid;
  v_den uuid;
BEGIN
  IF p_su_co_id IS NOT NULL THEN
    SELECT attributes INTO v_attrs
      FROM public.cssd_fact_su_co
     WHERE id = p_su_co_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy phiếu sự cố.';
    END IF;
    IF COALESCE(v_attrs->>'CSSD_LEDGER_APPLIED', '') = '1'
       OR EXISTS (
         SELECT 1
           FROM public.cssd_fact_kho_giao_dich g
          WHERE g.su_co_id = p_su_co_id
            AND g.is_active = true
       ) THEN
      RETURN jsonb_build_object('idempotent', true);
    END IF;
  END IF;

  FOR v_line IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_lines, '[]'::jsonb))
  LOOP
    IF v_line ? 'chi_tiet_id'
       AND NULLIF(v_line->>'chi_tiet_id', '') IS NOT NULL
       AND v_line ? 'ma_khac' THEN
      v_ma := COALESCE(v_line->>'ma_khac', '');
      v_goc := COALESCE(v_line->>'ma_khac_goc', '');
      IF v_ma IS DISTINCT FROM v_goc THEN
        v_chi := (v_line->>'chi_tiet_id')::uuid;
        UPDATE public.cssd_dm_bo_dung_cu_chi_tiet
           SET specs = COALESCE(specs, '{}'::jsonb) || jsonb_build_object(
                 'ma_khac', v_ma,
                 'co_ma_khac', v_ma <> ''
               ),
               updated_at = now()
         WHERE id = v_chi;
        v_did := true;
      END IF;
    END IF;

    IF COALESCE((v_line->>'skip_ledger')::boolean, false) THEN
      CONTINUE;
    END IF;
    IF NULLIF(v_line->>'loai_giao_dich', '') IS NULL THEN
      CONTINUE;
    END IF;

    v_loai := NULLIF(v_line->>'loai_dung_cu_id', '')::uuid;
    v_bo := NULLIF(v_line->>'bo_dung_cu_id', '')::uuid;
    v_qt := NULLIF(v_line->>'quy_trinh_id', '')::uuid;
    v_den := NULLIF(v_line->>'bo_dung_cu_id_den', '')::uuid;
    v_chi := NULLIF(v_line->>'chi_tiet_id', '')::uuid;

    PERFORM public.fn_cssd_apply_instrument_ledger_tx(
      p_su_co_id,
      v_loai,
      v_bo,
      v_qt,
      v_line->>'loai_giao_dich',
      NULLIF(v_line->>'so_luong_thay_doi', '')::integer,
      v_line->>'ghi_chu',
      v_den,
      p_nguoi_thuc_hien_id,
      v_chi,
      NULLIF(v_line->>'issue_type', ''),
      NULLIF(v_line->>'ten_dung_cu_le', ''),
      NULLIF(v_line->>'ma_qr_nguon', ''),
      NULLIF(v_line->>'ma_qr_den', '')
    );
    v_did := true;
  END LOOP;

  IF p_su_co_id IS NOT NULL
     AND (v_did OR p_touch_ngay_kiem_ke OR p_attributes IS NOT NULL) THEN
    UPDATE public.cssd_fact_su_co
       SET attributes = COALESCE(p_attributes, attributes) || jsonb_build_object('CSSD_LEDGER_APPLIED', '1'),
           updated_at = now()
     WHERE id = p_su_co_id;
  END IF;

  IF COALESCE(p_touch_ngay_kiem_ke, false) AND p_bo_dung_cu_id IS NOT NULL THEN
    UPDATE public.cssd_dm_bo_dung_cu
       SET ngay_kiem_ke_gan_nhat = now(),
           updated_at = now()
     WHERE id = p_bo_dung_cu_id;
  END IF;

  RETURN jsonb_build_object('idempotent', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cssd_apply_instrument_ledger(
  p_su_co_id uuid,
  p_loai_dung_cu_id uuid,
  p_bo_dung_cu_id uuid,
  p_quy_trinh_id uuid,
  p_loai_giao_dich text,
  p_so_luong_thay_doi integer,
  p_ghi_chu text DEFAULT NULL::text,
  p_bo_dung_cu_id_den uuid DEFAULT NULL::uuid,
  p_nguoi_thuc_hien_id uuid DEFAULT NULL::uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  PERFORM public.fn_cssd_assert_ledger_write();
  v_actor := public.fn_cssd_resolve_ledger_actor(p_nguoi_thuc_hien_id);
  PERFORM public.fn_cssd_apply_instrument_ledger_tx(
    p_su_co_id,
    p_loai_dung_cu_id,
    p_bo_dung_cu_id,
    p_quy_trinh_id,
    p_loai_giao_dich,
    p_so_luong_thay_doi,
    p_ghi_chu,
    p_bo_dung_cu_id_den,
    v_actor,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  );
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cssd_apply_instrument_lines(
  p_lines jsonb,
  p_su_co_id uuid,
  p_bo_dung_cu_id uuid DEFAULT NULL::uuid,
  p_touch_ngay_kiem_ke boolean DEFAULT false,
  p_attributes jsonb DEFAULT NULL::jsonb,
  p_nguoi_thuc_hien_id uuid DEFAULT NULL::uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_actor uuid;
  v_applied jsonb;
BEGIN
  PERFORM public.fn_cssd_assert_ledger_write();
  v_actor := public.fn_cssd_resolve_ledger_actor(p_nguoi_thuc_hien_id);
  v_applied := public.fn_cssd_apply_instrument_lines_tx(
    p_lines,
    p_su_co_id,
    p_bo_dung_cu_id,
    COALESCE(p_touch_ngay_kiem_ke, false),
    p_attributes,
    v_actor
  );
  RETURN json_build_object(
    'success', true,
    'su_co_id', p_su_co_id,
    'idempotent', COALESCE((v_applied->>'idempotent')::boolean, false)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cssd_commit_instrument_report(
  p_draft_id uuid,
  p_su_co jsonb,
  p_lines jsonb,
  p_bo_dung_cu_id uuid DEFAULT NULL::uuid,
  p_touch_ngay_kiem_ke boolean DEFAULT false,
  p_nguoi_thuc_hien_id uuid DEFAULT NULL::uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id uuid;
  v_attrs jsonb;
  v_actor uuid;
  v_applied jsonb;
  v_payload jsonb := COALESCE(p_su_co, '{}'::jsonb);
BEGIN
  PERFORM public.fn_cssd_assert_ledger_write();
  v_actor := public.fn_cssd_resolve_ledger_actor(p_nguoi_thuc_hien_id);

  IF p_draft_id IS NOT NULL THEN
    SELECT attributes INTO v_attrs
      FROM public.cssd_fact_su_co
     WHERE id = p_draft_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy phiếu nháp để gửi.';
    END IF;
    IF COALESCE(v_attrs->>'CSSD_LEDGER_APPLIED', '') = '1'
       OR EXISTS (
         SELECT 1 FROM public.cssd_fact_kho_giao_dich g
          WHERE g.su_co_id = p_draft_id AND g.is_active = true
       ) THEN
      RETURN json_build_object('success', true, 'idempotent', true, 'su_co_id', p_draft_id);
    END IF;

    UPDATE public.cssd_fact_su_co
       SET ma_qr_quy_trinh = NULLIF(v_payload->>'ma_qr_quy_trinh', ''),
           ma_tram_phat_hien = COALESCE(NULLIF(v_payload->>'ma_tram_phat_hien', ''), ma_tram_phat_hien),
           mo_ta = v_payload->>'mo_ta',
           is_red_alert = COALESCE((v_payload->>'is_red_alert')::boolean, false),
           ma_tram_gay_loi = NULLIF(v_payload->>'ma_tram_gay_loi', ''),
           attributes = COALESCE(v_payload->'attributes', attributes),
           quy_trinh_id = NULLIF(v_payload->>'quy_trinh_id', '')::uuid,
           loai_su_co_id = NULLIF(v_payload->>'loai_su_co_id', '')::uuid,
           nguoi_bao_id = NULLIF(v_payload->>'nguoi_bao_id', '')::uuid,
           updated_at = now()
     WHERE id = p_draft_id;
    v_id := p_draft_id;
  ELSE
    INSERT INTO public.cssd_fact_su_co (
      ma_qr_quy_trinh, ma_tram_phat_hien, mo_ta, is_red_alert, ma_tram_gay_loi,
      attributes, quy_trinh_id, loai_su_co_id, nguoi_bao_id
    ) VALUES (
      NULLIF(v_payload->>'ma_qr_quy_trinh', ''),
      COALESCE(NULLIF(v_payload->>'ma_tram_phat_hien', ''), 'KHAC'),
      v_payload->>'mo_ta',
      COALESCE((v_payload->>'is_red_alert')::boolean, false),
      NULLIF(v_payload->>'ma_tram_gay_loi', ''),
      COALESCE(v_payload->'attributes', '{}'::jsonb),
      NULLIF(v_payload->>'quy_trinh_id', '')::uuid,
      NULLIF(v_payload->>'loai_su_co_id', '')::uuid,
      NULLIF(v_payload->>'nguoi_bao_id', '')::uuid
    )
    RETURNING id INTO v_id;
  END IF;

  v_applied := public.fn_cssd_apply_instrument_lines_tx(
    p_lines,
    v_id,
    p_bo_dung_cu_id,
    COALESCE(p_touch_ngay_kiem_ke, false),
    COALESCE(v_payload->'attributes', NULL),
    v_actor
  );

  RETURN json_build_object(
    'success', true,
    'su_co_id', v_id,
    'idempotent', COALESCE((v_applied->>'idempotent')::boolean, false)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_set_thuc_te(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cssd_assert_ledger_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cssd_resolve_ledger_actor(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cssd_append_chi_tiet_issue_note(uuid, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cssd_ensure_bom_lines(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cssd_transfer_bom_metadata(uuid, uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cssd_apply_instrument_ledger_tx(uuid, uuid, uuid, uuid, text, integer, text, uuid, uuid, uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cssd_apply_instrument_lines_tx(jsonb, uuid, uuid, boolean, jsonb, uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.rpc_cssd_apply_instrument_lines(jsonb, uuid, uuid, boolean, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_cssd_commit_instrument_report(uuid, jsonb, jsonb, uuid, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_apply_instrument_ledger(uuid, uuid, uuid, uuid, text, integer, text, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_apply_instrument_lines(jsonb, uuid, uuid, boolean, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_commit_instrument_report(uuid, jsonb, jsonb, uuid, boolean, uuid) TO authenticated, service_role;
