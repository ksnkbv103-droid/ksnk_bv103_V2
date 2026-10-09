# CSSD

> Bản đồ: [`../../ssot-map.md`](../../ssot-map.md).

| Đọc khi | File |
|---------|------|
| Domain nghiệp vụ | [`domain-overview.md`](domain-overview.md) |
| Workflow / QR | [`../../core/domain-specification.md`](../../core/domain-specification.md) §2.2 + [`../../wiki/entities.md`](../../wiki/entities.md#cssd) |
| Master → vận hành / mã QR | [`quan-ly-dung-cu-luong.md`](quan-ly-dung-cu-luong.md) |
| Phiếu mẻ, QC / nhả, thu hồi | [`18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md`](18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md) |
| Data model lean | [`domain-overview.md`](domain-overview.md) §9 |
| Phase 0 dụng cụ (D1–D10) | [`../../core/domain-decisions-cssd-instrument.md`](../../core/domain-decisions-cssd-instrument.md) |
| Mapping bảng | [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) § CSSD |
| Ranh giới MDM | [`../../wiki/concepts.md`](../../wiki/concepts.md#cssd-vs-mdm) |
| Layout / chrome | [`../../reference/architecture/layout-primitives.md`](../../reference/architecture/layout-primitives.md) |

Skill: `cssd-spec`

## URL canonical (pilot)

| Route | Mục đích |
|-------|----------|
| `/cssd-quy-trinh` | Chu trình 6 trạm. Tab: Chu trình (mặc định), Mẻ (`?tab=batch`), Truy vết (`?tab=trace`) |
| `/cssd-dung-cu` | Catalog dụng cụ (read-only). Đề nghị sửa danh mục: `?tab=DE_NGHI` |
| `/cssd-su-co` | Sự cố an toàn + biến động dụng cụ (Hỏng/Mất · Chuyển kho·bộ) |
| `/cssd-thiet-bi` | Bảo trì thiết bị |
| `/cssd-hoa-chat` | Kho hóa chất |
| `/cssd-erp/batch` | Mẻ tiệt khuẩn (deep link) |
| `/cssd-erp/report` | Báo cáo CSSD — SSOT analytics |
| Phụ lục in | `/bao-cao-tong-hop` mục `bc-cssd` |

## Verify

```bash
npm run verify:engineering
```
