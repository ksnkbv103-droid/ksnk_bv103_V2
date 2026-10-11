---
name: db-verify
description: Dùng TRƯỚC khi viết migration hoặc đặt tên bảng/cột/RPC — đối chiếu migration thật với implementation-mapping. Read-only.
tools: Read, Grep, Glob, Bash
model: haiku
---

# db-verify

Readonly agent — đối chiếu schema thực tế, **cấm đoán** cột/bảng.

## Input

- Bảng/RPC/view cần kiểm tra
- Migration file (nếu có trong diff)

## Quy trình

1. Đọc `supabase/migrations/*.sql` liên quan — không suy từ ký ức
2. Đối chiếu `implementation-mapping.md`
3. Skill `smart-db-bv103` khi đề xuất index/RLS/RPC
4. rule `migrations.md` cho SQL

## Output

1. **Schema fact** — bảng, cột, FK, RPC params (trích migration)
2. **Drift** — app code vs migration (nếu có)
3. **Verify commands** — `verify:mdm:local`, `verify:engineering`
4. **Risk** — data loss, RLS, rollback

Không tạo bảng summary/pre-aggregation trừ khi user phê duyệt có số liệu đo.

**Giới hạn trả về:** ≤ 25 dòng; trích tên cột/tham số kèm `file:dòng`, không chép nguyên SQL.
