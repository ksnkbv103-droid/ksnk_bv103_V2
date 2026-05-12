---
title: "01 — Domain-first & checklist & từ điển nghiệp vụ"
source: ksnk-spec-split (legacy monolith copied to 00-legacy-full-spec-monolith.md)
see_also: [../README.md](../README.md), [10-bv103-implementation-mapping.md](../10-bv103-implementation-mapping.md)
---

> **Neo triển khai BV103:** [`AGENTS.md`](../../../AGENTS.md) V7.0 + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) + [`../README.md`](../README.md) (*Ý đồ phát triển*); tên bảng/cột thật: [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md).

# **BƯỚC ĐẦU TIÊN KHI PHÁT TRIỂN PHẦN MỀM KIỂM SOÁT NHIỄM KHUẨN (KSNK)**

Theo các chuyên gia Kỹ thuật Phần mềm (Software Engineering) và triết lý Thiết kế Hướng Nghiệp vụ (Domain-Driven Design \- DDD) của Eric Evans, bước đầu tiên và quan trọng nhất khi bắt tay vào một hệ thống phức tạp như KSNK **TUYỆT ĐỐI KHÔNG PHẢI** là:

* Chọn công nghệ (React, Angular, Java, C\#...).  
* Thiết kế Cơ sở dữ liệu (Database) hay vẽ các bảng `dm_loai_dung_cu`, `dm_khoa_phong`...  
* Viết những dòng code đầu tiên.

Bước đầu tiên và mang tính quyết định sự thành bại của dự án chính là: **THẤU HIỂU NGHIỆP VỤ VÀ MÔ HÌNH HÓA QUY TRÌNH (Domain Modeling & Business Process Mapping).**

Nói một cách thực tế: Bạn phải hiểu chính xác bác sĩ, điều dưỡng, và nhân viên Đơn vị Tiệt khuẩn Trung tâm (CSSD) đang làm gì, chạm vào những đồ vật gì, di chuyển theo luồng nào và viết báo cáo ra sao trong đời thực.

Dưới đây là 3 hành động cụ thể cốt lõi trong bước đầu tiên này:

## **1\. Thống nhất "Ngôn ngữ chung" (Ubiquitous Language)**

Lỗi phổ biến nhất khiến phần mềm y tế thất bại là lập trình viên (Dev) và nhân viên y tế (User) dùng chung một từ nhưng hiểu theo hai nghĩa khác nhau. Việc đầu tiên là phải lập một **Từ điển Nghiệp vụ**.

*Ví dụ trong KSNK:*

* Lập trình viên có thể coi "Rửa", "Làm sạch", "Khử khuẩn", "Tiệt khuẩn" đều là trạng thái "Đã làm sạch".  
* Nhưng trong KSNK thực tế (theo chuẩn JCI, CDC, Bộ Y tế):  
  * **Làm sạch (Cleaning):** Chỉ là loại bỏ vết bẩn nhìn thấy được.  
  * **Khử khuẩn mức độ cao (HLD):** Tiêu diệt hầu hết vi sinh vật nhưng không diệt được bào tử nấm.  
  * **Tiệt khuẩn (Sterilization):** Tiêu diệt hoàn toàn 100% vi sinh vật và bào tử. Nếu không thống nhất ngôn ngữ này ngay từ đầu, luồng code xử lý dụng cụ nội soi và dụng cụ phẫu thuật sẽ bị sai lệch hoàn toàn, vi phạm nghiêm trọng quy chuẩn an toàn người bệnh.

## **2\. Mô hình hóa quy trình và Hành trình vật lý (Business Process Mapping)**

KSNK không chỉ là nhập liệu trên màn hình, mà nó phản ánh sự dịch chuyển của vật lý (con người, dụng cụ, đồ vải, không khí, chất thải) trong bệnh viện. Bạn cần dùng các công cụ như text (Markdown), sơ đồ (Mermaid, BPMN) để mô tả luồng này trước.

*Ví dụ:* Thay vì tạo bảng `Phieu_Giao_Nhan`, bạn phải mô hình hóa **Vòng đời của một Mẻ hấp tiệt khuẩn**:

1. Dụng cụ bẩn từ phòng mổ được niêm phong.  
2. Đưa qua thang máy dơ xuống khu bẩn của CSSD.  
3. Phân loại \-\> Rửa bằng máy \-\> Sang khu sạch.  
4. Đóng gói \-\> Đưa vào nồi hấp (Tạo ra một 'Mẻ hấp' \- Sterilization Batch).  
5. Lưu trữ \-\> Xuất trả về phòng mổ.

## **3\. Xác định các "Ranh giới ngữ cảnh" (Bounded Contexts)**

KSNK là một miền (Domain) rất khổng lồ. Bạn không thể nhét tất cả vào một mớ code hỗn độn. Bước đầu tiên yêu cầu bạn phải chia "miền" lớn này thành các "Cụm nghiệp vụ" độc lập, ví dụ:

* **Cụm Quản lý Tái xử lý dụng cụ (CSSD):** Tập trung vào mẻ hấp, máy rửa, test sinh học (Spore test), test hóa học.  
* **Cụm Giám sát ca bệnh (Surveillance):** Tập trung vào việc phát hiện bệnh nhân bị Viêm phổi thở máy (VAP), Nhiễm khuẩn vết mổ (SSI).  
* **Cụm Quản lý Đồ vải (Laundry):** Luồng thu gom đồ vải bẩn, đồ vải lây nhiễm, giặt ủi, cấp phát.  
* **Cụm Quản lý Rác thải (Waste Management):** Phân loại rác y tế, rác sinh hoạt, rác sắc nhọn.

### **Hậu quả của việc bỏ qua bước này**

Nếu lao ngay vào thiết kế Database (Data-Driven) thay vì Domain-Driven, bạn sẽ rơi vào "căn bệnh" phổ biến: Bùng nổ các bảng danh mục (`dm_*`). Hệ thống sẽ trở nên chắp vá, phình to. Khi JCI hoặc Bộ Y tế ra quy định mới về giám sát vi khuẩn đa kháng (MDRO), việc sửa đổi Database lúc đó sẽ làm sụp đổ toàn bộ phần mềm vì các bảng đã bị trói buộc (coupling) quá chặt vào nhau mà không phản ánh đúng logic nghiệp vụ thực tế.

**Tóm lại:** Việc bạn cần làm đầu tiên với AI (như Cursor, Gemini) là viết ra các file `.md` mô tả chi tiết các quy trình, định nghĩa, và ranh giới nghiệp vụ của KSNK. Đây chính là "Hành lang pháp lý" (Context) để AI hiểu và sau này thiết kế kiến trúc phần mềm chuẩn xác nhất.

**DANH MỤC CÁC BƯỚC CHUẨN BỊ CUỐI CÙNG TRƯỚC KHI LẬP TRÌNH (PRE-IMPLEMENTATION CHECKLIST)**

Tài liệu này xác định 5 bước bắt buộc phải hoàn thành. Trong giai đoạn đầu, hệ thống tập trung vào **Nhập liệu thủ công** để đảm bảo tính sẵn sàng cao nhất mà không phụ thuộc vào tiến độ của các đơn vị HIS/LIS/Phần cứng.

## **BƯỚC 1: THIẾT KẾ TRẢI NGHIỆM VÀ GIAO DIỆN NGƯỜI DÙNG (UI/UX DESIGN)**

Lập trình viên không thể tự tưởng tượng ra màn hình. Đội ngũ Design (UI/UX) cần biến các "Bản đồ hành trình" thành các bản vẽ màn hình chi tiết (Mockups/Prototypes) bằng công cụ như Figma.

* **Thiết kế Web App (PC/Tablet):**  
  * **Giao diện Admin (Master Data):** Tập trung vào việc Import/Export danh mục và quản lý cấu trúc Cây của Bộ dụng cụ.  
  * **Giao diện "HIS/LIS Proxy":** Các Form nhập nhanh thông tin bệnh nhân, thông tin ca mổ và kết quả xét nghiệm vi sinh dành cho chuyên trách KSNK.  
* **Thiết kế Mobile App (Vận hành trực tiếp):**  
  * **App Giám sát:** Ưu tiên màn hình Vệ sinh tay 3 đối tượng và Bảng kiểm chia bước.  
  * **App Vận hành:** Màn hình quét rác, dọn phòng và nhật ký CSSD.

## **BƯỚC 2: THIẾT KẾ KIẾN TRÚC TÍCH HỢP HỆ THỐNG (API ARCHITECTURE)**

Trong giai đoạn chưa tích hợp tự động, trọng tâm chuyển sang việc thiết kế các **API nội bộ** và **API nhập liệu bắc cầu**.

* **API Nhập liệu (Proxy APIs):** Xây dựng các Endpoint tiếp nhận dữ liệu lâm sàng nhập tay. API này phải có logic validation cực mạnh để "làm sạch" dữ liệu ngay từ đầu.  
* **API Luồng Công việc (Workflow APIs):** Đảm bảo Module A (VD: Báo xuất viện) có thể tự động gọi Module B (VD: Giao task dọn phòng) thông qua API nội bộ.  
* **Sẵn sàng cho tương lai:** Thiết kế cấu trúc JSON chuẩn HL7/FHIR để sau này khi tích hợp HIS, chúng ta chỉ cần "thay ống dẫn dữ liệu" mà không cần đập đi xây lại logic xử lý bên trong.

## **BƯỚC 3: XÁC ĐỊNH YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS \- NFR)**

(Chi tiết: [`05-nfr-non-functional-requirements.md`](./05-nfr-non-functional-requirements.md))

* Khả năng hoạt động Ngoại tuyến (Offline-first).  
* Bảo mật và Quyền riêng tư (Data Masking).  
* Hiệu năng Quét mã vạch (\< 1 giây).

## **BƯỚC 4: THIẾT KẾ CƠ SỞ DỮ LIỆU VẬT LÝ (PHYSICAL ERD)**

(Chi tiết: [`07-physical-erd-specification.md`](./07-physical-erd-specification.md))

* Tổ chức bảng theo logic `dm_*` và `fact_*`.  
* Cơ chế tách/nhập mẻ hấp CSSD cho dụng cụ không chịu nhiệt.

## **BƯỚC 5: CHIẾN LƯỢC PHÂN KỲ TRIỂN KHAI (PHASING STRATEGY)**

Vì dữ liệu ban đầu là nhập tay, khối lượng công việc của nhân viên y tế sẽ tăng lên. Chiến lược triển khai cần ưu tiên các module "giảm tải" trước.

* **Giai đoạn 1:** Triển khai **Giám sát Tuân thủ & Bảng kiểm** (Bỏ giấy tờ, báo cáo tự động $\\rightarrow$ Nhân viên thích ngay vì nhàn hơn).  
* **Giai đoạn 2:** Triển khai **Quản lý Dụng cụ CSSD** (Thiết lập kỷ luật vận hành bằng mã vạch).  
* **Giai đoạn 3:** Triển khai **Quản lý Kho, Chất thải, Đồ vải**.  
* **Giai đoạn 4:** Khi dữ liệu lâm sàng đã ổn định, mới tiến hành tích hợp tự động với HIS/LIS để giảm khâu nhập tay ở Bước 2\.

# **TỪ ĐIỂN NGHIỆP VỤ KIỂM SOÁT NHIỄM KHUẨN (UBIQUITOUS LANGUAGE) \- BẢN ĐẦY ĐỦ**

*Tài liệu này là "hiến pháp" về ngôn từ của dự án. Giao diện (UI) dùng cột Tiếng Việt, Mã nguồn (Code/DB) bắt buộc dùng cột Tiếng Anh.*

## **1\. CỤM NGHIỆP VỤ: TÁI XỬ LÝ DỤNG CỤ (INSTRUMENT & CSSD)**

| Thuật ngữ Tiếng Việt (UI) | Tên Tiếng Anh (Code/DB) | Định nghĩa / Vai trò | Lưu ý thiết kế / Rủi ro |
| ----- | ----- | ----- | ----- |
| **Loại dụng cụ** | `InstrumentType` | Định nghĩa thuộc tính chung của 1 món đồ (Kéo, Panh, Optic). | **DNA của hệ thống.** Quy định tính chịu nhiệt và phương pháp tiệt khuẩn. |
| **Bộ dụng cụ (Định nghĩa)** | `InstrumentSet` | Danh mục tên các bộ mổ (Bộ mổ đẻ, Bộ nội soi). | Chỉ là cái khung (Template) chứa danh sách các `InstrumentType`. |
| **Bộ dụng cụ (Vật lý)** | `InstrumentInstance` | Một hộp đồ thực tế có Barcode/QR riêng. | **Thực thể luân chuyển.** Trạng thái (Vô khuẩn/Bẩn) gắn vào ID này. |
| **Mẻ hấp (Tiệt khuẩn)** | `SterilizationBatch` | Lô dụng cụ hấp chung 1 chu trình lò. | Một `InstrumentInstance` có thể phải tách linh kiện ra 2 `SterilizationBatch`. |
| **Tách linh kiện (Rẽ nhánh)** | `ComponentSplit` | Hành động tách món không chịu nhiệt ra khỏi bộ để hấp riêng. | Bộ dụng cụ chỉ được coi là `VO_KHUAN` khi mọi linh kiện tách ra đã hấp đạt. |
| **Nhật ký vòng đời** | `LifecycleAuditLog` | Ghi nhận: Ai nhận, Ai rửa, Ai hấp, Lỗi ở đâu. | Truy vết 100% hành trình từ lúc bẩn đến lúc vào mạch máu bệnh nhân. |

## **2\. CỤM NGHIỆP VỤ: GIÁM SÁT TUÂN THỦ (COMPLIANCE)**

| Thuật ngữ Tiếng Việt (UI) | Tên Tiếng Anh (Code/DB) | Lưu ý thiết kế |
| ----- | ----- | ----- |
| **Phiên giám sát VST** | `HandHygieneSession` | Hỗ trợ quan sát đồng thời **3 đối tượng** (Subjects) trong 1 phiên. |
| **Cơ hội VST** | `HandHygieneOpportunity` | 5 thời điểm của WHO (T1-T5). |
| **Bảng kiểm** | `ChecklistTemplate` | Mẫu biểu (Versioning v1, v2...). |

## **3\. CỤM NGHIỆP VỤ: QUẢN LÝ CÔNG VIỆC (TASK MANAGEMENT)**

| Thuật ngữ Tiếng Việt (UI) | Tên Tiếng Anh (Code/DB) | Định nghĩa |
| ----- | ----- | ----- |
| **Phạm vi công việc** | `TaskScope` | `INTERNAL` (Nội bộ) hoặc `NETWORK` (Mạng lưới). |
| **Sự kiện kích hoạt** | `TaskTrigger` | Tự động tạo Task từ sự cố CSSD, Rác thải hoặc HIS Proxy. |

*(Các phần khác về Kho, Đồ vải, Rác thải, Dashboard giữ nguyên theo thiết kế đã chốt).*
