# Quyết định nghiệp vụ — CAP_PHAT soft-warning (W2) — 2026-07-22

> Đóng todo «quyết định soft-warning vs hard-block cấp phát».  
> SSOT kỹ thuật đã chốt soft-warning từ 2026-07-01 ([implementation-mapping](../../core/implementation-mapping.md)).

## Quyết định

**Giữ soft-warning** khi cấp phát bộ còn thiếu cấu phần (P3-3):

- Hệ thống **vẫn cho cấp phát**.
- Bắt buộc có toast cảnh báo + lifecycle `CAP_PHAT_BO_THIEU_CAU_PHAN` + badge trên tem giao.
- **Không** hard-block theo `bom_kiem_dem_at` trong pilot W2.

## Lý do (nghiệp vụ)

1. Khoa phòng mổ đôi khi cần nhận bộ kèm ghi nhận thiếu để bổ sung tại chỗ — hard-block làm tắc luồng cấp cứu.
2. Soft-warning + lifecycle cho phép đo KPI «tỉ lệ giao thiếu cấu phần» và cải tiến dần.
3. Hard-block đã được thử trong remediation cũ rồi **đảo lại** (mapping 2026-07-01) — không đổi lại mà không có workshop riêng.

## Điều kiện vận hành (bắt buộc trước ký P3)

| # | Điều kiện | Ai |
|---|-----------|----|
| T1 | NV CSSD đọc P3-3 và biết toast ⚠ ≠ lỗi chặn | Tổ CSSD |
| T2 | Khi thấy cảnh báo: ghi nhận / báo sự cố Hỏng-Mất-Bổ sung nếu cần | Tổ CSSD |
| T3 | Trưởng KSNK theo dõi KPI lifecycle `CAP_PHAT_BO_THIEU_*` tuần đầu W2 | KSNK |
| T4 | Nếu KPI tăng bất thường → mở `/intake-nv` xem xét hard-block (chat riêng) | PO + KSNK |

## Hard-block (tương lai — ngoài scope hiện tại)

Chỉ mở lại khi có intake riêng với:

- Flag env (vd. `CSSD_CAP_PHAT_HARD_BLOCK=1`) để staging thử trước prod.
- Training lại OR + CSSD.
- Exit: ≥1 tuần staging không tắc cấp cứu giả lập.

## Tham chiếu

- Checklist: [`pilot-test-checklist.md`](./pilot-test-checklist.md) P3-3 + mục Training
- Reform: [`reform-plan.md`](./reform-plan.md) Q2
- Debt: D-01 Done (soft-warning) trong `debt-register.md`
