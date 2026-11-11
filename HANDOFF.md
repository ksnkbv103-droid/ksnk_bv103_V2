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
- `SỬA`: giao `slice-fixer` theo ID, chạy thẳng tại thân mã, mỗi agent một module riêng, cấm lệnh git đổi trạng thái (không dùng `isolation: "worktree"`: nó cắt từ commit cũ `7f7bfd19`, không phải HEAD integrate, agent bị chặn ngay bước 0). Sửa một file vài dòng thì điều phối tự làm. Điều phối chạy `npm run verify:changed`, commit, `set <ID> DA_SUA <sha>`.

Chỉ kết lượt khi: gặp cổng dừng PO (lâm sàng SSOT im · migration/SQL lên prod · phá hủy · push/PR/deploy · đổi quyền người dùng thật) · `next` rỗng. Không có ngưỡng dừng theo hạn mức tuần (CLAUDE.md mục «Ngân sách»).

## Còn dở (2026-11-12)
- Sổ: `MOI` còn 3 (CSSD-010, NKBV-001, QT-002, chưa rà). Số hiện tại xem `stats`.
- Hàng đợi `migration-author` trên DB local, từng cái một (xong phải qua `review-bv103` rồi mới commit): DT-006 (PO 2b: admin mở lại lượt bằng tay; schema chưa có cách bỏ tính lượt vì `dao_tao_lan_thi.trang_thai` chỉ nhận `dang_lam`/`da_nop`/`het_gio`, cần thêm trạng thái hủy rồi mới viết action), QLCV-005 (PO 5c: xóa RPC `rpc_qlcv_nhiem_vu_rollup`), CSSD-006, QLCV-007, DT-005, DT-009, DT-010, QLCV-001. Chờ lô prod: VST-003, NEN-003, NKBV-011 (`3b6a9daf`; trước khi áp prod phải kiểm mọi ADMIN đã gắn `mdm_nhan_su`, nếu không họ mất quyền thẩm định), NKBV-008 (`6895e197`; sau khi áp kiểm `proacl` chỉ service_role). `verify:mdm` (bản linked) fail ở worktree này vì chưa `supabase link` («Cannot find project ref»), dùng `verify:mdm:local`. Kịch bản tay: CSSD-002, VST-011 (vai MANG_LUOI). Cột cuối của `next` vẫn ghi «SỬA (slice-fixer)» cho các dòng này, đừng tin.
- Chưa chạy kịch bản tay trên giao diện: NKBV-007, DT-014, VST-008, CSSD-007, NKBV-009, QT-006, VST-001, CSSD-008/009, NKBV-010, QT-001/007, DT-013, và lô 2026-11-12: NKBV-008 (lưu nháp phân tích BA), NKBV-006, QT-005, QT-009, DT-007, DT-008, NKBV-005, NKBV-012, chặn tạo BA thiếu khoa.
- QT-004: đã xác nhận trên GoTrue local rằng phiên từ link khôi phục có `amr = [{method:"otp", timestamp}]`; mã chỉ nhận trong 15 phút. Chưa thử trọn luồng trên giao diện vì link local chuyển về `http://127.0.0.1:3000` (site URL), không về `/login/reset-password` của :3001. Cần kiểm trên prod: danh sách Redirect URLs của Supabase Auth có `<site>/login/reset-password` không. Review còn nêu (có từ trước): POST từ `/login/reset-password` khi đã có cookie phiên có thể bị `proxy.ts` chuyển về `/`.
- Lát riêng chưa mở: `cssd-workflow-ops.actions.ts:72` và `cssd-scan.actions.ts:89` (cùng mẫu CSSD-009); mẫu `isNkbvBenhAnInScope` chặn ca có mã BA nhưng chưa có BA/lưới ngày; chi phí `getClaims` + truy vấn quyền cho mỗi prefetch sau QT-001 (cần đo). Thêm: `updateNkbvBenhAnStay` chưa kiểm khoa mới có nằm trong phạm vi khi chuyển khoa; Minor của review NKBV-008 (`draft`/`index_payload` null lưu thành jsonb null) và NKBV-011 (SQL kiểm prod nên lọc vai ADMIN).
- Phiên thử trên browser pane (:3001) đã đăng xuất trong lúc thử QT-004; đăng nhập lại bằng tài khoản fixture khi chạy kịch bản tay.
- Kế hoạch thống nhất agents/rules/skills (lệnh `/dieu-phoi`, `so-loi.mjs brief`, định tuyến `next`, gỡ trùng lặp review): đã trình, chờ PO duyệt, chưa sửa file cấu hình nào.
- PO đã trả lời 13 câu ngày 2026-11-12 (ghi trong `ghi_chu` của sổ). Còn chờ PO: câu 7 (giám sát viên có chỉ nhìn thấy phiên GSC của chính mình trong danh sách không; sửa/xóa chỉ chủ phiên thì đã có); DT-008 vẫn trả đúng/sai từng câu, với câu Đúng/Sai thì suy ra được đáp án, có ẩn luôn không; dọn 4 worktree `.claude/worktrees/agent-*`; push `integrate/2026-11` (chưa có trên GitHub); xóa 23 nhánh local đã gộp; 6 nhánh chưa gộp; lô migration lên prod.
- Roadmap còn dài hơn mục tiêu 25 KB.

## Lệnh kiểm chứng
`node scripts/readiness/so-loi.mjs check` · `npm run verify:changed` · `npm run docs:links:check`

## Giả định chưa kiểm
- Hook SessionStart mới chỉ thử bằng chạy tay, chưa thấy nó chèn cảnh báo trong một phiên thật mở ở checkout chính.
