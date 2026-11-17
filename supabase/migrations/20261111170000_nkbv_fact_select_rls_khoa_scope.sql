-- NKBV-003: siết RLS SELECT 11 bảng nkbv_fact_* theo phạm vi khoa (bám NK-SCOPE ở app:
-- src/modules/giam-sat-nkbv/lib/nkbv-khoa-scope.ts → resolveNkbvKhoaRestriction).
--
-- Quy tắc (giữ nguyên app):
--   * Bị giới hạn khi và chỉ khi: có vai MANG_LUOI_KSNK VÀ không có ADMIN / NHAN_VIEN_KSNK / HOI_DONG_KSNK.
--   * Mọi vai khác có quyền GIAM_SAT_NKBV.view → đọc toàn viện như cũ.
--   * Bị giới hạn, chưa gán khoa → 0 dòng.
--   * Hồ sơ BA thuộc khoa: khoa_dieu_tri_id = khoa actor HOẶC có ngày ở khoa actor (nkbv_fact_ba_ngay_khoa).
--   * Bảng con theo ma_benh_an (ngày khoa, dụng cụ, timeline, phân tích, LabID, vi sinh) theo BA;
--     vi sinh không có ma_benh_an (kho thô) bị ẩn — khớp listNkbvViSinhStore trả [].
--   * nkbv_fact_su_kien: khoa_ghi_nhan_id; mẫu số daily / phẫu thuật: khoa_id;
--     device_registry: BA thuộc khoa HOẶC khoa_id.
-- Chỉ ALTER POLICY ... USING của policy SELECT; INSERT/UPDATE/DELETE không đổi.
-- RPC SECURITY DEFINER (owner postgres, bảng không FORCE RLS) không bị ảnh hưởng.
-- Helper SECURITY DEFINER để tránh đệ quy policy benh_an <-> ba_ngay_khoa; helper trả tập để không chạy lại từng dòng.

CREATE OR REPLACE FUNCTION public.fn_nkbv_actor_khoa_restricted()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.fn_sys_has_role('MANG_LUOI_KSNK')
     AND NOT public.fn_sys_is_admin()
     AND NOT public.fn_sys_has_role('NHAN_VIEN_KSNK')
     AND NOT public.fn_sys_has_role('HOI_DONG_KSNK');
$$;

-- Tập ma_benh_an thuộc khoa actor; dùng dạng IN (SELECT ...) không tương quan → tính một lần mỗi truy vấn.
CREATE OR REPLACE FUNCTION public.fn_nkbv_actor_khoa_ma_benh_an_set()
RETURNS SETOF text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH k AS (SELECT public.fn_sys_actor_khoa_id() AS khoa_id)
  SELECT b.ma_benh_an FROM public.nkbv_fact_benh_an b, k
   WHERE k.khoa_id IS NOT NULL AND b.khoa_dieu_tri_id = k.khoa_id AND b.ma_benh_an IS NOT NULL
  UNION
  SELECT d.ma_benh_an FROM public.nkbv_fact_ba_ngay_khoa d, k
   WHERE k.khoa_id IS NOT NULL AND d.khoa_id = k.khoa_id AND d.ma_benh_an IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.fn_nkbv_actor_khoa_restricted() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_nkbv_actor_khoa_ma_benh_an_set() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_nkbv_actor_khoa_restricted() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_nkbv_actor_khoa_ma_benh_an_set() TO authenticated, service_role;

-- Bảng gắn BA qua ma_benh_an
ALTER POLICY nkbv_fact_benh_an_select ON public.nkbv_fact_benh_an USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted())
       OR ma_benh_an IN (SELECT s.m FROM public.fn_nkbv_actor_khoa_ma_benh_an_set() AS s(m)))
);

ALTER POLICY nkbv_fact_ba_ngay_khoa_select ON public.nkbv_fact_ba_ngay_khoa USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted()) OR ma_benh_an IN (SELECT s.m FROM public.fn_nkbv_actor_khoa_ma_benh_an_set() AS s(m)))
);

ALTER POLICY nkbv_fact_ba_ngay_dung_cu_select ON public.nkbv_fact_ba_ngay_dung_cu USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted()) OR ma_benh_an IN (SELECT s.m FROM public.fn_nkbv_actor_khoa_ma_benh_an_set() AS s(m)))
);

ALTER POLICY nkbv_fact_ba_timeline_select ON public.nkbv_fact_ba_timeline USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted()) OR ma_benh_an IN (SELECT s.m FROM public.fn_nkbv_actor_khoa_ma_benh_an_set() AS s(m)))
);

ALTER POLICY nkbv_fact_ba_phan_tich_select ON public.nkbv_fact_ba_phan_tich USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted()) OR ma_benh_an IN (SELECT s.m FROM public.fn_nkbv_actor_khoa_ma_benh_an_set() AS s(m)))
);

ALTER POLICY nkbv_fact_labid_event_select ON public.nkbv_fact_labid_event USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted()) OR ma_benh_an IN (SELECT s.m FROM public.fn_nkbv_actor_khoa_ma_benh_an_set() AS s(m)))
);

ALTER POLICY nkbv_fact_vi_sinh_select ON public.nkbv_fact_vi_sinh USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted()) OR ma_benh_an IN (SELECT s.m FROM public.fn_nkbv_actor_khoa_ma_benh_an_set() AS s(m)))
);

ALTER POLICY nkbv_fact_device_registry_select ON public.nkbv_fact_device_registry USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted())
       OR khoa_id = (SELECT public.fn_sys_actor_khoa_id())
       OR ma_benh_an IN (SELECT s.m FROM public.fn_nkbv_actor_khoa_ma_benh_an_set() AS s(m)))
);

-- Bảng gắn khoa trực tiếp
ALTER POLICY nkbv_fact_su_kien_select ON public.nkbv_fact_su_kien USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted())
       OR khoa_ghi_nhan_id = (SELECT public.fn_sys_actor_khoa_id()))
);

ALTER POLICY nkbv_fact_mau_so_daily_select ON public.nkbv_fact_mau_so_daily USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted())
       OR khoa_id = (SELECT public.fn_sys_actor_khoa_id()))
);

ALTER POLICY nkbv_fact_mau_so_phau_thuat_select ON public.nkbv_fact_mau_so_phau_thuat USING (
  ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view')))
  AND (NOT (SELECT public.fn_nkbv_actor_khoa_restricted())
       OR khoa_id = (SELECT public.fn_sys_actor_khoa_id()))
);

-- CHƯA APPLY PROD — chờ PO.
-- Kiểm prod (chỉ đọc):
--   SELECT tablename, policyname, qual FROM pg_policies
--    WHERE schemaname = 'public' AND tablename LIKE 'nkbv_fact_%' AND cmd = 'SELECT' ORDER BY 1;
--   SELECT proname FROM pg_proc WHERE proname IN ('fn_nkbv_actor_khoa_restricted','fn_nkbv_actor_khoa_ma_benh_an_set');
--
-- HOÀN TÁC (chạy tay nếu cần; không phá dữ liệu):
--   DO $$ DECLARE t text; BEGIN
--     FOREACH t IN ARRAY ARRAY['nkbv_fact_benh_an','nkbv_fact_ba_ngay_khoa','nkbv_fact_ba_ngay_dung_cu',
--       'nkbv_fact_ba_timeline','nkbv_fact_ba_phan_tich','nkbv_fact_labid_event','nkbv_fact_vi_sinh',
--       'nkbv_fact_device_registry','nkbv_fact_su_kien','nkbv_fact_mau_so_daily','nkbv_fact_mau_so_phau_thuat'] LOOP
--       EXECUTE format('ALTER POLICY %I ON public.%I USING ((SELECT public.fn_sys_is_admin()) OR (SELECT public.fn_sys_has_permission(''GIAM_SAT_NKBV'', ''view'')))', t || '_select', t);
--     END LOOP; END $$;
--   DROP FUNCTION public.fn_nkbv_actor_khoa_ma_benh_an_set();
--   DROP FUNCTION public.fn_nkbv_actor_khoa_restricted();
