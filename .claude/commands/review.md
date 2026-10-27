---
description: Nghiệm thu lát — verify + review diff theo tầng rủi ro (subagent review-bv103, Opus), chưa deploy
argument-hint: "[path; để trống = git diff hiện tại]"
---

# /review — Review diff trước commit/merge

**Đầu vào:** $ARGUMENTS (mặc định: `git diff` hiện tại)

1. Chọn tầng rủi ro (Thấp/Vừa/Cao) theo [`review-flow`](../rules/review-flow.md); không chắc → tầng cao hơn. Nêu tầng trong báo cáo.
2. Sau khi test tay pass: chạy verify theo intake (không mặc định full `verify`), dán lệnh + kết quả pass/fail. Thất bại → dừng, báo nguyên văn lỗi.
3. Tầng Vừa/Cao: giao cho subagent `review-bv103` (context cô lập, model Opus theo `CLAUDE.md`) với yêu cầu + diff + kết quả verify, không kèm lập luận của người viết. Tầng Cao: thêm `security-auditor` cho một vùng hẹp.
4. Có finding Critical/Major: sửa (`slice-fixer`), review lại **chỉ phần diff mới**, tối đa 3 vòng. Dừng sớm nếu không còn finding.
5. Chuyển nguyên văn **Findings / Tests đề xuất / Go-No-go**. Báo tầng, số vòng, lệnh verify + pass/fail, Go/No-go một câu. Go/No-go của agent chỉ là đề xuất; tầng Vừa/Cao vẫn cần PO duyệt.

Không implement thêm ngoài finding, không `/commit` hoặc `/pr-create` trừ khi user yêu cầu.
