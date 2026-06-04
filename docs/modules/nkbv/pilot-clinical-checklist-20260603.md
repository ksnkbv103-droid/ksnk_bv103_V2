# NKBV — Pilot checklist form lâm sàng (CDC) — UAT sign-off

> D-14 · Code: `NkbvClinicalChecklistModal` + sub-forms · Spec: `nkbv-rules-engine.spec.ts`

## Phủ syndrome (verified code)

| Syndrome | Sub-form | Automated spec |
|----------|----------|----------------|
| BSI | `BsiClinicalSubForm` | `nkbv-rules-engine.spec.ts` |
| UTI | `UtiClinicalSubForm` | ✓ |
| VAP/PNEU | `PneuClinicalSubForm`, `VaeClinicalSubForm` | ✓ |
| SSI | `SsiClinicalSubForm` | ✓ + `CssdTraceLink` |

## Kịch bản tay (Pilot DoD)

| # | Kịch bản | Kỹ thuật verify | UAT khoa KSNK |
|---|----------|-----------------|---------------|
| 1 | Day-3 rule → phiếu `CHO_XAC_MINH` từ cấy dương tính | `npm run test -- src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.spec.ts` | [ ] |
| 2 | Khoa lâm sàng điền form → `CHO_DUYET` | Manual `/giam-sat-nkbv` | [ ] |
| 3 | KSNK `XAC_NHAN` / `LOAI_TRU` | Manual adjudication panel | [ ] |
| 4 | Import vi sinh trùng MD5 bỏ qua dòng trùng | Manual `NkbvViSinhImportPortal` | [ ] |
| 5 | SSI ↔ CSSD trace link hiển thị | Manual + migration `20260602150000` | [ ] |

## Sign-off

| Vai trò | Họ tên | Ngày | Chữ ký |
|---------|--------|------|--------|
| KSNK pilot lead | | | |
| IT / dev | | | |

## Ghi chú

Form đủ cho pilot BV103; trường NHSN bổ sung theo yêu cầu BV — backlog riêng.

**Engineering gate (trước UAT):**

```bash
npm run verify:engineering
npm run test -- src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.spec.ts
```
