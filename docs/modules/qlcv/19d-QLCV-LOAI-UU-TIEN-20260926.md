# 19d — QLCV: loại công việc · ưu tiên · link Quản trị danh mục (PO 2026-09-26)

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 · 2026-09-26 · **PO default A applied** |
| Chủ sở hữu | KSNK Soft · Domain |
| Neo | Bổ sung `19` + `19b` + `19c` (gói A đã chốt). Lead đã áp gói A trên code. |
| Nguồn khảo sát | Lead tip Mac: `QlcvDmAdminLinks` · CHECK `loai_cong_viec` · `muc_do_uu_tien` · view `qlcv_dm_loai_cong_viec` |
| Thanh PO | (1) Link QLCV → Quản trị Loại/Trạng thái có cần? (2) Bỏ/đơn giản bảng loại mà sau đổi được? (3) Loại vs ưu tiên trùng? (4) Tinh túy Asana / Linear / Todoist |
| Trạng thái | **Applied — gói A** (Lead default; PO không chọn). Không link Quản trị Loại + Trạng thái từ QLCV. |

> **Applied note (Lead 2026-09-26 +07):** L-AB1A + L-AB2A + L-AB3A — gỡ `QlcvDmAdminLinks` (Loại + Trạng thái); khóa `LOAI_CONG_VIEC` trong `LOCKED_SYSTEM_LOOKUP_LOAI`; form tạo ưu tiên nổi, không chọn Khẩn; không taxonomy nghiệp vụ mới.

## §1. Tinh túy thị trường (mang vào QLCV KSNK)

| App | Tinh túy | Áp vào BV103 |
|-----|----------|--------------|
| **Todoist** | Việc = tiêu đề + hạn + ưu tiên (P1–P4); ít «loại hình» cứng | Form tạo: tiêu đề · phụ trách · hạn · **ưu tiên nổi** |
| **Linear** | Priority riêng urgency; status workflow cố định; label linh hoạt | 7 TT khóa (đã 19); **không** CRUD trạng thái tự do trên Quản trị |
| **Asana** | Project/container + assignee; custom field tùy team | Container = Nhiệm vụ (19c); label/taxonomy nghiệp vụ = **P1**, không bắt trên form tạo |

**Không** copy full taxonomy admin kiểu «mọi danh mục đều CRUD». Chỉ khóa những thứ engine/Kanban phụ thuộc CHECK.

## §2. Hiện trạng (fact Lead, Domain xác nhận hướng)

| Thành phần | Vai trò thật | Vấn đề |
|------------|--------------|--------|
| `loai_cong_viec` | CHECK cố định `DINH_KY` \| `DOT_XUAT` \| `KHAN_CAP` — **cách sinh / nhịp**, không phải chủ đề nghiệp vụ | UI gọi «Loại công việc» dễ hiểu nhầm = Giám sát/Họp… |
| `qlcv_dm_loai_cong_viec` | View lookup **nhãn** cho 3 mã trên | CRUD tự do trên Quản trị → lệch CHECK / Kanban |
| `QlcvDmAdminLinks` | Hub QLCV → danh mục LOAI + TRANG_THAI | Gợi ý PO «cấu hình loại/TT» trong khi domain muốn **khóa** |
| `muc_do_uu_tien` | `THAP` \| `TRUNG_BINH` \| `CAO` — **mức khẩn của phiếu** | Đang nằm «Thêm chi tiết» (19b) → cảm giác «mất ưu tiên» |
| Trùng nghĩa | `KHAN_CAP` (loại) ≈ urgency của `CAO` (ưu tiên) | Hai chỗ cùng nói «khẩn» → rối |

## §3. Phân tầng khái niệm (Domain)

| Khái niệm | Trường | Ý nghĩa | Ai thấy lúc tạo |
|-----------|--------|---------|-----------------|
| **Cách sinh** | `loai_cong_viec` | Thường / từ mẫu định kỳ (nội bộ) | **Ẩn** chọn tay; hệ thống gán |
| **Mức ưu tiên** | `muc_do_uu_tien` | Thấp / TB / Cao — sắp xếp & lọc | **Nổi** trên form (sau gói A) |
| **Chủ đề nghiệp vụ** | Không thêm enum tự do | Giám sát, họp, đào tạo… | Nhiệm vụ / label **P1** nếu cần |
| **Trạng thái** | 7 mã TT | Workflow phiếu | Không CRUD trên Quản trị từ QLCV |

Quy tắc gán `loai_cong_viec` (A khuyến nghị):

- Việc thường tạo tay → mặc định **`DOT_XUAT`** (không hỏi Đột xuất/Khẩn trên form).
- Việc từ mẫu định kỳ → **`DINH_KY`** (giữ 19c TAC-1A).
- Mã **`KHAN_CAP`**: giữ legacy / báo cáo cũ; **tạo mới** thể hiện «khẩn» bằng ưu tiên **`CAO`** (không bắt chọn loại Khẩn).

## §4. Quy tắc L-xx

| ID | Mức | Quy tắc | IN | OUT |
|----|-----|---------|----|-----|
| L-01 | P0 | Không mở CRUD tự do `LOAI_CONG_VIEC` / `TRANG_THAI_CONG_VIEC` từ hub QLCV | View nhãn + seed cố định | Admin thêm mã loại/TT mới làm lệch CHECK |
| L-02 | P0 | Ẩn hoặc gỡ `QlcvDmAdminLinks` khỏi trang QLCV (hoặc chỉ còn link danh mục **không** ảnh hưởng CHECK — nếu còn thì ghi rõ «chỉ nhãn») | Form sạch | PO tưởng phải cấu hình loại trước khi dùng |
| L-03 | P0 | Form tạo: **ưu tiên nổi** (CAO / TB / THAP); default TB | Todoist-like | Ưu tiên chìm «Thêm chi tiết» khiến cảm giác mất |
| L-04 | P0 | Form tạo: **không** bắt chọn loại hình Đột xuất/Khẩn | `DOT_XUAT` mặc định | Hai control trùng «khẩn» |
| L-05 | P1 | Taxonomy chủ đề (Giám sát/Họp…) — **không** thêm cột loại nghiệp vụ MVP | Gắn Nhiệm vụ hoặc label sau | Bảng loại tự do song song CHECK |

## §5. A/B (Lead lấy A nếu PO không chọn)

| # | A — Domain + Lead khuyến nghị | B |
|---|-------------------------------|---|
| **L-AB1** | **Ẩn/gỡ** `QlcvDmAdminLinks`; **khóa** CRUD `LOAI_CONG_VIEC` (giữ view nhãn 3 mã). Trạng thái: không CRUD từ QLCV | Giữ link Quản trị Loại + Trạng thái như hiện tại (PO tự sửa danh mục) |
| **L-AB2** | Form tạo: **ưu tiên nổi**; **không** chọn loại Đột xuất/Khẩn; thường=`DOT_XUAT`; `DINH_KY` chỉ từ mẫu; `KHAN_CAP` legacy, tạo mới dùng ưu tiên CAO | Giữ chọn loại (3 giá trị) trên form; ưu tiên vẫn «Thêm chi tiết» |
| **L-AB3** | **Không** thêm taxonomy loại nghiệp vụ tự do (Giám sát/Họp…) ở MVP — dùng Nhiệm vụ / label P1 | Thêm danh mục «loại nghiệp vụ» CRUD riêng (tách khỏi CHECK cách sinh) |

**Gói A mặc định** = L-AB1A + L-AB2A + L-AB3A.

## §6. Sau khi chốt — DoD Lead (Domain không code)

1. UI: bỏ hoặc ẩn hub danh mục LOAI/TT trên trang QLCV theo L-AB1.
2. Form tạo: ưu tiên nổi theo L-AB2; loại hình không bắt chọn (default `DOT_XUAT`).
3. Docs/code comment: `loai_cong_viec` = cách sinh; `muc_do_uu_tien` = urgency.
4. Không migration phá dữ liệu `KHAN_CAP` cũ.
5. Mirror docs: `docs/modules/qlcv/19d-…` khi Lead sync.

## §7. Liên hệ gói A đã chốt (19b/19c)

Không đụng: tiêu đề + 1 phụ trách + hạn bắt buộc · phối hợp/NV optional · ẩn địa điểm/vị trí/tổ/theo dõi · kết quả khi đóng · định kỳ hẹp · stats MVP · 7 TT.

19d chỉ tách **loại vs ưu tiên** và **link Quản trị** cho khỏi rối với gói A.
