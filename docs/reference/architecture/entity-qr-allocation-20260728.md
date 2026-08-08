# Phân bổ QR code toàn viện BV103 (2026-07-28)

## Luồng mẻ tiệt khuẩn (đã nối lại 2026-07-28)

1. Đóng gói → xác nhận chuyển chờ TK.  
2. Tab **Mẻ tiệt khuẩn** → mở mẻ / quét `LOT-*` trên danh sách.  
3. Cột **Chờ tiệt khuẩn**: nút **Xử lý** / **Chi tiết** (giống Làm sạch–QC–Đóng gói) → ghi bộ vào phiếu ngay.  
4. Cột **Đưa bộ vào phiếu**: quét QR + **Xác nhận** (Enter/camera cũng được).  
5. **Xác nhận bắt đầu tiệt khuẩn** → khóa nạp → chạy máy → kết thúc chu trình → QC.

QR trên phiếu in nằm **sau chữ ký**. Ô tìm trên bảng lịch sử/mẻ/NKBV có **Quét QR**.

---

## Nguyên tắc

1. **Một mã = một đối tượng** có thể mở lại trong phần mềm (plain string, không JSON).
2. **Hook dùng chung:** `useEntityQr` / `useEntityQrImage` + `EntityQrBlock` (in + hiện màn hình).
3. **Quét mở lại phiếu (2A):** cổng `/qr` (nhóm Giám sát trên sidebar) → `classifyEntityQr` → deep-link.
4. **CSSD giữ hub riêng** (`cssd-qr-hub`) cho bộ / chu trình / mẻ / máy; lớp entity-qr chỉ bọc deep-link trace.
5. **Hiện luôn QR** trên danh mục có mã quét: bộ (`ma_bo`), máy (`ma_thiet_bi`), khoa (`LOC-KHOA-*`), mẻ — pattern `InlineEntityQrThumb`.

## Tem bộ vs tem chu trình (D-19)

| Loại | Mã | Tuổi thọ | In ở đâu |
|------|-----|----------|----------|
| **Tem bộ (vĩnh viễn)** | `ma_bo` | Gắn khay/bộ lâu dài | Quản trị bộ + catalog CSSD «In QR» |
| **Tem chu trình (tạm)** | mã chu trình túi hấp | Một vòng tiệt khuẩn | Sau quét tại trạm quy trình (`printCycleLabel`) |

UI nhắc: `CssdQrLabelKindsNotice` trên workflow master dụng cụ và catalog bộ CSSD.

## Bảng mã

| Loại | Mã in trên QR | Mở lại | In / hiện |
|------|---------------|--------|-----------|
| Phiếu GSC | `GSC-{uuid}` | `/giam-sat-chung?edit=` | Phiếu A4 GSC |
| Phiếu VST | `VST-{uuid}` | `/giam-sat-vst?edit=` | Phiếu A4 VST |
| Biên bản sự cố | `SC-{uuid}` | `/cssd-erp/report?tab=incident&id=` | Biên bản A4 |
| Phiếu NKBV | `NKBV-{uuid}` | `/giam-sat-nkbv?case=` | Màn hình sửa phiếu |
| Công việc | `QLCV-{uuid}` | `/quan-ly-cong-viec?id=` | (sẵn deep-link; in phiếu khi có) |
| Khoa/phòng | `LOC-KHOA-{ma}` | `/giam-sat-chung?loc=khoa&ma=` | Tem từ danh mục khoa |
| Khu vực GS | `LOC-KHU-{ma}` | `/giam-sat-chung?loc=khu&ma=` | Tem (khi gắn UI khu) |
| Bộ / chu trình / mẻ / máy | mã CSSD hiện có | `/cssd-quy-trinh?tab=trace&qr=` | Tem + phiếu mẻ/cấp phát |

> Mã hiển thị ngắn `GSC-YYYYMMDD-XXXXXXXX` chỉ để đọc trên bảng lịch sử — **không** dùng trong QR (ngắn → không resolve UUID).

## File SSOT

| Vai trò | Path |
|---------|------|
| Phân loại + deep-link | `src/lib/entity-qr/entity-qr-core.ts` |
| Sinh ảnh | `src/lib/entity-qr/generate-entity-qr.ts` |
| Hook | `src/hooks/useEntityQr.ts` |
| Khối UI/in | `src/components/shared/EntityQrBlock.tsx` |
| Cổng quét | `/qr` · `EntityQrScanPage` |
| CSSD hub | `src/modules/cssd-erp/shared/application/cssd-qr-hub.ts` |

## Giường bệnh (chưa có danh mục giường)

Chưa có master “giường” trong MDM — chỉ trường tự do `so_giuong_nguoi_benh`.  
**Cách làm hiện tại:** in tem `LOC-KHOA-*` / `LOC-KHU-*` dán khu vực; ghi số giường trên phiếu GSC.  
Khi có danh mục giường vật lý → thêm prefix `LOC-GIUONG-{ma}` theo cùng pattern.
