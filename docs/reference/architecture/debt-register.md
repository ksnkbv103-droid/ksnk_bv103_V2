# SỔ ĐĂNG KÝ NỢ KỸ THUẬT (TECHNICAL DEBT REGISTER)
## HỆ THỐNG KIỂM SOÁT NHIỄM KHUẨN (KSNK) — BỆNH VIỆN 103

> **Phiên bản:** 1.2 (Hygiene A0 — 31/07/2026)  
> **Trạng thái:** Hoạt động (SSOT lịch sử nợ + audit)  
> **Backlog đang mở (đọc trước §1):** [`open-backlog-20260731.md`](./open-backlog-20260731.md)  
> **Nguyên tắc phân loại:** P0 (Chí mạng - Ảnh hưởng nghiệp vụ/dữ liệu) | P1 (Kiến trúc/Độ duy trì) | P2 (Chất lượng/Perf/CI) | P3 (Roadmap/Deferred)

> **Lưu ý 2026-07-31:** Nhiều mục ở §1–§2 bên dưới đã **Done/Obsolete** theo bảng Audit 07-03 / 07-09 / 07-26. Không dùng §1 như danh sách việc còn mở — dùng open-backlog.

---

## 1. NỢ KỸ THUẬT NHÓM P0 (CRITICAL - ẢNH HƯỞNG NGHIỆP VỤ & DỮ LIỆU)

### [D-01] Digital BOM checklist tại Trạm Đóng gói — **Done (soft-warning path)**
*   **Đã làm (pilot 2026-07):** Trạm Đóng gói dùng `CompositionReconcilePanel` + đối chiếu `v_cssd_bo_dung_cu_chi_tiet_realtime`; báo sự cố Hỏng/Mất/Bổ sung tại chỗ. Cấp phát **soft-warning** khi thiếu cấu phần (không hard-block `bom_kiem_dem_at`). Flag legacy `BV103_FEATURE_BOM_CHECKLIST` không còn là đường chính.
*   **Vị trí:** [CompositionReconcilePanel.tsx](../../../src/modules/cssd-erp/components/packaging/CompositionReconcilePanel.tsx), `CSSDERPPage`.
*   **Ưu tiên:** ~~P0~~ đóng theo soft-warning SSOT (changelog mapping 2026-07-01).
*   **Exit Criteria:** **Đạt (engineering)** — UAT vận hành theo reform CSSD; không reopen DigitalChecklistPanel.

### [D-02] Ledger Bypass trong CSSD Workflow
*   **Mô tả:** Hàm kiểm tra tồn kho phát trả `assertLedgerDuChoCapPhat` tự động cho qua (bypass) nếu hệ thống chưa cấu hình hoặc không tìm thấy bản ghi số dư cơ sở, làm mất đi tính kiểm soát nghiêm ngặt của sổ cái dụng cụ sạch.
*   **Vị trí:** CSSD workflow helpers / [cssd-workflow-ops.actions.ts](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/src/modules/cssd-erp/actions/cssd-workflow-ops.actions.ts).
*   **Ưu tiên:** P0 (Chí mạng).
*   **Exit Criteria:** Loại bỏ hoàn toàn cờ bypass. Mọi giao dịch phát trả dụng cụ bắt buộc phải có bản ghi kiểm tra số dư sổ cái và trừ kho thực tế.

### [D-03] Mismatch Lịch sử Di dân Staging/Staging Linked sau Squash
*   **Mô tả:** Gộp 90 migration file local thành 1 file baseline (`20260530000000_init_pilot_baseline.sql`) khiến lịch sử `schema_migrations` ở môi trường liên kết (linked staging/prod) bị sai lệch.
*   **Vị trí:** Ops / Supabase Migrations.
*   **Ưu tiên:** P0 (Chí mạng).
*   **Exit Criteria:** Runbook `docs/reference/guides/migration-squash-runbook.md` + repair baseline `20260530000000`.

### [D-04] Thiếu dữ liệu Seed RBAC & Nhân sự cho môi trường Local
*   **Mô tả:** Lệnh `supabase db reset --local` xóa sạch data, seed chỉ nạp lookup và mẫu bảng kiểm. Môi trường local hoàn toàn trống vai trò (sys_roles) và nhân sự, gây khó khăn cho việc đăng nhập kiểm thử.
*   **Vị trí:** Database Seeds / `supabase/seeds/`.
*   **Ưu tiên:** P0 (Chí mạng).
*   **Exit Criteria:** Tách biệt seeds thành `00-rbac.sql` và `01-pilot-nhan-su.sql`; `config.toml` sql_paths; login local sau `db reset`.

---

## 2. NỢ KỸ THUẬT NHÓM P1 (HIGH - KIẾN TRÚC & ĐỘ DUY TRÌ)

### [D-05] Sử dụng View Alias cũ trong ứng dụng
*   **Mô tả:** Khoảng 40 file code frontend và server actions vẫn đang gọi các view alias cũ (`v_fact_*`, `v_dm_*`) thay vì các view đã được đổi tên theo chuẩn phân hệ (`v_gstt_*`, `v_cssd_*`).
*   **Vị trí:** [view-rename-mapping-20260526.md](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/archive/baselines/view-rename-mapping-20260526.md).
*   **Ưu tiên:** P1.
*   **Exit Criteria:** Quét toàn bộ source code, thay thế triệt để 100% các view cũ bằng view prefix chuẩn và chạy di dân DROP 24 view alias cũ.

### [D-06] Dashboard Naming Drift
*   **Mô tả:** Tệp kiểu dữ liệu `strategic-dashboard-v3.types.ts` lại đang chứa payload cấu trúc của Dashboard V4. Tên tệp và nội dung thực tế bị lệch pha.
*   **Vị trí:** Dashboard Module / [dashboard.actions.ts](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/src/modules/dashboard/actions/dashboard.actions.ts).
*   **Ưu tiên:** P1.
*   **Exit Criteria:** Refactor đổi tên tệp kiểu dữ liệu khớp chính xác với phiên bản Dashboard V4.

### [D-07] Dual Dashboard Data Path — **Done (2026-06-04)**
*   **Đã làm:** Migration `20260604100000` — DROP `gstt_fact_*_summary` + trigger sync; `v_gstt_giam_sat_vst_sessions_full` aggregate live từ `gstt_fact_vst`. Benchmark: [dashboard-rpc-benchmark-20260603.md](../../archive/reports/dashboard-rpc-benchmark-20260603.md).
*   **Exit Criteria:** ~~Benchmark~~ **Đạt** — RPC-only read path (ADR accepted).

### [D-QLCV-01] QLCV — chuyển `trang_thai`/`loai` sang TEXT+CHECK — **Done (2026-06-04)**
*   **Đã làm:** Migration `20260604120000` — cột `trang_thai`/`loai_cong_viec` text + CHECK; trigger sync FK; app dual-write.
*   **Exit Criteria:** **Đạt** — view `v_qlcv_*` đọc mã trực tiếp; spawn RPC cập nhật.

### [D-QLCV-02] QLCV — DROP cột FK `trang_thai_id` / `loai_cong_viec_id` — **Done (2026-06-07)**
*   **Đã làm:** Migration `20260607100000` — DROP FK cols + `cong_viec_cha_id`, trigger `fn_qlcv_sync_code_from_fk`; app ghi TEXT-only; view `trang_thai_mau_sac`.
*   **Exit Criteria:** **Đạt** — grep app/DB sạch FK path; RPC checklist cập nhật `trang_thai` text.

### [D-QLCV-03] QLCV cron quá hạn stale — **Done (2026-06-06)**
*   **Đã làm:** `20260606160000` rewrite `fn_sync_overdue_tasks` → `qlcv_fact_cong_viec.trang_thai`; DROP orphan `fn_qlcv_analytics_summary`.

### [D-08] Legacy CSSD Redirect Routes — **Done (2026-05-31)**
*   **Đã làm:** Redirect 9 URL cũ trong `next.config.ts`; xóa 10 `page.tsx` redirect; `CSSD_ROUTES` 7 path canonical ([`cssd-routes.ts`](../../../src/lib/cssd-routes.ts), [`modules/cssd/README.md`](../../modules/cssd/README.md)).

### [D-09] Auth Gate Client-Side Only
*   **Mô tả:** Việc bảo vệ các trang dashboard và hành chính y tế hoàn toàn thực hiện ở client-side (`ClientLayoutWrapper`), chưa sử dụng Next.js middleware ở tầng mạng.
*   **Vị trí:** Security / [layout.tsx](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/src/app/layout.tsx).
*   **Ưu tiên:** P1.
*   **Exit Criteria:** Triển khai Next.js `middleware.ts` ở thư mục gốc để chặn truy cập trái phép ngay từ tầng server.

### [D-10] UNIFIED_DOMAIN_SPEC chưa đồng bộ tên bảng mới — **Done (2026-07-03)**
*   **Đã làm:** Spec dùng 100% tên prefix (`gstt_`/`nkbv_`/`cssd_`/`qlcv_`/`mdm_`/`sys_`); cột "View compat" đổi nhãn thành "Tên legacy (đã DROP khỏi DB 2026-06-02)" vì các view compat `fact_*`/`dm_*` đã gỡ (chỉ còn 5 view `fact_*_summary` đang dùng thật).
*   **Exit Criteria:** **Đạt** — grep spec không còn tên bảng cũ ngoài cột legacy được ghi chú rõ.

---

## 3. NỢ KỸ THUẬT NHÓM P2 (MEDIUM - CHẤT LƯỢNG / PERF / CI)

### [D-11] RLS CSSD Legacy Authenticated
*   **Mô tả:** RLS chính sách của phân hệ CSSD chỉ đang kiểm tra đơn giản `authenticated`, chưa thắt chặt theo module-scoped role.
*   **Vị trí:** CSSD security policies.
*   **Ưu tiên:** P2.
*   **Exit Criteria:** Nâng cấp chính sách RLS, chỉ cho phép tài khoản có quyền `CSSD_*` thực hiện SELECT/UPDATE dữ liệu tiệt khuẩn.

### [D-12] CI Workflow chưa tích hợp đầy đủ lệnh kiểm tra
*   **Mô tả:** GitHub Actions CI mới chỉ chạy lint cơ bản và test, chưa chạy full `verify:cssd` và kiểm tra lỗi liên kết tài liệu (`docs:links:check`).
*   **Vị trí:** CI / `.github/workflows/ci.yml`.
*   **Ưu tiên:** P2.
*   **Exit Criteria:** GitHub Actions CI chạy `verify:cssd`, `layout:drift-check`, và `docs:links:check` (đã align 30/05/2026).

### [D-13] Dư thừa RPC cũ trong Baseline SQL — **Done (2026-06-04)**
*   **Đã làm:** `npm run audit:legacy-rpc` + migration `20260604110000_drop_legacy_dashboard_rpcs.sql`.
*   **Exit Criteria:** **Đạt** — app chỉ gọi 4 RPC dashboard (contract spec).

### [D-14] Giao diện Xác minh ca NKBV — **Engineering done; UAT pending**
*   **Đã làm:** Sub-forms BSI/UTI/VAP/SSI + `nkbv-rules-engine.spec.ts`; checklist [pilot-clinical-checklist-20260603.md](../../modules/nkbv/pilot-clinical-checklist-20260603.md).
*   **Exit Criteria:** KSNK pilot sign-off 5 kịch bản tay (cột UAT trong checklist).

---

## 4. NỢ KỸ THUẬT NHÓM P3 (LOW - ROADMAP / DEFERRED)

*   **[D-15] Trực quan hóa luồng di chuyển dụng cụ — Partial (2026-07-26 local):** Gộp chọn trạm + bản đồ đếm vào một lưới 6 bước (`CssdStationFlowMap` + ô Phiếu mẻ); bỏ panel chọn trạm trùng. Còn lại: SVG/Mermaid realtime nâng cao nếu cần sau UAT.
*   **[D-16] Spaulding/Heat Domain Engine:** Tự động đề xuất trạm tiệt khuẩn dựa trên phân loại Spaulding. **Partial→advanced (2026-07-31):** normalize shared + `suggestCssdStationFromMaster` (gợi ý mã trạm trên form loại dụng cụ). Còn: map mã gợi ý ↔ bản ghi `cssd_dm_tram` thực tế viện (seed/UAT).
*   **[D-17] CSSD↔MDM Facade Replenish:** Facade `requestReplenishFromReserveAction` (`CSSD_WORKFLOW.edit`) đã wire UI đối chiếu đóng gói; **2026-07-31** thêm thông báo từ chối rõ khi thiếu quyền. Còn: cảnh báo tự động từ kho tổng viện (ngoài scope facade hiện tại).
*   **[D-18] Trace NKBV↔CSSD — Partial → near-complete (2026-07-17):** SSI gắn QR chu trình → `quy_trinh_id` / mẻ; `NkbvCssdRcaPanel` (mẻ QC + sự cố); deep-link nhật ký `cssdSuCoIncidentJournalHref`; chiều ngược `MeTkNkbvLinkBanner` trên mẻ TK. Còn lại: UAT khoa + mở rộng ngoài SSI nếu cần.
*   **[D-19] Cycle QR vs Permanent set QR:** Phân biệt vòng đời của nhãn dán tạm thời của túi hấp và nhãn khắc kim loại vĩnh viễn của khay dụng cụ phòng mổ. **Partial (2026-07-28):** copy + nhãn in (`printBoLabel` = tem vĩnh viễn; `printCycleLabel` = tem chu trình) + `CssdQrLabelKindsNotice` trên master/catalog; còn lại: UAT dán tem thực tế kho CSSD.
*   **[D-20] HIS/LIS FHIR Integration:** API đồng bộ tự động ca cấy vi sinh từ máy xét nghiệm theo chuẩn HL7/FHIR thay thế cho import file Excel vi sinh.
*   **[D-21] GSC Excel session import — Done (2026-08-02):** Đã gỡ stub `importGiamSatChungData`, spec, và `import-session-ids.ts`. Không UI / không ops caller. Rollback: khôi phục từ git history.

---

## Audit 2026-06-03 re-verification

> Nguồn: [comprehensive-review-20260603.md](../../archive/reports/comprehensive-review-20260603.md) — chỉ trạng thái sau grep/code + CLI trên HEAD; **không** copy báo cáo 30/05.

| ID | Trạng thái mới | Bằng chứng ngắn |
|----|----------------|-----------------|
| D-01 | **Done (soft-warning 2026-07)** | `CompositionReconcilePanel` + soft-warning CAP_PHAT — không DigitalChecklistPanel |
| D-02 | **Done (2026-06-03)** | CAP_PHAT `assertLedgerDuChoCapPhat` → `ok: false` nếu chưa BOM / thiếu cấu phần |
| D-03 | **Done (2026-06-03)** | Local + staging head **30** migrations (`20260603160000`) |
| D-04 | Verify per env | Seed paths trong `supabase/seeds/` — chưa re-test `db reset` timing |
| D-05 | **Obsolete** | `npm run legacy:guard` PASS |
| D-06 | **Done (2026-06-03)** | Chỉ `strategic-dashboard-v4.types.ts` — không còn v3 |
| D-07 | **Done (2026-06-04)** | Migration `20260604100000` DROP summary + triggers |
| D-08 | **Done** | (giữ nguyên 2026-05-31) |
| D-09 | **Done (2026-06-03)** | `src/proxy.ts` — `getUser()` server-side (Next.js 16 proxy, không `middleware.ts`) |
| D-10 | **Done (2026-07-03)** | Spec 100% prefix; cột legacy relabel "đã DROP 2026-06-02" |
| D-11 | **Done (2026-06-03)** | Migration `20260603160000` applied local + linked |
| D-12 | **Done (2026-07-06 re-verify)** | CI: `verify:cssd`, `layout:drift-check`, `docs:links:check`, `repo:hygiene`, `dead-code:scan` (warn) — `.github/workflows/ci.yml` |
| D-13 | **Done (2026-06-04)** | `audit:legacy-rpc` + `20260604110000` |
| D-14 | **Eng done / UAT pending** | Checklist + spec pass; sign-off khoa KSNK |
| D-18 | **Near-complete (2026-07-17)** | RCA panel + journal deep-link + banner mẻ↔NKBV; UAT khoa còn lại |
| D-QLCV-01 | **Done (2026-06-04)** | `20260604120000` + app dual-write |

### D-UX-01 — UI shell fragmentation (2026-06-04)

*   **Mô tả:** Nhiều hệ header/layout song song; typography micro `8px`/`9px`.
*   **Trạng thái:** **Done** — codemod 70 file → `text-[11px]`; re-verified **2026-06-30** (`layout:drift-check` 0 blocking).
*   **Exit:** **Đạt** — 0 hits `text-[8px]`/`text-[9px]`.

Remediation đồng bộ: [remediation-plan-2026h2-sync.md](./remediation-plan-2026h2-sync.md)

---

## Audit 2026-06-30 re-verification

> Nguồn: [audit-evidence-pack-20260630.md](../../archive/reports/audit-evidence-pack-20260630.md) · [gap-register-20260630.md](../../archive/reports/gap-register-20260630.md)

| ID | Trạng thái | Ghi chú |
|----|------------|---------|
| G-01/G-02 | **Done** | `20260701000000` — DROP `dm_bang_kiem` + RPC `rpc_gstt_dm_bang_kiem_max_numeric_suffix` |
| G-03/G-04 | **Done** | ESLint hooks + layout drift 38→0 |
| G-05/G-06 | **Done** | SQL runner JSON + repo hygiene allowlist |
| G-07 | **Done** | `use-analytics-filter-payload.ts` |
| G-08 | **Done** | `gsc-checklist-intervention.ts` |
| G-09 | **Done** | panel:wire |
| G-13 | **Blocked** | staging token 401 — cần refresh `.env.local` |

**Gates:** `verify` + `pilot:go-live:gate:local` PASS · 87 migrations local parity.

---

## Audit 2026-07-03 — Cải tổ pilot toàn diện (local)

> Nguồn: [gap-register-20260703.md](../reports/gap-register-20260703.md) · `local:golden:verify`

| Mục cũ | Trạng thái mới | Ghi chú |
|--------|----------------|---------|
| D-01 | **Obsolete** | Done 2026-06-03 — Digital BOM |
| D-02 | **Obsolete** | Soft-warning CAP_PHAT (SSOT 2026-07-01); không còn hard gate |
| D-03 | **Obsolete** | Runbook squash + repair baseline |
| D-04 | **Done** | Seeds `00-rbac.sql` + `01-pilot-nhan-su.sql`; SOP §2.1.2 |
| D-05 | **Obsolete** | `legacy:guard` PASS — không còn view alias cũ trong src |
| D-06 | **Obsolete** | Chỉ `strategic-dashboard-v4.types.ts` |
| D-09 | **Obsolete** | `src/proxy.ts` server-side auth |
| D-10 | **Done (2026-07-03)** | Spec 100% prefix; legacy chỉ còn cột tra cứu có ghi chú |
| D-14 | **Eng done / UAT pending** | NKBV clinical — chờ PO §B |

**P0/P1 mở:** 0 (tính đến 2026-07-03)

---

## Audit 2026-07-09 — Rà soát toàn diện (1B + 2A)

> Nguồn: [comprehensive-review-20260709.md](../reports/comprehensive-review-20260709.md) · [gap-register-20260709.md](../reports/gap-register-20260709.md) · [audit-evidence-pack-20260709.md](../reports/audit-evidence-pack-20260709.md)  
> Gate tĩnh PASS; Docker/local golden **Blocked** session audit.

| ID | Mức | Trạng thái | Ghi chú |
|----|-----|------------|---------|
| DOM-07 | P0 | **Done** | Day-3 server gate + spec |
| BE-RPC-01 | P0 | **Done** | `20260709120000` REVOKE authenticated checklist RPC |
| DOM-04 | P1 | **Done** | Bỏ auto `bom_kiem_dem_at` |
| DOM-08 | P1 | **Eng Done / UAT pending** | `CHO_XAC_MINH`; UAT #2–#5 |
| BE-RPC-02 | P1 | **Done** | GSC RPC harden mirror VST |
| BE-RPC-03 | P1 | **Done** | CSSD RPC permission wrap |
| OPS-01 | P1 | **Done** (2026-07-09) | Migrate local 4 file + `local:golden:verify` **PASSED** (11/11). Bypass Cursor TCC: `resolve-local-supabase-env` + `run-supabase-sql --db-url` |
| UI-01 | P2 | **Done** | 2 modal chrome |
| G-11 / S-RLS-01 | P3 | **Eng Done / residual** | Fact phiên Done; summary views vẫn permissive |
| D-14 | P2 | **UAT pending** | Giữ — gộp DOM-08 |

**P0/P1 mở (sau remediation 2026-07-09):** 0 P0 · 0 P1 · UAT NKBV tay (lâm sàng)

### P2 batch (cùng ngày)

| ID | Trạng thái |
|----|------------|
| DOM-01/02/03/05/14 | **Done** (docs) |
| DB-01/02/03/08 | **Done** (`20260709130000` + doc) |
| BE-ORPHAN-01 | **Done** (xóa 5 file W3) |
| BE-AUTH-04 | **Done** (proxy thiếu env → login) |
| DOM-10 | **Done** (`20260709140000`) |
| G-12 | **Done** (unusedExports 75→5; giữ dialog/scripts) |

---

## Audit 2026-07-26 — Local A→E (PO sequential)

> Phạm vi: local only · không cloud.

| Gate | Kết quả |
|------|---------|
| NKBV vitest (UAT eng) | **29 PASS** — chữ ký khoa #2–#5 vẫn mở |
| `verify:engineering` | **PASS** |
| `verify:cssd` | **53 PASS** |
| `local:golden:verify` | **11/11 PASS** |
| `mdm:migrate:local` | Applied `20260724100000_cssd_quy_trinh_is_red_alert` |
| `layout:typography-check` | **PASS** |
| `audit:legacy-rpc` | **PASS** (23 RPC, 0 orphan src) |
| `dead-code:scan` | **WARN** — unusedExports **19** (tăng so 5@0709; warn-only CI) |
| `layout:drift-check` | Còn adoption-warn ngoài CSSD map (InventoryIssueModal, NkbvCssdRcaPanel) |

| ID | Trạng thái |
|----|------------|
| D-15 | **Partial** — gộp bản đồ + chọn trạm một lưới 6 bước |
| DOM-08 / D-14 | **Eng ready** — chờ khoa ký UAT |
| D-16…D-20 | **Giữ** roadmap |
