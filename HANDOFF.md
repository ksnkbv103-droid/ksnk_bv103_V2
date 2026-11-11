# HANDOFF — Rà toàn project để vận hành thử (cập nhật 2026-11-11)

File này chỉ trỏ đường, không chép tiến độ. Bản 2026-11-06 (đợt rà chỉ đọc, số đo coupling, trục A–I) xem bằng `git log -p -- HANDOFF.md`.

## Mở phiên mới
1. Mở tại worktree `integrate-2026-11` (nhánh `integrate/2026-11`). Hook `guard-than-ma.mjs` cảnh báo nếu sai cây; con trỏ là file `.git/THAN_MA`.
2. `node scripts/readiness/so-loi.mjs status`, rồi `next 10`, rồi `stats`.
3. Bật `dev-local` (:3001, DB local) bằng `preview_start`.
4. Quy tắc luồng: `CLAUDE.md` mục «Đang làm». Bối cảnh prod/migration: roadmap mục «Rà toàn project».

## Vòng một việc
Cột cuối của `next` nói việc kế của từng dòng:
- `XÁC MINH`: giao `db-verify` (tối đa 2 agent đọc song song), kết quả ghi `scripts/readiness/inbox/<tên>.json`, điều phối chạy `merge` hoặc `set <ID> DA_XAC_MINH|LOI_GIA`.
- `SỬA`: giao `slice-fixer` theo ID (một agent ghi tại một thời điểm), điều phối chạy `npm run verify:changed`, commit, `set <ID> DA_SUA <sha>`.

Chỉ kết lượt khi: gặp cổng dừng PO (lâm sàng SSOT im · migration/SQL lên prod · phá hủy · push/PR/deploy · đổi quyền người dùng thật) · `next` rỗng · hạn mức tuần > 60%.

## Còn dở (2026-11-11)
- Nghẽn ở xác minh: 41 dòng `MOI`. Không mở đợt rà mới cho đến khi `MOI` < 10.
- Chờ PO: CSSD-001; push `integrate/2026-11` (chưa có trên GitHub); xóa 23 nhánh local đã gộp; số phận 6 nhánh chưa gộp; lô migration lên prod (danh sách ở roadmap).
- Roadmap còn dài hơn mục tiêu 25 KB: phần nhật ký cũ chưa rút hết vì lẫn câu hỏi PO còn mở.

## Lệnh kiểm chứng
`node scripts/readiness/so-loi.mjs check` · `npm run verify:changed` · `npm run docs:links:check`

## Giả định chưa kiểm
- Hook SessionStart mới chỉ thử bằng chạy tay, chưa thấy nó chèn cảnh báo trong một phiên thật mở ở checkout chính.
