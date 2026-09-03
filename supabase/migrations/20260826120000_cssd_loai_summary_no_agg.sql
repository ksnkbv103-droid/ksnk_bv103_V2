-- List loại dụng cụ không JOIN 6705 chi tiết / jsonb_agg (catalog 2269 loại).
-- so_luong_tong trên list = kho dự phòng; bộ chứa lấy theo từng loại khi mở panel.

CREATE UNIQUE INDEX IF NOT EXISTS ux_cssd_dm_loai_dung_cu_ma_loai
  ON public.cssd_dm_loai_dung_cu (ma_loai);

CREATE OR REPLACE VIEW public.v_cssd_loai_dung_cu_summary
WITH (security_invoker = true) AS
SELECT
  l.id,
  l.ma_loai,
  l.ten_loai,
  l.mo_ta,
  l.created_at,
  l.updated_at,
  l.is_active,
  COALESCE(NULLIF(btrim(l.specs ->> 'ma_loai_dung_cu'), ''), l.ma_loai) AS ma_loai_dung_cu,
  COALESCE(NULLIF(btrim(l.specs ->> 'ten_loai_dung_cu'), ''), l.ten_loai) AS ten_loai_dung_cu,
  l.specs ->> 'hinh_dang' AS hinh_dang,
  l.specs ->> 'kich_thuoc' AS kich_thuoc,
  l.specs ->> 'cong_dung' AS cong_dung,
  l.is_chiu_nhiet,
  l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan,
  l.phan_loai_spaulding,
  l.so_ngay_han_dung,
  l.phan_loai,
  l.so_luong_kho_du_phong,
  COALESCE(l.so_luong_kho_du_phong, 0)::integer AS so_luong_tong,
  '[]'::jsonb AS bo_dung_cu_chua
FROM public.cssd_dm_loai_dung_cu l;

GRANT SELECT ON public.v_cssd_loai_dung_cu_summary TO anon, authenticated, service_role;
