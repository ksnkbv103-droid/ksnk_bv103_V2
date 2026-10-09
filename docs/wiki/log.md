# Wiki changelog (append-only)

> Prefix chuẩn: `## [YYYY-MM-DD] ingest|query|lint | mô tả`

## [2026-10-09] lint | Ghim MCP, bỏ trạng thái cũ trên cửa

- `.mcp.json`: Supabase `cvzwslpxwgqiugzzhqej`, GitHub `ksnkbv103-droid/ksnk_bv103_V2`, Vercel `ksnk-bv103-v2`. Không secret.
- `CLAUDE.md` không chép việc còn mở — nguồn là `handover-roadmap.md` §5. `/grok-handoff` không còn là cửa thứ hai.

## [2026-10-09] lint | Một cửa Claude, bỏ lối đọc thứ hai

- `CLAUDE.md` giữ thứ tự ssot-map → domain-slice → handover §5 và khóa VST. Không thêm file `docs/core` (đủ 17).
- Bảng chủ đề tay trong `wiki/index.md` và câu «SSOT khi code» trong `WIKI_SCHEMA.md` — superseded bởi ssot-map.

## [2026-10-09] lint | Claude Code nạp skill theo việc

- 18 rule theo đường dẫn + 9 skill + 6 agent có mặt trong `.claude/`, mỗi cái một câu mô tả.
- Thân vẫn ở `.cursor/rules`, `.agents/skills`, `.cursor/agents`. Luật 00/01/05 nằm trong `CLAUDE.md`, không đọc lại.

## [2026-10-09] lint | Cổng Claude Code

- Agent sửa repo đọc [`../../CLAUDE.md`](../../CLAUDE.md). Thân lệnh vẫn `.cursor/commands/`. Lệnh gõ: `.claude/commands/`.
- Không đọc CDC thô, `docs/data/`, hay `archive/` khi sửa code.

## [2026-10-09] lint | Đồng bộ con trỏ về một vị trí trong repo

- Bỏ đường dẫn tuyệt đối `file://` và mirror `macwork` / pack ngoài repo trên lớp sống.
- QLCV: rule `14` + `19-QLCV-DOMAIN-SSOT.md`. Hub VST: `modules/giam-sat/README.md`. Bản đồ mẻ CSSD và chương trình giản hóa IA: `archive/plans/architecture/`.
- Chi tiết: [`lint.md`](lint.md) DOC-20261009b.

## [2026-10-09] lint | Thu gọn toàn `docs/` — một chủ đề một bản sống

- Lớp sống: core (17) · wiki · module domain · reference kiến trúc/ADR/runbook · `ux/principles.md`.
- Mốc / nhật ký / A–B / plan đã xong → [`../archive/`](../archive/) (`reports`, `plans`, `slice-journals`, `module-history`).
- Catalog `wiki:index` bỏ `archive/` và `data/`.
- Chi tiết: [`lint.md`](lint.md) DOC-20261009 · [`../ssot-map.md`](../ssot-map.md).

## [2026-09-09] lint | Vệ sinh SSOT — chuyển kho `_agent-*` + NKBV v2.0

- Bản đồ: [`../ssot-map.md`](../ssot-map.md).
- Ghi chú AI → [`../archive/agent-notes/`](../archive/agent-notes/).
- NKBV v2.0 + `Domain *` → [`../archive/nkbv-sources/`](../archive/nkbv-sources/).
- Chi tiết: [`lint.md`](lint.md).

## [2026-05-31] ingest | Khởi tạo lớp wiki BV103

- Áp dụng LLM Wiki pattern: `sources/`, `wiki/WIKI_SCHEMA.md`, `overview.md`, 5 entity pages, 2 concept pages.
- Catalog hóa toàn bộ 54 file `.md` trong `docs/` vào [`index.md`](index.md).
- SSOT kỹ thuật giữ nguyên tại `docs/core/*`; wiki chỉ tổng hợp + link.
- Lint ban đầu: [`lint.md`](lint.md).

## [2026-05-31] lint | Thu gọn cấu trúc wiki

- Gộp `entities/*` → `entities.md`, `concepts/*` → `concepts.md`.
- Xóa: `overview.md`, `layout-primitives.md`, `scoring-consolidation.md`, `architecture-analysis.md`, `specs/README.md`.
- Rút gọn: `handover-roadmap.md`, module README, `qlcv/README` (giữ migrate/lỗi).

## [2026-05-31] lint | Health check sau ingest

- Xem [`lint.md`](lint.md).
