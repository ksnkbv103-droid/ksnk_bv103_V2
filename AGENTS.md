# KSNK 103 — AGENTS.md (V8 · tối giản)

> BV103 — Khoa Kiểm soát nhiễm khuẩn · Quân y 103  
> **Chuẩn cao nhất trong repo.** Cập nhật: 15/05/2026.

## Ưu tiên sản phẩm (1 câu)

**Luồng nghiệp vụ ổn định + dữ liệu khớp DB + danh sách không tải full bảng** — trước polish UI và trước kiến trúc “hào nhoáng”.

## Phân cấp khi mâu thuẫn

1. **`AGENTS.md`** (file này)  
2. **`.cursor/rules/*.mdc`** (glob theo file đang sửa — ưu tiên `00-core`, rồi `12–16` khi sửa đúng module)  
3. **`docs/specs/*`** — không tự bịa schema; có migration + [`10-bv103-implementation-mapping.md`](docs/specs/10-bv103-implementation-mapping.md)  
4. **Skill** — chỉ trong [`SKILLS_CATALOG.md`](docs/specs/SKILLS_CATALOG.md) + thư mục [`.agents/skills/`](./.agents/skills/) (tối đa **2 skill / phiên**).

## Router — tối thiểu token

| Việc | File |
|------|------|
| **Thực thi + checklist PR** | [`docs/specs/working/LEAN_EXECUTION_BV103.md`](docs/specs/working/LEAN_EXECUTION_BV103.md) |
| **Skill (allowlist)** | [`docs/specs/SKILLS_CATALOG.md`](docs/specs/SKILLS_CATALOG.md) |
| Đọc tối thiểu theo diff | [`docs/specs/READ_MINIMUM_BY_CHANGE.md`](docs/specs/READ_MINIMUM_BY_CHANGE.md) |
| Mapping module ↔ DB | [`docs/specs/10-bv103-implementation-mapping.md`](docs/specs/10-bv103-implementation-mapping.md) |
| Migration / SQL | [`docs/specs/GOVERNANCE_PIPELINE.md`](docs/specs/GOVERNANCE_PIPELINE.md) |
| Smart DB đầy đủ (khi cần) | [`docs/specs/SMART_DB_PRAGMATIC_PLAYBOOK.md`](docs/specs/SMART_DB_PRAGMATIC_PLAYBOOK.md) |
| Lộ trình theo mảnh | [`PROGRESS_REPORT.md`](./PROGRESS_REPORT.md) |
| Index spec | [`docs/specs/README.md`](docs/specs/README.md) |
| Admin client audit | [`docs/specs/working/SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md`](docs/specs/working/SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md) |
| **Deploy pilot 4 module** (Quản trị, GSC, VST, Dashboard) | [`docs/specs/working/DEPLOY_FOUR_MODULES_BV103.md`](docs/specs/working/DEPLOY_FOUR_MODULES_BV103.md) |
| **Layout shell & primitive UI** (đồng bộ form/panel, module mới) | [`docs/specs/working/BV103_LAYOUT_PRIMITIVES.md`](docs/specs/working/BV103_LAYOUT_PRIMITIVES.md) |

## Tiết kiệm token & quota (agent + người vận hành)

- **Một vòng deploy = một gói tín hiệu:** đính kèm log lỗi đầy đủ (CI / build / runtime) + URL bước tái hiện; tránh nhắn nhiều lần “vẫn lỗi” không có log.  
- **Đọc tối thiểu:** [`READ_MINIMUM_BY_CHANGE.md`](docs/specs/READ_MINIMUM_BY_CHANGE.md) + diff nhỏ; không mở rộng phạm vi “dọn cả repo” khi chỉ cần sửa một lỗi deploy.  
- **Xác minh trước khi hỏi AI:** `npm run build` / `npm run verify:engineering` local giống gate CI càng gần càng tốt — giảm vòng lặp đoán mò trên máy agent.  
- **Không nhân đôi ngữ cảnh:** một task → một thread rõ ràng; tách PR lớn thành mảnh nhỏ thay vì một phiên chat kéo dài nhiều chủ đề.  
- **Kỹ năng có giới hạn:** tối đa **2 skill / phiên** (đã nêu ở trên) — chỉ bật skill khi thật sự cần.

## Hiệu năng, tải trang & code “thông minh” (tránh chậm + tránh lỗi)

- **Giảm round-trip:** gom nhiều gọi server vào **một Server Action** khi cùng một màn hình cần dữ liệu song song (ví dụ bundle dashboard); tránh N lần POST từ client cho một thao tác người dùng.  
- **Tránh waterfall không cần thiết:** sau khi đảm bảo đúng nghiệp vụ, ưu tiên `Promise.all` trên server thay vì chuỗi `await` dài từ client.  
- **Route nặng (chart / bundle lớn):** cân nhắc `next/dynamic` + tách view — **không** đổi hành vi nghiệp vụ chỉ để “gọn file”; mục tiêu là **giảm JS ban đầu** và tránh hydrate tốn kém nếu không cần SSR.  
- **Auth & tác vụ phụ:** làm mới session qua **`src/proxy.ts`** (Next 16 — thay `middleware.ts`) và **hoãn** tác vụ không chặn UI (idle / sau tải chính) — không hy sinh kiểm tra bắt buộc (inactive, quyền).  
- **Đo trước khi tối ưu sâu:** Network waterfall + thời gian RPC; tối ưu DB (index, RPC) thường mang lại nhiều hơn so với chỉnh JSX.  
- **Khoảng ngày mặc định analytics:** hằng số `BV103_ANALYTICS_DEFAULT_MONTHS` trong [`src/lib/bv103-analytics-default-range.ts`](src/lib/bv103-analytics-default-range.ts) — chỉnh **một chỗ**; tăng tháng = tải RPC nặng hơn.  
- **An toàn khi tối ưu:** không bỏ gate quyền / soft-delete / ranh giới module để “nhanh hơn”; mọi thay đổi perf phải **verify** (`verify:engineering` / build) khi đụng Action hoặc `fact_*`.

## Kiến trúc & dữ liệu (tóm tắt)

- **SSOT quyền:** [`src/lib/permission-registry.ts`](src/lib/permission-registry.ts) — module mới phải đăng ký.  
- **Lớp bảng:** `mdm_*` · `dm_*` · `fact_*`. Không thêm `dict_*` mới; không nhân đôi danh mục đồng nghĩa.  
- **Đặt tên:** FK `*_id`, mã `ma_*`, tên `ten_*`, `is_active`, `created_at` / `updated_at`.  
- **Luồng:** `UI → Action → DB → Báo cáo`. Không tính năng ngoài yêu cầu rõ ràng.

### Đồng bộ App ↔ Database (khi điều chỉnh tính năng)

- **Một thay đổi nghiệp vụ đụng schema / RPC / RLS** phải kèm **migration** trong [`supabase/migrations/`](supabase/migrations/) và cập nhật mapping trong [`docs/specs/10-bv103-implementation-mapping.md`](docs/specs/10-bv103-implementation-mapping.md) khi thêm cột, bảng `fact_*`, hoặc hàm DB mà app gọi.  
- **Agent:** trong cùng task, sau khi thêm/sửa migration, **chạy apply lên DB** mà môi trường dev/pilot đã cấu hình — `npm run mdm:migrate` (Supabase **linked** remote) hoặc `npm run mdm:migrate:local` (stack local), theo [`GOVERNANCE_PIPELINE.md`](docs/specs/GOVERNANCE_PIPELINE.md). Mục tiêu: **không** để code đã dùng cột mới trong khi DB chưa migrate (tránh lỗi kiểu `column … does not exist`). Nếu CLI báo migration local “nằm trước” migration cuối trên remote: `npx supabase db push --include-all` (chỉ khi chấp nhận áp dụng file đó lên remote).  
- **Nếu không push được** (chưa `supabase link`, thiếu quyền, CI không có DB): ghi rõ trong kết quả task **file migration cần apply** và lệnh chạy; không coi task “xong” nếu vẫn thiếu bước apply mà người vận hành chưa biết.

## Cấu trúc file trong module (bảo dưỡng, tránh manh mún)

- **Khung chuẩn BV103:** mỗi bounded context trong [`src/modules/<ten>/`](src/modules) với `actions/`, `components/`, `hooks/`, `lib/`, `types/` (đã dùng ở QLCV, GSC, VST, …). Logic nghiệp vụ **không** nhét dài vào `page.tsx` nếu đã có chỗ trong module.
- **Một trách nhiệm / một lớp:** *trách nhiệm* = một lý do đổi code (ví dụ chỉ quyền & cổng QLCV → `lib/qlcv-access.ts`). *Lớp* = **UI** (điều hướng, hiển thị, gọi action) tách khỏi **policy thuần** (`lib/`) và **I/O + gate** (`actions/` + `verifyPermission`).
- **Tên rõ:** ưu tiên hậu tố/tiền tố theo vai trò: `*-access.ts`, `*-workflow*.ts`, `*-validations.ts` — tránh `utils.ts` / `helpers.ts` chung chung.
- **Ít nhánh:** ưu tiên hàm thuần / bảng trạng thái thay vì `if` lồng nhau trong component; điều kiện phức tạp đưa xuống `lib/` có kiểu rõ.
- **Test được:** phần **thuần** (không gọi DB) đặt trong `lib/` để test đơn vị; Server Action mỏng: xác thực quyền → gọi `lib/` → Supabase.
- **Không tách “vì sợ file dài”:** tránh file 10–20 dòng chỉ bọc một lần gọi. Chỉ tách component/panel khi **lặp**, **khó đọc** (ví dụ page ~400+ dòng với nhiều khối độc lập), hoặc **test/review** thực sự khó — tách cùng thư mục module (`XxxHeader.tsx`, `XxxTablePanel.tsx`).
- **Agent:** khi sửa một luồng, ưu tiên **`lib/` + `actions/`** trong đúng module; không refactor rộng ngoài phạm vi diff nếu [`READ_MINIMUM_BY_CHANGE.md`](docs/specs/READ_MINIMUM_BY_CHANGE.md) không yêu cầu.

## Layout UI — shell, primitive, tránh “card lồng card”

- **Shell:** khối bọc ngoài (nền + viền + bo + shadow + padding); **nội dung** nằm bên trong — tách ranh giới thị giác khỏi logic hook.  
- **Đồng bộ:** token toàn app trong `globals.css`; **class lặp theo module** gom vào `lib/<module>-*-chrome.ts` (hoặc primitive trong `components/shared/` khi ≥3 module dùng chung) — chi tiết và lộ trình: [`BV103_LAYOUT_PRIMITIVES.md`](docs/specs/working/BV103_LAYOUT_PRIMITIVES.md).  
- **Layer:** ưu tiên **1–2 tầng nâng** cho vùng nội dung chính; không chồng border + ring + shadow chỉ để “tách bạch” nếu không mang lại hierarchy rõ.  
- **SSOT class:** [`src/lib/bv103-layout-chrome.ts`](src/lib/bv103-layout-chrome.ts); gợi ý drift: `npm run layout:drift-check`.

- **Detect → Model → Fix → Verify** — xem [`LEAN_EXECUTION_BV103.md`](docs/specs/working/LEAN_EXECUTION_BV103.md).  
- **Trước khi xong** task đụng Server Action / `fact_*`: `npm run verify:engineering` (hoặc `verify:full` trước push).

## Domain (neo ngắn)

- **Bounded context:** MDM, CSSD, Giám sát (VST/GSC), Task, NKBV — không đọc/ghi bảng ngoài phạm vi.  
- **CSSD:** nhiệt / phi nhiệt; bộ vô khuẩn khi **mọi** mẻ liên quan đạt.  
- **VST:** tối đa 3 đối tượng / phiên (trừ yêu cầu mới).  
- **Fact:** ưu tiên đính chính / soft-delete thay xóa cứng khi phù hợp nghiệp vụ (trừ quyết định migration). **Không** dùng nhật ký thay đổi toàn cục `fact_activity_log` / `fn_auto_audit_log` — đã gỡ bằng migration [`20260512001_remove_fact_activity_log_and_triggers.sql`](supabase/migrations/20260512001_remove_fact_activity_log_and_triggers.sql).

## Mục tiêu cuối

Hệ thống **đúng nghiệp vụ**, dữ liệu **nhất quán migration**, vận hành **đo được** (build + gate + pilot theo `PROGRESS_REPORT.md`).
