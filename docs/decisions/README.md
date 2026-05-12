# Decision Log — KSNK 103

Thư mục này ghi lại các quyết định thiết kế quan trọng trong quá trình phát triển.

## Format

Mỗi quyết định tạo 1 file: `YYYY-MM-DD-<tên-ngắn>.md`

```markdown
## Tiêu đề quyết định
- **Ngày:** YYYY-MM-DD
- **Người quyết định:** ...
- **Vấn đề:** Mô tả vấn đề cần giải quyết.
- **Phương án A:** ... (ưu/nhược)
- **Phương án B:** ... (ưu/nhược)
- **Chọn:** Phương án X — **Lý do:** ...
- **Hệ quả:** Điều cần lưu ý hoặc trade-off chấp nhận.
```

## Khi nào ghi

- Thay đổi schema lớn (thêm/bỏ bảng, đổi FK strategy)
- Chọn giữa View vs RPC vs truy vấn trực tiếp
- Thay đổi kiến trúc module (tách/gộp bounded context)
- Đổi thư viện/framework (thêm Zod, đổi auth strategy)
- Chọn chiến lược pagination, caching, hoặc data flow

## Danh sách

| Ngày | File | Tóm tắt |
|------|------|---------|
| 2026-05-07 | [2026-05-07-server-pagination-architecture.md](./2026-05-07-server-pagination-architecture.md) | Chuyển GSC/VST sang Server-side Pagination |
| 2026-05-08 | [2026-05-08-unified-engineering-standard-bv103.md](./2026-05-08-unified-engineering-standard-bv103.md) | Ban hành chuẩn hợp nhất kỹ thuật để giảm phân mảnh |
