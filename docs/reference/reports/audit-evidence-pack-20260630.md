# Audit evidence pack — 2026-06-30

> **Phạm vi:** Full parallel audit 7 module + remediation wave  
> **Repo head:** 85 migrations (`20260701000000`)  
> **Môi trường đo:** Local Docker Supabase

---

## Automated gates

| Gate | Kết quả | Ghi chú |
|------|---------|---------|
| `npm run verify` | **PASS** | lint (0 errors), layout drift, CSSD, engineering, build |
| `npm run pilot:go-live:gate:local` | **PASS** | precheck + smoke GSC/VST |
| `npm run verify:engineering` | **PASS** | 141 actions, 147 verifyPermission, contract gate |
| `npm run verify:cssd` | **PASS** | 49 tests |
| `npm run legacy:guard` | **PASS** | 0 compat `.from(fact_*)` |
| `npm run legacy:sql:guard` | **PASS** | |
| `npm run ssot:db:guard:local` | **PASS** | `legacy_compat_views_ok: true` (sau `20260701000000`) |
| `npm run repo:hygiene` | **PASS** | SQL allowlist cập nhật |
| `npm run layout:drift-check` | **PASS** | 0 blocking drift (5 adoption-warn) |
| `npm run trial:db:precheck:local` | **PASS** | 23/23 checks true |
| `npm run trial:auth:precheck:local` | **PASS** | `mdm_email_no_auth = 0` |
| `npm run gstt:db:audit:local` | **PASS** | 36 BK active, summary = live views |
| `npm run cssd:db:audit:local` | **PASS** | 0 thiếu trạm, 0 quá hạn FEFO |
| `npm run verify:danh-muc-routes` | **PASS** | 8/8 hub routes |
| `npm run trial:audit:probe:local` | **PASS** (sau fix SQL) | 0 audit trigger orphan |

---

## DB snapshot (local)

| Metric | Giá trị |
|--------|---------|
| Migration files (repo) | 85 |
| Applied (local) | 85 / max `20260701000000` |
| Auth users / mdm_nhan_su linked | 1 / 1 |
| Active khu vực giám sát | 22 |

---

## Engineering baseline

| Metric | Giá trị |
|--------|---------|
| Server Action files | 141 |
| verifyPermission calls | 147 |
| Potential unbounded fact reads | 0 |
| CSSD domain tests | 49 pass |
| Pilot spec tests | 22 pass |

---

## Remediation applied trong audit này

1. Migration `20260701000000` — DROP `dm_bang_kiem` compat + RPC `rpc_gstt_dm_bang_kiem_max_numeric_suffix`
2. Fix ESLint errors — `supervision-charts-khoa.tsx`, `use-analytics-filters.ts`
3. UX typography — `text-[10px]` → `text-[11px]` (38→0 layout hits)
4. Panel chrome adoption — 6 panel imports
5. SQL runner — `cssd-tram-fk-health-audit.sql`, `audit-orphan-trigger-probe.sql` single-statement JSON
6. `repo-hygiene` SQL allowlist — gstt audit + ssot-legacy-guard

---

## Liên kết

- Gap register: [gap-register-20260630.md](./gap-register-20260630.md)
- Domain/DB: [domain-db-audit-20260630.md](./domain-db-audit-20260630.md)
- Backend: [backend-audit-20260630.md](./backend-audit-20260630.md)
- UX: [ux-audit-20260630.md](./ux-audit-20260630.md)
