> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`open-backlog-20260731.md`](../../../reference/architecture/open-backlog-20260731.md) · nợ [`debt-register.md`](../../../reference/architecture/debt-register.md) § Perf. Tra cứu lịch sử được.

# Perf fix progress — 2026-09-07 (Asia/Saigon)

Source backlog: [`_agent-whole-app-complexity-perf-20260907.md`](./_agent-whole-app-complexity-perf-20260907.md)  
Scope: **Batch 1–9**.  Local Mac · no commit/push.

---

## Batch 1 — landed

### 1. QT Bộ dụng cụ — `getBoDungCuRowsAction` + `BoDungCuPage`

| Before | After |
|--------|--------|
| `select("*")` full `v_cssd_bo_dung_cu_summary` + join all loai/khoa on every mount | Server page: **20**/page (max **50**), narrow `BO_LIST_SELECT`, `count: "exact"` + `.range` |
| Client search/filter on full array; loai filter by name from loaded rows | `useServerPaginatedTable`; search `ma_bo/ten_bo/ghi_chu/quy_cach`; filters **loai id / khoa id / active** server-side |
| No totalCount | Returns `{ data, totalCount }` like Loại |

Files:
- `src/modules/quan-tri-he-thong/danh-muc/lib/bo-dung-cu-list-query.ts` (+ `.spec.ts`)
- `src/modules/quan-tri-he-thong/danh-muc/actions/bo-dung-cu.actions.ts`
- `src/modules/quan-tri-he-thong/danh-muc/dung-cu/BoDungCuPage.tsx`
- `src/modules/quan-tri-he-thong/danh-muc/dung-cu/bo-dung-cu-page-header.tsx`

BOM Dialog: still opens from selected row; `boOptions` = **current page** (presetBoId keeps create-on-selected-bộ). Loại tab sheet unchanged.

### 2. `/cssd-dung-cu` — search-first catalog

| Before | After |
|--------|--------|
| Mount calls `getKhoCatalogPayloadAction` → full active bộ + meta + hóa chất + khoa | Mount/typeahead: `searchKhoCatalogBoAction` / `searchKhoCatalogLoaiAction` **limit 20** (max 50) |
| QR resolve relied on in-memory full `catalog.bo` | `searchKhoCatalogBoAction` + `getKhoCatalogBoByIdAction` + existing chi tiết/loại search + QR hub lookup |

Files:
- `src/modules/cssd-erp/actions/cssd-catalog-search.actions.ts` (`searchKhoCatalogBo*`, `getKhoCatalogBoByIdAction`, `searchKhoCatalogHoaChatAction`)
- `src/modules/cssd-erp/hooks/use-cssd-catalog-page.ts`
- `src/modules/cssd-erp/actions/cssd-catalog.actions.ts` (legacy full payload kept, documented not for first paint)
- `src/modules/cssd-erp/lib/cssd-catalog-page-helpers.spec.ts`

### Limits chosen (Batch 1)

- **20** default page / typeahead (aligned `FACT_LIST_DEFAULT_PAGE_SIZE` / Loại / existing kho search `PAGE`).
- **50** hard cap (same as Loại list + FactList schema max).

---

## Batch 2 — landed

### 1. `fetchCssdKhoDungCuList` / kho tab

| Before | After |
|--------|--------|
| `v_cssd_quy_trinh_full.select("*").limit(8000)` | Narrow `KHO_LIST_SELECT`; default **50**, max **200** |
| Red-alert overlay `cssd_fact_su_co` **limit 5000** global | Scoped to page IDs/QRs (`.in`); BROKEN uses capped red id OR |
| Bộ join `select("*")` | `KHO_BO_SELECT` (id/ma/ten/khoa) |
| Client-only station / FEFO / search | Server filters: station chip, FEFO ≤7d, search; `committedSearch` on Enter |
| QR miss when outside 8k window | `fetchCssdKhoDungCuByLookup` (id / QR / ten, limit 20) |

Files:
- `src/modules/cssd-erp/lib/cssd-kho-list-query.ts` (+ `.spec.ts`)
- `src/modules/cssd-erp/actions/cssd-kho-read.actions.ts`
- `src/modules/cssd-erp/views/KhoDungCuPage.tsx`

**Residual (resolved in Batch 6.1):** was window counts → now `rpc_cssd_kho_station_counts`. Exact QR path OK.

### 2. NKBV `limit(8000)` filter path

| Before | After |
|--------|--------|
| `nkbv_fact_vi_sinh` + `nkbv_fact_su_kien` blind **limit(8000)** for `chuaPhanTichOnly` | Positives: server `.or` + `.neq(AM_TINH)`, cap **1500**; su_kien keyed by candidate `ma_benh_an` chunks (**80** BA / **500** rows) |
| BA list `select("*")` | Narrow `BA_LIST_SELECT` (edit-modal fields kept) |
| `pageSize \|\| 15` uncapped | Clamp **1–50** (default **20**) |
| Device priority helper limit 3000 | **1500** |

Files:
- `src/modules/giam-sat-nkbv/lib/nkbv-chua-phan-tich-scan.ts` (+ `.spec.ts`)
- `src/modules/giam-sat-nkbv/actions/giam-sat-nkbv-read.actions.ts`

**Residual (resolved in Batch 6.2):** was 1500 FE scan → now `fn_nkbv_ba_keys_chua_phan_tich` / `v_nkbv_vi_sinh_chua_phan_tich`.

### 3. `listMasterRows` / generic master CRUD

| Before | After |
|--------|--------|
| `select("*")` **no limit** | Always `.limit` — UI default **200** (max **500**); export purpose max **2000** |
| No search | Optional `search` + `searchColumns` (ilike OR) |
| Callers assumed full dump | `listGenericDmAction` passes ma/ten columns; import/export uses `purpose: "export"` |

Files:
- `src/modules/quan-tri-he-thong/danh-muc/lib/master-list-query.ts` (+ `.spec.ts`)
- `src/modules/quan-tri-he-thong/danh-muc/actions/master-crud-core.ts` (+ spec limit assert)
- `src/modules/quan-tri-he-thong/danh-muc/actions/generic-dm.actions.ts`
- `src/modules/quan-tri-he-thong/danh-muc/actions/generic-dm-import.actions.ts`

**Residual:** Generic DM UI still one-shot load (≤200) — fine for lookup tables; very large physical masters (e.g. if routed here) need search. Dropdowns elsewhere should keep their own capped option lists (not this path).

### Limits chosen (Batch 2)

| Path | Default | Max |
|------|---------|-----|
| Kho list | 50 | 200 |
| Kho QR lookup | — | 20 |
| Master UI list | 200 | 500 |
| Master export | 2000 | 2000 |
| NKBV chua-PT vi_sinh scan | — | 1500 |
| NKBV BA pageSize | 20 | 50 |

---

## Batch 3 — landed

### Goal
Lazy/split NKBV mega panels off **default list first paint** without breaking clinical workflows (default «cases» tab, Hub BA, deep links `?ba=` / `?xn=` / `?tab=` / `?case=`).

### 1. Main entry — `GiamSatNkbvPage` (~1174)

| Before | After |
|--------|--------|
| Static import Hub + MultiTimeline chain + IWP + portals + editor + checklist + MDRO + mau-so | `next/dynamic` islands for all secondary tabs/modals/Hub; default «cases» only keeps table chrome + light `NkbvCdcLocationBanner` |
| Dashboard already dynamic (`ssr: false`) | Still dynamic; dropped nested `ssr: false` (route `page.tsx` already `ssr: false` for whole page) |

Deep links: `?tab=vi-sinh|mau-so|dashboard|records` still mount the matching island; `?ba=` / Hub open still loads Hub → MultiTimeline; `?case=` still opens checklist/editor after their chunks load.

### 2. Hub — `NkbvBenhAnHubPanel`

| Before | After |
|--------|--------|
| Eager `NkbvBaMultiTimelineWorkspace` (~2180) + `NkbvBaCaseSheet` (+ DiagnosticCaseForm) | Both `dynamic()` — timeline when Hub opens; case sheet only when «Tạo phiếu» sheet open |

### 3. MultiTimeline syndrome panels

| Before | After |
|--------|--------|
| Eager IWP (~1635) + SSI (~769) + Shell (~265) | Each `dynamic()` when that session panel is open |
| `isShellPanel` / `vaeBaReadyToCreatePhieu` imported from Shell module (pulled whole panel) | Tiny lib `nkbv-syndrome-shell-helpers.ts`; Shell re-exports for compat |

### 4. Optional — clinical sub-forms

`NkbvDiagnosticCaseForm` no longer statically imports all six `*ClinicalSubForm`; each loads via `dynamic()` for the active checklist type only. Main entry never imported sub-forms directly; Hub/Checklist path no longer pulls all six on first open of DiagnosticCaseForm either.

### Files (Batch 3)

- `src/modules/giam-sat-nkbv/views/GiamSatNkbvPage.tsx`
- `src/modules/giam-sat-nkbv/components/NkbvBenhAnHubPanel.tsx`
- `src/modules/giam-sat-nkbv/components/NkbvBaMultiTimelineWorkspace.tsx`
- `src/modules/giam-sat-nkbv/components/NkbvSyndromeShellPanel.tsx` (helpers extracted / re-export)
- `src/modules/giam-sat-nkbv/lib/nkbv-syndrome-shell-helpers.ts` **(new)**
- `src/modules/giam-sat-nkbv/components/NkbvDiagnosticCaseForm.tsx`

### First-paint impact (qualitative)

- **Default `/giam-sat-nkbv` («cases»):** no longer parses/hydrates MultiTimeline (~2180), IWP (~1635), SSI/Shell, Hub, ViSinh/MauSo portals, CaseEditor, Checklist modal, DiagnosticCaseForm, or six clinical sub-forms on first paint.
- **Open Hub BA:** pays MultiTimeline (+ day grid) chunk; IWP/SSI/Shell deferred until a syndrome session opens.
- **Open phiếu form:** CaseSheet → DiagnosticCaseForm → **one** sub-form chunk.
- Tradeoff: brief pulse/skeleton on first open of each island (tab or panel); subsequent navigations use cached chunks.

### Gates (Batch 3)

- `npx tsc --noEmit` — pass
- `npx vitest run src/modules/giam-sat-nkbv` — **58 files / 421 tests** pass

---

## Batch 4 — landed

### Goals
1. **QLCV / nhiệm vụ** — remove rollup `limit(5000)` + unbounded year list; server page + lean rollup.
2. **Đào tạo ngân hàng** — no full-dump on mount (`limit 500` list / `5000` export / `10000` import reconcile); search-first + page; keyed import lookup.

Batch 5 targets (then): cssd-su-co mega form split, dashboard `ssr:false` policy, kho global counts RPC — see Batch 5 below.

### 1. QLCV nhiệm vụ

| Before | After |
|--------|--------|
| `listNhiemVuByNam(nam)` — all active NV for year, no page / no count | Server page **20** (max **50**), `count: "exact"` + `.range`; period filter (NAM/QUY/THANG) server-side via PostgREST `.or` |
| `attachTaskRollup` — `select(...,checklist)` **limit 5000** for all NV on list | Narrow `NHIEM_VU_ROLLUP_SELECT` (no checklist); **cap 500**; uses synced `phan_tram_hoan_thanh` |
| Client `nhiemVuMatchesPeriod` after full year load | Period on server; UI `ServerPaginationBar` |
| Task assignment expand / `listCongViecByNhiemVu` (limit 200) / `listNhiemVuOptions` (500) | Unchanged — assignment path intact |

Files:
- `src/modules/quan-ly-cong-viec/lib/nhiem-vu-list-query.ts` (+ `.spec.ts`) **(new)**
- `src/modules/quan-ly-cong-viec/lib/qlcv-query-limits.ts` (re-exports NV caps)
- `src/modules/quan-ly-cong-viec/actions/nhiem-vu.actions.ts`
- `src/modules/quan-ly-cong-viec/components/NhiemVuPanel.tsx`

**Residual:** If one page of NV (>20) has >500 child tasks total, rollup % may undercount older tasks on that page (document cap). True aggregate RPC later optional.

### 2. Đào tạo — ngân hàng câu hỏi

| Before | After |
|--------|--------|
| Mount `listCauHoiDaoTao({ limit: 500 })` + full `phuong_an`/`dap_an_dung` | Server page **20** (max **50**), UI select narrow; search `ma_cau`/`stem` (Enter) |
| `getBankStats` — `select("loai")` all active rows | Head `count` + per-loai head counts (4) |
| `getDaoTaoBankForExport` **limit 5000** | Cap **2000** (export button only — not first paint) |
| Import `existing` **limit 10000** full bank | Keyed `.in(ma_cau)` chunks of 100; soft-delete scan per `chu_de_ma` cap **2000** narrow cols |
| `listChuDeDaoTao` unbounded `chu_de_*` | Narrow scan **limit 2000** + unique |

Files:
- `src/modules/dao-tao/lib/dao-tao-bank-list-query.ts` (+ `.spec.ts`) **(new)**
- `src/modules/dao-tao/actions/dao-tao-bank.actions.ts`
- `src/modules/dao-tao/views/AdminNganHangPage.tsx`

**Residual:** Export/import soft-delete scan may miss beyond 2000 rows per chủ đề / export window — document; schema view/RPC if bank grows past that.

### Limits chosen (Batch 4)

| Path | Default | Max |
|------|---------|-----|
| Nhiệm vụ list page | 20 | 50 |
| Nhiệm vụ rollup tasks / page | — | 500 |
| Bank UI list page | 20 | 50 |
| Bank export | — | 2000 |
| Bank import chu-de scan | — | 2000 |
| Bank chủ đề dropdown scan | — | 2000 |

### Gates (Batch 4)

- `npx tsc --noEmit` — pass
- `npx vitest run` nhiem-vu-list-query + dao-tao-bank-list-query + ke-hoach-nam-format + `src/lib/dao-tao` — **7 files / 29 tests** pass
- `npx vitest run src/modules/quan-ly-cong-viec` — **17 files / 108 tests** pass

---
## Batch 5 — landed

### Goals
1. **cssd-su-co** mega form — `next/dynamic` per incident group / heavy panels so default PROCESS first paint does not load all tabs' code; preserve SSOT v2 + deep links.
2. **Dashboard / báo cáo `ssr:false`** — measure first; only low-risk lazy islands (do **not** flip SSR on).
3. **Kho global counts RPC** — only if small safe win; else document defer.

### 1. `/cssd-su-co` form code-split

| Before | After |
|--------|--------|
| `SuCoReportForm` statically imported Instrument reconcile/move tables (~246+109 + Replenish 385 + Transfer 351) + full `SuCoReportFormFields` (743) incl. `IncidentPrintView` (406) | Default **PROCESS**: shared fields only (~427) + meta; instrument tables / BATCH / CHEMICAL / EQUIPMENT / OTHER / success+print are `next/dynamic` islands |
| `SuCoIncidentMetaFields` imported `getGoogleDriveDirectLink` from `IncidentPrintView` → pulled print chunk on every form | Helper moved to `lib/google-drive-direct-link.ts`; print view re-exports |
| `IncidentReportModal` (quy trình / mẻ / HC / TB) static-imported whole mega form | `dynamic(() => import(SuCoReportForm))` — modal open pays form chunk |

Deep links: `?group=` / `?type=` / `?entry=batch-recall` still set initial group/type; matching island mounts on first paint for that group (brief pulse). SSOT v2 cause checklist / 3 cửa / batch-recall entry unchanged.

Files:
- `src/modules/cssd-su-co/components/SuCoReportForm.tsx` (dynamic islands)
- `src/modules/cssd-su-co/components/SuCoReportFormFields.tsx` (shared PROCESS chrome only)
- `src/modules/cssd-su-co/components/SuCoReportFormBatchFields.tsx` **(new)**
- `src/modules/cssd-su-co/components/SuCoReportFormChemicalFields.tsx` **(new)**
- `src/modules/cssd-su-co/components/SuCoReportFormEquipmentFields.tsx` **(new)**
- `src/modules/cssd-su-co/components/SuCoReportFormOtherFields.tsx` **(new)**
- `src/modules/cssd-su-co/components/SuCoReportSubmittedSuccess.tsx` **(new)**
- `src/modules/cssd-su-co/components/su-co-form-types.ts` **(new)**
- `src/modules/cssd-su-co/lib/google-drive-direct-link.ts` **(new)**
- `src/modules/cssd-su-co/components/IncidentReportModal.tsx`, `IncidentPrintView.tsx`, `SuCoIncidentMetaFields.tsx`, `InstrumentSetReconcileTable.tsx`, `InstrumentMoveDualTable.tsx`

### 2. Dashboard / báo cáo `ssr:false` (measure → low-risk only)

| Finding | Action |
|---------|--------|
| `/` and `/bao-cao-tong-hop` already route-level `dynamic(..., { ssr: false })` for auth + Recharts hydrate | **No SSR flip** (would risk auth/charts) |
| Báo cáo chart sections already `dynamic()` (Trend/Compare/NKBV/…); «more» sections gated by `moreSectionsOpen` | Kept |
| Print path eagerly imported `bao-cao-tong-hop-print` (+ sections ~477 + charts SVG) on every báo cáo mount | **Lazy**: `await import("../lib/bao-cao-tong-hop-print")` inside print click only |
| Command Center has no Recharts in shell (rate glance + decision queue) | No change |

File: `src/modules/dashboard/hooks/use-bao-cao-tong-hop-print.ts`

### 3. Kho global station counts RPC — **deferred**

InventoryDashboard still counts within the **fetched list window** (Batch 2 residual). Exact warehouse totals need a dedicated count RPC / view (schema thaw) — not a safe one-file FE win in Batch 5. Chip filters remain server-side; QR lookup intact.

### Gates (Batch 5)

- `npx tsc --noEmit` — pass
- `npx vitest run src/modules/cssd-su-co` + `bao-cao-tong-hop-core.spec` — **10 files / 79 tests** pass

---

## Overall summary — Batches 1–9

| Batch | Theme | Main outcome |
|-------|--------|--------------|
| **1** | QT Bộ + `/cssd-dung-cu` catalog | Server page 20/50; search-first catalog (no full mount dump) |
| **2** | Kho list + NKBV «chưa PT» + master list | Narrow selects + caps; red-alert scoped; master always `.limit` |
| **3** | NKBV mega UI | `dynamic` secondary tabs/Hub/syndrome/sub-forms off default «cases» |
| **4** | QLCV NV + Đào tạo NHCH | NV page+lean rollup; bank search-first page + keyed import |
| **5** | Su-cố form + báo cáo print island | Group/instrument/print islands; print HTML on-demand; SSR policy measured (no flip); kho counts deferred |
| **6** | Kho counts RPC + NKBV chưa-PT RPC | Global chip counts; BA keys from SQL (no 1500 scan); 6.3 skipped |
| **7** | Kanban + bank cursor + BOM typeahead + GSC lazy | Per-column ≤40×4 + load-more; export/import continuation; bộ server typeahead; template options off first paint |
| **8** | Shell RBAC + offline by region | Soft RBAC hydrate + session cache; CSSD/GS offline only; SSR spike SKIP |
| **9** | IA menu + hub Loại + debt | Vận hành/Tra cứu/Sửa danh mục; hub `?tab=loai`; legacy redirects; PERF-01…07 in debt-register |

---

## Batch 6 — landed (6.1 + 6.2; 6.3 skipped)

### Goals
1. **Kho global station counts** — InventoryDashboard chips = warehouse-wide, not list page window.
2. **NKBV «chưa phân tích»** — replace positive-XN FE scan capped at 1500 with SQL view/RPC.
3. **(Optional) NV rollup aggregate RPC** — skipped (not cheap residual after 6.1–6.2).

### Migrations applied (prod `cvzwslpxwgqiugzzhqej`)
| Migration | Objects |
|-----------|---------|
| `20260907140000_cssd_kho_station_counts_rpc.sql` | `rpc_cssd_kho_station_counts()` |
| `20260907141000_nkbv_chua_phan_tich_rpc.sql` | `fn_nkbv_norm_vi_sinh_id`, `v_nkbv_vi_sinh_chua_phan_tich`, `fn_nkbv_ba_keys_chua_phan_tich()` |

Local copies under `supabase/migrations/` (same SQL). Applied via Supabase MCP `apply_migration`.

### 6.1 Kho station counts

| Before | After |
|--------|--------|
| InventoryDashboard counted within fetched list window (≤50) | `rpc_cssd_kho_station_counts` → chips + FEFO badge use global totals |
| FEFO / search scoped the same window for chip math | Chips independent of list page; list still server-filtered |

Files:
- `supabase/migrations/20260907140000_cssd_kho_station_counts_rpc.sql`
- `src/modules/cssd-erp/lib/cssd-kho-list-query.ts` (+ `.spec.ts`) — `KhoStationCounts` / `parseKhoStationCounts`
- `src/modules/cssd-erp/actions/cssd-kho-read.actions.ts` — `fetchCssdKhoStationCounts`
- `src/modules/cssd-erp/components/inventory/InventoryDashboard.tsx` — `counts` prop
- `src/modules/cssd-erp/views/KhoDungCuPage.tsx` — fetch counts on mount / refetch

Smoke probe (prod): warehouse currently **0** active `cssd_fact_quy_trinh` → all counts 0 (RPC healthy).

### 6.2 NKBV «chưa phân tích»

| Before | After |
|--------|--------|
| FE scan positives `limit(1500)` + chunked su_kien + client disposition | `fn_nkbv_ba_keys_chua_phan_tich()` → BA keys; list `.in` / chunked `or` |
| Cap could miss older (+) XN | View `v_nkbv_vi_sinh_chua_phan_tich` = full SSOT (index + attributed + metadata disposition) |

Files:
- `supabase/migrations/20260907141000_nkbv_chua_phan_tich_rpc.sql`
- `src/modules/giam-sat-nkbv/lib/nkbv-chua-phan-tich-scan.ts` (+ `.spec.ts`) — `normalizeChuaPhanTichBaKeys`; scan cap deprecated for list path
- `src/modules/giam-sat-nkbv/actions/giam-sat-nkbv-read.actions.ts` — `listNkbvMedicalRecords` uses RPC

Smoke probe (prod): **92** XN / **78** BA on view/RPC.

### 6.3 NV rollup — skipped
Still capped at 500 tasks/page of NV (Batch 4 residual). Revisit if measured undercount.

### Gates (Batch 6)
- `npx tsc --noEmit` — pass
- `npx vitest run` cssd-kho-list-query + nkbv-chua-phan-tich-scan + nkbv-vi-sinh-analysis-status — **3 files / 15 tests** pass

### Residual for Batch 8+
| Item | Notes |
|------|--------|
| Gate stats / exec print from loaded board window | Counts approximate when hasMoreByColumn |
| NV rollup true aggregate RPC | Optional (6.3 deferred) |
| Pending đề xuất `select("*")` uncapped | Separate residual (dexuat.actions) |
| Shell RBAC hydrate / offline / SSR spike | **Batch 8 landed** |
| IA menu / hub default tab | **Batch 9 landed** |

---

## Batch 7 — landed

### Goals
1. **QLCV Kanban** — stop mount dump up to 10k (500×20); per-column page + load-more.
2. **Đào tạo bank >2000** — export/import soft-delete continuation; no silent 2000 truncate.
3. **BOM `boOptions`** — server typeahead when picking bộ in chi-tiết form.
4. **GSC form** — lazy template options off first paint.

### 7.1 QLCV Kanban

| Before | After |
|--------|--------|
| `fetchAllActiveRootTasksInScope` loop **500×20 = 10_000** on every mount | `getCongViecBoardSnapshot`: **4 cột × 40** parallel (~160 max first paint) |
| No per-column continuation | `getCongViecBoardColumnPage` + «Tải thêm» per column |
| Badge = full column length of dump | Badge shows loaded count; `+` when `hasMoreByColumn` |

Files:
- `src/modules/quan-ly-cong-viec/lib/qlcv-query-limits.ts`
- `src/modules/quan-ly-cong-viec/lib/qlcv-board-column-query.ts` (+ `.spec.ts`) **(new)**
- `src/modules/quan-ly-cong-viec/actions/cong-viec.actions.ts`
- `src/modules/quan-ly-cong-viec/hooks/useQlcvKanban.ts`
- `src/modules/quan-ly-cong-viec/components/CongViecKanban.tsx`
- `src/modules/quan-ly-cong-viec/components/QlcvOperationsPanel.tsx`

**Residual:** Gate stats / period print still derive from **loaded** board rows (not warehouse-wide counts). Pending đề xuất path still unbounded `select("*")`.

### 7.2 Đào tạo bank export / soft-delete scan

| Before | After |
|--------|--------|
| Export single `.limit(2000)` — silent truncate | Range pages **500**; hard max **20_000**; returns `{ rows, truncated, scanned }` + toast warning if truncated |
| Soft-delete scan `.limit(2000)` per chủ đề | Continuation `.range` pages of **500** to hard max **20_000**; dryRun message flags scan truncate |

Files:
- `src/modules/dao-tao/lib/dao-tao-bank-list-query.ts` (+ `.spec.ts`)
- `src/modules/dao-tao/actions/dao-tao-bank.actions.ts`
- `src/modules/dao-tao/views/AdminNganHangPage.tsx`

### 7.3 BOM `boOptions` typeahead

| Before | After |
|--------|--------|
| `<select>` bound to current list page only | `BoDungCuTypeahead` + `searchBoDungCuOptionsAction` / `getBoDungCuOptionByIdAction` |

Files:
- `src/modules/quan-tri-he-thong/danh-muc/actions/bo-dung-cu.actions.ts`
- `src/modules/quan-tri-he-thong/danh-muc/dung-cu/bo-dung-cu-typeahead.tsx` **(new)**
- `src/modules/quan-tri-he-thong/danh-muc/dung-cu/dung-cu-chi-tiet-form-modal.tsx`

### 7.4 GSC form template sync

| Before | After |
|--------|--------|
| `useEffect([])` → `loadGscTemplateOptions()` on every form mount | Lazy `ensureDbTemplates` only when switching mẫu; first paint keeps `initialTemplate` |

File: `src/modules/giam-sat-chung/hooks/use-giam-sat-chung-form.ts`

### Gates (Batch 7)
- `npx tsc --noEmit` — pass
- `npx vitest run` quan-ly-cong-viec + dao-tao/lib — **18 files / 112 tests** pass

### Limits chosen (Batch 7)

| Path | Default | Max / hard |
|------|---------|------------|
| Kanban column page | 40 | 80 |
| Kanban mount (4 cols) | ≤160 | — |
| Bank export page | 500 | hard 20_000 |
| Bank import chu-de scan page | 500 | hard 20_000 |
| Bộ typeahead | 20 | 50 |

---

---

## Batch 8 — landed (shell đổi trang)

### Goals
1. **RBAC hydrate mỏng** — stop full-matrix refetch on every navigation; session cache; gates keep working.
2. **Offline listeners by region** — giám sát / CSSD only (not admin/login/global).
3. **SSR-safe shell spike** — documented **SKIP** (do not flip `/` or báo cáo SSR).

### 8.1 Thin RBAC hydrate

| Before | After |
|--------|--------|
| `RbacRefreshListener` **invalidate + refetch on every pathname** (+ every 30s poll) | Soft refresh only on **visibility** + **5′ poll**; no pathname nuke |
| Memory cache TTL 5′ useless under nav invalidation | Memory + **sessionStorage** (`bv103_rbac_client_v1`); stale-while-revalidate ≤30′ |
| `TOKEN_REFRESHED` could refetch while cache fresh | Skip refetch when TTL still fresh |
| Sidebar still needs full nav matrix | **Incremental:** one view row still loads full `permissions` (needed for menu gates); thinness = **don't re-fetch / don't block** on route change — not a per-module rewrite |

Files:
- `src/contexts/PermissionProvider.tsx`
- `src/components/shared/RbacRefreshListener.tsx`

**Safety:** Hard invalidate via `invalidateClientRbacCache` + `rbac:invalidate` still clears cache (admin matrix change path). Soft path never clears UI permissions while revalidating.

### 8.2 Offline listeners by region

| Before | After |
|--------|--------|
| `OfflineSyncManager` in root `layout.tsx` (login + every page) | Mounted only when `pathnameNeedsCssdOfflineSync` |
| `SupervisionOfflineSyncListener` on every authenticated shell | Only `pathnameNeedsSupervisionOfflineSync` (giam-sat* / qr) |
| Eager CSSD imports inside OfflineSyncManager | Dynamic `import()` inside sync loop |

Files:
- `src/lib/offline-sync-scope.ts` (+ `.spec.ts`) **(new)**
- `src/components/shared/ClientLayoutWrapper.tsx`
- `src/app/layout.tsx`
- `src/components/shared/OfflineSyncManager.tsx`

**Safety:** Pending queues still flush when user re-enters CSSD / giám sát routes (listener mounts → online/check). Admin/login no longer pay 5s CSSD queue poll or supervision 60s poll.

### 8.3 SSR-safe shell — SKIP
See `docs/reference/reports/_agent-perf-batch8-ssr-shell-spike-20260907.md`. `/` and `/bao-cao-tong-hop` stay `ssr: false` (auth + Recharts). No flip in this pass.

### Gates (Batch 8)
- `npx tsc --noEmit` — pass
- `npx vitest run` offline-sync-scope + guest-stats-access + quan-tri-access + nav specs — **5 files / 18 tests** pass



## Batch 9 — landed (IA / cửa vào)

### Goals
1. **Lock menu/IA copy** — Vận hành / Tra cứu / Sửa danh mục (CSSD sidebar + quan-tri hub); one-task-one-surface; no fake menus.
2. **Hub «Quản lý dụng cụ»** default **Loại** (`?tab=loai`); Bộ one click on tab strip.
3. **Legacy redirects** — confirm `cssd-erp*`; fix stale `tai-khoan-nhan-su` → `tai-khoan` (was wrongly → `nhan-su`).
4. **Debt register** — PERF-01…07 so residual after Batches 6–9 is not lost.

### 9.1 IA copy

| Before | After |
|--------|--------|
| Sidebar admin group «Quản trị» | «**Sửa danh mục**» → item «Quản trị hệ thống» |
| CSSD groups already «Vận hành» / «Tra cứu» | Locked in comment + vitest |
| Hub job «Master CSSD» → bare `/dung-cu` | «**Sửa danh mục CSSD**» → `?tab=loai` |
| `/cssd-dung-cu` no IA one-liner | Tra cứu / Vận hành / Sửa danh mục → Quản trị link |

### 9.2 Hub default Loại

| Before | After |
|--------|--------|
| `quanTriDungCuHref()` / bare → Bộ | Default + bare → **`?tab=loai`**; `bo`/`chi-tiet` → `?tab=bo` |
| Hub catalog `dung-cu-bo` path `quanTriDungCuHref("bo")` | `quanTriDungCuHref("loai")` |
| `parseDungCuLayer(null)` → `bo` | → `loai` |

### 9.3 Legacy

| Path | Destination |
|------|-------------|
| `/cssd-erp`, `/batch`, `/catalog`, … | Unchanged (next.config → quy-trinh / dung-cu / …) |
| `/quan-tri-he-thong/tai-khoan-nhan-su` | **`/quan-tri-he-thong/tai-khoan`** (aligned with page.tsx hub) |
| `?sheet=loai` | Still normalizes → `?tab=loai` |

### 9.4 Debt
See `docs/reference/architecture/debt-register.md` § «Perf / complexity residual — Batches 1–9».

### Files (Batch 9)
- `src/lib/master-data/quan-tri-paths.ts` (+ `.spec.ts`)
- `src/lib/master-data/danh-muc-hub-catalog.ts` (+ `.spec.ts`)
- `src/lib/master-data/quan-tri-hub-jobs.ts` (+ `.spec.ts`)
- `src/lib/nav/sidebar-admin-nav-groups.ts`
- `src/lib/nav/sidebar-nav-groups.ts` (+ `.spec.ts` **new**)
- `src/modules/quan-tri-he-thong/danh-muc/dung-cu/QuanLyDungCuPage.tsx`
- `src/app/cssd-dung-cu/page.tsx`
- `src/modules/quan-tri-he-thong/actions/system-health-brief.actions.ts`
- `next.config.ts`
- `docs/reference/architecture/debt-register.md`

### Gates (Batch 9)
- `npx tsc --noEmit` — pass
- `npx vitest run` quan-tri-paths + danh-muc-hub-catalog + quan-tri-hub-jobs + danh-muc-admin-routes + sidebar-nav-groups + redirect-with-query + quan-tri-access + guest-stats-access + offline-sync-scope — **9 files / 28 tests** pass

### Residual after Batches 6–9
| Item | Notes |
|------|--------|
| PERF-01 NV rollup RPC | Optional when undercount measured |
| PERF-02 Kanban gate/print window counts | Approximate when hasMore |
| PERF-03 Pending đề xuất uncapped | Separate FE pass |
| PERF-04…07 | P3 — nav slice / SSR / bank 20k / generic DM |

---

## Overall Batches 6–9 (short)

| Batch | Outcome |
|-------|---------|
| **6** | Kho global counts + NKBV chưa-PT SQL |
| **7** | Kanban page + bank cursor + BOM typeahead + GSC lazy |
| **8** | Thin RBAC + offline by region; SSR spike SKIP |
| **9** | IA lock + hub Loại default + legacy fix + debt PERF-* |

*Updated 2026-09-07 ~15:20 ICT · Batch 9 landed · Batches 6–9 complete (local, no commit/push).*
