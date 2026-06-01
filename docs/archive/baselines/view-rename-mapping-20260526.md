# View `v_*` rename theo prefix module — 26/05/2026

## Mục tiêu

Đồng bộ tên view với chuẩn prefix table (`sys_/mdm_/cssd_/gstt_/qlcv_/nkbv_`) đã chốt
ngày 25/05/2026. Sau khi rename, khi nhìn vào DB sẽ thấy toàn bộ object của 1 module
cluster lại (sort alphabetical) — dễ navigate, dễ review.

## Strategy zero-downtime

```
Step 1 (migration 000010): ALTER VIEW v_<old> RENAME TO v_<new>
                          CREATE VIEW v_<old> WITH (security_invoker=true)
                            AS SELECT * FROM v_<new>;   -- compat alias
Step 2 (sau khi app migrate): DROP VIEW v_<old> (PR riêng)
```

App code giữ nguyên (alias chuyển hướng); migrate dần theo nhịp tự nhiên.

## Mapping (24 view rename + 6 view đã đúng giữ nguyên)

### Cluster `sys_` — hạ tầng / RBAC / audit

| Tên cũ | Tên mới | Đọc từ | App consumers |
|--------|---------|--------|---------------|
| `v_auth_user_permissions` | **`v_sys_user_permissions`** | `sys_user_roles + sys_roles + sys_role_permissions + sys_permissions + mdm_nhan_su + mdm_dm_khoa_phong` | server-permission, hooks/usePermission, server functions… |
| `v_role_permissions_matrix` | **`v_sys_role_permissions_matrix`** | `sys_roles ⨝ sys_role_permissions` | rbac.actions |
| `v_staff_auth_overview` | **`v_sys_staff_auth_overview`** | `mdm_nhan_su ⨝ sys_user_roles ⨝ sys_roles` (purpose=RBAC overview) | account-link-governance, staff-session |
| `v_sys_audit_log_full` | _giữ nguyên_ ✓ | sys_audit_log + mdm_nhan_su | audit-log.actions |
| `v_sys_audit_table_choices` | _giữ nguyên_ ✓ | sys_audit_log | audit-log.actions |

### Cluster `mdm_` — master data dùng chung

| Tên cũ | Tên mới | Đọc từ |
|--------|---------|--------|
| `v_dm_khoa_phong_full` | **`v_mdm_khoa_phong_full`** | mdm_dm_khoa_phong (+ sys_lookup_value KHOI_KHOA) |
| `v_mdm_nhan_su_full` | _giữ nguyên_ ✓ | mdm_nhan_su |

### Cluster `cssd_` — CSSD ERP

| Tên cũ | Tên mới | Đọc từ |
|--------|---------|--------|
| `v_dm_thiet_bi_full` | **`v_cssd_thiet_bi_full`** | cssd_dm_thiet_bi |
| `v_dm_hoa_chat_full` | **`v_cssd_hoa_chat_full`** | cssd_dm_hoa_chat |
| `v_dm_bo_dung_cu_full` | **`v_cssd_bo_dung_cu_full`** | cssd_dm_bo_dung_cu |
| `v_dm_bo_dung_cu_chi_tiet_full` | **`v_cssd_bo_dung_cu_chi_tiet_full`** | cssd_dm_bo_dung_cu_chi_tiet |
| `v_dm_bo_dung_cu_summary` | **`v_cssd_bo_dung_cu_summary`** | cssd_dm_bo_dung_cu + members |
| `v_dm_loai_dung_cu_summary` | **`v_cssd_loai_dung_cu_summary`** | cssd_dm_loai_dung_cu |
| `v_fact_lo_tiet_khuan_full` | **`v_cssd_lo_tiet_khuan_full`** | cssd_fact_lo_tiet_khuan |
| `v_fact_quy_trinh_full` | **`v_cssd_quy_trinh_full`** | cssd_fact_quy_trinh |
| `v_fact_su_co_full` | **`v_cssd_su_co_full`** | cssd_fact_su_co (sự cố CSSD) |
| `v_fact_kho_hoa_chat_ton_lo` | **`v_cssd_kho_hoa_chat_ton_lo`** | cssd_fact_kho_hoa_chat_giao_dich |
| `v_cssd_bo_dung_cu_bien_dong` | _giữ nguyên_ ✓ | cssd_fact_kho_giao_dich (+ bo) |
| `v_cssd_bo_dung_cu_chi_tiet_realtime` | _giữ nguyên_ ✓ | cssd_fact_kho_chi_tiet |
| `v_cssd_kho_le_realtime_qty` | _giữ nguyên_ ✓ | cssd_fact_kho_giao_dich |

### Cluster `gstt_` — Giám sát tuân thủ (VST + GSC)

| Tên cũ | Tên mới | Đọc từ |
|--------|---------|--------|
| `v_dm_bang_kiem_full` | **`v_gstt_bang_kiem_full`** | gstt_dm_bang_kiem |
| `v_dm_tieu_chi_bang_kiem_full` | **`v_gstt_tieu_chi_bang_kiem_full`** | gstt_dm_bang_kiem (tiêu chí JSONB) |
| `v_fact_giam_sat_chung_sessions_full` | **`v_gstt_giam_sat_chung_sessions_full`** | gstt_fact_chung_sessions |
| `v_fact_giam_sat_vst_full` | **`v_gstt_giam_sat_vst_full`** | gstt_fact_vst |
| `v_fact_giam_sat_vst_sessions_full` | **`v_gstt_giam_sat_vst_sessions_full`** | gstt_fact_vst_sessions |
| `v_gsc_dashboard_rows` | **`v_gstt_gsc_dashboard_rows`** | gstt_fact_chung_sessions (+ bk + criterion json) |
| `vw_vst_hotpath` | **`v_gstt_vst_hotpath`** | (rename prefix + chuẩn `v_`) |

### Cluster `qlcv_` — Quản lý công việc

| Tên cũ | Tên mới | Đọc từ |
|--------|---------|--------|
| `v_fact_cong_viec_full` | **`v_qlcv_cong_viec_full`** | qlcv_fact_cong_viec |
| `v_cong_viec_qua_han` | **`v_qlcv_cong_viec_qua_han`** | qlcv_fact_cong_viec |

### Cluster `nkbv_` — Giám sát NKBV

| Tên cũ | Tên mới | Đọc từ |
|--------|---------|--------|
| `v_fact_nkbv_su_kien_full` | **`v_nkbv_su_kien_full`** | nkbv_fact_su_kien |

## Tổng số

- 24 view đổi prefix.
- 6 view đã đúng chuẩn — giữ nguyên.
- Tổng: 30 view + 1 sẽ chuẩn hóa `vw_` → `v_`.

## Sau migration

App code **không phải sửa ngay** (compat alias đảm bảo backward-compat). Khi nào sửa
file trong các module nào, có thể opportunistically đổi sang tên mới (Boy Scout).

PR riêng để DROP compat alias chỉ làm khi:

1. Grep `src/` không còn tham chiếu tên cũ.
2. Verify mọi hot path chạy với tên mới (smoke test).
