# Soft — NKBV MBI ANC / GI Ch.4 · 20e=A — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `244ef21` + uncommitted Soft (RIT/age/Transfer/SSI **left alone**) |
| Branch | `cursor/me-sync-recall-print` |
| Neo | `docs/modules/nkbv/20e-NKBV-MBI-ANC-AB-20260928.md` DoD §3 · **Domain chốt A** |
| **Verdict** | **DONE** Soft-local (cite extract; **không invent**) — **không** PARK |
| Không | commit / push / PR / Vercel / migrate / invent ANC số / SSI deepest / APRV / RIT / Transfer |

## Soft Soft line-check extract

| | |
|--|--|
| Extract | `nkbv-sources/extracted/cdc-ch4.txt` (copied Soft Soft from box `/workspace/nkbv-sources/extracted/cdc-ch4.txt`) |
| Mac có extract trước lát? | **Không** — chỉ archive Domain notes; Soft Soft copy vào repo local |
| Ambiguous? | **Không** — Table 2 + Table 5 rõ số |

### Cite (file:line)

| Số / rule | Cite |
|-----------|------|
| ANC/WBC **&lt;500** cells/mm³ | `cdc-ch4.txt:425` · `874-875` · `896-897` |
| **≥2** separate days | `cdc-ch4.txt:425` · `896-897` |
| Cửa sổ **máu (+) ±3** calendar days (=7 ngày) | `cdc-ch4.txt:425-427` · `441-443` · `896-897` |
| Allo HSCT within past year + GI GVHD III/IV | `cdc-ch4.txt:415-418` |
| Diarrhea ≥1 L/24h (hoặc ≥20 mL/kg/24h &lt;18y); onset ≤7d before blood — **under HSCT only** | `cdc-ch4.txt:419-421` |
| MBI ⊂ LCBI trước | `cdc-ch4.txt:392-393` |
| MBI organism = NHSN Terminology Browser | `cdc-ch4.txt:447` → **G.1#5** (không hard-code list đóng) |

## Behavior (DoD §3)

1. **Cấm invent** — constants trong `nkbv-mbi-ch4.ts` = số Soft Soft cite ở trên.
2. MBI = LCBI (đã) + MBI-eligible organism (`is_intestinal_pathogen` **proxy** · G.1#5 mở) + barrier Ch.4.
3. Barrier:
   - **Neutropenia** = attest `anc_wbc_lt_500_ge_2d` **hoặc** raw `anc_wbc_samples` ≥2 ngày &lt;500 trong máu±3.
   - **OR** allo HSCT attest `has_hsct_or_gvhd` (criterion 1a collapsed).
   - Diarrhea **chỉ** với HSCT (1b). **Tiêu chảy đơn → không MBI** (sửa tip P1 lệch Ch.4).
4. `is_neutropenia` đơn / ung thư → **không** MBI.
5. Spec: đủ cửa sổ+organism → `MBI_LCBI`; thiếu ANC/barrier/organism → CLABSI path.
6. **Flag PO G.1#1** (ngưỡng Soft Soft đã cite — cần PO confirm trước harden tiếp) + **G.1#5** organism browser.
7. **Không đụng** SSI deepest / APRV / RIT / Transfer.

## Files

- `nkbv-sources/extracted/cdc-ch4.txt` — evidence extract (new local)
- `docs/modules/nkbv/20e-NKBV-MBI-ANC-AB-20260928.md` — DoD mirror
- `lib/nkbv-mbi-ch4.ts` · `nkbv-mbi-ch4.spec.ts` — constants + window + barrier
- `lib/nkbv-rules-engine.ts` — `evaluateBsiClabsiCore` MBI block
- `lib/nkbv-rules-engine.spec.ts` — diarrhea-alone=CLABSI; HSCT+diarrhea; samples; ¬organism
- `types/nkbv-verification.ts` — `anc_wbc_samples` + cite comments
- `components/sub-forms/BsiClinicalSubForm.tsx` · `NkbvSyndromeIwpPanel.tsx` · `nkbv-clinical-symptom-catalog.ts` — Ch.4 labels
- Audit này · Soft Soft-queue beat `_audit-full-debt-overlap-2026-09-27.md`

## Spec / UAT

- Vitest: `nkbv-mbi-ch4` + `nkbv-rules-engine` BSI/MBI (+ prior RIT/SSI suites smoke) · `tsc --noEmit`
- UAT: intestinal + ANC≥2d → MBI_LCBI; thiếu barrier → CLABSI; tiêu chảy đơn → CLABSI; HSCT+tiêu chảy → MBI; ¬intestinal + ANC → CLABSI

## Domain / PO ask

| # | Ask |
|---|-----|
| **PO G.1#1** | Confirm Soft Soft-cited thresholds (&lt;500 · ≥2d · máu±3 · diarrhea 1L/20mL/kg · 7d) trước harden tiếp (lab auto-wire series UI). |
| **PO G.1#5** | Wire NHSN Terminology Browser / versioned MBI organism list — tip `is_intestinal_pathogen` heuristic chỉ proxy. |
| Domain | None for 20e A (already). Soft Soft-queue next = **APRV 20f** (`cdc-ch10.txt` có trên box). |

## Soft Soft-queue next

**APRV / ECMO / HFV 20f** (Domain A · G.1#2) — extract Ch.10 có tại box `nkbv-sources/extracted/cdc-ch10.txt`; Soft Soft line-check trước code, **cấm invent**.
