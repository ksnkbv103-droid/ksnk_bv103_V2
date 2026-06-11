# Supabase migrations — BV103

## SSOT apply (Supabase CLI)

CLI chỉ apply file `*.sql` **trực tiếp trong thư mục này** (không quét subfolder).

**Lệnh:** `npm run mdm:migrate` (linked) hoặc `npm run mdm:migrate:local`.

### Linked / staging / prod (chuỗi incremental)

Thư mục gốc giữ chuỗi incremental **`20260530000000` … `20260612100000`** (~63 migration).

| Ghi chú | |
|---------|--|
| [`archive_legacy/khu_vuc_reverted_pair/README.md`](archive_legacy/khu_vuc_reverted_pair/README.md) | Cặp apply+revert khu vực — giữ trên chain remote |
| [`../archive/`](../archive/) | pg_dump schema/data deprecated |

Nếu CLI báo `Remote migration versions not found in local`:

```bash
cp supabase/migrations/archive_legacy/post_baseline_20260530_20260602/*.sql supabase/migrations/
npx supabase migration list --linked
```

### Local fresh install (squash v2 — tùy chọn)

| File | Mô tả |
|------|--------|
| `archive_legacy/20260602100000_init_pilot_baseline.sql` | Baseline pg_dump (1 file) — chỉ dùng khi reset local sạch |
| `../seed.sql` | Master seed sau `db reset` |

```bash
# Chỉ khi chủ đích squash local: copy baseline v2 vào migrations/, repair local history — xem migration-squash-runbook.md
npx supabase db reset --local
npm run trial:db:precheck:local
```

### Lịch sử (archived — không apply)

| Artifact | Nội dung |
|----------|----------|
| [`docs/archive/pilot_chain_20260520_20260529.tar.gz`](../../docs/archive/pilot_chain_20260520_20260529.tar.gz) | 90 migration trước squash v1 |
| [`archive_legacy/post_baseline_20260530_20260602/`](archive_legacy/post_baseline_20260530_20260602/) | Baseline v1 + 25 file incremental (20260530–20260602) — đã gộp vào baseline v2 |

Migration **mới** sau baseline v2: `npx supabase migration new <ten>` → file timestamp trong thư mục gốc này.

### Remote / linked

`npm run mdm:migrate` cần **file trùng version** với `schema_migrations` trên remote. Squash v2 (`20260602100000`) chỉ sau `migration repair` — xem [`migration-squash-runbook.md`](../../docs/reference/guides/migration-squash-runbook.md).

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

## Tài liệu

- App ↔ DB: [`docs/core/implementation-mapping.md`](../../docs/core/implementation-mapping.md)
- Pipeline: [`docs/core/governance-pipeline.md`](../../docs/core/governance-pipeline.md)
- Squash runbook: [`docs/reference/guides/migration-squash-runbook.md`](../../docs/reference/guides/migration-squash-runbook.md)
