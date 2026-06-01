-- Khôi phục view đọc VST/GSC theo prefix gstt_ (app đã migrate tên; 20260530100000 chỉ DROP alias v_fact_*).
-- SSOT: docs/archive/baselines/view-rename-mapping-20260526.md

BEGIN;

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_full
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.session_id,
  o.nhan_vien_id,
  (o.metadata ->> 'ten_nhan_vien_ngoai') AS ten_nhan_vien_ngoai,
  COALESCE(ns.ho_ten, (o.metadata ->> 'ten_nhan_vien_ngoai')) AS ten_nhan_vien,
  o.khoa_id,
  o.khu_vuc_id,
  o.nghe_nghiep_id,
  o.vi_tri,
  o.ngay_giam_sat,
  o.thoi_diem,
  o.hanh_dong,
  o.dung_ky_thuat,
  o.du_thoi_gian,
  o.co_deo_gang,
  o.thoi_gian_ghi_nhan,
  o.ghi_chu,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  COALESCE(kv.ten_khu_vuc, ''::text) AS khu_vuc,
  COALESCE(kv.ten_khu_vuc, ''::text) AS ten_khu_vuc_hien_thi,
  nn.ma_nghe_nghiep,
  COALESCE(nn.ten_nghe_nghiep, ''::text) AS nghe_nghiep,
  COALESCE(nn.ten_nghe_nghiep, ''::text) AS ten_nghe_nghiep_hien_thi,
  k.ten_khoa AS ten_khoa_phong,
  (o.metadata ->> 'legacy_csv_row_id') AS legacy_csv_row_id,
  o.created_at
FROM public.gstt_fact_vst o
LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = o.khu_vuc_id
LEFT JOIN public.mdm_dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = o.khoa_id
LEFT JOIN public.mdm_nhan_su ns ON ns.id = o.nhan_vien_id;

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_sessions_full
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.khoa_id,
  s.khu_vuc_id,
  s.vi_tri_cu_the,
  s.hinh_thuc_id,
  s.cach_thuc_id,
  ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
  ct.ten_cach_thuc AS cach_thuc_giam_sat,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
  ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc,
  ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
  s.nguoi_giam_sat_id,
  s.thoi_gian_bat_dau,
  s.thoi_gian_ket_thuc,
  s.ngay_giam_sat,
  s.created_at,
  s.updated_at,
  s.is_active,
  s.is_seen,
  k.ma_khoa AS ma_khoa_phong,
  k.ten_khoa AS ten_khoa_phong,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat,
  COALESCE(agg.tong_co_hoi, 0::bigint) AS tong_co_hoi,
  COALESCE(agg.da_tuan_thu, 0::bigint) AS da_tuan_thu
FROM public.gstt_fact_vst_sessions s
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
LEFT JOIN (
  SELECT
    os.session_id,
    SUM(os.so_co_hoi) AS tong_co_hoi,
    SUM(os.da_tuan_thu) AS da_tuan_thu
  FROM public.gstt_fact_vst_opportunities_summary os
  GROUP BY os.session_id
) agg ON agg.session_id = s.id
WHERE COALESCE(s.is_active, true) = true;

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_chung_sessions_full
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.bang_kiem_id,
  bk.ma_bk AS loai_bang_kiem,
  bk.loai_giam_sat,
  s.khoa_id,
  s.khu_vuc_id,
  s.vi_tri,
  s.hinh_thuc_id,
  s.cach_thuc_id,
  s.nguoi_giam_sat_id,
  s.is_giam_sat_ca_nhan,
  s.nhan_vien_id,
  s.nghe_nghiep_id,
  s.ngay_giam_sat,
  s.thoi_gian_ghi_nhan,
  s.thoi_gian_bat_dau,
  s.thoi_gian_ket_thuc,
  s.tong_diem,
  s.ghi_chu_chung,
  COALESCE((s.metadata ->> 'is_manual_nhan_vien')::boolean, false) AS is_manual_nhan_vien,
  (s.metadata ->> 'ten_manual_nhan_vien') AS ten_manual_nhan_vien,
  COALESCE((s.metadata ->> 'is_bo_sung_nguoi_benh')::boolean, false) AS is_bo_sung_nguoi_benh,
  (s.metadata ->> 'ma_nguoi_benh') AS ma_nguoi_benh,
  (s.metadata ->> 'ten_nguoi_benh') AS ten_nguoi_benh,
  (s.metadata ->> 'so_giuong_nguoi_benh') AS so_giuong_nguoi_benh,
  s.is_active,
  s.is_seen,
  s.created_at,
  s.updated_at,
  s.results_jsonb,
  s.dat_tron_goi,
  s.du_lieu_nghi_van,
  k.ma_khoa AS ma_khoa_phong,
  k.ten_khoa AS ten_khoa_phong,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat,
  ns_gs.ma_nv AS ma_nguoi_giam_sat,
  ns_nv.ho_ten AS ten_nhan_vien,
  ns_nv.ma_nv AS ma_nhan_vien,
  nn.ma_nghe_nghiep,
  nn.ten_nghe_nghiep,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
  ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc,
  ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
  ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
  ct.ten_cach_thuc AS cach_thuc_giam_sat,
  bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
FROM public.gstt_fact_chung_sessions s
LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
LEFT JOIN public.mdm_nhan_su ns_nv ON ns_nv.id = s.nhan_vien_id
LEFT JOIN public.mdm_dm_nghe_nghiep nn ON nn.id = s.nghe_nghiep_id
LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
WHERE COALESCE(s.is_active, true) = true;

GRANT SELECT ON public.v_gstt_giam_sat_vst_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_gstt_giam_sat_vst_sessions_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_gstt_giam_sat_chung_sessions_full TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
