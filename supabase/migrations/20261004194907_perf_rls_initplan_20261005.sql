-- perf_rls_initplan_20261005 (owner-approved scope: #1 wrap RLS helpers, #3 EXISTS helpers, #4 VST view LATERAL + index, #8 drop 6 redundant SELECT policies, #10 index hygiene + ANALYZE)
SET LOCAL lock_timeout = '5s';

-- #8 drop redundant permissive SELECT policies (each covered by an existing PERMISSIVE SELECT USING (true) policy for the same role)
DROP POLICY IF EXISTS "gstt_dm_bang_kiem_select" ON public."gstt_dm_bang_kiem";
DROP POLICY IF EXISTS "mdm_dm_khoa_phong_select" ON public."mdm_dm_khoa_phong";
DROP POLICY IF EXISTS "dm_khoa_phong_select_auth_v1" ON public."mdm_dm_khoa_phong";
DROP POLICY IF EXISTS "sys_permissions_select" ON public."sys_permissions";
DROP POLICY IF EXISTS "sys_roles_select" ON public."sys_roles";
DROP POLICY IF EXISTS "sys_role_permissions_select" ON public."sys_role_permissions";

-- #1 wrap constant-argument helper calls in (SELECT ...) so they run once per statement (InitPlan) instead of per row.
-- Generated server-side from pg_policies with a fixed regex; guarded: must alter exactly 140 policies with the reviewed
-- expression set (md5 60f7b186b28adace07e4fab005a2c6fa); the expanded static statements are in migration_perf_rls_initplan_20261005.expanded.sql.
DO $mig$
DECLARE
  r record; nq text; nw text; cnt int := 0; acc text := '';
  pat constant text := '(?<!SELECT )(fn_sys_has_permission\(''[^'']*''::text, ''[^'']*''::text\)|fn_sys_is_admin\(\)|fn_qlcv_can_read_fact\(\))';
BEGIN
  FOR r IN SELECT tablename AS t, policyname AS n, qual, with_check AS wc
             FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname LOOP
    nq := regexp_replace(r.qual, pat, '(SELECT \1)', 'g');
    nw := regexp_replace(r.wc,   pat, '(SELECT \1)', 'g');
    IF nq IS DISTINCT FROM r.qual OR nw IS DISTINCT FROM r.wc THEN
      EXECUTE format('ALTER POLICY %I ON public.%I', r.n, r.t)
        || CASE WHEN nq IS DISTINCT FROM r.qual THEN ' USING (' || nq || ')' ELSE '' END
        || CASE WHEN nw IS DISTINCT FROM r.wc   THEN ' WITH CHECK (' || nw || ')' ELSE '' END;
      cnt := cnt + 1;
      acc := acc || r.t || '.' || r.n || '|'
                 || CASE WHEN nq IS DISTINCT FROM r.qual THEN nq ELSE '~' END || '|'
                 || CASE WHEN nw IS DISTINCT FROM r.wc   THEN nw ELSE '~' END || E'\n';
    END IF;
  END LOOP;
  IF cnt <> 140 OR md5(acc) <> '60f7b186b28adace07e4fab005a2c6fa' THEN
    RAISE EXCEPTION 'perf_rls_initplan guard failed: altered=% md5=%', cnt, md5(acc);
  END IF;
END
$mig$;

-- #3 permission helpers: same signature, STABLE, SECURITY DEFINER, search_path=public (CREATE OR REPLACE keeps owner + grants)
CREATE OR REPLACE FUNCTION public.fn_sys_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.mdm_nhan_su ns
      JOIN public.sys_user_roles ur ON ur.user_id = ns.auth_user_id
      JOIN public.sys_roles r       ON r.id = ur.role_id
     WHERE ns.auth_user_id = auth.uid()
       AND r.name = 'ADMIN'
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_sys_has_permission(p_module text, p_action text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.mdm_nhan_su ns
      JOIN public.sys_user_roles ur       ON ur.user_id = ns.auth_user_id
      JOIN public.sys_role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.sys_permissions p       ON p.id = rp.permission_id
     WHERE ns.auth_user_id = auth.uid()
       AND p.module_name = p_module
       AND p.action = p_action
  )
  OR public.fn_sys_is_admin();
$function$;

-- #4 VST sessions view: per-session LATERAL aggregate (same columns, order, types; keeps owner/grants)
CREATE INDEX IF NOT EXISTS idx_vst_obs_session_hanh_dong ON public.gstt_fact_vst USING btree (session_id) INCLUDE (hanh_dong);

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_sessions_full WITH (security_invoker = true) AS
 SELECT s.id,
    s.khoa_id,
    s.khu_vuc_id,
    s.vi_tri_cu_the,
    s.hinh_thuc_id,
    s.cach_thuc_id,
    ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
    ct.ten_cach_thuc AS cach_thuc_giam_sat,
    ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
    ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
    ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc,
    ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
    s.nguoi_giam_sat_id,
    s.thoi_gian_bat_dau,
    s.thoi_gian_ket_thuc,
    s.ngay_giam_sat,
    s.created_at,
    s.updated_at,
    s.is_active,
    s.is_seen,
    k.ma_khoa AS ma_khoa_phong,
    k.ten_khoa AS ten_khoa_phong,
    kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
    ns_gs.ho_ten AS ten_nguoi_giam_sat,
    COALESCE(agg.tong_co_hoi, (0)::numeric) AS tong_co_hoi,
    COALESCE(agg.da_tuan_thu, (0)::numeric) AS da_tuan_thu,
    COALESCE(((s.metadata ->> 'is_bo_sung_nguoi_benh'::text))::boolean, false) AS is_bo_sung_nguoi_benh,
    (s.metadata ->> 'ma_benh_an'::text) AS ma_benh_an,
    (s.metadata ->> 'ma_nguoi_benh'::text) AS ma_nguoi_benh,
    (s.metadata ->> 'ten_nguoi_benh'::text) AS ten_nguoi_benh,
    (s.metadata ->> 'so_giuong_nguoi_benh'::text) AS so_giuong_nguoi_benh
   FROM gstt_fact_vst_sessions s
     LEFT JOIN mdm_dm_khoa_phong k ON k.id = s.khoa_id
     LEFT JOIN gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
     LEFT JOIN mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
     LEFT JOIN gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
     LEFT JOIN gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
     LEFT JOIN LATERAL ( SELECT (count(*))::numeric AS tong_co_hoi,
            (sum(
                CASE
                    WHEN (COALESCE(btrim(d.hanh_dong), ''::text) = ANY (ARRAY['Rửa tay bằng nước'::text, 'Chà tay bằng cồn'::text])) THEN 1
                    ELSE 0
                END))::numeric AS da_tuan_thu
           FROM gstt_fact_vst d
          WHERE d.session_id = s.id) agg ON true
  WHERE (COALESCE(s.is_active, true) = true);

-- #10 index hygiene
CREATE INDEX IF NOT EXISTS idx_cssd_catalog_de_nghi_approved_by ON public.cssd_catalog_de_nghi USING btree (approved_by_id);
CREATE INDEX IF NOT EXISTS idx_cssd_catalog_de_nghi_nguoi_de_nghi ON public.cssd_catalog_de_nghi USING btree (nguoi_de_nghi_id);
DROP INDEX IF EXISTS public.idx_dm_lookup_value_code;               -- dup of unique uq_category_type_code (category_type, code)
DROP INDEX IF EXISTS public.idx_mdm_nhan_su_auth_user_id;           -- dup of unique uq_ho_so_nhan_vien_auth_user_id
DROP INDEX IF EXISTS public.idx_gsc_sessions_active_ngay_bang_kiem; -- dup of idx_gsc_sessions_ngay_bang_kiem_active
ANALYZE public.gstt_fact_vst;
ANALYZE public.gstt_fact_vst_sessions;
ANALYZE public.gstt_fact_chung_sessions;
