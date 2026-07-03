# Metric Dictionary — Giám sát & Dashboard KSNK

> SSOT định nghĩa chỉ số hiển thị. Code: `src/lib/analytics/supervision-metrics/`, `supervision-matrix-mappers.ts`, `bao-cao-tong-hop-core.ts`.

---

## Nguồn dữ liệu thô

| Nguồn | RPC | Phạm vi |
|-------|-----|---------|
| VST | `rpc_dashboard_vst_strategic_analytics` | Cơ hội vệ sinh tay WHO |
| GSC | `rpc_dashboard_gsc_strategic_analytics` | Phiên checklist động |
| NKBV | aggregate action module NKBV | Outcome nhiễm khuẩn — **không** gộp CCS |

App **không** đọc trực tiếp `gstt_fact_*_summary` (ADR 2026-06-03).

---

## Chỉ số process (VST + GSC)

### `ty_le_vst` / `ty_le_gsc`

- **Công thức:** `round((đạt / tổng) × 100, 1 chữ số thập phân)`
- **VST mẫu số:** `tong_co_hoi`
- **GSC mẫu số:** `tong_quan_sat`
- **Null khi:** mẫu số = 0

### `ty_le_ccs` (Chỉ số tuân thủ tổng hợp)

- **Công thức:** `0.5 × ty_le_vst + 0.5 × ty_le_gsc` khi **cả hai** có giá trị
- **Một nguồn:** dùng nguồn duy nhất + ghi chú «Chỉ có dữ liệu VST/GSC»
- **Dùng cho:** xếp hạng khoa (`khoa_rank`), KPI báo cáo tổng hợp
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

- **Không phải** so kỳ lọc trước (QoQ — Wave 4)
- **Là:** chênh % giữa **hai tuần ISO liên tiếp** có dữ liệu trên trendline

---

## Ngưỡng cảnh báo (pilot)

| Ngưỡng | Giá trị | Ý nghĩa UI |
|--------|---------|------------|
| `GREEN_MIN` | 85% | Đạt mục tiêu |
| `YELLOW_MIN` | 70% | Cần theo dõi |
| `KHOA_WARN_PCT` | 80% | Tô cảnh báo cột/bảng khoa |

SSOT code: `src/lib/analytics/supervision-thresholds.ts`.

---

## Ba tầng màn hình

| Route | Đối tượng | Số liệu |
|-------|-----------|---------|
| `/` | Điều hành ngày | Brief VST+GSC, top gap comparable |
| `/thong-ke/vst`, `/thong-ke/gsc` | Chuyên viên KSNK / khoa | **BK-first GSC** · drill tiêu chí × khoa · **so sánh theo khối** (accordion) |
| `/bao-cao-tong-hop` | BGĐ / HĐ KSNK | Compose + in A4 + Phần III narrative |

---

## Ma trận so sánh (`rpc_*_compare_matrices`)

Gộp song song vào payload VST/GSC (và detail BK khi lọc 1 BK). Công thức % giống `ty_le_vst` / `ty_le_gsc`; gộp theo chiều, **không** trung bình % con.

| Key | Chiều | Nguồn join |
|-----|-------|------------|
| `matrix_khoi[]` | Khối lâm sàng | `mdm_dm_khoa_phong.khoi_id` → `mdm_dm_khoi_khoa` |
| `matrix_khu_vuc_nhom[]` | Vùng IPAC 4 màu | `sys_lookup_value.metadata.nhom_mau` |
| `matrix_khu_vuc[]` | Khu vực chi tiết | `khu_vuc_id` |
| `matrix_nghe[]` | Đối tượng / nghề | GSC only |
| `matrix_hinh_thuc[]` | Hình thức giám sát | VST: `stype`; GSC: session lookup |
| `matrix_cach_thuc[]` | Cách thức giám sát | GSC only |

---

## GSC — analytics theo bảng kiểm (Wave 3 → VST pattern)

| Khái niệm | Nguồn | Ý nghĩa |
|-----------|-------|---------|
| `checklist_overview[]` | `rpc_dashboard_gsc_strategic_analytics` | Một dòng/BK có phiên: % tuân thủ, vi phạm, lỗi nổi bật, khoa yếu nhất |
| `rpc_gsc_checklist_detail` | Lazy khi chọn BK (`?bk=`) | KPI · trend · gap TGS/KSNK · `matrix_criterion[]` (mọi tiêu chí áp dụng) · `criterion_khoa[]` (drill khoa) |
| `rpc_gsc_compare_matrices` | Gộp vào strategic + detail BK | **Khối** · IPAC · khu vực · đối tượng · hình thức · cách thức (accordion) |
| Xếp hạng rủi ro | App `sortChecklistOverviewByRisk` / `sortCriterionMatrix` | BK và tiêu chí: tuân thủ ASC · vi phạm DESC — **không đổi CCS** |
