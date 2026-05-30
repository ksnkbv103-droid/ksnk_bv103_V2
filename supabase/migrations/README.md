# Supabase migrations — BV103

## SSOT apply (Supabase CLI)

CLI chỉ apply file `*.sql` **trực tiếp trong thư mục này** (không quét subfolder).

**Lệnh:** `npm run mdm:migrate` (linked) hoặc `npm run mdm:migrate:local`.

### Chuỗi baseline (squash 2026-05-20)

| File | Mô tả |
|------|--------|
| `20260520000000_init_clean_schema.sql` | Baseline pg_dump (schema + RLS + RPC init) |
| `20260520000002_dashboard_pre_aggregation.sql` | Pre-agg dashboard, trigger sync |
| `20260520000003_lock_technical_registries.sql` | Khóa ghi registry kỹ thuật GSC |
| `20260520000004`–`000014` | Lookup consolidate, strategic RPC, CSSD ledger, … |

Các file `20260521*`–`20260529*` trên disk là **migration tiếp theo** (GSC canonical, NKBV, admin slice, …) — apply theo timestamp sau baseline; changelog: [`docs/specs/10-bv103-implementation-mapping.md`](../../docs/specs/10-bv103-implementation-mapping.md).

## `archive_legacy/` (~102 file)

Migration **trước squash 05/2026**. CLI **không** apply.

- Tra lịch sử / audit only.
- Project mới: chỉ cần chuỗi gốc + file timestamp mới; không replay archive.

## Không nằm trong migrations/

| Vị trí | Vai trò |
|--------|---------|
| `scripts/sql/` | Precheck, EXPLAIN, smoke, audit — [`scripts/sql/README.md`](../../scripts/sql/README.md) |
| `scripts/sql/reference/ssot-slice8/` | Template Slice 8 (đã resolved, không apply) |
| `supabase/schema.sql`, `data.sql` | Snapshot local (gitignore); có thể stale |

## Sau migrate

```bash
npm run trial:db:precheck        # linked
npm run trial:db:precheck:local  # local
npm run verify:mdm
```

Dashboard hybrid EXPLAIN: `npm run pilot:dashboard:explain:linked`

## Tài liệu

- App ↔ DB: [`docs/specs/10-bv103-implementation-mapping.md`](../../docs/specs/10-bv103-implementation-mapping.md)
- Pipeline: [`docs/specs/GOVERNANCE_PIPELINE.md`](../../docs/specs/GOVERNANCE_PIPELINE.md)
- SOP: [`docs/operations/UNIFIED_OPERATIONS_SOP.md`](../../docs/operations/UNIFIED_OPERATIONS_SOP.md) §2
