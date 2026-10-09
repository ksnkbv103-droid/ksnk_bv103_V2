# Skills catalog — BV103

> Mục lục Cursor trong repo: skill, agent, rule, lệnh. **Thân lệnh giữ ở** `.agents/skills/`, `.cursor/agents/`, `.cursor/rules/`, `.cursor/commands/` — file này không chép lại nội dung.  
> Allowlist skill. **Không** cài full marketplace — thêm từng skill rồi `npm run skills:lock`.  
> Mặc định **manual @mention** — tránh load descriptor mỗi turn.  
> Lộ trình rà soát đang theo: [`handover-roadmap.md`](handover-roadmap.md) §5.

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
- Khi đụng schema / RLS / bảng thật: **ưu tiên MCP Supabase** để đối chiếu. Không db push lên prod — migration prod đi qua Lead/MCP (`apply_migration`); local: `npm run mdm:migrate:local`. Rồi `verify:mdm`.
- Không đoán schema từ trí nhớ — khớp `01-agent-discipline`.

## Agents (`.cursor/agents/`)

| Agent | Khi dùng | Mode |
|-------|----------|------|
| `intake-coach` | Mô tả nghiệp vụ thô → intake duyệt | readonly |
| `acceptance-ui` | Intake → checklist test tay cho PO | readonly |
| `explore-module` | Khám phá 1 module, map route/action/RPC | readonly |
| `review-bv103` | Review diff trước merge | readonly |
| `db-verify` | Đối chiếu migration ↔ mapping | readonly |
| `slice-supervise` | Giám sát diff lát vs DoD | readonly |

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

## Cursor rules (`.cursor/rules/`)

RACI và cấm đọc CDC thô nằm trong `00-core-ksnk-rules.mdc` (always-on). Playbook vận hành: [`cursor-operating-playbook.md`](cursor-operating-playbook.md). Cheat sheet PO: [`po-cursor-guide.md`](po-cursor-guide.md).

| File | Khi gắn | Việc |
|------|---------|------|
| `00-core-ksnk-rules.mdc` | always | RACI Grok/Cursor/PO, một lát, verify, không đọc CDC thô |
| `01-agent-discipline.mdc` | always | Một slice, không đoán schema, token hygiene |
| `02-task-intake-freeze.mdc` | `/intake` | Khóa spec trước khi code |
| `03-src-editing-compact.mdc` | `src/**` | Boundary, style, schema khi sửa app |
| `04-po-workflow.mdc` | `/intake-nv` | PO không rành code — không always-on |
| `05-domain-auto-slice.mdc` | always | Rà/sửa: SSOT đã chốt thì tự chọn, một lát |
| `12-cssd-erp-spec-context.mdc` | `cssd-erp`, `cssd-su-co` | Neo spec CSSD |
| `13-giam-sat-spec-context.mdc` | `giam-sat-*` | Neo spec VST/GSC |
| `14-cong-viec-spec-context.mdc` | `quan-ly-cong-viec` | Neo spec QLCV |
| `15-danh-muc-mdm-spec-context.mdc` | danh mục quản trị | Neo MDM / import |
| `16-bang-kiem-spec-context.mdc` | bảng kiểm quản trị | Neo ma trận bảng kiểm |
| `17-nkbv-spec-context.mdc` | `giam-sat-nkbv` | Neo NKBV — không đọc CDC thô |
| `18-dashboard-analytics-spec-context.mdc` | dashboard, thống kê | KPI / RPC báo cáo |
| `19-dao-tao-spec-context.mdc` | `dao-tao` | Thi MCQ lean |
| `20-master-data-placement.mdc` | CSSD + quản trị | Chỗ đặt master data |
| `50-schema-sync-gate.mdc` | actions, types | Khớp code ↔ cột thật |
| `51-database-migration-rules.mdc` | `supabase/migrations` | Migration additive, mapping |
| `62-destructive-change-gate.mdc` | migration | Cổng xóa schema / xóa module |
| `81-frontend-performance.mdc` | bảng, read action | Hiệu năng bảng |
| `82-architecture-quality.mdc` | migration, `src/lib/domain` | Cache, index, domain layer |
| `agent-efficiency.mdc` | `@agent-efficiency` hoặc `/implement` | Không auto-glob |

`.cursorignore` loại `node_modules`, `.next`, `docs/data`, `archive`, dump `_agent` khỏi `@codebase`.

## Slash commands (`.cursor/commands/`)

| Lệnh | File | Ai dùng |
|------|------|---------|
| `/intake-nv` | `intake-nv.md` | PO — ngôn ngữ nghiệp vụ |
| `/intake` | `intake.md` | Dev — scope kỹ thuật |
| `/implement` | `implement.md` | Sau duyệt intake |
| `/grok-handoff` | `grok-handoff.md` | Task dán từ Grok (DoD + whitelist) |
| `/domain-slice` | `domain-slice.md` | Rà, phản biện, chọn theo domain, sửa một lát |
| `/go-live-check` | `go-live-check.md` | Cổng sẵn sàng pilot, không deploy |
| `/uat-cases` | `uat-cases.md` | Checklist UAT tay từ DoD |
| `/ship-slice` | `ship-slice.md` | Verify + review sau test tay |
| `/review` | `review.md` | Review diff |
| `/explain` | `explain.md` | Chỉ giải thích |
| `/commit` | `commit.md` | Commit khi user yêu cầu |
| `/pr-create` | `pr-create.md` | Tạo pull request |
