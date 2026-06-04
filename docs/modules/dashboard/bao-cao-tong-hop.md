# Báo cáo tổng hợp KSNK (`/bao-cao-tong-hop`)

> Pilot 2026-06 — compose VST + GSC + NKBV từ RPC strategic (không đọc `*_summary`).

## Route & code

| Thành phần | Path |
|------------|------|
| Page | `src/app/bao-cao-tong-hop/page.tsx` |
| View | `src/modules/dashboard/views/bao-cao-tong-hop-page.tsx` |
| Action | `getBaoCaoTongHopAnalytics` — `bao-cao-tong-hop.actions.ts` |
| Domain thuần | `bao-cao-tong-hop-core.ts` (+ spec) |

## Công thức CCS (process)

**CCS** = *Chỉ số tuân thủ tổng hợp* (process): `50%` tuân thủ VST + `50%` tuân thủ GSC trong phạm vi lọc; NKBV là outcome riêng (không gộp CCS).

Badge **“vs kỳ trước”** trên KPI: chênh lệch % giữa **hai tuần cuối** trên trendline tuần (điểm cuối − điểm kế cuối), làm tròn 1 chữ số thập phân — không phải so cùng độ dài kỳ lọc trước đó.

Biểu đồ xu hướng: lọc **Tuần / Tháng / Quý / Năm** (gộp trung bình đơn giản các điểm tuần trong bucket).

## In báo cáo (giai đoạn 1)

Template `bao-cao-tong-hop-print.ts`: Điều hành (CCS/KPI, xu hướng tuần, top/bottom khoa), phân tích khu vực & đối tượng (VST+GSC), ma trận khoa GSC, VST/GSC chi tiết, xu hướng từng bảng kiểm (tối đa 12 RPC khi bấm In), Phần III nhận xét/kiến nghị.

## Pilot DoD

1. Lọc khoa/thời gian → KPI + trend + so sánh kỳ.  
2. Deep link sang module (`buildAnalyticsDeepLink`).  
3. In/export narrative controls khi bật in.

## SSOT mapping

Changelog một dòng trong [`implementation-mapping.md`](../../core/implementation-mapping.md).
