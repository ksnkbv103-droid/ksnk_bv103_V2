# CAU_HOI_PO_APPKSNK — Câu hỏi chờ PO (một file duy nhất)

Cập nhật 2026-11-19 (đã xóa P1–P14, D2, D4 sau khi PO trả lời; đáp án ở sổ lỗi). Mọi câu cần PO nằm ở đây, mỗi câu có bối cảnh, lựa chọn, hậu quả và đề xuất. Câu đã trả lời: ghi đáp án vào sổ lỗi (`so-loi.mjs`), rồi xóa câu khỏi file này.

**Cách trả lời:** gõ trong chat theo mã, ví dụ «P12: đề xuất · C1: hỏi khoa rồi báo». Câu nào im thì mục «Nếu im» được áp dụng.

---

## P — Cần PO quyết để làm tiếp

_Không còn câu quyết mới (19/11). P12–P14 đã trả lời trong chat; phần còn thiếu dữ liệu ghi ở «Còn chờ dữ liệu» ngay dưới bảng D._

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
| D5 | CSSD-041: prod có quy trình kẹt trên bộ tổng còn con active không (S2 đã áp prod, kế hoạch chỉ đo số dòng). Câu chỉ đọc: `select b.ma_bo, t.ma_tram, q.id from cssd_fact_quy_trinh q join cssd_dm_bo_dung_cu b on b.id=q.bo_dung_cu_id and b.parent_bo_id is null left join cssd_dm_tram t on t.id=q.tram_hien_tai_id where q.is_active and exists (select 1 from cssd_dm_bo_dung_cu k where k.parent_bo_id=b.id and k.is_active and k.vai_tro_tach in ('CHIU_NHIET','KHONG_CHIU_NHIET'))`. 0 dòng thì đóng CSSD-041; có dòng thì PO quyết hoàn thành hay hủy từng quy trình (xử lý dữ liệu, không cần migration) | «đếm CSSD-041» (PO hoặc MCP chỉ đọc) | câu `select` chỉ đọc, không ghi |
| D6 | CSSD-048 (PO 19/11 P7=Tắt): tắt đúng 68 bộ mẹ rỗng sau tách bộ nhiệt. Một lệnh UPDATE `cssd_dm_bo_dung_cu` đặt `is_active=false` cho đúng 68 bộ mẹ không còn dụng cụ (có thể bật lại) | «tắt 68 bộ» | SELECT count trước và sau, đúng 68 dòng đổi |
| D3 | Đẩy các commit local lên GitHub; CI `db-dung.yml` chỉ chạy sau bước này | «push» | `npm run verify` |

**Còn chờ dữ liệu** (19/11, sau khi PO trả lời P12–P14 và chọn D1/D2/D4/D5/D6 trong chat):
- **D2** đã áp prod (VST-043 DA_SUA). **D4** đếm = 0 (QT-015 ý 3, chờ PO quyết đóng). **D5** đếm = 0 nhưng vô nghĩa: prod chưa có bộ con (CSSD-041 chưa đóng).
- **D6** KHÔNG chạy: prod 164 bộ, 0 bộ con, nên không có «68 bộ mẹ rỗng»; số 68 chỉ có ở DB local (CSSD-048). Đo lại sau khi dữ liệu tách nhiệt lên prod.
- **D1** chưa chạy: phiên không có công cụ deploy Vercel; cần authorize server `vercel` qua `/mcp`. Lát B + trang kế hoạch giám sát đã ở GitHub (đầu nhánh `f24445a3`).
- **P12** cần tên người giữ vai CHU_NHIEM_KHOA (N6) để soạn SQL gán. **P13** cần danh sách `KSNK_BREAK_GLASS_EMAILS` (Claude không đọc `.env*`): PO dán hoặc tự chạy SELECT. **P14** không cần gì thêm, làm ở lát kế.


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
