# 01 · Tổng quan, yêu cầu, lộ trình, cách triển khai

> **ĐÃ DUYỆT bởi PO 2026-11-16 (bản gốc)** · ảnh chụp 2026-11-15 · nhánh `integrate/2026-11` · HEAD `1333d47e` · nền so sánh `origin/main` = `ae64317c`.
> Bộ 3 file: **01** (file này: vì sao · cái gì · làm thế nào · lộ trình) · [02-nghiep-vu-domain.md](02-nghiep-vu-domain.md) (nghiệp vụ, domain) · [03-tien-do-thuc-trang.md](03-tien-do-thuc-trang.md) (đã làm, thực trạng, số đo kèm lệnh đo lại).
> Nhãn: «cần kiểm» = nguồn không nói rõ hoặc chưa đo lại · `[ĐỀ XUẤT]` = chưa PO chốt.

## 0. Cách dùng bộ này

- Gom từ tài liệu rải rác theo yêu cầu PO 2026-11-15, chỉ nói về module hiện có, để rà soát và sửa nhanh hơn. Không thêm công cụ, sổ hay cổng mới.
- Lệch với bộ này thì các nguồn sống thắng: `CLAUDE.md` (luật + khóa PO) · sổ lỗi `node scripts/readiness/so-loi.mjs status` · `npm run module:gate` · `HANDOFF_APPKSNK.md`.
- `docs/bo-tai-lieu/` nằm ngoài 6 lớp của `docs/README.md` và trái câu «Never tạo tài liệu thứ hai» của `CLAUDE.md`: bộ này làm theo yêu cầu PO và đã được PO duyệt làm bản gốc ngày 2026-11-16. Chưa xóa hay di chuyển tài liệu nào; `CLAUDE.md` thuộc cấu hình đóng băng nên câu đó chưa sửa.
- PO đã duyệt 2026-11-16: bộ này thay phần lộ trình/chiến lược của `docs/core/handover-roadmap.md` (65,9KB, mục tiêu 25KB), `BAO-CAO-TONG-THE-2026-11-13.md` §4 và hai KH trong `.claude/plans`. Chưa làm: lưu trữ bản cũ và xếp lớp thư mục này, chờ PO chốt phạm vi (§6.5 mục 6). Bản đồ nguồn: §8.

## 1. Mục đích và ý tưởng

KSNK BV103 (pilot) số hóa quy trình Kiểm soát nhiễm khuẩn của bệnh viện: **nhập phiếu tại chỗ → lưu một nơi → thống kê tự tính → in biểu mẫu theo quy trình → truy vết**. Mục tiêu PO (2026-10-12): triển khai TẤT CẢ module hiện có; mỗi module cần người dùng thật và kịch bản tay trước khi coi là xong.

- Mỗi module có 3 màn: Nhập · Lịch sử · Thống kê. Giám sát đi bốn tầng một chiều: ghi nhận → lịch sử → thống kê khoa → báo cáo chính thức (in, `/bao-cao-tong-hop`).
- Thứ tự module (khóa PO): VST/GSC + thống kê (đang dùng thật) → CSSD → NKBV → QLCV → Đào tạo. Nền chung: MDM/RBAC/Quản trị, Dashboard/KPI.
- Stack: Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres/Auth/RLS) · Zod; test Vitest + Playwright; Vercel `ksnk-bv103-v2`. Kiến trúc: `src/app/` route mỏng · `src/modules/<module>/` DDD · `src/lib/` RBAC + domain · `supabase/migrations/` là SSOT schema.

Nguồn: `CLAUDE.md`; `docs/modules/giam-sat/README.md:18-20`; `docs/core/handover-roadmap.md` §5.

## 2. Người dùng cuối

| Module | Ai dùng, làm gì | Đầu mối (`module:gate` 2026-11-15) |
|---|---|---|
| VST/GSC (giám sát) | NV KSNK / mạng lưới KSNK nhập phiên VST (5 mốc WHO) và phiên GSC; xem thống kê một kỳ, in báo cáo. Hội đồng KSNK chỉ xem. Prod 11-12: 19 tài khoản NHAN_VIEN_KSNK, 0 MANG_LUOI_KSNK | CHƯA CÓ (roadmap dòng 66 ghi «Đã có»: PO xác nhận) |
| CSSD | Tổ CSSD qua 6 trạm: tiếp nhận → làm sạch → QC → đóng gói → mẻ tiệt khuẩn → cấp phát; truy vết bộ dụng cụ | `<tên đầu mối>` (PO 2026-10-31) |
| NKBV | «Ai làm» không có trong nguồn: PO cần chỉ định. Ghi ca NKBV theo NHSN 2025, danh sách ca, tỉ lệ | CHƯA CÓ |
| QLCV | Nhóm KSNK: tạo, giao, duyệt, theo dõi hạn công việc nội bộ; chỉ NV KSNK được giao hoặc phụ trách | CHƯA CÓ |
| Đào tạo | NV bệnh viện thi/ôn tập trắc nghiệm KSNK; người có quyền `DAO_TAO` sửa soạn ngân hàng câu hỏi, mở kỳ, xem sổ | CHƯA CÓ |

Vai: ADMIN · HOI_DONG_KSNK (chỉ xem) · NHAN_VIEN_KSNK · MANG_LUOI_KSNK · KHACH_THONG_KE_GSTT · CHU_NHIEM_KHOA (PO 2026-11-10 ≡ TK_KSNK). Ma trận «ai xem gì» theo khoa: «không có trong nguồn» (02 §1), chờ PO (GS-1).

Việc ≤ 60 giây: nguồn chỉ nêu cho VST/GSC (nhập một phiếu < 60 giây, `giam-sat/README.md:93-101`). QLCV (tạo việc < 30 giây) và Đào tạo (tổng hợp kỳ < 10 phút) mới là `[ĐỀ XUẤT]`.

## 3. Phạm vi

- **Trong**: 5 module trên + nền (MDM/RBAC/Quản trị, Dashboard/KPI/báo cáo tổng hợp).
- **Ngoài (không làm)**: P3 và module bổ sung (KHÓA, KH 2026-11-14) · chất thải, đồ vải · HIS/LIS (L3) · LMS (Đào tạo chỉ là thi trắc nghiệm + sổ kết quả) · NKBV ngoài chuẩn người lớn (CLIP, LabID/MDRO, AUR, SIR, nhi/sơ sinh) · viết lại engine lâm sàng · bảng summary khi chưa có số đo và PO đồng ý · tính năng mới ở NKBV/QLCV/Đào tạo (đóng băng).
- **Chưa quyết**: `chat-thai-do-vai` (2.574 dòng, chưa có trong lộ trình hay `ssot-map`). Mặc định: gác.

## 4. Yêu cầu và cách đo

Thang sẵn sàng (PO 2026-10-24): **L0** code chạy (`verify:engineering` pass) · **L1** đưa chạy thử (đầu mối thật, nhập phiếu < 60 giây, ≥ 3 kịch bản tay, thống kê khớp tính tay) · **L2** ổn định (cổng nguyên tử, RLS theo phạm vi, đã apply prod) · **L3** tự động hóa. Pilot DoD một lát: người dùng/môi trường rõ · ≥ 3 kịch bản tay · migration + RPC apply đúng · `verify:engineering` pass.

| # | Yêu cầu | Cách đo | Hiện tại (2026-11-15) |
|---|---|---|---|
| R1 | Nhập một phiếu VST/GSC < 60 giây | bấm giờ tay, người dùng thật | chưa có số |
| R2 | Thống kê khớp tính tay | đối soát RPC với tính tay | VST khớp 2026-10-24 (DB local, 39 khoa, 0 lệch); GSC chưa đối soát |
| R3 | ≥ 3 kịch bản tay mỗi module, người dùng thật chạy | `node scripts/readiness/so-loi.mjs tay` | CHUA 7 · DAT 40; sổ không ghi ai chạy nên không kịch bản nào chứng minh do người dùng thật chạy |
| R4 | RLS theo phạm vi («ai xem gì») | migration + `verify:mdm`; reviewer `security-auditor` | VST-025, NKBV-041 (CAO) đang mở |
| R5 | Cổng nguyên tử CSSD | `npm run test:cssd` | ≈ 12/89 cổng an toàn (nghĩa chính xác «cần kiểm») |
| R6 | Prod khớp repo | `list_migrations` (MCP supabase) so với `ls supabase/migrations/*.sql` | chưa đo được: MCP chưa authorize |
| R7 | `verify:engineering` pass | chạy theo lát | đo mỗi lát |
| R8 | Truy vết một bộ CSSD < 1 phút | bấm giờ tay | chưa đo |

## 5. Khóa PO (ngắn; chi tiết ở 02)

| Ngày | Chốt |
|---|---|
| 2026-10-09 | VST: rửa/chà ≤ 2 thời điểm WHO phân biệt; bỏ sót = 1; năm mốc một hàng; quá trần bỏ mốc cũ nhất, không toast. KPI `fn_vst_is_valid_opportunity` cùng trần với form. Xóa phiên VST là mềm (`is_active=false`) cho đến khi PO nói khác |
| 2026-10-12 | Mục tiêu triển khai TẤT CẢ module (thay lệnh đóng băng cùng ngày) |
| 2026-10-24 | Thang L0–L3 · nộp trễ > 30 giây = không đạt · thi thử ẩn đáp án đến khi nộp · QL-1 (xóa mềm, ghi chú theo người tạo) · NKBV đóng băng ở mức ghi ca + danh sách + tỉ lệ |
| 2026-11-06 | Ngưỡng dashboard `GREEN_MIN` 85 · `YELLOW_MIN` 70 · `KHOA_WARN_PCT` 80; biểu đồ khoa VST vàng < 90, đỏ < 85. Ghi «chưa có căn cứ định lượng từ nghiên cứu», không dẫn WHO |
| 2026-11-10 | `CHU_NHIEM_KHOA` ≡ TK_KSNK. Break-glass chỉ ADMIN/CNK thật (QLCV-003, 11-11) |
| 2026-11-13 | CSSD xây lại lõi · lưu danh tính người được quan sát (R2.07) · lý do sửa/xóa ≥ 10 ký tự (VST), ≥ 3 (GSC) · giữ tick tay (R1.09/R1.10) · mẻ không đạt xử lý lại từ đầu, về Tiếp nhận (code chưa đổi) · CSSD-017 ủ BI ≥ 20 phút · NKBV-023 ẩn ca chốt = ADMIN + lý do · NKBV-026 LOA máy chủ · CSSD-025 hoãn |
| 2026-11-14 | Không có ngưỡng hạn mức nào làm dừng hay thu hẹp việc |

Nguồn: `CLAUDE.md`; `docs/core/handover-roadmap.md` dòng 76; `docs/modules/dashboard/metric-dictionary.md:86-89`; `BAO-CAO-TONG-THE-2026-11-13.md`; `HANDOFF_APPKSNK.md`.

## 6. Phân tích và lộ trình

**Kết luận.** Nút thắt không phải thiếu tính năng. Đó là (1) thiếu người dùng thật có tên, (2) prod chưa khớp repo, (3) công sức chảy vào chỗ chưa có người dùng, vào quy trình và vào vòng rà soát tự sinh việc. Chưa module nào đạt L1 đầy đủ; VST/GSC «đạt có điều kiện vận hành thử» (roadmap 2026-11-10). Các việc mở khóa tiến độ (authorize MCP, áp prod, chỉ định đầu mối) chỉ PO làm được.

### 6.1 Nguyên nhân gốc và số đo

| # | Nguyên nhân | Số đo 2026-11-15 | Đo lại bằng |
|---|---|---|---|
| 1 | Thiếu người dùng và đầu mối thật | 4/5 module «CHƯA CÓ» đầu mối. Prod: VST ≈ 3,6k phiên và GSC ≈ 1,4k phiên (11-12) là dữ liệu thật; QLCV 0 việc, Đào tạo 1 lần thi, NKBV 1 sự kiện (11-10). Điểm cơ học = 10 trừ số bước «cần chấm» mà `module:audit` in (giam-sat 5 · cssd 6 · nkbv 4 · qlcv 4 · dao-tao 4; cả năm module `thiếu: —`); các bước «cần chấm» (hợp của năm module: 1, 2, 5, 8, 9, 10) đều cần người dùng hoặc PO | `npm run module:gate` · `npm run module:audit` · số prod: MCP supabase |
| 2 | Mã và công sức dồn vào module chưa có người dùng | Dòng `src` 227.483: NKBV 62.298 (27,4%), CSSD 48.812 (21,5%), VST+GSC+hub 21.256 (9,3%). Commit chạm module (feat/fix/tổng, `origin/main..HEAD`, không merge, một commit đếm cho mọi module nó chạm): NKBV 12/28/44; VST 6/6/15; GSC 7/4/14. Từ 2026-11-13 00:00 NKBV vẫn nhận 15 fix, 0 feat (16 commit chạm) | `git log --no-merges origin/main..HEAD --format=%h [--grep='^fix'] -- src/modules/<m> \| wc -l` |
| 3 | Vòng rà soát tự sinh việc | Sổ lỗi 156 mục: 109 đã sửa, 25 mở, 14 lỗi giả (14/123 việc đã đóng = 11,4%), 11 chờ PO. Kịch bản tay CHUA 7 | `node scripts/readiness/so-loi.mjs stats` |
| 4 | Quy trình cồng kềnh | 174/418 commit (42%) chỉ chạm quy trình/tài liệu; từ 2026-11-13 00:00: 55/107 (51%). 121 npm script; roadmap 65,9KB so với mục tiêu 25KB; HANDOFF 46 dòng so với trần 40; tài liệu mâu thuẫn nhau (02 §8) | lệnh ở 03 §3 |
| 5 | Prod lệch local | Chờ áp: 31 file (HANDOFF 11-13) + `20261113100000` + 9 file `20261114*` ≈ 41; số chính xác «cần kiểm». Hai lỗi CAO mở về RLS danh tính: VST-025, NKBV-041 | `list_migrations` so với `ls supabase/migrations/*.sql` |
| 6 | Việc chỉ PO làm được | authorize MCP (github, supabase, vercel) · duyệt và áp lô prod · 11 mục CHO_PO · câu treo (DT-008 chưa thử tay, dọn nhánh/worktree) · push chỉ chạy khi PO gõ «push»: 55 commit chưa push | `git rev-list --count @{u}..HEAD` |

### 6.2 Nguyên tắc

- Giữ thứ tự khóa PO. Vào L1 chỉ khi module có đầu mối có tên; nhiều module cùng đủ điều kiện thì theo thứ tự PO.
- Cổng cứng (KH 2026-11-13, giữ nguyên): không `feat` khi module chưa lên prod; không đưa module kế vào chạy thử khi module trước chưa có số đo L1. «Số đo L1» = ba tiêu chí đầu (nhập < 60 giây, thống kê khớp, ≥ 3 kịch bản tay); «4 tuần không giảm» chỉ là theo dõi. Lát code PO đã duyệt (CSSD xây lại lõi, KH 11-13) vẫn làm tiếp theo cột «Được phép» của `module:gate`: cổng chặn chạy thử và `feat` mới, không chặn lát đã duyệt. Lệch thì `module:gate` thắng.
- Tái dùng cổng sẵn có (`module:gate`, sổ lỗi, `wip.py`). Không thêm cổng, script hay sổ mới. Làm từng lát một (một lát ĐANG LÀM); các pha chồng nhau chỉ ở phần chờ người.
- Bước chạm prod luôn là cổng PO.

### 6.3 Lộ trình

| Pha | Vào khi | Xong khi (đo được) | Ai | Dừng khi |
|---|---|---|---|---|
| **0 Đóng nền** | ngay | `python3 -I ~/.claude/scripts/wip.py` không còn `VƯỢT` (ảnh chụp 11-15, 4 mục: commit chưa push 55 > 20, nhánh chưa gộp 15 > 3, worktree 5 > 2, HANDOFF 46 > 40 dòng) · `git rev-list --left-right --count origin/main...HEAD` = `0 N` · `npm run docs:links:check` exit 0 · PO duyệt bộ 3 file (đã đạt 2026-11-16) | Claude: gọn HANDOFF ≤ 40 dòng sau khi phiên khác chốt sửa dở; gộp `origin/main` khi cây sạch. PO: quyết commit/nhánh/worktree dư | còn `VƯỢT` thì không mở lát mới |
| **1 Prod khớp repo** (G1) | PO authorize MCP github/supabase/vercel; PR gộp vào `main` do PO duyệt | `list_migrations` prod khớp repo (0 file thiếu) · prod chạy sha mới · smoke 3 kịch bản VST/GSC đạt · theo dõi: số phiên/tuần 4 tuần liên tiếp không giảm | PO: ủy quyền, duyệt lô, deploy. Claude: chuẩn bị lô, kiểm sau áp | 1 migration lỗi: dừng, không áp tiếp. Chưa áp hết migration thì không deploy mã (DT-006 cần cột `huy_*`) |
| **2 VST/GSC L1** (G2) | Pha 1 xong + đầu mối có tên | nhập < 60 giây (bấm tay) · thống kê khớp tính tay (GSC chưa đối soát) · ≥ 3 kịch bản tay do người dùng thật chạy · phiếu đo 15 phút, số 4 tuần, danh sách góp ý | PO: đầu mối, người dùng. Claude: chỉ sửa lỗi người dùng báo hoặc lộ dữ liệu | 4 tuần chưa đạt: ghi số, hỏi PO; không mở lát tính năng |
| **3 CSSD L1** (G3) | Chạy thử: Pha 2 đạt ba tiêu chí L1 + đầu mối Tổ CSSD + máy quét. Lát code đã duyệt: làm được ngay (`module:gate`) | số đo 6 trạm · truy vết một bộ < 1 phút · ≥ 3 kịch bản tay do Tổ CSSD chạy · `npm run test:cssd` pass | Claude: lát đã duyệt (mẻ hỏng về Tiếp nhận; CSSD-017). Tổ CSSD: chạy tay | chỉ lát đã duyệt ở roadmap §5; PO im thì không lát mới |
| **4 NKBV** (G2′, G6) | Pha 3 xong + đầu mối NKBV | 5 lỗi NHSN đã `fix` · rồi ≥ 9/10 ca khớp | Claude: `fix`. Đầu mối: đối chiếu ca | không `feat`: số commit `feat` NKBV giữ 12 |
| **5 QLCV** (G4) | Pha 4 xong + đầu mối + 3 câu PO mở có đáp án (02 §6) | ≥ 20 việc thật · ≥ 3 người dùng · 2 tuần | PO: đầu mối. Claude: `fix` | không `feat` |
| **6 Đào tạo** (G5) | Pha 5 xong + đầu mối + 3 câu DT-2 | ≥ 20 bài nộp | PO: đầu mối, kỳ thi thật | không `feat` |

Pha 0 và Pha 1 chạy song song; cả hai chỉ PO mở được.

**Ghi chú Pha 1: thứ tự áp.**
- Sổ lỗi (VST-025) ghi thứ tự cụm RLS: VST-003 `20261108100000` → `20261114150000` → `20261114160000` → `20261114170000` (GSC, sau cùng). `20261114180000` (NKBV-041) cần `fn_sys_has_role` và `fn_sys_is_admin()`. Ba file RLS `20261114150000/160000/170000` không có BEGIN/COMMIT: chỉ áp qua MCP `apply_migration`, không dùng psql autocommit.
- VST-003: `HANDOFF` 11-12 ghi đã áp prod (version prod `20261112022506`), sổ VST-025 ghi chưa. Mâu thuẫn: «cần kiểm» bằng `list_migrations`.
- Đã áp prod 11-12 (PO ra lệnh, qua MCP): VST-003, nhóm 1 (`20261109100000`, `20261110120000`, `20261111090000`), nhóm 2 (`20261110115000` → `130000` → `140000`, khu vực giám sát chuẩn 9).
- Phần còn lại theo thứ tự version; điều kiện kiểm trước/sau từng migration ở `git show ae5ca6fd:HANDOFF.md` dòng 22–32. AR-8h `20261111150400` áp cùng lúc deploy code (chạy 2 query kiểm trước). NEN-003: mặc định của sổ là chạy `migration repair --status applied 20261110110000` trước lô. Phụ thuộc chéo giữa các nhóm: «cần kiểm» (agent `db-verify`) trước khi PO duyệt lô.

### 6.4 Luật dừng và việc ngừng làm

Luật dừng (roadmap dòng 56–60, giữ): chỉ mở lát gia cố khi hỏng/lộ dữ liệu ở đường người dùng đang dùng hoặc người dùng thật báo lỗi · không giao agent «quét» module chưa có người dùng · tối đa 5 lát mở, một agent ghi mỗi lần · câu hỏi PO gom một phiên mỗi tuần, kèm phương án «nếu PO im» · áp prod theo lô hằng tuần, PO duyệt.

Ngừng làm đến khi PO đổi: `feat` ở NKBV/QLCV/Đào tạo · P3 và module bổ sung · backlog gia cố đóng băng (roadmap dòng 109) · vòng rà mới thiếu một trong ba điều kiện (≤ 1 module hoặc ≤ 20 file, câu hỏi cụ thể, ≤ 10 finding) · thêm tài liệu quy trình, npm script (hiện 121), sổ hay cổng mới · viết lại engine lâm sàng. Chỉ số theo dõi, không phải cổng: tỉ lệ commit chỉ chạm quy trình/tài liệu (hiện 42%; từ 2026-11-13 00:00: 51%); `[ĐỀ XUẤT]` mục tiêu ≤ 25% mỗi tuần.

### 6.5 PO cần chốt (gom một lần)

| # | Việc | Nếu PO im |
|---|---|---|
| 1 | `/mcp` authorize github, supabase, vercel | Pha 1 đứng; số prod giữ ảnh chụp 11-10/11-12 |
| 2 | Đầu mối có tên cho giám sát (gate «CHƯA CÓ», roadmap «Đã có»), NKBV, QLCV, Đào tạo | module đứng, không lát mới; module có đầu mối có tên đi trước |
| 3 | Duyệt lô áp prod và deploy (thứ tự ở ghi chú Pha 1) | không áp, không deploy |
| 4 | 11 mục CHO_PO, ưu tiên VST-025, NKBV-041 | đứng nguyên; NEN-003 theo mặc định của sổ |
| 5 | Mâu thuẫn tài liệu (02 §8) | giữ code hiện hành, ghi «cần kiểm» |
| 6 | Bộ 3 file đã được duyệt 2026-11-16. Còn chốt phạm vi lưu trữ bản cũ và xếp lớp `docs/`; `[ĐỀ XUẤT]` không xóa, chỉ đánh dấu bản cũ «đã gộp vào bộ 3 file», `docs/README.md` trỏ bộ làm cửa chính | bản cũ nguyên; bộ vẫn là bản gốc |
| 7 | `chat-thai-do-vai`: giữ hay gác | gác |

### 6.6 Rủi ro

1. Không có người dùng thật nên L1 không bao giờ đạt: hàng 2 của §6.5.
2. Áp lô prod lớn lỗi giữa chừng: áp tuần tự, `list_migrations` sau mỗi cái, dừng khi lỗi.
3. RLS danh tính hở trên prod tới khi áp (VST-025, NKBV-041): tầng app đã chặn Hội đồng thuần ở NKBV (NKBV-032/034) nên không khẩn; phần VST «cần kiểm».
4. Tài liệu và vòng rà lại phình: `docs/core` giữ ≤ 13 file; lộ trình chỉ cập nhật ở bảng §6.3; luật §6.4.
5. Số prod lỗi thời vì MCP chưa authorize: mọi số prod trong bộ này là ảnh chụp 11-10/11-12.

## 7. Cách triển khai

- **Môi trường**: làm ở worktree `.claude/worktrees/integrate-2026-11` (nhánh `integrate/2026-11`). DB local (Docker): `npm run trial:prep`; schema `npm run mdm:migrate:local` rồi `verify:mdm:local`. Dev `dev-local-integrate` cổng 3001 (DB local). Local là bản gốc; prod chỉ qua MCP `apply_migration` (`mdm:migrate` bị chặn).
- **Vòng một lát** (skill `lam-het`): đo việc mở (`wip.py`) → thẻ việc (Sản phẩm · Xong khi ≤ 3 · Ngoài phạm vi · Cỡ · Cần người) → làm → verify → review (không áp cho docs/copy) → commit cục bộ → ghi tiến độ. Trần: ≤ 8 file mỗi task; > 3 file ngoài scope thì hỏi PO. Sửa lỗi: viết test tái hiện (fail) trước. Trước khi sửa bảng/view/RPC/file dùng chung: `npm run impact -- <tên|file>`.
- **Verify theo file đổi**: `npm run verify:changed` (`-- --dry` để xem lệnh). Action hoặc `fact_*` → `verify:engineering`; schema (linked) → `verify:mdm`; docs → `docs:links:check`; UI thuần → `verify:quick`; trước push → `verify`. CI `verify`: lint + lint:cssd-architecture + test:coverage (chỉ báo cáo) + verify:engineering + build; job `sync-check` đang SKIP (thiếu secret `SYNC_CHECK_DB_URL`).
- **Agent và model**: mặc định Sonnet; Haiku chỉ việc cơ học; Opus chỉ `migration-author` và reviewer vùng RLS/migration/auth (`review-bv103`, `security-auditor`). Một agent ghi repo mỗi lúc; agent chỉ đọc tối đa 2 song song. Giao việc bằng agent ghim sẵn, không dùng agent chung.
- **Sổ và cổng**: `node scripts/readiness/so-loi.mjs <status|next|check|set|tay|stats|merge>` (dữ liệu `scripts/readiness/so-loi.json`) là số chuẩn cho «việc mở»; `npm run module:gate`, `npm run module:audit` cho cổng module.
- **Commit, push, prod**: commit cục bộ khi verify + review pass, chỉ file đã sửa. Push chỉ khi PO gõ «push»; PR hỏi từng lần; deploy Vercel chỉ khi «deploy»; migration/ghi DB prod chỉ khi PO ra lệnh trong chính lượt đó. Không bao giờ mở: `_agent-*.md`, CDC/NHSN thô, `node_modules/`, `.next/`, `.env*`.

## 8. Bản đồ nguồn (không xóa, không di chuyển; bộ đã duyệt 2026-11-16, bản cũ chưa lưu trữ)

| Nhóm | Tài liệu | Trạng thái |
|---|---|---|
| Lộ trình/chiến lược, đã gộp vào §6 | `docs/core/handover-roadmap.md` · `BAO-CAO-TONG-THE-2026-11-13.md` §4 · `.claude/plans/KH_APPKSNK_20261113_dung-lai-theo-dac-ta.md` · `.claude/plans/KH_APPKSNK_20261114_doi-chieu-nguon-va-mo-rong.md` | chưa lưu trữ; chờ PO chốt phạm vi (§6.5 mục 6) |
| Báo cáo ảnh chụp | `BAO-CAO-NEN-MONG-2026-11-13.md` (sáu tầng T0 Nguồn → T6 Dùng thật) · `BAO-CAO-RA-SOAT-2026-11-05.md` · `BAO-CAO-CAI-TO-2026-11-06.md` | hai báo cáo sau chưa đối chiếu trong lượt gom: «cần kiểm» |
| Nghiệp vụ chi tiết, đọc khi làm đúng lát đó | `docs/modules/<module>/` (giam-sat, dashboard, cssd, nkbv, qlcv, dao-tao, mdm) và `van-de-nguoi-dung.md` của từng module (nhãn `[SSOT]` · `[GIẢ THUYẾT]` · `[CẦN XÁC NHẬN]` · `[ĐỀ XUẤT]`) | còn là nguồn; tóm tắt ở 02 |
| Sống, máy đọc hoặc sinh | `scripts/readiness/so-loi.json` · `supabase/migrations/` · `docs/data/` · `docs/wiki/index.md` | không sửa tay |
| Sổ và handoff sống | `HANDOFF_APPKSNK.md` · `SO_NO_APPKSNK.md` (đã cũ so với sổ lỗi) · `CHANGELOG.md` · `AGENTS.md` · `README.md` | cập nhật bằng quy trình hiện có |
| Ngoài worktree (văn bản thường) | kho tri thức `~/Desktop/KSNK_BENH_VIEN_103` (685 R, 487 T, bản nháp, 520 chỗ «CẦN XÁC MINH»; QT KSNK, đặc tả 09) · `HANDOFF.md` ở commit `ae5ca6fd` (`git show`) | chỉ tra, không sao chép |
