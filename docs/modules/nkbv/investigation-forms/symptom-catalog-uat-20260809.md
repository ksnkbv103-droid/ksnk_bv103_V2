# UAT — Danh mục triệu chứng lâm sàng NKBV (2026-08-09)

> Vận hành: 3 case tay + đối chiếu unit test đã khóa trong repo.

## Case tay (PO / KSNK)

### Case 1 — UTI + Foley
1. Mở BA nghi UTI, tick Foley hiện diện DOE/DOE−1.  
2. Trên lưới / phiếu: **không** nhập tiểu buốt/gấp/rắt (ẩn hoặc không tính).  
3. Tick sốt + ngày ∈ IWP → đủ triệu chứng; chốt CAUTI khi đủ CFU/Foley.  
**Pass khi:** voiding không góp tiêu chuẩn khi đang Foley.

### Case 2 — BSI commensal
1. Cấy máu CoNS / commensal, ≥2 lần lấy riêng.  
2. Tick sốt **hoặc** rét run + ngày ∈ IWP → LCBI2 / CLABSI (nếu CVC đủ).  
3. Bỏ ngày triệu chứng → cổng submit từ chối.  
4. (MBI) Candida đường ruột + tick tiêu chảy nặng → **MBI_LCBI**, không CLABSI.  
**Pass khi:** ngày IWP bắt buộc; MBI nhận tiêu chảy nặng.

### Case 3 — PNEU người lớn
1. XQ (+) + tick **sốt** (atom) + ≥2 dòng hô hấp khác nhau → PNU1.  
2. Chỉ 1 dòng hô hấp → không đạt.  
3. Chọn PNU3 vi sinh **không** tick ho ra máu / đau màng phổi → **INCOMPLETE**.  
4. Thêm ho ra máu → PNU3_*.  
**Pass khi:** atom toàn thân thay gói; PNU3 siết triệu chứng bổ sung.

### Case 4 (bổ sung) — SSI Organ/Space IAB
1. Depth Organ/Space, site **IAB**, thủ thuật phù hợp.  
2. Tick ≥2 triệu chứng Ch.17 (sốt + đau bụng) → đạt (hoặc mủ dẫn lưu organ).  
**Pass khi:** checklist Ch.17 hiện và engine nhận.

## Unit test đã khóa (agent chạy giúp PO)

```bash
npx vitest run \
  src/modules/giam-sat-nkbv/lib/nkbv-clinical-symptom-catalog.spec.ts \
  src/modules/giam-sat-nkbv/lib/nkbv-chapter17-clinical.spec.ts \
  src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.spec.ts \
  src/modules/giam-sat-nkbv/lib/nkbv-clinical-submit-gate.spec.ts
```

## Sign-off PO

- [ ] Case 1–3 tay PASS trên môi trường pilot  
- [ ] Case 4 (IAB) PASS nếu dùng Organ/Space  
- [ ] Không còn lệch nhãn sốt giữa phiếu / BA / in  
