-- Migration: RPC fn_admin_module_stats - gom thống kê dashboard quản trị danh mục về 1 query.
-- Date: 26/05/2026
-- Slice 9 (admin-module hardening plan).
--
-- Bối cảnh:
--   `getTrungTamDanhMucStatsAction` hiện tạo 2 query × ~25 bảng = ~50 round-trip Supabase
--   (count + max updated_at), gây tải peak ~50 req khi mở trang Quản trị Danh mục.
--
-- Kết quả:
--   * 1 RPC `public.fn_admin_module_stats()` trả về JSONB { core: {...}, registry: {...} }.
--   * App chỉ còn 1 round-trip cộng cache TS bằng `unstable_cache` (tag `admin-module-stats`).

CREATE OR REPLACE FUNCTION public.fn_admin_module_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH core AS (
    SELECT 'loai'::text AS k,
           jsonb_build_object('count', count(*), 'last', max(updated_at)) AS v
      FROM public.dm_loai_dung_cu
    UNION ALL
    SELECT 'bo',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_bo_dung_cu
    UNION ALL
    SELECT 'le',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_bo_dung_cu_chi_tiet
    UNION ALL
    SELECT 'tb',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_thiet_bi
    UNION ALL
    SELECT 'hc',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_hoa_chat
    UNION ALL
    SELECT 'khoa',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_khoa_phong
    UNION ALL
    SELECT 'ns',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.mdm_nhan_su
    UNION ALL
    SELECT 'bk',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_bang_kiem
    UNION ALL
    SELECT 'tk',
           jsonb_build_object('count', count(*), 'last', NULL)
      FROM public.v_auth_user_permissions
  ),
  lookup_by_cat AS (
    SELECT category_type::text AS k,
           jsonb_build_object('count', count(*), 'last', max(updated_at)) AS v
      FROM public.sys_lookup_value
     GROUP BY category_type
  ),
  non_lookup_registry AS (
    SELECT 'KHOA_PHONG'::text AS k,
           jsonb_build_object('count', count(*), 'last', max(updated_at)) AS v
      FROM public.dm_khoa_phong
    UNION ALL
    SELECT 'LOAI_DUNG_CU',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_loai_dung_cu
    UNION ALL
    SELECT 'VAI_TRO_HE_THONG_KSNK',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_roles
    UNION ALL
    SELECT 'KHU_VUC_GIAM_SAT',
           jsonb_build_object('count', count(*), 'last', max(updated_at))
      FROM public.dm_khu_vuc_giam_sat
  )
  SELECT jsonb_build_object(
    'core',     (SELECT jsonb_object_agg(k, v) FROM core),
    'registry', COALESCE((SELECT jsonb_object_agg(k, v) FROM lookup_by_cat), '{}'::jsonb)
              || COALESCE((SELECT jsonb_object_agg(k, v) FROM non_lookup_registry), '{}'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.fn_admin_module_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_admin_module_stats() TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_admin_module_stats() IS
  '1 round-trip dashboard stats cho trang Quản trị Danh mục (core 9 bảng + registry 18 loại).';
