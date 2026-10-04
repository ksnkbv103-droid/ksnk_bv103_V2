-- VST-05 Soft-local: xóa mềm + cột audit + RPC lưu phiên nguyên tử.
-- CHỈ GHI FILE — không apply trong lát Cursor. QT.07 :220 lưu ≥3 năm.

BEGIN;

ALTER TABLE public.gstt_fact_vst_sessions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL,
  ADD COLUMN IF NOT EXISTS ly_do_xoa text NULL;

COMMENT ON COLUMN public.gstt_fact_vst_sessions.deleted_at IS
  'VST-05: thời điểm xóa mềm (is_active=false).';
COMMENT ON COLUMN public.gstt_fact_vst_sessions.deleted_by IS
  'VST-05: người xóa mềm (mdm_nhan_su.id hoặc auth.users.id).';
COMMENT ON COLUMN public.gstt_fact_vst_sessions.ly_do_xoa IS
  'VST-05: lý do xóa mềm (bắt buộc từ app).';

-- Lưu/sửa phiên: xóa cơ hội cũ + chèn mới + upsert header trong 1 transaction.
CREATE OR REPLACE FUNCTION public.rpc_vst_save_session(
  p_session_id uuid,
  p_session jsonb,
  p_observations jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_session_id uuid;
  v_obs jsonb;
BEGIN
  IF p_session IS NULL OR jsonb_typeof(p_session) <> 'object' THEN
    RAISE EXCEPTION 'rpc_vst_save_session: thiếu p_session';
  END IF;
  IF p_observations IS NULL OR jsonb_typeof(p_observations) <> 'array' THEN
    RAISE EXCEPTION 'rpc_vst_save_session: p_observations phải là mảng';
  END IF;
  IF jsonb_array_length(p_observations) < 1 THEN
    RAISE EXCEPTION 'rpc_vst_save_session: cần ≥1 cơ hội';
  END IF;

  IF p_session_id IS NULL THEN
    INSERT INTO public.gstt_fact_vst_sessions (
      khoa_id, khu_vuc_id, vi_tri_cu_the, hinh_thuc_id, cach_thuc_id,
      nguoi_giam_sat_id, ngay_giam_sat, thoi_gian_bat_dau, thoi_gian_ket_thuc,
      metadata, is_active
    ) VALUES (
      (p_session->>'khoa_id')::uuid,
      NULLIF(p_session->>'khu_vuc_id', '')::uuid,
      NULLIF(p_session->>'vi_tri_cu_the', ''),
      NULLIF(p_session->>'hinh_thuc_id', '')::uuid,
      NULLIF(p_session->>'cach_thuc_id', '')::uuid,
      (p_session->>'nguoi_giam_sat_id')::uuid,
      (p_session->>'ngay_giam_sat')::date,
      NULLIF(p_session->>'thoi_gian_bat_dau', '')::timestamptz,
      NULLIF(p_session->>'thoi_gian_ket_thuc', '')::timestamptz,
      COALESCE(p_session->'metadata', '{}'::jsonb),
      true
    )
    RETURNING id INTO v_session_id;
  ELSE
    v_session_id := p_session_id;
    UPDATE public.gstt_fact_vst_sessions SET
      khoa_id = (p_session->>'khoa_id')::uuid,
      khu_vuc_id = NULLIF(p_session->>'khu_vuc_id', '')::uuid,
      vi_tri_cu_the = NULLIF(p_session->>'vi_tri_cu_the', ''),
      hinh_thuc_id = NULLIF(p_session->>'hinh_thuc_id', '')::uuid,
      cach_thuc_id = NULLIF(p_session->>'cach_thuc_id', '')::uuid,
      nguoi_giam_sat_id = (p_session->>'nguoi_giam_sat_id')::uuid,
      ngay_giam_sat = (p_session->>'ngay_giam_sat')::date,
      thoi_gian_bat_dau = NULLIF(p_session->>'thoi_gian_bat_dau', '')::timestamptz,
      thoi_gian_ket_thuc = NULLIF(p_session->>'thoi_gian_ket_thuc', '')::timestamptz,
      metadata = COALESCE(p_session->'metadata', '{}'::jsonb),
      updated_at = now()
    WHERE id = v_session_id
      AND COALESCE(is_active, true) = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'rpc_vst_save_session: phiên không tồn tại hoặc đã vô hiệu';
    END IF;
    DELETE FROM public.gstt_fact_vst WHERE session_id = v_session_id;
  END IF;

  FOR v_obs IN SELECT value FROM jsonb_array_elements(p_observations)
  LOOP
    INSERT INTO public.gstt_fact_vst (
      session_id, nhan_vien_id, khoa_id, khu_vuc_id, vi_tri, nghe_nghiep_id,
      ngay_giam_sat, thoi_diem, hanh_dong, dung_ky_thuat, du_thoi_gian,
      co_deo_gang, thoi_gian_ghi_nhan, metadata
    ) VALUES (
      v_session_id,
      NULLIF(v_obs->>'nhan_vien_id', '')::uuid,
      (v_obs->>'khoa_id')::uuid,
      NULLIF(v_obs->>'khu_vuc_id', '')::uuid,
      NULLIF(v_obs->>'vi_tri', ''),
      NULLIF(v_obs->>'nghe_nghiep_id', '')::uuid,
      COALESCE(NULLIF(v_obs->>'ngay_giam_sat', '')::date, (p_session->>'ngay_giam_sat')::date),
      COALESCE(v_obs->>'thoi_diem', ''),
      v_obs->>'hanh_dong',
      CASE WHEN v_obs ? 'dung_ky_thuat' AND jsonb_typeof(v_obs->'dung_ky_thuat') = 'boolean'
        THEN (v_obs->>'dung_ky_thuat')::boolean ELSE NULL END,
      CASE WHEN v_obs ? 'du_thoi_gian' AND jsonb_typeof(v_obs->'du_thoi_gian') = 'boolean'
        THEN (v_obs->>'du_thoi_gian')::boolean ELSE NULL END,
      CASE WHEN v_obs ? 'co_deo_gang' AND jsonb_typeof(v_obs->'co_deo_gang') = 'boolean'
        THEN (v_obs->>'co_deo_gang')::boolean ELSE NULL END,
      NULLIF(v_obs->>'thoi_gian_ghi_nhan', '')::timestamptz,
      COALESCE(v_obs->'metadata', '{}'::jsonb)
    );
  END LOOP;

  RETURN jsonb_build_object('session_id', v_session_id);
END;
$$;

COMMENT ON FUNCTION public.rpc_vst_save_session(uuid, jsonb, jsonb) IS
  'VST-05: lưu/sửa phiên WHO trong 1 transaction (xóa+chèn cơ hội + cập nhật header).';

REVOKE ALL ON FUNCTION public.rpc_vst_save_session(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_vst_save_session(uuid, jsonb, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
