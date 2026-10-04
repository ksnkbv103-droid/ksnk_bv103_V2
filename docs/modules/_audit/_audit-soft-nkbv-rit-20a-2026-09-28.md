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
