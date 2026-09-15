# NKBV — UAT chữ ký khoa (D-14) — checklist ngắn

> Mục tiêu: **đóng sign-off khoa KSNK** trên form lâm sàng pilot.  
> **Không** đổi thuật toán phân loại / tử số. Engine đã sẵn; còn việc tay.  
> SSOT đầy đủ: [`pilot-clinical-checklist-20260603.md`](./pilot-clinical-checklist-20260603.md) · debt `D-14`.

## Ai ký

| Vai trò | Việc |
|---------|------|
| KSNK pilot lead | Chạy ≥ 5 kịch bản tay dưới → điền bảng Sign-off |
| IT / dev | Hỗ trợ env localhost; **không** ký hộ khoa |

## Trước khi UAT

1. Pull `main` mới nhất (đã có lazy workspace Hub BA).  
2. Đăng nhập account KSNK có quyền NKBV edit.  
3. Mở `/giam-sat-nkbv` → tab bệnh án / danh sách phiếu.

## 5 kịch bản tối thiểu (ký được là đủ D-14)

| # | Làm gì | Thấy gì thì PASS |
|---|--------|------------------|
| 1 | Import LIS → Hub BA → chọn XN (+) → phân tích → **Tạo phiếu** | Không spawn phiếu lúc import; badge «Chưa PT»; phiếu chỉ sau nút Tạo phiếu |
| 2 | Mở phiếu vừa tạo → điền form lâm sàng → gửi duyệt | Trạng thái → `CHO_DUYET` |
| 3 | Panel thẩm định: Phê duyệt **hoặc** Loại trừ (+ lý do) | `XAC_NHAN` hoặc `LOAI_TRU` |
| 4 | Ca SSI có QR chu kỳ CSSD | Hiện link truy vết CSSD |
| 5 | Lọc hàng đợi: 1 loại + 1 trạng thái | Bảng chỉ còn phiếu khớp |

*(Chi tiết BA lưới / W1–W2 / F-1…F-5: xem checklist pilot đầy đủ.)*

## Sign-off

| Vai trò | Họ tên | Ngày | Chữ ký / xác nhận |
|---------|--------|------|-------------------|
| KSNK pilot lead | | | |
| IT / dev (witness) | | | |

**Sau khi ký:** cập nhật `debt-register.md` mục D-14 → Done; không cần PR code cho bước ký.

## Ghi chú kỹ thuật (cho agent / IT)

- Surface workspace đã tách chrome (toolbar / chip phiên / bind lưới) — UAT vẫn cùng hành vi BA.  
- Không mở PR «ký hộ»; không migration; không đụng `nkbv-rules-engine`.
