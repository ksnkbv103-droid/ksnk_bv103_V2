# Audit Soft — NKBV deep (data + logic xác định ca) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip before | `b9f99e2` (ahead 53) |
| Tip after | Soft commit on tip (see `git log -1`); branch ahead 54 |
| Phạm vi | Deep AUDIT `/giam-sat-nkbv` — doors · data · **case determination** · overlaps · RBAC; Soft P0 thin only |
| Không | push / PR / Cloud / Vercel / migrate / DROP `LOAI_NKBV` / rewrite thuật toán / đụng dirty WT |
| Neo SSOT | `docs/modules/nkbv/hai-surveillance-domain-ssot-20260827.md` v3.3 · `hai-identification-data-flow-20260827.md` · ADR LOAI Strategy B · Phụ lục C nhi ngoài phạm vi |
| Mandat | Thin Soft; clear doors; cascade; FE+BE+DB sync awareness; **không invent churn** |

---

## 0. Executive

Module NKBV là **gravity well** (~2.2M / `lib/` ~140 files / page 1173 dòng) nhưng **đã có SSOT domain vững** (v3.3 + data-flow + ADR B). Logic xác định ca **không dual-rule**: timeline verdict = bridge → `nkbv-rules-engine.ts` (cùng hàm BE `submitClinicalVerification` gọi). Soft **không** rewrite engine.

**Soft P0 fixed (thin):** strip nhãn **PedVAP** khỏi picker + reason VAE (mâu thuẫn Phụ lục C / adult-only lock). Giữ `PEDVAP` trong allowlist MDM + write `ilike` (legacy seed — Strategy B).

**Honest:** logic correctness vs complexity = **mostly solid** trên nhánh người lớn đã wire (BSI/UTI/VAE/PNEU/SSI + Ch.17 subset); còn **gaps Domain P1** (USI/EENT/SST engine chưa đủ; Transfer Rule cần khoa-theo-ngày; MBI đầy đủ; Ch.17 ageGate plumbing còn `isInfantLe1` luôn false). Không Soft-safe để «sửa thuật toán» không Domain lock.

---

## 1. Map — doors / IA

| Door | IS tip | Ghi chú |
|------|--------|---------|
| Sidebar «Giám sát» | `/giam-sat` hub; single-dest → deep-link `/giam-sat-nkbv` | `giam-sat-write-dest.ts` · `NAV_GATE_NKBV` |
| `/giam-sat-nkbv` | Flat 5 tab: **records · cases · vi-sinh · mau-so · dashboard** | W3B N/A (đã phẳng) — `_audit-full-debt-overlap` |
| Default tab | `records` (Hàng đợi bệnh án) | deep-link `?tab=` |
| Entry create BA | records + import HIS / LIS | BA ≠ phiếu |
| Entry create phiếu | Hub BA → phân tích → **Tạo phiếu** | `createGiamSatNkbvCa` **reject** tạo trống từ list |
| Checklist / editor | `NkbvClinicalChecklistModal` + `NkbvCaseEditor` (metadata) | Hub = primary write path |
| GSC/VST | **Tách** — không trộn H2 | lock honored |

---

## 2. Map — data model & flow

### 2.1 Ba lớp (SSOT data-flow §1) — khớp tip

| Lớp | Table / view | Thành «ca»? |
|-----|--------------|-------------|
| A. Bệnh án | `nkbv_fact_benh_an` + `nkbv_fact_ba_timeline` + `nkbv_fact_ba_ngay_khoa` + `nkbv_fact_ba_ngay_dung_cu` + `nkbv_fact_ba_phan_tich` | Không |
| B. Kho vi sinh | `nkbv_fact_vi_sinh` | Không; không tự tạo phiếu |
| C. Phiếu sự kiện | `nkbv_fact_su_kien` (+ `v_nkbv_su_kien_full`) | Chỉ sau IP **Tạo phiếu** / loại trừ |
| Mẫu số | `nkbv_fact_mau_so_daily` · `nkbv_fact_mau_so_phau_thuat` | Denom / SSI procedure |
| MDM | `nkbv_dm_loai` · `nkbv_dm_trang_thai_ca` | Strategy B lock+allowlist; **giữ FK** |

RPCs đọc: `fn_nkbv_ba_hub` · `fn_nkbv_ba_keys_chua_phan_tich` · `fn_nkbv_dich_te_hoc_rates` · mirror taxonomy `fn_nkbv_major_type_from_classification`.

### 2.2 Luồng tạo/cập nhật/đóng ca

```
LIS/HIS/gõ → BA (A) +/or vi sinh (B)
  → Hub timeline + phiên phân tích (ba_phan_tich)
  → Index → gợi ý nghi ngờ → bridge *-timeline-verdict → rules-engine (nháp)
  → Tạo phiếu → ensureNkbvBaAnalysisCase → nkbv_fact_su_kien (C)
  → Checklist / submitClinicalVerification → evaluate* (BE, cùng engine)
  → approveOrExcludeNkbvCase (APPROVE | EXCLUDE)
```

Trạng thái: MDM `nkbv_dm_trang_thai_ca` (HYBRID debt — park W5 TEXT+CHECK; **không** Soft DROP).

---

## 3. Map — case-determination architecture (where truth lives)

| Tầng | File | Vai trò |
|------|------|---------|
| **SSOT giấy** | `hai-surveillance-domain-ssot-20260827.md` Ch.2–4,6–7,9–10,17 + Phụ lục C/E | Thuật toán CDC/NHSN 2025 người lớn |
| **Runtime truth** | `lib/nkbv-rules-engine.ts` | `evaluateBsiClabsi` · `evaluateUtiCauti` · `evaluateVaeVap` · `evaluateSsi` · `evaluateCh17` |
| Shared windows | `nkbv-shared-timeline.ts` · `nkbv-shared-secondary-bsi.ts` · `nkbv-shared-device-days.ts` | IWP/RIT/SBAP/device; non-apply VAE/SSI |
| Bridge (không rule song song) | `nkbv-*-timeline-verdict.ts` | BA grid/draft → verification payload → **cùng** evaluate* |
| FE preview | `useNkbvChecklistModalState` | Gọi cùng evaluate* (client) |
| BE commit | `submitClinicalVerification` | Gọi cùng evaluate* (server) — **truth khi chốt** |
| Taxonomy tử số | `nkbv-classification-taxonomy.ts` ↔ SQL `fn_nkbv_major_type_*` | Báo cáo; legacy `SUTI_2`/`LCBI_3` **chỉ map đọc DB cũ** |
| Age lock | `nkbv-age-ui.ts` · `isInfantLe1FromAge` → **always false** | Phụ lục C |
| LOAI | `nkbv-loai-labels.ts` allowlist + MDM FK | ADR Strategy B |

**Không** có engine song song thứ hai; rủi ro overlap = **bridge map sai field** hoặc form/grid lệch verification shape — không phải hai bộ rule CDC.

Phạm vi BV103 dùng: LCBI 1/2 · SUTI 1a/1b · ABUTI · PNU1–3 adult · VAE adult · SSI · Ch.17 adult `OVER_1Y`. **Không emit** LCBI_3 / SUTI_2 (chỉ legacy taxonomy read).

---

## 4. Gap table

| Area | Current | Gap | Overlap / branch risk |
|------|---------|-----|------------------------|
| IA 5-tab flat | records·cases·vi-sinh·mau-so·dashboard | **OK** (W3B N/A) | Mix write+analytics P2 park |
| Create phiếu door | Hub-only; list create blocked | **OK** | — |
| LOAI_NKBV | lock+allowlist; FK keep | **OK** Strategy B | DUAL labels MDM↔CODE — park |
| Pediatric diagnosis path | Engine không emit LCBI_3/SUTI_2; UI ép adult | **OK** path | Residual: taxonomy legacy map + `isInfantLe1` plumbing + PEDVAP MDM alias |
| **PedVAP UI label** | Picker + VAE reason còn «PedVAP» | **P0 Soft → FIXED** | Nhãn cửa sai vs Phụ lục C |
| Ch.17 `isInfantLe1` | Callers `false`; age-ui chỉ `OVER_1Y` | **P2 Soft / P1 Domain** strip param | Branch risk thấp (luôn false) |
| USI / EENT / SST | Domain đủ; engine chưa đủ | **P1 Domain** | data-flow §6 |
| Transfer Rule | Cần khoa theo ngày trên BA | **P1 Domain** | LOA sai nếu thiếu lưới khoa |
| MBI-LCBI đầy NHSN | Partial (ANC/HSCT/diarrhea) | **P1 Domain** | gap-catalog BSI-P1-2 |
| TRANG_THAI_NKBV_CA | FK MDM | **P2 Domain** W5 | CODE vs MDM audit |
| Dual form surface | CaseEditor (meta) + ChecklistModal (clinical) + Hub | **P2 Soft** teach IA | Không dual engine |
| Dashboard vs write | dashboard gated; cases hook always | **P2/P3** | full-debt residual |
| GSC H2 vs NKBV | Tách module | **OK** | Don't mix |
| CDC Location / SIR | Banner: thô, ngoài domain Location | **OK** copy | — |
| Module size | 2.2M / 1173-line page | **P2–P3** | Gravity — split park |
| Symptom catalog note | threshold còn «sơ sinh» copy | **P2 Soft** copy | Không mở nhánh |

---

## 5. Phase 2 — A/B (P0/P1)

### P0 — PedVAP user-facing label

| | A (pick) | B |
|--|----------|---|
| | Strip «PedVAP» khỏi picker + VAE reason + comment; **giữ** `PEDVAP` allowlist + write resolve | Gỡ PEDVAP khỏi allowlist + write `ilike` + MDM |
| Risk | Thấp — copy only | Cao — gãy seed viện còn mã PEDVAP |
| Why A | Khớp Phụ lục C + Strategy B «không DROP vocab» |

### P1 — USI/EENT/SST engine

| | A | B |
|--|---|---|
| | Domain lock spec + harden Ch.17 defs từng site | Soft stub UI «chưa hỗ trợ» |
| Park | **Domain** — Soft không invent criteria |

### P1 — Transfer Rule / khoa-theo-ngày

| | A | B |
|--|---|---|
| | Enforce LOA từ `ba_ngay_khoa` khi đủ | Soft warning copy khi thiếu khoa ngày |
| Prefer | A Domain; Soft B chỉ nếu PO muốn copy — **park** đến lock |

### P1 — Strip `isInfantLe1` plumbing

| | A | B |
|--|---|---|
| | Domain: xóa param + tests infant-gate; chỉ OVER_1Y | Soft leave always-false (status quo) |
| Pick now | **B leave** — cleanup = Domain UAT (cleanup-wave đã ghi «không xóa mù») |

### P2 — Mix write+analytics tab

| | A | B |
|--|---|---|
| | Nest «Phân tích» (đề xuất cũ) | Giữ flat; teach IA |
| Pick | **B** — W3B đã N/A flatten; không invent nest |

---

## 6. Phase 3 — Fixed vs parked

### Fixed Soft P0 (this commit)

| File | Change |
|------|--------|
| `src/modules/giam-sat-nkbv/lib/nkbv-loai-labels.ts` | Picker VAP: bỏ «PedVAP»; comment ngoài phạm vi |
| `src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.ts` | Reason VAE: «Chọn VAP hoặc HAP…» (bỏ PedVAP) |
| `src/modules/giam-sat-nkbv/lib/nkbv-uti-timeline-verdict.spec.ts` | Đổi tên test lệch «→ infant» |

**Giữ cố ý:** `PEDVAP` trong `CODE_ALIASES` / `NKBV_MDM_CODE_CANDIDATES` / write `ilike.%PEDVAP%` · taxonomy legacy `SUTI_2`/`LCBI_3` · `isInfantLe1FromAge()===false`.

### Parked Domain / PO

- Rewrite criteria / USI·EENT·SST / Transfer Rule / MBI full / strip infant param
- DROP / TEXT+CHECK LOAI_NKBV hoặc TRANG_THAI
- Nested «Phân tích» hub
- Perf cases-hook `enabled`

---

## 7. Verify

- `npx tsc --noEmit` — **pass**
- vitest: loai-labels · rules-engine · uti-timeline-verdict · age-ui · classification-taxonomy · bsi-timeline-verdict · clinical-submit-gate — **7 files / 113 tests pass**
- Dirty WT **không đụng:** `AGENTS.md` · qlcv proposal · csv/scripts

---

## 8. UAT checklist (Nghĩa)

1. `/giam-sat-nkbv` → tab **Hàng đợi bệnh án** (default).
2. Import / tạo BA → mở Hub → tick triệu chứng trên lưới → chọn Index → xem verdict nháp.
3. **Tạo phiếu** từ Hub (không từ «+» list trống) → phiếu vào **Danh sách phiếu**.
4. Checklist BSI: LCBI1 recognized / LCBI2 commensal×2+sx → Secondary trước CLABSI khi có ổ tại chỗ.
5. UTI: CFU≥10^5 + sx → SUTI/CAUTI_SUTI; yeast urine → loại; ABUTI khi máu khớp không sx.
6. VAE: age≥18 + vent≥4 → VAC/IVAC/PVAP; nếu thiếu → reason **không** còn chữ PedVAP; chuyển VAP/HAP PNEU.
7. Picker loại: VAP nhãn **không** «PedVAP».
8. SSI / Ch.17 adult path; không thấy nhánh ≤1 tuổi trên form.
9. Approve / Exclude; dashboard rates không lẫn GSC.
10. Admin MDM: LOAI_NKBV **không** CRUD thêm FOOBAR.

---

## 9. Honest score

| Trục | Score | Note |
|------|-------|------|
| Doors / IA | **Solid** | Flat 5; Hub create; GSC tách |
| Data 3-lớp | **Solid** | Khớp data-flow §1–2 |
| Case engine architecture | **Mostly solid** | Một truth `rules-engine`; bridges đúng contract |
| Logic correctness vs CDC complexity | **Mostly / gaps** | Adult paths covered + nhiều spec; Ch.17 partial; Transfer/MBI/USI Domain gaps |
| Pediatric strip | **Mostly** | Path purged; Soft label P0 fixed; residual alias/plumbing intentional |
| Soft churn risk | **Low** this PR | Copy-only |

---

## 10. Cite (không re-audit CDC từ đầu)

- `docs/modules/nkbv/hai-surveillance-domain-ssot-20260827.md` (Phụ lục C)
- `docs/modules/nkbv/hai-identification-data-flow-20260827.md`
- `docs/modules/nkbv/_adr-loai-nkbv-strategy-b-lock-allowlist-2026-09-26.md`
- `docs/modules/_audit/_audit-code-vs-mdm-2026-09-26.md` §5 LOAI
- `docs/modules/_audit/_audit-full-debt-overlap-2026-09-27.md` W3B / Soft Soft-queue
- `docs/reference/reports/BV103-CLEANUP-WAVE-20260917.md` (superseded; infant residual note)
- `docs/modules/nkbv/gap-catalog-harden-w2-20260804.md` (historical W2; many P0 closed in shared package)

