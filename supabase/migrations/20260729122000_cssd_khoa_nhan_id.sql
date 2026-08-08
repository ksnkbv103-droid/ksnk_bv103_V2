-- SSOT khoa nhận lúc cấp phát (destination). Additive.
ALTER TABLE public.cssd_fact_quy_trinh
  ADD COLUMN IF NOT EXISTS khoa_nhan_id uuid NULL REFERENCES public.mdm_dm_khoa_phong(id);

COMMENT ON COLUMN public.cssd_fact_quy_trinh.khoa_nhan_id IS
  'Khoa nhận bộ lúc cấp phát. NULL = chưa ghi; fallback UI: khoa sở hữu danh mục.';

CREATE INDEX IF NOT EXISTS idx_cssd_fact_quy_trinh_khoa_nhan
  ON public.cssd_fact_quy_trinh (khoa_nhan_id)
  WHERE khoa_nhan_id IS NOT NULL;

-- Backfill: khi đã cấp phát mà chưa có khoa_nhan → dùng khoa sở hữu bộ (proxy → SSOT bootstrap).
UPDATE public.cssd_fact_quy_trinh q
SET khoa_nhan_id = b.khoa_su_dung_id
FROM public.cssd_dm_bo_dung_cu b
WHERE q.bo_dung_cu_id = b.id
  AND q.khoa_nhan_id IS NULL
  AND q.thoi_gian_cap_phat IS NOT NULL
  AND b.khoa_su_dung_id IS NOT NULL;

DROP VIEW IF EXISTS public.v_cssd_quy_trinh_full;

CREATE VIEW public.v_cssd_quy_trinh_full WITH (security_invoker = true) AS
SELECT
  q.id,
  q.ma_qr_quy_trinh,
  q.ma_cycle_qr,
  q.ma_qr_bo_vinh_vien,
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
  q.bom_kiem_dem_at,
  q.bom_kiem_dem_boi_id,
  q.lo_tiet_khuan_id,
  q.suds_count,
  q.ngay_tiet_khuan,
  q.han_su_dung,
  q.tinh_trang,
  q.is_dong_bang,
  q.is_red_alert,
  q.quy_trinh_cha_id,
  q.ma_vai_tro_bo,
  q.metadata ->> 'ma_ca_mo_id' AS ma_ca_mo_id,
  q.ngay_het_han,
  q.is_active,
  q.khoa_nhan_id,
  b.ten_bo,
  b.ma_bo,
  b.khoa_su_dung_id,
  k.ten_khoa,
  kn.ten_khoa AS ten_khoa_nhan,
  l.ten_loai AS ten_loai_dung_cu,
  q.created_at,
  q.updated_at
FROM public.cssd_fact_quy_trinh q
LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
LEFT JOIN public.cssd_dm_bo_dung_cu b ON q.bo_dung_cu_id = b.id
LEFT JOIN public.mdm_dm_khoa_phong k ON b.khoa_su_dung_id = k.id
LEFT JOIN public.mdm_dm_khoa_phong kn ON q.khoa_nhan_id = kn.id
LEFT JOIN public.cssd_dm_loai_dung_cu l ON b.loai_dung_cu_id = l.id;

GRANT SELECT ON public.v_cssd_quy_trinh_full TO anon, authenticated, service_role;
