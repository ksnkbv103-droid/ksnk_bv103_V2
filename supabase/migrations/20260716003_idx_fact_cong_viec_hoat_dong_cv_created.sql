-- Hoạt động / báo cáo tiến độ theo công việc: tải timeline chi tiết nhanh hơn khi dữ liệu lớn.
CREATE INDEX IF NOT EXISTS idx_fact_cong_viec_hoat_dong_cv_created
  ON public.fact_cong_viec_hoat_dong (id_cong_viec, created_at DESC);
