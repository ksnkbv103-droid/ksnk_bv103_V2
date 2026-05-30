-- Migration: Rename 24 view `v_*` (và 1 `vw_*`) để đồng bộ prefix module
-- với chuẩn 25/05/2026. Mỗi rename kèm 1 view compat tên cũ trỏ về tên mới
-- → app code KHÔNG cần update ngay (zero-downtime).
--
-- Mapping chi tiết: `docs/specs/working/view-rename-mapping-20260526.md`.
--
-- Sau khi xác minh app sạch hết tham chiếu tên cũ, migration kế tiếp sẽ:
--   DROP VIEW v_<old> CASCADE; cho từng cái.

-- Helper function dùng nội bộ trong DO block để đảm bảo idempotent.
DO $$
DECLARE
  v_rename jsonb;
  v_pairs jsonb := jsonb_build_array(
    -- sys cluster
    jsonb_build_array('v_auth_user_permissions',                'v_sys_user_permissions'),
    jsonb_build_array('v_role_permissions_matrix',              'v_sys_role_permissions_matrix'),
    jsonb_build_array('v_staff_auth_overview',                  'v_sys_staff_auth_overview'),
    -- mdm cluster
    jsonb_build_array('v_dm_khoa_phong_full',                   'v_mdm_khoa_phong_full'),
    -- cssd cluster
    jsonb_build_array('v_dm_thiet_bi_full',                     'v_cssd_thiet_bi_full'),
    jsonb_build_array('v_dm_hoa_chat_full',                     'v_cssd_hoa_chat_full'),
    jsonb_build_array('v_dm_bo_dung_cu_full',                   'v_cssd_bo_dung_cu_full'),
    jsonb_build_array('v_dm_bo_dung_cu_chi_tiet_full',          'v_cssd_bo_dung_cu_chi_tiet_full'),
    jsonb_build_array('v_dm_bo_dung_cu_summary',                'v_cssd_bo_dung_cu_summary'),
    jsonb_build_array('v_dm_loai_dung_cu_summary',              'v_cssd_loai_dung_cu_summary'),
    jsonb_build_array('v_fact_lo_tiet_khuan_full',              'v_cssd_lo_tiet_khuan_full'),
    jsonb_build_array('v_fact_quy_trinh_full',                  'v_cssd_quy_trinh_full'),
    jsonb_build_array('v_fact_su_co_full',                      'v_cssd_su_co_full'),
    jsonb_build_array('v_fact_kho_hoa_chat_ton_lo',             'v_cssd_kho_hoa_chat_ton_lo'),
    -- gstt cluster
    jsonb_build_array('v_dm_bang_kiem_full',                    'v_gstt_bang_kiem_full'),
    jsonb_build_array('v_dm_tieu_chi_bang_kiem_full',           'v_gstt_tieu_chi_bang_kiem_full'),
    jsonb_build_array('v_fact_giam_sat_chung_sessions_full',    'v_gstt_giam_sat_chung_sessions_full'),
    jsonb_build_array('v_fact_giam_sat_vst_full',               'v_gstt_giam_sat_vst_full'),
    jsonb_build_array('v_fact_giam_sat_vst_sessions_full',      'v_gstt_giam_sat_vst_sessions_full'),
    jsonb_build_array('v_gsc_dashboard_rows',                   'v_gstt_gsc_dashboard_rows'),
    jsonb_build_array('vw_vst_hotpath',                         'v_gstt_vst_hotpath'),
    -- qlcv cluster
    jsonb_build_array('v_fact_cong_viec_full',                  'v_qlcv_cong_viec_full'),
    jsonb_build_array('v_cong_viec_qua_han',                    'v_qlcv_cong_viec_qua_han'),
    -- nkbv cluster
    jsonb_build_array('v_fact_nkbv_su_kien_full',               'v_nkbv_su_kien_full')
  );
  v_old text;
  v_new text;
  v_old_exists boolean;
  v_new_exists boolean;
BEGIN
  FOR v_rename IN SELECT jsonb_array_elements(v_pairs) LOOP
    v_old := v_rename->>0;
    v_new := v_rename->>1;

    v_old_exists := EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                             WHERE n.nspname='public' AND c.relname=v_old AND c.relkind='v');
    v_new_exists := EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                             WHERE n.nspname='public' AND c.relname=v_new AND c.relkind='v');

    IF v_old_exists AND NOT v_new_exists THEN
      -- 1. Rename view physical sang tên mới.
      EXECUTE format('ALTER VIEW public.%I RENAME TO %I', v_old, v_new);
      -- Đảm bảo security_invoker giữ nguyên (alter rename không reset reloptions, nhưng set lại để chắc).
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_new);

      -- 2. Tạo alias compat view tên cũ.
      EXECUTE format(
        'CREATE VIEW public.%I WITH (security_invoker = true) AS SELECT * FROM public.%I',
        v_old, v_new
      );
      EXECUTE format(
        'COMMENT ON VIEW public.%I IS %L',
        v_old, '[compat alias 26/05/2026] -> ' || v_new || '. DROP sau khi app migrate sạch.'
      );

      RAISE NOTICE '[view-rename] % -> % (kèm compat alias)', v_old, v_new;
    ELSIF v_new_exists AND NOT v_old_exists THEN
      RAISE NOTICE '[view-rename] % đã rename trước đó, bỏ qua', v_old;
    ELSIF v_new_exists AND v_old_exists THEN
      -- Edge case: cả 2 cùng tồn tại (đã rerun migration?) — không làm gì.
      RAISE NOTICE '[view-rename] cả % và % đều tồn tại; bỏ qua để tránh phá data', v_old, v_new;
    ELSE
      RAISE NOTICE '[view-rename] view % không tồn tại; bỏ qua', v_old;
    END IF;
  END LOOP;
END $$;
