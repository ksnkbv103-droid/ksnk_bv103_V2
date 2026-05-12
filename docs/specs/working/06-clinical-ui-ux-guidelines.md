---
title: "06 — Hướng dẫn UI/UX lâm sàng"
source: ksnk-spec-split (legacy monolith copied to 00-legacy-full-spec-monolith.md)
see_also: [../README.md](../README.md), [10-bv103-implementation-mapping.md](../10-bv103-implementation-mapping.md)
---

> **Neo triển khai BV103:** [`AGENTS.md`](../../../AGENTS.md) V7.0 + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) + [`../README.md`](../README.md) (*Ý đồ phát triển*); tên bảng/cột thật: [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md).

# **HƯỚNG DẪN THIẾT KẾ TRẢI NGHIỆM VÀ GIAO DIỆN NGƯỜI DÙNG (CLINICAL UI/UX GUIDELINES)**

## **HỆ THỐNG QUẢN TRỊ KIỂM SOÁT NHIỄM KHUẨN (KSNK)**

Tài liệu này cung cấp các nguyên tắc và đặc tả thiết kế màn hình (Wireframe/Mockup) cho đội ngũ UI/UX Designer. Mục tiêu tối thượng: **An toàn người bệnh, Thao tác siêu tốc và Công thái học y tế.**

## **1\. CÁC NGUYÊN TẮC THIẾT KẾ CHUNG (GLOBAL DESIGN PRINCIPLES)**

* **Thiết kế cho người đeo găng tay (Gloved-hand UI):** Tại khu vực CSSD, Kho rác hay khi đi buồng, nhân viên y tế luôn đeo găng tay cao su (thậm chí 2 lớp). Các vùng chạm (Touch Targets) như Nút bấm, Checkbox phải có kích thước **tối thiểu 48x48 dp** (chuẩn Material Design), ưu tiên kích thước **60x60 dp** cho các nút hành động chính (Lưu, Xác nhận, Báo lỗi).  
* **Quét mã thay vì Gõ phím (Scan over Type):** Hạn chế tối đa việc sử dụng bàn phím ảo. Mọi luồng nhập liệu tại kho, nhà giặt, CSSD phải ưu tiên dùng Máy quét mã vạch (Barcode Scanner) hoặc Camera điện thoại làm đầu vào chính.  
* **Tương phản & Mù màu (Accessibility):** Các cảnh báo lỗi (Red Flags), nhiễm khuẩn lây nhiễm phải dùng màu Đỏ cờ/Vàng nổi bật kết hợp với **Biểu tượng (Icon)** (VD: Hình tam giác có dấu chấm than) để đảm bảo người bị mù màu (Colorblind) vẫn nhận diện được rủi ro.  
* **Luật ngón tay cái (Thumb-zone Design):** Trên thiết bị di động, các nút thao tác thường xuyên nhất phải nằm ở nửa dưới màn hình để dễ dàng chạm bằng một ngón tay cái khi đang cầm máy bằng một tay.

## **2\. THIẾT KẾ WEB APP (MÀN HÌNH LỚN / PC)**

*Dành cho Ban Giám đốc, Trưởng Khoa, Lãnh đạo CSSD và Admin Hệ thống.*

### **2.1. Giao diện Bảng điều khiển (Analytics Hub)**

* **Triết lý:** "Dashboards as a Story" (Kể câu chuyện qua dữ liệu). Không nhồi nhét mọi thứ vào một màn hình duy nhất.  
* **Cấu trúc màn hình (Layout):**  
  * **Top Bar (Trên cùng):** Bộ lọc toàn cục (Global Filter). Chỉ cần chọn "Khối Ngoại" và "Tháng 5", toàn bộ màn hình sẽ cập nhật.  
  * **Navigation (Tab ngang):** Sử dụng các thẻ (Thematic Tabs) để chuyển đổi giữa các chuyên đề: `[Tổng quan] | [Vệ sinh tay] | [NKBV] | [CSSD] | [Rác thải & Đồ vải]`.  
  * **Hero Metrics (Dòng đầu tiên của Body):** Hiển thị 3-4 chỉ số KPI dạng số cực lớn (VD: Tỷ lệ tuân thủ VST: 85% $\\rightarrow$ Màu Xanh; Mật độ VAP: 15/1000 $\\rightarrow$ Màu Đỏ).  
  * **Charts (Phần dưới):** Biểu đồ xu hướng (Line chart) và Phân bổ (Pie chart).

### **2.2. Giao diện Trạm làm việc CSSD (CSSD Workstation)**

* *Ngữ cảnh:* Màn hình cảm ứng công nghiệp đặt tại các khu Rửa, Đóng gói, Hấp. Máy tính thường dính hơi nước.  
* **Thiết kế màn hình Đóng gói & KCS:**  
  * Chia đôi màn hình (Split-screen).  
  * Trái: Hiển thị danh sách các `Chi tiết dụng cụ` cần kiểm đếm của Bộ mổ đó (Chữ siêu to). Hỗ trợ chạm để đánh dấu "Có/Thiếu".  
  * Phải: 2 nút cực lớn **\[ĐẠT & ĐÓNG GÓI\]** (Màu Xanh) và **\[BÁO LỖI / TRẢ VỀ\]** (Màu Đỏ, kèm icon thùng rác/quay lại).

### **2.3. Giao diện Quản trị Danh mục (MDM Admin)**

* Sử dụng hệ thống Lưới dữ liệu (Data Grid) mạnh mẽ.  
* Hỗ trợ phân trang (Pagination), lọc đa trường trên từng cột.  
* **UI cho Bộ dụng cụ:** Bắt buộc thiết kế theo dạng Cây (Tree-view) hoặc Master-Detail để Admin dễ dàng kéo thả `Chi tiết dụng cụ` vào `Bộ dụng cụ` cha.

## **3\. THIẾT KẾ MOBILE APP / TABLET (TÍNH DI ĐỘNG & THỰC ĐỊA)**

*Dành cho Chuyên trách KSNK đi buồng, Mạng lưới KSNK, Hộ lý, Nhân viên vệ sinh.*

### **3.1. Màn hình Giám sát Vệ sinh tay (Đa đối tượng)**

* *Thách thức UX:* Người giám sát phải đứng nhìn 3 người cùng lúc, thao tác phải nhanh hơn tốc độ rửa tay của bác sĩ (khoảng 20-30 giây).  
* **Giải pháp Thiết kế:**  
  * **Layout dạng Thẻ (Cards):** Màn hình chia làm 3 cột/thẻ dọc, mỗi thẻ đại diện cho 1 đối tượng (Bác sĩ A, Điều dưỡng B).  
  * **Quick Taps (Chạm nhanh):** Trong mỗi thẻ, hiển thị sẵn 5 biểu tượng của "5 Thời điểm WHO". Chạm 1 lần để chọn thời điểm.  
  * **Nút hành động (Bottom):** 3 nút to nằm ngay dưới ngón cái: `[Rửa Nước]` (Xanh dương), `[Chà Cồn]` (Xanh lá), `[BỎ SÓT]` (Đỏ).

### **3.2. Màn hình Chấm Bảng kiểm (Dynamic Checklist)**

* **Tuyệt đối KHÔNG:** Dùng thanh cuộn vô tận (Infinite Scroll) cho một bảng kiểm dài 50 câu hỏi. Màn hình điện thoại nhỏ sẽ làm người dùng hoa mắt, lướt nhầm dòng.  
* **Giải pháp Thiết kế (Wizard/Steppers):** \* Chia bảng kiểm thành từng "Trang/Bước". Mỗi trang chỉ hiện 1 cụm tiêu chí (Ví dụ: Bước 1: Chuẩn bị dụng cụ $\\rightarrow$ Bước 2: Thực hiện thủ thuật).  
  * Câu trả lời (Đạt / Không Đạt / Không áp dụng) làm thành các nút Radio Buttons cỡ lớn dàn ngang.  
  * Khi chọn "Không Đạt", lập tức trượt (Slide-down) ra một ô nhập Text và một **Nút bấm Camera \[Chụp ảnh vi phạm\]** ngay tại dòng đó.

### **3.3. Màn hình App cho Hộ lý / Nhân viên vệ sinh**

* *Đối tượng:* Thường là người lớn tuổi, mắt kém, thị lực hạn chế, ít sử dụng công nghệ.  
* **Giải pháp Thiết kế (Ultra-Minimalism):**  
  * **Giao diện To, Đậm, Tối giản:** Cỡ chữ lớn (20sp trở lên).  
  * Màn hình chính chỉ có 1 danh sách duy nhất: **"VIỆC CẦN LÀM NGAY"**.  
  * Card công việc: `[Dọn buồng 201 - Khoa Hồi sức]` $\\rightarrow$ Bấm vào Card $\\rightarrow$ Hiện ra Nút khổng lồ chiếm 1/3 màn hình: **\[ĐÃ DỌN XONG\]**.  
  * **Quét mã Rác:** Màn hình quét mã QR/Barcode mở ngay Camera dạng toàn màn hình, có khung viền đỏ ngắm chuẩn để hộ lý quét mã túi rác mà không cần thao tác bấm.  
  * **Âm thanh:** Tích hợp âm báo (Notification Sound) đặc trưng, to và rung mạnh khi có lệnh Vệ sinh xuất viện khẩn cấp truyền xuống.

## **4\. HỆ THỐNG TRẠNG THÁI VÀ MÀU SẮC (STATUS & COLOR PALETTE)**

Giao tiếp phi ngôn ngữ bằng màu sắc là rất quan trọng trong Y tế. Quy định cứng mã màu thiết kế cho UI:

* **Màu Đỏ (Red \- \#D32F2F):** Lỗi quy trình (Bỏ sót VST, Rớt dụng cụ), Rác lây nhiễm/nguy hại, Cảnh báo vi khuẩn MDROs, Mật độ NKBV vượt ngưỡng, Sắp hết Hóa chất.  
* **Màu Vàng/Cam (Amber \- \#FBC02D):** Cảnh báo đến hạn bảo trì, Công việc sắp đến hạn (Due today), Nhiệt độ kho CSSD bất thường.  
* **Màu Xanh lá (Green \- \#388E3C):** Đạt tiêu chuẩn, Tuân thủ tốt, Đã tiệt khuẩn (Vô khuẩn), Máy móc sẵn sàng.  
* **Màu Xanh dương (Blue \- \#1976D2):** Các thao tác thông tin (Information), Hành động trung tính (Đang mượn dụng cụ, Nút Rửa tay xà phòng).

