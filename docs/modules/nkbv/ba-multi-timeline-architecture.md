# BA — Kiến trúc 3 khối (bảng chung → phân tích → tạo phiếu muộn)

> Hợp đồng UI app pilot. Thuật toán IWP/RIT/SBAP: [`hai-surveillance-domain-ssot-20260804.md`](hai-surveillance-domain-ssot-20260804.md).  
> Legacy lưới 17 hàng: [`ba-cdc-grid-timeline.md`](ba-cdc-grid-timeline.md) (tham chiếu).

## Luồng chuẩn

```
Bảng chung (bằng chứng)
  → chọn 1 bệnh phẩm / CĐHA / TC SSI
  → Bảng phân tích (IWP·DOE·RIT·SBAP·can thiệp)
  → Kết luận + Ghi chú
  → nút Tạo phiếu phân tích → form sẵn có → nkbv_fact_su_kien
```

**Cấm** tạo `nkbv_fact_su_kien` ngay khi chọn Index.

## Khối 1 — Bảng chung (6 hàng)

| # | Hàng | Hành vi |
|---|------|---------|
| 1 | Ngày lịch | Trục cột |
| 2 | Ngày nằm viện (HD) | HD1 = ngày vào viện; trước VV = `—` |
| 3 | XN vi sinh | Nhiều XN / ngày. Mỗi chip: bệnh phẩm · VK · số lượng. Click **từng bệnh phẩm** (không chọn cả ô). Badge `Chưa PT` / `Đã PT` / `Bỏ qua`. |
| 4 | Chẩn đoán hình ảnh | User CRUD: CT / XQ / siêu âm (trong tiêu chuẩn). |
| 5 | TC xác định DOE SSI | User nhập (chảy mủ / mở vết / cấy vết…). |
| 6 | Khoa điều trị | Theo ngày (LOA) |

Không đưa lên bảng chung: triệu chứng LS hội chứng, can thiệp, ghi chú phân tích.

Nguồn: VS ← `nkbv_fact_vi_sinh`; CĐHA + TC SSI ← `nkbv_fact_ba_timeline`; can thiệp chỉ ở khối 2 ← `nkbv_fact_device_registry`.

## Khối 2 — Bảng phân tích (8 hàng)

Mở khi chọn bệnh phẩm / CĐHA / TC SSI. Cùng trục cột ngày với bảng chung.

| # | Hàng | Hành vi |
|---|------|---------|
| 1–2 | Ngày lịch · HD | Đồng bộ bảng chung |
| 3 | Ngày X | Index = ngày XN / CĐHA đã chọn |
| 4 | CĐHA | Lôi CĐHA liên quan hội chứng từ bảng chung; highlight **IWP** |
| 5 | Triệu chứng LS | Highlight IWP; user chọn TC; ngày TC sớm nhất = **DOE** (màu khác) |
| 6 | RIT | Highlight DOE → DOE+13; lôi VS **cùng loại bệnh phẩm** |
| 7 | SBAP | Highlight đầu IWP → cuối RIT; lôi **cấy máu** trong cửa sổ |
| 8 | Can thiệp | Foley / CVC / Vent theo hội chứng (Registry) |

SSI: cửa sổ **SP 30/90** (không giả IWP±3). VAE: Event Period 14d.

### Map bệnh phẩm → hội chứng

| Chọn | Mở |
|------|-----|
| Đờm / ETA / BAL / hô hấp | PNEU (hoặc VAE nếu IP chọn) |
| Nước tiểu | UTI |
| Dịch / mô vết mổ | SSI (SP) |
| Máu | BSI sau cổng Secondary / site |
| CĐHA phổi | PNEU |
| TC SSI | SSI |

## Khối 3 — Kết luận + tạo phiếu muộn

| Hàng | Vai trò |
|------|---------|
| Kết luận | Máy gợi ý (`evaluate*`) + IP chỉnh |
| Ghi chú | Free text phiên |

Nút **Tạo phiếu phân tích trên bệnh án** → form mẫu sẵn có → lưu phiếu.  
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
