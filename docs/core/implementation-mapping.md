# BV103 — Ánh xạ thuật ngữ spec ↔ module ↔ bảng / thực thể thật

> Bản này nối **ngôn ngữ nghiệp vụ** trong [`domain-specification.md`](./domain-specification.md) với **mã nguồn và schema đang chạy**. Khi lệch tên bảng, **Postgres + changelog file này** là chuẩn. Đọc tối thiểu: [`read-minimum.md`](./read-minimum.md), thực thi: [`lean-execution.md`](./lean-execution.md).

## Quy ước

| Cột | Ý nghĩa |
|-----|--------|
| **Spec term** | Tên khái niệm / pseudo-English trong tài liệu tổng hợp |
| **Module (thư mục)** | `src/modules/<kebab>/` |
| **Bảng / thực thể thật** | `public.*` trong migration / Supabase |
| **Ghi chú** | Khác biệt quan trọng so với spec |

---

## Bản đồ Prefix sau đợt chuẩn hóa **25/05/2026** (chuỗi `20260525000001`–`000011`)

DB đã tái cấu trúc theo **prefix-by-bounded-context**. **Từ 2026-06-02** compat view `dm_*` / `fact_*` đã **DROP** (`20260602180000`); app + RPC dùng `{module}_dm_*` / `{module}_fact_*`. **Tên bảng vật lý** dưới đây là SSOT khi viết migration mới.

> **Cập nhật 26/05/2026**: Probe DB thực tế (`scripts/sql/admin-slice-pre-apply-probe.sql`) đã xác nhận **SSOT vật lý chính xác**. Bảng nào là **TABLE (kind=r)** mới là physical; các tên prefix khác hầu hết là **VIEW (kind=v)**. Cảnh báo "Double SSOT" trong phiên bản trước **không còn áp dụng** — các bảng lookup `mdm_dm_*`, `cssd_dm_*`, `gstt_dm_*`, `qlcv_dm_*`, `nkbv_dm_*` ở mức "loại" đã là view đọc từ `sys_lookup_value` theo `category_type`.

> **DEPRECATED (2026-06-03):** Tên compat `dm_*` / `fact_*` / `v_fact_*` trong changelog lịch sử — app **cấm** `.from('dm_*'|'fact_*')` (`npm run legacy:guard`). View đọc chuẩn: `v_{module}_*`, bảng: `{module}_fact_*`.

| Prefix | Phạm vi | **TABLE vật lý (SSOT)** | View đọc (module / báo cáo) |
|--------|---------|---------------------------|-----------------------------|
| `sys_` | Hạ tầng/metadata/RBAC/lookup | `sys_lookup_value`, `sys_mdm_registry`, `sys_roles`, `sys_permissions`, `sys_user_roles`, `sys_role_permissions`, `sys_module_locks`, … | `v_sys_*` |
| `mdm_` | Master data dùng chung | **`mdm_dm_khoa_phong`**, **`mdm_nhan_su`** (TABLE) | `mdm_dm_*` lookup → `sys_lookup_value`; `v_mdm_nhan_su_full` |
| `cssd_` | CSSD | `cssd_dm_*` TABLE + `cssd_fact_*` | `cssd_dm_tram`, `cssd_dm_loai_may` (lookup); `v_cssd_*` |
| `gstt_` | VST + GSC | `gstt_dm_bang_kiem`, `gstt_fact_*` (**summary DROP 2026-06-04**) | `gstt_dm_*` lookup; `v_gstt_*` |
| `qlcv_` | Công việc | `qlcv_fact_*` | `qlcv_dm_*`; `v_qlcv_*` |
| `nkbv_` | NKBV/HAI | `nkbv_fact_*`, `nkbv_dm_cdc_baseline` | `nkbv_dm_*`; `v_nkbv_*` |

### Quy tắc dùng tên bảng trong code/migration mới

1. **Migration mới**: WRITE/DDL bắt buộc nhắm vào **TABLE physical** (xem cột "TABLE vật lý" ở bảng trên). Tuyệt đối không `ALTER TABLE` lên VIEW.
2. **App code**: `.from('{module}_fact_*'|'{module}_dm_*')` — không dùng `dm_*`/`fact_*` compat (guard `legacy:guard`). Lookup phẳng ghi `sys_lookup_value` qua `master-crud-core`.
3. **View phẳng `v_*_full`**: nên JOIN từ table physical (`sys_lookup_value`, `mdm_dm_khoa_phong`, …) thay vì view trung gian — giảm chuỗi view lồng.
4. **WRITE cho lookup phẳng** (TO_CONG_TAC/CHUC_DANH/CHUC_VU/NGHE_NGHIEP/KHOI_KHOA/KHU_VUC_GIAM_SAT/HINH_THUC_GIAM_SAT/CACH_THUC_GIAM_SAT/LOAI_CONG_VIEC/TRANG_THAI_CONG_VIEC/LOAI_NKBV/TRANG_THAI_NKBV_CA/LOAI_MAY_TIET_KHUAN/TRAM_CSSD/LOAI_SU_CO, …): luôn ghi vào `sys_lookup_value`. App `master-crud-core.ts` đã làm đúng (CONSOLIDATED_MAPS).
5. **`LOAI_DUNG_CU` / InstrumentType ≠ lookup:** SSOT là **TABLE `cssd_dm_loai_dung_cu`** (CRUD dedicated tại `/quan-tri-he-thong/danh-muc/dung-cu?tab=loai`). **Không** ghi loại dụng cụ vào `sys_lookup_value`. Cột nghiệp vụ: Spaulding / chịu nhiệt / phương pháp tiệt khuẩn — xem lộ trình Lớp 1.1 [`../modules/mdm/improvement-roadmap-20260717.md`](../modules/mdm/improvement-roadmap-20260717.md).
6. **RBAC**: SSOT là `sys_roles`/`sys_permissions`/`sys_role_permissions`/`sys_user_roles` (TABLES); đọc quyền qua `v_sys_user_permissions`. **Audit DB/UI:** đã DROP (`20260602193500`) — không còn `sys_audit_log` / `fn_sys_audit_row`.

---

## MDM & quản trị

| Spec / phân hệ (tài liệu) | Module BV103 | Bảng / nguồn thật (vật lý) | Ghi chú |
|---------------------------|----------------|------------------|---------|
| MDM — Khoa phòng | `quan-tri-he-thong/danh-muc/` | **TABLE `mdm_dm_khoa_phong`**; view phẳng `v_mdm_khoa_phong_full` | `khoi_id` → `sys_lookup_value(id)` (category `KHOI_KHOA`) — view alias `mdm_dm_khoi_khoa` đọc qua đó. View compat: `dm_khoa_phong`. |
| MDM — Tổ chức/Chức danh | `quan-tri-he-thong/danh-muc/` (hub → lookup registry) | **TABLE `sys_lookup_value`** (`category_type` ∈ {`TO_CONG_TAC`, `CHUC_DANH`, `CHUC_VU`, `NGHE_NGHIEP`, `KHOI_KHOA`, …}) | Các tên `mdm_dm_to_cong_tac`, `mdm_dm_chuc_danh`, `mdm_dm_chuc_vu`, `mdm_dm_nghe_nghiep`, `mdm_dm_khoi_khoa` đều là VIEW filter từ `sys_lookup_value`. App ghi qua `master-crud-core.ts` đã được sửa vào `sys_lookup_value` trực tiếp. |
| MDM — Nhân sự | `quan-tri-he-thong/nhan-su/` + `quan-tri-he-thong/tai-khoan-nhan-su/` | **TABLE `mdm_nhan_su`** (`auth_user_id` → `auth.users`) | FK `to_id`/`chuc_danh_id`/`chuc_vu_id` trỏ về `sys_lookup_value(id)` (chứ không phải bảng vật lý riêng). Trang `tai-khoan-nhan-su` provision Supabase Auth + gán role KSNK qua RPC `rpc_assign_staff_ksnk_role`. |
| Registry FK động | `src/lib/master-data/governance.ts` | **TABLE `sys_mdm_registry`** + **TABLE `sys_mdm_suggestion`** | Trigger meta `fn_mdm_field_registry_attach_trigger` tự gắn/gỡ `trg_mdm_validate_lookup_%I` (`20260525000002`). View compat: `mdm_field_registry`, `mdm_governance_suggestion`. |
| Lookup thống nhất (SSOT 14 loại) | `quan-tri-he-thong/danh-muc/` | **TABLE `sys_lookup_value`** (`category_type`, `code`, `name`, `metadata` JSONB) | Toàn bộ 14 loại lookup phẳng SSOT về đây. Migration `20260520000006` consolidate; `20260525000011` rename → `sys_lookup_value`. |
| RBAC | `quan-tri-he-thong/phan-quyen/` | **TABLE `sys_roles`**, **`sys_permissions`**, **`sys_role_permissions`**, **`sys_user_roles`**; view tổng hợp **`v_sys_user_permissions`** | View compat (DROP Phase 1): `v_auth_user_permissions`. Matrix: `v_sys_role_permissions_matrix`. |
| Module locks | `gstt_*` (VST/GSC) | **`sys_module_locks`** (`module_name` IN ('VST','GSC')) | Khóa cứng ngày báo cáo; trigger `fn_assert_vst_gsc_not_locked` (`20260525000003`). |
| Ledger dụng cụ (CSSD vận hành) | `cssd-erp` + `danh-muc/actions/kho-dung-cu-giao-dich` | **`cssd_fact_kho_giao_dich`**, **`cssd_dm_bo_phan_bo`**, **`cssd_fact_kho_chi_tiet`** | SSOT định nghĩa: **Master CSSD** (`cssd_dm_*`); giao dịch tồn/kho: fact; RLS `000014`. |

---

## CSSD — tái xử lý dụng cụ

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `InstrumentType` (Loại dụng cụ) | **CRUD:** `quan-tri-he-thong/danh-muc/dung-cu/` · **RO ops:** `cssd-erp` `/cssd-dung-cu` | **TABLE `cssd_dm_loai_dung_cu`** — **không** phải `sys_lookup_value` | Spaulding / `is_chiu_nhiet` / `phuong_phap_tiet_khuan_chi_dinh`; map app `cssd-loai-dung-cu-map.ts`. Compat `dm_loai_dung_cu` đã DROP. |
| `InstrumentSet` (Bộ dụng cụ định nghĩa) | `quan-tri-he-thong/danh-muc/dung-cu/` | **TABLE `cssd_dm_bo_dung_cu`**, **`cssd_dm_bo_dung_cu_chi_tiet`** | BOM / thành phần bộ; vận hành đọc qua CSSD — không CRUD dưới `/cssd-*`. |
| `InstrumentInstance` (Bộ vật lý / QR) | `/cssd-quy-trinh` (+ `src/lib/cssd-routes.ts`) | **`cssd_fact_quy_trinh`** — `tram_hien_tai_id` → **`cssd_dm_tram`**; view **`v_fact_quy_trinh_full`** alias `ma_trang_thai_hien_tai` | Migration `20260716014`; ghi qua `buildQuyTrinhTramPatch`. `20260525000009` đã persist mốc thời gian + nhân sự ở từng trạm trên `cssd_fact_quy_trinh`. |
| Module thành phần (menu) | `src/lib/cssd-routes.ts` + `contexts/*/entrypoint` | — | Route: quy-trinh, dung-cu, su-co, thiet-bi, hoa-chat. |
| `SterilizationBatch` (Mẻ hấp) | `cssd-erp` | **`cssd_fact_lo_tiet_khuan`** (view compat `fact_lo_tiet_khuan`, `lo_tiet_khuan`) | Liên kết `cssd_fact_quy_trinh.lo_tiet_khuan_id`. Chuỗi: nạp bộ (DONG_GOI) → `tk_chot_nap_at` → `tk_mo_form_qc_at` → `ket_qua_test` + `tk_qc_json`. |
| `LifecycleAuditLog` | `cssd-erp` | **`cssd_fact_quy_trinh.metadata`** (ngoại lệ, audit QR) | DROP `cssd_fact_lifecycle_event`, `cssd_fact_nhat_ky_quet` (`20260622120000`). Không còn bảng `cssd_fact_nhat_ky_quet`. |
| `ComponentSplit` / rẽ nhánh tiệt khuẩn | `cssd-erp` | **`registerSplitSubQrFromMainMaAction`**, batch actions, **`cssd-merge-gate`** | Persist mẻ: [`persist-me-tiet-khuan.ts`](../../src/modules/cssd-erp/helpers/persist-me-tiet-khuan.ts). |
| Runtime cấu phần (ledger) | `cssd-erp` | **`cssd_fact_quy_trinh.metadata.bom_lines`** + **`bom_kiem_dem_at`** | DROP `cssd_fact_quy_trinh_thanh_phan`; gate cấp phát: `bom_kiem_dem_at IS NOT NULL`. |
| Sự cố CSSD | **`cssd-su-co`** (UI `/cssd-su-co`) | **`cssd_fact_su_co.attributes`** + `loai_su_co_id` → `LOAI_SU_CO` (SC_QUY_TRINH/SC_CHU_QUAN/SC_HE_THONG); generated `incident_group` | 3 lớp: nhóm nghiệp vụ · bản chất nguyên nhân · tình huống cụ thể; domino **`cssd-incident-policy`**. |
| NKBV ↔ CSSD trace | `giam-sat-nkbv` + `/cssd-quy-trinh?tab=trace` | **`nkbv_fact_su_kien.quy_trinh_id`**, **`ma_cycle_qr_lien_quan`** | Ca SSI nhập QR bộ → deep link timeline (`20260602150000`). |
| Phiếu bảo trì thiết bị / khóa máy | `cssd-erp` | **`cssd_fact_bao_tri`**, `cssd_dm_thiet_bi.trang_thai` (`REPAIRING` ↔ `READY`) | UI **`/cssd-erp/equipment-maintenance`**; chặn mẻ TK khi máy không sẵn sàng (`assert-thiet-bi-cho-me-tiet-khuan`). |
| Kho hóa chất — vật tư KSNK (tồn theo lô) | `cssd-erp` | **`cssd_fact_kho_hoa_chat_giao_dich`**; cột `cssd_dm_hoa_chat.nguong_ton_toi_thieu` | UI **`/cssd-erp/kho-hoa-chat`**, quyền **`KSNK_KHO_HOACHAT`**. |

---

## Giám sát tuân thủ — VST & bảng kiểm

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `HandHygieneSession` | `giam-sat-vst` | **`gstt_fact_vst_sessions`** (view compat `fact_giam_sat_vst_sessions`), chi tiết **`gstt_fact_vst`**; đọc **`v_gstt_giam_sat_vst_sessions_full`**, **`v_gstt_giam_sat_vst_full`**; analytics RPC **`rpc_dashboard_vst_strategic_analytics`** (đọc `gstt_fact_vst_opportunities_summary`) | Phiên: FK `khoa_id`, `khu_vuc_id`, `hinh_thuc_id`, `cach_thuc_id`. Dòng quan sát: thêm `khu_vuc_id`, `nghe_nghiep_id`. Ghi compat `fact_giam_sat_vst_*`. |
| `HandHygieneOpportunity` | `giam-sat-vst` | Cột trong `gstt_fact_vst` (WHO T1–T5) | — |
| `ChecklistTemplate` | `quan-tri-he-thong/bang-kiem/` | **`gstt_dm_bang_kiem`**, **`gstt_dm_tieu_chi_bang_kiem`** (view compat `dm_bang_kiem`, `dm_tieu_chi_bang_kiem`) | GSC đọc qua [`@/lib/mdm-read-gateway`](../../src/lib/mdm-read-gateway.ts). |
| Giám sát chung (phiên + checklist động) | `giam-sat-chung` | **`gstt_fact_chung_sessions`** (view compat `fact_giam_sat_chung_sessions`); `results_jsonb` JSONB inline (consolidate từ `20260521000001`) | FK: `bang_kiem_id` → `gstt_dm_bang_kiem`; view phẳng `v_fact_giam_sat_chung_sessions_full` + `v_gsc_dashboard_rows`. |
| `Dim_Failure_Reason` (Ishikawa) | `giam-sat-chung` | **`gstt_dm_failure_reason`** | **`[DROPPED]`** (Loại bỏ hoàn toàn trong Simplicity Reform Phase 2 ngày 28/05/2026 để tinh giản quy trình). |
| `Auto-RCA Ticket` (JCI QPS) | `giam-sat-chung` | **`gstt_fact_rca_ticket`** | **`[DROPPED]`** (Loại bỏ hoàn toàn trong Simplicity Reform Phase 2 ngày 28/05/2026. Giữ can thiệp `da_can_thiep_ngay` + URL ảnh bằng chứng trực tiếp trên phiên). |
| `Compliance Dashboard v4` (IPAC 4 vùng + Top 10 Vi phạm) | `dashboard` | **`[DROPPED]`** RPC `rpc_get_compliance_dashboard_v4` | Migration `20260701100000` — thay bằng strategic RPC + checklist analytics (`gsc-checklist-intervention.ts`). |

---

## Công việc (Task)

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `TaskScope` nội bộ Khoa | `quan-ly-cong-viec` | **Chỉ Khoa KSNK** — `khoa_thuc_hien_id` = `ma_khoa='KSNK'`; NV phụ trách thuộc KSNK; migration `20260617120000` purge liên khoa | Backfill `MANG_LUOI`→`NOI_BO` (legacy). |
| Ba cổng (phê đề xuất / nhận việc / nghiệm thu xong) | `quan-ly-cong-viec` | **`qlcv_fact_cong_viec.trang_thai`** (Track B CHECK): `MOI`, `DANG_LAM`, `CHO_DUYET`, `HOAN_THANH`, `TU_CHOI`, `QUA_HAN`, `DA_HUY` | Nhật ký **`qlcv_fact_cong_viec.nhat_ky`** jsonb (thay bảng `hoat_dong`). |
| Người giao (RACI) | `quan-ly-cong-viec` | **`qlcv_fact_cong_viec.nguoi_giao_viec_id`** → `mdm_nhan_su` | Ghi khi phê duyệt đề xuất / tạo việc trực tiếp. |
| Việc định kỳ (mẫu → instance) | `quan-ly-cong-viec` | **`qlcv_fact_cong_viec_dinh_ky`**; instance có **`qlcv_fact_cong_viec.dinh_ky_mau_id`** | RPC idempotent: `public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay()`. |
| `Task` lifecycle (legacy naming trong spec) | `quan-ly-cong-viec` | `qlcv_fact_cong_viec` (view list `v_fact_cong_viec_full`) | Không dùng enum TODO/IN_PROGRESS của spec nguyên bản. |
| KPI / đánh giá tháng (Track A) | — | **Đã gỡ pilot** (`20260531200000_qlcv_drop_monthly_kpi_pilot.sql`) | UI lean không còn tab KPI; không restore trừ khi có slice mới. |

---

## Giám sát NKBV — ca bệnh (MVP nhập tay)

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `HAI` / ca NKBV (ghi nhận BV103) | `giam-sat-nkbv` | **`nkbv_fact_benh_an`**, **`nkbv_fact_vi_sinh`**, **`nkbv_fact_su_kien`**, **`nkbv_fact_mau_so_daily`**, **`nkbv_fact_mau_so_phau_thuat`**; DM **`nkbv_dm_loai`**, **`nkbv_dm_trang_thai_ca`**, **`nkbv_dm_cdc_baseline`** | Route **`/giam-sat-nkbv`**, quyền **`GIAM_SAT_NKBV`**. Schema chuẩn hóa từ `20260524000000_nkbv_normalized_stay_centric`. View compat: `dm_loai_nkbv`, `dm_trang_thai_nkbv_ca`, `fact_nkbv_*`. |
| Loại NKBV / HAI | `giam-sat-nkbv` + hub danh mục | `nkbv_dm_loai` | Registry hub `LOAI_NKBV`. |
| Trạng thái phiếu NKBV | `giam-sat-nkbv` + hub | `nkbv_dm_trang_thai_ca` | Registry hub `TRANG_THAI_NKBV_CA`. |

## Phân hệ trong spec **chưa** hoặc **rất ít** có module tương ứng riêng

| Phân hệ (spec §04 / journeys) | Trạng thái BV103 | Ghi chú |
|------------------------------|------------------|---------|
| HAI / NKBV **Rules CDC** + tích hợp HIS/LIS | Lộ trình [`handover-roadmap.md`](./handover-roadmap.md) | **Chưa** — ngoài MVP; SSOT ca: `nkbv_fact_benh_an` / `nkbv_fact_su_kien`. `nkbv_dm_cdc_baseline` seed-only (rules engine roadmap). |
| Laundry, Waste, Environmental + HIS | `domain-specification.md` (lộ trình) | Triển khai sau BRD + permission registry. |
| REST `/api/v1/proxy/...` | **Không** — Server Actions + Supabase | Payload thiết kế có thể map FHIR sau. |

---

## Cách dùng cho Agent

1. Mở [`domain-specification.md`](./domain-specification.md) cho **nghĩa nghiệp vụ**.  
2. Tra bảng trên trước khi tạo migration mới — tránh nhân đôi bảng “spec-only”.  
3. **Migration / FK mới / bảng mới / đổi thực thể SSOT:** tuân [`operations-sop.md`](./operations-sop.md) §2 (không SQL nóng trên remote). Sau khi chốt schema: **sửa các bảng mapping trong file này** nếu tên bảng/cột nghiệp vụ thay đổi, và **thêm một dòng vào changelog** § dưới (ngày, mô tả thực thể/FK đổi, tham chiếu migration nếu cần).  
4. Nếu chỉ chỉnh cột không đổi **ý nghĩa** thực thể trong bảng map (rename thuần technical đã neo trong một migration): vẫn nên một dòng changelog ngắn để đời sau tra cứu.

### Changelog

| Ngày | Thay đổi |
|------|----------|
| 2026-07-24 | **CSSD cờ cảnh báo đỏ trên quy trình:** thêm `cssd_fact_quy_trinh.is_red_alert` + expose `v_cssd_quy_trinh_full` (`20260724100000`); backfill từ sự cố; báo sự cố/import luôn ghi cờ — hết lỗi `column …is_red_alert does not exist` trên bản đồ 6 trạm/kho. |
| 2026-07-18 | **RBAC gom 5 vai trò:** `ADMIN` · `HOI_DONG_KSNK` · `NHAN_VIEN_KSNK` · `MANG_LUOI_KSNK` · `KHACH_THONG_KE_GSTT`. Gộp Tổ trưởng/Thành viên → Mạng lưới; soft-deprecate `BAN_QLCL`/`KHOA_TRANG_BI`. Migration `20260718100000` + ensure Khách `20260718110000`. UI: Đồng bộ Registry ≠ Áp dụng preset; `local:golden:reset` có `--with-presets`. |
| 2026-07-19 | **Cloud migration history align (prod `cvzwslpxwgqiugzzhqej`):** orphan `20260717063027` (duplicate VST nghe_nghiep registry) → reverted; ghi nhận `20260717140000`…`20260718110000` khớp git/local; RBAC taxonomy + Khách apply trên cloud. |
| 2026-07-18 | **Sidebar Quản trị 1 cổng:** chỉ «Quản trị hệ thống» → `/quan-tri-he-thong`; gỡ shortcut Khoa/Master CSSD/BK/Lookup/Phân quyền/Tài khoản trên sidebar (chọn trong hub). SSOT `sidebar-admin-nav-groups.ts`. |
| 2026-07-18 | **Sidebar module-first:** gỡ khỏi sidebar Thống kê VST/GSC, Lịch sử giám sát, hub `/giam-sat`; nhóm «Điều hành KSNK» (CC + Báo cáo tổng hợp) + «Giám sát» (3 module). Route `/lich-su/*` `/thong-ke/*` giữ cho ModeNav/deep-link. SSOT `sidebar-nav-groups.ts`. |
| 2026-07-17 | **Dashboard P3 residual:** RPC `rpc_gsc_tgs_session_hits` (`20260717220000`); xếp hạng bao phủ TGS trên `/thong-ke/gsc` (Không áp dụng vs Thiếu); deep-link QLCV `?from=analytics`; chrome NKBV `Bv103AnalyticsPageFrame`; metric-dictionary bao phủ TGS. |
| 2026-07-17 | **Liên thông tinh chỉnh:** RCA SSI → nhật ký sự cố `cssdSuCoIncidentJournalHref` (`/cssd-erp/report?tab=incident&id=`); empty state QR/mẻ; BOM runtime normalize Spaulding/PP TK dùng chung master (`cssd-loai-dung-cu-map`); nhãn shell «Master CSSD / Quản trị danh mục»; sync `interaction-matrix` + debt D-01/D-16/D-18. |
| 2026-07-17 | **VST nghề bắt buộc:** form + Zod + `saveVSTSession` bắt `nghe_nghiep_id`; registry `sys_mdm_registry` (`gstt_fact_vst.nghe_nghiep_id`) `is_required=true` (`20260717140000`). Residual NULL → SQL [`vst-residual-null-nghe-nghiep.sql`](../../scripts/sql/vst-residual-null-nghe-nghiep.sql); RPC vẫn `COALESCE(…,'Không rõ')` cho dữ liệu cũ. |
| 2026-07-17 | **Quản trị Lớp 0 (doc):** lộ trình 4 lớp [`improvement-roadmap-20260717.md`](../modules/mdm/improvement-roadmap-20260717.md); tách ngôn ngữ MDM tổ chức vs Master CSSD; `LOAI_DUNG_CU` = TABLE (không lookup); rule `20-master-data-placement` bỏ `dm_*`. |
| 2026-07-15 | **NKBV chiến lược sản phẩm (PO):** giữ **một** module `giam-sat-nkbv` — không tách 4 app; ADR [`adr-nkbv-unified-module-20260715.md`](../reference/architecture/adr-nkbv-unified-module-20260715.md). |
| 2026-07-15 | **NKBV hô hấp tách loại:** VAE (VAC→IVAC→PVAP) ≠ VAP ≠ HAP trên picker/engine/persist; import LIS hô hấp gợi ý `HAP`; lọc danh sách `loai`+`trạng thái`. Không gộp nhãn VAE/VAP. |
| 2026-07-09 | **Tài khoản khách cloud:** UI gán `KHACH_THONG_KE_GSTT` trên `/quan-tri-he-thong/tai-khoan-nhan-su`; thẻ **Thiết lập tài khoản khách** (provision Auth + hồ sơ KHACH01); migration `20260709150000` RPC loại trừ vai trò Khách với KSNK khác. |
| 2026-07-09 | **Audit P2 hygiene:** domain-spec §2.1/§2.3; metric-dictionary TGS exception; CAP_PHAT soft-warning SSOT; GSC README redirect; spawn RPC tên `fn_qlcv_*`; xóa 5 orphan Pilot W3; migration `20260709130000` RLS summary GSTT + CSSD bao_tri/kho + NKBV; proxy thiếu env → redirect login. |
| 2026-07-09 | **Audit gap remediation P0/P1:** (1) NKBV import Day-3 server gate `isHaiSuspectByDay3Rule` + trạng thái auto-case ưu tiên `CHO_XAC_MINH`; (2) CSSD bỏ auto-stamp `bom_kiem_dem_at` khi quét Đóng gói; (3) migration `20260709120000` — REVOKE `fn_qlcv_update_checklist` khỏi authenticated; harden GSC analytics RPC (mirror VST); wrap CSSD scan/BOM/cycle QR + `fn_require_cssd_workflow_edit` (service_role bypass). Gap: [gap-register-20260709.md](../reference/reports/gap-register-20260709.md). |
| 2026-07-01 | **CSSD Đóng gói / CAP_PHAT (chốt soft-warning):** quét `DONG_GOI` + cycle QR; panel đối chiếu realtime; **cấp phát soft-warning** khi thiếu cấu phần (không hard-block `bom_kiem_dem_at`). Changelog 2026-06-03 ghi «hard gate» là **lệch** — lấy dòng này + domain-spec §2.2 làm SSOT. |
| 2026-07-04 | **VST module hardening (6 slice):** migration `20260704110000` — RPC analytics guard + RLS quan sát theo phiên active; `20260704120000` — `gap_analysis` dùng `opp_filtered`. App: chặn khách đọc lịch sử (`assertVstHistoryAccess`); `markVSTSessionsSeen` cần `edit` + scope OR giám sát viên/khoa; `resolveVstScopedKhoaId` khi save; khóa module VST; viewer lịch sử; filter init error; `getVstHeaderDmDropdowns`. Phạm vi mạng lưới lịch sử: phiên do mình giám sát **hoặc** tại khoa được gán. |
| 2026-07-04 | **Bỏ nhóm màu IPAC (TR/DO/VA/XA):** migration `20260704100000` — xóa `metadata.nhom_mau`, bỏ `matrix_khu_vuc_nhom` khỏi RPC compare; thống kê/báo cáo chỉ theo **chức năng phòng** (`matrix_khu_vuc`); UI form giám sát dropdown phẳng không badge màu. |
| 2026-07-03 | **Phân tách mạng lưới vs khách thống kê:** vai trò `KHACH_THONG_KE_GSTT` (chỉ view VST/GSC); preset mạng lưới bỏ `DASHBOARD_*`; Thống kê `/thong-ke` mở bộ lọc toàn viện (`resolve-analytics-rpc-scope.ts`); shell khách (`GuestStatsShell`, `GuestStatsRouteGuard`); seed `chuyennghiephieuqua@bv103`. Khách không đọc lịch sử phiên (action chặn). Mạng lưới: phiên do mình giám sát hoặc tại khoa được gán. |
| 2026-07-03 | **GSTT RLS hardening (G-11):** migration `20260703100000` — bỏ policy `Authenticated read access` (qual=true) trên `gstt_fact_vst_sessions` / `gstt_fact_vst` / `gstt_fact_chung_sessions`; SELECT nay yêu cầu `fn_sys_has_permission('GIAM_SAT_VST'\|'GIAM_SAT_CHUNG','view')` + `is_active` (sessions). Migration `20260703101000` — sửa `is_admin_user()` còn trỏ bảng cũ `user_roles`/`roles` → `sys_user_roles`/`sys_roles`. App dùng service_role nên hành vi không đổi. |
| 2026-06-30 | **CSSD báo cáo sự cố — bản chất nguyên nhân:** migration `20260630120000` seed `LOAI_SU_CO` (SC_QUY_TRINH/SC_CHU_QUAN/SC_HE_THONG); form 3 lớp (nhóm · bản chất · tình huống); ghi `loai_su_co_id`; in tự động sau báo cáo; accountability tab lọc chủ quan+quy trình. |
| 2026-06-21 | **CSSD tiếp nhận lần đầu:** bootstrap shell `tram_hien_tai_id` null; `rpc_scan_workflow_station` audit TIEP_NHAN trên UPDATE + idempotent legacy — `20260621160000`; app `validateStationAdvance` + `scanQR.maQr`. |
| 2026-06-19 | **CSSD quét trạm:** sửa `rpc_scan_workflow_station` — resolve NV qua `mdm_nhan_su.extra_data.email` hoặc `auth.users` (không còn cột `email` phantom) — `20260619100000`. |
| 2026-06-27 | **Kho hóa chất KSNK — Slice H-C (sự cố ↔ xuất):** migration `20260627130000` — `cssd_fact_kho_hoa_chat_giao_dich.su_co_id`; panel sự cố CHEMICAL chưa ghi kho; ghi xuất liên kết sự cố; form sự cố lưu `dm_hoa_chat` id. |
| 2026-06-27 | **Kho hóa chất KSNK — FEFO + tách loại:** domain `cssd-kho-hoa-chat-fefo` / `cssd-hoa-chat-loai`; chặn xuất/điều chỉnh âm lô quá HSD; UI xuất sắp FEFO + gợi ý lô mặc định; filter tab Hóa chất tiệt trùng / Vật tư tiêu hao trên `/cssd-hoa-chat`. |
| 2026-06-27 | **CSSD Thiết bị reform (Slice A–C):** migration `20260627120000` — evolve `cssd_fact_bao_tri` (`loai_phieu`, `checklist_jsonb`, `su_co_id`); lookup loại máy bổ sung; UI `/cssd-thiet-bi` 3 tab (danh sách máy + PM cảnh báo, bảo dưỡng checklist, lịch sử mẻ theo máy). | migration `20260617160000` — gộp `qlcv_fact_cong_viec_hoat_dong` → `nhat_ky jsonb`; DROP `khoa_thuc_hien_id` trên fact + định kỳ; RPC `fn_qlcv_append_nhat_ky`; view `v_qlcv_cong_viec_full` bỏ cột khoa. |
| 2026-06-17 | **QLCV Phase 2:** `fn_qlcv_transition` RPC; RLS SELECT KSNK strict; `DeXuatApproveForm`; filter **Việc của tôi** — migration `20260617140000`. |
| 2026-06-17 | **QLCV KSNK-only reform:** migration `20260617120000` purge/backfill; domain `ksnk-boundary` + `nghiem-thu-gate`; `qlcv-action-guard` / roster KSNK; siết nghiệm thu; import bỏ `ma_khoa` — [`intake-ksnk-only-202606.md`](../modules/qlcv/intake-ksnk-only-202606.md). |
| 2026-06-17 | **Analytics reform:** SSOT `supervision-thresholds` + `supervision-metrics/`; tách `supervision-charts-*`; `mergeMasterGapRows`; xóa dead compliance v4 UI; redirect GSC nested thống kê → `/thong-ke/gsc?loai=` — [`analytics-reform-202606.md`](../modules/dashboard/analytics-reform-202606.md). |
| 2026-06-11 | **BK áp dụng + TGS:** `gstt_dm_bang_kiem.ap_dung_jsonb` (`20260612120000`), form MDM, `resolveBkApDungChoKhoa`, KPI bao phủ/xếp hạng/ma trận nghĩa vụ GSC + in BC — [`bang-kiem-ap-dung-tgs-intake-202606.md`](../modules/dashboard/bang-kiem-ap-dung-tgs-intake-202606.md). |
| 2026-06-11 | **Giám sát:** gỡ link QLCV khỏi ma trận/bảng loại trừ analytics (không đụng module QLCV). |
| 2026-06-11 | **Analytics Wave 3:** khóa lọc khoa UI (`getAnalyticsViewerScope`), banner «khoa của tôi»; fix layout chunk + mount guards. |
| 2026-06-11 | **Analytics Wave 1–2:** comparable gap (`vol_tgs∧vol_ksnk`), bảng loại trừ, TGS deployment, ma trận bao phủ BK, reorder báo cáo tổng hợp (NKBV sau process), print sync — [`analytics-wave12-intake-202606.md`](../modules/dashboard/analytics-wave12-intake-202606.md). |
| 2026-06-11 | **GSC canonical-36 scoring audit:** SSOT `gsc-canonical-36-scoring.ts`; sửa `cach_tinh_diem` BM.10.01 + BM.QĐ.19.03 → `TY_LE` (`20260611100000`); lịch sử GSC ưu tiên `tong_dat/tong_quan_sat` (`gsc-score-display`). |
| 2026-06-10 | **Go-live Phase 6:** `pilot-go-live-signoff-202606.md`, `auth-pilot-link-sop.md`, `pilot:go-live:gate`; BOM → in cycle QR (`usePrint`). |
| 2026-06-10 | **Cycle QR Phase 5:** `20260610100000` — `ma_cycle_qr` / `ma_qr_bo_vinh_vien`; resolve 3 cột; sinh cycle sau BOM; NKBV trace cycle QR. |
| 2026-06-10 | **CSSD Phase 4 (domain audit):** pilot checklist hóa chất/thiết bị; BRD vật tư intake; `CSSDSubNav` wired vào `CSSDPageShell`; E2E `/cssd-hoa-chat`, `/cssd-thiet-bi`. Ledger Q2 warning (Phase 3). |
| 2026-06-10 | **VST RPC fact-inline (Phase 2):** `20260610060000` — scan `gstt_fact_vst_sessions`/`gstt_fact_vst` trực tiếp; stype 1×/phiên; linked EXPLAIN 327ms→91ms. GSC fan-out probe `05-gsc-fanout-sim.sql`. |
| 2026-06-09 | **VST strategic RPC perf:** `20260609060000` + `20260609061000` — CTE `MATERIALIZED` filter; SSOT joins `mdm_dm_khoa_phong` / `sys_lookup_value`; linked EXPLAIN 418ms → 306ms. |
| 2026-06-07 | **QLCV schema text-only (`20260607100000`):** DROP `trang_thai_id`/`loai_cong_viec_id`/`cong_viec_cha_id`, trigger sync FK; view `trang_thai_mau_sac`; app optimistic lock `trang_thai`; IMPORT Excel (`qlcv-import.actions`); badge MDM `mau_sac`. |
| 2026-06-06 | **QLCV hardening (`20260606160000` + app):** modernize `fn_sync_overdue_tasks`; DROP orphan analytics RPC; ghi chú tiến độ tách checklist; badge/deep-link CC. **Tiếp:** board fetch phân trang, `QlcvGateStats`, MDM links, URL `?id=` cleanup, `mergeQlcvKanbanTasks`. |
| 2026-06-05 | **QLCV vertical slice:** `checklist` JSONB + `fn_qlcv_update_checklist` (`20260605140000`); scope list server (`qlcv-list-scope`); UI checklist; `getMyPendingDeXuat`; quyền `APPROVE`; precheck `trial:qlcv:precheck`; Command Center card. |
| 2026-07-01 | **Audit Wave 2:** `verifyAnalyticsModuleShell` cho `/thong-ke`; `canSeeCommandCenterNav` sidebar; `strategic-analytics-fetch` cache; `gsc-checklist-intervention` SSOT; DROP `rpc_get_compliance_dashboard_v4` + `rpc_reorder_tieu_chi_bang_kiem` (`20260701100000`); hub giám sát lọc quyền; `/thong-ke` layout tokens. Gap: [gap-register-20260701.md](../archive/reports/gap-register-20260701.md). |
| 2026-06-04 | **MDM governance bulk seed (`20260604150000`):** Sửa `fn_mdm_*_lookup_*` đọc `sys_lookup_value`; seed 22 cột `FK_TO_DM` trên bảng vật lý (`mdm_*`, `gstt_fact_*`, `cssd_fact_*`, `nkbv_fact_*`, `qlcv_fact_*`); deactivate registry legacy table đã DROP; auto-reject gợi ý VIEW/enum/FK chuyên biệt. |
| 2026-06-03 | **UX unification (Phase UX-A/B):** SSOT `bv103-design-tokens.ts`, `Bv103AnalyticsPageFrame`, [`layout-primitives.md`](../modules/giam-sat/layout-primitives.md); Command Center + Báo cáo tổng hợp bỏ `max-w-[1400px]`; RBAC/MDM governance/Generic DM header → `KsnkPageHeader`; `cssd-ui-chrome` extends layout chrome; gates `layout:typography-check`, `audit:legacy-rpc` (D-13 probe). |
| 2026-06-03 | **Remediation đóng chu kỳ:** benchmark [dashboard-rpc-benchmark-20260603.md](../archive/reports/dashboard-rpc-benchmark-20260603.md); CLI SQL runner `run-supabase-sql.mjs`; Supabase CLI **2.104** pin. |
| 2026-06-03 | **Remediation audit (app+DB):** CAP_PHAT ledger check (`cssd-asset-ledger.ts`) — **sau reform 2026-07-01: soft-warning** (xem changelog 2026-07-01); Digital BOM / checkpoint; auth server [`src/proxy.ts`](../../src/proxy.ts); RLS `cssd_fact_*` module-scoped `20260603160000`; báo cáo tổng hợp [`docs/modules/dashboard/bao-cao-tong-hop.md`](../modules/dashboard/bao-cao-tong-hop.md). **Đọc KPI:** RPC strategic (ADR) — không mở rộng `*_summary` khi chưa benchmark. |
| 2026-06-03 | **RBAC compat repair:** `20260603120000` + `20260603140000` tái tạo view alias `v_auth_user_permissions` → `v_sys_user_permissions`, rewrite `fn_sys_has_permission` / RPC còn tham chiếu tên cũ (lỗi «relation v_auth_user_permissions does not exist» khi tải lịch sử sau `20260602180000`). Probe: `scripts/sql/rbac-v-auth-compat-probe.sql`. |
| 2026-06-02 | **Loại bỏ nhật ký hệ thống (theo quyết định vận hành):** gỡ tab/UI/action `AuditTrail` khỏi `quan-tri-he-thong`; migration `20260602193500_drop_system_audit_log.sql` DROP `sys_audit_log`, `v_sys_audit_log_full`, `v_sys_audit_table_choices`, `fn_sys_audit_row`, `fn_sys_audit_attach`, `fn_sys_audit_log_purge` và trigger audit liên quan. |
| 2026-06-02 | **Squash migration v2:** Gộp baseline `20260530000000` + 25 incremental → **`20260602100000_init_pilot_baseline.sql`** (một file apply); chain cũ → `archive_legacy/post_baseline_20260530_20260602/`; sửa `seed.sql` bỏ cột `nhom_chuyen_de` (đã DROP ở `20260530130000`). Local: `npx supabase db reset --local`. Linked: repair theo runbook. |
| 2026-06-02 | **P0–P3 hygiene:** DROP `rel_*` RBAC alias (`20260602190000`); postcheck SQL module names; hub danh mục gộp một tab; `cssd-tram-fk-health-audit.sql` SSOT. |
| 2026-06-02 | **Module SSOT (DROP compat):** App codemod → `{module}_dm_*` / `{module}_fact_*`; migration `20260602180000` DROP toàn bộ view `dm_*`/`fact_*`, recreate lookup module + `v_gstt_*`/`v_qlcv_*` JOIN module; RPC/sync (`fn_sync_single_gsc_session`, `fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay`, `fn_assert_vst_gsc_not_locked`); guard `legacy:guard` cấm `.from('dm_*'|'fact_*')`. |
| 2026-06-02 | **View layer cleanup:** DROP orphan `v_*` read + flatten lookup middleware (`mdm_dm_*`/`gstt_dm_*` lookup → `dm_*` → `sys_lookup_value`); GSTT read JOIN `dm_*`; DROP `fact_*` CSSD compat; catalog [`database-view-catalog.md`](./database-view-catalog.md) — `20260602170000`. |
| 2026-06-02 | **View cleanup:** DROP alias đọc `v_dm_bang_kiem_full`, `v_dm_khoa_phong_full`, `v_dm_thiet_bi_full` (trùng `v_gstt_*` / `v_mdm_*` / `v_cssd_*`; tái sinh sau Step 2) — `20260602160000`. |
| 2026-06-02 | **CSSD quy trình P0–P3:** RPC `rpc_scan_workflow_station` gate CAP_PHAT (mẻ TK, merge SUB) + chặn quét TK (`20260602140000`); NKBV `quy_trinh_id`/`ma_cycle_qr_lien_quan` (`20260602150000`); app — tab URL sync, operator thật, Spaulding mẻ TK, SSI↔trace link; sửa waiting list CAP_PHAT ← TIET_KHUAN. |
| 2026-06-02 | **QLCV hardening:** `qlcv-list-scope` (đọc list/detail/paginated/đề xuất); RBAC `approve`/`delete`; Command Center `getQlcvQuaHanBrief` + `v_qlcv_cong_viec_qua_han`. |
| 2026-06-02 | **GSC P0–P3 unification:** View `v_gstt_giam_sat_chung_sessions_full` + cột `cach_tinh_diem`; backfill `cach_tinh_diem` NULL trên `gstt_dm_bang_kiem` (`20260602000000`). App — scoring preview/history display (`gsc-score-display`), routes Slice 5 + `GscRouteNav`, lọc lịch sử `loai_giam_sat`, import có `results_jsonb` + `resolveScoringSummary`, khóa `sys_module_locks` (GSC) trên form/save/delete, type SSOT `@/types` → `modules/giam-sat-chung/types`. |
| 2026-06-02 | **VST lean cleanup:** App — redirect `/giam-sat-vst/lich-su` → `?tab=history`, bỏ barrel `vst.actions` / `HistoryLoader`, xóa `importVSTData` (session-only, không UI), nối `markVSTSessionsSeen` khi in; analytics VST ẩn lọc bảng kiểm. DB — deprecate `rpc_get_vst_dashboard`, `rpc_get_vst_dashboard_v2`, `rpc_get_vst_moment_table_only` (`20260602120000`). |
| 2026-05-31 | **QLCV lean:** `checklist` jsonb + RPC `fn_qlcv_update_checklist`; spawn checklist từ mô tả mẫu; sync view `fact_cong_viec_dinh_ky` (`20260531130000`); app đọc/ghi `qlcv_fact_*`; UI Điều hành + Định kỳ. |
| 2026-05-30 | **Architecture review deliverables:** SSOT `docs/reference/architecture/` (overview, debt, roadmap, interaction matrix, unstaged slice plan); runbook [migration-squash-runbook.md](../reference/guides/migration-squash-runbook.md); seed pack `supabase/seeds/00-rbac.sql` + `01-pilot-nhan-su.sql`. |
| 2026-05-30 | **View alias Step 2:** App migrate sang `v_gstt_*`/`v_cssd_*`/`v_qlcv_*`/`v_sys_*`/`v_mdm_*`/`v_nkbv_*`; migration `20260530100000_drop_view_compat_aliases.sql` DROP 24 compat alias. |
| 2026-05-30 | **QLDCPT P0 slice:** `syncThanhPhanTuTemplate` tại DONG_GOI; `assertLedgerDuChoCapPhat` soft-warning CAP_PHAT; facade `requestReplenishFromReserveAction` (CSSD_WORKFLOW.edit). |
| 2026-05-30 | **UNIFIED_DOMAIN_SPEC v1.1:** Prefix physical tables; ghi nhận entities dropped (RCA ticket, EAV GSC, Phần 3–4). |
| 2026-05-30 | **Squash migration pilot:** 90 file `20260520*`–`20260529*` → archive `pilot_chain_20260520_20260529/`; SSOT apply: `20260530000000_init_pilot_baseline.sql` + `supabase/seed.sql`. Local: `supabase db reset --local`. |
| 2026-05-30 | **Dashboard hybrid reform:** Command Center thin shell (2 RPC strategic + staff lazy); analytics sâu chuyển tab **Thống kê** tại `giam-sat-vst` / `giam-sat-chung`; xóa legacy orchestrator (`useDashboardData`, bundle overview/gap). Actions: `vst-strategic-analytics.actions.ts`, `gsc-strategic-analytics.actions.ts`. |
| 2026-05-29 | **DB DROP Phần 3–4:** migration `20260529160000` — DROP `nguyen_nhan_cho_phep_jsonb`, `hanh_dong_khac_phuc_jsonb`, `phieu_phan_tich_jsonb`, VST `nguyen_nhan_loi_id`/`da_can_thiep_ngay`/`url_anh_bang_chung`; view `v_fact_giam_sat_chung_sessions_full` bỏ cột phieu. |
| 2026-05-29 | **App purge Phần 3–4:** xóa domain `giam-sat-phieu-phan-tich`, `giam-sat-rca-catalog`, `giam-sat-act-map`; allowlist actions; types/validation GSC+VST; không ghi `phieu_phan_tich_jsonb` / VST RCA fields từ app. |
| 2026-05-29 | **Dashboard + DB slim (bỏ Pareto RCA/ACT):** UI chỉ vùng IPAC + top vi phạm; migration `20260529100002` xóa JSONB part34 master/fact, RPC `rpc_get_compliance_dashboard_v4` gọn. |
| 2026-05-29 | **Gỡ Phần 3–4 khỏi form giám sát (GSC + VST):** không UI căn nguyên/ACT trên bảng kiểm; lưu `phieu_phan_tich_jsonb` rỗng; VST bỏ validate nguyên nhân + block can thiệp. Dashboard vẫn đọc dữ liệu cũ nếu có. |
| 2026-05-29 | **RCA + ACT chuẩn form:** 16 mã căn nguyên (3 nhóm SYS/HUM/CLI, hiển thị `101-SYS`), Phần 4 cố định 5 mức ACT; migration `20260529000001`; catalog `giam-sat-rca-catalog.ts`, `gsc-standard-part34.ts`. |
| 2026-05-29 | **Khôi phục biện pháp can thiệp đầy đủ (đầu mục ACT):** `20260528000012`–`000013` — nhiều dòng/bảng kiểm từ seed part34, headline ngắn + mã ACT; UI `GscSessionFollowUpPanel` multi-tick. Script: `restore-act-headlines.mjs`. |
| 2026-05-29 | **Part 3–4 slim + 1 ACT/bảng kiểm:** `20260528000011` — nguyên nhân nhãn ngắn (không `mo_ta` dài), `hanh_dong_khac_phuc_jsonb` 1 mã ACT/ngữ cảnh; SSOT `BANG_KIEM_CHUAN_4_PHAN.md` reform (`reform-bang-kiem-canonical.mjs`); UI `GscSessionFollowUpPanel` gọn. |
| 2026-05-29 | **Cutover bảng kiểm canonical 36:** `20260528000008` wipe fact GSC/VST + `DELETE gstt_dm_bang_kiem` (51→36) seed từ `docs/data/bang-kiem/canonical-36.md`; `000010` backfill ACT 4 mẫu thiếu seed. Generator: `scripts/generate-canonical-36-cutover.mjs`. |
| 2026-05-29 | **GSC Phần 3–4 đủ 32/51 mẫu từ doc SSOT** (`Bảng kiểm & cấu trúc dữ liệu.md`): `20260528000005` seed allowlist+hành động theo `lookup_code`/`action_code`; `20260528000006` dashboard v4 thêm `top_hanh_dong_act`. Parser: `scripts/parse-giamsat-markdown-forms.mjs`. |
| 2026-05-29 | **GSC đơn giản hóa Phần 3–4 (ghi nhận, không workflow):** DROP `gstt_fact_rca_ticket` / `gstt_dm_failure_reason`; nguyên nhân + ACT qua `sys_lookup_value` (`NGUYEN_NHAN_LOI`, `HANH_DONG_CAN_THIEP`); master `gstt_dm_bang_kiem.hanh_dong_khac_phuc_jsonb`, fact `gstt_fact_chung_sessions.phieu_phan_tich_jsonb`; view `v_fact_giam_sat_chung_sessions_full` + `loai_giam_sat` (`20260528000001`–`000004`). App: `GscSessionFollowUpPanel`, persist qua `saveGiamSatChung`. |
| 2026-05-26 (đêm-2) | **Phase B CSSD-ERP hardening** — vertical sang module CSSD theo pattern Smart DB: `20260526000011_cssd_fact_audit_and_rls_fill.sql` gắn audit trigger v2 (`fn_sys_audit_row`) cho 10 cssd_fact_* + vá 3 fact thiếu policy (cssd_fact_kho_chi_tiet, lifecycle_event, dieu_chuyen_thanh_phan) bằng pattern legacy `qual:true authenticated` (đồng nhất 7 fact khác, tránh phá khi app vẫn dùng admin client). `20260526000012_cssd_dm_bdc_chi_tiet_idx_fk.sql` thêm index `bo_dung_cu_id` trên `cssd_dm_bo_dung_cu_chi_tiet` (3960 rows): **`v_cssd_bo_dung_cu_summary` TOP 50: 472 ms → 7.3 ms (65×)**. Baseline + roadmap: `working/cssd-perf-baseline-20260526.md`. |
| 2026-05-26 (đêm) | **View `v_*` rename đồng bộ prefix module**: `20260526000010_rename_views_to_module_prefix.sql` đổi tên 24 view + 1 view `vw_*` → cluster `v_sys_*` (3), `v_mdm_*` (1), `v_cssd_*` (10), `v_gstt_*` (7), `v_qlcv_*` (2), `v_nkbv_*` (1). Strategy zero-downtime: `ALTER VIEW RENAME` + tạo compat alias view tên cũ trỏ về tên mới (security_invoker=true). App code chưa cần đụng — migrate dần theo Boy Scout. Mapping chi tiết: `working/view-rename-mapping-20260526.md`. PR sau sẽ DROP alias sau khi grep `src/` sạch tên cũ. |
| 2026-05-26 | **Probe DB thực tế + Slice plan cập nhật + Phase A đóng admin module**: xác nhận `auth_*` RBAC, `mdm_dm_khoi_khoa`, `mdm_dm_to_cong_tac`, `cssd_dm_loai_may`, `gstt_dm_tieu_chi_bang_kiem`, …, `qlcv_dm_*`, `nkbv_dm_*` đều là **VIEW** chứ không phải table. SSOT vật lý lookup duy nhất là `sys_lookup_value`. **Slice 8 "dứt điểm Double SSOT" thực ra đã ngầm hoàn thành** từ trước; xem [`archive/plans/admin-module-slice-plan.md`](../archive/plans/admin-module-slice-plan.md). Phát hành **9 migration mới** `20260526000001`–`000009`: actor coverage 12 bảng audit (000001), view phẳng `v_sys_audit_log_full` + 4 index (000002), flatten chuỗi audit + pg_cron retention 365 ngày (000003), RPC `fn_admin_module_stats` (000004), RLS policies bộ admin core 10 bảng additive (000005), rename policy chuẩn tên (000006), flatten RBAC compat view `dm_*` 2-tầng → 1-tầng trực tiếp `sys_*` (000007), RLS additive cho 6 master-data CSSD `thiết bị/hóa chất/loại DC/bộ DC/bộ DC chi tiết/bộ phân bổ` (000008), DROP 4 view `auth_dm_*` sau khi re-point `v_auth_user_permissions` đọc trực tiếp `sys_*` (000009). App code: `audit-log.actions.ts` + `mdm-governance.actions.ts` + `getRBACData` chuyển sang `createServerSupabaseUserClient()` để RLS kick in defense-in-depth (`syncPermissionRegistry`/`saveFullRBACMatrix`/`updateRolePermission` giữ admin client vì bootstrap logic). Benchmark thực tế: RPC stats 18.1ms, audit list 0.28ms, audit filter 0.16ms — xem `working/admin-module-perf-baseline-20260526.md`. |
| 2026-05-25 | **Prefix-by-context rename toàn DB (`20260525000001`–`000011`):** `sys_*` (audit, registry, suggestion, lookup, module_locks, RBAC 4 bảng `sys_roles`/`sys_permissions`/`sys_role_permissions`/`sys_user_roles`), `auth_*` (VIEW alias các bảng RBAC), `mdm_*` (`mdm_nhan_su`, `mdm_dm_khoa_phong` là TABLE; `mdm_dm_khoi_khoa`/`mdm_dm_to_cong_tac`/`mdm_dm_chuc_danh`/`mdm_dm_chuc_vu`/`mdm_dm_nghe_nghiep` là VIEW lọc từ `sys_lookup_value`), `cssd_*` (TABLE chính của thiết bị/hóa chất/loại dụng cụ/bộ DC; VIEW cho loại máy + trạm), `gstt_*` (`gstt_dm_bang_kiem` + `gstt_fact_*` là TABLE; tiêu chí/khu vực/hình thức/cách thức là VIEW), `qlcv_*` (4 fact là TABLE; 2 lookup là VIEW), `nkbv_*` (cdc_baseline + 5 fact là TABLE; loại/trạng thái_ca là VIEW). Mọi tên cũ giữ ở dạng view `security_invoker='true'`. **Smart trigger động** `fn_mdm_validate_lookup_integrity` (`000002`) tự gắn/gỡ trên bảng đích theo `sys_mdm_registry`. **VST/GSC data locking** + **audit-with-actor** cho 2 bảng phiên (`000003`). Persist mốc thời gian + nhân sự ở từng trạm CSSD (`000009`). |
| 2026-05-20 | **Squash chain (`20260520000000`–`000014`):** init baseline; dashboard pre-agg (`000002`); lock registry GSC (`000003`); covering indexes (`000004`); QLCV monthly RPC (`000005`–`000012`); `dm_lookup_value` + view compat (`000006`–`000008`); restore `dm_loai_dung_cu` (`000009`); strategic RPC VST/GSC (`000010`–`000011`); instrument ledger + RLS tighten (`000013`–`000014`). Archive: `supabase/migrations/archive_legacy/`. |
| 2026-05-15 | **QLCV:** `lib/qlcv-dinh-ky-schedule.ts` (preview ngày sinh khớp RPC) + Vitest; `getDashboardData` trả `dang_lam`; `QUAN_LY_CONG_VIEC_PLAN.md` v2.2 (§4.3–§4.4, §12–§15). |
| 2026-05-15 | **QLCV Track B — mã `trang_thai`:** backfill + CHECK mới trên `fact_cong_viec`; `fn_fact_cong_viec_spawn_dinh_ky_hom_nay` insert `MOI`; recreate `v_fact_cong_viec_full` / `v_cong_viec_qua_han` (`20260716005_qlcv_track_b_trang_thai_codes.sql`). |
| 2026-05-15 | **QLCV đánh giá tháng:** bảng **`fact_qlcv_danh_gia_thang`**, RPC **`fn_qlcv_tong_hop_thang`** (KPI phiếu gốc theo tháng), RLS đọc cho `authenticated` (`20260716004_qlcv_danh_gia_thang_rpc_rls.sql`). |
| 2026-07-15 | **QLCV:** bỏ cột `loai_pham_vi` trên `fact_cong_viec`, cập nhật `fn_fact_cong_viec_spawn_dinh_ky_hom_nay` + view liên quan; drop bảng `fact_cong_viec_file` (`20260715001_qlcv_drop_loai_pham_vi_spawn_fn_and_file.sql`). |
| 2026-05-13 | **QLCV nội bộ KSNK:** `fact_cong_viec` — backfill `MANG_LUOI`→`NOI_BO`, thêm `nguoi_giao_viec_id`, `dinh_ky_mau_id`, mở rộng `trang_thai` + `fact_cong_viec_hoat_dong`; bảng **`fact_cong_viec_dinh_ky`** + RPC **`fn_fact_cong_viec_spawn_dinh_ky_hom_nay()`** (`20260513207_qlcv_noi_bo_workflow_dinh_ky.sql`). |
| 2026-06-07 | **Kho hóa chất/vật tư KSNK:** `fact_kho_hoa_chat_giao_dich` (NHAP/XUAT/DIEU_CHINH có dấu) + tồn lô tính trực tiếp từ ledger; `dm_hoa_chat.nguong_ton_toi_thieu`; module **`KSNK_KHO_HOACHAT`**, trang **`/cssd-erp/kho-hoa-chat`** (`20260607002_fact_kho_hoa_chat_ksnk.sql`). |
| 2026-06-22 | **CSSD P2 hub consolidation:** BOM → `cssd_fact_quy_trinh.metadata.bom_lines`; gate `bom_kiem_dem_at`; audit → `metadata.ngoai_le`; DROP `cssd_fact_lifecycle_event`, `cssd_fact_quy_trinh_thanh_phan`, `cssd_fact_dieu_chuyen_thanh_phan`, `cssd_fact_kho_chi_tiet` (`20260622120000`). Doc: `docs/modules/cssd/data-model-lean.md`. |
| 2026-06-07 | **Phiếu bảo trì thiết bị CSSD:** bảng **`fact_bao_tri_thiet_bi`**; đồng bộ **`dm_thiet_bi`** (REPAIRING khi đang bảo trì, READY khi xong/hủy); cập nhật ngày bảo trì sau hoàn thành; chặn tạo mẻ TK / thêm bộ vào mẻ khi máy không READY (`20260607001_fact_bao_tri_thiet_bi.sql`). |
| 2026-06-06 | **CSSD workflow tái cấu trúc:** `fact_cssd_lifecycle_event`, `fact_quy_trinh_thanh_phan`, cột `fact_quy_trinh.is_dong_bang`, `quy_trinh_cha_id`, `ma_vai_tro_bo`; domino rollback sự cố + QC mẻ không đạt; merge gate cấp phát SUB; SSOT domain `cssd-state-engine` / `cssd-incident-policy` (`20260606001_cssd_workflow_lifecycle_asset.sql`). Verify: `npm run verify:cssd`. |
| 2026-05-25 | Chuẩn hóa `mdm_nhan_su.email`, unique partial khi đang hoạt động (`20260525001_mdm_nhan_su_email_normalize_unique.sql`); RBAC sync; trang **`/quan-tri-he-thong/tai-khoan-nhan-su`**; auth email/mật khẩu. Chi tiết: `operations-sop.md`. |
| 2026-05-05 | **NKBV MVP:** `giam_sat_nkbv_ca` + `dm_loai_nkbv` + `dm_trang_thai_nkbv_ca` (`20260522001_giam_sat_nkbv_mvp.sql`); module `giam-sat-nkbv`, `GIAM_SAT_NKBV`; Rules CDC / HIS: chưa. Pipeline: [`governance-pipeline.md`](./governance-pipeline.md). |
| 2026-05-22 | **Governance SSOT:** `LEAN_EXECUTION`, `READ_MINIMUM`, `SKILLS_CATALOG`, `GOVERNANCE_PIPELINE`; CSSD catalog read-only tại `/cssd-dung-cu`; `verify` = `verify:full`. |
| 2026-05-31 | **Doc thu gọn:** lớp wiki `entities.md` + `concepts.md`; bỏ `docs/specs/README`, doc module trùng; `handover-roadmap` → onboarding ngắn, lộ trình → `reference/architecture/roadmap-2026h2.md`. |
| 2026-05-31 | **QLCV lean UI:** gỡ tab Báo cáo/KPI tháng, việc con, cổng «chưa giao phụ trách», `xacNhanDaNhanCongViec`; tạo việc bắt buộc phụ trách. |
| 2026-05-04 | Khởi tạo mapping lần đầu theo schema CSSD V2 + fact giám sát + `cong_viec`. |
| 2026-05-31 | **Tái cấu trúc thư viện markdown:** `docs/core/`, `docs/modules/`, `docs/data/`, `docs/reference/`, `docs/archive/`; cổng [`docs/README.md`](../README.md); manifest `DOCS_MANIFEST.yaml`. |
| 2026-05-31 | **QLCV lean:** `checklist` jsonb + `20260531100000_qlcv_checklist_lean_workflow.sql`; auto `DANG_LAM` khi giao phụ trách; `insertQlcvTaskRow`; tắt roll-up/việc con UI; cache lookup FK. |
| 2026-05-31 | **Domain/governance cleanup:** Wire `assertMergeGateForCapPhat` + `validateStationAdvance` vào workflow scan; `classifyGscCompliance` → UI lịch sử GSC; di chuyển `cssd-asset-ledger.ts` → `workflow/application/`; rule `17-nkbv-spec-context`; dedupe rule `82` ↔ skill `smart-db-bv103`. |
| 2026-05-30 | **QLDCPT P0 Digital BOM Checklist & Ledger Bypass:** Giao diện kiểm đếm trạm `DONG_GOI` (`BomChecklistModal.tsx`), rule an toàn nhiệt (`cssd-packaging-rules.ts`), loại bỏ ledger bypass (`cssd-asset-ledger.ts`) chuyển sang soft-warning, ghi sự kiện `KIEM_DEM_BOM` và cảnh báo `CAP_PHAT_BO_THIEU_CAU_PHAN`. |
| 2026-05-31 | **Lean pass (docs/code/supabase):** Xóa `CSSDCatalogPage` (trùng `cssd-dung-cu/page`); gỡ export/action RBAC/QLCV/camera thừa; xóa `docs/specs/` rỗng, 102 migration pre-pilot trong `archive_legacy/` (giữ `pilot_chain_*`); sửa link manifest `scoring-consolidation` → wiki. |
| 2026-05-31 | **Lean pass (tiếp):** Xóa `saveDanhMuc`/`deleteDanhMuc`, `deleteNhanSu*` (UI dùng client soft-delete); widget verify dashboard thừa; unexport helpers GSC/VST/QLCV/RBAC; comment archive → `docs/data/bang-kiem/`. |
| 2026-05-31 | **Lean pass (3 slice):** CSSD redirect → `next.config.ts` (9 URL cũ); xóa 10 `page.tsx` redirect; `CSSD_ROUTES` canonical 7 path. QLCV: drop `qlcv_fact_danh_gia_thang` + `fn_qlcv_tong_hop_thang` (`20260531200000`). Archive: `pilot_chain` → `docs/archive/pilot_chain_20260520_20260529.tar.gz`. |
| 2026-06-02 | **Báo hỏng/mất dụng cụ chi tiết:** orchestrator `reportChiTietInstrumentIssueAction` (ghi chú + tách BOM + `fact_kho_dung_cu_giao_dich`); SSOT core `instrument-issue-core.ts`; catalog CSSD + MDM dùng chung luồng. |
| 2026-06-04 | **D-07 views:** live `gstt_fact_*_summary` VIEW thay bảng DROP (`20260604140000`) — RPC strategic không đổi contract. |
| 2026-06-04 | **QLCV TEXT+CHECK (D-QLCV-01):** cột `trang_thai`/`loai_cong_viec` + CHECK + trigger sync FK (`20260604120000`); app dual-write. |
| 2026-06-04 | **Typography gate:** codemod `text-[8px]`/`text-[9px]` → `text-[11px]`; `layout:typography-check` fail on drift. |
| 2026-07-01 | **CSSD sự cố dụng cụ thống nhất:** form `/cssd-su-co` theo preset (dropdown thành phần bộ, validate SL ≤ thực tế); nhóm INSTRUMENT không rollback quy trình; `su_co_id` trên `cssd_fact_kho_giao_dich` + RPC `rpc_cssd_apply_instrument_ledger`; catalog `/cssd-dung-cu` read-only (bỏ prompt Hỏng/Mất); lối tắt trạm Đóng gói → `IncidentReportModal`. |
| 2026-07-01 | **CSSD Đóng gói — bỏ BOM modal:** quét `DONG_GOI` trực tiếp + `rpc_cssd_assign_cycle_qr`; panel đối chiếu `v_cssd_bo_dung_cu_chi_tiet_realtime` + `DungCuSuCoModal` (Hỏng/Mất/Bổ sung); gate cấp phát soft-warning realtime (không hard `bom_kiem_dem_at`). Flag legacy: `BV103_FEATURE_BOM_CHECKLIST=1`. |
| 2026-06-30 | **Audit tổng thể:** DROP compat `dm_bang_kiem` (reprise) + RPC `rpc_gstt_dm_bang_kiem_max_numeric_suffix` (`20260701000000`); SQL audit scripts JSON single-query; layout drift 38→0. Evidence: [audit-evidence-pack-20260630.md](../archive/reports/audit-evidence-pack-20260630.md). |

