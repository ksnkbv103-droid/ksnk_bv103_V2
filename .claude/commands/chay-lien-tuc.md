---
description: Vòng lặp liên tục qua MỌI module — rà lỗi/bất hợp lý, phân tích, phản biện, chấm điểm phương án, sửa, kiểm, commit cục bộ. Không dừng hỏi.
argument-hint: "[module bắt đầu: VST_GSC|CSSD|NKBV|QLCV|DAO_TAO|QUAN_TRI|NEN] — bỏ trống = tự chọn"
---

# /chay-lien-tuc — một vòng = một phát hiện được đóng

Chạy lặp bằng `/loop /chay-lien-tuc`. Mỗi lần gọi làm **đúng một vòng** dưới đây rồi kết bằng một dòng nhật ký; `/loop` gọi vòng kế. PO đã ủy quyền (2026-11-14): **không hỏi, không trình phương án chờ duyệt, không kết lượt giữa vòng**.

Thân mã: worktree `integrate-2026-11`. Nguồn điều hướng duy nhất: `node scripts/readiness/so-loi.mjs`. Nhật ký vòng: `.claude/plans/NHAT_KY_VONG_LAP.md` (một dòng/vòng).

## 0. Cổng đầu vòng (cơ học, ≤ 3 lệnh)

- `git status --short` — file lạ không phải của mình: để yên, không stage.
- Không kiểm hạn mức (PO 2026-11-14: bỏ mọi ngưỡng hạn mức; không gọi `get_usage` để quyết định dừng hay thu hẹp việc).
- `node scripts/readiness/so-loi.mjs stats`.

## 1. Chọn việc (theo thứ tự, lấy cái đầu tiên có)

1. `so-loi.mjs next 1` có dòng DA_XAC_MINH không thuộc cổng PO → sửa dòng đó.
2. Có dòng MOI → xác minh (`db-verify` hoặc tự đọc < 3 file) → `set` DA_XAC_MINH hoặc LOI_GIA.
3. Sổ hết việc mở → làm theo **giai đoạn** của kế hoạch `.claude/plans/KH_APPKSNK_20261114_doi-chieu-nguon-va-mo-rong.md` (PO 2026-11-14; §7 của kế hoạch ghi giai đoạn hiện tại): P1 chưa đạt → một bước ở mục 2b; P1 đạt, P2 chưa → một tài liệu ở mục 2c; P0–P2 đều đạt → **rà module kế** theo vòng tròn: VST_GSC → CSSD → NKBV → QLCV → DAO_TAO → QUAN_TRI → NEN (module của vòng rà gần nhất đọc từ nhật ký; `$ARGUMENTS` nếu có thì thắng) và các bước P3 đủ điều kiện (§3-P3 của kế hoạch). P0 đạt = lệnh thoát ở §3-P0 của kế hoạch in `mở: 0 | CHO_PO thiếu mặc định: 0`.

## 2. Rà một module (chỉ khi rơi vào 1.3)

Một vùng hẹp mỗi vòng (một luồng: nhập → lưu → chỉ số, hoặc một nhóm bảng), không «quét toàn bộ». Nguồn đối chiếu, theo thứ tự rẻ → đắt:

- `npm run trace` — quy tắc R/T của đặc tả M01–M15 (`~/Desktop/KSNK_BENH_VIEN_103/09_DOMAIN_PHAN_MEM/02_DAC_TA/`) chưa có mã dẫn: R «chặn/bắt buộc» chưa cài = phát hiện.
- `npm run module:audit -- <m>` và `module:gate -- <m>`.
- Giao MỘT agent đọc (`explore-module`; vùng quyền/RLS thì `security-auditor`) với câu hỏi: lỗi sai dữ liệu, bước thiếu kiểm quyền, trạng thái đi sai chiều, số chỉ số lệch công thức, **điều bất hợp lý** (màn cho làm việc mà quy trình cấm; bắt nhập thứ hệ thống đã biết; hai nơi tính cùng một số khác nhau; nút không có đường quay lại). Chỉ nhận mức Nghiêm trọng/Cao/Trung bình có `file:dòng`.
- Phát hiện → `scripts/readiness/inbox/<ten>.json` → `so-loi.mjs merge`. Vòng rà không ra phát hiện nào → ghi nhật ký «sạch», sang module kế.

## 2b. Rà mẫu in và lưu trữ (P1)

Một nhóm file in/xuất của MỘT module mỗi vòng, theo thứ tự module và năm phép kiểm ở §3-P1 của kế hoạch. Mỗi kết luận cần `file:dòng` ở hai phía (BM/đặc tả/QT ↔ app) và lệnh tái hiện; thiếu một phía → «cần kiểm», không `DA_XAC_MINH`. Vòng rà chỉ ghi sổ (inbox → `merge`) và cập nhật `scripts/readiness/mau-in-anh-xa.json`; sửa là vòng sau theo mục 1. Thời hạn lưu trên mẫu, ngưỡng đạt chưa có căn cứ ở nguồn → `CHO_PO` + mặc định (không in thời hạn lưu).

## 2c. Đối chiếu kho tri thức (P2)

Kho `~/Desktop/KSNK_BENH_VIEN_103/` là **bản nháp, chỉ đọc**. Mỗi vòng MỘT tài liệu theo thứ tự ở §3-P2 của kế hoạch: đo lại một phép bằng `grep`/`npm run trace`, ghi một kết luận vào nhật ký. Lệch với app → dòng sổ MOI hoặc CHO_PO với `nguon` = «kho tri thức (dự thảo)» (không `DA_XAC_MINH` chỉ vì kho nói); lỗi nằm phía kho → ghi vào §5 của kế hoạch, không sửa kho.

## 3. Phân tích → phương án → phản biện → chấm điểm

Với dòng được chọn, viết vào nhật ký (≤ 12 dòng, không trình PO):

- Gốc lỗi một câu + `file:dòng`; câu đặc tả/SSOT bám theo (mã R/T hoặc khóa PO).
- 2–3 phương án. Chấm mỗi phương án 0–5 theo thang, nhân trọng số:

| Tiêu chí | Trọng số |
|---|---|
| Đúng gốc (hết nguyên nhân, không chỉ che triệu chứng) | 3 |
| An toàn dữ liệu (không mất/sai dữ liệu cũ; additive) | 3 |
| Kiểm chứng được (viết được test fail-trước) | 2 |
| Đảo ngược được | 1 |
| Diff nhỏ (số file, không đụng file dùng chung) | 1 |

- Phản biện: nêu một ca làm phương án điểm cao nhất sai; nếu ca đó có thật → trừ điểm và xếp lại. Vùng rủi ro cao (RLS, migration, auth, công thức chỉ số lâm sàng) → một vòng `review-bv103`/`phan-bien` trên diff sau khi sửa, không trước.
- Chọn điểm cao nhất; hòa → diff nhỏ hơn. **Làm ngay.**

## 4. Sửa → kiểm → commit

- `so-loi.mjs set <ID> DANG_SUA`. Test tái hiện fail trước. File dùng chung: tìm nơi dùng bằng `grep -rn "<tên>" src supabase scripts` trước (`npm run impact` chỉ có ở nhánh `chore/code-vs-ai-phase1` (commit `330eeb7d`); CLAUDE.md nhánh này không yêu cầu nên chưa mang sang — dùng `grep` ở trên).
- Người sửa: tự làm nếu ≤ 3 file; `slice-fixer` cho code theo mẫu; `migration-author` cho migration/RPC (**chỉ DB local**). Một agent ghi tại một thời điểm; trong lúc agent chạy thì làm bước 2 của module kế (chỉ đọc), **không kết lượt chờ**.
- `npm run verify:changed`. Fail → sửa tối đa 3 vòng; vẫn fail → hoàn tác phần của vòng này, `set <ID> HOAN` kèm lỗi nguyên văn, sang việc kế. Ngoại lệ: lỗi nằm hoàn toàn ngoài diff của vòng (file chưa commit của phiên khác, có từ trước vòng; kế hoạch ghi ở mục «Cổng PO») không tính vào 3 vòng và không HOAN; chứng minh bằng chạy riêng spec/lệnh trên các file của vòng, ghi tên file lỗi vào nhật ký, và vẫn không được nói «verify:changed pass».
- Lớp FRONTEND/UX: thử tay ≥ 1 kịch bản trên `localhost:3001`, `so-loi.mjs tay <ID> DAT|KHONG_DAT`.
- Pass → `git add <đúng file của vòng>` + commit cục bộ; `so-loi.mjs set <ID> DA_SUA <sha>`.

## 5. Việc chạm cổng PO — KHÔNG dừng, KHÔNG hỏi

Prod (migration/SQL/ghi), push/PR/deploy, phá hủy không khôi phục, đổi quyền người dùng thật, lâm sàng mà SSOT im: `so-loi.mjs set <ID> CHO_PO` kèm **đáp án mặc định + hệ quả nếu PO im**, làm phần local làm được, rồi sang việc kế. «Lâm sàng mà SSOT im» (ngưỡng, thời hạn, công thức): chỉ ghi CHO_PO + đáp án mặc định, **không cài đáp án mặc định vào code**; phần làm được là phần không phụ thuộc đáp án (`CLAUDE.md:28,56`). PO đọc `so-loi.mjs status` khi rảnh.

Giới hạn «≤ 8 file/task» tính **theo vòng**; việc lớn hơn → tách thành nhiều dòng sổ lỗi, mỗi vòng một dòng, không hỏi.

## 6. Kết vòng

Một dòng vào `NHAT_KY_VONG_LAP.md`: `ngày giờ · module · ID · phương án chọn (điểm) · verify · sha | CHO_PO | HOAN | sạch` (vòng P1/P2: cột ID ghi `P1:<module>` hoặc `P2:<tài liệu>`, và cập nhật §7 của kế hoạch). Không viết báo cáo dài, không khối hỏi. Dừng `/loop` chỉ khi: P0, P1, P2 đã đạt **và** ba vòng liền «sạch» trên cả 7 module; hoặc cùng một lỗi verify lặp 3 vòng liền (ghi HANDOFF; lỗi ngoài diff của vòng theo ngoại lệ ở §4 không tính). Bước P3 thiếu điều kiện (chưa có đặc tả hoặc người dùng thật) → CHO_PO, không giữ vòng lặp chạy.
