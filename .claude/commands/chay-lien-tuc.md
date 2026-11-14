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
3. Sổ hết việc mở → **rà module kế** theo vòng tròn: VST_GSC → CSSD → NKBV → QLCV → DAO_TAO → QUAN_TRI → NEN (module của vòng rà gần nhất đọc từ nhật ký; `$ARGUMENTS` nếu có thì thắng).

## 2. Rà một module (chỉ khi rơi vào 1.3)

Một vùng hẹp mỗi vòng (một luồng: nhập → lưu → KPI, hoặc một nhóm bảng), không «quét toàn bộ». Nguồn đối chiếu, theo thứ tự rẻ → đắt:

- `npm run trace` — quy tắc R/T của đặc tả M01–M15 (`~/Desktop/KSNK_BENH_VIEN_103/09_DOMAIN_PHAN_MEM/02_DAC_TA/`) chưa có mã dẫn: R «chặn/bắt buộc» chưa cài = phát hiện.
- `npm run module:audit -- <m>` và `module:gate -- <m>`.
- Giao MỘT agent đọc (`explore-module`; vùng quyền/RLS thì `security-auditor`) với câu hỏi: lỗi sai dữ liệu, bước thiếu kiểm quyền, trạng thái đi sai chiều, số KPI lệch công thức, **điều bất hợp lý** (màn cho làm việc mà quy trình cấm; bắt nhập thứ hệ thống đã biết; hai nơi tính cùng một số khác nhau; nút không có đường quay lại). Chỉ nhận mức Nghiêm trọng/Cao/Trung bình có `file:dòng`.
- Phát hiện → `scripts/readiness/inbox/<ten>.json` → `so-loi.mjs merge`. Vòng rà không ra phát hiện nào → ghi nhật ký «sạch», sang module kế.

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

- Phản biện: nêu một ca làm phương án điểm cao nhất sai; nếu ca đó có thật → trừ điểm và xếp lại. Vùng rủi ro cao (RLS, migration, auth, công thức KPI lâm sàng) → một vòng `review-bv103`/`phan-bien` trên diff sau khi sửa, không trước.
- Chọn điểm cao nhất; hòa → diff nhỏ hơn. **Làm ngay.**

## 4. Sửa → kiểm → commit

- `so-loi.mjs set <ID> DANG_SUA`. Test tái hiện fail trước. File dùng chung: `npm run impact -- <tên>` trước.
- Người sửa: tự làm nếu ≤ 3 file; `slice-fixer` cho code theo mẫu; `migration-author` cho migration/RPC (**chỉ DB local**). Một agent ghi tại một thời điểm; trong lúc agent chạy thì làm bước 2 của module kế (chỉ đọc), **không kết lượt chờ**.
- `npm run verify:changed`. Fail → sửa tối đa 3 vòng; vẫn fail → hoàn tác phần của vòng này, `set <ID> HOAN` kèm lỗi nguyên văn, sang việc kế.
- Lớp FRONTEND/UX: thử tay ≥ 1 kịch bản trên `localhost:3001`, `so-loi.mjs tay <ID> DAT|KHONG_DAT`.
- Pass → `git add <đúng file của vòng>` + commit cục bộ; `so-loi.mjs set <ID> DA_SUA <sha>`.

## 5. Việc chạm cổng PO — KHÔNG dừng, KHÔNG hỏi

Prod (migration/SQL/ghi), push/PR/deploy, phá hủy không khôi phục, đổi quyền người dùng thật, lâm sàng mà SSOT im: `so-loi.mjs set <ID> CHO_PO` kèm **đáp án mặc định + hệ quả nếu PO im**, làm phần local làm được, rồi sang việc kế. PO đọc `so-loi.mjs status` khi rảnh.

Giới hạn «≤ 8 file/task» tính **theo vòng**; việc lớn hơn → tách thành nhiều dòng sổ lỗi, mỗi vòng một dòng, không hỏi.

## 6. Kết vòng

Một dòng vào `NHAT_KY_VONG_LAP.md`: `ngày giờ · module · ID · phương án chọn (điểm) · verify · sha | CHO_PO | HOAN | sạch`. Không viết báo cáo dài, không khối hỏi. Dừng `/loop` chỉ khi: ba vòng liền «sạch» trên cả 7 module; hoặc cùng một lỗi verify lặp 3 vòng liền (ghi HANDOFF).
