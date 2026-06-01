# CẨM NANG VẬN HÀNH, BẢO MẬT & DB THỐNG NHẤT — KSNK BV103

> **Phiên bản:** 1.0 (20/05/2026)  
> **Trạng thái:** Hoạt động (SSOT Bảo mật, Vận hành & Dữ liệu)  
> **Được hợp nhất từ:** Các SOP vận hành, bảo mật và cơ sở dữ liệu cũ (`DB_SYNCHRONIZATION_SOP.md`, `VANHANH_AUTH_RBAC_KSNK.md` và các sổ tay dữ liệu cũ).

---

## 1. Hướng dẫn Vận hành Auth & Phân vai trò (RBAC)

Hệ thống y tế KSNK BV103 quản lý tài khoản người dùng tích hợp với mã định danh nhân viên thông qua phân hệ quản trị hệ thống (`quan-tri-he-thong/tai-khoan-nhan-su/`).

### 1.1 Khớp nối Nhân sự y tế & Tài khoản
* Thông tin nhân sự lâm sàng được lưu trữ tại bảng lõi **`mdm_nhan_su`**, liên kết chặt chẽ với ID xác thực của Supabase (`auth_user_id`).
* Địa chỉ email y tế (`email`) được chuẩn hóa định dạng chữ thường, tự động kiểm tra tính duy nhất trên môi trường hoạt động thông qua ràng buộc cơ sở dữ liệu.

### 1.2 Ma trận phân vai trò y tế (Role-Based Access Control - RBAC)
Hệ thống định nghĩa các vai trò y tế cụ thể với các quyền hạn nghiêm ngặt tương ứng:

| Vai trò y tế | Mã phân quyền | Mô tả Quyền hạn Nghiệp vụ |
| :--- | :--- | :--- |
| **Lãnh đạo khoa KSNK** | `KSNK_ADMIN` | Toàn quyền cấu hình danh mục y tế, phê duyệt đề xuất công việc, xem dashboard chỉ huy cấp cao. |
| **Giám sát viên KSNK** | `GIAM_SAT_VST`, `GIAM_SAT_NKBV` | Thực hiện các phiên chấm điểm tuân thủ VST y tế, ghi nhận ca bệnh lâm sàng, xem báo cáo tuân thủ. |
| **Nhân viên trạm CSSD** | `BAO_SU_CO`, `KSNK_KHO_HOACHAT` | Đóng gói dụng cụ y tế, quét mã vạch QR quy trình hấp sấy, báo cáo sự cố tiệt khuẩn, xuất nhập hóa chất. |
| **Nhân viên khoa Lâm sàng** | `XEM_LICH_SU` | Xem lịch sử tiệt khuẩn của dụng cụ thuộc khoa phòng mình quản lý, không có quyền chỉnh sửa. |

Mọi phân vai trò này được đồng bộ tự động thông qua hàm đăng ký vai trò hệ thống tại `rbac-registry-sync` và được bảo vệ nghiêm ngặt ở lớp Database bằng RLS (Row Level Security).

---

## 2. Quy chuẩn Đồng bộ Dữ liệu & Kiểm soát Schema (SOP DB)

Để loại bỏ hoàn toàn lỗi gãy ứng dụng (crash runtime) do lệch cấu trúc bảng (schema drift), mọi thành viên phát triển bắt buộc phải tuân thủ quy trình đồng bộ DB nghiêm ngặt:

### 2.1 Nguyên tắc "3 KHÔNG" về Dữ liệu
1. **KHÔNG chạy SQL "nóng" bằng tay** trực tiếp trên database remote (Staging, Production/Pilot) mà không tạo file migration.
2. **KHÔNG merge Pull Request đụng DB** khi chưa chạy thành công precheck kiểm tra tính toàn vẹn dữ liệu.
3. **KHÔNG dùng tài liệu tĩnh làm SSOT**. Lịch sử file migration trong git (`supabase/migrations/`) và database thực tế mới là Single Source of Truth duy nhất.

### 2.2 Quy trình 4 bước Đồng bộ Database
1. **Tạo Migration local:** Sử dụng lệnh `npx supabase migration new <ten_nghiep_vu>` để khởi tạo file SQL mới.
2. **Migrate cục bộ:** Sử dụng lệnh `npm run mdm:migrate:local` để apply thay đổi lên môi trường local và chạy unit test kiểm chứng logic.
3. **Chạy Precheck Schema:** Chạy lệnh `npm run trial:db:precheck:local` để xác thực toàn bộ RPC, View và khóa ngoại (FK) cần thiết.
4. **Deploy & Sync Remote:** Chạy lệnh `npm run mdm:migrate` để apply đồng bộ lên DB remote y tế, kết hợp kiểm tra hậu migration (`npm run mdm:postcheck:sql`).
5. **Auth pilot:** `npm run trial:auth:precheck` (linked) — khớp `auth.users` ↔ `mdm_nhan_su.email`.

---

## 3. Sổ tay Tối ưu Cơ sở dữ liệu (Smart DB Playbook)

Để tối ưu hóa tốc độ phản hồi lâm sàng, hệ thống áp dụng các kỹ thuật thiết kế Database thực dụng:
* **Tận dụng tối đa View (`v_*_full`):** Gom các liên kết join phức tạp giữa bảng `fact_*` và danh mục `dm_*` vào tầng cơ sở dữ liệu, giúp mã nguồn Next.js chỉ việc select đơn giản, tăng khả năng bảo trì.
* **Index có chủ đích (Covering Indexes):** Thiết lập chỉ mục trên các cột khóa ngoại lâm sàng thường xuyên bị lọc (như `khoa_id`, `ngay_giam_sat`, `ma_loai_danh_muc`) để tối ưu hóa thời gian thực thi của RPC.
* **Kiểm soát Supabase Admin Client (Service Role Bypass):** Hạn chế tối đa việc sử dụng Supabase Admin Client có quyền năng tối cao (`service_role` key) ở phía Server Next.js. Mọi trường hợp bắt buộc phải sử dụng cần được thẩm định bảo mật kỹ lưỡng và chỉ khai báo tại các Server Action nội bộ được cô lập hoàn toàn.
