# /grok-handoff — Task từ Grok Lead (RACI)

Không phải cửa mặc định. Cửa: [`CLAUDE.md`](../../CLAUDE.md) → [`docs/ssot-map.md`](../../docs/ssot-map.md). Chỉ khi PO dán một khối DoD có whitelist.

## RACI (nhắc)

| Ai | Việc |
|----|------|
| Grok | Đã đọc CDC/SSOT, chắt DoD + whitelist + ≤5 bullet Neo |
| Người sửa | Code đúng whitelist; **cấm** đọc CDC/NHSN thô và `docs/archive/` |
| PO | Dán task, Stop nếu lan, UAT, báo `LÁT … xong` cho Grok |

## Trước khi code

1. Thiếu DoD/whitelist → dừng, hỏi PO.
2. Chỉ path whitelist (+ test cùng lát).
3. **CẤM:** đọc sổ CDC/NHSN/WHO thô, `docs/archive/`, transcript; invent domain; đoán schema; migrate remote/prod; Vercel/PR trừ PO. Đọc đúng file ssot-map của lát.
4. Task đã dán có bullet Neo thì làm theo bullet đó. Không có bullet thì bám file lát trong `docs/ssot-map.md`.

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
