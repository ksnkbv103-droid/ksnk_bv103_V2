# KSNK BV103 — PULL REQUEST TEMPLATE

## 1. Mô tả Pull Request
* **Mảnh ACTIVE liên quan:** (Ví dụ: `S1 - VST end-to-end`, `S7 - Công việc`, ...)
* **Tóm tắt thay đổi:** (Mô tả ngắn gọn những gì đã làm và lý do thực hiện)
* **Các file DB Migration mới (nếu có):** (Liệt kê tên file trong `supabase/migrations/`)

---

## 2. Pilot Definition of Done (DoD)
*Vui lòng tích chọn nếu PR này hoàn thành một mảnh pilot nghiệp vụ:*
- [ ] **Ai dùng:** Xác định rõ khoa / vai trò người dùng cuối: `________________________`
- [ ] **Môi trường:** Đã xác định rõ môi trường chạy thử (local / staging / production).
- [ ] **3 kịch bản tay:** Đã tự tay chạy và kiểm thử thành công ít nhất 3 kịch bản chính:
  1. *Kịch bản 1:* Tạo → Lưu → Xem lại thành công.
  2. *Kịch bản 2:* Sửa đổi dữ liệu thành công.
  3. *Kịch bản 3:* Xóa mềm hoặc xử lý lỗi nghiệp vụ thành công.
- [ ] **Dữ liệu:** Migration và các hàm RPC tương ứng đã được apply đồng bộ lên DB của môi trường pilot.
- [ ] **Build:** Build ứng dụng thành công ở môi trường local (`npm run build`).

---

## 3. [P0] Bắt buộc: Alignment Check
- [ ] **Data Mapping:** Đã cập nhật đầy đủ file ánh xạ nghiệp vụ [implementation-mapping.md](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/core/implementation-mapping.md) (bao gồm cả Changelog ở cuối file) nếu PR này có thay đổi về Schema DB, Bảng, View hoặc RPC?
- [ ] **Permission Gate:** Mọi Server Action ghi/xóa dữ liệu mới thêm đều đã được bọc qua cổng kiểm tra quyền `verifyPermission` hoặc `verifyPermissions` chưa?
- [ ] **No Direct CSSD Imports:** Không import trực tiếp `@/modules/cssd-erp/actions/*` từ bên ngoài module CSSD (phải dùng qua `contexts/*/entrypoint` nếu có)?

---

## 4. [P0] Bắt buộc: Database & Quality Check
*Vui lòng chạy các lệnh sau dưới local trước khi gửi PR:*

- [ ] **Verify Engineering:** Đã chạy `npm run verify:engineering` thành công? (Đảm bảo không quét toàn bảng `fact_*` vô tội vạ).
- [ ] **Linting:** Đã chạy `npm run lint` và `npm run lint:cssd-architecture` thành công (0 errors)?
- [ ] **Unit Tests:** Đã chạy `npm run test:cssd` và `npm run test:pilot` thành công?
- [ ] **DB Precheck:** Đã chạy precheck schema DB cục bộ thành công bằng lệnh:
  * `npm run trial:db:precheck:local` (hoặc `npm run trial:db:precheck` đối với DB liên kết remote)

---

## 5. Ảnh chụp / Video minh họa (nếu có thay đổi UI)
*(Kéo thả ảnh hoặc video vào đây để minh họa sự thay đổi trực quan)*
