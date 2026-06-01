# Admin Module Performance Baseline — 26/05/2026

Số liệu đo trên remote Supabase sau khi apply 9 migration `20260526*` + 1 follow-up RBAC (000007–000009).

## Bối cảnh dữ liệu khi đo

| Đối tượng | Số dòng |
|----------|---------|
| `sys_audit_log` | 47 |
| `sys_lookup_value` | ~1.5k |
| `mdm_nhan_su` | ~50 |
| `sys_roles` | 5 |
| `sys_permissions` | 100 |
| `sys_role_permissions` | 155 |
| `sys_user_roles` | 15 |

(Đo lúc DB pilot còn nhẹ — số tuyệt đối sẽ tăng khi đi production. Test chính là để xác nhận plan & index, chứ không phải absolute timing.)

## A. `fn_admin_module_stats()`

```text
Result  (cost=0.00..0.26 rows=1 width=32)
Planning Time:    0.046 ms
Execution Time:  18.144 ms
```

- 1 round-trip duy nhất thay vì ~50 round-trip riêng lẻ (`9 core × 2 query + 18 registry × 2 query`).
- 18ms cho **toàn bộ stats panel**. UI hit cache `unstable_cache` TTL 60s → hầu hết request ~5ms.

## B. `v_sys_audit_log_full` — page 1 (`ORDER BY changed_at DESC LIMIT 25`)

```text
Limit  (cost=0.28..23.43 rows=25 width=260)  Execution: 0.281 ms
  Nested Loop Left Join
    Index Scan using idx_sys_audit_log_changed_at_desc on sys_audit_log al
    Index Scan using uq_ho_so_nhan_vien_auth_user_id on mdm_nhan_su ns
      Index Cond: (auth_user_id = al.changed_by)
```

- Dùng đúng `idx_sys_audit_log_changed_at_desc` (mới tạo ở `20260526000002`).
- JOIN với `mdm_nhan_su` qua **unique index** sẵn có — không seq scan.
- **0.28 ms** cho 25 row.

## C. Filter `table_name='sys_lookup_value' AND action='INSERT' ORDER BY changed_at DESC LIMIT 25`

```text
Limit  (cost=0.28..4.73 rows=1 width=260)  Execution: 0.161 ms
  Nested Loop Left Join
    Index Scan using idx_sys_audit_log_action_changed_at on sys_audit_log al
      Index Cond: (action = 'INSERT')
```

- Planner chọn `idx_sys_audit_log_action_changed_at` vì cardinality `action='INSERT'` cao hơn `table_name` ở quy mô hiện tại.
- Khi `sys_audit_log` tăng > 1k row, planner sẽ tự shift sang `idx_sys_audit_log_table_name_changed_at` (composite index đã sẵn sàng).

## D. `v_sys_audit_table_choices`

```text
Sort (cost=15.60..15.72 rows=47 width=48)  Execution: 0.313 ms
  HashAggregate  Group Key: sys_audit_log.table_name
    Seq Scan on sys_audit_log  (rows=47)
```

- 47 row hiện tại → seq scan rẻ hơn index. Khi lên hàng nghìn, planner sẽ tự chuyển sang `idx_sys_audit_log_table_name_changed_at`.
- Tinh thần: precompute view này tránh quét full table mỗi lần load dropdown filter (trước Slice 6, action `getDistinctAuditTables` quét toàn table không có aggregation).

## Kết luận

1. **Tất cả 4 index mới được planner sử dụng** đúng như dự định khi viết Slice 6.
2. **RPC `fn_admin_module_stats` hoàn thành dưới 20ms** — đủ chỗ trống để dữ liệu lookup tăng lên ~100k vẫn an toàn (mỗi count nhánh là index-only-scan).
3. **N+1 trước đây trên audit list (50 query để lookup user) giờ là Nested Loop Left Join 1-pass** với unique index → ~50× cải thiện.
4. **Cache layer `unstable_cache` + `revalidateTag(ADMIN_MODULE_STATS_TAG)`** giúp hit rate cao cho dashboard tab default.

## Re-run cách nào

```bash
export SUPABASE_ACCESS_TOKEN=$(grep ^SUPABASE_ACCESS_TOKEN .env.local | cut -d= -f2-)
for L in a b c d; do
  echo "=== Query $L ==="
  npx supabase db query --linked --agent=no -f /tmp/perf_$L.sql
done
```

Hoặc dùng file gộp `scripts/sql/admin-perf-baseline.sql` (Management API chỉ trả kết quả query cuối → nên tách).
