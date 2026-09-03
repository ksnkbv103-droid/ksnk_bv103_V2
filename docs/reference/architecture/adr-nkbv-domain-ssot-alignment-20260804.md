# ADR: Alignment Domain SSOT v2.0 ↔ module NKBV (2026-08-04)

## Trạng thái

**Accepted (2026-08-04)** — Product Owner khóa phạm vi **W0–W2**; **tạm dừng W4–W6**; W3 (LabID/CLIP) để backlog.

**Bổ sung 2026-08-26 (NK-W46 lát 1):** mở **map CDC Location trên khoa** (`mdm_dm_khoa_phong.specs.cdc_location_code`). SIR trên dashboard **vẫn số thô** — không FacWide SIR chuẩn. **Vẫn dừng:** thuật toán 80% acuity, PedVAE/ENDO, AU.

**Addendum 2026-08-27 (SSOT v3.0):** canonical thuật toán NHSN đổi sang [`hai-surveillance-domain-ssot-20260827.md`](../../modules/nkbv/hai-surveillance-domain-ssot-20260827.md) — mục lục = sổ tay CDC PSC January 2025, **chỉ người lớn**.

**Addendum 2026-08-27 (SSOT v3.1):** domain **chỉ HAI lâm sàng** — rút CLIP/LabID/AUR/Location; Ch.17 đủ tiêu chí người lớn.

**Addendum 2026-08-27 (SSOT v3.2):** Phụ lục E từ điển.

**Addendum 2026-08-27 (SSOT v3.3):** quy trình ca + dữ liệu tách [`hai-identification-data-flow-20260827.md`](../../modules/nkbv/hai-identification-data-flow-20260827.md) — LIS đối chiếu mã BA (đã có thì không đè), copy HIS/gõ tay, triệu chứng timeline = BA, Secondary trước CLABSI. Không sửa engine.

## Bối cảnh

- Runtime BV103: pilot 4 hội chứng (BSI/CLABSI, UTI/CAUTI, VAE+PNEU, SSI) trong **một** module [`/giam-sat-nkbv`](../../../src/app/giam-sat-nkbv/page.tsx), ADR thống nhất 2026-07-15.
- Domain NHSN 2025 HAI lâm sàng người lớn: [`hai-surveillance-domain-ssot-20260827.md`](../../modules/nkbv/hai-surveillance-domain-ssot-20260827.md) (SSOT v3.3). v2.0 giữ lịch sử.
- App contracts (không thay bằng SSOT): [`domain-specification.md`](../../modules/nkbv/domain-specification.md), [`clinical-forms.md`](../../modules/nkbv/clinical-forms.md).

## Quyết định

### 1. Hai lớp tài liệu

| Lớp | File | Vai trò |
|-----|------|---------|
| **Domain SSOT** | `hai-surveillance-domain-ssot-20260827.md` (v3.3); v2.0 giữ lịch sử | Thuật toán HAI + từ điển E |
| **Luồng ca / dữ liệu** | `hai-identification-data-flow-20260827.md` | LIS/HIS-copy/gõ; thứ tự chẩn đoán |
| **App pilot** | `domain-specification.md` + `clinical-forms.md` | UI, state machine BV103, UAT |

Implement code **neo SSOT** cho thuật toán Shared + delta hội chứng; **không** xóa/ghi đè app specs — chỉ bổ sung delta khi lệch.

### 2. Kiến trúc runtime

- **Giữ** một module NKBV; **không** tách 4 app; **không** gộp VST/GSC (giữ ADR 2026-07-15).
- **Shared-first:** timeline (§3), Secondary BSI (§4), patient/device days (§1.7), Device Registry (§1.2) trước khi mở hội chứng mới.
- Hội chứng chỉ giữ **delta** so với Shared.

### 3. Phạm vi sóng (khóa)

| Sóng | Trạng thái | Nội dung |
|------|------------|----------|
| **W0** | In-scope | ADR, roadmap, gap catalog, README |
| **W1** | In-scope | Shared libs + Device Registry + wire engine + mau_so song song |
| **W2** | In-scope | Harden CLABSI / CAUTI / VAE / PNEU / SSI theo P0 gap catalog |
| **W3** | Backlog | LabID MDRO/CDI + CLIP |
| **W4–W6** | **Tạm dừng** | Location/SIR-SUR UI; PedVAE/ENDO/IAB; AU |

### 4. Vì sao dừng W4–W6

- **W4:** SIR/SUR “chuẩn” cần CDC Location Mapping + baseline model — hiện khoa nội bộ + RPC thô; UI full dễ tạo ảo tưởng độ tin.
- **W5:** PedVAE/ENDO thiếu flowsheet MAP/FiO₂ NICU và imaging/echo pipeline.
- **W6:** SSOT **cấm** AU nhập tay; chưa có eMAR/BCMA.

### 5. Non-goals (đợt W0–W2)

- AU manual; FacWide SIR dashboard đầy đủ; PedVAE; ENDO / IAB/BONE/PJI đầy Chương 17.
- Rewrite schema không qua migration; tắt mau_so nhập tay trong W1.
- Merge VST/GSC vào NKBV.

## Hậu quả

- W1 thêm bảng `nkbv_fact_device_registry` + lib shared trong `src/modules/giam-sat-nkbv/lib/`.
- W2 chỉ đóng **P0** trong [`gap-catalog-harden-w2-20260804.md`](../../modules/nkbv/gap-catalog-harden-w2-20260804.md).
- Mỗi slice code sau W0: `/intake-nv` (PO) khi đổi phạm vi; verify `npm run verify:engineering`.

## Tham chiếu

- Roadmap: [`implementation-roadmap-ssot-v2-20260804.md`](../../modules/nkbv/implementation-roadmap-ssot-v2-20260804.md)
- ADR cũ: [`adr-nkbv-unified-module-20260715.md`](adr-nkbv-unified-module-20260715.md)
