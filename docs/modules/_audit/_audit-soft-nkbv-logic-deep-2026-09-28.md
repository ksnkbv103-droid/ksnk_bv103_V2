# Audit Soft — NKBV **logic** deep dive (case determination) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip before `02b5a57` |
| Branch | `cursor/me-sync-recall-print` |
| Neo Domain | Drive Soft Domain pack **v4.0** `10-NKBV-diagnosis-domain-ssot-adult.md` + `10-NKBV-README.md` (2026-09-22); refine từ v3.3 |
| Phạm vi | **Logic xác định ca** end-to-end — NOT IA/PedVAP labels |
| Không | push / PR / Cloud / migrate / invent CDC / expand MBI-ANC / APRV carve-out |

---

## 0. Why prior Soft audit felt shallow (1 short section)

Prior `_audit-soft-nkbv-deep-2026-09-28.md` mapped **doors / 3-lớp data / architecture** and fixed **PedVAP copy**. It asserted «one truth engine» without walking decision points, without tip-vs-**v4.0** mismatch table (file:line), and without exercising golden/edge branches. **This pass is logic-first** against v4.0 locks §0–§C.

---

## 1. Per-type decision maps (tip runtime)

### 1.1 Shared Ch.2 timing (LCBI / UTI / PNEU / Ch.17 — **NOT** SSI & VAE)

| Step | Lock (v4.0) | Tip truth |
|------|-------------|-----------|
| Index → IWP ±3 (7d) | §B.2.2 | `clinicalIwp` · `nkbv-shared-timeline.ts` · bridges |
| DOE = first criterion in IWP | §B.2.3 | bridges `resolve*Doe` + `calculateCdcMetrics` |
| POA = HD1–2 (+2d pre-admit); HAI = HD≥3 | §0.2 / §B.2.4 **cấm 48h** | `poaOrHai` · **Soft fix:** `applyCh2PoaGate` in rules-engine |
| RIT 14d (DOE=d1) | §B.2.6 | `clinicalRitEnd` / grid RIT — **not enforced as hard stop in evaluate*** |
| SBAP = IWP∪RIT | §B.2.7 | `clinicalSbapWindow` / `resolveClinicalSbap` |
| Device >2 calendar days + DOE/DOE−1 | §B.2.8 | `isDeviceAssociated` / `deviceAssociationFromCanThiepDates` (Day1=placement; gap≥1 resets) |
| LOA + Transfer | §B.2.5 | `calculateCdcMetrics` stays; hydrate từ `ba_ngay_khoa` via Hub |

### 1.2 BSI / CLABSI (`evaluateBsiClabsi` → Core)

```
ruledOut → fungi community → LCBI1 (RECOGNIZED) | LCBI2 (commensal×2 separate + sx)
  → Secondary gate BEFORE CLABSI (localized + SBAP/match | Scenario2 ∈ window)
  → else CVC device-assoc (≥3 calendar days) → CLABSI | PRIMARY_BSI_NON_CLABSI
  → after LCBI+CVC path: MBI subset (intestinal + ANC≥2d|HSCT|severe diarrhea) → MBI_LCBI
  → applyCh2PoaGate
```

Bridge: `buildBsiTimelineVerdict` (grid → payload → **same** evaluate).

### 1.3 UTI / CAUTI (`evaluateUtiCauti`)

```
ruledOut → >2 spp CONTAM → yeast-only CANDIDA_EXCLUSION → CFU<10⁵ LOW_CFU
  → IUC device-assoc? → CAUTI_* : SUTI/ABUTI/ASB
  → sx → SUTI / CAUTI_SUTI (voiding stripped if Foley present)
  → no sx + blood match (no yeast) → ABUTI / CAUTI_ABUTI
  → else ASB
  → attachUtiSecondaryBsi (yeast blood ban) + bridge SBAP enrich
  → applyCh2PoaGate
```

USI = Ch.17 (`nkbv-ch17-def-usi`) — **not** Ch.7.

### 1.4 Adult vent: VAE first, else PNEU (`evaluateVaeVap`)

```
VAE pathway: age≥18 & vent≥4 → (ECMO/APRV stub NO_EVENT) → VAC → IVAC → PVAP
  Secondary only on PVAP + Event Period 14d
PNEU pathway: if adult VAE-in-plan → redirect reason; else imaging → PNU3/2/1 ± VAP label
  POA gate only on PNEU pathway
```

### 1.5 SSI (`evaluateSsi`) — no Ch.2 IWP/POA/RIT

```
days in SP (30/90 by depth+proc; SIS/DIS 30) → else EXPIRED
PATOS → stop
depth criteria (user-selected) → Organ needs Ch.17 site allowlist
Secondary: SSI-SBAP [DOE−3, DOE+13]
```

**Deepest wins:** tip = **manual** `ssi_depth` / event type — **no auto deepest** (Domain park).

### 1.6 Ch.17 (`evaluateCh17`)

Defs wired: BJ/CNS/CVS/GI/LRI/REPR/**USI** + **EENT** + **SST** (`nkbv-ch17-definitions.ts` spreads). Hierarchy + ENDO extended IWP. Prior Soft «missing EENT/SST engine» was **stale**.

---

## 2. Tip vs Nghĩa locks — concrete mismatch table

| # | Lock (v4.0) | Tip actual | Path | Severity | Disposition |
|---|-------------|------------|------|----------|-------------|
| 1 | HAI ≠ 48h; POA HD1–2; HAI HD≥3 | `hai_status` sent by FE but **ignored** by evaluate* → CLABSI/CAUTI/PNU still `is_positive` on POA | `nkbv-rules-engine.ts` (pre-fix) · FE `useNkbvChecklistModalState.ts:519` | **P0** | **FIXED Soft** `applyCh2PoaGate` + bridges set `hai_status` |
| 2 | Ban «48 giờ» wording as case def | Spec titles «within 24-48 hours» / «beyond 48 hours» for Transfer (logic was calendar-day OK) | `nkbv-timeline-math.spec.ts:67,93` | **P1 Soft** | **FIXED Soft** rename calendar-day |
| 3 | FE preview vs BE submit same device facts | Preview used `??`; submit used `\|\| 0/false` → silent wipe form device days when metrics 0 | `useNkbvChecklistModalState.ts` enrich block | **P0 Soft** | **FIXED Soft** `??` + form fallback |
| 4 | Scenario 2 Secondary: blood ∈ IWP/SBAP | `blood_mandatory_for_localized` alone → Secondary | `nkbv-rules-engine.ts` Secondary gate | **P1 Soft** | **FIXED Soft** require window |
| 5 | Clinical SBAP = [Index−3, DOE+13] | UTI bridge hand-rolled; OK when Index present; now explicit helper | `nkbv-uti-timeline-verdict.ts` post-SUTI | Soft clarity | **FIXED Soft** `clinicalSbapWindow` |
| 6 | Transfer Rule multi-khoa 24h → first khoa day-before DOE | Only transfer-day / day-after of active stay | `nkbv-timeline-math.ts:248–259` | **P1 Domain** | Park (needs UAT stays) |
| 7 | RIT: no new same-type event in 14d | Grid/ket-luan soft; **evaluate* không chặn RIT** | rules-engine / `nkbv-ket-luan-smart` | **P1 Domain** | Park |
| 8 | SSI deepest wins | User picks depth; shared ticks mapped only to selected depth | `mapSsiCriteriaFlags` · `evaluateSsi` | **P1 Domain** | Park + Soft option warn |
| 9 | MBI full ANC table NHSN | Partial ANC≥2d \| HSCT \| diarrhea | `evaluateBsiClabsiCore` MBI | Domain park | Park (PO) |
| 10 | APRV/ECMO/HFV exclusion full | Stub `NO_EVENT` whole day | `evaluateVaeVapCore` | Domain park | Park |
| 11 | Ped OUT | Engine no LCBI_3/SUTI_2 emit; residual `isInfantLe1` plumbing always false; dead `infantGasOk` | age-ui · ch17 · rules | Soft residual | **FIXED Soft** strip `infantGasOk`; ped plumbing Domain cleanup |
| 12 | Prior Soft: «EENT/SST missing» | **False** — defs exist & registered | `nkbv-ch17-def-eent.ts` · `…-sst.ts` · definitions spread | Audit debt | Corrected here |
| 13 | ba_ngay_khoa drives LOA | Hub hydrates `locationDaysToTreatmentHistory`; checklist default single stay if empty | `NkbvClinicalChecklistModal.tsx:141–151` · `nkbv-ba-ngay.ts` | P2 Soft/ops | Document; incomplete grid → wrong LOA |
| 14 | VAE: no IWP Ch.2 | Submit-gate error still said «IWP/VAE» | `nkbv-clinical-submit-gate.ts` | Soft copy | **FIXED Soft** |

---

## 3. Dual paths / silent defaults / FE vs BE

| Path | Role | Drift risk |
|------|------|------------|
| Hub `*-timeline-verdict` | Draft nháp | Maps grid → **same** evaluate* |
| FE `liveEvaluation` | Preview | Enriches device from `liveCdcMetrics` |
| BE `submitClinicalVerification` | Commit truth | Calls same evaluate*; **was** wiping device via `\|\|` — fixed |
| `assertClinicalEvidenceForSubmit` | Evidence gate | Not CDC algorithm; VAE message clarified |
| Checklist vs CaseEditor | Meta vs clinical | No second engine |

Silent defaults found: `ssi_depth \|\| "SUPERFICIAL"` in submit-gate (evidence only); PNEU age default `45` in bridge when age null (`nkbv-pneu-timeline-verdict.ts`) — **Domain/Soft park** (can mis-route VAE-in-plan).

Unused / underused drivers: `hai_status` (now consumed); RIT hard-stop; multi-khoa Transfer; full ANC MBI table; SIR carve-out (out of scope).

---

## 4. Soft fixes done (this commit)

| File | Change |
|------|--------|
| `lib/nkbv-rules-engine.ts` | `applyCh2PoaGate`; Core wrappers; Scenario2 window; strip `infantGasOk`; PNEU-only POA |
| `lib/nkbv-{bsi,uti,pneu}-timeline-verdict.ts` | set `hai_status` from admission+DOE; UTI SBAP via `clinicalSbapWindow` |
| `components/useNkbvChecklistModalState.ts` | device enrich `??` (align preview/submit) |
| `lib/nkbv-timeline-math.spec.ts` | ban «48h» titles; UTI infant title |
| `lib/nkbv-clinical-submit-gate.ts` | VAE copy not claiming IWP Ch.2 |
| `lib/nkbv-rules-engine.spec.ts` | POA → not CLABSI test |

---

## 5. Domain / PO park list (do **not** Soft-invent)

1. Multi-khoa Transfer (24h → first khoa day before DOE)
2. Hard RIT suppress new same-type phiếu
3. SSI auto «deepest wins»
4. MBI full ANC/GI NHSN table + organism browser lists
5. APRV/ECMO/HFV day-level VAC pipeline (beyond stub)
6. Strip `isInfantLe1` param + taxonomy legacy read maps (cleanup wave)
7. SIR / Location in-plan carve-out
8. PNEU bridge default age=45 when DOB missing
9. USI/EENT/SST **UI completeness / UAT** (engine defs present)

≥2 Soft options weighed for P0/P1: POA gate in engine vs submit-only → **engine** (bridges+FE+BE one truth); device `??` vs drop metrics enrich → **`??`**.

---

## 6. Test / coverage gaps that hide logic bugs

| Path | Golden covered? | Edge missing |
|------|-----------------|--------------|
| BSI LCBI1→CLABSI / Secondary / MBI | rules-engine.spec yes | POA (**added**); Scenario2 window edge |
| UTI yeast / CAUTI / ABUTI | yes | SBAP blood outside IWP only; voiding+Foley |
| VAE VAC→IVAC→PVAP | yes | APRV partial day; Event Period secondary miss |
| PNEU imaging / PNU tiers / VAE redirect | yes | age null→45; cardio ≥2 films |
| SSI SP/PATOS/Organ | yes | deepest auto; SP reset new surgery |
| Ch.17 ENDO / USI | partial | EENT/SST acceptance sparse |
| Transfer LOA | timeline-math yes (calendar) | multi-khoa 24h **absent** |
| RIT | grid soft | evaluate hard-stop **absent** |

---

## 7. UAT that exercises **real determination** branches

1. **BSI golden:** RECOGNIZED blood HD≥3 + CVC≥3d → CLABSI; same + localized UTI match SBAP → SECONDARY_BSI (never CLABSI).
2. **BSI POA:** DOE HD2 + đủ LCBI/CVC → classification **POA**, `is_positive=false` (không tử số).
3. **BSI MBI:** intestinal + ANC≥2d → MBI_LCBI not CLABSI.
4. **UTI:** yeast-only → CANDIDA_EXCLUSION; bacterium≥10⁵ + fever + Foley≥3 → CAUTI_SUTI; no sx + blood match → ABUTI; yeast blood → not Secondary.
5. **VAE:** ≥18 + vent≥4 + VAC ticks → VAC; +fever/WBC+ABX≥4 → IVAC; +lab → PVAP ± Secondary Event Period.
6. **PNEU:** adult vent≥4 on PNEU pathway → NO_EVENT redirect VAE; non-vent imaging+sx → PNU1_NON_VAP.
7. **SSI:** DOE day 30 Superficial OK; day 30 Deep EXPIRED if limit 30; PATOS stop; Organ+IAB + blood in [DOE−3,DOE+13] Secondary.
8. **Transfer:** stays CC→ICU transfer day = DOE → LOA=CC; DOE+2 → ICU (not «longest stay»).
9. **Ch.17:** USI tick evidence → CH17:USI; CONJ/SKIN met if evidence (engine).
10. Submit checklist: device days on form survive when metrics omit dates (no silent 0).

---

## 8. Verify

- `npx tsc --noEmit`
- vitest focused: rules-engine · *-timeline-verdict · timeline-math · clinical-submit-gate · age-ui

---

## 9. One-sentence honesty

**Prior Soft pass was shallow (IA + PedVAP); this pass is actually deep on case-determination vs v4.0 locks, with Soft-safe P0 FE/BE/POA fixes and Domain park for Transfer multi-khoa / RIT / deepest / MBI-ANC.**
