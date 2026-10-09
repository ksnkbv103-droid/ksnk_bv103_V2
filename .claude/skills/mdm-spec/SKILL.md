---
name: mdm-spec
description: Sửa danh mục MDM: src/modules/quan-tri-he-thong/danh-muc.
---

# Danh mục & MDM — ngữ cảnh spec

Trước khi thêm/sửa CRUD, import, registry:

1. [`domain-specification.md`](../../../docs/core/domain-specification.md) — MDM
2. [`implementation-mapping.md`](../../../docs/core/implementation-mapping.md) § MDM
3. [`guides/json-import-export.md`](../../../docs/reference/guides/json-import-export.md) khi import JSON
4. Cùng rule folder: skill `master-data-placement`

**Không** thêm `dict_*` mới làm chuẩn; danh mục lõi qua **domain-registry** → `dm_*`.
