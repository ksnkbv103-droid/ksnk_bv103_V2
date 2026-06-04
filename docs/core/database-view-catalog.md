# Database view catalog (BV103)

> SSOT sau cleanup `20260602170000`. Trong Supabase, icon **mắt** = VIEW.

## Quy ước tên (một dòng / layer)

| Layer | Pattern | Ví dụ | Ghi |
|-------|---------|-------|-----|
| **TABLE** | `{module}_dm_*`, `{module}_fact_*` | `gstt_dm_bang_kiem`, `qlcv_fact_cong_viec` | Dữ liệu thật |
| **Lookup façade** | `{module}_dm_*` (VIEW → `sys_lookup_value`) | `cssd_dm_tram`, `cssd_dm_loai_may` | Chỉ lookup |
| **Compat (đã DROP)** | `dm_*`, `fact_*` | — | Đã xóa `20260602180000`; app chỉ dùng prefix module |
| **Read** | `v_{module}_*` | `v_gstt_giam_sat_vst_full`, `v_cssd_quy_trinh_full` | JOIN cho UI — **không** ghi |

**Không tạo thêm:** `v_dm_*`, `v_fact_*`, `gstt_dm_*` song song `dm_*` cho cùng lookup (đã flatten 2026-06-02).

## Module map (đọc app)

| Module | Đọc list/detail | Ghi master | Ghi fact |
|--------|-----------------|------------|----------|
| **cssd** | `v_cssd_*` | `cssd_dm_*` | `cssd_fact_*` |
| **gstt** | `v_gstt_*` | `gstt_dm_*`, `mdm_dm_*` (khoa) | `gstt_fact_*` |
| **mdm** | `v_mdm_nhan_su_full` | `mdm_dm_khoa_phong` (TABLE) | — |
| **qlcv** | `v_qlcv_*` | `qlcv_dm_*`, `mdm_dm_to_cong_tac` | `qlcv_fact_*` |
| **nkbv** | `v_nkbv_su_kien_full` | `nkbv_dm_*` | `nkbv_fact_*` |
| **sys** | `v_sys_*` | `sys_roles`, … | — |

## Views đã DROP (2026-06-02)

- Orphan read: `v_cssd_bo_dung_cu_full`, `v_gstt_bang_kiem_full`, `v_mdm_khoa_phong_full`, `v_cssd_lo_tiet_khuan_full`, `v_cssd_kho_le_realtime_qty`
- Middleware lookup: `mdm_dm_chuc_danh`, `gstt_dm_hinh_thuc_giam_sat`, `qlcv_dm_loai_cong_viec`, `nkbv_dm_loai`, … (xem migration)
- Fact CSSD compat (app dùng `cssd_fact_*`): `fact_cssd_lifecycle_event`, `fact_quy_trinh_thanh_phan`, `fact_su_co`, …

## Hoàn tất module SSOT (2026-06-02)

- Migration `20260602180000`: DROP toàn bộ compat `dm_*` / `fact_*`; lookup `{module}_dm_*`; `v_gstt_*` / `v_qlcv_*` JOIN module; RPC/sync dùng `gstt_fact_*`, `qlcv_fact_*`, …
- Migration `20260602190000`: DROP `rel_user_roles`, `rel_role_permissions`; RPC `rpc_assign_staff_ksnk_role` → `sys_user_roles`.
- App `src/`: codemod + guard `legacy:guard` cấm `.from('dm_*'|'fact_*')`.
- Audit: `node scripts/audit-view-usage.mjs`.

## View chỉ dùng trong SQL/RPC (giữ — không xóa tùy tiện)

| View | Vai trò |
|------|---------|
| `v_gstt_vst_hotpath`, `v_gstt_gsc_dashboard_rows` | Dashboard / analytics RPC |
| `v_gstt_dashboard_bundle_rate_v3`, `v_gstt_dashboard_nhsn_denominator_v3` | GSC gauge / NHSN denominator |
| `v_cssd_bo_dung_cu_bien_dong` | JOIN trong view tồn kho CSSD |
| `v_sys_audit_log_full`, `v_sys_audit_table_choices` | Legacy audit UI đã DROP — có thể xóa sau grep SQL |

**Audit 2026-06-03:** `node scripts/audit-view-usage.mjs` — 0 unused; 7 sql-only (dashboard RPC nội bộ).
