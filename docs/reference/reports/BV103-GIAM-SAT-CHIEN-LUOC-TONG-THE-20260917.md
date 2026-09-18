# Chiến lược tổng thể module Giám sát KSNK

> ✅ **PLAN HIỆU LỰC (2026-09-17)** — file này là chiến lược đang dùng.  
> Các `BV103-*` plan khác đã gắn **SUPERSEDED**.  
> Rà rối UI: [`BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md`](./BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md).  
> **2026-09-17 P0 UI:** Hub 2 CTA · ModeNav «Nhập/Lịch sử/Thống kê» · thống kê accordion so sánh · BCTH fold nhẹ (xu hướng/NKBV trong Thêm) · chart tab %/khối lượng · không Action board fold 0.

---

## 0. Trả lời nhanh: KSNK có giám sát riêng độc lập không?

**Có — và kế hoạch giữ nguyên.**

Theo `metric-dictionary.md` (§ KSNK vs TGS) và intake TGS (`bang-kiem-ap-dung-tgs-intake-202606.md`):

| | **Chuyên trách (KSNK)** | **Tự giám sát (TGS)** |
|--|-------------------------|------------------------|
| Ai thực hiện | Khoa KSNK (`hinh_thuc = KSNK`) | Khoa lâm sàng (`TU_GIAM_SAT`) |
| Vai | Xác minh / second line | Sở hữu quy trình / first line |
| Chỉ số % | `ty_le_ksnk` · `vol_ksnk` | `ty_le_tgs` · `vol_tgs` |
| Trên UI | Toggle **Chuyên trách** (mặc định fold 0) | Toggle **Tự giám sát** |
| Độc lập? | **Có** — % riêng, ranking riêng, lỗi riêng (KSNK) | **Có** — % riêng; bao phủ là *sản phẩm khác* |

**Không** gộp hai nguồn thành một %. **Không** bỏ KSNK.  
Đối soát (`do_lech`) chỉ khi `vol_tgs > 0 ∧ vol_ksnk > 0` — là *câu hỏi thứ ba*, không thay thế hai lens.

Đã local: toggle + Action/chart 1 nguồn + đối soát ở Nâng cao (`BV103-TGS-KSNK-CHIEN-LUOC-20260917.md`).

---

## 1. Mục tiêu giám sát — lấy từ đâu?

Nguồn đã đọc (theo thứ tự ưu tiên domain BV103):

1. `docs/modules/dashboard/metric-dictionary.md` — định nghĩa chỉ số & khóa surface  
2. `docs/modules/dashboard/bang-kiem-ap-dung-tgs-intake-202606.md` — ba lớp KPI TGS + phạm vi BK  
3. `docs/modules/dashboard/analytics-wave12-intake-202606.md` — luật comparable  
4. `docs/reference/reports/BV103-GSC-DE-CUONG-20260917.md` — đề cương vận hành VST/GSC  
5. `docs/reference/reports/ksnk-bv103-compendium-20260824.md` §6.4–6.5, §6.10 — mục đích module & BCTH  
6. `docs/core/domain-specification.md` §2.1 VST (WHO)  
7. Plan trước: Action board · TGS×KSNK · VST≠GSC

**Tầm nhìn hệ (compendium):** quan sát tuân thủ → số điều hành → (việc khắc phục **riêng** trên QLCV, không trộn vào thống kê — H2).

### 1.1 Mục tiêu một câu (process surveillance)

> Đo và **công bố** mức độ tuân thủ quy trình KSNK (VST theo WHO; GSC theo bảng kiểm), tách **ai quan sát** (KSNK vs khoa), để khoa sửa thói quen và KSNK chỉ đạo — **không** để ra một chỉ số CCS hay một % trộn.

### 1.2 Ba lớp câu hỏi giám sát (SSOT TGS intake §3.3)

| Lớp | Câu hỏi | Chỉ số | Surface |
|-----|---------|--------|---------|
| **A. Chất lượng (depth)** | Khi đã giám sát, tuân thủ thế nào? | `ty_le_ksnk` / `ty_le_tgs` · VST cơ hội · GSC đạt/quan sát | Fold 0 + Action board |
| **B. Bao phủ (breadth)** | Đã chạm đủ *loại* BK bắt buộc chưa? | `ty_le_bao_phu_tgs` · ô khoa×BK | Nâng cao (TGS) |
| **C. Đối soát** | Khoa tự báo có lệch chuyên trách không? | `do_lech` khi comparable | Nâng cao |

**Cấm gộp A+B+C thành một số** (đúng spirit metric-dictionary: cấm CCS / cấm trộn TGS+KSNK).

---

## 2. Hai trục giám sát — không đan xen

```text
TRỤC 1 — Chuyên đề (cách đo)          TRỤC 2 — Nguồn (ai đo)
─────────────────────────────        ─────────────────────────
VST  = WHO 5 thời điểm / cơ hội      Chuyên trách = KSNK
GSC  = Checklist 36 mẫu / tiêu chí  Tự giám sát  = khoa lâm sàng

VST ≠ GSC (đề cương §1, §6 “không gộp”)
Một màn fold 0 = một chuyên đề × một nguồn (toggle)
```

| Cặp | Được | Không |
|-----|------|-------|
| VST và GSC | Hub riêng · thống kê riêng · BCTH block riêng | Chart/CCS trộn hai chuyên đề |
| KSNK và TGS | Toggle · hai % · đối soát lớp 2 | Dual-bar bắt buộc trên fold 0 |
| Process và NKBV | BCTH: process trước, outcome sau | Gộp vào CCS |
| Thống kê và QLCV | QLCV = module nội bộ KSNK | Link “giao việc” từ thống kê (H2) |

---

## 3. Ai cần biết gì → surface nào

Bám compendium (§6.4–6.5, 6.10) + metric-dictionary “Ba tầng màn hình” + H2:

| Vai | Việc hàng ngày | Cần thấy | Surface | Không cần trên màn đó |
|-----|----------------|----------|---------|------------------------|
| **Nhân viên / GSV khoa** | Điền phiếu | Form nhanh · lịch sử | `/giam-sat-vst` · `/giam-sat-chung` | Action board · gap · QLCV |
| **GSV / mạng lưới** | Biết khoa mình thế nào | % nguồn đang xem · BK thiếu TGS | `/thong-ke/*` + toggle · Nâng cao bao phủ | Đối soát toàn viện (tuỳ chọn) |
| **CV / NV KSNK** | Chỉ đạo tuân thủ | Thấp · điển hình · lỗi · drill BK | Fold 0 Action + chart 1 nguồn | Dual % · CCS |
| **QL / Hội đồng / BGĐ** | Chỉ đạo kỳ · in | BCTH: action theo nguồn · (Nâng cao) đối soát | `/bao-cao-tong-hop` | Chi tiết TGS coverage · form nhập |

---

## 4. Con số được phép trên điều hành

### Được (process)

- `ty_le_vst` (1 số) · `ty_le_gsc` (2 số) — **theo nguồn đang chọn**  
- Ranking thấp / cao (min-N: VST 20 cơ hội · GSC 30 quan sát)  
- Lỗi: moment WHO (VST) · top tiêu chí vi phạm (GSC) — ưu tiên lens KSNK  
- Bao phủ TGS (`ty_le_bao_phu_tgs`) — **riêng**, Nâng cao  
- `do_lech` — **chỉ** comparable · Nâng cao  
- Δ so mục tiêu viện / kỳ trước — trên KPI BCTH (không thay Action board)

### Cấm trên surface điều hành

- `ty_le_ccs` / `ty_le_avg` làm chỉ số chính  
- % trộn TGS+KSNK  
- Chart đôi KSNK+TGS bắt buộc trên fold 0  
- Gộp VST+GSC thành một “tuân thủ chung”  
- QLCV / “Việc hôm nay” trên thống kê & BCTH fold (H2)

---

## 5. Chuẩn mực UI — “nhìn ra ngay”

### Fold 0 thống kê (VST / GSC)

1. Toggle **Chuyên trách | Tự giám sát**  
2. Action board: Thấp · Điển hình · Lỗi hay gặp  
3. Chart + bảng **một** nguồn  
4. GSC: navigator BK rủi ro  

### Nâng cao / Xem thêm

- Xu hướng · so sánh khối / KV / đối tượng (theo chuyên đề)  
- **Đối soát** (comparable only)  
- **Bao phủ TGS** (GSC)  
- KPI thô · «BK tôi phải TGS» (không QLCV)

### BCTH

- Hai block VST | GSC (đã tách)  
- Mỗi block: toggle nguồn + Action + chart 1 nguồn · deep-link thống kê  
- Không bảng Dimension 2 cột VST|GSC  

**Tiếng UI:** «Chuyên trách» / «Tự giám sát» — hạn chế lộ mã TGS/KSNK trên tiêu đề (implementation-mapping 2026-08-23).

---

## 6. Khoảng trống còn lại (sau lens) — đối chiếu SSOT

| # | Khoảng trống | Nguồn | Ưu tiên |
|---|--------------|-------|---------|
| K1 | Lỗi/moment **chưa tách theo stype** → lens TGS chưa có “lỗi riêng” | metric-dictionary Action board · lens note | P1 |
| K2 | UAT lâm sàng **nội dung 36 mẫu** (BM ưu tiên) chưa ký | GSC đề cương G1 · UAT C | P0 nghiệp vụ (Khoa) |
| K3 | `ap_dung_jsonb` 36 mẫu — KSNK cần điền phạm vi/bắt buộc | TGS intake §0 bước 5–6 | P0 ops |
| K4 | Chrome VST còn dùng `gscFormChrome` | Đề cương / kiến trúc | P1 kỹ thuật |
| K5 | In BCTH Phần I chưa đủ 4 dòng action theo nguồn | metric-dictionary / print | P1 |
| K6 | P×I×S · RCA form · CCS | Đề cương D · metric-dictionary | Hoãn |

**Không phải khoảng trống:** thiếu RPC gap; thiếu comparable; thiếu Action board (đã có local).

---

## 7. Kế hoạch cải tổ (chuẩn mực, theo pha)

### P0 — Đã local / chờ UAT + chốt phạm vi BK

| ID | Việc | Ai | DoD |
|----|------|----|-----|
| L0–L3 | Toggle 2 lens · Action/chart 1 nguồn · đối soát Nâng cao | Grok (xong local) | UAT 5 phút GSV+KSNK |
| U1 | UAT nhóm mẫu ưu tiên (VST kỹ thuật · PPE · bundles) | Nghĩa + Khoa | Wording tiêu chí đạt |
| U2 | Seed `ap_dung_jsonb` từ file KSNK | KSNK + Dev | 36 dòng có phạm vi/bắt buộc |
| C1 | Commit lens + plan khi Nghĩa ra lệnh | Nghĩa | git trên Mac |

### P1 — Tinh gọn sản phẩm (khi lệnh «làm»)

| ID | Việc | File / lớp |
|----|------|------------|
| P1.1 | Tách lỗi theo `stype` (TGS có lỗi riêng) | RPC strategic / FE Action |
| P1.2 | Tách chrome VST | `gsc-form-chrome` → VST chrome |
| P1.3 | In BCTH: action 4 dòng (VST-KSNK · VST-TGS · GSC-KSNK · GSC-TGS) | print |
| P1.4 | Xác nhận mọi panel TGS **không** QLCV | views GSC |
| P1.5 | UAT tay checklist pilot | localhost |

### P2 — Sau khi IA ổn

| ID | Việc |
|----|------|
| P2.1 | Optional RPC `matrix_*` explicit theo stype |
| P2.2 | P×I×S chỉ sau UAT nhóm 1–2 (đề cương D) |
| P2.3 | Không hồi EAV / RCA / CCS / gộp VST–GSC |

---

## 8. Tiêu chí “xong” module tinh gọn

- [x] Fold 0: **một** nguồn % + Action + (GSC) BK rủi ro  
- [x] Toggle đổi → số trên fold đổi theo  
- [x] KSNK vẫn là giám sát độc lập (mặc định + lens riêng)  
- [x] TGS không biến mất — toggle + Nâng cao (bao phủ / đối soát)  
- [x] VST ≠ GSC trên surface  
- [ ] UAT 5 phút: nói được thấp / điển hình / lỗi / BK thiếu TGS / (tuỳ chọn) đối soát  
- [ ] `ap_dung_jsonb` đủ để bao phủ không phạt oan  
- [ ] Commit khi có lệnh  

---

## 9. Giải thích dễ hiểu (cho Khoa / BGĐ)

1. **Hai cách đo:** VST = rửa tay WHO; GSC = bảng kiểm quy trình. Không trộn.  
2. **Hai người đo:** Khoa tự giám sát · KSNK giám sát chuyên trách. Mỗi người một %.  
3. **Màn hình chính** cho KSNK: xem *chuyên trách* trước — ai thấp, ai điển hình, lỗi gì.  
4. **Tự giám sát** bật khi cần: khoa đã làm chưa (bao phủ), % tự báo, và *chỉ khi* có cả hai mới đối soát.  
5. **Việc giao** nằm menu Công việc — không nhét vào trang thống kê.

---

## 10. Tham chiếu đã dùng

- `docs/modules/dashboard/metric-dictionary.md`  
- `docs/modules/dashboard/bang-kiem-ap-dung-tgs-intake-202606.md`  
- `docs/modules/dashboard/analytics-wave12-intake-202606.md`  
- `docs/reference/reports/BV103-GSC-DE-CUONG-20260917.md`  
- `docs/reference/reports/BV103-TGS-KSNK-CHIEN-LUOC-20260917.md`  
- `docs/reference/reports/ksnk-bv103-compendium-20260824.md` §6.4–6.5, 6.10  
- `docs/core/domain-specification.md` §2.1  

---

*Local-first · không push/Vercel trừ lệnh Nghĩa.*


## Cập nhật fold (cùng ngày — sau UAT cảm nhận)

- **Bỏ** Action board badge trên fold 0 (trùng chart %; lỗi VST đã ở phân tích sâu).
- Chart khoa: **tab** Tỷ lệ tuân thủ | Khối lượng (cơ hội/quan sát).
- **Mở** xu hướng + so sánh khối/KV/đối tượng/hình thức trên fold (không giấu «Xem thêm»).
- Nâng cao giữ: đối soát · bao phủ TGS · KPI.


## P0 UI đã làm (2026-09-17)

- Hub: 2 CTA VST · Giám sát tuân thủ + dòng Lịch sử/Thống kê/QR
- ModeNav: Nhập · Lịch sử · Thống kê (không «TK»)
- Thống kê: chart tab % | khối lượng; So sánh & xu hướng (accordion); Nâng cao đóng
- BCTH: fold chính = Tổng quan · VST · GSC · Phần III; Thêm = xu hướng · NKBV · chi tiết
- Docs: 1 plan hiệu lực; plan cũ = SUPERSEDED
