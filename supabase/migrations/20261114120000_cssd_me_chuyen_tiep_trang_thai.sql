-- L4a (KH_APPKSNK_20261113 §4–5; đặc tả M05 §4.1 «Mẻ tiệt khuẩn S_ME»).
-- Bảng khai báo cặp chuyển trạng thái `cssd_fact_lo_tiet_khuan.trang_thai_me` + trigger chặn cặp không khai báo.
-- Phạm vi: CHỈ 8 trạng thái hiện có + NULL; không thêm trạng thái, không sửa RPC cssd_me_*.
-- Tên tương đương đặc tả: DANG_TIET_KHUAN≈S_ME_DANG_CHAY, CHO_DANH_GIA_QC≈S_ME_CHO_KIEM_TRA,
--   QC_KHONG_DAT≈S_ME_CACH_LY, HOAN_THANH≈S_ME_DA_XUAT (gộp S_ME_CHO_DUYET), CHO_BI≈S_ME_CHO_BI, THU_HOI≈S_ME_THU_HOI.
--   DANG_CHUAN_NAP / DA_CHOT_NAP: trước S_ME_DANG_CHAY (khai báo tải B5.08), đặc tả chưa có nút riêng.
-- Danh sách cặp lập từ bản CREATE OR REPLACE mới nhất (pg_get_functiondef trên DB local, sau 20261114110000) của:
--   rpc_cssd_me_ket_thuc_nap, _bat_dau, _ket_thuc_tiet_khuan, _ket_luan_dat, _ghi_cho_bi, _nhap_bi_am, _ghi_test, _thu_hoi.
--   src/ không UPDATE trực tiếp trang_thai_me. rpc_cssd_me_tao chỉ INSERT (trigger không chạy khi INSERT).
-- ghi_chu bắt đầu «TRÁI ĐẶC TẢ» = code đang dùng thật nhưng lệch §4.1 — giữ để không chặn luồng, chờ PO.

CREATE TABLE IF NOT EXISTS public.cssd_dm_me_chuyen_tiep (
  tu_trang_thai  text NOT NULL,
  den_trang_thai text NOT NULL,
  ghi_chu        text,
  dac_ta_ma      text,
  CONSTRAINT cssd_dm_me_chuyen_tiep_pkey PRIMARY KEY (tu_trang_thai, den_trang_thai),
  CONSTRAINT cssd_dm_me_chuyen_tiep_tu_chk CHECK (tu_trang_thai IN
    ('DANG_CHUAN_NAP','DA_CHOT_NAP','DANG_TIET_KHUAN','CHO_DANH_GIA_QC','CHO_BI','HOAN_THANH','QC_KHONG_DAT','THU_HOI')),
  CONSTRAINT cssd_dm_me_chuyen_tiep_den_chk CHECK (den_trang_thai IN
    ('DANG_CHUAN_NAP','DA_CHOT_NAP','DANG_TIET_KHUAN','CHO_DANH_GIA_QC','CHO_BI','HOAN_THANH','QC_KHONG_DAT','THU_HOI')),
  CONSTRAINT cssd_dm_me_chuyen_tiep_khac_chk CHECK (tu_trang_thai <> den_trang_thai)
);

COMMENT ON TABLE public.cssd_dm_me_chuyen_tiep IS
  'Cặp chuyển trạng_thai_me hợp lệ của mẻ tiệt khuẩn (M05 §4.1). Trigger trg_cssd_me_chuyen_tiep chặn cặp không có ở đây.';

INSERT INTO public.cssd_dm_me_chuyen_tiep (tu_trang_thai, den_trang_thai, ghi_chu, dac_ta_ma) VALUES
  -- @dac-ta B5.08
  ('DANG_CHUAN_NAP',  'DA_CHOT_NAP',     'rpc_cssd_me_ket_thuc_nap: chốt nạp', 'B5.08'),
  -- @dac-ta B5.10 R5.01 R5.07 R5.42
  ('DA_CHOT_NAP',     'DANG_TIET_KHUAN', 'rpc_cssd_me_bat_dau', '§4.1 B5.10; R5.01 R5.07 R5.42'),
  -- @dac-ta B5.11
  ('DANG_TIET_KHUAN', 'CHO_DANH_GIA_QC', 'rpc_cssd_me_ket_thuc_tiet_khuan', '§4.1 B5.11'),
  -- @dac-ta R5.23 R5.24
  ('CHO_DANH_GIA_QC', 'HOAN_THANH',      'rpc_cssd_me_ket_luan_dat; gộp CHO_KIEM_TRA→CHO_DUYET→DA_XUAT', '§4.1 R5.23 R5.24'),
  -- @dac-ta R5.16
  ('CHO_DANH_GIA_QC', 'CHO_BI',          'rpc_cssd_me_ghi_cho_bi', '§4.1 R5.16'),
  -- @dac-ta R5.20
  ('CHO_BI',          'HOAN_THANH',      'rpc_cssd_me_nhap_bi_am; gộp CHO_BI→CHO_DUYET→DA_XUAT', '§4.1 R5.20'),
  -- @dac-ta R5.25
  ('CHO_DANH_GIA_QC', 'QC_KHONG_DAT',    'rpc_cssd_me_ghi_test KHONG_DAT / rpc_cssd_me_thu_hoi mẻ gốc', '§4.1 R5.25'),
  -- @dac-ta R5.28
  ('CHO_BI',          'QC_KHONG_DAT',    'rpc_cssd_me_ghi_test BI DUONG / rpc_cssd_me_thu_hoi mẻ gốc', '§4.1 R5.28'),
  -- @dac-ta R5.28 R5.29
  ('HOAN_THANH',      'THU_HOI',         'rpc_cssd_me_thu_hoi BI_DUONG mẻ gốc đã nhả / mẻ khác trong phạm vi', '§4.1 R5.28 R5.29'),
  -- @dac-ta R5.29
  ('QC_KHONG_DAT',    'THU_HOI',         'rpc_cssd_me_thu_hoi mẻ khác trong phạm vi; code KHÔNG kiểm lô đã cấp phát', '§4.1 R5.29'),
  -- @dac-ta §4.1 (gộp S_ME_NGAT)
  ('DANG_TIET_KHUAN', 'QC_KHONG_DAT',    'TRÁI ĐẶC TẢ: ghi_test/thu_hoi khi đang chạy; đặc tả đi qua S_ME_NGAT', '§4.1 DANG_CHAY→NGAT→CACH_LY'),
  -- @dac-ta §4.1 (không có cạnh)
  ('DA_CHOT_NAP',     'QC_KHONG_DAT',    'TRÁI ĐẶC TẢ: ghi_test KHONG_DAT / thu_hoi trước khi chạy', '§4.1 không có'),
  -- @dac-ta §4.1 (không có cạnh)
  ('DANG_CHUAN_NAP',  'QC_KHONG_DAT',    'TRÁI ĐẶC TẢ: rpc_cssd_me_thu_hoi mẻ gốc không kiểm trạng thái', '§4.1 không có'),
  -- @dac-ta §4.1 cấm DA_XUAT về trước
  ('HOAN_THANH',      'QC_KHONG_DAT',    'TRÁI ĐẶC TẢ: ghi_test KHONG_DAT sau nhả / thu_hoi QC_FAIL; đặc tả DA_XUAT→THU_HOI', '§4.1 R5.28 R5.29'),
  -- @dac-ta §4.1 THU_HOI chỉ về DA_TAI_XU_LY
  ('THU_HOI',         'QC_KHONG_DAT',    'TRÁI ĐẶC TẢ: rpc_cssd_me_thu_hoi gọi lại trên mẻ đã THU_HOI (chuyển ngược)', '§4.1 cấm'),
  -- @dac-ta R5.29 (đặc tả: chưa XUAT → CACH_LY)
  ('CHO_BI',          'THU_HOI',         'TRÁI ĐẶC TẢ: thu_hoi phạm vi máy; đặc tả CHO_BI→CACH_LY', '§4.1 R5.29'),
  -- @dac-ta R5.29 (không có cạnh)
  ('CHO_DANH_GIA_QC', 'THU_HOI',         'TRÁI ĐẶC TẢ: thu_hoi phạm vi máy (UPDATE nhiều dòng, ELSE THU_HOI)', '§4.1 R5.29'),
  -- @dac-ta R5.29 (không có cạnh)
  ('DANG_TIET_KHUAN', 'THU_HOI',         'TRÁI ĐẶC TẢ: thu_hoi phạm vi máy (UPDATE nhiều dòng, ELSE THU_HOI)', '§4.1 R5.29'),
  -- @dac-ta R5.29 (không có cạnh)
  ('DA_CHOT_NAP',     'THU_HOI',         'TRÁI ĐẶC TẢ: thu_hoi phạm vi máy (UPDATE nhiều dòng, ELSE THU_HOI)', '§4.1 R5.29'),
  -- @dac-ta R5.29 (không có cạnh)
  ('DANG_CHUAN_NAP',  'THU_HOI',         'TRÁI ĐẶC TẢ: thu_hoi phạm vi máy (UPDATE nhiều dòng, ELSE THU_HOI)', '§4.1 R5.29')
ON CONFLICT (tu_trang_thai, den_trang_thai) DO NOTHING;

ALTER TABLE public.cssd_dm_me_chuyen_tiep ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cssd_dm_me_chuyen_tiep FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cssd_dm_me_chuyen_tiep TO authenticated, service_role;
DROP POLICY IF EXISTS cssd_dm_me_chuyen_tiep_select ON public.cssd_dm_me_chuyen_tiep;
CREATE POLICY cssd_dm_me_chuyen_tiep_select ON public.cssd_dm_me_chuyen_tiep
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.fn_cssd_guard_me_chuyen_tiep()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cssd_dm_me_chuyen_tiep c
    WHERE c.tu_trang_thai = OLD.trang_thai_me AND c.den_trang_thai = NEW.trang_thai_me
  ) THEN
    RAISE EXCEPTION 'Mẻ %: không được chuyển trạng thái từ % sang %.',
      coalesce(OLD.ma_lo_tiet_khuan, OLD.id::text), OLD.trang_thai_me, coalesce(NEW.trang_thai_me, 'NULL')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_cssd_guard_me_chuyen_tiep() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cssd_me_chuyen_tiep ON public.cssd_fact_lo_tiet_khuan;
CREATE TRIGGER trg_cssd_me_chuyen_tiep
  BEFORE UPDATE OF trang_thai_me ON public.cssd_fact_lo_tiet_khuan
  FOR EACH ROW
  WHEN (OLD.trang_thai_me IS NOT NULL AND NEW.trang_thai_me IS DISTINCT FROM OLD.trang_thai_me)
  EXECUTE FUNCTION public.fn_cssd_guard_me_chuyen_tiep();

-- CHƯA APPLY PROD — chờ PO.
-- Rủi ro chính: prod chạy bản RPC khác local → cặp chuyển khác → trigger chặn luồng thật.
-- SQL kiểm prod (chỉ đọc), chạy TRƯỚC khi apply:
-- (a) Prod có đủ migration như local (phải có tới 20261114110000 với các RPC cssd_me_*):
--   SELECT version FROM supabase_migrations.schema_migrations WHERE version >= '20261021000000' ORDER BY 1;
--   SELECT p.proname, md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prosrc ILIKE '%trang_thai_me%' ORDER BY 1;  -- so với local
-- (b) Mẻ đang dở theo trạng thái (giả định: tk_mo_form_qc_at chỉ có khi đã qua CHO_DANH_GIA_QC):
--   SELECT trang_thai_me, tk_mo_form_qc_at IS NOT NULL AS qc_mo, ket_qua_test, count(*)
--   FROM public.cssd_fact_lo_tiet_khuan GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
-- Hoàn tác: DROP TRIGGER trg_cssd_me_chuyen_tiep ON public.cssd_fact_lo_tiet_khuan; (bảng giữ lại vô hại).
