-- Legacy: "Giám sát khách quan" (import GSVST) = dm "Giám sát chuyên trách".
-- Giữ cột text legacy (CHECK gsvst_hinh_thuc_check cũ); SSOT hiển thị qua hinh_thuc_id + view.

ALTER TABLE public.fact_giam_sat_vst_sessions
  DROP CONSTRAINT IF EXISTS gsvst_hinh_thuc_check;

ALTER TABLE public.fact_giam_sat_chung_sessions
  DROP CONSTRAINT IF EXISTS gsgc_hinh_thuc_check;

DO $$
DECLARE
  v_chuyen_trach_id uuid;
BEGIN
  SELECT id INTO v_chuyen_trach_id
  FROM public.dm_hinh_thuc_giam_sat
  WHERE public.bv103_norm_label(ten_hinh_thuc) = public.bv103_norm_label('Giám sát chuyên trách')
  LIMIT 1;

  IF v_chuyen_trach_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu dm_hinh_thuc_giam_sat: Giám sát chuyên trách';
  END IF;

  UPDATE public.fact_giam_sat_vst_sessions s
  SET hinh_thuc_id = v_chuyen_trach_id
  WHERE s.hinh_thuc_id IS NULL
    AND public.bv103_norm_label(coalesce(s.hinh_thuc_giam_sat, '')) IN (
      public.bv103_norm_label('Giám sát khách quan'),
      public.bv103_norm_label('Giám sát chuyên trách')
    );

  UPDATE public.fact_giam_sat_chung_sessions s
  SET hinh_thuc_id = v_chuyen_trach_id
  WHERE s.hinh_thuc_id IS NULL
    AND public.bv103_norm_label(coalesce(s.hinh_thuc_giam_sat, '')) IN (
      public.bv103_norm_label('Giám sát khách quan'),
      public.bv103_norm_label('Giám sát chuyên trách')
    );
END $$;

COMMENT ON TABLE public.fact_giam_sat_vst_sessions IS
  'Phiên VST. Legacy hinh_thuc "Giám sát khách quan" đã map → dm Giám sát chuyên trách (20260716010).';

-- View VST: hiển thị nhãn chuẩn từ FK
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_sessions_full CASCADE;

CREATE VIEW public.v_fact_giam_sat_vst_sessions_full
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.khoa_id,
  s.khu_vuc_id,
  s.vi_tri_cu_the,
  s.hinh_thuc_id,
  s.cach_thuc_id,
  s.hinh_thuc_giam_sat,
  s.cach_thuc_giam_sat,
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
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns.ho_ten AS ten_nguoi_giam_sat,
  ns.ma_nv AS ma_nguoi_giam_sat,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
  COALESCE(ht.ten_hinh_thuc, s.hinh_thuc_giam_sat) AS ten_hinh_thuc_danh_muc,
  ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  COALESCE(ct.ten_cach_thuc, s.cach_thuc_giam_sat) AS ten_cach_thuc_danh_muc,
  (
    SELECT count(*)::bigint
    FROM public.fact_giam_sat_vst o
    WHERE o.session_id = s.id
  ) AS tong_co_hoi,
  (
    SELECT count(*)::bigint
    FROM public.fact_giam_sat_vst o
    WHERE o.session_id = s.id
      AND (
        lower(public.unaccent(o.hanh_dong)) = 'rua tay bang nuoc'
        OR lower(public.unaccent(o.hanh_dong)) = 'cha tay bang con'
      )
  ) AS da_tuan_thu
FROM public.fact_giam_sat_vst_sessions s
LEFT JOIN public.dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns ON ns.id = s.nguoi_giam_sat_id
LEFT JOIN public.dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
WHERE coalesce(s.is_active, true) = true;

GRANT SELECT ON public.v_fact_giam_sat_vst_sessions_full TO authenticated, service_role;
