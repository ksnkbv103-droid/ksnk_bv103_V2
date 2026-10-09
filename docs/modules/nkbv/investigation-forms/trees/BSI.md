# Cây quyết định + phân lớp — BSI / CLABSI / MBI-LCBI

> **A2** · SSOT §6 · Runtime: `BsiClinicalSubForm` + `BsiVerificationData`

## Decision tree

```mermaid
flowchart TD
  blood[Index: cấy máu]
  fungi{Nấm hô hấp cộng đồng?}
  class{Recognized hay Commensal?}
  l2{≥2 lần riêng + triệu chứng IWP?}
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
| CVC dates / days / active | L1/Computed | Có | Prefill Registry |
| `is_neutropenia` / HSCT / ANC≥2d | L2 | Partial | MBI |
| `is_intestinal_pathogen` | L2 | Có | MBI path |
| Secondary: localized + match + SBAP | L2 | Có | |
| Site type / organism picker đầy | L2/P1 | Partial | |
| Ruled-out contamination chi tiết | L3 | Thiếu | |
| CLIP adherence | L3/Out | — | W3 backlog |

**Core tối thiểu đạt CLABSI:** pathogen hợp lệ + không secondary + CVC association.

---

## Phiếu BSI-2026

> Cây: đầu file này.

## Phần A — Vận hành

1. Index: cấy máu (LIS).  
2. IWP Computed.  
3. Loại tác nhân Recognized / Commensal (+ nấm hô hấp cộng đồng = loại).  
4. Nếu Commensal (L2): ≥2 lần lấy riêng + sốt/rét run/tụt HA (+ ngày).  
6. CVC đặt/rút / ≥2 ngày / DOE/DOE−1 (Registry).  
7. Secondary ổ tại chỗ + SBAP + khớp (L2).  
8. MBI (L2): neutropenia / HSCT / ANC.  
9. Kết luận: CLABSI / LCBI / Secondary / Contamination.

## Phần B — Phụ lục đầy đủ

- Hành chính + Location CDC (P1).  
- Logic trees LCBI 1/2/3 + MBI-LCBI đầy đủ SSOT §6.  
- Ruled-out: ngoại nhiễm, cộng đồng nấm, thiếu ≥2 lần commensal.  
- CLIP (out W3) ghi “không thuộc phiếu này”.  
- Kết luận IP + Secondary YES/NO.
