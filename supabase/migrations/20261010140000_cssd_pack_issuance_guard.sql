-- CSSD-L7: cổng cấp phát gói vô khuẩn ở DB (trước đây chỉ server TS `assertPackIssuable`).
-- ĐÃ APPLY PROD 2026-10-10 qua MCP `apply_migration` (PO duyệt). Version trên prod do MCP đặt, khác tên file — không đổi tên file.
--
-- Cấp phát = ghi `cssd_fact_quy_trinh.thoi_gian_cap_phat` lần đầu (NULL → có giá trị). Mọi đường ghi
-- (server action, RPC quét) đều đi qua trigger này, nên kiểm tra và ghi nguyên tử, không còn khe hở
-- giữa «kiểm» và «ghi». Luật khớp `src/lib/domain/cssd-pack-issuance.ts` (QT.22 / PCI.03.02):
--   khóa an toàn · cảnh báo đỏ · mẻ phải HOAN_THANH (không CHO_BI) · không sự cố tiệt khuẩn mở ·
--   tình trạng gói hợp lệ (không ướt/rách/bẩn/hỏng/mất) · có HSD và chưa quá hạn.
-- Không đổi: soft-warning thiếu cấu phần (Q2), vẫn ở server.

CREATE OR REPLACE FUNCTION public.fn_cssd_guard_pack_issuance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trang text;
  v_ket_qua boolean;
  v_tinh text;
  v_han date;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF coalesce(NEW.is_dong_bang, false) THEN
    RAISE EXCEPTION 'Bộ đang khóa an toàn — không cấp phát.';
  END IF;
  IF coalesce(NEW.is_red_alert, false) THEN
    RAISE EXCEPTION 'Bộ đang cảnh báo đỏ (sự cố) — không cấp phát cho đến khi xử lý.';
  END IF;

  IF NEW.lo_tiet_khuan_id IS NOT NULL THEN
    SELECT upper(nullif(btrim(m.trang_thai_me), '')), m.ket_qua_test
    INTO v_trang, v_ket_qua
    FROM public.cssd_fact_lo_tiet_khuan m
    WHERE m.id = NEW.lo_tiet_khuan_id;
    IF v_trang IS NULL THEN
      v_trang := CASE
        WHEN v_ket_qua IS TRUE THEN 'HOAN_THANH'
        WHEN v_ket_qua IS FALSE THEN 'QC_KHONG_DAT'
        ELSE NULL
      END;
    END IF;
  END IF;

  IF v_trang = 'CHO_BI' THEN
    RAISE EXCEPTION 'Mẻ đang chờ kết quả BI — bộ chưa được nhả, không cấp phát.';
  END IF;
  IF v_trang IS DISTINCT FROM 'HOAN_THANH' THEN
    RAISE EXCEPTION 'Mẻ của bộ chưa hoàn thành — không cấp phát.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.cssd_fact_su_co sc
    WHERE sc.is_active = true
      AND (
        sc.quy_trinh_id = NEW.id
        OR coalesce(sc.attributes ->> 'LO_TIET_KHUAN_ID', sc.attributes ->> 'lo_tiet_khuan_id') = NEW.lo_tiet_khuan_id::text
      )
      AND upper(coalesce(
            nullif(btrim(coalesce(sc.attributes ->> 'INCIDENT_STATUS', sc.attributes ->> 'incident_status', '')), ''),
            'OPEN')) IN ('OPEN', 'CONFIRMED', 'DA_XAC_NHAN')
      AND (
        upper(btrim(coalesce(sc.attributes ->> 'INCIDENT_TYPE_CODE', ''))) IN (
          'PROCESS_STERILIZATION_FAIL', 'PROCESS_STERILE_QC_FAIL', 'PROCESS_BI_POSITIVE')
        OR coalesce(sc.attributes ->> 'BATCH_RECALL', '') = '1'
        OR nullif(btrim(coalesce(sc.attributes ->> 'LO_TIET_KHUAN_ID', sc.attributes ->> 'lo_tiet_khuan_id', '')), '') IS NOT NULL
        OR upper(btrim(coalesce(sc.ma_tram_phat_hien, ''))) = 'TIET_KHUAN'
      )
  ) THEN
    RAISE EXCEPTION 'Mẻ hoặc bộ đang có sự cố tiệt khuẩn chưa đóng — không cấp phát.';
  END IF;

  v_tinh := upper(regexp_replace(btrim(coalesce(NEW.tinh_trang, '')), '\s+', '_', 'g'));
  IF v_tinh = '' THEN
    RAISE EXCEPTION 'Thiếu tình trạng gói (tinh_trang) — không cấp phát. Báo quản trị CSSD kiểm tra dữ liệu quy trình.';
  END IF;
  IF v_tinh = 'HONG' THEN
    RAISE EXCEPTION 'Bộ đã báo hỏng — không cấp phát.';
  END IF;
  IF v_tinh = 'MAT' THEN
    RAISE EXCEPTION 'Bộ đã báo mất — không cấp phát.';
  END IF;
  IF v_tinh IN ('UOT', 'GOI_UOT', 'WET', 'RACH', 'TORN', 'DAMAGED', 'BAN')
     OR v_tinh LIKE '%UOT%' OR v_tinh LIKE '%WET%' OR v_tinh LIKE '%RACH%' OR v_tinh LIKE '%TORN%'
     OR v_tinh LIKE 'BAN\_%' THEN
    RAISE EXCEPTION 'Gói ướt / rách / hỏng bao bì = bẩn (PCI.03.02) — không cấp phát. Chuyển tái xử lý (làm sạch).';
  END IF;

  -- Cùng cách TS cắt chuỗi ISO (ngày UTC của timestamp) để hai lớp không lệch nhau.
  v_han := (coalesce(NEW.han_su_dung, NEW.ngay_het_han) AT TIME ZONE 'UTC')::date;
  IF v_han IS NULL THEN
    RAISE EXCEPTION 'Thiếu hạn sử dụng (HSD) — không cấp phát. Hoàn tất mẻ tiệt khuẩn ĐẠT để gán HSD, hoặc bổ sung HSD trên quy trình.';
  END IF;
  IF v_han < v_today THEN
    RAISE EXCEPTION 'Gói đã quá hạn sử dụng (%) — không cấp phát. Thu hồi / tái xử lý.', to_char(v_han, 'YYYY-MM-DD');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_guard_pack_issuance() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cssd_guard_pack_issuance ON public.cssd_fact_quy_trinh;
CREATE TRIGGER trg_cssd_guard_pack_issuance
  BEFORE UPDATE OF thoi_gian_cap_phat ON public.cssd_fact_quy_trinh
  FOR EACH ROW
  WHEN (OLD.thoi_gian_cap_phat IS NULL AND NEW.thoi_gian_cap_phat IS NOT NULL)
  EXECUTE FUNCTION public.fn_cssd_guard_pack_issuance();
