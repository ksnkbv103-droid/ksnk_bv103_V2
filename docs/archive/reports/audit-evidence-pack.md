# Audit evidence pack

Một chuỗi. Mục trên cùng là bản cuối.

## 2026-07-09

# Audit evidence pack — 2026-07-09

> **Phạm vi:** Wave 0 baseline — chương trình rà soát toàn diện BV103 (1B + 2A)  
> **Repo head (audit):** `1c8e057` · **Re-verify OPS-01:** 2026-07-09 (Docker OK, migrate head `20260709140000`)  
> **Môi trường đo:** Gate tĩnh + local Supabase (Docker Desktop healthy)

---

## Automated gates

| Gate | Kết quả | Ghi chú |
|------|---------|---------|
| `npm run verify:engineering` | **PASS** | baseline ~141 action files · 146 `verifyPermission` · 0 unbounded fact reads |
| `npm run audit:legacy-rpc` | **PASS** | 16 active RPC · 0 không ref trong `src/` |
| `npm run audit:views` | **PASS** | 54 views · **0 unused** · **16 sql-only** (giữ) |
| `npm run dead-code:scan` | **WARN** | 0 unused files · residual unused exports (warn-only) |
| `npm run repo:hygiene` | **PASS** | 0 blocking |
| `npm run layout:typography-check` | **PASS** | 0 `text-[8px]`/`text-[9px]` ngoài allowlist |
| `npm run layout:drift-check` | **PASS** | UI-01 Done (`bv103PanelChrome`) |
| `npm run verify:cssd` | **PASS** | 49/49 tests |
| `npm run test:pilot` | **PASS** | 24/24 tests |
| `npm run imports:cssd-mdm` | **PASS** | |
| `npm run legacy:guard` | **PASS** | |
| `npm run mdm:migrate:local` | **PASS** | Local up to date (head `20260709140000`) |
| `npm run verify:mdm:local` | **PASS** | coverage 100% · postcheck SQL/FK OK |
| `npm run local:golden:verify` | **PASS** | 11/11 probes |
| `npm run pilot:go-live:gate:local` | **PASS** | precheck + engineering + cssd + pilot + smoke GSC/VST |

---

## Engineering baseline (scan)

| Metric | Giá trị |
|--------|---------|
| Action files (baseline scan) | ~141 |
| `verifyPermission()` calls | 146 |
| `.rpc()` in actions | 21 |
| Potential full fact reads | 0 |
| App routes (`page.tsx`) | 41 |
| Migration files (repo) | head `20260709140000` |
| CSSD domain tests | 49 pass |
| Pilot contract tests | 24 pass |

---

## Dead-code inventory (Fallow)

| Trạng thái | Ghi chú |
|------------|---------|
| Unused files | **0** (Pilot W3 orphans đã xóa) |
| Unused exports | **Done** G-12 — 75→5 residual (shadcn dialog + scripts local env) |
| Whitelist | `src/modules/cssd-erp/actions/cssd.actions.ts` |

---

## sqlOnly views (16 — KEEP trừ 2 review)

`fact_gsc_violations_summary`, `fact_vst_moments_summary`, `fact_vst_opportunities_summary`, `fact_vst_sessions_summary`, `gstt_dm_tieu_chi_bang_kiem`, `gstt_fact_gsc_violations_summary`, `gstt_fact_vst_moments_summary`, `gstt_fact_vst_opportunities_summary`, `gstt_fact_vst_sessions_summary`, `v_auth_user_permissions`, `v_cssd_bo_dung_cu_bien_dong`, `v_gstt_bang_kiem_full`, `v_gstt_dashboard_bundle_rate_v3`, `v_gstt_dashboard_nhsn_denominator_v3`, `v_gstt_gsc_dashboard_rows`, `v_gstt_vst_hotpath`.

**CANDIDATE_REVIEW:** `v_auth_user_permissions`, `v_gstt_bang_kiem_full`.

---

## OPS-01 re-verify (2026-07-09)

Đã mở khóa Docker. Kết quả:

1. `local:golden:verify` — **PASS** (11 probes)
2. `pilot:go-live:gate:local` — **PASS**
3. `smoke:gsc-vst:local` — **PASS**
4. `trial:auth:precheck:local` / `trial:db:precheck:local` — **PASS**
5. Migration local head `20260709140000` (gồm RPC harden `…120000`, RLS `…130000`, QLCV CHECK `…140000`)

Còn ngoài scope session: EXPLAIN dashboard trên staging; parity staging vs repo production.

---

## Liên kết

- [gap-register.md#2026-07-09](./gap-register.md#2026-07-09)
- [comprehensive-review.md#2026-07-09](./comprehensive-review.md#2026-07-09)

## 2026-06-30

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

- Gap register: [gap-register.md#2026-06-30](../../archive/reports/gap-register.md#2026-06-30)
- Domain/DB: [domain-db-audit-20260630.md](./domain-db-audit-20260630.md)
- Backend: [backend-audit-20260630.md](./backend-audit-20260630.md)
- UX: [ux-audit-20260630.md](./ux-audit-20260630.md)

## 2026-06-09

# Audit evidence pack — 2026-06-09

> Ground-truth snapshot for Health Check walkthrough. Extends [audit-evidence-pack.md#2026-06-03](./audit-evidence-pack.md#2026-06-03).

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

## 2026-06-03

# Audit evidence pack — 2026-06-03

> Ground-truth snapshot. Nguồn: project HEAD + CLI (không copy báo cáo 30/05).

## Scope

| Field | Value |
|-------|--------|
| Branch | `refactor/dashboard-hybrid-reform` |
| Commit (recorded) | `11eb574ca92f3950c13130cfd9fe7fe664454b7a` |
| Working tree | **Dirty** — ~230 files changed vs HEAD (audit reflects tree at run time) |
| Audit date | 2026-06-03 |

## Migrations (repo)

**29** files in `supabase/migrations/` (1 baseline + 28 incremental).

Post-baseline highlights (read from filenames + SQL intent):

| Window | Files (sample) | Intent |
|--------|----------------|--------|
| 20260530–31 | QLCV cron, checklist lean, spawn định kỳ, VST/GSC triggers | Pilot workflow + read views |
| 20260602 | `module_ssot_drop_legacy_compat`, view cleanup, CSSD scan gates, NKBV trace, deprecate VST legacy RPCs, drop audit log | Module prefix SSOT |
| 20260603 | `v_auth_permissions_compat_repair`, `rbac_v_auth_orphan_rewrite` | RBAC view repair (repo; see env drift) |

## Environment drift (critical)

| Env | Applied migrations | Latest version |
|-----|-------------------|----------------|
| **Linked staging** | 26 | `20260602190000` |
| **Local Postgres** | **2** | `20260602190000` (also `20260602100000` listed) |
| **Repo filesystem** | 29 files | `20260603140000` (newest filename) |

**Finding:** Local DB is not representative of repo/staging — `npm run mdm:migrate:local` required before any local EXPLAIN/size audit. Staging missing at least `20260603120000`, `20260603140000` vs repo.

## Automated gates (HEAD)

| Command | Result |
|---------|--------|
| `npm run legacy:guard` | **PASS** — no `.from('dm_*'/'fact_*')` in `src/` |
| `npm run repo:hygiene` | **WARN** — `rbac-v-auth-compat-probe.sql` not in SQL_ACTIVE allowlist |
| `npm run layout:drift-check` | **22** non-standard radius matches (CSSD report, NKBV portals, `tai-khoan`) |
| `npm run docs:links:check` | **PASS** |
| `npm run verify:engineering` | **PASS** (132 action files, 165 `verifyPermission`, engineering contract gate) |

## Module file counts (`src/modules`)

| Module | TS/TSX files |
|--------|----------------|
| quan-tri-he-thong | 137 |
| cssd-erp | 116 |
| quan-ly-cong-viec | 56 |
| giam-sat-chung | 53 |
| giam-sat-vst | 38 |
| dashboard | 30 |
| giam-sat-nkbv | 29 |
| cssd-su-co | 12 |
| auth | 3 |

Server Action files (`*.actions.ts`): **87**  
Unit spec files (`*.spec.ts` under `src/`): **46**

## Routes (`src/app/**/page.tsx`)

**35** pages. Sidebar primary (`Sidebar.tsx` `navMain` + `navAdmin`):

- `/`, `/bao-cao-tong-hop`, `/giam-sat-vst`, `/giam-sat-chung`, `/giam-sat-nkbv`, `/quan-ly-cong-viec`
- CSSD: `/cssd-quy-trinh`, `/cssd-su-co`, `/cssd-dung-cu`, `/cssd-thiet-bi`, `/cssd-hoa-chat`
- Admin: `/quan-tri-he-thong`, `/quan-tri-he-thong?tab=dm_registry`

**Not in sidebar** (secondary / admin deep links — expected partial):

- `/giam-sat-vst/lich-su`, `/giam-sat-chung/{tuan-thu,nhat-ky,he-thong}`
- `/cssd-erp/{batch,report}`
- `/quan-tri-he-thong/**` (danh mục, phân quyền, nhân sự, bảng kiểm, …)
- `/tai-khoan`, `/login/*`

## View audit (`audit-view-usage.mjs` on local)

```json
{
  "total": 43,
  "unused": [],
  "sqlOnly": [
    "v_cssd_bo_dung_cu_bien_dong",
    "v_gstt_dashboard_bundle_rate_v3",
    "v_gstt_dashboard_nhsn_denominator_v3",
    "v_gstt_gsc_dashboard_rows",
    "v_gstt_vst_hotpath",
    "v_sys_audit_log_full",
    "v_sys_audit_table_choices"
  ],
  "counts": { "unused": 0, "sqlOnly": 7, "both": 36, "srcOnly": 0 }
}
```

Staging (linked): **43** public views grouped — `v_*` 25, `mdm_*` 7, `gstt_*` 4, `cssd_*` 3, `nkbv_*` 2, `qlcv_*` 2.

## Local table prefix counts (degraded DB)

`cssd` 16, `gstt` 9, `sys` 9, `nkbv` 6, `qlcv` 3, `mdm` 2 — **not** full pilot schema.
