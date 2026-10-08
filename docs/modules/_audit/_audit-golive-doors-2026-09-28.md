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

## CSSD/SC sâu

Neo: D1 / G-P0-06 (luân chuyển ≠ sự cố) · picker §17.3 / Domain 23 · Domain 27 chỉ nhãn (không đổi IA). Không migrate.

| | Việc |
|---|------|
| P0 | Phiếu luân chuyển (`INSTRUMENT_MOVE/TRANSFER/REPLENISH/RETURN_KHO`) không còn đếm vào tỷ lệ «không sự cố» và không bật `is_red_alert` trên chu trình (cờ đó chặn cấp phát). Nháp vẫn loại khỏi báo cáo; lúc ghi Hỏng/Mất, nháp đang mở vẫn tính để ngưỡng lần 2 không lệch. |
| P0 | Picker sự cố liệt kê từng chu trình mở (không gộp theo mã bộ). Ghi phiếu gắn chu trình đã chọn, hoặc đúng một chu trình đang mở. Chu trình đã dùng / ngoài 6 trạm không nhận sự cố quy trình. Không có chu trình mở thì Hỏng/Mất vẫn ghi sổ tồn theo bộ, không khóa chu trình lệch. |
| Park | Đóng/xác nhận phiếu chỉ đổi trạng thái nhật ký — không hoàn tồn (tồn đã trừ lúc ghi). Không có cửa sửa/xóa phiếu đã ghi sổ. Domain 27 không code. `InventoryIssueModal` không caller. M-04 không đụng. |

## ME sâu

Neo: file 18 (phiếu mẻ) · 26 P0-1 (thu hồi một cửa khi phiếu mở + mã lô, hoặc chip PROCESS) · RPC `rpc_cssd_me_*` là cửa ghi. Không đổi Domain QT. Không migrate.

| | Việc |
|---|------|
| Cửa | Tạo / nạp / gỡ / bắt đầu / kết thúc / QC-nhả / BI: mỗi việc một hàm → một RPC (kết thúc chu trình là một `UPDATE` trạng thái `CHO_DANH_GIA_QC`, không có cửa thứ hai). Thu hồi ghi một RPC `rpc_cssd_me_thu_hoi`: nút trên phiếu đang mở (có mã lô) hoặc chip Sự cố quy trình; QC không đạt và BI dương gọi cùng RPC (cascade, không phải cửa UI thứ hai). Danh sách không còn Thu hồi và không còn In. In phiếu nằm trên phiếu đang mở. |
| P0 đếm | «Số bộ trong mẻ» và danh sách bộ trên phiếu chỉ tính `is_active = true`. Chu trình thu hồi giữ `lo_tiet_khuan_id` nhưng `is_active = false` — không cộng vào đếm. Khớp kho (`rpc_cssd_kho_station_counts`) và báo cáo (analytics lọc active). In phiếu vẫn liệt kê cả chu trình đã tắt để có cột hướng xử lý. |
| Park | L04 `parent_bo_id`: cổng nạp vẫn là vai trò quy trình MAIN/SUB, không chặn catalog mẹ — cột catalog chưa phải cửa ghi (không migrate). M-04 picker MDM → specs → QT21 HD.03 đã đúng; catalog viện đầy đủ vẫn park. Lọc nhiệt app và `fn_cssd_me_ly_do_lech_phuong_phap` cùng luật (hơi nước = mọi dòng chịu nhiệt; Plasma/EO = có dòng không chịu nhiệt, thiếu dữ liệu thì chặn). In từ lịch sử QR là cửa đọc tra cứu, không ghi. Sản lượng trạm bỏ chu trình inactive sau thu hồi — cùng luật active, không sửa `cssd-analytics-core`. |

## GSC sâu

Neo: form `saveGiamSatChung` / `deleteGiamSatChungSessions` · view live `gstt_fact_gsc_dashboard_summary` + `v_gstt_giam_sat_chung_sessions_full` (cùng `results_jsonb`, `is_active`) · metric-dictionary GSC 2 chữ số. Không đổi Domain QT. Không migrate. Tip `c1e5ddd`.

| | Việc |
|---|------|
| Cửa | Một cửa ghi phiên: form GSC (hub, tuân thủ, hệ thống, nhật ký, QR `?edit=`, offline replay) đều gọi `saveGiamSatChung`. Xóa hẳn một action `deleteGiamSatChungSessions`. Không có cửa ẩn (`is_active=false`) trên UI. VST ghi `gstt_fact_vst_*` — không ghi đè fact GSC. BCTH và NKBV chỉ đọc RPC. Hub BM.02/BM.03 là deep-link `?bk=` trên `/giam-sat-chung/tuan-thu`, cùng action lưu. |
| P0 đếm | Thêm/sửa ghi `results_jsonb`; view lịch sử và KPI/top lỗi/so sánh đếm lại từ jsonb, bỏ phiên `is_active=false`. Xóa hàng thì cả lịch sử và báo cáo mất phiên (không summary trigger). `%` KPI đã tính lại từ Đạt/áp dụng (2 chữ số). Top lỗi và `do_lech` trước đó giữ số ROUND RPC — cùng đếm 1/3 ra 33.3 cạnh KPI 66.67. Nay top lỗi, tiêu chí×khoa, và độ lệch tự GS − chuyên trách tính lại từ đếm. |
| P0 cửa | Picker `lop_giam_sat` trên list đã đúng (thực hành ẩn `he_thong` + hub VST; hệ thống chỉ `he_thong`). `?bk=` vẫn mở mẫu lookup kể cả khi list đã lọc — cửa thứ hai. Giữ BM.02/BM.03 trên tuân thủ (hub VST). Chặn lớp hệ thống trên tuân thủ, thực hành trên hệ thống, và WHO (form VST). |
| Park | GSC-L05: KPI mặc định vẫn lọc `loai_giam_sat` null hoặc `TUAN_THU`, chưa tách `lop_giam_sat` / báo cáo hệ thống riêng (file 16 R7). Hybrid QT.06 chưa hiện trên picker hệ thống (R6). `worst_khoa_ty_le` trên overview không có đếm kèm — giữ số RPC. Không invent KPI. |

## Workflows sâu

Neo: sidebar `sidebar-nav-groups.ts` là cổng module. Tab trong page là cửa thao tác. Domain 27 không đụng (trạm QC đã là «Kiểm bộ», không có route riêng). Không migrate. Không đổi Domain QT. Tip trước lát: `ff4afee`. Commit lát: `689c231`.

| Cửa nhân viên | Đường |
|---------------|--------|
| CSSD Quy trình | Sidebar «Quy trình» → Chu trình (Kiểm bộ là trạm QC trên cùng trang) · Mẻ · kính Truy vết. Link «Báo cáo CSSD» khi có `CSSD_REPORT`. |
| Dụng cụ | Việc: Đề nghị danh mục · Luân chuyển. Tra cứu: Bộ · Loại · Lịch sử kho. Hỏng/Mất sang Sự cố. |
| GSC | Hub (nhiều quyền) hoặc sidebar một quyền → tuân thủ. Cùng hàng: Nhật ký vận hành · Đánh giá hệ thống. Header từng cửa một nhãn. |
| NKBV | Hub «NKBV» và quiet «Danh sách NKBV» (`?tab=cases`). Năm tab trên `/giam-sat-nkbv` giữ. |
| QLCV | Sidebar «Công việc» → Điều hành. Tab Nhiệm vụ / Định kỳ / Báo cáo chỉ khi được sửa mẫu. Bookmark `TUAN` / `PHAN_CONG_TUAN` / `CHUONG_TRINH` / `KE_HOACH_NAM` về Điều hành. |

| | Việc |
|---|------|
| P0 nhãn | Header `/cssd-erp/report` và mirror `/thong-ke/cssd` là **Báo cáo CSSD** (trước đó «Báo cáo»). Tab Dụng cụ mobile hết chữ «Chuyển» — nhãn **Luân chuyển**. Header `/giam-sat-chung/nhat-ky` = Nhật ký vận hành; `/he-thong` = Đánh giá hệ thống (trước đó cả hai ghi «Giám sát tuân thủ»). |
| P0 tab ẩn | `/cssd-erp/inventory` trỏ thẳng `/cssd-dung-cu`. Bookmark `?tab=kho` trên Quy trình không vẽ Chu trình — một dòng «Đang mở Dụng cụ…» rồi sang Dụng cụ. |
| P0 sổ | `?tab=loai` và URL trống Quản trị dụng cụ vẽ **Bộ** (sheet Loại khi `?tab=loai`). Trước đó rơi xuống **Sổ rà soát** dù tab không chọn. Đóng sheet Loại về `?tab=bo`. Sổ chỉ khi `?tab=lich-su`. |
| P0 GSC | Hub thêm hai thẻ Nhật ký vận hành và Đánh giá hệ thống. Form GSC (kể cả form gốc) có hàng link ba cửa. Một quyền GSC vẫn vào thẳng tuân thủ (bỏ click hub); từ tuân thủ bấm sang hai cửa kia. |
| Park | Admin P2 / Auth-ban. Không thêm mục sidebar Báo cáo CSSD. Form gốc `/giam-sat-chung` vẫn một form mọi loại — hàng link đẩy sang cửa riêng, không xóa route. QLCV `?tab=DINH_KY` khi không có quyền sửa: ở Điều hành, không xóa query. `InventoryIssueModal` không caller. Domain 27 không code. |

## VST sâu

Neo: domain §2.1 (tối đa 3 đối tượng; tuân thủ tối đa 2 chỉ định WHO, bỏ sót 1) · một cửa `saveVSTSession` / `deleteVSTSessions` · KPI `rpc_dashboard_vst_strategic_analytics_impl` + view `v_gstt_giam_sat_vst_sessions_full` (cùng đếm dòng `gstt_fact_vst`, phiên `is_active`). BCTH đọc payload đã chuẩn hóa. Không ghi fact GSC/NKBV. Không migrate. Không đổi Domain QT. Commit lát: `f8eae1d`.

| | Việc |
|---|------|
| Cửa | Form và offline replay cùng `saveVSTSession`. Sửa = cùng UUID, chủ phiên, trong cửa sổ sửa. Xóa cứng phiên + cơ hội (không cửa ẩn trên UI). Zod: 1–3 đối tượng, mỗi cơ hội ≥1 thời điểm. |
| P0 đếm | «Đúng kỹ thuật» và «Đủ thời gian» chia `da_tuan_thu` (đã rửa/chà). «Lạm dụng găng» chia `bo_sot`. Trước đó app chia mọi `tong_co_hoi` nên bản in và fold Nâng cao thấp hơn RPC khi có bỏ sót. Tuân thủ vẫn `đạt / tong_co_hoi`, 1 chữ số. `do_lech` = tự GS − chuyên trách sau khi mỗi tỷ lệ đã làm tròn 1 chữ số. |
| P0 sửa | Sửa phiên chỉ xóa cơ hội cũ sau khi đã dựng dòng mới. Insert lỗi thì ghi lại dòng cũ — KPI không về 0 vì phiếu sửa dở. Header phiên cập nhật sau khi cơ hội mới đã vào. |
| Park | Biểu đồ thời điểm tách chỉ định WHO (một cơ hội 2 mốc đếm 2 trên moments, 1 trên `tong_co_hoi`) — đúng RPC, không gộp. Xóa vẫn cứng, không soft-delete (không migrate). CCS không cộng NKBV. |

## BCTH sâu

Neo: bản ký `/bao-cao-tong-hop` chỉ đọc. KPI VST/GSC lấy counts đã chuẩn hóa ở lát VST/GSC (`normalizeVstStrategicPercents` / `normalizeGscStrategicPercents`), rồi `computeTyLeVst` (1 chữ số) và `computeTyLeGsc` (2 chữ số). NKBV = `ti_le_xac_nhan_so_voi_pa` nguyên từ aggregate (làm tròn số nguyên). Phụ lục CSSD = `summarizeCssdAnalyticsBrief` cùng bundle `/cssd-erp/report`. Không ghi fact GSC/VST/NKBV. Không migrate. Không đổi Domain QT. Tip trước lát: `925531b`. Commit lát: `4c95c74`.

| | Việc |
|---|------|
| Cửa | Một cửa đọc: sidebar «Báo cáo chính thức» và `/` cùng redirect `/bao-cao-tong-hop`. Action `getBaoCaoTongHopAnalytics` chỉ gọi RPC/đọc strategic + bundle CSSD. Không insert/update/delete fact. In phiếu là HTML cục bộ. |
| P0 đếm | Δ tuần và `ky_truoc` của GSC làm tròn 2 chữ số sau khi mỗi tỷ lệ đã làm tròn (66.67 − 33.33 = 33.34). Trước đó cả hai chỉ số làm tròn 1 chữ số nên bản ký hiện 33.3 cạnh tỷ lệ 66.67. VST giữ 1 chữ số. Màn hình và cột «So sánh tuần» tách hai dòng: «Δ 2 tuần» và «vs kỳ trước (dd-mm→dd-mm)». |
| P0 cửa | «Chi tiết thống kê» trên ba KPI vệ sinh tay và trên so sánh khoa mang `tu_ngay` / `den_ngay` / `khoa_ids` của kỳ đang mở. Trước đó rơi `/thong-ke/vst` và `/thong-ke/gsc#so-sanh` không kỳ — thống kê khoa mở kỳ mặc định, số lệch bản ký. NKBV vẫn `?tab=dashboard` (tab Thống kê). Phụ lục CSSD vẫn `/cssd-erp/report?tab=volume&from=&to=` — khớp #68, không còn `/thong-ke/cssd`. |
| Park | `fetchMucTieuKpiVien` không có caller — không gắn mũi tên mục tiêu viện lên thẻ. `ty_le_avg` chỉ để sắp xếp nội bộ, không hiện nhãn CCS. Tỷ lệ CSSD trên phụ lục là số đã làm tròn 1 chữ số từ core; màn Báo cáo CSSD `toFixed(1)` cùng số. Gap in dùng trị tuyệt đối vì hai cột tự GS và chuyên trách đã in đủ dấu. |

## BCTH sâu — đếm khớp nguồn

Neo: cùng lát đọc. VST hiển thị 1 chữ số (`formatPercent1` / `rateFromTotals`). GSC hiển thị 2 chữ số (`formatPercent2` / `gscCompliancePercentFromCounts`). Thêm/sửa/xóa phiên ở form nguồn đổi fact; BCTH lần tải sau đọc lại RPC đã chuẩn hóa — không có cửa ghi trên bản ký. Tiêu đề trang vẫn «Báo cáo chính thức». Không migrate. Không đổi Domain QT. Tip trước lát này: `22246db`. Commit lát: `fcdc133`.

| | Việc |
|---|------|
| P0 đếm | Cột và tooltip khoa module VST hết `formatPercent2` (66.7 thành 66.70 cạnh KPI 66.7). Δ đối soát VST là 1 chữ số (66.7 − 33.3 = 33.4), GSC là 2 chữ số (66.67 − 33.33 = 33.34). |
| P0 in | Mục 3b không còn một bảng `mergeMasterGapRows`. Trước đó % VST giữ lại, mẫu số lấy max với GSC — ô có thể là 66.7% (10/20) trong khi 10/20 là 50% GSC. Nay hai bảng: VST `66.7% (2/3)`, GSC `50.00% (10/20)`. |
| Park | Biểu đồ cột in vẫn ưu tiên GSC %, chú thích đã ghi; bảng khoa bên dưới có đủ hai cột. `mergeMasterGapRows` còn trong mapper, bản in không gọi. Không bịa công thức CDC. |

## Admin Soft sâu

Neo: hồ sơ `v_mdm_nhan_su_full` (cột `is_active`, `auth_user_id`, `extra_data.account_request`, `vai_tro_he_thong_id` → `sys_roles`). Gán quyền đăng nhập: `rpc_assign_staff_ksnk_role`. Ma trận: `sys_role_permissions` / `v_sys_role_permissions_matrix`. Không đổi model RBAC. Không migrate. Không đổi Domain QT. Tip trước lát: `71707fa`. Commit lát: `a06ebcf`.

| | Việc |
|---|------|
| Cửa | Tạo / sửa hồ sơ: form Nhân sự. Tạo TK, đặt lại MK, duyệt / từ chối phiếu: cột Tài khoản trên cùng danh sách. Ma trận quyền: hub tab Phân quyền. Hub Tài khoản chỉ đọc số và dẫn link. |
| P0 đếm | Số «Phiếu chờ duyệt» đếm hồ sơ `extra_data` chờ duyệt — cùng lọc `?pending=1`. Trước đó đếm mọi dòng `sys_account_access_request` status chờ, kể cả phiếu không có trên danh sách. Tìm trên danh sách chờ lấy `total` từ cùng query (hết đếm lại trên một trang). Thẻ «chưa có tài khoản» đếm `is_active` và `auth_user_id` null trên view, đầu không cắt 1000 dòng. `?chuaTk=1` mở đúng tập đó. |
| P0 cửa | Link thẻ hết `/tai-khoan-nhan-su` (redirect sang cả danh sách Nhân sự). «Bộ thiếu mã chuẩn» mở `?tab=bo` (trước đó URL trống Quản trị dụng cụ = tab Loại). Dropdown vai trò chỉ 4 vai trò đang hoạt động, nhãn tiếng Việt; danh sách map `sys_roles.name` cùng nhãn. |
| Park | Auth-ban khi khóa hồ sơ. Dual-admin duyệt tự đặt lại MK. Đổi model RBAC. Xóa file orphan `TaiKhoanNhanSuPage`. Phiếu trên bảng `sys_account_access_request` lệch `extra_data` không hiện số (số theo danh sách). Thẻ khoa / bảng kiểm vẫn đếm trên payload đã tải. |

## CSSD Đóng gói / tồn chu trình sâu

Nhánh `cursor/cssd-dong-goi-ton-9e1e` từ `209b5d6`. Không push / migrate. Chưa UAT đăng nhập.

| Cửa | Ghi / đọc |
|-----|-----------|
| `/cssd-quy-trinh` trạm Đóng gói | Quét → `prepareDongGoiBomGateScan` → thẻ `gateMode` → `confirmDongGoiAdvance` → `scanQR` DONG_GOI. Không BOM / tách / vật liệu trên trạm. |
| Chờ đóng gói | `getWaitingListByStation("DONG_GOI")` đọc fact còn `is_active` ở trạm QC. |
| Chờ tiệt khuẩn | `fetchCssdTietKhuanWaitingRows` đọc fact Đóng gói, chưa mẻ, `is_active`. |
| Đếm trạm | `getCssdStationFlowMap` trên view active (cùng luật `is_active` với `rpc_cssd_kho_station_counts`). |

| | Việc |
|---|------|
| P0 | `5e92b52` — hết cắt 120/500 (chờ mẻ) và 5000 (bản đồ trạm) và trang 1000 mặc định của hàng chờ. `is_active=false` / thu hồi không vào các query này. |
| Park | Đổi QT/QĐ/CDC hoặc nới scan-only. Ghi sự cố / tách nhiệt trên trạm Đóng gói. `InventoryIssueModal`. Auth-ban. GSC-L05. RPC kho chip không trả từng trạm — đếm trạm vẫn trên view active, không thêm migration. |

## S-C — Duyệt BOM / đề nghị atomic claim

Neo: tip `cursor/cssd-dong-goi-ton-9e1e` @ `3250a2e`. PA2 chốt: TypeScript CAS-claim trước `applyApprovedBomLines` / `applyCatalogDeNghiOverwrite`. Không port full apply sang plpgsql RPC (park PA1). Không migrate apply; không commit/push.

| | Việc |
|---|------|
| P0 claim BOM | `approveSetReconcileBomAction`: validate → claim `BOM_PENDING`→`BOM_APPLYING` (`.contains` attributes) → apply → `BOM_APPROVED`. Apply lỗi → `BOM_APPLY_FAILED` (không revert PENDING). |
| P0 claim đề nghị | `approveCatalogDeNghiAction`: `PENDING`→`APPLYING` (update+select) → apply → `APPROVED`. Lỗi → `APPLY_FAILED` (+ `reject_reason` ngắn). Hàng chờ vẫn PENDING-only. |
| Reject | BOM: `BOM_PENDING` / `BOM_APPLY_FAILED` / `BOM_APPLYING`. Đề nghị: `PENDING` / `APPLY_FAILED`. Không apply. |
| Migrate file | `20260928150000_cssd_catalog_de_nghi_apply_claim_status.sql` nới CHECK status — **chưa apply**. BOM status nằm jsonb attributes — không cần migrate. |
| Park | Full SQL RPC idempotent từng dòng THEM_DONG (PA1). Re-approve từ FAILED (cố ý cấm để tránh double). Auth-ban. |

## S-D — Reject / domino clear stamp (consistency W1/W7/W8/W6)

Neo: tip `cursor/cssd-dong-goi-ton-9e1e` @ `2fdacaf` (+ dirty S-C). PA-A: TS clear-path local-first; migration RPC file-only. Không commit/push/migrate.

| | Việc |
|---|------|
| W1 reject | `executeRejectToPreviousStation`: cùng UPDATE null hóa `thoi_gian_*` / `nguoi_*` trạm hủy (+ `ma_cycle_qr` / `bom_kiem_dem_*` nếu Đóng gói); `before` vào ngoai_le qua lifecycle. |
| W7 domino | `executeIncidentReportAndRollback`: clear stamp các trạm *sau* `targetStation` đến trạm hiện tại; cùng payload `before`. |
| W8 lifecycle | `insertCssdLifecycleEvent` giữ `payload` → `chi_tiet`; append không nuốt lỗi khi `soft:false`. |
| W6 freeze/unlock | Freeze ném lỗi UPDATE; unlock resolve QR hub + chặn khi còn phiếu sự cố OPEN. |
| Migrate file | `20260930140000_cssd_reject_station_clear.sql` (`rpc_cssd_reject_station`) — **chưa apply / chưa wire TS**. |
| Park | Update+ngoai_le chưa một transaction (chờ apply RPC). W2/W3 re-scan / CAP_PHAT re-issue. Domino không clear stamp *tại* target (giữ bước còn hiệu lực). |

File S-D: `cssd-station-clear.ts`(+spec), `cssd-workflow-application.ts`, `su-co-report.application.ts`, `cssd-lifecycle-events.ts`, `cssd-quy-trinh-exceptions.ts`, `cssd-workflow.commands.actions.ts`, `cssd-workflow-ops.actions.ts`, migration trên.

## S-E — Bootstrap sau MAT + Hỏng/Mất nhanh (W4/W5)

Neo: tip `cursor/cssd-dong-goi-ton-9e1e` @ `072b27e` (S-C/S-D đã commit local). PA1 TS mỏng; không migration.

| | Việc |
|---|------|
| W4 bootstrap | `bootstrapCssdQuyTrinhFromBoId` (quét Tiếp nhận + in tem): chỉ đồng bộ mã trên chu kỳ **active**. Chu kỳ đã đóng (MAT / thu hồi / đã thay) không bật lại `is_active` → mở shell mới (tram null, tinh_trang mặc định), `suds_count` cũ+1 như RPC chu kỳ mới; ngoai_le `CHU_KY_MOI_SAU_DONG` trỏ chu kỳ trước. Excel kho (`importCSSDData`, không caller) chỉ map chu kỳ active. |
| W5 Hỏng/Mất | Một cửa = Báo sự cố CSSD (`/cssd-su-co`: phiếu + sổ tồn + khóa). `recordPackCondition` chỉ ghi bao gói (Bình thường/Ướt/Rách/Bẩn), không đổi `is_active`, chỉ chu kỳ active; HONG/MAT bị từ chối kèm chỉ đường. `PackConditionSelect` bỏ Hỏng/Mất. Message thiếu tinh_trang hết trỏ cửa không tồn tại. `reportInventoryIssue` / `recordInstrumentTransaction` đã 0 trong src. |
| PA loại | PA-A route Hỏng/Mất nhanh qua `executeIncidentReportAndRollback` = cửa sự cố thứ hai (chồng). PA3 chặn tiếp nhận khi chu kỳ cuối đóng = kẹt nhân viên. RPC bootstrap FOR UPDATE (chống 2 shell đồng thời) — park. |
| Park | `PackConditionSelect` / `InventoryIssueModal` / `importCSSDData` không caller — chờ Nghĩa cho xóa file. Race 2 quét Tiếp nhận cùng lúc (cần RPC). |

## S-E2 — Hotfix hồi quy `5e92b52` (Mẻ tiệt khuẩn)

| | Việc |
|---|------|
| P0 | `fetchCssdBatchMembers` gọi `parseUsedClinicallyFromMetadata` nhưng import bị thay khi phân trang (5e92b52) → mẻ có bộ: ReferenceError, danh sách bộ trong mẻ + in phiếu mẻ trả lỗi. Trả import. |
| Hygiene | `cssd-read.actions.ts` select động trạm trước: ép kiểu hàng trả về (chỉ type, runtime không đổi). |

## S-F (phần RP1) — Báo cáo CSSD đọc lịch sử chu kỳ

| | Việc |
|---|------|
| P0 đếm | `fetchCssdAnalyticsBundle` / `fetchCssdReportBundle` lọc `is_active=true` → bộ tiếp nhận lại (chu kỳ cũ đóng) mất sản lượng/cấp phát/NV kỳ trước; «chu trình kỳ» tái sử dụng luôn ≤1. Nay đọc mọi chu kỳ (bỏ tem hex legacy), lọc server theo mốc quét ±1 ngày, phân trang (hết cắt 8000). Ngày bucket = ngày VN (`cssdVnDay`), ca đêm 00–07h không lùi ngày. |
| Nhãn | Biểu đồ cột «Tổng mẻ» → «Lượt hoàn thành»; chú thích hết ghi sai «tồn hiện tại». Bảng nhật ký thêm cột «Chu kỳ» (Đang lưu hành / Đã đóng). Cờ đỏ bảng: khớp `quy_trinh_id`, chỉ fallback mã khi phiếu không gắn chu kỳ. |
| Park | SC6 kho: `loadRedAlertKeys` (TS) khớp cả `ma_qr` → bộ đỏ mãi mọi chu kỳ, lệch chip RPC (`quy_trinh_id`). Cần lát S-F2 (TS + RPC cùng luật đóng phiếu, migration file). RP2 công thức «tỷ lệ quy trình không sự cố» (có thể âm) — Domain chốt định nghĩa. |

## S-F2 — Cờ đỏ kho theo chu kỳ (SC6)

| | Việc |
|---|------|
| P0 | Chip kho / bản đồ trạm (`loadRedAlertKeys`) và ngưỡng `isRedAlert` chỉ theo `quy_trinh_id` của phiếu còn hiệu lực (`is_active`, không nháp, không luân chuyển). Bỏ fallback `ma_qr` (mã bộ). |
| RPC file | `20261001120000_cssd_red_alert_by_quy_trinh.sql`: CTE `red` của `rpc_cssd_kho_station_counts` và `rpc_cssd_station_flow_counts`, backfill `cssd_fact_quy_trinh.is_red_alert`, thu hồi mẻ hết đếm đỏ theo `ma_qr`. **Chưa apply.** |
| Park | Báo cáo nhật ký vẫn fallback `ma_qr` khi phiếu không gắn `quy_trinh_id` (S-F). RP2 «tỷ lệ không sự cố» — Domain. |

## S-A2 — Vô hiệu phiếu sự cố CSSD

Neo: xác nhận (SC-8) chỉ đóng nhật ký, không hoàn bộ / cờ đỏ / tồn / đếm. PA1 (chọn): TypeScript `planCssdIncidentVoid` + `executeVoidIncidentReport` trên schema hiện có. PA2 RPC một transaction — chưa viết (park). Không migrate.

| | Việc |
|---|------|
| Cửa | Nhật ký sự cố (`/cssd-erp/report` tab Sự cố): nút **Vô hiệu phiếu** cạnh Xác nhận. Cùng quyền tạo phiếu. Thu hồi cả mẻ, nháp, duyệt BOM, điều chuyển, phiếu đã xuất kho hóa chất: từ chối, không ghi một nửa. |
| P0 bộ | Phiếu này là lần đẩy lui cuối (`SU_CO_DOMINO_ROLLBACK`, khớp `su_co_id` hoặc trạm + mô tả) thì trả `tram_hien_tai_id` về khâu phát hiện và khôi stamp đã xóa. Phiếu sau giữ trạm. Hóa chất/thiết bị hết phiếu còn khóa thì `is_dong_bang=false`. Có `LO_TIET_KHUAN_ID` và phiếu đã gỡ mẻ thì gắn lại khi mẻ đang trống. |
| P0 cờ đỏ | `is_red_alert` chu kỳ = còn phiếu hiệu lực mang cờ. Phiếu vô hiệu `is_active=false` và `is_red_alert=false`. |
| P0 đếm | `VO_HIEU` không vào `countsTowardCssdSafetyTally` (báo cáo + KPI). Sổ Hỏng/Mất/bổ sung/nhập của phiếu tắt `is_active` — tồn = SUM dòng còn hiệu lực. Bổ sung cộng lại kho dự phòng; nhập kho trừ lại. |
| Park | Thu hồi cả mẻ + máy HOLD. Điều chuyển lệch `bom_lines`. Xuất kho hóa chất đã ghi. Duyệt BOM. Một transaction (crash giữa tắt sổ và cộng kho). Không hiện lại phiếu vô hiệu trên nhật ký. |

## S-G — Cờ đỏ nhật ký theo chu kỳ

| | Việc |
|---|------|
| PA | PA1 (chọn): `collectReportRedQuyTrinhIds` — cột đỏ bảng chu kỳ chỉ khi `quy_trinh_id` trùng phiếu còn hiệu lực. PA2 giữ fallback `ma_qr` cho phiếu cũ không gắn chu kỳ — tô đỏ mọi chu kỳ cùng mã bộ (loại). |
| P0 | Phiếu không có `quy_trinh_id`, phiếu `VO_HIEU`, không còn bật đỏ chu kỳ khác. Cờ trên chính dòng sự cố giữ nguyên. |

## S-H — Đếm sự cố báo cáo hết cắt 8000

| | Việc |
|---|------|
| PA | PA1 (chọn): `fetchAllReportRows` cho nhật ký và KPI sự cố (cùng trang 1000 như chu kỳ S-F). Lỗi đọc sự cố trả về, không tính KPI với danh sách rỗng. PA2 nâng `MAX_REPORT_ROWS` — vẫn cắt im khi vượt. |
| Park | Mẻ tiệt khuẩn và bộ theo khoa trên cùng bundle vẫn `.limit(8000)` / 5000. RP2 công thức tỷ lệ — Domain. |

`npx tsc --noEmit` sau S-H: 6 lỗi kiểu có sẵn (tooltip `percentTooltipFormatter` thiếu `()`, `session.nguoi_giam_sat_id`, `bn_mdro_phenotype` string) cộng so sánh sau early-return vô hiệu — sửa kiểu, commit riêng.

## S-I — Mẻ tiệt khuẩn hết cắt 8000

| | Việc |
|---|------|
| PA | PA1 (chọn): `fetchAllReportRows` cho `cssd_fact_lo_tiet_khuan` (trang 1000). Cửa sổ server ±1 ngày trên `created_at` và `thoi_gian_bat_dau` (`reportTimestampWindow`, cùng chu kỳ); lọc ngày VN `cssdVnDay`. Lỗi đọc trả `success: false`. PA2 nâng trần 8000 — vẫn cắt im. PA3 giữ lookback 90 ngày `created_at` và `.slice(0, 10)` UTC — lệch ngày VN, bỏ mẻ bắt đầu trong kỳ nếu tạo quá 90 ngày. |
| P0 | Sản lượng máy và «Mẻ trong kỳ» đọc hết mẻ `is_active` trong kỳ. «Lượt hoàn thành» vẫn từ sản lượng trạm trên chu kỳ (S-F). |

## S-J — Bộ theo khoa hết cắt 5000

| | Việc |
|---|------|
| PA | PA1 (chọn): `fetchAllReportRows` mọi bộ `is_active` — snapshot sở hữu danh mục, không lọc ngày. Lỗi đọc trả `success: false`. PA2 lọc `created_at` theo kỳ ±1 — đổi «số bộ danh mục» thành bộ tạo trong kỳ, lệch nguồn đang lưu hành. Cấp phát theo khoa nhận đã lấy chu kỳ trong kỳ (S-F). PA3 nâng trần 5000 — vẫn cắt im. |
| P0 | Bảng «Số bộ theo khoa sở hữu» và `so_bo` brief/BCTH đọc hết bộ active. |

## S-K — Quét P0 còn lại (không vá)

| | Việc |
|---|------|
| Quét | Cùng bundle: máy `.limit(500)`, khoa `.limit(2000)`, tên NV `slice(0, 500)` — đếm máy/bộ không lệch ở quy mô khoa; tên NV thiếu khi >500 người. Nhật ký chu kỳ lọc `created_at` (S-F `f01266d2`), sản lượng lọc mốc quét ±1 — hai câu hỏi, đổi nhật ký đổi Excel. |
| Ngoài CSSD | QLCV `attachTaskRollup` `.limit(5000)` (lỗi query trả % 0). VST xuất Excel `.limit(2000)` phiên + `.limit(8000)` cơ hội; GSC xuất `.limit(5000)` — không phải bản ký RPC. NKBV trọng điểm `.limit(1500)` trên `nkbv_fact_ba_ngay_dung_cu` không lọc dụng cụ đang lưu — Domain. |
| Chọn | Không có một P0 kỹ thuật mỏng chắc chắn (sai ở quy mô hiện tại, không đổi QT). Không vá. |

## S-L — QLCV rollup việc con hết cắt 5000

| | Việc |
|---|------|
| PA | PA1 (chọn): `fetchAllByIdChunks` — cụm `nhiem_vu_id` 100, trang 1000, `order id`. Lỗi query ném (`formatQlcvDbError`); danh sách nhiệm vụ không trả % thiếu. PA2 nâng trần 5000 — vẫn cắt im khi vượt. |
| P0 | `%` checklist giữ công thức cũ (`percentFromQlcvChecklist` khi có mục; không thì `phan_tram_hoan_thanh`). |

## S-M — Excel VST/GSC hết cắt im

| | Việc |
|---|------|
| PA | PA1 (chọn): phiên VST/GSC và cơ hội VST trong kỳ + lọc khoa hiện có đọc hết trang (`fetchAllRangeRows`, cơ hội chia cụm `session_id` 100). Lỗi đọc hoặc metadata trả `success: false` — không file thiếu im. PA2 nâng trần 2000/8000/5000 — vẫn cắt im. |
| Giữ | Không đụng form giám sát ký / RPC WHO. |

## S-N — Summary bộ hết fan-out; chặn tắt/xóa khi còn chu kỳ

| | Việc |
|---|------|
| PA | `v_cssd_bo_dung_cu_summary`: gộp chi tiết và phân bổ theo `bo_dung_cu_id` rồi JOIN — `tong_so_luong_dung_cu` / `tong_phan_bo` không nhân chéo. `q_active` giữ active khác MAT. Cột, thứ tự, GRANT giữ nguyên. Migration `20261001160000_cssd_bo_summary_preaggregate.sql` — thêm file, chưa apply remote. |
| P0 | Soft-delete một, soft-delete nhiều, toggle tắt (đang bật), và lưu form khi đang bật sang tắt: còn ≥1 `cssd_fact_quy_trinh` `is_active` và `tinh_trang` khác MAT thì từ chối cả thao tác. Bật lại không chặn. |
| Park | DM3 allocate RMW `so_luong_hien_tai`; DN3 sync `ma_bo` → quy trình QR; deactivate cascade chi tiết; soft-delete loại; S-H SR2; S-I BOM snapshot; S-J VST; S-K revalidate mở rộng. Import danh mục không đi qua các action trên. |

## S-O — Kiểm kê / set-reconcile campaign hết cắt

| | Việc |
|---|------|
| PA | PA1 (chọn): bộ active và phiếu INSTRUMENT `is_active` đọc `fetchAllRangeRows` (trang 1000, lọc khoa nếu có), rồi suy `pendingBom` bằng `readSetReconcileStatus` — giữ cả key thường. Worksheet `fetchAllByIdChunks` cụm `bo_dung_cu_id` 100. Lỗi đọc trả `success: false`. Lọc `.contains` attributes loại vì bỏ phiếu key thường. PA2 nâng trần 400/200 — vẫn cắt im. |
| Giữ | RPC ledger kiểm kê và cửa UI Kiểm kê. |

## S-P — QLCV bảng việc con một nhiệm vụ hết cắt 200

| | Việc |
|---|------|
| PA | PA1 (chọn): `listCongViecByNhiemVu` đọc hết việc con active của một `nhiem_vu_id` bằng `fetchAllRangeRows` (trang 1000, `order` hạn rồi `id`). Lỗi ném `formatQlcvDbError`, không trả mảng cắt. PA2 nâng trần 200 — vẫn cắt im. |
| Giữ | Không đổi schema và UI panel. |

## S-Q — Quét P0 đếm/tồn/báo cáo (không vá)

Neo: tip `b90d956`. PA1 đọc hết trang chỉ khi cửa đếm/tồn/báo cáo cắt im ở quy mô hiện tại. PA2 nâng trần — loại (vẫn cắt im). Không đo được số dòng local (Postgres không chạy).

| Chỗ | Kết luận |
|-----|----------|
| `getDungCuGiaoDichLogsAction` `.limit(200)` | Tab «Lịch sử biến động» theo loại trên Quản trị dụng cụ. Tồn là cột/`SUM` sổ, không cộng từ danh sách này. Park. |
| Báo cáo máy `.limit(500)`, khoa `.limit(2000)`, tên NV `slice(0, 500)` | Đếm máy và nhãn khoa. Cùng kết luận S-K: không lệch ở quy mô khoa. |
| `listNhiemVuOptions` `.limit(500)` | Dropdown form việc / định kỳ. `%` và panel việc con đã đọc hết trang (S-L, S-P). |
| NKBV trọng điểm `.limit(1500)` | Park Domain (đã ghi). Hub một bệnh án `.limit(200/800)` không phải bản ký. |
| Ngoài cửa đếm | MDRO phiên `.limit(2000)` (cờ có phiếu, không phải bản ký). Đào tạo export. Vị trí VST form `.limit(5000)`. Bảo trì `.limit(200)`, nhật ký hóa chất, mẻ list 50, picker sự cố. `getCSSDImportExportData` `.limit(8000)` không có caller. |
| Hàng chờ Tiếp nhận | `getWaitingListByStation("TIEP_NHAN")` vẫn select danh mục bộ và chu kỳ có trạm, không `range` (các trạm khác đã `fetchAllActiveRows`). Chưa chắc vượt trang 1000. Không vá trần phòng thủ. |

Chọn: không có P0 kỹ thuật mỏng chắc (sai ở quy mô hiện tại, không đổi QT). Không vá.

## S-R — Void sự cố và cờ đỏ (không mở)

Neo: tip sau S-Q. PA1 chỉ vá nếu nút vô hiệu chưa gắn hoặc cờ đỏ sau void không đọc `quy_trinh_id`. PA2 RPC một transaction — vẫn park.

| Kiểm | Kết quả |
|------|---------|
| Nút | `IncidentVoidButton` trên tab Sự cố, cạnh Xác nhận, khi có quyền tạo phiếu `BAO_SU_CO`. |
| List / KPI | `VO_HIEU` không vào `countsTowardCssdSafetyTally` nên ra khỏi nhật ký và số sự cố kỳ. |
| Cờ đỏ | Void tắt `is_active` và `is_red_alert` phiếu; chu kỳ lấy cờ từ phiếu còn lại cùng `quy_trinh_id`. Chip kho (`loadRedAlertKeys`) và báo cáo (`collectReportRedQuyTrinhIds`) chỉ key `quy_trinh_id`. |

Migration `20261001120000_cssd_red_alert_by_quy_trinh.sql` vẫn chỉ file, chưa apply. Không lệch TS. S-R không mở.

## S-S — Hàng chờ Tiếp nhận hết cắt im

Neo: tip `257182a`. Cửa duy nhất: `CSSDERPPage` → `useCSSDWorkflow` → `getWaitingListByStation("TIEP_NHAN")`. Postgres local không chạy; baseline 2026-05 chỉ đếm chi tiết BOM 3960, không chứng minh số bộ / chu kỳ có trạm chắc < 1000 (`buildCssdBoMa` tới 9999/khoa).

| | Việc |
|---|------|
| PA | PA-A (chọn): `fetchAllActiveRows` cho chu kỳ active có trạm và danh mục bộ active (`order id`, `.range`). Lỗi ném `Error` — hook toast, không `setWaitingList` bằng mảng cắt. PA «success: false» loại vì contract hàm là `CSSDWaitingItem[]` (trạm khác cùng hàm cũng ném). PA-B nâng trần — vẫn cắt im. PA-C không vá — không chứng minh được quy mô < 1000. |
| P0 | Bộ chỉ có ở trang sau vẫn vào hàng chờ; bộ có chu kỳ ở trang sau không hiện nhầm là chờ tiếp nhận. Lọc mã chuẩn và shell `tram=null` giữ nguyên. |

## S-T — Import bộ không tắt khi còn chu kỳ

| | Việc |
|---|------|
| PA | PA1 (chọn): trước upsert/`dryRun`, nếu bảng `cssd_dm_bo_dung_cu` và dòng Excel ghi `is_active=false` trên bộ đã có thì đếm chu kỳ lưu hành (cùng `blockDeactivateForActiveCycles`, cụm `in` 100). Có chu kỳ thì `success: false`, không ghi file. PA2 để import bỏ qua luật form — cửa tắt thứ hai. |
| P0 | `1ac3c98` — `BoDungCuPage` gọi `smartImportData`. Form/toggle/xóa mềm đã chặn; import thì chưa. |
| Không vá | Hai quét bootstrap — vẫn park RPC. `existingCodes` không được nạp nên đồng bộ đầy đủ không ẩn mã thiếu; không bật lại (sẽ ẩn bộ ngoài file). Unique `ma_bo` giữ. Trần báo cáo máy/khoa, QLCV báo cáo kỳ (cờ cắt, Q-14), NKBV 1500, MDRO 2000, picker/export phụ — không lệch bản ký ở quy mô này. |

## Park — không vá lát này

RP2 tỷ lệ không sự cố; SSI SP; GSC-L05; Q-14/AB-2; Auth-ban; dual-admin; thu hồi cả mẻ/máy HOLD; điều chuyển cấu phần; phiếu đã xuất kho hóa chất; duyệt BOM re-approve; crash giữa tắt sổ và cộng kho; RPC một transaction void; PackConditionSelect orphan; NKBV trọng điểm `.limit(1500)` — Domain / Admin P2.

## S-U — NKBV KPI/BCTH mẫu số PA−loại trừ + khóa gửi lại khi đã chốt

Neo: tip `e55d02d`. Đếm CHO_DUYET/`XAC_NHAN`/`LOAI_TRU`/`soft-delete` đã khớp aggregate + dashboard (lát sâu trước).

| | Việc |
|---|------|
| P0 nhãn | `24b4705` — thẻ KPI + topic + bản in: khối lượng `da_xac_nhan/(PA−loại trừ)`; hết gắn «N phiếu» cạnh % khi N gồm loại trừ. |
| P0 trạng thái | Gửi lại form lâm sàng (`submitClinicalVerification`) luôn patch `CHO_DUYET` → ca `XAC_NHAN` tụt KPI/dịch tễ. PA1 (chọn): chặn server + UI khi terminal `XAC_NHAN`/`LOAI_TRU`/`DA_DONG`. PA2 giữ verification và không đổi status — vẫn cho sửa ca đã duyệt im. |
| Nhãn in | `lockStatus` hết `includes("XAC_NHAN")` (khóa nhầm `CHO_XAC_NHAN`). |
| Không vá | Cửa list `updateGiamSatNkbvCa` vẫn đổi `trang_thai_id` tự do (transition matrix — Domain). `DA_DONG` không có cửa ghi. NKBV 1500 — Domain. |

## S-V — Sự cố y khoa / an toàn (ngoài CSSD)

Không có module SCYK/ATBV (route/fact/action). `BAO_SU_CO` = CSSD `/cssd-su-co` (đã audit CSSD). PA1 (chọn): nhãn RBAC hết «an toàn / tiệt khuẩn» mơ hồ → «Sự cố CSSD… không phải sự cố y khoa toàn viện». PA2 không đụng nhãn — chờ Domain mở SCYK.

| | Việc |
|---|------|
| P0 nhãn | `displayName` + mô tả ma trận quyền `BAO_SU_CO`. |
| Park | Module sự cố y khoa toàn viện (luồng báo–xử lý–đóng) — Domain. |

## S-W — GSC + VST leftover

Neo: lát GSC/VST/BCTH sâu + S-M Excel. PA1 quét đếm/toggle NB/BM.02–03. PA2 offline idempotency — hiếm.

| | Việc |
|---|------|
| Không vá | `is_bo_sung_nguoi_benh` chỉ metadata — không vào KPI/scoring. BM.02/03 = GSC `saveGiamSatChung` (tách WHO). Sửa/xóa → view live. |
| Park | Excel GSC không lọc `loai_giam_sat` (GSC-L05). Offline timeout tạo phiên trùng. |

## S-X — QLCV % việc con khớp rollup; BCTH liên module

| | Việc |
|---|------|
| P0 đếm | `listCongViecByNhiemVu` dùng cùng luật checklist→% với `attachTaskRollup` (trước đó chỉ cột `phan_tram_hoan_thanh`). |
| Không vá | Chip gate RPC toàn viện vs MVP theo lọc — dual SSOT đã ghi chú. BCTH không gộp QLCV (metric-dict). |
| Park | Q-14/AB-2 báo cáo kỳ truncated. |

## S-X2 — TU_CHOI quá hạn ra khỏi cổng nghiệm thu

| | Việc |
|---|------|
| P0 trạng thái | `isEligibleForNghiemThu` loại `TU_CHOI` — từ chối NT + còn 100%/quá hạn không kẹt «Chờ nghiệm thu»; Kanban → đang làm (làm lại). |
| Migrate file | `20261003170000_qlcv_board_counts_exclude_tu_choi.sql` — RPC `cho_toi`/cột CHO_DUYET hết đếm TU_CHOI. **Chưa apply.** |
| Park | Import Nhân sự đổi vai trò không sync RBAC; Excel VST thiếu `co_deo_gang` vs KPI lạm dụng găng. |

## S-Y — Admin Soft: bỏ vai trò hồ sơ ↔ gỡ RBAC

Neo: Admin Soft sâu (pending/chưa TK). Auth-ban / dual-admin vẫn park.

| | Việc |
|---|------|
| P0 cửa | `afterSaveNhanSuLogin`: có Auth thì luôn `setStaffKsnkRbacRole` — `roleName` rỗng = gỡ. Trước đó bỏ trống FK thì `sys_user_roles` giữ. |
| Migrate file | `20261003160000_rpc_clear_staff_ksnk_role.sql` — RPC nhận rỗng → DELETE vai trò KSNK. **Chưa apply.** |
| Park | Auth-ban khi khóa hồ sơ; dual-admin duyệt tự đặt lại MK. |

## DA — Deep audit 5-10 (nhánh `cursor/deep-audit-5-10` @ main `6a0f9d1`)

Rà 6 lớp theo module trên tip production đã merge #74/#75. Vá mỏng chắc chắn; không push / migrate apply / xóa file.

| Commit | Module | Việc (PA chọn) |
|--------|--------|----------------|
| `6f1bdfb` | VST | Excel thêm `co_deo_gang` (PA1 cột thô khớp KPI; PA2 cột suy diễn `lam_dung_gang` — loại). |
| `14246c4` | MDM | Gateway nhân sự `fetchAllRangeRows` (PA1 hết cắt 1000; PA2 nâng trần — loại). |
| `d56c4ce` | QLCV | Kanban toast khi lỗi; đề xuất chờ duyệt đọc hết trang (PA1 không nuốt `[]`; PA2 toast trong `.catch` giữ `[]` — loại). |
| `7c355d8` | CSSD | Báo cáo tên NV chunk `.in` (PA1 hết cắt 500; PA2 nâng slice — loại). |
| `8488031` | CSSD | Máy + khoa báo cáo đọc hết trang (PA1; PA2 nâng 500/2000 — loại). |
| `f40de46` | QLCV | Dropdown NV khoa / tổ công tác đọc hết trang (PA1; PA2 nâng 500 — loại). |

| Module | P0/P1 tìm | Đã vá | Còn / Domain |
|--------|-----------|-------|--------------|
| NKBV | 1 P1 list `updateGiamSatNkbvCa` đổi TT tự do; 1 P2 trọng điểm `.limit(1500)` | 0 | Domain transition + 1500 |
| Giám sát VST | 1 P1 Excel thiếu găng | `6f1bdfb` | Offline trùng phiên (park) |
| Giám sát GSC | 0 mới chắc | 0 | GSC-L05 Excel/`loai_giam_sat` Domain |
| CSSD | 2 P1 cắt tên NV / máy+khoa | `7c355d8` `8488031` | RP2 tỷ lệ; void crash; migrate đỏ/claim; orphan modal |
| QLCV | 2 P1 nuốt lỗi + cắt đề xuất/dropdown | `d56c4ce` `f40de46` | Q-14 báo cáo kỳ cap 2000 Domain |
| BCTH | 0 mới chắc | 0 | `fetchMucTieuKpiVien` orphan — Nghĩa xóa |
| Quản trị | 0 mới chắc (S-Y đã) | 0 | Auth-ban; dual-admin; import NS≠RBAC; migrate clear |
| MDM/shell | 1 P1 gateway 1000 | `14246c4` | Sidebar OK; orphan `TaiKhoanNhanSuPage` — Nghĩa xóa |

Migrate file sẵn (chưa apply): `20260928150000_…claim_status`, `20260930140000_…reject_station_clear`, `20261001120000_…red_alert`, `20261001160000_…bo_summary`, `20261003160000_…clear_staff`, `20261003170000_…exclude_tu_choi`. DA không thêm migration mới.

### DA follow-up (agent explore → vá mỏng)

| Commit | Việc |
|--------|------|
| `debc3fb` | NKBV: dashboard `fetchAllRangeRows`; nháp BA hoàn `is_active` khi insert lỗi; guard DM LOAI_TRU/CHO_DUYET; RIT/VAE siblings hết `.limit(100)`. |
| `21adff2` | VST: `pendingObservationRestore` chỉ tắt sau update header. |
| `e4cd119` | CSSD: void `undoKho` sau lỗi quy_trinh/su_co; tồn HC + list ton + import QT + BOM chờ/lịch sử + list mẻ hết cắt; scan ném lỗi cycle QR / khoa_nhan. |
| `a1ebe41` | QLCV: skip `fn_qlcv_transition` khi RPC checklist đã để `HOAN_THANH` (DINH_KY@100%). |

Park còn: editor NKBV dual-door TT (Domain); GSC cửa sổ 30 phút; BOM apply atomic RPC; Q-14 báo cáo kỳ; Auth-ban; orphan xóa file.

## PERF-1 — tốc độ load (2026-10-05, nhánh `cursor/perf-1`)

Next 16.3 Turbopack không in bảng First Load JS cổ điển; đo approximate client chunk KB từ `.next` + vá wall-clock query.

| Commit | Việc |
|--------|------|
| `4069fe5` | PERF-A: cookie guest 5′ ở proxy; BCTH shell 1× getUser+RBAC |
| `6bd04a3` | PERF-B: Promise.all VST; cắt cột MDM/CSSD report/mẻ/NKBV list; đề xuất SQL filter; ton HC `gt(0)` |
| `8058d73` | PERF-C: `20261005020000_perf_rls_initplan_hot_paths.sql` (chưa apply) |

Chưa vá (park): PermissionProvider/StaffSessionGate trùng `getSession`; NKBV dashboard vẫn `fetchAllRangeRows` theo kỳ; QLCV kanban dump toàn board; nhân sự form vẫn full active list (cần async search); BCTH `ssr:false`.

## PERF-2 — tốc độ app (2026-10-05, nhánh `cursor/perf-2`)

Không migration RLS/index. `tsc` + vitest analytics/QLCV + `npm run verify` OK.

| Commit | Việc |
|--------|------|
| `80d03d2` | PERF2-auth: hydrate RBAC server→client; proxy `getClaims`; React `cache` getUser |
| `2882cc0` | PERF2-nkbv-loop: debounce hub reload; prune/persist chỉ khi đổi; deep-link deps ổn định |
| `cca6d90` | PERF2-dash: cache 90s RPC VST/GSC strategic + TGS hits; bust tag khi ghi |
| `e87980d` | PERF2-payload/count: NKBV dash cache; QLCV board cắt cột+lọc SQL; NS limit 400; count `planned` UI |
| `9ff170c` | PERF2-chunks: dynamic CSSD report/history/BK; bỏ `ssr:false` BCTH/VST/GSC analytics |

Ước giảm request/trang: auth −1 `/auth/v1/user` (middleware) + −1 `v_sys_user_permissions` (client mount); dashboard VST/GSC −2 RPC khi cache hit (90s); NKBV hub tránh bão reload; VST list bỏ `count=exact` trên view nặng.

Chunk đo (prod `.next`, Turbopack không in First Load cổ điển): `cssd-erp/report` client-ref ~545KB; `cssd-dung-cu` ~499KB; `bao-cao-tong-hop` ~419KB. Shared exceljs vẫn ~0.9–1.3MB (lazy khi export).

Park còn: StaffSessionGate `getSession`; picker NS async search đầy đủ; exceljs shared chunk; RLS/index Lead.

## MOD-IA — cửa Module 1 (2026-10-05, nhánh `cursor/mod-ia`)

Trước IA: revert `8058d73` (migration PERF-1 sai bảng `dao_tao_lan_thi_cau`); PERF-2 không sinh migration RLS/index khác. Trả `count: 'exact'` (PERF2-fix). Prod không set `KSNK_PILOT_*` — default code = toàn module; IA-06 PA B (một nguồn phạm vi).

| Commit | Việc |
|--------|------|
| `2890faf` | Revert PERF-C migration RLS initplan hot paths |
| `4b6dc22` | PERF2-fix: count exact (GSC/VST/NKBV/QLCV) |
| `7ba3df7` | IA-01: `/giam-sat-chung` → tuan-thu; Nhập `?loai`; QR LOC → tuan-thu |
| `8d0c858` | IA-02: lối BM.02/03 tuan-thu + lịch sử/thống kê/BCTH; header `bk` |
| `de783eb` | IA-03 jargon + vitest; IA-04 bỏ Báo nhanh / «Nhật ký sự cố» |
| `ea083c6` | IA-06 pilot scope SSOT; IA-05 sáng Quy trình + redirect CSSD_REPORT |
| `1d44377` | IA-07 title theo header + layout segment client |
| `d63a6ab` | IA-08 nhãn đề nghị / Quản trị SSOT / BCTH WHO |

`tsc --noEmit` + vitest IA + `npm run verify` OK. Không push.

Park: N-3 nhãn Việc/Tra cứu TB·HC; N-5 lối Hồ sơ Header; GscHistoryView `?bk=` filter (drill lịch sử BM đã link); số liệu 3 chỉ số WHO vs BM trên `/thong-ke/vst` (rà VST/BCTH).

## MOD-NKBV — cửa Module 4 (2026-10-05, nhánh `cursor/mod-nkbv` từ tip `cursor/mod-ia`)

| Commit | Việc |
|--------|------|
| `13f8ed3` | NKBV-01 RIT prior chỉ sự kiện đủ tiêu chí (server tự nạp) |
| `71437c9` | NKBV-02 chặn XAC_NHAN khi không dương tính; KPI/by_loai |
| `c15f872` | NKBV-05 DOE SSI ∈ SP; thiếu mã PT → chặn |
| `4cb4e0c` | NKBV-04 ẩn SIR/SUR + NKBV-09 bỏ JCI/top khoa |
| `42a213f` | NKBV-07 thay «48 giờ» → day-3 NHSN |
| `56e4de2` | NKBV-06 POA gate server tự tính VV+DOE |
| `27487da` | NKBV-03 cột DOE/LOA/ngày mổ + RPC (file only) |
| `126df36` | NKBV-08 gỡ nhi; migration fn_major_type (file only) |
| `43d1338` | NKBV-10 CVC Day 1 = access nội trú đầu |
| `d7602d6` | fixup tsc/vitest |

Migration **chưa apply**: `20261005033000_nkbv_fn_major_type_ped_out.sql`, `20261005034000_nkbv_doe_loa_report_cols.sql`. App fallback JSON khi cột chưa có.

`tsc --noEmit` + vitest `src/modules/giam-sat-nkbv` (549) + `npm run verify` OK. Không push.

Park: N-NKBV-3 VAE vs VAP thẻ chính; N-NKBV-4 SIR NHSN thật; N-NKBV-6 SSI rate theo nhóm PT; quyền `approve` gán RBAC prod; rà phiếu `XAC_NHAN ∧ is_positive=false` lịch sử (không sửa prod).

## MOD-CSSD — cửa Module 2 (2026-10-05, nhánh `cursor/mod-cssd` từ tip `cursor/mod-nkbv`)

| Commit | Việc |
|--------|------|
| `ce3c765` | CSSD-01 gate CAP_PHAT chỉ SC tiệt khuẩn (QC mẻ/BI+/thu hồi/mẻ/TIET_KHUAN) |
| `d6555cc` | CSSD-05 phiếu cấp phát khối SC + assertPackIssuable; «—» khi thiếu |
| `a68c81a` | CSSD-03 Đóng gói scan-only; plasma–cellulose → nạp mẻ |
| `e49b6dd` | CSSD-06 báo cáo «—»; tử=chu trình ≥1 SC PROCESS; gỡ ngưỡng 5% |
| `d27e303` | CSSD-02 Đã đóng (giải phóng) + quyền Hội đồng/Admin |
| `af28149` | CSSD-04 parent_bo_id + bỏ merge-gate; dual-path khi cột chưa có |
| `863f920` | CSSD-07/08/10 Trả QC + Spaulding QT.18 + PP chỉ định |
| `685e826` | fixup tsc |

Migration **chưa apply**: `20261005120000_cssd_incident_status_da_dong.sql`, `20261005121000_cssd_heat_split_parent_backfill.sql` (phụ thuộc `20260928065100` parent_bo_id). CSSD-02 chạy attributes-only không cần apply; CSSD-04 dual-path fallback MAIN/SUB nếu cột thiếu.

`tsc --noEmit` + vitest CSSD (125) + `npm run verify` OK. Không push.

Park: CSSD-09 jargon/URL (đã gộp IA-03 — còn sót message route nếu còn); N-CSSD-3 kiểm kê; N-CSSD-4 tái xử lý chưa cấp phát; N-CSSD-5 Plasma/EO bộ chịu nhiệt (handoff ME).

## MOD-SC — cửa Module 5 Sự cố/Thu hồi (2026-10-05, nhánh `cursor/mod-sc` từ tip `cursor/mod-cssd`)

| Commit | Việc |
|--------|------|
| `6fe2a18` | SC-01+06+07 thu hồi 2 pha (CHO_THU_VE) + JSON used + merge scope + QLCV follow-up |
| `707dd55` | SC-02 báo ≠ ra lệnh thu hồi; một gói lỗi; Bowie-Dick tách |
| `ca88a06` | SC-03 xác nhận/vô hiệu quyền + lý do; gỡ đóng băng gắn ĐÃ ĐÓNG |
| `7766271` | SC-04 cờ đỏ chỉ PROCESS; ngưỡng ≥3 (hằng số) |
| `48a169c` | SC-05+08+09 trách nhiệm / chặn offline thu hồi / BM.01–02 in |

Migration **chưa apply**: `20261005130000_cssd_sc_batch_recall_two_phase.sql` (RPC 2 pha + `cssd_su_co_counts_for_red_alert` PROCESS + backfill). App: JSON/legacy dual-read; nhận lại CHO_THU_VE ở `cssd-scan.actions` không phụ thuộc apply scan RPC.

`tsc --noEmit` + vitest `cssd-su-co` + `npm run verify` OK. Không push.

Park: N-SC-2 ngưỡng cuối; N-SC-3 map Tổ trưởng RBAC prod; N-SC-4 bỏ nhãn chủ quan; N-SC-8 hạn theo dõi NB; gỡ HOLD_QC jargon còn sót ngoài SC (ME); quyền `BAO_SU_CO.approve` nếu seed sau.

## MOD-ME — cửa Module 6 Mẻ tiệt khuẩn (2026-10-05, nhánh `cursor/mod-me` từ tip `cursor/mod-sc`)

| Commit | Việc |
|--------|------|
| `aabc0c8` | ME-01 P0 BI BM.02 đối chứng + BI tuần sau nhả |
| `dafcfa1` | ME-04 `nha_implant` + FE/RPC fallback `qc` |
| `2267f5c` | ME-02+03 BD events HOLD + merge specs + chờ thẩm định |
| `a922b342` / `b5b4b44` | ME-07 gate PP chỉ định (+ wire app) |
| `95db7a7` | ME-11 phiếu cấp phát QC + bỏ jargon QT21/HOLD_QC |
| `f3d4e794` | ME-05 HSD bao gói (msg nhãn ME-10 lịch sử race — nội dung HSD) |
| `f6007eb` | ME-08 chương trình máy so chuẩn |
| `a2dc044` | ME-09 Người nạp từ danh mục |
| `cc9a36d` | ME-06+10 SSI ↔ mẻ + thu hồi giữ QC / KPI BI·BD |

Migration **chưa apply**: `20261005140000`…`153000` (BI BM.02, nha_implant, BD events, CHO_THAM_DINH, ME-10 recall, HSD bao gói, PP gate, chuong_trinh_id, nguoi_nap_id). FE: `nha_implant` fallback `qc` khi permission chưa seed; BD insert bỏ qua nếu bảng chưa có.

`tsc --noEmit` + vitest ME (~97) + `npm run verify` OK. Không push.

Park: N-ME-1 ngoại lệ chịu nhiệt→Plasma/EO; N-ME-2/3 số ngày bao gói + thẩm định 3 BI đầy đủ; N-ME-6 grant tổ trưởng prod; N-ME-4 dung sai chuẩn CT; catalog CT apply prod.

## MOD-ADMIN — cửa Module 11 Quản trị hệ thống (2026-10-05, nhánh `cursor/mod-admin` từ tip `cursor/mod-me`)

### ADM-01 dựng lại lỗ đổi email

| Kết quả | Chi tiết |
|---------|----------|
| **Dựng lại được** | Có — cổng thật = `saveNhanSuAction` (`NHAN_SU.edit`) → `syncStaffAuthEmail` (service role, `email_confirm: true`). Không phải `PHAN_QUYEN.*`. |
| Test | Vitest mock: `nhan-su-login-email.guard.spec.ts` + `nhan-su-write-email.spec.ts` (đỏ→xanh trong lát). |
| Sửa | Chỉ ADMIN (+ break-glass env) đổi email; bắt `confirmActorPassword`; cấm đổi TK ADMIN khác; cấm đổi sang email khẩn cấp; chặn ngưng hồ sơ ADMIN; ghi `logAdminAction`. |

Số liệu prod (Lead, 05/10, chỉ đọc): 1 TK ADMIN = 1/3 email khẩn cấp; 2 email còn lại chưa có Auth → chuỗi B từng mở; PHAN_QUYEN/NHAN_SU edit/create/delete chỉ ADMIN.

| Commit | Việc |
|--------|------|
| `4d739dc5` | ADM-01 gate đổi email + test dựng lại + helper audit stub |
| `0900c4d7` | ADM-05 break-glass từ `KSNK_BREAK_GLASS_EMAILS` (trống = tắt) |
| `656d07fc` | ADM-02 `sys_admin_audit` insert-only + nối action |
| `2b0308ba` | ADM-03 chỉ ADMIN RBAC + RPC ma trận + policy |
| `89ca1d40` | ADM-04 seed quyền duyệt (ADMIN tạm) |
| `7adad540` | ADM-06 khóa NGHE_NGHIEP / mã đã dùng + `is_system` server |
| `2fab7c7b` | ADM-07 vai trò form chỉ xem + cổng yêu cầu TK |
| `d4df5d64` | ADM-08 Việt hóa nhãn RBAC/QC/LOCK |

Migration **chưa apply** (file only):
- `20261005154000_sys_admin_audit.sql`
- `20261005154100_adm03_rbac_admin_only.sql`
- `20261005154200_adm04_approve_permissions_seed.sql`

`tsc --noEmit` + `npx vitest run` (toàn bộ) OK. Không push. Không sửa `.env` / Vercel env.

### Park

| Mục | Lý do |
|-----|--------|
| Multi-role (nền + duyệt) / vai trò TO_TRUONG_CSSD · DUYET_KSNK | RPC `rpc_assign_staff_ksnk_role` vẫn 1 vai trò KSNK/TK — đổi lớn; chờ A1/N-ADM-1 tên |
| Grant quyền duyệt ngoài ADMIN | A1 chờ Nghĩa đưa tên; seed tạm chỉ ADMIN |
| Kiểm in BCTH thật (`DASHBOARD_CC_EXPORT`) | Thuộc BCTH-11 — chỉ neo nhãn registry |
| QLCV-06 / VST-05 gọi `logAdminAction` | Lát module sau; helper đã sẵn |
| Dọn hồ sơ lệch `vai_tro_he_thong_id` ≠ `sys_user_roles` | Script 1 lần ops (N-ADM-9 c); form đã chỉ đọc |
| Map 6 nghề ↔ WHO | N-ADM-4 / N-VST-4 — ngoài scope khóa mã |
| Bỏ break-glass sau go-live | N-ADM-3 phương án A |

## MOD-GIAM-SAT — cửa Module 3 Giám sát khung VST+GSC (2026-10-05, nhánh `cursor/mod-giam-sat` từ tip `cursor/mod-admin`)

| Commit | Việc |
|--------|------|
| `afee945e` | GS-02 lens → `p_hinh_thuc_ids`; refetch; gap 2 lens; bỏ «(gộp)»; cache key có lens |
| `9fac76df` | GS-01 validator 6 chiều server (create); grandfather sửa; khu vực allowed |
| `e6ff950f` | GS-03 gan_nb = đúng bool khi bật trống |
| `d21ab41e` | GS-06 hình thức RO + cách thức thu thập + replay `CT_CAMERA_LAI` |
| `f1d7dc31` | GS-04 nhãn chiều 2 = «Khu vực» |
| `968071f1` | GS-07 ngưỡng trung tính + min-N đối soát; GS-09 nhãn TGS − KSNK |
| `48db317a` | GS-05 migration analytics `hinh_thuc_id` (chưa apply) |
| `73025012` | Audit append + cast tsc GS-01 |

Migration **chưa apply**: `20261005160000_gs05_analytics_hinh_thuc_id_stype.sql`

`tsc --noEmit` + vitest (analytics/validations/GS) + `npm run verify` OK. Không push.

### Park

| Mục | Lý do |
|-----|--------|
| GS-08 Nhật ký vận hành khỏi `ty_le_gsc` / vị trí card hub | Handoff module GSC (N-GS-5); action /thong-ke đã lọc BK `TUAN_THU` mặc định |
| BCTH ComprehensiveCompare lens như GS-02 | Handoff BCTH |
| N-GS-2/3/4/7 | Chờ Nghĩa chốt; làm tròn % giữ nguyên |

## MOD-GSC — cửa Module 7 GSC + VST-04/06 (2026-10-05, nhánh `cursor/mod-gsc` từ tip `cursor/mod-giam-sat`)

Neo Lead SELECT prod 05/10: 89 BK active (65 KSNK.* + 24 short); orphan TC ~5384 KQ; MEC nhật ký đã mất (SCR alias BM.19.02).

| ID | Việc (file chính) |
|----|-------------------|
| DoD orphan | `20261005175000_gsc_mod_orphan_tc_and_bk_map.sql` (+ rename FIX-MIG-ORDER từ `080000`) + `gsc-orphan-criterion-resolve.ts` + vitest |
| GSC-01 | `20261005175100_…loai_filter…sql` (cột phiên + view/RPC patch) · W ghi `loai_giam_sat` (fallback nếu chưa apply) · `gsc-loai-compliance-filter` |
| GSC-08 | `gsc-lop-giam-sat-filter.ts` — NHAT_KY không vào `/tuan-thu` |
| GSC-04 | SCR bỏ alias BM.19.02 + bỏ rename short · `doi_tuong` theo chủ đề · pham_vi ids rỗng · `bang-kiem-ap-dung` · gap 25/41 · MEC `NK.QT.19.MEC` trong `20261005175200_…` |
| GSC-03 | soft-delete 3 TC rác BM.19.01 (cùng 80200); tiêu chí 10 TC QT.07.BM.03 đã trên prod |
| GSC-05/10 | `GscChecklistNavigator` min-N + mẫu mỏng + bỏ «Khoa yếu nhất» · jargon |
| GSC-09 | `?bk=` lịch sử server + alias group |
| GSC-02 | map short↔dài + inactive short (80200); SCR upsert idempotent (không nhúng 65 JSON — tránh orphan UUID) |
| GSC-06/07 | RPC patch min-N 5 + ELSE NULL · `scoreTyLe` null · `formatPercent*` «—» |
| VST-04/06 | hub gộp alias · normalize mẫu 0 → «—» · map TC dùng chung |

Migration **chưa apply** (sau FIX-MIG-ORDER): `20261005175000_*`, `20261005175100_*`, `20261005175200_*` (+ GS-05 `20261005160000` từ lát trước; chạy trước GSC).

`tsc --noEmit` + vitest (GSC/VST domain/analytics) + `npm run verify` OK. Không push. Không SCR APPLY.

### Park / Domain duyệt

| Mục | Ghi chú |
|-----|---------|
| Cặp map TC `uncertain`/`none` | ~118 cặp (nhiều ở BM.12/11/31…) — liệt kê trong migration `match_confidence`; Domain tick |
| Khối UI «Đánh giá hệ thống» riêng | RPC chưa trả payload riêng (N-GSC-7) — đã lọc khỏi % |
| Nạp 65 BK vào DB mới | SCR DRY_RUN OK; APPLY chỉ local sau khi Nghĩa chốt |
| N-GSC-6 map nhóm→khoa MDM | Tạm CA_VIEN + nhãn khuyến nghị |

## MOD-QLCV — cửa Module 8 QLCV (2026-10-05, nhánh `cursor/mod-qlcv` từ tip `cursor/mod-gsc`)

Neo Lead SELECT: DB UTC; cron overdue `5 17 * * *`; spawn `0 1 * * *`; `qlcv_fact_cong_viec` 0 dòng; chưa có `fn_qlcv_today_vn`. N-QLCV tạm: TU_CHOI mở; cấm tự NT; hạn nguồn do người tạo nhập.

| ID | Việc (file chính) |
|----|-------------------|
| QLCV-02/01 | `20261005170000_qlcv_mod_today_vn_overdue.sql` · `qlcv-today-vn.ts` · cron chỉ MOI/DANG_LAM |
| QLCV-04 | `qlcv-active-invariant` + phê đề xuất / vô hạn / chỉ gán tổ |
| QLCV-06 | `20261005171000_qlcv_mod_transition_gate.sql` · quyền NT riêng · cấm tự NT · admin nhật ký |
| QLCV-07 | `qlcv-hard-delete.ts` — đề xuất/phiếu trống; còn lại Hủy |
| QLCV-05 | `20261005172000_qlcv_mod_loai_dinh_ky_check.sql` · khóa loại / import |
| QLCV-03 | `qlcv-mvp-stats.ts` — mở / % QH / mẫu 0 → — |
| QLCV-08 | `20261005173000_qlcv_mod_dinh_ky_spawn.sql` · ngay_ket_thuc · phụ trách · EOM 29–31 |
| QLCV-12 | `20261005174000_qlcv_mod_nguon_lien_ket.sql` · deep-link SC/GSC (+ NKBV sẵn) |
| P2 09/10/11 | kết quả đóng · BCA lọc kỳ · bỏ jargon / CHO_DUYET «Chờ nghiệm thu» / Người phụ trách |

Migration **chưa apply**: `…170000` … `…174000`. `tsc` + vitest QLCV + `npm run verify` OK. Không push.

### Park

| Mục | Ghi chú |
|-----|---------|
| UI «Tạo việc KSNK» trên NKBV (QT.24/33) | Deep-link helper sẵn; nút UI mỏng — chờ wiring form NKBV |
| N-QLCV (TU_CHOI / tự NT / hạn nguồn) | Chờ Nghĩa chốt chính thức |
| Apply 5 migration local | Chỉ khi PO lệnh `mdm:migrate` |

## FIX-MIG-ORDER — thứ tự migration chưa apply chuỗi 05/10 (2026-10-05, nhánh `cursor/mod-qlcv`)

**Vấn đề:** 3 file GSC mang timestamp `080000–080200` < ME/ADM/GS-05/QLCV → khi apply theo version, `20261005160000_gs05_*` CREATE OR REPLACE lại 4 view GSC **mất** `loai_giam_sat` + resolve orphan của GSC-01.

### Ma trận chồng lấn (CREATE OR REPLACE ≥2 file trong chuỗi chưa apply)

| Đối tượng | File định nghĩa (theo version cũ → sau rename) | Bản cuối phải giữ |
|-----------|-----------------------------------------------|-------------------|
| `gstt_fact_gsc_dashboard_summary` | GS-05 `160000` → GSC-01 `175100` (ex `080100`) | `fn_session_analytics_stype(hinh_thuc_id…)` + `loai_giam_sat` |
| `gstt_fact_gsc_violations_summary` | GS-05 `160000` → GSC-01 `175100` | stype/hinh_thuc + loai + `fn_gsc_resolve_criterion_*` + `is_orphan_criterion` |
| `fact_gsc_dashboard_summary` | GS-05 `160000` → GSC-01 `175100` | alias → `gstt_fact_gsc_dashboard_summary` |
| `fact_gsc_violations_summary` | GS-05 `160000` → GSC-01 `175100` | alias → `gstt_fact_gsc_violations_summary` |
| `cssd_su_co_counts_for_red_alert` / `rpc_cssd_me_thu_hoi` | SC `130000` → ME-10 `144000` | ME-10 (preserve QC + two-phase) |
| `rpc_cssd_me_nhap_bi_am` / `rpc_cssd_me_ket_luan_dat` | ME-01 `140000` → ME-04 `141000` | ME-04 (+ BM02 + nha_implant) |
| `v_qlcv_cong_viec_full` / `v_qlcv_cong_viec_qua_han` | QLCV-02 `170000` → QLCV-12 `174000` | `fn_qlcv_today_vn` + `nguon_lien_ket` |

### Đổi tên (git mv)

| Cũ | Mới |
|----|-----|
| `20261005080000_gsc_mod_orphan_tc_and_bk_map.sql` | `20261005175000_gsc_mod_orphan_tc_and_bk_map.sql` |
| `20261005080100_gsc_mod_loai_filter_orphan_views.sql` | `20261005175100_gsc_mod_loai_filter_orphan_views.sql` |
| `20261005080200_gsc_mod_seed_doi_tuong_mec_inactive.sql` | `20261005175200_gsc_mod_seed_doi_tuong_mec_inactive.sql` |

### Thứ tự apply cuối (mọi `20261005*` sau `20261005034000`)

`120000` SC incident → `121000` heat → `130000` SC batch recall → `140000` ME-01 → `141000` ME-04 → `142000` ME-02 → `143000` ME-03 → `144000` ME-10 → `145000` ME-05 → `150000` ME-07 → `152000` ME-08 → `153000` ME-09 → `154000` sys audit → `154100` ADM-03 → `154200` ADM-04 → **`160000` GS-05** → `170000`…`174000` QLCV → **`175000` orphan map → `175100` loai/orphan views (gộp) → `175200` seed MEC**.

Verify: `src/lib/domain/fix-mig-order-unapplied.spec.ts` (timestamp tăng dần; định nghĩa cuối 4 view GSC có `loai_giam_sat` + `hinh_thuc_id`). Không apply DB trong lát này.

## GSC-MAP-DUYET — Domain duyệt 165 map orphan TC (2026-10-05, nhánh `cursor/mod-qlcv`)

Nguồn Domain §5 CSV (file ngoài repo, chỉ đọc). Áp vào migration chưa apply; không sửa `results_jsonb`.

| Mục | Kết quả |
|-----|---------|
| Map | **56** (exact 34 + fuzzy 22); **legacy 109** (bỏ; gồm BM.11.01, BM.19.01, mặc định N-GHEP/N-TIEM/N-MDRO) |
| `match_confidence` | Chỉ còn `exact` \| `fuzzy` \| `legacy` (bỏ `uncertain`/`none`) |
| Resolve UPDATE | Chỉ `new_ma_tc` + confidence ∈ exact/fuzzy; **bỏ** nhánh `stt` và fallback `noi_dung` / none→fuzzy |
| `fn_gsc_resolve_criterion_id` + `resolveCriterionIdForAgg` | Lớp chặn exact/fuzzy — legacy không nhận id mới |
| UI/báo cáo TC | Nhóm «Tiêu chí cũ (không quy đổi)» cho legacy; tỷ lệ phiên không đổi |
| File | `20261005175000_gsc_mod_orphan_tc_and_bk_map.sql` · `20261005175100_…loai_filter…` · `gsc-orphan-criterion-resolve.ts` + vitest |

Không apply migration / không SCR APPLY / không push. Thứ tự FIX-MIG-ORDER giữ nguyên (`175000` → `175100` → `175200`).

## MOD-VST — Module 9 VST (2026-10-05, nhánh `cursor/mod-vst`)

Neo Domain 09-VST + xác nhận WHO W2 (≤3 NV nhập mới; 32 phiên cũ nạp đủ + cảnh báo). `/thong-ke/vst` không cộng WHO với BM.

| Mã | Kết quả |
|----|---------|
| VST-02 | **Sửa 2026-10-09:** khôi phục domain §2.1 — tuân thủ ≤2 chỉ định, bỏ sót ≤1 (UI/Zod/hydrate clamp). Soft «1–5 mọi hành động» **đã thu hồi** — không làm theo. |
| VST-05 | Xóa mềm + lý do + audit; `rpc_vst_save_session`; nạp đủ người cũ; chặn thêm vượt grandfather |
| VST-01 | `fn_vst_is_valid_opportunity` + `so_dong_khong_hop_le`; bỏ «Chưa ghi thời điểm» |
| VST-03 | Nhãn «(phiếu WHO)»; mẫu = ô đã đánh giá; trường phụ tùy chọn |
| VST-04/06 | Đã có từ GSC (`pickBkRow` alias + normalize null); RPC ELSE NULL trong mig VST |
| VST-07…11 | min-N 20; nhãn QT.07 (giữ chuỗi DB); jargon; Excel tên/hình thức/vị trí/giờ; ngày VN |

Migration (chưa apply): `20261005180000_vst_mod_soft_delete_save_rpc.sql`, `20261005181000_vst_mod_valid_opp_analytics.sql` (sau `175300` merge).

Test: `tsc --noEmit` OK; vitest hydrate/Zod/analytics/export/mig-order OK; `npm run verify` OK. Không push / không apply.

## GSC-MAP-2DONG — 3 chốt Nghĩa §7 (2026-10-05, nhánh `cursor/mod-vst`)

Áp vào migration map chưa apply; không sửa `results_jsonb`; không SCR APPLY / không apply DB / không push.

| Mục | Kết quả |
|-----|---------|
| N-TIEM | `1504` (BM.09.01) → **TC06** fuzzy — đích chưa bị chiếm |
| N-MDRO | `3601` (BM.31.03) → **TC01** fuzzy — đích chưa bị chiếm |
| Map 1-1 | **58** (exact **34** + fuzzy **24**); legacy **107** (trong đó **17** thuộc N-GHEP, vẫn legacy ở bảng 1-1) |
| Seed BM.31.03 | TC01 bỏ «đóng kín cửa» → «…phòng riêng hoặc ghép nhóm cùng chủng» (`KSNK.QT.36.BM.03.json`); TC02 giữ; rg câu cũ chỉ còn chỗ không liên quan MDRO |
| N-GHEP PA | **Migration riêng** `20261005175300_gsc_mod_orphan_merge_map.sql` (sau 175200) — bảng `gstt_map_tieu_chi_merge` + `fn_gsc_expand_session_results_for_tc` (mirror TS `expandSessionResultsForTcAgg`); **không** nhét vào 175000 để giữ map 1-1 mỏng; view violations dùng expand; dashboard_summary (tỷ lệ phiên) **không** đổi |
| 8 nhóm | BM.07.02 TC09←1102+1112; TC11←1109+1110+1111; BM.09.01 TC08←1506+1507; TC11←1509+1511; TC12←1510+1513; BM.16.01 TC11←1807+1811; BM.17.01 TC06←1906+1907; BM.18.02 TC08←2006+2007. **Không** gộp BM.07.03 TC04 (1204+1205). 8 đích không trùng map 1-1 |
| Quy tắc ghép | Đạt+Đạt→Đạt; ≥1 Không đạt→Không đạt; thiếu/N/A→legacy; ≤1 kết quả TC đích / phiên |
| File | `175000` (2 dòng fuzzy) · `175300` merge · `gsc-orphan-criterion-merge.ts` + vitest · seed JSON |

Thứ tự: `175000` → `175100` → `175200` → **`175300` merge** → `180000` VST…

## MOD-BCTH — Module 10 Báo cáo tổng hợp (2026-10-05, nhánh `cursor/mod-bcth`)

Neo Domain `10-BCTH.md`. Không migration mới. Không push / không apply.

| Mã | Kết quả |
|----|---------|
| BCTH-01 | Helper `selectGscGenericBangKiemMas` + `exclude_vst_hub`; GSC mặc định trừ BM.02/03; payload `gsc_ve_sinh_tay`; in bảng 3 KPI Vệ sinh tay; list/top lỗi lọc hub |
| BCTH-03 | Lens VST/GSC riêng (mặc định KSNK); ẩn hình thức chung; bìa in ghi lens/BK |
| BCTH-02 | Bỏ `ty_le_avg`/`worstCompliance`/`topBottomKhoa`; 2 bảng khoa; min-N 20/30; Δ đủ mẫu; narrative comparable + dấu |
| BCTH-04 | NKBV mẫu = XAC_NHAN+LOAI_TRU; làm tròn 1 số; KPI neutral; bỏ «outcome»/PA−LT |
| BCTH-05/06 | Mẫu 0 → «—»; tone VST 90/85 · GSC 80/70 thống nhất BCTH↔`/thong-ke` |
| BCTH-07 | Phụ lục CSSD link «toàn viện»; in không URL; sự cố `cssdVnDay` cùng cửa sổ mẫu |
| BCTH-08 | Park Action board / DimensionCompare; DeepLink tách file; `ACTION_BOARD_MIN_SAMPLE` = `DOI_SOAT_MIN_SAMPLE` |
| BCTH-09/10/11 | Bìa VST/GSC khoa riêng; gap «30/N»; jargon; gate `DASHBOARD_CC_EXPORT` (client+server) |

Test: `tsc --noEmit` OK; vitest BCTH/NKBV/GSC filter OK; `npm run verify` OK.

## CHAIN-VERIFY — chuỗi lát 05/10 trước push/apply (2026-10-05, nhánh `cursor/mod-bcth` tip)

Mốc prod (chỉ đọc file / tip `cursor/perf-db-20261005`): schema_migrations đến **`20261004194907`**. Không gọi Supabase / không apply / không push trong lát này.

### 1) Lệnh verify (tip `mod-bcth`)

| Lệnh | Kết quả |
|------|---------|
| `npx tsc --noEmit` | OK (exit 0) |
| `npx vitest run` (toàn bộ) | OK — 287 files / 1682 tests |
| `npm run verify` | OK (exit 0; eslint 0 errors / 76 warnings sẵn có; layout/engineering/cssd/build OK) |
| `npm run build` | OK — Next.js 16.3.5 Turbopack |

`fix-mig-order-unapplied.spec.ts`: 3/3 xanh (sau soft-fix mốc prod → `20261004194907`).

### 2) Nhánh theo tầng (ancestry ⊆ tip)

| Tầng | Nhánh | Tip (short) |
|------|-------|-------------|
| 0 (base chain) | `cursor/mod-nkbv` | `893c035b` |
| 1 | `cursor/mod-cssd` | `71165c70` |
| 2 | `cursor/mod-sc` | `b81e00c8` |
| 3 | `cursor/mod-me` | `a0c5b32c` |
| 4 | `cursor/mod-admin` | `4f68444a` |
| 5 | `cursor/mod-giam-sat` | `e065ec83` |
| 6 | `cursor/mod-gsc` | `7d3df6c6` |
| 7 | `cursor/mod-qlcv` | `c82804c3` |
| 8 | `cursor/mod-vst` | `cb2c4a58` |
| 9 (tip verify) | `cursor/mod-bcth` | `4e7a26a7` |
| **Riêng** (đã apply prod; **không** ⊆ `mod-bcth`) | `cursor/perf-db-20261005` | `6bc94f80` |

Ancestry: `mod-nkbv ⊆ … ⊆ mod-bcth` OK. `perf-db-20261005` tách — chỉ neo mốc prod `20261004194907`.

### 3) Thứ tự apply cuối (`20261005*` sau `20261004194907`)

`010000` security P0 RLS *(ngoài bảng rủi ro CHAIN-VERIFY theo intake từ 033000; vẫn nằm trong hàng đợi migrate)* → **`033000` NKBV major type** → **`034000` NKBV DOE/LOA** → `120000` SC incident → `121000` heat parent → `130000` SC batch recall → `140000` ME-01 → `141000` ME-04 → `142000` ME-02 → `143000` ME-03 → `144000` ME-10 → `145000` ME-05 → `150000` ME-07 → `152000` ME-08 → `153000` ME-09 → `154000` sys audit → `154100` ADM-03 → `154200` ADM-04 → **`160000` GS-05** → `170000`…`174000` QLCV → **`175000` orphan map → `175100` loai/orphan views → `175200` seed MEC → `175300` merge N-GHEP** → **`180000` VST soft-delete → `181000` VST valid-opp**.

### 4) Object chồng lấn (≥2 định nghĩa) — bản cuối đủ logic

| Đối tượng | Bản cuối | Giữ |
|-----------|----------|-----|
| `gstt_fact_gsc_dashboard_summary` (+ alias `fact_*`) | `175100` | `fn_session_analytics_stype` + `loai_giam_sat` |
| `gstt_fact_gsc_violations_summary` (+ alias) | `175300` | stype + loai + resolve orphan + `fn_gsc_expand_session_results_for_tc` |
| `gstt_fact_vst_opportunities/moments_summary` (+ alias) + `rpc_dashboard_vst_strategic_analytics_impl` | `181000` | stype/`hinh_thuc_id` (GS-05) + `fn_vst_is_valid_opportunity` |
| `cssd_su_co_counts_for_red_alert` / `rpc_cssd_me_thu_hoi` | `144000` | PROCESS red-alert + two-phase + preserve QC |
| `rpc_cssd_me_nhap_bi_am` / `rpc_cssd_me_ket_luan_dat` | `141000` | BM.02 + `nha_implant` |
| `v_qlcv_cong_viec_full` / `qua_han` | `174000` | `fn_qlcv_today_vn` + `nguon_lien_ket` (qua_han = filter full) |

### 5) Bảng rủi ro migration (từ `033000`; file → mức → lý do)

| File | Mục đích | Idempotent | DROP/DELETE/TRUNCATE/UPDATE | CHECK/NOT NULL/UNIQUE FAIL? | RLS khóa nhầm? | Phụ thuộc | Rủi ro |
|------|----------|------------|----------------------------------|------------------------------|----------------|-----------|--------|
| `033000_nkbv_fn_major_type_ped_out` | OR REPLACE fn major type bỏ ped | OR REPLACE | không | không | không | — | **thấp** — chỉ fn |
| `034000_nkbv_doe_loa_report_cols` | Cột DOE/LOA/ngày mổ + backfill + RPC | IF NOT EXISTS + OR REPLACE | UPDATE backfill active | không CHECK mới; cast date/uuid đã bọc regex (CHAIN-VERIFY) | không | 033000 (cùng lát NKBV) | **vừa** — backfill + RPC lớn; FK loa → mdm |
| `120000_cssd_incident_status_da_dong` | COMMENT attributes ĐÃ ĐÓNG | n/a | không | không | không | — | **thấp** — comment only |
| `121000_cssd_heat_split_parent_backfill` | Backfill parent_bo_id *-SUB | n/a | UPDATE dm bộ | không | không | `20260928065100` parent_bo_id | **vừa** — sửa master bộ; scope *-SUB |
| `130000_cssd_sc_batch_recall_two_phase` | RPC thu hồi 2 pha + red-alert PROCESS | OR REPLACE | UPDATE trong RPC (runtime) | không | không | CSSD SC/ME base | **vừa** — RPC nghiệp vụ lớn |
| `140000_cssd_me01_bi_bm02` | CHECK trang_thai_bi +BM.02 RPC | DROP IF EXISTS + ADD CHECK; OR REPLACE; DROP FUNCTION cũ | DROP CONSTRAINT/FUNCTION | CHECK nới (thêm DANG_U) — không FAIL giá trị cũ hợp lệ | không | — | **thấp** — CHECK rộng hơn |
| `141000_cssd_me04_nha_implant_perm` | Seed perm + RPC nhả implant | ON CONFLICT; OR REPLACE | không data wipe | không | không (seed ADMIN) | 140000 (RPC chồng) | **thấp** — grant tạm ADMIN |
| `142000_cssd_me02_bowie_dick_events` | Bảng BD events | IF NOT EXISTS | không | CHECK trên bảng mới | không | cssd_dm_thiet_bi | **thấp** |
| `143000_cssd_me03_cho_tham_dinh` | DROP CHECK trang_thai máy + comment | DROP CONSTRAINT IF EXISTS | DROP CONSTRAINT | không ADD CHECK mới | không | — | **thấp** — nới ràng buộc |
| `144000_cssd_me10_recall_preserve_qc` | OR REPLACE thu hồi giữ QC | OR REPLACE | UPDATE runtime | không | không | 130000 | **vừa** — bản cuối thu hồi |
| `145000_cssd_me05_hsd_bao_goi` | DM loại bao gói + HSD fn | IF NOT EXISTS; DROP/CREATE POLICY | không fact wipe | CHECK trên bảng mới | write = CSSD.edit — đúng phạm vi | — | **thấp** |
| `150000_cssd_me07_pp_chi_dinh_gate` | DROP NOT NULL PP chỉ định + gate RPC | OR REPLACE | DROP NOT NULL (nới) | không siết | không | ME RPC | **thấp** — nới cột |
| `152000_cssd_me08_chuong_trinh_id` | ADD COLUMN + FK nullable | IF NOT EXISTS | không | FK cột mới NULL — không scan fail | không | cssd_dm_chuong_trinh_may | **thấp** |
| `153000_cssd_me09_nguoi_nap_id` | ADD COLUMN + FK nullable | IF NOT EXISTS | không | FK cột mới NULL | không | mdm_nhan_su | **thấp** |
| `154000_sys_admin_audit` | Bảng audit insert-only + RLS SELECT admin | IF NOT EXISTS; DROP/CREATE POLICY | trigger chặn UPDATE/DELETE | không trên data cũ | SELECT chỉ admin — đúng | fn_sys_is_admin | **thấp** |
| `154100_adm03_rbac_admin_only` | Policy RBAC chỉ ADMIN + RPC | DROP/CREATE POLICY; OR REPLACE | DELETE trong RPC runtime (gán vai trò) | không | **siết ghi** roles/perms → non-admin mất cửa PostgREST (đúng DoD) | 154000 (audit liền trước) | **vừa** — RLS siết; intentional |
| `154200_adm04_approve_permissions_seed` | Seed quyền duyệt → ADMIN | ON CONFLICT | không | không | không khóa user; chỉ seed | 154100 / sys_* | **thấp** |
| `160000_gs05_analytics_hinh_thuc_id_stype` | fn stype + OR REPLACE view GSC/VST + RPC | OR REPLACE | không | không | không | — (bản giữa; GSC/VST ghi đè sau) | **vừa** — view lớn; phải apply trước 175100/181000 |
| `170000_qlcv_mod_today_vn_overdue` | today VN + overdue + views | OR REPLACE | không wipe | không | không | qlcv base | **thấp** (prod 0 việc) |
| `171000_qlcv_mod_transition_gate` | Gate chuyển trạng thái / checklist | OR REPLACE | UPDATE runtime | không | không | 170000 | **thấp** |
| `172000_qlcv_mod_loai_dinh_ky_check` | CHECK loại⇔mẫu | DROP/ADD CONSTRAINT; backfill 2 chiều | UPDATE chuẩn hóa trước CHECK | CHECK sau backfill — an toàn (0 dòng / đã normalize) | không | 170000 | **thấp** |
| `173000_qlcv_mod_dinh_ky_spawn` | Spawn định kỳ | OR REPLACE; ON CONFLICT | INSERT spawn | không | không | 172000 | **thấp** |
| `174000_qlcv_mod_nguon_lien_ket` | Cột/view nguồn liên kết | IF NOT EXISTS; OR REPLACE | không | không | không | 170000 views | **thấp** |
| `175000_gsc_mod_orphan_tc_and_bk_map` | Bảng map orphan + short↔dài + seed | IF NOT EXISTS; ON CONFLICT | UPDATE resolve id map | không trên fact | không | sau QLCV (FIX-MIG-ORDER) | **vừa** — seed map lớn; không sửa results_jsonb |
| `175100_gsc_mod_loai_filter_orphan_views` | Cột loai + view gộp + resolve fn | IF NOT EXISTS; OR REPLACE | UPDATE backfill loai | không | không | 160000 + 175000 | **vừa** — bản cuối dashboard |
| `175200_gsc_mod_seed_doi_tuong_mec_inactive` | UPDATE doi_tuong / inactive short / MEC | n/a (UPDATE idempotent-ish) | UPDATE dm BK + soft-delete TC | không | không | 175000 (short map) | **vừa** — sửa master BK prod |
| `175300_gsc_mod_orphan_merge_map` | Merge N-GHEP + expand + violations | IF NOT EXISTS; ON CONFLICT; OR REPLACE | UPDATE resolve merge ids | không | không | 175000–175200 | **vừa** — bản cuối violations |
| `180000_vst_mod_soft_delete_save_rpc` | Cột xóa mềm + `rpc_vst_save_session` | IF NOT EXISTS; OR REPLACE | DELETE obs khi save (runtime, theo session) | không | không | VST fact | **vừa** — RPC thay obs nguyên tử |
| `181000_vst_mod_valid_opp_analytics` | valid-opp + OR REPLACE view/RPC VST | OR REPLACE | không | không | không | 160000 + 180000 | **vừa** — bản cuối analytics VST |

**Cao:** không có (không DROP TABLE/TRUNCATE; không CHECK siết dữ liệu cũ không backfill).

### 6) Soft-fix trong CHAIN-VERIFY

| Việc | File |
|------|------|
| Mốc prod test → `20261004194907` | `fix-mig-order-unapplied.spec.ts` |
| Backfill CHECK QLCV 2 chiều trước ADD CONSTRAINT | `20261005172000_qlcv_mod_loai_dinh_ky_check.sql` |
| Backfill NKBV DOE/LOA cast date/uuid an toàn | `20261005034000_nkbv_doe_loa_report_cols.sql` |

### 7) Kết luận

Chuỗi code tip `mod-bcth` xanh 4 lệnh. Thứ tự migrate tăng dần + gộp view/fn cuối OK. Rủi ro apply chủ yếu **vừa** (RPC/view lớn, UPDATE master GSC/CSSD heat, RLS ADM siết intentional). Sẵn sàng xin Nghĩa **push nhánh** rồi **apply local/prod** theo thứ tự mục 3 — không tự push/apply trong lát này.

---

## ROUND2 — Cross-audit toàn app (2026-10-05)

Nhánh: `cursor/round2-audit` ← tip `cursor/mod-bcth` (`ed0be31e`). Cursor tự rà-chéo sau chuỗi 11 module. **Không push / không apply / không Supabase.** Migration mới: **không**.

### Phương pháp

Rà 6 trục: (a) số liệu ≥2 nơi; (b) trạng thái vòng 1 bỏ sót reader; (c) cổng quyền FE≠server; (d) ngày UTC vs VN; (e) jargon; (f) park/dead — **không xóa file** (luật lát).

### Phát hiện → PA → chốt

| ID | Nơi | Lỗi | PA1 | PA2 | Phản biện ngắn | Chốt |
|----|-----|-----|-----|-----|----------------|------|
| R2-01 | `cssd-analytics-core` `isProcessCycleSafetyIncident` | `DA_DONG` vẫn vào tử KPI chu trình có SC | Loại `DA_DONG` (+`VO_HIEU`) | Giữ đếm «lịch sử SC» riêng bucket | PA2 cần UI mới | **Sửa PA1** |
| R2-02 | `cssd-report-read` máy ready/repairing | `HOLD_QC`/`CHO_THAM_DINH` không vào mẫu số | Gộp vào `may_repairing` | Bucket `may_hold` riêng | PA2 đổi contract BCTH | **Sửa PA1** |
| R2-03 | `useModulePermission` approve = edit | FE hiện duyệt khi chỉ edit; server `approve` | `approve` = `canApprove` only | Nới server cho edit | PA2 phá ADM-04 | **Sửa PA1** |
| R2-04 | QLCV `canShowQlcvApproveActions` + tự NT | edit mở NT; phụ trách tự thấy nút NT | Chỉ approve + ẩn self-NT | Cho self-NT nếu admin | Self-NT cấm server | **Sửa PA1** |
| R2-05 | NKBV `NkbvAdjudicationPanel` | Gate `edit` vs server `approve` | Hook `allowed.approve` trong panel | Thread prop `allowedApprove` | Prop cascade rộng | **Sửa PA1** (hook) |
| R2-06 | CSSD report Confirm/Close | Nút theo `create`; server role Trưởng/Hội đồng/Admin | Gate `canApprove`/`canClose` roles | Dùng perm ADM-04 `confirm`/`close` | Server vẫn role — khớp role trước | **Sửa PA1** |
| R2-07 | QLCV in kỳ / định kỳ / NKBV tạo stay / TB parseDate | `toISOString().slice(0,10)` UTC | `todayYmdInVn` / `qlcvDateVnFromInstant` | Giữ UTC | Lệch biên đêm VN | **Sửa PA1** |
| R2-08 | Print SC / sổ BOM / TB columns / Đối soát / Catalog queue | Mã BOM, soft BOM, min-N, SET_RECONCILE | Nhãn VN SSOT | Giữ mã + tooltip | Staff in phiếu | **Sửa PA1** |
| R2-09 | `getVSTSessionDetail` | Soft-delete vẫn mở deep-link | Chặn `is_active===false` | Admin xem thùng rác | Chưa có UI thùng rác | **Sửa PA1** |
| R2-D1 | BCTH print CSSD «máy» | Print `ready/repairing`; CSSD report `ready/(ready+repairing)` | Thống nhất mẫu số | Đổi nhãn print «sẵn / sửa» | Đổi công thức metric dictionary | **Chờ Domain** |
| R2-D2 | NKBV dashboard fetch | Prefilter `ngay_phat_hien`; KPI theo DOE/SSI | Fetch theo report-date | Giữ + ghi chú UI | Đổi cửa sổ tải | **Chờ Domain** |
| R2-D3 | QLCV gate `%` vs RPC quá hạn | % từ slice board; chip từ RPC global | Một nguồn RPC | Ghi chú «% trên bảng đang xem» | RPC chưa đủ field % | **Chờ Domain** |
| R2-D4 | ME `nha_implant` FE | QC/BI UI không ẩn khi thiếu `nha_implant` | Gate FE theo `hasPermission` | Chỉ toast server | Cần map outcome→nút | **Chờ Domain** |
| R2-D5 | Park Action board / DimensionCompare | `@park` không consumer | Giữ park | Archive folder | Cấm xóa file lát này | **Chờ Domain** (giữ park) |
| R2-D6 | ADM-04 `BAO_SU_CO.close` vs role close | Seed perm ≠ server role check | Thống nhất perm | Thống nhất role | Multi-role park | **Chờ Domain** |
| R2-D7 | BCTH CSSD appendix luôn toàn viện | Filter khoa không áp CSSD | Scope CSSD theo filter | Giữ + copy rõ | Scope CSSD ≠ khoa NB | **Chờ Domain** (copy đã có) |

### Commits Soft local

| Commit | Hash | Nội dung |
|--------|------|----------|
| R2-01 | `ab1591a2` | KPI `DA_DONG` + máy HOLD/CHO_THAM_DINH |
| R2-02 | `8b1cf142` | Cổng quyền FE=server (approve/NT/NKBV/SC) |
| R2-03 | `c8eddb08` | Ngày VN (QLCV/NKBV/TB) |
| R2-04 | `278e90bc` | Nhãn jargon VN |
| R2-05 | `839ace1d` | VST soft-delete detail |
| R2-06 | `92c5d8d4` | Append mục ROUND2 (bảng hash cập nhật working tree nếu lệch tip) |

### Verify

`tsc --noEmit` (src) · `vitest run` 287 files / 1685 tests · `npm run verify` · build trong verify — **xanh**. Migration mới: không.

---

## GO-LIVE-PILOT — UAT 1–2 khoa (nhân viên thật)

Nhánh: `cursor/r3-debate`. **Không push / không apply prod.** Mục tiêu: một vòng tay đủ cửa ghi→đếm→báo cáo trước mở viện.

### Khoa gợi ý (từ seed/tài liệu repo — không đoán ngoài)

| # | Khoa | Căn cứ trong repo |
|---|------|-------------------|
| 1 | **Nội A** | UAT seed GSC L03 (`25d-GSC-L03-SEED-AB` / `_audit-soft-25d`): picker khoa Nội A; file 16: NV KSNK quan sát VST tại Nội A = phiên `thuc_hanh_don_vi`. |
| 2 | **Khoa Hồi sức nội** | Seed BK `KSNK.QĐ.12.BM.01` + catalog `00-catalog.json` / `02-chuyen-de-map`; phủ CVC/VAP/CAUTI (`QT.30`/`QT.31`/`QT.32`) — đủ GSC + NKBV + VST bedside. |

*(Nếu chỉ 1 khoa: ưu tiên Hồi sức nội; Nội A dùng để đối chiếu picker/tuân thủ.)*

### 10 bước UAT

| # | Bước | Cửa UI | Kết quả đúng |
|---|------|--------|--------------|
| 1 | Đăng nhập | `/login` → shell | Vào đúng tài khoản NV pilot; không kẹt redirect vòng. |
| 2 | Quyền | Sidebar + `/quan-tri` (hoặc thẻ NV) | Menu khớp role (CSSD / GSC / VST / NKBV / QLCV / BCTH); không thấy nút vượt quyền; thao tác cấm → toast/403, không ghi. |
| 3 | CSSD 1 chu trình | `/cssd-quy-trinh` (quét → trạm → mẻ nếu cần) | Trạng thái chu trình đổi đúng trạm; tồn kho / đếm trạm (`rpc_cssd_kho_station_counts` trên UI) khớp sau mỗi bước; không cờ đỏ oan. |
| 4 | SC 1 phiếu | `/cssd-su-co` (chip quy trình hoặc form) | Phiếu `OPEN`/`DA_XAC_NHAN` đúng nhóm; chu trình gắn đúng; tỷ lệ «không sự cố» / list SC + tồn (Hỏng/Mất) khớp — không đếm phiếu luân chuyển. |
| 5 | NKBV 1 ca | `/giam-sat-nkbv` tab cases / tạo ca | Ca lưu đủ loại; DOE/LOA/khoa (nếu có cột) hiện đúng; đếm «chưa phân tích» / tab Thống kê khớp ±0 với vừa ghi. |
| 6 | QLCV 1 việc | `/quan-ly-cong-viec` Kanban | Tạo việc → cột đúng trạng thái; đếm board (MOI/DANG_LAM/…) khớp; không self-NT nếu là phụ trách. |
| 7 | GSC 1 phiên | Hub → `/giam-sat-chung/tuan-thu` (BK khoa pilot) | Lưu phiên gắn đúng khoa; lịch sử + `/thong-ke/gsc` đếm +1; tiêu chí orphan không làm mất tên/tỷ lệ. |
| 8 | VST 1 phiên | `/giam-sat-vst` (WHO, khoa pilot) | Lưu ≥1 cơ hội hợp lệ; lịch sử + `/thong-ke/vst` mẫu số/tử số khớp phiên vừa tạo. |
| 9 | BCTH in 1 báo cáo | `/bao-cao-tong-hop` → chọn kỳ + khoa pilot → In | Bản in mở; KPI VST/GSC/NKBV khớp thống kê khoa cùng kỳ; phụ lục CSSD (nếu xem) cùng bundle report — không lệch UTC biên đêm. |
| 10 | Đối soát đóng vòng | Cùng kỳ: thống kê khoa ↔ BCTH ↔ (CSSD report nếu có quyền) | Số đếm phiên/ca/việc/SC không lệch giữa cửa ghi và cửa in; trạng thái phiếu sau bước 3–8 vẫn đúng khi reload. |

