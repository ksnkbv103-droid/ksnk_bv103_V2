# **BƯỚC ĐẦU TIÊN KHI PHÁT TRIỂN PHẦN MỀM KIỂM SOÁT NHIỄM KHUẨN (KSNK)**

> **LEGACY-ONLY (hard move):** File nay da duoc chuyen vao nhom legacy-only; duong dan cu giu stub tam thoi 1-2 sprint.
>  
> Canonical map: [`../CANONICAL_AND_LEGACY_MAP.md`](../CANONICAL_AND_LEGACY_MAP.md) · Legacy index: [`README.md`](./README.md)

> **Lưu ý (bắt buộc đọc trước khi trích dẫn):** Đây là bản **sao đầy đủ một file** trước khi tách (lưu trữ lịch sử). **Không** dùng làm chuẩn đặt tên DB hay triển khai migration mới.
>
> **Chuẩn vận hành hiện tại:** [`AGENTS.md`](../../../AGENTS.md) **V7.0** + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) + [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md) + [`README.md`](./README.md).  
> File nay la tai lieu **legacy snapshot**: chi de tham khao lich su, khong dung lam SSOT dat ten bang/cot hay migration moi.

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

(Xem chi tiết tại file `chi_tiet_nfr_ksnk.md`)

* Khả năng hoạt động Ngoại tuyến (Offline-first).  
* Bảo mật và Quyền riêng tư (Data Masking).  
* Hiệu năng Quét mã vạch (\< 1 giây).

## **BƯỚC 4: THIẾT KẾ CƠ SỞ DỮ LIỆU VẬT LÝ (PHYSICAL ERD)**

(Xem chi tiết tại file `thiet_ke_erd_ksnk.md`)

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

# **QUYẾT ĐỊNH KIẾN TRÚC (ADR): CHIẾN LƯỢC THIẾT KẾ CƠ SỞ DỮ LIỆU DANH MỤC (dm\_ vs dict\_)**

**Bối cảnh:** Dự án KSNK\_BV103 cần thống nhất việc sử dụng mô hình danh mục phân mảnh theo nghiệp vụ (`dm_*`) hay mô hình danh mục tập trung/linh hoạt (`dict_*` / mega-dictionary).

## **1\. Đánh giá nhận định hiện tại**

Nhận định của bạn về việc **`dm_*` tốt hơn `dict_*` cho danh mục lõi là hoàn toàn đúng đắn**. Phân tích ưu/nhược điểm bạn đưa ra phản ánh đúng nỗi đau của việc bảo trì dữ liệu y tế quy mô lớn.

## **2\. Quyết định: Cấu trúc nào cho phát triển lâu dài?**

**CHỐT QUYẾT ĐỊNH:** Hệ thống sử dụng mô hình **`dm_*` (Domain-specific Tables)** làm tiêu chuẩn thiết kế dài hạn cho mọi danh mục lõi của KSNK.

### **Tại sao đây là lựa chọn DUY NHẤT đúng cho KSNK?**

1. **Bảo vệ tính toàn vẹn dữ liệu (Data Integrity):**  
   * Tránh việc gán nhầm trạng thái của danh mục này cho danh mục kia (VD: trạng thái rác thải cho mẻ hấp).  
2. **Xử lý Logic "Rẽ nhánh" phức tạp (Case Study: CSSD Split Logic):**  
   * Đây là lý do quan trọng nhất. Một `Bộ dụng cụ` (Set) bao gồm nhiều `Loại dụng cụ` (Item Type). Trong đó có món chịu nhiệt (Hấp ướt) và món nhạy cảm nhiệt (Hấp Plasma).  
   * Kiến trúc `dm_*` cho phép bảng `dm_loai_dung_cu` sở hữu các cột nghiệp vụ riêng biệt như `is_heat_resistant` (BOOLEAN) và `sterilization_method_id` (UUID).  
   * Nếu dùng `dict_*`, các thuộc tính này sẽ bị nhét vào cột JSON chung chung, khiến việc viết câu lệnh SQL kiểm tra logic (ví dụ: Chặn không cho đưa đồ nhựa vào lò Steam) trở nên cực kỳ chậm, dễ lỗi và không thể tạo Index tối ưu.  
3. **Truy xuất nguồn gốc (Traceability) theo chuẩn JCI/CDC:**  
   * Khi có ca nhiễm khuẩn, hệ thống phải truy vết ngược: `Bệnh nhân` \-\> `Bộ dụng cụ vật lý` \-\> `Từng linh kiện lẻ` \-\> `Mẻ hấp tương ứng`. Mô hình `dm_*` cho phép Join dữ liệu rõ ràng, đảm bảo báo cáo audit "sạch".  
4. **Phân quyền dữ liệu (RLS):**  
   * Row-Level Security trên các bảng riêng biệt dễ kiểm soát hơn nhiều so với việc phân quyền trên một bảng "thùng rác".

## **3\. Kiến trúc Đích (Target Architecture): dm\_\* \+ Domain Registry**

Giải quyết nhược điểm lặp code bằng cách tạo một **Generic API Hub** ở Backend để định tuyến request tới đúng bảng vật lý `dm_*` tương ứng.

## **4\. Quy định sử dụng (Rule of Thumb)**

| Tiêu chí | Bắt buộc dùng `dm_*` (Bảng riêng) | `dict_*` (chỉ legacy / không mở rộng — AGENTS §3) |
| ----- | ----- | ----- |
| **Bản chất** | Danh mục mang tính **Nghiệp vụ Y tế/Lõi** | Không dùng làm chuẩn mới; nếu DB còn sót thì chuẩn hoá dần về `dm_*` + registry |
| **Có ràng buộc logic** | **CÓ.** (VD: Chặn lò hấp dựa vào loại đồ). | Không thiết kế thêm theo hướng mega-dictionary |
| **Ví dụ** | `dm_vi_khuan`, `dm_loai_dung_cu`, `dm_khoa_phong`. | (Không thêm ví dụ mới; không tạo bảng `dict_*` mới.) |

**Kết luận:** Kiên định với con đường `dm_*` để xây dựng hệ thống KSNK đẳng cấp quốc tế.

**Đồng bộ repo (V7.0):** Xem file tách [`02-adr-dm-dict-domain-registry.md`](../working/02-adr-dm-dict-domain-registry.md) mục 5, [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) và [`AGENTS.md`](../../../AGENTS.md) §3.

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

# **KIẾN TRÚC PHÂN HỆ VÀ DANH MỤC DÙNG CHUNG (SYSTEM BOUNDARIES & MASTER DATA)**

Tài liệu này xác định ranh giới của các module (Bounded Contexts) để chia team lập trình (ví dụ: Team A làm CSSD, Team B làm Tuân thủ). Đồng thời, quy định nghiêm ngặt những "Danh mục lõi" bắt buộc phải dùng chung, đảm bảo tính duy nhất của dữ liệu (Single Source of Truth).

## **PHẦN 1: XÁC ĐỊNH RANH GIỚI CÁC PHÂN HỆ (MODULE BOUNDARIES)**

Dựa trên yêu cầu nghiệp vụ thực tế tại Bệnh viện, hệ thống được thiết kế dưới dạng Micro-services hoặc Modular Monolith, bao gồm 10 phân hệ cốt lõi:

| STT | Tên Phân hệ (Module) | Trách nhiệm cốt lõi (Core Domain) | Đối tượng sử dụng chính (Actors) |
| ----- | ----- | ----- | ----- |
| **1** | **Quản trị Hệ thống & Dữ liệu chủ (MDM \- Master Data)** | Quản lý người dùng, phân quyền, cấu hình hệ thống và các danh mục dùng chung toàn viện. | Admin IT, Lãnh đạo Khoa KSNK. |
| **2** | **Quản lý Tái xử lý Dụng cụ (CSSD)** | Quản lý toàn bộ vòng đời dụng cụ phẫu thuật/nội soi: Nhận, Rửa, Đóng gói, Tiệt khuẩn (rẽ nhánh chịu nhiệt/không chịu nhiệt), Lỗi, Báo hỏng, Điều chuyển. | Nhân viên CSSD, Điều dưỡng Phòng mổ. |
| **3** | **Quản lý Kho & Tài sản KSNK (Inventory)** | Theo dõi Mức tồn kho hóa chất, vật tư (FEFO) và cảnh báo sắp hết. Lập lịch bảo trì, kiểm định máy móc (Lò hấp, Máy rửa). | Thủ kho KSNK, Kỹ sư Vật tư y tế. |
| **4** | **Giám sát Tuân thủ & VST (Compliance)** | Động cơ biểu mẫu động (Checklist Engine) cho mọi quy trình. Tính năng Giám sát vệ sinh tay độc lập (hỗ trợ quan sát 3 đối tượng cùng lúc). | Chuyên trách KSNK đi buồng (dùng App/Tablet). |
| **5** | **Giám sát Nhiễm khuẩn Bệnh viện (HAI Surveillance)** | Kết nối HIS/LIS để lấy dữ liệu. Chạy thuật toán CDC (Rules Engine) để chẩn đoán SSI, VAP, CLABSI, CAUTI, MDROs. | Bác sĩ/Chuyên trách Giám sát Vi sinh. |
| **6** | **Quản lý Công việc (Task Management)** | Giao việc, nhắc nhở (Deadline), nộp báo cáo. Dùng chung cho cả Nội bộ KSNK và Mạng lưới KSNK lâm sàng (Rẽ nhánh UI theo Role). | Toàn bộ nhân sự KSNK và Mạng lưới KSNK. |
| **7** | **Quản lý Đồ vải (Laundry & Linen Management)** | Theo dõi phân loại đồ vải (thường/lây nhiễm), theo dõi mẻ giặt, và đối soát trọng lượng/số lượng giao nhận để chống thất thoát. | Nhân viên Nhà giặt, Điều dưỡng khoa. |
| **8** | **Quản lý Chất thải Y tế (Waste Management)** | Quản lý phân loại rác, cân rác điện tử, giám sát thời gian lưu trữ rác lây nhiễm (không quá 48h) và bàn giao đơn vị tiêu hủy. | Hộ lý, Nhân viên quản lý rác, KSNK. |
| **9** | **Vệ sinh Môi trường bề mặt (Environmental Cleaning)** | Điều phối tự động vệ sinh xuất viện (Terminal Cleaning) từ HIS. Ghi nhận kết quả kiểm tra chất lượng (Đo ATP, Test dạ quang). | Hộ lý, Chuyên trách KSNK. |
| **10** | **Trung tâm Báo cáo (Analytics Hub)** | Tập hợp toàn bộ dữ liệu từ 9 phân hệ trên để vẽ Biểu đồ chuyên đề. Cung cấp Bộ lọc toàn cục (Global Filter). | Ban Giám đốc, Trưởng Khoa KSNK. |

**Quy tắc Vàng cho Lập trình viên:** Một phân hệ KHÔNG được phép can thiệp trực tiếp (Sửa/Xóa) vào Database của phân hệ khác. Ví dụ: Phân hệ (4) muốn biết một bộ dụng cụ ở phân hệ (2) có đạt chuẩn không thì phải gọi API qua, không được phép query trực tiếp vào bảng của CSSD.

## **PHẦN 2: CÁC DANH MỤC DÙNG CHUNG (SHARED KERNEL)**

Để các phân hệ có thể "nói chuyện" được với nhau và tổng hợp lên được Dashboard (Phân hệ 10), chúng ta bắt buộc phải có một tập hợp **Danh mục dùng chung**. Các danh mục này thuộc quyền quản lý của Phân hệ (1) MDM.

### **2.1. Nhóm Danh mục Nền tảng (Foundation Data)**

*Được đồng bộ một chiều từ HIS (Hệ thống thông tin bệnh viện) hoặc phần mềm Nhân sự. Phần mềm KSNK chỉ đọc (Read-only).*

1. **Danh mục Khoa / Phòng / Ban / Giường (`dm_khoa_phong`):**  
   * *Tác dụng:* Phân hệ CSSD dùng để cấp phát dụng cụ; Phân hệ Đồ vải/Chất thải dùng để truy xuất nguồn gốc rác/đồ dơ từ khoa nào; Phân hệ Môi trường dùng để biết cần dọn giường/buồng nào; Phân hệ Giám sát dùng để gán vị trí Nhiễm khuẩn.  
   * *Thuộc tính vệ tinh:* Phân loại Khối (Nội/Ngoại/CLS).  
2. **Hồ sơ nhân sự (`ho_so_nhan_vien`) — spec cũ: `dm_nhan_vien`:**  
   * *Tác dụng:* Gắn ID nhân viên vào mọi Audit Log (Ai rửa dụng cụ? Ai cân rác? Ai dọn phòng? Ai duyệt phiếu?).  
   * *Thuộc tính vệ tinh:* Trình độ, Chức vụ, Vai trò KSNK (Nội bộ / Mạng lưới).

### **2.2. Nhóm Danh mục Lâm sàng & Vi sinh (Clinical Data)**

*Dùng chung chủ yếu giữa Phân hệ (4) Giám sát Tuân thủ và Phân hệ (5) Giám sát NKBV.*

3. **Danh mục Tác nhân Vi sinh (`dm_vi_khuan` / `dm_nam`):**  
   * *Tác dụng:* Thống nhất tên gọi vi khuẩn (VD: S. aureus, E. coli). Nhận diện ca MDROs.  
4. **Danh mục Kháng sinh (`dm_khang_sinh`):**  
   * *Tác dụng:* Kết hợp với danh mục Vi sinh để tạo bản đồ Kháng sinh đồ (Antibiogram).  
5. **Danh mục Phân loại Nhiễm khuẩn (`dm_loai_hai`):**  
   * *Tác dụng:* Danh sách chuẩn của CDC (VAP, CLABSI, CAUTI, SSI). Bảng kiểm ở Phân hệ (4) phải map với mã của danh mục này để biết bảng kiểm đó phục vụ phòng ngừa loại bệnh nào.

### **2.3. Sự phân biệt với Danh mục "Cục bộ" (Local/Module Dictionaries)**

Để tránh làm "phình to" hệ thống MDM, những danh mục mang tính đặc thù sâu của một phân hệ sẽ KHÔNG ĐƯỢC để ở mục dùng chung, mà giao cho phân hệ đó tự quản lý.

* **Danh mục Cục bộ của Phân hệ CSSD:**  
  * `dm_loai_dung_cu`, `dm_bo_dung_cu`, `dm_phuong_phap_tiet_khuan`, `dm_kha_nang_chiu_nhiet`.  
* **Danh mục Cục bộ của Phân hệ Kho:**  
  * `dm_nha_cung_cap`, `dm_loai_hoa_chat`.  
* **Danh mục Cục bộ của Phân hệ Giám sát:**  
  * `dm_thoi_diem_vst` (5 thời điểm WHO), `dm_bang_kiem_template`.  
* **Danh mục Cục bộ của Phân hệ Đồ Vải:**  
  * `dm_loai_do_vai` (Ga trải giường, Quần áo bệnh nhân, Áo mổ...), `dm_doi_tac_giat_ui` (Nếu thuê ngoài).  
* **Danh mục Cục bộ của Phân hệ Chất thải:**  
  * `dm_loai_chat_thai` (Lây nhiễm, Sắc nhọn, Nguy hại, Sinh hoạt), `dm_don_vi_tieu_huy_rac`.  
* **Danh mục Cục bộ của Phân hệ Môi trường:**  
  * `dm_loai_be_mat` (Bề mặt hay đụng chạm, Bề mặt ít đụng chạm), `dm_quy_trinh_ve_sinh` (Thường quy, Xuất viện).

## **PHẦN 3: KIẾN TRÚC RẼ NHÁNH CHO PHÂN HỆ QUẢN LÝ CÔNG VIỆC**

Như đã quyết định, Phân hệ (6) Task Management **KHÔNG TÁCH** làm 2 phân hệ vật lý, mà sử dụng kiến trúc sau:

* **Tầng Database (BV103):** Bảng **`cong_viec`** + phân loại phạm vi (spec cũ: `fact_tasks` / `task_scope` — xem [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md)).  
* **Tầng API & RLS (Bảo mật):** Row-Level Security / filter server tách dữ liệu nội bộ vs mạng lưới theo quyền và cột thật trên `cong_viec`.  
* **Tầng UI/UX (2 Cổng giao tiếp \- Portals):**  
  * *Admin / Chuyên trách KSNK Portal:* Giao diện dạng Kanban Board, xem được việc của cả khoa mình và tiến độ của toàn mạng lưới.  
  * *Link Nurse Portal (Mạng lưới):* Giao diện dạng To-do List (Mobile-friendly), hiển thị rõ ràng: Việc cần làm tuần này, Việc quá hạn, Nút "Nộp báo cáo".

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

# **ĐẶC TẢ THIẾT KẾ CƠ SỞ DỮ LIỆU VẬT LÝ (PHYSICAL ERD SPECIFICATION)**

## **HỆ THỐNG QUẢN TRỊ KIỂM SOÁT NHIỄM KHUẨN (KSNK) \- CẬP NHẬT LOGIC CSSD RẼ NHÁNH**

Tài liệu này định nghĩa cấu trúc bảng để xử lý nghiệp vụ phức tạp: Một bộ dụng cụ có nhiều thành phần, thành phần chịu nhiệt hấp ướt, thành phần nhạy cảm nhiệt hấp Plasma/EO.

## **1\. PHÂN HỆ DỮ LIỆU CHỦ (MASTER DATA MANAGEMENT \- MDM)**

### **1.1. Danh mục Khoa/Phòng/Giường (`dm_khoa_phong`)**

* `id`: UUID (PK)  
* `ma_khoa`: VARCHAR(50) (Unique)  
* `ten_khoa`: NVARCHAR(255)  
* `khoi_id`: UUID (FK trỏ về `sys_categories` loại KHOI)  
* `is_active`: BOOLEAN

### **1.2. Danh mục Nhân sự (`dm_nhan_vien`)**

* `id`: UUID (PK)  
* `ho_ten`: NVARCHAR(255)  
* `vai_tro_ksnk`: ENUM (HD\_KSNK, CT\_KSNK, ML\_KSNK, NV\_CSSD, HO\_LY)  
* `khoa_phong_id`: UUID (FK)

## **2\. PHÂN HỆ QUẢN LÝ DỤNG CỤ CHUYÊN SÂU (INSTRUMENT & CSSD)**

### **2.1. Danh mục Loại dụng cụ (`dm_loai_dung_cu`)**

*Đây là bảng "Gốc" quy định DNA của từng cây kéo, panh, optic.*

* `id`: UUID (PK)  
* `ma_dung_cu`: VARCHAR(50) (Unique)  
* `ten_dung_cu`: NVARCHAR(255)  
* `is_chiu_nhiet`: BOOLEAN (True: Hấp ướt | False: Hấp lạnh)  
* `phuong_phap_tiet_khuan_id`: UUID (FK trỏ về danh mục phương pháp: Steam, Plasma, EO)  
* `phuong_phap_lam_sach_id`: UUID (FK)  
* `quy_cach_dong_goi_id`: UUID (FK)

### **2.2. Danh mục Bộ dụng cụ (`dm_bo_dung_cu`)**

*Định nghĩa cái tên của bộ (VD: Bộ mổ nội soi ruột thừa).*

* `id`: UUID (PK)  
* `ma_bo`: VARCHAR(50) (Unique)  
* `ten_bo`: NVARCHAR(255)  
* `ghi_chu_dong_goi`: TEXT (Hướng dẫn xếp đồ vào khay)

### **2.3. Cấu trúc chi tiết Bộ dụng cụ (`dm_cau_truc_bo_dung_cu`)**

*Bảng trung gian định mức cơ số cho từng bộ.*

* `id`: UUID (PK)  
* `bo_dung_cu_id`: UUID (FK)  
* `loai_dung_cu_id`: UUID (FK)  
* `so_luong_dinh_muc`: INT (Cơ số chuẩn)

### **2.4. Thực thể Bộ dụng cụ vật lý (`fact_bo_dung_cu_instance`)**

*Đại diện cho 1 hộp dụng cụ cụ thể có mã Barcode/QR riêng.*

* `id`: UUID (PK)  
* `bo_dung_cu_id`: UUID (FK)  
* `barcode_dinh_danh`: VARCHAR(100) (Unique)  
* `trang_thai_vong_doi`: ENUM (BAN, DANG\_RUA, CHO\_DONG\_GOI, CHO\_HAP, VO\_KHUAN, HET\_HAN)  
* `vi_tri_hien_tai_id`: UUID (FK trỏ về Khoa hoặc Kho CSSD)

### **2.5. Nhật ký Vòng đời & Rẽ nhánh tiệt khuẩn (`fact_cssd_lifecycle_logs`)**

*Bảng ghi lại từng bước đi, cho phép tách/nhập mẻ.*

* `id`: UUID (PK)  
* `bo_instance_id`: UUID (FK)  
* `loai_dung_cu_id`: UUID (FK \- Dùng khi tách lẻ dụng cụ ra tiệt khuẩn riêng)  
* `khau_thuc_hien`: ENUM (NHAN\_DO\_BAN, RUA, KIEM\_TRA, DONG\_GOI, TIET\_KHUAN, NHAP\_KHO, CAP\_PHAT)  
* `me_hap_id`: UUID (FK \- Link tới mẻ hấp cụ thể)  
* `nhan_vien_id`: UUID (FK)  
* `timestamp`: TIMESTAMP  
* `ket_qua`: ENUM (DAT, KHONG\_DAT)  
* `ghi_chu_su_co`: TEXT

## **3\. PHÂN HỆ GIÁM SÁT TUÂN THỦ (COMPLIANCE)**

### **3.1. Phiên Giám sát VST (`fact_hhy_sessions`)**

*Hỗ trợ giám sát 3 đối tượng cùng lúc theo yêu cầu.*

* `id`: UUID (PK)  
* `nguoi_giam_sat_id`: UUID (FK)  
* `khoa_phong_id`: UUID (FK)  
* `thoi_gian_bat_dau`: TIMESTAMP

### **3.2. Lượt quan sát chi tiết (`fact_hhy_observations`)**

* `id`: UUID (PK)  
* `phien_id`: UUID (FK)  
* `stt_doi_tuong`: INT (1, 2, hoặc 3 \- Để nhóm trên UI)  
* `doi_tuong_nv_id`: UUID (FK \- Nhân viên được quan sát)  
* `thoi_diem_who`: ENUM (T1, T2, T3, T4, T5)  
* `hanh_dong`: ENUM (RUB, WASH, MISSED)

## **4\. PHÂN HỆ QUẢN LÝ CÔNG VIỆC (TASK)**

### **4.1. Bảng Công việc (`fact_tasks`)**

* `id`: UUID (PK)  
* `task_scope`: ENUM (INTERNAL, NETWORK)  
* `nguoi_giao_id`: UUID (FK)  
* `nguoi_nhan_id`: UUID (FK)  
* `checklist_template_id`: UUID (FK \- Nếu là task đi chấm bảng kiểm)  
* `status`: ENUM (TODO, IN\_PROGRESS, SUBMITTED, DONE, REJECTED, OVERDUE)

## **5\. QUY TẮC RÀNG BUỘC NGHIỆP VỤ (DATABASE BUSINESS RULES)**

1. **Rule Tách mẻ (Split Logic):** Khi `fact_bo_dung_cu_instance` ở trạng thái `CHO_HAP`, hệ thống kiểm tra bảng `dm_cau_truc_bo_dung_cu` trỏ tới `dm_loai_dung_cu`.  
   * Nếu tồn tại dụng cụ `is_chiu_nhiet = False` $\\rightarrow$ Bắt buộc tách bản ghi nhật ký thành 2 `me_hap_id` khác nhau (Một mẻ lò Steam, một mẻ lò Plasma).  
   * Bộ dụng cụ chỉ được chuyển sang `VO_KHUẨN` khi **TẤT CẢ** các thành phần tách ra đều có nhật ký mẻ hấp tương ứng đạt kết quả `DAT`.  
2. **Rule Điều chuyển (Component Transfer):** Khi một cây kéo từ Bộ A bị hỏng và lấy từ Bộ B bù sang, hệ thống cập nhật `bo_instance_id` trong nhật ký dụng cụ lẻ để đảm bảo truy vết chính xác cây kéo đó đang nằm ở hộp nào.  
3. **Rule Cảnh báo tồn kho:** Bảng `dm_hoa_chat` link với bảng `fact_inventory`. Trigger sẽ so sánh `current_stock` với `min_threshold` để tự động insert vào bảng `fact_tasks` cho Thủ kho.  
4. **Rule Vệ sinh tay:** Một `phien_id` trong `fact_hhy_observations` không được có quá 3 giá trị `stt_doi_tuong` khác nhau.

# **ĐẶC TẢ KIẾN TRÚC API (GIAI ĐOẠN NHẬP LIỆU THỦ CÔNG)**

## **HỆ THỐNG QUẢN TRỊ KIỂM SOÁT NHIỄM KHUẨN (KSNK)**

Tài liệu này định nghĩa cấu trúc giao tiếp giữa các phân hệ và các Endpoint phục vụ việc nhập liệu lâm sàng thủ công, đảm bảo tính toàn vẹn dữ liệu y tế.

## **1\. NGUYÊN TẮC THIẾT KẾ "MÔ PHỎNG TÍCH HỢP" (PROXY STRATEGY)**

Dù là nhập tay, cấu trúc Payload (dữ liệu gửi lên) phải tuân thủ chuẩn **HL7 FHIR** hoặc **JSON Schema** đã thống nhất. Điều này giúp sau này khi có HIS/LIS thật, chúng ta chỉ cần thay đổi tầng xác thực mà không cần viết lại logic xử lý.

* **Idempotency-Key:** Mọi request `POST` bắt buộc kèm theo Key này ở Header để tránh nhân viên bấm nút "Gửi" nhiều lần do mạng chậm dẫn đến trùng dữ liệu.  
* **Audit-Context:** Mỗi request tự động đính kèm `staff_id` và `role` từ Token để ghi nhật ký: "Ai là người đã nhập tay bản ghi này?".

## **2\. NHÓM API PROXY (MÔ PHỎNG DỮ LIỆU NGOẠI VI)**

### **2.1. Quản lý Bệnh nhân và Sự kiện Buồng bệnh**

Dành cho chuyên trách KSNK hoặc Điều dưỡng mạng lưới cập nhật tình hình bệnh nhân thay cho HIS.

| Method | Endpoint | Nghiệp vụ nhập tay | Logic xử lý tự động (Internal Trigger) |
| ----- | ----- | ----- | ----- |
| `POST` | `/api/v1/proxy/patients` | Khai báo bệnh nhân mới vào khoa | Khởi tạo hồ sơ giám sát NKBV rỗng. |
| `PUT` | `/api/v1/proxy/patients/{id}/transfer` | Nhập tay sự kiện chuyển khoa | Cập nhật vị trí để áp dụng "Transfer Rule" (Luật luân chuyển 48h). |
| `PUT` | `/api/v1/proxy/patients/{id}/discharge` | Báo bệnh nhân xuất viện | **Kích hoạt ngay:** Tạo Task "Vệ sinh xuất viện" cho phân hệ Môi trường. |

### **2.2. Nhập kết quả Xét nghiệm và Vi sinh**

Dành cho bộ phận Giám sát nhập liệu từ phiếu trả kết quả của LIS.

| Method | Endpoint | Nghiệp vụ nhập tay | Logic xử lý tự động (Internal Trigger) |
| ----- | ----- | ----- | ----- |
| `POST` | `/api/v1/proxy/lab-results` | Nhập kết quả cấy vi sinh | Nếu là vi khuẩn thuộc danh mục MDRO $\\rightarrow$ Bắn thông báo Red Flag cho khoa lâm sàng. |
| `POST` | `/api/v1/proxy/antibiogram` | Nhập kết quả kháng sinh đồ | Cập nhật dữ liệu cho biểu đồ Dashboard Vi sinh. |

## **3\. NHÓM API VẬN HÀNH NỘI BỘ (INTERNAL MODULES)**

### **3.1. Phân hệ CSSD (Dụng cụ & Mẻ hấp)**

Xử lý logic rẽ nhánh tiệt khuẩn chịu nhiệt/không chịu nhiệt.

* **Tách dụng cụ lẻ ra mẻ riêng:** `POST /api/v1/cssd/items/split-for-sterilization`  
  * *Payload:* `{ "item_id": "UUID", "target_method": "PLASMA", "reason": "Non-heat resistant" }`  
* **Xác nhận kết quả mẻ hấp:** `PUT /api/v1/cssd/batches/{batch_id}/verify`  
  * Nếu kết quả Test sinh học \= FAIL $\\rightarrow$ Hệ thống tự động chuyển trạng thái của TẤT CẢ bộ dụng cụ trong mẻ đó về `RECALL` (Thu hồi khẩn cấp).

### **3.2. Phân hệ Chất thải và Đồ vải**

* **Cân rác/đồ vải:** `POST /api/v1/waste/weighing`  
  * Hỗ trợ nhập tay trọng lượng (kg). Tự động kiểm tra: Nếu loại rác \= "Lây nhiễm" và thời gian lưu kho hiện tại \> 48h $\\rightarrow$ Gửi Alert cho Admin.

## **4\. LUỒNG XỬ LÝ LỖI VÀ ĐÍNH CHÍNH DỮ LIỆU (AMENDMENT WORKFLOW)**

Trong y tế, dữ liệu nhập sai không được "Xóa" mất tích mà phải "Đính chính" để giữ bằng chứng pháp lý.

### **4.1. Endpoint Đính chính (Correction API)**

Mọi bản ghi (Fact) đều hỗ trợ API đính chính:

* `PATCH /api/v1/corrections/{entity_type}/{record_id}`

*Payload:*  
{

  "reason\_id": "UUID\_SAI\_SO\_LIEU",

  "field\_name": "organism\_name",

  "old\_value": "E.coli",

  "new\_value": "K.pneumoniae",

  "approver\_id": "UUID\_TRUONG\_KHOA"

}

* 

### **4.2. Trạng thái bản ghi (Record Status)**

Hệ thống sử dụng các cờ trạng thái để kiểm soát:

* `VALID`: Dữ liệu chuẩn.  
* `AMENDED`: Dữ liệu đã bị đính chính (Sẽ hiển thị icon dấu sao \* trên UI).  
* `VOIDED`: Dữ liệu bị hủy bỏ hoàn toàn do nhập nhầm (Nhưng vẫn tồn tại trong Database để đối soát).

## **5\. QUY TẮC BẢO MẬT & TRUY VẾT (SECURITY & TRACEABILITY)**

1. **Xác thực người nhập:** Không có request nào được thực hiện nặc danh. Token JWT phải chứa thông tin thiết bị và định danh nhân viên.  
2. **Ràng buộc thời gian (Back-dating):** Cấm nhập liệu lùi ngày quá **72 giờ** (ví dụ: Thứ Hai không được nhập dữ liệu cho Thứ Ba tuần trước) trừ khi có quyền Admin cấp cao. Điều này để tránh việc "làm đẹp" số liệu sau khi có nhiễm khuẩn xảy ra.  
3. **Conflict Resolution (Xử lý xung đột):** Nếu nhân viên A đang sửa bộ dụng cụ, nhân viên B quét mã cùng lúc $\\rightarrow$ API trả về lỗi `409 Conflict` kèm thông tin nhân viên đang giữ khóa.

## **6\. DANH SÁCH MÃ LỖI ĐẶC THÙ (BUSINESS ERROR CODES)**

| Code | Ý nghĩa | Cách xử lý gợi ý cho UI |
| ----- | ----- | ----- |
| `ERR_HEAT_SENSITIVE` | Dụng cụ không chịu nhiệt | Thông báo màu đỏ, ngăn chặn việc xếp vào lò hấp Steam. |
| `ERR_DUPLICATE_PATIENT` | Mã BN đã tồn tại trong khoa | Yêu cầu kiểm tra lại mã PID trước khi nhập tiếp. |
| `ERR_EXPIRED_MATERIAL` | Hóa chất đã hết hạn sử dụng | Khóa tính năng xác nhận mẻ rửa/khử khuẩn liên quan. |
| `ERR_OVERDUE_TASK` | Task đã quá hạn hoàn thành | Yêu cầu nhập lý do trễ hạn trước khi bấm "Hoàn thành". |

# **HIẾN PHÁP DỰ ÁN: HỆ THỐNG QUẢN TRỊ KSNK TỔNG THỂ**

## **(PROJECT CONSTITUTION & AI GOVERNANCE CONTEXT)**

Tài liệu này là Nguồn sự thật duy nhất (Single Source of Truth). Mọi quyết định về Code, Database, và Logic nghiệp vụ của 10 phân hệ bắt buộc phải tuân thủ các điều khoản dưới đây.

## **CHƯƠNG I: QUY TẮC NGÔN NGỮ VÀ ĐỊNH DANH (UBIQUITOUS LANGUAGE)**

**Điều 1: Song ngữ bắt buộc**

* **Giao diện (UI):** Sử dụng Tiếng Việt chuyên ngành y tế chuẩn (theo Bộ Y tế/JCI).  
* **Mã nguồn (Code/DB):** Sử dụng 100% Tiếng Anh định danh (PascalCase cho Class, snake\_case cho Database).  
* *Lý do:* Tránh lỗi font, tối nghĩa khi bỏ dấu và sẵn sàng tích hợp quốc tế.

**Điều 2: Cấm sử dụng từ đồng nghĩa tự chế**

* Phải tra cứu file `tu_dien_nghiep_vu_ksnk.md` trước khi đặt tên biến.  
* Ví dụ: Không được dùng `Batch` hay `Lot`, phải dùng `SterilizationBatch` cho mẻ hấp.

## **CHƯƠNG II: KIẾN TRÚC HỆ THỐNG VÀ DỮ LIỆU (ARCHITECTURAL RULES)**

**Điều 3: Ranh giới phân hệ (Loose Coupling)**

* Hệ thống gồm 10 phân hệ độc lập. Một phân hệ không được phép query trực tiếp vào Database của phân hệ khác.  
* Giao tiếp giữa các phân hệ bắt buộc thông qua **Internal API**.

**Điều 4: Danh mục dùng chung (Shared Kernel)**

* Hai nguồn dùng chung tối thiểu (BV103): `dm_khoa_phong` và `ho_so_nhan_vien` (spec cũ: `dm_nhan_vien`).  
* Các phân hệ khác chỉ lưu FK tới các thực thể đã chốt, không nhân đôi tên hiển thị làm nguồn sự thật thứ hai.

**Điều 5: Quy tắc thiết kế Database vật lý**

* **`dm_*` + domain-registry:** Danh mục nghiệp vụ lõi. **Không** thêm `dict_*` mới — [`AGENTS.md`](../../../AGENTS.md) §3.  
* **Dữ liệu phát sinh:** `fact_*` hoặc tên bảng BV103 (`quy_trinh`, `nhat_ky_quet`, `cong_viec`, …) — đối chiếu [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md).  
* **`is_active` / soft delete** theo chuẩn repo; **`metadata` JSONB** khi bảng cần mở rộng linh hoạt (không bắt buộc mọi bảng).

## **CHƯƠNG III: CÁC "ĐIỀU KHOẢN CỨNG" VỀ NGHIỆP VỤ (CORE BUSINESS LOGIC)**

**Điều 6: Đặc lệ CSSD (Split Sterilization)**

* Dụng cụ trong một "Bộ" (Set) có DNA riêng lẻ. Nếu trong bộ có dụng cụ không chịu nhiệt, hệ thống **bắt buộc** phải rẽ nhánh mẻ hấp (Plasma/EO) và chỉ cho phép cả bộ thành trạng thái "Vô khuẩn" khi tất cả các mẻ con đều đạt.

**Điều 7: Giám sát Vệ sinh tay (Multi-subject)**

* Giao diện App phải hỗ trợ quan sát đồng thời **tối đa 3 đối tượng** trong 1 phiên (Session). Không được bắt người dùng kết thúc đối tượng này mới cho nhập đối tượng kia.

**Điều 8: Quản lý Công việc (Task Flow)**

* Mọi sự cố (Lỗi dụng cụ, Rác tồn kho \>48h, Bệnh nhân xuất viện) đều phải tự động sinh bản ghi **công việc** điều phối nhân sự (**BV103:** bảng `cong_viec`; spec cũ: `fact_tasks`).

## **CHƯƠNG IV: QUY TẮC PHỐI HỢP VỚI AI (AI PROMPTING GUIDELINES)**

*Dành cho người dùng khi sử dụng Cursor/Gemini để sinh code.*

**Điều 9: Cung cấp ngữ cảnh trước khi yêu cầu**

* Trước khi yêu cầu AI viết code cho một module mới, hãy luôn nạp 3 file:  
  1. [`09-project-constitution-ai-governance.md`](../working/09-project-constitution-ai-governance.md) (Hiến pháp — bản tách; monolith này là bản lưu trữ).  
  2. `tu_dien_nghiep_vu_ksnk.md`.  
  3. `thiet_ke_erd_ksnk.md`.

**Điều 10: Yêu cầu AI kiểm tra chéo (Cross-check)**

* Mọi đoạn code AI sinh ra, hãy ra lệnh: *"Hãy đối chiếu đoạn code này với Điều 6 của Hiến pháp dự án xem có vi phạm logic rẽ nhánh CSSD không?"*.

## **CHƯƠNG V: BẢO MẬT VÀ TOÀN VẸN (SECURITY & AUDIT)**

**Điều 11: Nhật ký kiểm toán (Audit Trail)**

* Tuyệt đối cấm lệnh xóa vật lý bản ghi. Mọi thay đổi dữ liệu phải qua API Đính chính (`Correction API`) để lưu lại giá trị cũ và lý do sửa.

**Điều 12: Offline-First**

* Các module Vận hành (Quét rác, CSSD, VST) phải ưu tiên xử lý dữ liệu tại Local trước, đồng bộ sau. Backend phải xử lý được xung đột dữ liệu dựa trên Timestamp thực tế của thiết bị.

