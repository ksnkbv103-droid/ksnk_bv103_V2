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
| VST + GSC + thống kê | L1 (đang dùng thật) | Đã có | UAT tay form VST (≤2 / ≤1); nhãn «chưa đủ mẫu» n<20 ở bảng khoa; đo thời gian nhập phiếu | GS-1 RLS đọc cần ma trận «ai xem gì» (L2) |
| CSSD (+ sự cố) | L0, nhiều cổng L2 đã lên prod | Tổ CSSD: Nguyễn Thanh Bình (PO 2026-10-31) | K1–K5 ở SSOT 18 đã chạy tay qua UI trên DB local (Claude chạy thay tổ CSSD; PO chốt đạt 2026-11-01), chưa chạy trên prod/bộ Đóng gói thật; kho/hóa chất/BOM tạm nhập tay hoặc Excel | Người đầu mối; máy quét |
| NKBV | L0 | Chưa có | Ghi ca + danh sách + tỉ lệ; rules engine chỉ gợi ý, không chặn | HIS/LIS (L3); người đầu mối |
| QLCV | L0 | Nhóm KSNK | Tạo việc, giao, hạn, hoàn thành, xem theo người/khoa; kịch bản tay ≥ 3 | Câu QL-1 (quyền ghi chú, xóa cứng) |
| Đào tạo | L0 | Chưa có | Thi thử/thi thật + kết quả; kịch bản tay ≥ 3 | 3 câu DT-2 (thi thử dùng chung ngân hàng/lộ đáp án; nộp trễ > 30 giây vẫn «đạt») |

Thứ tự pilot theo khóa PO: CSSD → NKBV → QLCV → Đào tạo. QLCV/Đào tạo không cần phần cứng/HIS nên có thể chạy thử sớm hơn: **chờ PO xác nhận**.

**Đã lên prod (MCP):** K1, SEC-1, CS-ME, KD-1, CS-GATE, TB-1, HC-1, NK-AUTH, CSSD nhật ký chu kỳ + phiếu TK người/giờ + phương pháp theo Loại/cấu phần (2026-10-31, 8 migration `20261030*`), nhân sự mức quản lý chức vụ (`20261031010000`), 9 migration bù HC-C/D/E/F + nhóm hóa chất + QLCV D2/L1/L2/L3 (2026-11-10, `20261028090000` → `20261029150000`; đã đối chiếu 9 tên + đối tượng trên prod; **code prod `d147bda2` chưa khớp schema kho hóa chất cho tới khi deploy `main`**). **Chưa lên prod:** KD-4 (`20261021040000`, còn nợ khóa deadlock nhiều dòng + sổ ghi ngoài khóa).

**PO chốt 2026-10-24:** DT-2 nộp trễ > 30 giây = không đạt; thi thử ẩn đáp án đến khi nộp · QL-1 xóa mềm, ghi chú theo người tạo · NKBV đóng băng ở mức ghi ca + danh sách + tỉ lệ · kế hoạch 4 tuần: VST funnel/run chart → QLCV → CSSD tay + sửa Đào tạo → đo lại.

**QLCV (2026-10-25):** QL-1 đã chốt (xóa mềm, ghi chú theo người tạo); code xóa mềm chưa kiểm (`deleteCongViec` có ở `cong-viec-write.actions.ts`) · QL-A xong, commit `d258f6c0`: việc «Trả về làm lại» (TU_CHOI) giữ 100% nên nút «Lưu tiến độ» luôn khóa, nay cho nộp lại · Phát hiện: prod không thiếu migration QLCV (ghi theo kết luận của PO phiên này; chưa đối chiếu lại bằng `list_migrations` trong phiên này).

**Tổng duyệt trên local (PO duyệt 2026-11-10):** trước khi giao người dùng thật, Claude chạy kịch bản qua UI trên DB local (cổng 3002 từ worktree này: `SUPABASE_PROJECT_ID=ksnk_bv103` + env từ `supabase status -o env`; cổng 3001 của `dev:local` có thể đang chạy code worktree khác). Không thay cổng G1/G2: thời gian nhập, phán đoán nghiệp vụ, phần cứng vẫn cần người thật. **Dữ liệu thử: tiền tố `UAT-` ở mã/tiêu đề**, dọn bằng `node scripts/uat-cleanup.mjs` (mặc định chỉ liệt kê, `--apply` mới xóa, chỉ local; thêm bảng vào `TARGETS` khi module khác có dữ liệu thử). Thứ tự: QLCV → Đào tạo → VST/GSC → CSSD → NKBV. Đã làm: DB local đủ migration repo (`sync:check:local` không thiếu; còn 1 tên chỉ có ở nhánh `claude/idea-to-product-steps-84233f`: `20261109100000_cssd_loai_bao_goi_mac_dinh_tach_eo`). **QLCV, lượt 1:** tạo việc `UAT-QLCV-01` qua UI đạt. Ghi nhận (chưa sửa): (a) vào trang, bộ lọc mặc định «Của tôi» → admin thấy «Số việc 0 / Chưa có công việc phù hợp» dù chip toàn viện «Cần làm 7»; (b) «Số việc 7» nhưng bảng 8 dòng, «% hoàn thành» tính theo 8, «% quá hạn» theo 7 — mẫu số không thống nhất; (c) `deleteCongViec` xóa cứng chỉ đề xuất/phiếu trống, phiếu đã làm dùng Hủy (`DA_HUY`) — lệch chữ «xóa mềm» của QL-1, không mất dữ liệu đã làm. Còn dở: luồng giao → làm → nộp → duyệt, quyền theo vai (NV_TEST01), việc định kỳ spawn, đối chiếu thống kê tính tay.

**QLCV, lượt 2 (2026-11-10, local):** luồng `UAT-QLCV-01` giao NV_TEST01 → cập nhật 50% → «Báo hoàn thành» (`CHO_DUYET`, 100%) → ADMIN «Nghiệm thu và Đóng» có ghi kết quả (`HOAN_THANH`) đạt; nhật ký ghi đủ từng bước; NV_TEST01 chỉ thấy «Chờ nghiệm thu», không có nút duyệt (đúng quyền). Ghi nhận (chưa sửa): (d) «Chờ tôi nghiệm thu» chỉ đếm việc mình là người giao — ADMIN khác chỉ duyệt được qua «Tất cả»; (e) tài khoản seed `ADMIN01` ở local không dùng mật khẩu seed, muốn thử vai ADMIN phải tạm gán vai cho tài khoản thử rồi gỡ. Lượt 2b: `UAT-QLCV-02` — checklist thêm bằng nút «Thêm» (Enter không thêm), tick hết tự lên 100% + `CHO_DUYET`; ADMIN «Yêu cầu làm lại» bắt buộc lý do → `TU_CHOI` đạt; (f) sau TU_CHOI vẫn 100% và checklist còn tick (khớp QL-A: cho nộp lại ngay, PO quyết có muốn bỏ tick không). Định kỳ: mẫu `UAT-DINHKY-01` (DAILY) → spawn 1 việc `DINH_KY` `DANG_LAM` có `dinh_ky_mau_id`, chạy lần 2 = 0 (không trùng) đạt; lưu ý lần chạy đầu cũng sinh 3 việc từ mẫu cũ có sẵn ở DB local. Thống kê: chip «Cần làm» 11, «Quá hạn» 6 khớp đếm tay từ DB; ô «Số việc» ở bộ lọc «Của tôi» cho NV_TEST02 = 0 (đúng vì không có việc của họ). Chưa đối chiếu «% hoàn thành» theo kỳ. Dọn: `node scripts/uat-cleanup.mjs --apply`; quyền ADMIN tạm của NV_TEST02 đã gỡ. **Xử lý lỗi lượt 2:** (a) ĐÃ SỬA — `QlcvGateStats.tsx`: «Của tôi» rỗng và không có việc chờ duyệt thì tự chuyển «Tất cả» (kiểm trên :3002); (b) ĐÃ SỬA — nhãn «Số việc» đổi «Việc mở» + chú giải công thức (mẫu số theo N-QLCV-7, vốn đúng thiết kế, chỉ nhãn gây hiểu nhầm); (d) KHÔNG PHẢI LỖI — `cho_toi` cố ý theo «actor lens» (migration 20260928012930), ADMIN duyệt qua «Tất cả»; (f) KHÔNG PHẢI LỖI — QL-A cố ý giữ 100% để nộp lại; (g) KHÔNG TÁI HIỆN — code đã có Enter (`QlcvChecklistPanel.tsx:122`), do cách gõ của công cụ test; (c) CÂU HỎI PO — `deleteCongViec` xóa cứng chỉ cho phiếu đề xuất/trống (QLCV-07), hộp thoại ghi đúng «xóa vĩnh viễn»; QL-1 «xóa mềm» cần PO chốt áp dụng cho phiếu đã có tiến độ hay không. Verify: tsc 0 lỗi, 27 file/191 test QLCV pass; `npm run build` không chạy được trong worktree vì thiếu `.env.local` (không do code).

**CSSD (dụng cụ phẫu thuật), lượt 1 (2026-11-10, local :3002):** `test:cssd` 2331 pass, tsc 0 lỗi. Quét/«Xử lý» ở Tiếp nhận báo toast «column cssd_dm_bo_dung_cu.tong_so_luong_dung_cu does not exist» — **ĐÃ SỬA** `cssd-bo-bootstrap.ts` (hồi quy 2026-11-06: đọc bảng gốc thay vì view `v_cssd_bo_dung_cu_summary`; mọi lần tiếp nhận bộ chưa có chu trình đều lỗi, cả prod nếu deploy). Bộ mẹ đã tách bị bootstrap tạo chu trình rỗng trước khi bị chặn — **ĐÃ SỬA** (chặn bộ mẹ trước khi tạo; dòng rỗng UAT đã xóa ở local). Thêm 2 spec hồi quy (mock theo tên bảng; spec cũ mock mọi bảng nên không bắt được lỗi cột). Ghi nhận (chưa sửa): hàng chờ «Tiếp nhận» liệt kê mã bộ mẹ (vd. B01.SET.03) nhưng «Xử lý» luôn bị từ chối — cần PO/ tổ CSSD xem hàng chờ nên hiện bộ thành phần -CN/-KCN.
**CSSD lượt 2 (2026-11-10, local :3002):** bộ thành phần `B01.SET.03-CN` chạy trọn Tiếp nhận → Làm sạch → Kiểm bộ → Đóng gói → mẻ hơi nước `TKHN5-101126-1` (nạp, tiệt khuẩn, Nhả mẻ QC đạt → `HOAN_THANH`, `ket_qua_test=true`) → Cấp phát (`thoi_gian_cap_phat` ghi, chu trình ở trạm CAP_PHAT, còn bước «Hoàn chu kỳ»); mỗi chặng đối chiếu DB, không lỗi mới. Ghi nhận (không phải lỗi code): cả 6 máy hơi nước đang `HOLD_QC` do UAT Bowie-Dick cũ trượt → không máy nào hiện trong ô chọn máy; local đã đặt `TKHN_5` về READY + ghi BD Đạt để chạy (prod cần Bowie-Dick Đạt trong ngày theo thiết kế). Hàng chờ Cấp phát tải chậm nửa giây nên lần đọc đầu hiện (0). Ghi nhận (chưa quyết): `loai_bao_goi_id` NULL sau Đóng gói (chưa rõ bắt buộc hay không, SSOT chưa nêu). Bộ `B01.SET.03-KCN` chạy được Tiếp nhận → Đóng gói (quét phải chọn đúng tab trạm trước), nhưng nạp vào mẻ ETO bị chặn đúng luật: «Bộ chịu nhiệt cao — chỉ nạp máy hơi nước» vì bộ chỉ chứa 1 tấm lưới silicone `is_chiu_nhiet=true`/`STEAM_134`. **Câu hỏi PO/CSSD (SSOT im):** hầu hết bộ `-KCN` trong seed (vd B01.SET.01…09, B06.*, B09.*) chỉ chứa dụng cụ chịu nhiệt nên không bộ nào nạp được ETO/Plasma; chỉ B02.SET.05/06/21/22-KCN, B06.SET.06-KCN, B07.SET.03-KCN có dụng cụ `PLASMA`, nhưng chỉ B07.SET.03-KCN qua cổng S1 (có dòng `is_chiu_nhiet=false`); các bộ còn lại, ví dụ B02.SET.05-KCN, có dòng chỉ định PLASMA mà cờ `is_chiu_nhiet=true` nên vẫn bị chặn nạp Plasma. **Mẻ Plasma đã chạy được bằng B07.SET.03-KCN:** Tiếp nhận → Làm sạch → Kiểm bộ → Đóng gói → nạp mẻ PLASMA → Kết thúc nạp → Bắt đầu/Kết thúc tiệt khuẩn → Nhả mẻ (BI âm) → Cấp phát (DB `CAP_PHAT`, phiếu hiện mã mẻ). Quét theo trạm: tab «Xem hàng chờ <trạm>» đang chọn quyết định trạm của lần quét. Gợi ý Spaulding ở màn nạp ghi «Không có dụng cụ trong bộ… Hấp hơi nước 134°C» cho bộ -KCN mặc dù bộ có dụng cụ không chịu nhiệt (chưa sửa, cần PO xác nhận cách tính gợi ý). Cần quyết định: sửa phân loại dụng cụ hay bỏ bộ -KCN rỗng nghĩa. Chưa chạy: mẻ ETO đến Nhả (chưa có bộ -KCN qua cổng S1 cho ETO), bảo trì máy, kho hóa chất, bước «Hoàn chu kỳ».

**Chờ PO (gom một phiên/tuần):** tên người đầu mối các module còn lại (CSSD đã có) · ma trận «ai xem gì» (GS-1) · QL-1 · DT-2 (3 câu) · KD-5 (lấy DDL `cssd_fact_kho_kiem_ke` từ prod hay bỏ) · V1 phạm vi vật tư · Plasma–cellulose · nguồn ngưỡng 85/70 và 90/85 · xóa phiên VST (đang `is_active=false`).

**Việc PO ngoài repo:** Supabase Auth (tắt tự đăng ký, xác nhận email, chặn mật khẩu rò rỉ, redirect URL) · `NEXT_PUBLIC_SITE_URL` + `<site>/login/reset-password` · `KSNK_BREAK_GLASS_EMAILS` tài khoản thật · CSP/X-Frame-Options/HSTS · rà phiếu RESET đang chờ trên prod.

**Đề xuất chờ PO duyệt (rà soát toàn diện 2026-11-10, chưa có hiệu lực):** Số đo: prod chỉ VST (3.613 phiên) + GSC (1.400 phiên) có dữ liệu thật; QLCV 0 việc, Đào tạo 1 lần thi, CSSD 10 chu trình thử, NKBV 1 sự kiện, đồ vải 0, trong khi các module này chiếm khoảng 120k/170k dòng `src`. Lệch đồng bộ: Vercel prod đang ở `d147bda2` (2026-11-02), `main` đi trước 46 commit; `vercel.json` tắt deploy theo git; prod DB đã có migration tới 2026-11-06 (gồm `ctyt_dovai_*`) nhưng thiếu 10 migration repo (`cssd_hc_c/d/e/f`, `cssd_hc_nhom_dm_hoa_chat`, `cssd_kd4_transfer_lock_by_id`, `qlcv_spawn_dinh_ky_catch_up`, `qlcv_nhan_vien_ksnk_de_xuat_create`, `qlcv_nhom_chuyen_mon`, `qlcv_dia_diem_nhieu_khoa`); checkout gốc đang ở nhánh `chore/code-vs-ai-phase1` có migration chưa commit `20261105150000_dao_tao_canonical_qbank_upgrade.sql`. Đề xuất: (T0) một dòng chảy `main` → Vercel tự deploy → migration một cửa + lệnh `sync:check` trong CI; (T1) mỗi lần một module tới L1 với người dùng thật, đề nghị QLCV → Đào tạo → CSSD → NKBV; (T2) nguồn nghiệp vụ = biểu mẫu KSNK.QT/BM của viện, mỗi module một trang đặc tả; (T3) gọn lệnh npm, rules, tài liệu trùng theo danh sách PO duyệt. Module `chat-thai-do-vai` chưa có trong lộ trình/ssot-map: chờ PO quyết giữ hay gác.

**Tuần 0 — một dòng chảy (PO duyệt 2026-11-10; T1–T3 ở đoạn trên vẫn chờ):** Xong ở local: lệnh `npm run sync:check` (prod, đọc token `.env.local`) và `sync:check:local` (`scripts/sync-check.mjs`: so tên migration repo với DB + SHA Production với `origin/main`; exit 1 khi lệch); chế độ `--linked` chưa chạy thử. **Bước (1) XONG 2026-11-10** (9/9 apply qua MCP, đối chiếu đủ). **Bước (2)+(3a) gộp, PO chọn 2026-11-10:** không có công cụ deploy tay (MCP `vercel` `needs_auth`) → PR `ksnkbv103-droid/ksnk_bv103_V2#125` bật `git.deploymentEnabled`; merge = Vercel tự build Production từ `main`. **XONG 2026-11-10:** #125 merge (`86f5b55b`), Vercel tự build, Production = `origin/main` (lệch 0 commit). Chưa test tay trên prod. **(3b) một nửa, 2026-11-10:** `sync:check` (script + npm) đã commit local, đếm cả tên migration trùng (repo và prod cùng có 5 tên × 2 bản). Bước CI **chưa thêm — No-go** (`security-auditor`, mức Cao): `SUPABASE_ACCESS_TOKEN` là PAT toàn tài khoản, đặt trong job có `npm ci` + script của nhánh PR thì lộ được qua `$GITHUB_ENV`/ghi đè file. Hướng sửa chờ PO chọn: role Postgres chỉ `SELECT` trên `supabase_migrations.schema_migrations` (SQL lên prod = cổng PO) + secret DB URL của role đó + job riêng không `npm ci`; job đó phải là required check của `main` thì mới chặn được merge. Trước khi có: chạy `npm run sync:check` tay trước mỗi merge có migration. **PO chọn role chỉ đọc (2026-11-10):** migration `20261110100000_ci_migration_reader_role` đã apply prod (role `ci_migration_reader`, NOLOGIN, chỉ `SELECT (version, name)`); job `sync-check` trong `ci.yml` (psql trước checkout, không `npm ci`, thiếu secret `SYNC_CHECK_DB_URL` → SKIP) đã commit local, chưa push; reviewer vòng 2: 0 Critical/High. **CHẶN — chưa được bật login cho role:** trên prod schema `public` còn `CREATE` cho PUBLIC (`=UC/postgres`; local không có), nên role này (và mọi role đăng nhập SQL trực tiếp) tạo được bảng/hàm trong `public`. Cần PO duyệt migration `revoke create on schema public from public` lên prod trước (PO hoãn 2026-11-10; role giữ NOLOGIN, cổng CI ở trạng thái SKIP). Sau đó PO tự: `alter role ci_migration_reader with login password '…'`, đặt secret `SYNC_CHECK_DB_URL` (pooler `ap-southeast-1`, user `ci_migration_reader.<ref>`, `sslmode=require`), đặt check «Sync check — migration repo vs prod» làm required của `main`. Thứ tự bắt buộc còn lại, mỗi bước một cổng PO: (1) apply prod 9 migration bù theo thứ tự timestamp `20261028090000` → `20261029150000` (không gồm KD-4; không file nào gọi `fn_cssd_kho_lock`; không có DROP/DELETE, chỉ UPDATE backfill ở `hc_c/d/e`, `hc_nhom`, `qlcv_dia_diem_nhieu_khoa`); (2) push + deploy `main`; (3) sau đó mới bật `git.deploymentEnabled` trong `vercel.json` và thêm `sync:check --strict` vào CI (cần secret `SUPABASE_ACCESS_TOKEN`). **Không deploy `main` trước bước (1):** code `main` đọc `dia_diem_khoa_ids`, `nhom_chuyen_mon_id`, `cssd_dm_hoa_chat_nhom` chưa có trên prod. DB local cũng lệch: thiếu 9 migration (`cssd_loai_*` 5 file, `cssd_cong_may_theo_cau_phan`, `nhan_su_chuc_vu_muc_quan_ly`, `cssd_me_ghi_test_sau_qc_khong_dat`, `ctyt_dovai_nhan_vien_ksnk_view`) → chạy `mdm:migrate:local`. Dọn (chờ PO duyệt xóa): 8 nhánh local + 4 nhánh remote đã gộp hết vào `main`, 7 worktree tương ứng, 10 stash (cũ nhất 2026-05-19); giữ lại để PO quyết: `claude/idea-to-product-steps-84233f` (đi trước 11 commit), `claude/monitoring-module-review-3384e5` (7), `claude/system-structure-confusion-5676d2` (1), `chore/code-vs-ai-phase1` (1 + file chưa commit ở checkout gốc, gồm migration `20261105150000_dao_tao_canonical_qbank_upgrade.sql`).

**Backlog gia cố (đóng băng, chỉ mở khi đủ luật dừng):** NS-MUC (form Danh mục chọn `muc_quan_ly` của chức vụ: cần tạo lại view `mdm_dm_chuc_vu` kèm metadata + sửa hook/modal; hiện mức chỉ seed bằng migration `20261031010000`) · NK-TZ2 («hôm nay» UTC 5 chỗ) · NK-SCOPE nợ lọc phạm vi + RLS DB · N1 (tách file NKBV > 1.700 dòng, thay `any`) · KD-2 form tự đổi PP · KD-3 chạy thử import · KD-4 nợ a–f · K3/QL-1/GS-1 phần RLS · CS-GATE nợ (`recall-receive` chèn+tắt, map lỗi trigger) · D1/Q1 spec + e2e · Zod nhập lô · H1 gọn 110 lệnh npm → ~10 · đo lượt xem báo cáo · sao lưu prod định kỳ.

Model: Haiku cho đọc/soát (UAT, explore-module, db-verify) · Sonnet cho sửa code · Opus chỉ khi debug hoặc kiến trúc khó.

File SQL repo: `supabase/migrations/20261008221231_vst_valid_opp_moment_cap.sql`. Không đổi tên cho khớp timestamp prod.
