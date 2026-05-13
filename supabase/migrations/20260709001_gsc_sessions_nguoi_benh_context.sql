-- Bổ sung ngữ cảnh người bệnh (gói phòng ngừa nhiễm khuẩn) cho phiên Giám sát chung.
ALTER TABLE public.fact_giam_sat_chung_sessions
  ADD COLUMN IF NOT EXISTS is_bo_sung_nguoi_benh boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ma_nguoi_benh text,
  ADD COLUMN IF NOT EXISTS ten_nguoi_benh text,
  ADD COLUMN IF NOT EXISTS so_giuong_nguoi_benh text;

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.is_bo_sung_nguoi_benh IS
  'Người dùng bật bổ sung thông tin người bệnh đang được chăm sóc (tùy chọn).';
COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.ma_nguoi_benh IS 'Mã người bệnh (nhập tay, tùy chọn).';
COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.ten_nguoi_benh IS 'Tên người bệnh (nhập tay, tùy chọn).';
COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.so_giuong_nguoi_benh IS 'Số giường người bệnh (nhập tay, tùy chọn).';

-- s.* cần view mới khi thêm cột fact.
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;

CREATE VIEW public.v_fact_giam_sat_chung_sessions_full AS
SELECT
  s.*,
  k.ten_khoa AS ten_khoa_phong,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat,
  ns_nv.ho_ten AS ten_nhan_vien,
  ns_nv.ma_nv AS ma_nhan_vien,
  nn.ten_nghe_nghiep AS ten_nghe_nghiep,
  bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
FROM public.fact_giam_sat_chung_sessions s
LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
LEFT JOIN public.mdm_nhan_su ns_gs ON s.nguoi_giam_sat_id = ns_gs.id
LEFT JOIN public.mdm_nhan_su ns_nv ON s.nhan_vien_id = ns_nv.id
LEFT JOIN public.dm_nghe_nghiep nn ON s.nghe_nghiep_id = nn.id
LEFT JOIN public.dm_bang_kiem bk
  ON (
    bk.ma_bk = trim(both FROM coalesce(s.loai_bang_kiem, ''))
    OR bk.id::text = trim(both FROM coalesce(s.loai_bang_kiem, ''))
  )
  AND coalesce(bk.is_active, true) = true;

GRANT SELECT ON public.v_fact_giam_sat_chung_sessions_full TO authenticated, service_role;
