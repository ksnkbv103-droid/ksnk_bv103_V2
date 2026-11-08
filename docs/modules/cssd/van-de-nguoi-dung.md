# CSSD — Vấn đề & giá trị

> Bước 1–2 vòng đời sản phẩm. Chỉ trỏ SSOT, không chép nghiệp vụ. Nhãn: `[SSOT]` đã chốt · `[GIẢ THUYẾT]` suy từ domain, chưa kiểm · `[CẦN XÁC NHẬN]` hỏi người dùng thật · `[ĐỀ XUẤT]` ngưỡng chờ PO sửa.
> Nghiệp vụ: [`domain-overview.md`](domain-overview.md) · Mức sẵn sàng: [`handover-roadmap.md`](../../core/handover-roadmap.md) §5.

## 1. Ai dùng
- Tổ CSSD quét tem qua 6 trạm, chạy mẻ tiệt khuẩn, cấp phát cho khoa. `[SSOT]` domain-overview §3.
- Đầu mối: Nguyễn Thanh Bình. `[SSOT]` PO 2026-10-31. Số người thao tác, ca trực. `[CẦN XÁC NHẬN]`
- Khoa lâm sàng nhận bộ dụng cụ; KSNK xem sự cố/truy vết. `[GIẢ THUYẾT]`

## 2. Hiện làm thế nào (không có app)
- Theo quy trình PCI QT.18–25. `[SSOT]` domain-overview. Thực tế ghi sổ giấy/Excel hay không, ghi những gì, ở trạm nào. `[CẦN XÁC NHẬN]`

## 3. Nỗi đau (giả thuyết, xếp theo mức)
1. Truy vết bộ dụng cụ → mẻ → khoa khi có BI dương/sự cố chậm và dễ thiếu. `[GIẢ THUYẾT]` luật thu hồi theo `lo_tiet_khuan_id` đã chốt. `[SSOT]` §5 mục 3, 11.
2. Thiếu cấu phần trong bộ phát hiện muộn. `[SSOT]` §5 mục 1 (cảnh báo, không chặn).
3. Nhập liệu trạm làm chậm công việc nặng tay. `[GIẢ THUYẾT]` cần đo thời gian một lần quét.

## 4. Giải pháp đang có
- 6 trạm, phiếu mẻ, in tem, sự cố, kho, bảo trì máy. `[SSOT]` domain-overview §3, §6, §7.
- Mới chạy tay K1–K5 trên DB local do Claude chạy thay tổ CSSD; chưa phải người dùng thật. `[SSOT]` handover-roadmap §5.

## 5. Tiêu chí «có ích» (đo được)
- Truy vết một bộ từ mã tem tới mẻ và khoa dưới 2 phút. `[ĐỀ XUẤT]`
- Một lần quét/chuyển trạm dưới 10 giây. `[ĐỀ XUẤT]` đo thực tế mục 3.3.
- Không còn bước ghi trùng ra giấy cho trạm đã chạy app. `[ĐỀ XUẤT]`
- ≥ N chu trình thật/tuần trong 4 tuần. `[ĐỀ XUẤT]` hiện 10 chu trình thử. `[SSOT]` roadmap §5.

## 6. Kịch bản xác nhận
Hỏi đầu mối (15 phút):
1. Một ca làm việc ghi những gì, vào đâu?
2. Lần gần nhất phải tìm lại một bộ/mẻ, mất bao lâu?
3. Bước nào hay sai hoặc hay quên?
4. App làm chậm hay nhanh hơn cách hiện tại, ở trạm nào?
5. Điều kiện nào để tổ chịu bỏ sổ giấy?
Ba kịch bản tay: K1–K5 trong [`18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md`](18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md), chạy lại với người của tổ. `[SSOT]`

## 7. Quyết định `[ĐỀ XUẤT]`
- Tiếp tục: tổ tự nhập ≥ N chu trình/tuần, 4 tuần, truy vết đạt mục 5.
- Thu hẹp: chỉ giữ trạm/mẻ tổ thật sự dùng, dừng phần còn lại.
- Dừng/đóng băng: tổ vẫn ghi giấy sau 4 tuần.
- Chủ quyết định: PO. Ngày xem lại: `[CẦN XÁC NHẬN]`.
