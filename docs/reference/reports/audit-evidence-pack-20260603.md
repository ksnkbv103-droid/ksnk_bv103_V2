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
