# KSNK BV103

Hệ thống Kiểm soát Nhiễm khuẩn Bệnh viện 103 (pilot). Next.js 16 + React 19 + TypeScript + Tailwind v4, Supabase (Postgres/Auth/RLS), Zod. File này nạp sẵn — không đọc hết rule, skill, agent lúc mở repo.

## Commands

- Install: `npm install` (npm, có `package-lock.json`)
- Dev: `npm run dev` (Turbopack) · local DB + seed: `npm run trial:prep` (cần Docker)
- Build: `npm run build` — cũng là typecheck (không có script `tsc` riêng)
- Test: `npm run test:cssd -- <path>` (= `vitest run`) · e2e: `npm run test:e2e`
- Lint: `npm run lint` · không có lệnh format
- Schema local: `npm run mdm:migrate:local` rồi `npm run verify:mdm:local`

| Việc vừa làm | Lệnh |
|--------------|------|
| Action / `fact_*` | `npm run verify:engineering` |
| Schema (linked) | `npm run verify:mdm` |
| Sửa docs | `npm run docs:links:check` |
| UI thuần | `npm run verify:quick` |
| Trước push | `npm run verify` |

## Architecture

- `src/app/` route mỏng · `src/modules/<module>/` DDD (quan-tri-he-thong, giam-sat-*, cssd-erp, quan-ly-cong-viec, dashboard, dao-tao, …) · `src/lib/` RBAC, domain thuần · `supabase/migrations/` SSOT schema
- Đọc đúng thứ tự:
  1. [`docs/ssot-map.md`](docs/ssot-map.md) — một chủ đề, một file
  2. [`.cursor/commands/domain-slice.md`](.cursor/commands/domain-slice.md) + [`.cursor/rules/05-domain-auto-slice.mdc`](.cursor/rules/05-domain-auto-slice.mdc)
  3. [`docs/core/handover-roadmap.md`](docs/core/handover-roadmap.md) §5 — việc còn mở
  4. File module của lát (dòng ssot-map). Đọc thêm theo diff: [`docs/core/read-minimum.md`](docs/core/read-minimum.md)
- Skill (`.claude/skills`) và subagent (`.claude/agents`) chỉ là mô tả ngắn. Khi khớp, đọc đúng một thân: `.cursor/rules/`, `.agents/skills/`, hoặc `.cursor/agents/`. Lệnh: thân một bản ở `.cursor/commands/`. Luật 00, 01, 05 đã tóm ở đây — không đọc lại cả file.

## Khóa PO (2026-10-09)

Chi tiết ở `/domain-slice` và domain §2.1. Không chép SSOT vào đây. Không bịa lại:

- VST: rửa/chà ≤2 thời điểm WHO phân biệt; bỏ sót = 1; năm mốc một hàng; quá trần thì bỏ mốc cũ nhất, không toast; ô đang chọn nền `#026f17` (`--primary`) chữ trắng
- KPI `fn_vst_is_valid_opportunity` cùng trần với form
- Xóa phiên VST: mềm `is_active=false` cho đến khi PO nói khác

## Always

- Một lát. Diff tối thiểu. Đọc migration hoặc DB trước khi đặt tên bảng, cột, RPC
- Chạy lệnh verify theo bảng Commands sau khi sửa; không commit khi verify fail
- Hai cách đọc lâm sàng mà SSOT im → dừng, hỏi PO. Vòng này thắng chat
- Xong một lát: báo câu SSOT đã bám, lát nào, cái gì không đụng

## Do Not

- Never đoán schema
- Never migrate prod. Commit, push, PR chỉ khi PO ra lệnh trong task này. Deploy Vercel chỉ khi anh nói «deploy»
- Never viết bản tài liệu thứ hai; không chép thân rule/skill vào docs. `docs/core` giữ 17 file
- Never viết lại engine lâm sàng. Lệch KPI thì sửa hàm KPI. Không nhận «chính xác tuyệt đối»
- Never mở: `docs/data/`, `docs/archive/`, `_agent-*.md`, transcript, CDC/NHSN thô, `nkbv-sources/extracted/`, `node_modules/`, `.next/` (xem [`.claudeignore`](.claudeignore))

## Gotchas

- `npm run mdm:migrate` cố ý bị chặn (prod ghi version migration khác tên file). Prod đi qua Lead/MCP `apply_migration`
- Script `:local` và `mdm:postcheck:*:local` cần Docker container `supabase_db_ksnk_bv103` đang chạy
- Script `--linked` / `mdm:*` đọc `SUPABASE_ACCESS_TOKEN` từ `.env.local`
- Kết nối đã ghim trong [`.mcp.json`](.mcp.json) — không gõ lại ref; OAuth mỗi dịch vụ một lần bằng `/mcp`. Git remote `origin` dùng credential sẵn trên máy
  - Supabase `cvzwslpxwgqiugzzhqej` · GitHub `ksnkbv103-droid/ksnk_bv103_V2` · Vercel `dr-nghia-103-s-projects/ksnk-bv103-v2` — https://ksnk-bv103-v2.vercel.app
