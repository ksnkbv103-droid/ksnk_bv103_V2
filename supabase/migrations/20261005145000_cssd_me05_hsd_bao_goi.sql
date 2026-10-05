-- ME-05 · HSD theo loại bao gói + mốc kết thúc chu trình mẻ
-- File only — CHƯA apply.
-- N-ME-2 TRSL sàn tham chiếu (ngày): VAI 7 · GIAY 30 · TUI_EP 180 · HOP 180 — không ép default 30 khi thiếu cấu hình.

CREATE TABLE IF NOT EXISTS public.cssd_dm_loai_bao_goi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma text NOT NULL,
  ten text NOT NULL,
  so_ngay_han_dung integer NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cssd_dm_loai_bao_goi_ma_len CHECK (char_length(btrim(ma)) BETWEEN 1 AND 40),
  CONSTRAINT cssd_dm_loai_bao_goi_ten_len CHECK (char_length(btrim(ten)) BETWEEN 1 AND 120),
  CONSTRAINT cssd_dm_loai_bao_goi_so_ngay_nonneg CHECK (
    so_ngay_han_dung IS NULL OR so_ngay_han_dung > 0
  )
);

COMMENT ON TABLE public.cssd_dm_loai_bao_goi IS
  'ME-05: danh mục loại bao bì đóng gói — số ngày HSD nullable (không default 30).';
COMMENT ON COLUMN public.cssd_dm_loai_bao_goi.so_ngay_han_dung IS
  'Số ngày hạn dùng kể từ mốc kết thúc chu trình tiệt khuẩn; NULL → app/RPC không gán HSD.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cssd_dm_loai_bao_goi_ma
  ON public.cssd_dm_loai_bao_goi (lower(btrim(ma)))
  WHERE is_active = true;

ALTER TABLE public.cssd_fact_quy_trinh
  ADD COLUMN IF NOT EXISTS loai_bao_goi_id uuid NULL
  REFERENCES public.cssd_dm_loai_bao_goi(id);

ALTER TABLE public.cssd_dm_bo_dung_cu
  ADD COLUMN IF NOT EXISTS loai_bao_goi_id uuid NULL
  REFERENCES public.cssd_dm_loai_bao_goi(id);

COMMENT ON COLUMN public.cssd_fact_quy_trinh.loai_bao_goi_id IS
  'ME-05: loại bao gói chu kỳ (ưu tiên hơn loại trên bộ mẫu).';
COMMENT ON COLUMN public.cssd_dm_bo_dung_cu.loai_bao_goi_id IS
  'ME-05: loại bao gói mặc định của bộ/set khi QR chưa ghi riêng.';

-- Seed tùy chọn (sàn TRSL N-ME-2) — bỏ comment khối INSERT nếu không muốn seed local
INSERT INTO public.cssd_dm_loai_bao_goi (ma, ten, so_ngay_han_dung)
SELECT v.ma, v.ten, v.so_ngay_han_dung
FROM (VALUES
  ('VAI', 'Vải (sàn TRSL)', 7),
  ('GIAY', 'Giấy (sàn TRSL)', 30),
  ('TUI_EP', 'Túi ép (sàn TRSL)', 180),
  ('HOP', 'Hộp (sàn TRSL)', 180)
) AS v(ma, ten, so_ngay_han_dung)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cssd_dm_loai_bao_goi g
  WHERE lower(btrim(g.ma)) = lower(btrim(v.ma))
);

ALTER TABLE public.cssd_dm_loai_bao_goi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cssd_dm_loai_bao_goi_select ON public.cssd_dm_loai_bao_goi;
CREATE POLICY cssd_dm_loai_bao_goi_select
  ON public.cssd_dm_loai_bao_goi
  FOR SELECT TO authenticated
  USING (public.fn_sys_has_permission('CSSD'::text, 'view'::text));

DROP POLICY IF EXISTS cssd_dm_loai_bao_goi_write ON public.cssd_dm_loai_bao_goi;
CREATE POLICY cssd_dm_loai_bao_goi_write
  ON public.cssd_dm_loai_bao_goi
  FOR ALL TO authenticated
  USING (public.fn_sys_has_permission('CSSD'::text, 'edit'::text))
  WITH CHECK (public.fn_sys_has_permission('CSSD'::text, 'edit'::text));

GRANT SELECT ON public.cssd_dm_loai_bao_goi TO authenticated;
GRANT ALL ON public.cssd_dm_loai_bao_goi TO service_role;

CREATE OR REPLACE FUNCTION public.fn_cssd_me_chuyen_bo_kho_vo_khuan(
  p_me_id uuid,
  p_ids uuid[],
  p_now timestamptz,
  p_nguoi_nhan_su_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cap uuid;
  v_tk uuid;
  v_n int;
  v_moc timestamptz;
BEGIN
  SELECT coalesce(m.thoi_gian_ket_thuc, m.tk_mo_form_qc_at)
  INTO v_moc
  FROM public.cssd_fact_lo_tiet_khuan m
  WHERE m.id = p_me_id;

  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  SELECT t.id INTO v_cap
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'CAP_PHAT' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_tk IS NULL OR v_cap IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm TIỆT KHUẨN hoặc CẤP PHÁT.';
  END IF;

  UPDATE public.cssd_fact_quy_trinh AS q
  SET
    tram_hien_tai_id = v_cap,
    thoi_gian_tiet_khuan = v_moc,
    ngay_het_han = CASE
      WHEN src.so_ngay IS NOT NULL AND v_moc IS NOT NULL
        THEN v_moc + make_interval(days => src.so_ngay)
      ELSE NULL
    END,
    han_su_dung = CASE
      WHEN src.so_ngay IS NOT NULL AND v_moc IS NOT NULL
        THEN v_moc + make_interval(days => src.so_ngay)
      ELSE NULL
    END,
    tinh_trang = 'BINH_THUONG',
    nguoi_tiet_khuan_id = coalesce(p_nguoi_nhan_su_id, q.nguoi_tiet_khuan_id),
    updated_at = p_now
  FROM (
    SELECT
      q1.id,
      bg.so_ngay_han_dung AS so_ngay
    FROM public.cssd_fact_quy_trinh q1
    LEFT JOIN public.cssd_dm_bo_dung_cu b ON b.id = q1.bo_dung_cu_id
    LEFT JOIN public.cssd_dm_loai_bao_goi bg ON bg.id = coalesce(q1.loai_bao_goi_id, b.loai_bao_goi_id)
      AND coalesce(bg.is_active, true) = true
    WHERE q1.id = ANY (p_ids)
  ) src
  WHERE q.id = src.id
    AND q.lo_tiet_khuan_id = p_me_id
    AND q.is_active = true
    AND q.tram_hien_tai_id = v_tk;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

COMMENT ON FUNCTION public.fn_cssd_me_chuyen_bo_kho_vo_khuan(uuid, uuid[], timestamptz, uuid) IS
  'ME-05: chuyển bộ vô khuẩn — mốc HSD = thoi_gian_ket_thuc mẻ (fallback tk_mo_form_qc_at); ngày từ loại bao gói QR/bộ; thiếu cấu hình → han_su_dung NULL.';

REVOKE ALL ON FUNCTION public.fn_cssd_me_chuyen_bo_kho_vo_khuan(uuid, uuid[], timestamptz, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_me_chuyen_bo_kho_vo_khuan(uuid, uuid[], timestamptz, uuid) TO service_role;
