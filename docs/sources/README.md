# Raw sources (Lớp 0 — immutable)

> **LLM Wiki pattern:** Agent **đọc**, không **sửa** file trong lớp này. Tri thức biên dịch sang [`../wiki/`](../wiki/).

| Thư mục | Vai trò | Ghi chú |
|---------|---------|---------|
| [`../data/`](../data/) | Machine source — seed, parser, thuật toán gốc | `human_readable: false` trong manifest |
| [`../archive/`](../archive/) | Baseline / plan đã Done | Không link từ read-minimum |
| [`archive/pilot_chain_20260520_20260529.tar.gz`](../archive/pilot_chain_20260520_20260529.tar.gz) | Migration pre-pilot | Không apply — chỉ tra cứu |

## Quy tắc ingest

1. Đọc source → thảo luận takeaway (nếu cần) → cập nhật trang wiki entity/concept + [`../wiki/index.md`](../wiki/index.md) + [`../wiki/log.md`](../wiki/log.md).
2. Không copy nguyên văn file data lớn vào wiki; wiki **tóm tắt + link** tới source.
3. Mâu thuẫn giữa source và SSOT (`core/`) → ghi [`../wiki/lint.md`](../wiki/lint.md), ưu tiên `implementation-mapping.md` + migration.

## Liên kết wiki

- Schema vận hành: [`../wiki/WIKI_SCHEMA.md`](../wiki/WIKI_SCHEMA.md)
- Catalog: [`../wiki/index.md`](../wiki/index.md)
