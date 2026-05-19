# Cổng Tài Liệu Dự Án - KSNK BV103

> 📅 Phiên bản tinh gọn tối đa — 20/05/2026

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật và nghiệp vụ của **Hệ thống Kiểm soát Nhiễm khuẩn (KSNK) - Bệnh viện 103**. 
Hệ thống tài liệu đã được quy hoạch, gộp hoàn toàn hơn 50+ tệp rời rạc cũ thành **4 Cột trụ Tài liệu Thống nhất (Unified)** để đảm bảo tính nhất quán (SSOT), tăng tốc độ tra cứu và mang lại trải nghiệm phát triển (DX) tốt nhất.

---

## 🏛️ 4 Cột Trụ Tài Liệu Thống Nhất

| Tài liệu | 🎯 Mục tiêu & Vai trò | 👥 Đối tượng |
| :--- | :--- | :--- |
| 📘 **[Đặc tả Nghiệp vụ Y tế](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/specs/UNIFIED_DOMAIN_SPECIFICATION.md)** | Định nghĩa ngôn ngữ chung (Ubiquitous Language), hành trình giám sát VST, CSSD, Quản lý công việc, và chuẩn FHIR/HIS. | Nghiệp vụ, Dev, AI |
| 📗 **[Quy chuẩn Kỹ thuật & UI/UX](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/guides/UNIFIED_ENGINEERING_GUIDELINES.md)** | Hướng dẫn phát triển Vertical Slice (DDD), Server Actions, tối ưu giao diện di động (Mobile-First) và chất lượng PR. | Toàn bộ Dev & AI |
| 📙 **[Cẩm nang Vận hành, Bảo mật & DB](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/operations/UNIFIED_OPERATIONS_SOP.md)** | Hướng dẫn thiết lập Auth, phân quyền vai trò y tế (RBAC), SOP đồng bộ database và triết lý tối ưu Smart DB thực dụng. | Dev, DevOps, DBA |
| 📔 **[Tài liệu Bàn giao & Lộ trình](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/handover/UNIFIED_HANDOVER_AND_ROADMAP.md)** | Sơ đồ cấu trúc thư mục, kiến trúc dữ liệu tham chiếu tổng thể, và 8 phân mảnh lộ trình phát triển tiếp theo. | Toàn bộ Đội ngũ |

---

## 🗺️ Công Cụ Hỗ Trợ Đắc Lực

*   🧭 **[Bản đồ Ánh xạ Live (Implementation Mapping)](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/specs/10-bv103-implementation-mapping.md)**: Bản đồ liên kết trực tiếp giữa các thuật ngữ nghiệp vụ y tế chuyên môn và thực thể bảng biểu (tables/views/RPCs) tương ứng trong Database thực tế.
*   📜 **[AGENTS.md (Hiến pháp Dự án)](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/AGENTS.md)**: Quy tắc phát triển tối cao, triết lý **Boy Scout Rule**, định nghĩa Hoàn thành (Pilot DoD) và quy định nghiêm ngặt về chất lượng code.

---

## 📦 Lưu Trữ Lịch Sử (Legacy Archive)

Để tối ưu hóa không gian làm việc của IDE và tăng tốc độ tìm kiếm mã nguồn, toàn bộ tài liệu lịch sử, các bản phác thảo nháp, quyết định kiến trúc cũ (hơn 50 tệp `.md` rời rạc) đã được đóng gói an toàn tại:
*   📁 **`docs/archive_legacy.zip`**: File lưu trữ toàn bộ lịch sử tài liệu cũ. Bạn chỉ cần giải nén tệp tin này khi có nhu cầu tra cứu lại các tài liệu phát triển ban đầu của dự án.
*   📁 **`awesome-cursorrules.zip`**: File lưu trữ bộ sưu tập rule mẫu Cursor để tham khảo khi cấu hình IDE rules (vốn nằm ngoài mã nguồn hoạt động của app).

---

> *"Hãy luôn để lại mã nguồn và cấu trúc thư mục sạch đẹp hơn lúc bạn tìm thấy nó."* — **Boy Scout Rule**