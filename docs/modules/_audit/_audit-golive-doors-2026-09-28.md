# Biên bản go-live doors (local, 2026-09-28)

Một file cho lát B, C và D. Kế hoạch vẫn ở `_plan-golive-A-ia-doors-2026-09-28.md`.

| Trường | Giá trị |
|--------|---------|
| Máy | Nghĩa Mac · `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` (tip hiện tại, không fetch / reset) |
| Commit | **Chưa commit.** Không push / PR / Vercel / migrate. |

## Lát B — CSSD

Neo: Plan A §2 P0 + §5. Domain 09:26: menu P0-3 = **B** (link shell Quy trình, sidebar giữ nguyên).

| # | Việc | Cách |
|---|------|------|
| P0-1 | Thu hồi mẻ | Giữ nút trên **phiếu mẻ đang mở** (`MeTietKhuanProcessStep` → modal, có mã lô). Giữ chip **Sự cố quy trình** trên `/cssd-su-co`. Bỏ nút «Thu hồi mẻ» và cột «Thu hồi» trên danh sách. Bỏ luôn modal «Báo sự cố» trên shell danh sách (không mã lô; tab Mẻ đang `suppressShell` nên nút đó không hiện trên Quy trình). Bỏ nút «Thu hồi theo mẻ» trên `/cssd-su-co` và trên `report?tab=incident`. Bookmark `entry=batch-recall` vẫn mở form nếu có URL cũ. |
| P0-2 | Xác nhận / in | «Phiếu gần đây của tôi» chỉ còn trạng thái. Một link **Nhật ký** → `report?tab=incident`. Tab Sự cố của báo cáo giữ xác nhận và in. |
| P0-3 | Tỷ lệ + cửa vào | Dải KPI dùng `quyTrinhKyCount`, `suCoKyCount`, `tyLeQuyTrinhKhongSuCo` từ analytics core. Analytics null → tỷ lệ «—» (không gắn thêm %). Không fallback `100 − sự cố/quy trình` trên `raw`. Không sửa `cssd-analytics-core.ts`. Cửa vào = link «Báo cáo CSSD» trên shell `/cssd-quy-trinh` → `/cssd-erp/report`, chỉ khi có quyền `CSSD_REPORT`. Không thêm mục sidebar. |
| P0-4 | Sự cố máy | «Báo sự cố» trên bảo dưỡng là link `cssdSuCoEquipmentHref`: `/cssd-su-co?group=EQUIPMENT`, thêm `&machine=` khi đã chọn máy (`selTb`). Bỏ modal EQUIPMENT. Form giữ `initialMachineId` cả khi effect đổi nhóm (không xóa máy đã chọn). |
| P0-5 | Banner admin | Câu thứ hai trên `QuanLyDungCuPage`: «Luân chuyển ở Dụng cụ, tab Luân chuyển.» Hết chữ «cửa Chuyển» / sự cố. |

Không đụng: WIP M-04, leftover (AGENTS.md, script/csv/txt move sách, proposal QLCV), mục sidebar «Báo cáo», nút «Báo nhanh», phụ lục Báo cáo chính thức (lát F), tooltip công thức core, cảnh báo «trạm >5%» và cột biểu đồ từ `raw`, `InventoryIssueModal`, P1, README CSSD.

File: `MeTietKhuanPage.tsx`, `me-tiet-khuan-columns.tsx`, `SuCoBaoCaoPage.tsx`, `SuCoReportForm.tsx`, `CSSDReportPage.tsx`, `ReportDashboard.tsx`, `BaoTriThietBiPage.tsx`, `QuanLyDungCuPage.tsx`, `cssd-routes.ts` (+ spec), `src/app/cssd-quy-trinh/page.tsx`.

UAT: (1) Phiếu mẻ đang xử lý còn Thu hồi; danh sách không. (2) Sự cố: lập bằng chip; phiếu gần đây không Xác nhận/In; một link Nhật ký. (3) KPI tỷ lệ từ analytics; null thì «—»; link Báo cáo CSSD trên Quy trình khi có quyền. (4) Bảo dưỡng «Báo sự cố» sang `?group=EQUIPMENT` kèm máy. (5) Banner admin hết «cửa Chuyển».

Test: `npx vitest run src/lib/cssd-routes.spec.ts` — 6 passed.

## Lát C — Giám sát nhãn

Neo: Plan A §1.3, §2 P1-4 / P1-5 / P1-7. Chỉ copy UI. Không đổi công thức VST/GSC/NKBV, không thêm route hay sidebar.

| # | Chỗ | Sau |
|---|-----|-----|
| P1-4 | `/thong-ke` VST/GSC | «Thống kê khoa — không phải bản ký gửi Ban Giám đốc.» Link Báo cáo chính thức. Header «Thống kê khoa». Bỏ câu ngược «không thay trang thống kê». |
| P1-5 | Tab Thống kê NKBV | «Tra cứu ca theo kỳ — không phải bản in ký.» Link Báo cáo chính thức. Tab và câu tỷ lệ mẫu số giữ nguyên. |
| P1-7 | Form GSC | `/giam-sat-chung` = «Form giám sát chung» (mọi loại). `/tuan-thu` giữ «Giám sát tuân thủ», cửa từ hub. Hub có một dòng bản ký. Không chip sidebar. In phiếu phiên giữ nguyên. |

File: `src/app/thong-ke/layout.tsx`, `VSTAnalyticsView.tsx`, `GscAnalyticsView.tsx`, `GscFormView.tsx`, `src/app/giam-sat-chung/page.tsx`, `NkbvDashboardPanel.tsx`, `GiamSatHubPage.tsx`, `app-shell-scope.ts` (+ spec).

UAT: (1) `/thong-ke/vst` và `/gsc` — dòng thống kê khoa + link Báo cáo chính thức; số không đổi. (2) NKBV tab Thống kê — tra cứu ca, không phải bản in. (3) Hub — một dòng bản ký, không mục sidebar mới. (4) Form gốc vs tuân thủ — hai nhãn khác nhau; nút In phiếu A4 còn. (5) Bản ký vẫn in từ Báo cáo chính thức.

Test: `npx vitest run src/lib/app-shell-scope.spec.ts` — 4 passed. Chưa bấm UI (trang redirect `/login`).

## Lát D — Quản trị vs vận hành

Neo: Plan A §2 P1-1, P1-2, P1-3 và §4 lát D. Domain 27 nhãn 2 và 6. Sidebar «CSSD · Tra cứu» giữ nguyên.

PA1: hai hàng tab (Việc / Tra cứu) — tip Dụng cụ đã có, một click. PA2: một hàng có divider — cùng một click nhưng phải gộp strip. Chốt PA1.

| # | Việc | Cách |
|---|------|------|
| P1-1 | Nút lập trên tab duyệt | Bỏ «Lập phiếu rà soát» trên chrome tab Rà soát. Lập vẫn ở Dụng cụ → Đề nghị. Link cùng chữ trên chi tiết bộ (khi không sửa master) giữ — đó là lối từ bộ đang xem, không phải tab duyệt. |
| P1-2 | Cụm Việc / Tra cứu | Giữ hai hàng: Việc = Đề nghị danh mục, Luân chuyển. Tra cứu = Bộ, Loại, Lịch sử kho. Câu dẫn Tra cứu ghi «Lịch sử kho». |
| P1-3 | Nhãn sổ admin | Tab `lich-su` đổi nhãn **Sổ rà soát** (URL `?tab=lich-su` giữ). Dụng cụ giữ tab **Lịch sử kho**. Dòng chờ tải sổ admin hết chữ «lịch sử». |

File: `QuanLyDungCuPage.tsx`, `SetReconcileHistoryList.tsx`, `src/app/cssd-dung-cu/page.tsx`.

UAT: (1) Tab Rà soát không còn nút «Lập phiếu rà soát». (2) Tab admin kế bên là «Sổ rà soát», không còn «Lịch sử». (3) `/cssd-dung-cu` có hai hàng Việc và Tra cứu; tab kho vẫn «Lịch sử kho». (4) Sidebar vẫn nhóm «CSSD · Tra cứu», không thêm mục. (5) Lập đề nghị vẫn mở từ tab Đề nghị trên Dụng cụ.
