# Wiki index

> **Đọc trước:** [`entities.md`](entities.md) · [`concepts.md`](concepts.md) · Bản đồ SSOT: [`../ssot-map.md`](../ssot-map.md) · Schema: [`WIKI_SCHEMA.md`](WIKI_SCHEMA.md)

## Wiki (gộp)

| File | Nội dung |
|------|----------|
| [`entities.md`](entities.md) | CSSD, VST/GSC, NKBV, MDM, QLCV |
| [`concepts.md`](concepts.md) | Prefix DB, CSSD↔MDM, layout, GSC scoring, BOM |
| [`lint.md`](lint.md) | Health + contradictions |
| [`log.md`](log.md) | Timeline |

## Core SSOT

| File | Vai trò |
|------|---------|
| [`../core/read-minimum.md`](../core/read-minimum.md) | Đọc theo diff |
| [`../core/domain-specification.md`](../core/domain-specification.md) | Nghiệp vụ |
| [`../core/implementation-mapping.md`](../core/implementation-mapping.md) | Bảng/RPC |
| [`../core/lean-execution.md`](../core/lean-execution.md) | Verify, PR |
| [`../core/operations-sop.md`](../core/operations-sop.md) | Auth, RLS |
| [`../core/governance-pipeline.md`](../core/governance-pipeline.md) | Migration ship |
| [`../core/handover-roadmap.md`](../core/handover-roadmap.md) | Onboarding + lộ trình rà soát §5 |
| [`../core/skills-catalog.md`](../core/skills-catalog.md) | Mục lục Cursor (skill, rule, agent, lệnh) |

## Module (pointer)

| Module | Deep doc | Wiki |
|--------|----------|------|
| CSSD | [`domain-overview.md`](../modules/cssd/domain-overview.md) | [entities#cssd](entities.md#cssd) |
| Giám sát | [`bang-kiem-overview.md`](../modules/giam-sat/bang-kiem-overview.md) | [entities#gsc](entities.md#giám-sát-vst--gsc) |
| NKBV | [`hai-surveillance-domain-ssot-20260827.md`](../modules/nkbv/hai-surveillance-domain-ssot-20260827.md) | [entities#nkbv](entities.md#nkbv-hai) |
| QLCV | [`19-QLCV-DOMAIN-SSOT.md`](../modules/qlcv/19-QLCV-DOMAIN-SSOT.md) | [entities#qlcv](entities.md#qlcv) |

## Reference

[`../reference/architecture/system-overview.md`](../reference/architecture/system-overview.md) · [`interaction-matrix.md`](../reference/architecture/interaction-matrix.md) · việc mở: [`../core/handover-roadmap.md`](../core/handover-roadmap.md) §5

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
- [`docs/modules/cssd/data-model-lean.md`](../modules/cssd/data-model-lean.md) — CSSD — Data model lean (P2 hub)
- [`docs/modules/cssd/domain-overview.md`](../modules/cssd/domain-overview.md) — Domain overview — Quy trình xử lý dụng cụ (CSSD)
- [`docs/modules/cssd/me-s2-batch-qc-release.md`](../modules/cssd/me-s2-batch-qc-release.md) — ME-S2 — Phiếu mẻ: máy, chương trình, QC, nhả
- [`docs/modules/cssd/me-s3-batch-recall-trace.md`](../modules/cssd/me-s3-batch-recall-trace.md) — ME-S3 — Mẻ không đạt, thu hồi BI+, truy vết, phiếu in
- [`docs/modules/cssd/quan-ly-dung-cu-luong.md`](../modules/cssd/quan-ly-dung-cu-luong.md) — Luồng quản lý dụng cụ CSSD (MDM → vận hành)
- [`docs/modules/dao-tao/README.md`](../modules/dao-tao/README.md) — Đào tạo / Thi trắc nghiệm KSNK
- [`docs/modules/dao-tao/domain-overview.md`](../modules/dao-tao/domain-overview.md) — Domain overview — Đào tạo / Thi KSNK
- [`docs/modules/dashboard/README.md`](../modules/dashboard/README.md) — Dashboard & Analytics
- [`docs/modules/dashboard/bao-cao-tong-hop.md`](../modules/dashboard/bao-cao-tong-hop.md) — Báo cáo tổng hợp KSNK (`/bao-cao-tong-hop`)
- [`docs/modules/dashboard/metric-dictionary.md`](../modules/dashboard/metric-dictionary.md) — Metric Dictionary — Giám sát & Dashboard KSNK
- [`docs/modules/giam-sat/12-BANG-KIEM-inventory-from-KSNK-final.md`](../modules/giam-sat/12-BANG-KIEM-inventory-from-KSNK-final.md) — Inventory bảng kiểm / phiếu quan sát — seed digital giám sát (filtered)
- [`docs/modules/giam-sat/13-VE-SINH-TAY-hub.md`](../modules/giam-sat/13-VE-SINH-TAY-hub.md) — Hub Vệ sinh tay — 3 mẫu · 3 chỉ số
- [`docs/modules/giam-sat/16-BANG-KIEM-PHAM-VI-KHOA-DOI-TUONG.md`](../modules/giam-sat/16-BANG-KIEM-PHAM-VI-KHOA-DOI-TUONG.md) — 16 — Phạm vi khoa & đối tượng giám sát (bảng kiểm IN-SCOPE)
- [`docs/modules/giam-sat/README.md`](../modules/giam-sat/README.md) — Giám sát (VST / GSC)
- [`docs/modules/giam-sat/bang-kiem-overview.md`](../modules/giam-sat/bang-kiem-overview.md) — Bảng kiểm GSC/VST — tóm tắt
- [`docs/modules/giam-sat/bang-kiem-seed/01-excluded-index.md`](../modules/giam-sat/bang-kiem-seed/01-excluded-index.md) — 01 — Excluded index (OUT of seed giám sát)
- [`docs/modules/giam-sat/bang-kiem-seed/02-chuyen-de-map.md`](../modules/giam-sat/bang-kiem-seed/02-chuyen-de-map.md) — 02 — Map BM → chuyên đề
- [`docs/modules/giam-sat/bang-kiem-seed/03-gap-vs-canonical36.md`](../modules/giam-sat/bang-kiem-seed/03-gap-vs-canonical36.md) — 03 — Gap vs canonical-36 (short BM.xx vs KSNK.QT/QĐ.xx.BM.xx)
- [`docs/modules/giam-sat/bang-kiem-seed/README.md`](../modules/giam-sat/bang-kiem-seed/README.md) — bang-kiem-seed — nguồn seed giám sát (DRAFT docs)
- [`docs/modules/giam-sat/module-lock.md`](../modules/giam-sat/module-lock.md) — Khóa module GSC / VST (`sys_module_locks`)
- [`docs/modules/mdm/README.md`](../modules/mdm/README.md) — MDM & quản trị
- [`docs/modules/nkbv/README.md`](../modules/nkbv/README.md) — NKBV
- [`docs/modules/nkbv/ba-cdc-grid-timeline.md`](../modules/nkbv/ba-cdc-grid-timeline.md) — Bệnh án — Timeline lưới CDC (tham chiếu)
- [`docs/modules/nkbv/ba-centric-timeline.md`](../modules/nkbv/ba-centric-timeline.md) — Bệnh án trung tâm — 3 khối (CDC order)
- [`docs/modules/nkbv/ba-multi-timeline-architecture.md`](../modules/nkbv/ba-multi-timeline-architecture.md) — BA — Kiến trúc 3 khối (bảng chung → phân tích → tạo phiếu muộn)
- [`docs/modules/nkbv/ba-phieu-form-roles.md`](../modules/nkbv/ba-phieu-form-roles.md) — Vai trò BA / Phiếu / Form mẫu (NKBV)
- [`docs/modules/nkbv/clinical-forms.md`](../modules/nkbv/clinical-forms.md) — ĐẶC TẢ THIẾT KẾ CÁC BIỂU MẪU NHẬP LIỆU LÂM SÀNG NKBV (CDC/NHSN)
- [`docs/modules/nkbv/domain-specification.md`](../modules/nkbv/domain-specification.md) — ĐẶC TẢ NGHIỆP VỤ GIÁM SÁT NHIỄM KHUẨN BỆNH VIỆN (NKBV) — CDC/NHSN STANDARD
- [`docs/modules/nkbv/hai-criteria-element-dictionary-20260827.md`](../modules/nkbv/hai-criteria-element-dictionary-20260827.md) — Từ điển yếu tố tiêu chí chẩn đoán HAI (BV103)
- [`docs/modules/nkbv/hai-database-plan-20260827.md`](../modules/nkbv/hai-database-plan-20260827.md) — Kế hoạch dữ liệu NKBV — khớp timeline trên màn hình
- [`docs/modules/nkbv/hai-identification-data-flow-20260827.md`](../modules/nkbv/hai-identification-data-flow-20260827.md) — Quy trình xác định ca HAI và luồng dữ liệu BV103
- [`docs/modules/nkbv/hai-surveillance-domain-ssot-20260827.md`](../modules/nkbv/hai-surveillance-domain-ssot-20260827.md) — Domain SSOT v3.3 — Giám sát nhiễm khuẩn bệnh viện (NKBV / HAI)
- [`docs/modules/nkbv/hai-timeline-and-diagnostic-report-20260827.md`](../modules/nkbv/hai-timeline-and-diagnostic-report-20260827.md) — Timeline bệnh án và mẫu báo cáo chẩn đoán HAI
- [`docs/modules/nkbv/investigation-forms/00-lean-cdc-methodology.md`](../modules/nkbv/investigation-forms/00-lean-cdc-methodology.md) — Methodology — Phiếu NKBV tinh gọn, đủ chuẩn CDC
- [`docs/modules/nkbv/investigation-forms/01-shared-spine.md`](../modules/nkbv/investigation-forms/01-shared-spine.md) — Spine chung hàng 0–9 — Shared vs Delta
- [`docs/modules/nkbv/investigation-forms/02-clinical-symptom-catalog.md`](../modules/nkbv/investigation-forms/02-clinical-symptom-catalog.md) — Danh mục triệu chứng lâm sàng NKBV (SSOT)
- [`docs/modules/nkbv/investigation-forms/BSI-2026.md`](../modules/nkbv/investigation-forms/BSI-2026.md) — BSI-2026 — CLABSI / LCBI / MBI-LCBI
- [`docs/modules/nkbv/investigation-forms/PNEU-2026.md`](../modules/nkbv/investigation-forms/PNEU-2026.md) — PNEU-2026 — Viêm phổi bệnh viện / VAP lâm sàng
- [`docs/modules/nkbv/investigation-forms/README.md`](../modules/nkbv/investigation-forms/README.md) — Investigation forms — Phiếu NKBV tinh gọn / đủ CDC
- [`docs/modules/nkbv/investigation-forms/SSI-2026.md`](../modules/nkbv/investigation-forms/SSI-2026.md) — SSI-2026 — Nhiễm khuẩn vết mổ
- [`docs/modules/nkbv/investigation-forms/UTI-2026.md`](../modules/nkbv/investigation-forms/UTI-2026.md) — UTI-2026 — CAUTI / SUTI / ABUTI
- [`docs/modules/nkbv/investigation-forms/VAE-2026.md`](../modules/nkbv/investigation-forms/VAE-2026.md) — VAE-2026 — VAC → IVAC → PVAP
- [`docs/modules/nkbv/investigation-forms/trees/BSI.md`](../modules/nkbv/investigation-forms/trees/BSI.md) — Cây quyết định + phân lớp — BSI / CLABSI / MBI-LCBI
- [`docs/modules/nkbv/investigation-forms/trees/PNEU.md`](../modules/nkbv/investigation-forms/trees/PNEU.md) — Cây quyết định + phân lớp — PNEU / VAP / Non-VAP
- [`docs/modules/nkbv/investigation-forms/trees/SSI.md`](../modules/nkbv/investigation-forms/trees/SSI.md) — Cây quyết định + phân lớp — SSI
- [`docs/modules/nkbv/investigation-forms/trees/UTI.md`](../modules/nkbv/investigation-forms/trees/UTI.md) — Cây quyết định + phân lớp — UTI / CAUTI / ABUTI
- [`docs/modules/nkbv/investigation-forms/trees/VAE.md`](../modules/nkbv/investigation-forms/trees/VAE.md) — Cây quyết định + phân lớp — VAE (VAC → IVAC → PVAP)
- [`docs/modules/qlcv/19-QLCV-DOMAIN-SSOT.md`](../modules/qlcv/19-QLCV-DOMAIN-SSOT.md) — 19 — QLCV · Quản lý công việc khoa KSNK · SSOT
- [`docs/modules/qlcv/README.md`](../modules/qlcv/README.md) — QLCV
- [`docs/modules/quan-tri-he-thong/README.md`](../modules/quan-tri-he-thong/README.md) — Quản trị hệ thống

### Reference

- [`docs/reference/architecture/adr-dashboard-kpi-path-20260603.md`](../reference/architecture/adr-dashboard-kpi-path-20260603.md) — ADR: Đường dữ liệu KPI Dashboard (2026-06-03)
- [`docs/reference/architecture/adr-nkbv-domain-ssot-alignment-20260804.md`](../reference/architecture/adr-nkbv-domain-ssot-alignment-20260804.md) — ADR: Alignment Domain SSOT v2.0 ↔ module NKBV (2026-08-04)
- [`docs/reference/architecture/adr-nkbv-unified-module-20260715.md`](../reference/architecture/adr-nkbv-unified-module-20260715.md) — ADR: NKBV thống nhất — không tách 4 app theo hội chứng (2026-07-15)
- [`docs/reference/architecture/adr-qlcv-text-check-deferred.md`](../reference/architecture/adr-qlcv-text-check-deferred.md) — ADR — QLCV TEXT+CHECK
- [`docs/reference/architecture/interaction-matrix.md`](../reference/architecture/interaction-matrix.md) — MA TRẬN TƯƠNG TÁC MODULE — BV103
- [`docs/reference/architecture/layout-primitives.md`](../reference/architecture/layout-primitives.md) — Layout primitives — KSNK BV103
- [`docs/reference/architecture/lookup-vs-enum-guidance.md`](../reference/architecture/lookup-vs-enum-guidance.md) — Hướng dẫn: danh mục nhỏ — bảng / lookup / gắn cứng
- [`docs/reference/architecture/page-chrome-contract-20260731.md`](../reference/architecture/page-chrome-contract-20260731.md) — Page Chrome Contract — BV103 (2026-07-31)
- [`docs/reference/architecture/system-overview.md`](../reference/architecture/system-overview.md) — HỆ THỐNG KIỂM SOÁT NHIỄM KHUẨN (KSNK) — BỆNH VIỆN 103
- [`docs/reference/guides/architecture-one-pager.md`](../reference/guides/architecture-one-pager.md) — Kiến trúc KSNK BV103 — One-pager
- [`docs/reference/guides/auth-pilot-link-sop.md`](../reference/guides/auth-pilot-link-sop.md) — SOP — Link Auth ↔ `mdm_nhan_su` (Phase 6.2)
- [`docs/reference/guides/bv103-visual-language.md`](../reference/guides/bv103-visual-language.md) — BV103 Visual Language (Phase 0 SSOT)
- [`docs/reference/guides/demo-governance-gates.md`](../reference/guides/demo-governance-gates.md) — Demo governance gates — runbook terminal (~2–3 phút)
- [`docs/reference/guides/demo-script-skeptics-10min.md`](../reference/guides/demo-script-skeptics-10min.md) — Demo script 10 phút — đối thoại với skeptic
- [`docs/reference/guides/incident-backup-playbook.md`](../reference/guides/incident-backup-playbook.md) — Playbook sự cố & backup/restore — KSNK BV103
- [`docs/reference/guides/json-import-export.md`](../reference/guides/json-import-export.md) — Cẩm nang Kiến trúc Hybrid JSONB: Import / Export & Mở rộng Danh mục
- [`docs/reference/guides/migration-squash-runbook.md`](../reference/guides/migration-squash-runbook.md) — Migration Squash Runbook — BV103 Pilot Baseline
- [`docs/reference/guides/ops-go-live.md`](../reference/guides/ops-go-live.md) — Ops go-live — runbook tay (Phase 3)
- [`docs/reference/reports/README.md`](../reference/reports/README.md) — Báo cáo — lớp sống đã thu

### UX

- [`docs/ux/principles.md`](../ux/principles.md) — BV103 UX principles — medical professional minimalism

### Other

- [`docs/README.md`](../README.md) — Cổng tài liệu — KSNK BV103
- [`docs/ssot-map.md`](../ssot-map.md) — Bản đồ nguồn chuẩn — KSNK BV103

<!-- AUTO_CATALOG_END -->
