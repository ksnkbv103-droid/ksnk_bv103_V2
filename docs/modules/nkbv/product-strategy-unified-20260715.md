# Quyết định sản phẩm NKBV — một module thống nhất (2026-07-15)

> **Trạng thái:** **Đã PO xác nhận** (2026-07-15)  
> **SSOT đầy đủ:** [`adr-nkbv-unified-module-20260715.md`](../../reference/architecture/adr-nkbv-unified-module-20260715.md)

## Chốt ngắn

**Giữ một module NKBV** (`/giam-sat-nkbv`). Tách UX theo vai trò / loại hội chứng. **Không** tách 4 app (NKH / tiết niệu / viêm phổi / vết mổ). **Không** gộp VST hoặc GSC vào NKBV.

Chi tiết lý do, bảng tách 3 tầng, và ưu tiên UX: xem ADR ở trên.

**Tiến độ UX (2026-07-15):** VAE / VAP / HAP tách riêng trên phán quyết mẫu + engine; lọc hàng đợi loại/trạng thái/khoa. UAT còn ký tay khoa. Mẫu số denominator = slice riêng.
