-- Migration: Slice 8 (giam-sat-tuan-thu reform v4) — VST extension cho failure reason.
-- Date: 27/05/2026
--
-- Mục tiêu:
--   * Thêm 3 cột Việt hóa lên `gstt_fact_vst` để mỗi cơ hội VST không tuân thủ
--     ghi rõ nguyên nhân hệ thống + trạng thái can thiệp + ảnh bằng chứng.
--   * Dùng chung danh mục `gstt_dm_failure_reason` (Slice 2) — KHÔNG đẻ thêm
--     bảng riêng cho VST.
--   * Backward compat: phiên VST cũ thiếu 3 cột này vẫn load (NULL-able).
--   * KHÔNG đụng schema VST cốt lõi (T1-T5, dung_ky_thuat, du_thoi_gian, co_deo_gang).

-- ----------------------------------------------------
-- 1. ALTER TABLE — additive 3 cột nullable
-- ----------------------------------------------------
ALTER TABLE public.gstt_fact_vst
  ADD COLUMN IF NOT EXISTS nguyen_nhan_loi_id  uuid,
  ADD COLUMN IF NOT EXISTS da_can_thiep_ngay   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS url_anh_bang_chung  text;

COMMENT ON COLUMN public.gstt_fact_vst.nguyen_nhan_loi_id IS
  'Slice 8 (reform v4): FK gstt_dm_failure_reason.id — khi dung_ky_thuat=false hoặc du_thoi_gian=false, giám sát viên BUỘC chọn nguyên nhân từ FailureReasonDropdown (filter pham_vi_ap_dung @> {VST,PPE} || TAT_CA).';
COMMENT ON COLUMN public.gstt_fact_vst.da_can_thiep_ngay IS
  'Slice 8 (reform v4): cờ "đã nhắc nhở/can thiệp tại chỗ" theo JCI immediate feedback.';
COMMENT ON COLUMN public.gstt_fact_vst.url_anh_bang_chung IS
  'Slice 8 (reform v4): URL ảnh bằng chứng vi phạm (Supabase Storage bucket gsc-evidences). Reuse bucket có sẵn để giảm config.';

-- ----------------------------------------------------
-- 2. FK constraint — chỉ thêm nếu chưa tồn tại
--    ON DELETE SET NULL: xóa reason không phá phiên VST cũ.
-- ----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'fk_gstt_fact_vst_nguyen_nhan_loi'
       AND conrelid = 'public.gstt_fact_vst'::regclass
  ) THEN
    ALTER TABLE public.gstt_fact_vst
      ADD CONSTRAINT fk_gstt_fact_vst_nguyen_nhan_loi
      FOREIGN KEY (nguyen_nhan_loi_id)
      REFERENCES public.gstt_dm_failure_reason(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ----------------------------------------------------
-- 3. Index cho dashboard Slice 7 (Pareto VST per khoa)
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gstt_fact_vst_nguyen_nhan
  ON public.gstt_fact_vst (nguyen_nhan_loi_id)
  WHERE nguyen_nhan_loi_id IS NOT NULL;
