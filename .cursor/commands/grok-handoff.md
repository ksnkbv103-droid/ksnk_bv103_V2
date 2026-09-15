# /grok-handoff — Task từ Grok Lead (RACI)

Chỉ khi PO đã nhận khối DoD từ **Grok Bot** và dán vào chat này.

## RACI (nhắc)

| Ai | Việc |
|----|------|
| Grok | Đã đọc CDC/SSOT, chắt DoD + whitelist + ≤5 bullet Neo |
| Cursor (bạn) | Code đúng whitelist; **cấm** đọc CDC/NHSN/SSOT dài |
| PO | Dán task, Stop nếu lan, UAT, báo `LÁT … xong` cho Grok |

## Trước khi code

1. Thiếu DoD/whitelist → dừng, hỏi PO.
2. Chỉ path whitelist (+ test cùng lát).
3. **CẤM:** đọc sổ CDC/NHSN/WHO thô; `@` file SSOT >~200 dòng trừ mục task chỉ định; invent domain; đoán schema; migrate remote/prod; Vercel/PR trừ PO.
4. Chỉ tin bullet **Neo Grok** trong task.

## Thực hiện

1. Kỷ luật `/implement` + rule `01` token hygiene.
2. Đọc ≤4–6 path trong task (grep trước).
3. Verify đúng lệnh DoD.

## Output

```markdown
## LÁT <mã> — kết quả Cursor
- Files changed:
- Verify:
- DoD:
- Residual:
- Cần PO/Grok:
```

PO nhắn Grok: `LÁT <mã> xong`.
