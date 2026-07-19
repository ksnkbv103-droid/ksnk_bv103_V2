-- Residual VST: cơ hội thiếu nghề → thống kê «Theo đối tượng (nghề)» = «Không rõ».
-- Không backfill đoán nghề (các dòng này thường không gắn nhan_vien_id).
-- Dùng để KSNK rà soát / sửa tay nếu cần.

SELECT
  d.id AS opportunity_id,
  d.session_id,
  d.ngay_giam_sat,
  d.khoa_id,
  d.nhan_vien_id,
  d.created_at
FROM public.gstt_fact_vst d
WHERE d.nghe_nghiep_id IS NULL
ORDER BY d.created_at DESC;
