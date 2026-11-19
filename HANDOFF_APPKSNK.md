# HANDOFF_APPKSNK — Rà 5 module để vận hành thử (cập nhật 2026-11-19)

File này chỉ trỏ đường; tiến độ từng lỗi ở `ghi_chu`/`test_tay` của sổ. `so-loi.mjs check` FAIL khi file này > 6000 byte. Khôi phục file đã gộp/xóa: `git show 5618ae82:<đường dẫn>` (`HANDOFF_APPKSNK_NKBV.md`, `docs/archive/bao-cao/BAO-CAO-{RA-SOAT-2026-11-05,CAI-TO-2026-11-06,NEN-MONG-2026-11-13,TONG-THE-2026-11-13}.md`); bản đầy đủ cũ: `git show ae5ca6fd:HANDOFF.md`.

## TIẾN ĐỘ HIỆN TẠI (đo 2026-11-19: `so-loi.mjs stats` · `check` · `npm run module:gate`)
- Sổ 199 dòng: MOI 19 · DA_XAC_MINH 7 · LOI_GIA 16 · DANG_SUA 0 · DA_SUA 134 · HOAN 13 · CHO_PO 10. Tay: DAT 57 · CHUA 9 · KHONG_DAT 0.
- Cổng module: giam-sat CHẠY_THỬ · cssd XÂY · nkbv KHÁM_PHÁ · qlcv XÁC_NHẬN · dao-tao KHÁM_PHÁ. `check` đỏ do CSSD-043 (CAO, MOI): xác minh trước tiên.

## ĐANG LÀM
- 19/11 phân loại SO_NO một lần (PO «Đồng ý»): 33 dòng mới vào sổ, mọi câu PO gom ở `CAU_HOI_PO_APPKSNK.md`. Đốt sổ 19/11: CSSD-043(b) `7d79bdec` ((a) chờ C2), CSSD-038, VST-038A ; `check` hết đỏ. CSSD-039 `8fc96fc5`. Stats: MOI 14 · DA_XAC_MINH 8 · DA_SUA 138 · CHO_PO 15 · tay CHUA 9. Dở VST-037: code+spec+`vitest.config.ts` chưa commit; migration+pgTAP nháp ở `side-session-notes/local_3bfcaae0…/vst037/` (cần ADR). Kế: VST-037 → CSSD-045 → NEN-007 (portal drawer); VST-038 A2 + VST-044 chờ PO.
- 19/11 đã áp prod 4 migration `20261118100000`…`130000`. Code lát B (drawer) + trang kế hoạch giám sát chưa deploy (câu D1).

## NKBV → NHSN 2026 (GĐ0–GĐ2; mọi commit đã vào integrate)
- Xong: 31 ca hồi quy (`lib/__fixtures__/nhsn2026/`); SSI PATOS chỉ là nhãn; VAE baseline/PEEP; BSI `excl_*`; PNEU; BONE IWP 21 ngày. `npm run test:cssd -- src/modules/giam-sat-nkbv` → 676 passed | 2 skipped; `tsc` sạch.
- Dở (không có trong sổ): DOE theo tầng sâu nhất (`resolveSsiDoe` đang lấy sớm nhất) · cửa sổ ±2 (V10.27) chưa có chỗ cài · `excl_*` chưa tay trên UI (cần `.env.local`); B4.56 ô «Commensal: 2 lần lấy máu riêng» (`draft.bsiCommensalSeparate`, PO 11-12) · PNU3 không cần xét nghiệm, mẫu máu `table2Culture` (P6.20/60), chất lượng đờm (P6.53–55) · G2.02 mới có cờ `is_fungi_respiratory`, thiếu Pneumocystis/Paracoccidioides/véc-tơ.
- Lệch lâm sàng UTI sốt đơn độc (`nkbv-rules-engine.ts:651-654`): câu P8 trong `CAU_HOI_PO_APPKSNK.md`.

## KẾ
- **Kế luồng:** `.claude/plans/de-xuat-mot-con-duong-20261119.md` §8. Xong: Lát 1 (`feedb6ef`), Lát 3 (`90d8e40a`, chưa push). Lát 1b (`b37a01d7`, `fa7f96cb`: pgTAP VST + `gen types` + 1 hàm VST gõ kiểu; `npm run db:dung` XANH 19/11). Lát 2 (`f4f4b427` + `ea68c7d6`: trace đếm todo, `dac-ta-test.mjs`, sổ 6 trường + cổng 1–4 + `report` cho 03 + 3 chỉ số luồng + `so-loi.test.mjs`; 3/3 Xong khi, plan §8 «Kết quả Lát 2b»). Dở, chưa commit: (1) Lát 1c: `DB_DUNG_E2E=1 npm run db:dung` 4/6 ĐỎ; ca 1 (`/thong-ke/gsc`) và ca 5 (`/thong-ke/vst`) thấy banner đỏ `.border-red-200.bg-red-50`, chữ chưa biết (script nay in `error-context.md` `head -200`: chạy lại, đọc banner); rồi `review-bv103` một vòng, «Kết quả Lát 1c» vào plan §8 («chờ «push»»), commit `db-dung.yml`/`.gitignore`/`db-dung.sh`/spec/plan. (2) `CAU_HOI_PO_APPKSNK.md`: P1–P8 đã có nhãn; còn C1–C2, N1–N3, P9 (VST-044), mục «Đã làm theo mặc định», bước PO `typescript-lsp`/superpowers; 4 dòng `CHO_PO` mới đã commit `e3de3b1a`; đo awk + `check` + `docs:links:check`. `so-loi.json`/`tsconfig.json`/`vitest.config.ts` là của phiên khác, không stage. Chỉ dùng số lát §8. `npm run db:dung` (42 s; CI `db-dung.yml` sau push) · reset stack `scripts/db-reset-local.sh` · hàng rào `supabase/PROD_HEAD` + `guard-migrations.mjs`.
- Ngoài §8, đã xong: migration > PROD_HEAD cần `-- ADR: docs/adr/*.md` (`9d979794`, `eafbe659`); bỏ `rules/review-flow.md` (`9a12116e`).
- Monitoring theo khóa PO 11-01 qua `ksnk_dm_tham_so`: `20261118100000` + `20261118110000` đã ở prod (19/11); chờ deploy code. VST-034 LOI_GIA.
- Hook `guard-migration` (853fe8bc): migration prod kế tiếp PO duyệt trước bằng `duyet_migration.py`; chưa thử với dialog thật.
- Đã xong: CSSD-032 `3165749c` áp prod 18/11 · `KSNK_PILOT_FOUR_MODULES` (công tắc TẮT) · PR #131 deploy xong, còn TC09.

## Mở phiên mới
1. Làm ở worktree `integrate-2026-11`. `so-loi.mjs status` → `next 10` → `next --tay` → `stats`; bật `dev-local` (:3001) bằng `preview_start`.
2. Fixture tay: NV_TEST01 gốc chỉ vai NHAN_VIEN_KSNK, khoa C18; đổi tạm thì trả về gốc cuối phiên (`npm run trial:prep` đặt lại mật khẩu).
3. Vòng một việc theo CLAUDE.md dự án; `lop=DB` → `migration-author`, `VAN_HANH` → chờ PO. Tay: `tay <ID> DAT|KHONG_DAT|CHUA "<ghi chú>"`; không dựng được trên UI → `CHUA` «chỉ spec».

## CẦN NGƯỜI — im = không push, không áp prod
- Một file duy nhất: [`CAU_HOI_PO_APPKSNK.md`](CAU_HOI_PO_APPKSNK.md). Các nhóm: P cần quyết · C hỏi khoa CSSD · D lệnh prod/deploy · N vận hành · M mặc định đang chạy · K không gấp. PO trả lời theo mã; đáp án ghi vào sổ, rồi xóa câu khỏi file.

## Nợ khác
- Tay 8 mục CHUA không có lối UI (race, payload client, thiếu fixture GSC/Mạng lưới), spec/probe pass. Chưa sửa: nút «Phê duyệt và giao» hiện cho người đề xuất; banner NKBV link `/giam-sat-nkbv?case=` cho người chỉ có quyền CSSD. Trước deploy: kiểm prod NHAN_VIEN_KSNK có GIAM_SAT_NKBV import.
- Lệnh kiểm chứng: `node scripts/readiness/so-loi.mjs check` · `npm run verify:changed` · `npm run docs:links:check` · `npm run module:gate`
