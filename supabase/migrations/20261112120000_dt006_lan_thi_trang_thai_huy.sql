-- DT-006 (PO 2026-11-12): lượt thi `dang_lam` quá hạn KHÔNG tự chấm; ADMIN mở lại lượt bằng tay.
-- Cách làm: thêm trạng thái `huy` (lượt bị admin hủy, KHÔNG tính vào số lượt) + dấu vết ai/lúc/lý do.
--
-- CHƯA APPLY PROD — chờ PO. Chỉ mới áp local.
--
-- Phạm vi DB đã rà (local, 2026-11-12): không hàm, view, trigger hay RLS policy nào đọc
-- dao_tao_lan_thi (bảng chỉ service_role ghi/đọc, xem 20261021003002). Đếm lượt nằm ở
-- src/modules/dao-tao/lib/dao-tao-luot.ts (TRANG_THAI_TIEU_LUOT) — giữ `huy` NGOÀI danh sách đó.
-- Không cần RPC/GRANT: ứng dụng ghi qua admin client (service_role).
-- Bảng không có trigger updated_at: action mở lại phải tự set updated_at.
--
-- Khôi phục (rollback):
--   1) Đảm bảo không còn dòng `huy`: SELECT count(*) FROM public.dao_tao_lan_thi WHERE trang_thai='huy';
--      (nếu > 0 thì phải chuyển về trạng thái khác — hỏi PO, đây là đổi dữ liệu).
--   2) ALTER TABLE public.dao_tao_lan_thi DROP CONSTRAINT IF EXISTS dao_tao_lan_thi_huy_dau_vet_check;
--      ALTER TABLE public.dao_tao_lan_thi DROP CONSTRAINT IF EXISTS dao_tao_lan_thi_trang_thai_check;
--      ALTER TABLE public.dao_tao_lan_thi ADD CONSTRAINT dao_tao_lan_thi_trang_thai_check
--        CHECK (trang_thai = ANY (ARRAY['dang_lam','da_nop','het_gio']));
--   3) GIỮ các cột huy_boi/huy_luc/ly_do_huy (bỏ cột = destructive-change, cần PO).

ALTER TABLE public.dao_tao_lan_thi
  ADD COLUMN IF NOT EXISTS huy_boi uuid,
  ADD COLUMN IF NOT EXISTS huy_luc timestamptz,
  ADD COLUMN IF NOT EXISTS ly_do_huy text;

COMMENT ON COLUMN public.dao_tao_lan_thi.huy_boi IS 'auth.users.id của ADMIN hủy lượt (DT-006). Không FK, giống auth_user_id.';
COMMENT ON COLUMN public.dao_tao_lan_thi.huy_luc IS 'Thời điểm ADMIN hủy lượt (DT-006).';
COMMENT ON COLUMN public.dao_tao_lan_thi.ly_do_huy IS 'Lý do ADMIN hủy/mở lại lượt (DT-006).';

ALTER TABLE public.dao_tao_lan_thi DROP CONSTRAINT IF EXISTS dao_tao_lan_thi_trang_thai_check;
ALTER TABLE public.dao_tao_lan_thi ADD CONSTRAINT dao_tao_lan_thi_trang_thai_check
  CHECK (trang_thai = ANY (ARRAY['dang_lam'::text, 'da_nop'::text, 'het_gio'::text, 'huy'::text]));

-- `huy` bắt buộc đủ dấu vết ai + lúc + lý do (không rỗng); trạng thái khác thì không được mang dấu vết hủy nào.
ALTER TABLE public.dao_tao_lan_thi DROP CONSTRAINT IF EXISTS dao_tao_lan_thi_huy_dau_vet_check;
ALTER TABLE public.dao_tao_lan_thi ADD CONSTRAINT dao_tao_lan_thi_huy_dau_vet_check
  CHECK (
    CASE WHEN trang_thai = 'huy'
      THEN huy_luc IS NOT NULL AND huy_boi IS NOT NULL AND nullif(btrim(ly_do_huy), '') IS NOT NULL
      ELSE huy_luc IS NULL AND huy_boi IS NULL AND ly_do_huy IS NULL
    END
  );

-- SQL kiểm prod (CHỈ ĐỌC), chạy trước/sau khi PO duyệt apply:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid = 'public.dao_tao_lan_thi'::regclass AND contype = 'c';
--   SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='dao_tao_lan_thi' AND column_name IN ('huy_boi','huy_luc','ly_do_huy');
--   SELECT trang_thai, count(*) FROM public.dao_tao_lan_thi GROUP BY 1;
--   -- lượt treo quá hạn (ứng viên để ADMIN hủy):
--   SELECT count(*) FROM public.dao_tao_lan_thi WHERE trang_thai='dang_lam' AND han_nop_luc < now();
