# KH_APPKSNK_20261114 — Hoàn thiện project, rà mẫu in/lưu trữ, đối chiếu kho tri thức, mở rộng module

Trạng thái: ĐANG CHẠY trong vòng `/loop /chay-lien-tuc` (PO ủy quyền chạy nối, không chờ duyệt: `.claude/commands/chay-lien-tuc.md:8`) · lập 2026-11-14
Nguồn: chỉ đạo PO 2026-11-14 (§1) · số đo §2 lấy bằng lệnh ghi kèm, không chép từ trí nhớ · kho tri thức `~/Desktop/KSNK_BENH_VIEN_103/` là **bản nháp** (tự nhận ở `03_QUY_TRINH_BENH_VIEN/RA_SOAT_LO_HONG_2026-11-10.md`), vòng lặp chỉ đọc.

## 0. Thuật ngữ (một khái niệm một tên)

- **BM** = biểu mẫu mã `KSNK.<QT|QĐ>.nn.BM.nn` ở kho tri thức; **bảng kiểm** = BM có bảng tiêu chí; **mẫu in** = màn/hàm in của app; **xuất file** = Excel tải về.
- **Lưu trữ** tách ba nghĩa khi rà: (a) thời hạn lưu ghi trên mẫu; (b) cấm xóa cứng hồ sơ còn hạn; (c) giữ nguyên bản mẫu đã dùng lúc mở phiên.
- **P0–P3** = giai đoạn của kế hoạch này. **Vòng** = một lần `/chay-lien-tuc`.

## 1. Yêu cầu PO → tiêu chí đo

| Mã | Yêu cầu PO (rút gọn, đúng ý) | Tiêu chí đo |
|---|---|---|
| YC1 | «trước mắt cứ hoàn thiện project này cho chuẩn mực đã» | **P0 đạt** khi lệnh §3-P0 in `mở: 0 \| CHO_PO thiếu mặc định: 0` và thoát 0 |
| YC2 | «rà soát, phân tích các mẫu biểu in ấn, lưu trữ» | **P1 đạt** khi: 57/57 file in/xuất có dòng ánh xạ (BM hoặc «không có BM nguồn»); 5 phép kiểm in chạy hết trên VST/GSC; 12/12 chỗ xóa cứng phân loại 3 lớp |
| YC3 | «đối chiếu sang KSNK_BENH_VIEN_103 để lấy thêm nguồn, thêm domain» | **P2 đạt** khi 5/5 tài liệu đối chiếu có kết luận trong nhật ký; `npm run trace` R có dẫn không tụt dưới 15/688 |
| YC4 | «xem cần bổ sung module nào… từ ý tưởng đến sản phẩm» | **P3** mỗi module đi đủ 5 bước (§3); chỉ mở khi P0 và P1 đạt |
| YC5 | «chính xác, khoa học, cụ thể» | Mỗi phát hiện có bằng chứng hai phía (§4); thiếu một phía → «cần kiểm», không vào sổ như `DA_XAC_MINH` |

## 2. Số đo hiện tại (2026-11-14, tại worktree `integrate-2026-11`)

| Số | Giá trị | Lệnh đo |
|---|---|---|
| Sổ lỗi | 127 dòng: mở 7 · đã sửa 99 · lỗi giả 13 · hoãn 8 | `node scripts/readiness/so-loi.mjs stats` |
| Việc sống | MOI 3 (VST-015, VST-016, CSSD-035) · DA_XAC_MINH 2 (CSSD-036, CSSD-032) · CHO_PO 2 (NEN-003, CSSD-034) | `so-loi.mjs next 10` |
| Kịch bản tay | CHUA 7 · DAT 39 · KHONG_DAT 0; DA_SUA có test/migration 76/99 | `so-loi.mjs stats` |
| Truy vết đặc tả | R có dẫn 15/688 · T có dẫn 3/424 | `npm run trace` |
| **Tập mẫu in/xuất** | **57 file** = tên chứa `print` ∪ import `exceljs`/`file-saver` (không tính spec): cssd-erp 15 · dashboard 7 · giam-sat-nkbv 6 · giam-sat-chung 6 · giam-sat-vst 5 · quan-ly-cong-viec 4 · hooks 4 · cssd-su-co 3 · lib 3 · dao-tao 2 · components 2 | `find src -type f -iname '*print*' ! -name '*.spec.*'` + `grep -rlE "from ['\"](exceljs\|file-saver)['\"]" src` |
| Độ phủ trên 57 file | mã BM/QT 7 · khối chữ ký 10 · «thời hạn lưu»/retention **0** · chữ «lưu trữ» 4 · `is_active` 4 · phiên bản mẫu (`phien_ban`/`version`) **0** | `xargs grep -lE '<mẫu>'` trên danh sách trên |
| Xóa cứng | 12 chỗ `.delete()` ở 10 file (9 trong `actions/`, 1 ở `lib/`); VST/GSC 0 chỗ; 23 file migration có `delete from` (lịch sử đã áp) | `grep -rn '\.delete()' src` · `grep -rliE 'delete +from' supabase/migrations` |
| Kho tri thức | 37 QT + 21 QĐ; 191 BM, 66 bảng kiểm, 1282 tiêu chí, 386 tiêu chí ● | `03_QUY_TRINH_BENH_VIEN/04_HUONG_DAN_BANG_KIEM/KIEM_KE_BANG_KIEM.md:64` |

Số «61 file» ghi ở vòng trước không tái lập được bằng lệnh → thay bằng 57 (lệnh ở bảng).

## 3. Giai đoạn

**P0 — Hoàn thiện project** (đang chạy; thứ tự việc theo `chay-lien-tuc.md` §1). Lệnh thoát (không dùng `so-loi.mjs check`: nó tính CHO_PO là việc mở, `so-loi.mjs:21,127`):
`node -e 'const r=require("./scripts/readiness/so-loi.json");const mo=r.filter(x=>["MOI","DA_XAC_MINH","DANG_SUA"].includes(x.trang_thai)).map(x=>x.id);const po=r.filter(x=>x.trang_thai==="CHO_PO"&&!(/mặc định/i.test(x.ghi_chu||"")&&/PO im/i.test(x.ghi_chu||""))).map(x=>x.id);console.log("mở:",mo.join(",")||0,"| CHO_PO thiếu mặc định:",po.join(",")||0);process.exit(mo.length||po.length?1:0)'`
Việc sống, theo thứ tự làm: **CSSD-036** (`slice-fixer`: thẻ kho theo `duyet_at`, `src/lib/domain/cssd-kho-hoa-chat-the-kho.ts:37,50`; ngăn kéo 200 dòng `KhoHoaChatKsnkPage.tsx:49` cùng thứ tự/lọc) → **CSSD-032** (`migration-author`, DB local: chặn hai phiếu cùng `su_co_id`, `20261029130000_cssd_hc_e_cam_sua_ton_ly_do_xuat.sql:136-142`) → **CSSD-035** (xác minh rồi sửa: `cssd-kho-hoa-chat-su-co.actions.ts:74,101,115,159`) → **VST-015** (`db-verify` → `migration-author` local + `review-bv103`; `20261108100000_gstt_session_read_scope_rls.sql:86-87,107-108,131-132`) → **VST-016** (lọc theo khoa ở code, `vst-yeu-cau-dieu-chinh.actions.ts:31-101`; ma trận vai trò → CHO_PO). CHO_PO NEN-003, CSSD-034 giữ nguyên (đã có mặc định). Không tạo dòng sổ cho `npm run impact`: script chỉ có ở nhánh `chore/code-vs-ai-phase1` (commit `330eeb7d`), `CLAUDE.md` nhánh này không yêu cầu; `chay-lien-tuc.md:61` ghi sự thật và dùng `grep -rn`. Từ P1 sinh thêm bốn việc: **VST-020** (nhật ký xuất thô VST/GSC), **VST-022** (`.single()` → `.maybeSingle()` ở `giam-sat-chung-session-detail.actions.ts:41-44`), **NKBV-030**, **NKBV-031** (xác minh khóa tháng/cột tác giả rồi sửa); VST-017/018/019/021 là CHO_PO có mặc định. Bảy kịch bản tay CHUA (CSSD-007/008/009/012, NKBV-007/013, DT-016): chạy được trên `localhost:3001` thì chạy và ghi `so-loi.mjs tay`.

**P1 — Mẫu in và lưu trữ** (chỉ rà và ghi sổ; sửa là vòng sau). Thứ tự module: VST → GSC → NKBV → QLCV → dashboard → CSSD (sau CSSD-036).
1. Ánh xạ 57 file → mã BM hoặc «không có BM nguồn», ghi ở `scripts/readiness/mau-in-anh-xa.json` (dữ liệu, không phải tài liệu thứ hai). Tra mã ở `DANH_MUC_HD_VA_BM.md`; không tra được → «cần kiểm».
2. Năm phép kiểm in, theo thứ tự: (1) **số khớp**: % tuân thủ trên mẫu in = Đ/(số dòng đánh giá − KAD)×100 (`NGUYEN_TAC_BANG_KIEM.md:19`) và bằng số KPI (`gsc-print-utils.ts` ↔ hàm KPI); (2) **in lại đúng bản mẫu đã mở phiên** (R2.20, `M02_GIAM_SAT_TUAN_THU.md:195,607`) — 0/57 file nhắc phiên bản mẫu nên đọc migration xem cột `phien_ban_mau` có không; (3) **xóa mềm** `is_active=false` không lọt vào bản in/Excel (chỉ 4/57 file nhắc `is_active`); (4) **xuất file theo vai trò** (T1.32, `M01_VE_SINH_TAY.md:705`: NV_YT bị chặn/lọc, ĐDT khoa chỉ thấy nhật ký khoa, BGĐ chỉ thống kê ẩn danh; trùng VST-016 thì gắn vào dòng đó); (5) **đầu/cuối trang**: mã BM, chữ ký người được giám sát + người giám sát, hạn khắc phục (khối IV, `NGUYEN_TAC_BANG_KIEM.md:26`); thời hạn lưu → «cần kiểm», mặc định **không in thời hạn lưu** (0/57 file in).
3. Lưu trữ (T1.34, `M01_VE_SINH_TAY.md:707`): 12 chỗ `.delete()` chia (i) bảng nháp/ô lịch bật-tắt, (ii) danh mục/RBAC, (iii) hồ sơ còn hạn. Lớp (iii) hoặc lớp (i) tác động mẫu số KPI mà không có dấu vết → vào sổ lỗi.

**P2 — Đối chiếu kho tri thức** (mỗi vòng một tài liệu, thư mục `09_DOMAIN_PHAN_MEM/05_DOI_CHIEU_PROJECT/` trừ mục cuối): `DOI_CHIEU_DAC_TA_VA_KSNK_BV103` → `DANH_GIA_PROJECT_THEO_KPI` → `KE_HOACH_TONG_THE_PHAT_TRIEN_KSNK` → `KE_HOACH_THUC_HIEN_SO_HOA_TOAN_BO` → `03_QUY_TRINH_BENH_VIEN/RA_SOAT_LO_HONG_2026-11-10`. Mỗi vòng: đo lại một phép bằng `grep`/`trace`, ghi một kết luận vào nhật ký; lệch với app → sổ lỗi (MOI/CHO_PO, `nguon` = «kho tri thức (dự thảo)»); lỗi nằm phía kho → §5.

**P3 — Module bổ sung** (khóa tới khi P0 và P1 đạt). Mỗi module 5 bước: (1) nhu cầu + người dùng thật (`CLAUDE.md:29`) → (2) đặc tả R/T (chủ: phiên kho tri thức/PO; vòng lặp không sửa kho) → (3) `/intake-nv` + DoD → (4) lát: migration LOCAL + RPC + action + UI → (5) `verify:engineering` + ≥ 3 kịch bản tay. Ứng viên theo `DOI_CHIEU…:91-105` (ước lượng cấp thực thể, chưa kiểm, P2 đo lại): A1–A5 (bổ sung VST/GSC) → B2, C5 (CSSD) → B1 (CAPA + PEP) → B3 (cụm bệnh) → B5 → B4 (sức khỏe nghề nghiệp, nhạy cảm → CHO_PO) → C1–C4. Trước khi coi C1/C2 là khoảng trống: đo độ phủ thật của `src/modules/chat-thai-do-vai`.

## 4. Quy tắc bằng chứng

Một phát hiện vào sổ khi có: (a) `file:dòng` ở BM/đặc tả/QT; (b) `file:dòng` ở app; (c) lệnh tái hiện. Nguồn là kho tri thức thì `nguon` = «kho tri thức (dự thảo)» và tối đa MOI hoặc CHO_PO. Điều chỉnh y khoa (ngưỡng, thời hạn, công thức) mà SSOT im → CHO_PO + đáp án mặc định + hệ quả nếu PO im, **không** cài mặc định vào code.

## 5. Vấn đề phía kho tri thức (không vào sổ app; chủ: phiên kho tri thức/PO)

| `RA_SOAT_LO_HONG_2026-11-10.md` | Vấn đề | Ảnh hưởng tới app |
|---|---|---|
| dòng 9 | dấu `[CẦN XÁC MINH]` bị gỡ khi chưa có nguồn | khôi phục dấu trước khi app dẫn |
| dòng 23, 24 | QT.20 tải ≤ 75% và khoảng trống 2–5 cm (nhóm A); QĐ.06 «01 người» | chưa cài ngưỡng vào app tới khi PO chốt |
| dòng 32, 82 | thời hạn lưu «Tối thiểu 05/03 năm» ~145 dòng chưa có căn cứ pháp lý (chưa dẫn TT 53/2017/TT-BYT — «cần kiểm»); QĐ.15 BM.03 03 năm vs 05 năm | mẫu in không in thời hạn lưu (P1 phép 5) |
| dòng 36, 83 | thẻ «[HIỆN HÀNH]» trên tài liệu chưa ký (G8: đổi «[DỰ THẢO]») | app không coi QT/QĐ chưa ký là căn cứ cứng |
| dòng 48, 49 | thiếu BM: QT.26 biên bản từ chối xử lý; QT.37 sự cố tràn đổ hóa chất | mẫu in tương ứng ghi «không có BM nguồn» |
| dòng 58 | BM trùng: áp lực phòng AIIR (QT.13.BM.02 / QĐ.06.BM.01 / QĐ.07.BM.02), nội soi (QT.24.BM.03 vs QĐ.11.BM.01/02), MDRO (QĐ.12.BM.02 vs QT.35) | một mẫu in ↔ một BM: chờ hợp nhất |
| dòng 94–97 | nhóm quyết định A, F, G6/G7/G8; soạn mới 2 BM | PO quyết |

## 6. Giả định và cổng PO

- Thời hạn lưu = «cần kiểm»; mặc định app không in; PO im thì giữ nguyên.
- Ngưỡng đạt bảng kiểm ≥ 90% chờ PO (đồng bộ QT.32, `NGUYEN_TAC_BANG_KIEM.md:20`): app đọc từ `ksnk_dm_tham_so`, không viết cứng.
- Cổng PO ghi, không hỏi: prod migration (L2a, `20261114110000`…`140000`, `20261114150000` (VST-015), `20261114160000` (VST-026), CSSD-032 sau này); gán tài khoản thật cho CHU_NHIEM_KHOA; X2.13, QT.32, R1.10, XM-2; đích thu hồi tái xử lý; bốn quyết định ở `DOI_CHIEU…:136-141` (cần bản nháp «spec = nguồn, project = hệ thống thật», B1 sớm hơn không, công thức chuẩn khi RPC và TS lệch, nơi lưu dữ liệu sức khỏe nghề nghiệp); đưa `330eeb7d` vào nhánh này; push/PR/deploy.

## 7. Tiến độ (cập nhật mỗi vòng)

P0: 11 việc mở (thứ tự `next`: VST-023, CSSD-036, CSSD-032, VST-020, NKBV-030, NKBV-031, VST-024, VST-027, VST-029, CSSD-035, VST-022) + 7 kịch bản tay; CHO_PO 8, đủ mặc định (VST-025: lô prod của RLS đọc phiên VST, thêm migration của VST-026 ngay sau `20261114150000`; VST-028: vai ĐDT/CN_KHOA lâm sàng chưa có trong RBAC); VST-015 đã sửa ở DB local; VST-026 đã sửa ở DB local (`d0fb8962`: CNK đọc toàn viện ở app và migration `20261114160000`), probe 61 OK/0 LECH, spec VST scope 38/38, tsc 0; VST-016 là LỖI GIẢ (CHU_NHIEM_KHOA = chủ nhiệm khoa KSNK = TK_KSNK, `handover-roadmap.md:80`, M01 dòng 22 và R1.24), nhưng xác minh lộ ra VST-014/015 đọc nhầm CNK thành «khoa mình» (đã sửa bằng VST-026); VST-029 (THAP) ghi sổ: tài khoản giữ cả CNK lẫn MẠNG LƯỚI vẫn bị khóa theo khoa ở dropdown header, đánh dấu «đã xem», lưu phiên (chỉ thu hẹp, local 0 tài khoản giữ cả hai vai); **Việc kế: VST-023** (GSC: chặn HOI_DONG_KSNK đọc lịch sử/chi tiết/xuất có danh tính; CAO, đứng đầu `next`; roadmap §5 hàng VST+GSC) · P1: bước 1 ánh xạ 12/57 đã rà (5 hai phía, 6 một phía, 1 không áp dụng), 45 chưa rà, ghi ở `scripts/readiness/mau-in-anh-xa.json`; bước 2 đã chạy năm phép cho VST/GSC (số khớp: VST ĐẠT 0/32119, GSC cần kiểm; in lại MỘT PHẦN theo VST-024; xóa mềm ĐẠT; xuất theo vai trò MỘT PHẦN theo VST-023; đầu/cuối trang MỘT PHẦN; số đo của VST-023/024 là DB local: 18/1176 phiên có ảnh chốt mẫu, 562/1156 phiên chưa chốt có tiêu chí không còn trên mẫu, prod chưa đo), chưa chạy cho 4 module còn lại; bước 3 xong 12/12, 3 chỗ vào sổ (NKBV-030 hai vị trí, NKBV-031) · P2: 0/5 · P3: khóa.

## Tự kiểm

- Yêu cầu ↔ bước: YC1→P0, YC2→P1, YC3→P2, YC4→P3, YC5→§4; mỗi yêu cầu có số/điều kiện ở §1. Bước thừa: 0.
- Từ mơ hồ đã thành điều kiện: «chuẩn mực» → lệnh thoát P0; «chính xác, khoa học, cụ thể» → §4; «lưu trữ» → ba nghĩa ở §0.
- Thứ tự phụ thuộc: P3 sau P0 + P1 (`CLAUDE.md:29`); in CSSD sau CSSD-036 vì cùng file thẻ kho (`cssd-kho-hoa-chat-the-kho.ts:37,50`).
- Lệch/mâu thuẫn phát hiện (11):
  1. `chay-lien-tuc.md` dẫn `npm run impact`, nhánh này chưa có (script và quy tắc chỉ ở `330eeb7d`; `CLAUDE.md` nhánh này không có dòng `impact`) → dùng `grep -rn`, không mang commit sang (nhánh cũ lệch 20+ commit); không tạo dòng sổ, `chay-lien-tuc.md:61` đã ghi sự thật.
  2. `CLAUDE.md:28,56` («lâm sàng SSOT im → hỏi PO») ↔ `chay-lien-tuc.md:8,67-69` («không hỏi») → vòng lặp chỉ ghi CHO_PO + đáp án mặc định, không cài mặc định vào code; sửa `chay-lien-tuc.md` §5 cho khớp.
  3. `KE_HOACH_TONG_THE_PHAT_TRIEN_KSNK.md:8,56` («Không thêm module, không thêm bảng mới», đề xuất 2026-11-07) ↔ chỉ đạo PO 2026-11-14 và `CLAUDE.md:29` («triển khai TẤT CẢ module») → chỉ đạo mới hơn thắng; P3 khóa tới sau P0 + P1.
  4. `DOI_CHIEU_DAC_TA_VA_KSNK_BV103.md:7-12` tự nhận «ước lượng ở cấp thực thể, không phải kiểm thử» → P2 đo lại; chưa module nào được chọn chỉ vì bảng đó.
  5. `CLAUDE.md:29` (mỗi module cần người dùng + kịch bản tay trước khi coi là xong) → P3 chỉ «chưa xong» tới khi có người dùng thật.
  6. `CLAUDE.md:58` («Never tạo tài liệu thứ hai») → kế hoạch nằm ở `.claude/plans/`; bảng ánh xạ là dữ liệu JSON ở `scripts/readiness/`, không phải tài liệu.
  7. `CLAUDE.md:32` (≤ 8 file/task) → tính theo vòng (`chay-lien-tuc.md:71`).
  8. `~/.claude/CLAUDE.md:26` («Một phiên = một mục tiêu») ↔ ba mục tiêu trong một phiên → tiếp tục theo chỉ đạo rõ của PO, ba giai đoạn tuần tự có cổng; trạng thái ghi ở file này và HANDOFF.
  9. `so-loi.mjs:21,127,136`: `check` tính CHO_PO là việc mở và đòi `HANDOFF_APPKSNK.md` ≤ 6000 byte (file của phiên khác) → P0 đo bằng lệnh `stats` ở §3, không bằng mã thoát của `check`.
  10. Số «61 file in/xuất» ở ghi chú vòng trước không tái lập → thay bằng 57 theo lệnh ở §2.
  11. `RA_SOAT_LO_HONG_2026-11-10.md:9,32,36` (kho tự nhận bản nháp) → mọi nguồn từ kho đi vào sổ với `nguon` «kho tri thức (dự thảo)», tối đa MOI/CHO_PO.
