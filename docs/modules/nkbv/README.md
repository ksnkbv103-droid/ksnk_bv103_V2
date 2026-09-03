# NKBV

| Đọc khi | File |
|---------|------|
| Chiến lược sản phẩm (1 module, không tách 4 app) | [`adr-nkbv-unified-module-20260715.md`](../../reference/architecture/adr-nkbv-unified-module-20260715.md) · tóm tắt PO [`product-strategy-unified-20260715.md`](product-strategy-unified-20260715.md) |
| **ADR alignment SSOT ↔ app (W0–W2 + addendum v3)** | [`adr-nkbv-domain-ssot-alignment-20260804.md`](../../reference/architecture/adr-nkbv-domain-ssot-alignment-20260804.md) |
| **Roadmap implement W0–W2** | [`implementation-roadmap-ssot-v2-20260804.md`](implementation-roadmap-ssot-v2-20260804.md) |
| **Gap catalog harden W2** | [`gap-catalog-harden-w2-20260804.md`](gap-catalog-harden-w2-20260804.md) |
| **Quy trình xác định ca + luồng dữ liệu** (LIS→BA nếu chưa có mã; copy HIS/gõ; triệu chứng = BA; thứ tự CDC) | [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md) |
| **Từ điển yếu tố tiêu chí** (triệu chứng, XN, CĐHA, dụng cụ, loại trừ — căn cứ ID triển khai) | [`hai-criteria-element-dictionary-20260827.md`](hai-criteria-element-dictionary-20260827.md) |
| **Kế hoạch CSDL + bảng timeline** (lưới = BA; khoa mã; Foley/máy/CVC tích lưới → phiếu theo) | [`hai-database-plan-20260827.md`](hai-database-plan-20260827.md) |
| **Tổ chức lại CSDL NKBV** (đập demo, 6 ngăn, từng phần triển khai) | [`hai-database-rebuild-plan-20260827.md`](hai-database-rebuild-plan-20260827.md) |
| **Timeline BA + mẫu báo cáo chẩn đoán** (tận dụng lưới ngày; mẫu gửi khoa) | [`hai-timeline-and-diagnostic-report-20260827.md`](hai-timeline-and-diagnostic-report-20260827.md) |
| **Domain SSOT NHSN/CDC 2025 v3.3** (thuật toán + từ điển E; Phụ lục F trỏ file trên) | [`hai-surveillance-domain-ssot-20260827.md`](hai-surveillance-domain-ssot-20260827.md) |
| Domain SSOT v2.0 (lịch sử, 2026-08-04) | [`hai-surveillance-domain-ssot-20260804.md`](hai-surveillance-domain-ssot-20260804.md) |
| CDC / luồng xác minh **app pilot** | [`domain-specification.md`](domain-specification.md) |
| **Vai trò BA / Phiếu / Form** (Admission vs HAI vs checklist) | [`ba-phieu-form-roles.md`](ba-phieu-form-roles.md) |
| **BA 3 khối** (bảng chung → phân tích → tạo phiếu muộn + hàng đợi XN) | [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md) · [`ba-centric-timeline.md`](ba-centric-timeline.md) |
| Form lâm sàng **app pilot** | [`clinical-forms.md`](clinical-forms.md) v3.2 — hàng 0–9; L1/L2/L3 |
| **Phiếu tinh gọn / đủ CDC** (phân tích A0–A4) | [`investigation-forms/README.md`](investigation-forms/README.md) — methodology, trees, `*-2026`, gap P0 |
| Cổng vi sinh LIS | Copy bảng/Excel → XN; **nếu chưa có mã BA thì tạo BA từ LIS**, đã có thì không đè — `NkbvViSinhImportPortal` |
| Cổng hồ sơ bệnh án | Copy HIS / Excel / gõ tay — `NkbvBenhAnImportPortal` |
| Coverage audit P5 | [`clinical-forms-coverage-audit-20260610.md`](clinical-forms-coverage-audit-20260610.md) |
| UAT sign-off | [`pilot-clinical-checklist-20260603.md`](pilot-clinical-checklist-20260603.md) |
| Tổng hợp | [`../../wiki/entities.md`](../../wiki/entities.md#nkbv-hai) |
| Thuật toán gốc | [`../../data/nkbv/algorithms/`](../../data/nkbv/algorithms/) — runtime: `nkbv-rules-engine.ts` + `nkbv-shared-*.ts` |

**Phân lớp tài liệu:** SSOT thuật toán + Phụ lục E = v3.3. **Yếu tố tiêu chí** = [`hai-criteria-element-dictionary-20260827.md`](hai-criteria-element-dictionary-20260827.md). **CSDL / timeline** = [`hai-database-plan-20260827.md`](hai-database-plan-20260827.md). Quy trình ca = [`hai-identification-data-flow-20260827.md`](hai-identification-data-flow-20260827.md). Timeline UI + mẫu báo cáo = [`hai-timeline-and-diagnostic-report-20260827.md`](hai-timeline-and-diagnostic-report-20260827.md). `domain-specification` + `clinical-forms` = hợp đồng UI/state.

Rule: `17-nkbv-spec-context.mdc`
