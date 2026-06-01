-- View đọc runtime (grep src .from("v_...")) — một dòng kết quả.
-- Local: npm run pilot:views:precheck
-- Linked: npx supabase db query --linked --agent=no -f scripts/sql/pilot-app-views-precheck.sql

SELECT bool_and(ok) AS all_app_views_ok
FROM (
  SELECT to_regclass('public.' || name) IS NOT NULL AS ok
  FROM (
    VALUES
      ('v_sys_user_permissions'),
      ('v_sys_staff_auth_overview'),
      ('v_sys_role_permissions_matrix'),
      ('v_mdm_nhan_su_full'),
      ('v_cssd_quy_trinh_full'),
      ('v_cssd_su_co_full'),
      ('v_cssd_thiet_bi_full'),
      ('v_cssd_hoa_chat_full'),
      ('v_cssd_bo_dung_cu_summary'),
      ('v_cssd_bo_dung_cu_chi_tiet_full'),
      ('v_cssd_loai_dung_cu_summary'),
      ('v_gstt_giam_sat_vst_sessions_full'),
      ('v_gstt_giam_sat_vst_full'),
      ('v_gstt_giam_sat_chung_sessions_full'),
      ('v_qlcv_cong_viec_full'),
      ('v_nkbv_su_kien_full')
  ) AS t(name)
) x;
