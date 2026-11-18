# KH_APPKSNK_20261118 — Lát 4: squash migration (mở, chưa sửa gì)

Trạng thái: 4a DỪNG 2026-11-18 — DB-1 (dựng sạch từ 316 file, trong project thải bỏ) KHÔNG dựng được, dừng ở file thứ 178, nguyên nhân chưa xác định; tiêu chí 1–2 chưa đo được; xem §5 · `supabase/migrations/` KHÔNG đổi · chưa chạm prod · TC09 chưa đạt (xem Cần người). PO chọn A (squash) 2026-11-18; 4a′ xong (§7), PO chọn thay ở bản sao; 4b chưa mở.
Nguồn: `.claude/plans/KH_APPKSNK_20261117_thu-hep-len-prod.md` dòng lát 4 · `docs/reference/guides/migration-squash-runbook.md` (lệch, xem §1) · skill `destructive-change`.

## 1. Đo hiện trạng (2026-11-18, chỉ đọc)

| Số đo | Giá trị | Lệch so với tài liệu |
|---|---|---|
| File `*.sql` trực tiếp trong `supabase/migrations/` | 316 (đầu `20260530000000_init_pilot_baseline`, cuối `20261118130000_nkbv_actor_khoa_restricted_vai_ngoai_ksnk`) | plan/HANDOFF ghi 310; README ghi «92 migration … head `20260704120000`» |
| Tổng dòng / byte | 60 144 dòng · 2 536 895 B; baseline hiện tại 11 593 dòng | — |
| Ledger local `supabase_migrations.schema_migrations` | 316 dòng, `comm` với 316 file = 0 lệch hai chiều | — |
| File có `INSERT INTO` (ngoài baseline) | 102 | `pg_dump --schema-only` sẽ MẤT dữ liệu danh mục/seed trong 102 file này |
| Runbook | nói baseline v2 `20260602100000_init_pilot_baseline.sql`, nằm ở `archive_legacy/`; thực tế chỉ có `20260530000000_init_pilot_baseline.sql` | lệch (c) đã ghi ở plan 17/11 |
| `mdm:migrate:local` | `npx supabase db push --local` (áp phần còn thiếu, KHÔNG reset) | runbook §6 dùng `db reset` |
| pg_dump trong container `supabase_db_ksnk_bv103` | 17.6 | — |

12 điểm trong `scripts/` + CI đọc thư mục hoặc ledger migration. Gãy chắc chắn sau khi chuyển 316 file vào archive:
- `scripts/admin-health-check.mjs:40-41` trỏ cứng `20260530000000_init_pilot_baseline.sql` và `20260603120000_v_auth_permissions_compat_repair.sql`.
- `scripts/sync-check.mjs` so TÊN repo với ledger; sau squash repo chỉ còn 1 tên baseline + tên mới → `repoOnly` = tên baseline (chưa có trên prod) → FAIL. Cần mốc cắt (plan 17/11 đã nêu).
- `scripts/acl-snapshot.mjs:28` (`--require-applied`) so VERSION với ledger → version baseline mới không có trên prod.
Chạy được nhưng đổi ý nghĩa (chỉ còn thấy 1 file lớn, mất lịch sử từng migration): `impact.mjs:118`, `audit-legacy-rpc.mjs:11` («after DROP migrations»), `check-sql-object-refs.mjs:18`, `guard-security-baseline.mjs:17`, `trace-dac-ta.mjs:52`, `module-audit.mjs:35`, `repo-hygiene-audit.mjs:189`, `so-loi.mjs:28,83` (kiểm commit DA_SUA có chạm `supabase/migrations/`). CI: `.github/workflows/ci.yml:55,74` đọc tên từ ledger.

## 2. Hai phương án (tầng cao: DB)

- **A — squash thật (plan 17/11):** baseline MỚI = `pg_dump --schema-only` DB local + dữ liệu danh mục của 102 file; 316 file → `archive_legacy/`, không xóa; chỉnh mốc cắt `sync-check`, `admin-health-check`, `acl-snapshot`.
- **B — không squash:** giữ 316 file; thêm một snapshot `pg_dump -Fc` làm đường dựng local nhanh. Không đổi ledger, `sync-check`, 12 điểm đọc.

Lý lẽ mạnh nhất CHỐNG A: lợi ích chưa đo (chưa có số thời gian dựng DB từ chuỗi 316 file, chưa có lỗi nào trong sổ lỗi do chuỗi dài gây ra), trong khi A phá 3 script chắc chắn, đổi nghĩa 8 script, mất truy vết từng migration, và dễ làm rơi dữ liệu seed của 102 file.
Chọn: làm lát 4a (đo + dựng nháp, không đổi chuỗi) rồi để số đo quyết định 4b. Nếu dựng từ chuỗi cũ < 120 giây và 4a cho thấy diff dữ liệu khó khớp → đề xuất PO dừng ở 4a, chọn B.

## 3. Thẻ việc — lát 4a (lát đầu, chỉ local)

- **Sản phẩm:** baseline NHÁP dựng từ một DB SẠCH áp đủ 316 file (không dựng từ DB local đang sống) + script đối chiếu (ngoài `supabase/migrations/`) + bảng số đo (thời gian dựng DB sạch từ 316 file; số bảng seed lệch). Người dùng: PO quyết 4b dựa trên số đo; dev dựng DB local.
- **Xong khi** (DB-1 = DB sạch dựng từ 316 file; DB-2 = DB sạch dựng từ baseline nháp; KHÔNG so với DB local đang sống, vì nó đã qua `trial:prep`, dòng UAT, fixture NV_TEST01 và các probe tay):
  1. `pg_dump --schema-only` DB-1 so DB-2: diff 0 dòng, phạm vi ghi rõ `public` + `cron` + `storage` + grant trên `auth`/`storage` (in lệnh + số dòng diff).
  2. Với mọi bảng được `INSERT` trong 102 file, và `cron.job`: `count(*)` + md5 nội dung khớp giữa DB-1 và DB-2; số bảng lệch = 0.
  3. `git status -- supabase/migrations/` rỗng (4a không thay chuỗi).
- **Ngoài phạm vi:** chuyển/xóa 316 file; sửa `sync-check`/`admin-health-check`/`acl-snapshot`; mọi lệnh chạm prod; sửa README/runbook (4b); thêm bảng summary.
- **Cỡ:** ≤ 3 file tạo mới (script dựng + so, baseline nháp, ghi kết quả vào plan này). `migration-author` (Opus) viết baseline; một agent ghi mỗi lần; reviewer độc lập một vòng (`review-bv103`) cho phần dữ liệu seed.
- **Cần người:** 4a không. 4b: PO ra lệnh phá hủy có điều kiện (skill `destructive-change`) · TC09 đạt · PR hỏi từng lần · không áp prod.

Rủi ro cần chốt đầu 4a:
- Dựng DB sạch có schema `auth`/`storage` của Supabase: dùng một instance/container thải bỏ riêng; KHÔNG chạy `db reset` lên DB local chính. `CREATE DATABASE … TEMPLATE postgres` copy cả dữ liệu nên không dùng. Lệnh cụ thể chưa thử, 4a tự chốt và ghi lại.
- `--schema-only` giới hạn `public` bỏ sót đối tượng và dữ liệu ngoài `public`. Đã đo: 4 file gọi `cron.schedule` (vd `20260530082000_qlcv_cron_schedule.sql:17,29` ghi `cron.job`, là dữ liệu); 0 file chạm `storage.buckets`. Chưa đo: grant/trigger/policy trên `auth` và `storage`, extension. Phạm vi so ở tiêu chí 1–2 phải phủ các schema này.

## 4. Tự kiểm
- Yêu cầu «Mở lát 4» → §1 đo, §3 thẻ việc; tiêu chí đo được (diff 0, lệch 0, `git status` rỗng).
- Mơ hồ đã thành số: «đủ nhanh» → < 120 giây (ngưỡng đề xuất, PO đổi được); «khớp» → diff 0 + md5.
- Lệch tài liệu đã ghi: 316 vs 310 vs 92 (§1), runbook v2 vs thực tế (§1). Chưa sửa README/runbook, để 4b.
- Mâu thuẫn: plan 17/11 ghi squash «CHỈ sau B5 + TC09 đạt»; HANDOFF ghi TC09 còn mở. 4a chỉ local nên không chạm điều kiện đó; 4b chờ TC09. Giả định này cần PO xác nhận.

## 5. Kết quả 4a (2026-11-18)

Cách làm: `scripts/squash-baseline-check.sh all` dựng project Supabase thải bỏ `ksnk_sq4a` (cổng 55420–55422, container `supabase_*_ksnk_sq4a`; stack chính `supabase_*_ksnk_bv103` không chạm, còn nguyên 9 container). DB-0 = chỉ `pg_cron` (dựng 25 giây). DB-1 = `pg_cron` + 316 file. Đã dừng và xóa stack thải bỏ sau khi đo (`down`: 0 container `ksnk_sq4a`).

**Kết quả: DB-1 không dựng được.** `db reset` dừng ở file thứ 178/317 (gồm `pg_cron`; ledger DB-1 lúc lỗi: 177 dòng, version cuối `20261004183253`). Lỗi nguyên văn:

```
{"_tag":"Error","error":{"code":"MigrationApplyError","message":"ERROR: perf_rls_initplan guard failed: altered=139 md5=aaabe0baa34326a6118120066914c838 (SQLSTATE P0001)\nAt statement: 7 ... IF cnt <> 140 OR md5(acc) <> '60f7b186b28adace07e4fab005a2c6fa' THEN RAISE EXCEPTION 'perf_rls_initplan guard failed: altered=% md5=%', cnt, md5(acc);"}}
```

Migration lỗi: `supabase/migrations/20261004194907_perf_rls_initplan_20261005.sql:15-38` (khối DO có chốt cứng: phải sửa đúng 140 policy với md5 `60f7b186…`; DB sạch cho 139 và md5 khác).

Nguyên nhân: CHƯA XÁC ĐỊNH. Đã đo, đã loại một giả thuyết:
- Đo trên DB thải bỏ ở trạng thái lỗi (177 file đã áp): 144 policy `public` khớp regex của chốt; khối DO chạy sau 6 lệnh `DROP POLICY` đầu file (dòng 5–10), trong đó 5/6 policy bị drop khớp regex (`dm_khoa_phong_select_auth_v1` không khớp) → 144 − 5 = 139. Prod cho 140. Tức DB sạch lệch prod ít nhất 1 policy (hoặc một policy trong 5 cái bị drop khác dạng trên prod); chưa biết policy nào, vì repo không có `migration_perf_rls_initplan_20261005.expanded.sql` (`git ls-files | grep expanded` rỗng) và chưa đọc prod.
- Giả thuyết «thứ tự»: file 4 dòng `20261004183253_security_p0_rls_cleanup_20261005.sql` là no-op (`SELECT 1;`, chú thích «Version này đã có trên production… File no-op», commit `cc85aea9`, 2026-10-07); DDL thật có trong repo dưới version sau, `20261005010000_security_p0_rls_cleanup.sql` (đầu file ghi `SKIP-PROD: already applied on prod as 20261004183253…`), chạy SAU `perf_rls_initplan` (20261004194907). Chạy lại với bản sao file đó đổi version thành `20261004183254` (chạy trước `perf_rls_initplan`; `SQUASH_REVERSION` trong script, repo không đổi): vẫn lỗi y hệt `altered=139 md5=aaabe0baa34326a6118120066914c838` → giả thuyết này KHÔNG giải thích được lỗi.
- Có 9 file stub kiểu này (`grep -l 'Version này đã có trên production'`): `20260907064308_nkbv_chua_phan_tich_rpc`, `20260909000147_security_harden_rpc_bodies_views_rls`, `20260909000342_security_harden_ledger_views_rls_indexes`, `20260909010503_nkbv_fact_ba_phan_tich`, `20260909010509_nkbv_loai_usi_seed`, `20260909013613_nkbv_pneu_non_vap_major_type`, `20260921063340_cssd_fact_kho_kiem_ke`, `20260927171313_qlcv_wave3_drop_dm_loai_trang_thai`, `20261004183253_security_p0_rls_cleanup_20261005`. Mới kiểm có `SKIP-PROD` ở đúng 1 file (`grep -l 'SKIP-PROD' supabase/migrations/*.sql` → `20261005010000_security_p0_rls_cleanup.sql`); chưa kiểm 8 stub còn lại có bản thật dưới version khác hay không.
- Đã kiểm: `trial:prep` = `env:bootstrap` + `env:check` (package.json:44-46), không chạy migration, nên lỗi này không lộ qua `trial:prep`. `supabase/restore.sh` ghi DEPRECATED và chỉ `npx supabase db reset --local` là đường dựng DB sạch; runbook (dòng 102) cũng dùng `db reset --local`. Tức đường tài liệu hóa là chính chuỗi 316 file, và nó không chạy được trong thiết lập thải bỏ của lát 4a (image Postgres 17.6, CLI 2.122.0, config tối giản, `[db.seed] enabled=false`, có thêm `00000000000000_pg_cron.sql`). Chưa loại trừ sai khác do thiết lập này so với stack chính; chưa thử `db reset` trên một bản sao cấu hình y hệt stack chính.
- Chưa kết luận được «chuỗi 316 file không phải nguồn sự thật»: có thể là lỗi thiết lập thải bỏ, có thể là chuỗi hỏng thật. Bước phân biệt rẻ nhất: dựng DB-1 bằng đúng `supabase/config.toml` của repo trên cổng thải bỏ, hoặc đọc (không ghi) tập policy prod bằng MCP Supabase (đang chưa authorize).

Đối chiếu từng tiêu chí `Xong khi`:

| # | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | `pg_dump --schema-only` DB-1 vs DB-2 diff 0 | CHƯA ĐO được | DB-1 không tồn tại; script dừng ở bước dựng DB-1 (`script_exit=1`) |
| 2 | count + md5 mọi bảng seed + `cron.job` khớp | CHƯA ĐO được | cùng lý do |
| 3 | `git status -- supabase/migrations/` rỗng | ĐẠT | 0 dòng, kiểm lại sau lần chạy cuối |

Số đo có: DB-0 dựng 25 giây (một file `pg_cron`); DB-1 dừng ở file 178/317, chưa có tổng thời gian; baseline hiện tại 11 593 dòng, 102 file có `INSERT INTO`, 4 file gọi `cron.schedule` (đều có chốt `pg_cron` tồn tại).

Phán quyết theo quy tắc §2: trong thiết lập thải bỏ, DB-1 không dựng được nên điều kiện «DB-2 khớp DB-1» không đo được, kể cả khi baseline nháp hợp lệ. Đề xuất cho PO: **chọn B** (giữ 316 file, thêm snapshot `pg_dump -Fc` từ DB sống làm đường dựng local), nợ ghi ở `SO_NO_APPKSNK.md`. Giữ B vì rẻ và không đổi gì; nhưng đây là đề xuất yếu, chưa phải chứng minh A sai.
- Lý lẽ mạnh nhất chống B: nếu chuỗi 316 file thật sự không dựng được DB sạch, repo hiện không có cách dựng lại schema từ nguồn đã review; snapshot của B lấy từ DB sống nên cũng chỉ chép lại trạng thái hiện tại, không có phép thử độc lập, và nợ «chuỗi hỏng» vẫn nằm đó cho mọi lần dựng sau.
- Cải chính ý trước («A không kiểm được»): A có thể kiểm bằng cách khác, không cần DB-1: so `pg_dump --schema-only` của DB-2 (baseline) với dump schema đọc-only từ prod (cần authorize MCP Supabase hoặc PO chạy `pg_dump`). Đây là điều kiện khác điều kiện §3, cần PO duyệt thay đổi tiêu chí.
- Việc nên làm trước khi PO chọn (ngoài phạm vi 4a, chưa mở): loại trừ sai khác thiết lập bằng `db reset` với config giống stack chính, và xác định policy lệch 139/140 qua prod đọc-only.

## 6. Quyết định PO (2026-11-18, trong chat): chọn A (squash)

PO chọn A, thay đề xuất B của §5. Đây chưa phải lệnh phá hủy: chuyển 316 file sang `archive_legacy/` (4b) vẫn cần lệnh riêng theo skill `destructive-change`, TC09 đạt, không áp prod (§3 «Cần người»).

Chặn: tiêu chí 1–2 của 4a chưa đo được, nên chưa có phép thử baseline. Lát kế, **4a′** (phiên mới, chỉ local, đọc-only với prod):
- **Sản phẩm:** biết vì sao DB-1 lỗi 139≠140 và có đường kiểm baseline độc lập. Người dùng: PO quyết 4b.
- **Xong khi:** (1) một trong hai: `db reset` bằng `supabase/config.toml` của repo (trên cổng thải bỏ) áp đủ 316 file exit 0 kèm số giây, hoặc chỉ đúng tên policy lệch so với prod; (2) `scripts/squash-baseline-check.sh all` in `KẾT LUẬN: KHỚP` hoặc số dòng lệch cụ thể; nếu (1) chỉ làm được qua prod: tiêu chí 1 đổi thành «diff DB-2 vs dump schema prod» và PO xác nhận đổi; (3) `git status -- supabase/migrations/` rỗng.
- **Ngoài phạm vi:** chuyển/xóa 316 file, sửa `sync-check`/`admin-health-check`/`acl-snapshot`, ghi prod.
- **Cỡ:** ≤ 3 file. **Cần người:** dump prod đọc-only (PO chạy `pg_dump --schema-only`, hoặc authorize MCP Supabase, HANDOFF CẦN NGƯỜI mục 3); lệnh trước phải thử `db reset` bằng config repo trước.
- Thứ tự thử (rẻ → đắt): `db reset` config repo → tên policy lệch → dump prod.

## 7. Kết quả 4a′ (2026-11-18)

**Nguyên nhân 139≠140 đã xác định:** commit `f44b7705` (2026-11-16, «bỏ chữ KPI khỏi migration cũ», PO «Sạch cả migration cũ») thay nội dung migration ĐÃ ÁP `20260729121000_ksnk_dm_muc_tieu_kpi.sql` (42 dòng: bảng `ksnk_dm_muc_tieu_kpi`, seed 85.0, RLS, policy `ksnk_dm_muc_tieu_kpi_select` + `ksnk_dm_muc_tieu_kpi_write_admin` dùng `public.fn_sys_has_permission('QUAN_TRI_HE_THONG', 'edit') OR public.is_admin_user()`) bằng stub `20260729121000_bang_muc_tieu_cu_da_go.sql` (`SELECT 1`). Policy thiếu khớp regex chốt: **`public.ksnk_dm_muc_tieu_kpi` · `ksnk_dm_muc_tieu_kpi_write_admin`**. Bảng bị drop sau ở `20261116100000_drop_bang_muc_tieu_cu.sql`, nên DB local đang chạy không bị ảnh hưởng (ledger local giữ `statements` gốc, 0 khác bản `f44b7705^`); prod suy ra tương tự, chưa đọc prod. Khớp ở lần 2 là khớp dấu vân tay của chốt (140 + md5 `60f7b186…`), không phải đọc trực tiếp prod. Không phải do thiết lập thải bỏ (loại trừ bằng lần 1 dưới).

Phép thử (`scripts/squash-baseline-check.sh repo-reset`, `config.toml` của repo chỉ đổi `project_id` + cổng 554xx, seed bật như repo, không thêm `pg_cron`):

| Lần | Chuỗi | Kết quả | Giây |
|---|---|---|---|
| 1 | 316 file nguyên repo | exit 1, áp 177 migration rồi lỗi y hệt 4a: `perf_rls_initplan guard failed: altered=139 md5=aaabe0baa34326a6118120066914c838` | 19 |
| 2 | như 1, BẢN SAO `20260729121000` trả nội dung `git show f44b7705^:supabase/migrations/20260729121000_ksnk_dm_muc_tieu_kpi.sql` (`SQUASH_REPLACE`; md5 chuẩn hóa = `statements` trong ledger local, 0 khác) | exit 0, ledger 316 dòng, 198 policy `public`, «Finished supabase db reset.» | start (áp chuỗi + seed) 31 · `db reset` 34 |

Repo không đổi: `git status -- supabase/migrations/` rỗng sau mọi lần chạy.

**Ledger local lệch file:** so `statements` trong `supabase_migrations.schema_migrations` (DB local chính, đọc-only) với nội dung file (bỏ khoảng trắng và `;` hai phía): 28 migration khác (sửa sau khi áp), 30 dòng ledger không có `statements` (không so được). 28 version: `20260530000000 20260531200000 20260609060000 20260609061000 20260610060000 20260630140000 20260704120000 20260729121000 20260909004833 20261005160000 20261005181000 20261006025128 20261021010000 20261021020000 20261021030000 20261029100000 20261029150000 20261111170000 20261111190000 20261112120000 20261112130000 20261113100000 20261114100000 20261114130000 20261114180000 20261116100000 20261117100000 20261118130000`. Chỉ `20260729121000` đã chứng minh làm hỏng dựng sạch; 27 cái còn lại chưa đánh giá từng cái (lần 2 exit 0 nên không cái nào chặn dựng, nhưng schema có thể khác DB đang chạy).

**So baseline (`all`, cùng `SQUASH_REPLACE` như lần 2; config tối giản + `pg_cron` như 4a):** DB-1 dựng được (`db reset` 28 giây; 32 916 dòng schema, 63 bảng `public`, 2 cron job). Lần đầu DB-2 lỗi `permission denied to change default privileges (SQLSTATE 42501)` ở `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres` → script bỏ các dòng default ACL `supabase_admin` khỏi baseline nháp (DB-0 và DB-1 giống hệt nhau ở phần này, image đặt sẵn). Lần chạy lại (108 giây tổng; DB-2 dựng 26 giây): **`KẾT LUẬN: LỆCH`** — schema 632 dòng · catalog 18 dòng · data 0 · cron 0 · 63/63 bảng, 0 bảng lệch count/md5 · delta ngoài `public` 61 dòng. Lệch chính:
- DB-2 thừa 331 dòng `GRANT ALL` (267 FUNCTION, 64 TABLE; 171 cho `anon`, 148 `authenticated`, 12 `service_role`): baseline nới quyền. Gốc: `pg_dump -n public` in `ALTER DEFAULT PRIVILEGES` ở cuối file, sau khi tạo đối tượng, và không mang default ACL toàn cục (`defacl|postgres||f|{postgres=X/postgres}`, tức thu EXECUTE hàm mới khỏi PUBLIC). 35 dòng `GRANT SELECT` của DB-1 bị gộp thành `GRANT ALL` ở DB-2 (cùng gốc).
- Catalog: thiếu role `ci_migration_reader` (+ thành viên `postgres`, cấu hình `statement_timeout=10s,default_transaction_read_only=on`, quyền `USAGE` trên `supabase_migrations`); default ACL `postgres` ở `public` còn `anon`.
- 5 dòng `CONSTRAINT ... CHECK` khác dạng in cast (`cssd_dm_hoa_chat_loai_chk`…), cần kiểm tương đương nghĩa.
Tức baseline nháp hiện tại KHÔNG dùng được nguyên trạng; 4b phải đặt default ACL (kể cả toàn cục) trước khi tạo đối tượng và mang phần ngoài `public` (role, cấu hình role, ACL schema) rồi chạy lại đến khi `KHỚP`.

**Hệ quả cho 4b (PO quyết):** baseline squash phải dựng từ DB-1 có thay `20260729121000` (như lần 2), hoặc trả nội dung gốc file đó vào repo (đi ngược chỉ đạo «Sạch cả migration cũ» 2026-11-16). Dù chọn cách nào, DB-1 dựng sạch chưa chắc bằng prod ở 27 migration lệch còn lại; phép thử độc lập với prod vẫn là diff schema DB-2 vs dump prod đọc-only (HANDOFF CẦN NGƯỜI mục 3).

**Quyết định PO (2026-11-18, trong chat): thay ở bản sao.** Repo giữ stub `20260729121000_bang_muc_tieu_cu_da_go.sql`; 4b sinh baseline với `SQUASH_REPLACE=20260729121000_bang_muc_tieu_cu_da_go.sql=<file chứa git show f44b7705^:supabase/migrations/20260729121000_ksnk_dm_muc_tieu_kpi.sql>` (như lần 2). Dựng DB sạch từ repo vẫn lỗi 139≠140 cho tới khi 4b thay chuỗi bằng baseline. Chưa phải lệnh phá hủy: 4b vẫn cần lệnh `destructive-change` + TC09.
