---
paths:
  - "src/modules/cssd-*/**"
  - "src/app/cssd-*/**"
  - "src/lib/cssd-*"
---

**Nguồn domain (ưu tiên):** CDC → WHO → BYT/Cục Quân y → QT/QĐ chính thức BV103 → `docs/modules/cssd/domain-overview.md` + `domain-decisions-cssd-instrument.md` + mapping.
Chỉ lấp domain đã có; HLD/out-of-scope không mở station mới. Soft-warn thiếu BOM (Q2) giữ trừ khi PO đổi.

# CSSD ERP — ngữ cảnh spec

Trước khi chốt thiết kế / sửa lớn server action hoặc schema CSSD:

1. [`domain-specification.md`](../../docs/core/domain-specification.md) — luồng CSSD.
2. [`implementation-mapping.md`](../../docs/core/implementation-mapping.md) — bảng/cột thật.
3. [`read-minimum.md`](../../docs/core/read-minimum.md).
4. CSSD **read-only** catalog tại `/cssd-dung-cu`; CRUD DM tại `quan-tri-he-thong/danh-muc`. Gate: `npm run imports:cssd-mdm`.

**Luật nghiệp vụ:** tiệt khuẩn theo nhiệt/phi nhiệt; bộ chỉ đạt vô khuẩn khi **mọi** thành phần/mẻ liên quan đạt — không shortcut trong action.

## CSSD ERP pilot

## Invariant nghiệp vụ

- **Tiệt khuẩn:** theo nhiệt / phi nhiệt đúng loại dụng cụ — không shortcut trong Server Action.
- **Bộ vô khuẩn:** chỉ đạt khi **mọi** thành phần / mẻ liên quan đạt.
- **Catalog:** CSSD **read-only** danh mục tại `/cssd-dung-cu`; CRUD DM tại `quan-tri-he-thong/danh-muc`. Gate: `npm run imports:cssd-mdm`.
- **Ranh giới:** workflow CSSD (`cssd_*`) ≠ MDM master data — không coupling chéo module.
- **RLS / admin client:** không bypass verify permission; tránh mở rộng admin-client trước khi harden RLS.

## Đọc bắt buộc

1. [`read-minimum.md`](../../docs/core/read-minimum.md) — dòng CSSD
2. [`domain-specification.md`](../../docs/core/domain-specification.md) — §2.2 CSSD
3. [`modules/cssd/domain-overview.md`](../../docs/modules/cssd/domain-overview.md)
4. [`implementation-mapping.md`](../../docs/core/implementation-mapping.md) — § CSSD

## Rule & verify

- `npm run verify:cssd` và/hoặc `npm run verify:engineering` sau action/`cssd_*`
- Import catalog: `npm run imports:cssd-mdm` khi đụng DM CSSD↔MDM
