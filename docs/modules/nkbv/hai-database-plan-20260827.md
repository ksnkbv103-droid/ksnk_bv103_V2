# Kế hoạch dữ liệu NKBV — khớp timeline trên màn hình

> **Ngày:** 2026-08-27 (viết lại lời dễ đọc)  
> Đối chiếu **đúng lưới đang chạy** (`NkbvBaCommonDayGrid` + `NkbvBaDayGrid`), không đoán.  
> **Chưa sửa phần mềm** trong đợt này.  
> **Tổ chức lại CSDL (đập demo, xây chuẩn):** [`hai-database-rebuild-plan-20260827.md`](hai-database-rebuild-plan-20260827.md) — chờ PO duyệt trước khi migration.

Một câu: **cột = loại thông tin, hàng = từng ngày dương lịch.** Máy tô màu khung ngày khi bạn chọn một xét nghiệm hoặc một phim — khung đó **không** lưu thành bảng riêng (đổi xét nghiệm thì khung đổi).

---

## Thuật ngữ trên lưới (đọc cột như trên app)

Trên bảng, hai cột dính trái ghi **Date** và **HD** (tiếng Anh hẹp cho vừa ô). Nghĩa tiếng Việt:

| Trên màn hình | Tiếng Việt | Ý nghĩa |
|---------------|------------|---------|
| **Date** | **Ngày lịch** | Ngày dương lịch (1/8, 2/8…). Mọi “cộng trừ 3 ngày” đều theo cột này, không theo giờ đồng hồ. |
| **HD** | **Ngày nằm viện** | Số thứ tự ngày nằm: **ngày vào viện = 1**. Trước ngày vào viện hiện **—**. Dùng để biết nhiễm từ ngày 3 trở đi (HAI) hay sớm hơn (POA). |
| **XN** | Xét nghiệm vi sinh | Chip: bệnh phẩm, vi khuẩn, số lượng. Bấm **từng** chip để phân tích. |
| **CĐHA** | Chẩn đoán hình ảnh | Hiện: XQ/CT **phổi** và **áp xe** (SSI). |
| **TC SSI** | Tiêu chuẩn vết mổ + **ngày mổ** | Mủ, mở vết… và “Ngày mổ (Day 1 SP)”. |
| **Khoa** | Khoa điều trị **theo từng ngày** | **Chọn từ danh sách khoa (mã)** — thống nhất; app hiện còn ô gõ, chưa lưu |
| **CVC / Vent / Foley** | Đường truyền trung tâm / thở máy / ống thông tiểu | Tick từng ngày. |
| **Index X** (khi đã chọn) | **Ngày X** | Ngày của xét nghiệm hoặc phim **đang** phân tích. |
| **IWP · LS** | Khung ±3 ngày quanh Ngày X + triệu chứng | Tô màu; sốt/đau nhập ở đây cũng ghi vào bệnh án. Ngày triệu chứng **đầu** trong khung = **ngày sự kiện** (DOE). |
| **RIT** | 14 ngày từ ngày sự kiện | Cùng loại nhiễm: không mở ca mới, gom mẫu vào ca cũ. |
| **SBAP** | Khung xét **cấy máu** | Máu (+) khớp ổ tại chỗ → nhiễm khuẩn huyết **thứ phát** (không gắn CLABSI). |
| **Kết luận / Ghi chú** | Chốt phiên | Nút Tạo phiếu mới ra phiếu trong kho. |

Khung bảng chung: từ **2 ngày trước vào viện** (nhìn POA) đến ra viện hoặc hôm nay.

---

## Quy tắc thống nhất (khóa PO — 2026-08-27)

**Một chỗ nhập: lưới timeline.** Khoa chuyển, Foley, máy thở, CVC: **tích (hoặc chọn) trên lưới** → đó là dữ liệu **bệnh án**. Phiếu xác định ca **đọc theo bệnh án**, không nhập lại trên form. **Bỏ tích / đổi khoa** trên lưới → máy **sửa lại** bệnh án và phiếu đang gắn bệnh án đó (cùng một nguồn, không giữ bản cũ lệch).

| Việc | Trên lưới | Lưu bệnh án | Phiếu xác định ca |
|------|-----------|-------------|-------------------|
| **Khoa điều trị** | Chọn từ **danh sách khoa theo mã** (không gõ tự do) | Có — từng ngày / chuỗi ngày liền cùng khoa | Lịch chuyển khoa + khoa quy kết **theo lưới**, không bảng lịch sử khoa riêng trên phiếu |
| **Foley / máy / CVC** | Tích từng ngày (chỉ trong đợt nằm viện) | Có — tích = có dụng cụ ngày đó; **bỏ tích = xóa** ngày đó trên bệnh án | Ngày đặt/rút, “còn tại ngày sự kiện” **tính từ các ô đã tích**, không tick lại trên phiếu |
| Sốt, CĐHA, ngày mổ | Như hiện tại | Bệnh án | Phiếu chụp khi tạo / **làm mới khi lưới đổi** |

**Không còn hai sổ:** không nhập Foley/máy/CVC một lần trên lưới, một lần trên sổ đặt–rút. Sổ đặt–rút (nếu còn trên màn) chỉ **hiện** từ các ngày đã tích (ngày đầu tích = đặt, ngày cuối tích liên tục = rút).

**Phiếu nháp và phiếu đã tạo:** đổi lưới thì cập nhật phần **khoa + dụng cụ** trên phiếu. Kết luận loại nhiễm (CLABSI / CAUTI…) **không** tự đổi im lặng — IP xem lại gợi ý máy nếu ngày dụng cụ làm thay điều kiện gắn.

---

## Timeline của bạn gồm những gì — và đang lưu ở đâu

Lưới **không** nằm trọn một bảng. Máy ghép nhiều chỗ, đặt lên **đúng ngày lịch**:

| Cột trên lưới | Có trên màn? | Lưu vào đâu khi F5 / mở lại? |
|---------------|--------------|------------------------------|
| Ngày lịch (Date) | Có — tính từ vào viện ± bằng chứng | **Không lưu** (máy vẽ cột) |
| Ngày nằm viện (HD) | Có — HD1 = vào viện | **Không lưu** (tính từ ngày vào viện trên hồ sơ) |
| XN | Có | Bảng xét nghiệm (`nkbv_fact_vi_sinh`) — ngày lấy mẫu |
| CĐHA | Có | Bảng mốc bệnh án (`nkbv_fact_ba_timeline`) |
| TC SSI + ngày mổ | Có | Cùng bảng mốc bệnh án |
| Triệu chứng khi đang phân tích (IWP · LS) | Có khi đã chọn XN/phim | Cùng bảng mốc bệnh án (sốt, đau…) |
| Khoa từng ngày | Có ô — **sẽ** chọn danh sách mã khoa | **Quy tắc:** lưu bệnh án; hiện **chưa lưu** (F5 mất) |
| CVC / Vent / Foley | Có tích từng ngày | **Quy tắc:** lưới = nguồn duy nhất; hiện còn **thêm** sổ đặt–rút (hai chỗ) |
| Kết luận phiên | Có | Phiếu chỉ khi bấm **Tạo phiếu** (`nkbv_fact_su_kien`) |

**Bảng mốc bệnh án** (`nkbv_fact_ba_timeline`) là chỗ bạn đã xây cho: phim, triệu chứng, ngày mổ, tick dụng cụ theo ngày, ghi chú. **Không** chứa xét nghiệm LIS (tránh chép đôi). **Không** chứa “khung ±3 ngày” (máy tính lúc chọn Ngày X).

Mỗi dòng mốc: **mã bệnh án + ngày lịch + loại dấu hiệu** (sốt, XQ phổi, Foley…). Một bệnh án không tick hai lần cùng một dấu hiệu trong cùng một ngày.

---

## Cách xác định sự kiện (bám đúng lưới)

1. Phải có **ngày vào viện** trên hồ sơ — không có thì không có HD1, chưa phân loại HAI/POA.  
2. Chọn **một** chip XN, hoặc một CĐHA, hoặc một TC SSI / ngày mổ. Đó là **Ngày X**.  
3. Máy tô:  
   - cấy máu / nước tiểu / đờm (không SSI, không VAE): **±3 ngày lịch** quanh Ngày X;  
   - vết mổ: **30 hoặc 90 ngày** từ ngày mổ (không dùng ±3);  
   - thở máy VAE: **14 ngày** từ ngày xấu đi (không dùng phim để chẩn VAE).  
4. Trong các ngày đang tô: lấy sốt, phim, cấy đã có trên lưới. Ngày **sớm nhất** có đủ dấu = **ngày sự kiện**.  
5. So ngày sự kiện với HD: từ HD3 trở đi mới tính nhiễm bệnh viện (HAI); sớm hơn = POA.  
6. Máu: xét **thứ phát** trước, rồi mới CLABSI.  
7. Bấm Tạo phiếu: lấy khoa + dụng cụ + triệu chứng **đang có trên lưới/bệnh án**. **Đổi tích trên lưới sau đó** → cập nhật lại khoa/dụng cụ trên phiếu (không bắt nhập lại trên form).

Thiếu sốt/phim trong khung → **không** tự gắn nhiễm khuẩn.

---

## Có cần chỉnh trên phần mềm không? (đã khóa quy tắc — chưa code)

Lưới **đúng hướng**. Việc còn lại là **làm đúng quy tắc thống nhất** ở trên:

1. **Khoa:** dropdown danh mục khoa (mã + tên), lưu từng ngày vào bệnh án; bỏ/đổi khoa → phiếu theo.  
2. **Foley / máy / CVC:** chỉ tích lưới; bỏ tích → xóa trên bệnh án và sửa phiếu. Sổ đặt–rút không còn nhập tay.  
3. Form phiếu: khoa + dụng cụ **chỉ đọc** (hoặc sửa thì sửa trên lưới).  

CĐHA hẹp / in từng phim: việc khác, không gộp chat này.

**Không làm:** bảng khung ±3 ngày; chép LIS sang mốc; nhập khoa tự do.

---

## Hồ sơ / xét nghiệm / phiếu (ba ngăn, lời thường)

| Ngăn | Tên bảng | Việc |
|------|----------|------|
| Hồ sơ đợt nằm | `nkbv_fact_benh_an` | Mã bệnh án, họ tên, **ngày vào / ra viện**, khoa lúc nhập (= khoa ngày vào viện nếu đã chọn trên lưới) |
| Xét nghiệm copy LIS | `nkbv_fact_vi_sinh` | Ngày lấy mẫu, bệnh phẩm, khuẩn — **cột XN** |
| Mốc trên lưới | `nkbv_fact_ba_timeline` | CĐHA, TC SSI, ngày mổ, triệu chứng — **không** Foley/máy/CVC |
| Khoa từng ngày | `nkbv_fact_ba_ngay_khoa` | Chọn khoa theo **mã** trên lưới |
| Foley / máy / CVC | `nkbv_fact_ba_ngay_dung_cu` | Tích ô = có; đặt–rút = view `nkbv_v_ba_dung_cu_dat_rut` |
| Phiếu đã chốt | `nkbv_fact_su_kien` | Kết luận nhiễm khuẩn — đọc khoa/dụng cụ từ lưới |
| Số ngày khoa (tỷ lệ) | `nkbv_fact_mau_so_*` | Nhập tay theo khoa — **không** suy từ lưới ca |

Copy LIS / HIS: **đã có mã bệnh án thì không đè** ngày vào viện, tên, khoa.

---

## Bảng mốc bệnh án — cột cần nhớ (lời thường)

| Cột kỹ thuật | Nghĩa |
|--------------|--------|
| Ngày mốc | Đúng **ngày lịch** của ô trên lưới |
| Loại mốc | Phim ngực / triệu chứng / ngày mổ / xét nghiệm tay / ghi chú |
| Khóa dấu hiệu | “Đây là sốt”, “đây là XQ phổi”, “đây là Foley…” — máy mới biết đưa vào khung nào |
| Đang dùng | Tắt = xóa mềm (không tick trùng) |

Không ghi vào đây: số HD, khung tô màu, kết luận phiếu.

---

## Việc tiếp theo (khi làm trên app)

Làm theo **từng phần** trong [`hai-database-rebuild-plan-20260827.md`](hai-database-rebuild-plan-20260827.md) — không vá từng cột trên model cũ (dụng cụ đang nằm trong “triệu chứng”, khoa chưa có bảng).

---

*Chi tiết thuật toán CDC (IWP, DOE…): file domain. File này chỉ nói **lưới bạn đang dùng** và **chỗ lưu / chỗ chưa lưu**.*
