# CSSD Dụng cụ — ba cửa (chốt 2026-09-18 B)

| Cửa | Path | Việc | Không làm |
|-----|------|------|-----------|
| **Kho dự phòng** | `/cssd-dung-cu?tab=LOAI` | Xem loại + tồn ngoài bộ / trong bộ | Ghi master trực tiếp |
| **Luân chuyển** | `/cssd-dung-cu?tab=LUAN_CHUYEN` | Kho↔bộ, trả kho, bộ↔bộ — **lấy từ danh mục đang có** | Báo hỏng/mất; invent loại mới |
| **Đề nghị danh mục** | `/cssd-dung-cu?tab=DE_NGHI` | **Thêm mới** loại/bộ; **sửa thuộc tính** loại/bộ; BOM gắn loại đã có | Điều chuyển số lượng (dùng Luân chuyển) |
| **Hỏng/Mất** | `/cssd-su-co` nhóm dụng cụ | Chỉ sự cố hỏng hoặc mất | Luân chuyển; đổi master |

Ledger MOVE/TRANSFER/REPLENISH vẫn ghi qua submit bridge; UI không còn cửa Chuyển trên `/cssd-su-co`.

## P0A 2026-09-21

Hỏng/Mất trên `/cssd-su-co` = form physical-only (HONG/MAT). SET_RECONCILE catalog sunset → Đề nghị danh mục. Migrate ledger `KIEM_KE` applied.
