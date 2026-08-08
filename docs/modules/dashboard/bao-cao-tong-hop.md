# Báo cáo tổng hợp KSNK (`/bao-cao-tong-hop`)

> Pilot 2026-06 — compose VST + GSC + NKBV từ RPC strategic (không đọc `*_summary`).  
> **Reform kiến trúc:** [`analytics-reform-202606.md`](./analytics-reform-202606.md) · [`metric-dictionary.md`](./metric-dictionary.md)

## Route & code

| Thành phần | Path |
|------------|------|
| Page | `src/app/bao-cao-tong-hop/page.tsx` |
| View | `src/modules/dashboard/views/bao-cao-tong-hop-page.tsx` |
| Action | `getBaoCaoTongHopAnalytics` — `bao-cao-tong-hop.actions.ts` |
| Domain thuần | `bao-cao-tong-hop-core.ts` (+ spec) |

## Tuân thủ process (không dùng CCS trên surface)

**Spec 2026-07-31:** UI / in / xếp hạng / Command Center **không** hiển thị CCS. Điều hành theo dõi riêng **`ty_le_vst`** và **`ty_le_gsc`**. Field `ty_le_ccs` có thể còn trong payload backend (deprecated). NKBV là outcome riêng.

Badge **«Δ 2 tuần ISO»** trên KPI: chênh lệch % giữa **hai tuần cuối** trên trendline tuần (điểm cuối − điểm kế cuối), làm tròn 1 chữ số thập phân.

Badge **«vs kỳ trước»**: so sánh **cùng độ dài kỳ lọc** liền trước (`ky_truoc` trên payload) — tách nhãn khỏi delta tuần ISO. Xem [`metric-dictionary.md`](metric-dictionary.md) § `ky_truoc`.

Biểu đồ xu hướng: lọc **Tuần / Tháng / Quý / Năm**. Khi chọn ≥1 chuyên đề (BK): **mỗi BK một đường màu**; khi Tất cả: một đường GSC tổng + VST (nếu có dữ liệu).

## Thứ tự màn hình (Wave 1–2)

KPI → Xu hướng → So sánh khoa (triptych TGS/KSNK/đối soát chỉ khi đủ hai nguồn · triển khai TGS/KSNK · bảng loại trừ · ma trận bao phủ) → NKBV (outcome, sau process) → Chuyên đề.

**Comparable** đối soát: `vol_tgs > 0` và `vol_ksnk > 0`. Khoa thiếu một nguồn nằm bảng «Chưa đủ điều kiện» («Chưa TGS» / «Chưa KSNK» / «Chưa triển khai»).

## In báo cáo

Template `bao-cao-tong-hop-print.ts`: bìa (kỳ, mã BC-TH, phạm vi, ngày in), chân trang lặp mỗi trang A4, Điều hành (CCS/KPI, xu hướng tuần, xếp hạng khoa đầy đủ, bảng loại trừ đối soát, ma trận bao phủ rút gọn top 8 BK), NKBV sau block process, phân tích IPAC/đối tượng, VST/GSC chi tiết, xu hướng từng bảng kiểm (tối đa 12 RPC khi bấm In). **Phần III** tách trang riêng: nhận xét/kiến nghị + ngày ban hành + khối ký (Người tổng hợp / Chủ nhiệm khoa KSNK).

## Pilot DoD

1. Lọc khoa/thời gian → KPI + trend + so sánh kỳ.  
2. Deep link sang module (`buildAnalyticsDeepLink` → `/thong-ke/vst` · `/thong-ke/gsc`).  
3. In/export narrative controls khi bật in.

Checklist tay: [`pilot-checklist-bao-cao-tong-hop.md`](./pilot-checklist-bao-cao-tong-hop.md).

## SSOT mapping

Changelog một dòng trong [`implementation-mapping.md`](../../core/implementation-mapping.md).
