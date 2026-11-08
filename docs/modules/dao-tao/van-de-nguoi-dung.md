# Đào tạo / Thi KSNK — Vấn đề & giá trị

Trạng thái: KHÁM_PHÁ
Đầu mối: CHƯA CÓ

> Bước 1–2 vòng đời sản phẩm. Chỉ trỏ SSOT, không chép nghiệp vụ. Nhãn: `[SSOT]` đã chốt · `[GIẢ THUYẾT]` suy từ domain, chưa kiểm · `[CẦN XÁC NHẬN]` hỏi người dùng thật · `[ĐỀ XUẤT]` ngưỡng chờ PO sửa.
> Nghiệp vụ: [`domain-overview.md`](domain-overview.md) · Mức sẵn sàng: [`handover-roadmap.md`](../../core/handover-roadmap.md) §5.

## 1. Ai dùng
- Nhân viên bệnh viện làm bài ôn tập/thi chính thức theo kỳ đã gán khoa hoặc cá nhân. `[SSOT]` domain-overview §5.
- Quản trị (quyền `DAO_TAO` sửa) soạn ngân hàng câu, mở kỳ, xem sổ kết quả, xuất Excel. `[SSOT]` §1, §5.2.
- Đầu mối: chưa có. `[SSOT]` roadmap §5. Cần tên người và số nhân viên phải thi mỗi năm. `[CẦN XÁC NHẬN]`

## 2. Hiện làm thế nào (không có app)
- Kiểm tra kiến thức KSNK bằng giấy/Google Form/hỏi miệng khi tập huấn. `[GIẢ THUYẾT]` Ai ra đề, chấm, lưu kết quả ở đâu, bao lâu một lần. `[CẦN XÁC NHẬN]`

## 3. Nỗi đau (giả thuyết, xếp theo mức)
1. Chấm bài và tổng hợp kết quả theo khoa tốn công. `[GIẢ THUYẾT]` sổ kết quả kỳ + xuất Excel đã có. `[SSOT]` §1.
2. Không biết ai chưa thi/chưa đạt trong kỳ. `[SSOT]` sổ «chưa nộp».
3. Bài thi chính thức không đáng tin nếu lộ đáp án/nộp trễ. `[SSOT]` PO chốt 2026-10-24: nộp trễ > 30 giây = không đạt; thi thử ẩn đáp án đến khi nộp.

## 4. Giải pháp đang có
- Ngân hàng câu 4 loại, ôn tập theo mức, thi chính thức theo kỳ, chấm tự động, chứng chỉ logic có hạn. `[SSOT]` §3–§5, §8.
- Ranh giới cố ý hẹp: thi trắc nghiệm + sổ kết quả, không phải LMS. `[SSOT]` §1. Mới 1 lần thi trên prod. `[SSOT]` roadmap §5.

## 5. Tiêu chí «có ích» (đo được)
- Tổng hợp kết quả một kỳ trong dưới 10 phút, không chấm tay. `[ĐỀ XUẤT]`
- Một kỳ thật có ≥ 80% người được gán thi xong. `[ĐỀ XUẤT]`
- Điểm app khớp chấm tay trên 10 bài mẫu. `[ĐỀ XUẤT]`
- Người dùng làm hết bài trên điện thoại/máy bệnh viện không lỗi. `[CẦN XÁC NHẬN]`

## 6. Kịch bản xác nhận
Hỏi đầu mối (15 phút):
1. Năm nay cần kiểm tra KSNK cho bao nhiêu người, bằng cách nào?
2. Ai ra đề, ai chấm, mất bao lâu?
3. Có yêu cầu bắt buộc về chứng chỉ/ngưỡng đạt từ cấp trên không?
4. Thi ở đâu (máy tính khoa, điện thoại)?
5. Ngân hàng câu hiện có ở dạng nào, ai duy trì?
Ba kịch bản tay: ôn tập → thi kỳ chính thức → xem sổ kết quả/xuất Excel. Cần viết đủ ba. `[CẦN XÁC NHẬN]`

## 7. Quyết định `[ĐỀ XUẤT]`
- Tiếp tục: có đầu mối, chạy một kỳ thật ≥ 80% hoàn thành.
- Thu hẹp: chỉ giữ thi chính thức + sổ kết quả, bỏ ôn tập nếu không ai dùng.
- Dừng/đóng băng: không có kỳ thi thật nào trong 8 tuần.
- Chủ quyết định: PO. Ngày xem lại: `[CẦN XÁC NHẬN]`.

## 8. Rà vòng đời (2026-11-09)
Bằng chứng cơ học: `npm run module:audit -- dao-tao`. Trên prod 1 lần thi.

| Bước | Chấm | Bằng chứng |
|---|---|---|
| 1 Vấn đề | **thiếu** | chưa có đầu mối; số nhân viên phải thi, cách kiểm tra hiện nay còn `[GIẢ THUYẾT]` |
| 2–4 Giải pháp, MVP, DoD | hợp | domain-overview, ranh giới hẹp (thi trắc nghiệm + sổ kết quả) |
| 5–6 Thiết kế, xây | hợp | 5 action, ngân hàng 4 loại câu, chấm tự động |
| 7 Kiểm chứng | **thiếu** | chỉ 3 spec cho 27 file. DT-2 đã kiểm: nộp trễ quá 30 s = không đạt (`dao-tao-attempt.actions.ts:30,572`). «Thi thử ẩn đáp án đến khi nộp»: chưa kiểm, **chưa chắc** |
| 8 Chạy thử | **thiếu** | chưa có kỳ thi thật, ba kịch bản tay chưa viết đủ |
| 9–10 | **thiếu** | chưa có người dùng |

### Câu hỏi PO
1. **Đầu mối + số nhân viên thi/năm** (bước 1). Mặc định: giữ KHÁM_PHÁ.
2. **Ai ra đề, ai chấm, lưu ở đâu hiện nay** (bước 1). Mặc định: giữ `[GIẢ THUYẾT]`.
3. Cho Claude bổ sung spec cho đường chấm điểm và ẩn đáp án (bước 7, việc nhỏ, không đổi nghiệp vụ)? Mặc định: có.
