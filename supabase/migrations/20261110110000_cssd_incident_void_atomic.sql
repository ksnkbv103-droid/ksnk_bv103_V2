-- Vô hiệu phiếu sự cố CSSD nguyên tử.
-- Trước: app ghi nhiều bước (tắt sổ, đọc-rồi-ghi kho dự phòng, sửa quy trình, tắt phiếu), lỗi giữa chừng
-- để lại trạng thái nửa vời và kho dự phòng có race. Nay: một transaction, khóa dòng.
-- Kế hoạch (planCssdIncidentVoid) vẫn tính ở app; RPC chỉ áp dụng và kiểm lại điều kiện.
-- Additive: chỉ thêm hàm, không đổi bảng.

CREATE OR REPLACE FUNCTION public.rpc_cssd_apply_incident_void(
  p_su_co_id uuid,
  p_attributes jsonb,
  p_deactivate_ledger_ids uuid[],
  p_kho_delta jsonb,
  p_quy_trinh_id uuid,
  p_quy_trinh_patch jsonb,
  p_event jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_active boolean;
  v_n int;
  v_want int;
  d record;
  v_cur int;
  v_cols text;
  v_bad text;
BEGIN
  PERFORM public.fn_cssd_assert_ledger_write();

  IF p_su_co_id IS NULL OR p_attributes IS NULL OR jsonb_typeof(p_attributes) <> 'object' THEN
    RAISE EXCEPTION 'Thiếu dữ liệu vô hiệu phiếu.';
  END IF;

  SELECT is_active INTO v_active FROM public.cssd_fact_su_co WHERE id = p_su_co_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu sự cố.';
  END IF;
  IF v_active = false THEN
    RETURN jsonb_build_object('already', true);
  END IF;

  -- 1) Tắt dòng sổ: phải đúng số dòng còn hiệu lực đã lập kế hoạch.
  v_want := COALESCE(array_length(p_deactivate_ledger_ids, 1), 0);
  IF v_want > 0 THEN
    UPDATE public.cssd_fact_kho_giao_dich
       SET is_active = false, updated_at = now()
     WHERE id = ANY (p_deactivate_ledger_ids)
       AND su_co_id = p_su_co_id
       AND is_active = true;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> v_want THEN
      RAISE EXCEPTION 'Sổ dụng cụ đã thay đổi, tải lại phiếu rồi thử lại.';
    END IF;
  END IF;

  -- 2) Kho dự phòng: khóa dòng, cộng/trừ tại chỗ, không để âm. Thứ tự id cố định để tránh deadlock.
  IF p_kho_delta IS NOT NULL AND jsonb_typeof(p_kho_delta) = 'array' THEN
    FOR d IN
      SELECT (e ->> 'loaiDungCuId')::uuid AS loai_id, (e ->> 'delta')::int AS delta
        FROM jsonb_array_elements(p_kho_delta) e
       ORDER BY 1
    LOOP
      SELECT so_luong_kho_du_phong INTO v_cur
        FROM public.cssd_dm_loai_dung_cu WHERE id = d.loai_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy loại dụng cụ để hoàn kho.';
      END IF;
      IF COALESCE(v_cur, 0) + d.delta < 0 THEN
        RAISE EXCEPTION 'Kho dự phòng không đủ để hoàn phiếu nhập kho.';
      END IF;
      UPDATE public.cssd_dm_loai_dung_cu
         SET so_luong_kho_du_phong = COALESCE(so_luong_kho_du_phong, 0) + d.delta,
             updated_at = now()
       WHERE id = d.loai_id;
    END LOOP;
  END IF;

  -- 3) Chu trình: chỉ cột đang có của bảng, trừ nhóm khóa/định danh.
  IF p_quy_trinh_id IS NOT NULL THEN
    PERFORM 1 FROM public.cssd_fact_quy_trinh WHERE id = p_quy_trinh_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy chu trình của phiếu.';
    END IF;

    IF p_quy_trinh_patch IS NOT NULL AND jsonb_typeof(p_quy_trinh_patch) = 'object'
       AND p_quy_trinh_patch <> '{}'::jsonb THEN
      SELECT string_agg(k, ', ') INTO v_bad
        FROM jsonb_object_keys(p_quy_trinh_patch) k
       WHERE k IN ('id', 'created_at', 'metadata', 'is_active')
          OR NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
             WHERE c.table_schema = 'public' AND c.table_name = 'cssd_fact_quy_trinh' AND c.column_name = k
          );
      IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Cột chu trình không hợp lệ: %', v_bad;
      END IF;
      SELECT string_agg(format('%1$I = r.%1$I', k), ', ') INTO v_cols
        FROM jsonb_object_keys(p_quy_trinh_patch) k;
      EXECUTE format(
        'UPDATE public.cssd_fact_quy_trinh q SET %s, updated_at = now() '
        'FROM jsonb_populate_record(NULL::public.cssd_fact_quy_trinh, $1) r WHERE q.id = $2',
        v_cols
      ) USING p_quy_trinh_patch, p_quy_trinh_id;
    END IF;

    IF p_event IS NOT NULL AND jsonb_typeof(p_event) = 'object' THEN
      UPDATE public.cssd_fact_quy_trinh
         SET metadata = jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{ngoai_le}',
               COALESCE(metadata -> 'ngoai_le', '[]'::jsonb) || jsonb_build_array(p_event),
               true
             ),
             updated_at = now()
       WHERE id = p_quy_trinh_id;
    END IF;
  END IF;

  -- 4) Đóng phiếu.
  UPDATE public.cssd_fact_su_co
     SET is_active = false,
         is_red_alert = false,
         attributes = p_attributes,
         updated_at = now()
   WHERE id = p_su_co_id AND is_active = true;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Không vô hiệu được phiếu (đã bị đổi trạng thái).';
  END IF;

  RETURN jsonb_build_object('already', false);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_cssd_apply_incident_void(uuid, jsonb, uuid[], jsonb, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_apply_incident_void(uuid, jsonb, uuid[], jsonb, uuid, jsonb, jsonb) TO service_role;
