# KH_APPKSNK_20261117 — Phương án A «thu hẹp + lên prod» (4 lát)

Trạng thái: PO ĐÃ DUYỆT 2026-11-17 (kèm 3 mặc định §2) · ĐANG LÀM = lát 1 · chưa push · chưa deploy · chưa ghi gì lên prod trong lượt này
Nguồn: kết luận «không đập đi xây lại» (PO hỏi 2026-11-17, phiên khác) · `.claude/plans/KH_APPKSNK_20261117_lo-prod-pha1.md` (kịch bản chi tiết lát 1, không viết lại) · `HANDOFF_APPKSNK.md:26,32` (đầu mối).
Nơi làm: worktree `integrate-2026-11`, nhánh `integrate/2026-11`. Prod = Supabase `cvzwslpxwgqiugzzhqej`.
Đo đầu lượt (2026-11-17): `git status -sb` = `ahead 12` (đề bài ghi 11; chênh 1 là commit nâng Next `cfb59267`) · cây sạch · `wip.py` VƯỢT 3 mục (nhánh chưa gộp 6 > 3, worktree 4 > 2, HANDOFF 47 > 40 dòng) · 310 file migration · roadmap 67 540 B · 122 npm script · 4 file `BAO-CAO-*` · `docs/core` 13 file.

## 1. Bốn lát (thứ tự 1 → 2 → 4; lát 3 độc lập)

| Lát | Việc | Xong khi | Cần người |
|---|---|---|---|
| **1 Lên prod** (ĐANG LÀM) | Làm theo kịch bản `KH_…lo-prod-pha1.md`: §3 nhóm A đã áp prod 37/37 · §4 B1–B5 · §5 SQL TC09 · §6 điều kiện dừng · §9 nhật ký. Trình tự: `npm run verify` → «push» → PR vào `main` → «deploy»/merge → READY → B1–B4 → B5 → TC09 | (1) `git status -sb` hết `ahead`, PR vào `main` đã merge, deployment Vercel READY · (2) B1–B4 xong, `npm run sync:check` chỉ thiếu đúng 1 file `20261114180000` (K5) · (3) TC09 do PO tự chạy: đạt | «push» · tiêu đề/thân PR (hỏi từng lần) · «deploy»/merge (merge PR = tự deploy production, `vercel.json` `git.deploymentEnabled: true`) · `/mcp` cấp supabase + vercel · B1 PO đọc AR-8h (không rollback tự động) · TC09 |
| **2 Ẩn module chưa có chủ** (ẩn, không xóa) | SAU lát 1, nhánh/PR riêng cắt từ `main`. Dùng `KSNK_PILOT_FOUR_MODULES=1` + mở rộng nhỏ phủ `/dao-tao`. Đọc lại `src/lib/ksnk-pilot-four-modules-scope.ts` + `src/lib/ksnk-pilot-route-scope.ts` rồi chốt hành vi bằng spec. Kết quả: VST/GSC + thống kê + Quản trị + CSSD hiện; NKBV, QLCV, Đào tạo ẩn | (1) có biến → `/giam-sat-nkbv`, `/quan-ly-cong-viec`, `/dao-tao` 404 + hết trên menu (spec pass) · (2) bỏ biến → hiện đủ (spec) · (3) `npm run verify:changed` pass | Đặt biến trên Vercel là cấu hình prod → hỏi PO trước |
| **3 Gộp trạng thái + cắt script** (chỉ trong repo) | 3a: chuyển 4 file `BAO-CAO-*` vào archive; thu `docs/core/handover-roadmap.md` 65,9 KB → ≤ 25 KB; `docs/bo-tai-lieu/03-tien-do` là file trạng thái duy nhất. 3b: đo lại số npm script không có nơi gọi (≈ 35/122 là số phiên trước, chưa kiểm), đưa PO duyệt danh sách rồi mới xóa | `npm run docs:links:check` pass · `node scripts/readiness/so-loi.mjs check` pass · roadmap ≤ 25 KB · (3b) danh sách PO duyệt + `npm run verify:changed` pass | 3b: PO duyệt danh sách trước khi xóa |
| **4 Squash 310 migration → 1 baseline** | CHỈ sau B5 + TC09 đạt. Runbook `docs/reference/guides/migration-squash-runbook.md`, nhưng dựng baseline MỚI từ DB local (không dựa baseline v2 cũ, §3 lệch (c)). Giao `migration-author` (Opus), theo skill `destructive-change`: file cũ chuyển `archive_legacy`, KHÔNG xóa; không áp gì lên prod; chỉnh mốc cắt `scripts/sync-check.mjs` (so theo TÊN) | (1) DB dựng từ chuỗi cũ và từ baseline: `pg_dump --schema-only` diff rỗng · (2) `sync:check` đã chỉnh pass trên prod (chỉ đọc) · (3) `npm run mdm:migrate:local` → `verify:mdm:local` pass | PO ra lệnh lát (phá hủy có điều kiện); PR hỏi từng lần |

Ràng buộc lát 3: KHÔNG đổi tên `HANDOFF_`/`SO_NO_`, skills, hooks (cấu hình toàn cục đóng băng); `docs/core` giữ 13 file, chỉ chuyển vào archive, không tạo tài liệu mới; không thêm nội dung vào HANDOFF.
Cửa sổ rủi ro §3.4 của KH lô prod đang MỞ: prod chạy mã cũ nên RPC ghi nhật ký/thu hồi CSSD lỗi cho tới khi deploy → ưu tiên đóng lát 1.

## 2. Ba mặc định PO đã duyệt

1. Bản thử đầu hiện VST/GSC + thống kê + Quản trị + CSSD; ẩn NKBV, QLCV, Đào tạo (chưa có đầu mối, `HANDOFF_APPKSNK.md:32`).
2. Ẩn bằng `KSNK_PILOT_FOUR_MODULES=1` + mở rộng nhỏ cho `/dao-tao` (không dùng `KSNK_PILOT_CORE_MODULES`).
3. Squash chỉ sau B5 + TC09; gộp tài liệu chỉ trong repo; script chỉ xóa sau khi PO duyệt danh sách.

«Chưa có chủ» = chưa có đầu mối (`HANDOFF_APPKSNK.md:26,32`); VST/GSC chưa ghi tên đầu mối nhưng đang dùng thật nên giữ hiện. «Ẩn» = 404 route + ẩn menu, không xóa mã/dữ liệu.

## Tự kiểm

**Yêu cầu → bước:** lên prod = lát 1 · ẩn module = lát 2 · gộp trạng thái + cắt script = lát 3 · squash = lát 4. Mỗi lát có `Xong khi` ≤ 3 tiêu chí đo được (§1). Không bước thừa.

**Lệch so với quy tắc/nguồn hiện có** (mỗi lệch kèm `file:dòng`):

- (a) `.env.example:23` ghi FOUR «chặn QLCV + CSSD + NKBV» nhưng phiên trước đọc ra mã FOUR chỉ ẩn nav `cv`, `nkbv` và chặn `/cssd-erp`, `/quan-ly-cong-viec`, `/giam-sat-nkbv`. Phiên này **chưa đọc lại** dòng đó (`.env*` bị cấm đọc theo `~/.claude/CLAUDE.md` Bảo mật) → lát 2 chốt bằng spec, không bằng lời trong `.env.example`.
- (b) `src/lib/ksnk-pilot-core-modules-scope.ts:30-32`: CORE ẩn `dash` + mọi `cssd-*` (đã đọc lại, đúng) → không dùng CORE, dùng FOUR.
- (c) `docs/reference/guides/migration-squash-runbook.md:4` nói baseline v2 `20260602100000_init_pilot_baseline.sql` là SSOT; trong `supabase/migrations/` chỉ có `20260530000000_init_pilot_baseline.sql` (đã `ls`, 310 file). README migrations ghi «92 migration» lệch 310 → lát 4 dựng baseline mới từ DB local.
- (d) `HANDOFF_APPKSNK.md:3` trần 6000 B (`so-loi.mjs check` FAIL khi vượt); đầu lượt 5 801 B (đề bài ghi 5 820). Cập nhật HANDOFF phải rút dòng cũ đã xong để không vượt.
- (e) `CLAUDE.md` dự án «docs/core giữ 13 file» (đã đếm 13) → lát 3 chỉ chuyển vào archive.
- (f) `~/.claude/CLAUDE.md` «cấu hình luồng đóng băng» → không sửa skills/hooks/agents/rules; phiên này chỉ ghi plan + HANDOFF.
- (g) `docs/bo-tai-lieu/01-tong-quan-yeu-cau-lo-trinh.md:100` (§6.3) cấm deploy khi chưa áp hết migration → đã thỏa (nhóm A 37/37, KH lô prod §9 dòng «hậu kiểm cuối nhóm A»); nhóm B áp sau deploy là ngoại lệ đã duyệt (KH lô prod Tự kiểm 3).
- (h) Đề bài «ahead 11» vs đo `ahead 12` — lệch 1 commit (`cfb59267`), không ảnh hưởng đường làm.
- (i) CLAUDE.md dự án «≤ 8 file/task»: lát 2 ≤ 4 file, lát 3a có thể chuyển nhiều file → tách 3a theo lô nếu vượt.

- (j) Đề bài «`node scripts/readiness/so-loi.mjs check` phải pass» **đang không đúng ở đầu lượt** (đo trên cây sạch + chỉ sửa HANDOFF/plan, HANDOFF 5 801 B ≤ 6000): `EXIT=1`, nguyên văn `VST_GSC   CHƯA ĐẠT (VST-025)` và `NKBV      CHƯA ĐẠT (NKBV-041)` (`scripts/readiness/so-loi.mjs:127-137`: còn NGHIEM_TRONG/CAO đang mở). VST-025 = `CHO_PO`, đóng khi nhóm A đã áp prod (#35–#37) được ghi vào sổ (`so-loi.mjs set`, không phải lát này); NKBV-041 = `DA_XAC_MINH`/`VAN_HANH`, đóng khi gỡ file K5 `20261114180000` khỏi repo + DB local (cũng là lý do `sync:check` còn thiếu 1 file). → Tiêu chí `so-loi check` pass của **lát 3** chỉ đạt sau hai việc đó; không tự sửa sổ trong lượt này.

**Thứ tự phụ thuộc:** 1 → 2 (lát 2 cắt nhánh từ `main` sau khi lát 1 merge) → 4 (squash cần B5 + TC09 từ lát 1). Lát 3 không phụ thuộc, nhưng chỉ mở khi lát 1 đóng (một lát `ĐANG LÀM`).

**Chưa kiểm được (không coi là đã xác minh):** hành vi thật của FOUR trên route (a) · số npm script không nơi gọi (3b) · `sync:check` linked + B1–B4 (MCP supabase/vercel chưa ủy quyền) · TC09 (PO tự chạy).

## 3. Ghi chú lát 3 (đo 2026-11-18 ở HEAD `95d2bbe0`; CHƯA sửa file nào; phiên nén 2 lần nên dừng, làm ở phiên mới)

Thẻ việc đề xuất: Sản phẩm = roadmap ≤ 25 600 B + 4 file `BAO-CAO-*` vào archive + danh sách script chờ PO · Xong khi = `npm run docs:links:check` pass · `wc -c docs/core/handover-roadmap.md` ≤ 25 600 · danh sách 3b nằm trong file này · Cần người = PO duyệt danh sách trước khi xóa script. `so-loi.mjs check` vẫn FAIL (VST-025, NKBV-041) theo (j), không thuộc lát 3.

**3a — roadmap hiện 67 642 B / 197 dòng.** Số dòng theo HEAD `95d2bbe0`.
- Giữ nguyên: 1-35 (§1-§4) · 37-50 (`## 5.` + thang L0-L3; nhiều nơi trích «roadmap §5») · 54-60 (luật dừng rà soát) · 62-70 (bảng «Hiện trạng module»: `scripts/module-audit.mjs:36-37` đếm dòng bảng bắt đầu `|` nhắc từng module, giữ mọi dòng) · 72 · 76 (khóa PO 10-24) · 80 (Kiến trúc module, `01:71` trích) · 101-103 · 105 · 113 · 165-172 (sửa hàng «Dung lượng file này» thành số thật) · 195 · 197.
- Rút gọn mạnh (đã có trong git log, sổ lỗi hoặc bộ 3 file): 52 · 74 (~7,4 KB) · 78 · 82-92 (AR-0…AR-8; dòng 89, 91, 92 mỗi dòng 3,5-7 KB) · 94-99 · 107 · 109 (~4,5 KB) · 111 · 115-163 · 174-193 (191 ~4 KB).
- Đầu roadmap mới ghi sha `95d2bbe0` + lệnh `git show 95d2bbe0:docs/core/handover-roadmap.md` thay cho file lưu trữ (không tạo tài liệu mới).
- Mục mở chỉ còn trong roadmap (grep: 0 ở `so-loi.json` và `SO_NO_APPKSNK.md`) → giữ vài dòng hoặc 1 dòng/mục vào `SO_NO_APPKSNK.md`: phiếu đổi danh mục kẹt `APPLYING` · lưới Silicone JF941 (`-KCN` hay `-CN`) · 3 QT kẹt bộ tổng B01.SET.05, B09.SET.10, B19.SET.07 · phương án C′ (BOM ở bộ tổng) · `void-incident.application.ts` cập nhật `so_luong_kho_du_phong` không nguyên tử (còn 1 file docs khác nhắc, xem đã ghi nợ chưa) · KD-5 (DDL `cssd_fact_kho_kiem_ke`) · backlog đóng băng NS-MUC, NK-TZ2 · nợ Cao: RPC `fn_cssd_dong_bo_tach_nhiet` mất bộ con `-EO` và bao gói mặc định · câu PO: còn cần bộ con EO tách khỏi `-KCN` không. Cần đối chiếu thêm vì có ở docs khác: `chat-thai-do-vai` (3 file), `ci_migration_reader`, migration `20261111090000`.
- Trích số dòng sẽ trôi sau khi cắt: `docs/bo-tai-lieu/01-tong-quan-yeu-cau-lo-trinh.md:71,120,122` · `02-nghiep-vu-domain.md` (alias `roadmap` dòng 32; `roadmap:85,89,91,92,176,178` dòng 42, 52…) · `03-tien-do-thuc-trang.md:55,62,76,231,280,328,329,381` · `SO_NO_APPKSNK.md:55` · comment `supabase/migrations/20261114160000_gstt_vst_rls_cnk_toan_vien.sql:7` (migration đã áp: không sửa file, chấp nhận trích trôi hoặc ghi một dòng vào SO_NO). Sửa trích theo lô ≤ 8 file hoặc đổi thành «bản `95d2bbe0`».
- 4 file `BAO-CAO-*` ở gốc (15 105 · 15 691 · 21 038 · 27 923 B): `docs/` chưa có thư mục archive, đích chưa chốt; dùng `git mv` giữ lịch sử. Sửa trích: `BAO-CAO-NEN-MONG:3`, `BAO-CAO-TONG-THE:3` (link tương đối giữa các báo cáo), `01:71,157,158`, roadmap dòng 102; kiểm `docs/README.md` và `docs/DOCS_MANIFEST.yaml`. `BAO-CAO-NEN-MONG:100` nhắc `BAO-CAO-DOI-CHIEU-NHSN2026.md` (không có trong worktree), ngoài phạm vi.
- Cách làm: Edit từng đoạn (quy tắc `tai-lieu.md`); đo `wc -c` sau mỗi lô; `node scripts/module-audit.mjs` còn đếm đủ dòng bảng.

**3b — script (chưa đo lại).** Nền cũ: `.claude/plans/KH_APPKSNK_20261113_dung-lai-theo-dac-ta.md` L6 (dòng 66, 89-92): 121 → 38 (31 bỏ tên giữ file + 52 xóa tên), cần đo lại trên 122 npm script hiện có. Nơi gọi = chuỗi `npm run` trong `package.json`, `scripts/`, `.github/workflows/ci.yml`, docs. Ghi danh sách đề xuất vào đây; chưa xóa gì cho tới khi PO duyệt, sau đó chạy `npm run verify:changed`.
