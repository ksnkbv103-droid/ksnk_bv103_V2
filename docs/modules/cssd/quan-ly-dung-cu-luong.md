# Luồng quản lý dụng cụ CSSD (MDM → vận hành)

> SSOT bảng: `cssd_dm_loai_dung_cu` · `cssd_dm_bo_dung_cu` · `cssd_dm_bo_dung_cu_chi_tiet`  
> Domain vận hành đầy đủ (6 trạm, mẻ, luật): [`domain-overview.md`](domain-overview.md).

## Thứ tự chuẩn

| Bước | Danh mục | Quyền | Mã |
|------|----------|-------|-----|
| 1 | **Loại dụng cụ** | LOAI_DC | `ma_loai_dung_cu` |
| 2 | **Bộ dụng cụ** | BO_DC | `ma_bo` = `KHOA.SET.NN` (tem QR) |
| 3 | **Thành phần bộ** | DC_LE | `ma_chi_tiet` (DC-*) |
| 4 | In tem / workflow | CSSD_* | Quét `ma_bo` |
| 5 | Kho / sự cố | `/cssd-su-co` (nhóm Dụng cụ) | **3 cửa:** **Đổi danh mục** (mã / tên / số lượng chuẩn → chờ ADMIN duyệt, không ghi sổ kho) · **Hỏng/Mất** (sự cố, ghi sổ ngay) · **Chuyển** (`InstrumentMoveDualTable`: kho↔bộ / bộ↔bộ). Rà soát **không** lấy kho / trả kho / điều chuyển. |
| 6 | Xem danh mục | `/cssd-dung-cu` | Read-only: tab **Bộ / Loại / Lịch sử**; thành phần dưới bộ đã chọn; rà soát khi lệch (trên thanh bảng). Xuất phiếu kiểm kê trên thanh tìm — không bảng đợt trùng danh sách bộ. |

## Vào app

- **Quản trị:** Hệ thống → Danh mục → 3 thẻ Loại / Bộ / Thành phần  
  Hoặc `/quan-tri-he-thong/danh-muc/dung-cu?tab=bo`
- **Vận hành (xem + in tem):** `/cssd-dung-cu` — không CRUD master

## Quy tắc liên kết

- Mỗi dòng chi tiết **bắt buộc** có `loai_dung_cu_id`.
- Khi gắn vào bộ: `bo_dung_cu_id` phải trỏ bộ có `ma_bo` chuẩn A′.
- Nếu bộ có loại header (`bo.loai_dung_cu_id`), loại chi tiết phải **khớp** header.

## Phân biệt mã (tránh nhầm)

| Mã | Ý nghĩa | Dùng quét workflow? |
|----|---------|---------------------|
| `B01.SET.01` | Bộ (tem vĩnh viễn) | Có |
| `BV103-CYC-…` | Tem chu trình (Cycle QR) | Có |
| `LOT-…` | Phiếu mẻ tiệt khuẩn | Có (màn mẻ) |
| `TB-…` / `MAY-…` | Máy | Có (mẻ / bảo trì) |
| `DC-0001` | Chi tiết trong bộ | Không |
| `DM-xxxx` | Danh mục generic khác | Không |

## Quét QR vận hành (SSOT)

Mọi màn quét vận hành CSSD (chu trình, mẻ TK, truy vết, catalog RO, kho, bảo trì máy, sự cố, liên kết SSI) nhận diện mã qua **QR Hub** (`resolveCssdCodeWithClient`). Camera/ô nhập dùng chung `QrScanInput` / `QrCamera*`. Quản trị danh mục (CRUD) chỉ in/sửa mã — không thêm quét.
