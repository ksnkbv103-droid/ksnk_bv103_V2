-- HC-1 (handover-roadmap §5): kho hóa chất — nhập/xuất/điều chỉnh nguyên tử qua RPC.
-- Giả định (PO giao tự quyết 2026-10-21, chờ duyệt):
--  G1. Khóa pg_advisory_xact_lock theo hóa chất (dm_hoa_chat_id), không theo lô: đơn giản, ít tranh chấp ở quy mô pilot.
--  G2. Tồn lô = SUM(so_luong_co_dau) is_active, khớp lô bằng IS NOT DISTINCT FROM (ma_lo/han NULL là một lô), cùng định nghĩa view v_cssd_kho_hoa_chat_ton_lo.
--  G3. Xuất lô quá hạn (han < hôm nay giờ VN) bị chặn ở DB; điều chỉnh âm cũng chặn như TS cũ; điều chỉnh dương lô quá hạn vẫn cho (kiểm kê).
--  G4. `nguoi_thuc_hien_id` (mdm_nhan_su) điền best-effort theo mdm_nhan_su.auth_user_id; NULL nếu tài khoản không có hồ sơ nhân sự. Bản ghi cũ để NULL.
--  G5. RPC chỉ service_role (server action đã verifyPermission KSNK_KHO_HOACHAT:edit).

ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
  ADD COLUMN IF NOT EXISTS nguoi_thuc_hien_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_cssd_kho_hoa_chat_gd_nguoi_thuc_hien'
  ) THEN
    ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
      ADD CONSTRAINT fk_cssd_kho_hoa_chat_gd_nguoi_thuc_hien
      FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.cssd_fact_kho_hoa_chat_giao_dich.nguoi_thuc_hien_id IS
  'HC-1: nhân sự thực hiện giao dịch (best-effort theo auth_user_id); NULL với dữ liệu trước HC-1.';

CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(
  p_loai text,
  p_dm_hoa_chat_id uuid,
  p_so_luong numeric,
  p_ma_lo text,
  p_han_su_dung date,
  p_ghi_chu text,
  p_su_co_id uuid,
  p_actor_user_id uuid,
  p_ma_phieu text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_loai text := upper(btrim(coalesce(p_loai, '')));
  v_ma_lo text := nullif(btrim(coalesce(p_ma_lo, '')), '');
  v_delta numeric;
  v_ton numeric;
  v_ns uuid;
  v_ma text;
  v_id uuid;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF v_loai NOT IN ('NHAP', 'XUAT', 'DIEU_CHINH') THEN
    RAISE EXCEPTION 'Loại giao dịch không hợp lệ.';
  END IF;
  IF p_dm_hoa_chat_id IS NULL THEN
    RAISE EXCEPTION 'Chọn hóa chất.';
  END IF;
  IF p_so_luong IS NULL OR p_so_luong = 0 THEN
    RAISE EXCEPTION 'Số lượng phải khác 0.';
  END IF;
  IF v_loai <> 'DIEU_CHINH' AND p_so_luong <= 0 THEN
    RAISE EXCEPTION 'Số lượng % phải > 0.', CASE WHEN v_loai = 'NHAP' THEN 'nhập' ELSE 'xuất' END;
  END IF;

  -- Khóa theo hóa chất trước khi đọc tồn; kiểm tồn tại hóa chất sau khóa.
  PERFORM pg_advisory_xact_lock(hashtextextended('cssd_kho_hoa_chat:' || p_dm_hoa_chat_id::text, 0));
  IF NOT EXISTS (SELECT 1 FROM public.cssd_dm_hoa_chat WHERE id = p_dm_hoa_chat_id) THEN
    RAISE EXCEPTION 'Không tìm thấy hóa chất.';
  END IF;

  v_delta := CASE v_loai WHEN 'XUAT' THEN -p_so_luong ELSE p_so_luong END;

  IF v_delta < 0 THEN
    IF p_han_su_dung IS NOT NULL AND p_han_su_dung < v_today THEN
      RAISE EXCEPTION 'Không xuất lô đã quá hạn sử dụng. Hủy hoặc điều chỉnh tồn qua kiểm kê.';
    END IF;
    SELECT COALESCE(SUM(so_luong_co_dau), 0) INTO v_ton
      FROM public.cssd_fact_kho_hoa_chat_giao_dich
     WHERE dm_hoa_chat_id = p_dm_hoa_chat_id
       AND COALESCE(is_active, true)
       AND ma_lo IS NOT DISTINCT FROM v_ma_lo
       AND han_su_dung IS NOT DISTINCT FROM p_han_su_dung;
    IF v_ton + v_delta < 0 THEN
      IF v_loai = 'XUAT' THEN
        RAISE EXCEPTION 'Không đủ tồn tại lô đã chọn (tồn %, cần %).', v_ton, p_so_luong;
      END IF;
      RAISE EXCEPTION 'Điều chỉnh âm vượt tồn hiện có (%).', v_ton;
    END IF;
  END IF;

  SELECT ns.id INTO v_ns FROM public.mdm_nhan_su ns
   WHERE ns.auth_user_id = p_actor_user_id AND ns.is_active = true LIMIT 1;

  v_ma := coalesce(
    nullif(btrim(p_ma_phieu), ''),
    CASE v_loai WHEN 'NHAP' THEN 'NK' WHEN 'XUAT' THEN 'XK' ELSE 'DC' END || '-'
      || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDDHH24MISS') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  );

  INSERT INTO public.cssd_fact_kho_hoa_chat_giao_dich (
    ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, ma_lo, han_su_dung,
    ghi_chu, su_co_id, nguoi_thuc_hien_id, updated_at
  ) VALUES (
    v_ma, p_dm_hoa_chat_id, v_loai, v_delta, v_ma_lo, p_han_su_dung,
    nullif(btrim(coalesce(p_ghi_chu, '')), ''), p_su_co_id, v_ns, now()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text, uuid, numeric, text, date, text, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text, uuid, numeric, text, date, text, uuid, uuid, text)
  TO service_role;
