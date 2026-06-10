# /commit — Tạo git commit (chỉ khi user yêu cầu)

Chỉ chạy khi user **explicitly** yêu cầu commit.

## Git Safety

- NEVER update git config
- NEVER destructive git (force push, hard reset) trừ khi user yêu cầu
- NEVER skip hooks (`--no-verify`)
- NEVER force push main/master
- Avoid `git commit --amend` trừ khi user yêu cầu và commit chưa push
- NEVER commit `.env`, credentials

## Quy trình

1. Song song: `git status`, `git diff`, `git log -1`
2. Phân tích staged + unstaged; draft message 1–2 câu (why, not what)
3. `git add` file liên quan → `git commit` qua HEREDOC
4. `git status` xác nhận

## Message

Conventional Commits; tiếng Việt hoặc English theo style repo gần nhất.
