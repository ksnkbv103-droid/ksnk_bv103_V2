---
title: "09 — Hiến pháp dự án & AI governance"
source: ksnk-spec-split (legacy monolith copied to 00-legacy-full-spec-monolith.md)
see_also: [../README.md](../README.md), [10-bv103-implementation-mapping.md](../10-bv103-implementation-mapping.md)
---

> **Neo triển khai BV103:** [`AGENTS.md`](../../../AGENTS.md) V7.0 (chuẩn cao nhất) + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) + [`../README.md`](../README.md) (*Ý đồ phát triển*); mapping tên bảng: [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md).

# **HIẾN PHÁP DỰ ÁN: HỆ THỐNG QUẢN TRỊ KSNK TỔNG THỂ**

## **(PROJECT CONSTITUTION & AI GOVERNANCE CONTEXT)**

Tài liệu này là **hiến pháp nghiệp vụ / ngữ cảnh AI** cho 10 phân hệ. **Chuẩn kỹ thuật cao nhất của repo** vẫn là [`AGENTS.md`](../../../AGENTS.md); khi mâu thuẫn, tuân theo AGENTS và [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md).

## **CHƯƠNG I: QUY TẮC NGÔN NGỮ VÀ ĐỊNH DANH (UBIQUITOUS LANGUAGE)**

**Điều 1: Song ngữ bắt buộc**

* **Giao diện (UI):** Sử dụng Tiếng Việt chuyên ngành y tế chuẩn (theo Bộ Y tế/JCI).  
* **Mã nguồn (Code/DB):** TypeScript/React theo quy ước repo; **tên bảng/cột Postgres** theo [`AGENTS.md`](../../../AGENTS.md) §4 (`ma_*`, `ten_*`, snake_case tiếng Việt khi là nghiệp vụ BV103). Mệnh đề “100% tiếng Anh cho DB” trong bản gốc spec **không** áp dụng nếu mâu thuẫn với chuẩn repo.  
* *Lý do:* Tránh lỗi font trên UI, nhất quán migration và RLS đã triển khai.

**Điều 2: Cấm sử dụng từ đồng nghĩa tự chế**

* Phải tra cứu [`01-domain-checklist-ubiquitous-language.md`](./01-domain-checklist-ubiquitous-language.md) và [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md) trước khi đặt tên biến/bảng; **đặt tên DB theo [`AGENTS.md`](../../../AGENTS.md) §4**, không ép PascalCase tiếng Anh cho cột.  
* Ví dụ: Không được dùng `Batch` hay `Lot`, phải dùng `SterilizationBatch` cho mẻ hấp.

## **CHƯƠNG II: KIẾN TRÚC HỆ THỐNG VÀ DỮ LIỆU (ARCHITECTURAL RULES)**

**Điều 3: Ranh giới phân hệ (Loose Coupling)**

* Hệ thống gồm 10 phân hệ độc lập. Một phân hệ không được phép query trực tiếp vào Database của phân hệ khác.  
* Giao tiếp giữa các phân hệ bắt buộc thông qua **Internal API**.

**Điều 4: Danh mục dùng chung (Shared Kernel)**

* Hai nguồn **dùng chung** tối thiểu cho định danh vận hành: **`dm_khoa_phong`** và **`ho_so_nhan_vien`** (trong bản spec tiếng Anh có thể gọi khái niệm nhân sự là `dm_nhan_vien` — BV103 dùng hồ sơ nhân viên làm thực thể chính; xem [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md)).  
* Các phân hệ khác chỉ lưu FK tới các thực thể đã chốt, không nhân đôi tên hiển thị làm nguồn sự thật thứ hai (tránh rác dữ liệu).

**Điều 5: Quy tắc thiết kế Database vật lý**

* **`dm_*` + domain-registry:** Danh mục nghiệp vụ lõi (ví dụ `dm_loai_dung_cu`). **Không** thêm bảng `dict_*` mới; không dùng `dict_*` làm chuẩn nghiệp vụ y tế — theo [`AGENTS.md`](../../../AGENTS.md) §3.  
* **Dữ liệu phát sinh:** có thể mang tiền tố `fact_*` **hoặc** tên bảng nghiệp vụ đã chốt trong BV103 (ví dụ `quy_trinh`, `nhat_ky_quet`, `cong_viec`). Luôn đối chiếu [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md) trước khi đặt tên migration.  
* **Cột tùy biến / xóa mềm:** dùng `is_active` theo chuẩn repo; cột `metadata` (JSONB) **khi** bảng cần mở rộng linh hoạt — không bắt buộc trên mọi bảng nếu không có nhu cầu.

## **CHƯƠNG III: CÁC "ĐIỀU KHOẢN CỨNG" VỀ NGHIỆP VỤ (CORE BUSINESS LOGIC)**

**Điều 6: Đặc lệ CSSD (Split Sterilization)**

* Dụng cụ trong một "Bộ" (Set) có DNA riêng lẻ. Nếu trong bộ có dụng cụ không chịu nhiệt, hệ thống **bắt buộc** phải rẽ nhánh mẻ hấp (Plasma/EO) và chỉ cho phép cả bộ thành trạng thái "Vô khuẩn" khi tất cả các mẻ con đều đạt.

**Điều 7: Giám sát Vệ sinh tay (Multi-subject)**

* Giao diện App phải hỗ trợ quan sát đồng thời **tối đa 3 đối tượng** trong 1 phiên (Session). Không được bắt người dùng kết thúc đối tượng này mới cho nhập đối tượng kia.

**Điều 8: Quản lý Công việc (Task Flow)**

* Mọi sự cố (Lỗi dụng cụ, Rác tồn kho \>48h, Bệnh nhân xuất viện) đều phải tự động sinh ra một bản ghi **công việc** để điều phối nhân sự (trong spec: `fact_tasks`; **BV103:** `cong_viec` — xem [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md)).

## **CHƯƠNG IV: QUY TẮC PHỐI HỢP VỚI AI (AI PROMPTING GUIDELINES)**

*Dành cho người dùng khi sử dụng Cursor/Gemini để sinh code.*

**Điều 9: Cung cấp ngữ cảnh trước khi yêu cầu**

* Trước khi yêu cầu AI viết code cho một module mới, hãy luôn nạp tối thiểu:  
  1. [`09-project-constitution-ai-governance.md`](./09-project-constitution-ai-governance.md) (bản tách Hiến pháp).  
  2. [`01-domain-checklist-ubiquitous-language.md`](./01-domain-checklist-ubiquitous-language.md).  
  3. [`07-physical-erd-specification.md`](./07-physical-erd-specification.md) + [`10-bv103-implementation-mapping.md`](../10-bv103-implementation-mapping.md).  
  4. [`AGENTS.md`](../../../AGENTS.md).

**Điều 10: Yêu cầu AI kiểm tra chéo (Cross-check)**

* Mọi đoạn code AI sinh ra, hãy ra lệnh: *"Hãy đối chiếu đoạn code này với Điều 6 của Hiến pháp dự án xem có vi phạm logic rẽ nhánh CSSD không?"*.

## **CHƯƠNG V: BẢO MẬT VÀ TOÀN VẸN (SECURITY & AUDIT)**

**Điều 11: Nhật ký kiểm toán (Audit Trail)**

* Tuyệt đối cấm lệnh xóa vật lý bản ghi. Mọi thay đổi dữ liệu phải qua API Đính chính (`Correction API`) để lưu lại giá trị cũ và lý do sửa.

**Điều 12: Offline-First**

* Các module Vận hành (Quét rác, CSSD, VST) phải ưu tiên xử lý dữ liệu tại Local trước, đồng bộ sau. Backend phải xử lý được xung đột dữ liệu dựa trên Timestamp thực tế của thiết bị.

