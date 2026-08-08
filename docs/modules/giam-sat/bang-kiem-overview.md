# Bảng kiểm GSC/VST — tóm tắt

> Chi tiết đầy đủ (machine source): [`../../data/bang-kiem/canonical-36.md`](../../data/bang-kiem/canonical-36.md)

## Canonical 36 mẫu

- Cutover 2026-05-29: 51 → **36** mẫu `gstt_dm_bang_kiem` seed từ `canonical-36.md`
- Generator: `scripts/generate-canonical-36-cutover.mjs`
- Mã ACT tiêu chí: enrich qua `scripts/enrich-bang-kiem-act-codes.mjs`

## Cách tính điểm (`cach_tinh_diem`)

| Giá trị | Tỷ lệ tiêu chí (`tong_diem`) | UI |
|---------|------------------------------|-----|
| `TY_LE` | % DAT/(DAT+KHÔNG ĐẠT) | `% · Tốt/Đạt/Không đạt` |
| `TRON_GOI` | % như trên (+ `dat_tron_goi` trong DB) | Chỉ `%` trên UI |
| `DAT_KHONG_DAT` | % như trên | Chỉ `%` trên UI |
| `NHAT_KY` | null | Cảnh báo ngoài ngưỡng |

UI GSC **chỉ hiện tỷ lệ %** (không nhãn “Chưa đủ 100%” / Bundle). Phân tích tiêu chí lỗi: `results_jsonb` + thống kê.  
Engine: `giam-sat-scoring.ts` · UI: `gsc-score-display.ts` · [`concepts.md#gsc-scoring`](../../wiki/concepts.md#gsc-scoring).

## Data files (không mở tay)

| File | Vai trò |
|------|---------|
| `data/bang-kiem/canonical-36.md` | SSOT 36 mẫu 4 phần |
| `data/bang-kiem/raw-forms-full.md` | Nguồn trích xuất gốc |
| `data/bang-kiem/master-bangkiem.md` | Master template list |
| `data/bang-kiem/master-tieuchi.md` | Master tiêu chí |

## Điểm nguy cơ P×I×S (kế hoạch / chưa ship)

Phân tích khả thi (SOP 7.1): P/I chấm tay, S gợi ý từ `% tuân thủ năm trước`, điểm = `P×I×S` — **tách** khỏi `tong_diem` phiên. Chi tiết: [`bang-kiem-rui-ro-pis-feasibility-20260731.md`](bang-kiem-rui-ro-pis-feasibility-20260731.md).

## Quy tắc phiên

- VST: tối đa **3 đối tượng** quan sát / phiên (trừ yêu cầu mới)
- GSC: kết quả inline `results_jsonb` — không EAV kết quả
