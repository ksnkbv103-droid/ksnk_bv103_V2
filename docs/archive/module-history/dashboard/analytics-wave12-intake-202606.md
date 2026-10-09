# Intake — Analytics Wave 1 & 2 (thống kê · báo cáo tổng hợp)

> **Trạng thái:** Đã duyệt & implement Wave 1 + 2 (2026-06).  
> **Tham chiếu hội thoại:** logic domain KSNK/TGS/đối soát, ba tầng `/` · `/thong-ke/*` · `/bao-cao-tong-hop`.

---

## 1. Goal

Chuẩn hóa thống kê giám sát và báo cáo tổng hợp theo **luật domain đã thống nhất**: tách KSNK / tự giám sát / đối soát (chỉ khi đủ hai nguồn), **xu hướng trước — so sánh sau**, số liệu hiển thị cố định — để BGĐ/HĐ KSNK, Khoa KSNK và khoa lâm sàng ra quyết định bằng số.

---

## 2. In scope

### Wave 1 — «Tính đúng + hiển thị đúng» (P0)

| Hạng mục | Chi tiết |
|----------|----------|
| **Luật comparable** | Đối soát TGS vs KSNK chỉ khi `vol_tgs > 0` **và** `vol_ksnk > 0` (cùng chuyên đề/kỳ). `do_lech` RPC đã đúng; sửa UI + mapper. |
| **Bảng loại trừ** | Khoa có chỉ một nguồn hoặc không có phiên: cột lý do («Chưa TGS» / «Chưa KSNK» / «Chưa triển khai»). |
| **Triển khai TGS** | Chart khối lượng TGS theo khoa (song song chart KSNK đã có) + tóm tắt `X/Y khoa có TGS`. |
| **Thứ tự báo cáo tổng hợp** | KPI → Trend → So sánh khoa (triptych + bao phủ + bảng CCS) → IPAC/vùng → **NKBV sau process** → Chuyên đề/link. |
| **Command Center** | Top 3 gap chỉ khoa **comparable** (không Δ khi thiếu TGS). |
| **File/module** | `src/lib/analytics/supervision-analytics-charts.tsx`, `supervision-matrix-mappers.ts`, `VstStrategicAnalyticsPanel.tsx`, `GscStrategicAnalyticsPanel.tsx`, `ComprehensiveCompare.tsx`, `bao-cao-tong-hop-page.tsx`, `CommandCenterBriefSections.tsx`, spec liên quan, cập nhật ngắn `docs/modules/dashboard/bao-cao-tong-hop.md`. |

### Wave 2 — «Bao phủ chuyên đề» (P1)

| Hạng mục | Chi tiết |
|----------|----------|
| **Ma trận khoa × BK (GSC)** | Bảng/heatmap: ô = `Có TGS` / `Có KSNK` / `Thiếu` / `Đủ đối soát` — **UI layer** từ `gap_analysis` + lọc `bang_kiem_mas` / cluster GSC hiện có; **không migration** trong wave này. |
| **Tóm tắt thiếu BK** | Dòng KPI: «N khoa chưa tự GS chuyên đề X trong kỳ» (theo BK đang active trong lọc). |
| **VST** | Ma trận đơn giản 1 cột chuyên đề (TGS/KSNK/comparable) — cùng component, không BK. |
| **In báo cáo** | `bao-cao-tong-hop-print.ts` đồng bộ: thứ tự section Wave 1 + bảng loại trừ đối soát + (Wave 2) bảng bao phủ BK rút gọn. |
| **Hierarchy UI** | Accordion hoặc anchor «Chi tiết: IPAC · nghề» — tránh trùng visual với block khoa; **không** đổi RPC. |

---

## 3. Out of scope

| Cấm | Lý do |
|-----|-------|
| Migration / RPC mới (`coverage_matrix` DB) | Wave 2 dùng compose từ payload hiện có; RPC riêng → Wave 4 nếu cần. |
| RBAC «khoa tôi» / scope `actorKhoaId` trên dashboard | Wave 3. |
| Liên kết QLCV từ ô thiếu bao phủ | Wave 3. |
| So sánh kỳ trước (QoQ) trên KPI BGĐ | Wave 4. |
| Refactor CSSD, NKBV workflow, Command Center layout lớn | Ngoài slice. |
| Tab Thống kê: đổi toàn bộ grid dimension sang cột dọc | Chỉ khoa block; IPAC/nghề giữ grid/accordion. |
| Executive 1-pager auto-summary | Không trong wave 1–2. |
| Thay đổi công thức CCS, ngưỡng 85/70 MDM | Giữ `bao-cao-tong-hop-thresholds.ts` pilot. |

---

## 4. Acceptance criteria (kiểm được)

### Wave 1

1. **Đối soát:** Khoa chỉ có `ty_le_ksnk`, `vol_tgs = 0` → **không** xuất hiện chart đối soát; có trong bảng «Chưa đủ điều kiện» với lý do «Chưa TGS».
2. **Đối soát:** Khoa có cả hai nguồn → có trong chart đôi cột; `do_lech` khớp RPC (manual 1 khoa).
3. **Triển khai TGS:** `/thong-ke/vst` và `/thong-ke/gsc` có chart khối lượng TGS + `X/Y khoa có TGS` (cùng style KSNK deployment).
4. **Báo cáo tổng hợp:** Thứ tự section: KPI → Trend → So sánh khoa → (IPAC) → NKBV → Chuyên đề; scroll một lần không thấy NKBV trước so sánh khoa.
5. **Command Center:** Top gap không liệt kê khoa chỉ có KSNK.
6. **Số cố định:** Bảng loại trừ + bảng CCS không phụ thuộc hover.
7. **Test:** `supervision-matrix-mappers.spec.ts` + `bao-cao-tong-hop-core.spec.ts` pass; thêm case `isComparable` / filter gap.

### Wave 2

8. **GSC ma trận:** Với ≥2 BK trong kỳ, bảng hàng = khoa (đã lọc), cột = BK (hoặc transposed có chú thích) — ô trạng thái TGS/KSNK/thiếu.
9. **Thiếu BK:** KPI hoặc dòng tóm tắt đếm đúng số khoa thiếu TGS trên ít nhất 1 BK (đối chiếu tay với lọc 1 BK).
10. **In:** HTML in có bảng loại trừ đối soát; section NKBV sau process; không còn chỉ Top/Bottom khoa (đã full rank từ P0 trước).
11. **Regression:** Lọc «Tất cả khoa» vẫn chỉ hiện khoa có dữ liệu RPC (hành vi cũ); lọc tường minh N khoa vẫn hiện placeholder thiếu phiên.

### Pilot DoD (chung)

- ≥3 kịch bản tay (xem §6).
- `npm run verify:engineering` pass sau mỗi wave merge.

---

## 5. Constraints

| Ràng buộc | |
|-----------|--|
| **CSSD vs MDM** | Không đụng; slice dashboard/analytics only. |
| **Schema** | Không migration Wave 1–2. |
| **Dependency** | Không thêm package chart mới; Recharts + component hiện có. |
| **SSOT số liệu** | `getVstStrategicAnalytics` / `getGscStrategicAnalytics` / `getBaoCaoTongHopAnalytics` — không query `*_summary` trực tiếp app. |
| **Boy Scout** | Diff surgical; không audit repo. |

---

## 6. Verify plan

| Wave | Lệnh | Kịch bản tay (tối thiểu) |
|------|------|---------------------------|
| **1** | `npx vitest run src/lib/analytics/supervision-matrix-mappers.spec.ts src/modules/dashboard/lib/bao-cao-tong-hop-core.spec.ts` | **K1:** Lọc khoa có 1 khoa chỉ KSNK → không có cột đối soát, có dòng «Chưa TGS». **K2:** Khoa đủ 2 nguồn → đối soát hiện. **K3:** `/bao-cao-tong-hop` — NKBV dưới block khoa. |
| **1** | `npm run verify:engineering` | |
| **2** | Lệnh wave 1 + review `bao-cao-tong-hop-print` output | **K4:** GSC 2+ BK — ma trận bao phủ đọc được. **K5:** In báo cáo — thứ tự khớp màn hình. **K6:** VST — ma trận 1 chuyên đề TGS/KSNK. |
| **2** | `npm run verify:engineering` | |

---

## 7. Kế hoạch triển khai (5 bước)

| Bước | Wave | Việc | Verify |
|------|------|------|--------|
| 1 | 1 | Mapper: `isGapComparable(row)`, `buildGapKhoaRows` + filter gap UI; bảng `NonComparableKhoaTable` | vitest mapper |
| 2 | 1 | `SupervisionKhoaTriptych` + `SupervisionTgsDeploymentChart`; CC gap filter | Tay K1–K2 trên `/thong-ke/vst` |
| 3 | 1 | `bao-cao-tong-hop-page` reorder; `ComprehensiveCompare` bảng loại trừ | Tay K3 |
| 4 | 2 | Component `SupervisionCoverageMatrix` (GSC BK × khoa); gắn GSC panel + BC | Tay K4 |
| 5 | 2 | Print HTML sync; accordion/anchor dimension phụ; doc `bao-cao-tong-hop.md` | Tay K5–K6 + verify:engineering |

**Thứ tự ship:** Wave 1 merge & duyệt tay → Wave 2 (không gộp PR nếu user muốn review từng wave).

---

## 8. Top 3 rủi ro regression

1. **Lọc gap quá chặt** — BGĐ thấy ít khoa trên chart đối soát (đúng nghiệp vụ nhưng cần bảng loại trừ rõ, tránh cảm giác «mất dữ liệu»).
2. **Ma trận BK Wave 2 chậm** — nhiều cluster GSC RPC khi mở «Tải theo biểu mẫu»; giới hạn hiển thị BK đang lọc, không fetch thêm ngoài intake.
3. **In báo cáo dài** — thêm bảng bao phủ làm PDF nhiều trang; cần rút gọn in (top BK theo `dynamic_checklists` kỳ, giữ full trên màn hình).

---

## 9. Giả định — cần user xác nhận (mặc định pilot nếu im lặng)

| ID | Câu hỏi | Mặc định Wave 1–2 |
|----|---------|-------------------|
| **A1** | Mẫu số bao phủ `Y` = tất cả khoa MDM hay chỉ khoa đã lọc? | **Chỉ khoa trong bộ lọc**; nếu «Tất cả» thì Y = khoa có trong `gap_analysis` ∪ khoa lọc tường minh. |
| **A2** | BK bắt buộc trong ma trận Wave 2? | **BK có trong `dynamic_checklists` kỳ** (đang active), không toàn MDM. |
| **A3** | Nhãn lý do loại trừ đối soát? | «Chưa TGS» / «Chưa KSNK» / «Chưa triển khai» (cả hai = 0). |
| **A4** | VST ngoại khoa / thường quy tách chart Wave 1–2? | **Không** — giữ lọc hình thức; không slice RPC mới. |
| **A5** | In ma trận BK: full hay top N? | **Top 8 BK** theo `tong_phien` kỳ; full matrix trên web. |

---

## 10. Spec freeze (sau duyệt)

Các mục **đóng băng** khi user nói «duyệt intake» / «triển khai theo plan»:

- Định nghĩa **comparable** = `vol_tgs > 0 ∧ vol_ksnk > 0`.
- Thứ tự section báo cáo tổng hợp (§2 Wave 1).
- Ba lane chart khoa: triển khai TGS · triển khai KSNK · % tách · đối soát (subset).
- Wave 2 ma trận **không** migration.

Mọi thay đổi sau đó ghi `Spec change` + intake revision.

---

## 11. Exit intake

- [x] User duyệt Wave 1 scope
- [x] User duyệt Wave 2 scope
- [x] A1–A5 — mặc định pilot
- [ ] Sau implement Wave 1: ≥3 kịch bản K1–K3 PASS (tay)
- [ ] Sau implement Wave 2: K4–K6 PASS (tay)
- [x] Changelog 1 dòng `implementation-mapping.md`

---

## Tham chiếu

- [`bao-cao-tong-hop.md`](./bao-cao-tong-hop.md)
- [`../../core/lean-execution.md`](../../core/lean-execution.md)
- Hội thoại: P0 full rank khoa (đã implement), triptych, moment bảng số, luật đối soát.
