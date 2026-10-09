# Dashboard & Analytics

| Đọc khi | File |
|---------|------|
| Công thức KPI / CCS | [`metric-dictionary.md`](metric-dictionary.md) |
| Báo cáo tổng hợp | [`bao-cao-tong-hop.md`](bao-cao-tong-hop.md) |
| Mapping RPC | [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) |
| Chrome / IA | [`../../reference/architecture/page-chrome-contract-20260731.md`](../../reference/architecture/page-chrome-contract-20260731.md) · [`../../ux/principles.md`](../../ux/principles.md) |

Rule: `.claude/rules/dashboard.md`

## Route chính

| Màn hình | Path |
|----------|------|
| Báo cáo chính thức | `/bao-cao-tong-hop` (`/` redirect H2) |
| Thống kê | `/thong-ke/vst`, `/thong-ke/gsc`; `/thong-ke/cssd` → `/cssd-erp/report` |
| Báo cáo CSSD | `/cssd-erp/report` |
| Hub giám sát | `/giam-sat` |

## Code

- `src/modules/dashboard/` — views, actions, lib báo cáo
- `src/lib/analytics/` — charts, metrics, mappers

## Pilot DoD

1. Lọc khoa/thời gian → KPI + trend + so sánh kỳ.
2. Deep link sang giám sát khi có.
3. In/export không đổi công thức CCS ngoài Spec change.

```bash
npm run verify:engineering
```
