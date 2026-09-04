# Luồng quản lý dụng cụ CSSD (MDM → vận hành)

> SSOT bảng: `cssd_dm_loai_dung_cu` · `cssd_dm_bo_dung_cu` · `cssd_dm_bo_dung_cu_chi_tiet`  
> Domain vận hành đầy đủ (6 trạm, mẻ, luật): [`domain-overview.md`](domain-overview.md).  
> Quyết định Phase 0 (D1–D10, 2026-09-04): [`../../core/domain-decisions-cssd-instrument.md`](../../core/domain-decisions-cssd-instrument.md).

## Thứ tự chuẩn

| Bước | Danh mục | Quyền | Mã |
|------|----------|-------|-----|
| 1 | **Loại dụng cụ** | LOAI_DC (hard-write = **ADMIN**; sheet `?sheet=loai`) | `ma_loai_dung_cu` |
| 2 | **Bộ dụng cụ** | BO_DC (hard-write master = **ADMIN**; `BO_DC.edit` = duyệt phiếu) | `ma_bo` = `KHOA.SET.NN` (tem QR) |
| 3 | **Thành phần bộ** | DC_LE (trong bộ; **1 bộ × 1 loại** unique active — D6) | `ma_chi_tiet` (DC-*) |
| 4 | In tem / workflow | CSSD_* | Quét `ma_bo` |
| 5 | Biến động dụng cụ | `/cssd-su-co` (nhóm Dụng cụ) | **3 cửa (D2):** **Đổi danh mục** (`SET_RECONCILE` / BOM_PENDING → ADMIN; không ghi sổ) · **Hỏng/Mất** (ghi sổ ngay) · **Chuyển** (`MOVE` / `InstrumentMoveDualTable`: kho↔bộ / bộ↔bộ; chỉ cửa này có `BO_SUNG`/`TRA_KHO`/`DIEU_CHUYEN` — D3). Không gọi mọi biến động là «sự cố» (D1). |
| 6 | Xem danh mục | `/cssd-dung-cu` | Read-only: thành phần dưới bộ đã chọn; rà soát khi lệch (deep-link cửa Đổi danh mục). Xuất phiếu kiểm kê trên thanh tìm. |

## Vào app

- **Quản trị:** Hệ thống → Danh mục dụng cụ — tab **Bộ · Phiếu · Lịch sử**; sheet **Loại** (`?sheet=loai`, ADMIN)  
  URL: `/quan-tri-he-thong/danh-muc/dung-cu?tab=bo` · phiếu `?tab=phieu` · lịch sử `?tab=lich-su`
- **Vận hành (xem + in tem):** `/cssd-dung-cu` — không CRUD master

## Quy tắc liên kết

- Mỗi dòng chi tiết **bắt buộc** có `loai_dung_cu_id`.
- **D6:** một bộ chỉ có **một dòng active** cho mỗi loại (unique active 1 bộ×1 loại) — luật vĩnh viễn.
- Khi gắn vào bộ: `bo_dung_cu_id` phải trỏ bộ có `ma_bo` chuẩn A′.
- Nếu bộ có loại header (`bo.loai_dung_cu_id`), loại chi tiết phải **khớp** header.

## Phân biệt mã (tránh nhầm)

| Mã | Ý nghĩa | Dùng quét workflow? |
|----|---------|---------------------|
| `B01.SET.01` | Bộ (tem vĩnh viễn) | Có |
| `BV103-CYC-…` | Tem chu trình (Cycle QR) | Có |
| `LOT-…` | Phiếu mẻ tiệt khuẩn | Có (màn mẻ) |
| `TB-…` / `MAY-…` | Máy | Có (mẻ / bảo trì) |
| `DC-0001` | Chi tiết trong bộ | Không |
| `DM-xxxx` | Danh mục generic khác | Không |

## Quét QR vận hành (SSOT)

Mọi màn quét vận hành CSSD (chu trình, mẻ TK, truy vết, catalog RO, kho, bảo trì máy, sự cố an toàn, liên kết SSI) nhận diện mã qua **QR Hub** (`resolveCssdCodeWithClient`). Camera/ô nhập dùng chung `QrScanInput` / `QrCamera*`. Quản trị danh mục (CRUD) chỉ in/sửa mã — không thêm quét.

## Changelog ngắn (code sync)
- **2026-09-04:** Cổng cấp phát chặn gói ướt/rách/hỏng/quá hạn (`src/lib/domain/cssd-pack-issuance.ts`). BD đầu ngày steam qua `thiet_bi.specs` (`cssd-steam-daily-bd.ts`) — `KHONG_DAT` hoặc thiếu BD ĐẠT hôm nay chặn tạo/chốt nạp (QT.21 hard). Plasma cấm cellulose (`assertPlasmaPackMaterialAllowed`). RO «Rà soát (phiếu chờ)» / FEFO HC / reconcile reject move-only: verified OK.
