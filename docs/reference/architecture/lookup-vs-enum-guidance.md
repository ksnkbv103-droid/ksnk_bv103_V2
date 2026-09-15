# Hướng dẫn: danh mục nhỏ — bảng / lookup / gắn cứng

> 2026-09-07 · Hướng dẫn kiến trúc (không đổi schema trong note này). Kế hoạch unification cũ: [`../../archive/agent-notes/202609/_agent-lookup-ssot-unification-plan-20260907.md`](../../archive/agent-notes/202609/_agent-lookup-ssot-unification-plan-20260907.md) (kho lưu).

## Thực tế trong BV103 hôm nay

Nhiều tên như `mdm_dm_chuc_vu`, `qlcv_dm_loai_cong_viec`, `gstt_dm_hinh_thuc_giam_sat` **không phải bảng vật lý riêng**. Chúng là **VIEW** lọc từ **một bảng** `sys_lookup_value` theo `category_type`. Ghi qua `master-crud-core` → `sys_lookup_value`.

**QLCV trạng thái / loại công việc:** luồng chính đã dùng **mã gắn trong code** (`DINH_KY|DOT_XUAT|KHAN_CAP`, Kanban cột trạng thái chuẩn hóa) + cột text/CHECK trên fact — trong khi hub vẫn còn loại lookup `LOAI_CONG_VIEC` / `TRANG_THAI_CONG_VIEC` (trạng thái đã **khóa hệ thống**). Đây là chỗ dễ thấy «thừa / rối».

---

## Ba tầng nên phân biệt

| Tầng | Khi nào | Ví dụ | Sửa không đụng code? |
|------|---------|--------|----------------------|
| **A. Enum / mã quy trình** | Ít giá trị; đổi mã = đổi logic app (Kanban, quyền, spawn định kỳ) | Trạng thái CV, loại CV DINH_KY… | **Không** (đúng vậy) — đổi = release |
| **B. Lookup phẳng (1 bảng nhiều loại)** | Chỉ mã+tên (+metadata nhẹ); admin thỉnh thoảng thêm/đổi nhãn | Chức vụ, tổ, khối khoa, hình thức/cách thức GS, loại máy TK | **Có** — CRUD danh mục |
| **C. Bảng master thật** | Nhiều thuộc tính, quan hệ, số lượng lớn | Khoa phòng, loại dụng cụ, bộ, bảng kiểm, nhân sự | **Có** — form chuyên |

---

## Ưu / nhược

### Gắn cứng (tầng A)
- **Ưu:** Đơn giản, nhanh, không phát sinh bảng, logic rõ, ít lỗi cấu hình.
- **Nhược:** Đổi nhãn/mã phải sửa code + kiểm thử; không «tự thêm cột trạng thái» trên UI.

### Lookup chung `sys_lookup_value` (tầng B) — **đã là hướng dung hòa của project**
- **Ưu:** **Không** nhân bảng vật lý; sửa/thêm dòng trên UI; một chỗ quản trị; view `*_dm_*` chỉ để đọc quen tên.
- **Nhược:** Hub hiện nhiều «ô» → cảm giác vụn; dễ nhầm với bảng thật; nếu dùng cho mã **quy trình** (tầng A) sẽ lệch code.

### Bảng riêng mỗi loại (sai hướng với danh mục nhỏ)
- **Ưu:** Hầu như không — trừ khi có cột nghiệp vụ riêng.
- **Nhược:** Schema phình, migration nhiều, trùng pattern CRUD.

---

## Khuyến nghị cho câu hỏi của bạn

1. **Không cần** sinh thêm bảng nhỏ cho trạng thái / loại công việc.  
2. **Loại + trạng thái QLCV:** giữ **gắn cứng / CHECK** (tầng A). Ẩn hoặc đánh dấu «hệ thống — không sửa mã» trên hub; nhãn hiển thị map trong code (hoặc chỉ cho sửa **nhãn** trong metadata, không cho thêm mã mới tùy tiện).  
3. **Khối khoa, tổ, chức vụ, hình thức/cách thức GS, loại máy:** giữ **lookup `sys_lookup_value`** (tầng B) — đúng nhu cầu «sửa được không đụng codebase» mà **không** thừa bảng vật lý.  
4. **Tinh gọn UX (không đập schema):**  
   - Hub: nhóm «Tổ chức» / «Giám sát» / «CSSD lookup» thay vì liệt kê 15 ô ngang hàng.  
   - Không mở CRUD cho loại đã khóa quy trình.  
   - Không tạo TABLE mới cho 3–5 dòng chỉ có mã+tên.

## Công thức quyết định nhanh

```
Đổi giá trị có phá Kanban / quyền / spawn / báo cáo cứng?
  → Có  → Enum + CHECK (tầng A)
  → Không, chỉ đổi tên/thêm mục nhãn?
       → Có thuộc tính/quan hệ phức tạp?
            → Có  → Bảng master (tầng C)
            → Không → sys_lookup_value (tầng B)
```

## Việc có thể làm sau (khi bạn chốt)

- Gỡ/ẩn hub CRUD `LOAI_CONG_VIEC` / `TRANG_THAI_CONG_VIEC` khỏi mặt admin (giữ view đọc nếu cần tương thích).  
- Gộp IA hub lookup theo nhóm.  
- Không migrate «gom bảng» vì hầu hết đã gom sẵn vào `sys_lookup_value`.
