# Open backlog — duy nhất (2026-07-31)

> **SSOT backlog đang mở** sau hygiene A0.  
> Thay thế việc đọc §1 [`debt-register.md`](./debt-register.md) như danh sách P0 còn sống (nhiều mục §1 đã Done/Obsolete theo audit 07-03 → 07-26).  
> Chương trình: Full System Audit plan 2026-07-31.

## Không làm (khóa)

| Cấm | Lý do |
|-----|--------|
| Gộp bảng fact VST/GSC/NKBV/CSSD | Domain đúng — simplification A–E |
| Hard-block cấp phát CSSD | Soft-warning là SSOT vận hành |
| Rewrite Auth provider | `proxy.ts` đủ pilot |
| HIS/LIS FHIR big-bang | Wave 4 — cần hợp đồng viện |
| Rewrite module Quản trị (F-04) | Ngoài scope |

## Đang mở — ưu tiên

| ID | Mức | Mô tả | Nguồn | Wave |
|----|-----|--------|-------|------|
| UAT-NKBV | P1 (lâm sàng) | Checklist #2–#5 chưa ký khoa | `D-14` / DOM-08 · pilot-clinical-checklist | W2 |
| UAT-REFORM | P1 (vận hành) | Checklist A–F reform chưa sign-off tay | uat-after-reform-20260728 | W2 |
| BE-MASTER-01 | P0 | `master-crud-core` không còn `"use server"` | A3 → **Done W2.1** | — |
| BE-GUEST-01 | P1 | Guest stats chỉ chặn client; proxy chưa enforce allowlist | A3 → **Done** (proxy `guest-stats-access`) | — |
| BE-CSSD-01 | P2 | Admin-client trước verify; surface CSSD lớn | A3 → **Done** (verify-before-admin toàn `cssd-erp/actions`) | — |
| BE-DAO-TAO-01 | P1 | Attempt: `DAO_TAO` view (**Done**); seed `00-rbac.sql` + preset NV/Mạng lưới (**Done 2026-08-05**); `admin:rbac:sync:local` khi Docker lên | A3 → seed Done · sync runtime chờ DB | W2.5 |
| UI-DIALECT-01 | P1 | Dialect matrix + thin CC + `/thong-ke` embedded | A2 → **Done W1** | — |
| UI-DAO-TAO-01 | P2 | Bỏ padding kép DaoTao | A2 → **Done W1** | — |
| UI-BANNER-01 | P2 | `KsnkContextBanner` + scope banners analytics | A2 → **Done W1** (lock/health → `UI-BANNER-02`) | — |
| UI-WIDTH-01 | P2 | NKBV import / QLCV drawer | A2 → **Done W1** | — |
| DOC-EG-01 | P2 | engineering-guidelines §2 sync dialect | A2 → **Done W1** | — |
| UI-CSSD-02 | P1 | CSSD body/report: bỏ poster `rounded-2xl` / CTA shadow / tab lệch → Ops token | B+3 S1 · **Done 2026-08-02** | — |
| UI-QLCV-01 | P1 | QLCV panel radius + nút token (thay shadcn lệch) | B+3 S2 · **Done 2026-08-02** | — |
| UI-BCTH-01 | P2 | BCTH `comprehensive/*` thin như Command Center | B+3 S3 · **Done 2026-08-02** | — |
| UI-BANNER-02 | P2 | Lock/health/DM redirect → `KsnkContextBanner` | B+3 S4 · **Done 2026-08-02** | — |
| UI-AUTH-01 | P3 | Auth/tài khoản radius/shadow (MIS shell; brand logo giữ) | B+3 S5 · **Done 2026-08-02** | — |
| UI-NKBV-01 | P1 | NKBV thin: bỏ premium-card / shadow-xl / rounded-[36px] → Ops token | B+4 S1 · **Done 2026-08-03** | — |
| UI-ADMIN-01 | P1 | Admin/MDM modal bóng mềm + typography; BangKiem ≤ shell | B+4 S2 · **Done 2026-08-03** | — |
| UI-POLISH-01 | P2 | panel:chrome InventoryIssueModal · text-[10px] · notice sót · sync doc | B+4 S3 · **Done 2026-08-03** (+ `layout:drift-check` OK) | — |
| LT-LOC-01 | P1 | QR vị trí LOC → GSC `?loc=&ma=` điền sẵn khoa/khu | Wave Liên thông · **Done 2026-08-03** | — |
| LT-OFFLINE-01 | P1 | Offline CSSD sync giữ `extraPayload` cấp phát | Wave Liên thông · **Done 2026-08-03** | — |
| LT-GATE-01 | P1 | Cổng quyền FE GSC + Đào tạo admin (parity VST) | Wave Liên thông · **Done 2026-08-03** | — |
| AN-GAP-01 | P2 | Top 10 metric UI ↔ dictionary — **Done 2026-08-03** (chia AN-GAP-01a/b + AN-LABEL-01) | A5 · scorecard | — |
| AN-GAP-01a | P2 | Dictionary + seed note VST/GSC — **Done** | scorecard §4 | — |
| AN-GAP-01b | P2 | CLABSI Trụ D hero ẩn → chờ XN — **Done** | scorecard §4 | — |
| AN-LABEL-01 | P2 | Nhãn sản lượng cấp phát + PDCA `labelAnalyticsChiSo` — **Done** | scorecard §4 | — |
| FLT-ANALYTICS-01 | P1 | CSSD ReportFilters adapter h-9 + SearchableSelect — **Done** | scorecard §5–6 | — |
| FLT-NKBV-01 | P1 | NKBV dashboard chrome + `tu_ngay`/`khoa_ids` — **Done** | scorecard §5–6 | — |
| FLT-CONTRACT-01 | P2 | page-chrome § Filters/Search SSOT — **Done** | scorecard §5 | — |
| FLT-SEARCH-01 | P2 | ADT inline SSOT; MDM Generic / QLCV bảng / NS — **Done** | scorecard §5.2 | — |
| FLT-SELECT-01 | P2 | NKBV khoa SearchableSelect (+ CSSD trạm) — **Done** | scorecard §5.3 | — |
| FLT-DATE-01 | P3 | `analyticsDateInput` token — **Done** | scorecard §5.4 | — |
| OPS-DB-01 | P1 (môi trường) | Local Supabase/Docker down khi audit — parity chưa đo lại | A4 | W2 khi bật DB |
| OPS-DEAD-01 | P3 | `unusedExports` WARN — Boy Scout Fallow + D-21 | debt 07-26 → **Done** (2026-08-02) | — |
| PRINT-LOC-01 | P1 | Tem QR vị trí `#print-area` + `TEMLOC_` | print-audit · **Done 2026-08-05** (`LocationQrPrintButton`) | R3 |
| PRINT-BCTH-01 | P2 | BCTH `@page` lề = PrintLayout `12/10/12/12`; accent xanh giữ (báo cáo màu) | print-styles · **Done 2026-08-05** | R3 |
| UX-GS-HEADER-01 | P1 | `GiamSatHeader` essentials luôn hiện + «Chi tiết phiên» | full-audit · **Done 2026-08-05** | R4 |
| UX-ANALYTICS-01 | P2 | BCTH nav: 7 tab chính + «Thêm»; density section mỏng hơn | scorecard · **Done 2026-08-05** | R5 |
| D-15…D-20 | P3 | Flow map / Spaulding / facade / FHIR… | debt-register §4 · Wave 4 | W4 |
| G-13 | Blocked | Staging token 401 | debt 06-30 | Ops |

## Engineering P0/P1 (code) sau remediation lịch sử

**0** P0 code mở — BE-MASTER / BE-GUEST / UI B+3 / UI B+4 / PRINT / UX R4–R5 Done (2026-08-05).  
Còn P1 ngoài code: UAT ký khoa · OPS-DB-01 (Docker gate) · `admin:rbac:sync:local` khi DB lên.

## Liên kết

- **Full audit PO (2026-08-05):** [`../reports/full-system-audit-po-20260805.md`](../reports/full-system-audit-po-20260805.md)  
- **UAT coordination pack:** [`../reports/uat-coordination-pack-20260805.md`](../reports/uat-coordination-pack-20260805.md)  
- **UI B+4 (S0–S3):** [`./ui-consistency-program-20260803.md`](./ui-consistency-program-20260803.md)  
- **UI B+3 (Done):** [`./ui-consistency-program-20260802.md`](./ui-consistency-program-20260802.md)  
- Scorecard UI: [`../reports/ui-consistency-scorecard-20260731.md`](../reports/ui-consistency-scorecard-20260731.md)  
- Scorecard giám sát + filter: [`../reports/supervision-analytics-filter-scorecard-20260803.md`](../reports/supervision-analytics-filter-scorecard-20260803.md)  
- Scorecard in: [`../reports/print-audit-scorecard-20260803.md`](../reports/print-audit-scorecard-20260803.md)  
- A1–A5: [`../reports/system-audit-a1-a5-20260731.md`](../reports/system-audit-a1-a5-20260731.md)  
- Tóm tắt PO 31/07: [`../reports/po-system-audit-summary-20260731.md`](../reports/po-system-audit-summary-20260731.md)  
- Dialect matrix: [`./design-dialect-matrix-20260731.md`](./design-dialect-matrix-20260731.md)
