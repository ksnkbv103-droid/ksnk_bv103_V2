# Bản đồ nguồn chuẩn — KSNK BV103

> **Một chủ đề → một bản đang dùng.** Cổng: [`README.md`](README.md). Khi sửa code: [`core/read-minimum.md`](core/read-minimum.md). Lịch sử mốc cũ nằm trong git log.

| Chủ đề | Đang dùng | Không mở khi sửa |
|--------|-----------|------------------|
| Nghiệp vụ chung | [`core/domain-specification.md`](core/domain-specification.md) | Wiki tổng hợp: [`wiki/entities.md`](wiki/entities.md) |
| Ánh xạ bảng / RPC | [`core/implementation-mapping.md`](core/implementation-mapping.md) | — |
| Việc còn mở | [`core/handover-roadmap.md`](core/handover-roadmap.md) §5 | — |
| CSSD nghiệp vụ | [`modules/cssd/domain-overview.md`](modules/cssd/domain-overview.md) + domain-spec §2.2 | Quyết định dụng cụ: [`core/domain-decisions-cssd-instrument.md`](core/domain-decisions-cssd-instrument.md) |
| CSSD phiếu mẻ / QC / thu hồi | [`modules/cssd/18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md`](modules/cssd/18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md) | — |
| CSSD cổng | [`modules/cssd/README.md`](modules/cssd/README.md) | — |
| NKBV thuật toán | [`modules/nkbv/hai-surveillance-domain-ssot-20260827.md`](modules/nkbv/hai-surveillance-domain-ssot-20260827.md) | — |
| NKBV UI / state | [`modules/nkbv/domain-specification.md`](modules/nkbv/domain-specification.md) + [`clinical-forms.md`](modules/nkbv/clinical-forms.md) | — |
| NKBV phiếu tinh gọn | [`modules/nkbv/investigation-forms/README.md`](modules/nkbv/investigation-forms/README.md) | — |
| Giám sát VST/GSC | [`modules/giam-sat/README.md`](modules/giam-sat/README.md) · [`bang-kiem-overview.md`](modules/giam-sat/bang-kiem-overview.md) | — |
| Bảng kiểm inventory / VST hub / phạm vi | [`12-…`](modules/giam-sat/12-BANG-KIEM-inventory-from-KSNK-final.md) · hub + khóa sổ trong [`README`](modules/giam-sat/README.md) · [`16-…`](modules/giam-sat/16-BANG-KIEM-PHAM-VI-KHOA-DOI-TUONG.md) | Seed máy: `data/bang-kiem/` |
| MDM / Quản trị | [`modules/mdm/README.md`](modules/mdm/README.md) | Code: `src/modules/quan-tri-he-thong/` |
| QLCV | [`modules/qlcv/19-QLCV-DOMAIN-SSOT.md`](modules/qlcv/19-QLCV-DOMAIN-SSOT.md) | — |
| Dashboard / KPI | [`modules/dashboard/metric-dictionary.md`](modules/dashboard/metric-dictionary.md) · [`bao-cao-tong-hop.md`](modules/dashboard/bao-cao-tong-hop.md) | — |
| Đào tạo | [`modules/dao-tao/domain-overview.md`](modules/dao-tao/domain-overview.md) | — |
| Layout / chrome | [`wiki/concepts.md`](wiki/concepts.md#layout-primitives) · [`reference/architecture/layout-primitives.md`](reference/architecture/layout-primitives.md) · [`page-chrome-contract`](reference/architecture/page-chrome-contract-20260731.md) | — |
| IA / tương tác | [`ux/principles.md`](ux/principles.md) | — |
| Lookup / enum | [`reference/architecture/lookup-vs-enum-guidance.md`](reference/architecture/lookup-vs-enum-guidance.md) | — |
| Agent code | [`../CLAUDE.md`](../CLAUDE.md) · [`core/skills-catalog.md`](core/skills-catalog.md) | Lệnh, skills, agents: `.claude/` |
