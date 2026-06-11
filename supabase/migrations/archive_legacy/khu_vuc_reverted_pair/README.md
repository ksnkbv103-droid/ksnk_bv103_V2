# Chuỗi khu vực apply + revert (lịch sử remote)

| File | Vai trò |
|------|---------|
| `20260608030000_khu_vuc_constraints_and_naming.sql` | Thử ràng buộc + đổi tên (đã revert) |
| `20260608032500_revert_khu_vuc_constraints_and_naming.sql` | Rollback 08030000 |

**Trạng thái cuối SSOT** (giữ file trên chain vì remote đã apply — không xóa):

- `20260608043000_simplify_khu_vuc_giam_sat_list.sql` — 22 khu active
- `20260608050000_restructure_khu_vuc_codes.sql` — mã `KV_*` (bỏ tiền tố TR/DO/VA/XA)
- `20260612100000_ssot_sql_legacy_cleanup.sql` — guard idempotent + seed/db lệch

App/script mới: **cấm** mã `KV_TR_*`, `KV_DO_*`, `KV_VA_*`, `KV_XA_*`.

Probe: `scripts/sql/khu-vuc-verify.sql` + `scripts/sql/ssot-legacy-guard.sql`
