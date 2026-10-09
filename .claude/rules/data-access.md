---
paths:
  - "src/**/actions/**"
  - "src/**/hooks/**"
  - "src/lib/**/*server*.ts"
---

# Schema Sync Gate (application code)

- Đồng bộ code–app–database là cổng ra release.
- Trước khi đặt tên bảng/cột/FK hoặc type mapping mới: đọc [`docs/core/implementation-mapping.md`](../../docs/core/implementation-mapping.md), và pipeline [`docs/core/governance-pipeline.md`](../../docs/core/governance-pipeline.md).
- Khi đổi field DB: cập nhật trong **cùng task** actions, types, form, bảng UI.
- Ưu tiên migration additive (`ADD COLUMN IF NOT EXISTS`) trước destructive; rename có lộ trình rollback.
- Trước khi xong: kiểm tra `UI input -> server action -> DB` nhất quán.

## Contract-first preflight (bắt buộc cho Admin/MDM/RBAC)

- Trước khi sửa action/query, bắt buộc xác nhận schema thực tế trong `supabase/migrations/*`:
  - bảng có tồn tại không
  - cột có tồn tại không
  - kiểu dữ liệu/FK có đúng không
- Cấm giả định cột dùng chung cho mọi bảng. Ví dụ: `dm_roles` **không có** `is_active`.
- Nếu dùng RPC:
  - gọi đúng tên tham số hàm hiện hành
  - parse đúng shape trả về (object keyed vs array), không suy diễn.
- Nếu dữ liệu danh mục hiển thị rỗng bất thường:
  - kiểm tra theo thứ tự: query contract -> permission/RLS -> fallback trực tiếp `dm_*`.
- Mọi lỗi kiểu `Could not find column ... in schema cache` phải được xử lý ở code contract (không workaround ở UI).

## Frontend Performance (BV103)

Áp dụng khi viết/sửa **bảng dữ liệu, hook lấy dữ liệu, Server Actions trả danh sách**.

## Bảng dữ liệu (Data Tables)

1. **Bảng lịch sử / giao dịch (`fact_*`):** Bắt buộc dùng `useServerPaginatedTable` + `AdvancedDataTable` với prop `serverPagination`. KHÔNG dùng `useDataTable` cho các bảng này.
2. **Bảng danh mục nhỏ (< 200 rows):** Được dùng `useDataTable` (client-side filter/sort).
3. **Phân trang:** Mặc định 20 rows/trang. Tối đa 50.
4. **Tìm kiếm:** Server Actions dùng `.ilike()` hoặc `.or()` trên DB. KHÔNG filter trên Array phía client cho bảng lớn.
5. **Sắp xếp:** Server Actions dùng `.order()`. KHÔNG sort Array phía client cho bảng lớn.

## Server Actions

6. **Hàm trả danh sách lớn** phải nhận params `{ page, pageSize, search, sortKey, sortDir }` và trả `{ data, totalCount }`.
7. **Hàm đếm:** Dùng `.select("id", { count: "exact", head: true })` — nhẹ, không tải payload.
8. **Hàm verify quyền (`verifyPermission`):** Chỉ 1 query qua View. Không "3 query tuần tự".
9. **Promise.all:** Song song hóa request độc lập. KHÔNG gọi tuần tự khi không cần kết quả trước đó.

## Dropdown & Form

10. **Dropdown nhân sự (> 200 người):** Dùng Async/Searchable Select — gõ chữ → query DB. KHÔNG tải hết vào `<select>`.
11. **Dropdown danh mục nhỏ (< 200):** Được fetch 1 lần khi mở form.
12. **Form values:** KHÔNG gán `null` cho `value` prop. Dùng `""` (string rỗng) hoặc `undefined`.

## React Rendering

13. **Bảng > 100 rows render cùng lúc:** Cân nhắc Virtualization (react-window). Không bắt buộc nếu đã phân trang.
14. **`useMemo` / `useCallback`:** Dùng cho computed data nặng, column definitions, và fetch handlers. Tránh re-render không cần thiết.
15. **Debounce search:** 300ms delay trước khi gọi Server Action. Hook `useServerPaginatedTable` đã tích hợp sẵn.
