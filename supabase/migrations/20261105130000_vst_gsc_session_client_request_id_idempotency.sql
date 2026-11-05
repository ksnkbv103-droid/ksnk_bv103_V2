-- Lát B2a: idempotency cho lưu phiên VST/GSC (hàng đợi offline gửi lại sau khi server đã lưu → phiên trùng, lệch KPI).
--
-- 1) Cột client_request_id uuid NULLABLE trên gstt_fact_vst_sessions + gstt_fact_chung_sessions.
--    UNIQUE partial (WHERE client_request_id IS NOT NULL), toàn cục (không ghép nguoi_giam_sat_id):
--    - nguoi_giam_sat_id nullable (có phiên cũ NULL) → unique ghép không chặn trùng khi NULL;
--    - uuid do client sinh ngẫu nhiên, toàn cục là đủ và chặt nhất;
--    - chống «mượn» uuid của người khác: RPC VST kiểm nguoi_giam_sat_id khớp, lệch thì RAISE.
--    Hàng cũ giữ NULL → không ảnh hưởng.
-- 2) rpc_vst_save_session: GIỮ chữ ký (uuid, jsonb, jsonb), SECURITY DEFINER, search_path, ACL
--    (CREATE OR REPLACE giữ nguyên proacl: postgres + service_role). client_request_id đọc từ
--    p_session->>'client_request_id' (caller cũ không gửi → hành vi như cũ).
--    Chỉ áp cho nhánh tạo mới (p_session_id IS NULL). Trùng → trả phiên đã lưu, không ghi cơ hội lại,
--    kèm deduplicated=true. Race: INSERT … ON CONFLICT DO NOTHING rồi đọc lại hàng đã commit.
--    Không đụng PO-lock VST (trần ≤2 mốc, bỏ sót=1, xóa mềm) — logic cơ hội giữ nguyên.

ALTER TABLE public.gstt_fact_vst_sessions
  ADD COLUMN IF NOT EXISTS client_request_id uuid;
ALTER TABLE public.gstt_fact_chung_sessions
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

COMMENT ON COLUMN public.gstt_fact_vst_sessions.client_request_id IS
  'Idempotency key do client sinh cho lần tạo phiên; trùng → RPC trả phiên đã lưu.';
COMMENT ON COLUMN public.gstt_fact_chung_sessions.client_request_id IS
  'Idempotency key do client sinh cho lần tạo phiên; trùng (23505) → action đọc lại phiên đã lưu.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_gstt_fact_vst_sessions_client_request_id
  ON public.gstt_fact_vst_sessions (client_request_id)
  WHERE client_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_gstt_fact_chung_sessions_client_request_id
  ON public.gstt_fact_chung_sessions (client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.rpc_vst_save_session(p_session_id uuid, p_session jsonb, p_observations jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id uuid;
  v_obs jsonb;
  v_client_request_id uuid;
  v_existing_giam_sat uuid;
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

  v_client_request_id := NULLIF(p_session->>'client_request_id', '')::uuid;

  IF p_session_id IS NULL THEN
    INSERT INTO public.gstt_fact_vst_sessions (
      khoa_id, khu_vuc_id, vi_tri_cu_the, hinh_thuc_id, cach_thuc_id,
      nguoi_giam_sat_id, ngay_giam_sat, thoi_gian_bat_dau, thoi_gian_ket_thuc,
      metadata, is_active, client_request_id
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
      true,
      v_client_request_id
    )
    ON CONFLICT (client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_session_id;

    IF v_session_id IS NULL THEN
      -- Chỉ tới đây khi v_client_request_id NOT NULL và đã có phiên (đã commit) cùng key.
      SELECT s.id, s.nguoi_giam_sat_id
        INTO v_session_id, v_existing_giam_sat
        FROM public.gstt_fact_vst_sessions s
       WHERE s.client_request_id = v_client_request_id;
      IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'rpc_vst_save_session: xung đột client_request_id nhưng không đọc được phiên';
      END IF;
      IF v_existing_giam_sat IS DISTINCT FROM NULLIF(p_session->>'nguoi_giam_sat_id', '')::uuid THEN
        RAISE EXCEPTION 'rpc_vst_save_session: client_request_id đã thuộc phiên của người giám sát khác';
      END IF;
      RETURN jsonb_build_object('session_id', v_session_id, 'deduplicated', true);
    END IF;
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

  RETURN jsonb_build_object('session_id', v_session_id, 'deduplicated', false);
END;
$function$;

-- ACL giữ nguyên (CREATE OR REPLACE không đổi proacl). Khẳng định lại không mở cho client:
REVOKE ALL ON FUNCTION public.rpc_vst_save_session(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_vst_save_session(uuid, jsonb, jsonb) TO service_role;

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc):
--   SELECT table_name, column_name FROM information_schema.columns
--    WHERE table_schema='public' AND column_name='client_request_id'
--      AND table_name IN ('gstt_fact_vst_sessions','gstt_fact_chung_sessions');
--   SELECT indexname FROM pg_indexes WHERE indexname LIKE 'uq_gstt_fact_%_client_request_id';
--   SELECT p.oid::regprocedure, p.prosecdef, p.proconfig, p.proacl FROM pg_proc p
--    WHERE p.proname='rpc_vst_save_session';   -- kỳ vọng proacl {postgres=X/postgres,service_role=X/postgres}
--   SELECT position('client_request_id' IN pg_get_functiondef('public.rpc_vst_save_session(uuid,jsonb,jsonb)'::regprocedure)) > 0;
