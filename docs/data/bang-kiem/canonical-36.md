# Danh mục bảng kiểm chuẩn — Giám sát tuân thủ KSNK (4 phần)

> **Nguồn trích xuất:** `docs/data/bang-kiem/raw-forms-full.md` (thân form, dòng 5–2706).
> **Tạo tự động:** 2026-05-29 — `node scripts/extract-bang-kiem-chuan.mjs`
> **Số mẫu:** 36 bảng kiểm (bỏ 1 bản trùng SUDs trong file nguồn).
> **Quy ước (v2):** Metadata YAML chứa `nguyen_nhan[]` + `act_mac_dinh`; Phần 3–4 in **nhãn ngắn** (không lặp mã `[101-SYS]`/`[ACT-xxx]` trong thân). Phần 2 bảng tiêu chí **một cột** — Đạt/Không/NA do app xử lý.

**Quy ước Phần 4:** Nhiều đầu mục can thiệp / bảng kiểm, mỗi dòng gắn **một mã ACT** (đầu mục ngắn, không mô tả dài).

## Ánh xạ Phần 1 ↔ Database (phiên `gstt_fact_chung_sessions`)

| Trường trên form mẫu | Cột / nguồn app | Ghi chú |
| --- | --- | --- |
| Ngày giám sát | `ngay_giam_sat` | Bắt buộc |
| Khoa/Phòng/Khu vực | `khoa_id`, `khu_vuc_id` | `GiamSatHeader` |
| Người giám sát | `nguoi_giam_sat_id` | NVYT KSNK |
| Đối tượng / Họ tên NVYT | `nghe_nghiep_id`, `nhan_vien_id`, `ten_manual_nhan_vien` | `doi_tuong_giam_sat=NHAN_VIEN` |
| Thông tin người bệnh | `ma_nguoi_benh`, `ten_nguoi_benh`, `so_giuong_nguoi_benh` | Khi `doi_tuong_giam_sat=NGUOI_BENH` |
| Hình thức / Cách thức GS | `hinh_thuc_id`, `cach_thuc_id` | Lookup `HINH_THUC_GIAM_SAT`, `CACH_THUC_GIAM_SAT` |
| Phần 2 tiêu chí | `results_jsonb` | `tieu_chi_jsonb` trên `gstt_dm_bang_kiem` |
| Phần 3 nguyên nhân | `phieu_phan_tich_jsonb.nguyen_nhan_loi_ids` | Allowlist `nguyen_nhan_cho_phep_jsonb` |
| Phần 4 hành động | `phieu_phan_tich_jsonb.hanh_dong_khac_phuc` | Nhiều đầu mục từ `hanh_dong_khac_phuc_jsonb` (mỗi dòng 1 ACT) |
| Metadata bảng kiểm | `bang_kiem_id` → `phan_loai_chuyen_mon`, `loai_giam_sat`, `doi_tuong_giam_sat`, `cach_tinh_diem` | Slice form động theo DB |

## Danh mục mã hành động khắc phục (ACT)

> Thứ tự hiển thị **ACT-100 → ACT-500**. YAML `hanh_dong_items[]` — mỗi phần tử `{ code, headline }`.

| Mã | Tên chuẩn (ngắn) |
| --- | --- |
| **ACT-100** | Nhắc nhở / hướng dẫn lại tại chỗ |
| **ACT-200** | Yêu cầu khắc phục ngay tại chỗ |
| **ACT-300** | Ghi nhận thiếu vật tư — đề xuất bổ sung |
| **ACT-400** | Đình chỉ hoạt động (Stop the line) |
| **ACT-500** | Lập biên bản / báo cáo sự cố |

## Mục lục

| STT | Mã | Tên (trong form) | Dòng nguồn |
| --- | --- | --- | --- |
| 1 | [BM.03.03](#BM0303) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ ICRA (KIỂM SOÁT NHIỄM KHUẨN TRONG XÂY DỰNG) | 5-69 |
| 2 | [BM.07.02](#BM0702) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ KỸ THUẬT VỆ SINH TAY THƯỜNG QUY | 77-140 |
| 3 | [BM.07.03](#BM0703) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ KỸ THUẬT VỆ SINH TAY NGOẠI KHOA | 148-212 |
| 4 | [BM.08.01](#BM0801) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ SỬ DỤNG PHƯƠNG TIỆN PHÒNG HỘ CÁ NHÂN (PPE) | 220-288 |
| 5 | [BM.09.01](#BM0901) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ THỰC HÀNH TIÊM AN TOÀN VÀ QUẢN LÝ VẬT SẮC NHỌN | 296-369 |
| 6 | [BM.10.01](#BM1001) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH XỬ LÝ PHƠI NHIỄM NGHỀ NGHIỆP | 377-446 |
| 7 | [BM.14.01](#BM1401) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ PHÒNG NGỪA DỰA TRÊN ĐƯỜNG LÂY TRUYỀN | 454-522 |
| 8 | [BM.31.03](#BM3103) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ PHÒNG NGỪA VI KHUẨN ĐA KHÁNG (MDROs) | 530-596 |
| 9 | [BM.17.01](#BM1701) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ ỨNG PHÓ BỆNH TRUYỀN NHIỄM TỐI NGUY HIỂM (COVID-19/EBOLA) | 604-674 |
| 10 | [BM.15.01](#BM1501) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH VẬN CHUYỂN NGƯỜI BỆNH NỘI VIỆN | 682-748 |
| 11 | [BM.16.01](#BM1601) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TRONG QUẢN LÝ VÀ XỬ LÝ TỬ THI | 756-823 |
| 12 | [BM.18.02](#BM1802) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH LÀM SẠCH DỤNG CỤ TÁI SỬ DỤNG | 831-898 |
| 13 | [BM.19.01](#BM1901) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH KHỬ KHUẨN MỨC ĐỘ CAO | 906-978 |
| 14 | [BM.19.02](#BM1902) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ KIỂM TRA VÀ BẢO DƯỠNG DỤNG CỤ PHẪU THUẬT | 986-1047 |
| 15 | [BM.20.02](#BM2002) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH ĐÓNG GÓI DỤNG CỤ | 1055-1118 |
| 16 | [BM.22.04](#BM2204) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ VẬN HÀNH VÀ KIỂM SOÁT CHẤT LƯỢNG TIỆT KHUẨN | 1126-1194 |
| 17 | [BM.QĐ.19.03](#BMQD1903) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUẢN LÝ DỤNG CỤ DÙNG MỘT LẦN (SUDs) VÀ VẬT TƯ HỎNG/HẾT HẠN | 1202-1264 |
| 18 | [BM.21.04](#BM2104) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ LƯU TRỮ VÀ CẤP PHÁT DỤNG CỤ VÔ KHUẨN | 1272-1337 |
| 19 | [BM.25.01](#BM2501) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI AN TOÀN ĐẶT ĐƯỜNG TRUYỀN TĨNH MẠCH TRUNG TÂM (INSERTION BUNDLE - CLABSI) | 1415-1472 |
| 20 | [BM.25.03](#BM2503) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI CHĂM SÓC VÀ DUY TRÌ ĐƯỜNG TRUYỀN (MAINTENANCE BUNDLE) | 1480-1544 |
| 21 | [BM.27.01](#BM2701) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI AN TOÀN ĐẶT ỐNG THÔNG TIỂU (INSERTION BUNDLE - CAUTI) | 1552-1612 |
| 22 | [BM.27.02](#BM2702) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI CHĂM SÓC VÀ DUY TRÌ ỐNG THÔNG TIỂU (MAINTENANCE BUNDLE - CAUTI) | 1620-1687 |
| 23 | [BM.26.01](#BM2601) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI PHÒNG NGỪA VIÊM PHỔI THỞ MÁY (VAP BUNDLE) | 1695-1760 |
| 24 | [BM.24.02](#BM2402) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI PHÒNG NGỪA NHIỄM KHUẨN VẾT MỔ (SSI BUNDLE) | 1768-1839 |
| 25 | [BM.11.01](#BM1101) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ VỆ SINH MÔI TRƯỜNG BỀ MẶT | 1847-1911 |
| 26 | [BM.QĐ.12.01](#BMQD1201) | BẢNG KIỂM GIÁM SÁT VỆ SINH VÀ KHỬ KHUẨN LỒNG ẤP/GIƯỜNG SƯỞI SƠ SINH | 1919-1984 |
| 27 | [BM.QĐ.20.01](#BMQD2001) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ KIỂM SOÁT CHẤT LƯỢNG NƯỚC (LỌC MÁU VÀ NHA KHOA) | 1992-2053 |
| 28 | [BM.13.01](#BM1301) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUẢN LÝ VÀ GIẶT LÀ ĐỒ VẢI Y TẾ | 2061-2126 |
| 29 | [BM.12.01](#BM1201) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUẢN LÝ CHẤT THẢI Y TẾ | 2134-2205 |
| 30 | [BM.QĐ.08.01](#BMQD0801) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ THEO DÕI ÁP SUẤT PHÒNG CÁCH LY ÁP LỰC ÂM (AIIR) | 2213-2276 |
| 31 | [BM.QĐ.02.01](#BMQD0201) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TẠI KHU VỰC PHẪU THUẬT / PHÒNG MỔ | 2284-2352 |
| 32 | [BM.QĐ.03.01](#BMQD0301) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TẠI KHU VỰC CAN THIỆP MẠCH (CATHLAB) | 2360-2426 |
| 33 | [BM.QĐ.09.01](#BMQD0901) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ MÔI TRƯỜNG BẢO VỆ (PE) | 2434-2497 |
| 34 | [BM.QĐ.17.01](#BMQD1701) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ KIỂM SOÁT NHIỄM KHUẨN KHU VỰC PHA CHẾ THUỐC VÔ KHUẨN | 2505-2565 |
| 35 | [BM.QĐ.16.01](#BMQD1601) | BẢNG KIỂM GIÁM SÁT TUÂN THỦ AN TOÀN SINH HỌC TẠI KHOA XÉT NGHIỆM | 2573-2635 |
| 36 | [BM.QĐ.18.02](#BMQD1802) | BẢNG KIỂM GIÁM SÁT VỆ SINH AN TOÀN THỰC PHẨM VÀ BẾP ĂN | 2643-2705 |

### Bản lặp đã bỏ qua (chỉ có trong file nguồn)
- **BM.QĐ.19.03** — dòng 1345-1414: Trùng mã với bản trước trong file nguồn (SUDs)

---

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.03.03
stt: 1
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ ICRA (KIỂM SOÁT NHIỄM KHUẨN TRONG XÂY DỰNG)"
ten_catalog: "Bảng kiểm giám sát tuân thủ ICRA (Xây dựng)"
domain: "Môi trường & Hạ tầng (EVS & Facility)"
jci_mapped: "FMS.08.04, PCI.02.00"
dong_nguon: "5-69"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 104_SYS, 106_SYS, 201_HUM, 203_HUM, 205_HUM]
hanh_dong_items:
  - { code: ACT-200, headline: "Yêu cầu nhà thầu dán niêm phong lại ngay lập…" }
  - { code: ACT-200, headline: "Yêu cầu thay ngay thảm dính bụi mới tại lối…" }
  - { code: ACT-200, headline: "Yêu cầu nhà thầu dùng khăn ẩm hoặc máy hút…" }
  - { code: ACT-200, headline: "Mời ngay công nhân ra khỏi khu vực thi công…" }
  - { code: ACT-400, headline: "Đình chỉ thi công ngay lập tức" }
```

## BM.03.03

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ ICRA (KIỂM SOÁT NHIỄM KHUẨN TRONG XÂY DỰNG)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:......  
* **Dự án/Công việc thi công:** ....................................................................................  
* **Vị trí thi công:** ....................................................................................  
* **Người giám sát (KSNK):** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Nhà thầu/Đơn vị thi công | \[ \] Đơn vị Kỹ thuật bệnh viện  
* **Họ tên chỉ huy công trình/Người đại diện:** ....................................................................................  
* **Cấp độ ICRA áp dụng:** \[ \] Cấp I | \[ \] Cấp II | \[ \] Cấp III | \[ \] Cấp IV  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Khu vực thi công giáp ranh Phòng mổ, ICU sạch, buồng pha chế thuốc vô khuẩn...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực thi công có nguy cơ phát tán lượng lớn bụi, bào tử nấm (Aspergillus) sang các khoa phòng lâm sàng đang có người bệnh.  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Rào chắn và Cách ly |
| 1. Rào chắn (mềm/cứng) được duy trì nguyên vẹn, kín hoàn toàn từ sàn đến trần? |
| 2. Các khe hở, cửa ra vào, lỗ thông gió, đường ống đã được băng keo/niêm phong kín? |
| 3. *(Cấp IV)* Phòng đệm (Airlock) được thiết lập, duy trì và sử dụng đúng quy cách? |
| B. Áp lực không khí và Hệ thống thông khí |
| 4. *(Cấp III, IV)* Máy lọc không khí HEPA di động được bố trí và đang hoạt động tốt? |
| 5. Áp lực âm bên trong vùng can thiệp được duy trì (kiểm tra bằng đồng hồ đo hoặc test khói trực quan)? |
| 6. Khí thải công trình được dẫn an toàn ra môi trường bên ngoài, không thổi ngược vào bệnh viện? |
| C. Kiểm soát Lối ra vào và Môi trường |
| 7. Có biển cảnh báo "KHU VỰC THI CÔNG \- KHÔNG PHẬN SỰ MIỄN VÀO" rõ ràng? |
| 8. Thảm dính bụi được đặt tại lối ra vào và được thay mới ngay khi bẩn/hết độ dính? |
| 9. Không phát hiện bụi bẩn, mảnh vỡ thoát ra khu vực chăm sóc người bệnh lân cận? |
| D. Kiểm soát Chất thải và Tuân thủ của Công nhân |
| 10. Chất thải, rác thải rắn xây dựng được che phủ kín (bạt/nilon) khi vận chuyển ra ngoài? |
| 11. Công nhân thi công mang đúng phương tiện bảo hộ lao động quy định? |
| 12. Tuyệt đối KHÔNG ăn uống, hút thuốc bên trong vùng can thiệp thi công? |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Lỗi thiết bị / hỏng hóc
* Giao tiếp / bàn giao kém

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Hành vi liều lĩnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Yêu cầu nhà thầu dán niêm phong lại ngay lập…
* **ACT-200** — Yêu cầu thay ngay thảm dính bụi mới tại lối…
* **ACT-200** — Yêu cầu nhà thầu dùng khăn ẩm hoặc máy hút…
* **ACT-200** — Mời ngay công nhân ra khỏi khu vực thi công…
* **ACT-400** — Đình chỉ thi công ngay lập tức

**Chữ ký Người giám sát (KSNK):** ....................................... **Chữ ký Đại diện Nhà thầu / Thi công:** .......................................

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.07.02
stt: 2
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KỸ THUẬT VỆ SINH TAY THƯỜNG QUY"
ten_catalog: "Bảng kiểm đánh giá kỹ thuật Vệ sinh tay thường quy"
domain: "Thực hành chuẩn (Routine Compliance)"
jci_mapped: "IPSG.05.00, PCI.07.01"
dong_nguon: "77-140"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [201_HUM, 203_HUM, 204_HUM, 207_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở và hướng dẫn lại tại chỗ (Coaching)…" }
  - { code: ACT-100, headline: "Hướng dẫn lại kỹ thuật lau khô tay và dùng…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên y tế tháo bỏ ngay lập tức…" }
  - { code: ACT-200, headline: "Yêu cầu thực hiện lại thao tác vệ sinh tay…" }
  - { code: ACT-200, headline: "Ghi nhận tình trạng viêm da cơ địa (nếu có)…" }
```

## BM.07.02

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ KỸ THUẬT VỆ SINH TAY THƯỜNG QUY**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ | \[ \] Điều dưỡng/KTV | \[ \] Hộ lý/NVVS | \[ \] Học viên/Sinh viên  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Phương pháp vệ sinh tay:** \[ \] Dung dịch chứa cồn | \[ \] Xà phòng và Nước sạch  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực Cấp cứu, Hồi sức tích cực, Lọc máu, Phòng cách ly bệnh truyền nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Giai đoạn Chuẩn bị |
| 1. Tháo bỏ toàn bộ trang sức (nhẫn, đồng hồ, vòng) ở bàn tay và cẳng tay. |
| 2. Móng tay cắt ngắn, sạch, không sơn móng, không dùng móng tay giả. |
| 3. Lấy đủ lượng hóa chất sát khuẩn hoặc xà phòng (khoảng 3-5ml). |
| B. Giai đoạn Thực hiện (Kỹ thuật chà tay 6 bước chuẩn WHO) |
| 4. Bước 1: Chà 2 lòng bàn tay vào nhau. |
| 5. Bước 2: Chà lòng bàn tay này lên mu bàn tay kia và miết các kẽ ngón tay (và ngược lại). |
| 6. Bước 3: Chà 2 lòng bàn tay vào nhau, miết mạnh các kẽ ngón tay. |
| 7. Bước 4: Chà mặt ngoài các ngón tay (khum tay) vào lòng bàn tay kia (và ngược lại). |
| 8. Bước 5: Xoay ngón tay cái của tay này vào lòng bàn tay kia (và ngược lại). |
| 9. Bước 6: Chụm 5 đầu ngón tay này xoay vào lòng bàn tay kia (và ngược lại). |
| C. Giai đoạn Kết thúc và Thời gian |
| 10. Đảm bảo đủ thời gian chà tay (20 \- 30 giây với cồn; 40 \- 60 giây với xà phòng). |
| 11. *Chỉ áp dụng với cồn:* Chà cho đến khi tay khô hoàn toàn tự nhiên (Tuyệt đối không dùng giấy/khăn lau lại). |
| 12. *Chỉ áp dụng với xà phòng:* Xả sạch dưới vòi nước (giữ tay xuôi) và lau khô tay bằng khăn/giấy sạch dùng 1 lần. |
| 13. *Chỉ áp dụng với xà phòng:* Dùng chính khăn/giấy vừa lau tay để khóa vòi nước (tránh tái nhiễm bẩn). |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Sức khỏe nghề nghiệp

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở và hướng dẫn lại tại chỗ (Coaching)…
* **ACT-100** — Hướng dẫn lại kỹ thuật lau khô tay và dùng…
* **ACT-200** — Yêu cầu nhân viên y tế tháo bỏ ngay lập tức…
* **ACT-200** — Yêu cầu thực hiện lại thao tác vệ sinh tay…
* **ACT-200** — Ghi nhận tình trạng viêm da cơ địa (nếu có)…

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.07.03
stt: 3
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KỸ THUẬT VỆ SINH TAY NGOẠI KHOA"
ten_catalog: "Bảng kiểm đánh giá kỹ thuật Vệ sinh tay ngoại khoa"
domain: "Thực hành chuẩn (Routine Compliance)"
jci_mapped: "IPSG.05.00, PCI.07.01"
dong_nguon: "148-212"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [201_HUM, 203_HUM, 204_HUM, 207_HUM, 301_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở và chấn chỉnh ngay tư thế (yêu cầu…" }
  - { code: ACT-100, headline: "Hướng dẫn lại tại chỗ (Coaching) kỹ thuật sử…" }
  - { code: ACT-200, headline: "Yêu cầu tháo bỏ ngay nhẫn" }
  - { code: ACT-200, headline: "Yêu cầu NVYT chờ cồn sát khuẩn bay hơi" }
  - { code: ACT-400, headline: "Đình chỉ thao tác mang găng/mặc áo vô khuẩn" }
```

## BM.07.03

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ KỸ THUẬT VỆ SINH TAY NGOẠI KHOA**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Phẫu thuật viên | \[ \] Bác sĩ phụ mổ | \[ \] Điều dưỡng dụng cụ | \[ \] Học viên  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh (Ca phẫu thuật):** ....................................................................................  
* **Phương pháp áp dụng:** \[ \] Rửa tay (Xà phòng sát khuẩn) | \[ \] Chà tay (Dung dịch chứa cồn)  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[x\] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch... *(Mặc định)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực Cấp cứu, Hồi sức tích cực, Lọc máu, Phòng cách ly bệnh truyền nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Giai đoạn Chuẩn bị |
| 1. Đội mũ trùm kín toàn bộ tóc/tai và đeo khẩu trang che kín mũi miệng TRƯỚC KHI bắt đầu. |
| 2. Tháo bỏ toàn bộ trang sức (nhẫn, đồng hồ, vòng tay) ở bàn tay và cẳng tay. |
| 3. Móng tay cắt ngắn, sạch, không sơn móng, không dùng móng tay giả. |
| 4. Làm sạch kẽ móng tay dưới vòi nước chảy (sử dụng dụng cụ làm sạch móng chuyên dụng cho ca đầu tiên). |
| B. Kỹ thuật Rửa tay bằng Xà phòng sát khuẩn (Scrub) |
| 5. Lấy đủ lượng xà phòng sát khuẩn (VD: Chlorhexidine 4%, Povidone-Iodine 7.5%) và chà bàn tay theo 6 bước. |
| 6. Chà cẳng tay theo chuyển động xoay tròn, từ cổ tay di chuyển dần lên đến 2-5cm trên khuỷu tay. |
| 7. Tư thế an toàn: Luôn giữ bàn tay cao hơn khuỷu tay và cách xa quần áo trong suốt quá trình. |
| 8. Xả sạch xà phòng dưới vòi nước chảy theo một chiều: Từ đầu ngón tay trôi xuống khuỷu tay. |
| 9. Lau khô tay bằng khăn vô khuẩn: Lau từ đầu ngón tay xuống khuỷu tay (không lau ngược lại), dùng các mặt khăn khác nhau cho mỗi tay. Đảm bảo thời gian 3-5 phút. |
| C. Kỹ thuật Chà tay bằng Dung dịch cồn ngoại khoa (Rub) |
| 10. Rửa tay bằng xà phòng thường và lau khô hoàn toàn trước khi chà cồn (bắt buộc trước ca đầu tiên hoặc tay có vết bẩn/bột talc). |
| 11. Lấy đủ lượng dung dịch cồn ngoại khoa (3-5ml). Nhúng 5 đầu ngón tay ngập trong cồn. |
| 12. Chà cồn lên toàn bộ cẳng tay đến khuỷu tay (cho cả hai tay). |
| 13. Lấy thêm cồn, chà bàn tay theo 6 bước thường quy. Đảm bảo tổng thời gian tiếp xúc 1.5 \- 3 phút. |
| 14. Bắt buộc: Để tay khô tự nhiên hoàn toàn trước khi mặc áo choàng và mang găng vô khuẩn (Tuyệt đối không dùng khăn lau). |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Sức khỏe nghề nghiệp

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở và chấn chỉnh ngay tư thế (yêu cầu…
* **ACT-100** — Hướng dẫn lại tại chỗ (Coaching) kỹ thuật sử…
* **ACT-200** — Yêu cầu tháo bỏ ngay nhẫn
* **ACT-200** — Yêu cầu NVYT chờ cồn sát khuẩn bay hơi
* **ACT-400** — Đình chỉ thao tác mang găng/mặc áo vô khuẩn

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.08.01
stt: 4
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ SỬ DỤNG PHƯƠNG TIỆN PHÒNG HỘ CÁ NHÂN (PPE)"
ten_catalog: "Bảng kiểm giám sát tuân thủ sử dụng phương tiện phòng hộ cá nhân (PPE)"
domain: "Thực hành chuẩn (Routine Compliance)"
jci_mapped: "PCI.07.01"
dong_nguon: "220-288"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 105_SYS, 201_HUM, 202_HUM, 203_HUM, 204_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Hướng dẫn lại tại chỗ (Coaching) kỹ thuật…" }
  - { code: ACT-200, headline: "Cảnh báo và yêu cầu NVYT tháo găng tay" }
  - { code: ACT-200, headline: "Yêu cầu NVYT thay ngay PPE mới và vệ sinh…" }
  - { code: ACT-200, headline: "Đặt/Bổ sung thùng rác lây nhiễm (màu Vàng)…" }
  - { code: ACT-300, headline: "Báo cáo Điều dưỡng trưởng / Bộ phận hậu cần…" }
```

## BM.08.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ SỬ DỤNG PHƯƠNG TIỆN PHÒNG HỘ CÁ NHÂN (PPE)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ | \[ \] Điều dưỡng/KTV | \[ \] Hộ lý/NVVS | \[ \] Người nhà/Khách thăm  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Tình huống/Thủ thuật (Ghi rõ):** ....................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực Cấp cứu, Hồi sức tích cực, Lọc máu, Phòng cách ly bệnh truyền nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Lựa chọn Phương tiện phòng hộ (Chỉ định) |
| 1. Mang Găng tay khi có dự kiến tiếp xúc máu, dịch cơ thể, chất tiết, da không nguyên vẹn hoặc niêm mạc. |
| 2. Mặc Áo choàng (sạch/vô khuẩn) khi dự kiến có nguy cơ máu, dịch văng bắn vào cơ thể hoặc khi chăm sóc người bệnh lây qua đường tiếp xúc. |
| 3. Đeo Khẩu trang y tế & Kính bảo hộ/Tấm che mặt khi có nguy cơ văng bắn máu, dịch tiết vào niêm mạc (hút đờm, xử lý tràn đổ, phẫu thuật). |
| 4. Đeo Khẩu trang N95 (hoặc tương đương) khi vào phòng người bệnh lây qua đường không khí (Lao, Sởi, COVID-19) hoặc làm thủ thuật tạo khí dung. |
| B. Kỹ thuật Mặc (Donning) |
| 5. Thực hiện Vệ sinh tay ngay trước khi bắt đầu mang PPE. |
| 6. Tuân thủ trình tự mặc: Áo choàng *rightarrow* Khẩu trang *rightarrow* Kính/Tấm che mặt *rightarrow* Găng tay. Kéo cổ găng tay trùm ra BÊN NGOÀI cổ tay áo choàng. |
| 7. *Với N95:* Thực hiện kiểm tra độ kín (Seal-check) đảm bảo ôm khít khuôn mặt trước khi tiếp xúc người bệnh. |
| C. Kỹ thuật Cởi (Doffing) và Thải bỏ |
| 8. Cởi PPE đúng vị trí: Tại vùng đệm hoặc ngay trước khi rời khỏi phòng bệnh (Riêng khẩu trang tháo bên ngoài cửa phòng). |
| 9. Tuân thủ trình tự cởi: Găng tay và Áo choàng *rightarrow* Vệ sinh tay *rightarrow* Kính/Tấm che *rightarrow* Khẩu trang *rightarrow* Vệ sinh tay lần cuối. |
| 10. Kỹ thuật an toàn: Lộn trái găng/áo khi cởi, cuộn mặt bẩn vào trong. Tháo khẩu trang/kính bằng cách cầm dây đeo phía sau. TUYỆT ĐỐI không để mặt ngoài chạm vào da/quần áo bên trong. |
| 11. Bỏ toàn bộ PPE dùng 1 lần ngay vào thùng chất thải lây nhiễm (màu Vàng). |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Nhận thức sai (at-risk)
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Hướng dẫn lại tại chỗ (Coaching) kỹ thuật…
* **ACT-200** — Cảnh báo và yêu cầu NVYT tháo găng tay
* **ACT-200** — Yêu cầu NVYT thay ngay PPE mới và vệ sinh…
* **ACT-200** — Đặt/Bổ sung thùng rác lây nhiễm (màu Vàng)…
* **ACT-300** — Báo cáo Điều dưỡng trưởng / Bộ phận hậu cần…

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.09.01
stt: 5
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ THỰC HÀNH TIÊM AN TOÀN VÀ QUẢN LÝ VẬT SẮC NHỌN"
ten_catalog: "Bảng kiểm giám sát thực hành Tiêm an toàn và Quản lý vật sắc nhọn"
domain: "Thực hành chuẩn (Routine Compliance)"
jci_mapped: "PCI.05.00"
dong_nguon: "296-369"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 205_HUM, 301_CLI, 302_CLI, 304_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "CẢNH BÁO KHẨN CẤP" }
  - { code: ACT-200, headline: "Yêu cầu NVYT thải bỏ ngay vật sắc nhọn đang…" }
  - { code: ACT-200, headline: "Đề xuất thay thế ngay Hộp kháng thủng mới…" }
  - { code: ACT-200, headline: "Yêu cầu NVYT sát khuẩn lại da/nắp lọ và bắt…" }
  - { code: ACT-200, headline: "Kích hoạt khẩn cấp Quy trình Xử lý phơi…" }
```

## BM.09.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ THỰC HÀNH TIÊM AN TOÀN VÀ QUẢN LÝ VẬT SẮC NHỌN**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ | \[ \] Điều dưỡng/KTV | \[ \] Học viên/Sinh viên  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh:** Họ tên:...................................................... PID:...........................  
* **Loại thủ thuật đang quan sát:** \[ \] Tiêm (TM/TB/TDD) | \[ \] Lấy máu xét nghiệm | \[ \] Lập đường truyền | \[ \] Pha thuốc  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, phòng pha chế thuốc vô khuẩn (Khoa Dược), buồng can thiệp.  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khoa Cấp cứu, Hồi sức tích cực (ICU), Lọc máu, Phòng cách ly truyền nhiễm.  
  * \[x\] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng tiêm/thủ thuật ngoại trú.  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên.

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Giai đoạn Chuẩn bị (An toàn cho Người bệnh) |
| 1. Thực hiện vệ sinh tay TRƯỚC KHI chuẩn bị thuốc/dụng cụ. |
| 2. Sát khuẩn nắp lọ thuốc/ống thuốc bằng cồn 70° trước khi rút thuốc. |
| 3. Tuân thủ nguyên tắc "1 Bơm \- 1 Kim \- 1 Lần" (Tuyệt đối không dùng chung). |
| 4. KHÔNG để kim tiêm cắm lưu trên nắp lọ thuốc đa liều. |
| B. Giai đoạn Thực hiện (An toàn cho Người bệnh) |
| 5. Thực hiện vệ sinh tay TRƯỚC KHI tiếp xúc người bệnh / tiến hành tiêm. |
| 6. Mang găng tay y tế (nếu có chỉ định tiếp xúc máu/dịch). |
| 7. Sát khuẩn da vùng tiêm bằng cồn 70° hoặc Cồn-Chlorhexidine (xoắn ốc từ trong ra ngoài). |
| 8. Bắt buộc: CHỜ KHÔ da hoàn toàn tự nhiên trước khi chọc kim. |
| C. Giai đoạn Kết thúc & Quản lý Vật sắc nhọn (An toàn cho NVYT & Cộng đồng) |
| 9. Tuyệt đối KHÔNG đậy nắp kim tiêm bằng 2 tay (sử dụng kỹ thuật "xúc 1 tay" nếu bắt buộc). |
| 10. Tuyệt đối KHÔNG dùng tay tháo rời kim tiêm khỏi bơm tiêm hoặc bẻ cong kim. |
| 11. Thải bỏ kim và bơm tiêm vào Hộp kháng thủng NGAY LẬP TỨC sau khi tiêm. |
| 12. Hộp kháng thủng được đặt đúng vị trí an toàn (trong tầm với, \< 1 sải tay trên xe tiêm). |
| 13. Hộp kháng thủng đang sử dụng KHÔNG bị đầy quá vạch 3/4. |
| 14. Thực hiện vệ sinh tay SAU KHI kết thúc thủ thuật (ngay sau khi tháo găng). |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Hành vi liều lĩnh

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh
* Giải phẫu / bệnh lý đặc thù

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — CẢNH BÁO KHẨN CẤP
* **ACT-200** — Yêu cầu NVYT thải bỏ ngay vật sắc nhọn đang…
* **ACT-200** — Đề xuất thay thế ngay Hộp kháng thủng mới…
* **ACT-200** — Yêu cầu NVYT sát khuẩn lại da/nắp lọ và bắt…
* **ACT-200** — Kích hoạt khẩn cấp Quy trình Xử lý phơi…

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.10.01
stt: 6
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH XỬ LÝ PHƠI NHIỄM NGHỀ NGHIỆP"
ten_catalog: "Biên bản báo cáo tai nạn rủi ro nghề nghiệp (Phơi nhiễm)"
domain: "Thực hành chuẩn (Routine Compliance)"
jci_mapped: "PCI.05.01, SQE.02.01"
dong_nguon: "377-446"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 205_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "Cảnh báo và yêu cầu NVYT dừng ngay mọi thao…" }
  - { code: ACT-200, headline: "Can thiệp lập tức nếu phát hiện NVYT đang…" }
  - { code: ACT-200, headline: "Cung cấp ngay dung dịch NaCl 0.9% để rửa…" }
  - { code: ACT-200, headline: "Hỗ trợ NVYT gọi ngay số điện thoại Hotline…" }
  - { code: ACT-200, headline: "Phân công NVYT khác trong ca trực tiếp tục…" }
  - { code: ACT-500, headline: "Hướng dẫn Điều dưỡng trưởng khoa/NVYT hoàn…" }
```

## BM.10.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH XỬ LÝ PHƠI NHIỄM NGHỀ NGHIỆP**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát (Người bị phơi nhiễm):** \[ \] Bác sĩ | \[ \] Điều dưỡng/KTV | \[ \] Hộ lý/NVVS | \[ \] Học viên  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin nguồn phơi nhiễm:** Mã người bệnh (PID):........................... Xét nghiệm (Nếu có): \[ \] HIV | \[ \] HBV | \[ \] HCV  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, Phòng can thiệp mạch, Phòng pha chế thuốc vô khuẩn.  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khoa Cấp cứu, Hồi sức tích cực, Lọc máu, Phòng cách ly truyền nhiễm, Xử lý rác/đồ vải.  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, Phòng khám, Phòng thủ thuật, Khoa Xét nghiệm.  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính, nhà ăn.

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Sơ cứu ban đầu tại chỗ (Ngay lập tức) |
| 1. Dừng ngay công việc đang làm khi xảy ra sự cố phơi nhiễm. |
| 2. *Đối với tổn thương da:* Rửa ngay vết thương dưới vòi nước sạch đang chảy trong vài phút. |
| 3. CẢNH BÁO: Tuyệt đối KHÔNG nặn, bóp vết thương. |
| 4. *Đối với tổn thương da:* Sát khuẩn lại vết thương bằng cồn 70° hoặc Povidon-Iod. |
| 5. *Đối với văng bắn niêm mạc:* Rửa mắt, mũi bằng nước cất hoặc NaCl 0.9% liên tục 5-10 phút; súc miệng nhiều lần. |
| B. Báo cáo và Đánh giá sự cố |
| 6. Báo cáo ngay cho Điều dưỡng trưởng/Chủ nhiệm khoa hoặc người phụ trách tại ca trực. |
| 7. Liên hệ ngay lập tức (bất kể ngày đêm) với Khoa Truyền nhiễm / Đầu mối KSNK (Hotline) để được hướng dẫn. |
| 8. Lập "Biên bản báo cáo tai nạn rủi ro nghề nghiệp" (BM.10.01) trong vòng 24 giờ. |
| C. Đánh giá nguồn lây và Điều trị dự phòng (PEP) |
| 9. Phối hợp tư vấn và lấy máu nguồn phơi nhiễm (Người bệnh) để xét nghiệm (HIV, HBsAg, Anti-HCV) sau khi NB đồng ý. |
| 10. NVYT bị phơi nhiễm được lấy máu xét nghiệm baseline (T0) (HIV, HBsAg, Anti-HCV, Anti-HBs). |
| 11. Giờ Vàng: Bắt đầu uống thuốc dự phòng phơi nhiễm HIV (ARV) trong 2-6 giờ đầu, tuyệt đối không muộn quá 72 giờ (Nếu có chỉ định). |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Hành vi liều lĩnh

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Cảnh báo và yêu cầu NVYT dừng ngay mọi thao…
* **ACT-200** — Can thiệp lập tức nếu phát hiện NVYT đang…
* **ACT-200** — Cung cấp ngay dung dịch NaCl 0.9% để rửa…
* **ACT-200** — Hỗ trợ NVYT gọi ngay số điện thoại Hotline…
* **ACT-200** — Phân công NVYT khác trong ca trực tiếp tục…
* **ACT-500** — Hướng dẫn Điều dưỡng trưởng khoa/NVYT hoàn…

**Chữ ký Người giám sát:** ....................................... **Chữ ký Người được giám sát:** .......................................

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.14.01
stt: 7
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ PHÒNG NGỪA DỰA TRÊN ĐƯỜNG LÂY TRUYỀN"
ten_catalog: "Bảng kiểm giám sát tuân thủ phòng ngừa dựa trên đường lây truyền"
domain: "Phòng ngừa lây truyền & Dịch bệnh"
jci_mapped: "PCI.07.00"
dong_nguon: "454-522"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Trực tiếp nhắc nhở" }
  - { code: ACT-200, headline: "Yêu cầu NVYT quay lại vùng đệm/ngoài cửa…" }
  - { code: ACT-200, headline: "Chặn ngay lập tức và yêu cầu NVYT tháo bỏ PTPH" }
  - { code: ACT-200, headline: "Yêu cầu dán ngay Biển báo cách ly…" }
  - { code: ACT-200, headline: "Yêu cầu Khoa tiến hành khử khuẩn ngay các…" }
```

## BM.14.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ PHÒNG NGỪA DỰA TRÊN ĐƯỜNG LÂY TRUYỀN**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ...................................................... **Phòng bệnh số:** ...................  
* **Người giám sát:** ......................................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ | \[ \] Điều dưỡng/KTV | \[ \] Hộ lý/NVVS | \[ \] Người nhà/Khách thăm  
* **Loại hình cách ly đang áp dụng:** \[ \] Lây qua Tiếp xúc (Vàng) | \[ \] Lây qua Giọt bắn (Cam) | \[ \] Lây qua Không khí (Xanh)  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch (PE)...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực cách ly bệnh truyền nhiễm, Phòng cách ly áp lực âm (AIIR), Cấp cứu, Hồi sức tích cực...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường có ghép nhóm (cohorting)...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Thiết lập cách ly và Cơ sở vật chất (Áp dụng chung) |
| 1. Bố trí người bệnh: Nằm phòng riêng hoặc ghép nhóm (cohorting) đúng với người có cùng tác nhân gây bệnh. |
| 2. Biển báo cách ly (Màu Vàng/Cam/Xanh) được treo rõ ràng bên ngoài cửa phòng bệnh. |
| 3. Phương tiện phòng hộ (PTPH) và phương tiện vệ sinh tay (VST) được đặt sẵn ngay bên ngoài cửa phòng hoặc vùng đệm. |
| 4. Hồ sơ bệnh án có gắn cảnh báo lây nhiễm để các khoa khác nhận biết khi chuyển khoa. |
| B. Phòng ngừa Lây qua TIẾP XÚC (Biển báo Vàng \- VD: MDROs, *C. difficile*) |
| 5. NVYT vệ sinh tay, mang Găng tay VÀ Áo choàng TRƯỚC KHI vào phòng hoặc tiếp xúc với NB/môi trường xung quanh. |
| 6. Sử dụng dụng cụ y tế dùng riêng cho NB (huyết áp kế, ống nghe). Nếu dùng chung, phải khử khuẩn trước khi dùng cho NB khác. |
| 7. Tháo bỏ PTPH (Găng, áo choàng) ngay TRƯỚC KHI ra khỏi phòng và vệ sinh tay lập tức (Không mặc PTPH ra hành lang). |
| C. Phòng ngừa Lây qua GIỌT BẮN (Biển báo Cam \- VD: Cúm, Não mô cầu) |
| 8. NVYT mang Khẩu trang y tế khi vào phòng hoặc khi làm việc trong phạm vi 1-2 mét quanh NB. |
| 9. Mang thêm kính bảo hộ/tấm che mặt nếu có nguy cơ văng bắn dịch tiết (VD: hút đờm, lấy mẫu dịch tỵ hầu). |
| D. Phòng ngừa Lây qua KHÔNG KHÍ (Biển báo Xanh \- VD: Lao, Sởi, COVID-19) |
| 10. Cửa phòng bệnh (hoặc phòng cách ly áp lực âm AIIR) LUÔN ĐÓNG KÍN trong suốt quá trình chăm sóc. |
| 11. NVYT mang Khẩu trang N95 (hoặc tương đương, đã kiểm tra độ khít \- seal check) TRƯỚC KHI vào phòng bệnh. |
| E. Vận chuyển Người bệnh |
| 12. Hạn chế vận chuyển. Nếu bắt buộc di chuyển, NB (lây qua giọt bắn/không khí) phải mang khẩu trang y tế và thực hiện vệ sinh hô hấp. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Trực tiếp nhắc nhở
* **ACT-200** — Yêu cầu NVYT quay lại vùng đệm/ngoài cửa…
* **ACT-200** — Chặn ngay lập tức và yêu cầu NVYT tháo bỏ PTPH
* **ACT-200** — Yêu cầu dán ngay Biển báo cách ly…
* **ACT-200** — Yêu cầu Khoa tiến hành khử khuẩn ngay các…

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.31.03
stt: 8
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ PHÒNG NGỪA VI KHUẨN ĐA KHÁNG (MDROs)"
ten_catalog: "Bảng kiểm giám sát tuân thủ phòng ngừa vi khuẩn đa kháng (MDROs)"
domain: "Phòng ngừa lây truyền & Dịch bệnh"
jci_mapped: "PCI.02.00, PCI.07.00"
dong_nguon: "530-596"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Giải thích" }
  - { code: ACT-200, headline: "Yêu cầu NVYT lập tức quay lại cửa phòng/vùng…" }
  - { code: ACT-200, headline: "Yêu cầu dán ngay \"Biển báo phòng ngừa lây…" }
  - { code: ACT-300, headline: "Báo cáo Điều dưỡng trưởng / Bộ phận hậu cần…" }
  - { code: ACT-400, headline: "Đình chỉ ngay việc sử dụng ống nghe/nhiệt kế…" }
```

## BM.31.03

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ PHÒNG NGỪA VI KHUẨN ĐA KHÁNG (MDROs)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ...................................................... **Buồng bệnh số:** ...................  
* **Người giám sát:** ......................................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ | \[ \] Điều dưỡng/KTV | \[ \] Hộ lý/NVVS | \[ \] Người nhà/Khách thăm  
* **Thông tin người bệnh (Loại MDROs):** \[ \] MRSA | \[ \] VRE | \[ \] CRE | \[ \] CR-Ab | \[ \] *C. difficile* | \[ \] Khác:...........  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Đơn vị Hồi sức tích cực (ICU), Phòng cách ly, Khu điều trị bệnh nhân truyền nhiễm, Khoa Sơ sinh \[1, 2\].  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường có ghép nhóm (cohorting) NB đa kháng \[1, 2\].  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Nhận diện và Bố trí người bệnh |
| 1. Người bệnh (NB) có MDROs được bố trí nằm phòng riêng hoặc ghép nhóm (cohorting) với NB có cùng loại MDROs [3, 4]. |
| 2. Có biển báo "Phòng ngừa lây qua Tiếp xúc" (Màu vàng) được treo rõ ràng bên ngoài cửa phòng bệnh [3, 4]. |
| 3. Hồ sơ bệnh án hoặc hệ thống phần mềm (HIS) có gắn cờ cảnh báo (Flagging/Đánh dấu) tình trạng MDROs để các khoa khác nhận biết khi chuyển khoa [3, 4]. |
| B. Tuân thủ Phương tiện phòng hộ (PTPH) và Vệ sinh tay |
| 4. PTPH (Áo choàng, găng tay) và dung dịch Vệ sinh tay (VST) được đặt sẵn ngay tại vùng đệm hoặc bên ngoài cửa phòng [3, 4]. |
| 5. Nhân viên y tế (NVYT) mang Găng tay VÀ Áo choàng sạch TRƯỚC KHI vào phòng hoặc tiếp xúc với NB/môi trường xung quanh NB [3, 4]. |
| 6. NVYT tháo bỏ găng tay và áo choàng NGAY TRƯỚC KHI rời khỏi phòng bệnh (tuyệt đối không mặc PTPH ra ngoài hành lang) [3, 4]. |
| 7. Thực hiện Vệ sinh tay ngay lập tức sau khi tháo PTPH [3, 4]. *(Lưu ý: Bắt buộc rửa tay bằng xà phòng và nước nếu NB nhiễm nha bào C. difficile)* [5, 6]. |
| C. Quản lý Dụng cụ, Môi trường và Vận chuyển |
| 8. Sử dụng các dụng cụ y tế thông thường (ống nghe, nhiệt kế, máy đo huyết áp...) DÙNG RIÊNG cho NB hoặc lưu giữ trong phòng cách ly [3, 4]. |
| 9. Nếu bắt buộc phải dùng chung dụng cụ, phải làm sạch và khử khuẩn trước khi dùng cho NB khác [5, 6]. |
| 10. Vệ sinh môi trường tăng cường (ít nhất 2 lần/ngày) tập trung vào các bề mặt tiếp xúc thường xuyên (thanh giường, tay nắm cửa, monitor) [3, 4]. |
| 11. Bàn giao đầy đủ thông tin cảnh báo MDROs khi chuyển NB đi khoa khác, đi làm cận lâm sàng, hoặc ra viện [3, 4]. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Giải thích
* **ACT-200** — Yêu cầu NVYT lập tức quay lại cửa phòng/vùng…
* **ACT-200** — Yêu cầu dán ngay "Biển báo phòng ngừa lây…
* **ACT-300** — Báo cáo Điều dưỡng trưởng / Bộ phận hậu cần…
* **ACT-400** — Đình chỉ ngay việc sử dụng ống nghe/nhiệt kế…

**Chữ ký Người giám sát:** ....................................... **Chữ ký Người được giám sát:** .......................................

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.17.01
stt: 9
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ ỨNG PHÓ BỆNH TRUYỀN NHIỄM TỐI NGUY HIỂM (COVID-19/EBOLA)"
ten_catalog: "Bảng kiểm giám sát tuân thủ ứng phó bệnh truyền nhiễm tối nguy hiểm (COVID-19/Ebola)"
domain: "Phòng ngừa lây truyền & Dịch bệnh"
jci_mapped: "PCI.07.02, FMS.09.01"
dong_nguon: "604-674"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "\"Người giám sát\" lập tức can thiệp" }
  - { code: ACT-200, headline: "Thiết lập ngay hàng rào vật lý" }
  - { code: ACT-200, headline: "Cung cấp ngay lập tức bộ PTPH đúng chuẩn (áo…" }
  - { code: ACT-200, headline: "Hướng dẫn phong tỏa khu vực có tràn đổ…" }
  - { code: ACT-400, headline: "Đình chỉ" }
```

## BM.17.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ ỨNG PHÓ BỆNH TRUYỀN NHIỄM TỐI NGUY HIỂM (COVID-19/EBOLA)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ | \[ \] Điều dưỡng/KTV | \[ \] Đội phản ứng nhanh | \[ \] Hộ lý/NVVS  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh (Tác nhân nghi ngờ):** \[ \] COVID-19/SARS | \[ \] Ebola/VHF | \[ \] Khác:...................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực cách ly đặc biệt, Đơn vị kiểm soát sinh học, Buồng áp lực âm (AIIR), Cấp cứu... *(Mặc định)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Sàng lọc, Phát hiện và Thiết lập cách ly |
| 1. Điểm tiếp nhận (Triage) thực hiện sàng lọc ngay các triệu chứng (sốt, ho, chảy máu...) và tiền sử dịch tễ/đi lại. |
| 2. Cấp ngay khẩu trang y tế cho người bệnh (NB) và đưa vào phòng cách ly áp lực âm (AIIR) hoặc khu vực cách ly tạm thời tách biệt hoàn toàn. |
| 3. Thiết lập rõ ràng 3 vùng (Vùng sạch, Vùng đệm, Vùng bẩn) và treo biển cảnh báo "CẤM VÀO \- BỆNH TRUYỀN NHIỄM NGUY HIỂM". |
| 4. Ghi nhận và lập danh sách toàn bộ nhân viên, NB khác và người nhà có tiền sử tiếp xúc gần với ca bệnh. |
| B. Tuân thủ Phương tiện phòng hộ (PTPH cấp cao) |
| 5. Bắt buộc: Phải có "Người giám sát" (Trained Observer) đọc bảng kiểm và giám sát chặt chẽ quá trình mặc và cởi PTPH của nhân viên trực tiếp vào phòng. |
| 6. NVYT mặc đầy đủ PTPH cấp cao (Bộ liền quần/Áo choàng chống thấm, Khẩu trang N95/PAPR, Kính/Tấm che mặt che toàn bộ, Găng tay đôi, Bao giày ống cao) trước khi vào khu vực cách ly. |
| 7. Thực hiện kiểm tra độ khít (Seal-check) đối với khẩu trang N95. Không có vùng da nào bị phơi bày ra ngoài. |
| 8. Cởi PTPH tại vùng đệm (vùng cởi đồ chuyên biệt). Tuân thủ nghiêm ngặt trình tự tháo, lộn mặt ngoài vào trong, tuyệt đối không để mặt ngoài PTPH chạm vào da/quần áo bên trong. |
| 9. Bắt buộc Vệ sinh tay (hoặc sát khuẩn găng tay trong) NGAY SAU MỖI BƯỚC tháo bỏ từng món PTPH. |
| C. Quản lý Môi trường, Thiết bị và Vận chuyển |
| 10. Sử dụng thiết bị y tế dùng 1 lần (SUDs) hoặc thiết bị dùng riêng lưu lại trong phòng. Hạn chế tối đa sử dụng vật sắc nhọn. |
| 11. Hạn chế tối đa các thủ thuật tạo khí dung (AGPs). Nếu bắt buộc, chỉ những nhân viên thiết yếu nhất mới ở trong phòng. |
| 12. Chất thải y tế được đóng gói kép (2 lớp túi), dán nhãn "Nguy cơ sinh học cao" và xử lý theo quy trình đặc biệt. |
| 13. Khử khuẩn môi trường/tràn đổ máu, dịch bằng các hóa chất diệt khuẩn chuyên dụng (VD: Clo nồng độ cao) theo đúng hướng dẫn. |
| 14. Hạn chế vận chuyển NB. Nếu bắt buộc, có quy trình thông báo trước cho nơi nhận, NB đeo khẩu trang và nhân viên vận chuyển mặc đủ PTPH. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — "Người giám sát" lập tức can thiệp
* **ACT-200** — Thiết lập ngay hàng rào vật lý
* **ACT-200** — Cung cấp ngay lập tức bộ PTPH đúng chuẩn (áo…
* **ACT-200** — Hướng dẫn phong tỏa khu vực có tràn đổ…
* **ACT-400** — Đình chỉ

**Chữ ký Người giám sát:** ....................................... **Chữ ký Người được giám sát:** .......................................

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.15.01
stt: 10
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH VẬN CHUYỂN NGƯỜI BỆNH NỘI VIỆN"
ten_catalog: "Bảng kiểm giám sát tuân thủ vận chuyển người bệnh nội viện"
domain: "Phòng ngừa lây truyền & Dịch bệnh"
jci_mapped: "PCI.07.00"
dong_nguon: "682-748"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 103_SYS, 106_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở khoa giao cần gọi điện báo trước…" }
  - { code: ACT-200, headline: "Yêu cầu NVYT quay lại lau khử khuẩn toàn bộ…" }
  - { code: ACT-200, headline: "Hủy bỏ và thay mới ngay tấm trải/ga giường…" }
  - { code: ACT-300, headline: "Yêu cầu Khoa giao cấp phát và hướng dẫn…" }
  - { code: ACT-400, headline: "Đình chỉ hành vi rủi ro" }
```

## BM.15.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH VẬN CHUYỂN NGƯỜI BỆNH NỘI VIỆN**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa giao:** ...................................................... **Khoa nhận:** ......................................................  
* **Người giám sát:** ...................................................................................................................  
* **Đối tượng được giám sát:** \[ \] Điều dưỡng | \[ \] Nhân viên vận chuyển | \[ \] Hộ lý  
* **Họ tên đối tượng được giám sát:** ...................................................................................................................  
* **Thông tin người bệnh:** Họ tên:................................................ PID:..............................  
  * *Tình trạng lây nhiễm (Nếu có):* \[ \] Tiếp xúc | \[ \] Giọt bắn | \[ \] Không khí  
* **Phương tiện vận chuyển:** \[ \] Xe lăn | \[ \] Cáng đẩy | \[ \] Giường bệnh  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Vận chuyển người bệnh vào/ra khu vực phẫu thuật, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Vận chuyển người bệnh đang mắc bệnh truyền nhiễm/cách ly, Khu vực Cấp cứu, Hồi sức tích cực, Lọc máu...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Vận chuyển người bệnh nội trú thông thường có vết thương/dẫn lưu, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang chung, sảnh chờ, thang máy, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Giai đoạn Chuẩn bị (Trước khi đón NB) |
| 1. Khoa giao đã thông báo/phối hợp trước với khoa nhận về tình trạng người bệnh (đặc biệt là NB đang cách ly). |
| 2. Người bệnh được chuẩn bị đúng: Băng kín vết thương/vị trí dẫn lưu (nếu có) và bắt buộc đeo khẩu trang y tế nếu mắc bệnh lây qua đường hô hấp. |
| 3. Phương tiện vận chuyển (xe/cáng) đảm bảo SẠCH, đã được trải ga/tấm lót sạch trước khi đón người bệnh. |
| 4. NVYT vận chuyển thực hiện Vệ sinh tay và mang PTPH đúng chỉ định (nếu NB thuộc diện cách ly). |
| B. Trong khi Vận chuyển |
| 5. Di chuyển theo tuyến đường hợp lý, hạn chế tiếp xúc, tránh đi qua khu vực đông người hoặc ưu tiên sử dụng thang máy riêng (nếu có). |
| 6. Bắt buộc: NVYT hạn chế tối đa chạm tay (đặc biệt là tay đang mang găng bẩn) vào các bề mặt môi trường chung (nút bấm thang máy, tay nắm cửa). |
| C. Giai đoạn Kết thúc (Sau khi bàn giao NB) |
| 7. NVYT tháo PTPH (nếu có) đúng cách và thực hiện Vệ sinh tay ngay sau khi bàn giao người bệnh. |
| 8. Bắt buộc: Phương tiện (xe/cáng) được lau khử khuẩn các bề mặt tiếp xúc (tay đẩy, thành xe, đệm nằm) bằng dung dịch khử khuẩn ngay sau khi sử dụng. |
| 9. Thay ga/tấm trải mới và phương tiện được cất giữ tại khu vực sạch sẽ, gọn gàng, sẵn sàng cho lần dùng tiếp theo. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Quá tải công việc / nhân sự
* Giao tiếp / bàn giao kém

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở khoa giao cần gọi điện báo trước…
* **ACT-200** — Yêu cầu NVYT quay lại lau khử khuẩn toàn bộ…
* **ACT-200** — Hủy bỏ và thay mới ngay tấm trải/ga giường…
* **ACT-300** — Yêu cầu Khoa giao cấp phát và hướng dẫn…
* **ACT-400** — Đình chỉ hành vi rủi ro

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.16.01
stt: 11
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TRONG QUẢN LÝ VÀ XỬ LÝ TỬ THI"
ten_catalog: "Bảng kiểm giám sát tuân thủ KSNK trong quản lý và xử lý tử thi"
domain: "Phòng ngừa lây truyền & Dịch bệnh"
jci_mapped: "PCI.05.00 ME 7"
dong_nguon: "756-823"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 304_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Hướng dẫn lại (Coaching) kỹ thuật sử dụng…" }
  - { code: ACT-100, headline: "Điều động/Nhắc nhở Hộ lý/NVVS thực hiện Vệ…" }
  - { code: ACT-200, headline: "Yêu cầu Điều dưỡng/Nhân viên nhà tang lễ…" }
  - { code: ACT-200, headline: "Yêu cầu thực hiện lồng thêm túi thứ hai…" }
  - { code: ACT-200, headline: "Yêu cầu dán bổ sung Nhãn \"Cảnh báo lây nhiễm…" }
```

## BM.16.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TRONG QUẢN LÝ VÀ XỬ LÝ TỬ THI**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Nhà tang lễ:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Điều dưỡng lâm sàng | \[ \] Nhân viên Nhà tang lễ | \[ \] Hộ lý/NVVS  
* **Thông tin người bệnh (Tử thi):** Mã BA/Họ tên: .......................................  
* **Tình trạng lây nhiễm:** \[ \] Thông thường | \[ \] Bệnh truyền nhiễm nguy hiểm (Lao, Covid, Nhóm A...)  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Nhà tang lễ (Khu bảo quản tử thi), Khu vực Cấp cứu, Hồi sức tích cực, Phòng cách ly truyền nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Chuẩn bị và Xử lý tử thi (Tại khoa lâm sàng) |
| 1. NVYT thực hiện Vệ sinh tay và mang phương tiện phòng hộ (găng tay, áo choàng chống thấm, khẩu trang, kính bảo hộ nếu có nguy cơ văng bắn) TRƯỚC KHI tiếp xúc tử thi. |
| 2. Tháo gỡ cẩn thận các thiết bị xâm lấn (ống nội khí quản, CVC, ống thông tiểu, dẫn lưu). Bỏ ngay vật sắc nhọn vào Hộp kháng thủng màu vàng. |
| 3. Lau sạch máu, dịch tiết trên cơ thể tử thi. |
| 4. Dùng bông/gạc sạch bịt kín các lỗ tự nhiên (mũi, miệng, tai, hậu môn) và các vết thương/vị trí dẫn lưu để ngăn rỉ dịch. |
| B. Đóng gói và Nhận diện |
| 5. Đặt tử thi vào túi đựng chuyên dụng (vật liệu không thấm nước) và kéo khóa túi kín hoàn toàn. |
| 6. Bắt buộc Đóng gói kép (2 lớp túi): Nếu túi thứ nhất bị rách, rò rỉ HOẶC tử thi mắc bệnh truyền nhiễm nguy hiểm (Lao, COVID-19, Ebola...). |
| 7. Lau sạch bên ngoài túi. (Nếu là bệnh truyền nhiễm nguy hiểm: Phải lau khử khuẩn bề mặt túi ngoài bằng dung dịch Clo). |
| 8. Dán nhãn nhận dạng bên ngoài túi (Kèm nhãn "CẢNH BÁO LÂY NHIỄM NGUY HIỂM" nếu thuộc diện bệnh truyền nhiễm). |
| 9. Tháo bỏ PTPH và Vệ sinh tay ngay sau khi hoàn thành đóng gói. |
| C. Vận chuyển, Bàn giao và Vệ sinh môi trường |
| 10. Nhân viên Nhà tang lễ mang PTPH khi tiếp nhận, kiểm tra thông tin và ký Sổ bàn giao tử thi. |
| 11. Đặt túi tử thi lên xe đẩy chuyên dụng, có khăn/mái che phủ kín trong suốt quá trình vận chuyển về Nhà tang lễ. |
| 12. Xe đẩy tử thi được lau khử khuẩn bề mặt ngay sau mỗi lần sử dụng (Lưu giữ tại Nhà tang lễ). |
| 13. NVVS thực hiện Vệ sinh cuối (Lau khử khuẩn toàn bộ giường bệnh, đệm, tủ, sàn nhà) ngay sau khi tử thi được chuyển đi. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Giải phẫu / bệnh lý đặc thù

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Hướng dẫn lại (Coaching) kỹ thuật sử dụng…
* **ACT-100** — Điều động/Nhắc nhở Hộ lý/NVVS thực hiện Vệ…
* **ACT-200** — Yêu cầu Điều dưỡng/Nhân viên nhà tang lễ…
* **ACT-200** — Yêu cầu thực hiện lồng thêm túi thứ hai…
* **ACT-200** — Yêu cầu dán bổ sung Nhãn "Cảnh báo lây nhiễm…

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.18.02
stt: 12
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH LÀM SẠCH DỤNG CỤ TÁI SỬ DỤNG"
ten_catalog: "Bảng kiểm giám sát tuân thủ quy trình làm sạch dụng cụ tái sử dụng"
domain: "Tái xử lý dụng cụ (CSSD)"
jci_mapped: "PCI.03.00"
dong_nguon: "831-898"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 104_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "Cảnh báo và chấn chỉnh ngay lập tức hành vi…" }
  - { code: ACT-200, headline: "Yêu cầu NVYT mang bổ sung ngay kính bảo…" }
  - { code: ACT-200, headline: "Phản hồi trực tiếp cho ĐD Trưởng khoa lâm…" }
  - { code: ACT-300, headline: "Cấp phát bổ sung khẩn cấp các loại chổi cọ…" }
  - { code: ACT-400, headline: "Đình chỉ và Yêu cầu làm lại" }
```

## BM.18.02

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH LÀM SẠCH DỤNG CỤ TÁI SỬ DỤNG**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Điều dưỡng (Khoa LS) | \[ \] NVYT Phòng mổ | \[ \] Nhân viên khu bẩn (CSSD)  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin bộ dụng cụ:** Mã/Tên bộ: ....................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu bẩn (CSSD), Khu vực Cấp cứu, Hồi sức tích cực, Phòng cách ly bệnh truyền nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Xử lý ban đầu và Vận chuyển (Tại nơi sử dụng) |
| 1. Tháo rời các bộ phận (nếu có thể), lau sạch máu/dịch thô ngay sau khi kết thúc phẫu thuật/thủ thuật. |
| 2. Giữ ẩm dụng cụ (dùng gạc ẩm/dung dịch giữ ẩm chuyên dụng). TUYỆT ĐỐI KHÔNG ngâm vào nước muối sinh lý (NaCl 0.9%) gây ăn mòn. |
| 3. Đặt dụng cụ vào hộp nhựa kín, có nắp đậy, chốt khóa an toàn để vận chuyển về CSSD. |
| B. An toàn và Chuẩn bị (Tại khu bẩn CSSD) |
| 4. Nhân viên mang đầy đủ PTPH: Tạp dề chống thấm, găng tay cao su dày, khẩu trang, kính bảo hộ/tấm che mặt, ủng. |
| 5. Pha dung dịch Enzyme đúng tỷ lệ, sử dụng nước ấm 30°C \- 45°C (Tuyệt đối không dùng nước quá nóng \> 55°C làm hỏng men). |
| C. Ngâm và Làm sạch cơ học |
| 6. Ngâm ngập hoàn toàn dụng cụ. Dùng bơm tiêm bơm đầy hóa chất vào lòng ống (không để bọt khí). Đảm bảo thời gian ngâm 5 \- 15 phút. |
| 7. Bắt buộc: Thực hiện cọ rửa dụng cụ HOÀN TOÀN DƯỚI MẶT NƯỚC để tránh tạo khí dung và văng bắn chất bẩn. |
| 8. Sử dụng chổi cọ nòng (đúng kích cỡ) để chải xuyên suốt lòng ống và cọ kỹ các khe kẽ, khớp nối, răng cưa. |
| D. Xả sạch, Làm khô và Kiểm tra (QC) |
| 9. Xả kỹ dụng cụ dưới vòi nước chảy (ưu tiên dùng nước RO/nước lọc ở bước tráng cuối cùng để tránh cặn khoáng). |
| 10. Làm khô: Sử dụng khí nén y tế thổi khô khe kẽ, lòng ống; dùng tủ sấy (70-90°C) hoặc khăn mềm không xơ lau khô bề mặt. |
| 11. Kiểm tra (QC Bước 2): Soi dụng cụ dưới đèn kính lúp đảm bảo sạch 100% vết máu, mảng bám, khô ráo và nguyên vẹn cấu trúc. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự
* Lỗi thiết bị / hỏng hóc

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Cảnh báo và chấn chỉnh ngay lập tức hành vi…
* **ACT-200** — Yêu cầu NVYT mang bổ sung ngay kính bảo…
* **ACT-200** — Phản hồi trực tiếp cho ĐD Trưởng khoa lâm…
* **ACT-300** — Cấp phát bổ sung khẩn cấp các loại chổi cọ…
* **ACT-400** — Đình chỉ và Yêu cầu làm lại

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.19.01
stt: 13
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH KHỬ KHUẨN MỨC ĐỘ CAO"
ten_catalog: "Bảng kiểm giám sát tuân thủ quy trình khử khuẩn mức độ cao"
domain: "Tái xử lý dụng cụ (CSSD)"
jci_mapped: "PCI.03.00"
dong_nguon: "906-978"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 104_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở và yêu cầu NVYT mang bổ sung ngay…" }
  - { code: ACT-200, headline: "Bắt buộc đổ bỏ và thay mới chậu hóa chất…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên làm lại quy trình từ bước…" }
  - { code: ACT-200, headline: "Kích hoạt quy trình thu hồi dụng cụ (Recall)…" }
  - { code: ACT-400, headline: "Đình chỉ quy trình" }
```

## BM.19.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH KHỬ KHUẨN MỨC ĐỘ CAO**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Điều dưỡng nội soi | \[ \] KTV Xử lý dụng cụ | \[ \] Nhân viên khu bẩn (CSSD)  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin thiết bị (Mã/Tên dụng cụ):** ....................................................................................  
* **Phương pháp:** \[ \] Ngâm thủ công | \[ \] Máy rửa tự động (AER)  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu bẩn (CSSD), Phòng xử lý dụng cụ nội soi, Khu vực Cấp cứu, Hồi sức tích cực, Phòng cách ly...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. An toàn và Môi trường |
| 1. Nhân viên mang đầy đủ PTPH (kính/tấm che mặt, găng tay dài kháng hóa chất, áo choàng chống thấm) khi thao tác làm sạch và ngâm hóa chất. |
| 2. Khu vực bẩn và sạch tách biệt, tuân thủ nguyên tắc một chiều. Khu vực ngâm hóa chất có hệ thống thông khí/hút mùi hoạt động tốt. |
| 3. Bồn ngâm hóa chất khử khuẩn mức độ cao (KKMĐC) có nắp đậy kín. |
| B. Làm sạch trước KKMĐC (Tại khu bẩn) |
| 4. *Đối với ống soi mềm:* Thực hiện kiểm tra rò rỉ (leak test) cho mọi ống soi TRƯỚC KHI ngâm. |
| 5. Hóa chất enzyme được pha đúng nồng độ, nhiệt độ và thay đúng quy định. |
| 6. Sử dụng bàn chải nòng (đúng kích cỡ) cọ rửa toàn bộ các kênh/lumen dưới mặt nước. |
| 7. Các van, nút chặn được tháo rời hoàn toàn và cọ rửa kỹ. |
| 8. Dụng cụ được xả sạch hoàn toàn hóa chất enzyme và lau/thổi khô trước khi đưa vào KKMĐC (tránh làm loãng hóa chất). |
| C. Khử khuẩn mức độ cao (KKMĐC) |
| 9. Kiểm tra nồng độ hóa chất (MEC) bằng que thử chuyên dụng đúng hạn dùng trước mỗi ca/mẻ ngâm. |
| 10. Đảm bảo dụng cụ ngâm ngập hoàn toàn và dùng bơm tiêm bơm đầy hóa chất vào tất cả các kênh (không để bọt khí). |
| 11. Tuân thủ tuyệt đối thời gian và nhiệt độ ngâm theo hướng dẫn của nhà sản xuất (VD: OPA 0.55% trong 10-12 phút, Glutaraldehyde \>2% trong 20 phút). |
| 12. *Nếu dùng máy tự động (AER):* Kết nối đúng và đủ các adapter/kênh của ống soi vào hệ thống bơm của máy. |
| D. Tráng, Làm khô và Lưu giữ |
| 13. Dụng cụ được xả sạch hoàn toàn hóa chất KKMĐC bằng nước lọc (qua màng lọc) hoặc nước vô khuẩn. |
| 14. *Đối với ống soi mềm:* Tráng lại các kênh bằng cồn 70-90% và thổi khô bằng khí nén y tế. |
| 15. Dụng cụ được lưu giữ treo dọc (không cuộn gập đối với ống soi) trong tủ chuyên dụng, bảo đảm sạch sẽ, khô ráo. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự
* Lỗi thiết bị / hỏng hóc

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở và yêu cầu NVYT mang bổ sung ngay…
* **ACT-200** — Bắt buộc đổ bỏ và thay mới chậu hóa chất…
* **ACT-200** — Yêu cầu nhân viên làm lại quy trình từ bước…
* **ACT-200** — Kích hoạt quy trình thu hồi dụng cụ (Recall)…
* **ACT-400** — Đình chỉ quy trình

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.19.02
stt: 14
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KIỂM TRA VÀ BẢO DƯỠNG DỤNG CỤ PHẪU THUẬT"
ten_catalog: "Bảng kiểm giám sát tuân thủ kiểm tra và bảo dưỡng dụng cụ phẫu thuật"
domain: "Tái xử lý dụng cụ (CSSD)"
jci_mapped: "PCI.03.00"
dong_nguon: "986-1047"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 201_HUM, 203_HUM, 204_HUM, 206_HUM]
hanh_dong_items:
  - { code: ACT-100, headline: "Hướng dẫn lại tại chỗ (Coaching) cách sử…" }
  - { code: ACT-200, headline: "Yêu cầu trả lại ngay dụng cụ về khu bẩn (để…" }
  - { code: ACT-200, headline: "Ghi nhận tình trạng dụng cụ hỏng vào sổ giao…" }
  - { code: ACT-400, headline: "Đình chỉ đóng gói" }
  - { code: ACT-500, headline: "Cung cấp và bổ sung ngay chất bôi trơn dụng…" }
```

## BM.19.02

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ KIỂM TRA VÀ BẢO DƯỠNG DỤNG CỤ PHẪU THUẬT**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** Đơn vị Tiệt khuẩn trung tâm (CSSD) \- Khu vực Sạch (Đóng gói)  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Nhân viên khu sạch (CSSD) | \[ \] Điều dưỡng dụng cụ  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin bộ dụng cụ:** Mã/Tên bộ dụng cụ: ....................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[x\] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Trung tâm tiệt khuẩn (khu sạch), phòng pha chế thuốc vô khuẩn, phòng mổ... *(Mặc định cho khu vực kiểm tra, đóng gói dụng cụ sau làm sạch)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu bẩn (CSSD), Khu vực Cấp cứu, Hồi sức tích cực, Lọc máu...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Chuẩn bị Môi trường và Dụng cụ kiểm tra |
| 1. Nhân viên mang trang phục khu sạch (mũ trùm tóc, khẩu trang, quần áo sạch), vệ sinh tay trước khi làm việc. |
| 2. Khu vực làm việc có đủ ánh sáng; có trang bị kính lúp có đèn chiếu sáng (lighted magnifying glass) để soi khe kẽ. |
| B. Kiểm tra ngoại quan và cấu trúc (Inspection) |
| 3. Kiểm tra độ sạch: Dụng cụ được làm sạch và sấy khô hoàn toàn trước khi kiểm tra (không còn vết máu, mô, cặn bẩn). |
| 4. Kiểm tra bề mặt: Không có rỉ sét, rỗ, ăn mòn, gờ, vết xước, nứt, mẻ lớp mạ trên bề mặt dụng cụ. |
| 5. Kiểm tra lòng ống (Lumen): Soi hoặc dùng dây thông đảm bảo lòng ống thông suốt, không tắc nghẽn. |
| 6. Kiểm tra quang học/cáp sáng: Soi kiểm tra cáp quang, thấu kính không bị mờ, xước, nứt vỡ theo hướng dẫn của NSX. |
| C. Kiểm tra chức năng và Bảo dưỡng (Function check & Maintenance) |
| 7. Kiểm tra độ sắc bén: Đảm bảo các dụng cụ có lưỡi cắt (kéo, dao đục xương, kìm cắt) sắc bén, không bị cùn hay mẻ. |
| 8. Kiểm tra khớp nối (Hinges): Các khớp nối, khóa (panh, kẹp) di chuyển trơn tru, không bị kẹt hay rít. |
| 9. Bảo dưỡng: Tra dầu/bôi trơn (loại chuyên dụng dùng cho y tế, không phải gốc dầu máy công nghiệp) vào các khớp nối theo đúng hướng dẫn của NSX. |
| 10. Xử lý dụng cụ hỏng: Dụng cụ hỏng hóc, rỉ sét, mờ, cùn được rút ra khỏi bộ dụng cụ ngay lập tức, dán nhãn báo hỏng và chuyển đi sửa chữa/thay thế. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Quy trình phức tạp

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Hướng dẫn lại tại chỗ (Coaching) cách sử…
* **ACT-200** — Yêu cầu trả lại ngay dụng cụ về khu bẩn (để…
* **ACT-200** — Ghi nhận tình trạng dụng cụ hỏng vào sổ giao…
* **ACT-400** — Đình chỉ đóng gói
* **ACT-500** — Cung cấp và bổ sung ngay chất bôi trơn dụng…

**Chữ ký Người giám sát: ....................................... Chữ ký Nhân viên khu sạch (CSSD): .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.20.02
stt: 15
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH ĐÓNG GÓI DỤNG CỤ"
ten_catalog: "Bảng kiểm giám sát tuân thủ quy trình đóng gói dụng cụ"
domain: "Tái xử lý dụng cụ (CSSD)"
jci_mapped: "PCI.03.00"
dong_nguon: "1055-1118"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 104_SYS, 201_HUM, 203_HUM, 204_HUM]
hanh_dong_items:
  - { code: ACT-200, headline: "Yêu cầu cắt bỏ đường hàn" }
  - { code: ACT-200, headline: "Yêu cầu mở gói và bổ sung ngay Chỉ thị hóa…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên tháo và mở tất cả các chốt…" }
  - { code: ACT-200, headline: "Báo cáo cho bộ phận bảo trì để tiến hành…" }
  - { code: ACT-400, headline: "Đình chỉ thao tác đóng gói và gửi dụng cụ…" }
```

## BM.20.02

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH ĐÓNG GÓI DỤNG CỤ**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** Đơn vị Tiệt khuẩn trung tâm (CSSD) \- Khu sạch  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Nhân viên khu sạch (CSSD)  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin bộ dụng cụ:** Mã/Tên bộ dụng cụ: ....................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[x\] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, Trung tâm tiệt khuẩn (khu sạch)...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu bẩn (CSSD), Khu vực Cấp cứu, Hồi sức tích cực, Phòng cách ly bệnh truyền nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Chuẩn bị và Kiểm tra trước đóng gói (QC Bước 2) |
| 1. Nhân viên mang trang phục khu sạch (mũ trùm kín tóc, áo sạch, khẩu trang) và VST tay trước khi thao tác. |
| 2. Kiểm tra dụng cụ qua kính lúp: Đảm bảo khô hoàn toàn 100%, không còn vết bẩn, máu, rỉ sét (Nếu còn bẩn/ướt phải trả về khu bẩn). |
| 3. Kiểm đếm dụng cụ theo bảng kê (Checklist). Mở tất cả các khớp nối (panh, kẹp) ở nấc đầu tiên để sterilant xâm nhập. |
| 4. Dùng dụng cụ bảo vệ chuyên dụng (ống silicon, nắp chụp) cho các đầu mũi nhọn, sắc bén để tránh đâm thủng bao bì. |
| B. Lựa chọn bao bì và Chỉ thị hóa học |
| 5. Chọn bao bì đúng phương pháp tiệt khuẩn: Dùng vải, giấy y tế, túi giấy-nhựa (Pouch) cho hấp Hơi nước. Dùng túi Tyvek cho Plasma/EO (TUYỆT ĐỐI KHÔNG dùng giấy cellulose/vải cho Plasma). |
| 6. Đặt Chỉ thị hóa học (CI) bên trong (Loại 4, 5, 6) vào vị trí khó tiếp xúc nhất ở tâm của gói dụng cụ. |
| C. Đa phương pháp Đóng gói |
| 7. Gói bằng Vải/Giấy: Gói kép 2 lớp (tuần tự hoặc đồng thời), sử dụng kỹ thuật "gói vuông" hoặc "phong bì". Gói vừa vặn, không quá chặt, dán băng keo chỉ thị hóa học cố định bên ngoài. |
| 8. Đóng gói bằng Túi ép (Pouch): Chọn túi có kích cỡ phù hợp (dụng cụ chiếm tối đa 3/4 túi). Cán kẹp/tay cầm dụng cụ phải hướng về phía nắp mở. |
| 9. Ép nhiệt (Hàn miệng túi): Đường hàn phải phẳng, kín, không có bọt khí hay nếp nhăn, chiều rộng mối hàn *ge* 6mm. |
| 10. Sử dụng Hộp cứng (Container): Lắp phin lọc (filter) mới, sắp xếp dụng cụ cân đối và khóa chốt an toàn (seal) hai bên hộp. |
| D. Dán nhãn định danh |
| 11. Nhãn mác chứa đủ thông tin (Tên gói, ngày đóng gói, hạn sử dụng, mã mẻ, người đóng gói). |
| 12. Nhãn được dán/in ở phần mặt nhựa hoặc trên băng keo dán. TUYỆT ĐỐI KHÔNG dùng bút bi viết trực tiếp hay dán nhãn đè lên mặt giấy thở của bao bì. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Lỗi thiết bị / hỏng hóc

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Yêu cầu cắt bỏ đường hàn
* **ACT-200** — Yêu cầu mở gói và bổ sung ngay Chỉ thị hóa…
* **ACT-200** — Yêu cầu nhân viên tháo và mở tất cả các chốt…
* **ACT-200** — Báo cáo cho bộ phận bảo trì để tiến hành…
* **ACT-400** — Đình chỉ thao tác đóng gói và gửi dụng cụ…

**Chữ ký Người giám sát: ....................................... Chữ ký Nhân viên khu sạch (CSSD): .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.22.04
stt: 16
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ VẬN HÀNH VÀ KIỂM SOÁT CHẤT LƯỢNG TIỆT KHUẨN"
ten_catalog: "Bảng kiểm giám sát tuân thủ vận hành và kiểm soát chất lượng tiệt khuẩn"
domain: "Tái xử lý dụng cụ (CSSD)"
jci_mapped: "PCI.03.00 ME 2"
dong_nguon: "1126-1194"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 103_SYS, 104_SYS, 201_HUM, 203_HUM, 205_HUM, 206_HUM, 301_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "Thu hồi khẩn cấp (Recall)" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên dỡ lại mẻ hấp" }
  - { code: ACT-200, headline: "Yêu cầu đẩy xe dụng cụ vào lại khu vực lưu…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên vận hành ký tên" }
  - { code: ACT-400, headline: "Đình chỉ máy ngay lập tức" }
  - { code: ACT-400, headline: "Cảnh báo và đình chỉ xuất xưởng nếu phát…" }
```

## BM.22.04

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ VẬN HÀNH VÀ KIỂM SOÁT CHẤT LƯỢNG TIỆT KHUẨN**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Khu vực:** Đơn vị Tiệt khuẩn Trung tâm (CSSD) \- Khu vực Tiệt khuẩn.  
* **Máy tiệt khuẩn số:** .................................. **Loại máy:** \[ \] Hơi nước | \[ \] Plasma | \[ \] EO  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Nhân viên Vận hành máy | \[ \] Nhân viên Kiểm soát chất lượng (QC)  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[x\] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Đơn vị Tiệt khuẩn trung tâm (khu vực sạch, khu vực vô khuẩn, vận hành máy). *(Mặc định cho quy trình này)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu bẩn (CSSD), Cấp cứu, Hồi sức tích cực, Lọc máu...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Chuẩn bị và Giám sát đầu ngày (Áp dụng máy hơi nước chân không) |
| 1. Làm sạch buồng tiệt khuẩn, rọ lọc rác; kiểm tra điện, nước, khí nén, giấy in trước khi chạy máy. |
| 2. Chạy chu trình làm nóng (warm-up) và thực hiện Test Bowie-Dick vào mẻ chạy không tải ĐẦU TIÊN. |
| 3. Đặt gói Test Bowie-Dick đúng vị trí: Ở giá dưới cùng, gần cửa xả khí nhất của buồng máy TRỐNG. |
| 4. Đọc kết quả: Giấy Test B-D chuyển màu đồng nhất (Đạt) và được dán lưu vào "Sổ theo dõi kết quả Test Bowie-Dick". |
| B. Kỹ thuật Nạp tải và Giám sát mỗi mẻ (Vật lý & Hóa học) |
| 5. Nạp tải đúng nguyên tắc: Không xếp quá tải. Gói nặng/hộp ở dưới. Gói vải/giấy xếp nghiêng ở trên. Túi ép (Pouch) xếp đứng trên giá đỡ, mặt giấy áp mặt nhựa. |
| 6. Đặt Gói thử nghiệm (PCD) chứa Chỉ thị hóa học bên trong (CI Loại 5) vào vị trí khó tiếp xúc nhất của mỗi mẻ hấp. |
| 7. Giám sát vật lý: Kiểm tra và ký xác nhận Bản in (đủ nhiệt độ, thời gian, áp suất) ngay khi mẻ kết thúc. |
| 8. Giám sát hóa học: Kiểm tra băng keo/nhãn Chỉ thị hóa học bên ngoài (CI Loại 1) của TẤT CẢ các gói khi dỡ tải, đảm bảo chuyển màu đạt yêu cầu. |
| C. Kỹ thuật Dỡ tải, Giám sát sinh học (BI) và Cấp phát (Release) |
| 9. Dỡ tải an toàn: Mở hé cửa và để dụng cụ chờ nguội tự nhiên (30 \- 60 phút). TUYỆT ĐỐI KHÔNG lấy dụng cụ ra môi trường lạnh khi còn nóng để tránh hiện tượng ngưng tụ gây "gói ướt". |
| 10. Thực hiện Test Sinh học (BI) đúng tần suất (Hơi nước: *ge* 1 lần/tuần; Plasma/EO: Mỗi mẻ) VÀ Bắt buộc cho TẤT CẢ các mẻ có chứa dụng cụ cấy ghép (Implant). |
| 11. Đọc kết quả BI: Kích hoạt đúng kỹ thuật. Lọ Đối chứng (Control) phải DƯƠNG TÍNH (+), Lọ Thử nghiệm (Test) phải ÂM TÍNH (-). |
| 12. Bắt buộc: Lưu giữ (Quarantine) các mẻ dụng cụ cấy ghép cho đến khi có kết quả Test sinh học (BI) Âm tính mới được cấp phát cho khoa lâm sàng. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Quá tải công việc / nhân sự
* Lỗi thiết bị / hỏng hóc

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Hành vi liều lĩnh
* Quy trình phức tạp

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Thu hồi khẩn cấp (Recall)
* **ACT-200** — Yêu cầu nhân viên dỡ lại mẻ hấp
* **ACT-200** — Yêu cầu đẩy xe dụng cụ vào lại khu vực lưu…
* **ACT-200** — Yêu cầu nhân viên vận hành ký tên
* **ACT-400** — Đình chỉ máy ngay lập tức
* **ACT-400** — Cảnh báo và đình chỉ xuất xưởng nếu phát…

**Chữ ký Người giám sát: ....................................... Chữ ký Nhân viên Vận hành/QC: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.QĐ.19.03
stt: 17
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUẢN LÝ DỤNG CỤ DÙNG MỘT LẦN (SUDs) VÀ VẬT TƯ HỎNG/HẾT HẠN"
ten_catalog: "Bảng kiểm giám sát tuân thủ quản lý dụng cụ dùng 1 lần (SUDs) và vật tư hỏng/hết hạn"
domain: "Tái xử lý dụng cụ (CSSD)"
jci_mapped: "PCI.03.01, PCI.03.02, MMU.01.03"
dong_nguon: "1202-1264"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 205_HUM, 301_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "Yêu cầu loại bỏ ngay vào thùng rác các vật…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên CSSD hủy bỏ ngay lập tức…" }
  - { code: ACT-200, headline: "Yêu cầu Điều dưỡng trưởng sắp xếp lại tủ vật…" }
  - { code: ACT-400, headline: "Đình chỉ và Tịch thu" }
  - { code: ACT-500, headline: "Kích hoạt quy trình thu hồi (Recall) và báo…" }
```

## BM.QĐ.19.03

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUẢN LÝ DỤNG CỤ DÙNG MỘT LẦN (SUDs) VÀ VẬT TƯ HỎNG/HẾT HẠN**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Điều dưỡng/NVYT (Tại điểm chăm sóc) | \[ \] Nhân viên CSSD (Tái xử lý)  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực Cấp cứu, Hồi sức tích cực, Lọc máu, Phòng cách ly bệnh truyền nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Quản lý Vật tư/Dụng cụ dùng 1 lần tại Điểm chăm sóc (Point-of-Care) |
| 1. Tuyệt đối KHÔNG tái sử dụng các dụng cụ: Kim tiêm, bơm tiêm, dây truyền dịch, găng tay, dụng cụ cấy ghép (Implant). |
| 2. Các vật tư dùng 1 lần (chưa sử dụng) đã mang vào buồng bệnh/khu vực chăm sóc phải được để lại dùng riêng cho NB đó hoặc loại bỏ. KHÔNG trả lại kho sạch/xe tiêm chung. |
| B. Quản lý Tái xử lý Dụng cụ dùng 1 lần (SUDs) \- Chỉ áp dụng tại CSSD |
| 3. Chỉ thực hiện tái xử lý các dụng cụ nằm trong "Danh mục SUDs được phép tái sử dụng" đã được Giám đốc bệnh viện phê duyệt. |
| 4. Kiểm tra nghiêm ngặt tình trạng vật lý (không nứt, gãy) và chức năng của SUDs trước khi quyết định tái xử lý. Nếu hỏng phải hủy bỏ ngay. |
| 5. Có hệ thống đánh dấu/dán nhãn truy xuất trên dụng cụ hoặc bao bì để kiểm soát số lần đã tái sử dụng. |
| 6. Hủy bỏ ngay lập tức các SUDs đã đạt đến số lần tái sử dụng tối đa theo quy định của danh mục. |
| C. Quản lý Vật tư/Dụng cụ Hỏng, Rách, hoặc Hết hạn |
| 7. Thực hiện kiểm tra hạn sử dụng định kỳ. Tuân thủ nguyên tắc FEFO (Hết hạn trước \- Xuất trước) khi cấp phát và sử dụng. |
| 8. Không sử dụng các gói dụng cụ/vật tư có dấu hiệu mất tính toàn vẹn (bao bì bị rách, thủng, ướt, mờ nhãn, ố bẩn). |
| 9. Vật tư/dụng cụ hết hạn hoặc hư hỏng phải được cách ly ngay lập tức khỏi kho vật tư chung và dán nhãn cảnh báo "HỎNG/HẾT HẠN" chờ xử lý. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Hành vi liều lĩnh

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Yêu cầu loại bỏ ngay vào thùng rác các vật…
* **ACT-200** — Yêu cầu nhân viên CSSD hủy bỏ ngay lập tức…
* **ACT-200** — Yêu cầu Điều dưỡng trưởng sắp xếp lại tủ vật…
* **ACT-400** — Đình chỉ và Tịch thu
* **ACT-500** — Kích hoạt quy trình thu hồi (Recall) và báo…

**Chữ ký Người giám sát: ....................................... Chữ ký Đại diện Khoa / CSSD: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.21.04
stt: 18
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ LƯU TRỮ VÀ CẤP PHÁT DỤNG CỤ VÔ KHUẨN"
ten_catalog: "Bảng kiểm giám sát tuân thủ lưu trữ và cấp phát dụng cụ vô khuẩn"
domain: "Tái xử lý dụng cụ (CSSD)"
jci_mapped: "PCI.03.00"
dong_nguon: "1272-1337"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 201_HUM, 203_HUM, 204_HUM]
hanh_dong_items:
  - { code: ACT-100, headline: "Hướng dẫn lại tại chỗ (Coaching) cho nhân…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên sắp xếp lại ngay lập tức…" }
  - { code: ACT-200, headline: "Yêu cầu lau khô hoàn toàn mặt bàn/mâm khay…" }
  - { code: ACT-300, headline: "Báo cáo Khoa Trang bị / Hậu cần kỹ thuật…" }
  - { code: ACT-400, headline: "Đình chỉ sử dụng & Thu hồi" }
```

## BM.21.04

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ LƯU TRỮ VÀ CẤP PHÁT DỤNG CỤ VÔ KHUẨN**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Nhân viên khu vô khuẩn (CSSD) | \[ \] Điều dưỡng trưởng/Điều dưỡng lâm sàng  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin bộ dụng cụ (Nếu có):** ....................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[x\] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Khu vô khuẩn (CSSD), Phòng mổ, Phòng pha chế thuốc vô khuẩn, tủ lưu trữ dụng cụ vô khuẩn...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu bẩn (CSSD), Khu vực Cấp cứu, Hồi sức tích cực, Phòng cách ly...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Môi trường lưu trữ |
| 1. Khu vực/Tủ lưu trữ có sạch, khô, không bám bụi? |
| 2. Có được vệ sinh định kỳ (sàn, tường, kệ tủ)? |
| 3. Tủ/Kệ có đóng kín? (Nếu là kệ hở, dụng cụ có được che đậy an toàn bằng vải bọc?) |
| 4. Vị trí lưu trữ có cách xa nguồn nước/bồn rửa, cách xa khu vực bẩn? |
| 5. Dụng cụ được đặt trên kệ/tủ đảm bảo khoảng cách: cách sàn *ge* 20-25cm, cách trần *ge* 45cm, cách tường *ge* 5cm? |
| 6. *(Chỉ áp dụng tại CSSD):* Khu vô khuẩn duy trì áp suất dương? Nhiệt độ đạt 20-25°C, Độ ẩm đạt 30-60% (Tối đa 70%)? |
| B. Sắp xếp và Hạn sử dụng |
| 7. Các gói dụng cụ có được sắp xếp khoa học, gọn gàng, không bị chèn ép, nén chặt hay chồng chất lên nhau? |
| 8. Các gói nặng (Hộp/Container cứng) có được đặt ở kệ dưới, các gói nhẹ (vải, giấy, túi ép) đặt ở kệ trên? |
| 9. Có tuân thủ nguyên tắc FIFO (Nhập trước xuất trước) hoặc FEFO (Hết hạn trước xuất trước)? |
| 10. Các gói dụng cụ có nhãn mác rõ ràng (Tên gói, ngày đóng gói, hạn sử dụng, mã mẻ...) hướng ra ngoài dễ quan sát? |
| 11. Không có dụng cụ nào quá hạn sử dụng (nếu áp dụng hạn sử dụng theo thời gian \- TRSL) lưu lại trong kho/tủ? |
| C. Cấp phát, Vận chuyển và Sử dụng |
| 12. *(Chỉ áp dụng tại CSSD):* Việc cấp phát thực hiện qua cửa sổ chuyên dụng/khu vực giao nhận sạch, có ghi chép sổ sách đầy đủ? |
| 13. Dụng cụ được vận chuyển bằng xe đẩy kín hoặc thùng chứa kín, sạch sẽ chuyên dụng (TUYỆT ĐỐI không dùng chung xe chở đồ bẩn)? |
| 14. *(Tại khoa Lâm sàng):* Tuyệt đối không đặt gói vô khuẩn lên mặt bàn ướt để tránh vi khuẩn "thấm hút ngược" qua lớp giấy ẩm? |
| 15. *(Tại khoa Lâm sàng):* Nhân viên BẮT BUỘC kiểm tra 4 yếu tố (Đúng loại/HSD, Chỉ thị màu bên ngoài đạt, Bao gói nguyên vẹn, Khô ráo) trước khi mở gói sử dụng? |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Hướng dẫn lại tại chỗ (Coaching) cho nhân…
* **ACT-200** — Yêu cầu nhân viên sắp xếp lại ngay lập tức…
* **ACT-200** — Yêu cầu lau khô hoàn toàn mặt bàn/mâm khay…
* **ACT-300** — Báo cáo Khoa Trang bị / Hậu cần kỹ thuật…
* **ACT-400** — Đình chỉ sử dụng & Thu hồi

**Chữ ký Người giám sát:** ....................................... **Chữ ký Nhân viên quản lý kho / NVYT:** .......................................

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.25.01
stt: 19
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI AN TOÀN ĐẶT ĐƯỜNG TRUYỀN TĨNH MẠCH TRUNG TÂM (INSERTION BUNDLE - CLABSI)"
ten_catalog: "Bảng kiểm giám sát tuân thủ gói an toàn đặt đường truyền tĩnh mạch trung tâm (Insertion Bundle)"
domain: "Gói can thiệp lâm sàng (Care Bundles)"
jci_mapped: "PCI.02.00 ME 3, PCI.05.00"
dong_nguon: "1415-1472"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [201_HUM, 203_HUM, 204_HUM, 301_CLI, 302_CLI, 304_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "Yêu cầu Bác sĩ thay ngay găng tay vô khuẩn…" }
  - { code: ACT-200, headline: "Yêu cầu Điều dưỡng phụ khẩn cấp đội mũ trùm…" }
  - { code: ACT-200, headline: "Ghi chú cảnh báo vào hồ sơ bệnh án" }
  - { code: ACT-400, headline: "Đình chỉ thủ thuật" }
```

## BM.25.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI AN TOÀN ĐẶT ĐƯỜNG TRUYỀN TĨNH MẠCH TRUNG TÂM (INSERTION BUNDLE \- CLABSI)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ (Người thực hiện thủ thuật) | \[ \] Điều dưỡng (Người phụ/Chuẩn bị dụng cụ)  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh:** Họ tên:...................................................... PID:...........................  
* **Vị trí đặt Catheter:** \[ \] Dưới đòn | \[ \] Cảnh trong | \[ \] Đùi | \[ \] Khác:...................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, Buồng can thiệp mạch...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khoa Hồi sức tích cực (ICU), Lọc máu, Cấp cứu, Bỏng... *(Mặc định thường xuyên áp dụng)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường thực hiện thủ thuật tại giường.  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Giai đoạn Chuẩn bị và Hàng rào vô khuẩn tối đa |
| 1. Thực hiện vệ sinh tay đúng quy định trước thủ thuật. [1] |
| 2. Cả người thực hiện và người phụ đều đội mũ trùm kín tóc và đeo khẩu trang y tế che kín mũi miệng. [1] |
| 3. Người thực hiện mặc áo choàng vô khuẩn và mang găng tay vô khuẩn. [1] |
| 4. Trải săng vô khuẩn kích thước lớn che toàn thân người bệnh (chỉ hở vị trí chọc kim). [1] |
| B. Giai đoạn Thực hiện |
| 5. Sát khuẩn da vùng đặt Catheter bằng dung dịch Chlorhexidine-Cồn (hoặc Povidone-Iodine). [1] |
| 6. Bắt buộc: Chờ da khô hoàn toàn tự nhiên trước khi chọc kim. [1] |
| C. Giai đoạn Kết thúc |
| 7. Băng kín vô khuẩn vị trí đặt ngay sau khi hoàn tất thủ thuật. [1] |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh
* Giải phẫu / bệnh lý đặc thù

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Yêu cầu Bác sĩ thay ngay găng tay vô khuẩn…
* **ACT-200** — Yêu cầu Điều dưỡng phụ khẩn cấp đội mũ trùm…
* **ACT-200** — Ghi chú cảnh báo vào hồ sơ bệnh án
* **ACT-400** — Đình chỉ thủ thuật

**Chữ ký Người giám sát: ....................................... Chữ ký Bác sĩ thực hiện: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.25.03
stt: 20
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI CHĂM SÓC VÀ DUY TRÌ ĐƯỜNG TRUYỀN (MAINTENANCE BUNDLE)"
ten_catalog: "Bảng kiểm giám sát tuân thủ gói chăm sóc và duy trì đường truyền (Maintenance Bundle)"
domain: "Gói can thiệp lâm sàng (Care Bundles)"
jci_mapped: "PCI.02.00 ME 3"
dong_nguon: "1480-1544"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 103_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở và yêu cầu Bác sĩ bổ sung ngay đánh…" }
  - { code: ACT-100, headline: "Yêu cầu Điều dưỡng/Hộ lý xả ngay túi nước…" }
  - { code: ACT-200, headline: "Yêu cầu chuẩn bị dụng cụ và thay ngay băng…" }
  - { code: ACT-200, headline: "Yêu cầu tháo bỏ và thay mới hệ thống dây…" }
  - { code: ACT-200, headline: "Cảnh báo NVYT về việc vệ sinh tay ngay lập…" }
  - { code: ACT-200, headline: "Cảnh báo và yêu cầu treo ngay túi dẫn lưu…" }
  - { code: ACT-200, headline: "Cung cấp ngay bình đong nước tiểu sạch" }
  - { code: ACT-200, headline: "Phản hồi trực tiếp yêu cầu Bác sĩ ghi bổ…" }
  - { code: ACT-400, headline: "Đình chỉ thao tác" }
  - { code: ACT-400, headline: "Đình chỉ thao tác và nhắc nhở nghiêm khắc…" }
```

## BM.25.03

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI CHĂM SÓC VÀ DUY TRÌ ĐƯỜNG TRUYỀN (MAINTENANCE BUNDLE)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ điều trị | \[ \] Điều dưỡng chăm sóc  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh:** Họ tên:...................................................... PID:...........................  
* **Thông tin đường truyền:** \[ \] CVC | \[ \] PICC | \[ \] Buồng tiêm (Port-a-cath) | Số ngày lưu: ............ ngày.  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khoa Hồi sức tích cực (ICU), Lọc máu, Cấp cứu, Bỏng... *(Mặc định thường xuyên áp dụng)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường có lưu đường truyền trung tâm.  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Đánh giá sự cần thiết (Trách nhiệm của Bác sĩ) |
| 1. Bác sĩ có đánh giá sự cần thiết lưu đường truyền tĩnh mạch trung tâm HÀNG NGÀY và ghi chép vào hồ sơ bệnh án? |
| 2. Có kiểm tra, đánh giá các dấu hiệu nhiễm khuẩn (sưng, đỏ, mủ) tại chân catheter hàng ngày? |
| B. Vệ sinh tay và Sát khuẩn cổng nối \- Scrub the Hub (Trách nhiệm của Điều dưỡng) |
| 3. Thực hiện vệ sinh tay TRƯỚC VÀ SAU khi chạm vào đường truyền, thay băng hoặc thao tác trên catheter. |
| 4. Dùng bông/gạc tẩm cồn 70° hoặc Cồn-Chlorhexidine chà xát mạnh cổng nối (Hub) từ 10-15 giây trước mỗi lần bơm thuốc, truyền dịch. |
| 5. Bắt buộc: Chờ cổng nối KHÔ HOÀN TOÀN tự nhiên trước khi kết nối dây truyền/bơm tiêm. |
| C. Chăm sóc chân Catheter và Thay dây truyền (Trách nhiệm của Điều dưỡng) |
| 6. Tình trạng băng dán tại vị trí chân catheter luôn đảm bảo SẠCH, KHÔ, dán KÍN và KHÔNG BONG TRÓC. |
| 7. Băng dán được thay ĐÚNG HẠN (Gạc: Mỗi 2 ngày; Băng trong suốt: Mỗi 7 ngày) HOẶC thay ngay khi bị bẩn, ướt, bong tróc. |
| 8. Tuân thủ tuyệt đối kỹ thuật vô khuẩn (mang găng vô khuẩn, sát khuẩn da bằng Cồn-Chlorhexidine chờ khô) khi thay băng CVC. |
| 9. Dây truyền dịch, chạc 3 được thay đúng thời gian quy định (96h đối với dịch thường; 24h đối với truyền máu, nhũ dịch lipid) và có dán nhãn ngày thay. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Quá tải công việc / nhân sự

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở và yêu cầu Bác sĩ bổ sung ngay đánh…
* **ACT-100** — Yêu cầu Điều dưỡng/Hộ lý xả ngay túi nước…
* **ACT-200** — Yêu cầu chuẩn bị dụng cụ và thay ngay băng…
* **ACT-200** — Yêu cầu tháo bỏ và thay mới hệ thống dây…
* **ACT-200** — Cảnh báo NVYT về việc vệ sinh tay ngay lập…
* **ACT-200** — Cảnh báo và yêu cầu treo ngay túi dẫn lưu…
* **ACT-200** — Cung cấp ngay bình đong nước tiểu sạch
* **ACT-200** — Phản hồi trực tiếp yêu cầu Bác sĩ ghi bổ…
* **ACT-400** — Đình chỉ thao tác
* **ACT-400** — Đình chỉ thao tác và nhắc nhở nghiêm khắc…

**Chữ ký Người giám sát: ....................................... Chữ ký Bác sĩ/Điều dưỡng chăm sóc: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.27.01
stt: 21
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI AN TOÀN ĐẶT ỐNG THÔNG TIỂU (INSERTION BUNDLE - CAUTI)"
ten_catalog: "Bảng kiểm giám sát tuân thủ gói an toàn đặt ống thông tiểu (Insertion Bundle)"
domain: "Gói can thiệp lâm sàng (Care Bundles)"
jci_mapped: "PCI.02.00 ME 3"
dong_nguon: "1552-1612"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [201_HUM, 203_HUM, 204_HUM, 301_CLI, 302_CLI, 304_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Hướng dẫn lại tại chỗ (Coaching) cách dán…" }
  - { code: ACT-200, headline: "Phản hồi trực tiếp với Bác sĩ điều trị để…" }
  - { code: ACT-200, headline: "Yêu cầu thực hiện vệ sinh tay lại ngay lập…" }
  - { code: ACT-200, headline: "Yêu cầu treo ngay túi dẫn lưu thấp hơn bàng…" }
  - { code: ACT-400, headline: "Đình chỉ thủ thuật" }
```

## BM.27.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI AN TOÀN ĐẶT ỐNG THÔNG TIỂU (INSERTION BUNDLE \- CAUTI)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ (Ra y lệnh) | \[ \] Điều dưỡng/Nữ hộ sinh (Người thực hiện đặt)  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh:** Họ tên:...................................................... PID:...........................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khoa Hồi sức tích cực (ICU), Cấp cứu, Lọc máu, Bỏng...  
  * \[x\] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường có chỉ định đặt thông tiểu.  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Đánh giá Chỉ định (Trước khi đặt) |
| 1. Bác sĩ ra y lệnh với chỉ định y khoa rõ ràng (VD: Bí tiểu cấp/tắc nghẽn, theo dõi I/O nghiêm ngặt ở NB nặng, phẫu thuật kéo dài/tiết niệu, hỗ trợ loét cùng cụt độ 3-4...) [1, 2]. |
| 2. Tuyệt đối KHÔNG đặt vì lý do "thuận tiện" cho nhân viên y tế chăm sóc hoặc để lấy mẫu xét nghiệm [1, 2]. |
| B. Chuẩn bị và Hàng rào vô khuẩn |
| 3. Điều dưỡng thực hiện vệ sinh tay TRƯỚC KHI chuẩn bị dụng cụ và TRƯỚC KHI thao tác đặt [1, 2]. |
| 4. Sử dụng bộ dụng cụ đặt thông tiểu vô khuẩn (ưu tiên bộ đóng gói sẵn dùng 1 lần) [1, 2]. |
| 5. Trải săng lỗ vô khuẩn và mang găng tay vô khuẩn đúng kỹ thuật [1, 2]. |
| C. Kỹ thuật đặt và Cố định (Vô khuẩn tuyệt đối) |
| 6. Sát khuẩn kỹ lỗ niệu đạo và vùng sinh dục xung quanh [1, 2]. |
| 7. Chỉ sử dụng gel bôi trơn vô khuẩn (ưu tiên loại gói nhỏ dùng 1 lần) [1, 2]. |
| 8. Đưa ống thông nhẹ nhàng, đảm bảo vô khuẩn tuyệt đối trước khi đưa vào bàng quang [1, 2]. |
| 9. Cố định ống thông an toàn: mặt trong đùi (NB nữ) hoặc bụng dưới (NB nam) bằng băng dính chuyên dụng, tránh kéo căng/gập góc [1, 2]. |
| 10. Kết nối với túi dẫn lưu tạo thành hệ thống KÍN ngay lập tức, đảm bảo túi luôn thấp hơn bàng quang và tuyệt đối không chạm sàn [1, 2]. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh
* Giải phẫu / bệnh lý đặc thù

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Hướng dẫn lại tại chỗ (Coaching) cách dán…
* **ACT-200** — Phản hồi trực tiếp với Bác sĩ điều trị để…
* **ACT-200** — Yêu cầu thực hiện vệ sinh tay lại ngay lập…
* **ACT-200** — Yêu cầu treo ngay túi dẫn lưu thấp hơn bàng…
* **ACT-400** — Đình chỉ thủ thuật

**Chữ ký Người giám sát: ....................................... Chữ ký Bác sĩ/Điều dưỡng thực hiện: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.27.02
stt: 22
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI CHĂM SÓC VÀ DUY TRÌ ỐNG THÔNG TIỂU (MAINTENANCE BUNDLE - CAUTI)"
ten_catalog: "Bảng kiểm giám sát tuân thủ gói chăm sóc và duy trì ống thông tiểu (Maintenance Bundle)"
domain: "Gói can thiệp lâm sàng (Care Bundles)"
jci_mapped: "PCI.02.00 ME 3"
dong_nguon: "1620-1687"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 103_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 302_CLI, 304_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Yêu cầu Điều dưỡng/Hộ lý xả ngay túi nước…" }
  - { code: ACT-200, headline: "Cảnh báo và yêu cầu treo ngay túi dẫn lưu…" }
  - { code: ACT-200, headline: "Cung cấp ngay bình đong nước tiểu sạch" }
  - { code: ACT-200, headline: "Phản hồi trực tiếp yêu cầu Bác sĩ ghi bổ…" }
  - { code: ACT-400, headline: "Đình chỉ thao tác và nhắc nhở nghiêm khắc…" }
```

## BM.27.02

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI CHĂM SÓC VÀ DUY TRÌ ỐNG THÔNG TIỂU (MAINTENANCE BUNDLE \- CAUTI)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ điều trị | \[ \] Điều dưỡng chăm sóc  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh:** Họ tên:...................................................... PID:........................... Số ngày lưu ống thông: ............ ngày.  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khoa Hồi sức tích cực (ICU), Lọc máu, Cấp cứu, Bỏng...  
  * \[x\] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường có người bệnh đặt ống thông tiểu. *(Khu vực thường xuyên áp dụng)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Đánh giá sự cần thiết (Trách nhiệm của Bác sĩ và Điều dưỡng) |
| 1. Bác sĩ đánh giá lại chỉ định và sự cần thiết lưu ống thông tiểu HÀNG NGÀY và ghi rõ vào hồ sơ bệnh án [1-4]. |
| 2. Rút ống thông tiểu ngay lập tức khi không còn chỉ định y khoa [2, 3]. |
| B. Vệ sinh tay và Chăm sóc vùng sinh dục (Trách nhiệm của Điều dưỡng) |
| 3. Thực hiện vệ sinh tay TRƯỚC VÀ SAU khi chạm vào hệ thống dẫn lưu hoặc xả túi nước tiểu [1, 2]. |
| 4. Vệ sinh vùng sinh dục và xung quanh ống thông bằng xà phòng thường và nước sạch 1-2 lần/ngày và sau mỗi lần NB đại tiện [1, 2, 4, 5]. |
| 5. Bắt buộc: KHÔNG sử dụng dung dịch sát khuẩn (như Povidone-Iodine) để vệ sinh vùng sinh dục thường quy [2, 5]. |
| C. Duy trì hệ thống dẫn lưu kín và thông suốt (Trách nhiệm của Điều dưỡng) |
| 6. Hệ thống dẫn lưu được duy trì liên tục, KÍN hoàn toàn (TUYỆT ĐỐI KHÔNG ngắt kết nối ống thông và túi dẫn lưu trừ khi có chỉ định đặc biệt) [1-4]. |
| 7. Lấy mẫu nước tiểu qua cổng chuyên dụng đã được sát khuẩn, KHÔNG lấy mẫu từ túi dẫn lưu [2, 3]. |
| 8. Ống thông được cố định an toàn, dây dẫn không gập góc, không bị NB nằm đè lên để đảm bảo dòng chảy thông suốt [1, 2]. |
| 9. Túi dẫn lưu luôn giữ THẤP HƠN mức bàng quang và TUYỆT ĐỐI KHÔNG để chạm sàn [2, 5]. |
| D. Xả túi dẫn lưu (Trách nhiệm của Điều dưỡng / Hộ lý) |
| 10. Xả túi dẫn lưu khi đầy 2/3, sử dụng bình chứa riêng biệt và sạch cho từng người bệnh [1, 2, 4, 5]. |
| 11. Tránh tuyệt đối không để vòi xả của túi chạm vào thành bình chứa khi xả nước tiểu [2, 4]. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Hành vi / tâm lý người bệnh
* Giải phẫu / bệnh lý đặc thù

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Yêu cầu Điều dưỡng/Hộ lý xả ngay túi nước…
* **ACT-200** — Cảnh báo và yêu cầu treo ngay túi dẫn lưu…
* **ACT-200** — Cung cấp ngay bình đong nước tiểu sạch
* **ACT-200** — Phản hồi trực tiếp yêu cầu Bác sĩ ghi bổ…
* **ACT-400** — Đình chỉ thao tác và nhắc nhở nghiêm khắc…

**Chữ ký Người giám sát: ....................................... Chữ ký Bác sĩ/Điều dưỡng chăm sóc: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.26.01
stt: 23
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI PHÒNG NGỪA VIÊM PHỔI THỞ MÁY (VAP BUNDLE)"
ten_catalog: "Bảng kiểm giám sát tuân thủ gói phòng ngừa viêm phổi thở máy (VAP)"
domain: "Gói can thiệp lâm sàng (Care Bundles)"
jci_mapped: "PCI.02.00 ME 3"
dong_nguon: "1695-1760"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 103_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI, 304_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Hướng dẫn lại tại chỗ (Coaching) kỹ thuật đổ…" }
  - { code: ACT-100, headline: "Nhắc nhở trực tiếp và yêu cầu Bác sĩ bổ sung…" }
  - { code: ACT-200, headline: "Yêu cầu Điều dưỡng lập tức điều chỉnh nâng…" }
  - { code: ACT-200, headline: "Yêu cầu NVYT lấy bàn chải mềm thực hiện lại…" }
  - { code: ACT-300, headline: "Bổ sung khẩn cấp bộ dụng cụ chăm sóc răng miệng" }
```

## BM.26.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI PHÒNG NGỪA VIÊM PHỔI THỞ MÁY (VAP BUNDLE)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ điều trị | \[ \] Điều dưỡng chăm sóc | \[ \] Chuyên viên VLTL  
* **Thông tin người bệnh:** Họ tên:...................................................... PID:........................... Số ngày thở máy: ............ ngày.  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khoa Hồi sức tích cực (ICU), Cấp cứu, Lọc máu, Bỏng... *(Mặc định thường xuyên áp dụng)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường.  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Tư thế và Đánh giá cai máy (Bác sĩ / Điều dưỡng) |
| 1. Nâng đầu giường 30° \- 45° liên tục (trừ khi có chống chỉ định y khoa, huyết động). |
| 2. Đánh giá Thử nghiệm thức tỉnh tự phát (SAT \- Quản lý an thần) hàng ngày và ghi hồ sơ. |
| 3. Đánh giá Thử nghiệm thở tự phát (SBT \- Cai máy) hàng ngày và ghi hồ sơ. |
| 4. Có chỉ định và thực hiện vận động sớm / Phục hồi chức năng hô hấp. |
| 5. Thực hiện dinh dưỡng đường tiêu hóa sớm (trong 24-48h sau đặt ống) nếu không có chống chỉ định. |
| B. Vệ sinh răng miệng (VSRM) |
| 6. Thực hiện VSRM toàn diện bằng phương pháp chải răng cơ học (dùng bàn chải mềm) 2-3 lần/ngày. |
| 7. Sử dụng nước muối sinh lý 0.9% hoặc nước súc miệng không cồn (Không dùng Chlorhexidine thường quy cho NB thở máy, trừ phẫu thuật tim). |
| C. Quản lý hệ thống thiết bị thở và Hút đờm |
| 8. Duy trì và kiểm tra áp lực bóng chèn (Cuff pressure) đạt 20 \- 30 cmH2O (kiểm tra mỗi 8 giờ). |
| 9. Có thực hiện hút dịch hạ thanh môn liên tục (áp lực thấp) hoặc ngắt quãng (nếu dùng ống NKQ có cổng hút chuyên dụng). |
| 10. Chỉ hút đờm khi có chỉ định lâm sàng (không hút định kỳ). Ưu tiên hệ thống hút kín cho NB nguy cơ lây nhiễm cao. |
| 11. Dây máy thở và bẫy nước luôn được giữ sạch; nước đọng được đổ đúng cách, TUYỆT ĐỐI KHÔNG để dốc ngược nước chảy vào phổi NB khi xoay trở. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Giải phẫu / bệnh lý đặc thù

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Hướng dẫn lại tại chỗ (Coaching) kỹ thuật đổ…
* **ACT-100** — Nhắc nhở trực tiếp và yêu cầu Bác sĩ bổ sung…
* **ACT-200** — Yêu cầu Điều dưỡng lập tức điều chỉnh nâng…
* **ACT-200** — Yêu cầu NVYT lấy bàn chải mềm thực hiện lại…
* **ACT-300** — Bổ sung khẩn cấp bộ dụng cụ chăm sóc răng miệng

**Chữ ký Người giám sát: ....................................... Chữ ký Bác sĩ/Điều dưỡng chăm sóc: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.24.02
stt: 24
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI PHÒNG NGỪA NHIỄM KHUẨN VẾT MỔ (SSI BUNDLE)"
ten_catalog: "Bảng kiểm giám sát tuân thủ gói phòng ngừa nhiễm khuẩn vết mổ (SSI)"
domain: "Gói can thiệp lâm sàng (Care Bundles)"
jci_mapped: "PCI.02.00 ME 3"
dong_nguon: "1768-1839"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI, 304_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở Bác sĩ Gây mê/Điều dưỡng kiểm tra…" }
  - { code: ACT-200, headline: "Yêu cầu người không có nhiệm vụ ra ngoài và…" }
  - { code: ACT-200, headline: "Yêu cầu Điều dưỡng tại khoa Hồi sức/Ngoại…" }
  - { code: ACT-400, headline: "Đình chỉ thủ thuật" }
  - { code: ACT-400, headline: "Đình chỉ ngay việc sử dụng dao cạo lông vũ…" }
```

## BM.24.02

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI PHÒNG NGỪA NHIỄM KHUẨN VẾT MỔ (SSI BUNDLE)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối) \[1-3\]  
* **Khoa/Phòng/Khu vực:** .................................................................................... \[1-3\]  
* **Người giám sát:** .................................................................................... \[1-3\]  
* **Đối tượng được giám sát:** \[ \] Bác sĩ phẫu thuật | \[ \] Bác sĩ Gây mê | \[ \] Điều dưỡng vòng trong/ngoài | \[ \] Điều dưỡng chăm sóc hậu phẫu \[4\]  
* **Họ tên đối tượng được giám sát:** .................................................................................... \[1-3\]  
* **Thông tin người bệnh:** Họ tên:...................................................... PID:........................... \[4\]  
* **Loại phẫu thuật:** .................................................................................... \[4\]  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[x\] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn... *(Khu vực tiến hành phẫu thuật)* \[1-3\]  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khoa Hồi sức tích cực (ICU), Cấp cứu, Bỏng... \[1-3\]  
  * \[x\] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú ngoại khoa, khu vực chăm sóc hậu phẫu... *(Khu vực chăm sóc vết mổ)* \[1-3\]  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên... \[1-3\]

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Giai đoạn Trước phẫu thuật (Pre-op) |
| 1. Người bệnh (NB) được sàng lọc/khử khuẩn *S. aureus* (áp dụng cho phẫu thuật nguy cơ cao). |
| 2. NB được tắm bằng xà phòng (thường/kháng khuẩn) trước mổ. |
| 3. Tuyệt đối KHÔNG cạo lông vùng mổ bằng dao cạo (chỉ dùng tông đơ nếu thực sự cần thiết). |
| 4. Kháng sinh dự phòng (KSDP) được tiêm trong vòng 60-120 phút trước khi rạch da. |
| 5. Đường huyết NB được kiểm soát tốt (\<180-200 mg/dL). |
| B. Giai đoạn Trong phẫu thuật (Giám sát tại Phòng mổ) |
| 6. Kíp mổ tuân thủ vệ sinh tay ngoại khoa (đủ thời gian, kỹ thuật). |
| 7. Sát khuẩn da vùng mổ cho NB bằng dung dịch chứa cồn (ưu tiên Cồn-Chlorhexidine/Iodine). |
| 8. Bắt buộc: Chờ da sát khuẩn KHÔ HOÀN TOÀN tự nhiên trước khi rạch da. |
| 9. Môi trường phòng mổ được kiểm soát: Cửa luôn đóng kín, hạn chế tối đa người ra vào. |
| 10. Bổ sung liều KSDP trong mổ (nếu ca mổ kéo dài \> 2 thời gian bán thải của thuốc hoặc mất máu \> 1500ml). |
| 11. NB được duy trì thân nhiệt ở mức bình thường (\> 36°C). |
| 12. NB được duy trì FiO2 \> 80% (nếu có thở máy). |
| C. Giai đoạn Sau phẫu thuật (Giám sát tại khoa Nội trú/Hồi sức) |
| 13. Vết mổ được băng kín, giữ khô ráo trong 24-48 giờ đầu tiên. |
| 14. Nhân viên y tế (NVYT) tuân thủ vệ sinh tay và kỹ thuật vô khuẩn tuyệt đối khi thay băng vết mổ. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Giải phẫu / bệnh lý đặc thù

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở Bác sĩ Gây mê/Điều dưỡng kiểm tra…
* **ACT-200** — Yêu cầu người không có nhiệm vụ ra ngoài và…
* **ACT-200** — Yêu cầu Điều dưỡng tại khoa Hồi sức/Ngoại…
* **ACT-400** — Đình chỉ thủ thuật
* **ACT-400** — Đình chỉ ngay việc sử dụng dao cạo lông vũ…

**Chữ ký Người giám sát: ....................................... Chữ ký Bác sĩ phẫu thuật/ĐD vòng ngoài: ....................................... \[5\]**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.11.01
stt: 25
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ VỆ SINH MÔI TRƯỜNG BỀ MẶT"
ten_catalog: "Bảng kiểm giám sát tuân thủ VSMT bề mặt"
domain: "Môi trường & Hạ tầng (EVS & Facility)"
jci_mapped: "PCI.04.00, QPS.03.04"
dong_nguon: "1847-1911"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 103_SYS, 105_SYS, 106_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "Cảnh báo và yêu cầu đổi ngay xô/giẻ lau nếu…" }
  - { code: ACT-200, headline: "Yêu cầu đổ bỏ dung dịch hóa chất và pha lại…" }
  - { code: ACT-200, headline: "Trực tiếp yêu cầu nhân viên vệ sinh/điều…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên vệ sinh lập tức đặt biển…" }
  - { code: ACT-400, headline: "Đình chỉ thao tác quét khô trong buồng bệnh" }
```

## BM.11.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ VỆ SINH MÔI TRƯỜNG BỀ MẶT**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ...................................................... **Phòng/Giường số:** ...................  
* **Người giám sát:** ......................................................................................................  
* **Đối tượng được giám sát:** \[ \] Nhân viên vệ sinh (Công ty/Bệnh viện) | \[ \] Điều dưỡng (Vệ sinh thiết bị y tế)  
* **Họ tên đối tượng được giám sát:** ......................................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực Cấp cứu, Hồi sức tích cực, Lọc máu, Phòng cách ly bệnh truyền nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Quy trình và An toàn chung |
| 1. Nhân viên vệ sinh mang đúng phương tiện phòng hộ (găng tay cao su, khẩu trang, tạp dề...). |
| 2. Có đặt biển cảnh báo "Sàn ướt/Trơn trượt" khi tiến hành lau sàn. |
| 3. Hóa chất khử khuẩn pha đúng nồng độ, có dán nhãn (tên hóa chất, ngày pha). |
| 4. Tuân thủ tuyệt đối quy định Mã màu dụng cụ (Không dùng chung xô/giẻ lau phòng bệnh với nhà vệ sinh). |
| 5. Lau đúng nguyên tắc: Từ sạch đến bẩn, từ trên xuống dưới, theo đường Ziczac (tuyệt đối không quét khô ở khu vực điều trị). |
| B. Vệ sinh Bề mặt tiếp xúc thường xuyên (Trách nhiệm Nhân viên vệ sinh) |
| 6. Thanh chắn giường (cả 4 mặt) và bàn ăn tại giường sạch bụi, không vết bẩn. |
| 7. Tay nắm cửa, công tắc điện, nút bấm thang máy, tay vịn hành lang sạch sẽ. |
| 8. Nhà vệ sinh (Bồn rửa tay, bồn cầu, tay xịt, sàn nhà) sạch, không có mùi hôi. |
| 9. Sàn nhà buồng bệnh và hành lang chung sạch rác, không vết bẩn. |
| C. Vệ sinh Thiết bị y tế (Trách nhiệm Điều dưỡng) |
| 10. Điều dưỡng thực hiện lau khử khuẩn thiết bị (ống nghe, huyết áp kế...) giữa các người bệnh. |
| 11. Bề mặt Monitor, Bơm tiêm điện, Máy thở sạch sẽ (không bám bụi/máu). |
| 12. Sử dụng đúng loại cồn 70° (hoặc khăn tẩm hóa chất tương thích riêng) để lau thiết bị điện tử. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình
* Giao tiếp / bàn giao kém

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Cảnh báo và yêu cầu đổi ngay xô/giẻ lau nếu…
* **ACT-200** — Yêu cầu đổ bỏ dung dịch hóa chất và pha lại…
* **ACT-200** — Trực tiếp yêu cầu nhân viên vệ sinh/điều…
* **ACT-200** — Yêu cầu nhân viên vệ sinh lập tức đặt biển…
* **ACT-400** — Đình chỉ thao tác quét khô trong buồng bệnh

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.QĐ.12.01
stt: 26
ten_trong_form: "BẢNG KIỂM GIÁM SÁT VỆ SINH VÀ KHỬ KHUẨN LỒNG ẤP/GIƯỜNG SƯỞI SƠ SINH"
ten_catalog: "Bảng kiểm giám sát vệ sinh và khử khuẩn lồng ấp/giường sưởi sơ sinh"
domain: "Môi trường & Hạ tầng (EVS & Facility)"
jci_mapped: "PCI.03.00, PCI.04.00"
dong_nguon: "1919-1984"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 103_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở và yêu cầu Điều dưỡng/Người nhà Vệ…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên lấy khăn ẩm thấm nước sạch…" }
  - { code: ACT-200, headline: "Yêu cầu đổ bỏ ngay nước trong bình làm ẩm và…" }
  - { code: ACT-200, headline: "Cung cấp bút và nhãn dán" }
  - { code: ACT-400, headline: "Đình chỉ ngay lập tức" }
```

## BM.QĐ.12.01

**BẢNG KIỂM GIÁM SÁT VỆ SINH VÀ KHỬ KHUẨN LỒNG ẤP/GIƯỜNG SƯỞI SƠ SINH**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** Đơn vị Hồi sức Sơ sinh (NICU) \- Khoa Sản/Nhi  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Điều dưỡng sơ sinh | \[ \] Hộ lý/Nhân viên vệ sinh  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin Thiết bị:** Mã số Lồng ấp/Giường sưởi: .........................  
  * \[ \] Đang có bệnh nhi nằm (Vệ sinh hàng ngày) | \[ \] Trống (Vệ sinh chuyển tiếp/Cuối ca)  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực Hồi sức tích cực sơ sinh (NICU), Cấp cứu, Lọc máu, Phòng cách ly... *(Mặc định cho quy trình này)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Vệ sinh hàng ngày (Khi bệnh nhi đang nằm trong lồng ấp) |
| 1. Nhân viên thực hiện Vệ sinh tay (cồn/xà phòng) TRƯỚC và SAU khi chạm vào bề mặt lồng ấp/giường sưởi (Coi lồng ấp là môi trường vi khí hậu của người bệnh). |
| 2. Lau sạch bụi, vết bẩn bề mặt BÊN NGOÀI lồng ấp (tay cầm cửa sổ, màn hình, nút bấm) bằng hóa chất an toàn. |
| 3. Lỗi nghiêm trọng: TUYỆT ĐỐI KHÔNG sử dụng hóa chất khử khuẩn để lau/xịt vào bề mặt BÊN TRONG lồng ấp/giường sưởi khi bệnh nhi đang nằm. |
| B. Vệ sinh chuyển tiếp / Cuối ca (Giữa 2 bệnh nhi) |
| 4. Bệnh nhi được chuyển ra ngoài an toàn trước khi tiến hành vệ sinh tổng thể bên trong lồng ấp. |
| 5. Tháo rời các bộ phận (đệm, khay nước, ống nối) để cọ rửa làm sạch màng sinh học. |
| 6. Nếu dùng hóa chất khử khuẩn (Tuyệt đối không dùng nhóm Phenolic cho sơ sinh), BẮT BUỘC phải tráng/lau lại thật kỹ bề mặt bằng nước sạch. |
| 7. Bề mặt bên trong lồng ấp phải được để KHÔ HOÀN TOÀN trước khi đón bệnh nhi mới vào nằm. |
| 8. Thay nước bình làm ẩm (nếu có) bằng nước vô khuẩn (nước cất/nước RO tiệt khuẩn). Tuyệt đối không dùng nước máy sinh hoạt. |
| C. Quản lý, PTPH và Dấu hiệu nhận biết |
| 9. Nhân viên mang đầy đủ phương tiện phòng hộ (găng tay, khẩu trang, tạp dề) khi thực hiện vệ sinh lồng ấp bẩn. |
| 10. Có dán nhãn "ĐÃ VỆ SINH" (Ghi rõ ngày, giờ, người làm) lên lồng ấp/giường sưởi sau khi hoàn tất quy trình để sẵn sàng sử dụng. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở và yêu cầu Điều dưỡng/Người nhà Vệ…
* **ACT-200** — Yêu cầu nhân viên lấy khăn ẩm thấm nước sạch…
* **ACT-200** — Yêu cầu đổ bỏ ngay nước trong bình làm ẩm và…
* **ACT-200** — Cung cấp bút và nhãn dán
* **ACT-400** — Đình chỉ ngay lập tức

**Chữ ký Người giám sát: ....................................... Chữ ký Điều dưỡng trưởng NICU/Người được giám sát: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.QĐ.20.01
stt: 27
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KIỂM SOÁT CHẤT LƯỢNG NƯỚC (LỌC MÁU VÀ NHA KHOA)"
ten_catalog: "Bảng kiểm giám sát tuân thủ kiểm soát chất lượng nước (Lọc máu và Nha khoa)"
domain: "Môi trường & Hạ tầng (EVS & Facility)"
jci_mapped: "FMS.08.02, FMS.08.03"
dong_nguon: "1992-2053"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 104_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 205_HUM]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở và yêu cầu Điều dưỡng/Bác sĩ nha…" }
  - { code: ACT-200, headline: "Yêu cầu thực hiện quy trình khử khuẩn sốc…" }
  - { code: ACT-200, headline: "Yêu cầu Kỹ sư/Điều dưỡng hoàn thiện ngay…" }
  - { code: ACT-400, headline: "Đình chỉ hệ thống ngay lập tức" }
  - { code: ACT-400, headline: "Đình chỉ thao tác phẫu thuật nha khoa" }
```

## BM.QĐ.20.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ KIỂM SOÁT CHẤT LƯỢNG NƯỚC (LỌC MÁU VÀ NHA KHOA)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Khu vực:** \[ \] Đơn vị Lọc máu (Thận nhân tạo) | \[ \] Khoa Răng Hàm Mặt (Nha khoa)  
* **Hệ thống/Ghế máy số:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Kỹ sư vận hành RO | \[ \] Bác sĩ Nha khoa | \[ \] Điều dưỡng/Kỹ thuật viên  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng phẫu thuật Răng Hàm Mặt (Cấy ghép Implant, nhổ răng khôn...).  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Đơn vị Lọc máu (Hệ thống xử lý nước RO, khu vực chạy thận).  
  * \[x\] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Phòng khám Nha khoa thông thường (Ghế nha khoa).  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Khu vực hành chính, phòng chờ.

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Giám sát Hệ thống nước RO (Đơn vị Lọc máu) |
| 1. Kiểm tra hóa lý (Test nhanh Clo dư, độ cứng) được thực hiện HÀNG NGÀY trước ca lọc máu đầu tiên và ghi chép đầy đủ (Đảm bảo Clo dư *le* 0.1 mg/L). |
| 2. Lấy mẫu xét nghiệm vi sinh và nội độc tố (Endotoxin) định kỳ (tối thiểu 1 tháng/lần) đúng kỹ thuật vô khuẩn tại các điểm lấy mẫu quy định. |
| 3. Kết quả vi sinh đạt tiêu chuẩn an toàn: Tổng vi khuẩn $\&lt; 100$ CFU/ml và Nội độc tố $\&lt; 0.25$ EU/ml. |
| 4. Hệ thống phân phối nước RO được khử khuẩn định kỳ theo đúng quy định và hướng dẫn của nhà sản xuất màng lọc. |
| B. Giám sát Hệ thống nước Ghế Nha khoa (Khoa RHM) |
| 5. Sử dụng nguồn nước đạt chuẩn nước uống ( *le*500 CFU/mL vi khuẩn dị dưỡng) cho bình chứa nước độc lập của ghế nha. |
| 6. Thực hiện xả đường ống nước (Flushing) tối thiểu 2 phút vào đầu ngày làm việc. |
| 7. Thực hiện xả đường ống nước (từ tay khoan, tay xịt hơi/nước, máy lấy cao răng) từ 20 \- 30 giây GIỮA CÁC NGƯỜI BỆNH. |
| 8. Bắt buộc: TUYỆT ĐỐI KHÔNG dùng nước từ ghế nha khoa cho các phẫu thuật xâm lấn (cắt xương, implant). Phải dùng nước/nước muối vô khuẩn với thiết bị bơm rửa vô khuẩn riêng biệt. |
| 9. Có thực hiện khử khuẩn đường ống (Shock treatment) định kỳ bằng hóa chất chuyên dụng để diệt màng sinh học (Biofilm). |
| C. Hồ sơ và Xử lý sự cố |
| 10. Dừng ngay hệ thống, tiến hành khắc phục (khử khuẩn đường ống/thay lọc) và lấy mẫu xét nghiệm lại khi phát hiện kết quả nước không đạt chuẩn. Chỉ hoạt động lại khi kết quả ĐẠT. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Lỗi thiết bị / hỏng hóc
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Hành vi liều lĩnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở và yêu cầu Điều dưỡng/Bác sĩ nha…
* **ACT-200** — Yêu cầu thực hiện quy trình khử khuẩn sốc…
* **ACT-200** — Yêu cầu Kỹ sư/Điều dưỡng hoàn thiện ngay…
* **ACT-400** — Đình chỉ hệ thống ngay lập tức
* **ACT-400** — Đình chỉ thao tác phẫu thuật nha khoa

**Chữ ký Người giám sát: ....................................... Chữ ký Kỹ sư / Đại diện Khoa: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.13.01
stt: 28
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUẢN LÝ VÀ GIẶT LÀ ĐỒ VẢI Y TẾ"
ten_catalog: "Bảng kiểm giám sát tuân thủ quản lý và giặt là đồ vải y tế"
domain: "Môi trường & Hạ tầng (EVS & Facility)"
jci_mapped: "PCI.04.01"
dong_nguon: "2061-2126"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 104_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở và yêu cầu dừng ngay lập tức hành…" }
  - { code: ACT-200, headline: "Yêu cầu phân loại lại tại chỗ nếu phát hiện…" }
  - { code: ACT-200, headline: "Yêu cầu dùng tấm nilon/vải sạch che đậy kín…" }
  - { code: ACT-200, headline: "Dừng vận hành máy giặt và báo cáo khoa Trang…" }
  - { code: ACT-500, headline: "Lập biên bản báo cáo sự cố an toàn (Incident…" }
```

## BM.13.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUẢN LÝ VÀ GIẶT LÀ ĐỒ VẢI Y TẾ**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Điều dưỡng (Khoa LS) | \[ \] Nhân viên thu gom | \[ \] Nhân viên Đơn vị Giặt là  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Không áp dụng.  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu bẩn (Tiếp nhận/phân loại/giặt), Khoa Cấp cứu, Hồi sức tích cực, Phòng cách ly...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Khu sạch (Sấy/là/gấp), Buồng bệnh nội trú thông thường...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Phân loại tại nguồn (Tại Khoa lâm sàng) |
| 1. TUYỆT ĐỐI KHÔNG giũ, tung đồ vải bẩn tại nơi phát sinh (phòng bệnh, hành lang) để tránh phát tán mầm bệnh. |
| 2. Đồ vải lây nhiễm (dính máu/dịch, hoặc từ phòng cách ly) bỏ vào túi VÀNG. Đồ vải thông thường bỏ vào túi XANH. |
| 3. Kiểm tra kỹ, TUYỆT ĐỐI KHÔNG để lẫn vật sắc nhọn (kim tiêm, dao mổ) hoặc chất thải rắn vào trong đồ vải. |
| B. Thu gom và Vận chuyển nội viện |
| 4. Chỉ thu gom khi túi chứa đầy tối đa 3/4 thể tích; buộc chặt miệng túi ngay tại khoa (không nén, ép túi). |
| 5. Xe vận chuyển đồ bẩn phải kín, có nắp đậy, không rò rỉ và dán nhãn "ĐỒ VẢI BẨN". TUYỆT ĐỐI KHÔNG dùng chung xe bẩn và xe sạch. |
| C. Xử lý tại Đơn vị Giặt là (Khu bẩn *rightarrow* Khu sạch) |
| 6. Tuân thủ phân luồng một chiều (Bẩn *rightarrow* Sạch). Nhân viên khu bẩn mang đầy đủ PTPH (găng tay, tạp dề, ủng, khẩu trang, kính). |
| 7. Đồ vải lây nhiễm phải được giặt bằng chu trình khử khuẩn (Nhiệt độ $\ge 71^\circ C$ trong tối thiểu 25 phút hoặc dùng hóa chất khử khuẩn chuẩn). |
| 8. Đồ vải được nạp vào máy giặt đúng tải trọng (không quá tải), máy móc hoạt động đúng thông số kỹ thuật. |
| D. Hoàn thiện, Lưu trữ và Cấp phát (Khu sạch) |
| 9. Nhân viên khu sạch mặc đồng phục sạch, thực hiện vệ sinh tay. Đồ vải sạch sau giặt không bị rách, không còn vết bẩn. |
| 10. Đồ vải sạch được cất giữ trên giá kệ (cách sàn, tường) và bắt buộc che đậy kín (trong tủ hoặc xe có nắp/vải bọc) suốt quá trình lưu giữ, vận chuyển về khoa (tuân thủ FIFO/FEFO). |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Lỗi thiết bị / hỏng hóc

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở và yêu cầu dừng ngay lập tức hành…
* **ACT-200** — Yêu cầu phân loại lại tại chỗ nếu phát hiện…
* **ACT-200** — Yêu cầu dùng tấm nilon/vải sạch che đậy kín…
* **ACT-200** — Dừng vận hành máy giặt và báo cáo khoa Trang…
* **ACT-500** — Lập biên bản báo cáo sự cố an toàn (Incident…

**Chữ ký Người giám sát: ....................................... Chữ ký Nhân viên Khoa LS/ĐV Giặt là: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.12.01
stt: 29
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUẢN LÝ CHẤT THẢI Y TẾ"
ten_catalog: "Bảng kiểm giám sát tuân thủ quản lý chất thải y tế"
domain: "Môi trường & Hạ tầng (EVS & Facility)"
jci_mapped: "PCI.05.00, FMS.05.00"
dong_nguon: "2134-2205"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 201_HUM, 203_HUM, 204_HUM, 205_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "Cảnh báo và yêu cầu nhân viên y tế/vệ sinh…" }
  - { code: ACT-200, headline: "Cung cấp ngay hộp kháng thủng thay thế và…" }
  - { code: ACT-200, headline: "Tạm dừng xe vận chuyển rác nếu phát hiện xe…" }
  - { code: ACT-400, headline: "Đình chỉ thao tác thu gom và yêu cầu Nhân…" }
  - { code: ACT-500, headline: "Báo cáo Trưởng khoa và lập biên bản sự cố…" }
```

## BM.12.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUẢN LÝ CHẤT THẢI Y TẾ**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Nhân viên y tế (Người phân loại) | \[ \] Nhân viên vệ sinh (Người thu gom/vận chuyển)  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khoa Cấp cứu, Hồi sức tích cực, Phòng cách ly bệnh truyền nhiễm, Kho chứa chất thải lây nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Phân loại tại nguồn (Quan sát tại điểm phát sinh) |
| 1. Có đủ các loại thùng/túi (Vàng, Đen, Trắng, Xanh) tại vị trí quy định. |
| 2. Thùng/túi đúng màu sắc, có biểu tượng/cảnh báo theo đúng quy định. |
| 3. Thùng rác có nắp đậy (ưu tiên nắp đạp chân), sạch sẽ bên ngoài, không rò rỉ. |
| 4. Thùng VÀNG (Lây nhiễm): Tuyệt đối KHÔNG chứa rác sinh hoạt, vỏ hộp cơm, chai nước nhựa. |
| 5. Thùng XANH (Sinh hoạt): Tuyệt đối KHÔNG chứa rác lây nhiễm (bông, gạc dính máu/dịch). |
| 6. Hộp kháng thủng (Sắc nhọn): Có sẵn, đúng vị trí, KHÔNG đầy quá vạch 3/4. |
| 7. Hộp sắc nhọn chỉ chứa vật sắc nhọn, KHÔNG chứa các rác thải khác (vỏ bơm tiêm bằng nhựa, bông gạc). |
| B. Thu gom tại khoa (Quan sát Nhân viên vệ sinh) |
| 8. NVVS mang đầy đủ PTPH (găng tay cao su dày, khẩu trang, tạp dề) khi thu gom. |
| 9. Túi rác được buộc chặt cổ túi (hình cổ cò) trước khi vận chuyển khỏi phòng bệnh. |
| 10. Hộp sắc nhọn được khóa nắp an toàn chặt chẽ khi thu gom mang đi. |
| 11. Chất thải được thu gom đúng tần suất, không để lưu lại khoa phòng quá 48 giờ. |
| 12. Thùng rác tại chỗ được vệ sinh sạch sẽ ngay sau khi lấy túi rác ra. |
| C. Vận chuyển và Lưu giữ (Quan sát khu vực chung/Kho rác) |
| 13. Xe vận chuyển rác là xe chuyên dụng: có nắp đậy kín, thành cứng, không rò rỉ nước. |
| 14. Vận chuyển đúng luồng tuyến, đúng giờ quy định (tránh giờ thăm bệnh, giao ca). |
| 15. Khu lưu giữ tập trung có khóa cửa, phân chia rõ ràng các khu vực (Lây nhiễm, Sinh hoạt, Nguy hại). |
| 16. Khu lưu giữ chất thải lây nhiễm đảm bảo thời gian (\<48h) hoặc có kho lạnh lưu trữ đạt chuẩn. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Hành vi liều lĩnh

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Cảnh báo và yêu cầu nhân viên y tế/vệ sinh…
* **ACT-200** — Cung cấp ngay hộp kháng thủng thay thế và…
* **ACT-200** — Tạm dừng xe vận chuyển rác nếu phát hiện xe…
* **ACT-400** — Đình chỉ thao tác thu gom và yêu cầu Nhân…
* **ACT-500** — Báo cáo Trưởng khoa và lập biên bản sự cố…

**Chữ ký Người giám sát: ....................................... Chữ ký Người được giám sát (NVYT/NVVS): .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.QĐ.08.01
stt: 30
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ THEO DÕI ÁP SUẤT PHÒNG CÁCH LY ÁP LỰC ÂM (AIIR)"
ten_catalog: "Bảng kiểm giám sát tuân thủ theo dõi áp suất phòng cách ly áp lực âm (AIIR)"
domain: "Môi trường & Hạ tầng (EVS & Facility)"
jci_mapped: "PCI.07.00 ME 3, FMS.08.04"
dong_nguon: "2213-2276"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 104_SYS, 201_HUM, 203_HUM, 204_HUM, 302_CLI]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở người bệnh/người nhà và lập tức…" }
  - { code: ACT-100, headline: "Hướng dẫn lại tại chỗ (Coaching) cho NVYT…" }
  - { code: ACT-200, headline: "Yêu cầu Điều dưỡng phụ trách ca trực thực…" }
  - { code: ACT-200, headline: "Báo cáo khẩn cấp cho phòng Hành chính Quản…" }
  - { code: ACT-200, headline: "*le*−2.5 Pa) hoặc quạt hút không hoạt động." }
  - { code: ACT-200, headline: "Treo biển \"Phòng lỗi - Không sử dụng\" và…" }
```

## BM.QĐ.08.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ THEO DÕI ÁP SUẤT PHÒNG CÁCH LY ÁP LỰC ÂM (AIIR)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Phòng AIIR số:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Điều dưỡng trưởng/Điều dưỡng ca trực | \[ \] Kỹ sư/Nhân viên bảo trì HVAC  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh đang lưu trú (Bệnh lý lây qua đường không khí):** \[ \] Lao phổi | \[ \] Sởi | \[ \] Thủy đậu | \[ \] Tác nhân mới nổi (COVID-19...)  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Phòng cách ly bệnh truyền nhiễm lây qua đường không khí (AIIR), Khu vực Cấp cứu, Hồi sức tích cực...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Giám sát hệ thống thông khí & Vận hành (Hàng ngày) |
| 1. Cửa phòng AIIR được giữ ĐÓNG KÍN liên tục (ngoại trừ lúc NVYT ra/vào phòng). |
| 2. Hệ thống thông khí (áp suất âm) đang được duy trì hoạt động 24/7. |
| 3. Đồng hồ đo chênh lệch áp suất (Manometer) hiển thị áp suất âm đạt chuẩn: *le*−2.5 Pa (hoặc \-0.01 inch water gauge). |
| 4. Nếu không có đồng hồ điện tử, có thực hiện kiểm tra hướng luồng khí bằng trực quan (test khói \- smoke tubes, dải ruy băng, giấy mỏng) để đảm bảo không khí chỉ hút vào trong phòng. |
| 5. Bắt buộc: Điều dưỡng thực hiện kiểm tra và ghi chép vào "Sổ theo dõi kiểm tra áp suất phòng AIIR" hàng ngày vào đầu ca sáng. |
| B. Giám sát thiết kế và bảo trì định kỳ (Trách nhiệm Khoa Kỹ thuật/KSNK) |
| 6. Đảm bảo số lần trao đổi khí (ACH) đạt *ge*12 lần/giờ (với phòng mới/cải tạo) hoặc *ge*6 lần/giờ (với phòng cũ). |
| 7. Khí thải từ phòng AIIR được dẫn trực tiếp ra ngoài trời (vị trí an toàn) hoặc bắt buộc đi qua màng lọc HEPA nếu tái tuần hoàn vào hệ thống chung. |
| 8. Đèn cực tím (UV-C) tầng trên (nếu có lắp đặt bổ trợ) hoạt động tốt, được bảo trì cường độ tia định kỳ (6 tháng/lần). |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Lỗi thiết bị / hỏng hóc

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở người bệnh/người nhà và lập tức…
* **ACT-100** — Hướng dẫn lại tại chỗ (Coaching) cho NVYT…
* **ACT-200** — Yêu cầu Điều dưỡng phụ trách ca trực thực…
* **ACT-200** — Báo cáo khẩn cấp cho phòng Hành chính Quản…
* **ACT-200** — *le*−2.5 Pa) hoặc quạt hút không hoạt động.
* **ACT-200** — Treo biển "Phòng lỗi - Không sử dụng" và…

**Chữ ký Người giám sát: ....................................... Chữ ký Điều dưỡng trưởng / Kỹ sư: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.QĐ.02.01
stt: 31
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TẠI KHU VỰC PHẪU THUẬT / PHÒNG MỔ"
ten_catalog: "Bảng kiểm giám sát tuân thủ KSNK tại khu vực phẫu thuật/phòng mổ"
domain: "Môi trường & Hạ tầng (EVS & Facility)"
jci_mapped: "PCI.04.00, FMS.08.04"
dong_nguon: "2284-2352"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 103_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "Yêu cầu người không có nhiệm vụ ra ngoài" }
  - { code: ACT-200, headline: "Báo cáo ngay cho Đơn vị Kỹ thuật/Bảo trì nếu…" }
  - { code: ACT-200, headline: "Yêu cầu điều dưỡng đổi bộ dụng cụ khác ngay…" }
  - { code: ACT-400, headline: "Đình chỉ thao tác" }
  - { code: ACT-400, headline: "Đình chỉ việc sử dụng dao cạo lông vũ" }
```

## BM.QĐ.02.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TẠI KHU VỰC PHẪU THUẬT / PHÒNG MỔ**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Phẫu thuật viên/Bác sĩ | \[ \] Điều dưỡng dụng cụ/Chạy ngoài | \[ \] Nhân viên vệ sinh  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh:** Họ tên:...................................................... PID:...........................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[x\] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Vùng 3 (Bên trong phòng phẫu thuật đang mổ, kho vô khuẩn)...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Vùng 2 (Hành lang sạch, khu hồi tỉnh, khu vực rửa tay)...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Vùng 1 (Khu tiếp đón, hành chính, phòng thay đồ)...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Cơ sở vật chất và Môi trường |
| 1. Cửa phòng mổ được đóng kín liên tục trong quá trình phẫu thuật. |
| 2. Nhiệt độ và độ ẩm trong giới hạn cho phép (20-24°C, 30-60%), áp suất dương được duy trì. |
| 3. Sàn nhà, bề mặt thiết bị sạch sẽ, không bụi bẩn, không có vết máu cũ. |
| 4. Có đủ phương tiện vệ sinh tay (cồn sát khuẩn, xà phòng, khăn lau tay). |
| B. Tuân thủ của Nhân viên y tế (Kíp mổ) |
| 5. Nhân viên tuân thủ trang phục phòng mổ (quần áo phẫu thuật sạch, mũ trùm kín tóc, khẩu trang y tế che kín mũi miệng, dép phòng mổ). |
| 6. Nhân viên không đeo trang sức (nhẫn, vòng, đồng hồ) khi tham gia kíp mổ. |
| 7. Thực hiện vệ sinh tay ngoại khoa đúng quy trình (đủ thời gian, kỹ thuật). |
| 8. Tuân thủ tuyệt đối kỹ thuật vô khuẩn khi mặc áo choàng và mang găng tay. |
| 9. Hạn chế tối đa việc đi lại, nói chuyện và ra vào phòng mổ trong quá trình phẫu thuật. |
| C. Chuẩn bị Người bệnh |
| 10. Người bệnh đã được tắm vệ sinh, thay áo choàng sạch, đội mũ trùm tóc. |
| 11. Người bệnh đã tháo bỏ trang sức, răng giả, tẩy sơn móng tay/chân. |
| 12. Vùng da mổ không bị trầy xước do cạo lông bằng dao cạo (chỉ dùng tông đơ nếu cần). |
| D. Quy trình Kỹ thuật KSNK |
| 13. Sát khuẩn da vùng mổ cho người bệnh đúng kỹ thuật và chờ khô hoàn toàn. |
| 14. Dụng cụ, gạc, vật tư được kiểm tra hạn sử dụng và chỉ thị màu tiệt khuẩn trước khi dùng. |
| 15. Phân loại chất thải y tế đúng quy định ngay tại nguồn. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Yêu cầu người không có nhiệm vụ ra ngoài
* **ACT-200** — Báo cáo ngay cho Đơn vị Kỹ thuật/Bảo trì nếu…
* **ACT-200** — Yêu cầu điều dưỡng đổi bộ dụng cụ khác ngay…
* **ACT-400** — Đình chỉ thao tác
* **ACT-400** — Đình chỉ việc sử dụng dao cạo lông vũ

**Chữ ký Người giám sát: ....................................... Chữ ký Trưởng kíp mổ / ĐD chạy ngoài: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.QĐ.03.01
stt: 32
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TẠI KHU VỰC CAN THIỆP MẠCH (CATHLAB)"
ten_catalog: "Bảng kiểm giám sát tuân thủ KSNK tại khu vực can thiệp mạch (Cathlab)"
domain: "Môi trường & Hạ tầng (EVS & Facility)"
jci_mapped: "PCI.04.00, FMS.08.04"
dong_nguon: "2360-2426"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "Cảnh báo và yêu cầu Kỹ thuật viên hình ảnh…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên y tế lấy áo chì đang bị…" }
  - { code: ACT-200, headline: "Cung cấp ngay khăn tẩm cồn/hóa chất và yêu…" }
  - { code: ACT-200, headline: "Yêu cầu đóng kín cửa phòng Cathlab và mời…" }
  - { code: ACT-400, headline: "Đình chỉ thủ thuật" }
```

## BM.QĐ.03.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TẠI KHU VỰC CAN THIỆP MẠCH (CATHLAB)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Hành chính | \[ \] Trực cấp cứu)  
* **Khoa/Phòng/Khu vực:** Phòng Can thiệp mạch (Cathlab) số: .......................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ can thiệp | \[ \] KTV Chẩn đoán hình ảnh | \[ \] Điều dưỡng dụng cụ/chạy ngoài  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh:** Họ tên:...................................................... PID:........................... Thủ thuật:..................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[x\] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, buồng can thiệp mạch (Cathlab) đang tiến hành thủ thuật... *(Mặc định cho quy trình này)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực Cấp cứu, Hồi sức tích cực, Lọc máu, Phòng cách ly bệnh truyền nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Môi trường và Luồng di chuyển |
| 1. Cửa phòng can thiệp luôn được đóng kín trong suốt quá trình thủ thuật, hạn chế tối đa người ra vào. |
| 2. Sàn nhà, bề mặt máy sạch sẽ, không bụi, không vết máu cũ. Áp suất dương, nhiệt độ (20-24°C) và độ ẩm (30-60%) đạt chuẩn. |
| B. Vô khuẩn tối đa và Chuẩn bị người bệnh |
| 3. Nhân viên kíp thủ thuật tuân thủ trang phục (mũ trùm tóc, khẩu trang che mũi miệng, quần áo sạch). |
| 4. Bác sĩ/Điều dưỡng phụ thực hiện vệ sinh tay ngoại khoa đúng quy trình trước khi mặc áo choàng và mang găng vô khuẩn. |
| 5. Sát khuẩn da vùng chọc mạch bằng Cồn-Chlorhexidine (hoặc Povidone-Iodine) và BẮT BUỘC CHỜ KHÔ hoàn toàn trước khi rạch da/chọc kim. |
| 6. Trải săng vô khuẩn che kín toàn thân người bệnh (từ đầu đến chân), chỉ hở vị trí chọc mạch. |
| C. Thiết bị đặc thù (Máy C-arm & Áo chì chống bức xạ) |
| 7. Bọc vô khuẩn (Draping): Bóng phát tia, màn hình tăng sáng của máy C-arm và bảng điều khiển (nếu nằm trong phẫu trường) được bọc kín bằng nilon/săng vô khuẩn. |
| 8. Kỹ thuật viên hình ảnh (không mặc áo vô khuẩn) giữ khoảng cách an toàn, tuyệt đối KHÔNG CHẠM vào bàn dụng cụ hoặc máy C-arm đã bọc vô khuẩn. |
| 9. Bảo quản Áo chì: Áo chì, yếm cổ chì được treo phẳng trên giá chuyên dụng sau khi dùng. TUYỆT ĐỐI KHÔNG GẤP áo chì (gây đứt gãy lõi chì). |
| 10. Vệ sinh Áo chì: Áo chì được lau sạch bề mặt bằng khăn tẩm hóa chất khử khuẩn trung bình sau mỗi ngày làm việc hoặc ngay khi dính máu. |
| D. Vệ sinh môi trường chuyển tiếp |
| 11. Các dụng cụ can thiệp (guidewire, catheter, stent...) sử dụng đúng quy định (dùng 1 lần hoặc tiệt khuẩn đúng chuẩn). |
| 12. Lau khử khuẩn bàn can thiệp, đèn, cáp nối và xử lý ngay vết máu loang (Spill kit) trên sàn giữa 2 ca thủ thuật. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Cảnh báo và yêu cầu Kỹ thuật viên hình ảnh…
* **ACT-200** — Yêu cầu nhân viên y tế lấy áo chì đang bị…
* **ACT-200** — Cung cấp ngay khăn tẩm cồn/hóa chất và yêu…
* **ACT-200** — Yêu cầu đóng kín cửa phòng Cathlab và mời…
* **ACT-400** — Đình chỉ thủ thuật

**Chữ ký Người giám sát: ....................................... Chữ ký Bác sĩ / ĐD Trưởng Cathlab: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.QĐ.09.01
stt: 33
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ MÔI TRƯỜNG BẢO VỆ (PE)"
ten_catalog: "Bảng kiểm giám sát tuân thủ môi trường bảo vệ (PE)"
domain: "Phòng ngừa lây truyền & Dịch bệnh"
jci_mapped: "PCI.07.00 ME 2"
dong_nguon: "2434-2497"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [102_SYS, 103_SYS, 105_SYS, 201_HUM, 203_HUM, 204_HUM, 301_CLI, 302_CLI]
hanh_dong_items:
  - { code: ACT-200, headline: "Yêu cầu đóng kín cửa phòng bệnh ngay lập tức…" }
  - { code: ACT-200, headline: "Mời ngay khách thăm hoặc người nhà ra khỏi…" }
  - { code: ACT-200, headline: "Yêu cầu NVYT quay lại khu vực phòng đệm để…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên vệ sinh tiến hành lau ẩm…" }
  - { code: ACT-400, headline: "Đình chỉ và Tịch thu" }
```

## BM.QĐ.09.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ MÔI TRƯỜNG BẢO VỆ (PE)**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** ...................................................... **Phòng PE số:** ...................  
* **Người giám sát:** ......................................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ/Điều dưỡng | \[ \] Người nhà/Khách thăm | \[ \] Nhân viên vệ sinh  
* **Thông tin người bệnh:** Họ tên:...................................................... PID:........................... \[ \] Sau ghép tạng | \[ \] Giảm bạch cầu hạt  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[x\] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn, chăm sóc NB suy giảm miễn dịch...  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực Cấp cứu, Hồi sức tích cực, Lọc máu, Phòng cách ly bệnh truyền nhiễm...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Cơ sở hạ tầng, Môi trường và Khách thăm |
| 1. Người bệnh được xếp phòng riêng (hoặc phòng duy trì áp suất dương). |
| 2. Cửa phòng bệnh được giữ đóng kín liên tục. |
| 3. Có biển cảnh báo "Môi trường bảo vệ" / "Hạn chế ra vào" / "Cách ly đảo ngược" trước cửa phòng. |
| 4. Bắt buộc: TUYỆT ĐỐI KHÔNG có hoa tươi, cây cảnh, hoa quả sấy khô (chưa đóng gói) trong phòng bệnh. |
| 5. Khách thăm được sàng lọc kỹ (không ho, sốt, mắc bệnh truyền nhiễm) và hạn chế tối đa số lượng người ra vào. |
| 6. Khách thăm/Người nhà thực hiện vệ sinh tay và mang khẩu trang y tế (và áo choàng nếu có chỉ định) khi vào phòng. |
| B. Tuân thủ của Nhân viên y tế (NVYT) |
| 7. NVYT tuân thủ nghiêm ngặt vệ sinh tay (cồn/xà phòng) TRƯỚC và SAU khi vào phòng chăm sóc NB. |
| 8. NVYT mang khẩu trang (và các PTPH khác nếu cần) khi chăm sóc người bệnh. |
| 9. Vệ sinh môi trường (bề mặt, sàn) được thực hiện tăng cường (ít nhất 2 lần/ngày) bằng phương pháp lau ẩm, tuyệt đối cấm quét khô. |
| C. Tuân thủ của Người bệnh |
| 10. Người bệnh tuân thủ "Chế độ ăn an toàn": ăn chín, uống sôi, không ăn rau sống, salad, hoa quả chưa gọt vỏ. |
| 11. Người bệnh mang khẩu trang y tế khi bắt buộc phải di chuyển ra khỏi phòng PE (chụp X-quang, phẫu thuật). |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiết kế môi trường bất hợp lý
* Quá tải công việc / nhân sự
* Lỗ hổng quy trình

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên

**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**

* Cấp cứu khẩn cấp
* Hành vi / tâm lý người bệnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Yêu cầu đóng kín cửa phòng bệnh ngay lập tức…
* **ACT-200** — Mời ngay khách thăm hoặc người nhà ra khỏi…
* **ACT-200** — Yêu cầu NVYT quay lại khu vực phòng đệm để…
* **ACT-200** — Yêu cầu nhân viên vệ sinh tiến hành lau ẩm…
* **ACT-400** — Đình chỉ và Tịch thu

**Chữ ký Người giám sát: ....................................... Chữ ký Điều dưỡng trưởng / NVYT: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.QĐ.17.01
stt: 34
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KIỂM SOÁT NHIỄM KHUẨN KHU VỰC PHA CHẾ THUỐC VÔ KHUẨN"
ten_catalog: "Bảng kiểm giám sát tuân thủ KSNK khu vực pha chế thuốc vô khuẩn"
domain: "Phòng ngừa lây truyền & Dịch bệnh"
jci_mapped: "PCI.03.00"
dong_nguon: "2505-2565"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 104_SYS, 201_HUM, 203_HUM, 204_HUM, 205_HUM]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở và hướng dẫn lại tại chỗ (Coaching)…" }
  - { code: ACT-200, headline: "Yêu cầu Dược sĩ/NVYT ra ngoài phòng đệm để…" }
  - { code: ACT-200, headline: "Yêu cầu tiêu hủy ngay lập tức túi dịch hoặc…" }
  - { code: ACT-200, headline: "Yêu cầu NVYT lấy gạc tẩm Cồn 70° lau sát…" }
  - { code: ACT-400, headline: "Đình chỉ hệ thống" }
```

## BM.QĐ.17.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ KIỂM SOÁT NHIỄM KHUẨN KHU VỰC PHA CHẾ THUỐC VÔ KHUẨN**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** Khoa Dược \- Khu vực pha chế thuốc vô khuẩn  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Dược sĩ | \[ \] NVYT pha chế  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin loại thuốc pha chế:** \[ \] Thuốc thường/Dinh dưỡng tĩnh mạch | \[ \] Hóa chất độc tế bào (Ung thư)  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[x\] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn... *(Khu vực giám sát)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực Cấp cứu, Hồi sức tích cực, Lọc máu, Phòng cách ly...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Hạ tầng, Môi trường và Thiết bị (Phòng sạch) |
| 1. Tuân thủ nguyên tắc một chiều (Sạch *rightarrow* Bẩn), phòng pha duy trì đúng áp suất (Dương đối với thuốc thường; Âm đối với hóa chất độc tế bào). |
| 2. Tủ an toàn sinh học (BSC) / Tủ cách ly (Isolator) được bật chạy không khí ít nhất 15-30 phút trước khi bắt đầu pha. |
| 3. Bề mặt làm việc của Tủ BSC được lau khử khuẩn bằng Cồn 70° trước mỗi ca và giữa các lần pha chế. |
| B. Tuân thủ của Nhân viên y tế (Trang phục và Vệ sinh tay) |
| 4. Tuyệt đối KHÔNG mặc trang phục cá nhân, không trang điểm, không đeo trang sức, không để móng tay dài/móng giả khi vào khu vực pha chế. |
| 5. Mặc PTPH đúng trình tự tại phòng đệm (VST *rightarrow* Mũ/Bao giày *rightarrow* Khẩu trang *rightarrow* Rửa tay ngoại khoa *rightarrow* Áo choàng vô khuẩn *rightarrow* Vào phòng pha VST cồn 70° *rightarrow* Găng tay vô khuẩn). |
| C. Kỹ thuật Vô khuẩn (Aseptic Technique) |
| 6. Sát khuẩn kỹ tất cả vật tư (lọ thuốc, túi dịch, bơm tiêm) bằng gạc tẩm Cồn 70° trước khi đưa vào trong Tủ BSC. |
| 7. Bắt buộc: Sát khuẩn cổng cao su (septum) của lọ thuốc và cổng kết nối túi dịch bằng Cồn 70° và CHỜ KHÔ hoàn toàn trước mỗi lần đâm kim. |
| 8. Tất cả thao tác vô khuẩn được thực hiện hoàn toàn bên trong Tủ BSC (cách thành tủ ít nhất 15cm) và tuyệt đối không để tay/vật tư che khuất luồng khí HEPA. |
| 9. Bơm kim tiêm chỉ sử dụng 1 lần, tuyệt đối không dùng chung cho nhiều lọ thuốc hoặc sử dụng cho nhiều người bệnh. |
| 10. Sản phẩm sau pha chế được dán nhãn đầy đủ thông tin truy xuất (tên thuốc, nồng độ, tên NB, ngày giờ pha, HSD). |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Lỗi thiết bị / hỏng hóc

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Hành vi liều lĩnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở và hướng dẫn lại tại chỗ (Coaching)…
* **ACT-200** — Yêu cầu Dược sĩ/NVYT ra ngoài phòng đệm để…
* **ACT-200** — Yêu cầu tiêu hủy ngay lập tức túi dịch hoặc…
* **ACT-200** — Yêu cầu NVYT lấy gạc tẩm Cồn 70° lau sát…
* **ACT-400** — Đình chỉ hệ thống

**Chữ ký Người giám sát: ....................................... Chữ ký Dược sĩ/Người pha chế: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.QĐ.16.01
stt: 35
ten_trong_form: "BẢNG KIỂM GIÁM SÁT TUÂN THỦ AN TOÀN SINH HỌC TẠI KHOA XÉT NGHIỆM"
ten_catalog: "Bảng kiểm giám sát tuân thủ an toàn sinh học tại khoa xét nghiệm"
domain: "Phòng ngừa lây truyền & Dịch bệnh"
jci_mapped: "PCI.02.01"
dong_nguon: "2573-2635"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 104_SYS, 201_HUM, 203_HUM, 204_HUM, 205_HUM]
hanh_dong_items:
  - { code: ACT-100, headline: "Nhắc nhở và yêu cầu bổ sung ngay kính bảo…" }
  - { code: ACT-200, headline: "Yêu cầu di chuyển ngay các mẫu bệnh phẩm…" }
  - { code: ACT-200, headline: "Cảnh báo và yêu cầu nhân viên tháo găng" }
  - { code: ACT-200, headline: "Phong tỏa tạm thời khu vực và hướng dẫn nhân…" }
  - { code: ACT-400, headline: "Đình chỉ và yêu cầu nhân viên y tế lập tức…" }
```

## BM.QĐ.16.01

**BẢNG KIỂM GIÁM SÁT TUÂN THỦ AN TOÀN SINH HỌC TẠI KHOA XÉT NGHIỆM**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng Xét nghiệm:** ....................................................................................  
* **Người giám sát:** ....................................................................................  
* **Đối tượng được giám sát:** \[ \] Bác sĩ/Kỹ thuật viên | \[ \] Nhân viên vệ sinh (Labo)  
* **Họ tên đối tượng được giám sát:** ....................................................................................  
* **Thông tin người bệnh:** *(Không áp dụng cho môi trường phòng xét nghiệm độc lập)*  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Phòng mổ, ICU sạch, phòng pha chế thuốc vô khuẩn...  
  * \[x\] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực xử lý mẫu bệnh phẩm lây nhiễm, nuôi cấy vi sinh, khu vực đặt tủ an toàn sinh học cấp II...  
  * \[ \] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Buồng bệnh nội trú thông thường, phòng khám, buồng thủ thuật...  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Hành lang, sảnh chờ, phòng hành chính nhân viên...

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Hành chính, Tuân thủ PTPH và Vệ sinh cá nhân |
| 1. Nhân viên mặc áo choàng labo (cài cúc kín, dài tay) đúng quy định. TUYỆT ĐỐI KHÔNG mặc áo choàng xét nghiệm ra ngoài khu vực làm việc (hành lang, nhà ăn). |
| 2. Mang găng tay khi xử lý bệnh phẩm; tháo găng và Vệ sinh tay trước khi chạm vào vật dụng sạch (bàn phím máy tính, điện thoại, hồ sơ). |
| 3. Mang kính bảo hộ/tấm che mặt khi thực hiện các thao tác có nguy cơ văng bắn máu, dịch tiết hoặc khi xử lý tràn đổ. |
| 4. TUYỆT ĐỐI KHÔNG ăn uống, hút thuốc, trang điểm, để vật dụng cá nhân trên bàn làm việc hoặc dùng miệng hút pipet trong khu vực xét nghiệm. |
| 5. Bắt buộc thực hiện Vệ sinh tay bằng xà phòng và nước sau khi tháo PTPH và TRƯỚC KHI rời khỏi phòng xét nghiệm. |
| B. Thiết bị An toàn và Kỹ thuật hạn chế khí dung |
| 6. Tủ An toàn sinh học (BSC) hoạt động tốt, được bật trước 5-15 phút, không bị che khuất khe hút gió và còn hạn kiểm định định kỳ. |
| 7. Các thao tác có nguy cơ tạo khí dung cao (lắc, trộn, ly tâm hở, cấy lao/nấm) được thực hiện hoàn toàn BÊN TRONG tủ BSC cấp II. |
| 8. Máy ly tâm có sử dụng ống nghiệm nắp vặn kín và nắp đậy an toàn (safety cup/bucket) để chống phát tán khí dung. |
| 9. Có sẵn "Bộ xử lý tràn đổ" (Spill Kit) tại chỗ và nhân viên biết cách sử dụng theo quy trình. |
| C. Vệ sinh môi trường và Quản lý chất thải |
| 10. Lau khử khuẩn bề mặt bàn xét nghiệm, thiết bị bằng hóa chất phù hợp (VD: Cồn 70°, dung dịch Clo) vào cuối ca làm việc hoặc ngay khi bị bẩn. |
| 11. Tất cả bệnh phẩm lây nhiễm, đồ nhựa dùng 1 lần (đầu côn, ống nghiệm) và găng tay bẩn được bỏ vào thùng/túi màu VÀNG. |
| 12. Vật sắc nhọn (kim tiêm, lam kính vỡ) được bỏ ngay vào hộp kháng thủng chuyên dụng (đảm bảo không quá đầy 3/4). |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Lỗi thiết bị / hỏng hóc

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Hành vi liều lĩnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-100** — Nhắc nhở và yêu cầu bổ sung ngay kính bảo…
* **ACT-200** — Yêu cầu di chuyển ngay các mẫu bệnh phẩm…
* **ACT-200** — Cảnh báo và yêu cầu nhân viên tháo găng
* **ACT-200** — Phong tỏa tạm thời khu vực và hướng dẫn nhân…
* **ACT-400** — Đình chỉ và yêu cầu nhân viên y tế lập tức…

**Chữ ký Người giám sát: ....................................... Chữ ký Kỹ thuật viên / Trưởng Labo: .......................................**

---

<!-- BANG_KIEM_END -->

<!-- BANG_KIEM_START -->
```yaml
loai: bang_kiem_giam_sat
ma_bk: BM.QĐ.18.02
stt: 36
ten_trong_form: "BẢNG KIỂM GIÁM SÁT VỆ SINH AN TOÀN THỰC PHẨM VÀ BẾP ĂN"
ten_catalog: "Bảng kiểm giám sát vệ sinh an toàn thực phẩm và bếp ăn"
domain: "Môi trường & Hạ tầng (EVS & Facility)"
jci_mapped: "PCI.06.00"
dong_nguon: "2643-2705"
phien_ban_form: 1
so_phan: 4
nguyen_nhan: [101_SYS, 102_SYS, 104_SYS, 201_HUM, 203_HUM, 204_HUM, 205_HUM]
hanh_dong_items:
  - { code: ACT-200, headline: "Yêu cầu nhân viên tháo bỏ trang sức" }
  - { code: ACT-200, headline: "Yêu cầu sắp xếp lại ngay tủ bảo quản thực…" }
  - { code: ACT-200, headline: "Yêu cầu nhân viên lấy mẫu bổ sung ngay lập…" }
  - { code: ACT-400, headline: "Đình chỉ và Tiêu hủy" }
  - { code: ACT-400, headline: "Đình chỉ công việc tại bếp ngay lập tức đối…" }
```

## BM.QĐ.18.02

**BẢNG KIỂM GIÁM SÁT VỆ SINH AN TOÀN THỰC PHẨM VÀ BẾP ĂN**

**PHẦN 1: THÔNG TIN HÀNH CHÍNH**

* **Ngày giám sát:** ....../....../20...... **Giờ:** ......:...... (Ca: \[ \] Sáng | \[ \] Chiều | \[ \] Tối)  
* **Khoa/Phòng/Khu vực:** Khoa Dinh dưỡng / Bếp ăn / Khu chia suất .................................  
* **Người giám sát:** .......................................................................................................  
* **Đối tượng được giám sát:** \[ \] Bếp trưởng | \[ \] Nhân viên sơ chế/chế biến | \[ \] Nhân viên chia/vận chuyển suất ăn  
* **Họ tên đối tượng được giám sát:** .......................................................................................................  
* **Phân loại Mức độ nguy cơ khu vực (Bắt buộc):**  
  * \[ \] Nhóm yêu cầu Vô khuẩn cao (Màu Trắng): Không áp dụng.  
  * \[ \] Nhóm Nguy cơ lây nhiễm cao (Màu Đỏ): Khu vực tiếp nhận, sơ chế thực phẩm sống (thịt, cá...).  
  * \[x\] Nhóm Nguy cơ lây nhiễm trung bình (Màu Vàng): Khu vực chế biến nhiệt (nấu), chia suất ăn chín. *(Trọng điểm giám sát)*  
  * \[ \] Nhóm Nguy cơ lây nhiễm thấp (Màu Xanh): Kho bảo quản đồ khô, khu vực ra đồ, canteen.

**PHẦN 2: ĐÁNH GIÁ CHỈ ĐỊNH VÀ KỸ THUẬT LÂM SÀNG**
| Tiêu chí |
| A. Nhân viên và Vệ sinh cá nhân |
| 1. Nhân viên mặc đồng phục nhà bếp sạch (sáng màu), đội mũ trùm kín toàn bộ tóc, đeo khẩu trang che kín mũi miệng khi chế biến/chia thức ăn. |
| 2. Móng tay cắt ngắn, sạch sẽ, không sơn móng. Tháo bỏ toàn bộ trang sức (nhẫn, vòng, đồng hồ) khi làm việc. |
| 3. Thực hiện vệ sinh tay (bằng xà phòng) đúng lúc: Trước khi chế biến, trước khi chia suất, sau khi xử lý đồ sống/rác và sau khi đi vệ sinh. |
| 4. Bắt buộc: Mang găng tay sạch (dùng 1 lần) khi bốc/chia thức ăn chín trực tiếp. TUYỆT ĐỐI KHÔNG dùng tay trần bốc thức ăn chín. |
| 5. Không có nhân viên đang mắc bệnh truyền nhiễm (tiêu chảy, ho, sốt, viêm da có mủ) làm việc tại khu vực chế biến/chia suất. |
| B. Cơ sở vật chất, Quy trình và Lưu trữ |
| 6. Bếp được bố trí và vận hành theo quy tắc một chiều (Nhập nguyên liệu *rightarrow* Sơ chế (Sống) *rightarrow* Chế biến (Nấu) *rightarrow* Chia suất (Chín) *rightarrow* Ra đồ). |
| 7. Lây nhiễm chéo: Phân biệt rõ ràng Dao/Thớt dùng cho thực phẩm SỐNG và CHÍN (theo màu sắc hoặc ký hiệu). KHÔNG dùng chung. |
| 8. Tủ lạnh/Kho lạnh sạch sẽ, sắp xếp ngăn nắp theo nguyên tắc: Thực phẩm CHÍN ở trên, thực phẩm SỐNG ở dưới (hoặc để tủ riêng); tuân thủ FIFO/FEFO. |
| 9. Khu vực chia thức ăn chín sạch sẽ, có lưới chống côn trùng/cửa kính; Thùng rác có nắp đậy kín, không bốc mùi. |
| C. Lưu mẫu và Vận chuyển suất ăn |
| 10. Thực hiện lưu mẫu thức ăn đầy đủ các món trong ngày (đặc *ge*150*g*; lỏng *ge*250*ml*), bảo quản trong tủ lạnh chuyên dụng ($0-5^\circ C$) trong 24 giờ. |
| 11. Sổ kiểm thực ba bước và Sổ lưu mẫu thức ăn ghi chép đầy đủ thông tin (tên món, giờ lưu, người lưu, giờ hủy). |
| 12. Suất ăn được vận chuyển đến các khoa lâm sàng bằng xe chuyên dụng, che đậy kín, duy trì nhiệt độ an toàn. |
**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*

**PHẦN 3: NGUYÊN NHÂN**

*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*

**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**

* Thiếu vật tư / thiết bị
* Thiết kế môi trường bất hợp lý
* Lỗi thiết bị / hỏng hóc

**NHÓM 2: CON NGƯỜI**

* Kỹ năng / đào tạo chưa đạt
* Thói quen đi tắt
* Mất tập trung / quên
* Hành vi liều lĩnh

**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**

*(Đầu mục theo mã ACT — tick khi đã can thiệp)*

* **ACT-200** — Yêu cầu nhân viên tháo bỏ trang sức
* **ACT-200** — Yêu cầu sắp xếp lại ngay tủ bảo quản thực…
* **ACT-200** — Yêu cầu nhân viên lấy mẫu bổ sung ngay lập…
* **ACT-400** — Đình chỉ và Tiêu hủy
* **ACT-400** — Đình chỉ công việc tại bếp ngay lập tức đối…

**Chữ ký Người giám sát: ....................................... Chữ ký Bếp trưởng / Nhân viên: .......................................**

---

<!-- BANG_KIEM_END -->
