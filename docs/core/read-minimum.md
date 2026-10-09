# Đọc tối thiểu theo loại thay đổi

> Cửa: [`../../CLAUDE.md`](../../CLAUDE.md) (ssot-map → `/domain-slice` → handover §5 → file lát). Bảng dưới là đọc thêm theo loại diff — không thay cửa.

| Loại diff | Đọc bắt buộc | Tra cứu thêm |
|-----------|--------------|--------------|
| Bất kỳ | `CLAUDE.md`, skill module trong `.claude/skills/` | [`implementation-mapping.md`](implementation-mapping.md) |
| UI layout / shell | [`wiki/concepts.md`](../wiki/concepts.md#layout-primitives) · [`page-chrome-contract-20260731.md`](../reference/architecture/page-chrome-contract-20260731.md) khi đụng shell/chrome | [`engineering-guidelines.md`](engineering-guidelines.md) §2 |
| Server Action / `fact_*` | [`operations-sop.md`](operations-sop.md) § Auth/RLS | `verify:engineering` |
| Migration / RPC / view | [`operations-sop.md`](operations-sop.md) § DB + [`governance-pipeline.md`](governance-pipeline.md) | rule `migrations.md` |
| CSSD workflow / QR / mẻ / dụng cụ | [`domain-specification.md`](domain-specification.md) §2.2 + [`modules/cssd/domain-overview.md`](../modules/cssd/domain-overview.md) + mapping § CSSD · quyết định Phase 0 [`domain-decisions-cssd-instrument.md`](domain-decisions-cssd-instrument.md) | [`modules/cssd/README.md`](../modules/cssd/README.md) · rule `cssd.md` |
| MDM / danh mục / import | [`domain-specification.md`](domain-specification.md) (MDM) + rule `mdm.md` | [`modules/mdm/README.md`](../modules/mdm/README.md) · [`reference/guides/json-import-export.md`](../reference/guides/json-import-export.md) |
| Giám sát VST/GSC | [`domain-specification.md`](domain-specification.md) (Giám sát) | [`modules/giam-sat/README.md`](../modules/giam-sat/README.md) · rule `giam-sat.md` |
| NKBV | [`modules/nkbv/README.md`](../modules/nkbv/README.md) | rule `nkbv.md` |
| QLCV | mapping § Công việc | [`modules/qlcv/19-QLCV-DOMAIN-SSOT.md`](../modules/qlcv/19-QLCV-DOMAIN-SSOT.md) · rule `qlcv.md` |
| Bảng kiểm template | [`modules/giam-sat/bang-kiem-overview.md`](../modules/giam-sat/bang-kiem-overview.md) | rule `giam-sat.md` |
| Dashboard / RPC báo cáo | [`modules/dashboard/README.md`](../modules/dashboard/README.md) · [`metric-dictionary.md`](../modules/dashboard/metric-dictionary.md) | rule `dashboard.md` |
| Đào tạo / thi MCQ | [`modules/dao-tao/domain-overview.md`](../modules/dao-tao/domain-overview.md) | rule `dao-tao.md` |
| RBAC / tài khoản | [`operations-sop.md`](operations-sop.md) | `permission-registry.ts` |
| Chỉ refactor thuần (lib) | mapping cột liên quan | module README nếu đổi hành vi |

**Không** mở [`data/`](../data/) trừ khi chạy script seed. Không mở `_agent-*` hay CDC/NHSN thô khi sửa code. Lịch sử cũ tra cứu qua git log.

**Khám phá / câu hỏi tổng hợp:** [`../wiki/entities.md`](../wiki/entities.md) — không thay read-minimum khi sửa code.
