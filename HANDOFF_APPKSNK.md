# HANDOFF_APPKSNK — Rà 5 module để vận hành thử (cập nhật 2026-11-17)

File này chỉ trỏ đường. Tiến độ từng lỗi nằm ở `ghi_chu`/`test_tay` của sổ. Bản đầy đủ trước khi rút gọn: `git show ae5ca6fd:HANDOFF.md`. `so-loi.mjs check` FAIL khi file này > 6000 byte.

## ĐANG LÀM
- Không có (CSSD-036 đóng: DA_SUA 67beb5bb, tay ĐẠT).

## KẾ
- Sửa layout-drift `PheDuyetVstPanel.tsx`, `ThamSoPanel.tsx` để `npm run verify` xanh trước PR vào main (SO_NO 2026-11-17).
- Smoke VST + GSC `e2e/gsc-vst-supervision.spec.ts` ở :3001 (cần PO cho tải Playwright chromium).
- CSSD-032 (`migration-author`) → PR vào `main` → dọn 15 nhánh, 5 worktree.

## Mở phiên mới
1. Làm ở worktree `integrate-2026-11` (nhánh `integrate/2026-11`; `git status -sb` xem số commit chưa push).
2. `node scripts/readiness/so-loi.mjs status` → `next 10` → `next --tay` → `stats`.
3. Bật `dev-local-integrate` (:3001, DB local) bằng `preview_start`. Không dùng `dev-local` (chạy mã checkout chính, cũ).
4. Fixture thử tay: NV_TEST01 gốc chỉ có vai NHAN_VIEN_KSNK, khoa C18. Đã đổi tạm thì phải trả về gốc cuối phiên. Mật khẩu NV_TEST01 đang là giá trị thử; `npm run trial:prep` đặt lại.

## Vòng một việc
- `XÁC MINH` → `db-verify`. `SỬA` → `slice-fixer` (hoặc tự làm nếu vài dòng); dòng `lop=DB` → `migration-author`; `VAN_HANH` → chờ PO.
- Sửa lỗi: test tái hiện fail trước → `npm run verify:changed` → commit → `set <ID> DA_SUA <sha>`. Chạm RLS/auth/migration: `review-bv103` một vòng.
- Kịch bản tay: làm trên :3001, đối chiếu DB local, rồi `tay <ID> DAT|KHONG_DAT|CHUA "<ghi chú>"`. Không dựng được trên UI → `CHUA` kèm lý do «chỉ spec».

## Trạng thái (2026-11-13)
- Điểm cơ học (`module:audit`, số bước có/10): giam-sat 5 · cssd 6 · nkbv 4 · qlcv 4 · dao-tao 4. Các bước còn thiếu (1, 2, 5, 8, 9, 10) đều cần người dùng/PO: đầu mối, kịch bản thật, ngưỡng, UAT, số đo. Sửa mã không nâng được điểm.
- `module:gate`: giam-sat CHẠY_THỬ · cssd XÂY (đầu mối Nguyễn Thanh Bình) · nkbv KHÁM_PHÁ · qlcv XÁC_NHẬN · dao-tao KHÁM_PHÁ; 4 module chưa có đầu mối.
- QT-013 đã sửa + thử tay đạt. VST-012 = lỗi giả (chỉ kẹt khi tab pane nằm nền). Thử tay ĐẠT CSSD-024, NKBV-022, VST-013b (fixture đã trả về gốc). NKBV-024 (Kho vi sinh hiện nút ghi cho vai chỉ xem) đã sửa d5d60fdb + thử tay đạt.
- Ý tưởng chờ PO: «gói quyền nhanh» (gán sẵn theo vai + chọn cả hàng/cột) trên ma trận trang × thao tác hiện có.
- 15 dòng `test_tay=CHUA`: phần lớn là race, giới hạn số dòng, payload sai từ client, hoặc cần tài khoản chỉ có quyền GSC/Mạng lưới (chưa có fixture). Chạy khi có đầu mối/UAT thật.

## CẦN NGƯỜI (Lát E) — im = không push, không áp prod
1. Tên đầu mối VST/GSC, NKBV, QLCV, Đào tạo; đợt thử đầu gồm module nào; trạng thái NKBV (đang KHÁM_PHÁ nhưng nhiều commit `feat`).
2. PO chốt 11-13 (đã sửa, sha trong sổ): CSSD-017 ủ BI ≥20', NKBV-023 ẩn ca chốt = ADMIN + lý do, NKBV-026 LOA máy chủ; CSSD-025 HOAN. Còn treo: câu 7 GSC, DT-008. Mặc định Claude 2026-11-13 chờ PO bác (đảo = revert sha trong sổ): QLCV-010, QT-012, NKBV-018, VST-013a, CSSD-017 giờ đọc tương lai (dung sai 2 phút).
3. Authorize MCP Supabase (`/mcp`) để gỡ NEN-003, CSSD-004 và đối chiếu prod.
4. Lô prod pha 1 (`.claude/plans/KH_APPKSNK_20261117_lo-prod-pha1.md`): nhóm A đã áp prod 17/11 (37/37 khớp). Cửa sổ rủi ro §3.4 đang mở: prod chạy mã cũ, ghi nhật ký/thu hồi CSSD lỗi (RPC đổi tham số). Còn: «push» → PR vào main → «deploy» → B1–B5 (`sync:check`) → TC09.
5. NKBV DOE/Transfer Rule: spec «PO 2026-11-13» (DOE trước nhập viện kẹp về ngày nhập viện, bỏ Transfer Rule) trái SSOT `hai-surveillance-domain-ssot-20260827.md:132`; đã cất `.git/wip-patches/20261117_nkbv-loa-doe-po-1113.patch`, mã giữ NHSN. PO chốt: giữ NHSN (bỏ patch) hay đổi luật.
6. Duyệt `.claude/plans/KH_APPKSNK_20261116_lam-gon-ma.md` (làm gọn mã mọi module, 13 câu hỏi; im = không xóa gì).
- Gỡ «mục tiêu viện» (`b13ef7b6`…`f44b7705`): phần prod gộp vào B2–B4 của plan lô prod pha 1; chi tiết `SO_NO_APPKSNK.md`.

## Lát chưa mở / nợ
- NKBV-025 ĐẠT 2026-11-13 (sửa nhánh BA chưa có khoa điều trị, 4 spec; chi tiết `git show 9c1509fb:HANDOFF_APPKSNK.md`).
- Thử tay 2026-11-13 ĐẠT 36/43; 7 mục không lối UI giữ CHUA, có spec pass. Mẹo fixture: vai tạm có quyền cần thử, xóa sau phiên; BM.31.03 local is_active=false. Ghi nhận nhỏ chưa sửa: nút «Phê duyệt và giao» vẫn hiện cho người đề xuất; banner NKBV hiện link `/giam-sat-nkbv?case=` cho người chỉ có quyền CSSD.
- Review 2026-11-13: 6 action ghi Đào tạo đã qua `requireDaoTaoAdmin` (DT-016, d1ab156f; siết thêm: thiếu DAO_TAO view thì không ghi được). Nợ «break-glass không được miễn ở RPC QLCV» đóng 2026-11-13, không sửa: PO 11-11 (QLCV-003) chốt bỏ miễn break-glass, chỉ ADMIN/CNK thật; QLCV-010 cùng mẫu; app đã khớp (`getActorRbacRoleNamesStrict`). Muốn miễn thì PO đổi quyết định trước.
- Review 2026-11-13 (CSSD-011/012, NKBV-013..016, QT-011): Go; sửa CSSD-028 (8d571e6a), QT-014 (1261395c); NKBV-026 đã sửa. Trước deploy: kiểm prod NHAN_VIEN_KSNK có GIAM_SAT_NKBV import (chỉ seed, không migration).
- Roadmap 65,9 KB (mục tiêu 25 KB).

## Lệnh kiểm chứng
`node scripts/readiness/so-loi.mjs check` · `npm run verify:changed` · `npm run docs:links:check` · `npm run module:gate`
