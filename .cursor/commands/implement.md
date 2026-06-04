# /implement — Code theo intake đã duyệt

Chỉ dùng sau khi intake đã được user **duyệt** (hoặc user nói rõ "triển khai theo plan").

## Ràng buộc

- **Diff tối thiểu** — mỗi dòng truy vết được yêu cầu
- **Không refactor** ngoài scope intake
- **Không đổi** public API / contract DB trừ khi intake cho phép
- **Không đoán schema** — đọc migration hoặc CLI DB trước khi kết luận bảng/cột
- Nghiệp vụ CSSD vs MDM mơ hồ → dừng và hỏi

## Spec freeze

Nếu user đổi KPI/công thức/acceptance giữa chừng: ghi `Spec change`, cập nhật intake ngắn, rồi mới sửa tiếp.

## Output bắt buộc

1. **Files changed** — danh sách file + lý do ngắn
2. **Verification** — lệnh đã chạy / cần chạy + kết quả
3. **Residual risk** — còn gì chưa verify

## Verify sau implement

Chạy lệnh đã chốt trong intake. Mặc định khi đụng action/DB: `npm run verify:engineering`.

Tham chiếu: `docs/core/lean-execution.md`, `AGENTS.md` Pilot DoD.
