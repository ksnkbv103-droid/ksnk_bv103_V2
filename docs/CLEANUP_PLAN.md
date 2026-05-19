# Documentation Cleanup Plan

**Branch**: `complete/docs-cleanup-v1`
**Mục tiêu**: Dọn dẹp toàn bộ file Markdown thừa, rối, lặp lại trong repo.

## Nguyên tắc làm sạch
- Xóa hẳn các file thừa sau khi đã hợp nhất nội dung quan trọng vào các file mới.
- Giữ và cải thiện AGENTS.md (làm cho khoa học, dễ bảo trì hơn).
- Tạo cấu trúc tài liệu mới rõ ràng, ít file hơn, dễ tra cứu.

## Cấu trúc tài liệu đề xuất sau khi dọn dẹp

### Cấp Root (tối giản)
- `README.md` — Overview dự án + Quick start
- `AGENTS.md` — Quy tắc phát triển cốt lõi (sẽ chỉnh sửa)
- `CHANGELOG.md` — Lịch sử thay đổi

### docs/
- `README.md` — Index tài liệu + Cách dùng
- `architecture.md` — Kiến trúc hệ thống (hợp nhất)
- `development-guide.md` — Quy trình làm việc + Pilot DoD + Quality Gates
- `specs/` — Chỉ giữ các file spec đang active

## Danh sách file sẽ xóa hẳn (sau khi hợp nhất)
- MASTER_COMPLETION_PLAN.md
- PROGRESS_REPORT.md
- CLAUDE.md
- docs/GROK_PRINCIPAL_ENGINEER_WORKFLOW.md
- Toàn bộ thư mục: docs/handover/, docs/reviews/, docs/internal/, docs/decisions/, docs/operations/
- docs/CONTRIBUTING.md (nếu nội dung trùng)

## Trạng thái hiện tại
Branch đã tạo. Đang bắt đầu tổng hợp và tạo file mới.