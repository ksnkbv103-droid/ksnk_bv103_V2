# Supabase migrations — BV103

## SSOT apply (Supabase CLI)

CLI chỉ apply file `*.sql` **trực tiếp trong thư mục này** (không quét subfolder).

**Lệnh:** `npm run mdm:migrate` (linked) hoặc `npm run mdm:migrate:local`.

### Chuỗi pilot (squash 2026-05-30)

| File | Mô tả |
|------|--------|
| `20260530000000_init_pilot_baseline.sql` | Schema + RPC + RLS + view (pg_dump sau full chain) |
| `../seed.sql` | Master seed: `sys_lookup_value`, `gstt_dm_bang_kiem` (36 mẫu) — chạy sau migrate khi `db reset` |

**Local fresh install (mất data local — chấp nhận):**

```bash
npx supabase db reset --local
npm run trial:db:precheck:local
```

### Lịch sử incremental (archived)

| Thư mục | Nội dung |
|---------|----------|
| [`archive_legacy/README.md`](archive_legacy/README.md) → `docs/archive/pilot_chain_20260520_20260529.tar.gz` | 90 migration trước squash — **không apply** |

Migration **mới** sau pilot baseline: `npx supabase migration new <ten>` → file timestamp trong thư mục gốc này.

### Remote / linked đã apply chain cũ

Nếu project linked đã có 90 migration trong `schema_migrations`, **không** `db push` baseline mới lên prod trực tiếp. Cần maintenance window + `migration repair` hoặc DB mới. Pilot local-only: reset là đủ.

## Không nằm trong migrations/

| Vị trí | Vai trò |
|--------|---------|
| `scripts/sql/` | Precheck, EXPLAIN, smoke, audit — [`scripts/sql/README.md`](../../scripts/sql/README.md) |
| `scripts/archive/sql-20260531/reference-ssot-slice8/` | Template Slice 8 (resolved, không apply) |

## Sau migrate

```bash
npm run trial:db:precheck:local
npm run verify:mdm:local
```

Dashboard hybrid EXPLAIN: `npm run pilot:dashboard:explain:local`

## Tài liệu

- App ↔ DB: [`docs/core/implementation-mapping.md`](../../docs/core/implementation-mapping.md)
- Pipeline: [`docs/core/governance-pipeline.md`](../../docs/core/governance-pipeline.md)
