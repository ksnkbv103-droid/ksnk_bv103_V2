-- CSSD: Trạm workflow → dm_tram_cssd + FK tram_hien_tai_id (SSOT), view đọc alias ma_trang_thai_hien_tai.

CREATE TABLE IF NOT EXISTS public.dm_tram_cssd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_tram text NOT NULL,
  ten_tram text NOT NULL,
  thu_tu smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_tram_cssd_ma_tram_key UNIQUE (ma_tram)
);

INSERT INTO public.dm_tram_cssd (ma_tram, ten_tram, thu_tu)
VALUES
  ('TIEP_NHAN', 'Tiếp nhận', 0),
  ('LAM_SACH', 'Làm sạch', 1),
  ('QC', 'Kiểm tra chất lượng', 2),
  ('DONG_GOI', 'Đóng gói', 3),
  ('TIET_KHUAN', 'Tiệt khuẩn', 4),
  ('CAP_PHAT', 'Cấp phát', 5)
ON CONFLICT (ma_tram) DO UPDATE SET
  ten_tram = EXCLUDED.ten_tram,
  thu_tu = EXCLUDED.thu_tu,
  is_active = true,
  updated_at = now();

ALTER TABLE public.fact_quy_trinh
  ADD COLUMN IF NOT EXISTS tram_hien_tai_id uuid;

UPDATE public.fact_quy_trinh q
SET tram_hien_tai_id = t.id
FROM public.dm_tram_cssd t
WHERE q.tram_hien_tai_id IS NULL
  AND upper(trim(q.ma_trang_thai_hien_tai)) = upper(trim(t.ma_tram));

DO $$
BEGIN
  ALTER TABLE public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_tram_hien_tai
    FOREIGN KEY (tram_hien_tai_id) REFERENCES public.dm_tram_cssd(id)
    ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_fact_quy_trinh_tram_hien_tai_id
  ON public.fact_quy_trinh (tram_hien_tai_id)
  WHERE tram_hien_tai_id IS NOT NULL;

DROP VIEW IF EXISTS public.v_fact_quy_trinh_full CASCADE;

ALTER TABLE public.fact_quy_trinh
  DROP COLUMN IF EXISTS ma_trang_thai_hien_tai,
  DROP COLUMN IF EXISTS tram_hien_tai,
  DROP COLUMN IF EXISTS trang_thai;

CREATE VIEW public.v_fact_quy_trinh_full
WITH (security_invoker = true) AS
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
  q.ma_ca_mo_id,
  q.vi_tri_kho_id,
  q.ngay_het_han,
  q.is_active,
  b.ten_bo,
  b.ma_bo,
  k.ten_khoa,
  l.ten_loai_dung_cu,
  q.created_at,
  q.updated_at
FROM public.fact_quy_trinh q
LEFT JOIN public.dm_tram_cssd t ON t.id = q.tram_hien_tai_id
LEFT JOIN public.dm_bo_dung_cu b ON q.bo_dung_cu_id = b.id
LEFT JOIN public.dm_khoa_phong k ON b.khoa_su_dung_id = k.id
LEFT JOIN public.dm_loai_dung_cu l ON b.loai_dung_cu_id = l.id;

GRANT SELECT ON public.v_fact_quy_trinh_full TO authenticated, service_role;
GRANT SELECT ON public.dm_tram_cssd TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rpc_scan_workflow_station(
  p_ma_qr text,
  p_target_station text,
  p_operator_label text DEFAULT 'CSSD'::text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  FROM public.fact_quy_trinh q
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

  UPDATE public.fact_quy_trinh
  SET tram_hien_tai_id = v_target_id, updated_at = now()
  WHERE id = v_row.id;

  RETURN json_build_object(
    'success', true,
    'data', jsonb_build_object('den', upper(trim(p_target_station)), 'operator', p_operator_label)
  );
END;
$$;

COMMENT ON TABLE public.dm_tram_cssd IS 'Danh mục trạm workflow CSSD (QR scan). SSOT mã trạm; fact_quy_trinh.tram_hien_tai_id.';
COMMENT ON VIEW public.v_fact_quy_trinh_full IS 'CSSD quy trình đọc: tram_hien_tai_id + alias ma_trang_thai_hien_tai từ dm_tram_cssd.';
