# Soft — NKBV APRV / ECMO / HFV day-level VAE · 20f=A — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `244ef21` + uncommitted Soft (RIT/age/Transfer/SSI/MBI **left alone**) |
| Branch | `cursor/me-sync-recall-print` |
| Neo | `docs/modules/nkbv/20f-NKBV-APRV-ECMO-HFV-AB-20260928.md` DoD §3 · **Domain chốt A** |
| **Verdict** | **DONE** Soft-local (cite extract; **không invent**) — **không** PARK |
| Không | commit / push / PR / Vercel / migrate / invent ngưỡng ngoài Ch.10 / MBI / RIT / SSI / Transfer |

## Soft Soft line-check extract

| | |
|--|--|
| Extract | `nkbv-sources/extracted/cdc-ch10.txt` (copied Soft Soft from box `/workspace/nkbv-sources/extracted/cdc-ch10.txt`) |
| Mac có extract trước lát? | **Không** — Soft Soft copy vào repo local |
| Ambiguous? | **Không** cho rule chính (ECMO/HFV full-day exclude · APRV FiO₂-only). FAQ nos. 18/19 «related modes» list **không** có trong extract numbered FAQ body (refs 18/19 = bibliography) — Soft Soft **không invent** related-mode catalog; APRV named mode đủ. |

### Cite (file:line)

| Rule | Cite |
|------|------|
| ECMO / HFV / ECLS **trọn ngày lịch** → excluded from VAE | `cdc-ch10.txt:126-131` · `1460-1461` |
| APRV **INCLUDED**; stability/worsening = **FiO₂ only** (PEEP N/A) | `cdc-ch10.txt:118-120` · `1466-1472` |
| APRV optional mark on VAE Form | `cdc-ch10.txt:1470-1472` |

**Không invent:** ΔPEEP≥3 / ΔFiO₂≥20 / baseline≥2d / worsen≥2d giữ tip sẵn (protocol VAC chung) — không thêm ngưỡng mới.

## Behavior (DoD §3)

1. **Day-level:** `vent_daily_params[].on_ecmo` / `on_hfv` → ngày đó **out** of VAC baseline/worsening; remaining window must be **calendar-adjacent** (gap breaks stretch).
2. **APRV:** `on_aprv` (day hoặc episode) → VAC **FiO₂-only**; PEEP-equivalent ignored (`effectivePeep` null).
3. **Bỏ stub** `NO_EVENT` whole-day khi có daily grid ≥4 (carve-out trong `computeVacFromDailyVent`). Không grid + episode ECMO/HFV → vẫn NO_EVENT (không ngày để carve).
4. **Zero invent** — chỉ rule Soft Soft cite ở trên.
5. Spec: ECMO giữa stretch → ngày out; APRV FiO₂ đủ → VAC; **không đụng** MBI/RIT/SSI.
6. **Flag PO G.1#2** — confirm Soft Soft cites + legacy `on_aprv_or_hfv` map → APRV (không HFV exclude); HFV phải tick `on_hfv` riêng.

## Files

- `nkbv-sources/extracted/cdc-ch10.txt` — evidence extract (new local)
- `docs/modules/nkbv/20f-NKBV-APRV-ECMO-HFV-AB-20260928.md` — DoD mirror
- `lib/nkbv-vae-vent-compute.ts` · `.spec.ts` — day-level exclude + APRV FiO₂-only + episode flag apply
- `lib/nkbv-rules-engine.ts` — remove APRV/ECMO whole-day stub when grid; pass episodeMode
- `lib/nkbv-rules-engine.spec.ts` — mid-stretch ECMO VAC · APRV FiO₂ VAC · episode ECMO no-grid NO_EVENT
- `types/nkbv-verification.ts` — per-day + `on_aprv` / `on_hfv`
- `lib/nkbv-pathogen-rules.ts` — defaults
- `components/sub-forms/VaeClinicalSubForm.tsx` — split APRV/HFV/ECMO + per-row ticks
- Audit này · Soft Soft-queue beat `_audit-full-debt-overlap-2026-09-27.md`

## Spec / UAT

- Vitest: `nkbv-vae-vent-compute` + `nkbv-rules-engine` VAE 20f · `tsc --noEmit` OK
- UAT: ECMO day mid-grid → VAC on later adjacent 4d; APRV PEEP-only → ¬VAC; APRV FiO₂↑≥20 → VAC; episode ECMO no grid → NO_EVENT

## Domain / PO ask

| # | Ask |
|---|-----|
| **PO G.1#2** | Confirm Soft Soft-cited Ch.10 rules (full-day ECMO/HFV exclude · APRV FiO₂-only) trước harden tiếp; confirm legacy `on_aprv_or_hfv` → APRV map; HFV = `on_hfv` riêng. FAQ 18/19 related-mode list thiếu trong extract — PO có PDF trang FAQ 18/19 thì bổ sung, Soft Soft không invent. |
| Domain | None for 20f A (already). |

## Soft Soft-queue next

**Soft-ready GSC-L01/L02 → CSSD-L01…L05 verify → QLCV-L01/L02 verify** (NKBV L01–L06 Soft-local closed).
