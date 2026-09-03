# Kế hoạch tổ chức lại CSDL NKBV (demo → chuẩn)

> **Ngày:** 2026-08-27 · **Loại:** kế hoạch trước khi code  
> **Đối chiếu DB thật:** project `ksnk-bv103-prod` (Postgres 17) — **không đoán.**  
> **Đã triển khai** (2026-08-27): xóa demo NKBV; bảng ngày–khoa + ngày–dụng cụ; phiếu đọc BA.

Một câu: **bệnh án là trung tâm; lưới ngày là nơi nhập; phiếu chỉ kết luận.** CSDL phải phản ánh đúng câu đó — mỗi loại sự thật một bảng, không chép đôi.

---

## 1. Hiện trạng đo được (27/08/2026)

| Bảng vật lý | Số dòng | Việc đang làm | Vấn đề |
|-------------|---------|---------------|--------|
| `nkbv_fact_benh_an` | 37 | Đợt nằm viện | Khoa **một** ô lúc nhập; **không** có khoa từng ngày |
| `nkbv_fact_vi_sinh` | 48 | Copy LIS | Chép lại họ tên / ngày vào viện (dễ lệch bệnh án) |
| `nkbv_fact_ba_timeline` | 123 đang dùng | Mốc lưới | Foley/máy/CVC **nhét vào loại “triệu chứng”** (`device_foley`…) |
| `nkbv_fact_device_registry` | 27 | Sổ đặt–rút | **Nguồn thứ hai** cho cùng dụng cụ; **không** khóa FK bệnh án |
| `nkbv_fact_su_kien` | 8 | Phiếu xác định ca | Họ tên / ngày vào / khoa / dụng cụ nằm trong cột + JSON `verification_data` |
| `nkbv_fact_mau_so_daily` | 5 | Mẫu số khoa/ngày (tỷ lệ) | Đúng vai trò **báo cáo khoa**, không dùng để chẩn một ca |
| `nkbv_fact_mau_so_phau_thuat` | 3 | Mẫu số mổ | Giữ — SSI SIR |
| `nkbv_fact_labid_event` | **0** | LabID/MDRO module | **Ngoài domain v3.3** — không xây tiếp |
| `nkbv_dm_cdc_baseline` | 0 | Ngưỡng CDC theo khoa | Giữ danh mục; chưa dùng |

Kích thước toàn bộ cụm NKBV **< 1 MB**. Đây là **demo**. Đập–xây trong module này **hợp lý**; không đụng CSSD / VST / GSC / danh mục khoa.

**Lưới Khoa** trên màn: ô gõ, **chưa có bảng**. F5 mất.

---

## 2. Nguyên tắc “chuẩn mực” (khóa)

Không làm kho NHSN đầy đủ (CLIP, LabID, AUR, CDC Location). Không bảng tổng hợp sẵn. Không một bảng cho mỗi loại nhiễm khuẩn.

| Nguyên tắc | Nghĩa vận hành |
|------------|----------------|
| **1 đợt nằm = 1 bệnh án** | Mã bệnh án duy nhất; ngày vào/ra là **ngày lịch** (không lấy giờ để tính HAI) |
| **1 sự thật 1 chỗ** | Khoa theo ngày, Foley/máy/CVC theo ngày, xét nghiệm LIS, triệu chứng/CĐHA — **không** lưu lần hai trên phiếu |
| **Ngày lịch = đơn vị CDC** | Tích ô ngày = 1 ngày dụng cụ / 1 ngày khoa. Ngày đặt–rút **tính ra** từ chuỗi ô liền, không nhập tay |
| **Danh mục khoa = MDM** | Chọn `mdm_dm_khoa_phong` theo **mã khoa**. Không gõ tự do. Không copy danh mục khoa vào NKBV |
| **Phiếu = kết luận** | Loại nhiễm + trạng thái + ngày sự kiện IP chốt. Khoa/dụng cụ **đọc theo bệnh án**; sửa lưới → phiếu theo. **Không** tự đổi loại CLABSI/CAUTI |
| **Cửa sổ không lưu bảng** | ±3 ngày, RIT, SBAP máy tính lúc chọn xét nghiệm |
| **Mẫu số ≠ ca bệnh** | Số ngày điều trị / Foley / máy / CVC **của cả khoa** vẫn nhập riêng (`mau_so_*`). Không suy từ vài bệnh án đang điều tra |

---

## 3. Mô hình đích (sáu ngăn)

```
Bệnh án (đợt nằm)
  ├── Ngày–khoa          ← cột Khoa trên lưới
  ├── Ngày–dụng cụ       ← cột CVC / Vent / Foley
  ├── Mốc lâm sàng       ← CĐHA, triệu chứng, ngày mổ (không gồm dụng cụ)
  ├── Xét nghiệm LIS     ← cột XN (không chép sang mốc)
  └── Phiếu xác định ca  ← kết luận; đọc khoa + dụng cụ từ hai bảng ngày
Mẫu số khoa (tỷ lệ)      ← báo cáo tháng; tách khỏi ca
```

### 3.1. Giữ và chỉnh

| Bảng | Việc |
|------|------|
| `nkbv_fact_benh_an` | Hồ sơ đợt nằm. Khoa lúc nhập **có thể** = khoa ngày vào viện (đồng bộ từ bảng ngày–khoa, không phải nguồn lịch sử chuyển khoa). Ngày vào/ra: **kiểu ngày lịch**. |
| `nkbv_fact_vi_sinh` | Chỉ xét nghiệm. Bắt buộc `ma_benh_an`. Họ tên trên dòng LIS = **bản copy lúc nhập** (tiện đối chiếu file), **không** sửa thay bệnh án. |
| `nkbv_fact_ba_timeline` | Chỉ triệu chứng / CĐHA / ngày mổ / ghi chú. **Cấm** `device_*`. Unique: bệnh án + ngày + mã dấu hiệu. |
| `nkbv_fact_su_kien` | Phiếu. Bắt buộc gắn bệnh án. JSON chỉ còn: cửa sổ lúc phân tích, ô tiêu chí IP tick, Index xét nghiệm. **Không** JSON lịch sử khoa / ngày đặt Foley. |
| `nkbv_fact_mau_so_daily` / `_phau_thuat` | Giữ. |
| `nkbv_dm_cdc_baseline` | Giữ. Loại/trạng thái phiếu vẫn `sys_lookup_value` (view `nkbv_dm_loai`, `nkbv_dm_trang_thai_ca`). |

### 3.2. Thêm (hai bảng — khớp lưới)

| Bảng mới | Một dòng là | Khóa |
|----------|-------------|------|
| `nkbv_fact_ba_ngay_khoa` | Bệnh án + **một ngày lịch** + **một khoa** (id danh mục) | Unique (mã BA, ngày). Một ngày một khoa. |
| `nkbv_fact_ba_ngay_dung_cu` | Bệnh án + ngày + loại (`CVC` / `VENT` / `FOLEY`) | Unique (mã BA, ngày, loại). Có dòng = đang tích. Xóa dòng = bỏ tích. |

Cả hai: FK `ma_benh_an` → bệnh án; khoa → `mdm_dm_khoa_phong(id)`; RLS cùng quyền `GIAM_SAT_NKBV`.

**Sổ đặt–rút:** **view** (ngày đầu / ngày cuối chuỗi tích liền). Không bảng nhập.

### 3.3. Bỏ / không dùng nữa

| Hiện có | Quyết định |
|---------|------------|
| `nkbv_fact_device_registry` (nhập tay) | **Không còn nguồn nhập.** Xóa bảng sau khi view thay; app không form đặt–rút. |
| `nkbv_fact_labid_event` | **Xóa.** Domain không làm LabID. |
| Dụng cụ trong `nkbv_fact_ba_timeline` (`device_foley`…) | **Chuyển** sang bảng ngày–dụng cụ rồi xóa các mốc đó. |
| `treatment_history` trong JSON phiếu | **Không lưu.** Đọc từ ngày–khoa. |
| Ch.15 CDC Location | **Không** thêm bảng. |

Liên kết CSSD trên phiếu SSI (`quy_trinh_id`, QR mẻ) **giữ** — không thuộc đập–xây lõi.

---

## 4. Cách triển khai từng phần (thứ tự bắt buộc)

Làm **tuần tự**. Mỗi phần xong mới sang phần sau. Demo: **xóa dữ liệu NKBV** (37 bệnh án) khi bắt đầu phần 1 — không cố chuyển demo lệch model.

### Phần 0 — Khóa giấy + môi trường

- Tài liệu này + quy tắc lưới đã khóa (`hai-database-plan-20260827.md`).
- **Không** đụng module khác.
- Local: migrate thử; remote demo: truncate cụm `nkbv_fact_*` khi user xác nhận xóa.

*Verify:* đọc lại 3 tình huống kiểm tay mục 6 — chưa chạy app.

### Phần 1 — Khung bệnh án + ngày–khoa

**Mục tiêu:** cột Khoa chọn danh sách mã; F5 còn; một ngày một khoa.

1. Migration: tạo `nkbv_fact_ba_ngay_khoa` + RLS + index `(ma_benh_an, ngay_lich)`.  
2. Cột `ngay_vao_vien` / `ngay_ra_vien`: lưu/đọc theo **ngày lịch Việt Nam** (tránh lệch HD vì múi giờ).  
3. UI: dropdown khoa (`ma_khoa` + tên), ghi/xóa dòng ngày–khoa.  
4. RPC hub bệnh án: trả thêm lịch khoa theo ngày.

*Verify:* `mdm:migrate:local` → `verify:mdm:local` → `verify:engineering`. Tay: chọn khoa, F5 còn; đổi khoa ngày 5.

### Phần 2 — Ngày–dụng cụ (một nguồn)

**Mục tiêu:** chỉ tích CVC/Vent/Foley trên lưới; bỏ tích = hết ngày đó trên bệnh án.

1. Migration: tạo `nkbv_fact_ba_ngay_dung_cu`.  
2. View đặt–rút (chuỗi ngày liền).  
3. UI: tích/bỏ tích ghi bảng này — **không** ghi timeline, **không** ghi registry.  
4. Ẩn form sổ đặt–rút.  
5. Gỡ `device_*` khỏi loại “triệu chứng” trên timeline.

*Verify:* như trên + spec ngày dụng cụ. Tay: tích 3 ngày Foley, bỏ ngày giữa → bệnh án không còn ngày giữa; view đặt–rút tách 2 đoạn.

### Phần 3 — Mốc lâm sàng sạch

**Mục tiêu:** timeline chỉ sốt / CĐHA / ngày mổ / ghi chú.

1. CHECK loại mốc: không nhét dụng cụ.  
2. Unique như hiện tại (BA + ngày + `criteria_key`) **chỉ** cho dấu hiệu lâm sàng.  
3. Engine đọc dụng cụ từ bảng ngày–dụng cụ, không từ mốc SYMPTOM.

*Verify:* `verify:engineering` + spec lưới. Tay: tích sốt và Foley cùng ngày — hai chỗ khác nhau, không đè nhau.

### Phần 4 — Phiếu đọc bệnh án

**Mục tiêu:** form phiếu **không** bắt nhập lại khoa / Foley / máy / CVC.

1. Khi mở / tạo phiếu: khoa quy kết + lịch chuyển + ngày dụng cụ **lấy từ hai bảng ngày**.  
2. Đổi/bỏ tích trên lưới → cập nhật **phần khoa + dụng cụ** trên phiếu đang gắn bệnh án đó.  
3. **Không** tự đổi `loai_nkbv` (CLABSI / CAUTI…). IP xem lại nếu điều kiện gắn đổi.  
4. JSON phiếu: bỏ `treatment_history` / ngày đặt–rút copy tay.

*Verify:* tạo phiếu → đổi khoa trên lưới → phiếu cùng khoa; bỏ tích Foley → phiếu không còn ngày đó; loại nhiễm giữ nguyên.

### Phần 5 — Copy LIS / HIS (không đè bệnh án)

**Mục tiêu:** khớp luồng đã khóa — không đổi model ca.

1. LIS: đã có mã bệnh án → **chỉ** thêm xét nghiệm, **không** đè ngày vào viện / tên. Chưa có mã → tạo bệnh án rồi lưu XN.  
2. HIS copy: **không** đè bệnh án đã có (sửa lệch hiện tại).  
3. XN: khóa `ma_xet_nghiem` như hiện tại.

*Verify:* spec import + 3 case LIS/HIS đã khóa trên giấy luồng dữ liệu.

### Phần 6 — Dọn bảng thừa

1. Xóa `nkbv_fact_labid_event`.  
2. Xóa `nkbv_fact_device_registry` sau khi app + view ổn.  
3. Cập nhật `fn_nkbv_ba_hub`: stay + LIS + ngày–khoa + ngày–dụng cụ + mốc + phiếu.  
4. Changelog `implementation-mapping.md`.

*Verify:* `verify:mdm` + `verify:engineering`. Không còn action ghi registry.

### Phần 7 — Mẫu số tỷ lệ (không gộp vào ca)

Giữ nhập `mau_so_*` như hiện tại. **Không** tính tỷ lệ khoa từ 37 bệnh án điều tra.

Việc sau (chat khác): nếu sau này module có **đủ** ngày khoa/dụng cụ của **mọi** người bệnh trong khoa — khi đó mới bàn suy mẫu số từ bảng ngày. Chưa đủ thì **cấm** suy.

---

## 5. Việc cố ý không làm

- API HIS/LIS/PACS  
- CLIP / LabID / AUR / map CDC Location  
- Bảng khung ±3 ngày / RIT  
- Tự đổi loại nhiễm khi bỏ tích dụng cụ  
- CĐHA từng phim / in từng phim (chat khác)  
- Đập CSSD, VST, GSC, `mdm_dm_khoa_phong`

---

## 6. Ba tình huống kiểm tay (nghiệm thu cả cụm)

1. **Khoa:** chọn khoa theo mã trên 2 ngày liền; F5 còn; tạo phiếu; đổi khoa ngày 2 → phiếu hiện khoa mới; loại nhiễm không đổi.  
2. **Dụng cụ:** tích Foley 1–3; phiếu thấy còn Foley ngày sự kiện nếu ngày đó nằm trong 1–3; bỏ ngày 2 → bệnh án và phiếu **không** còn Foley ngày 2; sổ đặt–rút (nếu còn) chỉ **hiện**, không sửa tay.  
3. **Không nhập lần hai:** mở form phiếu — không ô bắt gõ khoa/Foley nếu lưới đã có; gõ sốt trên lưới → bệnh án có sốt; phiên phân tích Index khác vẫn thấy sốt.

---

## 7. Rủi ro

1. App còn đường ghi `device_registry` + mốc `device_*` — nếu làm phần 2 không gỡ hết sẽ **lại hai sổ**.  
2. Phiếu cũ trong JSON (8 phiếu demo) sẽ **không** khớp model mới → xóa demo, không migrate JSON.  
3. `mau_so_daily` nếu ai đó “tối ưu” suy từ lưới ca → **sai mẫu số khoa** (thiếu người bệnh không nằm trong điều tra).

---

## 8. Giả định cần PO chốt

1. **Xóa hết dữ liệu demo NKBV** trên môi trường đang dùng (37 bệnh án, 8 phiếu) khi bắt đầu phần 1.  
2. **Mẫu số khoa** vẫn nhập tay theo khoa/ngày — không suy từ lưới ca trong giai đoạn này.

---

*Thuật toán CDC: domain SSOT. Lưới: `hai-database-plan-20260827.md`. File này = **cách tổ chức bảng** và **thứ tự làm**.*
