# Skills catalog — BV103

> Allowlist cho agent. **Không** cài full marketplace — thêm từng skill rồi `npm run skills:lock`.

## Local (`.agents/skills/`)

| Skill | Khi dùng |
|-------|----------|
| `smart-db-bv103` | Migration, RPC, index, RLS, import lô, refactor data layer |
| `react-dev` | Component React 19, hooks, typing UI |
| `reviewing-code` | Review PR / diff trước merge |
| `supabase` | Auth, RLS, Supabase client, CLI |

Khóa phiên bản: `npm run skills:lock` → `skills-lock.json`.

## User-level (Cursor global — optional, không lock)

Có thể bật thêm từ `~/.cursor/skills-cursor/` hoặc `~/.agents/skills/` khi cần, **không** thay allowlist dự án:

| Skill | Khi dùng |
|-------|----------|
| `next-best-practices` | App Router, RSC, routing conventions |
| `code-review-nextjs` / `parallel-code-review` | PR lớn, review đa góc nhìn |
| `webapp-testing` / `agent-browser` | QA tay tự động, Playwright |

## Thêm skill mới vào dự án

```bash
npm run skills:sync:reviewing-code   # ví dụ có sẵn trong package.json
npm run skills:lock
```

Cập nhật `scripts/skills-lock.mjs` nếu thư mục skill mới chưa map nguồn.

## Cursor rules

- Lõi: `.cursor/rules/00-core-ksnk-rules.mdc`, `01-agent-discipline.mdc`
- Module: `12–17` theo glob file đang sửa (`17` = NKBV)
