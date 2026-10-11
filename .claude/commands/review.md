---
description: Nghiệm thu lát — verify + review diff (subagent review-bv103, Sonnet), chưa deploy
argument-hint: "[path; để trống = git diff hiện tại]"
---

# /review — Review diff trước commit/merge

**Đầu vào:** $ARGUMENTS (mặc định: `git diff` hiện tại)

Sau khi test tay pass: chạy verify theo intake (không mặc định full `verify`), rồi giao cho subagent `review-bv103` (context cô lập, model Sonnet) — không tự review trong phiên chính để khỏi đọc thừa. Chuyển nguyên văn **Findings / Tests đề xuất / Go-No-go** của subagent. Báo lệnh verify đã chạy + pass/fail + Go/No-go một câu. Không implement thêm, không `/commit` hoặc `/pr-create` trừ khi user yêu cầu.
