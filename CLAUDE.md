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
  2. Lệnh `/domain-slice` (mục «Đã chốt» + luật vòng)
  3. [`docs/core/handover-roadmap.md`](docs/core/handover-roadmap.md) §5 — việc còn mở
  4. File module của lát (dòng ssot-map). Đọc thêm theo diff: [`docs/core/read-minimum.md`](docs/core/read-minimum.md)
- Cấu hình agent chỉ nằm trong `.claude/`: `rules/` (luật theo đường dẫn, tự nạp khi chạm file — src, data-access, migrations, cssd, nkbv, giam-sat, qlcv, dashboard, mdm, dao-tao) · `commands/` (11 lệnh) · `skills/` (4: supabase, smart-db-bv103, react-dev, destructive-change) · `agents/` (6 subagent read-only, đã ghim model). Danh mục + cách chọn model: [`docs/core/skills-catalog.md`](docs/core/skills-catalog.md)
- Model: `/model opusplan` cho việc nhiều lát (Opus lập plan, Sonnet thực thi — không cần đổi tay) · Sonnet cho việc nhỏ · Haiku cho subagent đọc nhiều

## Kỷ luật (luôn áp dụng)

- Nghiệp vụ y tế / ranh giới CSSD vs MDM mơ hồ → hỏi trước. Có tradeoff (migration vs patch app, RPC vs query) → nói trước khi code.
- Không tạo bảng summary/pre-aggregation khi chưa có số đo và PO đồng ý.
- Mỗi dòng diff truy vết được tới yêu cầu. Boy Scout chỉ trong file vừa chạm.
- Grep trước khi đọc file > 500 dòng; mục tiêu ≤ 8 file đọc/task; > 3 file ngoài scope → dừng, hỏi PO. Output delta-only.
- Pilot DoD một lát: người dùng/môi trường rõ · ≥ 3 kịch bản tay · migration + RPC apply đúng · `verify:engineering` pass.
- Lọc output lệnh dài (`tail -30`, `git log -n 5 --oneline`). Tiến độ ghi vào file plan để `/clear` không mất việc.

## Khóa PO (2026-10-09)

Chi tiết ở `/domain-slice` và domain §2.1. Không chép SSOT vào đây. Không bịa lại:

- VST: rửa/chà ≤2 thời điểm WHO phân biệt; bỏ sót = 1; năm mốc một hàng; quá trần thì bỏ mốc cũ nhất, không toast; ô đang chọn nền `#026f17` (`--primary`) chữ trắng
- KPI `fn_vst_is_valid_opportunity` cùng trần với form
- Xóa phiên VST: mềm `is_active=false` cho đến khi PO nói khác

## Always

- Việc không tầm thường: soạn plan (plan mode, hoặc `/intake-nv` / `/intake`) gồm mọi lát + phương án + câu hỏi gom một lần → PO duyệt **một lần**. Sau đó **tự chạy nối các lát** trong cùng phiên: tự phân tích, phản biện, chọn phương án ít rủi ro (ghi lý do vào plan), verify sau mỗi lát, ghi tiến độ vào plan. Giải thích bằng tiếng Việt nghiệp vụ; báo pass/fail
- Một lát. Diff tối thiểu. Đọc migration hoặc DB trước khi đặt tên bảng, cột, RPC
- Chạy lệnh verify theo bảng Commands sau khi sửa; không commit khi verify fail
- Hai cách đọc lâm sàng mà SSOT im → dừng, hỏi PO. Vòng này thắng chat
- Xong một lát: báo câu SSOT đã bám, lát nào, cái gì không đụng
- Chỉ dừng hỏi PO ở cổng rủi ro: nghiệp vụ lâm sàng SSOT im · migration/apply DB prod · thao tác phá hủy (`destructive-change`) · push/PR/deploy · đổi quyền truy cập người dùng thật. Lựa chọn kỹ thuật thường → tự chọn, ghi lý do. Hết plan: báo tổng kết + gợi ý việc kế tiếp từ `docs/core/handover-roadmap.md` §5

## Do Not

- Never đoán schema
- Never migrate prod. Plan đã duyệt → **tự commit** (theo lát, verify pass, không gom file ngoài phạm vi). Push, PR chỉ khi PO đồng ý từng lần (luôn hỏi sau khi commit xong). Deploy Vercel chỉ khi anh nói «deploy». Local là bản gốc duy nhất; báo lệch local/GitHub trước khi hỏi push
- Never viết bản tài liệu thứ hai; không chép thân skill vào docs. `docs/core` giữ 13 file
- Never viết lại engine lâm sàng. Lệch KPI thì sửa hàm KPI. Không nhận «chính xác tuyệt đối»
- Never mở: `docs/data/`, `_agent-*.md`, transcript, CDC/NHSN thô, `nkbv-sources/extracted/`, `node_modules/`, `.next/`, `.env*` (chặn cứng bằng `permissions.deny` trong [`.claude/settings.json`](.claude/settings.json)). Lịch sử cũ (archive, Cursor) chỉ còn trong git history — không khôi phục

## Gotchas

- File lớn — chỉ `grep -n` rồi đọc đoạn, không đọc cả file: `docs/core/implementation-mapping.md` (78 KB), `supabase/migrations/20260530000000_init_pilot_baseline.sql` (428 KB), `src/modules/giam-sat-nkbv/components/NkbvBaMultiTimelineWorkspace.tsx` (72 KB)
- Model mặc định Sonnet (`.claude/settings.json`); subagent đọc nhiều đã ghim Haiku/Sonnet trong frontmatter. `/model opusplan` cho việc nhiều lát; `/clear` khi đổi hẳn sang việc khác
- `npm run mdm:migrate` cố ý bị chặn (prod ghi version migration khác tên file). Prod đi qua Lead/MCP `apply_migration`
- Script `:local` và `mdm:postcheck:*:local` cần Docker container `supabase_db_ksnk_bv103` đang chạy
- Script `--linked` / `mdm:*` đọc `SUPABASE_ACCESS_TOKEN` từ `.env.local`
- Kết nối đã ghim trong [`.mcp.json`](.mcp.json) — không gõ lại ref; OAuth mỗi dịch vụ một lần bằng `/mcp`. Git remote `origin` dùng credential sẵn trên máy
  - Supabase `cvzwslpxwgqiugzzhqej` · GitHub `ksnkbv103-droid/ksnk_bv103_V2` · Vercel `dr-nghia-103-s-projects/ksnk-bv103-v2` — https://ksnk-bv103-v2.vercel.app
