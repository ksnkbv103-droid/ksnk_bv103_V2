# SQL vận hành BV103 (`scripts/sql/`)

Script **không** thuộc chuỗi migration Supabase. Chỉ file trong thư mục này (+ `scripts/master-data-cutover-postcheck.sql`) là **active**; phần còn lại → [`../archive/sql-20260531/`](../archive/sql-20260531/).

## Precheck pilot / migrate

| File | Lệnh npm | Mục đích |
|------|----------|----------|
| `trial-four-modules-precheck.sql` | `trial:db:precheck` / `:local` | Bảng/RPC tối thiểu pilot 4 module |
| `auth-pilot-precheck.sql` | `trial:auth:precheck` / `:local` | Auth + RBAC view |
| `pilot-app-views-precheck.sql` | `repo:hygiene` (kiểm tra view) | View đọc app (`v_qlcv_*`, `v_gstt_*`, `v_cssd_*`, …) |
| `master-data-cutover-postcheck.sql` | `mdm:postcheck:sql` | (ở `scripts/`) Post-cutover MDM |

## Dashboard / analytics

| File | Lệnh npm | Mục đích |
|------|----------|----------|
| `pilot-dashboard-rpc-explain-hybrid.sql` | `pilot:dashboard:explain:linked` / `:local` | EXPLAIN RPC dashboard |

## Admin probe (chạy tay / slice admin)

| File | Ghi chú |
|------|---------|
| `admin-perf-baseline.sql` | Baseline perf admin |
| `admin-rbac-probe.sql` | Probe RBAC |
| `admin-slice-pre-apply-probe.sql` | Probe trước slice |

## CSSD / FK gate

| File | Lệnh npm |
|------|----------|
| `cssd-tram-fk-health-audit.sql` | `cssd:db:audit` / `:local` |
| `fk-public-referencing-danh-muc-tuy-bien.sql` | `mdm:postcheck:fk` / `:local` |

## Archive (không active)

[`../archive/sql-20260531/`](../archive/sql-20260531/) — GSC QA, smoke RCA, slice8 template, FK reports cũ.

## Migration SSOT

Chuỗi apply: `supabase/migrations/*.sql` (18 file pilot). Lịch sử pre-pilot: `docs/archive/pilot_chain_20260520_20260529.tar.gz`.

Xem [`../../supabase/migrations/README.md`](../../supabase/migrations/README.md) và [`../../docs/core/governance-pipeline.md`](../../docs/core/governance-pipeline.md).
