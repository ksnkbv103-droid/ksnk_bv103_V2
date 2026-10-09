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

## Cửa

Sửa repo: [`../CLAUDE.md`](../CLAUDE.md). Chủ đề đang dùng: [`ssot-map.md`](ssot-map.md). Đọc thêm theo diff: [`core/read-minimum.md`](core/read-minimum.md).

Wiki tổng hợp: [`wiki/entities.md`](wiki/entities.md) · [`wiki/concepts.md`](wiki/concepts.md). Catalog máy: [`wiki/index.md`](wiki/index.md).

## Lớp Core (17 file)

**Mục lục, không đọc hết:** `read-minimum` · `lean-execution` · `pilot-core-modules-go-live` · `domain-specification` · `implementation-mapping` · `governance-pipeline` · `skills-catalog` · `engineering-guidelines` · `operations-sop` · `handover-roadmap` · `cursor-operating-playbook`

**Ký / ADR / catalog:** `po-cursor-guide` · `domain-decisions-cssd-instrument` · `adr-cssd-fact-write-rls` · `database-view-catalog` · `pilot-go-live-signoff-202606` · `po-uat-signoff-202607`

Cổng module nằm trên [`ssot-map.md`](ssot-map.md).

## Lớp Reference (đang dùng)

**Đang dùng:** [`interaction-matrix`](reference/architecture/interaction-matrix.md) · [`lookup-vs-enum`](reference/architecture/lookup-vs-enum-guidance.md) · [`page-chrome-contract`](reference/architecture/page-chrome-contract-20260731.md) · [`layout-primitives`](reference/architecture/layout-primitives.md) · [`visual-language`](reference/guides/bv103-visual-language.md) · ADR NKBV (unified + alignment)

**Runbook:** [`ops-go-live`](reference/guides/ops-go-live.md) · [`migration-squash`](reference/guides/migration-squash-runbook.md) · [`json-import-export`](reference/guides/json-import-export.md) · [`incident-backup`](reference/guides/incident-backup-playbook.md) · [`auth-pilot-link`](reference/guides/auth-pilot-link-sop.md)

Tổng quan 30/05, one-pager và script demo: [`archive/plans/`](archive/plans/).

Mốc audit / plan / A–B: [`archive/README.md`](archive/README.md).

## Data · Archive

- [`data/README.md`](data/README.md) — **không đọc tay**; script seed/generator.
- [`archive/README.md`](archive/README.md) — báo cáo, plan, nhật ký lát, nguồn NKBV cũ, ghi chú AI.

---

## Công cụ

- `npm run docs:links:check` — link nội bộ (bỏ qua `archive/` và `data/`)
- `npm run wiki:index` — catalog lớp sống
- `npm run repo:hygiene` — SQL active + inventory
- `npm run verify` — full gate trước push
- Manifest: [`DOCS_MANIFEST.yaml`](DOCS_MANIFEST.yaml)
