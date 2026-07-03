# Cải tổ Analytics & Dashboard KSNK — Báo cáo reform 2026-06

> **Trạng thái:** Đã triển khai (2026-06-17)  
> **Verify:** `vitest` 51 pass · `verify:engineering` pass

---

## Tóm tắt điều hành

Trước reform, module dashboard/analytics **đúng nghiệp vụ** (Wave 1–2) nhưng **sai kiến trúc triển khai**: logic rải 4 lớp, UI monolith 1.671 dòng, dead code compliance v4, 5 cửa vào analytics GSC.

Reform này **không đổi công thức CCS, comparable, thứ tự báo cáo** — chỉ **gom và làm sạch** để một người mới đọc code hiểu được luồng trong 15 phút.

---

## Mô hình mục tiêu

```
Postgres RPC strategic (VST + GSC + NKBV)
        ↓
src/lib/analytics/supervision-metrics/   ← công thức thuần + spec
src/lib/analytics/supervision-matrix-mappers.ts
        ↓
3 tầng UI (cùng component, khác profile)
  /              Command Center — thin
  /thong-ke/*    Phân tích chuyên đề
  /bao-cao-tong-hop   Báo cáo chính thức
```

---

## Các bước reform (thứ tự thực hiện)

### Bước 1 — Báo cáo & Metric Dictionary

| | |
|---|---|
| **Mục đích** | Tạo «sổ tay» chung — ai cũng hiểu cùng một định nghĩa số. |
| **Ý nghĩa** | Tránh nhầm `ty_le_ccs` vs `ty_le_avg`, `delta` vs `do_lech`, comparable vs mọi khoa có 1 nguồn. |
| **File** | Doc này + [`metric-dictionary.md`](./metric-dictionary.md) |
| **Verify** | Review tay 3 case: chỉ KSNK · comparable · 0 phiên |

---

### Bước 2 — SSOT ngưỡng (`supervision-thresholds.ts`)

| | |
|---|---|
| **Mục đích** | Gộp `BAO_CAO_TONG_HOP_THRESHOLDS` và `KHOA_COMPLIANCE_WARN_PCT` về một file. |
| **Ý nghĩa** | Một nơi đổi ngưỡng 85/70/80 — chart, bảng, in báo cáo cùng màu cảnh báo. |
| **File** | `src/lib/analytics/supervision-thresholds.ts` |
| **Verify** | `grep` không còn magic number 80/85 rải rác ngoài SSOT |

---

### Bước 3 — Domain layer thuần (`supervision-metrics/`)

| | |
|---|---|
| **Mục đích** | Tách `computeCcs`, `rateFromTotals`, trend bucket khỏi `bao-cao-tong-hop-core.ts`. |
| **Ý nghĩa** | Công thức KPI có spec Vitest riêng — UI chỉ hiển thị, không tính lại. |
| **File** | `src/lib/analytics/supervision-metrics/formulas.ts` |
| **Verify** | `bao-cao-tong-hop-core.spec.ts` pass (re-export tương thích) |

---

### Bước 4 — Gộp gap VST+GSC (`mergeMasterGapRows`)

| | |
|---|---|
| **Mục đích** | Xóa logic merge thủ công trong `ComprehensiveCompare.tsx`. |
| **Ý nghĩa** | Báo cáo tổng hợp và mapper dùng **cùng một hàm** — không drift khi sửa. |
| **File** | `supervision-matrix-mappers.ts` + spec |
| **Verify** | Vitest case merge 2 nguồn |

---

### Bước 5 — Dọn dead code compliance v4

| | |
|---|---|
| **Mục đích** | Xóa action + UI + types không được import (`GscComplianceDashboardLayout`, …). |
| **Ý nghĩa** | Giảm «cửa KPI ảo» — dev không đoán app đọc RPC v4 hay strategic. |
| **Ghi chú** | RPC `rpc_get_compliance_dashboard_v4` **giữ trong DB** (contract migration); chỉ xóa app dead path. |
| **Verify** | `grep DashboardV4` trong `src/` = 0 |

---

### Bước 6 — Tách UI monolith charts

| | |
|---|---|
| **Mục đích** | Chia `supervision-analytics-charts.tsx` (~1.671 dòng) thành module nhỏ. |
| **Ý nghĩa** | Mỗi file một trách nhiệm — khoa / trend / compare / shared — dễ review PR. |
| **Cấu trúc** | `supervision-charts-shared.tsx`, `supervision-charts-khoa.tsx`, barrel `supervision-analytics-charts.tsx` |
| **Verify** | Import path cũ không đổi (barrel re-export) |

---

### Bước 7 — Navigation canonical

| | |
|---|---|
| **Mục đích** | Redirect `/giam-sat-chung/*/thong-ke` → `/thong-ke/gsc?loai=…` |
| **Ý nghĩa** | Một URL analytics GSC; bookmark cũ vẫn hoạt động. |
| **File** | `next.config.ts`, `GscAnalyticsView` đọc `loai` từ URL |
| **Verify** | E2E `gsc-vst-supervision.spec.ts` |

---

### Bước 8 — Verify tổng

```bash
npx vitest run src/lib/analytics src/modules/dashboard/lib/bao-cao-tong-hop-core.spec.ts
npm run verify:engineering
```

---

## Metric Dictionary (rút gọn)

| Metric | Công thức | Dùng để |
|--------|-----------|---------|
| `ty_le_vst` / `ty_le_gsc` | đạt/tổng × 100 (1 chữ số thập phân) | KPI, trend |
| `ty_le_ccs` | 50% VST + 50% GSC; thiếu 1 nguồn → nguồn còn lại | Xếp hạng, KPI BC |
| `ty_le_avg` | TB đơn giản 2 % | Hiển thị phụ — **không** thay CCS |
| `comparable` | `vol_tgs > 0 ∧ vol_ksnk > 0` | Chart đối soát |
| `do_lech` | từ RPC `gap_analysis` | Δ TGS vs KSNK |
| `delta_*` | tuần ISO cuối − tuần liền trước | Badge KPI |

Chi tiết: [`metric-dictionary.md`](./metric-dictionary.md).

---

## UX slice A–E (2026-06-17)

| Slice | Route | Thay đổi UI |
|-------|-------|-------------|
| **A** | `/bao-cao-tong-hop` | 2 dashboard VST/GSC · mỗi module 1 biểu đồ % + 1 biểu đồ khối lượng (KSNK + TGS song song) · không triptych 3 bảng |
| **B** | `/thong-ke/vst`, `/thong-ke/gsc` | Ma trận IPAC gập mặc định · GSC BK cluster = bảng tóm tắt (không clone full body) · ẩn scope banner trên canonical GSC |
| **C** | `/` | Filter `brief` (kỳ + khoa) · workload 4 card gập · deep link → `/thong-ke/*` |
| **D** | Nav + URL | Sidebar «Phân tích KSNK» · `buildAnalyticsUrlQuery` · filter sync `replaceState` |
| **E** | In | Print 3b gộp VST+GSC (`mergeMasterGapRows`) khớp UI |

### Checklist tay (K1–K6)

| # | Kịch bản | Kỳ vọng |
|---|----------|---------|
| K1 | `/bao-cao-tong-hop` — bấm mục lục «So sánh khoa» | Scroll tới section, 1 chart gộp + bảng master (không 2 block VST/GSC) |
| K2 | Đổi kỳ trên `/` rồi mở «Thống kê GSC» | URL mang `tu_ngay`/`den_ngay`/`khoa_ids` |
| K3 | `/thong-ke/gsc` — lọc chuyên đề, «Tải theo biểu mẫu» | Bảng tóm tắt BK, không nhân đôi KPI/trend |
| K4 | `/` Command Center | Filter chỉ kỳ + khoa; workload gập; traffic light link `/thong-ke/*` |
| K5 | In báo cáo A4 | Phần 3b một bảng gộp khoa (khớp màn hình) |
| K6 | Sidebar «Phân tích KSNK» | 4 mục: Điều hành / Thống kê VST / GSC / Báo cáo kỳ |

---

## Pilot DoD sau reform

- [x] `verify:engineering` pass
- [x] Vitest analytics pass (gồm `mergeMasterGapRows`)
- [x] Không import dead `DashboardV4` trong app
- [x] Barrel `supervision-analytics-charts.tsx` = **28 dòng**
- [x] UX slice A–E triển khai local
- [ ] K1–K6 duyệt tay trên UI

---

## Kết quả đo lường

| Trước | Sau |
|-------|-----|
| 1 file charts 1.671 dòng | 4 file: shared 324 · core 338 · khoa 1.076 · barrel 28 |
| 2 họ ngưỡng (80 vs 85/70) | 1 SSOT `supervision-thresholds.ts` |
| Công thức CCS trong dashboard core | `supervision-metrics/formulas.ts` + re-export |
| Merge gap thủ công trong Compare | `mergeMasterGapRows()` có spec |
| 5 entry GSC analytics | Canonical `/thong-ke/gsc` + redirect `?loai=` |
| Dead compliance v4 UI (6 file) | Đã xóa |

---

## Tham chiếu

- [`analytics-wave12-intake-202606.md`](./analytics-wave12-intake-202606.md)
- [`bao-cao-tong-hop.md`](./bao-cao-tong-hop.md)
- ADR: [`adr-dashboard-kpi-path-20260603.md`](../../reference/architecture/adr-dashboard-kpi-path-20260603.md)
