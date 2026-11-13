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

## 8. Rà vòng đời (2026-11-09)
Bằng chứng cơ học: `npm run module:audit -- nkbv`. Phạm vi đóng băng ở ghi ca + danh sách + tỉ lệ (roadmap §5).

| Bước | Chấm | Bằng chứng |
|---|---|---|
| 1 Vấn đề | **thiếu** | chưa có đầu mối; mục 2 chưa biết cách theo dõi ca hiện nay |
| 2 Giải pháp | hợp | route `/giam-sat-nkbv`, quy trình trạng thái (mục 4) |
| 3–4 MVP, DoD | hợp | đóng băng PO, 17 file docs (domain-specification, HAI) |
| 5–7 Thiết kế, xây, kiểm chứng | hợp | 21 action, 79 spec (nhiều nhất các module) |
| 8 Chạy thử | **thiếu** | 1 phiếu trên prod, chưa có kịch bản tay ghi lại, chưa có người dùng |
| 9–10 Vận hành, đo | **thiếu** | chưa có ai dùng nên chưa đo |

### Câu hỏi PO
1. **Đầu mối KSNK chuyên trách** (bước 1): tên? Mặc định: giữ KHÁM_PHÁ, không mở lát mới. Đây là điều chặn mọi bước sau.
2. **Cách theo dõi ca hiện nay** (bước 1): sổ hay Excel, ai quyết định, mất mấy ngày từ XN dương tới kết luận? Mặc định: giữ `[GIẢ THUYẾT]`.
3. Có người chạy thử 10 ca thật (mục 5) khi có đầu mối? Mặc định: chưa lên lịch.

### Cập nhật 2026-11-13
- `module:audit`: 4/10 (Có 3, 4, 6, 7); 31 action, 91 spec. `module:gate`: KHÁM_PHÁ, đầu mối CHƯA CÓ (vẫn chặn mọi bước sau).
- Sổ lỗi: 24 dòng — 22 đã sửa, 2 chờ PO: NKBV-018 (người chỉ có quyền xem CSSD thấy mã ca + họ tên BN qua tra RCA ngược — có phải thiết kế?), NKBV-023 (xóa mềm ẩn được ca đã XAC_NHAN/LOAI_TRU). Thử tay ĐẠT 5, CHƯA 8 (phần lớn cần tài khoản GSC/Mạng lưới chưa có fixture), 0 không đạt.
- Còn nợ: `updateNkbvBenhAnStay` không kiểm khoa mới trong phạm vi; NKBV-013..016 chưa qua reviewer độc lập; NKBV-021 (chuyển khoa) chờ PO. Mã chết báo, không xóa: `NkbvBaGridCasePrintView.tsx`.
- Câu hỏi PO 1–3 ở trên chưa trả lời; thêm: trạng thái thật của module (KHÁM_PHÁ nhưng nhiều commit `feat`).
