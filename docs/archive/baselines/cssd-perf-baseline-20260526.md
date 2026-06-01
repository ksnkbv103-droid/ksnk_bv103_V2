# CSSD-ERP — Perf baseline + Phase B hardening (26/05/2026)

Đo `EXPLAIN (ANALYZE, BUFFERS)` 4 hot query đại diện từ pilot CSSD trên remote DB.

## State trước Phase B

| # | Bảng / View | Rows | Audit trigger | RLS policy | Indexes hữu ích |
|---|------------|------|---------------|------------|------------------|
| 1 | `cssd_fact_quy_trinh` | ~37 (test) | **❌** | 1 (qual:true) | 8 ✓ |
| 2 | `cssd_fact_lo_tiet_khuan` | nhỏ | **❌** | 1 | 5 ✓ |
| 3 | `cssd_fact_su_co` | nhỏ | **❌** | 1 | 9 ✓ |
| 4 | `cssd_fact_bao_tri` | nhỏ | **❌** | 2 (all+select) | 5 ✓ |
| 5 | `cssd_fact_kho_giao_dich` | 0 | **❌** | 2 | 1 |
| 6 | `cssd_fact_kho_hoa_chat_giao_dich` | nhỏ | **❌** | 2 | 5 |
| 7 | `cssd_fact_quy_trinh_thanh_phan` | nhỏ | **❌** | 1 | 3 |
| 8 | `cssd_fact_kho_chi_tiet` | nhỏ | **❌** | **0** ⚠ | 2 |
| 9 | `cssd_fact_lifecycle_event` | nhỏ | **❌** | **0** ⚠ | 3 |
| 10 | `cssd_fact_dieu_chuyen_thanh_phan` | nhỏ | **❌** | **0** ⚠ | 3 |
| | `cssd_dm_bo_dung_cu_chi_tiet` | 3960 | n/a | RLS FORCE ✓ | thiếu idx FK `bo_dung_cu_id` |

**3 gap đỏ**:
1. Toàn bộ 10 fact CSSD không có audit trigger → INSERT/UPDATE/DELETE không lưu vết.
2. 3 fact `cssd_fact_kho_chi_tiet`, `lifecycle_event`, `dieu_chuyen_thanh_phan` RLS enabled nhưng 0 policy → bom hẹn giờ khi migrate sang user-client.
3. `cssd_dm_bo_dung_cu_chi_tiet` (3960 rows) thiếu index trên FK `bo_dung_cu_id` → view summary 472 ms cho 50 dòng.

## Hot query baseline (TRƯỚC)

| # | Query | Plan | Exec |
|---|-------|------|------|
| q1 | `v_cssd_lo_tiet_khuan_full` TOP 50 desc | Index Scan `idx_lo_tiet_khuan_created_at` | **5 ms** ✓ |
| q2 | `v_cssd_quy_trinh_full` last-7d TOP 100 | Seq Scan 37 row + hash join | **12 ms** ✓ |
| q3 | `v_cssd_kho_le_realtime_qty` TOP 100 | GroupAggregate 1355 × 0 row giao_dich | 50 ms ⚠ |
| q4 | `v_cssd_bo_dung_cu_summary` TOP 50 | Merge/Nested Loop trên 3960 row chi_tiet | **472 ms** 🔴 |

## Phase B đã apply

### B.1 — Audit trigger v2 cho 10 cssd_fact_*

Migration `20260526000011_cssd_fact_audit_and_rls_fill.sql`. Mỗi bảng có trigger
`trg_<table>_audit AFTER INSERT/UPDATE/DELETE` gọi `fn_sys_audit_row()`.

→ Mọi mutation trên fact CSSD ghi `sys_audit_log` với `changed_by = auth.uid()`.

### B.2 — Vá 3 fact thiếu policy

Cùng migration. Áp pattern legacy `qual:true authenticated` (đồng nhất 7 fact khác)
cho `cssd_fact_kho_chi_tiet`, `cssd_fact_lifecycle_event`, `cssd_fact_dieu_chuyen_thanh_phan`.

**Lý do giữ pattern legacy thay vì nâng cấp permission gating Phase A**: app CSSD đang
dùng `createAdminSupabaseClient()` (bypass RLS); nâng cấp policy lúc này không kick in
nhưng dễ phá nếu app migrate user-client lệch nhịp. Tách thành phase sau.

### B.3 — Index FK trên `cssd_dm_bo_dung_cu_chi_tiet.bo_dung_cu_id`

Migration `20260526000012_cssd_dm_bdc_chi_tiet_idx_fk.sql`.

```sql
CREATE INDEX IF NOT EXISTS idx_cssd_dm_bo_dung_cu_chi_tiet_bo_dung_cu_id
  ON public.cssd_dm_bo_dung_cu_chi_tiet (bo_dung_cu_id);
```

## Hot query sau Phase B

| # | Query | Plan | Trước | Sau | Tốc độ |
|---|-------|------|-------|-----|--------|
| q4 | `v_cssd_bo_dung_cu_summary` TOP 50 | Index Scan dùng `idx_cssd_dm_bo_dung_cu_chi_tiet_bo_dung_cu_id` | 472 ms | **7.3 ms** | **65×** |

q1/q2/q3 không thay đổi (đã tối ưu sẵn / data nhỏ).

## State sau Phase B

| Hạng mục | Trước | Sau |
|----------|-------|-----|
| Audit trigger trên `cssd_fact_*` | 0/10 | **10/10** ✓ |
| Fact thiếu RLS policy | 3 | **0** ✓ |
| Index FK chí mạng | thiếu | **có** ✓ |
| Hot path summary | 472 ms | **7.3 ms** (65×) |

## Hold sang phase sau

- **B.x'**: Khi app CSSD migrate user-client, nâng RLS pattern legacy `qual:true` của
  10 cssd_fact_* lên `fn_sys_attach_admin_rls(<table>, <module>)` (permission gating
  theo module CSSD_WORKFLOW, CSSD_KHO_DUNGCU, CSSD_KHO_HOACHAT, BAO_TRI…).
- **B.x''**: Tối ưu `v_cssd_kho_le_realtime_qty` khi data giao dịch tăng (hiện rows=0).
  Có thể thêm index partial trên `cssd_fact_kho_giao_dich(loai_dung_cu_id) WHERE is_active`.
- **B.x'''**: Đo lại các action `cssd-read/batch/kho-read/report-read` round-trip
  count (audit-style) khi pilot CSSD chạy load thật.

## Risk + verify

- Audit trigger không lock table; AFTER trigger không block ghi. Backfill compliance
  bắt đầu kể từ migration apply (26/05/2026 chiều).
- Pattern legacy `qual:true` cho 3 fact mới = đồng nhất với 7 fact đã có → không có
  regression hành vi.
- Index thêm chiếm ~80 KB (3960 row × 24 byte/idx entry) — không đáng kể.
- Verify gates: `verify:engineering` + `verify:mdm` (sẽ chạy sau).
