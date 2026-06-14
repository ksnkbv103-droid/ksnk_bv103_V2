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

## Thứ tự màn hình (Wave 1–2)

KPI → Xu hướng → So sánh khoa (triptych TGS/KSNK/đối soát chỉ khi đủ hai nguồn · triển khai TGS/KSNK · bảng loại trừ · ma trận bao phủ) → NKBV (outcome, sau process) → Chuyên đề.

**Comparable** đối soát: `vol_tgs > 0` và `vol_ksnk > 0`. Khoa thiếu một nguồn nằm bảng «Chưa đủ điều kiện» («Chưa TGS» / «Chưa KSNK» / «Chưa triển khai»).

## In báo cáo

Template `bao-cao-tong-hop-print.ts`: bìa (kỳ, mã BC-TH, phạm vi, ngày in), chân trang lặp mỗi trang A4, Điều hành (CCS/KPI, xu hướng tuần, xếp hạng khoa đầy đủ, bảng loại trừ đối soát, ma trận bao phủ rút gọn top 8 BK), NKBV sau block process, phân tích IPAC/đối tượng, VST/GSC chi tiết, xu hướng từng bảng kiểm (tối đa 12 RPC khi bấm In). **Phần III** tách trang riêng: nhận xét/kiến nghị + ngày ban hành + khối ký (Người tổng hợp / Chủ nhiệm khoa KSNK).

## Pilot DoD

1. Lọc khoa/thời gian → KPI + trend + so sánh kỳ.  
2. Deep link sang module (`buildAnalyticsDeepLink`).  
3. In/export narrative controls khi bật in.

## SSOT mapping

Changelog một dòng trong [`implementation-mapping.md`](../../core/implementation-mapping.md).
