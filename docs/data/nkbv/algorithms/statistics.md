Để đảm bảo bộ quy chuẩn giám sát nhiễm khuẩn bệnh viện (NKBV) đạt được tính pháp lý chặt chẽ, cập nhật khoa học theo chuẩn CDC/NHSN, và logic, dễ triển khai trên hệ thống phần mềm (EMR/LIS), hệ thống các con số và chỉ số thống kê cần được phân tầng rõ rệt. Việc nâng cấp từ đo lường "đếm số ca thô" sang đo lường "chuẩn hóa điều chỉnh rủi ro" là bắt buộc.

Dưới đây là tổng hợp toàn diện các chỉ số thống kê cốt lõi cần thiết trong hệ thống giám sát NKBV:

### **1\. NHÓM DỮ LIỆU ĐẦU VÀO CƠ BẢN (MẪU SỐ VÀ TỬ SỐ)**

Đây là các con số thô (Raw Data) bắt buộc phải thu thập chính xác để làm cơ sở cho mọi phép tính tỷ suất.

**Mẫu số (Denominator \- Quần thể nguy cơ):**

* **Số ngày nằm viện (Patient Days):** Tổng số bệnh nhân có mặt tại cơ sở y tế (hoặc khoa) vào cùng một thời điểm mỗi ngày trong tháng, được cộng dồn. Đây là mẫu số để tính tỷ suất nhiễm khuẩn chung và sử dụng thiết bị.  
* **Số ca nhập viện (Admissions):** Tổng số lượt bệnh nhân nhập viện trong tháng, dùng để tính các tỷ lệ hiện mắc (Prevalence) đối với vi khuẩn đa kháng hoặc C. difficile.  
* **Số ngày-thiết bị (Device Days):** Bao gồm Số ngày mang Catheter trung tâm (Central line days), Số ngày mang ống thông tiểu (Urinary catheter days), và Số ngày thở máy (Ventilator days). Dữ liệu này được đếm thủ công hàng ngày hoặc tự động trích xuất từ EMR.  
* **Số ca phẫu thuật (Operative Procedures):** Tổng số các ca phẫu thuật theo từng loại (ví dụ: mổ ruột thừa, mổ đẻ) trong tháng, dùng làm mẫu số cho nhiễm khuẩn vết mổ.  
* **Số ngày điều trị kháng sinh (Antimicrobial Days / Days of Therapy):** Tổng số ngày mà bệnh nhân được sử dụng bất kỳ lượng kháng sinh nào, dùng cho giám sát kháng sinh.

**Tử số (Numerator \- Sự kiện nhiễm khuẩn):**

* Tổng số ca CLABSI, CAUTI, VAE/VAP, và SSI đã được Khoa KSNK xác nhận và chốt dựa trên tiêu chuẩn chẩn đoán trong kỳ báo cáo.  
* Số lượng các sự kiện vi sinh (LabID Events) dương tính với vi khuẩn đa kháng (MDRO) hoặc *C. difficile*.

### **2\. NHÓM CÁC TỶ SUẤT VÀ TỶ LỆ CƠ BẢN (BASIC RATES & RATIOS)**

Các chỉ số này giúp phản ánh tình hình lây nhiễm và mức độ sử dụng thiết bị thực tế, phục vụ cho việc quản trị điều dưỡng và can thiệp lâm sàng.

* **Tỷ suất nhiễm khuẩn liên quan đến thiết bị (Device-associated Infection Rates):** Đo lường nguy cơ nhiễm khuẩn trên 1.000 ngày sử dụng thiết bị.  
  * *CLABSI Rate:* (Số ca CLABSI / Tổng số ngày mang CVC) x 1000\.  
  * *CAUTI Rate:* (Số ca CAUTI / Tổng số ngày mang ống thông tiểu) x 1000\.  
  * *VAP/VAE Rate:* (Số ca VAP hoặc VAE / Tổng số ngày thở máy) x 1000\.  
* **Tỷ lệ nhiễm khuẩn vết mổ (SSI Rate):** (Số ca SSI của một loại phẫu thuật cụ thể / Tổng số ca phẫu thuật của loại đó) x 100\. Chỉ số này loại trừ các quy trình đóng vết thương không nguyên phát (non-primary closure).  
* **Tỷ lệ sử dụng thiết bị (Device Utilization Ratio \- DUR):** Chỉ số quản trị cốt lõi giúp Ban Giám đốc kiểm soát việc lạm dụng thiết bị xâm lấn.  
  * *DUR:* (Số ngày sử dụng thiết bị / Tổng số ngày nằm viện). Có thể nhân với 100 để ra phần trăm (%). Nếu DUR cao kèm theo tỷ suất nhiễm khuẩn cao, lỗi thường do bác sĩ lạm dụng chỉ định thiết bị.

### **3\. NHÓM CHỈ SỐ CHUẨN HÓA VÀ ĐIỀU CHỈNH RỦI RO (STANDARDIZED METRICS)**

Đây là bước cải tiến bắt buộc để đạt chuẩn JCI, cho phép bệnh viện so sánh công bằng hiệu suất của mình với các mức cơ sở (baseline) quốc gia hoặc so sánh giữa các khoa có mức độ bệnh nặng nhẹ khác nhau.

* **Tỷ số nhiễm khuẩn chuẩn hóa (Standardized Infection Ratio \- SIR):**  
  * *Công thức:* Số ca nhiễm khuẩn thực tế quan sát được (Observed HAIs) / Số ca nhiễm khuẩn dự đoán (Predicted HAIs).  
  * *Ý nghĩa:* SIR được tính từ các mô hình hồi quy để điều chỉnh theo các yếu tố rủi ro của người bệnh hoặc cơ sở vật chất. SIR \> 1.0 nghĩa là có nhiều ca nhiễm khuẩn hơn dự đoán, phản ánh chất lượng KSNK có vấn đề.  
* **Tỷ số sử dụng thiết bị chuẩn hóa (Standardized Utilization Ratio \- SUR):**  
  * *Công thức:* Số ngày sử dụng thiết bị quan sát được / Số ngày sử dụng thiết bị dự đoán.  
* **Tỷ số sử dụng kháng sinh chuẩn hóa (Standardized Antimicrobial Administration Ratio \- SAAR):**  
  * *Công thức:* Số ngày dùng kháng sinh thực tế / Số ngày dùng kháng sinh dự đoán.  
* **Tỷ số nhiễm khuẩn chuẩn hóa theo mầm bệnh (Pathogen-specific SIR \- pSIR):** So sánh tỷ lệ nhiễm khuẩn do một mầm bệnh cụ thể (VD: MRSA) thực tế so với dự đoán.

### **4\. NHÓM CHỈ SỐ DỊCH TỄ HỌC VI KHUẨN ĐA KHÁNG (MDRO) VÀ C. DIFFICILE**

Giám sát vi khuẩn kháng thuốc cần sử dụng bộ công thức tách biệt để phân định giữa việc mang mầm bệnh từ cộng đồng (Prevalence) và lây nhiễm tại bệnh viện (Incidence).

* **Tỷ lệ hiện mắc lúc nhập viện (Admission Prevalence Rate):** (Số sự kiện LabID máu hoặc bệnh phẩm (+) trong vòng ≤ 3 ngày sau khi nhập viện / Số ca nhập viện) x 100\.  
* **Tỷ suất mới mắc do lây truyền tại bệnh viện (Incidence Density Rate):** (Số sự kiện LabID (+) \> 3 ngày sau nhập viện / Số ngày nằm viện) x 1.000. Đối với *C. difficile*, tỷ suất này thường được nhân với 10.000 (Số ca CDI bệnh viện / Số ngày nằm viện x 10.000).  
* **Tỷ lệ phần trăm có men kháng Carbapenem:** (Số lượng CRE sinh Carbapenemase / Tổng số CRE được xét nghiệm) x 100\.

### **5\. NHÓM CHỈ SỐ QUÁ TRÌNH (PROCESS MEASURES)**

Sự thành công của phòng ngừa nằm ở việc đo lường tuân thủ quy trình. Các dữ liệu này đóng vai trò là "chỉ số dẫn dắt" (leading indicators) để can thiệp trước khi tác hại xảy ra.

* **Tỷ lệ tuân thủ vệ sinh tay:** (Tổng số lần thực hiện vệ sinh tay đúng / Tổng số cơ hội bắt buộc phải vệ sinh tay) x 100\. (Dựa trên hướng dẫn giám sát 5 thời điểm của WHO).  
* **Tỷ lệ tuân thủ các gói can thiệp (Bundle Compliance):** Đo lường sự tuân thủ toàn bộ (all-or-none) các bước trong gói phòng ngừa CLABSI, CAUTI, VAP hoặc SSI.  
* **Tỷ lệ tiêm chủng của nhân viên y tế:** (Số nhân viên được tiêm cúm/viêm gan B / Tổng số nhân viên).

### **CÁCH THỨC CẢI TIẾN BỘ QUY CHUẨN ĐỂ ĐÁP ỨNG TIÊU CHUẨN QUẢN TRỊ**

Để dễ đọc, dễ thực hiện và triển khai, hệ thống phần mềm và bộ quy chuẩn cần được lập trình theo quy tắc tự động hóa:

1. **Thiết lập Dashboard Trực quan:** KSNK không đưa cho Ban Giám đốc bảng số thô mà phải sử dụng Biểu đồ đường (Run charts) cho các tỷ suất nhiễm khuẩn/1000 ngày và Biểu đồ kiểm soát (Control charts) kèm đường Giới hạn chuẩn (Standard Deviation) để tự động cảnh báo khi vượt ngưỡng.  
2. **Loại bỏ tính toán thủ công:** Tích hợp bộ công thức tỷ suất mật độ mới mắc (Incidence Density) và Tỷ số chuẩn hóa (SIR/SUR) thẳng vào hệ thống HIS/EMR của bệnh viện. Máy tính tự động chia tử số cho mẫu số và nhân hệ số, Điều dưỡng và KSNK chỉ thực hiện nhập liệu ở đầu vào.  
3. **Phân tích phân tầng (Stratification):** Các tỷ lệ cần được phân tầng theo loại đơn vị (ICU y khoa, ICU phẫu thuật, phòng bệnh thường) và loại thiết bị để đảm bảo phản ánh chính xác rủi ro và trách nhiệm giải trình (Accountability).

