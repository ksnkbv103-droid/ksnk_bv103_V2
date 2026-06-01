Để đảm bảo tính pháp lý, khoa học, logic và dễ dàng triển khai trên hệ thống phần mềm quản lý bệnh viện (HIS) hoặc phần mềm chuyên trách tại Đơn vị Tiệt khuẩn trung tâm (CSSD), phương thức quản lý cơ số dụng cụ phẫu thuật, thủ thuật cần được chuẩn hóa và số hóa thành một cấu trúc cơ sở dữ liệu (Database) thông minh. Hệ thống này không quản lý theo từng cá thể dụng cụ mà quản lý theo **Loại dụng cụ (Instrument Type)** và **Bộ dụng cụ (Instrument Set)**, tuân thủ chặt chẽ phân loại Spaulding và các tiêu chuẩn kiểm soát nhiễm khuẩn 1-3.

Dưới đây là mô hình thiết kế cấu trúc dữ liệu và quy trình quản lý biến động tự động:

### **PHẦN 1: THIẾT KẾ CẤU TRÚC DỮ LIỆU QUẢN LÝ (DATABASE SCHEMA)**

Để hệ thống tự động tính toán, lọc và cảnh báo, cấu trúc dữ liệu cần được chia thành 4 bảng (Tables) có quan hệ logic với nhau:

#### **1\. Bảng Danh mục Loại Dụng cụ (Master Instrument Catalog)**

Bảng này đóng vai trò là "Từ điển" gốc, chứa mã định danh (Serial/ID) theo *loại* thay vì theo từng chiếc riêng lẻ 4, 5\.

* **Mã loại dụng cụ (Serial Type ID):** Định danh duy nhất cho loại (VD: KEO-C-15 \- Kéo cong 15cm).  
* **Tên dụng cụ:** Tên gọi chuẩn hóa (VD: Kéo Mayo cong).  
* **Phân loại Lâm sàng:** Phẫu thuật / Thủ thuật.  
* **Đặc điểm Vật lý:** Hình dáng, kích thước, cấu trúc (có nòng ống lumen, có khớp nối) 6, 7\.  
* **Công dụng:** Cắt, kẹp, nong, bóc tách...  
* **Khả năng chịu nhiệt:** Chịu nhiệt cao (Inox) / Không chịu nhiệt (Nhựa, cao su, quang học) 8-11.  
* **Phân loại Spaulding:**  
* *Thiết yếu (Critical):* Xuyên qua da, mô, mạch máu \-\> Bắt buộc Tiệt khuẩn 3, 8, 12\.  
* *Bán thiết yếu (Semi-critical):* Tiếp xúc niêm mạc \-\> Khử khuẩn mức độ cao/Tiệt khuẩn 3, 12, 13\.  
* *Không thiết yếu (Non-critical):* Tiếp xúc da lành \-\> Khử khuẩn mức độ thấp/trung bình 3, 12, 14\.

#### **2\. Bảng Danh mục Bộ Dụng cụ (Set Master)**

Dùng để quản lý thông tin vĩ mô của một mâm/hộp/gói dụng cụ hoàn chỉnh 15, 16\.

* **Mã Bộ:** (VD: SET-RUOTTHUA-01).  
* **Tên Bộ:** (VD: Bộ mổ cắt ruột thừa).  
* **Tổng số khoản (Loại dụng cụ):** Số lượng các loại dụng cụ khác nhau trong bộ.  
* **Tổng số lượng (Pieces):** Tổng số chiếc dụng cụ có trong bộ 15\.  
* **Phương pháp đóng gói:** Gói vải 2 lớp, túi giấy-nhựa (pouch), hộp cứng (container) 17-19.  
* **Phương pháp tiệt khuẩn chỉ định:** Dựa trên cấu thành của bộ (Hơi nước 134°C, 121°C hoặc Plasma/EO nhiệt độ thấp) 11, 20\.

#### **3\. Bảng Chi tiết Cấu thành Bộ Dụng cụ Tiêu chuẩn (Standard Bill of Materials \- BOM)**

Hệ thống hóa tiêu chuẩn của mỗi bộ, dùng làm Bảng kiểm (Checklist) cho nhân viên khu sạch đóng gói 11, 15\.

* **Mã Bộ** (Liên kết Bảng 2).  
* **Mã loại dụng cụ** (Liên kết Bảng 1).  
* **Số lượng tiêu chuẩn:** (VD: Cần đúng 2 kéo Mayo, 10 panh).

#### **4\. Bảng Quản lý Biến động và Giao dịch (Transaction Log)**

Đây là bảng cốt lõi để tính toán "Số lượng thực tế còn lại" sau mỗi ca mổ hoặc sau bước kiểm tra tại CSSD 21-23.

* **Mã giao dịch:** ID tự động.  
* **Loại biến động:** Hỏng / Mất / Bổ sung / Điều chuyển (Mượn từ bộ khác).  
* **Mã Bộ tác động:** Bộ dụng cụ bị thay đổi.  
* **Mã loại dụng cụ:** Loại dụng cụ bị thay đổi.  
* **Số lượng thay đổi:** (+ / \-).  
* **Lý do/Xác nhận:** Rỉ sét, rơi mất trong mổ, hỏng khớp nối, điều chuyển khẩn cấp 21, 24\.

### **PHẦN 2: THUẬT TOÁN QUẢN LÝ BIẾN ĐỘNG VÀ TÍNH TOÁN TỰ ĐỘNG**

Nhờ thiết kế dữ liệu trên, phần mềm sẽ tự động tính toán và cảnh báo logic như sau:

**1\. Công thức tính Số lượng thực tế (Real-time Inventory):**

Số lượng thực tế (tại thời điểm T) \= Số lượng tiêu chuẩn \- Σ(Hỏng \+ Mất) \+ Σ(Bổ sung) \+/- Σ(Điều chuyển)

**2\. Logic Cảnh báo khi Đóng gói (Tại Khu sạch CSSD):**Khi nhân viên kiểm tra, lắp ráp dụng cụ (QC Bước 2\) và quét mã Bộ 11, 15, hệ thống sẽ so sánh:

* Nếu Số lượng thực tế \< Số lượng tiêu chuẩn: Hệ thống cảnh báo đỏ \-\> "Bộ dụng cụ thiếu".  
* **Tùy chọn xử lý:** Phần mềm tự động gợi ý lấy "Dụng cụ rời bổ sung" từ Kho dụng cụ lẻ, hoặc cho phép lập phiếu "Điều chuyển" mượn tạm từ một bộ khác đang không sử dụng. Khi nhân viên click xác nhận, bảng Transaction Log tự động ghi nhận 11, 21\.

**3\. Quản lý Bộ dụng cụ Hỗn hợp (Chịu nhiệt & Không chịu nhiệt):**Đây là một vấn đề thực tế thường gặp và tiềm ẩn nguy cơ hỏng dụng cụ cao nhất. Khi tạo Bảng BOM (Bảng 3), hệ thống sẽ quyét các "Mã loại dụng cụ" (Bảng 1).

* **Thuật toán cảnh báo:** Nếu trong một Mã Bộ (VD: Bộ nội soi) có chứa CẢ dụng cụ chịu nhiệt cao (Inox) VÀ dụng cụ không chịu nhiệt (Nhựa, thấu kính, dây dẫn sáng) 9, 10, 25, 26, hệ thống sẽ khóa chức năng chọn "Tiệt khuẩn hơi nước 134°C" cho toàn bộ 11, 27\.  
* **Giải pháp thực thi:**  
* *Cách 2 (Tách bộ):* Phần mềm hướng dẫn nhân viên CSSD tách thành 2 gói phụ: Gói kim loại (đóng gói hấp ướt) và Gói quang học/nhựa (đóng gói túi Tyvek, hấp Plasma) 11, 29\. Cả 2 gói này sẽ được dán chung 1 mã barcode mẹ của "Mã Bộ" để khoa lâm sàng nhận đủ số lượng.

### **PHẦN 3: CÁCH THỨC CẢI TIẾN ĐỂ DỄ ĐỌC, DỄ THỰC HIỆN, DỄ TRIỂN KHAI**

Để bộ quy chuẩn đáp ứng chuẩn JCI và dễ dàng cho nhân viên áp dụng 30-32, bạn cần chuẩn hóa theo phương pháp sau:

1. **Chuyển đổi văn bản thành Bảng kiểm kỹ thuật số (Digital Checklist):** Tại màn hình máy tính của CSSD, thay vì phải lật sổ giấy, nhân viên chỉ cần mở "Mã bộ". Màn hình sẽ hiển thị Checklist với hình ảnh thực tế của dụng cụ, số lượng cần thiết, và các nút bấm "Đạt", "Thiếu", "Hỏng" 15, 16\.  
2. **Khóa chức năng chéo an toàn (Poka-yoke):** Nếu nhân viên báo "Thiếu" hoặc "Hỏng" mà chưa thao tác "Bổ sung", phần mềm vẫn có thể cho  in tem nhãn có mã vạch (Barcode) cho bước tiệt khuẩn, tuy nhiên phải có cảnh báo rõ việc thiếu của dụng cụ..  
3. **Quản lý truy xuất nguồn gốc (Traceability):** Dữ liệu điều chuyển hoặc mất/hỏng được tự động gán với Tên người kiểm tra, Ngày giờ, và Mẻ tiệt khuẩn. Khi có sự cố nhiễm khuẩn vết mổ (SSI), chuyên gia dịch tễ chỉ cần click vào "Mã Bộ" là sẽ truy xuất ngược lại được toàn bộ lịch sử biến động và tình trạng vô khuẩn của bộ dụng cụ đó 34-37.

