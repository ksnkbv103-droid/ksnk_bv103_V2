-- BV103 phase 2: DROP cột text denorm còn lại (VST dòng quan sát + MDM nhân sự).
-- Đọc nhãn qua view v_* (JOIN dm_*); ghi bảng gốc chỉ *_id.

-- ---------------------------------------------------------------------------
-- 1) VST — backfill FK trước khi DROP text
-- ---------------------------------------------------------------------------
UPDATE public.fact_giam_sat_vst o
SET khu_vuc_id = s.khu_vuc_id
FROM public.fact_giam_sat_vst_sessions s
WHERE o.session_id = s.id
  AND o.khu_vuc_id IS NULL
  AND s.khu_vuc_id IS NOT NULL;

UPDATE public.fact_giam_sat_vst o
SET khu_vuc_id = kv.id
FROM public.dm_khu_vuc_giam_sat kv
WHERE o.khu_vuc_id IS NULL
  AND public.bv103_norm_label(o.khu_vuc) <> ''
  AND public.bv103_norm_label(o.khu_vuc) = public.bv103_norm_label(kv.ten_khu_vuc);

UPDATE public.fact_giam_sat_vst o
SET nghe_nghiep_id = nn.id
FROM public.dm_nghe_nghiep nn
WHERE o.nghe_nghiep_id IS NULL
  AND public.bv103_norm_label(o.nghe_nghiep) <> ''
  AND public.bv103_norm_label(o.nghe_nghiep) = public.bv103_norm_label(nn.ten_nghe_nghiep);

-- ---------------------------------------------------------------------------
-- 2) DROP view phụ thuộc cột text → DROP cột → tạo lại view
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_full CASCADE;

ALTER TABLE public.fact_giam_sat_vst
  DROP COLUMN IF EXISTS khu_vuc,
  DROP COLUMN IF EXISTS nghe_nghiep;

CREATE VIEW public.v_fact_giam_sat_vst_full
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.session_id,
  o.nhan_vien_id,
  o.ten_nhan_vien_ngoai,
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
  o.legacy_csv_row_id,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  COALESCE(kv.ten_khu_vuc, '') AS khu_vuc,
  COALESCE(kv.ten_khu_vuc, '') AS ten_khu_vuc_hien_thi,
  nn.ma_nghe_nghiep,
  COALESCE(nn.ten_nghe_nghiep, '') AS nghe_nghiep,
  COALESCE(nn.ten_nghe_nghiep, '') AS ten_nghe_nghiep_hien_thi,
  k.ten_khoa AS ten_khoa_phong,
  o.created_at
FROM public.fact_giam_sat_vst o
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON kv.id = o.khu_vuc_id
LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
LEFT JOIN public.dm_khoa_phong k ON k.id = o.khoa_id;

GRANT SELECT ON public.v_fact_giam_sat_vst_full TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) MDM nhân sự — DROP view → DROP snapshot text → tạo lại view
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_mdm_nhan_su_full CASCADE;

ALTER TABLE public.mdm_nhan_su
  DROP COLUMN IF EXISTS chuc_vu,
  DROP COLUMN IF EXISTS chuc_danh,
  DROP COLUMN IF EXISTS vai_tro_he_thong_ksnk;

CREATE VIEW public.v_mdm_nhan_su_full
WITH (security_invoker = true) AS
SELECT
  ns.id,
  ns.ma_nv,
  ns.ho_ten,
  ns.khoa_id,
  ns.to_id,
  ns.nghe_nghiep_id,
  ns.chuc_vu_id,
  ns.chuc_danh_id,
  ns.vai_tro_he_thong_id,
  ns.auth_user_id,
  ns.ngay_sinh,
  ns.gioi_tinh,
  ns.so_dien_thoai,
  ns.email,
  ns.extra_data,
  ns.is_active,
  k.ten_khoa,
  t.ten_to,
  nn.ten_nghe_nghiep,
  cv.ten_chuc_vu AS chuc_vu,
  cd.ten_chuc_danh AS chuc_danh,
  r.name AS vai_tro_he_thong_ksnk,
  cv.ten_chuc_vu,
  cd.ten_chuc_danh,
  r.name AS ten_vai_tro,
  ns.created_at,
  ns.updated_at
FROM public.mdm_nhan_su ns
LEFT JOIN public.dm_khoa_phong k ON ns.khoa_id = k.id
LEFT JOIN public.dm_nghe_nghiep nn ON ns.nghe_nghiep_id = nn.id
LEFT JOIN public.dm_chuc_danh cd ON ns.chuc_danh_id = cd.id
LEFT JOIN public.dm_chuc_vu cv ON ns.chuc_vu_id = cv.id
LEFT JOIN public.dm_to_cong_tac t ON ns.to_id = t.id
LEFT JOIN public.dm_roles r ON ns.vai_tro_he_thong_id = r.id;

GRANT SELECT ON public.v_mdm_nhan_su_full TO authenticated, service_role;

COMMENT ON VIEW public.v_fact_giam_sat_vst_full IS
  'VST dòng quan sát: FK trên fact_giam_sat_vst; khu_vuc/nghe_nghiep là alias JOIN dm_*.';
COMMENT ON VIEW public.v_mdm_nhan_su_full IS
  'MDM nhân sự: FK trên mdm_nhan_su; chuc_vu/chuc_danh/vai_tro_he_thong_ksnk là alias JOIN dm_*.';
