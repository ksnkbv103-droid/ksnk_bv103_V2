# HANDOFF_APPKSNK — Rà 5 module để vận hành thử (cập nhật 2026-11-18)

File này chỉ trỏ đường. Tiến độ từng lỗi nằm ở `ghi_chu`/`test_tay` của sổ. Bản đầy đủ trước khi rút gọn: `git show ae5ca6fd:HANDOFF.md`. `so-loi.mjs check` FAIL khi file này > 6000 byte.

## ĐANG LÀM
- CSSD-034 (DA_SUA): lát A `61148266` (migration `20261118120000` chỉ local, áp prod = CHO_PO; review Go) + lát B `c44f87db` (drawer «Lập phiếu ngược», 3 kịch bản tay :3001 DAT). Còn mở: dòng MOI «sau khi đảo» (xuất lại/NXT, cần PO).
- Chạy nối 18/11 DA_SUA: VST-020 `6018d180`, NKBV-031 `c7b637ce`, VST-030 `2c788ae2`, NKBV-030 `953cb5c9`, VST-029 `554ff441`, NKBV-036 `103a81a7`, NKBV-038 `1efc3867` (tay DAT; review Go). NKBV-038: migration `20261118130000` chỉ local; áp prod = CHO_PO, phải đo prod (read-only) số người có `GIAM_SAT_NKBV:view` ngoài ADMIN/NV KSNK/HĐ/CNK trước. Còn 3 đường admin client (SO_NO). CHO_PO: VST-027, NKBV-041, VST-024. Kế: db-verify 6 MOI (NKBV-037/033, CSSD-035/037, VST-022/033) ở phiên mới, rồi sửa DA_XAC_MINH theo mức nặng.
- CSSD-032 `3165749c`: ĐÃ ÁP PROD 18/11 (PO duyệt; ledger `20261117235006` cssd_hc_chan_trung_su_co; 0 sự cố trùng trước; md5 thân hàm sau áp khớp file).
- LÁT 2 để nguyên: `KSNK_PILOT_FOUR_MODULES` xong, công tắc TẮT, không đặt biến Vercel (PO không muốn ẩn module).
- Lát 1 Lên prod: PR #131 `e908e7e0`, deploy success, B1–B5 đã áp (17/11). Còn TC09: mục 4.

## KẾ
- Lát 3: roadmap ≤ 25 KB + cắt script (PO duyệt danh sách). Lát 4: squash migration (sau B5 + TC09).
- Nhánh 18/11 (21 commit đã push; phần gộp chưa push: `git status -sb`): integrate đã gộp nkbv, chore, audit, monitoring. Monitoring theo khóa PO 11-01 (đỏ <85, vàng 85–<90, xanh ≥90, mẫu 50, kế hoạch giám sát khoa/tháng) qua `ksnk_dm_tham_so`: migration `20261118100000` (6 dòng từ 2026-11-01) + `20261118110000` (kế hoạch, đổi số từ `20261101010000`). Áp local; áp prod = CHO_PO. Tay UI kế hoạch đạt gồm KB8 không-admin (VST-032); VST-034 LOI_GIA.
- Hook `guard-migration` (853fe8bc): migration prod kế tiếp PO duyệt trước bằng `duyet_migration.py`; chưa thử với dialog thật.

## Mở phiên mới
1. Làm ở worktree `integrate-2026-11` (nhánh `integrate/2026-11`; `git status -sb` xem số commit chưa push).
2. `node scripts/readiness/so-loi.mjs status` → `next 10` → `next --tay` → `stats`.
3. Bật `dev-local` (:3001, DB local) bằng `preview_start`.
4. Fixture thử tay: NV_TEST01 gốc chỉ có vai NHAN_VIEN_KSNK, khoa C18. Đã đổi tạm thì phải trả về gốc cuối phiên. Mật khẩu NV_TEST01 đang là giá trị thử; `npm run trial:prep` đặt lại.

## Vòng một việc
- `XÁC MINH` → `db-verify`. `SỬA` → `slice-fixer` (hoặc tự làm nếu vài dòng); dòng `lop=DB` → `migration-author`; `VAN_HANH` → chờ PO.
- Sửa lỗi: test tái hiện fail trước → `npm run verify:changed` → commit → `set <ID> DA_SUA <sha>`. Chạm RLS/auth/migration: `review-bv103` một vòng.
- Kịch bản tay: làm trên :3001, đối chiếu DB local, rồi `tay <ID> DAT|KHONG_DAT|CHUA "<ghi chú>"`. Không dựng được trên UI → `CHUA` kèm lý do «chỉ spec».

## Trạng thái (2026-11-13)
- Điểm cơ học: chạy `npm run module:audit`; bước thiếu (1, 2, 5, 8, 9, 10) cần PO, sửa mã không nâng được.
- `module:gate`: giam-sat CHẠY_THỬ · cssd XÂY (đầu mối Nguyễn Thanh Bình) · nkbv KHÁM_PHÁ · qlcv XÁC_NHẬN · dao-tao KHÁM_PHÁ; 4 module chưa có đầu mối.
- Ý tưởng chờ PO: «gói quyền nhanh» (gán sẵn theo vai + chọn cả hàng/cột) trên ma trận trang × thao tác hiện có.
- Dòng `test_tay=CHUA`: phần lớn là race, giới hạn số dòng, payload sai từ client, hoặc cần tài khoản chỉ có quyền GSC/Mạng lưới (chưa có fixture).

## CẦN NGƯỜI (Lát E) — im = không push, không áp prod
1. Tên đầu mối VST/GSC, NKBV, QLCV, Đào tạo; đợt thử đầu gồm module nào; trạng thái NKBV (đang KHÁM_PHÁ nhưng nhiều commit `feat`).
2. PO chốt 11-13 (đã sửa, sha trong sổ): CSSD-017 ủ BI ≥20', NKBV-023 ẩn ca chốt = ADMIN + lý do, NKBV-026 LOA máy chủ; CSSD-025 HOAN. Còn treo: câu 7 GSC, DT-008. Mặc định Claude 2026-11-13 chờ PO bác (đảo = revert sha trong sổ): QLCV-010, QT-012, NKBV-018, VST-013a, CSSD-017 giờ đọc tương lai (dung sai 2 phút).
3. Authorize MCP Supabase (`/mcp`) để gỡ NEN-003, CSSD-004 và đối chiếu prod.
4. Lô prod pha 1 (`.claude/plans/KH_APPKSNK_20261117_lo-prod-pha1.md`): nhóm A đã áp prod 17/11 (37/37 khớp). Cửa sổ rủi ro §3.4 đã đóng; B1–B5 đã áp (17/11). Còn: TC09 do PO; mở dashboard VST/GSC prod xem số sau B2.
5. Duyệt `.claude/plans/KH_APPKSNK_20261116_lam-gon-ma.md` (làm gọn mã mọi module, 13 câu hỏi; im = không xóa gì).

## Lát chưa mở / nợ
- Thử tay 2026-11-13 ĐẠT 36/43; 7 mục không lối UI giữ CHUA, có spec pass. Mẹo fixture: vai tạm có quyền cần thử, xóa sau phiên. Chưa sửa: nút «Phê duyệt và giao» hiện cho người đề xuất; banner NKBV có link `/giam-sat-nkbv?case=` cho người chỉ có quyền CSSD.
- Review 2026-11-13: Đào tạo 6 action ghi qua `requireDaoTaoAdmin` (DT-016, d1ab156f). Nợ «break-glass ở RPC QLCV» đóng, không sửa: PO 11-11 (QLCV-003) chốt chỉ ADMIN/CNK thật, app đã khớp (`getActorRbacRoleNamesStrict`).
- Trước deploy: kiểm prod NHAN_VIEN_KSNK có GIAM_SAT_NKBV import (chỉ seed, không migration).

## Lệnh kiểm chứng
`node scripts/readiness/so-loi.mjs check` · `npm run verify:changed` · `npm run docs:links:check` · `npm run module:gate`
