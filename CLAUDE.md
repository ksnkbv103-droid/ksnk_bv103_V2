# Claude Code — KSNK BV103

Một cửa. File này nạp sẵn. Không đọc hết rule, skill, hay agent lúc mở repo.

## Đọc (đúng thứ tự)

1. [`docs/ssot-map.md`](docs/ssot-map.md) — một chủ đề, một file
2. [`.cursor/commands/domain-slice.md`](.cursor/commands/domain-slice.md) + rule [`.cursor/rules/05-domain-auto-slice.mdc`](.cursor/rules/05-domain-auto-slice.mdc)
3. [`docs/core/handover-roadmap.md`](docs/core/handover-roadmap.md) §5 — việc còn mở
4. File module của lát (dòng ssot-map). Đọc thêm theo diff: [`docs/core/read-minimum.md`](docs/core/read-minimum.md)

Hai cách đọc lâm sàng mà SSOT im → dừng, hỏi PO. Vòng này thắng chat.

## Khóa PO (2026-10-09)

Chi tiết ở `/domain-slice` và domain §2.1. Không chép SSOT vào đây. Không bịa lại:

- VST: rửa/chà ≤2 thời điểm WHO phân biệt; bỏ sót = 1; năm mốc một hàng; quá trần thì bỏ mốc cũ nhất, không toast; ô đang chọn nền `#026f17` (`--primary`) chữ trắng
- KPI `fn_vst_is_valid_opportunity` cùng trần với form
- Xóa phiên VST: mềm `is_active=false` cho đến khi PO nói khác

## Không

- Một lát. Diff tối thiểu. Không đoán schema — đọc migration hoặc DB trước khi đặt tên bảng, cột, RPC
- Không migrate prod. Local: `npm run mdm:migrate:local`. Commit, push, PR chỉ khi PO ra lệnh trong task này. Deploy Vercel chỉ khi anh nói «deploy»
- Không viết bản tài liệu thứ hai; không chép thân rule/skill vào docs. `docs/core` giữ 17 file
- Không viết lại engine lâm sàng. Lệch KPI thì sửa hàm KPI. Không nhận «chính xác tuyệt đối»

## Đã xong / còn PO

Đã trên `main`: form VST #94–#97, KPI #98, vòng domain #101, cửa docs #99/#103. Prod Vercel từng chạy commit cũ — không tự deploy.

Còn PO: UAT tay form VST (≤2 / =1, chữ ô chọn). Xác nhận giữ xóa mềm phiên. Deploy chỉ khi anh nói «deploy».

## Việc khác

Skill (`.claude/skills`) và subagent (`.claude/agents`) chỉ là mô tả ngắn. Khi khớp, đọc đúng một thân: `.cursor/rules/`, `.agents/skills/`, hoặc `.cursor/agents/`. Luật 00, 01, 05 đã tóm ở trên — không đọc lại cả file. Lệnh: thân một bản ở `.cursor/commands/`.

Không mở: `docs/data/`, `docs/archive/`, `_agent-*.md`, transcript, CDC/NHSN thô, `node_modules/`, `.next/`.

| Việc vừa làm | Lệnh |
|--------------|------|
| Action / `fact_*` | `npm run verify:engineering` |
| Schema local | `npm run mdm:migrate:local` rồi `npm run verify:mdm` |
| Sửa docs | `npm run docs:links:check` |
| Trước push | `npm run verify` |
| UI thuần | `npm run verify:quick` |

Xong một lát: câu SSOT đã bám, lát nào, cái gì không đụng.
