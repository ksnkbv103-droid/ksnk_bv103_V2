# ADR 20261119 — NEN-020 (gộp NEN-018): thu EXECUTE của anon/PUBLIC trên 35 hàm schema public

Dòng sổ lỗi: NEN-020, NEN-018. Migration: `supabase/migrations/20261119210000_nen_020_revoke_anon_public_execute_35_ham.sql`.

## Bối cảnh

`db-verify` đo 19/11 trên DB local: 35 hàm `public` (owner `postgres`, đều SECURITY INVOKER) còn `has_function_privilege('anon', …, 'EXECUTE') = t`; 34 hàm còn qua PUBLIC (`=X/postgres` trong `proacl`), riêng `cssd_su_co_counts_for_red_alert` chỉ còn `anon=X` tường minh. Mọi hàm đều đã có `authenticated=X` và `service_role=X`. Đây là ACL sót từ trước `20261020235907_default_privileges_revoke_public_execute.sql` và `20261021003002_sec1_revoke_and_rls_tighten.sql` (hai file đó chỉ thu mặc định cho hàm mới). Schema public: 0 policy cho anon/public; không có bảng RLS-off nào anon có SELECT. Gọi thử bằng anon: `rpc_get_compliance_dashboard_v4` trả rỗng, `rpc_qlcv_board_counts`, `fn_nkbv_ssi_rates_by_surgery`, `mdm_refresh_governance_suggestions` báo lỗi quyền/RLS. Chưa có đường lộ dữ liệu đo được: mức THẤP, hygiene.

Nơi gọi trong `src/`: client anon không phiên chỉ là `createServerSupabaseClient` và chỉ `src/modules/auth/actions/staff-password.actions.ts` dùng, không gọi RPC nào trong danh sách. Các RPC có nơi gọi (`rpc_qlcv_board_counts`, `rpc_gsc_tgs_session_hits`, `fn_nkbv_ba_hub`, `fn_nkbv_ba_keys_chua_phan_tich`, `rpc_gstt_dm_bang_kiem_max_numeric_suffix`) chạy sau đăng nhập; `mdm_refresh_governance_suggestions` chạy bằng service key (`scripts/mdm-governance-refresh.mjs`) hoặc phiên đăng nhập (`mdm-governance.actions.ts`). Hàm trigger không cần EXECUTE của người kích hoạt (chỉ kiểm lúc `CREATE TRIGGER`).

## Phương án

- A. Một migration: với 35 chữ ký tường minh, `REVOKE EXECUTE … FROM PUBLIC, anon` rồi `GRANT EXECUTE … TO authenticated, service_role`; bỏ qua (NOTICE) hàm không có trên DB đích.
- B. Vòng lặp động theo `pg_proc` (mọi hàm owner postgres anon gọi được).
- C. Chỉ `REVOKE … FROM anon`.
- D. Không làm.

## Phản biện

- B: tự mở rộng theo trạng thái DB lúc chạy; ở prod có thể thu nhầm hàm mà người đăng nhập đang dựa vào PUBLIC. Danh sách tường minh truy vết được.
- C: anon vẫn nhận EXECUTE qua PUBLIC, `has_function_privilege` vẫn t.
- D: để lại 35 bề mặt gọi được không cần đăng nhập; nếu sau này anon được cấp SELECT bảng thì hàm thành đường đọc.
- A: chỉ đổi ACL, không đổi thân hàm/chữ ký/SECURITY/search_path. `authenticated`, `service_role` đã có quyền tường minh và được GRANT lại nên mất PUBLIC không ảnh hưởng người gọi hiện có. `postgres` (owner) giữ `postgres=X`.

## Chọn

Phương án A.

Không đụng 4 hàm `unaccent*` (owner `supabase_admin`, thuộc extension): ngoài quyền của `postgres`, không có đường lộ dữ liệu; giữ và ghi ở đây. Đuôi còn lại ngoài phạm vi, giữ nguyên: default ACL SEQUENCE `postgres|public|S` còn `anon=rwU` (baseline), nếu muốn sửa thì mở dòng sổ riêng.

Rủi ro prod: CHƯA áp prod. Áp qua MCP `apply_migration` sau khi PO gõ «prod». Trước khi áp, đo prod (chỉ đọc) bằng câu SELECT ở cuối file migration và đối chiếu `proacl`. Vai khác ngoài `authenticated`/`service_role`/`postgres` (vd `supabase_auth_admin`, `supabase_storage_admin`) mà dựa vào PUBLIC để gọi hàm public sẽ mất quyền gọi; kỳ vọng không có (không có policy storage/auth tham chiếu các hàm này trên local; prod cần đo lại). Không hàm nào SECURITY DEFINER nên `scripts/acl-snapshot.mjs` không đổi.

Kiểm chứng: câu đếm của dòng NEN-020 trước 35, sau 0; pgTAP `supabase/tests/database/nen_020_anon_khong_execute_ham_public.test.sql` (5 assert); `npm run verify:mdm:local`; `so-loi.mjs check` exit 0.

Hoàn tác: khối Rollback cuối file migration (GRANT lại PUBLIC, anon theo cùng danh sách).
