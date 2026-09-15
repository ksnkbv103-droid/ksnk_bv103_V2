# Cursor optimize 2026-09-09 (go-live oriented)

## Findings
- Always-on trước đây: 00+01+04 (~4.7KB). **04 đã tắt alwaysApply** (P0 trước đó).
- `62-destructive-change-gate` glob `src/**/*` khiến gần như mọi edit src nạp gate ~1.7KB → **thu hẹp chỉ migrations**.
- `agent-efficiency` trùng 01 → giữ @mention, note đã gộp.
- Catalog skills ghi sai «04 always on» → sửa.
- Thiếu lệnh chính thức cho prompt Grok → thêm `/grok-handoff`.
- Skills lớn (`react-dev`, `supabase`, `smart-db`) đúng kiểu manual @ — không always-on (tốt).
- Hook `beforeSubmitPrompt` read-minimum: giữ (fail-open).
- MCP Supabase: giữ cho schema thật; cấm đoán.

## Changes this pass
- rules: 00, 62, agent-efficiency note
- commands: grok-handoff, implement note, ship-slice report
- AGENTS.md Grok↔Cursor table
- skills-catalog + review-bv103 checklist

## Not changed (cố ý)
- Không xóa pilot skills / agents (vẫn hữu ích theo module)
- Không tắt plugin Vercel/Slack trong settings (tuỳ PO; Vercel deploy vẫn tắt ở vercel.json)
- Không commit — PO quyết
