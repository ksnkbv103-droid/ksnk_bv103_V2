# BÀO GIAO & LỘ TRÌNH PHÁT TRIỂN THỐNG NHẤT — KSNK BV103

> **Phiên bản:** 1.0 (20/05/2026)  
> **Trạng thái:** Hoạt động (SSOT Bàn giao & Lộ trình Dự án)  
> **Được hợp nhất từ:** Các báo cáo tiến độ, kế hoạch bàn giao và tài liệu handover cũ (`PROGRESS_REPORT.md`, `MASTER_COMPLETION_PLAN.md` ở root và `KSNK_BV103_HANDOVER_PART*` cũ).

---

## 1. Tổng quan Dự án & Cấu trúc Mã nguồn

Hệ thống KSNK BV103 là giải pháp quản lý kiểm soát nhiễm khuẩn toàn diện cho Bệnh viện 103, được phát triển trên nền tảng Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase.

### 1.1 Sơ đồ thư mục y tế & kỹ thuật của hệ thống
Mã nguồn ứng dụng được tổ chức khoa học theo mô hình domain:
* `/src/app/` : Các route mỏng định tuyến cho ứng dụng.
* `/src/modules/` : Chứa toàn bộ logic nghiệp vụ lâm sàng (DDD):
  * `auth/` : Đăng nhập y tế, đổi mật khẩu và quản lý phiên.
  * `dashboard/` : Command Center hiển thị KPI, biểu đồ Recharts và tích hợp các RPC dữ liệu.
  * `giam-sat-vst/` : Phiên quan sát tuân thủ vệ sinh tay WHO.
  * `giam-sat-chung/` : Chấm điểm checklist động (bảng kiểm).
  * `giam-sat-nkbv/` : Ghi nhận ca bệnh nhiễm khuẩn bệnh viện (HAI).
  * `cssd-erp/` : Quản lý vòng đời tiệt khuẩn dụng cụ, sự cố, thiết bị và kho hóa chất.
  * `quan-ly-cong-viec/` : Quản lý công việc nội bộ KSNK theo quy trình Track B.
  * `quan-tri-he-thong/` : Quản trị danh mục MDM, bảng kiểm, nhân sự và tài khoản RBAC.

### 1.2 Hướng dẫn Thiết lập Môi trường Nhanh (Onboarding)
1. Sao chép tệp biến môi trường mẫu:
   ```bash
   cp .env.example .env.local
   ```
2. Khởi tạo môi trường Supabase:
   ```bash
   npm run trial:prep
   ```
3. Chạy môi trường phát triển cục bộ:
   ```bash
   npm run dev
   ```

---

## 2. Đặc tả Dữ liệu Lõi Tham chiếu (Database Reference)

Database được tổ chức thành 2 nhóm bảng chính: Danh mục (`dm_*`) và Bảng thực tế (`fact_*`):

| Loại Bảng | Tên Bảng Runtime | Ý nghĩa Lâm sàng / Nghiệp vụ |
| :--- | :--- | :--- |
| **MDM** | `dm_khoa_phong` | Danh mục khoa phòng Bệnh viện 103 (liên kết qua `v_dm_khoa_phong_full`). |
| **MDM** | `mdm_nhan_su` | Hồ sơ nhân sự y tế toàn viện, liên kết tài khoản hệ thống. |
| **CSSD** | `fact_quy_trinh` | Vòng đời và trạm hiện tại của bộ dụng cụ y tế vật lý (nhãn QR). |
| **CSSD** | `fact_lo_tiet_khuan` | Thông tin mẻ tiệt khuẩn, lịch sử hấp sấy và kết quả test QC lò. |
| **CSSD** | `fact_su_co` | Nhật ký ghi nhận sự cố rách gói/ẩm mốc dụng cụ lâm sàng. |
| **Giám sát** | `fact_giam_sat_vst_sessions` | Phiên giám sát vệ sinh tay WHO (chứa thông tin khoa lâm sàng, ngày giờ). |
| **Giám sát** | `fact_giam_sat_chung_sessions`| Phiên chấm điểm tuân thủ các bảng kiểm động (GSC). |
| **Công việc** | `fact_cong_viec` | Nhật ký công việc nội bộ KSNK theo Track B (7 trạng thái). |
| **Công việc** | `fact_cong_viec_dinh_ky` | Mẫu công việc định kỳ tự động spawn hàng ngày/tuần. |
| **NKBV** | `giam_sat_nkbv_ca` | Ca bệnh ghi nhận nhiễm khuẩn bệnh viện lâm sàng (HAI MVP). |

---

## 3. Lộ trình Phát triển theo Mảnh (Vertical Slices Roadmap)

Để kiểm soát rủi ro và tăng tốc độ ship sản phẩm y tế, chúng tôi áp dụng triết lý **phát triển theo mảnh dọc (Vertical Slices)**. Lập trình viên tại một thời điểm chỉ được tập trung vào một mảnh active duy nhất.

```mermaid
gantt
    title Lộ trình 8 Mảnh Nghiệp vụ KSNK BV103 (2026)
    dateFormat  YYYY-MM-DD
    section Giám sát
    S1: VST end-to-end           :active, s1, 2026-05-01, 15d
    S2: Giám sát chung - 1 bảng  : s2, after s1, 10d
    S3: Dashboard chỉ huy        : s3, after s2, 10d
    section CSSD ERP
    S4: Nhãn QR + Truy vết (1 luồng) : s4, after s3, 15d
    S5: Báo cáo ngày/tuần/tháng  : s5, after s4, 10d
    S6: NKBV MVP Lâm sàng        : s6, after s5, 12d
    section Quản trị
    S7: Công việc Track B        : s7, after s6, 15d
    S8: Import/Export danh mục   : s8, after s7, 10d
```

### 3.1 Định nghĩa "Xong mảnh" (Pilot DoD) - Bắt buộc
Một mảnh chỉ được phép đóng lại và chuyển sang mảnh khác khi đạt 5 tiêu chí:
1. **Ai dùng:** Xác định cụ thể vai trò/khoa lâm sàng vận hành.
2. **Môi trường:** Đã cấu hình và chạy ổn định trên môi trường thực tế (Staging/Pilot).
3. **3 kịch bản tay:** Chạy thành công 3 kịch bản lâm sàng chính bằng tay.
4. **Dữ liệu:** File migration và RPC đã được apply đồng bộ lên DB của môi trường pilot.
5. **Build:** Chạy `npm run build` và `npm run verify:engineering` thành công ở local.

### 3.2 Kế hoạch Hoàn thiện Phân cấp (P0 / P1 / P2)
* **P0 — Sẵn sàng Pilot Nghiệp vụ:** Tập trung hoàn thiện 100% luồng chính của mảnh active, đảm bảo tính chặt chẽ về dữ liệu, bảo mật Server Actions và apply DB hoàn tất.
* **P1 — Mở rộng & Báo cáo:** Phát triển các báo cáo thống kê, xuất/nhập excel/csv cho mảnh đã pilot xong để hỗ trợ công tác hành chính tại khoa.
* **P2 — Tối ưu hóa:** Chau chuốt giao diện (khắc phục layout drift), tối ưu hóa tốc độ tải trang trên mobile và thiết lập tự động hóa nâng cao.
