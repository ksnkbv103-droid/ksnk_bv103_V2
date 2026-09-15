# Rà soát toàn dự án + lộ trình khắc phục — KSNK BV103

> **Ngày:** 2026-09-09 (Asia/Saigon) · **Máy:** Mac `Desktop/ksnk_bv103` · machineId `6bad1c57-…0f88`  
> **Phạm vi:** READ-FIRST / phân tích + kế hoạch · **chỉ local** · không commit/push/cloud · không đổi code ứng dụng trong pass này.  
> **Người nhận:** Trịnh Nghĩa / KSNK BV103 · ngôn ngữ phần mềm–vận hành (không mã thủ tục QT/PCI trên UI).  
> **Phương pháp (giới hạn trung thực):** không mở từng file trong ~1248 `.ts(x)`. Đã dùng: bản đồ route App Router (~55 `page.tsx`) · `src/modules/*` · `docs/modules` · `ssot-map` · `debt-register` / `open-backlog` · **20** ghi chú agent 09/2026 · đọc sâu hot path danh mục / duyệt BOM / sự cố / shell IA. Độ phủ = tối đa thực dụng, không phải inventory từng dòng.

---

## 1. Tóm tắt điều hành (1 trang)

### Hiện trạng ngắn
Hệ thống là **một ứng dụng KSNK đa miền** (Giám sát VST/GSC/NKBV · CSSD 6 khâu + mẻ + kho + sự cố · Quản trị MDM · QLCV · Đào tạo · Dashboard/Báo cáo). Lớp **IA sidebar** đã giản (Vận hành / Tra cứu / Sửa danh mục / hub Giám sát). Nhiều P0 lịch sử (ledger, auth proxy, BOM soft-warning, UI dialect, print/filter scorecard) **đã đóng** theo `open-backlog-20260731` và audit tháng 7–8.

Đợt **09/2026** đã vá mạnh: tách 3 cửa dụng cụ, four-eyes xác nhận sự cố, cách ly hóa chất, tab **Loại** trả lại trung tâm, phân trang catalog/kho, sửa mẫu số % VST, BD đầu ngày + chặn gói xấu cấp phát, tem chu trình + timeline truy vết.

### Còn đau thật
1. **Danh mục dụng cụ vẫn admin-centric** trong khi nghiệp vụ kiểm kê/đổi thành phần thuộc NV — cửa «Đổi danh mục» mới phủ **BOM theo bộ**, chưa phủ đề xuất **Loại mới / Bộ mới** có duyệt.  
2. **Đổi mã/tên loại khi duyệt phiếu một bộ** có thể **đổi master loại toàn cục** (`applyApprovedBomLines` rename) — rủi ro khoa học cao.  
3. **Độ rối / payload** (NKBV mega-page, shell RBAC hydrate, form sự cố dày, dual surface dụng cụ) vẫn làm chậm cảm nhận dù Batch perf 1–2 đã cắt catalog/kho.  
4. **UAT lâm sàng / vận hành** (NKBV checklist, reform CSSD) chưa ký — nợ sản phẩm, không phải bug code.  
5. **Doc SSOT lệch code** ở vài chỗ (vd. «sheet Loại» vs tab Loại đã trả 09-07).

### Trả lời thẳng câu hỏi catalog
**Có — nên tách «rà soát / kiểm kê danh mục» khỏi gánh admin**, nhưng **không** cần module ERP mới to. Khuyến nghị **Hybrid (phương án C)**: NV soạn draft / phiếu trên Loại–Bộ–BOM; Admin/điều phối publish; giữ override khẩn cấp; tái dùng hàng đợi duyệt + 3 cửa đã có; **không** gộp với sự cố an toàn.

### Việc làm ngay (không over-promise)
- Đợt 0 (1–3 ngày): chốt mô hình governance + vá rủi ro rename loại toàn cục + đồng bộ doc.  
- Đợt 1–2: Hybrid catalog (draft Loại + hàng chờ thống nhất) + cắt residual perf nóng.  
- Đợt 3+: UAT ký, implant CHO_BI, declutter IA thống kê, NKBV workspace.

---

## 2. Bản đồ module hiện trạng

### 2.1 Sidebar (SSOT)

| Nhóm | Mục | Route |
|------|-----|-------|
| Điều hành | Tổng quan · Báo cáo chính thức | `/` · `/bao-cao-tong-hop` |
| Giám sát | Hub | `/giam-sat` → VST / GSC / NKBV |
| Vận hành nội bộ | Công việc · Thi KSNK | `/quan-ly-cong-viec` · `/dao-tao` |
| CSSD · Vận hành | Quy trình · Sự cố & biến động | `/cssd-quy-trinh` · `/cssd-su-co` |
| CSSD · Tra cứu | Dụng cụ · Thiết bị · Hóa chất | `/cssd-dung-cu` · `/cssd-thiet-bi` · `/cssd-hoa-chat` |
| Sửa danh mục | Quản trị hệ thống (hub) | `/quan-tri-he-thong` |

Deep-link còn sống: `/cssd-erp/batch|report`, `/lich-su/*`, `/thong-ke/*`, nhiều trang QT redirect về hub.

### 2.2 CSSD

| Việc | Surface chính | Ghi chú |
|------|---------------|---------|
| 6 khâu chu trình | `/cssd-quy-trinh` (tab mặc định) | Quét + bản đồ trạm; mẻ = tab riêng |
| Phiếu / mẻ TK | `?tab=batch` · `/cssd-erp/batch` | BD đầu ngày hard; QC 3 cấp; recall |
| Kho sạch / FEFO ops | `?tab=kho` | Đã phân trang (Batch 2) |
| Truy vết | `?tab=trace` | Timeline 6 khâu đã vá 09-08 |
| Catalog RO | `/cssd-dung-cu` | Search-first (Batch 1); tab Loại\|Bộ\|Lịch sử |
| Master Loại/Bộ/BOM | QT `danh-muc/dung-cu` | Tab **Loại \| Bộ \| Rà soát \| Lịch sử**; hard-write = ADMIN |
| Biến động dụng cụ | `/cssd-su-co` nhóm Dụng cụ | 3 cửa: Hỏng/Mất · Đổi DM · Điều chuyển |
| Sự cố an toàn | cùng `/cssd-su-co` | PROCESS / BATCH / EQUIPMENT / CHEMICAL / OTHER |
| Thiết bị / HC | `/cssd-thiet-bi` · `/cssd-hoa-chat` | Ops vs admin tách; FEFO + PM đã reaudit |

### 2.3 Giám sát / khác

| Module | Route | Trạng thái ngắn |
|--------|-------|-----------------|
| VST | `/giam-sat-vst` + lịch sử/thống kê | Form ổn; **% KPI mẫu số đã sửa 09-07** |
| GSC / tuân thủ | `/giam-sat-chung/*` | % = đạt/quan sát — OK; chrome còn dày |
| NKBV | `/giam-sat-nkbv` | Mega-page P0 rối; UAT lâm sàng còn mở |
| QLCV | `/quan-ly-cong-viec` | Kanban dùng được; payload/limit residual |
| Đào tạo | `/dao-tao/*` | Thi + NHCH; bank limit cao |
| Quản trị | `/quan-tri-he-thong` | 4 việc hub; TK một cửa; 1-admin rủi ro chấp nhận pilot |
| Offline | shell + CSSD sync | Đã giữ `extraPayload` cấp phát (LT-OFFLINE-01 Done) |

### 2.4 Quy mô code (từ audit 09-07, vẫn đúng hướng)

| Module | ~LOC / mega | Mức rối |
|--------|-------------|---------|
| giam-sat-nkbv | ~48k / 34 mega | P0 |
| quan-tri-he-thong | ~21k | P0–P1 |
| cssd-erp | ~17k | P0–P1 |
| cssd-su-co / gsc / qlcv / dashboard / dao-tao | 4–11k | P1 |
| giam-sat-vst / hub | nhỏ hơn | P2 |

---

## 3. Top 10 điểm đau nhất

| # | Điểm đau | Vì sao đau vận hành / khoa học | Severity |
|---|----------|--------------------------------|----------|
| 1 | **Governance danh mục: NV không soạn được Loại/Bộ có kiểm soát; mọi hard-write đổ admin** | Kiểm kê thật do NV/điều dưỡng; admin tắc nghẽn hoặc lách form master → sai sổ chuẩn | **P0** sản phẩm |
| 2 | **Duyệt «Đổi danh mục» có thể rename `cssd_dm_loai_dung_cu` toàn cục** | Một phiếu một bộ đổi tên/mã loại → ảnh hưởng mọi bộ/kho gắn loại đó | **P0** dữ liệu |
| 3 | **Hai ngữ cảnh «rà soát»** (tab QT + cửa sự cố) + copy «sự cố» còn lẫn biến động danh mục | Nhân viên lập nhầm cửa; lãnh đạo khó đọc sổ | **P1** |
| 4 | **NKBV mega-surface + UAT chưa ký** | Khoa học HAI/SSI phụ thuộc đúng form; page quá dày → lỗi nhập + chậm | **P0–P1** |
| 5 | **Payload / client-first còn lại** (shell quyền, form sự cố 1k dòng, NHCH 5k–10k, fleet NKBV) | Chậm mọi trang; dễ bỏ cuộc khi ca trực | **P1** |
| 6 | **Dual / multi surface dụng cụ** | Copy/CTA Đợt B đã khóa 1 câu (residual UAT) | **P2** residual |
| 7 | ~~**Implant / quarantine `CHO_BI`**~~ | **FIXED** Đợt A 09-09 | — |
| 8 | **Trace / tem / giao khoa** đã vá một phần; còn in lại tem từ Kho, soft-warn phụ thuộc `khoa_nhan_id` | Truy vết pháp lý / khoa nhận còn lỗ nhỏ | **P1–P2** |
| 9 | **Doc SSOT lệch code** (sheet Loại, một số checklist pilot) | Agent/PO làm lệch hướng; lặp vòng sửa UX | **P1** duy trì |
| 10 | **1 admin + audit UI mỏng + self-reset edge** | Pilot chấp nhận; vận hành dài hạn rủi ro khóa tài khoản / thiếu sổ ai làm gì | **P2** (P1 nếu mở rộng user) |

**Rationale xếp hạng:** ưu tiên sai sổ chuẩn + an toàn tiệt khuẩn trước polish UI; perf chỉ đứng cao khi chặn ca trực.

---

## 4. Inventory P0 / P1 / P2 theo miền

Ký hiệu trạng thái: **OPEN** · **PARTIAL** · **FIXED** (đã vá trong code local gần đây) · **DONE-HIST** (đóng từ audit 07–08).

### 4.1 CSSD — Quy trình 6 khâu / phiếu TK / kho / truy vết

| ID | Symptom | Where | Why hurts | Sev | Evidence | Fix direction | Status |
|----|---------|-------|-----------|-----|----------|---------------|--------|
| QT-01 | Khung 6 khâu + RPC advance | `/cssd-quy-trinh` | — | — | domain-overview · quy-trinh audit 09-08 | Giữ | **FIXED/OK** |
| QT-02 | BD đầu ngày steam chặn tạo/chốt nạp | mẻ create | Sai BD = rủi ro cả ngày chạy | P0 | `cssd-steam-daily-bd` · quan-ly-dung-cu changelog | Giữ + UAT | **FIXED** |
| QT-03 | Cấp phát chặn gói ướt/rách/hỏng/HSD | pack issuance | Cấp phát gói bẩn | P0 | `cssd-pack-issuance` | Giữ | **FIXED** |
| QT-04 | Plasma cấm cellulose | đóng gói | Sai vật liệu | P1 | packaging rules | Giữ | **FIXED** |
| QT-05 | Tem chu trình thiếu trường | print cycle | Khoa khó nhận | P1 | quy-trinh-sw-process-fix 09-08 | In lại từ Kho (residual) | **FIXED** phần; **OPEN** nút in lại |
| QT-06 | Trace chỉ `ngoai_le` | `?tab=trace` | Không thấy ai/khi | P1 | cùng fix | Timeline đã có | **FIXED** |
| QT-07 | Soft-warn chưa giao khoa | CP / kho / trace | Nhầm người CP = QC mẻ | P1 | `needsCssdKhoaHandoffSoftWarn` | Giữ soft; không hard | **FIXED** |
| QT-08 | Implant CHO_BI thiếu write + gate CP | mẻ QC | Implant ra khoa khi chưa BI | P1 | Đợt A 09-09 | Persist + gate + release | **FIXED** local |
| QT-09 | 3×BI(−) mở máy chưa auto | thiết bị/mẻ | Policy vận hành | P2 | deep-audit 09-04 | Rule + UI sau UAT | **OPEN** |
| QT-10 | POU / enzyme lot mềm | TN / LS | SOP làm sạch | P2 | domain audit | Soft capture trước hard | **PARTIAL** |
| QT-11 | Kho list từng `select *` limit 8k | `KhoDungCuPage` | Chậm | P1 | perf Batch 2 | Đã hẹp + page | **FIXED** |
| QT-12 | Soft-warning thiếu BOM (không hard-block) | đóng gói/CP | Đúng quyết định Q2 | — | D-01 / D8 | Không reopen hard-block | **DONE-HIST** |

### 4.2 CSSD — Dụng cụ Loại / Bộ / BOM / dual surface

| ID | Symptom | Where | Why hurts | Sev | Evidence | Fix direction | Status |
|----|---------|-------|-----------|-----|----------|---------------|--------|
| DC-01 | Tab Loại từng bị giấu sheet | QT dung-cu | Mất trung tâm SKU | P0 UX | dung-cu-loai-proposal | Tab Loại trả 09-07 | **FIXED** |
| DC-02 | Hard-write master chỉ ADMIN | Loai/Bo/ChiTiet actions | Đúng D5; NV tắc khi thiếu loại | P0 SP | `requireCssdCatalogMasterWrite` · D5 | Hybrid đề xuất (Part B) | **PARTIAL** (cổng đúng, luồng NV thiếu) |
| DC-03 | `BO_DC.edit` = duyệt phiếu, không mở form | approve actions | Đúng D5 | — | domain-decisions | Giữ | **OK** |
| DC-04 | Duyệt DOI_LOAI có thể rename loại global | `applyApprovedBomLines` | Sai sổ toàn viện | **P0** | cssd-set-bom-apply-core.ts:67–89 | Chỉ relink hoặc phiếu «đổi master loại» riêng + confirm impact | **OPEN** |
| DC-05 | THEM_DONG bắt buộc loại đã có | set reconcile | Không tạo loại mới qua phiếu | P1 | apply core THEM_DONG | Draft loại → duyệt → rồi gắn BOM | **OPEN** gap |
| DC-06 | Tab Rà soát QT chỉ `isAdmin` UI; BE cho `BO_DC/DC_LE.edit` | QuanLyDungCuPage vs approve | Lệch quyền / tổ trưởng không thấy hàng chờ | P1 | QuanLyDungCuPage:65–95 · set-reconcile-approve | Align UI với `requireCatalogApprove` | **OPEN** |
| DC-07 | Campaign kiểm kê list 400 bộ + pending | set-reconcile-campaign | Có mầm «đợt» nhưng chưa workspace | P2 | campaign.actions | Tái dùng cho Hybrid | **PARTIAL** |
| DC-08 | CSSD RO + QT + Kho trùng việc xem | nhiều route | Nhầm cửa sửa | P1 | whole-app IA §4 | Copy 1 dòng «Sửa → Quản trị / Đề xuất → Sự cố» | **PARTIAL** |
| DC-09 | Catalog full-load first paint | `/cssd-dung-cu` | Chậm | P1 | perf Batch 1 | Search-first | **FIXED** |
| DC-10 | Bộ QT full `select *` | BoDungCuPage | Chậm | P1 | Batch 1 | Page 20 | **FIXED** |
| DC-11 | Doc còn «sheet Loại» | quan-ly-dung-cu-luong · domain-decisions §IA | Agent làm sai | P1 doc | so code QuanLyDungCuPage | Sync doc → tab (pass này) | **FIXED** 2026-09-09 |
| DC-12 | Unique 1 bộ×1 loại | D6 | Trùng dòng BOM | P1 | coalesce helpers | Giữ + UAT import | **OK/PARTIAL** |

### 4.3 CSSD — Sự cố

| ID | Symptom | Where | Why hurts | Sev | Evidence | Fix direction | Status |
|----|---------|-------|-----------|-----|----------|---------------|--------|
| SC-01 | Hỏng/Mất lẫn Đổi DM một form | InstrumentSetReconcile | Lập nhầm | P0 | su-co-dung-cu-audit-fix | doorMode physical\|catalog | **FIXED** |
| SC-02 | PHYSICAL collapse D4 → SET_RECONCILE | taxonomy | Lọc sổ sai | P1 | su-co-po-gaps-fix | typeCode PHYSICAL riêng | **FIXED** |
| SC-03 | Tự xác nhận phiếu mình | confirm | Không four-eyes | P1 | po-gaps | Hard block | **FIXED** |
| SC-04 | CHEMICAL dùng `machineId` | form/attrs | Nhầm sổ | P1 | po-gaps | `chemicalId` + quarantine | **FIXED** |
| SC-05 | Form 1000+ dòng | SuCoReportForm | Bảo trì / chậm | P1 | whole-app | Tách island theo nhóm | **OPEN** |
| SC-06 | FSM phiếu vs BOM_PENDING hai trục | domain | NV hiểu «duyệt» | P1 UX | deep-audit su-co | Copy + doc; không gộp schema vội | **OPEN** |
| SC-07 | Thu hồi mẻ entry | BATCH | QT.24 | P0 | deep-audit 09-04 → 09-08 | Entry rõ | **FIXED** phần |
| SC-08 | Severity grading | — | Pilot đủ | P2 | deep-audit | Sau pilot | **OPEN** |

### 4.4 CSSD — Thiết bị / hóa chất

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| TBHC-01 | Ngưỡng tồn HC không CRUD UI | admin hoa-chat | P0 | **FIXED** 09-07 |
| TBHC-02 | FEFO gộp cận/quá hạn | kho HC | P1 | **FIXED** |
| TBHC-03 | PM ngày UTC lệch VN | bao-tri | P1 | **FIXED** |
| TBHC-04 | Fleet đếm mẻ full-scan | listThietBiFleet | P2 | **OPEN** |
| TBHC-05 | Gỡ quarantine HC chưa UI riêng | specs | P2 | **OPEN** |
| TBHC-06 | Dual CRUD ops/admin | — | — | **OK** tách |

### 4.5 Giám sát VST / GSC

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| GS-01 | % đúng KT / đủ TG / găng chia sai mẫu | VST analytics | P0 | **FIXED** 09-07 |
| GS-02 | GSC % đạt/quan sát | GSC analytics | — | **OK** |
| GS-03 | Chrome lịch sử / ModeNav trùng | lich-su · ModeNav | P2 | **OPEN** declutter |
| GS-04 | Form GSC chuỗi nạp options | giam-sat-chung | P2 | **OPEN** cache |

### 4.6 NKBV

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| NK-01 | Mega-page / 34 file >400 dòng | `/giam-sat-nkbv` | P0 rối | **OPEN** |
| NK-02 | limit 8000 filter path | read actions | P1 | **FIXED** phần (Batch 2/6) |
| NK-03 | UAT checklist lâm sàng chưa ký | D-14 | P1 SP | **OPEN** |
| NK-04 | Trace CSSD↔SSI | RCA panel | P2 | **NEAR-DONE** · UAT |

### 4.7 Quản trị / RBAC / nhân sự / tài khoản

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| QT-HT-01 | Hub 4 việc + catalog | quan-tri | — | **OK** |
| QT-HT-02 | Một cửa tài khoản | tai-khoan / NS | — | **FIXED** cleanup 09-07 |
| QT-HT-03 | Self-reset / 1 admin | auth | P1–P2 | **PARTIAL** |
| QT-HT-04 | Audit UI mỏng | — | P1 | **OPEN** |
| QT-HT-05 | Guest / seed RBAC | ops | P2 | **PARTIAL** (seed Done; sync runtime khi DB) |
| QT-HT-06 | Auth server proxy | `proxy.ts` | — | **DONE-HIST** D-09 |

### 4.8 Đào tạo / QLCV / Dashboard / Offline

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| DT-01 | NHCH limit 5k–10k | dao-tao admin | P1 | **OPEN** |
| QLCV-01 | Nhiệm vụ limit cao / mega page | qlcv | P1 | **OPEN** |
| QLCV-02 | TEXT+CHECK trang_thai | schema | — | **DONE-HIST** |
| DB-01 | CC + BCTH ssr:false nặng | `/` · bao-cao | P1 | **OPEN** island |
| DB-02 | Metric dictionary / filter | analytics | — | **DONE-HIST** scorecard 08 |
| OFF-01 | Offline CSSD extraPayload | sync | — | **DONE-HIST** |
| OFF-02 | Offline GS hydrate phí shell | layout | P2 | **OPEN** mỏng hóa |

### 4.9 Cross-cutting

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| X-01 | Dual surface / nhiều cửa cùng việc | IA | P1 | **PARTIAL** |
| X-02 | Dialog UX chưa đồng đều mọi modal | MDM/CSSD | P2 | **PARTIAL** |
| X-03 | Lookup vs enum unification | MDM registry | P1 | **PLAN** (lookup-ssot 09-07) — chưa ship hết |
| X-04 | Print scorecard | print | — | **DONE-HIST** phần lớn |
| X-05 | Perf Batch 1–2 landed; 3+ residual | whole-app | P1 | **PARTIAL** |
| X-06 | open-backlog P0 code = 0 (08-05); nợ mới 09 chưa ghi ID | debt | P1 process | **OPEN** đăng ký lại |

---

## 5. Nghiên cứu Loại / Bộ / BOM — phương án + khuyến nghị

### 5.1 Hiện trạng code (đã đọc)

```
Loại (cssd_dm_loai_dung_cu)  ←── BOM lines ──→  Bộ (cssd_dm_bo_dung_cu)
        ↑ SKU / Spaulding / số liệu tồn              ↑ tem QR / khoa / vận hành
        └── Chi tiết bộ = dòng BOM (1 bộ × 1 loại active — D6)
```

| Việc | Ai làm hôm nay | Cơ chế |
|------|----------------|--------|
| CRUD form Loại / Bộ / chi tiết | **Chỉ ADMIN** (UI `canWriteMaster` + server `requireCssdCatalogMasterWrite`) | Form QT |
| Đổi chuẩn / thêm-xóa dòng / đổi mã-tên trên **một bộ** | NV lập phiếu cửa **Đổi danh mục** → `BOM_PENDING` → duyệt → `applyApprovedBomLines` | 3-door + hàng chờ QT tab Rà soát |
| Hỏng/Mất | NV — ghi sổ ngay | Cửa physical |
| Chuyển kho↔bộ / bộ↔bộ | NV — phiếu chuyển | Cửa Move (không lên phiếu rà soát — D3) |
| Tạo **Loại mới** / **Bộ mới** có duyệt | **Không có** — phải nhờ admin form | Gap chính |
| Đợt kiểm kê | Mầm `listSetReconcileCampaignAction` + xuất phiếu | Chưa thành workspace |

**Lệch quyền:** BE duyệt BOM chấp nhận `DC_LE.edit` hoặc `BO_DC.edit`; UI tab Rà soát chỉ hiện khi `isAdmin` → tổ trưởng có edit có thể duyệt API nhưng không thấy hàng chờ.

**Rủi ro khoa học:** khi duyệt `DOI_LOAI` kiểu rename (`shouldRename`), cập nhật thẳng bảng **loại master** — không chỉ dòng BOM của bộ đang duyệt.

### 5.2 So sánh phương án

| | A — Staff đề xuất → duyệt → apply (mở rộng 3-door) | B — Module «Rà soát kiểm kê danh mục» riêng | C — Hybrid (khuyến nghị) | D — Giữ admin-centric |
|--|--|--|--|--|
| Ý tưởng | Mọi thay đổi master đi phiếu (kể cả loại/bộ mới) | Workspace kiểm kê + catalog riêng khỏi sự cố & QT | NV CRUD **draft**; publish = Admin/DC; override admin khẩn | Chỉ admin form như D5 cứng |
| Tái dụng | Cao (queue + apply) | Thấp (module mới) | Cao + thêm draft | Có sẵn |
| Gánh admin | Giảm | Giảm nếu phân quyền duyệt | Giảm rõ | Không giảm |
| Rủi ro trùng «Đổi danh mục» sự cố | Trung bình nếu copy kém | Thấp nếu IA rõ | Thấp nếu «biến động bộ» ≠ «đề xuất master» | Thấp nhưng tắc ops |
| Effort | M | L | M | S (không làm) |
| Phù hợp BV103 | Tốt ngắn hạn | Quá nặng 1-admin viện | **Tốt nhất** | Chỉ tạm nếu volume thấp |

### 5.3 Khuyến nghị: **C — Hybrid**

**Trả lời YES/NO:**  
**YES — tách phần rà soát / kiểm kê danh mục** thành **khu vực việc rõ** (tab/workspace),  
**NO — không** dựng module ERP xanh hoàn toàn tách repo/route khổng lồ nếu chưa có volume kiểm kê định kỳ + nhiều người duyệt.

**Điều kiện YES:**
1. Volume đổi loại/BOM thường xuyên do NV (không chỉ admin).  
2. Cần four-eyes trước khi đụng sổ chuẩn.  
3. Muốn kiểm kê đợt (khoa/toàn CSSD) có hàng đợi và lịch sử.  
4. Sẵn sàng **cấm rename loại toàn cục** từ phiếu một bộ.

**Giữ D (admin-centric) chỉ khi:** 1 admin tự nhập hết master, volume thấp, ưu tiên không thêm FSM — chấp nhận tắc và rủi ro lách.

### 5.4 Thiết kế Hybrid chi tiết

#### Vai trò
| Vai trò | Quyền |
|---------|--------|
| NV CSSD / điều dưỡng kho | Tạo draft Loại/Bộ/BOM; lập phiếu kiểm kê; Hỏng/Mất & Chuyển như hiện tại |
| Tổ trưởng / Điều phối (`BO_DC.edit` / `DC_LE.edit`) | Duyệt phiếu BOM + đề xuất Loại/Bộ (publish) |
| ADMIN | Override khẩn (CRUD master thẳng); từ chối; gộp trùng loại; import Excel |
| Viewer RO | `/cssd-dung-cu` — không đề xuất nếu không có quyền create phiếu |

#### Trạng thái
| Entity | States |
|--------|--------|
| Phiếu BOM (đã có) | `DRAFT` → `BOM_PENDING` → `BOM_APPROVED` \| `BOM_REJECTED` |
| Đề xuất Loại / Bộ (mới) | `draft` → `pending` → `approved` (insert master) \| `rejected` |
| Master published | `is_active` như hiện tại |

#### Immediate vs cần duyệt
| Thay đổi | Immediate? | Duyệt? |
|----------|------------|--------|
| Hỏng / Mất (đếm) | Có — ghi sổ | Không (đã tách cửa) |
| Chuyển kho/bộ | Có — phiếu chuyển | Không qua BOM approve |
| Đổi số chuẩn / thêm-xóa dòng BOM / relink loại **đã có** | Không | Có — cửa Đổi DM |
| Đổi mã/tên **master loại** (ảnh hưởng nhiều bộ) | Không | Có — phiếu «Đổi master loại» riêng + hiện số bộ bị ảnh hưởng |
| Tạo Loại mới / Bộ mới | Không | Có — draft → publish |
| Sửa Spaulding / quy cách loại đã publish | Không (mặc định) | Có; admin override khẩn |
| Import hàng loạt | Không | Chỉ ADMIN (+ báo cáo diff) |

#### Loại vs Bộ vs BOM khác nhau thế nào
- **Loại:** SSOT khoa học (SKU). Draft không vào tồn/BOM cho đến khi approved.  
- **Bộ:** thực thể vận hành (QR). Tạo bộ draft có thể gắn khoa; chưa quét chu trình nếu chưa publish (gate nhẹ).  
- **BOM lines:** luôn theo **một bộ**; tái dụng cửa Đổi danh mục; **không** tạo loại mới trong cùng phiếu (bắt chọn loại published hoặc draft-đã-duyệt).

#### Tránh trùng sự cố «Đổi danh mục»
- Giữ **một** engine duyệt (`approveSetReconcileBomAction` + apply core).  
- Đổi **copy IA**: cửa sự cố = «Đề xuất đổi thành phần bộ (chờ duyệt)»; tab QT = «Hàng chờ duyệt danh mục».  
- Workspace Hybrid = cùng hàng chờ + thêm «Đề xuất Loại/Bộ» — **không** nhân bảng sự cố an toàn PROCESS/BATCH.

#### Màn hình (tối thiểu)
1. QT Dụng cụ — giữ 4 tab; mở rộng **Rà soát** cho approver không chỉ admin UI.  
2. Dialog «Đề xuất loại mới» từ NV (không mở form master).  
3. (Tuỳ chọn đợt 2) Tab/filter «Đợt kiểm kê» tái dùng campaign.actions.  
4. CSSD RO: nút «Đề xuất đổi» deep-link cửa catalog — không CRUD.

#### Migration từ hiện tại
1. Không đổi schema lớn pha 1: dùng `cssd_fact_su_co` attributes cho BOM như nay; draft Loại có thể bảng mỏng `cssd_dm_loai_dung_cu_proposal` **hoặc** JSON proposal trên sys — chọn khi design slice.  
2. Chặn rename global trong `applyDoiLoaiLine` ngay (pha 0) — relink-only trừ phiếu master.  
3. Align UI Rà soát với BE permission.  
4. Sync doc D5/IA (tab Loại).  
5. UAT 5 kịch bản: đề xuất loại → duyệt → gắn BOM; đổi chuẩn; từ chối; admin override; kiểm kê một khoa.

#### Rủi ro Hybrid
| Rủi ro | Giảm |
|--------|------|
| Hai hàng chờ lệch | Một list duyệt SSOT |
| NV nhầm draft = đã dùng được | Badge «Nháp» + gate quét |
| Over-process chậm ca | Override admin + SLA copy |
| Scope creep module B | Cấm route mới lớn pha 1 |

---

## 6. Kế hoạch khắc phục theo đợt

### Đợt 0 — Chốt + an toàn sổ (3–5 ngày) · Effort **S–M**

| Goal | Khóa mô hình governance + vá P0 rename + sync doc |
| Items | (1) User chốt Hybrid C vs A/D · (2) Chặn/confirm rename loại global trong apply · (3) Align tab Rà soát với quyền duyệt · (4) Sync `quan-ly-dung-cu-luong` + `domain-decisions` §IA (tab Loại) · (5) Đăng ký ID nợ 09 vào backlog |
| Deps | Quyết định user mục 7 |
| AC | Không còn rename thầm master từ phiếu một bộ; doc khớp tab; approver non-admin thấy hàng chờ nếu có quyền edit |

### Đợt 1 — Catalog governance Hybrid MVP · Effort **M** · *(phase riêng)*

| Goal | NV đề xuất Loại (+ mở rộng BOM) không đụng form master |
| Items | Draft Loại → pending → approve insert; Dialog đề xuất; hàng chờ thống nhất; copy tách «sự cố an toàn» vs «đề xuất danh mục»; cấm THEM_DONG tạo loại ảo |
| Deps | Đợt 0 |
| AC | NV tạo đề xuất loại → admin/điều phối duyệt → loại hiện master → gắn BOM; reject không ghi master; audit ai duyệt |

### Đợt 2 — Kiểm kê đợt + Bộ draft (tuỳ volume) · Effort **M**

| Goal | Workspace đợt kiểm kê khoa; đề xuất Bộ mới có duyệt |
| Items | UI trên campaign.actions; xuất/phiếu kiểm kê; Bộ draft; báo cáo lệch chuẩn vs đếm |
| Deps | Đợt 1 |
| AC | Một khoa chạy kiểm kê 20 bộ: lệch → phiếu → duyệt → sổ khớp |

### Đợt 3 — An toàn quy trình residual · Effort **M**

| Goal | Implant CHO_BI write+gate; in lại tem từ Kho/Trace; UAT reform CSSD |
| Items | Persist quarantine; chặn CP; nút in tem đủ trường; checklist pilot cập nhật |
| Deps | Không phụ thuộc Dual catalog |
| AC | Vitest + 3 kịch bản tay implant/tem/giao khoa |

### Đợt 4 — Perf / mega-surface · Effort **L** (cắt lát)

| Goal | Giảm chậm cảm nhận ca trực |
| Items | NKBV lazy/workspace; SuCo form islands; NHCH/QLCV page; shell permission snapshot nhẹ |
| Deps | Baseline đo (đã có hướng whole-app) |
| AC | First paint 5 màn nóng giảm rõ (ms/KB/#row) so baseline |

### Đợt 5 — Giám sát / quản trị polish · Effort **S–M**

| Goal | Declutter GS; audit UI tối thiểu; lookup SSOT theo plan |
| Items | ModeNav/chrome; sổ audit TK; pha lookup không phá fact |
| Deps | Đợt 4 không bắt buộc |
| AC | PO đọc được «ai reset TK»; % VST không regress |

### Đợt 6 — UAT ký & nợ Wave 4 · Effort **S** + lịch khoa

| Goal | Đóng P1 sản phẩm |
| Items | UAT-NKBV; UAT-REFORM; Spaulding map tram thật; FHIR vẫn defer |
| AC | Chữ ký checklist |

**Không hứa:** rewrite NKBV một PR; module B full; hard-block cấp phát BOM; dual-admin bắt buộc; HIS/LIS.

---

## 7. Rủi ro / giả định / việc cần user chốt

### Giả định
- Pilot vẫn **1 admin** chính + vài NV CSSD.  
- Soft-warning thiếu BOM **giữ** (không hard-block).  
- 3 cửa dụng cụ **giữ** (không gộp Hỏng/Mất vào đổi DM).  
- Local tree là nguồn đúng; một phần đã vá 09 chưa deploy prod — roadmap tính trên **code local**.

### Rủi ro
- Làm Hybrid quá sớm trước khi chặn rename → nhân bản sai loại.  
- Nhân «module kiểm kê» song song sự cố → 2 sổ duyệt.  
- Perf rewrite NKBV làm trễ governance (ưu tiên sai).  
- Doc không sync → vòng UX giấu Loại lặp lại.

### Cần user chốt
1. **Governance:** C Hybrid (khuyến nghị) / A mở rộng phiếu / D giữ admin?  
2. **Ai được duyệt BOM/Loại:** chỉ ADMIN hay cả `BO_DC.edit` (tổ trưởng)?  
3. **Rename loại:** cấm từ phiếu bộ, hay cho phép kèm màn hình impact?  
4. **Có chạy kiểm kê định kỳ theo khoa không?** (nếu không → trì hoãn Đợt 2)  
5. **Ưu tiên song song:** Catalog Đợt 1 vs Implant CHO_BI vs NKBV UAT — xếp 1–2–3?  
6. Có được phép **sửa code** Đợt 0 (chặn rename) ngay sau khi chốt, hay chỉ doc?

---

## 8. Phụ lục — nguồn đã đọc

### Agent notes 09/2026 (`docs/archive/agent-notes/202609/`)
- `_agent-dung-cu-loai-proposal-20260907.md` — trả tab Loại  
- `_agent-su-co-dung-cu-audit-fix-20260908.md` · `_agent-su-co-bao-cao-deep-audit-20260908.md` · `_agent-su-co-po-gaps-fix-20260908.md`  
- `_agent-quy-trinh-dung-cu-domain-audit-20260908.md` · `_agent-quy-trinh-sw-process-fix-20260908.md`  
- `_agent-thiet-bi-hoa-chat-reaudit-20260907.md`  
- `_agent-vst-tuan-thu-audit-20260907.md` · `_agent-vst-tuan-thu-reaudit-calc-ui-20260907.md`  
- `_agent-quan-tri-eval-cleanup-20260907.md` · `_agent-admin-auth-review-20260907.md`  
- `_agent-whole-app-complexity-perf-20260907.md` · `_agent-perf-fix-progress-20260907.md` · `_agent-perf-batch6-plus-plan-20260907.md` · `_agent-perf-complexity-rootcause-20260907.md` · `_agent-perf-batch8-ssr-shell-spike-20260907.md`  
- `_agent-lookup-ssot-unification-plan-20260907.md`  
- `_agent-deep-audit-20260904.md` · `_agent-standardization-review-20260904.md` · `_agent-task-p0-next.md`

### SSOT / debt / backlog
- `docs/ssot-map.md` · `docs/core/domain-decisions-cssd-instrument.md` · `docs/modules/cssd/{README,domain-overview,quan-ly-dung-cu-luong}.md`  
- `docs/reference/architecture/{debt-register,open-backlog-20260731}.md`  
- `docs/reference/reports/{gap-register-20260709,full-system-audit-po-20260805,ksnk-bv103-compendium-20260824}.md`

### Code hot paths
- `src/app/**/page.tsx` (bản đồ route)  
- `src/lib/nav/sidebar-nav-groups.ts` · `sidebar-admin-nav-groups.ts`  
- `src/modules/quan-tri-he-thong/danh-muc/dung-cu/QuanLyDungCuPage.tsx` · Loai/Bo pages  
- `src/lib/domain/cssd-catalog-master-write.ts` · `src/lib/master-data/{require-cssd-catalog-master-write,cssd-set-bom-apply-core}.ts`  
- `src/modules/cssd-su-co/actions/set-reconcile-approve.actions.ts` · `set-reconcile-campaign.actions.ts`  
- `src/lib/domain/cssd-set-reconcile.ts`

### Không phủ đủ
- Từng RPC SQL / mọi migration sau 08 · toàn bộ e2e Playwright · mọi panel NKBV 2k dòng · prod runtime metrics · Docker golden (OPS-DB-01).

---

**Boy Scout docs (pass này):** đã sync `quan-ly-dung-cu-luong.md` + `domain-decisions-cssd-instrument.md` §IA (sheet → tab Loại). Không sửa `src/`.

---

## Quyết định user 09-09: Hybrid C · Đợt 0 started · **full 2-tier shipped local**

- User **chốt Hybrid C** (NV draft Loại/Bộ/BOM → duyệt → publish; ADMIN override).
- **Đợt 0 started** (local): chặn rename master loại từ phiếu một bộ; align tab Rà soát với `BO_DC.edit`/`DC_LE.edit`; xem `docs/modules/cssd/_agent-catalog-hybrid-c-dot0-20260909.md`.
- Mục 7 câu 1–3–6: **đã trả lời** (C · cấm rename từ phiếu bộ · được sửa code Đợt 0).
- **2026-09-09 tiếp:** Dual-approve L1 (NV peer) → L2 (ADMIN publish) cho BOM + đề xuất Loại/Bộ; doc `_agent-catalog-hybrid-c-full-2tier-20260909.md`.

*Hết báo cáo. Pass này: docs only — không commit.*
