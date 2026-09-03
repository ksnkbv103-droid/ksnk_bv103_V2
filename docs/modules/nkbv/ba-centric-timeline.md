# Bệnh án trung tâm — 3 khối (CDC order)

> SSOT vận hành. Chi tiết hàng lưới: [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md).  
> Vai trò BA/phiếu: [`ba-phieu-form-roles.md`](ba-phieu-form-roles.md).  
> Quy trình ca + dữ liệu: [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md).

## 1. Nguyên tắc

1. **Bệnh án** = trung tâm bằng chứng (lưới ngày: khoa, Foley/máy/CVC, triệu chứng, CĐHA).
2. **Cổng vi sinh** chỉ nạp thô — không chốt HAI, không spawn phiếu Day-3.
3. Làm việc theo **3 khối**: bảng chung → bảng phân tích → **mới** tạo phiếu.
4. Chọn **từng bệnh phẩm** (chip XN), không chọn cả ô ngày.
5. XN (+) chưa đóng vòng → hàng đợi / badge `Chưa PT`.

## 2. UI trên 1 BA

| Khối | Nội dung |
|------|----------|
| **Bảng chung** | 6 hàng: ngày lịch · HD · VS (đa chip) · CĐHA · TC DOE SSI · khoa |
| **Bảng phân tích** | Mở khi chọn Index: ngày X · CĐHA (IWP) · TC LS (DOE) · RIT · SBAP · can thiệp |
| **Kết luận** | 2 hàng + nút Tạo phiếu / Bỏ qua |
| **Danh sách phiếu** | Kho phụ sau khi đã tạo phiếu |

## 3. Trình tự CDC

Chi tiết: [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md) §4–§5.

| Bước | Việc |
|------|------|
| 0 | Tạo/mở BA + copy LIS + trên lưới: CĐHA, TC SSI, **chọn khoa theo mã**, **tích** Foley/máy/CVC |
| 1 | Chọn 1 bệnh phẩm / CĐHA / TC SSI |
| 2 | Đặt cửa sổ đúng protocol (IWP / SP SSI / Event Period VAE) |
| 3 | Máu: Secondary **trước** LCBI/CLABSI. Hô hấp + máy: VAE không mặc định VAP |
| 4 | DOE → POA/HAI → LOA → dụng cụ → RIT/SBAP |
| 5 | Kết luận nháp → Tạo phiếu hoặc Bỏ qua |

## 4. Nguồn dữ liệu

**Không API HIS/LIS.** Chi tiết: [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md) §2.

| Nguồn | Cách | Bảng |
|-------|------|------|
| LIS | Copy bảng / Excel | `nkbv_fact_vi_sinh` |
| BA / ADT | Copy file hoặc gõ | `nkbv_fact_benh_an` |
| CĐHA / TC SSI / khoa ngày | Lưới (khoa = danh sách mã) | `nkbv_fact_ba_timeline` |
| CVC / Foley / vent | **Tích từng ngày trên lưới** (không sổ đặt–rút tay) | Bệnh án; sổ dụng cụ nếu còn thì **suy từ ô tích** |
| Sự kiện đã tạo phiếu | Nút Tạo phiếu | `nkbv_fact_su_kien` |

## 5. Luồng chuẩn

```
Tạo BA (LIS nếu chưa có mã / copy HIS / gõ) → trên lưới: chọn khoa + tích Foley/máy/CVC + CĐHA/TC
  → chọn 1 bệnh phẩm → bảng phân tích (Secondary trước CLABSI) → kết luận
  → Tạo phiếu hoặc Bỏ qua (phiếu đọc khoa/dụng cụ từ lưới; sửa lưới thì phiếu theo)
```
