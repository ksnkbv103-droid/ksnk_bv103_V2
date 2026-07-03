# Gap register — Cải tổ pilot toàn diện (2026-07-03)

> Baseline trước Wave 0–5 chương trình cải tổ local (7 khối pilot). Tiếp nối [gap-register-20260702.md](./gap-register-20260702.md).

## Automated gates (local — 2026-07-03)

| Gate | Kết quả |
|------|---------|
| `npm run pilot:go-live:gate:local` | **PASS** |
| `npm run audit:legacy-rpc` | **PASS** (0 RPC không ref) |
| `node scripts/audit-view-usage.mjs` | **PASS** (0 unused · 15 sql-only — **giữ**) |
| `npm run repo:hygiene` | **PASS** (rbac-registry-parity-probe allowlist fixed) |

## DB snapshot

| Metric | Giá trị |
|--------|---------|
| Migration files (repo) | 87 (head `20260702100000`) |
| View audit | 0 unused · 15 sql-only |
| Auth pilot | `mdm_email_no_auth` = 0 (1 user local) |

---

## Chương trình cải tổ — trạng thái wave

| Wave | Mô tả | Trạng thái |
|------|-------|------------|
| W0 | Baseline refresh + gap register | **Done** |
| W1 | Local golden (`local:golden:verify`) + SOP reset | **Done** |
| W2 | Fallow dead-code + CI hygiene | **Done** |
| W3 | Nghiệm thu 7 khối pilot (automated gates) | **Done** — [pilot-module-automated-gates-20260703.md](./pilot-module-automated-gates-20260703.md) |
| W4 | Perf/doc ongoing | **Deferred** |
| W5 | Sign-off §B automated | **Done** — checklist tay ☐ PO |

---

## P0/P1 mở: **0**

## Backlog P2/P3 (giữ từ 02/07)

| ID | P | Slice |
|----|---|-------|
| G-12 | P2 | Boy-scout unused-var |
| G-11 / W2-02 | P3 | S-RLS-01 GSTT RLS |
| G-10 / W3-07 | P3 | NKBV clinical UAT (PO tay) |

---

## Deliverables wave này

1. `scripts/local-golden-verify.mjs` + `npm run local:golden:verify`
2. `scripts/dead-code-scan.mjs` + `npm run dead-code:scan`
3. `operations-sop.md` §2.1.2 — quy trình db reset local
4. CI: `repo:hygiene`, `layout:typography-check`, `dead-code:scan` (warn)
5. [pilot-module-automated-gates-20260703.md](./pilot-module-automated-gates-20260703.md)
