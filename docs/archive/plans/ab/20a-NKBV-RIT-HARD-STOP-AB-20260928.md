# 20a — NKBV RIT hard-stop (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 draft |
| Neo | `10-NKBV-diagnosis-domain-ssot-adult.md` §B.2.6; Soft audit park #2 |
| Phạm vi | LCBI/UTI/PNEU/Ch.17 (có RIT Ch.2). **Không** SSI, **không** VAE |
| Trạng thái | **PO chốt A** 2026-09-28 02:24 +07 — hard-stop evaluate*; Soft/Cloud theo DoD §3 |
| Ưu tiên park | #1 trong gói A (PO 2026-09-28) |

## §1. Lock SSOT (không tranh)

RIT = **14 ngày lịch** từ DOE (DOE = ngày 1). Trong RIT: **không báo ca cùng loại**; giữ DOE/LOA/gắn dụng cụ gốc; thêm tác nhân mới vào ca cũ.

- **Major type** (một RIT chung): BSI (mọi LCBI/MBI), UTI (SUTI/ABUTI), PNEU (mọi PNU).
- **Specific type:** site Ch.17 (SKIN ≠ DECU có thể chồng RIT).
- Tip hiện: grid/kết luận soft; **evaluate* không chặn** → Domain park.

## §2. Ba phương án

| | A — Hard-stop evaluate (khuyến nghị) | B — Cảnh báo + cho lưu | C — Chỉ UI/grid soft (giữ tip) |
|---|--------------------------------------|-------------------------|--------------------------------|
| Hành vi | `evaluate*` từ chối ca mới cùng major/specific type nếu DOE mới ∈ RIT ca đang mở; gợi ý gắn pathogen vào ca cũ | Evaluate trả `RIT_OVERLAP` warn; vẫn `is_positive` nếu đủ tiêu chí; BA/KSNK tự quyết | Không gate engine |
| Đúng NHSN | Khớp «không báo ca cùng loại» | Dễ trùng tử số nếu BA bỏ qua warn | Lệch SSOT |
| An toàn dữ liệu | Tử số sạch | Phụ thuộc kỷ luật người dùng | Phình rate |
| Khớp tip | Cần Soft thêm RIT lookup theo BN+type | Nhẹ hơn | Zero code Domain |
| Bảo trì | Cần index ca mở + RIT end | Đơn giản | Nợ kỹ thuật |

**Phản biện A:** cần dữ liệu ca trước đủ DOE/type; ENDO RIT = hết admission (không 14d) — phải nhánh riêng.  
**Phản biện B:** Soft-safe POA đã cứng; RIT soft sẽ là lỗ hổng tử số còn lại.  
**Phản biện C:** audit đã ghi thiếu — không chấp nhận khi PO đã xếp #1.

**So sánh tiêu chí:** đúng rule KSNK/NHSN · ít side-effect · kiểm chứng được (spec + UAT trùng loại trong 14d).

**Chốt Domain khuyến nghị = A.** Loại B/C vì không bảo vệ tử số.

## §3. DoD mỏng Lead/Soft (sau PO = A)

1. Gate trong `evaluate*` (và bridge) theo major/specific type; SSI/VAE **bypass**.
2. ENDO: RIT = hết đợt nằm viện hiện tại (SSOT §17), không 14d.
3. Hit RIT → không tạo tử số mới; message: thêm tác nhân vào ca cũ / mở ca sau RIT.
4. Spec: cùng UTI DOE+5d → block; loại khác (UTI vs BSI) → không block; hết RIT → cho ca mới.
5. Không invent list organism; không đụng MBI/Transfer trong lát này.

## §4. Ngoài lát

age-null, Transfer đa khoa, SSI deepest, MBI ANC, APRV = lần lượt theo gói A đã chốt — file A/B riêng khi tới lượt.


## §5. PO chốt

**A** — 2026-09-28. Soft implement DoD §3; không mở age-null/Transfer trong cùng lát trừ khi Lead gộp có kiểm soát.

## Nhật ký lát — _audit-soft-nkbv-rit-20a-2026-09-28.md

# Soft — NKBV RIT hard-stop 20a=A — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `244ef21` + uncommitted Soft slice |
| Branch | `cursor/me-sync-recall-print` |
| Neo | `docs/modules/nkbv/20a-NKBV-RIT-HARD-STOP-AB-20260928.md` DoD §3 · PO = **A** |
| Không | commit / push / PR / Vercel / migrate / age-null / MBI / Transfer / organism invent |

## Behavior (DoD §3)

1. **Gate** in `evaluateBsiClabsi` / `evaluateUtiCauti` / `evaluateVaeVap(PNEU)` / `evaluateCh17` via `applyCh2RitGate` after POA. **SSI** + **VAE** pathway **bypass**.
2. **ENDO**: RIT end = `endoRitSbapToDischarge` (hết admission), not 14d.
3. Hit → `is_positive=false`, `classification=RIT`, message gợi ý thêm tác nhân vào ca cũ / mở ca sau RIT.
4. Match: major type (BSI/UTI/PNEU) hoặc Ch.17 **specific** (SKIN ≠ DECU).
5. No priors on payload → no-op (bridge/write inject). Write `submitClinicalVerification` loads siblings cùng `ma_benh_an` (skip LOAI_TRU). IWP panel maps `priorEvents` → bridges.

## Files

- `lib/nkbv-rit-hard-stop.ts` + `.spec.ts`
- `lib/nkbv-rules-engine.ts` (wrap evaluate*)
- `types/nkbv-verification.ts` (`rit_prior_events` / `rit_exclude_event_ids`)
- bridges: `nkbv-uti|bsi|pneu-timeline-verdict.ts`
- `components/NkbvSyndromeIwpPanel.tsx`
- `actions/giam-sat-nkbv-write.actions.ts`
- DoD mirror `docs/modules/nkbv/20a-NKBV-RIT-HARD-STOP-AB-20260928.md`

## Spec / UAT

- Vitest: UTI DOE+5d block; UTI vs BSI no block; after RIT allow; ENDO admission; SSI/VAE bypass; evaluate* classification `RIT`.
- UAT manual: BA có UTI DOE D0 đủ TC → Index UTI D+5 → verdict/submit không tử số mới; D+14 cho phép; BSI trong RIT UTI vẫn Primary OK.

## Domain ask

- **None for 20a.** age-null (L02/20b) **out of this slice** — Soft starts after this report (PO default A; Domain steering).
- Park còn lại: Transfer đa khoa · SSI deepest · MBI ANC · APRV.
