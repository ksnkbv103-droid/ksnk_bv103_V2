-- Migration: 20261105120000_cssd_apply_bom_plan_tx_harden.sql
-- Lát B1 / việc 1. Siết fn_cssd_apply_bom_plan_tx (20261104180000):
--   (a) Quyền: SECURITY DEFINER nhưng đang GRANT authenticated, không kiểm quyền → user đăng nhập gọi thẳng PostgREST
--       ghi đè BOM bất kỳ (vượt RLS). Caller duy nhất dùng admin client (src/lib/master-data/cssd-catalog-de-nghi-apply.ts)
--       → chỉ service_role. Mẫu: 20261010112713_qlcv_rpc_revoke_client_roles.
--   (b) UPDATE không khớp hàng (id sai / khác bộ) trước đây vẫn đếm và trả success → nay RAISE (P0002), rollback toàn bộ.
--       Bộ đích không tồn tại và type lạ cũng RAISE.
--   (c) EXCEPTION WHEN OTHERS trước đây nuốt SQLSTATE (mọi lỗi thành P0001) → nay giữ nguyên SQLSTATE gốc + DETAIL/HINT.
-- Giữ nguyên chữ ký (uuid, jsonb, timestamptz) và kiểu trả về jsonb {success, applied_count}.

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
  v_state text;
  v_msg text;
  v_detail text;
  v_hint text;
BEGIN
  IF p_bo_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu mã bộ đích.' USING ERRCODE = '22004';
  END IF;

  -- Khóa bộ cha để kiểm soát tương tranh (concurrency row lock)
  PERFORM 1 FROM public.cssd_dm_bo_dung_cu WHERE id = p_bo_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy bộ dụng cụ đích %.', p_bo_id USING ERRCODE = 'P0002';
  END IF;

  FOR v_w IN SELECT * FROM jsonb_array_elements(COALESCE(p_writes, '[]'::jsonb))
  LOOP
    v_type := v_w->>'type';

    IF v_type = 'deactivate' THEN
      v_id := (v_w->>'id')::uuid;
      UPDATE public.cssd_dm_bo_dung_cu_chi_tiet
         SET is_active = false,
             updated_at = p_now
       WHERE id = v_id AND bo_dung_cu_id = p_bo_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy dòng cấu phần % trong bộ % (deactivate).', v_id, p_bo_id
          USING ERRCODE = 'P0002';
      END IF;
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
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy dòng cấu phần % trong bộ % (update).', v_id, p_bo_id
          USING ERRCODE = 'P0002';
      END IF;
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

    ELSE
      RAISE EXCEPTION 'Loại thao tác BOM không hợp lệ: %.', COALESCE(v_type, '<null>')
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'applied_count', v_count);
EXCEPTION WHEN OTHERS THEN
  -- Giữ SQLSTATE gốc (không ép về P0001) để caller phân biệt lỗi.
  GET STACKED DIAGNOSTICS
    v_state = RETURNED_SQLSTATE,
    v_msg = MESSAGE_TEXT,
    v_detail = PG_EXCEPTION_DETAIL,
    v_hint = PG_EXCEPTION_HINT;
  RAISE EXCEPTION USING
    ERRCODE = v_state,
    MESSAGE = 'Lỗi giao dịch cấu phần BOM: ' || v_msg,
    DETAIL = COALESCE(v_detail, ''),
    HINT = COALESCE(v_hint, '');
END;
$$;

COMMENT ON FUNCTION public.fn_cssd_apply_bom_plan_tx(uuid, jsonb, timestamptz) IS
  'Thực thi kế hoạch thay đổi dòng cấu phần BOM (deactivate/update/insert) trong 1 transaction nguyên tử. Chỉ service_role. Dòng không khớp → P0002, giữ SQLSTATE gốc.';

REVOKE ALL ON FUNCTION public.fn_cssd_apply_bom_plan_tx(uuid, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_apply_bom_plan_tx(uuid, jsonb, timestamptz) TO service_role;

-- CHƯA APPLY PROD — chờ PO. Phụ thuộc 20261104180000 (hàm phải tồn tại trên prod trước).
-- Kiểm prod (chỉ đọc), mong đợi f|f|t:
--   SELECT has_function_privilege('anon', 'public.fn_cssd_apply_bom_plan_tx(uuid,jsonb,timestamptz)', 'EXECUTE'),
--          has_function_privilege('authenticated', 'public.fn_cssd_apply_bom_plan_tx(uuid,jsonb,timestamptz)', 'EXECUTE'),
--          has_function_privilege('service_role', 'public.fn_cssd_apply_bom_plan_tx(uuid,jsonb,timestamptz)', 'EXECUTE');
