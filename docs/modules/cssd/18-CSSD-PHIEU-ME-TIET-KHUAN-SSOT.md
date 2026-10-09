# 18 — CSSD · Phiếu mẻ tiệt khuẩn (trạm `TIET_KHUAN`) · SSOT

| Trường | Giá trị |
|--------|---------|
| Phiên bản | v1.0 draft cho PO · 2026-09-25 (Asia/Saigon) |
| Chủ sở hữu | KSNK Soft · Domain — BVQY 103 / `ksnk_bv103_V2` · CSSD |
| Phạm vi | DOMAIN ONLY — không sửa code, không commit, không Cloud |
| Neo | `17-CSSD-TRAM-BO-TACH-NHIET-SU-CO-SSOT.md` v1.4 (Lock A) · `17b` · `17c` · `17d` |
| Trạng thái | Chờ Nghĩa chọn A/B (§5) |

## §0. Nguồn (ký hiệu dùng trong cột «Nguồn»)

| Ký hiệu | Nguồn đã đọc |
|---------|--------------|
| CDC-MON | CDC 2008 (cập nhật 2019) · Sterilizing Practices · mục **Monitoring** — cdc.gov/infection-control/hcp/disinfection-sterilization/sterilizing-practices.html |
| CDC-VER | Cùng trang · mục **Sterilization Cycle Verification** |
| CDC-STM | CDC 2008 · **Steam Sterilization** (Overview) — …/steam-sterilization.html |
| QT21 | Drive «Quy trình, quy định, mô tả vị trí việc làm KSNK_final» · `KSNK.QT.21.docx` (Quy trình tiệt khuẩn dụng cụ y tế, v1.0 12/09/2026) + HD.01/HD.02/HD.03/BM.01 |
| QT23 | Cùng thư mục · `KSNK.QT.23.docx` (Quy trình vận hành và giám sát chất lượng tiệt khuẩn, v1.0 12/09/2026) + HD.01/HD.02/BM.01–04 |
| L-A | File 17 Lock A (6 trạm, tách nhiệt catalog, SC chỉ qua `/cssd-su-co`, CP hard-block SC TK) |
| PO | Quyết định Lead/PO: CAP_PHAT IN SC picker đến khi `used_clinically`; bỏ merge-gate |

**QĐ 3671/QĐ-BYT 2012:** có trong Drive nhưng nằm ở «01. Văn bản quy phạm Việt Nam / 04. Quyết định» — **ngoài** 2 thư mục được phép → **không** dùng trực tiếp; chỉ ghi nhận QT21/QT23 viện dẫn 3671. Trong «02. Khuyến cáo và hướng dẫn chuyên môn / Việt Nam»: **chưa tìm thấy trong Drive** hướng dẫn KK-TK BYT.

**Thông số số học** chỉ lấy từ nguồn trên; mọi chương trình khác → «theo thông số nhà sản xuất máy».

## §1. Ràng buộc khóa (nhắc lại, không mở lại)

1. 6 trạm `TIEP_NHAN→LAM_SACH→QC→DONG_GOI→TIET_KHUAN→CAP_PHAT`.
2. `TIET_KHUAN` **chỉ** qua phiếu mẻ — không quét advance ngoài mẻ.
3. `DONG_GOI` scan-only.
4. UI **không** hiện mã QT.
5. Sự cố chỉ qua `/cssd-su-co`; **không** tạo SC inline trên UI trạm. `CAP_PHAT` hard-block khi SC tiệt khuẩn `OPEN|CONFIRMED` trên mẻ/chu trình.
6. Tách nhiệt Lock A: bộ không chịu nhiệt = `BoDungCu` riêng (`parent_bo_id`) ở danh mục; dual-track.
7. PO: `CAP_PHAT` IN picker SC đến khi `used_clinically`; used = gắn ca mổ/người bệnh sau CP; bỏ merge-gate.

## §2. Bảng quy tắc phiếu mẻ

### 2.1 Trường bắt buộc của phiếu mẻ

| ID | Mức | Quy tắc | IN | OUT | Nguồn |
|----|-----|---------|----|-----|-------|
| M-01 | P0 | **Máy** bắt buộc; chọn máy ở trạng thái sẵn sàng. Máy `HOLD_QC`/hỏng → không tạo phiếu. | `thiet_bi_id` máy TK sẵn sàng | Máy HOLD_QC / bảo trì / không phải máy TK | QT21 B1 · QT23 BM.01 |
| M-02 | P0 | **Số mẻ** tự sinh = số thứ tự theo **máy × ngày (lịch VN)**, hiển thị «Máy · dd/MM · Mẻ n». Mã nội bộ (`ma_lo_tiet_khuan`) vẫn duy nhất để quét/truy vết. | Tự sinh, không gõ tay | Người dùng gõ số mẻ; trùng số trong cùng máy-ngày | QT23 BM.01 (Ngày · Số mẻ) · QT23 NT chung (liên kết máy, số mẻ) · CDC (load numbering) |
| M-03 | P0 | **Phương pháp** ∈ `HOI_NUOC` · `PLASMA_H2O2` · `EO` — suy ra từ loại máy, không chọn tay. Phương pháp khác (khô, peracetic…) **không** dùng tại BV103 (QT21 chỉ nêu 3 PP). | Tự suy từ máy | PP ngoài 3 loại; phiếu PP ≠ loại máy | QT21 Mục đích/Phạm vi |
| M-04 | P0 | **Chương trình** chọn từ danh sách chương trình của máy (cấu hình danh mục máy); chọn chương trình → điền sẵn thông số chuẩn. | Chọn 1 chương trình cấu hình | Nhập tự do không có chương trình | QT21 B3–B5 |
| M-05 | P0 | **Thông số vật lý theo PP** (ghi khi kết thúc, đối chiếu bản in): Hơi nước = nhiệt độ, áp suất, thời gian giữ nhiệt; Plasma = chu trình (ngắn/dài) + phiếu in máy (nồng độ); EO = nhiệt độ, thời gian, thông khí (aeration) — nồng độ/ẩm **nếu máy in được** (CDC: máy EO bệnh viện thường không đo được nồng độ khí và độ ẩm). Giá trị chuẩn: theo thông số nhà sản xuất máy (tham chiếu QT21 HD.03: hơi nước 134 °C 4–18 phút / 121 °C 20–30 phút; plasma ngắn 28–35 phút / dài 45–75 phút; EO ấm 55 °C 1–4 giờ / lạnh 37 °C 2–6 giờ). | Mặc định = chuẩn chương trình; NV chỉ sửa khi lệch | Kết luận ĐẠT khi thiếu thông số | CDC-MON (mechanical) · CDC-STM · QT21 B3–B6, HD.03 · QT23 B1 |
| M-06 | P0 | **Người nạp** = người đăng nhập tạo/quét nạp (tự điền). **Người dỡ/đánh giá** = người đăng nhập bấm kết thúc (tự điền). **Người nhả** = người có quyền giải phóng (xem A/B-6). | Tự điền từ phiên | Gõ tên tự do thay cho định danh | QT23 B1, B5 · QT23 Trách nhiệm |
| M-07 | P0 | **Giờ bắt đầu / kết thúc** = hệ thống ghi khi bấm «Bắt đầu» / «Kết thúc chu trình». | Timestamp hệ thống | Nhập tay giờ | QT23 BM.01 |
| M-08 | P0 | **Danh sách bộ** chỉ bằng **quét** tem bộ đang ở `DONG_GOI`; sau «Bắt đầu» khóa danh sách. | Bộ `DONG_GOI`, chưa gắn mẻ khác, không đóng băng | Bộ ở trạm khác; đã gắn mẻ khác; thêm sau khi bắt đầu | L-A §2 · QT23 NT chung |
| M-09 | P0 | **Cờ implant** của mẻ = tự bật nếu có ≥1 bộ gắn cờ cấy ghép ở danh mục; không cho tắt tay. | Suy từ danh mục bộ | Tắt cờ khi có bộ implant | QT23 NT chung · CDC-MON (implant) |

### 2.2 Kiểm soát chất lượng

| ID | Mức | Quy tắc | IN | OUT | Nguồn |
|----|-----|---------|----|-----|-------|
| M-10 | P0 | **Bowie-Dick** hằng ngày cho máy hơi nước hút chân không: mẻ trống, đầu ngày, trước mẻ dụng cụ đầu tiên (CDC: 134 °C 3,5 phút; QT21: 134 °C 3,5–4 phút). Ghi trên **hồ sơ máy**, không phải mẻ dụng cụ. | BD ĐẠT hôm nay → cho tạo phiếu hơi nước | Chưa có BD ĐẠT hôm nay; không áp dụng cho Plasma/EO | CDC-STM · CDC-MON · QT21 HD.03 · QT23 B2, HD.01 |
| M-11 | P0 | **BD hỏng** → máy chuyển tạm giữ; **chặn tạo phiếu hơi nước** trên máy đó đến khi bảo trì xong **và** BD lại ĐẠT. | BD lại ĐẠT sau sửa | Nạp mẻ khi BD hỏng chưa có BD đạt mới | CDC-STM · QT23 HD.01 |
| M-12 | P0 | **CI ngoài** (băng keo) trên **100% gói** — kết quả nhập 1 lần cho cả mẻ (ĐẠT / KHÔNG). Gói nào CI ngoài không đổi màu → mẻ KHÔNG ĐẠT. | ĐẠT toàn bộ | Bất kỳ gói không đạt | CDC-MON · QT21 B6 · QT23 B3 |
| M-13 | P0 | **CI trong PCD (loại 5)** mỗi mẻ, đọc ngay khi kết thúc; chỉ sang bước nhả khi chuyển màu hoàn toàn. CI trong **từng gói** (CDC «preferably») = đọc tại nơi mở gói — **không** nhập phần mềm (P1 ghi chú). | ĐẠT | Không đạt / không đặt PCD | CDC-MON · QT21 HD.01 · QT23 B3 |
| M-14 | P0 | **BI tần suất:** hơi nước ≥ 1 lần/tuần/máy (CDC khuyến nghị hằng ngày nếu chạy nhiều mẻ); **mọi mẻ** Plasma, EO; **mọi mẻ có implant**. BI đặt trong PCD ở vị trí khó nhất (hơi nước: dưới-trước gần van xả; Plasma/EO: tâm tải). Ủ kèm ống đối chứng cùng lô. | Có BI khi bắt buộc; đối chứng (+) | Mẻ bắt buộc BI mà không có BI; đối chứng (−) → hủy kết quả, test lại lô mới | CDC-MON · QT23 B4, HD.02 · QT21 HD.01 |
| M-15 | P0 | Hệ thống **tự nhắc BI bắt buộc** khi tạo phiếu: PP Plasma/EO, cờ implant, hoặc máy hơi nước chưa có BI trong 7 ngày. | Tự tính | NV tự nhớ | QT23 B4 |
| M-16 | P0 | **Thông số vật lý/bản in** đọc và xác nhận **mỗi mẻ**; lệch chuẩn → KHÔNG ĐẠT. | ĐẠT | Thiếu/lệch | CDC-MON · QT23 B1 |
| M-17 | P1 | **Thẩm định máy**: sau lắp đặt, di dời, sửa lớn, sau thất bại TK → 3 mẻ trống liên tiếp BI+CI (và BD nếu hút chân không) đạt mới cho chạy mẻ dụng cụ. Ghi ở hồ sơ máy. | 3 mẻ đạt | Chạy mẻ dụng cụ trước khi đủ | CDC-VER · QT21/QT23 Khoa Trang bị |

### 2.3 Trạng thái mẻ & điều kiện nhả

Trạng thái tối thiểu (suy ra, không cần enum mới — khớp tên code hiện có):
`DANG_CHUAN_NAP` (nháp/nạp) → `DANG_TIET_KHUAN` (đã bắt đầu, khóa nạp) → `CHO_DANH_GIA_QC` (kết thúc chu trình) → `HOAN_THANH` (ĐẠT, đã nhả) | `CHO_BI` (ĐẠT vật lý+CI, chờ BI) | `QC_KHONG_DAT`.

| ID | Mức | Quy tắc | IN | OUT | Nguồn |
|----|-----|---------|----|-----|-------|
| M-18 | P0 | **Nhả mẻ thường** (không implant, không bắt buộc chờ BI) khi: vật lý ĐẠT + CI ngoài ĐẠT + CI PCD ĐẠT (+ BI ĐẠT nếu đã có). Bộ → sẵn sàng `CAP_PHAT`. | 3 cấp đạt «khi áp dụng» | Bất kỳ cấp nào KHÔNG ĐẠT | QT23 NT chung, B5 · QT21 B6 |
| M-19 | P0 | **Mẻ implant** → `CHO_BI`: bộ **không** được `CAP_PHAT` đến khi BI âm tính (xem A/B-2 về khẩn cấp). | BI (−) + đối chứng (+) | CP khi chưa có BI | QT23 NT chung, B5, rủi ro «Giải phóng mẻ cấy ghép» · CDC-MON |
| M-20 | P0 | **Plasma/EO**: BI mọi mẻ — nhả sau BI hay nhả sớm theo A/B-4. | — | — | QT23 B4 |
| M-21 | P0 | **Mẻ KHÔNG ĐẠT** (vật lý/CI/BI/gói ướt/rách/máy báo lỗi) → **toàn mẻ** cách ly, không cấp phát; tất cả bộ quay lại xử lý (điểm quay về: A/B-1). Máy → tạm giữ QC. | Toàn mẻ | Nhả một phần mẻ | QT21 NT chung, HD.02 · QT23 NT chung |
| M-22 | P0 | Mẻ KHÔNG ĐẠT → **SC tiệt khuẩn** gắn `lo_tiet_khuan_id`, tạo tự động **từ module phiếu mẻ** (không phải UI 6 trạm), NV hoàn thiện trên `/cssd-su-co`. | SC loại PROCESS gắn mẻ | Form SC inline trên trạm | L-A §0 M9 · QT23 BM.04 #10 |
| M-23 | P0 | **BI (+) sau khi đã nhả** → SC tiệt khuẩn tự tạo (như M-22), `CAP_PHAT` hard-block mọi bộ trong phạm vi thu hồi; **danh sách thu hồi** = bộ của các mẻ trong phạm vi (A/B-3) có chu trình đã/chưa `CAP_PHAT` và **chưa** `used_clinically` → thu hồi; bộ đã `used_clinically` → liệt kê cho KSNK đánh giá nguy cơ (không thu hồi được). Máy dừng đến khi BI lặp lại âm. | Phạm vi mẻ theo A/B-3 | Chỉ khóa mẻ hiện tại khi chọn A | CDC-MON (positive BI, conservative approach) · QT23 HD.02 · L-A §7 · PO |
| M-24 | P0 | **Gate `CAP_PHAT`**: chỉ cho quét cấp phát khi mẻ `HOAN_THANH` **và** không `CHO_BI` **và** không có SC tiệt khuẩn `OPEN|CONFIRMED` trên mẻ/chu trình. | Đủ 3 điều kiện | Còn một điều kiện | L-A §7/§12-6 · QT23 B5 |
| M-25 | P1 | **Hồ sơ mẻ** (thông số, bản in/ảnh, BD, CI, BI, người nạp/dỡ/nhả) giữ **tối thiểu 5 năm**, không xóa cứng. | Lưu ≥ 5 năm | Xóa/sửa sau khi nhả (chỉ bổ sung có audit) | QT21/QT23 Hồ sơ lưu trữ · CDC-MON (record retention) |

### 2.4 Tương thích nhiệt / phương pháp

| ID | Mức | Quy tắc | IN | OUT | Nguồn |
|----|-----|---------|----|-----|-------|
| M-26 | P0 | Khi **quét bộ vào phiếu**: đối chiếu PP của phiếu với thuộc tính bộ (BOM có `is_chiu_nhiet=false` hoặc `phuong_phap_tiet_khuan_chi_dinh` ≠ PP phiếu) → **chặn cứng** không cho thêm (A/B-5). | PP bộ = PP phiếu | Bộ không chịu nhiệt vào mẻ hơi nước; bộ chỉ định hơi nước vào Plasma/EO không có IFU | QT21 NT chung · L-A §3.2/§4 |
| M-27 | P0 | Bộ tách nhiệt Lock A: hai bộ thành phần vào **hai phiếu khác PP** độc lập; không ghép lại trước CP (dual-track). | Mỗi bộ thành phần 1 phiếu đúng PP | Bộ mẹ quét vào phiếu | L-A §4.4–4.5 · PO |
| M-28 | P1 | Phiếu Plasma: nhắc bao bì Tyvek, không cellulose; dụng cụ khô 100% — kiểm ở danh mục loại/PP, **không** thêm hạng mục trên `DONG_GOI`. | Cấu hình danh mục | Checklist mới trên Đóng gói | QT21 NT chung, HD.03 · CDC (packaging) · 17c |

## §3. Luồng tối thiểu (≤ 6 bước)

1. **Tạo phiếu:** chọn máy → tự sinh số mẻ (máy-ngày), tự suy PP; nếu hơi nước kiểm BD hôm nay (M-10/M-11). Người nạp = người đăng nhập.
2. **Chọn chương trình** (mặc định = chương trình dùng gần nhất của máy) → điền sẵn thông số chuẩn; hệ thống bật nhắc BI nếu bắt buộc (M-15) và cờ implant (M-09).
3. **Quét bộ** (chỉ bộ `DONG_GOI`, chặn sai PP — M-26). Không gõ tay.
4. **Bắt đầu** → khóa nạp, bộ sang `TIET_KHUAN`, ghi giờ bắt đầu.
5. **Kết thúc + kết quả:** ghi giờ kết thúc; 3 lựa chọn một chạm — Vật lý ĐẠT/KHÔNG (thông số điền sẵn, chỉ sửa khi lệch; đính kèm ảnh bản in), CI ngoài ĐẠT/KHÔNG, CI PCD ĐẠT/KHÔNG; BI: «Chưa có / Âm / Dương» (mặc định «Chưa có» khi không bắt buộc).
6. **Nhả:** đủ điều kiện M-18 → một nút «Nhả mẻ»; implant/chờ BI → `CHO_BI`, tự nhả khi nhập BI âm; KHÔNG ĐẠT → M-21/M-22 tự chạy.

## §4. Ngoài phạm vi phiếu mẻ

- Không tạo/sửa SC trên phiếu ngoài bản ghi tự động M-22/M-23; chi tiết SC → `/cssd-su-co`.
- Không đổi thứ tự 6 trạm; không thêm trạm «nhả» hay «chờ BI» (là trạng thái mẻ).
- UI thông báo **không** kèm mã QT (vd. «(QT.21)»).

## §5. Cần Nghĩa chọn A/B

| # | Câu hỏi | **A (Domain khuyến nghị)** | B |
|---|---------|---------------------------|---|
| AB-1 | Mẻ KHÔNG ĐẠT: bộ quay về đâu? | Về đầu dây chuyền xử lý lại «như dụng cụ bẩn» (chu trình về `TIEP_NHAN`, quét tiếp `LAM_SACH`→`QC`→`DONG_GOI`) — khớp QT21 NT chung + HD.02 | Về `DONG_GOI` đóng gói lại (như code hiện tại); chỉ gói ướt/rách mới về làm sạch |
| AB-2 | Implant cần gấp khi chưa có BI | Chặn cứng, không ngoại lệ trên phần mềm (QT23 «khóa quyền giải phóng đến khi có bản in BI âm») | Tổ trưởng CSSD được «nhả khẩn» có lý do bắt buộc + ghi audit + tự báo KSNK (CDC «if feasible») |
| AB-3 | Phạm vi thu hồi khi BI (+) | Thận trọng cho **mọi PP**: mọi mẻ của máy đó từ mẻ có BI âm gần nhất đến mẻ BI (+) (CDC «conservative approach») | Hơi nước: chỉ mẻ BI (+) + chạy lại BI ngay; mở rộng về BI âm gần nhất khi xác định máy lỗi. Plasma/EO vẫn theo A |
| AB-4 | Plasma/EO (BI mọi mẻ): nhả khi nào? | Chờ BI âm mới nhả (`CHO_BI`) — QT23 «sinh học đạt khi áp dụng» | Nhả sớm theo vật lý + CI; BI (+) sau đó → M-23 |
| AB-5 | Bộ sai PP/không chịu nhiệt vào phiếu hơi nước | Chặn cứng ngay khi quét vào phiếu | Cảnh báo khi quét, chặn cứng tại nút «Bắt đầu» |
| AB-6 | Ai được «Nhả mẻ»? | NV vận hành/QC đã được phân quyền nhả mẻ thường; **chỉ Tổ trưởng CSSD** nhả mẻ implant / mẻ `CHO_BI` | Chỉ Tổ trưởng CSSD nhả mọi mẻ (đúng chữ QT23 B5, nhiều thao tác hơn) |

## §6. Gap nhanh vs code (đọc tĩnh 2026-09-18, commit `f5ba649`)

- **Số mẻ:** `createCssdSterilizationBatch` sinh `LOT-<6 số cuối timestamp>` — không có số thứ tự máy-ngày (M-02).
- **Chương trình/phương pháp:** không có trường chương trình; PP suy bằng regex tên máy (`isSteamSterilizerProfile`, QC panel `EO|PLASMA`) — chưa có PP chuẩn trên phiếu (M-03/M-04).
- **Thông số vật lý:** cột `nhiet_do`, `ap_suat`, `thoi_gian_chu_ky` có nhưng `persistMeTietKhuanFinishWithClient` ghi text tự do vào `tk_qc_json`/`ghi_chu`; chưa theo PP (M-05) — chưa xác minh chỗ khác có ghi cột số.
- **Người nạp/nhả:** người nạp lưu dạng text trong `ghi_chu` («Người load: …»), `nguoi_van_hanh_id` không được set khi tạo; chưa có «người nhả» tách khỏi người dỡ (M-06, AB-6).
- **Implant / CHO_BI:** không có cờ implant ở danh mục/mẻ; `CHO_BI` chỉ đọc từ `tk_qc_json` (UI-ready), chưa có gate chặn CP (M-09, M-19). BI chưa bắt buộc theo PP/implant (M-14/M-15).
- **Tương thích nhiệt:** `fetchCssdBatchHeatRisk` chỉ hiện banner WARN/BLOCK; `getBatchAddRejectionReason` và «Bắt đầu» không chặn theo nhiệt/PP (M-26).
- **Nhả vs cấp phát:** mẻ ĐẠT set thẳng trạm `CAP_PHAT` + `thoi_gian_cap_phat` = giờ nhả → lẫn «sẵn sàng cấp phát» với «đã cấp phát» (M-18/M-24) — chưa xác minh ngữ nghĩa trạm trong RPC quét.
- **Thu hồi BI (+):** `cssd-batch-recall.ts` chỉ thu hồi cùng `lo_tiet_khuan_id` (đã CP → `TIEP_NHAN`, còn lại → `DONG_GOI`), chưa lùi về mẻ BI âm gần nhất, chưa lọc `used_clinically` (M-23, AB-3); gate CP theo SC tiệt khuẩn `OPEN|CONFIRMED` chưa thấy trong `assertPackIssuable` (chưa xác minh). Thông báo BD còn chuỗi «(QT.21)» trên UI (vi phạm §1-4).

## §7. Changelog

| Ngày | Việc |
|------|------|
| 2026-09-25 | v1.0 draft — Soft · Domain; nguồn CDC 2008 (Sterilizing Practices, Steam) + BV103 KSNK.QT.21/QT.23 v1.0; chờ PO A/B |

---

## QC, nhả mẻ (ME-S2)

Một lát trên nhánh S1. Không gồm truy vết thu hồi, in phiếu, UX nhãn.

## Máy và mã mẻ

- Dropdown chỉ máy có phương pháp `HOI_NUOC` | `PLASMA_H2O2` | `EO`, suy từ mã `LOAI_MAY_TIET_KHUAN` (`getSterilizerMethod`). Không regex tên máy.
- Mã mẻ sinh trong `rpc_cssd_me_tao`: `<mã máy rút gọn>-ddMMyy-n` theo lịch Việt Nam.

## QC và BI

- Kết thúc mẻ: thông số vật lý, CI ngoài gói, CI PCD — mỗi mục Đạt hoặc Không đạt. Thiếu hoặc chưa đánh giá thì server từ chối.
- Một mục Không đạt hoặc BI dương → `QC_KHONG_DAT` (BI dương đi sự cố `PROCESS_BI_POSITIVE`).
- BI bắt buộc (plasma, EO, hoặc bộ `is_implant`) mà chưa có kết quả → `CHO_BI`. Bộ ở lại trạm tiệt khuẩn.
- Hơi nước không implant: BI chưa có vẫn nhả; nhắc nếu máy chưa có BI trong 7 ngày.
- `ket_qua_bi` / `ket_qua_ci` để trống khi chưa có kết quả — không ghi `false`.

## Nhả và cấp phát

- Nhả (`HOAN_THANH`) chuyển bộ sang trạm cấp phát (kho vô khuẩn) và gán hạn dùng. Không ghi `thoi_gian_cap_phat` / `nguoi_cap_phat_id`.
- Người nạp, người dỡ, người nhả là user phiên, giờ server.
- Nhả mẻ thường: quyền `CSSD_ME_TIET_KHUAN.edit` (AB-6 A · NV/QC có quyền nhả). Nhả mẻ implant hoặc nhập BI cho `CHO_BI`: quyền `qc` = **tổ trưởng** (Soft map RBAC; Domain 18b AB-6 A). Soft **không** có nhả khẩn implant khi chưa BI âm (AB-2 A).
- Cổng cấp phát: mẻ `HOAN_THANH`, không `CHO_BI`, không sự cố tiệt khuẩn đang mở hoặc đã xác nhận gắn mẻ/bộ.

## Bowie–Dick

- Chỉ máy hơi nước. Ghi người và giờ vào `specs`. Không đạt thì chặn tạo mẻ hơi nước đến khi có BD đạt mới.

## Schema

Migration `20260925100000_cssd_me_s2_qc_release.sql` (additive). Migration S1 đổi timestamp `20260925090000` để không trùng kiểm kê. Index một mẻ mở/máy bỏ qua dữ liệu cũ trùng, không xóa dòng; mẻ `CHO_BI` không khóa máy.

---

## Không đạt, thu hồi, truy vết (ME-S3)

Một lát trên nhánh ME-S2. Không gồm UX nhãn.

## Không đạt

Mẻ không đạt (một mục QC hoặc BI dương lúc kết luận) cập nhật mẻ, bộ và sự cố trong `rpc_cssd_me_thu_hoi`. Không thu hồi xong rồi mới ghi mẻ.

Domain 18b **AB-1 A**: về `TIEP_NHAN` (không `DONG_GOI`). Mọi bộ chưa dùng lâm sàng: đóng chu kỳ cũ (`is_active = false`, giữ `lo_tiet_khuan_id`, khóa chu kỳ đó) và mở chu kỳ mới tại Tiếp nhận, không gắn mẻ, để xử lý lại như dụng cụ bẩn. Không về Đóng gói. Máy đang sẵn sàng chuyển `HOLD_QC`.

## BI dương

Kể cả mẻ đã nhả. Mẻ dương: `trang_thai_bi = DUONG`. Đã nhả thì `THU_HOI`, chưa nhả thì `QC_KHONG_DAT`. `ket_qua_test = false` — không còn hiển thị Đạt.

Domain 18b **AB-3 A** (mọi PP): phạm vi cùng máy, sau mẻ BI âm gần nhất (mốc, không thu hồi) đến hết mẻ dương. Không có mốc âm thì lấy từ đầu đến mẻ dương. Không lấy mẻ chạy sau mẻ dương. Mẻ khác trong cửa sổ chuyển `THU_HOI`.

Bộ đã có `ma_ca_mo_id` không đổi trạm. Tên bộ ghi trên phiếu sự cố (`RECALL_LISTED_USED`) và trả về cho màn mẻ. Bộ chưa dùng bị thu hồi như trên.

Luồng mẻ không còn nhánh dedupe trả về trước khi thu hồi. Phiếu cùng mẻ và loại sự cố được cập nhật sau khi thu hồi, trong cùng transaction.

## Đếm và in

«Số bộ» và danh sách trên phiếu đếm mọi chu kỳ còn `lo_tiet_khuan_id`, kể cả chu kỳ đã đóng. Truy vấn thu hồi chỉ lấy `is_active = true`.

Phiếu in đọc cột ME-S2: mã mẻ, máy, phương pháp, chương trình, nhiệt độ, áp suất, thời gian chu kỳ, tên người nạp / dỡ / nhả theo user id, giờ bắt đầu, giờ kết thúc chu trình (`tk_mo_form_qc_at`), giờ nhả, ba mục QC bằng chữ Đạt hoặc Không đạt, BI Chưa có / Âm / Dương, cờ implant, danh sách bộ. In được mẻ không đạt và chờ BI. Không in mã thủ tục.

Cấp phát ghi `ma_ca_mo_id` bằng `jsonb ||`, không ghi đè metadata. Lỗi cập nhật cấp phát được trả ra. Ngoại lệ quy trình nối mảng `ngoai_le` bằng RPC.

## Schema

Migration `20260925120000_cssd_me_s3_batch_recall.sql`. Thêm giá trị `THU_HOI` vào check `trang_thai_me`. Không bảng mới.
