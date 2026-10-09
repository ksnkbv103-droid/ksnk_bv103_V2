---
description: Review diff trước merge (chạy subagent review-bv103, Sonnet)
argument-hint: "[path; để trống = git diff hiện tại]"
---

# /review — Review diff trước commit/merge

**Đầu vào:** $ARGUMENTS (mặc định: `git diff` hiện tại)

Giao cho subagent `review-bv103` (context cô lập, model Sonnet) — không tự review trong phiên chính để khỏi đọc thừa. Chuyển nguyên văn **Findings / Tests đề xuất / Go-No-go** của subagent. Không implement thêm trừ khi user yêu cầu fix.
