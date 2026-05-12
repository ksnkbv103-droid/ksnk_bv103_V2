---
name: smart-db-bv103
description: Tối ưu Postgres và app BV103 theo hướng Smart DB thực dụng (view/RPC/index/batch/RLS/audit) mà không over-engineer. Dùng khi migration, báo cáo chậm, import lô, đề xuất RLS/trigger/MV, hoặc refactor data layer.
---

# Smart DB BV103

## Khi nào dùng

- Thay đổi hoặc đề xuất thay đổi **schema, view, RPC, index, RLS, trigger, materialized view**.
- **Import Excel / batch** lớn, nhiều round-trip, cần transaction.
- **Báo cáo / dashboard** chậm; cân nhắc push-down hoặc tổng hợp.
- Người dùng hỏi về **EDA, temporal, IaC** — trả lời / thiết kế theo **phạm vi thực dụng** trong playbook.
- **Trang chậm / UI đơ:** rà soát bottleneck DB-Server-Client.
- **Tạo bảng mới:** đảm bảo có INDEX ngay từ đầu.
- **Viết Server Action trả danh sách:** phải phân trang server-side.
- **Tạo module mới:** áp dụng Contract-First (types.ts trước) + Vertical Slice (1 feature xuyên suốt).

## Bắt buộc đọc trước khi sửa

1. [`docs/specs/working/LEAN_EXECUTION_BV103.md`](../../../docs/specs/working/LEAN_EXECUTION_BV103.md) — checklist + verify.
2. [`docs/specs/SMART_DB_PRAGMATIC_PLAYBOOK.md`](../../../docs/specs/SMART_DB_PRAGMATIC_PLAYBOOK.md) — đặc biệt **mục 3 (Chiến lược hiệu năng y tế)**.
3. [`AGENTS.md`](../../../AGENTS.md).
4. Khi đụng DB: [`docs/specs/GOVERNANCE_PIPELINE.md`](../../../docs/specs/GOVERNANCE_PIPELINE.md) và [`docs/specs/10-bv103-implementation-mapping.md`](../../../docs/specs/10-bv103-implementation-mapping.md).

## Quy tắc vàng (ROI-first)

- **Đo đau trước (Measure Pain):** Chỉ tối ưu chỗ chậm/lỗi thật sự. Tránh "elite stack" một lần.
- **DB giữ Chân lý:** Toàn vẹn, batch, join phức tạp.
- **App giữ Luồng:** Workflow, Form, UX, xử lý lỗi biên. Frontend không "ngu".
- **Validate & Cache:** Validate ở server, cache danh mục tĩnh (TTL 5-15 phút), invalidate sau mutation.
- **RLS:** Lớp bảo mật bổ sung, không thay thế hoàn toàn permission registry.

## Quy tắc hiệu năng bắt buộc

### DB Layer
- **INDEX:** Tạo bảng mới → luôn kèm INDEX cho mọi FK (`*_id`) + cột WHERE/JOIN. Composite index cho query chéo lặp. Đo bằng `EXPLAIN ANALYZE`.
- **INDEX Audit:** Trước release lớn → `pg_stat_statements` → top 10 slow query → `EXPLAIN ANALYZE` → migration bổ sung INDEX nếu thấy Seq Scan trên bảng > 1.000 rows.
- **Server Pagination:** `.range(from, to)` + `.ilike()` search trên DB. Mặc định 20 rows/trang. **KHÔNG select * toàn bộ bảng fact_*.**
- **Count:** `.select("id", { count: "exact", head: true })` — nhẹ, không tải payload.
- **verifyPermission:** 1 query duy nhất qua `v_auth_user_permissions`. Cấm 3 query tuần tự.

### App Layer
- **Hook chuẩn:** `useServerPaginatedTable` cho bảng lớn. `useDataTable` chỉ cho bảng danh mục nhỏ (< 200 rows).
- **Dropdown lớn (> 200):** Async/Searchable Select (gõ → query DB). KHÔNG tải hết vào `<select>`.
- **Background Jobs:** Báo cáo/export nặng → `pg_cron` + Edge Functions. Không trong request-response.
- **Realtime cảnh báo:** Supabase Realtime. Không tự xây WebSocket.
- **Debounce search:** 300ms trước khi gọi Server Action.

### Caching Standards
- **Danh mục tĩnh** (`dm_khoa_phong`, `dm_nghe_nghiep`, `dm_khu_vuc_giam_sat`) → `unstable_cache` (Next.js), TTL 5-15 phút.
- **Cache functions** đặt tại `src/lib/cache/`. Pattern: `getCached<TenDanhMuc>()`.
- **Invalidation:** Gọi `revalidateTag("<tag>")` ngay trong Server Action sau mutation.
- **KHÔNG cache** dữ liệu lâm sàng đang active (phiên giám sát, kết quả XN).

### Domain Layer Convention
- Logic nghiệp vụ thuần → `src/lib/domain/` (pure functions, không import DB/UI/framework).
- Đối tượng: tỷ lệ nhiễm khuẩn, phân loại MDRO, WHO 5 moments, Antibiogram.
- **KHÔNG import** `@/lib/supabase*`, `next/*`, `react` trong `src/lib/domain/`.
- Lợi ích: testable (unit test thuần), reusable (Server Actions + Edge Functions + báo cáo), portable.

### Observability Rules
- Server Actions lỗi → `console.error` kèm context `{ module, action, userId, error }`.
- **KHÔNG log PII** (tên bệnh nhân, số BHYT, email cá nhân). Chỉ log ID.
- Bật `pg_stat_statements` trên Supabase Dashboard. Theo dõi slow query > 1s.
- CI/CD: GitHub Actions tối thiểu `npm ci → npm run build` trước khi merge.

## Ngưỡng nâng cấp (khi nào cần kỹ thuật tiên tiến hơn)

| Kỹ thuật | Ngưỡng kích hoạt | Thay thế cho |
|----------|-------------------|--------------|
| Keyset (Cursor) Pagination | Bảng > 100.000 rows, user xem trang 50+ | OFFSET pagination |
| Table Partitioning | Bảng `fact_*` > 5-10 triệu rows | Full table scan |
| Virtualization (react-window) | Render > 100 rows cùng lúc (grid lớn) | DOM render thường |
| Message Queue (Kafka/RabbitMQ) | HIS/LIS integration > 10.000 msg/giờ | Database Webhooks |
| Cold/Hot Data Archiving | Storage cost tăng hoặc query > 5s | Single table |

## Thứ tự gợi ý

1. Đo đau (N+1, slow query, trang chậm).
2. Smart DB mục tiêu (View/RPC/Index + Server Pagination).
3. Cache danh mục tĩnh (`unstable_cache` + `revalidateTag`).
4. Domain Layer (tách pure business logic).
5. Observability (pg_stat_statements + structured logging).
6. CI/CD (GitHub Actions build gate).
7. Audit/Temporal (vài bảng nhạy cảm).
8. EDA/IaC (chỉ khi thực sự cần).

## Kỷ luật phát triển (Build-Solid)

- **Thứ tự bắt buộc cho feature mới:** `types.ts` → migration SQL → Server Action → UI → Verify.
- **Migration-Then-Code:** KHÔNG viết Server Action cho bảng chưa có migration.
- **Zod Validation:** User input → `z.object({...}).safeParse()` trong Server Action. Schema tại `src/lib/validations/`.
- **Decision Log:** Quyết định thiết kế lớn → `docs/decisions/YYYY-MM-DD-<tên>.md`.
- Chi tiết: [`LEAN_EXECUTION_BV103.md`](../../../docs/specs/working/LEAN_EXECUTION_BV103.md) §2 và §6.
