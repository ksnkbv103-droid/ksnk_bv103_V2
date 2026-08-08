# Gap catalog harden W2 — SSOT v2 vs runtime NKBV (2026-08-04)

> Đối chiếu [`hai-surveillance-domain-ssot-20260804.md`](hai-surveillance-domain-ssot-20260804.md) §4, §6–§8, §10–§11  
> với `nkbv-rules-engine.ts`, `nkbv-timeline-math.ts`, sub-forms.  
> **P0** = phải đóng trong W2 (sau W1 Shared). **P1** ghi nhận. **P2** ngoài đợt (W3+/W5).

## Shared / Secondary BSI (§4) — nền W1, ảnh hưởng W2

| ID | Gap | Mức | Ghi chú đóng |
|----|-----|-----|--------------|
| SH-P0-1 | Secondary BSI logic nằm rải flags form + 3 nhánh evaluate*; thiếu matching organism canonical + yeast/PNEU bans | **P0→W1** | Package `nkbv-shared-secondary-bsi` |
| SH-P0-2 | `calculateCdcMetrics` gắn IWP±3 cho **mọi** checklist kể cả VAE | **P0→W1** | Ma trận non-apply: VAE dùng Event Period / DOE từ VAC |
| SH-P0-3 | Device days chỉ từ ô form; không Registry; CL chưa tách first-access | **P0→W1** | Registry + `nkbv-shared-device-days` |
| SH-P1-1 | Scenario 2 (máu cấu thành site) chỉ boolean `blood_mandatory_for_localized` | P1 | Đủ pilot; IAB 3b đầy = P2/W5 |

---

## §6 CLABSI / LCBI / MBI

| ID | Gap | Mức | File |
|----|-----|-----|------|
| BSI-P0-1 | Prefill / đồng bộ CVC days từ Device Registry thay vì chỉ tick tay | **P0** | Bsi form + write path |
| BSI-P0-2 | Gọi shared Secondary BSI (match + SBAP) thay vì chỉ tin 3 boolean rời khi có đủ dữ liệu path | **P0** | `evaluateBsiClabsi` |
| BSI-P1-1 | LCBI 3 (≤1 tuổi) chưa tách khỏi LCBI 2 | P1 | |
| BSI-P1-2 | MBI đầy đủ tiêu chí NHSN (ANC window, GI) — hiện neutropenia + intestinal | P1 | |
| BSI-P2-1 | CLIP link trên Registry | P2/W3 | |

---

## §7 CAUTI / UTI

| ID | Gap | Mức | File |
|----|-----|-----|------|
| UTI-P0-1 | Prefill Foley từ Registry | **P0** | Uti form |
| UTI-P0-2 | Máu yeast trong SBAP của UTI **không** được Secondary — enforce trong shared SBSI khi site=UTI | **P0** | shared + evaluate |
| UTI-P1-1 | SUTI 2 (≤1 tuổi) nhánh riêng | P1 | |
| UTI-P1-2 | urgency/frequency đã optional trên type; audit UI coverage | P1 (N-G1 gần xong) | |

---

## §8 VAE (adult)

| ID | Gap | Mức | File |
|----|-----|-----|------|
| VAE-P0-1 | Timeline UI/metrics: **không** áp IWP±3 như BSI; DOE = ngày đầu worsening (D3 chuỗi) khi có bảng vent | **P0** | timeline + CdcMetricsPanel path |
| VAE-P0-2 | Prefill vent days / intubation từ Registry | **P0** | Vae form |
| VAE-P0-3 | Secondary BSI chỉ khi **PVAP** + máu trong Event Period — hiện PVAP không set `is_secondary_bsi` | **P0** | `evaluateVaeVap` + form optional blood flags |
| VAE-P1-1 | APRV chỉ FiO2; HFV/ECMO full-day exclude | P1 | partial vent compute |
| VAE-P2-1 | PedVAE | P2/W5 | |

---

## §10 PNEU / PedVAP / Non-VAP

| ID | Gap | Mức | File |
|----|-----|-----|------|
| PNEU-P0-1 | Sau PNU*: nhãn **VAP** nếu vent eligible (≥3 calendar days + active) else **Non-VAP / HAP** trong `classification` | **P0** | `evaluateVaeVap` PNEU path |
| PNEU-P0-2 | Candida/CoNS/Enterococcus từ máu **cấm** Secondary sau PNEU trừ mô phổi/dịch màng phổi — shared ban | **P0** | shared SBSI |
| PNEU-P1-1 | Nhánh tuổi PNU1 B/C chi tiết trên form | P1 | |
| PNEU-P2-1 | PedVAE ≠ PedVAP | P2 | |

---

## §11 SSI

| ID | Gap | Mức | File |
|----|-----|-----|------|
| SSI-P0-1 | SBAP SSI = cửa sổ cố định 17 ngày `[DOE−3, DOE+13]` — document + dùng shared helper (timeline đã gần đúng; không dùng RIT 14 lâm sàng chồng) | **P0** | timeline shared |
| SBAP-P0-1 | Clinical SBAP UTI/PNEU = `[Index−3, DOE+13]` (14–17d) — **không** `clinicalSbapWindow(doe)` ≡ DOE±3; SSI giữ `ssiSbapWindow` | **P0** | `nkbv-shared-timeline` |
| SSI-P0-2 | Secondary BSI: dùng matching helper; không Secondary nếu không match (giữ) | **P0** | evaluateSsi |
| SSI-P1-1 | PATOS / 24h OR / procedure code table đầy | P1 | |
| SSI-P2-1 | Organ/Space IAB/BONE/PJI §12 | P2/W5 | |

---

## Tóm tắt P0 phải đóng W1+W2

1. Shared: timeline non-IWP cho VAE; SBSI package; device-days + Registry.  
2. Prefill device từ Registry → BSI/UTI/VAE.  
3. PNEU: classification VAP vs Non-VAP.  
4. VAE: secondary chỉ PVAP + event period (flags).  
5. UTI/PNEU yeast & pathogen bans trong SBSI.  
6. SSI SBAP 17d helper tường minh.

## UAT tay đề xuất (≥3)

1. Stay đăng ký CL → mở ca BSI: số ngày CVC prefill; Secondary UTI yeast máu → không CLABSI.  
2. Bảng vent ≥4 ngày → VAC/IVAC; metrics **không** ép IWP±3 như BSI.  
3. PNEU có vent đủ điều kiện → classification chứa VAP; không vent → Non-VAP/HAP.
