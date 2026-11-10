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

**Đã lên prod (MCP):** K1, SEC-1, CS-ME, KD-1, CS-GATE, TB-1, HC-1, NK-AUTH, CSSD nhật ký chu kỳ + phiếu TK người/giờ + phương pháp theo Loại/cấu phần (2026-10-31, 8 migration `20261030*`), nhân sự mức quản lý chức vụ (`20261031010000`), 9 migration bù HC-C/D/E/F + nhóm hóa chất + QLCV D2/L1/L2/L3 (2026-11-10, `20261028090000` → `20261029150000`; đã đối chiếu 9 tên + đối tượng trên prod; **code prod `d147bda2` chưa khớp schema kho hóa chất cho tới khi deploy `main`**). **Chưa lên prod:** KD-4 (`20261021040000`, còn nợ khóa deadlock nhiều dòng + sổ ghi ngoài khóa). **Đã lên prod 2026-11-10:** `20261110044338` (nới CHECK dấu `NHAP_KHO`: nhập mới không bộ >0, trả kho có bộ <0; sửa lỗi «Nhập kho mới»; file repo đã đổi tên theo version prod). Rà dụng cụ vòng 1 (2026-11-10): **RLS `cssd_dm_*` (local) đã rà — không Critical/High**; mức Thấp: ghi `cssd_dm_loai_bao_goi` dùng module quyền `CSSD` không tồn tại nên thực tế chỉ ADMIN (sửa = migration, cổng PO). **Import loại đã sửa (`982cac4f`):** cờ chịu nhiệt sau import suy từ `phuong_phap_cho_phep` như trigger DB (trước đó mặc định `true` khi file thiếu cột nên không tách/nâng bộ); chưa kiểm cột `phuong_phap_cho_phep` có qua được `sanitizeSmartImportRowPayload` hay không. **Luồng duyệt phiếu đổi danh mục đã rà (code + spec):** sửa lỗi phiếu chỉ đổi «tiệt khuẩn ưu tiên» ghi đè mảng `phuong_phap_cho_phep` thành 1 phần tử (mất lưỡng dụng, trigger lật cờ chịu nhiệt mà không tách bộ) — nay giữ mảng nếu còn khớp cờ, và cờ sau lưu đọc lại từ DB; import loại cũng đọc cờ từ DB. Còn: phiếu kẹt `APPLYING` khi tiến trình chết giữa chừng không có đường thoát (chỉ PENDING/APPLY_FAILED mới từ chối được) — chưa quyết. Còn chưa rà: chạy tay UI duyệt phiếu, UI tồn. **Rà tách bộ nhiệt (2026-11-10, local):** đã sửa 2 lỗi trong `cssd-heat-split-apply.ts` (tách hàng loạt không còn dừng cả lô; loại hạ nhiệt sau khi đã tách tự chuyển từ `-CN` sang `-KCN`; spec `cssd-heat-split-cn-child.spec.ts`). **PO chốt 2026-11-10:** ống kính/optic, cáp quang, dây nguồn sáng, ống soi/ống nội soi HD = không chịu nhiệt (`{PLASMA,EO}`, 27 loại); dụng cụ kim loại/nội soi khác = chịu nhiệt (khay lưới bảo quản ống nội soi, Stapler 12 → `{STEAM_134,PLASMA,EO}`). Migration `20261110120000` đã áp local, **chưa prod**. Hàm nâng nhiệt `applyHeatSplitAfterLoaiUpgrade` (+ quét `applyHeatSplitUpgradeForAllKcn`) chuyển dòng chịu nhiệt từ `-KCN` sang `-CN`; đã chạy local: 81 dòng / 58 bộ, 54 bộ `-KCN` rỗng (chỉ có Silicone) đã tắt mềm `is_active=false` trên local (PO 2026-11-10); prod chưa làm. **Chờ PO:** lưới Silicone JF941 nâng lên chịu nhiệt đang ở `-KCN` — giữ hay chuyển `-CN`; tách bộ chưa nguyên tử (cần RPC = migration, cổng PO). 68 bộ mẹ rỗng (0 khoản) vẫn «Hoạt động» trong danh sách — chưa thấy cảnh báo nào tính nhầm, chưa quyết ẩn hay không.

**PO chốt 2026-10-24:** DT-2 nộp trễ > 30 giây = không đạt; thi thử ẩn đáp án đến khi nộp · QL-1 xóa mềm, ghi chú theo người tạo · NKBV đóng băng ở mức ghi ca + danh sách + tỉ lệ · kế hoạch 4 tuần: VST funnel/run chart → QLCV → CSSD tay + sửa Đào tạo → đo lại.

**QLCV (2026-10-25):** QL-1 đã chốt (xóa mềm, ghi chú theo người tạo); code xóa mềm chưa kiểm (`deleteCongViec` có ở `cong-viec-write.actions.ts`) · QL-A xong, commit `d258f6c0`: việc «Trả về làm lại» (TU_CHOI) giữ 100% nên nút «Lưu tiến độ» luôn khóa, nay cho nộp lại · Phát hiện: prod không thiếu migration QLCV (ghi theo kết luận của PO phiên này; chưa đối chiếu lại bằng `list_migrations` trong phiên này).

**Chờ PO (gom một phiên/tuần):** tên người đầu mối các module còn lại (CSSD đã có) · ma trận «ai xem gì» (GS-1) · QL-1 · DT-2 (3 câu) · KD-5 (lấy DDL `cssd_fact_kho_kiem_ke` từ prod hay bỏ) · V1 phạm vi vật tư · Plasma–cellulose · nguồn ngưỡng 85/70 và 90/85 · xóa phiên VST (đang `is_active=false`).

**Việc PO ngoài repo:** Supabase Auth (tắt tự đăng ký, xác nhận email, chặn mật khẩu rò rỉ, redirect URL) · `NEXT_PUBLIC_SITE_URL` + `<site>/login/reset-password` · `KSNK_BREAK_GLASS_EMAILS` tài khoản thật · CSP/X-Frame-Options/HSTS · rà phiếu RESET đang chờ trên prod.

**Đề xuất chờ PO duyệt (rà soát toàn diện 2026-11-10, chưa có hiệu lực):** Số đo: prod chỉ VST (3.613 phiên) + GSC (1.400 phiên) có dữ liệu thật; QLCV 0 việc, Đào tạo 1 lần thi, CSSD 10 chu trình thử, NKBV 1 sự kiện, đồ vải 0, trong khi các module này chiếm khoảng 120k/170k dòng `src`. Lệch đồng bộ: Vercel prod đang ở `d147bda2` (2026-11-02), `main` đi trước 46 commit; `vercel.json` tắt deploy theo git; prod DB đã có migration tới 2026-11-06 (gồm `ctyt_dovai_*`) nhưng thiếu 10 migration repo (`cssd_hc_c/d/e/f`, `cssd_hc_nhom_dm_hoa_chat`, `cssd_kd4_transfer_lock_by_id`, `qlcv_spawn_dinh_ky_catch_up`, `qlcv_nhan_vien_ksnk_de_xuat_create`, `qlcv_nhom_chuyen_mon`, `qlcv_dia_diem_nhieu_khoa`); checkout gốc đang ở nhánh `chore/code-vs-ai-phase1` có migration chưa commit `20261105150000_dao_tao_canonical_qbank_upgrade.sql`. Đề xuất: (T0) một dòng chảy `main` → Vercel tự deploy → migration một cửa + lệnh `sync:check` trong CI; (T1) mỗi lần một module tới L1 với người dùng thật, đề nghị QLCV → Đào tạo → CSSD → NKBV; (T2) nguồn nghiệp vụ = biểu mẫu KSNK.QT/BM của viện, mỗi module một trang đặc tả; (T3) gọn lệnh npm, rules, tài liệu trùng theo danh sách PO duyệt. Module `chat-thai-do-vai` chưa có trong lộ trình/ssot-map: chờ PO quyết giữ hay gác.

**Tuần 0 — một dòng chảy (PO duyệt 2026-11-10; T1–T3 ở đoạn trên vẫn chờ):** Xong ở local: lệnh `npm run sync:check` (prod, đọc token `.env.local`) và `sync:check:local` (`scripts/sync-check.mjs`: so tên migration repo với DB + SHA Production với `origin/main`; exit 1 khi lệch); chế độ `--linked` chưa chạy thử. **Bước (1) XONG 2026-11-10** (9/9 apply qua MCP, đối chiếu đủ). **Bước (2)+(3a) gộp, PO chọn 2026-11-10:** không có công cụ deploy tay (MCP `vercel` `needs_auth`) → PR `ksnkbv103-droid/ksnk_bv103_V2#125` bật `git.deploymentEnabled`; merge = Vercel tự build Production từ `main`. **XONG 2026-11-10:** #125 merge (`86f5b55b`), Vercel tự build, Production = `origin/main` (lệch 0 commit). Chưa test tay trên prod. **(3b) một nửa, 2026-11-10:** `sync:check` (script + npm) đã commit local, đếm cả tên migration trùng (repo và prod cùng có 5 tên × 2 bản). Bước CI **chưa thêm — No-go** (`security-auditor`, mức Cao): `SUPABASE_ACCESS_TOKEN` là PAT toàn tài khoản, đặt trong job có `npm ci` + script của nhánh PR thì lộ được qua `$GITHUB_ENV`/ghi đè file. Hướng sửa chờ PO chọn: role Postgres chỉ `SELECT` trên `supabase_migrations.schema_migrations` (SQL lên prod = cổng PO) + secret DB URL của role đó + job riêng không `npm ci`; job đó phải là required check của `main` thì mới chặn được merge. Trước khi có: chạy `npm run sync:check` tay trước mỗi merge có migration. **PO chọn role chỉ đọc (2026-11-10):** migration `20261110100000_ci_migration_reader_role` đã apply prod (role `ci_migration_reader`, NOLOGIN, chỉ `SELECT (version, name)`); job `sync-check` trong `ci.yml` (psql trước checkout, không `npm ci`, thiếu secret `SYNC_CHECK_DB_URL` → SKIP) đã commit local, chưa push; reviewer vòng 2: 0 Critical/High. **CHẶN — chưa được bật login cho role:** trên prod schema `public` còn `CREATE` cho PUBLIC (`=UC/postgres`; local không có), nên role này (và mọi role đăng nhập SQL trực tiếp) tạo được bảng/hàm trong `public`. Cần PO duyệt migration `revoke create on schema public from public` lên prod trước (PO hoãn 2026-11-10; role giữ NOLOGIN, cổng CI ở trạng thái SKIP). Sau đó PO tự: `alter role ci_migration_reader with login password '…'`, đặt secret `SYNC_CHECK_DB_URL` (pooler `ap-southeast-1`, user `ci_migration_reader.<ref>`, `sslmode=require`), đặt check «Sync check — migration repo vs prod» làm required của `main`. Thứ tự bắt buộc còn lại, mỗi bước một cổng PO: (1) apply prod 9 migration bù theo thứ tự timestamp `20261028090000` → `20261029150000` (không gồm KD-4; không file nào gọi `fn_cssd_kho_lock`; không có DROP/DELETE, chỉ UPDATE backfill ở `hc_c/d/e`, `hc_nhom`, `qlcv_dia_diem_nhieu_khoa`); (2) push + deploy `main`; (3) sau đó mới bật `git.deploymentEnabled` trong `vercel.json` và thêm `sync:check --strict` vào CI (cần secret `SUPABASE_ACCESS_TOKEN`). **Không deploy `main` trước bước (1):** code `main` đọc `dia_diem_khoa_ids`, `nhom_chuyen_mon_id`, `cssd_dm_hoa_chat_nhom` chưa có trên prod. DB local cũng lệch: thiếu 9 migration (`cssd_loai_*` 5 file, `cssd_cong_may_theo_cau_phan`, `nhan_su_chuc_vu_muc_quan_ly`, `cssd_me_ghi_test_sau_qc_khong_dat`, `ctyt_dovai_nhan_vien_ksnk_view`) → chạy `mdm:migrate:local`. Dọn (chờ PO duyệt xóa): 8 nhánh local + 4 nhánh remote đã gộp hết vào `main`, 7 worktree tương ứng, 10 stash (cũ nhất 2026-05-19); giữ lại để PO quyết: `claude/idea-to-product-steps-84233f` (đi trước 11 commit), `claude/monitoring-module-review-3384e5` (7), `claude/system-structure-confusion-5676d2` (1), `chore/code-vs-ai-phase1` (1 + file chưa commit ở checkout gốc, gồm migration `20261105150000_dao_tao_canonical_qbank_upgrade.sql`).

**Backlog gia cố (đóng băng, chỉ mở khi đủ luật dừng):** NS-MUC (form Danh mục chọn `muc_quan_ly` của chức vụ: cần tạo lại view `mdm_dm_chuc_vu` kèm metadata + sửa hook/modal; hiện mức chỉ seed bằng migration `20261031010000`) · NK-TZ2 («hôm nay» UTC 5 chỗ) · NK-SCOPE nợ lọc phạm vi + RLS DB · N1 (tách file NKBV > 1.700 dòng, thay `any`) · KD-2 form tự đổi PP · KD-3 chạy thử import · KD-4 nợ a–f · K3/QL-1/GS-1 phần RLS · CS-GATE nợ (`recall-receive` chèn+tắt, map lỗi trigger) · D1/Q1 spec + e2e · Zod nhập lô · H1 gọn 110 lệnh npm → ~10 · đo lượt xem báo cáo · sao lưu prod định kỳ.

Model: Haiku cho đọc/soát (UAT, explore-module, db-verify) · Sonnet cho sửa code · Opus chỉ khi debug hoặc kiến trúc khó.

File SQL repo: `supabase/migrations/20261008221231_vst_valid_opp_moment_cap.sql`. Không đổi tên cho khớp timestamp prod.
