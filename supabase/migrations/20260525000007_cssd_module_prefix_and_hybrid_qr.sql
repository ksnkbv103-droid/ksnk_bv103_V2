-- Supabase Migration: 20260525000007_cssd_module_prefix_and_hybrid_qr.sql
-- Description: Prefix all CSSD tables with cssd_, upgrade catalog properties, implement backward-compatible views and drop fact_nhat_ky_quet log table.

BEGIN;

-- Drop obsolete sync trigger/function that references virtual view columns on physical tables
DROP TRIGGER IF EXISTS trg_sync_loai_dung_cu_names ON public.dm_loai_dung_cu CASCADE;
DROP FUNCTION IF EXISTS public.fn_sync_loai_dung_cu_names() CASCADE;



-- 1. Drop existing views that reference the target tables
DROP VIEW IF EXISTS public.v_dm_loai_dung_cu_summary CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_chi_tiet_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_quy_trinh_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_su_co_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_lo_tiet_khuan_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_summary CASCADE;
-- DROP VIEW IF EXISTS public.fact_nhat_ky_quet CASCADE;

-- 2. Rename physical tables to have cssd_ prefix
ALTER TABLE IF EXISTS public.dm_loai_dung_cu RENAME TO cssd_dm_loai_dung_cu;
ALTER TABLE IF EXISTS public.dm_bo_dung_cu RENAME TO cssd_dm_bo_dung_cu;
ALTER TABLE IF EXISTS public.dm_bo_dung_cu_chi_tiet RENAME TO cssd_dm_bo_dung_cu_chi_tiet;
ALTER TABLE IF EXISTS public.dm_bo_dung_cu_phan_bo RENAME TO cssd_dm_bo_phan_bo;

-- Ensure physical table cssd_dm_bo_phan_bo exists for view compilation stability
CREATE TABLE IF NOT EXISTS public.cssd_dm_bo_phan_bo (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bo_dung_cu_id uuid NOT NULL REFERENCES public.cssd_dm_bo_dung_cu(id) ON DELETE CASCADE,
    khoa_phong_id uuid NOT NULL REFERENCES public.dm_khoa_phong(id) ON DELETE CASCADE,
    so_luong_co_so integer NOT NULL DEFAULT 0,
    so_luong_hien_tai integer NOT NULL DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_bo_khoa UNIQUE (bo_dung_cu_id, khoa_phong_id)
);

ALTER TABLE IF EXISTS public.fact_quy_trinh RENAME TO cssd_fact_quy_trinh;
ALTER TABLE IF EXISTS public.fact_quy_trinh_thanh_phan RENAME TO cssd_fact_quy_trinh_thanh_phan;
ALTER TABLE IF EXISTS public.fact_lo_tiet_khuan RENAME TO cssd_fact_lo_tiet_khuan;
ALTER TABLE IF EXISTS public.fact_su_co RENAME TO cssd_fact_su_co;
ALTER TABLE IF EXISTS public.fact_kho_dung_cu_giao_dich RENAME TO cssd_fact_kho_giao_dich;
ALTER TABLE IF EXISTS public.fact_kho_hoa_chat_giao_dich RENAME TO cssd_fact_kho_hoa_chat_giao_dich;
ALTER TABLE IF EXISTS public.fact_cssd_lifecycle_event RENAME TO cssd_fact_lifecycle_event;

-- 3. Add physical columns to cssd_dm_loai_dung_cu
ALTER TABLE public.cssd_dm_loai_dung_cu 
ADD COLUMN IF NOT EXISTS phan_loai_spaulding text NOT NULL DEFAULT 'CRITICAL' CHECK (phan_loai_spaulding IN ('CRITICAL', 'SEMI_CRITICAL', 'NON_CRITICAL')),
ADD COLUMN IF NOT EXISTS is_chiu_nhiet boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS phuong_phap_tiet_khuan_chi_dinh text NOT NULL DEFAULT 'STEAM_134' CHECK (phuong_phap_tiet_khuan_chi_dinh IN ('STEAM_134', 'STEAM_121', 'PLASMA', 'EO'));

-- Populate new physical columns from JSONB specs
UPDATE public.cssd_dm_loai_dung_cu
SET 
  is_chiu_nhiet = CASE WHEN specs->>'kha_nang_chiu_nhiet' = 'KHONG' THEN false ELSE true END,
  phuong_phap_tiet_khuan_chi_dinh = CASE 
    WHEN specs->>'phuong_phap_tiet_khuan' IN ('STEAM_134', 'STEAM_121', 'PLASMA', 'EO') THEN specs->>'phuong_phap_tiet_khuan'
    WHEN specs->>'phuong_phap_tiet_khuan' ILIKE '%nhiệt%cao%' THEN 'STEAM_134'
    WHEN specs->>'phuong_phap_tiet_khuan' ILIKE '%hấp%' THEN 'STEAM_134'
    WHEN specs->>'phuong_phap_tiet_khuan' ILIKE '%plasma%' THEN 'PLASMA'
    WHEN specs->>'phuong_phap_tiet_khuan' ILIKE '%eo%' THEN 'EO'
    ELSE 'STEAM_134'
  END,
  phan_loai_spaulding = 'CRITICAL';


-- Add index on new columns
CREATE INDEX IF NOT EXISTS idx_cssd_dm_loai_dung_cu_chiu_nhiet ON public.cssd_dm_loai_dung_cu(is_chiu_nhiet);

-- 4. Add foreign key to cssd_fact_kho_giao_dich pointing to mdm_nhan_su(id)
ALTER TABLE public.cssd_fact_kho_giao_dich
ADD CONSTRAINT fk_cssd_kho_giao_dich_nguoi_thuc_hien FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;

-- 5. Drop raw scan log table to prevent data explosion
DROP TABLE IF EXISTS public.fact_nhat_ky_quet CASCADE;

-- 6. Recreate standard read-only/summary views pointing to new tables

-- v_dm_loai_dung_cu_summary
CREATE OR REPLACE VIEW public.v_dm_loai_dung_cu_summary AS
SELECT l.id,
    l.ma_loai,
    l.ten_loai,
    l.mo_ta,
    l.created_at,
    l.updated_at,
    l.is_active,
    l.specs->>'ma_loai_dung_cu' AS ma_loai_dung_cu,
    l.specs->>'ten_loai_dung_cu' AS ten_loai_dung_cu,
    (l.specs ->> 'hinh_dang'::text) AS hinh_dang,
    (l.specs ->> 'kich_thuoc'::text) AS kich_thuoc,
    (l.specs ->> 'cong_dung'::text) AS cong_dung,
    l.is_chiu_nhiet AS is_chiu_nhiet,
    l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan,
    l.phan_loai_spaulding,
    l.so_ngay_han_dung,
    l.phan_loai,
    l.so_luong_kho_du_phong,
    (COALESCE(l.so_luong_kho_du_phong, 0) + (COALESCE(sum(
        CASE
            WHEN ((b.is_active = true) AND (c.is_active = true)) THEN c.so_luong
            ELSE 0
        END), (0)::bigint))::integer) AS so_luong_tong,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', b.id, 'ma_bo', b.ma_bo, 'ten_bo', b.ten_bo)) FILTER (WHERE ((b.id IS NOT NULL) AND (b.is_active = true) AND (c.is_active = true))), '[]'::jsonb) AS bo_dung_cu_chua
   FROM ((cssd_dm_loai_dung_cu l
     LEFT JOIN cssd_dm_bo_dung_cu_chi_tiet c ON ((c.loai_dung_cu_id = l.id)))
     LEFT JOIN cssd_dm_bo_dung_cu b ON ((c.bo_dung_cu_id = b.id)))
  GROUP BY l.id;

-- v_dm_bo_dung_cu_full
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_full AS
SELECT b.id,
    b.ma_bo,
    b.ten_bo,
    b.loai_dung_cu_id,
    l.ma_loai AS ma_loai_dung_cu,
    l.ten_loai AS ten_loai_dung_cu,
    b.khoa_su_dung_id,
    k.ma_khoa AS ma_khoa_su_dung,
    k.ten_khoa AS ten_khoa_su_dung,
    b.trang_thai,
    b.quy_cach,
    b.ghi_chu,
    b.ngay_kiem_ke_gan_nhat,
    b.is_active,
    b.created_at,
    b.updated_at
   FROM ((cssd_dm_bo_dung_cu b
     LEFT JOIN cssd_dm_loai_dung_cu l ON ((l.id = b.loai_dung_cu_id)))
     LEFT JOIN dm_khoa_phong k ON ((k.id = b.khoa_su_dung_id)));

-- v_dm_bo_dung_cu_chi_tiet_full
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_chi_tiet_full AS
SELECT c.id,
    c.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    c.loai_dung_cu_id,
    l.ma_loai AS ma_loai_dung_cu,
    l.ten_loai AS ten_loai_dung_cu,
    c.specs->>'ma_chi_tiet' AS ma_chi_tiet,
    c.ten_chi_tiet,
    c.ten_dung_cu_le,
    c.so_luong,
    c.specs->>'ma_qr_mau' AS ma_qr_mau,
    (c.specs->>'co_ma_khac')::boolean AS co_ma_khac,
    c.specs->>'ma_khac' AS ma_khac,
    c.is_active,
    c.ghi_chu,
    c.created_at,
    c.updated_at,
    c.specs
   FROM ((cssd_dm_bo_dung_cu_chi_tiet c
     LEFT JOIN cssd_dm_bo_dung_cu b ON ((b.id = c.bo_dung_cu_id)))
     LEFT JOIN cssd_dm_loai_dung_cu l ON ((l.id = c.loai_dung_cu_id)));

-- v_fact_lo_tiet_khuan_full
CREATE OR REPLACE VIEW public.v_fact_lo_tiet_khuan_full WITH (security_invoker='true') AS
 SELECT lot.id,
    lot.ma_lo_tiet_khuan,
    lot.thiet_bi_id,
    tb.ten_thiet_bi,
    lot.loai_may_id,
    lm.code AS ma_loai_may,
    lm.name AS ten_loai_tiet_khuan,
        CASE
            WHEN (lot.ket_qua_test IS TRUE) THEN 'HOAN_THANH'::text
            WHEN (lot.ket_qua_test IS FALSE) THEN 'QC_KHONG_DAT'::text
            WHEN (lot.tk_mo_form_qc_at IS NOT NULL) THEN 'CHO_DANH_GIA_QC'::text
            WHEN (lot.tk_chot_nap_at IS NOT NULL) THEN 'DANG_TIET_KHUAN'::text
            ELSE 'DANG_CHUAN_NAP'::text
        END AS trang_thai,
    lot.tk_chot_nap_at,
    lot.tk_mo_form_qc_at,
    lot.tk_qc_json,
    lot.ket_qua_test,
    lot.is_active,
    lot.created_at,
    lot.updated_at
   FROM ((cssd_fact_lo_tiet_khuan lot
     LEFT JOIN dm_thiet_bi tb ON ((tb.id = lot.thiet_bi_id)))
     LEFT JOIN dm_lookup_value lm ON ((lm.id = lot.loai_may_id AND lm.category_type = 'LOAI_MAY_TIET_KHUAN')));

-- v_fact_quy_trinh_full
CREATE OR REPLACE VIEW public.v_fact_quy_trinh_full WITH (security_invoker='true') AS
 SELECT q.id,
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
    q.metadata->>'ma_ca_mo_id' AS ma_ca_mo_id,
    q.vi_tri_kho_id,
    q.ngay_het_han,
    q.is_active,
    b.ten_bo,
    b.ma_bo,
    k.ten_khoa,
    l.ten_loai AS ten_loai_dung_cu,
    q.created_at,
    q.updated_at
   FROM ((((cssd_fact_quy_trinh q
     LEFT JOIN dm_tram_cssd t ON ((t.id = q.tram_hien_tai_id)))
     LEFT JOIN cssd_dm_bo_dung_cu b ON ((q.bo_dung_cu_id = b.id)))
     LEFT JOIN dm_khoa_phong k ON ((b.khoa_su_dung_id = k.id)))
     LEFT JOIN cssd_dm_loai_dung_cu l ON ((b.loai_dung_cu_id = l.id)));

-- v_fact_su_co_full
CREATE OR REPLACE VIEW public.v_fact_su_co_full WITH (security_invoker='true') AS
 SELECT sc.id,
    sc.quy_trinh_id,
    sc.ma_qr_quy_trinh,
    sc.ma_tram_phat_hien,
    sc.loai_su_co_id,
    ls.name AS ten_loai_su_co,
    sc.attributes->>'incident_group' AS incident_group,
    sc.attributes->>'incident_type_label' AS incident_type_label,
    COALESCE(NULLIF(concat(sc.attributes->>'incident_group', ':', sc.attributes->>'incident_type_label'), ':'::text), ls.code) AS ma_loai_su_co,
    sc.mo_ta,
    sc.is_red_alert,
    sc.ma_tram_gay_loi,
    sc.created_at,
    sc.attributes
   FROM (cssd_fact_su_co sc
     LEFT JOIN dm_lookup_value ls ON (((ls.id = sc.loai_su_co_id) AND (ls.category_type = 'LOAI_SU_CO'::text))));

-- v_dm_bo_dung_cu_summary (Optimized to prevent O(N) history scan)
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_summary AS
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
    COALESCE(q_active.cnt, 0)::integer AS so_luong_bo,
    COALESCE(COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true), 0)::integer AS so_khoan,
    COALESCE(SUM(c.so_luong) FILTER (WHERE c.is_active = true), 0)::integer AS tong_so_luong_dung_cu,
    COALESCE(SUM(p.so_luong_hien_tai) FILTER (WHERE p.is_active = true), 0)::integer AS tong_phan_bo
FROM cssd_dm_bo_dung_cu b
LEFT JOIN (
    SELECT bo_dung_cu_id, COUNT(id) AS cnt 
    FROM cssd_fact_quy_trinh 
    WHERE is_active = true AND tinh_trang IS DISTINCT FROM 'MAT'
    GROUP BY bo_dung_cu_id
) q_active ON q_active.bo_dung_cu_id = b.id
LEFT JOIN cssd_dm_bo_dung_cu_chi_tiet c ON c.bo_dung_cu_id = b.id
LEFT JOIN cssd_dm_bo_phan_bo p ON p.bo_dung_cu_id = b.id
GROUP BY b.id, q_active.cnt;

-- 7. Recreate backward-compatible updatable views for external modules (Admin CRUD, Import/Export)
CREATE OR REPLACE VIEW public.dm_loai_dung_cu WITH (security_invoker='true') AS SELECT * FROM public.cssd_dm_loai_dung_cu;
CREATE OR REPLACE VIEW public.dm_bo_dung_cu WITH (security_invoker='true') AS SELECT * FROM public.cssd_dm_bo_dung_cu;
CREATE OR REPLACE VIEW public.dm_bo_dung_cu_chi_tiet WITH (security_invoker='true') AS SELECT * FROM public.cssd_dm_bo_dung_cu_chi_tiet;
CREATE OR REPLACE VIEW public.dm_bo_dung_cu_phan_bo WITH (security_invoker='true') AS SELECT * FROM public.cssd_dm_bo_phan_bo;
CREATE OR REPLACE VIEW public.fact_quy_trinh WITH (security_invoker='true') AS SELECT * FROM public.cssd_fact_quy_trinh;
CREATE OR REPLACE VIEW public.fact_quy_trinh_thanh_phan WITH (security_invoker='true') AS SELECT * FROM public.cssd_fact_quy_trinh_thanh_phan;
CREATE OR REPLACE VIEW public.fact_lo_tiet_khuan WITH (security_invoker='true') AS SELECT * FROM public.cssd_fact_lo_tiet_khuan;
CREATE OR REPLACE VIEW public.fact_su_co WITH (security_invoker='true') AS SELECT * FROM public.cssd_fact_su_co;
CREATE OR REPLACE VIEW public.fact_kho_dung_cu_giao_dich WITH (security_invoker='true') AS SELECT * FROM public.cssd_fact_kho_giao_dich;
CREATE OR REPLACE VIEW public.fact_kho_hoa_chat_giao_dich WITH (security_invoker='true') AS SELECT * FROM public.cssd_fact_kho_hoa_chat_giao_dich;
CREATE OR REPLACE VIEW public.fact_cssd_lifecycle_event WITH (security_invoker='true') AS SELECT * FROM public.cssd_fact_lifecycle_event;

-- 8. Recreate updated rpc_scan_workflow_station database function
CREATE OR REPLACE FUNCTION public.rpc_scan_workflow_station(p_ma_qr text, p_target_station text, p_operator_label text DEFAULT 'CSSD'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row RECORD;
  v_current_ma text;
  v_target_id uuid;
  v_current_idx INT;
  v_target_idx INT;
BEGIN
  SELECT q.*, t.ma_tram AS ma_tram_hien_tai
  INTO v_row
  FROM public.cssd_fact_quy_trinh q
  LEFT JOIN public.dm_tram_cssd t ON t.id = q.tram_hien_tai_id
  WHERE upper(q.ma_qr_quy_trinh) = upper(trim(p_ma_qr))
    AND q.is_active = true
  ORDER BY q.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ hoặc bộ chưa được tiếp nhận.');
  END IF;

  IF v_row.is_dong_bang = true THEN
    RETURN json_build_object('success', false, 'message', 'Bộ dụng cụ ' || p_ma_qr || ' đang bị khóa an toàn (đóng băng).');
  END IF;

  SELECT id INTO v_target_id FROM public.dm_tram_cssd
  WHERE upper(trim(ma_tram)) = upper(trim(p_target_station)) AND is_active = true
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Trạm không hợp lệ: ' || coalesce(p_target_station, ''));
  END IF;

  v_current_ma := coalesce(v_row.ma_tram_hien_tai, '');

  v_current_idx := CASE v_current_ma
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  v_target_idx := CASE upper(trim(p_target_station))
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  IF NOT (v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN') THEN
    IF v_target_idx != v_current_idx + 1 THEN
      RETURN json_build_object('success', false, 'message', 'Sai trạm! Quy trình đang ở bước ' || v_current_ma);
    END IF;
  END IF;

  -- BẢN MỚI: Nếu là bắt đầu chu kỳ mới (TIEP_NHAN từ CAP_PHAT), ta INSERT một dòng mới thay vì UPDATE
  IF v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN' THEN
    -- Khi tiếp nhận chu kỳ mới cho mã bộ, chúng ta tạo một dòng mới trong cssd_fact_quy_trinh
    INSERT INTO public.cssd_fact_quy_trinh(
      ma_qr_quy_trinh,
      bo_dung_cu_id,
      tram_hien_tai_id,
      suds_count,
      tinh_trang,
      is_dong_bang,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      p_ma_qr,
      v_row.bo_dung_cu_id,
      v_target_id,
      coalesce(v_row.suds_count, 0) + 1,
      'BINH_THUONG',
      false,
      true,
      now(),
      now()
    );
    -- Deactivate dòng chu kỳ cũ để tránh trùng lặp active
    UPDATE public.cssd_fact_quy_trinh
    SET is_active = false, updated_at = now()
    WHERE id = v_row.id;
  ELSE
    -- Các bước chuyển trạm trung gian bình thường thì UPDATE dòng hiện tại
    UPDATE public.cssd_fact_quy_trinh
    SET tram_hien_tai_id = v_target_id, updated_at = now()
    WHERE id = v_row.id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'data', jsonb_build_object('den', upper(trim(p_target_station)), 'operator', p_operator_label)
  );
END;
$$;

COMMIT;
