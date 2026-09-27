# Soft next — Report/print residual station SSOT labels — 2026-09-27

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-27 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip trước | `32449b0` (Quy trình SSOT) · ahead 45 |
| Phạm vi | FE-only · report/print/RCA/mẻ-scan display digests → `stationLabel` (QC → Kiểm bộ) |
| Không | push / PR / Cloud / Vercel / migrate / DROP / dirty WT |

Liên quan: `_audit-soft-next-quy-trinh-tram-ssot-2026-09-27.md` (parked B) · `cssd-stations.ts` STATION_LABEL · W3A report flatten.

---

## 1. Survey → pick

Parked from last beat: report/print còn raw `replace(/_/g)` (esp. QC).

| Candidate | Station display? | Verdict |
|-----------|------------------|---------|
| `ReportFilters` options | Y — already imported SSOT nhưng map vẫn replace | **FIX** |
| `cssd-report-read` emptyAnalyticsBundle | Y — lệch `computeStationVolume` (đã SSOT) | **FIX** |
| `CSSDReportPage` KPI/bar/alerts/tables | Y — best/worst/bar/tram_*/trạm cuối | **FIX** |
| `ReportDashboard` alert chip | Y — `replace("_"," ")` nửa vời | **FIX** (source labeled) |
| `NkbvCssdRcaPanel` tramHienTai | Y — RCA timeline | **FIX** |
| `me-tiet-khuan-process-scan-panel` fallback | Y — badge ngoài Đang TK / chờ TK | **FIX** thin |
| `formatCssdTriLabel` | N — DAT/KHONG_DAT/NA | skip |
| `InventoryHistoryTable` TYPE | N — inventory type | skip |
| `ActivityTimeline` loai | N — QLCV activity | skip |
| `cssd-stations` fallback | SSOT itself | keep |

**Module chosen:** CSSD report/print residual SSOT (A) — không GSC/TGS/H2/VST.

---

## 2. A / B

| | A (chọn) | B |
|--|----------|---|
| Scope | Chỉ call sites **mã trạm** → `stationLabel` | Broad mọi `replace(/_/g)` + status/type/tri |
| Risk | Thấp — display only; filter id vẫn code | Churn unrelated surfaces |
| Migrate? | Không | Không |

**Chọn A.**

---

## 3. Before → after

| Surface | Before | After |
|---------|--------|-------|
| Filter trạm / empty analytics label | «QC» | «Kiểm bộ» |
| KPI trạm tốt/xấu · bar · cảnh báo đỏ | raw / half-replace | `stationLabel` |
| Nhật ký «Trạm cuối» · Khâu phát hiện/gây lỗi | «QC» | «Kiểm bộ» (empty → «Không áp dụng») |
| NKBV RCA «Trạm …» | raw | `stationLabel` |
| Mẻ scan badge fallback | raw | `stationLabel` (giữ Đang TK / chờ TK) |

---

## 4. Files

- `src/modules/cssd-erp/components/report/ReportFilters.tsx`
- `src/modules/cssd-erp/components/report/ReportDashboard.tsx`
- `src/modules/cssd-erp/views/CSSDReportPage.tsx`
- `src/modules/cssd-erp/actions/cssd-report-read.actions.ts`
- `src/modules/giam-sat-nkbv/components/NkbvCssdRcaPanel.tsx`
- `src/modules/cssd-erp/components/batch/me-tiet-khuan-process-scan-panel.tsx`
- this audit note
- pointer in `_audit-full-debt-overlap-2026-09-27.md`

---

## 5. Verify / UAT

- `npx tsc --noEmit`
- vitest: `cssd-stations` (+ print-format / taxonomy if green)
- UAT local: `/cssd-erp/report` — filter QC = Kiểm bộ; KPI/bar/cảnh báo; bảng Sự cố/Trách nhiệm khâu; `/cssd-quy-trinh` mẻ scan badge; NKBV SSI RCA khi có tram

---

## 6. Park / blockers

- **W4** ME-S* + QLCV Wave3 — Nghĩa only
- **W6** QLCV type-vs-priority — cần lock
- Non-station `replace` (TYPE / loai / Tri) — intentional leave
- Dirty WT — **để yên**

**Soft Soft-queue after this?** Empty again except W4/W6 — trừ khi Nghĩa lock W6 hoặc mở GSC/TGS/VST thin.

*End — Soft Delivery Lead · local commit only.*
