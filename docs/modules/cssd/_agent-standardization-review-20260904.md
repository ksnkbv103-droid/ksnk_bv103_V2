# BV103 — Standardization / consistency review (READ-MOSTLY)

> **Date:** 2026-09-04 (Asia/Saigon)  
> **Machine:** Mac BV103 · machineId `6bad1c57-5c17-4e62-b661-16f3bab10f88`  
> **Path:** `/Users/drnghia/Desktop/ksnk_bv103`  
> **Branch / HEAD:** `wip/mac-20260903` @ `4442f52`  
> **Dirty:** 110 paths (`git status --short`) — **no commit/push** this pass  
> **Scope:** FE / BE / UI-UX / calculations / business domain as implemented NOW  
> **Policy:** PAUSE heavy PCI P0 feature work; prefer REPORT; light 1-line only if crash  
> **Related:** `_agent-deep-audit-20260904.md` · `docs/core/domain-decisions-cssd-instrument.md` (D1–D10)

---

## A. Hiện trạng (1 đoạn)

Repo Next.js App Router đa module (CSSD / VST / GSC / NKBV / QLCV / Đào tạo / Quản trị) trên WIP Mac đã có lớp chuẩn hóa rõ: 6-station FSM + RPC SSOT, 3 cửa dụng cụ + `rejectMoveOnly`, master-write ADMIN gate, stock split `kho + trong bộ`, % VST/GSC từ counts, Dialog MDM, `suppressShell` CTA, KPI strip gọn. Nợ chính không phải "thiếu domain helper" mà là **wire/UI parity + FE mega-pages (đặc biệt NKBV) + modal/Chrome lẫn shadcn vs ad-hoc + rounding/display lệch giữa strategic vs history + dirty WIP lớn chưa chốt**. Domain helpers BD / pack-issuance / packaging-rules **đã có + một phần đã wire** — không phải wishlist trống; còn soft-gate / UI entry / migration BOM unique.

---

## B. Điểm đã chuẩn (WIP gần đây)

### Project map
- App routes lean: CSSD shells `/cssd-quy-trinh|dung-cu|su-co|thiet-bi|hoa-chat`; deep-link `/cssd-erp/batch` → redirect `cssdQuyTrinhBatchTabHref()`; `/lich-su` → `/lich-su/vst`; `/thong-ke` → `/thong-ke/vst`.
- Modules under `src/modules/*` khớp routes; SSOT paths `src/lib/cssd-routes.ts`, `quan-tri-paths.ts`.
- HEAD `4442f52` — *fix: tính % VST/GSC từ số đếm, tồn loại CSSD = kho + trong bộ*.

### UI/UX
- **Dual-frame:** 0 hit `DualFrame|dual-frame` trong `src/` — đã sạch.
- **Sentence-case CTA:** literal ALL-CAPS button text gần như hết; sample `Lưu/Xóa/Thêm/…` sentence-case.
- **suppressShell:** `KhoDungCuPage` / `BaoTriThietBiPage` / `CSSDERPPage` / `MeTietKhuanPage` expose `suppressShell`; hub `/cssd-quy-trinh` + `/cssd-thiet-bi` embed với CTA «Báo sự cố» khi suppress.
- **StatCard walls:** `ReportDashboard.tsx`, `HoaChatStatsPanel.tsx` comment *Compact KPI strip — not 4-col wall*.
- **MDM Dialog:** Bộ/Loại/BangKiem dùng `@/components/ui/dialog` (COUNT_DIALOG≈14 files).

### Frontend / backend architecture
- CSSD views không mega (>800): lớn nhất `KhoHoaChatKsnkPage` ~454 LOC.
- Domain pure: `src/lib/domain/cssd-*.ts` (+ specs) — reconcile, FEFO, packaging, pack-issuance, steam BD, catalog-master-write, scoring.
- Server actions gated: `requireCssdCatalogMasterWrite` trên `bo-dung-cu|loai-dung-cu|dung-cu-chi-tiet|smart-import.actions`.
- FSM: `Station = TIEP_NHAN|LAM_SACH|QC|DONG_GOI|TIET_KHUAN|CAP_PHAT`; app mirror `cssd-state-engine` + RPC `rpc_scan_workflow_station`.
- BOM 1×1: `cssd-bom-line-merge.ts` + untracked migration `20260904120000_cssd_bom_chi_tiet_unique_bo_loai_active.sql`.
- 3 cửa + reject move-only: `rejectMoveOnlyKindsOnReconcile` wired approve/incident/ledger apps.
- BD / wet-pack helpers **wired**: `assertSteamDailyBdForLoad` in `cssd-batch.actions`; `assertPackIssuable` in `cssd-workflow-application` + `cssd-scan.actions`.
- Packaging heat: `evaluateHeatCompatibility` → `cssd-composition-reconcile.actions` + `CompositionReconcilePanel`.

### Calculations
- Stock: `splitLoaiStock` / `mergeLoaiListTrongBo` in `cssd-loai-list-map.ts` (+ spec).
- %: `rateFromTotals` / `computeTyLeVst|Gsc` in `supervision-metrics/formulas.ts`; `withCountsPercent` in vst/gsc analytics-data; intentional VST 1dp / GSC 2dp via `supervision-percent.ts`.
- CSSD analytics: helpers in `cssd-analytics-core` called from `cssd-report-read.actions` (server) — pattern OK.
- FEFO pure: `cssd-kho-hoa-chat-fefo.ts` (+ spec).

### Domain decisions doc
- `docs/core/domain-decisions-cssd-instrument.md` D1–D10 chốt Phase 0 (3 cửa, ADMIN hard-write, BOM unique, soft-warning BOM, QC trạm ≠ QC mẻ, ẩn CCS).

### Quality
- `npx tsc --noEmit -p tsconfig.json` → **EXIT 0** (0 `error TS`; incremental `tsconfig.tsbuildinfo` present).
- Scripts: `verify:quick` = `build`; `verify:cssd`, `test:cssd`, `layout:drift-check`, `imports:cssd-mdm` available (not re-run full verify this pass).

---

## C. Lệch chuẩn / nợ (P0–P2)

| P | Area | Issue | Path(s) | Impact |
|---|------|-------|---------|--------|
| P0 | Domain wire | BD steam gate soft (`requireRecorded` false) — thiếu BD → warning | `cssd-steam-daily-bd.ts`; `cssd-batch.actions.ts` | QT.21 có thể nạp mẻ steam chưa BD ĐẠT |
| P0 | Domain wire | Pack wet/expiry wired CAP_PHAT — UAT `tinh_trang`/HSD populate | `cssd-pack-issuance.ts`; `cssd-workflow-application.ts`; `cssd-scan.actions.ts` | Gate không fire nếu thiếu field |
| P0 | Data | BOM unique migration untracked / chưa apply | `supabase/migrations/20260904120000_cssd_bom_chi_tiet_unique_bo_loai_active.sql` | DB cho trùng 1 bộ×1 loại |
| P1 | FE arch | NKBV client mega-pages >800 LOC | `NkbvBaMultiTimelineWorkspace` 2180; IwpPanel 1635; DiagnosticCaseForm 1222; GiamSatNkbvPage 1175 | Khó chuẩn hóa / regress |
| P1 | UI modal | Ad-hoc `fixed inset-0` song song shadcn Dialog | NKBV modals; IncidentReportModal; VstSessionViewer; QlcvImportDialog; danh-muc form-modals | a11y/mobile lệch |
| P1 | UI CTA | `uppercase` còn trên button packaging/batch | `CompositionReconcilePanel.tsx`; `bao-tri-start-modal.tsx` | Lệch sentence-case |
| P1 | Calc display | VST history integer % vs strategic 1dp | `vst-read-utils.ts` vs `supervision-percent.ts` | 67 vs 66.7 |
| P1 | Domain IA | Legacy MOVE codes còn deep-link/taxonomy (coerce OK) | `cssd-routes.ts`; `cssd-incident-taxonomy.ts` | D4 lệch |
| P1 | Empty/loading | Không shared EmptyState | SupervisionPageSkeleton; CSSD spinner ad-hoc | Copy lệch |
| P1 | FEFO ops | Helper có; verify UI sort + cận-date E2E | `cssd-kho-hoa-chat-fefo.ts`; KhoHoaChatKsnkPage | QT.38 PARTIAL |
| P2 | Report IA | `/cssd-erp/report` live — 2 entry | `src/app/cssd-erp/report/page.tsx` | Hai cổng báo cáo |
| P2 | Shared reuse | MDM form-modal chưa FormModalChrome SSOT | `danh-muc/*/*-form-modal.tsx` | Copy-paste CTA |
| P2 | Dirty WIP | 110 dirty paths | whole tree | Khó review/revert |
| P2 | Docs drift | domain-spec không bảng OK/PARTIAL; deep-audit còn ước lượng | `domain-specification.md`; `_agent-deep-audit-20260904.md` | Wishlist vs code |
| P2 | CCS | computeCcs còn; D10 ẩn UI — verify dashboard | `supervision-metrics/formulas.ts` | Regress label |
| P2 | Print ALL-CAPS | Department titles uppercase (OK print) | PrintLayout; GSC/Incident print | Không phải CTA — giữ |

**Document vs code (NOW):**

| Rule | Status |
|------|--------|
| 6-station FSM | **OK** (engine + RPC + specs) |
| 3-door instruments | **OK/PARTIAL** (rejectMove + master-write; legacy codes còn) |
| BOM 1 bộ×1 loại | **PARTIAL** (merge + draft unique mig) |
| reconcile reject move-only | **OK** |
| BD đầu ngày | **PARTIAL** (helper+wire; soft default) |
| Wet/expiry CAP_PHAT | **PARTIAL** (helper+wire; data completeness) |
| Stock kho+trong bộ | **OK** |
| % VST/GSC from counts | **OK** (history rounding drift P1) |
| Packaging Spaulding/heat | **PARTIAL** (evaluate + panel; POU/enzyme GAP ngoài scope) |

---

## D. Ưu tiên tinh chỉnh tiếp theo (top 12) — small slices

1. **UAT pack gate fields** — confirm `tinh_trang` / HSD / red_alert populated at CAP_PHAT (verify only).
2. **BD policy slice** — decide soft vs `requireRecorded: true` for steam load (1 flag + UI ghi BD đầu ngày).
3. **BOM unique migration** — when allowed: apply local + coalesce via `mergeDuplicateBomLinesForBo`.
4. **Sentence-case CTAs** in `CompositionReconcilePanel` + `bao-tri-start-modal` (drop `uppercase` on buttons only).
5. **VST history %** — use `roundPercent1` / `rateFromTotals` instead of integer `Math.round`.
6. **Hide legacy MOVE types** in picker (keep coerce for old deep-links) per D4.
7. **Shared EmptyState** (1 component) — adopt on 2 CSSD tables + 1 MDM list as pilot.
8. **IncidentReportModal → Dialog** — one modal migration slice (pattern for NKBV later).
9. **FEFO UI verify** — sort order + cận-date chip on kho hóa chất (read-only + tiny label).
10. **NKBV extract** — peel print/helpers out of `NkbvBaMultiTimelineWorkspace` (no behavior change).
11. **Doc sync** — mark deep-audit A8/A10 as PARTIAL+wired (not GAP) after this review.
12. **Dirty hygiene** — group WIP into reviewable stacks (docs / domain helpers / MDM UI) — still **no push** until PO.

*Paused (explicit):* PCI wet-pack/BD/FEFO **feature expansion**, schema rewrite, cloud, `.env`, commit.

---

## E. tsc / dirty file count

| Check | Result |
|-------|--------|
| Branch | `wip/mac-20260903` |
| HEAD | `4442f52` |
| Dirty paths | **110** (+1 after this report) |
| `tsc --noEmit` | **0 errors** (exit 0) |
| Dual-frame leftovers | **0** |
| Dialog consumers | ~14 tsx |
| Client mega >800 | NKBV-dominated; CSSD views OK |
| Light code edits | none (report-only) |

---

## Appendix — Project map (routes)

**Auth:** `/(auth)/login|forgot-password|reset-password`
**CSSD:** `/cssd-quy-trinh`, `/cssd-dung-cu`, `/cssd-su-co`, `/cssd-thiet-bi`, `/cssd-hoa-chat`, `/cssd-erp/batch`→redirect, `/cssd-erp/report`
**Giám sát:** `/giam-sat`, `/giam-sat-vst`, `/giam-sat-chung/*`, `/giam-sat-nkbv`
**Khác:** `/dao-tao/*`, `/quan-ly-cong-viec`, `/quan-tri-he-thong/*`, `/thong-ke/*`, `/lich-su/*`, `/bao-cao-tong-hop`, `/qr`, `/tai-khoan/*`

**Modules:** `cssd-erp`, `cssd-su-co`, `dao-tao`, `dashboard`, `entity-qr`, `giam-sat-*`, `quan-ly-cong-viec`, `quan-tri-he-thong`, `auth`

---

*Generated by executor standardization review — Mac local read-mostly.*
