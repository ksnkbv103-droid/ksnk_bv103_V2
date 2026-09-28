# 25b — CSSD mẻ: AB-6 QC/tổ trưởng · M-04 · park M-17/25/28 (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Soft-ready | Có — Domain **chốt A** (AB-6 đã PO A×6); park P1 ghi rõ |
| Date | 2026-09-28 (Asia/Saigon) |
| Neo | `18` §2 M-04·M-17·M-25·M-28 · §5 AB-6; `18b`; backlog CSSD-L06 / L11 |
| Mac tip | Offline — verify RBAC tip khi online |
| Không | Reopen 18b A×6; invent CDC mới; checklist mới trên `DONG_GOI` (M-28 OUT) |

## 1) AB-6 — «qc = tổ trưởng» đủ chưa?

| | A — NV/QC nhả thường + **chỉ tổ trưởng** implant/`CHO_BI` (chốt · PO 18b) | B — Chỉ tổ trưởng nhả mọi mẻ | C — Mọi QC = tổ trưởng (gộp role) |
|---|------------------------------------------------------------------------|------------------------------|-----------------------------------|
| | Phân quyền nhả thường cho NV/QC đã grant; nhả implant / `CHO_BI` = role tổ trưởng CSSD | QT23 B5 chữ hẹp | Đồng nhất role QC≡tổ trưởng |
| Đúng neo | 18b AB-6A · 18 §5 | 18 B — tắc ops ca thường | Không có neo; over-constrain |
| Side-effect | Cần 2 gate quyền trên nút Nhả | Hàng chờ tổ trưởng | RBAC lệch MDM |

**Chốt A.** **Không** đủ nếu Soft hiểu «mọi QC nhả = tổ trưởng» — chỉ implant/`CHO_BI`. Loại B/C.

### DoD Soft AB-6
- [ ] Nhả mẻ thường: user có quyền QC/nhả (không bắt tổ trưởng).
- [ ] Nhả implant hoặc mẻ `CHO_BI`: **chỉ** tổ trưởng; user khác → deny + message rõ.
- [ ] Spec: fixture thường pass QC; fixture implant fail non-lead; pass lead.
- [ ] Không đổi AB-1…5 đã PO A.

## 2) M-04 — thin vs catalog chương trình máy

| | A — Thin catalog chương trình **theo máy** (chốt) | B — Free-text thông số không chương trình | C — Full catalog viện / mọi máy dùng chung 1 list |
|---|--------------------------------------------------|-------------------------------------------|--------------------------------------------------|
| | M-04 P0: chọn 1 chương trình cấu hình của máy → điền sẵn chuẩn (M-05) | Gap tip hiện tại (18 §6) | Over-scope MDM |
| Đúng neo | 18 M-04 IN | M-04 OUT | Không bắt buộc neo |
| Soft hiện có | Chưa có trường chương trình — cần thêm mỏng | Regex PP tên máy thôi | Nặng migrate |

**Chốt A (thin).** Loại B. Loại C nếu chưa có evidence «list chung viện».

### DoD Soft M-04
- [x] MDM/máy: danh sách chương trình tối thiểu (mã/tên + thông số chuẩn theo PP máy). — Soft Soft Soft-local thin table + QT21 HD.03 fallback; catalog viện = park
- [x] Tạo phiếu: bắt chọn chương trình (default = gần nhất của máy); không tạo phiếu chỉ free-text.
- [x] Chọn chương trình → prefill nhiệt/áp/thời gian (hoặc tương đương PP); NV sửa khi lệch có audit.
- [x] Không invent số CDC ngoài QT21 HD.03 đã neo trong 18 (tham chiếu có sẵn).

## 3) M-17 / M-25 / M-28 — Soft-ready park?

| ID | Mức | Soft-ready code ngay? | Domain chốt |
|----|-----|----------------------|-------------|
| M-17 | P1 thẩm định máy 3 mẻ trống | **Park** — sau P0 nhả/BI/PP | Ghi hồ sơ máy; không chặn P0 L06 |
| M-25 | P1 lưu hồ sơ ≥5 năm, không xóa cứng | **Park Soft-policy** — retention/archive; không feature UI mới P0 | Soft-ready = policy + cấm hard-delete khi đụng; migrate sau |
| M-28 | P1 Plasma Tyvek/khô ở **danh mục** | **Park** — cấu hình loại/PP; **cấm** checklist mới Đóng gói | Soft-ready park doc; code khi catalog PP ổn |

| | A — Park P1, Soft chỉ harden P0 (chốt) | B — Làm M-17/25/28 cùng P0 nhả | C — Bỏ P1 |
|---|----------------------------------------|----------------------------------|-----------|
| | Khớp 18 mức P1; L11 park | Phình scope L06 | Lệch QT/CDC retention |

**Chốt A.** Soft-ready = **park có DoD**; không fan-out code P1 trước P0 AB harden.

### DoD Soft park (tick khi mở P1)
- [ ] M-17: hồ sơ máy chặn tạo phiếu dụng cụ đến khi 3 mẻ thẩm định đạt (sau lắp/sửa/fail).
- [ ] M-25: không hard-delete phiếu mẻ đã nhả; chỉ bổ sung audit; retention ≥5 năm (policy).
- [ ] M-28: cảnh báo/cấu hình danh mục Plasma — 0 hạng mục mới trên `DONG_GOI`.

## PO blocker
AB-6: **không** (đã A×6). M-04: không. M-17/25/28: không — park P1.
