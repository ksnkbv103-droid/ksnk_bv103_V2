# Audit evidence pack — 2026-07-09

> **Phạm vi:** Wave 0 baseline — chương trình rà soát toàn diện BV103 (1B + 2A)  
> **Repo head:** `1c8e057` · **92** migrations (head `20260704120000`)  
> **Môi trường đo:** Gate tĩnh trên workspace; **Docker/Supabase local bị chặn** (permission denied `docker.sock` + Supabase CLI EPERM telemetry) → probe DB live = **Blocked**

---

## Automated gates

| Gate | Kết quả | Ghi chú |
|------|---------|---------|
| `npm run verify:engineering` | **PASS** | baseline 142 action files · 146 `verifyPermission` · 0 unbounded fact reads · contract + legacy guards |
| `npm run audit:legacy-rpc` | **PASS** | 16 active RPC · 0 không ref trong `src/` |
| `npm run audit:views` | **PASS** | 54 views · **0 unused** · **16 sql-only** (giữ) |
| `npm run dead-code:scan` | **WARN** | 5 unused files · 133 unused exports (exit 1 warn; không fail CI trừ `DEAD_CODE_STRICT=1`) |
| `npm run repo:hygiene` | **PASS** | 0 blocking |
| `npm run layout:typography-check` | **PASS** | 0 `text-[8px]`/`text-[9px]` ngoài allowlist |
| `npm run layout:drift-check` | **FAIL (2 adoption)** | `QrCameraModal.tsx`, `IncidentReportModal.tsx` thiếu `*-form-chrome` / `bv103-panel-chrome` |
| `npm run verify:cssd` | **PASS** | 49/49 tests |
| `npm run test:pilot` | **PASS** | 24/24 tests |
| `npm run imports:cssd-mdm` | **PASS** | |
| `npm run legacy:guard` | **PASS** | |
| `npm run local:golden:verify` | **BLOCKED** | Docker sock permission denied · Supabase CLI EPERM `~/.supabase/telemetry.json` |
| `npm run pilot:go-live:gate:local` | **BLOCKED** | phụ thuộc Docker/local DB (không chạy được trong session này) |

---

## Engineering baseline (scan)

| Metric | Giá trị |
|--------|---------|
| Action files (baseline scan) | 142 |
| `verifyPermission()` calls | 146 |
| `.rpc()` in actions | 21 |
| Potential full fact reads | 0 |
| App routes (`page.tsx`) | 41 |
| Migration files (repo) | 92 |
| CSSD domain tests | 49 pass |
| Pilot contract tests | 24 pass |

---

## Dead-code inventory (Fallow)

| File | Ghi chú |
|------|---------|
| `src/modules/dashboard/components/QlcvCommandCenterCard.tsx` | Pilot W3 latent — true orphan |
| `src/modules/dashboard/hooks/use-dashboard-export-report.ts` | Pilot W3 latent |
| `src/modules/dashboard/lib/dashboard-print-template.ts` | Pilot W3 latent |
| `src/modules/quan-ly-cong-viec/actions/dashboard.actions.ts` | Chỉ consumer = card W3; live CC dùng `qlcv-brief.actions` |
| `src/modules/quan-ly-cong-viec/lib/qlcv-list-scope-server.ts` | Chỉ consumer = dashboard.actions W3 |

Whitelist by design: `src/modules/cssd-erp/actions/cssd.actions.ts`.

---

## sqlOnly views (16 — KEEP trừ 2 review)

`fact_gsc_violations_summary`, `fact_vst_moments_summary`, `fact_vst_opportunities_summary`, `fact_vst_sessions_summary`, `gstt_dm_tieu_chi_bang_kiem`, `gstt_fact_gsc_violations_summary`, `gstt_fact_vst_moments_summary`, `gstt_fact_vst_opportunities_summary`, `gstt_fact_vst_sessions_summary`, `v_auth_user_permissions`, `v_cssd_bo_dung_cu_bien_dong`, `v_gstt_bang_kiem_full`, `v_gstt_dashboard_bundle_rate_v3`, `v_gstt_dashboard_nhsn_denominator_v3`, `v_gstt_gsc_dashboard_rows`, `v_gstt_vst_hotpath`.

**CANDIDATE_REVIEW:** `v_auth_user_permissions`, `v_gstt_bang_kiem_full`.

---

## Cannot-verify (mở khóa Docker)

1. `local:golden:verify` (11 probes) + `pilot:go-live:gate:local`
2. `pg_policies` live sau migrate head
3. Smoke JWT GSC/VST RPC (`smoke:gsc-vst:local`)
4. `trial:auth:precheck:local` / `trial:db:precheck:local`
5. `EXPLAIN` dashboard RPC trên DB có dữ liệu
6. Migration parity staging vs repo

**Cách mở khóa:** cấp quyền Docker Desktop cho agent/terminal; hoặc PO chạy tay các lệnh trên và dán kết quả vào gap register.

---

## Liên kết

- Báo cáo tổng: [comprehensive-review-20260709.md](./comprehensive-review-20260709.md)
- Gap register: [gap-register-20260709.md](./gap-register-20260709.md)
- Baseline trước: [gap-register-20260703.md](./gap-register-20260703.md)
