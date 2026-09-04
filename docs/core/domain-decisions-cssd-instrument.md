# Decision log — CSSD dụng cụ (Phase 0)

> **Chốt:** 2026-09-04 (PO duyệt mặc định Phase 0).  
> **Phạm vi:** ngôn ngữ + cửa nghiệp vụ + quyền master + BOM. Không đổi schema trong đợt này.  
> **SSOT hành trình:** [`domain-specification.md`](domain-specification.md) §2.2 · [`../modules/cssd/domain-overview.md`](../modules/cssd/domain-overview.md) · [`../modules/cssd/quan-ly-dung-cu-luong.md`](../modules/cssd/quan-ly-dung-cu-luong.md).  
> **Ánh xạ kỹ thuật:** [`implementation-mapping.md`](implementation-mapping.md) § CSSD (changelog lịch sử giữ nguyên; trang này là quyết định chốt).

---

## Bảng quyết định D1–D10

| ID | Quyết định | Hệ quả ngắn |
|----|------------|-------------|
| **D1** | Tách ngôn ngữ: **«Sự cố an toàn»** ≠ **«Phiếu đổi danh mục»** ≠ **«Phiếu chuyển kho/bộ»** ≠ **«Hỏng/Mất»**. | Không gọi mọi biến động dụng cụ là «sự cố». |
| **D2** | Giữ đúng **3 cửa** nghiệp vụ dụng cụ: **Đổi danh mục** · **Hỏng/Mất** · **Chuyển**. | Đồng bộ doc; bỏ nói 2/3 lẫn trên UI/SSOT hiện hành. |
| **D3** | `BO_SUNG` / `TRA_KHO` / `DIEU_CHUYEN` **chỉ** thuộc cửa **Chuyển (Move)**. | Không đưa Lấy kho / Trả kho / Điều chuyển lên phiếu rà soát / đổi danh mục. |
| **D4** | Legacy `INSTRUMENT_TRANSFER` / `REPLENISH` / `BROKEN` / `MISSING` giữ mã lịch sử. | UI mới chỉ **`SET_RECONCILE`** + **`MOVE`**. |
| **D5** | Hard-write master loại / bộ / BOM (**CRUD form**) chỉ **ADMIN**. | `BO_DC.edit` = **duyệt phiếu** rà soát → `applyApprovedBomLines`, không mở form master. |
| **D6** | BOM **1 bộ × 1 loại** (unique active) là **luật vĩnh viễn**. | Không cho nhiều dòng active cùng loại trong một bộ. |
| **D7** | Dual-code bridge giữ (`B01.SET.*` ↔ `B01.CD*` ↔ `BO-01-*`, QR Hub). | Không mở catalog TSCĐ/BHYT mới. |
| **D8** | Soft-warning thiếu cấu phần (QLDCPT Q2) giữ — không hard-block đóng gói/cấp phát. | `bom_kiem_dem_at` = audit, không gate. |
| **D9** | **QC trạm** (QT.19) ≠ **QC mẻ** / nhãn (QT.23). | Không thay QC mẻ bằng trạm `QC`. |
| **D10** | CCS bỏ khỏi UI user. | Không lộ CCS trên màn vận hành người dùng. |

---

## IA Quản trị danh mục dụng cụ (đồng bộ D5)

| Mặt trước | Vai trò |
|-----------|---------|
| Tab **Bộ** (mặc định) | Xem/sửa cấu trúc bộ (hard-write = ADMIN) |
| Tab **Phiếu** (`?tab=phieu`) | Phiếu chờ duyệt đổi danh mục |
| Tab **Lịch sử** (`?tab=lich-su`) | Nhật ký duyệt / áp dụng |
| Sheet **Loại** (`?sheet=loai`) | CRUD loại — **ADMIN**, không tab ngang hàng |

Vận hành RO: `/cssd-dung-cu`. Ba cửa biến động: `/cssd-su-co` (nhóm Dụng cụ).

---

## Không làm trong Phase 0

- Rewrite lớn `src/` / đổi schema DB.
- Gộp lại Hỏng/Mất vào «sự cố quy trình».
- Đưa move-codes lên phiếu rà soát.
