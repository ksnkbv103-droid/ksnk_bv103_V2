# Rà soát UX / nghiệp vụ — toàn bộ Dashboard BV103

> **Ngày:** 2026-07-17  
> **Loại:** Báo cáo đánh giá + **đã triển khai** P0/P1/P2 (không đổi công thức CCS)  
> **SSOT công thức:** [`metric-dictionary.md`](metric-dictionary.md) · Skill `@dashboard-pilot`  
> **Backlog intake:** [`intake-cssd-report-metric-20260717.md`](intake-cssd-report-metric-20260717.md) · [`intake-analytics-chrome-unify-20260717.md`](intake-analytics-chrome-unify-20260717.md) · [`intake-nkbv-dashboard-filter-deeplink-20260717.md`](intake-nkbv-dashboard-filter-deeplink-20260717.md)

---

## 1. Phạm vi đã khảo sát

Kiến trúc analytics (reform 2026-06) theo 3 tầng:

| Tầng | Màn hình | Route | Vai trò |
|------|----------|-------|---------|
| Điều hành | Trung tâm điều hành | `/` | Nhìn nhanh VST/GSC + gap + QLCV |
| Chuyên đề | Thống kê VST | `/thong-ke/vst` | Phân tích tuân thủ rửa tay |
| Chuyên đề | Thống kê GSC (+ drill BK) | `/thong-ke/gsc` | Phân tích bảng kiểm + vi phạm |
| Báo cáo | Báo cáo tổng hợp KSNK | `/bao-cao-tong-hop` | Báo cáo chính thức + CCS + in A4 |
| Module | NKBV — tab Thống kê | `/giam-sat-nkbv` (tab dashboard) | Outcome nhiễm khuẩn / dịch tễ |
| Module | Báo cáo CSSD | `/cssd-erp/report` | Sự cố & chỉ số trạm |
| Ops | Kho + Bản đồ 6 trạm | `/cssd-quy-trinh` | Vận hành realtime |
| Ops | QLCV cổng thống kê | `/quan-ly-cong-viec` | Đếm việc / lọc board |

---

## 2. Xếp hạng tổng hợp (thang /10)

| Hạng | Dashboard | Điểm | Nhận xét 1 câu |
|------|-----------|------|----------------|
| 1 (mạnh) | **D. Báo cáo tổng hợp** | **8.7** | Chuẩn BI bệnh viện: CCS, comparable, in A4, gom VST+GSC+NKBV |
| 2 | **C. Thống kê GSC** | **8.3** | Drill bảng kiểm sâu nhất; top vi phạm rõ |
| 3 | **B. Thống kê VST** | **7.8** | Khoa học vững (WHO moments, gap khoa); chrome lệch CC |
| 4 | **A. Command Center** | **7.5** | “Nhìn là ra vấn đề” tốt; thiếu chart/NKBV/CSSD |
| 5–6 | **E. NKBV** · **G. CSSD ops** | **6.5** | Có số liệu nhưng chưa cùng ngôn ngữ BI |
| 7 | **F. CSSD Report** | **6.0** | Trực quan ổn; **metric “tuân thủ” dễ hiểu nhầm** |
| 8 (yếu) | **H. QLCV gate** | **5.5** | Đúng vai trò ops filter — không phải dashboard KSNK |

---

## 3. Ma trận 10 tiêu chí (1–5)

| Tiêu chí | A CC | B VST | C GSC | D BCTH | E NKBV | F CSSD | G Kho/Flow | H QLCV |
|----------|------|-------|-------|--------|--------|--------|------------|--------|
| Hiển thị | 4 | 4 | 4 | **5** | 3 | 3 | 4 | 4 |
| Linh hoạt | **5** | **5** | **5** | **5** | 2 | 3 | 3 | 3 |
| Khoa học | 4 | **5** | **5** | **5** | 4 | **2** | 3 | 3 |
| Trực quan sinh động | 3 | 4 | 4 | 4 | 4 | 4 | 4 | 2 |
| Bao phủ vấn đề | 3 | 3 | 4 | 4 | **5** | 3 | 2 | 1 |
| Tổng hợp | 3 | 2 | 3 | **5** | 2 | 2 | 1 | 1 |
| Nhìn vào là ra vấn đề | **5** | 4 | **5** | 4 | 3 | 4 | **5** | **5** |
| Thông minh | 4 | 3 | 4 | 4 | 3 | 3 | 2 | 3 |
| Chuyên nghiệp | 4 | 4 | 4 | **5** | 3 | 3 | 3 | 3 |
| Đẹp / cân đối | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 4 |

---

## 4. Nhận định theo nhóm tiêu chí

### 4.1 Hiển thị & linh hoạt

- **Mạnh:** Lọc kỳ/khoa/khối/nghề dùng chung `AnalyticsFilterBar` trên CC, VST, GSC, BCTH; deep link giữ bộ lọc tốt.
- **Yếu:** NKBV tab Thống kê chỉ lộ rõ lọc ngày trong panel (khoa lấy từ header trang, dễ bỏ sót); CSSD Report chỉ ngày + trạm; Thống kê VST/GSC dùng `KsnkSupervisionPanel` thay vì `Bv103AnalyticsPageFrame` → cảm giác “hai hệ thống”.

### 4.2 Khoa học

- **Mạnh:** Process (VST/GSC/CCS) tách outcome (NKBV); comparable TGS↔KSNK; RPC strategic — đúng invariant `@dashboard-pilot`.
- **Rủi ro lớn:** CSSD Report tính “Tỷ lệ tuân thủ” ≈ `100 − (sự cố / số quy trình)` phía client (`CSSDReportPage.tsx`) — dễ nhầm với CCS / tuân thủ giám sát.

### 4.3 Trực quan sinh động

- Recharts + traffic light + banner đỏ CSSD khá tốt.
- Command Center cố ý “thin” → ít chart; nhiều KPI phụ nằm trong `<details>` → giảm “wow” nhưng tăng tốc load.

### 4.4 Bao phủ & tổng hợp

- **Flagship tổng hợp = BCTH** (VST+GSC+BK can thiệp+NKBV).
- **Lỗ hổng hệ thống:** Không có một màn “điều hành toàn viện” gom thêm CSSD + QLCV trên cùng khung; CSSD/QLCV sống riêng.

### 4.5 Nhìn ra vấn đề & thông minh

- **Tốt nhất “glance”:** CC (gap top 3), GSC (BK risk-sorted), CSSD flow (Đỏ/Khóa), QLCV quá hạn.
- **Chưa đủ thông minh:** Phần III BCTH vẫn nhập tay; ít ranking/recommendation tự động; chưa tạo việc QLCV từ ô thiếu bao phủ (đã ghi nhận hoãn).

### 4.6 Chuyên nghiệp / đẹp

- BCTH đạt mức báo cáo lãnh đạo.
- NKBV / CSSD Report dùng visual riêng → lệch brand BI còn lại; dễ cảm giác “app ghép module”.

---

## 5. Backlog ưu tiên (đã có intake riêng)

Mỗi mục = 1 chat `/intake-nv` → duyệt → `/implement`. Không làm đồng thời 8 dashboard.

| Ưu tiên | Mục | Trạng thái |
|---------|-----|------------|
| **P0** | Chuẩn hóa metric CSSD Report | **Done** — nhãn «Tỷ lệ quy trình không sự cố» + metric-dictionary |
| **P1** | Chrome VST/GSC → `Bv103AnalyticsPageFrame` | **Done** |
| **P1** | NKBV filter khoa + deep link + chú thích SIR/DUR | **Done** |
| **P2** | Command Center toàn viện (NKBV chờ XN / CSSD đỏ) | **Done** — `CommandCenterCrossModuleBrief` |
| **P2** | Insight tự động nhẹ (≤3 gợi ý) | **Done** — `command-center-insights.ts` |
| **P3** | Bao phủ TGS «Không áp dụng» vs «Thiếu»; RPC hits; QLCV deep-link; chrome NKBV | **Done** (2026-07-17) — xếp hạng `/thong-ke/gsc` + `rpc_gsc_tgs_session_hits` |

---

## 6. File / route tham chiếu nhanh

| Surface | View chính |
|---------|------------|
| CC | `src/modules/dashboard/views/command-center-dashboard-page.tsx` |
| VST | `src/modules/giam-sat-vst/views/VSTAnalyticsView.tsx` |
| GSC | `src/modules/giam-sat-chung/views/GscAnalyticsView.tsx` |
| BCTH | `src/modules/dashboard/views/bao-cao-tong-hop-page.tsx` |
| NKBV | `src/modules/giam-sat-nkbv/components/NkbvDashboardPanel.tsx` |
| CSSD Report | `src/modules/cssd-erp/views/CSSDReportPage.tsx` · `ReportDashboard.tsx` |
| Kho / Flow | `InventoryDashboard.tsx` · `CssdStationFlowMap.tsx` |
| QLCV | `QlcvGateStats.tsx` · `CommandCenterQlcvSection.tsx` |
