**TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS) \- MODULE 4** **HỆ THỐNG GIÁM SÁT VÀ CHẨN ĐOÁN NHIỄM KHUẨN VẾT MỔ (SSI)** *(Thiết kế chuyên biệt cho Phần mềm KSNK độc lập \- Không kết nối HIS/LIS)*

**Nhận xét thẳng thắn về tính pháp lý và dịch tễ học của SSI:** Nhiễm khuẩn vết mổ (SSI) là một "ngoại lệ" hoàn toàn khác biệt so với tất cả các loại NKBV khác. Điểm mấu chốt để hệ thống phần mềm của bạn không bị tính toán sai lệch là: **SSI TUYỆT ĐỐI KHÔNG sử dụng Giai đoạn cửa sổ (IWP 7 ngày) hay Khung thời gian lặp lại (RIT 14 ngày)**. Thay vào đó, SSI bị chi phối bởi **Khung thời gian giám sát pháp lý (30 ngày hoặc 90 ngày)** tính từ ngày mổ.

Hơn nữa, vì phần mềm đang hoạt động độc lập (không tự động lấy dữ liệu từ HIS/LIS), cơ chế nhập liệu phải cực kỳ thông minh để chống lại sự "cảm tính" hoặc "tránh né" của phẫu thuật viên (PTV) \- những người thường ghi hồ sơ là "chậm liền vết thương" thay vì công nhận nhiễm khuẩn.

Dưới đây là thiết kế chuẩn mực, khoa học và dễ triển khai nhất để nâng cấp Bộ quy chuẩn Ver 1.0, đáp ứng tuyệt đối tiêu chuẩn JCI.

---

### **PHẦN 1: LUỒNG CÔNG VIỆC TRÊN PHẦN MỀM ĐỘC LẬP (WORKFLOW)**

Mô hình vận hành của SSI là **"Đa cò súng \- Đa điểm chạm" (Multi-Triggers)** vì hơn 50% ca SSI xảy ra sau khi người bệnh (NB) đã xuất viện:

1. **Cò súng 1 (Khoa Vi sinh):** KTV Vi sinh nhập kết quả cấy mủ/dịch vết thương/dịch dẫn lưu dương tính (+). Phần mềm phát cảnh báo cho Khoa Ngoại.  
2. **Cò súng 2 (Khoa Ngoại trú/Phòng khám):** Bác sĩ phòng khám ghi nhận NB quay lại khám vì sưng/đau vết mổ cũ. Bác sĩ nhập triệu chứng vào Form.  
3. **Cò súng 3 (Khoa Ngoại/Nội trú):** Điều dưỡng thay băng phát hiện vết mổ chảy mủ hoặc toác rộng. Điều dưỡng nhập Form.  
4. **Thuật toán Backend:** Nhận dữ liệu từ bất kỳ cò súng nào, máy tính sẽ làm phép trừ "Ngày sự kiện" với "Ngày phẫu thuật" để xét duyệt rào cản 30/90 ngày, sau đó phân loại độ sâu (Nông, Sâu, Cơ quan/Khoang).  
5. **Khoa KSNK:** Người phán xử cuối cùng (Adjudicator) thẩm định lại hồ sơ và chốt lỗi cho kíp mổ.

---

### **PHẦN 2: THIẾT KẾ FORM NHẬP LIỆU (UI/UX) CHO VI SINH VÀ LÂM SÀNG**

#### **FORM 1: MODULE NHẬP LIỆU KHOA VI SINH (Mã: BM.VS.SSI.01)**

*Do không có LIS, KTV Vi sinh là chốt chặn quan trọng để ghi nhận bằng chứng "thép".*

**A. Thông tin định danh:** Mã PID: `[Nhập text]` | Họ tên NB: `[Nhập text]` **B. Dữ liệu Vi sinh (Trigger):**

* **Ngày/Giờ lấy mẫu bệnh phẩm:** `[dd/mm/yyyy hh:mm]` *(Lưu ý: Đây chính là Ngày Mốc).*  
* **Vị trí lấy mẫu bệnh phẩm:**  
  * `[ ]` Dịch/mủ từ bề mặt da/mô dưới da (SSI Nông).  
  * `[ ]` Dịch/mủ từ lớp cân cơ/vết mổ sâu (SSI Sâu).  
  * `[ ]` Dịch từ ống dẫn lưu đặt trong ổ bụng/lồng ngực/khớp (SSI Cơ quan/Khoang).  
* **Tác nhân phân lập được:** `[Nhập tên vi khuẩn/nấm]`. $\\Rightarrow$ **\[ NÚT BẤM: GỬI CẢNH BÁO CHO KHOA NGOẠI VÀ KHOA KSNK \]**

---

#### **FORM 2: MODULE NHẬP LIỆU LÂM SÀNG / NGOẠI TRÚ (Mã: BM.LS.SSI.01)**

*Giao diện này dành cho Bác sĩ/Điều dưỡng khoa Ngoại hoặc Phòng khám ngoại trú. Form được thiết kế dạng check-box nhị phân để ép buộc tính khách quan.*

**A. Khai báo Lịch sử Phẫu thuật (Cơ sở pháp lý tính ngày):** *Hệ thống yêu cầu Bác sĩ/ĐD tra cứu hồ sơ và nhập liệu:*

* **Tên Phẫu thuật:** `[Dropdown danh mục phẫu thuật NHSN: VD: Mổ ruột thừa, Mổ thay khớp...]`  
* **Ngày phẫu thuật:** `[dd/mm/yyyy]` *(Backend gán là Ngày 1\)*.  
* **Có đặt vật liệu nhân tạo (Implant) không?** (VD: nẹp vít, van tim nhân tạo, lưới thoát vị).  
  * `[ ] Có` $\\rightarrow$ *Máy tính tự động mở khung giám sát 90 ngày*.  
  * `[ ] Không` $\\rightarrow$ *Máy tính tự động mở khung giám sát 30 ngày*.

**B. Khai báo Dấu hiệu Lâm sàng (Xác định Ngày sự kiện \- DOE):** *Ngày xuất hiện dấu hiệu đầu tiên:* `[Nhập ngày: dd/mm/yyyy]` *NB có biểu hiện nào dưới đây? (Có thể chọn nhiều ô, phân chia rõ theo độ sâu)*

* **Tại lớp Da và Mô dưới da (Nông):**  
  * `[ ]` Chảy mủ từ vết rạch nông.  
  * `[ ]` Vết mổ nông bị PTV chủ động mở VÀ có ít nhất 1 dấu hiệu: Sưng / Nóng / Đỏ / Đau.  
  * `[ ]` Bác sĩ ghi nhận hồ sơ chẩn đoán là Nhiễm khuẩn vết mổ nông.  
* **Tại lớp Cân / Cơ (Sâu):**  
  * `[ ]` Chảy mủ từ vết mổ sâu.  
  * `[ ]` Vết mổ sâu tự toác rách, HOẶC PTV chủ động mở VÀ NB có: Sốt $\>38^\\circ C$ hoặc Đau tại chỗ.  
  * `[ ]` Phát hiện ổ áp-xe ở mô sâu qua siêu âm, CT, mổ lại hoặc giải phẫu bệnh.  
* **Tại Cơ quan / Khoang cơ thể:**  
  * `[ ]` Chảy mủ từ ống dẫn lưu đặt trong khoang cơ thể.  
  * `[ ]` Phát hiện ổ áp-xe trong khoang/nội tạng qua siêu âm, CT, mổ lại hoặc giải phẫu bệnh.

$\\Rightarrow$ **\[ NÚT BẤM: HOÀN THÀNH VÀ CHUYỂN KSNK PHÁN XỬ \]**

---

### **PHẦN 3: THUẬT TOÁN XỬ LÝ NGẦM CỦA MÁY TÍNH (BACKEND ALGORITHM)**

*Ngay khi nhận được dữ liệu từ Form Vi sinh hoặc Form Lâm sàng, Backend sẽ chạy thuật toán lọc 3 cửa ải:*

**BỘ LỌC 1: XÁC ĐỊNH NGÀY SỰ KIỆN (DOE) VÀ CỬA ẢI THỜI GIAN**

* **Xác định DOE:** Hệ thống lấy Ngày lấy mẫu cấy vi sinh (từ Vi sinh) HOẶC Ngày xuất hiện triệu chứng (từ Lâm sàng). Lấy ngày nào sớm hơn làm `DOE`.  
* **Luật Thời gian:** Phép tính `[DOE] - [Ngày Phẫu thuật]`.  
  * Nếu `[Implant] = CÓ`: Hạn mức là $\\le 90$ ngày lịch.  
  * Nếu `[Implant] = KHÔNG`: Hạn mức là $\\le 30$ ngày lịch.  
* **Kết luận 1:** Nếu vượt quá hạn mức (VD: Mổ ruột thừa ngày 1, ngày 35 mới chảy mủ) $\\rightarrow$ **HỆ THỐNG TỰ ĐỘNG HỦY CA BỆNH**. Báo lỗi: *"Nằm ngoài khung thời gian giám sát SSI"*. Nếu đạt $\\rightarrow$ Đi tiếp.

**BỘ LỌC 2: PHÂN LOẠI MỨC ĐỘ NHIỄM KHUẨN (SSI)** *Phần mềm tự động gán nhãn dựa trên các ô Lâm sàng đã tick và Vị trí lấy mẫu Vi sinh:*

* **Lệnh 1 (SSI Nông):** Nếu có chảy mủ nông, HOẶC cấy dịch mô nông (+), HOẶC (Mở vết mổ nông \+ Viêm), HOẶC BS chẩn đoán SSI nông $\\rightarrow$ Gán nhãn: **Superficial SSI**.  
* **Lệnh 2 (SSI Sâu):** Nếu có chảy mủ sâu, HOẶC (Toác/Mở vết mổ sâu \+ Sốt/Đau), HOẶC (Áp-xe mô sâu \+ Cấy dịch mô sâu (+)) $\\rightarrow$ Gán nhãn: **Deep SSI**.  
* **Lệnh 3 (SSI Cơ quan/Khoang):** Nếu chảy mủ từ dẫn lưu, HOẶC Cấy dịch trong khoang (+), HOẶC Áp-xe trong nội tạng $\\rightarrow$ Gán nhãn: **Organ/Space SSI**.  
* *Lưu ý lập trình:* Máy tính luôn lấy nhãn "sâu nhất" làm chẩn đoán cuối cùng (VD: Vừa chảy mủ nông, vừa áp-xe sâu $\\rightarrow$ Chọn SSI Sâu).

**BỘ LỌC 3: QUY KẾT NHIỄM KHUẨN HUYẾT THỨ PHÁT (SECONDARY BSI)**

* Hệ thống quét trong CSDL xem NB này có ca Cấy máu Dương tính (CLABSI) nào trong khoảng thời gian `[DOE - 3 ngày]` đến `[DOE + 13 ngày]` không?  
* Nếu **CÓ**, VÀ tên vi khuẩn trong máu trùng với vi khuẩn ở vết mổ $\\rightarrow$ Máy tính tự động Gỡ lỗi CLABSI cho Khoa Hồi sức, quy kết lỗi thành: **"Nhiễm khuẩn vết mổ có Nhiễm khuẩn huyết thứ phát"**.

---

### **PHẦN 4: GIAO DIỆN PHÁN XỬ CHO KHOA KSNK (FRONTEND KSNK)**

*Khoa KSNK là tổ chức duy nhất có quyền ấn định KPI phạt lỗi. Màn hình này hiển thị đề xuất của máy tính và yêu cầu KSNK thực hiện Validation.*

**Mã Form: BM.KSNK.SSI.04 \- BẢNG ĐIỀU TRA VÀ CHỐT CA BỆNH SSI**

**A. TÓM TẮT ĐỀ XUẤT CỦA MÁY TÍNH:**

* **NB:** \[Họ tên \- PID\] | **Tên phẫu thuật:** \[Mổ...\]  
* **Khoảng cách:** ngày sau mổ (Nằm trong khung 30 ngày) $\\rightarrow$ ĐẠT thời gian.  
* **Hệ thống đề xuất:** 🚨 **\[ SSI SÂU \]** do tác nhân *\[S. aureus\]*. Khoa chịu lỗi: **\[Khoa Ngoại Bụng\]**.

**B. ĐIỀU TRA VÀ THẨM ĐỊNH CỦA KSNK (DATA VALIDATION):** *(KSNK đối chiếu hồ sơ gốc để chống gian lận)*

1. **Kiểm tra Ngày mổ và Implant:** Lâm sàng khai báo mổ không Implant. KSNK kiểm tra giấy Phẫu thuật:  
   * `[ ]` Đúng như khai báo.  
   * `[ ]` Bác sĩ khai sai (Thực tế có đặt tấm lưới thoát vị). $\\rightarrow$ KSNK tick vào đây, máy tính tự đổi khung giám sát thành 90 ngày.  
2. **Kiểm tra Lâm sàng chống từ chối:** BS điều trị phủ nhận SSI, ghi hồ sơ là "Chậm liền vết thương, mỡ tan". KSNK đi buồng thấy có chảy dịch mủ.  
   * `[ ]` KSNK kích hoạt Điều khoản Ngoại lệ: "Chảy mủ từ vết mổ là đủ tiêu chuẩn SSI, không cần BS chẩn đoán, không cần cấy vi sinh dương tính".

**C. PHÁN QUYẾT CUỐI CÙNG:**

* `[ ]` **ĐỒNG Ý VỚI HỆ THỐNG:** Chốt ca bệnh là **\[SSI Sâu\]**.  
* `[ ]` **PHỦ QUYẾT (OVERRIDE):** Hủy ca bệnh do:  
  * Lý do: Vết thương hở từ trước mổ (Nhiễm khuẩn đã có từ trước, không phải do cuộc mổ).  
  * Lý do: Ngoại nhiễm từ chăm sóc tại nhà (Bỏng bô xe máy, tai nạn ngã... vào đúng vết mổ).

$\\Rightarrow$ **\[ BẤM CHỐT VÀ LƯU VÀO CƠ SỞ DỮ LIỆU KPI \]**

---

### **PHẦN 5: THUẬT TOÁN THỐNG KÊ VÀ BÁO CÁO (DASHBOARD)**

Hệ thống độc lập phải được IT thiết lập sẵn công thức thống kê tự động hàng tháng:

* **Tử số:** Số ca SSI (Nông, Sâu, Khoang) đã được KSNK bấm chốt ở Phần 4\.  
* **Mẫu số (Thu thập riêng):** Cuối mỗi tháng, Phòng Kế hoạch Tổng hợp hoặc Phòng Mổ xuất file Excel danh sách các ca phẫu thuật đã thực hiện (Chia theo loại mổ: VD: Mổ ruột thừa, Mổ đẻ...).  
* **Công thức Tỷ lệ SSI thô (Theo loại mổ):** `(Tổng số ca SSI Mổ đẻ / Tổng số ca Mổ đẻ trong tháng) x 100`.  
* **Đề xuất nâng cao (Chuẩn JCI):** Phần mềm cần tích hợp khả năng tính **SIR (Standardized Infection Ratio)** trong tương lai, dựa trên điểm nguy cơ ASA (Tình trạng thể chất), thời gian mổ (có kéo dài hay không), và phân loại vết thương (Sạch, Sạch-nhiễm, Nhiễm, Bẩn) để so sánh công bằng giữa các PTV.

### **GIÁ TRỊ CẢI TIẾN CỐT LÕI**

1. **Chặn đứng sự tranh cãi:** Bằng cách biến các tiêu chuẩn chữ nghĩa của CDC/NHSN thành các hộp check-box nhị phân, PTV không thể dùng các lý do cảm tính (như "phản ứng chỉ", "mỡ tan") để trốn tránh. Chỉ cần ĐD hoặc KSNK tích vào ô "Chảy mủ", máy tính tự động khóa lỗi SSI.  
2. **Khung thời gian pháp lý chuẩn xác:** Lập trình viên thiết lập một hàm đếm ngày đơn giản (`Date_of_Event` trừ `Date_of_Surgery`). Nó giải quyết hoàn toàn việc NVYT quên đếm ngày hoặc nhầm lẫn giữa mốc 30 ngày và 90 ngày.  
3. **Bảo vệ Khoa Hồi sức:** Bước "Quy kết Nhiễm khuẩn huyết thứ phát" ở Bộ lọc 3 là tấm khiên vững chắc cho ICU. Nếu NB mổ ruột thừa bị viêm phúc mạc (SSI Khoang), sau đó vi khuẩn tràn vào máu gây nhiễm trùng máu, hệ thống tự động trút lỗi cho Khoa Ngoại, giải oan 100% cho điều dưỡng ICU chăm sóc Catheter. Dễ đọc, dễ làm, số liệu chuẩn xác JCI\!

