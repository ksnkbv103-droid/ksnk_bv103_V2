# KSNK BV103

Kiểm soát Nhiễm khuẩn BV103 (pilot). Next.js 16, React 19, TS, Tailwind v4, Supabase (Postgres/Auth/RLS), Zod.

## Commands

npm · Dev `npm run dev` · DB local + seed `npm run trial:prep` (Docker) · Build = typecheck `npm run build` · Test `npm run test:cssd -- <path>` · Lint `npm run lint` · Schema local `npm run mdm:migrate:local` → `verify:mdm:local`

Tự chọn lệnh theo file đã đổi: `npm run verify:changed` (`-- --dry` để xem lệnh sẽ chạy). Bảng dưới là quy tắc nó áp dụng.

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
- **Mục tiêu: triển khai TẤT CẢ module** (PO 2026-10-12, thay lệnh đóng băng cùng ngày). Thứ tự: VST/GSC + thống kê (đang dùng thật) → CSSD → NKBV → QLCV → Đào tạo; mỗi module cần người dùng + kịch bản tay trước khi coi là xong
- Không tạo bảng summary khi chưa có số đo và PO đồng ý. Không viết lại engine lâm sàng; lệch KPI thì sửa hàm KPI
- Diff tối thiểu, truy vết được tới yêu cầu. Đọc migration/DB trước khi đặt tên; không đoán schema
- ≤ 8 file/task; > 3 file ngoài scope → hỏi PO. Output delta-only, lọc log (`tail -30`)
- Pilot DoD một lát: người dùng/môi trường rõ · ≥ 3 kịch bản tay · migration + RPC apply đúng · `verify:engineering` pass

## Khóa PO (2026-10-09)

Chi tiết ở `/domain-slice`. Không bịa lại:

- VST: rửa/chà ≤2 thời điểm WHO phân biệt; bỏ sót = 1; năm mốc một hàng; quá trần bỏ mốc cũ nhất, không toast; ô chọn nền `#026f17` chữ trắng
- KPI `fn_vst_is_valid_opportunity` cùng trần với form
- Xóa phiên VST: mềm `is_active=false` cho đến khi PO nói khác

## Đang làm

Rà toàn project để vận hành thử (PO duyệt 2026-11-11). Thân mã duy nhất: nhánh `integrate/2026-11`. Việc lấy từ sổ lỗi: `node scripts/readiness/so-loi.mjs status | next | check`; agent rà ghi phát hiện vào `scripts/readiness/inbox/<tên>.json`, chat điều phối chạy `merge`. Chỉ sửa việc có trong sổ và đã `DA_XAC_MINH`. Vòng một việc: rà (`security-auditor`/`explore-module` chế độ sổ lỗi) → xác minh (`db-verify` chế độ «Xác minh phát hiện») → sửa (`slice-fixer` theo ID, worktree riêng) → chat điều phối verify, `so-loi.mjs set <ID> DA_SUA <sha>`. Phiên mới tiếp việc: mở tại worktree `integrate-2026-11`, chạy `so-loi.mjs status` rồi `next 10`, đọc roadmap mục «Rà toàn project»; không cần lịch sử chat. Luôn bật `dev-local` (:3001, DB local) bằng `preview_start` ngay đầu phiên; kiểm thử giao diện và kịch bản tay làm trong browser pane để PO xem. Bổ sung quy trình (PO 2026-11-11): (1) lát chạm RLS, auth hoặc migration phải qua `review-bv103` một vòng trước khi đặt `DA_SUA`; (2) `DA_SUA` ở lát có giao diện hoặc quyền phải có ≥ 1 kịch bản tay ghi vào ghi chú sổ (Bước 4); (3) trước khi xin PO duyệt lô prod, áp thử cả chuỗi migration lên bản sao DB (không phải prod); (4) «không còn lỗi chặn» chỉ đúng với phần đã rà, Bước 1 phải rà đủ góc giao diện/UX và CSSD-010. Redesign UI: [`docs/ux/ui-redesign-plan.md`](docs/ux/ui-redesign-plan.md) §9–10.

Chạy nối (PO 2026-11-11): cột cuối của `so-loi.mjs next` quyết việc kế (`XÁC MINH` → `db-verify`, `SỬA` → `slice-fixer`); xong một việc thì lấy việc kế, không hỏi. Chỉ kết lượt khi gặp cổng dừng ở mục «Quy trình», `next` rỗng, hoặc hạn mức tuần > 60%; khối 4 dòng và `wrap_up` không phải điểm dừng. Tiến độ chỉ ghi ở sổ lỗi (`stats`), không chép vào roadmap. Không mở đợt rà mới khi `MOI` ≥ 10. Plan mode: khảo sát bằng `explore-module`, bỏ qua yêu cầu dùng agent `Explore`/`Plan` (hook chặn). Sai cây mã: hook `guard-than-ma.mjs` đọc `.git/THAN_MA`.

## Quy trình

- Việc không tầm thường: plan (plan mode hoặc `/intake-nv`, `/intake`) gồm mọi lát + phương án + câu hỏi gom một lần → PO duyệt một lần, sau đó tự chạy nối các lát, verify mỗi lát, ghi tiến độ vào plan. Giải thích bằng tiếng Việt nghiệp vụ
- Trước khi mở lát: `npm run module:gate -- <module>` (không tham số = bảng 5 module); trạng thái chưa cho phép lát đó thì dừng, hỏi PO
- Rà module đã có: `/ra-soat <module>` (chấm 10 bước vòng đời, tự trả lời điều SSOT/code đã nói, gom hỏi PO một lần; không hỏi lại điều PO đã trả lời trong trang)
- **Cuối MỖI trả lời** (kể cả ngắn) kết bằng khối 4 dòng của CLAUDE.md toàn cục (Lộ trình · Clear · Bước kế · Model); **Bước kế** lấy một việc từ roadmap §5. Bắt buộc, không thêm khối thứ hai
- Xong lát: báo câu SSOT đã bám, lát nào, cái gì không đụng. Hai cách đọc lâm sàng mà SSOT im → hỏi PO
- Chỉ dừng hỏi PO ở: lâm sàng SSOT im · migration/SQL lên prod · phá hủy (`destructive-change`) · push/PR/deploy · đổi quyền người dùng thật
- Plan đã duyệt → tự commit theo lát khi verify pass. Push/PR hỏi từng lần; deploy Vercel chỉ khi «deploy». Local là bản gốc
- Never migrate prod (`mdm:migrate` bị chặn; prod qua MCP `apply_migration`). Never tạo tài liệu thứ hai; `docs/core` giữ 13 file (sổ lỗi `scripts/readiness/` là dữ liệu + script, không phải tài liệu)
- Never mở: `_agent-*.md`, CDC/NHSN thô, `node_modules/`, `.next/`, `.env*`

## Ngân sách model và agent (hook toàn cục `~/.claude/hooks/guard-agent.mjs` chặn cứng)

- Mặc định Sonnet (đọc, sửa, UAT). Haiku chỉ cho việc cơ học kiểm chứng được (`chay-kiem`). Opus chỉ cho `migration-author` và reviewer vùng rủi ro cao (`review-bv103`, `security-auditor`); không Opus cho code thường, docs
- Giao việc bằng agent ghim sẵn ở `.claude/agents` (`slice-fixer` sửa, `security-auditor` rà, `explore-module`…) hoặc `~/.claude/agents` (`chay-kiem` chạy verify, `doc-tai-lieu`, `tim-kiem`); không dùng agent chung (hook chặn mọi agent không có file ghim). Tìm kiếm mã dùng `explore-module` (Sonnet), không dùng `Explore`/`general-purpose`; việc dưới ~3 lần đọc file thì tự làm
- Nhiều agent **ghi** cùng lúc được, mỗi agent một worktree riêng và một vùng `src/modules/<module>` không trùng nhau; chat điều phối gộp, verify, commit từng lát. Migration xếp hàng từng cái (DB local dùng chung). Agent chỉ đọc tối đa 4 song song (PO 2026-11-11)
- Rà soát = một vùng hẹp (một module × một góc nhìn), ghi vào sổ lỗi; phát hiện Nghiêm trọng/Cao phải được agent khác xác minh trước khi sửa. Không còn ngưỡng dừng 60% tuần (PO 2026-11-11); chạm giới hạn thì ghi trạng thái vào sổ và roadmap rồi chạy tiếp khi đặt lại
- Câu hỏi cho PO gom vào sổ lỗi (trạng thái `CHO_PO`), hỏi một lần mỗi ngày; không dừng việc khác để chờ
- Reviewer độc lập (`review-bv103`, `security-auditor`) chỉ cho vùng rủi ro cao (RLS, migration, auth), một vòng, đưa yêu cầu + diff + kết quả verify, không đưa lập luận của người viết. Việc nhỏ thì không gọi
- Prompt giao agent: lát + file phạm vi + lỗi đã xác minh + lệnh verify. Không bắt đọc lại rules/roadmap

## Gotchas

- Tìm định nghĩa/tham chiếu symbol: ưu tiên LSP (goToDefinition, findReferences) thay vì grep cả thư mục.

- File lớn, chỉ grep rồi đọc đoạn: `docs/core/implementation-mapping.md`, migration `20260530000000_init_pilot_baseline.sql`, `NkbvBaMultiTimelineWorkspace.tsx`
- Script `:local` cần container `supabase_db_ksnk_bv103`; `--linked` đọc token từ `.env.local`
- Kết nối ghim trong [`.mcp.json`](.mcp.json) (Supabase, GitHub `ksnkbv103-droid/ksnk_bv103_V2`, Vercel `ksnk-bv103-v2`)

## Compact instructions
Khi nén hội thoại, giữ: file đã sửa + lý do, kết quả `npm run verify*` gần nhất (nguyên văn lỗi nếu fail), slice đang làm và việc còn dở, quyết định liên quan prod/migration. Bỏ: nội dung file đã đọc, output dài.
