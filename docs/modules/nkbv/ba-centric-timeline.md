# Bệnh án trung tâm — 3 khối (CDC order)

> SSOT vận hành. Chi tiết hàng lưới: [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md).  
> Vai trò BA/phiếu: [`ba-phieu-form-roles.md`](ba-phieu-form-roles.md).

## 1. Nguyên tắc

1. **Bệnh án** = trung tâm bằng chứng (timeline + devices).
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

| Bước | Việc |
|------|------|
| 0 | BA + nạp VS/CĐHA/TC |
| 1 | Chọn 1 bệnh phẩm / CĐHA / TC SSI |
| 2 | IWP/SP → triệu chứng → DOE |
| 3 | RIT / SBAP / can thiệp |
| 4 | Kết luận nháp |
| 5 | Tạo phiếu (hoặc Bỏ qua) |
| 6 | Thẩm định / in |

## 4. Nguồn dữ liệu

| Nguồn | Bảng |
|-------|------|
| LIS | `nkbv_fact_vi_sinh` |
| CĐHA / TC SSI | `nkbv_fact_ba_timeline` |
| ADT | `nkbv_fact_benh_an` |
| Device | `nkbv_fact_device_registry` |
| Sự kiện đã tạo phiếu | `nkbv_fact_su_kien` (`verification_data.index_vi_sinh_id`) |

## 5. Luồng chuẩn

```
ADT / Device → nạp LIS + CĐHA/TC trên bảng chung
  → chọn 1 bệnh phẩm → bảng phân tích → kết luận
  → Tạo phiếu (index_vi_sinh_id) hoặc Bỏ qua
```
