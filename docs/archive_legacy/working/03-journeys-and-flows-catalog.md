---
title: "03 — Danh mục bản đồ hành trình và sơ đồ luồng"
source: ksnk-spec-split (legacy monolith copied to 00-legacy-full-spec-monolith.md)
see_also: [../README.md](../README.md), [10-bv103-implementation-mapping.md](../10-bv103-implementation-mapping.md)
---

> **Neo triển khai BV103:** [`AGENTS.md`](../../../AGENTS.md) V7.0 + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) + [`../README.md`](../README.md) (*Ý đồ phát triển*); tên bảng/cột thật: [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md).

# **DANH MỤC BẢN ĐỒ HÀNH TRÌNH VÀ SƠ ĐỒ LUỒNG (JOURNEYS & FLOWCHARTS)**

## **HỆ THỐNG QUẢN TRỊ KIỂM SOÁT NHIỄM KHUẨN**

Tài liệu này liệt kê các sơ đồ nghiệp vụ cần thiết để đội ngũ UI/UX Designer thiết kế màn hình và đội ngũ Developer viết logic (Backend/API).

## **1\. CỤM MODULE: QUẢN LÝ VÒNG ĐỜI DỤNG CỤ PHẪU THUẬT (CSSD)**

Đây là cụm module mang tính chất "Sản xuất \- Dây chuyền", do đó cần các sơ đồ quy trình nghiệp vụ (BPMN \- Business Process Model and Notation) và Sơ đồ trạng thái (State Machine Diagram).

### **1.1. Luồng Quản trị Danh mục và Thiết lập Cấu trúc Bộ dụng cụ (Set Master Data Flow)**

* **Loại sơ đồ:** Data Flow & User Journey.  
* **Mô tả luồng:** Thao tác của Admin/Trưởng CSSD để thiết lập dữ liệu nền.  
  * \[Tạo danh mục `Loại dụng cụ`\] $\\rightarrow$ \[Tạo `Bộ dụng cụ` (Bộ cha)\] $\\rightarrow$ \[Thêm các `Chi tiết dụng cụ` vào Bộ cha, thiết lập `Cơ số chuẩn` (StandardParLevel)\].  
  * **Luồng Điều chuyển cấu trúc (Set-to-Set Transfer):** Xử lý khi cần cấu trúc lại bộ mổ $\\rightarrow$ \[Chọn Bộ A\] $\\rightarrow$ \[Tách 1 chi tiết panh\] $\\rightarrow$ \[Điều chuyển vật lý sang Bộ B\] $\\rightarrow$ Hệ thống tự động giảm cơ số chuẩn của Bộ A và tăng cho Bộ B, đồng thời ghi lại lịch sử `AuditLog`.

### **1.2. Bản đồ hành trình Vòng đời Tái xử lý dụng cụ chuẩn (Happy Path)**

* **Loại sơ đồ:** BPMN Flowchart (Sơ đồ luồng có chia làn \- Swimlanes).  
* **Tác nhân (Actors):** Điều dưỡng phòng mổ, Nhân viên CSSD khu bẩn, Nhân viên CSSD khu sạch, Nhân viên CSSD khu vô khuẩn.  
* **Mô tả luồng:** Bắt đầu từ khi \[Phòng mổ bàn giao đồ bẩn\] $\\rightarrow$ \[CSSD Nhận/Quét mã vạch\] $\\rightarrow$ \[Làm sạch/Máy rửa\] $\\rightarrow$ \[Kiểm tra & Đóng gói thành Bộ\] $\\rightarrow$ \[Tạo Mẻ Hấp\] $\\rightarrow$ \[Lưu kho vô khuẩn\] $\\rightarrow$ \[Cấp phát lại cho Phòng mổ\].

### **1.3. Sơ đồ rẽ nhánh Phương pháp Tiệt khuẩn và Kiểm soát chất lượng (Sterilization Routing & QC Flow)**

* **Loại sơ đồ:** Decision Flowchart (Lưu đồ rẽ nhánh logic có điều kiện).  
* **Mô tả luồng:** \* **Pha Rẽ nhánh (Routing):** Khi nhân viên quét mã Bộ dụng cụ để xếp vào lò $\\rightarrow$ Hệ thống check thuộc tính `Khả năng chịu nhiệt` (HeatTolerance).  
  * *Nhánh 1 (Chịu nhiệt):* Đề xuất/Cho phép xếp vào Lò hấp ướt (Steam Sterilization).  
  * *Nhánh 2 (Không chịu nhiệt):* Báo lỗi đỏ nếu cho vào lò Steam $\\rightarrow$ Ép buộc rẽ nhánh sang Lò Plasma hoặc Lò EO (Ethylene Oxide).  
  * **Pha KCS (Quality Control):** Kết thúc mẻ hấp $\\rightarrow$ Nhân viên quét mã Test Hóa học/Sinh học. Nếu "Đạt" $\\rightarrow$ Cập nhật trạng thái `VÔ_KHUẨN` và cho phép nhập kho. Nếu "Không Đạt" $\\rightarrow$ Kích hoạt luồng thu hồi (Recall) toàn bộ Bộ dụng cụ trong mẻ đó.

### **1.4. Sơ đồ xử lý Lỗi và Trả về khâu trước (Workflow Reject / Rework Flow)**

* **Loại sơ đồ:** Flowchart (Nhấn mạnh vào các nút thắt Quyết định \- Decision Nodes).  
* **Mô tả luồng:** Xử lý các ngoại lệ (Edge cases). Ví dụ: Ở khâu Đóng gói, soi kính lúp thấy dụng cụ còn vết máu $\\rightarrow$ Bấm nút "Reject" $\\rightarrow$ Hệ thống tự động ghi `LifecycleAuditLog`, gửi thông báo (Notification) yêu cầu nhân viên khu bẩn nhận lại để rửa $\\rightarrow$ Tạo `CssdIncidentReport` (Biên bản sự cố) nếu lỗi lặp lại nhiều lần.

### **1.5. Luồng Báo hỏng, Mất và Bù cơ số (Defect & Replenishment Flow)**

* **Loại sơ đồ:** User Journey Map (Bản đồ hành trình người dùng).  
* **Mô tả luồng:** \[Phòng mổ báo gãy 1 cây panh trong Bộ mổ đẻ\] $\\rightarrow$ Kích hoạt `DefectLossReport` $\\rightarrow$ Trưởng khoa KSNK duyệt xuất kho 1 cây panh mới từ "Kho dự trữ" $\\rightarrow$ Cập nhật lại `StandardParLevel` (Cơ số) của Bộ mổ đẻ đó $\\rightarrow$ Hoàn tất bù đồ.

### **1.6. Lược đồ Trạng thái Dụng cụ / Bộ dụng cụ (Instrument State Diagram)**

* **Loại sơ đồ:** State Machine Diagram (Dành cho Developer code Database).  
* **Mô tả:** Định nghĩa cứng các trạng thái của một bộ dụng cụ: `BẨN` $\\rightarrow$ `ĐANG_RỬA` $\\rightarrow$ `ĐÃ_RỬA_SẠCH` $\\rightarrow$ `ĐÃ_ĐÓNG_GÓI` $\\rightarrow$ `ĐANG_HẤP` $\\rightarrow$ `VÔ_KHUẨN` $\\rightarrow$ `HẾT_HẠN_VÔ_KHUẨN`. Trạng thái này quyết định dụng cụ có được phép xuất kho hay không.

## **2\. CỤM MODULE: QUẢN LÝ KHO, HÓA CHẤT, MÁY MÓC**

Nhấn mạnh vào tính toán tự động và cảnh báo.

### **2.1. Sơ đồ luồng Cảnh báo Tồn kho và Hết hạn Hóa chất (Inventory Alert Flow)**

* **Loại sơ đồ:** System Flowchart (Luồng hệ thống chạy ngầm).  
* **Mô tả luồng:** Hệ thống (Cronjob) chạy quét dữ liệu mỗi đêm. Nếu `Số lượng hiện tại < LowStockThreshold` HOẶC `Ngày hiện tại > (ExpiryDate - 30 ngày)` $\\rightarrow$ Sinh ra cảnh báo (Red Dot) trên chuông thông báo của Thủ kho KSNK.  
* **Đặc thù hóa chất:** Bao gồm luồng "Bắt đầu mở nắp" $\\rightarrow$ Đếm ngược thời gian Hạn mở nắp (Open-pot life) $\\rightarrow$ Cảnh báo vứt bỏ.

### **2.2. Lược đồ Quản lý Lịch bảo trì Thiết bị (Equipment Maintenance Flow)**

* **Tác nhân:** Nhân viên KSNK, Kỹ sư Vật tư y tế.  
* **Mô tả luồng:** Từ lúc Lên lịch bảo trì định kỳ $\\rightarrow$ Đến hạn cảnh báo $\\rightarrow$ Lập biên bản bàn giao máy $\\rightarrow$ Cập nhật tình trạng máy thành `ĐANG_BẢO_TRÌ` (Lúc này máy không thể được thêm vào luồng `Tạo mẻ hấp`) $\\rightarrow$ Hoàn thành bảo trì $\\rightarrow$ Trạng thái `SẴN_SÀNG`.

## **3\. CỤM MODULE: GIÁM SÁT TUÂN THỦ VÀ VỆ SINH TAY**

Tập trung vào tính di động (Mobility) vì người dùng thường cầm Tablet/Điện thoại đi giám sát.

### **3.1. Bản đồ hành trình Giám sát Vệ sinh tay theo WHO (Hand Hygiene Audit Journey)**

* **Loại sơ đồ:** User Journey Map (Nhấn mạnh vào UX/UI trên thiết bị di động).  
* **Mô tả luồng:** \[Chọn Khoa/Phòng\] $\\rightarrow$ \[Bắt đầu phiên `AuditSession`\].  
  * **Tính năng Giám sát Đa đối tượng:** Giao diện cho phép chọn/thêm **tối đa 3 đối tượng quan sát cùng lúc** (VD: 1 Bác sĩ, 2 Điều dưỡng đang cùng đi buồng).  
  * Với **từng đối tượng** trên màn hình $\\rightarrow$ \[Chọn Cơ hội (`HandHygieneOpportunity`)\] $\\rightarrow$ \[Chọn Hành động (Wash/Rub/Missed)\].  
  * Lặp lại vòng lặp này $\\rightarrow$ \[Kết thúc phiên\] $\\rightarrow$ App tự động tính `ComplianceRate` (Tỷ lệ tuân thủ chung và riêng từng chức danh) và đồng bộ lên Server.

### **3.2. Sơ đồ luồng Động cơ Bảng kiểm (Dynamic Checklist Engine Flow)**

* **Loại sơ đồ:** Data Flow Diagram (DFD).  
* **Mô tả luồng:** Gồm 2 pha:  
  * **Pha Admin (Web):** Kéo thả tạo `ChecklistTemplate` mới (Ví dụ Bảng kiểm Vệ sinh môi trường) $\\rightarrow$ Lưu Version mới.  
  * **Pha Giám sát viên (App/Web):** Chọn Bảng kiểm $\\rightarrow$ Đánh giá Yes/No/NA $\\rightarrow$ Bắt buộc chụp ảnh/nhập ghi chú nếu chọn No $\\rightarrow$ Lưu `AuditSession` $\\rightarrow$ Tính điểm %.

## **4\. CỤM MODULE: QUẢN LÝ CÔNG VIỆC MẠNG LƯỚI KSNK (TASK MANAGEMENT)**

### **4.1. Lược đồ Trạng thái Công việc (Task Lifecycle State Diagram)**

* **Loại sơ đồ:** State Machine Diagram.  
* **Mô tả:** Vòng đời của `Task`: `TODO` (Chờ làm) $\\rightarrow$ `IN_PROGRESS` (Đang làm) $\\rightarrow$ `SUBMITTED` (Đã nộp báo cáo, chờ duyệt) $\\rightarrow$ `APPROVED/DONE` (Hoàn thành) HOẶC `REJECTED` (Bắt làm lại). Đi kèm là luồng chạy ngầm tự động chuyển thành `OVERDUE` (Quá hạn) nếu qua `DueDate`.

### **4.2. Luồng Tương tác giữa Khoa KSNK và Mạng lưới KSNK lâm sàng**

* **Loại sơ đồ:** Sequence Diagram (Sơ đồ tuần tự).  
* **Mô tả:** Mô tả cách Trưởng khoa KSNK đẩy một loạt công việc hàng tháng xuống cho 30 Điều dưỡng trưởng các khoa $\\rightarrow$ Các khoa nhận Notification $\\rightarrow$ Thực hiện công việc $\\rightarrow$ Phản hồi kết quả về trung tâm.

## **5\. CỤM MODULE: GIÁM SÁT NKBV VÀ DASHBOARD TỔNG HỢP**

Đây là bộ não (The Brain) của hệ thống, đòi hỏi luồng dữ liệu chứ không chỉ là thao tác người dùng.

### **5.1. Sơ đồ Dòng chảy Dữ liệu Giám sát NKBV (Surveillance Data Flow Diagram)**

* **Loại sơ đồ:** System Architecture / Data Integration Flow.  
* **Mô tả luồng:** Dữ liệu tự động chảy từ HIS/LIS (Bệnh án, Kết quả cấy vi sinh, Đặt Catheter) $\\rightarrow$ Chạy qua Bộ quy tắc (Rules Engine) của CDC $\\rightarrow$ Lọc ra các ca "Dương tính giả" (Ví dụ: Nấm men trong nước tiểu) $\\rightarrow$ Đẩy ra danh sách Cảnh báo đỏ (Red Flags) $\\rightarrow$ Bác sĩ KSNK vào xem hồ sơ $\\rightarrow$ Bấm Xác nhận (Thành ca bệnh HAI) hoặc Loại trừ.

### **5.2. Sơ đồ Cấu trúc Cây Dashboard (Analytics Hub Tree)**

* **Loại sơ đồ:** Information Architecture (IA) / Sơ đồ cấu trúc thông tin.  
* **Mô tả:** Bản đồ hóa màn hình Trung tâm báo cáo:  
  * **Tầng 1:** `GlobalFilter` (Lọc theo Năm/Tháng/Quý, Lọc theo Khối/Khoa).  
  * **Tầng 2:** Các `ThematicTab` (Tab Chuyên đề: Tổng quan, Tuân thủ VST, Tuân thủ Quy trình, Thiết bị/CSSD, Vi sinh/MDRO, Mật độ NKBV).  
  * **Tầng 3:** Mapping các chỉ số (Metrics) vào từng Tab tương ứng (Ví dụ: Tab CSSD chứa biểu đồ "Tỷ lệ mẻ hấp lỗi", "Tỷ lệ trả về khâu trước").

## **6\. CỤM MODULE: QUẢN LÝ ĐỒ VẢI (LAUNDRY & LINEN MANAGEMENT)**

### **6.1. Sơ đồ luồng Phân loại và Cảnh báo lây nhiễm (Linen Segregation & Alert Flow)**

* **Loại sơ đồ:** Decision Flowchart.  
* **Mô tả luồng:** Tại khoa lâm sàng $\\rightarrow$ Điều dưỡng phân loại đồ vải:  
  * *Nhánh 1:* Đồ vải thường $\\rightarrow$ Bỏ túi/xe gom màu quy định $\\rightarrow$ Nhập số lượng dự kiến gửi nhà giặt.  
  * *Nhánh 2:* Đồ vải lây nhiễm $\\rightarrow$ Bỏ túi màu VÀNG. Bắt buộc nhập cảnh báo lây nhiễm trên phần mềm $\\rightarrow$ Hệ thống gửi "Báo động" đến nhân viên thu gom và nhà giặt để chuẩn bị quy trình xử lý riêng biệt.

### **6.2. Bản đồ hành trình Giao nhận và Đối soát (Linen Distribution & Reconciliation Journey)**

* **Loại sơ đồ:** BPMN Flowchart.  
* **Mô tả luồng:** Luồng đối chiếu chống thất thoát. \[Khoa gửi $X$ kg đồ dơ/ $N$ cái\] $\\rightarrow$ \[Nhân viên nhà giặt cân/đếm và xác nhận $X$\] $\\rightarrow$ \[Chạy mẻ giặt\] $\\rightarrow$ \[Nhà giặt trả về Khoa $Y$ kg đồ sạch\] $\\rightarrow$ \[Khoa xác nhận nhận $Y$\] $\\rightarrow$ Phần mềm tự động tính chênh lệch. Nếu thất thoát vượt định mức $\\rightarrow$ Yêu cầu lập biên bản bù hao hụt.

## **7\. CỤM MODULE: QUẢN LÝ CHẤT THẢI Y TẾ (WASTE MANAGEMENT)**

### **7.1. Sơ đồ luồng Bàn giao và Cân rác thải (Waste Transfer & Weighing Flow)**

* **Loại sơ đồ:** Data Flow Diagram.  
* **Mô tả luồng:** Mô tả hành trình vật lý của rác. \[Hộ lý thu gom từ Khoa\] $\\rightarrow$ Mang xuống nhà lưu giữ rác tập trung $\\rightarrow$ \[Nhân viên KSNK tiến hành cân rác từng loại (Lây nhiễm, Sinh hoạt, Tái chế)\] $\\rightarrow$ Nhập dữ liệu lên phần mềm (hoặc lấy trực tiếp qua API từ cân điện tử) $\\rightarrow$ \[Ký điện tử bàn giao cho Đơn vị môi trường đem đi tiêu hủy\] $\\rightarrow$ Sinh báo cáo khối lượng rác thải (để thanh toán tiền hàng tháng).

### **7.2. Sơ đồ chạy ngầm Cảnh báo thời gian lưu giữ (Waste Storage Alert Flow)**

* **Loại sơ đồ:** System Flowchart.  
* **Mô tả luồng:** Hệ thống kiểm tra liên tục (Cronjob). Quy định rác lây nhiễm không lưu quá 48h (trong điều kiện thường). Khi lô rác lây nhiễm nhập kho $\\rightarrow$ Khởi động đồng hồ đếm ngược $\\rightarrow$ Nếu quá 40h chưa có đơn vị đến chở đi tiêu hủy $\\rightarrow$ Báo động (Alert) cho Lãnh đạo Khoa KSNK.

## **8\. CỤM MODULE: VỆ SINH MÔI TRƯỜNG BỀ MẶT (ENVIRONMENTAL CLEANING)**

### **8.1. Luồng Tự động kích hoạt Vệ sinh xuất viện (Terminal Cleaning Trigger Flow)**

* **Loại sơ đồ:** Cross-system Flowchart (Luồng tích hợp liên hệ thống HIS-KSNK).  
* **Mô tả luồng:** Phần mềm KSNK lắng nghe dữ liệu từ HIS. Khi Bác sĩ lâm sàng bấm nút \[Cho xuất viện/Chuyển khoa bệnh nhân X tại Giường Y\] $\\rightarrow$ Phần mềm KSNK lập tức sinh ra một `Task` Vệ sinh xuất viện (Terminal Cleaning) và đẩy về App của Hộ lý phụ trách khu vực đó $\\rightarrow$ Hộ lý dọn xong $\\rightarrow$ Bấm hoàn thành $\\rightarrow$ Hệ thống cập nhật trạng thái "Giường Sạch/Trống" báo lại cho Khoa lâm sàng nhận bệnh nhân mới.

### **8.2. Bản đồ hành trình Kiểm soát Chất lượng Bề mặt (Environmental QC Journey)**

* **Loại sơ đồ:** User Journey Map.  
* **Mô tả luồng:** Chuyên trách KSNK đi kiểm tra $\\rightarrow$ Sử dụng `ChecklistTemplate` (Bảng kiểm bề mặt hay đụng chạm).  
  * *Nhánh dạ quang (Fluorescent Marker):* Đánh dấu tàng hình trước $\\rightarrow$ Hộ lý dọn $\\rightarrow$ Soi đèn $\\rightarrow$ Nhập kết quả Đạt/Không đạt lên phần mềm.  
  * *Nhánh đo ATP:* Quẹt que đo ATP $\\rightarrow$ Cắm vào máy $\\rightarrow$ Máy trả về chỉ số RLU $\\rightarrow$ Nhập RLU vào phần mềm $\\rightarrow$ Nếu RLU $\>$ Ngưỡng chuẩn $\\rightarrow$ App tự động bôi đỏ và sinh thông báo yêu cầu Hộ lý làm sạch lại (Rework).

