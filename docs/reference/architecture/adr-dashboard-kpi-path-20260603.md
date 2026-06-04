# ADR: Đường dữ liệu KPI Dashboard (2026-06-03)

## Trạng thái

**Accepted (2026-06-03)** — benchmark local: [dashboard-rpc-benchmark-20260603.md](../reports/dashboard-rpc-benchmark-20260603.md). Staging: chạy lại `npm run pilot:dashboard:explain:linked` khi data pilot đầy.

## Bối cảnh

Hiện có **ba** nguồn KPI giám sát:

1. **RPC strategic / v4** — `rpc_dashboard_vst_strategic_analytics`, `rpc_dashboard_gsc_strategic_analytics`, `rpc_get_compliance_dashboard_v4` (app đọc trực tiếp).
2. **Bảng `gstt_fact_*_summary`** — đồng bộ bằng trigger trên phiên VST/GSC (baseline).
3. **Báo cáo tổng hợp** — `bao-cao-tong-hop-core.ts` compose RPC VST+GSC+NKBV phía app.

## Quyết định (đề xuất)

| Layer | Nguồn | Ghi chú |
|-------|--------|---------|
| Command Center / tab analytics | **RPC-only** | Giữ contract `src/lib/rpc-contract-dashboard.spec.ts` |
| Báo cáo tổng hợp | **RPC compose** | Không đọc summary tables |
| Summary tables | **DROP (2026-06-04)** | Migration `20260604100000` — RPC-only |

## Hậu quả

- Cần chạy R-20 benchmark trước DROP trigger/summary.
- Doc `implementation-mapping` ghi rõ RPC là read path; summary = legacy sync.

## Verify

```bash
npm run pilot:dashboard:explain:linked   # hoặc :local
```

Kết quả mẫu: [dashboard-rpc-benchmark-20260603.md](../reports/dashboard-rpc-benchmark-20260603.md).
