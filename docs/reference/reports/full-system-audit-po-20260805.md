# Tổng rà soát toàn hệ KSNK BV103 — Báo cáo PO

> **Ngày:** 2026-08-05  
> **Phạm vi:** Domain · Frontend · Backend · UI/UX · Database · Triển khai · Nợ kỹ thuật  
> **Nguyên tắc:** Không rewrite hệ thống; soft CAP_PHAT giữ SSOT; 1 wave = 1 slice đo được.  
> **Backlog sống:** [`../architecture/open-backlog-20260731.md`](../architecture/open-backlog-20260731.md)  
> **Tiền thân:** [`po-system-audit-summary-20260731.md`](./po-system-audit-summary-20260731.md) · [`system-audit-a1-a5-20260731.md`](./system-audit-a1-a5-20260731.md)

---

## Kết luận một câu

Phần mềm **đúng hướng nghiệp vụ, đã cải tổ cửa vào và thống nhất giao diện 3 vai trò**; điểm chặn go-live **không phải làm lại hệ thống** mà là: **khoa ký UAT**, **bật DB local đo parity**, **đóng nợ in ấn / seed Đào tạo / UX form giám sát**, rồi mới mở Wave sâu (NKBV P1, HIS/FHIR).

---

## 1. Bản đồ hệ thống

| Lớp | Vị trí | Nhận xét |
|-----|--------|----------|
| Routes | `src/app/` (~52 pages) | Hub Giám sát, CSSD 7 URL, QLCV, Quản trị/MDM, Thống kê/BCTH, Đào tạo, QR |
| Feature | `src/modules/` (12 packages) | CSSD ERP lớn nhất (~31 action files) |
| Shared | `src/lib/`, `src/components/shared/` | Tokens, chrome, analytics, MDM gateway |
| Auth edge | `src/proxy.ts` | Next.js 16 proxy (không `middleware.ts` cổ điển) |
| DB | `supabase/migrations/` (~115 file) | Baseline `20260530000000` → head ~`20260804*` |
| Docs SSOT | `docs/core/` + `docs/modules/*/` | Domain / mapping / ops |
| Gate | `verify` / `pilot:go-live:gate` | Engineering + layout drift + CSSD |

**Ranh giới domain (không gộp bảng):** `gstt_` (VST/GSC) · `nkbv_` · `cssd_` · `qlcv_` · `mdm_` · `sys_` · `dao_tao_`.  
Spec: [`../../core/domain-specification.md`](../../core/domain-specification.md).

**Khóa chống làm sai (đã chốt PO):** không gộp fact · không hard-block cấp phát CSSD · không rewrite Auth · không FHIR big-bang · không rewrite Quản trị (F-04).

---

## 2. Đánh giá 8 chiều (sau UI B+3/B+4 + NKBV W2)

| Chiều | Điểm (1–5) | Trạng thái ngắn |
|-------|:----------:|-----------------|
| 1 Nghiệp vụ / khoa học | **4** | Domain tách đúng; NKBV SSOT v2 W0–W2 eng Done; UAT khoa chưa ký |
| 2 An toàn dữ liệu | **4** | Proxy + guest allowlist; master-CRUD harden; CSSD verify-before-admin |
| 3 Logic vận hành | **4** | Soft CAP_PHAT chủ đích; hub Giám sát + reform UX Done |
| 4 Cấu trúc FE | **4** | 3 dialect Ops / Analytics / Admin; chrome L1 thống nhất |
| 5 Cấu trúc BE | **3.5** | Action surface lớn; pattern đã harden nhưng vẫn nặng |
| 6 CSDL | **3*** | RPC legacy sạch static; *parity live phụ thuộc Docker (OPS-DB-01) |
| 7 Hiệu quả vận hành / triển khai | **3** | Gate sẵn; seed DAO_TAO + staging token (G-13) còn |
| 8 UX tối giản / thân thiện | **4** | B+3/B+4 Done; còn header Ops · Analytics density · in ấn |

\*Đo lại khi bật Supabase local → cập nhật điểm chiều 6–7.

---

## 3. Domain — chín muồi theo module

| Module | Mức | Việc còn mở (nghiệp vụ) |
|--------|-----|-------------------------|
| VST / GSC | Pilot eng sẵn | UAT reform A–C; scoring đã unify |
| CSSD | Domain chốt 28/07 | UAT reform E2E; soft-warning BOM giữ SSOT |
| QLCV | Ổn định | Không P0 |
| MDM / Quản trị | Hub 4 nhóm Done | Không rewrite F-04 |
| Dashboard / BCTH | RPC-only | Filter/metric Done; Analytics score ~3.7 |
| Đào tạo | Partial | Seed RBAC `DAO_TAO` parity (W2.5) |
| NKBV | Eng harden W2 Done | UAT lâm sàng #2–#5; P1 clinical depth; W3 LabID/CLIP backlog; W4–W6 tạm dừng |

NKBV roadmap: [`../../modules/nkbv/implementation-roadmap-ssot-v2-20260804.md`](../../modules/nkbv/implementation-roadmap-ssot-v2-20260804.md).

---

## 4. Giao diện & UX người dùng cuối

### Hợp đồng UI (đã khóa)

- **3 vai trò:** Ops · Analytics · Admin — [`../architecture/design-dialect-matrix-20260731.md`](../architecture/design-dialect-matrix-20260731.md)
- **1 dải L1:** `KsnkPageChrome` → `KsnkContextBanner` → nội dung
- **Gate:** `layout:drift-check`, typography / panel / columns checks

### Đã đóng (không mở lại)

UI-DIALECT · B+3 · B+4 · FLT-* · AN-* — Done 02–03/08/2026.

### Còn đau với người dùng cuối

| ID | Mức | Vấn đề | Hướng xử lý |
|----|-----|--------|-------------|
| UX-GS-HEADER-01 | P1 | ~~Header dày~~ | **Done 08-05** — essentials luôn hiện |
| UX-ANALYTICS-01 | P2 | ~~BCTH mật độ ~3.7~~ | **Done 08-05** — 7 tab + «Thêm» |
| PRINT-LOC-01 | P1 | ~~Tem LOC trống~~ | **Done** — `#print-area` + `TEMLOC_` |
| PRINT-BCTH-01 | P2 | ~~Lề lệch~~ | **Done** — lề 12/10/12/12; accent xanh giữ |
| UAT-NKBV / UAT-REFORM | P1 | Eng sẵn ≠ khoa ký trên ca thật | Gói điều phối R1 — chờ khoa ký |

**Giữ có chủ đích:** nút Đạt–Không to (touch) · Đào tạo `max-w-2xl` đọc đề — không coi là bug.

Chi tiết in: [`print-audit-scorecard-20260803.md`](./print-audit-scorecard-20260803.md).

---

## 5. Backend & an toàn

| ID | Trạng thái | Ghi chú |
|----|------------|---------|
| BE-MASTER-01 | Done | Không export action trần master-CRUD |
| BE-GUEST-01 | Done | Guest chỉ thống kê allowlist |
| BE-CSSD-01 | Done | verify trước admin-client |
| BE-DAO-TAO-01 | Partial | View gate Done; seed sync còn (W2.5) |
| Surface action | Nợ duy trì | Boy Scout khi đụng file — không big-bang tách |

---

## 6. Database & triển khai

| Mục | Trạng thái |
|-----|------------|
| Prefix / mapping | Ổn |
| `audit:legacy-rpc` | PASS (static) |
| Seeds RBAC / nhân sự | Có |
| OPS-DB-01 | Mở — cần Docker + `pilot:go-live:gate:local` |
| G-13 staging token | Blocked ops trước gate linked |
| Wave 4 HIS/LIS | Khóa đến khi viện có hợp đồng |

Pipeline: migration → `mdm:migrate` → `verify:mdm` / `verify:engineering` → `pilot:ship` — [`../../../AGENTS.md`](../../../AGENTS.md).

---

## 7. Nợ kỹ thuật còn sống (ưu tiên thật)

**P0 code engineering mở:** 0.

| ID | Mức | Việc |
|----|-----|------|
| UAT-NKBV / UAT-REFORM | P1 lâm sàng/vận hành | Khoa ký checklist |
| OPS-DB-01 | P1 môi trường | Bật DB → parity + go-live gate |
| BE-DAO-TAO-01 seed | P1 | Sync RBAC Đào tạo |
| PRINT-LOC-01 / PRINT-BCTH-01 | P1–P2 UX vận hành | Theo scorecard in |
| UX-GS-HEADER-01 / UX-ANALYTICS-01 | P1–P2 UX | Form giám sát + mật độ BI |
| G-13 | Blocked ops | Token staging |
| NKBV P1 gaps | P2 | Sau UAT W2 |
| D-15…D-20 | P3 / W4 | Spaulding sâu, FHIR, … |

---

## 8. Lộ trình R0–R6

| Round | Nội dung | DoD |
|-------|----------|-----|
| **R0** | Báo cáo này + sync open-backlog PRINT/UX | Doc SSOT |
| **R1** | Điều phối UAT reform A–F + NKBV #2–#5 | Gói checklist sẵn; khoa ký tay |
| **R2** | Docker → `pilot:go-live:gate:local` + seed `DAO_TAO` | Seed SQL Done 08-05; gate runtime **chặn** khi Docker down (OPS-DB-01) |
| **R3** | Fix in tem LOC + align BCTH print | In thử tay 3 mẫu |
| **R4** | Rút gọn `GiamSatHeader` | 3 case mở phiên VST/GSC |
| **R5** | Thin Analytics/BCTH density | Scorecard ≥4.0 hoặc chấp nhận có chủ đích |
| **R6+** | NKBV P1 / LabID / HIS | **Khóa** — chưa mở `/intake-nv`; không làm trong đợt 08-05 |

### Trạng thái thực thi đợt 2026-08-05

| Round | Kết quả |
|-------|---------|
| R0 | Báo cáo này + open-backlog PRINT/UX |
| R1 | [`uat-coordination-pack-20260805.md`](./uat-coordination-pack-20260805.md) — chờ khoa ký |
| R2 | Seed `DAO_TAO` trong `00-rbac.sql` + preset khách bỏ DAO_TAO; **gate local chặn** (Docker down) |
| R3–R5 | Code + scorecard cập nhật |
| R6 | Không mở (đúng khóa Wave 4 / NKBV sâu) |

---

## 9. Không làm

- Gộp bảng fact VST/GSC/NKBV/CSSD  
- Hard-block cấp phát CSSD  
- Rewrite Auth / rewrite Quản trị  
- HIS/LIS FHIR big-bang không hợp đồng viện  
- Một chat “sửa hết” mọi nợ  

---

## 10. Liên kết nhanh

| Tài liệu | Vai trò |
|----------|---------|
| [`../architecture/open-backlog-20260731.md`](../architecture/open-backlog-20260731.md) | Backlog sống |
| [`../architecture/uat-after-reform-20260728.md`](../architecture/uat-after-reform-20260728.md) | UAT reform A–F |
| [`../../modules/nkbv/pilot-clinical-checklist-20260603.md`](../../modules/nkbv/pilot-clinical-checklist-20260603.md) | UAT NKBV lâm sàng |
| [`uat-coordination-pack-20260805.md`](./uat-coordination-pack-20260805.md) | Gói điều phối UAT (R1) |
| [`print-audit-scorecard-20260803.md`](./print-audit-scorecard-20260803.md) | Scorecard in |
| [`ui-consistency-scorecard-20260731.md`](./ui-consistency-scorecard-20260731.md) | Scorecard UI |
