# CAU_HOI_PO_APPKSNK — Câu hỏi chờ PO (một file duy nhất)

Cập nhật 2026-11-19. Mọi câu cần PO nằm ở đây, mỗi câu có bối cảnh, lựa chọn, hậu quả và đề xuất. Câu đã trả lời: ghi đáp án vào sổ lỗi (`so-loi.mjs`), rồi xóa câu khỏi file này.

**Cách trả lời:** gõ trong chat theo mã, ví dụ «P1: A · P2: đề xuất · C1: hỏi khoa rồi báo». Câu nào im thì mục «Nếu im» được áp dụng.

---

## P — Cần PO quyết để làm tiếp

### P1 · NKBV-049 · Ba màn NKBV đang đọc dữ liệu vượt phân quyền khoa
- **Bối cảnh:** Ba màn NKBV đọc dữ liệu bằng quyền quản trị, nên bỏ qua luật phân quyền khoa đã áp prod ngày 19/11 (`20261118130000`). Ba màn đó là «Phân tích bệnh án» (`giam-sat-nkbv-ba-phan-tich.actions.ts:36`) và «Sổ thiết bị», gồm hai chỗ (`giam-sat-nkbv-device-registry.actions.ts:36,96`). Hậu quả: ai có quyền xem NKBV cũng thấy toàn viện. Đo prod 19/11: có 17 người có quyền xem NKBV, đều là NV KSNK, nên hôm nay chưa ai ngoài KSNK thấy.
- **Hỏi:** Ba màn này là **thống kê toàn viện** (ai có quyền xem NKBV cũng xem hết) hay **danh sách có danh tính bệnh nhân** (người ngoài KSNK chỉ thấy khoa mình)?
- **A.** Danh sách có danh tính: đổi sang `getNkbvIdentityScope`, nên khi sau này cấp quyền NKBV cho khoa thì họ chỉ thấy khoa mình.
- **B.** Thống kê toàn viện: giữ như hiện tại.
- **Đề xuất: A.** Nếu im: giữ hiện tại, không sửa.

### P2 · VST-041 · Chủ nhiệm khoa (CNK) làm được gì trên VST
- **Bối cảnh:** Vai CNK hiện có quyền «duyệt» và «xem» VST, không có quyền «sửa».
  - (1) CNK tạo yêu cầu sửa phiên VST thì bị chặn «không có quyền» (VST-027).
  - (2) CNK bấm «In phiếu» ở lịch sử VST thì bị lỗi «không có quyền [view] trên module [DANH_MUC_ORG]». Nguyên nhân: nút in tải danh mục khoa phòng qua quyền quản trị danh mục (`use-vst-print.ts:82-87`).
- **Hỏi (1):** CNK có được tạo yêu cầu sửa phiên VST của khoa mình không?
  - Nếu **có**: phải cấp `GIAM_SAT_VST:edit` cho vai CNK trên prod. Đây là đổi quyền người dùng thật, cần lệnh riêng.
  - Nếu **không**: giữ nguyên.
- **Hỏi (2):** CNK có được in phiếu VST không?
  - Nếu **có**: sửa nút in để lấy danh mục theo đường khác. Không cấp quyền danh mục, không đổi quyền ai.
  - Nếu **không**: ẩn nút in với CNK.
- **Đề xuất:** (1) **Không**, vì CNK chỉ duyệt. (2) **Có**, bằng cách sửa mã, không đổi quyền. Nếu im: giữ nguyên, nghĩa là CNK vẫn gặp lỗi khi in.

### P3 · VST-042 · Chữ «dưới mục tiêu» trên dashboard bảng kiểm GSC
- **Bối cảnh:** Ngày 16/11 PO đã bỏ khái niệm «mục tiêu viện». Dashboard bảng kiểm GSC vẫn ghi «dưới mục tiêu» (`GscBkAnalyticsDashboard.tsx:117,122`). Thực ra con số này được so với ngưỡng đèn màu xanh/vàng/đỏ trong bảng tham số `ksnk_dm_tham_so`.
- **Hỏi:** Đổi chữ thành «dưới ngưỡng» và giữ nguyên ngưỡng đèn màu?
- **Đề xuất: Có.** Nếu im: giữ chữ cũ.

### P4 · NEN-012 · Một file migration đã bị xóa, trái luật «migration bất biến»
- **Bối cảnh:** Commit `aecd3eb6` (NKBV-041, 19/11) xóa file `supabase/migrations/20261114180000_nkbv_fact_select_rls_hoi_dong_identity.sql`, vốn đã có ở nhánh `main`. Ngày 19/11 PO duyệt luật «migration đã có trong repo là bất biến» (plan một con đường §9 câu 1). Vì vậy kiểm bất biến so với `main` báo đỏ, và PR integrate→main sẽ đỏ ở CI `db-dung.yml`.
- **Hỏi:** Xử lý theo cách nào?
- **A.** Khôi phục nguyên văn file. Nếu tác dụng của nó cần bỏ, viết thêm một migration mới để hoàn tác. Cách này đúng luật bất biến, không phá hủy.
- **B.** Ghi ngoại lệ cho riêng file này trong kiểm bất biến.
- **C.** Gộp lại lịch sử migration (squash, Lát 4b). Đây là thao tác phá hủy, cần lệnh riêng.
- **Đề xuất: A.** Trước khi làm, kiểm prod chỉ bằng lệnh đọc xem đã có hàng lịch sử của file này chưa. Nếu im: PR integrate→main vẫn đỏ.

### P5 · NEN-011 · Module «chất thải – đồ vải» (`src/modules/chat-thai-do-vai`)
- **Bối cảnh:** Có mã nguồn nhưng không nằm trong lộ trình 5 module (VST/GSC → CSSD → NKBV → QLCV → Đào tạo) và không có trong `docs/ssot-map.md`, nên không ai rà, không ai test.
- **Hỏi:** Đưa vào lộ trình (thêm vào ssot-map, rà như các module khác) hay gác lại (ẩn khỏi menu, giữ mã, không xóa)?
- **Đề xuất: Gác.** Nếu im: để nguyên như hiện tại.

### P6 · CSSD-047 · Khi nào làm tiếp phương án C′ (định mức dụng cụ tính ở bộ tổng)
- **Bối cảnh:** Phương án C′ còn 5 bước là S4b, S5, S7, S6 và S8 (plan `rippling-churning-flurry`). Mỗi bước có migration, phải lên prod theo thứ tự `100000→110000→120000→125000→130000→140000` sau khi đo trước bằng SQL. Ngày 19/11 PO duyệt thứ tự: VST/GSC trước, sau đó CSSD → NKBV → QLCV → Đào tạo.
- **Hỏi:** Làm C′ ngay, hay khi tới lượt CSSD (sau khi VST/GSC hết lỗi)?
- **Đề xuất: Khi tới lượt CSSD.** Nếu im: theo đề xuất.

### P7 · CSSD-048 · 68 bộ mẹ không còn dụng cụ vẫn ở trạng thái «Hoạt động»
- **Bối cảnh:** Sau khi tách bộ theo khả năng chịu nhiệt, dụng cụ đã chuyển sang bộ con -CN/-KCN. Còn 68 bộ mẹ rỗng nhưng trong danh mục (`cssd_dm_bo_dung_cu`) vẫn ghi «Hoạt động».
- **Hỏi:** Tắt 68 bộ này hay giữ?
  - Tắt: `is_active=false`, có thể bật lại.
  - Giữ: để nguyên.
- **Đề xuất: Tắt.** Nếu im: giữ.

### P8 · Câu lâm sàng (chưa có dòng sổ) · Sốt đơn độc ở người bệnh trên 65 tuổi có tính là triệu chứng nhiễm khuẩn tiết niệu (UTI) không
- **Bối cảnh:** App xét điều này ở `src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.ts:651-654`.
  - App hiện tính sốt khi người bệnh **đang có sonde tiểu** (mọi tuổi), hoặc **không có sonde nhưng ≤ 65 tuổi**. Chú thích mã ghi là theo NHSN Ch.7, SUTI 1b.
  - Gói tài liệu U7.19/24/36 ghi sốt được tính **ở mọi tuổi**.
- **Ví dụ:** người bệnh 70 tuổi, không đặt sonde, chỉ có sốt > 38 °C và cấy nước tiểu ≥ 10^5 CFU/ml. App hiện **không** tính là UTI.
- **A.** Giữ như app (theo NHSN).
- **B.** Theo gói U7: sửa hàm để tính sốt ở mọi tuổi.
- **Đề xuất:** không có. Đây là quyết định lâm sàng của PO. Nếu im: giữ A.

---

## C — Hỏi khoa CSSD (đầu mối: Nguyễn Thanh Bình)

### C1 · CSSD-046 · Lưới Silicone JF941 hấp hơi nước được không
- **Bối cảnh:** Mỗi bộ tổng được tách thành bộ con -CN (chịu nhiệt, hấp hơi nước) và -KCN (không chịu nhiệt, tiệt khuẩn nhiệt độ thấp). Lưới Silicone JF941 trong bộ tổng C′ đang xếp ở -KCN.
- **Hỏi khoa:** Lưới Silicone JF941 có hấp hơi nước được không?
  - Có: chuyển sang -CN.
  - Không: giữ -KCN.

### C2 · CSSD-049 · Dụng cụ tiệt khuẩn bằng EO có cần thành bộ con riêng (-EO) không
- **Bối cảnh:** Đã chốt «Plasma = ETO» (`eb39b449`). Hiện dụng cụ tiệt khuẩn bằng EO nằm chung bộ con -KCN.
- **Liên quan:** lỗi CSSD-043 (mức Cao, đang chờ xác minh) là hàm đồng bộ tách bộ làm mất bộ con -EO. Nếu khoa trả lời **không cần tách**, phần «mất -EO» của CSSD-043 không còn là lỗi.
- **Hỏi khoa:** Ở khoa, dụng cụ EO và dụng cụ Plasma có đóng gói và lưu kho thành bộ riêng không?
  - Có: cần bộ con -EO, sửa CSSD-043 đủ hai phần.
  - Không: gộp vào -KCN, CSSD-043 chỉ còn phần bao gói mặc định.

---

## D — Lệnh prod/deploy (chỉ cần PO gõ lệnh; mọi thứ khác đã sẵn)

| Mã | Việc | Lệnh PO gõ | Trước khi chạy, máy sẽ tự kiểm |
|---|---|---|---|
| D1 | Deploy code lát B (ngăn kéo CSSD-034) và trang kế hoạch giám sát. Migration của hai phần này đã áp prod 19/11 | «deploy» | prod: vai NHAN_VIEN_KSNK có quyền GIAM_SAT_NKBV import |
| D2 | VST-043 · TC09: sửa câu trích QĐ 3651 trên prod. Một lệnh UPDATE `gstt_dm_bang_kiem`, `WHERE id = '9d3c00f2-eb9c-4edb-8ee7-bb0cfb0f6f9d'`, thay đúng cụm chữ cũ đứng trước «6 rõ», giống file seed `KSNK.QĐ.01.BM.01.json:60` | «áp TC09» | SELECT trước và sau, đúng 1 dòng đổi |
| D3 | Đẩy các commit local lên GitHub; CI `db-dung.yml` chỉ chạy sau bước này | «push» | `npm run verify` |

---

## N — Vận hành thử

### N1 · Cổng module NKBV đang ghi KHÁM_PHÁ, thực tế đã làm nhiều
- **Bối cảnh:** `npm run module:gate` báo nkbv = KHÁM_PHÁ. Thực tế NKBV đã có bộ luật NHSN 2026 giai đoạn 0–2 với 676 test pass, cùng nhiều commit tính năng. Cổng sai làm lát NKBV bị chặn khi tới lượt.
- **Hỏi:** Nâng cổng NKBV lên XÂY?
- **Đề xuất: Có.** Nếu im: giữ KHÁM_PHÁ; tới lượt NKBV sẽ hỏi lại.

### N2 · Công tắc `KSNK_PILOT_FOUR_MODULES` trên Vercel
- **Bối cảnh:** Công tắc đang TẮT. Bật thì ẩn QLCV, NKBV và Đào tạo khỏi người dùng prod; VST/GSC và CSSD vẫn mở. Mô tả trong `.env.example:23` đã cũ (vẫn ghi «chặn CSSD»), nhưng Claude không được đọc hay sửa file `.env*`.
- **Hỏi:** Bật công tắc trên prod trong lúc ba module kia chưa xong?
- **Đề xuất: Có.** PO bật trên Vercel, và sửa giúp dòng `.env.example:23`. Nếu im: giữ TẮT.

### N3 · Đầu mối từng module và đợt thử đầu
- **Bối cảnh:** CLAUDE.md dự án quy định mỗi module phải có người dùng và kịch bản tay trước khi coi là xong. Hiện mới có đầu mối CSSD (Nguyễn Thanh Bình). VST/GSC đang được dùng thật nhưng chưa ghi tên đầu mối. NKBV, QLCV và Đào tạo chưa có đầu mối.
- **Hỏi (1):** Ai là đầu mối, tức người thử và xác nhận kịch bản tay, cho VST/GSC, NKBV, QLCV và Đào tạo?
- **Hỏi (2):** Đợt vận hành thử đầu gồm những module nào?
- **Đề xuất (2):** VST/GSC và CSSD, khớp với N2. Nếu im: Claude vẫn chạy kịch bản tay trên local, nhưng chưa module nào được tính là «xong».

Còn một việc PO tự làm: mở dashboard VST/GSC trên prod sau lô pha 1 (áp 17/11), nếu số liệu lệch thì báo.

---

## M — Mặc định Claude đang chạy (im = giữ; muốn đảo thì nói mã, máy revert sha)

| Mã | Đang chạy | Đảo = revert |
|---|---|---|
| QLCV-010 | Người đề xuất không tự phê duyệt đề xuất của mình (trừ ADMIN) | `81eb1ae2` |
| QT-012 | Vai khách thống kê không được thi Đào tạo. Chặn ở app, quyền trong DB giữ nguyên | `146af592` |
| NKBV-018 | Người chỉ có quyền CSSD, khi tra ngược ca SSI theo mẻ, thấy mã ca và ngày nhưng không thấy họ tên bệnh nhân | `8b1bdfc1` |
| CSSD-017 | Giờ đọc chỉ thị sinh học (BI) được muộn hơn giờ bấm tối đa 2 phút (dung sai đồng hồ); ngưỡng ủ tối thiểu 20 phút theo PO 13/11 | `e7cdd053` |

Câu nhỏ còn treo trong nhóm này: **VST-013(a)**. Form VST chưa xếp khoa lâm sàng lên trước vì danh mục khoa chưa có trường đánh dấu khoa lâm sàng. Muốn xếp thì PO chỉ trường hoặc gửi danh sách khoa lâm sàng. Nếu im: giữ thứ tự hiện tại.

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
