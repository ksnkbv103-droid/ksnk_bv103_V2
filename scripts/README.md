# Scripts BV103 — inventory

> SQL vận hành: [`sql/README.md`](sql/README.md).

## Cấu trúc

| Thư mục | Vai trò |
|---------|---------|
| `scripts/*.mjs` | Runner, gate, audit — gắn `package.json` |
| `scripts/sql/` | Probe read-only (precheck, EXPLAIN, smoke) |
| `scripts/lib/` | Helper dùng chung (`resolve-supabase-query-output.mjs`) |

## Lệnh npm chính (theo nhóm)

| Nhóm | Lệnh | Mục đích |
|------|------|----------|
| Hygiene | `repo:hygiene`, `docs:links:check`, `dead-code:scan` | Inventory repo + link docs |
| Local golden | `local:golden:verify`, `local:golden:reset` | DB local sạch sau reset (**11 probe**) |
| DB probe | `trial:db:precheck`, `ssot:db:guard`, `fact:orphan:sweep`, `cssd:db:audit`, `gstt:db:audit` | `:local` cho Docker |
| View audit | `audit:views` | View orphan vs src/sql — probe 11 trong `local:golden:verify` (cần `:54322`) |
| Pilot ship | `pilot:go-live:gate`, `verify`, `verify:engineering` | Trước push / ký go-live |
| MDM | `mdm:migrate:local`, `mdm:apply-and-verify`, `admin:rbac:sync` | Schema + RBAC. Không db push lên prod — migration prod đi qua Lead/MCP (`apply_migration`); local: `npm run mdm:migrate:local`. |
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
