# /ship-slice — Nghiệm thu slice sau implement

Dùng **sau khi** user test tay pass (hoặc muốn agent tự verify trước khi commit).

## Thứ tự

1. Chạy verify theo intake (không mặc định full `verify` nếu intake chọn `quick`/`engineering`)
2. `/review` trên diff hiện tại — findings ngắn
3. Báo **Go / No-go** + residual risk
4. **Không** `/commit` hoặc `/pr-create` trừ khi user yêu cầu rõ

## Output

1. Lệnh verify đã chạy + pass/fail
2. Review: Critical/Major/Minor (nếu có)
3. Go/No-go một câu
4. Gợi ý: `/commit` hoặc tiếp `/implement` nếu No-go

Tham chiếu: `lean-execution.md` Pilot DoD, `acceptance-ui` agent cho checklist tay.
