# Phase 5 — Cycle QR + NKBV audit (2026-06-10)

> Tiếp theo [domain-audit-phase4-20260610.md](./domain-audit-phase4-20260610.md)

## Đã triển khai

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| 5.1 | Cycle QR additive | **Done** | `20260610100000_cssd_cycle_qr_additive.sql`, `cssd-workflow-resolve.ts` |
| 5.2 | NKBV clinical coverage audit | **Done** | [`clinical-forms-coverage-audit-20260610.md`](../../modules/nkbv/clinical-forms-coverage-audit-20260610.md) |
| 5.3 | BRD vật tư → migration | **Deferred** | Intake chưa đóng ([`brd-vat-tu-intake-202606.md`](../../modules/cssd/brd-vat-tu-intake-202606.md)) |
| 5.4 | Batch T3 REPAIRING gate test | **Done** | `cssd-batch-create.spec.ts` |
| 5.5 | HIS/LIS | **Out of scope** | Ghi backlog N-G3 |

### Cycle QR (5.1)

- Cột `ma_cycle_qr`, `ma_qr_bo_vinh_vien` trên `cssd_fact_quy_trinh`.
- `fn_cssd_gen_cycle_qr`, `rpc_cssd_assign_cycle_qr` — gọi sau BOM checkpoint.
- `rpc_scan_workflow_station` + app resolve 3 cột QR (legacy song song).
- View `v_cssd_quy_trinh_full` expose 2 cột mới.
- NKBV trace ưu tiên `ma_cycle_qr`.

### Verify

```bash
npm run mdm:migrate:local   # hoặc mdm:migrate staging
npm run verify:cssd
npm run verify:engineering
npx vitest run src/modules/cssd-erp/shared/application/cssd-workflow-resolve.spec.ts
npx vitest run src/modules/cssd-erp/actions/cssd-batch-create.spec.ts
npx vitest run src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.spec.ts
```

Pilot tay Cycle QR: [`pilot-checklist-cycle-qr-202606.md`](../../modules/cssd/pilot-checklist-cycle-qr-202606.md)

---

## Còn cần người

| # | Việc |
|---|------|
| M1 | Ký C1–C6 cycle QR staging |
| M2 | Ký NKBV clinical UAT ≥4/5 |
| M3 | Workshop BRD vật tư V1–V5 |
| M4 | SOP in nhãn + fallback legacy QR |

---

## Phase 6 đề xuất (go-live closure)

| # | Việc |
|---|------|
| 6.1 | Tổng hợp sign-off tất checklist (MDM/GSC/VST/QLCV/CSSD/NKBV) |
| 6.2 | `trial:auth:precheck` = 0; pilot flag strategy production |
| 6.3 | BRD vật tư → migration (nếu intake đóng) |
| 6.4 | In nhãn cycle QR tích hợp `usePrint` (optional polish) |
| 6.5 | HIS/LIS integration spike (research only) |

---

## Blocker go-live tổng

1. Checklist tay tất module pilot ≥5/6
2. `mdm_email_no_auth` = 0
3. Cycle QR C1–C6 ≥5/6 (sau in nhãn SOP)
