# Audit lệch NKBV runtime ↔ SSOT chẩn đoán v4.0

| | |
|--|--|
| **Ngày** | 2026-09-22 |
| **Chuẩn** | [`10-NKBV-diagnosis-domain-ssot-adult.md`](10-NKBV-diagnosis-domain-ssot-adult.md) v4.0 (CDC NHSN PSC January 2025; người lớn; HAI = DOE ngày lịch ≥3) |
| **Giữ lịch sử** | [`hai-surveillance-domain-ssot-20260827.md`](hai-surveillance-domain-ssot-20260827.md) v3.3 — không xóa |
| **Phạm vi** | Đối chiếu docs + engine + migration + UI. **Không** sửa thuật toán trong PR này. |
| **Cách đọc trạng thái** | **Khớp** = runtime làm đúng luật v4.0. **Lệch** = có code/UI nhưng sai hoặc dễ hiểu nhầm. **Thiếu** = v4.0 yêu cầu, runtime chưa có. |

Giả định đã kiểm: câu “48 giờ” còn trong mô tả form cũ của `domain-specification.md`; nhánh nhi (PedVAE / LCBI-3 / SUTI-2) **không** còn được engine đánh giá, nhưng còn nhãn và mã lịch sử.

---

## Tóm tắt cho PO — 10 lệch đáng xử lý trước

| # | Mức | Lệch | Vì sao quan trọng | Việc | Loại thay đổi |
|---|-----|------|-------------------|------|----------------|
| 1 | **P0** | SSI vẫn chọn DOE trong cửa sổ ±3 ngày quanh ngày phát hiện, và mọi hội chứng (kể SSI, VAE) đều nhận nhãn POA/HAI “ngày thứ ≥3” | SSI phải dùng Surveillance Period 30/90, không IWP/POA Ch.2. VAE dùng ngày đầu worsening, không POA day-3. Nhãn in phiếu / KPI có thể sai loại ca | Tách `calculateCdcMetrics`: SSI DOE trong SP; ẩn POA/HAI day-3 với SSI và VAE | code |
| 2 | **P0** | Organ/Space SSI có thể “đạt” chỉ bằng mủ / cấy / áp xe, kể cả khi site Ch.17 đã có định nghĩa nhưng chưa đủ tiêu chí | v4.0 C.5 bước 5: Organ/Space **phải** có ≥1 tiêu chí Ch.17 | Khi `ch17.applicable`, chỉ `ch17.met` mới dương tính | code |
| 3 | **P0** | Regex “tác nhân đường ruột” gồm `pseudomon` | MBI-LCBI chỉ khi đủ list MBI. Pseudomonas không thuộc list đó → CLABSI bị gọi nhầm MBI, tụt tử số CLABSI | Danh sách MBI organism theo Ch.4, không regex rộng | code |
| 4 | **P0** | IVAC = một ô tick “kháng sinh mới ≥4 ngày”, không đếm Qualifying Antimicrobial Days | Ca VAC có thể lên IVAC (hoặc bị giữ VAC) theo khai báo, không theo lịch dùng thuốc | Tính QAD từ lưới ngày kháng sinh trong VAE Window | code + UX |
| 5 | **P1** | Preview máu sau sự kiện coi **mọi** VAE là PVAP khi gắn Secondary | v4.0: Secondary BSI của VAE **chỉ PVAP**. VAC/IVAC không nhận Secondary | Chỉ truyền `primarySite: "PVAP"` khi phân loại đúng PVAP | code |
| 6 | **P1** | Form PNEU ép tuổi thiếu hoặc ≤12 thành **45** | Người không rõ tuổi bị đưa vào nhánh người lớn / có thể đủ cửa VAE ≥18 | Thiếu tuổi → không chốt VAE; không bịa 45 | code + UX |
| 7 | **P1** | Cổng LIS đặt tên `isHaiSuspect` và test ghi “HAI” khi **ngày lấy mẫu** ≥ ngày vào + 2 | Đúng là hàng đợi, không phải DOE. Tên và màu dòng “willSpawnCase” dễ hiểu thành đã là ca HAI | Đổi tên thành hàng đợi “Chưa PT”; không gọi là HAI | code + UX |
| 8 | **P1** | `domain-specification.md` §3 vẫn hỏi dụng cụ “trong vòng 48 giờ” | Engine đã dùng >2 **ngày lịch**. Câu 48 giờ trên hợp đồng UI dễ bị code lại thành định nghĩa HAI | Sửa chữ §3 thành >2 ngày lịch; giữ banner “không phải định nghĩa ca” | docs |
| 9 | **P1** | Nhãn nút vẫn “VAP / PedVAP”; thông báo VAE còn chữ PedVAP | PedVAE / PNU nhi là OUT. Nhãn gợi ý còn đường nhi | Bỏ PedVAP khỏi nhãn người dùng | UX |
| 10 | **P1** | Kết luận ca nằm `verification_data` jsonb; thiếu ngày vào viện thì preview gán **HAI** | Không có cột DOE / POA / RIT để kiểm tra. Mất ngày vào → mặc định bệnh viện | Không mặc định HAI khi thiếu admission; cột dẫn xuất (DOE, poa_hai, rit_end) khi PO chốt schema | code, sau đó migration |

Việc **không** làm trong PR này: viết lại module, migration production, tiêu chí mới ngoài v4.0.

---

## Chỗ còn chữ “48 giờ” như thể là định nghĩa HAI

Rà `src/**/*nkbv*` và `docs/modules/nkbv/**`: **không** có công thức `hours_since_admit >= 48` → HAI.

| Vị trí | Câu | Có phải định nghĩa HAI? |
|--------|-----|-------------------------|
| [`domain-specification.md`](domain-specification.md) dòng mở đầu §3 | Banner đã nói field “48 giờ” là **legacy**, runtime dùng >2 ngày lịch | Không — nhưng ba bullet dưới vẫn viết “trong vòng 48 giờ” |
| Cùng file §3.1 `had_ventilator` | “thở máy xâm nhập liên tục trong vòng **48 giờ** trước thời điểm cấy” | **Có nguy cơ hiểu nhầm** device/HAI. Engine không đọc câu này |
| Cùng file §3.2 `had_central_line` | “Central Line trong vòng **48 giờ** trước ngày cấy máu” | Như trên |
| Cùng file §3.3 `had_urinary_catheter` | “sonde tiểu … trong vòng **48 giờ** trước ngày cấy” | Như trên |
| [`hai-surveillance-domain-ssot-20260827.md`](hai-surveillance-domain-ssot-20260827.md) từ điển Calendar day / Device-associated | Nhắc **không** đếm đủ 48 giờ; “>2 ngày lịch” ≠ 48 giờ | Không — câu này **chặn** hiểu nhầm |
| `src/modules/giam-sat-nkbv/lib/nkbv-timeline-math.spec.ts` | Test tên “LOA transfer rule within 24-48 hours” | Không — Transfer Rule (quy kết khoa), không phải HAI |
| UI `src/modules/giam-sat-nkbv/**/*.tsx` | Không có chuỗi “48 giờ” | Không |

Kết luận: engine và form đang chạy **không** chẩn đoán HAI bằng 48 giờ đồng hồ. Chỗ cần sửa chữ là **§3 `domain-specification.md`** (P1, docs).

---

## 1. Định nghĩa và thuật ngữ

| Hạng mục v4.0 | Trạng thái | Bằng chứng | Đề xuất | Mức | Loại |
|---------------|------------|------------|---------|-----|------|
| HAI = DOE ≥ Hospital Day 3 (ngày vào = ngày 1) | **Khớp** (LCBI/UTI/PNEU/Ch.17) | `poaOrHai` trong `src/modules/giam-sat-nkbv/lib/nkbv-shared-timeline.ts`: `dayOfHospitalization >= 3` | Giữ. Không áp nhãn này cho SSI/VAE (mục 2) | — | — |
| Cấm `hours >= 48` → HAI | **Khớp** trong code | Không có công thức giờ trong `src/modules/giam-sat-nkbv` | Sửa chữ legacy §3 domain-spec | P1 | docs |
| POA gồm 2 ngày **trước** nhập, và nếu DOE rơi trước nhập thì ghi DOE = ngày 1 cho RIT | **Thiếu** | `poaOrHai` chỉ so DOE với ngày vào; không kéo DOE về HD1 | Khi DOE ∈ {admission−2, admission−1}: ghi DOE = HD1 trước khi mở RIT | P1 | code |
| IWP = Index ±3; sốt không đặt Index | **Khớp** một phần | `clinicalIwp`; PNEU có `pneu_trigger` CULTURE vs IMAGING trong `nkbv-timeline-math.ts` | Giữ; SSI không được mượn IWP này | P0 | code |
| RIT 14 ngày, DOE = ngày 1 (DOE+13) | **Khớp** | `clinicalRitEnd` | Không hiện RIT Ch.2 trên SSI/VAE như thể cùng luật | P1 | UX |
| Device-associated = >2 ngày lịch và còn DOE hoặc DOE−1 | **Khớp** | `isDeviceAssociated`: `placedDays >= 3 && activeOnEvent` | Sửa chữ form §3 cho khớp | P1 | docs |
| Transfer Rule: DOE = ngày chuyển hoặc ngày sau → khoa chuyển đi | **Khớp** | `calculateCdcMetrics` trong `nkbv-timeline-math.ts` | Giữ | — | — |
| Mã CDC không dịch trên engine | **Khớp** | Nhãn LCBI, CLABSI, SUTI, VAC, IVAC, PVAP | Bỏ hậu tố PedVAP (mục UI) | P1 | UX |
| LIS gợi ý ≠ chẩn đoán | **Lệch tên** | `isHaiSuspectByDay3Rule` + cờ `willSpawnCase` chỉ tô màu dòng import (`NkbvViSinhImportPortal.tsx`); không tạo phiếu | Đổi tên “hàng đợi ngày lịch ≥3”, không chữ HAI | P1 | code + UX |
| in-plan / MRP | **Thiếu** | “VAE in-plan” trong `nkbv-pneu-vae-route.ts` = tuổi ≥18 và ≥4 ngày thở máy, không có kế hoạch báo cáo tháng | Ghi chú UI: chưa MRP, không tuyên bố FacWideIN | P2 | docs + UX |
| LabID / CLIP ngoài case-finding | **Khớp** hướng (code còn) | `createLabidEventFromViSinh` trả “LabID không dùng tại BV103”. File `nkbv-labid-engine.ts`, `nkbv-clip.ts` và bảng `nkbv_fact_labid_event` vẫn trong repo | Giữ tắt ghi. Không xóa bảng trong PR này | P2 | docs |
| Link “thuật toán gốc” `docs/data/nkbv/algorithms/` | **Thiếu** (link cũ) | README module trước đây trỏ thư mục không có trong repo | README đã trỏ runtime + v4.0 | — | docs (đã sửa cổng) |

Các file vẫn mở đầu bằng “thuật toán = v3.3” (chưa sửa trong PR, tránh quét docs rộng): `clinical-forms.md`, `hai-identification-data-flow-20260827.md`, `hai-criteria-element-dictionary-20260827.md`, `hai-timeline-and-diagnostic-report-20260827.md`, `ba-phieu-form-roles.md`, `ba-multi-timeline-architecture.md`, `investigation-forms/02-clinical-symptom-catalog.md`, `docs/reference/architecture/adr-nkbv-domain-ssot-alignment-20260804.md`.

---

## 2. Thuật toán từng loại

### LCBI / CLABSI

| Hạng mục | Trạng thái | Bằng chứng | Đề xuất | Mức | Loại |
|----------|------------|------------|---------|-----|------|
| Secondary **trước** CLABSI | **Khớp** | `evaluateBsiClabsi` trong `nkbv-rules-engine.ts` chạy `evaluateSecondaryBsi` trước nhãn CLABSI. Lưới: `nkbv-bsi-timeline-verdict.ts` nhận `localizedSite` | Giữ thứ tự. Site nguyên phát phải được phiên phân tích truyền vào — không tự quét mọi ca cũ nếu UI không gắn site | P1 | UX |
| LCBI-1 recognized ≥1 máu | **Khớp** | `pathogen_type === "RECOGNIZED"` | Bổ sung NCT (non-culture) và quy tắc cấy thắng NCT trong NCT−2…NCT+1 | P1 | code |
| LCBI-2: ≥2 máu separate + sốt/rét/hạ HA | **Khớp** | `commensal_culture_count >= 2 && commensal_drawn_separate && hasSx` | Giữ | — | — |
| LCBI-3 | **Khớp** (không đánh giá) | Không nhánh LCBI-3 trong engine. Taxonomy chỉ map mã cũ nếu gặp trong DB: `nkbv-classification-taxonomy.ts` | Giữ map lịch sử; không cho chọn LCBI-3 trên UI | P2 | UX |
| MBI sau LCBI, không vì “BN ung thư” | **Lệch** | MBI khi `is_intestinal_pathogen` và (ANC≥2 ngày hoặc HSCT/GVHD hoặc tiêu chảy). `classifyPathogen` coi `pseudomon` là intestinal (`nkbv-pathogen-rules.ts`) | List MBI đúng Ch.4; bỏ Pseudomonas | P0 | code |
| CVC >2 ngày lịch | **Khớp** | `isDeviceAssociated` hoặc `cvc_placed_days >= 3` | Giữ | — | — |
| Nấm loại trừ toàn NHSN (kể *Pneumocystis*) | **Lệch** | `isFungiRespiratory` có Blastomyces…Cryptococcus, **không** Pneumocystis; chỉ chặn sớm trên BSI | Một cổng loại trừ cho mọi định nghĩa | P1 | code |

### UTI / CAUTI

| Hạng mục | Trạng thái | Bằng chứng | Đề xuất | Mức | Loại |
|----------|------------|------------|---------|-----|------|
| Cấm yeast là Index UTI; yeast + 1 vi khuẩn ≥10⁵ vẫn xét vi khuẩn | **Khớp** trên lưới | `gateUtiIndexLab` trong `nkbv-uti-timeline-verdict.ts` | Giữ. `evaluateUtiCauti` vẫn dừng nếu cờ `has_fungi_yeast_parasite` = true — caller phải chỉ bật cờ khi **chỉ** nấm (lưới đang làm vậy) | P2 | code |
| ≤2 loài, ≥10⁵ | **Khớp** | `pathogen_count > 2` → CONTAMINATION; CFU &lt; 10⁵ → LOW_CFU | Giữ | — | — |
| Mixed flora | **Khớp** trên lưới | Regex `tạp nhiễm\|mixed flora\|≥3` → đếm 3 loài, không đạt | Giữ | — | — |
| Tiểu gấp/rắt/buốt ẩn khi Foley còn | **Khớp** | `stripUtiVoidingFromLamSang` + `foleyBlockingVoiding` | Giữ | — | — |
| SUTI 1a nếu IUC device-associated, không thì 1b | **Khớp** | `CAUTI_SUTI` vs `SUTI` | Nhãn UI nên ghi đủ 1a/1b | P2 | UX |
| ABUTI = không triệu chứng + máu cùng khuẩn, không yeast | **Khớp** | Nhánh ABUTI gọi `evaluateSecondaryBsi`; yeast máu → ASB | Giữ | — | — |
| ASB không phải HAI | **Khớp** | `is_positive: false`, classification `ASB` | Giữ | — | — |
| SUTI-2 | **Khớp** (không đánh giá) | `isInfantLe1FromAge` luôn `false`. Test còn tên “UTI infant” (`nkbv-timeline-math.spec.ts`) | Xóa hoặc ghi chú test là lịch sử | P2 | code |
| Secondary từ UTI, cấm yeast máu | **Khớp** | `nkbv-shared-secondary-bsi.ts` | Giữ | — | — |

### PNEU

| Hạng mục | Trạng thái | Bằng chứng | Đề xuất | Mức | Loại |
|----------|------------|------------|---------|-----|------|
| Người lớn thở máy ≥4 ngày → VAE, không PNEU | **Khớp** | `isAdultVaeInPlan` + early return trong `evaluateVaeVap` | Không ép tuổi 45 (mục UI) | P1 | code |
| Imaging người lớn; không chốt bằng chẩn đoán bác sĩ | **Khớp** | `hasValidImaging`; bệnh nền cần ≥2 phim | Giữ | — | — |
| PNU1-A / PNU2 / PNU3 | **Khớp** hướng | `derivePneuLabTier` + đếm hô hấp: PNU1 ≥2, PNU2 ≥1, PNU3 list rộng | Đối chiếu ngưỡng CFU BAL/PSB/ETA với bảng Ch.6 khi PO rà một ca mẫu | P2 | code |
| Cấm flora miệng; Candida/CoNS/Enterococcus từ đờm trừ mô phổi / màng phổi | **Khớp** hướng | `isExcludedPvapPathogen` dùng trong lab tier | Giữ | — | — |
| Nhãn VAP vs Non-VAP theo >2 ngày máy | **Khớp** | `ventEligible` → `PNU*_VAP` hoặc `PNU*_NON_VAP` | Nhãn nút “PedVAP” bỏ (không phải nhánh engine) | P1 | UX |
| Nhánh PNU trẻ / sơ sinh | **Khớp** (không chạy) | `pneuAgeUiBranchFromAge` luôn `ADULT`. Biến `infantGasOk = true` là gốc chết | Xóa biến chết khi đụng file | P2 | code |

### VAE

| Hạng mục | Trạng thái | Bằng chứng | Đề xuất | Mức | Loại |
|----------|------------|------------|---------|-----|------|
| Tuổi ≥18 và ≥4 ngày thở máy | **Khớp** | `patient_age >= 18 && vent_days >= 4` | Cửa tuổi thật, không mặc định 45 | P1 | code |
| VAC → IVAC → PVAP | **Khớp** thứ tự | `evaluateVaeVap` | Giữ | — | — |
| VAC từ PEEP/FiO₂ ngày | **Khớp** hướng | `computeVacFromDailyVent` | Giữ; ngày ECMO/HFV phải **bỏ khỏi dải**, không hủy cả ca | P1 | code |
| IVAC: sốt/WBC **và** ≥4 QAD | **Lệch** | Chỉ `new_antimicrobial_ge_4days` boolean | Đếm QAD | P0 | code + UX |
| PVAP ngưỡng lab, cấm Candida/CoNS/Enterococcus/flora | **Lệch** (thô) | Ba cờ gộp: đờm mủ+cấy, cấy định lượng, virus/tác nhân | Tách ngưỡng BAL/ETA/PSB như PNEU | P1 | code + UX |
| Không dùng CXR trong thuật toán | **Khớp** | Nhánh VAE không đọc imaging. Form: `VaeClinicalSubForm.tsx` ghi không dùng checklist XQ | Giữ XQ cho bệnh án / PNEU, không đưa vào quyết định VAE | — | — |
| Event Period 14 ngày; Secondary chỉ PVAP | **Lệch** preview | Engine PVAP mới gọi Secondary. `buildPostEventAdminPreview` (`nkbv-ba-timeline-core.ts`) gán mọi VAE = `PVAP` | Sửa preview | P1 | code |
| APRV chỉ FiO₂ | **Thiếu** | `on_aprv_or_hfv` → `NO_EVENT` cả ngày | Pipeline FiO₂-only | P1 | code |
| PedVAE | **Khớp** (không có thuật toán) | Không file PedVAE. Còn chữ trong lý do từ chối và nhãn picker | Sửa chữ | P1 | UX |

### SSI

| Hạng mục | Trạng thái | Bằng chứng | Đề xuất | Mức | Loại |
|----------|------------|------------|---------|-----|------|
| SP 30/90 theo độ sâu và mã PT; đường mổ phụ ≤30 | **Khớp** | `resolveSsiSurveillanceDays` + `nkbv-ssi-nhsn-catalog.ts` | Giữ | — | — |
| Không IWP / POA / RIT Ch.2 | **Lệch** | `calculateCdcMetrics` nhánh SSI vẫn `clinicalIwp` để chọn DOE; sau đó `poaOrHai` gán HAI/POA. Panel `NkbvCdcMetricsPanel.tsx` bước 4 luôn hiện POA/HAI | DOE = yếu tố đầu **trong SP**; không hiện day-3 | P0 | code + UX |
| SBAP SSI cố định [DOE−3, DOE+13] | **Khớp** | `ssiSbapWindow` | Giữ | — | — |
| Organ/Space kèm Ch.17 | **Lệch** | `evaluateSsi`: `ch17.met \|\| genericOrgan` vẫn dương tính | Bỏ nhánh generic khi đã có định nghĩa site | P0 | code |
| PATOS | **Lệch** mức báo cáo | `is_patos` → `is_positive: false`, classification `PATOS`, lý do “không báo cáo SSI mới” | NHSN vẫn nhận diện SSI và loại khỏi SIR. Tách cờ PATOS khỏi “không phải SSI” | P1 | code + UX |
| Loại trừ invasive manipulation | **Thiếu** | Không thấy cổng manipulation trong `evaluateSsi` | Thêm khi có trường Operative / can thiệp | P2 | code + UX |
| Cấm Wound class Clean một số mã (APPY, COLO, …) | **Thiếu** trong lát này | Catalog SP có; không thấy chặn mẫu số Clean trong engine chẩn đoán | Kiểm tra cổng mẫu số thủ thuật riêng | P2 | code |

### Ch.17

| Hạng mục | Trạng thái | Bằng chứng | Đề xuất | Mức | Loại |
|----------|------------|------------|---------|-----|------|
| Catalog người lớn (BONE, MEN, ENDO, IAB, CDI, USI, …) | **Khớp** hướng | `nkbv-ch17-def-*.ts`; test BONE/CDI/hierarchy trong `nkbv-ch17-definitions.spec.ts` | Không thêm tiêu chí ngoài v4.0 khi sửa | — | — |
| Nhánh ≤1 tuổi | **Khớp** (không hiện) | `ch17CriterionVisibleForAge` chỉ `OVER_1Y`. USI ghi nhánh &lt;1 tuổi không dùng. `menInfantSigns` trong `nkbv-ch17-def-cns.ts` **không** gắn vào cây MEN | Xóa node chết `menInfantSigns` khi đụng file | P2 | code |
| ENDO IWP ±10, RIT/SBAP tới ra viện | **Khớp** | `endoExtendedIwp`, `endoRitSbapToDischarge` | Giữ | — | — |
| IWP/RIT/POA Ch.2 cho site còn lại | **Khớp** | Nhánh CH17 trong `calculateCdcMetrics` | Giữ | — | — |

---

## 3. Code / engine

| Hạng mục | Trạng thái | Bằng chứng | Đề xuất | Mức | Loại |
|----------|------------|------------|---------|-----|------|
| Một engine thuần, có test | **Khớp** | `src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.ts` + `*.spec.ts` | Sửa P0 kèm test ngày SSI/VAE và MBI Pseudomonas | P0 | code |
| Secondary gate dùng chung | **Khớp** | `nkbv-shared-secondary-bsi.ts`: UTI cấm yeast máu; PNEU/PVAP cấm Candida/CoNS/Enterococcus trừ lung/pleural; không khớp họ Staphylococcus/Streptococcus chỉ bằng chi | Giữ | — | — |
| Gắn dụng cụ >2 ngày lịch + gap ≥1 ngày | **Khớp** | `isDeviceAssociated`, `splitDeviceEpisodes` | Giữ | — | — |
| Tuổi người lớn | **Lệch** | `coerceAdultPatientAge` (`nkbv-age-ui.ts`) trả 45 nếu tuổi ≤12 hoặc thiếu; form PNEU gọi hàm này. Spec kỳ vọng `coerceAdultPatientAge(null, 5) === 45` | Đổi hợp đồng: thiếu tuổi = không đủ cửa VAE | P1 | code |
| Ngày vào trống → HAI | **Lệch** | `nkbv-ba-timeline-core.ts`: không có admission thì `haiStatus: "HAI"` | Trả “chưa đủ ngày vào”, không gán HAI | P1 | code |
| Panel CDC giải thích sai phép toán | **Lệch** | `NkbvCdcMetricsPanel.tsx` bước 4 viết DOE trừ `metrics.sbap_start` như thể là ngày nhập | In ngày vào viện thật | P1 | UX |
| Nấm loại trừ chưa toàn cục | **Thiếu** | Chỉ cờ BSI | Cổng Ch.2 cho mọi site | P1 | code |

---

## 4. Database

Đối chiếu migration trong `supabase/migrations/` (không chạy migrate remote).

| Hạng mục | Trạng thái | Bằng chứng | Đề xuất | Mức | Loại |
|----------|------------|------------|---------|-----|------|
| Ca = `nkbv_fact_su_kien` | **Khớp** hướng | `20260530000000_init_pilot_baseline.sql`: `ngay_vao_vien`, `ngay_phat_hien`, `verification_data jsonb` | Giữ bảng. Kết luận CDC nằm JSON, không có cột `doe` / `poa_hai` / `rit_end` | P1 | migration (khi PO chốt) |
| Vi sinh = `nkbv_fact_vi_sinh` | **Khớp** hướng | Cùng baseline: ngày lấy mẫu, tác nhân, số lượng | LIS vẫn là gợi ý; không cột “là HAI” | — | — |
| Lưới ngày–khoa / ngày–dụng cụ | **Khớp** hướng | `20260827120000_nkbv_ba_ngay_khoa_dung_cu.sql` | Nguồn đúng để đếm >2 ngày lịch | — | — |
| Phiên phân tích | **Khớp** hướng | `nkbv_fact_ba_phan_tich` (`20260909093000`) | Giữ | — | — |
| Timeline mốc | **Khớp** hướng | `nkbv_fact_ba_timeline` | Giữ | — | — |
| Tử số báo cáo theo classification | **Khớp** hướng | `fn_nkbv_major_type_from_classification` (bản `20260910123000` và các bản trước) đọc `verification_data->>'classification'` | Khi sửa nhãn MBI/PATOS/SSI, cập nhật hàm cùng lát | P1 | migration |
| LabID table còn | **Lệch phạm vi** (đã tắt ghi) | `nkbv_fact_labid_event` tạo lại trong `20260901010000_nkbv_restore_device_labid.sql`. Action từ chối ghi | Không drop trong PR này | P2 | docs |
| Không có check “HAI ≠ 48 giờ” | **Khớp** (không cần constraint giờ) | Không cột giờ nằm viện để suy HAI | Đừng thêm cột giờ. Nếu thêm cột dẫn xuất thì check `poa_hai` chỉ từ DOE ngày lịch, và null cho SSI/VAE | P2 | migration |
| Mẫu số ngày / phẫu thuật | **Khớp** hướng | `nkbv_fact_mau_so_daily`, `nkbv_fact_mau_so_phau_thuat` | Chưa thấy chặn Wound class Clean trên mẫu số một số mã PT | P2 | code |

Không đề xuất bảng tổng hợp mới.

---

## 5. UI / cách chẩn đoán

Luồng đang chạy: copy LIS/HIS → lưới bệnh án → phiên hội chứng (Secondary site trước khi mở máu thành CLABSI, `nkbv-specimen-syndrome.ts`) → engine trả classification → KSNK tạo phiếu. Đúng hướng v4.0 §D (vi sinh gợi ý, lâm sàng chốt).

| Hạng mục | Trạng thái | Bằng chứng | Đề xuất | Mức | Loại |
|----------|------------|------------|---------|-----|------|
| Hàng đợi “Chưa PT” ≠ HAI | **Khớp** hành vi, **lệch** tên biến | Badge “Chưa PT” trên `GiamSatNkbvPage.tsx`. Import tô xanh khi `willSpawnCase` | Đổi tên biến và màu cho khỏi hiểu là đã thành ca | P1 | UX |
| Bản đồ CDC một khuôn cho mọi loại | **Lệch** | `NkbvCdcMetricsPanel.tsx`: SSI có nhãn riêng ở bước 1 nhưng bước 4 vẫn POA/HAI “ngày thứ ≥3”. Công thức hiển thị trừ `sbap_start` | SSI: SP + SBAP 17 ngày. VAE: Event Period, không POA | P0 | UX |
| VAE không X-quang | **Khớp** | Hint form VAE | Giữ | — | — |
| Ch.17 form ép không nhi | **Khớp** | `Ch17ClinicalSubForm` / `SsiClinicalSubForm` truyền `isInfantLe1={false}` | Giữ | — | — |
| Nhãn PedVAP | **Lệch** | `NKBV_CHECKLIST_TYPE_PICKER_LABELS.VAP = "🫁 VAP / PedVAP"` trong `nkbv-loai-labels.ts` | “VAP (PNEU, không phải VAE)” | P1 | UX |
| Thông báo từ chối VAE | **Lệch** | `nkbv-rules-engine.ts`: “Chọn VAP (PedVAP) hoặc HAP…” | Bỏ PedVAP | P1 | UX |
| PATOS trên form | **Khớp** có hỏi | `SsiClinicalSubForm.tsx` bắt khai PATOS | Khi engine còn loại hẳn ca, chú thích: PATOS vẫn là SSI, loại khỏi SIR | P1 | UX |
| QAD / PVAP | **Thiếu** chi tiết | Ô tick thay cho lịch thuốc và ngưỡng lab | Form theo C.4.9 | P0 | UX |
| Phiếu in hiện `haiStatus` | **Lệch** với SSI/VAE | `NkbvCasePrintView.tsx`, `NkbvDiagnosticCaseForm.tsx` | In “không áp POA/HAI Ch.2” cho hai loại này | P1 | UX |

---

## Việc nên làm tiếp (không làm trong PR này)

1. **P0 code:** SSI DOE trong SP; tắt POA/HAI day-3 cho SSI và VAE; Organ/Space bắt buộc Ch.17; list MBI; đếm QAD.
2. **P1 code/UX:** Secondary chỉ PVAP; bỏ tuổi mặc định 45; thiếu ngày vào không gán HAI; đổi tên cổng LIS; bỏ chữ PedVAP; sửa §3 “48 giờ” trong domain-spec cho khớp >2 ngày lịch.
3. **P2:** xóa nhánh chết (`menInfantSigns`, `infantGasOk`); NCT LCBI; *Pneumocystis*; MRP; không đụng bảng LabID cho đến khi PO bảo gỡ.

Satellite docs còn ghi “canonical = v3.3” — sửa pointer khi đụng từng file, không quét hàng loạt.
