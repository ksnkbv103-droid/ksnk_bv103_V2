# Smart DB thực dụng & App điều phối (BV103)

Tài liệu này **bổ sung** [`AGENTS.md`](../../AGENTS.md) và [`GOVERNANCE_PIPELINE.md`](./GOVERNANCE_PIPELINE.md).  
Mục tiêu: tối ưu hiệu năng, giảm lỗi, **không** over-engineer.

---

## 1. Nguyên tắc nền (giữ xuyên suốt)

- **Một khái niệm — một nguồn dữ liệu** (`mdm_*`, `dm_*` + registry). Không nhân đôi danh mục đồng nghĩa.
- **UI → Action → DB → Báo cáo**: Ưu tiên **logic + master data** trước polish UI.
- Mọi thay đổi schema / quy tắc DB: **migration có quy trình** — không sửa tay trên Dashboard.
- **Phân quyền nghiệp vụ vẫn cần ở tầng app** (registry quyền, server actions); **RLS** là lớp **bổ sung**, không coi là thay thế toàn bộ nếu vẫn dùng service role / admin.
- **"DB thông minh hơn, app mỏng hơn"** — đúng hướng, nhưng app vẫn giữ luồng màn hình, form, lỗi, UX, hiệu năng bundle; không hiểu là "frontend ngu".

---

## 2. Ưu tiên cao (ROI tốt cho BV103)

| Hạng mục | Nội dung cốt lõi | Vì sao phù hợp dự án này |
|----------|------------------|--------------------------| 
| **Push-down có chừng** | View / RPC cho join lặp, báo cáo, import lô trong một transaction | Giảm round-trip, giảm lỗi "thiếu bước", khớp tinh thần Smart DB |
| **Index đúng chỗ** | Index theo `WHERE` / `JOIN` / `ORDER BY` thật; đo bằng `EXPLAIN` | Tăng tốc rõ ràng, ít rủi ro kiến trúc |
| **Batch / JSON server-side** | Gửi một mảng dòng xuống Postgres xử lý một lần (khi đã có pain import) | Tránh N lần gọi và logic nặng trên trình duyệt |
| **Validate ở biên** | TypeScript chặt + schema (vd. Zod) ở server khi nhận payload | Giảm lỗi runtime, phù hợp Server Actions |
| **Cache dữ liệu đọc nhiều** | SWR / React Query có chiến lược invalidate sau mutation | Mượt tab/trang, tránh số liệu cũ |
| **Song song hóa có chọn** | `Promise.all` cho request độc lập | Giảm chờ, đơn giản |
| **Observability vừa phải** | Log lỗi tập trung, slow query (`pg_stat_statements`) | Biết hỏng trước khi user gọi; chú ý không log PII thô |
| **DDD thực dụng** | `src/modules` theo bounded context; cấm import đục persistence module khác | Giữ ranh giới module sạch sẽ |

---

## 3. Chiến lược hiệu năng y tế (Healthcare Performance Standards)

> Áp dụng cho KSNK 103 — hệ thống kiểm soát nhiễm khuẩn bệnh viện Quân y 103.  
> Tiêu chuẩn này **bắt buộc** khi viết code mới và refactor code cũ.

### 3a. Indexing (Đánh chỉ mục DB)

- **Bắt buộc** đánh INDEX cho tất cả cột FK (`*_id`) và cột thường xuyên trong `WHERE` / `JOIN`.
- **Composite Index** cho truy vấn tra cứu chéo lặp lại (ví dụ: `(khoa_id, ngay_giam_sat)`, `(nhan_vien_id, created_at)`).
- Khi tạo bảng mới → **luôn kèm migration tạo INDEX** cho các cột FK. Không để thiếu.
- Đo hiệu năng bằng `EXPLAIN ANALYZE` trước khi quyết định thêm/bỏ index.

### 3b. Phân trang Server-side (Server Pagination)

- **Cấm** fetch toàn bộ dataset về client cho bảng lịch sử / bảng giao dịch (`fact_*`).
- **Bắt buộc** sử dụng `.range(from, to)` hoặc `LIMIT/OFFSET` trong Server Actions.
- Mỗi trang: mặc định **20 bản ghi**. Tối đa cho phép: **50**.
- Tìm kiếm: **DB thực hiện** (`.ilike()` hoặc `to_tsvector`), không filter trên JavaScript.
- Sắp xếp: **DB thực hiện** (`.order()`), không sort trên Array phía client.
- Hook chuẩn: `useServerPaginatedTable` (đã có tại `src/hooks/use-server-paginated-table.ts`).
- Component chuẩn: `AdvancedDataTable` với prop `serverPagination`.

> **Ngưỡng nâng cấp:** Khi bảng > 100.000 rows và người dùng thường xuyên xem trang 50+, chuyển sang **Cursor-based (Keyset) Pagination** thay OFFSET.

### 3c. Caching danh mục tĩnh (Master Data Caching)

- Danh mục **tĩnh/ít thay đổi** (khoa phòng, nghề nghiệp, khu vực, vi khuẩn, kháng sinh): cache phía server (`unstable_cache` trong `src/lib/cache/master-data-cache.ts`, hoặc `Map` + TTL 5–15 phút).
- Danh mục **động** (bệnh nhân, kết quả xét nghiệm): **KHÔNG cache** hoặc TTL < 30 giây.
- Sau mutation danh mục: **`revalidatePath` / `revalidateTag`** ngay — tránh UI “treo” bản cũ.
- **KHÔNG cache:** dữ liệu bệnh nhân, XN, phiên giám sát đang mở / nhạy cảm.
- **Pattern mẫu (Next `unstable_cache`):**

  ```typescript
  import { unstable_cache } from "next/cache";
  export const getCachedKhoaPhong = unstable_cache(
    async () => { /* fetch từ DB */ },
    ["khoa-phong"],
    { revalidate: 600, tags: ["khoa-phong"] }
  );
  ```

### 3d. Background Jobs & Báo cáo nặng

- Báo cáo tổng hợp / xuất Excel lớn: **KHÔNG chạy trong Server Action request-response**.
- Sử dụng **pg_cron** + **Supabase Edge Functions** cho tác vụ định kỳ.
- Lưu kết quả job vào bảng (trạng thái: pending/running/done/error), UI poll hoặc subscribe để hiển thị.
- Khi tích hợp HIS/LIS: ưu tiên **Supabase Database Webhooks** / **pg_net** cho push notification.

> **Ngưỡng nâng cấp:** Chỉ xét Message Queue (RabbitMQ/Kafka) khi khối lượng > 10.000 messages/giờ từ HIS/LIS.

### 3e. Realtime & Cảnh báo

- Sử dụng **Supabase Realtime** (Postgres Changes) cho cảnh báo khẩn (phát hiện MDRO, ổ dịch mới).
- Không tự xây WebSocket server riêng.
- Áp dụng `channel.on('postgres_changes', ...)` để subscribe bảng cảnh báo.

### 3f. Xác thực Server-side (verifyPermission)

- `verifyPermission()` phải dùng **1 query duy nhất** qua View `v_auth_user_permissions`.
- Cấm quay lại pattern "3 query tuần tự" (getUser → roles → permissions).
- Admin email bypass: kiểm tra từ `ADMIN_EMAILS` trước khi query DB.

### 3h. Rà soát INDEX bắt buộc (Index Audit Workflow)

- **Khi nào:** Trước mỗi release lớn hoặc khi có báo cáo trang chậm.
- **Quy trình:**
  1. Bật `pg_stat_statements` trên Supabase Dashboard.
  2. Xác định top 10 query chậm nhất (`total_exec_time / calls`).
  3. Chạy `EXPLAIN ANALYZE` cho từng query.
  4. Nếu thấy **Seq Scan** trên bảng > 1.000 rows → tạo migration bổ sung INDEX.
  5. Composite index cho pattern lặp: `(khoa_id, created_at)`, `(nhan_vien_id, ngay_giam_sat)`.
- **Quy tắc migration:** Tên file: `2026MMDD_add_index_<tên_bảng>_<cột>.sql`. Luôn dùng `CREATE INDEX IF NOT EXISTS`.

### 3i. CI/CD cơ bản (Continuous Integration)

- **Mục tiêu:** Ngăn lỗi build và lỗi type lọt vào production.
- **Nền tảng:** GitHub Actions (`.github/workflows/ci.yml`).
- **Pipeline tối thiểu:**
  1. `npm ci` — cài dependencies.
  2. `npm run build` — kiểm tra TypeScript + biên dịch.
  3. (Tùy chọn) `npx tsc --noEmit` — type check thuần.
- **Khi nào thêm test:** Khi có logic nghiệp vụ phức tạp trong `src/lib/domain/` (tính tỷ lệ nhiễm khuẩn, phân loại MDRO).

### 3j. Observability cơ bản (Logging & Monitoring)

- **DB Monitoring:** Bật `pg_stat_statements` trên Supabase → Dashboard "Database → Query Performance".
- **Slow Query Alert:** Tạo Edge Function chạy `pg_cron` mỗi giờ, log query có `mean_exec_time > 1000ms`.
- **App Logging:**
  - Server Actions: `console.error` cho lỗi + context (module, action, user_id).
  - **KHÔNG log PII** (tên bệnh nhân, số BHYT) — chỉ log ID.
- **Lộ trình:** pg_stat_statements → Supabase Logs Explorer → (sau này) tích hợp dịch vụ APM nếu cần.

### 3k. Domain Layer — Tách logic nghiệp vụ thuần (Pure Business Logic)

- **Vị trí:** `src/lib/domain/` — chứa **pure functions** không phụ thuộc DB/UI/framework.
- **Đối tượng:**
  - Công thức tính tỷ lệ nhiễm khuẩn (infection rate).
  - Phân loại MDRO (Multi-Drug Resistant Organisms).
  - Logic phân loại tuân thủ vệ sinh tay (WHO 5 moments).
  - Công thức tính Antibiogram (bảng nhạy cảm kháng sinh).
- **Lợi ích:**
  - Testable: viết unit test thuần (không cần mock DB/API).
  - Reusable: dùng chung giữa Server Actions, Edge Functions, và trang báo cáo.
  - Portable: nếu sau này chuyển sang microservice, logic nghiệp vụ không cần viết lại.
- **Quy tắc:** File trong `src/lib/domain/` **KHÔNG được import** từ `@/lib/supabase*`, `next/*`, hoặc React. Chỉ nhận input thuần và trả output thuần.

---

## 4. Làm có điều kiện (đúng lúc, đúng phạm vi)

- **Materialized view / bảng tổng hợp:** Báo cáo nặng, chấp nhận trễ vài phút; lịch refresh; không thay mọi view.
- **Audit bằng trigger:** BV103 **không** dùng bảng log chung `fact_activity_log` (đã gỡ). Nếu sau này cần vết nghiệp vụ, thiết kế theo từng bảng (cột `updated_at` / bản ghi đính chính / log tối thiểu có chủ đích), tránh trigger ghi full JSON mỗi UPDATE.
- **Temporal / versioning (`valid_from` / `valid_to`):** Thực thể nhạy cảm (nhân sự–khoa, phân quyền, danh mục ảnh hưởng báo cáo).
- **RLS sâu:** Khi mô hình user/session thống nhất, giảm rủi ro quên `WHERE`.
- **Virtualization (react-window):** Chỉ khi cần render > 100 dòng cùng lúc (Antibiogram grid, bảng kháng sinh đồ).
- **Table Partitioning:** Chỉ khi bảng `fact_*` vượt 5-10 triệu rows.

---

## 5. Hoãn / chỉ khi quy mô đòi hỏi

- **EDA đầy đủ** (NOTIFY/LISTEN làm backbone): Dễ phức tạp delivery, retry, idempotency.
- **Mega-RPC "một lần lấy hết master cả app":** Payload và quyền khó kiểm soát; tốt hơn theo gate / theo màn.
- **IaC toàn phạm vi (Terraform mọi thứ):** Ưu tiên migration + quy trình Supabase hiện có.
- **Message Queue (Kafka/RabbitMQ):** Chỉ khi tích hợp HIS/LIS realtime với khối lượng > 10.000 messages/giờ.
- **Cold/Hot Data Archiving:** Chỉ khi chi phí storage tăng rõ rệt hoặc query chậm > 5s trên bảng lớn.

---

## 6. Thứ tự thực hiện (Thực tế, không choáng)

1. **Đo đau cụ thể** (trang chậm, import, báo cáo, N+1).
2. **Smart DB có mục tiêu:** view / RPC / index / batch cho **đúng luồng đó**; khớp [`10-bv103-implementation-mapping.md`](./10-bv103-implementation-mapping.md).
3. **Chặt biên + cache + quan sát cơ bản.**
4. **Temporal / cột vết tối thiểu** theo từng nhóm bảng quan trọng nếu cần — không dùng lại trigger log JSON toàn cục (`fact_activity_log` đã gỡ).
5. Chỉ sau đó xét **EDA / IaC rộng** nếu vận hành thật sự cần.

---

## 7. BV103 — Cách triển khai Smart DB trong code (hiện trạng)

- **Luồng chuẩn:** `UI (RSC/client)` → **Server Action** (`*.actions.ts`) → **Supabase** (`createServerSupabaseUserClient` / `createAdminSupabaseClient`) → bảng `dm_*` / `mdm_*` / `fact_*` hoặc **view** `v_*` / **RPC** `rpc_*`.
- **Push-down (đã dùng):** View tổng hợp (vd. `v_fact_giam_sat_*_full`, `v_mdm_nhan_su_full`) để join một lần thay vì N query từ app; dashboard tuân thủ gọi **RPC** tổng hợp (`rpc_get_dashboard_*`, `rpc_get_compliance_dashboard_multi_v1`) — giảm round-trip so với tách nhiều action.
- **Phân trang / giới hạn:** Bảng lịch sử `fact_*` dùng `.range` + `count: 'exact'` khi cần; script gate `scripts/engineering-contract-gate.mjs` cảnh báo read action đọc `fact_*` mà không có `range` / `limit` / `rpc` / `single` (chế độ strict: `ENGINEERING_GATE_STRICT=1`).
- **Cột rõ ràng:** Ưu tiên `.select('cột1,cột2' as const)` thay `*` trên view rộng — giảm payload và giữ inference TypeScript; tránh chuỗi `.join()` thuần (mất literal).
- **Cache master:** `getCachedDmKhoaPhong`, `getCachedDmNgheNghiep`, … trong `src/lib/cache/master-data-cache.ts` — dùng lại cho dropdown lặp; không cache phiên giám sát / bệnh nhân.
- **Phiên & proxy:** `src/proxy.ts` chỉ `getUser` + cookie — **không** thêm query DB; RBAC client `usePermission` cache 5 phút + một request đồng thời tới `v_auth_user_permissions`.
- **Đo DB:** Pilot `EXPLAIN` — `scripts/sql/pilot-dashboard-rpc-explain-*.sql`; cửa sổ tháng mặc định `BV103_ANALYTICS_DEFAULT_MONTHS` trong `src/lib/bv103-analytics-default-range.ts`.

**Ảnh hưởng hiệu năng:** Smart DB **có** ảnh hưởng trực tiếp (tốt nếu làm đúng: ít round-trip, index đúng, RPC gọn; xấu nếu `select *` + full scan + N+1). Tối ưu UI không bù được query nặng lặp lại.

---

*Tài liệu này cố ý ngắn để tra cứu nhanh; tuân thủ AGENTS.md V7.4.*
