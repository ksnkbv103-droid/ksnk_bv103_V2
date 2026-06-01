# CSSD

| Đọc khi | File |
|---------|------|
| Sửa workflow / QR | [`../../core/domain-specification.md`](../../core/domain-specification.md) § CSSD + [`../../wiki/entities.md`](../../wiki/entities.md#cssd) |
| Mapping bảng | [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) § CSSD |
| Reform QLDCPT | [`reform-plan.md`](reform-plan.md) |
| Ranh giới MDM | [`../../wiki/concepts.md`](../../wiki/concepts.md#cssd-vs-mdm) |

Rule: `12-cssd-erp-spec-context.mdc`

## URL canonical (pilot)

| Route | Mục đích |
|-------|----------|
| `/cssd-quy-trinh` | Workflow 6 trạm + tab mẻ/kho/truy vết |
| `/cssd-dung-cu` | Catalog dụng cụ (read-only) |
| `/cssd-su-co` | Báo cáo sự cố |
| `/cssd-thiet-bi` | Bảo trì thiết bị |
| `/cssd-hoa-chat` | Kho hóa chất |
| `/cssd-erp/batch` | Mẻ tiệt khuẩn (deep link) |
| `/cssd-erp/report` | Báo cáo tổng hợp |

Bookmark cũ (`/cssd-tiep-nhan`, `/cssd-erp/catalog`, …) → redirect trong `next.config.ts`.
