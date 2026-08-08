# Metric Dictionary — Giám sát & Dashboard KSNK

> SSOT định nghĩa chỉ số hiển thị. Code: `src/lib/analytics/supervision-metrics/`, `supervision-matrix-mappers.ts`, `bao-cao-tong-hop-core.ts`.

---

## Nguồn dữ liệu thô

| Nguồn | RPC | Phạm vi |
|-------|-----|---------|
| VST | `rpc_dashboard_vst_strategic_analytics` | Cơ hội vệ sinh tay WHO |
| GSC | `rpc_dashboard_gsc_strategic_analytics` | Phiên checklist động |
| NKBV | aggregate action module NKBV | Outcome nhiễm khuẩn — **không** gộp CCS |

App **không** đọc trực tiếp `gstt_fact_*_summary` từ TypeScript cho KPI strategic (ADR 2026-06-03). RPC `rpc_*_strategic_analytics` / compare matrices scan VIEW summary ở lớp DB.

**Hits TGS (bao phủ / BK tôi):** app gọi RPC `rpc_gsc_tgs_session_hits` (không select VIEW summary trực tiếp). RPC scan live VIEW `gstt_fact_gsc_dashboard_summary` ở lớp DB — **không** dùng cho CCS / Command Center KPI.

---

## Chỉ số process (VST + GSC)

### `ty_le_vst` / `ty_le_gsc`

- **Công thức:** `round((đạt / tổng) × 100, 1 chữ số thập phân)`
- **VST mẫu số:** `tong_co_hoi`
- **GSC mẫu số:** `tong_quan_sat`
- **Null khi:** mẫu số = 0

### `ty_le_ccs` (Chỉ số tuân thủ tổng hợp) — **deprecated trên surface điều hành**

- **Công thức (backend giữ field):** `0.5 × ty_le_vst + 0.5 × ty_le_gsc` khi **cả hai** có giá trị
- **Một nguồn:** dùng nguồn duy nhất + ghi chú «Chỉ có dữ liệu VST/GSC»
- **Spec change 2026-07-31:** **không** dùng CCS trên KPI / xu hướng / xếp hạng khoa / Command Center / bản in / draft nhận xét. Điều hành chỉ nhìn **`ty_le_vst`** và **`ty_le_gsc`** (và theo từng chuyên đề/BK khi lọc).
- Field `ty_le_ccs` vẫn có thể được compose trong payload để tương thích contract — **cấm** hiển thị nhãn CCS cho người dùng.
- **Không nhầm với:** `ty_le_avg` (trung bình đơn giản, không trọng số)

### `ty_le_avg`

- TB đơn giản các % có giá trị (VST, GSC)
- Legacy hiển thị phụ — **không** dùng xếp hạng chính thức

---

## KSNK vs TGS vs đối soát

| Khái niệm | Định nghĩa |
|-----------|------------|
| **KSNK** | Giám sát do khoa KSNK thực hiện (`vol_ksnk`, `ty_le_ksnk`) |
| **TGS** | Tự giám sát khoa lâm sàng (`vol_tgs`, `ty_le_tgs`) |
| **Comparable** | `vol_tgs > 0` **và** `vol_ksnk > 0` trong cùng kỳ/lọc |
| **Loại trừ** | «Chưa TGS» / «Chưa KSNK» / «Chưa triển khai» (cả hai = 0) |
| **`do_lech`** | Từ RPC `gap_analysis` — chênh % TGS vs KSNK |

---

## Xu hướng & delta

### Trend tuần → tháng/quý/năm

- Gộp bucket: **cộng** mẫu số/mẫu tử, **không** trung bình % các tuần
- Khóa tuần ISO (Thứ 2) — `isoWeekBucketKey`

### `delta_vst` / `delta_gsc` / `delta_ccs`

- **Không phải** so kỳ lọc trước
- **Là:** chênh % giữa **hai tuần ISO liên tiếp** có dữ liệu trên trendline

### `ky_truoc` (so kỳ lãnh đạo — BCTH, 2026-07-29)

- **Định nghĩa:** cùng độ dài kỳ lọc `[tu_ngay, den_ngay]` dịch lùi liền trước (inclusive calendar days).
- **Hiển thị:** nhãn «vs kỳ trước (dd-mm→dd-mm)» trên KPI BCTH — **tách** khỏi badge «Δ 2 tuần ISO».
- **Nguồn:** gọi lại strategic VST/GSC cho kỳ trước (soft-fail); không đổi công thức CCS.

---

## Ngưỡng cảnh báo (pilot)

| Ngưỡng | Giá trị | Ý nghĩa UI |
|--------|---------|------------|
| `GREEN_MIN` | 85% | Đạt mục tiêu (fallback) |
| `YELLOW_MIN` | 70% | Cần theo dõi |
| `KHOA_WARN_PCT` | 80% | Tô cảnh báo cột/bảng khoa |

SSOT code: `src/lib/analytics/supervision-thresholds.ts`.

### Mục tiêu chuẩn viện (`ksnk_dm_muc_tieu_kpi`) — Spec 2026-07-29

| Trường | Ý nghĩa |
|--------|---------|
| `metric_key` | **Ưu tiên surface:** `ty_le_vst` · `ty_le_gsc`. `ty_le_ccs` **chỉ compat đọc cũ** (không badge / KPI điều hành) |
| `khoa_id` | NULL = toàn viện; UUID = mục tiêu theo khoa (tương lai) |
| `target_pct` | Mục tiêu % (0–100) |

- **Hiển thị:** badge «Mục tiêu viện» + Δ trên KPI BCTH (`ComprehensiveKpiCards`) — **chỉ** VST/GSC; **tách** khỏi Δ 2 tuần ISO / `ky_truoc`.
- **Fallback:** khi bảng chưa migrate / lỗi đọc → `GREEN_MIN`.
- **Không** đổi công thức CCS; mục tiêu chỉ để so sánh lãnh đạo.
- Seed mặc định toàn viện = 85% (có thể còn dòng `ty_le_ccs` trong DB — app **không** surface).

---

## Điều khiển quản trị (Management Control) — Spec 2026-07-29

| Lớp | Định nghĩa | Code |
|-----|------------|------|
| Hàng đợi quyết định ngày | Tối đa 10 dòng derive từ gap comparable · BK yếu · CSSD đỏ/đóng băng · NKBV chờ XN · QLCV quá hạn | `decision-queue.ts` · UI `/` |
| QLCV CC brief | Quá hạn + tóm tắt định kỳ (mẫu bật, đến hạn tuần, phiếu mở tuần, preview sinh) | `getQlcvQuaHanBrief` · `CommandCenterQlcvSection` |
| PDCA metadata | Khi tạo việc từ analytics: `analytics_meta` = `{ chi_so, khoa_id, ky_do_lai, gia_tri_luc_tao }` trên `qlcv_fact_cong_viec` | deep-link + `insertQlcvTaskRow` |
| Can thiệp đang mở | Việc mở có `chi_so`; sau `ky_do_lai` hiện Δ = hiện tại − lúc tạo (cùng khóa chỉ số). UI dùng `labelAnalyticsChiSo` — **không** mono raw key | `CommandCenterOpenInterventions` |
| Định mức nguồn lực | `PHIEN_GS_PER_NV_PER_WEEK` (mặc định 5); cảnh báo dưới định mức trên bảng NV KSNK | `resource-norms.ts` |

### Nhãn cảnh báo CSSD (Management Control)

| Tín hiệu | Định nghĩa | UI |
|----------|------------|-----|
| **Đỏ** (`is_red_alert` / trạm rate sự cố `> 5%`) | Trạm/khoảng có tỷ lệ sự cố vượt ngưỡng banner | Command Center hàng đợi · CSSD report |
| **Đóng băng** | Máy/`trang_thai` bảo trì hoặc quy trình bị khóa vận hành theo domain CSSD (không phải %) | Brief Trụ B/C · report |

### PDCA `chi_so` → nhãn nghiệp vụ

| Key | Nhãn |
|-----|------|
| `ty_le_vst` | Tỷ lệ VST |
| `ty_le_gsc` | Tỷ lệ GSC |
| `ty_le_ccs` | CCS (nội bộ — không surface điều hành) |
| `cssd_red_alert` | Cảnh báo đỏ CSSD |
| `nkbv_cho_xn` | NKBV chờ xác nhận |

**Cấm:** bảng fact summary mới chỉ để phục vụ hàng đợi; gộp NKBV/CSSD vào CCS.

---

## Ba tầng màn hình

| Route | Đối tượng | Số liệu |
|-------|-----------|---------|
| `/` | Điều hành ngày (KSNK / ADMIN / HĐ) | Brief VST+GSC, top gap comparable, tóm tắt 4 trụ |
| `/thong-ke/vst`, `/thong-ke/gsc` | Chuyên viên KSNK; **mạng lưới khoa** (so sánh toàn viện); **khách** (chỉ xem) | **BK-first GSC** · drill tiêu chí × khoa · **so sánh theo khối** (accordion) |
| `/thong-ke/cssd` | Redirect → `/cssd-erp/report` | Cùng SSOT báo cáo vận hành CSSD (tránh hai báo cáo lệch) |
| `/cssd-erp/report` | Trưởng ca CSSD / Chủ nhiệm | Sản lượng · bộ/SUDs · máy · NV CSSD · sự cố |
| `/bao-cao-tong-hop` | BGĐ / HĐ KSNK | Compose + in A4 + phụ lục CSSD + Phần III narrative |

---

## Ma trận so sánh (`rpc_*_compare_matrices`)

Gộp song song vào payload VST/GSC (và detail BK khi lọc 1 BK). Công thức % giống `ty_le_vst` / `ty_le_gsc`; gộp theo chiều, **không** trung bình % con.

| Key | Chiều | Nguồn join |
|-----|-------|------------|
| `matrix_khoi[]` | Khối lâm sàng | `mdm_dm_khoa_phong.khoi_id` → `mdm_dm_khoi_khoa` |
| `matrix_khu_vuc[]` | Chức năng phòng | `khu_vuc_id` → `KHU_VUC_GIAM_SAT` |
| `matrix_nghe[]` | Đối tượng / nghề | VST + GSC (strategic RPC) |
| `matrix_hinh_thuc[]` | Hình thức giám sát | VST: `stype`; GSC: session lookup |
| `matrix_cach_thuc[]` | Cách thức giám sát | GSC (`rpc_gsc_compare_matrices`); VST khi RPC trả về |

---

## Bao phủ TGS (breadth — ngoài CCS)

| Chỉ số | Công thức | Ghi chú |
|--------|-----------|---------|
| `ty_le_bao_phu_tgs` | `|BK bắt TGS đã có ≥1 phiên TGS| / |BK bắt TGS áp dụng cho khoa|` | Distinct BK, không cộng số phiên. Khoa không thuộc phạm vi `ap_dung_jsonb` → **Không áp dụng** (không tính thiếu). |
| Ô khoa × BK | `Đã TGS` / `Thiếu TGS` / `Không áp dụng` | SSOT resolve: `resolveTgsBkCellStatus` · UI xếp hạng: `/thong-ke/gsc` |

---

## CSSD Report — chỉ số vận hành (ngoài CCS)

| Chỉ số | Công thức | Ghi chú / nhãn UI |
|--------|-----------|------------------|
| `ty_le_quy_trinh_khong_su_co` | `100 − (số sự cố / số quy trình) × 100` trong kỳ lọc | Nhãn **「Tỷ lệ quy trình không sự cố」** (không rút «Không sự cố»). **Không** phải CCS |
| `san_luong_cap_phat` | Số lượt có `thoi_gian_cap_phat` ∈ kỳ (toàn viện hoặc theo lọc trạm) | Nhãn **「Sản lượng cấp phát」** — alias UI cũ «Cấp phát kỳ» |
| `so_bo_danh_muc` | `COUNT` bộ dụng cụ active (danh mục) | Snapshot tài sản danh mục — **không** = cấp phát kỳ |
| Trạm tốt nhất / kém nhất | Xếp `rate = incidents/station_volume` ASC/DESC trong kỳ overview | Hero overview CSSD — **error-rate ranking**, ngoài CCS |

Ngưỡng cảnh báo trạm CSSD (banner đỏ): tỷ lệ sự cố/trạm `> 5%` — độc lập với `GREEN_MIN` / `YELLOW_MIN` của giám sát.

**Cấm:** mọi chỉ số CSSD dưới đây **không** vào công thức `ty_le_ccs`.

---

## Bốn trụ quản trị (Command Center + BCTH)

| Trụ | Phạm vi | Màn chuyên sâu | Tín hiệu mỏng trên `/` |
|-----|---------|----------------|-------------------------|
| **A — Tuân thủ** | VST / GSC / gap TGS–KSNK (**không** nhãn CCS surface) | `/thong-ke/vst`, `/thong-ke/gsc` | Brief **VST% · GSC%** |
| **B — CSSD & dụng cụ** | Sản lượng, sự cố, bộ, máy | `/cssd-erp/report` · mirror `/thong-ke/cssd` | Đỏ / đóng băng / sản lượng cấp phát |
| **C — Nguồn lực** | NV giám sát + NV CSSD; sẵn sàng máy | Tab Nhân sự / Thiết bị trên report CSSD; bảng NV KSNK trên `/` | Workload NV + máy READY/REPAIRING |
| **D — Kết cục & cải tiến** | NKBV outcome; QLCV | `/giam-sat-nkbv`, QLCV | Hero = **chờ XN** (đếm). CLABSI/CAUTI /1000 chỉ trong narrative khi có mẫu số CVC/Foley-day — **cấm** abbrev `/1k` không mẫu số. **Không** vào CCS |

### NKBV — chỉ số bổ sung (ngoài CCS)

| Chỉ số | Công thức | Ghi chú |
|--------|-----------|---------|
| `ti_le_xac_nhan_nkbv` | `round((da_xac_nhan / max(PA − loại_trừ, 0)) × 100)` khi mẫu số > 0; else null | Code field: `ti_le_xac_nhan_so_voi_pa` trên payload dashboard NKBV / BCTH |
| `clabsi_rate_per_1000` | `(obs_clabsi_cases / obs_cvc_days) × 1000` khi `obs_cvc_days > 0` | **Ẩn Trụ D hero** nếu thiếu mẫu số; không bịa Rate |

### Câu mô tả trụ (thống kê mô tả — 2026-07-29)

Mỗi trụ trên `/` hiển thị theo mẫu cố định (không đổi công thức KPI):

1. **Giá trị** — số / % chính của trụ  
2. **Câu mô tả** — 1 dòng tiếng Việt (trạng thái kỳ lọc)  
3. **Vì sao** — tối đa 3 nguyên nhân / tín hiệu phụ  
4. **CTA** — deep-link màn chuyên sâu (không tự tạo việc trừ khi pha cầu QLCV)

Trụ C tách nhãn: **NV KSNK / phiên giám sát** vs **máy CSSD / NV CSSD** (không gộp một link mơ hồ).  
Chương trình: [`descriptive-analytics-roadmap-20260729.md`](descriptive-analytics-roadmap-20260729.md).

Phụ lục CSSD trên `/bao-cao-tong-hop` (mục `bc-cssd`) — **sau NKBV, trước Phần III** — chỉ tóm tắt vận hành, không đổi CCS.

---

## CSSD Analytics — sản lượng & tài sản (Spec 2026-07-29)

Code thuần: `src/lib/analytics/cssd-metrics/`. UI: `/cssd-erp/report` (tabs) · deep-link `/thong-ke/cssd`.

### Trạm & cột thời gian (SSOT)

| Mã trạm | Cột hoàn thành trên `cssd_fact_quy_trinh` / view |
|---------|--------------------------------------------------|
| `TIEP_NHAN` | `thoi_gian_tiep_nhan` |
| `LAM_SACH` | `thoi_gian_lam_sach` |
| `QC` | `thoi_gian_qc` |
| `DONG_GOI` | `thoi_gian_dong_goi` |
| `TIET_KHUAN` | `thoi_gian_tiet_khuan` |
| `CAP_PHAT` | `thoi_gian_cap_phat` |

### `san_luong_tram` (hoàn thành trong kỳ)

- **Định nghĩa:** số bản ghi quy trình có `thoi_gian_<tram>` ∈ `[from, to]` (ngày lọc inclusive).
- **Không** dùng snapshot `trang_thai_hien_tai` / tồn trạm hiện tại (chart OVERVIEW cũ vẫn có thể hiện tồn — nhãn rõ «tồn hiện tại»).
- Bucket ngày / tháng / năm: khóa theo timestamp trạm (`YYYY-MM-DD` / `YYYY-MM` / `YYYY`).

### `so_bo_theo_khoa`

- Đếm `cssd_dm_bo_dung_cu` active theo `khoa_su_dung_id` → `ten_khoa` (NULL = **Dùng chung**).
- Đây là **khoa sở hữu danh mục** (snapshot tài sản danh mục) — tách khỏi cấp phát destination.

### `cap_phat_theo_khoa_nhan` (SSOT destination — 2026-07-29)

- Đếm lượt quy trình có `thoi_gian_cap_phat` ∈ kỳ theo `cssd_fact_quy_trinh.khoa_nhan_id` → `ten_khoa_nhan`.
- Ghi khi quét CAP_PHAT (payload hoặc bootstrap từ khoa sở hữu bộ).
- UI: tab Bộ trên `/cssd-erp/report` — bảng «Cấp phát theo khoa nhận»; không trộn với `so_bo_theo_khoa`.
- Code: `computeCapPhatByKhoaNhan` / `describeCssdCapPhatByKhoaNhan`.

### `tan_suat` / tái sử dụng

| Chỉ số | Công thức |
|--------|------------|
| `chu_trinh_ky` | Số quy trình (active) có `created_at` hoặc `thoi_gian_tiep_nhan` trong kỳ, theo `bo_dung_cu_id` |
| `suds_hien_tai` | `suds_count` trên chu trình active mới nhất của bộ (từ fact) |
| Top tái sử dụng | Xếp theo `suds_hien_tai` DESC hoặc `chu_trinh_ky` DESC |

### Máy / mẻ / bảo trì

| Chỉ số | Công thức |
|--------|------------|
| `so_me_ky` | `COUNT(cssd_fact_lo_tiet_khuan)` trong kỳ (theo `thoi_gian_bat_dau` hoặc `created_at`) |
| `ty_le_qc_dat_me` | `(mẻ ket_qua_test = true) / (mẻ đã có ket_qua_test)` × 100; null nếu mẫu số 0 |
| `so_lan_dung_may` | Số mẻ theo `thiet_bi_id` trong kỳ |
| `may_ready` / `may_repairing` | Đếm `cssd_dm_thiet_bi` theo `trang_thai` (`READY`/`HOAT_DONG` vs `REPAIRING`/`BAO_TRI`) |
| `phieu_bao_tri_mo` | Phiếu `cssd_fact_bao_tri` trạng thái `DANG_THUC_HIEN` |

### NV CSSD (năng suất quét)

| Chỉ số | Công thức |
|--------|------------|
| `so_quet_tram` | Với mỗi cặp (người, trạm): đếm quy trình có `nguoi_<tram>_id` = người **và** `thoi_gian_<tram>` trong kỳ |

Ánh xạ người: `nguoi_tiep_nhan_id` … `nguoi_cap_phat_id` (`nguoi_kiem_tra_id` = QC).

---

## Năng suất nhân sự giám sát (Trụ C — mặt giám sát)

| Chỉ số | Nguồn | Ghi chú |
|--------|-------|--------|
| `so_co_hoi_vst` | RPC staff overview / Command Center | Cơ hội VST do NV KSNK ghi trong kỳ lọc |
| `so_phien_vst` | cùng | Số phiên VST |
| `so_phien_gsc` | cùng | Số phiên GSC |

Hiển thị: bảng NV Khoa KSNK trên `/` (lazy). **Không** gộp với `so_quet_tram` CSSD thành một «hiệu suất chung».

---

## GSC — analytics theo bảng kiểm (Wave 3 → VST pattern)

| Khái niệm | Nguồn | Ý nghĩa |
|-----------|-------|---------|
| `checklist_overview[]` | `rpc_dashboard_gsc_strategic_analytics` | Một dòng/BK có phiên: % tuân thủ, vi phạm, lỗi nổi bật, khoa yếu nhất |
| `rpc_gsc_checklist_detail` | Lazy khi chọn BK (`?bk=`) | KPI · trend · gap TGS/KSNK · `matrix_criterion[]` (mọi tiêu chí áp dụng) · `criterion_khoa[]` (drill khoa) |
| `rpc_gsc_compare_matrices` | Gộp vào strategic + detail BK | **Khối** · chức năng phòng · đối tượng · hình thức · cách thức (accordion) |
| Xếp hạng rủi ro | App `sortChecklistOverviewByRisk` / `sortCriterionMatrix` | BK và tiêu chí: tuân thủ ASC · vi phạm DESC — **không đổi CCS** |
