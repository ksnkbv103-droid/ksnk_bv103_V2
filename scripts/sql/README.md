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
| `gsc-vst-rpc-smoke.sql` | `smoke:gsc-vst` / `:local` | Smoke JSON contract GSC/VST strategic + compare matrices RPC |
| `pilot-dashboard-explain/*.sql` | `pilot:dashboard:explain:linked` / `:local` | EXPLAIN từng RPC dashboard (runner: `run-pilot-dashboard-explain.mjs`) |

## Admin probe (chạy tay / slice admin)

| File | Ghi chú |
|------|---------|
| `admin-perf-baseline.sql` | Baseline perf admin |
| `admin-rbac-probe.sql` | Probe RBAC |
| `admin-slice-pre-apply-probe.sql` | Probe SSOT admin/RBAC sau migrate (thay Slice 7 cũ) |
| `rbac-v-auth-compat-probe.sql` | Sau migration RBAC 03/06 — `v_auth_permissions` / orphan views |

## CSSD / FK gate

| File | Lệnh npm |
|------|----------|
| `cssd-tram-fk-health-audit.sql` | `cssd:db:audit` / `:local` |
| `fk-public-referencing-danh-muc-tuy-bien.sql` | `mdm:postcheck:fk` / `:local` |

## Archive (không active)

[`../archive/sql-20260531/`](../archive/sql-20260531/) — GSC QA, smoke RCA, slice8 template, FK reports cũ.

## Migration SSOT

Chuỗi apply: `supabase/migrations/*.sql` (~62 file pilot, `20260530000000` … `20260611100000`). Lịch sử pre-pilot: `docs/archive/pilot_chain_20260520_20260529.tar.gz`.

**Lưu ý khu vực giám sát:** chuỗi `20260608030000` → `20260608032500` (revert) → `20260608050000` (mã code cuối) — trạng thái cuối SSOT là sau `20260608050000`; không tái dùng mã `KV_TR_*`/`KV_DO_*` trong app/script mới.

Xem [`../../supabase/migrations/README.md`](../../supabase/migrations/README.md) và [`../../docs/core/governance-pipeline.md`](../../docs/core/governance-pipeline.md).
