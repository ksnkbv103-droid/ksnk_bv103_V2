# SỔ ĐĂNG KÝ NỢ KỸ THUẬT (TECHNICAL DEBT REGISTER)
## HỆ THỐNG KIỂM SOÁT NHIỄM KHUẨN (KSNK) — BỆNH VIỆN 103

> **Phiên bản:** 1.1 (Cập nhật chuẩn hóa theo CSDL thực tế - 30/05/2026)  
> **Trạng thái:** Hoạt động (SSOT Quản trị Nợ kỹ thuật)  
> **Nguyên tắc phân loại:** P0 (Chí mạng - Ảnh hưởng nghiệp vụ/dữ liệu) | P1 (Kiến trúc/Độ duy trì) | P2 (Chất lượng/Perf/CI) | P3 (Roadmap/Deferred)

---

## 1. NỢ KỸ THUẬT NHÓM P0 (CRITICAL - ẢNH HƯỞNG NGHIỆP VỤ & DỮ LIỆU)

### [D-01] Thiếu Digital BOM checklist tại Trạm Đóng gói
*   **Mô tả:** Trạm Đóng gói chưa có giao diện chọn và xác nhận danh sách dụng cụ thực tế trong bộ. Cột `so_luong_thuc_te` không được cập nhật khi đóng gói, dẫn tới việc không phát hiện được sự thiếu hụt dụng cụ vật lý trước khi hấp.
*   **Vị trí:** QLDCPT B1 / [DigitalChecklistPanel.tsx](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/src/modules/cssd-erp/components/workflow/DigitalChecklistPanel.tsx) (chỉ mới khai báo khung).
*   **Ưu tiên:** P0 (Chí mạng).
*   **Exit Criteria:** Trạm Đóng gói hiển thị danh sách dụng cụ chuẩn từ `dm_bo_dung_cu_chi_tiet`. Điều dưỡng bắt buộc phải tích chọn xác nhận số lượng thực tế mới cho phép in nhãn QR.

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
*   **Đã làm:** Migration `20260604100000` — DROP `gstt_fact_*_summary` + trigger sync; `v_gstt_giam_sat_vst_sessions_full` aggregate live từ `gstt_fact_vst`. Benchmark: [dashboard-rpc-benchmark-20260603.md](../reports/dashboard-rpc-benchmark-20260603.md).
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

### [D-10] UNIFIED_DOMAIN_SPEC chưa đồng bộ tên bảng mới
*   **Mô tả:** Tài liệu đặc tả y tế chung vẫn đang mô tả cấu trúc theo tên các bảng lâm sàng cũ (không có prefix phân vùng).
*   **Vị trí:** [domain-specification.md](file:///Users/trinhhuunghia/Desktop/ksnk_bv103/docs/core/domain-specification.md).
*   **Ưu tiên:** P1.
*   **Exit Criteria:** Đồng bộ 100% tên bảng trong spec trùng khớp với CSDL thực tế.

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

*   **[D-15] Trực quan hóa luồng di chuyển dụng cụ:** Bản đồ 6 trạm trực quan (Mermaid/SVG) thời gian thực hiển thị vị trí bộ dụng cụ.
*   **[D-16] Spaulding/Heat Domain Engine:** Tự động đề xuất trạm tiệt khuẩn dựa trên phân loại Spaulding (Dụng cụ cực kỳ nguy hiểm, nguy hiểm, không nguy hiểm).
*   **[D-17] CSSD↔MDM Facade Replenish:** Động cơ tự động cảnh báo bổ sung nguyên liệu/hóa chất từ kho tổng bệnh viện.
*   **[D-18] Trace NKBV↔CSSD:** Liên kết ca nhiễm khuẩn vết mổ (SSI) ngược lại mã vạch mẻ hấp dụng cụ mổ tương ứng để tìm nguyên nhân gốc rễ.
*   **[D-19] Cycle QR vs Permanent set QR:** Phân biệt vòng đời của nhãn dán tạm thời của túi hấp và nhãn khắc kim loại vĩnh viễn của khay dụng cụ phòng mổ.
*   **[D-20] HIS/LIS FHIR Integration:** API đồng bộ tự động ca cấy vi sinh từ máy xét nghiệm theo chuẩn HL7/FHIR thay thế cho import file Excel vi sinh.

---

## Audit 2026-06-03 re-verification

> Nguồn: [comprehensive-review-20260603.md](../reports/comprehensive-review-20260603.md) — chỉ trạng thái sau grep/code + CLI trên HEAD; **không** copy báo cáo 30/05.

| ID | Trạng thái mới | Bằng chứng ngắn |
|----|----------------|-----------------|
| D-01 | **Done (2026-06-03)** | `DigitalChecklistPanel` + `persistBomCheckpoint` / `KIEM_DEM_BOM` |
| D-02 | **Done (2026-06-03)** | CAP_PHAT `assertLedgerDuChoCapPhat` → `ok: false` nếu chưa BOM / thiếu cấu phần |
| D-03 | **Done (2026-06-03)** | Local + staging head **30** migrations (`20260603160000`) |
| D-04 | Verify per env | Seed paths trong `supabase/seeds/` — chưa re-test `db reset` timing |
| D-05 | **Obsolete** | `npm run legacy:guard` PASS |
| D-06 | **Done (2026-06-03)** | Chỉ `strategic-dashboard-v4.types.ts` — không còn v3 |
| D-07 | **Done (2026-06-04)** | Migration `20260604100000` DROP summary + triggers |
| D-08 | **Done** | (giữ nguyên 2026-05-31) |
| D-09 | **Done (2026-06-03)** | `src/proxy.ts` — `getUser()` server-side (Next.js 16 proxy, không `middleware.ts`) |
| D-10 | **Partial** | `domain-specification.md` có prefix; mapping vẫn nhắc compat |
| D-11 | **Done (2026-06-03)** | Migration `20260603160000` applied local + linked |
| D-12 | **Done** | CI align (theo ghi chú 30/05) — chưa re-verify workflow file |
| D-13 | **Done (2026-06-04)** | `audit:legacy-rpc` + `20260604110000` |
| D-14 | **Eng done / UAT pending** | Checklist + spec pass; sign-off khoa KSNK |
| D-18 | **Partial done** | Migration `20260602150000` + `CssdTraceLink` — chưa đủ RCA SSI end-to-end |
| D-QLCV-01 | **Done (2026-06-04)** | `20260604120000` + app dual-write |

### D-UX-01 — UI shell fragmentation (2026-06-04)

*   **Mô tả:** Nhiều hệ header/layout song song; typography micro `8px`/`9px`.
*   **Trạng thái:** **Done** — codemod 70 file → `text-[11px]`; `layout:typography-check` exit 1 on drift.
*   **Exit:** **Đạt** — 0 hits `text-[8px]`/`text-[9px]`.

Remediation đồng bộ: [remediation-plan-2026h2-sync.md](./remediation-plan-2026h2-sync.md)
