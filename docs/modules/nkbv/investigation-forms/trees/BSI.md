# Cây quyết định + phân lớp — BSI / CLABSI / MBI-LCBI

> **A2** · SSOT §6 · Runtime: `BsiClinicalSubForm` + `BsiVerificationData`

## Decision tree

```mermaid
flowchart TD
  blood[Index: cấy máu]
  fungi{Nấm hô hấp cộng đồng?}
  class{Recognized hay Commensal?}
  l2{≥2 lần riêng + triệu chứng IWP?}
  infant{≤1 tuổi?}
  sec{Ổ tại chỗ + SBAP + match?}
  cvc{CVC ≥2d + DOE/DOE-1?}
  mbi{MBI criteria?}
  clabsi[CLABSI]
  lcbi[LCBI không device]
  secondary[Secondary BSI]
  contam[Contamination / Community]
  blood --> fungi
  fungi -->|Có| contam
  fungi -->|Không| class
  class -->|Recognized| sec
  class -->|Commensal| l2
  l2 -->|Không| contam
  l2 -->|Có| infant
  infant --> sec
  sec -->|Có| secondary
  sec -->|Không| cvc
  cvc -->|Có| mbi
  cvc -->|Không| lcbi
  mbi --> clabsi
```

## Bảng phân lớp field

| Field / nhóm | Lớp | Runtime | Ghi chú |
|--------------|-----|---------|---------|
| `pathogen_type` Recognized/Commensal | L1 | Có | |
| `pathogen_name` | Computed/L1 | Có | LIS |
| `is_fungi_respiratory` | L1 | Có | Gate loại trừ |
| `commensal_culture_count` + `commensal_drawn_separate` | L2 | Có | Gate Commensal |
| `has_fever` / `has_chills` / `has_hypotension` + ngày | L2 | Có | LCBI 2 |
| `is_infant_le1` + hypothermia/apnea/bradycardia | L2 | Có | LCBI 3 tối thiểu |
| CVC dates / days / active | L1/Computed | Có | Prefill Registry |
| `is_neutropenia` / HSCT / ANC≥2d | L2 | Partial | MBI |
| `is_intestinal_pathogen` | L2 | Có | MBI path |
| Secondary: localized + match + SBAP | L2 | Có | |
| Site type / organism picker đầy | L2/P1 | Partial | |
| Ruled-out contamination chi tiết | L3 | Thiếu | |
| CLIP adherence | L3/Out | — | W3 backlog |

**Core tối thiểu đạt CLABSI:** pathogen hợp lệ + không secondary + CVC association.
