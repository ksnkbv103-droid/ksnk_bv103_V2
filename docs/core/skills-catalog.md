# Skills catalog — BV103

> Allowlist cho agent. **Không** cài full marketplace — thêm từng skill rồi `npm run skills:lock`.  
> Mặc định **manual @mention** — tránh load descriptor mỗi turn.

## Local (`.agents/skills/`)

| Skill | Khi dùng | Invoke |
|-------|----------|--------|
| `smart-db-bv103` | Migration, RPC, index, RLS, import lô, refactor data layer | `@smart-db-bv103` |
| `react-dev` | Component React 19, hooks, typing UI mới | `@react-dev` |
| `reviewing-code` | Review PR / diff trước merge | `/review` hoặc `@reviewing-code` |
| `supabase` | Auth, RLS, Supabase client, CLI | `@supabase` |
| `giam-sat-pilot` | VST/GSC form, scoring, phiên, import | `@giam-sat-pilot` |
| `qlcv-pilot` | Kanban, checklist RPC, spawn định kỳ | `@qlcv-pilot` |

Khóa phiên bản: `npm run skills:lock` → `skills-lock.json`.

## Agents (`.cursor/agents/`)

| Agent | Khi dùng | Mode |
|-------|----------|------|
| `explore-module` | Khám phá 1 module, map route/action/RPC | readonly |
| `review-bv103` | Review diff trước merge | readonly |
| `db-verify` | Đối chiếu migration ↔ mapping | readonly |

## User-level (optional, không lock)

| Skill | Khi dùng | Invoke |
|-------|----------|--------|
| `next-best-practices` | App Router, RSC conventions | manual @ |
| `code-review-nextjs` / `parallel-code-review` | PR lớn | manual @ |
| `webapp-testing` / `agent-browser` | QA UI tự động | manual @ |

## Thêm skill mới

```bash
npm run skills:sync:reviewing-code   # ví dụ có sẵn
npm run skills:lock
```

Cập nhật `scripts/skills-lock.mjs` nếu thư mục skill mới chưa map nguồn.

## Cursor rules

- Lõi: `00-core`, `01-agent-discipline`
- Edit `src/`: `03-src-editing-compact` (+ module `12–17`)
- Workflow: `/intake` → `02-task-intake-freeze` (manual)
- Playbook: [`cursor-operating-playbook.md`](cursor-operating-playbook.md)
