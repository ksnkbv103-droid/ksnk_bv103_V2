# Ghi chú AI — CSSD

Gộp các ghi chú phiên. Không dùng khi sửa hệ thống.

## _agent-deep-audit-20260904

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md). Tra cứu lịch sử được.

# BV103 CSSD — Deep domain audit vs PCI / QT BM / HĐ 31/07

> Draft 2026-09-04 · Nguồn: domain-specification §2.2, reform-plan, `/workspace/ipc-iso/source/QT-{18,21,24,38}`, HĐKSNK 31/07, trạng thái local WIP (trước khi Mac offline).  
> **Code evidence cột «Code» cần re-verify khi Mac reconnect** — một số dòng dựa trên audit/UX pass trước đó trên `Desktop/ksnk_bv103` @ `wip/mac-20260903`.

## Chú giải trạng thái
- **OK** — đã có trong code/docs và khớp SOP
- **PARTIAL** — có khung nhưng thiếu enforce / UI / dữ liệu
- **GAP** — chưa có hoặc lệch rõ

---

## A. Lộ trình 6 trạm + mẻ (PCI.03 / QT.18–23)

| # | Yêu cầu | Code / docs evidence (ước lượng) | Status | Fix now? |
|---|---|---|---|---|
| A1 | 6 trạm: TN→LS→QC→ĐG→Mẻ→CP | `domain-specification.md` §2.2; shell quy trình | OK | — |
| A2 | QT.18 POU lau máu / làm ẩm tại nguồn | BM.02 mục 1; UI tiếp nhận chưa bắt buộc tick POU | PARTIAL | P1 capture POU trên phiếu giao nhận |
| A3 | QT.18 Spaulding + chịu nhiệt khi tiếp nhận | Cột Spaulding trên `cssd_dm_loai`; thiếu rule engine đóng gói (reform B2) | PARTIAL | P1 `cssd-packaging-rules` |
| A4 | QT.18 Enzyme 30–45°C, ngâm, lòng ống | Chưa thấy bắt buộc lot enzyme / nhiệt độ trên trạm LS | GAP | P1 lot hóa chất gắn mẻ LS |
| A5 | QT.19 QC trạm ≠ QC mẻ | Spec tách rõ; UI QC trạm vs panel QC mẻ | OK/PARTIAL | Verify UI labels |
| A6 | QT.20 Đóng gói + đếm cấu phần; thiếu = cảnh báo không chặn | Soft-warning Q2; panel biến động bộ | OK | — |
| A7 | QT.20 Nhãn / Cycle QR có số mẻ | Dual-coding + Cycle QR trong spec | PARTIAL | Verify print template |
| A8 | QT.21 BD mẻ đầu ngày steam | Spec: steam ⇒ BD đạt mới nạp; cần verify enforce code | PARTIAL | **P0** harden gate |
| A9 | QT.21 BI/CI vị trí khó; Tyvek Plasma; EO aeration | QC mẻ 3 cấp; Plasma/EO rules | PARTIAL | P1 checklist gates |
| A10 | QT.21/22 Gói ướt = BẨN; không cấp phát | Spec recall/ướt; **thiếu field wet trên release?** | PARTIAL/GAP | **P0** helper + block CAP_PHAT |
| A11 | QT.22 Cấm gói hết hạn / rách / hỏng | PCI.03.02 HĐ; FEFO kho sạch | PARTIAL | **P0** expiry check cấp phát |
| A12 | QT.23 QC mẻ không đạt → rollback + HOLD_QC | Spec; implant CHO_BI | PARTIAL | Verify paths |
| A13 | Tab Kho FEFO ≠ trạm quét | Spec | OK | — |

## B. Sự cố / thu hồi (QT.24) + 3 cửa dụng cụ

| # | Yêu cầu | Evidence | Status | Fix now? |
|---|---|---|---|---|
| B1 | Thu hồi theo mẻ (BI+/máy/gói ướt) + khoa đang giữ | Spec recall `lo_tiet_khuan_id`; BM.01 | PARTIAL | **P0** entry thu hồi rõ |
| B2 | 3× BI(−) trước chạy lại máy | Spec chưa auto mở máy sau 3× BI(−) | GAP | P1 |
| B3 | 3 cửa: đổi DM→ADMIN; Chuyển; Hỏng/Mất ngay | WIP local rejectMoveOnly + master-write | OK/PARTIAL | Verify RO gates (đã ẩn phiếu RO) |
| B4 | BOM 1 bộ×1 loại=1 dòng | WIP merge + draft unique migration | PARTIAL | Apply migration khi được phép |
| B5 | Cấm 1 bộ vô khuẩn dùng chung nhiều NB | HĐ; chưa thấy hard rule multi-patient | GAP | P1 domain + UI |
| B6 | SUD cấm tái xử lý mặc định | HĐ; HLD/SUD out of scope spec | GAP (documented) | Không mở QT.25/SUD trừ lệnh |

## C. Hóa chất QT.38

| # | Yêu cầu | Evidence | Status | Fix now? |
|---|---|---|---|---|
| C1 | FEFO toàn chuỗi + thẻ kho XNT + cận date (BM.02) | Kho hóa chất module | PARTIAL | **P0** verify sort/cảnh báo cận date |
| C2 | Nhật ký T°C / RH kho (BM.01) | ? | GAP | P1 |
| C3 | MEC strip trước mỗi mẻ HLD (BM.03) | HLD out of scope | GAP (OK skip) | — |
| C4 | Clo pha ≤24h; tách Cồn khỏi Clo/H2O2 | ? | GAP | P1 storage rules |

## D. Bảng kiểm CSSD (Drive danh mục BM.18–22)

| # | Yêu cầu | Evidence | Status | Fix now? |
|---|---|---|---|---|
| D1 | Seed BM.18.02 / 20.02 / 20.03 / 21.04 / 22.04 trong `gstt_dm_bang_kiem` | Cần grep seed khi Mac online | ? | P1 đối chiếu seed |
| D2 | BangKiem UI Dialog (list+detail) | WIP local | OK | — |

## E. UX / IA (đã làm đợt trước — không regress)

| # | Mục | Status |
|---|---|---|
| E1 | Dialog Bộ/Loại/BangKiem/composition | OK |
| E2 | RO ẩn Rà soát/phiếu; «Thêm» click-outside | OK |
| E3 | suppressShell CTA Kho + Báo sự cố | OK |
| E4 | KPI walls gọn | OK partial |
| E5 | QLCV drawer 100dvh | backlog |

## F. Hàng đợi P0 khi Mac reconnect

1. Harden **BD đầu ngày** steam trước nạp mẻ  
2. **Gói ướt / hết hạn / hỏng** chặn hoặc hard-warn `CAP_PHAT` + helper domain  
3. **FEFO / cận date** hóa chất (QT.38 BM.02)  
4. Entry **thu hồi theo mẻ** (QT.24 BM.01) rõ trên UI  
5. Thay UI «nhiễm trùng» → «nhiễm khuẩn» (CSSD/KSNK)  
6. Copy audit file vào `docs/modules/cssd/_agent-deep-audit-20260904.md` và re-verify cột Code bằng grep thực tế  

## G. P1 backlog (đợt sau)

- POU bắt buộc trên giao nhận; lot enzyme gắn LS  
- Spaulding packaging rules (reform B2)  
- 3× BI(−) machine resume  
- Multi-patient sterilized set ban  
- Bảng kiểm seed vs Drive catalog  
- QT.38 BM.01 môi trường kho  

---
*Mac offline lúc soạn draft — không sửa code trong file này.*

---

## P0 applied (same day)

| Item | Result |
|------|--------|
| Pack issuance CAP_PHAT | `src/lib/domain/cssd-pack-issuance.ts` wired in `cssd-workflow-application.ts` + `cssd-scan.actions.ts` (issuanceOnly) — blocks expired / wet·torn·damaged / HONG·MAT / red-alert |
| Steam BD đầu ngày | `src/lib/domain/cssd-steam-daily-bd.ts` on create + chốt nạp — `specs.bd_dau_ngay_ket_qua=KHONG_DAT` blocks; missing → warning only (`requireRecorded` reserved P1) |
| Plasma cellulose | `assertPlasmaPackMaterialAllowed` in `cssd-packaging-rules.ts` |
| RO / reconcile / FEFO / BOM unique | Verified already OK — no code change |
| Docs | Short bullets in domain-specification §2.2, domain-overview #13, quan-ly-dung-cu-luong changelog |
| Tests | vitest pack-issuance + steam-bd + packaging-rules + fefo + set-reconcile: pass; `tsc --noEmit`: 0 errors |
| Not done | No commit/push; no migration; no HLD; BD record UI; POU/multi-patient/IUSS/SUD |

## _agent-standardization-review-20260904

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md). Tra cứu lịch sử được.

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

## _agent-dung-cu-loai-proposal-20260907

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md) · quyết định dụng cụ [`core/domain-decisions-cssd-instrument.md`](../../../core/domain-decisions-cssd-instrument.md). Tra cứu lịch sử được.

# Đề xuất lại module Quản lý dụng cụ (2026-09-07)

## 1. Trả lời thẳng câu hỏi

### Có mất danh mục loại không?
**Không mất dữ liệu / không mất code CRUD.** Bảng `cssd_dm_loai_dung_cu` vẫn là SSOT. Form thêm–sửa–xóa mềm loại vẫn trong `LoaiDungCuPage` / `loai-dung-cu.actions.ts`. Danh sách loại trên CSSD vận hành vẫn có cột **Tổng / Trong bộ / Trong kho**.

### Vì sao nhìn như «không có»?
Ngày **2026-09-03**, hướng đơn giản hóa catalog (giống app bệnh nhân, ít màn) gồm: **ẩn tab Loại** khỏi mặt trước; chỉ giữ 3 lớp **Bộ → Rà soát → Lịch sử**; Loại trở thành **sheet phụ chỉ ADMIN** (`?sheet=loai`). Hub «Quản lý dụng cụ» cũng chỉ trỏ lớp Bộ.

Hệ quả thực tế:
- Quản trị: không còn tab ngang hàng «Loại» → khó tìm; chỉ mở qua nút/sheet ẩn nếu là admin.
- `/cssd-dung-cu`: nút tab chỉ còn «Bộ dụng cụ» và «Lịch sử»; nhánh `tab === LOAI` gần như **không còn cửa vào** (nút Bộ gộp cả trạng thái LOAI nhưng `onClick` luôn `setTab("BO")`).

→ **Không phải bạn yêu cầu xóa hẳn loại.** Là **giấu cửa vào** trong đợt gọn UX — và cách giấu đã quá mạnh, làm mất vai trò trung tâm của loại.

### Có sửa được nội dung trên danh mục loại không?
**Có** (admin, qua sheet/form còn lại), nhưng **cửa vào hiện không rõ** nên cảm giác như không quản lý được.

---

## 2. Vai trò khoa học của «Loại» (nên giữ làm trung tâm)

```
Loại dụng cụ (SKU / danh mục chuẩn)
   ├─ thuộc nhiều Bộ (BOM: loại × số lượng chuẩn)
   ├─ tồn Kho dự phòng (theo loại)
   └─ số liệu: Tổng = Trong bộ + Trong kho (+ biến động sự cố)
Bộ dụng cụ = túi/khay vận hành (khoa, mã bộ, QR)
Chi tiết dòng bộ = chỉ là dòng BOM gắn loại (không thay thế danh mục loại)
```

Không có mặt **Loại** rõ ràng thì không trả lời được: loại này có bao nhiêu, bao nhiêu trong bộ, bao nhiêu trong kho — đúng đúng nhu cầu bạn nêu.

---

## 3. Phương án đề xuất (một cửa, tách bạch việc)

### Nguyên tắc
1. **Loại = trung tâm danh mục** (định nghĩa + số liệu tồn).
2. **Bộ = trung tâm vận hành** (khay/túi, QR, phân khoa, thành phần).
3. Giữ **3 cửa sự cố** đã chốt: Đổi danh mục (phiếu duyệt) | Chuyển (kho/bộ↔bộ) | Hỏng–Mất — **không** nhét chuyển kho vào form bộ.
4. Care-bundle / gắn cờ khác: **không** trộn vào module này.
5. Ít màn, một hàng một thực thể, một hành động chính (vẫn giữ tinh thần app bệnh nhân) — nhưng **không được giấu thực thể trung tâm**.

### Mặt Quản trị (`/quan-tri-he-thong/danh-muc/dung-cu`)
| Tab ngang hàng | Ai dùng | Việc chính |
|----------------|---------|------------|
| **Loại** | Admin (sửa); điều dưỡng có thể xem nếu cần | 1 dòng = 1 loại; cột Tổng / Trong bộ / Trong kho; Dialog sửa thuộc tính (mã, tên, hình dáng, kích thước, Spaulding, tiệt khuẩn…) |
| **Bộ** | Admin + người được quyền | Danh sách bộ; mở Dialog thành phần (BOM theo loại); phiếu đổi DM |
| **Rà soát** | Admin | Duyệt phiếu đổi danh mục |
| **Lịch sử** | Admin / xem | Phiếu đã duyệt / thay đổi số lượng |

Hub: một ô «Quản lý dụng cụ» vào tab **Loại** (hoặc Bộ — nhưng **không** được mất link Loại trên tab).

### Mặt CSSD vận hành (`/cssd-dung-cu`)
| Tab | Việc |
|-----|------|
| **Loại** (xem) | Tra cứu số liệu Tổng / Trong bộ / Trong kho; chọn loại → xem bộ đang chứa |
| **Bộ** | Tra cứu bộ + thành phần; đề nghị đổi DM; không sửa master loại tại đây |
| **Lịch sử** | Luân chuyển |

Sửa master loại **chỉ** ở Quản trị (hoặc phiếu), tránh hai form lệch nhau.

### Việc không làm trong vòng này
- Đổi schema lớn / đổi mã loại hàng loạt.
- Gắn care bundle.
- Viết lại toàn bộ CSSD ERP.

### Việc làm ngay nếu bạn chốt (local, không commit)
1. Trả **tab Loại** ngang hàng trên Quản lý dụng cụ (không chỉ sheet ẩn).
2. Nút mở Loại rõ trên header Bộ (nếu cần shortcut).
3. Trên `/cssd-dung-cu`: tách nút tab **Loại** (xem số liệu) khỏi nút **Bộ**.
4. Hub / deep-link `/dung-cu/loai` → tab Loại thật, không chỉ sheet.
5. Một lần kiểm thử: tạo/sửa loại → thấy số liệu trên dòng loại.

---

## 4. Vì sao sửa đi sửa lại mãi?
Đổi UX theo «ít tab» mà **chưa khóa lại mô hình miền** (Loại là trung tâm). Lần này khóa mô hình trước, rồi mới sửa cửa vào — tránh đập đi xây lại.

## 5. Quyết định cần bạn chọn
- **A (khuyến nghị):** Trả Loại làm tab ngang hàng + CSSD có tab xem Loại (số liệu).
- **B:** Giữ sheet phụ nhưng **nút «Danh mục loại» rất rõ** trên trang Bộ (nhanh hơn A một chút, vẫn dễ quên).
- **C:** Tách hẳn trang riêng `/dung-cu/loai` như thiết bị/hóa chất (rõ nhất, thêm một điểm vào hub).

---

## 6. Đã triển khai A (2026-09-07, local)

Chốt **A**: Loại lại là **tab ngang hàng**.

- **Quản trị** `/quan-tri-he-thong/danh-muc/dung-cu`: tab **Loại | Bộ | Rà soát | Lịch sử**. `quanTriDungCuHref("loai")` → `?tab=loai`. Legacy `?sheet=loai` normalize về tab Loại (không Dialog sheet bắt buộc). Xem Loại cần `LOAI_DC` view; sửa master vẫn admin trong `LoaiDungCuPage`.
- **CSSD ops** `/cssd-dung-cu`: tab **Loại | Bộ | Lịch sử** (Loại = `CSSDCatalogLoaiTab`, view-only).
- Hub `/dung-cu/loai` redirect → `?tab=loai`.

## _agent-perf-complexity-rootcause-20260907

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`open-backlog-20260731.md`](../../plans/architecture/open-backlog-20260731.md). Tra cứu lịch sử được.

# BV103 vs Moodle — Căn nguyên chậm / phức tạp / chồng chéo

> Phân tích **chỉ đọc** trên Mac `Desktop/ksnk_bv103` · 2026-09-07 (UTC+7)  
> Phạm vi: stack Next App Router, hot path CSSD dụng cụ / quản trị / giám sát, dual surface, bundle, docs perf sẵn có.  
> Không chỉnh code trong đợt này — chỉ chẩn đoán + lộ trình cắt.

---

## So sánh ngắn Moodle vs BV103

| | **Moodle (cảm giác mượt)** | **KSNK BV103 / CSSD (cảm giác nặng)** |
|---|---|---|
| Mô hình sản phẩm | Học liệu + khóa học: vài luồng tuần tự (xem → làm bài → nộp) | **ERP lâm sàng + danh mục + RBAC + QR + kho + sự cố** cùng lúc |
| Một màn hình | Một nhiệm vụ rõ (đọc trang / làm quiz) | Thường **nhiều tab + dialog + bảng + quyền** trên cùng shell |
| Dữ liệu lúc mở trang | Ít bản ghi theo ngữ cảnh khóa học | Hay **kéo cả danh mục / view full** rồi lọc trên client |
| Kiến trúc FE | Trang server-ish, plugin tách, ít state toàn cục | Next 16 + React 19 nhưng **~1/3 file `src` là `"use client"`**; root bọc RBAC + sidebar mọi route |
| Kỳ vọng user | “Vào học” | “Vào hệ thống bệnh viện” — đúng nghiệp vụ khó hơn Moodle; cảm giác chậm đến từ **IA + payload + client shell**, không chỉ vì “Next chậm” |

**Kết luận so sánh:** Moodle nhẹ vì **sản phẩm hẹp**. BV103 nặng vì đúng là **nhiều domain**; phần có thể cắt là **cửa vào trùng, danh mục full-load, trang client khổng lồ** — không phải viết lại stack.

---

## Bằng chứng nhanh (số đo repo)

- **Stack:** `next@16.3.4`, `react@19.2.8`, App Router (`src/app`), Supabase, Tailwind 4.
- **~55** `page.tsx`; **25 CLIENT / 30 SERVER** ở tầng page; **414** file có `"use client"` / ~1248 file `.ts(x)` dưới `src`.
- Module lớn: `quan-tri-he-thong` ~171 file, `cssd-erp` ~152, `giam-sat-chung` ~77.
- Hot path dụng cụ: `/cssd-dung-cu` (RO) + `/quan-tri-he-thong/danh-muc/dung-cu/*` (CRUD) — đã ghi rõ trong `quan-ly-dung-cu-luong.md`.
- `getKhoCatalogPayloadAction`: **không phân trang** — nạp toàn bộ bộ active + meta + hóa chất + khoa.
- `getBoDungCuRowsAction`: `select("*")` trên `v_cssd_bo_dung_cu_summary` **không limit** (Loại đã có `range` page 20 — Bộ chưa).
- Kho vận hành: `fetchCssdKhoDungCuList` → `select("*")` + `limit(8000)` trên `v_cssd_quy_trinh_full`.
- `/cssd-quy-trinh`: một page client gom **4 tab** (chu trình / mẻ / kho / truy vết), `dynamic(..., { ssr: false })`.
- Root `layout.tsx`: mọi trang qua `PermissionProvider` + `ClientLayoutWrapper` (sidebar/header/RBAC).
- Docs sẵn: `docs/reference/reports/perf-audit-20260703.md` (exceljs đã lazy), `docs/archive/baselines/cssd-perf-baseline-20260526.md`, `docs/reference/architecture/simplification-program-20260726.md`, `debt-register.md`.

---

## Căn nguyên thật (ưu tiên)

### 1. Mô hình sản phẩm “nhiều hệ trong một app” (gốc nhận thức)

Một session user phải nghĩ: giám sát (VST/GSC/NKBV) · công việc · CSSD quy trình · tra cứu dụng cụ · quản trị master · sự cố · hóa chất · thiết bị · báo cáo.  
Sidebar đã giản hóa một phần (hub giám sát, 4 job quản trị) nhưng **CSSD vẫn nhiều cửa** (quy trình tabbed + dung-cu + su-co + thiet-bi + hoa-chat + quan-tri dung-cu).

**Triệu chứng:** “phức tạp, chồng chéo, không biết vào đâu”; so với Moodle thì “mỗi lần vào là một việc”.

### 2. Client-first + shell RBAC toàn cục (gốc cảm giác chậm khi đổi trang)

- 25/55 page là `"use client"`; module CSSD/giám sát gần như toàn hook client lớn (`use-giam-sat-chung-form` ~655 dòng, panel chi tiết bộ ~700 dòng).
- Mọi route trả phí: hydrate PermissionProvider, Sidebar, StaffSessionGate, offline listeners.
- Auth gate chủ yếu client (nợ D-09 trong debt-register) → flash loading / chờ quyền trước khi thấy nội dung.

**Triệu chứng:** mở trang “nặng”, spinner tab, máy yếu/mạng bệnh viện càng lộ.

### 3. Danh mục / view hot path kéo bulk không phân trang (gốc chậm dữ liệu)

| Điểm nóng | Hành vi hiện tại |
|---|---|
| `/cssd-dung-cu` | `getKhoCatalogPayloadAction` — **full** bộ + hóa chất + khoa vào state client; search loại mới limit 20 |
| Quản trị Bộ | `getBoDungCuRowsAction` — `select("*")` **toàn bảng summary**, rồi join loai/khoa |
| Tab Kho trong quy trình | `select("*")` view full, **limit 8000** |
| Master generic | `listMasterRows` — `select("*")` không page |
| Tiếp nhận chờ quét | load **toàn bộ** `cssd_dm_bo_dung_cu` active rồi filter client |

Search có `PAGE = 20` nhưng **lần mở đầu vẫn full** → cảm giác “đang tải danh mục…” và UI giật khi filter.

**Triệu chứng:** màn dụng cụ / quản trị bộ / kho chậm lần đầu; càng nhiều bộ càng tệ (pilot lớn sẽ lộ).

### 4. Dual surface đúng nghiệp vụ nhưng UI vẫn “hai app giống nhau” (gốc chồng chéo)

Đã chốt đúng: **CRUD master = quản trị**, **xem/in/quét = `/cssd-dung-cu`**.  
Nhưng cả hai đều: bảng lớn + Dialog thành phần + tìm/QR + panel dày → user thấy **cùng một danh mục hai lần**, cộng tab Kho trong `/cssd-quy-trinh` và redirect legacy `cssd-erp/*`.

Hub quản trị (4 job) + hub giám sát + mega-shell CSSD 4 tab = nhiều “cổng” cho cùng vật liệu (bộ/loại).

**Triệu chứng:** “overlapping, verbose”; Dialog lồng / mở thành phần trên list (Radix Dialog dày trên mobile).

### 5. Form giám sát / bảng kiểm: state machine client dày (gốc “nặng khi nhập liệu”)

`useGiamSatChungForm` + template sync + sticky admin context + offline queue + nhiều `useEffect` nạp options.  
Không phải Moodle quiz đơn giản: mỗi lần mở form kéo master bảng kiểm / khoa / template.

**Triệu chứng:** form GSC “nặng”, phức tạp hơn Moodle dù chỉ “đánh checklist”.

### 6. Bundle / phụ thuộc nặng — đã xử lý một phần, chưa phải gốc chính cảm giác phức tạp

- `exceljs` ~900KB: **đã** chuyển dynamic import (perf-audit 2026-07-03) — giữ kỷ luật này.
- Còn: `recharts` (thống kê), QR (`html5-qrcode` / `qrcode`), `lucide` rất nhiều import file, `optimizePackageImports` đã bật trong `next.config.ts`.
- Dynamic import dùng khá tốt ở quy trình/đào tạo; **thiếu** ở catalog/quản trị bộ (vẫn eager full list).

**Triệu chứng:** trang thống kê/PDF cảm giác nặng; còn lại cảm giác “phức tạp” chủ yếu từ (1)+(3)+(4).

---

## Hướng giải quyết dứt điểm (pha 0–3)

### Nguyên tắc kiến trúc (north star)

1. **Một việc = một bề mặt chính** (operator vs admin); không nhân đôi bảng CRUD trên màn vận hành.  
2. **Danh sách = server + tìm kiếm + trang**; không `select *` full vào React state trừ khi số dòng nhỏ đã đo.  
3. **Page mặc định Server Component**; client chỉ đảo tương tác (scan, dialog, bảng).  
4. **Shell mỏng theo vai trò** — không hydrate full RBAC matrix nếu chỉ cần vài quyền module.  
5. Cắt theo **vertical slice** (một hot path), không rewrite framework.

### Pha 0 — Chốt nhận thức (1–2 ngày, không đụng schema lớn)

- Khóa câu chuyện cho user: **Vận hành CSSD** = Quy trình (+ Sự cố) · **Tra cứu** = Dụng cụ/Máy/Hóa chất · **Sửa danh mục** = Quản trị → Master CSSD.  
- Ẩn/redirect nhẹ các lối cũ còn gây nhầm (`cssd-erp` đã redirect — giữ; đừng mở lại catalog ERP).  
- Đo baseline 3 màn: `/cssd-dung-cu`, `/quan-tri-he-thong/danh-muc/dung-cu?tab=bo`, `/cssd-quy-trinh?tab=kho` (TTFB + payload JSON size + số row).

### Pha 1 — Data cắt dứt (1–2 tuần) — ưu tiên cao nhất

- `getKhoCatalogPayloadAction` → **không full-load**: mặc định search/limit (đã có `searchKhoCatalog*`); preload chỉ metadata nhẹ hoặc trang đầu.  
- `getBoDungCuRowsAction` → cùng pattern `useServerPaginatedTable` như Loại (`range` + count + cột hẹp, bỏ `select *`).  
- Kho list: cột hẹp thay `select("*")`; giảm `MAX_KHO_ROWS` hoặc lọc theo trạm/ngày.  
- `listMasterRows` / lookup form: limit + search; không đổ cả registry vào modal.  
- Giữ revalidate path CSSD hẹp như hiện tại (`cssd-server-common.ts`) — **không** revalidate “cả app”.

### Pha 2 — FE / IA (song song hoặc sau P1)

- `/cssd-quy-trinh`: tách route thật cho Kho/Truy vết **hoặc** lazy + không mount 4 panel logic cùng lúc (hiện dynamic đã có — siết state shared).  
- Dialog: một lớp chi tiết (drawer/sheet) thay stack Dialog lồng trên list quản trị + catalog.  
- GSC form: tách “nạp template” ra server action có cache tag; giảm số `useEffect` chuỗi.  
- Progressive: page `cssd-dung-cu` / quan-tri dung-cu chuyển dần sang RSC wrapper + client island.

### Pha 3 — Shell & bundle

- Permission snapshot theo module (hoặc cookie/session claim) thay vì hydrate lớn mỗi navigation.  
- Middleware auth (nợ D-09) để bỏ flash client gate.  
- Giữ `optimizePackageImports`; không thêm lib chart/PDF mới; QR chỉ dynamic khi mở camera.

---

## Việc KHÔNG nên làm

- **Rewrite** sang Remix / Nest / Flutter / “ERP mới”.  
- Thêm framework state toàn cục (Redux/React Query “cho chắc”) trước khi cắt payload.  
- Gộp bảng domain VST+GSC+CSSD (đã khóa trong simplification-program).  
- Nhân đôi thêm hub / ModeNav / tab “cho đủ tính năng”.  
- Micro-fix 50 chỗ (đổi class, đổi label) — không đổi cảm giác chậm.  
- Eager import lại `exceljs` / chart trên shell chung.

---

## 5 việc làm tuần này nếu chốt

1. **Đo** payload `getKhoCatalogPayloadAction` + `getBoDungCuRowsAction` trên DB pilot (số row, ms, KB JSON).  
2. **Phân trang Bộ** giống Loại (`getBoDungCuRowsAction` + `BoDungCuPage`).  
3. **Đổi `/cssd-dung-cu`**: bỏ full catalog lúc mount → search-first (tận dụng `searchKhoCatalog*` + QR lookup).  
4. **Hẹp `select` kho** (`fetchCssdKhoDungCuList`) — bỏ `*`, bỏ join thừa trên first paint.  
5. **Copy IA một dòng** trên header Quy trình / Dụng cụ / Quản trị dung-cu: “Sửa danh mục → Quản trị” / “Quét chu trình → Quy trình” — giảm cảm giác chồng trước khi refactor lớn.

---

## Tham chiếu nội bộ

- `docs/modules/cssd/quan-ly-dung-cu-luong.md` — phân vai RO vs CRUD  
- `docs/reference/architecture/simplification-program-20260726.md` — giản hóa cửa vào  
- `docs/reference/reports/perf-audit-20260703.md` — exceljs lazy  
- `docs/archive/baselines/cssd-perf-baseline-20260526.md` — index summary bộ  
- `docs/reference/architecture/debt-register.md` — D-09 auth middleware, D-11 RLS  

---

*Báo cáo agent · read-only · 2026-09-07*

## _agent-thiet-bi-hoa-chat-reaudit-20260907

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md). Tra cứu lịch sử được.

# Re-audit Thiết bị + Hóa chất — 2026-09-07

> Local only · không commit/push · scope: `/cssd-thiet-bi`, `/cssd-hoa-chat`, quan-tri danh mục, `cssd-erp` BaoTri / kho-hoa-chat, FEFO/PM, su-co EQUIPMENT/CHEMICAL links.

## 1. Map hiện trạng (ops vs admin)

| Surface | Route | Vai trò | Ghi chú |
|---------|-------|---------|---------|
| Ops thiết bị | `/cssd-thiet-bi` | Fleet + Bảo dưỡng + lịch sử mẻ theo máy | CTA «Sửa tại Quản trị»; tab `?tab=maintenance` / `van-hanh` |
| Ops bảo trì (embed) | cùng route tab maintenance | `BaoTriThietBiPage` (`suppressShell`) | Checklist PM, khóa mẻ khi REPAIRING, mở phiếu từ su-co EQUIPMENT |
| Admin thiết bị | `/quan-tri-he-thong/danh-muc/thiet-bi` | CRUD `cssd_dm_thiet_bi` | Form Dialog + QR print; chu kỳ PM |
| Ops hóa chất | `/cssd-hoa-chat` | Kho XNT theo lô, FEFO, cảnh báo ngưỡng/HSD | Module `KSNK_KHO_HOACHAT`; su-co CHEMICAL → ghi xuất |
| Admin hóa chất | `/quan-tri-he-thong/danh-muc/hoa-chat` | CRUD `cssd_dm_hoa_chat` | Master + ngưỡng tồn (đã bổ sung) |
| Catalog read-only | CSSD ERP catalog tab hóa chất | Chỉ xem | Không dual CRUD |

**SSOT domain:** `src/lib/domain/cssd-kho-hoa-chat-fefo.ts`, `cssd-equipment-pm*.ts`, `cssd-hoa-chat-loai.ts`.

## 2. Lỗi / gap đã sửa (P0–P1)

| # | Mức | Vấn đề | Sửa |
|---|-----|--------|-----|
| 1 | **P0** | Admin không CRUD `nguong_ton_toi_thieu` → banner «dưới ngưỡng» trên kho gần như không cấu hình được qua UI (chỉ Excel mapping) | Thêm field form + cột bảng + save action + type |
| 2 | **P1** | FEFO UI gộp «cận hạn» cho cả lô đã hết hạn | Bảng tồn + banner chip: **quá hạn** (rose) vs **cận hạn** (amber) |
| 3 | **P1** | `ketThucBaoTri` ghi `ngay_bao_tri_*` theo UTC (`now.slice(0,10)`) — lệch lịch VN (UTC+7) | Dùng `todayYmdInVn()` + `addDaysYmd` |
| 4 | **P1** | `/cssd-hoa-chat` thiếu CTA sang Quản trị (thiết bị đã có) | Thêm «Sửa tại Quản trị» |
| 5 | **P1** | Select xuất lô: option rỗng `""` trùng nghĩa với khóa lô `\|` → cảnh báo FEFO sai / xuất không chọn lô | Placeholder «Chọn lô»; bắt buộc `lotKey` khi còn tồn; hint khi chưa có tồn |
| 6 | **P1** | Nhãn overview «Hạn ≤ 30 ngày» không phản ánh lô quá hạn đã đếm | Đổi «Cận / quá hạn» |
| 7 | **P2** | `parseDateOnly` master hóa chất có thể lệch nếu parse Date generic | Giữ nguyên YYYY-MM-DD như `normalizeHanIso` |
| 8 | **P2** | Form master: «Hạn sử dụng» dễ nhầm với HSD lô kho | Đổi nhãn «Hạn tham chiếu (danh mục)» + ghi chú |

## 3. Files changed

- `src/modules/quan-tri-he-thong/danh-muc/actions/hoa-chat.types.ts`
- `src/modules/quan-tri-he-thong/danh-muc/actions/hoa-chat.actions.ts`
- `src/modules/quan-tri-he-thong/danh-muc/hoa-chat/hoa-chat-form-modal.tsx`
- `src/modules/quan-tri-he-thong/danh-muc/hoa-chat/hoa-chat-columns.tsx`
- `src/modules/cssd-erp/components/kho-hoa-chat/kho-hoa-chat-tables.tsx`
- `src/modules/cssd-erp/components/kho-hoa-chat/kho-hoa-chat-move-sheet.tsx`
- `src/modules/cssd-erp/components/kho-hoa-chat/kho-hoa-chat-overview.tsx`
- `src/modules/cssd-erp/views/KhoHoaChatKsnkPage.tsx`
- `src/modules/cssd-erp/actions/cssd-bao-tri-mutations.actions.ts`
- `docs/modules/cssd/_agent-thiet-bi-hoa-chat-reaudit-20260907.md` (file này)

## 4. Còn lại (không sửa trong pass này)

| # | Mức | Residual | Lý do bỏ qua |
|---|-----|----------|--------------|
| R1 | P2 | Dialog pattern `if (!open) return null` (move-sheet / bao-tri / QuanTri shell) — có thể abrupt unmount | Chuẩn hiện tại toàn MDM; redesign Dialog không scope P0 |
| R2 | P2 | Fleet `listThietBiFleetAction` đếm mẻ TK full-scan `cssd_fact_lo_tiet_khuan` | Perf; cần aggregate DB nếu data lớn |
| R3 | P2 | `listGiaoDichKhoHoaChatAction` / fact bảo trì client-side table (limit 120 giao dịch) | Đủ pilot; pagination server sau |
| R4 | P2 | HoaChatStatsPanel `daysDiff` dùng local Date, không `todayYmdInVn` | Panel phụ admin; không ảnh hưởng FEFO ops |
| R5 | P3 | Pilot checklist T1 còn nói «Tab Danh mục» — UI đã chuyển Fleet/Maintenance | Doc drift; cập nhật checklist riêng |
| R6 | — | Care-bundle | Explicit skip |
| R7 | — | Dual catalog CRUD | Đã tách ops/admin; catalog ERP read-only |

## 5. Test results

```text
npx vitest run \
  src/lib/domain/cssd-kho-hoa-chat-fefo.spec.ts \
  src/lib/domain/cssd-equipment-pm.spec.ts \
  src/lib/domain/cssd-hoa-chat-loai.spec.ts \
  src/lib/domain/cssd-hoa-chat-su-co-resolve.spec.ts \
  src/modules/cssd-erp/helpers/kho-hoa-chat-lot.spec.ts \
  src/modules/cssd-erp/helpers/assert-thiet-bi-cho-me-tiet-khuan.spec.ts

→ Test Files  6 passed (6)
→ Tests       23 passed (23)

npx tsc --noEmit → exit 0 (0 errors)
```

## 6. Verdict

**PASS có điều kiện (P0–P1 local đã đóng).** Ops/admin tách đúng; FEFO domain + PM checklist ổn; su-co EQUIPMENT/CHEMICAL đã nối vào bảo trì / ghi xuất. Residual chủ yếu P2 perf/Dialog/doc. Không redesign lớn, không đụng care-bundle / module ngoài scope.

**Khuyến nghị tiếp:** (1) smoke tay H1–H4 + T2–T4 trên data thật; (2) set `nguong_ton_toi_thieu` cho vài SKU pilot; (3) cập nhật pilot checklist thiet-bi T1 cho khớp tab Fleet.

## _agent-quy-trinh-dung-cu-domain-audit-20260908

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/domain-overview.md`](../../../modules/cssd/domain-overview.md). Tra cứu lịch sử được.

# Audit domain — Quy trình xử lý dụng cụ phẫu thuật (CSSD)

> **Ngày:** 2026-09-08 (Asia/Saigon) · **Máy:** Mac `Desktop/ksnk_bv103` · **Phạm vi:** READ-FIRST, không refactor lớn.  
> **SSOT nghiệp vụ:** [`domain-overview.md`](domain-overview.md) · [`../../core/domain-specification.md`](../../core/domain-specification.md) §2.2 · PCI.03 / QT.18–24.  
> **Kiểm chứng nhanh:** vitest `cssd-steam-daily-bd` + `cssd-pack-issuance` + `cssd-lam-sach-lot-gate` + `cssd-batch-recall` — **27/27 pass**.  
> **Không sửa code** trong pass này (liên kết docs README/domain đã OK — không có broken link crystal-clear cần vá).

---

## 1. Mục tiêu nghiệp vụ (user) vs mô hình domain trong app

| # | Mục tiêu user | Mô hình app (đã chốt) | Đạt mức nào? |
|---|---------------|------------------------|--------------|
| 1 | Quản lý **6 khâu / 1 chu kỳ** bộ | `TIEP_NHAN → LAM_SACH → QC → DONG_GOI → TIET_KHUAN(mẻ) → CAP_PHAT` · hub `cssd_fact_quy_trinh` · trạm 5 **không quét** trên shell | **Đạt** khung + enforce +1 bước (RPC + `validateStationAdvance`) |
| 2 | **Ai** làm từng bước | Cột `nguoi_*_id` → `mdm_nhan_su` trên fact; resolve email/auth/họ tên | **Đạt lưu**; UI chờ/truy vết **PARTIAL** |
| 3 | **Khi nào** (timestamp) | Cột `thoi_gian_*` từng trạm; mẻ có `tk_chot_nap_at` / `tk_mo_form_qc_at` / `thoi_gian_bat_dau|ket_thuc` | **Đạt lưu**; timeline Trace **yếu** |
| 4 | Bộ đang **ở trạm / set nào** | `tram_hien_tai_id` → `cssd_dm_tram`; view `v_cssd_quy_trinh_full.ma_trang_thai_hien_tai`; bản đồ + hàng chờ + tab Kho | **Đạt** vận hành |
| 5 | Tạo–quản lý **phiếu tiệt khuẩn** chuẩn cao | `cssd_fact_lo_tiet_khuan` + QC 3 cấp `tk_qc_json` + BD đầu ngày + recall BI+ | **Đạt pilot**; chưa đủ «chuẩn mực tuyệt đối» (implant CHO_BI write, nhãn QT.20, 3×BI mở máy) |

**Ranh giới đúng (không lệch):** master CRUD ≠ quét; Kho/Truy vết/Recall **không** phải trạm 7; QC trạm (QT.19) ≠ QC mẻ (QT.23); dual-coding `B01.SET.*` / Cycle QR / `LOT-*` qua QR Hub.

---

## 2. Bản đồ cấu phần (route / tab / table / action) — 6 khâu + phiếu TK + kho + truy vết

### 2.1 Shell vận hành

| Surface | Route | Nội dung |
|---------|-------|----------|
| Mega-shell 4 tab | `/cssd-quy-trinh` | `?tab=` trống = Chu trình · `batch` · `kho` · `trace` (+ `?qr=` · `?station=`) |
| Deep link mẻ | `/cssd-erp/batch` | Cùng `MeTietKhuanPage` |
| Báo cáo | `/cssd-erp/report` | Sản lượng / NV / sự cố |
| Sự cố + thu hồi | `/cssd-su-co` | `cssdSuCoBatchRecallHref` · 3 cửa dụng cụ |
| Thiết bị / HC / catalog RO | `/cssd-thiet-bi` · `/cssd-hoa-chat` · `/cssd-dung-cu` | Ngoài shell 6 trạm |

**Page shell:** `src/app/cssd-quy-trinh/page.tsx` → dynamic import từ `contexts/processing-lifecycle/entrypoint` (Chu trình / Mẻ / Kho) + `QRHistoryViewer` (Truy vết).

### 2.2 Sáu khâu

| Trạm | UI | Ghi / gate chính | Table / view |
|------|-----|------------------|--------------|
| 1 Tiếp nhận | `CssdStationFlowMap` + quét | Bootstrap `ma_bo` nếu chưa có QT; vòng mới từ `CAP_PHAT` | `cssd_fact_quy_trinh` |
| 2 Làm sạch | Quét +1 | Soft-warn lot enzyme (`assertLamSachLotSoftGate`) | cùng hub |
| 3 QC (trạm) | Quét +1 | QT.19 — kiểm trước đóng gói | cùng hub |
| 4 Đóng gói | Quét + panel cấu phần | Soft thiếu BOM (Q2); Plasma cấm cellulose; sinh Cycle QR; in tem tối giản | `metadata.bom_lines` · `ma_cycle_qr` |
| 5 Tiệt khuẩn | **Tab Mẻ** (không chọn trên map quét) | Tạo phiếu → nạp bộ `DONG_GOI` → chốt nạp (BD gate) → QC form → đạt→`CAP_PHAT` / fail→rollback | `cssd_fact_lo_tiet_khuan` + `lo_tiet_khuan_id` |
| 6 Cấp phát | Quét / re-scan khi đã `CAP_PHAT` | Hard: mẻ ĐẠT · pack issuable · đóng băng/red-alert; soft ledger BOM | `khoa_nhan_id` · `tinh_trang` · `han_su_dung` |

**SSOT chuyển trạm:** DB `rpc_scan_workflow_station` · mirror app `cssd-state-engine` · patch `tram_hien_tai_id` qua `buildQuyTrinhTramPatch`.

### 2.3 Phiếu TK / Kho / Trace

| Tab | Component chính | Actions / helpers |
|-----|-----------------|-------------------|
| Mẻ | `MeTietKhuanPage` · create/process/list · print portal · modal thu hồi | `cssd-batch.actions` · `persist-me-tiet-khuan` · `use-me-tiet-khuan-workflow` |
| Kho | `KhoDungCuPage` embedded | `cssd-kho-read` trên `v_cssd_quy_trinh_full` (limit lớn — nợ perf) |
| Truy vết | `QRHistoryViewer` | `fetchCssdQrHistory` — bộ + mẻ; lịch sử từ `metadata.ngoai_le` |

---

## 3. Ai / khi nào / ở đâu — fields thực tế lưu

### 3.1 Ở đâu (trạm / bộ)

| Field | Nguồn | Ghi chú |
|-------|-------|---------|
| `tram_hien_tai_id` | `cssd_fact_quy_trinh` | FK `cssd_dm_tram` — SSOT vị trí |
| `ma_trang_thai_hien_tai` | `v_cssd_quy_trinh_full` | Alias đọc cho UI / gate |
| `bo_dung_cu_id` · `ten_bo` · `ma_qr_*` · `ma_cycle_qr` | fact + view | Tem vĩnh viễn vs Cycle |
| `lo_tiet_khuan_id` | fact | Bộ thuộc mẻ nào |
| `is_dong_bang` · `is_red_alert` · `tinh_trang` · `han_su_dung` | fact | An toàn cấp phát |
| `khoa_nhan_id` | fact (sau CP) | Khoa nhận |

### 3.2 Ai + khi nào (6 cột cặp)

| Trạm | Người (`mdm_nhan_su.id`) | Timestamp |
|------|--------------------------|-----------|
| TIEP_NHAN | `nguoi_tiep_nhan_id` | `thoi_gian_tiep_nhan` |
| LAM_SACH | `nguoi_lam_sach_id` | `thoi_gian_lam_sach` |
| QC | `nguoi_kiem_tra_id` | `thoi_gian_qc` |
| DONG_GOI | `nguoi_dong_goi_id` | `thoi_gian_dong_goi` |
| TIET_KHUAN | `nguoi_tiet_khuan_id` | `thoi_gian_tiet_khuan` |
| CAP_PHAT | `nguoi_cap_phat_id` | `thoi_gian_cap_phat` |

**Cách ghi:**

- Quét trạm 1–4 (+ vòng mới): RPC stamp `now()` + resolve operator từ `p_operator_label` (email NV).
- Mẻ ĐẠT: `persist-me-tiet-khuan` stamp **cùng lúc** `thoi_gian_tiet_khuan` + `thoi_gian_cap_phat`, gán cả `nguoi_tiet_khuan_id` và `nguoi_cap_phat_id` = người unload/QC, `tram` → `CAP_PHAT`, `tinh_trang=BINH_THUONG`, gán HSD theo `so_ngay_han_dung`.
- Re-scan `CAP_PHAT` khi đã ở kho sạch: cập nhật lại `nguoi_cap_phat_id` / `thoi_gian_cap_phat` + `khoa_nhan_id` (xác nhận giao).

**Hàng chờ UI:** `CSSDWaitingItem` có `nguoi_tram_truoc` / `thoi_gian_tram_truoc` / `tram_truoc` (map từ cột cặp — `cssd-read.actions`).

**Lệch nhận thức:** sau mẻ ĐẠT, «người cấp phát» tạm = người QC mẻ cho đến khi re-scan giao khoa. Đúng với mô hình «CAP_PHAT = kho sạch + xác nhận giao», nhưng báo cáo «ai giao khoa» cần dựa trên lần re-scan (hoặc chưa có nếu chưa quét lại).

### 3.3 Mẻ — ai / khi

| Field | Ý nghĩa |
|-------|---------|
| `tk_chot_nap_at` · `thoi_gian_bat_dau` | Chốt nạp / bắt đầu chu trình máy |
| `tk_mo_form_qc_at` · `thoi_gian_ket_thuc` | Mở QC / kết thúc |
| `ket_qua_test` | boolean ĐẠT / không |
| `tk_qc_json` | Physical / CI / BI / BD-on-form + ảnh + `nguoiLoad`/`nguoiUnload` |
| Máy `specs.bd_dau_ngay_ymd` · `bd_dau_ngay_ket_qua` | BD **đầu ngày** (≠ BD trên form mẻ) |

### 3.4 Truy vết — khoảng trống

`fetchCssdQrHistory` **không** dựng timeline từ 6 cột `thoi_gian_*`/`nguoi_*`. Chỉ ghép `metadata.ngoai_le[]` (ngoại lệ / sự kiện append).  
→ User goal «ai/khi nào theo chu kỳ» trên tab Trace = **PARTIAL**: dữ liệu có trên fact/report, UI Trace chưa đủ.

---

## 4. Phiếu tiệt khuẩn: tạo–sửa–in–đóng–recall / BD gate

| Bước | Hiện trạng | Đánh giá |
|------|------------|----------|
| **Tạo** | Chọn máy + người load; ghi BD đầu ngày trên form tạo (steam); `assertSteamDailyBdForLoad({ requireRecorded: true })` khi tạo & chốt nạp | **Đạt** QT.21 hard |
| **Nạp bộ** | Chỉ bộ đang `DONG_GOI`; khóa sau `tk_chot_nap_at` | **Đạt** |
| **Sửa / process** | Quét thêm trước chốt; thông số máy; form QC 3 cấp + ảnh | **Đạt pilot** |
| **In** | `CssdBatchPrintView` / `onPrintBatch` — đủ QC proof + BD form | **Đạt** phiếu mẻ |
| **Đóng (ĐẠT)** | → bộ `CAP_PHAT` + HSD + `BINH_THUONG`; append ngoại lệ | **Đạt** |
| **Đóng (Không đạt)** | Rollback `DONG_GOI` + sự cố + recall theo `lo_tiet_khuan_id` + máy `HOLD_QC` | **Đạt** (SC-10 / QT.24) |
| **Recall chủ động** | Link «Thu hồi theo mẻ» + modal `batchRecallEntry` / deep-link `/cssd-su-co` | **Đạt** entry UI (trước đây P0) |
| **BD đầu ngày** | Helper + UI ghi trên create-step + gate create/chốt | **Đạt** (đã harden sau audit 09-04) |
| **Implant / CHO_BI** | Label UI đọc `tk_qc_json` quarantine — **chưa** write-path đầy đủ chặn `HOAN_THANH` | **PARTIAL / P1** |
| **3× BI(−) mở máy** | Spec ghi nhận chưa auto | **GAP P1** |
| **Nhãn Cycle QR QT.20** | `printCycleLabel` chỉ `qrCode` + `tenBo` — **thiếu** ngày đóng gói, HSD, người đóng gói, **số mẻ** | **PARTIAL P0/P1** |

**Cổng cấp phát (liên quan phiếu):** `assertPackIssuable` wired workflow + re-scan — chặn thiếu `tinh_trang`/HSD, ướt/rách/hỏng, red-alert, đóng băng; mẻ chưa QC / fail → lỗi. Soft BOM giữ Q2.

---

## 5. Lệch domain / SOP / triển khai (P0–P2)

### P0 — trước/cùng pilot sâu (an toàn hoặc đúng nhãn QT)

| ID | Lệch | Evidence | Hướng xử lý (không làm hết pass này) |
|----|------|----------|--------------------------------------|
| P0-1 | Tem chu trình **chưa đủ QT.20** (thiếu số mẻ / HSD / người / ngày ĐG) | `usePrint.printCycleLabel` minimal | Mở rộng payload in từ fact + `lo_tiet_khuan` sau ĐG/mẻ |
| P0-2 | Tab **Trace** không hiện đủ ai/khi 6 khâu | `cssd-qr-history.actions` chỉ `ngoai_le` | Timeline từ cột `thoi_gian_*`/`nguoi_*` (+ ngoại lệ) |
| P0-3 | (Giám sát) Đảm bảo NV **re-scan CAP_PHAT** khi giao khoa — nếu không, báo cáo «người cấp phát» = người QC mẻ | `persist-me-tiet-khuan` stamp kép | SOP pilot + optional soft-warn UI «chưa xác nhận giao» |

*Đã đóng so với audit 09-04:* BD hard thiếu/KHONG_DAT · pack wet/expiry · entry thu hồi mẻ.

### P1 — chuẩn mực / PCI đầy đủ hơn

| ID | Lệch |
|----|------|
| P1-1 | `CHO_BI` / implant: thiếu write + chặn cấp phát khi quarantine |
| P1-2 | 3× BI(−) trước khi nhả `HOLD_QC` |
| P1-3 | QT.18: POU tại tiếp nhận; lot enzyme/washer capture đầy đủ (hiện soft-warn) |
| P1-4 | Cấp phát FEFO theo khoa + phiếu lĩnh BM.03 + trả nonconforming |
| P1-5 | Multi-patient sterilized set ban; IUSS cấm implant (policy) |
| P1-6 | Trace ↔ SSI đã có hook NKBV — cần UAT ký tay |

### P2 — IA / perf / debt

| ID | Lệch |
|----|------|
| P2-1 | Mega-shell 4 tab + `ssr:false` — nặng (xem audit perf 09-07) |
| P2-2 | Kho `select *` limit 8000 trên `v_cssd_quy_trinh_full` |
| P2-3 | Operator resolve email full-scan `mdm_nhan_su` khi không có `auth_user_id` |
| P2-4 | Pilot checklist còn ô BOM modal cũ — doc lệch nhẹ so code (đã bỏ modal) |

---

## 6. UI thừa / mega-shell 4 tab — nhận xét

**Đúng nghiệp vụ khi gom:** Chu trình + Mẻ + Kho + Trace phục vụ **một ca CSSD** (quét → hấp → xem tồn → tra QR) không nhảy sidebar.

**Chi phí:**

- Một `page.tsx` client hydrate 4 panel dynamic; Mẻ là workflow state machine lớn (create/process/list/print/incident).
- Tab Kho trùng cảm giác với `/cssd-dung-cu` + tồn trên quy trình (dual surface đã chốt domain nhưng UX «hai kho»).
- Trace là icon Search tách nhóm — dễ bỏ sót; lại là nơi user kỳ vọng goal #2–#3 nhưng dữ liệu timeline mỏng.
- Trạm 5 trên map **không** chọn được (đúng) nhưng chip «Mẻ» / tab Batch phải đủ nổi — rủi ro NV cố quét TK trên shell (đã có message chặn).

**Khuyến nghị IA (không implement):** giữ 4 tab pilot; P1 tách Trace thành panel «timeline đủ cột» hoặc deep-link report staff; cân nhắc Kho = filter sẵn `CAP_PHAT` + FEFO thay full dump.

---

## 7. Kế hoạch hoàn thiện ưu tiên (không implement hết)

1. **P0-1** Nhãn Cycle QR đủ QT.20 (số mẻ bắt buộc khi đã vào mẻ; trước mẻ ghi «chưa có số mẻ»).  
2. **P0-2** Trace timeline từ 6 cột người/giờ + `ngoai_le` + link mẻ.  
3. **P0-3** Checklist pilot: bắt buộc re-scan CP khi giao khoa; đào tạo soft-warning BOM.  
4. **P1-1** Implant `CHO_BI` write + gate cấp phát.  
5. **P1-2** Đếm BI(−) / quy trình mở máy sau HOLD_QC.  
6. **P1-3** Capture POU + lot LS (từ soft → bắt buộc theo QT.18 khi PO chốt).  
7. **P2** Phân trang Kho / giảm bulk; đo lại perf shell.  
8. Cập nhật `pilot-test-checklist.md` (bỏ wording BOM modal; thêm BD đầu ngày · pack gate · thu hồi · QT.20).

---

## 8. Verdict

| Tiêu chí | Kết luận |
|----------|----------|
| **Khoa học / logic domain** | **Đủ** — 6 trạm map PCI QT.18–22, tách QC trạm/mẻ, mẻ + BD + recall + pack gate khớp SOP đã chốt PO. |
| **Đủ cho pilot vận hành** | **Có** — quét chu trình, biết bộ ở đâu, lưu ai/khi trên fact, tạo–chạy–in–đóng phiếu TK, chặn cấp phát gói xấu, thu hồi theo mẻ, BD đầu ngày hard. Vitest helpers xanh. |
| **Chuẩn mực «cao nhất» (QT đầy đủ + truy vết PO-grade)** | **Chưa** — nhãn QT.20 thiếu trường; Trace chưa kể đủ ai/khi; implant CHO_BI & 3×BI mở máy còn P1; LS/POU còn mềm. |
| **Khuyến nghị** | **Pilot có kiểm soát** với đào tạo P0-3 + vá P0-1/P0-2 trước go-live rộng; không cần đảo mô hình 6 trạm. |

---

### Phụ lục — file code then chốt

| Vai trò | Path |
|---------|------|
| Shell tabs | `src/app/cssd-quy-trinh/page.tsx` |
| Quét / gate | `workflow/application/cssd-workflow-application.ts` · `actions/cssd-scan.actions.ts` · RPC `rpc_scan_workflow_station` |
| Mẻ | `views/MeTietKhuanPage.tsx` · `actions/cssd-batch.actions.ts` · `helpers/persist-me-tiet-khuan.ts` |
| BD / pack | `src/lib/domain/cssd-steam-daily-bd.ts` · `cssd-pack-issuance.ts` |
| Recall | `modules/cssd-su-co/domain/cssd-batch-recall.ts` · `application/batch-recall-hold.application.ts` |
| Routes | `src/lib/cssd-routes.ts` |
| Ai/khi map | `cssd-incident-trace.ts` · `cssd-analytics-core.ts` |

*Hết audit 2026-09-08.*

## _agent-quy-trinh-sw-process-fix-20260908

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md). Tra cứu lịch sử được.

# Vá phần mềm — quy trình xử lý dụng cụ (tem / truy vết / cảnh báo giao khoa)

> **Ngày:** 2026-09-08 (Asia/Ho_Chi_Minh) · **Máy:** `Desktop/ksnk_bv103` · **Phạm vi:** local only, không commit/push.  
> Ngôn ngữ: phần mềm / vận hành — không dùng mã thủ tục trong báo cáo hay chuỗi UI mới.

---

## Vấn đề (phần mềm)

1. **Tem chu trình** sau Đóng gói chỉ in mã + tên bộ → thiếu số mẻ/lô, HSD, người đóng gói, ngày đóng gói (tem khó dùng tại kho/khoa).
2. **Tab Truy vết** chỉ hiện `metadata.ngoai_le` → không thấy ai/khi nào theo 6 khâu dù dữ liệu đã lưu trên fact.
3. Sau mẻ **Đạt**, hệ thống stamp cùng lúc Tiệt khuẩn + Cấp phát (người QC mẻ). Nếu chưa quét lại khi giao khoa, UI không nhắc → dễ hiểu nhầm «người cấp phát» trên phiếu.

---

## Đã sửa

### A — Tem chu trình đủ trường
- Mở rộng `printCycleLabel` (HTML nhiệt) với các dòng: mã bộ, mã chu trình, số mẻ/lô (hoặc «Chưa vào mẻ»), HSD, người đóng gói, ngày đóng gói — thiếu thì «Chưa có».
- Action `fetchCssdCycleLabelData(quyTrinhId)` đọc `cssd_fact_quy_trinh` + `cssd_fact_lo_tiet_khuan` khi đã gắn mẻ.
- Sau Đóng gói, trang chu trình lấy dữ liệu rồi mới mở lệnh in.

### B — Timeline truy vết 6 khâu
- Helper thuần `buildCssdStationTimeline` / `mapCssdNgoaiLeEvents`.
- `fetchCssdQrHistory` resolve tên nhân sự và trả `timeline` + `ngoaiLe`.
- `QRHistoryViewer` hiện 6 khâu theo thứ tự (chưa ghi / đang ở khâu / đã ghi), kèm ngoại lệ; hiện mã mẻ nếu có.

### C — Soft-warn giao khoa
- Helper `needsCssdKhoaHandoffSoftWarn` suy ra từ `trang_thai = CAP_PHAT` và `khoa_nhan_id` null (không đổi mô hình stamp kép).
- Hiện cảnh báo: *«Chưa quét xác nhận giao khoa — người trên phiếu mẻ vẫn là người QC mẻ»* trên:
  - hàng chờ Cấp phát
  - Kho (cột trạng thái)
  - Truy vết
  - thẻ quét thành công khi còn thiếu khoa nhận
- Không hard-block; re-scan Cấp phát (có khoa) làm hết cảnh báo.

---

## File đụng

| File | Vai trò |
|------|---------|
| `src/lib/domain/cssd-station-timeline.ts` (+ `.spec.ts`) | Timeline 6 khâu + soft-warn |
| `src/modules/cssd-erp/lib/cssd-cycle-label-html.ts` (+ `.spec.ts`) | HTML/meta tem chu trình |
| `src/modules/cssd-erp/actions/cssd-cycle-label.actions.ts` | Đọc dữ liệu in tem |
| `src/hooks/usePrint.ts` | In tem chu trình đủ trường |
| `src/modules/cssd-erp/views/CSSDERPPage.tsx` | Gọi fetch trước khi in |
| `src/modules/cssd-erp/actions/cssd-qr-history.actions.ts` | Timeline + cảnh báo |
| `src/modules/cssd-erp/components/history/QRHistoryViewer.tsx` | UI timeline |
| `src/modules/cssd-erp/actions/cssd-read.actions.ts` | `khoa_nhan_id` hàng chờ CP |
| `src/modules/cssd-erp/types/cssd.types.ts` | Field waiting |
| `src/modules/cssd-erp/components/waiting-list/WaitingList.tsx` | Soft-warn |
| `src/modules/cssd-erp/views/KhoDungCuPage.tsx` | Soft-warn kho |
| `src/modules/cssd-erp/actions/cssd-scan.actions.ts` | Trả `canhBaoGiaoKhoa` |
| `src/modules/cssd-erp/hooks/useCSSDWorkflow.ts` | Đưa flag lên thẻ quét |
| `src/modules/cssd-erp/components/scan/QRScanSuccessCard.tsx` | Soft-warn trên thẻ |

---

## Cách kiểm tra tay

1. **Tem:** Quét Đóng gói → popup in tem có dòng «Chưa vào mẻ» / người + giờ đóng gói (nếu đã stamp). Sau khi bộ vào mẻ đạt, in lại (nếu có đường in) thấy mã mẻ + HSD khi đã có.
2. **Truy vết:** `?tab=trace` quét mã bộ/chu trình → thấy 6 khâu; khâu chưa stamp = «Chưa ghi»; ngoại lệ tách riêng; hiện mã mẻ nếu có.
3. **Cảnh báo:** Sau mẻ Đạt, mở hàng chờ Cấp phát hoặc Kho — bộ chưa có `khoa_nhan_id` hiện soft-warn. Quét lại Cấp phát (có khoa nhận) → cảnh báo hết.

---

## Kiểm thử tự động

- `vitest` focused: `cssd-station-timeline.spec.ts`, `cssd-cycle-label-html.spec.ts`.

---

## P1 còn lại (không chặn A/B/C)

- In lại tem chu trình từ Kho/Truy vết (nút riêng) khi đã vào mẻ — hiện auto-print chủ yếu sau Đóng gói.
- Write-path implant/quarantine chặn cấp phát (đã ghi ở audit domain cùng ngày).
- Cờ metadata riêng «đã re-scan giao» — chưa thêm; đang suy ra từ `khoa_nhan_id` (an toàn hơn).

## _agent-su-co-bao-cao-deep-audit-20260908

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md) (sự cố). Tra cứu lịch sử được.

# Deep audit — báo cáo sự cố CSSD (`/cssd-su-co`) — 2026-09-08

> Pass 2 (khoa học / logic / chuẩn mực). **Không** lặp narrative pass 1 (tách 3 cửa UI, Dialog điều chuyển, gỡ mã thủ tục).  
> Phạm vi: `src/modules/cssd-su-co` + domain liên quan `cssd-set-reconcile` · **chỉ local** · không commit/push.  
> Không dùng mã QT/PCI trong UI mới hay báo cáo này.

---

## 1. Mục tiêu & phạm vi

| Hạng mục | Nội dung |
|----------|----------|
| Mục tiêu | Rà soát end-to-end mô hình domain, ma trận field, vòng đời, side effect, UX list/detail/in, tìm lệch P0/P1 thật và sửa có trọng tâm |
| Trong phạm vi | Taxonomy 6 nhóm + 3 cửa dụng cụ; validate FE/BE; submit → persist → ledger/recall/BD; xác nhận phiếu; duyệt BOM; biên bản in; RBAC `BAO_SU_CO` |
| Ngoài phạm vi | Redesign nhật ký analytics (`?tab=incident`); đổi schema DB; bỏ D4 collapse typeId (cần PO); FEFO hóa chất đầy đủ |

Pass trước đã ổn: tách cửa UI, validate theo cửa trên form, Dialog điều chuyển, nhãn ngắn, không lẫn thu hồi mẻ với 3 cửa dụng cụ.

---

## 2. Mô hình domain (khoa học)

### 2.1 Taxonomy — 6 nhóm

| Nhóm | Bản chất nghiệp vụ | Type / nguyên nhân | Đánh giá |
|------|--------------------|--------------------|----------|
| **PROCESS** | Lỗi chuỗi xử lý bộ (khâu gốc ± trung gian) | Một mã nội bộ `PROCESS_CHAIN_FAIL` | Đúng: không picker loại; bắt buộc khâu lỗi + phát hiện **sau** lỗi; checklist trung gian sanitize theo index |
| **BATCH** | QC mẻ / BI+ / gói tiếp xúc / thông số | Multi-select 4 preset; entry thu hồi 3 lý do | Đúng SC-10; fault cố định Tiệt khuẩn; detection TK / Cấp phát / Người dùng |
| **INSTRUMENT** | Biến động dụng cụ (không phải sự cố an toàn chu trình) | 3 cửa: Hỏng/Mất · Đổi danh mục · Điều chuyển | Đúng tách bạch; **không** rollback trạm |
| **EQUIPMENT** | Máy hỏng / thông số / bảo trì / BD | Multi-select; BD chặn nạp mẻ (ghi specs máy) | Đúng; BD không kích SC-10 thu hồi mẻ |
| **CHEMICAL** | Thiếu / hết hạn / sai nồng độ | Multi-select; entity qua field `machineId` (UUID HC) | Logic nguyên nhân ổn; **tên field tái dùng máy** dễ nhầm sổ/log |
| **OTHER** | Mô tả tự do | `OTHER_CUSTOM` + vị trí phát hiện | Đủ cho “khác” |

**Cause class** (`SC_QUY_TRINH` / `SC_CHU_QUAN` / `SC_HE_THONG`) map lookup `LOAI_SU_CO` — tách đúng “bản chất nguyên nhân” khỏi nhóm nghiệp vụ. Mặc định EQUIPMENT/CHEMICAL → hệ thống là hợp lý.

**Severity:** không có thang severity độc lập (chỉ `is_red_alert` khi ≥2 sự cố cùng QR). Đủ cho pilot; chưa chuẩn ISO severity grading — ghi P2.

### 2.2 Cross-contamination giữa nhóm / cửa

| Rủi ro | Cơ chế chặn | Còn lỗ |
|--------|-------------|--------|
| Tab sai nhóm | Tab UI + `incidentGroup` trong payload + validate theo nhóm | API vẫn có thể gửi group A + field group B nếu bỏ qua FE — schema Zod không cấm field thừa |
| Hỏng/Mất lẫn Đổi danh mục | FE: `validateInstrumentDoorLines(PHYSICAL)` / `validateCatalogReconcileDoorLines` | **Trước pass này:** BE sau D4 (`typeId=SET_RECONCILE`) nhận gói lẫn / phiếu KHOP-only → **đã chặn** |
| Thu hồi mẻ mở 3 cửa dụng cụ | Entry banner + không render cửa INSTRUMENT | OK |
| PROCESS legacy batch codes | Coerce → BATCH | OK đọc sổ cũ |

### 2.3 Vòng đời trạng thái

Hai trục song song (dễ nhầm nếu gọi chung “approve”):

```
Phiếu sự cố chung:
  tạo (OPEN / chưa xác nhận) → xác nhận (DA_XAC_NHAN)
  Không có reject / close riêng; vô hiệu = is_active=false (ít dùng UI)

Cửa Đổi danh mục (SET_RECONCILE_STATUS):
  DRAFT → gửi → BOM_PENDING → BOM_APPROVED | BOM_REJECTED
  Cửa Hỏng/Mất / Điều chuyển: SET_RECONCILE_STATUS = NONE (ghi sổ ngay)
```

So với kỳ vọng “draft → submit → approve/reject → close”: **chưa đủ một FSM thống nhất**; xác nhận phiếu ≠ duyệt BOM. Cần tài liệu hóa rõ cho NV (P1 UX/docs, không phải bug code).

### 2.4 RBAC

| Hành động | Gate |
|-----------|------|
| Tạo / xác nhận phiếu | `BAO_SU_CO` create (`verifyCssdIncidentCreate`) — **cùng gate** |
| In / list gần đây | create **hoặc** view |
| Duyệt/từ chối BOM | `DC_LE`/`BO_DC` edit |
| Thu hồi mẻ | Không gate riêng — ai tạo BATCH được là kích SC-10 |

**Lệch:** người tạo cũng xác nhận được phiếu của mình; không tách “trưởng kíp duyệt”. Chấp nhận được nếu quy chế khoa cho phép peer-confirm; nếu cần four-eyes → P1 product.

---

## 3. Ma trận field theo loại (+ cửa)

Ký hiệu: **B** bắt buộc · **O** tùy chọn · **F** cấm / không hiện · **S** side-effect

| Field | PROCESS | BATCH | INSTRUMENT Hỏng/Mất | INSTRUMENT Đổi DM | INSTRUMENT Chuyển | EQUIPMENT | CHEMICAL | OTHER |
|-------|---------|-------|---------------------|-------------------|-------------------|-----------|----------|-------|
| Mô tả | B | B | B | B | B | B | B | B |
| Trạm phát hiện | B | B* | B (thường QC) | B | B | B | B | B (+ vị trí text) |
| Khâu lỗi | B | cố định TK | O (default QC) | F logic | F logic | — | — | O (rollback target) |
| Khâu trung gian | O (sanitize) | F | F | F | F | F | F | F |
| Checklist nguyên nhân | F | B (≥1) | F | F | F | B | B | F |
| QR / bộ | O (có thì trace) | O nếu đủ lô | B | B | B | F | F | F |
| Mã lô / id mẻ | O (context TK) | B | F | F | F | F | O (lô HC) | F |
| Máy TK / máy SC | O | B | F | F | F | B | F | F |
| Hóa chất (`machineId`) | F | F | F | F | F | F | B | F |
| Bảng dòng thành phần | F | F | B (≥1 HONG/MAT) | B (≥1 catalog) | B (kho hoặc 2 bộ) | F | F | F |
| Ảnh minh chứng | O | O | B nếu có HONG | O | B nếu kho | O | O | O |
| Người phát hiện / liên quan | O | O (+ cycle) | O | O | O | O | O | O |
| Cause class | O (default) | O | O | O | O | O (default hệ thống) | O (default hệ thống) | O |

\* BATCH: detection locale `NGUOI_SU_DUNG` map DB → `CAP_PHAT`.

### Cờ so với nghiệp vụ thật

| Vấn đề | Mức | Ghi chú |
|--------|-----|---------|
| CHEMICAL tái dùng `machineId` | P2 | In biên bản hiện UUID thô |
| Không FEFO / quarantine lot HC trên submit | P2 | Pilot S3 kỳ vọng liên kết kho — chưa thấy trong `executeIncidentReportAndRollback` |
| D4: `INCIDENT_TYPE_CODE` Hỏng/Mất = `SET_RECONCILE` | P1 sổ | Khó lọc nhật ký “chỉ Hỏng/Mất”; suy từ snapshot dòng |
| PROCESS không bắt buộc QR khi không có bộ | OK | Sự cố khâu không gắn bộ |
| BATCH multi-cause: primary type = phần tử đầu (không `BATCH_MULTI`) | P2 | EQUIPMENT/CHEMICAL có `*_MULTI`; BATCH không đồng nhất |

---

## 4. Luồng trạng thái + side effect

### 4.1 Create path (tóm tắt)

1. Zod `cssdIncidentReportInputSchema`  
2. `validateIncidentSubmitRules` (nhóm)  
3. Dedup BATCH cùng quy trình + lô + typeId (cần `confirmDuplicate`)  
4. Insert/update `cssd_fact_su_co` + attributes  
5. INSTRUMENT + setReconcile → `applySubmittedSetReconcile` → ledger / engraved / BOM_PENDING  
6. Non-INSTRUMENT + có quy trình → policy rollback / freeze / red alert  
7. SC-10 → `applyBatchRecallAndHoldMachine`  
8. BD fail → patch `cssd_dm_thiet_bi.specs`  
9. Catch: rollback quy trình + **xóa** phiếu (anti-orphan một phần)

### 4.2 Side effect theo nhóm

| Nhóm / cửa | Rollback trạm | Freeze | Red alert | Ledger / master | Khác |
|------------|---------------|--------|-----------|-----------------|------|
| PROCESS | Về khâu lỗi | Không (trừ SC-10 legacy) | ≥2 QR | — | Exception + lifecycle |
| BATCH / SC-10 | Thu hồi cả mẻ | Đóng gói → đóng băng | như trên | — | Máy READY→HOLD_QC |
| INSTRUMENT Hỏng/Mất | **Không** | **Không** | có thể gắn cờ đỏ QT | BAO_HONG/BAO_MAT −qty | Ghi chú chi tiết |
| INSTRUMENT Đổi DM | Không | Không | — | Chờ duyệt → apply BOM | Blocking draft/pending |
| INSTRUMENT Chuyển | Không | Không | — | DIEU_CHUYEN / BO_SUNG / TRA_KHO | Transfer BOM nếu 2 QT |
| EQUIPMENT | Ở chỗ + freeze | Có | — | BD→specs KHONG_DAT | Không thu hồi mẻ |
| CHEMICAL | Freeze nếu gắn QT | Có | — | Không quarantine lot | |
| OTHER | fault hoặc bước trước | Không | — | — | |

### 4.3 Idempotency / double-submit / orphan

| Cơ chế | Đánh giá |
|--------|----------|
| Dedup BATCH | Có; chỉ khi có `quyTrinh` + lô + type khớp |
| Draft SET_RECONCILE | Update theo `draftIncidentId`; TTL draft |
| Pending BOM / bộ | Chặn phiếu catalog thứ hai |
| Catch xóa phiếu | Giảm orphan khi ledger fail; race double-click vẫn có thể 2 phiếu OPEN (không idempotency key chung) |
| Xác nhận | `assertIncidentPhieuCanConfirm` — không xác nhận lại |

---

## 5. List / detail / print / history UX

| Surface | Hiện trạng | Lệch |
|---------|------------|------|
| `/cssd-su-co` | Form + “Phiếu gần đây của tôi” (≤8, filter reporter) | Empty state yếu khi không có phiếu; không filter nhóm/status |
| Nhật ký | `/cssd-erp/report?tab=incident` (ngoài module) | Không audit sâu pass này |
| In biên bản | `IncidentPrintView` | **Trước fix:** thiếu nhãn BATCH; INSTRUMENT = “Hỏng hóc”; copy “Đóng băng” **sai** so policy; thu hồi chỉ hiện khi group=PROCESS |
| Detail theo type | In có nhánh MACHINE/HC/lô; bảng snapshot dụng cụ | CHEMICAL in UUID; không resolve tên HC |
| Performance | Form tách field components; print lazy sau submit | List approve BOM filter client 80 rows — residual P2 |

---

## 6. Lệch P0 / P1 / P2 (mới — so với pass trước)

### P0
*Không còn P0 blocker sau fix pass này.* (Pass trước đã xử lý lẫn UI hai cửa.)

### P1 (mới)

| # | Lệch | Ảnh hưởng | Xử lý pass này |
|---|------|-----------|----------------|
| P1-1 | Biên bản in: thiếu nhóm BATCH; nhãn INSTRUMENT sai; copy đóng băng **mâu thuẫn** `skipWorkflowRollback` | Biên bản pháp lý / đào tạo sai | **Đã sửa** — `cssd-incident-print` + `IncidentPrintView` |
| P1-2 | Thu hồi/HOLD_QC trên in chỉ hiện khi `PROCESS` (BATCH SC-10 bị ẩn) | Biên bản thu hồi mẻ thiếu thông tin | **Đã sửa** — hiện cho PROCESS **và** BATCH |
| P1-3 | BE `validateInstrumentDoorLines(SET_RECONCILE)` sau D4 chấp nhận gói **lẫn** Hỏng/Mất+Đổi DM và phiếu **không hành động** | Integrity API / bỏ qua FE | **Đã sửa** — `SET_RECONCILE_MIXED_DOOR_MESSAGE` / `NEED_ACTION` |
| P1-4 | D4: typeCode Hỏng/Mất collapse → SET_RECONCILE trên sổ | Lọc nhật ký / KPI cửa | **Chưa đổi typeId** (PO); in suy cửa từ snapshot |
| P1-5 | Xác nhận phiếu cùng quyền tạo | Four-eyes | Ghi nhận — không đổi gate |

### P2

- CHEMICAL `machineId` naming + in UUID  
- Không FEFO/quarantine HC trên submit  
- BATCH primary type không `BATCH_MULTI`  
- Dedup BATCH yếu khi không gắn quy trình  
- INSTRUMENT_TRANSFER/REPLENISH trước đây thiếu `return null` sau validate OK (đã vá fall-through)  
- Severity grading / close state thiếu  
- `isInstrumentIncidentImageRequired` vẫn legacy-only (form đã bắt ảnh theo dòng HONG)  
- List BOM approve filter in-memory  

---

## 7. Đã sửa trong pass này

1. **Domain validate D4** (`cssd-set-reconcile.ts`): chặn lẫn cửa + phiếu SET_RECONCILE không hành động; early-return rõ cho TRANSFER/REPLENISH.  
2. **Vitest** case mới trong `cssd-set-reconcile.spec.ts`.  
3. **`cssd-incident-print.ts` (+ spec)**: nhãn 6 nhóm; suy cửa từ dòng; solution khớp side-effect thật.  
4. **`IncidentPrintView.tsx`**: dùng helper; hiện thu hồi/HOLD cho BATCH.  

**Không** invent churn: không đụng lại UI 3 cửa / Dialog / strip QT.

Kiểm tự động: `npx vitest run src/lib/domain/cssd-set-reconcile.spec.ts src/modules/cssd-su-co/domain/` → **76 passed**. `tsc --noEmit` sạch trên touched paths.

---

## 8. Verdict: đủ chuẩn mực? Gap còn lại

**Verdict:** Đủ **chuẩn mực pilot / vận hành CSSD** sau pass 1+2 cho luồng tạo–ghi sổ–thu hồi–in cơ bản. **Chưa** đủ chuẩn sổ cái dài hạn / four-eyes / hóa chất FEFO nếu khoa yêu cầu ISO đầy đủ.

**Gap còn lại (ưu tiên):**
1. Quyết định PO: lưu cửa INSTRUMENT trên attributes / typeCode thay vì chỉ D4 collapse.  
2. Four-eyes xác nhận phiếu (gate riêng).  
3. CHEMICAL: field riêng + resolve tên trên in + quarantine lot nếu nghiệp vụ bắt buộc.  
4. FSM thống nhất / docs NV: phân biệt xác nhận phiếu vs duyệt BOM.  
5. Idempotency key submit chung.

---

## 9. Checklist kiểm tay

1. Tab **Dụng cụ → Hỏng/Mất**: giảm đếm → Hỏng → Gửi → in biên bản: nhóm “Dụng cụ”, phương án **không** nói đóng băng; sổ giảm đúng.  
2. Tab **Đổi danh mục**: sửa chuẩn → Gửi → BOM_PENDING; duyệt bằng tài khoản DC_LE/BO_DC.  
3. Tab **Điều chuyển**: Dialog → kho↔bộ → Gửi → ledger.  
4. **Thu hồi theo mẻ**: BI+ + mã lô → thu hồi đa bộ; in hiện “Thu hồi cả mẻ” + HOLD_QC nếu máy sẵn sàng; nhóm “Mẻ tiệt khuẩn”.  
5. Tab **Quy trình**: khâu lỗi trước phát hiện; checklist trung gian chỉ station giữa.  
6. Tab **Máy**: chọn BD không đạt → specs máy KHONG_DAT ngày VN.  
7. Tab **Hóa chất**: bắt buộc chọn HC + ≥1 nguyên nhân.  
8. Xác nhận phiếu gần đây → không bấm lại được.  
9. (Dev) vitest như mục 7.

---

## 10. File chạm (pass 2)

- `src/lib/domain/cssd-set-reconcile.ts` (+ `.spec.ts`)
- `src/modules/cssd-su-co/domain/cssd-incident-print.ts` (+ `.spec.ts`) **mới**
- `src/modules/cssd-su-co/components/IncidentPrintView.tsx`
- `src/modules/cssd-su-co/domain/cssd-incident-trace.ts` (comment helper ảnh)
- `docs/modules/cssd/_agent-su-co-bao-cao-deep-audit-20260908.md` **mới**

---

## 11. Cross-link — PO gaps đã chốt (2026-09-08)

Pass riêng: [`_agent-su-co-po-gaps-fix-20260908.md`](#_agent-su-co-po-gaps-fix-20260908).

1. Hỏng/Mất: typeCode `INSTRUMENT_PHYSICAL` (hết D4 collapse).  
2. Four-eyes xác nhận + tách người phát hiện / người tạo.  
3. CHEMICAL: `chemicalId` + quarantine specs + cổng xuất kho.

## _agent-su-co-dung-cu-audit-fix-20260908

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md) (sự cố). Tra cứu lịch sử được.

# Audit + fix module sự cố dụng cụ — 2026-09-08

> Phạm vi: `/cssd-su-co` + `src/modules/cssd-su-co` · **chỉ local** · không commit/push.

## 1. Bản đồ loại (SSOT v2 trong code)

| Nhóm | UI chọn loại | Trường / hành động chính | Ghi chú tách bạch |
|------|--------------|--------------------------|-------------------|
| **PROCESS** | Không picker loại (mã nội bộ `PROCESS_CHAIN_FAIL`) | Bộ (tuỳ chọn) · Khâu lỗi · Phát hiện tại · checklist khâu trung gian · truy vết người chu kỳ | `tramPhatHien` sau `tramLoi` |
| **BATCH** | Multi-select nguyên nhân mẻ (hoặc lý do thu hồi khi entry thu hồi) | Bộ · Mã lô · Máy TK · Khâu lỗi cố định Tiệt khuẩn · Nơi phát hiện | Entry thu hồi **không** mở 3 cửa dụng cụ |
| **INSTRUMENT** | 3 cửa: **Hỏng/Mất** · **Đổi danh mục** · **Điều chuyển** | Theo cửa (xem dưới) | Không lẫn với sự cố an toàn PROCESS/BATCH |
| **EQUIPMENT** | Multi-select nguyên nhân máy | QR/chọn máy | Không TypePicker |
| **CHEMICAL** | Multi-select nguyên nhân HC | Chọn HC · mã lô tuỳ chọn | Không TypePicker |
| **OTHER** | Một mã `OTHER_CUSTOM` | Vị trí phát hiện | — |

### Ba cửa dụng cụ (INSTRUMENT)

| Cửa | Hành động | Hiệu lực |
|-----|-----------|----------|
| **Hỏng/Mất** | Giảm số đếm → chọn Hỏng/Mất | Ghi sổ ngay |
| **Đổi danh mục** | Sửa mã/tên/chuẩn · thêm/xóa dòng | Chờ duyệt |
| **Điều chuyển** | Kho↔bộ hoặc bộ↔bộ | Phiếu chuyển riêng |

## 2. Lệch tìm thấy (trước fix)

| Mức | Lệch |
|-----|------|
| **P0** | Cửa **Hỏng/Mất** và **Đổi danh mục** dùng chung một bảng mega-form: vừa sửa danh mục vừa bấm Hỏng/Mất → dễ lập nhầm / lẫn nghiệp vụ |
| **P0** | Validate form gộp PHYSICAL → `SET_RECONCILE` trước khi kiểm dòng → không chặn đổi danh mục trên cửa Hỏng/Mất |
| **P1** | Chuỗi UI còn mã thủ tục (`QT.24`, gợi ý `PCI`) trên banner / title / modal |
| **P1** | Nhãn dài (nhóm, meta, máy/HC) — nhiều chrome, khó quét mắt |
| **P2** | Cửa **Điều chuyển** vẫn DualPane hai khung cố định (Transfer/Replenish) — chưa chuyển Dialog; đổi lớn, để pass sau |
| **P2** | `InstrumentIncidentFields.tsx` legacy gần như chết; TypePicker còn trong CHEMICAL/EQUIPMENT nhưng đã `hideType` |

## 3. Đã sửa (pass này)

1. **Tách UI 2 cửa rà soát** — `doorMode: physical | catalog` trên `InstrumentSetReconcileTable` / `Row`:
   - physical: khoá mã/tên/chuẩn; chỉ đếm + Hỏng/Mất; ẩn thêm/xóa dòng danh mục
   - catalog: khoá đếm; chỉ đổi danh mục; ẩn nút Hỏng/Mất
2. **Validate theo cửa UI** trong `SuCoReportForm`:
   - Hỏng/Mất → `validateInstrumentDoorLines(INSTRUMENT_PHYSICAL…)`
   - Đổi danh mục → `validateCatalogReconcileDoorLines` (form)
   - Điều chuyển → `INSTRUMENT_MOVE`
   - Backend vẫn nhận PHYSICAL nộp thành `SET_RECONCILE` (D4) — không phá sổ cũ
3. **Domain helpers** (`cssd-set-reconcile.ts`): `isPhysicalDoorTypeId`, thông báo cửa, `validateCatalogReconcileDoorLines`
4. **Gỡ mã thủ tục khỏi chuỗi UI** (banner thu hồi, modal, title trang, hint gói ướt)
5. **Rút gọn nhãn**: nhóm tabs ngắn (Quy trình / Mẻ / Dụng cụ…), meta, máy/HC, checklist nguyên nhân
6. **Vitest** `cssd-set-reconcile.spec.ts` — case tách cửa; taxonomy + batch-recall vẫn pass

## 4. Còn lại (sau pass Dialog)

- Nhật ký / in biên bản: vẫn đúng nhóm; có thể rút copy dài sau
- Cân nhắc ghi `INSTRUMENT_PHYSICAL` thẳng DB thay vì collapse D4 (ảnh hưởng sổ/duyệt — cần PO)
- (Tuỳ chọn) gỡ luôn export `TypePicker` trong `SuCoReportFormFields` nếu không còn chỗ dùng

## 5. Cách kiểm tay

1. Mở `/cssd-su-co` → tab **Dụng cụ** → **Hỏng/Mất**: không thấy «Thêm dòng (chờ duyệt)» / không sửa được mã loại; giảm đếm → Hỏng/Mất → Gửi OK.
2. Cùng nhóm → **Đổi danh mục**: không thấy nút Hỏng/Mất; sửa chuẩn/mã hoặc thêm dòng → Gửi; phiếu chờ duyệt.
3. **Điều chuyển**: Dialog mở (không còn hai khung cao trên form); kho↔bộ / bộ↔bộ → Xong → Gửi.
4. Tab **Quy trình**: không có dropdown loại; có khâu lỗi + khâu trung gian (khi phát hiện sau lỗi).
5. Tab **Mẻ** / **Máy** / **Hóa chất**: checklist multi-select, không TypePicker.
6. **Thu hồi theo mẻ**: banner không còn mã thủ tục; không hiện 3 cửa dụng cụ.
7. (Dev) `npx vitest run src/lib/domain/cssd-set-reconcile.spec.ts src/modules/cssd-su-co/domain/`

## 6. File chạm

- `src/lib/domain/cssd-set-reconcile.ts` (+ `.spec.ts`)
- `src/modules/cssd-su-co/components/InstrumentSetReconcile{Table,Row}.tsx`
- `src/modules/cssd-su-co/components/SuCoReportForm.tsx`
- `src/modules/cssd-su-co/components/SuCoReportFormFields.tsx`
- `src/modules/cssd-su-co/components/SuCoIncidentMetaFields.tsx`
- `src/modules/cssd-su-co/components/SuCoReportForm{Batch,Chemical,Equipment}Fields.tsx`
- `src/modules/cssd-su-co/components/IncidentReportModal.tsx`
- `src/modules/cssd-su-co/views/SuCoBaoCaoPage.tsx`
- `src/modules/cssd-su-co/domain/cssd-incident-taxonomy.ts`
- `src/modules/cssd-su-co/domain/cssd-batch-recall.ts`
- `src/modules/cssd-su-co/components/InstrumentMoveDualTable.tsx` (+ `DualPaneScroll.tsx`)
- ~~`InstrumentIncidentFields.tsx`~~ (đã xóa)

## 7. Pass leftover — Dialog Điều chuyển + dọn chết (cùng ngày)

### Đã làm
1. **Cửa Điều chuyển → Dialog** (`InstrumentMoveDualTable`):
   - Form chỉ còn thẻ tóm tắt (hướng Kho↔Bộ / Bộ↔Bộ, mã bộ, số dòng) + nút mở bảng.
   - Bảng Transfer/Replenish nằm trong Dialog (`max-h` + cuộn nội bộ, `bg-white`, `BV103_DIALOG_STACK`); `forceMount` giữ state/draft khi đóng.
   - `DualPaneScroll` giảm chiều cao cố định (`max-h ~42dvh`) — không còn hai khung cao ép cuộn trang.
2. **Xóa** `InstrumentIncidentFields.tsx` (không còn import).
3. **Gỡ props TypePicker chết** ở CHEMICAL/EQUIPMENT (`hideType` / `typeOptions` / `typeId` / `onTypeChange`) — checklist nguyên nhân giữ nguyên.

### Không đổi nghiệp vụ
- Kho↔bộ / bộ↔bộ, validate cửa MOVE, submit payload reconcile như trước.

### Kiểm
- Vitest: `cssd-set-reconcile` + domain `cssd-su-co`.
- Tay: tab Dụng cụ → Điều chuyển → Dialog mở; chọn số → Xong → Gửi.

## _agent-su-co-po-gaps-fix-20260908

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md) (sự cố). Tra cứu lịch sử được.

# Sửa 3 gap PO — báo cáo sự cố CSSD — 2026-09-08

> Local only · không commit/push · plain VN · không mã QT/PCI.

Cross-link: [`_agent-su-co-bao-cao-deep-audit-20260908.md`](#_agent-su-co-bao-cao-deep-audit-20260908) (mục 8 — gap còn lại 1–3).

---

## 1. Hỏng/Mất — mã cửa riêng trên sổ

### Đã đổi
- `resolveInstrumentFormSubmitTypeId`: **không** còn collapse `INSTRUMENT_PHYSICAL` → `SET_RECONCILE`.
- Phiếu Hỏng/Mất ghi `INCIDENT_TYPE_CODE = INSTRUMENT_PHYSICAL`; Đổi danh mục giữ `INSTRUMENT_SET_RECONCILE`; Điều chuyển giữ `INSTRUMENT_TRANSFER` / `INSTRUMENT_REPLENISH`.
- BE `validateInstrumentDoorLines` dùng **typeId thật** sau submit (PHYSICAL chỉ HONG/MAT).
- In / lọc cửa: `resolveInstrumentDoorForPrint` ưu tiên typeCode; sổ cũ `SET_RECONCILE` + dòng HONG/MAT vẫn suy ra cửa Hỏng/Mất.

### Tương thích đọc cũ
- Hàng đã collapse D4 (`SET_RECONCILE` + snapshot HONG/MAT): vẫn đọc được qua suy cửa từ snapshot.
- Không migration DB.

### Kiểm
1. Tab Dụng cụ → Hỏng/Mất → Gửi → attributes `INCIDENT_TYPE_CODE=INSTRUMENT_PHYSICAL`.
2. Lọc nhật ký / KPI theo code PHYSICAL ≠ SET_RECONCILE.
3. Phiếu cũ SET_RECONCILE+HONG: in vẫn nhãn cửa Hỏng/Mất.

---

## 2. Phiếu — người phát hiện ≠ người tạo + four-eyes

### Đã đổi
- Form: **Người tạo phiếu** (readonly = phiên đăng nhập); **Người phát hiện** (select nhân sự, có thể khác).
- Copy ngắn: «Có thể nhờ người khác lập phiếu thay người phát hiện».
- Persist: `NGUOI_PHAT_HIEN(_ID)`, `REPORTER_*`, `REPORTER_NHAN_SU_ID` / `NGUOI_TAO(_ID)` (+ cột `nguoi_bao_id` như trước).
- Xác nhận: so sánh actor với creator (attrs hoặc `nguoi_bao_id`); trùng → lỗi **«Không tự xác nhận phiếu mình tạo»** (hard).

### Kiểm
1. Chọn người phát hiện khác mình → Gửi → in hiện cả hai.
2. Tự bấm Xác nhận trên phiếu mình tạo → bị chặn.
3. Tài khoản khác xác nhận → OK.

---

## 3. Hóa chất — `chemicalId` + chặn chốt

### Đã đổi
- Form/schema/actions: field **`chemicalId`** (không tái dùng `machineId` trên nhóm CHEMICAL).
- Attributes: `CHEMICAL_ID` + `CHEMICAL_MA` / `CHEMICAL_TEN`; mirror `MACHINE_ID` để đọc cũ.
- Resolve: ưu tiên `CHEMICAL_ID`, fallback UUID trong `MACHINE_ID`.
- Submit CHEMICAL → ghi cách ly trên `cssd_dm_hoa_chat.specs`:
  - có mã lô → `su_co_quarantine_lots[]`
  - không lô → `su_co_quarantine=true` (soft hold master)
- Cổng cứng: `xuatKhoHoaChatAction` / điều chỉnh âm gọi `assertChemicalExportable`.
- In biên bản: hiện mã — tên (không UUID thô khi đã resolve).

### Phạm vi chặn chốt (ghi rõ)
- **Đã nối:** xuất kho / điều chỉnh giảm (cấp phát kho FEFO ops).
- **Một phần:** FEFO pick UI chưa lọc sẵn lô cách ly trên mọi surface — vẫn bị chặn khi xuất. Chốt nạp mẻ tiệt khuẩn **không** tiêu thụ lô HC trực tiếp trong code hiện tại → không gate thêm trên nạp mẻ.
- Gỡ cách ly: sửa `specs` danh mục (ops/admin) — chưa UI «gỡ giữ» riêng trong pass này.

### Kiểm
1. Tab Hóa chất → chọn HC ± lô → Gửi → specs có quarantine.
2. Thử xuất lô/master bị giữ → lỗi cách ly.
3. In phiếu: tên HC, không chỉ UUID.

---

## 4. File chạm (tóm tắt)

- `src/modules/cssd-su-co/domain/cssd-incident-taxonomy.ts` (+ spec)
- `src/modules/cssd-su-co/domain/cssd-incident-print.ts` (+ spec)
- `src/modules/cssd-su-co/domain/cssd-incident-status.ts` (+ spec)
- `src/modules/cssd-su-co/domain/cssd-incident-attributes.ts`
- `src/modules/cssd-su-co/domain/cssd-incident-policy.ts`
- `src/modules/cssd-su-co/contracts/su-co-report-input.schema.ts`
- `src/modules/cssd-su-co/components/SuCoReportForm.tsx`
- `src/modules/cssd-su-co/components/SuCoReportFormChemicalFields.tsx`
- `src/modules/cssd-su-co/components/SuCoIncidentMetaFields.tsx`
- `src/modules/cssd-su-co/components/IncidentPrintView.tsx`
- `src/modules/cssd-su-co/application/su-co-report.application.ts`
- `src/modules/cssd-su-co/application/confirm-incident.application.ts`
- `src/modules/cssd-su-co/actions/su-co-report.actions.ts`
- `src/lib/domain/cssd-set-reconcile.ts` (comment)
- `src/lib/domain/cssd-hoa-chat-su-co-resolve.ts` (+ spec)
- `src/lib/domain/cssd-hoa-chat-quarantine.ts` (+ spec) **mới**
- `src/modules/cssd-erp/actions/cssd-kho-hoa-chat-mutations.actions.ts`
- `docs/modules/cssd/_agent-su-co-po-gaps-fix-20260908.md` (file này)

## 5. Kiểm tự động

```bash
npx vitest run \
  src/lib/domain/cssd-set-reconcile.spec.ts \
  src/lib/domain/cssd-hoa-chat-su-co-resolve.spec.ts \
  src/lib/domain/cssd-hoa-chat-quarantine.spec.ts \
  src/modules/cssd-su-co/domain/

npx tsc --noEmit
```

## _agent-opt-dotA-implant-dotB-cta-20260909

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md). Tra cứu lịch sử được.

# Đợt A — Implant CHO_BI + Đợt B — CTA/FSM copy (09/09/2026)

> **Máy:** Mac `Desktop/ksnk_bv103` · machineId `6bad1c57-…0f88`  
> **Phạm vi:** LOCAL ONLY · không commit/push · UI/docs tiếng Việt thường · Dialog UX · diff nhỏ.  
> **Nền:** domain `cssd-cho-bi` + `assertPackIssuable` đã có mầm; audit roadmap ghi QT-IMPLANT / DC-DUAL / SC-FSM còn mở.

---

## Đợt A — Implant / quarantine CHO_BI + chặn cấp phát

### Mục tiêu

Mẻ **cấy ghép** mà BI chưa ĐẠT phải vào cách ly `CHO_BI` và **không cấp phát** cho đến khi gỡ (BI ĐẠT / admin «Gỡ chờ BI»). Không ảnh hưởng mẻ không implant.

### Wire end-to-end (đã nối / hoàn thiện)

| Bước | Cơ chế | File chính |
|------|--------|------------|
| **Write** | Tick «Mẻ cấy ghép» + BI ≠ ĐẠT → `stampChoBiOnQcJson` (`quarantineStatus=CHO_BI`) trên `tk_qc_json`; `is_dong_bang=true` trên bộ trong mẻ | `persist-me-tiet-khuan.ts` · `cssd-cho-bi.ts` · QC panel |
| **Hard gate** | `assertPackIssuable({ is_cho_bi })` trước scan/handoff `CAP_PHAT` — message VN cố định | `cssd-pack-issuance.ts` · `cssd-scan.actions.ts` · `cssd-workflow-application.ts` |
| **Release** | «Gỡ chờ BI» → `persistReleaseChoBiAfterBiDat` (chỉ mẻ ĐẠT QC + đang implant/CHO_BI) → xóa stamp + mở `is_dong_bang` | `cssd-batch.actions.ts` · cột danh sách mẻ |
| **Audit** | Exception `CHO_BI_QUARANTINE` khi khóa; `CHO_BI_RELEASED` khi gỡ | `persist-me-tiet-khuan.ts` |
| **UI mẻ** | Trạng thái «Chờ BI» + nút gỡ | `me-tiet-khuan-list-data.ts` · `me-tiet-khuan-columns.tsx` |

### Message chặn (VN)

`CHO_BI_CAP_PHAT_BLOCK_MSG` = *«Bộ cấy ghép đang chờ BI âm — không cấp phát cho đến khi BI ĐẠT.»*

### Non-implant

`shouldQuarantineChoBi({ isImplant: false, … })` luôn `false` — mẻ thường không bị khóa vì BI = NA/Bỏ qua.

### Vitest

- `src/lib/domain/cssd-cho-bi.spec.ts` — quarantine / stamp / clear / gate + non-implant  
- `src/lib/domain/cssd-pack-issuance.spec.ts` — block `is_cho_bi`  
- Chạy: **23** test domain liên quan A/B pass (cho-bi + pack + catalog-fsm)

### AC Đợt A

- [x] Implant + BI chưa ĐẠT → stamp CHO_BI + đóng băng bộ  
- [x] Quét / handoff CAP_PHAT bị chặn message VN rõ  
- [x] Gỡ sau BI ĐẠT → cấp phát lại được  
- [x] Vitest gate helpers  
- [x] Non-implant không bị khóa vì BI NA  

---

## Đợt B — CTA dual surface + FSM rõ 3 trục

### Mục tiêu

Giảm nhầm cửa: **xem / đề xuất / duyệt** và phân biệt **xác nhận phiếu sự cố ≠ duyệt danh mục L1 ≠ duyệt lại L2**.

### Copy SSOT (`cssd-catalog-approve-fsm.ts`)

| Constant | Nội dung ngắn |
|----------|----------------|
| `CATALOG_DUAL_APPROVE_COPY` | Duyệt danh mục L1 (NV) → Duyệt lại L2 (Admin) → vào DM chính — khác «Xác nhận phiếu sự cố» |
| `CATALOG_FSM_THREE_AXES_COPY` | Xác nhận phiếu sự cố (four-eyes) ≠ Duyệt danh mục L1 (NV) ≠ Duyệt lại L2 (Admin) |
| `CATALOG_SURFACE_RO_COPY` | Chỉ xem / đề nghị · Sửa master → Quản trị · Duyệt → Rà soát |
| `CATALOG_SURFACE_SU_CO_DOI_DM_COPY` | Cửa Đổi danh mục: gửi đề nghị — không sửa master |
| `CATALOG_SURFACE_QT_MASTER_COPY` | Quản trị: xem + sửa (ADMIN khẩn) · Đề xuất · Duyệt ở Rà soát |
| `CATALOG_SURFACE_HYBRID_QUEUE_COPY` | Rà soát: duyệt đề xuất / đổi DM — L1 rồi L2 |

### Surface chạm

- CSSD RO `/cssd-dung-cu` — banner xem/đề xuất/duyệt  
- `CSSDCatalogQuickActions` — cửa Đổi danh mục  
- QT `QuanLyDungCuPage` + `SetReconcileApproveQueue` — nhãn **Duyệt L1 (NV)** / **Duyệt lại L2** + 3 trục  
- `CatalogProposalDialog` · `bo-dung-cu-chi-tiet-panel` tip  
- Sự cố: `IncidentConfirmButton` «Xác nhận phiếu sự cố» · modal 3 cửa · success copy  

### AC Đợt B

- [x] 4 cửa có 1 câu CTA/copy ngắn  
- [x] UI phân biệt four-eyes ≠ L1 ≠ L2  
- [x] Không mega redesign  

---

## Roadmap status (cập nhật)

| ID | Trước | Sau đợt này |
|----|-------|-------------|
| QT-IMPLANT / #2 opt debt | OPEN | **FIXED** local (write+gate+release+test) |
| DC-DUAL | PARTIAL | **PARTIAL→improved** (CTA/copy) |
| SC-FSM | OPEN | **PARTIAL** (copy 3 trục; form vẫn dày) |

Chi tiết delta: [`_agent-project-optimization-debt-roadmap-20260909.md`](./kien-truc-hieu-nang.md#_agent-project-optimization-debt-roadmap-20260909).

---

## Không làm

- Commit / push / cloud agent  
- Đổi schema enum CHO_BI  
- Hard-block BOM cấp phát / 3×BI auto mở máy (P2)  

*Boy Scout: hoàn thiện wire sẵn có + copy ngắn — không nhân cổng song song.*
