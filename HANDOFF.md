# HANDOFF — Rà soát & cải tổ toàn diện (2026-11-06)

Plan đã duyệt: `/Users/drnghia/.claude/plans/to-n-b-project-n-y-effervescent-panda.md`. Đợt rà soát CHỈ ĐỌC: không sửa code, không migration, không commit. Sản phẩm cuối: `BAO-CAO-CAI-TO-2026-11-06.md` ở gốc repo.

Ghi chú đo/báo cáo agent (scratchpad phiên cũ, có thể mất): `/private/tmp/claude-501/-Users-drnghia-Desktop-ksnk-bv103/2cdab364-eea8-4c00-863b-feadc07e9fa7/scratchpad/` — `dot0-ghi-chu.md`, `dot1-C-thong-ke.md`, `dot1-B-anh-xa.md`. Nên chép 3 file này vào chỗ bền nếu muốn giữ.

## Đã làm
- Đợt 0 (đo cơ học) xong. Đợt 1: trục C (thống kê) và B (SOP ↔ module) xong.

## Số đo đã sửa (thay số trong plan)
- 216.654 dòng TS/TSX, 55 route; NKBV 58.844 (27%); 60 file >500 dòng; 153 `any`; 114 npm scripts; 58 scripts.
- DB local (public): 61 bảng, 57 view, 156 hàm, 189 policy, 36 trigger, 304 index. 263 migration, hàm bị định nghĩa lại ~2,15 lần, policy ~1,9 lần; 82 migration trong 10/2026.
- Coupling Supabase: 85 file import `@supabase/*`; 915 `.from()` / 223 file / 84 bảng; 37 file `.rpc(` / 51 RPC; 40 file auth; Storage = 0, Realtime = 0. SQL: `auth.uid()` 74, `auth.users` 8, pg_cron 45 dòng, `request.jwt` 0, `storage.` 0.
- => Giả thuyết "SQL khoá vào Supabase" bị bác phần lớn; coupling thật = PostgREST builder, RLS theo role + auth.uid(), pg_cron.
- 4 RPC gọi từ TS không thấy CREATE trong migrations (cần kiểm drift): `fn_admin_module_stats`, `mdm_refresh_governance_suggestions`, `rpc_mdm_nhan_su_max_numeric_suffix`, `rpc_vst_compare_matrices_impl`.
- Giới hạn: local ≠ prod (53/61 bảng rỗng).
- **Usage PROD (ksnk-bv103-prod, id cvzwslpxwgqiugzzhqej, đo 2026-11-06 bằng Supabase MCP, chỉ SELECT pg_stat_user_tables/auth.users; PO đã ủy quyền):** 57 bảng, 18 rỗng; 21 auth users, 4 đăng nhập 30 ngày; 250 migration đã apply (repo 263 → ~13 chưa lên). Hàng sống: gstt_fact_vst 33.238 (ins 59.951) · gstt_fact_vst_sessions 3.609 · gstt_fact_chung_sessions 1.388 · CSSD danh mục (bo_dung_cu_chi_tiet 7.289, loai_dung_cu 2.311, bo_dung_cu 164; churn cao: del 17.366) · NKBV ba_ngay_khoa 1.523, ba_ngay_dung_cu 689, ba_timeline 200, benh_an 86, vi_sinh 99 · dao_tao_cau_hoi 787 (không phải 6000 như local), lan_thi 1 · qlcv_fact_nhiem_vu 1, cong_viec 0 (ins 16) · cssd_fact_quy_trinh 10, su_co 8, lo_tiet_khuan 2, kho_giao_dich 0, dm_hoa_chat 0 · mdm_nhan_su 36, khoa_phong 66. Số hàng là ước lượng thống kê (n_live_tup). => Giả thuyết 1 được xác nhận: VST+GSC chiếm áp đảo; NKBV có ~2.600 hàng nhưng chủ yếu nhập/xoá loạt (nkbv_fact_su_kien ins 1.292, live 1), CSSD vận hành chủ yếu là nhập danh mục, QLCV/Đào tạo gần như không dùng.

## Phát hiện chính (chưa tự xác minh từng dòng — agent báo)
- Thống kê: 2 nguồn công thức RPC+TS; `supervision-trend.ts:29-30` `?? 0` biến tuần thiếu thành 0%; "vs kỳ trước" = chênh 2 tuần cuối, không KTC; mẫu số VST loại dòng vượt trần mà không hiện số loại; GSC không đo độ chắc; ngưỡng 85/70, 80, 90/85 không căn cứ; KPI CSSD không có trong metric-dictionary; `/thong-ke/cssd` chỉ redirect.
- Domain: QT.01/02/04/05/09/34/35/36 không có chỗ trong app; QT.07–16,32 chỉ có bảng kiểm GSC; đánh số QT trong docs app lệch kho (VST: app QT.07, kho QT.06).
- 5 chuyên đề ưu tiên thống kê: Vệ sinh tay · PPE + tiêm an toàn · Vệ sinh môi trường · Chất thải + đồ vải · Gói phòng ngừa NK.

## Còn dở (Đợt 1 còn lại; agent ghim sẵn, tối đa 2 chỉ-đọc song song; agent explore-module không có Write → nhận kết quả qua tin nhắn)
- A: ma trận module × usage (cần Supabase MCP `/mcp` cho prod; nếu không, dùng local + nói rõ).
- D: UX/UI 55 route (+ `layout:drift-check`, ảnh preview).
- E: kiến trúc/mã chết (npx trong scratchpad, không cài vào repo).
- F: DB dọn dẹp (`db-verify`; 4 RPC drift; squash).
- G: thiết kế adapter + bảng coupling theo module (grep lại tên helper admin client — `createAdminClient|service_role` chỉ khớp 2 file).
- H: vận hành/scripts/`.claude`. I: bảo mật chỉ phần chưa phủ ở BAO-CAO-RA-SOAT-2026-11-05 §6.
- Đợt 2: tổng hợp; Đợt 3: 1 vòng `phan-bien`. Rồi viết `BAO-CAO-CAI-TO-2026-11-06.md` (7 mục như plan).

## Lệnh kiểm chứng
- Catalog DB local: `docker exec supabase_db_ksnk_bv103 psql -U postgres -At -c "<sql>"`.
- Không có thay đổi repo ngoài HANDOFF.md này: `git status` (các file untracked có sẵn từ trước không phải của đợt này).

## Giả định
- Chưa có PO xác nhận: ủy quyền Supabase MCP; module làm dứt điểm đầu tiên (gợi ý VST + GSC + thống kê).
- Hook `guard-agent-model` chặn agent ngoài danh sách ghim (`doc-tai-lieu` bị chặn → dùng `explore-module`).

## Kết quả trục G + F (2026-11-06, phiên 2, chỉ đọc)
**F — 4 RPC "nghi lệch": KHÔNG lệch.** Đều có CREATE trong migrations (handoff cũ grep thiếu): `fn_admin_module_stats` + `mdm_refresh_governance_suggestions` + `rpc_mdm_nhan_su_max_numeric_suffix` ở `20260530000000_init_pilot_baseline.sql`; `rpc_vst_compare_matrices_impl` là RENAME ở `20260704110000_vst_security_hardening.sql:101`. Prod (cvzwslpxwgqiugzzhqej) vs local: md5(prosrc), độ dài, SECURITY DEFINER giống hệt cả 4. ACL: 2 hàm DEFINER chỉ postgres+service_role (đúng hardening); 2 hàm INVOKER prod chỉ `=X` (PUBLIC)+service_role, local liệt kê thêm anon/authenticated — tương đương hiệu lực.
Chưa đối chiếu được 13 migration "chưa lên prod": prod ghi version theo thời điểm apply MCP (250 dòng, mới nhất 20261106005555) nên không diff theo version; cần diff theo nội dung/đối tượng nếu muốn.
**G — coupling theo module** (số `.from()` tĩnh / RPC khác nhau): quan-tri-he-thong 243/7 · cssd-erp 213/23 · giam-sat-nkbv 149/4 · cssd-su-co 81/5 · dao-tao 51/0 · qlcv 43/5 · giam-sat-chung 38/3 · giam-sat-vst 19/2 · lib 6 RPC. `mdm_nhan_su`, `mdm_dm_khoa_phong` là bảng chung chéo mọi module. 42 file gọi `auth.getUser/getSession/...`. Admin client (service_role): `src/lib/supabase-server.ts` (định nghĩa), `src/lib/analytics/strategic-analytics-cache.ts`; còn lại là scripts/spec.
**Adapter đề xuất (nhỏ nhất đúng gốc):** không bọc PostgREST toàn bộ. (1) `src/lib/data-access/` chỉ có 3 cổng: `getActor()` (gom 42 điểm auth), `db(role)` trả client duy nhất cho read/write (user vs admin), `rpc(name, args)` có type từ danh sách 51 RPC. (2) Mỗi module có `repo/` riêng cho truy vấn; làm theo thứ tự đang dùng thật: VST (19) → GSC (38) → thống kê, rồi CSSD. (3) QTHT/NKBV/CSSD-erp (≈600 `.from()`) không di chuyển trừ khi có lý do đổi nền tảng. (4) RLS theo role + auth.uid() và pg_cron (45 dòng) là phần khóa thật, adapter không gỡ được — ghi rõ khi quyết định rời Supabase.

## Kết quả trục E + H (2026-11-06, phiên 2, chỉ đọc)
**E — mã chết.** `npx knip` bị chặn (tải gói ngoài) → dùng script Node tự viết (scratchpad `orphans.mjs`, dò import theo tên file; bỏ qua page/layout/route/spec). Kết quả: 25/1630 file src không file nào import (≈3.064 dòng, ~1,4% codebase). Tiêu biểu: `NkbvBaCaseSheet.tsx` 531, `NkbvCaseEditor.tsx` 421 (chỉ 1 spec nhắc), `InstrumentIncidentFields.tsx` 251, `NkbvBaGridCasePrintView.tsx` 246, `cssd-set-bom-apply-core.ts` 198, `SupervisionActionBoard.tsx` 161, `ComprehensiveDimensionCompare.tsx` 158 (chỉ docs nhắc), `NkbvChecklistKsnkTab.tsx` 157, `CatalogDeNghiApproveQueue.tsx` 131, `SetReconcileApproveQueue.tsx` 113, `useMasterDataCrud.ts` 94 … (danh sách đủ: chạy lại script). 10 file đã grep chéo lại toàn repo: xác nhận không có tham chiếu (trừ 2 ngoại lệ nêu trên). Chưa xác minh: import động bằng chuỗi/barrel `index`; `app/manifest.ts` và `types/heic2any.d.ts` là false positive (Next/TS tự nạp). CI đã có `dead-code:scan` nhưng không bắt 25 file này → xem lại phạm vi của nó. NKBV chiếm 9/25 file chết, trùng khu vực 58.844 dòng (27%).
**H — vận hành.** `package.json` 114 script: 0 script trỏ file không tồn tại; 1 cặp trùng lệnh (`cssd:demo:reset` = `cssd:demo:reset:local`). `scripts/` 58 file: 0 file mồ côi (đều được package.json/.github/docs/.claude nhắc). CI: 2 workflow (`ci.yml` gồm audit, guard tên bảng, docs links, layout drift/typography, repo:hygiene, dead-code:scan, lint, verify:cssd, coverage, verify:engineering, build; job e2e Playwright; `security.yml`). `.claude`: 10 agent, 4 skill (destructive-change, react-dev, smart-db-bv103, supabase), 10 command, 11 rule (27,8 KB), 2 hook; CLAUDE.md 6,1 KB. Không thấy dư thừa rõ ràng; rủi ro nằm ở 114 script khó nhớ hơn là file chết.

## Kết quả trục A + D (2026-11-06, phiên 3, chỉ đọc)
**A — ma trận module × usage** (usage = prod đo 2026-11-06 ở dòng "Usage PROD"; dòng code = `src/modules`; `.from()`/RPC = trục G):
| Module | Dòng TS/TSX | `.from()`/RPC | Prod (hàng sống) | Kết luận |
|---|---|---|---|---|
| VST | 6.187 | 19/2 | fact_vst 33.238, sessions 3.609 | DÙNG THẬT, nhỏ nhất → làm dứt điểm trước |
| GSC | 9.717 | 38/3 | chung_sessions 1.388 | DÙNG THẬT |
| Thống kê (dashboard) | 7.169 | — | đọc từ VST/GSC | DÙNG THẬT (công thức: trục C) |
| NKBV | 58.844 (27%) | 149/4 | ~2.600 hàng, chủ yếu nhập/xoá loạt (su_kien live 1) | Code nhiều nhất, dùng ít; 9/25 file chết |
| CSSD (erp+su-co) | 39.176 | 294/28 | danh mục 9.7k; quy_trinh 10, su_co 8, lò 2, kho_gd 0 | Chỉ nhập danh mục, chưa vận hành |
| QLCV | 15.453 | 43/5 | nhiem_vu 1, cong_viec 0 | Gần như không dùng |
| Đào tạo | 5.101 | 51/0 | câu hỏi 787, lan_thi 1 | Chưa dùng |
| QTHT | 26.700 | 243/7 | nhan_su 36, khoa_phong 66 | Hạ tầng dùng chung |
Tỷ lệ lệch: 3 module dùng thật = ~23k dòng (11%); NKBV+CSSD+QLCV+Đào tạo = ~119k dòng (55%) với gần như 0 người dùng. Prod: 21 user, 4 đăng nhập 30 ngày.
**D — UX/UI 52 `page.tsx` (HANDOFF cũ ghi 55: đếm lại = 52 page + route khác)**: `layout:drift-check` OK, `layout:typography-check` OK (0 vi phạm). Chỉ 1 `loading.tsx`/`error.tsx`/`not-found.tsx` ở gốc app, không per-route. Responsive (file .tsx có `sm:|md:|lg:`): VST 3/15, GSC 8/21, Đào tạo 9/18, NKBV 26/54, CSSD-erp 26/64, QLCV 17/30. `aria-/role=` thưa: VST 9, GSC 16, Đào tạo 9. 3 file còn dùng `confirm()/alert()`. Chưa làm: ảnh preview từng route, thử tay trên mobile (cần dev server + đăng nhập).

## Kết quả trục I (2026-11-06, phiên 3, chỉ đọc; phạm vi = auth/tài khoản + quét cổng quyền action, phần §6 chưa phủ)
Quét cơ học: 70+ file `'use server'`; file dùng `createAdminSupabaseClient` mà không gọi cổng `verify*/ensure*/assert*/require*` = 4: `staff-login.actions.ts` (trước đăng nhập, đúng), `account-access-request-public.actions.ts` (public có chủ đích), `danh-muc-hybrid.actions.ts` (có `canAccessQuanTriHub` — heuristic sót, ổn), `quan-tri-access.ts` (helper). => Không có action ghi/đọc service_role thiếu cổng. Trigger `trg_cssd_guard_cap_phat_khong_ghi_de` TỒN TẠI (20261021020000, 20261105140000) → đóng mục "chưa xác nhận" của báo cáo 11-05.
Finding (không có Nghiêm trọng/Cao):
1. **Trung bình** — `must_change_password` chỉ nằm ở `user_metadata` và chỉ ép ở client (`StaffSessionGate.tsx:34`, `login/page.tsx:37`, `doi-mat-khau/page.tsx:25`); không có kiểm ở `src/proxy.ts`/server. User tự gọi `supabase.auth.updateUser({data:{must_change_password:false}})` bằng anon key là bỏ qua việc đổi mật khẩu tạm do admin đặt (`tai-khoan-nhan-su.actions.ts:264,402`). Không leo quyền (vai trò lấy từ `v_sys_user_permissions`, không từ metadata). Sửa nhỏ nhất: chuyển cờ sang `app_metadata` (chỉ service_role ghi) hoặc cột `mdm_nhan_su` + kiểm ở `proxy.ts`.
2. **Thấp–Trung bình** — Cửa sổ thu quyền khi vô hiệu hóa nhân sự: có ban Auth (`nhan-su-auth-ban.ts:19`) nhưng JWT đang sống vẫn qua `proxy.ts` (verify local `getClaims`, dòng 145) đến hết TTL (mặc định Supabase 1h; TTL prod CHƯA kiểm) + `fetchUserPermissions` cache 5 phút (`server-permission.ts:21,37`) và `verifyPermissions` không xét `ns.is_active` của view. Cổng client (`StaffSessionGate`) không phải biên bảo mật. Tag `auth_check_${id}` (`staff-session.actions.ts:46`) không nơi nào `revalidateTag`.
3. **Thấp** — Form public xin cấp TK/đặt lại MK (`account-access-request-public.actions.ts:84`) chỉ throttle theo email/mã NV, không theo IP/toàn cục: đổi email liên tục sẽ làm đầy hàng đợi phiếu của admin (PO đã quyết không captcha, ACC-1). `findStaffForPublicRequest` dòng 113 dùng `ilike("email", email)` với `_`/`%` trong email thành wildcard (kết quả vẫn lọc `accountEmailsMatch` nên không rò dữ liệu; chỉ có thể trượt khớp).
4. **Thấp** — `staff-password.actions.ts:34` trả nguyên `error.message` của Supabase cho người chưa đăng nhập (lộ rate-limit/cấu hình); `staff-login.actions.ts:63` hiện hướng dẫn sửa Supabase Dashboard cho người dùng cuối. Đăng nhập không có khóa theo app — chỉ dựa rate-limit Supabase Auth (cấu hình prod CHƯA kiểm; `supabase/config.toml` không đặt `enable_signup`, mặc định bật ở local; cần xác nhận signup đã tắt trên prod — nếu mở thì ai cũng tạo được auth user, vào qua nhánh "không có hồ sơ → cho phép" của `checkStaffSessionAllowed`, dù không có quyền module nào).
Chưa phủ: bang-kiem import/write, master-data `gateway.ts`/`validation.ts`, `cssd-bo-bootstrap`/`cssd-workflow-resolve`, RLS các migration còn lại; `entity-qr-core.ts` chỉ là hàm thuần (không auth, không I/O) → không rủi ro. Việc cần PO/prod: xác nhận Auth signup tắt + JWT TTL + rate-limit (Supabase MCP đang chờ `/mcp` auth lại nếu cần đọc).

## Quyết định PO 2026-11-06 (sau báo cáo cải tổ)
- Thứ tự: VST+GSC+thống kê → CSSD → còn lại ưu tiên thấp. Giữ 2 nguồn công thức (thêm spec lệch). Giữ ty_le_ccs, giữ ngưỡng. Không xoá file chết khi chưa duyệt danh sách. Auth prod coi chưa an toàn tới khi xác nhận. Số QT theo thư mục soạn quy trình (Word). Quy trình thiếu: không làm. Adapter VST PoC, không đổi nền tảng.
- Chi tiết: BAO-CAO-CAI-TO-2026-11-06.md mục ⑦.
