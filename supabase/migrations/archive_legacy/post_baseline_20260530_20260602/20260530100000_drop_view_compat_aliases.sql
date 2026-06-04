-- Phase 1 Step 2: DROP compat view aliases after app migrated to v_<prefix>_ names.
-- See docs/specs/working/view-rename-mapping-20260526.md

BEGIN;

DROP VIEW IF EXISTS public.v_auth_user_permissions CASCADE;
DROP VIEW IF EXISTS public.v_role_permissions_matrix CASCADE;
DROP VIEW IF EXISTS public.v_staff_auth_overview CASCADE;
DROP VIEW IF EXISTS public.v_dm_khoa_phong_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_thiet_bi_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_hoa_chat_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_chi_tiet_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_summary CASCADE;
DROP VIEW IF EXISTS public.v_dm_loai_dung_cu_summary CASCADE;
DROP VIEW IF EXISTS public.v_dm_bang_kiem_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_tieu_chi_bang_kiem_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_quy_trinh_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_lo_tiet_khuan_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_su_co_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_kho_hoa_chat_ton_lo CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_gsc_dashboard_rows CASCADE;
DROP VIEW IF EXISTS public.vw_vst_hotpath CASCADE;
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;
DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE;
DROP VIEW IF EXISTS public.v_fact_nkbv_su_kien_full CASCADE;

COMMIT;
