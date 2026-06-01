Để đảm bảo tính pháp lý, khoa học, logic và sẵn sàng cho bộ phận Công nghệ thông tin (IT) thiết kế cơ sở dữ liệu (Database Schema) đáp ứng tiêu chuẩn quản lý thông tin của JCI (Chương MOI), toàn bộ dữ liệu cần thiết để triển khai phần mềm giám sát Nhiễm khuẩn bệnh viện (NKBV) được tổng hợp và phân nhóm chi tiết dưới đây.

Cấu trúc dữ liệu này được thiết kế theo tư duy "Dẫn dắt bởi sự kiện" (Event-Driven), giúp EMR/LIS tự động tính toán các khung thời gian theo chuẩn CDC/NHSN.

### **1\. NHÓM DỮ LIỆU HÀNH CHÍNH VÀ QUẢN LÝ LUỒNG NGƯỜI BỆNH (Patient Flow Data)**

*Nhóm dữ liệu này là bắt buộc để định danh, miễn trừ lỗi nhiễm khuẩn cộng đồng (POA) và quy kết đúng trách nhiệm cho khoa phòng (LOA).*

* **Mã định danh duy nhất (PID):** Bắt buộc, sử dụng xuyên suốt các lần nhập viện.  
* **Thông tin nhân khẩu học:** Họ tên, Ngày tháng năm sinh, Giới tính.  
* **Ngày nhập viện (Admission Date):** Cần thiết để phần mềm tự động tính mốc "Ngày 1", phân định POA (Nhiễm khuẩn lúc nhập viện) và HAI (Nhiễm khuẩn bệnh viện).  
* **Lịch sử chuyển khoa (Transfer Log):** Ngày/giờ nhập khoa hiện tại, Tên khoa trước đó, Ngày/giờ chuyển từ khoa trước đó. (Dữ liệu này để máy tính tự động chạy Quy tắc chuyển khoa \- LOA).  
* **Mã chẩn đoán bệnh nền (ICD-10):** Xác định tình trạng suy giảm miễn dịch (bạch cầu hạt \< 500\) hoặc bệnh nền tim/phổi để kích hoạt các tiêu chuẩn loại trừ (MBI-LCBI, PNEU).

### **2\. NHÓM DỮ LIỆU VI SINH VÀ CẬN LÂM SÀNG (Laboratory & Microbiology Data)**

*Đây là nhóm dữ liệu "Cò súng" (Trigger) để phần mềm tự động mở Giai đoạn cửa sổ (IWP).*

* **Ngày/Giờ lấy mẫu bệnh phẩm:** Bắt buộc sử dụng ngày lấy mẫu (không dùng ngày trả kết quả) để làm Ngày Mốc.  
* **Loại bệnh phẩm:** Máu, Nước tiểu, Đờm, Dịch rửa phế quản (BAL), Dịch hút nội khí quản (ETA), Dịch/mủ vết mổ.  
* **Tên tác nhân vi sinh phân lập được:** Máy tính cần danh mục từ điển vi sinh để tự động lọc:  
  * *Nhóm cấm/Loại trừ:* Nấm men (Candida spp.), Tụ cầu da (CoNS), Enterococcus (Máy tính tự động block đối với CAUTI và VAP).  
  * *Nhóm vi khuẩn cộng sinh:* Yêu cầu tự động đếm $\\ge 2$ mẫu máu dương tính.  
* **Định lượng vi khuẩn (CFU/ml):** Dữ liệu bắt buộc đối với CAUTI (phải $\\ge 10^5$) và PVAP ($\\ge 10^4$ hoặc $\\ge 10^5$).  
* **Chỉ số mủ (Nhuộm Gram):** Số lượng Bạch cầu đa nhân (\>25/vi trường) và Tế bào vảy (\<10/vi trường) đối với mẫu đờm.  
* **Chỉ số Bạch cầu máu (WBC & ANC):** Mức bạch cầu cao/thấp hoặc bạch cầu hạt trung tính (ANC \< 500 tế bào/mm3) trong IWP.

### **3\. NHÓM DỮ LIỆU THIẾT BỊ XÂM LẤN VÀ PHẪU THUẬT (Device & Procedure Data)**

*Dữ liệu để máy tính chạy thuật toán đếm "Ngày lịch" (Calendar Day), xác định NKBV có liên quan đến thiết bị hay không.*

* **Đường truyền trung tâm (CVC) / Ống thông tiểu (Foley):**  
  * Tình trạng hiện tại (Đang lưu / Đã rút).  
  * Ngày/Giờ đặt thiết bị.  
  * Ngày/Giờ rút thiết bị.  
* **Thông số Máy thở (Dành riêng cho VAE):**  
  * Ngày đặt ống nội khí quản (Ngày 1).  
  * Chỉ số PEEP tối thiểu hàng ngày ($cmH\_2O$).  
  * Chỉ số $FiO\_2$ tối thiểu hàng ngày (%).  
* **Dữ liệu Phẫu thuật (Dành riêng cho SSI):**  
  * Tên/Loại phẫu thuật (Theo danh mục NHSN).  
  * Ngày phẫu thuật (Mốc 0 để đếm 30 hoặc 90 ngày).  
  * Có đặt vật liệu cấy ghép (Implant) không? (Có/Không \- Quyết định khung giám sát 30 hay 90 ngày).

### **4\. NHÓM DỮ LIỆU LÂM SÀNG VÀ HÌNH ẢNH HỌC (Clinical & Imaging Data)**

*Dữ liệu này được giới hạn bắt buộc phải nhập lọt trong khung IWP 7 ngày.*

* **Dấu hiệu sinh tồn & Triệu chứng toàn thân:**  
  * Nhiệt độ (Sốt $\>38^\\circ C$ hoặc hạ thân nhiệt $\<36^\\circ C$).  
  * Huyết áp (Tụt HA).  
  * Ngày xuất hiện triệu chứng đầu tiên.  
* **Dấu hiệu tại chỗ:**  
  * Đau trên xương mu, tiểu buốt/rắt (CAUTI).  
  * Chảy mủ vết mổ, toác vết mổ (SSI).  
  * Đờm mủ mới, rale nổ ở phổi (PNEU).  
* **Hình ảnh học (X-quang / CT):**  
  * Ngày chụp phim.  
  * Kết luận: Có thâm nhiễm mới, đông đặc, hoặc tạo hang.

### **5\. NHÓM DỮ LIỆU DƯỢC LÂM SÀNG (Pharmacy Data)**

*Chủ yếu phục vụ chẩn đoán IVAC (Biến chứng nhiễm khuẩn do thở máy) và kiểm soát kháng sinh.*

* **Y lệnh kháng sinh mới:** Tên thuốc, ngày bắt đầu (phải lọt trong cửa sổ VAE).  
* **Điều kiện 4 QAD:** Kháng sinh có được duy trì liên tục $\\ge 4$ ngày không.

### **6\. NHÓM DỮ LIỆU MẪU SỐ ĐỂ TÍNH TỶ SUẤT (Denominator Data)**

*Đây là các dữ liệu được điều dưỡng/Mạng lưới KSNK tổng hợp vào một giờ cố định hàng ngày để tạo mẫu số tính toán.*

* **Tổng số ngày nằm viện (Patient Days):** Đếm gộp theo từng khoa.  
* **Số Ngày-Thiết bị (Device Days):** Số lượng NB đang lưu CVC, ống thông tiểu, hoặc đang thở máy tại thời điểm đếm.  
* **Số đợt thở máy (Episodes of Mechanical Ventilation \- EMV):** Đếm số lần đặt nội khí quản mới để tính tỷ suất VAE nâng cao.

### **7\. NHÓM DỮ LIỆU ĐẦU RA VÀ QUẢN TRỊ (System Output & Adjudication Data)**

*Dữ liệu do phần mềm tự động sinh ra và được KSNK khóa lại để phục vụ báo cáo JCI (QPS.03.01).*

* **Các mốc thời gian hệ thống tự chốt:** Ngày sự kiện (DOE), Khung thời gian lặp lại (RIT 14 ngày), Khung thời gian quy kết (SBAP 14-17 ngày).  
* **Phân loại chẩn đoán cuối cùng:** POA, HAI, CLABSI, MBI-LCBI, CAUTI, VAC, IVAC, PVAP, PNU1, PNU2, SSI Nông/Sâu/Khoang.  
* **Quy kết ngoại lệ:** Có/Không Nhiễm khuẩn huyết thứ phát (Secondary BSI).  
* **Khoa chịu trách nhiệm (LOA):** Tên khoa bị trừ KPI.

### **CÁCH THỨC TRIỂN KHAI CHO IT:**

Bộ phận IT sẽ cần cấu trúc Database thành 3 bảng (Tables) chính tương tác với nhau:

1. **Bảng Raw Data (Dữ liệu thô):** Kéo tự động qua API/HL7 từ LIS (Vi sinh), PACS (Chẩn đoán hình ảnh) và HIS (Hành chính, Sinh hiệu, Y lệnh thiết bị/Kháng sinh).  
2. **Bảng Trigger & Logic (Bộ lọc):** Nơi chứa các thuật toán Date-math (Phép trừ ngày) để tự động tính `[DOE] - [Ngày nhập viện]`, `[DOE] - [Ngày đặt thiết bị]`, và so sánh chuỗi trùng lặp trong RIT.  
3. **Bảng Dashboard (Phán xử & Báo cáo):** Nơi lưu lại vết kiểm toán (Audit Trail) khi KSNK bấm "Duyệt" (Approve) hoặc "Phủ quyết" (Override), đảm bảo tính xác thực dữ liệu đáp ứng tiêu chuẩn QPS.03.01 của JCI.

