-- Domain §2.1: siết predicate cơ hội hợp lệ.
-- Tuân thủ (rửa / chà) ≤ 2 chỉ định WHO phân biệt; bỏ sót ≤ 1; vẫn ≥ 1 nhãn hợp lệ.
-- View và RPC gọi hàm lúc query — không viết lại view.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_vst_is_valid_opportunity(
  p_hanh_dong text,
  p_thoi_diem text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO public
AS $$
  WITH moments AS (
    SELECT DISTINCT btrim(m.moment_part, E' \t\n\r') AS moment
    FROM regexp_split_to_table(
      regexp_replace(COALESCE(p_thoi_diem, ''), '，', ',', 'g'),
      E'\\s*,\\s*'
    ) AS m(moment_part)
    WHERE btrim(m.moment_part, E' \t\n\r') IN (
      'Trước khi tiếp xúc người bệnh',
      'Trước khi làm thủ thuật vô khuẩn',
      'Sau khi có nguy cơ tiếp xúc với dịch',
      'Sau khi tiếp xúc người bệnh',
      'Sau khi tiếp xúc xung quanh người bệnh'
    )
  )
  SELECT
    COALESCE(btrim(p_hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn', 'Bỏ sót')
    AND (SELECT count(*)::int FROM moments) BETWEEN 1 AND (
      CASE WHEN COALESCE(btrim(p_hanh_dong), '') = 'Bỏ sót' THEN 1 ELSE 2 END
    );
$$;

COMMENT ON FUNCTION public.fn_vst_is_valid_opportunity(text, text) IS
  'VST §2.1: hành động ∈ {3}, ≥1 thời điểm WHO phân biệt; tuân thủ ≤2 chỉ định, bỏ sót ≤1.';

COMMIT;
