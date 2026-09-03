# Timeline bệnh án và mẫu báo cáo chẩn đoán HAI

> **Ngày:** 2026-08-27 · **Loại:** phân tích vận hành + hợp đồng mẫu báo cáo  
> **Neo UI:** [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md)  
> **Neo thuật toán:** [`hai-surveillance-domain-ssot-20260827.md`](hai-surveillance-domain-ssot-20260827.md) · luồng dữ liệu [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md)  
> **Neo phiếu tinh gọn:** [`investigation-forms/01-shared-spine.md`](investigation-forms/01-shared-spine.md) (hàng 0–9)  
> **Không sửa `src/` trong đợt giấy này.**

Mục tiêu: dùng **một trục ngày trên bệnh án** làm nơi nhập bằng chứng; bảng phân tích = kính lúp; phiếu/báo cáo = ảnh chụp để khoa lâm sàng và lãnh đạo đọc được sự kiện — **không nhập lần hai**.

---

## 1. Timeline đang chạy — ba lớp trên cùng một bệnh án

Một đợt nằm viện = một lưới ngày (cột = ngày lịch; hàng = loại bằng chứng). Phân tích **không** mở form trống: chọn **một Index** (một xét nghiệm, hoặc một XQ/CĐHA, hoặc một tiêu chuẩn SSI) thì máy phủ **cửa sổ** lên đúng lưới đó.

| Khối | Người dùng thấy | Vai trò |
|------|-----------------|---------|
| **Bảng chung** | 6 hàng: ngày lịch · ngày nằm viện · vi sinh (nhiều chip/ngày) · CĐHA · TC SSI · khoa | Toàn cảnh đợt nằm viện; nhập XQ / triệu chứng SSI / khoa |
| **Bảng phân tích** | Cùng cột ngày + tô IWP (hoặc SP SSI / Event Period VAE) · triệu chứng LS · RIT · SBAP · dụng cụ | Chỉ hiện sau khi chọn Index; máy gợi ý kết luận |
| **Kết luận** | Gợi ý CDC hoặc chữ IP (chế độ tự phân tích) | **Tạo phiếu** mới thành sự kiện; **Bỏ qua** thì XN ra hàng đợi |

Đây là cách CDC làm việc trên giấy (cửa sổ quanh Index), nhưng **sinh động**: mọi sự kiện khác trên cùng BA (cấy khác, sốt ngày khác, chuyển khoa) vẫn nhìn thấy — không mất ngữ cảnh.

### 1.1. Gõ vào đâu thì lưu vào đâu (app hiện tại)

| Việc | Ghi ngay | Chưa ghi phiếu sự kiện |
|------|----------|-------------------------|
| Sốt, đau, mủ, … trên lưới (kể cả hàng triệu chứng của phiên phân tích) | Hồ sơ BA (`nkbv_fact_ba_timeline`) | Đúng |
| XQ / CT / siêu âm trên hàng CĐHA | Hồ sơ BA (mốc hình ảnh) | Đúng |
| Ngày mổ | Hồ sơ BA | Đúng |
| Khoa theo ngày | Hồ sơ BA (chọn **danh sách khoa theo mã**) | Đúng — phiếu theo lưới |
| CVC / Foley / máy thở | Hồ sơ BA (**tích từng ngày trên lưới**; bỏ tích = xóa) | Đúng — phiếu theo lưới; không sổ đặt–rút tay |
| Copy LIS | Kho vi sinh (+ tạo BA nếu chưa có mã) | Không tự tạo phiếu |
| Bấm **Tạo phiếu** | Phiếu sự kiện + ảnh chụp tiêu chí/cửa sổ vào `verification_data` | — |

Khi mở phiên, máy **kéo** triệu chứng đã có trên BA vào cửa sổ (`hydrateLamSangDraftFromBa`). Gõ thêm trên phiên **cũng ghi BA** — lần sau Index khác vẫn thấy.

**Lệch so với yêu cầu “lưu vào phiếu phân tích ngay khi gõ”:**

- **Phiên phân tích** (khối 2) = nháp trên màn (kèm localStorage), **chưa** là phiếu trong kho sự kiện.  
- **Phiếu xác định ca** chỉ có sau nút Tạo phiếu. Ảnh chụp lúc đó gồm triệu chứng đã map sang ô form; **XQ/CĐHA** chỉ gắn chắc khi Index chính là CĐHA (PNEU), chưa phải danh sách mọi phim trên lưới.  
- **Khoa + Foley/máy/CVC:** đổi trên lưới thì **sửa lại** trên phiếu (cùng nguồn bệnh án). **Loại nhiễm** (CLABSI / CAUTI…) **không** tự đổi im lặng — IP xem lại nếu ngày dụng cụ đổi điều kiện gắn.  
- Triệu chứng sốt gõ thêm sau khi đã Tạo phiếu: làm mới phần lâm sàng trên phiếu theo lưới; không tự đổi loại nhiễm.

---

## 2. Tận dụng triệt để timeline (nguyên tắc)

**Một nguồn bằng chứng = lưới ngày trên bệnh án.** Mọi bề mặt khác chỉ **đọc / tô / chụp**.

```
Gõ 1 lần trên timeline
        │
        ├─► Hồ sơ bệnh án (sống, dùng lại cho mọi Index)
        ├─► Bảng phân tích (tô cửa sổ + DOE; không form nhập thứ hai)
        └─► Khi Tạo phiếu / khi in: ảnh chụp bằng chứng ∈ cửa sổ
              → mẫu báo cáo cho khoa / lãnh đạo
```

### 2.1. Cách làm việc (IP)

1. Mở BA → nhìn **toàn đợt**: ngày 1, khoa, dụng cụ, chip XN chưa PT.  
2. Bổ sung những gì LIS không có **trên lưới**: XQ, sốt, ngày mổ, Foley/CVC/máy, khoa từng ngày.  
3. Chọn **một** chip (hoặc một phim) → bảng phân tích **trượt** trên cùng cột: thấy ngay sốt có nằm trong ±3 ngày không, máu có trong SBAP không.  
4. Không sang form khác để tick lại sốt/XQ. Form sau Tạo phiếu chỉ còn: nhánh L2 (vd. bệnh nền tim–phổi, PATOS), chữ ký, ghi chú gửi khoa.  
5. Cùng BA có thể có **nhiều** sự kiện (UTI rồi máu Secondary): RIT/SBAP trên lưới **cấm** mở phiếu trùng mẫu đã quy kết.

### 2.2. Việc cần khóa trên giấy (chưa code)

| # | Việc | Lý do |
|---|------|--------|
| 1 | Gõ TC / XQ / CĐHA trên lưới = **ghi BA ngay** (giữ) **và** cập nhật phiên đang mở | Không mất bằng chứng nếu tắt máy trước khi Tạo phiếu |
| 2 | Khi **Tạo phiếu** (và khi phiếu còn nháp): chụp **danh sách mốc ∈ cửa sổ** (TC + từng phim + XN RIT/SBAP), không chỉ vài cờ boolean | Người nhận báo cáo đọc được “ngày nào có XQ gì” |
| 3 | Phiếu **đã chốt**: đổi timeline BA **không** sửa phiếu; muốn đổi → mở lại / phiên bản mới | Tránh tử số nhảy im lặng |
| 4 | In mẫu báo cáo **kèm dải ngày thu nhỏ** (cột cửa sổ + DOE tô màu) | Khoa đọc một trang, khớp với những gì IP thấy trên lưới |
| 5 | VAE: **không** dùng XQ để chẩn đoán (CDC). XQ trên BA vẫn lưu — dùng cho PNEU nếu đổi protocol, không hiện như tiêu chí VAC | Tránh lẫn VAE / viêm phổi lâm sàng |

Không biến timeline thành dashboard KPI (module Dashboard khác). Không spawn phiếu lúc copy LIS.

---

## 3. Hai loại giấy — cùng dữ liệu, khác người đọc

Đã có trong methodology (L1 vận hành / L3 audit). Khóa thêm **người nhận báo cáo**:

| Mẫu | Ai đọc | Nguồn | Không được |
|-----|--------|-------|------------|
| **A — Lưới + bảng phân tích** | IP KSNK lúc làm việc | Timeline sống | Nhập trùng trên 5 form hội chứng |
| **B — Phiếu xác định ca (kho sự kiện)** | IP thẩm định, in hồ sơ KSNK | Ảnh chụp lúc Tạo phiếu | Sửa ngầm BA đã chốt |
| **C — Báo cáo gửi khoa / lãnh đạo** | Khoa điều trị, chủ nhiệm, BGH | Cùng ảnh chụp + lời tiếng Việt | Bắt khoa tick tiêu chí CDC |

App đã có hai bản in (`NkbvCasePrintView` dạng mục; `NkbvBaGridCasePrintView` dạng văn bản). **Mẫu C** = nâng bản văn bản: đủ để người không làm KSNK **theo dõi được sự kiện**, không thay thuật toán.

---

## 4. Mẫu C — khung chung mọi sự kiện (bắt buộc)

Người nhận cần trả lời được 7 câu, **không** cần thuộc IWP/SBAP:

| # | Câu người nhận | Ô trên báo cáo | Lấy từ đâu |
|---|----------------|----------------|------------|
| 1 | Bệnh nhân nào, nằm khoa nào? | Họ tên, PID, mã BA, khoa quy kết (LOA) | BA + Transfer Rule |
| 2 | Đây là nhiễm khuẩn gì? | Tên KSNK (**nhiễm khuẩn + vị trí**) + mã CDC giữ nguyên (CLABSI, CAUTI, …) | Kết luận engine + Phụ lục E |
| 3 | Bệnh viện hay mang vào? | HAI / POA + ngày vào viện + **DOE** (ngày sự kiện, không phải ngày cấy nếu sốt sớm hơn) | Ch.2 |
| 4 | Dựa vào bằng chứng nào? | Index (XN hoặc XQ) + **danh sách ngày**: sốt, phim, cấy trong cửa sổ | Timeline ∈ cửa sổ |
| 5 | Có gắn dụng cụ không? | Foley / CVC / máy — có/không, vì sao (đủ ngày lịch) | Sổ dụng cụ |
| 6 | Máu (+) là thứ phát hay CLABSI? | Một dòng rõ: Secondary **có/không** (máu luôn xét trước CLABSI) | secondary-bsi-gate |
| 7 | Khoa cần làm gì? | Ghi chú IP (cách ly, rút dụng cụ, họp ca…) + trạng thái phiếu (nháp / đã chốt) | Kết luận + chữ ký kép |

**Dải thời gian (bắt buộc trên mẫu C):** một hàng ngày từ đầu cửa sổ → hết RIT/SP, đánh dấu: VV · Index · DOE · từng TC/XQ · từng XN. Đây là “timeline thu nhỏ” — cùng logic khối 2, không phải biểu đồ thống kê.

Chữ ký: lâm sàng (khoa được báo) · KSNK chốt ca. CDC Location / SIR **không** nhét mẫu C (ngoài domain HAI lâm sàng).

---

## 5. Mẫu C — phần riêng theo sự kiện (đủ để theo dõi, khớp domain)

Tên KSNK theo Phụ lục E. Chi tiết tiêu chí L1 = investigation-forms `*-2026` Phần A — **không chép lại cây** trên giấy gửi khoa.

### 5.1. Nhiễm khuẩn huyết (LCBI) / CLABSI

- Index: **cấy máu** (ngày lấy mẫu, khuẩn, số lần nếu commensal).  
- Cửa sổ IWP ±3; DOE; HAI/POA.  
- Secondary: ổ tại chỗ nào, có khớp khuẩn trong SBAP không → **nếu có thì không ghi CLABSI**.  
- CVC: đặt/rút, đủ >2 ngày lịch, còn tại DOE hoặc ngày trước.  
- Kết luận một dòng: CLABSI / LCBI không gắn CVC / Secondary / ngoại nhiễm.

### 5.2. Nhiễm khuẩn tiết niệu (SUTI) / CAUTI

- Index: **cấy nước tiểu** + CFU (thiếu CFU = chưa đạt).  
- Triệu chứng ∈ IWP (sốt, đau mu, CVA); **không** tiểu buốt nếu đang Foley.  
- Foley đủ ngày → CAUTI; không Foley → SUTI.  
- Nấm niệu / >2 chủng: nêu **không đạt** SUTI (không im).  
- Dịch/mô tiết niệu **không** phải nước tiểu → **không** dùng mẫu này (USI, Ch.17).

### 5.3. Nhiễm khuẩn hô hấp — VAE (người lớn, thở máy)

- **Không in XQ như tiêu chí.** In: ngày thở máy, PEEP/FiO₂ tối thiểu 4 ngày (baseline + worsening), Event Period 14 ngày từ DOE.  
- Bậc: VAC → IVAC (sốt/WBC + kháng sinh) → PVAP (vi sinh).  
- Secondary máu **chỉ khi PVAP**.  
- Nếu không đủ VAE: ghi rõ “không VAE — xem viêm phổi lâm sàng (PNEU) nếu có XQ”.

### 5.4. Viêm phổi bệnh viện (PNEU) / VAP lâm sàng

- Index: **cấy đờm/ETA/BAL hoặc ngày XQ/CT**.  
- **Bắt buộc** liệt kê phim ∈ IWP (thâm nhiễm / đông đặc / hang + ngày). Bệnh nền tim–phổi → ghi số phim.  
- Toàn thân + ≥2 nhóm hô hấp + ngày.  
- Máy thở tại DOE → nhãn VAP vs không máy → Non-VAP. **Không** mặc định VAP vì có đờm.  
- Phân cấp PNU1/2/3 nếu IP đã chọn (khoa không bắt hiểu PNU3).

### 5.5. Nhiễm khuẩn vết mổ (SSI)

- Ngày mổ (ngày 1), mã PT, độ sâu (nông / sâu / organ-space), cửa sổ **30 hoặc 90** — **không** ±3 ngày.  
- PATOS: nếu có → **không** báo SSI mới (nêu rõ cho khoa).  
- TC trên lưới (mủ, mở vết…) ∈ SP.  
- Organ-space: tên vị trí (nhiễm khuẩn + vị trí, vd. nhiễm khuẩn khớp).  
- Secondary máu ∈ SBAP 17 ngày `[DOE−3, DOE+13]`.

### 5.6. Vị trí khác (Ch.17) — khi mở engine

Cùng khung mẫu C + **mã site** + tên KSNK nhiễm khuẩn + vị trí. Không nhét vào bốn hội chứng trên.

---

## 6. Map “đủ thông tin” ↔ phần mềm (lệch cần biết)

| Nhu cầu mẫu C | App hiện |
|---------------|----------|
| Hành chính + DOE + POA/HAI + LOA | Có trên hai bản in |
| Danh sách triệu chứng + ngày | Có (từ form/timeline lúc in) |
| Danh sách **từng XQ/CĐHA** trong cửa sổ | Chưa đủ (chủ yếu cờ phim ngực nếu Index = CĐHA) |
| Dải ngày thu nhỏ | Chưa in |
| Secondary trước CLABSI, lời tiếng Việt | Engine đúng; giấy in chưa nhấn một câu cho khoa |
| VAE không XQ | Đúng domain; cần giữ trên mẫu C |
| Ghi chú gửi khoa | Có ô ghi chú phiên |

Phiếu `*-2026` Phần B (ruled-out, PNU3 từng dòng) = **phụ lục KSNK / đào tạo**, không bắt khoa ký hết.

---

## 7. Ba tình huống kiểm tay (khi triển khai)

1. **Gõ sốt trên bảng chung, chưa Tạo phiếu** → mở BA khác lần, sốt còn; mở phiên Index máu trong IWP → sốt đã có trên hàng TC; kho sự kiện **chưa** có phiếu.  
2. **Gõ XQ trên lưới rồi chọn chip đờm** → cửa sổ PNEU/VAE đúng protocol; Tạo phiếu → ảnh chụp có ngày XQ (không mất khi đóng phiên).  
3. **In mẫu C gửi khoa** → một trang: tên sự kiện tiếng Việt + mã CDC, DOE, HAI/POA, dải ngày có XQ/sốt/cấy, câu Secondary, chữ ký; khoa **không** phải mở lưới IP.

---

*Tiêu chí từng hội chứng: SSOT + `investigation-forms/*-2026`. File này không thay CDC.*
