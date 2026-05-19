---
title: "04 — Kiến trúc phân hệ và danh mục dùng chung"
source: ksnk-spec-split (legacy monolith copied to 00-legacy-full-spec-monolith.md)
see_also: [../README.md](../README.md), [10-bv103-implementation-mapping.md](../10-bv103-implementation-mapping.md)
---

> **Neo triển khai BV103:** [`AGENTS.md`](../../../AGENTS.md) V7.0 + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) + [`../README.md`](../README.md) (*Ý đồ phát triển*). Tên bảng thật và mapping spec ↔ Postgres: [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md). Các tên tiếng Anh / `fact_*` trong tài liệu gốc là **khái niệm**; app dùng bảng như `quy_trinh`, `cong_viec`, `ho_so_nhan_vien`, v.v.

# **KIẾN TRÚC PHÂN HỆ VÀ DANH MỤC DÙNG CHUNG (SYSTEM BOUNDARIES & MASTER DATA)**

Tài liệu này xác định ranh giới của các module (Bounded Contexts) để chia team lập trình (ví dụ: Team A làm CSSD, Team B làm Tuân thủ). Đồng thời, quy định nghiêm ngặt những "Danh mục lõi" bắt buộc phải dùng chung, đảm bảo tính duy nhất của dữ liệu (Single Source of Truth).

## **PHẦN 1: XÁC ĐỊNH RANH GIỚI CÁC PHÂN HỆ (MODULE BOUNDARIES)**

Dựa trên yêu cầu nghiệp vụ thực tế tại Bệnh viện, hệ thống được thiết kế dưới dạng Micro-services hoặc Modular Monolith, bao gồm 10 phân hệ cốt lõi:

| STT | Tên Phân hệ (Module) | Trách nhiệm cốt lõi (Core Domain) | Đối tượng sử dụng chính (Actors) |
| ----- | ----- | ----- | ----- |
| **1** | **Quản trị Hệ thống & Dữ liệu chủ (MDM \- Master Data)** | Quản lý người dùng, phân quyền, cấu hình hệ thống và các danh mục dùng chung toàn viện. | Admin IT, Lãnh đạo Khoa KSNK. |
| **2** | **Quản lý Tái xử lý Dụng cụ (CSSD)** | Quản lý toàn bộ vòng đời dụng cụ phẫu thuật/nội soi: Nhận, Rửa, Đóng gói, Tiệt khuẩn (rẽ nhánh chịu nhiệt/không chịu nhiệt), Lỗi, Báo hỏng, Điều chuyển. | Nhân viên CSSD, Điều dưỡng Phòng mổ. |
| **3** | **Quản lý Kho & Tài sản KSNK (Inventory)** | Theo dõi Mức tồn kho hóa chất, vật tư (FEFO) và cảnh báo sắp hết. Lập lịch bảo trì, kiểm định máy móc (Lò hấp, Máy rửa). | Thủ kho KSNK, Kỹ sư Vật tư y tế. |
| **4** | **Giám sát Tuân thủ & VST (Compliance)** | Động cơ biểu mẫu động (Checklist Engine) cho mọi quy trình. Tính năng Giám sát vệ sinh tay độc lập (hỗ trợ quan sát 3 đối tượng cùng lúc). | Chuyên trách KSNK đi buồng (dùng App/Tablet). |
| **5** | **Giám sát Nhiễm khuẩn Bệnh viện (HAI Surveillance)** | Kết nối HIS/LIS để lấy dữ liệu. Chạy thuật toán CDC (Rules Engine) để chẩn đoán SSI, VAP, CLABSI, CAUTI, MDROs. | Bác sĩ/Chuyên trách Giám sát Vi sinh. |
| **6** | **Quản lý Công việc (Task Management)** | Giao việc, nhắc nhở (Deadline), nộp báo cáo. Dùng chung cho cả Nội bộ KSNK và Mạng lưới KSNK lâm sàng (Rẽ nhánh UI theo Role). | Toàn bộ nhân sự KSNK và Mạng lưới KSNK. |
| **7** | **Quản lý Đồ vải (Laundry & Linen Management)** | Theo dõi phân loại đồ vải (thường/lây nhiễm), theo dõi mẻ giặt, và đối soát trọng lượng/số lượng giao nhận để chống thất thoát. | Nhân viên Nhà giặt, Điều dưỡng khoa. |
| **8** | **Quản lý Chất thải Y tế (Waste Management)** | Quản lý phân loại rác, cân rác điện tử, giám sát thời gian lưu trữ rác lây nhiễm (không quá 48h) và bàn giao đơn vị tiêu hủy. | Hộ lý, Nhân viên quản lý rác, KSNK. |
| **9** | **Vệ sinh Môi trường bề mặt (Environmental Cleaning)** | Điều phối tự động vệ sinh xuất viện (Terminal Cleaning) từ HIS. Ghi nhận kết quả kiểm tra chất lượng (Đo ATP, Test dạ quang). | Hộ lý, Chuyên trách KSNK. |
| **10** | **Trung tâm Báo cáo (Analytics Hub)** | Tập hợp toàn bộ dữ liệu từ 9 phân hệ trên để vẽ Biểu đồ chuyên đề. Cung cấp Bộ lọc toàn cục (Global Filter). | Ban Giám đốc, Trưởng Khoa KSNK. |

**Quy tắc Vàng cho Lập trình viên:** Một phân hệ KHÔNG được phép can thiệp trực tiếp (Sửa/Xóa) vào Database của phân hệ khác. Ví dụ: Phân hệ (4) muốn biết một bộ dụng cụ ở phân hệ (2) có đạt chuẩn không thì phải gọi API qua, không được phép query trực tiếp vào bảng của CSSD.

## **PHẦN 2: CÁC DANH MỤC DÙNG CHUNG (SHARED KERNEL)**

Để các phân hệ có thể "nói chuyện" được với nhau và tổng hợp lên được Dashboard (Phân hệ 10), chúng ta bắt buộc phải có một tập hợp **Danh mục dùng chung**. Các danh mục này thuộc quyền quản lý của Phân hệ (1) MDM.

### **2.1. Nhóm Danh mục Nền tảng (Foundation Data)**

*Được đồng bộ một chiều từ HIS (Hệ thống thông tin bệnh viện) hoặc phần mềm Nhân sự. Phần mềm KSNK chỉ đọc (Read-only).*

1. **Danh mục Khoa / Phòng / Ban / Giường (`dm_khoa_phong`):**  
   * *Tác dụng:* Phân hệ CSSD dùng để cấp phát dụng cụ; Phân hệ Đồ vải/Chất thải dùng để truy xuất nguồn gốc rác/đồ dơ từ khoa nào; Phân hệ Môi trường dùng để biết cần dọn giường/buồng nào; Phân hệ Giám sát dùng để gán vị trí Nhiễm khuẩn.  
   * *Thuộc tính vệ tinh:* Phân loại Khối (Nội/Ngoại/CLS).  
2. **Hồ sơ nhân sự (`ho_so_nhan_vien`) — trong spec gốc thường gọi `dm_nhan_vien`:**  
   * *Tác dụng:* Gắn ID nhân viên vào mọi Audit Log (Ai rửa dụng cụ? Ai cân rác? Ai dọn phòng? Ai duyệt phiếu?).  
   * *Thuộc tính vệ tinh:* Trình độ, Chức vụ, Vai trò KSNK (Nội bộ / Mạng lưới) — tham chiếu các `dm_*` chức danh / tổ theo mapping.

### **2.2. Nhóm Danh mục Lâm sàng & Vi sinh (Clinical Data)**

*Dùng chung chủ yếu giữa Phân hệ (4) Giám sát Tuân thủ và Phân hệ (5) Giám sát NKBV.*

3. **Danh mục Tác nhân Vi sinh (`dm_vi_khuan` / `dm_nam`):**  
   * *Tác dụng:* Thống nhất tên gọi vi khuẩn (VD: S. aureus, E. coli). Nhận diện ca MDROs.  
4. **Danh mục Kháng sinh (`dm_khang_sinh`):**  
   * *Tác dụng:* Kết hợp với danh mục Vi sinh để tạo bản đồ Kháng sinh đồ (Antibiogram).  
5. **Danh mục Phân loại Nhiễm khuẩn (`dm_loai_hai`):**  
   * *Tác dụng:* Danh sách chuẩn của CDC (VAP, CLABSI, CAUTI, SSI). Bảng kiểm ở Phân hệ (4) phải map với mã của danh mục này để biết bảng kiểm đó phục vụ phòng ngừa loại bệnh nào.

### **2.3. Sự phân biệt với Danh mục "Cục bộ" (Local/Module Dictionaries)**

Để tránh làm "phình to" hệ thống MDM, những danh mục mang tính đặc thù sâu của một phân hệ sẽ KHÔNG ĐƯỢC để ở mục dùng chung, mà giao cho phân hệ đó tự quản lý.

* **Danh mục Cục bộ của Phân hệ CSSD:**  
  * `dm_loai_dung_cu`, `dm_bo_dung_cu`, `dm_phuong_phap_tiet_khuan`, `dm_kha_nang_chiu_nhiet`.  
* **Danh mục Cục bộ của Phân hệ Kho:**  
  * `dm_nha_cung_cap`, `dm_loai_hoa_chat`.  
* **Danh mục Cục bộ của Phân hệ Giám sát:**  
  * `dm_thoi_diem_vst` (5 thời điểm WHO), `dm_bang_kiem_template`.  
* **Danh mục Cục bộ của Phân hệ Đồ Vải:**  
  * `dm_loai_do_vai` (Ga trải giường, Quần áo bệnh nhân, Áo mổ...), `dm_doi_tac_giat_ui` (Nếu thuê ngoài).  
* **Danh mục Cục bộ của Phân hệ Chất thải:**  
  * `dm_loai_chat_thai` (Lây nhiễm, Sắc nhọn, Nguy hại, Sinh hoạt), `dm_don_vi_tieu_huy_rac`.  
* **Danh mục Cục bộ của Phân hệ Môi trường:**  
  * `dm_loai_be_mat` (Bề mặt hay đụng chạm, Bề mặt ít đụng chạm), `dm_quy_trinh_ve_sinh` (Thường quy, Xuất viện).

## **PHẦN 3: KIẾN TRÚC RẼ NHÁNH CHO PHÂN HỆ QUẢN LÝ CÔNG VIỆC**

Như đã quyết định, Phân hệ (6) Task Management **KHÔNG TÁCH** làm 2 phân hệ vật lý, mà sử dụng kiến trúc sau:

* **Tầng Database (BV103):** Bảng **`cong_viec`** với phân loại phạm vi qua **`loai_cong_viec`** (ví dụ nội bộ vs mạng lưới — xem [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md)). Trong spec gốc từng mô tả một bảng `fact_tasks` + `task_scope`; **không** dùng làm tên triển khai mới.  
* **Tầng API & RLS (Bảo mật):** Row-Level Security / filter server phải tách dữ liệu nội bộ vs mạng lưới theo quyền và cột thật trên `cong_viec`.  
* **Tầng UI/UX (2 Cổng giao tiếp \- Portals):**  
  * *Admin / Chuyên trách KSNK Portal:* Giao diện dạng Kanban Board, xem được việc của cả khoa mình và tiến độ của toàn mạng lưới.  
  * *Link Nurse Portal (Mạng lưới):* Giao diện dạng To-do List (Mobile-friendly), hiển thị rõ ràng: Việc cần làm tuần này, Việc quá hạn, Nút "Nộp báo cáo".

