**PHẦN 1: PHÂN ĐỊNH RẠCH RÒI VAI TRÒ CỦA CÁC BỘ PHẬN TRONG HỆ THỐNG GIÁM SÁT**

Để đảm bảo tính pháp lý, khách quan và loại bỏ hoàn toàn tình trạng "vừa đá bóng vừa thổi còi" (khoa lâm sàng tự chẩn đoán và tự che giấu NKBV), quy trình chẩn đoán NKBV hiện đại bắt buộc phải phân định trách nhiệm rõ ràng theo ma trận RACI:

1. **Khoa Lâm sàng (Nguồn cung cấp dữ liệu gốc):**  
   * **Trách nhiệm:** Bác sĩ và điều dưỡng tuyệt đối không tự ý chốt số liệu NKBV. Trách nhiệm của họ là ghi chép hồ sơ bệnh án trung thực (dấu hiệu sinh tồn, tình trạng thiết bị), ra y lệnh xét nghiệm vi sinh kịp thời khi nghi ngờ nhiễm khuẩn và báo cáo ca bệnh.  
   * **Mạng lưới KSNK tại khoa:** Đóng vai trò đếm và báo cáo chính xác "Mẫu số" (số ngày nằm viện, số ngày đặt catheter, số ngày thở máy) vào một giờ cố định hàng ngày.  
2. **Khoa Xét nghiệm / Vi sinh (Hệ thống kích hoạt \- Trigger):**  
   * **Trách nhiệm:** Thực hiện xét nghiệm và trả kết quả nhanh chóng, chính xác. Bắt buộc phải có cơ chế cảnh báo khẩn (Alert) cho Khoa KSNK và khoa lâm sàng ngay khi phát hiện các vi khuẩn đa kháng (MDROs) hoặc tác nhân bất thường để kích hoạt điều tra.  
3. **Khoa Kiểm soát nhiễm khuẩn (Người phán xử cuối cùng \- Adjudicator):**  
   * **Trách nhiệm:** Là đơn vị có **thẩm quyền pháp lý cuối cùng** trong việc xác định và chốt ca bệnh NKBV. Giám sát viên KSNK thực hiện giám sát chủ động, tổng hợp dữ liệu từ lâm sàng và vi sinh, áp dụng các tiêu chuẩn chẩn đoán chuẩn hóa của CDC/Bộ Y tế để phán quyết. Việc này đảm bảo tính minh bạch dữ liệu theo tiêu chuẩn JCI.  
4. **Hội đồng KSNK / Ban Giám đốc (Người phê duyệt và Điều hành):**  
   * **Trách nhiệm:** Xem xét dữ liệu KSNK đã được chuẩn hóa để đưa ra các quyết sách cấp bệnh viện, phân bổ nguồn lực và xử lý kỷ luật/khen thưởng. Là nơi giải quyết các tranh chấp về số liệu giữa Khoa KSNK và các khoa lâm sàng.

---

**PHẦN 2: THUẬT TOÁN CỐT LÕI TỔNG HỢP CHẨN ĐOÁN NKBV (DÀNH CHO SỐ HÓA EMR)**

Để một ca bệnh được ghi nhận là NKBV một cách khoa học, hệ thống phần mềm (hoặc giám sát viên KSNK) phải chạy qua bộ lọc logic 7 bước sau đây. Quy trình này áp dụng chung cho mọi loại nhiễm khuẩn (trừ Nhiễm khuẩn vết mổ và Biến cố thở máy có bộ luật riêng).

**Bước 1: Sàng lọc tín hiệu (Triggering)**

* Máy tính quét dữ liệu tìm kiếm sự xuất hiện của ít nhất 1 trong 3 yếu tố: Triệu chứng lâm sàng (sốt, tụt HA, chảy mủ...), Kết quả vi sinh (cấy dương tính), hoặc Chẩn đoán hình ảnh (X-quang bất thường).  
* *Luật:* Nếu không có yếu tố nào \-\> Dừng, không phải sự kiện.

**Bước 2: Thiết lập Giai đoạn cửa sổ nhiễm khuẩn (IWP \- Infection Window Period)**

* Lấy ngày xuất hiện xét nghiệm chẩn đoán đầu tiên (hoặc triệu chứng đầu tiên) làm Ngày Mốc.  
* *Luật:* Phần mềm tự động dóng ra một khung **7 ngày** (Ngày mốc $\\pm$ 3 ngày). Tất cả các tiêu chuẩn để cấu thành một ca bệnh bắt buộc phải rơi vào lọt thỏm trong 7 ngày này. Nếu các triệu chứng rải rác ngoài 7 ngày \-\> Hủy ca bệnh.

**Bước 3: Xác định Ngày sự kiện (DOE \- Date of Event)**

* *Luật:* Quét trong khung IWP 7 ngày đó, ngày xuất hiện yếu tố chẩn đoán đầu tiên (có thể là ngày sốt, hoặc ngày cấy vi sinh) sẽ được chốt làm Ngày sự kiện (DOE). Ngày DOE này là tọa độ gốc để tính toán các bước sau.

**Bước 4: Lọc trùng lặp bằng Khung thời gian sự kiện (RIT \- Repeat Infection Timeframe)**

* *Luật:* Ngay khi DOE được xác định, hệ thống khóa một khung thời gian **14 ngày** (Từ DOE đến DOE \+ 13 ngày).  
* *Hành động:* Nếu trong 14 ngày này có cấy ra thêm vi khuẩn mới tại cùng một vị trí, tuyệt đối không tạo ca bệnh NKBV thứ hai. Vi khuẩn mới chỉ được gắn thêm (append) vào hồ sơ của ca bệnh cũ. Điều này triệt tiêu tình trạng đếm trùng ca bệnh.

**Bước 5: Phân loại theo thời gian (POA vs. HAI)**

* *Luật:* Làm phép trừ giữa Ngày sự kiện (DOE) và Ngày nhập viện (được tính là Ngày 1).  
* Nếu DOE xảy ra vào Ngày 1 hoặc Ngày 2 \-\> Khóa hồ sơ là Nhiễm khuẩn lúc nhập viện (POA), miễn trừ lỗi cho bệnh viện.  
* Nếu DOE xảy ra từ Ngày 3 trở đi \-\> Chuyển sang Nhiễm khuẩn bệnh viện (HAI), tiếp tục quy kết trách nhiệm.

**Bước 6: Quy kết Nhiễm khuẩn huyết thứ phát (Secondary BSI Filter)**

* *Mục đích:* Bảo vệ Khoa Hồi sức khỏi việc bị phạt oan lỗi CLABSI do vi khuẩn từ phổi/đường tiểu chui vào máu.  
* *Luật:* Thiết lập Khung thời gian quy kết (SBAP) từ 14 \- 17 ngày (bằng IWP \+ RIT) của ổ nhiễm khuẩn tại chỗ (VAP/CAUTI/SSI). Nếu NB có cấy máu (+) với tác nhân trùng khớp với tác nhân tại chỗ lọt trong SBAP \-\> Quy kết đây là Nhiễm khuẩn huyết thứ phát.

**Bước 7: Quy tắc Chuyển khoa (LOA \- Transfer Rule)**

* *Luật:* Để phạt lỗi đúng khoa, hệ thống lấy DOE trừ đi Ngày chuyển khoa.  
* Nếu DOE rơi vào đúng ngày chuyển khoa hoặc ngày ngay sau ngày chuyển khoa \-\> Lỗi NKBV thuộc về **Khoa chuyển đi**.  
* Nếu từ ngày thứ 3 trở đi sau khi chuyển khoa \-\> Lỗi thuộc về **Khoa hiện tại**.

Cách thức này loại bỏ hoàn toàn sự tranh cãi giữa các khoa lâm sàng, ép buộc mọi dữ liệu phải đi qua bộ lọc "Ngày lịch" (Calendar Day) của hệ thống máy tính, đảm bảo hồ sơ dữ liệu minh bạch, đáp ứng tuyệt đối tiêu chuẩn quản lý rủi ro và xác thực dữ liệu của JCI/ISO.

