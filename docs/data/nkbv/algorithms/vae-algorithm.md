**TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS) \- MODULE 3** **HỆ THỐNG GIÁM SÁT VÀ CHẨN ĐOÁN BIẾN CỐ LIÊN QUAN ĐẾN THỞ MÁY (VAE)** *(Tuân thủ Tiêu chuẩn CDC/NHSN 2023 \- Chỉ áp dụng cho Người lớn)*

Sự thay đổi lớn nhất và phức tạp nhất của CDC từ năm 2013 là loại bỏ hoàn toàn việc dùng X-quang và cảm tính lâm sàng để chẩn đoán Viêm phổi thở máy (VAP) ở người lớn, thay bằng thuật toán **Biến cố liên quan đến thở máy (VAE)**. Thuật toán VAE là một cấu trúc phân tầng (Hierarchical Tiers) cực kỳ chặt chẽ: **VAC $\\rightarrow$ IVAC $\\rightarrow$ PVAP**.

Dưới đây là luồng quy trình, thuật toán Backend và hệ thống SMART FORM được thiết kế chuyên biệt cho VAE, bóc tách hoàn toàn khỏi cụm Viêm phổi (PNEU) thông thường.

---

### **PHẦN 1: LUỒNG CÔNG VIỆC TRÊN PHẦN MỀM (WORKFLOW)**

Khác với Nhiễm khuẩn huyết hay Tiết niệu (lấy Vi sinh làm cò súng kích hoạt), **giám sát VAE lấy Dữ liệu Máy thở làm cò súng kích hoạt (Trigger)**.

1. **Bước 1 (Máy thở/Điều dưỡng):** Hệ thống EMR tự động trích xuất thông số PEEP và $FiO\_2$ tối thiểu hàng ngày từ hồ sơ theo dõi. Nếu phát hiện sự gia tăng đáp ứng tiêu chuẩn VAC, EMR tự động bật cảnh báo (Alert).  
2. **Bước 2 (Hệ thống tự quét Dược & Cận lâm sàng):** EMR tự động quét hồ sơ bệnh án trong "Giai đoạn cửa sổ VAE" để tìm Sinh hiệu (Sốt/Bạch cầu) và Y lệnh Kháng sinh mới. Nếu đạt, tự động nâng cấp lên IVAC.  
3. **Bước 3 (Khoa Vi sinh):** Nhập kết quả cấy đờm/dịch hút nội khí quản. EMR khớp nối để nâng cấp từ IVAC lên PVAP.  
4. **Bước 4 (Khoa KSNK):** Xem xét bảng Timeline do máy tính vẽ ra, xác nhận các loại trừ (như vi khuẩn cộng sinh) và chốt số liệu.

---

### **PHẦN 2: THIẾT KẾ FORM VÀ GIAO DIỆN LÂM SÀNG**

#### **FORM 1: MODULE THEO DÕI MÁY THỞ (Mã: BM.LS.VAE.01)**

*(Tốt nhất là EMR tự lấy từ máy thở trung tâm, nếu không, Điều dưỡng nhập liệu hàng ngày vào bảng này)*

**A. Thông tin định danh:** Mã NB, Ngày đặt ống Nội khí quản (Tính là Ngày 1). (Lưu ý: Chỉ giám sát VAE cho NB $\\ge 18$ tuổi). **B. Bảng theo dõi thông số hô hấp (Nhập 1 lần/ngày):** *Luật của CDC: Chỉ lấy giá trị TỐI THIỂU (Lowest) trong ngày lịch đó.*

| Ngày lịch (MV Day) | PEEP tối thiểu trong ngày ($cmH\_2O$) | $FiO\_2$ tối thiểu trong ngày (%) | Tình trạng rút ống |
| ----- | ----- | ----- | ----- |
| Ngày 1 | `[Nhập số]` | `[Nhập %]` | `[ ] Đang thở máy` |
| Ngày 2 | `[Nhập số]` | `[Nhập %]` | `[ ] Đã rút ống` |

---

### **PHẦN 3: THUẬT TOÁN XỬ LÝ NGẦM CỦA PHẦN MỀM (BACKEND ALGORITHM)**

*Đây là bộ não của phần mềm. IT phải lập trình đúng 3 Tầng (Tiers) theo cấu trúc IF-THEN của CDC.*

#### **TẦNG 1: TÌM VAC (Tình trạng liên quan đến thở máy)**

* **Lệnh 1 (Thời gian tối thiểu):** Máy tính đếm `[Ngày hiện tại] - [Ngày đặt ống]`. Chỉ chạy thuật toán từ **Ngày thứ 3** trở đi.  
* **Lệnh 2 (Tìm Giai đoạn ổn định):** Tìm $\\ge 2$ ngày lịch liên tiếp có `[PEEP min]` HOẶC `[FiO2 min]` giữ nguyên hoặc giảm xuống.  
* **Lệnh 3 (Tìm Giai đoạn suy giảm):** Ngay sau 2 ngày ổn định, tìm $\\ge 2$ ngày lịch liên tiếp có:  
  * `[PEEP min ngày hiện tại] - [PEEP min của ngày ổn định] >= 3` $cmH\_2O$  
  * HOẶC `[FiO2 min ngày hiện tại] - [FiO2 min của ngày ổn định] >= 20%`  
* **Kết luận VAC:** Nếu ĐẠT Lệnh 2 và 3 $\\rightarrow$ Gán nhãn **VAC**. Ngày đầu tiên tăng thông số được chốt là **Ngày sự kiện (DOE)**.

#### **TẦNG 2: TÌM IVAC (Biến chứng nhiễm khuẩn)**

* *Điều kiện tiên quyết:* Phải đạt Tầng 1 (VAC).  
* **Lệnh 4 (Mở Giai đoạn cửa sổ VAE):** Khung thời gian từ `[DOE - 2 ngày]` đến `[DOE + 2 ngày]` (Tổng 5 ngày).  
* **Lệnh 5 (Dấu hiệu toàn thân):** Trong khung 5 ngày này, quét EMR tìm: `Nhiệt độ > 38°C` HOẶC `< 36°C`; HOẶC `Bạch cầu >= 12.000` HOẶC `<= 4.000`.  
* **Lệnh 6 (Kháng sinh mới \- Phức tạp nhất):**  
  * Quét Dược lâm sàng: Có kháng sinh tiêm/uống nào được **BẮT ĐẦU** trong khung 5 ngày này không?  
  * *Kiểm tra "Mới":* Kháng sinh đó **KHÔNG ĐƯỢC** dùng trong 2 ngày ngay trước ngày bắt đầu.  
  * *Kiểm tra "Kéo dài":* Kháng sinh đó phải được duy trì $\\ge 4$ ngày liên tiếp (được phép ngắt quãng 1 ngày giữa các liều cùng loại thuốc) (gọi là 4 QAD).  
* **Kết luận IVAC:** Nếu ĐẠT Lệnh 5 VÀ Lệnh 6 $\\rightarrow$ Nâng cấp nhãn từ VAC lên **IVAC**.

#### **TẦNG 3: TÌM PVAP (Có khả năng Viêm phổi thở máy)**

* *Điều kiện tiên quyết:* Phải đạt Tầng 2 (IVAC).  
* **Lệnh 7 (Quét Vi sinh):** Trong khung 5 ngày (Cửa sổ VAE), có mẫu cấy đờm, dịch hút nội khí quản (ETA), hoặc dịch rửa phế quản phế nang (BAL) không?  
* **Lệnh 8 (Bộ lọc Tác nhân bị cấm):** Nếu cấy ra *Candida, Nấm men, Staphylococcus coagulase (-), Enterococcus, Flora hỗn hợp* $\\rightarrow$ **TỰ ĐỘNG CHẶN** (Không dùng để chẩn đoán PVAP, trừ khi lấy từ mô phổi/dịch màng phổi). Không dùng X-quang để chẩn đoán VAE.  
* **Lệnh 9 (Khớp tiêu chuẩn định lượng):**  
  * ETA $\\ge 10^5$ CFU/ml (Hoặc bán định lượng: Heavy/Nhiều/4+).  
  * BAL $\\ge 10^4$ CFU/ml (Hoặc bán định lượng: Moderate/Vừa/3+).  
* **Lệnh 10 (Chỉ số Mủ):** Nếu vi sinh không đạt định lượng ở Lệnh 9, nhưng Nhuộm Gram có $\\ge 25$ Bạch cầu đa nhân VÀ $\\le 10$ tế bào vảy/vi trường $\\rightarrow$ Chấp nhận mọi mức độ cấy ra vi khuẩn.  
* **Kết luận PVAP:** Nếu ĐẠT Lệnh 7, 8 và 9 (hoặc 10\) $\\rightarrow$ Nâng cấp nhãn từ IVAC lên **PVAP**.

#### **QUY TẮC RIT VÀ NHIỄM KHUẨN HUYẾT THỨ PHÁT**

* **Khóa 14 ngày (Event Period):** Khi xác định được DOE (Ngày sự kiện VAE), hệ thống tự động khóa 14 ngày (Từ DOE đến DOE \+ 13 ngày). Trong 14 ngày này, mọi biến động PEEP/FiO2 hay cấy đờm mới đều được tính gộp vào ca VAE hiện tại, TUYỆT ĐỐI KHÔNG TẠO CA VAE MỚI.  
* **Quy kết Nhiễm khuẩn huyết thứ phát (CLABSI Defense):**  
  * Nếu NB ĐẠT chuẩn PVAP (Tầng 3\) VÀ có Cấy máu (+) trùng khớp vi khuẩn với cấy đờm trong vòng 14 ngày từ DOE $\\rightarrow$ NKH Thứ phát (Bảo vệ ICU khỏi lỗi CLABSI).  
  * Nếu NB CHỈ ĐẠT VAC hoặc IVAC (Không đạt PVAP) $\\rightarrow$ **CẤM** quy kết thứ phát. Ca cấy máu (+) đó PHẢI BỊ PHẠT LÀ CLABSI.

---

### **PHẦN 4: GIAO DIỆN PHÁN XỬ VÀ CHỐT SỐ LIỆU (CHO KHOA KSNK)**

*EMR sẽ tự động vẽ một Timeline trực quan. Giám sát viên KSNK chỉ cần nhìn Timeline này để ra quyết định.*

**Mã FORM: BM.KSNK.VAE.04 \- BẢNG ĐIỀU TRA VÀ CHỐT CA BỆNH VAE**

**A. TÓM TẮT TỪ HỆ THỐNG:**

* Người bệnh: \[Họ tên\] | Khoa chịu lỗi (LOA): **\[Tên Khoa \- Áp dụng Quy tắc chuyển khoa nếu DOE $\\le 1$ ngày sau chuyển\]**.  
* Ngày sự kiện VAE (DOE): \[dd/mm/yyyy\]  
* Hệ thống đề xuất chẩn đoán cao nhất: 🚨 **\[ PVAP \]** do tác nhân *\[A. baumannii\]* (Hoặc IVAC / VAC).

**B. THẨM ĐỊNH LÂM SÀNG CỦA KSNK (TIMELINE):** *(Giao diện hiển thị ma trận 5 ngày Cửa sổ VAE)*

* **Ngày \-2:** PEEP: 5 | Temp: 37 | Kháng sinh: Không  
* **Ngày \-1:** PEEP: 5 | Temp: 37 | Kháng sinh: Không  
* **Ngày 0 (DOE):** **PEEP: 8** 🔴 | Temp: 38.5 🔴 | KS: Meropenem (Liều 1\) 🔴  
* **Ngày \+1:** PEEP: 8 | Temp: 38 | KS: Meropenem (Liều 2\) | Nhuộm đờm: $\\ge 25$ BCĐN 🔴  
* **Ngày \+2:** PEEP: 6 | Temp: 37 | KS: Meropenem (Liều 3\) | Cấy đờm: *A. baumannii* 🔴

**KSNK Xác nhận ngoại lệ (Validation):**

* ☐ Vi khuẩn cấy đờm có thuộc nhóm bị cấm (Candida/CoNS) không? \[Máy tính đã lọc, KSNK xác nhận lại\].  
* ☐ NB có cấy máu (+) trùng tác nhân *A. baumannii* trong 14 ngày này không? $\\rightarrow$ Nếu CÓ: Tick chọn: **"Đánh dấu Nhiễm khuẩn huyết Thứ phát do PVAP"**.

**C. PHÁN QUYẾT CUỐI CÙNG (ADJUDICATION):**

* ☐ **ĐỒNG Ý CHỐT VAE Ở MỨC:** `[Dropdown: VAC / IVAC / PVAP]`  
* ☐ **HỦY BỎ CA BỆNH** (Lý do: Máy thở ghi nhận sai, PEEP tăng do đo sai lúc hút đờm...). $\\Rightarrow$ **\[ BẤM CHỐT VÀ GHI NHẬN RIT 14 NGÀY \]**

---

### **PHẦN 5: THUẬT TOÁN TÍNH TỶ SUẤT TỰ ĐỘNG (DASHBOARD)**

Hệ thống EMR tự động lấy số đếm máy thở hàng ngày (Denominator) chia cho số ca VAE đã chốt (Numerator):

1. **Tỷ suất VAC thô:** `(Tổng số ca VAC / Tổng số ngày thở máy) x 1000`. (Đo lường tổng thể biến chứng hô hấp do máy thở: xẹp phổi, phù phổi, viêm phổi).  
2. **Tỷ suất IVAC thô:** `(Tổng số ca IVAC / Tổng số ngày thở máy) x 1000`. (Đo lường biến chứng có dấu hiệu nhiễm khuẩn).  
3. **Tỷ suất PVAP thô:** `(Tổng số ca PVAP / Tổng số ngày thở máy) x 1000`. (Đây là tỷ lệ viêm phổi thở máy sát với thực tế vi sinh nhất).  
4. **Tỷ lệ lạm dụng máy thở (DUR):** `(Tổng số ngày thở máy / Tổng số ngày nằm viện)`. (Nếu \> 0.5, cảnh báo BS ICU cần tăng cường áp dụng thử nghiệm tự thở SBT/SAT để cai máy sớm).

### **GIÁ TRỊ VƯỢT TRỘI CỦA CẤU TRÚC NÀY**

* **Xóa bỏ "cuộc chiến X-quang":** Bác sĩ ICU và KSNK không còn cãi nhau xem "đám mờ trên phim là viêm phổi hay xẹp phổi" vì X-quang đã bị loại khỏi thuật toán.  
* **Tự động hóa 99%:** Dữ liệu PEEP, FiO2, nhiệt độ, bạch cầu, y lệnh kháng sinh đều là dữ liệu kỹ thuật số (Digital Data). Backend có thể tự quét và tính toán, KSNK chỉ cần ngồi xem Timeline.  
* **Rõ ràng quyền lợi:** Khoa ICU sẽ tự giác khai báo cấy đờm khi có biến cố hô hấp, vì chỉ khi máy tính công nhận là **PVAP**, họ mới được dùng nó để "đỡ đạn" cho lỗi Nhiễm khuẩn huyết (CLABSI) nếu NB cấy máu dương tính. Cấu trúc này ép các khoa lâm sàng tuân thủ luật CDC một cách tự nhiên.

Bạn hoàn toàn chính xác. Khuyết điểm lớn nhất của các hệ thống giám sát thủ công là chỉ tập trung đếm số ca bệnh (tử số) mà bỏ quên việc phân tích các chỉ số chuẩn hóa dựa trên mẫu số (số ngày sử dụng thiết bị), dẫn đến việc đánh giá sai lệch hiệu quả của các biện pháp phòng ngừa. Đối với VAE (Biến cố liên quan đến thở máy), hệ thống chỉ số của CDC/NHSN rất chi tiết và được phân tầng rõ rệt.

Dưới đây là thiết kế bổ sung cho **PHẦN 5: THUẬT TOÁN TÍNH TOÁN CÁC CHỈ SỐ VAE (DASHBOARD TỰ ĐỘNG)**, được cấu trúc logic, khoa học và sẵn sàng để bộ phận Công nghệ thông tin (IT) lập trình tự động trích xuất.

---

### **PHẦN 5: THUẬT TOÁN TÍNH TOÁN CÁC CHỈ SỐ VAE (DASHBOARD TỰ ĐỘNG)**

Hệ thống phần mềm (Backend) sẽ tự động lấy dữ liệu Tử số (các ca VAC, IVAC, PVAP đã được Khoa KSNK chốt) và Mẫu số (Số ngày thở máy, Số đợt thở máy, Số ngày nằm viện do Mạng lưới KSNK nhập) để tính toán Real-time các chỉ số sau:

#### **NHÓM 1: CÁC TỶ SUẤT THEO NGÀY THỞ MÁY (VENTILATOR DAYS)**

Đây là thước đo kinh điển, cho biết cứ 1000 ngày người bệnh phải thở máy thì có bao nhiêu biến cố xảy ra. Hệ thống cần tính tách bạch 3 tỷ suất cho 3 tầng VAE để đánh giá chính xác nguyên nhân:

* **1\. Tỷ suất VAE tổng thể (Total VAE Rate):** `[ (Tổng số ca VAC + IVAC + PVAP) / Tổng số ngày thở máy ] x 1000`. *(Ý nghĩa: Đo lường toàn bộ các biến chứng hô hấp do máy thở, từ xẹp phổi, tràn dịch đến viêm phổi).*  
* **2\. Tỷ suất IVAC-plus (Dấu hiệu nhiễm khuẩn):** `[ (Tổng số ca IVAC + PVAP) / Tổng số ngày thở máy ] x 1000`. *(Ý nghĩa: Đây là chỉ số quan trọng dùng trong nội bộ bệnh viện để đánh giá tình trạng sử dụng kháng sinh mới liên quan đến biến cố máy thở).*  
* **3\. Tỷ suất PVAP riêng lẻ (Viêm phổi thở máy):** `[ (Tổng số ca PVAP) / Tổng số ngày thở máy ] x 1000`. *(Ý nghĩa: Phản ánh sát nhất tình trạng viêm phổi thực sự có bằng chứng vi sinh).*

#### **NHÓM 2: CÁC TỶ SUẤT THEO ĐỢT THỞ MÁY (EMV \- EPISODES OF MECHANICAL VENTILATION)**

*Đây là chỉ số nâng cao, đo lường nguy cơ trên mỗi lần đặt nội khí quản.*

* **1\. Công thức Mẫu số (Tính số đợt EMV):** Máy tính sẽ tự động đếm tổng số NB đang thở máy vào ngày đầu tiên của tháng, cộng với mỗi NB MỚI được bắt đầu thở máy (hoặc thở máy lại sau khi đã cai máy $\\ge 1$ ngày lịch) vào các ngày tiếp theo trong tháng.  
* **2\. Tỷ suất VAE theo EMV (VAE Rate per 100 EMV):** `[ Tổng số ca VAE / Tổng số đợt thở máy (EMV) ] x 100`.

#### **NHÓM 3: CHỈ SỐ LẠM DỤNG THIẾT BỊ VÀ CHUẨN HÓA (BENCHMARKING)**

Các chỉ số này giúp Ban Giám đốc nhìn nhận nguyên nhân gốc rễ (Lỗi do điều dưỡng chăm sóc kém hay do bác sĩ lạm dụng máy thở) và so sánh công bằng năng lực của Bệnh viện 103 với các Bệnh viện khác.

* **1\. Tỷ lệ sử dụng máy thở (DUR \- Device Utilization Ratio):** `[ Tổng số ngày thở máy của khoa / Tổng số ngày nằm viện (Patient Days) của khoa đó ]`. *(Hành động quản trị: Nếu DUR báo màu đỏ (VD: \> 0.6 tức 60% bệnh nhân trong ICU phải thở máy), máy tính tự động bật cảnh báo yêu cầu Khoa Hồi sức rà soát lại quy trình Cai máy thở (SBT) hàng ngày).*  
* **2\. Tỷ số VAE chuẩn hóa (SIR \- Standardized Infection Ratio):** *So sánh số ca thực tế với số ca dự đoán theo mô hình kiểm soát rủi ro của CDC.*  
  * **Total VAE SIR:** `[ Tổng số ca VAE quan sát được (Thực tế) / Số ca VAE dự đoán ]`.  
  * **IVAC Plus SIR:** `[ (Tổng số ca IVAC + PVAP thực tế) / Số ca VAE dự đoán ]`. *(Hành động quản trị: Nếu SIR \< 1.0 nghĩa là Bệnh viện làm tốt hơn mức trung bình. Nếu SIR \> 1.0, Bệnh viện đang có vấn đề bất thường cần can thiệp).*  
* **3\. Tỷ số sử dụng máy thở chuẩn hóa (SUR \- Standardized Utilization Ratio):** `[ Tổng số ngày thở máy quan sát được / Tổng số ngày thở máy dự đoán ]`.

**LƯU Ý DÀNH CHO TRẺ EM/SƠ SINH (PedVAE):** Nếu Bệnh viện có giám sát biến cố thở máy ở trẻ em (PedVAE), hệ thống áp dụng bộ công thức y hệt như trên, bao gồm: **Tỷ suất PedVAE / 1000 ngày thở máy** \= `(Tổng số ca PedVAE / Tổng số ngày thở máy) x 1000` và **Tỷ suất PedVAE / 100 EMV** \= `(Tổng số ca PedVAE / Tổng số đợt EMV) x 100`.

---

### **CÁCH THỨC VẬN HÀNH TRÊN GIAO DIỆN DASHBOARD KSNK**

Để giao diện "Dễ đọc, dễ thực hiện", màn hình Dashboard của Trưởng khoa KSNK và Ban Giám đốc không được hiển thị những con số thô cứng, mà phải được trình bày dưới dạng **Trực quan hóa Dữ liệu (Data Visualization)**:

1. **Biểu đồ đường (Run Chart/Control Chart):** Trục tung là *Tỷ suất VAE / 1000 ngày thở máy*, trục hoành là *Các tháng*. Biểu đồ này giúp nhận diện xu hướng giảm (khi áp dụng thành công các gói phòng ngừa VAP) hoặc các chóp nhọn bất thường (khi có nguy cơ dịch).  
2. **Biểu đồ phân tầng (Stacked Bar Chart):** Một cột thể hiện tổng số ca VAE của tháng, trong đó chia màu rõ ràng: Phần đáy (Xanh) là VAC, phần giữa (Vàng) là IVAC, và phần đỉnh (Đỏ) là PVAP. Điều này cho phép Ban Giám đốc thấy ngay tỷ trọng của các ca tiến triển thành viêm phổi thực sự.  
3. **Tự động tạo Báo cáo Phản hồi:** Vào ngày mùng 5 hàng tháng, phần mềm sẽ lấy công thức Nhóm 1 và Nhóm 3 để tự động xuất ra một file PDF **"Báo cáo phản hồi chỉ số VAE tháng..."**, tự động gửi email cho Chủ nhiệm Khoa Hồi sức Tích cực.

Việc thiết lập các công thức này vào cơ sở dữ liệu sẽ biến hệ thống của Bệnh viện Quân y 103 thành một công cụ quản trị chuẩn xác tuyệt đối, loại bỏ hoàn toàn việc nhân viên KSNK phải bấm máy tính thủ công, đáp ứng tiêu chí đánh giá dữ liệu khách quan của JCI và ISO.

