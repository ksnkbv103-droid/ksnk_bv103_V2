# Cây quyết định + phân lớp — VAE (VAC → IVAC → PVAP)

> **A2** · SSOT §8 · Runtime: `VaeClinicalSubForm`  
> **Cấm:** dùng X-quang ngực để chẩn đoán VAE (khác PNEU).

## Decision tree

```mermaid
flowchart TD
  age{Tuổi ≥18?}
  vent{Vent ≥4 ngày liên tục?}
  vac{VAC: baseline + PEEP≥3 hoặc FiO2≥0.20 ×≥2d?}
  ivac{IVAC: sốt/WBC + Abx ≥4 QAD trong Event Period?}
  pvap{PVAP micro?}
  sec{Máu trong Event Period + match?}
  labelVac[VAC]
  labelIvac[IVAC]
  labelPvap[PVAP ± Secondary]
  out[Không VAE / chuyển PNEU]
  age -->|Không| out
  age -->|Có| vent
  vent -->|Không| out
  vent -->|Có| vac
  vac -->|Không| out
  vac -->|Có| ivac
  ivac -->|Không| labelVac
  ivac -->|Có| pvap
  pvap -->|Không| labelIvac
  pvap -->|Có| sec
  sec --> labelPvap
```

## Bảng phân lớp field

| Field / nhóm | Lớp | Runtime | Ghi chú |
|--------------|-----|---------|---------|
| `patient_age` ≥18 | L1 | Có | |
| Vent start/stop / days | L1/Computed | Có | Prefill Registry |
| `vent_daily_params` PEEP/FiO₂ | L1 | Có | Cò súng |
| VAC flags (baseline, peep, fio2) | L1 | Có | + gợi ý compute |
| Event Period (không IWP ±3) | Computed | Có | `uses_clinical_iwp=false` |
| IVAC: fever/WBC/Abx | L2 | Có | Sau VAC |
| PVAP micro 3 tiêu chí | L2 | Có | |
| Secondary blood khi PVAP | L2 | Có | |
| `on_aprv_or_hfv` / `on_ecmo` | L3 | Stub | Chưa đủ pipeline |
| X-quang | **Drop** | — | Không thuộc VAE |
| Ruled-out (không đủ vent/VAC) | L3 | Partial | |

**Tách PNEU:** user chọn VAP/HAP → form PNEU; chọn VAE → form này.

---

## Phiếu VAE-2026

> Cây: đầu file này · **Không dùng X-quang** (khác PNEU-2026)

## Phần A — Vận hành

1. Tuổi ≥18; ngày bắt đầu/dừng thở máy (Registry).  
2. **Event Period** Computed (không nhãn IWP lâm sàng).  
3. Bảng PEEP/FiO₂ min theo ngày → gợi ý VAC.  
4. Xác nhận VAC (L1).  
5. IVAC trong Event Period (L2): sốt/WBC + Abx ≥4 QAD.  
6. PVAP micro (L2).  
7. Secondary máu khi PVAP (L2).  
8. Kết luận: VAC / IVAC / PVAP.

## Phần B — Phụ lục đầy đủ

- Hành chính.  
- Timeline VAE §8 (baseline 2d + worsen 2d).  
- APRV/HFV/ECMO ghi nhận (stub).  
- Ruled-out: <18 tuổi, <4 vent-days, không VAC — gợi ý chuyển form PNEU nếu phù hợp.  
- Chữ ký IP.
