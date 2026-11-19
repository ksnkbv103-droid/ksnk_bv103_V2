# ADR 20261119 — NEN-009: thu quyền EXECUTE của anon trên `rpc_mdm_nhan_su_max_numeric_suffix`

Dòng sổ lỗi: NEN-009. Migration: `supabase/migrations/20261119200000_nen_009_revoke_anon_max_numeric_suffix.sql`.

## Bối cảnh

`public.rpc_mdm_nhan_su_max_numeric_suffix(text)` (SECURITY INVOKER, `search_path=public`) định nghĩa ở baseline `20260530000000_init_pilot_baseline.sql`, được `GRANT ALL` cho `anon`/`authenticated`/`service_role` và còn EXECUTE mặc định cho PUBLIC (`=X` trong `proacl`). `db-verify` xác minh 19/11 trên DB local: `has_function_privilege` EXECUTE = t cho cả `anon`, `authenticated`, `service_role`. `anon` không có SELECT `mdm_nhan_su` nên gọi chỉ lỗi quyền bảng, không lộ dữ liệu: đây là quyền thừa, mức THẤP. Hai nơi gọi (`src/modules/to-chuc/nhan-su/actions/nhan-su-read.actions.ts:135`, `src/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/account-access-request.actions.ts:37`) đều chạy trong phiên đăng nhập.

## Phương án

- A. Migration mới: `REVOKE EXECUTE ... FROM PUBLIC, anon` rồi `GRANT EXECUTE ... TO authenticated, service_role` (idempotent).
- B. Sửa dòng GRANT trong baseline.
- C. Chỉ `REVOKE ... FROM anon`, giữ PUBLIC.
- D. Không làm (không lộ dữ liệu).

## Phản biện

- B: baseline nằm dưới `PROD_HEAD`, bất biến (`guard-migrations.mjs --bat-bien`).
- C: `anon` vẫn nhận EXECUTE qua PUBLIC, `has_function_privilege('anon', …)` vẫn t; không sửa được gì.
- D: để lại bề mặt gọi được không cần đăng nhập; nếu sau này `anon` được cấp SELECT bảng thì hàm thành đường đọc.
- A: chỉ đổi ACL một hàm; `authenticated` và `service_role` được GRANT tường minh nên mất PUBLIC không ảnh hưởng hai nơi gọi. Không đổi thân hàm, chữ ký, SECURITY, `search_path`.

## Chọn

Phương án A.

Rủi ro prod: CHƯA áp prod. Áp qua MCP `apply_migration` sau khi PO gõ «prod». Trước khi áp, đối chiếu ACL prod (chỉ đọc): `SELECT proacl FROM pg_proc WHERE oid = 'public.rpc_mdm_nhan_su_max_numeric_suffix(text)'::regprocedure;`. Nếu prod có vai khác (ngoài 3 vai trên) dựa vào EXECUTE qua PUBLIC thì vai đó mất quyền gọi; kỳ vọng không có. Hàm không phải SECURITY DEFINER nên `scripts/acl-snapshot.mjs` không chụp hàm này (snapshot không đổi).

Kiểm chứng: `has_function_privilege('anon', …, 'EXECUTE')` trước t, sau f; pgTAP `supabase/tests/database/nen_009_rpc_mdm_nhan_su_max_numeric_suffix.test.sql` (3 assert); `npm run verify:mdm:local`; `node scripts/acl-snapshot.mjs` PASS; `so-loi.mjs check` exit 0.

Hoàn tác: `GRANT EXECUTE ON FUNCTION public.rpc_mdm_nhan_su_max_numeric_suffix(text) TO PUBLIC, anon;` (khối Rollback cuối file migration).
