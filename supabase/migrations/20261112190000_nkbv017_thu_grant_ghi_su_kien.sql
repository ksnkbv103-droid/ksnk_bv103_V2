-- NKBV-017: thu quyền ghi trực tiếp của `authenticated` và mọi quyền của `anon` trên public.nkbv_fact_su_kien.
--
-- CHƯA APPLY PROD — chờ PO. Chỉ mới áp local.
--
-- Lỗi: policy insert/update chỉ đòi quyền create/edit; trigger trg_nkbv_su_kien_guard_trang_thai chỉ chạy
-- BEFORE UPDATE và chỉ khi trang_thai_id đổi. Người có create/edit nhưng không có approve gọi thẳng
-- PostgREST tạo được ca ở trạng thái XAC_NHAN hoặc sửa phân loại ca đã chốt, bỏ qua rpc_nkbv_tham_dinh_ca.
--
-- Căn cứ (DB local + mã, 2026-11-12):
--   - Mọi chỗ ghi bảng này trong src/ dùng admin client (service_role): giam-sat-nkbv-write.actions.ts,
--     giam-sat-nkbv-ba-analysis.actions.ts, lib/nkbv-ba-ngay-sync.ts, cssd-su-co recall-followup-nkbv.
--   - Hàm DB duy nhất ghi bảng: rpc_nkbv_tham_dinh_ca (SECURITY DEFINER, authenticated không có EXECUTE).
--   - Đọc bằng client người dùng (RLS theo khoa) vẫn cần SELECT của authenticated → giữ nguyên.
-- Ảnh hưởng: người đăng nhập gọi thẳng PostgREST để INSERT/UPDATE/DELETE bảng này sẽ bị từ chối
-- (permission denied). Ứng dụng không đổi. Policy và trigger hiện có không đổi.
--
-- Khôi phục (rollback):
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.nkbv_fact_su_kien TO authenticated;
--   GRANT ALL ON TABLE public.nkbv_fact_su_kien TO anon;

REVOKE ALL ON TABLE public.nkbv_fact_su_kien FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.nkbv_fact_su_kien FROM authenticated;

-- SQL kiểm prod (CHỈ ĐỌC), chạy trước/sau khi áp — sau khi áp: authenticated chỉ còn SELECT, anon không còn dòng nào:
--   SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type)
--     FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND table_name = 'nkbv_fact_su_kien'
--      AND grantee IN ('anon', 'authenticated', 'service_role')
--    GROUP BY 1;
