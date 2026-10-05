# 03 — Gap vs canonical-36 (short BM.xx vs KSNK.QT/QĐ.xx.BM.xx)

> So sánh `docs/data/bang-kiem/canonical-36.md` (36 mã short thế hệ form cũ) với mã viện `KSNK.QT.*/QĐ.*.BM.*` trong inventory filtered.
> **Chưa** normalize seed DB lần này — chỉ ghi lệch để PO / migrate sau.

## 1. Bảng xref

| Mã short (canonical-36) | Mã viện (inventory / QT) | Ghi chú lệch |
|---|---|---|
| `BM.03.03` | `KSNK.QT.03.BM.03` | ICRA — khớp chủ đề; số BM trùng .03 |
| `BM.07.02` | `KSNK.QT.07.BM.02` | VST TQ kỹ thuật — khớp |
| `BM.07.03` | `KSNK.QT.07.BM.03` | VST ngoại khoa — khớp |
| `BM.08.01` | `KSNK.QT.08.BM.01 (+ BM.02)` | Canonical gộp PPE; QT tách chỉ định (BM.01) vs mặc/cởi (BM.02) |
| `BM.09.01` | `KSNK.QT.09.BM.01` | Tiêm an toàn — khớp chủ đề |
| `BM.10.01` | `KSNK.QT.10.BM.04` | Phơi nhiễm — **lệch số** BM.01 (canon) vs BM.04 (QT viện) |
| `BM.11.01` | `KSNK.QT.11.BM.02 / BM.03 / BM.04` | VSMT — QT có nhiều BM; canon 1 mã |
| `BM.12.01` | `KSNK.QT.12.BM.01` | Chất thải — khớp |
| `BM.13.01` | `KSNK.QT.13.BM.01 / BM.02` | Đồ vải — QT tách thu gom vs giặt là |
| `BM.14.01` | `KSNK.QT.14.BM.01` | Đường lây — khớp |
| `BM.15.01` | `KSNK.QT.15.BM.01` | Vận chuyển NB — khớp |
| `BM.16.01` | `KSNK.QT.16.BM.01` | Tử thi — khớp |
| `BM.17.01` | `KSNK.QT.17.BM.01` | PTPH cấp cao / BTN — khớp chủ đề |
| `BM.18.02` | `KSNK.QT.18.BM.02` | Làm sạch DC — khớp |
| `BM.19.01` | `(không IN cùng tên)` | Canon KK MĐC; QT.19 = kiểm tra bảo dưỡng → BM.02; KKMĐC = QT.25/26 cần PO |
| `BM.19.02` | `(không map)` | **Khác form** (sửa 2026-10-05 theo rà 07-GSC GSC-04): DB `seed.sql:199` = Nhật ký theo dõi hóa chất KKMĐC (MEC), NHAT_KY_VAN_HANH — KHÔNG phải QT.19.BM.02 kiểm tra bảo dưỡng; cấm alias; nhánh nhật ký, ngoài % (N-GSC-8) |
| `BM.20.02` | `KSNK.QT.20.BM.01` | Đóng gói — **lệch số** .02 vs .01 |
| `BM.21.04` | `KSNK.QT.22.BM.04` | Lưu trữ–cấp phát — lệch QT số + digital=cần PO |
| `BM.22.04` | `KSNK.QT.21 / QT.23?` | Canon «vận hành QC TK» — map QT.21/23 còn mở (cần PO) |
| `BM.24.02` | `KSNK.QT.29.BM.02` | SSI bundle — **lệch QT số** 24→29 |
| `BM.25.01` | `KSNK.QT.30.BM.01` | CLABSI insertion — **lệch QT** 25→30 |
| `BM.25.03` | `KSNK.QT.30.BM.02` | CVC maintenance — lệch QT 25→30 |
| `BM.26.01` | `KSNK.QT.32.BM.01` | VAP — **lệch QT** 26→32 |
| `BM.27.01 / BM.27.02` | `KSNK.QT.31.BM.01` | CAUTI — canon tách insertion/maintenance; QT 1 BM |
| `BM.31.03` | `KSNK.QT.36.BM.03` | MDRO — **lệch QT** 31→36 |
| `BM.QĐ.02.01` | `KSNK.QĐ.08.BM.01` | Phòng mổ — lệch số QĐ |
| `BM.QĐ.03.01` | `KSNK.QĐ.09.BM.01` | Cathlab — lệch số QĐ |
| `BM.QĐ.08.01` | `KSNK.QĐ.16? / khác` | AIIR áp âm — không 1:1 với inventory QĐ.08 (phòng mổ) |
| `BM.QĐ.09.01` | `KSNK.QĐ.16.BM.01` | PE — lệch số |
| `BM.QĐ.12.01` | `KSNK.QĐ.14.BM.01` | Lồng ấp — lệch số |
| `BM.QĐ.16.01` | `KSNK.QĐ.19.BM.01` | Xét nghiệm ATSB — lệch số |
| `BM.QĐ.17.01` | `(không map)` | **Khác form** (sửa 2026-10-05 theo rà 07-GSC): DB `seed.sql:209` = Nhật ký vệ sinh phòng sạch / Tủ BSC (nhật ký) — KHÔNG phải QĐ.20 pha chế; cấm alias; nhánh nhật ký, ngoài % (N-GSC-8) |
| `BM.QĐ.18.02` | `KSNK.QĐ.21.BM.02` | Bếp ăn — lệch số + BM.02 |
| `BM.QĐ.19.03` | `(SUDs — OUT / không IN seed)` | Dụng cụ một lần — ngoài filtered inventory GS |
| `BM.QĐ.20.01` | `KSNK.QĐ.15? nước lọc máu` | Nước lọc máu/nha — map QĐ.15 cần đối chiếu nội dung |

## 2. IN inventory không có trong canonical-36 (thêm mới / khu vực)

| Mã viện | Tên | Ghi chú |
|---|---|---|
| `KSNK.QT.01.BM.03` | Bảng kiểm giám sát tuân thủ quy trình kiểm soát văn bản | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.02.BM.04` | Bảng kiểm giám sát tuân thủ quy trình đánh giá rủi ro | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.05.BM.04` | Bảng kiểm giám sát hoạt động Hội đồng Kiểm soát nhiễm khuẩn | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.06.BM.03` | Bảng kiểm giám sát hoạt động của Mạng lưới kiểm soát nhiễm khuẩn | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.08.BM.02` | Bảng kiểm đánh giá kỹ thuật mặc và cởi PTPH (quan sát doffing) | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.11.BM.01` | Phiếu phân công và bảng kiểm công việc vệ sinh | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.11.BM.03` | Bảng kiểm giám sát chất lượng vệ sinh môi trường bề mặt | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.11.BM.04` | Bảng kiểm vệ sinh môi trường khu vực phẫu thuật | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.13.BM.02` | Bảng kiểm giám sát quy trình tại Đơn vị Giặt là | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.21.BM.01` | Bảng kiểm vận hành TK + **sổ IUSS** | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.23.BM.04` | Bảng kiểm QC | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.24.BM.03` | Bảng kiểm xử lý sự cố | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.25.BM.01` | Bảng kiểm KKMĐC | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.26.BM.02` | Bảng kiểm KKMĐC PTNS (có mục «không ngâm PM») | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.27.BM.03` | Bảng kiểm PCI.03.01 | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.28.BM.02` | Bảng kiểm loaner | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.29.BM.01` | Bảng kiểm an toàn phẫu thuật (SSI / QĐ 7482) | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.32.BM.02` | Bảng kiểm thực hành hằng ngày phòng ngừa VPLQTM | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.35.BM.04` | Bảng kiểm giám sát tuân thủ xử lý vụ dịch | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.37.BM.03` | Bảng kiểm giám sát tuân thủ quy trình lấy mẫu vi sinh môi trường | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QT.38.BM.03` | Bảng kiểm giám sát tuân thủ quản lý và sử dụng hóa chất | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.01.BM.01` | Bảng kiểm đánh giá mức độ thiết lập và vận hành Hệ thống KSNK | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.02.BM.01` | Bảng kiểm đánh giá hoạt động bảo đảm an toàn nghề nghiệp | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.03.BM.01` | Bảng kiểm giám sát tuân thủ KSNK đối với khách thăm và người nhà | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.04.BM.01` | Bảng kiểm giám sát tuân thủ kiểm soát nhiễm khuẩn tại Khoa Khám bệnh và Ngoại trú | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.05.BM.01` | Bảng kiểm giám sát tuân thủ KSNK tại Khoa Cấp cứu | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.06.BM.01` | Bảng kiểm giám sát tuân thủ KSNK tại Khoa Truyền nhiễm | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.07.BM.01` | Bảng kiểm giám sát tuân thủ quy định kiểm soát lây nhiễm lao | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.10.BM.01` | Bảng kiểm giám sát tuân thủ kiểm soát nhiễm khuẩn tại nha khoa | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.11.BM.01` | Bảng kiểm an toàn KSNK phòng nội soi (preclean phút, cấm ngâm PM, MEC, sấy, tủ, PPE, tiêm) | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.12.BM.01` | Bảng kiểm giám sát chính sách kiểm soát nhiễm khuẩn tại Khoa Hồi sức nội | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.13.BM.01` | Bảng kiểm giám sát hệ thống kiểm soát nhiễm khuẩn tại Khoa Hồi sức ngoại | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.15.BM.01` | Bảng kiểm giám sát KSNK tại Đơn vị Lọc máu | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.17.BM.01` | Bảng kiểm giám sát an toàn KSNK tại Trung tâm Ung bướu | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |
| `KSNK.QĐ.18.BM.01` | Bảng kiểm sàng lọc KSNK và giám sát an toàn môi trường ghép tạng | Không có short 1:1 trong canonical-36 (hoặc chỉ gần đúng) |

## 3. BM digital=`có` thiếu tiêu chí trong extract MD

Số lượng: **43** — status `can_po_extract` trong `bk/*.json`.

- `KSNK.QT.03.BM.03`
- `KSNK.QT.08.BM.01`
- `KSNK.QT.08.BM.02`
- `KSNK.QT.09.BM.01`
- `KSNK.QT.10.BM.04`
- `KSNK.QT.11.BM.02`
- `KSNK.QT.11.BM.03`
- `KSNK.QT.11.BM.04`
- `KSNK.QT.12.BM.01`
- `KSNK.QT.13.BM.01`
- `KSNK.QT.13.BM.02`
- `KSNK.QT.14.BM.01`
- `KSNK.QT.15.BM.01`
- `KSNK.QT.16.BM.01`
- `KSNK.QT.17.BM.01`
- `KSNK.QT.18.BM.02`
- `KSNK.QT.19.BM.02`
- `KSNK.QT.20.BM.01`
- `KSNK.QT.29.BM.01`
- `KSNK.QT.29.BM.02`
- `KSNK.QT.30.BM.01`
- `KSNK.QT.30.BM.02`
- `KSNK.QT.31.BM.01`
- `KSNK.QT.32.BM.01`
- `KSNK.QT.32.BM.02`
- `KSNK.QT.35.BM.04`
- `KSNK.QT.36.BM.03`
- `KSNK.QT.37.BM.03`
- `KSNK.QT.38.BM.03`
- `KSNK.QĐ.08.BM.01`
- `KSNK.QĐ.09.BM.01`
- `KSNK.QĐ.10.BM.01`
- `KSNK.QĐ.11.BM.01`
- `KSNK.QĐ.12.BM.01`
- `KSNK.QĐ.13.BM.01`
- `KSNK.QĐ.14.BM.01`
- `KSNK.QĐ.15.BM.01`
- `KSNK.QĐ.16.BM.01`
- `KSNK.QĐ.17.BM.01`
- `KSNK.QĐ.18.BM.01`
- `KSNK.QĐ.19.BM.01`
- `KSNK.QĐ.20.BM.01`
- `KSNK.QĐ.21.BM.02`

## 4. Kết luận normalize

1. **Không** dùng mã short `BM.07.xx` làm PK seed mới — dùng `KSNK.QT.07.BM.xx`.
2. Nhiều chuyên đề đổi số QT giữa thế hệ form (SSI 24→29, CLABSI 25→30, VAP 26→32, MDRO 31→36).
3. Canonical-36 có tiêu chí đầy đủ nhưng **không** tự động copy vào seed này (tránh lệch QT viện) — chỉ xref.
4. Bước sau (ngoài scope): PO tick `cần PO` + extract docx/form → rồi migration `gstt_dm_bang_kiem`.

*Draft 2026-09-22 Asia/Saigon — docs only, chưa DB.*
