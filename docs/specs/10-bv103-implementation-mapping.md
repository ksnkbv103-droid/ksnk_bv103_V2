# BV103 — Ánh xạ thuật ngữ spec ↔ module ↔ bảng / thực thể thật

> Bản này nối **từ điển tiếng Anh trong spec** ([`01-domain-checklist-ubiquitous-language.md`](./working/01-domain-checklist-ubiquitous-language.md), [`07-physical-erd-specification.md`](./working/07-physical-erd-specification.md)) với **mã nguồn và schema đang chạy** trong repo KSNK 103. Khi lệch tên bảng, **Postgres + `AGENTS.md` mục 3–4** là chuẩn. Đọc tối thiểu theo loại thay đổi: [`READ_MINIMUM_BY_CHANGE.md`](./READ_MINIMUM_BY_CHANGE.md) + [`README.md`](./README.md) mục *Ý đồ phát triển*.

## Quy ước

| Cột | Ý nghĩa |
|-----|--------|
| **Spec term** | Tên khái niệm / pseudo-English trong tài liệu tổng hợp |
| **Module (thư mục)** | `src/modules/<kebab>/` |
| **Bảng / thực thể thật** | `public.*` trong migration / Supabase |
| **Ghi chú** | Khác biệt quan trọng so với spec |

---

## MDM & quản trị

| Spec / phân hệ (tài liệu) | Module BV103 | Bảng / nguồn thật | Ghi chú |
|---------------------------|----------------|------------------|---------|
| MDM — Khoa phòng | `quan-tri-he-thong/danh-muc/` | `dm_khoa_phong`, `dm_khoi_khoa`; view đọc **`v_dm_khoa_phong_full`** | `khoi_id` → `dm_khoi_khoa.id`; tra DB dùng view (có `ten_khoi`, `ma_khoi`). |
| MDM — Nhân sự | `quan-tri-he-thong/nhan-su/` + `quan-tri-he-thong/tai-khoan-nhan-su/` | `mdm_nhan_su` (+ FK `dm_*` chức danh; `auth_user_id`) | Spec/`ho_so_nhan_vien` legacy → runtime Postgres: **`mdm_nhan_su`**; có trang gộp nhân viên và gán vai trò RBAC (`tai-khoan-nhan-su`). |
| Danh mục hub / registry | `src/lib/` + danh mục | `domain-registry` pattern, `mdm_field_registry` | Đọc [`AGENTS.md`](../../AGENTS.md) §2–3; không dùng hub `danh_muc_tuy_bien` mới. |

---

## CSSD — tái xử lý dụng cụ

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `InstrumentType` (Loại dụng cụ) | `cssd-erp` + `quan-tri-he-thong/danh-muc/dung-cu/` | `dm_loai_dung_cu` (`ma_loai`, `ten_loai`, …) | Cột chi tiết nghiệp vụ có thể khác mô hình `is_chiu_nhiet` trong spec — kiểm tra migration hiện tại trước khi đổi tên cột. |
| `InstrumentSet` (Bộ dụng cụ định nghĩa) | `quan-tri-he-thong/danh-muc/dung-cu/` | `dm_bo_dung_cu`, `dm_bo_dung_cu_chi_tiet` | Spec `dm_cau_truc_bo_dung_cu` → BV103 dùng **`dm_bo_dung_cu_chi_tiet`** (cấu trúc bộ). |
| `InstrumentInstance` (Bộ vật lý / QR) | `/cssd-quy-trinh` (+ `src/lib/cssd-routes.ts`) | **`fact_quy_trinh`** — `tram_hien_tai_id` → **`dm_tram_cssd`**; view **`v_fact_quy_trinh_full`** alias `ma_trang_thai_hien_tai` | Migration `20260716014`; ghi qua `buildQuyTrinhTramPatch`. |
| Module thành phần (menu) | `src/lib/cssd-component-modules.ts` | — | Route: quy-trinh, dung-cu, su-co, thiet-bi, hoa-chat; entrypoint `contexts/*/entrypoint`. |
| `SterilizationBatch` (Mẻ hấp) | `cssd-erp` | **`fact_lo_tiet_khuan`** (view `lo_tiet_khuan`) | Liên kết `fact_quy_trinh.lo_tiet_khuan_id`. Chuỗi mẻ: nạp bộ (DONG_GOI) → `tk_chot_nap_at` (bắt đầu TK, khóa nạp) → `tk_mo_form_qc_at` (kết thúc chu trình, mở form QC) → `ket_qua_test` + `tk_qc_json` (`20260515002_fact_lo_tiet_khuan_tk_workflow.sql`). |
| `LifecycleAuditLog` | `cssd-erp` | **`fact_nhat_ky_quet`** + **`fact_cssd_lifecycle_event`** | Quét + dòng domino/QC (`20260606001_cssd_workflow_lifecycle_asset.sql`). |
| `ComponentSplit` / rẽ nhánh tiệt khuẩn | `cssd-erp` | **`registerSplitSubQrFromMainMaAction`**, batch actions, **`cssd-merge-gate`** | Persist mẻ: [`persist-me-tiet-khuan.ts`](../../src/modules/cssd-erp/helpers/persist-me-tiet-khuan.ts). |
| Runtime cấu phần (ledger) | `cssd-erp` | **`fact_quy_trinh_thanh_phan`** | Đối soát template bộ (`cssd-asset-ledger`). |
| Sự cố CSSD | **`cssd-su-co`** (UI `/cssd-erp/su-co`) | **`fact_su_co`** + **`fact_su_co_chi_tiet`**; `su-co-report.application` | Domino theo **`cssd-incident-policy`**; quyền **`BAO_SU_CO`**. |
| Phiếu bảo trì thiết bị / khóa máy | `cssd-erp` | **`fact_bao_tri_thiet_bi`**, `dm_thiet_bi.trang_thai` (`REPAIRING` ↔ `READY`) | UI **`/cssd-erp/equipment-maintenance`**; chặn mẻ TK khi máy không sẵn sàng (`assert-thiet-bi-cho-me-tiet-khuan`, `20260607001_fact_bao_tri_thiet_bi.sql`). |
| Kho hóa chất — vật tư KSNK (tồn theo lô) | `cssd-erp` | **`fact_kho_hoa_chat_giao_dich`** (tính tồn trực tiếp từ ledger giao dịch), cột `dm_hoa_chat.nguong_ton_toi_thieu` | UI **`/cssd-erp/kho-hoa-chat`**, quyền **`KSNK_KHO_HOACHAT`** (`20260607002_fact_kho_hoa_chat_ksnk.sql`). |

---

## Giám sát tuân thủ — VST & bảng kiểm

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `HandHygieneSession` | `giam-sat-vst` | **`fact_giam_sat_vst_sessions`**, chi tiết **`fact_giam_sat_vst`**; view **`v_fact_giam_sat_vst_sessions_full`**, **`v_fact_giam_sat_vst_full`** | Phiên: FK `khoa_id`, `khu_vuc_id`, `hinh_thuc_id`, `cach_thuc_id`. Dòng quan sát: thêm **`khu_vuc_id`**, **`nghe_nghiep_id`** (giữ `khu_vuc`/`nghe_nghiep`/`vi_tri` text legacy). Backfill: `20260716009_vst_legacy_data_integrity.sql`; báo cáo: `scripts/sql/vst-data-integrity-report.sql`. |
| `HandHygieneOpportunity` | `giam-sat-vst` | Cột / cấu trúc trong `giam_sat_vst` (WHO T1–T5) | — |
| `ChecklistTemplate` | `quan-tri-he-thong/bang-kiem/` | **`danh_muc_bang_kiem`**, **`tieu_chi_bang_kiem`** | Spec `dm_bang_kiem_template` — tên bảng legacy; đang migrate dần sang `dm_*` theo lộ trình MDM. |
| Giám sát chung (phiên + checklist động) | `giam-sat-chung` | **`fact_giam_sat_chung_sessions`** (+ `fact_giam_sat_chung_results`); view **`v_fact_giam_sat_chung_sessions_full`** | FK: `bang_kiem_id`→`dm_bang_kiem`, `criterion_id`→`dm_tieu_chi_bang_kiem` (`20260716008_database_fk_governance.sql`); `loai_bang_kiem` giữ mã cho RPC. |

---

## Công việc (Task)

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `TaskScope` nội bộ Khoa | `quan-ly-cong-viec` | **Phạm vi cố định nội bộ KSNK** (không còn cột `loai_pham_vi` trên `fact_cong_viec`; đã drop `20260715001_qlcv_drop_loai_pham_vi_spawn_fn_and_file.sql`) | Trước đó: backfill `MANG_LUOI`→`NOI_BO` (`20260513207_qlcv_noi_bo_workflow_dinh_ky.sql`). |
| Ba cổng (phê đề xuất / nhận việc / nghiệm thu xong) | `quan-ly-cong-viec` | **`fact_cong_viec.trang_thai`** (Track B CHECK): `MOI`, `DANG_LAM`, `CHO_DUYET`, `HOAN_THANH`, `TU_CHOI`, `QUA_HAN`, `DA_HUY` — cổng 1: `MOI` + `is_active=false`; cổng 2: `MOI` + `is_active` + `nguoi_phu_trach_id`; cổng 3: `CHO_DUYET` hoặc `DANG_LAM` + %≥100. | Timeline **`fact_cong_viec_hoat_dong`** mở rộng loại: `XAC_NHAN_NHAN`, `DUYET_HOAN_THANH`, `TU_CHOI_HOAN_THANH`, `GIA_HAN`. Migration backfill: `20260716005_qlcv_track_b_trang_thai_codes.sql`. |
| Người giao (RACI) | `quan-ly-cong-viec` | **`fact_cong_viec.nguoi_giao_viec_id`** → `mdm_nhan_su` | Ghi khi phê duyệt đề xuất / tạo việc trực tiếp. |
| Việc định kỳ (mẫu → instance) | `quan-ly-cong-viec` | **`public.fact_cong_viec_dinh_ky`**; instance có **`fact_cong_viec.dinh_ky_mau_id`** | RPC idempotent: **`public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay()`** (`20260513207_qlcv_noi_bo_workflow_dinh_ky.sql`). |
| `Task` lifecycle (legacy naming trong spec) | `quan-ly-cong-viec` | `fact_cong_viec` (view list **`v_fact_cong_viec_full`** khi schema v2.1) | Không dùng enum TODO/IN_PROGRESS của spec nguyên bản; đối chiếu actions trong `quan-ly-cong-viec/actions/`. |
| KPI / đánh giá tháng (Track A) | `quan-ly-cong-viec` | **`fact_qlcv_danh_gia_thang`**, RPC **`fn_qlcv_tong_hop_thang`**, `lib/qlcv-monthly-score.ts` | Chỉ phiếu gốc (`cong_viec_cha_id` null); công thức điểm §6 plan; migration `20260716004_qlcv_danh_gia_thang_rpc_rls.sql`. |

---

## Giám sát NKBV — ca bệnh (MVP nhập tay)

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `HAI` / ca NKBV (ghi nhận BV103) | `giam-sat-nkbv` | **`giam_sat_nkbv_ca`**, DM **`dm_loai_nkbv`**, **`dm_trang_thai_nkbv_ca`** | MVP: không Rules CDC / không HIS — route **`/giam-sat-nkbv`**, quyền **`GIAM_SAT_NKBV`**. |
| Loại NKBV / HAI | `giam-sat-nkbv` + hub danh mục | `dm_loai_nkbv` | Registry hub **`LOAI_NKBV`**. |
| Trạng thái phiếu NKBV | `giam-sat-nkbv` + hub | `dm_trang_thai_nkbv_ca` | Registry hub **`TRANG_THAI_NKBV_CA`**. |

## Phân hệ trong spec **chưa** hoặc **rất ít** có module tương ứng riêng

| Phân hệ (spec §04 / journeys) | Trạng thái BV103 | Ghi chú |
|------------------------------|------------------|---------|
| HAI / NKBV **Rules CDC** + tích hợp HIS/LIS | Lộ trình **Giai đoạn 3** [`AGENTS.md`](../../AGENTS.md) | **Chưa** — ngoài phạm vi MVP; bảng `giam_sat_nkbv_ca` thiết kế để sau này map sự kiện tự động. |
| Laundry, Waste độc lập, Environmental + HIS trigger | Chủ yếu **mô tả nghiệp vụ** trong [`03-journeys-and-flows-catalog.md`](./working/03-journeys-and-flows-catalog.md) | Triển khai sau khi có BRD + permission registry. |
| REST `/api/v1/proxy/...` | **Không** — Next.js **Server Actions** + Supabase | Chi tiết [`08-api-integration-strategy.md`](./working/08-api-integration-strategy.md); payload vẫn nên thiết kế để sau này map FHIR. |

---

## Cách dùng cho Agent

1. Mở [`01-domain-checklist-ubiquitous-language.md`](./working/01-domain-checklist-ubiquitous-language.md) để hiểu **nghĩa nghiệp vụ**.  
2. Tra bảng trên trước khi tạo migration mới — tránh nhân đôi bảng “spec-only”.  
3. **Migration / FK mới / bảng mới / đổi thực thể SSOT:** tuân [`GOVERNANCE_PIPELINE.md`](./GOVERNANCE_PIPELINE.md) đầy đủ (B1–B6, review SQL, không tự shortcut). Sau khi chốt schema: **sửa các bảng mapping trong file này** nếu tên bảng/cột nghiệp vụ thay đổi, và **thêm một dòng vào changelog** § dưới (ngày, mô tả thực thể/FK đổi, tham chiếu migration nếu cần).  
4. Nếu chỉ chỉnh cột không đổi **ý nghĩa** thực thể trong bảng map (rename thuần technical đã neo trong một migration): vẫn nên một dòng changelog ngắn để đời sau tra cứu.

### Changelog

| Ngày | Thay đổi |
|------|----------|
| 2026-05-15 | **QLCV:** `lib/qlcv-dinh-ky-schedule.ts` (preview ngày sinh khớp RPC) + Vitest; `getDashboardData` trả `dang_lam`; `QUAN_LY_CONG_VIEC_PLAN.md` v2.2 (§4.3–§4.4, §12–§15). |
| 2026-05-15 | **QLCV Track B — mã `trang_thai`:** backfill + CHECK mới trên `fact_cong_viec`; `fn_fact_cong_viec_spawn_dinh_ky_hom_nay` insert `MOI`; recreate `v_fact_cong_viec_full` / `v_cong_viec_qua_han` (`20260716005_qlcv_track_b_trang_thai_codes.sql`). |
| 2026-05-15 | **QLCV đánh giá tháng:** bảng **`fact_qlcv_danh_gia_thang`**, RPC **`fn_qlcv_tong_hop_thang`** (KPI phiếu gốc theo tháng), RLS đọc cho `authenticated` (`20260716004_qlcv_danh_gia_thang_rpc_rls.sql`). |
| 2026-07-15 | **QLCV:** bỏ cột `loai_pham_vi` trên `fact_cong_viec`, cập nhật `fn_fact_cong_viec_spawn_dinh_ky_hom_nay` + view liên quan; drop bảng `fact_cong_viec_file` (`20260715001_qlcv_drop_loai_pham_vi_spawn_fn_and_file.sql`). |
| 2026-05-13 | **QLCV nội bộ KSNK:** `fact_cong_viec` — backfill `MANG_LUOI`→`NOI_BO`, thêm `nguoi_giao_viec_id`, `dinh_ky_mau_id`, mở rộng `trang_thai` + `fact_cong_viec_hoat_dong`; bảng **`fact_cong_viec_dinh_ky`** + RPC **`fn_fact_cong_viec_spawn_dinh_ky_hom_nay()`** (`20260513207_qlcv_noi_bo_workflow_dinh_ky.sql`). |
| 2026-06-07 | **Kho hóa chất/vật tư KSNK:** `fact_kho_hoa_chat_giao_dich` (NHAP/XUAT/DIEU_CHINH có dấu) + tồn lô tính trực tiếp từ ledger; `dm_hoa_chat.nguong_ton_toi_thieu`; module **`KSNK_KHO_HOACHAT`**, trang **`/cssd-erp/kho-hoa-chat`** (`20260607002_fact_kho_hoa_chat_ksnk.sql`). |
| 2026-06-07 | **Phiếu bảo trì thiết bị CSSD:** bảng **`fact_bao_tri_thiet_bi`**; đồng bộ **`dm_thiet_bi`** (REPAIRING khi đang bảo trì, READY khi xong/hủy); cập nhật ngày bảo trì sau hoàn thành; chặn tạo mẻ TK / thêm bộ vào mẻ khi máy không READY (`20260607001_fact_bao_tri_thiet_bi.sql`). |
| 2026-06-06 | **CSSD workflow tái cấu trúc:** `fact_cssd_lifecycle_event`, `fact_quy_trinh_thanh_phan`, cột `fact_quy_trinh.is_dong_bang`, `quy_trinh_cha_id`, `ma_vai_tro_bo`; domino rollback sự cố + QC mẻ không đạt; merge gate cấp phát SUB; SSOT domain `cssd-state-engine` / `cssd-incident-policy` (`20260606001_cssd_workflow_lifecycle_asset.sql`). Checklist tay: [`CSSD_REFACTOR_VERIFY_CHECKLIST.md`](./working/CSSD_REFACTOR_VERIFY_CHECKLIST.md). |
| 2026-05-25 | Chuẩn hóa `mdm_nhan_su.email`, unique partial khi đang hoạt động (`20260525001_mdm_nhan_su_email_normalize_unique.sql`); đồng bộ vai trò KSNK + ma trận RBAC trong `rbac-registry-sync`; trang **`/quan-tri-he-thong/tai-khoan-nhan-su`**; luồng đăng nhập mã/email + quên mật khẩu + đổi mật khẩu. Chi tiết vận hành: `docs/specs/working/VANHANH_AUTH_RBAC_KSNK.md`. |
| 2026-05-05 | **NKBV MVP:** `giam_sat_nkbv_ca` + `dm_loai_nkbv` + `dm_trang_thai_nkbv_ca` (migration `20260522001_giam_sat_nkbv_mvp.sql`); module `giam-sat-nkbv`, `GIAM_SAT_NKBV`, seed vai trò; Rules CDC / HIS: chưa. Đồng thời: thay đổi migration theo **`GOVERNANCE_PIPELINE.md`** + cập nhật map như changelog. |
| 2026-05-04 | Khởi tạo mapping lần đầu theo schema CSSD V2 + fact giám sát + `cong_viec`. |
