-- Bổ sung cột catalog app đọc từ v_cssd_bo_dung_cu_summary (phan_loai_bo, co_ma_dinh_danh_rieng).
-- Postgres chỉ cho CREATE OR REPLACE VIEW thêm cột ở cuối — giữ thứ tự cột cũ.

CREATE OR REPLACE VIEW public.v_cssd_bo_dung_cu_summary WITH (security_invoker = true) AS
SELECT
  b.id,
  b.ma_bo,
  b.ten_bo,
  b.loai_dung_cu_id,
  b.khoa_su_dung_id,
  b.trang_thai,
  b.quy_cach,
  b.ghi_chu,
  b.ngay_kiem_ke_gan_nhat,
  b.is_active,
  b.created_at,
  b.updated_at,
  COALESCE(q_active.cnt, 0::bigint)::integer AS so_luong_bo,
  COALESCE(count(DISTINCT c.id) FILTER (WHERE c.is_active = true), 0::bigint)::integer AS so_khoan,
  COALESCE(sum(c.so_luong) FILTER (WHERE c.is_active = true), 0::bigint)::integer AS tong_so_luong_dung_cu,
  COALESCE(sum(p.so_luong_hien_tai) FILTER (WHERE p.is_active = true), 0::bigint)::integer AS tong_phan_bo,
  b.phan_loai_bo,
  b.co_ma_dinh_danh_rieng
FROM public.cssd_dm_bo_dung_cu b
LEFT JOIN (
  SELECT bo_dung_cu_id, count(id) AS cnt
  FROM public.cssd_fact_quy_trinh
  WHERE is_active = true AND tinh_trang::text IS DISTINCT FROM 'MAT'
  GROUP BY bo_dung_cu_id
) q_active ON q_active.bo_dung_cu_id = b.id
LEFT JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON c.bo_dung_cu_id = b.id
LEFT JOIN public.cssd_dm_bo_phan_bo p ON p.bo_dung_cu_id = b.id
GROUP BY b.id, q_active.cnt;

GRANT SELECT ON public.v_cssd_bo_dung_cu_summary TO anon, authenticated, service_role;
