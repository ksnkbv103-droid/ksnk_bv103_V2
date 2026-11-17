# Báo cáo nền móng: nguồn tri thức → quy trình → đặc tả → lược đồ → app

Ngày 2026-11-13. Nối tiếp [`BAO-CAO-TONG-THE-2026-11-13.md`](BAO-CAO-TONG-THE-2026-11-13.md) (báo cáo đó xét từng module; báo cáo này xét lớp dưới nó). Chỉ đọc, không sửa code, không đụng prod. Mọi số dưới đây đo trong phiên này bằng lệnh; chỗ nào chưa đo ghi ở §9.

Hai kho được xét: app `ksnk_bv103` (nhánh `integrate/2026-11`) và kho tri thức `~/Desktop/KSNK_BENH_VIEN_103` (gọi tắt «kho KSNK»).

## 0. Kết luận

1. **Nhận định của PO đúng, và có số đo.** Chuỗi đúng (nguồn → quy trình → đặc tả → ca kiểm thử) **đã được dựng** ở kho KSNK, nhưng app **không nối vào nó**: 0 file trong `src/`, `docs/`, `supabase/migrations/` tham chiếu một mã quy tắc nào của đặc tả.
2. **Thứ tự thực tế bị ngược.** App được viết trước; đặc tả M01–M15 viết sau; bản đối chiếu hai bên (2026-11-07) mới ở cấp tên bảng và vẫn là «bản nháp đợi duyệt».
3. **Bản thân nền cũng chưa đông cứng.** Đặc tả còn 520 nhãn «CẦN XÁC MINH» và 192 chỗ «giả định»; 175 file quy trình đang sửa dở chưa commit.
4. **Hậu quả đã xảy ra thật**, không phải lý thuyết: có quyết định đã khóa trong app trái với quy trình đang hiện hành (§2.1).
5. **Công cụ nhiều nhưng đo sai thứ.** Khoảng 40 lệnh kiểm/cổng đều trả lời «code có chạy không»; không lệnh nào trả lời «code có đúng quy trình không».
6. **Không cần dừng toàn bộ để làm lại nền.** Cần một cổng: module nào sắp triển khai thì phải qua đủ 6 tầng ở §4 trước khi viết thêm dòng code nào; module đang dùng thật (VST/GSC) thì truy vết ngược.

## 1. Số đo lớp nền

| Tầng | Ở đâu | Đo được | Tình trạng |
|---|---|---|---|
| Quy trình, quy định, biểu mẫu | kho KSNK `03_QUY_TRINH_BENH_VIEN/` | 138 file gắn nhãn `[HIỆN HÀNH]` | 175 file đang sửa, chưa commit |
| Đặc tả số hóa | kho KSNK `09_DOMAIN_PHAN_MEM/02_DAC_TA/` | 15 module, 870 KB; `kiem_domain.py`: bước B=760, quy tắc R=685, số liệu K=295, ca kiểm thử T=487; 0 lỗi cấu trúc | 520 nhãn «CẦN XÁC MINH», 192 «giả định»; mục 12 các module còn khoảng 310 dòng chờ người quyết |
| Đối chiếu đặc tả với app | kho KSNK `05_DOI_CHIEU_PROJECT/` | 1 file, lập 2026-11-07 | nháp; so tên thực thể với 66 bảng, chưa so từng R, từng K |
| Tài liệu nghiệp vụ của app | app `docs/modules/` | 37 file | tự viết song song, dẫn mã QT nhưng không dẫn mã M/R |
| Code | app `src/`, `supabase/migrations/` | 430 file test | **0 file** tham chiếu mã R/TH/T/XM; không test nào sinh từ 487 ca T |

Đọc bảng: tầng trên cùng và tầng dưới cùng đều dày, nhưng **giữa hai tầng không có dây nối**. Mỗi bên tự đúng theo cách của mình.

## 2. Ba bằng chứng «xây trên cát»

### 2.1 Mẻ tiệt khuẩn không đạt: app khóa trái với quy trình hiện hành

| Nguồn | Nói gì |
|---|---|
| KSNK.QT.20 `[HIỆN HÀNH]`, dòng 95 | «Đình chỉ cấp phát, cách ly và xử lý lại từ đầu (coi như dụng cụ bẩn) mọi mẻ bị ướt, rách bao bì, máy báo lỗi hoặc BI/CI không đạt» |
| Đặc tả M05, bước B5.37 | lô về M04 «làm sạch, đóng gói lại, tiệt khuẩn mẻ mới (coi như dụng cụ bẩn)», dẫn QT.20 §V.1 |
| App `docs/modules/cssd/18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md`, dòng 177 | «PO chốt lại 2026-10-10»: mẻ hỏng → bộ còn trong CSSD **về `DONG_GOI`** (đóng gói + tiệt khuẩn lại), tức bỏ bước làm sạch |

Hai văn bản cùng do một khoa ban hành nói hai điều khác nhau, và phần mềm đang làm theo bản không phải quy trình. Một trong hai phải sửa. Đây là quyết định lâm sàng của PO (§8 câu 2); báo cáo không chọn thay.

### 2.2 Ngưỡng VST: chưa ai chốt nhưng đã thành hằng số có test khóa

| Mục | Đặc tả M01 | App |
|---|---|---|
| Mục tiêu tuân thủ | R1.12: mặc định 85, lộ trình 90; mục XM-1 còn mở: «mục tiêu năm 2026 là 85% hay 90%?» | `src/lib/analytics/supervision-thresholds.ts`: `GREEN_MIN: 85`, biểu đồ khoa `warnPct: 90, redPct: 85`; file `.spec.ts` kiểm đúng hai con số này |
| Mẫu tối thiểu | R1.14: dưới 100 cơ hội/khoa/tháng thì «mẫu không đủ», không xếp hạng (dẫn QT.32 §V.3) | `VST_COMPARE_MIN_SAMPLE = 20` |

Test của app đang bảo vệ một con số mà chính khoa chưa quyết. Sửa số sau này sẽ phải sửa cả test, dashboard và lời giải thích cho người dùng.

### 2.3 Quy tắc có trong đặc tả, chưa thấy trong code VST (module đang dùng thật)

Tìm theo từ khóa trong `src/modules/giam-sat-vst` và migration, không thấy dấu vết của:

- R1.03: từ chối nhập bù sau 24 giờ.
- R1.10: đủ thời gian chà (cồn ≥ 20 giây, nước ≥ 40 giây).
- R1.11: chỉ tính cơ hội thuộc phiên đã xác nhận hoặc đã khóa.
- R1.15: ẩn tỷ lệ ở ô có mẫu số dưới 10 để bảo vệ danh tính.

Đây là tìm theo từ khóa nên chỉ kết luận «chưa thấy», không kết luận «không có» (§9). Điểm cần nói là: **hiện không có cách nào trả lời câu «app đã cài bao nhiêu trong 40 quy tắc của M01» ngoài đọc tay.**

Các lệch đã ghi ở chỗ khác, không lặp lại: đánh số QT.06/QT.07, hai nguồn công thức RPC và TS, 5 điểm NHSN của NKBV (báo cáo tổng thể §3.3), `target_roles` Đào tạo.

## 3. Các luồng làm việc thiếu thông minh

| # | Luồng hiện tại | Vì sao sai | Dấu vết |
|---|---|---|---|
| 1 | Viết code → viết tài liệu app → viết đặc tả → đối chiếu ngược | Đặc tả thành biên bản mô tả lại, không phải bản giao việc | bản đối chiếu lập 2026-11-07, sau khi app đã có 66 bảng |
| 2 | Quyết định của PO ghi ở nhiều nơi | Không biết bản nào thắng; quyết định trong app không quay về sửa QT | «Khóa PO» trong `CLAUDE.md`, «PO chốt» trong `docs/modules`, roadmap §5, mục 12 của từng M, `HANDOFF_KSNK_DOMAIN.md` |
| 3 | Mục «cần xác minh» không có người chịu trách nhiệm và hạn | Tồn vô hạn; code vẫn đi tiếp trên giả định | 520 nhãn, khoảng 310 dòng ở mục 12 |
| 4 | Rà soát app lặp lại | Mỗi vòng ra một báo cáo, nền không đổi nên kết luận không đổi | 4 báo cáo ở gốc repo trong 9 ngày (05/11, 06/11, hai bản 13/11) |
| 5 | Sửa quy trình và viết code song song, không khóa phiên bản | Code bám vào câu chữ có thể đã đổi | 175 file QT chưa commit trong khi app dẫn mã QT |
| 6 | Chỉ chạy trên máy | Không có phản hồi từ người dùng thật để sửa quy trình | khoảng 385 commit và 32 migration chưa lên prod (báo cáo tổng thể §1) |
| 7 | Kiểm thử viết theo code | Test xác nhận «code làm đúng điều code làm» | 430 file test, 0 dẫn ca T |

## 4. Thứ tự đúng

Sáu tầng, mỗi tầng có một sản phẩm và một cổng. Không qua cổng thì tầng dưới không được bắt đầu.

| Tầng | Sản phẩm | Cổng sang tầng kế |
|---|---|---|
| T0 Nguồn | văn bản pháp quy, hướng dẫn chuyên môn, sách (kho `01_KHO_TRI_THUC`) | mỗi câu trong QT dẫn được về nguồn |
| T1 Quy trình | QT, QĐ, HD, BM, bài giảng đã ban hành, **đã commit** | file có phiên bản; không còn «CẦN XÁC MINH» trong phần sẽ số hóa |
| T2 Sổ quyết định | một sổ duy nhất: mỗi dòng = câu hỏi, phương án, người quyết, ngày, nguồn, thay thế dòng nào | mọi XM của module đang làm đã có dòng «đã chốt» hoặc «chấp nhận tạm, giá trị X» |
| T3 Đặc tả | M0x với mã B/R/TH/T; mỗi R dẫn về câu QT | `kiem_domain.py` sạch; phản biện độc lập một vòng |
| T4 Lược đồ và tham số | migration; bảng tham số có cột nguồn, giá trị chưa chốt để NULL | mỗi bảng, cột dẫn về thực thể ở §3 của M |
| T5 Code và test | action, RPC, UI; test sinh từ ca T | mỗi R «chặn» có ít nhất một test dẫn mã; bảng độ phủ không có mã lạ |
| T6 Dùng thật | người dùng, số đo, ý kiến | ý kiến quay về T1 hoặc T2, **không sửa thẳng ở T5** |

Ba luật đi kèm:

1. **Không có mã R thì không viết quy tắc vào code.** Cần quy tắc mới thì thêm vào đặc tả trước, kể cả khi chỉ mất năm phút.
2. **R còn XM mở thì chỉ được cài dưới dạng tham số**, không được thành hằng số, không được viết test khóa giá trị.
3. **Sửa QT thì R bị đánh dấu nghi ngờ** cho đến khi có người xem lại; test dẫn R đó hiện cảnh báo.

Áp dụng theo hàng đợi module của PO, không làm lại tất cả một lúc:

| Module | Việc ở lớp nền |
|---|---|
| VST/GSC (đang dùng thật) | Truy vết ngược: gắn mã R vào code hiện có; lập danh sách R chưa cài; chốt XM-1, R1.14 |
| CSSD (kế tiếp) | **Dừng viết thêm** cho đến khi chốt §2.1 và các xung đột M04–M06 trong `HANDOFF_KSNK_DOMAIN.md`; sau đó đi đủ T2 → T5 |
| NKBV | Chốt bộ định nghĩa NHSN năm nào (câu hỏi trong `BAO-CAO-DOI-CHIEU-NHSN2026.md`) trước khi sửa 5 điểm |
| QLCV, Đào tạo | Chưa đụng; khi tới lượt thì bắt đầu từ T1 |

## 5. Công cụ: đo và đề xuất

| Nhóm | Đo được | Nhận xét |
|---|---|---|
| Lệnh npm | 120 (mdm 15, verify 12, trial 11, pilot 8, test 7…) | khoảng 40 lệnh là kiểm/cổng/audit/precheck; phần lớn có cặp `:local` |
| File script | 113 trong `scripts/`; 60 file Python ở kho KSNK | hai bộ công cụ không biết nhau |
| Cấu hình agent | app: 9 agent, 11 lệnh, 11 rule, 4 skill, 2 hook; toàn cục: 5 agent, 5 rule, 6 skill, 8 hook; kho KSNK: 12 agent, 8 lệnh | ba nơi, nhiều vai trùng (rà soát, chạy kiểm, đọc tài liệu) |
| Tài liệu điều phối | `docs/core` 13 file, 200 KB; riêng roadmap 66 KB; 9 file `.md` ở gốc | roadmap quá lớn để là «việc kế tiếp»; `HANDOFF_APPKSNK.md` đã chạm trần 6000 byte |
| Git | 5 worktree, 30 nhánh | dễ làm nhầm cây (phiên này cũng mở ở nhánh cũ) |

Vấn đề gốc không phải số lượng mà là **hướng đo**: toàn bộ công cụ app kiểm tính nhất quán nội bộ (kiểu, lint, tên bảng, liên kết tài liệu). `kiem_domain.py` kiểm cấu trúc đặc tả. Không công cụ nào đi **xuyên** hai kho.

Đề xuất (chưa làm; cần PO đồng ý vì chạm nhiều file ngoài phạm vi):

| Việc | Cụ thể |
|---|---|
| Thêm đúng một công cụ còn thiếu | `trace`: xem §6 dòng 1 |
| Gộp | các lệnh precheck/gate/audit theo module về một lệnh `gate -- <module>`; cặp `:local` thành cờ |
| Giữ làm lệnh hằng ngày | `dev`, `verify:changed`, `verify`, `impact`, `module:gate` |
| Một sổ quyết định | đặt ở kho KSNK; `CLAUDE.md` và `docs/modules` chỉ trỏ tới, không chép lại |
| Dừng | viết thêm báo cáo rà soát; báo cáo này là bản cuối của loạt, việc tiếp theo ghi vào roadmap |
| Không tự xóa | script, agent trùng: lập danh sách, PO duyệt rồi mới bỏ |

## 6. Học từ GitHub (học cách làm, không cài)

Tìm bằng từ khóa chung, không gửi tên dự án hay dữ liệu ra ngoài.

| Repo | Ý đáng học | Tùy biến cho ta |
|---|---|---|
| `awslabs/duvet` | Chú thích ngay trong code trỏ tới mục đặc tả kèm câu trích; lệnh `report` ra độ phủ hai chiều (yêu cầu nào chưa có code, code nào không có yêu cầu) | Script nhỏ `trace`: quét chú thích dạng `@qt M05:R5.28` trong `src/` và migration, đối chiếu với danh sách mã do `kiem_domain.py` xuất; in bảng độ phủ theo module; CI báo lỗi khi mã không tồn tại |
| `strictdoc-project/strictdoc`, `useblocks/sphinx-needs`, Doorstop | Mỗi yêu cầu là một bản ghi có ID, cha, trạng thái; khi cha đổi thì con bị đánh dấu «nghi ngờ» | Thêm cho mỗi R hai trường: trạng thái (`CHOT`/`XM`) và dấu vân tay câu QT nguồn; QT đổi thì R tự chuyển nghi ngờ (luật 3 ở §4) |
| `Fission-AI/OpenSpec` | Mỗi thay đổi là một thư mục gồm lý do, phần chênh của đặc tả, danh sách việc; đặc tả gốc chỉ đổi khi thay đổi được đóng | Thay bộ intake + plan + ghi roadmap hiện nay bằng một thư mục cho mỗi lát; phần chênh ghi vào M0x khi lát xong |
| `joshrotenberg/adrs` (mẫu sổ quyết định kiến trúc) | Quyết định đánh số, không sửa, chỉ «thay thế bởi» | Mẫu cho sổ quyết định ở T2 |
| `HL7/nhsn-dqm`, `CDCgov/nhsnlink` | Định nghĩa giám sát NHSN ở dạng máy đọc được | Nguồn đối chiếu khi viết ca kiểm thử NKBV; không dùng engine của họ. Chưa đọc nội dung (§9) |
| `CDCgov/Statistical-Comparison-Functions-using-SAS-R-Python` | Hàm thống kê tham chiếu cho dịch tễ | Test đối chiếu công thức SIR, so sánh tỷ lệ. Chưa đọc nội dung (§9) |

Không có gì đáng học: các repo về giám sát vệ sinh tay và theo dõi tiệt khuẩn (0–5 sao, không bảo trì). Các bộ hook cho Claude Code: ta đã có tương đương, thêm nữa là làm nặng mục §5.

## 7. Việc làm ngay, theo thứ tự

1. PO trả lời 5 câu ở §8.
2. Commit 175 file quy trình đang dở ở kho KSNK (hoặc bỏ thay đổi), để T1 có phiên bản.
3. Lập sổ quyết định; chuyển vào đó các «Khóa PO» và các XM của M01, M02, M04, M05.
4. Viết `trace` và gắn mã R cho module VST; ra bảng «đã cài / chưa cài / lệch» cho 40 quy tắc M01.
5. Chuyển ngưỡng VST thành tham số có nguồn.
6. Làm lại bước 3–4 cho CSSD trước khi viết thêm tính năng CSSD.

## 8. Cần PO quyết

1. Đặc tả M01–M15 ở kho KSNK là **nguồn yêu cầu duy nhất** của app; `docs/modules` chỉ còn là bản ánh xạ kỹ thuật?
2. Mẻ không đạt: giữ QT.20 (làm sạch lại từ đầu) và sửa app, hay giữ quyết định 2026-10-10 (về đóng gói) và sửa QT.20?
3. VST: mục tiêu 2026 là 85 hay 90; mẫu tối thiểu để xếp hạng là 100 hay 20?
4. Ai đóng các mục «cần xác minh» và trong bao lâu?
5. Cho phép gộp lệnh và dọn công cụ như §5?

## 9. Chưa kiểm

- §2.3 tìm theo từ khóa; quy tắc có thể được cài dưới tên khác.
- Chưa đếm lệch ở cấp từng R cho M02–M06; mới có ba mẫu ở §2.
- Chưa đọc nội dung các repo ở §6 ngoài README của duvet, OpenSpec.
- Chưa đo prod trong phiên này. MCP `github`, `supabase`, `vercel` cần PO cấp quyền bằng `/mcp`; không cần cài thêm MCP nào khác.
- Chưa có phản biện độc lập cho báo cáo này.
