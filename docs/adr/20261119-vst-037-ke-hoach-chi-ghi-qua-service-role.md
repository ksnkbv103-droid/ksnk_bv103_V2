# ADR 20261119 — VST-037: bảng kế hoạch giám sát chỉ ghi qua service_role

Dòng sổ lỗi: VST-037 (DA_XAC_MINH, db-verify 19/11). Migration: `supabase/migrations/20261119120000_vst_037_ke_hoach_chi_ghi_qua_service_role.sql`. Migration gốc `20261118110000_gstt_ke_hoach_giam_sat.sql` đã áp prod 19/11 nên không sửa, thêm migration mới.

## Bối cảnh

- `gstt_fact_ke_hoach_giam_sat` có `GRANT SELECT, INSERT, UPDATE … TO authenticated` và hai policy `gstt_ke_hoach_insert`, `gstt_ke_hoach_update` cho mọi nhân sự thuộc khoa KSNK (`fn_qlcv_ksnk_khoa_id`), không xét vai, `WITH CHECK` không khóa `nguoi_lap_id`, `khoa_id`, `thang`, `loai`.
- Action `setKeHoachKhoa` (`ke-hoach-giam-sat.actions.ts`) chỉ cho ADMIN và NHAN_VIEN_KSNK (`verifyPermission`), ghi qua `createAdminSupabaseClient` (service_role). Grep `src` và `scripts`: không còn đường nào ghi bảng này bằng client người dùng. RLS rộng hơn action, nên một nhân sự khoa KSNK khác vai (ví dụ trợ lý) ghi thẳng qua PostgREST được, kể cả đặt `nguoi_lap_id` của người khác.
- Action không gọi `logAdminAction` (so `vst-write-delete.actions.ts`), nên thay đổi kế hoạch không để lại nhật ký quản trị.
- Các bảng `gstt_*` cùng họ đều ghi qua service_role; chỉ bảng này dựa vào khoa.

## Phương án

- A. Migration mới: `DROP POLICY` insert/update và `REVOKE INSERT, UPDATE FROM authenticated`; action gọi `logAdminAction` ở nhánh lập và nhánh bỏ.
- B. Giữ ghi qua PostgREST, siết policy: thêm điều kiện vai (`fn_sys_has_permission`) và `nguoi_lap_id = nhân sự đăng nhập` vào `WITH CHECK`.
- C. Chỉ thêm `logAdminAction`, để nguyên RLS.

## Phản biện

- B: nhân đôi kiểm quyền ở hai nơi (action và policy) cho một đường ghi duy nhất và không dùng; mỗi lần đổi ma trận vai phải sửa cả hai; vẫn để authenticated ghi được cột `khoa_id`, `thang`, `loai` nếu viết thiếu.
- C: không đóng lỗ RLS, nhật ký chỉ phủ đường đi qua action.
- A: đúng mẫu các bảng `gstt_*` còn lại. `SELECT` và policy `gstt_ke_hoach_select` giữ nguyên nên trang kế hoạch và RPC tiến độ đọc như cũ. Không có người dùng nào mất quyền đang dùng vì chỉ action ghi bảng. Chưa có quyết định PO về việc cho CHU_NHIEM_KHOA hoặc MANG_LUOI_KSNK lập kế hoạch khoa mình (giữ như action hiện tại: ADMIN, NHAN_VIEN_KSNK); nếu PO cho thì mở trong action, không mở lại ghi trực tiếp.

## Chọn

Phương án A. Kiểm chứng: `supabase/tests/database/vst_037_ke_hoach_chi_service_role.test.sql` (6 ca: không còn policy INSERT/UPDATE, authenticated mất INSERT/UPDATE nhưng còn SELECT, service_role còn ghi, ghi trực tiếp bị từ chối `42501`) và `ke-hoach-giam-sat.actions.spec.ts` (7 ca, gồm ghi nhật ký ở hai nhánh, không ghi khi `23505` hoặc khi bỏ kế hoạch mà UPDATE khớp 0 dòng). Hoàn tác: `CREATE POLICY gstt_ke_hoach_insert/update` lại như `20261118110000` (dòng 89–123) và `GRANT INSERT, UPDATE … TO authenticated`.
