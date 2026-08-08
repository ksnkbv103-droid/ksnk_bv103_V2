# NKBV

| Đọc khi | File |
|---------|------|
| Chiến lược sản phẩm (1 module, không tách 4 app) | [`adr-nkbv-unified-module-20260715.md`](../../reference/architecture/adr-nkbv-unified-module-20260715.md) · tóm tắt PO [`product-strategy-unified-20260715.md`](product-strategy-unified-20260715.md) |
| **ADR alignment SSOT v2 ↔ app (W0–W2)** | [`adr-nkbv-domain-ssot-alignment-20260804.md`](../../reference/architecture/adr-nkbv-domain-ssot-alignment-20260804.md) |
| **Roadmap implement W0–W2** | [`implementation-roadmap-ssot-v2-20260804.md`](implementation-roadmap-ssot-v2-20260804.md) |
| **Gap catalog harden W2** | [`gap-catalog-harden-w2-20260804.md`](gap-catalog-harden-w2-20260804.md) |
| Domain SSOT NHSN/CDC 2025 v2.0 (thuật toán — **không** thay app specs) | [`hai-surveillance-domain-ssot-20260804.md`](hai-surveillance-domain-ssot-20260804.md) |
| CDC / luồng xác minh **app pilot** | [`domain-specification.md`](domain-specification.md) |
| **Vai trò BA / Phiếu / Form** (Admission vs HAI vs checklist) | [`ba-phieu-form-roles.md`](ba-phieu-form-roles.md) |
| **BA 3 khối** (bảng chung → phân tích → tạo phiếu muộn + hàng đợi XN) | [`ba-multi-timeline-architecture.md`](ba-multi-timeline-architecture.md) · [`ba-centric-timeline.md`](ba-centric-timeline.md) |
| Form lâm sàng **app pilot** | [`clinical-forms.md`](clinical-forms.md) v3.2 — hàng 0–9; L1/L2/L3 |
| **Phiếu tinh gọn / đủ CDC** (phân tích A0–A4) | [`investigation-forms/README.md`](investigation-forms/README.md) — methodology, trees, `*-2026`, gap P0 |
| Cổng vi sinh LIS | Copy bảng / import Excel / tải mẫu — `NkbvViSinhImportPortal` + `nkbv-lis-adapter.ts` |
| Cổng hồ sơ bệnh án (HIS) | Tab **Hồ sơ Bệnh án** — copy/Excel ADT; chống trùng BA+BN — `NkbvBenhAnImportPortal` + `nkbv-benh-an-template.ts` |
| Coverage audit P5 | [`clinical-forms-coverage-audit-20260610.md`](clinical-forms-coverage-audit-20260610.md) |
| UAT sign-off | [`pilot-clinical-checklist-20260603.md`](pilot-clinical-checklist-20260603.md) |
| Tổng hợp | [`../../wiki/entities.md`](../../wiki/entities.md#nkbv-hai) |
| Thuật toán gốc | [`../../data/nkbv/algorithms/`](../../data/nkbv/algorithms/) — runtime: `nkbv-rules-engine.ts` + `nkbv-shared-*.ts` |

**Phân lớp tài liệu:** SSOT = domain NHSN; `domain-specification` + `clinical-forms` = hợp đồng UI/state BV103. W4–W6 (Location/SIR full, PedVAE/ENDO, AU) **tạm dừng** — xem ADR alignment.

Rule: `17-nkbv-spec-context.mdc`
