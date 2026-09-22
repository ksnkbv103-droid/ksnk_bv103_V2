# README — Domain SSOT chẩn đoán NKBV (HAI) người lớn

| | |
|--|--|
| **File chính** | [`10-NKBV-diagnosis-domain-ssot-adult.md`](./10-NKBV-diagnosis-domain-ssot-adult.md) |
| **Phiên bản** | 4.0 · 2026-09-22 (Asia/Saigon) |
| **Primary standard** | CDC NHSN PSC Manual **January 2025** |
| **Phạm vi** | **Người lớn ONLY** — xác định / chẩn đoán ca HAI |
| **Không gồm** | GSC, VST, CSSD, QLCV, LabID, CLIP, AUR, PedVAE |

## Cách đọc file chính (1 trang)

| Mục | Nội dung | Đọc khi |
|-----|----------|---------|
| **§0 Front matter** | Nguồn ưu tiên + **bảng conflict 48 giờ → NHSN day-3** | Trước mọi quyết định code |
| **§A Glossary** | Map BYT (NKH, NKTN, NKVM…) ↔ NHSN (LCBI, CAUTI, SSI…); giữ mã CDC trên phiếu/engine | Đặt tên field / UI |
| **§B Engine thời gian (Ch.2)** | IWP 7 ngày, DOE, POA vs HAI (ngày ≥3), LOA/Transfer, RIT 14, SBAP, device >2 ngày lịch; ma trận SSI & VAE **không** dùng IWP/POA/RIT Ch.2 | Mọi ca trừ SSI/VAE timing riêng |
| **§C Thuật toán** | Mỗi loại: định nghĩa · checklist · loại trừ · device · cửa sổ · Secondary BSI · fields · **decision flow đánh số** | Implement rule engine |
| **§C.1** LCBI/CLABSI | Secondary **trước** CLABSI; LCBI-3 OUT | Máu (+) |
| **§C.2** UTI/CAUTI | Cấm yeast; ASB không báo | Nước tiểu |
| **§C.3** PNEU | Người lớn vent in-plan → VAE | Hô hấp không VAE |
| **§C.4** VAE | VAC→IVAC→PVAP; **không CXR**; ≥18 | Thở máy adult |
| **§C.5** SSI | SP 30/90; PATOS; không IWP Ch.2 | Sau mổ |
| **§C.6** Ch.17 | Sites người lớn đủ tiêu chí (BONE/MEN/ENDO/IAB/GI-CDI/…) | Secondary / Organ-Space |
| **§D Data** | Stay / Event / Device grid / Lab / Imaging / Criteria / Adjudication; Vi sinh → LS → KSNK; LIS gợi ý ≠ chẩn đoán | Schema + workflow |
| **§E BYT QĐ 3916** | Lấy phương pháp giám sát, mẫu số, phản hồi, tên TV; **không** lấy timing 48h | Chương trình viện |
| **§F Out of scope** | Nhi/sơ sinh + LabID/CLIP/AUR + GSC/VST/CSSD/QLCV | Tránh scope creep |
| **§G Traceability** | Topic → CDC Ch → QĐ 3916 → QT.34 → file dự án; cờ `[PO xác nhận]` | Audit |

## Ba luật cứng (PO)

1. **HAI ≠ 48 giờ.** POA = DOE ngày viện 1–2 (khung Ch.2); HAI = DOE ngày ≥3.
2. **Người lớn only.** PedVAE, LCBI-3, SUTI-2, PNU nhánh trẻ, Ch.17 ≤1 tuổi = OUT.
3. **Không invent tiêu chí.** Lệch PDF CDC vs SSOT cũ → ưu tiên PDF, gắn `[PO xác nhận]`.

## QT.34 vs QĐ 3916

- **KSNK.QT.34** đã dùng day-3 (khớp NHSN) → dùng cho quy trình viện.
- **QĐ 3916** intro còn câu “48 giờ” → **conflict đã ghi ở §0.2**; case finding vẫn NHSN.

## Nguồn local

- PDF CDC: `/workspace/nkbv-sources/cdc/NHSN-PSC-Manual-2025.pdf`
- Extract: `/workspace/nkbv-sources/extracted/cdc-ch{2,4,6,7,9,10,17}.txt`, `QD3916*.txt`, `QT34.txt`
- SSOT v3.3: `/workspace/nkbv-sources/project/hai-surveillance-domain-ssot-20260827.md`

## Không làm

- Không upload Drive từ executor (parent upload).
- Không sửa docs GSC/CSSD/VST/QLCV.
- Không coi field “48 giờ” trên form pilot là case definition.

---
*Companion 1 trang cho `10-NKBV-diagnosis-domain-ssot-adult.md`.*
