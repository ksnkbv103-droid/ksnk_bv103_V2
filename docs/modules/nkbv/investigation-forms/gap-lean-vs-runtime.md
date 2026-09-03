# Gap catalog — Lean CDC (L1/L2) vs runtime

> **A4** · 2026-08-05 · PO duyệt trước khi code UI (A6)  
> **P0** = thiếu L1 hoặc L2 hay gặp → lệch chuẩn phân loại / vận hành  
> **P1** = L3 audit / đào tạo / Location / bảng NHSN đầy

## Tổng hợp P0

| ID | Hội chứng | Gap | Hướng xử lý A6 |
|----|-----------|-----|----------------|
| PNEU-P0-1 | PNEU | Checklist miễn dịch PNU3 từng tiêu chí | **Đóng 2026-08-09** — hemoptysis/pleuritic + engine INCOMPLETE · **xem lại:** [AUDIT-A3](pneu-standard-vs-runtime-audit-20260810.md) (SSOT không bắt buộc 2 TC đó) |
| PNEU-P0-2 | PNEU | Lab ngưỡng BAL/ETA/PSB/PBAL tách dòng | **Đóng 2026-08-09** — `nkbv-pneu-lab-tier` + form L2 lab-first |
| PNEU-P0-3 | PNEU | Khối Ruled-out (Phần V giấy) | L3 bắt buộc khi loại trừ |
| PNEU-P0-4 | PNEU | Nhãn VAP/Non-VAP rõ trên hàng device | UI badge từ engine |
| PNEU-AUDIT-A1 | PNEU | Đếm key hô hấp ≠ nhóm CDC (dyspnea+tachypnea=2) | **Đóng 2026-08-18** — đếm `pneu_resp_line` |
| PNEU-AUDIT-A2 | PNEU | PNU2 bị siết ≥2 hô hấp như PNU1 | **Đóng 2026-08-18** — PNU2 ≥1 nhóm |
| PNEU-AUDIT-A3 | PNEU | PNU3 bắt buộc hemoptysis/đau màng phổi | **Đóng 2026-08-18** — list rộng, không bắt buộc |
| BSI-P0-1 | BSI | MBI đầy (ANC ≥2d trong IWP) nếu chỉ tick neutropenia | L2 MBI block |
| UTI-P0-1 | UTI | — Core đủ pilot | Boy scout copy Ruled-out ASB · **xem lại audit:** [UTI 2026-08-10](uti-standard-vs-runtime-audit-20260810.md) |
| UTI-AUDIT-A1 | UTI | CFU thiếu/`null` coi đạt (seed 1e5) | Fail closed — [audit](uti-standard-vs-runtime-audit-20260810.md) |
| UTI-AUDIT-A2 | UTI | ABUTI máu UI ∈ SBAP; chuẩn ∈ IWP | Siết cửa sổ ABUTI = IWP |
| UTI-AUDIT-A3 | UTI | Mọi yeast → CANDIDA_EXCLUSION; chuẩn bỏ yeast nếu còn 1 bacterium ≥1e5 | Tách yeast+bacterium |
| UTI-AUDIT-A4 | UTI | pathogen_count BA chết (1 chuỗi VK) | Wire đa loài / mixed flora |
| UTI-AUDIT-A5 | UTI | Secondary engine chủ yếu nhánh ABUTI | Set Secondary trên SUTI+máu SBAP |
| VAE-P0-1 | VAE | — Core VAC/IVAC/PVAP đủ | Giữ Event Period copy |
| SSI-P0-1 | SSI | — Core ngày mổ/PATOS/depth đủ | — |

## P1 (phụ lục B / sau)

| ID | Nội dung |
|----|----------|
| ALL-P1-1 | CDC Location mã chuẩn (W4 tạm dừng) |
| ALL-P1-2 | PDF/in phụ lục B đầy đủ 6 phần giấy |
| PNEU-P1-1 | PCR panel từng virus liệt kê | **Đóng một phần 2026-08-09** — atom Table 3 (Influenza/RSV/Legionella…) trên form; chi tiết IgG×4 vẫn phụ lục |
| BSI-P1-1 | CLIP trên phiếu CLABSI (W3) |
| BSI-P1-2 | Organism/site picker Secondary đầy |
| SSI-P1-1 | Bảng procedure NHSN đầy |
| VAE-P1-1 | APRV/ECMO pipeline thật |

## Đã đủ L1 trên runtime (không P0)

| Hội chứng | Ghi chú |
|-----------|---------|
| BSI | Triệu chứng tách + CVC + secondary flags |
| UTI | CFU/≤2/nấm + sx + Foley gate + ẩn voiding · **audit 2026-08-10:** còn A1–A5 (CFU null, ABUTI IWP, yeast-mix…) |
| VAE | Bảng vent + VAC/IVAC/PVAP + secondary PVAP |
| PNEU | Imaging + toàn thân + hô hấp + lab-first PNU1/2/3 (Table 2/3 L2) |
| SSI | Surgery/DOE/PATOS/depth/CSSD |

## Quy tắc ưu tiên ship UI

1. PNEU-P0-1…4 (mẫu giấy PO đã đưa)  
2. BSI-P0-1  
3. L3 Ruled-out chung pattern cho 5 loại  
4. P1 theo nhu cầu đào tạo / in
