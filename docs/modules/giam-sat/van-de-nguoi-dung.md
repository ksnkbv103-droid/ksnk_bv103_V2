# Giám sát (VST/GSC) — Vấn đề & giá trị

Trạng thái: CHẠY_THỬ
Đầu mối: CHƯA CÓ

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

## 8. Rà vòng đời (2026-11-09)
Bằng chứng cơ học: `npm run module:audit -- giam-sat`. Module duy nhất có người dùng thật.

| Bước | Chấm | Bằng chứng |
|---|---|---|
| 1–2 Vấn đề, giải pháp | hợp, thiếu số «trước» | mục 2 chưa có cách ghi/thời gian tổng hợp cũ nên chưa so được «sau app» (mục 5) |
| 3–4 MVP, DoD | hợp | Khóa PO 2026-10-09, README, 10 nhãn `[SSOT]` |
| 5 Thiết kế | hợp | nhập/lịch sử/thống kê/in đủ (mục 4); KPI RPC khớp tay 2026-10-24 |
| 6–7 Xây, kiểm chứng | hợp | 27 action, 37 spec |
| 8 Chạy thử | hợp | đã có người dùng thật |
| 9 Vận hành | **thiếu** | chưa ghi ai hỗ trợ, ai khóa sổ, khi lỗi báo ai |
| 10 Đo | **thiếu** | chưa đo thời gian nhập một phiếu (<60 s) và số phiên/tuần |

### Câu hỏi PO
1. **Đầu mối + số người nhập/tuần** (bước 1): tên? Mặc định: ghi «chưa có tên», module vẫn CHẠY_THỬ.
2. **Số «trước khi dùng app»** (bước 2/10): trước đây tổng hợp một kỳ mất bao lâu, ai làm? Mặc định: không đo, bỏ tiêu chí mục 5 dòng 3.
3. **N phiên VST/tuần** (bước 10): chọn N? Mặc định: lấy trung bình 4 tuần gần nhất làm mốc.
4. **Vận hành** (bước 9): ai nhận báo lỗi? Mặc định: bất kỳ ai báo, như CSSD.

### Cập nhật 2026-11-13
- `module:audit`: 5/10 (Có 3, 4, 6, 7, 8); 36 action, 42 spec. `module:gate`: CHẠY_THỬ, đầu mối CHƯA CÓ.
- Sổ lỗi (`so-loi.mjs`): 13 dòng — 8 đã sửa, 3 lỗi giả, 1 hoãn (VST-009), 1 chờ PO (VST-013). Thử tay ĐẠT 4 trên DB local (:3001), 0 không đạt.
- VST-003 (RLS đọc phiên theo phạm vi) đã sửa ở local, chưa áp prod: nằm trong lô migration prod chờ PO.
- Bước 9, 10 vẫn **thiếu**; câu hỏi PO 1–4 ở trên chưa trả lời.
