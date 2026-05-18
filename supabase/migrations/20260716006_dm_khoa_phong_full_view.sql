-- Danh mục khoa phòng: đọc trực quan — giữ FK khoi_id (UUID), thêm tên/mã khối từ dm_khoi_khoa.
-- Tra cứu DB / Supabase Table Editor: mở view `v_dm_khoa_phong_full` thay vì chỉ `dm_khoa_phong`.
-- Ghi/sửa vẫn qua bảng `dm_khoa_phong` (chỉ gửi khoi_id).

CREATE OR REPLACE VIEW public.v_dm_khoa_phong_full
WITH (security_invoker = true) AS
SELECT
  kp.id,
  kp.ma_khoa,
  kp.ten_khoa,
  kp.khoi_id,
  kk.ma_khoi AS ma_khoi,
  kk.ten_khoi AS ten_khoi,
  kp.mo_ta_chuc_nang,
  kp.so_bac_si,
  kp.so_dieu_duong,
  kp.so_giuong_benh_thuong,
  kp.so_giuong_cap_cuu,
  kp.is_active,
  kp.created_at,
  kp.updated_at
FROM public.dm_khoa_phong kp
LEFT JOIN public.dm_khoi_khoa kk ON kk.id = kp.khoi_id;

COMMENT ON VIEW public.v_dm_khoa_phong_full IS
  'Khoa phòng + tên khối (đọc). FK khoi_id vẫn trên dm_khoa_phong; INSERT/UPDATE dùng bảng gốc.';

GRANT SELECT ON public.v_dm_khoa_phong_full TO authenticated, service_role;
