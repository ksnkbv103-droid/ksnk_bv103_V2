-- A′: Đồng bộ ma_qr_quy_trinh / ma_qr_bo_vinh_vien = ma_bo (B01.SET.01) khi đã có bo_dung_cu_id.

UPDATE public.cssd_fact_quy_trinh q
SET
  ma_qr_quy_trinh = upper(trim(b.ma_bo)),
  ma_qr_bo_vinh_vien = upper(trim(b.ma_bo)),
  updated_at = now()
FROM public.cssd_dm_bo_dung_cu b
WHERE q.bo_dung_cu_id = b.id
  AND b.ma_bo IS NOT NULL
  AND trim(b.ma_bo) <> ''
  AND upper(trim(b.ma_bo)) ~ '\.SET\.[0-9]{2,}$'
  AND (
    upper(trim(coalesce(q.ma_qr_quy_trinh, ''))) IS DISTINCT FROM upper(trim(b.ma_bo))
    OR upper(trim(coalesce(q.ma_qr_bo_vinh_vien, ''))) IS DISTINCT FROM upper(trim(b.ma_bo))
  );

COMMENT ON COLUMN public.cssd_fact_quy_trinh.ma_qr_quy_trinh IS
  'Mã bộ SSOT — trùng cssd_dm_bo_dung_cu.ma_bo (vd. B01.SET.01).';
