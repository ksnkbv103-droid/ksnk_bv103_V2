# CAU_HOI_PO_APPKSNK — Câu hỏi chờ PO (một file duy nhất)

Cập nhật 2026-11-19 (đã xóa P1–P11 sau khi PO trả lời; đáp án ở sổ lỗi). Mọi câu cần PO nằm ở đây, mỗi câu có bối cảnh, lựa chọn, hậu quả và đề xuất. Câu đã trả lời: ghi đáp án vào sổ lỗi (`so-loi.mjs`), rồi xóa câu khỏi file này.

**Cách trả lời:** gõ trong chat theo mã, ví dụ «P12: đề xuất · C1: hỏi khoa rồi báo». Câu nào im thì mục «Nếu im» được áp dụng.

---

## P — Cần PO quyết để làm tiếp

### P12 · QT-017 phần 2 · Gán vai «Chủ nhiệm khoa» (CHU_NHIEM_KHOA) cho người thật bằng cách nào
- **Bối cảnh:** Vai này là vai cộng thêm, hiện 0 người giữ. Ô chọn vai trên trang Tài khoản nhân sự không có vai này (`rbac.types.ts:72-77`), vì lệnh gán ở đó thay toàn bộ vai cũ của người được chọn (`rpc_assign_staff_ksnk_role`), nên gán Chủ nhiệm khoa qua ô đó sẽ làm mất vai KSNK sẵn có của người ấy. Hệ quả: trên giao diện không ai gán được; các việc cần vai này (duyệt hóa chất/thiết bị, nghiệm thu QLCV, mở GSC cho khoa) chưa có người dùng thật.
- **Hỏi:** Gán vai này cho người thật bằng cách nào?
- **A.** PO ra lệnh gán một lần trên prod (SQL cộng thêm dòng vai, không bỏ vai cũ), cho người giữ vai theo ghi nhận N6 của lộ trình; không làm đường gán trên giao diện vì chỉ vài người.
- **B.** Làm đường gán «vai cộng thêm» trên giao diện (không thay vai cũ): 1 migration + RPC + màn hình, qua `review-bv103` vì chạm quyền.
- **Đề xuất: A** (ít file nhất, không đụng giao diện; dùng được ngay khi PO gõ lệnh).
- **Nếu im:** giữ hiện trạng, vai vẫn 0 người.
- **Mở khóa:** A → PO gõ lệnh gán, Claude soạn sẵn câu SQL chỉ-thêm; B → một lát theo CLAUDE.md (≥ 3 kịch bản tay, RPC apply local).
- **ID sổ:** QT-019 (tách từ QT-017)

### P13 · NEN-010 · Cổng tài khoản break-glass (email quản trị khẩn cấp) có cần kiểm email đã xác nhận không
- **Bối cảnh:** App coi email trong `KSNK_BREAK_GLASS_EMAILS` là ADMIN (`src/lib/auth/trusted-admin-email.ts:22`) mà không kiểm `email_confirmed_at`. Nâng quyền chỉ xảy ra nếu biến này được đặt và prod cho đăng ký/đổi email không cần xác nhận; repo không đo được cấu hình Auth prod. Sửa chạm ≥ 11 file (7 file auth + nơi gọi) và nằm ở `src/lib`, vượt trần 8 file/lát.
- **Hỏi:** (a) Prod: các tài khoản break-glass hiện có `email_confirmed_at` khác rỗng không (nếu rỗng, sửa sẽ khóa chính PO ra khỏi quyền ADMIN)? (b) Cho phép lát chạm `src/lib` và tách 2 lát (A ≤ 8 file, B 3–5 file)? (c) Chỉ kiểm `email_confirmed_at` hay cả `confirmed_at` (đăng nhập bằng SĐT)?
- **Đề xuất:** (a) PO hoặc MCP chỉ đọc chạy `select email, email_confirmed_at from auth.users where lower(email) = any(string_to_array(lower('<danh sách trong KSNK_BREAK_GLASS_EMAILS>'), ','))`; (b) có, tách 2 lát; (c) chỉ `email_confirmed_at`.
- **Nếu im:** giữ nguyên; mức THẤP, `fn_sys_is_admin()` không biết break-glass nên RLS vẫn đóng (fail-closed).
- **ID sổ:** NEN-010

### P14 · NEN-015 · Thêm khóa chạy đồng thời cho `scripts/db-dung.sh`
- **Bối cảnh:** `db-dung.sh` dùng cố định project id `ksnk_dd` (cổng 55620–55627); hai phiên chạy cùng lúc thì phiên sau tắt stack của phiên trước, phiên trước báo ĐỎ giả «No such container» (gặp 19/11 13:03).
- **Hỏi:** Thêm khóa bằng thư mục (`mkdir $TMP/ksnk_dd.lock`, thoát nếu đã có, `trap` xóa khi thoát) vào script, khoảng 10 dòng, không đổi hành vi khi chạy một phiên?
- **Đề xuất:** Có (một lát nhỏ, kiểm bằng chạy hai bản song song).
- **Nếu im:** giữ như hiện tại; quy ước «chỉ chạy khi `pgrep -f "bash scripts/db-dung.sh"` rỗng» vẫn ở `HANDOFF_APPKSNK.md`.
- **ID sổ:** NEN-015

---

## C — Hỏi khoa CSSD (đầu mối: Nguyễn Thanh Bình)

### C1 · CSSD-046 · Lưới Silicone JF941 hấp hơi nước được không
- **Bối cảnh:** Mỗi bộ tổng được tách thành bộ con -CN (chịu nhiệt, hấp hơi nước) và -KCN (không chịu nhiệt, tiệt khuẩn nhiệt độ thấp). Lưới Silicone JF941 trong bộ tổng C′ đang xếp ở -KCN.
- **Hỏi khoa:** Lưới Silicone JF941 có hấp hơi nước được không?
  - Có: chuyển sang -CN.
  - Không: giữ -KCN.
- **Đề xuất:** không có. Câu này chỉ khoa CSSD trả lời được.
- **Nếu im:** giữ -KCN.
- **Mở khóa:** Có → chuyển Lưới Silicone JF941 sang bộ con -CN; Không → giữ -KCN, đóng CSSD-046.
- **ID sổ:** CSSD-046

### C2 · CSSD-049 · Dụng cụ tiệt khuẩn bằng EO có cần thành bộ con riêng (-EO) không
- **Bối cảnh:** Đã chốt «Plasma = ETO» (`eb39b449`). Hiện dụng cụ tiệt khuẩn bằng EO nằm chung bộ con -KCN.
- **Liên quan:** lỗi CSSD-043 là hàm đồng bộ tách bộ làm mất bộ con -EO (phần a) và gán sai bao gói mặc định (phần b). Phần (b) đã sửa (`7d79bdec`); phần (a) chờ câu này. Nếu khoa trả lời **không cần tách**, phần «mất -EO» của CSSD-043 không còn là lỗi.
- **Hỏi khoa:** Ở khoa, dụng cụ EO và dụng cụ Plasma có đóng gói và lưu kho thành bộ riêng không?
  - Có: cần bộ con -EO, sửa CSSD-043 đủ hai phần.
  - Không: gộp vào -KCN, CSSD-043 chỉ còn phần bao gói mặc định.
- **Đề xuất:** không có. Câu này chỉ khoa CSSD trả lời được.
- **Nếu im:** -EO không tách, dụng cụ EO vẫn nằm trong -KCN; phần (a) của CSSD-043 chưa làm.
- **Mở khóa:** Có → làm CSSD-043 phần (a), đặt bộ con -EO; Không → gộp vào -KCN, đóng phần (a) của CSSD-043.
- **ID sổ:** CSSD-049 (liên quan CSSD-043)

---

## D — Lệnh prod/deploy (chỉ cần PO gõ lệnh; mọi thứ khác đã sẵn)

| Mã | Việc | Lệnh PO gõ | Trước khi chạy, máy sẽ tự kiểm |
|---|---|---|---|
| D1 | Deploy code lát B (ngăn kéo CSSD-034) và trang kế hoạch giám sát. Migration của hai phần này đã áp prod 19/11 | «deploy» | prod: vai NHAN_VIEN_KSNK có quyền GIAM_SAT_NKBV import |
| D2 | VST-043 · TC09: sửa câu trích QĐ 3651 trên prod. Một lệnh UPDATE `gstt_dm_bang_kiem`, `WHERE id = '9d3c00f2-eb9c-4edb-8ee7-bb0cfb0f6f9d'`, thay đúng cụm chữ cũ đứng trước «6 rõ», giống file seed `KSNK.QĐ.01.BM.01.json:60` | «áp TC09» | SELECT trước và sau, đúng 1 dòng đổi |
| D4 | QT-015 ý (3): đếm trên prod số tài khoản chỉ có cờ `must_change_password` ở `user_metadata` (không có ở `app_metadata`). Câu chỉ đọc: `select count(*) from auth.users where raw_user_meta_data->>'must_change_password'='true' and not raw_app_meta_data ? 'must_change_password'`. Local = 0; prod = 0 thì đóng ý này, > 0 thì sửa cổng | «đếm QT-015» (PO hoặc MCP chỉ đọc) | câu `select count(*)` chỉ đọc, không ghi |
| D5 | CSSD-041: prod có quy trình kẹt trên bộ tổng còn con active không (S2 đã áp prod, kế hoạch chỉ đo số dòng). Câu chỉ đọc: `select b.ma_bo, t.ma_tram, q.id from cssd_fact_quy_trinh q join cssd_dm_bo_dung_cu b on b.id=q.bo_dung_cu_id and b.parent_bo_id is null left join cssd_dm_tram t on t.id=q.tram_hien_tai_id where q.is_active and exists (select 1 from cssd_dm_bo_dung_cu k where k.parent_bo_id=b.id and k.is_active and k.vai_tro_tach in ('CHIU_NHIET','KHONG_CHIU_NHIET'))`. 0 dòng thì đóng CSSD-041; có dòng thì PO quyết hoàn thành hay hủy từng quy trình (xử lý dữ liệu, không cần migration) | «đếm CSSD-041» (PO hoặc MCP chỉ đọc) | câu `select` chỉ đọc, không ghi |
| D6 | CSSD-048 (PO 19/11 P7=Tắt): tắt đúng 68 bộ mẹ rỗng sau tách bộ nhiệt. Một lệnh UPDATE `cssd_dm_bo_dung_cu` đặt `is_active=false` cho đúng 68 bộ mẹ không còn dụng cụ (có thể bật lại) | «tắt 68 bộ» | SELECT count trước và sau, đúng 68 dòng đổi |
| D3 | Đẩy các commit local lên GitHub; CI `db-dung.yml` chỉ chạy sau bước này | «push» | `npm run verify` |

---

## N — Vận hành thử

### N1 · Cổng module NKBV (PO 19/11 đã trả lời Có: nâng lên XÂY)
- **Còn chờ:** cổng XÂY cần có tên đầu mối (hiện ghi «CHƯA CÓ»; xem N3) và không còn `[CẦN XÁC NHẬN]` ở mục 1 và 2 của `docs/modules/nkbv/van-de-nguoi-dung.md` (hiện mỗi mục còn 1 dòng). Có đủ hai thứ thì nâng trạng thái lên XÂY.
- **ID sổ:** NKBV-051

### N2 · Công tắc `KSNK_PILOT_FOUR_MODULES` trên Vercel (PO 19/11 đã trả lời Có)
- **Còn chờ PO tự làm:** bật công tắc trên Vercel và sửa mô tả `.env.example:23` (đang ghi «chặn CSSD», đã cũ). Claude không đọc, không sửa `.env*`.
- **ID sổ:** NEN-013

### N3 · Đầu mối từng module (PO 19/11: đợt thử đầu = VST/GSC + CSSD, đã ghi vào bảng «Người đầu mối»)
- **Còn chờ:** tên đầu mối (người thử và xác nhận kịch bản tay) cho VST/GSC, NKBV, QLCV và Đào tạo; hiện mới có CSSD (Nguyễn Thanh Bình). PO gõ tên từng module; tên ghi vào `docs/core/handover-roadmap.md` (bảng «Người đầu mối») và sổ. Chưa có tên thì chưa module nào được tính là «xong».
- **ID sổ:** NEN-014

**Việc PO tự làm** (không phải câu hỏi; không có dòng sổ riêng):

| Việc | Cách làm | Nếu không làm |
|---|---|---|
| Mở dashboard VST/GSC trên prod sau lô pha 1 (áp 17/11), nếu số liệu lệch thì báo | Mở dashboard trên prod | Số liệu lệch, nếu có, không ai thấy |
| Plugin `typescript-lsp` | Đã bật: `~/.claude/settings.json` có `"typescript-lsp@claude-plugins-official": true` (đo 19/11). Không cần làm gì | Không áp dụng |
| Plugin superpowers | Nếu còn bật: tắt trong mục Plugins của app (tắt toàn cục, chưa kiểm được có tắt riêng theo dự án không). Claude không đo được trạng thái bật/tắt hiện tại | Nếu còn bật, khối «EXTREMELY_IMPORTANT» tiếp tục được nạp mỗi phiên và chồng lên luồng `lam-het` (plan §12 #11) |

---

## M — Mặc định Claude đang chạy (im = giữ; muốn đảo thì nói mã, máy revert sha)

| Mã | Đang chạy | Đảo = revert |
|---|---|---|
| QLCV-010 | Người đề xuất không tự phê duyệt đề xuất của mình (trừ ADMIN) | `81eb1ae2` |
| QT-012 | Vai khách thống kê không được thi Đào tạo. Chặn ở app, quyền trong DB giữ nguyên | `146af592` |
| NKBV-018 | Người chỉ có quyền CSSD, khi tra ngược ca SSI theo mẻ, thấy mã ca và ngày nhưng không thấy họ tên bệnh nhân | `8b1bdfc1` |
| CSSD-017 | Giờ đọc chỉ thị sinh học (BI) được muộn hơn giờ bấm tối đa 2 phút (dung sai đồng hồ); ngưỡng ủ tối thiểu 20 phút theo PO 13/11 | `e7cdd053` |

Câu nhỏ còn treo trong nhóm này: **VST-013(a)**. Form VST chưa xếp khoa lâm sàng lên trước vì danh mục khoa chưa có trường đánh dấu khoa lâm sàng. Muốn xếp thì PO chỉ trường hoặc gửi danh sách khoa lâm sàng. Nếu im: giữ thứ tự hiện tại.

**Đã làm theo mặc định** (không hỏi PO; im = giữ; muốn đảo thì nói mục, máy revert sha hoặc sửa lại):

| Việc đã làm | Căn cứ | Đảo = |
|---|---|---|
| Đầu mối UAT (người chấm kịch bản tay) tạm ghi là Tổ giám sát KSNK | Giả định plan một con đường §9; `d8e758db` | PO nêu tên người khác ở N3 |
| `lam-het` giữ vai trò xương sống của luồng | Giả định plan §9 | Nói «bỏ lam-het»; sửa cấu hình luồng |
| `trace` (đối chiếu mã R/T) chỉ chạy local, không đưa vào CI | Giả định plan §9 | Nói «trace vào CI» |
| `SO_NO_APPKSNK.md` phân loại một lần ngày 19/11: dòng chuyển sang sổ lỗi, dòng đã xong, dòng đóng «không làm» vì không chặn verify; câu cần PO gom vào file này | `fbea3fb6` | Nói số dòng SO_NO cần mở lại |
| 200 dòng sổ lỗi cũ không điền `loai:"loi"`; thiếu `loai` thì mặc định là `loi` | `ea68c7d6` (tránh xung đột `so-loi.json` với phiên khác) | Chạy một lần điền `loai` cho dòng cũ |
| CSSD-043 phần (b): bộ con tách nhiệt nhận bao gói mặc định theo nhóm (CN → GIAY, KCN → TUI_EP) | `7d79bdec` | Revert `7d79bdec` |
| VST-038 lát A: ADMIN và NV KSNK kiêm MẠNG LƯỚI không bị khóa khoa ở in nhãn GSC và ô chọn khoa ở đầu trang VST | `4e076eae`; phần còn lại giữ khóa (PO 19/11 P9=A, VST-044) | Revert `4e076eae` |
| Lát 3 không sửa `~/.claude/settings.json`; việc bật/tắt plugin để PO làm | Bảng «Việc PO tự làm» ở N | Nói «Claude sửa settings.json» |

---

## K — Không gấp (im = giữ nguyên như đang chạy; nguồn: `.claude/plans/KH_APPKSNK_20261116_lam-gon-ma.md` §7)

| Mã | Câu | Đang giữ |
|---|---|---|
| K1 | Ô chọn tình trạng gói (`PackConditionSelect`, quy trình QT.22) có mã nhưng chưa nối vào màn nào. Nối vào màn nào? | Giữ mã, nối khi tới lượt CSSD |
| K2 | Kho CSSD còn cần nạp/xuất Excel (`importCSSDData`) không? | Giữ |
| K3 | Bảng in chứng cứ QC (`CssdPrintQcProofTable`) thuộc biểu mẫu nào? | Giữ đến khi đối chiếu biểu mẫu |
| K4 | Máy CSSD có cần mã QR riêng không? Cột `ma_qr_thiet_bi` chưa từng có trong DB nên nhánh mã này chưa bao giờ chạy | Giữ mã |
| K5 | Có hiện lại bảng chỉ số CDC trong tab NKBV (`NkbvCdcMetricsPanel`) không? | Giữ ẩn |
| K6 | Ý tưởng «gói quyền nhanh»: gán sẵn quyền theo vai trên ma trận trang × thao tác. Có làm không? | Chưa làm |
