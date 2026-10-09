# 20b — NKBV tuổi null / cấm default 45 (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 draft |
| Neo | Soft audit park #8; VAE ≥18; pediatric OUT |
| Tip | `nkbv-pneu-timeline-verdict.ts` default age=45 khi thiếu DOB |
| Trạng thái | **PO bỏ qua widget 2026-09-28 → mặc định A** (chặn thiếu DOB; bỏ default 45) |
| Ưu tiên park | #2 sau RIT A |

## §1. Vấn đề

Thiếu ngày sinh → tip gán tuổi 45 → có thể **nhầm vào / ra** nhánh VAE (≥18) hoặc PNEU adult. Im lặng, khó audit.

## §2. Ba phương án

| | A — Chặn submit (khuyến nghị) | B — Cảnh báo + cho chạy | C — Giữ default 45 |
|---|------------------------------|-------------------------|---------------------|
| Hành vi | Thiếu DOB/tuổi → không evaluate dương tính / không submit clinical | Warn; vẫn dùng heuristic | Giữ tip |
| An toàn | Không phân loại sai vì tuổi giả | Vẫn có thể sai nhánh | Lệch adult-only |
| Vận hành | BA/HIS phải có DOB | Nhanh hơn | Nguy hiểm |

**Chốt Domain khuyến nghị = A.** Loại C. B chỉ nếu PO chấp nhận rủi ro tạm thời.

## §3. DoD mỏng (sau PO = A)

1. Bỏ default `45` trên bridge PNEU/VAE path.
2. Thiếu tuổi → `NO_EVENT` / gate submit: «Thiếu ngày sinh — không xác định ca».
3. Spec: DOB null không ra VAC/PNU dương tính.
4. Không đụng RIT/Transfer trong lát này.


## §4. PO / mặc định

Widget bỏ qua 2026-09-28 → **A**. Soft implement DoD §3.

## Nhật ký lát — _audit-soft-nkbv-age-null-20b-2026-09-28.md

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
