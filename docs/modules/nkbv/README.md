# NKBV

> **Một module** (`/giam-sat-nkbv`). Tách UX theo vai / hội chứng. Không tách 4 app; không gộp VST/GSC. ADR: [`adr-nkbv-unified-module-20260715.md`](../../reference/architecture/adr-nkbv-unified-module-20260715.md).

| Đọc khi | File |
|---------|------|
| Domain SSOT NHSN/CDC 2025 v3.3 | [`hai-surveillance-domain-ssot-20260827.md`](hai-surveillance-domain-ssot-20260827.md) |
| ADR alignment SSOT ↔ app | [`adr-nkbv-domain-ssot-alignment-20260804.md`](../../reference/architecture/adr-nkbv-domain-ssot-alignment-20260804.md) |
| Quy trình xác định ca + luồng dữ liệu | [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md) |
| Từ điển yếu tố tiêu chí | [`hai-criteria-element-dictionary-20260827.md`](hai-criteria-element-dictionary-20260827.md) |
| Timeline BA + mẫu báo cáo | [`hai-timeline-and-diagnostic-report-20260827.md`](hai-timeline-and-diagnostic-report-20260827.md) |
| Domain UI / state (app pilot) | [`domain-specification.md`](domain-specification.md) |
| BA 3 khối, vai trò phiếu, lưới CDC | [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md) |
| Form lâm sàng | [`clinical-forms.md`](clinical-forms.md) |
| Phiếu tinh gọn / đủ CDC | [`investigation-forms/README.md`](investigation-forms/README.md) |
| Tổng hợp | [`../../wiki/entities.md`](../../wiki/entities.md#nkbv-hai) |
| Thuật toán gốc (máy) | [`../../data/nkbv/algorithms/`](../../data/nkbv/algorithms/) — runtime: `nkbv-rules-engine.ts` |

**Phân lớp:** thuật toán + Phụ lục E = v3.3. UI/state = `domain-specification` + `clinical-forms`. Cổng LIS/HIS: `NkbvViSinhImportPortal` · `NkbvBenhAnImportPortal` (tạo BA từ LIS khi chưa có mã; không đè BA đã có).

Skill: `nkbv-spec`
