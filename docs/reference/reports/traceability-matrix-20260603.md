# Traceability matrix — 2026-06-03

> Build từ `src/app`, `src/modules/*/actions`, grep `.from`/`.rpc`. Doc = claim trong SSOT (verify status).

| # | Feature | Route | Server Action / entry | Table / View / RPC | Test | Doc sync |
|---|---------|-------|----------------------|-------------------|------|----------|
| 1 | Đăng nhập nhân sự | `/login` | `staff-login.actions` | `v_mdm_nhan_su_full`, Supabase Auth | — | OK |
| 2 | RBAC menu | Shell | `usePermission` → `v_sys_user_permissions` | `v_sys_user_permissions` / `v_auth_permissions` | — | Partial (RBAC migrations 03/06) |
| 3 | VST lưu phiên | `/giam-sat-vst` | `vst-write-save-session.actions` | `gstt_fact_vst_sessions`, `gstt_fact_vst` | `vst-form-submit`, read scope specs | OK prefix |
| 4 | VST analytics | `/giam-sat-vst?tab=analytics` | `vst-strategic-analytics.actions` | `rpc_dashboard_vst_strategic_analytics` | `rpc-contract-dashboard.spec` | OK |
| 5 | GSC lưu phiên | `/giam-sat-chung` | `giam-sat-chung-write.actions` | `gstt_fact_chung_sessions` | `gsc-score-display.spec` | OK |
| 6 | GSC module lock | `/giam-sat-chung` | `gsc-module-lock.actions` | `sys_module_locks` | — | **New** — sparse doc |
| 7 | GSC import | `/giam-sat-chung` | `giam-sat-chung-import.actions` | `gstt_fact_chung_sessions` | — | OK |
| 8 | GSC compliance V4 | Command Center / GSC panel | `gsc-compliance-v4.actions` | `rpc_get_compliance_dashboard_v4` | `rpc-contract-dashboard.spec` | OK |
| 9 | NKBV Day-3 rules | `/giam-sat-nkbv` | `giam-sat-nkbv-write.actions` | `nkbv_fact_*` | `nkbv-rules-engine.spec` | OK |
| 10 | NKBV clinical verify | Modal | `giam-sat-nkbv-write.actions` | `nkbv_fact_su_kien` + subforms | `nkbv-write.actions.spec` | Partial UI |
| 11 | NKBV ↔ CSSD trace | NKBV UI | `CssdTraceLink` + migration | `nkbv` trace cols / `cssd_fact_lo_tiet_khuan` | — | **New** `20260602150000` |
| 12 | CSSD scan trạm | `/cssd-quy-trinh` | `cssd-workflow-application` | `rpc_scan_workflow_station`, `cssd_fact_quy_trinh` | `cssd-state-engine.spec` | OK |
| 13 | CSSD Digital BOM | Trạm đóng gói | `DigitalChecklistPanel`, `cssd-bom-checkpoint` | `cssd_fact_quy_trinh_thanh_phan`, `KIEM_DEM_BOM` event | — | **Improved** vs D-01 |
| 14 | CSSD ledger cấp phát | CAP_PHAT | `assertLedgerDuChoCapPhat` | `cssd_fact_lifecycle_event`, thanh phan | — | Warning not hard block |
| 15 | Mẻ tiệt khuẩn heat | `/cssd-erp/batch` | `me-tiet-khuan-batch-heat`, persist helpers | `cssd_fact_lo_tiet_khuan` | `me-tiet-khuan-batch-heat.spec` | **New** |
| 16 | MDM replenish CSSD | CSSD workflow | `requestReplenishFromReserveAction` | MDM + CSSD facade | — | interaction-matrix |
| 17 | Command Center | `/` | `useCommandCenterBriefData` | VST/GSC RPC + QLCV brief | — | OK |
| 18 | Báo cáo tổng hợp | `/bao-cao-tong-hop` | `getBaoCaoTongHopAnalytics` | compose VST+GSC+NKBV RPC | `bao-cao-tong-hop-core.spec` | **New** — thin README |
| 19 | QLCV board | `/quan-ly-cong-viec` | `cong-viec-read.actions` | `v_qlcv_*`, `qlcv_fact_cong_viec` | `qlcv-board-lanes.spec` | OK |
| 20 | QLCV spawn định kỳ | Cron DB | `fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay` | `qlcv_fact_cong_viec_dinh_ky` | `qlcv-dinh-ky-schedule.spec` | OK |
| 21 | RBAC assign | `/quan-tri-he-thong/phan-quyen` | `rbac.actions` | `sys_user_roles` | — | Post `drop_rbac_rel_compat` |
| 22 | DM import JSON | Quản trị DM | `smart-import.actions` | `v_cssd_*_summary` views | — | OK |
| 23 | CSSD sự cố | `/cssd-su-co` | `su-co-report.actions` | `cssd_fact_su_co` | — | OK |
| 24 | Supervision deep link | Dashboard → module | `buildAnalyticsDeepLink` | URL params only | `supervision-deep-link.spec` | **New** |
| 25 | Offline sync GSC/VST | Shell listener | `SupervisionOfflineSyncListener` | IndexedDB + actions | — | concepts.md |
