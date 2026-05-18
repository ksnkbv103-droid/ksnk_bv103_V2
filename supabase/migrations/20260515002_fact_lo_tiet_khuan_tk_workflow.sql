-- Mẻ tiệt khuẩn: chốt nạp (bắt đầu TK) + mở form QC sau khi kết thúc chu trình vật lý; lưu payload QC mở rộng (JSON).
ALTER TABLE public.fact_lo_tiet_khuan
  ADD COLUMN IF NOT EXISTS tk_chot_nap_at timestamptz,
  ADD COLUMN IF NOT EXISTS tk_mo_form_qc_at timestamptz,
  ADD COLUMN IF NOT EXISTS tk_qc_json jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.fact_lo_tiet_khuan.tk_chot_nap_at IS 'Xác nhận bắt đầu tiệt khuẩn: khóa nạp thêm, chuyển bộ trong mẻ sang trạm TIET_KHUAN.';
COMMENT ON COLUMN public.fact_lo_tiet_khuan.tk_mo_form_qc_at IS 'Kết thúc chu trình tiệt khuẩn (vật lý): cho phép nhập thông số/đánh giá QC.';
COMMENT ON COLUMN public.fact_lo_tiet_khuan.tk_qc_json IS 'Thông số QC mẻ (máy, chỉ thị, test tùy chọn, URL ảnh minh chứng).';
