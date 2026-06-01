-- Rà soát pilot: khôi phục view đọc app sau DROP CASCADE (20260530100000, 20260531140000).
-- Idempotent — an toàn chạy sau 20260531210000 / 20260531220000.

BEGIN;

-- === CSSD (31140100 chỉ có thiet_bi + khoa) ===
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
  COALESCE(sum(p.so_luong_hien_tai) FILTER (WHERE p.is_active = true), 0::bigint)::integer AS tong_phan_bo
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

CREATE OR REPLACE VIEW public.v_cssd_loai_dung_cu_summary WITH (security_invoker = true) AS
SELECT
  l.id,
  l.ma_loai,
  l.ten_loai,
  l.mo_ta,
  l.created_at,
  l.updated_at,
  l.is_active,
  l.specs ->> 'ma_loai_dung_cu' AS ma_loai_dung_cu,
  l.specs ->> 'ten_loai_dung_cu' AS ten_loai_dung_cu,
  l.specs ->> 'hinh_dang' AS hinh_dang,
  l.specs ->> 'kich_thuoc' AS kich_thuoc,
  l.specs ->> 'cong_dung' AS cong_dung,
  l.is_chiu_nhiet,
  l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan,
  l.phan_loai_spaulding,
  l.so_ngay_han_dung,
  l.phan_loai,
  l.so_luong_kho_du_phong,
  (
    COALESCE(l.so_luong_kho_du_phong, 0)
    + COALESCE(
        sum(CASE WHEN b.is_active AND c.is_active THEN c.so_luong ELSE 0 END),
        0::bigint
      )
  )::integer AS so_luong_tong,
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object('id', b.id, 'ma_bo', b.ma_bo, 'ten_bo', b.ten_bo))
      FILTER (WHERE b.id IS NOT NULL AND b.is_active AND c.is_active),
    '[]'::jsonb
  ) AS bo_dung_cu_chua
FROM public.cssd_dm_loai_dung_cu l
LEFT JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON c.loai_dung_cu_id = l.id
LEFT JOIN public.cssd_dm_bo_dung_cu b ON c.bo_dung_cu_id = b.id
GROUP BY l.id;

CREATE OR REPLACE VIEW public.v_cssd_bo_dung_cu_chi_tiet_full WITH (security_invoker = true) AS
SELECT
  c.id,
  c.bo_dung_cu_id,
  b.ma_bo,
  b.ten_bo,
  c.loai_dung_cu_id,
  l.ma_loai AS ma_loai_dung_cu,
  l.ten_loai AS ten_loai_dung_cu,
  c.specs ->> 'ma_chi_tiet' AS ma_chi_tiet,
  c.ten_chi_tiet,
  c.ten_dung_cu_le,
  c.so_luong,
  c.specs ->> 'ma_qr_mau' AS ma_qr_mau,
  (c.specs ->> 'co_ma_khac')::boolean AS co_ma_khac,
  c.specs ->> 'ma_khac' AS ma_khac,
  c.is_active,
  c.ghi_chu,
  c.created_at,
  c.updated_at,
  c.specs
FROM public.cssd_dm_bo_dung_cu_chi_tiet c
LEFT JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id;

DROP VIEW IF EXISTS public.v_cssd_bo_dung_cu_chi_tiet_realtime CASCADE;

CREATE VIEW public.v_cssd_bo_dung_cu_chi_tiet_realtime AS
SELECT
  c.id AS chi_tiet_id,
  c.bo_dung_cu_id,
  b.ma_bo,
  b.ten_bo,
  c.loai_dung_cu_id,
  l.ma_loai AS ma_loai_dung_cu,
  l.ten_loai AS ten_loai_dung_cu,
  l.is_chiu_nhiet,
  l.phan_loai_spaulding,
  l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan,
  c.so_luong AS so_luong_tieu_chuan,
  c.so_luong + COALESCE(v.so_luong_bien_dong, 0) AS so_luong_thuc_te,
  CASE
    WHEN c.so_luong + COALESCE(v.so_luong_bien_dong, 0) < c.so_luong THEN true
    ELSE false
  END AS is_missing,
  CASE
    WHEN c.so_luong + COALESCE(v.so_luong_bien_dong, 0) < c.so_luong
      THEN c.so_luong - (c.so_luong + COALESCE(v.so_luong_bien_dong, 0))
    ELSE 0
  END AS missing_count,
  c.is_active,
  c.ghi_chu
FROM public.cssd_dm_bo_dung_cu_chi_tiet c
JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
LEFT JOIN public.v_cssd_bo_dung_cu_bien_dong v
  ON v.bo_dung_cu_id = c.bo_dung_cu_id AND v.loai_dung_cu_id = c.loai_dung_cu_id;

CREATE OR REPLACE VIEW public.v_cssd_hoa_chat_full WITH (security_invoker = true) AS
SELECT
  id,
  ma_hoa_chat,
  ten_hoa_chat,
  loai_hoa_chat,
  don_vi_tinh,
  specs ->> 'quy_cach' AS quy_cach,
  specs ->> 'nong_do' AS nong_do,
  han_su_dung,
  specs ->> 'ghi_chu' AS ghi_chu,
  nguong_ton_toi_thieu,
  is_active,
  created_at,
  updated_at,
  specs
FROM public.cssd_dm_hoa_chat;

CREATE OR REPLACE VIEW public.v_cssd_kho_hoa_chat_ton_lo WITH (security_invoker = true) AS
SELECT
  dm_hoa_chat_id,
  ma_lo,
  han_su_dung,
  sum(so_luong_co_dau) AS ton_so_luong
FROM public.cssd_fact_kho_hoa_chat_giao_dich g
WHERE COALESCE(is_active, true) = true
GROUP BY dm_hoa_chat_id, ma_lo, han_su_dung;

CREATE OR REPLACE VIEW public.v_cssd_quy_trinh_full WITH (security_invoker = true) AS
SELECT
  q.id,
  q.ma_qr_quy_trinh,
  q.bo_dung_cu_id,
  q.tram_hien_tai_id,
  t.ma_tram AS ma_trang_thai_hien_tai,
  t.ten_tram AS ten_tram_hien_tai,
  q.nguoi_dang_giu_id,
  q.nguoi_tiep_nhan_id,
  q.nguoi_lam_sach_id,
  q.nguoi_kiem_tra_id,
  q.nguoi_dong_goi_id,
  q.nguoi_tiet_khuan_id,
  q.nguoi_cap_phat_id,
  q.thoi_gian_tiep_nhan,
  q.thoi_gian_lam_sach,
  q.thoi_gian_qc,
  q.thoi_gian_dong_goi,
  q.thoi_gian_tiet_khuan,
  q.thoi_gian_cap_phat,
  q.lo_tiet_khuan_id,
  q.suds_count,
  q.ngay_tiet_khuan,
  q.han_su_dung,
  q.tinh_trang,
  q.is_dong_bang,
  q.quy_trinh_cha_id,
  q.ma_vai_tro_bo,
  q.metadata ->> 'ma_ca_mo_id' AS ma_ca_mo_id,
  q.ngay_het_han,
  q.is_active,
  b.ten_bo,
  b.ma_bo,
  k.ten_khoa,
  l.ten_loai AS ten_loai_dung_cu,
  q.created_at,
  q.updated_at
FROM public.cssd_fact_quy_trinh q
LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
LEFT JOIN public.cssd_dm_bo_dung_cu b ON q.bo_dung_cu_id = b.id
LEFT JOIN public.mdm_dm_khoa_phong k ON b.khoa_su_dung_id = k.id
LEFT JOIN public.cssd_dm_loai_dung_cu l ON b.loai_dung_cu_id = l.id;

CREATE OR REPLACE VIEW public.v_cssd_su_co_full WITH (security_invoker = true) AS
SELECT
  sc.id,
  sc.quy_trinh_id,
  sc.ma_qr_quy_trinh,
  sc.ma_tram_phat_hien,
  sc.loai_su_co_id,
  ls.name AS ten_loai_su_co,
  sc.attributes ->> 'incident_group' AS incident_group,
  sc.attributes ->> 'incident_type_label' AS incident_type_label,
  COALESCE(
    NULLIF(
      concat(sc.attributes ->> 'incident_group', ':', sc.attributes ->> 'incident_type_label'),
      ':'
    ),
    ls.code
  ) AS ma_loai_su_co,
  sc.mo_ta,
  sc.is_red_alert,
  sc.ma_tram_gay_loi,
  sc.created_at,
  sc.attributes
FROM public.cssd_fact_su_co sc
LEFT JOIN public.sys_lookup_value ls
  ON ls.id = sc.loai_su_co_id AND ls.category_type = 'LOAI_SU_CO';

CREATE OR REPLACE VIEW public.v_nkbv_su_kien_full WITH (security_invoker = true) AS
SELECT
  c.id,
  c.ma_ca,
  c.khoa_ghi_nhan_id,
  c.ma_benh_nhan,
  c.ho_ten_benh_nhan,
  c.ngay_sinh,
  c.gioi_tinh,
  c.ngay_vao_vien,
  c.ngay_phat_hien,
  c.vi_tri_nhiem_khuan,
  c.tac_nhan_vi_khuan,
  c.clinical_notes ->> 'tom_tat_dien_bien' AS tom_tat_dien_bien,
  c.clinical_notes ->> 'bien_phap_phong_ngua' AS bien_phap_phong_ngua,
  c.loai_nkbv_id,
  c.trang_thai_id,
  c.clinical_notes ->> 'ly_do_loai_tru' AS ly_do_loai_tru,
  c.nguoi_ghi_id,
  c.is_active,
  c.created_at,
  c.updated_at,
  c.clinical_notes,
  c.vi_sinh_record_id,
  c.verification_data,
  c.ma_benh_an,
  c.ma_benh_pham,
  c.loai_benh_pham,
  c.so_luong,
  s.ngay_ra_vien,
  s.ket_cuc_dieu_tri,
  s.ly_do_tu_vong,
  s.tu_vong_lien_quan_nkbv,
  k.ma_khoa AS khoa_ma,
  k.ten_khoa AS khoa_ten,
  l.code AS loai_ma,
  l.name AS loai_ten,
  t.code AS trang_thai_ma,
  t.name AS trang_thai_ten
FROM public.nkbv_fact_su_kien c
LEFT JOIN public.nkbv_fact_benh_an s ON s.ma_benh_an = c.ma_benh_an
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = c.khoa_ghi_nhan_id
LEFT JOIN public.sys_lookup_value l ON l.id = c.loai_nkbv_id AND l.category_type = 'LOAI_NKBV'
LEFT JOIN public.sys_lookup_value t ON t.id = c.trang_thai_id AND t.category_type = 'TRANG_THAI_NKBV_CA';

-- === QLCV (CASCADE dm_to_cong_tac) ===
CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker = true) AS
SELECT
  cv.id,
  cv.cong_viec_cha_id,
  cv.tieu_de,
  cv.mo_ta,
  cv.loai_cong_viec_id,
  lc.ma AS loai_cong_viec,
  lc.ten AS ten_loai_cong_viec,
  cv.trang_thai_id,
  ts.ma AS trang_thai,
  ts.ten AS ten_trang_thai_hien_thi,
  cv.muc_do_uu_tien,
  cv.han_hoan_thanh,
  cv.phan_tram_hoan_thanh,
  cv.nguoi_tao_id,
  cv.nguoi_giao_viec_id,
  cv.nguoi_phu_trach_id,
  cv.khoa_thuc_hien_id,
  cv.to_cong_tac_id,
  cv.dinh_ky_mau_id,
  cv.is_active,
  cv.created_at,
  cv.updated_at,
  ns_tao.ho_ten AS nguoi_tao_ten,
  ns_phu.ho_ten AS nguoi_phu_trach_ten,
  ns_giao.ho_ten AS nguoi_giao_ten,
  k.ten_khoa AS khoa_thuc_hien_ten,
  t.ten_to AS to_cong_tac_ten,
  (
    cv.han_hoan_thanh IS NOT NULL
    AND cv.han_hoan_thanh < CURRENT_DATE
    AND COALESCE(ts.ma, ''::text) <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text])
  ) AS is_qua_han,
  (
    SELECT count(*)::integer
    FROM public.qlcv_fact_cong_viec sub
    WHERE sub.cong_viec_cha_id = cv.id AND sub.is_active = true
  ) AS cong_viec_con_count,
  cv.checklist
FROM public.qlcv_fact_cong_viec cv
LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON lc.id = cv.loai_cong_viec_id
LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ts.id = cv.trang_thai_id
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT *
FROM public.v_qlcv_cong_viec_full
WHERE is_qua_han = true;

-- === GSTT (DROP alias v_fact_* ở 20260530100000 — chưa có v_gstt_*) ===
CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_full WITH (security_invoker = true) AS
SELECT
  o.id,
  o.session_id,
  o.nhan_vien_id,
  o.metadata ->> 'ten_nhan_vien_ngoai' AS ten_nhan_vien_ngoai,
  COALESCE(ns.ho_ten, o.metadata ->> 'ten_nhan_vien_ngoai') AS ten_nhan_vien,
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
  o.metadata ->> 'legacy_csv_row_id' AS legacy_csv_row_id,
  o.created_at
FROM public.gstt_fact_vst o
LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = o.khu_vuc_id
LEFT JOIN public.mdm_dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = o.khoa_id
LEFT JOIN public.mdm_nhan_su ns ON ns.id = o.nhan_vien_id;

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_sessions_full WITH (security_invoker = true) AS
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
  SELECT session_id, sum(so_co_hoi) AS tong_co_hoi, sum(da_tuan_thu) AS da_tuan_thu
  FROM public.gstt_fact_vst_opportunities_summary
  GROUP BY session_id
) agg ON agg.session_id = s.id
WHERE COALESCE(s.is_active, true) = true;

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_chung_sessions_full WITH (security_invoker = true) AS
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
  s.metadata ->> 'ten_manual_nhan_vien' AS ten_manual_nhan_vien,
  COALESCE((s.metadata ->> 'is_bo_sung_nguoi_benh')::boolean, false) AS is_bo_sung_nguoi_benh,
  s.metadata ->> 'ma_nguoi_benh' AS ma_nguoi_benh,
  s.metadata ->> 'ten_nguoi_benh' AS ten_nguoi_benh,
  s.metadata ->> 'so_giuong_nguoi_benh' AS so_giuong_nguoi_benh,
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

GRANT SELECT ON public.v_cssd_bo_dung_cu_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.v_cssd_loai_dung_cu_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.v_cssd_bo_dung_cu_chi_tiet_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_cssd_bo_dung_cu_chi_tiet_realtime TO anon, authenticated, service_role;
GRANT SELECT ON public.v_cssd_hoa_chat_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_cssd_kho_hoa_chat_ton_lo TO anon, authenticated, service_role;
GRANT SELECT ON public.v_cssd_quy_trinh_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_cssd_su_co_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_nkbv_su_kien_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_qlcv_cong_viec_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_qlcv_cong_viec_qua_han TO anon, authenticated, service_role;
GRANT SELECT ON public.v_gstt_giam_sat_vst_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_gstt_giam_sat_vst_sessions_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_gstt_giam_sat_chung_sessions_full TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
