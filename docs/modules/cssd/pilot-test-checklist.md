# CSSD Quy trình xử lý — Pilot test checklist (P3)

Chạy sau `npm run mdm:migrate:local` (hoặc staging) và `npm run verify:cssd`.

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
