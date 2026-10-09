# 20b — NKBV tuổi null / cấm default 45 (A/B) — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 draft |
| Neo | Soft audit park #8; VAE ≥18; pediatric OUT |
| Tip | `nkbv-pneu-timeline-verdict.ts` default age=45 khi thiếu DOB |
| Trạng thái | **PO bỏ qua widget 2026-09-28 → mặc định A** (chặn thiếu DOB; bỏ default 45) |
| Ưu tiên park | #2 sau RIT A |

## §1. Vấn đề

Thiếu ngày sinh → tip gán tuổi 45 → có thể **nhầm vào / ra** nhánh VAE (≥18) hoặc PNEU adult. Im lặng, khó audit.

## §2. Ba phương án

| | A — Chặn submit (khuyến nghị) | B — Cảnh báo + cho chạy | C — Giữ default 45 |
|---|------------------------------|-------------------------|---------------------|
| Hành vi | Thiếu DOB/tuổi → không evaluate dương tính / không submit clinical | Warn; vẫn dùng heuristic | Giữ tip |
| An toàn | Không phân loại sai vì tuổi giả | Vẫn có thể sai nhánh | Lệch adult-only |
| Vận hành | BA/HIS phải có DOB | Nhanh hơn | Nguy hiểm |

**Chốt Domain khuyến nghị = A.** Loại C. B chỉ nếu PO chấp nhận rủi ro tạm thời.

## §3. DoD mỏng (sau PO = A)

1. Bỏ default `45` trên bridge PNEU/VAE path.
2. Thiếu tuổi → `NO_EVENT` / gate submit: «Thiếu ngày sinh — không xác định ca».
3. Spec: DOB null không ra VAC/PNU dương tính.
4. Không đụng RIT/Transfer trong lát này.


## §4. PO / mặc định

Widget bỏ qua 2026-09-28 → **A**. Soft implement DoD §3.
