# CSSD

| Đọc khi | File |
|---------|------|
| **Domain nghiệp vụ (PO / tổng hợp)** | [`domain-overview.md`](domain-overview.md) |
| Sửa workflow / QR | [`../../core/domain-specification.md`](../../core/domain-specification.md) §2.2 + [`../../wiki/entities.md`](../../wiki/entities.md#cssd) |
| Master → vận hành / mã QR | [`quan-ly-dung-cu-luong.md`](quan-ly-dung-cu-luong.md) |
| Mapping bảng | [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) § CSSD |
| Reform QLDCPT | [`reform-plan.md`](reform-plan.md) |
| Ranh giới MDM | [`../../wiki/concepts.md`](../../wiki/concepts.md#cssd-vs-mdm) |
| UI thống nhất body (B+3 S1) | [`../../reference/architecture/ui-consistency-program-20260802.md`](../../reference/architecture/ui-consistency-program-20260802.md) § S1 |

Rule: `12-cssd-erp-spec-context.mdc`

## URL canonical (pilot)

| Route | Mục đích |
|-------|----------|
| `/cssd-quy-trinh` | Workflow 6 trạm + tab mẻ/kho/truy vết (`?tab=batch\|kho\|trace`) |
| Pilot QA | [`pilot-test-checklist.md`](pilot-test-checklist.md) |
| `/cssd-dung-cu` | Catalog dụng cụ (read-only) |
| `/cssd-su-co` | Báo cáo sự cố |
| `/cssd-thiet-bi` | Bảo trì thiết bị |
| `/cssd-hoa-chat` | Kho hóa chất |
| `/cssd-erp/batch` | Mẻ tiệt khuẩn (deep link) |
| `/cssd-erp/report` | Báo cáo tổng hợp |

## Pilot checklist

| Slice | File |
|-------|------|
| Quy trình 6 trạm (P3) | [`pilot-test-checklist.md`](pilot-test-checklist.md) |
| Hóa chất & vật tư (P4) | [`pilot-checklist-hoa-chat-202606.md`](pilot-checklist-hoa-chat-202606.md) |
| Thiết bị & bảo trì (P4) | [`pilot-checklist-thiet-bi-202606.md`](pilot-checklist-thiet-bi-202606.md) |
| Cycle QR (P5) | [`pilot-checklist-cycle-qr-202606.md`](pilot-checklist-cycle-qr-202606.md) |
| Sự cố | [`pilot-checklist-su-co-202606.md`](pilot-checklist-su-co-202606.md) |
| BRD vật tư phi-hóa-chất | [`brd-vat-tu-intake-202606.md`](brd-vat-tu-intake-202606.md) |

Bookmark cũ (`/cssd-tiep-nhan`, `/cssd-erp/catalog`, …) → redirect trong `next.config.ts`.
