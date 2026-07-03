# Dashboard & Analytics

| Đọc khi | File |
|---------|------|
| Công thức KPI / CCS | [`metric-dictionary.md`](metric-dictionary.md) |
| Báo cáo tổng hợp pilot | [`bao-cao-tong-hop.md`](bao-cao-tong-hop.md) |
| Reform kiến trúc | [`analytics-reform-202606.md`](analytics-reform-202606.md) |
| Mapping RPC | [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) |

Rule: `18-dashboard-analytics-spec-context.mdc` · Skill: `@dashboard-pilot`

## Route chính

| Màn hình | Path app |
|----------|----------|
| Báo cáo tổng hợp | `/bao-cao-tong-hop` |
| Thống kê / analytics | `/thong-ke/*` |
| Command center | module `dashboard/views/command-center-*` |

## Code chính

- `src/modules/dashboard/` — views, actions, lib báo cáo
- `src/lib/analytics/` — charts, metrics, mappers
- Spec: `bao-cao-tong-hop-core.spec.ts`, `rpc-contract-dashboard.spec.ts`

## Pilot DoD (báo cáo)

1. Lọc khoa/thời gian → KPI + trend + so sánh kỳ.
2. Deep link sang module giám sát khi có.
3. In/export khi bật in — không đổi công thức CCS không qua Spec change.

## Verify

```bash
npm run verify:engineering
```

Khi đổi công thức: chạy thêm spec `bao-cao-tong-hop-core`, `supervision-matrix-mappers`.
