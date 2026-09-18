> ⚠️ **SUPERSEDED (2026-09-17)** — Không dùng làm plan đang hiệu lực.  
> **Plan hiệu lực:** [`BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md`](./BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md) (+ rà rối [`BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md`](./BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md)).  
> File này giữ lịch sử.

# Chẩn đoán: Giám sát tuân thủ — vì sao «đơn giản» mà mãi chưa xong?

> 2026-09-17 · Bổ sung cho `BV103-GSC-DE-CUONG-20260917.md` · Không commit trong lát này.

## 1. Nghiệp vụ đúng (đúng như Nghĩa mô tả)

```text
Chọn bảng kiểm → điền header + tiêu chí → Lưu
→ Lọc theo khối / khoa / khu vực / đối tượng / thời gian
→ Xem % + biểu đồ xu hướng (+ in phiếu đã lưu)
```

Đó là **MVP đủ dùng**. Mọi thứ ngoài vòng này là lớp thêm.

## 2. Thực tế code hôm nay (đã có gì?)

| Việc «đơn giản» | Trạng thái kỹ thuật | Chỗ dùng |
|-----------------|---------------------|----------|
| Form GSC chọn mẫu + chấm + Lưu | **Có** (snapshot BK-1, khóa sổ, offline pending) | `/giam-sat-chung…` |
| Form VST 5 thời điểm WHO + Lưu | **Có** (≤3 đối tượng/phiên) | `/giam-sat-vst` |
| Lịch sử + mở sửa + in phiếu | **Có** (in đủ + mẫu trống; QR phiên GSC) | `/lich-su/gsc`, `/lich-su/vst` |
| Lọc thống kê thời gian / khối / khoa / khu vực / nghề / bảng kiểm | **Có** (`use-analytics-filters`) | `/thong-ke/gsc`, `/thong-ke/vst` |
| Biểu đồ xu hướng + KPI + so sánh | **Có** (`SupervisionTrendChart`, matrix khối/khu vực/đối tượng…) | cùng trang thống kê + RPC strategic |
| Drill 1 bảng kiểm → tiêu chí yếu × khoa | **Có** (`GscBkAnalyticsDashboard` + `rpc_gsc_checklist_detail`) | `?bk=` |
| Export Excel phiên GSC | **Có** (`exportGscSessionsRaw`) | action export |
| In «báo cáo tổng hợp» kiểu BM giấy gửi Trưởng khoa | **Chưa / mỏng** | Thống kê = màn hình + chart; không có template báo cáo định kỳ riêng |
| Điểm nguy cơ P×I×S | **Chưa** (có feasibility, đúng chỗ hoãn) | — |
| Nội dung 36 mẫu «chuẩn mực lâm sàng 100%» | **Chưa đóng** | Cần UAT Khoa — không phải thiếu form |

**Kết luận kỹ thuật:** vòng «nhập → lưu → lọc → xu hướng» **đã dựng**. Cảm giác «mãi không xong» chủ yếu **không** vì thiếu form/lưu.

## 3. Vì sao vẫn rối? (nguyên nhân gốc)

### 3.1 Phạm vi phình (scope creep) — nguyên nhân lớn nhất

Trên cùng module đã chồng thêm nhiều «sản phẩm phụ»:

- 3 cổng GSC (`TUAN_THU` / nhật ký / hệ thống) + VST riêng  
- Snapshot + guard mẫu tắt + khóa sổ theo ngày + offline  
- Analytics «strategic»: gap TGS–KSNK, xếp hạng «BK tôi phải tự giám sát», matrix đa chiều, drill tiêu chí  
- Spec đổi liên tục: 51→36, DROP EAV, DROP Phần 3–4 RCA, bỏ Excel, bỏ nhãn CCS trên điều hành  

Mỗi lớp đều có lý do; **cộng lại** làm module trông như chưa bao giờ «xong», dù MVP đã chạy.

**Độ nặng code (ước lượng local):** ~130 file TS/TSX trong `giam-sat-chung` + `giam-sat-vst`; ~13k dòng; hook form GSC một file ~655 dòng; `ChecklistItem` ~430 dòng.

### 3.2 Hai chuẩn «xong» đang đánh nhau

| Chuẩn A — vận hành đơn giản (Nghĩa) | Chuẩn B — hệ sinh thái IPAC (docs cũ / panel strategic) |
|-------------------------------------|--------------------------------------------------------|
| Phiếu + % + lọc + trend | Heatmap, Pareto, RCA, P×I×S, TGS coverage, PDCA… |
| UAT tay vài phiếu | «Chuẩn mực 100%» 36 mẫu + ma trận nguy cơ năm |

Team (và docs như `giamsattuanthu.md`) thường kéo về **chuẩn B** trong khi Khoa cần **chuẩn A** trước. Kết quả: cứ thêm tính năng / refactor, không bao giờ tuyên bố Done.

### 3.3 Docs lệch code

- `giamsattuanthu.md` còn mô tả EAV / Phần 3–4 / ticket → đã gắn ARCHIVE (2026-09-17).  
- `master-*.md` còn mã 51-era → LEGACY.  
Đọc nhầm các file này sẽ tưởng app «thiếu nửa hệ thống».

### 3.4 «Chưa xong» về nội dung ≠ «chưa xong» về phần mềm

Engine chấm % và snapshot đã khoa học theo spec repo (`giam-sat-scoring`, metric-dictionary: `ty_le_gsc` / `ty_le_vst` tách, không CCS trên điều hành).  
**Chưa khoa học lâm sàng** là **câu chữ tiêu chí** trên 36 mẫu — việc của UAT Khoa, không sửa bằng thêm panel.

## 4. Thừa / thiếu (rõ ràng)

### Thừa (đừng mở rộng thêm trước khi đóng MVP)

1. Thêm panel strategic / TGS / PDCA / P×I×S trên đường «cho xong form».  
2. Tái dựng Phần 3–4 / RCA trên form.  
3. Gộp VST vào GSC hoặc ngược lại.  
4. Seed lại >36 mẫu / đụng master legacy.

### Thiếu thật (so với mô tả đơn giản của Nghĩa)

1. **Đóng gói sản phẩm:** checklist UAT tay G1–V3 + chữ «MVP giám sát tuân thủ = Done».  
2. **UAT nội dung** nhóm ưu tiên (VST tay, PPE, bundle…).  
3. (Tuỳ chọn) **Mẫu in báo cáo kỳ** (1 trang PDF/HTML từ filter thống kê) — chỉ nếu Ban yêu cầu giấy; không chặn Done MVP.  
4. (Tuỳ chọn) Ẩn/gom UI «TGS / strategic phụ» khỏi màn mặc định để GSV chỉ thấy Form | Lịch sử | Thống kê đơn giản.

### Không thiếu

Form, lưu, lịch sử, in phiếu, lọc khối/khoa/khu vực/thời gian/đối tượng(nghề), trend chart, export phiên.

## 5. Khoa học / chuẩn mực — đánh giá thẳng

| Lớp | Đánh giá |
|-----|----------|
| Mô hình dữ liệu phiên (JSONB + snapshot) | **Đúng hướng**, ổn định hơn EAV |
| Công thức % tuân thủ phiên | **Đúng spec** (DAT/(DAT+KĐ); NA ngoài mẫu số) |
| VST opportunity WHO | **Đúng domain** (không bắt đủ 5 mốc / 1 cơ hội) |
| Analytics RPC + filter | **Đủ** cho lọc đa chiều + xu hướng |
| Nội dung tiêu chí vs QT Khoa | **Chưa khẳng định** — cần UAT |
| Báo cáo giấy định kỳ Ban | **Chưa** (nếu coi là bắt buộc nghiệp vụ) |

## 6. Biện pháp hợp lý nhất (để «xong»)

**Đóng phạm vi MVP trong 1 câu (đề xuất chốt):**

> Giám sát tuân thủ xong khi: GSV tạo/sửa/in được phiếu VST + GSC tuân thủ; lọc thống kê theo kỳ–khối–khoa–khu vực–đối tượng; thấy % và xu hướng; pilot G1–V3 PASS; không còn yêu cầu tính năng mới trước UAT nội dung.

**Thứ tự làm**

1. **P0 — Tuyên bố Done kỹ thuật MVP** sau khi Nghĩa chạy pilot checklist (`docs/modules/giam-sat/pilot-checklist-202606.md`).  
2. **P0 — UI tối giản (tuỳ chọn):** trang thống kê mặc định = KPI + trend + bảng theo khoa; panel TGS/strategic xếp dưới hoặc tab «Nâng cao».  
3. **P1 — UAT nội dung** 1 nhóm mẫu / tuần.  
4. **P2 —** Chỉ khi Ban cần: in báo cáo kỳ; rồi mới P×I×S.

**Cấm trong 2 tuần tới (để không trượt lại):** refactor form lớn, thêm RPC mới, dựng lại RCA, đổi scoring phiên.

## 7. Trả lời câu «sao mãi không xong?»

Vì dự án **đã làm xong vòng đơn giản từ lâu**, rồi **tiếp tục mở rộng** (analytics chiến lược, TGS, khóa sổ, snapshot, 3 loại GSC, đổi spec liên tục) và **chưa bao giờ khóa định nghĩa Done** khớp nghiệp vụ đơn giản.  
Không phải vì «nhập bảng kiểm» khó — mà vì **đích luôn bị kéo xa hơn điểm đến**.
