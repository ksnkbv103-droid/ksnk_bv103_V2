# Soft audit — CSSD-L01…L05 Soft Soft-queue verify — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `cursor/me-sync-recall-print` @ `244ef21`+ |
| Neo | Domain backlog `21-BACKLOG-LAT-GSC-CSSD-QLCV-20260928.md` · `17` §0/§17 · `17b` · `17c` · `17d` G-P0-01…04 · CapPhat hard-block Lock A |
| Không | invent · commit/push/PR · Vercel · prod migrate · harden L06 mẻ (18b DONE) / L07 used (23 DONE) / L08 ledger (SQL draft) · revert WT khác |

---

## Status table L01…L05

| ID | DoD gist | Verdict | Soft action |
|----|----------|---------|-------------|
| **CSSD-L01** | Đóng gói **scan-only** (no BOM / heat-split / materials panels) | **PASS Soft-local** (thin fix) | `gateMode`: ẩn đề nghị BOM (F2) · ẩn UI tách + `registerSplitSub` · ẩn chọn vật liệu Plasma · giữ đối chiếu mỏng cần/thực tế + advance |
| **CSSD-L02** | Soft-warn UI **off**; soft-allow D8 silent | **PASS Soft-local** (thin fix) | Bỏ banner «Thiếu dụng cụ — vẫn cấp» · không surface `ledgerWarning` trên thẻ quét · soft-allow + lifecycle vẫn ok · `thoiGianQuet` = `HH:mm` (`formatTimeHmVi`) |
| **CSSD-L03** | SC picker whitelist 6 trạm · ¬used | **PASS Soft-local** (prior WT 23) | `listBoForSuCoPickerAction` + `passesScPickerWhitelist` · `SuCoReportForm` incident path · luân chuyển giữ catalog · `WORKFLOW_STEPS` = 6 |
| **CSSD-L04** | Heat-split catalog Lock A · `parent_bo_id` | **PARK** | Schema **không** có `parent_bo_id` (MAIN/SUB `ma_vai_tro_bo` + sub `ma_bo`) · Soft Soft-queue-safe partial = L01 bỏ UI tách Đóng gói · catalog Lock A + migrate = Domain/Lead |
| **CSSD-L05** | `CAP_PHAT` hard-block SC TK `OPEN\|CONFIRMED` | **PASS** (tip) | `assertPackIssuable` + `loadPackBatchReleaseGate` + `isBlockingSterilizationIncident` trên scan/workflow CAP_PHAT · specs `cssd-pack-issuance` / `me-tiet-khuan-qc` |

### L06 / L07 / L08 — verify notes only (no harden)

| ID | Note |
|----|------|
| L06 phiếu mẻ | Soft audit `_audit-soft-cssd-phieu-me-18b-2026-09-28.md` — AB-1…6 **DONE Soft-local** · không đụng thêm |
| L07 used | Soft audit `_audit-soft-cssd-used-clinically-23-2026-09-28.md` — event + SC whitelist · draft migrate recall await Lead |
| L08 ledger | Draft `supabase/migrations/20260928023000_cssd_ledger_ensure_chi_tiet_on_move.sql` Approach A `so_luong=0` · **chờ PO/Lead apply** |

---

## Files (this Soft Soft-queue slice only)

| Path | Change |
|------|--------|
| `src/modules/cssd-erp/components/packaging/CompositionReconcilePanel.tsx` | L01 gateMode scan-only |
| `src/modules/cssd-erp/components/scan/QRScanSuccessCard.tsx` | L02 no banner |
| `src/modules/cssd-erp/hooks/useCSSDWorkflow.ts` | L02 silent + `formatTimeHmVi` |
| `src/modules/cssd-erp/views/CSSDERPPage.tsx` | Drop `ledgerWarning` prop |
| `src/lib/format-datetime-vi.ts` (+ `.spec.ts`) | `formatTimeHmVi` HH:mm |
| `src/lib/domain/cssd-lam-sach-lot-gate.ts` | Comment: warning = lifecycle, FE silent |
| `docs/modules/_audit/_audit-soft-cssd-l01-l05-verify-2026-09-28.md` | This audit |
| Soft Soft-queue beat | `_audit-full-debt-overlap-2026-09-27.md` |

**Prior WT (leave alone):** L03 picker / used_clinically 23 / phiếu mẻ 18b / ledger draft — not reverted.

---

## UAT checklist

| # | Case | Expect |
|---|------|--------|
| U1 | Trạm `DONG_GOI` quét bộ | Hiện thẻ cần/thực tế · **không** nút «Tách gói» · **không** select vật liệu · **không** link đề nghị BOM · Confirm → chờ TK |
| U2 | CAP_PHAT thiếu BOM (D8) | Vẫn cấp · thẻ quét **không** banner «Thiếu… vẫn cấp» · thời gian `HH:mm` |
| U3 | LAM_SACH thiếu lot enzyme | Vẫn qua · **không** soft-warn banner QT.18 trên thẻ |
| U4 | `/cssd-su-co` picker SC | Chỉ chu trình mở ∧ tram∈6 ∧ ¬used · catalog OUT · used OUT |
| U5 | CAP_PHAT + SC TK OPEN/CONFIRMED trên mẻ/chu trình | Hard-block message · CLOSED + biên bản → pass (khi đủ HSD/tinh_trang/mẻ ĐẠT) |
| U6 | Heat-split Lock A catalog | **PARK** — không UAT `parent_bo_id` đến khi schema |

---

## Domain ask

1. **L04:** Confirm migrate `cssd_dm_bo_dung_cu.parent_bo_id` (+ dual-track catalog Lock A) trước Soft fan-out schema — hiện MAIN/SUB fact + sub `ma_bo` không đủ DoD Lock A chữ `parent_bo_id`.
2. **L04 residual:** Tem mẹ ghép nhận khoa (Lead) — không chặn Soft Soft-queue L01–L03/L05.
3. **L08:** PO `so_luong=0` vs THEM_DONG — Soft draft A giữ; Lead apply sau confirm.
4. **Không ask** L06 AB (đã Soft 18b) / L07 nguồn event (đã Soft 23 A).

---

## Tests

```
npx vitest run \
  src/lib/format-datetime-vi.spec.ts \
  src/lib/domain/cssd-lam-sach-lot-gate.spec.ts \
  src/lib/domain/cssd-pack-issuance.spec.ts \
  src/lib/domain/cssd-packaging-rules.spec.ts \
  src/modules/cssd-erp/lib/me-tiet-khuan-qc.spec.ts \
  src/modules/cssd-su-co/domain/cssd-used-clinically.spec.ts \
  src/modules/cssd-erp/workflow/domain/cssd-stations.spec.ts \
  src/lib/domain/cssd-heat-split.spec.ts
→ 8 files · 54 passed
npx tsc --noEmit -p tsconfig.json → exit 0
```

---

## Soft Soft-queue next

**QLCV-L01 / QLCV-L02 verify** (19d gói A UAT + checklist RPC post-Wave3 — Cloud apply draft nếu chưa).
