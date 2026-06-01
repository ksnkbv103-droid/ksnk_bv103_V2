Để đảm bảo tính pháp lý, khoa học và xây dựng một "văn hóa công bằng" (Just Culture) trong Bệnh viện, việc thiết lập các **Tiêu chuẩn loại trừ (Exclusion Criteria/Exceptions)** là bước quan trọng nhất trong hệ thống giám sát. Đây chính là "lá chắn pháp lý" giúp bảo vệ các khoa lâm sàng (đặc biệt là Hồi sức tích cực, Ung bướu, Ngoại khoa) khỏi việc bị quy kết oan các lỗi nhiễm khuẩn không thuộc trách nhiệm của họ, đồng thời đáp ứng tiêu chuẩn thẩm định dữ liệu khắt khe của JCI (QPS.03.01).

Dưới đây là bộ **Tiêu chuẩn loại trừ cốt lõi và Thuật toán chặn dữ liệu rác** cho cả 5 loại Nhiễm khuẩn bệnh viện (NKBV) theo chuẩn CDC/NHSN 2023, được thiết kế để lập trình thẳng vào phần mềm (Backend EMR):

---

### **1\. NHIỄM KHUẨN HUYẾT LIÊN QUAN ĐƯỜNG TRUYỀN (CLABSI)**

*Mục tiêu: Bảo vệ Khoa Hồi sức và Khoa Ung bướu khỏi các ca cấy máu dương tính do bệnh lý nền hoặc do ổ nhiễm khuẩn khác.*

* **Loại trừ 1: Nhiễm khuẩn huyết thứ phát (Secondary BSI):**  
  * **Luật:** Nếu người bệnh (NB) có cấy máu dương tính, NHƯNG vi khuẩn trong máu trùng khớp với vi khuẩn cấy được tại một ổ nhiễm khuẩn khác (như VAP, CAUTI, SSI) VÀ máu được lấy trong Khung thời gian quy kết (SBAP 14-17 ngày) của ổ nhiễm khuẩn đó.  
  * **Hành động hệ thống:** Tự động **LOẠI TRỪ** ca này khỏi danh sách CLABSI. Quy kết lỗi về cho VAP/CAUTI/SSI.  
* **Loại trừ 2: Tổn thương hàng rào niêm mạc (MBI-LCBI):**  
  * **Luật:** Áp dụng cho NB ung thư/huyết học có suy giảm miễn dịch nặng. Nếu NB có bạch cầu hạt (ANC) \< 500 tế bào/mm3 VÀ vi khuẩn trong máu thuộc nhóm vi khuẩn đường ruột (như *Candida*, *Enterococcus*, *Bacteroides*) do niêm mạc ruột tổn thương làm vi khuẩn tràn vào máu.  
  * **Hành động hệ thống:** Tự động gán nhãn MBI-LCBI. **LOẠI TRỪ** khỏi tỷ lệ phạt CLABSI của khoa.  
* **Loại trừ 3: Ngoại nhiễm (Contamination):**  
  * **Luật:** Nếu vi sinh trả kết quả là "Vi khuẩn cộng sinh ngoài da" (như *Coagulase-negative Staphylococci*, *Bacillus*, *Corynebacterium*) MÀ chỉ có 1 mẫu cấy máu dương tính (hoặc các mẫu lấy cách nhau quá xa).  
  * **Hành động hệ thống:** Tự động **HỦY** ca bệnh, không công nhận là nhiễm khuẩn huyết.

---

### **2\. NHIỄM KHUẨN TIẾT NIỆU (UTI / CAUTI)**

*Mục tiêu: Đập bỏ thói quen lạm dụng chẩn đoán CAUTI từ các mẫu nước tiểu tạp khuẩn hoặc nấm của bác sĩ lâm sàng.*

* **Loại trừ 1: CẤM SỬ DỤNG NẤM (Candida / Yeast):**  
  * **Luật:** Theo CDC, các loại Nấm men (*Yeast/Candida* spp.), nấm mốc, ký sinh trùng **TUYỆT ĐỐI BỊ LOẠI TRỪ** khỏi tất cả các tiêu chuẩn chẩn đoán NKTN (SUTI và ABUTI).  
  * **Hành động hệ thống:** Khi Khoa Vi sinh nhập kết quả *Candida* $\\ge 10^5$ CFU/ml, phần mềm tự động bật cờ đỏ và **BLOCK** (chặn) không cho phép bác sĩ chẩn đoán là CAUTI.  
* **Loại trừ 2: Tạp khuẩn (Mixed flora):**  
  * **Luật:** Mẫu cấy nước tiểu mọc từ 3 loại vi sinh vật trở lên (dù có đủ định lượng $\\ge 10^5$) bị coi là mẫu ngoại nhiễm (do lấy mẫu sai kỹ thuật).  
  * **Hành động hệ thống:** Tự động **LOẠI TRỪ** mẫu cấy này.  
* **Loại trừ 3: Vi khuẩn niệu không triệu chứng (ASB):**  
  * **Luật:** NB có cấy nước tiểu (+) nhưng KHÔNG có triệu chứng lâm sàng (sốt, đau trên xương mu...) lọt trong Giai đoạn cửa sổ (IWP 7 ngày), và KHÔNG có cấy máu (+) trùng khớp.  
  * **Hành động hệ thống:** Tự động gán nhãn ASB. **LOẠI TRỪ** khỏi danh sách NKBV.

---

### **3\. BIẾN CỐ LIÊN QUAN ĐẾN THỞ MÁY (VAE \- DÀNH CHO NGƯỜI LỚN)**

*Mục tiêu: Rạch ròi độ tuổi và loại trừ hoàn toàn sự cảm tính trong việc đọc phim X-quang.*

* **Loại trừ 1: Độ tuổi và chế độ thở máy:**  
  * **Luật:** Tiêu chuẩn VAE **LOẠI TRỪ** trẻ em và sơ sinh (khoa NICU/PICU có tiêu chuẩn PedVAE riêng). Bệnh nhân thở máy tần số cao (HFOV) hoặc đang chạy ECMO cũng bị loại trừ.  
* **Loại trừ 2: Hình ảnh học (X-quang):**  
  * **Luật:** X-quang phổi **TUYỆT ĐỐI BỊ LOẠI TRỪ** khỏi mọi thuật toán chẩn đoán VAC, IVAC, và PVAP của người lớn. Không dùng phim X-quang để chứng minh hay bác bỏ VAE.  
* **Loại trừ 3: Tác nhân vi sinh bị cấm (Bảo vệ PVAP):**  
  * **Luật:** Tương tự CAUTI, để chẩn đoán PVAP (Mức độ cao nhất của VAE), hệ thống **LOẠI TRỪ** các kết quả cấy đờm/ETA/BAL ra: *Candida* spp., *Coagulase-negative Staphylococci*, *Enterococcus* spp., hoặc "hệ vi khuẩn hô hấp bình thường" (trừ khi các tác nhân này được phân lập từ mô phổi/dịch màng phổi).

---

### **4\. VIÊM PHỔI BỆNH VIỆN / TRẺ EM (PNEU / HAP / PedVAP)**

*Mục tiêu: Tránh việc chẩn đoán nhầm suy tim ứ huyết thành viêm phổi bệnh viện.*

* **Loại trừ 1: Bệnh lý nền Tim/Phổi (Rào cản X-quang):**  
  * **Luật:** Nếu NB có bệnh lý tim/phổi nền (như suy tim, ARDS, COPD), hệ thống **LOẠI TRỪ** việc chẩn đoán PNEU nếu chỉ có 1 phim X-quang bất thường.  
  * **Hành động hệ thống:** Phần mềm quét ICD-10. Nếu có suy tim, phần mềm ép buộc bác sĩ phải nhập $\\ge 2$ phim X-quang liên tiếp chứng minh thâm nhiễm tiến triển/dai dẳng mới cho đi tiếp.  
* **Loại trừ 2: Rác vi sinh (Tương tự PVAP):**  
  * **Luật:** Các mẫu cấy đờm ra *Candida*, *Enterococcus*, Tụ cầu da **BỊ LOẠI TRỪ** khỏi tiêu chuẩn PNU2 (Viêm phổi do vi khuẩn). Các tác nhân này chỉ được chấp nhận ở tiêu chuẩn cực kỳ khắt khe PNU3 (dành riêng cho NB suy giảm miễn dịch nặng có nấm xâm lấn).

---

### **5\. NHIỄM KHUẨN VẾT MỔ (SSI)**

*Mục tiêu: Đảm bảo SSI tuân thủ đúng khung thời gian pháp lý và tiêu chuẩn quốc gia.*

* **Loại trừ 1: Bộ Tiêu chuẩn Loại trừ Phổ quát (Universal Exclusion Criteria của NHSN):**  
  * **Luật:** Bất kỳ quy trình phẫu thuật nào vi phạm các điều kiện đầu vào của NHSN (ví dụ: vết thương hở từ trước khi phẫu thuật, mổ lại trên nền nhiễm trùng cũ, hoặc vết mổ bị bỏ hở (Open) không đóng kín tại phòng mổ) sẽ bị **LOẠI TRỪ HOÀN TOÀN** khỏi việc tính toán tỷ số SIR (Standardized Infection Ratio).  
* **Loại trừ 2: Khung thời gian pháp lý (Thời hiệu):**  
  * **Luật:** SSI không dùng Giai đoạn cửa sổ (IWP) 7 ngày. SSI có thời hiệu giám sát cứng là 30 ngày (không implant) hoặc 90 ngày (có implant) kể từ ngày mổ (Ngày 1).  
  * **Hành động hệ thống:** Nếu Ngày sự kiện (DOE) xảy ra vào ngày thứ 31 (đối với mổ không cấy ghép) $\\rightarrow$ Hệ thống tự động **LOẠI TRỪ**, không tính là SSI cho cuộc mổ đó.  
* **Loại trừ 3: Bảo vệ lỗi Nhiễm khuẩn huyết (Ngoại lệ nghịch):**  
  * **Luật:** Nếu NB có cấy máu (+) trùng khớp với cấy vết mổ (+), ca cấy máu này bị **LOẠI TRỪ** khỏi rổ CLABSI của Hồi sức và bị quy kết ngược lại thành "Nhiễm khuẩn vết mổ có NKH thứ phát" cho Khoa Ngoại.

### **KẾT LUẬN ĐỂ IT LẬP TRÌNH:**

Việc đưa các **Tiêu chuẩn loại trừ** này vào hệ thống EMR chính là cách bạn biến phần mềm thành một "Quan tòa vô tư". Lập trình viên chỉ cần cài đặt các hàm `IF/THEN/BLOCK` (Ví dụ: `IF Tác_nhân == "Candida" AND Vị_trí == "Nước tiểu" THEN BLOCK chẩn đoán CAUTI`). Điều này sẽ giúp Bệnh viện Quân y 103 có một bộ dữ liệu sạch, minh bạch, bảo vệ quyền lợi chính đáng cho các khoa lâm sàng và hoàn toàn vượt qua các vòng kiểm toán (Audit) của JCI.

