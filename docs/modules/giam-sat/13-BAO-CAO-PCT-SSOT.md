# Báo cáo % — field SSOT

| Trường | Giá trị |
|--------|---------|
| Mã | `13-BAO-CAO-PCT-SSOT` |
| Code | `src/lib/domain/bao-cao-pct.ts` |
| Domain | [`11-GIAM-SAT-TUAN-THU-domain-analysis-v1.md`](./11-GIAM-SAT-TUAN-THU-domain-analysis-v1.md) §G · phụ lục P1 |
| Hub IA | [`13-VE-SINH-TAY-hub.md`](./13-VE-SINH-TAY-hub.md) |

Làm tròn báo cáo / analytics: `round(×100, 1)`. `n_ap_dung = 0` → «—».

Điểm phiên (preview form / cột lịch sử) giữ scoring engine — không phải KPI báo cáo này.

## Công thức

| Chỉ số | Tử | Mẫu | Loại |
|--------|----|-----|------|
| `ty_le_vst` (WHO BM.01) | `so_tuan_thu` | `tong_co_hoi` | ô trống / không quan sát |
| `ty_le_bk` ≡ `ty_le_gsc` ≡ `ty_le_bm` | `n_dat` | `n_dat + n_kd` | NA khỏi tử và mẫu |
| `ty_le_vst_ky_thuat` (BM.02) | engine BK | engine BK | NA như trên |
| `ty_le_vst_ngoai_khoa` (BM.03) | engine BK | engine BK | NA như trên |

`n_kd` = số `KHONG_DAT`. `n_ap_dung` = `n_dat + n_kd`.

## Tầng BCTH / hub

Toàn viện (filter kỳ) → `ty_le_vst` (+ lens) và `ty_le_bk` tách nhau → khoa → BM (`ty_le_bm`) → top lỗi trong BM → top lỗi toàn kỳ BK.

Lens: `tgs` | `ksnk` | `cheo`. `do_lech = ty_le_tgs − ty_le_ksnk` chỉ khi cả hai mẫu > 0. Chéo không vào `do_lech`.

Hub VST = 3 KPI (`who.ty_le_vst`, `ky_thuat.ty_le_vst_ky_thuat`, `ngoai_khoa.ty_le_vst_ngoai_khoa`). Không có % gộp WHO+BK.

## Top lỗi

Chỉ `KHONG_DAT`. Rank `n_loi` giảm dần, rồi `ty_le_loi` giảm dần. Item cần `n_ap_dung ≥ 5` (`MIN_N_ITEM`).

`ty_le_loi = round(n_loi / n_ap_dung × 100, 1)`.

## Cờ đủ mẫu (không đổi công thức)

| Cờ | Ngưỡng |
|----|--------|
| `du_mau` WHO | `tong_co_hoi ≥ 20` |
| `du_mau` BK | `n_ap_dung ≥ 30` |

`ty_le_bao_phu_tgs` không phải % tuân thủ. Hình thức ≠ cách thức. Nhân sự KSNK = chuyên trách.
