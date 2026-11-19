# ADR 20261119 — CSSD-042: RLS danh mục loại bao gói dùng module BO_DC

Dòng sổ lỗi: CSSD-042 (DA_XAC_MINH). Migration: `supabase/migrations/20261119160000_cssd_042_rls_loai_bao_goi_module_bo_dc.sql`. Định nghĩa gốc `20261005145000_cssd_me05_hsd_bao_goi.sql` (dòng 58–69) đã áp prod nên không sửa, thêm migration mới.

## Bối cảnh

- `public.cssd_dm_loai_bao_goi` có hai policy: `_select` (`fn_sys_has_permission('CSSD','view')`) và `_write` FOR ALL (`fn_sys_has_permission('CSSD','edit')`).
- `sys_permissions` không có `module_name = 'CSSD'` (chỉ `CSSD_REPORT`, `CSSD_KHO_DUNGCU`, `CSSD_WORKFLOW`, `BO_DC`…); `fn_sys_has_permission` khớp đúng tên module hoặc `fn_sys_is_admin()` ⇒ thực tế chỉ ADMIN đọc/ghi được.
- App kiểm quyền danh mục này bằng `verifyPermission("BO_DC","view")` rồi đọc bằng admin client (`bo-dung-cu.actions.ts`). Local: BO_DC view = ADMIN, HOI_DONG_KSNK, NHAN_VIEN_KSNK; BO_DC edit = ADMIN.

## Phương án

- A. Tạo lại hai policy cùng tên với `BO_DC` (đọc `view`, ghi `edit`), giữ `TO authenticated`, không đổi GRANT/bảng/dữ liệu.
- B. Giữ ADMIN-only, chỉ ghi chú rõ chủ ý.
- C. Thêm module `'CSSD'` vào `sys_permissions` và gán vai.

## Phản biện

- B giữ một policy tham chiếu module không tồn tại: người đọc hiểu sai, và lệch với quyền app đã kiểm (BO_DC).
- C tạo module quyền mới trùng nghĩa với các module CSSD_* / BO_DC, đổi quyền người dùng thật, cần PO.
- A khớp RLS với quyền app đang dùng; ghi vẫn chỉ ADMIN (BO_DC edit = ADMIN) nên không mở rộng quyền ghi; đọc mở cho vai đã có BO_DC view.

## Chọn

Phương án A. Kiểm chứng: `supabase/tests/database/cssd_042_rls_loai_bao_goi_module_bo_dc.test.sql` (policy chứa `BO_DC`, không còn `'CSSD'`; vai có BO_DC view đọc được, không ghi được; người không vai thấy 0 dòng; ADMIN ghi được; GRANT không đổi). Hoàn tác: DROP hai policy, CREATE lại như `20261005145000` (`'CSSD'`).
