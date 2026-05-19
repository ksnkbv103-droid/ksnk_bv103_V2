# Development Guide - KSNK BV103

> Phiên bản sau khi dọn dẹp - 19/05/2026

## Triết lý phát triển cốt lõi

- Làm theo mảnh (Vertical Slice): Chỉ làm một mảnh tại một thời điểm.
- Pilot DoD: Mỗi mảnh phải đạt Definition of Done trước khi coi là xong.
- Boy Scout Rule: Chạm vào code nào, để lại sạch đẹp hơn.

## Pilot Definition of Done (Bắt buộc)

Một mảnh được coi là hoàn thành pilot khi đạt đủ:
1. Xác định rõ người dùng / môi trường sử dụng
2. Ít nhất 3 kịch bản tay chạy được
3. Dữ liệu + Migration/RPC đã apply đúng trên DB pilot
4. Build + verify:engineering pass

## Quy trình thực hiện một mảnh

1. Xác định contract (types)
2. Viết migration (nếu có thay đổi schema)
3. Implement Server Action + Permission gate
4. Xây dựng UI tối thiểu đủ dùng
5. Viết test cơ bản
6. Apply DB pilot
7. Chạy verify + build
8. Demo và đánh dấu xong mảnh

## Quality Gates

- npm run verify:engineering
- npm run build
- Lint + Architecture lint
- Test coverage
- Security scan

## Nguyên tắc vàng

- Dữ liệu đúng quan trọng hơn UI đẹp
- Không thay đổi schema DB mà chưa có migration
- Luôn suy nghĩ đến người bảo trì sau này
- Không tạo technical debt mới