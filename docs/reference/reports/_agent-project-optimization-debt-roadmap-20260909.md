# Lộ trình tối ưu & nợ kỹ thuật (delta) — KSNK BV103

> **Ngày:** 2026-09-09 (Asia/Saigon) · **Máy:** Mac `Desktop/ksnk_bv103` · machineId `6bad1c57-…0f88`  
> **Phạm vi:** READ-FIRST · chỉ local · **không** commit/push · docs only.  
> **Nền:** roadmap audit [`_agent-full-project-expert-audit-roadmap-20260909.md`](./_agent-full-project-expert-audit-roadmap-20260909.md) — báo cáo này là **delta sau** Hybrid C 2-tier · Qty SSOT · gộp BOM · các đợt sự cố / quy trình / VST / TB-HC / perf 09/2026.  
> **Phương pháp (trung thực):** ~55 `page.tsx` · `src/modules/*` LOC · debt-register / open-backlog · note agent 09/2026 · doc CSSD Hybrid/Qty/BOM · hot path NKBV / QT / CSSD / sự cố / đào tạo / QLCV / dashboard. **Không** claim đọc từng dòng ~mọi file.

---

## 1. Tóm tắt điều hành — đã đóng gần đây vs còn đau

### Đã đóng gần đây (delta so roadmap sáng cùng ngày)

| Hạng mục | Kết quả | Bằng chứng ngắn |
|----------|---------|-----------------|
| **Hybrid C catalog 2-tier** | NV đề xuất + L1 peer → Admin L2 publish; ADMIN khẩn giữ | `_agent-catalog-hybrid-c-full-2tier-20260909.md` · FSM `BOM_PENDING` → `BOM_PENDING_L2` |
| **Đợt 0 an toàn sổ** | Cấm rename master loại từ phiếu một bộ; tab Rà soát align quyền duyệt | `_agent-catalog-hybrid-c-dot0-20260909.md` · `wouldGlobalRenameLoaiMaster…` |
| **Qty SSOT tab Loại** | «Trong bộ» chỉ cộng **bộ active** + clamp ≥0; QT hiện Tổng/Trong bộ/Trong kho | `_agent-catalog-qty-integrity-audit-20260909.md` |
| **BOM trùng + unique** | Gộp **135** cặp · soft-off **169** dòng · **0** dup active · unique index **live prod** | `_agent-bom-merge-unique-20260909.md` |
| **Sự cố 09-08** | 3 cửa · PHYSICAL riêng · four-eyes xác nhận · HC `chemicalId` + quarantine xuất | `su-co-*-fix` notes |
| **Quy trình 09-08** | Tem chu trình đủ trường · timeline 6 khâu · soft-warn giao khoa | `quy-trinh-sw-process-fix` |
| **VST / TB-HC / perf Batch 1–12** | % KPI mẫu số · PM TZ · FEFO HC · phân trang catalog/kho · nhiều RPC rollup | debt-register § Perf · perf-fix-progress |

### Còn đau thật (sau delta)

1. **NKBV vẫn mega-surface** (~49k LOC · file 1k–2k dòng) — rối nhập + chậm cảm nhận; UAT lâm sàng chưa ký.  
2. ~~**Implant / cách ly `CHO_BI`**~~ — **FIXED local Đợt A 09-09** (persist + gate CAP_PHAT + gỡ BI + vitest).  
3. **Form sự cố dày (~1100 dòng)** — còn; **copy FSM 3 trục** đã bổ sung Đợt B (xác nhận phiếu ≠ L1 ≠ L2).  
4. **Dual / multi cửa dụng cụ** — **copy/CTA Đợt B** đã khóa 1 câu trên RO/QT/sự cố/Rà soát (IA giữ).  
5. **Perf residual hệ thống:** shell quyền hydrate mọi route · Dashboard/BCTH `ssr:false` · NHCH/export edge · mega QLCV page (nhiều Batch đã cắt payload nhưng độ dày module còn).  
6. **Dữ liệu vệ sinh:** bộ soft-delete còn chi tiết active trên DB (UI đã lọc; chưa cascade).  
7. **Nợ sản phẩm:** UAT NKBV + UAT reform CSSD · phiếu «đổi master loại» riêng · workspace kiểm kê đợt · sổ audit TK mỏng · 1-admin pilot.

**Không còn P0 catalog governance / rename thầm / BOM dup active** như sáng nay — trọng tâm tối ưu chuyển sang **độ rối mega-page · an toàn implant · dual surface copy · payload shell**.

---

## 2. Top 10 điểm đau / tối ưu còn lại

Xếp theo **tác động vận hành × effort** (cao = làm sớm nếu muốn tối ưu hệ thống).

| # | Điểm đau | Impact × Effort | Vì sao còn đau | Hướng tối ưu |
|---|----------|-----------------|----------------|--------------|
| 1 | **NKBV mega-page / mega-file** | Impact cao · Effort **L** | Wave2: 1 slice defer cases list; còn mega file | Tiếp lazy filter DM / island hội chứng |
| 2 | ~~**Implant / quarantine chặn cấp phát**~~ | — | **FIXED** Đợt A 09-09 | Giữ vitest; UAT tay 3 kịch bản |
| 3 | **Form sự cố mega** (+ FSM copy đã vá) | Impact TB · Effort **M** | Wave2: lazy catalog theo nhóm + cắt remount; form orchestration còn dày | Tách file orchestration (sau) |
| 4 | ~~**Dual surface CTA/copy**~~ | — | **PARTIAL→improved** Đợt B 09-09 | Giữ deep-link; quan sát UAT |
| 5 | **Shell RBAC / offline hydrate** | Impact TB · Effort **M** | Batch 8 + Wave2 dynamic offline GS; cold RBAC full matrix còn | Snapshot theo menu (sau) |
| 6 | **Dashboard / BCTH nặng client** | Impact TB · Effort **M** | `ssr:false` + Recharts; first paint chậm | Island theo widget; giữ auth gate |
| 7 | ~~**In lại tem chu trình từ Kho/Trace**~~ | — | **FIXED** Wave2 09-09 | Giữ nút Kho/Trace |
| 8 | **Vệ sinh BOM trên bộ inactive** | Impact thấp–TB sổ · Effort **S** | UI đúng SSOT; DB còn dòng active trên bộ tắt | Cascade soft-delete hoặc job dọn (tuỳ PO) |
| 9 | **Phiếu đổi master loại (impact nhiều bộ)** | Impact TB khi đổi SKU · Effort **M** | Rename từ phiếu bộ đã cấm; chưa có luồng admin có impact | Phiếu/master riêng + hiện số bộ ảnh hưởng |
| 10 | **UAT lâm sàng / reform chưa ký** | Impact sản phẩm · Effort **S** + lịch khoa | Eng sẵn; thiếu chữ ký | Gói UAT ngắn; không đợi rewrite |

**Không xếp top:** HIS/FHIR · module kiểm kê ERP mới · hard-block BOM cấp phát · dual-admin bắt buộc (pilot 1 admin chấp nhận).

---

## 3. Inventory nợ kỹ thuật theo miền

Ký hiệu: **OPEN** · **PARTIAL** · **FIXED** (local gần đây) · **DONE-HIST** (07–08).

### 3.1 CSSD — Quy trình / mẻ / kho / truy vết

| ID | Symptom | Sev | Status | Ghi chú delta |
|----|---------|-----|--------|---------------|
| QT-BD | BD đầu ngày steam hard | P0 | **FIXED** | Giữ |
| QT-PACK | Chặn gói xấu / HSD cấp phát | P0 | **FIXED** | Soft BOM giữ |
| QT-TEM | Tem chu trình đủ trường | P1 | **FIXED** | In lại Kho/Trace Wave2 09-09 — `_agent-opt-wave2-debt-fixes-20260909.md` |
| QT-TRACE | Timeline 6 khâu | P1 | **FIXED** | Soft-warn giao khoa kèm |
| QT-IMPLANT | Quarantine implant / chặn CP | P1 | **FIXED** local | Đợt A 09-09: write+gate+release+vitest — `_agent-opt-dotA-implant-dotB-cta-20260909.md` |
| QT-BI3 | 3×BI(−) mở máy auto | P2 | **OPEN** | Sau UAT |
| QT-POU | POU / lot enzyme | P2 | **PARTIAL** | Soft trước hard |
| QT-KHO | Kho full dump | P1 | **FIXED** | Phân trang + RPC counts |

### 3.2 CSSD — Danh mục Loại / Bộ / BOM

| ID | Symptom | Sev | Status | Ghi chú delta |
|----|---------|-----|--------|---------------|
| DC-HYBRID | NV không soạn Loại/Bộ có kiểm soát | P0 SP | **FIXED** local | Hybrid C 2-tier |
| DC-RENAME | Rename master từ phiếu một bộ | P0 data | **FIXED** | Gate hard |
| DC-QUEUE | Tab Rà soát chỉ admin UI | P1 | **FIXED** | Align `BO_DC`/`DC_LE` + L1/L2 |
| DC-QTY | Trong bộ cộng bộ inactive | P0 UI | **FIXED** | SSOT active bộ |
| DC-DUP | 135 BOM dup active | P1 data | **FIXED** live | Unique index prod |
| DC-MASTER | Phiếu đổi master loại + impact | P1 | **OPEN** | Chưa có luồng riêng |
| DC-CAMPAIGN | Workspace kiểm kê đợt | P2 | **PARTIAL** | Campaign actions mầm |
| DC-INACTIVE | Chi tiết active trên bộ soft-delete | P2 | **OPEN** data | UI đã lọc |
| DC-DUAL | Multi surface sửa dụng cụ | P1 UX | **PARTIAL** | Copy/CTA Đợt B 09-09 (RO/QT/sự cố/Rà soát) |

### 3.3 CSSD — Sự cố

| ID | Symptom | Sev | Status |
|----|---------|-----|--------|
| SC-DOOR | 3 cửa lẫn form | P0 | **FIXED** |
| SC-PHYS | PHYSICAL collapse sổ | P1 | **FIXED** |
| SC-4EYES | Tự xác nhận phiếu mình | P1 | **FIXED** |
| SC-CHEM | HC dùng machineId | P1 | **FIXED** phần · gỡ quarantine UI **OPEN** |
| SC-FORM | Form ~1100 dòng | P1 | **PARTIAL** | Wave2: trì hoãn catalog máy/HC + cắt remount cửa dụng cụ |
| SC-FSM | Hai trục «duyệt» (phiếu vs L1/L2 DM) | P1 UX | **PARTIAL** | Copy 3 trục Đợt B; form mega còn OPEN |
| SC-SEV | Severity grading | P2 | **OPEN** |

### 3.4 CSSD — Thiết bị / hóa chất

| ID | Sev | Status |
|----|-----|--------|
| TBHC ngưỡng tồn / FEFO / PM TZ | P0–P1 | **FIXED** |
| Fleet đếm mẻ dump | P2 | **FIXED** (RPC Batch 10) |
| UI gỡ quarantine HC | P2 | **OPEN** |

### 3.5 Giám sát VST / GSC / NKBV

| ID | Sev | Status |
|----|-----|--------|
| VST % mẫu số đúng | P0 | **FIXED** |
| GSC % đạt/quan sát | — | **OK** |
| GS chrome / ModeNav dày | P2 | **OPEN** declutter |
| NKBV mega-surface | P0 rối | **PARTIAL** | Wave2: defer `listGiamSatNkbvCas` đến tab cases |
| NKBV limit/filter bulk | P1 | **FIXED** phần lớn (Batch 2/6) |
| NKBV UAT lâm sàng | P1 SP | **OPEN** |
| Trace CSSD↔SSI | P2 | **NEAR-DONE** · UAT |

### 3.6 Quản trị / RBAC / TK

| ID | Sev | Status |
|----|-----|--------|
| Hub 4 việc + một cửa TK | — | **OK / FIXED** cleanup |
| Self-reset / 1 admin | P1–P2 | **PARTIAL** |
| Audit UI mỏng | P1 | **OPEN** |
| Guest / seed RBAC | P2 | **PARTIAL** (seed Done) |

### 3.7 Đào tạo / QLCV / Dashboard / Offline / Cross

| ID | Sev | Status |
|----|-----|--------|
| NHCH limit lớn / export 20k | P1→P3 | **PARTIAL** (toast truncate; bank lớn = P3) |
| QLCV payload / remount | P1 | **FIXED** phần lớn Batch 11–12 |
| Dashboard island / ssr:false | P1→P3 | **OPEN** (spike SKIP Batch 8) |
| Offline CSSD extraPayload | — | **DONE-HIST** |
| Offline GS hydrate shell | P2 | **PARTIAL** | Wave2: dynamic `SupervisionOfflineSyncListener` |
| Lookup SSOT unification | P1 plan | **PLAN** — chưa ship hết |
| Perf Batch 1–12 core | P1 | **FIXED** phần lớn; residual P3 |
| open-backlog đăng ký nợ 09 | P1 process | **PARTIAL** — xem § debt dưới |

---

## 4. Không phù hợp (IA trùng · dual surface · FSM copy · doc drift)

| Loại | Hiện tượng | Mức | Hướng |
|------|------------|-----|-------|
| **IA / dual surface** | Cùng việc «xem/sửa dụng cụ» qua RO `/cssd-dung-cu` · Kho tab quy trình · QT danh mục · cửa Đề xuất sự cố | P1 | Giữ 4 cửa đúng domain; **khóa CTA** («Tra cứu» / «Sửa master» / «Đề xuất chờ duyệt») |
| **FSM copy** | «Xác nhận sự cố» vs «Duyệt lần 1/2 danh mục» vs ADMIN «Thêm khẩn» | P1 UX | Một câu trên hàng chờ + form; không gộp schema vội |
| **Shell tab vs sidebar** | Quy trình 4 tab (Chu trình/Mẻ/Kho/Trace) hợp ca trực nhưng cảm giác «hai kho» với catalog RO | P2 | Giữ pilot; Kho mặc định filter CAP_PHAT + soft-warn |
| **Deep-link legacy** | `/cssd-erp/batch|report`, `/thong-ke/*`, QT redirect hub | P2 | Giữ redirect; không nhân page mới |
| **Doc drift** | Sheet Loại đã sync 09-09; pilot checklist còn wording cũ (BOM modal) | P2 | Boy Scout khi chạm module |
| **Lookup vs enum** | Plan 09-07 chưa ship hết | P1 duy trì | Theo `lookup-ssot` plan — không phá fact |
| **Debt process** | open-backlog 07-31 chưa liệt kê ID nợ 09 (Hybrid/NKBV/implant) | P1 process | Đăng ký pointer sang báo cáo này |

---

## 5. Lộ trình tối ưu theo đợt

### Đợt A — An toàn + CTA nhanh (3–5 ngày) · Effort **S–M**

| Mục tiêu | Vá lỗ an toàn còn lại + giảm nhầm cửa |
| Items | (1) Implant quarantine write + gate CP · (2) Nút in lại tem Kho/Trace · (3) Copy/CTA dual surface 1 câu · (4) Copy FSM «xác nhận ≠ duyệt danh mục» |
| Effort | S–M |
| Acceptance | 3 kịch bản tay implant/tem/CTA; vitest gate; không rename/BOM regress |
| Status 09-09 chiều | **(1)(2)(3)(4) DONE** local — Đợt A/B + Wave2 tem in lại (`_agent-opt-wave2-debt-fixes-20260909.md`). |

### Đợt B — Cắt rối NKBV (lát 1–2 tuần) · Effort **L** (chia PR)

| Mục tiêu | Giảm first-paint và độ dày cảm nhận ca giám sát |
| Items | Lazy workspace theo việc (BA list / hội chứng / timeline); tách file >1.5k; không đổi rules engine một phát |
| Effort | L |
| Acceptance | Đo #chunk / thời gian mở; UAT checklist không regress eng |
| Status 09-09 tối | **Slice 1** Wave2 — `enabled: mainTab==="cases"` (không fetch phiếu khi ở records) |

### Đợt C — Form sự cố + shell phí · Effort **M**

| Mục tiêu | Bảo trì form; giảm hydrate mọi trang |
| Items | Island SuCo theo nhóm; snapshot RBAC theo menu; trì hoãn offline GS |
| Effort | M |
| Acceptance | Form nhóm không mount full 1k dòng; shell nhẹ hơn trên route không GS |
| Status 09-09 tối | **PARTIAL** Wave2 — defer catalog SuCo + dynamic offline GS; RBAC menu-snapshot còn |

### Đợt D — Dashboard / QLCV / Đào tạo polish · Effort **S–M**

| Mục tiêu | Island BCTH; giữ Batch 12; NHCH toast đủ |
| Items | Widget island `/` + báo cáo; không SSR spike nếu auth+charts cấm |
| Effort | S–M |
| Acceptance | First paint cảm nhận tốt hơn; không phá filter scorecard |

### Đợt E — Dữ liệu + governance residual · Effort **S–M**

| Mục tiêu | Sổ sạch; luồng đổi master loại khi cần |
| Items | Dọn/cascade chi tiết trên bộ inactive; phiếu đổi master + impact; (tuỳ volume) workspace kiểm kê |
| Effort | S–M |
| Acceptance | Reconcile script 0 orphan «active trên bộ tắt» (nếu chọn cascade); impact UI trước publish |

### Đợt F — UAT ký + Wave 4 defer · Effort **S** + lịch

| Mục tiêu | Đóng nợ sản phẩm |
| Items | UAT-NKBV · UAT-REFORM · audit UI tối thiểu · Spaulding map tram thật · FHIR vẫn defer |
| Acceptance | Chữ ký checklist |

**Không hứa:** rewrite NKBV một PR · module kiểm kê ERP mới · hard-block BOM · HIS/LIS · dual-admin bắt buộc.

---

## 6. Việc cần user chốt

1. **Ưu tiên song song tiếp theo:** Đợt A (implant+CTA) vs Đợt B (NKBV lazy) vs UAT ký — xếp **1 / 2 / 3**?  
2. **Cascade soft-delete chi tiết khi tắt bộ?** Có / không / chỉ job dọn một lần?  
3. **Có cần phiếu «đổi master loại» sớm không** (volume đổi SKU)?  
4. **Workspace kiểm kê đợt theo khoa** — có lịch định kỳ không? (không → trì hoãn Đợt E phần campaign)  
5. **Four-eyes danh mục:** L1 bắt buộc peer khác creator (đã ship) — có siết thêm «L1 không được là cùng ca với reporter» không?  
6. **Được phép sửa code** Đợt A ngay sau chốt, hay chỉ giữ docs?

---

## 7. Phụ lục nguồn

### Delta catalog / qty / BOM (09-09)
- `docs/modules/cssd/_agent-catalog-hybrid-c-dot0-20260909.md`
- `docs/modules/cssd/_agent-catalog-hybrid-c-full-2tier-20260909.md`
- `docs/modules/cssd/_agent-catalog-qty-integrity-audit-20260909.md`
- `docs/modules/cssd/_agent-bom-merge-unique-20260909.md` (+ JSON/txt kèm)

### Roadmap / debt / backlog
- `docs/reference/reports/_agent-full-project-expert-audit-roadmap-20260909.md`
- `docs/reference/architecture/debt-register.md` (§ Perf Batches 1–12)
- `docs/reference/architecture/open-backlog-20260731.md`
- `docs/ssot-map.md`

### Agent notes 09/2026 (lưu trữ)
- Sự cố / quy trình / VST / TB-HC / quan-tri / perf / lookup — thư mục `docs/archive/agent-notes/202609/`

### Code / quy mô (đo 2026-09-09)
- Routes App Router: **55** `page.tsx`
- Module LOC ước: NKBV ~49.5k · QT ~22.4k · cssd-erp ~18.8k · QLCV ~11.5k · cssd-su-co ~10.0k · GSC ~8.7k · dashboard ~5.9k · VST ~4.9k · dao-tao ~4.5k
- Mega ví dụ: `NkbvBaMultiTimelineWorkspace` ~2254 · `SuCoReportForm` ~1103 · `GiamSatNkbvPage` ~1175

### Không phủ đủ
- Mọi migration sau 08 từng dòng · e2e Playwright full · prod APM · Docker golden (OPS-DB-01) · mọi panel NKBV 2k dòng từng hàm.

---

*Pass này: docs only — không commit/push. Cập nhật nhẹ debt-register (pointer) nếu có trong cùng pass.*

---

## Nhật ký delta

- **2026-09-09 chiều (Đợt A+B):** Implant CHO_BI write+gate+release+vitest; CTA dual surface + FSM 3 trục. Báo cáo: [`../../modules/cssd/_agent-opt-dotA-implant-dotB-cta-20260909.md`](../../modules/cssd/_agent-opt-dotA-implant-dotB-cta-20260909.md).
- **2026-09-09 tối (Wave 2):** In lại tem Kho/Trace; SuCo defer catalog + cắt remount; dynamic offline GS; NKBV defer cases list. Báo cáo: [`_agent-opt-wave2-debt-fixes-20260909.md`](./_agent-opt-wave2-debt-fixes-20260909.md).
