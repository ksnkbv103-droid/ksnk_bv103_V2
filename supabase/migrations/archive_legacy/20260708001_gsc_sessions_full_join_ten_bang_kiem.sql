-- Bổ sung tên bảng kiểm cho lịch sử GSC (sau 20260707002).
-- DROP + CREATE: tránh lỗi Postgres khi bảng fact thêm cột làm lệch thứ tự s.* so với view cũ.
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
