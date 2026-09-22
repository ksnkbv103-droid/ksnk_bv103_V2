# Inventory bảng kiểm / phiếu quan sát — seed digital giám sát (filtered)

| Trường | Giá trị |
|--------|---------|
| Mã | `12-BANG-KIEM-inventory-from-KSNK-final` |
| Phiên bản | **v1.2** 2026-09-22 — P0-1A: seed `gstt_dm_bang_kiem` chỉ TUÂN THỦ thực hành; OUT audit/CSSD/nhật ký |
| Nguồn Drive | Folder `Quy trình, quy định, mô tả vị trí việc làm KSNK_final` (`10_190H0LJ551hfUFcpcMGvPPZ2ewIfyE`) |
| Cross-check | `/workspace/ipc-updated/QT/*.md` + `QD/*.md` |
| Phạm vi file này | **Chỉ** mẫu bảng kiểm / phiếu quan sát phục vụ **công tác giám sát tuân thủ** (digital GS) — **không** mọi BM trong QT/QĐ |
| Ngoài phạm vi | Không sửa seed `gstt_dm_bang_kiem` · không sửa Word QT/QĐ · không invent BM |
| Liên kết domain | [`11-GIAM-SAT-TUAN-THU-domain-analysis-v1.md`](./11-GIAM-SAT-TUAN-THU-domain-analysis-v1.md) §L |

> **Mục đích:** danh sách **seed giám sát** (catalog WHO + GSC). Corpus đầy đủ 135 BM QT/QĐ vẫn tồn tại trong QT extracts — file này chỉ giữ **subset đã lọc**.
>
> **Họ form (khóa domain):** (1) **WHO** = chỉ VST thường quy (`KSNK.QT.07.BM.01`); (2) **BK** = GSC + VST ngoại khoa + mọi BK tiêu chí Đạt/KĐ/NA (hoặc quan sát kỹ thuật).

## 1. Nguyên tắc lọc (PO 2026-09-22)

### INCLUDE — đưa vào «danh sách seed giám sát»

- Phiếu / bảng kiểm **quan sát tuân thủ thực hành** tại điểm chăm sóc **hoặc** chuyên đề KSNK dùng để **giám sát** (quan sát viên đánh giá Đạt/KĐ/NA hoặc WHO cột tích).
- **Bắt buộc gồm:**
  - `KSNK.QT.07.BM.01` — WHO lưới VST thường quy
  - `KSNK.QT.07.BM.02` / `BM.03` — observation checklist kỹ thuật / ngoại khoa
  - Các BM QT khác rõ tiêu đề **Bảng kiểm giám sát / quan sát tuân thủ / đánh giá thực hành tại chỗ**
  - QT.33: quy trình GS dùng công cụ quan sát neo QT khác — **không** lấy BM.01/BM.02 (báo cáo/sổ) làm phiếu quan sát
- QĐ khu vực: BK giám sát tuân thủ / an toàn KSNK tại khoa/khu → IN SCOPE (trừ khi chỉ là sổ/nhật ký)

### EXCLUDE — không đưa seed giám sát

- Sổ theo dõi, biên bản họp / giao nhận, phiếu đề nghị / cấp phát, mẫu báo cáo hành chính
- Checklist đào tạo / BDNL **không** dùng để GS tuân thủ (vd. `QT.04.BM.06`)
- VTVL / MTCV / BDNL.* / NVKN.*
- Forms NKBV case-finding (QT.34 + line-list vụ dịch) — ngoài module này
- CSSD operational logs (nhật ký mẻ, sổ BI, Bowie-Dick, sổ cấp phát…) — **trừ** khi là BK quan sát tuân thủ có tiêu đề giám sát rõ

### Conservative

- BM tên mơ hồ / hybrid sổ+BK / audit quản trị (văn bản, Hội đồng, hệ thống) → vẫn liệt kê IN SCOPE nhưng cột digital = **`cần PO`** (`[PO xác nhận]`), **không** force «có».

## 2. Bảng IN SCOPE giám sát

| STT | Mã | Tên | QT | Họ form (WHO\|BK) | Đề xuất dùng digital GS | Ghi chú ngắn |
|-----|-----|-----|----|-------------------|-------------------------|--------------|
| 1 | `KSNK.QT.01.BM.03` | Bảng kiểm giám sát tuân thủ quy trình kiểm soát văn bản | QT.01 | BK | cần PO | GS tuân thủ kiểm soát văn bản — quản trị tài liệu; [PO xác nhận] |
| 2 | `KSNK.QT.02.BM.04` | Bảng kiểm giám sát tuân thủ quy trình đánh giá rủi ro | QT.02 | BK | cần PO | GS tuân thủ đánh giá rủi ro — quản trị; [PO xác nhận] |
| 3 | `KSNK.QT.03.BM.03` | Bảng kiểm giám sát tuân thủ ICRA | QT.03 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 4 | `KSNK.QT.05.BM.04` | Bảng kiểm giám sát hoạt động Hội đồng Kiểm soát nhiễm khuẩn | QT.05 | BK | cần PO | GS hoạt động Hội đồng — quản trị; [PO xác nhận] |
| 5 | `KSNK.QT.06.BM.03` | Bảng kiểm giám sát hoạt động của Mạng lưới kiểm soát nhiễm khuẩn | QT.06 | BK | cần PO | GS hoạt động Mạng lưới — quản trị; [PO xác nhận] |
| 6 | `KSNK.QT.07.BM.01` | Bảng kiểm giám sát tuân thủ vệ sinh tay năm thời điểm | QT.07 | WHO | có | WHO lưới VST thường quy — PO chốt INCLUDE |
| 7 | `KSNK.QT.07.BM.02` | Bảng kiểm đánh giá kỹ thuật vệ sinh tay thường quy | QT.07 | BK | có | Observation checklist kỹ thuật VST TQ — PO chốt INCLUDE |
| 8 | `KSNK.QT.07.BM.03` | Bảng kiểm đánh giá kỹ thuật vệ sinh tay ngoại khoa (có mục riêng bước chà cồn) | QT.07 | BK | có | Observation checklist VST ngoại khoa — PO chốt INCLUDE |
| 9 | `KSNK.QT.08.BM.01` | Bảng kiểm giám sát tuân thủ chỉ định sử dụng PTPH | QT.08 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 10 | `KSNK.QT.08.BM.02` | Bảng kiểm đánh giá kỹ thuật mặc và cởi PTPH (quan sát doffing) | QT.08 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 11 | `KSNK.QT.09.BM.01` | Bảng kiểm giám sát thực hành tiêm an toàn | QT.09 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 12 | `KSNK.QT.10.BM.04` | Bảng kiểm giám sát tuân thủ hệ thống xử lý phơi nhiễm | QT.10 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 13 | `KSNK.QT.11.BM.01` | Phiếu phân công và bảng kiểm công việc vệ sinh | QT.11 | BK | cần PO | Hybrid phiếu phân công + bảng kiểm công việc — [PO xác nhận] |
| 14 | `KSNK.QT.11.BM.02` | Bảng kiểm giám sát thực hành vệ sinh môi trường bề mặt | QT.11 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 15 | `KSNK.QT.11.BM.03` | Bảng kiểm giám sát chất lượng vệ sinh môi trường bề mặt | QT.11 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 16 | `KSNK.QT.11.BM.04` | Bảng kiểm vệ sinh môi trường khu vực phẫu thuật | QT.11 | BK | có | BK vệ sinh môi trường khu vực PT — quan sát tại chỗ |
| 17 | `KSNK.QT.12.BM.01` | Bảng kiểm giám sát tuân thủ quản lý chất thải y tế | QT.12 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 18 | `KSNK.QT.13.BM.01` | Bảng kiểm giám sát tuân thủ thu gom đồ vải | QT.13 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 19 | `KSNK.QT.13.BM.02` | Bảng kiểm giám sát quy trình tại Đơn vị Giặt là | QT.13 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 20 | `KSNK.QT.14.BM.01` | Bảng kiểm giám sát tuân thủ phòng ngừa dựa trên đường lây truyền | QT.14 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 21 | `KSNK.QT.15.BM.01` | Bảng kiểm giám sát tuân thủ quy trình vận chuyển NB | QT.15 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 22 | `KSNK.QT.16.BM.01` | Bảng kiểm giám sát tuân thủ KSNK trong xử lý tử thi | QT.16 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 23 | `KSNK.QT.17.BM.01` | Bảng kiểm giám sát chéo mặc/cởi PTPH cấp cao | QT.17 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 24 | `KSNK.QT.18.BM.02` | Bảng kiểm giám sát quy trình làm sạch | QT.18 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 25 | `KSNK.QT.19.BM.02` | Bảng kiểm giám sát kiểm tra và bảo dưỡng | QT.19 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 26 | `KSNK.QT.20.BM.01` | Bảng kiểm giám sát đóng gói | QT.20 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 27 | `KSNK.QT.21.BM.01` | Bảng kiểm vận hành TK + **sổ IUSS** | QT.21 | BK | cần PO | Hybrid BK vận hành TK + sổ IUSS — [PO xác nhận] GS vs nhật ký CSSD |
| 28 | `KSNK.QT.22.BM.04` | Bảng kiểm lưu trữ–cấp phát (có mục hết hạn tại khoa) | QT.22 | BK | cần PO | BK lưu trữ–cấp phát — có thể vận hành CSSD; [PO xác nhận] |
| 29 | `KSNK.QT.23.BM.04` | Bảng kiểm QC | QT.23 | BK | cần PO | BK QC CSSD — QC vận hành vs GS tuân thủ; [PO xác nhận] |
| 30 | `KSNK.QT.24.BM.03` | Bảng kiểm xử lý sự cố | QT.24 | BK | cần PO | BK xử lý sự cố — [PO xác nhận] có phải quan sát tuân thủ |
| 31 | `KSNK.QT.25.BM.01` | Bảng kiểm KKMĐC | QT.25 | BK | cần PO | BK KKMĐC — [PO xác nhận] quan sát quy trình vs nhật ký |
| 32 | `KSNK.QT.26.BM.02` | Bảng kiểm KKMĐC PTNS (có mục «không ngâm PM») | QT.26 | BK | cần PO | BK KKMĐC PTNS — [PO xác nhận] |
| 33 | `KSNK.QT.27.BM.03` | Bảng kiểm PCI.03.01 | QT.27 | BK | cần PO | BK PCI.03.01 — tên mơ hồ; [PO xác nhận] |
| 34 | `KSNK.QT.28.BM.02` | Bảng kiểm loaner | QT.28 | BK | cần PO | BK loaner — có thể vận hành mượn dụng cụ; [PO xác nhận] |
| 35 | `KSNK.QT.29.BM.01` | Bảng kiểm an toàn phẫu thuật (SSI / QĐ 7482) | QT.29 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 36 | `KSNK.QT.29.BM.02` | Bảng kiểm giám sát tuân thủ gói phòng ngừa SSI | QT.29 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 37 | `KSNK.QT.30.BM.01` | Bảng kiểm an toàn đặt CVC (Insertion Bundle) | QT.30 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 38 | `KSNK.QT.30.BM.02` | Bảng kiểm giám sát tuân thủ chăm sóc CVC (Maintenance Bundle) | QT.30 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 39 | `KSNK.QT.31.BM.01` | Bảng kiểm giám sát tuân thủ gói phòng ngừa CAUTI | QT.31 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 40 | `KSNK.QT.32.BM.01` | Bảng kiểm giám sát tuân thủ gói phòng ngừa VAP (gồm mục cuff / ấm-ẩm / chủ sở hữu Trang bị) | QT.32 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 41 | `KSNK.QT.32.BM.02` | Bảng kiểm thực hành hằng ngày phòng ngừa VPLQTM | QT.32 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 42 | `KSNK.QT.35.BM.04` | Bảng kiểm giám sát tuân thủ xử lý vụ dịch | QT.35 | BK | có | Bảng kiểm giám sát tuân thủ xử lý vụ dịch |
| 43 | `KSNK.QT.36.BM.03` | Bảng kiểm giám sát tuân thủ phòng ngừa MDRO (có mục TB dùng chung) | QT.36 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 44 | `KSNK.QT.37.BM.03` | Bảng kiểm giám sát tuân thủ quy trình lấy mẫu vi sinh môi trường | QT.37 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 45 | `KSNK.QT.38.BM.03` | Bảng kiểm giám sát tuân thủ quản lý và sử dụng hóa chất | QT.38 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 46 | `KSNK.QĐ.01.BM.01` | Bảng kiểm đánh giá mức độ thiết lập và vận hành Hệ thống KSNK | QĐ.01 | BK | cần PO | Đánh giá thiết lập/vận hành hệ thống KSNK — audit hệ thống; [PO xác nhận] |
| 47 | `KSNK.QĐ.02.BM.01` | Bảng kiểm đánh giá hoạt động bảo đảm an toàn nghề nghiệp | QĐ.02 | BK | cần PO | Đánh giá hoạt động an toàn nghề nghiệp — audit; [PO xác nhận] |
| 48 | `KSNK.QĐ.03.BM.01` | Bảng kiểm giám sát tuân thủ KSNK đối với khách thăm và người nhà | QĐ.03 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 49 | `KSNK.QĐ.04.BM.01` | Bảng kiểm giám sát tuân thủ kiểm soát nhiễm khuẩn tại Khoa Khám bệnh và Ngoại trú | QĐ.04 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 50 | `KSNK.QĐ.05.BM.01` | Bảng kiểm giám sát tuân thủ KSNK tại Khoa Cấp cứu | QĐ.05 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 51 | `KSNK.QĐ.06.BM.01` | Bảng kiểm giám sát tuân thủ KSNK tại Khoa Truyền nhiễm | QĐ.06 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 52 | `KSNK.QĐ.07.BM.01` | Bảng kiểm giám sát tuân thủ quy định kiểm soát lây nhiễm lao | QĐ.07 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 53 | `KSNK.QĐ.08.BM.01` | Bảng kiểm KSNK phòng mổ (gồm lệnh cấm HĐ 31/07, hạn kệ, VSMT 4290) | QĐ.08 | BK | có | BK KSNK phòng mổ — chuyên đề khu vực |
| 54 | `KSNK.QĐ.09.BM.01` | Bảng kiểm giám sát tuân thủ kiểm soát nhiễm khuẩn tại phòng can thiệp mạch | QĐ.09 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 55 | `KSNK.QĐ.10.BM.01` | Bảng kiểm giám sát tuân thủ kiểm soát nhiễm khuẩn tại nha khoa | QĐ.10 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 56 | `KSNK.QĐ.11.BM.01` | Bảng kiểm an toàn KSNK phòng nội soi (preclean phút, cấm ngâm PM, MEC, sấy, tủ, PPE, tiêm) | QĐ.11 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 57 | `KSNK.QĐ.12.BM.01` | Bảng kiểm giám sát chính sách kiểm soát nhiễm khuẩn tại Khoa Hồi sức nội | QĐ.12 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 58 | `KSNK.QĐ.13.BM.01` | Bảng kiểm giám sát hệ thống kiểm soát nhiễm khuẩn tại Khoa Hồi sức ngoại | QĐ.13 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 59 | `KSNK.QĐ.14.BM.01` | Bảng kiểm vệ sinh lồng ấp và giường sưởi | QĐ.14 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 60 | `KSNK.QĐ.15.BM.01` | Bảng kiểm giám sát KSNK tại Đơn vị Lọc máu | QĐ.15 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 61 | `KSNK.QĐ.16.BM.01` | Bảng kiểm giám sát tuân thủ môi trường bảo vệ (PE) | QĐ.16 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 62 | `KSNK.QĐ.17.BM.01` | Bảng kiểm giám sát an toàn KSNK tại Trung tâm Ung bướu | QĐ.17 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 63 | `KSNK.QĐ.18.BM.01` | Bảng kiểm sàng lọc KSNK và giám sát an toàn môi trường ghép tạng | QĐ.18 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 64 | `KSNK.QĐ.19.BM.01` | Bảng kiểm giám sát tuân thủ an toàn sinh học tại Khoa Xét nghiệm | QĐ.19 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 65 | `KSNK.QĐ.20.BM.01` | Bảng kiểm giám sát tuân thủ KSNK tại khu vực pha chế | QĐ.20 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 66 | `KSNK.QĐ.21.BM.02` | Bảng kiểm giám sát an toàn KSNK tại bếp ăn | QĐ.21 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |

**Tổng IN SCOPE:** 66 (WHO **1** · BK **65**) — trong đó digital=`có` **51** · `cần PO` **15** · `không` **0**.

## 3. OUT OF SCOPE — tóm tắt theo nhóm (không liệt kê đủ 135)

Corpus QT.01–38 + QĐ.01–21 có **135** BM có mã. Sau lọc: **69** EXCLUDE khỏi seed giám sát.

| Nhóm EXCLUDE | Số | Ví dụ điển hình |
|--------------|----|-----------------|
| Sổ theo dõi / nhật ký vận hành (CSSD, kho, môi trường…) | **25** | QT.10.BM.03, QT.12.BM.02, QT.12.BM.03… |
| Phiếu đề nghị / cấp phát / theo dõi / cảnh báo / điều tra | **9** | QT.01.BM.02, QT.03.BM.01, QT.03.BM.02… |
| Kế hoạch / danh mục / CSDL / khác hành chính | **8** | QT.01.BM.01, QT.02.BM.02, QT.02.BM.03… |
| Biên bản họp / giao nhận / sự cố / nghiệm thu | **8** | QT.02.BM.01, QT.03.BM.04, QT.05.BM.03… |
| NKBV / vụ dịch case-finding · line-list · phiếu điều tra (ngoài module GS) | **8** | QT.34.BM.01, QT.34.BM.02, QT.34.BM.03… |
| Checklist / BM đào tạo · BDNL (không dùng GS tuân thủ) | **6** | QT.04.BM.01, QT.04.BM.02, QT.04.BM.03… |
| Mẫu báo cáo hành chính / tổng hợp KPI | **3** | QT.06.BM.01, QT.07.BM.04, QT.24.BM.02… |
| QT.33 báo cáo phản hồi / sổ tổng hợp dữ liệu GS (không phải phiếu quan sát) | **2** | QT.33.BM.01, QT.33.BM.02… |

| **Tổng EXCLUDE** | **69** | |

### Ghi chú QT.33

- `KSNK.QT.33.BM.01` Báo cáo phản hồi kết quả giám sát tuân thủ → **OUT** (báo cáo)
- `KSNK.QT.33.BM.02` Sổ tổng hợp, phân tích dữ liệu giám sát → **OUT** (sổ)
- Phiếu quan sát dùng trong quy trình QT.33 = các BK chuyên đề (QT.07–32, QĐ…) ở bảng §2

## 4. Counts

| Hạng mục | Số |
|----------|----|
| Corpus BM có mã (QT+QĐ) | 135 |
| **IN SCOPE giám sát** | **66** |
| — trong đó họ WHO | **1** |
| — trong đó họ BK | **65** |
| — digital GS = có | 51 |
| — digital GS = cần PO | 15 |
| — digital GS = không | 0 |
| **EXCLUDE (out of seed GS)** | **69** |

## 5. QT.07 — làm rõ họ form (giữ)

| Mã | Tên (trong QT) | Họ form domain | Digital GS |
|----|----------------|----------------|------------|
| `KSNK.QT.07.BM.01` | Bảng kiểm giám sát tuân thủ vệ sinh tay năm thời điểm | **WHO** | có |
| `KSNK.QT.07.BM.02` | Bảng kiểm đánh giá kỹ thuật vệ sinh tay thường quy | **BK** | có |
| `KSNK.QT.07.BM.03` | Bảng kiểm đánh giá kỹ thuật vệ sinh tay ngoại khoa | **BK** | có |
| `KSNK.QT.07.BM.04` | Biểu mẫu tổng hợp tỷ lệ tuân thủ VST và tiêu thụ ABHR | — (OUT) | không — báo cáo |

## 6. OUT-by-tick khỏi seed thực hành lâm sàng (P0-1A)

Seed `supabase/seed.sql` → `gstt_dm_bang_kiem` **chỉ** BK giám sát tuân thủ thực hành (VST/GSC bundles, PTPH, tiêm, môi trường lâm sàng…).  
**Không** seed nhật ký/sổ vận hành, đánh giá hệ thống, CSSD vận hành.

| Tick OUT | Mã short (seed cũ) | Lý do |
|----------|--------------------|-------|
| OUT | `BM.19.02` | Nhật ký MEC — `NHAT_KY_VAN_HANH` |
| OUT | `BM.QĐ.08.01` | Sổ áp suất AIIR — sổ vận hành |
| OUT | `BM.QĐ.17.01` | Nhật ký phòng sạch / BSC |
| OUT | `BM.03.03` | ICRA — `DANH_GIA_HE_THONG` (audit) |
| OUT | `BM.18.02` / `BM.19.01` / `BM.20.02` / `BM.21.04` / `BM.22.04` | CSSD vận hành (làm sạch / KKMĐC / đóng gói / lưu trữ / QC TK) |

**IN-by-tick (giữ seed):** VST `BM.07.02`/`BM.07.03` + gói SSI/CLABSI/CAUTI/VAP + PTPH/tiêm/đường lây/VSMT/CTYT/đồ vải + QĐ khu vực lâm sàng (phòng mổ, Cathlab, PE, labo, bếp, lọc máu…).  
WHO lưới VST = module `/giam-sat-vst` (không row `BM.07.01` trong `gstt_dm_bang_kiem`).

CSSD kho / đề nghị: module CSSD — không seed vào catalog GS thực hành (liên kết: inventory § EXCLUDE nhật ký CSSD).

## 7. Pipeline

```text
1. Inventory filtered (file 12)     ← DONE
2. PO tick «cần PO» còn lại          ← tùy UAT
3. Normalize mã BM ↔ short / gstt_dm
4. Seed thực hành (P0-1A)            ← DONE — 27 BM TUÂN THỦ
```

## 8. Gap / hạn chế

1. Drive folder không có file BM tách riêng — tiêu đề lấy từ mục «BIỂU MẪU» QT/QĐ + extract MD.
2. Chưa đọc lại từng tiêu chí Đạt/KĐ/NA trong docx; conservative → `cần PO` khi mơ hồ.
3. BDNL.* / NVKN.* = VTVL — không vào inventory GS.
4. `canonical-36` lệch thế hệ với mã viện — normalize riêng; seed P0-1A đã cắt 9 BM OUT.

*Hết inventory v1.2 — seed thực hành lâm sàng filtered.*
