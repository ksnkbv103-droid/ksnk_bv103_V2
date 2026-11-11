# HANDOFF — Rà toàn project để vận hành thử (cập nhật 2026-11-11)

File này chỉ trỏ đường, không chép tiến độ. Bản 2026-11-06 (đợt rà chỉ đọc, số đo coupling, trục A–I) xem bằng `git log -p -- HANDOFF.md`.

## Mở phiên mới
1. Mở tại worktree `integrate-2026-11` (nhánh `integrate/2026-11`). Hook `guard-than-ma.mjs` cảnh báo nếu sai cây; con trỏ là file `.git/THAN_MA`.
2. `node scripts/readiness/so-loi.mjs status`, rồi `next 10`, rồi `stats`.
3. Bật `dev-local` (:3001, DB local) bằng `preview_start`.
4. Quy tắc luồng: `CLAUDE.md` mục «Đang làm». Bối cảnh prod/migration: roadmap mục «Rà toàn project».

## Vòng một việc
Cột cuối của `next` nói việc kế của từng dòng:
- `XÁC MINH`: giao `db-verify` (tối đa 4 agent đọc song song, mỗi agent một module), agent báo kết luận theo ID, điều phối chạy `set <ID> DA_XAC_MINH|LOI_GIA`.
- `SỬA`: giao `slice-fixer` theo ID (mỗi agent ghi một worktree và một module riêng), điều phối chạy `npm run verify:changed`, commit, `set <ID> DA_SUA <sha>`.

Chỉ kết lượt khi: gặp cổng dừng PO (lâm sàng SSOT im · migration/SQL lên prod · phá hủy · push/PR/deploy · đổi quyền người dùng thật) · `next` rỗng. Không có ngưỡng dừng theo hạn mức tuần (CLAUDE.md mục «Ngân sách»).

## Còn dở (2026-11-11)
- Nghẽn ở xác minh: 41 dòng `MOI`. Không mở đợt rà mới cho đến khi `MOI` < 10.
- Chờ PO: CSSD-001; push `integrate/2026-11` (chưa có trên GitHub); xóa 23 nhánh local đã gộp; số phận 6 nhánh chưa gộp; lô migration lên prod (danh sách ở roadmap).
- Roadmap còn dài hơn mục tiêu 25 KB: phần nhật ký cũ chưa rút hết vì lẫn câu hỏi PO còn mở.

## Lệnh kiểm chứng
`node scripts/readiness/so-loi.mjs check` · `npm run verify:changed` · `npm run docs:links:check`

## Giả định chưa kiểm
- Hook SessionStart mới chỉ thử bằng chạy tay, chưa thấy nó chèn cảnh báo trong một phiên thật mở ở checkout chính.
