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
| Unused exports | Residual (G-12 boy-scout ongoing) |
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

- [gap-register-20260709.md](./gap-register-20260709.md)
- [comprehensive-review-20260709.md](./comprehensive-review-20260709.md)
