# KSNK BV103

Kiểm soát Nhiễm khuẩn BV103 (pilot). Next.js 16, React 19, TS, Tailwind v4, Supabase (Postgres/Auth/RLS), Zod.

## Commands

npm · Dev `npm run dev` · DB local + seed `npm run trial:prep` (Docker) · Build = typecheck `npm run build` · Test `npm run test:cssd -- <path>` · Lint `npm run lint` · Schema local `npm run mdm:migrate:local` → `verify:mdm:local`

| Vừa làm | Lệnh |
|---|---|
| Action / `fact_*` | `verify:engineering` |
| Schema (linked) | `verify:mdm` |
| Docs | `docs:links:check` |
| UI thuần | `verify:quick` |
| Trước push | `verify` |

## Kiến trúc

`src/app/` route mỏng · `src/modules/<module>/` DDD · `src/lib/` RBAC, domain · `supabase/migrations/` SSOT schema. Đọc theo thứ tự: [`docs/ssot-map.md`](docs/ssot-map.md) → `/domain-slice` → [`handover-roadmap.md`](docs/core/handover-roadmap.md) §5 → file module của lát ([`read-minimum.md`](docs/core/read-minimum.md)). Cấu hình agent ở `.claude/` (rules, commands, skills, agents): [`skills-catalog.md`](docs/core/skills-catalog.md).

## Kỷ luật

- Nghiệp vụ y tế / ranh giới CSSD vs MDM mơ hồ → hỏi trước. Có tradeoff → nói trước khi code
- **Đóng băng NKBV, CSSD, QLCV, Đào tạo** (PO 2026-10-12): chỉ sửa lỗi bảo mật/hỏng build. Ưu tiên VST/GSC + thống kê
- Không tạo bảng summary khi chưa có số đo và PO đồng ý. Không viết lại engine lâm sàng; lệch KPI thì sửa hàm KPI
- Diff tối thiểu, truy vết được tới yêu cầu. Đọc migration/DB trước khi đặt tên; không đoán schema
- Grep trước khi đọc file > 500 dòng; ≤ 8 file/task; > 3 file ngoài scope → hỏi PO. Output delta-only, lọc log (`tail -30`)
- Pilot DoD một lát: người dùng/môi trường rõ · ≥ 3 kịch bản tay · migration + RPC apply đúng · `verify:engineering` pass

## Khóa PO (2026-10-09)

Chi tiết ở `/domain-slice`. Không bịa lại:

- VST: rửa/chà ≤2 thời điểm WHO phân biệt; bỏ sót = 1; năm mốc một hàng; quá trần bỏ mốc cũ nhất, không toast; ô chọn nền `#026f17` chữ trắng
- KPI `fn_vst_is_valid_opportunity` cùng trần với form
- Xóa phiên VST: mềm `is_active=false` cho đến khi PO nói khác

## Quy trình

- Việc không tầm thường: plan (plan mode hoặc `/intake-nv`, `/intake`) gồm mọi lát + phương án + câu hỏi gom một lần → PO duyệt một lần, sau đó tự chạy nối các lát, verify mỗi lát, ghi tiến độ vào plan. Giải thích bằng tiếng Việt nghiệp vụ
- **Cuối MỖI trả lời** (kể cả ngắn) kết bằng khối: **Bước tiếp theo** (một việc, từ roadmap §5) · **Model** (Haiku/Sonnet/Opus) + **`/clear`: có/không** · **Lý do**. Bắt buộc, không bỏ
- Xong lát: báo câu SSOT đã bám, lát nào, cái gì không đụng. Hai cách đọc lâm sàng mà SSOT im → hỏi PO
- Chỉ dừng hỏi PO ở: lâm sàng SSOT im · migration/SQL lên prod · phá hủy (`destructive-change`) · push/PR/deploy · đổi quyền người dùng thật
- Plan đã duyệt → tự commit theo lát khi verify pass. Push/PR hỏi từng lần; deploy Vercel chỉ khi «deploy». Local là bản gốc
- Never migrate prod (`mdm:migrate` bị chặn; prod qua MCP `apply_migration`). Never tạo tài liệu thứ hai; `docs/core` giữ 13 file
- Never mở: `_agent-*.md`, CDC/NHSN thô, `node_modules/`, `.next/`, `.env*`

## Gotchas

- File lớn, chỉ grep rồi đọc đoạn: `docs/core/implementation-mapping.md`, migration `20260530000000_init_pilot_baseline.sql`, `NkbvBaMultiTimelineWorkspace.tsx`
- Script `:local` cần container `supabase_db_ksnk_bv103`; `--linked` đọc token từ `.env.local`
- Kết nối ghim trong [`.mcp.json`](.mcp.json) (Supabase, GitHub `ksnkbv103-droid/ksnk_bv103_V2`, Vercel `ksnk-bv103-v2`)
