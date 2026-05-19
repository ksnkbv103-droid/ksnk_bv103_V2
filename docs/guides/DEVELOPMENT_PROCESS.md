# Development Process - KSNK BV103

> Hướng dẫn quy trình phát triển theo mảnh (slice) và Pilot DoD.

## 1. Nguyên tắc cốt lõi

- Làm theo **mảnh (bounded context)**, chỉ focus **1 mảnh active** tại một thời điểm.
- Không audit toàn repo trước khi ship mảnh.
- Refactor chỉ khi chạm file của mảnh đang làm hoặc có pain rõ ràng.

## 2. Pilot Definition of Done (DoD) - Bắt buộc

Một mảnh được coi là **hoàn thành pilot** khi đạt đủ 5 tiêu chí:

1. **Ai dùng**: Xác định rõ khoa / vai trò người dùng.
2. **Môi trường**: local / staging / production.
3. **3 kịch bản tay**: Tạo → Lưu → Xem lại; Sửa; Xóa mềm (nếu có).
4. **Dữ liệu**: Migration / RPC đã apply đúng trên DB pilot.
5. **Build**: `npm run build` hoặc `verify:engineering` pass.

## 3. Quy trình làm một mảnh (Vertical Slice)

1. Types / Contract
2. Migration (nếu cần)
3. Server Action / RPC + Permission gate
4. UI tối thiểu (dùng được)
5. Verify 3 kịch bản + build

## 4. Backlog mảnh đang active

Cập nhật thường xuyên trong `PROGRESS_REPORT.md` hoặc issue.

## 5. Tham khảo

- [PROGRESS_REPORT.md](../PROGRESS_REPORT.md) (bản gốc)
- [AGENTS.md](../AGENTS.md)

---

**Last updated**: 19/05/2026