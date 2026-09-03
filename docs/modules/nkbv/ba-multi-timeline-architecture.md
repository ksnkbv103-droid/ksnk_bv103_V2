# BA — Kiến trúc 3 khối (bảng chung → phân tích → tạo phiếu muộn)

> Hợp đồng UI app pilot. Thuật toán: [`hai-surveillance-domain-ssot-20260827.md`](hai-surveillance-domain-ssot-20260827.md). Quy trình ca: [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md). Tận dụng lưới + mẫu báo cáo: [`hai-timeline-and-diagnostic-report-20260827.md`](hai-timeline-and-diagnostic-report-20260827.md).  
> Legacy lưới 17 hàng: [`ba-cdc-grid-timeline.md`](ba-cdc-grid-timeline.md) (tham chiếu).

## Luồng chuẩn

```
Tạo BA (LIS nếu chưa có mã / copy HIS / gõ) → trên lưới: chọn khoa theo mã + tích Foley/máy/CVC
  → copy LIS + CĐHA/TC SSI
  → chọn 1 bệnh phẩm / CĐHA / TC SSI
  → Bảng phân tích (IWP hoặc SP hoặc Event Period)
  → Kết luận + Ghi chú
  → nút Tạo phiếu phân tích → form sẵn có (khoa/dụng cụ lấy từ lưới) → nkbv_fact_su_kien
```

**Cấm** tạo `nkbv_fact_su_kien` ngay khi chọn Index.

### Chế độ phân tích (toggle trên cùng bảng)

| Chế độ | Hành vi |
|--------|---------|
| **Theo CDC** (mặc định) | Disposition Index + gợi ý KL (`evaluate*` / smart summary) như hiện tại |
| **Tự phân tích** | Giữ nhập liệu + highlight cửa sổ; **không** auto gắn XN / Secondary / progressive KL — IP tự gõ KL sự kiện + từng mẫu; Tạo phiếu khi đã có KL |

Đổi chế độ → đóng phiên đang mở. Nháp phiên localStorage tách key theo mode (`…:CDC` / `…:MANUAL`).

## Khối 1 — Bảng chung (lưới đang chạy)

Lưới **dọc**: **hàng = ngày lịch**, cột dính trái **Date** (ngày dương lịch) và **HD** (ngày nằm viện, HD1 = vào viện; trước vào viện = `—`). Khung mặc định: **2 ngày trước vào viện** → ra viện hoặc hôm nay.

| Cột | Việc |
|-----|------|
| Date | Trục ngày lịch |
| HD | Số ngày nằm viện |
| XN | Nhiều chip / ngày; bấm từng bệnh phẩm; badge chưa PT / đã PT / bỏ qua |
| CĐHA | Tick XQ/CT phổi hoặc áp xe (SSI) |
| TC SSI | Ngày mổ + tiêu chuẩn vết mổ |
| *(khi đang phân tích)* | Index X · IWP·LS · RIT · SBAP — cùng hàng ngày |
| Khoa | Chọn **danh sách khoa theo mã** (không gõ tự do); lưu bệnh án; đổi/xóa → phiếu theo |
| CVC / Vent / Foley | Tick theo ngày (lưu mốc BA) |
| Kết luận / Ghi chú | Sau khi chọn Index |

Triệu chứng hội chứng (sốt, đau…) nhập ở cột **IWP · LS** khi đã chọn Ngày X — ghi vào bệnh án, không nằm cột bảng chung lúc chưa chọn.

Nguồn: XN ← kho vi sinh; CĐHA + TC SSI + tick dụng cụ ← bảng mốc BA; HD ← ngày vào viện trên hồ sơ.

## Khối 2 — Cột phân tích (cùng hàng ngày, không bảng khác)

Mở khi chọn bệnh phẩm / CĐHA / TC SSI. **Cùng hàng Date/HD** với bảng chung.

| Cột | Việc |
|-----|------|
| Index X | Ngày X = ngày XN / CĐHA / TC đã chọn |
| IWP · LS | Tô ±3 ngày (hoặc SP SSI / 14 ngày VAE); nhập triệu chứng; ngày TC sớm nhất = ngày sự kiện (DOE) |
| RIT | Tô từ ngày sự kiện → +13 ngày; gom XN cùng loại + CĐHA — không mở ca mới cùng loại |
| SBAP | Tô khung cấy máu; badge trùng vi khuẩn → nhiễm khuẩn huyết thứ phát |

Foley / CVC / Vent **đã nằm bảng chung** (không tách hàng riêng khối 2).

SSI: cửa sổ **30/90 ngày từ ngày mổ** (không giả ±3). VAE: 14 ngày từ ngày xấu đi.

### Map bệnh phẩm → hội chứng

| Chọn | Mở |
|------|-----|
| Đờm / ETA / BAL / hô hấp | VAE nếu người lớn + thở máy eligible; không thì PNEU — **không** mặc định VAP |
| Nước tiểu | UTI |
| Dịch/mô tiết niệu không phải nước tiểu | USI (Ch.17; app chưa) |
| Dịch / mô vết mổ | SSI (SP) |
| Máu | Secondary **trước** BSI/CLABSI |
| CĐHA phổi | PNEU (hoặc bổ sung VAE nếu đang vent) |
| TC SSI | SSI |
| Dịch/mô site khác | Ch.17 |

## Khối 3 — Kết luận + tạo phiếu muộn

| Hàng | Vai trò |
|------|---------|
| Kết luận | **CDC:** máy gợi ý (`evaluate*`) + IP chỉnh. **Tự phân tích:** chỉ chữ IP gõ |
| Ghi chú | Free text phiên |

Nút **Tạo phiếu phân tích trên bệnh án** → form mẫu sẵn có → lưu phiếu.  
**Tự phân tích:** nút mở khi đã nhập KL sự kiện (không bắt buộc đủ TC CDC).  
Nút **Bỏ qua** (có lý do) → XN ra khỏi hàng đợi, không tạo HAI.

## Hàng đợi XN (+) chưa phân tích

Đơn vị: một dòng `nkbv_fact_vi_sinh` dương tính.

| Trạng thái | Khi nào |
|------------|---------|
| CHUA_PHAN_TICH | (+) chưa có phiếu/`BO_QUA` gắn `index_vi_sinh_id` |
| DA_PHAN_TICH | Đã tạo phiếu Index = XN **hoặc** bỏ qua có lý do |
| DANG_PHAN_TICH | UI: đang mở bảng phân tích trên XN (không bắt buộc DB) |

UI: badge chip VS · số trên BA · bộ lọc “BA còn XN (+) chưa PT”.  
Không spawn phiếu Day-3 tự động.

## Cửa sổ thời gian (nhắc)

| Hội chứng | Cửa sổ |
|-----------|--------|
| PNEU / UTI / BSI | IWP = Index±3 → DOE → RIT 14d → SBAP = `[Index−3, DOE+13]` |
| SSI | SP 30/90; SBAP 17d `[DOE−3, DOE+13]` |
| VAE | Event Period 14d từ DOE |

## Runtime (path chính)

| Việc | Path |
|------|------|
| Workspace | `NkbvBaMultiTimelineWorkspace.tsx` |
| Grid / HD / split | `nkbv-ba-grid-engine.ts` |
| Trạng thái XN | `nkbv-vi-sinh-analysis-status.ts` + verification_data |
| Map bệnh phẩm | `nkbv-specimen-syndrome.ts` |
| Verdict | `nkbv-*-timeline-verdict.ts` → `nkbv-rules-engine.ts` |
| Tạo phiếu muộn | sau kết luận — không `ensureNkbvBaAnalysisCase` lúc chọn Index |
| Audit PNEU chuẩn vs runtime (PO) | [`investigation-forms/pneu-standard-vs-runtime-audit-20260810.md`](investigation-forms/pneu-standard-vs-runtime-audit-20260810.md) |
