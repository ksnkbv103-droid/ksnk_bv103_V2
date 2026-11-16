# 02 · Nghiệp vụ và domain

> **ĐÃ DUYỆT bởi PO 2026-11-16 (bản gốc)** · ảnh chụp 2026-11-15 · nhánh `integrate/2026-11` · HEAD `1333d47e` · nền so sánh `origin/main` = `ae64317c`.
> Bộ 3 file: [01-tong-quan-yeu-cau-lo-trinh.md](01-tong-quan-yeu-cau-lo-trinh.md) (vì sao · cái gì · làm thế nào · lộ trình) · **02** (file này: nghiệp vụ, domain) · [03-tien-do-thuc-trang.md](03-tien-do-thuc-trang.md) (đã làm, thực trạng, số đo kèm lệnh đo lại).
> Nhãn: «cần kiểm» = nguồn không nói rõ hoặc chưa đo lại · «không có trong nguồn» = đã tìm trong các nguồn đã đọc mà không thấy · `[ĐỀ XUẤT]` = chưa PO chốt.
> Gom theo yêu cầu PO 2026-11-15; nằm ngoài `docs/core`, đã xếp lớp 6 trong `docs/README.md` (PO 2026-11-16; 01 §6.5 mục 6).

## 0. Cách đọc

- **Mục đích**: gom quy tắc nghiệp vụ và domain đang nằm rải rác thành một chỗ để rà soát và sửa mã đúng nghiệp vụ. File này chỉ chép lại và trỏ nguồn, không đặt quy tắc mới. Số liệu y khoa chỉ lấy điều nguồn có; nguồn im ghi «không có trong nguồn», nguồn không rõ ghi «cần kiểm».
- **Số liệu trạng thái** (prod, số ca, số lỗi, migration đã áp) thuộc [03](03-tien-do-thuc-trang.md). Ở đây chỉ nêu khi cần để hiểu quy tắc, kèm ghi chú `ảnh chụp <ngày>`.
- **Khi hai nguồn lệch nhau** `[ĐỀ XUẤT]`: (1) mốc PO muộn nhất thắng; (2) không có mốc thì theo code hiện hành; (3) còn lại ghi «cần kiểm» cho tới khi PO chốt (01 §6.5 mục 5). Mọi chỗ lệch gom ở §8; chưa hàng nào được PO chốt.
- **Cách trích**: `KÝ_HIỆU:dòng`. `MD:25-26` là `metric-dictionary.md` dòng 25 đến 26; `MD:11,25-26` là dòng 11 và dòng 25 đến 26. Mỗi mục có dòng `Nguồn:`. Số dòng của từng file ghi ở bảng dưới (đếm bằng `wc -l` ngày 2026-11-16); nguồn đổi thì số dòng trích có thể lệch.
- **Mã việc** dạng `QT-003`, `QLCV-003`, `CSSD-005`, `DT-002`, `VST-003` (gạch ngang) là mã trong sổ lỗi, khác mã quy trình dạng `QT.07` (dấu chấm). Tiền tố `QT-` nguồn không giải nghĩa: «cần kiểm».
- **Thứ tự đọc**: §1 nền · §2 và §3 giám sát (đang dùng thật) · §4 CSSD · §5 NKBV · §6 QLCV · §7 Đào tạo · §8 chỗ nguồn lệch nhau · §9 bảng, RPC, route.

| Ký hiệu | File (từ `docs/`) | Dòng |
|---|---|---|
| `mdm` | `modules/mdm/README.md` | 31 |
| `GS` | `modules/giam-sat/README.md` | 162 |
| `BK` | `modules/giam-sat/bang-kiem-overview.md` | 55 |
| `MD` | `modules/dashboard/metric-dictionary.md` | 374 |
| `BC` | `modules/dashboard/bao-cao-tong-hop.md` | 45 |
| `DO` | `modules/cssd/domain-overview.md` | 298 |
| `18` | `modules/cssd/18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md` | 249 |
| `QL` | `modules/cssd/quan-ly-dung-cu-luong.md` | 47 |
| `SSOT` | `modules/nkbv/hai-surveillance-domain-ssot-20260827.md` | 1291 |
| `19` | `modules/qlcv/19-QLCV-DOMAIN-SSOT.md` | 169 |
| `QV` | `modules/qlcv/van-de-nguoi-dung.md` | 67 |
| `DT` | `modules/dao-tao/domain-overview.md` | 324 |
| `DV` | `modules/dao-tao/van-de-nguoi-dung.md` | 68 |
| `roadmap` | `core/handover-roadmap.md` | 195 |

- **Nguồn ngoài `docs/`**: `.claude/rules/dashboard.md` (53 dòng) · `src/lib/supervision-policy.ts` (139 dòng) · `src/lib/analytics/supervision-thresholds.ts` (129 dòng) · `CLAUDE.md` mục Khóa PO 2026-10-09 (không có số dòng). Khi trích, ghi đường dẫn đầy đủ cùng số dòng, ví dụ `src/lib/supervision-policy.ts:23-25`.
- **Nhãn do nguồn đặt** (không phải nhãn của file này): `QV` và `DV` dùng `[SSOT]`, `[GIẢ THUYẾT]`, `[CẦN XÁC NHẬN]`, `[ĐỀ XUẤT]`; nghĩa theo từng nguồn, đừng nhầm `[ĐỀ XUẤT]` của nguồn với `[ĐỀ XUẤT]` ở đầu file này.
- **Giải nghĩa viết tắt** (giải nghĩa của file này, không phải trích nguồn): PO = chủ sản phẩm · KSNK = kiểm soát nhiễm khuẩn · NKBV = nhiễm khuẩn bệnh viện · VST = vệ sinh tay · GSC = giám sát chung, phiên bảng kiểm động (`MD:12`) · TGS = tự giám sát · BCTH = báo cáo tổng hợp · BM = biểu mẫu · QT = quy trình · QC = kiểm soát chất lượng · DC = dụng cụ · BOM = thành phần bộ dụng cụ · CNK = chủ nhiệm khoa · BYT = Bộ Y tế · BGĐ = Ban giám đốc · CSSD = khu tiệt khuẩn trung tâm (tên nguồn viết tắt) · BD = Bowie-Dick · CI = chỉ thị hóa học · BI = chỉ thị sinh học · PCD = process challenge device · EO = ethylene oxide (`roadmap:178` viết ETO, coi là cùng nghĩa, «cần kiểm») · PP = phương pháp (nguồn viết tắt, ví dụ `18:185`).
- **Viết tắt riêng của NKBV** (theo `SSOT`): IWP = infection window period · DOE = date of event · POA = present on admission · HAI = healthcare-associated infection · LOA = location of attribution · RIT = repeat infection timeframe · SBAP = secondary BSI attribution period · PATOS = present at time of surgery · VAE = ventilator-associated event. CLABSI, CAUTI, SSI, PNEU, VAP theo thuật ngữ NHSN mà `SSOT` dùng. CLIP, LabID, MDRO, AUR, SIR nằm ngoài domain.
- Viết tắt nhóm mẻ `-CN`, `-KCN` của CSSD không được giải nghĩa trong phần đã trích: «cần kiểm».

## 1. Nền: MDM, RBAC, Quản trị

Nguồn: `mdm`, `roadmap:85,89,91,92,176,178`, `GS:88,118-124`, `DO:206,227,251`, `19:54,96`, `src/lib/supervision-policy.ts:23-25`.

### 1.1 Danh mục và nhân sự

- Hai loại danh mục (`mdm:3`): **MDM tổ chức** = khoa, nhân sự, lookup (`mdm_*`, `sys_lookup_value`); **Master CSSD** = loại, bộ, BOM, thiết bị, hóa chất (`cssd_dm_*`). Nguồn ghi master CSSD được CRUD tại Quản trị, không phải phiên QR hay mẻ; phần này đã lệch sau AR-5a (§8.7).
- Thứ tự dựng dữ liệu để phiên giám sát đúng khoa: tạo hoặc sửa khoa → gán nhân sự → `/giam-sat-chung` hiện header đúng khoa (`mdm:17`).
- Mẫu bảng kiểm sửa ở `/giam-sat-chung/bang-kiem`; phiên GSC mới phải nạp đủ tiêu chí của mẫu (`mdm:18`).
- Tab Phân quyền chỉ hiện khi có `PHAN_QUYEN.edit` hoặc là admin; người thiếu quyền không sửa được danh mục chung (`mdm:19`).
- Tài khoản đăng nhập (Auth) gắn với `mdm_nhan_su` qua `/quan-tri-he-thong/nhan-su` (cột Tài khoản) và `/quan-tri-he-thong/tai-khoan` (hub yêu cầu) (`mdm:20`).
- Import: Smart import và `useImportExport` là SSOT; xem trước rồi chọn `An toàn`, `Đồng bộ đầy đủ` hoặc `Hủy`; server mặc định `An toàn` (`mdm:25`). Hub `?tab=mdm_governance` đọc `sys_mdm_registry`; sau khi duyệt FK chạy `npm run mdm:refresh` (`mdm:26`).
- Từ AR-8 (PO chốt 2026-11-11, `roadmap:92`): Tổ chức tách thành module riêng `/to-chuc` (khoa phòng, nhân sự, lookup ORG); lookup miền sửa ngay trong module: GSC `/giam-sat-chung/danh-muc`, CSSD `/cssd-quy-trinh/danh-muc`, NKBV `/giam-sat-nkbv/danh-muc`; chỉ ADMIN sửa lookup; Quản trị còn ba tab Tài khoản, Phân quyền, Hệ thống (cổng vào `ADMIN · PHAN_QUYEN`). Trạng thái áp dụng ở 03 §5. Một số đường dẫn trong `mdm` vì vậy có thể đã cũ (§8.7).

### 1.2 Vai và quyền

| Vai | Việc nguồn ghi | Nguồn |
|---|---|---|
| `ADMIN` | Đứng tên giám sát; ghi master CSSD (loại, bộ, BOM) và duyệt `BOM_PENDING`; đặt khóa sổ GSC và VST; duyệt đăng ký của khách (QT-003); sửa lookup ORG, GSC, CSSD, NKBV | `src/lib/supervision-policy.ts:23-25`; `DO:206,227,251`; `GS:118-124`; `roadmap:92,178` |
| `NHAN_VIEN_KSNK` | Đứng tên giám sát; QLCV chỉ cho nhân viên KSNK (`ensureQlcvKsnkAccess`); các vai khác có vào QLCV không: «cần kiểm» | `src/lib/supervision-policy.ts:23-25`; `19:54,96` |
| `MANG_LUOI_KSNK` | Đứng tên giám sát; sau AR-8h thấy tab Danh mục GSC ở chế độ chỉ xem | `src/lib/supervision-policy.ts:23-25`; `roadmap:92` |
| `HOI_DONG_KSNK` | Chỉ xem, không đứng tên giám sát; xem NKBV toàn viện (PO 2026-11-11) | `src/lib/supervision-policy.ts:23-25`; `roadmap:178` |
| `KHACH_THONG_KE_GSTT` | Sau AR-8h thấy tab Danh mục GSC ở chế độ chỉ xem; nghĩa nghiệp vụ của vai: «cần kiểm» | `roadmap:92` |
| `CHU_NHIEM_KHOA` | Vai cộng thêm (PO 2026-11-10); hai action duyệt kiểm quyền `approve` thay cho tên `ADMIN` (AR-1, migration `20261111150000`); chưa gán cho ai (PO 2026-11-17, N6: người giữ vai là Trịnh Hữu Nghĩa; gán tài khoản thật chưa làm, là cổng PO); không gán qua dropdown nhân sự vì `rpc_assign_staff_ksnk_role` thay thế vai; còn nợ test tay UI bằng tài khoản không phải ADMIN | `roadmap:85,91` |

- Sau AR-8h (migration `20261111150400_ar8h_drop_danh_muc_permission_keys`, chạy local; trạng thái ở 03 §5): bỏ các khóa `DANH_MUC`, `DANH_MUC_GSTT`, `DANH_MUC_CSSD_LOOKUP`, giữ `DANH_MUC_ORG`; đọc `sys_lookup_value` = mọi người đã đăng nhập, ghi = ADMIN (`roadmap:92`).
- Quyền VST và GSC: `/giam-sat` mở đủ ba lối nhập khi người dùng có quyền VST và GSC (`GS:88`); đây là mục nghiệm thu nhanh, không phải bảng quyền chi tiết. Ma trận quyền chi tiết theo vai và module: «không có trong nguồn».
- Quyền `approve` cho hóa chất và thiết bị (AR-5d, `roadmap:89`): thao tác nhạy cảm của hai danh mục này cần `approve` (hàm `requireCssdSensitiveApprove`); đổi tên, ghi chú, vị trí vẫn ghi trực tiếp; PO chọn không làm hàng chờ mới (tổ nhờ chủ nhiệm khoa thực hiện); import Excel hóa chất và thiết bị cũng cần `approve`. Trigger DB `fn_cssd_dm_approve_guard` (migration `20261111150200`, chạy local) chặn ghi thẳng PostgREST của `authenticated` khi thiếu `approve`; `service_role` và hàm DEFINER đi qua. Áp hai migration AR-5d lên prod là cổng của PO (trạng thái ở 03 §5). Khi làm AR-8, PO giả định không đổi luật AR-5d cho master hóa chất, thiết bị, dụng cụ (`roadmap:92`).
- Nợ RBAC đã ghi (`roadmap:91`, rà 2026-11-11): `permission-registry-data.ts` thiếu `APPROVE` cho `THIET_BI` và `HOA_CHAT`; `CHU_NHIEM_KHOA` không gán được từ UI (`RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER`); không có preset `Đặt lại quyền mặc định`; dropdown `Gói quyền` áp được cho vai này nên có thể cấp quá `approve` và `view`. Mục nợ về `approve` của hai danh mục và mô tả AR-5d ở `roadmap:89` cùng nói về một việc; chưa đối chiếu code xem nợ đã đóng chưa: «cần kiểm».

### 1.3 Quyết định PO 2026-11-11 (`roadmap:178`)

| Việc | Quyết định | Còn lại (ảnh chụp 11-11) |
|---|---|---|
| QT-003 | Prod cho khách tự đăng ký, ADMIN duyệt | Email break-glass chưa có auth user: tạo sẵn auth user trên prod hoặc tắt signup (việc của PO) |
| QLCV-003 | Người tạo việc không tự nghiệm thu, trừ ADMIN và chủ nhiệm khoa | Migration `20261111200000` chờ prod; `CHU_NHIEM_KHOA` hiện 0 người; break-glass chỉ ADMIN hoặc CNK thật |
| CSSD-005 | Được thêm mã ca mổ sau cấp phát | Đóng |
| DT-002 | Thi thử không vượt cấu hình mức độ nhưng được thi lại | — |
| DT-001 | Xóa file TRUNCATE qbank | Nguồn ghi đã xóa (`roadmap:178`) nhưng mã còn nằm trong danh sách việc mở (`roadmap:176`): «cần kiểm» |
| Hội đồng KSNK (không có mã) | Hội đồng xem NKBV toàn viện (khớp quy tắc hiện có) | — |
| CSSD-002 | — | Đã kiểm tầng DB; còn bấm tay nút trả lui và mẻ ETO trên giao diện |
| VST-003 | — | Còn chặn lúc ảnh chụp 11-11 (cần PO duyệt RLS prod); trạng thái sau đó ở 03 §5 |
| CSSD-001 | — | Còn chặn lúc ảnh chụp 11-11: PO trả lời còn cần bộ con -EO không |

Danh sách migration chờ PO duyệt lên prod ở `roadmap:176`: `20261111170000` (NKBV-003, RLS theo khoa), `20261111180000` (VST-006), `20261111190000` (QLCV-002); còn mở VST-003, VST-004, CSSD-001, CSSD-002, DT-001, QT-003. Trạng thái hiện tại ở 03 §5.

Giả định chờ PO ở sổ lỗi (mã NKBV-032, 034, 035, 039, 040; xem 03 §3.3): Hội đồng tương đương BGĐ ở mức `Xa`, vì M03 không có mã vai HOI_DONG (M03 theo bản đặc tả ngoài repo, «cần kiểm»). PO 2026-11-11 đã nói Hội đồng xem NKBV toàn viện; hai ý ghi cạnh nhau, không tự gộp. PO 2026-11-17 (K5): Hội đồng thấy danh tính người bệnh; lệch với mặc định chặn danh tính ở trên và với việc duyệt áp sáu policy chặn Hội đồng (P3): chưa chọn, xem 1.5 và 03 §6 (NKBV-041).

### 1.4 Không có trong nguồn

- Ma trận quyền chi tiết theo vai và module: «không có trong nguồn».
- Ma trận `ai xem gì` theo khoa: «không có trong nguồn»; 01 §2 ghi đang chờ PO nhãn `GS-1`. PO 2026-11-17 trả lời N1 và N2 cho hai vai KSNK (1.5); chưa thành ma trận đầy đủ.
- Nghĩa nghiệp vụ của vai `KHACH_THONG_KE_GSTT`: PO 2026-11-17 trả lời một phần (N5, 1.5); phạm vi xem vẫn «cần kiểm».

### 1.5 PO trả lời phiếu hỏi 2026-11-17 (vai, VST, GSC, ngưỡng)

Phiếu 52 câu; PO trả lời 50, bỏ trống B2 (ngưỡng đúng từng chỉ số) và K1 (đầu mối NKBV). Câu trả lời nằm trong phiếu, chưa nằm trong mã; mã câu ở ngoặc. Kết quả từng mục sổ lỗi: 03 §6.

- Vai: `NHAN_VIEN_KSNK` thấy mọi khoa trong viện (N1); `MANG_LUOI_KSNK` chỉ khoa được gán (N2); cần vai riêng cho điều dưỡng trưởng hoặc chủ nhiệm khoa lâm sàng xem danh sách có tên của khoa mình, chưa có tên vai (N3); `CHU_NHIEM_KHOA` được mở GSC, đọc toàn viện (N4); người giữ vai là Trịnh Hữu Nghĩa (N6).
- `KHACH_THONG_KE_GSTT` (N5): «cho tất cả thành viên mạng lưới, hoặc 1 mail dùng chung, mật khẩu chung»; phạm vi xem chưa trả lời. Cần kiểm: hai cách khác nhau, và mật khẩu chung làm mất dấu vết ai đã xem; chưa chọn.
- Hội đồng KSNK (K5): thấy danh tính người bệnh NKBV toàn viện. Lệch với việc duyệt áp sáu policy chặn Hội đồng đọc danh tính (P3); chưa chọn, xem 03 §6 (NKBV-041).
- VST/GSC: đầu mối Nguyễn Bá Hoài Việt, Trịnh Hữu Nghĩa (V1); mạng lưới khoa tự nhập sau khi hoàn thiện repo và nhập danh sách thành viên, chưa có tháng (V2); ba người chạy kịch bản tay: «tổ giám sát», chưa có họ tên (V3); biểu mẫu: «dùng biểu mẫu đang có», chưa nêu mã (V4); bản in thêm chữ ký và dấu ● ở ô đã chọn, không thêm khối IV, không in kết luận (V5); lưu 1 năm, chưa nêu căn cứ và có in không (V6); xuất thô kèm cả hai tên (V7); đối soát GSC: «phần mềm tự tính sự chênh lệch», chưa có người, khoa, kỳ (V8); ngưỡng đạt QT.32: «không cần con số, tính theo tỉ lệ tuân thủ» (V9).
- Ngưỡng dashboard: căn cứ của 85/70/80 là chỉ tiêu nội bộ của viện (B1); ngưỡng đúng từng chỉ số bỏ trống (B2); báo cáo tổng hợp nộp Giám đốc, phó giám đốc, theo tháng, quý, năm (B3).
- Duyệt áp prod: PO đồng ý P1 (sửa lịch sử migration trước khi đẩy lô), P2 (RLS VST), P3 (RLS NKBV). Chưa áp cái nào; mỗi lần áp cần lệnh trong chính lượt đó (03 §6).

## 2. Vệ sinh tay (VST)

Nguồn: `GS:20-35,49-80,84,88-101,103-114,118-162`, `BK:50-52`, `MD:25-33`, `CLAUDE.md` mục Khóa PO 2026-10-09, `src/lib/analytics/supervision-thresholds.ts:14-38`.

### 2.1 Bốn tầng và route

- Bốn tầng một chiều (`GS:20`): Ghi nhận → Lịch sử → Thống kê khoa (`/thong-ke`) → Báo cáo chính thức (in). ModeNav là công tắc duy nhất trong module; BCTH chỉ để điều hành và in; link `Chi tiết thống kê` đi một chiều.
- `/bao-cao-tong-hop` là cửa nhìn số và in; `/` chuyển hướng vào đây (`GS:22`). Không tạo việc từ Tổng quan hay Thống kê GSC; Công việc `/quan-ly-cong-viec` tách riêng (`GS:23`).
- Route (`GS:27-35`): VST `/giam-sat-vst`; GSC `/giam-sat-chung` (kèm `/tuan-thu`, `/nhat-ky`, `/he-thong`); thống kê `/thong-ke/vst` và `/thong-ke/gsc`; lịch sử `/lich-su/vst` và `/lich-su/gsc` (sửa thì quay về `basePath?edit=id`).
- Thống kê GSC dùng deep link `?loai=`, mặc định `TUAN_THU`; giá trị kebab `tuan-thu`, `nhat-ky`, `he-thong` ứng `TUAN_THU`, `NHAT_KY_VAN_HANH`, `DANH_GIA_HE_THONG` (`GS:33`).
- Deep link thống kê từng khối (`GS:84`): `/thong-ke/vst`, `/thong-ke/gsc?bk=KSNK.QT.07.BM.02`, `/thong-ke/gsc?bk=KSNK.QT.07.BM.03`; mã ngắn `BM.07.0x` vẫn được nhận như alias.
- Import Excel phiên GSC và VST đã gỡ, pilot chỉ nhập qua form (`GS:35`); `GS:124,144` còn nhắc import (§8.3).

### 2.2 Khóa PO 2026-10-09 và quy tắc phiên VST

- Rửa hoặc chà: tối đa 2 thời điểm WHO phân biệt. Bỏ sót: đúng 1 thời điểm. Năm mốc trên một hàng. Quá trần thì bỏ mốc cũ nhất, không hiện toast (`GS:99`). Ô chọn nền `#026f17`, chữ trắng.
- Chỉ số dùng `fn_vst_is_valid_opportunity` với cùng trần như form.
- Xóa phiên VST là xóa mềm `is_active=false` cho đến khi PO nói khác.
- Mục `Quy tắc phiên` (`BK:50`): VST tối đa 3 đối tượng quan sát mỗi phiên, trừ khi có yêu cầu mới (`BK:52`). Quy tắc phiên của GSC ở 3.2.

### 2.3 Hub vệ sinh tay (PO 2026-09-22, `GS:49-80`)

Ba lối nhập, không gộp form:

| Lối | Biểu mẫu | Route | Mã trong nguồn |
|---|---|---|---|
| WHO 5 thời điểm | QT.07 BM.01 | `/giam-sat-vst` | chỉ số BCTH `vst.chi_so.ty_le_tuan_thu` |
| Kỹ thuật VST thường quy | BM.02 | `/giam-sat-chung/tuan-thu?bk=KSNK.QT.07.BM.02` | GSC `BM.07.02` |
| VST ngoại khoa | BM.03 | `/giam-sat-chung/tuan-thu?bk=KSNK.QT.07.BM.03` | GSC `BM.07.03` |

- BM.01 (`VST_WHO`) bị cấm trong picker GSC, lọc tại `getBangKiemsForGiamSat` (`GS:66`).
- Không trung bình ba khối thành một %; ba khối dùng chung bộ lọc kỳ, khoa, lens TGS hoặc KSNK; tab VST cũng tải GSC (`shouldFetchSource("VST","GSC") === true`). Mã ở `src/lib/domain/ve-sinh-tay-catalog.ts`.
- Hai bảng cùng file đặt mã khác nhau (`KSNK.QT.07.BM.02` và `BM.07.02`): «cần kiểm». `MD:374` ghi `gsc-bk-short-long-map.ts` còn dùng cặp mã cũ (§8.3).

### 2.4 Chỉ số, mẫu mỏng, đối soát

- Mẫu số `tong_co_hoi` (`MD:26`): một dòng `gstt_fact_vst` hợp lệ theo `fn_vst_is_valid_opportunity` là một cơ hội, không tách theo chỉ định WHO; dòng vượt trần (quá 2 thời điểm WHO khi rửa hoặc chà, hoặc khác 1 khi bỏ sót) không tính (PO 2026-10-09). Công thức `ty_le_vst` ở 3.3. Nguồn không định nghĩa bằng chữ thế nào là `đạt`: «cần kiểm».
- **Mẫu mỏng**: VST dưới 20 cơ hội, GSC dưới 30; không tô cảnh báo (`GS:101`). Trong mã, `isThinSample(n, min)` chỉ đúng khi `0 < n < min`; `n = 0` là `không có dữ liệu`, không phải mẫu mỏng (`src/lib/analytics/supervision-thresholds.ts:14-38`). Hai nguồn khớp nhau, không có mâu thuẫn giữa 20 và 30. Đơn vị đếm của GSC (tiêu chí hay phiên) nguồn không nêu rõ: «cần kiểm».
- Đối soát chỉ số VST (DB local, ảnh chụp 2026-10-24, `GS:103-114`): RPC khớp tính tay; 39 khoa, 0 lệch; một khoa 109 cơ hội, `ty_le = round(đạt/tổng×100, 1)` = 89,0% (`GS:105`). GSC chưa đối soát (`GS:114`).
- Mục tiêu mức L1: nhập một phiếu dưới 60 giây (`roadmap` §5).

### 2.5 Khóa sổ (`GS:118-162`)

- Admin KSNK đặt `locked_until_date` cho module GSC hoặc VST; mọi phiên có `ngay_giam_sat` nhỏ hơn hoặc bằng ngày khóa không được ghi, sửa, xóa hay import (`GS:124`).
- Bảng `sys_module_locks` (`module_name` là `GSC` hoặc `VST`); trigger DB `trg_assert_gsc_sessions_not_locked` gọi `fn_assert_vst_gsc_not_locked` (GSC, `GS:128`) và `trg_assert_vst_sessions_not_locked` (VST, `GS:129`).
- Form GSC hiện banner vàng khi ngày phiên nằm trong khoảng khóa; lưu, xóa, import trả lỗi server tiếng Việt từ `assertSupervisionNotLockedForDate` (`GS:143-144`).
- Checklist pilot (mục G3 trong checklist pilot của `GS`, không nhầm với cổng G1 đến G6 ở 01): admin bật khóa GSC → mở phiên trong khoảng khóa thấy banner → thử Lưu hoặc Xóa bị chặn (`GS:146-150`).
- Khóa theo ngày phiên, không khóa vô thời hạn trừ khi đặt ngày rất xa (`GS:161`). Banner VST (nếu có) qua hook tương tự (`GS:162`; §8.3).

### 2.6 Ba kịch bản tay mức L1 (`GS:93-101`)

| # | Kịch bản | Kỳ vọng | Dòng |
|---|---|---|---|
| 1 | Nhập phiên VST 5 mốc: `/giam-sat-vst` → chọn khoa, người được giám sát → chọn hành động cho mốc 1 (ví dụ rửa tay bằng nước) → thêm mốc 2 đến 5 trên cùng một hàng → Lưu | Lưu thành công; mốc đạt tối đa 2 thời điểm WHO; vượt trần thì bỏ mốc cũ nhất, không toast; bỏ sót chỉ 1 mốc; ô chọn nền xanh `#026f17` | `GS:99` |
| 2 | Nhập phiên GSC: `/giam-sat-chung/tuan-thu` → chọn khoa, mẫu → tick các mục → Lưu | Phiên lên đầu `/lich-su/gsc` | `GS:100` |
| 3 | Xem thống kê một kỳ và in: `/thong-ke/vst` → chọn kỳ → chỉ số tổng, bảng khoa → in hoặc xuất; lặp ở `/thong-ke/gsc` | Phiên vừa nhập có trong số liệu; số khớp lịch sử; khoa có dưới 20 cơ hội VST (dưới 30 GSC) hiện `mẫu mỏng`, không tô cảnh báo | `GS:101` |

Nghiệm thu nhanh (`GS:88-91`): `/giam-sat` mở đủ 3 lối (cần quyền VST và GSC); BM.02 và BM.03 mở form GSC đúng mẫu đã chọn sẵn; picker GSC không có BM.07.01 hay WHO; BCTH → tab Vệ sinh tay → ba thẻ cạnh nhau (N/A nếu chưa có phiên).

### 2.7 Không có trong nguồn

Định nghĩa bằng chữ của phiên và cơ hội; tên 5 thời điểm WHO; danh sách hành động (rửa, chà, găng); khác biệt tự giám sát và chuyên trách ngoài dấu vết lens TGS hoặc KSNK (`GS:81`); người giám sát; vị trí giám sát (nguồn chỉ nêu khoa là đơn vị, `matrix_khoa` 39 khoa ở `GS:111`); vai và ma trận quyền chi tiết. Tất cả: «không có trong nguồn».

## 3. Giám sát chung (GSC), bảng kiểm, thống kê, báo cáo

Nguồn: `BK`, `MD`, `BC`, `GS:20-23,33,84,101,105`.

### 3.1 Bảng kiểm

- 36 mẫu canonical; cutover 2026-05-29, từ 51 xuống 36; seed từ `canonical-36.md`, nguồn máy này đã gỡ khỏi repo (`BK:3,7`). Generator `scripts/generate-canonical-36-cutover.mjs`; mã ACT enrich qua `scripts/enrich-bang-kiem-act-codes.mjs` (`BK:8-9`).
- Ba `loai_giam_sat` (`BK:19-23`): `TUAN_THU` (hiển thị `Tuân thủ thực hành`), `NHAT_KY_VAN_HANH` (`Nhật ký vận hành`), `DANH_GIA_HE_THONG` (`Đánh giá hệ thống`). `TUAN_THU` là mặc định của thống kê GSC (`GS:33`).
- Bốn `cach_tinh_diem` (`BK:25-32`):

| Giá trị | Cách tính | Hiển thị trên UI |
|---|---|---|
| `TY_LE` | % DAT ÷ (DAT + KHÔNG ĐẠT) | `% · Tốt/Đạt/Không đạt` (`BK:29`) |
| `TRON_GOI` | % như trên, thêm `dat_tron_goi` trong DB | Chỉ %  |
| `DAT_KHONG_DAT` | % như trên | Chỉ % |
| `NHAT_KY` | null; cảnh báo khi ngoài ngưỡng | `—` |

- `BK:34`: UI GSC chỉ hiện tỷ lệ %, không hiện nhãn `Chưa đủ 100%` hay Bundle; phân tích tiêu chí lỗi dùng `results_jsonb` và thống kê. Mâu thuẫn với `BK:29` (§8.3). Engine `giam-sat-scoring.ts`; UI `gsc-score-display.ts`.
- Field `tieu_chi_jsonb` (`BK:13`): `kieu_du_lieu`, `cac_lua_chon`, `nguong_min`, `nguong_max`, `don_vi`, `la_then_chot`, `cho_phep_kpa`, `weight_type`, `is_red_flag`. Ý nghĩa từng field: «không có trong nguồn». Phiếu đã lưu giữ bản chốt (nguồn ghi mã `BK-1`).

### 3.2 Phiên GSC (`BK:53-55`)

- Kết quả lưu inline trong `results_jsonb`, không dùng EAV (`BK:53`).
- Khi Lưu, nội dung mẫu được chốt vào `metadata.bang_kiem_snapshot`; mở sửa, in hoặc xem dùng bản chốt; phiếu cũ chưa chốt chỉ hiện câu đã ghi, không thêm câu mới đang bật trên mẫu (`BK:54`).
- Mẫu đã tắt (hoặc không còn áp dụng cho khoa với mạng lưới) không chọn được cho phiếu mới; phiếu cũ vẫn mở đúng bản đã lưu (`BK:55`).
- Chấm điểm P×I×S (`BK:46-48`): kế hoạch, chưa ship; P và I chấm tay, S gợi ý từ `% tuân thủ năm trước`; điểm = P×I×S; tách khỏi `tong_diem` của phiên; chi tiết ở `bang-kiem-rui-ro-pis-feasibility-20260731.md` (SOP 7.1).

### 3.3 Chỉ số

| Chỉ số | Công thức hoặc mẫu số | RPC hoặc hàm | Dòng |
|---|---|---|---|
| `ty_le_vst` | đạt ÷ `tong_co_hoi` × 100, làm tròn 1 chữ số thập phân; mẫu số theo 2.4 | `rpc_dashboard_vst_strategic_analytics` | `MD:11,25-26` |
| VST đúng kỹ thuật, đủ thời gian | mẫu số `da_tuan_thu` (cơ hội đã rửa hoặc chà); cơ hội bỏ sót không vào mẫu | — | `MD:27` |
| VST lạm dụng găng | mẫu số `bo_sot`; tử số: «không có trong nguồn» | — | `MD:28` |
| `ty_le_gsc` | đạt ÷ tiêu chí có áp dụng (loại NA), mẫu số `tong_quan_sat`, 2 chữ số thập phân; Nhật ký không hiện % | `rpc_dashboard_gsc_strategic_analytics` | `MD:12,29-30` |
| `ty_le_bao_phu_tgs` | số bảng kiểm bắt TGS đã có ít nhất 1 phiên ÷ số bảng kiểm bắt TGS áp dụng cho khoa | `rpc_gsc_tgs_session_hits` | `MD:17,185` |
| Năng suất nhân viên | `so_co_hoi_vst`, `so_phien_vst`, `so_phien_gsc` | — | `MD:299-303` |
| `ty_le_quy_trinh_khong_su_co` (CSSD) | 100 − (sự cố ÷ quy trình) × 100 trong kỳ | — | `MD:194,197` |
| Sản lượng CSSD | `san_luong_cap_phat`, `san_luong_tram`, `cap_phat_theo_khoa_nhan`: đếm `cssd_fact_quy_trinh` có `thoi_gian_<trạm>` | — | `MD:195,242,253,264` |
| Mẻ và QC mẻ | `so_me_ky` = COUNT `cssd_fact_lo_tiet_khuan`; `ty_le_qc_dat_me` = mẻ `ket_qua_test=true` ÷ mẻ đã có kết quả × 100 | — | `MD:281-282` |
| Máy và bảo trì | `may_ready`, `may_repairing`, `phieu_bao_tri_mo`; định nghĩa xem nguồn | — | `MD:281-285,291` |
| `ti_le_xac_nhan_nkbv` | `da_xac_nhan` ÷ (XAC_NHAN + LOAI_TRU) × 100; phiếu chờ không vào mẫu số | — | `MD:218` |
| `clabsi_rate_per_1000` | `obs_clabsi_cases` ÷ `obs_cvc_days` × 1000; CAUTI chỉ nêu tên | — | `MD:212,219` |
| QLCV, Đào tạo | QLCV không có chỉ số (chỉ `analytics_meta` PDCA); Đào tạo: «không có trong nguồn» | — | `MD:106-107` |

- Nguồn số liệu (`MD:11-13`): VST và GSC lấy từ hai RPC ở bảng trên; NKBV lấy từ aggregate action của module NKBV (outcome nhiễm khuẩn, không gộp CCS).
- `ty_le_gsc` (Spec change 2026-08-24, `MD:30`): thống nhất 2 chữ số trên form, lịch sử, in, thống kê GSC, BCTH; `ty_le_vst` giữ 1 chữ số. Mặc định chỉ tính `TUAN_THU` hoặc `loai_giam_sat` trống; Nhật ký vận hành và Đánh giá hệ thống không vào mẫu số trừ khi chọn đúng chuyên đề hoặc `?loai=` (Spec change 2026-08-22, `MD:31`). Null khi mẫu số bằng 0 (`MD:32`).
- Biểu đồ khoa VST hiện `n` và khoảng tin cậy Wilson 95% (`wilsonInterval95`, `src/lib/analytics/supervision-percent.ts`), không đổi công thức (2026-10-12, `MD:33`). GSC không hiện khoảng tin cậy vì các tiêu chí trong một phiên tương quan, Wilson sẽ báo chắc hơn thực tế.
- Chỉ số gộp `CCS` (`ty_le_ccs`) = 0,5 × VST + 0,5 × GSC, đã bỏ khỏi hiển thị. Spec change 2026-07-31 (`MD:39`): không dùng trên chỉ số, xu hướng, xếp hạng khoa, Command Center, bản in, draft nhận xét; điều hành chỉ nhìn `ty_le_vst` và `ty_le_gsc` (và theo chuyên đề hoặc bảng kiểm khi lọc). 2026-08-23 (`MD:40`): BCTH không còn compose `ty_le_ccs` hay `delta_ccs` trong payload; `computeCcs` giữ trong `supervision-metrics` vì PDCA đọc khóa cũ `ty_le_ccs`; cấm hiển thị nhãn CCS cho người dùng. Thêm: `MD:97` chỉ để đọc cũ; `MD:124` nội bộ không hiện; `MD:128` cấm gộp NKBV, CSSD vào CCS; `MD:148-149` cấm CCS trên điều hành; `ty_le_avg` là legacy.

### 3.4 Báo cáo bốn tầng và BCTH

Bốn tầng ở 2.1 (`GS:20-23`). `/bao-cao-tong-hop` là cửa nhìn số và in, không phải tầng nhập. Chi tiết thẻ chỉ số và bản in nằm ở `BC` (45 dòng), không chép lại ở đây. Điểm lệch giữa `BC` và `MD`: §8.2.

### 3.5 Ngưỡng và đơn vị Δ

| Tên | Giá trị | Dùng cho | Nguồn |
|---|---|---|---|
| `GREEN_MIN` | 85% | Đạt (màu xanh) | `MD:84-89` |
| `YELLOW_MIN` | 70% | Cần theo dõi | `MD:84-89` |
| `KHOA_WARN_PCT` | 80% | Tô cảnh báo cột và bảng khoa GSC, BCTH | `MD:84-89` |
| `VST_KHOA_CHART` | Vàng dưới 90%, đỏ dưới 85% | Chỉ biểu đồ khoa của thống kê VST; không đổi CCS | `MD:84-89` |
| Mẫu tối thiểu | VST 20, GSC 30 | Mẫu mỏng (2.4) | `GS:101` |

Cả bốn ngưỡng đầu là ngưỡng vận hành pilot, chưa có căn cứ định lượng từ nghiên cứu (PO quyết định 2026-11-06, `MD:84-91`); nguồn chuẩn trong mã là `src/lib/analytics/supervision-thresholds.ts` (`MD:91`). Không dẫn WHO hay chuẩn ngoài.

Đơn vị Δ trên thẻ chỉ số BCTH (`ComprehensiveChiSoCards`, `MD:93-97`):

- Đơn vị Δ (`MD:95`, sửa hiển thị 2026-10-12, công thức giữ nguyên): Δ tuần và Δ kỳ trước là chênh lệch điểm phần trăm (tuần gần nhất trừ tuần liền trước), hiển thị `+3.4 điểm %`, không phải % tương đối; `Tỷ lệ tuần trước` in cạnh Δ là đúng tuần mà Δ đem so (cùng điều kiện cỡ mẫu, hai tuần ISO liên tiếp). Nếu hai tuần chấm bộ bảng kiểm khác nhau thì chênh lệch phản ánh cơ cấu bảng kiểm. **PO chọn cách 1 (2026-10-12)**: hiện chú thích `khác cơ cấu bảng kiểm` cạnh Δ GSC, giữ công thức, vẫn hiện Δ. Chú thích so bộ bảng kiểm (`TUAN_THU` trừ BM.02 và BM.03, hai khối VST ở 2.3) của hai tuần Δ đem so, theo bộ lọc khoa của BCTH; không rõ phạm vi, lỗi đọc hay dữ liệu chạm trần 5000 phiên thì không chú thích.
- Đã bỏ (PO 2026-11-16, `MD:96`): bảng mục tiêu viện, action đọc mục tiêu và badge `Mục tiêu viện`; màu thẻ dùng ngưỡng ở bảng trên. Không đổi công thức CCS (`MD:97`).

### 3.6 Quy tắc chung

- **Hai lens** (`MD:54-58,169-177`): KSNK = giám sát do khoa KSNK thực hiện (`vol_ksnk`, `ty_le_ksnk`), nhãn UI và in là chuyên trách; TGS = tự giám sát của khoa lâm sàng (`vol_tgs`, `ty_le_tgs`), nhãn UI và in là tự giám sát. Comparable khi `vol_tgs > 0` và `vol_ksnk > 0` trong cùng kỳ và bộ lọc; loại các mã RPC `Chưa TGS`, `Chưa KSNK`, `Chưa triển khai` (UI: Chưa tự giám sát, Chưa chuyên trách). `do_lech` = tự giám sát − chuyên trách, tính sau khi mỗi tỷ lệ đã làm tròn từ số đếm (VST 1 chữ số, GSC 2 chữ số).
- **Công tắc lens** (`MD:142-149`): Chuyên trách hoặc Tự giám sát (mặc định Chuyên trách); bảng hành động và biểu đồ chỉ gắn một nguồn theo công tắc; Bao phủ TGS và Đối soát (comparable: cả hai `vol > 0`) nằm ở Nâng cao hoặc Xem thêm, không nhập vào % tuân thủ; cấm % trộn TGS và KSNK, cấm CCS trên điều hành (`MD:148-149`).
- **Xu hướng theo thời gian** (`MD:64-67`): khi gộp tuần thành tháng, quý, năm thì cộng mẫu số và mẫu tử của từng tuần, không lấy trung bình % các tuần; khóa tuần ISO bắt đầu Thứ Hai (`isoWeekBucketKey`). Quy tắc cộng này chỉ áp dụng cho gộp xu hướng theo thời gian, không cho việc gộp TGS với KSNK.
- **Kỳ trước `ky_truoc`** (`MD:74-78`, BCTH 2026-07-29): cùng độ dài kỳ lọc `[tu_ngay, den_ngay]` dịch lùi liền trước (tính cả hai đầu); nhãn `vs kỳ trước (dd-mm→dd-mm)` trên chỉ số BCTH, tách khỏi badge `Δ 2 tuần ISO`; gọi lại strategic VST và GSC cho kỳ trước (soft-fail); không đổi công thức.
- **Khác**: tuần ISO bắt đầu Thứ Hai (`MD:67`); khoa ngoài phạm vi hiện `Không áp dụng`; kỳ tính cả hai đầu (`BC:23,37`; `MD:76`). Trường ngày dùng để đưa phiên VST và GSC vào kỳ: «cần kiểm». Nguồn không ghi ai đặt: CSSD đỏ khi sự cố mỗi trạm vượt 5%, kho hóa chất 30 ngày, 20%, 14 ngày (`MD:199,351-352`).

### 3.7 Chỉ số lĩnh vực L5 Môi trường (`MD:318-374`)

- `MD:320`: danh mục chỉ số theo lĩnh vực (S2, 2026-11-02). `MD:322`: khung lĩnh vực L0 đến L6, loại nguồn A đến E và mã BM theo kho tri thức (`12-BANG-KIEM-inventory-from-KSNK-final.md` mục 8); mục nào chưa viết thì chưa có trong bảng; cột Trạng thái: `CÓ` = đã tính trong code, `ĐỀ XUẤT` = chưa có form hoặc bảng nhập, công thức chỉ để PO duyệt, không coi là SSOT.
- `MD:324`: L5 Môi trường có 22 BM (A 11 · B 8 · C 3).
- **Nguồn A** (`MD:326-340`, 11 BM, trạng thái `CÓ (chờ S3)`): dùng chung `ty_le_gsc`, mẫu số `tong_quan_sat`, 2 chữ số, RPC `rpc_dashboard_gsc_strategic_analytics`; ánh xạ `doi_tuong_giam_sat = 'MOI_TRUONG'` (migration `20261005175200`); module chứa `giam-sat-chung`; chưa đối chiếu từng mã bảng kiểm với seed (việc S3). Các mã: `KSNK.QT.10.BM.02`, `KSNK.QT.10.BM.03`, `KSNK.QT.10.BM.04`, `QT.11.BM.01`, `QT.12.BM.01`, `QT.12.BM.02`, `QT.36.BM.03`, `QT.37.BM.03`, `QĐ.14.BM.01`, `QĐ.20.BM.01`, `QĐ.21.BM.02`.
- **Nguồn B, phần kho hóa chất** (`MD:344-353`): `QT.37.BM.02` đã `CÓ` (4.7); `QT.37.BM.01` điều kiện kho là `CẦN KIỂM` (`MD:353`).
- **Nguồn B còn lại** (S4, `MD:355-364`, 6 BM: `QT.10.BM.01`, `QT.11.BM.02`, `QT.11.BM.03`, `QT.12.BM.03`, `QĐ.20.BM.02`, `QĐ.21.BM.01`) và **Nguồn C** (S5, `MD:366-372`, 3 BM: `QT.36.BM.01`, `QT.36.BM.02`, `QĐ.15.BM.02`) đều `[ĐỀ XUẤT]`: chưa có form nhập, công thức chỉ để PO duyệt. Với nguồn C, ngưỡng đạt hoặc không đạt là quyết định chuyên môn; SSOT im thì hỏi PO hoặc chuyên gia, không tự đặt (`MD:366`).
- `MD:374`: mọi chỉ số L5 không vào `ty_le_ccs`; `gsc-bk-short-long-map.ts` còn dùng cặp mã cũ; chưa viết L0 đến L4 và L6.

## 4. CSSD

Nguồn: `DO`, `18`, `QL`, `MD:194-197,242-285,291,344-353`, `roadmap:89,178`.

### 4.1 Mốc PO và ranh giới

| Ngày | Nội dung | Dòng |
|---|---|---|
| 2026-07-28 | Ngày tổng hợp tài liệu CSSD | `DO:3` |
| 2026-08-22 | PCI.03.00, QT.18 đến QT.25 | `DO:4` |
| 2026-09-04 | Phase 0 dụng cụ, D1 đến D10 | `DO:7` |
| 2026-10-10 | Thu hồi mẻ hỏng, bộ quay về `DONG_GOI`; đã thay bằng mốc 2026-11-13 | `DO:121`, `18:179` |
| 2026-10-29 | Cấm sửa số tồn hóa chất | `MD:344` |
| 2026-11-01 | K3: ghi các test còn lại | `18:246` |
| 2026-11-09 | Tách mẻ theo nhóm `-CN`, `-KCN`, `-EO` và hạn dùng bao gói (vải dệt 30 ngày, giấy hoặc vải không dệt 90 ngày) | `DO:193-194` |
| 2026-11-11 | CSSD-005: thêm mã ca mổ sau cấp phát, đã đóng | `roadmap:178` |
| 2026-11-13 | Mẻ không đạt thì xử lý lại từ đầu, bộ về `TIEP_NHAN` theo QT.20 và M05 B5.37; code và RPC chưa đổi theo, sửa ở lát L4 của KH 2026-11-13 | `18:177` |
| Còn chặn | CSSD-001: còn cần bộ con -EO không (chờ PO trả lời) | `roadmap:178` |

Ranh giới (`DO:14-24`):

- Danh mục = loại DC, bộ, thành phần, máy, hóa chất.
- Vận hành = quét QR 6 trạm, mẻ, cấp phát, kho DC (xem tồn), bảo trì, sự cố, biến động, in tem.
- Không thuộc CSSD = khoa và nhân sự, giám sát VST, GSC và NKBV (chỉ liên kết truy vết), vật tư phi hóa chất (chưa chốt).
- Ngoài phạm vi (`DO:24`): HLD, AER, Environmental toàn viện, IUSS riêng (giữ viết tắt như nguồn).

### 4.2 Sáu trạm

- Tiếp nhận → Làm sạch → QC → Đóng gói → Mẻ tiệt khuẩn (không quét trên bản đồ) → Cấp phát (`DO:73-90`). Ánh xạ PCI QT.18 đến QT.23 (`DO:94-101`).
- QC trạm (QT.19) khác QC mẻ ba cấp (QT.23: Physical, CI, BI).
- Chuyển đặc biệt (`DO:108-115`): Rewash, Quarantine_BI, Reprocess_from_start, Wet pack.

### 4.3 Vòng đời mẻ

- Trạng thái (`18:69`): `DANG_CHUAN_NAP` → `DANG_TIET_KHUAN` → `CHO_DANH_GIA_QC` → `HOAN_THANH`, hoặc rẽ sang `CHO_BI`, hoặc `QC_KHONG_DAT`; thêm `THU_HOI` (`18:183,201`).
- Nạp mẻ: máy sẵn sàng; máy hơi nước cần BD đạt hôm nay (`18:43,57-58`; phạm vi hút chân không: §8.1); bộ phải ở `DONG_GOI` (`18:50`); `Bắt đầu` khóa nạp, bộ chuyển sang `TIET_KHUAN` (`18:95`); chỉ một mẻ mở cho mỗi máy, `CHO_BI` không khóa máy (`18:165`).
- Kết thúc: kết quả vật lý, CI ngoài, CI PCD đều phải là Đạt hoặc Không đạt; thiếu thì server từ chối (`18:146`).
- Đủ Đạt và BI không bắt buộc hoặc âm → `HOAN_THANH` (`18:73,154`). BI bắt buộc (Plasma, EO, implant) mà chưa có kết quả → `CHO_BI`, bộ ở lại trạm tiệt khuẩn (`18:148,156`).
- Một mục Không đạt hoặc BI dương → `QC_KHONG_DAT` (`18:147`); BI dương sau khi đã nhả → `THU_HOI` (`18:183`).
- Cấp phát chỉ khi `HOAN_THANH`, không `CHO_BI`, không có sự cố tiệt khuẩn `OPEN` hoặc `CONFIRMED` (`18:79`).
- Mẻ hỏng: cách ly cả mẻ, máy chuyển `HOLD_QC`, tự tạo sự cố (`18:76-77,240`).
- Phiếu mẻ: mã `<mã máy>-ddMMyy-n` (`18:142`); người nạp, người dỡ, người nhả là người dùng của phiên (`18:45-49,155`); cờ implant tự bật (`18:51`); ba mục QC và BI Chưa có, Âm hoặc Dương (`18:96`).
- Vật lý theo phương pháp (`18:47`): hơi nước = nhiệt độ, áp suất, thời gian giữ; Plasma = chu trình và phiếu in từ máy; EO = nhiệt độ, thời gian, thông khí. Chuẩn thật là thông số của nhà sản xuất (`18:25`); con số `134 °C 4–18 phút` ở `18:47` chỉ là tham chiếu từ QT21. Lệch thông số thì KHÔNG ĐẠT (`18:63`). Biên dung sai: «không có trong nguồn».

### 4.4 Ngưỡng QC và BI (`18:57-64`, bảng M-10 đến M-17)

| Mục | Quy tắc nguồn ghi | Ưu tiên | Dòng |
|---|---|---|---|
| BD (M-10) | Hằng ngày cho máy hơi nước hút chân không, mẻ trống, đầu ngày, trước mẻ dụng cụ đầu tiên; nguồn ghi tham chiếu CDC 134 °C 3,5 phút, QT21 134 °C 3,5 đến 4 phút; ghi trên hồ sơ máy; không áp dụng Plasma và EO | P0 | `18:57` |
| BD hỏng (M-11) | Máy tạm giữ, chặn tạo phiếu hơi nước đến khi bảo trì xong và BD lại đạt | P0 | `18:58` |
| CI ngoài (M-12) | 100% gói, nhập một lần cho cả mẻ; một gói không đổi màu thì mẻ KHÔNG ĐẠT | P0 | `18:59` |
| CI trong PCD loại 5 (M-13) | Mỗi mẻ, đọc ngay khi kết thúc, chuyển màu hoàn toàn mới sang bước nhả; CI trong từng gói đọc tại nơi mở gói, không nhập phần mềm (ghi chú P1) | P0 | `18:60` |
| BI (M-14) | Hơi nước: ít nhất 1 lần mỗi tuần mỗi máy (CDC khuyến nghị hằng ngày nếu chạy nhiều mẻ); mọi mẻ Plasma và EO; mọi mẻ implant; BI đặt trong PCD ở vị trí khó nhất (hơi nước: dưới-trước gần van xả; Plasma và EO: tâm tải); ủ kèm ống đối chứng cùng lô; đối chứng (−) thì hủy kết quả, test lại bằng lô mới | P0 | `18:61` |
| Nhắc BI (M-15) | Plasma hoặc EO, cờ implant, hoặc máy hơi nước chưa BI trong 7 ngày | P0 | `18:62` |
| Vật lý mỗi mẻ (M-16) | Xem 4.3 | P0 | `18:63` |
| Thẩm định máy (M-17) | 3 mẻ trống liên tiếp BI và CI (và BD nếu hút chân không) đạt thì mới cho chạy mẻ dụng cụ | P1 | `18:64` |

- Lưu hồ sơ ít nhất 5 năm, P1 (`18:80`).
- Implant không nhả khẩn khi chưa có BI âm (`18:156`). Hơi nước không implant chưa có BI vẫn được nhả (`18:149`).
- Thời gian ủ và đọc tối thiểu: «không có trong nguồn»; nguồn chỉ có trường giờ ủ và giờ đọc trong sổ BM.02 (`18:215`), bắt buộc điền cả khi BI dương (`18:246`). Một ghi chú trong HANDOFF dự án nêu PO chốt 2026-11-13 (CSSD-017) tối thiểu 20 phút: chưa thấy trong `18`, «cần kiểm».

### 4.5 Thu hồi

- Rule M-23 (P0, `18:78`): BI dương sau khi đã nhả thì tự tạo sự cố tiệt khuẩn (như M-22); `CAP_PHAT` bị chặn cứng (hard-block) với mọi bộ trong phạm vi thu hồi. Danh sách thu hồi = bộ của các mẻ trong phạm vi (A hoặc B-3) có chu trình đã hoặc chưa `CAP_PHAT` và chưa `used_clinically` thì thu hồi; bộ đã `used_clinically` thì liệt kê cho KSNK đánh giá nguy cơ (không thu hồi được). Máy dừng đến khi BI lặp lại âm. Phạm vi mẻ theo A hoặc B-3; chỉ khóa mẻ hiện tại khi chọn A. Nguồn tham chiếu trong dòng: CDC-MON (positive BI, conservative approach), QT23 HD.02, L-A §7.
- BI dương đã nhả → `THU_HOI`, chưa nhả → `QC_KHONG_DAT`; `trang_thai_bi = DUONG`, `ket_qua_test = false` (không còn hiển thị Đạt) (`18:183`).
- Domain 18b, AB-3 chọn A (mọi PP): phạm vi cùng máy, sau mẻ BI âm gần nhất (mốc, không thu hồi) đến hết mẻ dương; không có mốc âm thì lấy từ đầu đến mẻ dương; không lấy mẻ chạy sau mẻ dương; mẻ khác trong cửa sổ chuyển `THU_HOI` (`18:185`).
- Bộ đã có `ma_ca_mo_id` không đổi trạm; tên bộ ghi trên phiếu sự cố (`RECALL_LISTED_USED`) và trả về cho màn mẻ; bộ chưa dùng bị thu hồi như trên (`18:187`).
- Phiếu cùng mẻ và cùng loại sự cố được cập nhật sau khi thu hồi, trong cùng transaction (`18:189`).
- `Đã dùng lâm sàng` có ít nhất 3 cách hiểu (`18:35,187,224`; thêm cờ `used_clinically` ở `18:78`): §8.1.

### 4.6 Dụng cụ

- Ba tầng Loại → Bộ → Thành phần: `cssd_dm_loai_dung_cu`, `cssd_dm_bo_dung_cu`, `cssd_dm_bo_dung_cu_chi_tiet` (`QL:3,9-13`).
- Luật: dòng chi tiết bắt buộc có `loai_dung_cu_id` (`QL:26`); một bộ × một loại chỉ một dòng active, mã D6 (`QL:27`); loại của dòng chi tiết phải khớp loại của header bộ (`QL:29`).
- Ghi master = ADMIN; vận hành chỉ xem và in tem (`QL:11-12,22`). `/cssd-su-co`: Hỏng hoặc Mất ghi sổ ngay; Chuyển `MOVE` giữa kho và bộ, giữa bộ và bộ (`QL:15`).
- Quét được `B01.SET.01` (bộ) và `BV103-CYC-…` (chu trình); `DC-0001` không quét (`QL:35-39`). Bộ không chịu nhiệt tách thành bộ riêng `parent_bo_id` (`18:34`).
- Biến động qua 3 cửa (`DO:224-231`); tồn thực tế (`DO:234-235`). Luật đóng băng 14 điều (`DO:200-215`). Mã họ bộ `B01.SET.*`, `B01.CD*`, `BO-01-*` (`DO:60-64`).
- Định mức số lượng trong bộ, tồn tối thiểu của dụng cụ, cộng hoặc trừ tồn dụng cụ: «không có trong nguồn» (tồn tối thiểu của hóa chất có ở `MD:350`).
- UI danh mục dụng cụ đã chuyển sang `cssd-erp` (AR-5a, 2026-11-10); route cũ `/quan-tri-he-thong/danh-muc/dung-cu` chuyển hướng `/cssd-dung-cu` (`roadmap:89`). Nợ 5a: bốn action CRUD và `master-crud-core` còn ở Quản trị (hướng xử lý: chuyển về `src/lib/master-data`).

### 4.7 Kho hóa chất (Nguồn B, `MD:344-353`)

Module `cssd-erp`, route `/cssd-hoa-chat`. **Tồn chỉ đổi bằng phiếu Nhập hoặc Xuất đã duyệt; cấm sửa số tồn (PO 2026-10-29); `Điều chỉnh` chỉ là hạn mức do ADMIN đặt** (`MD:344`).

| Chỉ số | Quy tắc | Hàm code | Dòng |
|---|---|---|---|
| `ton_cuoi` | `ton_dau + nhap − xuat_cap_su_dung − xuat_khac` theo mặt hàng, kỳ `[tu, den]`; dòng trước `tu` vào `ton_dau`, sau `den` bỏ; chỉ phiếu đã duyệt; phiếu xuất cũ chưa có lý do tính là `xuat_cap_su_dung`; `xuat_khac` = mọi lý do khác `CAP_SU_DUNG`; BM `KSNK.QT.37.BM.02` | `buildBaoCaoNxt` (`src/lib/domain/cssd-kho-hoa-chat-bao-cao-nxt.ts`) | `MD:348` |
| `tong_ton` | Tổng `ton_so_luong` của các lô còn lớn hơn 0 | `buildDmStockSummary` (`cssd-kho-hoa-chat-summary.ts`) | `MD:349` |
| `duoi_dinh_muc` | `tong_ton ≤ nguong_ton_toi_thieu`, chỉ khi có định mức | — | `MD:350` |
| `qua_han`, `sap_het_han` | `qua_han`: hạn gần nhất nhỏ hơn hôm nay; `sap_het_han`: còn tối đa `NEAR_EXPIRY_DAYS` = 30 ngày | `cssd-kho-hoa-chat-fefo.ts` | `MD:351` |
| `canh_bao.muc` (`OK`, `SAP_HET`, `HET_HANG`) | `HET_HANG` khi tồn ≤ 0 và đã có số liệu; `SAP_HET` khi tồn ≤ ngưỡng = `nhap_30n × ty_le_canh_bao_pct/100` (mặc định 20%), hoặc `nguong_ton_toi_thieu` khi 30 ngày chưa có nhập; hoặc khi `so_ngay_dung_duoc = tong_ton ÷ (xuat_su_dung_30n/30)` nhỏ hơn `so_ngay_cho_hang` (mặc định 14); cửa sổ 30 ngày, chỉ tính xuất có lý do Cấp sử dụng | `tinhCanhBaoTon` (`cssd-kho-hoa-chat-canh-bao-ton.ts`) | `MD:352` |

BM `KSNK.QT.37.BM.01` (điều kiện kho): chưa tìm thấy trong code ở thời điểm ghi, «cần kiểm» (`MD:353`).

### 4.8 Vai, màn hình, việc còn mở

- Vai: danh sách vai CSSD: «không có trong nguồn»; chỉ ADMIN ghi cứng loại, bộ, BOM và duyệt `BOM_PENDING` (`DO:206,227,251`); `BO_DC.edit` = duyệt phiếu (`DO:206`; lệch với ADMIN duyệt, §8.1). Quyền `approve` của hóa chất và thiết bị (AR-5d): 1.2.
- Màn hình (`DO:245-251`): `/cssd-quy-trinh`, `/cssd-erp/batch`, `/cssd-dung-cu`, `/cssd-su-co`, `/cssd-thiet-bi`, `/cssd-hoa-chat`.
- Còn mở: tổ CSSD chạy tay bộ Đóng gói thật (`18:246`); migration lên prod mà code app chưa deploy (`18:248`, ảnh chụp; đối chiếu 03 §5); chưa tìm thấy hướng dẫn BYT (`18:23`).
- PO 2026-11-17 (phiếu): đầu mối Tổ CSSD là «nhân viên tổ cssd», theo vai, chưa có tên (C1); nhập bằng máy quét QR hoặc nhập tay (C2); cần mã QR riêng cho từng thiết bị (C3); mỗi trạm do nhân viên tổ CSSD đứng, 1 đến 2 người (C4); mẻ thu hồi cần tái xử lý (`DA_TAI_XU_LY`) quay về Trạm Tiếp nhận (C6; ghi chú PO bị cắt ở «nếu dụng cụ h»); phiếu xuất hóa chất cho lập phiếu ngược, bắt buộc ghi lý do (C7, CSSD-034); tổ CSSD chạy tay «tuần sau», chưa có ngày (C8). Quy mô (C5): bộ dụng cụ «như trong database», máy tiệt khuẩn «10», mẻ mỗi ngày «khoảng 200 bộ»: cần kiểm, ô «số mẻ» ghi đơn vị «bộ».

## 5. NKBV

Nguồn: `SSOT` (v3.3, 2026-08-27; chuẩn NHSN Patient Safety Component Manual January 2025, `SSOT:4`), `roadmap:178`, `MD:13,212,218-219`.

| Khái niệm | Giá trị nguồn ghi | Dòng |
|---|---|---|
| Phạm vi | Chỉ người lớn, nhi và sơ sinh nằm ngoài domain (lệch: §8.4); gắn dụng cụ: CLABSI, CAUTI, VAE, PNEU, VAP; gắn thủ thuật: SSI; site Ch.17 và Secondary BSI | `SSOT:80,82-84,552,1043` |
| Ngoài domain | CLIP, LabID, MDRO, AUR, SIR | `SSOT:248,470,482,488` |
| IWP | 7 ngày | `SSOT:108-111` |
| DOE | Chỉ nêu dòng định nghĩa | `SSOT:117-119` |
| POA và HAI | HAI tính từ ngày lịch thứ 3 | `SSOT:123-126` |
| LOA và Transfer Rule | Chỉ nêu dòng định nghĩa | `SSOT:130-132,449` |
| Gắn dụng cụ | Dụng cụ phải có hơn 2 ngày lịch | `SSOT:157-162` |
| RIT | 14 ngày | `SSOT:136-138` |
| SBAP | Chỉ nêu dòng định nghĩa | `SSOT:143` |
| SSI | Theo dõi 30 hoặc 90 ngày | `SSOT:377-385` |
| VAE Event Period | 14 ngày | `SSOT:439-447` |
| Loại trừ | Chỉ nêu dòng định nghĩa | `SSOT:99-102,1000` |
| PATOS | Chỉ nêu dòng định nghĩa | `SSOT:398` |

- Ba lớp dữ liệu: `nkbv_fact_benh_an`, `nkbv_fact_vi_sinh`, `nkbv_fact_su_kien` (`SSOT:989-993,1282`); thêm `nkbv_fact_ba_ngay_khoa`, `nkbv_fact_ba_ngay_dung_cu` (`SSOT:992`).
- Nhập: LIS copy hoặc Excel; HIS hoặc gõ tay; không có API HIS hay LIS, không tạo phiếu từ ngày cấy (`SSOT:996,1283-1287`).
- Trạng thái phiếu: `DANG_GHI_NHAN` → `CHO_XAC_MINH` → `CHO_DUYET` → `XAC_NHAN` hoặc `LOAI_TRU` (`SSOT:1000`). Báo cáo dùng tỷ lệ thô, không SIR (`SSOT:1004,1262`).
- Chỉ số NKBV ở dashboard: `ti_le_xac_nhan_nkbv` và `clabsi_rate_per_1000` (3.3); số NKBV lấy từ aggregate action của module NKBV, không gộp CCS (`MD:13`).
- Ai làm: «không có trong nguồn»; PO 2026-11-17 (phiếu): đầu mối NKBV bỏ trống (K1); giám sát CLABSI, CAUTI, VAE, PNEU/VAP, SSI (K2); không giám sát ca nhi và sơ sinh (K3, khớp phạm vi ở bảng trên); giai đoạn thử nhập bằng sao chép từ LIS hoặc từ file Excel, PO không chọn gõ tay (K4); Hội đồng thấy danh tính, lệch P3 (K5, 1.5); mã ca không đổi (K6); 10 ca thật đối chiếu do bác sĩ tổ giám sát chọn (K7). Không có dấu PO đã chốt cho quy tắc lâm sàng nào; nhãn `[PO cần xác nhận]` chỉ được định nghĩa (`SSOT:73`). PO 2026-11-11: Hội đồng KSNK xem NKBV toàn viện (`roadmap:178`); giả định chờ PO về quyền của Hội đồng ở 1.3. Bản NHSN mới hơn January 2025 có hay không: «cần kiểm».
- Phần chưa đọc đủ: `SSOT` dòng 560 đến 658 và 709 đến 945 (tiêu chí từng site Ch.17, trừ ENDO và USI) chỉ nắm qua tiêu đề; Phụ lục E.4 cần đối chiếu trước khi sửa quy tắc lâm sàng. Khóa dự án: không viết lại engine lâm sàng; lệch chỉ số thì sửa hàm chỉ số (`CLAUDE.md`).

## 6. Quản lý công việc (QLCV)

Nguồn: `19` (v1.0 draft, Applied A 2026-09-25), `QV`, `roadmap:178`, `MD:106-107`.

- Mục đích: công việc nội bộ khoa KSNK, không điều khiển CSSD hay GSC (`19:7,8,152`). Mỗi phiếu trả lời: ai giao, ai làm, ai duyệt, việc gì, hạn, tiến độ, trạng thái, quá hạn (`19:33`).
- Thực thể (`19:39-52`): `qlcv_fact_cong_viec` (view `v_qlcv_cong_viec_full`), `qlcv_fact_cong_viec_dinh_ky`, `qlcv_fact_nhiem_vu`, view `v_qlcv_cong_viec_qua_han`, `fn_qlcv_transition`, `fn_qlcv_update_checklist`, spawn `fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay`, cron `fn_sync_overdue_tasks`. Người làm là `nguoi_phu_trach_id`, đúng 1 người. Không có cột người duyệt. `[ĐỀ XUẤT]` của nguồn: việc đề xuất dùng chung bảng, `is_active=false` và trạng thái `MOI`.
- Bảy trạng thái (`19:59`): `MOI`, `DANG_LAM`, `CHO_DUYET`, `HOAN_THANH`, `TU_CHOI`, `QUA_HAN`, `DA_HUY`.
- Bảng chuyển (`19:63-73`): tạo trực tiếp → `DANG_LAM`; việc đột xuất hoặc khẩn, đạt 100% → `CHO_DUYET` → nghiệm thu thành `HOAN_THANH` hoặc `TU_CHOI`; việc định kỳ đạt 100% tự `HOAN_THANH`; quá hạn do cron; mọi chuyển trạng thái qua `fn_qlcv_transition` và ghi `nhat_ky`.
- Chỉ nhân viên KSNK dùng QLCV (`ensureQlcvKsnkAccess`, `19:54,96`). Câu hỏi Q-01 đến Q-16 (`19:96-111`): P0, trừ Q-12, Q-13, Q-15, Q-16 là P1.
- PO 2026-10-24 (`QV:24`): QL-1 xóa mềm; ghi chú theo người tạo. `QV:55`: xóa mềm đã kiểm (hủy việc chuyển `DA_HUY`, không xóa bản ghi, `cong-viec-write.actions.ts:13`); ghi chú theo người tạo chưa tìm thấy chỗ kiểm quyền trong action, chưa chắc.
- PO 2026-11-11 (`roadmap:178`, QLCV-003): người tạo việc không tự nghiệm thu, trừ ADMIN và chủ nhiệm khoa; break-glass chỉ ADMIN hoặc CNK thật.
- `QV:64-67` (cập nhật 2026-11-13): QLCV-010 chờ PO (người đề xuất tự phê duyệt đề xuất của mình nếu có quyền duyệt); migration `20261113100000` chưa áp prod: «cần kiểm». Số trạng thái module thuộc 03.
- Ngưỡng thành công đều `[ĐỀ XUẤT]` (tạo việc dưới 30 giây).
- Không có trong nguồn: vai `chỉ huy`; quyền `APPROVE`; tần suất mẫu định kỳ (sau `TU_CHOI` đi đâu, quyền hủy và cách tính % đã được PO trả lời 2026-11-17, bảng dưới). Không có chỉ số QLCV (`MD:106-107`).

**PO trả lời phiếu hỏi 2026-11-17** (ba câu mở của `QV:59-62` và các câu QLCV khác):

| Câu hỏi | PO trả lời |
|---|---|
| Đầu mối và số người của nhóm KSNK (Q1) | Đầu mối: «admin, chủ nhiệm khoa»; số người: «toàn bộ khoa ksnk», chưa có con số |
| Công cụ giao việc hiện nay và việc quên gần nhất (Q2) | Zalo; việc quên gần nhất: «nhiều lắm», không nêu việc cụ thể |
| Cho Claude viết ba kịch bản tay và nạp dữ liệu thử (Q7) | Cho; không đổi nghiệp vụ |
| Việc bị `TU_CHOI` đi đâu (Q3) | Quay về người giao để giao lại |
| Ai được hủy việc (Q4) | Quản trị hệ thống |
| Cách tính % hoàn thành từ checklist (Q5) | Số mục đã tích chia tổng số mục |
| Người đề xuất tự duyệt việc của mình (Q6, QLCV-010) | «Chỉ trong một số trường hợp», ghi chú: admin, chủ nhiệm khoa |

Nhãn `[CẦN XÁC NHẬN]` của đầu mối ở `QV` còn nguyên: trả lời theo vai chưa đủ để tính là đầu mối có tên (03 §6).

## 7. Đào tạo (Thi KSNK)

Nguồn: `DT` (chốt 2026-09-07), `DV`, `roadmap:178`.

- Là thi trắc nghiệm KSNK và sổ kết quả, không phải hệ thống đào tạo nhân sự đầy đủ (`DT:22`). Quyền `DAO_TAO` có nhãn Thi KSNK (`DT:253`).
- Ba bảng lean (`DT:4,309`): `dao_tao_cau_hoi`, `dao_tao_cau_hinh` (`thi_thu_muc_do`, `thi_that`), `dao_tao_lan_thi`.
- Chứng chỉ không có bảng riêng, tính từ lần thi chính thức đạt và `han_chung_chi_thang` (mặc định 12, nhận 1 đến 60) (`DT:199-208`).
- Bốn loại câu: `single`, `multi`, `true_false_cluster`, `order` (`DT:117-120`).
- Mức ôn tập (`DT:88-92`): `co_ban` 10 câu 15 phút; `trung_binh` 20 câu 25 phút; `nang_cao` 40 câu 45 phút.
- Kỳ chính thức: `draft`, `published`, `closed` (`DT:84`); mở kỳ cần ít nhất 1 khoa hoặc 1 nhân viên (`DT:159`). Lần thi: `dang_lam`, `da_nop`, `het_gio` (`DT:104`).
- PO 2026-10-24 (`DT:188`, `DV:20`): nộp trễ quá 30 giây là không đạt; thi thử ẩn đáp án đến khi nộp (DT-008 đã sửa, chưa thử tay).
- PO 2026-11-17 (phiếu): thi thử dùng chung ngân hàng đề với thi thật (D5); người thi «không bao giờ thấy» đáp án đúng sau khi nộp (D6); bài nộp trễ hơn 30 giây: «không tính», ghi chú «hết thời gian thi tự đóng đề, tự tính điểm số câu đã làm» (D7). Cần kiểm, chưa chọn: D6 lệch dòng trên (thi thử ẩn đáp án đến khi nộp, tức thấy sau khi nộp); D7 lệch dòng trên (nộp trễ không đạt), lệch ghi chú của chính PO (vẫn tính điểm câu đã làm) và lệch DT-007 trong mã (nộp trễ vẫn chấm điểm, `dat=false`).
- PO 2026-11-11 (`roadmap:178`): thi thử không vượt cấu hình mức độ nhưng được thi lại (DT-002); xóa file TRUNCATE qbank (DT-001, xem 1.3).
- Quy tắc bất biến (`DT:278-288`): ba bảng lean; đáp án là id; đề đã phát là snapshot; đồng hồ máy chủ; ôn tập khác chứng chỉ; mở kỳ nghĩa là đã gán người; upsert theo `ma_cau`; Bloom chỉ để rút đề; chủ đề nhúng trên câu.
- Dữ liệu prod (ảnh chụp 2026-09-07, `DT`): 787 câu (571 chọn một, 94 chọn nhiều, 76 Đúng/Sai, 46 sắp xếp), chưa có kỳ thi chính thức; `DV:48` (2026-11-09) ghi 1 lần thi trên prod; số trạng thái đo lại ở 03.
- Đầu mối: PO 2026-11-17 (D1) ghi «admin, chủ nhiệm khoa», theo vai, chưa có tên; ra đề, mở kỳ, xem sổ điểm: chủ nhiệm khoa; phải thi: toàn bộ nhân viên bệnh viện, khoảng 2000 người mỗi năm (D2); chứng chỉ 12 tháng (D3, khớp mặc định `han_chung_chi_thang`); duyệt đáp án 787 câu: «admin, trịnh hữu nghĩa» (D4); thử tay DT-008: «nhân viên khoa ksnk», chưa có tên và ngày (D8). Ai chấm: «không có trong nguồn». Quyền xóa có trong RBAC nhưng chưa có luồng xóa (`DT:260,321`). Route: `/dao-tao`, `/dao-tao/admin/ket-qua`.

## 8. Mâu thuẫn tài liệu

Mỗi hàng: hai nguồn nói khác nhau về cùng một việc. Cột Đề xuất theo thứ tự ở §0 `[ĐỀ XUẤT]`; chưa hàng nào được PO chốt. Cột Ai chốt: `PO`; `PO + đầu mối CSSD` khi đụng quy trình thực tế; `Claude sửa tài liệu rồi PO duyệt` khi chỉ là chép sai hoặc đã cũ; `Claude đối chiếu, PO duyệt` khi cần đọc mã trước.

### 8.1 CSSD

| Chủ đề | Nguồn A | Nguồn B | Đề xuất | Ai chốt |
|---|---|---|---|---|
| Điểm quay về của mẻ hỏng | `18:177` (PO 2026-11-13): về `TIEP_NHAN`, code chưa đổi | `18:179` (PO 2026-10-10): về `DONG_GOI`, đã ghi `Đã thay`; K3 và K4 vẫn nói Đóng gói (`18:220,226,240,242,247`); AB-1 (`18:109`) | Theo mốc muộn nhất (`TIEP_NHAN`); sửa code và kịch bản sau | PO + đầu mối CSSD |
| Ghi chú chờ chọn A hoặc B | `18:9`: còn chờ đầu mối chọn A hoặc B | `18:156,185`: AB-2, AB-3, AB-6 đã chọn A; AB-4 và AB-5 chưa có dòng chốt (`18:148` chạy như AB-4 chọn A) | Sửa chép: bỏ ghi chú cũ; hỏi PO về AB-4 và AB-5 | Claude sửa tài liệu rồi PO duyệt |
| `Đã dùng lâm sàng` | Ít nhất 3 cách hiểu (`18:35,187,224`) | Cờ `used_clinically` (`18:78`) | Chốt một định nghĩa | PO + đầu mối CSSD |
| `ket_qua_test` của mẻ `THU_HOI` | `18:183`: `ket_qua_test = false` | K4 ghi `true` (`18:226,243`) | Đối chiếu code: «cần kiểm» | Claude đối chiếu, PO duyệt |
| Mã mẻ | `QL:37`: `LOT-…` | `18:142`: `<mã máy>-ddMMyy-n` | Đối chiếu code: «cần kiểm» | Claude đối chiếu, PO duyệt |
| Plasma với cellulose | `18:88`: nhắc ở mức P1 | `QL:47`: cấm | «cần kiểm» | PO + đầu mối CSSD |
| Phạm vi BD | `18:57`: máy hơi nước hút chân không | `18:161`: chỉ nói máy hơi nước | «cần kiểm» | PO + đầu mối CSSD |
| K3 dừng hay ghi tiếp | `18:240`: dừng ở test hỏng đầu tiên | `18:246` (PO 2026-11-01): ghi các test còn lại | Theo mốc muộn nhất: `18:246` | Claude sửa tài liệu rồi PO duyệt |
| Mục 6 của `18` | `18:116-125`: ảnh chụp 2026-09-18, đã cũ | — | Cập nhật hoặc ghi rõ là ảnh chụp cũ | Claude sửa tài liệu rồi PO duyệt |
| BOM | `18:86`: chỉ xuất hiện ở đây | `QL` không định nghĩa; chuẩn A′ (`QL:28`) không giải thích; chặn M-26 và tách bộ (`18:86-87`) | «cần kiểm» | PO + đầu mối CSSD |
| Trạng thái máy | `DO:164`: `HOAT_DONG` | Ba trạng thái máy ở chỗ khác không khớp; điều kiện mở `HOLD_QC` không được định nghĩa (`DO:164,176,180,212`) | «cần kiểm» | PO + đầu mối CSSD |
| Quyền duyệt phiếu | `DO:206`: `BO_DC.edit` = duyệt phiếu | `DO:227`: ADMIN duyệt | «cần kiểm» | PO |
| Backlog | `DO:255` | `DO:257` | «cần kiểm» | Claude sửa tài liệu rồi PO duyệt |
| Dải quy trình | `DO:4`: QT.18 đến QT.25 | `DO:94-101`: ánh xạ chỉ QT.18 đến QT.23 | «cần kiểm» | Claude sửa tài liệu rồi PO duyệt |

### 8.2 Dashboard

| Chủ đề | Nguồn A | Nguồn B | Đề xuất | Ai chốt |
|---|---|---|---|---|
| CCS trên bản in | `BC:33`: còn nhắc CCS | `MD:39-40`: không hiển thị CCS (deprecated), BCTH không compose CCS | Theo `MD:39-40` (mốc 2026-07-31 và 2026-08-23) | Claude sửa tài liệu rồi PO duyệt |
| CCS trong rule | `.claude/rules/dashboard.md:19,32`: còn coi CCS là bất biến (`0.5 × ty_le_vst + 0.5 × ty_le_gsc`) | `MD:39-40` | Theo `MD:39-40`; cấu hình luồng đang đóng băng nên chỉ ghi nhận, không sửa rule trong lát này | PO |
| Badge Δ trên chỉ số | `BC:19,21` và `MD:77`: có badge `Δ 2 tuần ISO` và nhãn `vs kỳ trước` trên chỉ số; `BC:19` gọi Δ là `chênh lệch %` | `MD:95` (2026-10-12): Δ là chênh lệch điểm phần trăm (`+3.4 điểm %`), không phải % tương đối; đoạn spec 2026-08-22 «một mũi tên so mục tiêu viện» đã bỏ khỏi `MD` (PO 2026-11-16) | Đơn vị theo `MD:95` (mốc muộn nhất); badge nào hiện trên thẻ: đối chiếu `ComprehensiveChiSoCards`, «cần kiểm» | Claude đối chiếu, PO duyệt |
| Màn `/` | `MD:136`: `/` chuyển hướng (redirect) | `MD:207,223,305`: nói nội dung nằm trên `/` | Đối chiếu route thật: «cần kiểm» | Claude đối chiếu, PO duyệt |
| Nguồn số NKBV | `BC:3`: BCTH compose VST, GSC và NKBV từ RPC strategic (không đọc `*_summary`) | `MD:13`: NKBV lấy qua aggregate action của module NKBV (outcome nhiễm khuẩn, không gộp CCS) | Đối chiếu code của BCTH: «cần kiểm» | Claude đối chiếu, PO duyệt |

### 8.3 VST và GSC

| Chủ đề | Nguồn A | Nguồn B | Đề xuất | Ai chốt |
|---|---|---|---|---|
| Import Excel phiên | `GS:35`: đã gỡ, pilot chỉ nhập qua form | `GS:124,144`: còn nhắc import khi khóa sổ | Theo `GS:35`; kiểm code: «cần kiểm» | Claude đối chiếu, PO duyệt |
| Số đối tượng quan sát VST | `BK:52`: tối đa 3 đối tượng mỗi phiên | `GS:99`: kịch bản chọn một người được giám sát | «cần kiểm» | PO |
| Nguồn dữ liệu bảng kiểm | `BK:3`: nguồn máy `canonical-36.md` đã gỡ khỏi repo (xem git history trước commit gỡ `docs/data`) | `BK:41-44`: bảng file vẫn liệt kê `canonical-36.md` (git history) và ba file `data/bang-kiem/*.md` làm nguồn; `docs/` không có thư mục `data` (đã `ls docs` ngày 2026-11-16) | Ghi ba dòng đó là đã gỡ; nguồn bảng kiểm hiện hành: «cần kiểm» | Claude sửa tài liệu rồi PO duyệt |
| Banner khóa sổ VST | `GS:162`: banner VST (nếu có) qua hook tương tự | `GS:143-144`: chỉ nêu banner GSC | «cần kiểm» | Claude đối chiếu, PO duyệt |
| Hiển thị điểm `TY_LE` | `BK:29`: `% · Tốt/Đạt/Không đạt` | `BK:34`: chỉ hiện % | Đối chiếu `gsc-score-display.ts`: «cần kiểm» | Claude đối chiếu, PO duyệt |
| Cặp mã BM.02 và BM.03 | `GS:60-80`: hai kiểu mã trong cùng file (`KSNK.QT.07.BM.02` và `BM.07.02`) | `MD:374`: `gsc-bk-short-long-map.ts` còn dùng cặp mã cũ | «cần kiểm» | Claude đối chiếu, PO duyệt |

### 8.4 NKBV

| Chủ đề | Nguồn A | Nguồn B | Đề xuất | Ai chốt |
|---|---|---|---|---|
| App có xử lý USI không | `SSOT:977,1031,1033`: app hiện đánh giá BJ, CNS, CVS, GI, LRI, REPR và USI người lớn; chưa EENT, SST | `SSOT:1152`: USI ở cột trạng thái ghi `Dùng (app chưa)` | Đối chiếu code NKBV: «cần kiểm» | Claude đối chiếu, PO duyệt |
| VAE hay VAP khi thở máy | `SSOT:82,255,1286`: người lớn thở máy ở khoa in-plan → VAE (Ch.10), không dùng PNEU, không mặc định VAP | `SSOT:284`: sau PNU*, thở máy xâm lấn eligible → VAP; `SSOT:185,1227`: BV103 chưa có MRP, không tuyên bố in-plan | Chưa rõ `in-plan` áp cho khoa nào của BV103: «cần kiểm» | PO |
| Cụm `Ba câu khóa` (E.9) | `SSOT:1266-1272` | Chưa rõ đã được PO duyệt | Hỏi PO | PO |
| Phạm vi tuổi | `SSOT:200,213,264,320`: tiêu đề mục ghi `mọi tuổi — BV103` (ba mục `SSOT:200,213,264` thêm chữ `dùng`) | `SSOT:80,1043`: BV103 chỉ giám sát người lớn; runtime và form không còn field nhi | Nguồn không giải thích `mọi tuổi — BV103` nghĩa gì khi chỉ giám sát người lớn: «cần kiểm» | PO |
| Tham chiếu nội bộ | `SSOT:63` (Ch.11), `SSOT:1014` (cột `Domain v3.1`) | Thiếu §4.4 và E.8 | Sửa chép | Claude sửa tài liệu rồi PO duyệt |

### 8.5 QLCV

| Chủ đề | Nguồn A | Nguồn B | Đề xuất | Ai chốt |
|---|---|---|---|---|
| Câu hỏi mỗi phiếu mở phải trả lời | `19:16`: `Sáu câu` (việc gì · ai · hạn · tiến độ · kết quả · nằm trong đâu) | `19:33`: tám ý (ai giao · ai làm · ai duyệt · việc gì · hạn · %/checklist · trạng thái · quá hạn?) | Chọn một danh sách: «cần kiểm» | Claude sửa tài liệu rồi PO duyệt |
| Trạng thái tài liệu | `19:5`: `v1.0 draft` | `19:10`: `Applied A` | Ghi một trạng thái | Claude sửa tài liệu rồi PO duyệt |
| `QUA_HAN` | `19:59`: là mã trạng thái | `19:129,143`: còn dùng như cờ | «cần kiểm» | PO |
| Cổng nghiệm thu | `19:68`: `DANG_LAM` → `CHO_DUYET` khi `DOT_XUAT` hoặc `KHAN_CAP` có checklist hoặc % = 100; ghi chú `Định kỳ vào cổng này` | `19:102` (Q-07): nghiệm thu chỉ khi đủ cổng: `CHO_DUYET`, hoặc đang làm hoặc `QUA_HAN` ở mức 100% | Theo quyết định PO 2026-11-11 (QLCV-003) cho phần ai được nghiệm thu; phần còn lại «cần kiểm» | PO |

### 8.6 Đào tạo

| Chủ đề | Nguồn A | Nguồn B | Đề xuất | Ai chốt |
|---|---|---|---|---|
| Nộp muộn | `DT:188` (PO 2026-10-24): thi thật nộp quá ân hạn 30 giây → `het_gio`, `dat=false` | `DT:324` (mục lệch còn lại): nộp muộn vẫn được chấm và vẫn có thể Đạt; `DT:203`: chứng chỉ lấy lần thi chính thức đạt, đã nộp (`da_nop` hoặc `het_gio`) | Theo `DT:188` (mốc PO); code đang theo cách nào: «cần kiểm» | Claude đối chiếu, PO duyệt |
| Quyền xem bài và sổ kết quả | `DT:189`: Quản trị (`DAO_TAO` xem) xem được bài đã nộp của người khác | `DT:257`: quyền xem gồm vào cổng, ôn tập, làm bài, xem bài mình | «cần kiểm» | PO |
| Đếm lượt thi | `DT:320`: nút `còn lượt` trên danh sách kỳ chỉ đếm bài đã nộp | `DT:320`: lúc bắt đầu còn đếm cả bài đang làm, nên có thể thấy `còn lượt` nhưng vào thi báo hết lượt (nguồn ghi là lệch còn lại, `DT:318-324`) | Hai chỗ đếm cùng một cách; cách nào: «cần kiểm» | PO |
| Họ tên và khoa | `DT:102,298`: người thi tự kê | `DT:156-157,274`: lấy từ MDM | Theo MDM; kiểm code: «cần kiểm» | Claude đối chiếu, PO duyệt |
| Số kỳ và lần thi trên prod | `DT` (ảnh chụp 2026-09-07): chưa có kỳ thi chính thức | `DV:48` (2026-11-09): 1 lần thi | Khác ngày chụp, chưa chắc là mâu thuẫn; đo lại ở 03 | — |

### 8.7 Quy trình và tài liệu

| Chủ đề | Nguồn A | Nguồn B | Đề xuất | Ai chốt |
|---|---|---|---|---|
| Nơi sửa BOM | `mdm:21`: `/quan-tri-he-thong/danh-muc/dung-cu?tab=bo`; `mdm:3`: CRUD master CSSD tại Quản trị | `roadmap:89` (AR-5a, 2026-11-10): UI loại, bộ, BOM chuyển sang `cssd-erp`; route cũ chuyển hướng `/cssd-dung-cu` | Theo `roadmap:89` | Claude sửa `mdm`, PO duyệt |
| `npm run impact` | `chay-lien-tuc.md` dẫn `npm run impact` | Nhánh `integrate/2026-11` chưa có script (có từ `330eeb7d` trên `origin/main`, 03 §3.1) | Có sau khi nhánh gộp `origin/main` | PO |
| Hỏi PO khi SSOT lâm sàng im | `CLAUDE.md`: SSOT lâm sàng im thì hỏi PO | `chay-lien-tuc.md`: không hỏi | Theo `CLAUDE.md` (cấp cao hơn) | PO |
| Thêm module | `KE_HOACH_TONG_THE_PHAT_TRIEN_KSNK.md:8,56`: không thêm module | `CLAUDE.md`: mục tiêu triển khai tất cả module (ghi PO 2026-10-12) | Chỉ đạo mới thắng; ngày chính xác của chỉ đạo: «cần kiểm» | PO |
| Đếm việc mở | `scripts/readiness/so-loi.mjs:21,127,136`: `check` tính CHO_PO là việc mở và đòi HANDOFF tối đa 6000 byte | Việc mở đo bằng `stats` (03 §3.3, lệnh C17) | Dùng `stats` | PO |

Khác:

- `RA_SOAT_LO_HONG_2026-11-10.md` là bản nháp: không dùng làm nguồn chuẩn.
- KH 2026-11-14 có mục `Tự kiểm` 11 mục, mới nêu 5 mục: «cần kiểm».
- `.claude/rules/mdm.md` lỗi thời (`roadmap:91`, mục 4); `mdm` còn nêu đường dẫn `quan-tri-he-thong/...` trong khi AR-8 đã chuyển danh mục sang `/to-chuc` và từng module (`roadmap:92`): «cần kiểm».

### 8.8 Kho tri thức ngoài repo

Nguồn: `.claude/plans/KH_APPKSNK_20261114_doi-chieu-nguon-va-mo-rong.md` mục 5. Kho này là bản nháp; app chưa truy vết mã R và T của M01 đến M15. Không nêu số kiểm kê ở đây. Các điểm kế hoạch đó đánh dấu cần đối chiếu (chưa kiểm, «cần kiểm»):

- Dấu `[CẦN XÁC MINH]` bị gỡ khi chưa có nguồn.
- QT.20: giá trị tải tối đa 75% và khoảng trống 2 đến 5 cm cần đối chiếu nguồn gốc.
- QĐ.06: ghi `01 người`.
- Thời hạn lưu `Tối thiểu 05/03 năm` (khoảng 145 dòng) chưa có căn cứ pháp lý; không tự dẫn văn bản pháp lý.
- QĐ.15 BM.03: 03 năm hay 05 năm.
- Thẻ HIỆN HÀNH trên tài liệu chưa ký.
- Thiếu BM của QT.26 và QT.37; BM trùng.

**Đã loại sau khi đọc lại nguồn (không phải mâu thuẫn)**: mẫu mỏng 20 và 30 (hai ngưỡng cho VST và GSC, khớp nhau, 2.4); BM.02 và BM.03 ở `MD:95` (QT.07, vệ sinh tay) khác `KSNK.QT.10.BM.02` và `KSNK.QT.10.BM.03` ở `MD:330-331` (QT.10, bảng kiểm môi trường).

## 9. Bảng, RPC, route chính

| Nhóm | Bảng hoặc view | RPC hoặc hàm | Route |
|---|---|---|---|
| Nền, MDM, RBAC | `mdm_*`, `mdm_nhan_su`, `sys_lookup_value`, `sys_mdm_registry`, `sys_role_permissions`, `sys_module_locks` | `rpc_assign_staff_ksnk_role`, `fn_cssd_dm_approve_guard`, `fn_assert_vst_gsc_not_locked` | `/to-chuc`, `/quan-tri-he-thong/...` |
| VST, GSC, Dashboard | `gstt_fact_vst`, `gstt_dm_bang_kiem` | `fn_vst_is_valid_opportunity`, `rpc_dashboard_vst_strategic_analytics`, `rpc_dashboard_gsc_strategic_analytics`, `rpc_gsc_tgs_session_hits` | `/giam-sat-vst`, `/giam-sat-chung`, `/thong-ke/vst`, `/thong-ke/gsc`, `/lich-su/vst`, `/lich-su/gsc`, `/bao-cao-tong-hop` |
| CSSD | `cssd_dm_*`, `cssd_fact_quy_trinh`, `cssd_fact_lo_tiet_khuan`, `cssd_fact_su_co`, `cssd_fact_kho_giao_dich`, `cssd_fact_kho_hoa_chat_giao_dich`, `cssd_fact_bao_tri`, view `v_cssd_bo_dung_cu_chi_tiet_realtime` | `buildBaoCaoNxt`, `buildDmStockSummary`, `tinhCanhBaoTon` (hàm TS, 4.7) | `/cssd-quy-trinh`, `/cssd-erp/batch`, `/cssd-dung-cu`, `/cssd-su-co`, `/cssd-thiet-bi`, `/cssd-hoa-chat` |
| NKBV | `nkbv_fact_*` | — | `/giam-sat-nkbv/...` |
| QLCV | `qlcv_fact_*`, `v_qlcv_cong_viec_full`, `v_qlcv_cong_viec_qua_han` | `fn_qlcv_transition`, `fn_qlcv_update_checklist`, `fn_sync_overdue_tasks` | `/quan-ly-cong-viec` |
| Đào tạo | `dao_tao_cau_hoi`, `dao_tao_cau_hinh`, `dao_tao_lan_thi` | — | `/dao-tao`, `/dao-tao/admin/ket-qua` |
