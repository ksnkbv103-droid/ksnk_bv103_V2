# Audit UX/perf — Phiếu mẻ tiệt khuẩn — 2026-09-25

| Field | Value |
|-------|-------|
| Date | 2026-09-25 (Asia/Saigon) |
| Auditor | Lead executor (Mac local, audit-only) |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| HEAD at write | see git after commit |
| Scope | ME batch UI only — **no** `src/modules/cssd-su-co/**`, no P2-2 |
| Stance | Report + ranked thin slices; **no implement** in this run |
| Domain SSOT | File 18 / `docs/modules/cssd/domain-overview.md` §4; ME-S2/S3; `me-tiet-khuan-slip-ux.ts` |

**Pain (Nghĩa, 2026-09-25):** (1) flow/status unclear · (2) load chậm · (3) thiếu nút sau nạp bộ · (4) thiếu nút chuyển trạng thái từng mẻ.

---

## A. UI entry map

```
Sidebar CSSD · Quy trình
  └─ /cssd-quy-trinh?tab=batch  ← CANONICAL (suppressShell)
       └─ MeTietKhuanPage → useMeTietKhuanWorkflow
            ├─ step LIST   → AdvancedDataTable + columns
            ├─ step CREATE → MeTietKhuanCreateStep
            └─ step PROCESS→ MeTietKhuanProcessStep
                 ├─ SlipStepper (1–6)
                 ├─ ScanPanel + WaitingPanel (nạp)
                 ├─ "Đang chạy" placeholder
                 └─ ProcessQcPanel (QC / CHO_BI)

Deep link (compat): /cssd-erp/batch → redirect → ?tab=batch

Handoffs into ME (not list UI):
  · useCSSDWorkflow toast + meHandoffHref after Đóng gói
  · QRScanSuccessCard «Mở phiếu mẻ»
  · cssd-batch-me-link-chip
  · Thiết bị · vận hành panel (list mẻ theo máy)
```

| Surface | Route / mount | Role |
|---------|---------------|------|
| Station shell tab «Mẻ» | `src/app/cssd-quy-trinh/page.tsx` ~51, 134–136 | Primary |
| Compat redirect | `src/app/cssd-erp/batch/page.tsx` | → `cssdQuyTrinhBatchTabHref()` |
| Page orchestrator | `views/MeTietKhuanPage.tsx` | LIST / CREATE / PROCESS |
| Hook | `hooks/use-me-tiet-khuan-workflow.ts` | Fetches + mutations |
| UX pure | `lib/me-tiet-khuan-slip-ux.ts` | Step + badge |

**Clarity note:** Shell title stays «Chu trình xử lý dụng cụ» while tab is «Mẻ» — list vs detail vs stepper all live under one tab with client `step` state (not URL). Back from PROCESS = full list refetch.

---

## B. Status machine — domain vs UI

### Domain (`trang_thai_me` — File 18 / domain-overview §4)

| Code | Meaning | Who transitions (code) |
|------|---------|------------------------|
| `DANG_CHUAN_NAP` | Chưa chốt nạp | Create (`rpc_cssd_me_tao`); default derived |
| `DANG_TIET_KHUAN` | Đã chốt nạp | `confirmBatDauTietKhuanBatch` → `rpc_cssd_me_bat_dau` |
| `CHO_DANH_GIA_QC` | Đã mở form QC | `confirmKetThucChuTrinhTietKhuan` writes `trang_thai_me` |
| `CHO_BI` / `Quarantine_BI` | Chờ BI− (implant / PP bắt buộc) | `finishCssdSterilizationBatch` / persist |
| `HOAN_THANH` | Nhả đạt | finish / `nhapKetQuaBiMeTietKhuan` AM |
| `QC_KHONG_DAT` | QC / BI+ fail | finish / BI DUONG + recall path |
| `THU_HOI` | Thu hồi mẻ | Sự cố / `rpc_cssd_me_thu_hoi` (out of this audit’s su-co tree) |

List derivation if column empty: `helpers/me-tiet-khuan-list-data.ts` 54–64 (ket_qua / tk_mo / tk_chot → synthetic `trang_thai`).

### UI badge collapse (`me-tiet-khuan-slip-ux.ts` 9–18)

| Domain | Badge label shown |
|--------|-------------------|
| `DANG_CHUAN_NAP` | Đang nạp |
| `DANG_TIET_KHUAN` **and** `CHO_DANH_GIA_QC` | **both «Đang chạy»** ← clarity loss |
| `CHO_BI` / `Quarantine_BI` | Chờ BI |
| `HOAN_THANH` | Hoàn thành |
| `QC_KHONG_DAT` | Không đạt |
| `THU_HOI` | Thu hồi |

Stepper steps (display only): Máy → Chương trình → Quét bộ → Bắt đầu → Kết thúc → Nhả (`currentMeSlipStep`).

**Gate that drives CTAs:** `slipStep === 4` requires **non-empty `chuongTrinh` AND `itemCount > 0` AND not napLocked** (`slip-ux.ts` 67–69). Server `confirmBatDau` does **not** require `chuong_trinh` — only UI hides the button.

---

## C. CTA matrix (today vs expected) — pain #3 / #4

| Status / moment | Expected primary CTAs | Visible today | Gap |
|-----------------|----------------------|---------------|-----|
| LIST any open me | Mở / Tiếp tục / next-action by status | Row click only; columns: Thu hồi + In (terminal). **No status-transition buttons** | **#4 P0** |
| CREATE | Chọn máy → Tạo mẻ (+ BD steam) | OK (`create-step`) | — |
| `DANG_CHUAN_NAP`, 0 bộ | Quét / nạp từ chờ | Scan + Waiting «**Mở mẻ**» (mislabel — actually nạp vào phiếu đang mở) | P1 label |
| `DANG_CHUAN_NAP`, đã nạp ≥1 bộ | **Sticky «Bắt đầu chu trình»** + bỏ bộ | «Bắt đầu» **only if** `chuongTrinh` filled (`process-step.tsx` 168–177); else stuck step 2 with no primary next | **#3 P0** |
| `DANG_TIET_KHUAN` | «Kết thúc» | Header when `slipStep===5 && !qcOpen` (179–188) | OK if opened |
| `CHO_DANH_GIA_QC` | Form QC → Nhả / Không đạt | QC dialog/panel | OK |
| `CHO_BI` | BI Âm → Nhả / Dương → sự cố | QC `choBi` block | OK **inside** PROCESS; list has no «Nhập BI» |
| Terminal | In + Thu hồi | List columns + process toolbar | OK |
| After load (scan success) | Local action bar under loaded sets | Toast only; no bar under ScanPanel | **#3 P0** |

Evidence refs:

- Post-load CTA gate: `me-tiet-khuan-process-step.tsx:168-177` + `me-tiet-khuan-slip-ux.ts:67-69`
- List no transition CTAs: `me-tiet-khuan-columns.tsx:80-131` (only Thu hồi / In)
- Waiting mislabel: `me-tiet-khuan-waiting-panel.tsx:69-77` («Mở mẻ» → `onProcess` = add to open batch)
- `openRowForProcess` blocks only `ket_qua_test != null` (`use-me-tiet-khuan-workflow.ts:434-446`) — CHO_BI openable, but list doesn’t advertise it

---

## D. Perf — fetches on open

### LIST open (`fetchData` → `fetchCssdMeListData` → `fetchBatchesAndMachines`)

1. `cssd_fact_lo_tiet_khuan` **`select(*)`** all `is_active` — **no limit / pagination** (`me-tiet-khuan-list-data.ts:23`)
2. Parallel: all READY/HOAT_DONG machines + registry `LOAI_MAY_TIET_KHUAN`
3. Second query: **all** `cssd_fact_quy_trinh.lo_tiet_khuan_id IN (every batch id)` to count members (`:42-50`) — grows with history

Client: client-side filter only (`MeTietKhuanPage.tsx:48-56`).

### PROCESS open / poll (`reloadProcessContext`)

`Promise.all` every time (`use-me-tiet-khuan-workflow.ts:145-170`):

| # | Action | Cost |
|---|--------|------|
| 1 | `fetchCssdBatchWorkflowState` | me row + optional BI reminder + implant bo scan |
| 2 | `fetchCssdTietKhuanWaitingRows(120, id)` | ≤120 Đóng gói + **heat lines for all eligible bos** + partition |
| 3 | `fetchCssdBatchMembers` | `v_cssd_quy_trinh_full` **`select(*)`** + bo names |

Plus independent:

| # | Component | Cost |
|---|-----------|------|
| 4 | `MeTietKhuanHeatBanner` | `fetchCssdBatchHeatRisk` (remounts when `itemSig` changes — `process-step.tsx:192`) |
| 5 | `MeTkNkbvLinkBanner` | `fetchNkbvCasesLinkedToCssd` |

**8s interval** re-runs 1–3 forever while PROCESS (`workflow.ts:181-185`) — including heavy waiting heat partition even when nap already locked.

`confirmBatDau` path: sequential per-member BOM heat in a loop (`cssd-batch.actions.ts:267-288`) — slow on **start**, not open.

### Waterfall summary (pain #2)

```
LIST:  select(*) all me → count all members  (no page)
PROCESS mount: 3 actions || + heat + nkbv
PROCESS life:  poll 3× / 8s  (waiting heat every tick)
```

---

## E. Clarity issues

| Issue | Evidence | Severity |
|-------|----------|----------|
| Stepper says «Chương trình» before «Quét bộ»; empty chương trình **hides** Bắt đầu | `slip-ux.ts:67-69`, `process-step.tsx:168` | P0 (ties #1+#3) |
| Badge «Đang chạy» for both chốt-nạp and form-QC | `slip-ux.ts:11-12` | P1 |
| List columns «Qc test» + «Trạng thái» duplicate/confuse | `columns.tsx:51-72` | P1 |
| Waiting CTA «Mở mẻ» vs nạp vào phiếu đang mở | `waiting-panel.tsx:76` | P1 |
| PROCESS not in URL — refresh/lost context; list vs detail mental model | `MeTietKhuanPage` step state | P2 |
| Heat OK banner always shown (noise) | `heat-banner.tsx:32-46` | P2 |
| Print only after terminal / CHO_BI | `columns.tsx:108-114`, `process-step.tsx:123-127` | OK by design |
| Thu hồi list → su-co; PROCESS toolbar opens Incident modal | `MeTietKhuanPage.tsx:115-128` | OK / discoverable |
| Remove-set OK with confirm when !napLocked | `scan-panel.tsx:96-104`, hook `removeItem` | OK |

---

## F. Gap table (pain → evidence → severity)

| ID | Pain | Evidence | Severity |
|----|------|----------|----------|
| G1 | #3 Không có nút sau nạp xong | `process-step.tsx:168-177` gated by `slipStep===4`; `slip-ux.ts:67` requires `chuongTrinh` | **P0** |
| G2 | #4 Không có nút chuyển TT từng mẻ (list) | `columns.tsx` — only Thu hồi + In; no «Tiếp tục / Kết thúc / Nhập BI» | **P0** |
| G3 | #2 Load chậm LIST | `me-tiet-khuan-list-data.ts:23` `select(*)` + unbounded member count | **P0** |
| G4 | #2 Load chậm PROCESS / poll | `workflow.ts:145-185` 3-way + 8s + waiting heat; members `select(*)` | **P1** |
| G5 | #1 Không rõ ràng — badge gộp / stepper vs CTA | `slip-ux.ts:11-12`; dual QC columns | **P1** |
| G6 | #1 Waiting mislabel «Mở mẻ» | `waiting-panel.tsx:76` | **P1** |
| G7 | Heat remount refetch on every add/remove | `process-step.tsx:192` `key={…itemSig}` | **P2** |
| G8 | CHO_BI not called out on list as actionable | columns badge only; no «Nhập BI» CTA | **P1** (subset of G2) |

---

## G. Proposed thin fix slices (ordered P0 first)

### Slice 1 — Post-load action bar + ungate Bắt đầu (pain #3) — **first implement**

**Files (≤3):**

1. `lib/me-tiet-khuan-slip-ux.ts` — treat empty chương trình as soft warn: `currentMeSlipStep` → 4 when `itemCount>0 && !napLocked` (chương trình still shown; optional persist later)
2. `components/batch/me-tiet-khuan-process-step.tsx` — sticky action bar under ScanPanel when `items.length>0 && !napLocked`: primary «Bắt đầu chu trình», secondary hint if chương trình trống
3. `components/batch/me-tiet-khuan-waiting-panel.tsx` — rename CTA «Nạp vào mẻ» (or «Đưa vào phiếu»)

**DoD (one paragraph):** Với phiếu `DANG_CHUAN_NAP` đã có ≥1 bộ, user luôn thấy nút primary «Bắt đầu chu trình» trong vùng nạp (không phụ thuộc đã gõ chương trình); bấm → confirm dialog hiện có → `confirmBatDauTietKhuanBatch`; waiting row CTA không còn chữ «Mở mẻ»; stepper vẫn hiện bước 4 khi đã có bộ. Không đụng su-co, không migrate.

### Slice 2 — Per-batch status transition CTAs on LIST (pain #4)

**Files (≤3):**

1. `me-tiet-khuan-columns.tsx` — column «Thao tác»: by `trang_thai` → Tiếp tục nạp | Kết thúc | Nhập QC | Nhập BI | (terminal: In only)
2. `MeTietKhuanPage.tsx` — wire `onContinue` → `openRowForProcess` (same path)
3. Optional: `slip-ux.ts` helper `meListPrimaryAction(trangThai)` for labels

**DoD:** Mỗi dòng mẻ chưa terminal có đúng một primary button trạng thái tiếp theo; click mở PROCESS đúng ngữ cảnh; Thu hồi/In giữ nguyên.

### Slice 3 — One perf win LIST (pain #2)

**Files (1–2):**

1. `helpers/me-tiet-khuan-list-data.ts` — `select` cột hẹp + `.limit(50)` (or 100) + order `created_at desc`; count members only for returned ids (already) or RPC `count` later
2. Optional: `use-me-tiet-khuan-workflow.ts` — expose «Tải thêm» later (out of thin slice)

**DoD:** Mở tab Mẻ chỉ tải ≤50 mẻ gần nhất với select không `*`; thời gian cảm nhận giảm trên DB có nhiều lịch sử; UI list vẫn đủ cho ca làm việc trong ngày.

### Slice 4 (P1 follow) — PROCESS poll slim

- Skip `fetchCssdTietKhuanWaitingRows` when `napLocked`; widen poll to 15–20s or pause when tab hidden; narrow `fetchCssdBatchMembers` columns; drop heat `key` itemSig remount.

---

## Status board (report to Lead)

| LÁT | Ai | Trạng thái | File | Việc Nghĩa |
|-----|----|------------|------|------------|
| Audit ME UX/perf | Lead executor | **Done** (doc only) | `docs/ux/_audit-me-tiet-khuan-ux-2026-09-25.md` | Đọc + chọn slice 1 |
| Slice 1 post-load CTA | — | Proposed | process-step + slip-ux + waiting | Authorize implement |
| Slice 2 list status CTAs | — | Proposed | columns + MeTietKhuanPage | After S1 |
| Slice 3 list limit/select | — | Proposed | me-tiet-khuan-list-data | Can parallel S1 |
| cssd-su-co / P2-2 | other executor | Out of scope | — | — |

---

## Out of scope (this run)

- No code fix shipped (default = report only)
- No touch `src/modules/cssd-su-co/**`
- No push / PR / Cloud / migrate / commit of product code
