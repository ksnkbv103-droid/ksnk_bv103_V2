# Phase 1 — Pilot core hardening (2026-06-10)

> Tiếp theo [domain-audit-phase0-20260610.md](./domain-audit-phase0-20260610.md)

## Đã triển khai (code)

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| G-03 | UX dual analytics — banner phạm vi chuyên đề | **Done** | `GscAnalyticsScopeBanner.tsx`, `GscAnalyticsView.tsx` |
| G-08 | Doc module lock GSC/VST | **Done** | [`docs/modules/giam-sat/module-lock.md`](../../modules/giam-sat/module-lock.md) |
| 1.1 | Khu vực filter regression (unit) | **Done** | `filterKhuVucsForKhoa` + `khu-vuc-giam-sat-ui.spec.ts` (4 tests) |
| G-02 | E2E per-loai banner | **Done** | `e2e/gsc-vst-supervision.spec.ts` (+1 test) |
| G-04 | Server auth | **Already done** | `src/proxy.ts` (Next.js 16 — `getUser()` server-side) |

### Verify sau slice

```text
vitest khu-vuc-giam-sat-ui.spec.ts — 4/4 PASS
verify:engineering — PASS
```

## Còn lại (manual / blocker go-live)

| ID | Việc | Owner |
|----|------|-------|
| G-05 | Pilot checklist ký tay MDM + GSC/VST + QLCV | Tester staging |
| 0c | Workshop W1–W8 NV KSNK | Facilitator |
| G-09 | Link Auth 8 nhân sự `mdm_email_no_auth` | Admin |
| G3 | Khóa module GSC — tay theo [`module-lock.md`](../../modules/giam-sat/module-lock.md) | Tester |

## E2E chạy local/CI

```bash
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npm run test:e2e -- e2e/gsc-vst-supervision.spec.ts
```

## Exit criteria Phase 1

- [ ] ≥5/6 pilot checklist mỗi module PASS (manual)
- [x] G-03, G-08, khu vực unit test, E2E spec extended
- [ ] Workshop 8/8 (hoặc ghi nhận exception có lý do)
- [ ] `mdm_email_no_auth` = 0 cho user pilot

---

## Phase 2 đề xuất (Dashboard — tuần 4–5)

| # | Việc | Priority | Effort |
|---|------|----------|--------|
| 2.1 | VST RPC perf: index/EXPLAIN → <250ms p95 linked | P1 | M |
| 2.2 | Đo latency GSC 12-RPC fan-out trên staging | P2 | S |
| 2.3 | E2E golden: form save → reload → KPI dashboard delta | P1 | M |
| 2.4 | Archive STALE `dashboard-pre-aggregation-dictionary.md` | P2 | S |
| 2.5 | Clinical validate CCS formula (workshop W2) | P1 | S (human) |

**Lệnh bắt đầu Phase 2:**

```bash
npm run pilot:dashboard:explain:linked
npm run gstt:db:audit
```

## Phase 3 đề xuất (CSSD — tuần 6–8)

Theo [`docs/modules/cssd/reform-plan.md`](../../modules/cssd/reform-plan.md):

1. Spaulding/heat domain engine (B2)
2. Remove ledger legacy bypass (B6)
3. CSSD E2E T4→T6 + pilot checklist extended

## Phase 4 đề xuất (Hóa chất / thiết bị — tuần 9–10)

1. Pilot checklist `cssd-hoa-chat`, `cssd-thiet-bi`
2. BRD vật tư phi-hóa-chất trước khi code module mới

## Khuyến nghị thứ tự ngay

1. **Admin:** link Auth pilot users (G-09) — 30 phút
2. **Tester:** pilot checklist §2 phase0 doc — 2–3h
3. **Dev (Phase 2):** VST RPC perf khi có volume baseline mới
