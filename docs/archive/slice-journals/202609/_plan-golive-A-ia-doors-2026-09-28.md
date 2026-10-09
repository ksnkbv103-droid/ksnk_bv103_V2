# Kế hoạch A — GO-LIVE bản đồ cửa và chồng chéo (2026-09-28)

| Trường | Giá trị |
|--------|---------|
| Máy | Nghĩa Mac · `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| HEAD | `1507db7a0f9d6ee13d431b1ffcbef0e2f72baa82` (`1507db7`) |
| So với origin | ahead 59 — **không** fetch / reset |
| Việc lát này | Chỉ rà + kế hoạch. **Không** sửa code. **Không** commit / push / PR / Vercel / migrate. |
| WIP giữ nguyên | Picker chương trình máy M-04 (unstaged). Không revert. |

Nguồn cửa: `src/lib/nav/sidebar-nav-groups.ts`, `sidebar-admin-nav-groups.ts`, route `src/app/**/page.tsx`, tab trong page. Không lấy bảng URL trong `docs/modules/cssd/README.md` — bảng đó còn `?tab=kho`, «3 cửa biến động», dụng cụ read-only; code tip không còn như vậy.

`KSNK_PILOT_CORE_MODULES=1` ẩn CSSD, NKBV và Báo cáo chính thức. Mặc định không set biến thì menu đầy đủ. Bản đồ dưới đây là menu đầy đủ.

Nhãn «Soft Soft Soft-safe» chỉ nằm trong comment code, không phải chữ trên UI. Không sửa.

## 1. Bản đồ cửa

Sidebar là cổng module. Tab bên trong là cửa thao tác. Redirect không tính là cửa thứ hai.

### 1.1 Sidebar

| Nhóm | Mục | Href | Quyền xem (OR) |
|------|-----|------|----------------|
| Điều hành KSNK | Báo cáo chính thức | `/bao-cao-tong-hop` | Dashboard **và** một module giám sát |
| Giám sát | Giám sát | `/giam-sat` (một quyền ghi thì deep-link form) | VST hoặc GSC hoặc NKBV |
| Vận hành nội bộ | Công việc | `/quan-ly-cong-viec` | `CONG_VIEC` |
| | Thi KSNK | `/dao-tao` | `DAO_TAO` |
| CSSD · Vận hành | Quy trình | `/cssd-quy-trinh` | `CSSD_WORKFLOW` hoặc `CSSD_ME_TIET_KHUAN` hoặc `CSSD_REPORT` |
| | Sự cố | `/cssd-su-co` | `BAO_SU_CO` |
| CSSD · Tra cứu | Dụng cụ | `/cssd-dung-cu` | `CSSD_KHO_DUNGCU` |
| | Thiết bị | `/cssd-thiet-bi` | `THIET_BI` |
| | Hóa chất | `/cssd-hoa-chat` | `KSNK_KHO_HOACHAT` |
| Sửa danh mục | Quản trị hệ thống | `/quan-tri-he-thong` | `DANH_MUC` hoặc `PHAN_QUYEN` hoặc `NHAN_SU` |

**Không có mục sidebar cho Báo cáo CSSD** (`/cssd-erp/report`), dù module `CSSD_REPORT` nằm trong cổng Quy trình.

### 1.2 CSSD

| Cửa | Việc | Ai (quyền) | Thao tác lý tưởng (≤5) |
|-----|------|------------|------------------------|
| `/cssd-quy-trinh` tab Chu trình | Đẩy bộ qua 6 trạm: tiếp nhận → làm sạch → Kiểm bộ → đóng gói → (giao mẻ) → cấp phát | Workflow | 1. Mở Quy trình. 2. Quét QR bộ. 3. Xác nhận trạm. 4. Tới đóng gói thì chỉ quét. 5. Tiệt khuẩn chuyển sang tab Mẻ. |
| `/cssd-quy-trinh?tab=batch` | Phiếu mẻ: tạo, nạp, chạy, QC, in | Mẻ | 1. Tab Mẻ. 2. Mở mẻ mới, chọn máy và chương trình. 3. Quét bộ vào mẻ. 4. Bắt đầu / kết thúc / QC. 5. In phiếu. |
| `/cssd-quy-trinh?tab=trace` | Truy vết một QR | Workflow / báo cáo | 1. Bấm kính Truy vết. 2. Quét hoặc dán QR. 3. Đọc chuỗi trạm. |
| `/cssd-su-co` 5 chip | Ghi sự cố: Hỏng/Mất · Quy trình · Hóa chất · Máy · Khác | `BAO_SU_CO` | 1. Mở Sự cố. 2. Chọn một chip. 3. Điền phiếu. 4. Gửi. 5. Xem trạng thái ở nhật ký (một cửa đọc). |
| `/cssd-dung-cu` | Tra cứu Bộ / Loại / Lịch sử kho; ghi Đề nghị danh mục và Luân chuyển | Kho dụng cụ | 1. Mở Dụng cụ. 2. Tra Bộ hoặc Loại. 3. Việc ghi: Đề nghị hoặc Luân chuyển. 4. Gửi. 5. Admin duyệt đề nghị ở Quản trị. |
| `/cssd-thiet-bi` | Danh sách máy · Bảo dưỡng và sửa chữa · (phụ) lịch sử mẻ theo máy | Thiết bị | 1. Mở Thiết bị. 2. Chọn máy. 3. Bảo dưỡng: mở phiếu. 4. Sự cố máy: sang Sự cố (một cửa). 5. Sửa master: «Sửa tại Quản trị». |
| `/cssd-hoa-chat` | Tồn kho hóa chất; nút sang sự cố hóa chất | Kho hóa chất | 1. Mở Hóa chất. 2. Xem tồn. 3. Nhập/xuất theo phiếu kho. 4. Hỏng/lệch: «Báo sự cố HC». 5. Sửa danh mục ở Quản trị. |
| `/cssd-erp/report` | Đọc: Vận hành · Sự cố · Sản lượng · Bộ · Máy · NV · Trách nhiệm | `CSSD_REPORT` | 1. Vào đúng một cửa báo cáo. 2. Chọn kỳ. 3. Đọc tab cần. 4. Xác nhận/in phiếu ở tab Sự cố. 5. Không lập phiếu mới tại đây. |

Redirect, không phải cửa: `/cssd-erp/batch` → `?tab=batch`; `/cssd-quy-trinh?tab=kho` → `/cssd-dung-cu`; `/thong-ke/cssd` → report; bookmark luân chuyển trên sự cố → `/cssd-dung-cu?tab=LUAN_CHUYEN`.

### 1.3 Giám sát / NKBV / GSC / VST

IA đã khóa một chiều: ghi → lịch sử → thống kê khoa → báo cáo chính thức (in). ModeNav trong module là công tắc. Báo cáo chính thức không tạo việc.

| Cửa | Việc | Ai | Thao tác |
|-----|------|----|----------|
| `/giam-sat` | Hub. Một quyền ghi thì bỏ hub. | VST / GSC / NKBV | 1. Mở Giám sát. 2. Chọn đúng mẫu. 3. Nhập. 4. Lịch sử/thống kê ở link nhỏ. |
| `/giam-sat-vst` | WHO 5 thời điểm (BM.01) | `GIAM_SAT_VST` | 1. Chọn WHO. 2. Chọn khoa/đối tượng (tối đa 3). 3. Chấm thời điểm. 4. Lưu. 5. Tra ở Lịch sử VST. |
| `/giam-sat-chung/tuan-thu?bk=BM.07.02` và `BM.07.03` | Kỹ thuật VST thường quy / ngoại khoa — form GSC, không gộp % với WHO | `GIAM_SAT_CHUNG` | 1. Chọn đúng mẫu trên hub. 2. Điền bảng kiểm. 3. Lưu. |
| `/giam-sat-chung/tuan-thu` | Tuân thủ chuyên đề khác (không phải khối vệ sinh tay) | GSC | 1. «Giám sát tuân thủ». 2. Chọn bảng kiểm. 3. Chấm. 4. Lưu. |
| `/giam-sat-chung`, `/nhat-ky`, `/he-thong` | Form GSC theo loại (tuân thủ / nhật ký vận hành / đánh giá hệ thống) | GSC | Cùng 4 bước; `?tab=history\|analytics` đẩy sang lịch sử / thống kê. |
| `/lich-su/vst`, `/lich-su/gsc` | Sửa phiên đã ghi | Người đã có quyền form | 1. Lịch sử. 2. Lọc. 3. Mở phiên. 4. Đính chính. |
| `/thong-ke/vst`, `/thong-ke/gsc` | Thống kê khoa. `/thong-ke` → VST. GSC mặc định tuân thủ | Cùng quyền giám sát | 1. Thống kê. 2. Kỳ và khoa. 3. Đọc. Bản ký nằm ở Báo cáo chính thức. |
| `/giam-sat-nkbv` | 5 tab: Hàng đợi bệnh án · Danh sách phiếu · Cổng Vi sinh · Nộp Mẫu số · Thống kê | `GIAM_SAT_NKBV` | 1. Hàng đợi. 2. Mở bệnh án. 3. Ghi phiếu. 4. Vi sinh / mẫu số khi có. 5. Thống kê tab là tra cứu ca, không phải bản in Ban Giám đốc. |
| `/qr` | Quét QR giám sát | Có một quyền giám sát | 1. Quét. 2. Mở đúng form. |

### 1.4 QLCV

Một route `/quan-ly-cong-viec`. Tab Nhiệm vụ / Danh mục định kỳ / Báo cáo chỉ khi được quản mẫu định kỳ.

| Tab | Việc | Thao tác |
|-----|------|----------|
| Điều hành | Bảng việc: giao, tiến độ, hạn, mức ưu tiên | 1. Mở Công việc. 2. Lọc. 3. Mở phiếu hoặc tạo đột xuất. 4. Cập nhật. 5. Đóng khi có kết quả. Định kỳ không đi nghiệm thu (25c). |
| Nhiệm vụ | Danh sách việc theo người | 1. Tab Nhiệm vụ. 2. Lọc người. 3. Mở phiếu. |
| Danh mục định kỳ | Mẫu sinh việc | 1. Tab Định kỳ. 2. Sửa mẫu. 3. Để spawn tạo phiếu. |
| Báo cáo | Số trong module việc | 1. Tab Báo cáo. 2. Kỳ. 3. Đọc. Không thay Báo cáo chính thức. |

Bookmark `PHAN_CONG_TUAN` / `TUAN` / `CHUONG_TRINH` / `KE_HOACH_NAM` về Điều hành.

### 1.5 Báo cáo chính thức

`/` → `/bao-cao-tong-hop`.

| Phần | Việc |
|------|------|
| Luôn hiện | Chỉ số tổng hợp · VST · GSC · Phần III (nhận xét / kiến nghị trước khi in) |
| «Xem thêm» | Xu hướng · Kết quả NKBV · Bảng kiểm cần can thiệp · Thời điểm và hình thức · Phụ lục CSSD · Chuyên đề GSC |

Phụ lục CSSD có link «Xem báo cáo CSSD» sang `/cssd-erp/report?tab=volume` cùng kỳ.

### 1.6 Quản trị

Hub 3 tab: Việc hàng ngày · Phân quyền · Dành cho IT (`?tab=phan_quyen` / `mdm_governance`).

| Cửa trong hub | Việc | Thao tác |
|---------------|------|----------|
| Quản lý dụng cụ `…/danh-muc/dung-cu?tab=bo` | Sửa master bộ. Tab Rà soát (admin): duyệt đề nghị + rà bộ. Tab Lịch sử: sổ rà soát | 1. Hub → Dụng cụ. 2. Sửa bộ/loại. 3. Rà soát: duyệt phiếu NV đã lập. |
| Thiết bị `…/thiet-bi` | Master máy | Sửa danh mục; vận hành ở `/cssd-thiet-bi`. |
| Hóa chất `…/hoa-chat` | Master hóa chất | Sửa danh mục; tồn ở `/cssd-hoa-chat`. |
| Khoa phòng · Nhân sự | Tổ chức | Sửa khoa / hồ sơ. |
| Bảng kiểm `…/bang-kiem` | Mẫu GSC | Sửa mẫu; chấm ở form giám sát. |
| Tài khoản `…/tai-khoan` · Đổi mật khẩu `/tai-khoan/doi-mat-khau` | Tài khoản | Cấp / đổi mật khẩu. |

Redirect: `/tai-khoan-nhan-su` → nhân sự; `/phan-quyen` → hub tab; `dung-cu/loai|chi-tiet|bo` → href canonical.

### 1.7 Thi KSNK và lối khác

| Cửa | Việc | Thao tác |
|-----|------|----------|
| `/dao-tao` | Hub thi | 1. Ôn tập hoặc Thi chính thức. 2. Làm bài. 3. Xem kết quả. |
| `/dao-tao/admin/ngan-hang` · `muc-do` · `ky-thi` · `ket-qua` | Soạn đề / mở kỳ | Admin: ngân hàng → mức → kỳ → kết quả. |
| `/dao-tao/lam-bai/…` · `ket-qua/…` | Làm và xem một lần thi | Từ hub. |
| Đăng nhập, quên mật khẩu, xin cấp, tra cứu yêu cầu | Cửa auth | Không chồng nghiệp vụ vận hành. |

## 2. Chồng — cùng dữ liệu hoặc cùng hành động ở ≥2 cửa

SSOT = một cửa người dùng phải dùng. Cửa kia là deep-link có ngữ cảnh, hoặc bỏ nút.

### P0

| # | Cùng việc | Cửa đang mở | SSOT đề xuất |
|---|-----------|-------------|--------------|
| P0-1 | Thu hồi mẻ (sự cố quy trình, có mã lô) | Modal trên phiếu mẻ đang xử lý (`MeTietKhuanPage`, cả khi `suppressShell`). Nút + cột «Thu hồi» trên danh sách mẻ. Nút trên `/cssd-su-co`. Nút trên `/cssd-erp/report?tab=incident`. | Ghi từ **phiếu mẻ đang mở** (đã có mã lô) hoặc chip **Sự cố quy trình**. Báo cáo không có nút lập phiếu. |
| P0-2 | Xác nhận phiếu và in nhật ký sự cố | «Phiếu gần đây của tôi» trên `/cssd-su-co` và bảng tab Sự cố của báo cáo — cùng `IncidentConfirmButton` + `IncidentJournalPrintButton`. | **Nhật ký** `/cssd-erp/report?tab=incident`. Trang Sự cố chỉ lập phiếu. |
| P0-3 | Số CSSD (sản lượng, tỷ lệ không sự cố, mẻ, máy) | Báo cáo CSSD: bundle analytics, và fallback `100 - sự cố/quy trình` trên bundle thô khi analytics null (`CSSDReportPage`). Phụ lục Báo cáo chính thức (`payload.cssd`). Cửa báo cáo **không có trên sidebar**. | Một công thức (`cssd-analytics-core`). Một cửa đọc = `/cssd-erp/report`. Phụ lục chỉ link sang cửa đó sau khi số khớp. Cách đưa người vào cửa: chờ Nghĩa (mục 6). |
| P0-4 | Ghi sự cố máy | Nút «Báo sự cố» trên Bảo dưỡng mở modal nhóm EQUIPMENT (kể cả tab Thiết bị). Chip «Sự cố máy» trên `/cssd-su-co`. | `/cssd-su-co?group=EQUIPMENT`, kèm máy đang chọn. Bỏ modal. |
| P0-5 | Luân chuyển số lượng | Tab **Luân chuyển** trên Dụng cụ là cửa ghi. Bookmark trên Sự cố đã bị đẩy sang tab đó. Banner admin vẫn viết: «Điều chuyển / lấy kho / trả kho ở sự cố CSSD — cửa Chuyển» (`QuanLyDungCuPage`). | Tab **Luân chuyển**. Sửa một câu banner. Không mở lại cửa Chuyển trên Sự cố. |

### P1

| # | Cùng việc | Cửa | SSOT |
|---|-----------|-----|------|
| P1-1 | Đề nghị sửa danh mục vs duyệt | NV lập tại Dụng cụ → Đề nghị. Admin duyệt tab Rà soát. Nút «Lập phiếu rà soát» trên tab admin cũng nhảy sang Dụng cụ. | Lập = Dụng cụ. Duyệt = Quản trị Rà soát. Nút lập trên tab duyệt là thừa. |
| P1-2 | Tra cứu bộ/loại | Dụng cụ (read) và Quản trị (CRUD master). Sidebar nhóm «Tra cứu» nhưng trang còn hai tab ghi. | Đọc vận hành = Dụng cụ. Sửa master = Quản trị. Giữ D5. Lát sau tách hàng tab «việc» / «tra cứu» cho đỡ lẫn. |
| P1-3 | Tồn kho vs lịch sử sổ | Lịch sử kho (Dụng cụ) và tab Lịch sử quản trị (sổ rà soát). Hai sổ khác nhau nhưng cùng chữ «Lịch sử». | Kho = Dụng cụ. Rà soát danh mục = Quản trị. Đổi nhãn tab admin cho khỏi trùng chữ. |
| P1-4 | Số VST/GSC | `/thong-ke/*` và các mục VST/GSC trên Báo cáo chính thức. | In / ký = Báo cáo chính thức. Thống kê khoa = `/thong-ke`. Giữ một chiều; không nhân công thức. |
| P1-5 | Số NKBV | Tab Thống kê trên `/giam-sat-nkbv` và mục «Kết quả NKBV» (trong xem thêm). | Bản ký = Báo cáo chính thức. Tab NKBV = tra cứu ca. |
| P1-6 | Hóa chất: kho, sự cố, master | Ba href. Nút sự cố đã deep-link `?group=CHEMICAL` — đúng hướng. | Kho = Hóa chất. Ghi sự cố = Sự cố. Master = Quản trị. Giữ link, không thêm form. |
| P1-7 | Form GSC gốc `/giam-sat-chung` và `/tuan-thu` | Hub đưa vào tuân thủ; route gốc vẫn là form. | Hub + đúng loại. Không thêm chip sidebar. |

### Không chồng (giữ)

- 5 chip sự cố (Hỏng/Mất, quy trình, hóa chất, máy, khác).
- 3 tab quy trình (Chu trình, Mẻ, Truy vết) và `suppressShell` trên Chu trình / Mẻ.
- 4 tab QLCV. Báo cáo chính thức không có khối việc.
- WHO và hai mẫu VST GSC là ba form, không gộp một %.
- Redirect batch / thong-ke cssd / tab kho.

`InventoryIssueModal` không có chỗ gọi. Không phải cửa sống. Dọn ở lát sau, không phải P0.

## 3. Gap theo khóa Soft-ready

### Cascade trạng thái – tồn – đếm – báo cáo

| Khâu | Cửa hiện tại | Lệch |
|------|----------------|------|
| Trạng thái bộ | Chu trình + tab Vận hành của báo cáo (`fetchCssdReportBundle`) | Cùng kỳ lọc với analytics, nhưng là request riêng. |
| Tồn / sổ dụng cụ | Luân chuyển và Hỏng/Mất ghi sổ; đọc ở Lịch sử kho | Không đọc số này trên báo cáo sản lượng. Đúng nếu nhãn không gọi lịch sử kho là «sản lượng». |
| Đếm | `fetchCssdAnalyticsBundle` và, khi tỷ lệ analytics null, công thức thô trên `raw` | Một màn hai cách tính tỷ lệ không sự cố. Cột biểu đồ lấy «hoàn thành» từ analytics và «sự cố» từ `raw`. |
| Báo cáo in | Phụ lục CSSD trên Báo cáo chính thức, field đã map từ core analytics | Cùng tên chỉ số với báo cáo CSSD. Chưa chứng minh cùng một lần query. NV CSSD không thấy cửa đếm trên menu. |

Mẻ: thêm/bớt/bắt đầu đã `reloadProcessContext` trên tip. Không mở refresh mới ở lát A.

### UI rối / thao tác thừa

- Thu hồi mẻ lặp 4 nơi (P0-1). Xác nhận/in lặp 2 nơi (P0-2).
- Modal sự cố máy trên màn bảo dưỡng (P0-4).
- Câu «cửa Chuyển» trên Quản trị (P0-5) đẩy người sang module đã đóng cửa đó.
- Nhóm sidebar «Tra cứu» chứa tab ghi Đề nghị và Luân chuyển (P1-2).
- Tab admin «Lịch sử» dễ nghe nhầm lịch sử kho (P1-3).
- Báo cáo CSSD 7 tab là một strip phẳng — giữ. Thiếu là **đường vào**, không phải thiếu tab.

### Lệch tip `1507db7` so với migrate đã apply

| Việc | Tip committed | Working tree / DB |
|------|----------------|-------------------|
| M-04 chương trình máy | Bảng đã có. Form HEAD không đưa dòng MDM vào picker. | Diff unstaged đã nối `resolveChuongTrinhOptionsForMachine`. **Giữ.** Lát B không đụng file này. |
| L04 `parent_bo_id` | Cột + view đã có. Cổng mẻ vẫn MAIN/SUB trên quy trình. | Comment `rejectParentBoWithSub` vẫn nói schema không có cột. Hành vi cổng chưa sai. Không wire view vào nạp trong lát này. |
| README CSSD | Bảng URL còn tab Kho và «3 cửa biến động». | Code: kho redirect; 5 chip; luân chuyển ở Dụng cụ. Sửa doc ở lát F, không sửa domain. |

## 4. Thứ tự lát B → F

Mỗi lát một việc. Không gộp. Không đụng WIP M-04 và leftover (AGENTS.md, script/csv/txt move sách, proposal QLCV type-vs-priority).

| Lát | Việc | Xong khi |
|-----|------|----------|
| **B — CSSD** | P0-1, P0-2, P0-4, P0-5 và một công thức tỷ lệ (P0-3 phần số). Chưa thêm mục sidebar. | Thu hồi / sự cố máy / xác nhận chỉ còn một cửa. Banner hết chữ «cửa Chuyển». Tỷ lệ trên báo cáo không còn fallback thô. |
| **C — Giám sát** | P1-4, P1-5, P1-7: nhãn một chiều thống kê khoa → bản ký. Không đổi công thức VST/GSC/NKBV. | Người đọc không tưởng tab Thống kê NKBV hoặc `/thong-ke` là bản in. |
| **D — Quản trị vs vận hành** | P1-1, P1-2, P1-3. Giữ CRUD master ở Quản trị và đề nghị ở Dụng cụ. | Hết nút lập phiếu trên tab duyệt. Nhãn lịch sử admin khác «Lịch sử kho». |
| **E — QLCV** | Giữ 4 tab. Không mở proposal loại vs ưu tiên. Chỉ vá nếu UAT thấy cửa thứ hai tới cùng phiếu. | Không thêm cửa. |
| **F — Bản ký** | Sau B: phụ lục CSSD thành link + số lấy cùng core, không bảng thứ hai nếu lệch. Sửa bảng URL README CSSD cho khớp tip. | Một số, một cửa đếm, README không chỉ cửa đã chết. |

## 5. Whitelist đề xuất lát B (chưa sửa)

| File | Việc |
|------|------|
| `src/modules/cssd-erp/views/MeTietKhuanPage.tsx` | Một lối thu hồi khi đang mở phiếu; danh sách không thêm lối thứ hai không mã lô. |
| `src/modules/cssd-erp/components/batch/me-tiet-khuan-columns.tsx` | Cột Thu hồi trùng nút danh sách — giữ một. |
| `src/modules/cssd-su-co/views/SuCoBaoCaoPage.tsx` | Bỏ xác nhận/in trên «phiếu gần đây»; giữ lập phiếu và một link nhật ký. |
| `src/modules/cssd-erp/views/CSSDReportPage.tsx` | Bỏ nút thu hồi. Bỏ fallback tỷ lệ trên `raw`. |
| `src/modules/cssd-erp/views/BaoTriThietBiPage.tsx` | «Báo sự cố» thành link `?group=EQUIPMENT`. |
| `src/modules/quan-tri-he-thong/danh-muc/dung-cu/QuanLyDungCuPage.tsx` | Một câu banner: luân chuyển ở Dụng cụ. |

Ngoài whitelist: file M-04 đang sửa (`me-tiet-khuan-create-step.tsx`, `me-tiet-khuan-list-data.ts`, `use-me-tiet-khuan-workflow.ts`, `me-tiet-khuan-chuong-trinh.ts` + spec, `me-tiet-khuan-batch-integrity.ts` + spec). Không đụng `cssd-analytics-core.ts` trừ khi bỏ fallback vẫn lệch số — khi đó chỉ gọi core sẵn có, không viết công thức mới.

## 6. Chờ Domain / Nghĩa

| Việc | Vì sao chưa làm |
|------|-----------------|
| Đưa Báo cáo CSSD vào menu | Hai cách, chưa chọn. **A:** thêm mục «Báo cáo» nhóm CSSD · Vận hành, href `/cssd-erp/report`. **B:** một link trên shell Quy trình, sidebar giữ nguyên. |
| Wire `v_cssd_bo_heat_split_hint` vào nạp / cấm quét bộ mẹ | Chưa có UI tách danh mục thì bộ hỗn hợp bị kẹt. Đóng gói đang cảnh báo. |
| Đổi chữ QC mẻ thành Kiểm bộ | Hai chữ cố ý (trạm Kiểm bộ ≠ QC mẻ). |
| KPI GSC mới, SSI procedure, QLCV loại vs ưu tiên | Không invent. File proposal QLCV để nguyên. |
| Bật `KSNK_PILOT_CORE_MODULES` lúc go-live | Bật thì mất cả CSSD, NKBV và Báo cáo chính thức. |

## 7. Top 5 P0

1. **Thu hồi mẻ** mở được từ phiếu đang chạy, danh sách mẻ, trang Sự cố và tab Sự cố của báo cáo.
2. **Xác nhận và in sự cố** nằm cả trên «phiếu gần đây» lẫn nhật ký báo cáo.
3. **Số CSSD** có fallback công thức trên cùng màn báo cáo, lặp ở phụ lục bản ký, và **không có mục menu**.
4. **Sự cố máy** vừa modal trên Bảo dưỡng vừa chip trên Sự cố.
5. **Banner Quản trị dụng cụ** vẫn chỉ «cửa Chuyển» trên Sự cố; cửa ghi thật là tab Luân chuyển.
