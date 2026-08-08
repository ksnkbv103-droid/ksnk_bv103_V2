# Danh mục triệu chứng lâm sàng NKBV (SSOT)

> **Identity contract** — CDC NHSN 2025 · runtime: `nkbv-clinical-symptom-catalog.ts`  
> Thuật toán: [`../hai-surveillance-domain-ssot-20260804.md`](../hai-surveillance-domain-ssot-20260804.md)  
> UAT: [`symptom-catalog-uat-20260809.md`](symptom-catalog-uat-20260809.md)  
> Ch.17 vận hành SSI: `nkbv-chapter17-clinical.ts`

## Nguyên tắc

| # | Quy tắc |
|---|---------|
| 1 | IWP ±3 (BSI/UTI/PNEU) ≠ Event Period VAE ≠ Surveillance SSI |
| 2 | VAE ≠ PNEU — IVAC chỉ sốt/hạ thân nhiệt + WBC; không dùng XQ |
| 3 | UTI voiding chỉ khi **không** Foley |
| 4 | Giữ tên `form_field` đã lưu — atom mới + derived legacy |
| 5 | Ch.17: catalog prose đầy đủ + checklist vận hành cho site Organ/Space hay gặp |

## Pilot — trạng thái đóng nợ (2026-08-09)

| Hội chứng | Trạng thái |
|-----------|------------|
| **BSI** | LCBI2/3 tách; submit bắt ngày IWP; **MBI** nhận tiêu chảy nặng ≥1L/24h |
| **UTI** | >1 / ≤1 tuổi; Foley ẩn voiding |
| **PNEU** | **Atom** sốt / hạ thân nhiệt / WBC (+ derived `fever_or_wbc_abnormal`); nhánh tuổi; **PNU3** bắt buộc ho ra máu hoặc đau màng phổi |
| **VAE** | IVAC map BA `fever_or_wbc`; không DOE triệu chứng |
| **SSI** | Tầng nông/sâu/organ; OB/GYN CSEC/HYST/VHYS; **Ch.17 checklist** IAB/EMET/OREP/VCUF/BONE/PJI/MEN/GIT |

## Consumers

| Consumer | Helper |
|----------|--------|
| BA / bridge | `criteriaKeyToFormField(key, { syndrome, ssiDepth })` |
| DOE | `doeFormFieldsForChecklist` / `doeFormFieldsForSsiDepth` |
| PNEU toàn thân | `derivePneuSystemic` / `syncPneuSystemicBundle` |
| Ch.17 Organ/Space | `isCh17SiteCriteriaMet` |
| Print | `symptomLabelMap` |
| Sub-forms | `formSymptomRowsFor` (chỉ `runtime_status: wired`) |

## Chương 17

- **Prose / tra cứu:** hàng `CH17_*` trong catalog (`catalog_only`).  
- **Runtime SSI:** `CH17_SITE_RULES` — khi chọn `organ_space_site` thuộc danh sách vận hành, phiếu hiện checklist; engine chấp nhận Ch.17 đủ dấu **hoặc** tiêu chí Organ chung (mủ/cấy/áp xe).  
- Site chưa có checklist → dùng tiêu chí Organ chung; bổ sung dần không phá SSOT.

## Nợ đã đóng / còn cố ý

| Đã đóng | Còn cố ý (ngoài slice) |
|---------|-------------------------|
| Atom PNEU, MBI tiêu chảy, PNU3 siết, map ngữ cảnh, UAT doc + unit | PedVAE; form Ch.17 độc lập ngoài SSI; lab ngưỡng PNU2 chi tiết (gap PNEU-P0-2) |
