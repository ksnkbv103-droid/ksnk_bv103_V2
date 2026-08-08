---
name: cssd-pilot
description: Invariant CSSD ERP pilot BV103 — mẻ/QR, tiệt khuẩn, CSSD↔MDM. Invoke manual @cssd-pilot khi sửa cssd-erp / quy trình CSSD.
---

# CSSD ERP pilot

## Invariant nghiệp vụ

- **Tiệt khuẩn:** theo nhiệt / phi nhiệt đúng loại dụng cụ — không shortcut trong Server Action.
- **Bộ vô khuẩn:** chỉ đạt khi **mọi** thành phần / mẻ liên quan đạt.
- **Catalog:** CSSD **read-only** danh mục tại `/cssd-dung-cu`; CRUD DM tại `quan-tri-he-thong/danh-muc`. Gate: `npm run imports:cssd-mdm`.
- **Ranh giới:** workflow CSSD (`cssd_*`) ≠ MDM master data — không coupling chéo module.
- **RLS / admin client:** không bypass verify permission; tránh mở rộng admin-client trước khi harden RLS.

## Đọc bắt buộc

1. [`read-minimum.md`](../../../docs/core/read-minimum.md) — dòng CSSD
2. [`domain-specification.md`](../../../docs/core/domain-specification.md) — §2.2 CSSD
3. [`modules/cssd/domain-overview.md`](../../../docs/modules/cssd/domain-overview.md)
4. [`implementation-mapping.md`](../../../docs/core/implementation-mapping.md) — § CSSD

## Rule & verify

- Rule glob: `12-cssd-erp-spec-context.mdc`, `20-master-data-placement.mdc`
- `npm run verify:cssd` và/hoặc `npm run verify:engineering` sau action/`cssd_*`
- Import catalog: `npm run imports:cssd-mdm` khi đụng DM CSSD↔MDM
