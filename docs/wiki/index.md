# Wiki index

> **Đọc trước:** [`entities.md`](entities.md) · [`concepts.md`](concepts.md) · Schema: [`WIKI_SCHEMA.md`](WIKI_SCHEMA.md)

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
| [`../core/handover-roadmap.md`](../core/handover-roadmap.md) | Onboarding (ngắn) |

## Module (pointer)

| Module | Deep doc | Wiki |
|--------|----------|------|
| CSSD | [`reform-plan.md`](../modules/cssd/reform-plan.md) | [entities#cssd](entities.md#cssd) |
| Giám sát | [`bang-kiem-overview.md`](../modules/giam-sat/bang-kiem-overview.md) | [entities#gsc](entities.md#giám-sát-vst--gsc) |
| NKBV | [`domain-specification.md`](../modules/nkbv/domain-specification.md) | [entities#nkbv](entities.md#nkbv-hai) |
| QLCV | [`README.md`](../modules/qlcv/README.md) (migrate) | [entities#qlcv](entities.md#qlcv) |

## Reference

[`../reference/architecture/system-overview.md`](../reference/architecture/system-overview.md) · [`roadmap-2026h2.md`](../reference/architecture/roadmap-2026h2.md) · [`debt-register.md`](../reference/architecture/debt-register.md)

<!-- AUTO_CATALOG_START -->

_Generated 2026-05-31 — `npm run wiki:index`_

### Core SSOT

- [`docs/core/domain-specification.md`](../core/domain-specification.md) — ĐẶC TẢ NGHIỆP VỤ Y TẾ THỐNG NHẤT — KSNK BV103
- [`docs/core/engineering-guidelines.md`](../core/engineering-guidelines.md) — QUY CHUẨN KỸ THUẬT & UI/UX THỐNG NHẤT — KSNK BV103
- [`docs/core/governance-pipeline.md`](../core/governance-pipeline.md) — Governance pipeline — schema & ship
- [`docs/core/handover-roadmap.md`](../core/handover-roadmap.md) — Bàn giao & onboarding — KSNK BV103
- [`docs/core/implementation-mapping.md`](../core/implementation-mapping.md) — BV103 — Ánh xạ thuật ngữ spec ↔ module ↔ bảng / thực thể thật
- [`docs/core/lean-execution.md`](../core/lean-execution.md) — LEAN Execution — BV103
- [`docs/core/operations-sop.md`](../core/operations-sop.md) — CẨM NANG VẬN HÀNH, BẢO MẬT & DB THỐNG NHẤT — KSNK BV103
- [`docs/core/read-minimum.md`](../core/read-minimum.md) — Đọc tối thiểu theo loại thay đổi
- [`docs/core/skills-catalog.md`](../core/skills-catalog.md) — Skills catalog — BV103

### Modules

- [`docs/modules/cssd/README.md`](../modules/cssd/README.md) — CSSD
- [`docs/modules/cssd/reform-plan.md`](../modules/cssd/reform-plan.md) — QLDCPT/CSSD — Kế hoạch cải tổ v3
- [`docs/modules/giam-sat/README.md`](../modules/giam-sat/README.md) — Giám sát (VST / GSC)
- [`docs/modules/giam-sat/bang-kiem-overview.md`](../modules/giam-sat/bang-kiem-overview.md) — Bảng kiểm GSC/VST — tóm tắt
- [`docs/modules/mdm/README.md`](../modules/mdm/README.md) — MDM & quản trị
- [`docs/modules/nkbv/README.md`](../modules/nkbv/README.md) — NKBV
- [`docs/modules/nkbv/clinical-forms.md`](../modules/nkbv/clinical-forms.md) — ĐẶC TẢ THIẾT KẾ CÁC BIỂU MẪU NHẬP LIỆU LÂM SÀNG NKBV (CDC/NHSN SURVEILLANCE PROTOCOL)
- [`docs/modules/nkbv/domain-specification.md`](../modules/nkbv/domain-specification.md) — ĐẶC TẢ NGHIỆP VỤ GIÁM SÁT NHIỄM KHUẨN BỆNH VIỆN (NKBV) — CDC/NHSN STANDARD
- [`docs/modules/qlcv/README.md`](../modules/qlcv/README.md) — QLCV

### Reference

- [`docs/reference/architecture/debt-register.md`](../reference/architecture/debt-register.md) — SỔ ĐĂNG KÝ NỢ KỸ THUẬT (TECHNICAL DEBT REGISTER)
- [`docs/reference/architecture/interaction-matrix.md`](../reference/architecture/interaction-matrix.md) — MA TRẬN TƯƠNG TÁC MODULE — BV103
- [`docs/reference/architecture/roadmap-2026h2.md`](../reference/architecture/roadmap-2026h2.md) — LỘ TRÌNH PHÁT TRIỂN & TIÊU CHÍ HOÀN THÀNH PILOT (2026H2)
- [`docs/reference/architecture/system-overview.md`](../reference/architecture/system-overview.md) — HỆ THỐNG KIỂM SOÁT NHIỄM KHUẨN (KSNK) — BỆNH VIỆN 103
- [`docs/reference/architecture/unstaged-slice-split.md`](../reference/architecture/unstaged-slice-split.md) — Kế hoạch tách PR — Vertical slices unstaged
- [`docs/reference/guides/json-import-export.md`](../reference/guides/json-import-export.md) — Cẩm nang Kiến trúc Hybrid JSONB: Import / Export & Mở rộng Danh mục
- [`docs/reference/guides/migration-squash-runbook.md`](../reference/guides/migration-squash-runbook.md) — Migration Squash Runbook — BV103 Pilot Baseline
- [`docs/reference/reports/comprehensive-review-20260530.md`](../reference/reports/comprehensive-review-20260530.md) — Ngày rà soát:
- [`docs/reference/reports/dashboard-pre-aggregation-dictionary.md`](../reference/reports/dashboard-pre-aggregation-dictionary.md) — archived stub → ADR dashboard KPI path

### Data (machine)

- [`docs/data/README.md`](../data/README.md) — Machine data sources
- [`docs/data/bang-kiem/canonical-36.md`](../data/bang-kiem/canonical-36.md) — Danh mục bảng kiểm chuẩn — Giám sát tuân thủ KSNK (4 phần)
- [`docs/data/bang-kiem/giamsattuanthu.md`](../data/bang-kiem/giamsattuanthu.md) — —
- [`docs/data/bang-kiem/master-bangkiem.md`](../data/bang-kiem/master-bangkiem.md) — —
- [`docs/data/bang-kiem/master-tieuchi.md`](../data/bang-kiem/master-tieuchi.md) — —
- [`docs/data/bang-kiem/raw-forms-full.md`](../data/bang-kiem/raw-forms-full.md) — —
- [`docs/data/nkbv/algorithms/data-fields.md`](../data/nkbv/algorithms/data-fields.md) — —
- [`docs/data/nkbv/algorithms/exclusion-rules.md`](../data/nkbv/algorithms/exclusion-rules.md) — —
- [`docs/data/nkbv/algorithms/nkh-algorithm.md`](../data/nkbv/algorithms/nkh-algorithm.md) — —
- [`docs/data/nkbv/algorithms/nktn-algorithm.md`](../data/nkbv/algorithms/nktn-algorithm.md) — —
- [`docs/data/nkbv/algorithms/pneu-algorithm.md`](../data/nkbv/algorithms/pneu-algorithm.md) — —
- [`docs/data/nkbv/algorithms/roles.md`](../data/nkbv/algorithms/roles.md) — —
- [`docs/data/nkbv/algorithms/ssi-algorithm.md`](../data/nkbv/algorithms/ssi-algorithm.md) — —
- [`docs/data/nkbv/algorithms/statistics.md`](../data/nkbv/algorithms/statistics.md) — —
- [`docs/data/nkbv/algorithms/vae-algorithm.md`](../data/nkbv/algorithms/vae-algorithm.md) — —
- [`docs/data/qldcpt/cssd-business-notes.md`](../data/qldcpt/cssd-business-notes.md) — —

### Archive

- [`docs/archive/baselines/admin-module-perf-baseline-20260526.md`](../archive/baselines/admin-module-perf-baseline-20260526.md) — Admin Module Performance Baseline — 26/05/2026
- [`docs/archive/baselines/cssd-perf-baseline-20260526.md`](../archive/baselines/cssd-perf-baseline-20260526.md) — CSSD-ERP — Perf baseline + Phase B hardening (26/05/2026)
- [`docs/archive/baselines/view-rename-mapping-20260526.md`](../archive/baselines/view-rename-mapping-20260526.md) — View `v_*` rename theo prefix module — 26/05/2026
- [`docs/archive/plans/admin-module-slice-plan.md`](../archive/plans/admin-module-slice-plan.md) — Quản trị hệ thống BV103 — Kế hoạch 9 slice dứt điểm (25/05/2026)
- [`docs/archive/plans/bv103-architecture-review-20260530.plan.md`](../archive/plans/bv103-architecture-review-20260530.plan.md) — BV103 — Rà soát kiến trúc toàn diện & lộ trình phát triển

### Other

- [`docs/README.md`](../README.md) — Cổng tài liệu — KSNK BV103

<!-- AUTO_CATALOG_END -->
