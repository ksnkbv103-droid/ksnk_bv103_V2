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
| MDM — Khoa phòng | `quan-tri-he-thong/danh-muc/` | `dm_khoa_phong`, `dm_khoi_khoa` | Spec ghi `khoi_id` → `sys_categories`; BV103 dùng `dm_khoi_khoa` (phase master data). |
| MDM — Nhân sự | `quan-tri-he-thong/nhan-su/` + `quan-tri-he-thong/tai-khoan-nhan-su/` | `mdm_nhan_su` (+ FK `dm_*` chức danh; `auth_user_id`) | Spec/`ho_so_nhan_vien` legacy → runtime Postgres: **`mdm_nhan_su`**; có trang gộp nhân viên và gán vai trò RBAC (`tai-khoan-nhan-su`). |
| Danh mục hub / registry | `src/lib/` + danh mục | `domain-registry` pattern, `mdm_field_registry` | Đọc [`AGENTS.md`](../../AGENTS.md) §2–3; không dùng hub `danh_muc_tuy_bien` mới. |

---

## CSSD — tái xử lý dụng cụ

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `InstrumentType` (Loại dụng cụ) | `cssd-erp` + `quan-tri-he-thong/danh-muc/dung-cu/` | `dm_loai_dung_cu` (`ma_loai`, `ten_loai`, …) | Cột chi tiết nghiệp vụ có thể khác mô hình `is_chiu_nhiet` trong spec — kiểm tra migration hiện tại trước khi đổi tên cột. |
| `InstrumentSet` (Bộ dụng cụ định nghĩa) | `quan-tri-he-thong/danh-muc/dung-cu/` | `dm_bo_dung_cu`, `dm_bo_dung_cu_chi_tiet` | Spec `dm_cau_truc_bo_dung_cu` → BV103 dùng **`dm_bo_dung_cu_chi_tiet`** (cấu trúc bộ). |
| `InstrumentInstance` (Bộ vật lý / QR) | `cssd-erp` | **`fact_quy_trinh`** (view **`quy_trinh`**) — `ma_qr_quy_trinh`, `bo_dung_cu_id`, `ma_trang_thai_hien_tai`, `ma_vai_tro_bo`, `quy_trinh_cha_id`, `is_dong_bang` | Vòng đời theo mã QR; tách mã SUB → MAIN. |
| `SterilizationBatch` (Mẻ hấp) | `cssd-erp` | **`fact_lo_tiet_khuan`** (view `lo_tiet_khuan`) | Liên kết `fact_quy_trinh.lo_tiet_khuan_id`. |
| `LifecycleAuditLog` | `cssd-erp` | **`fact_nhat_ky_quet`** + **`fact_cssd_lifecycle_event`** | Quét + dòng domino/QC (`20260606001_cssd_workflow_lifecycle_asset.sql`). |
| `ComponentSplit` / rẽ nhánh tiệt khuẩn | `cssd-erp` | **`registerSplitSubQrFromMainMaAction`**, batch actions, **`cssd-merge-gate`** | Persist mẻ: [`persist-me-tiet-khuan.ts`](../../src/modules/cssd-erp/helpers/persist-me-tiet-khuan.ts). |
| Runtime cấu phần (ledger) | `cssd-erp` | **`fact_quy_trinh_thanh_phan`** | Đối soát template bộ (`cssd-asset-ledger`). |
| Sự cố CSSD | `cssd-erp` | **`fact_su_co`** + **`fact_su_co_chi_tiet`**; **`cssd-incident-application`** | Domino theo **`cssd-incident-policy`**. |
| Phiếu bảo trì thiết bị / khóa máy | `cssd-erp` | **`fact_bao_tri_thiet_bi`**, `dm_thiet_bi.trang_thai` (`REPAIRING` ↔ `READY`) | UI **`/cssd-erp/equipment-maintenance`**; chặn mẻ TK khi máy không sẵn sàng (`assert-thiet-bi-cho-me-tiet-khuan`, `20260607001_fact_bao_tri_thiet_bi.sql`). |
| Kho hóa chất — vật tư KSNK (tồn theo lô) | `cssd-erp` | **`fact_kho_hoa_chat_giao_dich`** (tính tồn trực tiếp từ ledger giao dịch), cột `dm_hoa_chat.nguong_ton_toi_thieu` | UI **`/cssd-erp/kho-hoa-chat`**, quyền **`KSNK_KHO_HOACHAT`** (`20260607002_fact_kho_hoa_chat_ksnk.sql`). |

---

## Giám sát tuân thủ — VST & bảng kiểm

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `HandHygieneSession` | `giam-sat-vst` | **`giam_sat_vst_sessions`**, chi tiết **`giam_sat_vst`** | Phiên + dòng quan sát (cơ hội WHO, hành động). |
| `HandHygieneOpportunity` | `giam-sat-vst` | Cột / cấu trúc trong `giam_sat_vst` (WHO T1–T5) | — |
| `ChecklistTemplate` | `quan-tri-he-thong/bang-kiem/` | **`danh_muc_bang_kiem`**, **`tieu_chi_bang_kiem`** | Spec `dm_bang_kiem_template` — tên bảng legacy; đang migrate dần sang `dm_*` theo lộ trình MDM. |
| Giám sát chung (phiên + checklist động) | `giam-sat-chung` | **`giam_sat_chung_sessions`** (+ payload checklist trong DB theo migration) | Không có tên `AuditSession` riêng trong spec ERD; nghiệp vụ tương đương. |

---

## Công việc (Task)

| Spec term | Module | Bảng / thực thể thật | Ghi chú |
|-----------|--------|---------------------|---------|
| `TaskScope` INTERNAL / NETWORK | `quan-ly-cong-viec` | **`cong_viec.loai_cong_viec`** (`NOI_BO` ≈ nội bộ, `MANG_LUOI` ≈ mạng lưới) | Spec `fact_tasks.task_scope` — mapping khái niệm; bảng thật là **`cong_viec`**. |
| `Task` lifecycle | `quan-ly-cong-viec` | `cong_viec.trang_thai`, `tien_do`, … | Không dùng enum TODO/IN_PROGRESS của spec nguyên bản; đối chiếu `cong-viec-read.actions.ts`. |

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
| 2026-06-07 | **Kho hóa chất/vật tư KSNK:** `fact_kho_hoa_chat_giao_dich` (NHAP/XUAT/DIEU_CHINH có dấu) + tồn lô tính trực tiếp từ ledger; `dm_hoa_chat.nguong_ton_toi_thieu`; module **`KSNK_KHO_HOACHAT`**, trang **`/cssd-erp/kho-hoa-chat`** (`20260607002_fact_kho_hoa_chat_ksnk.sql`). |
| 2026-06-07 | **Phiếu bảo trì thiết bị CSSD:** bảng **`fact_bao_tri_thiet_bi`**; đồng bộ **`dm_thiet_bi`** (REPAIRING khi đang bảo trì, READY khi xong/hủy); cập nhật ngày bảo trì sau hoàn thành; chặn tạo mẻ TK / thêm bộ vào mẻ khi máy không READY (`20260607001_fact_bao_tri_thiet_bi.sql`). |
| 2026-06-06 | **CSSD workflow tái cấu trúc:** `fact_cssd_lifecycle_event`, `fact_quy_trinh_thanh_phan`, cột `fact_quy_trinh.is_dong_bang`, `quy_trinh_cha_id`, `ma_vai_tro_bo`; domino rollback sự cố + QC mẻ không đạt; merge gate cấp phát SUB; SSOT domain `cssd-state-engine` / `cssd-incident-policy` (`20260606001_cssd_workflow_lifecycle_asset.sql`). Checklist tay: [`CSSD_REFACTOR_VERIFY_CHECKLIST.md`](./working/CSSD_REFACTOR_VERIFY_CHECKLIST.md). |
| 2026-05-25 | Chuẩn hóa `mdm_nhan_su.email`, unique partial khi đang hoạt động (`20260525001_mdm_nhan_su_email_normalize_unique.sql`); đồng bộ vai trò KSNK + ma trận RBAC trong `rbac-registry-sync`; trang **`/quan-tri-he-thong/tai-khoan-nhan-su`**; luồng đăng nhập mã/email + quên mật khẩu + đổi mật khẩu. Chi tiết vận hành: `docs/specs/working/VANHANH_AUTH_RBAC_KSNK.md`. |
| 2026-05-05 | **NKBV MVP:** `giam_sat_nkbv_ca` + `dm_loai_nkbv` + `dm_trang_thai_nkbv_ca` (migration `20260522001_giam_sat_nkbv_mvp.sql`); module `giam-sat-nkbv`, `GIAM_SAT_NKBV`, seed vai trò; Rules CDC / HIS: chưa. Đồng thời: thay đổi migration theo **`GOVERNANCE_PIPELINE.md`** + cập nhật map như changelog. |
| 2026-05-04 | Khởi tạo mapping lần đầu theo schema CSSD V2 + fact giám sát + `cong_viec`. |
