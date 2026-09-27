# Soft next — CSSD Quy trình / 6 trạm SSOT labels — 2026-09-27

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-27 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip trước | `d24b6aa` (Soft residual P2) · ahead 44 |
| Phạm vi | FE-only · Quy trình / 6 trạm shell + thin su-co residual (Kiểm bộ language) |
| Không | push / PR / Cloud / Vercel / migrate / DROP / dirty WT |

Liên quan: `_audit-full-debt-overlap-2026-09-27.md` (Soft Soft-queue empty W4/W6) · `cssd-stations.ts` STATION_LABEL · F7 `_audit-qlcv-cssd-me`.

---

## 1. Survey → pick

Prefer order: (1) Quy trình/6 trạm · (2) su-co residual · (3) phiếu mẻ UI · …

| Candidate | Soft-feasible P0/P1 FE? | Verdict |
|-----------|-------------------------|---------|
| **Quy trình / 6 trạm** | **Y** — shell còn raw `QC` / `replace(/_/g)` vs SSOT `Kiểm bộ` | **PICK** |
| Su-co residual | Y thin — PROCESS_QC_FAIL copy + dead hub exports (0 callers) | bundle cùng SSOT |
| Phiếu mẻ UI | Blocked F5 ME migrate (missing remote cols) | park |
| QLCV residual | W6 needs lock; Wave3 migrate Nghĩa | park |
| GSC/VST/BM | no clear thin P0 after prior IA | skip |

**Module chosen:** CSSD Quy trình / 6 trạm shell (SSOT nhãn) + thin su-co residual.

---

## 2. A / B

| | A (chọn) | B |
|--|----------|---|
| Scope | Digests label trên shell Chu trình + Truy vết; PROCESS_QC_FAIL → Kiểm bộ; xóa dead hub exports | Broad `replace(/_/g)` sweep report/print/analytics (reopen W3A surface) |
| Risk | Thấp — display/copy only; CAP_PHAT detect vẫn qua `tramDisplay === "Cấp phát"` | Nhiều file; overlap module đã flatten |
| Migrate? | Không | Không |

**Chọn A** — đúng prefer #1, cắt overlap SSOT, không schema.

---

## 3. Before → after

| Surface | Before | After |
|---------|--------|-------|
| `CssdStationFlowMap` hint QC | «QC trước đóng gói… ≠ QC mẻ» | «**Kiểm bộ** trước đóng gói… ≠ QC mẻ» |
| `CSSDERPPage` → QR success `tramDisplay` | `currentStation.replace(/_/g," ")` → «QC» | `stationLabel(currentStation)` → «Kiểm bộ» |
| `QRHistoryViewer` (tab Truy vết) | status/timeline raw «QC» | `stationLabel(...)` |
| `PROCESS_QC_FAIL` picker label | «Không đạt kiểm tra chất lượng tại khâu» | «Không đạt **Kiểm bộ** tại khâu» |
| `SAFETY_INCIDENT_GROUPS` / `SuCoHub` / `hubOfIncidentGroup` / `defaultGroupForHub` | @deprecated, **0 callers** | **deleted** |

---

## 4. Files

- `src/modules/cssd-erp/components/workflow/CssdStationFlowMap.tsx`
- `src/modules/cssd-erp/views/CSSDERPPage.tsx`
- `src/modules/cssd-erp/components/history/QRHistoryViewer.tsx`
- `src/modules/cssd-su-co/domain/cssd-incident-taxonomy.ts`
- `src/modules/cssd-su-co/domain/cssd-incident-taxonomy.spec.ts`
- this audit note

---

## 5. Verify / UAT

- `npx tsc --noEmit`
- vitest: stations + taxonomy (+ routes if green)
- UAT local: `/cssd-quy-trinh` — hover Kiểm bộ cell; quét → thẻ success không hiện mã thô «QC»; tab Truy vết nhãn Kiểm bộ; `/cssd-su-co` cửa Quy trình → loại «Không đạt Kiểm bộ tại khâu»

---

## 6. Park / blockers

- **W4** ME-S* + QLCV Wave3 migrates — Nghĩa only
- **W6** QLCV type-vs-priority — cần lock
- Report/print residual — **DONE** Soft next beat → `_audit-soft-next-report-print-station-ssot-2026-09-27.md`
- Phiếu mẻ UI polish — park tới migrate remote
- Dirty WT (`AGENTS.md`, csv, scripts, qlcv proposal) — **để yên**

**Soft Soft-queue after this?** Report/print B unlocked & done next beat; empty again except W4/W6.

*End — Soft Delivery Lead · local commit only.*
