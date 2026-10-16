---
description: Commit khi người dùng yêu cầu
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git add *) Bash(git commit *)
---

# /commit — Tạo git commit (chỉ khi user yêu cầu)

Chỉ chạy khi user **explicitly** yêu cầu commit.

## Git Safety

- NEVER update git config
- NEVER destructive git (force push, hard reset) trừ khi user yêu cầu
- NEVER skip hooks (`--no-verify`)
- NEVER force push main/master
- Avoid `git commit --amend` trừ khi user yêu cầu và commit chưa push
- NEVER commit `.env`, credentials

## Trạng thái hiện tại (đã nạp sẵn, không chạy lại)

Status: !`git status --short | head -60 || true`

Diff (cắt 400 dòng; cần thêm thì `git diff <file>`): !`git diff HEAD | head -400 || true`

Commit gần nhất: !`git log -3 --oneline || true`

## Quy trình

1. Phân tích staged + unstaged ở trên; draft message 1–2 câu (why, not what)
2. `git add` file liên quan → `git commit` qua HEREDOC
3. `git status` xác nhận

## Message

Conventional Commits; tiếng Việt hoặc English theo style repo gần nhất.
