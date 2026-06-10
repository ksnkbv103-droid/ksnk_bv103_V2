# Pilot CSSD — Cycle QR (Phase 5.1)

> Tiền đề: migration `20260610100000_cssd_cycle_qr_additive.sql` apply; P3 BOM ≥5/6 PASS.

**Verify auto:**

```bash
npm run verify:cssd
npx vitest run src/modules/cssd-erp/shared/application/cssd-workflow-resolve.spec.ts
npx vitest run src/modules/cssd-erp/shared/domain/cssd-qr-core.spec.ts
```

| # | Kịch bản | Pass khi |
|---|----------|----------|
| C1 | Quét **QR bộ vĩnh viễn** tại TIEP_NHAN / LAM_SACH | Resolve quy trình active |
| C2 | Hoàn tất BOM Đóng gói | `ma_cycle_qr` sinh dạng `BV103-CYC-*`; lifecycle `KIEM_DEM_BOM` |
| C3 | Quét **cycle QR** tại mẻ TK / CAP_PHAT | Resolve cùng quy trình (không cần mã legacy) |
| C4 | Song song mã legacy `ma_qr_quy_trinh` | Vẫn quét được (backfill 1 tuần) |
| C5 | Chu trình mới sau CAP_PHAT → TIEP_NHAN | Chu kỳ mới: `ma_cycle_qr` null; giữ `ma_qr_bo_vinh_vien` |
| C6 | NKBV SSI nhập cycle QR | Link truy vết CSSD mở đúng timeline |

**Pass:** ≥5/6 ☐ · Tester ___ · Ngày ___

**Ops:** SOP in nhãn niêm phong + fallback mã legacy khi máy in lỗi — [`reform-plan.md`](./reform-plan.md) P3 tiền điều kiện.
