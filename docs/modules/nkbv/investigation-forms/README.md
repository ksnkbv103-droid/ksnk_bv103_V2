# Investigation forms — Phiếu NKBV tinh gọn / đủ CDC

> Phân tích A0–A4 (2026-08-05). **Chưa thay** Domain SSOT. UI ship theo [`a6-ui-implementation-backlog.md`](a6-ui-implementation-backlog.md) sau PO duyệt gap.

## Đọc theo thứ tự

| # | File | Nội dung |
|---|------|----------|
| 0 | [`00-lean-cdc-methodology.md`](00-lean-cdc-methodology.md) | L1/L2/L3, rubric, bề mặt A/B |
| 1 | [`01-shared-spine.md`](01-shared-spine.md) | Hàng 0–9 Shared vs Delta; VAE≠PNEU |
| 2 | [`02-clinical-symptom-catalog.md`](02-clinical-symptom-catalog.md) | SSOT triệu chứng lâm sàng + ánh xạ form/criteria |
| 2b | [`symptom-catalog-uat-20260809.md`](symptom-catalog-uat-20260809.md) | UAT tay 3–4 case + lệnh verify unit |
| 3 | [`trees/`](trees/) | Cây + bảng phân lớp từng hội chứng |
| 4 | `*-2026.md` | Phần A vận hành + Phần B phụ lục |
| 5 | [`gap-lean-vs-runtime.md`](gap-lean-vs-runtime.md) | P0 / P1 — **PO duyệt tại đây** |
| 6 | [`a6-ui-implementation-backlog.md`](a6-ui-implementation-backlog.md) | Thứ tự chat implement |

## Năm mã phiếu

| Mã | Hội chứng | Cây | Spec |
|----|-----------|-----|------|
| PNEU-2026 | PNEU / VAP / Non-VAP | [trees/PNEU.md](trees/PNEU.md) | [PNEU-2026.md](PNEU-2026.md) |
| BSI-2026 | CLABSI / LCBI / MBI | [trees/BSI.md](trees/BSI.md) | [BSI-2026.md](BSI-2026.md) |
| UTI-2026 | CAUTI / SUTI / ABUTI | [trees/UTI.md](trees/UTI.md) | [UTI-2026.md](UTI-2026.md) |
| VAE-2026 | VAC→IVAC→PVAP | [trees/VAE.md](trees/VAE.md) | [VAE-2026.md](VAE-2026.md) |
| SSI-2026 | SSI depths | [trees/SSI.md](trees/SSI.md) | [SSI-2026.md](SSI-2026.md) |

**Out (W4–W6 tạm dừng):** PedVAE, ENDO, IAB, AU, Location/SIR đầy đủ.  
**W3 đã mở slice:** LabID Event (engine + `nkbv_fact_labid_event`) · CLIP trên Device Registry.

## PO sign-off

> Engineering: runtime 5 hội chứng + BA 3 khối + Lean L1 đã wire (2026-08-09).  
> Chữ ký dưới đây = **PO / khoa KSNK** — không tự tick hộ.

- [ ] Methodology L1/L2/L3 chấp nhận  
- [ ] Spine Shared / VAE≠PNEU chấp nhận  
- [ ] Bảng phân lớp 5 trees chấp nhận  
- [ ] Gap P0 ưu tiên chấp nhận → mở A6 theo backlog  
- [ ] UAT BA-centric (pilot checklist #1 + BA-1…BA-4) PASS → mở route `/giam-sat-nkbv` khỏi pilot block  

Hợp đồng UI: [`../clinical-forms.md`](../clinical-forms.md) v3.2+.  
UAT tay: [`../pilot-clinical-checklist-20260603.md`](../pilot-clinical-checklist-20260603.md).
