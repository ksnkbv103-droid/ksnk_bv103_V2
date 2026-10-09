# 20d — NKBV SSI deepest wins (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 |
| Neo | SSOT 10 §C.5 / C.5.3 «sâu nhất thắng»; Soft audit park #8; backlog **NKBV-L04** P1 |
| Tip | `evaluateSsi` / `mapSsiCriteriaFlags` — depth **manual** `ssi_depth` (submit-gate mặc định SUPERFICIAL) |
| Trạng thái | **Domain chốt A** — Soft theo DoD §3; PO xác nhận khi rảnh |
| Ưu tiên | #4 sau RIT · age-null · Transfer |

## §1. Lock SSOT

Khi Superficial + Deep + Organ cùng thỏa trong SP → báo **độ sâu sâu nhất**.  
Organ/Space cần **≥1 tiêu chí site Ch.17** — **không invent** criteria Organ.  
Tip hiện: BA chọn `ssi_depth`; engine không auto deepest → Domain park.

## §2. Ba phương án

| | A — Engine auto deepest + warn (khuyến nghị) | B — Warn only, giữ manual | C — Giữ tip (zero gate) |
|---|-----------------------------------------------|---------------------------|-------------------------|
| Hành vi | `evaluateSsi` chọn sâu nhất trong các tầng **đã met**; nếu user nông hơn → warn UI, kết luận theo engine | Soft warn lệch form; vẫn tin `ssi_depth` user | Không đổi |
| Đúng NHSN | Khớp «sâu nhất thắng» | Under-report nếu BA chọn nông | Lệch SSOT / audit #8 |
| Side-effect | BA bất ngờ đổi depth | Tử số depth sai | Nợ kỹ thuật |
| Tip | Đổi evaluateSsi + map flags | Nhẹ | Zero |

**Phản biện A:** cần map criteria→depth rõ; Organ thiếu Ch.17 **không** nâng Organ.  
**Phản biện B:** audit đã ghi gap — warn không bảo vệ tử số depth.  
**Phản biện C:** không chấp nhận khi L04 P1 đã park.

**So sánh:** đúng Ch.9 · ít silent SUPERFICIAL · kiểm chứng (nông+sâu met → Deep; Organ+Ch.17 → Organ).

**Chốt Domain = A.** Loại B (phụ thuộc BA). Loại C (lệch SSOT).

## §3. DoD mỏng Soft

1. `evaluateSsi` pick **deepest met** depth (Superficial < Deep < Organ-Space).
2. Organ chỉ khi criteria Organ **và** ≥1 site Ch.17 met — **không invent** tiêu chí.
3. User `ssi_depth` nông hơn engine → kết luận engine + warn UI (không silent).
4. Spec: nông+sâu đủ → Deep; Organ thiếu Ch.17 → không Organ; PATOS/SP **không** đụng trong lát.
5. Không đụng RIT / MBI / Transfer trong lát này.

## §4. Ngoài lát

MBI ANC (20e), APRV/ECMO/HFV (20f) = L05/L06 sau L04.

## Nhật ký lát — _audit-soft-nkbv-ssi-20d-2026-09-28.md

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
