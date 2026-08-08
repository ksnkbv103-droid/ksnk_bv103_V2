# Danh mục triệu chứng lâm sàng NKBV (SSOT)

> **Identity contract** — CDC NHSN 2025 · runtime: `src/modules/giam-sat-nkbv/lib/nkbv-clinical-symptom-catalog.ts`  
> Thuật toán phân loại vẫn neo [`../hai-surveillance-domain-ssot-20260804.md`](../hai-surveillance-domain-ssot-20260804.md).  
> File này khóa **định danh triệu chứng** (id, nhãn, cổng, ánh xạ form/criteria) — không thay Domain SSOT.

## Nguyên tắc

| # | Quy tắc |
|---|---------|
| 1 | IWP ±3 (BSI/UTI/PNEU) ≠ Event Period VAE ≠ Surveillance SSI |
| 2 | VAE ≠ PNEU — IVAC chỉ sốt/hạ thân nhiệt + WBC; không dùng XQ |
| 3 | UTI voiding (tiểu buốt/gấp/rắt) chỉ khi **không** Foley |
| 4 | Giữ tên `form_field` đã lưu JSON — catalog chỉ ánh xạ |
| 5 | Chương 17 = `catalog_only` đến W5 (chưa form) |

## Cột hàng

| Cột | Ý nghĩa |
|-----|---------|
| `id` | Ổn định (`sx.*`) |
| `name_vi` / ngưỡng | Nhãn UI / in |
| `syndromes` | BSI · UTI · PNEU · VAE · SSI · CH17_* |
| `age_gate` / `device_gate` / `ssi_depth` | Cổng hiển thị |
| `window` | IWP · EVENT_PERIOD · SSI_SURVEILLANCE |
| `doe_eligible` | Có đưa vào ngày sự kiện DOE |
| `form_field` / `criteria_key` | Verification / BA grid |
| `runtime_status` | `wired` · `bundled_view` · `catalog_only` |

## Pilot (tóm tắt theo hội chứng)

Chi tiết đầy đủ = mảng `NKBV_CLINICAL_SYMPTOMS` trong code. Tóm tắt nghiệp vụ:

### BSI / LCBI
- LCBI 2: sốt · rét run · tụt HA (`has_fever` / `has_chills` / `has_hypotension`)
- LCBI 3 ≤1 tuổi: hạ thân nhiệt · apnea · bradycardia
- MBI: tiêu chảy nặng (`has_severe_diarrhea_mbi`) — bằng chứng bổ sung

### UTI / CAUTI
- >1 tuổi: sốt · đau trên xương mu · CVA · (voiding nếu không Foley)
- ≤1 tuổi SUTI 2: sốt/hạ thân nhiệt · apnea · bradycardia · lethargy · nôn · đau trên xương mu

### PNEU / VAP / HAP
- Toàn thân: `fever_or_wbc_abnormal` (bundled) ± lú lẫn ≥70
- Hô hấp ≥2 **dòng** khác nhau (đờm · ho/khó thở/thở nhanh · ran · suy trao đổi khí)
- PNU3: ho ra máu · đau ngực kiểu màng phổi
- ≤1 tuổi: distress hô hấp · HR bất thường (bổ sung checklist)

### VAE / IVAC
- Chỉ `temp_fever_or_hypothermia` + `wbc_abnormal` trong Event Period — **không** DOE từ triệu chứng

### SSI
- Nông / sâu / organ-space theo tầng mô
- OB/GYN: đau bụng sau mổ CSEC/HYST/VHYS (`organ_space_obgyn_abdominal_pain`)

## Chương 17 (data-only)

BJ (BONE/DISC/JNT/PJI) · CNS (IC/MEN/SA) · CVS (CARD/MED/VASC/ENDO) · EENT · GI (CDI/GE/GIT/IAB/NEC) · REPR (EMET/OREP) · SST — tất cả `runtime_status: catalog_only`, `form_field: null`. Form W5 dùng cùng SSOT + mã site `nkbv-ssi-nhsn-catalog.ts`.

## Consumers runtime

| Consumer | Helper |
|----------|--------|
| BA grid / bridge | `criteriaKeyToFormField(key, { syndrome, ssiDepth })` — **bắt buộc ngữ cảnh** khi key dùng chung (SSI depth, VAE vs PNEU `fever_or_wbc`) |
| DOE | `doeFormFieldsForChecklist` / `doeFormFieldsForSsiDepth` |
| Print | `symptomLabelMap` |
| Sub-forms | `formSymptomRowsFor` (+ `procedureCode` ẩn OB/GYN nếu không CSEC/HYST/VHYS) |
| Voiding / infant UTI | `isVoidingCriteriaKey` / `UTI_*_FROM_CATALOG` |
| PNEU đếm hô hấp | `countPneuRespiratoryLines` (chỉ `pneu_resp_line`) |

## Cải tổ sau audit (2026-08-09)

- Ma trận BSI/UTI đủ chills·hypotension·SUTI2; `fever_or_wbc` chỉ HAP/VAP/VAE.
- SSI Organ/Space: đau bụng OB/GYN chỉ khi thủ thuật CSEC/HYST/VHYS (+ criteria `obgyn_abdominal_pain`).
- Submit BSI: ngày triệu chứng LCBI ∈ IWP (không chỉ legacy OR).
- VAE IVAC form ↔ BA qua `fever_or_wbc` với reverse map theo hội chứng.

## Đọc thêm

- Spine: [`01-shared-spine.md`](01-shared-spine.md)
- Gap UI: [`gap-lean-vs-runtime.md`](gap-lean-vs-runtime.md)
- Hợp đồng UI: [`../clinical-forms.md`](../clinical-forms.md)
