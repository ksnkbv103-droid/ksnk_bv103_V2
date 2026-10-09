# Cổng tài liệu — KSNK BV103

> Mục lục lớp tài liệu. Cửa khi sửa repo: [`../CLAUDE.md`](../CLAUDE.md). Chủ đề → [`ssot-map.md`](ssot-map.md).  
> **Không** duyệt `data/` hay `archive/` khi sửa code.

## Phân lớp (bắt buộc)

| Lớp | Đường dẫn | Vai trò | Được phép thêm file khi |
|-----|-----------|---------|-------------------------|
| 0. Raw | [`data/`](data/) · [`archive/`](archive/) | Máy đọc / mốc lịch sử | Seed mới; hoặc **git mv** mốc ra archive — không viết SSOT mới trong archive |
| 1. Core | [`core/`](core/) | SSOT vận hành (tối đa 17 file) | Chỉ khi gộp/thay file hiện có; không nở thêm |
| 2. Wiki | [`wiki/`](wiki/) | Tổng hợp chéo module | Sửa `entities.md` / `concepts.md` — không tách file mới |
| 3. Module | [`modules/<mod>/`](modules/) | Domain đang dùng của đúng một module | Luật nghiệp vụ còn hiệu lực, **không** gắn ngày / `_audit` / A–B |
| 4. Reference | [`reference/`](reference/) | Kiến trúc sống + ADR + runbook | Hợp đồng / quyết định còn hiệu lực. Báo cáo ngày → archive |
| 5. UX | [`ux/principles.md`](ux/principles.md) | IA / tương tác | Chỉ sửa file này; audit UX → archive |

**Một chủ đề = một bản đang dùng.** Mốc, nhật ký lát, A–B đã chốt, plan tháng → [`archive/`](archive/). Khi archive mâu thuẫn core/module, **SSOT thắng**.

---

## Tôi là…

### Dev / AI agent (sửa code)

1. [`CLAUDE.md`](../CLAUDE.md) — một cửa (thứ tự đọc, khóa, việc còn PO)

Danh sách năm file «đọc trước» cũ (AGENTS, read-minimum, lean, playbook) — superseded. Playbook chỉ khi cần lệnh/verify: [`core/cursor-operating-playbook.md`](core/cursor-operating-playbook.md).

### PO / KSNK (nghiệp vụ)

1. [`core/domain-specification.md`](core/domain-specification.md)
2. Module: [`modules/cssd/`](modules/cssd/) · [`modules/giam-sat/`](modules/giam-sat/) · [`modules/nkbv/`](modules/nkbv/) · [`modules/qlcv/`](modules/qlcv/)
3. Việc còn mở: [`core/handover-roadmap.md`](core/handover-roadmap.md) §5
4. Bản chụp toàn hệ 24/08/2026 (không thay SSOT): [`archive/reports/ksnk-bv103-compendium-20260824.md`](archive/reports/ksnk-bv103-compendium-20260824.md)

### DBA / DevOps

1. [`core/operations-sop.md`](core/operations-sop.md)
2. [`core/governance-pipeline.md`](core/governance-pipeline.md)
3. [`reference/guides/migration-squash-runbook.md`](reference/guides/migration-squash-runbook.md)
4. [`reference/guides/ops-go-live.md`](reference/guides/ops-go-live.md)

---

## Lớp Wiki

| File | Vai trò |
|------|---------|
| [`wiki/entities.md`](wiki/entities.md) | CSSD, GSC/VST, NKBV, MDM, QLCV |
| [`wiki/concepts.md`](wiki/concepts.md) | Prefix DB, CSSD↔MDM, layout, GSC scoring, BOM |
| [`wiki/index.md`](wiki/index.md) | Catalog sống — `npm run wiki:index` |
| [`wiki/WIKI_SCHEMA.md`](wiki/WIKI_SCHEMA.md) | Ingest / query / lint |
| [`data/README.md`](data/README.md) · [`archive/README.md`](archive/README.md) | Raw máy đọc và kho lịch sử |

## Lớp Core (17 file)

**Mục lục, không đọc hết:** `read-minimum` · `lean-execution` · `pilot-core-modules-go-live` · `domain-specification` · `implementation-mapping` · `governance-pipeline` · `skills-catalog` · `engineering-guidelines` · `operations-sop` · `handover-roadmap` · `cursor-operating-playbook`

**Ký / ADR / catalog:** `po-cursor-guide` · `domain-decisions-cssd-instrument` · `adr-cssd-fact-write-rls` · `database-view-catalog` · `pilot-go-live-signoff-202606` · `po-uat-signoff-202607`

## Lớp Module (cổng)

| Module | README |
|--------|--------|
| CSSD | [`modules/cssd/README.md`](modules/cssd/README.md) |
| Giám sát | [`modules/giam-sat/README.md`](modules/giam-sat/README.md) |
| NKBV | [`modules/nkbv/README.md`](modules/nkbv/README.md) |
| MDM / Quản trị | [`modules/mdm/README.md`](modules/mdm/README.md) |
| QLCV | [`modules/qlcv/19-QLCV-DOMAIN-SSOT.md`](modules/qlcv/19-QLCV-DOMAIN-SSOT.md) |
| Dashboard | [`modules/dashboard/README.md`](modules/dashboard/README.md) |
| Đào tạo | [`modules/dao-tao/domain-overview.md`](modules/dao-tao/domain-overview.md) |

## Lớp Reference (đang dùng)

**Kiến trúc / ADR:** [`system-overview`](reference/architecture/system-overview.md) · [`interaction-matrix`](reference/architecture/interaction-matrix.md) · [`lookup-vs-enum`](reference/architecture/lookup-vs-enum-guidance.md) · [`page-chrome-contract`](reference/architecture/page-chrome-contract-20260731.md) · [`layout-primitives`](reference/architecture/layout-primitives.md) · ADR NKBV (unified + alignment)

**Runbook:** [`ops-go-live`](reference/guides/ops-go-live.md) · [`migration-squash`](reference/guides/migration-squash-runbook.md) · [`json-import-export`](reference/guides/json-import-export.md) · [`incident-backup`](reference/guides/incident-backup-playbook.md) · [`auth-pilot-link`](reference/guides/auth-pilot-link-sop.md) · [`architecture-one-pager`](reference/guides/architecture-one-pager.md) · [`visual-language`](reference/guides/bv103-visual-language.md)

Mốc audit / plan / A–B: [`archive/README.md`](archive/README.md).

## Data · Archive

- [`data/README.md`](data/README.md) — **không đọc tay**; script seed/generator.
- [`archive/README.md`](archive/README.md) — báo cáo, plan, nhật ký lát, nguồn NKBV cũ, ghi chú AI.

---

## Công cụ

- `npm run docs:links:check` — link nội bộ (bỏ qua `archive/`)
- `npm run wiki:index` — catalog lớp sống
- `npm run repo:hygiene` — SQL active + inventory
- `npm run verify` — full gate trước push
- Manifest: [`DOCS_MANIFEST.yaml`](DOCS_MANIFEST.yaml)
