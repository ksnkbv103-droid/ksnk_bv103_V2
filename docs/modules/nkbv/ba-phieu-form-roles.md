# Vai trò BA / Phiếu / Form mẫu (NKBV)

Workspace 3 khối: [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md).  
Domain: [`hai-surveillance-domain-ssot-20260827.md`](hai-surveillance-domain-ssot-20260827.md) (Phụ lục E). Quy trình ca: [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md).

## 1. Hồ sơ bệnh án = đợt nằm viện — trung tâm bằng chứng

| | |
|--|--|
| **Là gì** | Một lần nhập viện (`ma_benh_an` ≈ AdmissionID) |
| **Bảng** | `nkbv_fact_benh_an` + `nkbv_fact_vi_sinh` + `nkbv_fact_ba_timeline` + `nkbv_fact_ba_ngay_khoa` + `nkbv_fact_ba_ngay_dung_cu` |
| **UI** | Hub BA = lưới ngày (Date, HD, XN, CĐHA, TC SSI, Khoa chọn theo mã, CVC/Vent/Foley) |
| **Không phải** | Một nhiễm khuẩn; không tick LCBI/CAUTI trên form ADT; **không** nhập lại khoa/dụng cụ trên phiếu nếu đã có trên lưới |

## 2. Kho vi sinh = dữ liệu thô (không điều tra)

| | |
|--|--|
| **Bảng** | `nkbv_fact_vi_sinh` |
| **UI** | Tab vi sinh (nạp) · hàng VS trên bảng chung (chip + badge chưa/đã PT) |
| **Không** | Tự spawn phiếu HAI khi import |

## 3. Phiên phân tích (bảng phân tích) — chưa phải phiếu

| | |
|--|--|
| **Là gì** | View IWP/DOE/RIT/SBAP + kết luận nháp sau khi chọn 1 bệnh phẩm / CĐHA / TC SSI |
| **Lưu** | State UI (không tạo `nkbv_fact_su_kien`) |
| **Xong** | Nút **Tạo phiếu** hoặc **Bỏ qua** |

## 4. Phiếu sự kiện = HAI đã đóng vòng phân tích

| | |
|--|--|
| **Bảng** | `nkbv_fact_su_kien` + `verification_data` (gồm `index_vi_sinh_id`, disposition) |
| **Khi tạo** | **Sau** kết luận trên bảng phân tích — không lúc chọn Index |
| **UI** | Form mẫu sẵn có · danh sách phiếu = kho tra cứu |

## 5. Form mẫu

Form tiêu chuẩn (BSI/UTI/VAE/PNEU/SSI) mở khi IP bấm **Tạo phiếu** — khoa và Foley/máy/CVC **lấy từ lưới bệnh án**. Không nhập lại trên form. Sửa trên lưới → phiếu theo.

## 6. In phiếu / báo cáo gửi khoa

Hai bản in hiện có: `NkbvCasePrintView` (mục) · `NkbvBaGridCasePrintView` (văn bản).  
Mẫu gửi khoa (dải ngày + lời tiếng Việt): [`hai-timeline-and-diagnostic-report-20260827.md`](hai-timeline-and-diagnostic-report-20260827.md) §3–§5.

## Luồng chuẩn

```
Tạo BA (LIS nếu chưa có mã / copy HIS / gõ) → trên lưới: khoa theo mã + tích Foley/máy/CVC + CĐHA/TC SSI
  → chọn 1 bệnh phẩm (hoặc CĐHA / TC SSI)
  → bảng phân tích → kết luận
  → Tạo phiếu (hoặc Bỏ qua) — phiếu đọc khoa/dụng cụ từ bệnh án; sửa lưới thì phiếu theo
  → thẩm định / in
```

## Nhãn UI

- **Hồ sơ đợt nằm viện** = BA / bảng chung  
- **Cổng vi sinh** = nạp thô  
- **Bảng phân tích** = phiên theo Index  
- **Phiếu xác định ca NKBV** = chỉ sau nút Tạo phiếu  
