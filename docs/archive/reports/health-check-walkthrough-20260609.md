# Health Check Walkthrough — KSNK BV103

> **Ngày:** 2026-06-09  
> **Phương pháp:** Bottom-up (DB → Types → Frontend → UX), delta trên báo cáo [comprehensive-review-20260603.md](./comprehensive-review-20260603.md)  
> **Evidence:** [audit-evidence-pack-20260609.md](./audit-evidence-pack-20260609.md)

---

## 1. Executive summary

Hệ thống KSNK BV103 sau tái cấu trúc **function-based** (`/thong-ke`, `/lich-su`, Form/Analytics/History views tách riêng) vẫn **đồng bộ tốt** ở tầng engineering gates và RPC contract. Linked staging đã apply đủ **57 migrations**; summary path D-07 xác nhận là **live views**, không còn bảng pre-aggregation vật lý.

**Điểm cần theo dõi:** VST strategic RPC ~418ms trên staging (vượt ngưỡng 500ms p95 mục tiêu nhưng gần biên); local Supabase không chạy nên dev loop phụ thuộc linked.

### Rubric (1–5)

| Dimension | Điểm | Ghi chú |
|-----------|------|---------|
| Domain accuracy | **4** | Scoring engine 17/17 tests; 0 NULL `cach_tinh_diem`; khu vực 22 rows |
| Structural clarity | **3.5** | Route restructure rõ; dual entry GSC per-loai `/thong-ke` |
| DB discipline | **4** | Linked = repo head; summary = views; no orphan sync triggers |
| UI coherence | **3.5** | Layout/typography gates pass; deep links đã canonical |
| Operability | **2.5** | Local DB down; repo:hygiene SQL allowlist gaps |

---

## 2. Findings

| ID | Sev | Layer | Finding | Evidence |
|----|-----|-------|---------|----------|
| HC-01 | P1 | Ops | Local Supabase không chạy — không audit local EXPLAIN/size | `mdm:migrate:local` connection refused |
| HC-02 | P1 | Perf | VST strategic RPC **418ms** linked (GSC 59ms) | `pilot:dashboard:explain:linked` |
| HC-03 | P2 | Doc | Pre-aggregation dictionary mô tả trigger tables đã DROP | Marked STALE 2026-06-09 |
| HC-04 | P2 | Hygiene | 9 SQL scripts ngoài SQL_ACTIVE allowlist | `repo:hygiene` |
| HC-05 | P2 | Security | GSTT facts RLS permissive `USING(true)` — design intent, app-layer gate | Baseline policies; 174 `verifyPermission` |
| HC-06 | P2 | UX | Dual analytics entry: `/thong-ke/gsc` vs `/giam-sat-chung/*/thong-ke` | Intentional per-loai filter |
| HC-07 | P3 | Types | 1× `as any` trong GSC session detail read | `giam-sat-chung-session-detail.actions.ts:49` |
| HC-08 | P3 | RPC | 2 admin RPC không có src ref | `audit:legacy-rpc` (DM suffix, reorder) |

### Resolved during audit (cleanup)

| ID | Fix |
|----|-----|
| HC-R1 | Stale `?tab=analytics` links → `/thong-ke/{vst,gsc}` |
| HC-R2 | `buildAnalyticsDeepLink` maps module paths to canonical routes |
| HC-R3 | VST `?tab=history|analytics` → server `redirect()` |
| HC-R4 | VST post-save → `/lich-su/vst` |
| HC-R5 | RPC contract extended (+ compare matrices) |
| HC-R6 | Traceability matrix rows 4, 24 updated |

---

## 3. Điểm mạnh (đồng nhất & hoạt động tốt)

1. **RPC-only dashboard path** — 6 app-facing RPCs smoke PASS; legacy dashboard RPCs DROP confirmed.
2. **Summary live views** — 5 `gstt_fact_*_summary` objects are views post D-07; no sync triggers to dropped tables.
3. **Scoring 3-layer alignment** — Pure engine (`giam-sat-scoring.ts`), write actions, RPC read path; 0 NULL `cach_tinh_diem` on active DM.
4. **Permission discipline** — All GSC/VST actions use `verifyPermission`; dashboard filter uses `verifyCommandCenterShell`.
5. **Engineering gates** — `verify:engineering`, `legacy:guard`, `test:pilot` (19 tests) PASS.
6. **Khu vực registry** — 22 lookup rows with TR/DO/VA/XA grouping; `khoa_phong_allowed_khu_vucs` migrations in chain.
7. **Route restructure** — `next.config.ts` redirects legacy paths; Sidebar gates `NAV_GATE_THONG_KE` / `NAV_GATE_LICH_SU`.

---

## 4. Bottlenecks & blindspots

- **Local dev gap:** Không đại diện cho production schema latency/size khi local DB tắt.
- **VST analytics hot path:** Buffer hit 97k+ — cần re-benchmark sau volume spike hoặc index review.
- **End-to-end golden sessions:** Chưa có automated E2E Form→Dashboard trong CI (manual pilot checklist only).
- **GSC cluster fan-out:** `useGscAnalyticsData` tối đa 12 RPC — latency budget chưa đo trên staging.

---

## 5. Data flow verification (Form → DB → Dashboard)

### GSC

```
GscFormView → saveGiamSatChung → gstt_fact_chung_sessions
  → gstt_fact_gsc_*_summary (views)
  → rpc_dashboard_gsc_strategic_analytics + rpc_gsc_compare_matrices
  → useGscAnalyticsData → GscStrategicAnalyticsPanel (/thong-ke/gsc)
```

### VST

```
VSTFormView → saveVSTSession → gstt_fact_vst_sessions + gstt_fact_vst
  → gstt_fact_vst_*_summary (views)
  → rpc_dashboard_vst_strategic_analytics + rpc_vst_compare_matrices
  → useVstAnalyticsData → VstStrategicAnalyticsPanel (/thong-ke/vst)
```

### Command Center

```
useCommandCenterBriefData → Promise.all(VST+GSC+QLCV) + lazy staff stats
  → buildAnalyticsDeepLink → /thong-ke/{vst,gsc}?tu_ngay=...
```

**Permission matrix (supervision actions):** 100% server-side `verifyPermission` trước DB/RPC trong `giam-sat-chung/actions/*` và `giam-sat-vst/actions/*`.

---

## 6. Manual pilot scenarios (documented)

| # | Scenario | Route | Expected |
|---|----------|-------|----------|
| P1 | Tạo GSC session, preview điểm | `/giam-sat-chung` | Điểm khớp `cach_tinh_diem` engine |
| P2 | Xem GSC analytics | `/thong-ke/gsc` | KPI load, filters từ URL seed |
| P3 | Tạo VST session | `/giam-sat-vst` | WHO moments lưu vào fact |
| P4 | VST analytics | `/thong-ke/vst` | % tuân thủ khớp session |
| P5 | Command Center brief | `/` | VST+GSC parallel load |
| P6 | Deep link legacy | `/giam-sat-vst?tab=analytics` | Redirect `/thong-ke/vst` |
| P7 | Post-save VST | Form success | Navigate `/lich-su/vst` |

---

## 7. Action Items (chờ phê duyệt)

| ID | Mô tả | Phase | Effort | Verify | Cleanup |
|----|-------|-------|--------|--------|---------|
| AI-01 | ~~Local onboarding~~ **Done** — Docker prerequisite + bootstrap trong `operations-sop.md` §2.1.1 (Docker down tại audit time) | 0 | S | `verify:mdm:local` khi Docker up | N |
| AI-02 | ~~Investigate VST RPC 418ms~~ **Done** — [vst-rpc-perf-investigation-20260609.md](./vst-rpc-perf-investigation-20260609.md); refactor RPC = follow-up | 1 | M | `pilot:dashboard:explain:linked` | N |
| AI-03 | ~~Thêm `gstt:db:audit` script~~ **Done** — `npm run gstt:db:audit` | 1 | S | npm script | Y |
| AI-04 | ~~SQL_ACTIVE allowlist~~ **Done** — all `scripts/sql/*.sql` catalogued | 2 | S | `repo:hygiene` | Y |
| AI-05 | ~~Type `results_jsonb`~~ **Done** — `gsc-results-jsonb.ts` + spec | 2 | S | `verify:engineering` | Y |
| AI-06 | ~~Playwright E2E~~ **Done** — `e2e/gsc-vst-supervision.spec.ts` (canonical routes + legacy redirect) | 3 | M | `test:e2e` | N |
| AI-07 | ~~Document dual GSC analytics~~ **Done** — `docs/modules/giam-sat/README.md` § Route structure | 4 | S | `docs:links:check` | N |
| AI-08 | ~~GSC main page `?tab=` redirect~~ **Done** (parity with VST) | 4 | S | manual | Y |
| AI-09 | ~~Re-benchmark dashboard RPCs~~ **Done** 2026-06-09 — evidence pack + perf investigation doc | 1 | S | evidence pack | N |

### Follow-up (post action items)

| ID | Mô tả | Status |
|----|-------|--------|
| AI-F1 | Refactor `rpc_dashboard_vst_strategic_analytics` — CTE MATERIALIZED | **Done** — 418ms → 306ms linked |
| AI-F2 | `verify:mdm:local` | **Blocked** — Docker Desktop not running on audit machine |

## 8. Cleanup log

| File / change | Reason | Rollback |
|---------------|--------|----------|
| `bao-cao-tong-hop-core.ts` | Canonical deep link routes | `git checkout --` path |
| `VstStrategicAnalyticsPanel.tsx` | Stale analytics href | revert |
| `GscStrategicAnalyticsPanel.tsx` | Stale analytics href | revert |
| `ComprehensiveTopicHybrid.tsx` | Stale fallback href | revert |
| `VSTFormView.tsx` | Canonical history nav | revert |
| `giam-sat-vst/page.tsx` | Tab redirect | revert |
| `rpc-contract-dashboard.spec.ts` | +2 compare RPCs | revert |
| `gsc-form-template-sync.ts` | Comment orphan page name | revert |
| `khoa-phong-form-modal.tsx` | Typography drift | revert |
| `dashboard-pre-aggregation-dictionary.md` | STALE banner | revert |
| `gsc-results-jsonb.ts` | Typed parse for `results_jsonb` (AI-05) | revert |
| `e2e/gsc-vst-supervision.spec.ts` | Canonical route E2E (AI-06) | revert |

**Deleted pages (pre-audit, no orphan imports):** `GiamSatChungPage.tsx`, `VSTPage.tsx`, `giam-sat-vst/lich-su/page.tsx` — confirmed 0 references in `src/`.

---

## 9. Appendix

### A. App dashboard RPC inventory

1. `rpc_dashboard_gsc_strategic_analytics`
2. `rpc_gsc_compare_matrices`
3. `rpc_dashboard_vst_strategic_analytics`
4. `rpc_vst_compare_matrices`
5. `rpc_get_compliance_dashboard_v4`
6. `rpc_get_dashboard_ksnk_staff_supervision_stats`

### B. Scoring algorithms (SSOT)

| `cach_tinh_diem` | Output |
|------------------|--------|
| TY_LE | `ty_le_percent` 0..100 |
| TRON_GOI | `dat_tron_goi` boolean |
| DAT_KHONG_DAT | `ket_qua_pass_fail` |
| NHAT_KY | `so_oor`, no rate |

Spec: [bang-kiem-overview.md](../../modules/giam-sat/bang-kiem-overview.md), engine: `src/lib/domain/giam-sat-scoring.ts`.

### C. Verify checklist (DoD)

- [x] Linked `mdm:migrate` up to date
- [x] `verify:mdm`, `smoke:gsc-vst`, `trial:db:precheck` PASS
- [x] `verify:engineering`, `test:pilot`, layout gates PASS
- [x] Deep links canonical; no `?tab=analytics` in `src/`
- [x] Evidence pack + walkthrough published
- [x] Local DB sync documented (Docker prerequisite — run `verify:mdm:local` when up)
- [x] E2E spec updated (`e2e/gsc-vst-supervision.spec.ts`)

---

*Báo cáo này là artifact Health Check 2026-06-09. Không thay SSOT specs trong `docs/core/`.*
