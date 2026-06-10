# Audit evidence pack — 2026-06-09

> Ground-truth snapshot for Health Check walkthrough. Extends [audit-evidence-pack-20260603.md](./audit-evidence-pack-20260603.md).

## Scope

| Field | Value |
|-------|--------|
| Branch | `main` |
| Commit | `12cff4c4a866eb2fe72d084d2142cfd02da05f83` |
| Working tree | Dirty (route restructure + khu vực Jun-08 migrations + health-check fixes) |
| Audit date | 2026-06-09 |
| DB target | **Linked staging** (local Supabase not running — `mdm:migrate:local` connection refused) |

## Migrations (repo)

**57** files in `supabase/migrations/` (1 baseline + 56 incremental).

Post-03/06 highlights:

| Window | Intent |
|--------|--------|
| 20260604 | D-07 DROP physical `gstt_fact_*_summary` tables; live views; DROP legacy dashboard RPCs |
| 20260605–06 | Strategic compare matrices RPC; GSC stats NA exclusion; khu vực lookup cutover wave |
| 20260607 | QLCV TEXT-only schema cleanup |
| 20260608 | Khu vực constraints (apply+revert pair), `khoa_phong_allowed_khu_vucs`, simplify list, restructure codes |

## Environment

| Env | Status | Notes |
|-----|--------|-------|
| **Linked staging** | `mdm:migrate` → **Remote database is up to date** | All repo migrations applied |
| **Local Postgres** | **DOWN** | `127.0.0.1:54322 connection refused` — EXPLAIN/size audit uses linked only |
| **Repo filesystem** | 57 migration files | Head: `20260608050000_restructure_khu_vuc_codes.sql` |

## Automated gates (2026-06-09 run)

| Command | Result |
|---------|--------|
| `npm run verify:engineering` | **PASS** — 135 action files, 174 `verifyPermission`, contract gate, legacy guard |
| `npm run verify:mdm` | **PASS** — coverage 100%, postcheck SQL/FK OK |
| `npm run trial:db:precheck` | **PASS** — all 4-module objects + 6 dashboard RPCs exist |
| `npm run smoke:gsc-vst` | **PASS** |
| `npm run audit:legacy-rpc` | **PASS** — 13 active RPC; 2 admin-only without src ref (expected) |
| `npm run test:pilot` | **PASS** — 19 tests (incl. extended RPC contract) |
| `npm run layout:drift-check` | **PASS** |
| `npm run layout:typography-check` | **PASS** (after khoa-phong-form-modal fix) |
| `npm run repo:hygiene` | **WARN** — 9 SQL files not in SQL_ACTIVE allowlist |
| `npm run gstt:db:audit` | **PASS** |
| `npm run pilot:dashboard:explain:linked` (post AI-F1) | VST **306 ms** (was 418 ms), GSC 59 ms |

## Dashboard RPC latency (linked EXPLAIN, default 3-month window)

| RPC | Execution time |
|-----|----------------|
| `rpc_dashboard_vst_strategic_analytics` | **418 ms** |
| `rpc_dashboard_gsc_strategic_analytics` | **59 ms** |
| `rpc_get_compliance_dashboard_v4` | **9 ms** |
| `rpc_get_dashboard_ksnk_staff_supervision_stats` | **55 ms** |

> Staging volume differs from local ~4ms benchmark (2026-06-03). VST strategic RPC is the primary latency outlier.

## GSTT summary path (linked introspection)

All `gstt_fact_*_summary` objects are **views** (not physical tables):

- `gstt_fact_gsc_dashboard_summary`
- `gstt_fact_gsc_violations_summary`
- `gstt_fact_vst_moments_summary`
- `gstt_fact_vst_opportunities_summary`
- `gstt_fact_vst_sessions_summary`

**Triggers on fact tables** (no orphan sync-to-dropped-table):

| Trigger | Table | Function |
|---------|-------|----------|
| `trg_assert_gsc_sessions_not_locked` | `gstt_fact_chung_sessions` | `fn_assert_vst_gsc_not_locked` |
| `trg_assert_vst_sessions_not_locked` | `gstt_fact_vst_sessions` | `fn_assert_vst_gsc_not_locked` |
| `trg_mdm_validate_lookup_*` | GSC/VST facts | `fn_mdm_validate_lookup_integrity` |

## Khu vực giám sát (linked)

22 active `KHU_VUC_GIAM_SAT` lookup rows with `nhom` TR/DO/VA/XA (post Jun-08 restructure). Sample verified via `scripts/sql/khu-vuc-verify.sql`.

## Scoring DM integrity

| Metric | Value |
|--------|-------|
| Active `gstt_dm_bang_kiem` | 36 |
| `cach_tinh_diem IS NULL` | **0** |

## Module file counts (`src/modules`)

| Module | TS/TSX (approx.) |
|--------|------------------|
| quan-tri-he-thong | 137+ |
| cssd-erp | 116 |
| giam-sat-chung | 53+ |
| giam-sat-vst | 38+ |
| dashboard | 30+ |

Routes (`src/app/**/page.tsx`): **44** pages (incl. new `/thong-ke/*`, `/lich-su/*`).

## Health-check SQL artifacts (new)

- `scripts/sql/health-check-gstt-introspect.sql`
- `scripts/sql/health-check-gstt-summary-kinds.sql`
- `scripts/sql/health-check-gstt-triggers.sql`

## Cleanup performed during audit

| Change | Rollback |
|--------|----------|
| Deep links `?tab=analytics` → `/thong-ke/{vst,gsc}` | Revert commits on listed files |
| `buildAnalyticsDeepLink` canonical route mapping | Revert `bao-cao-tong-hop-core.ts` |
| VST `?tab=history|analytics` server redirect | Revert `giam-sat-vst/page.tsx` |
| VST post-save nav → `/lich-su/vst` | Revert `VSTFormView.tsx` |
| RPC contract +2 compare matrices | Revert `rpc-contract-dashboard.spec.ts` |
| Pre-aggregation doc marked STALE | Revert doc header |
| Typography drift fix | Revert `khoa-phong-form-modal.tsx` |
