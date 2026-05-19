# AGENTS.md - KSNK BV103

> Phiên bản làm sạch - 19/05/2026

## Triết lý cốt lõi

**Boy Scout Rule**
Khi chạm vào code, hãy để lại nó sạch đẹp hơn.

**Ưu tiên:**
1. Long-term Maintainability + Developer Experience
2. Đúng nghiệp vụ + Dữ liệu nhất quán
3. Security, Test Coverage, Observability
4. Không tạo technical debt mới

## Quy trình phát triển

### Làm theo mảnh (Vertical Slice)
Chỉ làm một mảnh tại một thời điểm. Mỗi mảnh phải có Pilot DoD rõ ràng.

### Pilot DoD
1. Xác định rõ người dùng/môi trường
2. Ít nhất 3 kịch bản tay chạy được
3. Dữ liệu + Migration/RPC đã apply đúng
4. Build + verify:engineering pass

## Kiến trúc & Code Quality

- DDD rõ ràng trong src/modules/
- Logic nghiệp vụ để trong lib/ và actions/
- Bắt buộc dùng verifyPermission
- Ưu tiên Server Action
- Viết test cho phần thuần

## Quy tắc làm việc

- Tập trung vào một mảnh
- Chạy verify trước khi push
- PR nhỏ, mô tả rõ ràng
- Conventional Commits

## Lưu ý quan trọng

- Dữ liệu đúng quan trọng hơn UI đẹp
- Không thay đổi DB mà chưa có migration
- Security và quyền phải rõ ràng

## Tài liệu Tham chiếu Thống nhất

- **Quy chuẩn Kỹ thuật & UI/UX:** [UNIFIED_ENGINEERING_GUIDELINES.md](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/guides/UNIFIED_ENGINEERING_GUIDELINES.md)
- **Đặc tả Nghiệp vụ y tế:** [UNIFIED_DOMAIN_SPECIFICATION.md](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/specs/UNIFIED_DOMAIN_SPECIFICATION.md)
- **Cẩm nang Vận hành, Bảo mật & DB:** [UNIFIED_OPERATIONS_SOP.md](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/operations/UNIFIED_OPERATIONS_SOP.md)
- **Bàn giao & Lộ trình:** [UNIFIED_HANDOVER_AND_ROADMAP.md](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/handover/UNIFIED_HANDOVER_AND_ROADMAP.md)