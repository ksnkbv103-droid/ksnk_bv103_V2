# 03 · Tiến độ đã thực hiện và thực trạng

> **ĐÃ DUYỆT bởi PO 2026-11-16 (bản gốc)** · ảnh chụp 2026-11-15 · nhánh `integrate/2026-11` · HEAD `1333d47e` · nền so sánh `origin/main` = `ae64317c`.
> Bộ 3 file: [01-tong-quan-yeu-cau-lo-trinh.md](01-tong-quan-yeu-cau-lo-trinh.md) (vì sao · cái gì · làm thế nào · lộ trình) · [02-nghiep-vu-domain.md](02-nghiep-vu-domain.md) (nghiệp vụ, domain) · **03** (file này: đã làm, thực trạng, số đo kèm lệnh đo lại).
> Nhãn: «cần kiểm» = nguồn không nói rõ hoặc chưa đo lại · `[ĐỀ XUẤT]` = chưa PO chốt · số lệch nhau thì số đo lại bằng lệnh ở §3 thắng.
> Gom theo yêu cầu PO 2026-11-15; nằm ngoài `docs/core`, đã xếp lớp 6 trong `docs/README.md` (PO 2026-11-16; 01 §6.5 mục 6).

## 0. Cách đo lại

- Chạy ở gốc repo (worktree `integrate-2026-11`), shell zsh. Nền so sánh luôn là `origin/main`; không dùng `main` cục bộ (`7f7bfd19`, tụt 15 commit).
- Đếm commit bằng `--no-merges`. Một commit đếm cho mọi module nó chạm, nên các hàng module ở §3.2 không cộng được thành tổng.
- Mốc «từ 11-13» luôn viết `--since='2026-11-13 00:00'`. Viết `--since=2026-11-13` (không giờ) thì git lấy giờ hiện tại làm giờ cắt và số trôi (ba lần đo ra 88, 84, 82).
- «Chỉ quy trình» = commit mà mọi file đổi nằm trong `.claude/`, `docs/`, `scripts/`, `.github/`, `package.json`, `package-lock.json` hoặc `*.md` ở gốc. Đo bằng C1 − C3 và C2 − C4. Pathspec phải viết thẳng trên dòng lệnh, không nhét vào biến: zsh không tách từ biến không nháy, lệnh từng cho 0.
- Lọc tên file có tiền tố 8 chữ số bằng `>=`; `>` đếm lệch ở file biên.
- «Chưa push» (C7) đếm so với `origin/integrate/2026-11`, upstream của nhánh. «Chưa có trong `origin/main`» (C1, C8) là khái niệm khác: production = `origin/main` (§5), nên mã đó chưa lên production.
- Số prod (§5) là ảnh chụp có ngày. MCP github, supabase, vercel chưa authorize nên không đo lại được.
- Bốn kiểu đánh số dễ nhầm: «lát KH-Lx» = L0 đến L6 của KH 2026-11-13 · «mức Lx» = thang sẵn sàng L0 đến L3 (roadmap §5) · «P0 đến P3» = giai đoạn của KH 2026-11-14 · «Pha 0 đến 6» = lộ trình ở 01 §6.3.
- Tái tạo đúng ảnh chụp 11-15: thay `origin/main..HEAD` bằng `ae64317c..1333d47e`. Sau commit của bộ này, mỗi số đếm commit tăng đúng 1 ở hàng nó thuộc (tổng, từ 11-13, chỉ quy trình, loại docs, chưa push 55 → 56); số theo module không đổi vì commit chỉ chạm `docs/`.
- HEAD đã tiến sau ảnh chụp. Đo lại 2026-11-16 tại `7869c9a3` (phiên khác thêm 8 commit: 6 `chore(dead-code)` gỡ file mồ côi, 1 `chore(scripts)` thêm `dead-code:scan`, 1 `docs(plan)` cho `.claude/plans/KH_APPKSNK_20261116_lam-gon-ma.md`; 40 file đổi, +703/−2.370): C1 426 · C2 115 · C3 250 · C4 58 · C7 63 · C8 4 · 437 · C10 giam-sat-nkbv 61.230 · C13 225.165 dòng, 439 spec · C19 308 · 48. Cùng lệnh, thay `HEAD` bằng `1333d47e`, ra đúng số ảnh chụp: C1 418 · C2 107 · C3 244 · C4 52 · C7 55 · C8 4 · 429 · C12 giam-sat-nkbv 12/28/44 và 0/15/16. Vì vậy số git và `src` ở §1 đến §3 là của `1333d47e`, và mức tăng đúng 1 ở dòng trên tính từ ảnh chụp. C10, C13 là `find` trên cây làm việc nên gồm cả sửa chưa commit của phiên khác (spec NKBV, bớt 2 dòng); cây git ở `1333d47e` ra 62.300 và 227.485.
- Hai số 55 (commit chưa push; commit chỉ quy trình từ 11-13) khác nghĩa, chỉ trùng giá trị.
- Chỉ ghi «đo lại ngày …» sau khi đã chạy lại lệnh thật.

## 1. Kết luận

- **Chạy thật chỉ có VST/GSC.** Prod khoảng 3,6 nghìn phiên VST và 1,4 nghìn phiên GSC (rà soát 11-10: 3.613 và 1.400; HANDOFF 11-12: 3.637 và 1.435). QLCV 0 việc, Đào tạo 1 lần thi, NKBV 1 phiếu hoặc sự kiện, CSSD 10 chu trình thử (§5 gắn ngày từng số). Theo `module:gate`, 4/5 module `CHƯA CÓ` đầu mối (giam-sat, nkbv, qlcv, dao-tao); CSSD có `<tên đầu mối>`. Roadmap dòng 66 ghi hàng VST+GSC là `Đã có`: lệch với gate, chờ PO (01 §6.5 mục 2).
- **Mã dồn vào module chưa có người dùng.** NKBV chiếm 27,4% dòng `src`, CSSD 21,5%, VST+GSC+hub 9,3%. NKBV có 44 commit chạm (12 feat, 28 fix); VST+GSC tối đa 29 (13 feat, 10 fix; cận trên vì đếm chồng; 31 nếu cộng hub). 418 commit trong 8 ngày lịch (11-08 đến 11-15); 42% chỉ chạm quy trình hoặc tài liệu; từ 11-13 00:00 là 55/107 (51%).
- **Prod lệch repo.** Tối đa 41 file migration chưa áp; một lỗi CAO về RLS danh tính còn mở (VST-025); NKBV-041 đã đổi hướng 11-17: không áp RLS chặn Hội đồng; 55 commit chưa push.
- Nguyên nhân và lộ trình: 01 §6.1 và §6.3. Việc kế: §8.

## 2. Thực trạng theo module

Mức theo thang L0–L3 của roadmap §5 (L1 = chạy thử có người dùng thật). Cột việc mở: số thứ nhất là sổ lỗi (`so-loi.mjs status`, C17), số trong ngoặc là số `module:gate` in (C18).

| Module | Mức (roadmap) | Việc mở: sổ (gate) | Dữ liệu prod (ảnh chụp) | Pha |
|---|---|---|---|---|
| VST + GSC | L1, vận hành thử có điều kiện (11-10) | 13 (5) | VST 3.613, GSC 1.400 phiên (rà soát 11-10); HANDOFF 11-12: 3.637 và 1.435 | 1, 2 |
| CSSD | L0, một số cổng L2 đã lên prod | 3 (3) | 10 chu trình thử (10-11 và 11-10) | 3 |
| NKBV | L0 | 8 (5) | 1 phiếu (10-11); 1 sự kiện (11-10) | 4 |
| QLCV | L0 | 0 (5) | 0 việc (10-11 và 11-10) | 5 |
| Đào tạo | L0 | 0 (6) | 1 lần thi (10-11 và 11-10); 787 câu hỏi (09-07) | 6 |
| Nền (MDM, RBAC, quản trị hệ thống) | không xếp mức | 1 (NEN-003); gate không có hàng này | nhân sự 36, khoa phòng 66 (11-12); vai ở §5 | 0, 1 |

`module:gate` (nguyên văn máy; tên đầu mối CSSD thay bằng `<tên đầu mối>`):

```
giam-sat  CHẠY_THỬ   đầu mối: CHƯA CÓ · mở: 5 · được phép: chỉ sửa lỗi người dùng báo / lộ dữ liệu
cssd      XÂY        đầu mối: <tên đầu mối> · mở: 3 · được phép: chỉ lát đã duyệt ở roadmap §5; spec đóng băng
nkbv      KHÁM_PHÁ   đầu mối: CHƯA CÓ · mở: 5 · được phép: chỉ thu thập (phỏng vấn, kịch bản tay); không mở lát tính năng
qlcv      XÁC_NHẬN   đầu mối: CHƯA CÓ · mở: 5 · được phép: chỉ thu thập + chốt ngưỡng mục 5; không mở lát tính năng
dao-tao   KHÁM_PHÁ   đầu mối: CHƯA CÓ · mở: 6 · được phép: chỉ thu thập (phỏng vấn, kịch bản tay); không mở lát tính năng
```

- Gate đếm «mở» lệch `so-loi.mjs status`: giam-sat 5 so với 13; nkbv 5 so với 8; qlcv 5 so với 0; dao-tao 6 so với 0; cssd 3 so với 3. Dùng `so-loi.mjs status` làm số chuẩn cho việc mở (01 §7); cột được phép của gate vẫn thắng khi mở lát (01 §6.2). Nguồn đếm của gate: «cần kiểm».
- Roadmap dòng 66 ghi đầu mối VST+GSC là `Đã có`, gate ghi `CHƯA CÓ`. Roadmap dòng 67 (CSSD) có tên cá nhân nên không chép sang bộ này.
- Điều đang chặn mỗi module (roadmap dòng 66–72):
  - VST/GSC: GS-1 (RLS đọc cần ma trận «ai xem gì», mức L2); e2e Playwright chưa chạy được vì thiếu Chromium.
  - CSSD: người đầu mối và máy quét. K1–K5 ở SSOT 18 đã chạy tay qua UI trên DB local do Claude chạy thay Tổ CSSD, PO chốt đạt 2026-11-01; chưa chạy trên prod hoặc bộ Đóng gói thật.
  - NKBV: HIS/LIS (L3) và đầu mối. Việc tới L1: ghi ca, danh sách, tỉ lệ; rules engine chỉ gợi ý, không chặn.
  - QLCV: câu QL-1 (quyền ghi chú, xóa cứng); PO đã chốt 2026-10-24, còn chặn hay không «cần kiểm».
  - Đào tạo: ba câu DT-2 (thi thử dùng chung ngân hàng và lộ đáp án; nộp trễ hơn 30 giây vẫn tính đạt).
- NKBV ở trạng thái `KHÁM_PHÁ` mà cả khoảng có 12 commit `feat` chạm; từ 11-13 00:00 là 0 feat, 15 fix (§3.2).
- Ngày của cột dữ liệu prod: CSSD, NKBV, QLCV, Đào tạo có hai ảnh chụp cùng giá trị, roadmap dòng 64 (prod 2026-10-11) và bản `95d2bbe0` dòng 107 (rà soát 2026-11-10). VST/GSC chỉ có số ở dòng 107 đó và HANDOFF 11-12.

Điểm cơ học của `module:audit` (output nguyên văn; công cụ không in điểm):

```
giam-sat  thiếu: — · cần chấm: 1,2,5,9,10
cssd      thiếu: — · cần chấm: 5,8,9,10
nkbv      thiếu: — · cần chấm: 1,2,5,8,9,10
qlcv      thiếu: — · cần chấm: 1,2,5,8,9,10
dao-tao   thiếu: — · cần chấm: 1,2,5,8,9,10
```

Điểm cơ học ở 01 §6.1 hàng 1 = 10 trừ số bước «cần chấm»: giam-sat 5 · cssd 6 · nkbv 4 · qlcv 4 · dao-tao 4. Các bước 1, 2, 5, 8, 9, 10 đều cần người dùng hoặc PO nên Claude không tự chấm được.

Nguồn: `docs/core/handover-roadmap.md` dòng 64–72; bản `95d2bbe0` dòng 107; C17, C18.

## 3. Số đo sống

Ảnh chụp 2026-11-15 (HEAD `1333d47e`). Cột Lệnh là mã trong khối §3.6.

### 3.1 Git (không merge, nền `origin/main`)

| Số | Giá trị | Lệnh |
|---|---|---|
| Commit chưa có trong `origin/main` | 418 | C1 |
| Trong đó từ 2026-11-13 00:00 | 107 | C2 |
| Có chạm file ngoài quy trình: cả khoảng · từ 11-13 | 244 · 52 | C3, C4 |
| Chỉ chạm quy trình hoặc tài liệu: cả khoảng · từ 11-13 | 174 (42%) · 55 (51%) | C1 − C3, C2 − C4 |
| Loại commit, cả khoảng | docs 116 · fix 114 · feat 100 · chore 62 · refactor 15 · test 5 · style 2 (cộng 414; 4 commit không bắt đầu bằng chữ thường) | C5 |
| Loại commit, từ 11-13 | docs 42 · fix 40 · chore 15 · feat 9 · test 1 (cộng 107) | C5 |
| Commit theo ngày | 11-08: 4 · 11-09: 7 · 11-10: 34 · 11-11: 168 · 11-12: 98 · 11-13: 57 · 11-14: 46 · 11-15: 4 | C6 |
| Chưa push (so với `origin/integrate/2026-11`) | 55 | C7 |
| `origin/main...HEAD` (trái · phải) | 4 · 429 (429 gồm cả commit merge) | C8 |
| Nhánh · worktree | 30 · 5 | C9 |

Bốn commit chỉ có ở `origin/main`: `ae64317c` (Merge PR #129 từ `chore/code-vs-ai-phase1`), `13d18d64`, `1543685a`, `330eeb7d`. Nhánh này chưa có chúng, nên `npm run impact` (thêm ở `330eeb7d`) chưa chạy được ở đây.

### 3.2 Module (15 thư mục `src/modules`)

| Module | Dòng | Spec | Cả khoảng (feat/fix/tổng) | Từ 11-13 00:00 (feat/fix/tổng) |
|---|---:|---:|---|---|
| auth | 658 | 2 | 0/2/2 | 0/0/0 |
| chat-thai-do-vai | 2.574 | 2 | 1/0/1 | 0/0/0 |
| cssd-erp | 36.239 | 54 | 15/27/52 | 0/11/11 |
| cssd-su-co | 12.573 | 20 | 4/11/18 | 0/3/3 |
| dao-tao | 5.918 | 5 | 3/11/15 | 0/3/3 |
| dashboard | 7.167 | 9 | 10/0/11 | 1/0/1 |
| dieu-hanh-khoa | 475 | 0 | 3/0/4 | 2/0/2 |
| entity-qr | 66 | 0 | 0/0/0 | 0/0/0 |
| giam-sat-chung | 13.544 | 24 | 7/4/14 | 1/1/2 |
| giam-sat-hub | 261 | 0 | 2/0/2 | 0/0/0 |
| giam-sat-nkbv | 62.298 | 96 | 12/28/44 | 0/15/16 |
| giam-sat-vst | 7.451 | 21 | 6/6/15 | 3/3/7 |
| quan-ly-cong-viec | 15.588 | 27 | 5/3/8 | 0/0/0 |
| quan-tri-he-thong | 7.511 | 16 | 16/7/33 | 1/1/2 |
| to-chuc | 3.643 | 4 | 0/0/1 | 0/0/0 |

Lệnh: C10 (dòng), C11 (spec), C12 (commit).

- Toàn `src` = 227.483 dòng, 439 spec (C13). Cộng 15 module = 175.966 dòng, 280 spec; phần `src` ngoài `src/modules` = 51.517 dòng.
- NKBV 62.298 = 27,4% dòng `src`. CSSD (cssd-erp + cssd-su-co) 48.812 = 21,5%. VST + GSC + hub 21.256 = 9,3%.
- Xếp theo số commit chạm: cssd-erp 52, giam-sat-nkbv 44, quan-tri-he-thong 33. NKBV không phải module nhiều commit chạm nhất; điều nghiêng là tỉ lệ dòng mã và việc NKBV vẫn nhận fix sau 11-13 trong khi chưa có người dùng.

### 3.3 Sổ lỗi (`so-loi.mjs`, C17)

Dòng đầu của `status`: `Sổ lỗi: 156 dòng · mở 25 · đã sửa 109 · lỗi giả 14 · hoãn 8`.

| Module | NGHIEM_TRONG | CAO | TRUNG_BINH | THAP |
|---|---|---|---|---|
| VST_GSC | 0/0 | 1/7 | 9/12 | 3/8 |
| CSSD | 0/1 | 0/6 | 2/17 | 1/11 |
| NKBV | 0/0 | 1/11 | 6/17 | 1/12 |
| QLCV | 0/0 | 0/0 | 0/5 | 0/1 |
| DAO_TAO | 0/1 | 0/0 | 0/8 | 0/6 |
| QUAN_TRI | 0/0 | 0/2 | 0/8 | 0/3 |
| NEN | 0/0 | 0/2 | 1/3 | 0/1 |

Mỗi ô là đang mở/tổng; bảng không tính 14 lỗi giả (142 + 14 = 156). Mở theo module: VST_GSC 13, NKBV 8, CSSD 3, NEN 1 (cộng 25). Mở theo mức: NGHIEM_TRONG 0 · CAO 2 · TRUNG_BINH 18 · THAP 5.

- Trạng thái (`stats`): `MOI 12 · DA_XAC_MINH 2 · LOI_GIA 14 · DANG_SUA 0 · DA_SUA 109 · HOAN 8 · CHO_PO 11`. Mở = MOI + DA_XAC_MINH + CHO_PO = 25.
- Tỉ lệ lỗi giả 14/123 việc đã đóng (11,4%). Việc kế theo `stats`: xác minh 12 · sửa 2 · chờ PO 11. `DA_SUA` có test hoặc migration trong commit: 85/109.
- Kịch bản tay: `CHUA 7 · DAT 40 · KHONG_DAT 0`. Sổ không ghi ai chạy kịch bản tay, nên không kịch bản nào trong 40 `DAT` ghi là do người dùng thật chạy.
- Đã sửa theo ngày: 11-08: 1 · 11-11: 21 · 11-12: 49 · 11-13: 17 · 11-14: 15 · 11-15: 1 · không rõ ngày: 5 (cộng 109).

### 3.4 Quy trình và tài liệu

| Số | Giá trị | Lệnh |
|---|---|---|
| Dòng `src` (`.ts`, `.tsx`) · file spec | 227.483 · 439 | C13 |
| File có `use server` · `page.tsx` | 152 · 65 | C14 |
| npm script · e2e spec | 121 · 5 | C14 |
| File `.md` trong `docs/` (không tính `docs/bo-tai-lieu`) · `.md` ở gốc | 70 · 10 | C15 |
| `docs/core/handover-roadmap.md` | 25.483 byte, đạt mục tiêu 25KB (cắt 2026-11-18; trước đó 65.888) | C15 |
| `HANDOFF_APPKSNK.md` · `SO_NO_APPKSNK.md` | 46 dòng (trần 40) · 44 dòng | C15 |
| Đo việc mở của `wip.py` | 4 mục `VƯỢT` (khối dưới) | C16 |

Năm e2e spec: `mdm-gsc-header`, `gsc-vst-supervision`, `cssd-workflow`, `pilot-smoke`, `qlcv-pilot`.

`wip.py` (nguyên văn):

```
== integrate-2026-11 (nhánh integrate/2026-11)
  file chưa commit            3
  commit chưa push           55  VƯỢT (trần 20)
  nhánh chưa gộp             15  VƯỢT (trần 3)
  worktree                    5  VƯỢT (trần 2)
  file HANDOFF*.md            1
  HANDOFF gốc (dòng)         46  VƯỢT (trần 40)
  SO_NO (dòng)               44
  lát ĐANG LÀM                1
  => 4 mục VƯỢT (cảnh báo): ưu tiên đóng bớt trước khi mở việc mới — commit / gộp / bỏ có ghi lý do; push thì chờ người dùng gõ «push».
```

- «File chưa commit 3» tính lúc đã có file 01 (cộng hai file sửa dở của phiên khác, §7 mục 6).
- «Lát ĐANG LÀM 1» là đếm nhầm: HANDOFF dòng 6 ghi không có lát đang làm. Script nằm ngoài repo và cấu hình luồng đang đóng băng nên không sửa.

### 3.5 Migration

| Số | Giá trị | Lệnh |
|---|---|---|
| File `.sql` trong `supabase/migrations` | 308 | C19 |
| Trong đó version từ `20261108` | 48 | C19 |
| Đã áp prod 2026-11-12 | 7 | §5 |
| Chờ áp (cận trên) | 41 = 48 − 7 | §5 |

### 3.6 Lệnh đo lại

```
C1  git log --no-merges --format=%h origin/main..HEAD | wc -l
C2  git log --no-merges --since='2026-11-13 00:00' --format=%h origin/main..HEAD | wc -l
C3  git log --no-merges --format=%h origin/main..HEAD -- . ':!.claude' ':!docs' ':!scripts' ':!.github' ':!package.json' ':!package-lock.json' ':(exclude,glob)*.md' | wc -l
C4  như C3, thêm --since='2026-11-13 00:00' sau --no-merges
    Chỉ quy trình = C1 − C3 (174) và C2 − C4 (55)
C5  git log --no-merges --format=%s origin/main..HEAD | grep -oE '^[a-z]+' | sort | uniq -c | sort -rn
    (cột từ 11-13: thêm --since='2026-11-13 00:00' sau --no-merges)
C6  git log --no-merges --format=%cs origin/main..HEAD | sort | uniq -c
C7  git rev-list --count '@{u}..HEAD'
C8  git rev-list --left-right --count origin/main...HEAD
C9  git branch | wc -l ; git worktree list | wc -l
C10 find src/modules/<m> \( -name '*.ts' -o -name '*.tsx' \) -print0 | xargs -0 cat | wc -l
C11 find src/modules/<m> \( -name '*.spec.ts' -o -name '*.spec.tsx' \) | wc -l
C12 git log --no-merges --format=%s origin/main..HEAD -- src/modules/<m> | grep -cE '^feat'
    (đổi '^feat' thành '^fix'; thay grep bằng wc -l cho tổng; cột từ 11-13: thêm --since='2026-11-13 00:00' sau --no-merges)
C13 find src \( -name '*.ts' -o -name '*.tsx' \) -print0 | xargs -0 cat | wc -l
    find src \( -name '*.spec.ts' -o -name '*.spec.tsx' \) | wc -l
C14 grep -rl 'use server' src --include='*.ts' --include='*.tsx' | wc -l
    find src -name 'page.tsx' | wc -l
    node -p "Object.keys(require('./package.json').scripts).length"
    ls e2e/*.spec.ts | wc -l
C15 find docs -name '*.md' -not -path 'docs/bo-tai-lieu/*' | wc -l
    ls *.md | wc -l
    wc -c < docs/core/handover-roadmap.md
    wc -l < HANDOFF_APPKSNK.md ; wc -l < SO_NO_APPKSNK.md
C16 python3 -I ~/.claude/scripts/wip.py
C17 node scripts/readiness/so-loi.mjs status ; node scripts/readiness/so-loi.mjs stats
C18 npm run module:gate ; npm run module:audit
C19 ls supabase/migrations/*.sql | wc -l
    ls supabase/migrations/*.sql | awk -F/ '{print $NF}' | awk '$0 >= "20261108"' | wc -l
C20 git merge-base --is-ancestor <hash> origin/main   (thoát mã 1 = chưa trong origin/main)
```

Nguồn: các lệnh trên; `scripts/readiness/so-loi.json` (qua `so-loi.mjs`).

## 4. Đã làm theo mốc

| Ngày | Mốc | Bằng chứng |
|---|---|---|
| 10-09 | PO khóa quy tắc VST: rửa/chà ≤2 thời điểm WHO, bỏ sót = 1, năm mốc một hàng, xóa phiên mềm | `CLAUDE.md` mục Khóa PO |
| 10-12 | Mục tiêu triển khai TẤT CẢ module, thay lệnh đóng băng cùng ngày | `CLAUDE.md` mục Kỷ luật |
| 10-24 | Thang sẵn sàng L0–L3; đối soát chỉ số VST trên DB local: RPC khớp tính tay, 39 khoa 0 lệch | roadmap dòng 81; `docs/modules/giam-sat/README.md:111` |
| 11-08 | VST-003 `20261108100000` (RLS đọc phiên VST theo phạm vi) | sổ lỗi; §5 |
| 11-09 | Thử tay CSSD L1/L2 trên DB local | `21579fed` |
| 11-10 | Tuần 0: production = `origin/main`; PR #125 `86f5b55b` và #126 `11515851`; role `ci_migration_reader` NOLOGIN; `main` chưa có branch protection (ảnh chụp 11-10) | roadmap; HANDOFF |
| 11-11 | 168 commit, 21 lỗi sửa; migration CSSD bộ tổng và AR (local) | C6, C17 |
| 11-12 | 98 commit, 49 lỗi sửa; PO ra lệnh áp prod 7 file | `git show ae5ca6fd:HANDOFF.md` dòng 22–32 |
| 11-13 | 57 commit, 17 lỗi sửa; KH 11-13 duyệt; PO chốt CSSD-017 (ủ BI ≥20 phút), NKBV-023 (ẩn ca chốt = ADMIN + lý do), NKBV-026 (LOA tính ở máy chủ); DT-016 sửa `d1ab156f` | plan KH 11-13; HANDOFF |
| 11-14 | 46 commit, 15 lỗi sửa; KH 11-14 mở P0–P3; 9 migration `20261114*` (local) | plan KH 11-14; §5 |
| 11-15 | 4 commit trước bộ này, gồm CSSD-036 `67beb5bb` (thẻ kho xếp và tính tồn theo ngày duyệt) và `1333d47e` (lịch sử ngăn kéo in ngày hiệu lực; HEAD) | C6 |

### Lát của KH 2026-11-13 (L0–L6)

| Lát | Ngày | Hash | Nội dung | Trạng thái (theo plan, chưa chạy lại) |
|---|---|---|---|---|
| KH-L0 | 11-13 | `33eab631` | lệnh `npm run trace` và mã truy vết đầu tiên | xong |
| KH-L1 | 11-13 | `66013e64` | lý do sửa/xóa ≥10 ký tự theo R1.24, R1.25; test T1.02, T1.04; `trace` vào `verify:changed` | xong |
| KH-L2a | 11-14 | `8c1755fa` | bảng `ksnk_dm_tham_so` và `fn_ksnk_tham_so` | local; chưa lên prod |
| KH-L2b | 11-14 | `36575103` | root layout đọc `ksnk_dm_tham_so` mỗi request, `applyThamSo` đặt ngưỡng cho mọi màn VST/GSC/BCTH | kiểm tay trên local |
| KH-L2 | 11-14 | `e44cfd4b` | màn thêm tham số theo ngày hiệu lực, chỉ ADMIN, chỉ thêm dòng (`/quan-tri-he-thong/tham-so`) | thử tay local 3/3 đạt; chưa thử ca trùng ngày (mã lỗi 23505) |
| KH-L3b-2a | 11-14 | `b12c0b83` | xóa muộn phiên VST qua yêu cầu chờ chủ nhiệm khoa duyệt; migration `20261114110000_vst_yeu_cau_dieu_chinh`; kèm sửa `findActiveVstObservations` (lọc cột `is_active` không tồn tại, lỗi 42703), có test | local; chưa lên prod |
| KH-L3b-2b | không thấy commit | SỬA muộn | không tìm thấy commit khi grep; plan chưa cập nhật | «cần kiểm» |
| KH-L4a | 11-14 | `4112f920` | bảng `cssd_dm_me_chuyen_tiep`: 20 cặp từ→đến của `trang_thai_me` lấy từ RPC thật, kèm trigger chặn chuyển ngoài bảng hoặc chuyển về NULL; migration `20261114120000` | local; test `scripts/sql/kiem-cssd-me-chuyen-tiep.sql` 4 ca PASS; vitest cssd-erp 50 file, 273 test pass |
| KH-L4b | 11-14 | `fd158e6d` | thu hồi kiểm trạng thái mẻ nguồn; migration `20261114130000` | local |
| KH-L5 | — | — | NKBV: đo R của M03 | «cần kiểm» (không có bằng chứng hoàn thành) |
| KH-L6 | 11-14 | `9b6342ec` | `/chay-lien-tuc` và danh sách đề xuất gom 121 npm script về 38 | chưa xóa gì; chờ PO xem `[ĐỀ XUẤT]` |

- Cả 19 hash của bảng này, của lát RLS ở dưới, của CSSD-036 và của `/chay-lien-tuc` đã kiểm bằng C20: đều chưa nằm trong `origin/main`. Migration của các lát chưa áp prod (§5).
- KH-L4a: 10/20 cặp trái đặc tả M05 §4.1 nhưng đúng với code đang chạy (`rpc_cssd_me_thu_hoi` không kiểm trạng thái mẻ gốc, ghi `THU_HOI` và `QC_KHONG_DAT` từ mọi trạng thái; `THU_HOI` → `QC_KHONG_DAT` là chuyển ngược). Quyết định: cho phép và ghi chú, siết ở KH-L4b. Chưa có `NGAT`, `HUY`, `CHO_DUYET`, `DA_TAI_XU_LY`, trạng thái lô `S_LO`, RPC chuyển trạng thái duy nhất. Prod: chạy SQL kiểm ở cuối migration trước khi áp.
- Plan KH 11-13 dòng 3 liệt kê «Xong: L0, L1, L3b phần độ dài lý do, L2a, L2b…». Việc KH-L3b (phần độ dài lý do) có thể trùng `66013e64`: «cần kiểm».
- Việc RLS đã sửa ở local (chỉ DB local, chưa áp prod; đều 11-14): `d9872d6b` VST-015; `d0fb8962` VST-026 (probe 61 OK, 0 LECH); `736defba` VST-023; `a5cc1daf` NKBV-032; `fb96ee75` NKBV-034; `6807091d` NKBV-035 (migration `20261114180000`, probe 74 OK); `8f50a014` NKBV-039; `2ea9c6b4` NKBV-040.

### Giai đoạn P0–P3 của KH 2026-11-14

| Giai đoạn | KH ghi lúc lập | Số hiện tại |
|---|---|---|
| P0 hoàn thiện | 15 việc mở (thứ tự `next` lúc đó: CSSD-036, CSSD-032, VST-020, …) cộng 7 kịch bản tay; CHO_PO 11 | sổ nay 25 mở, kịch bản tay `CHUA` 7, CHO_PO 11 (C17); CSSD-036 đã `DA_SUA` ở `67beb5bb` |
| P1 rà mẫu in và lưu trữ | ánh xạ 12/57 mẫu đã rà (5 hai phía, 6 một phía, 1 không áp dụng), 45 chưa rà; bước 3 xong 12/12 | bước 2 mới chạy cho VST/GSC; 4 module còn lại chưa chạy |
| P2 đối chiếu 5 tài liệu kho tri thức | 0/5 | chưa bắt đầu |
| P3 module bổ sung | khóa | khóa |

- P1 bước 2 (VST/GSC), bốn phép có kết luận: in lại `MỘT PHẦN` (VST-024); xóa mềm `ĐẠT`; xuất theo vai trò `MỘT PHẦN` (VST-023); đầu/cuối trang `MỘT PHẦN`. Phép thứ năm có kết quả nghĩa chưa rõ nên không chép vào đây. Số đo của VST-023 và VST-024 là DB local: 18/1176 phiên có ảnh chốt mẫu; 562/1156 phiên chưa chốt có tiêu chí không còn trên mẫu; prod chưa đo.
- P1 bước 3: xong 12/12, ba chỗ vào sổ (NKBV-030 hai vị trí, NKBV-031). Ánh xạ mẫu in nằm ở `scripts/readiness/mau-in-anh-xa.json`.
- KH 11-14 §7 đã cũ so với sổ (việc kế CSSD-036; 15 so với 25 mở): dùng số của sổ (C17).

Nguồn: `.claude/plans/KH_APPKSNK_20261113_dung-lai-theo-dac-ta.md` dòng 3; `.claude/plans/KH_APPKSNK_20261114_doi-chieu-nguon-va-mo-rong.md` §5–§7; `git show -s` cho từng hash; C6, C17, C20.

## 5. Prod và local

- Production = `origin/main` (Tuần 0, 11-10). Migration prod đi qua MCP `apply_migration`; `mdm:migrate` lên prod bị chặn. Local áp bằng `npm run mdm:migrate:local`.
- Vercel prod đang ở `d147bda2` (2026-11-02) theo roadmap bản `95d2bbe0` dòng 107: đề xuất chờ PO duyệt, chưa có hiệu lực; sha đang chạy thật «cần kiểm».

### 7 file đã áp prod 2026-11-12 (PO ra lệnh)

| File local | Version trên prod |
|---|---|
| `20261108100000_gstt_session_read_scope_rls` (VST-003) | `20261112022506` |
| `20261109100000_cssd_loai_bao_goi_mac_dinh_tach_eo` | `20261112023859` |
| `20261110120000_cssd_loai_ong_kinh_khong_chiu_nhiet` | `20261112023920` |
| `20261111090000_revoke_public_create_on_schema_public` | `20261112023930` |
| `20261110115000_khu_vuc_giam_sat_chuan_9` | «cần kiểm» |
| `20261110130000_khu_vuc_giam_sat_theo_mo_hinh_khoa` | «cần kiểm» |
| `20261110140000_khu_vuc_xu_tri_ban_dau_phong_mo_b05` | «cần kiểm» |

Ba file `khu_vuc_*` kèm 6 bảng sao lưu `zz_sao_luu_20261112_*`. HANDOFF 11-12 nêu số dòng của 5 bảng (tên rút gọn theo HANDOFF): `vst_sessions` 3.637 · `chung_sessions` 1.435 · `vst` 33.421 · `nhan_su` 36 · `khoa_phong` 66.

### Chờ áp (tối đa 41 file, C19)

| Dải version | Số file | Nội dung |
|---|---:|---|
| `20261110*` | 3 | `044338_cssd_kho_nhap_moi_dau_so_luong`, `100000_ci_migration_reader_role`, `110000_cssd_incident_void_atomic` |
| `20261111100000` đến `140000` | 6 | `100000_cssd_bo_tong_thanh_phan_hieu_luc`, `110000_..._hardening`, `120000_..._readers`, `125000_..._tien_s2`, `130000_..._chuyen_du_lieu`, `140000_..._hardening_2` |
| `20261111150000` đến `150400` | 5 | AR-1 CHU_NHIEM_KHOA (`150000`), AR-5d hóa chất/thiết bị approve (`150100`) và trigger (`150200`), AR-7 MDM registry (`150300`), AR-8h (`150400`) |
| `20261111160000` đến `200000` | 5 | `160000` CSSD nhật ký ghi actor; `170000` NKBV fact SELECT RLS theo phạm vi khoa; `180000` VST-006 policy admin; `190000` QLCV-002; `200000` QLCV-003 |
| `20261112090000` đến `200000` | 12 | NKBV-011 (`090000`), NKBV-008 (`100000`), QLCV-005 (`110000`), DT-006 (`120000`), CSSD-006 (`130000`), QLCV-007 (`140000`), DT-005 (`150000`), CSSD-003/013 (`160000`), QT-010 (`170000`), DT-009/010 (`180000`), NKBV-017 (`190000`), CSSD-020 và NKBV-020 (`200000`) |
| `20261113100000` | 1 | QLCV-010 |
| `20261114*` | 9 | tham số KSNK (`100000`); yêu cầu điều chỉnh VST (`110000`); CSSD mẻ chuyển tiếp trạng thái (`120000`); thu hồi kiểm trạng thái (`130000`); đổi tên 6 bộ vi phẫu (`140000`); RLS VST CNK và HĐ (`150000`, `160000`); RLS GSC HĐ (`170000`); RLS NKBV HĐ identity (`180000`) |

Khớp HANDOFF 11-13: 31 + 1 + 9 = 41. Số chính xác và «prod chạy sha nào» đều «cần kiểm»:

- Prod có thể đã có vài file dưới version khác: `20261110100000` (role đã có từ Tuần 0) và `20261110110000` NEN-003 (prod ghi `20261110063506`).
- File trước `20261108` chưa áp: HANDOFF không nêu, «cần kiểm».
- Đo bằng `list_migrations` sau khi PO authorize MCP supabase.

### Thứ tự áp lô RLS và điều kiện kiểm

- Thứ tự (KH 11-14 §6–§7, sổ VST-025): VST-003 `20261108100000` → `20261114150000` (VST-015) → `20261114160000` (VST-026) → `20261114170000` (VST-023, GSC; cuối lô VST-025). `20261114180000` (NKBV-035) KHÔNG áp: PO 11-17 (K5, «sửa P3») cho Hội đồng thấy danh tính; file đã gỡ khỏi repo (NKBV-041, `aecd3eb6`). Các file RLS `150000/160000/170000` không có BEGIN/COMMIT nên chỉ áp qua MCP `apply_migration`, không dùng psql autocommit.
- Mâu thuẫn VST-003: HANDOFF 11-12 ghi đã áp (`20261112022506`), sổ VST-025 ghi chưa: «cần kiểm» bằng `list_migrations`.
- NKBV-011 `20261112090000`: kiểm mọi ADMIN đã gắn `mdm_nhan_su` trước khi áp. NKBV-008 `20261112100000`: sau khi áp, kiểm `proacl` chỉ còn `service_role`. DT-006 `20261112120000`: không deploy mã trước khi áp (prod chưa có cột `huy_*`).
- AR-8h (`20261111150400`, bỏ khóa `DANH_MUC`, `DANH_MUC_GSTT`, `DANH_MUC_CSSD_LOOKUP`, giữ `DANH_MUC_ORG`): áp cùng lúc deploy code, chạy 2 query kiểm trước, hỏi PO.
- NEN-003: mặc định `migration repair --status applied 20261110110000` trước lô.
- Thứ tự lô ở HANDOFF `ae5ca6fd` dòng 26 khác thứ tự version: dùng thứ tự version.
- Phòng PM1, PM2, PM3 (Phòng mổ 1–3) chỉ có ở DB local, đã `is_active=false`.

### Số liệu prod (ảnh chụp có ngày)

| Số | Ngày | Nguồn |
|---|---|---|
| VST 3.613 phiên; GSC 1.400 phiên; QLCV 0 việc; Đào tạo 1 lần thi; CSSD 10 chu trình thử; NKBV 1 sự kiện; đồ vải 0 | rà soát 2026-11-10 | roadmap bản `95d2bbe0` dòng 107 |
| NKBV 1 phiếu; CSSD 10 chu trình thử; QLCV 0 việc; Đào tạo 1 lần thi | prod 2026-10-11 | roadmap dòng 64 |
| `vst_sessions` 3.637; `chung_sessions` 1.435; `vst` 33.421; `nhan_su` 36; `khoa_phong` 66 | 2026-11-12 | HANDOFF 11-12 |
| vai ADMIN 1 · KHACH_THONG_KE_GSTT 1 · NHAN_VIEN_KSNK 19 (2 tài khoản không có hồ sơ nhân sự đang hoạt động) · MANG_LUOI_KSNK 0 | 2026-11-12 | HANDOFF 11-12 |
| Đào tạo 787 câu hỏi (571 chọn một, 94 chọn nhiều, 76 Đúng/Sai, 46 sắp xếp); chưa có kỳ thi chính thức | 2026-09-07 | `docs/modules/dao-tao/domain-overview.md` |

Nguồn: HANDOFF `ae5ca6fd:HANDOFF.md` dòng 22–32 và `HANDOFF_APPKSNK.md` dòng 35; sổ lỗi (VST-025, NEN-003); KH 11-14 §6–§7; C19.

## 6. Quyết định treo PO

### 11 mục `CHO_PO` trong sổ lỗi

KH 11-14 §7 nói các mục này đủ mặc định, nhưng sổ chỉ ghi mặc định ở 3/11 (NEN-003, NKBV-041, NKBV-042). Bảng dưới là ảnh chụp 2026-11-14; PO đã trả lời phiếu hỏi 2026-11-17, kết quả ở bảng kế tiếp (sổ lỗi còn 6/11 `CHO_PO`).

| Mã | Việc | Mặc định trong sổ |
|---|---|---|
| NEN-003 | `cssd_incident_void_atomic`: prod ghi version `20261110063506`, file local `20261110110000`; đẩy lên prod sẽ chạy lại file | `migration repair --status applied 20261110110000` trước lô; PO im thì lô prod chưa đẩy |
| CSSD-034 | Kho hóa chất: phiếu xuất đã `DA_DUYET` không có đường hủy hay đảo; sự cố có phiếu xuất không vô hiệu được | không ghi |
| VST-017 | mã biểu mẫu VST (`KSNK.QT.07.BM.01` đến `BM.03`) lệch quy trình hiện hành `KSNK.QT.06` (Vệ sinh tay); QT.07 trong kho tri thức là phương tiện phòng hộ | không ghi |
| VST-018 | bản in phiếu GSC/VST thiếu khối IV (khắc phục, hạn, chữ ký), dấu ● và dòng kết luận đạt/không đạt | không ghi |
| VST-019 | thời hạn lưu hồ sơ VST/GSC chưa mô hình hóa (`luu_tru_den`), không in trên biểu mẫu | sổ không ghi; KH 11-14 §6: app không in |
| VST-021 | xuất thô GSC có cột tên NV được quan sát và tên người giám sát; đặc tả yêu cầu xuất ẩn danh theo mặc định; chưa rõ xuất thô có thuộc ngoại lệ không | không ghi |
| VST-025 (CAO) | áp lô migration RLS đọc phiên VST lên prod (`20261108100000` rồi `20261114150000`); chưa áp thì CNK và HĐ gọi thẳng PostgREST còn đọc toàn viện kèm danh tính; mâu thuẫn HANDOFF 11-12: «cần kiểm» bằng `list_migrations` | không ghi |
| VST-028 | đặc tả R1.34 cần vai ĐDT/CN_KHOA lâm sàng xem danh sách có danh tính của khoa mình; RBAC chưa có vai này (`CHU_NHIEM_KHOA` là chủ nhiệm khoa KSNK) | không ghi |
| VST-031 | `CHU_NHIEM_KHOA` không có `GIAM_SAT_CHUNG:view` (chỉ GIAM_SAT_VST approve và view) nên không mở được GSC, dù đặc tả M02 cho TK_KSNK đọc toàn viện, sửa muộn và CNK ≡ TK_KSNK | không ghi |
| NKBV-041 (CAO) | ~~áp `20261114180000_nkbv_fact_select_rls_hoi_dong_identity.sql` lên prod~~: PO 11-17 (K5, «sửa P3») chọn KHÔNG áp, Hội đồng thấy danh tính; đã gỡ file này và probe khỏi repo, DB local (`aecd3eb6`) | đã chọn: prod giữ policy hiện hành |
| NKBV-042 | `ma_ca` nhúng 12 ký tự đầu của mã bệnh án (không phải mã giả hóa), nên NKBV-018 vẫn để lộ mã bệnh án cho người chỉ có quyền CSSD | giữ NKBV-018, chưa code che; PO im thì không đổi mã đã sinh |

### PO trả lời phiếu hỏi 2026-11-17

Phiếu 52 câu; PO trả lời 50, bỏ trống B2 (ngưỡng đúng từng chỉ số) và K1 (đầu mối NKBV). Câu trả lời nằm trong phiếu, không nằm trong mã; sổ lỗi ghi `ghi_chu` cùng ngày.

| Mã | PO trả lời (mã câu) | Sổ sau 11-17 | Việc kế |
|---|---|---|---|
| NEN-003 | Đồng ý sửa lịch sử migration rồi mới đẩy lô (P1) | `CHO_PO` | `migration repair` là thao tác prod: chỉ chạy khi PO ra lệnh trong lượt đó |
| CSSD-034 | Cho lập phiếu ngược, bắt buộc ghi lý do (C7) | `DA_XAC_MINH` | RPC và màn phiếu ngược, `migration-author`, local trước (grep đường đảo hiện 0 file) |
| VST-017 | «Dùng biểu mẫu đang có», không nêu mã (V4) | `CHO_PO` | chờ mã đầy đủ từng biểu mẫu: giữ `QT.07` app đang in hay mã của biểu mẫu giấy |
| VST-018 | Thêm chữ ký và dấu ● ở ô đã chọn; không chọn khối IV và dòng kết luận (V5) | `DA_XAC_MINH` | sửa bản in; không in kết luận đạt/không đạt |
| VST-019 | 1 năm (V6); không nêu căn cứ, không nói có in không | `CHO_PO` | chờ căn cứ và có in hay không |
| VST-021 | Xuất thô kèm cả hai tên (V7) | `HOAN` | giữ hiện tại |
| VST-025 | Duyệt áp lên prod (P2) | `CHO_PO` | cần lệnh trong chính lượt áp và MCP Supabase được cấp quyền qua `/mcp`; chạy truy vấn chỉ đọc ở `lenh_kiem` trước |
| VST-028 | Cần ĐDT/chủ nhiệm khoa lâm sàng xem danh sách có tên của khoa mình (N3) | `CHO_PO` | chờ tên vai riêng và người giữ vai (đổi quyền người dùng thật là cổng PO) |
| VST-031 | CNK được mở GSC, đọc toàn viện (N4) | `DA_XAC_MINH` | migration seed `GIAM_SAT_CHUNG:view` cho `CHU_NHIEM_KHOA`, local trước |
| NKBV-041 | K5: Hội đồng thấy danh tính; P3 sửa thành không áp sáu policy chặn Hội đồng | `DA_SUA` (`aecd3eb6`) | tầng app đã gỡ chặn (lát 1); lát 2: đã gỡ `20261114180000` + probe khỏi repo và DB local (policy đếm 0). KHÔNG áp prod |
| NKBV-042 | Không đổi gì (K6) | `HOAN` | giữ `ma_ca` và NKBV-018 như hiện tại |

### Cổng PO khác

- KH 11-14 §6: ngưỡng đạt bảng kiểm ≥90% (đồng bộ QT.32; app đọc từ `ksnk_dm_tham_so`, không viết cứng); mã mục kho tri thức chờ PO: X2.13, QT.32, R1.10, XM-2 (nội dung từng mã «cần kiểm»); đích thu hồi tái xử lý `DA_TAI_XU_LY` (Tiếp nhận hay Đóng gói); bốn quyết định đối chiếu nguồn; đưa `330eeb7d` vào nhánh này (§3.1); gán tài khoản thật cho `CHU_NHIEM_KHOA`. Đã trả lời 11-17: ngưỡng ≥90% (V9: «không cần con số, tính theo tỉ lệ tuân thủ», nên không cài ngưỡng đạt vào bản in); đích `DA_TAI_XU_LY` (C6: Trạm Tiếp nhận; ghi chú PO bị cắt ở «nếu dụng cụ h», chưa rõ điều kiện); người giữ `CHU_NHIEM_KHOA` (N6: Trịnh Hữu Nghĩa; gán tài khoản thật vẫn là cổng PO).
- NKBV-032, NKBV-034, NKBV-035, NKBV-039, NKBV-040: giả định Hội đồng KSNK tương đương BGĐ ở mức `Xa` vì M03 không có mã vai HOI_DONG; mặc định giữ cổng chặn danh tính, CNK loại trừ. PO 11-17 (K5, «sửa P3») thay mặc định này: Hội đồng thấy danh tính, tầng app không còn chặn (NKBV-041); hai spec của cổng (`nkbv-khoa-scope.spec.ts`, `nkbv-census-access.server.spec.ts`) đã đổi theo; các spec action khác mock cờ nên giữ nguyên.
- Ba câu QLCV (02 §6); đầu mối có tên (01 §6.5 mục 2); DT-008 (chưa thử tay); `chat-thai-do-vai` giữ hay gác (mặc định gác); danh sách 121 script → 38 chờ PO xem; mâu thuẫn tài liệu (02 §8). Đã trả lời 11-17: ba câu QLCV (02 §6); DT-008 do «nhân viên khoa KSNK» thử (D8; chưa có tên và ngày); đầu mối VST/GSC có tên (V1: Nguyễn Bá Hoài Việt, Trịnh Hữu Nghĩa). Đầu mối CSSD, QLCV, Đào tạo chỉ ghi theo vai, NKBV bỏ trống: chưa tính là đầu mối có tên. Còn mở: `chat-thai-do-vai`, 121 script → 38, mâu thuẫn tài liệu.
- Tổng hợp việc chỉ PO làm được và «nếu PO im»: 01 §6.5.

Nguồn: sổ lỗi qua `so-loi.mjs` (C17); KH 11-14 §6; roadmap dòng 101.

## 7. Nợ và ghi nhận ngoài lát

1. `src/components/shared/Header.tsx:72` (`sticky top-0 z-50`) và `src/components/shared/ClientLayoutWrapper.tsx:118` (`relative z-0 … pointer-events-auto`): Header dính `z-50` nằm trên ngăn kéo (`fixed inset-0 z-50` bị nhốt trong `main.relative z-0`) và phủ khoảng 44px đầu ngăn kéo. Ở viewport 1280, nút `In thẻ kho` (`kho-hoa-chat-drawer.tsx`) không bấm chuột được (`elementFromPoint` trả về `NAV`); Tab rồi Enter vẫn in được.
2. `src/modules/cssd-erp/views/KhoHoaChatKsnkPage.tsx:44-58`: `dmMovs` (khai báo dòng 44) không bị xóa khi mở mặt hàng khác; effect dòng 46–58 chỉ gọi `listGiaoDichKhoHoaChatAction({ limit: 200, dm_hoa_chat_id: openId, theo_ngay_hieu_luc: true })`. Hệ quả: ngăn kéo hiện `Chưa có phiếu.` khi mở lần đầu (đã thấy trên dev local :3012) hoặc phiếu của mặt hàng trước (suy từ code, chưa tái hiện); bấm `In thẻ kho` lúc đó in sai (suy từ code).
3. 7 kịch bản tay `CHUA` (ảnh chụp 11-13; số hiện tại 7 theo C17; danh sách tên hiện tại «cần kiểm»): CSSD-007 (cấp phát chấp nhận `p_nguoi_cap_phat_id` NULL), CSSD-008 (luân chuyển và loại biên có `p_nguoi_thuc_hien_id` null), CSSD-009 (đóng băng thủ công, ghi ngoại lệ lỗi), NKBV-007 (`updateNkbvViSinhStoreRecord` không qua zod), CSSD-012 (`releaseSetReconcileDraftAction` xóa cứng nháp, không kiểm chủ phiếu), NKBV-013 (`submitClinicalVerification` ghi `attributed_khoa_id` và `calculated_doe` từ client), DT-016 (6 action ghi Thi KSNK không qua `requireDaoTaoAdmin`; đã sửa `d1ab156f`). `so-loi.mjs tay` đang in lỗi nên số lấy từ `stats`.
4. Nợ của KH 11-13: `batchStatusAfterBiRecall` (`src/modules/cssd-su-co/domain/cssd-batch-recall.ts:117`; spec `cssd-batch-recall.spec.ts`) lệch hành vi SQL sau KH-L4b, chỉ spec dùng. `DA_TAI_XU_LY` chờ PO chốt đích.
5. `wip.py` đếm nhầm lát ĐANG LÀM (§3.4). `chay-lien-tuc.md` dẫn `npm run impact` mà nhánh này chưa có (§3.1). KH 11-14 §6 đã nêu việc đưa `330eeb7d` vào nhánh.
6. Sửa dở của phiên khác, không đụng, không stage: `src/modules/giam-sat-nkbv/lib/nkbv-loa-server.spec.ts` (theo KH 11-14: spec viết trước cho NKBV-026 bước 2, 7 ca đỏ vì mã nguồn chưa đổi; chưa chạy lại nên «cần kiểm») và `HANDOFF_APPKSNK.md` (theo KH 11-14: chỉ thêm dòng đã push `923901e6`). Mặc định theo KH 11-14: không đụng; nếu PO im thì `verify:changed` của module NKBV vẫn thoát mã 1 kèm tên file.
7. Tài liệu mâu thuẫn nhau ở `chay-lien-tuc.md`, `CLAUDE.md` và `KE_HOACH_TONG_THE_PHAT_TRIEN_KSNK.md`: danh sách mâu thuẫn ở 02 §8, việc chốt ở 01 §6.5 mục 5.

Nguồn: `SO_NO_APPKSNK.md` dòng 42–44 (mục 1–2); KH 11-13 (mục 4); KH 11-14 §6–§7 (mục 5–6).

## 8. ĐANG LÀM · KẾ · CẦN NGƯỜI

- **ĐANG LÀM:** không có lát nào của bộ này. Lát gom bộ 3 file đã đóng; PO duyệt 2026-11-16 (trả lời «Duyệt bộ 3 file» trong chat), đã ghi vào nhãn trạng thái của bộ. Lát lưu trữ bản cũ cũng đã đóng (PO «Đồng ý» 2026-11-16): bốn bản cũ mang nhãn «đã gộp vào bộ 3 file», không xóa, không di chuyển, không dịch dòng. Lát xếp lớp cũng đã đóng (PO «Xếp lớp» 2026-11-16): `bo-tai-lieu/` là lớp 6 trong bảng «Phân lớp» của `docs/README.md`.
- **KẾ** (tối đa 3; cổng vào và ra ở 01 §6.3):
  1. Pha 0 Đóng nền: gọn `HANDOFF_APPKSNK.md` về ≤40 dòng sau khi phiên khác chốt sửa dở; gộp `origin/main` khi cây sạch; PO quyết commit, nhánh, worktree dư.
  2. Pha 1 Prod khớp repo: chuẩn bị lô áp, đối chiếu phụ thuộc chéo giữa các nhóm migration bằng agent `db-verify`, chờ PO authorize MCP.
  3. Pha 2 VST/GSC L1: đầu mối có tên đã có (PO 2026-11-17, §6); cổng vào theo 01 §6.3.
- **CẦN NGƯỜI:** bảy việc ở 01 §6.5 (việc 6 nay chỉ còn quyết câu «Never tạo tài liệu thứ hai» của `CLAUDE.md`; duyệt bộ 3 file, đánh dấu bản cũ và xếp lớp `docs/` đã xong). Số commit chưa push đo bằng `python3 -I ~/.claude/scripts/wip.py`; `git push` chỉ chạy khi PO gõ «push».
- **CẦN NGƯỜI (lát làm gọn mã, ngoài bộ này):** `.claude/plans/KH_APPKSNK_20261116_lam-gon-ma.md` §9 — mọi lát đã chạy cục bộ (L0–L12b, L14a–c, Q13, L10, L3b, L4b, L7b, L3c), chưa push; PO «Đồng ý hết» 13 câu §7 và «Xóa cụm» `instrument-issue-core` (2026-11-16). Còn lại: (a) L13 chờ C3 (PO ủy quyền Supabase qua `/mcp`); (b) 7 cột mà L12a/L12b thôi dò (`cssd_fact_quy_trinh`: `is_dong_bang`, `quy_trinh_cha_id`, `ma_vai_tro_bo`, `is_red_alert`; `cssd_fact_su_co`: `quy_trinh_id`, `nguoi_bao_id`, `loai_su_co_id`) chưa kiểm trên prod, không deploy hai lát này trước Pha 1 hoặc trước khi truy vấn chỉ-đọc ở plan §9 trả đủ 7 hàng; (c) migration `supabase/migrations/20261116100000_drop_bang_muc_tieu_cu.sql` (phiên khác) chưa có lệnh áp prod của PO, chỉ áp khi PO ra lệnh, sau khi truy vấn kiểm ở plan §9 (Lệch 6) trả 0 dòng; (d) câu 12b (`NkbvChecklistKsnkTab.tsx`, `NkbvCdcMetricsPanel.tsx`) GIỮ chờ PO. Việc kế không cần PO: chạy tay UI duyệt phiếu đổi danh mục trên DB local.
- **Không làm:** theo 01 §6.4.
