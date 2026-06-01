-- QLCV checklist: RPC cập nhật (ổn định khi PostgREST cache chậm) + reload schema

ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.qlcv_fact_cong_viec.checklist IS
  'Mảng [{id,label,done}]. % hoàn thành sync khi gọi fn_qlcv_update_checklist.';

CREATE OR REPLACE FUNCTION public.fn_qlcv_update_checklist(
  p_cong_viec_id uuid,
  p_checklist jsonb,
  p_phan_tram_hoan_thanh integer DEFAULT NULL,
  p_trang_thai_ma text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO public
    AS $$
DECLARE
  v_tt_id uuid;
  v_pct integer;
BEGIN
  IF p_cong_viec_id IS NULL THEN
    RAISE EXCEPTION 'p_cong_viec_id bắt buộc';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.qlcv_fact_cong_viec WHERE id = p_cong_viec_id) THEN
    RAISE EXCEPTION 'Không tìm thấy công việc %', p_cong_viec_id;
  END IF;

  v_pct := COALESCE(p_phan_tram_hoan_thanh, 0);

  IF p_trang_thai_ma IS NOT NULL AND btrim(p_trang_thai_ma) <> '' THEN
    SELECT id INTO v_tt_id
      FROM public.dm_trang_thai_cong_viec
     WHERE ma = p_trang_thai_ma
     LIMIT 1;
    IF v_tt_id IS NULL THEN
      RAISE EXCEPTION 'Trạng thái không hợp lệ: %', p_trang_thai_ma;
    END IF;
  END IF;

  UPDATE public.qlcv_fact_cong_viec
     SET checklist = COALESCE(p_checklist, '[]'::jsonb),
         phan_tram_hoan_thanh = v_pct,
         trang_thai_id = COALESCE(v_tt_id, trang_thai_id),
         updated_at = now()
   WHERE id = p_cong_viec_id;

  RETURN jsonb_build_object(
    'id', p_cong_viec_id,
    'phan_tram_hoan_thanh', v_pct,
    'checklist', COALESCE(p_checklist, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) TO authenticated;

COMMENT ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) IS
  'Cập nhật checklist + % tiến độ (+ trạng thái tuỳ chọn). App QLCV gọi qua Supabase RPC.';

NOTIFY pgrst, 'reload schema';
