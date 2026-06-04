# MA TRẬN TƯƠNG TÁC MODULE — BV103

> **Phiên bản:** 1.1 (03/06/2026 — remediation audit)  
> **Trạng thái:** SSOT phụ thuộc giữa bounded contexts  
> **Đồng bộ với:** [system-overview.md](./system-overview.md)

---

## 1. Bảng phụ thuộc module × module

| Nguồn | Đích | Loại | Ghi chú |
|-------|------|------|---------|
| `giam-sat-vst` | `dashboard` | RPC read | `rpc_dashboard_vst_strategic_analytics` |
| `giam-sat-chung` | `dashboard` | RPC read | `rpc_get_compliance_dashboard_v4`, GSC strategic |
| `giam-sat-chung` | `quan-tri-he-thong/bang-kiem` | FK read | `gstt_dm_bang_kiem` |
| `giam-sat-nkbv` | `mdm` | FK read | `mdm_dm_khoa_phong`, lookup NKBV |
| `cssd-erp` | `mdm` (facade) | Server Action | `requestReplenishFromReserveAction` — CSSD_WORKFLOW.edit |
| `cssd-erp` | `cssd-su-co` | Domain event | Sự cố → rollback domino |
| `quan-ly-cong-viec` | `sys` (cron) | DB function | Spawn 00:01 + sync quá hạn 00:05 VNT |
| `quan-ly-cong-viec` | `quan-tri-he-thong` | MDM link | `LOAI_CONG_VIEC`, `TRANG_THAI_CONG_VIEC` |
| `auth` | `sys` RBAC | View read | `v_sys_user_permissions` |
| `quan-tri-he-thong` | `sys` | CRUD | `sys_roles`, `sys_lookup_value`, `mdm_nhan_su` |
| `giam-sat-chung` | `sys` | Read/write | `sys_module_locks` — khóa ngày giám sát |
| `giam-sat-nkbv` | `cssd-erp` | UI trace | `CssdTraceLink` → `cssd_fact_lo_tiet_khuan` |
| `dashboard` | `vst`, `gsc`, `nkbv`, `qlcv` | Compose | `/bao-cao-tong-hop`, Command Center brief |

---

## 2. Luồng đăng nhập & phân quyền

```mermaid
sequenceDiagram
  participant U as Browser
  participant L as staff-login.actions
  participant A as Supabase Auth
  participant M as mdm_nhan_su
  participant P as v_sys_user_permissions

  U->>L: ma_nv / email + password
  L->>M: resolve email (v_mdm_nhan_su_full)
  L->>A: signInWithPassword
  U->>P: usePermission / Sidebar nav gate
  P-->>U: roles + module×action matrix
```

---

## 3. Luồng CSSD quét trạm (rút gọn)

```mermaid
sequenceDiagram
  participant UI as CSSDERPPage / QRScan
  participant W as cssd-workflow-application
  participant R as rpc_scan_workflow_station
  participant B as cssd_fact_quy_trinh_thanh_phan

  UI->>W: executeWorkflowStationScan
  alt DONG_GOI
    W->>B: syncThanhPhanTuTemplate
    UI->>UI: DigitalChecklistPanel
  end
  W->>R: advance station
  alt CAP_PHAT chưa KIEM_DEM_BOM
    W-->>UI: Error — chặn cấp phát
  end
```

---

## 4. Ranh giòng cấm (architecture boundaries)

| Cấm | Lý do |
|-----|-------|
| CSSD UI import CRUD MDM trực tiếp | `imports:cssd-mdm` guard |
| App ALTER TABLE trên VIEW | Migration rule 51 |
| Client ghi `fact_*` không qua Server Action | RBAC + audit |
| Pre-aggregation table mới không đo latency | AGENTS.md governance |

---

## 5. View đọc theo module (post Phase 1)

| Module | View SSOT (không dùng alias cũ) |
|--------|----------------------------------|
| VST | `v_gstt_giam_sat_vst_*` |
| GSC | `v_gstt_giam_sat_chung_sessions_full` |
| NKBV | `v_nkbv_su_kien_full` |
| CSSD | `v_cssd_quy_trinh_full`, `v_cssd_*` catalog |
| QLCV | `v_qlcv_cong_viec_full` |
| RBAC | `v_sys_user_permissions`, `v_sys_role_permissions_matrix` |
| MDM | `v_mdm_khoa_phong_full`, `v_mdm_nhan_su_full` |
