# KH_APPKSNK_20261113 — Dựng lại app theo đặc tả M01–M15 (một lần duyệt)

Trạng thái: PO ĐÃ DUYỆT 2026-11-13 (trả lời ở §6). Xong: L0, L1, L3b phần độ dài lý do, L2a (bảng `ksnk_dm_tham_so` + `fn_ksnk_tham_so` trên DB local, seed khớp mã, chưa lên prod). L2b (2026-11-14: root layout đọc `ksnk_dm_tham_so` mỗi request → `applyThamSo` đặt ngưỡng cho mọi màn hình VST/GSC/BCTH; kiểm tay trên local: thêm dòng 93/77 → màn hình đổi, xóa → về 90/80). L3b-2a (2026-11-14: XÓA muộn phiên VST qua yêu cầu chờ duyệt — bảng `gstt_fact_vst_yeu_cau_dieu_chinh`, quyền `GIAM_SAT_VST.approve` cho ADMIN + CHU_NHIEM_KHOA, khối duyệt trên màn Phê duyệt; migration `20261114110000` MỚI Ở LOCAL, chưa lên prod; kiểm tay local: duyệt → yêu cầu `DA_DUYET`, phiên `is_active=false`). Giả định chờ PO xác nhận: «đã xác nhận» = quá 30 phút từ lúc tạo phiên; ADMIN vẫn xóa trực tiếp; người gửi yêu cầu = chủ phiên hoặc NHAN_VIEN_KSNK/CHU_NHIEM_KHOA; không tự duyệt yêu cầu của mình (trừ ADMIN); chưa tài khoản thật nào có vai trò CHU_NHIEM_KHOA (gán là cổng PO). L3b-2b (2026-11-14: SỬA muộn phiên VST qua yêu cầu `SUA`, nội dung đề nghị lưu ở `payload`, duyệt thì áp bằng RPC lưu phiên + nhật ký `VST_EDIT_SESSION_AFTER_WINDOW` có trước/sau; không cần migration mới; kiểm tay local: chủ phiên quá 30 phút lưu với lý do → 1 yêu cầu `SUA`/`CHO_DUYET`, phiên chưa đổi; bước DUYỆT trên giao diện CHƯA kiểm tay, chỉ có test đơn vị 3 ca). Giới hạn: chỉ CHỦ phiên gửi yêu cầu sửa (người khác sửa muộn vẫn chỉ ADMIN); người duyệt chưa thấy diff trước/sau (chỉ nhật ký có); duyệt ghi đè chỉnh sửa Admin xen giữa. Đã sửa kèm: `findActiveVstObservations` lọc cột `is_active` không tồn tại (lỗi 42703 khi sửa phiên có sẵn) — có test. L4a (2026-11-14: bảng `cssd_dm_me_chuyen_tiep` 20 cặp từ→đến của `trang_thai_me` lấy từ RPC thật + trigger chặn chuyển ngoài bảng/chuyển về NULL; migration `20261114120000` MỚI Ở LOCAL, chưa lên prod; test `scripts/sql/kiem-cssd-me-chuyen-tiep.sql` 4 ca PASS, vitest cssd-erp 50 file/273 test pass, happy path + BI dương qua). 10/20 cặp TRÁI ĐẶC TẢ M05 §4.1 nhưng code đang dùng (`rpc_cssd_me_thu_hoi` không kiểm trạng thái mẻ gốc, ghi THU_HOI/QC_KHONG_DAT từ mọi trạng thái; THU_HOI→QC_KHONG_DAT là chuyển ngược): để cho phép + ghi chú, siết ở L4b cùng câu «xử lý lại từ đầu». Chưa có: NGAT/HUY/CHO_DUYET/DA_TAI_XU_LY, trạng thái lô S_LO, RPC chuyển trạng thái duy nhất. Prod: chạy SQL kiểm ở cuối migration trước khi apply. Kế: L4b (siết 10 cặp trái + thu hồi kiểm trạng thái) hoặc phần còn lại L2. Còn lại của L2: ngưỡng trong SQL (`fn_vst_*`, view KPI) chưa đọc `fn_ksnk_tham_so`; server action chạy ngoài layout dùng giá trị áp gần nhất của tiến trình; chưa có màn hình quản trị thêm tham số (thêm bằng SQL). Ghi chú: `fetchMucTieuKpiVien` (đọc `ksnk_dm_muc_tieu_kpi`) hiện không nơi nào gọi; R1.14 nêu mẫu tối thiểu 100/tháng, app đang 20 (XM-2 mở, chưa đổi).
Nguồn: `~/Desktop/KSNK_BENH_VIEN_103/09_DOMAIN_PHAN_MEM` (đặc tả, LOI_20_80), `BAO-CAO-NEN-MONG-2026-11-13.md`, số đo dưới đây.

## 1. Yêu cầu PO (sổ gom, mỗi dòng có tiêu chí đo)

| Mã | Yêu cầu | Tiêu chí đo |
|---|---|---|
| YC1 | Đi đúng thứ tự: nguồn → quy trình → đặc tả → lược đồ → code | Mỗi quy tắc nghiệp vụ trong code dẫn một mã R; `npm run trace` không có mã lạ |
| YC2 | Số liệu bảo vệ được | Mỗi chỉ số Tầng 1 có ≥1 test lấy từ ca T của đặc tả, pass |
| YC3 | Đủ module, thứ tự VST/GSC → CSSD → NKBV → QLCV → Đào tạo | Module «xong» = R áp dụng được có dẫn ≥ 80%, ≥3 kịch bản tay đạt |
| YC4 | Thống nhất, đỡ tốn tài nguyên | Một cách viết quy tắc, một bảng tham số, một lệnh kiểm; số script npm giảm từ 120 xuống ≤ 40 |
| YC5 | Tự chạy, tự soát, tự sửa | Một lệnh (`verify:changed`) chạy trace + test + sổ lỗi; lỗi lặp lần 2 thành luật máy |
| YC6 | Không sửa đi sửa lại | Thay đổi quy tắc bắt đầu ở đặc tả; code không có mã R thì bị chặn ở kiểm |

## 2. Số đo hiện tại (2026-11-13)

`npm run trace`: 0/685 quy tắc R và 0/424 ca T được code dẫn mã (trước khi gắn mã đầu tiên).

| Module app | Cỡ | Người dùng thật | Đặc tả | Đã cài / Lệch / Chưa cài / Không áp dụng / Chưa rõ |
|---|---|---|---|---|
| giam-sat-vst | 69 file, 6.680 dòng | Có (33 nghìn hàng) | M01, 40 R | 3 / 7 / 15 / 10 / 5 |
| giam-sat-chung | 113 file, 13.444 dòng | Có | M02, 41 R | 3 / 5 / 14 / 12 / 7 |
| cssd-erp + cssd-su-co | 346 file, 47.973 dòng | Chưa | M04+M05, 89 quy tắc «chặn» | ~12 / ~8 / 35–45 / — / còn lại |
| giam-sat-nkbv | 280 file, 61.675 dòng | Chưa | M03, 60 R, 0 ca T | chưa đo |
| quan-ly-cong-viec | 119 file, 15.588 dòng | Chưa | M09 (một phần) | chưa đo |
| dao-tao | 29 file, 5.918 dòng | Chưa | M10 (một phần) | chưa đo |

Số của VST/GSC/CSSD do agent chỉ đọc đếm bằng grep chọn lọc, chưa đọc hết code; coi là ước lượng, lát L1/L3 sẽ đo lại bằng `trace`.

CSSD: không máy trạng thái nào của app khớp đặc tả. Thiếu: thu hồi lùi về mẻ BI âm gần nhất (R5.29), mẻ bị ngắt (R5.46/47), biệt trữ gói mượn/implant (R4.30/73/74), cờ giữ, nhánh khử khuẩn mức cao, người duyệt khác người vận hành (R5.24). Thừa so với đặc tả: đề nghị danh mục, đối soát thành phần bộ, tách nhiệt, khóa bộ, sổ cái tài sản, cảnh báo đỏ.

## 3. Phán quyết từng module

| Module | Phán quyết | Lý do |
|---|---|---|
| VST | GIỮ, truy vết ngược + sửa lệch | Có dữ liệu thật; lõi KPI đúng (R1.07, R1.08); lệch nằm ở quy tắc bao quanh (sửa/xóa, khóa kỳ, mẫu tối thiểu) |
| GSC | GIỮ engine, bổ sung quy tắc | Mẫu + snapshot đúng hướng (R2.09, R2.20) |
| CSSD | XÂY LẠI LÕI (trạng thái + cổng chặn) trong DB theo M04/M05; giữ danh mục dụng cụ, QR, vỏ màn hình | 48 nghìn dòng nhưng khoảng 12/89 cổng an toàn; vá từng cổng trên máy trạng thái sai sẽ lặp lại vòng sửa. Chưa có người dùng thật nên chi phí đập thấp nhất bây giờ |
| NKBV | ĐÓNG BĂNG tính năng, đo trước | Module lớn nhất, M03 chưa có ca T; chưa có số thì chưa phán |
| QLCV, Đào tạo | ĐÓNG BĂNG tính năng | Đặc tả M09/M10 mới phủ một phần |

Phản biện lại chính yêu cầu «đập đi»: đặc tả cũng chưa đóng (520 chỗ «CẦN XÁC MINH»). Xây lại trên quy tắc còn mở vẫn là cát. Vì vậy quy tắc có XM mở chỉ được vào code dưới dạng tham số, không viết cứng.

## 4. Kiến trúc đích

- **Quy tắc:** mỗi R là một hàm thuần hoặc một ràng buộc DB, có chú thích `@dac-ta Rx.yy`. Không có mã R thì không viết quy tắc.
- **Trạng thái:** bảng chuyển tiếp khai báo trong DB (từ, đến, điều kiện, vai trò) lấy từ §4 đặc tả; một RPC chuyển trạng thái duy nhất kiểm cổng. Màn hình chỉ hỏi «được chuyển sang đâu».
- **Tham số:** một bảng cấu hình có hiệu lực theo ngày (ngưỡng 85/90, mẫu tối thiểu 100…); bỏ số viết cứng trong TS.
- **Test:** spec sinh từ ca T (`@dac-ta T1.02`), chạy trên hàm thuần và trên RPC local.
- **Back end:** ghi qua RPC nguyên tử + RLS; đọc qua lớp `src/lib/data-access` (PO đã chốt PoC ở VST).
- **Front end:** form sinh từ schema Zod, một bộ thành phần nhập liệu chung, trạng thái lấy từ bảng chuyển tiếp.
- **Vòng tự kiểm:** `verify:changed` gọi `trace` (mã lạ thì fail) → test → sổ lỗi; lát sau thêm băm nội dung R để R đổi thì code dẫn nó bị đánh dấu nghi ngờ (học từ duvet, strictdoc). Thay đổi nghiệp vụ đi theo một thư mục: đề xuất + chênh đặc tả + việc (học từ OpenSpec).

## 5. Các lát

| Lát | Việc | Xong khi | Cần PO |
|---|---|---|---|
| L0 | Công cụ `npm run trace` + mã đầu tiên | Chạy ra bảng, M01 R ≥ 1 | Không. ĐÃ XONG |
| L1 | VST/GSC: gắn mã cho 6 quy tắc đã cài; viết test từ T1.01–T1.03 và các ca T của R1.07/R1.08; đưa `trace` vào `verify:changed` | M01 R ≥ 3, T ≥ 3, test pass | Không |
| L2 | Bảng tham số (ngưỡng, mẫu tối thiểu) thay số cứng; migration local | `supervision-thresholds.ts` đọc từ cấu hình; test cũ pass | Prod: hỏi riêng |
| L3 | Sửa lệch VST/GSC theo câu trả lời câu 2 | Mỗi lệch có test fail trước, pass sau | Câu 2 |
| L4 | CSSD: bảng chuyển tiếp + RPC chuyển trạng thái + cổng chặn M05 (mẻ) rồi M04 (gói); nối màn hình cũ vào | R «chặn» có dẫn ≥ 80%, ca T M05 pass | Câu 1, câu 3 |
| L5 | NKBV: đo R của M03 bằng `trace` sau khi gắn mã, rồi phán | Có bảng số như §2 | Không |
| L6 | Gom script npm 120 → ≤ 40, băm nội dung R | Đếm lại | Danh sách xóa: PO xem trước |

Thứ tự phụ thuộc: L0 → L1 → L2 → L3; L4 sau L2 (dùng bảng tham số); L5, L6 độc lập.

## 6. Ba câu chờ PO

1. **CSSD:** cho xây lại lõi trạng thái + cổng chặn theo M04/M05 (giữ danh mục, QR, vỏ màn hình), hay chỉ vá trên lõi hiện có? Khuyến nghị: xây lại lõi.
2. **VST đang dùng thật, chỗ đặc tả trái app:** (a) R2.07 cấm lưu danh tính người được quan sát, app đang lưu `nhan_vien_id`; (b) sửa/xóa cần lý do ≥ 10 ký tự và trưởng khoa duyệt, app chỉ cần ≥ 3 ký tự; (c) đặc tả đo giây chà tay, app tick tay. Theo đặc tả hay sửa đặc tả? Khuyến nghị: (a) sửa đặc tả theo app nếu PO chủ ý lưu; (b) theo đặc tả; (c) giữ tick tay, ghi vào đặc tả.
3. **Mẻ không đạt:** QT.20 và M05 ghi «xử lý lại từ đầu»; tài liệu app `18-CSSD…SSOT.md:177` ghi PO chốt 2026-10-10 «về Đóng gói»; hằng số trong code `me-tiet-khuan-ab-gates.ts:9` lại ghi «về Tiếp nhận» (không nơi nào dùng). Theo cái nào? Hành vi thật của `rpc_cssd_me_thu_hoi` chưa kiểm.

### PO trả lời 2026-11-13

1. CSSD: **xây lại lõi**.
2. (a) **Lưu danh tính** người được quan sát → phải sửa R2.07 của M02; R2.07 dẫn QT.32 §V.1 «ghi nhận ẩn danh», nên QT.32 cũng cần PO sửa hoặc ghi ngoại lệ (đặc tả ĐÃ SỬA 2026-11-14, kho KSNK; QT.32 còn mở ở X2.13). (b) Sửa/xóa **theo đặc tả**: lý do ≥ 10 ký tự ĐÃ LÀM cho VST; bước chủ nhiệm khoa duyệt: XÓA đã làm (L3b-2a), SỬA chưa làm (L3b-2b). GSC giữ ≥ 3 ký tự vì R2.36 không nêu độ dài. (c) **Giữ tick tay** → ghi vào R1.09/R1.10 của M01 (ĐÃ SỬA 2026-11-14, kho KSNK).
3. Mẻ không đạt: **xử lý lại từ đầu** (về Tiếp nhận), thay dòng «PO chốt lại 2026-10-10» trong `18-CSSD…SSOT.md`. Hành vi RPC sửa ở L4.

### Tiến độ

- L1 (2026-11-13): `trace` M01 R 3/40, T 2/35; M02 R 2/41. R1.07/R1.08 chỉ nằm trong migration đã apply nên chưa gắn mã (gắn khi viết migration mới). `trace` đã chạy trong `verify:changed`.
- L3b: `VST_EDIT_REASON_MIN_CHARS` = 10, dùng chung cho sửa, xóa và hộp nhập.

- L2 xong (2026-11-14, commit `e44cfd4b`): màn `/quan-tri-he-thong/tham-so` (chỉ ADMIN, chỉ thêm dòng theo ngày hiệu lực). Thử tay local 3/3 đạt: không ADMIN bị chặn; 150% bị từ chối; thêm 85 hiệu lực hôm nay → dòng cũ «Đã thay». Đo SQL: view/matview/hàm KHÔNG chứa ngưỡng %/cỡ mẫu cứng; `fn_vst_is_valid_opportunity` chỉ giữ trần 1/2 thời điểm (khóa PO) → không cần migration. Chưa thử ca trùng ngày (23505).
- Nợ: `batchStatusAfterBiRecall` (`cssd-batch-recall.ts:117`) lệch hành vi SQL sau L4b, chỉ spec dùng; `DA_TAI_XU_LY` chờ PO chốt đích (Tiếp nhận hay Đóng gói).
- L6 (2026-11-14) — DANH SÁCH ĐỀ XUẤT, chưa xóa gì, chờ PO xem: 121 script → 38.
  - **Giữ tên (38):** dev, dev:local, build, start, lint, verify, verify:quick, verify:changed, verify:full, verify:cssd, verify:mdm, verify:mdm:local, verify:engineering, trace, docs:links:check, module:gate, module:audit, test:cssd, test:pilot, test:e2e:ci, test:coverage, trial:prep, mdm:migrate (đang bị chặn, giữ làm biển báo), mdm:migrate:local, mdm:refresh, pilot:ship, pilot:go-live:gate, pilot:go-live:gate:local, env:check, env:bootstrap, security:baseline, dead-code:scan, repo:hygiene, local:golden:reset, cssd:demo:reset:local, smoke:gsc-vst, smoke:gsc-vst:local, admin:health:check.
  - **Bỏ tên, giữ file script (31)** — chỉ được chuỗi `verify*`/`pilot*` gọi; đổi thành lệnh `node scripts/…` trực tiếp trong chuỗi: lint:cssd-architecture, guard:boundaries, legacy:guard, legacy:sql:guard, imports:cssd-mdm, imports:master-crud, layout:drift-check, layout:typography-check, panel:normalize, panel:wire, panel:chrome-check, audit:legacy-rpc, audit:views, engineering:baseline, engineering:contract:gate, mdm:coverage:gate, mdm:fallback:audit, mdm:postcheck:sql(:local), mdm:postcheck:fk(:local), trial:db:precheck(:local), trial:auth:precheck(:local), trial:rbac:roles, pilot:go-live:precheck(:local), wiki:index, gstt:gap:backfill, ops:bulk-ksnk-onboard.
  - **Xóa tên (52, không nơi nào gọi — đo 2026-11-13):** dev:webpack, sync:check(:local), local:golden:verify, pilot:views:precheck, coverage, ci:coverage:honesty, ci:npm-audit:advisory, ci:npm-audit:hard, cssd:db:audit(:local), fact:orphan:sweep(:local), cssd:split-bo:local, cssd:demo:reset, gstt:db:audit(:local), gstt:scoring:audit, trial:rbac:roles:local, trial:qlcv:precheck(:local), trial:audit:probe(:local), pilot:dashboard:explain:linked/local, verify:danh-muc-routes, mdm:fallback:audit:strict, mdm:import:bk-ap-dung(:dry), mdm:migration:list:linked, mdm:apply-and-verify(:local), verify:mdm:post-migration(:local), engineering:contract:gate:strict, ssot:db:guard(:local), table:normalize, columns:chrome-check, seed:gstt-bang-kiem, admin:rbac:sync(:local), admin:rbac:parity(:local), verify:admin, test:admin, test:e2e, test:e2e:install, smoke:cssd-station-map, guard:cssd-red-alert-view, sql:object-refs, dao-tao:import-mcq. File script tương ứng: xem từng cái trước khi xóa (import một lần như `dao-tao:import-mcq`, `seed:gstt-bang-kiem` nên giữ file).
  - Băm nội dung R: chưa làm; đưa vào vòng `/chay-lien-tuc` (module NEN).
- Vòng lặp liên tục: `.claude/commands/chay-lien-tuc.md`, chạy `/loop /chay-lien-tuc`; nhật ký `.claude/plans/NHAT_KY_VONG_LAP.md`.

## 7. Giả định

- Đặc tả ở kho KSNK là nguồn; app không sao chép đặc tả, chỉ dẫn mã.
- `trace` đọc đặc tả qua đường dẫn máy này; đổi máy thì đặt `KSNK_DAC_TA`.
- M03 và M12 không có ca T (0 hàng): là khoảng trống của đặc tả, ghi lại, không tự viết thay.

## Tự kiểm

- Mỗi yêu cầu có bước: YC1→L0,L1 · YC2→L1,L2 · YC3→L3,L4,L5 · YC4→L2,L6 · YC5→L1 (trace vào verify) · YC6→L0 + §4. Không lát nào không phục vụ yêu cầu.
- Không trái CLAUDE.md: không thêm file vào `docs/core`; CSSD xây lại là thay đổi phá hủy nên chờ lệnh PO (câu 1); không migration prod; mỗi lát ≤ 8 file trừ L4 (sẽ tách lát con khi PO duyệt).
- Lệch đã biết: «lệnh đóng băng» cũ đã được PO thay bằng «triển khai tất cả» (`CLAUDE.md` mục Kỷ luật); plan này đóng băng tính năng NKBV/QLCV/Đào tạo cho tới khi đo, là thứ tự làm chứ không bỏ module.
- Từ mơ hồ đã thành số: «xong module» = R có dẫn ≥ 80% + 3 kịch bản tay; «gọn công cụ» = ≤ 40 script.
- Một khái niệm một tên: «dẫn mã» = chú thích `@dac-ta`; «lệch» = code làm khác câu R.
- Chưa kiểm: số đếm CSSD là ước lượng; hành vi thật của `rpc_cssd_me_thu_hoi` (`supabase/migrations`, chưa đọc thân hàm).

L4b xong (local, chưa prod): migration 20261114130000 thu hồi kiểm trạng thái mẻ nguồn, bỏ 7 cặp trái đặc tả; còn 2 cặp →QC_KHONG_DAT (DA_CHOT_NAP, HOAN_THANH) chờ siết ghi_test. DA_TAI_XU_LY chưa làm: cần PO chốt đích (Tiếp nhận theo 2026-11-13 hay ĐÓNG GÓI) và RPC trả lô nguyên tử. L5 đo trace: M03 0/60 R, 0 T; M05 7/50; M01 3/40; M02 2/41; còn lại 0.
