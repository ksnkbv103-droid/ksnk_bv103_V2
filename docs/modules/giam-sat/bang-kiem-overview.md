# Bảng kiểm GSC/VST — tóm tắt

> Chi tiết đầy đủ (machine source): [`../../data/bang-kiem/canonical-36.md`](../../data/bang-kiem/canonical-36.md)

## Canonical 36 mẫu

- Cutover 2026-05-29: 51 → **36** mẫu `gstt_dm_bang_kiem` seed từ `canonical-36.md`
- Generator: `scripts/generate-canonical-36-cutover.mjs`
- Mã ACT tiêu chí: enrich qua `scripts/enrich-bang-kiem-act-codes.mjs`

## Tiêu chí trên mẫu (field phiếu GSC)

Soạn tiêu chí ở Quản trị ghi vào `tieu_chi_jsonb` các field phiếu đang đọc: `kieu_du_lieu`, `cac_lua_chon`, `nguong_min`/`nguong_max`/`don_vi`, `la_then_chot`, `cho_phep_kpa`, `weight_type`, `is_red_flag`. Phiếu đã lưu giữ bản chốt (BK-1).

## Loại giám sát + cách tính (mẫu)

Quản trị mẫu đặt `loai_giam_sat` và `cach_tinh_diem` trên `gstt_dm_bang_kiem`. GSC lọc cổng và chấm điểm theo hai cột này; phiếu đã lưu giữ bản chốt (BK-1).

| `loai_giam_sat` | Cổng phiếu |
|-----------------|------------|
| `TUAN_THU` | Tuân thủ thực hành |
| `NHAT_KY_VAN_HANH` | Nhật ký vận hành |
| `DANH_GIA_HE_THONG` | Đánh giá hệ thống |

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
- GSC: khi **Lưu** phiên, chốt nội dung mẫu vào `metadata.bang_kiem_snapshot`. Mở sửa/in/xem: dùng bản chốt. Phiếu cũ chưa chốt: chỉ hiện câu đã ghi trên phiếu đó (không thêm câu mới đang bật trên mẫu).
- GSC: mẫu **đã tắt** (hoặc không còn áp dụng khoa với mạng lưới) không chọn khi tạo phiếu mới. Phiếu cũ vẫn mở đúng bản đã lưu.
