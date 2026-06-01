# Quản trị hệ thống BV103 — Kế hoạch 9 slice dứt điểm (25/05/2026)

Tóm tắt kế hoạch cải tiến module Quản trị hệ thống (`/quan-tri-he-thong/*`) sau đợt
chuẩn hóa prefix DB ngày 25/05. Tham chiếu: [`implementation-mapping.md`](../implementation-mapping.md),
`scripts/sql/reference/ssot-slice8/README.md`.

## Trạng thái triển khai

| Slice | Mục tiêu | Trạng thái | Output |
|------|----------|------------|--------|
| 1 | Đồng bộ doc mapping `implementation-mapping.md` theo prefix mới + cảnh báo Double SSOT | ✅ Done | Phụ lục "Prefix map 25/05/2026" + changelog 2026-05-25 |
| 2 | Comment SSOT trong code action; chuyển WRITE CRUD/MDM về `sys_lookup_value`, `sys_mdm_registry`, `sys_mdm_suggestion` | ✅ Done | `master-crud-core.ts`, `mdm-governance.actions.ts` |
| 3 | Audit trigger v2 capture `auth.uid()` cho 12 bảng admin core | ✅ Done | `supabase/migrations/20260526000001_audit_actor_coverage_admin_core.sql` |
| 4 | RLS policies cho 12 bảng admin (additive — code vẫn dùng service-role) | ✅ Done | `supabase/migrations/20260526000005_rls_admin_core_tables.sql` |
| 5 | Gom `master-crud-core` + `master-crud-safe-core` thành 1 module duy nhất | ✅ Done | Xóa `master-crud-safe-core.ts`; chuyển 2 consumer (`bang-kiem`, `nhan-su`) |
| 6 | View phẳng `v_sys_audit_log_full` + 4 index + refactor `audit-log.actions` về 1 round-trip | ✅ Done | `supabase/migrations/20260526000002_v_sys_audit_log_full_and_indexes.sql` |
| 7 | Flatten chuỗi view 3 tầng `fact_bv103_audit_log` + pg_cron retention 365 ngày | ✅ Done | `supabase/migrations/20260526000003_flatten_audit_views_and_retention.sql` |
| 8 | Dứt điểm Double SSOT 14 loại lookup | ✅ **Resolved trước phase này** (xác nhận bằng probe 26/05) | `scripts/sql/reference/ssot-slice8/` giữ làm template tham khảo, **không apply** |
| 9 | RPC `fn_admin_module_stats` 1 round-trip + `unstable_cache` (TTL 60s) + revalidate tag | ✅ Done | `supabase/migrations/20260526000004_rpc_admin_module_stats.sql` + refactor `danh-muc-hybrid.actions.ts` |

## Quy trình apply còn lại

Các migration mới (`20260526*`) đã sẵn sàng. Tuần tự apply trên local rồi staging:

```bash
npm run mdm:migrate:local
npm run verify:mdm:local
```

Sau khi xác nhận:

```bash
npm run mdm:migrate
npm run verify:mdm
```

Slice 8 **KHÔNG** apply tự động; xem `scripts/sql/reference/ssot-slice8/README.md`
cho checklist reconcile + backup + maintenance window.

## Follow-up đã hoàn tất (26/05/2026 chiều)

| Việc | Trạng thái | Output |
|------|------------|--------|
| **Slice 4 follow-up** — chuyển admin client → user client cho 2 file phù hợp | ✅ Done | `audit-log.actions.ts` (read-only), `mdm-governance.actions.ts` (read+write); RLS DANH_MUC/PHAN_QUYEN kick in defense-in-depth. **`rbac.actions.ts` giữ admin client** vì là bootstrap/seed logic (cần bypass RLS để gán 100 perm cho ADMIN, tránh chicken-and-egg) |
| **Slice 7 follow-up** — flatten chuỗi RBAC view 2-tầng `dm_*` → `auth_*` → `sys_*` | ✅ Done | `supabase/migrations/20260526000007_flatten_rbac_compat_views.sql`: `dm_roles`, `dm_permissions`, `rel_role_permissions`, `rel_user_roles` đọc trực tiếp `sys_*` (count match 5/100/155/15) |
| **Slice 6 follow-up** — RLS rename policy `_select` → `<table>_select` | ✅ Done | `supabase/migrations/20260526000006_rls_policy_name_fix.sql`: sửa `fn_sys_attach_admin_rls` (dùng `pg_class.relname` thay `split_part`), drop policy tên xấu, recreate; dọn 2 dòng smoke test rác |
| **Slice 8** — Dứt điểm Double SSOT 14 loại lookup | ✅ Resolved before this phase | `scripts/sql/reference/ssot-slice8/` (template, không apply) |

## Phase A (đóng dứt điểm admin module) — 26/05/2026 chiều

| Việc | Trạng thái | Output |
|------|------------|--------|
| **A.1 RLS mở rộng** — phủ thêm 6 master-data CSSD (`thiết bị`, `hóa chất`, `loại DC`, `bộ DC`, `bộ DC chi tiết`, `bộ phân bổ`) | ✅ Done | `supabase/migrations/20260526000008_rls_master_data_expand.sql`; mỗi bảng có 4 policy SELECT/INSERT/UPDATE/DELETE theo module THIET_BI/HOA_CHAT/LOAI_DC/BO_DC/CSSD_KHO_DUNGCU |
| **A.2 Tách `getRBACData` user client** | ✅ Done | `rbac.actions.ts` đổi `getRBACData` → `createServerSupabaseUserClient()` + đọc trực tiếp `sys_*`; giữ `syncPermissionRegistry`/`saveFullRBACMatrix`/`updateRolePermission` admin client (bootstrap-only); `rbac-auth.helpers.ts` đổi `rel_user_roles(dm_roles)` → `sys_user_roles(sys_roles)` |
| **A.3 DROP 4 view `auth_dm_*`** | ✅ Done | `supabase/migrations/20260526000009_drop_auth_dm_compat_views.sql`: re-point `v_auth_user_permissions` đọc trực tiếp `sys_*` (đảm bảo zero-downtime RLS), sau đó `DROP VIEW IF EXISTS auth_dm_roles/auth_dm_permissions/auth_rel_*`. 1 ADMIN user vẫn pass check |
| **A.4 Benchmark thực tế** | ✅ Done | `docs/modules/admin-module-perf-baseline-20260526.md` + `scripts/sql/admin-perf-baseline.sql`; tóm tắt: RPC stats 18.1ms, audit list 0.28ms, audit filter 0.16ms, table_choices 0.31ms — đúng 4 index mới được planner sử dụng |
