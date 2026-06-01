# Đọc tối thiểu theo loại thay đổi

> Tránh đọc cả `docs/`. Luôn bắt đầu: [`AGENTS.md`](../../AGENTS.md) + [`lean-execution.md`](lean-execution.md).

| Loại diff | Đọc bắt buộc | Tra cứu thêm |
|-----------|--------------|--------------|
| Bất kỳ | `AGENTS.md`, rule glob module (`.cursor/rules/1x-*.mdc`) | [`implementation-mapping.md`](implementation-mapping.md) |
| UI layout / shell | [`wiki/concepts.md`](../wiki/concepts.md#layout-primitives) | [`engineering-guidelines.md`](engineering-guidelines.md) §2 |
| Server Action / `fact_*` | [`operations-sop.md`](operations-sop.md) § Auth/RLS | `verify:engineering` |
| Migration / RPC / view | [`operations-sop.md`](operations-sop.md) § DB + [`governance-pipeline.md`](governance-pipeline.md) | `51-database-migration-rules.mdc` |
| CSSD workflow / QR / mẻ | [`domain-specification.md`](domain-specification.md) (CSSD) + mapping § CSSD | [`modules/cssd/README.md`](../modules/cssd/README.md) · `12-cssd-erp-spec-context.mdc` |
| MDM / danh mục / import | [`domain-specification.md`](domain-specification.md) (MDM) + `20-master-data-placement.mdc` | [`modules/mdm/README.md`](../modules/mdm/README.md) · [`reference/guides/json-import-export.md`](../reference/guides/json-import-export.md) |
| Giám sát VST/GSC | [`domain-specification.md`](domain-specification.md) (Giám sát) | [`modules/giam-sat/README.md`](../modules/giam-sat/README.md) · `13-giam-sat-spec-context.mdc` |
| NKBV | [`modules/nkbv/README.md`](../modules/nkbv/README.md) | `17-nkbv-spec-context.mdc` |
| QLCV | mapping § Công việc | [`modules/qlcv/README.md`](../modules/qlcv/README.md) · `14-cong-viec-spec-context.mdc` |
| Bảng kiểm template | [`modules/giam-sat/bang-kiem-overview.md`](../modules/giam-sat/bang-kiem-overview.md) | `16-bang-kiem-spec-context.mdc` |
| Dashboard / RPC báo cáo | mapping + [`wiki/concepts.md`](../wiki/concepts.md#cssd-bom-rationale) (BOM/DB quyết định) | `src/lib/rpc-contract-dashboard.spec.ts` |
| RBAC / tài khoản | [`operations-sop.md`](operations-sop.md) | `permission-registry.ts` |
| Chỉ refactor thuần (lib) | mapping cột liên quan | module README nếu đổi hành vi |

**Không** mở [`data/`](../data/) trừ khi chạy script seed. **Không** mở [`archive/pilot_chain_*.tar.gz`](../archive/) trừ khi tra lịch sử migration.

**Khám phá / câu hỏi tổng hợp:** [`../wiki/entities.md`](../wiki/entities.md) — không thay read-minimum khi sửa code.
