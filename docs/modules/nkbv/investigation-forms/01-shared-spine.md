# Spine chung hàng 0–9 — Shared vs Delta

> **A1** · 2026-08-05  
> Runtime: `NkbvDiagnosticCaseForm` / modal phán quyết · Neo [`../clinical-forms.md`](../clinical-forms.md)

## 1. Chuỗi chẩn đoán (mọi hội chứng)

| Hàng | Tên | Shared / Delta | Nguồn dữ liệu ưu tiên |
|------|-----|----------------|------------------------|
| 0 | Yếu tố xác định khung (Index) | **Delta** loại | LIS ngày cấy / ngày XQ / VAC DOE |
| 1 | Cửa sổ thời gian | **Shared** logic, Delta nhãn | Metrics: IWP ±3 · Event Period VAE · Surveillance SSI |
| 2 | Tiêu chuẩn trong cửa sổ | **Delta** L1/L2 | Sub-form verification |
| 3 | DOE | **Computed** | Ngày sớm nhất symptom_dates ∈ cửa sổ (hoặc VAC DOE) |
| 4 | POA / HAI | **Computed** | BA `ngay_vao_vien` + DOE (HD≥3 = HAI) |
| 5 | LOA — quy kết khoa | **Shared** | `treatmentHistory` + Transfer Rule |
| 6 | Dụng cụ xâm lấn | **Delta** loại | Registry prefill + xác nhận DOE/DOE−1 |
| 7 | RIT | **Computed** | [DOE → DOE+13] (khi áp dụng) |
| 8 | Secondary BSI / SBAP | **Shared** khung, Delta site | SBAP + khớp loài |
| 9 | Kết luận | **Computed** | `evaluate*` classification badge |
| — | Xác nhận kép LS + KSNK | **Shared** | Modal footer |

## 2. Shared — không lặp 5 lần trên phiếu giấy

| Thông tin | UI | Ghi chú |
|-----------|-----|---------|
| PID, họ tên, mã ca, mã BA | Header ca | Không nhân trên mỗi sub-form |
| Ngày vào viện | Hàng 4 / panel BA | Sửa → sync BA |
| Khoa hiện tại / lịch sử | Hàng 5 | LOA |
| LIS tóm tắt (bệnh phẩm, tác nhân, CFU) | Banner | Chỉnh nếu sai → feed Index |
| Ngày rà soát IP / chữ ký giấy | Phụ lục B / in | L3 — không chặn classification |

## 3. Delta theo hội chứng (hàng 0 / 2 / 6)

| | Index (0) | Tiêu chuẩn L1 (2) | Device (6) |
|--|-----------|-------------------|------------|
| **BSI** | Cấy máu | Pathogen class + (commensal→triệu chứng) | CVC ≥2d + DOE/DOE−1 |
| **UTI** | Cấy NT | CFU/≤2/no nấm + ≥1 sx hợp lệ | Foley gate CAUTI |
| **VAE** | Worsening vent | VAC PEEP/FiO₂ | Vent ≥4d liên tục |
| **PNEU** | Cấy **hoặc** XQ | Imaging + toàn thân + ≥2 hô hấp | Vent → nhãn VAP/Non-VAP |
| **SSI** | DOE trong cửa sổ mổ | Depth + ≥1 tiêu chí | Implant → 30/90; không IWP ±3 |

## 4. Cấm lẫn domain (VAE ≠ PNEU)

| | VAE | PNEU / VAP lâm sàng |
|--|-----|---------------------|
| Cửa sổ | **Event Period** (không gọi IWP lâm sàng) | **IWP ±3** quanh Index |
| Hình ảnh ngực | **Cấm** dùng để chẩn đoán | **Bắt buộc** |
| Cò súng | Bảng PEEP/FiO₂ min | Cấy đờm hoặc ngày XQ |
| Nhãn VAP | Không dùng cây PNEU | Device-association sau khi đạt PNEU |

Hai form runtime riêng: `VaeClinicalSubForm` vs `PneuClinicalSubForm`.

## 5. Computed — hiển thị đọc + “Sửa”

- `iwp_start` / `iwp_end` / `doe` / `hai_status` / `device_*_days` / `device_active_on_event`  
- Attribution khoa + lý do Transfer Rule  
- Classification + `is_secondary_bsi`  

User chỉ nhập lại khi số máy sai so với hồ sơ.
