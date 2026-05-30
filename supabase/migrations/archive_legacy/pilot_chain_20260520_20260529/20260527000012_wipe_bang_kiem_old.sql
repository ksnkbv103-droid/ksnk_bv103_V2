-- Slice cleanup tiếp: xóa toàn bộ 41 bảng kiểm cũ trong master `gstt_dm_bang_kiem`.
--
-- Bối cảnh: Sau khi wipe history fact ở migration 000011, BV103 yêu cầu xóa luôn
-- toàn bộ 41 mẫu bảng kiểm cũ để chuẩn bị nền sạch cho bộ master 51 bảng kiểm
-- chuẩn JCI 8.0 sắp import.
--
-- Phạm vi:
--   • Xóa toàn bộ rows trong `gstt_dm_bang_kiem` (41 rows hiện tại).
--   • View `gstt_dm_tieu_chi_bang_kiem` derive từ `tieu_chi_jsonb` → tự rỗng theo.
--   • Master data khác (`gstt_dm_failure_reason` 21 rows v4, 6 master danh mục
--     `gstt_dm_*`) GIỮ NGUYÊN — không nằm trong scope.
--
-- FK an toàn:
--   • `gstt_fact_chung_sessions.bang_kiem_id` → ON DELETE SET NULL (đã verify);
--     fact rỗng (đã wipe ở 000011) nên thực tế không có row nào bị ảnh hưởng.
--
-- Replay-safe: DELETE bảng rỗng là no-op.

BEGIN;

DELETE FROM public.gstt_dm_bang_kiem;

DO $$
DECLARE
  remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM public.gstt_dm_bang_kiem;
  RAISE NOTICE '[wipe_bang_kiem_old] OK | gstt_dm_bang_kiem remaining=%', remaining;
END $$;

COMMIT;
