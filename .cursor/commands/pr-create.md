# /pr-create — Tạo pull request qua gh

Chỉ khi user yêu cầu tạo PR.

## Quy trình

1. Song song: `git status`, `git diff`, tracking branch, `git log` + `git diff [base]...HEAD`
2. Phân tích **tất cả** commits trên branch (không chỉ commit cuối)
3. Push `-u origin HEAD` nếu cần
4. `gh pr create` với body HEREDOC:

```markdown
## Summary
- …

## Test plan
- [ ] …
```

5. Trả URL PR cho user.

Dùng `gh` cho mọi thao tác GitHub. Không update git config.
