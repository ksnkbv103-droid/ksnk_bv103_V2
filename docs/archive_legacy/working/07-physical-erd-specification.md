---
title: "07 — Đặc tả ERD / mô hình dữ liệu vật lý (gợi ý)"
source: ksnk-spec-split (legacy monolith copied to 00-legacy-full-spec-monolith.md)
see_also: [../README.md](../README.md), [10-bv103-implementation-mapping.md](../10-bv103-implementation-mapping.md)
---

> **Neo triển khai BV103:** [`AGENTS.md`](../../../AGENTS.md) V7.0 + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) + [`../README.md`](../README.md) (*Ý đồ phát triển*). ERD dưới đây là **gợi ý / tiếng Anh hoá**; schema thật + ví dụ map (`quy_trinh`, `dm_bo_dung_cu_chi_tiet`, `nhat_ky_quet`, …): [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md) và [`AGENTS.md`](../../../AGENTS.md) §3–4.

# **ĐẶC TẢ THIẾT KẾ CƠ SỞ DỮ LIỆU VẬT LÝ (PHYSICAL ERD SPECIFICATION)**

## **HỆ THỐNG QUẢN TRỊ KIỂM SOÁT NHIỄM KHUẨN (KSNK) \- CẬP NHẬT LOGIC CSSD RẼ NHÁNH**

Tài liệu này định nghĩa cấu trúc bảng để xử lý nghiệp vụ phức tạp: Một bộ dụng cụ có nhiều thành phần, thành phần chịu nhiệt hấp ướt, thành phần nhạy cảm nhiệt hấp Plasma/EO.

## **1\. PHÂN HỆ DỮ LIỆU CHỦ (MASTER DATA MANAGEMENT \- MDM)**

### **1.1. Danh mục Khoa/Phòng/Giường (`dm_khoa_phong`)** *(FK khối khoa trong BV103: `dm_khoi_khoa` — không dùng `sys_categories` như một số bản spec cũ)*

* `id`: UUID (PK)  
* `ma_khoa`: VARCHAR(50) (Unique)  
* `ten_khoa`: NVARCHAR(255)  
* `khoi_id`: UUID (FK trỏ về `sys_categories` loại KHOI)  
* `is_active`: BOOLEAN

### **1.2. Danh mục Nhân sự (spec: `dm_nhan_vien` — BV103: `ho_so_nhan_vien`)**

* `id`: UUID (PK)  
* `ho_ten`: NVARCHAR(255)  
* `vai_tro_ksnk`: ENUM (HD\_KSNK, CT\_KSNK, ML\_KSNK, NV\_CSSD, HO\_LY)  
* `khoa_phong_id`: UUID (FK)

## **2\. PHÂN HỆ QUẢN LÝ DỤNG CỤ CHUYÊN SÂU (INSTRUMENT & CSSD)**

### **2.1. Danh mục Loại dụng cụ (`dm_loai_dung_cu`)**

*Đây là bảng "Gốc" quy định DNA của từng cây kéo, panh, optic.*

* `id`: UUID (PK)  
* `ma_dung_cu`: VARCHAR(50) (Unique)  
* `ten_dung_cu`: NVARCHAR(255)  
* `is_chiu_nhiet`: BOOLEAN (True: Hấp ướt | False: Hấp lạnh)  
* `phuong_phap_tiet_khuan_id`: UUID (FK trỏ về danh mục phương pháp: Steam, Plasma, EO)  
* `phuong_phap_lam_sach_id`: UUID (FK)  
* `quy_cach_dong_goi_id`: UUID (FK)

### **2.2. Danh mục Bộ dụng cụ (`dm_bo_dung_cu`)**

*Định nghĩa cái tên của bộ (VD: Bộ mổ nội soi ruột thừa).*

* `id`: UUID (PK)  
* `ma_bo`: VARCHAR(50) (Unique)  
* `ten_bo`: NVARCHAR(255)  
* `ghi_chu_dong_goi`: TEXT (Hướng dẫn xếp đồ vào khay)

### **2.3. Cấu trúc chi tiết Bộ dụng cụ (`dm_cau_truc_bo_dung_cu`)**

*Bảng trung gian định mức cơ số cho từng bộ.*

* `id`: UUID (PK)  
* `bo_dung_cu_id`: UUID (FK)  
* `loai_dung_cu_id`: UUID (FK)  
* `so_luong_dinh_muc`: INT (Cơ số chuẩn)

### **2.4. Thực thể Bộ dụng cụ vật lý (`fact_bo_dung_cu_instance`)**

*Đại diện cho 1 hộp dụng cụ cụ thể có mã Barcode/QR riêng.*

* `id`: UUID (PK)  
* `bo_dung_cu_id`: UUID (FK)  
* `barcode_dinh_danh`: VARCHAR(100) (Unique)  
* `trang_thai_vong_doi`: ENUM (BAN, DANG\_RUA, CHO\_DONG\_GOI, CHO\_HAP, VO\_KHUAN, HET\_HAN)  
* `vi_tri_hien_tai_id`: UUID (FK trỏ về Khoa hoặc Kho CSSD)

### **2.5. Nhật ký Vòng đời & Rẽ nhánh tiệt khuẩn (`fact_cssd_lifecycle_logs`)**

*Bảng ghi lại từng bước đi, cho phép tách/nhập mẻ.*

* `id`: UUID (PK)  
* `bo_instance_id`: UUID (FK)  
* `loai_dung_cu_id`: UUID (FK \- Dùng khi tách lẻ dụng cụ ra tiệt khuẩn riêng)  
* `khau_thuc_hien`: ENUM (NHAN\_DO\_BAN, RUA, KIEM\_TRA, DONG\_GOI, TIET\_KHUAN, NHAP\_KHO, CAP\_PHAT)  
* `me_hap_id`: UUID (FK \- Link tới mẻ hấp cụ thể)  
* `nhan_vien_id`: UUID (FK)  
* `timestamp`: TIMESTAMP  
* `ket_qua`: ENUM (DAT, KHONG\_DAT)  
* `ghi_chu_su_co`: TEXT

## **3\. PHÂN HỆ GIÁM SÁT TUÂN THỦ (COMPLIANCE)**

### **3.1. Phiên Giám sát VST (`fact_hhy_sessions`)**

*Hỗ trợ giám sát 3 đối tượng cùng lúc theo yêu cầu.*

* `id`: UUID (PK)  
* `nguoi_giam_sat_id`: UUID (FK)  
* `khoa_phong_id`: UUID (FK)  
* `thoi_gian_bat_dau`: TIMESTAMP

### **3.2. Lượt quan sát chi tiết (`fact_hhy_observations`)**

* `id`: UUID (PK)  
* `phien_id`: UUID (FK)  
* `stt_doi_tuong`: INT (1, 2, hoặc 3 \- Để nhóm trên UI)  
* `doi_tuong_nv_id`: UUID (FK \- Nhân viên được quan sát)  
* `thoi_diem_who`: ENUM (T1, T2, T3, T4, T5)  
* `hanh_dong`: ENUM (RUB, WASH, MISSED)

## **4\. PHÂN HỆ QUẢN LÝ CÔNG VIỆC (TASK)**

### **4.1. Bảng Công việc (`fact_tasks`)**

* `id`: UUID (PK)  
* `task_scope`: ENUM (INTERNAL, NETWORK)  
* `nguoi_giao_id`: UUID (FK)  
* `nguoi_nhan_id`: UUID (FK)  
* `checklist_template_id`: UUID (FK \- Nếu là task đi chấm bảng kiểm)  
* `status`: ENUM (TODO, IN\_PROGRESS, SUBMITTED, DONE, REJECTED, OVERDUE)

## **5\. QUY TẮC RÀNG BUỘC NGHIỆP VỤ (DATABASE BUSINESS RULES)**

1. **Rule Tách mẻ (Split Logic):** Khi `fact_bo_dung_cu_instance` ở trạng thái `CHO_HAP`, hệ thống kiểm tra bảng `dm_cau_truc_bo_dung_cu` trỏ tới `dm_loai_dung_cu`.  
   * Nếu tồn tại dụng cụ `is_chiu_nhiet = False` $\\rightarrow$ Bắt buộc tách bản ghi nhật ký thành 2 `me_hap_id` khác nhau (Một mẻ lò Steam, một mẻ lò Plasma).  
   * Bộ dụng cụ chỉ được chuyển sang `VO_KHUẨN` khi **TẤT CẢ** các thành phần tách ra đều có nhật ký mẻ hấp tương ứng đạt kết quả `DAT`.  
2. **Rule Điều chuyển (Component Transfer):** Khi một cây kéo từ Bộ A bị hỏng và lấy từ Bộ B bù sang, hệ thống cập nhật `bo_instance_id` trong nhật ký dụng cụ lẻ để đảm bảo truy vết chính xác cây kéo đó đang nằm ở hộp nào.  
3. **Rule Cảnh báo tồn kho:** Bảng `dm_hoa_chat` link với bảng `fact_inventory`. Trigger sẽ so sánh `current_stock` với `min_threshold` để tự động insert vào bảng `fact_tasks` cho Thủ kho.  
4. **Rule Vệ sinh tay:** Một `phien_id` trong `fact_hhy_observations` không được có quá 3 giá trị `stt_doi_tuong` khác nhau.

