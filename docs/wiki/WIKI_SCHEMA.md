# BV103 LLM Wiki — Schema cho agent

## Ba lớp

| Lớp | Đường dẫn | Ai sở hữu |
|-----|-----------|-----------|
| Raw | [`../sources/README.md`](../sources/README.md) → `data/`, `archive/` | Con người + script (immutable) |
| Wiki | `entities.md`, `concepts.md`, `index.md`, `log.md` | **LLM** |
| Schema vận hành | `AGENTS.md`, `docs/core/*`, `.cursor/rules/*` | Đồng tiến hóa |

**SSOT khi code:** `core/domain-specification.md` + `core/implementation-mapping.md` + migration.

## Cấu trúc (đã thu gọn)

```
docs/wiki/
  WIKI_SCHEMA.md
  entities.md      # mọi module — không tách entities/*
  concepts.md      # chéo module — không tách concepts/*
  index.md
  log.md
  lint.md
```

Module `README.md` = bảng pointer ngắn → wiki + core.

## Operations

### Ingest

1. Đọc source (không sửa `data/**` trừ khi seed).
2. Cập nhật section trong `entities.md` hoặc `concepts.md`.
3. `index.md` + append `log.md` (`## [date] ingest | …`).
4. Mâu thuẫn → `lint.md`.

### Query

1. `entities.md` / `concepts.md` → rồi `core/*` nếu implement.
2. Câu trả lời đáng giữ → thêm section wiki + log `query | …`.

### Lint

`lint.md` — contradictions, orphan, stale. `npm run docs:links:check`.

## Không làm

- Nhân bản `reform-plan.md` / `canonical-36` vào wiki.
- Tạo thêm `entities/foo.md` trừ khi một module >200 dòng wiki và cần tách.
