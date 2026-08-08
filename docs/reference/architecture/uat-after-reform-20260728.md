# UAT vận hành sau cải tổ đẳng cấp (2026-07-28)

> Sóng 3 chương trình cải tổ — checklist tay cho khoa + KSNK. Engineering không ký hộ lâm sàng.  
> **Gói điều phối (persona · lịch · bảng ký):** [`../reports/uat-coordination-pack-20260805.md`](../reports/uat-coordination-pack-20260805.md).

## A. Cửa vào (sau Sóng 1)

| # | Làm gì | Kỳ vọng |
|---|--------|---------|
| A1 | Sidebar → chỉ thấy «Giám sát» (không còn 3 mục VST/GSC/NKBV ngang hàng; QR vào từ hub) | Vào hub → chọn loại nhập |
| A2 | Từ hub: Bước 1 GSC + Bước 2 Lịch sử GSC | Form / lịch sử mở đúng |
| A3 | Hub → «Lịch sử / danh sách NKBV» (`?tab=cases`) | Tab danh sách ca |
| A4 | Sidebar CSSD: **Vận hành** (Quy trình / Sự cố) vs **Tra cứu** (DC/TB/HC) | ≤2 click; không ModeNav trùng trên hero |
| A5 | Catalog CSSD banner «Sửa master → Quản trị» | Không nhầm sửa dụng cụ tại CSSD RO |

## B. QR danh mục (sau Sóng 0–2)

| # | Làm gì | Kỳ vọng |
|---|--------|---------|
| B1 | Quản trị → Bộ dụng cụ | Cột mã hiện **ảnh QR** + nút **In QR** |
| B2 | In tem bộ → Quét `/qr` | Mở truy vết CSSD đúng bộ |
| B3 | Catalog CSSD bộ | Thumb QR luôn + In QR; notice tem vĩnh viễn vs chu trình |
| B4 | Quản trị → Thiết bị / Khoa | Thumb QR + in tem |

## C. CSSD end-to-end (3 kịch bản)

| # | Luồng | Kỳ vọng |
|---|-------|---------|
| C1 | Nhận → Làm sạch → QC → Đóng gói | Đủ 4 trạm; quét `ma_bo` OK |
| C2 | Đóng gói → Mẻ TK → Quét LOT / bộ vào phiếu → Bắt đầu TK | Tem chu trình in túi hấp (khác tem bộ) |
| C3 | Kết thúc mẻ → Cấp phát | Soft-warning BOM nếu thiếu; không hard-block |

## D. NKBV lâm sàng

Chạy đúng bảng trong [`pilot-clinical-checklist-20260603.md`](../../modules/nkbv/pilot-clinical-checklist-20260603.md) (#2–#5 tay). Cột UAT khoa vẫn trống cho đến khi khoa ký.

## F. Thống kê mô tả — baseline BI (2026-07-29)

> Bổ sung cho chương trình [`descriptive-analytics-roadmap-20260729.md`](../../modules/dashboard/descriptive-analytics-roadmap-20260729.md). Không thay §A–D.

| # | Làm gì | Kỳ vọng |
|---|--------|---------|
| F1 | Mở `/` (Tổng quan) — lọc kỳ có dữ liệu | 4 trụ: mỗi trụ có số + câu mô tả + CTA chuyên sâu |
| F2 | Mở `/bao-cao-tong-hop` — In A4 | KPI/CCS + phụ lục CSSD; Phần III có draft gợi ý (sau Pha 2) hoặc ô nhận xét |
| F3 | `/thong-ke/gsc` — xếp hạng bao phủ TGS | Ô Đã / Thiếu / Không áp dụng; từ Thiếu có đường sang QLCV (sau Pha 3) |
| F4 | `/cssd-erp/report` | Sản lượng / sự cố; nhãn «Tỷ lệ quy trình không sự cố» — không gọi CCS |
| F5 | `/quan-tri-he-thong` — tab/panel sức khỏe (sau Pha 5) | Đếm Auth chưa link / master lệch + deep-link sửa |

## E. Go-live gate (kỹ thuật)

```bash
# Local
npm run pilot:go-live:gate:local

# Linked / staging (khi sẵn sàng ký)
npm run pilot:go-live:gate
```

Sign-off formal: [`pilot-go-live-signoff-202606.md`](../../core/pilot-go-live-signoff-202606.md).
