# Chương trình thống nhất giao diện — B+3 (2026-08-02)

> **Chế độ:** khóa chương trình + intake từng sóng — **chưa** `/implement` UI trong chat khóa.  
> Mỗi sóng mở **chat riêng** → `/intake-nv` (dán khối intake dưới) → 「OK triển khai」→ sửa UI.  
> Thứ tự đã chọn **B**: module lệch nặng trước.  
> Scorecard baseline: [`../reports/ui-consistency-scorecard-20260731.md`](../reports/ui-consistency-scorecard-20260731.md) · backlog: [`open-backlog-20260731.md`](./open-backlog-20260731.md).

## Luật cứng (không invent dialect thứ 4)

| Thành phần | Chuẩn |
|------------|--------|
| Vai trò trang | Ops / Analytics / Admin — [`design-dialect-matrix-20260731.md`](./design-dialect-matrix-20260731.md) |
| L1 chrome | Một `KsnkPageChrome` — [`page-chrome-contract-20260731.md`](./page-chrome-contract-20260731.md) |
| Bo góc khối | `--radius-shell` (cấm `rounded-2xl` trên panel trang) |
| Bo góc nút/ô | `--radius-control` + `bv103-control-h` |
| Nút | `btnPrimary` / `btnSecondary` |
| Tab | `navTabStrip` + `navTabBtn` (hoặc ModeNav Ops) |
| Banner | `KsnkContextBanner` |
| Bảng | `AdvancedDataTable` + `*-table-chrome` |
| Icon | `lucide-react` — inline `h-4 w-4`, list header `h-5 w-5`, hub `h-6 w-6` |
| Chữ | title-case nội dung; IN HOA chỉ nav / nút touch lựa chọn |
| Copy màn chính | tên ngắn + nút — không glossary |

**Giữ cố ý (không “làm mỏng” sai):** CSSD/NKBV segment Đạt–Không, `choiceBtn` / `btnTouch` IN HOA workstation.

## Bản đồ sóng

| Sóng | ID backlog | Phạm vi | Mục tiêu score (avg) | Trạng thái khóa |
|------|------------|---------|----------------------|-----------------|
| **S0** | — | Scorecard + backlog baseline | — | **Done 2026-08-02** (doc) |
| **S1** | `UI-CSSD-02` | CSSD body + report in-module | CSSD ≥ **4.0** | **Done 2026-08-02** |
| **S2** | `UI-QLCV-01` | QLCV panel + nút | QLCV cảm nhận ≥ **4.0** | **Done 2026-08-02** |
| **S3** | `UI-BCTH-01` | BCTH `comprehensive/*` | Analytics/BCTH ≥ **4.0** | **Done 2026-08-02** |
| **S4** | `UI-BANNER-02` | Banner còn sót → `KsnkContextBanner` | Banners ≥ **4.0** | **Done 2026-08-02** |
| **S5** | `UI-AUTH-01` | Login / forgot / reset / tài khoản | Auth khớp radius/shadow | **Done 2026-08-02** (MIS shell; logo giữ) |

**Ngoài chương trình:** nghiệp vụ, schema, Wave 4 HIS/FHIR, rewrite Quản trị.

## Gate sau mỗi sóng implement

```bash
npm run layout:drift-check
npm run layout:typography-check
npm run panel:chrome-check
# UI thuần: npm run verify:quick
# Đụng CSSD action: + npm run verify:cssd
```

Cập nhật điểm dialect trên scorecard + đánh dấu Done ID trên open-backlog.

## Acceptance chương trình (PO)

1. Mở CSSD mẻ, QLCV board, BCTH, VST khóa module, login — cùng bo góc / kiểu nút / kích thước icon.  
2. Không hai lớp tiêu đề; không banner tự chế lệch tone trên màn đã migrate.  
3. Scorecard trung bình Ops CSSD + QLCV cảm nhận + Analytics BCTH ≥ **4.0**.

---

## S0 — Baseline (Done)

- Scorecard: đánh dấu Wave 1 Done/Partial; thêm mục tiêu chương trình B+3.  
- Open-backlog: thêm `UI-CSSD-02` … `UI-AUTH-01`.  
- File này = SSOT thứ tự + intake copy-paste.

---

## S1 — CSSD UI (`UI-CSSD-02`) — intake sẵn

### Tóm tắt nghiệp vụ

Màn CSSD (mẻ, QR, báo cáo trong module) vẫn trông “poster” (bo góc dày, chữ siêu đậm, nút bóng lớn, tab riêng) so với giám sát/quản trị. Cần làm mỏng theo Ops dialect nhưng **giữ** nút touch Đạt/Không.

### Intake kỹ thuật

- **Goal:** Body CSSD dùng `--radius-shell` + nút/tab token chung; report in-module thin / Analytics-in-module.
- **In scope:** `src/modules/cssd-erp/` views/components lệch (`me-tiet-khuan-process-*`, `QRScanSuccessCard`, `QRHistoryViewer`, `ReportDashboard`, `CSSDERPPage`, `CSSDReportPage`, `ReportAnalyticsPanels`, `cssd-ui-chrome` / `CssdHorizTabButton`); Boy Scout class — không đổi RPC/nghiệp vụ.
- **Out of scope:** MDM danh mục, QLCV, BCTH, auth, schema, soft-warning cấp phát.
- **Acceptance:**
  1. Mở mẻ tiệt khuẩn / bước QC — panel không còn `rounded-2xl` poster; CTA cao khớp `bv103-control-h`.
  2. Tab ngang CSSD cùng nhịp `navTab*` (hoặc alias chrome khớp strip chung).
  3. Báo cáo CSSD in-module: section thin `--radius-shell`, không stack card dày bóng.
- **Verify:** `layout:drift-check` · `panel:chrome-check` · `verify:cssd` nếu đụng action · tay 3 case trên.
- **Risk:** (1) nhầm xóa IN HOA segment touch; (2) class gần trạng thái mẻ/QR; (3) report charts layout vỡ khi đổi radius.

**Chat:** `/intake-nv` dán khối trên → 「OK triển khai」.

---

## S2 — QLCV UI (`UI-QLCV-01`) — intake sẵn

### Tóm tắt nghiệp vụ

Kanban / chi tiết / checklist QLCV dùng bo góc và nút (shadcn `Button`) lệch token chung — cần đồng bộ cảm nhận Ops với giám sát.

### Intake kỹ thuật

- **Goal:** Panel QLCV `--radius-shell`; CTA map `btnPrimary`/`btnSecondary` (hoặc class tương đương).
- **In scope:** `CongViecKanban`, `CongViecDetail`, `QlcvChecklistPanel`, `QuanLyCongViecPage`, `qlcv-ux-chrome` / `qlcv-table-chrome` nếu cần alias.
- **Out of scope:** RPC checklist, spawn định kỳ, CSSD, đổi cột Kanban nghiệp vụ.
- **Acceptance:**
  1. Board Kanban — thẻ/cột không `rounded-2xl` lệch shell.
  2. Chi tiết công việc — nút chính/phụ cùng kiểu với module Ops khác.
  3. Checklist panel — cùng bo góc + nút token; drawer vẫn hẹp hơn page shell.
- **Verify:** `layout:drift-check` · `@qlcv-pilot` nếu đụng luồng · tay board / chi tiết / checklist.
- **Risk:** (1) shadcn variant phá a11y; (2) mật độ Kanban mobile; (3) nhầm sửa logic tiến độ.

**Chat:** `/intake-nv` → 「OK triển khai」.

---

## S3 — BCTH comprehensive (`UI-BCTH-01`) — intake sẵn

### Tóm tắt nghiệp vụ

Command Center đã thin Wave 1; khối **báo cáo tổng hợp comprehensive** còn poster `rounded-2xl` — cần khớp Analytics dialect.

### Intake kỹ thuật

- **Goal:** `comprehensive/*` dùng `--radius-shell` + gap token; KPI qua `dashboard-chrome` / `statValue`.
- **In scope:** `ComprehensiveKpiCards`, `ComprehensiveTrend`, `ComprehensiveTopicHybrid`, `ComprehensiveCssdAppendix` (+ wrapper BCTH nếu còn poster).
- **Out of scope:** Công thức KPI/CCS, RPC analytics, metric-dictionary gaps (AN-GAP-01).
- **Acceptance:**
  1. Mở BCTH / comprehensive — section không poster dày bóng.
  2. Thẻ KPI typography khớp `statValue` / dashboard chrome.
  3. So với `/` Command Center — cùng họ radius/gap.
- **Verify:** `layout:typography-check` · `@dashboard-pilot` · tay 3 case.
- **Risk:** (1) print BCTH lệch layout; (2) chart container overflow; (3) đụng nhãn metric ngoài scope.

**Chat:** `/intake-nv` → 「OK triển khai」.

---

## S4 — Banner còn sót (`UI-BANNER-02`) — intake sẵn

### Tóm tắt nghiệp vụ

Một số banner khóa/phạm vi/health vẫn tự chế (`MobileCollapsibleNotice` trực tiếp / box amber) thay vì `KsnkContextBanner`.

### Intake kỹ thuật

- **Goal:** Mọi banner ngữ cảnh scope/lock/health dùng `KsnkContextBanner` (tone sky/amber/violet/emerald).
- **In scope:** `VstModuleLockBanner`, `GscModuleLockBanner`, `GscAnalyticsScopeBanner`, `GenericDmHubRedirectBanner`, `BoDungCuMaBoHealthBanner` (+ CSSD heat nếu còn raw).
- **Out of scope:** Đổi điều kiện khóa module, copy pháp lý dài trong dialog phá hủy, notice form field.
- **Acceptance:**
  1. VST/GSC khi khóa module — banner cùng primitive + tone.
  2. GSC analytics scope / DM redirect — không box tự chế lệch padding.
  3. Health mã bộ CSSD — `KsnkContextBanner` (hoặc wrapper mỏng trên primitive).
- **Verify:** visual 3 module · `layout:drift-check` nếu đụng class.
- **Risk:** (1) mất collapse mobile; (2) tone sai (cảnh báo vs info); (3) CSSD heat copy quá dài (giữ ≤ 1 vế).

**Chat:** `/intake-nv` → 「OK triển khai」.

---

## S5 — Auth / tài khoản (`UI-AUTH-01`) — intake sẵn

### Tóm tắt nghiệp vụ

Login / quên mật khẩu / tài khoản còn `rounded-2xl shadow-xl` / gradient lệch MIS. Có thể giữ khác biệt brand nhẹ — **PO chốt trước implement**.

### Intake kỹ thuật

- **Goal:** Bo góc + bóng theo `--radius-shell` / `--shadow-app-soft`; dùng token `auth*` trong `bv103-design-tokens` nếu đã có.
- **In scope:** `(auth)/login`, `forgot-password`, `reset-password`, `tai-khoan/page`.
- **Out of scope:** Rewrite Auth provider, `proxy.ts` guest (BE-GUEST-01), đổi luồng OTP.
- **Acceptance (sau PO chọn brand):**
  1. Login — card radius/shadow khớp shell (hoặc brand nhẹ đã duyệt).
  2. Forgot/reset — cùng họ với login.
  3. Tài khoản — bỏ gradient/poster lệch nếu PO chọn MIS 100%.
- **Verify:** `verify:quick` · tay 3 case.
- **Risk:** nhận diện thương hiệu yếu nếu ép MIS 100%; regression focus ring form.

**Câu hỏi PO (trả lời khi mở chat S5):** Login giữ khác biệt brand nhẹ hay ép cùng MIS 100%?

**Chat:** `/intake-nv` + trả lời brand → 「OK triển khai」.

---

## Liên kết

- Visual SSOT: [`../guides/bv103-visual-language.md`](../guides/bv103-visual-language.md)  
- Wave 2–3 follow-up (BE/UAT): [`wave2-wave3-followup-20260731.md`](./wave2-wave3-followup-20260731.md)  
- PO cheat: [`../../core/po-cursor-guide.md`](../../core/po-cursor-guide.md)
