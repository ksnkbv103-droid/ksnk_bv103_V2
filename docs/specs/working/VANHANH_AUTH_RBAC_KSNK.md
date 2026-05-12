# Vận hành — Đăng nhập, quên mật khẩu và phân quyền KSNK

Tài liệu ngắn cho đầu mối quản trị (phiên bản bám codebase hiện tại).

## 1) Đăng nhập

- Người dùng nhập **mã nhân viên (`ma_nv`)** hoặc **email** đã gắn với tài khoản Supabase Auth.
- Hồ sơ nhân sự (`mdm_nhan_su`) phải có **email** chuẩn (thường là chữ thường sau khi chạy migration chuẩn hóa).
- Khi đăng nhập bằng mã NV, máy chủ tra email tương ứng (chỉ trên máy chủ, không hiển thị ra trình duyệt).

## 2) Tạo tài khoản cho nhân viên

1. Vào **Quản trị → Tài khoản và vai trò KSNK** (`/quan-tri-he-thong/tai-khoan-nhan-su`).
2. Cần có quyền **Phân quyền — Sửa** hoặc vai trò quản trị (cùng chuẩn với màn Phân quyền).
3. Với nhân viên **chưa liên kết** tài khoản: nhập mật khẩu ban đầu (tối thiểu 8 ký tự) → **Tạo TK**.
4. Gán **một** vai trò KSNK hệ thống (dropdown): `NHAN_VIEN_KSNK`, `MANG_LUOI_KSNK`, `TO_TRUONG_MANG_LUOI_KSNK`, `THANH_VIEN_MANG_LUOI_KSNK`, `HOI_DONG_KSNK`.

Sau khi bấm **Đồng bộ registry** trên ma trận RBAC, hệ thống cập nhật lại ma trận mặc định cho các vai trò KSNK (idempotent).

## 3) Quên mật khẩu (email)

1. Trang **Quên mật khẩu** (`/login/forgot-password`).
2. Nhập email đã đăng ký trong Supabase Auth.
3. Hệ thống gửi email (cần SMTP / template hợp lệ trong cấu hình Supabase).

**Chú ý:** biến môi trường ứng dụng web nên có `NEXT_PUBLIC_SITE_URL` đúng địa chỉ truy cập (HTTPS khi đã có SSL), và trong Supabase Dashboard thêm Redirect URL ví dụ: `https://<site>/login/reset-password`.

## 4) Đổi mật khẩu sau khi đăng nhập

- Header → **Đổi MK** hoặc trực tiếp `/tai-khoan/doi-mat-khau`.
- Phải nhập **mật khẩu hiện tại** đúng và **mật khẩu mới** (≥ 8 ký tự).

## 5) Nhân sự không còn hoạt động

- Trường `is_active = false` trên `mdm_nhan_su`: sau khi kiểm tra phiên, ứng dụng có thể đăng xuất và yêu cầu đăng nhập lại.

## 6) Kiểm thử ngắn sau triển khai

| Kịch bản | Kỳ vọng |
|---------|---------|
| Đăng nhập sai mật khẩu | Thông báo lỗi chung |
| NV ngừng hoạt động | Không vào được ứng dụng hoặc bị đăng xuất |
| HOI_DONG_KSNK | Menu/chức năng chỉ ở mức xem (VIEW) đã gán trong ma trận |
| NHAN_VIEN_KSNK / mạng lưới | Thao tác theo vai trò đã gán |
| Sync registry | ADMIN đủ quyền + các vai trò KSNK có bản ghép mặc định |

## 7) Cấu hình cần có

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (chỉ máy chủ — tạo tài khoản / tra cứu khi đăng nhập bằng mã NV)
- `NEXT_PUBLIC_SITE_URL` (khuyến nghị cho link email reset)
