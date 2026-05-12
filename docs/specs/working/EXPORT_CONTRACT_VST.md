# Export Contract VST (SPSS/Stata)

> **Neo:** Mọi đổi cột xuất đồng bộ file này + code flatten (xem [`PREP0_CONTRACT_PACK.md`](./PREP0_CONTRACT_PACK.md)).

Cap nhat: 28/04/2026  
Nguon tham chieu: [`../legacy-only/DATA_FLATTEN_REFERENCE.md`](../legacy-only/DATA_FLATTEN_REFERENCE.md) (flattening logic) + `PROGRESS_REPORT.md` (root)

## 1) Muc tieu
- Chot contract xuat du lieu VST o dang bang (flat) de phuc vu SPSS/Stata.
- Dam bao khong vo mapping cot khi thay doi UI/action/schema.

## 2) Input toi thieu
- Metadata:
  - `thoi_gian_giam_sat`
  - `id_khoa_phong`
  - `id_khu_vuc`
  - `id_nguoi_giam_sat`
  - `id_doi_tuong_giam_sat`
- Observation:
  - `chi_dinh_ve_sinh_tay` (array, 1..2 gia tri)
  - `hanh_dong_ve_sinh_tay`
  - `dung_ky_thuat`
  - `du_thoi_gian`
  - `co_deo_gang_tay`

## 3) WHO moments (binary columns)
- `IND_T-TXNB`
- `IND_T-TTVK`
- `IND_S-DCT`
- `IND_S-TXNB`
- `IND_S-XQNB`

## 4) Rule flatten
- Moi co hoi VST = 1 row.
- Voi moi moment trong 5 moments:
  - co trong `chi_dinh_ve_sinh_tay` => cot tuong ung = 1
  - khong co => cot tuong ung = 0
- Neu `chi_dinh_ve_sinh_tay` > 2 phan tu => reject payload (data integrity error).

## 5) Output header chot
- `thoi_gian_giam_sat`
- `id_khoa_phong`
- `id_khu_vuc`
- `id_nguoi_giam_sat`
- `id_doi_tuong_giam_sat`
- `IND_T-TXNB`
- `IND_T-TTVK`
- `IND_S-DCT`
- `IND_S-TXNB`
- `IND_S-XQNB`
- `hanh_dong_ve_sinh_tay`
- `dung_ky_thuat`
- `du_thoi_gian`
- `co_deo_gang_tay`

## 6) Gate truoc release
- [ ] Header xuat khop contract nay 100%.
- [ ] Mau test co du case 1 moment va 2 moments.
- [ ] Khong co row nao vi pham maxItems cua `chi_dinh_ve_sinh_tay`.
- [ ] Kiem tra lai mapping voi action + DB field hien hanh.
