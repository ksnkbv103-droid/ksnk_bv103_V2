---
title: "08 — Đặc tả kiến trúc API và proxy nhập liệu"
source: ksnk-spec-split (legacy monolith copied to 00-legacy-full-spec-monolith.md)
see_also: [../README.md](../README.md), [10-bv103-implementation-mapping.md](../10-bv103-implementation-mapping.md)
---

> **Neo triển khai BV103:** [`AGENTS.md`](../../../AGENTS.md) V7.0 + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) + [`../README.md`](../README.md) (*Ý đồ phát triển*); tên bảng/cột thật: [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md).

# **ĐẶC TẢ KIẾN TRÚC API (GIAI ĐOẠN NHẬP LIỆU THỦ CÔNG)**

## **HỆ THỐNG QUẢN TRỊ KIỂM SOÁT NHIỄM KHUẨN (KSNK)**

Tài liệu này định nghĩa cấu trúc giao tiếp giữa các phân hệ và các Endpoint phục vụ việc nhập liệu lâm sàng thủ công, đảm bảo tính toàn vẹn dữ liệu y tế.

## **1\. NGUYÊN TẮC THIẾT KẾ "MÔ PHỎNG TÍCH HỢP" (PROXY STRATEGY)**

Dù là nhập tay, cấu trúc Payload (dữ liệu gửi lên) phải tuân thủ chuẩn **HL7 FHIR** hoặc **JSON Schema** đã thống nhất. Điều này giúp sau này khi có HIS/LIS thật, chúng ta chỉ cần thay đổi tầng xác thực mà không cần viết lại logic xử lý.

* **Idempotency-Key:** Mọi request `POST` bắt buộc kèm theo Key này ở Header để tránh nhân viên bấm nút "Gửi" nhiều lần do mạng chậm dẫn đến trùng dữ liệu.  
* **Audit-Context:** Mỗi request tự động đính kèm `staff_id` và `role` từ Token để ghi nhật ký: "Ai là người đã nhập tay bản ghi này?".

## **2\. NHÓM API PROXY (MÔ PHỎNG DỮ LIỆU NGOẠI VI)**

### **2.1. Quản lý Bệnh nhân và Sự kiện Buồng bệnh**

Dành cho chuyên trách KSNK hoặc Điều dưỡng mạng lưới cập nhật tình hình bệnh nhân thay cho HIS.

| Method | Endpoint | Nghiệp vụ nhập tay | Logic xử lý tự động (Internal Trigger) |
| ----- | ----- | ----- | ----- |
| `POST` | `/api/v1/proxy/patients` | Khai báo bệnh nhân mới vào khoa | Khởi tạo hồ sơ giám sát NKBV rỗng. |
| `PUT` | `/api/v1/proxy/patients/{id}/transfer` | Nhập tay sự kiện chuyển khoa | Cập nhật vị trí để áp dụng "Transfer Rule" (Luật luân chuyển 48h). |
| `PUT` | `/api/v1/proxy/patients/{id}/discharge` | Báo bệnh nhân xuất viện | **Kích hoạt ngay:** Tạo Task "Vệ sinh xuất viện" cho phân hệ Môi trường. |

### **2.2. Nhập kết quả Xét nghiệm và Vi sinh**

Dành cho bộ phận Giám sát nhập liệu từ phiếu trả kết quả của LIS.

| Method | Endpoint | Nghiệp vụ nhập tay | Logic xử lý tự động (Internal Trigger) |
| ----- | ----- | ----- | ----- |
| `POST` | `/api/v1/proxy/lab-results` | Nhập kết quả cấy vi sinh | Nếu là vi khuẩn thuộc danh mục MDRO $\\rightarrow$ Bắn thông báo Red Flag cho khoa lâm sàng. |
| `POST` | `/api/v1/proxy/antibiogram` | Nhập kết quả kháng sinh đồ | Cập nhật dữ liệu cho biểu đồ Dashboard Vi sinh. |

## **3\. NHÓM API VẬN HÀNH NỘI BỘ (INTERNAL MODULES)**

### **3.1. Phân hệ CSSD (Dụng cụ & Mẻ hấp)**

Xử lý logic rẽ nhánh tiệt khuẩn chịu nhiệt/không chịu nhiệt.

* **Tách dụng cụ lẻ ra mẻ riêng:** `POST /api/v1/cssd/items/split-for-sterilization`  
  * *Payload:* `{ "item_id": "UUID", "target_method": "PLASMA", "reason": "Non-heat resistant" }`  
* **Xác nhận kết quả mẻ hấp:** `PUT /api/v1/cssd/batches/{batch_id}/verify`  
  * Nếu kết quả Test sinh học \= FAIL $\\rightarrow$ Hệ thống tự động chuyển trạng thái của TẤT CẢ bộ dụng cụ trong mẻ đó về `RECALL` (Thu hồi khẩn cấp).

### **3.2. Phân hệ Chất thải và Đồ vải**

* **Cân rác/đồ vải:** `POST /api/v1/waste/weighing`  
  * Hỗ trợ nhập tay trọng lượng (kg). Tự động kiểm tra: Nếu loại rác \= "Lây nhiễm" và thời gian lưu kho hiện tại \> 48h $\\rightarrow$ Gửi Alert cho Admin.

## **4\. LUỒNG XỬ LÝ LỖI VÀ ĐÍNH CHÍNH DỮ LIỆU (AMENDMENT WORKFLOW)**

Trong y tế, dữ liệu nhập sai không được "Xóa" mất tích mà phải "Đính chính" để giữ bằng chứng pháp lý.

### **4.1. Endpoint Đính chính (Correction API)**

Mọi bản ghi (Fact) đều hỗ trợ API đính chính:

* `PATCH /api/v1/corrections/{entity_type}/{record_id}`

*Payload:*  
{

  "reason\_id": "UUID\_SAI\_SO\_LIEU",

  "field\_name": "organism\_name",

  "old\_value": "E.coli",

  "new\_value": "K.pneumoniae",

  "approver\_id": "UUID\_TRUONG\_KHOA"

}

* 

### **4.2. Trạng thái bản ghi (Record Status)**

Hệ thống sử dụng các cờ trạng thái để kiểm soát:

* `VALID`: Dữ liệu chuẩn.  
* `AMENDED`: Dữ liệu đã bị đính chính (Sẽ hiển thị icon dấu sao \* trên UI).  
* `VOIDED`: Dữ liệu bị hủy bỏ hoàn toàn do nhập nhầm (Nhưng vẫn tồn tại trong Database để đối soát).

## **5\. QUY TẮC BẢO MẬT & TRUY VẾT (SECURITY & TRACEABILITY)**

1. **Xác thực người nhập:** Không có request nào được thực hiện nặc danh. Token JWT phải chứa thông tin thiết bị và định danh nhân viên.  
2. **Ràng buộc thời gian (Back-dating):** Cấm nhập liệu lùi ngày quá **72 giờ** (ví dụ: Thứ Hai không được nhập dữ liệu cho Thứ Ba tuần trước) trừ khi có quyền Admin cấp cao. Điều này để tránh việc "làm đẹp" số liệu sau khi có nhiễm khuẩn xảy ra.  
3. **Conflict Resolution (Xử lý xung đột):** Nếu nhân viên A đang sửa bộ dụng cụ, nhân viên B quét mã cùng lúc $\\rightarrow$ API trả về lỗi `409 Conflict` kèm thông tin nhân viên đang giữ khóa.

## **6\. DANH SÁCH MÃ LỖI ĐẶC THÙ (BUSINESS ERROR CODES)**

| Code | Ý nghĩa | Cách xử lý gợi ý cho UI |
| ----- | ----- | ----- |
| `ERR_HEAT_SENSITIVE` | Dụng cụ không chịu nhiệt | Thông báo màu đỏ, ngăn chặn việc xếp vào lò hấp Steam. |
| `ERR_DUPLICATE_PATIENT` | Mã BN đã tồn tại trong khoa | Yêu cầu kiểm tra lại mã PID trước khi nhập tiếp. |
| `ERR_EXPIRED_MATERIAL` | Hóa chất đã hết hạn sử dụng | Khóa tính năng xác nhận mẻ rửa/khử khuẩn liên quan. |
| `ERR_OVERDUE_TASK` | Task đã quá hạn hoàn thành | Yêu cầu nhập lý do trễ hạn trước khi bấm "Hoàn thành". |

