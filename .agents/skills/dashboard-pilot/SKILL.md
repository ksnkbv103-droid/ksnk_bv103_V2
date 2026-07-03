---
name: dashboard-pilot
description: Invariant Dashboard/Analytics pilot BV103 — KPI, CCS, báo cáo tổng hợp. Invoke manual @dashboard-pilot khi sửa thống kê/báo cáo.
---

# Dashboard / Analytics pilot

## Invariant nghiệp vụ

- **CCS** = `0.5 × ty_le_vst + 0.5 × ty_le_gsc` khi cả hai có giá trị — **không** gộp NKBV vào CCS.
- **Nguồn:** RPC strategic VST/GSC — **không** đọc `*_summary` trực tiếp.
- **Comparable đối soát:** `vol_tgs > 0` và `vol_ksnk > 0`; thiếu một nguồn → bảng loại trừ.
- **Badge «vs kỳ trước»:** chênh 2 tuần cuối trên trendline tuần — không so kỳ lọc trước.
- **Đổi công thức KPI** → bắt buộc `Spec change` + cập nhật `metric-dictionary.md`.

## Đọc bắt buộc

1. [`metric-dictionary.md`](../../../docs/modules/dashboard/metric-dictionary.md) — SSOT công thức
2. [`bao-cao-tong-hop.md`](../../../docs/modules/dashboard/bao-cao-tong-hop.md) — luồng màn hình + in
3. [`read-minimum.md`](../../../docs/core/read-minimum.md) — dòng Dashboard

## Code chính

- `src/lib/analytics/supervision-metrics/`
- `src/modules/dashboard/lib/bao-cao-tong-hop-core.ts` (+ `.spec.ts`)
- `src/lib/rpc-contract-dashboard.spec.ts`

## Rule & verify

- Rule glob: `18-dashboard-analytics-spec-context.mdc`
- `npm run verify:engineering` sau action/RPC analytics
- Spec: `bao-cao-tong-hop-core.spec.ts`, `supervision-matrix-mappers.spec.ts` khi đổi công thức
