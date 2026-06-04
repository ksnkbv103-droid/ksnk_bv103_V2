-- D-QLCV-02: DROP dual-write FK columns + cong_viec_cha_id (Track B lean).
-- Text CHECK trang_thai/loai_cong_viec = SSOT; bỏ trigger sync FK.

BEGIN;

-- Gỡ việc con legacy (Track B không hỗ trợ sub-task).
DELETE FROM public.qlcv_fact_cong_viec_hoat_dong hd
WHERE hd.id_cong_viec IN (
  SELECT id FROM public.qlcv_fact_cong_viec WHERE cong_viec_cha_id IS NOT NULL
);
DELETE FROM public.qlcv_fact_cong_viec WHERE cong_viec_cha_id IS NOT NULL;

DROP VIEW IF EXISTS public.v_qlcv_cong_viec_qua_han;
DROP VIEW IF EXISTS public.v_qlcv_cong_viec_full;

DROP TRIGGER IF EXISTS trg_qlcv_sync_code_from_fk ON public.qlcv_fact_cong_viec;
DROP FUNCTION IF EXISTS public.fn_qlcv_sync_code_from_fk();

ALTER TABLE public.qlcv_fact_cong_viec DROP CONSTRAINT IF EXISTS fact_cong_viec_cong_viec_cha_id_fkey;
ALTER TABLE public.qlcv_fact_cong_viec DROP CONSTRAINT IF EXISTS fk_cong_viec_loai_cong_viec;

DROP INDEX IF EXISTS public.idx_fact_cong_viec_loai_cong_viec_id;
DROP INDEX IF EXISTS public.idx_fact_cong_viec_trang_thai_id;
DROP INDEX IF EXISTS public.idx_fact_cong_viec_trang_thai_han_active;
DROP INDEX IF EXISTS public.idx_fact_cv_cha;

ALTER TABLE public.qlcv_fact_cong_viec
  DROP COLUMN IF EXISTS cong_viec_cha_id,
  DROP COLUMN IF EXISTS loai_cong_viec_id,
  DROP COLUMN IF EXISTS trang_thai_id;

CREATE INDEX IF NOT EXISTS idx_qlcv_fact_trang_thai_han_active
  ON public.qlcv_fact_cong_viec (trang_thai, han_hoan_thanh)
  WHERE is_active = true;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker = true) AS
SELECT
  cv.id,
  cv.tieu_de,
  cv.mo_ta,
  cv.loai_cong_viec,
  lc.ten AS ten_loai_cong_viec,
  cv.trang_thai,
  ts.ten AS ten_trang_thai_hien_thi,
  ts.mau_sac AS trang_thai_mau_sac,
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
    AND cv.trang_thai <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text])
  ) AS is_qua_han,
  cv.checklist
FROM public.qlcv_fact_cong_viec cv
LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON lc.ma = cv.loai_cong_viec
LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ts.ma = cv.trang_thai
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
LEFT JOIN public.mdm_dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT * FROM public.v_qlcv_cong_viec_full WHERE is_qua_han = true;

CREATE OR REPLACE FUNCTION public.fn_qlcv_update_checklist(
  p_cong_viec_id uuid,
  p_checklist jsonb,
  p_phan_tram_hoan_thanh integer DEFAULT NULL,
  p_trang_thai_ma text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_pct integer;
  v_tt text;
BEGIN
  IF p_cong_viec_id IS NULL THEN
    RAISE EXCEPTION 'p_cong_viec_id bắt buộc';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.qlcv_fact_cong_viec WHERE id = p_cong_viec_id) THEN
    RAISE EXCEPTION 'Không tìm thấy công việc %', p_cong_viec_id;
  END IF;

  v_pct := COALESCE(p_phan_tram_hoan_thanh, 0);

  IF p_trang_thai_ma IS NOT NULL AND btrim(p_trang_thai_ma) <> '' THEN
    v_tt := upper(btrim(p_trang_thai_ma));
    IF NOT EXISTS (
      SELECT 1 FROM public.qlcv_dm_trang_thai_cong_viec WHERE ma = v_tt AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Trạng thái không hợp lệ: %', p_trang_thai_ma;
    END IF;
  END IF;

  UPDATE public.qlcv_fact_cong_viec
     SET checklist = COALESCE(p_checklist, '[]'::jsonb),
         phan_tram_hoan_thanh = v_pct,
         trang_thai = COALESCE(v_tt, trang_thai),
         updated_at = now()
   WHERE id = p_cong_viec_id;

  RETURN jsonb_build_object(
    'id', p_cong_viec_id,
    'phan_tram_hoan_thanh', v_pct,
    'checklist', COALESCE(p_checklist, '[]'::jsonb)
  );
END;
$function$;

DELETE FROM public.sys_mdm_registry
WHERE table_name = 'qlcv_fact_cong_viec'
  AND column_name IN ('loai_cong_viec_id', 'trang_thai_id');

COMMENT ON FUNCTION public.fn_sync_overdue_tasks() IS
  'Batch QLCV: set trang_thai=QUA_HAN trên qlcv_fact_cong_viec. pg_cron qlcv-sync-overdue-tasks 00:05 VNT.';

NOTIFY pgrst, 'reload schema';

COMMIT;
