# Wiki index

> Catalog file. Không phải cửa sửa. Cửa: [`../../CLAUDE.md`](../../CLAUDE.md) → [`../ssot-map.md`](../ssot-map.md).
> Bảng «Core SSOT» và «Module (pointer)» tay — superseded bởi ssot-map (tránh hai lối vào). Danh sách dưới do `npm run wiki:index` sinh.

## Wiki

| File | Nội dung |
|------|----------|
| [`entities.md`](entities.md) | Tổng hợp module — không thay SSOT khi sửa |
| [`concepts.md`](concepts.md) | Prefix DB, CSSD↔MDM, layout |
| [`lint.md`](lint.md) | Health |
| [`log.md`](log.md) | Timeline |
| [`WIKI_SCHEMA.md`](WIKI_SCHEMA.md) | Ingest wiki |

<!-- AUTO_CATALOG_START -->

_Generated 2026-10-09 — `npm run wiki:index`_

### Core SSOT

- [`docs/core/adr-cssd-fact-write-rls.md`](../core/adr-cssd-fact-write-rls.md) — ADR: Write path cho `cssd_fact_quy_trinh` / `cssd_fact_lo_tiet_khuan`
- [`docs/core/cursor-operating-playbook.md`](../core/cursor-operating-playbook.md) — Cursor Operating Playbook (General Software)
- [`docs/core/database-view-catalog.md`](../core/database-view-catalog.md) — Database view catalog (BV103)
- [`docs/core/domain-decisions-cssd-instrument.md`](../core/domain-decisions-cssd-instrument.md) — Decision log — CSSD dụng cụ (Phase 0)
- [`docs/core/domain-specification.md`](../core/domain-specification.md) — ĐẶC TẢ NGHIỆP VỤ Y TẾ THỐNG NHẤT — KSNK BV103
- [`docs/core/engineering-guidelines.md`](../core/engineering-guidelines.md) — QUY CHUẨN KỸ THUẬT & UI/UX THỐNG NHẤT — KSNK BV103
- [`docs/core/governance-pipeline.md`](../core/governance-pipeline.md) — Governance pipeline — schema & ship
- [`docs/core/handover-roadmap.md`](../core/handover-roadmap.md) — Bàn giao & onboarding — KSNK BV103
- [`docs/core/implementation-mapping.md`](../core/implementation-mapping.md) — BV103 — Ánh xạ thuật ngữ spec ↔ module ↔ bảng / thực thể thật
- [`docs/core/lean-execution.md`](../core/lean-execution.md) — LEAN Execution — BV103
- [`docs/core/operations-sop.md`](../core/operations-sop.md) — CẨM NANG VẬN HÀNH, BẢO MẬT & DB THỐNG NHẤT — KSNK BV103
- [`docs/core/pilot-core-modules-go-live.md`](../core/pilot-core-modules-go-live.md) — Pilot gấp — Quản trị + Giám sát + QLCV
- [`docs/core/pilot-go-live-signoff-202606.md`](../core/pilot-go-live-signoff-202606.md) — Pilot BV103 — Go-live sign-off (Phase 6)
- [`docs/core/po-cursor-guide.md`](../core/po-cursor-guide.md) — PO — Dùng Cursor khi không rành code
- [`docs/core/po-uat-signoff-202607.md`](../core/po-uat-signoff-202607.md) — Hướng dẫn PO nghiệm thu tay §B — đợt 07/2026
- [`docs/core/read-minimum.md`](../core/read-minimum.md) — Đọc tối thiểu theo loại thay đổi
- [`docs/core/skills-catalog.md`](../core/skills-catalog.md) — Skills catalog — BV103

### Modules

- [`docs/modules/cssd/18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md`](../modules/cssd/18-CSSD-PHIEU-ME-TIET-KHUAN-SSOT.md) — 18 — CSSD · Phiếu mẻ tiệt khuẩn (trạm `TIET_KHUAN`) · SSOT
- [`docs/modules/cssd/README.md`](../modules/cssd/README.md) — CSSD
- [`docs/modules/cssd/domain-overview.md`](../modules/cssd/domain-overview.md) — Domain overview — Quy trình xử lý dụng cụ (CSSD)
- [`docs/modules/cssd/quan-ly-dung-cu-luong.md`](../modules/cssd/quan-ly-dung-cu-luong.md) — Luồng quản lý dụng cụ CSSD (MDM → vận hành)
- [`docs/modules/dao-tao/domain-overview.md`](../modules/dao-tao/domain-overview.md) — Domain overview — Đào tạo / Thi KSNK
- [`docs/modules/dashboard/README.md`](../modules/dashboard/README.md) — Dashboard & Analytics
- [`docs/modules/dashboard/bao-cao-tong-hop.md`](../modules/dashboard/bao-cao-tong-hop.md) — Báo cáo tổng hợp KSNK (`/bao-cao-tong-hop`)
- [`docs/modules/dashboard/metric-dictionary.md`](../modules/dashboard/metric-dictionary.md) — Metric Dictionary — Giám sát & Dashboard KSNK
- [`docs/modules/giam-sat/12-BANG-KIEM-inventory-from-KSNK-final.md`](../modules/giam-sat/12-BANG-KIEM-inventory-from-KSNK-final.md) — Inventory bảng kiểm / phiếu quan sát — seed digital giám sát (filtered)
- [`docs/modules/giam-sat/16-BANG-KIEM-PHAM-VI-KHOA-DOI-TUONG.md`](../modules/giam-sat/16-BANG-KIEM-PHAM-VI-KHOA-DOI-TUONG.md) — 16 — Phạm vi khoa & đối tượng giám sát (bảng kiểm IN-SCOPE)
- [`docs/modules/giam-sat/README.md`](../modules/giam-sat/README.md) — Giám sát (VST / GSC)
- [`docs/modules/giam-sat/bang-kiem-overview.md`](../modules/giam-sat/bang-kiem-overview.md) — Bảng kiểm GSC/VST — tóm tắt
- [`docs/modules/giam-sat/bang-kiem-seed/README.md`](../modules/giam-sat/bang-kiem-seed/README.md) — bang-kiem-seed — nguồn seed giám sát (DRAFT docs)
- [`docs/modules/mdm/README.md`](../modules/mdm/README.md) — MDM & quản trị
- [`docs/modules/nkbv/README.md`](../modules/nkbv/README.md) — NKBV
- [`docs/modules/nkbv/ba-multi-timeline-architecture.md`](../modules/nkbv/ba-multi-timeline-architecture.md) — BA — Kiến trúc 3 khối (bảng chung → phân tích → tạo phiếu muộn)
- [`docs/modules/nkbv/clinical-forms.md`](../modules/nkbv/clinical-forms.md) — ĐẶC TẢ THIẾT KẾ CÁC BIỂU MẪU NHẬP LIỆU LÂM SÀNG NKBV (CDC/NHSN)
- [`docs/modules/nkbv/domain-specification.md`](../modules/nkbv/domain-specification.md) — ĐẶC TẢ NGHIỆP VỤ GIÁM SÁT NHIỄM KHUẨN BỆNH VIỆN (NKBV) — CDC/NHSN STANDARD
- [`docs/modules/nkbv/hai-criteria-element-dictionary-20260827.md`](../modules/nkbv/hai-criteria-element-dictionary-20260827.md) — Từ điển yếu tố tiêu chí chẩn đoán HAI (BV103)
- [`docs/modules/nkbv/hai-database-plan-20260827.md`](../archive/module-history/nkbv/hai-database-plan-20260827.md) — Kế hoạch dữ liệu NKBV — khớp timeline trên màn hình
- [`docs/modules/nkbv/hai-identification-data-flow-20260827.md`](../modules/nkbv/hai-identification-data-flow-20260827.md) — Quy trình xác định ca HAI và luồng dữ liệu BV103
- [`docs/modules/nkbv/hai-surveillance-domain-ssot-20260827.md`](../modules/nkbv/hai-surveillance-domain-ssot-20260827.md) — Domain SSOT v3.3 — Giám sát nhiễm khuẩn bệnh viện (NKBV / HAI)
- [`docs/modules/nkbv/hai-timeline-and-diagnostic-report-20260827.md`](../modules/nkbv/hai-timeline-and-diagnostic-report-20260827.md) — Timeline bệnh án và mẫu báo cáo chẩn đoán HAI
- [`docs/modules/nkbv/investigation-forms/00-lean-cdc-methodology.md`](../modules/nkbv/investigation-forms/00-lean-cdc-methodology.md) — Methodology — Phiếu NKBV tinh gọn, đủ chuẩn CDC
- [`docs/modules/nkbv/investigation-forms/01-shared-spine.md`](../modules/nkbv/investigation-forms/01-shared-spine.md) — Spine chung hàng 0–9 — Shared vs Delta
- [`docs/modules/nkbv/investigation-forms/02-clinical-symptom-catalog.md`](../modules/nkbv/investigation-forms/02-clinical-symptom-catalog.md) — Danh mục triệu chứng lâm sàng NKBV (SSOT)
- [`docs/modules/nkbv/investigation-forms/README.md`](../modules/nkbv/investigation-forms/README.md) — Investigation forms — Phiếu NKBV tinh gọn / đủ CDC
- [`docs/modules/nkbv/investigation-forms/trees/BSI.md`](../modules/nkbv/investigation-forms/trees/BSI.md) — Cây quyết định + phân lớp — BSI / CLABSI / MBI-LCBI
- [`docs/modules/nkbv/investigation-forms/trees/PNEU.md`](../modules/nkbv/investigation-forms/trees/PNEU.md) — Cây quyết định + phân lớp — PNEU / VAP / Non-VAP
- [`docs/modules/nkbv/investigation-forms/trees/SSI.md`](../modules/nkbv/investigation-forms/trees/SSI.md) — Cây quyết định + phân lớp — SSI
- [`docs/modules/nkbv/investigation-forms/trees/UTI.md`](../modules/nkbv/investigation-forms/trees/UTI.md) — Cây quyết định + phân lớp — UTI / CAUTI / ABUTI
- [`docs/modules/nkbv/investigation-forms/trees/VAE.md`](../modules/nkbv/investigation-forms/trees/VAE.md) — Cây quyết định + phân lớp — VAE (VAC → IVAC → PVAP)
- [`docs/modules/qlcv/19-QLCV-DOMAIN-SSOT.md`](../modules/qlcv/19-QLCV-DOMAIN-SSOT.md) — 19 — QLCV · Quản lý công việc khoa KSNK · SSOT

### Reference

- [`docs/reference/architecture/adr-nkbv-domain-ssot-alignment-20260804.md`](../reference/architecture/adr-nkbv-domain-ssot-alignment-20260804.md) — ADR: Alignment Domain SSOT v2.0 ↔ module NKBV (2026-08-04)
- [`docs/reference/architecture/adr-nkbv-unified-module-20260715.md`](../reference/architecture/adr-nkbv-unified-module-20260715.md) — ADR: NKBV thống nhất — không tách 4 app theo hội chứng (2026-07-15)
- [`docs/reference/architecture/interaction-matrix.md`](../reference/architecture/interaction-matrix.md) — MA TRẬN TƯƠNG TÁC MODULE — BV103
- [`docs/reference/architecture/layout-primitives.md`](../reference/architecture/layout-primitives.md) — Layout primitives — KSNK BV103
- [`docs/reference/architecture/lookup-vs-enum-guidance.md`](../reference/architecture/lookup-vs-enum-guidance.md) — Hướng dẫn: danh mục nhỏ — bảng / lookup / gắn cứng
- [`docs/reference/architecture/page-chrome-contract-20260731.md`](../reference/architecture/page-chrome-contract-20260731.md) — Page Chrome Contract — BV103 (2026-07-31)
- [`docs/reference/architecture/system-overview.md`](../archive/plans/architecture/system-overview.md) — HỆ THỐNG KIỂM SOÁT NHIỄM KHUẨN (KSNK) — BỆNH VIỆN 103
- [`docs/reference/guides/architecture-one-pager.md`](../archive/plans/guides/architecture-one-pager.md) — Kiến trúc KSNK BV103 — One-pager
- [`docs/reference/guides/auth-pilot-link-sop.md`](../reference/guides/auth-pilot-link-sop.md) — SOP — Link Auth ↔ `mdm_nhan_su` (Phase 6.2)
- [`docs/reference/guides/bv103-visual-language.md`](../reference/guides/bv103-visual-language.md) — BV103 Visual Language (Phase 0 SSOT)
- [`docs/reference/guides/demo-governance-gates.md`](../archive/plans/guides/demo-governance-gates.md) — Demo governance gates — runbook terminal (~2–3 phút)
- [`docs/reference/guides/demo-script-skeptics-10min.md`](../archive/plans/guides/demo-script-skeptics-10min.md) — Demo script 10 phút — đối thoại với skeptic
- [`docs/reference/guides/incident-backup-playbook.md`](../reference/guides/incident-backup-playbook.md) — Playbook sự cố & backup/restore — KSNK BV103
- [`docs/reference/guides/json-import-export.md`](../reference/guides/json-import-export.md) — Cẩm nang Kiến trúc Hybrid JSONB: Import / Export & Mở rộng Danh mục
- [`docs/reference/guides/migration-squash-runbook.md`](../reference/guides/migration-squash-runbook.md) — Migration Squash Runbook — BV103 Pilot Baseline
- [`docs/reference/guides/ops-go-live.md`](../reference/guides/ops-go-live.md) — Ops go-live — runbook tay (Phase 3)

### UX

- [`docs/ux/principles.md`](../ux/principles.md) — BV103 UX principles — medical professional minimalism

### Other

- [`docs/README.md`](../README.md) — Cổng tài liệu — KSNK BV103
- [`docs/ssot-map.md`](../ssot-map.md) — Bản đồ nguồn chuẩn — KSNK BV103

<!-- AUTO_CATALOG_END -->
