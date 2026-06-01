# Cẩm nang Kiến trúc Hybrid JSONB: Import / Export & Mở rộng Danh mục

Tài liệu này giải thích cách tiếp cận kiến trúc **Hybrid JSONB**, tại sao nó được chọn làm giải pháp cốt lõi cho KSNK BV103, và cách áp dụng nó cho các bài toán Import/Export Excel cũng như mở rộng các danh mục phức tạp như Nhân viên.

## 1. Kiến trúc Hybrid JSONB là gì? Tại sao lại dùng?

Thay vì lưu trữ dữ liệu theo mô hình truyền thống (mỗi thuộc tính là một cột phẳng - Flat columns) hoặc hoàn toàn NoSQL (mọi thứ nằm trong 1 file JSON lớn), chúng ta sử dụng mô hình **Lai (Hybrid)**:

*   **Cột phẳng (Flat Columns):** Dành riêng cho các trường định danh lõi (ID, Mã, Tên), các trường dùng để truy vấn `WHERE`, các trường đóng vai trò Khóa ngoại (`khoa_phong_id`, `chuc_danh_id`).
*   **Cột JSONB (`specs` / `metadata`):** Dành cho các thuộc tính phụ, thông số kỹ thuật (Kích thước, Trọng lượng, Số điện thoại, Bằng cấp) vốn hay bị thay đổi theo nghiệp vụ.

### Ưu điểm (Pros):
1.  **Tính toàn vẹn Dữ liệu (Referential Integrity):** Không bao giờ bị vỡ các truy vấn `JOIN` hoặc gãy liên kết (Foreign Keys) vì các ID lõi vẫn nằm ngoài cột phẳng.
2.  **Khả năng mở rộng vô hạn (Infinite Scalability):** Bệnh viện bổ sung thông số mới cho thiết bị? Thêm mới trường bằng cấp cho nhân viên? Chỉ việc chèn thêm 1 key mới vào JSONB mà không cần phải thực hiện `ALTER TABLE` làm khóa Database.
3.  **Tốc độ cao:** PostgreSQL xử lý JSONB với Index (GIN) cực kỳ nhanh.

### Nhược điểm (Cons):
1.  **Ràng buộc khóa ngoại mỏng:** Bạn không thể dễ dàng đặt ràng buộc (Foreign Key) cho một giá trị ID nằm sâu bên trong file JSONB.
2.  **Logic Ứng dụng phức tạp hơn:** Mã nguồn TypeScript phải tự bóc tách và gộp JSON khi ném xuống DB.

---

## 2. Hướng dẫn Xử lý Import / Export Excel với Hybrid JSONB

Khi cấu trúc Database đã chuyển sang Hybrid JSON, logic Import/Export (ví dụ bằng thư viện `xlsx`) tại phân hệ Quản trị Hệ thống sẽ thay đổi đôi chút:

### 2.1 Chiều Export (Tải về máy)
Thay vì chỉ query các cột phẳng, bạn lấy thêm cột `specs`. Tại lớp Repository/Action, bạn sẽ "trải phẳng" (Flatten) object JSON này ra thành các cột Excel:

```typescript
// Lấy dữ liệu từ DB
const data = await supabase.from('dm_loai_dung_cu').select('*');

// Trải phẳng ra cho Excel
const exportData = data.map(row => ({
  "Mã loại": row.ma_loai,
  "Tên loại": row.ten_loai,
  // Bóc tách JSON:
  "Kích thước": row.specs?.kich_thuoc || '',
  "Trọng lượng": row.specs?.trong_luong || '',
  "Hình dáng": row.specs?.hinh_dang || ''
}));
```
**Khó khăn:** Gần như không có! Thậm chí linh hoạt hơn vì bạn có thể tự động duyệt vòng lặp qua `Object.keys(row.specs)` để tạo ra số lượng cột Excel động (dynamic columns).

### 2.2 Chiều Import (Tải lên hệ thống)
Khi đọc file Excel từ người dùng tải lên, bạn sẽ gom các cột thông số dư thừa thành một cục Object JSON trước khi gọi hàm Insert:

```typescript
const payloadToInsert = excelRows.map(row => ({
  ma_loai: row["Mã loại"],
  ten_loai: row["Tên loại"],
  // Gom phần còn lại vào JSON:
  specs: {
    kich_thuoc: row["Kích thước"],
    trong_luong: row["Trọng lượng"],
    hinh_dang: row["Hình dáng"]
  }
}));

await supabase.from('dm_loai_dung_cu').insert(payloadToInsert);
```

---

## 3. Bài toán Danh mục Nhân viên (dm_nhan_vien)

Việc áp dụng Hybrid JSONB cho `dm_nhan_vien` (hay các danh mục lớn khác) là hoàn toàn khả thi và **RẤT NÊN LÀM**.

### Đề xuất Cấu trúc Hybrid cho Nhân viên:
**Giữ lại các Cột phẳng (Bắt buộc):**
*   `id`, `ma_nv`, `ten_nv`, `is_active` (Dùng để định danh)
*   `khoa_phong_id`, `chuc_danh_id` (Dùng để JOIN, lọc theo Khoa, phân quyền)
*   `user_auth_id` (Nối với bảng `auth.users` để đăng nhập)

**Nhét vào `specs jsonb` (Có thể tùy biến vô hạn):**
*   `so_dien_thoai`, `email`, `dia_chi`
*   `ngay_sinh`, `gioi_tinh`
*   `chung_chi_hanh_nghe`, `chuyen_mon`
*   `ngay_bat_dau_lam_viec`

Bằng cách này, nếu tương lai Bệnh viện yêu cầu quản lý thêm "Chứng chỉ đào tạo an toàn sinh học", lập trình viên chỉ việc nhét thêm key `chung_chi_ATSH` vào `specs` mà không đụng chạm một chút nào vào kiến trúc DB vật lý hiện tại.
