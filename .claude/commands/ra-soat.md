---
description: Rà module đã có theo 10 bước vòng đời — tự trả lời điều đã rõ, gom hỏi PO một lần
argument-hint: "<module: giam-sat|cssd|nkbv|qlcv|dao-tao>"
---

# /ra-soat — Rà module theo 10 bước (không phỏng vấn lại từ đầu)

**Đầu vào:** $ARGUMENTS · **Không sửa code.** Chỉ ghi mục 8 của `docs/modules/<m>/van-de-nguoi-dung.md`.

Bước: 1 vấn đề · 2 giải pháp · 3 phạm vi MVP · 4 yêu cầu/DoD · 5 thiết kế · 6 xây lát · 7 kiểm chứng · 8 chạy thử · 9 phát hành/vận hành · 10 đo & lặp.

1. `npm run module:audit -- <m>` và `npm run module:gate -- <m>` (bằng chứng cơ học).
2. Bước còn «?»: giao `explore-module` (chế độ «Rà vòng đời») một lần, nêu rõ bước cần bằng chứng. Việc < 3 lần đọc file thì tự làm.
3. Chấm mỗi bước: **hợp / lệch / thiếu**, kèm `file:dòng` hoặc câu `[SSOT]`. Điều trang module, SSOT hoặc code đã trả lời thì **tự điền, không hỏi**. Điều PO đã trả lời (nhãn `[SSOT]` PO ngày…) không hỏi lại.
4. Ghi bảng 10 dòng vào mục «8. Rà vòng đời (ngày)» của trang (thay phần rà cũ, không tạo file mới).
5. Trả MỘT khối **Câu hỏi PO** (chỉ bước lệch/thiếu mà code/SSOT không tự trả lời được). Mỗi câu: bước · thiếu gì · đáp án mặc định · hệ quả nếu PO im. Không hỏi quy mô, điều đã có trong app, hay câu chung chung.
6. PO trả lời → ghi vào trang với nhãn `[SSOT]` + ngày; chỉ PO đổi `Trạng thái:`.
