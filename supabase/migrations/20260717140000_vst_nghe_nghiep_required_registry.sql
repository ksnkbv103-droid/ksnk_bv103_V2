-- VST: nghề nghiệp đối tượng giám sát là bắt buộc trên registry MDM
-- (chặn dữ liệu mới thiếu nghe_nghiep_id → thống kê «Không rõ»).
-- Không ALTER COLUMN NOT NULL: còn residual lịch sử nghe_nghiep_id IS NULL.

UPDATE public.sys_mdm_registry
SET
  is_required = true,
  notes = COALESCE(notes, '') || ' [2026-07-17: VST nghe_nghiep_id required — tránh matrix_nghe «Không rõ»]',
  updated_at = now()
WHERE table_name = 'gstt_fact_vst'
  AND column_name = 'nghe_nghiep_id'
  AND is_active = true;
