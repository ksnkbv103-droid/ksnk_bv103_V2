# Skill BV103 — catalog & allowlist (một file)

Đây là **nguồn duy nhất** cho skill được phép (đã gộp allowlist cũ).

Skill trong `.agents/skills/` **chỉ bổ trợ kỹ thuật**; không thay [`AGENTS.md`](../../AGENTS.md), mapping DB, hay permission registry.

**Nguyên tắc:** Tối đa **2 skill / phiên**. Cài thêm từ marketplace **chỉ khi task yêu cầu** — sau đó `npm run skills:lock`. Không chạy script đồng bộ full marketplace.

## Bộ giữ trong repo (4)

| Skill | Khi mở |
|-------|--------|
| [`smart-db-bv103`](../../.agents/skills/smart-db-bv103/SKILL.md) | Migration, RPC, index, batch, import nặng — kèm [`SMART_DB_PRAGMATIC_PLAYBOOK.md`](./SMART_DB_PRAGMATIC_PLAYBOOK.md) |
| [`supabase`](../../.agents/skills/supabase/SKILL.md) | Auth, RLS, client SSR, migration, Storage |
| [`react-dev`](../../.agents/skills/react-dev/SKILL.md) | React + TypeScript, component, hooks; layout BV103 → [`BV103_LAYOUT_PRIMITIVES.md`](./working/BV103_LAYOUT_PRIMITIVES.md) |
| [`reviewing-code`](../../.agents/skills/reviewing-code/SKILL.md) | Review PR / diff (PR lớn: chia nhỏ PR trước, hạn chế review song song tốn token) |

## Cài lại tạm khi thật cần

| Nhu cầu | Gợi ý |
|---------|--------|
| shadcn / UI kit | `npx skills add shadcn/ui -a cursor -y --copy` rồi `npm run skills:lock` |
| Excel deliverable | `npx skills add anthropics/skills -a cursor -s xlsx -y --copy` |
| Postgres tuning sâu | `npx skills add supabase/agent-skills -a cursor -s supabase-postgres-best-practices -y --copy` |

Lock file: [`skills-lock.json`](../../skills-lock.json) (sinh bởi `node scripts/skills-lock.mjs`).
