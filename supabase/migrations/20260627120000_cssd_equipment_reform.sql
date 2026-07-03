-- CSSD equipment reform: loại máy bổ sung + evolve cssd_fact_bao_tri (Slice A/B)

-- Loại máy CSSD bổ sung (additive)
INSERT INTO public.sys_lookup_value (category_type, code, name, metadata, is_active)
SELECT v.category_type, v.code, v.name, v.metadata::jsonb, true
FROM (VALUES
  ('LOAI_MAY_TIET_KHUAN', 'LM_DONG_GOI', 'Máy đóng gói (sealer)', '{"thu_tu":7}'),
  ('LOAI_MAY_TIET_KHUAN', 'LM_TEST_BI', 'Tủ/incubator ủ BI', '{"thu_tu":8}'),
  ('LOAI_MAY_TIET_KHUAN', 'LM_GIAT_LA', 'Máy giặt / sấy / là hơi vải', '{"thu_tu":9}')
) AS v(category_type, code, name, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sys_lookup_value x
  WHERE x.category_type = v.category_type AND x.code = v.code
);

-- Evolve phiếu bảo dưỡng
ALTER TABLE public.cssd_fact_bao_tri
  ADD COLUMN IF NOT EXISTS loai_phieu character varying(20) DEFAULT 'DINH_KY' NOT NULL,
  ADD COLUMN IF NOT EXISTS checklist_jsonb jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS su_co_id uuid,
  ADD COLUMN IF NOT EXISTS nguoi_thuc_hien_id uuid;

ALTER TABLE public.cssd_fact_bao_tri
  DROP CONSTRAINT IF EXISTS cssd_fact_bao_tri_loai_phieu_check;

ALTER TABLE public.cssd_fact_bao_tri
  ADD CONSTRAINT cssd_fact_bao_tri_loai_phieu_check
  CHECK (loai_phieu IN ('DINH_KY', 'SUA_CHUA'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_bao_tri_su_co_id_fkey'
  ) THEN
    ALTER TABLE public.cssd_fact_bao_tri
      ADD CONSTRAINT cssd_fact_bao_tri_su_co_id_fkey
      FOREIGN KEY (su_co_id) REFERENCES public.cssd_fact_su_co(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_bao_tri_nguoi_thuc_hien_id_fkey'
  ) THEN
    ALTER TABLE public.cssd_fact_bao_tri
      ADD CONSTRAINT cssd_fact_bao_tri_nguoi_thuc_hien_id_fkey
      FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.cssd_fact_bao_tri.loai_phieu IS 'DINH_KY = bảo dưỡng định kỳ; SUA_CHUA = sửa chữa từ sự cố hoặc hỏng hóc.';
COMMENT ON COLUMN public.cssd_fact_bao_tri.checklist_jsonb IS 'Checklist PM snapshot [{id, label, done}] theo loại máy lúc mở phiếu.';

-- Postgres không cho thêm cột giữa view bằng CREATE OR REPLACE — phải drop rồi tạo lại.
DROP VIEW IF EXISTS public.v_cssd_thiet_bi_full;

CREATE VIEW public.v_cssd_thiet_bi_full WITH (security_invoker = true) AS
 SELECT tb.id,
    tb.ma_thiet_bi,
    tb.ten_thiet_bi,
    tb.loai_may_id,
    lm.ma_loai_may,
    lm.ten_loai_may AS ten_loai_may_hien_thi,
    lm.ma_loai_may AS loai_thiet_bi,
    tb.trang_thai,
    (tb.specs ->> 'hang_san_xuat'::text) AS hang_san_xuat,
    ((tb.specs ->> 'nam_san_xuat'::text))::integer AS nam_san_xuat,
    (tb.specs ->> 'serial_number'::text) AS serial_number,
    (tb.specs ->> 'model'::text) AS model,
    (tb.specs ->> 'vi_tri'::text) AS vi_tri,
    tb.ngay_dua_vao_su_dung,
    tb.chu_ky_bao_tri_ngay,
    tb.ngay_bao_tri_gan_nhat,
    tb.ngay_bao_tri_tiep_theo,
    (tb.specs ->> 'ghi_chu'::text) AS ghi_chu,
    tb.specs,
    tb.is_active,
    tb.created_at,
    tb.updated_at
   FROM public.cssd_dm_thiet_bi tb
     LEFT JOIN public.cssd_dm_loai_may lm ON lm.id = tb.loai_may_id;

GRANT SELECT ON public.v_cssd_thiet_bi_full TO anon, authenticated, service_role;
