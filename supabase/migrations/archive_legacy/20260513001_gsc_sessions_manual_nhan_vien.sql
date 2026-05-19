-- =============================================================
-- Giám sát chung (GSC) — thêm 2 cột nhập tên đối tượng "ngoài DS"
--
-- Lý do: UI đã có checkbox "Nhập tay" + ô tên (GiamSatHeaderPersonalFields),
-- read utils đã đọc 2 trường này, nhưng DB chưa có cột → save fail với
-- Zod "Nhân viên không hợp lệ" và tên gõ tay không được lưu.
--
-- An toàn:
--   * Chỉ ADD COLUMN nullable / có DEFAULT — không đụng dữ liệu hiện có.
--   * IF NOT EXISTS đảm bảo idempotent.
--   * DROP + CREATE view sau ALTER TABLE để view `s.*` cập nhật đúng cột
--     mới (xem comment cảnh báo trong 20260708001_gsc_sessions_full_join_ten_bang_kiem.sql).
--
-- Không tạo CHECK ràng buộc cứng vì:
--   * is_giam_sat_ca_nhan = false: cả nhan_vien_id và ten_manual_nhan_vien
--     đều có thể NULL (giám sát theo khoa, không cá nhân).
--   * Khi cá nhân: hoặc nhan_vien_id (có hồ sơ) HOẶC ten_manual_nhan_vien
--     (ngoài DS) — kiểm tra ở tầng app cho rõ thông điệp.
-- =============================================================

ALTER TABLE public.fact_giam_sat_chung_sessions
  ADD COLUMN IF NOT EXISTS is_manual_nhan_vien BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ten_manual_nhan_vien TEXT;

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.is_manual_nhan_vien IS
  'TRUE = nhập tên đối tượng giám sát tay (không có hồ sơ trong mdm_nhan_su). FALSE/NULL = dùng nhan_vien_id.';

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.ten_manual_nhan_vien IS
  'Tên đối tượng giám sát gõ tay khi is_manual_nhan_vien=TRUE; ngược lại nên NULL.';

-- Rebuild view (s.* phụ thuộc thứ tự cột — phải drop trước ALTER mới đảm bảo nhất quán)
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;

CREATE VIEW public.v_fact_giam_sat_chung_sessions_full AS
SELECT
  s.*,
  k.ten_khoa AS ten_khoa_phong,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat,
  ns_nv.ho_ten AS ten_nhan_vien,
  ns_nv.ma_nv AS ma_nhan_vien,
  nn.ten_nghe_nghiep AS ten_nghe_nghiep,
  bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
FROM public.fact_giam_sat_chung_sessions s
LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
LEFT JOIN public.mdm_nhan_su ns_gs ON s.nguoi_giam_sat_id = ns_gs.id
LEFT JOIN public.mdm_nhan_su ns_nv ON s.nhan_vien_id = ns_nv.id
LEFT JOIN public.dm_nghe_nghiep nn ON s.nghe_nghiep_id = nn.id
LEFT JOIN public.dm_bang_kiem bk
  ON (
    bk.ma_bk = trim(both FROM coalesce(s.loai_bang_kiem, ''))
    OR bk.id::text = trim(both FROM coalesce(s.loai_bang_kiem, ''))
  )
  AND coalesce(bk.is_active, true) = true;

GRANT SELECT ON public.v_fact_giam_sat_chung_sessions_full TO authenticated, service_role;
