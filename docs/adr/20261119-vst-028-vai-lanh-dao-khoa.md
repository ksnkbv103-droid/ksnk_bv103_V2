# ADR 20261119 — VST-028: vai LANH_DAO_KHOA đọc phiên VST có danh tính của khoa mình

Dòng sổ lỗi: VST-028 (PO 2026-11-17 phiếu N3, 2026-11-19 khung tích chọn). Migration: `supabase/migrations/20261119150000_vst_028_vai_lanh_dao_khoa.sql`. Migration trước cùng hai policy `20261114160000_gstt_vst_rls_cnk_toan_vien.sql` đã áp prod nên không sửa; file mới thay nó làm migration cuối áp lên `vst_sessions_select_permission` và `vst_obs_select_permission`.

## Bối cảnh

- R1.34: danh sách phiên có tên chỉ cho ĐDT khoa và CB_KSNK. PO chọn một vai chung `LANH_DAO_KHOA` cho ĐDT và chủ nhiệm khoa lâm sàng, không dùng `CHU_NHIEM_KHOA` (vai này là chủ nhiệm khoa KSNK, đọc toàn viện).
- Policy hiện hành có nhánh «còn lại»: `NOT MANG_LUOI_KSNK AND CASE WHEN HOI_DONG_KSNK THEN false ELSE true END`. Mọi vai có `GIAM_SAT_VST:view` mà không thuộc vai đã liệt kê thì đọc toàn viện. Chỉ gán quyền view cho vai mới thì LĐK rơi vào nhánh này và thấy mọi khoa.
- App đọc VST bằng service_role; phạm vi ở code đã sửa trong `vst-read-scope.ts`. RLS là lớp chặn đường PostgREST trực tiếp và hai view `security_invoker`.

## Phương án

- A. Thêm vai + chỉ quyền `GIAM_SAT_VST:view`; tạo lại hai policy: thêm nhánh `LANH_DAO_KHOA AND khoa_id = fn_sys_actor_khoa_id()` và loại LĐK khỏi nhánh «còn lại».
- B. Thêm vai + quyền, không đụng RLS (chỉ dựa vào scope ở code).
- C. Dùng lại `MANG_LUOI_KSNK` cho ĐDT/CN khoa.

## Phản biện

- B: LĐK gọi PostgREST trực tiếp đọc được phiên có tên của mọi khoa, trái R1.34.
- C: mạng lưới còn thấy phiên mình giám sát ở khoa khác và có thể có quyền ghi; PO đã yêu cầu vai riêng.
- A: thêm một điều kiện vào nhánh «còn lại», vai khác không đổi. Kiêm vai: LĐK + NHAN_VIEN_KSNK/CHU_NHIEM_KHOA vẫn toàn viện (nhánh của vai đó); LĐK + MANG_LUOI_KSNK = hợp luật mạng lưới và khoa mình; LĐK + HOI_DONG_KSNK vẫn đọc khoa mình (nhánh LĐK độc lập); LĐK chưa gắn khoa → `NULL = NULL` là false → 0 dòng. Rủi ro: chạy lại riêng một file policy cũ sẽ mất nhánh LĐK và nhánh «còn lại» lại mở toàn viện cho LĐK.

## Chọn

Phương án A. Không gán vai cho ai (cổng PO), không đổi GRANT bảng, không đụng RPC thống kê ẩn danh.

Kiểm chứng: `supabase/tests/database/vst_rls.test.sql` (LĐK khoa 2 chỉ thấy S2 và quan sát của S2; LĐK chưa gắn khoa 0 dòng; LĐK + NHAN_VIEN_KSNK thấy toàn viện; LĐK không INSERT/UPDATE/DELETE trực tiếp phiên thấy được), `scripts/readiness/acl-snapshot.mjs`.

Hoàn tác: tạo lại hai policy nguyên văn `20261114160000` (dòng 81–151), xóa dòng `sys_role_permissions` của LĐK rồi dòng `sys_roles` (chỉ khi chưa gán cho ai). Khối SQL đầy đủ ở cuối migration.
