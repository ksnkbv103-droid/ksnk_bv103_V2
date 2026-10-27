-- Lát CS-GATE (phần DB): chống đua khi quét + khóa cổng mẻ ở DB + quét lại Cấp phát không ghi đè
-- + BI âm không ghi lên mẻ đã đóng + gói UOT/RACH/BAN một chiều.
-- Additive: không đổi chữ ký hàm, không DROP bảng. Giữ ngữ nghĩa hiện hành, chỉ đưa luật TS xuống DB.
--
-- Nguồn luật (không bịa luật mới):
--   BD đầu ngày  : src/lib/domain/cssd-steam-daily-bd.ts `assertSteamDailyBdForLoad` (requireRecorded=true,
--                  TS gọi ở tạo mẻ + chốt nạp `cssd-batch.actions.ts`).
--   Phương pháp  : `fn_cssd_me_phuong_phap` + `fn_cssd_me_ly_do_lech_phuong_phap(bo, pp, chuong_trinh)` đang dùng ở
--                  `rpc_cssd_me_add_quy_trinh`; nay kiểm lại ở `rpc_cssd_me_bat_dau`.
--   Cấp phát     : `trg_cssd_guard_pack_issuance` chỉ kiểm lần đầu (NULL → có); lần quét lại ghi đè giờ/người cấp.
--   BI âm        : `persist-me-tiet-khuan.ts` (commit 87447e7d) chặn BI âm trên mẻ THU_HOI/QC_KHONG_DAT.
--   Gói một chiều: `cssd-pack-issuance.ts` — ướt/rách/bẩn = bẩn, phải tái xử lý; ô tình trạng không được đưa về Bình thường.

-- =====================================================================================
-- 1) Một chu trình active cho mỗi bộ / mỗi mã bộ (chu trình gốc, không tính SUB có quy_trinh_cha_id).
--    DEFERRABLE INITIALLY DEFERRED: các RPC hiện có INSERT chu trình mới rồi mới tắt chu trình cũ trong cùng
--    transaction (rpc_scan_workflow_station_impl CAP_PHAT→TIEP_NHAN, rpc_cssd_me_thu_hoi) — kiểm tại COMMIT.
--    Loại trừ chu trình đang CHO_THU_VE: luồng nhận lại (recall-receive.application.ts) chèn chu trình mới
--    bằng một lệnh REST riêng trước khi tắt chu trình cũ (đang is_dong_bang + metadata.thu_hoi CHO_THU_VE).
-- =====================================================================================
ALTER TABLE public.cssd_fact_quy_trinh
  DROP CONSTRAINT IF EXISTS ex_cssd_qt_mot_chu_trinh_active_bo;
ALTER TABLE public.cssd_fact_quy_trinh
  ADD CONSTRAINT ex_cssd_qt_mot_chu_trinh_active_bo
  EXCLUDE USING btree (bo_dung_cu_id WITH =)
  WHERE (
    is_active = true
    AND quy_trinh_cha_id IS NULL
    AND bo_dung_cu_id IS NOT NULL
    AND coalesce(metadata -> 'thu_hoi' ->> 'trang_thai', '') <> 'CHO_THU_VE'
  )
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.cssd_fact_quy_trinh
  DROP CONSTRAINT IF EXISTS ex_cssd_qt_mot_chu_trinh_active_ma;
ALTER TABLE public.cssd_fact_quy_trinh
  ADD CONSTRAINT ex_cssd_qt_mot_chu_trinh_active_ma
  EXCLUDE USING btree ((upper(btrim(coalesce(ma_qr_bo_vinh_vien, ma_qr_quy_trinh)))) WITH =)
  WHERE (
    is_active = true
    AND quy_trinh_cha_id IS NULL
    AND coalesce(ma_qr_bo_vinh_vien, ma_qr_quy_trinh) IS NOT NULL
    AND coalesce(metadata -> 'thu_hoi' ->> 'trang_thai', '') <> 'CHO_THU_VE'
  )
  DEFERRABLE INITIALLY DEFERRED;

-- =====================================================================================
-- 2) Quét trạm: khóa dòng chu trình (FOR UPDATE) rồi mới kiểm trạm → hai phiên quét cùng bộ chạy tuần tự;
--    phiên sau thấy trạng thái mới (hoặc chu trình đã tắt) và bị từ chối thay vì ghi chồng / mở 2 chu trình.
--    Phần còn lại giữ nguyên định nghĩa hiện hành.
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.rpc_scan_workflow_station_impl(p_ma_qr text, p_target_station text, p_operator_label text DEFAULT 'CSSD'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_row RECORD;
  v_qt_id uuid;
  v_current_ma text;
  v_target_id uuid;
  v_current_idx int;
  v_target_idx int;
  v_operator_id uuid;
  v_me RECORD;
  v_sub_block int;
  v_sub_codes text;
  v_bo_vinh_vien text;
BEGIN
  IF upper(trim(coalesce(p_target_station, ''))) = 'TIET_KHUAN' THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Không xử lý tiệt khuẩn bằng quét tại trang này khi chưa có phiếu mẻ. Vào Mẻ tiệt khuẩn: tạo phiếu, rồi quét QR bộ trong màn hình mẻ.'
    );
  END IF;

  SELECT ns.id INTO v_operator_id
  FROM public.mdm_nhan_su ns
  LEFT JOIN auth.users au ON au.id = ns.auth_user_id
  WHERE ns.is_active = true
    AND (
      lower(trim(coalesce(ns.extra_data ->> 'email', ''))) = lower(trim(p_operator_label))
      OR lower(trim(coalesce(au.email, ''))) = lower(trim(p_operator_label))
    )
  LIMIT 1;

  v_qt_id := public.fn_cssd_resolve_active_quy_trinh_id(p_ma_qr);
  IF v_qt_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ hoặc bộ chưa được tiếp nhận.');
  END IF;

  -- CS-GATE: khóa chu trình trước (is_active đánh giá lại sau khi chờ khóa), rồi đọc trạm ở câu lệnh
  -- riêng — snapshot mới thấy dữ liệu phiên kia đã commit (JOIN trong cùng câu FOR UPDATE sẽ mất trạm).
  PERFORM 1
  FROM public.cssd_fact_quy_trinh q
  WHERE q.id = v_qt_id
    AND q.is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Bộ ' || p_ma_qr || ' vừa được thao tác ở phiên khác — quét lại để xem trạng thái mới.'
    );
  END IF;

  SELECT q.*, t.ma_tram AS ma_tram_hien_tai
  INTO v_row
  FROM public.cssd_fact_quy_trinh q
  LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
  WHERE q.id = v_qt_id;

  IF coalesce(v_row.is_dong_bang, false) = true THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Bộ dụng cụ ' || p_ma_qr || ' đang bị khóa an toàn (đóng băng).'
    );
  END IF;

  SELECT id INTO v_target_id
  FROM public.cssd_dm_tram
  WHERE upper(trim(ma_tram)) = upper(trim(p_target_station)) AND is_active = true
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Trạm không hợp lệ: ' || coalesce(p_target_station, ''));
  END IF;

  v_current_ma := coalesce(v_row.ma_tram_hien_tai, '');

  v_current_idx := CASE v_current_ma
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  v_target_idx := CASE upper(trim(p_target_station))
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  IF v_current_ma = 'TIET_KHUAN' AND upper(trim(p_target_station)) = 'CAP_PHAT' THEN
    RETURN json_build_object(
      'success', false,
      'message',
      'Bộ đang ở tiệt khuẩn: hoàn tất mẻ TK (QC) trước — hệ thống tự chuyển Cấp phát khi mẻ đạt.'
    );
  END IF;

  IF v_current_ma = 'TIEP_NHAN' AND upper(trim(p_target_station)) = 'TIEP_NHAN' THEN
    IF v_row.thoi_gian_tiep_nhan IS NOT NULL THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Bộ đã tiếp nhận — chuyển sang Làm sạch.'
      );
    END IF;
  ELSIF NOT (v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN') THEN
    IF v_target_idx != v_current_idx + 1 THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Sai trạm! Quy trình đang ở bước ' || coalesce(nullif(v_current_ma, ''), '—')
      );
    END IF;
  END IF;

  IF upper(trim(p_target_station)) = 'CAP_PHAT' THEN
    IF v_row.lo_tiet_khuan_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Bộ dụng cụ này CHƯA VÀO MẺ TIỆT KHUẨN. Không thể cấp phát.'
      );
    END IF;

    SELECT ma_lo_tiet_khuan, ket_qua_test
    INTO v_me
    FROM public.cssd_fact_lo_tiet_khuan
    WHERE id = v_row.lo_tiet_khuan_id
    FOR SHARE;

    IF NOT FOUND OR v_me.ket_qua_test IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Mẻ tiệt khuẩn ' || coalesce(v_me.ma_lo_tiet_khuan, 'liên quan') || ' CHƯA CÓ KẾT QUẢ NỘI KIỂM.'
      );
    END IF;

    IF v_me.ket_qua_test = false THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Mẻ tiệt khuẩn ' || v_me.ma_lo_tiet_khuan || ' KHÔNG ĐẠT. Bộ phải được tái xử lý.'
      );
    END IF;

    SELECT count(*)::int, string_agg(upper(trim(sub.ma_qr_quy_trinh)), ', ' ORDER BY sub.ma_qr_quy_trinh)
    INTO v_sub_block, v_sub_codes
    FROM public.cssd_fact_quy_trinh sub
    LEFT JOIN public.cssd_dm_tram tr ON tr.id = sub.tram_hien_tai_id
    WHERE sub.quy_trinh_cha_id = v_row.id
      AND sub.is_active = true
      AND coalesce(sub.ma_vai_tro_bo, 'DON') = 'SUB'
      AND coalesce(upper(tr.ma_tram), '') <> 'CAP_PHAT';

    IF coalesce(v_sub_block, 0) > 0 THEN
      RETURN json_build_object(
        'success', false,
        'message',
        'Cảnh báo hội quân (merge): bộ còn ' || v_sub_block || ' kiện phụ chưa ở Cấp phát. QR phụ: ' || coalesce(v_sub_codes, '—') || '.'
      );
    END IF;
  END IF;

  v_bo_vinh_vien := coalesce(v_row.ma_qr_bo_vinh_vien, v_row.ma_qr_quy_trinh);

  IF v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN' THEN
    INSERT INTO public.cssd_fact_quy_trinh(
      ma_qr_quy_trinh,
      ma_qr_bo_vinh_vien,
      bo_dung_cu_id,
      tram_hien_tai_id,
      suds_count,
      tinh_trang,
      is_dong_bang,
      is_active,
      created_at,
      updated_at,
      thoi_gian_tiep_nhan,
      nguoi_tiep_nhan_id
    ) VALUES (
      p_ma_qr,
      v_bo_vinh_vien,
      v_row.bo_dung_cu_id,
      v_target_id,
      coalesce(v_row.suds_count, 0) + 1,
      'BINH_THUONG',
      false,
      true,
      now(),
      now(),
      now(),
      v_operator_id
    );
    UPDATE public.cssd_fact_quy_trinh
    SET is_active = false, updated_at = now()
    WHERE id = v_row.id;
  ELSE
    UPDATE public.cssd_fact_quy_trinh
    SET
      tram_hien_tai_id = v_target_id,
      updated_at = now(),
      thoi_gian_tiep_nhan = CASE WHEN upper(trim(p_target_station)) = 'TIEP_NHAN' THEN now() ELSE thoi_gian_tiep_nhan END,
      nguoi_tiep_nhan_id = CASE WHEN upper(trim(p_target_station)) = 'TIEP_NHAN' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_tiep_nhan_id END,
      thoi_gian_lam_sach = CASE WHEN p_target_station = 'LAM_SACH' THEN now() ELSE thoi_gian_lam_sach END,
      nguoi_lam_sach_id = CASE WHEN p_target_station = 'LAM_SACH' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_lam_sach_id END,
      thoi_gian_qc = CASE WHEN p_target_station = 'QC' THEN now() ELSE thoi_gian_qc END,
      nguoi_kiem_tra_id = CASE WHEN p_target_station = 'QC' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_kiem_tra_id END,
      thoi_gian_dong_goi = CASE WHEN p_target_station = 'DONG_GOI' THEN now() ELSE thoi_gian_dong_goi END,
      nguoi_dong_goi_id = CASE WHEN p_target_station = 'DONG_GOI' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_dong_goi_id END,
      thoi_gian_tiet_khuan = CASE WHEN p_target_station = 'TIET_KHUAN' THEN now() ELSE thoi_gian_tiet_khuan END,
      nguoi_tiet_khuan_id = CASE WHEN p_target_station = 'TIET_KHUAN' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_tiet_khuan_id END,
      thoi_gian_cap_phat = CASE WHEN p_target_station = 'CAP_PHAT' THEN now() ELSE thoi_gian_cap_phat END,
      nguoi_cap_phat_id = CASE WHEN p_target_station = 'CAP_PHAT' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_cap_phat_id END
    WHERE id = v_row.id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'data', jsonb_build_object('den', upper(trim(p_target_station)), 'operator', p_operator_label)
  );
END;
$function$;

-- =====================================================================================
-- 3) Quét lại Cấp phát không ghi đè: đã có thoi_gian_cap_phat thì không đổi giờ cấp phát,
--    không đổi người cấp phát đã ghi. (Lần đầu NULL → có vẫn qua trg_cssd_guard_pack_issuance.)
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.fn_cssd_guard_cap_phat_khong_ghi_de()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cho phép xóa về NULL (sự cố trả bộ về trạm trước, đã lưu ảnh chụp before); chỉ chặn đổi sang giá trị khác.
  IF (NEW.thoi_gian_cap_phat IS NOT NULL AND NEW.thoi_gian_cap_phat IS DISTINCT FROM OLD.thoi_gian_cap_phat)
     OR (OLD.nguoi_cap_phat_id IS NOT NULL AND NEW.nguoi_cap_phat_id IS NOT NULL
         AND NEW.nguoi_cap_phat_id IS DISTINCT FROM OLD.nguoi_cap_phat_id) THEN
    RAISE EXCEPTION 'Bộ đã cấp phát lúc % — không ghi đè giờ/người cấp phát. Quét lại chỉ để in lại phiếu.',
      to_char(OLD.thoi_gian_cap_phat AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_guard_cap_phat_khong_ghi_de() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cssd_guard_cap_phat_khong_ghi_de ON public.cssd_fact_quy_trinh;
CREATE TRIGGER trg_cssd_guard_cap_phat_khong_ghi_de
  BEFORE UPDATE OF thoi_gian_cap_phat, nguoi_cap_phat_id ON public.cssd_fact_quy_trinh
  FOR EACH ROW
  WHEN (OLD.thoi_gian_cap_phat IS NOT NULL)
  EXECUTE FUNCTION public.fn_cssd_guard_cap_phat_khong_ghi_de();

-- =====================================================================================
-- 4) Gói ướt/rách/bẩn một chiều: trên cùng chu trình, không đổi tình trạng về giá trị "sạch".
--    Cho phép: sang giá trị xấu khác, sang HONG/MAT (sự cố), hoặc khi cùng lệnh đổi trạm
--    (kết luận mẻ fn_cssd_me_chuyen_bo_kho_vo_khuan ghi BINH_THUONG lúc TIET_KHUAN → CAP_PHAT).
--    Chu trình mới (tái xử lý) là dòng mới, không bị ảnh hưởng.
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.fn_cssd_tinh_trang_goi_xau(p_tinh text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH t AS (SELECT upper(regexp_replace(btrim(coalesce(p_tinh, '')), '\s+', '_', 'g')) AS v)
  SELECT v IN ('UOT', 'GOI_UOT', 'WET', 'RACH', 'TORN', 'DAMAGED', 'BAN')
      OR v LIKE '%UOT%' OR v LIKE '%WET%' OR v LIKE '%RACH%' OR v LIKE '%TORN%'
      OR v LIKE 'BAN\_%'
  FROM t;
$$;

CREATE OR REPLACE FUNCTION public.fn_cssd_guard_tinh_trang_goi_mot_chieu()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new text := upper(regexp_replace(btrim(coalesce(NEW.tinh_trang, '')), '\s+', '_', 'g'));
BEGIN
  IF public.fn_cssd_tinh_trang_goi_xau(OLD.tinh_trang)
     AND NOT public.fn_cssd_tinh_trang_goi_xau(NEW.tinh_trang)
     AND v_new NOT IN ('HONG', 'MAT')
     AND NEW.tram_hien_tai_id IS NOT DISTINCT FROM OLD.tram_hien_tai_id THEN
    RAISE EXCEPTION 'Gói đã ghi % (ướt/rách/bẩn) — không đổi lại thành % trên cùng chu trình. Chuyển tái xử lý (làm sạch).',
      OLD.tinh_trang, coalesce(NEW.tinh_trang, '—')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_tinh_trang_goi_xau(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_tinh_trang_goi_xau(text) TO service_role;
REVOKE ALL ON FUNCTION public.fn_cssd_guard_tinh_trang_goi_mot_chieu() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cssd_guard_tinh_trang_goi_mot_chieu ON public.cssd_fact_quy_trinh;
CREATE TRIGGER trg_cssd_guard_tinh_trang_goi_mot_chieu
  BEFORE UPDATE OF tinh_trang ON public.cssd_fact_quy_trinh
  FOR EACH ROW
  WHEN (OLD.tinh_trang IS DISTINCT FROM NEW.tinh_trang)
  EXECUTE FUNCTION public.fn_cssd_guard_tinh_trang_goi_mot_chieu();

-- =====================================================================================
-- 5) BI âm không ghi lên mẻ đã đóng (THU_HOI / QC_KHONG_DAT) — tránh xóa dấu BI dương.
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.fn_cssd_guard_bi_am_me_dong()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (upper(coalesce(NEW.trang_thai_bi, '')) = 'AM'
        AND upper(coalesce(OLD.trang_thai_bi, '')) IS DISTINCT FROM 'AM')
     OR (NEW.ket_qua_bi IS TRUE AND OLD.ket_qua_bi IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'Mẻ % đã thu hồi hoặc không đạt QC — không ghi BI âm lên mẻ này (tránh xóa dấu BI dương).',
      coalesce(OLD.ma_lo_tiet_khuan, OLD.id::text)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_guard_bi_am_me_dong() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cssd_guard_bi_am_me_dong ON public.cssd_fact_lo_tiet_khuan;
CREATE TRIGGER trg_cssd_guard_bi_am_me_dong
  BEFORE UPDATE OF trang_thai_bi, ket_qua_bi ON public.cssd_fact_lo_tiet_khuan
  FOR EACH ROW
  WHEN (upper(coalesce(OLD.trang_thai_me, '')) IN ('THU_HOI', 'QC_KHONG_DAT'))
  EXECUTE FUNCTION public.fn_cssd_guard_bi_am_me_dong();

-- =====================================================================================
-- 6) Cổng mẻ ở DB.
-- 6a) Bowie–Dick đầu ngày (máy hơi nước) — khớp assertSteamDailyBdForLoad(requireRecorded=true):
--     KHONG_DAT hôm nay → chặn; có mốc bd_hold_bao_tri_xong_at → cần BD ĐẠT hôm nay ghi sau mốc;
--     thiếu BD ĐẠT hôm nay → chặn. Ngày theo Asia/Ho_Chi_Minh.
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.fn_cssd_me_assert_bd_dau_ngay(p_thiet_bi_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_specs jsonb;
  v_today text := to_char((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD');
  v_ymd text;
  v_kq text;
  v_at timestamptz;
  v_hold timestamptz;
BEGIN
  IF public.fn_cssd_me_phuong_phap(p_thiet_bi_id) IS DISTINCT FROM 'HOI_NUOC' THEN
    RETURN;
  END IF;

  SELECT coalesce(tb.specs, '{}'::jsonb) INTO v_specs
  FROM public.cssd_dm_thiet_bi tb
  WHERE tb.id = p_thiet_bi_id;

  v_ymd := left(btrim(coalesce(v_specs ->> 'bd_dau_ngay_ymd', '')), 10);
  v_kq := upper(btrim(coalesce(v_specs ->> 'bd_dau_ngay_ket_qua', '')));

  IF v_ymd = v_today AND v_kq = 'KHONG_DAT' THEN
    RAISE EXCEPTION 'Bowie–Dick đầu ngày KHÔNG ĐẠT — máy tạm giữ; chỉ mở lại sau bảo trì xong và BD đạt mới.';
  END IF;

  IF nullif(btrim(coalesce(v_specs ->> 'bd_hold_bao_tri_xong_at', '')), '') IS NOT NULL THEN
    IF v_ymd IS DISTINCT FROM v_today OR v_kq IS DISTINCT FROM 'DAT' THEN
      RAISE EXCEPTION 'Máy tạm giữ sau BD hỏng — cần bảo trì xong và ghi BD đạt mới trước khi tạo mẻ.';
    END IF;
    BEGIN
      v_hold := (v_specs ->> 'bd_hold_bao_tri_xong_at')::timestamptz;
    EXCEPTION WHEN others THEN
      v_hold := NULL;
    END;
    BEGIN
      v_at := nullif(btrim(coalesce(v_specs ->> 'bd_dau_ngay_at', '')), '')::timestamptz;
    EXCEPTION WHEN others THEN
      v_at := NULL;
    END;
    IF v_hold IS NOT NULL AND (v_at IS NULL OR v_at < v_hold) THEN
      RAISE EXCEPTION 'Cần ghi Bowie–Dick ĐẠT sau khi hoàn thành bảo trì.';
    END IF;
  END IF;

  IF v_ymd = v_today AND v_kq = 'DAT' THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Máy hơi nước chưa có Bowie–Dick đầu ngày ĐẠT hôm nay — ghi nhận BD trước khi tạo mẻ.';
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_me_assert_bd_dau_ngay(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_me_assert_bd_dau_ngay(uuid) TO service_role;

-- 6b) rpc_cssd_me_tao: thay kiểm BD nội tuyến bằng hàm chung (thêm luật KHONG_DAT/mốc bảo trì như TS).
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_tao(p_thiet_bi_id uuid, p_actor_user_id uuid, p_ghi_chu text DEFAULT NULL::text, p_chuong_trinh text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tb public.cssd_dm_thiet_bi%ROWTYPE;
  v_pp text;
  v_token text;
  v_ddmmyy text;
  v_seq int;
  v_ma text;
  v_chuong text;
  v_today date;
  v_id uuid;
  v_open text;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;
  IF p_thiet_bi_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu máy tiệt khuẩn.';
  END IF;

  SELECT * INTO v_tb
  FROM public.cssd_dm_thiet_bi
  WHERE id = p_thiet_bi_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy thiết bị.';
  END IF;
  IF coalesce(v_tb.trang_thai, '') NOT IN ('READY', 'HOAT_DONG') THEN
    RAISE EXCEPTION 'Thiết bị không sẵn sàng. Không tạo mẻ.';
  END IF;

  v_pp := public.fn_cssd_me_phuong_phap(p_thiet_bi_id);
  IF v_pp IS NULL THEN
    RAISE EXCEPTION 'Chỉ máy tiệt khuẩn (hơi nước, plasma, EO) mới tạo được mẻ.';
  END IF;

  v_today := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  PERFORM public.fn_cssd_me_assert_bd_dau_ngay(p_thiet_bi_id);

  SELECT ma_lo_tiet_khuan INTO v_open
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE thiet_bi_id = p_thiet_bi_id
    AND is_active = true
    AND ket_qua_test IS NULL
    AND coalesce(trang_thai_me, '') NOT IN ('CHO_BI', 'HOAN_THANH', 'QC_KHONG_DAT', 'THU_HOI')
  LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'Máy đang có mẻ chưa kết luận (%). Kết thúc mẻ đó trước khi tạo mẻ mới.', v_open;
  END IF;

  v_token := left(
    upper(regexp_replace(coalesce(nullif(btrim(v_tb.ma_thiet_bi), ''), nullif(btrim(v_tb.ten_thiet_bi), ''), 'MAY'), '[^A-Za-z0-9]+', '', 'g')),
    12
  );
  IF coalesce(v_token, '') = '' THEN
    v_token := 'MAY';
  END IF;
  v_ddmmyy := to_char(v_today, 'DDMMYY');
  SELECT count(*)::int INTO v_seq
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE thiet_bi_id = p_thiet_bi_id
    AND (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = v_today;
  v_seq := coalesce(v_seq, 0);
  LOOP
    v_seq := v_seq + 1;
    v_ma := v_token || '-' || v_ddmmyy || '-' || v_seq::text;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.cssd_fact_lo_tiet_khuan WHERE ma_lo_tiet_khuan = v_ma
    );
    IF v_seq > 500 THEN
      RAISE EXCEPTION 'Không sinh được mã mẻ.';
    END IF;
  END LOOP;

  v_chuong := nullif(left(btrim(coalesce(p_chuong_trinh, '')), 80), '');
  IF v_chuong IS NULL THEN
    SELECT nullif(left(btrim(chuong_trinh), 80), '') INTO v_chuong
    FROM public.cssd_fact_lo_tiet_khuan
    WHERE thiet_bi_id = p_thiet_bi_id
      AND nullif(btrim(chuong_trinh), '') IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  IF v_chuong IS NULL THEN
    v_chuong := nullif(left(btrim(coalesce(v_tb.specs->>'chuong_trinh', v_tb.specs->>'chuong_trinh_mac_dinh', '')), 80), '');
  END IF;

  INSERT INTO public.cssd_fact_lo_tiet_khuan (
    ma_lo_tiet_khuan, thiet_bi_id, loai_may_id, phuong_phap, chuong_trinh,
    ghi_chu, is_active, trang_thai_me, updated_at
  ) VALUES (
    v_ma, p_thiet_bi_id, v_tb.loai_may_id, v_pp, v_chuong,
    nullif(btrim(coalesce(p_ghi_chu, '')), ''), true, 'DANG_CHUAN_NAP', now()
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'ma_lo_tiet_khuan', v_ma,
    'phuong_phap', v_pp,
    'chuong_trinh', v_chuong,
    'loai_may_id', v_tb.loai_may_id
  );
END;
$function$;

-- 6c) rpc_cssd_me_bat_dau (chốt nạp): thêm BD đầu ngày (TS đã kiểm ở confirmBatDauTietKhuanBatch),
--     phương pháp mẻ phải khớp máy, và kiểm lại PP từng bộ như lúc nạp (catalog có thể đổi giữa nạp và chốt).
--     Khóa máy FOR SHARE để không đua với việc ghi BD/đổi trạng thái máy.
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_bat_dau(p_me_id uuid, p_actor_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_ids uuid[];
  v_id uuid;
  v_ma text;
  v_tram text;
  v_active boolean;
  v_dong boolean;
  v_role text;
  v_bo uuid;
  v_may_tt text;
  v_steam boolean;
  v_heat text;
  v_dong_goi uuid;
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
  v_pp_may text;
  v_pp_me text;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ.';
  END IF;
  IF v_me.tk_chot_nap_at IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã bắt đầu tiệt khuẩn trước đó.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã kết thúc đánh giá — không thể bắt đầu lại.';
  END IF;
  IF coalesce(v_me.trang_thai_me, '') = 'CHO_BI' THEN
    RAISE EXCEPTION 'Mẻ đang chờ BI — không bắt đầu lại.';
  END IF;
  IF v_me.thiet_bi_id IS NULL THEN
    RAISE EXCEPTION 'Mẻ chưa gắn máy — không bắt đầu tiệt khuẩn.';
  END IF;

  SELECT tb.trang_thai INTO v_may_tt
  FROM public.cssd_dm_thiet_bi tb
  WHERE tb.id = v_me.thiet_bi_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy thiết bị.';
  END IF;
  IF coalesce(v_may_tt, '') NOT IN ('READY', 'HOAT_DONG') THEN
    RAISE EXCEPTION 'Thiết bị không sẵn sàng (%). Không thể bắt đầu mẻ.', coalesce(v_may_tt, '—');
  END IF;

  -- CS-GATE: phương pháp mẻ phải khớp máy; BD đầu ngày ĐẠT cho máy hơi nước.
  v_pp_may := public.fn_cssd_me_phuong_phap(v_me.thiet_bi_id);
  IF v_pp_may IS NULL THEN
    RAISE EXCEPTION 'Chỉ máy tiệt khuẩn (hơi nước, plasma, EO) mới bắt đầu được mẻ.';
  END IF;
  v_pp_me := upper(nullif(btrim(coalesce(v_me.phuong_phap, '')), ''));
  IF v_pp_me IS NOT NULL AND v_pp_me IS DISTINCT FROM v_pp_may THEN
    RAISE EXCEPTION 'Phương pháp mẻ (%) không khớp máy (%) — không bắt đầu mẻ.', v_pp_me, v_pp_may;
  END IF;
  PERFORM public.fn_cssd_me_assert_bd_dau_ngay(v_me.thiet_bi_id);

  SELECT coalesce(array_agg(s.id), ARRAY[]::uuid[])
  INTO v_ids
  FROM (
    SELECT q.id
    FROM public.cssd_fact_quy_trinh q
    WHERE q.lo_tiet_khuan_id = p_me_id
    ORDER BY q.id
    FOR UPDATE OF q
  ) s;

  v_expect := coalesce(cardinality(v_ids), 0);
  IF v_expect = 0 THEN
    RAISE EXCEPTION 'Chưa có bộ nào trong mẻ — không thể bắt đầu tiệt khuẩn.';
  END IF;

  v_steam := public.fn_cssd_me_may_la_hoi_nuoc(v_me.thiet_bi_id);

  FOREACH v_id IN ARRAY v_ids LOOP
    SELECT
      coalesce(nullif(btrim(q.ma_qr_quy_trinh), ''), v_id::text),
      coalesce(q.is_active, false),
      coalesce(q.is_dong_bang, false),
      q.ma_vai_tro_bo,
      q.bo_dung_cu_id,
      t.ma_tram
    INTO v_ma, v_active, v_dong, v_role, v_bo, v_tram
    FROM public.cssd_fact_quy_trinh q
    LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
    WHERE q.id = v_id;

    IF NOT v_active THEN
      RAISE EXCEPTION 'Bộ % không còn hiệu lực — không bắt đầu mẻ.', v_ma;
    END IF;
    IF v_dong THEN
      RAISE EXCEPTION 'Bộ % đang khóa an toàn — không bắt đầu mẻ.', v_ma;
    END IF;
    IF coalesce(v_tram, '') <> 'DONG_GOI' THEN
      RAISE EXCEPTION 'Bộ % không ở ĐÓNG GÓI (hiện %) — không bắt đầu mẻ.', v_ma, coalesce(v_tram, '—');
    END IF;
    IF public.fn_cssd_me_la_bo_me_sub(v_id, v_role) THEN
      RAISE EXCEPTION 'Bộ % là bộ mẹ đã có SUB — chỉ quét bộ thành phần vào mẻ.', v_ma;
    END IF;
    IF v_steam THEN
      v_heat := public.fn_cssd_me_ly_do_chan_nhiet(v_bo);
      IF v_heat IS NOT NULL THEN
        RAISE EXCEPTION '% Bộ %.', v_heat, v_ma;
      END IF;
    END IF;
    v_heat := public.fn_cssd_me_ly_do_lech_phuong_phap(v_bo, v_pp_may, v_me.chuong_trinh);
    IF v_heat IS NOT NULL THEN
      RAISE EXCEPTION '% Bộ %.', v_heat, v_ma;
    END IF;
  END LOOP;

  SELECT t.id INTO v_dong_goi
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'DONG_GOI' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_dong_goi IS NULL OR v_tk IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm ĐÓNG GÓI hoặc TIỆT KHUẨN.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET tk_chot_nap_at = v_now,
      thoi_gian_bat_dau = v_now,
      nguoi_bat_dau_id = p_actor_user_id,
      trang_thai_me = 'DANG_TIET_KHUAN',
      updated_at = v_now
  WHERE id = p_me_id
    AND tk_chot_nap_at IS NULL
    AND ket_qua_test IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Mẻ đã bắt đầu hoặc đã kết luận — không ghi đè.';
  END IF;

  UPDATE public.cssd_fact_quy_trinh AS q
  SET tram_hien_tai_id = v_tk,
      updated_at = v_now
  WHERE q.lo_tiet_khuan_id = p_me_id
    AND q.id = ANY (v_ids)
    AND q.is_active = true
    AND coalesce(q.is_dong_bang, false) = false
    AND q.tram_hien_tai_id = v_dong_goi;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> v_expect THEN
    RAISE EXCEPTION 'Không cập nhật đủ bộ khi bắt đầu mẻ — thao tác đã hủy.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_ids', to_jsonb(v_ids));
END;
$function$;

-- Giữ ACL hiện hành (CREATE OR REPLACE không đổi ACL); nhắc lại tường minh cho chắc.
REVOKE ALL ON FUNCTION public.rpc_scan_workflow_station_impl(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_scan_workflow_station_impl(text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_tao(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_tao(uuid, uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_bat_dau(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_bat_dau(uuid, uuid) TO service_role;

-- =====================================================================================
-- CHƯA APPLY PROD — chờ PO.
-- Trước khi apply prod, chạy (chỉ đọc) — phải trả 0 dòng, nếu không ADD CONSTRAINT sẽ lỗi:
--   SELECT 'bo' k, bo_dung_cu_id::text v, count(*) FROM public.cssd_fact_quy_trinh
--   WHERE is_active AND quy_trinh_cha_id IS NULL AND bo_dung_cu_id IS NOT NULL
--     AND coalesce(metadata->'thu_hoi'->>'trang_thai','') <> 'CHO_THU_VE'
--   GROUP BY 2 HAVING count(*) > 1
--   UNION ALL
--   SELECT 'ma', upper(btrim(coalesce(ma_qr_bo_vinh_vien, ma_qr_quy_trinh))), count(*) FROM public.cssd_fact_quy_trinh
--   WHERE is_active AND quy_trinh_cha_id IS NULL AND coalesce(ma_qr_bo_vinh_vien, ma_qr_quy_trinh) IS NOT NULL
--     AND coalesce(metadata->'thu_hoi'->>'trang_thai','') <> 'CHO_THU_VE'
--   GROUP BY 2 HAVING count(*) > 1;
-- Kiểm gói xấu đang có trên prod (thông tin):
--   SELECT tinh_trang, count(*) FROM public.cssd_fact_quy_trinh WHERE is_active GROUP BY 1;
-- =====================================================================================
