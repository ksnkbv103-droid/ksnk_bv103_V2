> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md). Tra cứu lịch sử được.

# Vá phần mềm — quy trình xử lý dụng cụ (tem / truy vết / cảnh báo giao khoa)

> **Ngày:** 2026-09-08 (Asia/Ho_Chi_Minh) · **Máy:** `Desktop/ksnk_bv103` · **Phạm vi:** local only, không commit/push.  
> Ngôn ngữ: phần mềm / vận hành — không dùng mã thủ tục trong báo cáo hay chuỗi UI mới.

---

## Vấn đề (phần mềm)

1. **Tem chu trình** sau Đóng gói chỉ in mã + tên bộ → thiếu số mẻ/lô, HSD, người đóng gói, ngày đóng gói (tem khó dùng tại kho/khoa).
2. **Tab Truy vết** chỉ hiện `metadata.ngoai_le` → không thấy ai/khi nào theo 6 khâu dù dữ liệu đã lưu trên fact.
3. Sau mẻ **Đạt**, hệ thống stamp cùng lúc Tiệt khuẩn + Cấp phát (người QC mẻ). Nếu chưa quét lại khi giao khoa, UI không nhắc → dễ hiểu nhầm «người cấp phát» trên phiếu.

---

## Đã sửa

### A — Tem chu trình đủ trường
- Mở rộng `printCycleLabel` (HTML nhiệt) với các dòng: mã bộ, mã chu trình, số mẻ/lô (hoặc «Chưa vào mẻ»), HSD, người đóng gói, ngày đóng gói — thiếu thì «Chưa có».
- Action `fetchCssdCycleLabelData(quyTrinhId)` đọc `cssd_fact_quy_trinh` + `cssd_fact_lo_tiet_khuan` khi đã gắn mẻ.
- Sau Đóng gói, trang chu trình lấy dữ liệu rồi mới mở lệnh in.

### B — Timeline truy vết 6 khâu
- Helper thuần `buildCssdStationTimeline` / `mapCssdNgoaiLeEvents`.
- `fetchCssdQrHistory` resolve tên nhân sự và trả `timeline` + `ngoaiLe`.
- `QRHistoryViewer` hiện 6 khâu theo thứ tự (chưa ghi / đang ở khâu / đã ghi), kèm ngoại lệ; hiện mã mẻ nếu có.

### C — Soft-warn giao khoa
- Helper `needsCssdKhoaHandoffSoftWarn` suy ra từ `trang_thai = CAP_PHAT` và `khoa_nhan_id` null (không đổi mô hình stamp kép).
- Hiện cảnh báo: *«Chưa quét xác nhận giao khoa — người trên phiếu mẻ vẫn là người QC mẻ»* trên:
  - hàng chờ Cấp phát
  - Kho (cột trạng thái)
  - Truy vết
  - thẻ quét thành công khi còn thiếu khoa nhận
- Không hard-block; re-scan Cấp phát (có khoa) làm hết cảnh báo.

---

## File đụng

| File | Vai trò |
|------|---------|
| `src/lib/domain/cssd-station-timeline.ts` (+ `.spec.ts`) | Timeline 6 khâu + soft-warn |
| `src/modules/cssd-erp/lib/cssd-cycle-label-html.ts` (+ `.spec.ts`) | HTML/meta tem chu trình |
| `src/modules/cssd-erp/actions/cssd-cycle-label.actions.ts` | Đọc dữ liệu in tem |
| `src/hooks/usePrint.ts` | In tem chu trình đủ trường |
| `src/modules/cssd-erp/views/CSSDERPPage.tsx` | Gọi fetch trước khi in |
| `src/modules/cssd-erp/actions/cssd-qr-history.actions.ts` | Timeline + cảnh báo |
| `src/modules/cssd-erp/components/history/QRHistoryViewer.tsx` | UI timeline |
| `src/modules/cssd-erp/actions/cssd-read.actions.ts` | `khoa_nhan_id` hàng chờ CP |
| `src/modules/cssd-erp/types/cssd.types.ts` | Field waiting |
| `src/modules/cssd-erp/components/waiting-list/WaitingList.tsx` | Soft-warn |
| `src/modules/cssd-erp/views/KhoDungCuPage.tsx` | Soft-warn kho |
| `src/modules/cssd-erp/actions/cssd-scan.actions.ts` | Trả `canhBaoGiaoKhoa` |
| `src/modules/cssd-erp/hooks/useCSSDWorkflow.ts` | Đưa flag lên thẻ quét |
| `src/modules/cssd-erp/components/scan/QRScanSuccessCard.tsx` | Soft-warn trên thẻ |

---

## Cách kiểm tra tay

1. **Tem:** Quét Đóng gói → popup in tem có dòng «Chưa vào mẻ» / người + giờ đóng gói (nếu đã stamp). Sau khi bộ vào mẻ đạt, in lại (nếu có đường in) thấy mã mẻ + HSD khi đã có.
2. **Truy vết:** `?tab=trace` quét mã bộ/chu trình → thấy 6 khâu; khâu chưa stamp = «Chưa ghi»; ngoại lệ tách riêng; hiện mã mẻ nếu có.
3. **Cảnh báo:** Sau mẻ Đạt, mở hàng chờ Cấp phát hoặc Kho — bộ chưa có `khoa_nhan_id` hiện soft-warn. Quét lại Cấp phát (có khoa nhận) → cảnh báo hết.

---

## Kiểm thử tự động

- `vitest` focused: `cssd-station-timeline.spec.ts`, `cssd-cycle-label-html.spec.ts`.

---

## P1 còn lại (không chặn A/B/C)

- In lại tem chu trình từ Kho/Truy vết (nút riêng) khi đã vào mẻ — hiện auto-print chủ yếu sau Đóng gói.
- Write-path implant/quarantine chặn cấp phát (đã ghi ở audit domain cùng ngày).
- Cờ metadata riêng «đã re-scan giao» — chưa thêm; đang suy ra từ `khoa_nhan_id` (an toàn hơn).
