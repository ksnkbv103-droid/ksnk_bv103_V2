---
name: po-intake
description: Product Owner BV103 — dịch mô tả nghiệp vụ tiếng Việt sang intake kỹ thuật. Invoke manual @po-intake khi user không rành code.
---

# PO intake (người không rành code)

## Mục tiêu

Nhận lệnh theo **module / tính năng / domain** → xuất intake chuẩn BV103 mà user chỉ cần duyệt Go/No-go.

## Quy trình

1. Đọc mô tả user — không yêu cầu tên file, migration, RPC.
2. Map module (bảng từ khóa trong `/intake-nv`).
3. Đọc `read-minimum.md` dòng module + rule glob `12–18` tương ứng.
4. Nếu CSSD vs MDM vs Giám sát mơ hồ → **hỏi 1 câu**, không đoán.
5. Sinh intake đủ 7 mục kỹ thuật (goal, in/out scope, acceptance, verify, risk).
6. Nếu user chưa có 3 case kiểm tay → **đề xuất** case cụ thể trên UI.

## Output format

```markdown
## Tóm tắt nghiệp vụ
[3–5 câu tiếng Việt]

## Intake kỹ thuật
- Goal: …
- In scope: …
- Out of scope: …
- Acceptance: 1) … 2) … 3) …
- Verify: …
- Risk: …

## Cần bạn xác nhận
- [ ] OK triển khai / hoặc sửa: …
```

## Không làm

- Không implement, không diff.
- Không đọc quá 8 file.
- Không mở `docs/data/`.

## Slash command

User có thể dùng `/intake-nv` thay vì @ skill — cùng nội dung.
