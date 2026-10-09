# 25c — QLCV P1: Q-14 · AB-2 duyệt cuối · NGHIEM_THU vs DINH_KY (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Soft-ready | Có — Domain **chốt A** gói Soft-safe |
| Date | 2026-09-28 (Asia/Saigon) |
| Neo | Backlog QLCV-L04/L05/L06; `19` Q-06·Q-14·AB-2; `19b` S-06; `19d`; `24` (không đụng lại gate Chờ tôi) |
| Không | Thêm cột `nguoi_duyet_id`; ép FE nghiệm thu định kỳ; reopen 24 |

## Vấn đề
Soft ask park: báo cáo kỳ Q-14 · cột «duyệt cuối» · harden SQL `NGHIEM_THU` khi `DINH_KY`. Cần một gói Soft-safe không phá tối giản 19b/19d.

## Phương án gói

| Mục | A — Soft-safe (chốt) | B | C |
|-----|----------------------|---|---|
| **Q-14** | MVP 3 chỉ số board tạm; **park** RPC/aggregate kỳ (tuần/tháng) sau UAT gói A | Bắt RPC kỳ ngay | Chỉ Kanban cảm tính mãi |
| **AB-2 UI** | **Không** cột DB; optional cột list derive từ `nhat_ky` APPROVE = **P1 park** | Thêm `nguoi_duyet_id` lúc giao | Bắt cột Điều hành ngay chặn L01 |
| **NGHIEM_THU × DINH_KY** | Harden `fn_qlcv_transition`: từ chối `NGHIEM_THU` nếu `loai_cong_viec=DINH_KY`; định kỳ @100% → `HOAN_THANH` (Q-06) | Chỉ tin FE chặn | Cho nghiệm thu định kỳ |

### Critique nhanh
| Tiêu chí | Q-14 A | AB-2 A | NT A |
|----------|--------|--------|------|
| Đúng Lock/neo | 19b xếp sau MVP; L04 P1 | 19 AB-2A | Q-06 + L06 |
| Khớp Soft | W6/19d ưu tiên form sạch | Không migrate cột | FE đã chặn — SQL dual-path |
| Ít side-effect | Không UI báo cáo nặng sớm | Không lệch AB-2A | Chặn admin bypass RPC |
| Kiểm chứng | Số kỳ ≠ board ≤500 khi mở P1 | Sau NT thấy tên từ nhật ký | RPC thẳng → error |

**Chốt A cả ba.** Loại Q-14-B (chặn tối giản). Loại AB-2-B (cột DB). Loại NT-B (chỉ FE).

## DoD Soft

### Q-14 (park — mở sau UAT A)
- [ ] Không bắt Soft FE báo cáo kỳ trong lát P0.
- [ ] Khi mở: aggregate kỳ theo người · TT · quá hạn · đúng hạn; nguồn fact/view — không chỉ slice board đã tải.
- [ ] Spec: số kỳ ≠ đếm client ≤500.

### AB-2 duyệt cuối (park UI optional)
- [ ] **Cấm** migration thêm `nguoi_duyet_id`.
- [ ] Optional: list/detail derive «Người duyệt cuối» = actor APPROVE/`NGHIEM_THU` mới nhất trong `nhat_ky`.
- [ ] Spec: sau nghiệm thu thấy tên; việc chưa duyệt → trống/«—».

### NGHIEM_THU vs DINH_KY (Soft-safe **làm khi W4/migrate**)
- [ ] `fn_qlcv_transition`: `DINH_KY` + action `NGHIEM_THU` → error rõ.
- [ ] `DINH_KY` + checklist 100% → `HOAN_THANH` (không `CHO_DUYET`).
- [ ] `DOT_XUAT`/`KHAN_CAP` giữ cổng nghiệm thu như 19.
- [ ] Spec: gọi RPC thẳng DINH_KY+NGHIEM_THU fail; DOT@100 → CHO_DUYET.

## PO blocker
Q-14 / AB-2 cột Điều hành: **park** — PO chỉ nếu bắt Soft FE ngay (Domain khuyến nghị không). NGHIEM_THU SQL: **không** PO — confirm lúc apply migrate.
