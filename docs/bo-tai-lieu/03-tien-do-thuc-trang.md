# 03 · Báo cáo: thực trạng, tiến độ, việc chờ PO

> **File báo cáo duy nhất của dự án** (gộp 2026-11-24 theo yêu cầu PO).
> - Ở đây có: tiến độ, handoff, sổ nợ, câu hỏi PO, báo cáo đánh giá.
> - Kế hoạch ở [01-tong-quan-yeu-cau-lo-trinh.md](01-tong-quan-yeu-cau-lo-trinh.md); nghiệp vụ ở [02-nghiep-vu-domain.md](02-nghiep-vu-domain.md).
> - Không tạo file báo cáo, handoff hay câu hỏi mới: sửa đúng mục của file này. Bản cũ khôi phục bằng lệnh ở §9.
>
> Đo lần cuối 2026-11-24 trên nhánh `integrate/2026-11` @ `2222a336`. Số prod là ảnh chụp, có ghi ngày.

## 0. Cách dùng

- **Mục lục:** 1 Kết luận · 2 Module · 3 Số đo · 4 Prod và local · 5 Đang làm, kế, mở phiên mới · 6 Câu hỏi PO · 7 Nợ · 8 Báo cáo đánh giá · 9 Nguồn đã gộp.
- **Cập nhật:** sửa tại chỗ và ghi ngày ở dòng đầu mục. Không thêm bản «v2». Khối sổ lỗi ở §3.1 do máy sinh (`so-loi.mjs report --ghi`), không sửa tay.
- **Trả lời câu hỏi PO:** gõ mã trong chat, ví dụ «C1: Có · A2: đồng ý». Đáp án ghi vào sổ lỗi (`so-loi.mjs`), rồi xóa câu khỏi §6.
- **Số lệch nhau:** số đo lại bằng lệnh ở §3.3 thắng.

## 1. Kết luận (2026-11-24)

- **Chạy thật chỉ có VST/GSC.**
  - Prod ngày 12/11: 3.637 phiên VST, 1.435 phiên GSC, 33.421 quan sát VST.
  - CSSD đang xây, đầu mối Nguyễn Thanh Bình.
  - NKBV, QLCV, Đào tạo chưa có đầu mối (§2).
- **Prod lệch mã.**
  - Prod chạy `e908e7e0` (PR #131, deploy 17/11).
  - `integrate/2026-11` đi trước prod 237 commit, trong đó 19 commit chưa push.
  - 4 migration `20261118100000`…`130000` đã lên prod ngày 19/11, nhưng code đi kèm chưa deploy (D1).
  - 12 migration `20261119*` chưa áp prod (§4).
- **Sổ lỗi:**
  - 0 việc mới, 0 việc chờ sửa, 10 việc chờ PO.
  - 22 lỗi giả trên 187 việc đã đóng.
  - 16 kịch bản tay chưa chạy.
- **Hướng đi:** PO chọn kế hoạch cải tổ 2026-11-24 ([01 §6](01-tong-quan-yeu-cau-lo-trinh.md)), có 3 điều kiện sửa trước khi chạy (§8.1). Bước đầu tiên chạm prod là deploy 237 commit. Bước này chỉ chạy khi PO gõ «deploy».

## 2. Thực trạng theo module

`npm run module:gate`, nguyên văn ngày 2026-11-24:

```
giam-sat  CHẠY_THỬ   đầu mối: Tổ giám sát KSNK · mở: 5 · được phép: chỉ sửa lỗi người dùng báo / lộ dữ liệu
cssd      XÂY        đầu mối: Nguyễn Thanh Bình · mở: 3 · được phép: chỉ lát đã duyệt ở roadmap §5; spec đóng băng
nkbv      KHÁM_PHÁ   đầu mối: CHƯA CÓ · mở: 5 · được phép: chỉ thu thập (phỏng vấn, kịch bản tay); không mở lát tính năng
qlcv      XÁC_NHẬN   đầu mối: CHƯA CÓ · mở: 5 · được phép: chỉ thu thập + chốt ngưỡng mục 5; không mở lát tính năng
dao-tao   KHÁM_PHÁ   đầu mối: CHƯA CÓ · mở: 6 · được phép: chỉ thu thập (phỏng vấn, kịch bản tay); không mở lát tính năng
```

| Module | Dữ liệu prod (ảnh chụp) | Đang chặn |
|---|---|---|
| VST + GSC | 3.637 phiên VST, 1.435 phiên GSC, 33.421 quan sát (12/11) | Ma trận «ai xem gì» theo khoa (GS-1). Vai lãnh đạo khoa lâm sàng (VST-028) chưa áp prod |
| CSSD | 10 chu trình thử (10/11). Prod có 164 bộ, 0 bộ con tách nhiệt (19/11) | Máy quét. Dữ liệu tách nhiệt chưa lên prod. Câu C1, C2 (§6) |
| NKBV | 1 sự kiện (10/11) | Đầu mối (N1, N3). HIS/LIS (L3) |
| QLCV | 0 việc (10/11) | Đầu mối (các câu QLCV ở 02 §6 đã trả lời 17/11) |
| Đào tạo | 1 lần thi (10/11). 787 câu hỏi (07/09) | Đầu mối (DT-2 đã chốt 24/10, `docs/core/handover-roadmap.md` dòng 102) |
| Nền (MDM, RBAC, quản trị) | Nhân sự 36, khoa phòng 66. Vai NHAN_VIEN_KSNK 19, ADMIN 1, KHACH_THONG_KE_GSTT 1, MANG_LUOI_KSNK 0 (12/11) | QT-015, QT-019, NEN-010 (§6) |

## 3. Số đo

### 3.1 Sổ lỗi (máy sinh)

<!-- so-loi:report:begin -->
Đo ngày 2026-11-24 bằng `node scripts/readiness/so-loi.mjs report --ghi`; sinh từ sổ, không sửa tay (kiểm: `report --kiem`). Mỗi ô là đang mở/tổng, không tính lỗi giả.

Sổ lỗi: 214 dòng · mở 10 · đã sửa 165 · lỗi giả 22 · hoãn 17

| Module | NGHIEM_TRONG | CAO | TRUNG_BINH | THAP |
|---|---|---|---|---|
| VST_GSC | 0/0 | 0/9 | 0/14 | 0/17 |
| CSSD | 0/1 | 0/7 | 0/22 | 4/16 |
| NKBV | 0/0 | 0/11 | 0/20 | 1/16 |
| QLCV | 0/0 | 0/0 | 0/5 | 0/1 |
| DAO_TAO | 0/1 | 0/0 | 0/8 | 0/6 |
| QUAN_TRI | 0/0 | 0/2 | 1/9 | 1/8 |
| NEN | 0/0 | 0/2 | 2/8 | 1/9 |

```text
MOI 0 · DA_XAC_MINH 0 · LOI_GIA 22 · DANG_SUA 0 · DA_SUA 165 · HOAN 17 · CHO_PO 10
Tỉ lệ lỗi giả: 22/187 việc đã đóng
Việc kế: xác minh 0 · sửa 0 · chờ PO 10
Kịch bản tay: CHUA 16 · DAT 70 · KHONG_DAT 0
DA_SUA có test/migration trong commit: 136/165
Tuổi TB việc mở: 5,0 ngày (10/10 dòng mở có ngày; mốc = commit đầu đưa id vào so-loi.json)
Migration mỗi lát: TB 0,28 · lớn nhất 2 · lát có ≥ 1 migration 39/144 (file migration thêm mới trong mỗi commit DA_SUA, mỗi commit đếm một lần; trần plan ≤ 1)
Hàm định nghĩa lại 30 ngày: 33 hàm (49 lần) · tổng 328 lần định nghĩa cho 165 hàm (CREATE OR REPLACE FUNCTION trong supabase/migrations, từ 2026-10-25)
```
<!-- so-loi:report:end -->

### 3.2 Bề mặt kỹ thuật (đo 2026-11-24, DB local version cuối `20261119210000` + mã `2222a336`)

| Hạng mục | Số | Ghi chú |
|---|---|---|
| Bảng · view · hàm (SECURITY DEFINER) · trigger · index ở `public` | 63 · 59 · 177 (107) · 43 · 306 | |
| RLS policy `public` · bảng chưa bật RLS | 190 · 0 | 17 policy SELECT lọc dữ liệu theo khoa hoặc theo người, trên 17 bảng: 4 `gstt_fact_*`, 11 `nkbv_fact_*`, `mdm_nhan_su_select_self`, `user_roles_self_or_admin_select_v2` |
| Hàm dùng `auth.uid()` · `auth.role()` · đọc `auth.users` | 18 · 8 · 1 | Có 2 khóa ngoại trỏ vào `auth.users` (`mdm_nhan_su.auth_user_id`, `sys_user_roles.user_id`) |
| Hàm role `authenticated` gọi được trực tiếp | 59, trong đó 16 hàm DEFINER | Gồm 4 hàm `unaccent` |
| View chạy quyền chủ sở hữu, `authenticated` đọc được | `v_mdm_nhan_su_picker` | `security_invoker=false` |
| File mã dùng admin client · dùng user client (chỉ user client · dùng cả hai) | 112 · 53 (22 · 31) | Không tính spec |
| Component trình duyệt gọi thẳng DB/Storage · Realtime | 2 (`PermissionProvider.tsx`, `ChecklistItem.tsx`) · 0 | |
| File migration · migration gọi `cron.schedule` | 328 · 4 | Các job QLCV có kiểm `IF EXISTS pg_cron`. DB local không cài `pg_cron` |
| Hàm định nghĩa lại | tổng 328 lần cho 165 hàm | `so-loi.mjs stats` |
| Extension trên DB local | `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `unaccent`, `uuid-ossp` | |

### 3.3 Lệnh đo lại

```
node scripts/readiness/so-loi.mjs stats            # sổ lỗi
npm run module:gate ; npm run module:audit         # cổng module
git rev-list --count origin/main..integrate/2026-11            # commit chưa lên prod
git rev-list --count origin/integrate/2026-11..integrate/2026-11   # commit chưa push
ls supabase/migrations/*.sql | awk -F/ '{print $NF}' | awk '$0 > "<PROD_HEAD>~"'   # migration chưa áp prod (PROD_HEAD ở supabase/PROD_HEAD)
docker exec supabase_db_ksnk_bv103 psql -U postgres -d postgres -Atc "select count(*) from pg_policies where schemaname='public'"
```

## 4. Prod và local (2026-11-24)

- **Production = `origin/main` = `e908e7e0`.**
  - PR #131 gộp ngày 17/11. GitHub API báo deploy thành công, nhưng chưa ai mở site để kiểm.
  - Prod = Supabase `cvzwslpxwgqiugzzhqej`. Migration lên prod chỉ đi qua MCP `apply_migration`.
- **Lô ngày 17/11 đã xong:**
  - Nhóm A: 37/37 migration, hậu kiểm khớp.
  - B1–B4 đã làm.
  - B5: so tên với md5, prod chỉ thiếu K5.
  - TC09 (VST-043, sửa câu trích QĐ 3651 trong `gstt_dm_bang_kiem`) đã làm, sổ ghi `DA_SUA`.
- **Ngày 19/11:** áp prod 4 migration `20261118100000`…`130000`. `supabase/PROD_HEAD` = `20261118130000`. Code đi kèm chưa deploy (D1).
- **Chưa áp prod: 12 file `20261119*`.**

  | File | ID sổ |
  |---|---|
  | `100000_cssd_tach_nhiet_bao_goi_mac_dinh` | CSSD-043 (b) |
  | `110000_cssd_039_khoa_su_co_ghi_giao_dich` | CSSD-039 |
  | `120000_vst_037_ke_hoach_chi_ghi_qua_service_role` | VST-037 |
  | `130000_cssd_045_registry_options_loai_dung_cu` | CSSD-045 |
  | `140000_cssd_037_lap_lai_phieu_xuat_sau_dao` | CSSD-037 |
  | `150000_vst_028_vai_lanh_dao_khoa` | VST-028 |
  | `160000_cssd_042_rls_loai_bao_goi_module_bo_dc` | CSSD-042 |
  | `170000_nen_012_go_rls_hoi_dong_identity` | NEN-012 |
  | `180000_vst_045_quyen_view_lanh_dao_khoa` | VST-045 |
  | `190000_vst_046_quyen_view_chu_nhiem_khoa` | VST-046 |
  | `200000_nen_009_revoke_anon_max_numeric_suffix` | NEN-009 |
  | `210000_nen_020_revoke_anon_public_execute_35_ham` | NEN-020, NEN-018 |

  Mỗi file có ADR ở `docs/adr/20261119-*.md`. Theo quy trình PO ngày 11/11, trước khi lên prod phải áp thử cả chuỗi trên một bản sao DB.
- **Chưa kiểm sau deploy 17/11:**
  - Chưa mở site.
  - Chưa đăng nhập bằng vai thật sau B1.
  - Chưa mở dashboard VST/GSC trên prod sau B2.
  - 7 cột prod mà lát L12a/L12b thôi dò chưa được truy vấn. SQL nằm ở `git show 2222a336:.claude/plans/KH_APPKSNK_20261116_lam-gon-ma.md`, dòng 391–406. Thiếu cột thì `git revert 278334e8 1e1a1a8d`.
  - Kịch bản hoàn tác B1 nằm ngoài repo, có thể đã bị dọn, chưa chạy thử.
  - `executeRejectToPreviousStation` (CSSD trả lui) gọi `rpc_cssd_nhat_ky_ghi` bằng client nào, 5 hay 6 tham số: mới đọc `cssd-workflow-application.ts:269` (KH lô prod 17/11, mục «Tự kiểm»).
- **Còn treo từ lô 17/11:**
  - Q3: 14 bộ tổng chưa tách.
  - Q5: policy `Authenticated users can read dm_khoa_phong` không có trong migration nào.
  - Q7: `dao_tao_cau_hoi` trên prod thiếu 7 cột và 3 index, không có migration tương ứng.
  - Q8: 6 bảng sao lưu `zz_sao_luu_20261112_*`.
  - NEN-003: chỉ lệch số version, đang để `HOAN`.
- **Chuỗi migration không dựng được DB sạch.**
  - Nguyên nhân: commit `f44b7705` (16/11) thay migration đã áp `20260729121000` bằng stub. Chốt cứng của `20261004194907_perf_rls_initplan` vì vậy đếm ra 139 thay cho 140.
  - Đường vòng: `scripts/db-dung.sh` và `scripts/db-reset-local.sh` thay file ở bản sao (PO duyệt «thay ở bản sao» 18/11).
  - 28 migration đã bị sửa sau khi áp.
  - Baseline nháp so với chuỗi gốc: LỆCH 632 dòng schema, 18 dòng catalog, 61 dòng ngoài `public`.
  - Squash 4b chưa mở.
- **File K5 `20261114180000_nkbv_fact_select_rls_hoi_dong_identity.sql` vẫn ở repo.** Theo PO ngày 17/11, K5 không áp prod. `20261119170000` (NEN-012) gỡ các policy này ở local.
- **Tài khoản và thử tay:**
  - Tài khoản thử: NV_TEST01 gốc chỉ có vai NHAN_VIEN_KSNK, khoa C18. Đổi tạm thì trả về gốc cuối phiên; `npm run trial:prep` đặt lại mật khẩu.
  - Chưa có tài khoản thật giữ vai CHU_NHIEM_KHOA hay HOI_DONG_KSNK để kiểm bằng JWT.

## 5. Đang làm · Kế · Mở phiên mới

- **ĐANG LÀM:** không có lát nào. Gom tài liệu đã gộp vào `integrate/2026-11` (`cc84241c`, 24/11). Đối chiếu ops-web xong 25/11 (§8.4).
- **KẾ:** Chặng 0 của [01 §6](01-tong-quan-yeu-cau-lo-trinh.md), làm theo thứ tự ở đó. Những việc chỉ PO làm được ở §6.
- **Đã xong đợt 19/11 (sổ lỗi giữ chi tiết):**
  - Lát 1, 1b, 1c, 2, 3 của «một con đường». Lát 1c: e2e VST+GSC 6/6 trong `DB_DUNG_E2E=1 npm run db:dung`.
  - Hàng rào `supabase/PROD_HEAD` cùng `scripts/guard-migrations.mjs` và `scripts/guard-adr.mjs`.
  - Ngày 20/11 thêm nút hủy bảng kiểm offline bị kẹt (`2222a336`).
- **Mở phiên mới:**
  1. Làm ở worktree `integrate-2026-11`. Chạy `so-loi.mjs status`, rồi `next 10`, rồi `stats`. Bật `dev-local` (cổng 3001, DB local) bằng `preview_start`.
  2. Không chạy hai `db:dung` cùng lúc: phiên sau tắt stack của phiên trước. Chỉ chạy khi `pgrep -f "bash scripts/db-dung.sh"` rỗng.
  3. Vòng một việc theo `CLAUDE.md`. `lop=DB` thì giao `migration-author`. `VAN_HANH` thì chờ PO. Ghi kết quả thử tay: `so-loi.mjs tay <ID> DAT|KHONG_DAT|CHUA "<ghi chú>"`.

## 6. Câu hỏi PO (một chỗ duy nhất)

Cập nhật 2026-11-24. Mỗi câu có mã; PO trả lời theo mã. Câu im thì áp dụng mục «Nếu im».

### A — Kế hoạch cải tổ 24/11 (Phần 6 của kế hoạch gốc)

| Mã | Câu | Đề xuất | Nếu im |
|---|---|---|---|
| A1 | Chạy trọn Chặng 0 → 3 hay chỉ Chặng 0 + 1 rồi chuyển sang ops-web | **ĐÃ CHỐT 2026-11-25 (PO): chạy trọn trên `ksnk_bv103`; ops-web chỉ học mẫu (§8.4).** ADR-003 của ops-web không áp dụng cho repo này | Đã chốt |
| A2 | Lấy `integrate/2026-11` làm `main` chuẩn, gắn tag sao lưu nhánh cũ, dọn worktree dư, đưa file dữ liệu ngoài mã ra khỏi gốc repo | **ĐÃ CHỐT 25/11: đồng ý.** Đưa lên `main` = deploy production: cần «deploy» và D1. Dọn worktree sau khi kiểm không còn phiên nào đang mở. Tag sao lưu đã gắn cục bộ (chưa push): `archive/pre-overhaul-chore-20261124` (`72ab239b`), `archive/pre-overhaul-main-20261124` (`e908e7e0`) | Đã chốt |
| A3 | Thứ tự nghiệm thu người dùng thật: Nhóm 1 (VST, GSC, Dashboard, Quản trị) → Nhóm 2 (CSSD, sự cố, hóa chất) → Nhóm 3 (QLCV, NKBV, Đào tạo); giữ ẩn «Chất thải & Đồ vải» | **ĐÃ CHỐT 25/11: đồng ý** | Đã chốt |
| A4 | Chặng 2: đăng nhập nội viện bằng mã nhân viên hoặc email + mật khẩu, lưu ở `public.sys_user_accounts`, giữ UUID và mật khẩu hiện có | **ĐÃ CHỐT 25/11: đồng ý**, kèm hai điều kiện: đo định dạng hash trong `auth.users` của prod trước; phạm vi gồm quên mật khẩu và khóa sau nhiều lần sai | Đã chốt |
| A5 | Chấp nhận các điều kiện sửa ở 01 §6: deploy là cổng PO; 17 policy cần bộ lọc TypeScript có test trước khi bỏ, NKBV cắt sau cùng; SQL thu quyền của `authenticated` cả trên hàm và view, `CREATE OR REPLACE` tường minh, dump policy làm đường lùi; baseline so với dump prod; kiểm kê `pg_cron`; Chặng 2 thêm đặt lại mật khẩu, khóa tài khoản, giới hạn tần suất; bỏ hạn theo ngày | **ĐÃ CHỐT 25/11: đồng ý**, gồm ba chỗ nới (01 §6.0) | Đã chốt |
| A6 | Khóa «chỗ nới 1» bằng máy: `gate-integrity` kiểm trần số dòng của file này. ops-web giữ file ngắn chỉ bằng kỷ luật, không có kiểm máy nên không chứng minh được cách đó đủ | **ĐÃ CHỐT 25/11: đồng ý**; trần 500 dòng (hiện khoảng 410 dòng); cài ở `scripts/gate-integrity.mjs` | Đã chốt |

### C — Hỏi khoa CSSD (đầu mối: Nguyễn Thanh Bình)

- **C1 · CSSD-046 · Lưới Silicone JF941 (bộ tổng C′) có hấp hơi nước được không?**
  - Hiện xếp ở bộ con -KCN.
  - Có: chuyển sang -CN.
  - Không: giữ -KCN, đóng CSSD-046.
  - Câu này chỉ khoa trả lời được.
  - **Nếu im:** giữ -KCN.
- **C2 · CSSD-049 · Dụng cụ EO và dụng cụ Plasma có đóng gói, lưu kho thành bộ riêng không?**
  - Có: cần bộ con -EO, làm CSSD-043 phần (a). Phần (b), bao gói mặc định, đã sửa ở `7d79bdec`.
  - Không: gộp vào -KCN, đóng phần (a).
  - **Nếu im:** -EO không tách.

### D — Lệnh prod/deploy (PO chỉ cần gõ lệnh)

| Mã | Việc | Lệnh PO gõ | Máy kiểm trước |
|---|---|---|---|
| D1 | Deploy code đi kèm 4 migration `20261118*` đã ở prod (ngăn kéo CSSD-034, trang kế hoạch giám sát). Nay là gộp 237 commit `integrate` vào `main`. Cần ủy quyền server `vercel` qua `/mcp` | «deploy» | Vai NHAN_VIEN_KSNK trên prod có quyền GIAM_SAT_NKBV import. Áp thử chuỗi 12 migration `20261119*` trên bản sao DB. Áp 12 file đó lên prod trước khi deploy (migration trước, code sau), hoặc chứng minh code chạy được khi chưa áp |
| D3 | Đẩy commit local lên GitHub; CI `db-dung.yml` chỉ chạy sau bước này | «push» | `npm run verify` |
| D5 | CSSD-041: đếm quy trình kẹt trên bộ tổng còn con active. Đếm 19/11 ra 0 nhưng vô nghĩa, vì prod chưa có bộ con. Câu SQL: `git show 2222a336:CAU_HOI_PO_APPKSNK.md` dòng 45 | «đếm CSSD-041» | Chỉ đọc |
| D6 | CSSD-048: tắt 68 bộ mẹ rỗng. Chưa chạy: prod có 164 bộ, 0 bộ con, nên số 68 chỉ có ở local. Đo lại sau khi dữ liệu tách nhiệt lên prod | «tắt 68 bộ» | `SELECT count` trước và sau |
| D7 | Tách khóa Preview khỏi prod (bốn biến Supabase, xem §8.4). **Đã làm 25/11 (PO duyệt; Claude thao tác trên Vercel qua Chrome):** `SUPABASE_SERVICE_ROLE_KEY` chỉ còn target Production; `SUPABASE_ACCESS_TOKEN` đã xóa khỏi Vercel (`src/` không dùng; chỉ `scripts/gstt-gap-backfill.mjs` và `scripts/sync-check.mjs` dùng, chạy ở máy PO). Hai thay đổi chỉ có hiệu lực từ lần deploy kế. **Còn lại, PO tự làm:** thu hồi token đó ở Supabase (Account, Access Tokens), vì xóa ở Vercel không vô hiệu hóa token, mà token từng có mặt trong các bản build Preview | PO tự làm ở Supabase | Danh sách biến theo target, đã kiểm lại 25/11 bằng Vercel MCP |

Còn thiếu dữ liệu:
- P12: người giữ vai CHU_NHIEM_KHOA đã có tên (N6, PO 17/11: Trịnh Hữu Nghĩa, xem 02 bảng vai). Còn gán tài khoản thật (cổng PO).
- P13 cần danh sách `KSNK_BREAK_GLASS_EMAILS`. Claude không đọc `.env*`, nên PO dán danh sách hoặc tự chạy SELECT.
- D4 đếm ra 0; QT-015 ý 3 chờ PO quyết đóng.

### N — Vận hành thử

- **N1 · NKBV-051:** PO đã đồng ý nâng NKBV lên XÂY. Còn thiếu hai thứ: tên đầu mối, và gỡ hết `[CẦN XÁC NHẬN]` ở mục 1–2 của `docs/modules/nkbv/van-de-nguoi-dung.md`.
- **N2 · NEN-013:** PO tự bật `KSNK_PILOT_FOUR_MODULES` trên Vercel và sửa mô tả ở `.env.example:23`. Mã ẩn module đã xong (`c67a5206`, 17/11), lên prod cùng D1.
- **N3 · NEN-014:** cần tên đầu mối cho NKBV, QLCV, Đào tạo. VST/GSC: `module:gate` và NEN-014 ghi «Tổ giám sát KSNK», còn 02 (V1, PO 17/11) ghi Nguyễn Bá Hoài Việt, Trịnh Hữu Nghĩa; PO xác nhận bên nào đúng. Chưa có tên thì không module nào được tính là xong.
- **Việc PO tự làm:**
  - Mở dashboard VST/GSC trên prod và báo nếu số liệu lệch.
  - Tắt plugin superpowers nếu còn bật.

### M — Mặc định đang chạy (im = giữ; muốn đảo thì nói mã, máy revert sha)

| Mã | Đang chạy | Đảo = revert |
|---|---|---|
| QLCV-010 | Người đề xuất không tự phê duyệt đề xuất của mình (trừ ADMIN) | `81eb1ae2` |
| QT-012 | Vai khách thống kê không được thi Đào tạo; chặn ở app | `146af592` |
| NKBV-018 | Người chỉ có quyền CSSD tra ngược ca SSI theo mẻ: thấy mã ca và ngày, không thấy họ tên | `8b1bdfc1` |
| CSSD-017 | Giờ đọc BI được muộn hơn giờ bấm tối đa 2 phút; ủ tối thiểu 20 phút | `e7cdd053` |
| Đầu mối UAT | Tạm ghi «Tổ giám sát KSNK» | PO nêu tên ở N3 |
| `trace` | Chỉ chạy local, không chạy trong CI | Nói «trace vào CI» |
| CSSD-043 (b) | Bộ con tách nhiệt nhận bao gói mặc định: CN → GIAY, KCN → TUI_EP | `7d79bdec` |
| VST-038 lát A | ADMIN và NV KSNK kiêm MẠNG LƯỚI không bị khóa khoa khi in nhãn GSC | `4e076eae` |
| VST-013(a) | Ô chọn khoa của form VST xếp khoa lâm sàng (Khối Nội, Ngoại) lên trước (`src/modules/giam-sat-vst/lib/vst-khoa-order.ts`) | `79375a0f` |
| `lam-het` | Skill `lam-het` là xương sống của luồng | Nói «bỏ lam-het» |
| Sổ nợ cũ | Phân loại một lần 19/11: dòng chuyển sang sổ lỗi, dòng đã xong, dòng đóng «không làm» | `fbea3fb6`; nói số dòng cần mở lại |
| `loai` | Dòng sổ lỗi cũ thiếu `loai` thì mặc định `loi` | `ea68c7d6`; nói «điền loai» |
| settings.json | Claude không sửa `~/.claude/settings.json`; bật/tắt plugin do PO làm | Nói «Claude sửa settings.json» |

Đã chốt 19/11, bỏ khỏi K: P8=A giữ NHSN (NKBV-050); P5=Gác `chat-thai-do-vai`, ẩn menu, giữ mã (NEN-011).

### K — Không gấp (im = giữ như đang chạy)

| Mã | Câu | Đang giữ |
|---|---|---|
| K1 | `PackConditionSelect` (QT.22) có mã nhưng chưa nối vào màn nào: nối vào đâu? | Giữ mã |
| K2 | Kho CSSD còn cần nạp/xuất Excel (`importCSSDData`) không? | Giữ |
| K3 | `CssdPrintQcProofTable` thuộc biểu mẫu nào? | Giữ |
| K4 | Máy CSSD có cần mã QR riêng không? Cột `ma_qr_thiet_bi` chưa từng có trong DB | Giữ mã |
| K5 | Hiện lại `NkbvCdcMetricsPanel` trong tab NKBV không? | Giữ ẩn |
| K6 | Làm «gói quyền nhanh» (gán quyền sẵn theo vai) không? | Chưa làm |
| K7 | NKBV theo NHSN 2026: (b) bật lại LabID không · (c) nâng SSOT từ 2025 v3.3 lên 2026 không · (d) PATOS chỉ làm nhãn (đã làm) | (b) giữ tắt · (c) giữ 2025 v3.3 |
| K9 | Mã kho tri thức chờ PO (KH 13/11 và 14/11): XM-2, cỡ mẫu (R1.14 nêu tối thiểu 100/tháng, app ghi 20, khóa PO 01/11 ghi 50 theo khoa/kỳ; số app đang dùng: cần kiểm) · X2.13, QT.32, R1.10 (nội dung: cần kiểm) | Giữ như app đang chạy |
| K10 | Xóa/sửa muộn phiên VST (KH 13/11 L3b): xác nhận các giả định: «đã xác nhận» = quá 30 phút từ lúc tạo phiên; ADMIN vẫn xóa trực tiếp; người gửi yêu cầu = chủ phiên hoặc NV KSNK/CHU_NHIEM_KHOA; không tự duyệt yêu cầu của mình (trừ ADMIN) | Giữ như mã đang chạy |

### L — Học từ ops-web (2026-11-25; im = giữ như app đang chạy)

| Mã | Câu | Đề xuất | Nếu im |
|---|---|---|---|
| L1 | Phiếu sự cố CSSD: chặn người báo tự đóng phiếu. ops-web chặn (`incidents.routes.ts`). bv103 đã chặn tự xác nhận (`confirm-incident.application.ts`); ở bước đóng (`close-incident-release.application.ts`) grep chưa thấy kiểm người báo | Đồng ý, kèm 1 spec | Giữ |
| L2 | Ủy quyền thu hồi: người báo cấp thấp chỉ ghi «chờ ủy quyền», cấp cao xác nhận thì mới ra lệnh thu hồi | Kiểm trước xem `canApproveCssdIncident` đã có tương đương chưa, rồi hỏi lại | Giữ |
| L3 | Tự mở việc CAPA 7 ngày từ sự cố, và cờ đỏ khi có từ 2 sự cố cùng chu trình; việc giao cho người khác người báo | Xét ở Nhóm 2, chưa làm | Giữ |
| L4 | Tài khoản (Chặng 2): khóa sau N lần sai, giới hạn tần suất đăng nhập, đặt lại mật khẩu tự phục vụ. ops-web chưa có, không có mẫu để lấy. PO chốt N và thời gian khóa | Đưa vào Chặng 2 như 01 §6.4 | Chốt khi vào Chặng 2 |
| L5 | Nạp dữ liệu nền thật từ `raw-inputs/` của ops-web (7 gói: khoa-phòng nguy cơ, nhân sự và mạng lưới, bộ dụng cụ và BOM, máy và hóa chất, vi sinh NKBV, VST cũ, tài liệu). Vào các bảng sẵn có bằng import lô, không thêm bảng. Bản 22/11 ghi 2.311 loại, 164 bộ, 7.289 dòng BOM (chưa kiểm) | Mở lát này sau nghiệm thu Nhóm 1; PO duyệt từng danh mục; chỉ nạp cột cần dùng vì có thông tin cá nhân | Chưa nạp |

## 7. Nợ và ghi nhận ngoài lát

- **Sổ lỗi là nơi duy nhất cho lỗi và việc mở:** `node scripts/readiness/so-loi.mjs status | next 10 | stats`.
- **Bảng phân loại sổ nợ cũ (19/11)** còn xem được bằng `git show 2222a336:SO_NO_APPKSNK.md`.
- **Ghi nhận ngoài lát** (một dòng mỗi mục, phân loại vào sổ ở lần kế):
  - `supabase/migrations/20261119110000_cssd_039_khoa_su_co_ghi_giao_dich.sql:182-193`: hủy sự cố không khóa dòng phiếu ngược đang bị tắt `is_active` cùng lúc. Rủi ro rất thấp (Minor).
  - `…20261119110000…sql:56`: phiếu NHẬP có `su_co_id` vẫn lọt vào sự cố đã hủy. App hiện không gửi trường này (Minor).
  - `scripts/db-dung.sh:150`: bước chờ chỉ gọi `/login`, không kiểm server của chính script còn sống. Nếu còn server mồ côi, e2e có thể chạy trên bản build cũ và cho kết quả xanh giả (Minor).
  - `scripts/db-dung.sh:155`: lấy tài khoản e2e có sẵn trong shell, và `next build` local nạp `.env.local` (`KSNK_PILOT_FOUR_MODULES`, `KSNK_BREAK_GLASS_EMAILS`), nên xanh ở local chưa chắc xanh ở CI. Việc này thuộc Chặng 0 (`.env.test`).
  - `.github/workflows/db-dung.yml:41`: chưa cache Playwright (Minor).
  - `e2e/gsc-vst-supervision.spec.ts:35,76`: `toHaveCount(0)` qua ngay khi thấy chữ «Tỷ lệ tuân thủ», nên lỗi xuất hiện sau đó sẽ lọt.
  - `src/lib/offline-pending-supervision-save.ts:158`: lỗi khu vực không được tính là lỗi vĩnh viễn, nên hàng đợi offline thử lại mãi. Ngày 20/11 đã có nút hủy (`2222a336`). Phân loại lỗi vĩnh viễn sang trạng thái «chờ người xem» là việc của Chặng 0; không âm thầm bỏ dữ liệu.
  - `src/modules/cssd-su-co/domain/cssd-batch-recall.ts:117`: `batchStatusAfterBiRecall` lệch SQL sau KH-L4b; chỉ có spec gọi. Hai cặp chuyển →`QC_KHONG_DAT` chờ siết `ghi_test`. Đích `DA_TAI_XU_LY` đã chốt là Trạm Tiếp nhận (PO 17/11, C6).
  - `src/modules/giam-sat-nkbv/actions/giam-sat-nkbv-ba-timeline.actions.ts:13,144,165,193`: 4 action ghi chưa thấy kiểm phạm vi bệnh án. Chưa xác minh, cần `security-auditor` rà riêng (KH 16/11 dòng 304); đưa vào sổ lỗi ở lần rà kế.
  - Sáu guard chưa nối vào gate: `engineering:contract:gate:strict`, `gstt:scoring:audit`, `guard:cssd-red-alert-view`, `smoke:cssd-station-map`, `sql:object-refs`, `verify:danh-muc-routes`.
  - Thử tay sau lát làm gọn mã (`lam-gon-ma` §9) chưa ai làm. Ba câu còn treo ở lát đó: `defaultPeriodFilterNow` tháng 0, `invalidateClientDanhMucCache`, `ma_qr_thiet_bi` (= K4).

## 8. Báo cáo đánh giá (gộp)

### 8.1 Kế hoạch cải tổ 2026-11-24: khám nghiệm và nhận định

**Bảy bệnh gốc** theo kế hoạch gốc (tiêu đề ghi «tám» nhưng chỉ liệt kê bảy):
1. Kiểm quyền hai tầng: RLS cùng với `service_role`.
2. Migration vá đè.
3. Nhiều worktree; checkout chính tụt 754 commit.
4. Bộ máy sổ sách nặng.
5. Thiếu hàng rào máy.
6. Năm kiểu kiến trúc cùng tồn tại; nghiệp vụ tách đôi giữa SQL và TypeScript.
7. Xây rộng hơn phần đang dùng thật.

Số đo lại ở §3.2 khớp phần lớn số của kế hoạch.

**Chỗ kế hoạch gốc ghi sai:**
- Nguyên nhân DB không dựng sạch là sửa một migration đã áp (§4), không phải do RLS.
- Kế hoạch bỏ sót `pg_cron`.
- Kế hoạch coi bước baseline là nhẹ. Lần thử trước ra LỆCH (§4).
- ops-web không còn là «3 file migration» như kế hoạch ghi.

**Ba lỗi chặn**, mỗi lỗi thành một điều kiện trong 01 §6:
1. «Đưa `main` lên `integrate`» thực chất là deploy production 237 commit. Bước này cần «deploy» và D1.
2. Bỏ 17 policy đang lọc dữ liệu theo khoa hoặc theo người (bảng người bệnh, cùng `mdm_nhan_su` và `user_roles`), trong khi lớp TypeScript chưa có bộ lọc danh sách đã kiểm.
   - Lớp TypeScript từng hở: NKBV-033 đọc census có họ tên qua admin client; NKBV-038 phạm vi khoa mặc định mở toàn viện.
   - `guardKhoaScope(actor, targetKhoaId)` chỉ kiểm một id, không lọc được danh sách.
3. SQL nháp của Migration 1 và 2 chưa đạt mục tiêu «trình duyệt không chạm DB».
   - Khối REVOKE chỉ thu quyền của `PUBLIC` và `anon`, nên `authenticated` vẫn gọi được 59 hàm (16 DEFINER).
   - View `v_mdm_nhan_su_picker` vẫn đọc được.
   - 18 hàm được viết lại bằng regex lúc chạy, nên thân hàm mới không nằm trong repo.
   - Không có đường lùi.

**Kiểm định:** `kiem-dinh` vòng 1 chấm CHƯA ĐẠT (18/29 mục; phiên 24/11, kết quả không lưu file). Bản nhận định đã sửa theo kết quả đó. Chưa chạy vòng 2.

**Kiểm định bản gộp tài liệu (24/11):** `kiem-dinh` chấm CHƯA ĐẠT ở commit `efede588` (6 Cao, 10 Trung bình, khoảng 110 mục, khớp khoảng 70%). Đã sửa ở commit kế: luật migration trước code sau, đề xuất A1–A5 chưa phải PO chốt, việc rơi từ kế hoạch gốc (`tsconfig`, ESLint `warn`, 8 hàm `auth.role()`, chi tiết Chặng 2), luật giao diện PO đã duyệt, phát hiện `ba-timeline`, lát ẩn module đã có mã.

### 8.2 Đối chiếu NKBV với NHSN 2026 (2026-11-11)

- **Kết luận gốc:**
  - Khung thời gian lõi khớp gói NHSN: IWP ±3, RIT 14 ngày, SBAP, POA/HAI, Transfer Rule, DOE.
  - Điểm yếu lớn nhất là đầu vào: engine nhận cờ boolean do người dùng tick, không nhận sự kiện có ngày và giá trị.
  - LabID đã tắt.
  - Thiếu PedVAE (cố ý), thuật toán Locations (Ch.15), 5 site Ch.17, và admissions ở mẫu số.
- **Đã làm (giai đoạn GĐ0–GĐ2, đã vào `integrate`):**
  - Bộ ca hồi quy ở `src/modules/giam-sat-nkbv/lib/__fixtures__/nhsn2026/` (4 file: ch02 timeline, ch02 transfer, ch07 IUC, ch10 VAC). Bản cũ ghi 31 ca; chưa đếm lại.
  - SSI: PATOS chỉ còn là nhãn.
  - VAE: sửa baseline và chuẩn hóa PEEP.
  - BSI: thêm các cờ loại trừ `excl_*`.
  - PNEU đã sửa.
  - BONE: thêm IWP 21 ngày.
  - Kết quả chạy `npm run test:cssd -- src/modules/giam-sat-nkbv`: 676 pass, 2 skip (19/11).
- **Còn dở:**
  - DOE của SSI theo tầng sâu nhất (`resolveSsiDoe` đang lấy tầng sớm nhất).
  - Cửa sổ ±2 (V10.27).
  - `excl_*` chưa thử tay trên giao diện.
  - Ô B4.56.
  - PNU3 và mẫu máu `table2Culture`.
  - Chất lượng đờm.
  - G2.02.
  - Các mục viết lại hoặc viết mới chờ PO (K7): đầu vào sự kiện, LabID, Ch.15/14, 5 site Ch.17.

### 8.3 Báo cáo trước đây (đã bị 8.1 thay)

- **Báo cáo tổng hợp 13/11 (gộp 18/11):** «xếp hàng có cổng» thay cho đóng băng; «ẩn, không xóa»; chốt SSOT trước khi code một module; với NKBV, sửa theo NHSN ưu tiên hơn tính năng mới. Bảy quyết định ở §5 của báo cáo đó đã cũ: phần còn sống nằm ở §6 của file này.
- **Rà soát 05/11, cải tổ 06/11:** đã rút gọn vào báo cáo 13/11.

### 8.4 Đối chiếu ops-web (2026-11-25)

**Phạm vi.** Đọc mã tĩnh `~/Projects/01-app-ksnk-web/ksnk-ops-web` (HEAD `765b210`, 24/11) bằng 4 agent chỉ đọc; điểm ghi [kiểm] là tôi tự mở lại, [agent] là lời agent chưa kiểm. Chưa chạy test hay build của ops-web. Một phiên khác đang sửa ở đó (~90 file chưa commit, 3 migration mới) nên số dòng có thể dời. Hai báo cáo 22/11 nằm ngoài git: `~/Projects/02-cai-tao-ksnk-103/BAO_CAO_SO_SANH_DU_AN_CU_MOI_20261122.md` và `~/Projects/01-app-ksnk-web/SO-SANH-APP-CU-VA-MOI.md`. Mục này chỉ ghi phần đổi từ 22/11.

**Kết luận.** bv103 là nền (A1). Một kế hoạch «học từ ops-web» viết 22/11 (khi ops-web mới có 2 commit) đã kết luận cùng hướng: cải tổ bv103, không chuyển; và khuyến nghị giữ RLS, giảm dần đường dùng admin client, khớp với 1a ở 01 §6.3. ops-web nay có 13 commit nhưng vẫn 0 remote [kiểm], nên CI của nó chưa chạy ở đâu và mã có thể mất nếu hỏng ổ đĩa; việc đó ngoài phạm vi repo này, báo PO.

**Lỗi «xanh giả» của 22/11 trên mã hiện tại** (14 dòng: 6 đã sửa, 3 một phần, 5 còn nguyên):
- Đã sửa [kiểm]: mã băm toàn vẹn không còn là SHA-256 của chuỗi `test` (HEAD không còn hằng đó; cây làm việc tính từ dữ liệu thật); từ vựng ghi và đọc (CS-07, CS-19, CS-23, `LAB_MICRO`) gom vào `packages/shared/src/constants.ts` (có trong HEAD); `db_to_analytics_concordance.test.ts` assert số tính tay (CS-07 x=1, n=50, giá trị 20), HEAD không còn `toHaveLength(24)`.
- Còn nguyên [kiểm]:
  - `properTechnique` và `sufficientDuration` mặc định `true` khi client không gửi (`prototype_ops.routes.ts`).
  - Nhật ký chất thải mặc định 35 kg lây nhiễm, 6 kg sắc nhọn, mã chứng từ `CT-CTNH-20261120` (`wave3.routes.ts`).
  - Phơi nhiễm: API mặc định nguồn HIV `POSITIVE` và HBsAg dương (`wave3.routes.ts`).
  - Điều chỉnh tồn kho hóa chất: người lập cũng là người duyệt (`wave3.routes.ts`).
  - Bowie-Dick: `runBowieDickPassNow` mặc định `true` (`wave2.routes.ts`); đoạn tự ghi PASS ở khối nạp mẻ mới đọc phần đầu.
- Sửa một phần [agent]: sự cố có chặn người báo tự đóng, biên bản bắt buộc, CAPA tự sinh, BI dương và Bowie-Dick hỏng mở sự cố, nhưng chuyển trạng thái OPEN, INVESTIGATING, MITIGATED không kiểm thứ tự và lỗi khâu 2, 4 chưa tự mở sự cố; phơi nhiễm ở UI; duyệt ca NKBV (chỉ tầng 2 ra CONFIRMED, nhưng nạp vi sinh vẫn ghi cứng năm sinh 1965 và giới NAM).
- Sửa nhưng chưa commit [kiểm]: Bowie-Dick «ĐẠT» không còn mở khóa máy (HEAD chưa có `machineStillLocked`).

**Gate của ops-web** [kiểm]: `gate.sh`, `check`, `verify` dùng `lint:errors` (`--quiet`, cảnh báo lọt qua); CI dùng `--max-warnings 0` và không chạy `audit:standards` hay e2e. Không có kiểm độ dài tài liệu bằng máy. `src/` còn dòng `eslint-disable-next-line`, và không có cổng chặn thêm mới (bv103 có `gate-integrity`).

**Xác thực và đóng gói** [kiểm]: ops-web băm PBKDF2 100.000 vòng, token phiên lưu `sessionStorage`; chưa có khóa tài khoản, giới hạn tần suất, đặt lại mật khẩu tự phục vụ; `restore-db.sh` mặc định kiểm 57 bảng, không đếm dòng. Mẫu lấy được: 01 §6.4.

**Sự cố so với bv103** [agent]: bv103 tốt hơn ở vô hiệu (mã lý do, hoàn kho trong một giao dịch), cờ đỏ lưu thành cột, thu hồi hai pha, khóa ngoại kho với sự cố. ops-web tốt hơn ở chặn người báo tự đóng, ủy quyền thu hồi, ma trận mức độ, CAPA 7 ngày. Câu hỏi PO: §6 L.

**Test** [agent; một phần kiểm]: bv103 thiếu test quét giao diện (grep `pageerror`, `scrollWidth` trong `e2e`, `tests`, `scripts` không ra gì [kiểm]) và test khớp ghi và đọc qua đường thật. Đã đưa vào 01 §6.2 bước 6.

**Phụ thuộc Supabase** (đo 25/11 trên mã `cc84241c`, `git grep`, không tính spec):

| Lớp | Số đo | Mức |
|---|---|---|
| Postgres và extension | `pgcrypto`, `unaccent`, `uuid-ossp`; 0 file migration dùng `vault`, `pg_net`, `supabase_functions` | Không |
| Truy vấn qua `supabase-js` | 79 file import `@supabase/`; ít nhất 895 `.from()` trên 88 bảng; 66 `.rpc()` trên 55 hàm (cận dưới vì grep một dòng) | Nặng nhất |
| Auth | 41 file dùng `getUser`, `getSession`, `signIn`; 7 file `auth.admin.*`; 28 file migration có `auth.uid()`, 11 có `auth.role()`, 7 có `auth.users`; 2 khóa ngoại vào `auth.users` | Nặng |
| Storage | 1 file (`ChecklistItem.tsx`); 0 migration tạo bucket | Nhẹ |
| Realtime, Edge function | 0 | Không |
| Công cụ | 27 trên 114 script npm gọi Supabase CLI hoặc `run-supabase-sql`; MCP `apply_migration` lên prod | Vừa |
| Hosting | Vercel (`vercel.json`, vùng `sin1`), Next.js 16 | Vừa |

Ba mức gỡ phụ thuộc [nhận định]: (1) tự chạy bộ Supabase self-host: nhanh nhất, gần như không sửa mã, nhưng vẫn phụ thuộc phần mềm Supabase; (2) Chặng 2 của 01 §6.4: Postgres + PostgREST + tài khoản tự quản + `StorageAdapter`, giữ nguyên các lời gọi truy vấn; (3) bỏ PostgREST và viết lại truy vấn như ops-web: nhiều tuần đến nhiều tháng, không chọn.

**Cloudflare** [nhận định, chưa kiểm tài liệu mới]: không chạy Postgres (D1 là SQLite); Hyperdrive chỉ là lớp đệm tới Postgres bên ngoài; R2 tương thích S3, hợp `StorageAdapter`. Mẫu ở ops-web: `apps/api/wrangler.toml` (Workers + Hyperdrive nối Neon + R2, công tắc `R2_MODE`). Chưa kiểm Next.js 16 trên Workers với 112 file dùng admin client.

**Commit chưa lên** [kiểm]: `integrate/2026-11` hơn `origin/integrate/2026-11` 21 commit và hơn `origin/main` (prod) 239 commit; 751 commit từ 10 đến 24/11. Nguyên nhân: luật «không tự push» (`CLAUDE.md`); `main` là production và `vercel.json` có `git.deploymentEnabled: true`; 12 file migration `20261119*` chưa áp prod; CI `db-dung.yml` chỉ chạy sau push. Cấu hình Vercel (đọc 25/11, chỉ đọc) [kiểm]: bốn biến `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN` dùng chung một bản ghi cho Production và Preview, nên mọi bản Preview chạy với khóa của prod. Mọi nhánh được push đều dựng Preview: có ít nhất 6 bản từ `integrate/2026-11` (17 đến 19/11) và ít nhất 3 bản từ nhánh dependabot (mới nhất 23/11). Preview chỉ mở được khi đăng nhập Vercel (`ssoProtection: all_except_custom_domains`). Production hiện chạy `main` `e908e7e0` (PR #131, 17/11). Đã xử lý 25/11: `SUPABASE_SERVICE_ROLE_KEY` chỉ còn Production, `SUPABASE_ACCESS_TOKEN` đã xóa khỏi Vercel (§6 D7). Sao lưu 25/11: `git bundle` đầy đủ nhánh và tag, 21 MiB, `git bundle verify` đạt, sha256 `4a80d31006b0d3dcb075972d9c8b545be54b9d14c3c0fa86b5e06e74ea499924`, ở `~/Documents/ksnk-backup-20261125/` (ngoài repo).

## 9. Nguồn đã gộp (2026-11-24)

Khôi phục bản cũ bằng lệnh `git show 2222a336:<đường dẫn>`.

| File cũ | Loại | Gộp vào |
|---|---|---|
| `HANDOFF_APPKSNK.md` | handoff | §4, §5 |
| `SO_NO_APPKSNK.md` | sổ nợ | §7 |
| `CAU_HOI_PO_APPKSNK.md` | câu hỏi PO | §6 |
| `docs/archive/bao-cao/BAO-CAO-TONG-HOP.md` | báo cáo | §8.3. Bản trước nữa: `git show 5618ae82:docs/archive/bao-cao/<tên>.md` |
| `.claude/plans/NHAT_KY_VONG_LAP.md` | nhật ký vòng (28 dòng, đều ngày 14/11) | Chỉ còn trong git history |
| `.claude/plans/*.md` (8 kế hoạch) và `docs/ux/ui-redesign-plan.md` | kế hoạch | [01 §8](01-tong-quan-yeu-cau-lo-trinh.md) |
| `BAO-CAO-DOI-CHIEU-NHSN2026.md` (ngoài git) | báo cáo | §8.2. Nguyên văn: đã chuyển 25/11 sang `~/Documents/ksnk-backup-20261125/tai-lieu-ngoai-git/` (không xóa) |
| `KE-HOACH-CAI-TO-TOAN-DIEN-2026-11-24.md` (ngoài git) | kế hoạch + khám nghiệm | 01 §6 và §8.1 của file này. Nguyên văn: đã chuyển 25/11 sang `~/Documents/ksnk-backup-20261125/tai-lieu-ngoai-git/` (không xóa) |
| `BAO-CAO-CAI-TO-2026-11-06.md`, `BAO-CAO-RA-SOAT-2026-11-05.md`, `HANDOFF.md` (nhánh cũ `chore/code-vs-ai-phase1`) | báo cáo, handoff | Đã gộp từ 18/11 (§8.3). Khôi phục: `git show chore/code-vs-ai-phase1:<tên>` |
