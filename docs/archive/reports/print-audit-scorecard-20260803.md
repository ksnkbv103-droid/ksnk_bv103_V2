# Scorecard rà soát bản in BV103 — 2026-08-03

> **Chỉ báo cáo** — không sửa code trong đợt này.  
> Phương pháp: đọc code khung in + từng mẫu; đối chiếu CSS A4 chung. Chưa in thử PDF trên máy in thật (ghi rõ ở mục cần xác nhận tay).

## Tóm tắt cho PO

Hệ thống đã có **khung phiếu A4 dùng chung** (`PrintLayout` + Times New Roman + Quốc hiệu) và **quy ước tên file** `{LOAI}_{MA}` cho hầu hết phiếu hành chính — nền tảng ổn.

Điểm cần chú ý:

1. **Tem QR vị trí khoa/khu** gần như chắc **in ra trang trống** (không nằm trong vùng `#print-area` mà CSS chỉ cho hiện vùng đó).
2. **Báo cáo tổng hợp** dùng bộ lề/màu **khác** phiếu giám sát/CSSD → nhìn “không cùng form viện”.
3. Một số phiếu (VST nhiều người, GSC nhiều tiêu chí, kế hoạch QLCV) có rủi ro **ngắt trang / bảng dày** khi dữ liệu dài — cần in thử với dữ liệu thật.

---

## Chuẩn đánh giá (6 mục)

| Mã | Mục | Ý nghĩa nghiệp vụ |
|----|-----|-------------------|
| K | Khung trang | A4 dọc, lề đủ, không “lơ lửng” giữa trang |
| H | Header hành chính | BVQY 103 · Khoa · Quốc hiệu cân đối |
| N | Nội dung | Trường/bảng rõ, không chồng, không tràn lề |
| P | Ngắt trang | Chữ ký/QR/tiêu đề không cắt giữa chừng |
| C | Chữ ký + QR | Đủ chỗ ký; QR không đè nội dung |
| F | Tên file PDF | `{LOAI}_{MA}` khi Lưu PDF |

Điểm: **Đạt** · **Lệch** · **Lỗi** · **Chưa kiểm được** (cần dữ liệu/máy in thật).

---

## Kiến trúc in hiện tại

| Nhóm | Cơ chế | Lề / khổ | Tên file |
|------|--------|----------|----------|
| Phiếu A4 (VST, GSC, CSSD, sự cố, QLCV) | `#print-area` qua [`PrintLayout.tsx`](../../../src/components/shared/PrintLayout.tsx) + [`globals.css`](../../../src/app/globals.css) | A4, `12mm 10mm 12mm 12mm` | `fileTitle` → `beforeprint` đổi `document.title` |
| Báo cáo tổng hợp | HTML iframe riêng [`bao-cao-tong-hop-print*.ts`](../../../src/modules/dashboard/lib/bao-cao-tong-hop-print.ts) | A4, `18mm 15mm 22mm 18mm`, accent xanh | `<title>` = `BAOCAO_…` |
| Tem nhiệt bộ/máy/chu trình | Popup HTML [`usePrint.ts`](../../../src/hooks/usePrint.ts) | **80mm** (không phải A4) | `title` = mã QR thô |
| Tem QR vị trí | `window.print()` từ [`LocationQrPrintButton.tsx`](../../../src/components/shared/LocationQrPrintButton.tsx) | Không khung A4 chuẩn | Không `fileTitle` |

**Quy ước LOAI đã có** ([`print-file-title.ts`](../../../src/lib/print/print-file-title.ts)): `LSGS`, `ME`, `CP`, `SUCO`, `CV`, `KHCV`, `TTCV`, `BAOCAO`.

---

## Inventory mẫu

| Ưu tiên | Mẫu | File chính | LOAI |
|---------|-----|------------|------|
| P0 | Phiếu VST | `VSTPrintView.tsx` (+ `VSTPrintPersonBlocks`) | `LSGS` |
| P0 | Phiếu GSC | `GiamSatChungPrintView.tsx` (+ criteria section) | `LSGS` |
| P0 | Phiếu mẻ TK | `CssdBatchPrintView.tsx` | `ME` |
| P0 | Phiếu cấp phát | `CssdCapPhatPrintView.tsx` (+ QR strip) | `CP` |
| P0 | Biên bản sự cố | `IncidentPrintView.tsx` | `SUCO` |
| P1 | Phiếu công việc | `QlcvTaskPrintView.tsx` | `CV` |
| P1 | Kế hoạch định kỳ | `QlcvPeriodPlanPrintView.tsx` | `KHCV` |
| P1 | Thực thi kỳ | `QlcvPeriodExecPrintView.tsx` | `TTCV` |
| P1 | Báo cáo tổng hợp | `bao-cao-tong-hop-print*.ts` | `BAOCAO` |
| P2 | Tem nhiệt bộ/máy/chu trình | `usePrint.ts` | (chưa LOAI) |
| P2 | Tem QR vị trí | `LocationQrPrintButton.tsx` | (chưa LOAI) |

---

## Scorecard P0 — Giám sát + CSSD

### 1) Phiếu VST

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| Đạt | Đạt | Lệch | Lệch | Đạt | Đạt |

**Bằng chứng / ghi chú**

- Dùng `PrintLayout`, `fileTitle` → `LSGS_{VST-ngày-8hex}` (hoặc `ma_hien_thi`).
- Meta 2 cột (khoa, khu, ngày, người GS…) logic, không absolute chồng.
- **Lệch N:** bảng dùng màu `var(--primary)` / đỏ; viền `#e2e8f0` nhạt — in B&W có thể khó đọc hơn viền đen thuần (CSSD đã dùng đen).
- **Lệch P:** mỗi khối nhân viên `break-inside-avoid` — phiên nhiều lượt WHO có thể đẩy cả khối sang trang sau, để trống lớn trang trước (“lơ lửng”).
- QR compact sau chữ ký (`afterFooter`) — hợp lý; không đè meta.

### 2) Phiếu GSC

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| Đạt | Đạt | Lệch | Lệch | Đạt | Đạt |

**Bằng chứng / ghi chú**

- Header/meta tương tự VST; tiêu đề lấy từ tên bảng kiểm (uppercase) — đúng nghiệp vụ.
- `LSGS_{GSC-…}` hoặc `ma_hien_thi`.
- **Lệch N:** cột “Không áp dụng” rộng 80px + ghi chú — bảng 6 cột trên A4 hơi chật khi tiêu chí dài + mô tả phụ `10px`.
- **Lệch P:** CSS chung **không** lặp `thead` sang trang 2 (khác BCTH có `thead { display: table-header-group }`) — phiếu nhiều tiêu chí khó đọc từ giữa trang.
- QR sau chữ ký: Đạt (khi có `qrDataUrl`).

### 3) Phiếu mẻ tiệt khuẩn

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| Đạt | Đạt | Đạt | Lệch* | Đạt | Đạt |

**Bằng chứng / ghi chú**

- `density="compact"` phù hợp phiếu dày; subtitle mã mẻ + kết luận ĐẠT/KHÔNG ĐẠT rõ.
- Bảng QC có khung ảnh cố định `12mm` (globals) — tránh ảnh làm nổ hàng.
- `ME_{maLo}`; QR mẻ compact sau chữ ký.
- **Lệch\* P (Chưa kiểm được hết):** danh sách bộ rất dài → chữ ký/QR có thể sang trang cuối (bình thường); cần in thử mẻ >30 bộ xem có cắt hàng/ảnh QC không.

### 4) Phiếu cấp phát

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| Đạt | Đạt | Lệch | Lệch | Lệch | Đạt |

**Bằng chứng / ghi chú**

- Meta 2 cột + hàng thông số TK 3 cột; bảng dụng cụ STT/KH/TT rõ nghiệp vụ.
- `CP_` + ưu tiên mã bộ → chu trình → mẻ → `QT-…` (`pickCssdCapPhatMa`).
- **Lệch N:** hàng thông số (nhiệt/áp, CI, BI…) không `word-break` riêng — giá trị dài có thể chen cột.
- **Lệch C/P:** `CssdCapPhatQrStrip` **3 QR** sau chữ ký, `pageBreakInside: avoid` — khối chữ ký + 3 QR cao; dễ bị đẩy nguyên khối sang trang mới hoặc chật cuối trang.
- Placeholder “Chưa có mã chu trình” dashed box — chấp nhận được.

### 5) Biên bản sự cố CSSD

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| Đạt | Đạt | Lệch | Lệch | Đạt | Lệch |

**Bằng chứng / ghi chú**

- Cấu trúc hành chính → nhóm → đối tượng → phương án → ảnh — logic.
- **Lệch N:** banner đỏ + emoji; khối “đối tượng” nền xám bo góc (print CSS làm phẳng bo góc nhưng vẫn “card UI” hơn phiếu hành chính đen trắng).
- **Lệch P:** ảnh minh chứng `maxHeight: 260px` có thể đẩy chữ ký xuống / cắt cảm giác trang.
- **Lệch F:** `SUCO_{8hex}` — đúng quy ước kỹ thuật nhưng **khó đọc hơn** VST/GSC (thiếu tiền tố ngày/`SC-`); nên cân nhắc `SUCO_SC-{ngày}-{8hex}` ở đợt sửa.

---

## Scorecard P1 — QLCV + Báo cáo tổng hợp

### 6) Phiếu công việc (CV)

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| Đạt | Đạt | Đạt | Đạt* | Đạt | Đạt |

- Bảng nhãn/giá trị 4 cột gọn; checklist ☑/☐ rõ.
- `CV_{8hex}`; không QR phụ lục (chấp nhận — chưa gắn entity QR trên phiếu).
- \*Checklist rất dài: Chưa kiểm được với dữ liệu thật.

### 7) Kế hoạch định kỳ (KHCV)

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| Đạt | Đạt | Lệch | Lệch | Đạt | Đạt |

- **Lệch N:** 6 cột, cột checklist lồng `<ol>` trong ô — dễ tràn/chật khi mẫu nhiều mục.
- **Lệch P:** hàng cao (checklist dài) + `tr { page-break-inside: auto }` globals — có thể cắt giữa checklist; không lặp header trang 2.
- `KHCV_{chuKy}_{YYYY-MM}`.

### 8) Thực thi kỳ (TTCV)

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| Đạt | Đạt | Lệch | Lệch | Đạt | Đạt |

- 8 cột (STT…%) trên A4 — chữ nhỏ do CSS `th/td` 11–12px; tiêu đề dài dễ xuống nhiều dòng.
- `TTCV_{kind}_{YYYY-MM}`.

### 9) Báo cáo tổng hợp (BAOCAO)

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| Đạt* | Lệch* | Đạt* | Đạt* | Đạt | Đạt |

**Bằng chứng / ghi chú**

- **2026-08-05 (PRINT-BCTH-01):** `@page` lề đồng bộ `12mm 10mm 12mm 12mm` với `globals.css` / PrintLayout.
- **Lệch\* H (chấp nhận):** không dùng `PrintLayout`; header accent xanh + footer `fixed` = dialect **báo cáo màu** (khác phiếu hành chính đen trắng).
- Footer cố định + `body { padding-bottom: 14mm }` — tránh đè nội dung (đã có phòng vệ).
- Tên file: `BAOCAO_{YYYYMMDD}-{YYYYMMDD}` từ `BC-TH-…` — Đạt.
- \*Biểu đồ/SVG và bảng rộng: phụ thuộc dữ liệu kỳ — Chưa kiểm được hết trên máy in; rủi ro đã ghi ở chương trình UI consistency.

---

## Scorecard P2 — Tem / nhãn

### 10) Tem nhiệt bộ / máy / chu trình

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| N/A (80mm) | N/A | Đạt* | N/A | N/A | Lệch |

- Khổ nhãn nhiệt riêng — **không đánh bằng thước A4** (đúng thiết kế).
- Layout căn giữa: QR 50mm + mã + tên; `word-break` mã dài.
- **Lệch F:** `document.title` = mã QR thô, không `{LOAI}_{MA}` (ví dụ chưa có `TEMBO_`, `TEMMAY_`, `TEMCYC_`).
- \*Cần UAT máy in nhiệt thực tế (độ rộng 72–80mm).

### 11) Tem QR vị trí (khoa / khu)

| K | H | N | P | C | F |
|---|---|---|---|---|---|
| Đạt* | Đạt | Chưa kiểm máy in | — | — | Đạt |

**Cập nhật 2026-08-05 (PRINT-LOC-01 Done)**

- [`LocationQrPrintButton.tsx`](../../../src/components/shared/LocationQrPrintButton.tsx) bọc `id="print-area"` + `fileTitle` `TEMLOC_{mã}`.
- \*Xác nhận tay 1 lần trên trình duyệt vẫn khuyến nghị (máy in thật).

---

## Tổng hợp nhanh

| Mức | Số mẫu | Tóm tắt |
|-----|--------|---------|
| Nền tảng A4 chung | 8 phiếu PrintLayout | Header/chữ ký/fileTitle ổn định |
| Lệch trình bày / nhất quán | VST màu, GSC/QLCV bảng chật, BCTH “dialect” riêng, SUCO mang UI màu | Không phải crash |
| Lỗi cần sửa sớm | Tem QR vị trí | In trống |
| Chưa kiểm máy in | Mẻ dài, BCTH chart, tem nhiệt | Cần 1 vòng UAT tay |

---

## Khuyến nghị ưu tiên sửa (đợt sau — chưa làm)

### Sửa ngay (P0 kỹ thuật)

1. ~~**Tem QR vị trí:** `#print-area` + `TEMLOC_`~~ — **Done 2026-08-05**.
2. **Xác nhận tay** VST/GSC/mẻ/cấp phát + tem LOC với dữ liệu thật (xem checklist dưới).

### Thống nhất form (P1 thẩm mỹ / chuẩn mực)

3. ~~Lề A4 BCTH ↔ PrintLayout~~ — **Done 2026-08-05** (accent xanh BCTH giữ có chủ đích).
4. Bảng in dài (GSC, KHCV, TTCV): lặp header trang 2; nới/gộp cột nếu tràn.
5. VST: bỏ hoặc nới `break-inside-avoid` khi khối người quá cao; viền bảng về đen như CSSD.
6. Cấp phát: xử lý khối 3 QR (thu gọn hoặc cho phép tách trang có chủ đích).
7. Sự cố: phiếu “hành chính đen trắng” hơn; tên file giàu ngữ nghĩa hơn `8hex`.

### Tem nhiệt (P2)

8. Quy ước tên file `TEMBO_` / `TEMMAY_` / `TEMCYC_` + UAT khổ giấy máy thực tế.

---

## Checklist 3 case kiểm tay (PO / khoa)

1. **VST:** mở phiên đã lưu nhiều người → In → xem header, bảng WHO, tổng hợp %, chữ ký, QR; hộp thoại Lưu PDF tên `LSGS_…`.
2. **CSSD:** in phiếu mẻ (nhiều bộ) + phiếu cấp phát → bảng/QC không cắt chữ; 3 QR cấp phát không đè chữ ký.
3. **Đối chứng lệch form:** in 1 phiếu GSC và 1 Báo cáo tổng hợp cùng kỳ → so lề/header; thử **In tem QR vị trí** (kỳ vọng hiện tại: trống → xác nhận lỗi).

---

## Giới hạn báo cáo

- Không chạy preview trình duyệt / máy in trong đợt này.
- Không đánh giá nội dung nghiệp vụ câu hỏi bảng kiểm hay công thức KPI.
- “Đẹp” tách thành **lỗi kỹ thuật** (trống/tràn/chồng) vs **gợi ý thẩm mỹ** (màu, dialect BCTH).

---

## Remediation đã làm (cùng ngày, sau duyệt PO)

| Mục | Trạng thái |
|-----|------------|
| Tem QR vị trí → `#print-area` + `TEMLOC_…` | Done |
| LOAI tem nhiệt `TEMBO` / `TEMMAY` / `TEMCYC` | Done |
| Lề BCTH ≈ phiếu A4 (`12/10/14/12`) | Done |
| `thead` lặp trang 2 (globals) + bảng GSC/QLCV cố định cột | Done |
| VST viền đen, bỏ `break-inside-avoid` khối người | Done |
| Cấp phát: 3 QR cho tách trang | Done |
| Sự cố B&W + `SUCO_SC-{ngày}-{8hex}` | Done |
| UAT máy in thật / dữ liệu dài | **Chưa** — cần 3 case tay trong checklist trên |
