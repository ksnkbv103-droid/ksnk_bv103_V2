# Wiki changelog (append-only)

> Prefix chuẩn: `## [YYYY-MM-DD] ingest|query|lint | mô tả`

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
