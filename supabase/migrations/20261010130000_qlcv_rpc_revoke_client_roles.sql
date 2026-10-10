-- QLCV-ACL: RPC ghi QLCV chỉ cho service_role (app gọi qua admin client sau ensureQlcvKsnkAccess).
-- ĐÃ APPLY PROD 2026-10-10 qua MCP `apply_migration` (PO duyệt). Version trên prod do MCP đặt, khác tên file — không đổi tên file.
--
-- Ghi chú 2026-10-10: trên prod các hàm này vốn đã KHÔNG gọi được bởi anon/authenticated (kiểm bằng has_function_privilege
-- trước khi apply) — migration là no-op trên prod, chỉ đồng bộ môi trường dựng mới/local (lỗi lộ quyền chỉ có ở DB local lệch).
--
-- Trước: baseline `ALTER DEFAULT PRIVILEGES … GRANT ALL ON FUNCTIONS TO anon, authenticated`
-- cấp EXECUTE trực tiếp cho anon/authenticated; `REVOKE … FROM PUBLIC` (20260617140000) không gỡ được.
-- Hệ quả: gọi thẳng PostgREST `fn_qlcv_transition(p_actor_nhan_su_id := <người duyệt>)` để giả danh
-- duyệt/nghiệm thu, hoặc `fn_qlcv_append_nhat_ky` ghi nhật ký dưới tên người khác.
-- Mẫu: BE-RPC-01 `20260709120000` cho fn_qlcv_update_checklist.
--
-- Kiểm sau apply (mong đợi f|f):
--   SELECT has_function_privilege('anon', 'public.fn_qlcv_transition(uuid,text,uuid,text,jsonb)', 'EXECUTE'),
--          has_function_privilege('authenticated', 'public.fn_qlcv_transition(uuid,text,uuid,text,jsonb)', 'EXECUTE');

BEGIN;

REVOKE ALL ON FUNCTION public.fn_qlcv_transition(uuid, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_transition(uuid, text, uuid, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.fn_qlcv_append_nhat_ky(uuid, text, uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_append_nhat_ky(uuid, text, uuid, text, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() TO service_role;

REVOKE ALL ON FUNCTION public.fn_qlcv_get_actor_khoa_id(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_get_actor_khoa_id(uuid) TO service_role;

COMMIT;
