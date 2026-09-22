# Hub Vệ sinh tay — 3 mẫu · 3 chỉ số

| Trường | Giá trị |
|--------|---------|
| Mã | `13-VE-SINH-TAY-hub` |
| Phiên bản | 2026-09-22 |
| Domain lock | [`11-GIAM-SAT-TUAN-THU-domain-analysis-v1.md`](./11-GIAM-SAT-TUAN-THU-domain-analysis-v1.md) § PO 18:51 |
| Inventory | [`12-BANG-KIEM-inventory-from-KSNK-final.md`](./12-BANG-KIEM-inventory-from-KSNK-final.md) § QT.07 |

## Điều hướng (nhập liệu)

Cổng `/giam-sat` → khối **Vệ sinh tay** (3 lối, **không** gộp form):

| # | Mẫu | Route |
|---|-----|-------|
| 1 | Quan sát 5 thời điểm (WHO / QT.07 BM.01) | `/giam-sat-vst` |
| 2 | Kỹ thuật VST thường quy (QT.07 BM.02) | `/giam-sat-chung/tuan-thu?bk=BM.07.02` |
| 3 | VST ngoại khoa (QT.07 BM.03) | `/giam-sat-chung/tuan-thu?bk=BM.07.03` |

Map mã SSOT: `src/lib/domain/ve-sinh-tay-catalog.ts` (`chuyen_de = VE_SINH_TAY`).

**Cấm:** BM.01 / `VST_WHO` trong picker bảng kiểm GSC — lọc tại `getBangKiemsForGiamSat`.

Chuyên đề khác (PTPH, môi trường, …) → «Giám sát tuân thủ khác» + catalog GSC.

## Báo cáo / thống kê (3 chỉ số cạnh nhau)

Trên **Báo cáo tổng hợp** (`/bao-cao-tong-hop`) mục chính **Vệ sinh tay** (`#bc-vst`, không chôn trong Thêm → Chuyên đề) và dải KPI mặt trước:

| Khối | Engine | Field |
|------|--------|-------|
| WHO 5 thời điểm | VST | `ty_le_vst` (`so_tuan_thu` / `tong_co_hoi`) |
| Kỹ thuật TQ | BK · `BM.07.02` | `ty_le_vst_ky_thuat` |
| Ngoại khoa | BK · `BM.07.03` | `ty_le_vst_ngoai_khoa` |

Công thức và top lỗi: [`13-BAO-CAO-PCT-SSOT.md`](./13-BAO-CAO-PCT-SSOT.md). `n_ap_dung = 0` → «—».

- **Không** average ba khối thành một %.
- Pool `ty_le_bk` toàn GSC ở mục **Giám sát chung**, nhãn «pool GSC (mọi BK)» — không xếp cạnh 3 KPI vệ sinh tay. BM.02/03 không vào list GSC generic.
- Mỗi khối có lens hình thức riêng (không lens chung WHO+GSC). Cách thức là lọc, không phải lens.
- `ty_le_dung_ky_thuat` là chỉ số phụ phiếu WHO, khác BM.02 `ty_le_vst_ky_thuat`.
- Cùng filter kỳ / khoa / lens TGS|KSNK của BCTH.
- Tab chuyên đề VST cũng tải GSC (để có BM.02/03) — `shouldFetchSource("VST", "GSC") === true`.

Deep-link thống kê từng khối: `/thong-ke/vst` · `/thong-ke/gsc?bk=BM.07.02` · `?bk=BM.07.03`.

## UAT nhanh

1. `/giam-sat` → mở đủ 3 lối (cần quyền VST + GSC).
2. BM.02/03 mở form GSC đúng mẫu preselected.
3. Picker GSC không có BM.07.01 / WHO.
4. BCTH mục chính Vệ sinh tay → 3 card cạnh nhau («—» nếu chưa có phiên), mỗi khối có so sánh khoa. % theo BM ở mục Giám sát chung; top lỗi trong BM và toàn kỳ; lens TGS / chuyên trách / chéo tách, không chồng % WHO với BK.
