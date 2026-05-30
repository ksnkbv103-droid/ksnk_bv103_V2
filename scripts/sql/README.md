# SQL vận hành BV103 (`scripts/sql/`)

Script **không** thuộc chuỗi migration Supabase. Dùng để precheck, audit, EXPLAIN hiệu năng, smoke test.

## Precheck pilot / migrate

| File | Lệnh npm | Mục đích |
|------|----------|----------|
| `trial-four-modules-precheck.sql` | `trial:db:precheck` | Bảng/RPC tối thiểu pilot 4 module |
| `auth-pilot-precheck.sql` | `trial:auth:precheck` | Auth + RBAC view |
| `master-data-cutover-postcheck.sql` | `mdm:postcheck:sql` | (ở `scripts/`) Post-cutover MDM |

## Dashboard / analytics (hybrid)

| File | Lệnh npm | Mục đích |
|------|----------|----------|
| `pilot-dashboard-rpc-explain-hybrid.sql` | `pilot:dashboard:explain:linked` / `:local` | EXPLAIN 4 RPC app đang gọi sau reform |

## Admin / RBAC / perf baseline

| File | Ghi chú |
|------|---------|
| `admin-perf-baseline.sql` | Baseline slice admin (20260526) |
| `admin-rbac-probe.sql` | Probe quyền admin |
| `admin-slice-pre-apply-probe.sql` | Probe trước slice admin |

## CSSD / FK / integrity

| File | Lệnh npm |
|------|----------|
| `cssd-tram-fk-health-audit.sql` | `cssd:db:audit` |
| `fk-public-referencing-danh-muc-tuy-bien.sql` | `mdm:postcheck:fk` |
| `fk-integrity-report.sql` | Chạy tay |
| `fk-audit-denorm-and-gaps.sql` | Chạy tay |
| `audit-text-vs-fk-columns.sql` | Chạy tay |

## Giám sát / GSC seed QA

| File | Ghi chú |
|------|---------|
| `gsc-part34-count-contextual.sql` | Đếm Part 3–4 theo ngữ cảnh |
| `gsc-part34-post-migrate-check.sql` | Post-migrate Part 3–4 |
| `smoke_test_session_level_rca.sql` | Smoke RCA session-level (rollback) |
| `vst-data-integrity-report.sql` | Báo cáo VST |
| `refresh-gsc-dashboard-mv.sql` | Refresh MV daily (legacy; xem comment trong file) |

## Tham khảo (không apply)

| Thư mục | Nội dung |
|---------|----------|
| `reference/ssot-slice8/` | Template Slice 8 Double SSOT — **đã resolved**, không đưa vào `supabase/migrations/` |

## Migration SSOT

Chuỗi apply: `supabase/migrations/*.sql` (thư mục gốc only). Lịch sử: `supabase/migrations/archive_legacy/`.

Xem [`supabase/migrations/README.md`](../../supabase/migrations/README.md) và [`docs/specs/GOVERNANCE_PIPELINE.md`](../../docs/specs/GOVERNANCE_PIPELINE.md).
