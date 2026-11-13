# HANDOFF — Rà 5 module để vận hành thử (cập nhật 2026-11-13)

File này chỉ trỏ đường. Tiến độ từng lỗi nằm ở `ghi_chu`/`test_tay` của sổ. Bản đầy đủ trước khi rút gọn: `git show ae5ca6fd:HANDOFF.md` (lô migration prod, sao lưu nhóm 2, ghi chú NKBV máu-sau-cùng). `so-loi.mjs check` FAIL khi file này > 6000 byte.

## Mở phiên mới
1. Làm ở worktree `integrate-2026-11` (nhánh `integrate/2026-11`, chưa push).
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
- UAT 2026-11-13 trên :3001: ĐẠT CSSD-006, NKBV-009, QLCV-007, DT-007, DT-014 (sau sửa 47b8e383). Đã sửa c80d15c4: CSSD-026/024, NKBV-022, VST-013b (chưa thử tay). `check` exit 0.
- QT-013 đã sửa + thử tay đạt. VST-012 = lỗi giả (chỉ kẹt khi tab pane nằm nền; đo ở tab trước bằng tab mới, không đo tab nền). Thử tay ĐẠT CSSD-024, NKBV-022, VST-013b (fixture đã trả về gốc). NKBV-024 (Kho vi sinh hiện nút ghi cho vai chỉ xem) đã sửa d5d60fdb + thử tay đạt.
- Lát D xong 2026-11-13: mục 8 `van-de-nguoi-dung.md` của 5 module có khối «Cập nhật 2026-11-13» (audit, gate, sổ lỗi, thử tay).
- Ý tưởng chờ PO: «gói quyền nhanh» (gán sẵn theo vai + chọn cả hàng/cột) trên ma trận trang × thao tác hiện có.
- 15 dòng `test_tay=CHUA`: phần lớn là race, giới hạn số dòng, payload sai từ client, hoặc cần tài khoản chỉ có quyền GSC/Mạng lưới (chưa có fixture). Chạy khi có đầu mối/UAT thật.

## Chặn thử nghiệm (cần PO — Lát E)
1. Tên đầu mối VST/GSC, NKBV, QLCV, Đào tạo; đợt thử đầu gồm module nào; trạng thái NKBV (đang KHÁM_PHÁ nhưng nhiều commit `feat`).
2. Câu treo: CSSD-017 (ngưỡng ủ BI), NKBV-023 (ẩn ca NKBV đã chốt), câu 7 GSC, DT-008, mã chết `cssdCommandFreezeSet` (CSSD-025). Mặc định Claude 2026-11-13 chờ PO bác (đảo = revert sha trong sổ): QLCV-010, QT-012, NKBV-018, VST-013a, CSSD-017 giờ đọc tương lai (dung sai 2 phút).
3. Authorize MCP Supabase (`/mcp`) để gỡ NEN-003, CSSD-004 và đối chiếu prod.
4. Push `integrate/2026-11` lên GitHub.
5. Lô migration prod: 31 file chưa áp + `20261113100000_qlcv010_khong_tu_phe_duyet_dexuat` (sau 20261112140000), thứ tự + điều kiện trước/sau áp ở `git show ae5ca6fd:HANDOFF.md` dòng 25–30. Áp hết rồi mới deploy mã (DT-006 cần cột `huy_*`).

## Lát chưa mở / nợ
- NKBV-025 ĐẠT 2026-11-13: FK bắt BA tồn tại nên «chưa import» không xảy ra; đã sửa nhánh BA active chưa có khoa điều trị + không lưới ngày (`if (ba?.khoa_dieu_tri_id || …)` trong `nkbv-khoa-scope.server.ts`, 4 spec mới). Thử tay lại :3001 vai Mạng lưới: «Đã ẩn phiếu»; phiếu khoa khác vẫn bị RLS ẩn. Mạng lưới preset chỉ có NKBV view nên chỉ gặp khi được cấp thêm edit/delete.
- Thử tay 2026-11-13 (:3001) ĐẠT: QLCV-010, NKBV-018, VST-013a, CSSD-027 (ghi ở sổ lỗi). Ghi nhận nhỏ chưa sửa: nút «Phê duyệt và giao» vẫn hiện cho người đề xuất (chỉ chặn khi gửi); banner NKBV vẫn hiện link `/giam-sat-nkbv?case=` cho người chỉ có quyền CSSD.
- Review 2026-11-13: 6 action ghi Đào tạo đã qua `requireDaoTaoAdmin` (DT-016, d1ab156f; siết thêm: thiếu DAO_TAO view thì không ghi được). Nợ «break-glass không được miễn ở RPC QLCV» đóng 2026-11-13, không sửa: PO 11-11 (QLCV-003) chốt bỏ miễn break-glass, chỉ ADMIN/CNK thật; QLCV-010 cùng mẫu; app đã khớp (`getActorRbacRoleNamesStrict`). Muốn miễn thì PO đổi quyết định trước.
- Chưa qua reviewer độc lập: CSSD-011/012, NKBV-013..016, QT-011.
- Mã chết (báo, không xóa): `NkbvBaGridCasePrintView.tsx`, `cssdCommandFreezeSet`, `isWithinLuot`.
- Roadmap 65,9 KB so với mục tiêu 25 KB.

## Lệnh kiểm chứng
`node scripts/readiness/so-loi.mjs check` · `npm run verify:changed` · `npm run docs:links:check` · `npm run module:gate`
