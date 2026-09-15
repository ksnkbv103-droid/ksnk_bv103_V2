> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md) (sự cố). Tra cứu lịch sử được.

# Audit + fix module sự cố dụng cụ — 2026-09-08

> Phạm vi: `/cssd-su-co` + `src/modules/cssd-su-co` · **chỉ local** · không commit/push.

## 1. Bản đồ loại (SSOT v2 trong code)

| Nhóm | UI chọn loại | Trường / hành động chính | Ghi chú tách bạch |
|------|--------------|--------------------------|-------------------|
| **PROCESS** | Không picker loại (mã nội bộ `PROCESS_CHAIN_FAIL`) | Bộ (tuỳ chọn) · Khâu lỗi · Phát hiện tại · checklist khâu trung gian · truy vết người chu kỳ | `tramPhatHien` sau `tramLoi` |
| **BATCH** | Multi-select nguyên nhân mẻ (hoặc lý do thu hồi khi entry thu hồi) | Bộ · Mã lô · Máy TK · Khâu lỗi cố định Tiệt khuẩn · Nơi phát hiện | Entry thu hồi **không** mở 3 cửa dụng cụ |
| **INSTRUMENT** | 3 cửa: **Hỏng/Mất** · **Đổi danh mục** · **Điều chuyển** | Theo cửa (xem dưới) | Không lẫn với sự cố an toàn PROCESS/BATCH |
| **EQUIPMENT** | Multi-select nguyên nhân máy | QR/chọn máy | Không TypePicker |
| **CHEMICAL** | Multi-select nguyên nhân HC | Chọn HC · mã lô tuỳ chọn | Không TypePicker |
| **OTHER** | Một mã `OTHER_CUSTOM` | Vị trí phát hiện | — |

### Ba cửa dụng cụ (INSTRUMENT)

| Cửa | Hành động | Hiệu lực |
|-----|-----------|----------|
| **Hỏng/Mất** | Giảm số đếm → chọn Hỏng/Mất | Ghi sổ ngay |
| **Đổi danh mục** | Sửa mã/tên/chuẩn · thêm/xóa dòng | Chờ duyệt |
| **Điều chuyển** | Kho↔bộ hoặc bộ↔bộ | Phiếu chuyển riêng |

## 2. Lệch tìm thấy (trước fix)

| Mức | Lệch |
|-----|------|
| **P0** | Cửa **Hỏng/Mất** và **Đổi danh mục** dùng chung một bảng mega-form: vừa sửa danh mục vừa bấm Hỏng/Mất → dễ lập nhầm / lẫn nghiệp vụ |
| **P0** | Validate form gộp PHYSICAL → `SET_RECONCILE` trước khi kiểm dòng → không chặn đổi danh mục trên cửa Hỏng/Mất |
| **P1** | Chuỗi UI còn mã thủ tục (`QT.24`, gợi ý `PCI`) trên banner / title / modal |
| **P1** | Nhãn dài (nhóm, meta, máy/HC) — nhiều chrome, khó quét mắt |
| **P2** | Cửa **Điều chuyển** vẫn DualPane hai khung cố định (Transfer/Replenish) — chưa chuyển Dialog; đổi lớn, để pass sau |
| **P2** | `InstrumentIncidentFields.tsx` legacy gần như chết; TypePicker còn trong CHEMICAL/EQUIPMENT nhưng đã `hideType` |

## 3. Đã sửa (pass này)

1. **Tách UI 2 cửa rà soát** — `doorMode: physical | catalog` trên `InstrumentSetReconcileTable` / `Row`:
   - physical: khoá mã/tên/chuẩn; chỉ đếm + Hỏng/Mất; ẩn thêm/xóa dòng danh mục
   - catalog: khoá đếm; chỉ đổi danh mục; ẩn nút Hỏng/Mất
2. **Validate theo cửa UI** trong `SuCoReportForm`:
   - Hỏng/Mất → `validateInstrumentDoorLines(INSTRUMENT_PHYSICAL…)`
   - Đổi danh mục → `validateCatalogReconcileDoorLines` (form)
   - Điều chuyển → `INSTRUMENT_MOVE`
   - Backend vẫn nhận PHYSICAL nộp thành `SET_RECONCILE` (D4) — không phá sổ cũ
3. **Domain helpers** (`cssd-set-reconcile.ts`): `isPhysicalDoorTypeId`, thông báo cửa, `validateCatalogReconcileDoorLines`
4. **Gỡ mã thủ tục khỏi chuỗi UI** (banner thu hồi, modal, title trang, hint gói ướt)
5. **Rút gọn nhãn**: nhóm tabs ngắn (Quy trình / Mẻ / Dụng cụ…), meta, máy/HC, checklist nguyên nhân
6. **Vitest** `cssd-set-reconcile.spec.ts` — case tách cửa; taxonomy + batch-recall vẫn pass

## 4. Còn lại (sau pass Dialog)

- Nhật ký / in biên bản: vẫn đúng nhóm; có thể rút copy dài sau
- Cân nhắc ghi `INSTRUMENT_PHYSICAL` thẳng DB thay vì collapse D4 (ảnh hưởng sổ/duyệt — cần PO)
- (Tuỳ chọn) gỡ luôn export `TypePicker` trong `SuCoReportFormFields` nếu không còn chỗ dùng

## 5. Cách kiểm tay

1. Mở `/cssd-su-co` → tab **Dụng cụ** → **Hỏng/Mất**: không thấy «Thêm dòng (chờ duyệt)» / không sửa được mã loại; giảm đếm → Hỏng/Mất → Gửi OK.
2. Cùng nhóm → **Đổi danh mục**: không thấy nút Hỏng/Mất; sửa chuẩn/mã hoặc thêm dòng → Gửi; phiếu chờ duyệt.
3. **Điều chuyển**: Dialog mở (không còn hai khung cao trên form); kho↔bộ / bộ↔bộ → Xong → Gửi.
4. Tab **Quy trình**: không có dropdown loại; có khâu lỗi + khâu trung gian (khi phát hiện sau lỗi).
5. Tab **Mẻ** / **Máy** / **Hóa chất**: checklist multi-select, không TypePicker.
6. **Thu hồi theo mẻ**: banner không còn mã thủ tục; không hiện 3 cửa dụng cụ.
7. (Dev) `npx vitest run src/lib/domain/cssd-set-reconcile.spec.ts src/modules/cssd-su-co/domain/`

## 6. File chạm

- `src/lib/domain/cssd-set-reconcile.ts` (+ `.spec.ts`)
- `src/modules/cssd-su-co/components/InstrumentSetReconcile{Table,Row}.tsx`
- `src/modules/cssd-su-co/components/SuCoReportForm.tsx`
- `src/modules/cssd-su-co/components/SuCoReportFormFields.tsx`
- `src/modules/cssd-su-co/components/SuCoIncidentMetaFields.tsx`
- `src/modules/cssd-su-co/components/SuCoReportForm{Batch,Chemical,Equipment}Fields.tsx`
- `src/modules/cssd-su-co/components/IncidentReportModal.tsx`
- `src/modules/cssd-su-co/views/SuCoBaoCaoPage.tsx`
- `src/modules/cssd-su-co/domain/cssd-incident-taxonomy.ts`
- `src/modules/cssd-su-co/domain/cssd-batch-recall.ts`
- `src/modules/cssd-su-co/components/InstrumentMoveDualTable.tsx` (+ `DualPaneScroll.tsx`)
- ~~`InstrumentIncidentFields.tsx`~~ (đã xóa)

## 7. Pass leftover — Dialog Điều chuyển + dọn chết (cùng ngày)

### Đã làm
1. **Cửa Điều chuyển → Dialog** (`InstrumentMoveDualTable`):
   - Form chỉ còn thẻ tóm tắt (hướng Kho↔Bộ / Bộ↔Bộ, mã bộ, số dòng) + nút mở bảng.
   - Bảng Transfer/Replenish nằm trong Dialog (`max-h` + cuộn nội bộ, `bg-white`, `BV103_DIALOG_STACK`); `forceMount` giữ state/draft khi đóng.
   - `DualPaneScroll` giảm chiều cao cố định (`max-h ~42dvh`) — không còn hai khung cao ép cuộn trang.
2. **Xóa** `InstrumentIncidentFields.tsx` (không còn import).
3. **Gỡ props TypePicker chết** ở CHEMICAL/EQUIPMENT (`hideType` / `typeOptions` / `typeId` / `onTypeChange`) — checklist nguyên nhân giữ nguyên.

### Không đổi nghiệp vụ
- Kho↔bộ / bộ↔bộ, validate cửa MOVE, submit payload reconcile như trước.

### Kiểm
- Vitest: `cssd-set-reconcile` + domain `cssd-su-co`.
- Tay: tab Dụng cụ → Điều chuyển → Dialog mở; chọn số → Xong → Gửi.
