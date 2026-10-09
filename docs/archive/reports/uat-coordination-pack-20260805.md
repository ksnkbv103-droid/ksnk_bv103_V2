# Gói điều phối UAT — Reform + NKBV (2026-08-05)

> **R1** chương trình tổng rà soát. Engineering **không ký hộ** khoa / KSNK.  
> Mục tiêu: một trang điều phối — ai làm gì, checklist nào, khi nào coi là xong.

---

## Persona & trách nhiệm

| Persona | Việc chính | Checklist |
|---------|------------|-----------|
| Giám sát viên khoa | Mở phiên VST/GSC từ hub; quét LOC nếu có | Reform **A1–A3** |
| Nhân viên CSSD | Luồng 6 trạm + mẻ + cấp phát soft-warning | Reform **A4–A5 · B · C1–C3** |
| Khoa lâm sàng NKBV | Điền form → gửi duyệt (#2) | NKBV **#2** (+ delta W1/W2 nếu có dữ liệu) |
| KSNK pilot lead | Thẩm định ca (#3); SSI↔CSSD (#5); ký sign-off | NKBV **#3–#5**; Reform **D · F** |
| IT / dev | Gate kỹ thuật khi Docker lên; hỗ trợ tài khoản | Reform **E** · `pilot:go-live:gate:local` |

---

## Lịch chạy đề xuất (1 buổi × 2–3 giờ)

| Slot | Ai | Việc |
|------|----|------|
| 0–20' | Cả nhóm | Đăng nhập đúng role; mở hub Giám sát |
| 20–50' | GS viên + CSSD | Reform A → B → C (3 kịch bản E2E) |
| 50–90' | Khoa + KSNK | NKBV #2 → #3 → #4 → #5 trên dữ liệu pilot |
| 90–110' | Lãnh đạo KSNK | Reform F1–F5 (Tổng quan / BCTH / thống kê) |
| 110–120' | Pilot lead | Điền bảng Sign-off bên dưới + ghi fail (nếu có) |

---

## Ma trận trạng thái (điền tay)

### Reform — [`../architecture/uat-after-reform-20260728.md`](../architecture/uat-after-reform-20260728.md)

| Nhóm | Mục | PASS? | Người ký | Ngày | Ghi chú fail |
|------|-----|:-----:|----------|------|--------------|
| A Cửa vào | A1–A5 | ☐ | | | |
| B QR danh mục | B1–B4 | ☐ | | | |
| C CSSD E2E | C1–C3 | ☐ | | | |
| D NKBV | trỏ checklist lâm sàng | ☐ | | | |
| F Thống kê | F1–F5 | ☐ | | | |
| E Gate kỹ thuật | `pilot:go-live:gate:local` | ☐ | IT | | |

### NKBV lâm sàng — tối thiểu #2–#5

Nguồn đầy đủ: [`../../modules/nkbv/pilot-clinical-checklist-20260603.md`](../../modules/nkbv/pilot-clinical-checklist-20260603.md).

| # | Kịch bản | PASS? | Người ký | Ngày |
|---|----------|:-----:|----------|------|
| 2 | Khoa điền form → `CHO_DUYET` | ☐ | | |
| 3 | KSNK phê duyệt / loại trừ | ☐ | | |
| 4 | Import trùng mã XN | ☐ | | |
| 5 | SSI ↔ CSSD trace | ☐ | | |

---

## Ba case kiểm tay nhanh (smoke trước buổi chính)

1. **Hub → GSC:** Sidebar «Giám sát» → Bước 1 GSC → chọn khoa/khu → lưu nháp không lỗi.  
2. **CSSD soft-warning:** Cấp phát bộ thiếu cấu phần → thấy cảnh báo, **không** bị chặn cứng.  
3. **NKBV duyệt:** Một ca `CHO_XAC_MINH` → khoa gửi → KSNK đổi trạng thái.

---

## Sign-off tổng (copy vào biên bản họp)

| Vai trò | Họ tên | Ngày | Chữ ký / xác nhận |
|---------|--------|------|-------------------|
| KSNK pilot lead | | | |
| Đại diện khoa lâm sàng | | | |
| Đại diện CSSD | | | |
| IT / dev | | | |

**Định nghĩa xong R1:** bảng Reform A–C + F và NKBV #2–#5 đều có dấu PASS + chữ ký; fail được ghi ticket `/intake-nv` riêng (không sửa lan trong buổi UAT).

---

## Liên kết

- Báo cáo tổng: [`full-system-audit-po-20260805.md`](./full-system-audit-po-20260805.md)  
- Open backlog: [`../architecture/open-backlog-20260731.md`](../architecture/open-backlog-20260731.md) · ID `UAT-NKBV` · `UAT-REFORM`
