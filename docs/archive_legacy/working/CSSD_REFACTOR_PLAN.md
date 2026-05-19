# Kế hoạch tái cấu trúc Module CSSD — Vô khuẩn (BV103)

## 1. Phân tích hiện trạng & Điều chỉnh
Trước đây có phương án phân tách từng trạm vô khuẩn thành các module riêng rẽ trên Sidebar. Tuy nhiên, để tối ưu tính liền mạch của nghiệp vụ và dễ dàng quản lý theo các nhóm đối tượng cốt lõi, hệ thống sẽ được phân rã thành **5 module chính** trên cấp độ hệ thống, bao quát toàn bộ hoạt động CSSD.

## 2. Cấu trúc 5 Module CSSD

1. **Quy trình xử lý dụng cụ** (`/cssd-quy-trinh`)
   - Bao trọn mô hình 6 trạm theo luồng một chiều: *Tiếp nhận -> Làm sạch -> Kiểm tra & Bảo dưỡng -> Đóng gói -> Tiệt khuẩn (tạo mẻ) -> Cấp phát*.
   - Hỗ trợ quét mã QR xuyên suốt.
   - Có danh sách dụng cụ chờ xử lý tại từng trạm.
   
2. **Quy trình báo cáo sự cố** (`/cssd-su-co`)
   - Tách thành module báo cáo độc lập.
   - Các loại sự cố được phân rạch ròi:
     - Quy trình xử lý
     - Hỏng, mất, bổ sung, điều chuyển dụng cụ
     - Máy móc
     - Chất lượng tiệt khuẩn
     - Hóa chất KSNK

3. **Quản lý dụng cụ phẫu thuật** (`/cssd-dung-cu`)
   - Quản lý danh mục loại dụng cụ.
   - Quản lý dụng cụ lẻ.
   - Quản lý bộ dụng cụ, chi tiết bộ dụng cụ.
   - Điều chuyển dụng cụ giữa các bộ.

4. **Quản lý máy móc KSNK** (`/cssd-thiet-bi`)
   - Quản lý thông tin máy móc KSNK.
   - Theo dõi lịch sử bảo hành, bảo dưỡng, sửa chữa thiết bị.

5. **Quản lý hóa chất, vật tư KSNK** (`/cssd-hoa-chat`)
   - Quản lý nhập, xuất, tồn kho hóa chất/vật tư.
   - Cảnh báo hạn sử dụng.
   - Cảnh báo số lượng tồn kho (sắp hết).

## 3. Lộ trình triển khai (Lean Execution)

### Bước 1: Điều chỉnh Sidebar & Route
- Xóa các route phân nhỏ trạm (cssd-tiep-nhan, cssd-dong-goi, cssd-cap-phat).
- Thiết lập 5 route gốc:
  - `/cssd-quy-trinh` (Chứa luồng 6 trạm và mẻ tiệt khuẩn).
  - `/cssd-su-co` (Form báo cáo sự cố nâng cao).
  - `/cssd-dung-cu` (Danh mục và quản lý cấu trúc bộ).
  - `/cssd-thiet-bi` (Bảo trì máy móc).
  - `/cssd-hoa-chat` (Tồn kho hóa chất).

### Bước 2: Gom luồng "Quy trình xử lý dụng cụ"
- Tái sử dụng `StationWorkflowView` kết hợp một giao diện chọn/chuyển trạm liền mạch hoặc thiết kế một màn hình tổng hợp quy trình, trong đó mẻ tiệt khuẩn được tích hợp vào bước 5.

### Bước 3: Cập nhật Cấu trúc Module
- Chỉnh sửa `Sidebar.tsx` để hiển thị 5 mục trên.
- Đồng bộ các Gate phân quyền (`NAV_GATE_CSSD_QUY_TRINH`, `NAV_GATE_CSSD_SU_CO`, v.v.) trong `ksnk-nav-gates.ts`.

