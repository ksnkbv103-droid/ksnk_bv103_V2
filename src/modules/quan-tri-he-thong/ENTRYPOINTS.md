# Quản trị hệ thống — entrypoints (SSOT)

| Việc | Import từ |
|------|------------|
| Hub UI | `danh-muc/views/QuanTriDanhMucPage` |
| Stats / gateway admin | `actions/mdm-gateway.actions` |
| Đọc danh mục theo loại (module vận hành) | `@/lib/master-data/categories-by-type` |
| Bảng kiểm cho GSC/VST | `@/lib/mdm-read-gateway` |
| Registry / routing | `@/lib/master-data/domain-registry`, `danh-muc-admin-routes` |
| CRUD nội bộ DM | `danh-muc/actions/*` (không import `master-crud-core` từ module khác) |
| Bổ sung dụng cụ CSSD (core) | `@/lib/master-data/cssd-set-replenish-core` |
| Đường dẫn revalidate | `@/lib/master-data/quan-tri-paths` |

**Không dùng:** `actions/read.actions.ts`, `actions/write.actions.ts` (đã gỡ).

**Deep link:** `/quan-tri-he-thong/phan-quyen` → hub `?tab=phan_quyen`; `/danh-muc/dung-cu/{loai,bo,chi-tiet}` → `?tab=`.
