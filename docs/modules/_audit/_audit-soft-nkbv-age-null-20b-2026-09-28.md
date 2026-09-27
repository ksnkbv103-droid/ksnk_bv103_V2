# Soft — NKBV age-null / cấm default 45 · 20b=A — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `244ef21` + uncommitted Soft slice (RIT 20a + ensure-chi_tiet left alone) |
| Branch | `cursor/me-sync-recall-print` |
| Neo | `docs/modules/nkbv/20b-NKBV-AGE-NULL-AB-20260928.md` DoD §3 · PO bỏ qua → **mặc định A** |
| Không | commit / push / PR / Vercel / migrate / RIT / Transfer / MBI / invent CDC |

## Behavior (DoD §3)

1. **Bỏ default `age=45`** trên bridge PNEU (`buildPneuTimelineVerdict`) và `coerceAdultPatientAge` (trả `null`, không invent).
2. **Thiếu DOB/tuổi** → bridge `NO_EVENT` + reason/gate «Thiếu ngày sinh — không xác định ca»; clinical submit gate chặn PNEU/VAE/VAP/HAP cùng message.
3. Spec: DOB/age null **không** ra VAC/PNU dương tính; không còn `age = … : 45` trên path VAE/PNEU whitelist.
4. **Không đụng** RIT / Transfer / MBI trong lát này.

## Files

- `lib/nkbv-pneu-vae-route.ts` — `isKnownPatientAge` · `MISSING_DOB_NO_EVENT_REASON`
- `lib/nkbv-pneu-timeline-verdict.ts` — early `NO_EVENT` khi thiếu tuổi
- `lib/nkbv-age-ui.ts` — `coerceAdultPatientAge` → `number \| null`
- `lib/nkbv-clinical-submit-gate.ts` — gate PNEU/VAE/VAP/HAP thiếu `patient_age`
- `components/sub-forms/PneuClinicalSubForm.tsx` — không sync/invent 45; hint DOB
- specs: `nkbv-pneu-timeline-verdict.spec.ts` · `nkbv-age-ui.spec.ts` · `nkbv-clinical-submit-gate.spec.ts` · `nkbv-pneu-vae-route.spec.ts` (mới)
- DoD mirror `docs/modules/nkbv/20b-NKBV-AGE-NULL-AB-20260928.md`

## Spec / UAT

- Vitest: age null/omitted → `NO_EVENT` + message; coerce null; gate chặn thiếu age; adult+vent≥4 vẫn A5 VAE route.
- UAT manual: BA thiếu DOB trên PNEU IWP → verdict không dương tính; submit clinical bị chặn message cố định; có DOB/tuổi người lớn → path cũ.

## Domain ask

- **None for 20b.** Next Soft = Transfer multi-khoa **20c** (Domain A Ready Soft).
- Park còn lại: SSI deepest · MBI ANC · APRV.
