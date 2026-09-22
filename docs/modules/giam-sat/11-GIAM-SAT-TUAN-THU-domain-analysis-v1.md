# Phân tích domain + kế hoạch cải tiến — Giám sát tuân thủ (VST + GSC)

| Trường | Giá trị |
|--------|---------|
| Mã | `11-GIAM-SAT-TUAN-THU-domain-analysis-v1` |
| Ngày | 2026-09-22 (Asia/Saigon, UTC+7) |
| Phạm vi | **Chỉ** GSC · VST thường quy · VST ngoại khoa · hình thức/cách thức · KSNK vs TGS · phân loại khu vực/vị trí/đối tượng · tổng hợp/báo cáo/chỉ số |
| Ngoài phạm vi | NKBV case-finding · CSSD inventory/6 trạm · QLCV workflow · ENV/Waste |
| Trạng thái | Draft SSOT — dùng làm điểm neo trước khi sửa pack 01/02/06/07/08 và code W1 |
| Chủ sở hữu domain | Grok domain (artifact) · PO xác nhận mục `[PO xác nhận]` |

---

## 1. Mục đích, phạm vi, nguồn SSOT

### 1.1 Mục đích

Tài liệu này là **SSOT nghiệp vụ** cho lát giám sát tuân thủ thực hành tại BVQY 103, nhằm:

1. Bổ sung glossary / entity / chỉ số còn thiếu trong pack 01–09 (TGS, hình thức, cách thức, risk tier, track VST ngoại khoa).
2. Khóa công thức % và lens **không trộn** (khớp `metric-dictionary`).
3. Định hướng to-be phần mềm (DB / BE / FE) trước khi Cursor sửa schema/UI.
4. Liệt kê gap pack ↔ QT ↔ project và kế hoạch chỉnh domain theo bước.

### 1.2 Phạm vi cứng

| In-scope | Out-of-scope (cố ý) |
|----------|---------------------|
| VST thường quy (5 Moments + kỹ thuật BM.02) | NKBV / POA / HAI / NHSN case-finding |
| VST ngoại khoa (track tách — BM.03) | CSSD inventory, 6 trạm, mẻ TK |
| GSC checklist + 6 chiều capture | EAV sâu / RCA form / P×I×S (hoãn) |
| Hình thức (3) · Cách thức · Lens KSNK\|TGS | CCS trên điều hành (deprecated) |
| Phân loại khu vực nguy cơ · vị trí · đối tượng | Ranking badge Action board trên `/thong-ke` fold (PO đã bỏ) |
| Chỉ số bắt buộc + đủ mẫu / workload | ABHR L/1000 ngày-NB như KPI fold chính (ghi BM.04 / phụ lục — không invent vào strategic) |

### 1.3 Nguồn SSOT (ưu tiên)

| # | Nguồn | Vai trò | Đường dẫn / mã |
|---|-------|---------|----------------|
| 1 | Domain pack hiện hành | Glossary · entity · DD · SRS W1 · coverage · gap | `/workspace/ksnk-domain/01`–`09`, `KSNK-DOMAIN-SSOT.md` |
| 2 | QT viện | Quy trình + BM VST/GSC | `KSNK.QT.07` · `KSNK.QT.33` (`/workspace/ipc-updated/QT/`) |
| 3 | BYT QĐ 3916/2017 §8 | Giám sát thời điểm / kỹ thuật / ngoại khoa; phương pháp quan sát | `/workspace/ipc-iso/ref/hd_vst_3916.txt` |
| 4 | WHO HH 2009 (+ campaign) | 5 Moments; backup định nghĩa | Cite trong QT.07 |
| 5 | Metric dictionary | Công thức % · lens · min-N · cấm CCS | `docs/modules/dashboard/metric-dictionary.md` (project) |
| 6 | Chiến lược giám sát 2026-09-17 | Hai trục chuyên đề × nguồn; fold 0; bỏ badge | `/workspace/bv103-plans/BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md` |
| 7 | Lookup project | Mã hình thức / cách thức / khu vực | `sys_lookup_value`: `HINH_THUC_GIAM_SAT`, `CACH_THUC_GIAM_SAT`, `KHU_VUC_GIAM_SAT` |

**Nguyên tắc:** không invent chỉ số mâu thuẫn metric-dictionary; QT vận hành (bước, BM, RACI) giữ; WHO/BYT backup định nghĩa lâm sàng.

---

## 2. Bản đồ khái niệm (glossary bổ sung)

> Các thuật ngữ dưới đây **chưa đủ** trong `01-business-glossary-v2-ssot.md` (hoặc chỉ có trong Phụ lục C phần mềm). Đề xuất đưa vào core / Phụ lục C khi chạy Bước A.

| Thuật ngữ | Viết tắt / mã | Định nghĩa nghiệp vụ | Nhóm | Neo |
|-----------|---------------|----------------------|------|-----|
| Vệ sinh tay thường quy | VST TQ | Thực hành VST theo **5 thời điểm WHO** + kỹ thuật 6 bước (BM.01 thời điểm; BM.02 kỹ thuật). | Phòng ngừa / GS | QT.07; BYT 3916 §3–5; WHO HH |
| Vệ sinh tay ngoại khoa | VST NK | Kỹ thuật rửa/chà tay trước PT/thủ thuật vô khuẩn lớn (xà phòng sát khuẩn hoặc chà cồn); **track quan sát tách** khỏi VST thường quy. | Phòng ngừa / GS | QT.07 HD.03 · BM.03; BYT 3916 §4 |
| Cơ hội quan sát | Cơ hội | Một chỉ định/thời điểm VST (1 trong 5 Moments) được ghi Có/Không tuân thủ trong phiên. | Phần mềm ↔ QT | QT.07 BM.01; glossary Phụ lục C |
| Giám sát tuân thủ (chung) | GSC | Quan sát + đánh giá mức độ thực hành đúng QT bằng **bảng kiểm** (tiêu chí Đạt / Không đạt / NA). | Giám sát | QT.33 |
| Tự giám sát | TGS | Giám sát do **khoa lâm sàng** thực hiện (`stype` / hình thức `TU_GIAM_SAT` / `HT_TU_GIAM_SAT`). First line — sở hữu quy trình. | Nguồn GS | metric-dictionary; chiến lược §0 |
| Chuyên trách (KSNK) | KSNK / CT | Giám sát do **Khoa KSNK** (hoặc NV giám sát chuyên trách) — second line / xác minh. | Nguồn GS | metric-dictionary |
| Giám sát chéo | CHEO | Quan sát viên thuộc khoa/đơn vị **khác** khoa được GS (mạng lưới chéo). Không gộp vào % TGS hay % KSNK khi tính lens chính. | Hình thức | Lookup `HT_GIAM_SAT_CHEO`; QT.33 kiểm soát thiên lệch |
| Hình thức giám sát | Hình thức | **Ai** quan sát: Tự giám sát · Chuyên trách · Chéo. Lookup `HINH_THUC_GIAM_SAT`. | Chiều phiên | Project lookup; matrix_hinh_thuc |
| Cách thức giám sát | Cách thức | **Cách** thu thập: Trực tiếp tại chỗ · Camera trực tiếp · Camera xem lại. Lookup `CACH_THUC_GIAM_SAT`. | Chiều phiên | BYT 3916 §8 (trực tiếp / camera / gián tiếp hóa chất); project CT_* |
| Khu vực giám sát | Khu vực | Danh mục chức năng phòng / vùng GS (`KHU_VUC_GIAM_SAT`: ICU, PT, lọc máu, cấp cứu, hành chính…). | Chiều GSC #2 | QT.33; entity `ViTriGiamSat` |
| Vị trí | Vị trí | Free text **trong** khu vực (buồng, giường, bàn mổ…); sticky theo phiên. | Chiều GSC #3 | DD §2.2 |
| Đối tượng giám sát | Đối tượng | Loại: `NHAN_VIEN` / `NGUOI_BENH` / `MOI_TRUONG` / `THIET_BI` (+ `KHAC` nếu seed). | Chiều GSC #4 | DD `DoiTuongGS` |
| Tên đối tượng | — | Tên/nhãn đối tượng được quan sát (NV từ MDM theo khoa; NB/MT/TB theo quy tắc form). | Chiều GSC #5 | PO 6 chiều |
| Gắn người bệnh | `gan_nb` | Bool: phiên có gắn NB hay không (≡ `is_bo_sung_nguoi_benh`); optional `ma_benh_an` khi true. | Chiều GSC #6 | Entity list §2 |
| Lens nguồn | Lens | Bộ lọc thống kê **một** nguồn mỗi lần: Chuyên trách **hoặc** Tự giám sát. **Cấm** trộn % hai lens. | Analytics | metric-dictionary 2026-09-17 |
| Độ lệch TGS–KSNK | `do_lech` | `ty_le_tgs − ty_le_ksnk` **chỉ khi** comparable (`vol_tgs > 0 ∧ vol_ksnk > 0`). Câu hỏi lớp C — không thay % tuân thủ. | Analytics | gap_analysis / chiến lược §1.2 |
| Đủ mẫu | min-N | Ngưỡng khối lượng trước khi xếp hạng / gọi “điển hình”: VST **≥20 cơ hội**; GSC **≥30 quan sát** (tiêu chí áp dụng). Dưới ngưỡng → không dùng cho ranking in BCTH tùy chọn. | Analytics | chiến lược §4; action-board spec |
| Phân bổ mẫu QT.33 | Workload | **100–200 cơ hội/khoa/tháng** (VST 5 thời điểm) = **mục tiêu khối lượng quan sát**, **không** là KPI % điều hành. | Kế hoạch GS | QT.33 bước 2 |

### 2.1 Lookup hình thức / cách thức (đã có trên project)

| Category | Code | Nhãn nghiệp vụ |
|----------|------|----------------|
| `HINH_THUC_GIAM_SAT` | `HT_TU_GIAM_SAT` | Tự giám sát |
| | `HT_CHUYEN_TRACH` | Chuyên trách (KSNK) |
| | `HT_GIAM_SAT_CHEO` | Giám sát chéo |
| `CACH_THUC_GIAM_SAT` | `CT_TRUC_TIEP` | Giám sát trực tiếp tại chỗ |
| | `CT_CAMERA_TRUC_TIEP` | Camera trực tiếp |
| | `CT_CAMERA_LAI` | Camera xem lại (replay) |

**RPC stype** (lens): `TU_GIAM_SAT` · `KSNK` · `CHEO` — map 1–1 với hình thức; UI mặc định nhãn «Tự giám sát» / «Chuyên trách» (không lộ mã trên tiêu đề).

---

## 3. Ai giám sát gì (RACI nghiệp vụ)

### 3.1 RACI theo QT.07 / QT.33

| Vai trò | VST (QT.07) | GSC (QT.33) | RACI | Hình thức phần mềm (đề xuất derive) |
|---------|-------------|-------------|------|--------------------------------------|
| Khoa KSNK / Tổ Giám sát | Chương trình GS; tổng hợp BM.04; phản hồi ≤7 ngày | Chương trình; mẫu BK; phản hồi BM.01; phân tích | **A** | `HT_CHUYEN_TRACH` (`stype=KSNK`) |
| NV Giám sát (Bộ phận GS) | Quan sát độc lập toàn viện | Quan sát checklist chuyên trách | **R** (học thuật) | `HT_CHUYEN_TRACH` |
| ML.KSNK tại khoa | Quan sát tại khoa; nhắc tại chỗ | Tự giám sát / hỗ trợ checklist khoa | **R** tại khoa | Thường `HT_TU_GIAM_SAT`; khi GS khoa khác → `HT_GIAM_SAT_CHEO` |
| ĐDT / CNK | Chịu trách nhiệm tỷ lệ khoa; nhận phản hồi; kế hoạch khắc phục | Tổ chức TGS; phản hồi văn bản khi dưới ngưỡng | **C** / accountability khoa | Không mở phiên chuyên trách; đọc kết quả khoa mình |
| NVYT / HV được quan sát | Thực hành 5 Moments + kỹ thuật | Thực hành theo tiêu chí BK | **I** (ẩn danh trên báo cáo công khai) | Không chọn “tự chấm” làm chuyên trách |
| HĐ.KSNK / BGĐ | Nhận báo cáo có %, so sánh kỳ, xu hướng | Cùng | **I** | Chỉ đọc BCTH / thống kê |

### 3.2 Map sang phần mềm

| Điều kiện actor | Derive `hinh_thuc` / `stype` | Ghi chú |
|-----------------|------------------------------|---------|
| Role ∈ Khoa KSNK / NV GS chuyên trách | `HT_CHUYEN_TRACH` / `KSNK` | Mặc định lens fold 0 |
| Role ∈ ML / GSV khoa **và** `khoa_id` = khoa của actor | `HT_TU_GIAM_SAT` / `TU_GIAM_SAT` | First line |
| Actor khoa A quan sát khoa B | `HT_GIAM_SAT_CHEO` / `CHEO` | Không vào `ty_le_tgs` / `ty_le_ksnk` chính; matrix hình thức riêng |
| Cách thức | User chọn (`CT_*`); camera replay → rule thời gian phiên riêng nếu có | Không auto từ role |

`[PO xác nhận]` Quy tắc derive hình thức khi ML.KSNK thuộc Khoa KSNK điền tại khoa lâm sàng: ưu tiên chuyên trách hay tự giám sát?

---

## 4. Luồng thực hành chuẩn (as-to-be)

### 4.1 Chuẩn bị phiên (chung VST / GSC)

Thứ tự tối giản (6 bước ngữ cảnh — khớp 6 chiều GSC; VST khuyến nghị đủ khu vực):

```text
1. Khoa          → MDM khoa đang hoạt động
2. Khu vực       → lookup KHU_VUC_GIAM_SAT; ưu tiên theo risk_tier (Cao trước)
3. Vị trí        → free text + gợi ý sticky trong khu
4. Đối tượng     → loại NV|NB|MT|TB (+ tên)
5. Hình thức     → auto theo §3.2 (cho sửa nếu PO cho phép)
6. Cách thức     → chọn CT_*; mặc định CT_TRUC_TIEP
```

Sau đó: chọn loại phiên `VST` hoặc `GSC` (+ `BangKiemMau` nếu GSC) → mở `PhienGiamSat` trạng thái `DANG_GS`.

### 4.2 Quan sát VST thường quy (5 Moments)

1. Trong phiên `loai=VST`, track = **thường quy** (mặc định).
2. Mỗi cơ hội: Moment ∈ {1..5} + Có/Không tuân thủ; tùy chọn ghi chú kỹ thuật BM.02.
3. Rapid-tap ≤ 2 thao tác / cơ hội (SRS NFR-02).
4. Không free-text tên NV ngoài danh mục MDM (lọc theo khoa khi `doi_tuong=NHAN_VIEN`).

### 4.3 Quan sát VST ngoại khoa (tách track)

1. Phiên hoặc nhánh quan sát gắn **track `NGOAI_KHOA`** (BM.03) — **không** cộng vào mẫu số `ty_le_vst` 5 Moments.
2. Chấm riêng bước chà cồn (HĐKSNK 31/07: % “đạt” cao nhưng bước cồn yếu — QT.07).
3. KPI ngoại khoa: `% đạt kỹ thuật ngoại khoa` theo BM.03 — surface analytics **tách** chart/RPC filter; không gộp CCS.

`[PO xác nhận]` Track ngoại khoa = phiên riêng (`loai` mở rộng) hay flag `track` trên cùng `PhienGiamSat` VST?

### 4.4 Quan sát GSC (bảng kiểm + 6 chiều)

1. Chọn `BangKiemMau` `hieu_luc=true` (seed từ BM QT / 36 mẫu).
2. Bắt buộc đủ: `khoa_id` · `khu_vuc_id` · `vi_tri` · `doi_tuong_loai` · `doi_tuong_ten` · `gan_nb`.
3. Điền tiêu chí `DAT` / `KHONG_DAT` / `NA`.
4. Chốt: `% = đạt / tiêu chí áp dụng` (loại NA); snapshot bất biến.

### 4.5 Kết thúc phiên / phản hồi / ẩn danh

| Bước | Việc | Neo |
|------|------|-----|
| Chốt | `KetQuaGiamSat` + khóa `DA_CHOT` | SRS FR-VST-03 / FR-GSC-02 |
| Phản hồi tại chỗ | Nhắc ngay khi sai nghiêm trọng đe dọa an toàn NB | QT.33 bước 6 |
| Phản hồi khoa | ≤ **7 ngày làm việc**; có % + so kỳ trước | QT.33; QT.07 |
| Ẩn danh công khai | Báo cáo/thống kê công bố **không** hiện tên NV được quan sát; QT.33: «ẩn danh NVYT tại thời điểm ghi nhận» | QT.33 nguyên tắc |
| Lưu nội bộ | `quan_sat_vien_id` + (nếu có) tên đối tượng NV **được lưu** phục vụ audit / đào tạo lại — **không** surface mặc định trên `/thong-ke` | Conflict nghiệp vụ → `[PO xác nhận]` chính sách |

`[PO xác nhận]` Chính sách ẩn danh: (a) không lưu tên NV đối tượng; (b) lưu nhưng chỉ role KSNK xem; (c) lưu đầy đủ, báo cáo công khai che tên?

---

## 5. Phân loại nguy cơ (đề xuất taxonomy)

### 5.1 Khu vực — `risk_tier` ∈ {`CAO`,`TRUNG`,`THAP`}

> Đề xuất map theo mã `KHU_VUC_GIAM_SAT` hiện có. **Chưa** hard-code — chờ `[PO xác nhận]`.

| risk_tier | Gợi ý mã khu vực | Lý do ngắn |
|-----------|------------------|------------|
| **CAO** | `KV_PHONG_MO`, `KV_CAN_THIEP`, `KV_ICU_SACH`, `KV_ICU_CHUNG`, `KV_LOC_MAU`, `KV_CAP_CUU`, `KV_CACH_LY`, `KV_DA_KHANG`, `KV_CSSD_BAN`, `KV_VS_NGUY_CO_CAO`, `KV_NB_MIEN_DICH`, `KV_THU_THUAT_SACH`, `KV_PHONG_SINH` | Xâm lấn cao / SSI / device / MDRO |
| **TRUNG** | `KV_NOI_TRU`, `KV_KHAM_TT`, `KV_CDHA`, `KV_XET_NGHIEM`, `KV_CSSD_SACH`, `KV_PHA_CHE`, `KV_VS_KHOA`, `KV_BE_MAT_TBYT` | Tiếp xúc NB thường xuyên |
| **THAP** | `KV_HANH_CHINH`, `KV_SANH_CHO`, `KV_NHAN_VIEN`, `KV_NHA_AN`, `KV_BE_MAT_CC`, `KV_CHAT_THAI`* | Hành chính / hỗ trợ (*chat thải có thể nâng TRUNG nếu PO) |

**Hệ quả to-be:** metadata `risk_tier` trên lookup khu vực; form ưu tiên gợi ý khu CAO; báo cáo có thể lọc theo tier; **không** đổi công thức %.

### 5.2 Vị trí

- Free text bắt buộc (GSC); gợi ý theo khu (sticky lần trước cùng khoa+khu).
- Không tạo master vị trí toàn viện ở W1 (tránh MDM phình).

### 5.3 Đối tượng

| Loại | Quy tắc tên | Lọc |
|------|-------------|-----|
| `NHAN_VIEN` | Chọn từ `mdm_nhan_su` | Theo `khoa_id` phiên (+ HV nếu seed nghề) |
| `NGUOI_BENH` | Nhãn / mã BA tùy `gan_nb` | Không bắt buộc CCCD |
| `MOI_TRUONG` | Tên vị trí/bề mặt | — |
| `THIET_BI` | Tên TB / loại | — |

---

## 6. Tổng hợp & báo cáo — danh mục chỉ số bắt buộc

### 6.1 Công thức gốc (khóa metric-dictionary)

| Chỉ số | Tử số | Mẫu số | Làm tròn | Đơn vị | Tần suất tối thiểu | Lọc bắt buộc |
|--------|-------|--------|----------|--------|-------------------|--------------|
| `ty_le_vst` | Số cơ hội đạt (Có VST đúng chỉ định) | `tong_co_hoi` (5 Moments) | 1 chữ số thập phân | % | Tháng (+ tuần xu hướng) | **Một lens** KSNK\|TGS; khoa/khối/kỳ |
| `ty_le_gsc` | Số tiêu chí `DAT` | Tiêu chí áp dụng (≠ `NA`) | 2 chữ số thập phân | % | Tháng | Một lens; mặc định chỉ BK `TUAN_THU` |
| `ty_le_vst_ky_thuat` | Đạt BM.02 | Số lần đánh giá kỹ thuật TQ | 1 dp | % | Quý (BYT 3916 §8) | Tách khỏi `ty_le_vst` thời điểm |
| `ty_le_vst_ngoai_khoa` | Đạt BM.03 (có thể tách mục chà cồn) | Số lần đánh giá NK | 1 dp | % | Quý / theo chương trình PT | **Track riêng**; không vào `ty_le_vst` |
| `ty_le_ksnk` / `ty_le_tgs` | Như trên theo `stype` | Như trên theo `stype` | Theo loại VST/GSC | % | Tháng | Lens tương ứng |
| `do_lech` | `ty_le_tgs − ty_le_ksnk` | — | 1–2 dp | điểm % | Tháng | Chỉ comparable |
| `ty_le_bao_phu_tgs` | Số BK bắt TGS đã có ≥1 phiên TGS | Số BK bắt TGS áp dụng khoa | — | % | Tháng | GSC; Nâng cao |
| `vol_*` / workload | Số cơ hội hoặc quan sát | — | int | lần | Tháng | So với phân bổ 100–200 (VST) — **chỉ báo khối lượng** |
| Đủ mẫu | — | VST ≥20 CH; GSC ≥30 QS | — | boolean | Khi xếp top/bottom in | Optional BCTH |

**Xu hướng:** gộp bucket bằng **cộng** tử/mẫu — **không** trung bình các %.

### 6.2 Ma trận chiều (bắt buộc có trên analytics)

| Chiều | Key payload | Áp dụng |
|-------|-------------|---------|
| Khoa | `matrix_khoa` | VST + GSC |
| Khối | `matrix_khoi` | VST + GSC |
| Khu vực (+ risk_tier) | `matrix_khu_vuc` | VST + GSC |
| Nghề / đối tượng | `matrix_nghe` | VST + GSC |
| Hình thức | `matrix_hinh_thuc` | VST + GSC |
| Cách thức | `matrix_cach_thuc` | GSC (+ VST khi RPC có) |
| Moment WHO | lỗi/moment | VST |
| Tiêu chí BK | `matrix_criterion` | GSC |

### 6.3 Mục tiêu viện (tham chiếu — không invent công thức mới)

| Hạng mục | Neo hiện có | Lộ trình CT BV103 06/2026 (ghi nhận từ evidence gather) |
|----------|-------------|--------------------------------------------------------|
| VST thường quy (thời điểm) | QT.07: **>80%**; seed KPI viện fallback **85%** (`GREEN_MIN`) | ≥80% → 85% → 90% `[PO xác nhận]` mốc thời gian |
| VST kỹ thuật (BM.02) | BYT 3916 §8 giám sát kỹ thuật hằng quý | ≥50% → 60% `[PO xác nhận]` |
| VST ngoại khoa (BM.03) | QT.07: **>90%** + đạt bước chà cồn | ≥90% → 100% `[PO xác nhận]` |

### 6.4 Những gì **KHÔNG** đưa vào điều hành

| Cấm / deprecated | Lý do |
|------------------|-------|
| `ty_le_ccs` / `% trộn VST+GSC` | metric-dictionary; chiến lược §1.1 |
| `% trộn TGS+KSNK` trên một KPI | Hai lens tách |
| Ranking **badge** Action board trên fold `/thong-ke` | PO đã bỏ (trùng chart %); **không** đề xuất khôi phục |
| Top/bottom làm badge mặc định | Optional **chỉ** section in BCTH khi cần; mặc định = charts + matrices + gap |
| QT.33 «100–200 cơ hội/khoa/tháng» như KPI % | Là workload / đủ mẫu kế hoạch |
| Chart đôi KSNK+TGS bắt buộc fold 0 | Chiến lược §4–5 |
| QLCV / “Việc hôm nay” nhúng thống kê | H2 tách module |

---

## 7. Ánh xạ phần mềm (to-be)

### 7.1 DB

| Thành phần | To-be | Ghi chú |
|------------|-------|---------|
| Session facts | Giữ `gstt_fact_vst_sessions` / `gstt_fact_chung_sessions` (+ opportunities / results) | Không gộp một bảng bắt buộc W1 |
| Dimensions | FK `khoa_id`, `khu_vuc_id`, `hinh_thuc_id`, `cach_thuc_id`; fields `vi_tri`, `doi_tuong_*`, `gan_nb` | GSC reject nếu thiếu 6 chiều |
| `risk_tier` | Metadata trên `KHU_VUC_GIAM_SAT` (jsonb) hoặc cột derived view | Không đổi UUID |
| Surgical vs routine | Flag `track` ∈ {`THUONG_QUY`,`NGOAI_KHOA`} hoặc phiên con BM.02/03 | Tách mẫu số KPI |
| Source lens | Cột/`stype` từ hình thức; RPC strategic filter theo lens | CHEO không vào dual lens chính |
| Observer | `quan_sat_vien_id` bắt buộc; policy che tên đối tượng trên view thống kê | Xem §4.5 PO |

### 7.2 BE

| Thành phần | To-be |
|------------|-------|
| RPC strategic VST/GSC | Giữ lens tách; Action/chart bind một nguồn |
| `gap_analysis` / `do_lech` | Chỉ comparable; Nâng cao |
| Derive hình thức | Rule §3.2 server-side (không tin client thuần) |
| Compare matrices | Giữ `matrix_*`; bổ sung filter `risk_tier` / `track` khi có |
| Sample adequacy | Flag đủ mẫu theo min-N trước khi trả top/bottom in |

### 7.3 FE / UX

| Thành phần | To-be |
|------------|-------|
| Form | Thứ tự 6 bước ngữ cảnh → quan sát; rapid-tap |
| NV | Không free-text ngoài MDM; lọc theo khoa |
| Thống kê | Toggle Chuyên trách \| Tự giám sát; **không** badge ranking fold |
| VST ≠ GSC | Hub / route / BCTH block tách |
| Nâng cao | Bao phủ TGS · đối soát · ma trận chiều |
| BCTH in | Charts + matrices + gap; optional top/bottom section (không badge) |

---

## 8. Gap pack ↔ QT ↔ project

| ID | Gap | Pack hôm nay | QT / BYT | Project | Ưu tiên |
|----|-----|--------------|----------|---------|---------|
| **P0-1** | Glossary thiếu TGS / hình thức (3) / cách thức / lens / do_lech / đủ mẫu | 01 thiếu | QT.33; metric-dict | Lookup + stype đã có | **P0** |
| **P0-2** | VST ngoại khoa / kỹ thuật chưa là KPI strategic tách | 07 SRS chỉ 5 Moments | QT.07 BM.02/03; BYT §8 | Track/analytics yếu | **P0** |
| **P0-3** | `risk_tier` trên khu vực chưa có | 02/06 chỉ khu vực phẳng | BYT §8 ưu tiên khu nguy cơ cao | Lookup khu đã có, chưa tier | **P0** |
| **P0-4** | Seed `ap_dung_jsonb` / UAT 36 BK chưa khóa | 09 ghi seed BM | QT.33 + BM QT | 36 mẫu kỹ thuật có, UAT chưa ký | **P0** |
| **P0-5** | Chính sách ẩn danh vs lưu tên quan sát viên/NV | DD lưu `quan_sat_vien_id` | QT.33 ẩn danh | Lưu tên; surface chưa chuẩn hóa | **P0** |
| P1-1 | SRS W1 chưa FR 6 chiều + hình thức/cách thức đủ | 07 lean | QT.33 | Form đã capture nhiều field | P1 |
| P1-2 | Lỗi/moment chưa tách theo stype (TGS chưa có lỗi riêng) | — | chiến lược K1 | RPC | P1 |
| P1-3 | Chrome VST còn dùng GSC chrome | — | đề cương | FE | P1 |
| P1-4 | Workload 100–200 chưa surface như chỉ báo khối lượng (không KPI %) | — | QT.33 | — | P1 |
| P2-1 | P×I×S / RCA / CCS | Cấm hồi | đề cương D | deprecated CCS | P2 / hoãn |
| P2-2 | ABHR L/1000 trên strategic fold | Ngoài W1 analytics | QT.07/33 | BM.04 | P2 |

---

## 9. Kế hoạch chỉnh domain (theo thứ tự)

### Bước A — Bổ sung glossary + entity risk_tier + surgical track vào pack 01/02/06/08

| | |
|--|--|
| **Deliverable** | Diff có kiểm soát vào `01` (thuật ngữ §2), `02` (`risk_tier` trên ViTriGiamSat; track VST), `06` (field/enum), `08` (coverage VST NK + hình thức) |
| **Owner** | **Grok domain** |
| **DoD** | Mỗi thuật ngữ có neo QT/BYT/metric-dict; không đụng NKBV/CSSD; đánh dấu `[PO xác nhận]` còn mở |

### Bước B — Cập nhật metric-dictionary / SRS W1

| | |
|--|--|
| **Deliverable** | SRS `07` bổ sung FR: 6 chiều, hình thức/cách thức, track ngoại khoa, lens; đề xuất patch metric-dictionary (KPI kỹ thuật/NK, cấm badge, workload ≠ KPI) — **file đề xuất trong pack hoặc patch doc local**, không commit GitHub từ executor |
| **Owner** | Grok domain (spec) · **Cursor code** (khi PO lệnh implement) |
| **DoD** | FR/AC testable; công thức không mâu thuẫn dictionary hiện hành |

### Bước C — Seed BM QT vs 36 BK

| | |
|--|--|
| **Deliverable** | Đối chiếu BM.01–04 QT.07 + BM QT.33 + nhóm ưu tiên 36 mẫu; `ap_dung_jsonb` phạm vi/bắt buộc TGS |
| **Owner** | Khoa KSNK (nội dung) · Cursor (seed kỹ thuật) · Grok (traceability) |
| **DoD** | Mỗi BK pilot có phạm vi khoa; không phạt oan bao phủ TGS |

### Bước D — UAT lâm sàng checklist

| | |
|--|--|
| **Deliverable** | Checklist UAT: mở phiên 6 bước · VST 5 Moments · VST NK · GSC · toggle lens · đối soát comparable · ẩn danh trên báo cáo |
| **Owner** | Nghĩa + Khoa (ký) · Cursor (fix môi trường) |
| **DoD** | ≥5/6 kịch bản PASS; PO đóng các `[PO xác nhận]` blocking |

---

## 10. Phụ lục

### 10.1 Công thức %

```text
ty_le_vst         = round( so_tuan_thu / tong_co_hoi × 100, 1 )
ty_le_gsc         = round( so_dat / so_tieu_chi_ap_dung × 100, 2 )   # loại NA
ty_le_ksnk|tgs    = cùng công thức trên tập phiên stype tương ứng
do_lech           = ty_le_tgs − ty_le_ksnk     # chỉ khi vol_tgs>0 ∧ vol_ksnk>0
ty_le_bao_phu_tgs = |BK_bat_TGS_co_phien| / |BK_bat_TGS_ap_dung_khoa|
đủ_mẫu_VST        = tong_co_hoi ≥ 20
đủ_mẫu_GSC        = tong_quan_sat ≥ 30
```

**Cấm:** `0.5×VST+0.5×GSC` (CCS) trên surface điều hành; trung bình % con khi gộp kỳ.

### 10.2 Tham chiếu QT.07 BM.01–04 / QT.33

| Mã | Tên | Vai trò số hóa |
|----|-----|----------------|
| `KSNK.QT.07.HD.01` | 5 thời điểm | Enum Moment 1–5 |
| `KSNK.QT.07.HD.02` | Kỹ thuật 6 bước TQ | BM.02 |
| `KSNK.QT.07.HD.03` | Kỹ thuật ngoại khoa | BM.03; siết chà cồn |
| `KSNK.QT.07.BM.01` | Bảng kiểm 5 thời điểm | Fact cơ hội |
| `KSNK.QT.07.BM.02` | Đánh giá kỹ thuật TQ | Track kỹ thuật |
| `KSNK.QT.07.BM.03` | Đánh giá kỹ thuật NK | Track ngoại khoa |
| `KSNK.QT.07.BM.04` | Tổng hợp % + ABHR | Xuất báo cáo |
| `KSNK.QT.33.BM.01` | Phản hồi kết quả GS | Sau chốt GSC |
| `KSNK.QT.33` bước 2 | 100–200 CH/khoa/tháng | Workload — không KPI % |

### 10.3 BYT 3916 §8 (tóm tắt đã verify)

- Giám sát phương tiện VST: định kỳ **hằng quý**.
- Giám sát tuân thủ **thời điểm** + găng: tối thiểu **hằng tháng** mọi khoa LS; phương pháp: trực tiếp / camera / gián tiếp hóa chất.
- Giám sát **kỹ thuật** thường quy + **ngoại khoa**: **hằng quý**.
- Thông báo kết quả ngay sau buổi GS; tháng/quý báo HĐ + BGĐ + khoa.
- Ưu tiên khu vực nguy cơ cao NKBV.

### 10.4 Năm quyết định PO còn mở (rút gọn)

Xem companion `11-GIAM-SAT-TUAN-THU-README.md` — đồng bộ danh sách dưới đây:

1. Map `risk_tier` khu vực (bảng §5.1).  
2. Mô hình track VST ngoại khoa (phiên riêng vs flag).  
3. Chính sách ẩn danh tên NV đối tượng vs lưu audit.  
4. Derive hình thức khi ML thuộc KSNK quan sát tại khoa LS.  
5. Mốc thời gian lộ trình mục tiêu 80→85→90 / 50→60 / 90→100 (CT 06/2026).

---

*Hết artifact v1. Không sửa GitHub từ executor. Cập nhật pack README để treo tài liệu này sau mục 10 NKBV.*
