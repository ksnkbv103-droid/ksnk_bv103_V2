-- ADR: docs/adr/20261119-nen-012-go-rls-hoi-dong-identity.md
-- NEN-012 / NKBV-041: gỡ tác dụng của 20261114180000_nkbv_fact_select_rls_hoi_dong_identity.sql (NKBV-035).
-- PO 2026-11-17 K5: Hội đồng KSNK được thấy danh tính ở NKBV, không áp chặn RLS lên prod. File 20261114180000 vẫn ở chuỗi
-- (bất biến, có ở main); file này xóa sáu policy RESTRICTIVE *_select_hoi_dong_deny và hàm fn_nkbv_actor_identity_denied()
-- nó tạo, nên sau cả chuỗi hành vi đọc nkbv_fact_* về như trước NKBV-035 (chỉ còn policy PERMISSIVE của 20261111170000).
-- Prod: 20261114180000 CHƯA áp (list_migrations 19/11, so theo tên) nên file này là no-op ở prod (DROP ... IF EXISTS).
-- Thứ tự bắt buộc: gỡ policy trước, hàm sau (policy phụ thuộc hàm). Idempotent.
-- Hoàn tác: chạy lại nội dung 20261114180000 (CREATE OR REPLACE FUNCTION + CREATE POLICY ... AS RESTRICTIVE).

DROP POLICY IF EXISTS nkbv_fact_benh_an_select_hoi_dong_deny ON public.nkbv_fact_benh_an;
DROP POLICY IF EXISTS nkbv_fact_device_registry_select_hoi_dong_deny ON public.nkbv_fact_device_registry;
DROP POLICY IF EXISTS nkbv_fact_labid_event_select_hoi_dong_deny ON public.nkbv_fact_labid_event;
DROP POLICY IF EXISTS nkbv_fact_mau_so_phau_thuat_select_hoi_dong_deny ON public.nkbv_fact_mau_so_phau_thuat;
DROP POLICY IF EXISTS nkbv_fact_su_kien_select_hoi_dong_deny ON public.nkbv_fact_su_kien;
DROP POLICY IF EXISTS nkbv_fact_vi_sinh_select_hoi_dong_deny ON public.nkbv_fact_vi_sinh;

DROP FUNCTION IF EXISTS public.fn_nkbv_actor_identity_denied();
