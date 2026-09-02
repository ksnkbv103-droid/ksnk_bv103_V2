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
| 5 | Kho / sự cố | `/cssd-su-co` (nhóm Dụng cụ) | Hỏng/Mất; Lấy/trả kho; Điều chuyển bộ→bộ → sổ `cssd_fact_kho_giao_dich` |
| 6 | Xem danh mục | `/cssd-dung-cu` | Read-only + lịch sử; không báo sự cố tại đây |

## Vào app

- **Quản trị:** Hệ thống → Danh mục → 3 thẻ Loại / Bộ / Thành phần  
  Hoặc `/quan-tri-he-thong/danh-muc/dung-cu?tab=bo`
- **Vận hành (xem + in tem):** `/cssd-dung-cu` — không CRUD master

## Quy tắc liên kết

- Mỗi dòng chi tiết **bắt buộc** có `loai_dung_cu_id`.
- Khi gắn vào bộ: `bo_dung_cu_id` phải trỏ bộ có `ma_bo` chuẩn A′.
- Nếu bộ có loại header (`bo.loai_dung_cu_id`), loại chi tiết phải **khớp** header.

## Ba sổ số lượng (không ghi đè lên nhau)

| Sổ | Ý nghĩa | Ai được đổi | Ghi sổ khi nào |
|----|---------|-------------|----------------|
| **Chuẩn** | Định mức bộ (bộ này *phải có* bao nhiêu cái loại X) | Chỉ Quản trị (BO_DC / DC_LE) | Sửa thành phần bộ — thẻ Thành phần / Bộ |
| **Hệ thống** | Số đang gắn bộ (thực tế trên bộ) | Vận hành | Lấy kho / trả kho / bộ→bộ / hỏng / mất |
| **Kho lẻ** | Dự phòng chưa gắn bộ (`so_luong_kho_du_phong`) | Vận hành | Cùng phiếu chuyển kho↔bộ |

**Đếm** trên rà soát không phải sổ thứ 4: chỉ để xác nhận hỏng/mất khi đếm < hệ thống.

## Hai cửa vận hành (không trùng việc)

Trên `/cssd-su-co` nhóm Dụng cụ và lối tắt trạm Đóng gói:

1. **Rà soát:** đếm, Hỏng/Mất, thấy lệch chuẩn (`Thiếu n` / `Thừa n` / `Khớp chuẩn`). Loại chưa có trên định mức → Quản trị, không lấy kho. Sai mã dòng bộ / đổi mã loại toàn viện → Quản trị (thẻ Thành phần / Loại) — cửa này không đổi danh mục gốc.
2. **Chuyển chỗ:** Lấy từ kho cho đủ chuẩn / Trả phần thừa về kho / Điều chuyển bộ → bộ. Lấy/trả chỉ trên loại đã có dòng bộ. Số lấy = `min(chuẩn − hệ thống, tồn kho)`. Số trả = `min(hệ thống − chuẩn, số đang gắn bộ)`.

Không có nút «Thêm dòng chờ duyệt» trên cửa vận hành. Hỏng/mất và chuyển chỗ là hai phiếu riêng.

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
