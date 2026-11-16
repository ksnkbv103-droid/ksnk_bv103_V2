# KH_APPKSNK_20261116 — Làm gọn mã tất cả module

Trạng thái: CHỜ PO DUYỆT · lập 2026-11-16 · chưa xóa/sửa dòng mã nào
Nguồn: yêu cầu PO 2026-11-16 («rà soát chi tiết tất cả các module còn lại, từ đó lên kế hoạch chi tiết làm gọn sạch, tinh tất cả các module; file/action xóa là thứ không phục vụ hoạt động của phần mềm; chưa có người dùng thật nhưng vẫn cần thiết thì không được xóa») · PO «Chưa xóa» (cùng ngày, sau vòng rà NKBV) · quyết định PO 2026-11-06 #2 (không xóa file chết khi PO chưa xem danh sách), #3 (giữ hai nguồn công thức RPC + TS), #4 (giữ `ty_le_ccs`).
Nơi đo: worktree `integrate-2026-11`, nhánh `integrate/2026-11`, HEAD `1333d47e`.

## 0. Thuật ngữ (một khái niệm một tên)

Viết tắt đường dẫn trong bảng: `m/` = `src/modules/`.

| Tên | Nghĩa |
|---|---|
| Mồ côi | File không được file nào import (kể cả spec) |
| Chỉ test | File chỉ được spec import, không có nơi gọi lúc chạy |
| Chết qua export | File còn được import tên nhưng mọi export của nó không ai dùng |
| Export chết | Một export (hàm/hằng, không tính type) không được dùng ở đâu, kể cả trong chính file |
| Stub | Action chỉ trả lỗi «đã đóng» hoặc trả rỗng, không làm việc gì |
| Shim | File chỉ tái xuất (`export … from`) cho đường import cũ |
| Mirror | Bản TypeScript của một công thức đã có trong SQL/RPC (PO #3: giữ) |
| Probe | Lời gọi `tableHasColumn(...)` dò cột lúc chạy rồi rẽ nhánh |

**Nhãn** (mỗi ứng viên đúng một nhãn):

- **XÓA** — đủ cả hai: (a) 0 nơi gọi lúc chạy (route, component, action, script); (b) một trong: đã có thứ thay thế đang sống (nêu `file:dòng`) · là stub · là shim 0 import · thuộc tính năng PO đã rút có ghi nhận.
- **GIỮ** — chưa có nơi gọi nhưng thuộc quy trình/đặc tả (QT, mã lỗi sổ), là mirror (PO #3), là thư viện UI cho lát đã lên lịch, hoặc là helper của spec.
- **HỎI PO** — ngưỡng/logic lâm sàng, mẫu in theo biểu mẫu, file ghi `@park`, hoặc tính năng không rõ còn cần. **PO không trả lời = GIỮ.**

## 1. Yêu cầu PO → tiêu chí đo

| Mã | Yêu cầu PO | Tiêu chí đo |
|---|---|---|
| YC1 | Rà chi tiết tất cả module còn lại | §2 có số cho cả 23 đơn vị mã; §3 có bảng cho mọi đơn vị có ứng viên; 52/52 file do máy quét liệt kê đều có nhãn (lệnh đối chiếu ở §2) |
| YC2 | Kế hoạch chi tiết làm gọn tất cả module | §6: mỗi lát ≤ 8 file, có lệnh verify và con số đạt |
| YC3 | Chỉ xóa thứ không phục vụ hoạt động phần mềm | Nhãn XÓA chỉ gán khi đủ (a) + (b) ở §0, mỗi dòng có bằng chứng `file:dòng` |
| YC4 | Cần thiết dù chưa có người dùng thật thì không xóa | Nhãn GIỮ / HỎI PO; im = GIỮ; §7 gom câu hỏi một lần |

## 2. Số đo hiện tại (2026-11-16, tại worktree integrate-2026-11)

Cách đo: quét tĩnh bằng TypeScript compiler API (script tạm, sẽ đưa vào repo ở lát L0), kiểm lại từng ứng viên bằng `git grep` + `git log`. Số dòng từng file theo máy quét; tổng theo nhãn đo bằng `wc -l` (lệch vài dòng do dòng trống cuối file).

**Toàn repo:** 1.299 file mã chạy / 186.597 dòng · mồ côi 29 file / 3.388 dòng · chỉ test 18 / 1.239 · chết qua export 5 / 357 · export chết (không type) 105 · đoạn trùng ≥ 10 dòng: 64 đoạn / 1.256 dòng (0,7%).

**Tổng theo nhãn (file nguyên):**

| Nhãn | File | Dòng | Ghi chú |
|---|---|---|---|
| XÓA | 36 xóa nguyên + 1 spec sửa một phần | 2.690 + 103 | 30 file máy quét liệt kê + 6 file đi kèm xóa nguyên (5 spec của mã bị xóa, 1 file stub LabID) + `src/lib/master-data/instrument-issue-core.spec.ts` (103 dòng: chỉ bỏ ca gọi mã bị xóa, giữ các ca còn lại) |
| HỎI PO | 11 | 1.504 | + `m/cssd-erp/actions/cssd-write.actions.ts` (206 dòng) tùy câu 1 và 2 ở §7 |
| GIỮ | 10 | 701 | |

Đối chiếu nhãn với máy quét: mồ côi 29 = 21 XÓA + 8 HỎI PO · chỉ test 18 = 7 XÓA + 8 GIỮ + 3 HỎI PO · chết qua export 5 = 2 XÓA + 2 GIỮ + 1 theo câu hỏi. Ngoài file nguyên: ~57 export/action chết trong file còn sống (§3) và 33 export chết trong engine lâm sàng NKBV (§3.9, mặc định GIỮ).

**Theo đơn vị mã** (cột «chết» = mồ côi + chỉ test + chết qua export, file/dòng; «exp» = export chết không type, trong ngoặc là action; «cc≥25» = số hàm có độ phức tạp vòng ≥ 25):

| Đơn vị | File | Dòng | Chết | Exp | Trùng | cc≥25 |
|---|---|---|---|---|---|---|
| giam-sat-nkbv | 186 | 49.242 | 11 / 2.087 | 39 (6) | 26 | 69 |
| cssd-erp | 224 | 31.648 | 12 / 941 | 13 (9) | 14 | 28 |
| src/lib | 262 | 25.471 | 16 / 1.259 | 25 (0) | 4 | 26 |
| quan-ly-cong-viec | 92 | 13.155 | 0 | 6 (3) | 4 | 10 |
| giam-sat-chung | 89 | 11.821 | 0 | 1 (1) | 3 | 11 |
| cssd-su-co | 53 | 10.469 | 2 / 259 | 5 (0) | 1 | 16 |
| src/components | 73 | 8.335 | 2 / 93 | 7 (0) | 2 | 6 |
| quan-tri-he-thong | 43 | 6.493 | 4 / 35 | 5 (0) | 1 | 4 |
| giam-sat-vst | 52 | 6.129 | 2 / 10 | 1 (0) | 4 | 6 |
| dashboard | 41 | 6.101 | 2 / 206 | 1 (0) | 0 | 5 |
| dao-tao | 24 | 5.003 | 0 | 0 | 0 | 0 |
| src/app | 92 | 3.287 | 0 | 0 | 0 | 0 |
| to-chuc | 27 | 3.168 | 0 | 0 | 4 | 2 |
| chat-thai-do-vai | 7 | 2.301 | 0 | 0 | 1 | 0 |
| src/hooks | 21 | 2.162 | 1 / 94 | 2 (0) | 0 | 0 |
| dieu-hanh-khoa, auth, src/contexts, giam-sat-hub, src/proxy.ts, entity-qr, src/types, src/instrumentation.ts | 13 | 1.812 | 0 | 0 | 0 | 0 |

## 3. Bảng ứng viên theo module

### 3.1 cssd-erp (kể cả phần CSSD nằm ở `src/lib/master-data`)

| Ứng viên | Dòng | Nhãn | Bằng chứng |
|---|---|---|---|
| `m/cssd-erp/contexts/instrument-catalog/admin/CatalogDeNghiApproveQueue.tsx` | 133 | XÓA | Mồ côi; màn duyệt đang sống: `m/dieu-hanh-khoa/PheDuyetDungCuPanel.tsx:7-14` |
| `…/admin/SetReconcileApproveQueue.tsx` | 115 | XÓA | Như trên |
| `m/cssd-erp/contexts/sterilization-batch/entrypoint.ts` | 5 | XÓA | Trùng `contexts/processing-lifecycle/entrypoint.ts:5`; route `src/app/cssd-quy-trinh/page.tsx:35-38` dùng bản kia |
| `m/cssd-erp/contexts/processing-lifecycle/station-flow.ts` | 6 | XÓA | Shim 0 import |
| `m/cssd-erp/actions/cssd-asset.actions.ts` | 26 | XÓA | `:11 dieuChuyenThanhPhanGiuaHaiQrAction` là stub («Đã đóng… không còn caller runtime»); chỉ `actions/read.actions.ts:3` tái xuất → gỡ luôn dòng đó |
| `m/cssd-erp/actions/cssd-kho-history.actions.ts` | 70 | XÓA | `fetchCssdKhoGiaoDichHistory` 0 nơi gọi; bản sống `contexts/instrument-catalog/admin/kho-dung-cu-giao-dich.actions.ts:29` |
| `m/cssd-erp/components/batch/me-tiet-khuan-qc-primitives.tsx` | 45 | XÓA | `PassFailToggle` 0 nơi dùng |
| `src/lib/master-data/cssd-set-bom-apply-core.ts` | 200 | XÓA | `supabase/migrations/20261021010000_cssd_apply_bom_lines_tx.sql:19`: «applyApprovedBomLines (TS) không còn caller» — RPC đã thay |
| `src/lib/master-data/cssd-instrument-ops.actions.ts` + `cssd-instrument-ops.spec.ts` | 57 + 10 | XÓA | Stub D1/D2; chỉ spec của chính nó gọi (`:5`) |
| `src/lib/master-data/append-chi-tiet-issue-note.action.ts` | 24 | XÓA | Chỉ spec gọi |
| `m/cssd-erp/workflow/application/instrument-issue-core.ts` + spec cùng tên | 158 + 25 | XÓA | `:88 @deprecated`; chỉ spec và 2 file stub trên gọi |
| `src/lib/master-data/instrument-issue-core.spec.ts` | 103 | XÓA một phần | Ca test `buildChiTietIssueNoteText` (`:2`) đang phủ hàm sống ở `workflow/domain/instrument-issue-note.ts` → **chuyển import, giữ ca**; chỉ bỏ ca gọi mã bị xóa (`:51`, `:58`) |
| `m/cssd-erp/shared/domain/cssd-quy-trinh-metadata.ts` + spec | 8 + 23 | XÓA | Chỉ spec dùng |
| `shared/application/cssd-quy-trinh-bom.ts:173 transferBomLineBetweenQuyTrinh` | – | XÓA | Export chết |
| `actions/cssd-report-read.actions.ts:649 fetchCssdAnalyticsBriefSummary` | – | XÓA | Action 0 nơi gọi |
| `actions/cssd-print.actions.ts:349 fetchCssdBatchTraceByMaLo` | – | XÓA | `cssd-qr-history.actions.ts:20` gọi thẳng hàm lõi |
| `contexts/instrument-catalog/admin/loai-dung-cu.actions.ts:110 listActiveTramCssdForLoaiAction` | – | XÓA | Họ hàm `@deprecated CSSD-10` (`src/lib/master-data/cssd-loai-dung-cu-map.ts:197,203,278`) |
| `actions/cssd-register-label.actions.ts:39 listActiveBoDungCuForCssdLabel` | – | XÓA | UI truyền `boId` thẳng (`bo-dung-cu-print-qr-button.tsx:7,25`, `views/CSSDCatalogBoTab.tsx:10,48`) |
| `shared/ui/cssd-ui-chrome.ts:13,19` · `views/cssd-catalog-page-helpers.ts:17 boIdsForLoai` | – | XÓA | Hằng/hàm 0 nơi dùng |
| `components/inventory/PackConditionSelect.tsx` + `actions/cssd-write.actions.ts:27 recordPackCondition` | 82 | GIỮ · HỎI PO nối vào đâu | QT.22 tình trạng gói; nơi gắn bị gỡ ở commit `3ed708bf`; `src/lib/domain/cssd-pack-issuance.ts:40,95,199` vẫn đọc `tinh_trang` |
| `actions/cssd-write.actions.ts:79 importCSSDData` + `actions/cssd-read.actions.ts:265 getCSSDImportExportData` | – | HỎI PO | Nạp/xuất Excel kho, 0 nơi gọi |
| `actions/cssd-read.actions.ts:319 getCssdStationFlowMap` | – | HỎI PO (đề xuất xóa) | Nơi gọi bị gỡ ở `f7b197b5` |
| `components/print/CssdPrintQcProofTable.tsx` (+ `lib/cssd-print-format.ts:401 buildCssdQcProofRows`) | 87 | HỎI PO | Mẫu in, có dòng ở `scripts/readiness/mau-in-anh-xa.json:88` |
| `actions/cssd-workflow.commands.actions.ts:68 cssdCommandFreezeSet`, `:110 cssdCommandReleaseSet` | – | GIỮ | Mã lỗi sổ CSSD-025 (`scripts/readiness/so-loi.json:1345`) |
| `src/lib/master-data/cssd-set-bom-plan.ts` | 156 | GIỮ | Mirror RPC (PO #3) |
| `src/lib/domain/cssd-packaging-shelf-life.ts` | 24 | GIỮ | Mirror `20261005145000_cssd_me05_hsd_bao_goi.sql` (PO #3) |

Không xóa `m/cssd-erp/workflow/domain/instrument-issue-note.ts` (đang sống: `m/cssd-su-co/application/void-incident.application.ts:3`).

### 3.2 cssd-su-co

| Ứng viên | Dòng | Nhãn | Bằng chứng |
|---|---|---|---|
| `components/InstrumentIncidentFields.tsx` | 251 | XÓA | Thay bằng `m/cssd-erp/components/inventory/InstrumentDecommissionForm.tsx:12,48` + `InstrumentTransferForm.tsx:10,39` |
| `components/su-co-report-form.helpers.ts` | 8 | XÓA | Shim 0 import |
| `application/set-reconcile-incident.application.ts:115 applySubmittedSetReconcile` · `application/set-reconcile-ledger.application.ts:103 applySetReconcileEngravedCodes` | – | XÓA (đọc thân trong lát) | RPC `fn_cssd_apply_bom_lines_tx` đã thay; nếu thân còn nhánh RPC chưa phủ → chuyển GIỮ |
| `domain/cssd-incident-trace.ts:51,56` · `domain/cssd-incident-void.ts:34` | – | XÓA | Hằng 0 nơi dùng |

### 3.3 dashboard

| Ứng viên | Dòng | Nhãn | Bằng chứng |
|---|---|---|---|
| `components/comprehensive/ComprehensiveDimensionCompare.tsx` | 158 | HỎI PO (đề xuất xóa) | `@park — 2026-11: BCTH không còn bảng 2 cột` |
| `actions/dashboard-muc-tieu-kpi.actions.ts` | 48 | HỎI PO (đề xuất xóa) | `fetchMucTieuKpiVien` 0 nơi gọi từ `f5ba649f`; lúc chạy dùng `SUPERVISION_COMPLIANCE_THRESHOLDS`; action còn nằm trong nợ bảo mật `scripts/data/security-baseline-allow.json:10` |
| `lib/bao-cao-tong-hop-thresholds.ts:11 BAO_CAO_TONG_HOP_THRESHOLDS` | – | XÓA | Alias `@deprecated` 0 nơi dùng |

### 3.4 giam-sat-vst · giam-sat-chung

| Ứng viên | Dòng | Nhãn | Bằng chứng |
|---|---|---|---|
| `m/giam-sat-vst/actions/index.ts` + `actions/vst-strategic.actions.ts` | 6 + 4 | XÓA | Barrel 0 import |
| `m/giam-sat-vst/lib/vst-constants.ts:42 momentWhoNumber` | – | XÓA | Export chết |
| `m/giam-sat-chung/bang-kiem/actions/bang-kiem-write.actions.ts:347 importTieuChis` | – | HỎI PO | Nạp tiêu chí bảng kiểm, 0 nơi gọi |

### 3.5 quan-ly-cong-viec

| Ứng viên | Nhãn | Bằng chứng |
|---|---|---|
| `actions/cong-viec-list.actions.ts:77 getCongViecList` | XÓA | Alias 0 nơi gọi |
| `actions/cong-viec-read.actions.ts:91 getTrangThaiMauSacMap` | XÓA | 0 nơi gọi; nằm trong nợ bảo mật `security-baseline-allow.json:11` |
| `lib/ke-hoach-nam-format.ts:97 defaultPeriodFilterNow` | XÓA | Trùng bản đang dùng `components/NhiemVuPanel.tsx:37` |
| `lib/qlcv-labels.ts:30 QLCV_TRANG_THAI_TEN` · `lib/qlcv-staff-ids.ts:26 formatQlcvCiSummary` | XÓA | Export chết |
| `actions/cong-viec.actions.ts:482 adminSetTrangThaiCongViec` | GIỮ · HỎI PO nối UI | Mã lỗi sổ QLCV-06 |

### 3.6 quan-tri-he-thong

| Ứng viên | Dòng | Nhãn | Bằng chứng |
|---|---|---|---|
| `danh-muc/actions/danh-muc-hybrid.types.ts` · `actions/mdm-gateway.types.ts` | 16 · 15 | XÓA | Mồ côi |
| `danh-muc/actions/danh-muc-permission-map.ts` · `danh-muc/actions/master-table-permission-map.ts` | 2 · 2 | XÓA | Shim; chỉ 2 spec cùng thư mục dùng (`…spec.ts:2`). Bản thật ở `src/lib/master-data/` → **đổi dòng import của 2 spec, giữ ca test** |
| `tai-khoan-nhan-su/lib/account-access-request-store.ts:61,104,171,193` · `account-access-request.ts:104` | – | XÓA (đọc thân trong lát) | Export chết; chưa đọc thân → không chắc thì GIỮ |

### 3.7 src/hooks · src/lib · src/components

| Ứng viên | Dòng | Nhãn | Bằng chứng |
|---|---|---|---|
| `src/hooks/useMasterDataCrud.ts` | 93 | XÓA | `git grep` chỉ thấy chính nó |
| `src/hooks/use-body-scroll-lock.ts:86` (`@deprecated`) · `src/hooks/useBv103Chrome.ts:8` | – | XÓA | Export chết |
| `src/lib/constants.ts` | 7 | XÓA | `ADMIN_EMAILS = []`, 0 nơi dùng |
| `src/lib/bv103-feature-config.ts` + spec | 32 + 28 | XÓA | `isModuleEnabled` không nơi nào lúc chạy gọi; kèm sửa `package.json:120` (`test:pilot`) và 1 dòng `docs/core/pilot-core-modules-go-live.md:14` |
| 25 export chết trong 15 file `src/lib` (danh sách ở lát L11) | – | XÓA | Hằng/hàm 0 nơi dùng, không phải ngưỡng lâm sàng |
| `src/lib/analytics/SupervisionActionBoard.tsx` (+ `supervision-source-lens.ts:88 buildActionBoardFromGap`) | 161 | HỎI PO (đề xuất xóa) | `@park` BCTH-08 |
| `src/lib/domain/giam-sat-chung.domain.ts` | 33 | HỎI PO | `classifyGscCompliance` ngưỡng ≥ 90 / ≥ 80, chỉ spec dùng |
| `src/lib/analytics/pdca-remeasure.ts` | 155 | HỎI PO | Dính PO #4 (`ty_le_ccs`) |
| `src/lib/domain/gsc-doi-tuong-from-topic.ts` | 42 | HỎI PO | Chỉ spec dùng |
| `src/lib/domain/gsc-orphan-criterion-merge.ts`, `gsc-orphan-criterion-resolve.ts`, `gsc-loai-compliance-filter.ts`, `gsc-canonical-36-scoring.ts` | – | GIỮ | Mirror SQL (PO #3); `package.json:46` |
| `src/lib/testing/migration-file.ts` | – | GIỮ | Helper của 8 spec |
| `src/components/ui/bv103/chip-stat.tsx`, `panel.tsx`, `field.tsx:9`, `ui/dialog.tsx:165` (7 export) | 93 | GIỮ | Thư viện UI cho redesign Lát 2 (`docs/ux/ui-redesign-plan.md:171`); `DialogClose` có chủ đích |

### 3.8 Module không có ứng viên

dao-tao, to-chuc, chat-thai-do-vai, src/app, auth, dieu-hanh-khoa, giam-sat-hub, entity-qr, src/contexts, src/types: 0 file chết, 0 action chết.

### 3.9 giam-sat-nkbv

| Ứng viên | Dòng | Nhãn | Bằng chứng |
|---|---|---|---|
| `components/NkbvCaseEditor.tsx` | 421 | XÓA | Đầu file: `@deprecated KHÔNG SỬ DỤNG TRỰC TIẾP CHO LUỒNG TẠO/SỬA CA NKBV MỚI`; 0 import |
| `components/NkbvBaCaseSheet.tsx` | 531 | XÓA | «Cùng logic / UI với modal danh sách phiếu»; modal sống là `NkbvClinicalChecklistModal`; 0 import |
| `components/NkbvClinicalWindowStrip.tsx` · `hooks/useSyncedVerticalScroll.ts` · `hooks/useSyncedHorizontalScroll.ts` | 46 · 39 · 36 | XÓA | 0 import |
| `actions/giam-sat-nkbv-labid.actions.ts` (+ dòng `actions/giam-sat-nkbv.actions.ts:14`) | 28 | XÓA | LabID PO đã rút (`docs/core/implementation-mapping.md:153,176,182`, migration `20260827120000`); `:20` trả `[]`, `:25` trả lỗi `LABID_OFF` |
| `lib/nkbv-labid-engine.ts` + spec | 140 + 54 | XÓA | Chỉ spec của chính nó dùng |
| `components/NkbvDeviceRegistryPanel.tsx` | 55 | XÓA | Mồ côi |
| `actions/giam-sat-nkbv-device-registry.actions.ts:69 upsertNkbvDeviceRegistry`, `:79 softDeleteNkbvDeviceRegistry`, `:35 listNkbvDeviceRegistry` | – | XÓA | 2 stub + 1 hàm chỉ panel trên gọi. **GIỮ** `:84 getDevicePrefillForStay`, `:106 previewMauSoFromDeviceRegistryAction` (NKBV-019) |
| `actions/giam-sat-nkbv-write.actions.ts:74 createGiamSatNkbvCa` | – | XÓA | Stub trả lỗi «Phiếu mới chỉ tạo từ Hub bệnh án…» |
| `actions/giam-sat-nkbv-ba-timeline.actions.ts:14 listNkbvBaTimelineManual` | – | XÓA | 0 nơi gọi; 4 action ghi cùng file vẫn sống |
| `components/NkbvBaGridCasePrintView.tsx` | 246 | HỎI PO (đề xuất xóa) | «Biên bản/phiếu xác định ca NKBV — BM.01/QT.33»; bản in BM.01 đang sống: `NkbvCasePrintView.tsx:161` qua `NkbvClinicalChecklistModal.tsx:10`; có dòng ở `mau-in-anh-xa.json:64,71` |
| `components/NkbvChecklistKsnkTab.tsx` + `NkbvCdcMetricsPanel.tsx` | 157 + 346 | HỎI PO | Bảng chỉ số CDC không còn hiển thị (tab mồ côi, `:8` import panel); phán quyết KSNK vẫn sống (`NkbvClinicalChecklistModal.tsx:12,569-573`) |
| `lib/nkbv-chapter17-clinical.ts` | 70 | GIỮ | Facade Ch.17, điểm vào của spec lâm sàng |

**33 export chết ngoài action (4 ngưỡng + 4 trùng tên + 25 còn lại) — mặc định GIỮ đợt này** (nằm trong engine lâm sàng; CLAUDE.md: không viết lại engine lâm sàng). Chỉ liệt kê:

- Ngưỡng lâm sàng (GIỮ, không xóa cơ học): `lib/nkbv-mbi-ch4.ts:28,29,30,33`.
- Trùng tên với hàm đang sống ở chỗ khác (phải kiểm bản nào được gọi, không xóa theo số đếm): `lib/nkbv-ba-analysis-session.ts:339` và `lib/nkbv-specimen-syndrome.ts:195` (`nghiNgoFromPanel`); `lib/nkbv-bsi-timeline-verdict.ts:319` và `lib/nkbv-pneu-timeline-verdict.ts:419` (`ageYearsFromNgaySinh`).
- Còn lại: `components/NkbvBaDayGrid.tsx:16` · `lib/nkbv-ba-day-row-tone.ts:26` · `lib/nkbv-ba-device-timeline.ts:56,65` · `lib/nkbv-ba-master-columns.ts:11` · `lib/nkbv-clinical-symptom-catalog.ts:1084,1267` · `lib/nkbv-index-event-disposition.ts:373` · `lib/nkbv-loai-labels.ts:46,54,345` · `lib/nkbv-pneu-lab-tier.ts:576` · `lib/nkbv-rate-display.ts:43,56` · `lib/nkbv-secondary-bsi-gate.ts:223,237` · `lib/nkbv-shared-device-days.ts:92` · `lib/nkbv-specimen-syndrome.ts:199` · `lib/nkbv-ssi-nhsn-catalog.ts:36` · `lib/nkbv-ssi-reporting-contract.ts:14` · `lib/nkbv-symptom-timeline-bridge.ts:27,111,139,143` · `lib/nkbv-vi-sinh-template.ts:32`.

Tồn từ vòng rà NKBV (không thuộc lát xóa): fallback «migration chưa apply» `actions/giam-sat-nkbv-write.actions.ts:741-772` (§4 nhóm B) · `submitClinicalVerification` `:276-782` cc 139, 0 spec (§5) · 3 khối giống nhau `giam-sat-nkbv-ba-analysis.actions.ts:596-610, 646-660, 704-718` (§5).

## 4. Giả định không còn đúng

### A. Probe `tableHasColumn` — 18 nơi gọi

Lệnh đếm: `git grep -n "tableHasColumn(" -- src ':!*.spec.ts' | grep -v "export async function tableHasColumn" | wc -l` → **18** (định nghĩa: `m/cssd-erp/shared/cssd-db-utils.ts:26`).

| Nhóm | Số | Nơi gọi | Cột dò | Kết luận |
|---|---|---|---|---|
| A1 | 12 | `m/cssd-erp/actions/cssd-workflow-ops.actions.ts:26` · `cssd-workflow.commands.actions.ts:53,71` · `m/cssd-erp/workflow/application/cssd-workflow-application.ts:93,100` · `m/cssd-su-co/application/su-co-report.application.ts:238,239,309,310,313` · `void-incident.application.ts:154,157` | `is_dong_bang`, `ma_vai_tro_bo`, `quy_trinh_cha_id`, `is_red_alert`, `cssd_fact_su_co.quy_trinh_id / loai_su_co_id / nguoi_bao_id` | Cột có trong baseline `20260530000000_init_pilot_baseline.sql` → probe luôn đúng, nhánh «Phiên bản DB chưa hỗ trợ…» không bao giờ chạy → **gỡ (L12)** |
| A2 | 3 | `m/cssd-erp/actions/cssd-batch.actions.ts:344,791` · `cssd-workflow-application.ts:83` | `cssd_dm_bo_dung_cu.parent_bo_id` (migration `20260928012956`) | Gỡ được khi xác nhận prod đã áp migration → **L13** |
| A3 | 1 | `m/cssd-erp/actions/cssd-report-read.actions.ts:161` | 3 cột view `v_cssd_quy_trinh_full` (migration `20260729122000_cssd_khoa_nhan_id.sql`) | Như A2 → **L13** |
| A4 | 2 | `m/cssd-erp/actions/cssd-bao-tri-list.actions.ts:70` · `shared/application/cssd-qr-hub.ts:132` | `cssd_dm_thiet_bi.ma_qr_thiet_bi` | Cột **không có trong migration nào** → nhánh không bao giờ chạy → **HỎI PO (câu 5)** |

### B. Nhánh fallback «migration chưa apply»

Lệnh liệt kê: `git grep -n -i -E "chưa (apply|áp|migrate|chạy migration)|migration chưa|trước khi (apply|migrate)|DB cũ|schema cũ" -- src ':!*.spec.ts' ':!*.spec.tsx'` → 20 dòng; 15 dòng ở 14 file là nhánh fallback:

`src/lib/admin-audit.ts:85` · `src/lib/analytics/gsc-analytics-data.ts:96` · `src/lib/cssd-server-gates.ts:82` · `m/cssd-erp/actions/cssd-batch.actions.ts:610` · `m/cssd-erp/helpers/persist-me-tiet-khuan.ts:567` · `m/cssd-su-co/application/mark-used-clinically.application.ts:62` · `m/giam-sat-chung/actions/giam-sat-chung-write.actions.ts:320` · `m/giam-sat-nkbv/actions/giam-sat-nkbv-ba-timeline.actions.ts:107` · `giam-sat-nkbv-read.actions.ts:616` · `giam-sat-nkbv-write.actions.ts:741,763` · `m/giam-sat-nkbv/lib/nkbv-chua-phan-tich-scan.ts:3` · `m/giam-sat-vst/repo/vst.repo.ts:60` (+ `lib/vst-bo-sung-nguoi-benh.ts:68`) · `m/quan-tri-he-thong/phan-quyen/actions/rbac.actions.ts:245`.

5 dòng còn lại không phải fallback (không đụng): `src/lib/domain/gsc-orphan-criterion-merge.ts:22` (nghĩa nghiệp vụ «chưa apply SCR») · `src/lib/master-data/engine/nhan-su-fk-normalize.ts:2` (gợi ý lỗi FK, không rẽ nhánh) · `src/lib/supervision-hinh-thuc-legacy.ts:7` (nhãn dữ liệu cũ) · `m/giam-sat-chung/bang-kiem/components/bang-kiem-ap-dung-fields.tsx:295` (chữ trùng mẫu tìm) · `m/giam-sat-nkbv/lib/nkbv-ba-grid-engine.ts:531` (khử trùng dữ liệu cũ).

Điều kiện gỡ từng nhánh: (1) migration tương ứng có trong danh sách đã áp trên prod; (2) có spec tái hiện đường chính trước khi gỡ. Hiện **không kiểm được (1)** vì MCP Supabase chưa được ủy quyền → toàn bộ nhóm B thuộc **L13, chưa xếp lịch**.

### C. Alias / shim `@deprecated`

Lệnh: `git grep -n "@deprecated" -- src ':!*.spec.ts' ':!*.spec.tsx' | wc -l` → 47 dòng / 34 file. Phần 0 nơi gọi đã nằm trong các lát L1–L11 (đếm theo export chết). Phần còn nơi gọi (vd `src/lib/bv103-design-tokens.ts` 5 dòng, `src/lib/bv103-layout-chrome.ts` 3 dòng) cần đổi nơi gọi trước → không thuộc plan này, ghi nhận.

## 5. Trùng lặp và hàm lớn — KHÔNG làm trong plan này

Lý do: trùng lặp chỉ 0,7% (64 đoạn); tách hàm lớn là viết lại đường ghi dữ liệu, rủi ro cao hơn lợi ích khi chưa có spec bao. Điều kiện mở lát: hàm có spec bao pass trước (CLAUDE.md «refactor: test pass trước và sau»).

- Trùng lặp lớn nhất: `m/chat-thai-do-vai/components/TabNhapSoCan.tsx:374-408 ⇐ :300-334` (35 dòng) · `m/cssd-erp/shared/application/cssd-qr-hub.ts:210-240 ⇐ :100-130` (31) · `src/components/shared/SearchableSelect.tsx:243-268 ⇐ SearchableMultiSelect.tsx:130-154` (26) · `m/quan-tri-he-thong/phan-quyen/views/rbac-matrix-mobile-view.tsx:23-48 ⇐ rbac-matrix-data-grid.tsx:39-63` (26) · NKBV `giam-sat-nkbv-ba-analysis.actions.ts:596-610, 646-660, 704-718` (3 khối → 1 helper).
- Hàm lớn nhất: NKBV `submitClinicalVerification` cc 139 (0 spec) · `m/cssd-su-co/application/su-co-report.application.ts:62` cc 128 / 492 dòng · `src/lib/master-data/engine/smart-import.actions.ts:99` cc 112 / 508 · `m/giam-sat-chung/actions/giam-sat-chung-write.actions.ts:59 saveGiamSatChung` cc 108 / 364 · `m/cssd-su-co/components/SuCoReportForm.tsx:110` cc 77 / 899 · `m/quan-ly-cong-viec/actions/cong-viec.actions.ts:98 updateCongViec` cc 84 / 313 · `m/giam-sat-vst/actions/vst-write-save-session.actions.ts:57 saveVSTSession` cc 78 / 304.
- Gom script npm: thuộc `KH_APPKSNK_20261113_dung-lai-theo-dac-ta.md` L6, không lặp ở đây.

## 6. Các lát

**Quy tắc chung mỗi lát** (một agent ghi tại một thời điểm; lát sau chỉ mở khi lát trước đã commit):

1. Trước khi xóa/sửa file dùng chung: `npm run impact -- <file>`; kết quả khác «0 nơi gọi lúc chạy» → dừng, chuyển ứng viên sang GIỮ và ghi §9.
2. Sau khi sửa: `npm run build` (typecheck) · `npm run verify:changed` (tự chọn; chạm action → `verify:engineering`) · `npm run dead-code:scan`.
3. Baseline chỉ giảm: `npm run guard:boundaries -- --prune` và `node scripts/guard-security-baseline.mjs --write-baseline`; diff của 2 file baseline phải chỉ có dòng bị bỏ.
4. Mồ côi bậc hai (file mới thành mồ côi sau khi xóa) → ghi vào §9, **không tự xóa**.
5. Commit một lát một commit, chỉ file của lát; không push.

| Lát | Nội dung | File (≤ 8) | Đạt khi |
|---|---|---|---|
| **L0** Công cụ đo | Thay `fallow` (`scripts/dead-code-scan.mjs:11` gọi `npx --no-install fallow` nhưng `package.json` không có gói này, nên `npm run dead-code:scan` và CI `.github/workflows/ci.yml:120` hiện không quét gì) bằng quét TypeScript compiler API; giữ chế độ chỉ cảnh báo. Nếu PO đồng ý câu 13: thêm quy tắc cho `scripts/gate-integrity.mjs` | `scripts/dead-code-scan.mjs` (+ `scripts/gate-integrity.mjs`) | `npm run dead-code:scan` in mồ côi 29 · chỉ test 18 · chết qua export 5 · export chết không type 105 (hoặc lệch giải thích được bằng commit mới), thoát 0; `npm run lint` pass |
| **L1** VST + hooks + lib | Xóa `m/giam-sat-vst/actions/index.ts`, `vst-strategic.actions.ts`, `src/hooks/useMasterDataCrud.ts`, `src/lib/constants.ts`; gỡ export `vst-constants.ts:42`, `use-body-scroll-lock.ts:86`, `useBv103Chrome.ts:8` | 7 | Mồ côi 29 → 25; build + verify:changed pass |
| **L2** CSSD A | Xóa 2 màn duyệt cũ, `sterilization-batch/entrypoint.ts`, `station-flow.ts`, `cssd-asset.actions.ts` (+ gỡ `actions/read.actions.ts:3`), `cssd-kho-history.actions.ts`, `me-tiet-khuan-qc-primitives.tsx` | 8 | Mồ côi 25 → 19, chết qua export 5 → 4 (6 file mồ côi + `cssd-asset.actions.ts` chết qua export); `verify:engineering` pass; tay: mở Điều hành khoa → Phê duyệt dụng cụ vẫn duyệt được |
| **L3** CSSD B cụm issue-note | Xóa `cssd-instrument-ops.actions.ts` + spec, `append-chi-tiet-issue-note.action.ts`, `instrument-issue-core.ts` + spec; sửa `src/lib/master-data/instrument-issue-core.spec.ts` (chuyển import, giữ ca `buildChiTietIssueNoteText`; dòng import mới kèm `// gate-ok: bỏ ca gọi mã đã xóa` để cổng cho qua các dòng `expect(` bị bỏ); `m/quan-tri-he-thong/ENTRYPOINTS.md:11-12`; `scripts/module-boundaries.baseline.json` (prune, mất 2 dòng `:49-50`) | 8 | `npm run test:cssd -- src/lib/master-data/instrument-issue-core.spec.ts` pass với các ca còn lại; `verify:engineering` pass. **Cần câu 13** |
| **L4** CSSD C | Xóa `cssd-set-bom-apply-core.ts`, `cssd-quy-trinh-metadata.ts` + spec; gỡ 5 export/action chết (`shared/application/cssd-quy-trinh-bom.ts:173`, `cssd-report-read.actions.ts:649`, `cssd-print.actions.ts:349`, `loai-dung-cu.actions.ts:110`, `cssd-register-label.actions.ts:39`) | 8 | `verify:engineering` pass; tay: in nhãn bộ dụng cụ + tra lịch sử QR. **Spec metadata cần câu 13** |
| **L5** cssd-su-co | Xóa `InstrumentIncidentFields.tsx`, `su-co-report-form.helpers.ts`; baseline prune (`:68`); gỡ export ở `set-reconcile-incident.application.ts:115`, `set-reconcile-ledger.application.ts:103` (đọc thân trước), `cssd-incident-trace.ts:51,56`, `cssd-incident-void.ts:34` | 7 | `npm run test:cssd -- src/modules/cssd-su-co` pass; `verify:engineering` pass |
| **L6** NKBV A màn mồ côi | Xóa `NkbvCaseEditor.tsx`, `NkbvBaCaseSheet.tsx`, `NkbvClinicalWindowStrip.tsx`, 2 hook; sửa ghi chú `scripts/readiness/mau-in-anh-xa.json:18` (bỏ tên `NkbvBaCaseSheet`); cập nhật ghi chú NKBV-042 bằng `node scripts/readiness/so-loi.mjs` (bằng chứng cũ trỏ `NkbvCaseEditor.tsx:103,199`) | 8 | Mồ côi giảm 5; `npm run test:cssd -- src/modules/giam-sat-nkbv` pass; tay: mở Hub bệnh án → modal phiếu → in BM.01 |
| **L7** NKBV B LabID + sổ dụng cụ + stub | Xóa `giam-sat-nkbv-labid.actions.ts` (+ `giam-sat-nkbv.actions.ts:14`), `nkbv-labid-engine.ts` + spec, `NkbvDeviceRegistryPanel.tsx`; gỡ `giam-sat-nkbv-device-registry.actions.ts:35,69,79`, `giam-sat-nkbv-write.actions.ts:74`, `giam-sat-nkbv-ba-timeline.actions.ts:14` | 8 | `verify:engineering` pass; `getDevicePrefillForStay` và `previewMauSoFromDeviceRegistryAction` còn nguyên (`git grep -c`); tay: điền sẵn dụng cụ khi mở phiếu. **Spec LabID cần câu 13** |
| **L8** QLCV | Gỡ `cong-viec-list.actions.ts:77`, `cong-viec-read.actions.ts:91` (+ `security-baseline-allow.json` giảm 1 dòng), `ke-hoach-nam-format.ts:97`, `qlcv-labels.ts:30`, `qlcv-staff-ids.ts:26` | 6 | `verify:engineering` pass; nợ bảo mật giảm 1 |
| **L9** Quản trị hệ thống | Xóa 2 file types, 2 shim; đổi import 2 spec sang `@/lib/master-data/…`; gỡ export chết ở `account-access-request-store.ts`, `account-access-request.ts` (đọc thân trước) | 8 | 2 spec đổi import vẫn pass, số ca test không giảm; `verify:engineering` pass |
| **L10** Cờ tính năng | Xóa `src/lib/bv103-feature-config.ts` + spec; sửa `package.json:120`; sửa 1 dòng `docs/core/pilot-core-modules-go-live.md:14` | 4 | `npm run test:pilot` pass; `npm run docs:links:check` pass; `docs/core` vẫn 13 file. **Cần câu 13** |
| **L11a/b/c** Export chết cơ học | 25 export trong 15 file `src/lib`: `analytics/supervision-charts-core.tsx:288` · `supervision-charts-shared.tsx:172,243,258` · `supervision-funnel.ts:8` · `supervision-source-lens.ts:30` (`:88` chờ câu 6) · `auth/staff-session-gate.ts:3` · `bv103-design-tokens.ts:103` · `client-cache/danh-muc-cache.ts:83` · `domain/cssd-catalog-de-nghi.ts:138` · `domain/cssd-set-reconcile.ts:411` · `domain/gsc-lop-giam-sat-filter.ts:158` · `format-datetime-vi.ts:125-127,130` · `master-data/cssd-loai-dung-cu-map.ts:3,204,243,279,292` · `master-data/danh-muc-routing.ts:87` · `master-data/gateway.ts:39` · `master-data/nhan-su-enrich.ts:13`; cộng `m/cssd-erp/shared/ui/cssd-ui-chrome.ts:13,19`, `views/cssd-catalog-page-helpers.ts:17`, `m/dashboard/lib/bao-cao-tong-hop-thresholds.ts:11` | 18 file, 3 lát × 6 | Sau L11c: export chết (không type) ngoài NKBV và ngoài nhãn GIỮ/HỎI PO = 0 theo `dead-code:scan`; build pass |
| **L12a** Gỡ probe baseline (cssd-erp) | 5 probe ở `cssd-workflow-ops.actions.ts:26`, `cssd-workflow.commands.actions.ts:53,71`, `cssd-workflow-application.ts:93,100` + spec tương ứng. `db-verify` xác nhận lại 12 cột trong baseline trước khi sửa | ≤ 6 | Spec pass trước và sau; lệnh đếm §4.A: 18 → 13; `verify:engineering` pass; tay: đóng băng/giải phóng bộ |
| **L12b** Gỡ probe baseline (cssd-su-co) | `test-writer` viết spec bao cho `void-incident.application.ts` (chưa có spec) → pass trước; rồi gỡ 7 probe ở `su-co-report.application.ts:238,239,309,310,313`, `void-incident.application.ts:154,157` | ≤ 4 | Spec pass trước và sau; lệnh đếm: 13 → 6; `verify:engineering` pass; tay: báo sự cố + hủy sự cố |
| **L13** (chờ điều kiện, chưa xếp lịch) | Probe A2, A3 và nhóm B fallback | – | Mở khi PO ủy quyền MCP Supabase và danh sách migration prod xác nhận đã áp |
| **L14** Theo câu trả lời PO | Các mục PO chọn XÓA ở §7 (câu 3, 6, 7, 12a): `cssd-read.actions.ts:319`, `ComprehensiveDimensionCompare.tsx`, `SupervisionActionBoard.tsx` + `supervision-source-lens.ts:88`, `dashboard-muc-tieu-kpi.actions.ts` + `security-baseline-allow.json`, `NkbvBaGridCasePrintView.tsx` + `mau-in-anh-xa.json:64,71` (mẫu in 57 → 56) | ≤ 8 | Như quy tắc chung; mục PO không chọn thì bỏ khỏi lát |

**Thứ tự:** L0 → L1 → L2 → L3 → L4 → L5 → L6 → L7 → L8 → L9 → L10 → L11a → L11b → L11c → L12a → L12b → L14. L0 đi trước vì mọi lát sau dùng `dead-code:scan` làm số đo. L3 và L5 cùng sửa `module-boundaries.baseline.json` nên phải nối tiếp. L11 sau câu 6. L12 độc lập với các lát xóa.

**Chuỗi số đo theo lát** (`npm run dead-code:scan`): mồ côi 29 → L1 25 → L2 19 → L4 18 → L5 16 → L6 11 → L7 10 → L9 8 · chỉ test 18 → L3 15 → L4 14 → L7 13 → L9 11 · chết qua export 5 → L2 4 → L10 3.

**Kết quả dự kiến sau L1–L12** (chưa tính L14): xóa nguyên 36 file / 2.690 dòng, sửa một phần 1 spec, gỡ ~57 export (số ~57 đếm tay từ §3; số chính xác do `dead-code:scan` in sau L0); mồ côi 29 → 8, chỉ test 18 → 11, chết qua export 5 → 3 (phần còn lại đúng bằng nhãn GIỮ + HỎI PO); probe 18 → 6. Nếu PO chọn XÓA cả 4 mục ở L14: thêm 4 file / ~613 dòng.

## 7. Câu hỏi PO (gom một lần — không trả lời câu nào thì mục đó GIỮ)

| # | Câu hỏi | Đề xuất |
|---|---|---|
| 1 | Ô chọn tình trạng gói (`PackConditionSelect` / `recordPackCondition`, QT.22) nối vào màn nào? | GIỮ; nối ở lát CSSD riêng, không thuộc plan này |
| 2 | Kho CSSD còn cần nạp/xuất Excel (`importCSSDData`, `getCSSDImportExportData`) không? | GIỮ cho tới khi PO xác nhận không dùng |
| 3 | `getCssdStationFlowMap` (0 nơi gọi từ `f7b197b5`) | XÓA |
| 4 | Bảng in chứng cứ QC (`CssdPrintQcProofTable`) có thuộc biểu mẫu nào đang cần không? | GIỮ tới khi đối chiếu biểu mẫu (plan 20261114 YC2) |
| 5 | Máy CSSD có cần mã QR riêng (`ma_qr_thiet_bi`)? Cột chưa từng có trong DB nên nhánh này chưa bao giờ chạy | GIỮ mã, ghi việc «thêm cột» vào lộ trình CSSD; nếu PO nói không cần → gỡ 2 probe + nhánh |
| 6 | Bảng so sánh 2 cột BCTH (`ComprehensiveDimensionCompare`) và bảng hành động (`SupervisionActionBoard`), cả hai đã ghi `@park` | XÓA cả hai |
| 7 | Mục tiêu KPI: tiếp tục dùng ngưỡng cố định trong mã, hay lấy từ bảng `ksnk_dm_muc_tieu_kpi`? | Giữ ngưỡng cố định như đang chạy; XÓA action `fetchMucTieuKpiVien` (0 nơi gọi, đang là nợ bảo mật); không đụng bảng DB |
| 8 | GSC: nạp tiêu chí bảng kiểm từ file (`importTieuChis`) còn cần không? | GIỮ |
| 9 | QLCV: quản trị đổi trạng thái công việc (`adminSetTrangThaiCongViec`, QLCV-06) đặt nút ở đâu? | GIỮ; nối UI ở lát QLCV |
| 10 | Phân loại tuân thủ GSC ≥ 90 / ≥ 80 (`classifyGscCompliance`) và `gsc-doi-tuong-from-topic`: chỉ spec dùng | GIỮ (PO #3) |
| 11 | Đo lại PDCA (`pdca-remeasure`, dính `ty_le_ccs`) | GIỮ (PO #4) |
| 12 | NKBV: (a) bản in BM.01 thứ hai (`NkbvBaGridCasePrintView`); (b) có hiện lại bảng chỉ số CDC (`NkbvChecklistKsnkTab` + `NkbvCdcMetricsPanel`) không? | (a) XÓA — bản sống là `NkbvCasePrintView`; (b) GIỮ chờ PO |
| 13 | Cổng `scripts/gate-integrity.mjs` chặn mọi dòng xóa có `expect(` trong spec; file spec bị xóa nguyên thì không có chỗ ghi `gate-ok` → chặn 5 spec của mã chết (21 dòng `expect(`) ở L3, L4, L7, L10. Cho thêm quy tắc: «spec bị xóa nguyên file được bỏ qua khi cùng diff xóa nguyên một file nguồn cùng thư mục có tên bắt đầu bằng tên spec bỏ đuôi `.spec.ts(x)`»? | Đồng ý, làm trong L0 (~6 dòng). Không đồng ý → 5 spec và 5 file mã chết chúng phủ (10 file / 530 dòng) chuyển GIỮ; XÓA còn 26 file nguyên |

## 8. Giả định và cổng PO

Giả định:

- G1. «Không phục vụ hoạt động phần mềm» = đủ (a) + (b) ở §0. Tính năng chưa có người dùng nhưng có trong quy trình/đặc tả/sổ lỗi → GIỮ.
- G2. Máy quét coi file quy ước Next.js trong `src/app`, `src/proxy.ts`, `src/instrumentation.ts` là điểm vào; tham chiếu từ `scripts/`, `e2e/`, file cấu hình gốc và `package.json` cũng được tính. Nó không thấy import động theo chuỗi ghép → mỗi ứng viên XÓA đã kiểm lại bằng `git grep` tên file + tên export.
- G3. Thân mã có thể đổi trước khi lát chạy → mỗi lát chạy lại `npm run impact` cho từng file trước khi xóa.
- G4. 12 cột nhóm A1 có trong baseline nên có trên mọi DB (local, prod) — `db-verify` xác nhận lại ở L12a. **Cập nhật 2026-11-16:** chỉ đúng cho DB dựng từ migration của repo; prod chưa đo (§9 «Điều kiện trước khi deploy L12a/L12b»); `is_red_alert` không nằm trong baseline.
- G5. Không ghi ứng viên xóa vào `so-loi.json` (đó là sổ lỗi, không phải sổ dọn dẹp); bản ghi bền là file này.
- G6. DoD pilot «≥ 3 kịch bản tay» (CLAUDE.md dự án, mục Kỷ luật) viết cho lát tính năng. Lát xóa mã chết không đổi hành vi nên kiểm bằng build (typecheck chứng minh không còn import) + spec + 1 thao tác tay ghi ở cột «Đạt khi». PO muốn đủ 3 kịch bản tay mỗi lát thì nói khi duyệt.

Cổng PO (cần người):

- C1. Duyệt plan này một lần → chạy nối L0–L12 + L14, tự commit theo lát, không push.
- C2. Trả lời §7 (im = GIỮ).
- C3. Ủy quyền MCP Supabase (`/mcp`) để đối chiếu migration prod → mở L13. Trùng mục 3 «CẦN NGƯỜI» trong `HANDOFF_APPKSNK.md`.
- C4. Liên quan plan khác: `KH_APPKSNK_20261114` YC2 đang đếm 57 file in/xuất — L14 (câu 12a) làm con số đó thành 56, phải sửa `mau-in-anh-xa.json` cùng lát. `KH_APPKSNK_20261113` L6 (gom script npm) không bị ảnh hưởng, trừ `package.json:120` do L10 sửa.

Ghi nhận ngoài phạm vi (không sửa trong plan này): `scripts/data/acl-snapshot.json:151` ghi `ksnk_dm_muc_tieu_kpi` cấp `anon=IUD`; 4 action ghi ở `m/giam-sat-nkbv/actions/giam-sat-nkbv-ba-timeline.actions.ts:36,167,188,216` chưa thấy gọi kiểm phạm vi bệnh án — cả hai **chưa xác minh**, cần `security-auditor` rà riêng.

## 9. Tiến độ

Chạy 2026-11-16 trên `integrate/2026-11`. PO ra lệnh «làm tất cả các lát ở mục 06» = duyệt cổng C1 (chạy nối, commit cục bộ từng lát, không push). Lệnh đó **không** trả lời §7 → theo quy tắc của §7 («không trả lời câu nào thì mục đó GIỮ») mọi mục §7 giữ nguyên. Hệ quả cho câu 13: không sửa `scripts/gate-integrity.mjs` (cấu hình luồng đóng băng), 5 cặp spec + nguồn ở lại, L10 bỏ; L14 không có mục; L13 chưa xếp lịch.

Cột «Số đo» = `node scripts/dead-code-scan.mjs --json` sau lát: file · dòng · mồ côi · chỉ test · chết qua export · export chết · chỉ test export. Chuỗi số đo ở §6 không còn đúng nguyên văn vì L10 và phần câu 13 của L3/L4/L7 không chạy; số đo thật là cột này.

| Lát | Trạng thái | Commit | Số đo sau lát | Đã làm |
|---|---|---|---|---|
| L0 | Xong | `50ba9792` | 1299 · 186597 · 29 · 18 · 5 · 105 · 352 (số gốc, khớp §6) | `scripts/dead-code-scan.mjs` quét bằng TypeScript compiler API thay `fallow`; chỉ cảnh báo trừ khi `DEAD_CODE_STRICT=1`; `--json <file>` ghi chi tiết (1 file +339/−42) |
| L1 | Xong | `7051205f` | 1295 · 186452 · 25 · 18 · 5 · 103 · 352 | 4 file mồ côi VST/hooks/lib + 3 export chết (7 file −141) |
| L2 | Xong | `f173589a` | 1288 · 186051 · 19 · 18 · 4 · 102 · 353 | 6 file mồ côi CSSD + 1 stub chết qua export (8 file −395) |
| L3 | Xong một phần | `d563bca1` | 1287 · 186027 · 19 · 17 · 4 · 102 · 353 | Stub báo hỏng/mất chi tiết `append-chi-tiet-issue-note.action.ts`; spec `instrument-issue-core.spec.ts` bỏ ca gọi mã đã xóa bằng dòng `gate-ok:`; `ENTRYPOINTS.md` −1; baseline −1 dòng. **Không chạy** phần câu 13 (`cssd-instrument-ops.actions.ts` + spec, `instrument-issue-core.ts` + spec) (4 file +1/−32) |
| L4 | Xong một phần | `4306858d` | 1286 · 185662 · 18 · 17 · 4 · 97 · 353 | `cssd-set-bom-apply-core.ts` + 5 export/action chết. **Không chạy** `cssd-quy-trinh-metadata.ts` + spec (câu 13) (6 file +2/−366) |
| L5 | Xong | `92677159` | 1284 · 185338 · 16 · 17 · 4 · 92 · 353 | 2 file mồ côi cssd-su-co + 5 export chết + baseline −1 (7 file +1/−324) |
| L6 | Xong | `7869c9a3` | 1279 · 184265 · 11 · 17 · 4 · 92 · 353 | 5 file mồ côi NKBV (màn cũ `@deprecated`, 2 hook) + ghi chú `mau-in-anh-xa.json` + ghi chú NKBV-042 (7 file +2/−1070) |
| L7 | Xong một phần | `5eef8e54` | 1277 · 184131 · 10 · 17 · 4 · 86 · 353 | Stub LabID `giam-sat-nkbv-labid.actions.ts`, `NkbvDeviceRegistryPanel.tsx`, 3 export sổ dụng cụ/tạo phiếu. **Không chạy** `nkbv-labid-engine.ts` + spec (câu 13) (6 file +2/−134) |
| L8 | Xong | `ab6bd597` | 1277 · 184062 · 10 · 17 · 4 · 81 · 353 | 5 export chết QLCV + 1 dòng `security-baseline-allow.json` (6 file −70) |
| L9 | Xong | `00a4ee97` | 1273 · 183908 · 8 · 15 · 4 · 76 · 353 | 2 file types mồ côi, 2 shim, 5 export chết; 2 spec đổi import (8 file +2/−152) |
| L10 | **Không chạy** | – | – | Cần câu 13 (`bv103-feature-config.ts` + spec nằm trong 5 cặp câu 13) |
| L11a | Xong | `58044099` | 1273 · 183726 · 8 · 15 · 4 · 69 · 353 | 7 export chết `supervision-*`, `staff-session-gate` + baseline 58 → 57 (7 file +2/−185) |
| L11b | Xong | `8227530c` | 1273 · 183648 · 8 · 15 · 4 · 59 · 353 | 10 export chết design-tokens, danh-muc-cache, domain, format-datetime + 1 dòng `layout-primitives.md` (7 file +4/−82) |
| L11c | Xong | `293a690a` | 1273 · 183460 · 8 · 15 · 4 · 47 · 354 | 12 export chết master-data, cssd-erp, dashboard (7 file +2/−190) |
| L12a | Xong | `278334e8` | 1273 · 183453 · 8 · 15 · 4 · 47 · 354 (không đổi) | 5 lần `tableHasColumn` ở workflow CSSD (cột `is_dong_bang`, `ma_vai_tro_bo`, `quy_trinh_cha_id` có trong baseline); đếm §4.A 18 → 13 (5 file +11/−20) |
| L12b | Xong | `1e1a1a8d` | 1273 · 183441 · 8 · 15 · 4 · 47 · 361 (+7 là hiện tượng máy quét, xem «Mồ côi bậc hai») | 7 lần `tableHasColumn` ở báo sự cố + hủy sự cố (5 ở `su-co-report.application.ts`, 2 ở `void-incident.application.ts`); viết trước `void-incident.application.spec.ts` (16 test), pass trước và sau khi gỡ; đếm §4.A 13 → 6 (4 file +258/−33) |
| L13 | Chưa xếp lịch | – | – | Chờ C3 |
| L14 | Không có mục | – | – | PO chưa chọn XÓA câu nào trong 3, 6, 7, 12a |

**Tổng sau L12b** — số máy quét (chỉ mã nguồn, không tính spec): 1299 → 1273 file (−26, đúng bằng 26 file xóa nguyên), 186597 → 183441 dòng (−3156); mồ côi 29 → 8, chỉ test 18 → 15, chết qua export 5 → 4, export chết (không type) 105 → 47; probe `tableHasColumn` 18 → 6. Theo git, 15 commit của lát (gồm script, spec, docs): +626/−3236 dòng, xóa nguyên 26 file, thêm 1 file (`void-incident.application.spec.ts`, 243 dòng).

Đối chiếu «Kết quả dự kiến» ở §6: mồ côi 29 → 8 và probe 18 → 6 **đạt**. Chỉ test 18 → 15 (dự kiến 11) và chết qua export 5 → 4 (dự kiến 3) **hụt** vì câu 13 chưa được đồng ý: chuỗi §6 tính chỉ test L3 −3, L4 −1, L7 −1, thực tế L3 −1, L4 0, L7 0 (4 cặp spec + nguồn ở lại); L10 bỏ nên chết qua export không xuống 3. 26 file xóa nguyên khớp §7 câu 13 («không đồng ý → XÓA còn 26 file nguyên»). Tiêu chí L11 «export chết ngoài NKBV và ngoài nhãn GIỮ/HỎI PO = 0» **đạt**: 47 còn lại = 33 NKBV + 14 có nhãn (7 thư viện UI GIỮ, `cssdCommandReleaseSet` GIỮ CSSD-025, `buildActionBoardFromGap` câu 6, `getCSSDImportExportData` câu 2, `getCssdStationFlowMap` câu 3, `recordPackCondition` câu 1, `importTieuChis` câu 8, `adminSetTrangThaiCongViec` câu 9).

### Lệch so với kế hoạch (đã xử lý theo cách ghi bên cạnh)

1. **`is_red_alert` không có trong baseline.** §4.A xếp `cssd_fact_quy_trinh.is_red_alert` vào 12 cột baseline, nhưng cột này do `supabase/migrations/20260724100000_cssd_quy_trinh_is_red_alert.sql:5` thêm. L12b vẫn gỡ 2 probe của cột này vì: (a) migration sau đó đọc/ghi cột không điều kiện (`20261004012938_cssd_red_alert_by_quy_trinh.sql:189,586`, `20261114130000_cssd_me_thu_hoi_kiem_trang_thai.sql:484`, `20260925010536_cssd_ledger_atomic.sql:678`); (b) `docs/core/implementation-mapping.md:229` ghi luồng báo sự cố luôn ghi cờ này; (c) ngay dưới probe, `executeVoidIncidentReport` gọi `rpc_cssd_apply_incident_void` (migration `20261110110000`, sau `20260724100000`) không điều kiện; (d) hàng L12b của kế hoạch liệt kê đúng 7 probe này. Chỉ đổi hành vi trên DB thiếu cột, DB đó vốn không chạy được các RPC hiện tại. **Chưa kiểm prod** (MCP Supabase chưa ủy quyền, C3); không riêng cột này mà cả 7 cột của L12a/L12b — xem «Điều kiện trước khi deploy L12a/L12b» bên dưới.
2. **L3 baseline −1 dòng, không phải −2**: `cssd-instrument-ops.actions.ts` ở lại (câu 13) nên 1 dòng baseline còn đúng vi phạm.
3. **`npm run impact` không có** trên nhánh này → thay bằng `git grep -n -w` toàn repo (kể cả docs, trừ `.claude/plans`). **`db-verify`** thay bằng đối chiếu trực tiếp `supabase/migrations/20260530000000_init_pilot_baseline.sql` + toàn bộ migration bằng `git grep`.
4. **Baseline chỉ giảm (quy tắc chung 3)**: `scripts/module-boundaries.baseline.json` — `lib-khong-import-modules` 59 → 58 (L3) → 57 (L11a), `cssd-su-co-chi-import-loi` 5 → 4 (L5); `scripts/data/security-baseline-allow.json` 21 → 20 mục (L8). Dòng baseline hết vi phạm làm `verify:engineering` fail (`guard:boundaries`), nên prune đi cùng lát tạo ra nó.
5. **L8 — chênh `defaultPeriodFilterNow`**: kế hoạch ghi bản ở `lib` (`ke-hoach-nam-format.ts`, đã gỡ ở L8, 0 nơi gọi) «trùng» bản cục bộ `NhiemVuPanel.tsx:37`, nhưng thân khác nhau (lib = tháng hiện tại `{THANG, m}`; cục bộ = `{NAM, 0}`). `NhiemVuPanel.tsx:150` `currentMonthVn = defaultPeriodFilterNow().value` = 0 → chuyển «Cả năm» sang «Tháng» có thể ra tháng 0. Lỗi có từ trước, không do L8 (gỡ hàm 0 nơi gọi không đổi hành vi); **không sửa** (ngoài phạm vi lát); hỏi PO.

### Mồ côi bậc hai và việc còn lại (ghi, không tự xóa)

- Chỉ test export mới sau khi gỡ: `SUPERVISION_COMPLIANCE_THRESHOLDS` (hằng SSOT, dùng nội bộ > 10 lần → GIỮ), `instrumentChangeRequiresIncidentResult` (`src/lib/domain/cssd-instrument-incident.ts`).
- `hasDongBangColumn` (tham số của `executeWorkflowStationScan` `cssd-workflow-application.ts:41,63` và `executeRejectToPreviousStation` `:243,255`) giờ luôn `true` ở mọi nơi gọi; bỏ tham số đổi chữ ký hàm export nên để ngoài lát.
- L12b: `clearTableHasColumnCache` vẫn export (spec `cssd-db-utils.spec.ts` dùng; còn 6 probe sống ở `cssd-bao-tri-list.actions.ts:70`, `cssd-batch.actions.ts:344,791`, `cssd-report-read.actions.ts:161`, `cssd-qr-hub.ts:132`, `cssd-workflow-application.ts:83`). `originalState.is_red_alert` / `is_dong_bang` trong `su-co-report.application.ts` giờ luôn là boolean (trước đây `undefined` khi DB thiếu cột); với DB đủ cột giá trị không đổi.
- L12b, hiện tượng máy quét: chỉ test export tăng 354 → 361 (+7) ở `src/modules/cssd-su-co/domain/cssd-incident-void.ts` (`INCIDENT_VOID_BATCH`, `_DRAFT`, `_BOM`, `_TRANSFER`, `_CONFIRMED`, `_CLOSED`, `pickDominoRollbackToUndo`). Spec mới `void-incident.application.spec.ts` dùng `import type * as IncidentVoidDomain`, máy quét coi mọi export của module đó có spec tham chiếu. Cả 7 đều dùng ngay trong file đó (`cssd-incident-void.ts:161–245`), không có mã mới bị bỏ rơi; không đổi spec chỉ để làm đẹp con số.
- `getCssdStationFlowMap` (`cssd-read.actions.ts:319`, câu 3 → L14); `adminSetTrangThaiCongViec` (câu 9); `buildActionBoardFromGap` (câu 6); `importTieuChis` (câu 8); `recordPackCondition` (câu 1); `getCSSDImportExportData` (câu 2).
- NKBV còn: mồ côi `NkbvBaGridCasePrintView.tsx`, `NkbvCdcMetricsPanel.tsx`, `NkbvChecklistKsnkTab.tsx` (câu 12); chỉ test `nkbv-chapter17-clinical.ts`; khoảng 33 export chết trong `giam-sat-nkbv/lib/*`.
- QLCV / quản trị: 27 chỉ test export (`qlcv-bao-cao-ky.ts`, `qlcv-board-lanes.ts`, `qlcv-list-scope.ts`, `ke-hoach-nam-format.ts`, `rbac-ksnk-role-mappings.ts`…).
- Dòng cũ nhắc ký hiệu đã xóa, để nguyên: `docs/core/implementation-mapping.md:147,153,333`; `supabase/migrations/20261021010000_cssd_apply_bom_lines_tx.sql:2` (comment lịch sử). Comment cũ `src/lib/bv103-layout-chrome.ts:4` nhắc `useBv103Chrome` đã xóa; `.fallowrc.json` còn sót sau L0.
- `cssd-set-bom-plan.ts` + spec còn là chỉ-test; `cssd-register-label.actions.ts` còn dòng trống cuối file do L4 (hình thức).
- NKBV-034 trong `so-loi.json` còn `ghi_chu` nhắc `listNkbvBaTimelineManual`; `so-loi.mjs` không có lệnh chỉ sửa ghi chú, ghi chú NKBV-042 ở L6 sửa tay trong `so-loi.json`.
- `lookupAccountAccessRequestStatusAction` chỉ kiểm đầu vào rồi trả `publicAccountAck()`; 2 spec đổi import ở L9 vẫn nằm ở `quan-tri-he-thong/danh-muc/actions/` nhưng thử mã ở `src/lib/master-data/` (có thể trùng `master-table-permission-map.spec.ts`; chưa gộp).
- `supervision-analytics-charts.tsx` còn re-export type `MomentRow` không ai import qua barrel (có từ trước).
- **Hỏi PO (L11b):** `invalidateClientDanhMucCache` chưa từng nối vào CRUD quản trị. Cache máy chủ `unstable_cache` làm mới được qua `revalidateMasterDataRowCacheTag`; chỉ cache sessionStorage phía trình duyệt (`ksnk:dm-cache:`, TTL 15 phút/tab) không bị xóa → lịch sử/in VST (`use-vst-history-table.ts`, `use-vst-print.ts`) có thể thấy tên khoa/nghề nghiệp/khu vực cũ ≤ 15 phút sau khi quản trị sửa. Mức thấp.

### Điều kiện trước khi deploy L12a/L12b (prod chưa kiểm)

G4 (§8) là giả định, chưa đo. Cột có trong baseline chỉ chứng minh cho DB dựng từ migration của repo, không chứng minh cho prod: R6 «prod khớp repo» (`docs/bo-tai-lieu/01-tong-quan-yeu-cau-lo-trinh.md:55`) chưa đo vì MCP Supabase chưa ủy quyền (C3). Trước hai lát, mỗi lần dò chặn một lần đọc/ghi cột thiếu; sau hai lát, 7 cột dưới đây bị dùng không điều kiện. Nếu prod thiếu một cột, các luồng đóng băng/giải phóng bộ, trả lui trạm, quét trạm bộ mẹ/con, báo sự cố và hủy sự cố lỗi ngay khi chạy.

- `cssd_fact_quy_trinh`: `is_dong_bang`, `quy_trinh_cha_id`, `ma_vai_tro_bo` (baseline dòng 4303–4305), `is_red_alert` (migration `20260724100000`, không có trong baseline).
- `cssd_fact_su_co`: `quy_trinh_id`, `nguoi_bao_id`, `loai_su_co_id` (baseline dòng 4361, 4367, 4372).

Chỉ deploy L12a/L12b khi Pha 1 xong (`list_migrations` prod khớp repo, 0 file thiếu) hoặc khi truy vấn chỉ-đọc sau trả đủ 7 hàng. Thiếu hàng nào thì `git revert 278334e8` (L12a) và/hoặc `git revert 1e1a1a8d` (L12b) trước khi deploy. Local và mọi DB dựng từ migration của repo không bị ảnh hưởng. Chưa ai chạy truy vấn này.

```sql
-- Chỉ đọc. Kỳ vọng đúng 7 hàng.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('cssd_fact_quy_trinh', 'is_dong_bang'),
    ('cssd_fact_quy_trinh', 'quy_trinh_cha_id'),
    ('cssd_fact_quy_trinh', 'ma_vai_tro_bo'),
    ('cssd_fact_quy_trinh', 'is_red_alert'),
    ('cssd_fact_su_co', 'quy_trinh_id'),
    ('cssd_fact_su_co', 'nguoi_bao_id'),
    ('cssd_fact_su_co', 'loai_su_co_id')
  )
order by table_name, column_name;
```

**Phản biện độc lập (`phan-bien`, một vòng, chỉ đọc, 2026-11-16; nhận yêu cầu + diff + kết quả verify, không nhận lập luận người viết):** 0 Nghiêm trọng / 0 Cao / 0 Pre-existing. Trên DB đủ cột không thấy hành vi khác ở mọi chỗ gỡ probe (`su-co-report.application.ts`, `void-incident.application.ts`, `cssd-workflow-application.ts`); chỉ khác ở đường thiếu cột/lỗi dò, đúng chủ ý: hai câu «Phiên bản DB chưa…» mất, lỗi dò không còn bị nuốt mà thành lỗi cập nhật thật. Nếu prod thiếu `is_red_alert`, báo sự cố ném lỗi ở `su-co-report.application.ts:444-445` sau khi đã ghi phiếu (trước đây bỏ qua cờ). Không thấy `DROP`/`RENAME` nào cho 7 cột trong `supabase/migrations`. Reviewer ghi «chưa kiểm» 6 cột baseline (truy vấn `awk` của nó trả rỗng); người viết kiểm lại bằng `grep` ở đúng các dòng baseline nêu trên, và `ADD COLUMN IF NOT EXISTS is_red_alert` ở `20260724100000_cssd_quy_trinh_is_red_alert.sql:5`. Spec assert trên đối số `rpc` do mã thật dựng; reviewer suy từ đọc (chưa chạy mutation) rằng xóa cờ, gán hằng hay guard truthy đều làm spec fail; spec không phủ nhánh `restoreStation` khác `null` (`void-incident.application.spec.ts:33`). Duyệt của agent không thay duyệt của người: người xem diff `278334e8` + `1e1a1a8d` và chạy truy vấn trên trước khi deploy.

### Chưa kiểm tay (kiểm bằng build + spec + scanner, chưa ai thao tác trên màn hình)

L2 Điều hành khoa → Phê duyệt dụng cụ · L4 in nhãn bộ dụng cụ + tra lịch sử QR · L5 báo sự cố + hủy sự cố · L6 các màn NKBV (Hub bệnh án → phiếu → in BM.01) · L7 điền sẵn dụng cụ khi mở phiếu NKBV + mẫu số hằng ngày · L8 Kế hoạch năm/Nhiệm vụ + form tạo/sửa công việc QLCV · L9 màn gửi yêu cầu cấp/đặt lại tài khoản công khai · L11a báo cáo VST/GSC + Staff Gate khi đăng nhập · L11b lọc/hiển thị ngày giờ, lọc lớp giám sát GSC, màn catalog CSSD, lịch sử + in VST · L11c màn catalog CSSD, màn giám sát có chọn nhân viên/nghề nghiệp, tra cứu danh mục · L12a đóng băng bộ dụng cụ, giải phóng (mở khóa) bộ, trả lui 1 trạm, quét trạm kiểm tra bộ mẹ/bộ con · L12b báo sự cố (thường, có QR, có rollback trạm / cờ đỏ) + hủy phiếu sự cố có và không có chu trình.

### Kiểm chứng ngoài phạm vi lát (có từ trước, không do lát nào gây ra)

- 2 file đang sửa dở của phiên khác, không thuộc lát nào, không stage/commit: `HANDOFF_APPKSNK.md`, `src/modules/giam-sat-nkbv/lib/nkbv-loa-server.spec.ts`. Hậu quả: `node scripts/gate-integrity.mjs` thoát 1 với đúng 6 chỗ, đều trong `nkbv-loa-server.spec.ts`; 7 test của file đó fail (spec đang bị sửa dở: +9/−11 dòng so với HEAD; nguồn `nkbv-loa-server.ts` không do lát nào sửa).
- `giam-sat-nkbv-write.actions.spec.ts` (2 ca) timeout 5000 ms: spec là `describe.skipIf(!hasIntegrationDb)` và tạo `createClient` thật, nhưng Docker daemon đang tắt (`Cannot connect to the Docker daemon at unix:///Users/drnghia/.docker/run/docker.sock`).
- Toàn bộ vitest sau L12b (`npm run test:cssd`, thoát 1): `Test Files  2 failed | 438 passed (440)` · `Tests  9 failed | 2787 passed (2796)`. 9 ca fail = 7 ca `nkbv-loa-server.spec.ts` + 2 ca `giam-sat-nkbv-write.actions.spec.ts` ở trên. Không commit nào trong `03376355..HEAD` chạm 2 file này (`git diff --stat` rỗng). Chạy trên mã ở `1e1a1a8d`; các commit sau đó chỉ đổi docs.
- `node scripts/readiness/so-loi.mjs check` thoát 1 vì VST-025, NKBV-041 và `HANDOFF_APPKSNK.md` 6083 B > 6000 B (có từ trước).

## Tự kiểm

Làm 2026-11-16, chỉ đọc: `git grep`, `wc -l`, đọc `scripts/gate-integrity.mjs`, `scripts/verify-changed.mjs`, `scripts/guard-module-boundaries.mjs`, `scripts/guard-security-baseline.mjs`, `scripts/dead-code-scan.mjs`, `package.json`, 11 file `.claude/rules/*.md`, CLAUDE.md dự án.

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Mỗi yêu cầu có bước + tiêu chí đo | Đạt | YC1 → §2 (23 đơn vị, tổng 1.299 file / 186.597 dòng cộng khớp) + §3 (52/52 file máy quét có nhãn) · YC2 → §6 (17 lát xếp lịch + L13 chờ điều kiện, mỗi lát có cột «Đạt khi») · YC3 → §0 điều kiện (a) + (b) · YC4 → §7 (im = GIỮ) |
| Mỗi bước phục vụ một yêu cầu | Đạt | L0 → số đo của YC2 · L1–L11, L14 → YC3 · L12, L13 → «giả định không còn đúng» (yêu cầu vòng 1). Trùng lặp và hàm lớn không có lát (§5): không có spec bao, không thuộc tiêu chí xóa của PO |
| Không mâu thuẫn CLAUDE.md / rules / schema | Đạt có điều kiện | Xem lệch 1–7 bên dưới |
| Từ mơ hồ → số / điều kiện | Đạt | «không phục vụ hoạt động» = (a) + (b) ở §0 · «gọn» = chuỗi số đo ở §6 · «cần thiết» = có trong quy trình / đặc tả / sổ lỗi / PO #3, #4 |
| Một khái niệm một tên | Đạt | §0: mồ côi, chỉ test, chết qua export, export chết, stub, shim, mirror, probe; 3 nhãn |
| Thứ tự bước đúng phụ thuộc | Đạt | L0 trước mọi lát (số đo) · L3 → L5 (chung `scripts/module-boundaries.baseline.json`) · L11 sau câu 6 · L12b viết spec trước khi gỡ · L13 sau C3 · L14 sau C2 |

**Lệch so với quy tắc hiện có** (mỗi lệch kèm cách xử lý):

1. Cổng chặn xóa spec: `scripts/gate-integrity.mjs:42` đếm mọi dòng xóa có `expect(` trong `*.spec.ts(x)`; `:36` chỉ dòng **thêm** có `gate-ok:` mới miễn; `:47` file không miễn → vi phạm; `:59-61` thoát 1. File spec bị xóa nguyên không có dòng thêm nên không miễn được. `scripts/verify-changed.mjs:45` chạy cổng này trước mọi lệnh khác. Ảnh hưởng 5 spec / 21 dòng `expect(` ở L3, L4, L7, L10 → **câu 13**.
2. Cấu hình luồng đóng băng (CLAUDE.md toàn cục: chỉ sửa khi lỗi lặp ≥ 2 lần và có số đo): sửa `gate-integrity.mjs` có số đo (5 spec ở 4 lát) nhưng chưa phải lỗi đã lặp → không tự sửa, chờ PO trả lời câu 13.
3. Baseline chỉ được giảm: `scripts/guard-module-boundaries.mjs:3-8` (fail khi baseline còn dòng đã hết vi phạm → phải `--prune` ở L3, L5), `scripts/guard-security-baseline.mjs:10-11` (L8, L14) → quy tắc chung điểm 3.
4. Trần «≤ 10 finding / module» (CLAUDE.md toàn cục, mục Rà soát): bảng §3.1 có 26 dòng, §3.9 có 12 dòng + 33 export. Vượt trần có chủ đích: PO 2026-11-06 #2 đòi **danh sách cụ thể** trước khi cho xóa; đây là danh sách xóa, không phải finding lỗi.
5. «Gặp code chết có sẵn thì báo, không xóa» (CLAUDE.md dự án, mục Kỷ luật): plan này là bước «báo»; chỉ xóa sau khi PO duyệt (C1).
6. `docs/core` giữ 13 file: L10 chỉ sửa 1 dòng `docs/core/pilot-core-modules-go-live.md:14`, không thêm/bớt file.
7. DoD pilot «≥ 3 kịch bản tay»: lát xóa dùng 1 thao tác tay + build + spec → giả định G6, PO có thể bác.
8. `.claude/rules/*.md`: tìm `xóa|dọn|orphan|mồ côi|@deprecated|barrel|code chết|dead` → 2 dòng, đều không cấm: `.claude/rules/mdm.md:21` (duyệt xóa **dữ liệu** hóa chất/thiết bị) và `.claude/rules/migrations.md:19` (xóa không đảo được → skill `destructive-change`). Plan không DROP bảng, không bỏ module, không chạm migration; file xóa khôi phục được bằng git → không thuộc `destructive-change`.

**Số đã sửa sau khi tự kiểm** (bản nháp đầu ghi sai, đo lại bằng lệnh):

- §2: nhóm đơn vị nhỏ 12 → 13 file (`src/types` có 2 file).
- §2, §6: «37 file / 2.793 dòng» → 36 file xóa nguyên / 2.690 dòng (`wc -l`) + 1 spec sửa một phần (103 dòng).
- §3.9: `lib/nkbv-symptom-timeline-bridge.ts:27` xếp nhầm nhóm «trùng tên» → nhóm «còn lại» (4 + 4 + 25 = 33).
- §4.A: ghi đủ tên migration `20260729122000_cssd_khoa_nhan_id.sql`.
- §4.B: «14 dòng» → 15 dòng ở 14 file; liệt kê 5 dòng không phải fallback.
- §4.C: `@deprecated` 30 → 34 file.
- §6 L2: «mồ côi 25 → 18» → 25 → 19 và chết qua export 5 → 4; thêm chuỗi số đo theo lát.
- §7 câu 13: «≈ 430 dòng» → 10 file / 530 dòng; viết lại quy tắc cho khớp cả 5 cặp spec–nguồn (vd `cssd-instrument-ops.spec.ts` ↔ `cssd-instrument-ops.actions.ts`).
- §8 G2: bỏ câu «đã loại trừ `src/app/**`» (sai: máy quét coi file quy ước Next.js là điểm vào, không loại trừ).
- §6 L7: 3 tên file viết tắt thiếu tiền tố `giam-sat-nkbv-` → ghi tên đầy đủ; §6 L4 và §3.6: 2 tên file trùng với file khác → ghi kèm thư mục.

**Đường dẫn trong kế hoạch**: 255 đường dẫn khác nhau (kèm số dòng), đối chiếu bằng script với `git ls-files -co --exclude-standard` → 255 có thật, 0 không thấy, 0 trùng tên, 0 số dòng vượt độ dài file. Script chỉ kiểm file có thật và số dòng nằm trong file, không kiểm nội dung dòng đó.

**Chưa kiểm được** (ghi rõ để không coi là đã xác minh):

- Migration nào đã áp trên prod: MCP Supabase chưa ủy quyền → A2, A3, nhóm B để ở L13 (C3).
- Thân hàm `applySubmittedSetReconcile`, `applySetReconcileEngravedCodes` (L5) và 5 export ở `account-access-request-store.ts`, `account-access-request.ts` (L9): mới đếm nơi gọi, chưa đọc thân → đọc trong lát, không chắc thì GIỮ.
- «~57 export» là đếm tay từ §3; số chính xác có sau L0.
- Hai ghi nhận bảo mật cuối §8: chưa xác minh.
