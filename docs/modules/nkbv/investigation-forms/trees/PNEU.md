# Cây quyết định + phân lớp — PNEU / VAP / Non-VAP

> **A2** · SSOT §10 · Runtime: `PneuClinicalSubForm` + `VaeVerificationData` (nhánh PNEU)

## Decision tree

```mermaid
flowchart TD
  idx[Index: cấy hoặc XQ]
  img{Imaging đạt trong IWP?}
  films{Bệnh nền tim phổi?}
  sys{Toàn thân ≥1?}
  resp{Hô hấp ≥2 nhóm?}
  micro{PNU2 hoặc PNU3?}
  imm{PNU3?}
  vent{Vent ≥2d + DOE/DOE-1?}
  ok[Đạt PNU1/2/3 + VAP hoặc NonVAP]
  out[Ruled-out L3]
  idx --> img
  img -->|Không| out
  img -->|Có| films
  films -->|Có| need2[≥2 phim L2]
  films -->|Không| need1[≥1 phim]
  need2 --> sys
  need1 --> sys
  sys -->|Không| out
  sys -->|Có| resp
  resp -->|Không| out
  resp -->|Có| micro
  micro -->|PNU2| lab[Lab ngưỡng L2]
  micro -->|PNU3| imm
  micro -->|PNU1| vent
  lab --> vent
  imm --> vent
  vent --> ok
```

## Bảng phân lớp field

| Field / nhóm | Lớp | Type / UI hiện | Ghi chú |
|--------------|-----|----------------|---------|
| `pneu_trigger` CULTURE\|IMAGING + ngày Index | L1 | Có | Hàng 0 |
| `has_chest_imaging_abnormal` + ngày | L1 | Có | |
| `has_cardiopulmonary_disease_underlying` | L2 | Có | Mở yêu cầu số phim |
| `imaging_films_count` | L2 | Có | ≥2 nếu bệnh nền |
| `fever_or_wbc_abnormal` (+ ngày) | L1 | Có | OR nhóm toàn thân |
| `altered_mental_status_ge_70yo` | L2 | Có | Gate tuổi ≥70 |
| Hô hấp: cough / sputum / rales / gas / dyspnea / tachypnea | L1 | Có (count) | Cần ≥2 nhóm CDC |
| `microbiology_evidence` NONE\|PNU2\|PNU3 | L1/L2 | Có | NONE=PNU1 |
| Ngưỡng BAL/ETA/PSB/PBAL từng dòng | L2 | **Thiếu** | Gộp PNU2 hiện tại |
| PCR virus / Legionella chi tiết | L2 | Partial | Flag gộp |
| Checklist miễn dịch PNU3 (ANC, HSCT, steroid…) | L2 | **Thiếu** | Chỉ chọn PNU3 |
| Vent dates + active DOE/DOE−1 → VAP label | L1/Computed | Partial | Engine `*_VAP` |
| IWP / DOE / POA-HAI / LOA | Computed | Có | Spine |
| Secondary máu SBAP + match | L2 | Partial | Shared SBSI |
| Ruled-out (xẹp phổi, 1 phim+nền, Candida đờm, CoNS/Enterococcus, Gram kém, BS ghi VP thiếu tiêu chí) | L3 | **Thiếu** | |
| CDC Location mã | L3/P1 | Thiếu | W4 dừng |
| IP ký / mã biểu mẫu giấy | L3 | In phiếu | |

**PO duyệt bảng này trước khi mở rộng UI PNEU.**
