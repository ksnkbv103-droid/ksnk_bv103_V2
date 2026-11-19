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
- **Đề xuất: A.**
- **Nếu im:** giữ hiện tại, không sửa.
- **Mở khóa:** trả lời A → làm NKBV-049 (đổi ba chỗ đọc sang `getNkbvIdentityScope`); trả lời B → đóng NKBV-049, ghi «thống kê toàn viện» vào sổ.
- **ID sổ:** NKBV-049

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
- **Đề xuất:** (1) **Không**, vì CNK chỉ duyệt. (2) **Có**, bằng cách sửa mã, không đổi quyền.
- **Nếu im:** giữ nguyên, nghĩa là CNK vẫn gặp lỗi khi in.
- **Mở khóa:** (2) Có → sửa nút in (`use-vst-print.ts:82-87`), không đổi quyền; (2) Không → ẩn nút in với CNK; (1) Có → cần lệnh riêng của PO để cấp `GIAM_SAT_VST:edit` cho vai CNK trên prod.
- **ID sổ:** VST-041

### P3 · VST-042 · Chữ «dưới mục tiêu» trên dashboard bảng kiểm GSC
- **Bối cảnh:** Ngày 16/11 PO đã bỏ khái niệm «mục tiêu viện». Dashboard bảng kiểm GSC vẫn ghi «dưới mục tiêu» (`GscBkAnalyticsDashboard.tsx:117,122`). Thực ra con số này được so với ngưỡng đèn màu xanh/vàng/đỏ trong bảng tham số `ksnk_dm_tham_so`.
- **Hỏi:** Đổi chữ thành «dưới ngưỡng» và giữ nguyên ngưỡng đèn màu?
- **Đề xuất: Có.**
- **Nếu im:** giữ chữ cũ.
- **Mở khóa:** Có → đổi chữ ở `GscBkAnalyticsDashboard.tsx:117,122` thành «dưới ngưỡng», giữ nguyên ngưỡng đèn màu; Không → đóng VST-042.
- **ID sổ:** VST-042

### P4 · NEN-012 · Một file migration đã bị xóa, trái luật «migration bất biến»
- **Bối cảnh:** Commit `aecd3eb6` (NKBV-041, 19/11) xóa file `supabase/migrations/20261114180000_nkbv_fact_select_rls_hoi_dong_identity.sql`, vốn đã có ở nhánh `main`. Ngày 19/11 PO duyệt luật «migration đã có trong repo là bất biến» (plan một con đường §9 câu 1). Vì vậy kiểm bất biến so với `main` báo đỏ, và PR integrate→main sẽ đỏ ở CI `db-dung.yml`.
- **Hỏi:** Xử lý theo cách nào?
- **A.** Khôi phục nguyên văn file. Nếu tác dụng của nó cần bỏ, viết thêm một migration mới để hoàn tác. Cách này đúng luật bất biến, không phá hủy.
- **B.** Ghi ngoại lệ cho riêng file này trong kiểm bất biến.
- **C.** Gộp lại lịch sử migration (squash, Lát 4b). Đây là thao tác phá hủy, cần lệnh riêng.
- **Đề xuất: A.** Trước khi làm, kiểm prod chỉ bằng lệnh đọc xem đã có hàng lịch sử của file này chưa.
- **Nếu im:** PR integrate→main vẫn đỏ.
- **Mở khóa:** A → khôi phục file (kèm migration hoàn tác nếu cần bỏ tác dụng) sau khi kiểm prod bằng lệnh đọc; B → thêm ngoại lệ cho file này trong kiểm bất biến; C → mở Lát 4b (phá hủy, cần lệnh riêng của PO).
- **ID sổ:** NEN-012

### P5 · NEN-011 · Module «chất thải – đồ vải» (`src/modules/chat-thai-do-vai`)
- **Bối cảnh:** Có mã nguồn nhưng không nằm trong lộ trình 5 module (VST/GSC → CSSD → NKBV → QLCV → Đào tạo) và không có trong `docs/ssot-map.md`, nên không ai rà, không ai test.
- **Hỏi:** Đưa vào lộ trình (thêm vào ssot-map, rà như các module khác) hay gác lại (ẩn khỏi menu, giữ mã, không xóa)?
- **Đề xuất: Gác.**
- **Nếu im:** để nguyên như hiện tại.
- **Mở khóa:** Gác → ẩn `chat-thai-do-vai` khỏi menu, giữ mã; Đưa vào lộ trình → thêm vào `docs/ssot-map.md` và rà như các module khác.
- **ID sổ:** NEN-011

### P6 · CSSD-047 · Khi nào làm tiếp phương án C′ (định mức dụng cụ tính ở bộ tổng)
- **Bối cảnh:** Phương án C′ còn 5 bước là S4b, S5, S7, S6 và S8 (plan `rippling-churning-flurry`). Mỗi bước có migration, phải lên prod theo thứ tự `100000→110000→120000→125000→130000→140000` sau khi đo trước bằng SQL. Ngày 19/11 PO duyệt thứ tự: VST/GSC trước, sau đó CSSD → NKBV → QLCV → Đào tạo.
- **Hỏi:** Làm C′ ngay, hay khi tới lượt CSSD (sau khi VST/GSC hết lỗi)?
- **Đề xuất: Khi tới lượt CSSD.**
- **Nếu im:** theo đề xuất.
- **Mở khóa:** «Làm C′ ngay» → làm S4b, S5, S7, S6, S8 theo thứ tự migration trên, migration lên prod vẫn qua cổng PO; «Khi tới lượt CSSD» → CSSD-047 chờ tới lượt CSSD.
- **ID sổ:** CSSD-047

### P7 · CSSD-048 · 68 bộ mẹ không còn dụng cụ vẫn ở trạng thái «Hoạt động»
- **Bối cảnh:** Sau khi tách bộ theo khả năng chịu nhiệt, dụng cụ đã chuyển sang bộ con -CN/-KCN. Còn 68 bộ mẹ rỗng nhưng trong danh mục (`cssd_dm_bo_dung_cu`) vẫn ghi «Hoạt động».
- **Hỏi:** Tắt 68 bộ này hay giữ?
  - Tắt: `is_active=false`, có thể bật lại.
  - Giữ: để nguyên.
- **Đề xuất: Tắt.**
- **Nếu im:** giữ.
- **Mở khóa:** Tắt → đặt `is_active=false` cho 68 bộ (ghi DB prod, vẫn qua cổng PO); Giữ → đóng CSSD-048.
- **ID sổ:** CSSD-048

### P8 · Câu lâm sàng (chưa có dòng sổ) · Sốt đơn độc ở người bệnh trên 65 tuổi có tính là triệu chứng nhiễm khuẩn tiết niệu (UTI) không
- **Bối cảnh:** App xét điều này ở `src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.ts:651-654`.
  - App hiện tính sốt khi người bệnh **đang có sonde tiểu** (mọi tuổi), hoặc **không có sonde nhưng ≤ 65 tuổi**. Chú thích mã ghi là theo NHSN Ch.7, SUTI 1b.
  - Gói tài liệu U7.19/24/36 ghi sốt được tính **ở mọi tuổi**.
- **Ví dụ:** người bệnh 70 tuổi, không đặt sonde, chỉ có sốt > 38 °C và cấy nước tiểu ≥ 10^5 CFU/ml. App hiện **không** tính là UTI.
- **Hỏi:** Sốt đơn độc ở người bệnh trên 65 tuổi có tính là triệu chứng UTI không?
- **A.** Giữ như app (theo NHSN).
- **B.** Theo gói U7: sửa hàm để tính sốt ở mọi tuổi.
- **Đề xuất:** không có. Đây là quyết định lâm sàng của PO.
- **Nếu im:** giữ A.
- **Mở khóa:** B → sửa hàm ở `nkbv-rules-engine.ts:651-654` tính sốt ở mọi tuổi, kèm test; A → đóng NKBV-050.
- **ID sổ:** NKBV-050

### P9 · VST-044 · Người có vai mạng lưới KSNK còn bị khóa theo khoa ở năm chỗ
- **Bối cảnh:** Người có vai MẠNG LƯỚI KSNK mà không phải ADMIN hay NV KSNK, và có khoa hồ sơ, hiện bị khóa vào đúng khoa của mình (`isMangLuoiKsnk && !isAdmin && !isNhanVienKsnk`). VST-038 (`4e076eae`) đã xử lý phần VST. Còn năm chỗ giữ khóa:
  - Dashboard analytics Command Center: `src/lib/analytics/resolve-analytics-rpc-scope.ts:46,73` và `src/modules/dashboard/actions/bao-cao-tong-hop.actions.ts:110`.
  - Bảng kiểm TGS: `src/lib/analytics/bang-kiem-toi-phai-tgs.actions.ts:76`.
  - Tạo và lưu phiên GSC: `src/modules/giam-sat-chung/actions/giam-sat-chung-write.actions.ts:77,237`.
  - Mẫu bảng kiểm áp cho khoa: `src/modules/giam-sat-chung/bang-kiem/actions/bang-kiem-read.actions.ts:147`.
  - Đọc phiên GSC: `src/modules/giam-sat-chung/actions/giam-sat-chung-read.actions.ts:165`.
- **Hỏi:** Năm chỗ này giữ khóa theo khoa, hay mở theo ma trận «ai xem gì» (GS-1, `docs/core/handover-roadmap.md:68,101`)?
- **A.** Giữ khóa: người mạng lưới chỉ thấy và ghi trong khoa mình.
- **B.** Mở theo ma trận GS-1: mỗi chỗ mở đúng phạm vi ma trận cho phép.
- **Đề xuất:** không có. Đây là quyết định phân quyền của PO, đi cùng ma trận GS-1 và P2 (VST-041).
- **Nếu im:** giữ khóa (an toàn, từ chối khi thiếu thông tin).
- **Mở khóa:** B → sau khi PO chốt ma trận GS-1, làm mỗi chỗ một lát, mỗi lát qua `review-bv103` vì chạm quyền; A → đóng VST-044.
- **ID sổ:** VST-044 (liên quan VST-038, VST-041)

### P10 · QT-016 · Từ chối đề nghị ở hàng chờ «Phê duyệt» có bắt buộc nhập lý do không
- **Bối cảnh:** Ở hàng chờ `/phe-duyet`, bấm «Từ chối» đề nghị danh mục (`PheDuyetDungCuPanel.tsx:93`), phiếu đổi BOM (`:115`) và yêu cầu sửa phiên VST (`PheDuyetVstPanel.tsx:36`) không hỏi lý do, nên cột `reject_reason` rỗng. Màn duyệt tài khoản đã bắt buộc lý do ≥ 3 ký tự, không lỗi.
- **Hỏi:** Lý do từ chối có bắt buộc không?
- **A.** Bắt buộc ≥ 3 ký tự cho đề nghị danh mục và yêu cầu VST (hiện hộp nhập trước khi từ chối); phiếu BOM tách riêng vì chưa có cột lý do.
- **B.** Không bắt buộc: giữ như hiện tại.
- **Đề xuất: A.**
- **Nếu im:** giữ hiện tại.
- **Mở khóa:** A → sửa 3–4 file UI/action, không migration; B → đóng QT-016.
- **ID sổ:** QT-016

### P11 · VST-017 · Đổi mã biểu mẫu VST sang QT.06 thì trùng mã «Mạng lưới KSNK», cần đánh số lại cả dãy
- **Bối cảnh:** PO (19/11) đã chọn đổi mã VST từ `KSNK.QT.07.BM.01–03` sang `KSNK.QT.06.BM.01–03`. Tên 3 biểu mẫu khớp 1-1 với kho (QT.06.BM.01 năm thời điểm, BM.02 kỹ thuật thường quy, BM.03 ngoại khoa). Nhưng app đang dùng dãy mã lệch một số so với kho: `KSNK.QT.06.BM.03` trong app là «Hoạt động Mạng lưới KSNK» (kho: mạng lưới thuộc QT.05; QT.06 là vệ sinh tay; QT.07 là phương tiện phòng hộ). Cột `ma_bk` của `gstt_dm_bang_kiem` có ràng buộc UNIQUE (`danh_muc_bang_kiem_ma_bk_key`), nên đổi riêng VST sang QT.06.BM.03 sẽ trùng bảng kiểm Mạng lưới.
- **Hỏi:** Đổi cả dãy theo kho hay giữ mã app?
- **A.** Đánh số lại cả dãy theo kho (mạng lưới QT.06→05, VST QT.07→06, phương tiện phòng hộ QT.08→07, các QT sau tương tự). Một đợt migration mới + code + docs + test, ảnh hưởng nhiều file và dữ liệu prod; tách lát ≤ 8 file, prod chỉ khi PO ra lệnh.
- **B.** Giữ mã app như hiện tại; ghi bảng đối chiếu «mã app ↔ mã kho» vào docs để hồ sơ giấy tra được.
- **Đề xuất: B** (nhỏ nhất, không đụng prod, số liệu không đổi); chọn A nếu hồ sơ giấy bắt buộc đúng mã kho trên phiếu in.
- **Nếu im:** giữ mã app, không đổi gì.
- **Mở khóa:** A → làm theo lát (migration đổi `ma_bk` cả dãy, không sửa migration đã apply); B → đóng VST-017 bằng bảng đối chiếu.
- **ID sổ:** VST-017

### P12 · QT-017 phần 2 · Gán vai «Chủ nhiệm khoa» (CHU_NHIEM_KHOA) cho người thật bằng cách nào
- **Bối cảnh:** Vai này là vai cộng thêm, hiện 0 người giữ. Ô chọn vai trên trang Tài khoản nhân sự không có vai này (`rbac.types.ts:72-77`), vì lệnh gán ở đó thay toàn bộ vai cũ của người được chọn (`rpc_assign_staff_ksnk_role`), nên gán Chủ nhiệm khoa qua ô đó sẽ làm mất vai KSNK sẵn có của người ấy. Hệ quả: trên giao diện không ai gán được; các việc cần vai này (duyệt hóa chất/thiết bị, nghiệm thu QLCV, mở GSC cho khoa) chưa có người dùng thật.
- **Hỏi:** Gán vai này cho người thật bằng cách nào?
- **A.** PO ra lệnh gán một lần trên prod (SQL cộng thêm dòng vai, không bỏ vai cũ), cho người giữ vai theo ghi nhận N6 của lộ trình; không làm đường gán trên giao diện vì chỉ vài người.
- **B.** Làm đường gán «vai cộng thêm» trên giao diện (không thay vai cũ): 1 migration + RPC + màn hình, qua `review-bv103` vì chạm quyền.
- **Đề xuất: A** (ít file nhất, không đụng giao diện; dùng được ngay khi PO gõ lệnh).
- **Nếu im:** giữ hiện trạng, vai vẫn 0 người.
- **Mở khóa:** A → PO gõ lệnh gán, Claude soạn sẵn câu SQL chỉ-thêm; B → một lát theo CLAUDE.md (≥ 3 kịch bản tay, RPC apply local).
- **ID sổ:** QT-019 (tách từ QT-017)

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
| D3 | Đẩy các commit local lên GitHub; CI `db-dung.yml` chỉ chạy sau bước này | «push» | `npm run verify` |

---

## N — Vận hành thử

### N1 · Cổng module NKBV đang ghi KHÁM_PHÁ, thực tế đã làm nhiều
- **Bối cảnh:** `npm run module:gate` báo nkbv = KHÁM_PHÁ. Thực tế NKBV đã có bộ luật NHSN 2026 giai đoạn 0–2 với 676 test pass, cùng nhiều commit tính năng. Cổng sai làm lát NKBV bị chặn khi tới lượt.
- **Hỏi:** Nâng cổng NKBV lên XÂY?
- **Đề xuất: Có.**
- **Nếu im:** giữ KHÁM_PHÁ; tới lượt NKBV sẽ hỏi lại.
- **Mở khóa:** Có → nâng trạng thái ở `docs/modules/nkbv/van-de-nguoi-dung.md` lên XÂY. Cổng XÂY cần có tên đầu mối (hiện ghi «CHƯA CÓ»; xem N3) và không còn `[CẦN XÁC NHẬN]` ở mục 1 và 2 (hiện mỗi mục còn 1); Không → giữ KHÁM_PHÁ, đóng NKBV-051.
- **ID sổ:** NKBV-051

### N2 · Công tắc `KSNK_PILOT_FOUR_MODULES` trên Vercel
- **Bối cảnh:** Công tắc đang TẮT. Bật thì ẩn QLCV, NKBV và Đào tạo khỏi người dùng prod; VST/GSC và CSSD vẫn mở. Mô tả trong `.env.example:23` đã cũ (vẫn ghi «chặn CSSD»), nhưng Claude không được đọc hay sửa file `.env*`.
- **Hỏi:** Bật công tắc trên prod trong lúc ba module kia chưa xong?
- **Đề xuất: Có.** PO bật trên Vercel, và sửa giúp dòng `.env.example:23`.
- **Nếu im:** giữ TẮT.
- **Mở khóa:** Có → PO tự bật công tắc trên Vercel và tự sửa mô tả ở `.env.example:23` (Claude không đọc, không sửa `.env*`); Không → giữ TẮT, đóng NEN-013.
- **ID sổ:** NEN-013

### N3 · Đầu mối từng module và đợt thử đầu
- **Bối cảnh:** CLAUDE.md dự án quy định mỗi module phải có người dùng và kịch bản tay trước khi coi là xong. Hiện mới có đầu mối CSSD (Nguyễn Thanh Bình). VST/GSC đang được dùng thật nhưng chưa ghi tên đầu mối. NKBV, QLCV và Đào tạo chưa có đầu mối.
- **Hỏi (1):** Ai là đầu mối, tức người thử và xác nhận kịch bản tay, cho VST/GSC, NKBV, QLCV và Đào tạo?
- **Hỏi (2):** Đợt vận hành thử đầu gồm những module nào?
- **Đề xuất:** (1) không có, vì tên người không thay được bằng mặc định. (2) VST/GSC và CSSD, khớp với N2.
- **Nếu im:** Claude vẫn chạy kịch bản tay trên local, nhưng chưa module nào được tính là «xong».
- **Mở khóa:** PO gõ tên đầu mối từng module; tên được ghi vào `docs/core/handover-roadmap.md` (bảng «Người đầu mối») và vào sổ. Có tên mới đưa được kịch bản tay cho người thật chấm ĐẠT.
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
| VST-038 lát A: ADMIN và NV KSNK kiêm MẠNG LƯỚI không bị khóa khoa ở in nhãn GSC và ô chọn khoa ở đầu trang VST | `4e076eae`; phần còn lại chờ P9 | Revert `4e076eae` |
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
