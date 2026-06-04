# /intake — Khóa phạm vi trước khi code

Chạy lệnh này **đầu tiên** cho task không trivial. **Không sửa code.**

## Yêu cầu

Điền (hoặc hỏi user nếu thiếu) các mục sau:

1. **Goal** — một câu kết quả mong muốn
2. **In scope** — file/module được phép đụng
3. **Out of scope** — cấm đụng
4. **Acceptance criteria** — kiểm được trên UI/RPC/test
5. **Constraints** — CSSD vs MDM, không migration, không dependency mới, …
6. **Verify plan** — lệnh BV103 phù hợp (xem bảng dưới)
7. **Risk** — tối đa 3 rủi ro regression

## Verify BV103 (gợi ý)

| Loại thay đổi | Lệnh tối thiểu |
|---------------|----------------|
| UI nhỏ, không action | `npm run verify:quick` |
| Server Action / `fact_*` | `npm run verify:engineering` |
| CSSD | + `npm run verify:cssd` |
| Migration / schema | `npm run mdm:migrate:local` → `npm run verify:mdm` → `verify:engineering` |
| PR / ship | `npm run verify` |

## Output bắt buộc

1. Kế hoạch **3–5 bước** (mỗi bước kèm `verify: …`)
2. **Top 3 rủi ro**
3. **Giả định** cần user xác nhận (nếu có)

Chờ user duyệt intake trước khi implement. Tham chiếu: `docs/core/cursor-operating-playbook.md`, rule `02-task-intake-freeze.mdc`.
