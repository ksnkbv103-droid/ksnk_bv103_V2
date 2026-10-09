# Supabase migrations — BV103

## SSOT apply (Supabase CLI)

CLI chỉ apply file `*.sql` **trực tiếp trong thư mục này** (không quét subfolder).

**Lệnh:** Không db push lên prod — migration prod đi qua Lead/MCP (`apply_migration`); local: `npm run mdm:migrate:local`.

### Linked / staging / prod (chuỗi incremental)

Thư mục gốc giữ chuỗi incremental **`20260530000000` … `20260704120000`** (92 migration — head `20260704120000_vst_gap_analysis_filter_fix.sql`).

| Ghi chú | |
|---------|--|
| [`archive_legacy/khu_vuc_reverted_pair/README.md`](archive_legacy/khu_vuc_reverted_pair/README.md) | Cặp apply+revert khu vực — giữ trên chain remote |
| [`archive_legacy/drafts/`](archive_legacy/drafts/) | File `*_DRAFT*.sql` — **không** apply cho đến khi PO duyệt |

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

| [`archive_legacy/post_baseline_20260530_20260602/`](archive_legacy/post_baseline_20260530_20260602/) | Baseline v1 + 25 file incremental (20260530–20260602) — đã gộp vào baseline v2 |
| [`archive_legacy/drafts/`](archive_legacy/drafts/) | `*_DRAFT*.sql` chờ PO duyệt — không trên chuỗi apply |

Migration **mới** sau baseline v2: `npx supabase migration new <ten>` → file timestamp trong thư mục gốc này.

### Remote / linked

Remote: MCP `apply_migration` ghi version theo thời điểm apply (khác tên file) → **không** `supabase db push` lên prod (sẽ chạy lại migration cũ); migration prod đi qua Lead/MCP. Local: `npm run mdm:migrate:local`. Squash v2 (`20260602100000`) chỉ sau `migration repair` — xem [`migration-squash-runbook.md`](../../docs/reference/guides/migration-squash-runbook.md).

## Không nằm trong migrations/

| Vị trí | Vai trò |
|--------|---------|
| `scripts/sql/` | Precheck, EXPLAIN, smoke, audit — [`scripts/sql/README.md`](../../scripts/sql/README.md) |

## Sau migrate

```bash
npm run trial:db:precheck:local
npm run verify:mdm:local
```

## Tài liệu

- App ↔ DB: [`docs/core/implementation-mapping.md`](../../docs/core/implementation-mapping.md)
- Pipeline: [`docs/core/governance-pipeline.md`](../../docs/core/governance-pipeline.md)
- Squash runbook: [`docs/reference/guides/migration-squash-runbook.md`](../../docs/reference/guides/migration-squash-runbook.md)
