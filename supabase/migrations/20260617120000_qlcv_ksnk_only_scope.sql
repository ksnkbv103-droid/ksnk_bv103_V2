-- QLCV KSNK-only: xóa phiếu giao ngoài KSNK, backfill khoa_thuc_hien_id, NOT NULL.

BEGIN;

DO $$
DECLARE
  v_ksnk uuid;
BEGIN
  SELECT id INTO v_ksnk
  FROM public.mdm_dm_khoa_phong
  WHERE ma_khoa = 'KSNK' AND is_active = true
  ORDER BY created_at
  LIMIT 1;

  IF v_ksnk IS NULL THEN
    RAISE NOTICE 'QLCV KSNK-only: chưa có mdm_dm_khoa_phong.ma_khoa=KSNK — bỏ qua purge/backfill.';
    RETURN;
  END IF;

  -- Xóa hoạt động + phiếu có phụ trách không thuộc KSNK
  DELETE FROM public.qlcv_fact_cong_viec_hoat_dong hd
  WHERE hd.id_cong_viec IN (
    SELECT cv.id
    FROM public.qlcv_fact_cong_viec cv
    LEFT JOIN public.mdm_nhan_su ns ON ns.id = cv.nguoi_phu_trach_id
    WHERE cv.nguoi_phu_trach_id IS NOT NULL
      AND (ns.id IS NULL OR ns.khoa_id IS DISTINCT FROM v_ksnk)
  );

  DELETE FROM public.qlcv_fact_cong_viec cv
  WHERE cv.nguoi_phu_trach_id IS NOT NULL
    AND cv.nguoi_phu_trach_id NOT IN (
      SELECT id FROM public.mdm_nhan_su WHERE khoa_id = v_ksnk AND is_active = true
    );

  -- Xóa phiếu gắn khoa thực hiện khác KSNK
  DELETE FROM public.qlcv_fact_cong_viec_hoat_dong hd
  WHERE hd.id_cong_viec IN (
    SELECT id FROM public.qlcv_fact_cong_viec
    WHERE khoa_thuc_hien_id IS NOT NULL AND khoa_thuc_hien_id <> v_ksnk
  );

  DELETE FROM public.qlcv_fact_cong_viec
  WHERE khoa_thuc_hien_id IS NOT NULL AND khoa_thuc_hien_id <> v_ksnk;

  -- Backfill mọi phiếu còn lại → KSNK
  UPDATE public.qlcv_fact_cong_viec
  SET khoa_thuc_hien_id = v_ksnk, updated_at = now()
  WHERE khoa_thuc_hien_id IS NULL;

  UPDATE public.qlcv_fact_cong_viec_dinh_ky
  SET khoa_thuc_hien_id = v_ksnk, updated_at = now()
  WHERE khoa_thuc_hien_id IS NULL OR khoa_thuc_hien_id <> v_ksnk;
END $$;

-- NOT NULL chỉ khi đã có khoa KSNK và không còn NULL
DO $$
DECLARE
  v_ksnk uuid;
  v_nulls bigint;
BEGIN
  SELECT id INTO v_ksnk FROM public.mdm_dm_khoa_phong WHERE ma_khoa = 'KSNK' AND is_active = true LIMIT 1;
  IF v_ksnk IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO v_nulls FROM public.qlcv_fact_cong_viec WHERE khoa_thuc_hien_id IS NULL;
  IF v_nulls = 0 THEN
    ALTER TABLE public.qlcv_fact_cong_viec
      ALTER COLUMN khoa_thuc_hien_id SET NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.qlcv_fact_cong_viec.khoa_thuc_hien_id IS
  'Luôn = Khoa KSNK (ma_khoa KSNK). QLCV nội bộ — không giao việc liên khoa lâm sàng.';

NOTIFY pgrst, 'reload schema';

COMMIT;
