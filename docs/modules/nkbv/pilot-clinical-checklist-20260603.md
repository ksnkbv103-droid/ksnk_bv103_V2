# NKBV — Pilot checklist form lâm sàng (CDC) — UAT sign-off

> D-14 · Code: `NkbvClinicalChecklistModal` + sub-forms · Spec: `nkbv-rules-engine.spec.ts`

## Phủ syndrome (verified code)

| Syndrome | Sub-form | Automated spec |
|----------|----------|----------------|
| BSI | `BsiClinicalSubForm` | `nkbv-rules-engine.spec.ts` |
| UTI | `UtiClinicalSubForm` | ✓ |
| VAP/PNEU | `PneuClinicalSubForm`, `VaeClinicalSubForm` | ✓ |
| SSI | `SsiClinicalSubForm` | ✓ + `CssdTraceLink` |

## Kịch bản tay (Pilot DoD)

| # | Kịch bản | Làm gì trên UI | Kỳ vọng thấy | Kỹ thuật verify | UAT khoa KSNK |
|---|----------|----------------|--------------|-----------------|---------------|
| 1 | **BA-centric — tạo phiếu muộn** | Import LIS → mở Hub bệnh án → chọn XN trên bảng chung → phân tích → Kết luận → **Tạo phiếu** | Import **không** tự spawn `nkbv_fact_su_kien`; XN (+) chưa phân tích có badge «Chưa PT»; phiếu chỉ sinh sau nút Tạo phiếu | Manual Hub BA + `nkbv-vi-sinh-analysis-status` · kiến trúc [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md) | [ ] khoa; eng 2026-08-09 |
| 2 | Khoa điền form → chờ duyệt | Sau tạo phiếu: mở ca → điền form lâm sàng → gửi | Trạng thái → `CHO_DUYET` | Manual `/giam-sat-nkbv` | [ ] |
| 3 | KSNK xác nhận / loại trừ | Panel thẩm định: Phê duyệt hoặc Loại trừ (+ lý do) | `XAC_NHAN` hoặc `LOAI_TRU` | Manual adjudication | [ ] |
| 4 | Import trùng mã XN | Dán lại cùng `ma_xet_nghiem` theo mẫu cố định | Hệ thống bỏ qua dòng trùng | Manual portal · `nkbv-vi-sinh-unique-key.spec.ts` · khóa `ma_xet_nghiem` | [ ] khoa; eng 2026-08-02 |
| 8 | Import âm/dương/nhiễu | Mẫu có 3 loại `ket_qua` | Cả 3 lưu kho; **không** tự tạo phiếu từ LIS | Manual + `nkbv-vi-sinh-template.spec.ts` | [ ] |
| 9 | Cảnh báo RIT/SBAP | Import đợt 2 cùng BA trong cửa sổ | Preview + cột Cảnh báo trên kho / khi phân tích BA | Manual + `nkbv-import-window-scan.spec.ts` | [ ] |
| 10 | Cổng lâm sàng IWP | Gửi checklist thiếu triệu chứng/ngày ngoài IWP | Không chuyển `CHO_DUYET`; loại trừ vẫn được | Manual + `nkbv-clinical-submit-gate.spec.ts` | [ ] |
| 11 | UX 2 bước (bỏ tab VS) | Mở ca nghi ngờ | Thấy tóm tắt LIS (chỉ xem) + tab Lâm sàng / KSNK; có ô ghi chú tùy biến | Manual modal | [ ] |
| 5 | SSI ↔ CSSD | Ca SSI có `ma_cycle_qr_lien_quan` | Hiện link truy vết CSSD (`CssdTraceLink`) | Manual + migration `20260602150000` | [ ] |
| 6 | Tách VAE / VAP / HAP | Phán quyết mẫu: chọn lần lượt VAE, VAP, HAP | Mỗi loại mở form/engine riêng (VAE: VAC→IVAC→PVAP; VAP/HAP: PNEU); nhãn cột danh sách không gộp | Manual + `nkbv-loai-labels.spec.ts` + `nkbv-rules-engine.spec.ts` | [ ] |
| 7 | Lọc hàng đợi loại + trạng thái | Tab Danh sách phiếu: chọn 1 loại + 1 trạng thái | Bảng chỉ còn phiếu khớp bộ lọc; đổi «Tất cả» → hiện lại đủ | Manual `/giam-sat-nkbv` | [ ] |

### Delta SSOT v2 W1–W2 (2026-08-04)

| # | Kịch bản | Kỳ vọng |
|---|----------|---------|
| W1-1 | Đăng ký CL trên Device Registry của BA → Prefill form BSI | Ngày CVC / first-access đổ vào form |
| W1-2 | Tab Mẫu số → Preview từ Device Registry | Hiện số CVC/Foley/Vent; **không** ghi đè ô nhập tay |
| W1-3 | Ca VAE: panel metrics | Cửa sổ gọi **Event Period 14 ngày**, không nhãn “IWP ±3” |
| W2-1 | PNEU không vent → classification | `PNU1_NON_VAP` (engine) |
| W2-2 | Yeast máu + ABUTI flags | Không Secondary từ UTI (ASB / Primary BSI path) |

### Delta form domain (2026-08-05)

| # | Kịch bản | Kỳ vọng |
|---|----------|---------|
| F-1 | Mở BSI có CL trên Registry | Ngày CVC prefill; phiếu có shell + IWP strip; 3 triệu chứng tách |
| F-2 | UTI + Foley | Không hiện tiểu buốt/gấp/rắt; tick DOE/DOE−1 |
| F-3 | VAE PVAP + cấy máu | Khối Secondary BSI hiện; strip gọi Event Period |
| F-4 | PNEU tick 2 triệu chứng hô hấp | Count ≥2; badge engine VAP/Non-VAP |
| F-5 | SSI PATOS | Engine `PATOS`; có ngày mổ + DOE |

### Delta BA 3 khối + ổn định lưới (2026-08-09)

| # | Kịch bản | Kỳ vọng |
|---|----------|---------|
| BA-1 | Bảng chung: khung VV−2 → hết (ra viện/hôm nay) + kéo tới hết RIT khi có phiên | Cột ngày bắt đầu 2 ngày trước vào viện |
| BA-2 | Tick/untick CĐHA (XQ) trên bảng chung | 1 chip/ngày/loại; untick xóa hết bản trùng cùng khóa — **không** hiện lại |
| BA-3 | Tick TC SSI / LS trên bảng chung hoặc panel | Optimistic UI; không mở form phân tích khi chỉ gắn bằng chứng |
| BA-4 | Quyền tối thượng bảng chung | CĐHA / TC DOE-SSI chỉ thêm-sửa-xóa trên bảng chung; bảng phân tích đọc xuống |
| BA-5 | Registry CVC + CLIP | 4 điều kiện CLIP khi thêm CVC; hiện trạng thái tuân thủ trên dòng Registry |
| BA-6 | Kho vi sinh MDRO → LabID | Nút LabID tạo event NHSN (máu MRSA/… hoặc phân CDI); trùng 14 ngày → không event mới |

---

1. Đăng nhập KSNK → `/giam-sat-nkbv` → Hub bệnh án → làm **#1 (BA-centric)** + **BA-1…BA-4**.
2. Sau tạo phiếu: làm **#2** / **#3** (form → duyệt).
3. Vào portal import vi sinh → làm **#4** (dán lại cùng dữ liệu đã import một lần).
4. Mở / tạo ca SSI có QR chu kỳ CSSD → làm **#5**.
5. Ký bảng Sign-off bên dưới khi kịch bản tay PASS. Nếu fail: mở chat mới `/intake-nv` ghi rõ #kịch bản + ảnh/mô tả.
6. **Mở route pilot** (`BLOCKED_EXACT` `/giam-sat-nkbv`) chỉ sau khi khoa KSNK ký Sign-off.

**Engineering sẵn sàng UAT (2026-07-09; re-verify local 2026-07-26):** Day-3 server + map `CHO_XAC_MINH` Done · vitest NKBV **29 PASS** (`rules-engine` + `timeline-math` + `loai-labels`) · `verify:engineering` PASS. Chữ ký khoa (#2–#5 tay) = bước còn lại của DOM-08 — **không thể ký hộ khoa trong chat này**.

Checklist vận hành sau cải tổ cửa vào/QR (2026-07-28): [`uat-after-reform-20260728.md`](../../reference/architecture/uat-after-reform-20260728.md) — mục D trỏ về bảng này.

## Sign-off

| Vai trò | Họ tên | Ngày | Chữ ký |
|---------|--------|------|--------|
| KSNK pilot lead | | | |
| IT / dev | | | |

## Ghi chú

Form đủ cho pilot BV103; trường NHSN bổ sung theo yêu cầu BV — backlog riêng.

```bash
npm run verify:engineering
npx vitest run src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.spec.ts src/modules/giam-sat-nkbv/lib/nkbv-timeline-math.spec.ts \
  src/modules/giam-sat-nkbv/lib/nkbv-vi-sinh-template.spec.ts \
  src/modules/giam-sat-nkbv/lib/nkbv-import-window-scan.spec.ts \
  src/modules/giam-sat-nkbv/lib/nkbv-clinical-submit-gate.spec.ts
# Schema: npm run mdm:migrate:local  (20260802121000_nkbv_vi_sinh_ma_xet_nghiem_ket_qua)
```
