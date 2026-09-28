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
| P0 | Hết cắt 120/500 (chờ mẻ) và 5000 (bản đồ trạm) và trang 1000 mặc định của hàng chờ. `is_active=false` / thu hồi không vào các query này. |
| Park | Đổi QT/QĐ/CDC hoặc nới scan-only. Ghi sự cố / tách nhiệt trên trạm Đóng gói. `InventoryIssueModal`. Auth-ban. GSC-L05. RPC kho chip không trả từng trạm — đếm trạm vẫn trên view active, không thêm migration. |
