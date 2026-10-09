# Wiki lint

## Contradictions (wiki vs SSOT)

| ID | Mô tả | SSOT | Trạng thái |
|----|-------|------|------------|
| DOC-20260909 | `_agent-*` lẫn module / NKBV v2.0 cạnh SSOT v3.3 | [`ssot-map.md`](../ssot-map.md) · `archive/agent-notes` + `archive/nkbv-sources` | Đã chuyển kho 2026-09-09 |
| DOC-20261009 | File ngày / `_audit` / A–B / plan đã xong lẫn lớp sống | [`ssot-map.md`](../ssot-map.md) · [`archive/README.md`](../archive/README.md) | Đã thu 2026-10-09: lớp sống không còn `_audit`, A–B, báo cáo ngày |
| DOC-20261009b | Con trỏ máy khác (`macwork`, `file://`) và file 11/15 không còn trong repo | [`ssot-map.md`](../ssot-map.md) | Đã trỏ về file sống trong repo này |

Giải quyết: tên bảng → mapping; nghiệp vụ → `domain-specification.md`; NKBV chi tiết → `data/nkbv/algorithms/` + rules engine. Việc mở → `handover-roadmap.md` §5.

```bash
npm run docs:links:check
npm run wiki:index
```
