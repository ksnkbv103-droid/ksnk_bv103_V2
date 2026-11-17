# KH_APPKSNK_20261117 — Lô prod pha 1 (chuẩn bị, CHƯA ÁP)

Trạng thái: PO ĐÃ DUYỆT KẾ HOẠCH (2026-11-17, lấy mặc định Q1–Q8) · CHỜ LỆNH RIÊNG «áp nhóm A lên prod» · chưa áp gì lên prod · chưa push · chưa deploy
Nguồn: yêu cầu PO 2026-11-17 «Chuẩn bị lô prod» · `CLAUDE.md` «Đang làm» (3) (áp thử cả chuỗi lên bản sao DB trước khi xin duyệt) · `docs/bo-tai-lieu/01-tong-quan-yeu-cau-lo-trinh.md` §6.3, §6.5, §6.6 (:95-142) · `SO_NO_APPKSNK.md:47` (lô gỡ mục tiêu viện) · PO 2026-11-17 K5 («sửa P3», không áp file `20261114180000`).
Nơi đo: worktree `integrate-2026-11`, nhánh `integrate/2026-11`, HEAD `4c8d7841` · prod = Supabase `cvzwslpxwgqiugzzhqej`, chỉ SELECT + `list_migrations` · bản sao = DB local `scratch_rehearsal` (Postgres cùng container `supabase_db_ksnk_bv103`, không đụng DB `postgres`).

## 0. Kết luận trước

1. **Lô gỡ mục tiêu viện không đi riêng được.** Prod đang thiếu **40 migration** (269 hàng lịch sử, hàng cuối version `20261112025026`; 0/41 tên trong lô có mặt). Lát gỡ mục tiêu viện chỉ có 2 file trong 40 (`20261116100000`, `20261116110000`); 38 file còn lại chưa lên prod và nằm cùng chuỗi.
2. **Chia 2 nhóm**: **A = 37 file, áp TRƯỚC deploy** · **B = 3 file, áp SAU khi deploy READY** (AR-8h + 2 file gỡ mục tiêu viện; kèm 2 việc đổi tên lịch sử + `sync:check`). File thứ 41 (`20261114180000_nkbv_fact_select_rls_hoi_dong_identity.sql`) **không áp** (K5).
3. **Đã chạy thử toàn chuỗi trên bản sao**: nền = 269 migration của prod → A 37/37 OK → B 3/3 OK. Schema cuối **bằng local HEAD** (tên đối tượng, md5 thân hàm, `prosecdef`, `proconfig`, định nghĩa policy, cột) trừ 3 nhóm lệch đã giải thích ở §8.
4. **Còn một việc dữ liệu riêng**: sửa câu trích QĐ 3651 (TC09) trên prod — lệnh riêng của PO (§5).
5. **Đường deploy chưa thông**: `origin/main...HEAD` = 4 commit chỉ có ở `main`, 478 commit chỉ có ở nhánh (lệch nhánh); thử gộp khô có 2 xung đột (`CLAUDE.md`, `package.json`). PO chọn đường (§7 Q1).
6. **Chưa có gì chạm prod trong lượt này.** Mọi lệnh prod đã dùng là SELECT / `list_migrations`.
7. **Điều không kiểm được** (§8): không có tài khoản + browser pane để chạy 3 kịch bản VST/GSC; lịch sử migration của bản sao là bảng giả; ACL chỉ kiểm được trên prod sau khi áp.

## 1. Yêu cầu → tiêu chí đo

| Mã | Yêu cầu | Tiêu chí đo | Kết quả lượt này |
|---|---|---|---|
| R1 | Chuỗi migration đã thử trên bản sao DB trước khi xin duyệt (`CLAUDE.md` Đang làm 3) | Mỗi file `OK` trong `res_phase0/res_batch_a/res_batch_b.log`; schema cuối so với local HEAD | 269/269 · 37/37 · 3/3 OK; so schema xong (§8) |
| R2 | Mã build được với DB sau lô | `npm run build` exit 0 | exit 0 (`build.log`) |
| R3 | Runbook có nhóm «áp trước» và «áp cùng deploy», mỗi file có kiểm trước/sau/hoàn tác | §3, §4 | Có; file nào tác giả không ghi khối kiểm thì ghi «chưa có số đo» |
| R4 | Không áp prod / push / deploy | `git status`, `list_migrations` prod vẫn 269 hàng | Đạt (đo lại cuối lượt, §9) |
| R5 | Chữ cũ không còn trong repo | `git grep -il` bằng `chr(107)\|\|chr(112)\|\|chr(105)` hay chuỗi nối lúc chạy = chỉ `package-lock.json`, `public/brand/Logo 103.png`, tên file DROP | Đạt trước lượt này; plan này không chứa chữ cũ (dùng «chữ cũ») |

## 2. Hiện trạng prod (đo 2026-11-17, SELECT)

- `schema_migrations`: 269 hàng, version cuối `20261112025026`. Version trên prod do máy gán, **khác version file local → so theo TÊN**.
- 0/41 tên migration của lô có mặt; 2 hàng lịch sử tên cũ của lát gỡ mục tiêu viện **còn** (version `20260531200000`, `20260729121000`).
- Bảng mục tiêu cũ: 0 dòng (điều kiện DROP đạt). Đối tượng của file K5 (6 policy `nkbv_fact_*_select_hoi_dong_deny`, hàm `fn_nkbv_actor_identity_denied()`): 0/0 → **phải còn 0/0 sau lô**.
- Vai trò: ADMIN 1, KHACH 1, NHAN_VIEN 19; 0 người HOI_DONG/MANG_LUOI/CHU_NHIEM_KHOA (các migration RLS cụm HỘI ĐỒNG không đổi quyền ai ngay).
- 3 RPC thống kê (`rpc_dashboard_gsc_strategic_analytics_impl`, `rpc_dashboard_vst_strategic_analytics_impl`, `rpc_gsc_checklist_detail_impl`): thân prod = thân local sau khi chỉ thay khóa JSON cũ → `chi_so` (md5 gsc `f5128689…`, vst `fda00467…`, chk `7176bb02…`) → **không lệch**, ghi đè bằng `CREATE OR REPLACE` không mất bản sửa riêng nào của prod.

## 3. Nhóm A — áp TRƯỚC deploy (37 file, đúng thứ tự dưới đây)

Cách áp: MCP `apply_migration` từng file, tên = tên file bỏ version và `.sql`. **Ba file RLS (`20261114150000`, `160000`, `170000`) không có `BEGIN/COMMIT` → chỉ áp qua MCP, không qua psql autocommit.** Sau mỗi file: `SELECT count(*), max(version) FROM supabase_migrations.schema_migrations` (+1 so với trước); dừng ở file lỗi đầu tiên (§6). Sau mỗi cụm: `list_migrations`.
«Kiểm sau» chung cho mọi file: có đúng 1 hàng `name = <tên>`. Cột «Kiểm sau» dưới đây chỉ ghi phần **thêm**.

| # | File (bỏ `.sql`) | Kiểm trước (prod) | Kiểm sau (thêm) | Hoàn tác |
|---|---|---|---|---|
| 1 | `20261021040000_cssd_kd4_transfer_lock_by_id` | tác giả không ghi khối kiểm · chưa có số đo prod | 3 hàm `fn_cssd_kho_lock`, `fn_cssd_transfer_bom_metadata_by_id`, `fn_cssd_apply_instrument_ledger_tx` có `prosecdef` đúng như local | file không ghi; chạy lại bản cũ của từng hàm từ migration trước |
| **Cụm bộ tổng — áp liền một mạch 2→7 (không chen file khác)** | | | | |
| 2 | `20261111100000_cssd_bo_tong_thanh_phan_hieu_luc` | `…hieu_luc.sql:544-555` → 0·0·0·0 | view `v_cssd_bo_thanh_phan_hieu_luc` + trigger `trg_cssd_kho_gd_quy_ve_bo_tong` có | file không ghi; `DROP TRIGGER` + chạy lại `fn_cssd_kho_lock` bản #1 |
| 3 | `20261111110000_cssd_bo_tong_hardening` | `…hardening.sql:623-642` → ho_trung_loai 0 · dong_tren_bo_con 0 · **tong_tron_chua_con 14** · da_co_trigger 0 | trigger `trg_cssd_bom_chi_tiet_guard_ho` có | file không ghi |
| 4 | `20261111120000_cssd_bo_tong_readers` | `…readers.sql:746-755` (khối có; số prod chưa ghi) | view `v_cssd_bo_dung_cu_summary`, `v_cssd_bo_thanh_phan_hieu_luc_realtime` có | file không ghi |
| 5 | `20261111125000_cssd_bo_tong_tien_s2` | `…tien_s2.sql:103-129` → 0·0·0 | bảng `cssd_bak_s2_bo_tong` có (backup S2) | khôi phục từ bảng backup: `…tien_s2.sql:131` |
| 6 | `20261111130000_cssd_bo_tong_chuyen_du_lieu` | `…chuyen_du_lieu.sql:302-326` → 0·0·0·0·0 | S2 chuyển 0 dòng (prod không có dòng cần chuyển) | từ `cssd_bak_s2_bo_tong` (#5) |
| 7 | `20261111140000_cssd_bo_tong_hardening_2` | `…hardening_2.sql:308-311` (khối có; số prod chưa ghi) | `fn_cssd_dong_bo_tach_nhiet_core` md5 = local | file không ghi |
| 8 | `20261111150000_ar1_chu_nhiem_khoa_role_catalog_approve` | tác giả không ghi khối kiểm | vai trò `CHU_NHIEM_KHOA` có (không gán cho ai); 3 quyền `approve` trên `LOAI_DC`, `BO_DC`, `DC_LE` | `…ar1….sql:37` (chỉ khi chưa gán cho ai) |
| 9 | `20261111150100_ar5d_hoa_chat_thiet_bi_approve` | không có khối kiểm | quyền `approve` của hóa chất/thiết bị có | `…ar5d….sql:24` |
| 10 | `20261111150200_ar5d_hoa_chat_thiet_bi_approve_trigger` | không có khối kiểm | 2 trigger `trg_cssd_dm_hoa_chat_approve_guard`, `trg_cssd_dm_thiet_bi_approve_guard` | `…trigger.sql:5,51` |
| 11 | `20261111150300_ar7_mdm_registry_drop_orphan_rows` | `…ar7….sql:1-13` → prod 105 dòng registry / 310 dòng suggestion = local | 0 dòng registry mồ côi (`to_regclass(...) IS NULL`) | **không đảo được từ file** → chụp 2 SELECT các dòng sẽ xóa vào nhật ký §9 trước khi áp |
| 12 | `20261111160000_cssd_nhat_ky_ghi_actor` | không có khối kiểm | `rpc_cssd_nhat_ky_ghi` còn **đúng 1 chữ ký 6 tham số** (đã DROP bản 5) | `…ghi_actor.sql:4` (DROP 6 → CREATE lại 5 tham số từ `20261030010000`) |
| 13 | `20261111170000_nkbv_fact_select_rls_khoa_scope` | không có khối kiểm | `fn_nkbv_actor_khoa_restricted`, `fn_nkbv_actor_khoa_ma_benh_an_set` có | `…khoa_scope.sql:118` |
| 14 | `20261111180000_vst006_gstt_admin_policy_fn_is_admin` | `…vst006….sql:42-53` → admin_mat_quyen 0 | 3 policy «Admin full access» (vst_sessions, chung_sessions, vst) viết lại | `…vst006….sql:28` |
| 15 | `20261111190000_qlcv002_spawn_dinh_ky_canh_bao_thieu_phu_trach` | không có khối kiểm | `fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay` md5 = local | `…qlcv002….sql:120` |
| 16 | `20261111200000_qlcv003_nghiem_thu_khong_tu_nghiem_thu` | không có khối kiểm | `fn_qlcv_transition` md5 = local | `…qlcv003….sql:185` |
| 17 | `20261112090000_nkbv011_tham_dinh_chan_thieu_nhan_su` | `…nkbv011….sql:94-104` → da_apply false · ACL ok · 0 dấu vết duyệt mất | `proacl` của `rpc_nkbv_tham_dinh_ca` giữ nguyên | `…nkbv011….sql:105` |
| 18 | `20261112100000_nkbv008_thay_phien_phan_tich_nguyen_tu` | `…nkbv008….sql:81-90` → 0 cặp mất | `proacl` của `rpc_nkbv_replace_ba_phan_tich_sessions` chỉ còn `service_role` | `…nkbv008….sql:91` |
| 19 | `20261112110000_qlcv005_drop_rpc_nhiem_vu_rollup` | không có khối kiểm; `git grep` ở `src` và `scripts` = 0 nơi gọi (chỉ `scripts/readiness/so-loi.json:404-410` nhắc; PO 2026-11-12 duyệt xóa) | hàm `rpc_qlcv_nhiem_vu_rollup(uuid[])` không còn | `…qlcv005….sql:3` (chạy lại khối CREATE + GRANT ở `20260909030202_…`) |
| 20 | `20261112120000_dt006_lan_thi_trang_thai_huy` | không có khối kiểm | cột `huy_*` + ràng buộc `dao_tao_lan_thi_trang_thai_check`, `…huy_dau_vet_check` có (**mã mới cần cột này**, Rule 01 §6.3 :100) | `…dt006….sql:12` |
| 21 | `20261112130000_cssd006_tra_lui_atomic` | `…cssd006….sql:156-164` → hàm chưa có | `has_function_privilege`: anon false · authenticated false · service_role true | `…cssd006….sql:18` (DROP FUNCTION) |
| 22 | `20261112140000_qlcv007_phe_duyet_dexuat_atomic` | không có khối kiểm | hàm `fn_qlcv_transition` còn 1 chữ ký (md5 cuối chuỗi kiểm ở #29) | `…qlcv007….sql:16` (chạy lại bản của #16) |
| 23 | `20261112150000_dt005_tao_luot_thi_atomic` | không có khối kiểm | hàm `rpc_dao_tao_tao_luot_thi_that` có; ACL như local | `…dt005….sql:15` (DROP FUNCTION) |
| 24 | `20261112160000_cssd003_013_thu_execute_authenticated` | không có khối kiểm | `authenticated` mất EXECUTE trên các hàm nêu trong file; `service_role` giữ | `…003_013….sql:12` (GRANT lại từng hàm) |
| 25 | `20261112170000_qt010_mdm_nhan_su_chan_sua_ho_so_admin` | không có khối kiểm | 2 policy `mdm_nhan_su_update_chan_ho_so_admin`, `…delete_chan_ho_so_admin`; hàm `fn_sys_tai_khoan_mang_vai_admin` | `…qt010….sql:23` |
| 26 | `20261112180000_dt009_010_thu_grant_bang_dao_tao` | không có khối kiểm (file ghi «chưa apply prod, chỉ áp local») | `anon` mất SELECT/REFERENCES/TRIGGER trên `dao_tao_cau_hinh`, `dao_tao_lan_thi`; `authenticated` mất quyền ghi trên `dao_tao_cau_hinh` (SELECT giữ) | `…dt009_010….sql:19` |
| 27 | `20261112190000_nkbv017_thu_grant_ghi_su_kien` | không có khối kiểm (chỉ áp local) | `authenticated` mất INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER, `anon` mất mọi quyền trên `nkbv_fact_su_kien`; SELECT của `authenticated` giữ | `…nkbv017….sql:17` |
| 28 | `20261112200000_cssd020_nkbv020_thu_grant_bao_tri_va_rates` | không có khối kiểm (chỉ áp local) | bảng `cssd_fact_bao_tri`: `anon` mất mọi quyền, `authenticated` mất quyền ghi (SELECT giữ); `fn_nkbv_dich_te_hoc_rates(date, date, uuid)`: `PUBLIC`/`anon` mất EXECUTE, `authenticated` + `service_role` giữ | `…cssd020….sql:14,21` |
| 29 | `20261113100000_qlcv010_khong_tu_phe_duyet_dexuat` | không có khối kiểm | `fn_qlcv_transition` md5 = local HEAD (bản cuối chuỗi qlcv) | `…qlcv010….sql:7` (chạy lại bản #22) |
| 30 | `20261114100000_ksnk_dm_tham_so` | không có khối kiểm | bảng `ksnk_dm_tham_so` + 2 policy (`ksnk_dm_tham_so_select`, `ksnk_dm_tham_so_insert_admin`); 8 hàng seed: `giam_sat.xanh_min_pct`, `giam_sat.vang_min_pct`, `giam_sat.khoa_canh_bao_pct`, `vst.khoa_vang_pct`, `vst.khoa_do_pct`, `vst.so_sanh_mau_toi_thieu`, `doi_soat.vst_mau_toi_thieu`, `doi_soat.gsc_mau_toi_thieu` | file không ghi dòng hoàn tác → `DROP TABLE public.ksnk_dm_tham_so` (bảng mới, trước lô chưa có trên prod) |
| 31 | `20261114110000_vst_yeu_cau_dieu_chinh` | không có khối kiểm | bảng `gstt_fact_vst_yeu_cau_dieu_chinh` + 2 index + quyền trong `sys_permissions` | `…yeu_cau_dieu_chinh.sql:9` (DROP TABLE) |
| 32 | `20261114120000_cssd_me_chuyen_tiep_trang_thai` (sau #2…#7) | `…chuyen_tiep.sql:106-116` → 2 mẻ `DANG_CHUAN_NAP` | bảng `cssd_dm_me_chuyen_tiep`; trigger `trg_cssd_me_chuyen_tiep` | `…chuyen_tiep.sql:116` (DROP TRIGGER…) |
| 33 | `20261114130000_cssd_me_thu_hoi_kiem_trang_thai` (**sau #32**) | `…thu_hoi.sql:576-584` → ban_truoc_l4b true · da_co_l4b false | `rpc_cssd_me_thu_hoi` md5 = local | chạy lại bản trước của hàm (file không ghi) |
| 34 | `20261114140000_cssd_doi_ten_6_bo_vi_phau` | không có khối kiểm | 6 `ma_bo` (`B01.SET.09`, `-CN`, `-KCN`, `B01.SET.20`, `B04.SET.09`, `B04.SET.10`) mang tên mới; chạy lại không đổi gì | không đảo được từ file; chụp `ten_bo` cũ của 6 mã vào §9 trước khi áp |
| **Cụm RLS HỘI ĐỒNG — #35→#37 đúng thứ tự, không chen file khác, chỉ qua MCP** | | | | |
| 35 | `20261114150000_gstt_vst_rls_cnk_hoi_dong` | `…:128-137` → 3 hàm helper có; 0 người HOI_DONG | policy `vst_sessions_select_permission`, `vst_obs_select_permission` viết lại | `…:28` (tạo lại policy bản `20261108100000`) |
| 36 | `20261114160000_gstt_vst_rls_cnk_toan_vien` | `…:153-164` | như trên, bản «toàn viện» | `…:39` |
| 37 | `20261114170000_gstt_gsc_rls_hoi_dong` (GSC, **cuối cụm**) | `…:92-109` | policy `gsc_sessions_select_permission` | `…:45` |

Ghi chú thứ tự: (a) `20261113100000` sau `20261112140000`; (b) `20261112130000` cần `20261111160000` trước **và mã deploy chỉ sau khi cả nhóm A xong**; (c) `20261114130000` sau `20261114120000`; (d) dùng thứ tự version ở trên, **không** dùng thứ tự dòng 26 của `HANDOFF` bản `ae5ca6fd`; (e) tuyệt đối không nhầm `20261111180000` (#14, thuộc A) với `20261114180000` (K5, KHÔNG áp).

**Hậu kiểm cuối nhóm A (đo trên prod, SELECT):**
1. `list_migrations`: 269 + 37 = **306** hàng; 37 tên mới đủ; không tên K5.
2. Kiểm ngược K5: 0 policy `nkbv_fact_*_select_hoi_dong_deny`, 0 hàm `fn_nkbv_actor_identity_denied`.
3. ACL (bản sao không so được): `proacl`/`has_function_privilege` cho `rpc_cssd_tra_lui_mot_buoc` (#21), `rpc_nkbv_replace_ba_phan_tich_sessions` (#18), `rpc_nkbv_tham_dinh_ca` (#17), `rpc_dao_tao_tao_luot_thi_that` (#23) và các hàm trong #24, #28.
4. **Cửa sổ rủi ro giữa nhóm A và deploy** (không kiểm được trên bản sao, ghi để PO biết): #12 đổi `rpc_cssd_nhat_ky_ghi` 5 → 6 tham số — mã cũ trên prod gọi bản 5 tham số sẽ lỗi ở việc ghi nhật ký CSSD cho đến khi deploy; #33 đổi `rpc_cssd_me_thu_hoi` cũng vậy. **Rút ngắn cửa sổ: áp nhóm A xong thì deploy ngay**. Mã mới cần: DT-006 (cột `huy_*`), `rpc_cssd_tra_lui_mot_buoc` (`src/modules/cssd-erp/workflow/application/cssd-workflow-application.ts:269`), `rpc_dao_tao_tao_luot_thi_that` (`src/modules/dao-tao/actions/dao-tao-attempt.actions.ts:397`).

## 4. Nhóm B — áp cùng deploy (SAU khi deploy READY)

Thứ tự bắt buộc (mã mới đọc `chi_so`, mã cũ đọc khóa cũ → áp B1…B3 trước deploy làm dashboard VST/GSC hiện rỗng; chiều ngược lại hẹp hơn nhưng vẫn có):

| # | Việc | Kiểm trước | Kiểm sau | Hoàn tác |
|---|---|---|---|---|
| B1 | `20261111150400_ar8h_drop_danh_muc_permission_keys` (tác giả: `…ar8h….sql:93-112`) | chụp `SELECT` vào §9 trước khi áp: 15 quyền / 20 gán trỏ khóa cũ; 17 định nghĩa policy tham chiếu khóa cũ. Áp **sau** deploy vì mã đang chạy trên prod (cũ) có thể còn kiểm khóa `DANH_MUC*` (suy ra từ `src/lib/master-data/danh-muc-lookup-permission.ts:3`: mã mới đã bỏ fallback; chưa chạy mã cũ để kiểm) | policy `Authenticated users can read dm_khoa_phong` **còn** (policy ngoài migration trên prod, §7 Q5); 0 quyền khóa cũ | **file không có dòng hoàn tác** (có `BEGIN/COMMIT` và `RAISE EXCEPTION` tự chặn ở `…ar8h….sql:104-110`); khôi phục = nạp lại từ ảnh chụp `SELECT` ở §9 → cần PO đọc trước (§7 Q4) |
| B2 | `20261116110000_rpc_chi_so_payload_key` | thân 3 RPC prod = local sau thay khóa (§2) | 3 hàm md5 = local; khóa `chi_so` có, khóa cũ không | chạy lại bản cũ của 3 hàm (lệnh chỉ thay lại tên khóa) |
| B3 | `20261116100000_drop_bang_muc_tieu_cu` | **SELECT đếm dòng phải = 0**; 0 → mới DROP (đã đo 0, đo lại ngay trước khi áp) | bảng không còn | `20261116100000…sql:4-7` (tạo lại bảng rỗng; dữ liệu không có để khôi phục) |
| B4 | Đổi tên 2 hàng lịch sử **theo TÊN cũ** (không theo version): `qlcv_drop_monthly_pilot`, `bang_muc_tieu_cu_da_go` là tên mới; version prod `20260531200000`, `20260729121000` | 2 hàng tên cũ có, 0 hàng tên mới | 2 hàng tên mới có, 0 hàng tên cũ | `UPDATE` ngược |
| B5 | `npm run sync:check` (linked) | — | khớp, **trừ đúng 1 file thiếu** `20261114180000` (K5, file còn trong repo tới «lát 2») | — |

Lưu ý B4/B5: MCP `supabase` chưa ủy quyền trong phiên này nên `sync:check` (linked) **chưa chạy được** — PO ủy quyền hoặc chạy tay; thiếu thì thay bằng `list_migrations` so tay theo tên.

## 5. Lệnh riêng của PO — sửa câu trích QĐ 3651 (TC09)

Điều kiện: lệnh riêng bằng lời của PO. Đã đo: bảng `gstt_dm_bang_kiem` 90 dòng, **đúng 1 dòng** chứa chữ cũ (id `9d3c00f2-eb9c-4edb-8ee7-bb0cfb0f6f9d`), 1 lần xuất hiện; cột `tieu_chi_jsonb` kiểu `jsonb`; ngữ cảnh: «…cải tiến chất lượng, <chữ cũ> 6 rõ (QĐ 3651) và bình xét thi đua…».

```sql
-- Kiểm trước: phải ra 1
SELECT count(*) FROM gstt_dm_bang_kiem
WHERE id = '9d3c00f2-eb9c-4edb-8ee7-bb0cfb0f6f9d'
  AND position(upper(chr(107)||chr(112)||chr(105))||' 6 rõ (QĐ 3651)' IN tieu_chi_jsonb::text) > 0;

UPDATE gstt_dm_bang_kiem
SET tieu_chi_jsonb = replace(tieu_chi_jsonb::text,
      upper(chr(107)||chr(112)||chr(105))||' 6 rõ (QĐ 3651)',
      '6 rõ (QĐ 3651)')::jsonb
WHERE id = '9d3c00f2-eb9c-4edb-8ee7-bb0cfb0f6f9d';

-- Kiểm sau: phải ra 0 (cả bảng)
SELECT count(*) FROM gstt_dm_bang_kiem
WHERE lower(row_to_json(gstt_dm_bang_kiem)::text) LIKE '%'||chr(107)||chr(112)||chr(105)||'%';
```

Hoàn tác: `replace` ngược cùng `WHERE id`. View `gstt_dm_tieu_chi_bang_kiem` đọc từ cột này nên không cần sửa riêng.

## 6. Điều kiện dừng

- **Một migration lỗi → dừng toàn lô** (Rule 01 §6.3 :100), báo nguyên văn lỗi, không áp file kế, không «sửa nóng» file đã duyệt.
- Kiểm trước của file nào ra số **khác** số ghi ở §3 (vd #3 `tong_tron_chua_con` ≠ 14, #5 ≠ 0·0·0, #11 đếm ≠ 105/310) → dừng, hỏi PO trước khi áp file đó.
- B3 chỉ DROP khi SELECT đếm = 0 ngay trước khi áp.
- Hậu kiểm nhóm A có mục nào ra khác → không deploy.
- Deploy READY mà dashboard VST/GSC hiện rỗng → chưa áp B2 hoặc cache khóa `"v2"` (`src/lib/analytics/strategic-analytics-cache.ts:55,116`) còn dữ liệu cũ → kiểm B2 trước, rồi mới nghi cache.

## 7. Quyết định cần PO (mặc định nếu PO không trả lời)

| # | Câu hỏi | Mặc định đề xuất |
|---|---|---|
| Q1 | Đường deploy: nhánh `integrate/2026-11` lệch `origin/main` (4 commit chỉ có ở `main`, 478 commit chỉ có ở nhánh), gộp khô có 2 xung đột (`CLAUDE.md`, `package.json`) | Không tự gộp/push; PO gõ «push» rồi chọn đường (PR vào `main` hoặc deploy thẳng từ nhánh); giải xung đột ở lát riêng |
| Q2 | Áp nhóm A khi nào, và ngay sau đó deploy luôn để rút cửa sổ §3.4? | Cùng một khung giờ ít dùng; A → deploy → B → TC09 |
| Q3 | 14 bộ tổng «trộn chịu nhiệt, chưa có bộ con» (#3) không tự tách khi bật lại (đã đo prod) — chấp nhận, tách tay sau? | Chấp nhận, ghi sổ nợ |
| Q4 | B1 (AR-8h) xóa 15 quyền / 20 gán khóa cũ: PO đã duyệt nội dung trong `…ar8h….sql`? | PO đọc 1 lần trước khi áp |
| Q5 | Prod đọc `mdm_dm_khoa_phong` dựa vào policy ngoài migration `Authenticated users can read dm_khoa_phong`; sau B1 phải còn. Đưa policy này vào một migration? | Không trong lô này; ghi `SO_NO` |
| Q6 | NEN-003: file idempotent — PO chốt áp hay hoãn? | Hoãn tới khi PO chốt |
| Q7 | `dao_tao_cau_hoi` thiếu 7 cột + 3 index trên prod (mã đọc ở `src/modules/dao-tao/actions/dao-tao-bank.actions.ts:124`, `dao-tao-attempt.actions.ts:118`; local có do chỉnh tay, **không có migration**) | **Không thuộc lô này**; PO quyết viết migration riêng hay bỏ tính năng |
| Q8 | 6 bảng `zz_sao_luu_20261112_*` còn trên prod | Giữ, xóa ở lô sau khi PO nghiệm thu |

## 8. Kết quả chạy thử và giới hạn

- Bản sao: DB `scratch_rehearsal` trong container local, dựng từ chính chuỗi 269 migration của prod (theo tên) → áp A (37) → áp B (3). Script `rehearse.sh`, log `res_phase0.log`, `res_batch_a.log`, `res_batch_b.log` (3 OK + «XONG 06:18:50»), dump so sánh `n2_*`, `f2_*`, `p2_*`, `c2_*` nằm ở thư mục scratchpad của phiên (**ngoài repo**; mất khi dọn máy → chạy lại được bằng 4 file `*_all.sql`, không giữ vĩnh viễn).
- **Schema cuối = local HEAD**, trừ: (1) bộ `gstt_fact_ke_hoach_giam_sat` + `fn_gstt_ke_hoach_tien_do` của nhánh khác; (2) 7 cột + 3 index `dao_tao_cau_hoi` (local lệch, không migration — Q7); (3) hàm + 6 policy của file K5 (cố ý không áp).
- **Giới hạn trung thực**:
  - Bảng `supabase_migrations.schema_migrations` của bản sao là bảng giả (`fake_sm.sql`) — chỉ kiểm thứ tự/đếm.
  - ACL không so được trong bản sao → hậu kiểm ACL chạy **trên prod** (§3).
  - Bản sao không có dữ liệu prod → kiểm trước chạy trên prod (SELECT), không thử được DML với dữ liệu thật; S2 chuyển 0 dòng.
  - 12 thân hàm trên prod mất comment (md5 chuẩn hóa khớp); prod có đối tượng riêng (6 bảng `zz_sao_luu_20261112_*`, policy ngoài migration ở Q5) và thiếu 2 index nền (vô hại).
  - Chưa chạy 3 kịch bản tay VST/GSC sau lô trong browser pane (không có tài khoản); chưa kiểm hành vi mã **cũ** với RLS/hàm mới (cửa sổ §3.4).
  - Rủi ro khóa bảng: không đáng kể (S2 chuyển 0 dòng trên prod).
- Dùng `create_branch` (Supabase, tính phí) làm bản sao thật là lựa chọn nếu PO muốn bản sao có ACL + dữ liệu: **cần PO duyệt chi phí**, chưa làm.

## 9. Nhật ký thực thi (để trống; ghi khi PO ra lệnh)

| Thời điểm | Việc | Kết quả (nguyên văn) |
|---|---|---|
| — | chưa áp gì; `list_migrations` prod = 269 hàng, version cuối `20261112025026` (đo 2026-11-17) | — |
| 2026-11-17 | PO duyệt kế hoạch, nguyên văn «Duyệt kế hoạch»; áp mặc định Q1–Q8 (Q4: PO vẫn đọc `…ar8h….sql` một lần trước B1; Q6 hoãn) | Chưa có lệnh áp prod, chưa «push», chưa «deploy»: không việc nào chạy |
| 2026-11-17 | PO gõ nguyên văn «áp nhóm A lên prod đi» trong phiên này. Đo lại trước khi áp: project `cvzwslpxwgqiugzzhqej` = `ksnk-bv103-prod` ACTIVE_HEALTHY; `list_migrations` + `SELECT count(*), max(version)` | n=269, max_version=`20261112025026`, 0/7 tên mẫu của lô có mặt → khớp kỳ vọng. `git diff 4c8d7841..HEAD -- supabase/migrations` rỗng. Cách kiểm từng file: `md5(statements[1])` trên prod = md5 của file local đã cắt khoảng trắng cuối (bảng md5 ở scratchpad phiên) |
| 2026-11-17 01:07:05 UTC | #1 `cssd_kd4_transfer_lock_by_id` (không có khối kiểm trước) | `{"success":true}`; n=270, version prod `20261117010705`; md5 statements `1dbb99aa2084574259d27202d9b43d9e` = local, 13833 ký tự = local |
| 2026-11-17 01:13:29 UTC | #2 `cssd_bo_tong_thanh_phan_hieu_luc` (đầu cụm bộ tổng #2→#7) | Kiểm trước (`…hieu_luc.sql:544-555`): `nhieu_tang`=0, `so_kho_tren_bo_con`=0, `ho_trung_loai`=0, `da_co_ham`=0 → khớp 0·0·0·0. `{"success":true}`; n=271, version prod `20261117011329`; md5 statements `e663f9142d6c8b07808d605dd7d482f5` = local, 24468 ký tự = local |
| 2026-11-17 01:17:38 UTC | #3 `cssd_bo_tong_hardening` (cụm bộ tổng #2→#7) | Kiểm trước (`…hardening.sql:623-642`): `ho_trung_loai`=0, `dong_tren_bo_con`=0, `tong_tron_chua_con`=14, `da_co_trigger`=0 → khớp 0·0·14·0. `{"success":true}`; n=272, version prod `20261117011738`; md5 statements `7cba66b9fefe4ec20d8b1bbb596fbb89` = local, 28983 ký tự = local |
| 2026-11-17 01:20 UTC | #4 `cssd_bo_tong_readers` (cụm bộ tổng #2→#7) | Kiểm trước (`…readers.sql:746-755`; §3 không ghi số): `co_view_hieu_luc`=1, `bo_con_eo`=0, `me_chan_bo_con`=0; chỉ có `v_cssd_bo_dung_cu_summary`, view realtime vắng → đúng điều file kỳ vọng. `{"success":true}`; n=273, version prod `20261117012027`; md5 statements `2519883ea87b34d0877888dad2a9a32c` = local, 33806 ký tự = local |
| 2026-11-17 01:29 UTC | #5 `cssd_bo_tong_tien_s2` (cụm bộ tổng #2→#7) | Kiểm trước (`…tien_s2.sql:103-129`): `dong_eo_trung_loai_ho`=0, `dong_active_tren_con_da_tat`=0, `nhom_trung_co_con_da_tat`=0; `max_locks_per_transaction`=64, `max_connections`=60 → khớp 0·0·0. `{"success":true}`; n=274, version prod `20261117012915`; md5 statements `ad37c17f83be75faaf5e5a73570a4720` = local, 11174 ký tự = local. File tạo bảng sao lưu `cssd_bak_s2_bo_tong` (RLS bật, không policy, REVOKE anon/authenticated) |
| 2026-11-17 01:32 UTC | #6 `cssd_bo_tong_chuyen_du_lieu` (S2, cụm bộ tổng #2→#7) | Kiểm trước (`…chuyen_du_lieu.sql:302-326`): cả 6 cột = 0 (§3 ghi «0·0·0·0·0» là 5 số; câu SELECT của file có 6 cột, cột thừa cũng = 0, không lệch thực chất) → S2 chuyển 0 dòng. `{"success":true}` (các kiểm bất biến (a)–(e) trong file không RAISE); n=275, version prod `20261117013231`; md5 statements `9e6328c86e56ada0b06d99920150c453` = local, 19540 ký tự = local |
| 2026-11-17 01:36 UTC | #7 `cssd_bo_tong_hardening_2` (cuối cụm bộ tổng #2→#7) | File không có kiểm trước (khối ở `:308-311` là kiểm sau). `{"success":true}`; n=276, version prod `20261117013621`; md5 statements `b2a886cc390d17a26e6813921c9261c4` = local, 15052 ký tự = local. Kiểm sau: `core_moi`=true (`fn_cssd_dong_bo_tach_nhiet_core` có `quy_trinh_tro_ve_tong`), `guard_moi`=true (`fn_cssd_bom_chi_tiet_guard_ho` có nhánh `KHONG_CHIU_NHIET_EO`). `list_migrations` sau #7 = 276 hàng, 6 tên cụm #2→#7 liền nhau đúng thứ tự, không K5 |

## Tự kiểm

**Bảng tiêu chí** (mỗi yêu cầu có bước + cách đo):

| Yêu cầu | Bước | Đo bằng |
|---|---|---|
| R1 thử bản sao | §8 | 3 file log OK; so schema |
| R2 build | §0.7 / bảng §1 | `npm run build` exit 0 |
| R3 hai nhóm có chứng cứ | §3, §4 | bảng + `file:dòng` |
| R4 không chạm prod | §0.6, §9 | `list_migrations` = 269 |
| R5 sạch chữ cũ | §5 dùng `chr()` | `git grep` |

**Lệch so với quy tắc hiện có** (mỗi lệch kèm `file:dòng`):

1. `docs/bo-tai-lieu/01-tong-quan-yeu-cau-lo-trinh.md:139` (§6.6 mục 2) bảo áp từng file rồi `list_migrations` sau **mỗi** file; plan này đề xuất đếm nhanh bằng `execute_sql` sau mỗi file và `list_migrations` sau mỗi cụm → **PO có thể bác**, khi đó thêm 37 lần `list_migrations`.
2. `SO_NO_APPKSNK.md:47` ghi lô gỡ mục tiêu viện là một lô riêng (kiểm 0 dòng → DROP → đổi khóa JSON → đổi tên 2 hàng → `sync:check` → TC09 → deploy); đo cho thấy lát gỡ mục tiêu viện chỉ có 2/40 file chờ (`20261116100000`, `20261116110000`) và đi chung chuỗi với 38 file khác → **bản ghi `SO_NO` đó cần câu bổ sung** (làm ở bước commit, ≤ 1 dòng).
3. `docs/bo-tai-lieu/01-tong-quan-yeu-cau-lo-trinh.md:100` (§6.3): «chưa áp hết migration thì không deploy mã» — plan này giữ đúng cho nhóm A; nhóm B (3 file) áp **sau** deploy vì mã mới đọc khóa `chi_so` → **ngoại lệ có chủ đích**, PO duyệt kèm plan.
4. `CLAUDE.md` «Đang làm» (3) yêu cầu áp thử **cả chuỗi** lên bản sao; bản sao dựng bằng bảng lịch sử giả và không có ACL/dữ liệu prod → đạt phần thứ tự/schema, **không đạt** phần ACL/dữ liệu (đã nêu §8).
5. `docs/bo-tai-lieu/01-…:95-142` coi mọi migration chờ là một lô; K5 làm 1 file nằm trong repo nhưng không áp → `sync:check` / `list_migrations` sẽ luôn thấy 1 file thiếu cho tới «lát 2» (đã ghi §4 B5).

**Chưa kiểm được** (để không coi là đã xác minh):

- Máy khách `executeRejectToPreviousStation` (CSSD trả lui) gọi `rpc_cssd_nhat_ky_ghi` bằng client nào, 5 hay 6 tham số — mới đọc `…cssd-workflow-application.ts:269`.
- `rpc_cssd_me_thu_hoi` và RLS NKBV/VST/GSC dưới **mã cũ** sau khi áp nhóm A.
- Số đo prod cho các file không có khối kiểm của tác giả (#1, #8–#10, #12, #13, #15, #16, #19, #20, #22–#31, #34): chỉ có kiểm sau.
- 3 kịch bản tay trong browser pane; `sync:check` linked (MCP `supabase` chưa ủy quyền).
- Câu `SELECT` TC09 chạy trên prod ở bước kiểm trước mới đếm được, chưa thử `UPDATE` thật.
