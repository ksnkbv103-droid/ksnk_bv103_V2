-- CSSD-020 (Cao) + NKBV-020 (Thấp): thu quyền thừa.
--
-- CHƯA APPLY PROD — chờ PO. Chỉ mới áp local.
--
-- CSSD-020 — cssd_fact_bao_tri:
--   Lỗi: authenticated (và anon) có INSERT/UPDATE/DELETE/TRUNCATE; policy update/delete chỉ kiểm quyền
--   module, không giới hạn cột → người có CSSD_WORKFLOW.edit sửa/xóa thẳng phiếu bảo trì qua PostgREST,
--   vượt rpc_cssd_bao_tri_bat_dau/ket_thuc/huy (đặt HOAN_THANH, đổi người ký, xóa dấu vết).
--   Căn cứ (mã + DB local, 2026-11-12): src/ chỉ ĐỌC bảng này (cssd-bao-tri-list.actions.ts:26,
--   cssd-report-read.actions.ts:476), đều bằng admin client (service_role); mọi ghi đi qua 3 RPC
--   SECURITY DEFINER chỉ service_role gọi được. Bảng không có trigger.
--   Ảnh hưởng: ghi thẳng bảng bằng JWT người dùng nhận lỗi không đủ quyền. Ứng dụng không đổi.
--   3 policy insert/update/delete thành policy chết (dọn ở lát khác). SELECT của authenticated giữ nguyên.
--   Khôi phục: GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.cssd_fact_bao_tri TO anon, authenticated;
--              GRANT SELECT ON public.cssd_fact_bao_tri TO anon;
--
-- NKBV-020 — fn_nkbv_dich_te_hoc_rates(date, date, uuid):
--   Lỗi: PUBLIC và anon có EXECUTE. Hàm SECURITY INVOKER nên anon bị RLS chặn dữ liệu, nhưng không có lý do
--   để khách chưa đăng nhập gọi được. Nơi gọi duy nhất (giam-sat-nkbv-dashboard.actions.ts:61) dùng admin client.
--   Ảnh hưởng: anon gọi /rpc/fn_nkbv_dich_te_hoc_rates nhận lỗi không đủ quyền. authenticated, service_role giữ nguyên.
--   Khôi phục: GRANT EXECUTE ON FUNCTION public.fn_nkbv_dich_te_hoc_rates(date, date, uuid) TO PUBLIC, anon;

REVOKE ALL ON TABLE public.cssd_fact_bao_tri FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.cssd_fact_bao_tri FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_nkbv_dich_te_hoc_rates(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_nkbv_dich_te_hoc_rates(date, date, uuid) TO authenticated, service_role;

-- SQL kiểm prod (CHỈ ĐỌC), trước/sau khi áp — sau khi áp: anon rỗng, authenticated chỉ SELECT, hàm anon=f:
--   SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type)
--     FROM information_schema.role_table_grants
--    WHERE table_schema='public' AND table_name='cssd_fact_bao_tri' AND grantee IN ('anon','authenticated','service_role')
--    GROUP BY 1;
--   SELECT has_function_privilege('anon', 'public.fn_nkbv_dich_te_hoc_rates(date,date,uuid)', 'execute') AS anon,
--          has_function_privilege('authenticated', 'public.fn_nkbv_dich_te_hoc_rates(date,date,uuid)', 'execute') AS authenticated,
--          has_function_privilege('service_role', 'public.fn_nkbv_dich_te_hoc_rates(date,date,uuid)', 'execute') AS service_role;
