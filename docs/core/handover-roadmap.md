# Bàn giao & onboarding — KSNK BV103

> **Việc còn mở:** §5 dưới đây.  
> **SSOT schema:** [`implementation-mapping.md`](implementation-mapping.md)

## 1. Cấu trúc app (tóm tắt)

| Thư mục | Vai trò |
|---------|---------|
| `src/app/` | Route mỏng |
| `src/modules/` | DDD: `auth`, `dashboard`, `giam-sat-*`, `cssd-erp`, `quan-ly-cong-viec`, `quan-tri-he-thong` |
| `src/lib/` | RBAC, domain thuần, MDM gateway, validations |

## 2. Onboarding nhanh

```bash
cp .env.example .env.local
npm run trial:prep
npm run dev
```

Verify trước push: `npm run verify` (full) — xem [`lean-execution.md`](lean-execution.md).

## 3. Pilot DoD (một mảnh)

1. Ai dùng / khoa pilot  
2. 3 kịch bản tay  
3. Migration + RPC đã apply  
4. `npm run verify:engineering` (hoặc `verify` trước push)

## 4. Wiki & tài liệu

- Tổng hợp module: [`../wiki/entities.md`](../wiki/entities.md)  
- Đang dùng: [`implementation-mapping.md`](implementation-mapping.md) và [`../wiki/entities.md`](../wiki/entities.md).
- Chủ đề → một file: [`../ssot-map.md`](../ssot-map.md). Mục lục skill: [`skills-catalog.md`](skills-catalog.md).

## 5. Lộ trình: thang L0–L3 (PO duyệt 2026-10-24)

Một chủ đề một bản đang dùng ([`ssot-map.md`](../ssot-map.md)). Nhật ký các lát cũ (SEC, ACC, KD, HC, TB, NK-*, CS-*, DT, GS, QL…) đã lưu trong git log trước commit này; không chép lại ở đây.

**Thang sẵn sàng (mỗi module)**

| Mức | Nghĩa | Điều kiện đạt |
|---|---|---|
| L0 | Code chạy | `verify:engineering` pass |
| **L1** | **Đưa chạy thử** | Có người dùng đầu mối thật · nhập một phiếu < 60 giây · ≥ 3 kịch bản tay · thống kê khớp tính tay |
| L2 | Chạy ổn định | Cổng nghiệp vụ nguyên tử · RLS đọc theo phạm vi · đã apply prod |
| L3 | Tự động hóa | Rules engine, HIS/LIS, quét mã, import hàng loạt |

Mỗi module có 3 màn: **Nhập · Danh sách/lịch sử · Thống kê** (KPI, biểu đồ, bảng, xuất). Nghiệp vụ đặc thù thêm sau khi 3 màn chạy. Chỉ làm lát L2/L3 khi module đã đạt L1 và người dùng báo vướng.

**Luật dừng rà soát**

- Chỉ mở lát gia cố khi: (a) hỏng/lộ dữ liệu ở đường người dùng **đang dùng**, hoặc (b) người dùng thật báo lỗi.
- Không giao agent «quét» module chưa có người dùng; lỗi tìm được ghi một dòng vào backlog bên dưới.
- Tối đa 5 lát mở cùng lúc. Một agent ghi/lần.
- Câu hỏi PO gom một phiên/tuần, mỗi câu kèm phương án mặc định «nếu PO im».
- Apply prod theo lô mỗi tuần (PO duyệt), không lẻ từng lát.

**Hiện trạng module** (prod 2026-10-11: NKBV 1 phiếu · CSSD 10 chu trình thử · QLCV 0 việc · Đào tạo 1 lần thi)

| Module | Mức | Người đầu mối | Việc tới L1 | Đang chặn |
|---|---|---|---|---|
| VST + GSC + thống kê | L1 (đang dùng thật) · **Đạt có điều kiện** vận hành thử (2026-11-10) | Đã có | Đo thời gian nhập phiếu (2 lỗi Thấp của đợt 2026-11-10 đã sửa: báo riêng thiếu danh tính NV, báo thiếu Vị trí ngay ở client) | GS-1 RLS đọc cần ma trận «ai xem gì» (L2); e2e Playwright chưa chạy được (thiếu Chromium) |
| CSSD (+ sự cố) | L0, nhiều cổng L2 đã lên prod | Tổ CSSD: Nguyễn Thanh Bình (PO 2026-10-31) | K1–K5 ở SSOT 18 đã chạy tay qua UI trên DB local (Claude chạy thay tổ CSSD; PO chốt đạt 2026-11-01), chưa chạy trên prod/bộ Đóng gói thật; kho/hóa chất/BOM tạm nhập tay hoặc Excel | Người đầu mối; máy quét |
| NKBV | L0 | Chưa có | Ghi ca + danh sách + tỉ lệ; rules engine chỉ gợi ý, không chặn | HIS/LIS (L3); người đầu mối |
| QLCV | L0 | Nhóm KSNK | Tạo việc, giao, hạn, hoàn thành, xem theo người/khoa; kịch bản tay ≥ 3 | Câu QL-1 (quyền ghi chú, xóa cứng) |
| Đào tạo | L0 | Chưa có | Thi thử/thi thật + kết quả; kịch bản tay ≥ 3 | 3 câu DT-2 (thi thử dùng chung ngân hàng/lộ đáp án; nộp trễ > 30 giây vẫn «đạt») |

Thứ tự pilot theo khóa PO: CSSD → NKBV → QLCV → Đào tạo. QLCV/Đào tạo không cần phần cứng/HIS nên có thể chạy thử sớm hơn: **chờ PO xác nhận**.

**Đã lên prod (MCP):** K1, SEC-1, CS-ME, KD-1, CS-GATE, TB-1, HC-1, NK-AUTH, CSSD nhật ký chu kỳ + phiếu TK người/giờ + phương pháp theo Loại/cấu phần (2026-10-31, 8 migration `20261030*`), nhân sự mức quản lý chức vụ (`20261031010000`), 9 migration bù HC-C/D/E/F + nhóm hóa chất + QLCV D2/L1/L2/L3 (2026-11-10, `20261028090000` → `20261029150000`; đã đối chiếu 9 tên + đối tượng trên prod; **code prod `d147bda2` chưa khớp schema kho hóa chất cho tới khi deploy `main`**). **Chưa lên prod:** KD-4 (`20261021040000`, còn nợ khóa deadlock nhiều dòng + sổ ghi ngoài khóa).

**PO chốt 2026-10-24:** DT-2 nộp trễ > 30 giây = không đạt; thi thử ẩn đáp án đến khi nộp · QL-1 xóa mềm, ghi chú theo người tạo · NKBV đóng băng ở mức ghi ca + danh sách + tỉ lệ · kế hoạch 4 tuần: VST funnel/run chart → QLCV → CSSD tay + sửa Đào tạo → đo lại.

**QLCV (2026-10-25):** QL-1 đã chốt (xóa mềm, ghi chú theo người tạo); code xóa mềm chưa kiểm (`deleteCongViec` có ở `cong-viec-write.actions.ts`) · QL-A xong, commit `d258f6c0`: việc «Trả về làm lại» (TU_CHOI) giữ 100% nên nút «Lưu tiến độ» luôn khóa, nay cho nộp lại · Phát hiện: prod không thiếu migration QLCV (ghi theo kết luận của PO phiên này; chưa đối chiếu lại bằng `list_migrations` trong phiên này).

**Chờ PO (gom một phiên/tuần):** tên người đầu mối các module còn lại (CSSD đã có) · ma trận «ai xem gì» (GS-1) · QL-1 · DT-2 (3 câu) · KD-5 (lấy DDL `cssd_fact_kho_kiem_ke` từ prod hay bỏ) · V1 phạm vi vật tư · Plasma–cellulose · nguồn ngưỡng 85/70 và 90/85 · xóa phiên VST (đang `is_active=false`).

**Việc PO ngoài repo:** Supabase Auth (tắt tự đăng ký, xác nhận email, chặn mật khẩu rò rỉ, redirect URL) · `NEXT_PUBLIC_SITE_URL` + `<site>/login/reset-password` · `KSNK_BREAK_GLASS_EMAILS` tài khoản thật · CSP/X-Frame-Options/HSTS · rà phiếu RESET đang chờ trên prod.

**Đề xuất chờ PO duyệt (rà soát toàn diện 2026-11-10, chưa có hiệu lực):** Số đo: prod chỉ VST (3.613 phiên) + GSC (1.400 phiên) có dữ liệu thật; QLCV 0 việc, Đào tạo 1 lần thi, CSSD 10 chu trình thử, NKBV 1 sự kiện, đồ vải 0, trong khi các module này chiếm khoảng 120k/170k dòng `src`. Lệch đồng bộ: Vercel prod đang ở `d147bda2` (2026-11-02), `main` đi trước 46 commit; `vercel.json` tắt deploy theo git; prod DB đã có migration tới 2026-11-06 (gồm `ctyt_dovai_*`) nhưng thiếu 10 migration repo (`cssd_hc_c/d/e/f`, `cssd_hc_nhom_dm_hoa_chat`, `cssd_kd4_transfer_lock_by_id`, `qlcv_spawn_dinh_ky_catch_up`, `qlcv_nhan_vien_ksnk_de_xuat_create`, `qlcv_nhom_chuyen_mon`, `qlcv_dia_diem_nhieu_khoa`); checkout gốc đang ở nhánh `chore/code-vs-ai-phase1` có migration chưa commit `20261105150000_dao_tao_canonical_qbank_upgrade.sql`. Đề xuất: (T0) một dòng chảy `main` → Vercel tự deploy → migration một cửa + lệnh `sync:check` trong CI; (T1) mỗi lần một module tới L1 với người dùng thật, đề nghị QLCV → Đào tạo → CSSD → NKBV; (T2) nguồn nghiệp vụ = biểu mẫu KSNK.QT/BM của viện, mỗi module một trang đặc tả; (T3) gọn lệnh npm, rules, tài liệu trùng theo danh sách PO duyệt. Module `chat-thai-do-vai` chưa có trong lộ trình/ssot-map: chờ PO quyết giữ hay gác.

**Tuần 0 — một dòng chảy (PO duyệt 2026-11-10; T1–T3 ở đoạn trên vẫn chờ):** Xong ở local: lệnh `npm run sync:check` (prod, đọc token `.env.local`) và `sync:check:local` (`scripts/sync-check.mjs`: so tên migration repo với DB + SHA Production với `origin/main`; exit 1 khi lệch); chế độ `--linked` chưa chạy thử. **Bước (1) XONG 2026-11-10** (9/9 apply qua MCP, đối chiếu đủ). **Bước (2)+(3a) gộp, PO chọn 2026-11-10:** không có công cụ deploy tay (MCP `vercel` `needs_auth`) → PR `ksnkbv103-droid/ksnk_bv103_V2#125` bật `git.deploymentEnabled`; merge = Vercel tự build Production từ `main`. **XONG 2026-11-10:** #125 merge (`86f5b55b`), Vercel tự build, Production = `origin/main` (lệch 0 commit). Chưa test tay trên prod. **(3b) một nửa, 2026-11-10:** `sync:check` (script + npm) đã commit local, đếm cả tên migration trùng (repo và prod cùng có 5 tên × 2 bản). Bước CI **chưa thêm — No-go** (`security-auditor`, mức Cao): `SUPABASE_ACCESS_TOKEN` là PAT toàn tài khoản, đặt trong job có `npm ci` + script của nhánh PR thì lộ được qua `$GITHUB_ENV`/ghi đè file. Hướng sửa chờ PO chọn: role Postgres chỉ `SELECT` trên `supabase_migrations.schema_migrations` (SQL lên prod = cổng PO) + secret DB URL của role đó + job riêng không `npm ci`; job đó phải là required check của `main` thì mới chặn được merge. Trước khi có: chạy `npm run sync:check` tay trước mỗi merge có migration. **PO chọn role chỉ đọc (2026-11-10):** migration `20261110100000_ci_migration_reader_role` đã apply prod (role `ci_migration_reader`, NOLOGIN, chỉ `SELECT (version, name)`); job `sync-check` trong `ci.yml` (psql trước checkout, không `npm ci`, thiếu secret `SYNC_CHECK_DB_URL` → SKIP) đã merge qua PR `ksnkbv103-droid/ksnk_bv103_V2#126` (`11515851`), Production = `origin/main` (lệch 0); job hiện SKIP vì chưa có secret; reviewer vòng 2: 0 Critical/High. `main` chưa có branch protection → phải bật trước khi đặt required check. **CHẶN — chưa được bật login cho role:** trên prod schema `public` còn `CREATE` cho PUBLIC (`=UC/postgres`; local không có), nên role này (và mọi role đăng nhập SQL trực tiếp) tạo được bảng/hàm trong `public`. Cần PO duyệt migration `revoke create on schema public from public` lên prod trước (PO hoãn 2026-11-10; **2026-11-11 PO cho viết:** file `20261111090000_revoke_public_create_on_schema_public.sql` đã viết + review `review-bv103`/`security-auditor` 0 Critical/High; đo prod: không object nào trong `public` thuộc role lạ, chỉ `cli_login_postgres` là thành viên `postgres`; CHƯA apply prod, chờ PO duyệt; hoàn tác `grant create on schema public to public`; role giữ NOLOGIN, cổng CI ở trạng thái SKIP). Sau đó PO tự: `alter role ci_migration_reader with login password '…'`, đặt secret `SYNC_CHECK_DB_URL` (pooler `ap-southeast-1`, user `ci_migration_reader.<ref>`, `sslmode=require`), đặt check «Sync check — migration repo vs prod» làm required của `main`. Thứ tự bắt buộc còn lại, mỗi bước một cổng PO: (1) apply prod 9 migration bù theo thứ tự timestamp `20261028090000` → `20261029150000` (không gồm KD-4; không file nào gọi `fn_cssd_kho_lock`; không có DROP/DELETE, chỉ UPDATE backfill ở `hc_c/d/e`, `hc_nhom`, `qlcv_dia_diem_nhieu_khoa`); (2) push + deploy `main`; (3) sau đó mới bật `git.deploymentEnabled` trong `vercel.json` và thêm `sync:check --strict` vào CI (cần secret `SUPABASE_ACCESS_TOKEN`). **Không deploy `main` trước bước (1):** code `main` đọc `dia_diem_khoa_ids`, `nhom_chuyen_mon_id`, `cssd_dm_hoa_chat_nhom` chưa có trên prod. DB local cũng lệch: thiếu 9 migration (`cssd_loai_*` 5 file, `cssd_cong_may_theo_cau_phan`, `nhan_su_chuc_vu_muc_quan_ly`, `cssd_me_ghi_test_sau_qc_khong_dat`, `ctyt_dovai_nhan_vien_ksnk_view`) → chạy `mdm:migrate:local`. Dọn (chờ PO duyệt xóa): 8 nhánh local + 4 nhánh remote đã gộp hết vào `main`, 7 worktree tương ứng, 10 stash (cũ nhất 2026-05-19); giữ lại để PO quyết: `claude/idea-to-product-steps-84233f` (đi trước 11 commit), `claude/monitoring-module-review-3384e5` (7), `claude/system-structure-confusion-5676d2` (1), `chore/code-vs-ai-phase1` (1 + file chưa commit ở checkout gốc, gồm migration `20261105150000_dao_tao_canonical_qbank_upgrade.sql`).

**Backlog gia cố (đóng băng, chỉ mở khi đủ luật dừng):** NS-MUC (form Danh mục chọn `muc_quan_ly` của chức vụ: cần tạo lại view `mdm_dm_chuc_vu` kèm metadata + sửa hook/modal; hiện mức chỉ seed bằng migration `20261031010000`) · NK-TZ2 («hôm nay» UTC 5 chỗ) · NK-SCOPE nợ lọc phạm vi + RLS DB · N1 phần còn lại (thay 44 `any` ở NKBV; ~15 file NKBV 600–1.400 dòng) · KD-2 form tự đổi PP · KD-3 chạy thử import · KD-4 nợ a–f · K3/QL-1/GS-1 phần RLS · CS-GATE nợ (`recall-receive` chèn+tắt, map lỗi trigger) · D1/Q1 spec + e2e · Zod nhập lô · H1 gọn 110 lệnh npm → ~10 · đo lượt xem báo cáo · sao lưu prod định kỳ.

**Ranh giới module + N1 (PO 2026-11-10):** giữ tách `cssd-su-co` và `cssd-erp`; ba tầng một chiều: lõi CSSD (`cssd-erp/types`, `shared`, `workflow/domain`) ← `cssd-su-co` ← phần còn lại của `cssd-erp`. Cổng `npm run guard:boundaries` (nối vào `verify:engineering`, baseline `scripts/module-boundaries.baseline.json`, chỉ được giảm; `--prune` bỏ dòng hết vi phạm, `--init` cần PO). Baseline còn: `lib → modules` 58 · lõi → `cssd-su-co` 2 · `cssd-su-co` → ngoài lõi 5 · `.from("…")` trong UI 1. Lý do giữ: xung đột quy ước entrypoint với luật ESLint, lỗ hổng lint với dynamic import, quyền sở hữu phụ thuộc lõi → sự cố (cảnh báo đỏ). N1 đã làm: `NkbvSyndromeIwpPanel` 1.745→258 và `NkbvBaMultiTimelineWorkspace` 2.151→475 dòng, di chuyển nguyên văn, đối chiếu ảnh chụp trước/sau. Còn lớn: `useNkbvIwpVerdicts` 685, `NkbvSyndromeIwpGrid` 752 dòng.

**Kiểm toán tổng thể 2026-11-10** (chỉ đọc mã, 12 báo cáo vùng hẹp + 1 vòng phản biện; chưa chạy test, chưa kiểm prod, chưa sửa gì). Báo cáo: https://claude.ai/artifact/3ZrcThLmU4PpXfhFgZ1jr2. Lộ trình đề xuất, **chờ PO duyệt**:

1. Chặn rủi ro: kiểm cờ bắt đổi mật khẩu trong `verifyPermission` (`src/proxy.ts:138-144` vượt được) · không apply `20261105150000_dao_tao_canonical_qbank_upgrade.sql` (TRUNCATE CASCADE) và `scripts/sql/seed-qlcv-dinh-ky-bv103.sql` (DELETE theo tiêu đề) · chạy thử khôi phục sao lưu, ghi vào playbook · gom lỗi prod · kiểm formula injection ở `src/hooks/useExcelExport.ts`.
2. Nhập liệu VST/GSC: lưu nháp tự động · cảnh báo rời trang · báo trước mốc 30 phút · ngưỡng hoàn thành bảng kiểm GSC · gom luật VST một nơi (trần người 3 vs 8).
3. Đơn giản nền: loại `.claude/worktrees` khỏi tsconfig · rút script (H1) · lint chặn `src/lib` → `src/modules` (41 file) · 5 thành phần ui chuẩn · một bảng mục tiêu đo được + một thứ tự ưu tiên.
4. Mở từng module qua cổng «người thật chạy kịch bản tay»: CSSD chỉ luồng mẻ · NKBV che dữ liệu định danh trước ca thật · QLCV kiểm pg_cron prod · Đào tạo duyệt 6.000 câu.

**Giai đoạn 1: PO duyệt 2026-11-10, tiến độ** (nhánh `chore/code-vs-ai-phase1`, chưa push):

- Lát 1 cổng đổi mật khẩu: cờ `must_change_password` kiểm ở mọi cổng `verify*`, `ensureRbacAdmin`, `getActorRoleNames`, `hasRBACAdminSupervisionBypass` (kể cả break-glass); nhánh prefetch ở `src/proxy.ts` chỉ còn cho GET. Spec `src/lib/server-permission.spec.ts`. Đã qua một vòng `security-auditor`. Chưa test tay với tài khoản có cờ.
- Lát 2 xuất file: `rowsToCsv` (QLCV) vô hiệu hóa công thức, commit `4177f102`. Các chỗ xuất `.xlsx` không cần sửa: exceljs ghi chuỗi thành ô văn bản (`src/lib/analytics/excel-string-cell.spec.ts`).
- Lát 3: hai file SQL nguy hiểm để nguyên, không apply, không commit; chờ PO quyết số phận.
- Lát 4 sao lưu: **chưa làm**. Connector Supabase cần PO ủy quyền lại; khôi phục thử là việc của PO.
- Lát 5 gom lỗi: `src/instrumentation.ts` ghi một dòng JSON `"tag":"ksnk_server_error"` cho mỗi lỗi server, commit `25ee2d1d`. Chưa xem log trên Vercel.
- Nợ từ vòng rà lát 1 (chưa xếp mức, chưa kiểm): người có cờ vẫn gọi thẳng PostgREST theo RLS · prefetch GET trả trước khi kiểm cờ · tài khoản cũ chỉ có cờ ở `user_metadata` tự gỡ được (cần đếm trên prod) · `login/reset-password/page.tsx:48` chỉ xóa cờ ở `user_metadata` nên người đặt lại qua email vẫn bị đưa sang trang đổi mật khẩu.

**Điều phối các chat (chat tổng, 2026-11-11).** Nguồn: `git worktree list`, schema_migrations local, `list_migrations` prod (chỉ đọc). Nhánh còn việc chưa vào main: UI `ui-design-minimal-professional` (75 commit) · UI v2 `infection-control-project-eval` (23) · quản trị `project-structure-admin-module` (24, đang chạy) · CSSD bộ tổng `surgical-instruments-module-review` (17, chờ PO duyệt thứ tự apply prod) · CSSD cấp phát `idea-to-product-steps` (11) · CSSD sẵn sàng `module-deployment-readiness-process` (8 + 7 file chưa commit) · sự cố `su-co-slice-ad-fixes` (6, đang chạy) · khu vực giám sát `monitoring-objects-areas` (5) · revoke CREATE `ksnk-bv103-comprehensive-review` (3) · đào tạo `training-question-formats` (1) · kế hoạch giám sát `monitoring-module-review` (7, chậm 82 commit, `20261101010000` chưa lên prod). Chặn gộp: (1) hai nhánh UI chung 220 file, chỉ gộp được một; (2) trùng version migration `20261110110000`, `20261110120000`, `20261111100000`, `20261111110000` (quản trị vs CSSD bộ tổng/khu vực), `20261110100000` (ar1) trùng `ci_migration_reader_role` trên DB local; prod chưa có version nào trong số này nên đánh số lại khi gộp. DB local dùng chung: việc chạm DB local xếp hàng một chat một lúc. Worktree có thay đổi chưa commit (không lưu trữ): `module-deployment-readiness-process`, `supabase-env-vars-missing-c14eda`, `incident-management-review-7df243`. Phiên ở `KSNK_BENH_VIEN_103` là thư mục khác, ngoài phạm vi.

**Quyết định PO 2026-11-11 và phân việc.** UI chính = `ui-design-minimal-professional` (mới nhất). UI v2 đã xóa ở local, bản lưu ở tag local `backup/ui-v2-infection-control-eval` (`ed08dd0b`, còn trên origin; xóa trên remote cần PO duyệt riêng). Chat UI lấy QLCV `3904523a`+`37b86b0b` và tự chọn trong 13 commit sàn chữ 12px của v2. Phân việc theo chức năng:
- UI → chat giao diện (không chạm DB).
- Hàng đợi DB local, một chat một lúc: sự cố → quản trị (đánh số lại `ar*` sang `202611111501xx`) → CSSD sẵn sàng (Plasma = ETO, mẻ ETO B07.SET.03-KCN) → CSSD bộ tổng (S4b, review độc lập) → CSSD cấp phát.
- Chờ PO: thứ tự apply prod CSSD bộ tổng, kế hoạch lên prod khu vực giám sát, số phận `monitoring-module-review`.

Nợ VST lấy từ HANDOFF của UI v2 (UAT 2026-11-10 :3001):
- Khoa GV `allowed_khu_vucs=["KV_CHUNG"]` vẫn hiện «Phòng hồi tỉnh», server từ chối khi lưu.
- Chưa có nhãn «chưa đủ mẫu» n<20 ở bảng khoa.
- 102 s là thời gian đo bằng công cụ tự động, không phải thời gian người; mục tiêu < 60 s cần PO bấm giờ tay.

**Đánh giá sẵn sàng vận hành thử (PO yêu cầu 2026-11-10, kế hoạch chờ duyệt).** PO lệnh rà mọi module trước khi đưa người dùng thử, thay luật dừng rà soát cho đợt này. Mỗi module một phiên, theo thứ tự VST/GSC + thống kê → CSSD → NKBV → QLCV → Đào tạo. Mỗi module 5 bước: (1) chạy spec + e2e có sẵn (`e2e/`); (2) Claude chạy tay ≥ 5 kịch bản qua UI trên DB local (nhập, sửa, xóa, phân quyền sai vai trò, thống kê khớp tính tay); (3) đối chiếu prod chỉ đọc: migration repo so với prod, advisors bảo mật; (4) sửa lỗi Nghiêm trọng/Cao chặn chạy thử, verify, commit theo lát; (5) kết luận «Đạt / Đạt có điều kiện / Chưa» kèm danh sách lỗi còn lại, ghi vào bảng Hiện trạng module. Trạng thái (2026-11-10): module 1 VST/GSC xong bước 1 và bước 3 (đối chiếu prod, chỉ đọc); bước 2 xong cùng ngày (6/6 kịch bản đạt, xem dưới), bước 4 không có lỗi Nghiêm trọng/Cao nên không sửa mã, bước 5 kết luận **Đạt có điều kiện**. Bước 2 trên DB local qua browser pane (ADMIN), không ghi prod: KB1 nhập phiên VST, rửa/chà ≤2 thời điểm, bỏ sót = 1, quá trần giữ mốc mới nhất không toast, có dòng mới ở `gstt_fact_vst_sessions` + `gstt_fact_vst`; KB2 sửa phiên đạt; KB3 xóa phiên → `is_active=f`, `deleted_at` có giá trị, `ly_do_xoa` ghi, 3 dòng `gstt_fact_vst` còn nguyên (xóa mềm đúng khóa PO); KB4 GSC bảng kiểm VSTM 19 tiêu chí (17 đạt, 2 không đạt) → `tong_diem=89.47`, `results_jsonb` 19 phần tử, `loai_giam_sat=TUAN_THU`; KB5 tài khoản vai trò KHÁCH thống kê (nv.test2 tạm đổi vai trò, đã khôi phục TO_TRUONG_CSSD_TEST) vào `/giam-sat-chung/tuan-thu`, `/giam-sat`, `/lich-su/vst`, `/quan-tri-he-thong` đều 307 về `/thong-ke/vst`, `/thong-ke/vst` và `/thong-ke/gsc` 200 (chặn ở tầng route; tầng action ghi chưa chạy riêng); KB6 kỳ 2026-09-01→2026-11-10 khớp SQL tính từ bảng fact: GSC 219 phiên · 2878 tiêu chí áp dụng · 289 vi phạm · 89.96% · 15 khoa; VST 264 phiên · 1806 cơ hội · 1587 đạt · 87.9% · 40 khoa, từng thời điểm WHO khớp (sau tiếp xúc NB 718/773). Lệch/ghi chú: thông báo khi thiếu danh tính NV gây hiểu nhầm (Thấp); lần lưu đầu thiếu Vị trí giám sát, server trả lỗi nhưng không thấy toast kịp (Thấp, chưa xác minh); `dev-local` cần mật khẩu seed riêng cho nv.test2 (đặt lại bằng SQL local). Bước 1: vitest 52 file / 293 test pass; e2e 8/8 không chạy được vì máy thiếu Chromium Playwright (lỗi môi trường, chưa phải lỗi mã). Bước 3 prod `cvzwslpxwgqiugzzhqej`: mọi migration repo đã áp theo tên, trừ `20261105150000_dao_tao_canonical_qbank_upgrade` (TRUNCATE, chưa áp, giữ untracked, không được áp); prod có thêm `ci_migration_reader_role` (20261109230005) mà repo chưa có file. Dữ liệu thật: `gstt_fact_vst_sessions` 3613, `gstt_fact_vst` 33255, `gstt_fact_chung_sessions` 1400, `dao_tao_cau_hoi` 787. Advisors: `rpc_gsc_checklist_detail` và `rpc_gsc_compare_matrices` là SECURITY DEFINER nhưng đã gọi `fn_require_gstt_analytics_access('GIAM_SAT_CHUNG')` nên không phải lỗi; `v_mdm_nhan_su_picker` chỉ lộ mã NV, họ tên, khoa của người đang hoạt động cho `authenticated` (anon không đọc được), mức Thấp. Nợ chuyển sang module CSSD: `rpc_cssd_me_ghi_test`, `rpc_cssd_me_ket_thuc_nap`, `rpc_cssd_me_ket_thuc_tiet_khuan` nhận `p_actor_user_id` từ người gọi và không kiểm quyền trong hàm; `rpc_cssd_nhat_ky_ghi` không kiểm quyền. Sao lưu prod (lát 4) vẫn chưa kiểm được qua connector, PO xem ở dashboard Supabase. Lát 4 sao lưu làm cùng bước (3) của module đầu: connector Supabase của claude.ai đã nối được prod `ksnk-bv103-prod` (chỉ connector trong `.mcp.json` cần đăng nhập).

Câu hỏi PO thêm từ kiểm toán: phạm vi đọc VST/GSC mặc định toàn viện (`gsc-read-scope.ts:23,47`) · thống kê cho mạng lưới/khách xem mọi khoa · số phận migration TRUNCATE Đào tạo · ngưỡng hoàn thành GSC · NKBV thiếu ngày = «không có ca» hay «chưa đủ dữ liệu».

Model: Haiku cho đọc/soát (UAT, explore-module, db-verify) · Sonnet cho sửa code · Opus chỉ khi debug hoặc kiến trúc khó.

File SQL repo: `supabase/migrations/20261008221231_vst_valid_opp_moment_cap.sql`. Không đổi tên cho khớp timestamp prod.
