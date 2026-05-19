---
title: "02 — ADR dm_* vs dict_* và Domain Registry"
source: ksnk-spec-split (legacy monolith copied to 00-legacy-full-spec-monolith.md)
see_also: [../README.md](../README.md), [10-bv103-implementation-mapping.md](../10-bv103-implementation-mapping.md)
---

> **Neo triển khai BV103:** [`AGENTS.md`](../../../AGENTS.md) V7.0 + [`READ_MINIMUM_BY_CHANGE.md`](../READ_MINIMUM_BY_CHANGE.md) + [`../README.md`](../README.md) (*Ý đồ phát triển*).


# **QUYẾT ĐỊNH KIẾN TRÚC (ADR): CHIẾN LƯỢC THIẾT KẾ CƠ SỞ DỮ LIỆU DANH MỤC (dm\_ vs dict\_)**

**Bối cảnh:** Dự án KSNK\_BV103 cần thống nhất việc sử dụng mô hình danh mục phân mảnh theo nghiệp vụ (`dm_*`) hay mô hình danh mục tập trung/linh hoạt (`dict_*` / mega-dictionary).

## **1\. Đánh giá nhận định hiện tại**

Nhận định của bạn về việc **`dm_*` tốt hơn `dict_*` cho danh mục lõi là hoàn toàn đúng đắn**. Phân tích ưu/nhược điểm bạn đưa ra phản ánh đúng nỗi đau của việc bảo trì dữ liệu y tế quy mô lớn.

## **2\. Quyết định: Cấu trúc nào cho phát triển lâu dài?**

**CHỐT QUYẾT ĐỊNH:** Hệ thống sử dụng mô hình **`dm_*` (Domain-specific Tables)** làm tiêu chuẩn thiết kế dài hạn cho mọi danh mục lõi của KSNK.

### **Tại sao đây là lựa chọn DUY NHẤT đúng cho KSNK?**

1. **Bảo vệ tính toàn vẹn dữ liệu (Data Integrity):**  
   * Tránh việc gán nhầm trạng thái của danh mục này cho danh mục kia (VD: trạng thái rác thải cho mẻ hấp).  
2. **Xử lý Logic "Rẽ nhánh" phức tạp (Case Study: CSSD Split Logic):**  
   * Đây là lý do quan trọng nhất. Một `Bộ dụng cụ` (Set) bao gồm nhiều `Loại dụng cụ` (Item Type). Trong đó có món chịu nhiệt (Hấp ướt) và món nhạy cảm nhiệt (Hấp Plasma).  
   * Kiến trúc `dm_*` cho phép bảng `dm_loai_dung_cu` sở hữu các cột nghiệp vụ riêng biệt như `is_heat_resistant` (BOOLEAN) và `sterilization_method_id` (UUID).  
   * Nếu dùng `dict_*`, các thuộc tính này sẽ bị nhét vào cột JSON chung chung, khiến việc viết câu lệnh SQL kiểm tra logic (ví dụ: Chặn không cho đưa đồ nhựa vào lò Steam) trở nên cực kỳ chậm, dễ lỗi và không thể tạo Index tối ưu.  
3. **Truy xuất nguồn gốc (Traceability) theo chuẩn JCI/CDC:**  
   * Khi có ca nhiễm khuẩn, hệ thống phải truy vết ngược: `Bệnh nhân` \-\> `Bộ dụng cụ vật lý` \-\> `Từng linh kiện lẻ` \-\> `Mẻ hấp tương ứng`. Mô hình `dm_*` cho phép Join dữ liệu rõ ràng, đảm bảo báo cáo audit "sạch".  
4. **Phân quyền dữ liệu (RLS):**  
   * Row-Level Security trên các bảng riêng biệt dễ kiểm soát hơn nhiều so với việc phân quyền trên một bảng "thùng rác".

## **3\. Kiến trúc Đích (Target Architecture): dm\_\* \+ Domain Registry**

Giải quyết nhược điểm lặp code bằng cách tạo một **Generic API Hub** ở Backend để định tuyến request tới đúng bảng vật lý `dm_*` tương ứng.

## **4\. Quy định sử dụng (Rule of Thumb)**

| Tiêu chí | Bắt buộc dùng `dm_*` (Bảng riêng) | `dict_*` (chỉ legacy / không mở rộng — AGENTS §3) |
| ----- | ----- | ----- |
| **Bản chất** | Danh mục mang tính **Nghiệp vụ Y tế/Lõi** | Không dùng làm chuẩn mới; nếu DB còn sót thì chuẩn hoá dần về `dm_*` + registry |
| **Có ràng buộc logic** | **CÓ.** (VD: Chặn lò hấp dựa vào loại đồ). | Không thiết kế thêm theo hướng mega-dictionary |
| **Ví dụ** | `dm_vi_khuan`, `dm_loai_dung_cu`, `dm_khoa_phong`. | (Không thêm ví dụ mới; không tạo bảng `dict_*` mới.) |

**Kết luận:** Kiên định với con đường `dm_*` để xây dựng hệ thống KSNK đẳng cấp quốc tế.

## **5\. Đồng bộ với chuẩn repo hiện tại (V7.0)**

- [`AGENTS.md`](../../../AGENTS.md) **§3** là chuẩn vận hành: danh mục lõi qua **domain-registry** → bảng `dm_*`; **không** thêm bảng `dict_*` mới và **không** dùng `dict_*` làm lớp chuẩn cho nghiệp vụ y tế (chỉ xử lý chuẩn hoá/ghi nhận nếu DB còn bảng legacy).
- Bảng mục **4** phía trên giữ vai trò **mô tả lịch sử quyết định ADR**; khi triển khai code/migration, ưu tiên cột “`dm_*`” và bỏ qua hướng mở rộng `dict_*` trừ khi có quyết định migration riêng có rollback.
