# Thực thi tối giản — BV103 (một trang)

> **Mục đích:** Gom nội dung từng rule dài (quota, Smart DB, làm chắc, giải thích user) để agent **chỉ đọc file này** cho 80% task. Chi tiết sâu: [`SMART_DB_PRAGMATIC_PLAYBOOK.md`](../SMART_DB_PRAGMATIC_PLAYBOOK.md) khi đụng DB nặng.

## 1) Một module / một nhịp

- Vòng: **Detect → Model (chốt mapping/SSOT) → Fix → Verify** — không audit cả repo nếu user chỉ sửa một chỗ.
- **Một `ACTIVE`:** xong vertical slice (types → migration nếu có → action → UI → verify) rồi mới mở mảnh khác — xem [`PROGRESS_REPORT.md`](../../../PROGRESS_REPORT.md).

## 2) Làm chắc (tối thiểu bắt buộc)

- **Contract-first:** `types.ts` / type rõ cho return action; **cấm** `any` làm kiểu trả về chính.
- **Migration-then-code:** không action cho bảng/view chưa có migration trong `supabase/migrations/`.
- **Tên file migration mới:** `YYYYMMDD_<mô_tả_snake_ngắn>.sql`; **không** đổi tên file đã apply trên DB (legacy giữ nguyên). Chi tiết: [`GOVERNANCE_PIPELINE.md`](../GOVERNANCE_PIPELINE.md).
- **Zod** ở ranh giới server action cho input user (hoặc ngoại lệ ghi rõ).
- **Quyền:** `verifyPermission` / `verifyPermissions` theo luồng; admin client chỉ sau gate — [`SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md`](./SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md).
- **Trước khi xong task** đụng Server Action / `fact_*`: `npm run verify:engineering` (hoặc `verify:full` trước push).

## 3) Smart DB (thực dụng, không over-engineer)

- Tên bảng/cột: [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md); pipeline: [`GOVERNANCE_PIPELINE.md`](../GOVERNANCE_PIPELINE.md).
- `fact_*` danh sách: **phân trang server** (~20 dòng), không fetch full.
- Index cho FK / cột filter thường dùng; chỉ tối ưu sâu khi có **pain đo được**.
- Một lần resolve quyền chuẩn (view/registry), tránh chuỗi query quyền lặp.

## 4) Frontend / quota

- **Layout / form mới:** ưu tiên [`bv103-layout-chrome.ts`](../../../src/lib/bv103-layout-chrome.ts) / `lib/*-chrome.ts` — tránh magic `rounded-[32px]`; trước merge PR chỉnh UI lớn có thể chạy `npm run layout:drift-check`. Chi tiết: [`BV103_LAYOUT_PRIMITIVES.md`](./BV103_LAYOUT_PRIMITIVES.md).
- Ưu tiên hook/component có sẵn; copy logic từ 2 nơi → tách hook.
- Trả lời user ngắn: file đã sửa, build/verify, bước tiếp theo.
- Thay đổi lớn: 3 dòng (mục tiêu / đang làm / tác động); sau mỗi nhóm thay đổi lớn: “Giải thích dễ hiểu” (trước/sau, có cần thao tác tay).

## 5) Khi nào đọc thêm

- Đổi loại file: [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md).
- Spec theo module (CSSD, giám sát, …): rule `.cursor/rules/12–16` có **glob** trên đúng thư mục — mở khi sửa file đó.
- Quyết định kiến trúc lớn: `docs/decisions/YYYY-MM-DD-*.md`.

---

## 6) Checklist PR / task (bắt buộc)

1. [`AGENTS.md`](../../../AGENTS.md) + file này + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) (+ [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md) nếu đụng DB).
2. Skill: **tối đa 2** trong [`SKILLS_CATALOG.md`](../SKILLS_CATALOG.md) (allowlist duy nhất).
3. `fact_*` / bảng lớn: phân trang server ~20 dòng; có `npm run verify:engineering` khi đụng Server Action / `fact_*`.
4. Input user: **Zod** ở server action (hoặc ghi rõ ngoại lệ trong PR).
5. Quyền: `verifyPermission` / `verifyPermissions`; admin client → [`SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md`](./SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md).
6. Trước push: `npm run verify:full` hoặc `npm run build` + `npm run verify:engineering`.
7. Luồng quản trị nặng: `npm run verify:admin` khi đụng admin đúng phạm vi.
