# Báo cáo rà soát & cải tổ KSNK BV103 — 2026-11-06

Phạm vi: chỉ đọc/đo (không sửa code, không migration, không commit). Nguồn: `HANDOFF.md` (các trục A–I), đo prod bằng Supabase MCP (chỉ SELECT, PO ủy quyền), đo local bằng lệnh ghi kèm. Đã qua 1 vòng phản biện độc lập (`review-bv103`, Đợt 3): 0 Nghiêm trọng · 2 Cao · 6 Trung bình — đã sửa trong bản này. Phần «chưa kiểm» ghi rõ từng chỗ.

## ① Chẩn đoán có số

| Chỉ số | Giá trị | Nguồn |
|---|---|---|
| Code | 216.654 dòng TS/TSX · 52 `page.tsx` (plan ghi 55, đếm lại = 52) · 60 file > 500 dòng · 153 `any` | đo Đợt 0; `find src/app -name page.tsx` |
| DB local | 61 bảng · 57 view · 156 hàm · 189 policy · 304 index · 263 migration (82 trong 10/2026) | catalog local |
| Prod | 57 bảng (18 rỗng) · 21 auth user, 4 đăng nhập 30 ngày · 250 migration đã apply (repo 263) | Supabase MCP 2026-11-06 |
| Mã chết | 25–26 file src không ai import (~3.054–3.064 dòng, ~1,4%); 8–9 thuộc NKBV (hai lần chạy script lệch nhau 1 file; `manifest.ts` và `heic2any.d.ts` là false positive đã loại) → cần chốt danh sách cụ thể trước khi xoá | script Node tự viết (`scratchpad/orph.mjs`), chạy lại bởi reviewer |
| Vận hành | 114 npm script (0 trỏ file mất, 1 cặp trùng) · 58 file `scripts/` (0 mồ côi) · 2 workflow CI | HANDOFF trục H |
| Giao diện | `layout:drift-check` OK · `layout:typography-check` OK | chạy 2026-11-06 |

Giả thuyết đã kiểm:
1. **Lệch đầu tư — XÁC NHẬN.** VST+GSC+thống kê = ~23k dòng (11%) và là phần duy nhất có dữ liệu thật; NKBV+CSSD+QLCV+Đào tạo ≈ 119k dòng (55%; NKBV gồm cả 11.553 dòng spec) với dữ liệu ghi nhận rất ít (suy từ `n_live_tup` và số hàng, không phải log hoạt động người dùng; số prod lấy từ MCP phiên trước, chưa đo lại).
2. **Hai nguồn công thức (RPC + TS) — XÁC NHẬN một phần** (mục ③). Có spec chống lệch (`strategic-analytics-cache.spec.ts:183,211`) nên rủi ro đã được giảm.
3. **UI theo cấu trúc kỹ thuật — chưa kiểm** (cần ảnh preview + thử tay; chưa làm).
4. **«SQL khoá vào Supabase» — BÁC phần lớn.** `request.jwt` = 0, `storage.` = 0, Storage/Realtime = 0 trong TS. Coupling thật: PostgREST `.from()` (915 chỗ/223 file/84 bảng), RLS theo role + `auth.uid()` (74 chỗ SQL), pg_cron (45 dòng).
5. **Chi phí quy trình AI > lợi ích — KHÔNG thấy bằng chứng.** `.claude` gọn (10 agent, 4 skill, 11 rule 27,8 KB); chi phí thật là 114 script khó nhớ.

## ② Ma trận module & khuyến nghị

| Module | Dòng | `.from()`/RPC (literal, tĩnh) | Prod | Đề xuất (PO quyết) |
|---|---|---|---|---|
| VST | 6.187 | 19/2 | fact_vst 33.238 · 3.609 phiên | **Giữ & dứt điểm (ưu tiên 1)** |
| GSC | 9.717 | 38/3 | 1.388 phiên | **Giữ & dứt điểm (ưu tiên 1)** |
| Thống kê (dashboard) | 7.169 | — | đọc VST/GSC | **Giữ & làm lại theo chuyên đề (③)** |
| QTHT | 26.700 | 243/7 (kể cả `.from()` dùng biến: 257) | 36 nhân sự, 66 khoa | Giữ (hạ tầng dùng chung); không mở rộng |
| NKBV | 58.844 | 149/4 | ~2.600 hàng, chủ yếu nhập/xóa loạt (`su_kien` live 1) | Ưu tiên thấp; không thêm tính năng mới khi chưa có người dùng |
| CSSD (erp + sự cố) | 39.176 | 294/28 | chỉ nhập danh mục (7.289 + 2.311 + 164); quy trình 10, lò 2, kho 0 | **Module kế tiếp sau VST/GSC** (đúng thứ tự CLAUDE.md); cần khoa CSSD thật dùng |
| QLCV | 15.453 | 43/5 (kể cả biến: 65) | 1 nhiệm vụ, 0 công việc | Ưu tiên thấp |
| Đào tạo | 5.101 | 51/0 | 787 câu hỏi, 1 lần thi | Ưu tiên thấp |

Lưu ý: CLAUDE.md ghi mục tiêu triển khai TẤT CẢ module, thứ tự VST/GSC + thống kê → CSSD → NKBV → QLCV → Đào tạo (PO 2026-10-12, thay lệnh đóng băng). Báo cáo **không đảo thứ tự đó**: chỉ đề xuất dồn sức 90 ngày đầu vào VST/GSC/thống kê, rồi CSSD. «Đóng băng/ưu tiên thấp» chỉ là mức nguồn lực, không xoá, và **chỉ PO quyết** (mục ⑦, câu 1; không có mặc định tự áp dụng).

## ③ Thống kê: thiết kế lại theo chuyên đề + từ điển KPI

**Hiện trạng (agent báo; ✔ = tự xác minh, mục không có ✔ do agent báo, chưa tự kiểm):**
- `ty_le_vst = da_tuan_thu / tong_co_hoi` (dòng qua `fn_vst_is_valid_opportunity`); `ty_le_gsc = tong_dat / tong_quan_sat` (loại NA). Cả hai có bản RPC lẫn bản TS (`supervision-metrics/formulas.ts`) → hai nguồn, làm tròn khác nhau (VST 1 chữ số, GSC 2, coverage nguyên) — chưa tự đọc từng dòng, **không** đánh ✔.
- ✔ **Bác nhận định «tuần thiếu thành 0%»:** `normalizeVstTrendline`/`normalizeGscTrendline` (`src/lib/analytics/supervision-trend.ts:60-72` và hàm VST ngay trên) lọc `tong > 0` trước khi tính, nên tuần không có mẫu bị bỏ khỏi run chart, không thành 0%. `?? 0` ở `rateForKind` chỉ là phòng thủ.
- «vs kỳ trước» = chênh 2 tuần cuối trendline: **là quyết định đã khóa trong rule dashboard**, không phải lỗi; điểm yếu là nhiễu và không có khoảng tin cậy.
- Đã có: Wilson 95% (`supervision-percent.ts:74`), run chart trung vị ≥ 8 điểm, funnel plot, ngưỡng mẫu mỏng n < 20.
- Thiếu (chưa tự xác minh): mẫu số VST loại dòng vượt trần không hiện số bị loại; GSC không có thước đo độ chắc (dictionary:33 cố ý không KTC); ngưỡng 85/70, 80, 90/85 không nêu căn cứ; KPI CSSD (`cssd-analytics-core.ts:422,501,566`) không có trong metric-dictionary; `/thong-ke/cssd` chỉ redirect; không chuẩn hoá giường-ngày/case-mix; không điều chỉnh chênh TGS vs KSNK (Hawthorne).
- **Chưa làm:** tính tay đối chiếu ≥ 3 KPI/module có dữ liệu; kiểm `/bao-cao-tong-hop` và NKBV.

**Bố cục đề xuất** (mỗi mục: 3–5 con số đầu trang → xu hướng → so sánh khoa → bảng/xuất), theo 5 chuyên đề ưu tiên từ kho QT: ① Vệ sinh tay (QT.06) ② PPE + tiêm an toàn (QT.07,08) ③ Vệ sinh môi trường (QT.10) ④ Chất thải + đồ vải (QT.11,12) ⑤ Gói phòng ngừa NK (QT.28–31,33). Làm theo thứ tự đã có dữ liệu: ① trước; ②–⑤ chỉ có bảng kiểm GSC nên chỉ làm khi GSC ổn.
**Từ điển KPI rút gọn:** mỗi KPI một dòng (tử số, mẫu số, nguồn duy nhất, kỳ, phạm vi, ngưỡng + căn cứ, người ra quyết định). Việc đầu tiên: chọn **một** nguồn công thức (khuyến nghị RPC; TS chỉ hiển thị) rồi xoá bản TS thừa.
**KPI cắt:** `ty_le_ccs` (deprecated). Reviewer xác minh: `pdca-remeasure.ts:57` luôn trả null và `ty_le_ccs` còn nằm trong CHECK của `20260729121000_ksnk_dm_muc_tieu_kpi.sql:4,22` → bỏ hẳn cần migration; hỏi PO.

## ④ UI/UX

- Đo được: không drift token/typography; chỉ có `loading/error/not-found` ở gốc app, không theo route; responsive (file có `sm:|md:|lg:`) VST 3/15, GSC 8/21, Đào tạo 9/18; `aria-/role=` thưa ở VST (9), GSC (16), Đào tạo (9); 3 file còn `confirm()/alert()`.
- Nguyên tắc đề xuất: số trước, lọc ít, một hành động chính/màn; VST/GSC kiểm trên điện thoại (hiện trường) trước khi nói «xong».
- **Chưa làm:** chấm điểm từng route, ảnh preview, đo thời gian nhập (< 60s), danh sách màn gộp/bỏ — cần dev server + đăng nhập. Đề xuất giới hạn ở 8 route của VST/GSC/thống kê thay vì cả 52.

## ⑤ Kiến trúc đích & độc lập nền tảng

- **Mã chết:** ~25–26 file (~3.054–3.064 dòng) — xoá sau khi PO duyệt danh sách cụ thể (đã loại false positive). Gốc lỗi CI: gói `fallow` không có trong `package.json`/`node_modules/.bin`; `scripts/dead-code-scan.mjs:11-19` chạy `npx --no-install` nên lỗi rồi thoát 0, và `ci.yml:85` để warn-only → CI thực tế **không quét**, không phải lỗi phạm vi.
- **DB:** 4 RPC từng bị nghi lệch **không lệch** (có CREATE trong migrations; prod = local về md5(prosrc), DEFINER). Số «13 migration chưa lên prod» là ước lượng từ đếm (repo có 261 `.sql` thật — 263 mục tính cả README và `archive_legacy`; 1 file chưa track; prod 250) và **chưa diff được** vì prod ghi version theo lúc apply MCP → phải diff theo nội dung trước khi lập danh sách áp.
- **Adapter (nhỏ nhất đúng gốc), ADR đề xuất:** không bọc toàn bộ PostgREST. (1) `src/lib/data-access/` chỉ 3 cổng: `getActor()` (gom 42 điểm auth), `db(role)` (user vs admin client), `rpc(name, args)` có type từ 51 RPC. (2) Mỗi module có `repo/` riêng, làm theo thứ tự VST (19) → GSC (38) → thống kê → CSSD. (3) QTHT/NKBV/CSSD-erp (~600 `.from()`) không di chuyển trừ khi đổi nền tảng. (4) RLS theo role + `auth.uid()` và pg_cron là phần khoá thật — adapter không gỡ được; ghi rõ khi quyết định rời Supabase.
- **PoC tiêu chí đạt:** VST chạy qua `data-access` không còn import `@supabase/*` ngoài lớp này; `test:cssd` vẫn pass; ước lượng công cho VST ≈ 19 `.from()` + 2 RPC (nhỏ, vài ngày — ước lượng chưa đo).
- **Bảo mật (trục I, không Nghiêm trọng/Cao):** (1) Trung bình: `must_change_password` nằm ở `user_metadata`, chỉ ép ở client → user tự tắt được; sửa: chuyển sang `app_metadata`/cột DB + kiểm ở `src/proxy.ts`. (2) Thấp–TB: sau khi vô hiệu hóa nhân sự, token đang sống + cache quyền 5 phút còn hiệu lực đến hết TTL (TTL prod chưa kiểm). (3) Thấp: form public không throttle theo IP; `ilike` coi `_`/`%` là wildcard. (4) Thấp: trả nguyên `error.message` Supabase; không khóa đăng nhập ở tầng app. **Cần xác nhận trên prod:** Auth signup đã tắt, JWT TTL, rate-limit.
- Chưa rà: `bang-kiem` import/write, master-data `gateway.ts`/`validation.ts`, `cssd-bo-bootstrap`, RLS các migration còn lại.

## ⑥ Roadmap 30/60/90 và tiêu chí «dứt điểm»

Module đầu tiên đề xuất: **VST + GSC + thống kê** (đã có người dùng thật).
- **30 ngày:** (a) từ điển KPI + spec chống lệch RPC/TS + tính tay ≥ 3 KPI (PO giữ cả hai nguồn, ⑦ câu 3); (b) sửa must_change_password; (c) diff migration theo nội dung, rồi mới lập danh sách áp lên prod qua MCP theo thứ tự trong báo cáo 11-05 §9 (PO duyệt từng cái); (d) xoá file chết theo danh sách cụ thể PO duyệt (⑦ câu 2).
- **60 ngày:** (a) trang thống kê «Vệ sinh tay» theo bố cục ③; (b) VST/GSC kiểm mobile + a11y cơ bản; (c) PoC `data-access` cho VST.
- **90 ngày:** (a) GSC theo chuyên đề ②–④ nếu có dữ liệu; (b) chuẩn bị mở CSSD (module kế tiếp theo CLAUDE.md): xác định khoa CSSD thật + kịch bản tay; (c) đánh giá lại usage prod để quyết thứ tự các module còn lại.
- **Tiêu chí «dứt điểm»** (khớp Pilot DoD trong CLAUDE.md): ≥ 1 nhóm người dùng thật xác nhận · ≥ 3 kịch bản tay có ghi kết quả · KPI khớp tính tay · `verify:engineering` pass · không còn finding Cao mở.

## ⑦ Câu hỏi PO (mặc định nếu PO im = giữ nguyên hiện trạng, không làm gì)

1. Dồn nguồn lực 90 ngày vào VST+GSC+thống kê, sau đó CSSD (giữ đúng thứ tự CLAUDE.md), NKBV/QLCV/Đào tạo ưu tiên thấp? **Không có mặc định — chờ PO.** (Nếu im: giữ nguyên hiện trạng.)
2. Xoá file chết (danh sách chốt bằng script, đã loại false positive)? **Mặc định: không xoá gì cho đến khi PO xem danh sách.**
3. Công thức KPI dùng một nguồn RPC, bỏ bản TS? **Mặc định: giữ cả hai, thêm spec lệch (hiện trạng); mục 30 ngày (a) chỉ chạy nếu PO chọn «một nguồn».**
4. `ty_le_ccs` (deprecated) có cắt (cần migration)? **Mặc định: giữ; ⑥ không cắt.**
5. Ngưỡng 85/70, 80, 90/85: căn cứ từ đâu? **Mặc định: giữ nguyên, ghi «chưa có căn cứ» trong từ điển.**
6. Xác nhận trên prod (Supabase Dashboard hoặc MCP): signup tắt? JWT TTL? **Mặc định: coi như chưa an toàn cho đến khi xác nhận.**
7. Số QT lệch giữa docs app (VST = QT.07) và kho (QT.06): theo kho? **Mặc định: theo kho, sửa docs khi chạm.**
8. Các quy trình chưa có chỗ trong app (QT.01, 02, 04, 05, 09, 34, 35, 36; sổ chất thải/đồ vải/AIIR/phơi nhiễm/máy rửa): có đưa vào lộ trình? **Mặc định: không trong 90 ngày.**
9. Chuyển nền tảng khỏi Supabase: có kế hoạch thật hay chỉ giữ khả năng? **Mặc định: chỉ làm adapter VST (PoC), không di chuyển.**

### Quyết định PO (2026-11-06)

1. Duyệt: 90 ngày đầu dồn VST+GSC+thống kê, sau đó CSSD; NKBV/QLCV/Đào tạo ưu tiên thấp.
2. Duyệt mặc định: không xoá file chết cho đến khi PO xem danh sách cụ thể.
3. Duyệt mặc định: giữ cả hai nguồn công thức (RPC + TS), thêm spec chống lệch — **không** bỏ bản TS; mục ⑥ 30 ngày (a) chỉ còn «từ điển KPI + spec lệch + tính tay ≥ 3 KPI».
4. Giữ `ty_le_ccs`. 5. Giữ nguyên ngưỡng, ghi «chưa có căn cứ» trong từ điển.
6. Duyệt mặc định: coi Auth prod chưa an toàn cho đến khi xác nhận (signup, JWT TTL, rate-limit).
7. Số QT lấy từ thư mục soạn quy trình (bản xuất Word) làm chuẩn; sửa docs app khi chạm.
8. Mặc định 0: không đưa quy trình thiếu vào lộ trình; chỉ xét sau khi xong các việc trước.
9. Chỉ giữ khả năng độc lập nền tảng: làm adapter (PoC VST), không di chuyển.

## Phụ lục — chưa kiểm / giới hạn

Số hàng prod là ước lượng thống kê (`n_live_tup`). Local ≠ prod (53/61 bảng local rỗng; câu hỏi Đào tạo local 6.000 vs prod 787). Finding từ agent ở các trục A/B/C/E/G/H/I chưa tự xác minh từng dòng, trừ mục đã đánh ✔ hoặc reviewer Đợt 3 đã chạy lại (216.654 dòng, 52 page, 114 script/0 trỏ mất, CSSD 39.176, `.from()`/RPC VST/GSC/NKBV, 82 migration 10/2026, `supervision-trend.ts` lọc tong>0, Wilson `supervision-percent.ts:74`, `must_change_password` không có trong `proxy.ts`). Số prod chưa đo lại. Chưa chạy `npm test`. Đợt 3: 1 vòng `review-bv103` đã xong (single round theo quy tắc); vòng sau chỉ khi có commit mới.
