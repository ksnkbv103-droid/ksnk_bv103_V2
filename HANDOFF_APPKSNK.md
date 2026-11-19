# HANDOFF_APPKSNK — Rà 5 module để vận hành thử (cập nhật 2026-11-19)

File này chỉ trỏ đường; tiến độ từng lỗi ở `ghi_chu`/`test_tay` của sổ. `so-loi.mjs check` FAIL khi file này > 6000 byte. Khôi phục file đã gộp/xóa: `git show 5618ae82:<đường dẫn>` (`HANDOFF_APPKSNK_NKBV.md`, `docs/archive/bao-cao/BAO-CAO-*.md`); bản đầy đủ cũ: `git show ae5ca6fd:HANDOFF.md`.

## TIẾN ĐỘ HIỆN TẠI (đo 2026-11-19: `so-loi.mjs stats` · `check` · `npm run module:gate`)
- Sổ (đo 19/11 cuối đợt 8): MOI 1 · DA_XAC_MINH 1 · LOI_GIA 21 · DANG_SUA 0 · DA_SUA 159 · HOAN 16 · CHO_PO 12. Tay: DAT 70 · CHUA 14 · KHONG_DAT 0.
- Cổng module: giam-sat CHẠY_THỬ · cssd XÂY · nkbv KHÁM_PHÁ (PO duyệt nâng XÂY, chờ tên đầu mối + 2 `[CẦN XÁC NHẬN]`) · qlcv XÁC_NHẬN · dao-tao KHÁM_PHÁ. `check` exit 0 (đo 19/11 cuối đợt 8).

## ĐANG LÀM
- 19/11 đốt sổ đợt 5. Đóng: NEN-008 `ff5043ce`; VST-040 `bff55cbc`; VST-028 `c14598fd` (migration `20261119150000` chỉ local; chi tiết/in LĐK → VST-041); VST-017 `d34da30c` (bảng mã app↔kho ở `02-nghiep-vu-domain.md` §2.3, giữ mã app). NKBV-049 DA_SUA `bbf60b55` (3 đường đọc theo phạm vi danh tính; tay CHUA: DB local 0 BA). NEN-016 DA_SUA `3be6d9d5`. Migration chưa áp prod: NEN-007 `610e69f0`, CSSD-037 `49fdab3f` (chờ PO). Đợt 7: CSSD-042 `eb67c90d` (chưa áp prod), QT-017 `cb0ccf67` DA_SUA; QT-019 CHO_PO (P12).
- Đợt 8 (19/11, local, chưa push): VST-046 DA_SUA `ab392af8` (migration `20261119190000` nối CHU_NHIEM_KHOA 7 quyền view; pgTAP vst_rls 33/33; tay CHUA: QT-019). NEN-011 DA_SUA `5d58bf17` (ẩn menu «Chất thải & Đồ vải», tay DAT). Trước đó: NEN-012 `1b97c49f` (KHÔNG áp `20261114180000` lên prod), VST-045 `f34aa08f`; sha khác ở sổ.
- **Việc kế = NEN-009** (`migration-author`): ADR trước, rồi migration REVOKE EXECUTE `rpc_mdm_nhan_su_max_numeric_suffix(text)` FROM PUBLIC, anon + GRANT authenticated, service_role; `acl-snapshot --write`, `db:dung`, `review-bv103`. NEN-017 MOI: NHAN_VIEN_KSNK 0 liên kết HAU_CAN_MOI_TRUONG (cùng lớp VST-046, mẫu `ab392af8`). NEN-010 → P13, NEN-015 → P14 (CHO_PO). HOAN: NKBV-050, VST-044, CSSD-047. CSSD-048 chờ «tắt 68 bộ» (D6). Chờ PO: CSSD-041, CSSD-043(a), P12–P14.
- 19/11 đã áp prod 4 migration `20261118100000`…`130000`. Code lát B (drawer) + trang kế hoạch giám sát chưa deploy (câu D1).

## NKBV → NHSN 2026 (GĐ0–GĐ2; mọi commit đã vào integrate)
- Xong: 31 ca hồi quy (`lib/__fixtures__/nhsn2026/`); SSI PATOS chỉ là nhãn; VAE baseline/PEEP; BSI `excl_*`; PNEU; BONE IWP 21 ngày. `npm run test:cssd -- src/modules/giam-sat-nkbv` → 676 passed | 2 skipped; `tsc` sạch.
- Dở (không có trong sổ): DOE theo tầng sâu nhất (`resolveSsiDoe` đang lấy sớm nhất) · cửa sổ ±2 (V10.27) chưa có chỗ cài · `excl_*` chưa tay trên UI (cần `.env.local`); B4.56 ô «Commensal: 2 lần lấy máu riêng» (`draft.bsiCommensalSeparate`, PO 11-12) · PNU3 không cần xét nghiệm, mẫu máu `table2Culture` (P6.20/60), chất lượng đờm (P6.53–55) · G2.02 mới có cờ `is_fungi_respiratory`, thiếu Pneumocystis/Paracoccidioides/véc-tơ.
- Lệch UTI sốt đơn độc (`nkbv-rules-engine.ts:651-654`): PO 19/11 P8=A, NKBV-050 HOAN.

## KẾ
- **Kế luồng:** `.claude/plans/de-xuat-mot-con-duong-20261119.md` §8. Xong: Lát 1 (`feedb6ef`), Lát 1b (`b37a01d7`, `fa7f96cb`), Lát 1c (`6189444a`: e2e VST+GSC 6/6 trong `DB_DUNG_E2E=1 npm run db:dung`, XANH ở `99e9a428`; job CI chờ «push»; plan §8), Lát 2 (`f4f4b427` + `ea68c7d6`; plan §8 «Kết quả Lát 2b»), Lát 3 (`90d8e40a`, chưa push). `db-dung.sh` luôn dùng project id `ksnk_dd`: hai phiên chạy `db:dung` cùng lúc thì phiên sau tắt stack phiên trước; chỉ chạy khi `pgrep -f "bash scripts/db-dung.sh"` rỗng. `npm run db:dung` (42 s; CI sau push) · reset stack `scripts/db-reset-local.sh` · hàng rào `supabase/PROD_HEAD` + `guard-migrations.mjs`.
- Ngoài §8, đã xong: migration > PROD_HEAD cần `-- ADR: docs/adr/*.md` (`9d979794`, `eafbe659`).
- Monitoring theo khóa PO 11-01 qua `ksnk_dm_tham_so`: `20261118100000` + `20261118110000` đã ở prod (19/11); chờ deploy code. VST-034 LOI_GIA.
- Đã xong: CSSD-032 `3165749c` áp prod 18/11 · `KSNK_PILOT_FOUR_MODULES` (công tắc TẮT) · PR #131 còn TC09.

## Mở phiên mới
1. Làm ở worktree `integrate-2026-11`. `so-loi.mjs status` → `next 10` → `next --tay` → `stats`; bật `dev-local` (:3001) bằng `preview_start`.
2. Fixture tay: NV_TEST01 gốc chỉ vai NHAN_VIEN_KSNK, khoa C18; đổi tạm thì trả về gốc cuối phiên (`npm run trial:prep` đặt lại mật khẩu).
3. Vòng một việc theo CLAUDE.md dự án; `lop=DB` → `migration-author`, `VAN_HANH` → chờ PO. Tay: `tay <ID> DAT|KHONG_DAT|CHUA "<ghi chú>"`; không dựng được trên UI → `CHUA` «chỉ spec».

## CẦN NGƯỜI — im = không push, không áp prod
- Một file duy nhất: [`CAU_HOI_PO_APPKSNK.md`](CAU_HOI_PO_APPKSNK.md). Các nhóm: P cần quyết · C hỏi khoa CSSD · D lệnh prod/deploy · N vận hành · M mặc định đang chạy · K không gấp. PO trả lời theo mã; đáp án ghi vào sổ, rồi xóa câu khỏi file.

## Nợ khác
- Tay 8 mục CHUA không có lối UI (race, payload client, thiếu fixture GSC/Mạng lưới), spec/probe pass. Chưa sửa: `GscBkAnalyticsDashboard.tsx` ~114 còn cảnh báo `< 0.8` (khóa PO <85); nút «Phê duyệt và giao» hiện cho người đề xuất; banner NKBV link `/giam-sat-nkbv?case=` cho người chỉ có quyền CSSD. Trước deploy: kiểm prod NHAN_VIEN_KSNK có GIAM_SAT_NKBV import.
- Lệnh kiểm chứng: `node scripts/readiness/so-loi.mjs check` · `npm run verify:changed` · `npm run docs:links:check` · `npm run module:gate`
