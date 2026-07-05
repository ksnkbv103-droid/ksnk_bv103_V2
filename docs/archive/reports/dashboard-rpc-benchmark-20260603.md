# Dashboard RPC benchmark — 2026-06-03 (R-20)

> Cửa sổ ~3 tháng (`BV103_ANALYTICS_DEFAULT_MONTHS`). Lệnh: `npm run pilot:dashboard:explain:local` / `:linked`.  
> ADR: [adr-dashboard-kpi-path-20260603.md](../architecture/adr-dashboard-kpi-path-20260603.md)

## Kết quả EXPLAIN (ANALYZE) — local sau `db reset`

| RPC | Execution Time (ms) | Ghi chú |
|-----|---------------------|---------|
| `rpc_dashboard_vst_strategic_analytics` | 3.59 | `01-vst-strategic.sql` |
| `rpc_dashboard_gsc_strategic_analytics` | 4.37 | `02-gsc-strategic.sql` |
| `rpc_get_compliance_dashboard_v4` | 2.50 | `03-compliance-v4.sql` |
| `rpc_get_dashboard_ksnk_staff_supervision_stats` | 2.85 | `04-ksnk-staff-stats.sql` |

**p95 local (4 RPC):** ~4.4 ms — dưới ngưỡng pilot 500 ms / request.

## Staging (linked)

Chạy lại khi volume thật tăng:

```bash
npm run pilot:dashboard:explain:linked
```

Ghi bổ sung bảng trên vào PR nếu p95 staging > 200 ms.

## Kết luận (R-21)

- **Read path:** RPC-only cho Command Center + báo cáo tổng hợp (không đọc `gstt_fact_*_summary` từ app).
- **Summary tables:** giữ DB; **không** DROP trigger cho đến khi staging benchmark xác nhận tương đương.
