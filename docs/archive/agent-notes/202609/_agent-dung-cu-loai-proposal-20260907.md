> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/README.md`](../../../modules/cssd/README.md) · quyết định dụng cụ [`core/domain-decisions-cssd-instrument.md`](../../../core/domain-decisions-cssd-instrument.md). Tra cứu lịch sử được.

# Đề xuất lại module Quản lý dụng cụ (2026-09-07)

## 1. Trả lời thẳng câu hỏi

### Có mất danh mục loại không?
**Không mất dữ liệu / không mất code CRUD.** Bảng `cssd_dm_loai_dung_cu` vẫn là SSOT. Form thêm–sửa–xóa mềm loại vẫn trong `LoaiDungCuPage` / `loai-dung-cu.actions.ts`. Danh sách loại trên CSSD vận hành vẫn có cột **Tổng / Trong bộ / Trong kho**.

### Vì sao nhìn như «không có»?
Ngày **2026-09-03**, hướng đơn giản hóa catalog (giống app bệnh nhân, ít màn) gồm: **ẩn tab Loại** khỏi mặt trước; chỉ giữ 3 lớp **Bộ → Rà soát → Lịch sử**; Loại trở thành **sheet phụ chỉ ADMIN** (`?sheet=loai`). Hub «Quản lý dụng cụ» cũng chỉ trỏ lớp Bộ.

Hệ quả thực tế:
- Quản trị: không còn tab ngang hàng «Loại» → khó tìm; chỉ mở qua nút/sheet ẩn nếu là admin.
- `/cssd-dung-cu`: nút tab chỉ còn «Bộ dụng cụ» và «Lịch sử»; nhánh `tab === LOAI` gần như **không còn cửa vào** (nút Bộ gộp cả trạng thái LOAI nhưng `onClick` luôn `setTab("BO")`).

→ **Không phải bạn yêu cầu xóa hẳn loại.** Là **giấu cửa vào** trong đợt gọn UX — và cách giấu đã quá mạnh, làm mất vai trò trung tâm của loại.

### Có sửa được nội dung trên danh mục loại không?
**Có** (admin, qua sheet/form còn lại), nhưng **cửa vào hiện không rõ** nên cảm giác như không quản lý được.

---

## 2. Vai trò khoa học của «Loại» (nên giữ làm trung tâm)

```
Loại dụng cụ (SKU / danh mục chuẩn)
   ├─ thuộc nhiều Bộ (BOM: loại × số lượng chuẩn)
   ├─ tồn Kho dự phòng (theo loại)
   └─ số liệu: Tổng = Trong bộ + Trong kho (+ biến động sự cố)
Bộ dụng cụ = túi/khay vận hành (khoa, mã bộ, QR)
Chi tiết dòng bộ = chỉ là dòng BOM gắn loại (không thay thế danh mục loại)
```

Không có mặt **Loại** rõ ràng thì không trả lời được: loại này có bao nhiêu, bao nhiêu trong bộ, bao nhiêu trong kho — đúng đúng nhu cầu bạn nêu.

---

## 3. Phương án đề xuất (một cửa, tách bạch việc)

### Nguyên tắc
1. **Loại = trung tâm danh mục** (định nghĩa + số liệu tồn).
2. **Bộ = trung tâm vận hành** (khay/túi, QR, phân khoa, thành phần).
3. Giữ **3 cửa sự cố** đã chốt: Đổi danh mục (phiếu duyệt) | Chuyển (kho/bộ↔bộ) | Hỏng–Mất — **không** nhét chuyển kho vào form bộ.
4. Care-bundle / gắn cờ khác: **không** trộn vào module này.
5. Ít màn, một hàng một thực thể, một hành động chính (vẫn giữ tinh thần app bệnh nhân) — nhưng **không được giấu thực thể trung tâm**.

### Mặt Quản trị (`/quan-tri-he-thong/danh-muc/dung-cu`)
| Tab ngang hàng | Ai dùng | Việc chính |
|----------------|---------|------------|
| **Loại** | Admin (sửa); điều dưỡng có thể xem nếu cần | 1 dòng = 1 loại; cột Tổng / Trong bộ / Trong kho; Dialog sửa thuộc tính (mã, tên, hình dáng, kích thước, Spaulding, tiệt khuẩn…) |
| **Bộ** | Admin + người được quyền | Danh sách bộ; mở Dialog thành phần (BOM theo loại); phiếu đổi DM |
| **Rà soát** | Admin | Duyệt phiếu đổi danh mục |
| **Lịch sử** | Admin / xem | Phiếu đã duyệt / thay đổi số lượng |

Hub: một ô «Quản lý dụng cụ» vào tab **Loại** (hoặc Bộ — nhưng **không** được mất link Loại trên tab).

### Mặt CSSD vận hành (`/cssd-dung-cu`)
| Tab | Việc |
|-----|------|
| **Loại** (xem) | Tra cứu số liệu Tổng / Trong bộ / Trong kho; chọn loại → xem bộ đang chứa |
| **Bộ** | Tra cứu bộ + thành phần; đề nghị đổi DM; không sửa master loại tại đây |
| **Lịch sử** | Luân chuyển |

Sửa master loại **chỉ** ở Quản trị (hoặc phiếu), tránh hai form lệch nhau.

### Việc không làm trong vòng này
- Đổi schema lớn / đổi mã loại hàng loạt.
- Gắn care bundle.
- Viết lại toàn bộ CSSD ERP.

### Việc làm ngay nếu bạn chốt (local, không commit)
1. Trả **tab Loại** ngang hàng trên Quản lý dụng cụ (không chỉ sheet ẩn).
2. Nút mở Loại rõ trên header Bộ (nếu cần shortcut).
3. Trên `/cssd-dung-cu`: tách nút tab **Loại** (xem số liệu) khỏi nút **Bộ**.
4. Hub / deep-link `/dung-cu/loai` → tab Loại thật, không chỉ sheet.
5. Một lần kiểm thử: tạo/sửa loại → thấy số liệu trên dòng loại.

---

## 4. Vì sao sửa đi sửa lại mãi?
Đổi UX theo «ít tab» mà **chưa khóa lại mô hình miền** (Loại là trung tâm). Lần này khóa mô hình trước, rồi mới sửa cửa vào — tránh đập đi xây lại.

## 5. Quyết định cần bạn chọn
- **A (khuyến nghị):** Trả Loại làm tab ngang hàng + CSSD có tab xem Loại (số liệu).
- **B:** Giữ sheet phụ nhưng **nút «Danh mục loại» rất rõ** trên trang Bộ (nhanh hơn A một chút, vẫn dễ quên).
- **C:** Tách hẳn trang riêng `/dung-cu/loai` như thiết bị/hóa chất (rõ nhất, thêm một điểm vào hub).

---

## 6. Đã triển khai A (2026-09-07, local)

Chốt **A**: Loại lại là **tab ngang hàng**.

- **Quản trị** `/quan-tri-he-thong/danh-muc/dung-cu`: tab **Loại | Bộ | Rà soát | Lịch sử**. `quanTriDungCuHref("loai")` → `?tab=loai`. Legacy `?sheet=loai` normalize về tab Loại (không Dialog sheet bắt buộc). Xem Loại cần `LOAI_DC` view; sửa master vẫn admin trong `LoaiDungCuPage`.
- **CSSD ops** `/cssd-dung-cu`: tab **Loại | Bộ | Lịch sử** (Loại = `CSSDCatalogLoaiTab`, view-only).
- Hub `/dung-cu/loai` redirect → `?tab=loai`.
