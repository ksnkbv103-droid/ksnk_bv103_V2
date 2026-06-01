Tôi hoàn toàn đồng ý và xin nhận khuyết điểm\! Bạn có tư duy dịch tễ học và quản trị hệ thống cực kỳ sắc bén.

Đúng như bạn phân tích, tiêu chuẩn chẩn đoán Viêm phổi (PNEU) của CDC bắt buộc phải có sự hội tụ của 3 yếu tố: **Hình ảnh học (CĐHA) \+ Lâm sàng \+ Vi sinh**. Do đó, **bất kỳ yếu tố nào xuất hiện trước (Cấy đờm dương tính HOẶC X-quang bất thường) đều có quyền làm "Cò súng" (Trigger) thiết lập Ngày Mốc để dóng ra Giai đoạn cửa sổ (IWP 7 ngày)**. Hơn nữa, vì hệ thống của bạn là phần mềm độc lập, việc xác nhận có X-quang bất thường hay không bắt buộc phải do Bác sĩ lâm sàng nhập liệu, hệ thống không thể tự "bắt" từ PACS được.

Để đảm bảo tính pháp lý, khoa học tuyệt đối, logic về cách thức vận hành và sẵn sàng cho đội ngũ IT lập trình phần mềm độc lập, tôi xin thiết kế lại toàn diện **MODULE 4: CHẨN ĐOÁN VIÊM PHỔI BỆNH VIỆN (PNEU/HAP)** theo mô hình **"Đa cò súng" (Multi-Triggers)** như sau:

---

### **PHẦN 1: LUỒNG CÔNG VIỆC TỰ ĐỘNG HÓA TRÊN PHẦN MỀM ĐỘC LẬP (WORKFLOW)**

Quy trình này sử dụng cơ chế **Cảnh báo hai chiều (Two-way Trigger)**:

1. **Cò súng 1 (Từ Khoa Vi sinh):** KTV Vi sinh nhập kết quả cấy đờm/dịch hô hấp (+). Phần mềm tự lấy ngày cấy làm Ngày Mốc, dóng ra IWP 7 ngày và đẩy phiếu yêu cầu Bác sĩ lâm sàng bổ sung thông tin X-quang và Lâm sàng.  
2. **Cò súng 2 (Từ Khoa Lâm sàng):** Bác sĩ lâm sàng chủ động nhập ngày chụp X-quang có tổn thương mới. Phần mềm tự lấy ngày chụp X-quang làm Ngày Mốc, dóng ra IWP 7 ngày và yêu cầu nhập triệu chứng. Đồng thời, phần mềm quét xem Khoa Vi sinh có nhập kết quả cấy nào trong 7 ngày này không.  
3. **Backend (Bộ não tính toán):** Thu thập mảnh ghép từ 2 cò súng, tự động chạy luật IWP, RIT, POA/HAI, LOA và Secondary BSI.  
4. **Khoa KSNK:** Thẩm định lại bằng chứng (Data Validation) và chốt chẩn đoán cuối cùng.

---

### **PHẦN 2: THIẾT KẾ FORM NHẬP LIỆU (UI/UX) CHO VI SINH VÀ LÂM SÀNG**

#### **FORM 1: MODULE NHẬP LIỆU KHOA VI SINH (Mã: BM.VS.PNEU.01)**

*(Lọc rác vi sinh ngay từ cửa ngõ)*

* **Thông tin định danh:** Mã PID: `[Nhập/Quét]` | Họ tên NB: `[Auto]`  
* **Ngày/Giờ lấy mẫu hô hấp:** `[dd/mm/yyyy hh:mm]` *(Lưu ý: Bắt buộc dùng ngày lấy mẫu, không dùng ngày trả kết quả)*.  
* **Loại bệnh phẩm:** `[Dropdown: Đờm / Dịch hút nội khí quản (ETA) / Dịch rửa phế quản (BAL)]`  
* **Kết quả nuôi cấy (Tác nhân):** `[Dropdown/Nhập text]`  
  * *Backend Logic (Chặn rác):* Nếu chọn *Candida, Nấm men, Coagulase-negative Staphylococci, Enterococcus* $\\rightarrow$ Máy tính báo lỗi đỏ: **"Tác nhân không được dùng để chẩn đoán Viêm phổi (Theo CDC)"** $\\rightarrow$ Hủy ca bệnh, không cho phép gửi.  
* **Kết quả Nhuộm Gram (Chỉ số Mủ):** Số lượng Bạch cầu đa nhân: `[Dropdown: > 25 / < 25 / Không ghi nhận]`. Tế bào vảy: `[Dropdown: < 10 / > 10 / Không ghi nhận]`.  
* **Định lượng (Nếu có):** `[Dropdown: $\ge 10^5$ (ETA) / $\ge 10^4$ (BAL) / Vi khuẩn mọc rải rác]`.

$\\Rightarrow$ **\[ NÚT BẤM: GỬI KẾT QUẢ / KÍCH HOẠT CẢNH BÁO CHO LÂM SÀNG \]**

---

#### **FORM 2: MODULE NHẬP LIỆU LÂM SÀNG (Mã: BM.LS.PNEU.01)**

*(Giao diện này ưu tiên dạng Bảng và Lịch. Máy tính tự động tính IWP và chỉ cho phép Bác sĩ chọn ngày lọt trong IWP đó)*.

**A. THÔNG TIN KÍCH HOẠT (Hệ thống tự động thông báo):**

* *Kịch bản 1 (Vi sinh kích hoạt trước):* Hệ thống báo: "Phát hiện cấy đờm (+) vào ngày **\[Ngày X\]**. Yêu cầu Bác sĩ xác nhận X-quang và Lâm sàng trong GĐ Cửa sổ từ **\[Ngày X \- 3\]** đến **\[Ngày X \+ 3\]**."  
* *Kịch bản 2 (Lâm sàng chủ động nhập):* Bác sĩ chọn "Báo cáo ca Viêm phổi". Hệ thống yêu cầu nhập:

**B. TIÊU CHUẨN HÌNH ẢNH HỌC (X-QUANG/CT) \- YẾU TỐ BẮT BUỘC:**

* NB có bệnh nền tim/phổi (ARDS, suy tim, COPD...) không? `[ ] CÓ | [ ] KHÔNG`  
* Ngày chụp phim phát hiện thâm nhiễm mới/đông đặc/tạo hang: `[Nhập lịch: dd/mm/yyyy]` $\\rightarrow$ *(Nếu là Lâm sàng chủ động, ngày này sẽ trở thành Ngày Mốc \[Ngày X\] để dóng IWP).*  
* *Backend Logic:* Nếu NB CÓ bệnh nền, hệ thống bắt buộc Bác sĩ nhập thêm 01 ngày chụp phim thứ 2 (để chứng minh tổn thương tiến triển/dai dẳng).

**C. KHAI BÁO LỊCH SỬ KHOA ĐIỀU TRỊ (Để tính LOA/POA):**

| Từ ngày | Đến ngày | Khoa điều trị | Ghi chú |
| ----- | ----- | ----- | ----- |
| `[dd/mm/yyyy]` | `[dd/mm/yyyy]` | `[Dropdown: Tên Khoa]` | (Khoa lúc nhập viện) |
| `[dd/mm/yyyy]` | `[Đang nằm]` | `[Dropdown: Tên Khoa]` | (Khoa hiện tại) |

**D. KHAI BÁO THIẾT BỊ XÂM LẤN (Để trừ lỗi VAE):**

* NB có đang/đã đặt Nội khí quản thở máy xâm nhập $\\ge 2$ ngày lịch tính đến Ngày X không?  
  * `[ ] KHÔNG` (Hoặc NB Nhi khoa) $\\rightarrow$ *Tiếp tục quy trình PNEU.*  
  * `[ ] CÓ` $\\rightarrow$ *(Backend chặn luồng PNEU, tự động chuyển ca này sang thuật toán VAE dành cho người lớn thở máy).*

**E. TIÊU CHUẨN LÂM SÀNG TRONG GIAI ĐOẠN CỬA SỔ (IWP):** *(Bác sĩ chỉ được chọn ngày xuất hiện triệu chứng lọt trong khung 7 ngày IWP)*.

* **1\. Dấu hiệu Toàn thân (Cần $\\ge 1$):**  
  * `[ ]` Sốt $\>38^\\circ C$ (Ngày xuất hiện: `[Dropdown lịch IWP]`)  
  * `[ ]` Bạch cầu $\\ge 12.000$ hoặc $\\le 4.000$ (Ngày: `[Dropdown lịch IWP]`)  
  * `[ ]` Lú lẫn ở NB $\\ge 70$ tuổi (Ngày: `[Dropdown lịch IWP]`)  
* **2\. Dấu hiệu Hô hấp (Cần $\\ge 2$):**  
  * `[ ]` Đờm mủ mới xuất hiện / Tăng tiết đờm mủ (Ngày: `[Dropdown lịch IWP]`)  
  * `[ ]` Ho mới xuất hiện / Khó thở / Nhịp thở nhanh (Ngày: `[Dropdown lịch IWP]`)  
  * `[ ]` Rale nổ / Tiếng thở phế quản (Ngày: `[Dropdown lịch IWP]`)  
  * `[ ]` Tăng nhu cầu Oxy / Giảm $PaO\_2/FiO\_2 \\le 240$ (Ngày: `[Dropdown lịch IWP]`)

**F. XÁC NHẬN NHIỄM KHUẨN HUYẾT THỨ PHÁT (Tìm Secondary BSI):**

* Trong vòng 14 ngày qua, NB có kết quả Cấy máu (+) trùng khớp với vi khuẩn hô hấp không?  
  * `[ ]` Có (Ngày cấy máu: `[dd/mm/yyyy]`) $\\rightarrow$ *(Máy tính sẽ gán lỗi NK huyết này là do Phổi, không phạt lỗi CLABSI).*

$\\Rightarrow$ **\[ NÚT BẤM: HOÀN THÀNH VÀ CHUYỂN KSNK THẨM ĐỊNH \]**

---

### **PHẦN 3: THUẬT TOÁN XỬ LÝ NGẦM (BACKEND ALGORITHM CHO IT)**

Máy tính sẽ tổng hợp dữ liệu từ 2 Form trên và chạy các thuật toán nhị phân sau (trong 1 giây):

**BỘ LỌC 1: XÁC ĐỊNH MỨC ĐỘ PNEU VÀ NGÀY SỰ KIỆN (DOE)**

* **Lệnh 1 (Check Hợp lệ):** Kiểm tra Mục B (Hình ảnh học có $\\ge 1$ phim bất thường) AND Mục E (Có $\\ge 1$ toàn thân AND $\\ge 2$ hô hấp). Tất cả lọt trong 1 khung IWP 7 ngày.  
  * *Nếu False:* $\\rightarrow$ **HỦY CA BỆNH** (Không đủ tiêu chuẩn viêm phổi).  
  * *Nếu True:* $\\rightarrow$ Máy tính quét tất cả các ngày (Ngày X-quang, Ngày Sốt, Ngày Ho...). Ngày nào sớm nhất trong IWP sẽ được gán làm **Ngày sự kiện (DOE)**.  
* **Lệnh 2 (Phân loại cấp độ):**  
  * Nếu chỉ có Lệnh 1 $\\rightarrow$ Máy tính gán nhãn: **PNU1 (Viêm phổi Lâm sàng)**.  
  * Nếu Form Vi sinh (Cò súng 1\) có tồn tại, kết quả đạt định lượng (hoặc đạt chỉ số mủ) $\\rightarrow$ Nâng cấp nhãn lên: **PNU2 (Viêm phổi Vi sinh)**.

**BỘ LỌC 2: KIỂM TRA RIT 14 NGÀY (CHẶN TRÙNG LẶP)**

* Máy tính kiểm tra `DOE` vừa chốt có nằm trong RIT 14 ngày của một ca PNEU/HAP nào trước đó của NB này không?  
  * *Nếu Có:* Bỏ qua ca này. Dùng lệnh `[APPEND]` để bổ sung thêm tên vi khuẩn mới (nếu có) vào ca viêm phổi cũ. Dừng thuật toán.  
  * *Nếu Không:* Đi tiếp Bộ lọc 3\. Mở một Khung RIT mới: `Từ [DOE] đến [DOE + 13 ngày]`.

**BỘ LỌC 3: QUY KẾT THỜI GIAN VÀ KHÔNG GIAN (POA/HAI & LOA)**

* **POA vs HAI:** Tính `[DOE] - [Ngày nhập viện]`. Nếu $\\le 2$ $\\rightarrow$ Gán nhãn **POA** (Nhiễm khuẩn vào viện). Nếu $\\ge 3$ $\\rightarrow$ **HAI** (NKBV).  
* **Quy tắc chuyển khoa (LOA):** Dò bảng Lịch sử khoa (Mục C). Nếu `[DOE] - [Ngày nhập khoa hiện tại] \le 1` $\\rightarrow$ Phạt lỗi cho **Khoa trước đó**. Nếu $\\ge 2$ $\\rightarrow$ Phạt lỗi cho **Khoa hiện tại**.

---

### **PHẦN 4: GIAO DIỆN PHÁN XỬ CỦA KHOA KSNK (FRONTEND 2\)**

*Đây là màn hình Dashboard cuối cùng để Giám sát viên KSNK thẩm định lại (Data Validation) trước khi chốt KPI. Hệ thống phần mềm không được phép tự chốt.*

**Mã Form: BM.KSNK.PNEU.04 \- BẢNG ĐIỀU TRA VÀ CHỐT CA BỆNH VIÊM PHỔI (HAP/PNEU)**

**A. TÓM TẮT ĐỀ XUẤT CỦA MÁY TÍNH:**

* Người bệnh: \[Họ tên\] | Mã PID: \[Mã\] | Ngày sự kiện (DOE): \[dd/mm/yyyy\].  
* Máy tính đề xuất: 🚨 **\[ PNU2 \]** \- Mắc tại Bệnh viện (HAI).  
* Khoa chịu trách nhiệm (LOA): **\[Tên Khoa\]**.  
* NK huyết thứ phát kèm theo: **\[Có / Không\]**.

**B. ĐIỀU TRA VÀ THẨM ĐỊNH CỦA KSNK (VALIDATION):** *(KSNK phải mở hồ sơ bệnh án/PACS để đối chiếu chéo với dữ liệu Bác sĩ nhập)*

1. **Kiểm tra Hình ảnh học (X-quang):**  
   * `[ ]` Đồng ý với Bác sĩ: Phim có tổn thương đông đặc/thâm nhiễm mới.  
   * `[ ]` Bác bỏ: Tổn thương này là cũ, hoặc là tràn dịch màng phổi do suy tim, không phải thâm nhiễm viêm phổi. *(Nếu tick ô này $\\rightarrow$ Ca bệnh tự động bị hủy).*  
2. **Kiểm tra Lâm sàng:**  
   * `[ ]` Bác sĩ khai báo trung thực (Có sốt, có rale, có đờm thực sự ghi trong tờ điều trị).  
   * `[ ]` Bác sĩ khai khống triệu chứng để hợp thức hóa việc kê kháng sinh.  
3. **Kiểm tra Vi sinh (Nếu là PNU2):**  
   * `[ ]` Mẫu đờm đạt chất lượng ($\>25$ BCĐN, $\<10$ TB Vảy).  
   * `[ ]` Mẫu đờm là nước bọt ngoại nhiễm. $\\rightarrow$ Hạ cấp từ PNU2 xuống PNU1.

**C. PHÁN QUYẾT CUỐI CÙNG CỦA KSNK:**

* `[ ]` **ĐỒNG Ý VỚI HỆ THỐNG:** Chốt ca bệnh là **\[PNU2\]**.  
* `[ ]` **PHỦ QUYẾT (OVERRIDE):** Đổi loại nhiễm khuẩn hoặc Hủy ca bệnh.  
  * Lý do: ...................................................

$\\Rightarrow$ **\[ NÚT BẤM: DUYỆT \- KHÓA RIT 14 NGÀY VÀ LƯU KPI \]**

---

### **GIÁ TRỊ CẢI TIẾN CỦA MÔ HÌNH "ĐA CÒ SÚNG" NÀY:**

1. **Chống tắc nghẽn dữ liệu:** Việc cho phép 2 "cò súng" (Vi sinh và X-quang) hoạt động song song đảm bảo không bỏ sót ca bệnh nào. Nếu bác sĩ chưa cấy đờm nhưng đã chụp X-quang và có triệu chứng, hệ thống vẫn bắt được ca **PNU1**.  
2. **Tự động hóa hoàn toàn lịch (Calendar Math):** Bác sĩ sẽ không phải tự nhẩm xem "triệu chứng này có nằm trong 7 ngày không?". Máy tính tự động vẽ ra cái khung IWP và khóa các ngày khác lại. Điều này giúp loại bỏ 100% sai số tính toán của con người.  
3. **Tự động Rà soát Thứ phát:** Giải quyết bài toán cãi vã giữa các khoa. Nếu Khoa Hồi sức cấy đờm ra vi khuẩn, rồi 3 ngày sau cấy máu ra đúng con vi khuẩn đó, máy tính sẽ tự động khóa liên kết "Viêm phổi \- NK huyết thứ phát" (Secondary BSI). CLABSI sẽ không bị đếm oan.  
4. **Tuân thủ pháp lý (JCI):** Vai trò của KSNK không bị biến thành "thợ bấm nút". Cửa ải thẩm định X-quang (Validation) của KSNK ở Phần 4 đảm bảo dữ liệu đưa ra báo cáo là trung thực, loại bỏ được "bệnh án sao chép", đáp ứng khắt khe bộ tiêu chuẩn JCI QPS.03.01 về tính xác thực dữ liệu.

Để đảm bảo bộ quy chuẩn giám sát Viêm phổi (PNEU) đạt độ hoàn thiện tuyệt đối, khoa học về nội dung và logic về cách thức triển khai trên phần mềm độc lập, việc thiết lập thuật toán tính toán các chỉ số (Rates/Ratios) là bước không thể thiếu.

Theo chuẩn CDC/NHSN, do Viêm phổi (PNEU) được áp dụng bao trùm cho cả người bệnh không thở máy (HAP) ở mọi lứa tuổi và viêm phổi thở máy (VAP/PedVAP) đặc thù cho trẻ em/sơ sinh, hệ thống phần mềm phải tách bạch rõ ràng các nhóm mẫu số để đánh giá đúng nguyên nhân gốc rễ,,.

Dưới đây là phần bổ sung chi tiết **Đặc tả thuật toán tính toán các chỉ số Viêm phổi (PNEU/HAP/VAP)** để bàn giao cho bộ phận IT lập trình:

---

### **PHẦN 5: THUẬT TOÁN TÍNH TOÁN CÁC CHỈ SỐ VIÊM PHỔI BỆNH VIỆN (DASHBOARD TỰ ĐỘNG)**

Phần mềm sẽ tự động trích xuất dữ liệu Tử số (từ giao diện chốt ca bệnh của KSNK) và Mẫu số (từ giao diện đếm hàng ngày của khoa lâm sàng) để tính toán theo thời gian thực (Real-time).

#### **1\. QUY ĐỊNH VỀ TRÍCH XUẤT DỮ LIỆU LÕI (INPUT DATA)**

* **Tử số (Numerator):** Là tổng số ca Viêm phổi (PNEU) đã được Giám sát viên KSNK thẩm định và phê duyệt trên hệ thống (bao gồm các nhãn PNU1, PNU2, PNU3),,. Phần mềm phải tự động phân tách Tử số thành 2 nhóm:  
  * *Nhóm 1:* Ca PNEU trên người bệnh có thở máy (VAP/PedVAP).  
  * *Nhóm 2:* Ca PNEU trên người bệnh không thở máy (Non-ventilator HAP).  
* **Mẫu số (Denominator):** Là số liệu do điều dưỡng/mạng lưới KSNK nhập vào hệ thống vào một giờ cố định hàng ngày,. Bao gồm:  
  * *Tổng số ngày nằm viện (Patient Days):* Dùng làm mẫu số cho PNEU không thở máy,.  
  * *Tổng số ngày thở máy (Ventilator Days):* Dùng làm mẫu số cho VAP ở trẻ em/sơ sinh (hoặc giám sát VAP ngoài kế hoạch ở người lớn),. Việc đếm phải được thực hiện riêng rẽ cho từng loại khoa (ICU, Hồi sức Nhi, Sơ sinh...),,.

#### **2\. BỘ CÔNG THỨC TỰ ĐỘNG HÓA CHỈ SỐ (BACKEND FORMULAS)**

IT cần lập trình các phép tính toán học sau và thiết lập hiển thị lên Dashboard của Ban Giám đốc:

**Công thức 1: Tỷ suất Viêm phổi liên quan đến thở máy (VAP Rate)**

* *Công thức:* `(Tổng số ca VAP / Tổng số ngày thở máy) x 1000`,,,.  
* *Ý nghĩa & Ứng dụng:* Chỉ số này đo lường số ca VAP trên mỗi 1000 ngày phơi nhiễm với máy thở,. Nó được áp dụng chính thức cho các khoa Nhi/Sơ sinh (PedVAP) hoặc các khoa người lớn nếu bệnh viện vẫn muốn theo dõi VAP độc lập (giám sát ngoại lệ \- off-plan),. Chỉ số này phản ánh trực tiếp chất lượng thực hành vô khuẩn khi hút đờm, quản lý bẫy nước và vệ sinh ống nội khí quản.

**Công thức 2: Tỷ suất Viêm phổi bệnh viện không do thở máy (Non-ventilator HAP Rate)**

* *Công thức:* `(Tổng số ca PNEU không thở máy / Tổng số ngày nằm viện) x 1000`.  
* *Ý nghĩa & Ứng dụng:* Đo lường nguy cơ viêm phổi ở những người bệnh không can thiệp đường thở nhân tạo. Nếu chỉ số này ở Khoa Nội/Thần kinh tăng cao, phần mềm sẽ giúp KSNK nhận diện nguyên nhân đến từ việc điều dưỡng chăm sóc cơ bản kém (không nâng đầu giường cho người bệnh liệt, vỗ rung lồng ngực kém, cho ăn qua sonde dạ dày gây hít sặc).

**Công thức 3: Tỷ lệ sử dụng máy thở (DUR \- Ventilator Utilization Ratio)**

* *Công thức:* `(Tổng số ngày thở máy tại khoa / Tổng số ngày nằm viện tại khoa đó)`,.  
* *Ý nghĩa & Ứng dụng:* Đây là chỉ số quản trị lõi. Nó cho biết phần trăm người bệnh tại khoa phải phụ thuộc vào máy thở. Việc tính toán DUR phải được thực hiện riêng biệt cho từng loại ICU, khoa chuyên sâu và các vị trí khác,.  
  * *Logic Cải tiến:* Nếu Tỷ suất VAP (Công thức 1\) cao VÀ DUR (Công thức 3\) cũng cao, lỗi lớn nhất nằm ở việc bác sĩ lạm dụng máy thở hoặc chậm trễ trong việc cai máy thở. Nếu DUR thấp nhưng VAP cao, lỗi hoàn toàn do kỹ năng chống nhiễm khuẩn của điều dưỡng yếu kém.

#### **3\. BÁO CÁO PHÂN TÍCH VÀ TRỰC QUAN HÓA (DATA VISUALIZATION)**

Để đáp ứng tiêu chí dễ đọc, dễ triển khai và chuẩn xác theo JCI, hệ thống phần mềm không chỉ trả ra những con số vô hồn mà phải được lập trình để tạo ra các "Phân tích mô tả" (Descriptive Analysis),,:

* **Báo cáo xu hướng (Run Charts):** Vẽ biểu đồ đường theo dõi Tỷ suất PNEU và VAP qua từng tháng để đánh giá sự ổn định của hệ thống,.  
* **Bảng phân tích vi sinh (Frequency Tables & Pie Charts):** Tự động gom nhóm các tác nhân gây PNU2 và PNU3,,. Vẽ biểu đồ tròn cho thấy tỷ lệ *Acinetobacter*, *Klebsiella*, *Pseudomonas* gây viêm phổi tại từng khoa để Dược lâm sàng có căn cứ điều chỉnh phác đồ kháng sinh kinh nghiệm.  
* **Danh sách tuyến (Line Listings):** Hệ thống cho phép KSNK xuất danh sách chi tiết (Excel/PDF) toàn bộ các ca PNEU trong tháng kèm theo thông tin vi sinh và kháng sinh đồ để phục vụ các cuộc họp phân tích nguyên nhân gốc rễ (Root Cause Analysis),,.

Việc mã hóa đầy đủ cả thuật toán chẩn đoán (Tử số), thuật toán đếm ngày (Mẫu số) và các công thức tỷ suất (Rates/Ratios) này sẽ biến EMR của Bệnh viện Quân y 103 thành một công cụ tự động hóa toàn diện, đảm bảo tính khách quan tuyệt đối cho dữ liệu giám sát nhiễm khuẩn.

