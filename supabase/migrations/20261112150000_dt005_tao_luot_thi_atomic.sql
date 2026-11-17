-- CHƯA APPLY PROD — chờ PO.
--
-- DT-005: chống vượt lượt thi thật bằng "chèn → đếm lại → xóa" (startThiThatAttempt).
-- Lỗi: hai request đồng thời đều thấy mình vượt hạn mức → cả hai bị xóa, người học mất lượt.
-- Sửa: RPC tạo lượt nguyên tử. Khóa tuần tự theo (người học, cấu hình) bằng pg_advisory_xact_lock,
-- đếm lượt đúng quy tắc src/modules/dao-tao/lib/dao-tao-luot.ts (TRANG_THAI_TIEU_LUOT =
-- da_nop, het_gio, dang_lam; `huy` KHÔNG tính — DT-006), hạn mức đọc từ dao_tao_cau_hinh.so_lan_cho_phep
-- (normalizeSoLan: <1 hoặc null → 1). Vượt → {success:false, code:'HET_LUOT'}, không chèn.
-- Không nhận hạn mức làm tham số (đã có trong DB).
-- che_do='thi_that', trang_thai='dang_lam' cố định trong RPC.
-- Quyền: SECURITY DEFINER, search_path cố định; chỉ service_role (ứng dụng dùng admin client).
-- Phạm vi đã rà: nơi duy nhất chèn lượt thi thật là startThiThatAttempt (dao-tao-attempt.actions.ts);
-- thi thử (startThiThuAttempt) không có hạn mức lượt — không đụng.
-- Chỉ thêm hàm mới, không đổi bảng/dữ liệu.
-- Khôi phục: DROP FUNCTION public.rpc_dao_tao_tao_luot_thi_that(uuid, uuid, jsonb, text, integer, integer,
--   timestamptz, timestamptz, jsonb, jsonb); và trả action về bản trước (chèn-đếm-xóa).
--
-- SQL kiểm prod (chỉ đọc):
--   SELECT p.oid::regprocedure, p.prosecdef, p.proconfig, p.proacl
--     FROM pg_proc p WHERE p.proname = 'rpc_dao_tao_tao_luot_thi_that';
--   -- Có người học đang vượt hạn mức sẵn (dữ liệu cũ) không:
--   SELECT lt.cau_hinh_id, lt.auth_user_id, count(*) AS tieu_luot, max(ch.so_lan_cho_phep) AS han_muc
--     FROM public.dao_tao_lan_thi lt JOIN public.dao_tao_cau_hinh ch ON ch.id = lt.cau_hinh_id
--    WHERE lt.che_do = 'thi_that' AND lt.trang_thai IN ('da_nop','het_gio','dang_lam')
--    GROUP BY 1, 2 HAVING count(*) > max(ch.so_lan_cho_phep);

CREATE OR REPLACE FUNCTION public.rpc_dao_tao_tao_luot_thi_that(
  p_cau_hinh_id uuid,
  p_auth_user_id uuid,
  p_form_thong_tin jsonb,
  p_seed text,
  p_so_cau integer,
  p_thoi_gian_phut integer,
  p_bat_dau_luc timestamptz,
  p_han_nop_luc timestamptz,
  p_quota_report jsonb,
  p_de_snapshot jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_so_lan integer;
  v_tieu_luot integer;
  v_id uuid;
  v_han timestamptz;
BEGIN
  IF p_cau_hinh_id IS NULL OR p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu kỳ thi hoặc người học';
  END IF;

  -- Tuần tự hóa mọi lần tạo lượt của cùng (người học, kỳ thi) đến hết giao dịch.
  PERFORM pg_advisory_xact_lock(
    hashtext('dao_tao_lan_thi'),
    hashtext(p_auth_user_id::text || ':' || p_cau_hinh_id::text)
  );

  SELECT so_lan_cho_phep INTO v_so_lan
    FROM public.dao_tao_cau_hinh
   WHERE id = p_cau_hinh_id AND loai_cau_hinh = 'thi_that';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'KHONG_TIM_THAY_KY');
  END IF;
  IF v_so_lan IS NULL OR v_so_lan < 1 THEN v_so_lan := 1; END IF;

  SELECT count(*) INTO v_tieu_luot
    FROM public.dao_tao_lan_thi
   WHERE cau_hinh_id = p_cau_hinh_id
     AND auth_user_id = p_auth_user_id
     AND trang_thai IN ('da_nop', 'het_gio', 'dang_lam');

  IF v_tieu_luot >= v_so_lan THEN
    RETURN jsonb_build_object('success', false, 'code', 'HET_LUOT');
  END IF;

  INSERT INTO public.dao_tao_lan_thi (
    che_do, cau_hinh_id, auth_user_id, form_thong_tin, seed, so_cau, thoi_gian_phut,
    bat_dau_luc, han_nop_luc, trang_thai, quota_report, de_snapshot
  ) VALUES (
    'thi_that', p_cau_hinh_id, p_auth_user_id, coalesce(p_form_thong_tin, '{}'::jsonb), p_seed,
    p_so_cau, p_thoi_gian_phut, coalesce(p_bat_dau_luc, now()), p_han_nop_luc, 'dang_lam',
    coalesce(p_quota_report, '{}'::jsonb), coalesce(p_de_snapshot, '[]'::jsonb)
  )
  RETURNING id, han_nop_luc INTO v_id, v_han;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'han_nop_luc', v_han);
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_dao_tao_tao_luot_thi_that(uuid, uuid, jsonb, text, integer, integer, timestamptz, timestamptz, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_dao_tao_tao_luot_thi_that(uuid, uuid, jsonb, text, integer, integer, timestamptz, timestamptz, jsonb, jsonb)
  TO service_role;
