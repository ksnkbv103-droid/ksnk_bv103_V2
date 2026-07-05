# Scripts BV103 — inventory

> SQL vận hành: [`sql/README.md`](sql/README.md). Archive: [`archive/`](archive/).

## Cấu trúc

| Thư mục | Vai trò |
|---------|---------|
| `scripts/*.mjs` | Runner, gate, audit — gắn `package.json` |
| `scripts/sql/` | Probe read-only (precheck, EXPLAIN, smoke) |
| `scripts/lib/` | Helper dùng chung (`resolve-supabase-query-output.mjs`) |
| `scripts/archive/one-off-20260531/` | Import CSV / cutover pilot (lịch sử) |
| `scripts/archive/sql-20260531/` | SQL ad-hoc cũ |
| `scripts/archive/codemods-202606/` | Codemod một lần (UI/table rename) |

## Lệnh npm chính (theo nhóm)

| Nhóm | Lệnh | Mục đích |
|------|------|----------|
| Hygiene | `repo:hygiene`, `docs:links:check`, `dead-code:scan` | Inventory repo + link docs |
| Local golden | `local:golden:verify`, `local:golden:reset` | DB local sạch sau reset |
| DB probe | `trial:db:precheck`, `ssot:db:guard`, `fact:orphan:sweep`, `cssd:db:audit`, `gstt:db:audit` | `:local` cho Docker |
| View audit | `audit:views` | View orphan vs src/sql (cần DB local `:54322`) |
| Pilot ship | `pilot:go-live:gate`, `verify`, `verify:engineering` | Trước push / ký go-live |
| MDM | `mdm:migrate`, `mdm:apply-and-verify`, `admin:rbac:sync` | Schema + RBAC |
| Layout | `layout:drift-check`, `panel:chrome-check`, `columns:chrome-check` | UI governance |

## Ops thủ công (không CI)

| Script | Lệnh | Ghi chú |
|--------|------|---------|
| GSTT gap backfill | `npm run gstt:gap:backfill` | Cần `--env-file=.env.local`; xem header file |
| Bulk onboard | `npm run ops:bulk-ksnk-onboard` | Onboard nhân sự hàng loạt |

## Kiểm tra inventory

```bash
npm run repo:hygiene    # SQL allowlist + script root vs package.json
npm run docs:links:check
```
