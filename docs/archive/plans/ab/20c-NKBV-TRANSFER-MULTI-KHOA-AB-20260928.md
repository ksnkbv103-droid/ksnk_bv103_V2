# 20c — NKBV Transfer đa khoa 24h (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 |
| Neo | SSOT 10 §B.2.5; Soft audit park #6; backlog NKBV-L03 |
| Tip | `nkbv-timeline-math.ts` — mới transfer-day / day-after |
| Trạng thái | **Domain chốt A** — PO xác nhận khi rảnh (không chặn Soft nếu Lead lấy A) |
| Ưu tiên | #3 sau RIT + age-null |

## §1. Lock SSOT

LOA = khoa BN đang nằm vào DOE, trừ Transfer Rule.  
Transfer: DOE = ngày chuyển **hoặc** ngày sau chuyển → khoa **chuyển đi**.  
**Nhiều khoa trong 24 giờ trước DOE** → khoa **đầu ngày trước DOE** (Ch.2).  
Không = «khoa nằm lâu hơn».

## §2. Ba phương án

| | A — Full Ch.2 multi-khoa (khuyến nghị) | B — Chỉ transfer-day/day-after (tip) | C — Longest-stay heuristic |
|---|----------------------------------------|--------------------------------------|----------------------------|
| Hành vi | Nếu ≥2 khoa trong 24h trước DOE → LOA = khoa đầu của ngày lịch trước DOE | Giữ tip hiện tại | Khoa có nhiều ngày nhất |
| Đúng NHSN | Khớp §B.2.5 | Thiếu nhánh multi-khoa | Lệch Transfer Rule |
| Phụ thuộc | `ba_ngay_khoa` đủ | Ít | Sai hệ thống |
| | Thiếu grid → warn (L07), không đoán | | |

**Chốt Domain = A.** Loại B (lệch SSOT). Loại C (cấm cảm tính).

## §3. DoD mỏng Soft

1. Implement multi-khoa 24h trong `nkbv-timeline-math` (+ hydrate Hub).
2. Spec: CC→ICU transfer day=DOE → LOA=CC; ≥2 khoa trong 24h trước DOE → first khoa ngày trước DOE.
3. Grid trống → không gán LOA «im lặng»; warn (khớp L07).
4. Không đụng RIT/MBI trong lát này.
