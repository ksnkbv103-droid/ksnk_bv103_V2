# Gap register — 2026-06-30

> Phân loại: **P0** an toàn/dữ liệu · **P1** kiến trúc · **P2** UX/perf · **P3** roadmap

| ID | P | Module | Dimension | Mô tả nghiệp vụ | Bằng chứng | Trạng thái | Slice |
|----|---|--------|-----------|-----------------|------------|------------|-------|
| G-01 | P0 | GSTT | DB | View compat `dm_bang_kiem` tái tạo sau cleanup | `ssot:db:guard` fail trước audit | **Done** | migration `20260701000000` |
| G-02 | P0 | MDM/BK | DB | RPC `rpc_gstt_dm_bang_kiem_max_numeric_suffix` thiếu trên DB | app gọi RPC không tồn tại | **Done** | cùng migration |
| G-03 | P1 | Analytics | FE | ESLint hooks errors chặn `verify` | supervision-charts-khoa, use-analytics-filters | **Done** | inline fix |
| G-04 | P2 | UX | FE | 38 layout drift (text-[10px], panel chrome) | layout:drift-check fail | **Done** | typography + chrome |
| G-05 | P2 | Ops | SQL | Multi-statement SQL scripts fail CLI runner | cssd-tram, audit-probe | **Done** | JSON single-query |
| G-06 | P2 | Ops | Hygiene | 4 SQL files ngoài allowlist | repo:hygiene | **Done** | allowlist update |
| G-07 | P1 | Dashboard | Backend | 3 luồng fetch strategic RPC trùng | backend audit | **Done** | `use-analytics-filter-payload.ts` |
| G-08 | P2 | GSC | Backend | Logic intervention checklist copy 4 chỗ | backend audit | **Done** | `gsc-checklist-intervention.ts` SSOT |
| G-09 | P2 | UX | FE | 5 panel import chrome chưa wire token | adoption-warn | **Done** | `panel:wire` 8 files |
| G-10 | P3 | NKBV | Domain | UAT clinical forms chưa ký KSNK | debt D-14 | **Automated OK** | manual §B còn 4 case tay |
| G-11 | P3 | GSTT | Security | RLS permissive trên một số `gstt_fact_*` | architecture-one-pager | **Open P3** | RLS hardening slice |
| G-12 | P2 | ESLint | Code | 106 unused-var warnings | npm run lint | **Open P2** | boy-scout per slice |
| G-13 | P1 | Staging | Ops | Linked staging chưa verify parity 85 migrations | `mdm:migrate` 401 Unauthorized | **Blocked ops** | Cần refresh `SUPABASE_ACCESS_TOKEN` / DB password |
| G-14 | P2 | CSSD | Script | `add-panel-chrome` ref file deleted | add-panel-chrome-imports.mjs | **Done** | removed stale entry |

---

## P0/P1 mở: 0 code · 1 ops (G-13 token staging)

## Đề xuất slice tiếp theo

| Slice | Scope |
|-------|-------|
| S-OPS-01 | Refresh Supabase token → `npm run mdm:migrate` staging |
| S-NKBV-UAT | PO ký 4 case tay trong pilot-clinical-checklist |
