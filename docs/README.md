# Tài liệu Dự án - KSNK BV103

> Phiên bản sau khi dọn dẹp - 19/05/2026

## Mục đích

Tài liệu được tổ chức lại theo hướng:
- Ít file hơn
- Dễ tìm, dễ hiểu
- Tập trung vào kiến trúc + quy trình phát triển

## Cấu trúc tài liệu thống nhất

| Tài liệu | Mô tả | Đối tượng đọc |
| :--- | :--- | :--- |
| **[Đặc tả Nghiệp vụ y tế](./specs/UNIFIED_DOMAIN_SPECIFICATION.md)** | Định nghĩa thuật ngữ, mô tả hành trình VST, CSSD, QLCV, NKBV và chuẩn FHIR/HIS. | Dev, AI, Nghiệp vụ |
| **[Quy chuẩn Kỹ thuật & UI/UX](./guides/UNIFIED_ENGINEERING_GUIDELINES.md)** | Quy định lập trình (DDD, Server Actions, RLS), layout primitives UI và cổng chất lượng PR. | Toàn bộ Dev & AI |
| **[Cẩm nang Vận hành, Bảo mật & DB](./operations/UNIFIED_OPERATIONS_SOP.md)** | Quản trị Auth, phân vai trò RBAC y tế, SOP đồng bộ DB và tối ưu Smart DB. | Dev, DevOps, DB Admin |
| **[Tài liệu Bàn giao & Lộ trình](./handover/UNIFIED_HANDOVER_AND_ROADMAP.md)** | Bàn giao tổng thể cấu trúc thư mục, sơ đồ dữ liệu tham chiếu và 8 mảnh lộ trình phát triển. | Toàn bộ team |
| **[Bản đồ ánh xạ live](./specs/10-bv103-implementation-mapping.md)** | SSOT ánh xạ live giữa thuật ngữ spec và thực thể database thực tế. | Dev, AI |

## File quan trọng khác (root)

- [AGENTS.md](../AGENTS.md) — **Quy tắc cốt lõi** và hiến pháp tối cao của dự án (bắt buộc đọc)
- [README.md](../README.md) — Giới thiệu tổng quan hệ thống và quick start
- [CHANGELOG.md](../CHANGELOG.md) — Lịch sử cập nhật hệ thống

## Ghi chú

Hệ thống tài liệu đã được quy hoạch, gộp hoàn toàn hơn 50+ file rời rạc cũ thành 4 cột trụ tài liệu thống nhất vào tháng 05/2026. Các file cũ đã được lưu trữ an toàn trong thư mục `docs/archive_legacy/` để bảo vệ lịch sử git.