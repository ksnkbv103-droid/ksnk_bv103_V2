---
title: "05 — Đặc tả yêu cầu phi chức năng (NFR)"
source: ksnk-spec-split (legacy monolith copied to 00-legacy-full-spec-monolith.md)
see_also: [../README.md](../README.md), [10-bv103-implementation-mapping.md](../10-bv103-implementation-mapping.md)
---

> **Neo triển khai BV103:** [`AGENTS.md`](../../../AGENTS.md) V7.0 + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) + [`../README.md`](../README.md) (*Ý đồ phát triển*); tên bảng/cột thật: [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md).

# **ĐẶC TẢ YÊU CẦU PHI CHỨC NĂNG (NFR)**

## **HỆ THỐNG QUẢN TRỊ KIỂM SOÁT NHIỄM KHUẨN TỔNG THỂ**

Tài liệu này cung cấp các chỉ số kỹ thuật và ràng buộc bắt buộc mà Đội ngũ Phát triển (Dev/DevOps) phải tuân thủ để đảm bảo hệ thống KSNK hoạt động ổn định, bảo mật và phù hợp với môi trường khắc nghiệt tại bệnh viện.

## **1\. KHẢ NĂNG HOẠT ĐỘNG NGOẠI TUYẾN (OFFLINE-FIRST & RESILIENCE)**

Bệnh viện có nhiều "vùng lõm" sóng Wi-Fi/4G (Tầng hầm, Phòng mổ bọc chì, Kho rác). Hệ thống không được phép hiển thị lỗi "Mất kết nối mạng" làm gián đoạn công việc.

* **Cơ chế lưu trữ cục bộ (Local Storage):** Các ứng dụng Mobile/Tablet (Giám sát VST, Quét rác, CSSD) phải sử dụng công nghệ như `IndexedDB` hoặc `SQLite` để lưu trữ dữ liệu ngay trên thiết bị khi mất mạng.  
* **Đồng bộ ngầm (Background Sync):** Ngay khi thiết bị bắt được sóng Wi-Fi, phần mềm phải tự động kích hoạt Service Worker đẩy dữ liệu lên Server.  
* **Xử lý xung đột (Conflict Resolution):** Trong trường hợp 2 thiết bị cùng chỉnh sửa ngoại tuyến 1 bản ghi và đẩy lên cùng lúc, hệ thống ưu tiên giữ lại bản ghi có `Timestamp` (Thời gian thao tác thực tế) mới nhất và cảnh báo cho Admin.  
* **Giới hạn dữ liệu Offline:** Thiết bị di động chỉ tải và lưu trữ (cache) các danh mục cần thiết cho ca làm việc hiện tại (ví dụ: Danh sách bệnh nhân của khoa đang trực), không tải toàn bộ CSDL viện để tránh đầy bộ nhớ.

## **2\. BẢO MẬT, PHÂN QUYỀN VÀ QUYỀN RIÊNG TƯ (SECURITY & PRIVACY)**

Dữ liệu Kiểm soát nhiễm khuẩn chứa các thông tin nhạy cảm về tình trạng nhiễm trùng của bệnh nhân, do đó phải tuân thủ chuẩn bảo mật Y tế (như HIPAA hoặc quy định của Bộ Y tế).

* **Mã hóa dữ liệu (Encryption):** \* *In-transit (Trên đường truyền):* Bắt buộc sử dụng giao thức HTTPS (TLS 1.2 hoặc 1.3) cho mọi kết nối API.  
  * *At-rest (Tại nơi lưu trữ):* Mật khẩu người dùng phải được băm (Hash) bằng thuật toán bcrypt/Argon2. Không lưu plaintext.  
* **Che giấu dữ liệu (Data Masking):** Trên các Dashboard xuất báo cáo toàn viện, tên bệnh nhân bắt buộc phải được che (VD: `Nguyễn Văn A` hiển thị thành `N*** V** A` hoặc chỉ hiện Mã BA). Trưởng khoa KSNK mới có quyền bấm vào để xem tên thật.  
* **Phân quyền RBAC (Role-Based Access Control) mức độ sâu:**  
  * *Cấp độ API:* Backend phải kiểm tra Role (Token JWT) ở mọi endpoint. Việc ẩn nút bấm ở Frontend là chưa đủ.  
  * *Cấp độ Dữ liệu (Row-level Security):* Nhân sự Khoa Nội chỉ được API trả về dữ liệu giám sát của Khoa Nội.  
* **Nhật ký Hệ thống (Audit Trail):** Mọi thao tác `POST`, `PUT`, `DELETE` (Soft-delete) phải được ghi vào bảng `sys_audit_log`.  
  * *Payload bắt buộc:* `User_ID`, `Action` (Thêm/Sửa/Xóa), `Table_Name`, `Record_ID`, `Timestamp`, `Old_Value` (JSON), `New_Value` (JSON), `IP_Address`.

## **3\. HIỆU NĂNG VÀ TỐC ĐỘ PHẢN HỒI (PERFORMANCE & RESPONSE TIME)**

Hệ thống KSNK có tính chất "dây chuyền công nghiệp" (đặc biệt tại CSSD, Nhà giặt). Tốc độ phần mềm quyết định năng suất lao động.

* **Tốc độ Quét mã (Barcode/QR/RFID):**  
  * Thời gian từ lúc máy quét "Tít" đến lúc màn hình hiển thị thông tin Bộ dụng cụ/Túi rác phải **\< 1 giây**.  
  * *Giải pháp kỹ thuật yêu cầu:* Indexing trên các cột `Mã (Code)`, sử dụng In-memory Cache (như Redis) cho các danh mục quét thường xuyên.  
* **Độ trễ API (API Latency):** Phản hồi thông thường cho thao tác CRUD phải **\< 200 ms** (milliseconds).  
* **Xử lý Báo cáo / Dashboard:**  
  * Việc load các biểu đồ (Charts) tổng hợp dữ liệu của 10 phân hệ không được làm treo trình duyệt.  
  * Thời gian load tối đa: **\< 3-5 giây** cho báo cáo 1 tháng, **\< 10 giây** cho báo cáo 1 năm.  
  * *Giải pháp:* Tách riêng Database đọc (Read Replica) để query báo cáo, không chạy chung với Database ghi (Write) để tránh làm nghẽn giao dịch trực tiếp của CSSD.

## **4\. CÔNG THÁI HỌC VÀ TRẢI NGHIỆM TRONG Y TẾ (ERGONOMICS & USABILITY)**

Thiết kế giao diện trong môi trường y tế (Clinical UX) khác hoàn toàn với ứng dụng thương mại thông thường. Môi trường làm việc của KSNK rất khắc nghiệt (nhiệt độ cao, ẩm ướt, đeo găng tay nhiều lớp).

* **Thiết kế cho người đeo găng tay (Gloved-hand UI):**  
  * Tại các module CSSD, Nhà giặt, Kho rác: Các vùng có thể chạm (Touch Targets) trên Tablet/Mobile tối thiểu phải đạt kích thước **48x48 dp** (chuẩn Material Design).  
  * Hạn chế tối đa các menu thả xuống (Dropdown) phức tạp, ưu tiên sử dụng Nút bấm dạng thẻ (Card/Button) lớn.  
* **Tối giản thao tác nhập liệu:**  
  * Giảm thiểu việc sử dụng Bàn phím ảo để gõ Text.  
  * Ưu tiên các thao tác: Quét mã, Quẹt thẻ nhân viên (NFC/RFID) để nhận diện, Checkbox, Radio Button, Swipe (Vuốt trái/phải để duyệt/từ chối).  
  * *Nâng cao (Optional):* Có thể tích hợp Voice-to-text (Nhận diện giọng nói) khi nhân viên CSSD cần báo lỗi dụng cụ mà tay đang bận.  
* **Tương phản hình ảnh (Visual Contrast):** Cảnh báo Lỗi/Vi phạm/Hết hạn phải sử dụng màu Đỏ cờ kèm theo biểu tượng (Icon) lớn (vì một số nhân viên có thể bị mù màu). Hỗ trợ chế độ Tối (Dark Mode) để bảo vệ mắt khi làm việc ca đêm.

## **5\. TÍNH SẴN SÀNG VÀ ĐỘ TIN CẬY (AVAILABILITY & RELIABILITY)**

Lò hấp hỏng có thể hoãn mổ, phần mềm sập cũng khiến phòng mổ tê liệt vì không truy xuất được mẻ hấp.

* **Cam kết thời gian hoạt động (Uptime SLA):** Hệ thống phải đạt độ sẵn sàng **99.9%**.  
* **Bảo trì không gián đoạn (Zero-Downtime Deployment):** Việc cập nhật phiên bản phần mềm mới (Release) phải được thực hiện qua cơ chế Blue-Green Deployment hoặc Rolling Update, không yêu cầu người dùng phải "Đăng xuất 30 phút để bảo trì hệ thống".  
* **Sao lưu và Phục hồi (Backup & Disaster Recovery):**  
  * *RPO (Recovery Point Objective):* Không mất dữ liệu quá **1 giờ** (Yêu cầu cấu hình Backup Log/Snapshot liên tục mỗi giờ).  
  * *RTO (Recovery Time Objective):* Thời gian phục hồi hệ thống khi có sự cố sập Server vật lý không được vượt quá **4 giờ**.

## **6\. KHẢ NĂNG MỞ RỘNG VÀ TÍCH HỢP (SCALABILITY & INTEROPERABILITY)**

* **Kiến trúc mở rộng (Scalability):** Hệ thống phải chịu tải được sự gia tăng dữ liệu cực lớn từ `LifecycleAuditLog` (Nhật ký vòng đời dụng cụ) và `fact_luot_quan_sat_vst` (Giám sát VST). Có khả năng scale-out (thêm server) cho riêng các module nặng tải thay vì phải nâng cấp toàn bộ.  
* **Tiêu chuẩn tích hợp (Interoperability):** Các API cung cấp cho HIS/LIS/HRM phải có tài liệu đặc tả rõ ràng (Swagger/OpenAPI) và chuẩn hóa dữ liệu định dạng JSON, có khả năng mở rộng để tương thích HL7/FHIR trong tương lai.

