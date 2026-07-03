# Traceability matrix — 2026-07-02

> Cập nhật sau wave cleanup 4. Nguồn: `src/app`, `src/modules/*/actions`, grep `.from`/`.rpc`.

| # | Feature | Route | Server Action / entry | Table / View / RPC | Test | Doc sync |
|---|---------|-------|----------------------|-------------------|------|----------|
| 1 | Đăng nhập nhân sự | `/login` | `staff-login.actions` | `v_mdm_nhan_su_full`, Supabase Auth | — | OK |
| 2 | RBAC menu | Shell | `usePermission` → `v_sys_user_permissions` | `sys_*` RBAC tables | — | OK |
| 3 | VST lưu phiên | `/giam-sat-vst` | `vst-write-save-session.actions` | `gstt_fact_vst_sessions`, `gstt_fact_vst` | vst specs | OK |
| 4 | VST analytics | `/thong-ke/vst` | `vst-strategic-analytics.actions` | `rpc_dashboard_vst_strategic_analytics` | `rpc-contract-dashboard.spec` | OK |
| 5 | GSC lưu phiên | `/giam-sat-chung` | `giam-sat-chung-write.actions` | `gstt_fact_chung_sessions` | `gsc-score-display.spec` | OK |
| 6 | GSC sub-tab (tuân thủ / hệ thống) | `/giam-sat-chung/tuan-thu`, `/he-thong` | `GscFormView` | cùng fact GSC | — | OK — tab nội bộ |
| 7 | GSC compliance | Dashboard / GSC | `gsc-compliance-v4.actions` | RPC dashboard contract | `rpc-contract-dashboard.spec` | OK |
| 8 | NKBV Day-3 rules | `/giam-sat-nkbv` | `giam-sat-nkbv-write.actions` | `nkbv_fact_*` | `nkbv-rules-engine.spec` | OK |
| 9 | NKBV clinical verify | Modal | `giam-sat-nkbv-write.actions` | subforms | `nkbv-write.actions.spec` | UAT pending |
| 10 | CSSD scan trạm | `/cssd-quy-trinh` | `cssd-workflow-application` | `rpc_scan_workflow_station` | `cssd-state-engine.spec` | OK |
| 11 | CSSD đối chiếu BOM | Trạm đóng gói | `CompositionReconcilePanel`, `cssd-composition-reconcile.actions` | `v_cssd_bo_dung_cu_chi_tiet_realtime` | verify:cssd | OK |
| 12 | CSSD sự cố dụng cụ | `/cssd-su-co` | `su-co-report.actions` + `InstrumentIncidentFields` | `cssd_fact_su_co` via entrypoint | lint:cssd-arch | OK |
| 13 | CSSD ledger cấp phát | CAP_PHAT | `assertLedgerDuChoCapPhat` | lifecycle + thanh phan | domain specs | **Hard block** (D-02 done) |
| 14 | Mẻ tiệt khuẩn | `/cssd-erp/batch` (compat) | `sterilization-batch/entrypoint` | `cssd_fact_lo_tiet_khuan` | batch-heat spec | OK |
| 15 | Command Center | `/` | `useCommandCenterBriefData` | strategic RPC | test:pilot | OK |
| 16 | Báo cáo tổng hợp | `/bao-cao-tong-hop` | `getBaoCaoTongHopAnalytics` | compose RPC | `bao-cao-tong-hop-core.spec` | OK |
| 17 | QLCV board | `/quan-ly-cong-viec` | `cong-viec-read.actions` | `v_qlcv_*` | `qlcv-board-lanes.spec` | OK |
| 18 | Analytics deep link | Dashboard → `/thong-ke/*` | `buildAnalyticsDeepLink` | URL params | `supervision-deep-link.spec` | OK |
| 19 | MDM hub | `/quan-tri-he-thong/danh-muc/*` | master-crud actions | `{module}_dm_*` / lookup | `verify:danh-muc-routes` | OK |
| 20 | Offline sync GSC/VST | Shell | `SupervisionOfflineSyncListener` | IndexedDB + actions | — | OK |

**Thay đổi so với 2026-06-03:** DigitalChecklistPanel → CompositionReconcilePanel; ledger warning → hard block; cssd-su-co dùng bounded-context entrypoint.
