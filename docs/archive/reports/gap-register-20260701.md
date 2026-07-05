# Gap register — Wave 2 (2026-07-01)

> Tiếp nối [gap-register-20260630.md](./gap-register-20260630.md). Baseline refresh sau remediation wave 2.

## Automated gates (local — 2026-07-01)

| Gate | Kết quả |
|------|---------|
| `npm run verify` | **PASS** |
| `npm run pilot:go-live:gate:local` | **PASS** |
| `npm run ssot:db:guard:local` | **PASS** (`legacy_compat_views_ok: true`) |
| `npm run audit:legacy-rpc` | **PASS** (sau DROP orphan RPC) |
| `npm run layout:drift-check` | **PASS** (0 blocking) |

## Staging parity (G-13)

| Check | Kết quả | Ghi chú |
|-------|---------|---------|
| `mdm:migration:list:linked` | **PASS** | Head `20260701100000` — parity local/prod (2026-07-01) |

## Gap status Wave 2

| ID | P | Mô tả | Trạng thái | Slice |
|----|---|-------|------------|-------|
| G-07 | P1 | Triple strategic RPC fetch | **Done** | S-DASH-02 `strategic-analytics-fetch.ts` |
| G-08 | P2 | GSC intervention copy 4 chỗ | **Done** | S-GSC-02 `gsc-checklist-intervention.ts` |
| G-09 | P2 | 5 panel chưa wire token | **Done** | `panel:wire` + `QlcvOperationsPanel` alias `UI` |
| G-12 | P2 | unused-var lint | **Ongoing** | boy-scout per slice |
| G-13 | P1 | Staging migration parity | **Done** | S-OPS-01 — prod `20260701100000` |
| G-14 | P0 | Nav `/thong-ke` vs `verifyCommandCenterShell` | **Done** | S-PERM-01 |
| G-15 | P1 | Dashboard nav vs shell | **Done** | S-PERM-01 `canSeeCommandCenterNav` |
| G-16 | P1 | `rpc_get_compliance_dashboard_v4` orphan | **Done** | S-RPC-01 migration DROP |
| G-17 | P2 | `rpc_reorder_tieu_chi_bang_kiem` orphan | **Done** | S-RPC-01 (app dùng `reorderTieuChis` TS) |
| G-18 | P2 | Hub giám sát không lọc quyền | **Done** | S-UX-02 |
| G-19 | P2 | Analytics shell `/thong-ke` drift | **Done** | S-UX-01 design tokens |
| G-20 | P2 | Doc ghost rows mapping | **Done** | S-DOC-01 |
| G-10 | P3 | NKBV UAT clinical | **Eng ready** | S-NKBV-UAT — chờ ký khoa KSNK |
| G-11 | P3 | GSTT RLS permissive | **Open P3** | S-RLS-01 deferred |

## P0/P1 mở: 0
