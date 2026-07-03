-- A′ cutover: đồng bộ tuyệt đối ma_qr = ma_bo; vô hiệu hóa mọi mã hex BV103-DC-/BV103-SUB-.

-- 1) Mọi quy trình gắn bộ → ma_qr = ma_bo danh mục.
UPDATE public.cssd_fact_quy_trinh q
SET
  ma_qr_quy_trinh = upper(trim(b.ma_bo)),
  ma_qr_bo_vinh_vien = upper(trim(b.ma_bo)),
  updated_at = now()
FROM public.cssd_dm_bo_dung_cu b
WHERE q.bo_dung_cu_id = b.id
  AND b.ma_bo IS NOT NULL
  AND trim(b.ma_bo) <> ''
  AND (
    upper(trim(coalesce(q.ma_qr_quy_trinh, ''))) IS DISTINCT FROM upper(trim(b.ma_bo))
    OR upper(trim(coalesce(q.ma_qr_bo_vinh_vien, ''))) IS DISTINCT FROM upper(trim(b.ma_bo))
  );

-- 2) SUB → {ma_bo MAIN}-SUB (không hex).
UPDATE public.cssd_fact_quy_trinh sub
SET
  ma_qr_quy_trinh = upper(trim(b.ma_bo)) || '-SUB',
  ma_qr_bo_vinh_vien = upper(trim(b.ma_bo)) || '-SUB',
  updated_at = now()
FROM public.cssd_fact_quy_trinh main
JOIN public.cssd_dm_bo_dung_cu b ON b.id = main.bo_dung_cu_id
WHERE sub.quy_trinh_cha_id = main.id
  AND coalesce(sub.ma_vai_tro_bo, '') = 'SUB'
  AND b.ma_bo IS NOT NULL
  AND trim(b.ma_bo) <> ''
  AND upper(trim(b.ma_bo)) !~ '-SUB$';

-- 3) Vô hiệu hóa quy trình còn mã hex legacy (không còn hỗ trợ quét).
UPDATE public.cssd_fact_quy_trinh
SET is_active = false, updated_at = now()
WHERE is_active = true
  AND (
    upper(trim(ma_qr_quy_trinh)) ~ '^BV103-DC-[A-F0-9]+$'
    OR upper(trim(ma_qr_quy_trinh)) ~ '^BV103-SUB-[A-F0-9]+$'
  );

-- 4) Resolve RPC — thêm join ma_bo danh mục; bỏ phụ thuộc hex.
CREATE OR REPLACE FUNCTION public.fn_cssd_resolve_active_quy_trinh_id(p_ma_qr text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT q.id
  FROM public.cssd_fact_quy_trinh q
  LEFT JOIN public.cssd_dm_bo_dung_cu b ON b.id = q.bo_dung_cu_id AND b.is_active = true
  WHERE q.is_active = true
    AND (
      upper(trim(q.ma_qr_quy_trinh)) = upper(trim(p_ma_qr))
      OR upper(trim(q.ma_cycle_qr)) = upper(trim(p_ma_qr))
      OR upper(trim(q.ma_qr_bo_vinh_vien)) = upper(trim(p_ma_qr))
      OR upper(trim(b.ma_bo)) = upper(trim(p_ma_qr))
    )
  ORDER BY q.created_at DESC
  LIMIT 1;
$$;

COMMENT ON COLUMN public.cssd_fact_quy_trinh.ma_qr_quy_trinh IS
  'Mã bộ SSOT — trùng cssd_dm_bo_dung_cu.ma_bo (vd. B01.SET.01). Không dùng BV103-DC-hex.';

COMMENT ON COLUMN public.cssd_fact_quy_trinh.ma_qr_bo_vinh_vien IS
  'Bản sao ma_bo trên tem hộp — đồng bộ với ma_qr_quy_trinh.';
