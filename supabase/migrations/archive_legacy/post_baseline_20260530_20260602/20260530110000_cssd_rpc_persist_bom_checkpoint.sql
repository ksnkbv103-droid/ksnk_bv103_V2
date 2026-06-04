-- supabase/migrations/20260530110000_cssd_rpc_persist_bom_checkpoint.sql

CREATE OR REPLACE FUNCTION public.rpc_cssd_persist_bom_checkpoint(
  p_quy_trinh_id uuid,
  p_lines jsonb,        -- Array of: [{thanh_phan_id: uuid, so_luong_thuc_te: int, so_luong_hong: int}]
  p_deltas jsonb,       -- Array of: [{loai_id: uuid, bo_id: uuid, loai_giao_dich: text, so_luong_thay_doi: int, ghi_chu: text}]
  p_do_split text,      -- 'NONE' | 'REQUESTED'
  p_operator_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_line jsonb;
  v_delta jsonb;
  v_thanh_phan_id uuid;
  v_thuc_te int;
  v_hong int;
  v_loai_id uuid;
  v_bo_id uuid;
  v_giao_dich_id uuid;
  v_so_luong_thay_doi int;
  v_ghi_chu text;
  v_loai_giao_dich text;
BEGIN
  -- 1. Cập nhật số lượng thực tế và số lượng hỏng trong cssd_fact_quy_trinh_thanh_phan
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_thanh_phan_id := (v_line->>'thanh_phan_id')::uuid;
    v_thuc_te := (v_line->>'so_luong_thuc_te')::int;
    v_hong := COALESCE((v_line->>'so_luong_hong')::int, 0);

    UPDATE public.cssd_fact_quy_trinh_thanh_phan
       SET so_luong_thuc_te = v_thuc_te,
           updated_at = now()
     WHERE id = v_thanh_phan_id
       AND quy_trinh_id = p_quy_trinh_id;
  END LOOP;

  -- 2. Ghi nhận giao dịch biến động kho nếu có deltas
  IF p_deltas IS NOT NULL AND jsonb_array_length(p_deltas) > 0 THEN
    FOR v_delta IN SELECT * FROM jsonb_array_elements(p_deltas) LOOP
      v_loai_id := (v_delta->>'loai_id')::uuid;
      v_bo_id := NULLIF(v_delta->>'bo_id', '')::uuid;
      v_loai_giao_dich := v_delta->>'loai_giao_dich';
      v_so_luong_thay_doi := (v_delta->>'so_luong_thay_doi')::int;
      v_ghi_chu := v_delta->>'ghi_chu';

      INSERT INTO public.cssd_fact_kho_giao_dich(
        loai_dung_cu_id, 
        bo_dung_cu_id, 
        quy_trinh_id,
        loai_giao_dich, 
        so_luong_thay_doi, 
        ghi_chu,
        nguoi_thuc_hien_id, 
        created_at, 
        updated_at
      ) VALUES (
        v_loai_id,
        v_bo_id,
        p_quy_trinh_id,
        v_loai_giao_dich,
        v_so_luong_thay_doi,
        v_ghi_chu,
        p_operator_id, 
        now(), 
        now()
      );
    END LOOP;
  END IF;

  -- 3. Ghi sự kiện vòng đời KIEM_DEM_BOM
  INSERT INTO public.cssd_fact_lifecycle_event(
    quy_trinh_id, 
    ma_su_kien, 
    ma_tram, 
    payload, 
    created_at, 
    updated_at
  ) VALUES (
    p_quy_trinh_id, 
    'KIEM_DEM_BOM', 
    'DONG_GOI',
    jsonb_build_object(
      'do_split', p_do_split, 
      'so_lines', jsonb_array_length(p_lines)
    ),
    now(), 
    now()
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Cấp quyền thực thi
GRANT EXECUTE ON FUNCTION public.rpc_cssd_persist_bom_checkpoint(uuid, jsonb, jsonb, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_persist_bom_checkpoint(uuid, jsonb, jsonb, text, uuid) TO service_role;
