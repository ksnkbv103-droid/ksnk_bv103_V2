# KSNK 103 — AGENTS.md (V8 · tối giản)

> BV103 — Khoa Kiểm soát nhiễm khuẩn · Quân y 103  
> **Chuẩn cao nhất trong repo.** Cập nhật: 11/05/2026.

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

## Kiến trúc & dữ liệu (tóm tắt)

- **SSOT quyền:** [`src/lib/permission-registry.ts`](src/lib/permission-registry.ts) — module mới phải đăng ký.  
- **Lớp bảng:** `mdm_*` · `dm_*` · `fact_*`. Không thêm `dict_*` mới; không nhân đôi danh mục đồng nghĩa.  
- **Đặt tên:** FK `*_id`, mã `ma_*`, tên `ten_*`, `is_active`, `created_at` / `updated_at`.  
- **Luồng:** `UI → Action → DB → Báo cáo`. Không tính năng ngoài yêu cầu rõ ràng.

## Vòng chất lượng ngắn

- **Detect → Model → Fix → Verify** — xem [`LEAN_EXECUTION_BV103.md`](docs/specs/working/LEAN_EXECUTION_BV103.md).  
- **Trước khi xong** task đụng Server Action / `fact_*`: `npm run verify:engineering` (hoặc `verify:full` trước push).

## Domain (neo ngắn)

- **Bounded context:** MDM, CSSD, Giám sát (VST/GSC), Task, NKBV — không đọc/ghi bảng ngoài phạm vi.  
- **CSSD:** nhiệt / phi nhiệt; bộ vô khuẩn khi **mọi** mẻ liên quan đạt.  
- **VST:** tối đa 3 đối tượng / phiên (trừ yêu cầu mới).  
- **Fact:** ưu tiên đính chính / soft-delete thay xóa cứng khi phù hợp nghiệp vụ (trừ quyết định migration). **Không** dùng nhật ký thay đổi toàn cục `fact_activity_log` / `fn_auto_audit_log` — đã gỡ bằng migration [`20260512001_remove_fact_activity_log_and_triggers.sql`](supabase/migrations/20260512001_remove_fact_activity_log_and_triggers.sql).

## Mục tiêu cuối

Hệ thống **đúng nghiệp vụ**, dữ liệu **nhất quán migration**, vận hành **đo được** (build + gate + pilot theo `PROGRESS_REPORT.md`).
