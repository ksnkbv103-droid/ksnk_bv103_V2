-- ADR: docs/adr/20261119-nen-020-revoke-anon-public-execute-35-ham.md
-- NEN-020 (gộp NEN-018): 35 hàm schema public (owner postgres, đều SECURITY INVOKER) còn EXECUTE cho anon, 34 hàm
-- trong số đó còn qua PUBLIC (`=X` trong proacl; trừ cssd_su_co_counts_for_red_alert chỉ còn `anon=X` tường minh).
-- Đây là ACL sót từ trước 20261020235907 / 20261021003002 (default privileges đã thu cho hàm MỚI). anon không có
-- policy nào ở public và không có nơi gọi nào trong src/ (client anon chỉ dùng ở staff-password.actions.ts, không gọi
-- RPC), nên đây là siết quyền thừa, không đổi hành vi của người dùng đăng nhập.
-- Chỉ đổi quyền EXECUTE. Không đổi thân hàm, chữ ký, SECURITY, search_path. Idempotent; hàm không có trên DB đích
-- (lệch prod/local) thì bỏ qua kèm NOTICE thay vì làm hỏng cả migration.
-- KHÔNG đụng 4 hàm unaccent* (owner supabase_admin, thuộc extension): ngoài quyền của postgres, ghi lý do giữ ở ADR.
-- Không BEGIN/COMMIT: db push tự bọc transaction.

DO $nen020$
DECLARE
  sig  text;
  proc regprocedure;
  sigs text[] := ARRAY[
    'public.touch_updated_at_mdm_registry()',
    'public.bv103_norm_label(text)',
    'public.update_updated_at_column()',
    'public.block_writes_for_migrated_danh_muc()',
    'public.fn_gstt_failure_reason_touch_updated_at()',
    'public.fn_get_session_stype(uuid,uuid)',
    'public.fn_nkbv_ssi_rates_by_surgery(date,date)',
    'public.fn_sys_attach_admin_rls(regclass,text)',
    'public.mdm_refresh_governance_suggestions()',
    'public.rpc_dm_bang_kiem_max_numeric_suffix(text)',
    'public.fn_qlcv_mo_ta_to_checklist(text)',
    'public.rpc_gstt_dm_bang_kiem_max_numeric_suffix(text)',
    'public.rpc_gsc_tgs_session_hits(date,date,uuid)',
    'public.fn_cssd_gen_cycle_qr()',
    'public.fn_cssd_resolve_active_quy_trinh_id(text)',
    'public.rpc_get_compliance_dashboard_v4(date,date,uuid)',
    'public.fn_nkbv_norm_vi_sinh_id(text)',
    'public.fn_nkbv_ba_keys_chua_phan_tich()',
    'public.fn_nkbv_major_type_from_classification(text)',
    'public.rpc_cssd_thiet_bi_me_counts()',
    'public.rpc_cssd_station_flow_counts()',
    'public.rpc_cssd_waiting_tiep_nhan(integer,integer,text)',
    'public.rpc_qlcv_board_counts(uuid)',
    'public.fn_stype_from_hinh_thuc_id(uuid)',
    'public.rpc_cssd_kho_station_counts()',
    'public.fn_session_analytics_stype(uuid,uuid,uuid)',
    'public.fn_qlcv_today_vn()',
    'public.fn_gsc_resolve_criterion_label(uuid)',
    'public.fn_gsc_resolve_criterion_id(uuid)',
    'public.cssd_su_co_counts_for_red_alert(boolean,jsonb,boolean)',
    'public.fn_cssd_me_ly_do_lech_phuong_phap(uuid,text,text)',
    'public.fn_sys_admin_audit_immutable()',
    'public.fn_nkbv_ba_hub(text)',
    'public.fn_vst_is_valid_opportunity(text,text)',
    'public.fn_gsc_expand_session_results_for_tc(jsonb)'
  ];
BEGIN
  FOREACH sig IN ARRAY sigs LOOP
    proc := to_regprocedure(sig);
    IF proc IS NULL THEN
      RAISE NOTICE 'NEN-020: bo qua, khong co ham %', sig;
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', proc);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', proc);
  END LOOP;
END
$nen020$;

-- Kiểm sau apply (kỳ vọng 0; 4 hàm unaccent* owner supabase_admin không tính vì owner khác postgres):
--   SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prokind = 'f' AND pg_get_userbyid(p.proowner) = 'postgres'
--     AND has_function_privilege('anon', p.oid, 'EXECUTE');
-- CHƯA APPLY PROD — chờ PO. Trước khi áp, đo prod (chỉ đọc) bằng đúng câu SELECT trên và liệt kê proacl;
-- nếu một hàm ở prod chỉ có `=X` (PUBLIC) mà không có `authenticated=X` thì migration đã GRANT tường minh nên người đăng nhập vẫn gọi được.
-- Rollback (đưa về trạng thái trước, chỉ khi thật cần). Trước migration, 34 hàm có `=X` (PUBLIC) + anon; riêng
-- cssd_su_co_counts_for_red_alert(boolean,jsonb,boolean) chỉ có anon, KHÔNG có PUBLIC: GRANT lại cho nó chỉ `anon`.
--   DO $$ DECLARE s text; BEGIN FOREACH s IN ARRAY ARRAY[<34 chữ ký như trên, trừ cssd_su_co_counts_for_red_alert>] LOOP
--     EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC, anon', to_regprocedure(s)); END LOOP; END $$;
--   GRANT EXECUTE ON FUNCTION public.cssd_su_co_counts_for_red_alert(boolean,jsonb,boolean) TO anon;
