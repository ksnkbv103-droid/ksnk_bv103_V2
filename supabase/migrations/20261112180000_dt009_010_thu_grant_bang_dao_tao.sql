-- DT-009 + DT-010: thu grant thừa của anon/authenticated trên 3 bảng đào tạo.
--
-- CHƯA APPLY PROD — chờ PO. Chỉ mới áp local.
--
-- Căn cứ (DB local + mã, 2026-11-12):
--   - anon có SELECT/REFERENCES/TRIGGER trên dao_tao_cau_hinh, dao_tao_lan_thi.
--   - authenticated có INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/SELECT trên dao_tao_cau_hinh;
--     SELECT/REFERENCES/TRIGGER trên dao_tao_cau_hoi, dao_tao_lan_thi.
--   - src/modules/dao-tao đọc/ghi 3 bảng chỉ bằng createAdminSupabaseClient (service_role); không mã nào
--     ngoài module tham chiếu 3 bảng. Không view nào phụ thuộc. Hàm duy nhất chạm bảng:
--     rpc_dao_tao_tao_luot_thi_that (SECURITY DEFINER, chạy quyền chủ hàm) → không cần grant của người gọi.
-- Thiết kế:
--   - GIỮ SELECT của authenticated trên cả 3 bảng (policy dao_tao_cau_hinh_select đang dùng; ứng dụng
--     hiện không cần, nhưng thu SELECT là đổi hành vi đọc — để chung với việc lọc cột `gan` chờ PO).
--   - KHÔNG đổi policy. service_role giữ nguyên.
-- Ảnh hưởng: anon không đọc được 3 bảng; authenticated gọi thẳng PostgREST không ghi được 3 bảng
--   (dù policy dao_tao_cau_hinh_write cho phép). Ứng dụng không đổi.
--
-- Khôi phục (rollback):
--   GRANT SELECT, REFERENCES, TRIGGER ON public.dao_tao_cau_hinh, public.dao_tao_lan_thi TO anon;
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dao_tao_cau_hinh TO authenticated;
--   GRANT REFERENCES, TRIGGER ON public.dao_tao_cau_hoi, public.dao_tao_lan_thi TO authenticated;

REVOKE ALL ON TABLE public.dao_tao_cau_hinh, public.dao_tao_cau_hoi, public.dao_tao_lan_thi FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.dao_tao_cau_hinh, public.dao_tao_cau_hoi, public.dao_tao_lan_thi
  FROM authenticated;

-- SQL kiểm prod (CHỈ ĐỌC), chạy trước/sau khi áp — sau khi áp: anon không còn dòng nào,
-- authenticated chỉ còn SELECT trên mỗi bảng, service_role đủ 7 quyền:
--   SELECT grantee, table_name, string_agg(privilege_type, ',' ORDER BY privilege_type) AS quyen
--     FROM information_schema.role_table_grants
--    WHERE table_schema = 'public'
--      AND table_name IN ('dao_tao_cau_hinh', 'dao_tao_cau_hoi', 'dao_tao_lan_thi')
--    GROUP BY 1, 2 ORDER BY 2, 1;
