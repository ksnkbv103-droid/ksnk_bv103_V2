-- Migration: 20261104180000_cssd_apply_bom_plan_tx.sql
-- Mục đích: Đóng gói toàn bộ thao tác ghi đè thành phần bộ (BOM writes: deactivate, update, insert)
-- trong quy trình duyệt đề nghị danh mục (cssd_catalog_de_nghi) vào một giao dịch nguyên tử (ACID).
-- Ngăn ngừa tình trạng lỗi giữa chừng để lại dữ liệu dở dang (partial writes) và kẹt phiếu ở APPLY_FAILED.

CREATE OR REPLACE FUNCTION public.fn_cssd_apply_bom_plan_tx(
  p_bo_id uuid,
  p_writes jsonb,
  p_now timestamptz DEFAULT clock_timestamp()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_w jsonb;
  v_type text;
  v_id uuid;
  v_patch jsonb;
  v_row jsonb;
  v_count int := 0;
BEGIN
  IF p_bo_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu mã bộ đích.';
  END IF;

  -- Khóa bộ cha để kiểm soát tương tranh (concurrency row lock)
  PERFORM 1 FROM public.cssd_dm_bo_dung_cu WHERE id = p_bo_id FOR UPDATE;

  FOR v_w IN SELECT * FROM jsonb_array_elements(COALESCE(p_writes, '[]'::jsonb))
  LOOP
    v_type := v_w->>'type';

    IF v_type = 'deactivate' THEN
      v_id := (v_w->>'id')::uuid;
      UPDATE public.cssd_dm_bo_dung_cu_chi_tiet
         SET is_active = false,
             updated_at = p_now
       WHERE id = v_id AND bo_dung_cu_id = p_bo_id;
      v_count := v_count + 1;

    ELSIF v_type = 'update' THEN
      v_id := (v_w->>'id')::uuid;
      v_patch := v_w->'patch';
      UPDATE public.cssd_dm_bo_dung_cu_chi_tiet
         SET so_luong = COALESCE((v_patch->>'so_luong')::int, so_luong),
             loai_dung_cu_id = CASE WHEN v_patch ? 'loai_dung_cu_id' THEN (v_patch->>'loai_dung_cu_id')::uuid ELSE loai_dung_cu_id END,
             ten_dung_cu_le = COALESCE(v_patch->>'ten_dung_cu_le', ten_dung_cu_le),
             ten_chi_tiet = COALESCE(v_patch->>'ten_chi_tiet', ten_chi_tiet),
             ghi_chu = CASE WHEN v_patch ? 'ghi_chu' THEN v_patch->>'ghi_chu' ELSE ghi_chu END,
             specs = CASE WHEN v_patch ? 'specs' THEN v_patch->'specs' ELSE specs END,
             is_active = COALESCE((v_patch->>'is_active')::boolean, is_active),
             updated_at = p_now
       WHERE id = v_id AND bo_dung_cu_id = p_bo_id;
      v_count := v_count + 1;

    ELSIF v_type = 'insert' THEN
      v_row := v_w->'row';
      INSERT INTO public.cssd_dm_bo_dung_cu_chi_tiet (
        bo_dung_cu_id,
        loai_dung_cu_id,
        ten_dung_cu_le,
        ten_chi_tiet,
        so_luong,
        ghi_chu,
        specs,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        p_bo_id,
        (v_row->>'loai_dung_cu_id')::uuid,
        v_row->>'ten_dung_cu_le',
        v_row->>'ten_chi_tiet',
        COALESCE((v_row->>'so_luong')::int, 1),
        v_row->>'ghi_chu',
        COALESCE(v_row->'specs', '{}'::jsonb),
        COALESCE((v_row->>'is_active')::boolean, true),
        COALESCE((v_row->>'created_at')::timestamptz, p_now),
        p_now
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'applied_count', v_count);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Lỗi giao dịch cấu phần BOM: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.fn_cssd_apply_bom_plan_tx(uuid, jsonb, timestamptz) IS
  'Thực thi toàn bộ kế hoạch thay đổi dòng cấu phần BOM (deactivate/update/insert) trong 1 PostgreSQL transaction nguyên tử.';

REVOKE ALL ON FUNCTION public.fn_cssd_apply_bom_plan_tx(uuid, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cssd_apply_bom_plan_tx(uuid, jsonb, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_cssd_apply_bom_plan_tx(uuid, jsonb, timestamptz) TO authenticated, service_role;
