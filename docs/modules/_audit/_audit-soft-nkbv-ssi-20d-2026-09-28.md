# Soft — NKBV SSI deepest wins · 20d=A — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `244ef21` + uncommitted Soft (RIT/age-null/Transfer **left alone**) |
| Branch | `cursor/me-sync-recall-print` |
| Neo | `docs/modules/nkbv/20d-NKBV-SSI-DEEPEST-AB-20260928.md` DoD §3 · **Domain chốt A** |
| Không | commit / push / PR / Vercel / migrate / invent Organ Ch.17 / RIT / MBI / Transfer / APRV / PATOS-SP churn |

## Behavior (DoD §3)

1. **`evaluateSsi`** picks **deepest met** depth among Superficial < Deep < Organ-Space (per-depth SP window; PATOS/EXPIRED paths preserved).
2. **Organ** only when site present **and** (≥1 Ch.17 criterion met when site has def; generic Organ alone **does not** elevate). No invented Organ criteria. Site allowlist/catalog fail-closed early (`INVALID_SITE`).
3. User `ssi_depth` / event nông hơn engine → **engine conclusion** + `warnings[]` (reason + amber UI) — not silent.
4. Spec: nông+sâu met → **Deep**; Organ thiếu Ch.17 → **not Organ** (fall to Deep/Superficial if those met). PATOS/SP formulas not rewritten.
5. **Không đụng** RIT / MBI / Transfer / APRV.

## Files

- `lib/nkbv-rules-engine.ts` — deepest helpers + `evaluateSsi` rewrite; `RuleEvaluationResult.warnings` / `ssi_engine_depth`
- `lib/nkbv-ssi-timeline-verdict.ts` — `mapSsiCriteriaFlags` maps shared ticks → **all** depth flags; push engine warnings → `gate.warnings`
- `lib/nkbv-ssi-deepest.spec.ts` — focused 20d vitest
- `lib/nkbv-rules-engine.spec.ts` · `nkbv-ssi-timeline-verdict.spec.ts` — expect DIP / Ch.17 Organ
- `components/sub-forms/SsiClinicalSubForm.tsx` — amber «Sâu nhất thắng» warn
- `components/NkbvDiagnosticCaseForm.tsx` — amber warn on kết luận row
- DoD mirror `docs/modules/nkbv/20d-NKBV-SSI-DEEPEST-AB-20260928.md`

## Spec / UAT

- Vitest: `nkbv-ssi-deepest` + rules-engine SSI + timeline SSI + ch17-acceptance + rit-hard-stop = **84** pass; `tsc --noEmit` clean.
- UAT: form SIP + superficial+deep ticks → DIP + amber warn; chỉ nông → SIP; Organ IAB không Ch.17 → không Organ; IAB + Ch.17 → `ORGAN_SPACE:IAB`; PATOS vẫn PATOS; PJI sau COLO → `INVALID_SITE`.

## Domain ask

- **None for 20d** (Domain A already). Soft Soft-queue next = **MBI ANC 20e** (line-check PDF, **no invent numbers**) then **APRV 20f**.
