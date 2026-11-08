# QLCV — Vấn đề & giá trị

Trạng thái: XÁC_NHẬN
Đầu mối: CHƯA CÓ

> Bước 1–2 vòng đời sản phẩm. Chỉ trỏ SSOT, không chép nghiệp vụ. Nhãn: `[SSOT]` đã chốt · `[GIẢ THUYẾT]` suy từ domain, chưa kiểm · `[CẦN XÁC NHẬN]` hỏi người dùng thật · `[ĐỀ XUẤT]` ngưỡng chờ PO sửa.
> Nghiệp vụ: [`19-QLCV-DOMAIN-SSOT.md`](19-QLCV-DOMAIN-SSOT.md) · Mức sẵn sàng: [`handover-roadmap.md`](../../core/handover-roadmap.md) §5.

## 1. Ai dùng
- Nhóm KSNK: người giao, người làm chính (đúng 1 người), người phối hợp, người duyệt. `[SSOT]` §2, §4.
- Phạm vi chỉ nội bộ khoa KSNK, không giao việc cho khoa lâm sàng. `[SSOT]` §2 «Scope runtime».
- Đầu mối: nhóm KSNK, chưa ghi tên. `[SSOT]` roadmap §5. Số người, ai là lãnh đạo xem báo cáo. `[CẦN XÁC NHẬN]`

## 2. Hiện làm thế nào (không có app)
- Giao việc qua Zalo/miệng/họp, theo dõi bằng trí nhớ hoặc sổ. `[GIẢ THUYẾT]` Công cụ nào, việc nào hay bị quên, ai nhắc. `[CẦN XÁC NHẬN]`

## 3. Nỗi đau (giả thuyết, xếp theo mức)
1. Không rõ người–việc–hạn–tiến độ của từng việc đang mở. `[SSOT]` §1 «sáu câu quan sát».
2. Việc quá hạn phát hiện muộn, không có số quá hạn theo người/kỳ. `[SSOT]` §6.
3. Việc định kỳ (hằng tuần/tháng) bị quên. `[GIẢ THUYẾT]` đã có mẫu định kỳ tự sinh việc. `[SSOT]` §2.

## 4. Giải pháp đang có
- Tạo việc tối giản (`tieu_de` + 1 người + hạn khi đột xuất/khẩn), list/Kanban, tab Báo cáo theo kỳ. `[SSOT]` quyết định 09/2026, §6.
- QL-1 đã chốt: xóa mềm, ghi chú theo người tạo. `[SSOT]` roadmap §5 (2026-10-24). Hiện 0 việc trên prod. `[SSOT]` roadmap §5.

## 5. Tiêu chí «có ích» (đo được)
- Tạo một việc dưới 30 giây. `[ĐỀ XUẤT]`
- Mọi việc mở trả lời đủ: ai giao, ai làm, hạn, tiến độ. `[SSOT]` §1.
- Số quá hạn theo người khớp đếm tay. `[ĐỀ XUẤT]`
- Cả nhóm giao việc qua app, không qua Zalo, ≥ N việc/tuần trong 4 tuần. `[ĐỀ XUẤT]`

## 6. Kịch bản xác nhận
Hỏi nhóm (15 phút):
1. Tuần trước nhóm có bao nhiêu việc, theo dõi bằng gì?
2. Việc nào bị quên/trễ gần nhất, vì sao?
3. Ai cần nhìn tổng việc, họ cần xem gì?
4. Giao việc bằng app thay Zalo có phiền không?
5. Việc định kỳ nào lặp mỗi tuần/tháng?
Ba kịch bản tay: tạo việc → giao → hoàn thành → xem báo cáo theo người. Cần viết đủ ba. `[CẦN XÁC NHẬN]`

## 7. Quyết định `[ĐỀ XUẤT]`
- Tiếp tục: nhóm giao ≥ N việc/tuần qua app trong 4 tuần.
- Thu hẹp: chỉ giữ tạo việc + danh sách + quá hạn, bỏ Kanban/định kỳ nếu không ai dùng.
- Dừng/đóng băng: nhóm vẫn dùng Zalo sau 4 tuần.
- Chủ quyết định: PO. Ngày xem lại: `[CẦN XÁC NHẬN]`.
