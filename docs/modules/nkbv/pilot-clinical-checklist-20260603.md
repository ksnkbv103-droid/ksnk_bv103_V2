# NKBV — Pilot checklist form lâm sàng (CDC) — UAT sign-off

> D-14 · Code: `NkbvClinicalChecklistModal` + sub-forms · Spec: `nkbv-rules-engine.spec.ts`

## Phủ syndrome (verified code)

| Syndrome | Sub-form | Automated spec |
|----------|----------|----------------|
| BSI | `BsiClinicalSubForm` | `nkbv-rules-engine.spec.ts` |
| UTI | `UtiClinicalSubForm` | ✓ |
| VAP/PNEU | `PneuClinicalSubForm`, `VaeClinicalSubForm` | ✓ |
| SSI | `SsiClinicalSubForm` | ✓ + `CssdTraceLink` |

## Kịch bản tay (Pilot DoD)

| # | Kịch bản | Làm gì trên UI | Kỳ vọng thấy | Kỹ thuật verify | UAT khoa KSNK |
|---|----------|----------------|--------------|-----------------|---------------|
| 1 | Day-3 → phiếu chờ xác minh | Import Excel có ca Day≥3 và ca POA (ngày 1–2) | Chỉ ca Day≥3 tạo sự kiện `CHO_XAC_MINH`; POA không vào giám sát HAI | `npx vitest run src/modules/giam-sat-nkbv/lib/nkbv-timeline-math.spec.ts` + import server gate | [x] eng 2026-07-09; **khoa vẫn ký tay** |
| 2 | Khoa điền form → chờ duyệt | Mở ca `CHO_XAC_MINH` → điền form lâm sàng → gửi | Trạng thái → `CHO_DUYET` | Manual `/giam-sat-nkbv` | [ ] |
| 3 | KSNK xác nhận / loại trừ | Panel thẩm định: Phê duyệt hoặc Loại trừ (+ lý do) | `XAC_NHAN` hoặc `LOAI_TRU` | Manual adjudication | [ ] |
| 4 | Import trùng MD5 | Import lại cùng file Excel đã import | Hệ thống bỏ qua dòng trùng (không nhân đôi) | Manual `NkbvViSinhImportPortal` | [ ] |
| 5 | SSI ↔ CSSD | Ca SSI có `ma_cycle_qr_lien_quan` | Hiện link truy vết CSSD (`CssdTraceLink`) | Manual + migration `20260602150000` | [ ] |
| 6 | Tách VAE / VAP / HAP | Phán quyết mẫu: chọn lần lượt VAE, VAP, HAP | Mỗi loại mở form/engine riêng (VAE: VAC→IVAC→PVAP; VAP/HAP: PNEU); nhãn cột danh sách không gộp | Manual + `nkbv-loai-labels.spec.ts` + `nkbv-rules-engine.spec.ts` | [ ] |
| 7 | Lọc hàng đợi loại + trạng thái | Tab Danh sách phiếu: chọn 1 loại + 1 trạng thái | Bảng chỉ còn phiếu khớp bộ lọc; đổi «Tất cả» → hiện lại đủ | Manual `/giam-sat-nkbv` | [ ] |

## Hướng dẫn PO (đợt C — 2026-07-09)

1. Đăng nhập tài khoản khoa lâm sàng → `/giam-sat-nkbv` → làm **#2**.
2. Đăng nhập KSNK → làm **#3** trên cùng ca.
3. Vào portal import vi sinh → làm **#4** (file đã import một lần).
4. Mở / tạo ca SSI có QR chu kỳ CSSD → làm **#5**.
5. Ký bảng Sign-off bên dưới khi 4 kịch bản tay PASS. Nếu fail: mở chat mới `/intake-nv` ghi rõ #kịch bản + ảnh/mô tả.

**Engineering sẵn sàng UAT (2026-07-09):** Day-3 server + map `CHO_XAC_MINH` Done · vitest NKBV 28 PASS · `pilot:go-live:gate:local` PASS. Chữ ký khoa = bước còn lại của DOM-08.

## Sign-off

| Vai trò | Họ tên | Ngày | Chữ ký |
|---------|--------|------|--------|
| KSNK pilot lead | | | |
| IT / dev | | | |

## Ghi chú

Form đủ cho pilot BV103; trường NHSN bổ sung theo yêu cầu BV — backlog riêng.

```bash
npm run verify:engineering
npx vitest run src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.spec.ts src/modules/giam-sat-nkbv/lib/nkbv-timeline-math.spec.ts
```
