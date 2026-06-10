# Rút gọn User Rules (Cursor Settings)

> User Rules áp dụng **mọi** project → trùng token với BV103 `AGENTS.md` + `.cursor/rules/`.  
> Thực hiện **thủ công** trong Cursor Settings → Rules → User Rules.

## Giữ trong User Rules (< 300 từ)

- Phong cách trả lời (markdown, không emoji thừa, prose rõ).
- **Không commit / không push** trừ khi user yêu cầu rõ.
- Môi trường thật — agent phải chạy lệnh, không bỏ cuộc sớm.

## Chuyển xuống project BV103 (đã có)

| Nội dung cũ trong User Rules | Thay bằng |
|------------------------------|-----------|
| Git commit protocol | `/commit` → `.cursor/commands/commit.md` |
| PR workflow `gh pr create` | `/pr-create` → `.cursor/commands/pr-create.md` |
| Surgical / minimize scope | `01-agent-discipline.mdc` |
| Code citation format | User rule 1 dòng hoặc bỏ (Cursor mặc định) |
| TodoWrite / Task tool | Bỏ — project không bắt buộc |

## Verify

Mở chat mới trên BV103: baseline rules nhỏ hơn; agent vẫn đọc `AGENTS.md` + `00-core` + `01-agent-discipline`.
