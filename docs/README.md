# Cổng tài liệu — KSNK BV103

> **Một cổng duy nhất.** Bắt đầu tại đây; không duyệt ngẫu nhiên `docs/data/`.

## Tôi là…

### PO / lãnh đạo / onboard toàn hệ

1. Bản chụp 24/08/2026 (ý tưởng, 12 module, FE/BE/DB, đánh giá): [`reference/reports/ksnk-bv103-compendium-20260824.md`](reference/reports/ksnk-bv103-compendium-20260824.md) — **không** thay SSOT core khi sửa code.

### Dev / AI agent (sửa code)

1. [`AGENTS.md`](../AGENTS.md)
2. [`core/read-minimum.md`](core/read-minimum.md) — chọn dòng theo loại diff
3. [`core/lean-execution.md`](core/lean-execution.md) — verify + checklist PR
4. [`core/cursor-operating-playbook.md`](core/cursor-operating-playbook.md) — vận hành Cursor (ít token, scope rõ)

### PM / KSNK (nghiệp vụ)

1. [`core/domain-specification.md`](core/domain-specification.md)
2. Module: [`modules/cssd/`](modules/cssd/) · [`modules/giam-sat/`](modules/giam-sat/) · [`modules/nkbv/`](modules/nkbv/)
3. Bản chụp toàn hệ (24/08/2026, không thay SSOT): [`reference/reports/ksnk-bv103-compendium-20260824.md`](reference/reports/ksnk-bv103-compendium-20260824.md)

### DBA / DevOps

1. [`core/operations-sop.md`](core/operations-sop.md)
2. [`core/governance-pipeline.md`](core/governance-pipeline.md)
3. [`reference/guides/migration-squash-runbook.md`](reference/guides/migration-squash-runbook.md)
4. [`reference/guides/ops-go-live.md`](reference/guides/ops-go-live.md) — go-live tay (env/wave/gate, UAT CSSD, auth blocker, BOM unique)

---

## Lớp Wiki — Tổng hợp (ít file, LLM maintain)

> Tri thức biên dịch một lần; module README chỉ còn **pointer**.

| File | Vai trò |
|------|---------|
| [`wiki/entities.md`](wiki/entities.md) | Tất cả module (CSSD, GSC, NKBV, MDM, QLCV) |
| [`wiki/concepts.md`](wiki/concepts.md) | Layout, scoring, CSSD↔MDM, prefix DB |
| [`wiki/index.md`](wiki/index.md) | Catalog + `npm run wiki:index` |
| [`wiki/WIKI_SCHEMA.md`](wiki/WIKI_SCHEMA.md) | Ingest / query / lint |
| [`sources/README.md`](sources/README.md) | Raw `data/`, `archive/` — immutable |

## Lớp 1 — Core SSOT (≤15 file, đọc thường xuyên)

| File | Vai trò |
|------|---------|
| [`core/read-minimum.md`](core/read-minimum.md) | Đọc gì theo loại diff |
| [`core/lean-execution.md`](core/lean-execution.md) | Vertical slice, verify, PR |
| [`core/pilot-core-modules-go-live.md`](core/pilot-core-modules-go-live.md) | Pilot gấp: Quản trị + Giám sát + QLCV |
| [`core/domain-specification.md`](core/domain-specification.md) | Nghiệp vụ, ubiquitous language |
| [`core/implementation-mapping.md`](core/implementation-mapping.md) | Thuật ngữ ↔ bảng/RPC |
| [`core/governance-pipeline.md`](core/governance-pipeline.md) | Migration + ship + CI |
| [`core/skills-catalog.md`](core/skills-catalog.md) | Agent skills allowlist |
| [`core/engineering-guidelines.md`](core/engineering-guidelines.md) | Code, UI, PR |
| [`core/operations-sop.md`](core/operations-sop.md) | Auth, RLS, Smart DB |
| [`core/handover-roadmap.md`](core/handover-roadmap.md) | Lộ trình, cấu trúc app |
| [`core/cursor-operating-playbook.md`](core/cursor-operating-playbook.md) | Cursor: intake, verify, tiết kiệm quota |

Runbook demo / auth / kiến trúc one-pager: [`reference/guides/`](reference/guides/) (`architecture-one-pager`, `demo-governance-gates`, `auth-pilot-link-sop`).

## Lớp 2 — Module docs

| Module | README |
|--------|--------|
| CSSD | [`modules/cssd/README.md`](modules/cssd/README.md) |
| Giám sát | [`modules/giam-sat/README.md`](modules/giam-sat/README.md) |
| NKBV | [`modules/nkbv/README.md`](modules/nkbv/README.md) |
| MDM | [`modules/mdm/README.md`](modules/mdm/README.md) |
| QLCV | [`modules/qlcv/README.md`](modules/qlcv/README.md) |

## Lớp 3 — Reference (audit / kiến trúc)

- [`reference/architecture/`](reference/architecture/) — overview, debt, roadmap, [remediation sync](reference/architecture/remediation-plan-2026h2-sync.md)
- [`reference/reports/`](reference/reports/) — **SSOT:** [gap-register-20260703](reference/reports/gap-register-20260703.md) · [db-hygiene-20260703](reference/reports/db-hygiene-20260703.md) · [index](reference/reports/README.md)
- Audit lịch sử (06/2026 trở về trước): [`archive/reports/`](archive/reports/) only
- [`reference/guides/`](reference/guides/) — import JSON, migration runbook, [Cursor prompt templates](reference/guides/cursor-command-intake-template.md)

## Lớp 4 — Data (⚠️ machine source)

[`data/README.md`](data/README.md) — **không đọc tay**; script seed/generator parse từ đây.

## Lớp 5 — Archive

[`archive/`](archive/) — baseline, plan đã Done — không link từ read-minimum.

---

## Công cụ

- `npm run docs:links:check` — kiểm tra link nội bộ
- `npm run repo:hygiene` — SQL active, view pilot, inventory docs
- Inventory scripts: [`../scripts/README.md`](../scripts/README.md)
- `npm run verify` — full gate trước push
- Manifest: [`DOCS_MANIFEST.yaml`](DOCS_MANIFEST.yaml)

## Legacy

[`archive/pilot_chain_20260520_20260529.tar.gz`](archive/pilot_chain_20260520_20260529.tar.gz) — migration pre-pilot (không apply). SQL ad-hoc: [`../scripts/archive/sql-20260531/`](../scripts/archive/sql-20260531/).
