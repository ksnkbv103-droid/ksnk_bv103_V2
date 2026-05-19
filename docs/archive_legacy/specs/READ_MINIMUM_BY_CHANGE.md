# Đọc tối thiểu theo loại thay đổi

Giảm quota và tránh đọc thừa. Khi rule Cursor có **globs** trùng file đang sửa, IDE sẽ nhắc thêm ngữ cảnh — **vẫn nên mở hoặc `@` các đường dẫn dưới đây** trước khi chốt thiết kế.

**Ma trận tham chiếu** (thay cho bảng đọc tối thiểu trong `AGENTS.md` phiên bản cũ):

| Loại thay đổi | Đọc / làm tối thiểu |
| ------------- | ------------------- |
| UI/component thuần (không đổi DB) | `.cursor/rules/30-code-style-and-size.mdc`, `40-mobile-touch-requirements.mdc` (nếu UI), `61-quality-verification.mdc`; [`PREP0_UI_ACTION_DB_MATRIX.md`](./PREP0_UI_ACTION_DB_MATRIX.md) nếu đụng action/route mới; `src/lib/permission-registry.ts` nếu thêm route/module. |
| Server action / API nội bộ (không migration) | `AGENTS.md` §2–4 (SSOT + lớp dữ liệu), `.cursor/rules/10-architecture-and-boundaries.mdc`, `50-schema-sync-gate.mdc`; [`10-bv103-implementation-mapping.md`](./10-bv103-implementation-mapping.md) **nếu** đụng bảng nghiệp vụ lạ hoặc FK mới. |
| Migration / cột / FK / RLS / SQL | `AGENTS.md` (lớp dữ liệu + đặt tên), `.cursor/rules/50-schema-sync-gate.mdc`, **`51-database-migration-rules.mdc`** (file SQL); [`10-bv103-implementation-mapping.md`](./10-bv103-implementation-mapping.md); pipeline trong rule 51. |
| CSSD / mẻ TK / quét | `.cursor/rules/12-cssd-erp-spec-context.mdc`; [`03-journeys-and-flows-catalog.md`](./working/03-journeys-and-flows-catalog.md) (phần CSSD); [`07-physical-erd-specification.md`](./working/07-physical-erd-specification.md) khi đụng schema vật lý; mapping **10**. |
| Giám sát VST / GSC | `.cursor/rules/13-giam-sat-spec-context.mdc`; [`01-domain-checklist-ubiquitous-language.md`](./working/01-domain-checklist-ubiquitous-language.md); mapping **10**; [`05-nfr-non-functional-requirements.md`](./working/05-nfr-non-functional-requirements.md) khi cần. |
| Công việc mạng lưới | `.cursor/rules/14-cong-viec-spec-context.mdc`; [`03-journeys-and-flows-catalog.md`](./working/03-journeys-and-flows-catalog.md) (luồng liên quan); mapping **10**. |
| Danh mục / MDM / import master | `.cursor/rules/15-danh-muc-mdm-spec-context.mdc`, `20-master-data-placement.mdc`; [`02-adr-dm-dict-domain-registry.md`](./working/02-adr-dm-dict-domain-registry.md), [`04-system-boundaries-and-master-data.md`](./working/04-system-boundaries-and-master-data.md). |

**Preflight mặc định cho task lớn:** [`docs/specs/README.md`](./README.md) + checklist trong [`AGENTS.md`](../../AGENTS.md) (mục *Checklist trước khi code module lớn*).
