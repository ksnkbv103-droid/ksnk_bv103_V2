> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`modules/cssd/domain-overview.md`](../../../modules/cssd/domain-overview.md). Tra cứu lịch sử được.

# Audit domain — Quy trình xử lý dụng cụ phẫu thuật (CSSD)

> **Ngày:** 2026-09-08 (Asia/Saigon) · **Máy:** Mac `Desktop/ksnk_bv103` · **Phạm vi:** READ-FIRST, không refactor lớn.  
> **SSOT nghiệp vụ:** [`domain-overview.md`](domain-overview.md) · [`../../core/domain-specification.md`](../../core/domain-specification.md) §2.2 · PCI.03 / QT.18–24.  
> **Kiểm chứng nhanh:** vitest `cssd-steam-daily-bd` + `cssd-pack-issuance` + `cssd-lam-sach-lot-gate` + `cssd-batch-recall` — **27/27 pass**.  
> **Không sửa code** trong pass này (liên kết docs README/domain đã OK — không có broken link crystal-clear cần vá).

---

## 1. Mục tiêu nghiệp vụ (user) vs mô hình domain trong app

| # | Mục tiêu user | Mô hình app (đã chốt) | Đạt mức nào? |
|---|---------------|------------------------|--------------|
| 1 | Quản lý **6 khâu / 1 chu kỳ** bộ | `TIEP_NHAN → LAM_SACH → QC → DONG_GOI → TIET_KHUAN(mẻ) → CAP_PHAT` · hub `cssd_fact_quy_trinh` · trạm 5 **không quét** trên shell | **Đạt** khung + enforce +1 bước (RPC + `validateStationAdvance`) |
| 2 | **Ai** làm từng bước | Cột `nguoi_*_id` → `mdm_nhan_su` trên fact; resolve email/auth/họ tên | **Đạt lưu**; UI chờ/truy vết **PARTIAL** |
| 3 | **Khi nào** (timestamp) | Cột `thoi_gian_*` từng trạm; mẻ có `tk_chot_nap_at` / `tk_mo_form_qc_at` / `thoi_gian_bat_dau|ket_thuc` | **Đạt lưu**; timeline Trace **yếu** |
| 4 | Bộ đang **ở trạm / set nào** | `tram_hien_tai_id` → `cssd_dm_tram`; view `v_cssd_quy_trinh_full.ma_trang_thai_hien_tai`; bản đồ + hàng chờ + tab Kho | **Đạt** vận hành |
| 5 | Tạo–quản lý **phiếu tiệt khuẩn** chuẩn cao | `cssd_fact_lo_tiet_khuan` + QC 3 cấp `tk_qc_json` + BD đầu ngày + recall BI+ | **Đạt pilot**; chưa đủ «chuẩn mực tuyệt đối» (implant CHO_BI write, nhãn QT.20, 3×BI mở máy) |

**Ranh giới đúng (không lệch):** master CRUD ≠ quét; Kho/Truy vết/Recall **không** phải trạm 7; QC trạm (QT.19) ≠ QC mẻ (QT.23); dual-coding `B01.SET.*` / Cycle QR / `LOT-*` qua QR Hub.

---

## 2. Bản đồ cấu phần (route / tab / table / action) — 6 khâu + phiếu TK + kho + truy vết

### 2.1 Shell vận hành

| Surface | Route | Nội dung |
|---------|-------|----------|
| Mega-shell 4 tab | `/cssd-quy-trinh` | `?tab=` trống = Chu trình · `batch` · `kho` · `trace` (+ `?qr=` · `?station=`) |
| Deep link mẻ | `/cssd-erp/batch` | Cùng `MeTietKhuanPage` |
| Báo cáo | `/cssd-erp/report` | Sản lượng / NV / sự cố |
| Sự cố + thu hồi | `/cssd-su-co` | `cssdSuCoBatchRecallHref` · 3 cửa dụng cụ |
| Thiết bị / HC / catalog RO | `/cssd-thiet-bi` · `/cssd-hoa-chat` · `/cssd-dung-cu` | Ngoài shell 6 trạm |

**Page shell:** `src/app/cssd-quy-trinh/page.tsx` → dynamic import từ `contexts/processing-lifecycle/entrypoint` (Chu trình / Mẻ / Kho) + `QRHistoryViewer` (Truy vết).

### 2.2 Sáu khâu

| Trạm | UI | Ghi / gate chính | Table / view |
|------|-----|------------------|--------------|
| 1 Tiếp nhận | `CssdStationFlowMap` + quét | Bootstrap `ma_bo` nếu chưa có QT; vòng mới từ `CAP_PHAT` | `cssd_fact_quy_trinh` |
| 2 Làm sạch | Quét +1 | Soft-warn lot enzyme (`assertLamSachLotSoftGate`) | cùng hub |
| 3 QC (trạm) | Quét +1 | QT.19 — kiểm trước đóng gói | cùng hub |
| 4 Đóng gói | Quét + panel cấu phần | Soft thiếu BOM (Q2); Plasma cấm cellulose; sinh Cycle QR; in tem tối giản | `metadata.bom_lines` · `ma_cycle_qr` |
| 5 Tiệt khuẩn | **Tab Mẻ** (không chọn trên map quét) | Tạo phiếu → nạp bộ `DONG_GOI` → chốt nạp (BD gate) → QC form → đạt→`CAP_PHAT` / fail→rollback | `cssd_fact_lo_tiet_khuan` + `lo_tiet_khuan_id` |
| 6 Cấp phát | Quét / re-scan khi đã `CAP_PHAT` | Hard: mẻ ĐẠT · pack issuable · đóng băng/red-alert; soft ledger BOM | `khoa_nhan_id` · `tinh_trang` · `han_su_dung` |

**SSOT chuyển trạm:** DB `rpc_scan_workflow_station` · mirror app `cssd-state-engine` · patch `tram_hien_tai_id` qua `buildQuyTrinhTramPatch`.

### 2.3 Phiếu TK / Kho / Trace

| Tab | Component chính | Actions / helpers |
|-----|-----------------|-------------------|
| Mẻ | `MeTietKhuanPage` · create/process/list · print portal · modal thu hồi | `cssd-batch.actions` · `persist-me-tiet-khuan` · `use-me-tiet-khuan-workflow` |
| Kho | `KhoDungCuPage` embedded | `cssd-kho-read` trên `v_cssd_quy_trinh_full` (limit lớn — nợ perf) |
| Truy vết | `QRHistoryViewer` | `fetchCssdQrHistory` — bộ + mẻ; lịch sử từ `metadata.ngoai_le` |

---

## 3. Ai / khi nào / ở đâu — fields thực tế lưu

### 3.1 Ở đâu (trạm / bộ)

| Field | Nguồn | Ghi chú |
|-------|-------|---------|
| `tram_hien_tai_id` | `cssd_fact_quy_trinh` | FK `cssd_dm_tram` — SSOT vị trí |
| `ma_trang_thai_hien_tai` | `v_cssd_quy_trinh_full` | Alias đọc cho UI / gate |
| `bo_dung_cu_id` · `ten_bo` · `ma_qr_*` · `ma_cycle_qr` | fact + view | Tem vĩnh viễn vs Cycle |
| `lo_tiet_khuan_id` | fact | Bộ thuộc mẻ nào |
| `is_dong_bang` · `is_red_alert` · `tinh_trang` · `han_su_dung` | fact | An toàn cấp phát |
| `khoa_nhan_id` | fact (sau CP) | Khoa nhận |

### 3.2 Ai + khi nào (6 cột cặp)

| Trạm | Người (`mdm_nhan_su.id`) | Timestamp |
|------|--------------------------|-----------|
| TIEP_NHAN | `nguoi_tiep_nhan_id` | `thoi_gian_tiep_nhan` |
| LAM_SACH | `nguoi_lam_sach_id` | `thoi_gian_lam_sach` |
| QC | `nguoi_kiem_tra_id` | `thoi_gian_qc` |
| DONG_GOI | `nguoi_dong_goi_id` | `thoi_gian_dong_goi` |
| TIET_KHUAN | `nguoi_tiet_khuan_id` | `thoi_gian_tiet_khuan` |
| CAP_PHAT | `nguoi_cap_phat_id` | `thoi_gian_cap_phat` |

**Cách ghi:**

- Quét trạm 1–4 (+ vòng mới): RPC stamp `now()` + resolve operator từ `p_operator_label` (email NV).
- Mẻ ĐẠT: `persist-me-tiet-khuan` stamp **cùng lúc** `thoi_gian_tiet_khuan` + `thoi_gian_cap_phat`, gán cả `nguoi_tiet_khuan_id` và `nguoi_cap_phat_id` = người unload/QC, `tram` → `CAP_PHAT`, `tinh_trang=BINH_THUONG`, gán HSD theo `so_ngay_han_dung`.
- Re-scan `CAP_PHAT` khi đã ở kho sạch: cập nhật lại `nguoi_cap_phat_id` / `thoi_gian_cap_phat` + `khoa_nhan_id` (xác nhận giao).

**Hàng chờ UI:** `CSSDWaitingItem` có `nguoi_tram_truoc` / `thoi_gian_tram_truoc` / `tram_truoc` (map từ cột cặp — `cssd-read.actions`).

**Lệch nhận thức:** sau mẻ ĐẠT, «người cấp phát» tạm = người QC mẻ cho đến khi re-scan giao khoa. Đúng với mô hình «CAP_PHAT = kho sạch + xác nhận giao», nhưng báo cáo «ai giao khoa» cần dựa trên lần re-scan (hoặc chưa có nếu chưa quét lại).

### 3.3 Mẻ — ai / khi

| Field | Ý nghĩa |
|-------|---------|
| `tk_chot_nap_at` · `thoi_gian_bat_dau` | Chốt nạp / bắt đầu chu trình máy |
| `tk_mo_form_qc_at` · `thoi_gian_ket_thuc` | Mở QC / kết thúc |
| `ket_qua_test` | boolean ĐẠT / không |
| `tk_qc_json` | Physical / CI / BI / BD-on-form + ảnh + `nguoiLoad`/`nguoiUnload` |
| Máy `specs.bd_dau_ngay_ymd` · `bd_dau_ngay_ket_qua` | BD **đầu ngày** (≠ BD trên form mẻ) |

### 3.4 Truy vết — khoảng trống

`fetchCssdQrHistory` **không** dựng timeline từ 6 cột `thoi_gian_*`/`nguoi_*`. Chỉ ghép `metadata.ngoai_le[]` (ngoại lệ / sự kiện append).  
→ User goal «ai/khi nào theo chu kỳ» trên tab Trace = **PARTIAL**: dữ liệu có trên fact/report, UI Trace chưa đủ.

---

## 4. Phiếu tiệt khuẩn: tạo–sửa–in–đóng–recall / BD gate

| Bước | Hiện trạng | Đánh giá |
|------|------------|----------|
| **Tạo** | Chọn máy + người load; ghi BD đầu ngày trên form tạo (steam); `assertSteamDailyBdForLoad({ requireRecorded: true })` khi tạo & chốt nạp | **Đạt** QT.21 hard |
| **Nạp bộ** | Chỉ bộ đang `DONG_GOI`; khóa sau `tk_chot_nap_at` | **Đạt** |
| **Sửa / process** | Quét thêm trước chốt; thông số máy; form QC 3 cấp + ảnh | **Đạt pilot** |
| **In** | `CssdBatchPrintView` / `onPrintBatch` — đủ QC proof + BD form | **Đạt** phiếu mẻ |
| **Đóng (ĐẠT)** | → bộ `CAP_PHAT` + HSD + `BINH_THUONG`; append ngoại lệ | **Đạt** |
| **Đóng (Không đạt)** | Rollback `DONG_GOI` + sự cố + recall theo `lo_tiet_khuan_id` + máy `HOLD_QC` | **Đạt** (SC-10 / QT.24) |
| **Recall chủ động** | Link «Thu hồi theo mẻ» + modal `batchRecallEntry` / deep-link `/cssd-su-co` | **Đạt** entry UI (trước đây P0) |
| **BD đầu ngày** | Helper + UI ghi trên create-step + gate create/chốt | **Đạt** (đã harden sau audit 09-04) |
| **Implant / CHO_BI** | Label UI đọc `tk_qc_json` quarantine — **chưa** write-path đầy đủ chặn `HOAN_THANH` | **PARTIAL / P1** |
| **3× BI(−) mở máy** | Spec ghi nhận chưa auto | **GAP P1** |
| **Nhãn Cycle QR QT.20** | `printCycleLabel` chỉ `qrCode` + `tenBo` — **thiếu** ngày đóng gói, HSD, người đóng gói, **số mẻ** | **PARTIAL P0/P1** |

**Cổng cấp phát (liên quan phiếu):** `assertPackIssuable` wired workflow + re-scan — chặn thiếu `tinh_trang`/HSD, ướt/rách/hỏng, red-alert, đóng băng; mẻ chưa QC / fail → lỗi. Soft BOM giữ Q2.

---

## 5. Lệch domain / SOP / triển khai (P0–P2)

### P0 — trước/cùng pilot sâu (an toàn hoặc đúng nhãn QT)

| ID | Lệch | Evidence | Hướng xử lý (không làm hết pass này) |
|----|------|----------|--------------------------------------|
| P0-1 | Tem chu trình **chưa đủ QT.20** (thiếu số mẻ / HSD / người / ngày ĐG) | `usePrint.printCycleLabel` minimal | Mở rộng payload in từ fact + `lo_tiet_khuan` sau ĐG/mẻ |
| P0-2 | Tab **Trace** không hiện đủ ai/khi 6 khâu | `cssd-qr-history.actions` chỉ `ngoai_le` | Timeline từ cột `thoi_gian_*`/`nguoi_*` (+ ngoại lệ) |
| P0-3 | (Giám sát) Đảm bảo NV **re-scan CAP_PHAT** khi giao khoa — nếu không, báo cáo «người cấp phát» = người QC mẻ | `persist-me-tiet-khuan` stamp kép | SOP pilot + optional soft-warn UI «chưa xác nhận giao» |

*Đã đóng so với audit 09-04:* BD hard thiếu/KHONG_DAT · pack wet/expiry · entry thu hồi mẻ.

### P1 — chuẩn mực / PCI đầy đủ hơn

| ID | Lệch |
|----|------|
| P1-1 | `CHO_BI` / implant: thiếu write + chặn cấp phát khi quarantine |
| P1-2 | 3× BI(−) trước khi nhả `HOLD_QC` |
| P1-3 | QT.18: POU tại tiếp nhận; lot enzyme/washer capture đầy đủ (hiện soft-warn) |
| P1-4 | Cấp phát FEFO theo khoa + phiếu lĩnh BM.03 + trả nonconforming |
| P1-5 | Multi-patient sterilized set ban; IUSS cấm implant (policy) |
| P1-6 | Trace ↔ SSI đã có hook NKBV — cần UAT ký tay |

### P2 — IA / perf / debt

| ID | Lệch |
|----|------|
| P2-1 | Mega-shell 4 tab + `ssr:false` — nặng (xem audit perf 09-07) |
| P2-2 | Kho `select *` limit 8000 trên `v_cssd_quy_trinh_full` |
| P2-3 | Operator resolve email full-scan `mdm_nhan_su` khi không có `auth_user_id` |
| P2-4 | Pilot checklist còn ô BOM modal cũ — doc lệch nhẹ so code (đã bỏ modal) |

---

## 6. UI thừa / mega-shell 4 tab — nhận xét

**Đúng nghiệp vụ khi gom:** Chu trình + Mẻ + Kho + Trace phục vụ **một ca CSSD** (quét → hấp → xem tồn → tra QR) không nhảy sidebar.

**Chi phí:**

- Một `page.tsx` client hydrate 4 panel dynamic; Mẻ là workflow state machine lớn (create/process/list/print/incident).
- Tab Kho trùng cảm giác với `/cssd-dung-cu` + tồn trên quy trình (dual surface đã chốt domain nhưng UX «hai kho»).
- Trace là icon Search tách nhóm — dễ bỏ sót; lại là nơi user kỳ vọng goal #2–#3 nhưng dữ liệu timeline mỏng.
- Trạm 5 trên map **không** chọn được (đúng) nhưng chip «Mẻ» / tab Batch phải đủ nổi — rủi ro NV cố quét TK trên shell (đã có message chặn).

**Khuyến nghị IA (không implement):** giữ 4 tab pilot; P1 tách Trace thành panel «timeline đủ cột» hoặc deep-link report staff; cân nhắc Kho = filter sẵn `CAP_PHAT` + FEFO thay full dump.

---

## 7. Kế hoạch hoàn thiện ưu tiên (không implement hết)

1. **P0-1** Nhãn Cycle QR đủ QT.20 (số mẻ bắt buộc khi đã vào mẻ; trước mẻ ghi «chưa có số mẻ»).  
2. **P0-2** Trace timeline từ 6 cột người/giờ + `ngoai_le` + link mẻ.  
3. **P0-3** Checklist pilot: bắt buộc re-scan CP khi giao khoa; đào tạo soft-warning BOM.  
4. **P1-1** Implant `CHO_BI` write + gate cấp phát.  
5. **P1-2** Đếm BI(−) / quy trình mở máy sau HOLD_QC.  
6. **P1-3** Capture POU + lot LS (từ soft → bắt buộc theo QT.18 khi PO chốt).  
7. **P2** Phân trang Kho / giảm bulk; đo lại perf shell.  
8. Cập nhật `pilot-test-checklist.md` (bỏ wording BOM modal; thêm BD đầu ngày · pack gate · thu hồi · QT.20).

---

## 8. Verdict

| Tiêu chí | Kết luận |
|----------|----------|
| **Khoa học / logic domain** | **Đủ** — 6 trạm map PCI QT.18–22, tách QC trạm/mẻ, mẻ + BD + recall + pack gate khớp SOP đã chốt PO. |
| **Đủ cho pilot vận hành** | **Có** — quét chu trình, biết bộ ở đâu, lưu ai/khi trên fact, tạo–chạy–in–đóng phiếu TK, chặn cấp phát gói xấu, thu hồi theo mẻ, BD đầu ngày hard. Vitest helpers xanh. |
| **Chuẩn mực «cao nhất» (QT đầy đủ + truy vết PO-grade)** | **Chưa** — nhãn QT.20 thiếu trường; Trace chưa kể đủ ai/khi; implant CHO_BI & 3×BI mở máy còn P1; LS/POU còn mềm. |
| **Khuyến nghị** | **Pilot có kiểm soát** với đào tạo P0-3 + vá P0-1/P0-2 trước go-live rộng; không cần đảo mô hình 6 trạm. |

---

### Phụ lục — file code then chốt

| Vai trò | Path |
|---------|------|
| Shell tabs | `src/app/cssd-quy-trinh/page.tsx` |
| Quét / gate | `workflow/application/cssd-workflow-application.ts` · `actions/cssd-scan.actions.ts` · RPC `rpc_scan_workflow_station` |
| Mẻ | `views/MeTietKhuanPage.tsx` · `actions/cssd-batch.actions.ts` · `helpers/persist-me-tiet-khuan.ts` |
| BD / pack | `src/lib/domain/cssd-steam-daily-bd.ts` · `cssd-pack-issuance.ts` |
| Recall | `modules/cssd-su-co/domain/cssd-batch-recall.ts` · `application/batch-recall-hold.application.ts` |
| Routes | `src/lib/cssd-routes.ts` |
| Ai/khi map | `cssd-incident-trace.ts` · `cssd-analytics-core.ts` |

*Hết audit 2026-09-08.*
