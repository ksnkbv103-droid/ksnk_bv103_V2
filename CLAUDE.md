# Claude Code — KSNK BV103

Cổng khi sửa repo này. Chủ đề → một file: [`docs/ssot-map.md`](docs/ssot-map.md). Đọc theo diff: [`docs/core/read-minimum.md`](docs/core/read-minimum.md). Ship: [`AGENTS.md`](AGENTS.md).

Mở thư mục repo bằng Claude Code. File này được nạp sẵn. Không đọc hết rule, skill, hay agent lúc mở repo.

Skill (`.claude/skills`) và subagent (`.claude/agents`) chỉ có mô tả ngắn trong context. Khi việc khớp, đọc đúng một file thân: `.cursor/rules/` hoặc `.agents/skills/` hoặc `.cursor/agents/`. Luật 00, 01, 05 đã nằm ở dưới — không đọc lại.

Lệnh (`/intake`, `/implement`, …): thân một bản ở `.cursor/commands/`.

## Luật cứng

- Một lát. Diff tối thiểu. Không refactor file bên cạnh.
- Không đoán schema. Đọc migration hoặc đối chiếu DB trước khi đặt tên bảng, cột, RPC.
- CSSD vs MDM, xóa cứng vs xóa mềm: SSOT im và còn hai cách đọc lâm sàng → dừng, hỏi PO.
- Không nhận «chính xác tuyệt đối». Chỉ làm điều SSOT hoặc yêu cầu PO đã viết.
- Lệch KPI thì sửa hàm KPI, không vá chữ trên giao diện chỗ khác.
- Không `db push` / migrate prod. Local: `npm run mdm:migrate:local`. Prod chỉ khi PO ra lệnh trong task này.
- Commit, push, PR, deploy Vercel chỉ khi PO yêu cầu.

## Không mở khi sửa code

- `docs/data/` (máy đọc; trừ khi đang chạy script seed)
- `docs/archive/` và `_agent-*.md` (mốc lịch sử; SSOT thắng nếu lệch)
- `docs/archive/nkbv-sources/`, `nkbv-sources/extracted/` — CDC/NHSN thô. NKBV đang dùng: `docs/modules/nkbv/hai-surveillance-domain-ssot-20260827.md`
- `node_modules/`, `.next/`, `scratch/`, `.tmp-excel-lib/`

## Verify

| Việc vừa làm | Lệnh |
|--------------|------|
| Action / `fact_*` | `npm run verify:engineering` |
| Schema local | `npm run mdm:migrate:local` rồi `npm run verify:mdm` |
| Sửa docs | `npm run docs:links:check` |
| Trước push | `npm run verify` |
| UI thuần | `npm run verify:quick` |

App: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Supabase. Route mỏng trong `src/app/`. Nghiệp vụ trong `src/modules/`. Logic thuần trong `src/lib/domain/` — không import supabase/next/react.

Xong một lát: nói câu SSOT đã bám, lát nào, cái gì không đụng.
