# Dashboard & Analytics

| Đọc khi | File |
|---------|------|
| Công thức KPI / CCS | [`metric-dictionary.md`](metric-dictionary.md) |
| Báo cáo tổng hợp pilot | [`bao-cao-tong-hop.md`](bao-cao-tong-hop.md) |
| Reform kiến trúc | [`analytics-reform-202606.md`](analytics-reform-202606.md) |
| Rà soát UX toàn hệ thống (2026-07) | [`dashboard-ux-audit-20260717.md`](dashboard-ux-audit-20260717.md) |
| UI thống nhất BCTH (B+3 S3) | [`../../reference/architecture/ui-consistency-program-20260802.md`](../../reference/architecture/ui-consistency-program-20260802.md) § S3 |
| Roadmap thống kê mô tả (Chủ nhiệm + Admin) | [`descriptive-analytics-roadmap-20260729.md`](descriptive-analytics-roadmap-20260729.md) |
| Intake P0 metric CSSD Report | [`intake-cssd-report-metric-20260717.md`](intake-cssd-report-metric-20260717.md) |
| Intake P1 chrome VST/GSC | [`intake-analytics-chrome-unify-20260717.md`](intake-analytics-chrome-unify-20260717.md) |
| Intake P1 NKBV filter + deep link | [`intake-nkbv-dashboard-filter-deeplink-20260717.md`](intake-nkbv-dashboard-filter-deeplink-20260717.md) |
| Mapping RPC | [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) |

Rule: `18-dashboard-analytics-spec-context.mdc` · Skill: `@dashboard-pilot`

## Route chính

| Màn hình (nhãn UI) | Path app |
|--------------------|----------|
| Tổng quan KSNK | `/` (command center — 4 trụ) |
| Báo cáo chính thức | `/bao-cao-tong-hop` (có phụ lục CSSD) |
| Thống kê / analytics | `/thong-ke/vst`, `/thong-ke/gsc`; `/thong-ke/cssd` → `/cssd-erp/report` |
| Báo cáo CSSD (SSOT vận hành) | `/cssd-erp/report` (sản lượng · bộ · máy · NV) |
| Giám sát (hub nhập) | `/giam-sat` |

## Code chính

- `src/modules/dashboard/` — views, actions, lib báo cáo
- `src/lib/analytics/` — charts, metrics, mappers
- Spec: `bao-cao-tong-hop-core.spec.ts`, `rpc-contract-dashboard.spec.ts`

## Pilot DoD (báo cáo)

1. Lọc khoa/thời gian → KPI + trend + so sánh kỳ.
2. Deep link sang module giám sát khi có.
3. In/export khi bật in — không đổi công thức CCS không qua Spec change.

**UAT / mở W3:** [`../../reference/guides/w3-nkbv-dashboard-enablement-20260722.md`](../../reference/guides/w3-nkbv-dashboard-enablement-20260722.md) — tắt `KSNK_PILOT_CORE_MODULES` trên staging trước khi ký §B Dashboard.

## Verify

```bash
npm run verify:engineering
```

Khi đổi công thức: chạy thêm spec `bao-cao-tong-hop-core`, `supervision-matrix-mappers`.
