# KH_APPKSNK_20261118 — Lát 4: squash migration (mở, chưa sửa gì)

Trạng thái: MỞ 2026-11-18 theo lệnh «Mở lát 4» của PO · chỉ đo + chốt thẻ việc · `supabase/migrations/` KHÔNG đổi · chưa chạm prod · TC09 chưa đạt (xem Cần người).
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
