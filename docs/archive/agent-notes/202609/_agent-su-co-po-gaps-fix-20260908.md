> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md) (sự cố). Tra cứu lịch sử được.

# Sửa 3 gap PO — báo cáo sự cố CSSD — 2026-09-08

> Local only · không commit/push · plain VN · không mã QT/PCI.

Cross-link: [`_agent-su-co-bao-cao-deep-audit-20260908.md`](./_agent-su-co-bao-cao-deep-audit-20260908.md) (mục 8 — gap còn lại 1–3).

---

## 1. Hỏng/Mất — mã cửa riêng trên sổ

### Đã đổi
- `resolveInstrumentFormSubmitTypeId`: **không** còn collapse `INSTRUMENT_PHYSICAL` → `SET_RECONCILE`.
- Phiếu Hỏng/Mất ghi `INCIDENT_TYPE_CODE = INSTRUMENT_PHYSICAL`; Đổi danh mục giữ `INSTRUMENT_SET_RECONCILE`; Điều chuyển giữ `INSTRUMENT_TRANSFER` / `INSTRUMENT_REPLENISH`.
- BE `validateInstrumentDoorLines` dùng **typeId thật** sau submit (PHYSICAL chỉ HONG/MAT).
- In / lọc cửa: `resolveInstrumentDoorForPrint` ưu tiên typeCode; sổ cũ `SET_RECONCILE` + dòng HONG/MAT vẫn suy ra cửa Hỏng/Mất.

### Tương thích đọc cũ
- Hàng đã collapse D4 (`SET_RECONCILE` + snapshot HONG/MAT): vẫn đọc được qua suy cửa từ snapshot.
- Không migration DB.

### Kiểm
1. Tab Dụng cụ → Hỏng/Mất → Gửi → attributes `INCIDENT_TYPE_CODE=INSTRUMENT_PHYSICAL`.
2. Lọc nhật ký / KPI theo code PHYSICAL ≠ SET_RECONCILE.
3. Phiếu cũ SET_RECONCILE+HONG: in vẫn nhãn cửa Hỏng/Mất.

---

## 2. Phiếu — người phát hiện ≠ người tạo + four-eyes

### Đã đổi
- Form: **Người tạo phiếu** (readonly = phiên đăng nhập); **Người phát hiện** (select nhân sự, có thể khác).
- Copy ngắn: «Có thể nhờ người khác lập phiếu thay người phát hiện».
- Persist: `NGUOI_PHAT_HIEN(_ID)`, `REPORTER_*`, `REPORTER_NHAN_SU_ID` / `NGUOI_TAO(_ID)` (+ cột `nguoi_bao_id` như trước).
- Xác nhận: so sánh actor với creator (attrs hoặc `nguoi_bao_id`); trùng → lỗi **«Không tự xác nhận phiếu mình tạo»** (hard).

### Kiểm
1. Chọn người phát hiện khác mình → Gửi → in hiện cả hai.
2. Tự bấm Xác nhận trên phiếu mình tạo → bị chặn.
3. Tài khoản khác xác nhận → OK.

---

## 3. Hóa chất — `chemicalId` + chặn chốt

### Đã đổi
- Form/schema/actions: field **`chemicalId`** (không tái dùng `machineId` trên nhóm CHEMICAL).
- Attributes: `CHEMICAL_ID` + `CHEMICAL_MA` / `CHEMICAL_TEN`; mirror `MACHINE_ID` để đọc cũ.
- Resolve: ưu tiên `CHEMICAL_ID`, fallback UUID trong `MACHINE_ID`.
- Submit CHEMICAL → ghi cách ly trên `cssd_dm_hoa_chat.specs`:
  - có mã lô → `su_co_quarantine_lots[]`
  - không lô → `su_co_quarantine=true` (soft hold master)
- Cổng cứng: `xuatKhoHoaChatAction` / điều chỉnh âm gọi `assertChemicalExportable`.
- In biên bản: hiện mã — tên (không UUID thô khi đã resolve).

### Phạm vi chặn chốt (ghi rõ)
- **Đã nối:** xuất kho / điều chỉnh giảm (cấp phát kho FEFO ops).
- **Một phần:** FEFO pick UI chưa lọc sẵn lô cách ly trên mọi surface — vẫn bị chặn khi xuất. Chốt nạp mẻ tiệt khuẩn **không** tiêu thụ lô HC trực tiếp trong code hiện tại → không gate thêm trên nạp mẻ.
- Gỡ cách ly: sửa `specs` danh mục (ops/admin) — chưa UI «gỡ giữ» riêng trong pass này.

### Kiểm
1. Tab Hóa chất → chọn HC ± lô → Gửi → specs có quarantine.
2. Thử xuất lô/master bị giữ → lỗi cách ly.
3. In phiếu: tên HC, không chỉ UUID.

---

## 4. File chạm (tóm tắt)

- `src/modules/cssd-su-co/domain/cssd-incident-taxonomy.ts` (+ spec)
- `src/modules/cssd-su-co/domain/cssd-incident-print.ts` (+ spec)
- `src/modules/cssd-su-co/domain/cssd-incident-status.ts` (+ spec)
- `src/modules/cssd-su-co/domain/cssd-incident-attributes.ts`
- `src/modules/cssd-su-co/domain/cssd-incident-policy.ts`
- `src/modules/cssd-su-co/contracts/su-co-report-input.schema.ts`
- `src/modules/cssd-su-co/components/SuCoReportForm.tsx`
- `src/modules/cssd-su-co/components/SuCoReportFormChemicalFields.tsx`
- `src/modules/cssd-su-co/components/SuCoIncidentMetaFields.tsx`
- `src/modules/cssd-su-co/components/IncidentPrintView.tsx`
- `src/modules/cssd-su-co/application/su-co-report.application.ts`
- `src/modules/cssd-su-co/application/confirm-incident.application.ts`
- `src/modules/cssd-su-co/actions/su-co-report.actions.ts`
- `src/lib/domain/cssd-set-reconcile.ts` (comment)
- `src/lib/domain/cssd-hoa-chat-su-co-resolve.ts` (+ spec)
- `src/lib/domain/cssd-hoa-chat-quarantine.ts` (+ spec) **mới**
- `src/modules/cssd-erp/actions/cssd-kho-hoa-chat-mutations.actions.ts`
- `docs/modules/cssd/_agent-su-co-po-gaps-fix-20260908.md` (file này)

## 5. Kiểm tự động

```bash
npx vitest run \
  src/lib/domain/cssd-set-reconcile.spec.ts \
  src/lib/domain/cssd-hoa-chat-su-co-resolve.spec.ts \
  src/lib/domain/cssd-hoa-chat-quarantine.spec.ts \
  src/modules/cssd-su-co/domain/

npx tsc --noEmit
```
