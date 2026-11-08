# Giám sát (VST/GSC) — Vấn đề & giá trị

> Bước 1–2 vòng đời sản phẩm. Chỉ trỏ SSOT, không chép nghiệp vụ. Nhãn: `[SSOT]` đã chốt · `[GIẢ THUYẾT]` suy từ domain, chưa kiểm · `[CẦN XÁC NHẬN]` hỏi người dùng thật · `[ĐỀ XUẤT]` ngưỡng chờ PO sửa.
> Nghiệp vụ: [`README.md`](README.md) · Mức sẵn sàng: [`handover-roadmap.md`](../../core/handover-roadmap.md) §5.

## 1. Ai dùng
- Điều dưỡng/giám sát viên nhập phiên VST (5 thời điểm WHO) và phiếu GSC (BM.07.02/03). `[SSOT]` README «3 kịch bản tay L1».
- Admin KSNK đặt ngày khóa sổ trước chốt báo cáo. `[SSOT]` README «Khóa sổ».
- Lãnh đạo khoa/KSNK xem số liệu trên Báo cáo tổng hợp. `[SSOT]` README «Báo cáo».
- Đầu mối: đã có người dùng thật, chưa ghi tên. `[CẦN XÁC NHẬN]` tên, số người nhập mỗi tuần.

## 2. Hiện làm thế nào (không có app)
- Ghi tay/Excel khi đi giám sát, tổng hợp cuối kỳ. `[CẦN XÁC NHẬN]` cách ghi, ai tổng hợp, mất bao lâu mỗi kỳ.

## 3. Nỗi đau (giả thuyết, xếp theo mức)
1. Tổng hợp tuân thủ cuối kỳ thủ công, dễ lệch số giữa các khoa. `[GIẢ THUYẾT]`
2. Quy tắc tính khác nhau giữa người (rửa/chà, bỏ sót, trần 2 thời điểm). `[SSOT]` Khóa PO 2026-10-09 đã thống nhất; còn kiểm có đúng nỗi đau thật không. `[CẦN XÁC NHẬN]`
3. Khoa ít mẫu bị đọc như số tin cậy. `[SSOT]` nhãn «chưa đủ mẫu» n<20.

## 4. Giải pháp đang có (prototype của bước 2 = app chạy được)
- Nhập: `/giam-sat-vst`, `/giam-sat-chung/tuan-thu` · Lịch sử: `/lich-su/gsc` · Thống kê: `/thong-ke/vst`, `/thong-ke/gsc` · In: `/bao-cao-tong-hop`. `[SSOT]` README «IA».

## 5. Tiêu chí «có ích» (đo được)
- Nhập một phiếu < 60 giây. `[SSOT]` README, kịch bản L1.
- KPI RPC khớp tính tay. `[SSOT]` README «Đối soát VST» (2026-10-24, DB local).
- Thời gian tổng hợp một kỳ sau khi dùng app thấp hơn trước khi dùng. `[ĐỀ XUẤT]` cần số «trước» từ mục 2.
- ≥ N phiên VST/tuần trong 4 tuần liên tiếp. `[ĐỀ XUẤT]` N do PO chọn.

## 6. Kịch bản xác nhận
Hỏi đầu mối (15 phút):
1. Trước khi có app, tổng hợp một kỳ mất bao lâu, ai làm?
2. Lần gần nhất số liệu bị lệch/phải làm lại là khi nào, vì sao?
3. Điều gì làm bạn quay lại ghi tay?
4. Khoa nào hay bị hỏi lại số liệu?
5. Nếu bỏ app, bạn mất gì?
Ba kịch bản tay: README «3 kịch bản tay L1» (đã bấm giờ). `[SSOT]`

## 7. Quyết định `[ĐỀ XUẤT]`
- Tiếp tục: đạt 3 tiêu chí đầu mục 5 sau 4 tuần.
- Thu hẹp: nhập vẫn < 60 giây nhưng ít người dùng, quay lại hỏi mục 6.
- Dừng/đóng băng: không ai nhập sau 4 tuần.
- Chủ quyết định: PO. Ngày xem lại: `[CẦN XÁC NHẬN]`.
