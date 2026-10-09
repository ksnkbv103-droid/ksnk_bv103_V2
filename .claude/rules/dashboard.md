---
paths:
  - "src/modules/dashboard/**"
  - "src/lib/analytics/**"
  - "src/app/thong-ke/**"
  - "src/app/bao-cao-tong-hop/**"
---

# Dashboard & Analytics — ngữ cảnh spec

Trước khi sửa KPI, biểu đồ, báo cáo tổng hợp, deep link, in ấn:

1. [`metric-dictionary.md`](../../docs/modules/dashboard/metric-dictionary.md) — SSOT công thức; đổi công thức → `Spec change`
2. [`bao-cao-tong-hop.md`](../../docs/modules/dashboard/bao-cao-tong-hop.md) — thứ tự màn hình, in, comparable TGS/KSNK
3. [`implementation-mapping.md`](../../docs/core/implementation-mapping.md) — RPC/bảng liên quan

## Ranh giới

- Process (VST/GSC/CCS) ≠ outcome (NKBV) — không gộp NKBV vào CCS.
- Không đọc `gstt_fact_*_summary` / `*_summary` trực tiếp — dùng RPC strategic.
- Logic thuần → `supervision-metrics/`, `bao-cao-tong-hop-core.ts`; I/O → actions.

## Verify

- `npm run verify:engineering` sau Server Action / RPC contract
- Chạy spec liên quan khi đổi công thức: `bao-cao-tong-hop-core.spec.ts`, `supervision-matrix-mappers.spec.ts`

## Dashboard / Analytics pilot

## Invariant nghiệp vụ

- **CCS** = `0.5 × ty_le_vst + 0.5 × ty_le_gsc` khi cả hai có giá trị — **không** gộp NKBV vào CCS.
- **Nguồn:** RPC strategic VST/GSC — **không** đọc `*_summary` trực tiếp.
- **Comparable đối soát:** `vol_tgs > 0` và `vol_ksnk > 0`; thiếu một nguồn → bảng loại trừ.
- **Badge «vs kỳ trước»:** chênh 2 tuần cuối trên trendline tuần — không so kỳ lọc trước.
- **Đổi công thức KPI** → bắt buộc `Spec change` + cập nhật `metric-dictionary.md`.

## Đọc bắt buộc

1. [`metric-dictionary.md`](../../docs/modules/dashboard/metric-dictionary.md) — SSOT công thức
2. [`bao-cao-tong-hop.md`](../../docs/modules/dashboard/bao-cao-tong-hop.md) — luồng màn hình + in
3. [`read-minimum.md`](../../docs/core/read-minimum.md) — dòng Dashboard

## Code chính

- `src/lib/analytics/supervision-metrics/`
- `src/modules/dashboard/lib/bao-cao-tong-hop-core.ts` (+ `.spec.ts`)
- `src/lib/rpc-contract-dashboard.spec.ts`

## Rule & verify

- `npm run verify:engineering` sau action/RPC analytics
- Spec: `bao-cao-tong-hop-core.spec.ts`, `supervision-matrix-mappers.spec.ts` khi đổi công thức
