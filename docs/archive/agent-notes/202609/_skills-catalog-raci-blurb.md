## RACI Grok ↔ Cursor (2026-09-10)

- Always-on rules: `00-core`, `01-agent-discipline` (token hygiene + cấm Cursor đọc CDC).
- `04-po-workflow` chỉ `/intake-nv` (không always-on).
- Lệnh chính từ Grok: `/grok-handoff`. UAT: `/uat-cases`. Go-live: `/go-live-check`. Giám sát: `@slice-supervise`.
- `.cursorignore` — giảm nhiễu `@codebase`.
