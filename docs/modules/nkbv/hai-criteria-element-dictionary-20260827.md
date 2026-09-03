# Từ điển yếu tố tiêu chí chẩn đoán HAI (BV103)

> **Ngày:** 2026-08-27 · **Loại:** căn cứ triển khai (một ID = một ô timeline / form / in)  
> **Tiêu chí CDC:** [`hai-surveillance-domain-ssot-20260827.md`](hai-surveillance-domain-ssot-20260827.md) Ch.4, 6–7, 9–10, 16–17  
> **Tên sự kiện / cửa sổ:** Phụ lục E (file trên) — **không** lẫn với file này  
> **Runtime triệu chứng 4 hội chứng:** `nkbv-clinical-symptom-catalog.ts` · doc [`investigation-forms/02-clinical-symptom-catalog.md`](investigation-forms/02-clinical-symptom-catalog.md)  
> **Runtime Ch.17:** `nkbv-ch17-evidence-catalog.ts` (nhóm: symptom / micro / lab / imaging / pathology / serology / clinical_note)  
> **Không sửa `src/` trong đợt giấy này.** Người lớn. Không PedVAE / LCBI-3 / SUTI-2.

**Câu PO:** thiếu từ điển yếu tố thì engine, timeline và phiếu sẽ mỗi nơi một tên — **đúng**. File này khóa **các nguyên tử** (triệu chứng, xét nghiệm, CĐHA, dụng cụ, loại trừ) cho từng loại nhiễm khuẩn.

---

## 0. Ba lớp từ điển (không gộp)

| Lớp | File | Trả lời câu |
|-----|------|-------------|
| **E — Tên sự kiện / cửa sổ** | Phụ lục E | HAI, IWP, CLABSI, USI ≠ UTI… |
| **C — Yếu tố tiêu chí** (file này) | Nguyên tử SX / LAB / IMG / DEV / EXCL | “Sốt >38”, “cấy NT ≥10⁵”, “XQ thâm nhiễm” thuộc hội chứng nào, cửa sổ nào |
| **F — Luồng nhập** | [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md) | LIS/HIS/gõ; Secondary trước CLABSI |

Catalog triệu chứng hiện tại ≈ một phần lớp C (chủ yếu SX). **Thiếu trên giấy thống nhất:** LAB + IMG + DEV + EXCL cho 4 hội chứng; map ID ↔ `criteria_key` ↔ `form_field`. Ch.17 đã có catalog bằng chứng trong code — lớp C trỏ, không chép lại từng dòng.

---

## 1. Hợp đồng ID (bắt buộc khi sửa code)

Mỗi nguyên tử:

| Cột | Ý nghĩa |
|-----|---------|
| **id** | Ổn định: `sx.*` · `lab.*` · `img.*` · `dev.*` · `excl.*` · Ch.17: key trong `CH17_EVIDENCE_CATALOG` |
| **Loại** | SX triệu chứng · LAB xét nghiệm/ngưỡng · IMG CĐHA · DEV dụng cụ/thông số máy · EXCL cấm dùng |
| **Cửa sổ** | IWP ±3 · SP SSI · Event Period / VAE Window · NONE (không DOE) |
| **DOE?** | Có thì ngày của nguyên tử được xét khi lấy DOE |
| **Timeline** | `criteria_key` trên `nkbv_fact_ba_timeline` — null = chưa hiện lưới |
| **Form** | `form_field` / flag verification — null = chưa wire |
| **Lớp** | L1 bắt buộc phân loại · L2 nhánh · L3 giải trình |
| **App** | `wired` đã chạy · `catalog` có ID chưa đủ UI/engine · `domain` mới giấy, chưa có ID runtime · `không dùng` nhi |

**Một hiện tượng vật lý = một id.** Sốt LCBI và sốt SUTI **cùng** `sx.fever_gt_38` (cùng ngưỡng NHSN). Sốt PNEU / IVAC **tách id** vì nhóm OR khác (PNEU gộp hạ thân nhiệt/WBC; VAE không DOE triệu chứng).

Gõ trên timeline → ghi BA bằng `criteria_key`. Tạo phiếu → map sang `form_field`. In mẫu C → `name_vi`. **Cấm** invent string mới trên UI nếu đã có id.

---

## 2. BSI / LCBI / CLABSI (Ch.4)

Cửa sổ: **IWP**. Secondary **trước** CLABSI. LCBI-3: không dùng.

| id | Loại | name_vi | Ngưỡng / ghi chú | Lớp | DOE | App | Map |
|----|------|---------|------------------|------|-----|-----|-----|
| `lab.blood_culture` | LAB | Cấy máu / NCT máu (điều trị) | Index LCBI; NCT: nếu có cấy trong NCT−2…+1 → chỉ dùng cấy | L1 | Có (LCBI 1 = ngày mẫu đầu) | wired (LIS) | `index_vi_sinh_id` |
| `lab.pathogen_recognized` | LAB | Recognized pathogen | Không thuộc list commensal NHSN | L1 | — | wired | `pathogen_type` |
| `lab.pathogen_commensal` | LAB | Common commensal | CoNS, *Micrococcus*, *Bacillus* (trừ anthracis)… | L1 | — | wired | `pathogen_type` |
| `lab.blood_commensal_ge2_separate` | LAB | ≥2 máu cùng commensal, separate occasions | Bắt buộc LCBI 2 | L2 | — | wired | `commensal_culture_count` |
| `lab.nct_blood` | LAB | NCT máu (T2MR, NGS…) | Chỉ khi không bị cấy át | L2 | — | catalog | — |
| `excl.community_respiratory_fungus` | EXCL | Nấm hô hấp cộng đồng | Loại khỏi LCBI | L1 | — | wired | `is_fungi_respiratory` |
| `excl.asc_ast_screening` | EXCL | Cấy/xét nghiệm sàng lọc mang | Không thỏa HAI | L1 | — | domain | Phụ lục E NCT≠ASC |
| `sx.fever_gt_38` | SX | Sốt > 38,0°C | NHSN; không đặt IWP | L2 LCBI2 | Có | wired | `has_fever` / `fever` |
| `sx.bsi_chills` | SX | Rét run | LCBI 2 | L2 | Có | wired | `has_chills` |
| `sx.bsi_hypotension` | SX | Hạ huyết áp | LCBI 2 | L2 | Có | wired | `has_hypotension` |
| `dev.cvc` | DEV | CVC / central line | >2 ngày lịch + hiện DOE/DOE−1 | L1 | — | wired | Registry |
| `lab.mbi_organism` | LAB | MBI organism | Terminology Browser | L2 | — | partial | MBI |
| `lab.anc_neutropenia` | LAB | ANC / giảm bạch cầu cửa sổ MBI | Ch.4 | L2 | — | partial | `is_neutropenia` |
| `sx.bsi_mbi_severe_diarrhea` | SX | Tiêu chảy nặng ≥1 L/24h | Hàng rào niêm mạc | L2 | Có | wired | MBI |
| `img.*` | IMG | — | **Không** tiêu chí LCBI | — | — | Drop | — |

Cấy máu Secondary: cùng `lab.blood_culture`, cửa sổ **SBAP** (không phải tiêu chí LCBI).

---

## 3. UTI / SUTI / CAUTI / ABUTI (Ch.7)

Cửa sổ: **IWP**. Yeast không thỏa. USI ≠ bảng này.

| id | Loại | name_vi | Ngưỡng / ghi chú | Lớp | DOE | App | Map |
|----|------|---------|------------------|------|-----|-----|-----|
| `lab.urine_culture` | LAB | Cấy nước tiểu | Index | L1 | Có (ngày lấy mẫu) | wired | LIS |
| `lab.urine_cfu_ge_1e5` | LAB | ≥ 10⁵ CFU/ml (≥1 vi khuẩn) | L1 | — | wired | `urine_cfu_count` |
| `lab.urine_species_le2` | LAB | ≤ 2 loài | >2 → không SUTI | L1 | — | wired | `pathogen_count` |
| `excl.urine_yeast_mold_parasite` | EXCL | Yeast / nấm / ký sinh | Không thỏa UTI; yeast không đếm loài | L1 | — | wired | `has_fungi_yeast_parasite` |
| `sx.fever_gt_38` | SX | Sốt > 38,0°C | Không loại vì “nguyên nhân khác” | L1 | Có | wired | `has_fever` |
| `sx.uti_suprapubic` | SX | Đau trên xương mu | * no other recognized cause | L1 | Có | wired | — |
| `sx.uti_cva` | SX | Đau góc sườn–cột sống | * | L1 | Có | wired | — |
| `sx.uti_dysuria` | SX | Tiểu buốt | **Ẩn khi Foley tại chỗ** | L2 | Có | wired | `no_foley` |
| `sx.uti_urgency` | SX | Tiểu gấp | Ẩn khi Foley | L2 | Có | wired | `no_foley` |
| `sx.uti_frequency` | SX | Tiểu rắt | Ẩn khi Foley | L2 | Có | wired | `no_foley` |
| `dev.iuc_foley` | DEV | Foley niệu đạo–bàng quang | >2 ngày + DOE/DOE−1 → CAUTI | L1 | — | wired | Registry |
| `lab.blood_match_urine` | LAB | Máu cùng khuẩn (không yeast) | ABUTI nếu không có SX SUTI | L2 | — | wired | SBAP match |
| `img.*` | IMG | — | **Không** tiêu chí UTI nước tiểu | — | — | Drop | — |
| `sx.uti_infant_*` | SX | Nhánh ≤1 tuổi | CDC có | — | — | **không dùng** | — |

CĐHA thận/khoang quanh thận → **USI** (Ch.17), không CAUTI.

---

## 4. VAE — VAC / IVAC / PVAP (Ch.10)

Cửa sổ: **Event Period 14 ngày** từ DOE; IVAC/PVAP lab trong **VAE Window (DOE ±3)** theo Ch.10. **Cấm XQ.**

| id | Loại | name_vi | Ngưỡng / ghi chú | Lớp | DOE | App | Map |
|----|------|---------|------------------|------|-----|-----|-----|
| `dev.vent_invasive` | DEV | Thở máy xâm lấn | ≥4 ngày lịch; Day 1 = ngày đặt | L1 | — | wired | Registry |
| `lab.peep_daily_min` | LAB | PEEP tối thiểu theo ngày | Baseline 2d + worsening 2d | L1 | DOE = ngày 1 worsening | wired | `vent_daily_params` |
| `lab.fio2_daily_min` | LAB | FiO₂ tối thiểu theo ngày | Ngưỡng protocol; APRV: chỉ FiO₂ | L1 | như trên | wired | — |
| `excl.ecmo_hfv_full_day` | EXCL | ECMO/HFV trọn ngày | Loại khỏi dải tính VAC | L3 | — | stub | — |
| `sx.vae_temp_fever_or_hypo` | SX | Sốt hoặc hạ thân nhiệt | IVAC; **không** DOE kiểu IWP | L2 | Không | wired | IVAC |
| `sx.vae_wbc_abnormal` | SX | WBC biến động IVAC | Cùng nhóm OR nhiệt | L2 | Không | wired | — |
| `lab.qad_abx_ge4` | LAB | Kháng sinh mới + ≥4 QAD | IVAC | L2 | — | wired | — |
| `lab.pvap_lrt_threshold` | LAB | BAL/PBAL/PSB/ETA đạt ngưỡng PVAP | Cấm flora miệng, Candida/CoNS/Enterococcus đờm/ETA/BAL trừ lung/pleural | L2 | — | wired | PVAP |
| `lab.pvap_cell_or_histo` | LAB | Tế bào / mô PVAP | Nhóm 2 | L2 | — | wired | — |
| `lab.pvap_virus_legionella` | LAB | Virus / *Legionella*… | Nhóm 3 | L2 | — | wired | — |
| `lab.blood_match_pvap` | LAB | Máu khớp Event Period | Secondary **chỉ PVAP** | L2 | — | wired | — |
| `img.chest_*` | IMG | XQ / CT ngực | **Cấm** dùng chẩn đoán VAE | — | — | **Drop** | Vẫn được lưu BA cho PNEU |

---

## 5. PNEU / PNU1–3 / VAP lâm sàng (Ch.6)

Cửa sổ: **IWP**. Người lớn thở máy in-plan → ưu tiên VAE, không mặc định VAP vì đờm.

| id | Loại | name_vi | Ngưỡng / ghi chú | Lớp | DOE | App | Map |
|----|------|---------|------------------|------|-----|-----|-----|
| `img.chest_infiltrate` | IMG | Thâm nhiễm / đông đặc / hang mới hoặc tiến triển | ≥1 phim nếu không nền; ≥2 serial 7 ngày nếu nền tim–phổi; mơ hồ → clinical correlation | L1 | Có | wired | `has_chest_imaging_abnormal` / `sx.pneu_imaging` |
| `img.chest_equivocal` | IMG | Imaging mơ hồ | Bắt buộc ghi điều trị kháng sinh VP | L2 | — | catalog | Phụ lục E |
| `lab.cardiopulmonary_underlying` | LAB | Bệnh nền tim–phổi | Mở yêu cầu ≥2 phim | L2 | — | wired | `has_cardiopulmonary_disease_underlying` |
| `img.chest_film_count` | IMG | Số phim trong IWP | L2 | — | wired | `imaging_films_count` |
| `sx.pneu_fever` | SX | Sốt > 38,0°C | Nhóm toàn thân OR | L1 | Có | wired | `has_pneu_fever` |
| `sx.pneu_hypothermia` | SX | Hạ thân nhiệt < 36,0°C | Cùng nhóm | L1 | Có | wired | — |
| `sx.pneu_wbc_abnormal` | SX | WBC ≤4000 hoặc ≥12000/mm³ | Cùng nhóm | L1 | Có | wired | — |
| `sx.altered_mental_ge70` | SX | Rối loạn ý thức ≥70 tuổi | * không nguyên nhân khác | L2 | Có | wired | — |
| `sx.pneu_purulent_sputum` | SX | Đờm mủ / đổi tính chất | Dòng hô hấp 1 | L1 | Có | wired | ≥2 dòng |
| `sx.pneu_cough` | SX | Ho mới / xấu | Dòng | L1 | Có | wired | — |
| `sx.pneu_dyspnea` | SX | Khó thở | Dòng | L1 | Có | wired | — |
| `sx.pneu_tachypnea` | SX | Thở nhanh >25 | Dòng | L1 | Có | wired | — |
| `sx.pneu_rales` | SX | Ran / thở phế quản | Dòng | L1 | Có | wired | — |
| `sx.pneu_worsening_gas` | SX | Gas xấu (P/F ≤240 hoặc tăng O₂/máy) | Dòng | L1 | Có | wired | — |
| `sx.pneu_hemoptysis` | SX | Ho ra máu | PNU3 | L2 | Có | wired | — |
| `sx.pneu_pleuritic_pain` | SX | Đau màng phổi | PNU3 | L2 | Có | wired | — |
| `lab.pnu2_blood` | LAB | Cấy máu (+) | Table 2 | L2 | — | wired | — |
| `lab.pnu2_pleural` | LAB | Dịch màng phổi (+) | Table 2 | L2 | — | wired | — |
| `lab.pnu2_bal_ge_1e4` | LAB | BAL/PBAL ≥10⁴ | Table 2 | L2 | — | wired | `parsePneuSoLuong` |
| `lab.pnu2_psb_ge_1e3` | LAB | PSB ≥10³ | Table 2 | L2 | — | wired | — |
| `lab.pnu2_eta_ge_1e5` | LAB | ETA ≥10⁵ (thở máy) | Table 2 | L2 | — | wired | — |
| `lab.pnu2_semi_mod_heavy` | LAB | Semi-quant Moderate/Heavy | Table 2 | L2 | — | wired | — |
| `lab.pnu2_bal_ic_ge5pct` | LAB | ≥5% BAL nội bào | Table 2 | L2 | — | catalog | — |
| `lab.pnu2_lung_tissue_ge_1e4` | LAB | Mô phổi ≥10⁴ CFU/g | Table 2 | L2 | — | catalog | — |
| `lab.pnu2_histo` | LAB | Mô bệnh học | Table 2 | L2 | — | catalog | — |
| `lab.pnu3_table3` | LAB | Virus / *Legionella* / IgG×4 / KN nước tiểu Legionella | Table 3 | L2 | — | wired | atoms |
| `excl.pneu_oral_flora` | EXCL | Flora miệng hỗn hợp | Cấm PNU2/3 | L1 | — | catalog | — |
| `excl.pneu_candida_cons_entero_sputum` | EXCL | Candida/CoNS/Enterococcus đờm/ETA/BAL | Cấm trừ mô phổi / màng phổi | L1 | — | catalog | L3 in |
| `dev.vent_for_vap_label` | DEV | Máy eligible | Sau PNU*: VAP vs Non-VAP | L1 | — | partial | — |
| `lab.index_culture_or_imaging` | LAB/IMG | Index = cấy **hoặc** ngày XQ | Hàng 0 | L1 | — | wired | `pneu_trigger` |

Nhánh PNU1 B/C (nhi): **không dùng**.

---

## 6. SSI (Ch.9) — không IWP ±3

Cửa sổ: **SP 30/90** từ ngày mổ (ngày 1). Organ/Space **cộng** site Ch.17.

| id | Loại | name_vi | Ngưỡng / ghi chú | Lớp | DOE | App | Map |
|----|------|---------|------------------|------|-----|-----|-----|
| `dev.surgery_nhsn` | DEV | Ngày mổ + mã PT NHSN | Đặt SP | L1 | — | wired | `loai_phau_thuat_nhsn` |
| `sx.ssi_superficial_purulent` | SX | Mủ nông | Superficial ≥1 | L1 | Có | wired | — |
| `lab.ssi_superficial_culture` | LAB | Cấy vô khuẩn (+) nông | Superficial | L1 | Có | wired | — |
| `sx.ssi_superficial_opened` | SX | Chủ động mở + không cấy + sưng/nóng/đỏ/đau | Superficial | L1 | Có | wired | — |
| `sx.ssi_superficial_md` | SX | Chẩn đoán MD/IP nông | Superficial | L1 | Có | wired | — |
| `excl.stitch_abscess_pin_cellulitis` | EXCL | Stitch abscess / chân đinh / cellulitis đơn | Không SSI nông | L1 | — | catalog | — |
| `sx.ssi_deep_purulent` | SX | Mủ sâu (fascia/cơ) | Deep | L1 | Có | wired | — |
| `sx.ssi_deep_dehisced` | SX | Toác + sốt/đau (cấy âm **không** đủ) | Deep | L1 | Có | wired | — |
| `img.ssi_deep_abscess` | IMG | Áp xe sâu | Deep | L1 | Có | wired | `sx.ssi_deep_abscess` |
| `sx.ssi_organ_purulent` | SX | Mủ từ dẫn lưu vô khuẩn vào tạng | Organ | L1 | Có | wired | — |
| `lab.ssi_organ_culture` | LAB | Cấy dịch/mô organ | Organ | L1 | Có | wired | — |
| `img.ssi_organ_abscess` | IMG | Áp xe / imaging organ (± correlation) | Organ | L1 | Có | wired | — |
| `lab.patos` | LAB | PATOS | Cùng độ sâu lúc mổ | L1 | — | wired | `is_patos` |
| `lab.blood_ssi_sbap17` | LAB | Máu ∈ `[DOE−3, DOE+13]` khớp | Secondary SSI | L2 | — | wired | — |

Organ/Space: checklist site = **lớp C Ch.17** (mục 7), không invent thêm SX nông.

---

## 7. Ch.17 — nhiễm khuẩn + vị trí

Không nhét vào 4 hội chứng. Mỗi **mã site** có bộ nguyên tử trong `CH17_EVIDENCE_CATALOG` (đã gắn `group`: symptom / micro / lab / imaging / pathology / serology / clinical_note).

| Nhóm | Mã | Gợi ý IMG / LAB hay gặp (không thay catalog) |
|------|-----|-----------------------------------------------|
| BJ | BONE, DISC, JNT, PJI | `img_*_definitive`; PJI: CRP/ESR, WBC dịch khớp |
| CNS | IC, MEN, SA | CT/MRI; CSF (MEN); không nhầm PNEU |
| CVS | CARD, ENDO, MED, VASC | Echo/PET ENDO; XQ trung thất MED |
| EENT | CONJ, EAR, EYE, ORAL, SINU, UR | CĐHA xoang/tai khi protocol; **UR ≠ UTI** |
| GI | CDI, GE, GIT, IAB | CDI: độc tố + phân không khuôn (**không** LabID); IAB: CĐHA ổ bụng |
| LRI | LUNG | Áp xe phổi / màng phổi — **không** PNEU Ch.6 |
| REPR | EMET, OREP, VCUF, BRST | SSI OB/GYN |
| SST | DECU, SKIN, ST, BURN | Đại thể / cấy mô |
| USI | USI | Dịch/mô **không** nước tiểu; **cấm** CAUTI |

`img_equivocal` + `abx_note_site_specific` = clinical correlation (Ch.16) — dùng chung nhiều site.

Nhánh ≤1 tuổi trong catalog code: **không dùng** tại BV103 — ẩn UI, không xóa id.

Site chưa `wired` trên lưới BA: nhập lúc Organ/Space hoặc form Ch.17; **id vẫn khóa** trước khi vẽ ô.

---

## 8. CĐHA trên timeline — loại phim (dùng chung)

Lưới BA cần **loại phim** (không chỉ “có/không”) để mẫu C liệt kê:

| id | name_vi | Hội chứng được phép dùng làm tiêu chí |
|----|---------|----------------------------------------|
| `img.mod_xr_chest` | X-quang ngực | PNEU; SSI/Ch.17 khi protocol; **không** VAE |
| `img.mod_ct_chest` | CT ngực | PNEU; LUNG; MED |
| `img.mod_ct_other` | CT vùng khác | Site Ch.17 / SSI organ |
| `img.mod_us` | Siêu âm | JNT, IAB, … |
| `img.mod_mri` | MRI | BONE, IC, SA, … |
| `img.mod_echo` | Echo / TEE | ENDO, CARD |
| `img.result_definitive` | Kết luận chắc nhiễm | vs `img_equivocal` |

Ngày phim ∈ cửa sổ mới đếm. Kết luận (thâm nhiễm / áp xe / mơ hồ) = nguyên tử riêng (`img.chest_infiltrate`, `img_bone_definitive`, …).

---

## 9. Lệch giấy ↔ code (căn cứ vá, không vá trong file này)

| Chỗ | Giấy lớp C | App |
|-----|------------|-----|
| SX 4 hội chứng | Mục 2–6 | `NKBV_CLINICAL_SYMPTOMS` — phần lớn `wired` |
| LAB ngưỡng UTI/BSI | Có | Engine + form |
| IMG PNEU | Có | Cờ phim ngực; **chưa** danh sách từng modality |
| VAE cấm XQ | Có | Đúng domain; BA vẫn lưu phim |
| Ch.17 atoms | Catalog TS đủ nhóm | Engine `evaluateCh17Type`; lưới BA **chưa** đủ ô từng site |
| EXCL stitch abscess, flora miệng | Domain | L3 / catalog |
| `lab.nct_blood`, BAL nội bào ≥5% | Domain | catalog |
| Một id sốt dùng chung BSI+UTI | Mục 1 | Đúng `sx.fever_gt_38` |

Khi implement: **thêm id vào file này trước**, rồi mới `criteria_key` / form — không để UI đặt tên tự do.

---

## 10. Ba case kiểm tay (khi khóa catalog)

1. **Sốt >38 trên BA** → cùng id cho phiên máu (LCBI 2) và phiên nước tiểu; **không** đặt IWP.  
2. **XQ ngực trên lưới + chọn VAE** → phim **không** hiện như tiêu chí VAC; chọn PNEU thì phim ∈ IWP mới đếm.  
3. **Cấy NT nấm** → `excl.urine_yeast_*` chặn SUTI; không biến thành USI nếu bệnh phẩm là nước tiểu.

---

*Cây quyết định: `investigation-forms/trees/`. Tên sự kiện: Phụ lục E. File này = BOM nguyên tử để codebase một nguồn.*
