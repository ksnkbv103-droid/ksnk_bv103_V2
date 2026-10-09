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
- **Master CSSD** (loại/bộ/BOM/thiết bị/hóa chất): TABLE `cssd_dm_*` — UI CRUD chỉ dưới `quan-tri-he-thong/danh-muc/`.
- **MDM tổ chức** (khoa, nhân sự): TABLE `mdm_*` — cùng hub Quản trị; không nhầm với master CSSD.
- All master data modules must live under `src/modules/quan-tri-he-thong/danh-muc/` (và nhánh `nhan-su` / `bang-kiem` / `phan-quyen` tương ứng).
- Do not place master data **write** screens inside `cssd-erp` (catalog RO + banner deep-link về Quản trị là đúng).
- Before rebuilding a module, remove old module structure cleanly first.
- After rebuild/refactor, provide updated folder structure for verification.
- If master data code is found in the wrong module, move it to the correct location instead of duplicating.
- Ngôn ngữ / ranh giới: `docs/wiki/concepts.md#cssd-vs-mdm` · cổng `docs/modules/mdm/README.md`.
