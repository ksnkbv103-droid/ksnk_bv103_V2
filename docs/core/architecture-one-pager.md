# Kiến trúc KSNK BV103 — One-pager

> Tài liệu một trang cho reviewer / skeptic. Chi tiết sâu: [`implementation-mapping.md`](./implementation-mapping.md), [`domain-specification.md`](./domain-specification.md), [`../reference/architecture/system-overview.md`](../reference/architecture/system-overview.md).

## 1. System stack

| Tầng | Công nghệ |
|------|-----------|
| UI | Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Radix UI |
| Server | Server Actions, `src/proxy.ts` (auth trước RSC) |
| Data client | Supabase JS + TanStack Query v5 |
| DB | PostgreSQL (Supabase), migration SSOT trong `supabase/migrations/` |
| Validation | Zod (form + action contract) |
| CI / gates | ESLint, layout drift, `verify:engineering`, `pilot:go-live:gate` |

## 2. Module map & pilot wave

| Module | Thư mục | Wave | Ghi chú |
|--------|---------|------|---------|
| **MDM / Quản trị** | `quan-tri-he-thong/` | **W1** | Danh mục, nhân sự, RBAC, bảng kiểm + `ap_dung_jsonb` |
| **GSC** (giám sát chung) | `giam-sat-chung/` | **W1** | Checklist động, phiên, scoring |
| **VST** (vệ sinh tay) | `giam-sat-vst/` | **W1** | WHO 5 moments, offline queue |
| **QLCV** | `quan-ly-cong-viec/` | **W1** | Kanban, checklist RPC, spawn định kỳ |
| **CSSD** | `cssd-erp/` | **W2** | 6 trạm QR, ledger gate, hóa chất/thiết bị |
| **NKBV** | `giam-sat-nkbv/` | **W3** | CDC forms, adjudication |
| **Dashboard** | `dashboard/` | **W3** | Command Center `/`, báo cáo tổng hợp `/bao-cao-tong-hop` |

Env `KSNK_PILOT_CORE_MODULES=1` ẩn CSSD, NKBV, Dashboard — chỉ mở W1. Xem [`pilot-core-modules-go-live.md`](./pilot-core-modules-go-live.md).

## 3. Kiến trúc dữ liệu 3 tầng

```
{module}_fact_* / {module}_dm_*  (TABLE vật lý)
        ↓
v_{module}_*                     (view đọc — join, alias, full row)
        ↓
rpc_*                            (analytics, dashboard, batch read)
```

**Quy tắc:**

- Migration WRITE chỉ nhắm **TABLE physical** — không `ALTER` view.
- App `.from()` dùng prefix module (`gstt_fact_*`, `mdm_nhan_su`, …); cấm compat `dm_*`/`fact_*` (`legacy:guard`).
- Lookup 14 loại ghi `sys_lookup_value`; RBAC SSOT `sys_roles` / `sys_permissions`.
- Báo cáo / Command Center đọc qua **RPC**, không quét `fact_*` không giới hạn.

Prefix map: [`implementation-mapping.md`](./implementation-mapping.md) § Bản đồ Prefix.

## 4. Security model

| Lớp | Cơ chế |
|-----|--------|
| Auth | Supabase Auth ↔ `mdm_nhan_su.auth_user_id` |
| RBAC | Registry `sys_*`; sync `rbac-registry-sync` |
| App gate | `verifyPermission(moduleKey, action)` trên Server Actions |
| DB gate | RLS trên bảng nhạy cảm (CSSD ledger, MDM, …) |

**Pilot gaps (thành thật):**

- Một số bảng `gstt_fact_*` dùng RLS permissive `USING (true)` — **cửa app** (`verifyPermission`) là lớp chính cho GSC/VST; hardening RLS là hạng mục Phase 1, không chặn W1.
- QLCV: scope list server (`qlcv-list-scope`) + RBAC; RLS chưa thắt đủ như CSSD.
- Không hứa pentest-ready — có precheck `trial:auth:precheck` (`mdm_email_no_auth = 0`).

Chi tiết: [`operations-sop.md`](./operations-sop.md) § Auth & RBAC.

## 5. UI governance

- **Design tokens:** `src/lib/bv103-design-tokens.ts`, `bv103-layout-chrome.ts`, `bv103-panel-chrome.ts`
- **Module chrome:** `*-form-chrome.ts`, `*-table-chrome.ts` per domain
- **Gates:** `npm run layout:drift-check`, `layout:typography-check`, `panel:chrome-check`, `columns:chrome-check`
- **SSOT visual:** [`../reference/guides/bv103-visual-language.md`](../reference/guides/bv103-visual-language.md)

## 6. Verification gates

| Gate | Lệnh | Khi nào |
|------|------|---------|
| Full local | `npm run verify` | Trước push |
| App ↔ DB contract | `npm run verify:engineering` | Sau sửa action / `fact_*` |
| Schema | `npm run verify:mdm` | Sau migration |
| Pilot go-live | `npm run pilot:go-live:gate` | Trước ký W1 prod |

Checklist ký tay: [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md). Pipeline: [`governance-pipeline.md`](./governance-pipeline.md). Demo terminal live: [`demo-governance-gates.md`](./demo-governance-gates.md).

## 7. Clinical differentiators (không phải CRUD generic)

| Khác biệt | Mô tả ngắn |
|-----------|------------|
| **WHO VST** | Phiên 5 moments, scoring tự động, offline sync hành lang |
| **GSC dynamic checklist** | Bảng kiểm cấu hình → phiên giám sát động theo khoa/khối |
| **Bảng kiểm áp dụng** | `ap_dung_jsonb` trên `gstt_dm_bang_kiem` → analytics gap TGS vs KSNK |
| **CSSD 6-station QR** | Trạm 1–6, Digital BOM, ledger gate chặn phát trả không nhập kho |

Luồng nghiệp vụ: [`domain-specification.md`](./domain-specification.md).

## 8. Đọc tiếp

| Chủ đề | File |
|--------|------|
| Demo 10 phút (skeptic) | [`demo-script-skeptics-10min.md`](./demo-script-skeptics-10min.md) |
| Demo terminal gates | [`demo-governance-gates.md`](./demo-governance-gates.md) |
| Ship & agent workflow | [`../../AGENTS.md`](../../AGENTS.md) |
| Lean execution / DoD | [`lean-execution.md`](./lean-execution.md) |
| Lộ trình phase dài | [`../reference/architecture/roadmap-2026h2.md`](../reference/architecture/roadmap-2026h2.md) |
| Wiki entities | [`../wiki/entities.md`](../wiki/entities.md) |
