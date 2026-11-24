# 01 · Kế hoạch: tổng quan, yêu cầu, lộ trình, cách triển khai

> **File kế hoạch duy nhất của dự án** (gộp 2026-11-24 theo yêu cầu PO).
> - Kế hoạch đang chạy: **KH cải tổ 24/11, bản đã sửa** (§6).
> - §1–§4 và §7 là bản PO duyệt ngày 2026-11-16, giữ nguyên.
> - Báo cáo, tiến độ, handoff, nợ, câu hỏi PO nằm ở [03-tien-do-thuc-trang.md](03-tien-do-thuc-trang.md). Nghiệp vụ, domain ở [02-nghiep-vu-domain.md](02-nghiep-vu-domain.md).
> - Nhãn: «cần kiểm» = nguồn không nói rõ hoặc chưa đo lại. `[ĐỀ XUẤT]` = PO chưa chốt.

## 0. Cách dùng

- **Một file kế hoạch.**
  - Không tạo thêm `KH_*.md`, `de-xuat-*.md`, `KE-HOACH-*.md`, `HANDOFF*.md` hay kế hoạch rời.
  - Plan mode ghi nháp vào `.claude/plans/` (cấu hình `plansDirectory`). PO duyệt xong thì gộp phần còn sống vào §6 và xóa file nháp.
- **Khi lệch nhau, nguồn sống thắng:**
  - `CLAUDE.md`: luật và khóa PO.
  - Sổ lỗi: `node scripts/readiness/so-loi.mjs status`.
  - `npm run module:gate`.
- **Kế hoạch cũ** đã gỡ khỏi cây mã. Danh sách và lệnh khôi phục ở §8.
- `docs/core/handover-roadmap.md` §5 vẫn giữ, vì `module:gate`, `module:audit` và các skill đọc nó. Phần đó gộp nốt khi Chặng 0 rút gọn script (§6.2, bước 6).

## 1. Mục đích và ý tưởng

**KSNK BV103 (pilot) số hóa quy trình Kiểm soát nhiễm khuẩn của bệnh viện.** Luồng chính: nhập phiếu tại chỗ → lưu một nơi → thống kê tự tính → in biểu mẫu theo quy trình → truy vết.

**Mục tiêu PO (2026-10-12):** triển khai TẤT CẢ module hiện có. Mỗi module cần người dùng thật và kịch bản tay trước khi coi là xong.

- **Màn hình:** mỗi module có 3 màn Nhập · Lịch sử · Thống kê.
- **Giám sát đi bốn tầng một chiều:** ghi nhận → lịch sử → thống kê khoa → báo cáo chính thức (in, `/bao-cao-tong-hop`).
- **Thứ tự module (khóa PO):** VST/GSC + thống kê (đang dùng thật) → CSSD → NKBV → QLCV → Đào tạo.
- **Nền chung:** MDM/RBAC/Quản trị, Dashboard/chỉ số.
- **Stack:** Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres/Auth/RLS) · Zod. Test bằng Vitest và Playwright. Chạy trên Vercel `ksnk-bv103-v2`.
- **Kiến trúc:**
  - `src/app/`: route mỏng.
  - `src/modules/<module>/`: DDD.
  - `src/lib/`: RBAC và domain.
  - `supabase/migrations/`: SSOT schema.

Nguồn: `CLAUDE.md`; `docs/modules/giam-sat/README.md:18-20`; `docs/core/handover-roadmap.md` §5.

## 2. Người dùng cuối

| Module | Ai dùng, làm gì | Đầu mối (`module:gate` 2026-11-24) |
|---|---|---|
| VST/GSC (giám sát) | NV KSNK / mạng lưới KSNK nhập phiên VST (5 mốc WHO) và phiên GSC; xem thống kê một kỳ, in báo cáo. Hội đồng KSNK chỉ xem. Prod 11-12: 19 tài khoản NHAN_VIEN_KSNK, 0 MANG_LUOI_KSNK | «Tổ giám sát KSNK» (tạm, chưa phải tên người: 03 §6 N3) |
| CSSD | Tổ CSSD qua các trạm: tiếp nhận → làm sạch → QC → đóng gói → mẻ tiệt khuẩn → cấp phát; truy vết bộ dụng cụ | Nguyễn Thanh Bình |
| NKBV | «Ai làm» không có trong nguồn: PO cần chỉ định. Ghi ca NKBV theo NHSN 2025, danh sách ca, tỉ lệ | CHƯA CÓ |
| QLCV | Nhóm KSNK: tạo, giao, duyệt, theo dõi hạn công việc nội bộ; chỉ NV KSNK được giao hoặc phụ trách | CHƯA CÓ |
| Đào tạo | NV bệnh viện thi/ôn tập trắc nghiệm KSNK; người có quyền `DAO_TAO` soạn ngân hàng câu hỏi, mở kỳ, xem sổ | CHƯA CÓ |

**Vai:**
- ADMIN.
- HOI_DONG_KSNK (chỉ xem).
- NHAN_VIEN_KSNK.
- MANG_LUOI_KSNK.
- KHACH_THONG_KE_GSTT.
- CHU_NHIEM_KHOA (PO 2026-11-10: ≡ TK_KSNK).

Ma trận «ai xem gì» theo khoa không có trong nguồn (02 §1), đang chờ PO (GS-1).

**Việc ≤ 60 giây:**
- Nguồn chỉ nêu cho VST/GSC: nhập một phiếu < 60 giây (`giam-sat/README.md:93-101`).
- QLCV (tạo việc < 30 giây) và Đào tạo (tổng hợp kỳ < 10 phút) mới là `[ĐỀ XUẤT]`.

## 3. Phạm vi

- **Trong:** 5 module trên và nền (MDM/RBAC/Quản trị, Dashboard/chỉ số/báo cáo tổng hợp).
- **Ngoài (không làm):**
  - P3 và module bổ sung (KHÓA, KH 2026-11-14).
  - HIS/LIS (L3).
  - LMS: Đào tạo chỉ là thi trắc nghiệm và sổ kết quả.
  - NKBV ngoài chuẩn người lớn: CLIP, LabID/MDRO, AUR, SIR, nhi/sơ sinh.
  - Viết lại engine lâm sàng.
  - Bảng summary khi chưa có số đo và PO chưa đồng ý.
  - Tính năng mới ở NKBV/QLCV/Đào tạo khi `module:gate` chưa cho.
- **Chất thải & Đồ vải (`chat-thai-do-vai`, 2.574 dòng):** ẩn menu, giữ mã. Nguồn: NEN-011; KH 24/11 ghi đây là quyết định PO ngày 19/11.

## 4. Yêu cầu và cách đo

**Thang sẵn sàng (PO 2026-10-24):**
- **L0** code chạy: `verify:engineering` pass.
- **L1** đưa chạy thử: có đầu mối thật, nhập phiếu < 60 giây, ≥ 3 kịch bản tay, thống kê khớp tính tay.
- **L2** ổn định: cổng nguyên tử, RLS theo phạm vi, đã apply prod.
- **L3** tự động hóa.

**Pilot DoD một lát:**
- Người dùng và môi trường rõ.
- ≥ 3 kịch bản tay.
- Migration và RPC apply đúng.
- `verify:engineering` pass.

Cột «Hiện tại» ghi số ngày 2026-11-15. Số mới ở 03 §1–§3.

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
| 2026-10-09 | VST: rửa/chà ≤ 2 thời điểm WHO phân biệt; bỏ sót = 1; năm mốc một hàng; quá trần bỏ mốc cũ nhất, không toast. Chỉ số `fn_vst_is_valid_opportunity` cùng trần với form. Xóa phiên VST là mềm (`is_active=false`) cho đến khi PO nói khác |
| 2026-10-12 | Mục tiêu triển khai TẤT CẢ module (thay lệnh đóng băng cùng ngày) |
| 2026-10-24 | Thang L0–L3 · nộp trễ > 30 giây = không đạt · thi thử ẩn đáp án đến khi nộp · QL-1 (xóa mềm, ghi chú theo người tạo) · NKBV đóng băng ở mức ghi ca + danh sách + tỉ lệ |
| 2026-11-01 | Giám sát: ngưỡng 2 mức < 85 đỏ · 85–< 90 vàng · ≥ 90 xanh; cỡ mẫu tối thiểu 50 theo khoa/kỳ; có kế hoạch giám sát khoa/tháng; quy trình QT.KSNK.33 |
| 2026-11-06 | Ngưỡng dashboard `GREEN_MIN` 85 · `YELLOW_MIN` 70 · `KHOA_WARN_PCT` 80; biểu đồ khoa VST vàng < 90, đỏ < 85. Ghi «chưa có căn cứ định lượng từ nghiên cứu», không dẫn WHO |
| 2026-11-10 | `CHU_NHIEM_KHOA` ≡ TK_KSNK. Break-glass chỉ ADMIN/CNK thật (QLCV-003, 11-11) |
| 2026-11-13 | CSSD xây lại lõi · lưu danh tính người được quan sát (R2.07) · lý do sửa/xóa ≥ 10 ký tự (VST), ≥ 3 (GSC) · giữ tick tay (R1.09/R1.10) · mẻ không đạt xử lý lại từ đầu, về Tiếp nhận · CSSD-017 ủ BI ≥ 20 phút · NKBV-023 ẩn ca chốt = ADMIN + lý do · NKBV-026 LOA máy chủ · CSSD-025 hoãn |
| 2026-11-14 | Không có ngưỡng hạn mức nào làm dừng hay thu hẹp việc |
| 2026-11-17 | K5 (`20261114180000`, NKBV-041) không áp prod: Hội đồng KSNK được thấy danh tính · đích thu hồi tái xử lý `DA_TAI_XU_LY` = Trạm Tiếp nhận (C6) |
| 2026-11-18 | Gộp bốn báo cáo thành một · migration đã áp mà bị stub thì «thay ở bản sao» khi dựng DB (`db-dung.sh`) |
| 2026-11-19 | Luồng một con đường (`CLAUDE.md`) · migration đã ở prod là bất biến (`supabase/PROD_HEAD`, `guard-adr`) · phát triển lần lượt CSSD → NKBV → QLCV → Đào tạo · sổ lỗi là nơi ghi tiến độ duy nhất |
| 2026-11-24 | Chọn KH cải tổ 24/11, chạy trên `ksnk_bv103` (§6) · gộp tài liệu: một file kế hoạch (01), một file báo cáo (03) |

Nguồn: `CLAUDE.md`; `docs/modules/dashboard/metric-dictionary.md:86-89`; sổ lỗi; bản cũ ở §8.

## 6. Kế hoạch đang chạy: KH cải tổ 24/11 (bản đã sửa)

### 6.0 Phán quyết (2026-11-24)

**PO chọn đi theo kế hoạch cải tổ 24/11.** Bản này giữ hướng của kế hoạch gốc và sửa những chỗ không chạy được như đã viết. Khám nghiệm và nhận định ở 03 §8.1.

- **Hướng đúng; giữ:**
  - Một cổng kiểm quyền ở TypeScript.
  - Trình duyệt không chạm DB.
  - Hàng rào máy thay cho văn bản.
  - Chạy được trên máy chủ nội viện.
  - Nghiệm thu theo nhóm module đang dùng thật.
- **Không chạy như đã viết.** Kế hoạch gốc có ba lỗi chặn:
  1. Đưa `main` lên `integrate` thực chất là deploy production.
  2. Bỏ 17 policy lọc dữ liệu người bệnh khi chưa có bộ lọc thay thế.
  3. SQL nháp vẫn để `authenticated` gọi được hàm và view.
- **Đổi tên:** kế hoạch gốc gọi hướng này là «Phương án C», trùng tên với phương án trong ADR-003 của ops-web. Ở đây gọi là «KH cải tổ 24/11».
  - ADR-003 không áp dụng cho repo này.
  - Không sửa gì ở ops-web.
- **Bỏ hạn theo ngày** («Ngày 1–2», «Ngày 3–6», «Tuần 2»). Mỗi chặng chỉ có điều kiện vào và điều kiện xong, đo bằng lệnh.
- **Trả lời Phần 6 của kế hoạch gốc** (chi tiết và mục «nếu im» ở 03 §6 A):
  - A1: chạy trọn 0 → 3.
  - A2: đồng ý, qua cổng deploy và D1.
  - A3: đồng ý.
  - A4: đồng ý cho Chặng 2, sau khi đo định dạng hash ở prod.
- **Các điều kiện sửa dưới đây là `[ĐỀ XUẤT]` của Claude** (03 §6 A5). PO im thì vẫn áp dụng, vì chúng chỉ thêm bước kiểm.

### 6.1 Nguyên tắc

- **Bước chạm prod luôn là cổng PO:** deploy, migration, ghi dữ liệu, đổi quyền người dùng thật, xóa không khôi phục.
- **Chặng sau chỉ mở khi chặng trước xong**, tức lệnh «Xong khi» chạy xanh. Riêng nghiệm thu người dùng thật (§6.6) chạy song song.
- **Trong Chặng 1 không mở tính năng mới.** Lỗi người dùng báo và lộ dữ liệu vẫn sửa theo sổ lỗi.
- **Giữ thứ tự module của PO và cổng `module:gate`.**
- **Không viết lại engine lâm sàng.** Lệch chỉ số thì sửa hàm chỉ số.

### 6.2 Chặng 0: dọn nền, hàng rào máy

**Vào khi:** ngay.

**Việc:**
1. **Gắn tag sao lưu trước khi đụng nhánh:** `archive/pre-overhaul-chore-20261124` (nhánh `chore/code-vs-ai-phase1`) và `archive/pre-overhaul-main-20261124` (nhánh `main`).
2. **Gộp tài liệu: một file kế hoạch (01), một file báo cáo (03).** Đã làm 24/11 ở nhánh `gom-tai-lieu`.
   - 03 thay `STATUS.md` của kế hoạch gốc.
   - Bản cũ gỡ khỏi cây mã, khôi phục bằng `git show` (§8).
3. **File ngoài mã ở gốc checkout chính** (xlsx, py, sql untracked): PO chọn chuyển ra ngoài repo hay đưa vào repo. Không xóa khi PO chưa nói.
4. **Đưa `main` lên `integrate/2026-11`.** Bước này = deploy production 237 commit. Cổng: «deploy» + D1 (03 §6 D).
   - Trước khi deploy: áp thử chuỗi 12 migration `20261119*` trên bản sao DB.
   - Sau khi deploy:
     - Smoke VST/GSC.
     - Kiểm bốn việc «chưa kiểm sau deploy 17/11» (03 §4).
     - Truy vấn 7 cột prod (§6.7).
   - Đường lùi: Vercel quay về `e908e7e0`.
5. **Dọn worktree và nhánh dư.** Chỉ dọn sau khi kiểm không còn phiên nào đang mở trên đó, và PO đồng ý (A2).
6. **Hàng rào và rút gọn:**
   - `CLAUDE.md` ≤ 50 dòng.
   - `.claude/gate.sh` gồm typecheck, lint, test.
   - Rút npm script về bộ chuẩn.
   - Giữ các guard đang có tác dụng: `so-loi.mjs check`, `guard-migrations`, `guard-adr`, `gate-integrity`, stop hook.
   - Sáu guard chưa nối (§6.7): nối hoặc bỏ, ghi lý do.
   - Gộp `docs/core/handover-roadmap.md` §5 vào §6 này, rồi sửa `scripts/module-audit.mjs` để đọc ở đây.
   - Nối `node scripts/ui-audit.mjs --check` vào `verify:quick` (UI lát 6).
7. **ESLint chặn theo cấu trúc** (danh sách ngoại lệ chỉ được giảm):
   - Component trình duyệt không import cổng DB phía server.
   - Action không tự mở admin client hay user client ngoài `guard`.
   - Một helper `uuidLikeSchema` thay cho `z.uuid()` rải rác.
8. **Lỗi vặt:**
   - Hàng đợi offline: lỗi vĩnh viễn (khu vực sai, bảng kiểm tắt, không có quyền, quá cửa sổ) chuyển sang «chờ người xem». Không âm thầm bỏ dữ liệu. Nút hủy đã có từ `2222a336`.
   - Thêm `.env.test` tắt `KSNK_BREAK_GLASS_EMAILS` và cờ pilot. `db-dung.sh` dùng tài khoản seed cố định.
   - Mã chết: chỉ xóa theo danh sách PO duyệt (`destructive-change`).
9. **Baseline schema (Squash 4b).**
   - Chuẩn so sánh là dump prod: PO chạy `pg_dump --schema-only`, hoặc ủy quyền MCP supabase.
   - Không lấy chuỗi local làm chuẩn: 28 migration đã bị sửa sau khi áp. Lần thử trước LỆCH 632 dòng (03 §4).
   - Gồm cả Q7 (§6.7) và file K5 còn trong repo.
10. **Kiểm kê trên prod** (chỉ đọc):
    - Các job `pg_cron` (`select * from cron.job`).
    - Phụ thuộc vào `pg_net`, `vault`, `supabase_functions`.
    - Định dạng hash mật khẩu trong `auth.users`.

    Kết quả quyết điều kiện vào Chặng 2.

**Xong khi:**
- `git worktree list` chỉ còn worktree đang dùng.
- `.claude/gate.sh` thoát 0.
- `CLAUDE.md` ≤ 50 dòng.
- Baseline dựng DB sạch, và so với dump prod 0 dòng lệch (ngoài danh sách chấp nhận có lý do).
- Prod chạy mã `integrate`, smoke VST/GSC đạt.

**Cổng PO:** deploy · dọn worktree · xóa file · dump hoặc đọc prod.

### 6.3 Chặng 1: bỏ RLS policy, kiểm quyền tập trung ở TypeScript

**Vào khi:** Chặng 0 xong; prod chạy mã `integrate`.

**Việc theo kế hoạch gốc:**
- `src/lib/db/server-db.ts` (`createServerDb({ actorId })` gửi header `x-ksnk-actor`).
- `ksnk_sec.actor_id()`.
- Gộp bốn chỗ kiểm quyền về `src/lib/authz/guard.ts` và `permissions.ts`.
- `PermissionProvider.tsx` chuyển sang server action. `ChecklistItem.tsx` chuyển sang `POST /api/evidence/upload` với `StorageAdapter`.
- Chuyển mọi file dùng user client hoặc admin client sang `guard`. Số đo 24/11: 53 file dùng user client và 112 file dùng admin client (03 §3.2). Đo lại bằng `grep -rlE "createServerSupabaseUserClient|createAdminSupabaseClient" src | grep -v spec`.

**Sửa bắt buộc trước khi bỏ policy:**
1. **Kiểm kê 17 policy đang lọc theo khoa hoặc theo người** (03 §3.2). Mỗi policy:
   - Có một bộ lọc danh sách ở TypeScript. `guardKhoaScope` chỉ kiểm một id, không đủ.
   - Có test: người khoa A không thấy dòng khoa B; vai HĐ/CNK/NV thấy đúng theo GS-1.
   - Policy nào chưa có bộ lọc kèm test thì không bỏ.
2. **Cắt theo nhóm bảng:** MDM/RBAC → VST/GSC → CSSD/QLCV/Đào tạo → NKBV sau cùng.
3. **Sửa SQL của kế hoạch gốc:**
   - Thu EXECUTE của `authenticated` trên 16 hàm DEFINER (và các hàm khác nó còn gọi được, 59 hàm).
   - Thu SELECT của `authenticated` trên bảng và view, gồm `v_mdm_nhan_su_picker`.
   - Mỗi hàm đổi `auth.uid()` (18 hàm) viết `CREATE OR REPLACE` tường minh, để thân hàm nằm trong repo. Bỏ khối DO viết lại bằng regex.
   - Trước khi bỏ, dump định nghĩa policy hiện có thành SQL tạo lại, để làm đường lùi.
4. **Duyệt:** `review-bv103` + `security-auditor` một vòng trên migration. Áp thử trên bản sao DB. PO duyệt rồi mới lên prod qua MCP.

**Xong khi:**
- Điều kiện Chặng 1 ở mục 5.1 kế hoạch gốc:
  - `pg_policies` ở `public` = 0.
  - Bảng chưa bật RLS = 0.
  - `anon`/`authenticated` gọi thẳng bảng mẫu bị chặn.
  - `guard()` ghi đúng `actor_id`.
  - Test và e2e pass khi không bật `BREAK_GLASS`.
- Test lọc danh sách của cả 17 policy pass.
- Thao tác mọi màn, DevTools ghi 0 request `/rest/v1` hay `/storage/v1` từ trình duyệt.

**Cổng PO:** migration prod · đổi quyền người dùng thật.

### 6.4 Chặng 2: tách Supabase Auth/Storage, đóng gói máy chủ nội viện

**Vào khi:**
- Chặng 1 đã lên prod và chạy ổn (PO xác nhận).
- Kiểm kê ở Chặng 0 bước 10 xong:
  - Hash ngoài bcrypt (`$2a$`/`$2b$`) thì dừng và bổ sung bộ xác thực.
  - Có job `pg_cron` thì chọn một trong hai: image Postgres có `pg_cron`, hoặc lịch chạy phía app.
- PO chốt A4.

**Việc theo kế hoạch gốc:**
- Bảng `public.sys_user_accounts`, giữ UUID cũ.
- Đổi 2 khóa ngoại khỏi `auth.users`. Sửa 1 hàm đọc `auth.users`.
- `AuthProvider` (`local` | `supabase`), cookie ký HMAC, `session_version`.
- `StorageAdapter`.
- `docker-compose.local.yml`: postgres + postgrest (chỉ mạng nội bộ) + web standalone.
- `backup-db.sh` và `restore-db.sh` có kiểm `.sha256`.

**Bổ sung phạm vi.** Supabase Auth đang lo ba việc này, tách ra thì phải tự làm:
- Quên hoặc đặt lại mật khẩu.
- Khóa tài khoản sau nhiều lần sai.
- Giới hạn tần suất đăng nhập.

**Xong khi:**
- Điều kiện Chặng 2 ở mục 5.1 kế hoạch gốc:
  - Chạy không cần biến `SUPABASE_*`.
  - Đăng nhập bằng mã nhân viên.
  - Khóa tài khoản đá phiên ngay.
  - Ảnh minh chứng GSC lưu trên đĩa local.
  - Restore vào DB trống khớp số dòng VST/GSC.
- Có test cho đặt lại mật khẩu, khóa sau nhiều lần sai và giới hạn tần suất.

**Cổng PO:** A4 · migration prod · chuyển tài khoản thật.

### 6.5 Chặng 3: chuẩn hóa kiến trúc, chạy sau go-live, không chặn

Mỗi mục là một lát riêng, PO duyệt:
- Drizzle + `pg` cho tính năng mới và giao dịch nhiều bước.
- Rút 5 hàm SQL hay bị vá nhất về TypeScript, kèm test tính tay khớp 0 sai số.
- Một khung module thống nhất. Tách các component lớn: `NkbvBaMultiTimelineWorkspace.tsx` và `NkbvSyndromeIwpPanel.tsx`.
- Cân nhắc lấy từ ops-web: PEP, MDRO 24h, ICRA, 24 chỉ số.

### 6.6 Nghiệm thu người dùng thật (chạy song song, A3)

**Thứ tự:**
1. Nhóm 1: VST, GSC, Dashboard, Quản trị.
2. Nhóm 2: CSSD (các trạm), Sự cố, Hóa chất.
3. Nhóm 3: QLCV, NKBV, Đào tạo.

Giữ ẩn Chất thải & Đồ vải.

**Mỗi module:** ≥ 3 kịch bản tay do người có tên chấm, ghi vào sổ bằng `so-loi.mjs tay <ID> DAT|KHONG_DAT "<người chấm>"`.

**Tiêu chí riêng từng module** (bản PO duyệt 16/11, giữ nguyên):

| Module | Xong khi |
|---|---|
| VST/GSC | Nhập < 60 giây (bấm tay) · thống kê khớp tính tay (GSC chưa đối soát) |
| CSSD | Số đo các trạm · truy vết một bộ < 1 phút · `npm run test:cssd` pass |
| NKBV | 5 lỗi NHSN đã sửa, rồi ≥ 9/10 ca khớp |
| QLCV | ≥ 20 việc thật · ≥ 3 người dùng · 2 tuần |
| Đào tạo | ≥ 20 bài nộp |

**Cần trước:** tên đầu mối (03 §6 N3). Module chưa có đầu mối thì chưa vào nghiệm thu.

### 6.7 Việc còn sống từ kế hoạch cũ

Nguồn cũ khôi phục bằng `git show 2222a336:<đường dẫn>` (§8).

| Việc | Nguồn cũ | Xếp vào |
|---|---|---|
| Truy vấn 7 cột prod mà lát L12a/L12b thôi dò. Thiếu cột thì `git revert 278334e8 1e1a1a8d` | `.claude/plans/KH_APPKSNK_20261116_lam-gon-ma.md` dòng 391–406 | Chặng 0 bước 4 |
| Squash 4b: baseline thay chuỗi migration | `.claude/plans/KH_APPKSNK_20261118_squash-migration.md` | Chặng 0 bước 9 |
| Sáu guard chưa nối gate: `engineering:contract:gate:strict`, `gstt:scoring:audit`, `guard:cssd-red-alert-view`, `smoke:cssd-station-map`, `sql:object-refs`, `verify:danh-muc-routes` | `.claude/plans/KH_APPKSNK_20261118_cat-script.md` dòng 37–42 | Chặng 0 bước 6 |
| Q5: policy `Authenticated users can read dm_khoa_phong` có trên prod nhưng không có trong migration nào | `.claude/plans/KH_APPKSNK_20261117_lo-prod-pha1.md` dòng 143 | Chặng 1: bảo đảm đường đọc khoa phòng đi qua server trước khi bỏ policy |
| Q7: `dao_tao_cau_hoi` trên prod thiếu 7 cột và 3 index, không có migration | như trên, dòng 145 | Chặng 0 bước 9; PO chọn viết migration hay bỏ tính năng |
| Q8: 6 bảng `zz_sao_luu_20261112_*` trên prod | như trên, dòng 146 | Xóa sau nghiệm thu Nhóm 1; cổng `destructive-change` |
| Lát ẩn module bằng `KSNK_PILOT_FOUR_MODULES` | `.claude/plans/KH_APPKSNK_20261117_thu-hep-len-prod.md` lát 2 | §6.6: ẩn Nhóm 3 tới lượt; PO bật cờ trên Vercel (03 §6 N2) |
| Giao diện, lát 5–7. Lát 5 (Thống kê) phần lớn đã làm theo canvas v5 ngày 11/11. Lát 6 nối ratchet `ui-audit --check`. Lát 7+ chuyển module khác. Còn mở: cảnh báo ESLint sẵn có ở NKBV/Dashboard/Chất thải; 2 hàng điều hướng Quản trị cao 38px; `radiusArbitrary` 335 → 336 chưa rõ file; nhãn «so với tuần trước» GSC dễ hiểu nhầm (đổi nhãn cần Spec change) | `docs/ux/ui-redesign-plan.md` §6, §9–10 | Lát 6: Chặng 0 bước 6. Phần còn lại theo nhóm nghiệm thu |
| CSSD: mẻ hỏng về Tiếp nhận (C6) · nợ `batchStatusAfterBiRecall` (03 §7) · các mục mở CSSD-040…049 trong sổ lỗi | `.claude/plans/KH_APPKSNK_20261113_dung-lai-theo-dac-ta.md` (L4); `docs/core/handover-roadmap.md` dòng 79 | Nhóm 2 |
| Cột `cssd_dm_thiet_bi.ma_qr_thiet_bi` chưa có trong migration nào, nên 2 nhánh dò cột (`src/modules/cssd-erp/actions/cssd-bao-tri-list.actions.ts:70`, `src/modules/cssd-erp/shared/application/cssd-qr-hub.ts:132`) luôn rơi vào nhánh «không có cột». PO 16/11 đồng ý thêm cột khi máy CSSD cần mã QR riêng; không cần thì gỡ 2 nhánh | bản 01 ngày 16/11, ghi chú Pha 3 | Nhóm 2; hỏi PO: 03 §6 K4 |
| XM-2, cỡ mẫu. KH 13/11 ghi: R1.14 nêu mẫu tối thiểu 100/tháng, app đang 20. Khóa PO 01/11 ghi 50 theo khoa/kỳ. Số app đang dùng: cần kiểm | KH 13/11 dòng 3 | Hỏi PO: 03 §6 K9 |
| Mã kho tri thức chờ PO: X2.13, QT.32, R1.10. Nội dung từng mã: cần kiểm | `.claude/plans/KH_APPKSNK_20261114_doi-chieu-nguon-va-mo-rong.md` dòng 72 | Hỏi PO: 03 §6 K9 |
| File K5 `20261114180000_nkbv_fact_select_rls_hoi_dong_identity.sql` còn trong repo dù không áp prod | 03 §4 | Chặng 0 bước 9 (baseline). `guard-migrations` cấm xóa file có version ≤ `PROD_HEAD`, nên chỉ xử lý được trong baseline |
| CI `db-dung.yml` chỉ chạy sau push: theo dõi lần đầu (trần 30 phút, cache Playwright) | `.claude/plans/de-xuat-mot-con-duong-20261119.md` §6, §10 | Sau D3 |
| Thử tay sau lát làm gọn mã chưa ai làm | `KH_APPKSNK_20261116_lam-gon-ma.md` §9 | Nhóm 1 |

### 6.8 Luật dừng (dừng và báo PO)

**Từ kế hoạch gốc, mục 5.3:**
- Prod có trigger, view hoặc hàm phụ thuộc ẩn vào `auth.users`, `pg_net`, `vault` hay `supabase_functions`.
- Prod có hash ngoài bcrypt.

**Bổ sung:**
- Một migration lỗi: dừng, không áp tiếp.
- Bộ lọc TypeScript của một policy chưa có test: không bỏ policy đó.
- E2e chỉ xanh khi bật `BREAK_GLASS`: tính là đỏ.
- Baseline còn lệch dump prod: không dùng baseline cho prod.
- Giữ từ bản 16/11:
  - Không giao agent «quét» module chưa có người dùng.
  - Câu hỏi PO gom một chỗ (03 §6).
  - Áp prod theo lô PO duyệt.

### 6.9 Rủi ro

1. **Lộ dữ liệu người bệnh khi bỏ policy trước khi có bộ lọc thay thế.** Chặn bằng điều kiện ở §6.3 và cắt NKBV sau cùng.
2. **Deploy 237 commit một lần.** Có smoke và đường lùi về `e908e7e0`. 4 migration `20261118*` đã ở prod chạy được với mã cũ hay không: cần kiểm trước khi lùi.
3. **Baseline lệch prod.** Chỉ dùng cho local/CI sau khi khớp dump.
4. **Chặng 2 mất chức năng Supabase Auth đang lo.** Đã bổ sung phạm vi ở §6.4.
5. **Không có người dùng thật nên nghiệm thu không đạt.** Cần N3.
6. **Tài liệu phình lại.** Chỉ có 01, 02, 03. Nháp plan mode gộp xong thì xóa.

## 7. Cách triển khai

- **Môi trường.**
  - Làm ở worktree `.claude/worktrees/integrate-2026-11` (nhánh `integrate/2026-11`).
  - DB local (Docker): `npm run trial:prep`. Schema: `npm run mdm:migrate:local`, rồi `verify:mdm:local`.
  - Dev: `dev-local-integrate`, cổng 3001, DB local.
  - Local là bản gốc. Prod chỉ đi qua MCP `apply_migration`; `mdm:migrate` bị chặn.
- **Vòng một lát** (skill `lam-het`): đo việc mở (`wip.py`) → thẻ việc (Sản phẩm · Xong khi ≤ 3 · Ngoài phạm vi · Cỡ · Cần người) → làm → verify → review (không áp cho docs/copy) → commit cục bộ → ghi tiến độ.
  - Trần: ≤ 8 file mỗi task. Hơn 3 file ngoài scope thì hỏi PO.
  - Sửa lỗi: viết test tái hiện (fail) trước.
  - Trước khi sửa bảng, view, RPC hay file dùng chung: `npm run impact -- <tên|file>`.
- **Verify theo file đổi:** `npm run verify:changed` (thêm `-- --dry` để xem lệnh sẽ chạy).

  | Vừa đổi | Lệnh |
  |---|---|
  | Action hoặc `fact_*` | `verify:engineering` |
  | Schema (linked) | `verify:mdm` |
  | Docs | `docs:links:check` |
  | UI thuần | `verify:quick` |
  | Trước push | `verify` |

  CI `verify` gồm lint, lint:cssd-architecture, test:coverage (chỉ báo cáo), verify:engineering và build. Job `sync-check` đang SKIP vì thiếu secret `SYNC_CHECK_DB_URL`.
- **Agent và model.**
  - Mặc định Sonnet. Haiku chỉ cho việc cơ học.
  - Opus chỉ cho `migration-author` và reviewer vùng RLS/migration/auth (`review-bv103`, `security-auditor`).
  - Một agent ghi repo mỗi lúc (mỗi agent ghi một worktree riêng). Agent chỉ đọc tối đa 4 song song (`CLAUDE.md`, PO 2026-11-11).
  - Giao việc bằng agent ghim sẵn, không dùng agent chung.
- **Sổ và cổng.**
  - `node scripts/readiness/so-loi.mjs <status|next|check|set|tay|stats|merge>` (dữ liệu ở `scripts/readiness/so-loi.json`) là số chuẩn cho «việc mở».
  - `npm run module:gate` và `npm run module:audit` cho cổng module.
- **Commit, push, prod.**
  - Commit cục bộ khi verify và review pass, chỉ gồm file đã sửa.
  - Push chỉ khi PO gõ «push». PR hỏi từng lần. Deploy Vercel chỉ khi PO gõ «deploy».
  - Migration hoặc ghi DB prod chỉ khi PO ra lệnh trong chính lượt đó.
  - Không bao giờ mở: `_agent-*.md`, CDC/NHSN thô, `node_modules/`, `.next/`, `.env*`.

## 8. Bản đồ nguồn (2026-11-24)

**Đã gỡ khỏi cây mã.** Khôi phục bằng `git show 2222a336:<đường dẫn>`.

| File cũ | Loại | Phần còn sống nằm ở |
|---|---|---|
| `.claude/plans/KH_APPKSNK_20261113_dung-lai-theo-dac-ta.md` | kế hoạch | §5, §6.7 |
| `.claude/plans/KH_APPKSNK_20261114_doi-chieu-nguon-va-mo-rong.md` | kế hoạch | §3, §6.7 |
| `.claude/plans/KH_APPKSNK_20261116_lam-gon-ma.md` | kế hoạch | §6.7 |
| `.claude/plans/KH_APPKSNK_20261117_lo-prod-pha1.md` | kế hoạch | §6.7; 03 §4 |
| `.claude/plans/KH_APPKSNK_20261117_thu-hep-len-prod.md` | kế hoạch | §6.7 |
| `.claude/plans/KH_APPKSNK_20261118_cat-script.md` | kế hoạch | §6.2, §6.7 |
| `.claude/plans/KH_APPKSNK_20261118_squash-migration.md` | kế hoạch | §6.2, §6.7; 03 §4 |
| `.claude/plans/de-xuat-mot-con-duong-20261119.md` | kế hoạch | `CLAUDE.md` §«Luồng một con đường»; §5 |
| `docs/ux/ui-redesign-plan.md` | kế hoạch giao diện | §6.7. Code còn trỏ tới §4 của file này (`src/components/ui/bv103/button.tsx`, `scripts/ui-audit.mjs`, `scripts/ui-codemod-type-scale.mjs`) |
| `KE-HOACH-CAI-TO-TOAN-DIEN-2026-11-24.md` (gốc checkout chính, ngoài git) | kế hoạch gốc 24/11 | §6. Nguyên văn (mẫu `server-db.ts`, danh sách file theo cụm) chỉ còn ở file đó, chưa vào git |

**Còn giữ:**

| Nhóm | Tài liệu | Ghi chú |
|---|---|---|
| Lát đã duyệt cho `module:gate` | `docs/core/handover-roadmap.md` §5 | Gộp vào §6 ở Chặng 0 bước 6 |
| Nghiệp vụ chi tiết, đọc khi làm đúng lát đó | `docs/modules/<module>/` và `van-de-nguoi-dung.md` từng module (nhãn `[SSOT]` · `[GIẢ THUYẾT]` · `[CẦN XÁC NHẬN]` · `[ĐỀ XUẤT]`) | Tóm tắt ở 02 |
| Quyết định có hiệu lực | `docs/adr/` | `guard-adr` đòi migration mới dẫn ADR |
| Máy đọc hoặc máy sinh | `scripts/readiness/so-loi.json` · `supabase/migrations/` · `docs/data/` · `docs/wiki/index.md` | Không sửa tay |
| Ngoài repo, văn bản thường | Kho tri thức `~/Desktop/KSNK_BENH_VIEN_103`: bản nháp; có QT KSNK và đặc tả 09 | Chỉ tra, không sao chép |
