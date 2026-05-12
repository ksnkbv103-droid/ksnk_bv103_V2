# Specs Index

Thư mục này chỉ giữ tài liệu **cần cho phát triển và vận hành** KSNK BV103. Tra cứu cũ: lịch sử git.

## Bộ tối thiểu (ưu tiên đọc — tiết kiệm token)

1. [`AGENTS.md`](../../AGENTS.md)  
2. [`working/LEAN_EXECUTION_BV103.md`](./working/LEAN_EXECUTION_BV103.md)  
3. [`READ_MINIMUM_BY_CHANGE.md`](./READ_MINIMUM_BY_CHANGE.md)  
4. [`10-bv103-implementation-mapping.md`](./10-bv103-implementation-mapping.md) (khi đụng DB)  
5. [`GOVERNANCE_PIPELINE.md`](./GOVERNANCE_PIPELINE.md) (khi có migration)  
6. [`SKILLS_CATALOG.md`](./SKILLS_CATALOG.md) · [`.cursor/rules/00-core-ksnk-rules.mdc`](../.cursor/rules/00-core-ksnk-rules.mdc)  
7. Lộ trình theo mảnh: [`PROGRESS_REPORT.md`](../../PROGRESS_REPORT.md)  

Các mục dưới chỉ mở **khi task đụng đúng chủ đề** — không đọc hết mỗi PR.

## Router bổ trợ

| Nhu cầu | File |
| ------- | ---- |
| Ma trận UI → Action → DB | [`PREP0_UI_ACTION_DB_MATRIX.md`](./PREP0_UI_ACTION_DB_MATRIX.md) |
| Smart DB thực dụng | [`SMART_DB_PRAGMATIC_PLAYBOOK.md`](./SMART_DB_PRAGMATIC_PLAYBOOK.md) |
| Catalog skill | [`SKILLS_CATALOG.md`](./SKILLS_CATALOG.md) |
| Workflow agent đa bước | [`11-agent-workflow-delegation.md`](./11-agent-workflow-delegation.md) |
| Canonical vs legacy (mô tả) | [`CANONICAL_AND_LEGACY_MAP.md`](./CANONICAL_AND_LEGACY_MAP.md) |

## Bản tách nghiệp vụ (01–09)

Đọc theo thứ tự khi chạm luồng lớn hoặc master data:

- [`working/01-domain-checklist-ubiquitous-language.md`](./working/01-domain-checklist-ubiquitous-language.md) · [`02-adr-dm-dict-domain-registry.md`](./working/02-adr-dm-dict-domain-registry.md) · [`03-journeys-and-flows-catalog.md`](./working/03-journeys-and-flows-catalog.md) · [`04-system-boundaries-and-master-data.md`](./working/04-system-boundaries-and-master-data.md) · [`05-nfr-non-functional-requirements.md`](./working/05-nfr-non-functional-requirements.md) · [`06-clinical-ui-ux-guidelines.md`](./working/06-clinical-ui-ux-guidelines.md) · [`07-physical-erd-specification.md`](./working/07-physical-erd-specification.md) · [`08-api-integration-strategy.md`](./working/08-api-integration-strategy.md) · [`09-project-constitution-ai-governance.md`](./working/09-project-constitution-ai-governance.md)

## Hợp đồng / vận hành (working)

- RBAC & phạm vi: [`working/RBAC_SCOPE_MAPPING.md`](./working/RBAC_SCOPE_MAPPING.md)  
- Xuất VST: [`working/EXPORT_CONTRACT_VST.md`](./working/EXPORT_CONTRACT_VST.md)  
- Red flag: [`working/RED_FLAG_DICTIONARY.md`](./working/RED_FLAG_DICTIONARY.md)  
- Gói contract tối thiểu: [`working/PREP0_CONTRACT_PACK.md`](./working/PREP0_CONTRACT_PACK.md)  
- Sunset `danh_muc_tuy_bien`: [`working/SUNSET_TUY_BIEN_P0_BASELINE.md`](./working/SUNSET_TUY_BIEN_P0_BASELINE.md)  
- Đăng nhập / phân quyền vận hành: [`working/VANHANH_AUTH_RBAC_KSNK.md`](./working/VANHANH_AUTH_RBAC_KSNK.md)  
- Chuẩn kỹ thuật hợp nhất: [`working/UNIFIED_ENGINEERING_STANDARD_BV103.md`](./working/UNIFIED_ENGINEERING_STANDARD_BV103.md) · [`working/ENGINEERING_PRIORITY_HIERARCHY_BV103.md`](./working/ENGINEERING_PRIORITY_HIERARCHY_BV103.md) · [`working/ENGINEERING_KPI_BASELINE_BV103.md`](./working/ENGINEERING_KPI_BASELINE_BV103.md) · [`working/WEEKLY_ENGINEERING_REVIEW_BV103.md`](./working/WEEKLY_ENGINEERING_REVIEW_BV103.md)  
- Thực thi agent + CI: [`working/LEAN_EXECUTION_BV103.md`](./working/LEAN_EXECUTION_BV103.md) §6 · [`SKILLS_CATALOG.md`](./SKILLS_CATALOG.md) · audit [`working/SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md`](./working/SUPABASE_ADMIN_CLIENT_AUDIT_BV103.md)  

## Legacy (chỉ tham khảo)

- Index: [`legacy-only/README.md`](./legacy-only/README.md)  
- Monolith spec lịch sử: [`legacy-only/00-legacy-full-spec-monolith.md`](./legacy-only/00-legacy-full-spec-monolith.md)  

## Quyết định kiến trúc

- [`../decisions/`](../decisions/)

## Thứ tự ưu tiên khi có mâu thuẫn

1. `AGENTS.md`  
2. `.cursor/rules/*.mdc`  
3. `PROGRESS_REPORT.md` (nếu có)  
4. `docs/specs/*.md`  
5. `SKILLS_CATALOG.md` và skill trong `.agents/skills/` — chỉ bổ trợ kỹ thuật  
6. [`legacy-only/DATA_FLATTEN_REFERENCE.md`](./legacy-only/DATA_FLATTEN_REFERENCE.md) — tham khảo flatten/WHO (không SSOT schema)
