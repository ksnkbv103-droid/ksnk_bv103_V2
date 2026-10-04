# Inventory bảng kiểm / phiếu quan sát — seed digital giám sát (filtered)

| Trường | Giá trị |
|--------|---------|
| Mã | `12-BANG-KIEM-inventory-from-KSNK-final` |
| Phiên bản | **v1.2 local 2026-09-22** (Asia/Saigon) — **PO chốt 15 BM digital=có** · **chưa git commit/push** |
| Nguồn Drive | Folder `Quy trình, quy định, mô tả vị trí việc làm KSNK_final` (`10_190H0LJ551hfUFcpcMGvPPZ2ewIfyE`) |
| Cross-check | `/workspace/ipc-updated/QT/*.md` + `QD/*.md` |
| Phạm vi file này | **Chỉ** mẫu bảng kiểm / phiếu quan sát phục vụ **công tác giám sát tuân thủ** (digital GS) — **không** mọi BM trong QT/QĐ |
| Ngoài phạm vi | Không sửa seed `gstt_dm_bang_kiem` · không sửa Word QT/QĐ · không invent BM |
| Liên kết domain | 11-GIAM-SAT-TUAN-THU-domain-analysis-v1.md §L |

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

- BM tên mơ hồ / hybrid sổ+BK / audit quản trị: **PO Nghĩa 2026-09-22 đã chốt** cả 15 → digital = **`có`** (seed `draft_from_qt`); lịch sử `[PO xác nhận]` giữ trong ghi chú cũ nếu còn.

## 2. Bảng IN SCOPE giám sát

| STT | Mã | Tên | QT | Họ form (WHO\|BK) | Đề xuất dùng digital GS | Ghi chú ngắn |
|-----|-----|-----|----|-------------------|-------------------------|--------------|
| 1 | `KSNK.QT.01.BM.03` | Bảng kiểm giám sát tuân thủ quy trình kiểm soát văn bản | QT.01 | BK | có | GS tuân thủ kiểm soát văn bản — quản trị tài liệu · PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
| 2 | `KSNK.QT.02.BM.04` | Bảng kiểm giám sát tuân thủ quy trình đánh giá rủi ro | QT.02 | BK | có | GS tuân thủ đánh giá rủi ro — quản trị · PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
| 3 | `KSNK.QT.03.BM.03` | Bảng kiểm giám sát tuân thủ ICRA | QT.03 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 4 | `KSNK.QT.05.BM.04` | Bảng kiểm giám sát hoạt động Hội đồng Kiểm soát nhiễm khuẩn | QT.05 | BK | có | GS hoạt động Hội đồng — quản trị · PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
| 5 | `KSNK.QT.06.BM.03` | Bảng kiểm giám sát hoạt động của Mạng lưới kiểm soát nhiễm khuẩn | QT.06 | BK | có | GS hoạt động Mạng lưới — quản trị · PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
| 6 | `KSNK.QT.07.BM.01` | Phiếu quan sát VST 5 thời điểm (WHO) | QT.07 | WHO | **không seed BK** | PO 18:15 — **bỏ khỏi họ/picker bảng kiểm**; chỉ module lưới WHO |
| 7 | `KSNK.QT.07.BM.02` | Bảng kiểm đánh giá kỹ thuật vệ sinh tay thường quy | QT.07 | BK | có | Observation checklist kỹ thuật VST TQ — PO chốt INCLUDE |
| 8 | `KSNK.QT.07.BM.03` | Bảng kiểm đánh giá kỹ thuật vệ sinh tay ngoại khoa (có mục riêng bước chà cồn) | QT.07 | BK | có | Observation checklist VST ngoại khoa — PO chốt INCLUDE |
| 9 | `KSNK.QT.08.BM.01` | Bảng kiểm giám sát tuân thủ chỉ định sử dụng PTPH | QT.08 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 10 | `KSNK.QT.08.BM.02` | Bảng kiểm đánh giá kỹ thuật mặc và cởi PTPH (quan sát doffing) | QT.08 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 11 | `KSNK.QT.09.BM.01` | Bảng kiểm giám sát thực hành tiêm an toàn | QT.09 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 12 | `KSNK.QT.10.BM.04` | Bảng kiểm giám sát tuân thủ hệ thống xử lý phơi nhiễm | QT.10 | BK | có | Bảng kiểm giám sát / quan sát / đánh giá thực hành — INCLUDE |
| 13 | `KSNK.QT.11.BM.01` | Phiếu phân công và bảng kiểm công việc vệ sinh | QT.11 | BK | có | Hybrid phiếu phân công + bảng kiểm công việc — PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
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
| 27 | `KSNK.QT.21.BM.01` | Bảng kiểm vận hành TK + **sổ IUSS** | QT.21 | BK | có | Hybrid BK vận hành TK + sổ IUSS — PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt GS vs nhật ký CSSD |
| 28 | `KSNK.QT.22.BM.04` | Bảng kiểm lưu trữ–cấp phát (có mục hết hạn tại khoa) | QT.22 | BK | có | BK lưu trữ–cấp phát — có thể vận hành CSSD · PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
| 29 | `KSNK.QT.23.BM.04` | Bảng kiểm QC | QT.23 | BK | có | BK QC CSSD — QC vận hành vs GS tuân thủ · PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
| 30 | `KSNK.QT.24.BM.03` | Bảng kiểm xử lý sự cố | QT.24 | BK | có | BK xử lý sự cố — PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt có phải quan sát tuân thủ |
| 31 | `KSNK.QT.25.BM.01` | Bảng kiểm KKMĐC | QT.25 | BK | có | BK KKMĐC — PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt quan sát quy trình vs nhật ký |
| 32 | `KSNK.QT.26.BM.02` | Bảng kiểm KKMĐC PTNS (có mục «không ngâm PM») | QT.26 | BK | có | BK KKMĐC PTNS — PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
| 33 | `KSNK.QT.27.BM.03` | Bảng kiểm PCI.03.01 | QT.27 | BK | có | BK PCI.03.01 — tên mơ hồ · PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
| 34 | `KSNK.QT.28.BM.02` | Bảng kiểm loaner | QT.28 | BK | có | BK loaner — có thể vận hành mượn dụng cụ · PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
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
| 46 | `KSNK.QĐ.01.BM.01` | Bảng kiểm đánh giá mức độ thiết lập và vận hành Hệ thống KSNK | QĐ.01 | BK | có | Đánh giá thiết lập/vận hành hệ thống KSNK — audit hệ thống · PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
| 47 | `KSNK.QĐ.02.BM.01` | Bảng kiểm đánh giá hoạt động bảo đảm an toàn nghề nghiệp | QĐ.02 | BK | có | Đánh giá hoạt động an toàn nghề nghiệp — audit · PO Nghĩa 2026-09-22 chốt IN SCOPE digital=có · seed draft_from_qt |
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

**Tổng IN SCOPE:** 66 (WHO **1** · BK **65**) — trong đó digital=`có` **66** · `cần PO` **0** · `không` **0** (PO Nghĩa 2026-09-22 chốt 15).

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
| — digital GS = có | 66 |
| — digital GS = cần PO | 0 |
| — digital GS = không | 0 |
| **EXCLUDE (out of seed GS)** | **69** |

## 5. QT.07 — làm rõ họ form (giữ)

| Mã | Tên (trong QT) | Họ form domain | Digital GS |
|----|----------------|----------------|------------|
| `KSNK.QT.07.BM.01` | Bảng kiểm giám sát tuân thủ vệ sinh tay năm thời điểm | **WHO** | có |
| `KSNK.QT.07.BM.02` | Bảng kiểm đánh giá kỹ thuật vệ sinh tay thường quy | **BK** | có |
| `KSNK.QT.07.BM.03` | Bảng kiểm đánh giá kỹ thuật vệ sinh tay ngoại khoa | **BK** | có |
| `KSNK.QT.07.BM.04` | Biểu mẫu tổng hợp tỷ lệ tuân thủ VST và tiêu thụ ABHR | — (OUT) | không — báo cáo |

## 6. Pipeline (không đổi — seed vẫn sau)

```text
1. Inventory filtered (file 12 v1.1)  ← DONE local
2. ~~PO tick các dòng «cần PO»~~ → **đã chốt 2026-09-22**
3. Normalize mã BM ↔ short / gstt_dm
4. Seed / migration                  ← OUT OF SCOPE lần này
```

## 7. Gap / hạn chế

1. Drive folder không có file BM tách riêng — tiêu đề lấy từ mục «BIỂU MẪU» QT/QĐ + extract MD.
2. Đã trích tiêu chí từ Drive phụ lục BM / ipc-updated QĐ cho cả 15 (seed `draft_from_qt`); QT.11.BM.01 map hạng mục lưới ngày → tieu_chi.
3. BDNL.* / NVKN.* = VTVL — không vào inventory GS.
4. `canonical-36` lệch thế hệ với mã viện — normalize riêng.

*Hết inventory v1.1 local 2026-09-22 (Asia/Saigon) — filtered subset giám sát. Working tree docs only — không git commit/push.*

---

## PO hỏi đáp 2026-09-22 (18:15) — 15 «cần PO» · QT.07.BM.01 · gộp thống kê

> **PO Nghĩa 2026-09-22 chốt:** cả 15 BM dưới đây → digital=`có`, seed `tieu_chi` filled (`draft_from_qt`). Bảng lịch sử giữ để truy vết lý do từng bị `cần PO`.


### 1. Mười lăm BM — **đã chốt digital=`có`** (lịch sử lý do từng bị `cần PO`)

| # | Mã | Tên ngắn | Vì sao còn mở |
|---|-----|----------|----------------|
| 1 | `KSNK.QT.01.BM.03` | GS tuân thủ kiểm soát văn bản | Quản trị tài liệu — GS thực hành lâm sàng? |
| 2 | `KSNK.QT.02.BM.04` | GS tuân thủ đánh giá rủi ro | Quản trị rủi ro |
| 3 | `KSNK.QT.05.BM.04` | GS hoạt động Hội đồng KSNK | Audit tổ chức |
| 4 | `KSNK.QT.06.BM.03` | GS hoạt động Mạng lưới KSNK | Audit tổ chức |
| 5 | `KSNK.QT.11.BM.01` | Phiếu phân công + BK công việc vệ sinh | Hybrid phân công / BK |
| 6 | `KSNK.QT.21.BM.01` | BK vận hành TK + sổ IUSS | Hybrid CSSD / sổ |
| 7 | `KSNK.QT.22.BM.04` | BK lưu trữ–cấp phát | Vận hành CSSD vs GS |
| 8 | `KSNK.QT.23.BM.04` | BK QC | QC vận hành vs GS tuân thủ |
| 9 | `KSNK.QT.24.BM.03` | BK xử lý sự cố | Sự cố vận hành vs quan sát tuân thủ |
| 10 | `KSNK.QT.25.BM.01` | BK KKMĐC | Nhật ký vs quan sát |
| 11 | `KSNK.QT.26.BM.02` | BK KKMĐC PTNS | Như trên |
| 12 | `KSNK.QT.27.BM.03` | BK PCI.03.01 | Tên mơ hồ |
| 13 | `KSNK.QT.28.BM.02` | BK loaner | Vận hành mượn dụng cụ? |
| 14 | `KSNK.QĐ.01.BM.01` | Đánh giá thiết lập hệ thống KSNK | Audit hệ thống |
| 15 | `KSNK.QĐ.02.BM.01` | Đánh giá an toàn nghề nghiệp | Audit ATVSLĐ |

### 2. QT.07 — bỏ BM.01 khỏi họ bảng kiểm / seed GSC

**PO:** Quy trình vệ sinh tay — **bỏ biểu mẫu 01** khỏi danh sách bảng kiểm vì đã nằm trong **lưới WHO** (module VST thường quy đã triển khai).

| Mã | Vai trò domain | Catalog / form phần mềm |
|----|----------------|-------------------------|
| `QT.07.BM.01` | **Họ WHO lưới** — 5 thời điểm | **Chỉ** `/giam-sat-vst` — **không** nằm trong picker bảng kiểm GSC |
| `QT.07.BM.02` | BK đánh giá **kỹ thuật** VST thường quy | Họ bảng kiểm (cùng GSC) |
| `QT.07.BM.03` | BK **VST ngoại khoa** | Họ bảng kiểm (cùng GSC) |
| `QT.07.BM.04` (nếu có) | Thường là tổng hợp/báo cáo — xem lại OUT | Không seed GS nếu là sổ/báo cáo |

**Tách hay gộp mẫu 01 với các bảng kiểm?**  
→ **Tách hẳn về engine + màn hình** (giữ như hiện tại: form cột tích riêng).  
→ **Không** gộp BM.01 vào danh mục `gstt_dm_bang_kiem` / không tính `ty_le_gsc` từ BM.01.  
→ Trên báo cáo chuyên đề «Vệ sinh tay» có thể **đặt cạnh nhau** (xem mục 3) — đó là gộp *hiển thị báo cáo*, không gộp *công thức %*.

### 3. Thống kê: gộp theo chuyên đề hay để nguyên?

**Khuyến nghị domain (chuẩn mực + tiện điều hành):**

1. **Giữ hai engine chỉ số như hiện tại (không trộn mẫu số):**  
   - VST thường quy (WHO): `% = đạt / cơ hội` — lens TGS|KSNK  
   - Bảng kiểm (mọi BK gồm BM.02/03): `% = đạt / tiêu chí áp dụng` — lens TGS|KSNK  

2. **Thêm lớp chuyên đề trên catalog BK** (metadata `chuyen_de`, ví dụ: Vệ sinh tay · PTPH · Môi trường · Đồ vải · CSSD · Phòng ngừa SSI · …) để lọc / gộp báo cáo GSC cho dễ đọc — **không** thay `loai_giam_sat` hiện có (`TUAN_THU` / nhật ký / hệ thống).

3. **Báo cáo chuyên đề «Vệ sinh tay» (ví dụ):**  
   - Khối A: tuân thủ 5 thời điểm (từ module WHO)  
   - Khối B: kỹ thuật VST TQ (BM.02) + ngoại khoa (BM.03) từ họ BK  
   Ba chỉ số **cạnh nhau**, cùng kỳ / cùng lens — **không** trung bình cộng thành một «% VST tổng».

4. **Không** «để nguyên» theo nghĩa trộn BM.01 vào BK; **có** giữ nguyên tách form WHO vs BK như đã triển khai; **có** bổ sung tag chuyên đề để thống kê BK dễ hơn.

