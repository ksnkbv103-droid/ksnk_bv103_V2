> ⚠️ **SUPERSEDED (2026-09-17)** — Không dùng làm plan đang hiệu lực.  
> **Plan hiệu lực:** [`BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md`](./BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md) (+ rà rối [`BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md`](./BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md)).  
> File này giữ lịch sử.

# Chiến lược TGS × KSNK — tách bạch, đơn giản, đúng quản trị

> 2026-09-17 · **Chỉ phân tích & kế hoạch** · Không implement trong lát này  
> Phạm vi: GSC (ưu tiên) + nguyên tắc áp VST · Bám SSOT metric-dictionary · Khóa H2/P.A/Action board đã ship local

---

## 1. Mục tiêu giám sát (một câu cho mỗi vai)

| Vai | Câu hỏi cần trả lời | Con số cần thấy ngay |
|-----|---------------------|----------------------|
| **Khoa lâm sàng / GSV** | Khoa mình đã tự giám sát chưa? Chuyên trách KSNK đánh giá khoa mình thế nào? | % **TGS** (nếu có phiên) · % **KSNK** (nếu có phiên) · BK còn thiếu TGS |
| **Khoa KSNK / quản trị** | Ai chưa TGS? Ai chuyên trách thấp? Lỗi tiêu chí nào hay gặp? | Bao phủ TGS · ranking % KSNK · top vi phạm · (tuỳ chọn) đối soát |
| **Ban Giám đốc (BCTH in)** | Điểm nóng cần chỉ đạo | 3 khoa KSNK thấp · 3 khoa điển hình KSNK · lỗi hay gặp · % gộp **theo từng nguồn**, không avg |

**Giám sát tồn tại để:** (1) khoa làm chủ chất lượng quy trình hằng ngày; (2) KSNK xác minh độc lập; (3) phát hiện lệch giữa “tự báo” và “đối chiếu ngoài”. Không phải để ra **một** chỉ số CCS hay một % trộn TGS+KSNK.

---

## 2. Domain: TGS và KSNK là gì (không trộn vai)

| | **Tự giám sát (TGS)** | **Chuyên trách (KSNK)** |
|--|------------------------|-------------------------|
| Ai làm | Nhân viên / khoa lâm sàng | Khoa KSNK (độc lập hơn) |
| Mục đích | Sở hữu quy trình, rèn thói quen, báo cáo nội bộ | Kiểm định, phát hiện lệch, chỉ đạo |
| Bản chất Assurance | Monitoring nội bộ (first line) | Second line / independent check |
| Chỉ số % | `ty_le_tgs` | `ty_le_ksnk` |
| Khối lượng | `vol_tgs` | `vol_ksnk` |
| Câu hỏi phủ | **Đã TGS chưa?** → `ty_le_bao_phu_tgs` / ô khoa×BK | Đủ phiên chuyên trách trên mẫu bắt buộc? |
| Khi thiếu một bên | Vẫn có giá trị TGS *riêng* | Vẫn có giá trị KSNK *riêng* |

**`do_lech` / “đối soát”:** chỉ có nghĩa khi **cả hai** `vol > 0` (comparable). Đó là *câu hỏi thứ ba* (“Khoa tự báo cao hơn KSNK bao nhiêu?”), **không** phải cách nhìn mặc định hàng ngày.

**VST:** cùng logic — `stype` TGS vs KSNK; Action board / ranking nên theo **một** nguồn mỗi lần, không hai cột % trên một trục như hiện tại.

---

## 3. Vì sao hiện tại rối (chính xác)

1. **Một chart / một bảng cố “đối soát” hai nguồn** (`SupervisionKhoaAnalyticsBlock`: hai thanh KSNK + TGS; gap comparable lọc bỏ khoa chỉ có một nguồn) → thuật toán và mắt người đều mệt; nhiều khoa thành «Chưa TGS / Chưa chuyên trách».
2. **Hai sản phẩm khác nhau bị gộp một bề mặt:** (A) *Chất lượng tuân thủ %* và (B) *Bao phủ nghĩa vụ TGS* — đang nằm gần nhau / trong Nâng cao nhưng vẫn dễ hiểu nhầm là một chỉ số.
3. **Nhãn kỹ thuật lộ lên UI** (TGS/KSNK, comparable, do_lech) thay vì ngôn ngữ quản trị («Tự giám sát» / «Chuyên trách» / «Đối soát khi có đủ hai nguồn»).
4. **Phạm vi phình** (đã chẩn đoán trong `BV103-GSC-CHAN-DOAN-DON-GIAN-20260917.md`): strategic + gap + coverage + đa chiều cùng lúc trên một trang → không còn “nhìn ra ngay vấn đề”.

**Không phải** vì thiếu RPC gap — engine đúng. **Là** IA/sản phẩm đang ép hai lens vào một khung.

---

## 4. Chiến lược đề xuất: **Hai lens · một switch · đối soát ở lớp 2**

### Nguyên tắc vàng (5)

1. **Không bao giờ** hiện % trộn TGS+KSNK làm chỉ số chính (không `ty_le_avg` / CCS trên điều hành).  
2. **Một màn = một nguồn** đang được nhìn (toggle 2 trạng thái).  
3. **Bao phủ TGS** là sản phẩm riêng (“đã làm / chưa làm”), không nhập vào % tuân thủ.  
4. **Đối soát** chỉ mở khi user chủ động — và chỉ với khoa comparable.  
5. **Action board** (thấp / điển hình / lỗi) luôn theo **nguồn đang chọn**.

### Mô hình bề mặt (đề xuất)

```text
/thong-ke/gsc  (và tương tự VST)
├─ [Toggle]  Chuyên trách (KSNK)  |  Tự giám sát (TGS)     ← mặc định: KSNK
├─ Action board (thấp · điển hình · lỗi)     ← theo toggle
├─ Chart + bảng khoa                         ← chỉ 1 chuỗi %
├─ «Xem thêm»: xu hướng · so sánh khối/KV/ĐT · KPI thô
└─ «Nâng cao» (giữ P.A):
      · Bao phủ TGS (khoa × BK)              ← luôn là lens TGS-breadth
      · Đối soát TGS vs KSNK (comparable)    ← lớp 2, không mặc định
      · BK tôi phải TGS (không QLCV)
```

**BCTH:** hai block đã tách VST|GSC; bên trong mỗi block thêm **cùng toggle nguồn** (hoặc hai hàng Action board: một KSNK, một TGS — *không* chart đôi). Đối soát không đưa lên fold BCTH.

### Ba lựa chọn (so sánh)

| | A — Chỉ KSNK, bỏ TGS trên báo cáo | B — Giữ chart đôi / gap mặc định (hiện tại) | **C — Toggle 2 lens + đối soát lớp 2 (đề xuất)** |
|--|-----------------------------------|-----------------------------------------------|--------------------------------------------------|
| Độ rối | Thấp | Cao | Thấp–TB |
| Mất thông tin? | Mất bao phủ TGS & đối soát | — | Không — chuyển vào Nâng cao / toggle |
| Đúng quản trị? | Một nửa (chỉ second line) | Ép comparable | Đủ first + second line |
| Code | Đơn giản nhưng sai nghiệp vụ | Phức tạp nhất | Trung bình; RPC giữ nguyên |

**Khuyến nghị: C.**  
Lý do: TGS không phải “noise” — là *trách nhiệm khoa*. KSNK không thể thay thế TGS. Nhưng **không** được bắt mắt đọc cả hai cùng lúc trên một biểu đồ.

---

## 5. Ai cần thấy gì (ma trận vai → UI)

| Nhu cầu | Surface | Nội dung |
|---------|---------|----------|
| GSV / trưởng khoa | Form + Thống kê mặc định | % nguồn đang chọn · BK thiếu TGS (khi toggle TGS hoặc Nâng cao) |
| CV KSNK | `/thong-ke/gsc` fold 0 | Action KSNK · chart KSNK · deep-link lỗi |
| QL KSNK / HĐ | BCTH | Action KSNK + Action TGS (2 board) · không đối soát trên fold |
| “Khoa tự báo đẹp hơn thực tế?” | Nâng cao → Đối soát | Chỉ comparable · `do_lech` · bảng đơn giản |

---

## 6. Kế hoạch triển khai (khi Nghĩa ra lệnh «làm»)

### P0 — IA lens (ưu tiên, local Grok / Cursor nếu >5 file)

| ID | Việc | File chính |
|----|------|------------|
| L0 | Toggle «Chuyên trách \| Tự giám sát» trên `GscAnalyticsView` / `VstStrategicAnalyticsPanel` | views + panels |
| L1 | Action board + chart chỉ bind **một** nguồn theo toggle (matrix / gap filter `vol_*` tương ứng) | `supervision-action-board.ts`, panels |
| L2 | Ẩn / thu chart đôi KSNK+TGS mặc định | `supervision-charts-khoa-compare.tsx` |
| L3 | Copy UI: «Chuyên trách» / «Tự giám sát» (bỏ lộ TGS/KSNK mã kỹ thuật trên tiêu đề) | labels |

### P1 — Tách sản phẩm bao phủ vs %

| ID | Việc |
|----|------|
| L4 | Nâng cao: chỉ **Bao phủ TGS** + **Đối soát comparable** (2 panel rõ tên) |
| L5 | Bỏ (hoặc 1 dòng link) mọi QLCV từ TGS panels (khóa H2) |
| L6 | Metric-dictionary: 1 đoạn “Hai lens · không trộn %” |

### P2 — Tinh gọn code (sau khi IA ổn)

| ID | Việc |
|----|------|
| L7 | Thu hẹp `buildGapKhoaRows` dual-series path trên fold chính |
| L8 | Optional: `matrix_khoa_ksnk` / `matrix_khoa_tgs` explicit từ RPC (hoặc filter FE từ `stype`) — tránh comparable giả |
| L9 | Vitest: toggle → board chỉ 1 nguồn; đối soát rỗng khi thiếu 1 vol |

**Không làm:** xóa RPC `gap_analysis`; hồi CCS; gộp VST vào GSC; đưa đối soát lên fold mặc định.

---

## 7. Tiêu chí “xong” (Done)

- [ ] Mở `/thong-ke/gsc`: **một** nguồn % trên fold; không hai cột % bắt buộc.  
- [ ] User đổi toggle → Action board + chart đổi theo; không còn “cả hai lẫn”.  
- [ ] Bao phủ TGS và Đối soát chỉ ở Nâng cao, tên gọi tách biệt.  
- [ ] BCTH: hai Action board (KSNK / TGS) hoặc toggle; không chart đôi.  
- [ ] UAT 5 phút: GSV nói được “khoa tôi % chuyên trách = … / % tự giám sát = … / BK thiếu = …”.  
- [ ] Code không thêm panel strategic mới — chỉ **sắp lại** surface.

---

## 8. Trả lời thẳng câu Nghĩa

| Câu hỏi | Trả lời |
|---------|---------|
| Có nên tách biệt TGS và KSNK? | **Có — trên bề mặt nhìn.** Engine/RPC giữ; UI không trộn. |
| Có nên chỉ để KSNK? | **Không.** TGS là trách nhiệm khoa; bỏ là mất first-line assurance. |
| Làm thế nào cho phù hợp? | **Toggle 2 lens + đối soát lớp 2 + Action board theo nguồn.** |
| Bảng kiểm / cách báo cáo còn rối? | Rối vì **nhiều sản phẩm trên một trang**, không vì thiếu bảng. Giảm fold chính xuống: Action + 1 chart + (GSC) navigator BK. |

---

## 9. Việc Nghĩa chốt trước khi code

1. **Chốt mô hình C** (toggle 2 lens) — hoặc muốn biến thể “BCTH hiện 2 board cố định, thống kê 1 toggle”?  
2. **Mặc định toggle:** KSNK (đề xuất cho tài khoản KSNK) hay TGS (nếu mạng lưới khoa là user chính)?  
3. **Đối soát** có được vào Nâng cao ngay P0 hay để P1?



## Trạng thái (2026-09-17)

- [x] L0–L2 local: toggle Chuyên trách|Tự giám sát trên GSC/VST + BCTH; Action/chart 1 nguồn; đối soát Nâng cao
- [ ] Commit / UAT — chờ lệnh Nghĩa

- [x] 2026-09-17: Bỏ Action board fold 0 · tab %/khối lượng · mở so sánh
