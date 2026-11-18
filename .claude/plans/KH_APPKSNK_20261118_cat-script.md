# KH_APPKSNK_20261118 — Lô 3b: cắt npm script không có nơi gọi (CHỈ ĐO, CHƯA XÓA)

Trạng thái: CHỜ PO DUYỆT · chưa xóa gì · `package.json` và `scripts/` không đổi · chưa push
Nguồn: `HANDOFF_APPKSNK.md` KẾ «Lát 3a xong … Kế: 3b cắt script (PO duyệt)» · CLAUDE.md toàn cục (đo bằng script, không dùng AI đếm)
Nơi đo: worktree `integrate-2026-11`, nhánh `integrate/2026-11`, HEAD `1d7cd8ab`, 122 script trong `package.json`.

## 0. Kết luận trước

1. **122 script = 32 máy gọi + 63 người gõ tay + 27 không nơi gọi.** Chỉ 27 script là ứng viên cắt; 122 là tổng số script trong `package.json`, không phải số không nơi gọi.
2. Trong 27 ứng viên: **11 CẮT** (alias / trùng / lỗi thời) · **6 NỐI?** (guard có sẵn nhưng chưa gắn gate nào — cắt thì mất kiểm tra, nối thì ngoài lát này) · **10 GIỮ?** (việc dữ liệu/bản local, người có thể cần).
3. Đề xuất: duyệt cắt **11 dòng `package.json`** (không xóa file `scripts/*`); 6 NỐI? ghi `SO_NO`; 10 GIỮ? để nguyên. Không còn gì xóa cho đến khi PO trả lời §5.

## 1. Cách đo (chạy lại được)

- Script đo viết sẵn, chỉ đọc, chỉ file git theo dõi (2 079 file, bỏ `supabase/migrations/`, `package-lock.json`). Không AI đếm.
- **Nơi gọi máy** = tới được từ gốc máy (`.github/workflows`, `vercel.json`, `.claude/hooks`, `e2e/`, `src/`, config build/test) qua chuỗi `npm run X` / `args: ["run","X"]` / tên file `scripts/*` ở dòng KHÔNG phải chú thích/`console`/`echo`.
- **Người gõ tay** = được nhắc trong tài liệu sống (`CLAUDE.md`, `README`, `docs/**` trừ archive, `.claude/commands|skills|agents|rules`, `scripts/README.md`) hoặc được script như vậy gọi tiếp.
- **Không nơi gọi** = không thuộc hai loại trên. Chỉ plan cũ / CHANGELOG / chú thích trong chính file đích nhắc thì vẫn tính là không.
- Cấp quyền `Bash(npm run …)` trong `.claude/settings.json` KHÔNG tính là nơi gọi. Gọi `npm run` ghép chuỗi động: 0 chỗ. Hook toàn cục `~/.claude`, `.git/hooks`, `.vscode`, `supabase/config.toml`: không nhắc script nào trong 27 (đã grep; `coverage` chỉ trùng từ thường trong skill không liên quan).
- **Không đo được**: lệnh cấu hình trong dashboard Vercel (project có `buildCommand` riêng?) và workflow ở repo khác. Cắt dòng `package.json` thì `git revert` là khôi phục.

## 2. 27 ứng viên (không nơi gọi)

| Script | Lệnh (rút gọn) | Gợi ý | Lý do / file còn ai dùng |
|---|---|---|---|
| `ci:coverage:honesty` | `node scripts/ci-coverage-honesty.mjs` | **CẮT** | `test:coverage` đã gọi thẳng `node scripts/ci-coverage-honesty.mjs` · file: `ci-coverage-honesty.mjs` ← test:coverage |
| `ci:npm-audit:advisory` | `NPM_AUDIT_MODE=advisory NPM_AUDIT_LEVEL=high NPM_AUDIT_OMIT_DEV=1 nod…` | **CẮT** | `ci.yml`/`security.yml` gọi `node scripts/ci-npm-audit.mjs` trực tiếp · file: `ci-npm-audit.mjs` ← .github/workflows/ci.yml, .github/workflows/security.yml |
| `ci:npm-audit:hard` | `NPM_AUDIT_MODE=hard NPM_AUDIT_LEVEL=high NPM_AUDIT_OMIT_DEV=1 node sc…` | **CẮT** | như trên · file: `ci-npm-audit.mjs` ← .github/workflows/ci.yml, .github/workflows/security.yml |
| `coverage` | `npm run test:coverage` | **CẮT** | alias của `test:coverage` (CI dùng `test:coverage`) |
| `cssd:demo:reset` | `node scripts/cssd-demo-reset.mjs` | **CẮT** | cùng lệnh với `cssd:demo:reset:local` (được docs nhắc) · file: `cssd-demo-reset.mjs` ← cssd:demo:reset:local |
| `mdm:fallback:audit` | `node scripts/mdm-fallback-audit.mjs` | **CẮT** | script tự báo «bảng hub đã DROP — không còn legacy để đếm»; kéo theo sửa echo `run-mdm-supabase-verify.sh:42` · file: `mdm-fallback-audit.mjs` ← không ai |
| `mdm:fallback:audit:strict` | `MDM_LEGACY_FAIL_ON_ROWS=1 node scripts/mdm-fallback-audit.mjs` | **CẮT** | cùng file với `mdm:fallback:audit` · file: `mdm-fallback-audit.mjs` ← không ai |
| `mdm:migration:list:linked` | `export SUPABASE_ACCESS_TOKEN=$(grep ^SUPABASE_ACCESS_TOKEN .env.local…` | **CẮT** | lệnh supabase thẳng; prod đã có MCP `list_migrations` |
| `pilot:views:precheck` | `docker exec -i supabase_db_ksnk_bv103 psql -U postgres -d postgres -t…` | **CẮT** | tiền kiểm cũ, chỉ plan 13/11 và chú thích SQL nhắc · file: `pilot-app-views-precheck.sql` ← scripts/repo-hygiene-audit.mjs |
| `verify:mdm:post-migration` | `npm run verify:mdm` | **CẮT** | alias của `verify:mdm` |
| `verify:mdm:post-migration:local` | `npm run verify:mdm:local` | **CẮT** | alias của `verify:mdm:local` |
| `engineering:contract:gate:strict` | `ENGINEERING_GATE_STRICT=1 node scripts/engineering-contract-gate.mjs` | **NỐI?** | bản nghiêm của gate đang chạy trong `verify:engineering` · file: `engineering-contract-gate.mjs` ← engineering:contract:gate |
| `gstt:scoring:audit` | `node scripts/audit-gsc-canonical-36-scoring.mjs` | **NỐI?** | kiểm điểm GSC chưa gắn gate nào; file `audit-gsc-canonical-36-scoring.mjs` không ai gọi · file: `audit-gsc-canonical-36-scoring.mjs` ← không ai |
| `guard:cssd-red-alert-view` | `node scripts/guard-cssd-red-alert-view.mjs` | **NỐI?** | guard CSSD chưa gắn `verify:cssd` · file: `guard-cssd-red-alert-view.mjs` ← không ai |
| `smoke:cssd-station-map` | `node scripts/smoke-cssd-station-map-query.mjs` | **NỐI?** | smoke CSSD chưa gắn gate (CSSD là module kế tiếp) · file: `smoke-cssd-station-map-query.mjs` ← không ai |
| `sql:object-refs` | `node scripts/check-sql-object-refs.mjs` | **NỐI?** | guard SQL chưa gắn gate · file: `check-sql-object-refs.mjs` ← không ai |
| `verify:danh-muc-routes` | `node scripts/verify-trung-tam-danh-muc-routes.mjs` | **NỐI?** | guard route danh mục chưa gắn gate · file: `verify-trung-tam-danh-muc-routes.mjs` ← không ai |
| `cssd:split-bo:local` | `npx tsx scripts/cssd-split-bo-theo-phuong-phap.ts` | **GIỮ?** | việc dữ liệu CSSD một lần; CSSD sắp triển khai · file: `cssd-split-bo-theo-phuong-phap.ts` ← không ai |
| `dao-tao:import-mcq` | `tsx scripts/dao-tao-import-mcq.ts` | **GIỮ?** | nhập câu hỏi; Đào tạo nằm trong mục tiêu triển khai · file: `dao-tao-import-mcq.ts` ← không ai |
| `dev:webpack` | `next dev --webpack` | **GIỮ?** | dự phòng khi turbopack lỗi |
| `fact:orphan:sweep:local` | `node scripts/run-supabase-sql.mjs --local --file scripts/sql/fact-orp…` | **GIỮ?** | bản local của `fact:orphan:sweep` (local là bản gốc) · file: `run-supabase-sql.mjs` ← cssd:db:audit, cssd:db:audit:local, fact:orphan:sweep; `fact-orphan-fk-sweep.sql` ← fact:orphan:sweep, scripts/local-golden-verify.mjs, scripts/repo-hygiene-audit.mjs |
| `mdm:apply-and-verify:local` | `MDM_DB_TARGET=local bash scripts/run-mdm-supabase-verify.sh` | **GIỮ?** | bản local của `mdm:apply-and-verify` · file: `run-mdm-supabase-verify.sh` ← mdm:apply-and-verify |
| `mdm:import:bk-ap-dung` | `node --env-file=.env.local scripts/import-bang-kiem-ap-dung-csv.mjs` | **GIỮ?** | nhập dữ liệu bảng kiểm, có thể cần lại · file: `import-bang-kiem-ap-dung-csv.mjs` ← không ai |
| `mdm:import:bk-ap-dung:dry` | `DRY_RUN=1 node --env-file=.env.local scripts/import-bang-kiem-ap-dung…` | **GIỮ?** | chạy thử của lệnh trên · file: `import-bang-kiem-ap-dung-csv.mjs` ← không ai |
| `pilot:dashboard:explain:local` | `node scripts/run-pilot-dashboard-explain.mjs --local` | **GIỮ?** | bản local của `pilot:dashboard:explain:linked` · file: `run-pilot-dashboard-explain.mjs` ← pilot:dashboard:explain:linked |
| `seed:gstt-bang-kiem` | `node --env-file=.env.local scripts/seed-gstt-bang-kiem-from-seed.mjs` | **GIỮ?** | seed dữ liệu · file: `seed-gstt-bang-kiem-from-seed.mjs` ← không ai |
| `test:e2e:install` | `playwright install chromium` | **GIỮ?** | cài trình duyệt Playwright lần đầu |

«file: X ← không ai» = file `scripts/*` đó cũng mồ côi nếu cắt dòng; việc xóa file là lát riêng, chưa đề xuất ở đây.

## 3. Người gõ tay (63) — mặc định GIỮ

| Script | Nơi nhắc / qua script |
|---|---|
| `dev` | tài liệu: CLAUDE.md,README.md |
| `dev:local` | tài liệu: docs/core/operations-sop.md |
| `verify` | tài liệu: .claude/commands/intake-nv.md,.claude/commands/intake.md |
| `trace` | tài liệu: .claude/commands/chay-lien-tuc.md,docs/bo-tai-lieu/03-tien-do-thuc-trang.md |
| `impact` | tài liệu: .claude/commands/chay-lien-tuc.md,CLAUDE.md |
| `verify:full` | tài liệu: docs/core/governance-pipeline.md,docs/core/implementation-mapping.md |
| `module:gate` | tài liệu: .claude/agents/slice-fixer.md,.claude/commands/chay-lien-tuc.md |
| `module:audit` | tài liệu: .claude/commands/chay-lien-tuc.md,.claude/commands/ra-soat.md |
| `sync:check` | tài liệu: docs/core/handover-roadmap.md |
| `sync:check:local` | tài liệu: docs/core/handover-roadmap.md |
| `local:golden:verify` | tài liệu: docs/core/adr-cssd-fact-write-rls.md,docs/core/operations-sop.md |
| `local:golden:reset` | tài liệu: docs/core/implementation-mapping.md,docs/core/operations-sop.md |
| `wiki:index` | tài liệu: docs/README.md,docs/wiki/WIKI_SCHEMA.md |
| `cssd:db:audit` | tài liệu: scripts/README.md,scripts/sql/README.md |
| `cssd:db:audit:local` | qua script: cssd:db:audit:local <- scripts/local-golden-verify.mjs <- local:golden:verify |
| `fact:orphan:sweep` | tài liệu: scripts/README.md,scripts/sql/README.md |
| `cssd:demo:reset:local` | tài liệu: docs/core/operations-sop.md,docs/modules/cssd/domain-overview.md |
| `gstt:db:audit` | tài liệu: docs/core/operations-sop.md,scripts/README.md |
| `gstt:db:audit:local` | qua script: gstt:db:audit:local <- scripts/local-golden-verify.mjs <- local:golden:verify |
| `env:bootstrap` | qua script: env:bootstrap <- trial:prep |
| `env:check` | qua script: env:check <- trial:prep |
| `trial:prep` | tài liệu: CLAUDE.md,README.md |
| `pilot:ship` | tài liệu: docs/core/governance-pipeline.md,docs/core/lean-execution.md |
| `pilot:go-live:precheck` | qua script: pilot:go-live:precheck <- pilot:go-live:gate |
| `pilot:go-live:precheck:local` | qua script: pilot:go-live:precheck:local <- pilot:go-live:gate:local |
| `pilot:go-live:gate` | tài liệu: README.md,docs/core/implementation-mapping.md |
| `pilot:go-live:gate:local` | tài liệu: README.md,docs/core/pilot-core-modules-go-live.md |
| `trial:db:precheck` | tài liệu: .github/pull_request_template.md,docs/core/operations-sop.md |
| `trial:db:precheck:local` | tài liệu: .github/pull_request_template.md,docs/core/engineering-guidelines.md |
| `smoke:gsc-vst` | tài liệu: docs/core/operations-sop.md,scripts/sql/README.md |
| `smoke:gsc-vst:local` | qua script: smoke:gsc-vst:local <- pilot:go-live:gate:local |
| `trial:auth:precheck` | tài liệu: docs/core/operations-sop.md,docs/core/pilot-core-modules-go-live.md |
| `trial:auth:precheck:local` | tài liệu: docs/core/operations-sop.md,docs/core/pilot-core-modules-go-live.md |
| `trial:rbac:roles` | tài liệu: docs/reference/guides/incident-backup-playbook.md,scripts/sql/README.md |
| `trial:rbac:roles:local` | tài liệu: docs/core/operations-sop.md |
| `trial:qlcv:precheck` | tài liệu: docs/core/implementation-mapping.md |
| `trial:qlcv:precheck:local` | qua script: trial:qlcv:precheck:local <- scripts/local-golden-verify.mjs <- local:golden:verify |
| `trial:audit:probe` | tài liệu: docs/core/pilot-core-modules-go-live.md |
| `trial:audit:probe:local` | qua script: trial:audit:probe:local <- scripts/local-golden-verify.mjs <- local:golden:verify |
| `pilot:dashboard:explain:linked` | tài liệu: scripts/sql/README.md |
| `mdm:postcheck:sql` | tài liệu: docs/core/operations-sop.md,scripts/sql/README.md |
| `mdm:postcheck:fk` | tài liệu: scripts/sql/README.md |
| `mdm:apply-and-verify` | tài liệu: scripts/README.md |
| `verify:mdm` | tài liệu: .claude/commands/intake-nv.md,.claude/commands/intake.md |
| `ops:bulk-ksnk-onboard` | tài liệu: scripts/README.md |
| `ssot:db:guard` | tài liệu: docs/core/operations-sop.md,scripts/README.md |
| `ssot:db:guard:local` | qua script: ssot:db:guard:local <- scripts/local-golden-verify.mjs <- local:golden:verify |
| `table:normalize` | tài liệu: docs/reference/guides/bv103-visual-language.md |
| `columns:chrome-check` | tài liệu: docs/reference/guides/bv103-visual-language.md,scripts/README.md |
| `panel:normalize` | tài liệu: docs/reference/guides/bv103-visual-language.md |
| `panel:wire` | tài liệu: docs/reference/guides/bv103-visual-language.md |
| `panel:chrome-check` | tài liệu: docs/reference/guides/bv103-visual-language.md,scripts/README.md |
| `audit:legacy-rpc` | tài liệu: docs/core/implementation-mapping.md |
| `audit:views` | tài liệu: docs/core/database-view-catalog.md,docs/core/operations-sop.md |
| `gstt:gap:backfill` | tài liệu: scripts/README.md |
| `admin:health:check` | qua script: admin:health:check <- verify:admin |
| `admin:rbac:sync` | tài liệu: docs/core/operations-sop.md,scripts/README.md |
| `admin:rbac:sync:local` | tài liệu: docs/core/operations-sop.md |
| `admin:rbac:parity` | tài liệu: docs/core/operations-sop.md |
| `admin:rbac:parity:local` | tài liệu: docs/core/operations-sop.md |
| `verify:admin` | tài liệu: docs/core/pilot-core-modules-go-live.md,docs/modules/mdm/README.md |
| `test:admin` | tài liệu: docs/modules/mdm/README.md |
| `test:pilot` | tài liệu: .github/pull_request_template.md |

## 4. Máy gọi (32) — GIỮ

| Script | Chuỗi gọi (từ gốc máy) |
|---|---|
| `build` | build <- .github/workflows/ci.yml |
| `start` | start <- playwright.config.ts |
| `lint` | lint <- .github/workflows/ci.yml |
| `lint:cssd-architecture` | lint:cssd-architecture <- .github/workflows/ci.yml |
| `verify:quick` | verify:quick <- scripts/verify-changed.mjs <- verify:changed <- .claude/hooks/stop-gate.mjs |
| `verify:changed` | verify:changed <- .claude/hooks/stop-gate.mjs |
| `docs:links:check` | docs:links:check <- .github/workflows/ci.yml |
| `repo:hygiene` | repo:hygiene <- .github/workflows/ci.yml |
| `dead-code:scan` | dead-code:scan <- .github/workflows/ci.yml |
| `imports:cssd-mdm` | imports:cssd-mdm <- verify:cssd <- .github/workflows/ci.yml |
| `imports:master-crud` | imports:master-crud <- verify:engineering <- .github/workflows/ci.yml |
| `guard:boundaries` | guard:boundaries <- verify:engineering <- .github/workflows/ci.yml |
| `test:cssd` | test:cssd <- verify:cssd <- .github/workflows/ci.yml |
| `test:coverage` | test:coverage <- .github/workflows/ci.yml |
| `verify:cssd` | verify:cssd <- .github/workflows/ci.yml |
| `test:e2e:ci` | test:e2e:ci <- .github/workflows/ci.yml |
| `mdm:refresh` | mdm:refresh <- src/modules/quan-tri-he-thong/views/MdmGovernanceView.tsx |
| `mdm:coverage:gate` | mdm:coverage:gate <- verify:mdm:local <- scripts/verify-changed.mjs <- verify:changed |
| `mdm:migrate` | mdm:migrate <- src/lib/mdm-migrate-guard.spec.ts |
| `mdm:migrate:local` | mdm:migrate:local <- src/modules/quan-ly-cong-viec/lib/qlcv-supabase-error.ts |
| `mdm:postcheck:sql:local` | mdm:postcheck:sql:local <- verify:mdm:local <- scripts/verify-changed.mjs <- verify:changed |
| `mdm:postcheck:fk:local` | mdm:postcheck:fk:local <- verify:mdm:local <- scripts/verify-changed.mjs <- verify:changed |
| `verify:mdm:local` | verify:mdm:local <- scripts/verify-changed.mjs <- verify:changed <- .claude/hooks/stop-gate.mjs |
| `engineering:baseline` | engineering:baseline <- verify:engineering <- .github/workflows/ci.yml |
| `engineering:contract:gate` | engineering:contract:gate <- verify:engineering <- .github/workflows/ci.yml |
| `legacy:guard` | legacy:guard <- verify:engineering <- .github/workflows/ci.yml |
| `legacy:sql:guard` | legacy:sql:guard <- verify:engineering <- .github/workflows/ci.yml |
| `security:baseline` | security:baseline <- verify:engineering <- .github/workflows/ci.yml |
| `verify:engineering` | verify:engineering <- .github/workflows/ci.yml |
| `layout:drift-check` | layout:drift-check <- .github/workflows/ci.yml |
| `layout:typography-check` | layout:typography-check <- .github/workflows/ci.yml |
| `test:e2e` | test:e2e <- scripts/e2e-ci-gate.mjs <- test:e2e:ci <- .github/workflows/ci.yml |

## 5. Câu hỏi PO (gom một lần, đáp án đề xuất sẵn)

1. Cắt 11 dòng nhóm CẮT khỏi `package.json` (giữ nguyên file `scripts/*`, kéo theo sửa 1 echo)? **Đề xuất: đồng ý.**
2. 6 guard nhóm NỐI? chưa chạy ở đâu: ghi `SO_NO` để gắn vào gate sau, hay cắt luôn? **Đề xuất: ghi `SO_NO`, chưa cắt, chưa nối.**
3. 10 script nhóm GIỮ? (dữ liệu/bản local): **Đề xuất: giữ.**

Giả định: «không nơi gọi» chỉ tính trong repo + tài liệu; script người ta gõ tay mà tài liệu không nhắc là không đo được.

## Tự kiểm

- Yêu cầu «lập danh sách npm script không có nơi gọi, PO duyệt, chưa xóa» → §2 (27 dòng, đếm khớp 122 = 32+63+27), §5 (duyệt), `git diff --stat` không chạm `package.json`/`scripts/`. Không lệch.
- Mâu thuẫn CLAUDE.md: «Never tạo tài liệu thứ hai» — đây là plan trong `.claude/plans/`, không phải `docs/`; «≤ 8 file/task» — chạm 2 file. Không lệch.
- Từ mơ hồ «không nơi gọi» đã thành điều kiện đo ở §1; «lỗi thời» ở nhóm CẮT mỗi dòng kèm lý do kiểm được. Bước thừa: không.
