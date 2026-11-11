---
paths:
  - "src/modules/quan-tri-he-thong/**"
  - "src/lib/master-data/**"
---

# Danh mục & MDM — ngữ cảnh spec

Trước khi thêm/sửa CRUD, import, registry:

1. [`domain-specification.md`](../../docs/core/domain-specification.md) — MDM
2. [`implementation-mapping.md`](../../docs/core/implementation-mapping.md) § MDM
3. [`guides/json-import-export.md`](../../docs/reference/guides/json-import-export.md) khi import JSON

**Không** thêm `dict_*` mới làm chuẩn; danh mục lõi qua **domain-registry** → `dm_*`.

## Master Data Placement

- Danh mục lõi: khai qua **domain-registry** → bảng/view `{module}_dm_*` hoặc ghi lookup qua **`sys_lookup_value`** (category_type). **Không** thêm bảng `dict_*` mới; **không** dùng prefix legacy `dm_*` / `fact_*` (đã DROP, `legacy:guard`).
- **Master CSSD** (loại/bộ/BOM/thiết bị/hóa chất): TABLE `cssd_dm_*` — UI + action CRUD ở `cssd-erp/contexts/{instrument-catalog,inventory-chemical,maintenance}/admin` (AR-8d 2026-11-11); engine chung `src/lib/master-data/engine` (guard `imports:master-crud`).
- **Duyệt theo rủi ro (AR-5d):** hóa chất/thiết bị — thêm mới, ngừng/xóa, nồng độ, định mức cần quyền `approve` (`requireCssdSensitiveApprove`, pure: `src/lib/domain/cssd-sensitive-change.ts`); dụng cụ loại/bộ/BOM chỉ ADMIN ghi, còn lại qua đề nghị.
- **MDM tổ chức** (khoa, nhân sự, danh mục tổ chức): TABLE `mdm_*` — module `/to-chuc` (AR-8e); không nhầm với master CSSD.
- Danh mục sửa trong **module sở hữu** (AR-8g, PO 2026-11-11): Tổ chức / GSC / CSSD / NKBV; chỉ ADMIN ghi. Hub `/quan-tri-he-thong` chỉ còn Tài khoản · Phân quyền · Hệ thống. Đường dẫn: `danh-muc-admin-routes.ts`.
- Engine CRUD chung ở `src/lib/master-data/engine` (AR-8c); chỗ được import `master-crud-core` do guard `imports:master-crud` quy định.
- Before rebuilding a module, remove old module structure cleanly first.
- After rebuild/refactor, provide updated folder structure for verification.
- If master data code is found in the wrong module, move it to the correct location instead of duplicating.
- Ngôn ngữ / ranh giới: `docs/wiki/concepts.md#cssd-vs-mdm` · cổng `docs/modules/mdm/README.md`.
