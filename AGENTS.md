# AGENTS.md — KSNK BV103

> Cổng ship code. Chi tiết: [`docs/README.md`](docs/README.md).

## Triết lý

**Boy Scout** — trong phạm vi slice đang làm; kỷ luật agent: [`.cursor/rules/01-agent-discipline.mdc`](.cursor/rules/01-agent-discipline.mdc).

| Nguyên tắc | Tóm tắt |
|------------|---------|
| Think first | Hỏi khi CSSD vs MDM mơ hồ; đối chiếu migration/CLI — không đoán schema |
| Simplicity | Một vertical slice |
| Surgical | Diff tối thiểu |
| Goal-driven | Pilot DoD + verify |

## Cursor workflow

| Bước | Lệnh |
|------|------|
| Khóa scope | `/intake` |
| Code | `/implement` (sau duyệt intake) |
| Review | `/review` |
| Giải thích | `/explain` |
| Commit / PR | `/commit`, `/pr-create` (chỉ khi user yêu cầu) |

Playbook: [`docs/core/cursor-operating-playbook.md`](docs/core/cursor-operating-playbook.md).

## App ↔ Database

| Tình huống | Lệnh / việc |
|------------|-------------|
| Schema / RPC / view | Migration → `npm run mdm:migrate` (local: `:local`) |
| Sau migrate | `npm run verify:mdm` (hoặc `:local`) |
| Action / `fact_*` | `npm run verify:engineering` |
| SSOT ánh xạ | Changelog `docs/core/implementation-mapping.md` |
| Push / ship | `npm run verify` hoặc `npm run pilot:ship` |
| Go-live sign-off | [`pilot-go-live-signoff-202606.md`](docs/core/pilot-go-live-signoff-202606.md) · `npm run pilot:go-live:gate` |

Pipeline: [`governance-pipeline.md`](docs/core/governance-pipeline.md), [`lean-execution.md`](docs/core/lean-execution.md).

## Pilot DoD (một mảnh)

1. Người dùng / môi trường rõ  
2. ≥ 3 kịch bản tay  
3. Migration + RPC apply đúng  
4. `verify:engineering` pass (hoặc `verify` trước push)

Pilot gấp 3 module: [`pilot-core-modules-go-live.md`](docs/core/pilot-core-modules-go-live.md).

## Đọc theo diff

[`docs/core/read-minimum.md`](docs/core/read-minimum.md) — **không** mở `docs/data/` tay.

| Việc | Doc |
|------|-----|
| Nghiệp vụ | [`domain-specification.md`](docs/core/domain-specification.md) |
| Kỹ thuật / UI | [`engineering-guidelines.md`](docs/core/engineering-guidelines.md) |
| DB / RLS | [`operations-sop.md`](docs/core/operations-sop.md) |
| Wiki tổng hợp | [`docs/wiki/entities.md`](docs/wiki/entities.md) |
| Skills allowlist | [`skills-catalog.md`](docs/core/skills-catalog.md) |
