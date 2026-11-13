# Báo cáo tổng thể KSNK BV103 — 2026-11-13

Thay thế [`BAO-CAO-RA-SOAT-2026-11-05.md`](BAO-CAO-RA-SOAT-2026-11-05.md) và [`BAO-CAO-CAI-TO-2026-11-06.md`](BAO-CAO-CAI-TO-2026-11-06.md) làm **bản nhìn tổng thể hiện hành** (hai bản cũ giữ làm chứng cứ chi tiết). Nhánh `integrate/2026-11` @ `923901e6`.

**Phạm vi có chủ ý:** không quét lại code. Mã đã được rà 2 đợt (15 + nhiều agent) và có sổ lỗi 112 dòng (93 đã sửa, 2 mở, 0 Nghiêm trọng/Cao mở). Quét thêm chính là vòng lặp cần dừng. Báo cáo này đo **quy trình và đường đi tới người dùng** — chỗ đang tắc.

## 1. Kết luận

**Nút thắt không còn nằm ở code.** Ba nguyên nhân gốc, có số đo:

1. **Sửa xong nhưng không tới tay người dùng.** `integrate/2026-11` đi trước `origin/main` **385 commit**; merge cuối vào main 2026-11-10. Prod còn thiếu ~32 migration. Module duy nhất có người dùng thật (VST/GSC) **chưa nhận được gì** từ 2 tuần sửa lỗi.
2. **Công sức đổ vào module không có người dùng.** Từ quyết định PO 2026-11-06 («dồn VST/GSC/thống kê, sau đó CSSD; NKBV/QLCV/Đào tạo ưu tiên thấp»): CSSD 81 commit, NKBV 44, QTHT 36, Đào tạo 16, QLCV 10 — so với **VST + GSC + thống kê chỉ 40**. 4/5 module chưa có đầu mối; `module:audit` tự ghi «sửa mã không nâng được điểm».
3. **Chi phí quy trình tăng nhanh hơn sản phẩm.** Từ 11-06: 405 commit, trong đó docs 103, `scripts/readiness` 85, HANDOFF 56. Roadmap 66 KB (mục tiêu 25 KB). 5 worktree, 46 nhánh, checkout chính nằm ở nhánh cũ có file rời chưa track → mỗi phiên mới phải «định vị lại».

Hệ quả: chạy vòng «rà → sổ lỗi → sửa → thử tay local → rà» khép kín trên local, không có đầu ra ở prod, không có phản hồi người dùng để biết vòng nào đáng chạy.

## 2. Bảng module

| Module | Dòng TS | Spec | Dữ liệu prod (11-06, cũ) | Cổng | Đầu mối | Lỗi mở | Commit từ 11-06 | Đề xuất |
|---|---|---|---|---|---|---|---|---|
| VST | 6.680 | 19 | 3.609 phiên, 33k dòng fact | CHẠY_THỬ | chưa ghi tên | 0 | 14 | **Tiếp – ưu tiên 1**: deploy, đo bước 9–10 |
| GSC | 13.444 | 24 | 1.388 phiên | CHẠY_THỬ | chưa ghi tên | 0 | 16 | **Tiếp – ưu tiên 1** |
| Thống kê/báo cáo | 7.169 | 9 | đọc VST/GSC | (theo giám sát) | — | 0 | 10 | Tiếp: trang «Vệ sinh tay» theo chuyên đề |
| CSSD (erp + sự cố) | 47.990 | 70 | chỉ danh mục; kho 0 | XÂY | Nguyễn Thanh Bình | 2 (CSSD-004 DB, NEN-003) | 81 | **Tiếp – ưu tiên 2** nhưng chỉ sau 3 kịch bản thật với đầu mối |
| NKBV | 61.675 | 94 | ~2.600 dòng, gần như không thao tác | KHÁM_PHÁ | chưa có | 0 | 44 (12 `feat` từ 11-09) | **Đóng băng tính năng** đến khi có đầu mối |
| QLCV | 15.588 | 27 | 1 nhiệm vụ, 0 công việc | XÁC_NHẬN | chưa có | 0 | 10 | Đóng băng tính năng |
| Đào tạo | 5.918 | 5 | 787 câu, 1 lần thi | KHÁM_PHÁ | chưa có | 0 | 16 | Đóng băng tính năng |
| QTHT (nền) | 7.357 | 16 | 36 nhân sự, 66 khoa | — | — | 0 | 36 | Giữ; chỉ sửa khi chặn module ưu tiên |
| Chất thải/đồ vải | 2.574 | 2 | ? | — | — | 0 | 1 | Ngoài lộ trình (PO 11-06 câu 8) |

Đánh giá chất lượng mã (từ 2 đợt rà + sổ lỗi, không đo lại): kiến trúc DDD theo module nhất quán; quyền/RLS đã qua 2 vòng sửa (17 finding P0 đóng); khóa PO VST giữ đúng; NKBV bám SSOT CDC/NHSN (RIT/IWP/SBAP, Transfer Rule). Điểm yếu còn lại: hai nguồn công thức KPI (RPC + TS, có spec chống lệch), ~3.000 dòng mã chết chưa xóa, 59 warning lint. **Không có lỗi mã nào chặn pilot VST/GSC.**

## 3. Quy trình đề ra vs thực tế

| Đã đề ra | Thực tế | Đánh giá |
|---|---|---|
| PO 11-06: 90 ngày dồn VST/GSC/thống kê | 40/~238 lượt commit-module vào nhóm ưu tiên (~17%) | **Lệch** |
| Cổng KHÁM_PHÁ: «không mở lát tính năng» | NKBV 12 `feat` từ 11-09 (luật cấy máu, CĐHA, BSI) | **Lệch** |
| CLAUDE.md: mỗi module cần người dùng + kịch bản tay trước khi «xong» | 36 kịch bản tay đạt, **tất cả do Claude chạy trên local**, không người dùng thật | Đúng hình thức, thiếu thực chất |
| Local là bản gốc, push/deploy hỏi từng lần | Đúng — nhưng 13 ngày chưa có lần hỏi deploy nào được chốt | Quy tắc đúng, thiếu nhịp |
| 30 ngày (11-06 §⑥): (a) từ điển KPI + tính tay ≥3 KPI | Có chỉnh `metric-dictionary` (378b53d4); **chưa thấy** bản tính tay ghi lại | Chưa xong |
| (b) `must_change_password` | Đã sửa (680caa5b, 60dab610) | Xong (local) |
| (c) diff migration theo nội dung → danh sách áp prod | Có danh sách 31 file; NEN-003 lệch version chờ MCP | Gần xong, kẹt MCP |
| (d) danh sách mã chết cho PO | Chưa lập; HANDOFF chỉ «báo, không xóa» 3 mục | Chưa làm |
| `docs/core` ≤13 file, roadmap ≤25 KB | 13 file đúng; roadmap 66 KB | **Lệch** |
| Một agent ghi một lúc, một phiên một mục tiêu | 5 worktree song song, nhánh chính cũ | **Lệch** |

Điểm rườm rà cụ thể: 120 npm script (11-06: 114); bộ công cụ đo sẵn sàng (`so-loi`, `module:gate`, `module:audit`) sinh từ 11-11 đo đúng nhưng **không có cơ chế buộc làm theo kết quả**; 4 file «trạng thái» chồng nhau (HANDOFF, SO_NO, roadmap §5, BAO-CAO-*) — mỗi phiên đọc lại cả bốn.

## 4. Biện pháp (theo thứ tự đòn bẩy)

Mỗi mục: ai làm · xong khi · luật dừng.

1. **Đưa bản sửa lên prod (đòn bẩy lớn nhất).** PO: authorize MCP Supabase + Vercel (`/mcp`), duyệt lô. Claude: áp 32 migration theo thứ tự ở `git show ae5ca6fd:HANDOFF.md` dòng 25–30 (xử lý NEN-003 trước), merge `integrate/2026-11` → `main`, deploy, smoke test 3 kịch bản VST/GSC trên prod. **Xong khi:** prod chạy sha mới, 3 kịch bản đạt, `list_migrations` khớp repo. **Dừng:** một migration lỗi → dừng lô, không deploy mã.
2. **Một nhánh, một checkout.** Claude: sau bước 1, chuyển checkout chính về `main`, đóng 3 worktree cũ (hỏi trước những cái có thay đổi chưa commit), file rời ở gốc (`*.xlsx`, `*.py`, `scripts/sql/seed_*`) → PO quyết giữ/bỏ. **Xong khi:** `git worktree list` = 1–2 dòng, hook «SAI CÂY MÃ» im.
3. **Đóng băng cứng theo cổng.** Module chưa có đầu mối: chỉ sửa lỗi lộ dữ liệu/sai số liệu; không `feat`. **Đo:** `git log --since=<ngày> --format=%s -- src/modules/giam-sat-nkbv src/modules/dao-tao src/modules/quan-ly-cong-viec | grep -c ^feat` = 0. Nên thành hook chặn commit `feat(nkbv|qlcv|dao-tao)` khi gate ≠ CHẠY_THỬ/XÂY.
4. **VST/GSC: đo với người thật (bước 9–10).** PO: ghi tên đầu mối + người hỗ trợ/khóa sổ. Claude: chuẩn bị phiếu 15 phút (đã có ở `docs/modules/giam-sat/van-de-nguoi-dung.md` §6) + truy vấn số phiên/tuần trên prod. **Xong khi:** có số phiên/tuần 4 tuần, thời gian nhập 1 phiếu đo trên điện thoại thật, danh sách góp ý → thành lát sửa.
5. **CSSD: 3 kịch bản thật với đầu mối** (Nguyễn Thanh Bình) trên prod sau bước 1. Không thêm tính năng CSSD trước khi có kết quả.
6. **Dừng mở rộng công cụ quy trình.** Không thêm script/sổ/cổng mới; roadmap §5 cắt về ≤25 KB (đẩy lịch sử vào git). Một file trạng thái duy nhất cho phiên mới: HANDOFF (≤6 KB) trỏ sổ lỗi.

Nhịp đề xuất: **mỗi tuần một lần deploy** (thứ Sáu), không để local đi trước prod quá 1 tuần.

## 5. Quyết định cần PO (mặc định nếu im)

1. Duyệt lô migration + deploy ở mục 4.1? — *Mặc định: không làm (cần PO chủ động).*
2. Tên đầu mối VST/GSC (và NKBV/QLCV/Đào tạo nếu có)? — *Mặc định: 3 module kia đóng băng tính năng.*
3. Đóng băng tính năng NKBV/QLCV/Đào tạo bằng hook? — *Mặc định: có, chỉ cho `fix`/`docs`.*
4. Dọn worktree + file rời ở gốc checkout chính? — *Mặc định: liệt kê, chờ PO chọn, không xóa.*
5. Nhịp deploy hàng tuần? — *Mặc định: có, mỗi lần vẫn hỏi.*

## 6. Chưa kiểm

- Số liệu prod là của 2026-11-06 (MCP Supabase chưa authorize); sha đang chạy trên Vercel chưa xác minh.
- Không đọc lại mã; đánh giá chất lượng dựa trên 2 báo cáo cũ + sổ lỗi.
- Đếm commit theo đường dẫn: một commit chạm nhiều module được đếm ở mỗi module.
- Số người dùng thật hoạt động (11-06: 4 người đăng nhập 30 ngày) chưa đo lại.
