# Skills catalog — BV103

> Allowlist cho agent. **Không** cài full marketplace — thêm từng skill rồi `npm run skills:lock`.  
> Mặc định **manual @mention** — tránh load descriptor mỗi turn.

## Local (`.agents/skills/`)

| Skill | Khi dùng | Invoke |
|-------|----------|--------|
| `po-intake` | PO không rành code — dịch nghiệp vụ → intake | `/intake-nv` hoặc `@po-intake` |
| `smart-db-bv103` | Migration, RPC, index, RLS, import lô, refactor data layer | `@smart-db-bv103` |
| `cssd-pilot` | Mẻ/QR, tiệt khuẩn, ranh giới CSSD↔MDM | `@cssd-pilot` |
| `dashboard-pilot` | KPI, CCS, báo cáo tổng hợp, analytics | `@dashboard-pilot` |
| `react-dev` | Component React 19, hooks, typing UI mới | `@react-dev` |
| `reviewing-code` | Review PR / diff trước merge | `/review` hoặc `@reviewing-code` |
| `supabase` | Auth, RLS, Supabase client, CLI | `@supabase` |
| `giam-sat-pilot` | VST/GSC form, scoring, phiên, import | `@giam-sat-pilot` |
| `qlcv-pilot` | Kanban, checklist RPC, spawn định kỳ | `@qlcv-pilot` |

Khóa phiên bản: `npm run skills:lock` → `skills-lock.json`.

## MCP (project)

- Config: [`.cursor/mcp.json`](../../.cursor/mcp.json) — **Supabase MCP** (OAuth trong Cursor; không commit secret).
- Khi đụng schema / RLS / bảng thật: **ưu tiên MCP Supabase** để đối chiếu, rồi mới CLI (`mdm:migrate`, `verify:mdm`).
- Không đoán schema từ trí nhớ — khớp `01-agent-discipline`.

## Agents (`.cursor/agents/`)

| Agent | Khi dùng | Mode |
|-------|----------|------|
| `intake-coach` | Mô tả nghiệp vụ thô → intake duyệt | readonly |
| `acceptance-ui` | Intake → checklist test tay cho PO | readonly |
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

Cập nhật `scripts/skills-lock.mjs` nếu thư mục skill mới chưa map nguồn (`bv103Local`).

## Cursor rules

- Lõi: `00-core`, `01-agent-discipline`, **`04-po-workflow`** (PO — always on)
- Edit `src/`: `03-src-editing-compact` (+ module `12–19`)
- Workflow PO: `/intake-nv` → `02-task-intake-freeze` (manual)
- Playbook: [`cursor-operating-playbook.md`](cursor-operating-playbook.md) · PO: [`po-cursor-guide.md`](po-cursor-guide.md)

## Slash commands

| Lệnh | Ai dùng |
|------|---------|
| `/intake-nv` | PO — ngôn ngữ nghiệp vụ |
| `/intake` | Dev — scope kỹ thuật |
| `/implement` | Sau duyệt intake |
| `/ship-slice` | Verify + review sau test tay |
| `/review`, `/explain`, `/commit`, `/pr-create` | Theo tên |
