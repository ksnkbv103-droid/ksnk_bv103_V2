# Một con đường duy nhất cho APPKSNK — PO DUYỆT (2026-11-19)

PO duyệt ngày 19/11: chọn «Duyệt cả 3» đáp án đề xuất ở §9. Chưa sửa config, CI hay migration nào; thực thi bắt đầu từ §8 Lát 1.

- Số đo lấy trên `integrate/2026-11` ngày 19/11.
- Phiên thực thi mở tại worktree `integrate-2026-11`.
- Bản chẩn đoán trước nằm ở scratchpad phiên 67f25df3 (`de-xuat-luong-chuan.md`).

## 1. Kết luận

**Nhiều luồng, nhiều nơi ghi trạng thái.** Có khoảng 10 luồng chạy chồng nhau: lam-het, superpowers, /intake, /intake-nv, /domain-slice, /implement, /review, /ra-soat, chạy nối sổ lỗi, plan mode. Trạng thái được ghi ở ít nhất 6 nơi.

**Code chưa gắn với đặc tả.** Theo `npm run trace`, đặc tả 09 (M01–M15) có 688 quy tắc R và 539 ca T. Mới có 16 quy tắc R và 3 ca T được code hoặc test dẫn mã.

**«Quá nhiều SQL» có 3 gốc:**
1. Mỗi lần sửa hàm hay policy lại chép nguyên vào migration mới. Kết quả: 323 lần định nghĩa cho 165 hàm.
2. CI chỉ so tên migration (`ci.yml:85`) mà không dựng DB (`ci.yml:117`).
3. Migration đã áp vẫn bị sửa:
   - `f44b7705` biến `20260729121000` thành stub, làm chuỗi dựng sạch gãy (squash plan:100).
   - Thêm 28 file khác bị sửa sau khi đã áp.

**Làm song song nhiều module, không module nào đi hết tới tay người dùng.** Theo số đo ngày 11/10:

| Module | Mức dùng (11/10) | Migration sau 11/10 (theo tên file) |
|---|---|---|
| VST + GSC | VST 3.452 phiên, 6 giám sát viên | 6 + 3 |
| CSSD | 2 mẻ thử | 45 |
| QLCV | 0 | 11 |
| NKBV | 1 phiếu | 7 |

**Kết quả thử tay chưa phải bằng chứng.** 57 kịch bản ĐẠT, 0 KHÔNG ĐẠT, nhưng tất cả do Claude tự chấm.

## 2. Thứ bậc nguồn (hai nguồn lệch nhau thì nguồn ở cột 2 thắng)

| Câu hỏi | Nguồn gốc | Không dùng làm gốc |
|---|---|---|
| Nghiệp vụ phải làm gì | 1. Đặc tả 09 `~/Desktop/KSNK_BENH_VIEN_103/09_DOMAIN_PHAN_MEM/02_DAC_TA/M01–M15` và QT bệnh viện<br>2. Khóa PO (`CLAUDE.md:38`) | Trí nhớ chat, plan cũ |
| App diễn giải nghiệp vụ thế nào | `docs/bo-tai-lieu/02-nghiep-vu-domain.md`, dẫn mã R/T | — |
| Schema đang có | 1. DB do CI dựng từ chuỗi migration<br>2. Prod, chỉ đọc | Đoán tên |
| Việc đang mở và tiến độ | Sổ `so-loi.mjs` (gọi tắt: sổ) là nơi ghi duy nhất | HANDOFF, SO_NO, roadmap §5, mục tiến độ của 03 — các nơi này chỉ trỏ đường hoặc sinh ra từ sổ |
| Người dùng thấy có đúng không | Người dùng có tên chấm kịch bản | Claude tự chấm |

## 3. Con đường: `lam-het` làm xương sống, qua 7 cổng

Không thêm luồng mới. Thẻ việc của lam-het thêm 3 trường:
- `Người dùng`: vai người dùng theo đặc tả. Tên người thật chỉ cần ở cổng 7.
- `Mã đặc tả`: mã R (quy tắc) và mã T (ca kiểm thử dùng làm đáp án cho test).
- `Phương án`: ít nhất 2 phương án, kèm «điều gì sẽ làm phương án được chọn sai».

| # | Bước | Đầu ra | Cổng do máy kiểm | Ai làm |
|---|---|---|---|---|
| 1 | Nhận yêu cầu | 1 dòng sổ có vai người dùng và mã R | `so-loi.mjs check` fail nếu thiếu | Claude |
| 2 | Spec 1 trang (`/intake`) | Thẻ việc đủ trường; phương án ghi vào trường sổ `phuong_an` | `so-loi.mjs set <ID> DANG_SUA` bị chặn khi dòng `tinh_nang` thiếu `phuong_an` | Claude |
| 3 | Phản biện | Phiếu phản biện, ghi vào trường sổ `phan_bien` | Thiếu `phan_bien` thì `set DANG_SUA` bị chặn; chi tiết dưới bảng | `phan-bien` (độc lập) |
| 4 | PO duyệt | Duyệt một lần, ngày duyệt ghi vào trường sổ `duyet` | PO gõ «duyệt»; thiếu `duyet` thì `set DANG_SUA` bị chặn | PO |
| 5 | Làm | Một lát đi theo thứ tự DB → BE → FE, tối đa 1 migration. Code dẫn `@dac-ta R…`; test và e2e dẫn `@dac-ta T…`, với đáp án lấy từ ca T của đặc tả chứ không do Claude tự đặt | `verify:changed` pass, `trace` tăng đúng mã của lát, e2e của lát chạy local trên DB seed | Claude |
| 6 | CI | lint, test, build, dựng DB từ cả chuỗi, kiểm migration bất biến | Đỏ thì chặn merge | Máy |
| 7 | Người dùng thử, rồi deploy — **một lần mỗi module, trước khi đưa vào dùng thật**, không phải mỗi lát | ≥ 3 kịch bản, chấm ĐẠT | ĐẠT do người dùng có tên chấm; deploy khi PO gõ «deploy» | Người dùng, PO |

Trong giai đoạn phát triển, cổng 1–6 không cần người dùng thật: ca T của đặc tả đóng vai đáp án độc lập với code.

Cổng của bước 3:
- `phan-bien` nhận spec nhưng không nhận lập luận của người viết.
- Phải trả về ≥ 1 phản đối có bằng chứng, hoặc «không phản đối» kèm số đo.
- Mỗi phản đối phải có câu trả lời.

**Đường tắt cho sửa lỗi:** việc có `loai=loi` đi 1 → 5 → 6, bỏ qua bước 2–4. Vòng xác minh lỗi trong `CLAUDE.md:49-51` vẫn giữ.

## 4. Biện pháp giữ phản biện cao

- **Phản biện mù.** Reviewer nhận yêu cầu, diff và kết quả verify. Reviewer không nhận lập luận của người viết. Quy tắc này đã có, giữ nguyên.
- **Pre-mortem bắt buộc.** Mỗi phương án trong `phuong_an` phải có «điều gì làm phương án sai»; thiếu thì `set DANG_SUA` bị chặn (Lát 2).
- **Phản biện bằng số.** Đề xuất mở rộng phạm vi phải kèm số dùng thật (số phiên, số người dùng). Không có số thì không mở.
- **Đo chính việc phản biện.** `stats` theo dõi tỉ lệ lỗi giả và số KHÔNG ĐẠT. Nếu sau ≥ 20 kịch bản do người dùng chấm mà KHÔNG ĐẠT vẫn = 0, máy gắn cờ nghi chấm dễ.
- **Người ngoài chấm.** Tổ giám sát KSNK chấm kịch bản tay. Claude chỉ chạy e2e và tiền kiểm.

## 5. Chuẩn sạch (đã có sẵn, ở đây chỉ trỏ đường và thêm 2 điều)

- **DB:** theo `engineering-guidelines.md` và `smart-db-bv103`. Thêm 2 điều:
  - Migration đã có trong repo là bất biến.
  - Một lát có tối đa 1 migration.

  Sau squash sẽ cân nhắc `supabase/schemas/`. Chưa làm vì pg-delta còn alpha.
- **BE:** action → zod → RBAC → RPC.
- **FE/UI:**
  - Dùng thuật ngữ theo `02-nghiep-vu`.
  - Màn hình đi theo kịch bản của người dùng có tên.
  - Redesign theo `docs/ux/ui-redesign-plan.md` §9–10.

## 6. Công cụ (máy làm, không giao AI)

| Công cụ | Làm gì | Lát |
|---|---|---|
| Script `npm run db:dung` (chạy local) và workflow riêng `.github/workflows/db-dung.yml` gọi lại chính script đó. `ci.yml` giữ nguyên | Xem chi tiết dưới bảng | 1 |
| `scripts/migration-bat-bien.mjs` | So với nhánh gốc. File migration có trạng thái M hoặc D thì fail. Ngoại lệ: commit squash có lệnh phá hủy | 1 |
| Thêm 6 trường cho sổ: `nguoi_dung`, `ma_dac_ta`, `loai` (`loi` hoặc `tinh_nang`); và 3 trường cổng phản biện: `phuong_an` (≥ 2 phương án, mỗi cái có «điều gì làm phương án sai»), `phan_bien` (kết quả `phan-bien`: ≥ 1 phản đối có bằng chứng kèm câu trả lời, hoặc «không phản đối» kèm số đo), `duyet` (ngày PO duyệt) | `check` fail khi việc `tinh_nang` thiếu trường. `set <ID> DANG_SUA` thoát khác 0 khi dòng `tinh_nang` thiếu `phuong_an`, `phan_bien` hoặc `duyet`; việc `loi` không bị chặn (đường tắt 1 → 5 → 6). `next` chỉ trả việc tính năng của module đang làm (một module một lúc). 166 dòng hiện có được điền mặc định `loai=loi` để `check` không đỏ ngay | 2 |
| `so-loi.mjs report` | Sinh mục tiến độ trong `03-tien-do`, nằm giữa 2 dấu mốc | 2 |
| `trace` trong `verify:changed` | Chạy khi đổi `src/modules/**`. Chỉ chạy local, vì đặc tả nằm ngoài repo nên CI không đọc được | 2 |

`db:dung` làm 3 việc:
- Dựng stack Supabase (`supabase start`) rồi áp cả chuỗi migration. Không dùng Postgres trơn, vì 37 file migration cần schema `auth`/`storage` và các vai `authenticated`.
- Dùng bản thay cho `20260729121000`, đúng quyết định PO ngày 18/11 (squash plan:121).
- Chạy `audit:views`.

Đỏ thì chặn merge.

## 7. Gom luồng, tài liệu, trạng thái

**Luồng:**
- Đặt 1 bảng luồng (mục 3) vào CLAUDE.md dự án, thay khối «Đang làm / Chạy nối» dài.
- Ghi «không dùng — xem bảng luồng» vào `/intake-nv`, `/domain-slice`, `/ra-soat`. Không xóa file.
- Tắt plugin superpowers cho dự án.

**docs/core:** gộp `governance-pipeline` (32 dòng), `lean-execution` (46) và `read-minimum` (24) vào `engineering-guidelines`. Sau khi gộp còn 10 file (13 − 3; bản đầu ghi nhầm 11), vẫn trong trần 13 (`CLAUDE.md:62`).

**Trạng thái:**
- Sổ là nơi ghi duy nhất.
- HANDOFF dưới 6000 byte, chỉ trỏ đường (đã như vậy).
- SO_NO chuyển dần vào sổ.
- Roadmap §5 trỏ về sổ.

## 8. Thứ tự lát (ghép với KH thu hẹp lên prod)

| Lát | Nội dung | Xong khi | Cần người |
|---|---|---|---|
| 1 | Dựng DB, kiểm migration bất biến, `db lint` có mốc (§10 #4, #6) (≤ 5 file) | 1. `npm run db:dung` xanh ở local, gồm `audit:views` và `db lint` không vượt mốc đã ghi ở `scripts/data/db-lint-baseline.json`<br>2. Sửa thử một migration cũ thì `migration-bat-bien.mjs` thoát khác 0 (chạy local)<br>3. `db-dung.yml` có trigger push `integrate/**` + PR và gọi `db:dung`; `git diff --stat` không có `ci.yml` | Kết quả CI chỉ thấy sau khi PO gõ «push» |
| 1b | pgTAP + type sinh (§10 #1, #2) | Xem cuối §10 | Như Lát 1 |
| 1c | e2e trong CI (§10 #5) | Xem cuối §10 | Như Lát 1 |
| 2 | Sổ thêm 6 trường, gồm cổng phản biện 2–4 do máy kiểm (§6); `report` cho 03, `trace` trong verify; `dac-ta-test.mjs`; 3 số đo luồng (§10 #3, #8) (≤ 5 file; cổng phản biện nằm trong `so-loi.mjs` nên không thêm file) | 1. `check` fail với dòng `tinh_nang` thiếu trường, và `set <ID> DANG_SUA` thoát khác 0 trên dòng `tinh_nang` thử thiếu `phan_bien`<br>2. `report` khớp `stats`<br>3. `verify:changed --dry` có liệt kê trace | Không |
| 3 | Gom luồng và tài liệu theo §7; cấu hình theo §11 và §12 (cờ `disable-model-invocation`, skill DB chính thức ghim sha, bước so schema prod + lỗi runtime trong `/go-live-check`, chép bảng §12 vào `docs/core/skills-catalog.md`) (≤ 8 file tự viết; ≤ 6 file skill chép nguyên văn từ §12 #1 tính riêng) | 1. `docs:links:check` pass<br>2. docs/core còn 10 file (13 − 3)<br>3. CLAUDE.md có đúng 1 bảng luồng và `grep -L disable-model-invocation` trên `/commit`, `/pr-create` rỗng | PO bật `typescript-lsp` (`~/.claude/settings.json`) và tắt superpowers ở mục Plugins của app: đều là cấu hình toàn cục |
| Tiếp | VST/GSC: deploy lát B (drawer) và trang kế hoạch giám sát; TC09 | PO xem prod | PO gõ «deploy» |
| Sau | Squash 4b, giữ quyết định 18/11 | `db-dung` xanh với baseline | `destructive-change` và TC09 |
| Sau | CSSD → NKBV → QLCV → ĐT, làm lần lượt từng module | Phát triển: e2e theo ca T xanh. Đưa vào dùng thật: người dùng có tên chấm ≥ 3 kịch bản | PO, ở bước đưa vào dùng thật |

**Kết quả Lát 1 (19/11, integrate):** `npm run db:dung` XANH local (315 migration, ledger 315, dựng 30 s, cả lệnh 42 s; db lint 1 lỗi = mốc 1; audit:views 0 view thừa). Mốc tạm 0 → EXIT 1. Bất biến là cờ `guard-migrations.mjs --bat-bien` (không tạo `migration-bat-bien.mjs`); `--base 'f44b7705^'` → EXIT 1. `db-dung.yml` đã viết, CI chỉ thấy sau «push». `--base origin/main` FAIL vì `aecd3eb6` xóa `20261114180000_…` (SO_NO). Cỡ 6 file (plan ≤ 5, trần dự án 8).

**Kết quả Lát 3 (19/11, integrate, commit `90d8e40a`):** (1) `docs:links:check OK`; (2) `ls docs/core | wc -l` = **10** (13 − 3; plan ghi nhầm 11, đã sửa ở §7, §8, §10); (3) CLAUDE.md có 1 bảng luồng (`grep -c "^| # | Bước"` = 1), `grep -L disable-model-invocation` trên `/commit`, `/pr-create` rỗng. `verify:changed`: gate-integrity, trace-dac-ta, docs:links:check, verify:engineering, verify:mdm:local, vitest related, verify:quick đều PASS, EXIT=0. `engineering-guidelines.md` 85 → 198 dòng (§4 LEAN, §5 Schema & ship gồm luật migration bất biến + `db-dung.yml`, §6 Đọc tối thiểu); 3 file gốc xóa, tra bản cũ bằng `git show 3312cfe8:docs/core/<tên>.md`. Skill DB chính thức chép ở `.claude/skills/supabase-postgres-best-practices/` (SKILL.md + 5 tham chiếu, sha `c9be0e93…` ghi ở `skills-catalog.md` §9 dòng 1). `skills-catalog.md` có thêm §9 = bảng 16 dòng của §12. `go-live-check` thêm bước 7 (so schema prod chỉ đọc) và 8 (lỗi runtime Vercel sau deploy). Cỡ: 13 file viết tay (plan ≤ 8; 6 file chỉ 1–2 dòng: 2 cờ, 4 ghi chú «không dùng») + 24 file chỉ sửa link bằng sed + 6 file skill chép. Không chạm `~/.claude/settings.json`: PO bật `typescript-lsp` (`false` → `true`) và tắt superpowers ở mục Plugins của app, sẽ ghi thành bước cụ thể trong `CAU_HOI_PO_APPKSNK.md` (phần B).

**Kết quả Lát 1b (19/11, integrate, commit `b37a01d7` + `fa7f96cb`) — ĐẠT 3/3:** (1) `npm run db:dung` XANH sau khi Docker Desktop khởi động lại: dựng 29 s, 315 migration, ledger 315, db lint 1 lỗi ≤ mốc 1, `audit:views` 0 view thừa, pgTAP `supabase test db` `Result: PASS` (`vst_rls.test.sql`, 19 kiểm; trước đó đột biến policy làm 7 kiểm đỏ). (2) Bước 6 in `gen types khớp database.types.ts`; bản sinh từ stack db:dung giống hệt `src/lib/database.types.ts` (diff 0 dòng, 9609 dòng; file không còn «tạm»). Đột biến: thêm 1 dòng vào file → `ĐỎ · gen types lệch`, `exit=1`; `db-dung.yml` chạy đúng `npm run db:dung` nên CI đỏ theo. Lỗi gặp: `gen types --local` ở cổng 55622 báo `DbConnectError … tls error (The server does not support SSL connections)` (JSON ra stdout, log chỉ thấy «Connecting to 127.0.0.1 55622»); sửa bằng `--db-url …?sslmode=disable` và in stdout khi đỏ. (3) `getVstSessionMetadataById` gõ `SupabaseClient<Database>`; `npm run verify:changed` 4/4 PASS (gate-integrity, trace-dac-ta, verify:engineering, verify:quick); đổi `.select("metadata")` thành cột sai → `TS2339`. `getDb` dùng chung không gõ kiểu. `review-bv103` một vòng (19/11, độc lập, chỉ đọc): **Go**, Critical 0 · Major 0 · Minor 4. Plan(19) khớp 19 assert; vai `authenticated` không BYPASSRLS nên test đo đúng policy; bước 5/6 của `db-dung.sh` cộng vào `fail` rồi `exit 1`, không nuốt lỗi; ép kiểu ở `vst.repo.ts` không che lỗi kiểu, không đổi runtime. Minor ghi nợ, chưa sửa (sửa kèm lần chạm `vst_rls.test.sql` kế): (1) bài anon vẫn mang claim `sub` — thêm `set_config('request.jwt.claims','',true)` trước `set local role anon`; (2) S1 vừa do MANG_LUOI giám sát vừa cùng khoa nên chưa tách nhánh `nguoi_giam_sat_id` khỏi `khoa_id` — thêm phiên khoa 2 có `nguoi_giam_sat_id = c3`, `plan` 20; (3) ba vai KHACH_THONG_KE_GSTT / HOI_DONG_KSNK / không vai mới kiểm trên bảng phiên, chưa kiểm `gstt_fact_vst`; (4) cổng `55622` lặp ở URL gen types (chỉ ghi nhận; số dòng reviewer nêu `db-dung.sh:141` không có vì file 118 dòng).

## 9. Câu hỏi PO (đáp án đề xuất in đậm; PO duyệt cả 3 ngày 19/11)

1. Từ nay, migration đã có trong repo có là bất biến không? CI sẽ fail khi có file bị sửa hoặc xóa; muốn đổi chữ thì viết migration mới.
   - **Đề xuất: Có.**
   - Câu này không đảo quyết định 18/11: stub `20260729121000` vẫn giữ, CI dựng DB bằng bản thay giống squash lần 2.
2. Với CSSD, NKBV, QLCV và ĐT: phát triển tiếp, lần lượt từng module, không cần người dùng thật; cổng là mã R/T và e2e theo ca T. Người dùng có tên chấm ≥ 3 kịch bản chỉ cần trước khi đưa module vào dùng thật. Đồng ý không?
   - **Đề xuất: Có.** (đã sửa theo góp ý PO 19/11: phát triển đi trước người dùng)
   - Khớp `CLAUDE.md:29`: «mỗi module cần người dùng + kịch bản tay trước khi coi là xong».
3. Sổ có là nguồn tiến độ duy nhất không, với mục tiến độ của `03-tien-do` sinh ra từ sổ?
   - **Đề xuất: Có.**

Các giả định sau không đưa thành câu hỏi:
- Đầu mối UAT là Tổ giám sát KSNK (đã ghi ở `d8e758db`).
- lam-het giữ vai trò xương sống.
- trace chỉ chạy local.

## 10. Còn thiếu và cách bù (rà lần 2, đo 19/11 trên integrate)

Bản §1–9 lo được «một luồng» nhưng còn 8 lỗ khiến làm chậm, phải sửa tay hoặc sai mà không biết.

| # | Còn thiếu | Bằng chứng | Bù bằng (máy làm) | Lát |
|---|---|---|---|---|
| 1 | Không có test DB/RLS. RLS là vùng rủi ro cao nhất nhưng đang kiểm bằng agent đọc + probe tay | 0 file `supabase/tests` | pgTAP chạy bằng `supabase test db` trong `db:dung`. Lát chạm RLS phải có ≥ 1 test: `policies_are` + cho/chặn theo từng vai (`tests.authenticate_as`) | 1b |
| 2 | Sai tên bảng/cột chỉ lộ khi chạy, không lộ khi build | 0 file dùng type `Database` sinh từ schema | Sau `db:dung`: `supabase gen types typescript --local` ra 1 file. CI fail nếu file sinh ra khác file đã commit. Module đang làm dùng client có type; module khác chuyển dần | 1b |
| 3 | Ca T trong đặc tả chưa thành test | 422 ca T dạng bảng `\| T1.01 \| đầu vào \| kết quả \|` (M03, M12 viết kiểu khác); mới 18 file dẫn `@dac-ta` | Script `dac-ta-test.mjs <module>` sinh `it.todo('T1.01 …')` kèm đầu vào và kết quả trích nguyên văn. `trace` đếm todo / pass theo module | 2 |
| 4 | CI không chạy ở nhánh làm việc thật, nên cổng 6 chưa có hiệu lực | `ci.yml:8-10` chỉ main/master/develop | Workflow riêng `db-dung.yml` chạy khi push `integrate/**` và PR. Không đổi trigger `ci.yml`: ở integrate, `sync-check --strict` (`ci.yml:85`) sẽ đỏ vì migration chưa lên prod, và e2e sẽ chạy bằng tài khoản thật | 1 |
| 5 | e2e trong CI bỏ qua khi thiếu secret và trỏ tới URL ngoài | `ci.yml:142-156` | e2e chạy trong `db-dung.yml`, trên stack Supabase local + seed. Không cần secret prod | 1c |
| 6 | Không bắt được hàm SQL hỏng thân hàm (lỗi chỉ lộ khi gọi) | 27 file fix/revert/repair | `supabase db lint --level error` trong `db:dung`. 165 hàm cũ chưa từng lint nên ghi mốc số lỗi ngày đầu; chỉ fail khi số lỗi tăng | 1 |
| 7 | Trước lô prod chưa so schema prod với chuỗi local | Quy trình (3) ở `CLAUDE.md:53` mới nói «áp thử lên bản sao» | Trước mỗi lô prod: so schema prod (chỉ đọc) với DB `db:dung` dựng; lệch thì dừng. Sau deploy 24 giờ: đọc lỗi runtime Vercel, có lỗi thì ghi vào sổ | 3 |
| 8 | Không đo được luồng có nhanh lên không | `stats` chỉ đếm trạng thái | `stats` thêm 3 số: tuổi trung bình việc mở · số migration mỗi lát · số hàm bị định nghĩa lại trong 30 ngày | 2 |

**Lát 1b** (≤ 4 file, sau Lát 1): harness pgTAP + 1 test RLS cho VST (module đang dùng thật) + file type sinh + 1 chỗ gọi có type trong VST. Không gắn type cho client dùng chung, vì sẽ đẩy lỗi tsc sang cả 5 module. Xong khi:
1. `supabase test db` xanh ở local.
2. `db-dung.yml` fail khi file `gen types` sinh ra khác file đã commit.
3. Một hàm đọc VST dùng client có type và `npm run build` pass.

**Lát 1c** (sau 1b): e2e smoke VST+GSC (6 ca hiện có) chạy trong `db-dung.yml` trên stack local + seed, không cần secret. Xong khi job chạy 6/6 (thấy được sau «push»).

## 11. Học từ Claude Code docs và repo: giữ / thêm / bỏ

Nguyên tắc chung từ docs: Claude làm tốt nhất khi có một lệnh kiểm tất định để tự lặp tới khi pass; luật không có ngoại lệ thì đặt ở hook/CI, luật có ngoại lệ mới để ở CLAUDE.md. Vì vậy mọi bổ sung dưới đây là script/CI, không thêm văn xuôi.

| Thành phần | Docs/repo nói | Hiện trạng | Quyết định |
|---|---|---|---|
| CLAUDE.md | < 200 dòng mỗi file; chỉ ghi điều Claude không tự suy ra từ code; `@import` không giảm context [memory, best-practices] | 84 + 53 dòng; mục «Đang làm» là trạng thái thay đổi theo ngày | **Giữ** cỡ. **Bỏ** «Đang làm/Chạy nối» → 1 dòng trỏ sổ + bảng luồng §3 (Lát 3) |
| Rules | Rule có `paths:` chỉ nạp khi đụng file khớp; sau nén có thể mất [memory, context-window] | 11 rule đều có `paths:` | **Giữ**. Không thêm rule văn xuôi |
| Commands → skills | Commands đã gộp vào skills; skill có tác dụng phụ đặt `disable-model-invocation: true` [skills] | `/commit`, `/pr-create` thiếu cờ này → model có thể tự gọi | **Thêm** cờ cho 2 file (Lát 3). **Bỏ khỏi đường chính**: `/intake-nv`, `/domain-slice`, `/ra-soat`, `/chay-lien-tuc` (lặp MỌI module, trái «một module một lúc») |
| Subagents | Dùng cho việc phụ làm ngập ngữ cảnh; reviewer chạy ngữ cảnh mới, không thấy lập luận người viết [sub-agents, best-practices] | 9 + 5 agent ghim; `guard-agent` chặn agent chung | **Giữ**, không thêm agent |
| Hooks | Cho luật tất định; Stop/PostToolUse chạy mỗi lượt nên phải nhanh [hooks] | 11 global + 2 dự án | **Giữ**, không thêm hook. Cổng mới đặt ở `db:dung`/CI |
| Plugins | `typescript-lsp` cho chẩn đoán sau mỗi lần sửa + tìm định nghĩa/tham chiếu [code-intelligence] | Đã cài, binary có sẵn, nhưng `~/.claude/settings.json` đặt `false`, trong khi `CLAUDE.md` Gotchas bảo ưu tiên LSP | **Bật** (đổi `false` → `true`). superpowers chồng lam-het: **tắt** (nạp từ plugin đồng bộ tài khoản, xem §12 #11) |
| Skill DB | `supabase/agent-skills` có skill chính thức Postgres best practices: index FK, RLS, khóa bảng khi migration, view `security_invoker` | `smart-db-bv103` tự viết | **Thêm** skill chính thức; `smart-db-bv103` chỉ giữ phần riêng BV103 (cân ở Lát 3) |
| Test DB | Supabase docs: pgTAP trong `supabase/tests`, `supabase test db`, có mẫu CI | Chưa có | **Thêm** (§10 #1, Lát 1b) |
| MCP | — | supabase, github, vercel | **Giữ**. Thêm 2 cách dùng: so schema prod chỉ đọc trước lô prod; đọc lỗi runtime Vercel sau deploy (§10 #7) |
| CI có Claude | `claude -p` headless, GitHub Action, Code Review tự động trên PR [headless, github-actions, code-review] | Review chạy local bằng `review-bv103` | **Chưa thêm**: CI giữ tất định (máy làm); PR do PO hỏi từng lần nên review local đủ. Xét lại khi PR đều đặn |
| Quy trình spec | github/spec-kit: constitution → specify → clarify → plan → tasks → analyze → implement; bước `analyze` kiểm spec/plan/tasks khớp nhau và khớp constitution | Có thẻ việc, Tự kiểm (`require-self-check`), hỏi ≤ 3 câu | **Không cài** (sẽ thành luồng thứ 11). Lấy ý `analyze`: `so-loi.mjs check` kiểm thẻ việc đủ trường + mã R/T có thật trong đặc tả (Lát 2) |
| Ngữ cảnh | `/context`, `/usage` đo ngữ cảnh; `/clear` sau 2 lần sửa chưa đúng [context-window, best-practices] | Phiên này nén 3 lần | Mỗi lát một phiên; đầu phiên chạy `/context` một lần để thấy phần cấu hình chiếm bao nhiêu |

Repo do PO đưa trước đây (ragflow, docling, marker…) phục vụ dự án kho tri thức, không có repo về quy trình làm app; tìm lại trong lịch sử các phiên cũng không thấy repo nào khác.

Nguồn: [memory](https://code.claude.com/docs/en/memory.md) · [best-practices](https://code.claude.com/docs/en/best-practices.md) · [skills](https://code.claude.com/docs/en/skills.md) · [sub-agents](https://code.claude.com/docs/en/sub-agents.md) · [hooks](https://code.claude.com/docs/en/hooks.md) · [headless](https://code.claude.com/docs/en/headless.md) · [github-actions](https://code.claude.com/docs/en/github-actions.md) · [code-review](https://code.claude.com/docs/en/code-review.md) · [code-intelligence](https://code.claude.com/docs/en/plugins/code-intelligence.md) · [context-window](https://code.claude.com/docs/en/context-window.md) · [Supabase testing](https://supabase.com/docs/guides/local-development/testing/overview) · [Supabase RLS testing](https://supabase.com/docs/guides/database/postgres/testing-row-level-security) · [Supabase agent skills](https://supabase.com/blog/supabase-agent-skills) · [spec-kit (Microsoft Learn)](https://learn.microsoft.com/en-us/training/modules/spec-driven-development-github-spec-kit-enterprise-developers/3-examine-github-spec-kit)

## 12. Sổ công cụ ngoài: repo và plugin đã tra (19/11)

**Tra ở 3 nơi:**
- Catalog plugin chính thức `claude-plugins-official`: 317 plugin, đọc từ file local.
- Danh mục plugin của tài khoản (SearchPlugins).
- `gh api` cho từng repo: số sao, ngày đẩy gần nhất, license.

**Luật dùng sổ:**
- Dòng đã có quyết định thì không đề xuất lại. Muốn mở lại phải có số đo mới (theo luật đóng băng: lỗi lặp ≥ 2 lần).
- Ở cổng 2, phương án B của spec phải là «dùng công cụ có sẵn», tra trong sổ này hoặc catalog. Tra được công cụ mới thì thêm một dòng kèm quyết định.
- PO không cần tự đi tìm repo nữa.

| # | Công cụ | Làm gì | Bằng chứng (đo 19/11) | Quyết định | Lát |
|---|---|---|---|---|---|
| 1 | `supabase/agent-skills` → skill `supabase-postgres-best-practices` | Luật Postgres/RLS/index/migration do Supabase giữ; 34 file tham chiếu | ★3,1k · đẩy 12/11 · MIT · chính MCP Supabase khuyên cài | **Dùng.** Chỉ chép `SKILL.md` + ≤ 5 file tham chiếu (RLS, migration, index) vào `.claude/skills/`, ghim sha. Không cài plugin `supabase` (partner), vì nó kèm thêm 1 MCP Supabase trùng `.mcp.json` | 3 |
| 2 | `typescript-lsp` (Anthropic) | Báo lỗi type ngay sau mỗi lần sửa; tìm định nghĩa/tham chiếu | Đã cài, `typescript-language-server` có sẵn, nhưng đang `false` | **Bật** | 3 |
| 3 | `supabase/setup-cli` (Action chính thức) | Cài Supabase CLI trong runner để chạy `supabase start` + `db:dung` | ★213 · đẩy 17/11 · MIT | **Dùng** trong `db-dung.yml` | 1 |
| 4 | `usebasejump/supabase-test-helpers` | Hàm pgTAP `tests.authenticate_as`, tạo user test, kiểm RLS bật; docs Supabase dùng các hàm này | ★133 · đẩy lần cuối 05/2024 (đứng yên 18 tháng) · MIT | **Mượn.** Chép đúng các hàm cần vào `supabase/tests/`; không cài qua dbdev để khỏi phụ thuộc gói đứng yên | 1b |
| 5 | `github/spec-kit` | constitution → … → analyze → implement | ★150k · đẩy 18/11 | **Không cài.** Mượn ý `analyze` (§11) | 2 |
| 6 | `mattpocock/skills` (catalog: `mattpocock-skills`) | 21 skill kỹ thuật; `grill-with-docs` = phỏng vấn dồn để bắt lỗ kế hoạch, ghi ADR + glossary | ★327k · đẩy 18/11 · MIT | **Mượn ý, không cài.** Cả bộ có `to-spec`, `implement`, `tdd`, `triage`… nên sẽ thành luồng chồng lam-het, đúng lỗi §1. Đọc skill «grilling» rồi đưa câu hỏi vào prompt giao `phan-bien` ở cổng 3 (chỉ đổi prompt, không thêm file) | 3 |
| 7 | `vercel-labs/agent-skills` | `react-best-practices`, `composition-patterns`, `web-design-guidelines` | ★34k · đẩy 12/11 · không ghi license | **Không, trừ khi cần.** Đã có skill `react-dev` + `ui-redesign-plan.md`. Repo không ghi license nên không chép nguyên văn. Chỉ xét khi một lát UI có vấn đề hiệu năng đo được | — |
| 8 | `sbdchd/squawk` (+ `squawk-action`) | Linter migration: bắt thao tác khóa bảng lâu (index không CONCURRENTLY, thêm NOT NULL…) | ★1,27k · đẩy 18/11 · Apache-2.0 | **Không bây giờ.** Dữ liệu pilot nhỏ nên khóa bảng không gây gián đoạn. Lỗi thật của dự án là chuỗi gãy, sửa file đã áp và thân hàm hỏng, đã có `migration-bat-bien` + `db lint` lo. Xét lại khi bảng prod đủ lớn để khóa gây gián đoạn (đo bằng MCP) | — |
| 9 | `vercel/next-devtools-mcp` | Đọc lỗi runtime/route của dev server Next 16 | ★838 · đẩy 15/09 | **Không.** Browser pane + `read_console_messages` + `preview_logs` trên `dev-local` đã làm việc này | — |
| 10 | `context7` (Upstash) | Tra docs đúng phiên bản thư viện | ★65k · MIT · MCP chạy trên máy chủ ngoài | **Không.** Docs Supabase/Next đã tra được qua MCP Supabase/Vercel; context7 gửi truy vấn ra ngoài. Xét lại nếu lỗi dùng API cũ của React 19/Zod 4 lặp ≥ 2 lần | — |
| 11 | `obra/superpowers` | Brainstorm, TDD, subagent… | ★321k. Nạp từ plugin đồng bộ của tài khoản (`~/.claude/plugins/synced/…`), không qua `settings.json`. Mỗi phiên chèn khối «EXTREMELY_IMPORTANT» bắt gọi skill trước mọi việc, chồng lam-het | **Tắt** ở mục Plugins của app. Việc này ảnh hưởng mọi dự án; chưa kiểm được có tắt riêng một dự án được không | 3 (PO) |
| 12 | `security-guidance` (Anthropic) | Cảnh báo theo mẫu khi sửa; LLM review diff ở Stop; review commit | Catalog chính thức | **Không.** Thêm hook Stop gọi LLM mỗi lượt (docs: Stop phải nhanh). RLS/auth/migration đã có `security-auditor` + `review-bv103` | — |
| 13 | `code-review`, `pr-review-toolkit` (Anthropic); `coderabbit`, `greptile`, `claude-code-review-council` | Review PR nhiều agent | Catalog | **Không cài.** `/code-review` có sẵn trong Claude Code, cộng `review-bv103`. Dịch vụ ngoài gửi mã ra ngoài | — |
| 14 | `feature-dev`, `ralph-loop`, `hookify`, `claude-md-management`, `session-report` | Luồng phát triển, vòng lặp tự chạy, tạo hook, sửa CLAUDE.md, báo cáo token | Catalog | **Không.** Mỗi cái thêm một luồng hoặc lớp cấu hình, trái §7 và luật đóng băng. Token đã đo bằng `agent_dung.py` và `/usage` | — |
| 15 | `semgrep`, `sonarqube`, `sentry` | SAST; giám sát lỗi | Catalog; `package.json` không có `@sentry` | **Không bây giờ.** Lỗi runtime prod đọc qua Vercel MCP (§10 #7). ESLint + `security-auditor` lo phần mã | — |
| 16 | `playwright` (Microsoft) | Điều khiển browser, e2e | Đã nạp | **Giữ** | — |

Lát 3 chép bảng này vào `docs/core/skills-catalog.md` (file đã có), nên không sinh tài liệu thứ hai.

## Tự kiểm

**Mỗi yêu cầu của PO có mục tương ứng:**

| Yêu cầu | Mục |
|---|---|
| Rà soát, phân tích | §1 |
| Đề xuất, phản biện, giữ tính phản biện | §3 bước 3, §4 |
| Chọn giải pháp | §3 bước 4 |
| DB, BE, FE, UI sạch | §5 |
| Gắn nghiệp vụ, lấy nguồn chuẩn | §2, trace §6 |
| Tự động, PO ít phải tương tác | §6; PO chỉ dừng ở bước 4 và 7 |
| Gom tài liệu | §7 |
| Công cụ | §6 |

**Yêu cầu lần 5 (19/11: còn thiếu gì, nhanh/tự động/chính xác hơn, học từ docs/repo):** §10 (8 lỗ, mỗi lỗ có bằng chứng đo và lát), §11 (giữ/thêm/bỏ theo từng thành phần, có nguồn).

**Yêu cầu lần 7 (19/11: cấu hình đã đảm bảo yêu cầu chưa; PO chọn «Thêm vào Lát 2»):** cổng 2–4 trước đây chỉ là văn xuôi, nay do `so-loi.mjs` kiểm (§3, §4, §6, §8 Lát 2).

**Yêu cầu lần 6 (19/11: tìm repo, plugin phù hợp để PO khỏi đề xuất lại):** §12. 16 dòng, mỗi dòng có bằng chứng đo và quyết định; có luật giữ sổ sống ở cổng 2.

**Không có bước thừa.** Lát 1–3 đều phục vụ cổng 6, cổng 1 và §7. Lát 1b và 1c phục vụ cổng 5–6 (test RLS, type, e2e). Không thêm hook, agent hay rule văn xuôi nào; mọi bổ sung là script hoặc CI. §12 chỉ thêm 1 skill chép về (#1) và 1 Action (#3).

**Điều chưa kiểm:**
- Có tắt superpowers riêng cho một dự án được không (plugin đồng bộ tài khoản).
- Skill «grilling» của mattpocock: mới đọc `grill-with-docs` (chỉ gọi 2 skill khác), chưa đọc nội dung.
- `supabase db lint` và `gen types --local` chạy được với CLI 2.122.0 trên chuỗi 316 file hay không: Lát 1/1b sẽ đo.
- M03 và M12 viết ca T theo định dạng khác (0 dòng khớp mẫu bảng), nên `dac-ta-test.mjs` cần đọc thêm định dạng đó.

**Đối chiếu với quy tắc và quyết định đã có:**
- `~/.claude/CLAUDE.md:9` bắt buộc dùng lam-het. Kế hoạch giữ lam-het làm xương sống, không lệch.
- `~/.claude/CLAUDE.md:13` đóng băng config, chỉ cho sửa khi lỗi lặp có số đo. Điều kiện này đã có:
  - Chuỗi gãy do `f44b7705`.
  - 28 file bị sửa sau khi áp.
  - Có hàm bị định nghĩa lại 15 lần.

  PO đã duyệt 19/11.
- `CLAUDE.md:29` «TẤT CẢ module». Câu 2 không bỏ mục tiêu này, chỉ thêm điều kiện mở module.
- `CLAUDE.md:51` «Tiến độ chỉ ghi ở sổ lỗi» khớp với câu 3.
- Memory «Bộ 3 file = bản gốc» coi 03 là bản gốc. Vì 03 sinh từ sổ nên không lệch.
- `CLAUDE.md:62` giới hạn docs/core 13 file. Gộp còn 10 file, vẫn trong trần.
- Squash plan:121 (quyết định 18/11). Câu 1 và workflow `db-dung.yml` giữ nguyên quyết định này.
- `ci.yml:117` ghi audit:views không chạy trong CI. Lát 1 đưa nó vào CI.

**`phan-bien` dùng cho spec:** agent này vốn để review diff đã làm. Ở cổng 3 chỉ đổi cách giao việc trong prompt (đưa spec thay cho diff), không sửa file agent.

**Thứ tự phụ thuộc:**
- Lát 1 phải đi trước squash 4b, vì cần CI xanh để đo squash.
- Lát 2 phải đi trước khi làm tiếp tính năng module, vì cổng 1 cần trường `ma_dac_ta`.

**Từ mơ hồ đã đổi thành tiêu chí đo được:**
- «Sạch» = `db-dung` xanh, 0 file migration ở trạng thái M/D, mỗi lát tính năng có ≥ 1 mã đặc tả.
- «Có người dùng» = có tên và ≥ 3 kịch bản.
- «Phản biện cao» = mỗi lát tính năng có ≥ 1 phản đối có bằng chứng, hoặc «không phản đối» kèm số đo.

**Cùng một tên:** cả bản dùng «sổ» để chỉ `so-loi.mjs` sau khi mở rộng.
