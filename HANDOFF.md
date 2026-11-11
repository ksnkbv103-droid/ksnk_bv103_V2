# HANDOFF — NKBV → NHSN 2026 (GĐ0–GĐ2)

Nhánh `claude/nkbv-nhsn2026-core-df1243`. Commit: 060d579d (GĐ0 SSOT), 54c1ce49 (GĐ1 bộ ca), a20d9453 (lát 1), 637544f2 (lát 2), 59e9585d (lát 3), 55df1651 (lát 4), + lát 5.

## Đã làm
- GĐ1: 31 ca hồi quy gắn tay (`lib/__fixtures__/nhsn2026/`, `nhsn2026-fixtures.spec.ts`). Bỏ: C4.13/14/30, C10.44–46, C11.11–12, C12.04/07 (danh sách PO); C2.17, C2.05, C10.17 (gói chưa chắc / không có bảng số).
- Lát 1 SSI: PATOS chỉ là nhãn (S9.66–69, S9.108).
- Lát 2 VAE: baseline = ngày nền đầu, PEEP 0–5 → 5 (V10.10, V10.21–23).
- Lát 3 BSI: cờ loại trừ CLABSI `excl_*` → PRIMARY_BSI_NON_CLABSI; cảnh báo thiếu tuổi (B4.40–48).
- Lát 4 PNEU: Cryptococcus/Histoplasma/Blastomyces/Coccidioides không đủ PNU3 (P6.22); hạ thân nhiệt chỉ tính ≤1 tuổi (P6.29).
- Lát 5 BONE: IWP 21 ngày, RIT/SBAP hết đợt (G2.15, G2.31, G2.36).

## Còn dở / chặn (cần PO)
- Lát 1: DOE theo tầng sâu nhất (`resolveSsiDoe` lấy sớm nhất mọi tầng).
- Lát 2: cửa sổ ±2 (V10.27) chưa tìm thấy nơi cài.
- Lát 3: cờ `excl_*` ĐÃ có ô nhập ở `BsiClinicalSubForm` (form đơn → server action spread `verificationInput` → engine; chưa kiểm tay trên UI). CHƯA nối đường lưới BA/timeline: `NkbvSyndromeIwpGrid` (draft.bsiMbi), `ba-analysis-session`, `analysis-session-to-verification`, `useNkbvIwpVerdicts` (2 chỗ), `BuildBsiTimelineVerdictInput` (~6–7 file, theo mẫu `has_hsct_or_gvhd`; hỏi PO có làm không); chưa làm danh sách tác nhân loại trừ (B4.64–66), quy tắc ≤1 ngày giữa 2 mẫu commensal (B4.56).
- Lát 4: PNU3 không cần xét nghiệm (đang đòi lab + toàn thân); mẫu máu `table2Culture` (P6.20/60); chất lượng đờm (P6.53–55).
- Lát 5: G2.02 vi sinh vật cộng đồng mới chỉ là cờ `is_fungi_respiratory`; thiếu Pneumocystis, Paracoccidioides, véc-tơ.
- Sai khác lâm sàng chưa sửa: UTI sốt đơn độc app đòi ≤65 tuổi, gói U7.19/24/36 nói mọi tuổi.

## Kiểm chứng
- `npm run test:cssd -- src/modules/giam-sat-nkbv` → 676 passed | 2 skipped; `npx tsc --noEmit` sạch.
- `npm run verify:changed`: build fail do thiếu .env.local (môi trường): "Thiếu biến môi trường Supabase trong .env.local … Export encountered an error".
