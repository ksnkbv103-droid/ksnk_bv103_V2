# Luồng quản lý dụng cụ CSSD (MDM → vận hành)

> SSOT bảng: `cssd_dm_loai_dung_cu` · `cssd_dm_bo_dung_cu` · `cssd_dm_bo_dung_cu_chi_tiet`

## Thứ tự chuẩn

| Bước | Danh mục | Quyền | Mã |
|------|----------|-------|-----|
| 1 | **Loại dụng cụ** | LOAI_DC | `ma_loai_dung_cu` |
| 2 | **Bộ dụng cụ** | BO_DC | `ma_bo` = `KHOA.SET.NN` (tem QR) |
| 3 | **Thành phần bộ** | DC_LE | `ma_chi_tiet` (DC-*) |
| 4 | In tem / workflow | CSSD_* | Quét `ma_bo` |
| 5 | Kho / sự cố | `/cssd-su-co` (nhóm Dụng cụ) | Hỏng/Mất/Bổ sung/Điều chuyển → sổ `cssd_fact_kho_giao_dich` |
| 6 | Xem danh mục | `/cssd-dung-cu` | Read-only + lịch sử; không báo sự cố tại đây |

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
| `B01.SET.01` | Bộ (tem) | Có |
| `DC-0001` | Chi tiết trong bộ | Không |
| `DM-xxxx` | Danh mục generic khác | Không |
