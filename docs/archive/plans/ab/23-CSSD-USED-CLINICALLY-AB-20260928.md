# 23 — CSSD `used_clinically` + nguồn sự kiện (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Neo | Backlog CSSD-L07; 17 §17.3 · 17d G-P0-05 / PO#2; 18 M-23 |
| Trạng thái | **Domain chốt A** (PA A — Nghĩa approved 2026-09-28) — Soft lấy A |
| Không | Sửa code từ Domain; đoán used từ catalog |

## Vấn đề
Cờ `used_clinically` quyết định SC picker (CAP_PHAT còn IN đến khi used) và danh sách thu hồi BI+ (M-23: ¬used → thu hồi; used → list KSNK). Soft **không** được bịa nguồn.

## Phương án

| | A — Event sau giao khoa / ghi nhận lâm sàng (chốt) | B — Manual-only toggle | C — Auto khi in / timestamp `CAP_PHAT` |
|---|-----------------------------------------------------|------------------------|----------------------------------------|
| | Nguồn = khoa nhận sau CAP_PHAT **hoặc** ghi nhận lâm sàng/PM; mỗi lần set có **actor + timestamp**; flag **chỉ** qua sự kiện tường minh | NV bật tay trên UI | Set silent khi in CP hoặc suy từ giờ cấp phát |
| Đúng nghiệp vụ | Khớp 17 §17.3 / 17d: «đã dùng tại khoa/PM» ≠ «đã cấp» | Dễ quên → picker/recall lệch | Cấp ≠ dùng lâm sàng (anti-bias reject) |
| An toàn | Recall tôn trọng cờ; Soft không invent | Thiếu event → nợ vận hành | False-used / bỏ sót thu hồi |

**Chốt A.** Loại B làm mặc định (dễ quên). Loại C (bịa used từ print/timestamp). Toggle tay có thể là **fallback** khi thiếu tích hợp khoa/PM — không thay event A.

## DoD Soft (mỏng)
1. Set `used_clinically` chỉ qua explicit event (actor+timestamp); **không** silent on print CAP_PHAT.
2. SC picker: `… AND NOT used_clinically` (17 §17.3).
3. Recall BI+ (M-23): ¬used → thu hồi; used → list đánh giá KSNK (không «thu hồi được»).
4. Không đụng harden phiếu mẻ AB-1…6 / L08 ledger trong lát này.
