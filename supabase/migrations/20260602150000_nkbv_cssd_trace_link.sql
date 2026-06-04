-- P2: Liên kết ca NKBV (SSI) ↔ quy trình CSSD (truy vết QR).

ALTER TABLE public.nkbv_fact_su_kien
  ADD COLUMN IF NOT EXISTS quy_trinh_id uuid REFERENCES public.cssd_fact_quy_trinh(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lo_tiet_khuan_id uuid REFERENCES public.cssd_fact_lo_tiet_khuan(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ma_cycle_qr_lien_quan text;

CREATE INDEX IF NOT EXISTS idx_nkbv_su_kien_quy_trinh_id
  ON public.nkbv_fact_su_kien (quy_trinh_id)
  WHERE quy_trinh_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nkbv_su_kien_ma_cycle_qr
  ON public.nkbv_fact_su_kien (upper(ma_cycle_qr_lien_quan))
  WHERE ma_cycle_qr_lien_quan IS NOT NULL;

COMMENT ON COLUMN public.nkbv_fact_su_kien.quy_trinh_id IS 'FK tới cssd_fact_quy_trinh — truy vết bộ dụng cụ từ ca SSI.';
COMMENT ON COLUMN public.nkbv_fact_su_kien.lo_tiet_khuan_id IS 'FK mẻ tiệt khuẩn liên quan (nếu có).';
COMMENT ON COLUMN public.nkbv_fact_su_kien.ma_cycle_qr_lien_quan IS 'Mã QR chu trình CSSD người dùng nhập (denormalized để tìm nhanh).';

-- Postgres: không chèn cột giữa view bằng CREATE OR REPLACE (42P16).
DROP VIEW IF EXISTS public.v_nkbv_su_kien_full;

CREATE VIEW public.v_nkbv_su_kien_full WITH (security_invoker = true) AS
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
  c.quy_trinh_id,
  c.lo_tiet_khuan_id,
  c.ma_cycle_qr_lien_quan,
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

GRANT SELECT ON public.v_nkbv_su_kien_full TO anon, authenticated, service_role;
