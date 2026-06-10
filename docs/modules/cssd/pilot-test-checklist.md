# CSSD Quy trình xử lý — Pilot test checklist (P3)

Chạy sau `npm run mdm:migrate:local` (hoặc staging) và `npm run verify:cssd`.

**Phase 3 automated (2026-06-10):** `e2e/cssd-workflow.spec.ts` (shell quy trình + mẻ TK); ledger Q2 unit test; Spaulding specs.

## Ký tay Phase 3 (staging)

| # | Kịch bản | Auto | Manual |
|---|----------|------|--------|
| P3-1 | BOM Digital tại DONG_GOI | verify:cssd | ☐ |
| P3-2 | Spaulding BLOCK mẻ hơi + bộ lẫn nhiệt | batch-heat spec | ☐ |
| P3-3 | CAP_PHAT thiếu BOM → cảnh báo, vẫn cấp (Q2) | ledger spec | ☐ |
| P3-4 | Chu trình 6 trạm end-to-end | E2E shell | ☐ |
| P3-5 | NKBV ↔ CSSD trace | migration 20260602150000 | ☐ |
| P3-6 | Mẻ không đạt → rollback | — | ☐ |

**Pass:** ≥5/6 ☐ · Tester ___ · Ngày ___

## 1. Chu trình 6 trạm (tab Chu trình xử lý)

- [ ] Tiếp nhận từ catalog `CATALOG::` → quét TIEP_NHAN thành công.
- [ ] LAM_SACH → QC → DONG_GOI (BOM bật flag) → mở checklist → đạt.
- [ ] Không quét TIET_KHUAN tại trang 6 trạm (toast lỗi).
- [ ] Mẻ TK đạt → bộ ở CAP_PHAT; danh sách chờ Cấp phát khớp trạm TK (không còn lệch DONG_GOI).
- [ ] Quét CAP_PHAT khi chưa có mẻ / mẻ chưa QC → lỗi (app + RPC).
- [ ] Trả lui 1 bước có lý do; đóng băng / mở khóa thủ công.

## 2. Mẻ tiệt khuẩn

- [ ] Tab `?tab=batch` và `/cssd-erp/batch` cùng flow.
- [ ] Banner Spaulding BLOCK khi bộ lẫn nhạy nhiệt + máy hơi nước.
- [ ] Mẻ không đạt → rollback DONG_GOI + sự cố.

## 3. Kho & truy vết

- [ ] Tab `?tab=kho` — FEFO filter.
- [ ] `?tab=trace&qr=<mã>` — timeline lifecycle.

## 4. NKBV ↔ CSSD

- [ ] Ca SSI: nhập mã QR bộ → lưu checklist → cột `quy_trinh_id` / link «Truy vết CSSD».

## 5. Offline

- [ ] Ngắt mạng, quét trạm → queue → có mạng → đồng bộ.
