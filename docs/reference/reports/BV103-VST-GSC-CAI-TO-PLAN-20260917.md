> ⚠️ **SUPERSEDED (2026-09-17)** — Không dùng làm plan đang hiệu lực.  
> **Plan hiệu lực:** [`BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md`](./BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md) (+ rà rối [`BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md`](./BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md)).  
> File này giữ lịch sử.

# Kế hoạch cải tổ VST · GSC analytics — 2026-09-17

**Mục tiêu nghiệp vụ:** Báo cáo phải trả lời được: khoa/khối/KV/đối tượng nào tuân thủ thấp nhất–cao nhất; lỗi hay gặp để chấn chỉnh; đơn vị điển hình để biểu dương. VST (cơ hội WHO) và GSC (tiêu chí BK) là **hai phân hệ tách**, không trộn chỉ số.

**Không đụng:** H2 (Tổng quan→BCTH), P.A (ModeNav), CCS, QLCV cross-link, VST≠GSC domain, % GSC 2 số / VST 1 số.

---

## 1. Chẩn đoán (vì sao “chưa gãi đúng ngứa”)

### 1.1. Không mất domain / RPC so sánh

| Năng lực | Trạng thái | Path / RPC |
|----------|------------|------------|
| So sánh khối / KV / nghề / hình thức VST | **Còn** | `rpc_vst_compare_matrices` ← `getVstStrategicAnalytics` merge `matrix_*` |
| So sánh tương tự GSC | **Còn** | `rpc_gsc_compare_matrices` ← `getGscStrategicAnalytics` |
| Theo khoa + gap TGS/KSNK | **Còn** | `matrix_khoa`, `gap_analysis` trong strategic RPC |
| Top vi phạm GSC | **Còn** | `top_violations`, `checklist_overview.top_violation_*` |
| Thời điểm VST (5 moments WHO) | **Còn** | `moments` + `SupervisionMomentsPanel` |
| Ranking khoa màu ngưỡng | **Còn** | `SupervisionKhoaAnalyticsBlock` |

Cleanup `f7b197b` **không xóa** các RPC/mapper trên. Chỉ xóa Command Center / decision-queue (ops hub + QLCV) — không phải engine so sánh.

### 1.2. Vì sao user cảm thấy “không có dữ liệu so sánh đa chiều”

**A. UI chôn (nguyên nhân chính — product, không phải mất SQL)**

1. **BCTH:** section `bc-dimension` («So sánh đa chiều») nằm trong nhánh `moreSectionsOpen` — **mặc định collapsed**. User phải bấm «Xem thêm» mới thấy khối/KV/đối tượng.
2. **`/thong-ke/vst` & `/thong-ke/gsc`:** so sánh khối/nghề/hình thức nằm trong `<details> Xem thêm` / GSC «Nâng cao». Màn hình chính = chart theo khoa + (GSC) navigator BK.
3. Empty-state của `ComprehensiveDimensionCompare` còn câu «ưu tiên so sánh khoa ở mục VST/GSC» → xác nhận DimensionCompare bị coi là phụ, trong khi đúng là chỗ đa chiều.

**B. Trộn hai phân hệ trên một widget**

`ComprehensiveDimensionCompare` render **cột VST | GSC** chung một chiều (Khối/KV/Đối tượng). Vi phạm nghiệp vụ mong muốn: VST nói về cơ hội/moment/kỹ thuật; GSC nói về tiêu chí BK / TGS–KSNK. Ghép hai cột dễ thành “bảng cho có”, không phải action list.

**C. Thiếu “bảng hành động” cô đọng**

Đã có mảnh: `top_violations`, `worst_khoa`, moments thấp nhất (`ComprehensiveTopicHybrid` draft Phần III). Nhưng:

- Không có block chuẩn **Thấp nhất · Cao nhất · Lỗi hay gặp · Điển hình** (màu + ≤5 dòng) ngay trên fold.
- VST chưa có bảng “lỗi kỹ thuật / bỏ sót / moment yếu” nổi bật tương đương GSC top violation.
- Không có ranking điển hình (cao nhất + đủ mẫu) nổi bật cho biểu dương.

**D. Khi nào matrix thật sự rỗng (data, không phải UI)**

- Kỳ lọc / `khoa_ids` thu hẹp → ít nhóm `tong>0`.
- Khoa chưa gắn `khoi_id` → chiều Khối lệch (đã có hint hệ thống).
- GSC mặc định chỉ BK `TUAN_THU` (đúng domain) → nếu kỳ chỉ có BK khác thì GSC trống.
- Không phải do mất code compare.

### 1.3. Chồng lấn VST ↔ GSC (cần tách rõ trên báo cáo)

| Điểm đan xen | Hiện trạng | Hướng tách |
|--------------|------------|------------|
| BCTH DimensionCompare 2 cột | Trộn | Tách block VST / block GSC; mỗi block có 4 hàng action riêng |
| Nav Thống kê 2 tab | Đã tách | Giữ; không đưa compare đa chiều lên BCTH như “một bảng chung” |
| Hub `/giam-sat` | Cổng nhập 3 module | OK — không đụng analytics |
| ModeNav Nhập/Lịch sử/Thống kê | Theo module | OK |
| `%` / mẫu số | VST opportunity vs GSC criteria | Đã tách SSOT — giữ |
| TGS coverage | Chỉ GSC | Giữ trong GSC; không kéo sang VST |

**Kết luận:** Domain VST≠GSC còn đúng. Vướng = **IA báo cáo** (chôn + trộn + thiếu action table), không phải mất RPC.

---

## 2. Nguyên tắc cải tổ

1. **Một phân hệ = một “câu trả lời”** trên bề mặt analytics (không bảng VST|GSC ghép).
2. **Fold 0:** 4 hàng hành động (màu) + chart khoa; fold sau: xu hướng / hình thức / TGS.
3. **Bảng cần thiết, cô đúc:** mỗi hàng ≤1 dòng; highlight đỏ/vàng/xanh theo ngưỡng đã có (`VST_KHOA_CHART_THRESHOLDS` / GSC ~80%).
4. **Không hồi sinh QLCV / decision-queue / CC** làm cửa so sánh.
5. **Không đổi công thức** VST opportunity / GSC TUAN_THU / ROUND digits.

---

## 3. Kế hoạch lát (đề xuất)

### P0 — Làm đúng ngứa (UI, ≤~8 file, Grok local)

**Mục tiêu:** User mở Thống kê VST hoặc GSC (hoặc BCTH section VST/GSC) là thấy ngay ai thấp / ai cao / lỗi gì / ai điển hình.

| # | Việc | File chính |
|---|------|------------|
| P0.1 | Component dùng chung `SupervisionActionBoard` (4 cụm: Thấp nhất, Cao nhất, Lỗi hay gặp, Điển hình) — prop theo source `vst` \| `gsc` | `src/lib/analytics/SupervisionActionBoard.tsx` (mới) |
| P0.2 | **VST board:** thấp/cao từ `matrix_khoa` (lọc `tong_co_hoi≥N`); lỗi = moments thấp + KPI kỹ thuật/bỏ sót nếu có trên payload; điển hình = top cao + đủ mẫu | `VstStrategicAnalyticsPanel.tsx` — **đưa ActionBoard lên trên fold**, trước hoặc thay vị trí “Xem thêm” cho compare đa chiều |
| P0.3 | **GSC board:** thấp/cao từ `matrix_khoa`; lỗi = `top_violations` (+ worst_khoa nếu có); điển hình = khoa/BK cao | `GscStrategicAnalyticsPanel.tsx` — ActionBoard trên fold; `top_violations` không chỉ nằm trong details |
| P0.4 | BCTH: bỏ (hoặc không mặc định ẩn) DimensionCompare kiểu 2 cột; thay bằng **2 section action board** trong `bc-vst` / `bc-gsc` (đã có `ComprehensiveCompare`) — mở rộng Compare thành Compare+Action, không thêm tab | `ComprehensiveCompare.tsx`, `bao-cao-tong-hop-page.tsx` |
| P0.5 | Dimension đa chiều (khối/KV/ĐT): giữ data path hiện tại; **đưa lên fold** trong `/thong-ke/{vst,gsc}` (bỏ `<details>` cho compare), hoặc 1 subsection «Theo khối / khu vực / đối tượng» dưới ActionBoard — **tách theo module**, không ghép VST\|GSC | `VstStrategicAnalyticsPanel`, `GscStrategicAnalyticsPanel`; `ComprehensiveDimensionCompare` chỉ còn dùng nếu cần trên BCTH cho *một* module mỗi lần |

**DoD P0:**

- [ ] `/thong-ke/vst` và `/thong-ke/gsc`: không cần mở details mới thấy thấp/cao + lỗi + điển hình.
- [ ] BCTH section VST và GSC mỗi bên có action board riêng, có màu ngưỡng.
- [ ] Copy/UI không gợi ý “so sánh đa chiều = bảng VST cạnh GSC”.
- [ ] Vitest: mapper/board pure helpers (sort thấp→cao, filter mẫu số, top-N).
- [ ] UAT tay: 1 kỳ có dữ liệu → thấy ≥1 dòng đỏ (thấp) và ≥1 dòng xanh (điển hình) nếu math cho phép.

### P1 — Tách IA báo cáo / thống kê (vừa phải)

| # | Việc |
|---|------|
| P1.1 | BCTH: `bc-dimension` không còn là “một bảng hai cột”; nếu giữ, chỉ là deep-link «Chi tiết thống kê» sang `/thong-ke/vst` hoặc `/thong-ke/gsc` với hash `#action` / `#compare`. |
| P1.2 | GSC «Nâng cao»: giữ TGS + BK tôi phải (P.A khóa) — **không** nhét ActionBoard vào Nâng cao. |
| P1.3 | VST: moments panel là “lỗi theo thời điểm WHO” — gắn vào cụm Lỗi của ActionBoard (không để chart moments chỉ trong flow dọc dễ trôi). |
| P1.4 | Ngưỡng màu + min sample: chốt `N` tối thiểu (đề xuất VST 20 cơ hội / GSC 30 quan sát) để tránh “1 ca = 0%” làm nhiễu điển hình — ghi SSOT metric-dictionary. |

### P2 — Làm dày nghiệp vụ (nếu P0 chưa đủ)

| # | Việc |
|---|------|
| P2.1 | GSC: bảng lỗi theo **tiêu chí × khoa** (đã có trong BK detail) — surface top 5 tiêu chí toàn viện trên ActionBoard. |
| P2.2 | VST: bảng lỗi kỹ thuật / thời gian / bỏ sót theo khoa (nếu fact/RPC đã có hoặc additive view) — chỉ khi SSOT cho phép; không invent EAV. |
| P2.3 | In BCTH Phần I: 4 dòng action (thấp/cao/lỗi/điển hình) mỗi phân hệ — cô đúc cho giám đốc. |
| P2.4 | Optional: filter “chỉ khoa dưới ngưỡng” trên chart — không đổi RPC. |

---

## 4. Phân rã file P0 (ước lượng)

| File | Việc |
|------|------|
| `src/lib/analytics/SupervisionActionBoard.tsx` | Mới |
| `src/lib/analytics/supervision-action-board.ts` + `.spec.ts` | Pure: pick low/high/exemplary/errors |
| `src/modules/giam-sat-vst/components/VstStrategicAnalyticsPanel.tsx` | Gắn board + unhide compare |
| `src/modules/giam-sat-chung/components/GscStrategicAnalyticsPanel.tsx` | Gắn board + unhide top_violations |
| `src/modules/dashboard/components/comprehensive/ComprehensiveCompare.tsx` | Action rows trong section khoa |
| `src/modules/dashboard/views/bao-cao-tong-hop-page.tsx` | Thứ tự section / bớt ẩn dimension |
| `docs/modules/dashboard/metric-dictionary.md` | Min-N + định nghĩa 4 cụm |
| `docs/reference/reports/BV103-VST-GSC-CAI-TO-PLAN-20260917.md` | Báo cáo này |

→ Vượt ~5 file: **Grok soạn DoD + Neo; Nghĩa «dùng Cursor»** hoặc Grok lát nhỏ P0.1→P0.3 trước.

---

## 5. Trả lời thẳng câu hỏi Nghĩa

| Câu hỏi | Trả lời |
|---------|---------|
| Còn vướng / chồng chéo? | Chủ yếu **UX trộn + chôn**; domain calc đã tách. Nav/ModeNav đã tách tab VST\|GSC. |
| Sao chưa có dữ liệu so sánh đa chiều? | **Có data path**; UI đẩy vào details / «Xem thêm» / collapsed BCTH. Khi matrix rỗng thì do lọc/kỳ/BK TUAN_THU, không do xóa RPC. |
| Mất code / domain đâu? | Cleanup mất **Command Center + decision-queue** (cửa ops), **không** mất compare RPC / moments / top_violations / gap_analysis. |
| Bản chất so sánh? | Đúng: thấp/cao + lỗi hay gặp + biểu dương — hiện chỉ có mảnh rời, chưa thành board hành động trên fold. |
| Tách VST / GSC? | Cần **tách bề mặt báo cáo** (P0); không cần tách repo/module route (đã có). |

---

## 6. Việc Nghĩa chốt trước khi code

1. **Chốt P0** (Action board trên fold + tách VST/GSC) — có làm ngay không?
2. **Ngưỡng mẫu tối thiểu** cho “điển hình” (đề xuất 20 / 30) — chấp nhận hay đổi?
3. BCTH: giữ DimensionCompare collapsed như deep-link, hay bỏ hẳn và chỉ trỏ sang `/thong-ke/*`?



---

## Trạng thái thực hiện (2026-09-17)

**Đã làm (P0 + P1 đã chốt):**

- [x] `supervision-action-board.ts` + spec + `SupervisionActionBoard.tsx` (min-N VST 20 / GSC 30)
- [x] Fold 0 Action board trên `/thong-ke/vst` và `/thong-ke/gsc` (`#so-sanh`); so sánh đa chiều vẫn trong «Xem thêm» / Nâng cao (TGS giữ Nâng cao)
- [x] BCTH: Action board trong `ComprehensiveCompare` (tách VST/GSC) + deep-link; **đã bỏ** bảng Dimension 2 cột
- [x] Metric-dictionary: mục Action board + min-N
- [x] `ComprehensiveDimensionCompare.tsx` đánh dấu `@deprecated` (không xóa file để tránh vỡ import ngoài nếu có)

**Chưa commit** — chờ lệnh Nghĩa.
