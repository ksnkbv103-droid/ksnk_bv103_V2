# Soft next — GSC/TGS H2 leftover thin FE — 2026-09-27

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-27 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip trước | `50f7a76` (CSSD report/print station SSOT) · ahead 46 |
| Phạm vi | FE-only · H2 (2026-09-17) leftover: breadcrumb/RBAC copy + orphan QLCV brief + SSOT docs |
| Không | push / PR / Cloud / Vercel / migrate / DROP / dirty WT / W4 / W6 |

Lock: [`BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md`](../../plans/202609/BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md) · [`ux/principles.md`](../../../ux/principles.md).

---

## 1. Survey → pick

CSSD Soft Soft-queue empty (except W4/W6). Prefer GSC/TGS vs locked H2.

| H2 requirement | Tip evidence | Gap? |
|----------------|--------------|------|
| `/` → `/bao-cao-tong-hop` | `src/app/page.tsx` redirect | **OK** |
| Nav: one door Báo cáo chính thức; no Tổng quan / Việc hôm nay | `sidebar-nav-groups.ts` only BCTH under Điều hành | **OK** |
| Công việc = sidebar riêng | `SIDEBAR_NAV_GROUPS` internal | **OK** |
| Brief CC không QLCV | `qlcv-brief.actions.ts` **0 callers**, file còn sống | **LEFTOVER** |
| TGS không deep-link Công việc | GSC/VST analytics: text only, no `quan-ly-cong-viec` href | **OK** |
| Breadcrumb `/` one door | `app-shell-scope` still «Tổng quan KSNK» | **LEFTOVER** |
| RBAC copy / wiki / README / metric-dict | still «Tổng quan» / «Command Center» / decision-queue rows | **LEFTOVER** (copy/SSOT) |

| Candidate | Soft-feasible P0/P1 FE? | Verdict |
|-----------|-------------------------|---------|
| **A — thin H2 leftover** | **Y** — breadcrumb + RBAC display/desc + delete orphan brief + SSOT docs | **PICK** |
| B — invent new IA | N — H2 already locked | skip |
| VST / giám sát BM thin | No clear P0/P1 after survey (hub OK; analytics H2-compliant) | skip this beat |

**Module chosen:** GSC/TGS H2 leftover (A).

---

## 2. A / B

| | A (chọn) | B |
|--|----------|---|
| Scope | Align leftover labels/copy + delete dead QLCV brief to locked H2 | Invent new doors / merge Công việc / schema |
| Risk | Thấp — display/copy + dead file; RBAC **codes** giữ | Churn IA / W6 |
| Migrate? | Không | Không |

**Chọn A.**

---

## 3. Before → after

| Surface | Before | After |
|---------|--------|-------|
| Header breadcrumb `/` | «Tổng quan KSNK» | «Báo cáo chính thức» |
| RBAC DASHBOARD* display + business desc | «Command Center» / «Tổng quan KSNK» | «Báo cáo chính thức» (codes `DASHBOARD_CC_*` giữ) |
| `qlcv-brief.actions.ts` | orphan server action (0 callers) | **deleted** |
| wiki · dashboard README · metric-dictionary | two-door / decision-queue / Việc hôm nay rows | H2 one-door + REMOVED H2 notes |

---

## 4. Files

- `src/lib/app-shell-scope.ts` (+ `.spec.ts`)
- `src/lib/permission-module-business-descriptions.ts`
- `src/lib/permission-registry-data.ts`
- `src/modules/quan-ly-cong-viec/actions/qlcv-brief.actions.ts` (delete)
- `docs/wiki/concepts.md`
- `docs/modules/dashboard/README.md`
- `docs/modules/dashboard/metric-dictionary.md`
- this audit note
- pointer in `_audit-full-debt-overlap-2026-09-27.md`

---

## 5. Verify / UAT

- `npx tsc --noEmit`
- vitest: `app-shell-scope.spec`
- UAT local: `/` → BCTH; header «Báo cáo chính thức»; sidebar no Tổng quan / Việc hôm nay; `/thong-ke/gsc` Nâng cao không link QLCV; RBAC preview labels BCTH; Công việc vẫn menu riêng

---

## 6. Park / blockers

- **W4** ME-S* + QLCV Wave3 migrates — Nghĩa only
- **W6** QLCV type-vs-priority — cần lock
- Internal comments còn chữ «Command Center» trong analytics libs — P3 copy, không FE door
- VST BM thin — no clear P0 this survey; re-open only with evidence
