# Phase 2 — Dashboard (2026-06-10)

> Tiếp theo [domain-audit-phase1-20260610.md](./domain-audit-phase1-20260610.md)

## Đã triển khai

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| 2.1 | VST RPC perf linked **327ms → 91ms** | **Done** | `20260610060000_vst_strategic_rpc_fact_inline.sql` |
| 2.2 | GSC fan-out benchmark script | **Done** | `scripts/sql/pilot-dashboard-explain/05-gsc-fanout-sim.sql` |
| 2.3 | E2E analytics stability + form shell | **Done** | `e2e/gsc-vst-supervision.spec.ts` (+2 tests) |
| 2.4 | Archive STALE pre-aggregation doc | **Done** | → `docs/archive/reports/` + stub pointer |

### RPC latency (linked, 3-month window, post-migrate)

| RPC | Before (06-10 AM) | After |
|-----|-------------------|-------|
| `rpc_dashboard_vst_strategic_analytics` | **327 ms** | **91 ms** ✓ (<250ms) |
| `rpc_dashboard_gsc_strategic_analytics` | 59 ms | **65 ms** |
| `rpc_get_compliance_dashboard_v4` | 8 ms | **8 ms** |

### GSC fan-out (local `05-gsc-fanout-sim.sql`)

| Call | ms |
|------|-----|
| Aggregate | 6.2 |
| Cluster 1–3 (each) | 1.9–2.4 |

> Worst-case UI: 1 aggregate + 12 checklist RPC ≈ **65 + 12×65 ≈ 845ms** linked (upper bound nếu mỗi cluster full scan). Cần lazy-load clusters nếu UX chậm — backlog Phase 3 UX.

> **Linked fan-out probe:** `05-gsc-fanout-sim.sql --linked` fail 2026-06-10 (Supabase CLI SASL auth / circuit breaker). Chạy lại sau khi refresh token hoặc hết cooldown pooler.

### Kỹ thuật migration 2.1

- Scan trực tiếp `gstt_fact_vst_sessions` + `gstt_fact_vst` thay vì live summary views.
- `fn_get_session_stype` **1 lần / phiên** (không / cơ hội).
- Gộp `opp_workload` + `sessions_workload` vào `session_base` / `opp_window`.

### Verify

```bash
npm run mdm:migrate          # linked
npm run pilot:dashboard:explain:linked
npm run smoke:gsc-vst
npm run test:pilot
npm run verify:engineering
```

Tất cả **PASS** (2026-06-10).

---

## Phase 3 đề xuất — CSSD domain (tuần 6–8)

| # | Việc | Priority |
|---|------|----------|
| 3.1 | Spaulding/heat domain engine (`cssd-packaging-rules.ts`) | P1 |
| 3.2 | Remove ledger legacy bypass branch | P1 |
| 3.3 | CSSD E2E workflow T4→T6 + pilot checklist extended | P1 |
| 3.4 | GSC analytics lazy-load clusters (nếu fan-out >500ms UX) | P2 |
| 3.5 | Cycle QR P3 slice | P3 |

**Exit CSSD Phase 3:** pilot checklist CSSD ≥5/6 PASS; Digital BOM regression.

---

## Phase 4 đề xuất — Hóa chất / thiết bị (tuần 9–10)

| # | Việc |
|---|------|
| 4.1 | Pilot checklist `/cssd-hoa-chat`, `/cssd-thiet-bi` |
| 4.2 | BRD vật tư phi-hóa-chất (intake trước code) |
| 4.3 | Layout primitive unify CSSD report pages |

---

## Blocker go-live (không đổi)

1. Pilot checklist tay (MDM/GSC/VST/QLCV)
2. Workshop W1–W8 NV KSNK
3. `mdm_email_no_auth` = 0 cho user pilot

---

## Lệnh tái lập Phase 2 audit

```bash
npm run pilot:dashboard:explain:linked
node scripts/run-supabase-sql.mjs --linked --file scripts/sql/pilot-dashboard-explain/05-gsc-fanout-sim.sql
```
