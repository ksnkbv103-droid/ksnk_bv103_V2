# A6+ — Backlog implement UI (chat riêng từng hội chứng)

> **Không implement trong chat phân tích A0–A5.**  
> Mỗi dòng = 1 chat `/intake-nv` → `/implement` sau khi PO tick gap P0 liên quan.

## Thứ tự đề xuất

| Chat | Scope | P0 chính | Verify |
|------|-------|----------|--------|
| 0 | **Symptom SSOT** — catalog + bridge 5 hội chứng (xong); Ch.17 form = W5 | Identity | catalog.spec |
| 1 | **PNEU** L2 PNU3 miễn dịch + lab ngưỡng + Ruled-out L3 + badge VAP | PNEU-P0-1…4 | rules + tay 3 case |
| 2 | **BSI** khối MBI đầy + Ruled-out L3 pattern | BSI-P0-1 | rules + tay |
| 3 | **UTI** Ruled-out ASB copy + harden ẩn voiding | UTI polish | tay |
| 4 | **VAE** copy Event Period / stub APRV rõ trên UI | — | tay |
| 5 | **SSI** polish PATOS + phụ lục in | — | tay |
| 6 | **In phụ lục B** (PDF/print) chung 5 loại | ALL-P1-2 | print smoke |

## Nguyên tắc code

1. Chỉ hiện L1 + L2 đang mở (methodology A0).  
2. Field mới → `nkbv-verification.ts` + prepopulate backward-compat.  
3. Không đổi string classification public ngoài P0 đã khóa.  
4. `npm run verify:engineering` nếu đụng actions.  
5. Cập nhật [`gap-lean-vs-runtime.md`](gap-lean-vs-runtime.md) khi đóng P0.

## Files runtime neo

- [`NkbvDiagnosticCaseForm`](../../../src/modules/giam-sat-nkbv/components/) (hoặc modal checklist hiện hành)  
- `sub-forms/*ClinicalSubForm.tsx`  
- `lib/nkbv-rules-engine.ts`  
- `types/nkbv-verification.ts`
