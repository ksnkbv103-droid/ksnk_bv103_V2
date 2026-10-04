-- S-N: hết fan-out. Chi tiết và phân bổ gộp theo bo_dung_cu_id rồi mới JOIN.
-- Giữ thứ tự cột (kể cả phan_loai_bo, co_ma_dinh_danh_rieng). q_active: active và tinh_trang khác MAT.
-- File mới — chưa apply remote.

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
  COALESCE(c_agg.so_khoan, 0::bigint)::integer AS so_khoan,
  COALESCE(c_agg.tong_so_luong_dung_cu, 0::bigint)::integer AS tong_so_luong_dung_cu,
  COALESCE(p_agg.tong_phan_bo, 0::bigint)::integer AS tong_phan_bo,
  b.phan_loai_bo,
  b.co_ma_dinh_danh_rieng
FROM public.cssd_dm_bo_dung_cu b
LEFT JOIN (
  SELECT bo_dung_cu_id, count(id) AS cnt
  FROM public.cssd_fact_quy_trinh
  WHERE is_active = true AND tinh_trang::text IS DISTINCT FROM 'MAT'
  GROUP BY bo_dung_cu_id
) q_active ON q_active.bo_dung_cu_id = b.id
LEFT JOIN (
  SELECT
    bo_dung_cu_id,
    count(DISTINCT id) FILTER (WHERE is_active = true) AS so_khoan,
    COALESCE(sum(so_luong) FILTER (WHERE is_active = true), 0::bigint) AS tong_so_luong_dung_cu
  FROM public.cssd_dm_bo_dung_cu_chi_tiet
  GROUP BY bo_dung_cu_id
) c_agg ON c_agg.bo_dung_cu_id = b.id
LEFT JOIN (
  SELECT
    bo_dung_cu_id,
    COALESCE(sum(so_luong_hien_tai) FILTER (WHERE is_active = true), 0::bigint) AS tong_phan_bo
  FROM public.cssd_dm_bo_phan_bo
  GROUP BY bo_dung_cu_id
) p_agg ON p_agg.bo_dung_cu_id = b.id;

GRANT SELECT ON public.v_cssd_bo_dung_cu_summary TO anon, authenticated, service_role;
