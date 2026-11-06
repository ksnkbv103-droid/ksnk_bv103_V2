-- HC-D: danh mục hóa chất / vật tư CSSD
-- (1) Thêm cột `nhom` (nhóm mặt hàng, tùy chọn) cho cssd_dm_hoa_chat.
-- (2) Gộp loai_hoa_chat = 'TEST' (chỉ thị / test sinh học) vào 'VAT_TU'.
-- (3) Khóa loai_hoa_chat ∈ {'HOA_CHAT','VAT_TU'} (NULL vẫn cho phép, default 'HOA_CHAT').
-- Idempotent: chạy lại không lỗi.

BEGIN;

-- (1) Cột nhóm: nullable, đã trim, 1..100 ký tự
ALTER TABLE public.cssd_dm_hoa_chat
  ADD COLUMN IF NOT EXISTS nhom text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cssd_dm_hoa_chat'::regclass
      AND conname = 'cssd_dm_hoa_chat_nhom_chk'
  ) THEN
    ALTER TABLE public.cssd_dm_hoa_chat
      ADD CONSTRAINT cssd_dm_hoa_chat_nhom_chk
      CHECK (nhom IS NULL OR (nhom = btrim(nhom) AND char_length(nhom) BETWEEN 1 AND 100));
  END IF;
END $$;

COMMENT ON COLUMN public.cssd_dm_hoa_chat.nhom IS
  'Nhóm mặt hàng (tùy chọn, đã trim, ≤100 ký tự) — dùng để gom hiển thị trong kho hóa chất/vật tư.';

-- (2) Làm sạch dữ liệu loai_hoa_chat
UPDATE public.cssd_dm_hoa_chat
SET loai_hoa_chat = upper(btrim(loai_hoa_chat)),
    updated_at = now()
WHERE loai_hoa_chat IS NOT NULL
  AND loai_hoa_chat <> upper(btrim(loai_hoa_chat));

UPDATE public.cssd_dm_hoa_chat
SET loai_hoa_chat = 'VAT_TU',
    updated_at = now()
WHERE loai_hoa_chat = 'TEST';

-- (3) Chỉ thêm CHECK khi dữ liệu đã sạch; còn giá trị lạ → dừng, không đoán
DO $$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(DISTINCT loai_hoa_chat, ', ')
  INTO v_bad
  FROM public.cssd_dm_hoa_chat
  WHERE loai_hoa_chat IS NOT NULL
    AND loai_hoa_chat NOT IN ('HOA_CHAT', 'VAT_TU');

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'cssd_dm_hoa_chat.loai_hoa_chat còn giá trị ngoài HOA_CHAT/VAT_TU: %', v_bad;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cssd_dm_hoa_chat'::regclass
      AND conname = 'cssd_dm_hoa_chat_loai_chk'
  ) THEN
    ALTER TABLE public.cssd_dm_hoa_chat
      ADD CONSTRAINT cssd_dm_hoa_chat_loai_chk
      CHECK (loai_hoa_chat IN ('HOA_CHAT', 'VAT_TU'));
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- CHƯA APPLY PROD — chờ PO.
-- Kiểm prod trước khi apply (chỉ đọc):
--   SELECT loai_hoa_chat, count(*) FROM public.cssd_dm_hoa_chat GROUP BY 1 ORDER BY 1;
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.cssd_dm_hoa_chat'::regclass AND contype = 'c';
-- Rollback (nếu cần): DROP CONSTRAINT cssd_dm_hoa_chat_loai_chk / _nhom_chk;
--   cột nhom có thể giữ (additive). Không khôi phục được hàng TEST đã gộp
--   (không lưu vết) — chụp danh sách id có loai='TEST' trước khi apply prod.
-- =====================================================================
