# Cây quyết định + phân lớp — SSI

> **A2** · SSOT runtime: `nkbv-ssi-nhsn-catalog.ts` + `evaluateSsi` · Form: `SsiClinicalSubForm` / panel BA  
> **Cửa sổ:** Surveillance 30/90 ngày sau mổ — **không** IWP ±3 kiểu UTI.

## Decision tree

```mermaid
flowchart TD
  surg[Ngay_mo_ma_PT_NHSN]
  event[Ma_su_kien_SIP_SIS_DIP_DIS_Organ]
  patos{PATOS?}
  win{DOE_trong_SP?}
  crit{Du_tieu_chi_depth?}
  site{Organ_can_site_Ch17?}
  blood{Mau_khop_SBAP?}
  ok[Chot_classification_NHSN]
  out[EXPIRED_PATOS_INCOMPLETE_Ruled_out]
  surg --> event
  event --> patos
  patos -->|Co| out
  patos -->|Khong| win
  win -->|Khong| out
  win -->|Co| crit
  crit -->|Khong| out
  crit -->|Co| site
  site -->|Thieu_site| out
  site -->|OK| blood
  blood --> ok
```

## Luật SP (Surveillance Period)

| Trường hợp | SP (ngày) |
|------------|-----------|
| SIP / SIS / SUPERFICIAL | **30** (mọi mã PT) |
| DIS (deep secondary) | **30** (kể cả PT nhóm 90, VD CBGB) |
| DIP / ORGAN_SPACE | Theo mã PT: 30 hoặc 90 |
| Thiếu mã PT | Fallback `has_implant` (90 nếu tick) — chỉ tương thích dữ liệu cũ |

`has_implant` = thuộc tính ca / mẫu số — **không** gán từ nhóm SP90.

## Ba danh mục NHSN (SSOT)

| Catalog | Trường | Vai trò |
|---------|--------|---------|
| A. Mã PT | `loai_phau_thuat_nhsn` | SP Deep/Organ; mẫu số; SIR |
| B. Loại sự kiện | `ssi_event_type` | SIP/SIS/DIP/DIS/ORGAN_SPACE — **bắt buộc khi chốt** |
| C. Site Organ | `organ_space_site` | Bắt buộc nếu Organ/Space; PJI↔HPRO/KPRO; VCUF↔HYST/VHYS |

Nhãn phân loại chốt: `SIP` / `SIS` / `DIP` / `DIS` / `ORGAN_SPACE:{site}`.

Contract báo cáo JSON: `nkbv-ssi-reporting-contract.ts` (`extractSsiReportingSlice`).

## Bảng phân lớp field

| Field / nhóm | Lớp | Runtime | Ghi chú |
|--------------|-----|---------|---------|
| `surgery_date` / `doe_date` / `days_since_surgery` | L1 | Có | Days tự tính |
| `loai_phau_thuat_nhsn` | L1 | Có | Dropdown catalog A |
| `ssi_event_type` | L1 | Có | Bắt buộc chốt |
| `organ_space_site` | L1 | Có | Khi Organ/Space |
| `has_implant` | L2 | Có | Không quyết định SP nếu đã có mã PT |
| `is_patos` | L1 | Có | Engine PATOS |
| `return_to_or_within_24h` | L2/L3 | Có UI | Engine chưa reset SP |
| Tiêu chí Superficial / Deep / Organ-Space | L1 | Có | Theo depth từ event |
| Secondary blood + match | L2 | Có | SBAP 17d quanh DOE |
| `ma_qr_cssd_lien_quan` | L2/Delta BV103 | Có | Không phải NHSN core |
| Soft-gate mẫu số Clean/ASA/duration | L2 | Soft toast | `softWarnMauSoSurgery` |

**Core:** trong SP + không PATOS + mã sự kiện + ≥1 tiêu chí (+ site nếu Organ).

---

## Phiếu SSI-2026

> Cây: đầu file này · SSOT mã: `src/modules/giam-sat-nkbv/lib/nkbv-ssi-nhsn-catalog.ts`  
> Surveillance 30/90 theo **mã PT + loại sự kiện** — không IWP ±3

## Phần A — Vận hành

1. Chọn **mã phẫu thuật NHSN** + ngày mổ + DOE (days tự tính).  
2. SP: nông (SIP/SIS) và DIS luôn **30**; DIP/Organ theo nhóm mã PT **30 hoặc 90**.  
3. PATOS (L1) — nếu có → không báo SSI mới.  
4. Chọn **mã loại sự kiện** SIP/SIS/DIP/DIS hoặc ORGAN_SPACE (bắt buộc khi chốt).  
5. Checklist tiêu chí theo độ sâu suy ra từ event.  
6. Organ/Space → chọn **mã vị trí Ch.17** (PJI chỉ HPRO/KPRO; VCUF chỉ HYST/VHYS).  
7. QR CSSD (delta BV103, L2).  
8. Secondary máu + khớp ∈ SBAP (L2).  
9. Kết luận classification NHSN (`SIP`… / `ORGAN_SPACE:IAB`) ± Secondary.

## Phần B — Phụ lục

- `has_implant`: thuộc tính ca / mẫu số — **không** đồng nghĩa SP 90.  
- Soft-gate mẫu số: Clean cấm với APPY/BILI/CHOL/COLO/REC/SB/VHYS; mổ &lt; 5 phút; ASA 6.  
- Contract báo cáo JSON: `nkbv-ssi-reporting-contract.ts`.  
- Ruled-out: hết cửa sổ, thiếu tiêu chí, thiếu event/site, PATOS.  
- Chữ ký IP (vận hành).
