# BV103 LLM Wiki — Schema cho agent

## Ba lớp

| Lớp | Đường dẫn | Ai sở hữu |
|-----|-----------|-----------|
| Raw | [`../data/README.md`](../data/README.md) | Con người + script (immutable) |
| Wiki | `entities.md`, `concepts.md`, `index.md` | **LLM** |
| Schema vận hành | `CLAUDE.md`, `docs/core/*`, `.claude/skills/*` | Đồng tiến hóa |

**SSOT khi code:** superseded — cửa [`../../CLAUDE.md`](../../CLAUDE.md) rồi [`../ssot-map.md`](../ssot-map.md). Schema này chỉ cho ingest wiki.

## Cấu trúc (đã thu gọn)

```
docs/wiki/
  WIKI_SCHEMA.md
  entities.md      # mọi module — không tách entities/*
  concepts.md      # chéo module — không tách concepts/*
  index.md
```

Module `README.md` = bảng pointer ngắn → wiki + core.

## Operations

### Ingest

1. Đọc source (không sửa `data/**` trừ khi seed).
2. Cập nhật section trong `entities.md` hoặc `concepts.md`.
3. Cập nhật `index.md` bằng `npm run wiki:index`.

### Query

1. Sửa code thì không bắt đầu ở đây — [`../../CLAUDE.md`](../../CLAUDE.md). Hỏi tổng hợp: `entities.md` / `concepts.md`, rồi file ssot-map nếu implement.
2. Câu trả lời đáng giữ → thêm section wiki.

### Lint

`npm run docs:links:check` — kiểm tra link nội bộ.

## Không làm

- Nhân bản `reform-plan.md` / `canonical-36` vào wiki.
- Tạo thêm `entities/foo.md` trừ khi một module >200 dòng wiki và cần tách.
