-- Soft-local: WHO VST phiên — metadata bổ sung người bệnh (parity GSC).
-- KHÔNG tự apply: cần Nghĩa lệnh migrate/deploy. UI Soft ghi metadata khi cột đã có;
-- khi chưa apply, save bỏ metadata (không reject phiên, gan_nb=false mặc định).

BEGIN;

ALTER TABLE public.gstt_fact_vst_sessions
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.gstt_fact_vst_sessions.metadata IS
  'Soft: ảnh chụp bổ sung NB (is_bo_sung_nguoi_benh, ma/ten/giường, bn_*). Default {} = không gắn NB.';

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_sessions_full WITH (security_invoker = true) AS
SELECT
  s.id, s.khoa_id, s.khu_vuc_id, s.vi_tri_cu_the, s.hinh_thuc_id, s.cach_thuc_id,
  ht.ten_hinh_thuc AS hinh_thuc_giam_sat, ct.ten_cach_thuc AS cach_thuc_giam_sat,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
  s.nguoi_giam_sat_id, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc, s.ngay_giam_sat,
  s.created_at, s.updated_at, s.is_active, s.is_seen,
  k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat,
  COALESCE(agg.tong_co_hoi, 0::numeric) AS tong_co_hoi,
  COALESCE(agg.da_tuan_thu, 0::numeric) AS da_tuan_thu,
  COALESCE((s.metadata ->> 'is_bo_sung_nguoi_benh')::boolean, false) AS is_bo_sung_nguoi_benh,
  s.metadata ->> 'ma_benh_an' AS ma_benh_an,
  s.metadata ->> 'ma_nguoi_benh' AS ma_nguoi_benh,
  s.metadata ->> 'ten_nguoi_benh' AS ten_nguoi_benh,
  s.metadata ->> 'so_giuong_nguoi_benh' AS so_giuong_nguoi_benh
FROM public.gstt_fact_vst_sessions s
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
LEFT JOIN (
  SELECT
    d.session_id,
    count(*)::numeric AS tong_co_hoi,
    sum(
      CASE
        WHEN coalesce(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 1
        ELSE 0
      END
    )::numeric AS da_tuan_thu
  FROM public.gstt_fact_vst d
  GROUP BY d.session_id
) agg ON agg.session_id = s.id
WHERE COALESCE(s.is_active, true) = true;

GRANT SELECT ON public.v_gstt_giam_sat_vst_sessions_full TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
