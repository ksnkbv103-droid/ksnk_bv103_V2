-- Kho HC lát 1/5: nhóm con hóa chất / vật tư do ADMIN quản lý
-- (1) Bảng danh mục nhóm public.cssd_dm_hoa_chat_nhom (xóa mềm is_active = «Ngừng sử dụng»).
-- (2) cssd_dm_hoa_chat.nhom_id (nullable) + FK kép (nhom_id, loai_hoa_chat) → nhóm phải cùng loại.
--     Giữ nguyên cột text `nhom` (không xóa).
-- (3) Seed nhóm mặc định + backfill dòng chưa có nhóm → "Khác" cùng loại.
-- (4) v_cssd_hoa_chat_full: thêm cột nhom_id, nhom_ten ở CUỐI (tương thích ngược).
-- RLS: đọc = fn_sys_has_permission('HOA_CHAT','view') như bảng cha; ghi = fn_sys_is_admin(); không có DELETE.
-- Idempotent: chạy lại không lỗi.

BEGIN;

-- (1) Bảng nhóm ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cssd_dm_hoa_chat_nhom (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma            text NOT NULL,
  ten           text NOT NULL,
  loai_hoa_chat varchar(50) NOT NULL,
  thu_tu        integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cssd_dm_hoa_chat_nhom_ma_key UNIQUE (ma),
  CONSTRAINT cssd_dm_hoa_chat_nhom_id_loai_key UNIQUE (id, loai_hoa_chat),
  CONSTRAINT cssd_dm_hoa_chat_nhom_ma_chk
    CHECK (ma = upper(btrim(ma)) AND char_length(ma) BETWEEN 1 AND 50),
  CONSTRAINT cssd_dm_hoa_chat_nhom_ten_chk
    CHECK (ten = btrim(ten) AND char_length(ten) BETWEEN 1 AND 100),
  CONSTRAINT cssd_dm_hoa_chat_nhom_loai_chk
    CHECK (loai_hoa_chat IN ('HOA_CHAT', 'VAT_TU'))
);

COMMENT ON TABLE public.cssd_dm_hoa_chat_nhom IS
  'Nhóm con hóa chất / vật tư CSSD. ADMIN thêm/sửa; is_active=false = Ngừng sử dụng (xóa mềm).';

CREATE UNIQUE INDEX IF NOT EXISTS cssd_dm_hoa_chat_nhom_loai_ten_active_uq
  ON public.cssd_dm_hoa_chat_nhom (loai_hoa_chat, lower(ten))
  WHERE is_active;

DROP TRIGGER IF EXISTS trg_cssd_dm_hoa_chat_nhom_updated_at ON public.cssd_dm_hoa_chat_nhom;
CREATE TRIGGER trg_cssd_dm_hoa_chat_nhom_updated_at
  BEFORE UPDATE ON public.cssd_dm_hoa_chat_nhom
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cssd_dm_hoa_chat_nhom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cssd_dm_hoa_chat_nhom FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cssd_dm_hoa_chat_nhom_select ON public.cssd_dm_hoa_chat_nhom;
CREATE POLICY cssd_dm_hoa_chat_nhom_select ON public.cssd_dm_hoa_chat_nhom
  FOR SELECT TO authenticated
  USING ((SELECT public.fn_sys_has_permission('HOA_CHAT'::text, 'view'::text)));

DROP POLICY IF EXISTS cssd_dm_hoa_chat_nhom_insert ON public.cssd_dm_hoa_chat_nhom;
CREATE POLICY cssd_dm_hoa_chat_nhom_insert ON public.cssd_dm_hoa_chat_nhom
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.fn_sys_is_admin()));

DROP POLICY IF EXISTS cssd_dm_hoa_chat_nhom_update ON public.cssd_dm_hoa_chat_nhom;
CREATE POLICY cssd_dm_hoa_chat_nhom_update ON public.cssd_dm_hoa_chat_nhom
  FOR UPDATE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()))
  WITH CHECK ((SELECT public.fn_sys_is_admin()));

-- Default privileges đã bị thu → GRANT tường minh. Không DELETE (xóa mềm).
REVOKE ALL ON public.cssd_dm_hoa_chat_nhom FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cssd_dm_hoa_chat_nhom TO authenticated;
GRANT ALL ON public.cssd_dm_hoa_chat_nhom TO service_role;

-- (2) Cột nhom_id + ràng buộc cùng loại ----------------------------------
ALTER TABLE public.cssd_dm_hoa_chat
  ADD COLUMN IF NOT EXISTS nhom_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cssd_dm_hoa_chat'::regclass
      AND conname = 'cssd_dm_hoa_chat_nhom_id_loai_fkey'
  ) THEN
    -- FK kép: nhom_id phải tồn tại VÀ nhóm cùng loai_hoa_chat với hóa chất.
    -- NO ACTION: đổi loại của nhóm đang dùng sẽ bị chặn; đổi loại hóa chất phải đổi nhom_id cùng lúc.
    ALTER TABLE public.cssd_dm_hoa_chat
      ADD CONSTRAINT cssd_dm_hoa_chat_nhom_id_loai_fkey
      FOREIGN KEY (nhom_id, loai_hoa_chat)
      REFERENCES public.cssd_dm_hoa_chat_nhom (id, loai_hoa_chat)
      ON UPDATE NO ACTION ON DELETE RESTRICT;
  END IF;

  -- MATCH SIMPLE bỏ qua FK khi loai_hoa_chat NULL → chặn nhom_id có mà loại NULL.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cssd_dm_hoa_chat'::regclass
      AND conname = 'cssd_dm_hoa_chat_nhom_id_can_loai_chk'
  ) THEN
    ALTER TABLE public.cssd_dm_hoa_chat
      ADD CONSTRAINT cssd_dm_hoa_chat_nhom_id_can_loai_chk
      CHECK (nhom_id IS NULL OR loai_hoa_chat IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cssd_dm_hoa_chat_nhom_id_idx
  ON public.cssd_dm_hoa_chat (nhom_id);

COMMENT ON COLUMN public.cssd_dm_hoa_chat.nhom_id IS
  'Nhóm con (cssd_dm_hoa_chat_nhom), phải cùng loai_hoa_chat. Thay thế dần cột text `nhom`.';

-- (3) Seed + backfill -----------------------------------------------------
INSERT INTO public.cssd_dm_hoa_chat_nhom (ma, ten, loai_hoa_chat, thu_tu) VALUES
  ('LAM_SACH',               'Làm sạch dụng cụ',                       'HOA_CHAT', 10),
  ('KHU_KHUAN_MUC_CAO',      'Khử khuẩn mức độ cao',                   'HOA_CHAT', 20),
  ('KHU_KHUAN_BE_MAT',       'Khử khuẩn mức thấp/trung bình, bề mặt',  'HOA_CHAT', 30),
  ('TIET_KHUAN',             'Tiệt khuẩn',                             'HOA_CHAT', 40),
  ('HC_KHAC',                'Khác',                                   'HOA_CHAT', 999),
  ('BAO_GOI',                'Bao gói',                                'VAT_TU',   10),
  ('CHI_THI_HOA_HOC',        'Chỉ thị hóa học',                        'VAT_TU',   20),
  ('CHI_THI_SINH_HOC_TEST',  'Chỉ thị sinh học và test',               'VAT_TU',   30),
  ('PHU_TRO',                'Phụ trợ',                                'VAT_TU',   40),
  ('VT_KHAC',                'Khác',                                   'VAT_TU',   999)
ON CONFLICT DO NOTHING;

UPDATE public.cssd_dm_hoa_chat hc
SET nhom_id = n.id,
    updated_at = now()
FROM public.cssd_dm_hoa_chat_nhom n
WHERE hc.nhom_id IS NULL
  AND hc.loai_hoa_chat IS NOT NULL
  AND n.ma = CASE hc.loai_hoa_chat WHEN 'HOA_CHAT' THEN 'HC_KHAC' ELSE 'VT_KHAC' END
  AND n.loai_hoa_chat = hc.loai_hoa_chat;

-- (4) View đọc: thêm cột ở cuối, giữ security_invoker -------------------
CREATE OR REPLACE VIEW public.v_cssd_hoa_chat_full
WITH (security_invoker = true) AS
SELECT hc.id,
       hc.ma_hoa_chat,
       hc.ten_hoa_chat,
       hc.loai_hoa_chat,
       hc.don_vi_tinh,
       hc.specs ->> 'quy_cach'::text AS quy_cach,
       hc.specs ->> 'nong_do'::text AS nong_do,
       hc.han_su_dung,
       hc.specs ->> 'ghi_chu'::text AS ghi_chu,
       hc.nguong_ton_toi_thieu,
       hc.is_active,
       hc.created_at,
       hc.updated_at,
       hc.specs,
       hc.nhom_id,
       n.ten AS nhom_ten
FROM public.cssd_dm_hoa_chat hc
LEFT JOIN public.cssd_dm_hoa_chat_nhom n ON n.id = hc.nhom_id;

COMMIT;

-- =====================================================================
-- CHƯA APPLY PROD — chờ PO.
-- Kiểm prod trước khi apply (chỉ đọc):
--   SELECT loai_hoa_chat, count(*), count(*) FILTER (WHERE nhom IS NOT NULL) AS co_nhom_text
--   FROM public.cssd_dm_hoa_chat GROUP BY 1 ORDER BY 1;
--   SELECT to_regclass('public.cssd_dm_hoa_chat_nhom');
--   SELECT pg_get_viewdef('public.v_cssd_hoa_chat_full'::regclass);
-- Lưu ý prod: giá trị text `nhom` đã nhập KHÔNG được map tự động sang nhom_id (mọi dòng → "Khác").
-- Rollback (thủ công, theo thứ tự):
--   CREATE OR REPLACE VIEW không bỏ cột được → DROP VIEW public.v_cssd_hoa_chat_full;
--     tạo lại theo định nghĩa trước (14 cột, security_invoker=true) + GRANT lại như cũ;
--   ALTER TABLE public.cssd_dm_hoa_chat DROP CONSTRAINT IF EXISTS cssd_dm_hoa_chat_nhom_id_loai_fkey,
--     DROP CONSTRAINT IF EXISTS cssd_dm_hoa_chat_nhom_id_can_loai_chk, DROP COLUMN IF EXISTS nhom_id;
--   DROP TABLE IF EXISTS public.cssd_dm_hoa_chat_nhom;  (→ quy trình destructive-change)
-- =====================================================================
