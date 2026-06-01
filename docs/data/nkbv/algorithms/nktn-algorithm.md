**TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS) \- MODULE 2** **HỆ THỐNG GIÁM SÁT VÀ CHẨN ĐOÁN NHIỄM KHUẨN TIẾT NIỆU (UTI/CAUTI)** *(Tuân thủ Tiêu chuẩn CDC/NHSN 2023 và JCI Phiên bản 8\)*

Đánh giá thực trạng: Lỗi lớn nhất tại các bệnh viện khi chẩn đoán CAUTI là **(1) Sử dụng nấm (Candida) để chẩn đoán**, **(2) Đếm mẫu tạp khuẩn (\>2 loại vi khuẩn)**, và **(3) Bác sĩ lâm sàng đánh đồng "Vi khuẩn niệu không triệu chứng" (ASB) thành CAUTI**.

Với phần mềm độc lập (chưa liên thông LIS/HIS), chúng ta sẽ thiết kế luồng "Nhập liệu chuỗi nối tiếp" nhưng tích hợp **Bộ lọc thông minh (Smart Filters)** ngay tại giao diện nhập liệu để chặn đứng dữ liệu rác trước khi nó đi vào thuật toán tính toán.

---

### **PHẦN 1: LUỒNG CÔNG VIỆC TRÊN PHẦN MỀM ĐỘC LẬP (WORKFLOW)**

1. **Bước 1 (Khoa Vi sinh):** Copy/Nhập kết quả cấy nước tiểu vào Form Vi sinh. Phần mềm tự động kiểm duyệt màng lọc vi sinh. Nếu hợp lệ \-\> Phát Cảnh báo ca bệnh mới.  
2. **Bước 2 (Khoa Lâm sàng):** Nhận cảnh báo, Bác sĩ/Điều dưỡng nhập Lịch sử khoa, Lịch sử Ống thông tiểu (Foley) và click chọn Triệu chứng lâm sàng trong Khung thời gian IWP do máy tính dóng sẵn.  
3. **Bước 3 (Thuật toán Backend):** Tự động tính "Ngày lịch", Khung lặp lại RIT, chốt Ngày sự kiện (DOE) và quy kết lỗi (LOA).  
4. **Bước 4 (Khoa KSNK):** Xem xét Dashboard đề xuất của máy tính, thực hiện phán xử cuối cùng (Loại trừ Vi khuẩn niệu không triệu chứng) và chốt số liệu.

---

### **PHẦN 2: THIẾT KẾ FORM NHẬP LIỆU (UI/UX) CHO KHOA VI SINH VÀ LÂM SÀNG**

#### **FORM 1: MODULE NHẬP LIỆU KHOA VI SINH (Mã: BM.VS.UTI.01)**

*Người nhập: KTV Vi sinh. Mục tiêu: Lọc bỏ ngay lập tức nấm và mẫu ngoại nhiễm.*

**A. Thông tin định danh:**

* Họ tên NB: `[Nhập text]` | Mã PID: `[Nhập text]`

**B. Dữ liệu Vi sinh (Trigger):**

* **Ngày/Giờ lấy mẫu nước tiểu:** `[dd/mm/yyyy hh:mm]` *(Lưu ý: Không dùng ngày trả kết quả)*  
* **Số lượng chủng vi sinh vật mọc:** `[Dropdown: 1 loại / 2 loại / 3 loại trở lên (Tạp khuẩn)]`  
  * *Backend Logic 1:* Nếu chọn "3 loại trở lên" $\\rightarrow$ Báo lỗi đỏ: **"MẪU NGOẠI NHIỄM. CDC không cho phép chẩn đoán CAUTI với \>2 loại vi khuẩn."** $\\rightarrow$ Nút \[LƯU\] bị khóa.  
* **Nhập Tên Tác nhân 1 ($\\ge 10^5$ CFU/ml):** `[Copy/Paste từ LIS hoặc Dropdown]`  
* **Nhập Tên Tác nhân 2 ($\\ge 10^5$ CFU/ml) (Nếu có):** `[Copy/Paste hoặc Dropdown]`  
  * *Backend Logic 2:* Phần mềm có bộ từ điển vi sinh (Dictionary). Nếu Tác nhân 1 hoặc 2 là: *Candida spp, Yeast, Nấm men, Nấm mốc, Ký sinh trùng* $\\rightarrow$ Báo lỗi đỏ: **"DỮ LIỆU RÁC. CDC nghiêm cấm sử dụng Nấm để chẩn đoán NKTN."** $\\rightarrow$ Hủy ca bệnh, không cho phép lưu.

$\\Rightarrow$ **\[ NÚT BẤM: LƯU VÀ GỬI CẢNH BÁO CHO LÂM SÀNG \]** *(Chỉ sáng lên khi tác nhân là Vi khuẩn thực sự).*

---

#### **FORM 2: MODULE NHẬP LIỆU LÂM SÀNG (Mã: BM.LS.UTI.01)**

*Người nhập: Bác sĩ/Điều dưỡng điều trị. Máy tính đã tự động tính sẵn các khung thời gian.*

**A. Thông tin Kích hoạt (Read-only):**

* Ngày lấy mẫu (Ngày Mốc): **\[Ngày X\]** | Tác nhân: **\[Tên Vi khuẩn\]**

**B. Khai báo Lịch sử Khoa (Quy kết LOA):**

| Từ ngày | Đến ngày | Khoa điều trị | Ghi chú |
| ----- | ----- | ----- | ----- |
| `[dd/mm/yyyy]` | `[dd/mm/yyyy]` | `[Khoa Cấp cứu]` | Ngày nhập viện |
| `[dd/mm/yyyy]` | `[Đang nằm]` | `[Khoa Hồi sức]` | Khoa hiện tại |

**C. Khai báo Thiết bị (Ống thông tiểu lưu \- Foley):** *Máy tính dùng dữ liệu này để quyết định là CAUTI hay NKTN thường (Non-CAUTI).*

* Tình trạng Ống thông tiểu tính đến \[Ngày X\]: ☐ Đang lưu | ☐ Đã rút | ☐ Không đặt  
* Ngày/Giờ ĐẶT: `[dd/mm/yyyy hh:mm]`  
* Ngày/Giờ RÚT (Nếu đã rút): `[dd/mm/yyyy hh:mm]`

**D. Khai báo Triệu chứng Lâm sàng (BẮT BUỘC):** *Hệ thống tự động thiết lập Giai đoạn cửa sổ (IWP): Từ* **\[Ngày X \- 3 ngày\]** *đến* **\[Ngày X \+ 3 ngày\]**. *Bác sĩ CHỈ ĐƯỢC CHỌN ngày xuất hiện triệu chứng nằm trong 7 ngày này.*

* NB có các triệu chứng sau không?  
  * ☐ Sốt $\> 38.0^\\circ C$ (Ngày xuất hiện: `[Dropdown ngày trong IWP]`)  
  * ☐ Đau tức trên xương mu (Ngày: `[Dropdown ngày trong IWP]`)  
  * ☐ Đau hố thắt lưng (Ngày: `[Dropdown ngày trong IWP]`)  
  * *(Các triệu chứng sau đây phần mềm sẽ TỰ ẨN ĐI nếu NB ĐANG ĐẶT Ống thông tiểu, vì CDC cấm dùng triệu chứng buốt/rắt khi đang có ống thông)*:  
  * ☐ Tiểu buốt / Tiểu rắt / Tiểu gấp (Ngày: `[Dropdown ngày trong IWP]`)  
  * ☐ KHÔNG có triệu chứng nào ở trên.

**E. Xác nhận Cấy máu (Tìm ABUTI \- NK huyết từ đường tiểu):**

* Trong khung 7 ngày IWP trên, NB có Cấy máu Dương tính TRÙNG KHỚP với vi khuẩn nước tiểu không?  
  * ☐ Có (Ngày cấy máu: `[dd/mm/yyyy]`) | ☐ Không / Không cấy máu.

$\\Rightarrow$ **\[ NÚT BẤM: HOÀN THÀNH VÀ CHUYỂN KSNK PHÁN XỬ \]**

---

### **PHẦN 3: THUẬT TOÁN XỬ LÝ NGẦM (BACKEND ALGORITHM CHO IT)**

Ngay khi Lâm sàng ấn nút, Backend chạy qua 5 Bộ lọc với logic đếm "Ngày lịch" (Calendar Day):

**BỘ LỌC 1: XÁC ĐỊNH SỰ KIỆN SUTI vs ABUTI VÀ NGÀY DOE**

* **Kịch bản 1 (Có triệu chứng):** Nếu Mục D có check $\\ge 1$ triệu chứng $\\rightarrow$ Đạt chuẩn **SUTI**. `DOE` \= Ngày xuất hiện triệu chứng đầu tiên HOẶC Ngày cấy nước tiểu (Lấy ngày nào nhỏ hơn/sớm hơn).  
* **Kịch bản 2 (Không triệu chứng nhưng có Cấy máu):** Nếu Mục D \= Không triệu chứng, NHƯNG Mục E \= CÓ cấy máu (+) trùng tác nhân $\\rightarrow$ Đạt chuẩn **ABUTI** (NKTN không triệu chứng biến chứng NK huyết). `DOE` \= Ngày cấy nước tiểu.  
* **Kịch bản 3 (Vi khuẩn niệu không triệu chứng \- Rác lâm sàng):** Nếu Mục D \= Không triệu chứng VÀ Mục E \= Không cấy máu $\\rightarrow$ **HỦY CA BỆNH**. Nhãn: *Asymptomatic Bacteriuria (ASB)*. Dừng toàn bộ thuật toán.

**BỘ LỌC 2: RIT 14 NGÀY (LỌC TRÙNG LẶP)**

* Kiểm tra `DOE` có nằm trong Khung RIT 14 ngày của ca UTI nào trước đó không?  
  * Nếu **CÓ**: Hủy việc tạo ca bệnh mới. `[APPEND]` vi khuẩn mới vào hồ sơ ca cũ.  
  * Nếu **KHÔNG**: Đi tiếp. Tự động mở Khung RIT mới: `[DOE]` đến `[DOE + 13 ngày]`.

**BỘ LỌC 3: QUY KẾT THIẾT BỊ (TÌM CAUTI)**

* Lệnh 1 (Lưu $\>2$ ngày lịch): `[DOE] - [Ngày đặt Foley] >= 2`  
* Lệnh 2 (Sự hiện diện): Tình trạng \= Đang lưu HOẶC `[DOE] - [Ngày rút Foley] <= 1`  
* *Kết luận:* Nếu Lệnh 1 VÀ Lệnh 2 \= TRUE $\\rightarrow$ Gán nhãn **CAUTI** (SUTI-CAUTI hoặc ABUTI-CAUTI). Nếu sai $\\rightarrow$ Nhãn **Non-CAUTI** (NKTN không liên quan ống thông).

**BỘ LỌC 4: QUY KẾT THỜI GIAN VÀ KHOA LỖI (POA/HAI & LOA)**

* `[DOE] - [Ngày nhập viện] <= 2` $\\rightarrow$ Nhãn **POA** (Nhiễm khuẩn cộng đồng).  
* `[DOE] - [Ngày nhập khoa hiện tại] <= 1` $\\rightarrow$ Phạt lỗi (LOA) cho **Khoa Trước Đó**. $\\ge 2$ $\\rightarrow$ Phạt **Khoa Hiện Tại**.

---

### **PHẦN 4: GIAO DIỆN PHÁN XỬ (FRONTEND KHOA KSNK \- BM.KSNK.UTI.04)**

*Đây là màn hình Dashboard tổng hợp để Giám sát viên KSNK thẩm định lần cuối trước khi ghi nhận KPI. Tiêu chuẩn JCI QPS.03.01.*

**A. TÓM TẮT TỪ HỆ THỐNG:**

* Người bệnh: \[Họ tên \- PID\] | Ngày sự kiện (DOE): \[dd/mm/yyyy\]  
* Hệ thống đề xuất chẩn đoán: 🚨 **\[ CAUTI \]** (hoặc NKTN thông thường / ABUTI).  
* Khoa chịu phạt (LOA): **\[Tên Khoa\]**. Lỗi thuộc: **\[Mắc tại Bệnh viện \- HAI\]**.

**B. ĐIỀU TRA VÀ THẨM ĐỊNH CỦA KSNK (VALIDATION):** *KSNK phải xem lại hồ sơ bệnh án để phát hiện sự dối trá hoặc cảm tính của lâm sàng.*

1. **Kiểm tra Vi sinh:** Tác nhân cấy nước tiểu có đúng là vi khuẩn (không phải Candida) và số lượng $\\ge 10^5$ CFU/ml không? `[ ] Đạt | [ ] Không đạt`  
2. **Kiểm tra Lâm sàng:** Triệu chứng sốt $\>38^\\circ C$ bác sĩ khai báo có thực sự xảy ra không? (Xem bảng mạch nhiệt độ). `[ ] Có thật | [ ] Sốt ảo (Lâm sàng khai khống)`  
3. **Kiểm tra Ống thông:** Ngày đặt/rút Foley lâm sàng nhập có khớp với tờ Điều trị không? `[ ] Khớp | [ ] Không khớp (Sửa lại ngày đúng: .../.../...)`

**C. PHÁN QUYẾT CUỐI CÙNG (FINAL ADJUDICATION):**

* ☐ **ĐỒNG Ý VỚI HỆ THỐNG:** Chốt ca bệnh là **\[CAUTI\]**.  
* ☐ **PHỦ QUYẾT (OVERRIDE):** Hủy ca bệnh do lâm sàng nhập sai.  
  * *Lý do:* ☐ Vi khuẩn niệu không triệu chứng (ASB) | ☐ Nhiễm Candida niệu | ☐ Mắc tại cộng đồng (POA).

$\\Rightarrow$ **\[ NÚT BẤM: DUYỆT \- KHÓA RIT 14 NGÀY VÀ LƯU KPI \]**

---

### **PHẦN 5: THUẬT TOÁN TÍNH TỶ SUẤT TỰ ĐỘNG (DASHBOARD)**

Hệ thống sẽ lấy dữ liệu Mẫu số (Số ngày đặt thông tiểu do ML.KSNK nhập hàng ngày) và Tử số (Các ca CAUTI đã được KSNK chốt) để tự động hiển thị:

1. **Tỷ suất CAUTI thô:** `(Tổng ca CAUTI / Tổng số ngày mang ống thông tiểu) x 1000`.  
2. **Tỷ lệ lạm dụng thiết bị (DUR \- Foley):** `(Tổng số ngày mang ống thông tiểu / Tổng số ngày nằm viện)`. *Cảnh báo quản trị:* Nếu DUR của một Khoa Nội \> 0.4 (tức 40% NB bị cắm sonde tiểu), hệ thống bật cờ đỏ yêu cầu BGĐ can thiệp vì bác sĩ đang lạm dụng cắm sonde thay cho việc cho NB dùng bỉm/bô.  
3. **SIR (Tỷ số chuẩn hóa):** `(Số ca CAUTI thực tế / Số ca CAUTI dự đoán)`.

### **GIÁ TRỊ CỦA BỘ CÔNG CỤ NÀY:**

Bộ công cụ này **bịt kín** hoàn toàn mọi rủi ro:

* **Chặn rác vi sinh:** Tự động chặn Candida và mẫu tạp khuẩn ngay từ cửa ngõ Khoa Vi Sinh.  
* **Chặn rác lâm sàng:** Bắt buộc lâm sàng chọn ngày triệu chứng lọt thỏm trong 7 ngày IWP. Tự động chuyển các ca "không triệu chứng nhưng có vi khuẩn" vào thùng rác (loại bỏ việc lạm dụng kháng sinh cho ASB).  
* **Tự động hóa hoàn toàn lịch:** Lập trình viên chỉ cần dùng lệnh `DateDiff` để đếm "ngày thiết bị" và "Quy tắc chuyển khoa", giải phóng con người khỏi việc đếm tay sai sót. Đây là một hệ thống mang tầm vóc của JCI\!