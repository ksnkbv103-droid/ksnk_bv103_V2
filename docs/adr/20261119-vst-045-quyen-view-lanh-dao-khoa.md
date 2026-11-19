# ADR 20261119 — VST-045: hàng quyền `GIAM_SAT_VST:view` phải do migration chèn

Dòng sổ lỗi: VST-045. Migration: `supabase/migrations/20261119180000_vst_045_quyen_view_lanh_dao_khoa.sql`.

## Bối cảnh

`20261119150000_vst_028_vai_lanh_dao_khoa.sql` gán quyền cho vai `LANH_DAO_KHOA` bằng `JOIN sys_permissions ON module_name='GIAM_SAT_VST' AND action='view'` và ghi chú «đã có». Hàng đó không nằm trong migration nào: trên prod nó có sẵn, trên DB dựng mới nó chỉ xuất hiện khi `supabase/seeds/00-rbac.sql` chạy, sau toàn bộ migration. Kết quả: DB dựng mới có vai `LANH_DAO_KHOA` không có quyền nào; `db:dung` đỏ pgTAP `vst_rls` test 5, 16, 17, 18 (4/30). Việc đỏ này chặn `so-loi.mjs check` (VST_GSC) và lô prod.

## Phương án

- A. Migration mới chèn hàng `sys_permissions` (`ON CONFLICT (module_name, action) DO NOTHING`) rồi chèn lại `sys_role_permissions` cho `LANH_DAO_KHOA`.
- B. Sửa `20261119150000` cho chèn thêm hàng quyền.
- C. Chỉ sửa seed.

## Phản biện

- B: file nằm trên `PROD_HEAD` nhưng ghi chú của chính nó nói phải áp bằng `migration repair` trên prod; sửa nội dung sau khi đã được dùng làm mốc đối chiếu làm lệch checksum, và sổ lỗi đã chốt không sửa file này.
- C: seed chạy sau migration nên không bao giờ gán được liên kết vai ↔ quyền cho `LANH_DAO_KHOA` vì liên kết đó do migration tạo; chuỗi CI vẫn đỏ.
- A: trên prod cả hai hàng đã có nên `DO NOTHING` không đổi gì. Seed chèn cùng khóa với `DO UPDATE description` nên không trùng khóa. Không đụng RLS, GRANT hay RPC.

## Chọn

Phương án A.

Kiểm chứng: `npm run db:dung` (pgTAP `vst_rls` 30/30), `scripts/acl-snapshot.mjs`, `so-loi.mjs check` exit 0.

Hoàn tác: xóa dòng `sys_role_permissions` của `LANH_DAO_KHOA` + `GIAM_SAT_VST:view` nếu cần; không xóa hàng `sys_permissions` (seed và prod dùng chung).
