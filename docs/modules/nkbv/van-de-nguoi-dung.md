# NKBV — Vấn đề & giá trị

Trạng thái: KHÁM_PHÁ
Đầu mối: CHƯA CÓ

> Bước 1–2 vòng đời sản phẩm. Chỉ trỏ SSOT, không chép nghiệp vụ. Nhãn: `[SSOT]` đã chốt · `[GIẢ THUYẾT]` suy từ domain, chưa kiểm · `[CẦN XÁC NHẬN]` hỏi người dùng thật · `[ĐỀ XUẤT]` ngưỡng chờ PO sửa.
> Nghiệp vụ: [`domain-specification.md`](domain-specification.md) · Mức sẵn sàng: [`handover-roadmap.md`](../../core/handover-roadmap.md) §5.

## 1. Ai dùng
- Cán bộ KSNK chuyên trách tạo phiếu, thẩm định, xác nhận/loại trừ ca. `[SSOT]` domain-specification §4.2.
- Bác sĩ/điều dưỡng khoa lâm sàng điền form cho ca thuộc khoa mình. `[SSOT]` §4.2.
- Khoa Vi sinh nhập/import kết quả cấy dương tính. `[SSOT]` §4.2.
- Đầu mối: chưa có. `[SSOT]` roadmap §5. Đây là rủi ro lớn nhất của module. Cần tên người. `[CẦN XÁC NHẬN]`

## 2. Hiện làm thế nào (không có app)
- Theo dõi ca NKBV bằng sổ/Excel, tính tỉ lệ cuối kỳ. `[GIẢ THUYẾT]` Cách phát hiện ca, ai quyết định, mất bao lâu từ XN dương tới kết luận. `[CẦN XÁC NHẬN]`

## 3. Nỗi đau (giả thuyết, xếp theo mức)
1. Ca phát hiện muộn hoặc bỏ sót vì phải đối chiếu vi sinh, bệnh án, thiết bị bằng tay theo cửa sổ ngày NHSN. `[GIẢ THUYẾT]` domain-specification §1, §2.
2. Phân loại HAI/POA không thống nhất giữa người. `[GIẢ THUYẾT]` thuật toán đã có. `[SSOT]` `hai-surveillance-domain-ssot-20260827.md`.
3. Tỉ lệ NKBV theo khoa không tính nhanh được. `[GIẢ THUYẾT]` PO đóng băng ở mức ghi ca + danh sách + tỉ lệ. `[SSOT]` roadmap §5.

## 4. Giải pháp đang có
- Route `/giam-sat-nkbv`: bảng phân tích, tạo phiếu, quy trình trạng thái `DANG_GHI_NHAN` → `XAC_NHAN`/`LOAI_TRU`. `[SSOT]` §4.1.
- Không có API HIS/LIS; vi sinh và bệnh án nhập bằng copy/gõ tay. `[SSOT]` §1. Mới có 1 phiếu trên prod. `[SSOT]` roadmap §5.

## 5. Tiêu chí «có ích» (đo được)
- Ghi một ca từ dữ liệu copy tới phiếu dưới 5 phút. `[ĐỀ XUẤT]`
- Kết luận HAI/POA của app khớp kết luận tay của chuyên gia KSNK trên ≥ 10 ca thật. `[ĐỀ XUẤT]`
- Tỉ lệ NKBV theo khoa/kỳ khớp tính tay. `[ĐỀ XUẤT]`
- Có ít nhất một người dùng KSNK dùng đều đặn 4 tuần. `[ĐỀ XUẤT]`

## 6. Kịch bản xác nhận
Hỏi đầu mối (15 phút):
1. Một ca nghi NKBV được phát hiện và kết luận thế nào, mất mấy ngày?
2. Hiện lưu ca ở đâu, ai xem?
3. Phần nào tốn công nhất: gom dữ liệu, áp tiêu chí hay báo cáo?
4. Có chấp nhận nhập tay/copy (không có HIS/LIS) không?
5. Ai khoa lâm sàng sẽ điền form, họ có thời gian không?
Ba kịch bản tay: chưa có kịch bản được ghi. Cần viết khi có đầu mối. `[CẦN XÁC NHẬN]`

## 7. Quyết định `[ĐỀ XUẤT]`
- Tiếp tục: có đầu mối và ≥ 10 ca thật khớp tay.
- Thu hẹp: chỉ giữ ghi ca + danh sách + tỉ lệ (đang là mức đóng băng).
- Dừng/đóng băng: chưa có đầu mối sau 4 tuần, không mở thêm lát.
- Chủ quyết định: PO. Ngày xem lại: `[CẦN XÁC NHẬN]`.
