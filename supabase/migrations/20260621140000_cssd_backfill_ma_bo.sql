-- Backfill ma_bo cho bộ thiếu mã (chỉ NULL/rỗng), theo khoa_su_dung + ma_khoa.
-- Không đụng mã hex / mã tự nhập sai — sửa tay qua MDM Bộ dụng cụ.

DO $$
DECLARE
  r RECORD;
  prefix text;
  next_seq int;
BEGIN
  FOR r IN
    SELECT b.id, upper(trim(kp.ma_khoa)) AS khoa_ma
    FROM public.cssd_dm_bo_dung_cu b
    JOIN public.mdm_dm_khoa_phong kp ON kp.id = b.khoa_su_dung_id
    WHERE b.is_active = true
      AND (b.ma_bo IS NULL OR trim(b.ma_bo) = '')
      AND kp.ma_khoa IS NOT NULL
      AND trim(kp.ma_khoa) <> ''
    ORDER BY b.created_at ASC
  LOOP
    prefix := r.khoa_ma || '.SET.';
    SELECT COALESCE(
      MAX(
        NULLIF(substring(upper(trim(ma_bo)) FROM length(prefix) + 1), '')::int
      ),
      0
    ) + 1
    INTO next_seq
    FROM public.cssd_dm_bo_dung_cu
    WHERE upper(trim(ma_bo)) LIKE prefix || '%';

    UPDATE public.cssd_dm_bo_dung_cu
    SET ma_bo = prefix || lpad(next_seq::text, 2, '0'),
        updated_at = now()
    WHERE id = r.id;
  END LOOP;
END $$;
