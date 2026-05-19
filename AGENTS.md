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