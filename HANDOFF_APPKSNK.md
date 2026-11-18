# HANDOFF_APPKSNK — Rà 5 module để vận hành thử (cập nhật 2026-11-18)

File này chỉ trỏ đường; tiến độ từng lỗi ở `ghi_chu`/`test_tay` của sổ. `so-loi.mjs check` FAIL khi file này > 6000 byte. Khôi phục file đã gộp/xóa: `git show 5618ae82:<đường dẫn>` (`HANDOFF_APPKSNK_NKBV.md`, `docs/archive/bao-cao/BAO-CAO-{RA-SOAT-2026-11-05,CAI-TO-2026-11-06,NEN-MONG-2026-11-13,TONG-THE-2026-11-13}.md`); bản đầy đủ cũ: `git show ae5ca6fd:HANDOFF.md`.

## TIẾN ĐỘ HIỆN TẠI (đo 2026-11-18: `so-loi.mjs stats` · `check` · `npm run module:gate`)
- Sổ 166 dòng: MOI 0 · DA_XAC_MINH 1 · LOI_GIA 16 · DANG_SUA 0 · DA_SUA 131 (có test/migration 107) · HOAN 10 · CHO_PO 8 (`so-loi.mjs status`). Tay: DAT 57 · CHUA 8 · KHONG_DAT 0.
- Cổng module: giam-sat CHẠY_THỬ · cssd XÂY · nkbv KHÁM_PHÁ · qlcv XÁC_NHẬN · dao-tao KHÁM_PHÁ. `check`: VST_GSC chưa đạt (VST-025), NKBV chưa đạt (NKBV-041), 5 module kia không còn lỗi chặn. Hai FAIL này có từ trước đợt gộp tài liệu.
- Nhánh `claude/consolidate-reports-progress-46e328` (gộp HANDOFF + `docs/archive/bao-cao/BAO-CAO-TONG-HOP.md`) chưa vào `integrate/2026-11`; gộp khi PO đồng ý.

## ĐANG LÀM
- Chạy nối 18/11: CSSD-034 DA_SUA, lát A `61148266` (migration `20261118120000` chỉ local, áp prod = CHO_PO) + lát B `c44f87db` (drawer «Lập phiếu ngược», tay DAT; dòng «sau khi đảo» = CSSD-037, cần PO). NKBV-046/045/033/043/037/044 đã sửa, tay DAT. NKBV-047 LOI_GIA (nợ: hook `useGenerateMa` thừa, GiamSatNkbvPage:321). NKBV-038 `1efc3867`: migration `20261118130000` chỉ local; trước khi áp prod phải đo (read-only) số người có `GIAM_SAT_NKBV:view` ngoài ADMIN/NV KSNK/HĐ/CNK. Còn 4 đường admin client (SO_NO). CHO_PO: VST-027, NKBV-041, VST-024, CSSD-037.

## NKBV → NHSN 2026 (GĐ0–GĐ2; mọi commit đã vào integrate)
- Xong: 31 ca hồi quy (`lib/__fixtures__/nhsn2026/`); SSI PATOS chỉ là nhãn; VAE baseline/PEEP; BSI `excl_*`; PNEU; BONE IWP 21 ngày. `npm run test:cssd -- src/modules/giam-sat-nkbv` → 676 passed | 2 skipped; `tsc` sạch.
- Dở (không có trong sổ): DOE theo tầng sâu nhất (`resolveSsiDoe` đang lấy sớm nhất) · cửa sổ ±2 (V10.27) chưa có chỗ cài · `excl_*` chưa tay trên UI (cần `.env.local`); B4.56 ô «Commensal: 2 lần lấy máu riêng» (`draft.bsiCommensalSeparate`, PO 11-12) · PNU3 không cần xét nghiệm, mẫu máu `table2Culture` (P6.20/60), chất lượng đờm (P6.53–55) · G2.02 mới có cờ `is_fungi_respiratory`, thiếu Pneumocystis/Paracoccidioides/véc-tơ.
- Lệch lâm sàng chờ PO: UTI sốt đơn độc app đòi ≤65 tuổi (`nkbv-rules-engine.ts:616-619`), gói U7.19/24/36 nói mọi tuổi.

## KẾ
- Lát 3b xong (nợ: SO_NO). Lát 4: `KH_APPKSNK_20261118_squash-migration.md` §5–7.
- Monitoring theo khóa PO 11-01 qua `ksnk_dm_tham_so`: migration `20261118100000` + `20261118110000` áp local; áp prod = CHO_PO. VST-034 LOI_GIA.
- Hook `guard-migration` (853fe8bc): migration prod kế tiếp PO duyệt trước bằng `duyet_migration.py`; chưa thử với dialog thật.
- Đã xong: CSSD-032 `3165749c` áp prod 18/11 · `KSNK_PILOT_FOUR_MODULES` (công tắc TẮT) · PR #131 deploy xong, còn TC09.

## Mở phiên mới
1. Làm ở worktree `integrate-2026-11`. `so-loi.mjs status` → `next 10` → `next --tay` → `stats`; bật `dev-local` (:3001) bằng `preview_start`.
2. Fixture tay: NV_TEST01 gốc chỉ vai NHAN_VIEN_KSNK, khoa C18; đổi tạm thì trả về gốc cuối phiên (`npm run trial:prep` đặt lại mật khẩu).
3. Vòng một việc theo CLAUDE.md dự án; `lop=DB` → `migration-author`, `VAN_HANH` → chờ PO. Tay: `tay <ID> DAT|KHONG_DAT|CHUA "<ghi chú>"`; không dựng được trên UI → `CHUA` «chỉ spec».

## CẦN NGƯỜI (Lát E) — im = không push, không áp prod
1. Tên đầu mối VST/GSC, NKBV, QLCV, Đào tạo (CSSD: Nguyễn Thanh Bình); đợt thử đầu gồm module nào. NKBV: cổng module báo KHÁM_PHÁ nhưng đã nhiều commit `feat` — PO chốt trạng thái thật (nâng cổng hay giữ); chưa có dòng sổ.
2. Mặc định Claude 11-13 chờ PO bác (đảo = revert sha trong sổ): QLCV-010, QT-012, NKBV-018, VST-013a, CSSD-017 (dung sai 2 phút). Còn treo: câu 7 GSC, DT-008.
3. Authorize MCP Supabase (`/mcp`) để gỡ NEN-003, CSSD-004, đối chiếu prod.
4. Lô prod pha 1 (`.claude/plans/KH_APPKSNK_20261117_lo-prod-pha1.md`) đã áp 17/11; còn TC09 (PO) và xem dashboard VST/GSC prod sau B2.
5. Duyệt `.claude/plans/KH_APPKSNK_20261116_lam-gon-ma.md` (13 câu; im = không xóa gì).
6. Lát 4 (A): 4a′ xong, hỏng do `f44b7705` stub hóa `20260729121000` (plan §7); 4b chờ lệnh phá hủy + TC09.

## Nợ khác
- Ý tưởng chờ PO: «gói quyền nhanh» (gán sẵn theo vai) trên ma trận trang × thao tác.
- Tay 8 mục CHUA không có lối UI (race, payload client, thiếu fixture GSC/Mạng lưới), spec/probe pass. Chưa sửa: nút «Phê duyệt và giao» hiện cho người đề xuất; banner NKBV link `/giam-sat-nkbv?case=` cho người chỉ có quyền CSSD. Trước deploy: kiểm prod NHAN_VIEN_KSNK có GIAM_SAT_NKBV import.
- Lệnh kiểm chứng: `node scripts/readiness/so-loi.mjs check` · `npm run verify:changed` · `npm run docs:links:check` · `npm run module:gate`
