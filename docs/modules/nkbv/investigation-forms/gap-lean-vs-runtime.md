# Gap catalog — Lean CDC (L1/L2) vs runtime

> **A4** · 2026-08-05 · PO duyệt trước khi code UI (A6)  
> **P0** = thiếu L1 hoặc L2 hay gặp → lệch chuẩn phân loại / vận hành  
> **P1** = L3 audit / đào tạo / Location / bảng NHSN đầy

## Tổng hợp P0

| ID | Hội chứng | Gap | Hướng xử lý A6 |
|----|-----------|-----|----------------|
| PNEU-P0-1 | PNEU | Checklist miễn dịch PNU3 từng tiêu chí | L2 khi chọn PNU3 |
| PNEU-P0-2 | PNEU | Lab ngưỡng BAL/ETA/PSB/PBAL tách dòng | L2 khi PNU2 |
| PNEU-P0-3 | PNEU | Khối Ruled-out (Phần V giấy) | L3 bắt buộc khi loại trừ |
| PNEU-P0-4 | PNEU | Nhãn VAP/Non-VAP rõ trên hàng device | UI badge từ engine |
| BSI-P0-1 | BSI | MBI đầy (ANC ≥2d trong IWP) nếu chỉ tick neutropenia | L2 MBI block |
| UTI-P0-1 | UTI | — Core đủ pilot | Boy scout copy Ruled-out ASB |
| VAE-P0-1 | VAE | — Core VAC/IVAC/PVAP đủ | Giữ Event Period copy |
| SSI-P0-1 | SSI | — Core ngày mổ/PATOS/depth đủ | — |

## P1 (phụ lục B / sau)

| ID | Nội dung |
|----|----------|
| ALL-P1-1 | CDC Location mã chuẩn (W4 tạm dừng) |
| ALL-P1-2 | PDF/in phụ lục B đầy đủ 6 phần giấy |
| PNEU-P1-1 | PCR panel từng virus liệt kê |
| BSI-P1-1 | CLIP trên phiếu CLABSI (W3) |
| BSI-P1-2 | Organism/site picker Secondary đầy |
| SSI-P1-1 | Bảng procedure NHSN đầy |
| VAE-P1-1 | APRV/ECMO pipeline thật |

## Đã đủ L1 trên runtime (không P0)

| Hội chứng | Ghi chú |
|-----------|---------|
| BSI | Triệu chứng tách + CVC + secondary flags |
| UTI | CFU/≤2/nấm + sx + Foley gate + ẩn voiding |
| VAE | Bảng vent + VAC/IVAC/PVAP + secondary PVAP |
| PNEU | Imaging + toàn thân + hô hấp checklist + PNU tier (thiếu chi tiết PNU2/3) |
| SSI | Surgery/DOE/PATOS/depth/CSSD |

## Quy tắc ưu tiên ship UI

1. PNEU-P0-1…4 (mẫu giấy PO đã đưa)  
2. BSI-P0-1  
3. L3 Ruled-out chung pattern cho 5 loại  
4. P1 theo nhu cầu đào tạo / in
