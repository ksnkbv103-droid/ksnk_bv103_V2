# Báo cáo tổng thể và chiến lược KSNK BV103 — 2026-11-13 (bản 2)

Thay [`BAO-CAO-RA-SOAT-2026-11-05.md`](BAO-CAO-RA-SOAT-2026-11-05.md) và [`BAO-CAO-CAI-TO-2026-11-06.md`](BAO-CAO-CAI-TO-2026-11-06.md) làm **bản nhìn tổng thể hiện hành**. Hai bản cũ giữ làm chứng cứ. Nhánh `integrate/2026-11`. **§4 (chiến lược, cổng G1–G6) đã gộp vào bộ 3 file (PO duyệt 2026-11-16):** lộ trình hiện hành ở [`01 §6.3`](docs/bo-tai-lieu/01-tong-quan-yeu-cau-lo-trinh.md); các mục còn lại giữ nguyên.

**Nguồn và mức tin cậy:**
- Tài liệu SSOT từng module, danh sách route `src/app/**/page.tsx` (đếm lại 2026-11-13), sổ lỗi, roadmap §5, báo cáo đối chiếu NHSN 2026 (2026-11-11).
- Trích `file:dòng` có dấu ✓ là đã grep lại trong lượt này.
- Phần còn lại lấy từ báo cáo phân rã của agent chỉ đọc, ghi «cần kiểm» khi chưa xác minh.

---

## 0. Đọc lại ý tưởng và mục đích của PO

Gom từ CLAUDE.md, domain-specification, roadmap §5 và các việc PO đang tự làm (file chưa track ở checkout chính):

| Mục đích | Bằng chứng | Hệ quả cho chiến lược |
|---|---|---|
| **Một hệ thống KSNK trọn vẹn cho cả viện**, không phải một app VST | CLAUDE.md: «Mục tiêu: triển khai TẤT CẢ module» (PO 2026-10-12), thứ tự VST/GSC → CSSD → NKBV → QLCV → Đào tạo | Không «đóng băng» module nào vĩnh viễn; chỉ **xếp hàng** |
| **Số liệu chuẩn, bảo vệ được** trước lãnh đạo và kiểm định | Khóa PO VST (≤2 thời điểm WHO, trần chỉ số = trần form); NKBV bám CDC/NHSN; PO tự lập bản đối chiếu NHSN 2026 | Đúng chuẩn chuyên môn được ưu tiên hơn thêm màn |
| **Đào tạo theo đối tượng** | PO đang soạn ngân hàng ~6.000 câu (`seed_dao_tao_6000_qbank.sql`, 6.088 dòng) và phân 9 nhóm đối tượng theo KSNK.QT.03.BM.02 | Đào tạo không phải «ưu tiên thấp không ai dùng»: có nội dung thật, đang thiếu đường đưa vào |
| **Quản lý khoa KSNK như một đơn vị** (việc, dự trù) | QLCV; file `Du_tru_dau_thau_KSNK_2027_2028_BV103.xlsx` | QLCV là công cụ nội bộ của chính khoa KSNK → có người dùng sẵn trong khoa |
| **Nhanh có sản phẩm dùng được** | Thang L0–L3 (PO 2026-10-24): L1 = người thật, nhập < 60 s, ≥ 3 kịch bản, thống kê khớp tính tay | Đích của mọi module là **L1 trên prod**, không phải «điểm audit» trên local |

**Kết luận đọc lại:** bản trước đề xuất «đóng băng NKBV/QLCV/Đào tạo». Đề xuất đó **lệch mục đích** của PO. Chiến lược đúng là **xếp hàng có cổng**: mỗi module đi cùng một đường *lõi tối thiểu → lên prod → người thật dùng → đo L1 → mở rộng*. Module đứng sau vẫn được làm phần *đúng chuẩn* (`fix`) và chuẩn bị nội dung. Module đó chỉ chưa được thêm màn mới (`feat`) khi lõi chưa lên prod.

---

## 1. Kết luận chiến lược

1. **Vòng lặp hiện tại khép kín trên local.**
   - `integrate/2026-11` đi trước `main` khoảng 385 commit.
   - Prod thiếu khoảng 32 migration.
   - 36 kịch bản tay «đạt» đều do Claude chạy trên DB local.

   Kết quả: không vòng sửa nào có phản hồi người dùng, nên không biết vòng nào đáng chạy. **Việc số 1 không phải sửa thêm, mà là đưa bản hiện có lên prod.**
2. **App phức tạp hơn quy trình nghiệp vụ, ở mọi module.** Người dùng phải hiểu khoảng 10 khái niệm (Giám sát, QLCV), khoảng 8 (Đào tạo) và trên 20 (CSSD, NKBV) mới đi trọn một vòng. Mỗi module đều tách được **lõi tối thiểu** ngắn hơn nhiều (§3). Chiến lược: **ẩn bớt, không xóa**. Ẩn theo cờ/menu cho đến khi lõi có người dùng.
3. **Tài liệu tự mâu thuẫn ở các điểm quyết định nghiệp vụ** (§3: BOM CSSD, điểm quay lại khi mẻ hỏng, nộp muộn Đào tạo, ngưỡng mẫu mỏng). Mỗi phiên AI đọc phải bản cũ là một vòng sửa sai. Cần một lượt **chốt SSOT** ngắn trước khi code tiếp module đó.
4. **NKBV có rủi ro phân loại sai thật** (đối chiếu NHSN 2026 §5): PATOS, baseline VAE, loại trừ BSI, PNU3, IWP xương. Đây là việc `fix` đúng chuẩn, có giá trị cao hơn mọi `feat` NKBV đang làm.

---

## 2. Bối cảnh số đo (giữ từ bản 1)

- **Công sức lệch thứ tự PO:** từ quyết định 11-06, CSSD 81 commit, NKBV 44 (12 `feat` từ 11-09 dù cổng KHÁM_PHÁ), QTHT 36. Nhóm VST + GSC + thống kê chỉ 40, khoảng 17% lượt commit-module.
- **Chi phí quy trình:** từ 11-06 có 405 commit, trong đó docs 103, `scripts/readiness` 85, HANDOFF 56.
  - Roadmap 66 KB (mục tiêu 25 KB).
  - 120 npm script, 5 worktree, 46 nhánh.
  - 4 file trạng thái chồng nhau: HANDOFF, SO_NO, roadmap §5, BAO-CAO-*.
- **Chất lượng mã:**
  - Sổ lỗi: 93 đã sửa, 2 mở (CSSD-004, NEN-003), 0 Nghiêm trọng/Cao mở; 17 finding P0 của đợt 11-05 đã đóng.
  - Không có lỗi mã nào chặn pilot VST/GSC.
- **Màn hình:** 64 `page.tsx`. Bảy route `quan-tri-he-thong/{danh-muc/*, nhan-su, bang-kiem}` và `lich-su` chỉ là `redirect` (✓ 6–14 dòng/file). Đây là dấu vết AR-0..AR-8, có thể dọn sau khi PO duyệt; không xóa khi chưa duyệt.

---

## 3. Phân rã từng module: quy trình chuẩn và app hiện có

Khung mỗi module: **Mục đích · Quy trình SSOT · App · Rườm rà/mâu thuẫn · Lõi tối thiểu · Tiêu chí L1 · Lát đầu tiên.**

### 3.1 Giám sát tuân thủ: VST + GSC (đang có người dùng, ưu tiên 1)

**Mục đích:** ghi nhận tuân thủ vệ sinh tay (5 thời điểm WHO) và bảng kiểm chung, ra tỉ lệ theo khoa/kỳ và báo cáo in. **Vai:** giám sát viên nhập (KSNK chuyên trách và tự giám sát), Admin KSNK khóa sổ, lãnh đạo xem báo cáo.

**Quy trình SSOT** (`giam-sat/README.md`):
1. Ghi nhận phiên.
   - VST: khoa, người được giám sát, tối đa 3 đối tượng/phiên. Mỗi hành động rửa/chà gắn ≤ 2 thời điểm WHO; bỏ sót tính 1.
   - GSC: khoa, mẫu, tick tiêu chí, chốt `bang_kiem_snapshot`.
2. Lịch sử: sửa/xóa mềm trước ngày khóa sổ.
3. Thống kê khoa theo kỳ.
4. Báo cáo chính thức (in).

Cổng chặn: khóa sổ `locked_until_date`; trần VST; mẫu tắt không chọn được.

**App:**
- Nhập: `/giam-sat` (hub), `/giam-sat-vst`, `/giam-sat-chung` và các trang con `tuan-thu`, `nhat-ky`, `he-thong`, `bang-kiem`, `danh-muc`.
- Lịch sử: `/lich-su/vst`, `/lich-su/gsc`.
- Thống kê: `/thong-ke/vst`, `/thong-ke/gsc`.
- Báo cáo: `/bao-cao-tong-hop`.
- 36 mẫu bảng kiểm.
- Khái niệm người dùng gặp, khoảng 10: chuyên trách/tự giám sát, đối soát, 3 loại giám sát, 4 cách tính điểm, khóa sổ, mẫu mỏng, mục tiêu viện, hai nghĩa Δ.

**Chỉ số:**

| Chỉ số | Công thức | Nguồn | Ngưỡng |
|---|---|---|---|
| `ty_le_vst` | đạt/tổng cơ hội hợp lệ (`fn_vst_is_valid_opportunity`) | RPC `rpc_dashboard_vst_strategic_analytics`; đã đối soát tay 0 lệch | 85/70/80/90%: **«chưa có căn cứ định lượng»** (metric-dictionary, PO 11-06) |
| `ty_le_gsc` | Đạt/tiêu chí áp dụng (loại NA), mặc định chỉ loại TUÂN_THỦ | RPC `rpc_dashboard_gsc_strategic_analytics`; **chưa đối soát tay** | như trên |
| Ba chỉ số VST không trộn | WHO · kỹ thuật BM.02 · ngoại khoa BM.03 | | |

**Rườm rà/mâu thuẫn:**
- Ngưỡng mẫu mỏng lệch giữa hai nguồn:
  - `README.md:101` ✓: «< 20 cơ hội VST (< 30 GSC)».
  - `van-de-nguoi-dung.md:21` ✓: chỉ «n<20».
  - → Chốt một con số cho GSC.
- CCS đã cấm hiển thị (`metric-dictionary.md:39-40` ✓). Công thức `computeCcs` vẫn giữ cho PDCA đọc khóa cũ, nên còn một đường chết. → Đưa vào danh sách mã chết cho PO.
- Ngưỡng màu (85/70/80/90) đang tô đỏ/vàng khoa **không có căn cứ** → cần PO chốt nguồn (mục tiêu viện) hoặc bỏ tô màu.
- Hub `/giam-sat` ✓ (cổng VST/GSC/NKBV) cùng tồn tại với ModeNav. Tài liệu IA nói ModeNav là công tắc duy nhất. Hai lối vào cho một việc trái nguyên tắc «một cửa một việc» (`docs/ux/principles.md`).
- `/giam-sat-chung` có 5 trang con; `nhat-ky` và `he-thong` (đánh giá vận hành) không thuộc vòng nhập → xem.

**Lõi tối thiểu:** nhập VST, nhập GSC tuân thủ → lịch sử → `/thong-ke/vst|gsc` → `/bao-cao-tong-hop` (in) → khóa sổ. **Tạm ẩn với người nhập:** đối soát TGS/KSNK, bao phủ TGS, ma trận so sánh, nhật ký/đánh giá hệ thống, Δ phụ (cần kiểm cái nào đang bật).

**Tiêu chí L1:**
- Đã đạt: ≥ 3 kịch bản tay; VST khớp tính tay.
- Chưa đạt:
  - người nhập thật trên prod với bản mới;
  - thời gian nhập 1 phiên < 60 s đo trên điện thoại;
  - GSC khớp tính tay ≥ 1 kỳ;
  - số phiên/tuần trên prod 4 tuần liên tiếp không giảm so với trước deploy.

**Lát đầu tiên:** deploy (§4 G1) → đo trên prod → đối soát tay GSC 1 kỳ → chốt ngưỡng mẫu mỏng GSC và ngưỡng màu.

### 3.2 CSSD: tiệt khuẩn dụng cụ (ưu tiên 2)

**Mục đích:** quản vòng đời bộ dụng cụ bằng tem QR, mẻ tiệt khuẩn có QC, cấp phát cho khoa, truy vết và thu hồi khi BI dương. **Vai:**
- Nhân viên CSSD: nhiều người, một người có thể làm nhiều trạm, mỗi trạm ghi người + giờ.
- **Tổ trưởng:** nhả mẻ implant, nhập BI.
- ADMIN: danh mục, duyệt phiếu.
- Khoa nhận bộ.
- KSNK: xem sự cố/truy vết.

**Quy trình SSOT** (`cssd/domain-overview.md:83-90`, `18-CSSD-PHIEU-ME…:29` ✓, 6 trạm):
1. Tiếp nhận: quét bộ bẩn, mở chu trình.
2. Làm sạch.
3. QC trạm.
4. Đóng gói: sinh Cycle QR. Tách bộ lẫn chịu nhiệt; Plasma cấm cellulose.
5. Tiệt khuẩn, qua **phiếu mẻ**, không quét trên bản đồ trạm.
   - Dữ liệu: máy, số mẻ tự sinh, chương trình, thông số, 3 mục QC (vật lý, CI ngoài gói, CI PCD), BI khi bắt buộc.
   - Cổng: Bowie-Dick đầu ngày đạt, máy `READY`.
   - Chỉ nạp bộ đang `DONG_GOI` (`18:50` ✓).
   - Implant/Plasma/EO → `CHO_BI`.
6. Cấp phát: chọn khoa, quét nhiều bộ, chốt một lần.
   - Cổng: mẻ `HOAN_THANH`, không có sự cố tiệt khuẩn mở.

Nhánh lỗi: QC mẻ hỏng hoặc BI dương → thu hồi (toàn mẻ hoặc cửa sổ từ mẻ BI âm gần nhất), máy `HOLD_QC`.

**App:**
- 10 trang: `/cssd-quy-trinh` (3 tab Chu trình/Mẻ/Truy vết), `/cssd-dung-cu`, `/cssd-su-co`, `/cssd-thiet-bi`, `/cssd-hoa-chat`, `/cssd-erp/batch`, `/cssd-erp/report`, `/thong-ke/cssd`, 2 trang danh mục.
- 59 action, 70 spec.
- Khái niệm người dùng gặp: trên 20. Gồm:
  - 3 họ mã cho một bộ: `B01.SET`, `B01.CD`, `BO-01`;
  - Cycle QR, QC trạm khác QC mẻ, SUB, BD, `HOLD_QC`;
  - 3 cửa biến động (đổi danh mục / hỏng-mất / chuyển);
  - phiếu duyệt ADMIN.

**Mâu thuẫn tài liệu (phải chốt trước khi code tiếp):**

| Điểm | Nguồn A | Nguồn B | Thực tế mã |
|---|---|---|---|
| BOM ở Đóng gói | `domain-overview.md:88` ✓ «Quét + đối chiếu cấu phần… thiếu cấu phần: cảnh báo» | `domain-decisions-cssd-instrument.md:21` ✓ D8 «BOM không áp dụng trong quy trình xử lý» (PO 2026-10-21), panel đã gỡ | theo D8 → **sửa domain-overview:88** |
| Mẻ hỏng: bộ về đâu | `18-CSSD…:109` ✓ AB-1 phương án A: về `TIEP_NHAN` | `18-CSSD…:177` ✓ PO chốt lại 2026-10-10: về `DONG_GOI` | theo `:177` (K3/K4 đã chạy) → **đánh dấu :109 là đã thay** |
| Cửa «Chuyển» | `domain-overview.md:222`: `/cssd-su-co` (cần kiểm) | `domain-decisions:41-42`, README: `/cssd-dung-cu` tab `LUAN_CHUYEN` | cần kiểm |

**Rườm rà so với việc chính:**
- 3 họ mã cho một bộ.
- Mẻ có 2 đường vào: tab Mẻ và `/cssd-erp/batch`.
- Trạm 5 gọi là «trạm» nhưng không quét được.
- 3 cửa dụng cụ cộng phiếu duyệt cho việc mà nhân viên trạm không cần.

**Lõi tối thiểu:** Tiếp nhận → Làm sạch → QC → Đóng gói → phiếu mẻ (máy, BD, 3 QC, nhả; tổ trưởng nhập BI) → Cấp phát → truy vết bộ/mẻ/khoa → báo cáo.
- Màn cần: `/cssd-quy-trinh` (3 tab) và `/cssd-erp/report`.
- **Tạm ẩn với nhân viên trạm:** `/cssd-thiet-bi`, `/cssd-hoa-chat`, tab đề nghị/chuyển của `/cssd-dung-cu`, các trang danh mục (ADMIN nhập sẵn bộ và máy), `/cssd-su-co` (trừ sự cố mẻ tự sinh). Chỉ dùng một họ mã `B01.SET.*` trên tem.

**Tiêu chí L1 (thay tiêu chí «một đầu mối» của bản 1):** CSSD có nhiều nhân viên, mỗi người đứng một hoặc nhiều trạm. Vì vậy L1 đo **theo trạm**, không theo một người:
- Mỗi trạm trong 6 trạm do chính nhân viên đang đứng trạm đó thao tác trên thiết bị thật tại trạm (điện thoại/máy quét), ≥ 1 ca làm việc trọn.
- Tổ trưởng thực hiện ≥ 1 lần nhả mẻ và ≥ 1 lần nhập BI.
- Thời gian thao tác mỗi trạm (quét → ghi xong) đo được và **≤ 60 s/bộ**; trạm nào vượt thì ghi lại thành lát sửa.
- Truy vết một bộ ra mẻ, máy và khoa nhận **< 1 phút** (`van-de-nguoi-dung.md:32`).
- Số bộ cấp phát/ngày trên app khớp sổ tay của tổ ≥ 5 ngày.

**Lát đầu tiên:**
1. Chốt 3 mâu thuẫn trên (sửa tài liệu, không sửa mã).
2. Ẩn menu ngoài lõi với vai nhân viên trạm.
3. Đóng CSSD-004 (lỗi mở duy nhất).
4. Lên prod cùng lô G1.

**Không thêm tính năng CSSD** cho đến khi có số đo theo trạm.

### 3.3 NKBV: giám sát nhiễm khuẩn bệnh viện (ưu tiên 3)

**Mục đích:** phát hiện và phân loại HAI ở người lớn theo CDC/NHSN, ra tỉ lệ theo khoa/kỳ. **Vai:** KSNK chuyên trách (tạo phiếu, thẩm định, loại trừ), khoa lâm sàng (xem/điền ca khoa mình), Vi sinh (nhập cấy dương), Admin.

**Quy trình SSOT** (`hai-identification-data-flow-20260827.md:99-110`, cần kiểm):
1. Copy kết quả LIS → tạo bệnh án nếu chưa có.
2. Bổ sung khoa từng ngày, CVC/Foley/máy thở, CĐHA, ngày mổ.
3. Hàng đợi xét nghiệm dương «chưa phân tích».
4. Chọn Index.
5. Máy gợi ý protocol trong IWP. Bắt buộc theo thứ tự: Secondary BSI trước CLABSI; đờm kèm thở máy thì VAE.
6. Tạo phiếu hoặc bỏ qua có lý do → xác nhận/loại trừ.

Cổng: HAI khi DOE ≥ ngày 3; LOA theo Transfer Rule; loại trừ bắt buộc lý do.

**App:**
- 3 trang: `/giam-sat-nkbv` với 5 tab (ca, bệnh án, dashboard, vi sinh, mẫu số), và 2 trang danh mục.
- 31 action, 91 spec, khoảng 186 file mã.
- Khái niệm trên 20: IWP, DOE, POA/HAI, RIT, SBAP, SP 30/90, Event Period, LOA, Secondary BSI, 5 hội chứng, hơn 30 site Ch.17, L1/L2/L3. Không có API HIS/LIS nên **mọi dữ liệu nhập tay**.

**Rủi ro đúng chuẩn (đối chiếu NHSN 2026 §5).** Đây là lỗi `fix`, không phải tính năng:

| # | Lỗi | Hậu quả |
|---|---|---|
| 1 | SSI: ca PATOS bị loại khỏi ca và tử số (`nkbv-rules-engine.ts:862-868`) | **Đếm thiếu SSI** |
| 2 | VAE: baseline lấy ngày nền thứ 2; không chuẩn hóa PEEP 0–5 (`nkbv-vae-vent-compute.ts:157,160`) | Gọi VAC dương quá tay |
| 3 | BSI/CLABSI thiếu loại trừ ECMO/VAD/tự tiêm/EB và danh sách tác nhân | Đếm thừa CLABSI |
| 4 | PNEU: PNU3, nấm loại trừ | Phân loại sai |
| 5 | BONE thiếu IWP 21 ngày/RIT hết đợt | Phân loại sai |

Lưu ý: SSOT app ghi NHSN **2025 v3.3**. Một phần lệch có thể do thay đổi 2025→2026 → cần PO chốt phiên bản trước khi sửa.

**Rườm rà/mâu thuẫn (cần kiểm):**
- Form lâm sàng: `domain-specification.md` mô tả 4 form do khoa lâm sàng điền và tự gọi là «legacy». `clinical-forms.md` mô tả 5 hội chứng trên một màn.
- Trạng thái: `van-de-nguoi-dung.md:24` bỏ `CHO_XAC_MINH`/`CHO_DUYET`, trong khi domain-specification còn.
- Số mục tham chiếu trong `clinical-forms.md` lệch mục lục SSOT v3.3.
- Engine có panel MDRO, CSSD-RCA, device registry, mẫu số hằng ngày, trong khi phạm vi đã chốt là «ghi ca + danh sách + tỉ lệ».
- LabID đã tắt hẳn.

**Lõi tối thiểu:**
- Bước: nhập bệnh án (vào viện, khoa, dụng cụ) → nhập cấy dương → chọn Index → phân tích → tạo phiếu → xác nhận/loại trừ → tỉ lệ theo khoa/kỳ.
- Tab cần: bệnh án, vi sinh, ca, dashboard.
- Tạm ẩn: mẫu số tự động (dùng census tay), MDRO, CSSD-RCA, site Ch.17 ngoài 5 hội chứng.

**Tiêu chí L1:**
- KSNK chuyên trách nhập ≥ 10 ca thật.
- Phân loại khớp đánh giá tay của chuyên gia ở ≥ 9/10 ca.
- Mỗi ca từ dữ liệu copy tới phiếu < 5 phút.
- Tỉ lệ tháng khớp tính tay.

**Lát đầu tiên** (song song được với G1 vì là `fix` engine):
1. PO chốt phiên bản NHSN (2025 hay 2026) và 4 câu treo của bản đối chiếu: sốt ≤ 65 tuổi UTI, LabID, phiên bản, PATOS.
2. Sửa 1→5 theo thứ tự trên, mỗi mục một lát ≤ 3 file + spec từ ca thử của gói.

**Không thêm `feat` NKBV** cho đến khi 5 mục này xong và có người nhập ca.

### 3.4 QLCV: quản lý công việc khoa KSNK (ưu tiên 4)

**Mục đích:** giao và theo dõi việc nội bộ khoa KSNK: người, việc, hạn, tiến độ. Người dùng là **chính nhân viên khoa KSNK**, nên đây là module dễ có người dùng thật nhất sau VST/GSC.

**Quy trình SSOT** (`19-QLCV-DOMAIN-SSOT.md`):
1. Tạo việc (tiêu đề + đúng 1 người làm chính + hạn nếu Đột xuất/Khẩn).
2. `DANG_LAM`.
3. Cập nhật checklist/%.
4. Khi đạt 100%: Đột xuất/Khẩn → `CHO_DUYET` → nghiệm thu → `HOAN_THANH`; Định kỳ tự `HOAN_THANH`.

Mọi chuyển trạng thái qua `fn_qlcv_transition` + nhật ký. Quá hạn do cron.

**App:** 1 trang `/quan-ly-cong-viec`, 4 tab (Điều hành, Nhiệm vụ, Danh mục định kỳ, Thống kê & Báo cáo), bảng + Kanban 5 lane. Khoảng 10 khái niệm: 7 trạng thái + «đề xuất», 3 loại, 3 ưu tiên, nhiệm vụ, định kỳ, nhóm chuyên môn, phối hợp/theo dõi.

**Rườm rà/mâu thuẫn:**
- «Quá hạn» có 3 cách nhận biết (`19-QLCV…:75` ✓): mã `QUA_HAN`, cờ `is_qua_han`, hoặc hạn đã qua trên phiếu mở. Người dùng chỉ cần một tín hiệu.
- SSOT hỏi «ai duyệt» nhưng không có cột người nghiệm thu trên danh sách.
- Import, nhóm chuyên môn, nhắc hạn có trong app mà SSOT không nêu (cần kiểm).
- Prod: 1 nhiệm vụ, 0 công việc.

**Lõi tối thiểu:** tạo → giao → cập nhật % → nghiệm thu (nếu đột xuất) → báo cáo theo người/quá hạn. Tạm ẩn: Kanban, Nhiệm vụ, Định kỳ, import, nhóm chuyên môn.

**Tiêu chí L1:** ≥ 3 nhân viên khoa KSNK dùng 2 tuần; ≥ 20 việc thật; báo cáo quá hạn khớp đếm tay.

**Lát đầu tiên:** ẩn theo lõi; hiện một tín hiệu quá hạn duy nhất; thêm cột người nghiệm thu.

### 3.5 Đào tạo: thi trắc nghiệm KSNK (ưu tiên 5, nhưng nội dung đã có)

**Mục đích:** thi trắc nghiệm KSNK và sổ kết quả (không phải LMS). **Vai:** nhân viên dự thi, người quản trị đề/kỳ.

**Quy trình SSOT** (`dao-tao/domain-overview.md`):
1. Ngân hàng câu (Excel, upsert theo `ma_cau`).
2. Mở kỳ, bắt buộc gán ≥ 1 khoa/NV.
3. NV khai họ tên + khoa.
4. Máy rút đề + snapshot.
5. Làm bài, đồng hồ máy chủ.
6. Nộp, chấm.
7. Đạt nếu ≥ ngưỡng.
8. Sổ kết quả + xuất Excel.

Thi thật nộp quá ân hạn 30 s → `dat=false` (`:188` ✓, PO 2026-10-24).

**App:** 9 trang (cổng, thi thử, thi thật, làm bài, kết quả, 4 trang admin). Khoảng 8 khái niệm.

**Rườm rà/mâu thuẫn và lệch dữ liệu:**
- «Còn lượt» trên danh sách chỉ đếm bài đã nộp; lúc bắt đầu thì đếm cả bài đang làm (`:318-319` ✓). Người dùng thấy «còn lượt» nhưng vào thi bị báo hết.
- Họ tên/khoa tự kê (`:322` ✓), sổ kết quả có thể lệch danh mục nhân sự.
- **Lệch schema:**
  - Mã app đọc cột `target_roles` (`dao-tao-bank.actions.ts:124,132` ✓). Seed 9 nhóm đối tượng của PO cũng ghi cột này.
  - **Không migration nào trong repo tạo cột `target_roles`** (✓ grep `supabase/` rỗng). Hoặc cột được thêm thẳng trên prod (drift), hoặc mã đang đọc cột không tồn tại → **cần kiểm trên prod trước khi nạp 6.000 câu**.
- 9 nhóm đối tượng `ROLE_*` (KSNK.QT.03.BM.02) là phân loại người học. Chúng khác 5 vai đăng nhập của RBAC. Cần ghi rõ để không trộn.

**Lõi tối thiểu:** ngân hàng → 1 kỳ có gán → làm bài → sổ kết quả + Excel. Tạm ẩn: ôn tập theo mức độ, chứng chỉ, Bloom/tỉ lệ rút đề.

**Tiêu chí L1:** 1 kỳ thi chính thức thật với ≥ 1 khoa; ≥ 20 bài nộp; tỉ lệ đạt khớp tính tay; không ai bị báo sai lượt.

**Lát đầu tiên:**
1. Viết migration `target_roles` cho khớp prod (đọc prod trước, chỉ đọc).
2. Sửa đếm lượt cho thống nhất.
3. Nạp ngân hàng 6.000 câu trên local, kiểm rút đề theo đối tượng.

### 3.6 Nền: Quản trị hệ thống · Tổ chức · Phê duyệt

- `/quan-tri-he-thong` còn 3 màn thật: tài khoản, phân quyền, trang chính. 7 route con là redirect sang `/to-chuc` và danh mục module (✓). Kiến trúc AR-0..AR-8 (Quản trị = hệ thống; danh mục về module) đã thực hiện.
- **Việc:** chỉ sửa khi chặn module đang lên L1. Đưa danh sách redirect và mã chết (CCS, khoảng 3.000 dòng theo bản 11-06) cho PO duyệt xóa.
- Chất thải/đồ vải (`/chat-thai-do-vai`): ngoài lộ trình (PO 11-06 câu 8). Giữ nguyên.

---

## 4. Chiến lược hài hòa: một đường chung cho mọi module

### 4.1 Đường chung (áp cho từng module theo thứ tự)

```
Chốt SSOT (sửa mâu thuẫn tài liệu) → Ẩn ngoài lõi → fix đúng chuẩn → LÊN PROD → người thật dùng → đo L1 → mới mở feat
```

Cổng cứng giữa các bước:
- Không `feat` khi module chưa lên prod.
- Không mở module kế khi module trước chưa có **số đo** L1. Không cần *đạt* L1, chỉ cần đã đo và có danh sách lát sửa từ người dùng.

### 4.2 Lịch theo giai đoạn

| Giai đoạn | Việc | PO làm | Claude làm | Xong khi |
|---|---|---|---|---|
| **G1 — Lên prod** | Lô migration + merge + deploy | Authorize MCP Supabase/Vercel (`/mcp`), duyệt lô | Áp ~32 migration theo thứ tự (NEN-003 trước), merge → `main`, deploy, smoke 3 kịch bản VST/GSC trên prod | `list_migrations` khớp repo; prod chạy sha mới. **Dừng:** 1 migration lỗi → dừng lô, không deploy |
| **G2 — VST/GSC L1** | Đo người thật | Nêu người nhập + người khóa sổ | Phiếu đo 15 phút (`giam-sat/van-de-nguoi-dung.md` §6), truy vấn phiên/tuần, đối soát GSC tay, chốt ngưỡng | Có số 4 tuần + danh sách góp ý thành lát |
| **G2′ — NKBV đúng chuẩn** (song song, chỉ `fix`) | 5 lỗi phân loại | Chốt phiên bản NHSN + 4 câu treo | 5 lát, mỗi lát ≤ 3 file + spec | Spec từ ca thử của gói xanh |
| **G3 — CSSD L1** | Theo trạm | Bố trí nhân viên từng trạm + tổ trưởng 1 ca | Chốt 3 mâu thuẫn, ẩn ngoài lõi, đóng CSSD-004, đo thời gian theo trạm | Số đo 6 trạm + truy vết < 1 phút |
| **G4 — QLCV L1** | Dùng nội bộ khoa KSNK | Cho ≥ 3 người dùng 2 tuần | Ẩn theo lõi, 1 tín hiệu quá hạn, cột người nghiệm thu | ≥ 20 việc thật |
| **G5 — Đào tạo L1** | 1 kỳ thi thật | Chọn khoa + ngân hàng câu | Migration `target_roles`, sửa đếm lượt, nạp ngân hàng | ≥ 20 bài nộp |
| **G6 — NKBV L1** | Nhập ca thật | KSNK chuyên trách nhập 10 ca | Ẩn theo lõi, hỗ trợ nhập | ≥ 9/10 ca khớp |

**Nhịp:** mỗi tuần một lần deploy (thứ Sáu), mỗi lần vẫn hỏi PO. Local không đi trước prod quá 1 tuần.

G4 (QLCV) và G5 (Đào tạo) có thể chạy song song với G3 (CSSD), vì người dùng là chính khoa KSNK và không đụng cùng mã. Thứ tự PO giữ nguyên cho phần **mở `feat`**.

### 4.3 Giảm chi phí quy trình (để các giai đoạn trên chạy được)

1. **Một file trạng thái** cho phiên mới: HANDOFF ≤ 6 KB, trỏ sổ lỗi và báo cáo này. Roadmap §5 cắt về ≤ 25 KB; lịch sử đẩy vào git.
2. **Không thêm** script/sổ/cổng readiness mới. Công cụ hiện có (`so-loi`, `module:gate`, `module:audit`) đủ.
3. **Một nhánh, một checkout** sau G1. Đóng worktree cũ; file rời ở gốc checkout chính để PO chọn giữ/bỏ (không xóa khi chưa duyệt).
4. Hook chặn commit `feat(<module>)` khi module chưa qua G1 (đề xuất, chờ PO).

---

## 5. Quyết định cần PO (mặc định nếu im)

| # | Câu hỏi | Mặc định |
|---|---|---|
| 1 | Duyệt G1 (lô migration + merge + deploy)? | Không làm. Cần PO chủ động authorize MCP |
| 2 | VST/GSC: ai nhập, ai khóa sổ (theo vai)? | Đo theo tài khoản có phiên trên prod |
| 3 | GSC mẫu mỏng: 20 hay 30? Ngưỡng màu 85/70/80/90 lấy theo mục tiêu viện hay bỏ tô màu? | Giữ 30 cho GSC; ngưỡng ghi «tham khảo» |
| 4 | NKBV: SSOT theo NHSN 2025 v3.3 hay nâng 2026? PATOS, LabID, sốt UTI ≤ 65 tuổi? | Giữ 2025; sửa PATOS, baseline VAE theo cả hai bản (không đổi giữa hai bản, cần kiểm) |
| 5 | CSSD: chấp nhận ẩn thiết bị/hóa chất/đề nghị/danh mục với vai nhân viên trạm? | Có |
| 6 | Đào tạo: `target_roles` trên prod có chưa (để viết migration khớp)? | Đọc prod khi MCP mở |
| 7 | Duyệt danh sách xóa: 7 route redirect + mã chết CCS? | Chỉ liệt kê, không xóa |

---

## 6. Chưa kiểm

- Số liệu prod là của 2026-11-06 (MCP Supabase chưa authorize); sha đang chạy trên Vercel chưa xác minh.
- Trích dẫn không có ✓ lấy từ báo cáo phân rã của agent chỉ đọc. Các mục van-de-nguoi-dung CSSD-017, NKBV-023 trong tài liệu đã cũ so với git.
- Số khái niệm người dùng gặp là ước từ tài liệu và tab, chưa đếm trên giao diện.
- Rủi ro NKBV §3.3 lấy từ bản đối chiếu NHSN 2026 (agent đọc mã, chưa chạy ca thử).
- `target_roles`: chỉ biết vắng trong migration repo; chưa biết trạng thái prod.
- Đếm commit theo đường dẫn: commit chạm nhiều module được đếm ở mỗi module.
