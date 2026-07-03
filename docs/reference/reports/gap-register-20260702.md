# Gap register — Wave 0–4 cleanup (2026-07-02)

> Rà soát dọn rác 4 wave theo intake PO. Tiếp nối [gap-register-20260701.md](./gap-register-20260701.md).

## Automated gates (local — 2026-07-02)

| Gate | Kết quả |
|------|---------|
| `npm run verify` | **PASS** |
| `npm run pilot:go-live:gate:local` | **PASS** |
| `npm run repo:hygiene` | **PASS** |
| `npm run ssot:db:guard:local` | **PASS** (`legacy_compat_views_ok: true`) |
| `npm run trial:audit:probe:local` | **PASS** (0 audit trigger orphan) |
| `npm run audit:legacy-rpc` | **PASS** (0 RPC không ref) |
| `npm run cssd:db:audit:local` | **PASS** |
| `npm run gstt:db:audit:local` | **PASS** |
| `npm run panel:chrome-check` | **PASS** |
| `npm run layout:drift-check` | **PASS** (0 blocking) |
| `npm run lint:cssd-architecture` | **PASS** (bounded-context import fix) |

## DB snapshot

| Metric | Giá trị |
|--------|---------|
| Migration files (repo) | 87 (head `20260702100000`) |
| View audit (`audit-view-usage`) | 0 unused · 15 sql-only (dashboard/RPC hotpath — **giữ**) |
| Seed RBAC | `config.toml` → `00-rbac.sql` + `01-pilot-nhan-su.sql` |

---

## Wave 0 — Baseline refresh

| ID | Trạng thái | Ghi chú |
|----|------------|---------|
| W0-01 | **Done** | Full gate snapshot trên local |
| W0-02 | **Done** | Gap register này |

---

## Wave 1 — Nav / doc / traceability

| ID | P | Mô tả | Trạng thái | Evidence |
|----|---|-------|------------|----------|
| W1-01 | P2 | Route `/giam-sat-chung/*` sub-tab không trong sidebar | **By design** | `gsc-app-paths.ts` — tab nội bộ GSC |
| W1-02 | P2 | Route compat `/cssd-erp/batch`, `/cssd-erp/report` | **By design** | Redirect + backward compat trong `next.config.ts` |
| W1-03 | P2 | Doc mapping vẫn nhắc tên compat lịch sử | **Accepted** | Changelog DEPRECATED block — guard pass |
| W1-04 | P2 | Traceability matrix lỗi thời (DigitalChecklistPanel, ledger warning) | **Done** | [traceability-matrix-20260702.md](./traceability-matrix-20260702.md) |

**Kết luận Wave 1:** Không route chết blocking; sidebar ↔ gate khớp (G-14/15 done wave trước).

---

## Wave 2 — DB / RPC / seed

| ID | P | Mô tả | Trạng thái | Ghi chú |
|----|---|-------|------------|---------|
| W2-01 | P1 | View sql-only orphan | **Done — không DROP** | 15 view phục vụ RPC/dashboard; catalog trong audit-view-usage |
| W2-02 | P3 | GSTT RLS permissive duplicate policies | **Deferred** | App dùng admin client; cần migration riêng + UAT quyền — slice S-RLS-01 |
| W2-03 | P1 | Seed RBAC local sau `db reset` | **Configured** | `supabase/seeds/00-rbac.sql`; D-04 exit — cần tay `db reset` trước pilot mới |
| W2-04 | P1 | Orphan RPC dashboard/BK | **Done** (prior) | `20260701100000` |

---

## Wave 3 — Code / UI rác theo module

| ID | P | Module | Mô tả | Trạng thái |
|----|---|--------|-------|------------|
| W3-01 | P1 | CSSD | Import vượt bounded-context (`cssd-su-co` → action trực tiếp) | **Done** — `inventory-instrument/entrypoint` |
| W3-02 | P2 | CSSD | Typography drift 9–10px | **Done** — CompositionReconcilePanel, thiet-bi-print-qr |
| W3-03 | P2 | MDM | Dead `saveBoAllocationAction` | **Done** — removed |
| W3-04 | P2 | MDM | Unused `NHOM_GOI_Y`, `listMasterRows` imports | **Done** |
| W3-05 | P2 | MDM | Typography thiet-bi-form-modal | **Done** |
| W3-06 | P2 | All | unused-var lint (~100 warn) | **Ongoing** | Boy-scout per slice (G-12) |
| W3-07 | P3 | NKBV | Clinical UAT sign-off | **Pending PO** | G-10 |
| W3-08 | P1 | CSSD sự cố | Build type errors (orphan `setCauseClassCode`, `data.typeId`) | **Done** | su-co-report + SuCoReportForm |

---

## Wave 4 — Nghiệm thu

| Rubric | Trước (30/06) | Sau (02/07) |
|--------|---------------|-------------|
| Domain/DB avg | 4.1 | **4.1** (giữ) |
| UI coherence | 4.0 | **4.2** (layout drift 0, typography slice) |
| Backend contract | PASS | **PASS** |
| P0/P1 mở | 0 | **0** |

| Hạng mục | Trạng thái |
|----------|------------|
| Automated ship gate | **PASS** |
| PO checklist §B sign-off | **Pending** — cần ký tay từng khối pilot |
| Linked staging parity | Verify khi token Supabase linked OK |

---

## P0/P1 mở: **0**

## Backlog P2/P3 còn lại

| ID | P | Slice đề xuất |
|----|---|---------------|
| G-12 | P2 | Boy-scout unused-var từng module |
| G-11 / W2-02 | P3 | S-RLS-01 GSTT RLS hardening |
| G-10 / W3-07 | P3 | S-NKBV-UAT clinical sign-off |

---

## Remediation code (wave này)

1. `inventory-instrument/entrypoint.ts` — export composition reconcile cho cssd-su-co
2. `InstrumentIncidentFields.tsx` — import qua entrypoint (lint:cssd-architecture pass)
3. Xóa dead code: `saveBoAllocationAction`, `NHOM_GOI_Y`, unused imports hoa-chat/thiet-bi actions
4. Typography 11px: CompositionReconcilePanel, thiet-bi-print-qr-button, thiet-bi-form-modal
5. Fix build: `su-co-report.application.ts` typeId; xóa orphan `setCauseClassCode` trong SuCoReportForm
