# BA — Kiến trúc 3 khối (bảng chung → phân tích → tạo phiếu muộn)

> Hợp đồng UI app pilot. Thuật toán: [`hai-surveillance-domain-ssot-20260827.md`](hai-surveillance-domain-ssot-20260827.md). Quy trình ca: [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md). Tận dụng lưới + mẫu báo cáo: [`hai-timeline-and-diagnostic-report-20260827.md`](hai-timeline-and-diagnostic-report-20260827.md).  
> Legacy lưới 17 hàng: mục **Hợp đồng hàng lưới** trong file này.

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
| Workspace | `NkbvBaMultiTimelineWorkspace.tsx` (+ chrome tách: `NkbvBaWorkspaceToolbar` / `SessionChips` / `BoundDayGrid`; types `nkbv-ba-workspace.types.ts`) |
| Grid / HD / split | `nkbv-ba-grid-engine.ts` |
| Trạng thái XN | `nkbv-vi-sinh-analysis-status.ts` + verification_data |
| Map bệnh phẩm | `nkbv-specimen-syndrome.ts` |
| Verdict | `nkbv-*-timeline-verdict.ts` → `nkbv-rules-engine.ts` |
| Tạo phiếu muộn | sau kết luận — không `ensureNkbvBaAnalysisCase` lúc chọn Index |
| Audit PNEU chuẩn vs runtime (PO, kho) | [`../../archive/module-history/nkbv/investigation-forms/pneu-standard-vs-runtime-audit-20260810.md`](../../archive/module-history/nkbv/investigation-forms/pneu-standard-vs-runtime-audit-20260810.md) |

---

## Vai trò BA / Phiếu / Form

Workspace 3 khối: [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md).  
Domain: [`hai-surveillance-domain-ssot-20260827.md`](hai-surveillance-domain-ssot-20260827.md) (Phụ lục E). Quy trình ca: [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md).

## 1. Hồ sơ bệnh án = đợt nằm viện — trung tâm bằng chứng

| | |
|--|--|
| **Là gì** | Một lần nhập viện (`ma_benh_an` ≈ AdmissionID) |
| **Bảng** | `nkbv_fact_benh_an` + `nkbv_fact_vi_sinh` + `nkbv_fact_ba_timeline` + `nkbv_fact_ba_ngay_khoa` + `nkbv_fact_ba_ngay_dung_cu` |
| **UI** | Hub BA = lưới ngày (Date, HD, XN, CĐHA, TC SSI, Khoa chọn theo mã, CVC/Vent/Foley) |
| **Không phải** | Một nhiễm khuẩn; không tick LCBI/CAUTI trên form ADT; **không** nhập lại khoa/dụng cụ trên phiếu nếu đã có trên lưới |

## 2. Kho vi sinh = dữ liệu thô (không điều tra)

| | |
|--|--|
| **Bảng** | `nkbv_fact_vi_sinh` |
| **UI** | Tab vi sinh (nạp) · hàng VS trên bảng chung (chip + badge chưa/đã PT) |
| **Không** | Tự spawn phiếu HAI khi import |

## 3. Phiên phân tích (bảng phân tích) — chưa phải phiếu

| | |
|--|--|
| **Là gì** | View IWP/DOE/RIT/SBAP + kết luận nháp sau khi chọn 1 bệnh phẩm / CĐHA / TC SSI |
| **Lưu** | State UI (không tạo `nkbv_fact_su_kien`) |
| **Xong** | Nút **Tạo phiếu** hoặc **Bỏ qua** |

## 4. Phiếu sự kiện = HAI đã đóng vòng phân tích

| | |
|--|--|
| **Bảng** | `nkbv_fact_su_kien` + `verification_data` (gồm `index_vi_sinh_id`, disposition) |
| **Khi tạo** | **Sau** kết luận trên bảng phân tích — không lúc chọn Index |
| **UI** | Form mẫu sẵn có · danh sách phiếu = kho tra cứu |

## 5. Form mẫu

Form tiêu chuẩn (BSI/UTI/VAE/PNEU/SSI) mở khi IP bấm **Tạo phiếu** — khoa và Foley/máy/CVC **lấy từ lưới bệnh án**. Không nhập lại trên form. Sửa trên lưới → phiếu theo.

## 6. In phiếu / báo cáo gửi khoa

Hai bản in hiện có: `NkbvCasePrintView` (mục) · `NkbvBaGridCasePrintView` (văn bản).  
Mẫu gửi khoa (dải ngày + lời tiếng Việt): [`hai-timeline-and-diagnostic-report-20260827.md`](hai-timeline-and-diagnostic-report-20260827.md) §3–§5.

## Luồng chuẩn

```
Tạo BA (LIS nếu chưa có mã / copy HIS / gõ) → trên lưới: khoa theo mã + tích Foley/máy/CVC + CĐHA/TC SSI
  → chọn 1 bệnh phẩm (hoặc CĐHA / TC SSI)
  → bảng phân tích → kết luận
  → Tạo phiếu (hoặc Bỏ qua) — phiếu đọc khoa/dụng cụ từ bệnh án; sửa lưới thì phiếu theo
  → thẩm định / in
```

## Nhãn UI

- **Hồ sơ đợt nằm viện** = BA / bảng chung  
- **Cổng vi sinh** = nạp thô  
- **Bảng phân tích** = phiên theo Index  
- **Phiếu xác định ca NKBV** = chỉ sau nút Tạo phiếu


---

## Nguồn dữ liệu và trình tự CDC

> SSOT vận hành. Chi tiết hàng lưới: mục **Hợp đồng hàng lưới** trong file này.  
> Vai trò BA/phiếu: mục **Vai trò BA / Phiếu / Form** trong file này.  
> Quy trình ca + dữ liệu: [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md).

## 1. Nguyên tắc

1. **Bệnh án** = trung tâm bằng chứng (lưới ngày: khoa, Foley/máy/CVC, triệu chứng, CĐHA).
2. **Cổng vi sinh** chỉ nạp thô — không chốt HAI, không spawn phiếu Day-3.
3. Làm việc theo **3 khối**: bảng chung → bảng phân tích → **mới** tạo phiếu.
4. Chọn **từng bệnh phẩm** (chip XN), không chọn cả ô ngày.
5. XN (+) chưa đóng vòng → hàng đợi / badge `Chưa PT`.

## 2. UI trên 1 BA

| Khối | Nội dung |
|------|----------|
| **Bảng chung** | 6 hàng: ngày lịch · HD · VS (đa chip) · CĐHA · TC DOE SSI · khoa |
| **Bảng phân tích** | Mở khi chọn Index: ngày X · CĐHA (IWP) · TC LS (DOE) · RIT · SBAP · can thiệp |
| **Kết luận** | 2 hàng + nút Tạo phiếu / Bỏ qua |
| **Danh sách phiếu** | Kho phụ sau khi đã tạo phiếu |

## 3. Trình tự CDC

Chi tiết: [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md) §4–§5.

| Bước | Việc |
|------|------|
| 0 | Tạo/mở BA + copy LIS + trên lưới: CĐHA, TC SSI, **chọn khoa theo mã**, **tích** Foley/máy/CVC |
| 1 | Chọn 1 bệnh phẩm / CĐHA / TC SSI |
| 2 | Đặt cửa sổ đúng protocol (IWP / SP SSI / Event Period VAE) |
| 3 | Máu: Secondary **trước** LCBI/CLABSI. Hô hấp + máy: VAE không mặc định VAP |
| 4 | DOE → POA/HAI → LOA → dụng cụ → RIT/SBAP |
| 5 | Kết luận nháp → Tạo phiếu hoặc Bỏ qua |

## 4. Nguồn dữ liệu

**Không API HIS/LIS.** Chi tiết: [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md) §2.

| Nguồn | Cách | Bảng |
|-------|------|------|
| LIS | Copy bảng / Excel | `nkbv_fact_vi_sinh` |
| BA / ADT | Copy file hoặc gõ | `nkbv_fact_benh_an` |
| CĐHA / TC SSI / khoa ngày | Lưới (khoa = danh sách mã) | `nkbv_fact_ba_timeline` |
| CVC / Foley / vent | **Tích từng ngày trên lưới** (không sổ đặt–rút tay) | Bệnh án; sổ dụng cụ nếu còn thì **suy từ ô tích** |
| Sự kiện đã tạo phiếu | Nút Tạo phiếu | `nkbv_fact_su_kien` |

## 5. Luồng chuẩn

```
Tạo BA (LIS nếu chưa có mã / copy HIS / gõ) → trên lưới: chọn khoa + tích Foley/máy/CVC + CĐHA/TC
  → chọn 1 bệnh phẩm → bảng phân tích (Secondary trước CLABSI) → kết luận
  → Tạo phiếu hoặc Bỏ qua (phiếu đọc khoa/dụng cụ từ lưới; sửa lưới thì phiếu theo)
```


---

## Hợp đồng hàng lưới (tham chiếu)

> **SSOT UI hiện hành (Wave 1 multi-timeline):** [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md).  
> Tài liệu này giữ hợp đồng hàng IWP / Index−7/+14 cho bảng phân tích hội chứng kiểu Chương 2.

## 1. Multi-timeline (tóm tắt)

1. **Bảng chung:** ngày lịch · HD · XN vi sinh (+) · CĐHA · khoa — luôn hiện.
2. **Bảng phân tích** chỉ mở khi chọn bệnh phẩm tương ứng (PNEU / UTI / BSI / VAE / SSI).
3. PNEU/UTI/BSI dùng **IWP ±3**; VAE dùng Event Period; SSI dùng SP 30/90 — **không** tô IWP giả.
4. Cấy máu: vai trò kép (PNU2 / Secondary S1·S2 / Primary BSI) — xem architecture §4.

## 2. Cột ngày (bảng phân tích đã mở)

Neo **Index**: trước **7** ngày · sau **14** ngày.

## 3. Hàng bảng IWP (PNEU / UTI / Primary BSI)

| Hàng | Ghi chú |
|------|---------|
| Index / Ngày X | XN hoặc CĐHA |
| IWP | Index ±3 |
| Triệu chứng LS | Catalog theo hội chứng |
| Lab / máu (PNEU) | Máu (+) ∈ IWP có thể gắn PNU2 |
| Can thiệp | Vent / Foley / CVC |
| NSK · RIT · SBAP | DOE → RIT 14d · SBAP |
| Kết luận · In phiếu văn bản | `NkbvBaGridCasePrintView` |

## 4. Runtime

| Việc | File |
|------|------|
| Architecture | `ba-multi-timeline-architecture.md` |
| Workspace | `NkbvBaMultiTimelineWorkspace.tsx` |
| Specimen map | `nkbv-specimen-syndrome.ts` |
| Secondary BSI | `nkbv-secondary-bsi-gate.ts` |
| IWP engine (shared math) | `nkbv-ba-grid-engine.ts` |
