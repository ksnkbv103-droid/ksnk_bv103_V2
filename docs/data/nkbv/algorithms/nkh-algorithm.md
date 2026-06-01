Do phần mềm KSNK hiện tại là hệ thống độc lập (Standalone), chưa liên thông dữ liệu tự động với HIS và LIS, luồng công việc bắt buộc phải chuyển sang mô hình **"Nhập liệu chuỗi nối tiếp" (Sequential Data Entry)**. Trong đó, Khoa Vi sinh là người bóp cò (Trigger), Khoa Lâm sàng là người cung cấp dữ liệu gốc (Raw Data), và phần mềm sẽ tự động tính toán để Khoa KSNK làm người phán xử cuối cùng (Adjudicator).

Dưới đây là bản tái cấu trúc toàn diện, chi tiết đến từng trường dữ liệu (Data Field) phục vụ trực tiếp cho lập trình viên (IT) xây dựng phần mềm, tuân thủ tuyệt đối thuật toán CDC/NHSN 2023\.

---

### **PHẦN 1: LUỒNG CÔNG VIỆC TRÊN PHẦN MỀM ĐỘC LẬP**

1. **Bước 1 (Khoa Vi Sinh):** Nhập kết quả cấy máu dương tính. Phần mềm tạo ra một "Cảnh báo ca bệnh mới" (Pending Alert).  
2. **Bước 2 (Khoa Lâm sàng):** Bác sĩ/Điều dưỡng nhận được cảnh báo, tiến hành nhập bổ sung dữ liệu lâm sàng (Hành chính, Lịch sử nằm khoa, Thiết bị, Sinh hiệu) vào Form của Lâm sàng.  
3. **Bước 3 (Thuật toán Backend):** Phần mềm tự động xử lý mốc thời gian, tính toán Ngày lịch (Calendar Day), trừ ngày chuyển khoa, tính ngày lưu CVC và đối chiếu Khung thời gian lặp lại (RIT).  
4. **Bước 4 (Khoa KSNK):** Hệ thống xuất ra Dashboard đề xuất chẩn đoán. Giám sát viên KSNK thẩm định các ngoại lệ (Thứ phát, MBI) và chốt số liệu.  
   ---

   ### **PHẦN 2: THIẾT KẾ CƠ SỞ DỮ LIỆU VÀ FORM NHẬP LIỆU (UI/UX)**

   #### **FORM 1: MODULE NHẬP LIỆU KHOA VI SINH (Mã: BM.VS.BSI.01)**

*Biểu mẫu này dùng để Khoa Vi sinh nhập liệu hàng ngày, tạo dữ liệu mốc kích hoạt thuật toán.*

**A. Thông tin định danh:**

* Mã người bệnh (PID): `[Nhập text/Quét mã vạch]`  
* Họ và tên: `[Nhập text]`

**B. Dữ liệu Vi sinh (Trigger):**

* Ngày/Giờ lấy mẫu cấy máu dương tính (Mẫu 1): `[Nhập dd/mm/yyyy hh:mm]`  
* Tên vi khuẩn phân lập (Mẫu 1): `[Chọn từ Dropdown list]`  
* *(Nếu là Vi khuẩn cộng sinh)*: Có mẫu cấy máu thứ 2 dương tính cùng loại không?  
  * `[ ] Có` $\\rightarrow$ Nhập Ngày/Giờ lấy mẫu 2: `[dd/mm/yyyy hh:mm]`  
  * `[ ] Không` $\\rightarrow$ *\[Hệ thống tự động Hủy ca, kết luận: Ngoại nhiễm\]*.

$\\Rightarrow$  
Phần cách thức nhập liệu có thể để nhân viên khoa vi sinh copy hoặc trích xuất copy từ LIS ném thẳng vào khung **Cổng tiếp nhận kết quả Vi sinh LIS (Excel Integration)**

 **\[ NÚT BẤM: LƯU VÀ GỬI CẢNH BÁO CHO KHOA LÂM SÀNG \]**

---

#### **FORM 2: MODULE NHẬP LIỆU KHOA LÂM SÀNG (Mã: BM.LS.BSI.01)**

*Giao diện này ưu tiên dạng Bảng (Table) và Lịch (Calendar) để Lâm sàng nhập liệu nhanh nhất. Các trường có chữ \[Tự động\] là máy tính lấy từ Form Vi sinh sang.*

**A. Thông tin kích hoạt (Hệ thống tự động hiển thị để BS biết đang báo cáo ca nào):**

* Họ tên NB: `[Tự động]` | PID: `[Tự động]`  
* Ngày lấy mẫu máu: `[Tự động]` | Tác nhân: `[Tự động]`

**B. Lịch sử khoa điều trị (Tính toán LOA & POA/HAI):** *Yêu cầu Điều dưỡng/Bác sĩ nhập chính xác quá trình di chuyển của NB trong đợt nằm viện này để máy tính tự động quy kết lỗi cho đúng khoa*.

| TT | Từ ngày | Đến ngày | Khoa điều trị | Ghi chú |
| ----- | ----- | ----- | ----- | ----- |
| 1 | `[dd/mm/yyyy]` | `[dd/mm/yyyy]` | `[Dropdown: Tên Khoa]` | *(Ngày nhập viện)* |
| 2 | `[dd/mm/yyyy]` | `[dd/mm/yyyy]` | `[Dropdown: Tên Khoa]` |  |
| 3 | `[dd/mm/yyyy]` | `[Đang nằm]` | `[Dropdown: Tên Khoa]` | *(Khoa hiện tại)* |

**C. Lịch sử Thiết bị xâm lấn \- CVC (Tính toán CLABSI):** *Nhập thông tin các Catheter Tĩnh mạch trung tâm (CVC) / Đường truyền rốn đã hoặc đang đặt trên NB này.*

| TT | Ngày đặt | Ngày rút | Tình trạng | Người đặt (Bác sĩ/Khoa) | Vị trí đặt |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 1 | `[dd/mm/yyyy]` | `[dd/mm/yyyy]` | `[Đã rút]` | `[Nhập text/Dropdown]` | `[Cảnh trong/Dưới đòn]` |
| 2 | `[dd/mm/yyyy]` | `[Để trống]` | `[Đang lưu]` | `[Nhập text/Dropdown]` | `[Đùi]` |

**D. Xác nhận Lâm sàng trong Giai đoạn cửa sổ (IWP):** *Phần mềm Backend TỰ ĐỘNG khóa lịch, chỉ cho phép Bác sĩ chọn ngày xuất hiện triệu chứng nằm trong khoảng: **\[Ngày cấy máu \- 3 ngày\]** đến **\[Ngày cấy máu \+ 3 ngày\]***.

* NB có các triệu chứng sau trong khoảng thời gian trên không?  
  * `[ ] Sốt > 38.0°C` $\\rightarrow$ Ngày xuất hiện: `[Chọn ngày trong lịch IWP]`  
  * `[ ] Rét run` $\\rightarrow$ Ngày xuất hiện: `[Chọn ngày trong lịch IWP]`  
  * `[ ] Tụt huyết áp` $\\rightarrow$ Ngày xuất hiện: `[Chọn ngày trong lịch IWP]`

$\\Rightarrow$ **\[ NÚT BẤM: LƯU VÀ CHUYỂN DỮ LIỆU VỀ KHOA KSNK \]**

---

### **PHẦN 3: THUẬT TOÁN XỬ LÝ NGẦM CỦA PHẦN MỀM (BACKEND ALGORITHM)**

*Ngay khi Khoa Lâm sàng bấm nút Gửi, máy tính lập tức chạy 5 thuật toán sau (trong chưa tới 1 giây) để phân loại ca bệnh*.

**1\. THUẬT TOÁN NGÀY SỰ KIỆN (DOE):**

* Nếu vi khuẩn thực sự $\\rightarrow$ `DOE` \= Ngày lấy mẫu máu.  
* Nếu vi khuẩn cộng sinh $\\rightarrow$ `DOE` \= Ngày lấy mẫu máu HOẶC Ngày xuất hiện triệu chứng (tại Mục D của Form 2), lấy ngày nào sớm hơn.

**2\. THUẬT TOÁN RIT 14 NGÀY (LỌC TRÙNG LẶP & CỘNG DỒN TÁC NHÂN):**

* Hệ thống quét PID của NB. Bệnh nhân này có đang nằm trong Khung RIT 14 ngày của một ca Nhiễm khuẩn huyết nào trước đó không?  
  * **Nếu CÓ (Đang trong RIT):**  
    * Hệ thống so sánh: `[Tác nhân mới]` với `[Tác nhân cũ]`.  
    * Nếu khác nhau $\\rightarrow$ Thực hiện lệnh `[APPEND]` (Gắn thêm) tác nhân mới vào hồ sơ ca bệnh cũ.  
    * Lệnh ngầm: **HỦY BỎ TẠO CA MỚI. Dừng toàn bộ thuật toán quy kết**.  
  * **Nếu KHÔNG (Ngoài RIT):** $\\rightarrow$ Đây là ca mới. Kích hoạt mở một Khung RIT mới: `Từ [DOE] đến [DOE + 13 ngày]`. Tiếp tục chạy bước 3\.

**3\. THUẬT TOÁN QUY KẾT THỜI GIAN VÀ KHÔNG GIAN (POA/HAI & LOA):**

* **POA vs HAI:** Hệ thống lấy `[Từ ngày]` của dòng 1 trong Bảng Lịch sử khoa (Mục B). Phép toán: `[DOE] - [Ngày nhập viện]`. Nếu $\\le 2$ $\\rightarrow$ **POA**. Nếu $\\ge 3$ $\\rightarrow$ **HAI**.  
* **LOA (Quy tắc chuyển khoa):** Hệ thống dò bảng Lịch sử khoa (Mục B) xem `DOE` rơi vào khoảng thời gian của khoa nào.  
  * Nếu `DOE` trùng vào `[Từ ngày]` (Ngày nhập khoa) hoặc ngày ngay sau ngày nhập khoa $\\rightarrow$ Máy tính đổ lỗi (phạt KPI) cho **Khoa liền kề trước đó**.  
  * Các trường hợp còn lại $\\rightarrow$ Phạt lỗi cho **Khoa hiện tại đang điều trị**.

**4\. THUẬT TOÁN TÍNH "NGÀY THIẾT BỊ" (XÁC ĐỊNH CLABSI):**

* Hệ thống dò Bảng Thiết bị (Mục C). Với mỗi CVC, làm phép tính:  
  * `Thời gian lưu` \= `[DOE] - [Ngày đặt CVC]`.  
  * `Sự hiện diện` \= Nếu CVC đang lưu, hoặc `[DOE] - [Ngày rút CVC] <= 1`.  
  * **Luật:** Nếu `Thời gian lưu >= 2` (tức là nằm sang ngày lịch thứ 3\) VÀ `Sự hiện diện = TRUE` $\\rightarrow$ Máy tính gán nhãn: **CLABSI**. Nếu sai một trong hai $\\rightarrow$ **Non-CLABSI**.

  ---

  ### **PHẦN 4: MODULE PHÁN XỬ CỦA KHOA KSNK (Mã: BM.KSNK.BSI.04)**

*Đây là nơi Khoa KSNK mở phần mềm ra để soát xét và chốt số liệu. Giao diện này hiển thị kết quả máy tính đã tính toán từ Phần 3\.*

**A. TÓM TẮT ĐỀ XUẤT CỦA HỆ THỐNG:**

* **Người bệnh:** `[Tên NB]` \- PID: `[Mã PID]`  
* **Ngày sự kiện (DOE):** `[dd/mm/yyyy]`  
* **Chẩn đoán sơ bộ:** 🚨 **\[ CLABSI \]** hoặc **\[ POA \]** hoặc **\[ Non-CLABSI \]**  
* **Khoa chịu trách nhiệm (LOA):** `[Tên Khoa do máy tính quy kết]`  
* **Chi tiết CVC liên quan:** Đặt ngày `[Ngày]`, bởi `[Người đặt]`. Thời gian lưu đến DOE: `[X ngày]`.

**B. ĐIỀU TRA NGOẠI LỆ CỦA KSNK (BẮT BUỘC):** *Do phần mềm độc lập không tự quét được kết quả cấy đờm/nước tiểu từ LIS, KSNK phải kiểm tra chéo (Data Validation) để bảo vệ khoa lâm sàng*.

* **1\. Lọc Nhiễm khuẩn thứ phát (Secondary BSI):**  
  * Người bệnh này có đang mắc ổ nhiễm khuẩn nào khác (CAUTI, VAP, SSI) được chẩn đoán trong 14 ngày qua không? `[ ] Có` | `[ ] Không`  
  * Nếu Có, Tác nhân cấy tại chỗ có trùng với cấy máu không? `[ ] Có` | `[ ] Không`  
  * $\\rightarrow$ *Nếu Trùng khớp, KSNK tick vào đây để ĐỔI NHÃN CLABSI thành **NKH THỨ PHÁT***.  
* **2\. Lọc Tổn thương niêm mạc (MBI-LCBI):**  
  * Vi khuẩn máu là vi khuẩn đường ruột (Candida, Enterococcus...)? `[ ] Có` | `[ ] Không`  
  * Bạch cầu hạt (ANC) của NB \< 500 (trong IWP)? `[ ] Có` | `[ ] Không`  
  * $\\rightarrow$ *Nếu Có cả 2, KSNK tick vào đây để ĐỔI NHÃN CLABSI thành **MBI-LCBI*** (Miễn trừ lỗi cho Khoa Hồi sức/Ung bướu).

**C. CHỐT KẾT QUẢ VÀ TÍNH TỶ SUẤT:**

* **CHẨN ĐOÁN CUỐI CÙNG:** `[Dropdown: KSNK chọn nhãn cuối cùng: CLABSI / Thứ phát / MBI / Ngoại nhiễm]`  
* **KHOA BỊ TRỪ KPI:** `[Tên Khoa]`

$\\Rightarrow$ **\[ NÚT BẤM: DUYỆT VÀ ĐÓNG HỒ SƠ CA BỆNH \]**

*(Khi KSNK bấm duyệt, Hệ thống chính thức mở và khóa Khung RIT 14 ngày cho bệnh nhân này vào cơ sở dữ liệu. Bất kỳ ca cấy máu nào trong 14 ngày tiếp theo do Khoa Vi sinh nhập vào sẽ bị hệ thống tự động chặn lại ở Bước 2 của Thuật toán Backend).*

* 

