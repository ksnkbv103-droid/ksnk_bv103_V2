# VST strategic RPC — performance investigation (2026-06-09)

> **Trigger:** Health Check HC-02 — `rpc_dashboard_vst_strategic_analytics` **418 ms** on linked staging (3-month default window).  
> **Compare:** GSC strategic **59 ms**, compliance v4 **9 ms** (same run).

## Method

```bash
npm run pilot:dashboard:explain:linked
npm run gstt:db:audit
```

Linked EXPLAIN (2026-06-09): VST RPC buffers **shared hit=97677**; GSC **8209**.

## Root cause (ground-truth)

1. **Live summary views (D-07):** `gstt_fact_vst_opportunities_summary` and `gstt_fact_vst_moments_summary` are **views** joining `gstt_fact_vst` ↔ `gstt_fact_vst_sessions`. Physical summary tables and their indexes (`idx_vst_opp_sum_filters`, etc.) were dropped in `20260604100000`; views recreated in `20260604140000` without equivalent covering indexes on the view itself.

2. **RPC multi-scan:** `rpc_dashboard_vst_strategic_analytics` runs **8+ separate aggregations** over the same opportunity/moment summary sources (KPIs, trend, 3 matrices, moments, gap, workload). Each subquery re-evaluates the live view.

3. **Per-row cost in views:**
   - `fn_get_session_stype(nguoi_giam_sat_id, khoa_id)` on every row
   - `regexp_split_to_table` for WHO moments in `gstt_fact_vst_moments_summary`

4. **Staging volume:** Higher row count vs local ~4 ms benchmark (2026-06-03) explains latency gap; not necessarily a regression.

## Existing indexes (fact layer — adequate)

- `gstt_fact_vst_sessions`: `brin_vst_sessions_ngay_giam_sat`, `idx_vst_sessions_ngay_khoa_active`, `idx_vst_sessions_perf_filter`
- `gstt_fact_vst`: `idx_giam_sat_vst_session_id`, `idx_fact_vst_obs_khoa_id`, …

Adding redundant btree on `(ngay_giam_sat)` unlikely to help beyond existing BRIN/btree combo.

## Status (2026-06-09 follow-up — **Done**)

Migration `20260609060000` + hotfix `20260609061000` (module SSOT table names).

| Metric | Before | After CTE |
|--------|--------|-----------|
| Execution time (linked, 3-month window) | **418 ms** | **306 ms** (~27%) |
| Buffer shared hit | 97,677 | 61,789 |

`npm run smoke:gsc-vst` PASS post-migrate.

**Remaining gap:** Target <150 ms not reached — live view + `fn_get_session_stype` / moment split still dominate. Further win requires RPC statement refactor or volume-specific tuning (not new summary tables without approval).

## Recommendations

| Priority | Action | Effort | Notes |
|----------|--------|--------|-------|
| P1 | Refactor RPC: single `WITH filtered AS (...)` CTE, reuse for all JSON aggregates | M | **Done** — `20260609060000` + `20260609061000` |
| P2 | Monitor p95 on linked quarterly (`AI-09`) | S | Re-run `pilot:dashboard:explain:linked` |
| P3 | If p95 > 500 ms sustained: discuss materialized view or statement-level optimization with volume proof | L | Requires user tradeoff approval per D-07 ADR |

**Not recommended now:** New physical summary table without measured CPU/latency proof (AGENTS.md pre-aggregation gate).

## Verify after RPC refactor

```bash
npm run pilot:dashboard:explain:linked
npm run smoke:gsc-vst
npm run verify:engineering
```

Target: VST strategic < 150 ms on staging default window (aspirational; validate with data).
