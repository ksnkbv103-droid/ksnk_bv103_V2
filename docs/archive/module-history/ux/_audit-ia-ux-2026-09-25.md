# Audit IA / UX toàn app — BV103 medical minimalism

| Field | Value |
|-------|-------|
| Date | 2026-09-25 (Asia/Saigon) |
| Auditor | Lead executor (local-only) |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| HEAD | `108a1630d1d9b39c2a184ed221ce630513e3502c` |
| Branch | `cursor/me-sync-recall-print` (ahead 6 vs origin; WT clean before this docs write) |
| Scope | Whole-app UI/UX & interaction — **audit + principles + phased backlog only** (no UI rewrite) |
| Method | Code/structure of shell + 7+ surfaces; prior audits (dashboard 2026-07, QLCV/CSSD 2026-09); locks GSC H2 · CSSD 6 stations · QLCV Domain 19 |
| Non-goals | No Word/Văn bản redesign · no Soft SXHD · no push / Cloud / Vercel / migrate |

**Companion:** [`principles.md`](../../../ux/principles.md). Visual tokens SSOT: [`docs/reference/guides/bv103-visual-language.md`](../../../reference/guides/bv103-visual-language.md) + `src/lib/bv103-design-tokens.ts`.

---

## 1. Executive summary

BV103 already has a **strong visual/token program** (chrome gates, page-chrome contract, dialect matrix) and **correct IA locks** at sidebar level (Báo cáo chính thức one door; Công việc separate; CSSD Vận hành / Tra cứu / Sửa danh mục). Remaining UX debt is **interaction & shell consistency**, not greenfield branding:

1. **App Header coarseness (CSSD)** — `getKsnkAppHeaderBreadcrumb` maps every CSSD prefix → `CSSD · Quản lý CSSD`. Page-specific names (`Chu trình…`, `Dụng cụ…`) are passed into `CSSDPageShell` → `KsnkSupervisionHero`, but **`showTitle` defaults false**, so titles are swallowed. Users lose wayfinding.
2. **Tab / chrome dialect drift** — VST/GSC use `SupervisionModeNav`; CSSD uses `CssdHorizTabButton`; QLCV uses Radix Tabs + `KsnkSupervisionTabList`; Analytics uses `Bv103AnalyticsPageFrame`. Same job, different look.
3. **Orphan empty-state** — `Bv103EmptyState` exists; **zero module consumers**.
4. **Modal density** — QLCV detail is a hub `Dialog` with nested confirms; Quản trị is modal-CRUD heavy; CSSD Sự cố = modal + dense dual tables.
5. **Status observability uneven** — QLCV gate chips + RPC counts are strong; CSSD station strip is domain-clear but mẻ handoff still teachy; BCTH excellent for leadership print, heavy for daily glance.
6. **Mobile** — scan/choice targets OK; QLCV Kanban + Sự cố dual tables remain desk-first.

**Stance:** do **not** redesign modules wholesale. Ship a **shell-consistency thin slice** first, then one module pilot.

---

## 2. Current IA map (sidebar SSOT)

Sources: `src/lib/nav/sidebar-nav-groups.ts`, `sidebar-admin-nav-groups.ts`.

| Group | Item | Route | Notes |
|-------|------|-------|-------|
| Điều hành KSNK | Báo cáo chính thức | `/bao-cao-tong-hop` | One door; `/` → redirect here (H2) |
| Giám sát | Giám sát | `/giam-sat` | Hub; sole-write deep-link when 1 dest |
| Vận hành nội bộ | Công việc | `/quan-ly-cong-viec` | Separate from GSC (H2) |
| Vận hành nội bộ | Thi KSNK | `/dao-tao` | Training |
| CSSD · Vận hành | Quy trình | `/cssd-quy-trinh` | In-page: Chu trình · Mẻ · Truy vết |
| CSSD · Vận hành | Sự cố & biến động | `/cssd-su-co` | Door separate from kho/catalog |
| CSSD · Tra cứu | Dụng cụ / Thiết bị / Hóa chất | `/cssd-dung-cu` … | Catalog + QR search |
| Sửa danh mục | Quản trị hệ thống | `/quan-tri-he-thong` | Admin hub |

**Also reachable:** `/giam-sat-vst`, `/giam-sat-chung/*`, `/giam-sat-nkbv`, `/lich-su/*`, `/thong-ke/*`, `/qr`, `/cssd-erp/*`, ModeNav inside supervision layouts.

### Target IA (delta only — keep locks)

```
Điều hành     → Báo cáo chính thức                 [KEEP]
Giám sát      → Cổng giám sát                      [KEEP]
Vận hành      → Công việc | Thi KSNK               [KEEP]
CSSD Vận hành → Quy trình | Sự cố                  [KEEP doors]
CSSD Tra cứu  → Dụng cụ | TB | HC                  [KEEP]
Quản trị      → Hub một cửa                        [KEEP]

Header L0     → zone + **page name per route**
In-page L1    → tabs / actions / filters only (no second H1)
Module tabs   → ≤4 primary
```

No new sidebar leaves. No “Việc hôm nay”. No Soft SXHD. No Word lanes.

---

## 3. Design system snapshot (as-built)

| Layer | SSOT | Health |
|-------|------|--------|
| Colors / type roles | `globals.css` + `.bv103-type-*` | Strong |
| Tokens | `bv103-design-tokens.ts` | Strong |
| Layout / buttons | `bv103-layout-chrome.ts` | Strong; modules prefer token classes over shadcn `Button` |
| Panel | `bv103-panel-chrome.ts` + module `*-chrome.ts` | Gates present |
| Page chrome | `KsnkPageChrome` + `page-chrome-contract-20260731` | Spec strong; CSSD/QLCV hero wiring uneven |
| Shell | `KsnkPageShell` + `ClientLayoutWrapper` + Sidebar/Header | Unified width; **CSSD breadcrumb coarse** |
| Empty | `Bv103EmptyState` | **Orphan** |
| Dialogs | `ui/dialog` + `bv103-dialog-stack` | z-index OK; density high |
| Tables | `AdvancedDataTable` + responsive shells | Good; Sự cố dual tables custom |

---

## 4. Surface scores (1–5)

Rubric: Discoverability · Density · Click-depth · Status · Medical calm · Pattern consistency · Empty/error · Mobile.

| Surface | Disc | Dens | Clicks | Status | Calm | Consist | Empty | Mobile | Notes |
|---------|-----:|-----:|-------:|-------:|-----:|--------:|------:|-------:|-------|
| Báo cáo chính thức | 4 | 3 | 2 | 4 | 4 | 4 | 3 | 3 | Flagship BI; progressive disclosure helps; daily glance still heavy |
| Giám sát hub | 5 | 5 | 1 | 2 | 4 | 4 | 4 | 4 | Best write-entry pattern |
| CSSD Quy trình | 4 | 3 | 2–3 | 4 | 3 | 3 | 2 | 3 | 6 stations SSOT; TK via mẻ correct but handoff teachy; custom tabs |
| CSSD Đóng gói / scan | 3 | 4 | 2 | 4 | 3 | 3 | 2 | 4 | Scan-only domain OK; gate copy needs plain VI |
| CSSD Dụng cụ | 4 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | Tabs + QR good; toolbar link salad |
| CSSD Sự cố | 3 | 2 | 2–3 | 3 | 3 | 2 | 2 | 2 | Door split correct; dual-pane dense |
| QLCV | 4 | 3 | 2 | 4 | 4 | 3 | 2 | 2 | 4 tabs match Domain 19; gate chips+RPC; detail = modal hub |
| NKBV | 3 | 2 | 2 | 3 | 3 | 3 | 2 | 2 | Rich clinical; desk-first |
| VST / GSC forms | 4 | 4 | 1–2 | 3 | 4 | 4 | 3 | 4 | ModeNav = cleanest Ops dialect |
| Quản trị hub | 3 | 3 | 2–3 | 2 | 3 | 3 | 2 | 2 | One hub good; modal-CRUD farm |

---

## 5. Cross-cutting anti-patterns

| ID | Anti-pattern | Evidence | Breach |
|----|--------------|----------|--------|
| X1 | **Coarse L0 breadcrumb** | All CSSD → `Quản lý CSSD` (`app-shell-scope.ts`) | Wayfinding |
| X2 | **Page title swallowed** | `CSSDPageShell` passes `title` but `KsnkSupervisionHero` `showTitle=false` | Wayfinding |
| X3 | **Tab dialect split** | ModeNav vs `CssdHorizTabButton` vs Radix+`KsnkSupervisionTabList` | Consistency |
| X4 | **Orphan empty state** | `Bv103EmptyState` unused outside definition | Empty/error |
| X5 | **Modal hub as primary detail** | QLCV `Dialog` wraps detail + nested dialogs | Click depth / mobile |
| X6 | **Quiet links as equal chrome** | CSSD Dụng cụ toolbar: search + đề nghị + reconcile + QR notice | Primary discoverability |
| X7 | **Jargon on main canvas** | Station codes / packaging chemistry without plain VI first | Medical calm |
| X8 | **Status chip inconsistency** | QLCV gates vs CSSD station pills vs BCTH KPI cards | Status |
| X9 | **Teachy ops copy** | Multi-sentence hints under hubs (contract §7) | Density |
| X10 | **Legacy residue doors** | `?tab=kho` redirect; dead analytics→QLCV helpers | Discoverability |

---

## 6. UX principles (titles)

Full text: [`principles.md`](../../../ux/principles.md).

1. One door, one job  
2. Name the page once (Header SSOT)  
3. Primary action ≤ 2 clicks  
4. Status is ambient  
5. Person · work · progress · responsibility  
6. Scan over type (domain gates)  
7. Tabs ≤ 4 primary  
8. One detail pattern per dialect  
9. Empty = one sentence + one CTA  
10. Calm clinical chrome  
11. Same control height  
12. Layer sync on status/doors  

---

## 7. Pattern catalog

| Pattern | Verdict | Action |
|---------|---------|--------|
| Sidebar module-first groups | **Keep** | Lock |
| `/` → Báo cáo chính thức | **Keep** | H2 |
| Giám sát hub (write CTAs + quiet links) | **Keep** | Hub template |
| `SupervisionModeNav` | **Keep** | Canonical Ops tabs (VST/GSC) |
| `KsnkPageChrome` slots | **Keep** | Drive CSSD/QLCV toward this |
| `Bv103AnalyticsPageFrame` | **Keep** | Analytics dialect |
| `AdvancedDataTable` + inline search | **Keep** | Ops lists |
| QLCV gate chip strip + RPC counts | **Keep** | Extend shared semantics |
| CSSD 6 stations + scan gates (no hand-advance TK) | **Keep** | Domain SSOT |
| Sự cố / kho / catalog separate doors | **Keep** | CSSD lock |
| QLCV 4 tabs (Điều hành · Nhiệm vụ · Định kỳ · Báo cáo) | **Keep** | Domain 19 |
| `CssdHorizTabButton` parallel system | **Change** | Converge toward shared tab list |
| CSSD Header blanket + swallowed titles | **Change** | Per-route L0 map; show title XOR Header |
| QLCV detail-as-Dialog hub | **Change** | Pilot sheet/page; dialog = confirm |
| Ad-hoc empty blocks | **Change** | Adopt `Bv103EmptyState` |
| Teachy multi-paragraph ops intros | **Kill** | Contract §7 |
| Poster StatCard grids on ops lists | **Kill** | StatInline strip |
| Soft SXHD / Việc hôm nay / Word UI here | **Kill (non-goal)** | Out of scope |
| Native long `<select>` for MDM | **Kill** | SearchableSelect |

---

## 8. Phased backlog

### P0 — Shell / nav

| ID | Item | Layer | DoD sketch |
|----|------|-------|------------|
| P0-1 | Refine `getKsnkAppHeaderBreadcrumb` per CSSD route | Shell | `CSSD · Quy trình` / `· Dụng cụ` / `· Sự cố` / `· Thiết bị` / `· Hóa chất` / report; tests |
| P0-2 | Decide title policy: L0 **or** in-page H1 — not neither, not both | Shell | CSSD pages named once; `showTitle` aligned |
| P0-3 | Wire `Bv103EmptyState` on ≥3 surfaces (QLCV board, CSSD waiting, Giam sat denied) | Shared | Grep consumers ≥3 |
| P0-4 | Tab dialect note in `principles.md` | Docs | No third tab primitive without ADR |

### P1 — Shared components

| ID | Item |
|----|------|
| P1-1 | Unify `Bv103TabList` (ModeNav + CSSD horiz) |
| P1-2 | Shared status chip semantics (overdue / waiting / ok / locked) |
| P1-3 | `OpsDetailSheet` for QLCV; dialog = confirm only | **Done** (local 2026-09-25 Asia/Saigon): QLCV hub uses `OpsDetailSheet`; Edit/Approve inline in sheet; confirm/reason dialogs remain |
| P1-4 | Toolbar: primary cluster vs quiet links | **Done** (local 2026-09-25 Asia/Saigon): `/cssd-dung-cu` scan cluster vs quiet đề nghị/reconcile/docs; shared `linkQuiet` + toolbar clusters in `bv103LayoutChrome`; light quiet on `/cssd-thiet-bi` admin door |
| P1-5 | Toast/error copy: plain VI first, code footnote |

### P2 — Modules (after shell)

| ID | Module | Focus |
|----|--------|-------|
| P2-1 | CSSD Quy trình | Calm station strip; one mẻ CTA; cut teachy next-station blurbs — **done** (local) |
| P2-2 | CSSD Sự cố | Visual weight An toàn vs Biến động; mobile dual-table | **Done** (local 2026-09-25 Asia/Saigon): `IncidentGroupPicker` two-tier (An toàn vs Biến động + safety chips); `DualPaneScroll` shorter mobile + `paneLabel` Nguồn/Đích on move/replenish |
| P2-3 | QLCV | Detail sheet; keep mutate→chip refresh; empty prod copy | **Done** (local 2026-09-25 Asia/Saigon): OpsDetailSheet already shipped; Báo cáo + Nhiệm vụ empties → `Bv103EmptyState` (1 sentence + Tải lại); list ADT short emptyMessage; Kanban already wired |
| P2-4 | BCTH | Default collapsed “more sections”; keep print |
| P2-5 | Quản trị | Prefer routes/inline for heavy forms |
| P2-6 | NKBV | Modal diet; ModeNav-like tabs |

---

## 9. First thin slice recommendation

### **Slice 0 — Shell consistency (P0-1 + P0-2 + P0-3)**

**Why not pilot a whole module first**

1. Module IA locks already shipped (H2, CSSD doors, QLCV 4 tabs).  
2. Highest leverage / lowest domain risk — FE shell only; no migrate.  
3. Unblocks honest module polish (no fighting missing/double titles).  
4. QLCV tip is mid-flight (Domain 19) — don’t restyle it in the same beat.

### DoD

- [x] Header breadcrumb distinct for major CSSD routes (+ keep VST/GSC/NKBV fine-grained).  
- [x] Each CSSD page has **exactly one** visible page name (Header **xor** hero `showTitle`).  
- [x] `Bv103EmptyState` on ≥3 live surfaces (QLCV Kanban board · CSSD WaitingList · Giám sát hub denied).  
- [x] Note “Slice 0 done” under this audit; **no** push / Cloud / Vercel / migrate.  
- [ ] Spot-check on localhost (screenshots optional).

**Slice 0 shipped** (local, 2026-09-25 Asia/Saigon): per-route CSSD headers in `getKsnkAppHeaderBreadcrumb`; Header SSOT title policy (`showTitle` false on `CSSDPageShell`); `Bv103EmptyState` ×3.

**P1-4 shipped** (local): CSSD Dụng cụ toolbar primary (Quét/tìm) vs quiet secondaries; tokens `toolbar*Cluster` + `linkQuiet`.

**P2-1 shipped** (local, 2026-09-25 Asia/Saigon): CSSD Quy trình calm station strip; one primary «Phiếu mẻ» CTA; cut teachy next-station blurbs / long handoff toasts. No push / Cloud / Vercel / migrate.

**P1-3 shipped** (local, 2026-09-25 Asia/Saigon): QLCV hub detail → `OpsDetailSheet`; Edit/Approve inline panels (no nested Dialog); QlcvReason/Confirm remain.

**P2-3 shipped** (local, 2026-09-25 Asia/Saigon): QLCV empty prod copy via `Bv103EmptyState` — Báo cáo kỳ (NGUOI/QUA_HAN/DONG_HAN) + Nhiệm vụ list; Operations list short `emptyMessage`; Kanban already used EmptyState. TRANG_THAI left (always has canonical rows). No push / Cloud / migrate.

**P2-2 shipped** (local, 2026-09-25 Asia/Saigon): CSSD Sự cố — primary family An toàn vs Biến động dụng cụ; secondary QT·HC·Máy·Khác chips; DualPaneScroll mobile height + sticky Nguồn/Đích labels. No push / Cloud / migrate / taxonomy code change.

**Next:** shared status chips (**P1-2**) **or** BCTH collapsed sections (**P2-4**) — PO picks by UAT pain.

---

## 10. Explicit non-goals

- Word / Văn bản / ban hành lanes  
- Soft SXHD / “Việc hôm nay” / Command Center task widgets on `/`  
- Whole-app rebrand / new palette  
- Merge Sự cố → Quy trình or Dụng cụ  
- Merge Công việc → Giám sát or Báo cáo  
- Cloud deploy, Supabase migrate, Vercel, git push from this beat  

---

## 11. References

- `src/lib/nav/sidebar-nav-groups.ts`, `app-shell-scope.ts`, `bv103-design-tokens.ts`  
- `docs/reference/guides/bv103-visual-language.md`  
- `docs/reference/architecture/page-chrome-contract-20260731.md`  
- `docs/modules/qlcv/19-QLCV-DOMAIN-SSOT.md`, `_audit-qlcv-2026-09-25.md`  
- `docs/modules/cssd/_audit-me-recall-2026-09-25.md`  
- `docs/modules/dashboard/dashboard-ux-audit-20260717.md`  
- Surfaces: `GiamSatHubPage`, `bao-cao-tong-hop-page`, `cssd-quy-trinh/page`, `cssd-dung-cu/page`, CSSD Sự cố entry, `QuanLyCongViecPage`, `quan-tri-he-thong/page`  

---

## 12. Blockers / risks

| Item | Impact |
|------|--------|
| Tip ahead 6 (QLCV) — leave dirty alone except this docs write | Avoid restyling QLCV until Domain 19 settles |
| CSSD ME migrations may be unapplied (per ME audit) | Mẻ/thu hồi UAT blocked until Nghĩa orders migrate — out of beat |
| Code-structure audit; few/no live screenshots | Validate Slice 0 on localhost before DoD |
| macOS case-insensitive imports (`bv103` paths) | Prefer one casing when touching files |
