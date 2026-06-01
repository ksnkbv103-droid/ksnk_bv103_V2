# Wiki lint

## Contradictions (wiki vs SSOT)

| ID | Mô tả | SSOT | Trạng thái |
|----|--------|------|------------|
| — | Chưa ghi sau thu gọn 2026-05-31 | migration + `implementation-mapping.md` | OK |

Giải quyết: tên bảng → mapping; nghiệp vụ → `domain-specification.md`; NKBV chi tiết → `data/nkbv/algorithms/` + rules engine.

## Health 2026-05-31

- Thu gọn: `entities.md`, `concepts.md` thay nhiều file rời; xóa `specs/README`, doc trùng module.
- `handover-roadmap.md` bỏ bảng `fact_*` cũ — trỏ mapping.
- Cần ingest tiếp: trạng thái backfill GSC scoring.

```bash
npm run docs:links:check
```
