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

## 5. Quy trình Kiểm soát Dữ liệu & PR (Quy chuẩn P0) - Bắt buộc

Mọi thay đổi trước khi merge vào nhánh chính phải tuân thủ nghiêm ngặt quy định chất lượng P0 để tránh làm gãy ứng dụng (crash runtime):

1. **Tuân thủ SOP Đồng bộ DB**: Lập trình viên phải tuân thủ đúng quy trình 4 bước khi thay đổi cấu trúc dữ liệu, chạy đầy đủ precheck và không sửa DB bằng tay trên remote. Xem chi tiết tại [SOP Đồng bộ Cơ sở Dữ liệu](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/operations/DB_SYNCHRONIZATION_SOP.md).
2. **Siết chặt Alignment Check**: Khi thay đổi schema, bắt buộc cập nhật tài liệu mapping [10-bv103-implementation-mapping.md](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/specs/10-bv103-implementation-mapping.md) và gán gate `verifyPermission` cho mọi Server Action ghi/xóa dữ liệu mới.
3. **Sử dụng PR Template**: Khi tạo Pull Request, bắt buộc điền đầy đủ thông tin theo mẫu [PR Template](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/.github/pull_request_template.md) và tích chọn kiểm tra các đầu việc trước khi yêu cầu review.

## 6. Tham khảo

- [PROGRESS_REPORT.md](../PROGRESS_REPORT.md) (bản gốc)
- [AGENTS.md](../AGENTS.md)
- [SOP Đồng bộ Cơ sở Dữ liệu](../operations/DB_SYNCHRONIZATION_SOP.md)
- [PR Template](../../.github/pull_request_template.md)

---

**Last updated**: 20/05/2026