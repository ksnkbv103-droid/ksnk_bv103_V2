-- BV103: View đọc SSOT (join tên, thứ tự cột rõ ràng) + DROP cột text denorm trùng FK trên bảng gốc.
-- App đọc qua v_*; ghi chỉ *_id. Nhãn hiển thị (ma/ten) do view JOIN dm_*.

-- ---------------------------------------------------------------------------
-- 0) Backfill FK trước khi DROP cột text
-- ---------------------------------------------------------------------------
UPDATE public.fact_cong_viec cv
SET trang_thai_id = dm.id
FROM public.dm_trang_thai_cong_viec dm
WHERE cv.trang_thai_id IS NULL
  AND trim(coalesce(cv.trang_thai, '')) <> ''
  AND public.bv103_norm_label(cv.trang_thai) = public.bv103_norm_label(dm.ma);

UPDATE public.fact_cong_viec cv
SET loai_cong_viec_id = dm.id
FROM public.dm_loai_cong_viec dm
WHERE cv.loai_cong_viec_id IS NULL
  AND trim(coalesce(cv.loai_cong_viec, '')) <> ''
  AND public.bv103_norm_label(cv.loai_cong_viec) = public.bv103_norm_label(dm.ma);

UPDATE public.fact_giam_sat_chung_sessions s
SET bang_kiem_id = bk.id
FROM public.dm_bang_kiem bk
WHERE s.bang_kiem_id IS NULL
  AND trim(coalesce(s.loai_bang_kiem, '')) <> ''
  AND (
    bk.ma_bk = trim(s.loai_bang_kiem)
    OR bk.id::text = trim(s.loai_bang_kiem)
  );

-- ---------------------------------------------------------------------------
-- 1) DROP view phụ thuộc
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE;
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_gsc_dashboard_rows CASCADE;
DROP VIEW IF EXISTS public.v_dm_thiet_bi_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_lo_tiet_khuan_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_su_co_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bang_kiem_full CASCADE;

-- ---------------------------------------------------------------------------
-- 2) DROP cột denorm (SSOT = *_id + view)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fact_giam_sat_vst_sessions
  DROP COLUMN IF EXISTS hinh_thuc_giam_sat,
  DROP COLUMN IF EXISTS cach_thuc_giam_sat;

ALTER TABLE public.fact_giam_sat_chung_sessions
  DROP COLUMN IF EXISTS hinh_thuc_giam_sat,
  DROP COLUMN IF EXISTS cach_thuc_giam_sat,
  DROP COLUMN IF EXISTS loai_bang_kiem;

ALTER TABLE public.fact_cong_viec
  DROP CONSTRAINT IF EXISTS fact_cong_viec_trang_thai_check;

ALTER TABLE public.fact_cong_viec
  DROP COLUMN IF EXISTS loai_cong_viec,
  DROP COLUMN IF EXISTS trang_thai,
  DROP COLUMN IF EXISTS ma_trang_thai;

ALTER TABLE public.dm_thiet_bi
  DROP COLUMN IF EXISTS loai_thiet_bi;

ALTER TABLE public.fact_lo_tiet_khuan
  DROP COLUMN IF EXISTS loai_tiet_khuan;

ALTER TABLE public.fact_su_co
  DROP COLUMN IF EXISTS ma_loai_su_co;

DROP INDEX IF EXISTS public.idx_gsc_sessions_active_ngay_loai_bang_kiem;

CREATE INDEX IF NOT EXISTS idx_gsc_sessions_active_ngay_bang_kiem
  ON public.fact_giam_sat_chung_sessions (is_active, ngay_giam_sat, bang_kiem_id)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 3) View VST phiên
-- ---------------------------------------------------------------------------
CREATE VIEW public.v_fact_giam_sat_vst_sessions_full
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.khoa_id,
  s.khu_vuc_id,
  s.vi_tri_cu_the,
  s.hinh_thuc_id,
  s.cach_thuc_id,
  s.nguoi_giam_sat_id,
  s.thoi_gian_bat_dau,
  s.thoi_gian_ket_thuc,
  s.ngay_giam_sat,
  s.is_active,
  s.is_seen,
  s.created_at,
  s.updated_at,
  k.ma_khoa AS ma_khoa_phong,
  k.ten_khoa AS ten_khoa_phong,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns.ho_ten AS ten_nguoi_giam_sat,
  ns.ma_nv AS ma_nguoi_giam_sat,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
  ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc,
  ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
  ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
  ct.ten_cach_thuc AS cach_thuc_giam_sat,
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

-- ---------------------------------------------------------------------------
-- 4) View GSC phiên
-- ---------------------------------------------------------------------------
CREATE VIEW public.v_fact_giam_sat_chung_sessions_full
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.bang_kiem_id,
  bk.ma_bk AS loai_bang_kiem,
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
  s.is_manual_nhan_vien,
  s.ten_manual_nhan_vien,
  s.is_bo_sung_nguoi_benh,
  s.ma_nguoi_benh,
  s.ten_nguoi_benh,
  s.so_giuong_nguoi_benh,
  s.is_active,
  s.is_seen,
  s.created_at,
  s.updated_at,
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
FROM public.fact_giam_sat_chung_sessions s
LEFT JOIN public.dm_bang_kiem bk ON bk.id = s.bang_kiem_id
LEFT JOIN public.dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
LEFT JOIN public.mdm_nhan_su ns_nv ON ns_nv.id = s.nhan_vien_id
LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = s.nghe_nghiep_id
LEFT JOIN public.dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
WHERE coalesce(s.is_active, true) = true;

-- ---------------------------------------------------------------------------
-- 5) View QLCV
-- ---------------------------------------------------------------------------
CREATE VIEW public.v_fact_cong_viec_full AS
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
    AND coalesce(ts.ma, '') NOT IN ('HOAN_THANH', 'DA_HUY')
  ) AS is_qua_han,
  (
    SELECT count(*)::int
    FROM public.fact_cong_viec sub
    WHERE sub.cong_viec_cha_id = cv.id
      AND sub.is_active = true
  ) AS cong_viec_con_count
FROM public.fact_cong_viec cv
LEFT JOIN public.dm_loai_cong_viec lc ON lc.id = cv.loai_cong_viec_id
LEFT JOIN public.dm_trang_thai_cong_viec ts ON ts.id = cv.trang_thai_id
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE VIEW public.v_cong_viec_qua_han AS
SELECT * FROM public.v_fact_cong_viec_full
WHERE is_qua_han = true;

-- ---------------------------------------------------------------------------
-- 6) View dm / fact phụ
-- ---------------------------------------------------------------------------
CREATE VIEW public.v_dm_thiet_bi_full
WITH (security_invoker = true) AS
SELECT
  tb.id,
  tb.ma_thiet_bi,
  tb.ten_thiet_bi,
  tb.loai_may_id,
  lm.ma_loai_may,
  lm.ten_loai_may AS ten_loai_may_hien_thi,
  lm.ma_loai_may AS loai_thiet_bi,
  tb.trang_thai,
  tb.hang_san_xuat,
  tb.nam_san_xuat,
  tb.ngay_dua_vao_su_dung,
  tb.chu_ky_bao_tri_ngay,
  tb.ngay_bao_tri_gan_nhat,
  tb.ngay_bao_tri_tiep_theo,
  tb.ghi_chu,
  tb.is_active,
  tb.created_at,
  tb.updated_at
FROM public.dm_thiet_bi tb
LEFT JOIN public.dm_loai_may_tiet_khuan lm ON lm.id = tb.loai_may_id;

CREATE VIEW public.v_dm_bang_kiem_full
WITH (security_invoker = true) AS
SELECT
  bk.id,
  bk.ma_bk,
  bk.ten_bang_kiem,
  bk.nhom_chuyen_de,
  bk.mo_ta,
  bk.loai_hinh_giam_sat,
  bk.is_active,
  bk.is_system,
  bk.created_at,
  bk.updated_at
FROM public.dm_bang_kiem bk;

CREATE VIEW public.v_fact_lo_tiet_khuan_full
WITH (security_invoker = true) AS
SELECT
  lot.id,
  lot.ma_lo_tiet_khuan,
  lot.thiet_bi_id,
  tb.ten_thiet_bi,
  lot.loai_may_id,
  lm.ma_loai_may,
  lm.ten_loai_may AS ten_loai_tiet_khuan,
  CASE
    WHEN lot.ket_qua_test IS TRUE THEN 'HOAN_THANH'
    WHEN lot.ket_qua_test IS FALSE THEN 'QC_KHONG_DAT'
    WHEN lot.tk_mo_form_qc_at IS NOT NULL THEN 'CHO_DANH_GIA_QC'
    WHEN lot.tk_chot_nap_at IS NOT NULL THEN 'DANG_TIET_KHUAN'
    ELSE 'DANG_CHUAN_NAP'
  END AS trang_thai,
  lot.tk_chot_nap_at,
  lot.tk_mo_form_qc_at,
  lot.tk_qc_json,
  lot.ket_qua_test,
  lot.is_active,
  lot.created_at,
  lot.updated_at
FROM public.fact_lo_tiet_khuan lot
LEFT JOIN public.dm_thiet_bi tb ON tb.id = lot.thiet_bi_id
LEFT JOIN public.dm_loai_may_tiet_khuan lm ON lm.id = lot.loai_may_id;

CREATE VIEW public.v_fact_su_co_full
WITH (security_invoker = true) AS
SELECT
  sc.id,
  sc.quy_trinh_id,
  sc.ma_qr_quy_trinh,
  sc.ma_tram_phat_hien,
  sc.loai_su_co_id,
  ls.ten_loai_su_co,
  sc.incident_group,
  sc.incident_type_label,
  COALESCE(
    NULLIF(concat(sc.incident_group, ':', sc.incident_type_label), ':'),
    ls.ma_loai_su_co
  ) AS ma_loai_su_co,
  sc.mo_ta,
  sc.is_red_alert,
  sc.ma_tram_gay_loi,
  sc.created_at
FROM public.fact_su_co sc
LEFT JOIN public.dm_loai_su_co ls ON ls.id = sc.loai_su_co_id;

CREATE VIEW public.v_gsc_dashboard_rows
WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  s.ngay_giam_sat,
  s.created_at,
  coalesce(bk.ma_bk, '') AS loai_bang_kiem,
  s.tong_diem,
  s.khoa_id,
  kp.ten_khoa,
  r.id AS result_id,
  r.value AS result_value
FROM public.fact_giam_sat_chung_sessions s
LEFT JOIN public.dm_bang_kiem bk ON bk.id = s.bang_kiem_id
LEFT JOIN public.dm_khoa_phong kp ON kp.id = s.khoa_id
LEFT JOIN public.fact_giam_sat_chung_results r ON r.session_id = s.id
WHERE s.is_active = true;

-- VST dòng quan sát (giữ text legacy trên fact_giam_sat_vst — phase sau)
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
  o.khu_vuc AS khu_vuc_text_legacy,
  o.vi_tri,
  o.nghe_nghiep AS nghe_nghiep_text_legacy,
  COALESCE(kv.ten_khu_vuc, NULLIF(trim(o.khu_vuc), '')) AS ten_khu_vuc_hien_thi,
  COALESCE(nn.ten_nghe_nghiep, NULLIF(trim(o.nghe_nghiep), '')) AS ten_nghe_nghiep_hien_thi,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  nn.ma_nghe_nghiep,
  k.ten_khoa AS ten_khoa_phong,
  o.ngay_giam_sat,
  o.thoi_diem,
  o.hanh_dong,
  o.dung_ky_thuat,
  o.du_thoi_gian,
  o.co_deo_gang,
  o.thoi_gian_ghi_nhan,
  o.legacy_csv_row_id,
  o.ghi_chu,
  o.created_at
FROM public.fact_giam_sat_vst o
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON kv.id = o.khu_vuc_id
LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
LEFT JOIN public.dm_khoa_phong k ON k.id = o.khoa_id;

GRANT SELECT ON public.v_fact_giam_sat_vst_sessions_full TO authenticated, service_role;
GRANT SELECT ON public.v_fact_giam_sat_chung_sessions_full TO authenticated, service_role;
GRANT SELECT ON public.v_fact_cong_viec_full TO authenticated, service_role;
GRANT SELECT ON public.v_cong_viec_qua_han TO authenticated, service_role;
GRANT SELECT ON public.v_dm_thiet_bi_full TO authenticated, service_role;
GRANT SELECT ON public.v_dm_bang_kiem_full TO authenticated, service_role;
GRANT SELECT ON public.v_fact_lo_tiet_khuan_full TO authenticated, service_role;
GRANT SELECT ON public.v_fact_su_co_full TO authenticated, service_role;
GRANT SELECT ON public.v_gsc_dashboard_rows TO authenticated, service_role;
GRANT SELECT ON public.v_fact_giam_sat_vst_full TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) RPC dashboard GSC — lọc theo bang_kiem_id / ma_bk
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_v2(
  p_tu_ngay date,
  p_den_ngay date,
  p_bang_kiem_mas text[] DEFAULT NULL,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_supervision_type text DEFAULT 'ALL'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sum jsonb;
  v_khoa jsonb;
  v_nghe jsonb;
  v_khu jsonb;
  v_trend jsonb;
  v_violation jsonb;
  v_source jsonb;
  v_part jsonb;
BEGIN
  CREATE TEMP TABLE _gsc_sessions ON COMMIT DROP AS
    SELECT
      s.id,
      s.khoa_id,
      s.nghe_nghiep_id,
      s.khu_vuc_id,
      s.ngay_giam_sat,
      coalesce(bk.ma_bk, '') AS loai_bang_kiem,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
        WHEN (
          (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
          AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
        )
        OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.dm_bang_kiem bk ON bk.id = s.bang_kiem_id
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_supervision_type = 'ALL'
        OR (
          CASE
            WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                 AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
            WHEN (
              (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
              AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
            )
            OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
            ELSE 'CHEO'
          END = p_supervision_type
        )
      )
      AND (
        p_bang_kiem_mas IS NULL
        OR bk.ma_bk = ANY (p_bang_kiem_mas)
        OR bk.id::text = ANY (p_bang_kiem_mas)
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids));

  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT s.id),
    'tong_quan_sat', count(r.id),
    'tong_vi_pham', count(r.id) FILTER (WHERE r.value = 'KHONG_DAT'),
    'ty_le_tuan_thu',
    CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END
  )
  INTO v_sum
  FROM _gsc_sessions s
  LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id;

  SELECT jsonb_agg(t)
  INTO v_khoa
  FROM (
    SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1, 2
    ORDER BY 5 DESC
    LIMIT 50
  ) t;

  SELECT jsonb_agg(t)
  INTO v_nghe
  FROM (
    SELECT coalesce(n.id, md5(coalesce(n.ten_nghe_nghiep, 'unknown'))::uuid) AS id, coalesce(n.ten_nghe_nghiep, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1, 2
    ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t)
  INTO v_khu
  FROM (
    SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1, 2
    ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t ORDER BY min_date)
  INTO v_trend
  FROM (
    SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') AS label, min(ngay_giam_sat) AS min_date, count(r.id) AS tong,
           count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1
  ) t;

  SELECT jsonb_agg(t)
  INTO v_violation
  FROM (
    SELECT tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') AS so_vi_pham, count(r.id) AS tong_quan_sat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le_vi_pham
    FROM public.fact_giam_sat_chung_results r
    JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id
    JOIN _gsc_sessions s ON r.session_id = s.id
    GROUP BY 1, 2
    HAVING count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0
    ORDER BY 3 DESC
    LIMIT 20
  ) t;

  SELECT jsonb_agg(t)
  INTO v_source
  FROM (
    SELECT 'Khoa KSNK' AS ten, count(DISTINCT id) FILTER (WHERE stype = 'KSNK') AS so_phien FROM _gsc_sessions
    UNION ALL
    SELECT 'Giám sát chéo', count(DISTINCT id) FILTER (WHERE stype = 'CHEO') FROM _gsc_sessions
    UNION ALL
    SELECT 'Tự giám sát', count(DISTINCT id) FILTER (WHERE stype = 'TU_GIAM_SAT') FROM _gsc_sessions
  ) t;

  SELECT jsonb_agg(t)
  INTO v_part
  FROM (
    SELECT k.id, k.ten_khoa AS ten, count(DISTINCT s.id) FILTER (WHERE s.stype = 'TU_GIAM_SAT') AS so_phien
    FROM public.dm_khoa_phong k
    LEFT JOIN _gsc_sessions s ON k.id = s.khoa_id
    WHERE k.is_active = true
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_khoa_ids IS NULL OR k.id = ANY (p_khoa_ids))
    GROUP BY 1, 2
    ORDER BY 3 ASC, 2 ASC
  ) t;

  RETURN jsonb_build_object(
    'summary', v_sum,
    'by_khoa', coalesce(v_khoa, '[]'::jsonb),
    'by_nghe_nghiep', coalesce(v_nghe, '[]'::jsonb),
    'by_khu_vuc', coalesce(v_khu, '[]'::jsonb),
    'trend', coalesce(v_trend, '[]'::jsonb),
    'violations', coalesce(v_violation, '[]'::jsonb),
    'supervision_sources', coalesce(v_source, '[]'::jsonb),
    'participation', coalesce(v_part, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_dashboard_summary_table(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  CREATE TEMP TABLE _all_sess ON COMMIT DROP AS
  SELECT 'VST_WHO'::text AS ma_bk, 'Vệ sinh tay (WHO)'::text AS ten_bk,
         CASE
           WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
           WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
                OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
           ELSE 'CHEO'
         END AS stype
  FROM public.fact_giam_sat_vst_sessions s
  LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
  LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
  LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
  WHERE s.is_active = true
    AND s.ngay_giam_sat >= p_tu_ngay
    AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))

  UNION ALL

  SELECT coalesce(nullif(btrim(dbk.ma_bk), ''), 'UNKNOWN') AS ma_bk,
         coalesce(dbk.ten_bang_kiem, 'Không rõ') AS ten_bk,
         CASE
           WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
           WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
                OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
           ELSE 'CHEO'
         END AS stype
  FROM public.fact_giam_sat_chung_sessions s
  LEFT JOIN public.dm_bang_kiem dbk ON dbk.id = s.bang_kiem_id
  LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
  LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
  LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
  WHERE s.is_active = true
    AND s.ngay_giam_sat >= p_tu_ngay
    AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids));

  SELECT jsonb_agg(t)
  INTO v_result
  FROM (
    SELECT ma_bk, ten_bk, count(*) AS tong, count(*) FILTER (WHERE stype = 'KSNK') AS ksnk,
           count(*) FILTER (WHERE stype = 'TU_GIAM_SAT') AS tu_gs, count(*) FILTER (WHERE stype = 'CHEO') AS cheo
    FROM _all_sess
    GROUP BY ma_bk, ten_bk
    ORDER BY tong DESC
  ) t;

  RETURN coalesce(v_result, '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Spawn định kỳ QLCV — chỉ ghi FK
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted int := 0;
  r record;
  due date := CURRENT_DATE;
  match_due boolean;
  v_loai_id uuid;
  v_tt_moi_id uuid;
BEGIN
  SELECT id INTO v_loai_id FROM public.dm_loai_cong_viec WHERE ma = 'DINH_KY' LIMIT 1;
  SELECT id INTO v_tt_moi_id FROM public.dm_trang_thai_cong_viec WHERE ma = 'MOI' LIMIT 1;

  FOR r IN
    SELECT * FROM public.fact_cong_viec_dinh_ky WHERE is_active = true
  LOOP
    match_due := false;
    IF r.ma_chu_ky = 'WEEKLY' THEN
      match_due := (r.ngay_bat_dau <= due) AND mod((due - r.ngay_bat_dau)::integer, 7) = 0;
    ELSE
      match_due := (r.ngay_bat_dau <= due)
        AND extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
    END IF;

    IF NOT match_due THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id
        AND c.han_hoan_thanh = due
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.fact_cong_viec (
      tieu_de,
      mo_ta,
      loai_cong_viec_id,
      muc_do_uu_tien,
      trang_thai_id,
      han_hoan_thanh,
      phan_tram_hoan_thanh,
      is_active,
      nguoi_phu_trach_id,
      to_cong_tac_id,
      nguoi_tao_id,
      dinh_ky_mau_id
    )
    VALUES (
      r.tieu_de,
      r.mo_ta,
      v_loai_id,
      'TRUNG_BINH',
      v_tt_moi_id,
      due,
      0,
      true,
      r.nguoi_phu_trach_id,
      r.to_cong_tac_id,
      r.nguoi_tao_id,
      r.id
    );

    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() TO service_role;

COMMENT ON VIEW public.v_fact_cong_viec_full IS
  'QLCV đọc: FK trên fact_cong_viec; ma/ten workflow từ dm_* (không cột text denorm trên bảng gốc).';
