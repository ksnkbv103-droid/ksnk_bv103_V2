# NKBV — Clinical forms coverage audit (Phase 5.2)

> Đối chiếu [`clinical-forms.md`](./clinical-forms.md) ↔ code pilot · 2026-06-10

## Tóm tắt rubric

| Syndrome | Sub-form | Rules engine spec | Pilot checklist | Coverage |
|----------|----------|-------------------|-----------------|----------|
| BSI | `BsiClinicalSubForm` | ✓ `nkbv-rules-engine.spec.ts` | [`pilot-clinical-checklist-20260603.md`](./pilot-clinical-checklist-20260603.md) #1 | **Pilot-ready** |
| UTI | `UtiClinicalSubForm` | ✓ | #1 | **Pilot-ready** |
| VAP/PNEU | `PneuClinicalSubForm`, `VaeClinicalSubForm` | ✓ | #1 | **Pilot-ready** |
| SSI | `SsiClinicalSubForm` + CSSD trace | ✓ + migration `20260602150000` | #5 | **Pilot-ready** |

**Kết luận:** Form đủ cho pilot BV103; trường NHSN mở rộng → backlog post-pilot.

---

## Chi tiết theo biểu mẫu spec

### UTI (CA-UTI / SUTI / ABUTI)

| Trường spec | Type `UtiVerificationData` | UI sub-form | Ghi chú |
|-------------|---------------------------|-------------|---------|
| Foley ngày đặt/rút | `device_placed_date`, `device_removed_date` | ✓ | |
| CFU ≥ 10⁵ | `urine_cfu_count` | ✓ | |
| ≤2 tác nhân / nấm loại trừ | `pathogen_count`, `has_fungi_yeast_parasite` | ✓ + block UI | |
| Triệu chứng IWP | `has_fever`, `has_suprapubic_tenderness`, … | ✓ + `symptom_dates` | |
| ABUTI cấy máu | `has_blood_culture_positive_in_window`, `blood_urine_pathogen_matches` | ✓ | |
| Attribution HAI/POA | `hai_status`, `attributed_khoa_*` | Engine | Tính server-side |

**Gap nhỏ:** spec liệt kê riêng urgency/frequency — UI gộp `has_dysuria` (chấp nhận pilot).

### BSI (CLABSI / LCBI)

| Trường spec | Implemented | Ghi chú |
|-------------|-------------|---------|
| CVC ngày / active | ✓ | |
| Commensal ≥2 lần lấy riêng | ✓ | |
| Localized infection + SBAP | ✓ | |
| Nấm hô hấp cộng đồng | ✓ | Rule loại COMMUNITY |

### VAE / PNEU

| Trường spec | Implemented | Ghi chú |
|-------------|-------------|---------|
| VAE PEEP/FiO2 | ✓ `VaeClinicalSubForm` | |
| IVAC 5-day window | ✓ | |
| PVAP culture | ✓ | |
| Non-vent PNEU imaging | ✓ `PneuClinicalSubForm` | Tách form PNEU vs VAE |

### SSI

| Trường spec | Implemented | Ghi chú |
|-------------|-------------|---------|
| Superficial / Deep / Organ-space | ✓ | |
| Implant 90d vs 30d | ✓ `has_implant` | |
| Secondary BSI | ✓ | |
| NHSN procedure code | ✓ `loai_phau_thuat_nhsn` | |
| CSSD trace QR | ✓ `ma_qr_cssd_lien_quan` | Cycle QR Phase 5 resolve 3 cột |

---

## Backlog (không chặn pilot)

| ID | Hạng mục | Priority |
|----|----------|----------|
| N-G1 | Tách urgency/frequency UTI riêng checkbox | P3 |
| N-G2 | NHSN trường bổ sung theo yêu cầu BV | P2 |
| N-G3 | LIS auto-map loại NKBV (hiện phán quyết thủ công) | Out of pilot (5.5) |
| N-G4 | E2E adjudication panel | P2 |

---

## Verify engineering

```bash
npm run verify:engineering
npx vitest run src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.spec.ts
```

**Manual UAT:** [`pilot-clinical-checklist-20260603.md`](./pilot-clinical-checklist-20260603.md) ký ≥4/5.
