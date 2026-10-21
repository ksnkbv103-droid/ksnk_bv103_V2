-- Lát KD-4: điều chuyển/kho dụng cụ — vá fn_cssd_apply_instrument_ledger_tx (giữ chữ ký, SECURITY DEFINER, search_path).
-- Giả định chốt (PO giao tự quyết 2026-10-21):
--   (1) DIEU_CHUYEN BẮT BUỘC có bộ đích (id hoặc QR ra bộ active, khác bộ nguồn) — thiếu đích thì lỗi rõ, không trừ nguồn.
--   (2) Tồn = fn_cssd_set_thuc_te (sổ giao dịch cộng dồn + baseline chi_tiet) — KHÔNG đổi mô hình ở lát này.
-- Sửa:
--   a) Khóa đua: pg_advisory_xact_lock theo khóa kho (bộ, loại) trước khi kiểm tồn; điều chuyển khóa cả nguồn và đích theo thứ tự cố định.
--   b) Dòng nguồn DIEU_CHUYEN luôn ghi -abs (dương thì đã tạo tồn từ không khí: nguồn + và đích +).
--   c) Chuyển cấu phần metadata.bom_lines theo id (chi_tiet_id / loai_dung_cu_id), không theo tên; dòng mới ở đích mang chi_tiet_id của bộ đích.
-- Nợ (không làm): baseline chi_tiet.so_luong đổi khi sửa danh mục làm lệch tồn; phân bổ khoa; rpc_cssd_persist_bom_checkpoint_impl ghi sổ không khóa/kiểm tồn.

CREATE OR REPLACE FUNCTION public.fn_cssd_kho_lock(p_bo_dung_cu_id uuid, p_loai_dung_cu_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_advisory_xact_lock(
    hashtextextended('cssd_kho:' || p_bo_dung_cu_id::text || ':' || p_loai_dung_cu_id::text, 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_transfer_bom_metadata_by_id(
  p_tu_id uuid, p_den_id uuid, p_loai_dung_cu_id uuid, p_chi_tiet_tu_id uuid, p_ten text, p_qty integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tu_meta jsonb;
  v_den_meta jsonb;
  v_den_bo uuid;
  v_tu_lines jsonb;
  v_den_lines jsonb;
  v_tu_idx integer;
  v_den_idx integer;
  v_thuc integer;
  v_den_chi uuid;
  v_ten text := NULLIF(trim(COALESCE(p_ten, '')), '');
  v_uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  IF p_loai_dung_cu_id IS NULL OR COALESCE(p_qty, 0) < 1 THEN
    RAISE EXCEPTION 'Thiếu loại dụng cụ hoặc số lượng không hợp lệ.';
  END IF;
  IF p_tu_id = p_den_id THEN
    RAISE EXCEPTION 'Quy trình nguồn và đích trùng nhau.';
  END IF;

  PERFORM public.fn_cssd_ensure_bom_lines(p_tu_id);
  PERFORM public.fn_cssd_ensure_bom_lines(p_den_id);

  SELECT COALESCE(metadata, '{}'::jsonb) INTO v_tu_meta
    FROM public.cssd_fact_quy_trinh WHERE id = p_tu_id FOR UPDATE;
  SELECT COALESCE(metadata, '{}'::jsonb), bo_dung_cu_id INTO v_den_meta, v_den_bo
    FROM public.cssd_fact_quy_trinh WHERE id = p_den_id FOR UPDATE;

  v_tu_lines := v_tu_meta->'bom_lines';
  v_den_lines := v_den_meta->'bom_lines';
  IF jsonb_typeof(v_tu_lines) IS DISTINCT FROM 'array' THEN v_tu_lines := '[]'::jsonb; END IF;
  IF jsonb_typeof(v_den_lines) IS DISTINCT FROM 'array' THEN v_den_lines := '[]'::jsonb; END IF;

  -- Nguồn: ưu tiên đúng chi_tiet_id; rồi dòng có chi_tiet cùng loại; tên chỉ dùng cho dòng cũ không có chi_tiet_id hợp lệ.
  SELECT e.ord - 1 INTO v_tu_idx
    FROM jsonb_array_elements(v_tu_lines) WITH ORDINALITY AS e(line, ord)
    LEFT JOIN public.cssd_dm_bo_dung_cu_chi_tiet c
      ON (e.line->>'chi_tiet_id') ~ v_uuid_re AND c.id = (e.line->>'chi_tiet_id')::uuid
   WHERE (p_chi_tiet_tu_id IS NOT NULL AND c.id = p_chi_tiet_tu_id)
      OR c.loai_dung_cu_id = p_loai_dung_cu_id
      OR (c.id IS NULL AND v_ten IS NOT NULL AND trim(e.line->>'ten_dung_cu_le') = v_ten)
   ORDER BY (p_chi_tiet_tu_id IS NOT NULL AND c.id = p_chi_tiet_tu_id) DESC,
            (c.loai_dung_cu_id = p_loai_dung_cu_id) DESC NULLS LAST,
            e.ord
   LIMIT 1;
  IF v_tu_idx IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy cấu phần trên bộ nguồn.';
  END IF;

  v_thuc := COALESCE((v_tu_lines->v_tu_idx->>'so_luong_thuc_te')::numeric, 0)::integer;
  IF v_thuc < p_qty THEN
    RAISE EXCEPTION 'Không đủ số lượng thực tế trên nguồn (còn %).', v_thuc;
  END IF;
  v_tu_lines := jsonb_set(v_tu_lines, ARRAY[v_tu_idx::text, 'so_luong_thuc_te'], to_jsonb(v_thuc - p_qty), false);

  -- Đích: dòng có chi_tiet cùng loại (id), tên chỉ cho dòng cũ không có chi_tiet_id hợp lệ.
  SELECT e.ord - 1 INTO v_den_idx
    FROM jsonb_array_elements(v_den_lines) WITH ORDINALITY AS e(line, ord)
    LEFT JOIN public.cssd_dm_bo_dung_cu_chi_tiet c
      ON (e.line->>'chi_tiet_id') ~ v_uuid_re AND c.id = (e.line->>'chi_tiet_id')::uuid
   WHERE c.loai_dung_cu_id = p_loai_dung_cu_id
      OR (c.id IS NULL AND v_ten IS NOT NULL AND trim(e.line->>'ten_dung_cu_le') = v_ten)
   ORDER BY (c.loai_dung_cu_id = p_loai_dung_cu_id) DESC NULLS LAST, e.ord
   LIMIT 1;

  IF v_den_idx IS NOT NULL THEN
    v_thuc := COALESCE((v_den_lines->v_den_idx->>'so_luong_thuc_te')::numeric, 0)::integer;
    v_den_lines := jsonb_set(v_den_lines, ARRAY[v_den_idx::text, 'so_luong_thuc_te'], to_jsonb(v_thuc + p_qty), false);
  ELSE
    IF v_den_bo IS NOT NULL THEN
      SELECT ct.id INTO v_den_chi
        FROM public.cssd_dm_bo_dung_cu_chi_tiet ct
       WHERE ct.bo_dung_cu_id = v_den_bo AND ct.loai_dung_cu_id = p_loai_dung_cu_id AND ct.is_active = true
       ORDER BY ct.created_at, ct.id
       LIMIT 1;
    END IF;
    v_den_lines := v_den_lines || jsonb_build_array(jsonb_build_object(
      'line_key', COALESCE(v_den_chi, gen_random_uuid())::text,
      'chi_tiet_id', v_den_chi::text,
      'ten_dung_cu_le', COALESCE(v_ten, v_tu_lines->v_tu_idx->>'ten_dung_cu_le', '—'),
      'so_luong_ke_hoach', 0,
      'so_luong_thuc_te', p_qty
    ));
  END IF;

  UPDATE public.cssd_fact_quy_trinh
     SET metadata = jsonb_set(v_tu_meta, '{bom_lines}', v_tu_lines, true), updated_at = now()
   WHERE id = p_tu_id;
  UPDATE public.cssd_fact_quy_trinh
     SET metadata = jsonb_set(v_den_meta, '{bom_lines}', v_den_lines, true), updated_at = now()
   WHERE id = p_den_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_cssd_apply_instrument_ledger_tx(p_su_co_id uuid, p_loai_dung_cu_id uuid, p_bo_dung_cu_id uuid, p_quy_trinh_id uuid, p_loai_giao_dich text, p_so_luong_thay_doi integer, p_ghi_chu text, p_bo_dung_cu_id_den uuid, p_nguoi_thuc_hien_id uuid, p_chi_tiet_id uuid, p_issue_type text, p_ten_dung_cu_le text, p_ma_qr_nguon text, p_ma_qr_den text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_src_qty integer;
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

  v_den := p_bo_dung_cu_id_den;
  v_ma_den := NULLIF(upper(trim(COALESCE(p_ma_qr_den, ''))), '');
  v_ma_nguon := NULLIF(upper(trim(COALESCE(p_ma_qr_nguon, ''))), '');
  v_src_qty := p_so_luong_thay_doi;

  -- KD-4: điều chuyển bắt buộc có bộ nguồn + bộ đích (khác nhau); không đích = lỗi, không trừ nguồn
  IF p_loai_giao_dich = 'DIEU_CHUYEN' THEN
    IF p_bo_dung_cu_id IS NULL THEN
      RAISE EXCEPTION 'Điều chuyển cần bộ nguồn.';
    END IF;
    IF v_den IS NULL AND v_ma_den IS NOT NULL THEN
      SELECT b.id INTO v_den
        FROM public.cssd_dm_bo_dung_cu b
       WHERE upper(b.ma_bo) = v_ma_den
         AND b.is_active = true
       LIMIT 1;
      IF v_den IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy bộ đích theo QR.';
      END IF;
    END IF;
    IF v_den IS NULL THEN
      RAISE EXCEPTION 'Điều chuyển bắt buộc có bộ đích.';
    END IF;
    IF v_den = p_bo_dung_cu_id THEN
      RAISE EXCEPTION 'Bộ đích trùng bộ nguồn.';
    END IF;
    v_src_qty := -v_abs;
    -- khóa hai khóa kho theo thứ tự cố định (tránh deadlock A→B / B→A)
    PERFORM public.fn_cssd_kho_lock(x, p_loai_dung_cu_id)
       FROM unnest(ARRAY[p_bo_dung_cu_id, v_den]) AS x
      ORDER BY x::text;
  ELSIF p_bo_dung_cu_id IS NOT NULL THEN
    PERFORM public.fn_cssd_kho_lock(p_bo_dung_cu_id, p_loai_dung_cu_id);
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

  -- Approach A: DIEU_CHUYEN dest — ensure chi_tiet (trước metadata để dòng BOM đích mang chi_tiet_id đích)
  IF p_loai_giao_dich = 'DIEU_CHUYEN' THEN
    PERFORM public.fn_cssd_ensure_chi_tiet_for_ledger(
      v_den, p_loai_dung_cu_id, p_ten_dung_cu_le
    );
  END IF;

  IF p_loai_giao_dich = 'DIEU_CHUYEN'
     AND v_ma_nguon IS NOT NULL
     AND v_ma_den IS NOT NULL THEN
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
    IF v_qt_tu IS NOT NULL AND v_qt_den IS NOT NULL AND v_qt_tu <> v_qt_den THEN
      PERFORM public.fn_cssd_transfer_bom_metadata_by_id(
        v_qt_tu, v_qt_den, p_loai_dung_cu_id, p_chi_tiet_id, p_ten_dung_cu_le, v_abs
      );
    END IF;
  END IF;

  INSERT INTO public.cssd_fact_kho_giao_dich (
    loai_dung_cu_id, bo_dung_cu_id, quy_trinh_id, loai_giao_dich,
    so_luong_thay_doi, ghi_chu, su_co_id, nguoi_thuc_hien_id, created_at, updated_at
  ) VALUES (
    p_loai_dung_cu_id, p_bo_dung_cu_id, p_quy_trinh_id, p_loai_giao_dich,
    v_src_qty, NULLIF(trim(COALESCE(p_ghi_chu, '')), ''),
    p_su_co_id, p_nguoi_thuc_hien_id, now(), now()
  );

  IF p_loai_giao_dich = 'DIEU_CHUYEN' THEN
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
$function$;

-- Hàm nội bộ: chỉ service_role/postgres (default privileges đã thu; vẫn REVOKE tường minh)
REVOKE ALL ON FUNCTION public.fn_cssd_kho_lock(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cssd_transfer_bom_metadata_by_id(uuid, uuid, uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cssd_apply_instrument_ledger_tx(uuid,uuid,uuid,uuid,text,integer,text,uuid,uuid,uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_kho_lock(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cssd_transfer_bom_metadata_by_id(uuid, uuid, uuid, uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cssd_apply_instrument_ledger_tx(uuid,uuid,uuid,uuid,text,integer,text,uuid,uuid,uuid,text,text,text,text) TO service_role;

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc) sau khi apply:
--   SELECT p.oid::regprocedure, array_to_string(p.proacl, ',') FROM pg_proc p
--    WHERE p.pronamespace = 'public'::regnamespace
--      AND p.proname IN ('fn_cssd_kho_lock','fn_cssd_transfer_bom_metadata_by_id','fn_cssd_apply_instrument_ledger_tx');
--   -- trước apply: dòng nguồn DIEU_CHUYEN dương hoặc thiếu dòng đích (tồn đã mất/tạo sai trong lịch sử)
--   SELECT g.id, g.bo_dung_cu_id, g.so_luong_thay_doi, g.created_at FROM public.cssd_fact_kho_giao_dich g
--    WHERE g.loai_giao_dich = 'DIEU_CHUYEN' AND g.is_active
--      AND g.so_luong_thay_doi < 0
--      AND NOT EXISTS (SELECT 1 FROM public.cssd_fact_kho_giao_dich d
--                       WHERE d.loai_giao_dich = 'DIEU_CHUYEN' AND d.so_luong_thay_doi = -g.so_luong_thay_doi
--                         AND d.loai_dung_cu_id = g.loai_dung_cu_id AND d.created_at = g.created_at AND d.id <> g.id);
