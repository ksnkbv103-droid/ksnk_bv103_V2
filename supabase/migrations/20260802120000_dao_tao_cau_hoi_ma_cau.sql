-- Ngân hàng Đào tạo: mã câu ổn định cho upsert / export-import round-trip.

ALTER TABLE public.dao_tao_cau_hoi
  ADD COLUMN IF NOT EXISTS ma_cau text;

-- Backfill: chủ đề + STT; fallback theo id nếu thiếu STT hoặc trùng.
UPDATE public.dao_tao_cau_hoi
SET ma_cau = chu_de_ma || '-' || lpad(import_stt::text, 4, '0')
WHERE ma_cau IS NULL
  AND import_stt IS NOT NULL
  AND chu_de_ma IS NOT NULL;

UPDATE public.dao_tao_cau_hoi
SET ma_cau = 'Q-' || replace(id::text, '-', '')
WHERE ma_cau IS NULL OR btrim(ma_cau) = '';

-- Gỡ trùng ma_cau (giữ bản ghi mới hơn / id lớn hơn lexicographically).
WITH ranked AS (
  SELECT
    id,
    ma_cau,
    row_number() OVER (
      PARTITION BY ma_cau
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
    ) AS rn
  FROM public.dao_tao_cau_hoi
)
UPDATE public.dao_tao_cau_hoi q
SET ma_cau = q.ma_cau || '-' || substr(replace(q.id::text, '-', ''), 1, 8)
FROM ranked r
WHERE q.id = r.id
  AND r.rn > 1;

ALTER TABLE public.dao_tao_cau_hoi
  ALTER COLUMN ma_cau SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dao_tao_cau_hoi_ma_cau
  ON public.dao_tao_cau_hoi (ma_cau);

COMMENT ON COLUMN public.dao_tao_cau_hoi.ma_cau IS
  'Mã nghiệp vụ ổn định cho export/import upsert (không đổi khi sửa nội dung).';
