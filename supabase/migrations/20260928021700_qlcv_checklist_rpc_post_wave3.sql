-- Soft draft LOCAL ONLY — do NOT apply from Soft (mandate). Nghĩa/W4 or Cloud apply.
-- Post-Wave3: fn_qlcv_update_checklist still validated p_trang_thai_ma against
-- qlcv_dm_trang_thai_cong_viec (DROPPED) / soft-deactivated lookup → progress+status broken.
-- Recreate RPC: validate against Track B 7 canonical codes; write TEXT trang_thai.

CREATE OR REPLACE FUNCTION public.fn_qlcv_update_checklist(
  p_cong_viec_id uuid,
  p_checklist jsonb,
  p_phan_tram_hoan_thanh integer DEFAULT NULL,
  p_trang_thai_ma text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_pct integer;
  v_tt text;
BEGIN
  IF p_cong_viec_id IS NULL THEN
    RAISE EXCEPTION 'p_cong_viec_id bắt buộc';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.qlcv_fact_cong_viec WHERE id = p_cong_viec_id) THEN
    RAISE EXCEPTION 'Không tìm thấy công việc %', p_cong_viec_id;
  END IF;

  v_pct := COALESCE(p_phan_tram_hoan_thanh, 0);

  IF p_trang_thai_ma IS NOT NULL AND btrim(p_trang_thai_ma) <> '' THEN
    v_tt := upper(btrim(p_trang_thai_ma));
    -- Alias legacy → canonical (read-compat)
    v_tt := CASE v_tt
      WHEN 'CHUA_BAT_DAU' THEN 'MOI'
      WHEN 'CHO_NHAN_VIEC' THEN 'DANG_LAM'
      WHEN 'DANG_THUC_HIEN' THEN 'DANG_LAM'
      WHEN 'CHO_XAC_NHAN_HOAN_THANH' THEN 'CHO_DUYET'
      ELSE v_tt
    END;
    IF v_tt <> ALL (ARRAY[
      'MOI'::text,
      'DANG_LAM'::text,
      'CHO_DUYET'::text,
      'HOAN_THANH'::text,
      'TU_CHOI'::text,
      'QUA_HAN'::text,
      'DA_HUY'::text
    ]) THEN
      RAISE EXCEPTION 'Trạng thái không hợp lệ: %', p_trang_thai_ma;
    END IF;
  END IF;

  UPDATE public.qlcv_fact_cong_viec
     SET checklist = COALESCE(p_checklist, '[]'::jsonb),
         phan_tram_hoan_thanh = v_pct,
         trang_thai = COALESCE(v_tt, trang_thai),
         updated_at = now()
   WHERE id = p_cong_viec_id;

  RETURN jsonb_build_object(
    'id', p_cong_viec_id,
    'phan_tram_hoan_thanh', v_pct,
    'checklist', COALESCE(p_checklist, '[]'::jsonb),
    'trang_thai', v_tt
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) TO service_role;

COMMENT ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) IS
  'Post-Wave3: checklist + % + optional trang_thai TEXT (7 canonical). No qlcv_dm_*. Soft FE prefers status via fn_qlcv_transition.';
