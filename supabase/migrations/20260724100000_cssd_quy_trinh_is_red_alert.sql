-- CSSD: đồng bộ cờ cảnh báo đỏ trên quy trình (app đã đọc từ view nhưng cột chưa có).
-- Nguồn sự cố vẫn là cssd_fact_su_co.is_red_alert; cột trên quy trình là bản sao nhanh cho kho/bản đồ trạm.

ALTER TABLE public.cssd_fact_quy_trinh
  ADD COLUMN IF NOT EXISTS is_red_alert boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cssd_fact_quy_trinh.is_red_alert IS
  'Cờ cảnh báo đỏ (denormalized): bật khi báo sự cố lặp trên cùng QR; dùng lọc kho/bản đồ trạm.';

CREATE INDEX IF NOT EXISTS idx_cssd_quy_trinh_is_red_alert
  ON public.cssd_fact_quy_trinh (is_red_alert)
  WHERE is_red_alert = true;

-- Backfill: khớp rule app (≥2 sự cố trên cùng mã QR) hoặc đã gắn cờ đỏ trên phiếu sự cố.
UPDATE public.cssd_fact_quy_trinh q
SET is_red_alert = true,
    updated_at = now()
WHERE q.is_red_alert = false
  AND (
    EXISTS (
      SELECT 1
      FROM public.cssd_fact_su_co sc
      WHERE sc.is_red_alert = true
        AND COALESCE(sc.is_active, true) = true
        AND (
          sc.quy_trinh_id = q.id
          OR (
            sc.ma_qr_quy_trinh IS NOT NULL
            AND upper(trim(sc.ma_qr_quy_trinh)) = upper(trim(q.ma_qr_quy_trinh))
          )
        )
    )
    OR (
      SELECT count(*)::int
      FROM public.cssd_fact_su_co sc
      WHERE COALESCE(sc.is_active, true) = true
        AND (
          sc.quy_trinh_id = q.id
          OR (
            sc.ma_qr_quy_trinh IS NOT NULL
            AND upper(trim(sc.ma_qr_quy_trinh)) = upper(trim(q.ma_qr_quy_trinh))
          )
        )
    ) >= 2
  );

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

GRANT SELECT ON public.v_cssd_quy_trinh_full TO anon, authenticated, service_role;
