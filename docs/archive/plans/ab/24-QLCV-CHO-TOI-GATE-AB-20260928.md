# 24 — QLCV gate «Chờ tôi» actor vs global (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Neo | Backlog QLCV-L03 park; 19 §6 chips; Soft ask Domain |
| Trạng thái | **Domain chốt A** (PA A — Nghĩa approved 2026-09-28) — Soft lấy A |
| Không | Sửa code từ Domain; đổi semantic 7 mã TT |

## Vấn đề
Chip «Chờ tôi» hiện dễ hiểu là việc **liên quan tôi**, nhưng dữ liệu có thể là open work **global** → lừa NV. Cần lock actor lens vs rename global.

## Phương án

| | A — Actor lens (chốt) | B — Global open, đổi nhãn | C — Chỉ phụ trách |
|---|------------------------|---------------------------|-------------------|
| | Filter user hiện tại ∈ **phụ trách OR phối hợp OR người giao** | Giữ open work không lọc actor; đổi nhãn (vd. «Chờ duyệt») | Chỉ `nguoi_phu_trach_id` = me |
| Đúng chữ «tôi» | Khớp RACI mỏng 19 (PT / PH / giao) | Đúng global, bỏ chữ «tôi» | Thiếu phối hợp / người giao |
| Rủi ro | Chip trống nếu user không thuộc ba vai | Đổi copy mọi chỗ | Bỏ sót việc tôi phối hợp / tôi giao |

**Chốt A.** Loại B khi PO muốn giữ chữ «Chờ tôi». Loại C hẹp quá so với list 19b (primary + chip phối hợp).

## DoD Soft
1. RPC/`cho_toi` + FE `isQlcvChoToiDuyet` (hoặc tương đương) lọc: phụ trách **∨** phối hợp **∨** người giao = current user.
2. Chip «Chờ tôi» không hiện việc open global không dính actor.
3. Spec: user chỉ PH → thấy; user ngoài ba vai → 0; không đụng Q-14 / AB-2 cột duyệt trong lát này.
