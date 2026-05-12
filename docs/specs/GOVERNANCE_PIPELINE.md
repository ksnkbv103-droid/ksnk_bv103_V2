# Pipeline & migration (chi tiết bổ sung hiến pháp)

Nội dung chuyển từ `AGENTS.md` để giữ **AGENTS.md** gọn; vẫn là chuẩn dự án cùng cấp với rule `.cursor/rules/50`, `51`.

## Pipeline bắt buộc khi đụng master data/schema

- **B1 Detect:** xác định source-of-truth của thực thể.
- **B2 Model:** chốt quan hệ FK và mapping field `UI -> Action -> DB`.
- **B3 Constrain:** bổ sung FK/index/validation server.
- **B4 Contract:** chuẩn hóa import/export theo mã nghiệp vụ, ẩn UUID kỹ thuật.
- **B5 Migrate:** migration additive-safe trước, destructive sau.
- **B6 Verify:** kiểm tra dropdown, form save, dashboard count, dữ liệu lịch sử.

## Quy tắc migration

- Luôn ưu tiên `ADD COLUMN IF NOT EXISTS`, backfill, index.
- Không rename/drop trực tiếp trong cùng vòng nếu chưa có tương thích ngược.
- Mọi đổi cột/bảng phải có: kế hoạch rollback; script backfill; checklist kiểm tra dữ liệu mồ côi.
- Không đổi tên cột tùy tiện nếu chưa cập nhật đủ action, type, form, table.