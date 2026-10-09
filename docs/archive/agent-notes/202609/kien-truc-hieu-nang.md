# Ghi chú AI — Kiến trúc và hiệu năng

Gộp các ghi chú phiên. Không dùng khi sửa hệ thống.

## _agent-whole-app-complexity-perf-20260907

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`open-backlog-20260731.md`](../../plans/architecture/open-backlog-20260731.md). Tra cứu lịch sử được.

# Audit toàn app — độ rối / hiệu năng / chồng chéo IA

> **Chỉ đọc** trên Mac `Desktop/ksnk_bv103` · machineId `6bad1c57-…0f88` · 2026-09-07 (Asia/Saigon)  
> **Không** sửa code, **không** commit.  
> Phạm vi: mọi domain App Router + `src/modules/*` + shell chung + docs debt/perf sẵn có.

---

## Liên hệ note CSSD trước đó

Note CSSD [`docs/modules/cssd/_agent-perf-complexity-rootcause-20260907.md`](./cssd.md#_agent-perf-complexity-rootcause-20260907) vẫn đúng cho **một lát cắt** (catalog full-load, dual surface dụng cụ, shell 4 tab quy trình, `select("*")` + limit nghìn).

**Bài audit này khẳng định:** CSSD **không phải** nguồn rối duy nhất — cùng một **pattern hệ thống** lặp lại ở NKBV, Quản trị/MDM, QLCV, Đào tạo, Dashboard/Báo cáo, và form GSC:

1. Client mega-page / mega-hook  
2. Payload bulk (`select("*")` hoặc limit 2k–10k)  
3. Nhiều cửa vào cùng việc  
4. Shell RBAC + offline hydrate mọi route  

Simplification-program 2026-07-26 đã **làm xong IA lớp sidebar** (hub Giám sát, 4 nhóm Quản trị, CSSD Vận hành/Tra cứu) — nhưng **nợ payload + độ dày module** vẫn làm app cảm giác “messy / chậm”. Debt-register ghi nhiều D-\* Done; **nợ perf/complexity kiểu này chưa có ID mở tương ứng** → cần đăng ký lại như backlog vận hành.

---

## 1. Bản đồ module

| Module | Việc chính | # file `.ts(x)` | `use client` | ~LOC | Mega (>400 dòng) | Mức rối/chậm ước lượng |
|--------|------------|-----------------|--------------|------|------------------|------------------------|
| **giam-sat-nkbv** | Giám sát NKBV: BA, vi sinh, hội chứng, timeline, RCA/MDRO | 195 | 48 | ~48k | **34** | **P0** |
| **quan-tri-he-thong** | Hub QT: nhân sự, bảng kiểm, MDM/CSSD master, RBAC, TK | 171 | 70 | ~21k | 7 | **P0** |
| **cssd-erp** | Quy trình / kho / mẻ / catalog RO / TB / HC | 152 | 61 | ~17k | 7 | **P0** |
| **quan-ly-cong-viec** | Công việc · nhiệm vụ · định kỳ · đề xuất | 92 | 28 | ~11k | 4 | **P1** |
| **cssd-su-co** | Sự cố CSSD (form taxonomy + print) | 48 | 16 | ~8.6k | 5 | **P1** |
| **giam-sat-chung** | GSC nhập / lịch sử / thống kê | 77 | 27 | ~8.7k | 2 | **P1** |
| **dashboard** | Command center `/` + báo cáo tổng hợp | 46 | 18 | ~5.9k | 3 | **P1** |
| **dao-tao** | Thi KSNK + admin NHCH | 23 | 19 | ~4.2k | 4 | **P1** |
| **giam-sat-vst** | VST WHO form / export | 52 | 20 | ~4.8k | 1 | **P2** |
| **giam-sat-hub** | Cổng `/giam-sat` | 1 | 1 | ~0.2k | 0 | **P2** (ổn) |
| **auth / entity-qr** | Login · QR entity | nhỏ | ít | ít | 0 | **P2** |
| **src/lib + components + hooks** | Shell, nav, analytics, offline, permission | ~320 | ~74 | ~28k | vài shared lớn | **P1** (phí mọi trang) |

**Routes map (App Router) theo area**

| Area | Routes chính | Ghi chú |
|------|--------------|---------|
| Dashboard / command | `/` | client + `dynamic(ssr:false)` Command Center |
| Báo cáo | `/bao-cao-tong-hop` | cùng module dashboard; client nặng print/charts |
| Giám sát hub | `/giam-sat` | server wrapper → hub client |
| VST / GSC / NKBV | `/giam-sat-vst`, `/giam-sat-chung/*`, `/giam-sat-nkbv` | ModeNav → lịch sử/thống kê; NKBV 1 page mega |
| Lịch sử | `/lich-su` → redirect `/lich-su/vst`; `/lich-su/gsc` | |
| Thống kê | `/thong-ke` → `/thong-ke/vst`; `/thong-ke/gsc`; `/thong-ke/cssd` → report CSSD | |
| CSSD vận hành | `/cssd-quy-trinh`, `/cssd-su-co` | quy trình = shell tabbed client |
| CSSD tra cứu | `/cssd-dung-cu`, `/cssd-thiet-bi`, `/cssd-hoa-chat` | RO; dung-cu full catalog |
| CSSD legacy | `/cssd-erp/batch`, `/cssd-erp/report` | redirect / deep-link |
| QLCV | `/quan-ly-cong-viec` | 1 page client mega |
| Đào tạo | `/dao-tao/*`, `/dao-tao/admin/*` | hầu hết client |
| Quản trị | `/quan-tri-he-thong` + nhiều deep-link redirect về hub tab | |
| Login / TK | `/login/*`, `/tai-khoan/*` | |
| QR | `/qr` | |

**Số đo toàn `src`:** ~1248 file `.ts(x)` · **414** `"use client"` (~33%) · **55** `page.tsx` (**25 client / 30 server**) · **67** file module >400 dòng.

---

## 2. Căn nguyên toàn cục (7 gốc) — không đổ hết cho CSSD

### G1 — Sản phẩm “nhiều hệ trong một session”
User trong một phiên phải nghĩ: giám sát (3 loại) · công việc · thi · CSSD vận hành/tra cứu · quản trị master · báo cáo command. Sidebar đã gom hub nhưng **khái niệm nghiệp vụ vẫn dày** → cảm giác messy dù IA đã giản một lớp.

### G2 — Client-first + shell RBAC/offline mọi route
Root `layout.tsx` bọc `PermissionProvider` + `ClientLayoutWrapper` (Sidebar, Header, StaffSessionGate, RbacRefreshListener, SupervisionOfflineSyncListener) + `OfflineSyncManager` toàn cục. Nhiều route quan trọng: `/`, `/bao-cao-tong-hop`, `/quan-ly-cong-viec`, `/cssd-quy-trinh`, `/giam-sat-nkbv`, hầu hết `/dao-tao/*` là client / `ssr:false`. **Đổi trang = hydrate lại phí shell + chờ quyền.**

### G3 — Pattern payload bulk xuyên module (không chỉ CSSD)
Cùng kiểu “kéo nhiều rồi lọc client”:

| Domain | Ví dụ |
|--------|--------|
| CSSD | `getKhoCatalogPayloadAction` full bộ+HC+khoa; `fetchCssdKhoDungCuList` `select("*")` + **limit 8000**; `getBoDungCuRowsAction` `select("*")` không page |
| QT/MDM | `listMasterRows` = `select("*")` **không limit**; gateway `limit(1000/5000)` |
| NKBV | `select("*")` BA; filter path kéo vi sinh/sự kiện **limit 8000** |
| Đào tạo | export/import bank **limit 5000 / 10000** |
| QLCV | rollup nhiệm vụ **limit 5000** |
| VST/GSC | export **limit 2000–8000** |

### G4 — Mega-surface: một route = nhiều “app con”
- NKBV: page 1174 dòng + panel 700–2180 dòng (timeline, SSI/IWP, vi sinh, checklist…)  
- QLCV: page 615 + actions 700  
- CSSD quy trình: 4 tab trong một shell  
- QT hub: 4 nhóm job nhưng deep-link / redirect / panel chi tiết bộ 700 dòng  
- Su cố: form + fields >1700 dòng cộng lại  

### G5 — IA đã hub-hóa sidebar nhưng vẫn nhiều cửa cùng việc
Giám sát: hub + ModeNav (nhập/lịch sử/thống kê) + `/lich-su/*` + `/thong-ke/*` + QR.  
CSSD: quy trình(tab kho) ↔ `/cssd-dung-cu` ↔ QT `danh-muc/dung-cu` ↔ legacy `cssd-erp/*`.  
Thống kê CSSD redirect vào report.  
Quản trị: nhiều `page.tsx` chỉ `redirect()` về hub tab — bookmark sống nhưng **bản đồ nhận thức vẫn dày**.

### G6 — Domain lâm sàng/rules nhồi vào FE (đặc biệt NKBV)
Catalog triệu chứng ~1589 dòng, rules engine ~807, grid engine ~960, nhiều panel hội chứng — đúng nghiệp vụ nặng nhưng **chưa tách “workspace theo việc”** → một URL cảm giác như IDE lâm sàng.

### G7 — Docs debt/simplif đã đóng nhiều mục kỹ thuật; nợ “cảm giác chậm/messy” chưa thành chương trình P0 toàn app
Simplification P1–P5 **Done** (hub GS, CSSD ModeNav/sidebar, QT 4 nhóm, import UX, scoring GSC). Perf-audit 07-03 xử lý exceljs lazy. **Chưa có pha “cắt payload + tách mega-page xuyên module”** — đó là khoảng trống hiện tại.

---

## 3. Top 15 điểm nóng cụ thể (file / action / route + chứng cứ ngắn)

1. **`giam-sat-nkbv` module** — 195 file / ~48k LOC / 34 mega-file. Route `/giam-sat-nkbv` client.  
2. **`NkbvBaMultiTimelineWorkspace.tsx` (2180)** + **`NkbvSyndromeIwpPanel.tsx` (1635)** — UI island khổng lồ, mount theo workspace.  
3. **`GiamSatNkbvPage.tsx` (1174)** — một page điều phối quá nhiều panel.  
4. **`giam-sat-nkbv-read.actions.ts`** — `select("*")` BA; path filter kéo `nkbv_fact_vi_sinh` / `nkbv_fact_su_kien` **`.limit(8000)`** (≈ L240–252).  
5. **`fetchCssdKhoDungCuList`** (`cssd-kho-read.actions.ts`) — `v_cssd_quy_trinh_full.select("*").limit(8000)` + join bộ + red-alert 5k.  
6. **`getKhoCatalogPayloadAction`** — Promise.all full summary bộ + meta + hóa chất + khoa **không phân trang** (mount `/cssd-dung-cu`).  
7. **`getBoDungCuRowsAction`** — `select("*")` toàn `v_cssd_bo_dung_cu_summary` rồi join loại/khoa (QT dung-cu tab Bộ).  
8. **`listMasterRows`** (`master-crud-core.ts`) — `select("*")` **không limit** cho mọi bảng MDM allowlist.  
9. **`master-data-gateway.actions.ts`** — `v_mdm_nhan_su_full.select("*").limit(1000)` + VST sessions history **limit 5000**.  
10. **`QuanLyCongViecPage.tsx` (615)** + **`cong-viec.actions.ts` (701)** + **`nhiem-vu.actions.ts` limit 5000** — một SPA công việc.  
11. **`use-giam-sat-chung-form.ts` (655)** — state machine form GSC + options/offline.  
12. **`SuCoReportForm.tsx` (1029) + Fields (743)** — form sự cố cực dày.  
13. **`dao-tao-bank.actions.ts`** — list/export **limit 5000**; import đối chiếu existing **limit 10000**.  
14. **`/` Command Center + `/bao-cao-tong-hop`** — `ssr:false`, recharts/print sections (core ~503, print-sections ~477).  
15. **Root shell** — `PermissionProvider` (252) hydrate `v_sys_user_permissions` (roles + full permissions matrix) cache 5′; mọi navigation trả phí `usePermission` + sidebar filter gates.

*(Bổ sung gần ngưỡng: `bo-dung-cu-chi-tiet-panel.tsx` 700; `account-access-request.actions.ts` 705; `cssd-batch.actions.ts` / `cssd-report-read.actions.ts` ~480–494.)*

---

## 4. Chồng chéo IA (cùng việc nhiều cửa)

| Việc user | Cửa vào hiện có | Rủi ro nhận thức |
|-----------|-----------------|------------------|
| Nhập giám sát | Sidebar «Giám sát» → hub **hoặc** deep-link 1 quyền; ModeNav «Nhập phiên» | Hub tốt; vẫn 3 form khác nhau |
| Xem lịch sử GS | ModeNav + `/lich-su/vst\|gsc` + tab cũ redirect | OK kỹ thuật; user thấy 2 tên “Lịch sử” |
| Xem thống kê GS | ModeNav + `/thong-ke/*` + báo cáo tổng hợp `/bao-cao-tong-hop` + CC `/` | **Trùng mục đích “xem kết quả”** 3 tầng |
| Tra cứu / sửa dụng cụ | `/cssd-dung-cu` (RO) · tab Kho trong `/cssd-quy-trinh` · QT `danh-muc/dung-cu` · redirect loai/bo/chi-tiet | **Cùng danh mục 3–4 cửa** (đã ghi trong note CSSD) |
| Báo cáo CSSD | `/cssd-erp/report` · `/thong-ke/cssd` redirect · appendix trong báo cáo tổng hợp | Deep-link sống + hub thống kê |
| Quản trị nhân sự/TK | Hub QT tab · `/quan-tri-he-thong/tai-khoan` · redirect `tai-khoan-nhan-su` · `/tai-khoan` user | Admin vs self-service cần copy rõ hơn |
| Phân quyền | Redirect `phan-quyen` → hub tab | Ổn nếu hub rõ; orphan path vẫn tồn tại |
| QR | `/qr` + hub GS + CSSD scan trong quy trình/dung-cu | Nhiều điểm quét — đúng nghiệp vụ nhưng cần “Bạn đang quét để…?” |

**Orphan / legacy giữ deep-link (không xóa vội):** `cssd-erp/batch|report`, nhiều `quan-tri-he-thong/danh-muc/*/page.tsx` chỉ redirect, `thong-ke/cssd`.

---

## 5. Lộ trình dứt điểm toàn app (Pha 0–3) + north star mở rộng

### North star (mở rộng từ note CSSD + simplification-program)

1. **Một việc = một bề mặt chính** (operator vs admin vs analytics).  
2. **Danh sách = server + search + trang**; cấm `select("*")` full / limit ≥1000 trên first paint trừ khi đã đo và gắn lý do.  
3. **Page mặc định Server Component**; client = island tương tác.  
4. **Shell mỏng theo vai trò** — snapshot quyền theo module, không chờ full matrix để paint nội dung chính.  
5. **Cắt vertical slice** (một hot path / một tuần), không rewrite framework.  
6. **Không nhân hub/tab/ModeNav mới** trước khi gỡ cửa trùng.  
7. **NKBV = tách workspace theo việc** (danh sách BA · nhập case · vi sinh · phân tích), không thêm panel vào cùng page 1k+ dòng.

### Pha 0 — Nhận thức + đo (2–3 ngày, không schema lớn)
- Khóa câu chuyện 1 dòng trên header từng nhóm: Giám sát / CSSD / Quản trị / Báo cáo.  
- Baseline đo JSON size + ms + #row: NKBV list filter, `/cssd-dung-cu`, QT Bộ, QLCV mở trang, NHCH đào tạo, CC `/`.  
- Đăng ký backlog perf vào `debt-register` (P1): bulk-select, mega-page NKBV/QLCV, catalog CSSD.

### Pha 1 — Data cắt dứt xuyên module (1–3 tuần) — **ưu tiên cao nhất**
- Áp dụng pattern đã có ở Loại dụng cụ (`range` + count + cột hẹp) cho: Bộ, `listMasterRows`, kho list, NKBV filter helpers, QLCV rollup, bank đào tạo (lazy page).  
- Thay first-paint full catalog bằng search-first / trang đầu.  
- Export giữ limit cao nhưng **không** dùng chung path với UI mở trang.

### Pha 2 — Tách mega-surface + IA (song song sau khi có đo)
- NKBV: route/workspace theo việc; lazy panel.  
- QLCV: tách tab thành route hoặc lazy nặng.  
- CSSD quy trình: không mount 4 panel logic cùng lúc.  
- GSC form: giảm chuỗi `useEffect` nạp options (cache tag server).  
- Copy IA: một chỗ “Sửa danh mục → Quản trị”; thống kê GS vs báo cáo chính thức.

### Pha 3 — Shell & bundle
- Permission snapshot nhẹ / claim theo module.  
- Giữ `proxy.ts` auth; giảm flash loading nội dung.  
- Không thêm chart/PDF/QR lib vào shell; dynamic khi mở đúng màn.  
- Giữ `optimizePackageImports`; không eager exceljs.

---

## 6. 10 việc ưu tiên tuần này (xuyên module)

1. **Đo baseline** 5 màn: NKBV list, cssd-dung-cu, QT Bộ, QLCV, dao-tao ngan-hang (row/ms/KB).  
2. **Phân trang `getBoDungCuRowsAction`** giống Loại (cột hẹp, bỏ `*`).  
3. **`/cssd-dung-cu` search-first** — bỏ full `getKhoCatalogPayloadAction` lúc mount.  
4. **Hẹp `fetchCssdKhoDungCuList`** — bỏ `*`, giảm `MAX_KHO_ROWS` hoặc lọc ngày/trạm.  
5. **`listMasterRows` + limit/search bắt buộc** (ít nhất default 100–200 + count).  
6. **NKBV read:** bỏ path `limit(8000)` full vi sinh/sự kiện cho filter list — thay query có predicate/server-side.  
7. **Lazy/tách 2 panel NKBV nặng nhất** (MultiTimeline 2180, IWP 1635) khỏi first paint.  
8. **QLCV:** audit `nhiem-vu` limit 5000 trên mở trang — page + filter trước.  
9. **Đào tạo admin NHCH:** không `limit(10000)` existing trên mọi thao tác UI; page/cursor.  
10. **Copy IA 1 dòng** trên CSSD + Giám sát + QT hub (giảm cảm giác chồng trước refactor lớn).

---

## 7. Việc không làm

- **Rewrite** stack (Remix/Nest/Flutter/“ERP mới”).  
- Thêm framework state toàn cục (Redux / React Query “cho chắc”) **trước** khi cắt payload.  
- Gộp bảng domain VST+GSC+NKBV+CSSD (đã khóa simplification-program).  
- Nhân đôi hub / ModeNav / tab “cho đủ tính năng”.  
- Micro-fix hàng loạt (đổi class/label) thay cho cắt data.  
- Eager import lại exceljs / chart trên shell chung.  
- Big-bang tách `quan-tri-he-thong` 171 file thành monorepo trong một PR.

---

## Tham chiếu

- CSSD rootcause (lát cắt): `docs/modules/cssd/_agent-perf-complexity-rootcause-20260907.md`  
- Simplification: `docs/reference/architecture/simplification-program-20260726.md`  
- Debt: `docs/reference/architecture/debt-register.md`  
- Perf cũ: `docs/reference/reports/perf-audit-20260703.md` · `docs/archive/baselines/cssd-perf-baseline-20260526.md`  
- Nav SSOT: `src/lib/nav/sidebar-nav-groups.ts`, `sidebar-admin-nav-groups.ts`, `giam-sat-write-dest.ts`  
- Shell: `src/app/layout.tsx`, `PermissionProvider.tsx`, `ClientLayoutWrapper.tsx`

---

*Hết báo cáo — chỉ đọc, 2026-09-07.*


## Batch 1 progress (2026-09-07)

See [`_agent-perf-fix-progress-20260907.md`](#_agent-perf-fix-progress-20260907). Landed: paginated `getBoDungCuRowsAction` + `useServerPaginatedTable` on Bo page; `/cssd-dung-cu` search-first (`searchKhoCatalogBo*` / first page 20). Next: Batch 2 (kho narrow + listMasterRows + NKBV 8000).

## _agent-perf-fix-progress-20260907

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`open-backlog-20260731.md`](../../plans/architecture/open-backlog-20260731.md) · nợ [`debt-register.md`](../../plans/architecture/debt-register.md) § Perf. Tra cứu lịch sử được.

# Perf fix progress — 2026-09-07 (Asia/Saigon)

Source backlog: [`_agent-whole-app-complexity-perf-20260907.md`](#_agent-whole-app-complexity-perf-20260907)  
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

## _agent-perf-batch6-plus-plan-20260907

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`open-backlog-20260731.md`](../../plans/architecture/open-backlog-20260731.md). Tra cứu lịch sử được.

# Kế hoạch đợt sau (Batch 6+) — sau Batches 1–5

> Lập 2026-09-07 · Local only · Chưa triển khai code trong file này.  
> Nguồn: `_agent-perf-fix-progress-20260907.md` (residual) + `_agent-whole-app-complexity-perf-20260907.md`.

## Đã xong (nhắc ngắn)

| Đợt | Việc |
|-----|------|
| 1–2 | Phân trang dữ liệu nóng (Bộ, catalog, kho, master, NKBV đọc) |
| 3–5 | Tách code UI nặng (NKBV panel, sự cố CSSD, in báo cáo) |

**Nguyên tắc giữ nguyên:** một việc = một bề mặt; list = server + trang; không rewrite; không commit/push đến khi bạn ra lệnh.

---

## Mục tiêu đợt sau

1. Xử lý **nợ cần DB/RPC** (đúng số liệu toàn cục, không chỉ cửa sổ 50 dòng).  
2. Cắt **payload còn sót** (Kanban QLCV, bank lớn).  
3. Giảm **phí đổi trang** (shell quyền mỏng) — ảnh hưởng cả app.  
4. Siết **IA chồng cửa** (ít đụng code nặng, nhiều nhận thức).

---

## Batch 6 — Dữ liệu đúng số (schema / RPC) · ~3–5 ngày

| # | Việc | Vì sao | Cách làm | Rủi ro | Done khi |
|---|------|--------|----------|--------|----------|
| 6.1 | **Kho: đếm theo trạm toàn cục** | Dashboard đang đếm trong trang ≤50 | Migration: view hoặc RPC `count` theo trạm/FEFO; FE chỉ gọi count, list vẫn page | Cần migrate Supabase | Chip kho = số thật toàn kho |
| 6.2 | **NKBV «chưa phân tích»** | Cap 1500 có thể sót | View/RPC: XN dương chưa gắn sự kiện; FE bỏ scan 1500 | Domain nhạy | Filter «chưa PT» đủ, có test |
| 6.3 | **(Tuỳ chọn) NV rollup %** | Cap 500 task/trang | RPC aggregate `%` theo `nhiem_vu_id` | Thấp | % đúng dù NV nhiều CV |

**Cổng kiểm:** migration trên staging/prod khi bạn cho phép; tsc + vitest domain; smoke 3 màn kho / NKBV / QLCV.

**Không làm trong 6:** viết lại Kanban, đổi SSR dashboard.

---

## Batch 7 — Payload sót (chỉ FE/query) · ~2–4 ngày

| # | Việc | Cách làm | Done khi |
|---|------|----------|----------|
| 7.1 | **QLCV Kanban** (board tới ~10k) | Đo trước; page/virtual theo cột trạng thái; không dump 500×20 nếu không cần | Mở board < N giây ổn định; có thanh trang hoặc «tải thêm» |
| 7.2 | **Đào tạo bank >2000** | Cursor/keyset export-import; scan soft-delete theo chủ đề có continuation | Export lớn không cắt im lặng |
| 7.3 | **BOM `boOptions` = trang hiện tại** (residual Batch 1) | Typeahead server khi đổi bộ trong form chi tiết | Chọn bộ ngoài trang vẫn được |
| 7.4 | **GSC form** (hook ~655) | Lazy options / tách sync template khỏi first paint | Mở form tuân thủ nhẹ hơn (đo trước/sau) |

---

## Batch 8 — Shell đổi trang · ~1 tuần (cẩn thận)

| # | Việc | Cách làm | Done khi |
|---|------|----------|----------|
| 8.1 | **RBAC hydrate mỏng** | PermissionProvider chỉ nạp quyền module đang vào; cache session | Đổi route không chờ full matrix |
| 8.2 | **Offline listener theo vùng** | Chỉ gắn trên giám sát/CSSD cần offline, không mọi trang | Trang quản trị/login không trả phí offline |
| 8.3 | **SSR-safe shell thử nghiệm** (sau 8.1) | Thử 1 route báo cáo/đọc với shell RSC; **không** lật cả `/` | Có spike doc; quyết định giữ/bỏ |

---

## Batch 9 — IA / cửa vào (song song hoặc sau 6) · ~2–3 ngày

| # | Việc | Ghi chú |
|---|------|---------|
| 9.1 | Khóa copy menu: Vận hành / Tra cứu / Sửa danh mục | Đúng north star; ít code |
| 9.2 | Hub «Quản lý dụng cụ» mặc định tab **Loại** (nếu bạn chốt) | 1 dòng path |
| 9.3 | Ẩn/redirect lối legacy còn gây nhầm | `cssd-erp` đã redirect — rà bookmark khác |
| 9.4 | Đăng ký nợ còn lại vào `debt-register` | Tránh mất dấu |

---

## Thứ tự khuyến nghị

```
Bạn F5 thử Batches 1–5
        ↓
Batch 6 (RPC kho + chưa PT)  ← ưu tiên nếu số liệu «sai/thiếu» khó chịu
        ↓
Batch 7 (Kanban + bank + BOM typeahead + GSC)
        ↓
Batch 8 (shell RBAC)         ← lợi ích lớn, rủi ro cao hơn → làm khi 6–7 ổn
        ↓
Batch 9 (IA)                 ← có thể xen sớm nếu menu vẫn rối
```

**Không làm:** rewrite Next; thêm framework; commit/push khi chưa lệnh; cắt lung tung Kanban trước khi đo.

---

## Tiêu chí «đợt sau xong» (định lượng gợi ý)

- Mở `/cssd-dung-cu`, QT Bộ, kho, NKBV cases, QLCV NV, NHCH: payload JSON lần đầu **≪** trước Batch 1 (ghi số đo vào progress).  
- Kho chip = count toàn cục (sau 6.1).  
- «Chưa PT» không phụ thuộc cap 1500 (sau 6.2).  
- Đổi 5 route liên tiếp: không spinner quyền dài (sau 8.1).

---

## Việc cần bạn chốt trước khi code

1. **Ưu tiên Batch 6 (DB)** hay **Batch 7 (FE)** hay **Batch 9 (menu)** trước?  
2. Cho phép **apply migration** Supabase cho 6.1/6.2 khi tới lúc, hay chỉ soạn SQL local trước?  
3. Hub dụng cụ mặc định vào **Loại** hay giữ **Bộ**?

## _agent-perf-batch8-ssr-shell-spike-20260907

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`open-backlog-20260731.md`](../../plans/architecture/open-backlog-20260731.md). Tra cứu lịch sử được.

# Batch 8.3 — SSR-safe shell spike (decision)

> 2026-09-07 · Local only · **SKIP / không lật SSR** trong đợt này.

## Context
Root shell (`PermissionProvider` + `ClientLayoutWrapper`) is client-bound (auth session, RBAC view, sidebar gates). Routes `/` and `/bao-cao-tong-hop` already use `dynamic(..., { ssr: false })` for auth + Recharts hydrate (see Batch 5 residual notes).

## Options considered
1. Flip one read-only báo cáo route to RSC shell with client islands for charts — needs splitting Command Center / báo cáo auth gates and chart trees.
2. Keep client shell; rely on Batch 8.1 (RBAC soft cache) + 8.2 (offline by region) for nav cost.

## Decision
**Prefer (2).** Flipping `/` or `/bao-cao-tong-hop` SSR in one pass is **not safe**: auth redirect, guest-stats shell, and Recharts hydrate still require client ownership of the page root. Revisit only after a dedicated RSC island split (separate batch), not as a drive-by.

## Done when
Spike documented; no SSR flip shipped.

## _agent-full-project-expert-audit-roadmap-20260909

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`debt-register.md`](../../plans/architecture/debt-register.md). Tra cứu lịch sử được.

# Rà soát toàn dự án + lộ trình khắc phục — KSNK BV103

> **Ngày:** 2026-09-09 (Asia/Saigon) · **Máy:** Mac `Desktop/ksnk_bv103` · machineId `6bad1c57-…0f88`  
> **Phạm vi:** READ-FIRST / phân tích + kế hoạch · **chỉ local** · không commit/push/cloud · không đổi code ứng dụng trong pass này.  
> **Người nhận:** Trịnh Nghĩa / KSNK BV103 · ngôn ngữ phần mềm–vận hành (không mã thủ tục QT/PCI trên UI).  
> **Phương pháp (giới hạn trung thực):** không mở từng file trong ~1248 `.ts(x)`. Đã dùng: bản đồ route App Router (~55 `page.tsx`) · `src/modules/*` · `docs/modules` · `ssot-map` · `debt-register` / `open-backlog` · **20** ghi chú agent 09/2026 · đọc sâu hot path danh mục / duyệt BOM / sự cố / shell IA. Độ phủ = tối đa thực dụng, không phải inventory từng dòng.

---

## 1. Tóm tắt điều hành (1 trang)

### Hiện trạng ngắn
Hệ thống là **một ứng dụng KSNK đa miền** (Giám sát VST/GSC/NKBV · CSSD 6 khâu + mẻ + kho + sự cố · Quản trị MDM · QLCV · Đào tạo · Dashboard/Báo cáo). Lớp **IA sidebar** đã giản (Vận hành / Tra cứu / Sửa danh mục / hub Giám sát). Nhiều P0 lịch sử (ledger, auth proxy, BOM soft-warning, UI dialect, print/filter scorecard) **đã đóng** theo `open-backlog-20260731` và audit tháng 7–8.

Đợt **09/2026** đã vá mạnh: tách 3 cửa dụng cụ, four-eyes xác nhận sự cố, cách ly hóa chất, tab **Loại** trả lại trung tâm, phân trang catalog/kho, sửa mẫu số % VST, BD đầu ngày + chặn gói xấu cấp phát, tem chu trình + timeline truy vết.

### Còn đau thật
1. **Danh mục dụng cụ vẫn admin-centric** trong khi nghiệp vụ kiểm kê/đổi thành phần thuộc NV — cửa «Đổi danh mục» mới phủ **BOM theo bộ**, chưa phủ đề xuất **Loại mới / Bộ mới** có duyệt.  
2. **Đổi mã/tên loại khi duyệt phiếu một bộ** có thể **đổi master loại toàn cục** (`applyApprovedBomLines` rename) — rủi ro khoa học cao.  
3. **Độ rối / payload** (NKBV mega-page, shell RBAC hydrate, form sự cố dày, dual surface dụng cụ) vẫn làm chậm cảm nhận dù Batch perf 1–2 đã cắt catalog/kho.  
4. **UAT lâm sàng / vận hành** (NKBV checklist, reform CSSD) chưa ký — nợ sản phẩm, không phải bug code.  
5. **Doc SSOT lệch code** ở vài chỗ (vd. «sheet Loại» vs tab Loại đã trả 09-07).

### Trả lời thẳng câu hỏi catalog
**Có — nên tách «rà soát / kiểm kê danh mục» khỏi gánh admin**, nhưng **không** cần module ERP mới to. Khuyến nghị **Hybrid (phương án C)**: NV soạn draft / phiếu trên Loại–Bộ–BOM; Admin/điều phối publish; giữ override khẩn cấp; tái dùng hàng đợi duyệt + 3 cửa đã có; **không** gộp với sự cố an toàn.

### Việc làm ngay (không over-promise)
- Đợt 0 (1–3 ngày): chốt mô hình governance + vá rủi ro rename loại toàn cục + đồng bộ doc.  
- Đợt 1–2: Hybrid catalog (draft Loại + hàng chờ thống nhất) + cắt residual perf nóng.  
- Đợt 3+: UAT ký, implant CHO_BI, declutter IA thống kê, NKBV workspace.

---

## 2. Bản đồ module hiện trạng

### 2.1 Sidebar (SSOT)

| Nhóm | Mục | Route |
|------|-----|-------|
| Điều hành | Tổng quan · Báo cáo chính thức | `/` · `/bao-cao-tong-hop` |
| Giám sát | Hub | `/giam-sat` → VST / GSC / NKBV |
| Vận hành nội bộ | Công việc · Thi KSNK | `/quan-ly-cong-viec` · `/dao-tao` |
| CSSD · Vận hành | Quy trình · Sự cố & biến động | `/cssd-quy-trinh` · `/cssd-su-co` |
| CSSD · Tra cứu | Dụng cụ · Thiết bị · Hóa chất | `/cssd-dung-cu` · `/cssd-thiet-bi` · `/cssd-hoa-chat` |
| Sửa danh mục | Quản trị hệ thống (hub) | `/quan-tri-he-thong` |

Deep-link còn sống: `/cssd-erp/batch|report`, `/lich-su/*`, `/thong-ke/*`, nhiều trang QT redirect về hub.

### 2.2 CSSD

| Việc | Surface chính | Ghi chú |
|------|---------------|---------|
| 6 khâu chu trình | `/cssd-quy-trinh` (tab mặc định) | Quét + bản đồ trạm; mẻ = tab riêng |
| Phiếu / mẻ TK | `?tab=batch` · `/cssd-erp/batch` | BD đầu ngày hard; QC 3 cấp; recall |
| Kho sạch / FEFO ops | `?tab=kho` | Đã phân trang (Batch 2) |
| Truy vết | `?tab=trace` | Timeline 6 khâu đã vá 09-08 |
| Catalog RO | `/cssd-dung-cu` | Search-first (Batch 1); tab Loại\|Bộ\|Lịch sử |
| Master Loại/Bộ/BOM | QT `danh-muc/dung-cu` | Tab **Loại \| Bộ \| Rà soát \| Lịch sử**; hard-write = ADMIN |
| Biến động dụng cụ | `/cssd-su-co` nhóm Dụng cụ | 3 cửa: Hỏng/Mất · Đổi DM · Điều chuyển |
| Sự cố an toàn | cùng `/cssd-su-co` | PROCESS / BATCH / EQUIPMENT / CHEMICAL / OTHER |
| Thiết bị / HC | `/cssd-thiet-bi` · `/cssd-hoa-chat` | Ops vs admin tách; FEFO + PM đã reaudit |

### 2.3 Giám sát / khác

| Module | Route | Trạng thái ngắn |
|--------|-------|-----------------|
| VST | `/giam-sat-vst` + lịch sử/thống kê | Form ổn; **% KPI mẫu số đã sửa 09-07** |
| GSC / tuân thủ | `/giam-sat-chung/*` | % = đạt/quan sát — OK; chrome còn dày |
| NKBV | `/giam-sat-nkbv` | Mega-page P0 rối; UAT lâm sàng còn mở |
| QLCV | `/quan-ly-cong-viec` | Kanban dùng được; payload/limit residual |
| Đào tạo | `/dao-tao/*` | Thi + NHCH; bank limit cao |
| Quản trị | `/quan-tri-he-thong` | 4 việc hub; TK một cửa; 1-admin rủi ro chấp nhận pilot |
| Offline | shell + CSSD sync | Đã giữ `extraPayload` cấp phát (LT-OFFLINE-01 Done) |

### 2.4 Quy mô code (từ audit 09-07, vẫn đúng hướng)

| Module | ~LOC / mega | Mức rối |
|--------|-------------|---------|
| giam-sat-nkbv | ~48k / 34 mega | P0 |
| quan-tri-he-thong | ~21k | P0–P1 |
| cssd-erp | ~17k | P0–P1 |
| cssd-su-co / gsc / qlcv / dashboard / dao-tao | 4–11k | P1 |
| giam-sat-vst / hub | nhỏ hơn | P2 |

---

## 3. Top 10 điểm đau nhất

| # | Điểm đau | Vì sao đau vận hành / khoa học | Severity |
|---|----------|--------------------------------|----------|
| 1 | **Governance danh mục: NV không soạn được Loại/Bộ có kiểm soát; mọi hard-write đổ admin** | Kiểm kê thật do NV/điều dưỡng; admin tắc nghẽn hoặc lách form master → sai sổ chuẩn | **P0** sản phẩm |
| 2 | **Duyệt «Đổi danh mục» có thể rename `cssd_dm_loai_dung_cu` toàn cục** | Một phiếu một bộ đổi tên/mã loại → ảnh hưởng mọi bộ/kho gắn loại đó | **P0** dữ liệu |
| 3 | **Hai ngữ cảnh «rà soát»** (tab QT + cửa sự cố) + copy «sự cố» còn lẫn biến động danh mục | Nhân viên lập nhầm cửa; lãnh đạo khó đọc sổ | **P1** |
| 4 | **NKBV mega-surface + UAT chưa ký** | Khoa học HAI/SSI phụ thuộc đúng form; page quá dày → lỗi nhập + chậm | **P0–P1** |
| 5 | **Payload / client-first còn lại** (shell quyền, form sự cố 1k dòng, NHCH 5k–10k, fleet NKBV) | Chậm mọi trang; dễ bỏ cuộc khi ca trực | **P1** |
| 6 | **Dual / multi surface dụng cụ** | Copy/CTA Đợt B đã khóa 1 câu (residual UAT) | **P2** residual |
| 7 | ~~**Implant / quarantine `CHO_BI`**~~ | **FIXED** Đợt A 09-09 | — |
| 8 | **Trace / tem / giao khoa** đã vá một phần; còn in lại tem từ Kho, soft-warn phụ thuộc `khoa_nhan_id` | Truy vết pháp lý / khoa nhận còn lỗ nhỏ | **P1–P2** |
| 9 | **Doc SSOT lệch code** (sheet Loại, một số checklist pilot) | Agent/PO làm lệch hướng; lặp vòng sửa UX | **P1** duy trì |
| 10 | **1 admin + audit UI mỏng + self-reset edge** | Pilot chấp nhận; vận hành dài hạn rủi ro khóa tài khoản / thiếu sổ ai làm gì | **P2** (P1 nếu mở rộng user) |

**Rationale xếp hạng:** ưu tiên sai sổ chuẩn + an toàn tiệt khuẩn trước polish UI; perf chỉ đứng cao khi chặn ca trực.

---

## 4. Inventory P0 / P1 / P2 theo miền

Ký hiệu trạng thái: **OPEN** · **PARTIAL** · **FIXED** (đã vá trong code local gần đây) · **DONE-HIST** (đóng từ audit 07–08).

### 4.1 CSSD — Quy trình 6 khâu / phiếu TK / kho / truy vết

| ID | Symptom | Where | Why hurts | Sev | Evidence | Fix direction | Status |
|----|---------|-------|-----------|-----|----------|---------------|--------|
| QT-01 | Khung 6 khâu + RPC advance | `/cssd-quy-trinh` | — | — | domain-overview · quy-trinh audit 09-08 | Giữ | **FIXED/OK** |
| QT-02 | BD đầu ngày steam chặn tạo/chốt nạp | mẻ create | Sai BD = rủi ro cả ngày chạy | P0 | `cssd-steam-daily-bd` · quan-ly-dung-cu changelog | Giữ + UAT | **FIXED** |
| QT-03 | Cấp phát chặn gói ướt/rách/hỏng/HSD | pack issuance | Cấp phát gói bẩn | P0 | `cssd-pack-issuance` | Giữ | **FIXED** |
| QT-04 | Plasma cấm cellulose | đóng gói | Sai vật liệu | P1 | packaging rules | Giữ | **FIXED** |
| QT-05 | Tem chu trình thiếu trường | print cycle | Khoa khó nhận | P1 | quy-trinh-sw-process-fix 09-08 | In lại từ Kho (residual) | **FIXED** phần; **OPEN** nút in lại |
| QT-06 | Trace chỉ `ngoai_le` | `?tab=trace` | Không thấy ai/khi | P1 | cùng fix | Timeline đã có | **FIXED** |
| QT-07 | Soft-warn chưa giao khoa | CP / kho / trace | Nhầm người CP = QC mẻ | P1 | `needsCssdKhoaHandoffSoftWarn` | Giữ soft; không hard | **FIXED** |
| QT-08 | Implant CHO_BI thiếu write + gate CP | mẻ QC | Implant ra khoa khi chưa BI | P1 | Đợt A 09-09 | Persist + gate + release | **FIXED** local |
| QT-09 | 3×BI(−) mở máy chưa auto | thiết bị/mẻ | Policy vận hành | P2 | deep-audit 09-04 | Rule + UI sau UAT | **OPEN** |
| QT-10 | POU / enzyme lot mềm | TN / LS | SOP làm sạch | P2 | domain audit | Soft capture trước hard | **PARTIAL** |
| QT-11 | Kho list từng `select *` limit 8k | `KhoDungCuPage` | Chậm | P1 | perf Batch 2 | Đã hẹp + page | **FIXED** |
| QT-12 | Soft-warning thiếu BOM (không hard-block) | đóng gói/CP | Đúng quyết định Q2 | — | D-01 / D8 | Không reopen hard-block | **DONE-HIST** |

### 4.2 CSSD — Dụng cụ Loại / Bộ / BOM / dual surface

| ID | Symptom | Where | Why hurts | Sev | Evidence | Fix direction | Status |
|----|---------|-------|-----------|-----|----------|---------------|--------|
| DC-01 | Tab Loại từng bị giấu sheet | QT dung-cu | Mất trung tâm SKU | P0 UX | dung-cu-loai-proposal | Tab Loại trả 09-07 | **FIXED** |
| DC-02 | Hard-write master chỉ ADMIN | Loai/Bo/ChiTiet actions | Đúng D5; NV tắc khi thiếu loại | P0 SP | `requireCssdCatalogMasterWrite` · D5 | Hybrid đề xuất (Part B) | **PARTIAL** (cổng đúng, luồng NV thiếu) |
| DC-03 | `BO_DC.edit` = duyệt phiếu, không mở form | approve actions | Đúng D5 | — | domain-decisions | Giữ | **OK** |
| DC-04 | Duyệt DOI_LOAI có thể rename loại global | `applyApprovedBomLines` | Sai sổ toàn viện | **P0** | cssd-set-bom-apply-core.ts:67–89 | Chỉ relink hoặc phiếu «đổi master loại» riêng + confirm impact | **OPEN** |
| DC-05 | THEM_DONG bắt buộc loại đã có | set reconcile | Không tạo loại mới qua phiếu | P1 | apply core THEM_DONG | Draft loại → duyệt → rồi gắn BOM | **OPEN** gap |
| DC-06 | Tab Rà soát QT chỉ `isAdmin` UI; BE cho `BO_DC/DC_LE.edit` | QuanLyDungCuPage vs approve | Lệch quyền / tổ trưởng không thấy hàng chờ | P1 | QuanLyDungCuPage:65–95 · set-reconcile-approve | Align UI với `requireCatalogApprove` | **OPEN** |
| DC-07 | Campaign kiểm kê list 400 bộ + pending | set-reconcile-campaign | Có mầm «đợt» nhưng chưa workspace | P2 | campaign.actions | Tái dùng cho Hybrid | **PARTIAL** |
| DC-08 | CSSD RO + QT + Kho trùng việc xem | nhiều route | Nhầm cửa sửa | P1 | whole-app IA §4 | Copy 1 dòng «Sửa → Quản trị / Đề xuất → Sự cố» | **PARTIAL** |
| DC-09 | Catalog full-load first paint | `/cssd-dung-cu` | Chậm | P1 | perf Batch 1 | Search-first | **FIXED** |
| DC-10 | Bộ QT full `select *` | BoDungCuPage | Chậm | P1 | Batch 1 | Page 20 | **FIXED** |
| DC-11 | Doc còn «sheet Loại» | quan-ly-dung-cu-luong · domain-decisions §IA | Agent làm sai | P1 doc | so code QuanLyDungCuPage | Sync doc → tab (pass này) | **FIXED** 2026-09-09 |
| DC-12 | Unique 1 bộ×1 loại | D6 | Trùng dòng BOM | P1 | coalesce helpers | Giữ + UAT import | **OK/PARTIAL** |

### 4.3 CSSD — Sự cố

| ID | Symptom | Where | Why hurts | Sev | Evidence | Fix direction | Status |
|----|---------|-------|-----------|-----|----------|---------------|--------|
| SC-01 | Hỏng/Mất lẫn Đổi DM một form | InstrumentSetReconcile | Lập nhầm | P0 | su-co-dung-cu-audit-fix | doorMode physical\|catalog | **FIXED** |
| SC-02 | PHYSICAL collapse D4 → SET_RECONCILE | taxonomy | Lọc sổ sai | P1 | su-co-po-gaps-fix | typeCode PHYSICAL riêng | **FIXED** |
| SC-03 | Tự xác nhận phiếu mình | confirm | Không four-eyes | P1 | po-gaps | Hard block | **FIXED** |
| SC-04 | CHEMICAL dùng `machineId` | form/attrs | Nhầm sổ | P1 | po-gaps | `chemicalId` + quarantine | **FIXED** |
| SC-05 | Form 1000+ dòng | SuCoReportForm | Bảo trì / chậm | P1 | whole-app | Tách island theo nhóm | **OPEN** |
| SC-06 | FSM phiếu vs BOM_PENDING hai trục | domain | NV hiểu «duyệt» | P1 UX | deep-audit su-co | Copy + doc; không gộp schema vội | **OPEN** |
| SC-07 | Thu hồi mẻ entry | BATCH | QT.24 | P0 | deep-audit 09-04 → 09-08 | Entry rõ | **FIXED** phần |
| SC-08 | Severity grading | — | Pilot đủ | P2 | deep-audit | Sau pilot | **OPEN** |

### 4.4 CSSD — Thiết bị / hóa chất

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| TBHC-01 | Ngưỡng tồn HC không CRUD UI | admin hoa-chat | P0 | **FIXED** 09-07 |
| TBHC-02 | FEFO gộp cận/quá hạn | kho HC | P1 | **FIXED** |
| TBHC-03 | PM ngày UTC lệch VN | bao-tri | P1 | **FIXED** |
| TBHC-04 | Fleet đếm mẻ full-scan | listThietBiFleet | P2 | **OPEN** |
| TBHC-05 | Gỡ quarantine HC chưa UI riêng | specs | P2 | **OPEN** |
| TBHC-06 | Dual CRUD ops/admin | — | — | **OK** tách |

### 4.5 Giám sát VST / GSC

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| GS-01 | % đúng KT / đủ TG / găng chia sai mẫu | VST analytics | P0 | **FIXED** 09-07 |
| GS-02 | GSC % đạt/quan sát | GSC analytics | — | **OK** |
| GS-03 | Chrome lịch sử / ModeNav trùng | lich-su · ModeNav | P2 | **OPEN** declutter |
| GS-04 | Form GSC chuỗi nạp options | giam-sat-chung | P2 | **OPEN** cache |

### 4.6 NKBV

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| NK-01 | Mega-page / 34 file >400 dòng | `/giam-sat-nkbv` | P0 rối | **OPEN** |
| NK-02 | limit 8000 filter path | read actions | P1 | **FIXED** phần (Batch 2/6) |
| NK-03 | UAT checklist lâm sàng chưa ký | D-14 | P1 SP | **OPEN** |
| NK-04 | Trace CSSD↔SSI | RCA panel | P2 | **NEAR-DONE** · UAT |

### 4.7 Quản trị / RBAC / nhân sự / tài khoản

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| QT-HT-01 | Hub 4 việc + catalog | quan-tri | — | **OK** |
| QT-HT-02 | Một cửa tài khoản | tai-khoan / NS | — | **FIXED** cleanup 09-07 |
| QT-HT-03 | Self-reset / 1 admin | auth | P1–P2 | **PARTIAL** |
| QT-HT-04 | Audit UI mỏng | — | P1 | **OPEN** |
| QT-HT-05 | Guest / seed RBAC | ops | P2 | **PARTIAL** (seed Done; sync runtime khi DB) |
| QT-HT-06 | Auth server proxy | `proxy.ts` | — | **DONE-HIST** D-09 |

### 4.8 Đào tạo / QLCV / Dashboard / Offline

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| DT-01 | NHCH limit 5k–10k | dao-tao admin | P1 | **OPEN** |
| QLCV-01 | Nhiệm vụ limit cao / mega page | qlcv | P1 | **OPEN** |
| QLCV-02 | TEXT+CHECK trang_thai | schema | — | **DONE-HIST** |
| DB-01 | CC + BCTH ssr:false nặng | `/` · bao-cao | P1 | **OPEN** island |
| DB-02 | Metric dictionary / filter | analytics | — | **DONE-HIST** scorecard 08 |
| OFF-01 | Offline CSSD extraPayload | sync | — | **DONE-HIST** |
| OFF-02 | Offline GS hydrate phí shell | layout | P2 | **OPEN** mỏng hóa |

### 4.9 Cross-cutting

| ID | Symptom | Where | Sev | Status |
|----|---------|-------|-----|--------|
| X-01 | Dual surface / nhiều cửa cùng việc | IA | P1 | **PARTIAL** |
| X-02 | Dialog UX chưa đồng đều mọi modal | MDM/CSSD | P2 | **PARTIAL** |
| X-03 | Lookup vs enum unification | MDM registry | P1 | **PLAN** (lookup-ssot 09-07) — chưa ship hết |
| X-04 | Print scorecard | print | — | **DONE-HIST** phần lớn |
| X-05 | Perf Batch 1–2 landed; 3+ residual | whole-app | P1 | **PARTIAL** |
| X-06 | open-backlog P0 code = 0 (08-05); nợ mới 09 chưa ghi ID | debt | P1 process | **OPEN** đăng ký lại |

---

## 5. Nghiên cứu Loại / Bộ / BOM — phương án + khuyến nghị

### 5.1 Hiện trạng code (đã đọc)

```
Loại (cssd_dm_loai_dung_cu)  ←── BOM lines ──→  Bộ (cssd_dm_bo_dung_cu)
        ↑ SKU / Spaulding / số liệu tồn              ↑ tem QR / khoa / vận hành
        └── Chi tiết bộ = dòng BOM (1 bộ × 1 loại active — D6)
```

| Việc | Ai làm hôm nay | Cơ chế |
|------|----------------|--------|
| CRUD form Loại / Bộ / chi tiết | **Chỉ ADMIN** (UI `canWriteMaster` + server `requireCssdCatalogMasterWrite`) | Form QT |
| Đổi chuẩn / thêm-xóa dòng / đổi mã-tên trên **một bộ** | NV lập phiếu cửa **Đổi danh mục** → `BOM_PENDING` → duyệt → `applyApprovedBomLines` | 3-door + hàng chờ QT tab Rà soát |
| Hỏng/Mất | NV — ghi sổ ngay | Cửa physical |
| Chuyển kho↔bộ / bộ↔bộ | NV — phiếu chuyển | Cửa Move (không lên phiếu rà soát — D3) |
| Tạo **Loại mới** / **Bộ mới** có duyệt | **Không có** — phải nhờ admin form | Gap chính |
| Đợt kiểm kê | Mầm `listSetReconcileCampaignAction` + xuất phiếu | Chưa thành workspace |

**Lệch quyền:** BE duyệt BOM chấp nhận `DC_LE.edit` hoặc `BO_DC.edit`; UI tab Rà soát chỉ hiện khi `isAdmin` → tổ trưởng có edit có thể duyệt API nhưng không thấy hàng chờ.

**Rủi ro khoa học:** khi duyệt `DOI_LOAI` kiểu rename (`shouldRename`), cập nhật thẳng bảng **loại master** — không chỉ dòng BOM của bộ đang duyệt.

### 5.2 So sánh phương án

| | A — Staff đề xuất → duyệt → apply (mở rộng 3-door) | B — Module «Rà soát kiểm kê danh mục» riêng | C — Hybrid (khuyến nghị) | D — Giữ admin-centric |
|--|--|--|--|--|
| Ý tưởng | Mọi thay đổi master đi phiếu (kể cả loại/bộ mới) | Workspace kiểm kê + catalog riêng khỏi sự cố & QT | NV CRUD **draft**; publish = Admin/DC; override admin khẩn | Chỉ admin form như D5 cứng |
| Tái dụng | Cao (queue + apply) | Thấp (module mới) | Cao + thêm draft | Có sẵn |
| Gánh admin | Giảm | Giảm nếu phân quyền duyệt | Giảm rõ | Không giảm |
| Rủi ro trùng «Đổi danh mục» sự cố | Trung bình nếu copy kém | Thấp nếu IA rõ | Thấp nếu «biến động bộ» ≠ «đề xuất master» | Thấp nhưng tắc ops |
| Effort | M | L | M | S (không làm) |
| Phù hợp BV103 | Tốt ngắn hạn | Quá nặng 1-admin viện | **Tốt nhất** | Chỉ tạm nếu volume thấp |

### 5.3 Khuyến nghị: **C — Hybrid**

**Trả lời YES/NO:**  
**YES — tách phần rà soát / kiểm kê danh mục** thành **khu vực việc rõ** (tab/workspace),  
**NO — không** dựng module ERP xanh hoàn toàn tách repo/route khổng lồ nếu chưa có volume kiểm kê định kỳ + nhiều người duyệt.

**Điều kiện YES:**
1. Volume đổi loại/BOM thường xuyên do NV (không chỉ admin).  
2. Cần four-eyes trước khi đụng sổ chuẩn.  
3. Muốn kiểm kê đợt (khoa/toàn CSSD) có hàng đợi và lịch sử.  
4. Sẵn sàng **cấm rename loại toàn cục** từ phiếu một bộ.

**Giữ D (admin-centric) chỉ khi:** 1 admin tự nhập hết master, volume thấp, ưu tiên không thêm FSM — chấp nhận tắc và rủi ro lách.

### 5.4 Thiết kế Hybrid chi tiết

#### Vai trò
| Vai trò | Quyền |
|---------|--------|
| NV CSSD / điều dưỡng kho | Tạo draft Loại/Bộ/BOM; lập phiếu kiểm kê; Hỏng/Mất & Chuyển như hiện tại |
| Tổ trưởng / Điều phối (`BO_DC.edit` / `DC_LE.edit`) | Duyệt phiếu BOM + đề xuất Loại/Bộ (publish) |
| ADMIN | Override khẩn (CRUD master thẳng); từ chối; gộp trùng loại; import Excel |
| Viewer RO | `/cssd-dung-cu` — không đề xuất nếu không có quyền create phiếu |

#### Trạng thái
| Entity | States |
|--------|--------|
| Phiếu BOM (đã có) | `DRAFT` → `BOM_PENDING` → `BOM_APPROVED` \| `BOM_REJECTED` |
| Đề xuất Loại / Bộ (mới) | `draft` → `pending` → `approved` (insert master) \| `rejected` |
| Master published | `is_active` như hiện tại |

#### Immediate vs cần duyệt
| Thay đổi | Immediate? | Duyệt? |
|----------|------------|--------|
| Hỏng / Mất (đếm) | Có — ghi sổ | Không (đã tách cửa) |
| Chuyển kho/bộ | Có — phiếu chuyển | Không qua BOM approve |
| Đổi số chuẩn / thêm-xóa dòng BOM / relink loại **đã có** | Không | Có — cửa Đổi DM |
| Đổi mã/tên **master loại** (ảnh hưởng nhiều bộ) | Không | Có — phiếu «Đổi master loại» riêng + hiện số bộ bị ảnh hưởng |
| Tạo Loại mới / Bộ mới | Không | Có — draft → publish |
| Sửa Spaulding / quy cách loại đã publish | Không (mặc định) | Có; admin override khẩn |
| Import hàng loạt | Không | Chỉ ADMIN (+ báo cáo diff) |

#### Loại vs Bộ vs BOM khác nhau thế nào
- **Loại:** SSOT khoa học (SKU). Draft không vào tồn/BOM cho đến khi approved.  
- **Bộ:** thực thể vận hành (QR). Tạo bộ draft có thể gắn khoa; chưa quét chu trình nếu chưa publish (gate nhẹ).  
- **BOM lines:** luôn theo **một bộ**; tái dụng cửa Đổi danh mục; **không** tạo loại mới trong cùng phiếu (bắt chọn loại published hoặc draft-đã-duyệt).

#### Tránh trùng sự cố «Đổi danh mục»
- Giữ **một** engine duyệt (`approveSetReconcileBomAction` + apply core).  
- Đổi **copy IA**: cửa sự cố = «Đề xuất đổi thành phần bộ (chờ duyệt)»; tab QT = «Hàng chờ duyệt danh mục».  
- Workspace Hybrid = cùng hàng chờ + thêm «Đề xuất Loại/Bộ» — **không** nhân bảng sự cố an toàn PROCESS/BATCH.

#### Màn hình (tối thiểu)
1. QT Dụng cụ — giữ 4 tab; mở rộng **Rà soát** cho approver không chỉ admin UI.  
2. Dialog «Đề xuất loại mới» từ NV (không mở form master).  
3. (Tuỳ chọn đợt 2) Tab/filter «Đợt kiểm kê» tái dùng campaign.actions.  
4. CSSD RO: nút «Đề xuất đổi» deep-link cửa catalog — không CRUD.

#### Migration từ hiện tại
1. Không đổi schema lớn pha 1: dùng `cssd_fact_su_co` attributes cho BOM như nay; draft Loại có thể bảng mỏng `cssd_dm_loai_dung_cu_proposal` **hoặc** JSON proposal trên sys — chọn khi design slice.  
2. Chặn rename global trong `applyDoiLoaiLine` ngay (pha 0) — relink-only trừ phiếu master.  
3. Align UI Rà soát với BE permission.  
4. Sync doc D5/IA (tab Loại).  
5. UAT 5 kịch bản: đề xuất loại → duyệt → gắn BOM; đổi chuẩn; từ chối; admin override; kiểm kê một khoa.

#### Rủi ro Hybrid
| Rủi ro | Giảm |
|--------|------|
| Hai hàng chờ lệch | Một list duyệt SSOT |
| NV nhầm draft = đã dùng được | Badge «Nháp» + gate quét |
| Over-process chậm ca | Override admin + SLA copy |
| Scope creep module B | Cấm route mới lớn pha 1 |

---

## 6. Kế hoạch khắc phục theo đợt

### Đợt 0 — Chốt + an toàn sổ (3–5 ngày) · Effort **S–M**

| Goal | Khóa mô hình governance + vá P0 rename + sync doc |
| Items | (1) User chốt Hybrid C vs A/D · (2) Chặn/confirm rename loại global trong apply · (3) Align tab Rà soát với quyền duyệt · (4) Sync `quan-ly-dung-cu-luong` + `domain-decisions` §IA (tab Loại) · (5) Đăng ký ID nợ 09 vào backlog |
| Deps | Quyết định user mục 7 |
| AC | Không còn rename thầm master từ phiếu một bộ; doc khớp tab; approver non-admin thấy hàng chờ nếu có quyền edit |

### Đợt 1 — Catalog governance Hybrid MVP · Effort **M** · *(phase riêng)*

| Goal | NV đề xuất Loại (+ mở rộng BOM) không đụng form master |
| Items | Draft Loại → pending → approve insert; Dialog đề xuất; hàng chờ thống nhất; copy tách «sự cố an toàn» vs «đề xuất danh mục»; cấm THEM_DONG tạo loại ảo |
| Deps | Đợt 0 |
| AC | NV tạo đề xuất loại → admin/điều phối duyệt → loại hiện master → gắn BOM; reject không ghi master; audit ai duyệt |

### Đợt 2 — Kiểm kê đợt + Bộ draft (tuỳ volume) · Effort **M**

| Goal | Workspace đợt kiểm kê khoa; đề xuất Bộ mới có duyệt |
| Items | UI trên campaign.actions; xuất/phiếu kiểm kê; Bộ draft; báo cáo lệch chuẩn vs đếm |
| Deps | Đợt 1 |
| AC | Một khoa chạy kiểm kê 20 bộ: lệch → phiếu → duyệt → sổ khớp |

### Đợt 3 — An toàn quy trình residual · Effort **M**

| Goal | Implant CHO_BI write+gate; in lại tem từ Kho/Trace; UAT reform CSSD |
| Items | Persist quarantine; chặn CP; nút in tem đủ trường; checklist pilot cập nhật |
| Deps | Không phụ thuộc Dual catalog |
| AC | Vitest + 3 kịch bản tay implant/tem/giao khoa |

### Đợt 4 — Perf / mega-surface · Effort **L** (cắt lát)

| Goal | Giảm chậm cảm nhận ca trực |
| Items | NKBV lazy/workspace; SuCo form islands; NHCH/QLCV page; shell permission snapshot nhẹ |
| Deps | Baseline đo (đã có hướng whole-app) |
| AC | First paint 5 màn nóng giảm rõ (ms/KB/#row) so baseline |

### Đợt 5 — Giám sát / quản trị polish · Effort **S–M**

| Goal | Declutter GS; audit UI tối thiểu; lookup SSOT theo plan |
| Items | ModeNav/chrome; sổ audit TK; pha lookup không phá fact |
| Deps | Đợt 4 không bắt buộc |
| AC | PO đọc được «ai reset TK»; % VST không regress |

### Đợt 6 — UAT ký & nợ Wave 4 · Effort **S** + lịch khoa

| Goal | Đóng P1 sản phẩm |
| Items | UAT-NKBV; UAT-REFORM; Spaulding map tram thật; FHIR vẫn defer |
| AC | Chữ ký checklist |

**Không hứa:** rewrite NKBV một PR; module B full; hard-block cấp phát BOM; dual-admin bắt buộc; HIS/LIS.

---

## 7. Rủi ro / giả định / việc cần user chốt

### Giả định
- Pilot vẫn **1 admin** chính + vài NV CSSD.  
- Soft-warning thiếu BOM **giữ** (không hard-block).  
- 3 cửa dụng cụ **giữ** (không gộp Hỏng/Mất vào đổi DM).  
- Local tree là nguồn đúng; một phần đã vá 09 chưa deploy prod — roadmap tính trên **code local**.

### Rủi ro
- Làm Hybrid quá sớm trước khi chặn rename → nhân bản sai loại.  
- Nhân «module kiểm kê» song song sự cố → 2 sổ duyệt.  
- Perf rewrite NKBV làm trễ governance (ưu tiên sai).  
- Doc không sync → vòng UX giấu Loại lặp lại.

### Cần user chốt
1. **Governance:** C Hybrid (khuyến nghị) / A mở rộng phiếu / D giữ admin?  
2. **Ai được duyệt BOM/Loại:** chỉ ADMIN hay cả `BO_DC.edit` (tổ trưởng)?  
3. **Rename loại:** cấm từ phiếu bộ, hay cho phép kèm màn hình impact?  
4. **Có chạy kiểm kê định kỳ theo khoa không?** (nếu không → trì hoãn Đợt 2)  
5. **Ưu tiên song song:** Catalog Đợt 1 vs Implant CHO_BI vs NKBV UAT — xếp 1–2–3?  
6. Có được phép **sửa code** Đợt 0 (chặn rename) ngay sau khi chốt, hay chỉ doc?

---

## 8. Phụ lục — nguồn đã đọc

### Agent notes 09/2026 (`docs/archive/agent-notes/202609/`)
- `_agent-dung-cu-loai-proposal-20260907.md` — trả tab Loại  
- `_agent-su-co-dung-cu-audit-fix-20260908.md` · `_agent-su-co-bao-cao-deep-audit-20260908.md` · `_agent-su-co-po-gaps-fix-20260908.md`  
- `_agent-quy-trinh-dung-cu-domain-audit-20260908.md` · `_agent-quy-trinh-sw-process-fix-20260908.md`  
- `_agent-thiet-bi-hoa-chat-reaudit-20260907.md`  
- `_agent-vst-tuan-thu-audit-20260907.md` · `_agent-vst-tuan-thu-reaudit-calc-ui-20260907.md`  
- `_agent-quan-tri-eval-cleanup-20260907.md` · `_agent-admin-auth-review-20260907.md`  
- `_agent-whole-app-complexity-perf-20260907.md` · `_agent-perf-fix-progress-20260907.md` · `_agent-perf-batch6-plus-plan-20260907.md` · `_agent-perf-complexity-rootcause-20260907.md` · `_agent-perf-batch8-ssr-shell-spike-20260907.md`  
- `_agent-lookup-ssot-unification-plan-20260907.md`  
- `_agent-deep-audit-20260904.md` · `_agent-standardization-review-20260904.md` · `_agent-task-p0-next.md`

### SSOT / debt / backlog
- `docs/ssot-map.md` · `docs/core/domain-decisions-cssd-instrument.md` · `docs/modules/cssd/{README,domain-overview,quan-ly-dung-cu-luong}.md`  
- `docs/reference/architecture/{debt-register,open-backlog-20260731}.md`  
- `docs/reference/reports/{gap-register-20260709,full-system-audit-po-20260805,ksnk-bv103-compendium-20260824}.md`

### Code hot paths
- `src/app/**/page.tsx` (bản đồ route)  
- `src/lib/nav/sidebar-nav-groups.ts` · `sidebar-admin-nav-groups.ts`  
- `src/modules/quan-tri-he-thong/danh-muc/dung-cu/QuanLyDungCuPage.tsx` · Loai/Bo pages  
- `src/lib/domain/cssd-catalog-master-write.ts` · `src/lib/master-data/{require-cssd-catalog-master-write,cssd-set-bom-apply-core}.ts`  
- `src/modules/cssd-su-co/actions/set-reconcile-approve.actions.ts` · `set-reconcile-campaign.actions.ts`  
- `src/lib/domain/cssd-set-reconcile.ts`

### Không phủ đủ
- Từng RPC SQL / mọi migration sau 08 · toàn bộ e2e Playwright · mọi panel NKBV 2k dòng · prod runtime metrics · Docker golden (OPS-DB-01).

---

**Boy Scout docs (pass này):** đã sync `quan-ly-dung-cu-luong.md` + `domain-decisions-cssd-instrument.md` §IA (sheet → tab Loại). Không sửa `src/`.

---

## Quyết định user 09-09: Hybrid C · Đợt 0 started · **full 2-tier shipped local**

- User **chốt Hybrid C** (NV draft Loại/Bộ/BOM → duyệt → publish; ADMIN override).
- **Đợt 0 started** (local): chặn rename master loại từ phiếu một bộ; align tab Rà soát với `BO_DC.edit`/`DC_LE.edit`; xem `docs/modules/cssd/_agent-catalog-hybrid-c-dot0-20260909.md`.
- Mục 7 câu 1–3–6: **đã trả lời** (C · cấm rename từ phiếu bộ · được sửa code Đợt 0).
- **2026-09-09 tiếp:** Dual-approve L1 (NV peer) → L2 (ADMIN publish) cho BOM + đề xuất Loại/Bộ; doc `_agent-catalog-hybrid-c-full-2tier-20260909.md`.

*Hết báo cáo. Pass này: docs only — không commit.*

## _agent-project-optimization-debt-roadmap-20260909

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`debt-register.md`](../../plans/architecture/debt-register.md). Tra cứu lịch sử được.

# Lộ trình tối ưu & nợ kỹ thuật (delta) — KSNK BV103

> **Ngày:** 2026-09-09 (Asia/Saigon) · **Máy:** Mac `Desktop/ksnk_bv103` · machineId `6bad1c57-…0f88`  
> **Phạm vi:** READ-FIRST · chỉ local · **không** commit/push · docs only.  
> **Nền:** roadmap audit [`_agent-full-project-expert-audit-roadmap-20260909.md`](#_agent-full-project-expert-audit-roadmap-20260909) — báo cáo này là **delta sau** Hybrid C 2-tier · Qty SSOT · gộp BOM · các đợt sự cố / quy trình / VST / TB-HC / perf 09/2026.  
> **Phương pháp (trung thực):** ~55 `page.tsx` · `src/modules/*` LOC · debt-register / open-backlog · note agent 09/2026 · doc CSSD Hybrid/Qty/BOM · hot path NKBV / QT / CSSD / sự cố / đào tạo / QLCV / dashboard. **Không** claim đọc từng dòng ~mọi file.

---

## 1. Tóm tắt điều hành — đã đóng gần đây vs còn đau

### Đã đóng gần đây (delta so roadmap sáng cùng ngày)

| Hạng mục | Kết quả | Bằng chứng ngắn |
|----------|---------|-----------------|
| **Hybrid C catalog 2-tier** | NV đề xuất + L1 peer → Admin L2 publish; ADMIN khẩn giữ | `_agent-catalog-hybrid-c-full-2tier-20260909.md` · FSM `BOM_PENDING` → `BOM_PENDING_L2` |
| **Đợt 0 an toàn sổ** | Cấm rename master loại từ phiếu một bộ; tab Rà soát align quyền duyệt | `_agent-catalog-hybrid-c-dot0-20260909.md` · `wouldGlobalRenameLoaiMaster…` |
| **Qty SSOT tab Loại** | «Trong bộ» chỉ cộng **bộ active** + clamp ≥0; QT hiện Tổng/Trong bộ/Trong kho | `_agent-catalog-qty-integrity-audit-20260909.md` |
| **BOM trùng + unique** | Gộp **135** cặp · soft-off **169** dòng · **0** dup active · unique index **live prod** | `_agent-bom-merge-unique-20260909.md` |
| **Sự cố 09-08** | 3 cửa · PHYSICAL riêng · four-eyes xác nhận · HC `chemicalId` + quarantine xuất | `su-co-*-fix` notes |
| **Quy trình 09-08** | Tem chu trình đủ trường · timeline 6 khâu · soft-warn giao khoa | `quy-trinh-sw-process-fix` |
| **VST / TB-HC / perf Batch 1–12** | % KPI mẫu số · PM TZ · FEFO HC · phân trang catalog/kho · nhiều RPC rollup | debt-register § Perf · perf-fix-progress |

### Còn đau thật (sau delta)

1. **NKBV vẫn mega-surface** (~49k LOC · file 1k–2k dòng) — rối nhập + chậm cảm nhận; UAT lâm sàng chưa ký.  
2. ~~**Implant / cách ly `CHO_BI`**~~ — **FIXED local Đợt A 09-09** (persist + gate CAP_PHAT + gỡ BI + vitest).  
3. **Form sự cố dày (~1100 dòng)** — còn; **copy FSM 3 trục** đã bổ sung Đợt B (xác nhận phiếu ≠ L1 ≠ L2).  
4. **Dual / multi cửa dụng cụ** — **copy/CTA Đợt B** đã khóa 1 câu trên RO/QT/sự cố/Rà soát (IA giữ).  
5. **Perf residual hệ thống:** shell quyền hydrate mọi route · Dashboard/BCTH `ssr:false` · NHCH/export edge · mega QLCV page (nhiều Batch đã cắt payload nhưng độ dày module còn).  
6. **Dữ liệu vệ sinh:** bộ soft-delete còn chi tiết active trên DB (UI đã lọc; chưa cascade).  
7. **Nợ sản phẩm:** UAT NKBV + UAT reform CSSD · phiếu «đổi master loại» riêng · workspace kiểm kê đợt · sổ audit TK mỏng · 1-admin pilot.

**Không còn P0 catalog governance / rename thầm / BOM dup active** như sáng nay — trọng tâm tối ưu chuyển sang **độ rối mega-page · an toàn implant · dual surface copy · payload shell**.

---

## 2. Top 10 điểm đau / tối ưu còn lại

Xếp theo **tác động vận hành × effort** (cao = làm sớm nếu muốn tối ưu hệ thống).

| # | Điểm đau | Impact × Effort | Vì sao còn đau | Hướng tối ưu |
|---|----------|-----------------|----------------|--------------|
| 1 | **NKBV mega-page / mega-file** | Impact cao · Effort **L** | Wave2: 1 slice defer cases list; còn mega file | Tiếp lazy filter DM / island hội chứng |
| 2 | ~~**Implant / quarantine chặn cấp phát**~~ | — | **FIXED** Đợt A 09-09 | Giữ vitest; UAT tay 3 kịch bản |
| 3 | **Form sự cố mega** (+ FSM copy đã vá) | Impact TB · Effort **M** | Wave2: lazy catalog theo nhóm + cắt remount; form orchestration còn dày | Tách file orchestration (sau) |
| 4 | ~~**Dual surface CTA/copy**~~ | — | **PARTIAL→improved** Đợt B 09-09 | Giữ deep-link; quan sát UAT |
| 5 | **Shell RBAC / offline hydrate** | Impact TB · Effort **M** | Batch 8 + Wave2 dynamic offline GS; cold RBAC full matrix còn | Snapshot theo menu (sau) |
| 6 | **Dashboard / BCTH nặng client** | Impact TB · Effort **M** | `ssr:false` + Recharts; first paint chậm | Island theo widget; giữ auth gate |
| 7 | ~~**In lại tem chu trình từ Kho/Trace**~~ | — | **FIXED** Wave2 09-09 | Giữ nút Kho/Trace |
| 8 | **Vệ sinh BOM trên bộ inactive** | Impact thấp–TB sổ · Effort **S** | UI đúng SSOT; DB còn dòng active trên bộ tắt | Cascade soft-delete hoặc job dọn (tuỳ PO) |
| 9 | **Phiếu đổi master loại (impact nhiều bộ)** | Impact TB khi đổi SKU · Effort **M** | Rename từ phiếu bộ đã cấm; chưa có luồng admin có impact | Phiếu/master riêng + hiện số bộ ảnh hưởng |
| 10 | **UAT lâm sàng / reform chưa ký** | Impact sản phẩm · Effort **S** + lịch khoa | Eng sẵn; thiếu chữ ký | Gói UAT ngắn; không đợi rewrite |

**Không xếp top:** HIS/FHIR · module kiểm kê ERP mới · hard-block BOM cấp phát · dual-admin bắt buộc (pilot 1 admin chấp nhận).

---

## 3. Inventory nợ kỹ thuật theo miền

Ký hiệu: **OPEN** · **PARTIAL** · **FIXED** (local gần đây) · **DONE-HIST** (07–08).

### 3.1 CSSD — Quy trình / mẻ / kho / truy vết

| ID | Symptom | Sev | Status | Ghi chú delta |
|----|---------|-----|--------|---------------|
| QT-BD | BD đầu ngày steam hard | P0 | **FIXED** | Giữ |
| QT-PACK | Chặn gói xấu / HSD cấp phát | P0 | **FIXED** | Soft BOM giữ |
| QT-TEM | Tem chu trình đủ trường | P1 | **FIXED** | In lại Kho/Trace Wave2 09-09 — `_agent-opt-wave2-debt-fixes-20260909.md` |
| QT-TRACE | Timeline 6 khâu | P1 | **FIXED** | Soft-warn giao khoa kèm |
| QT-IMPLANT | Quarantine implant / chặn CP | P1 | **FIXED** local | Đợt A 09-09: write+gate+release+vitest — `_agent-opt-dotA-implant-dotB-cta-20260909.md` |
| QT-BI3 | 3×BI(−) mở máy auto | P2 | **OPEN** | Sau UAT |
| QT-POU | POU / lot enzyme | P2 | **PARTIAL** | Soft trước hard |
| QT-KHO | Kho full dump | P1 | **FIXED** | Phân trang + RPC counts |

### 3.2 CSSD — Danh mục Loại / Bộ / BOM

| ID | Symptom | Sev | Status | Ghi chú delta |
|----|---------|-----|--------|---------------|
| DC-HYBRID | NV không soạn Loại/Bộ có kiểm soát | P0 SP | **FIXED** local | Hybrid C 2-tier |
| DC-RENAME | Rename master từ phiếu một bộ | P0 data | **FIXED** | Gate hard |
| DC-QUEUE | Tab Rà soát chỉ admin UI | P1 | **FIXED** | Align `BO_DC`/`DC_LE` + L1/L2 |
| DC-QTY | Trong bộ cộng bộ inactive | P0 UI | **FIXED** | SSOT active bộ |
| DC-DUP | 135 BOM dup active | P1 data | **FIXED** live | Unique index prod |
| DC-MASTER | Phiếu đổi master loại + impact | P1 | **OPEN** | Chưa có luồng riêng |
| DC-CAMPAIGN | Workspace kiểm kê đợt | P2 | **PARTIAL** | Campaign actions mầm |
| DC-INACTIVE | Chi tiết active trên bộ soft-delete | P2 | **OPEN** data | UI đã lọc |
| DC-DUAL | Multi surface sửa dụng cụ | P1 UX | **PARTIAL** | Copy/CTA Đợt B 09-09 (RO/QT/sự cố/Rà soát) |

### 3.3 CSSD — Sự cố

| ID | Symptom | Sev | Status |
|----|---------|-----|--------|
| SC-DOOR | 3 cửa lẫn form | P0 | **FIXED** |
| SC-PHYS | PHYSICAL collapse sổ | P1 | **FIXED** |
| SC-4EYES | Tự xác nhận phiếu mình | P1 | **FIXED** |
| SC-CHEM | HC dùng machineId | P1 | **FIXED** phần · gỡ quarantine UI **OPEN** |
| SC-FORM | Form ~1100 dòng | P1 | **PARTIAL** | Wave2: trì hoãn catalog máy/HC + cắt remount cửa dụng cụ |
| SC-FSM | Hai trục «duyệt» (phiếu vs L1/L2 DM) | P1 UX | **PARTIAL** | Copy 3 trục Đợt B; form mega còn OPEN |
| SC-SEV | Severity grading | P2 | **OPEN** |

### 3.4 CSSD — Thiết bị / hóa chất

| ID | Sev | Status |
|----|-----|--------|
| TBHC ngưỡng tồn / FEFO / PM TZ | P0–P1 | **FIXED** |
| Fleet đếm mẻ dump | P2 | **FIXED** (RPC Batch 10) |
| UI gỡ quarantine HC | P2 | **OPEN** |

### 3.5 Giám sát VST / GSC / NKBV

| ID | Sev | Status |
|----|-----|--------|
| VST % mẫu số đúng | P0 | **FIXED** |
| GSC % đạt/quan sát | — | **OK** |
| GS chrome / ModeNav dày | P2 | **OPEN** declutter |
| NKBV mega-surface | P0 rối | **PARTIAL** | Wave2: defer `listGiamSatNkbvCas` đến tab cases |
| NKBV limit/filter bulk | P1 | **FIXED** phần lớn (Batch 2/6) |
| NKBV UAT lâm sàng | P1 SP | **OPEN** |
| Trace CSSD↔SSI | P2 | **NEAR-DONE** · UAT |

### 3.6 Quản trị / RBAC / TK

| ID | Sev | Status |
|----|-----|--------|
| Hub 4 việc + một cửa TK | — | **OK / FIXED** cleanup |
| Self-reset / 1 admin | P1–P2 | **PARTIAL** |
| Audit UI mỏng | P1 | **OPEN** |
| Guest / seed RBAC | P2 | **PARTIAL** (seed Done) |

### 3.7 Đào tạo / QLCV / Dashboard / Offline / Cross

| ID | Sev | Status |
|----|-----|--------|
| NHCH limit lớn / export 20k | P1→P3 | **PARTIAL** (toast truncate; bank lớn = P3) |
| QLCV payload / remount | P1 | **FIXED** phần lớn Batch 11–12 |
| Dashboard island / ssr:false | P1→P3 | **OPEN** (spike SKIP Batch 8) |
| Offline CSSD extraPayload | — | **DONE-HIST** |
| Offline GS hydrate shell | P2 | **PARTIAL** | Wave2: dynamic `SupervisionOfflineSyncListener` |
| Lookup SSOT unification | P1 plan | **PLAN** — chưa ship hết |
| Perf Batch 1–12 core | P1 | **FIXED** phần lớn; residual P3 |
| open-backlog đăng ký nợ 09 | P1 process | **PARTIAL** — xem § debt dưới |

---

## 4. Không phù hợp (IA trùng · dual surface · FSM copy · doc drift)

| Loại | Hiện tượng | Mức | Hướng |
|------|------------|-----|-------|
| **IA / dual surface** | Cùng việc «xem/sửa dụng cụ» qua RO `/cssd-dung-cu` · Kho tab quy trình · QT danh mục · cửa Đề xuất sự cố | P1 | Giữ 4 cửa đúng domain; **khóa CTA** («Tra cứu» / «Sửa master» / «Đề xuất chờ duyệt») |
| **FSM copy** | «Xác nhận sự cố» vs «Duyệt lần 1/2 danh mục» vs ADMIN «Thêm khẩn» | P1 UX | Một câu trên hàng chờ + form; không gộp schema vội |
| **Shell tab vs sidebar** | Quy trình 4 tab (Chu trình/Mẻ/Kho/Trace) hợp ca trực nhưng cảm giác «hai kho» với catalog RO | P2 | Giữ pilot; Kho mặc định filter CAP_PHAT + soft-warn |
| **Deep-link legacy** | `/cssd-erp/batch|report`, `/thong-ke/*`, QT redirect hub | P2 | Giữ redirect; không nhân page mới |
| **Doc drift** | Sheet Loại đã sync 09-09; pilot checklist còn wording cũ (BOM modal) | P2 | Boy Scout khi chạm module |
| **Lookup vs enum** | Plan 09-07 chưa ship hết | P1 duy trì | Theo `lookup-ssot` plan — không phá fact |
| **Debt process** | open-backlog 07-31 chưa liệt kê ID nợ 09 (Hybrid/NKBV/implant) | P1 process | Đăng ký pointer sang báo cáo này |

---

## 5. Lộ trình tối ưu theo đợt

### Đợt A — An toàn + CTA nhanh (3–5 ngày) · Effort **S–M**

| Mục tiêu | Vá lỗ an toàn còn lại + giảm nhầm cửa |
| Items | (1) Implant quarantine write + gate CP · (2) Nút in lại tem Kho/Trace · (3) Copy/CTA dual surface 1 câu · (4) Copy FSM «xác nhận ≠ duyệt danh mục» |
| Effort | S–M |
| Acceptance | 3 kịch bản tay implant/tem/CTA; vitest gate; không rename/BOM regress |
| Status 09-09 chiều | **(1)(2)(3)(4) DONE** local — Đợt A/B + Wave2 tem in lại (`_agent-opt-wave2-debt-fixes-20260909.md`). |

### Đợt B — Cắt rối NKBV (lát 1–2 tuần) · Effort **L** (chia PR)

| Mục tiêu | Giảm first-paint và độ dày cảm nhận ca giám sát |
| Items | Lazy workspace theo việc (BA list / hội chứng / timeline); tách file >1.5k; không đổi rules engine một phát |
| Effort | L |
| Acceptance | Đo #chunk / thời gian mở; UAT checklist không regress eng |
| Status 09-09 tối | **Slice 1** Wave2 — `enabled: mainTab==="cases"` (không fetch phiếu khi ở records) |

### Đợt C — Form sự cố + shell phí · Effort **M**

| Mục tiêu | Bảo trì form; giảm hydrate mọi trang |
| Items | Island SuCo theo nhóm; snapshot RBAC theo menu; trì hoãn offline GS |
| Effort | M |
| Acceptance | Form nhóm không mount full 1k dòng; shell nhẹ hơn trên route không GS |
| Status 09-09 tối | **PARTIAL** Wave2 — defer catalog SuCo + dynamic offline GS; RBAC menu-snapshot còn |

### Đợt D — Dashboard / QLCV / Đào tạo polish · Effort **S–M**

| Mục tiêu | Island BCTH; giữ Batch 12; NHCH toast đủ |
| Items | Widget island `/` + báo cáo; không SSR spike nếu auth+charts cấm |
| Effort | S–M |
| Acceptance | First paint cảm nhận tốt hơn; không phá filter scorecard |

### Đợt E — Dữ liệu + governance residual · Effort **S–M**

| Mục tiêu | Sổ sạch; luồng đổi master loại khi cần |
| Items | Dọn/cascade chi tiết trên bộ inactive; phiếu đổi master + impact; (tuỳ volume) workspace kiểm kê |
| Effort | S–M |
| Acceptance | Reconcile script 0 orphan «active trên bộ tắt» (nếu chọn cascade); impact UI trước publish |

### Đợt F — UAT ký + Wave 4 defer · Effort **S** + lịch

| Mục tiêu | Đóng nợ sản phẩm |
| Items | UAT-NKBV · UAT-REFORM · audit UI tối thiểu · Spaulding map tram thật · FHIR vẫn defer |
| Acceptance | Chữ ký checklist |

**Không hứa:** rewrite NKBV một PR · module kiểm kê ERP mới · hard-block BOM · HIS/LIS · dual-admin bắt buộc.

---

## 6. Việc cần user chốt

1. **Ưu tiên song song tiếp theo:** Đợt A (implant+CTA) vs Đợt B (NKBV lazy) vs UAT ký — xếp **1 / 2 / 3**?  
2. **Cascade soft-delete chi tiết khi tắt bộ?** Có / không / chỉ job dọn một lần?  
3. **Có cần phiếu «đổi master loại» sớm không** (volume đổi SKU)?  
4. **Workspace kiểm kê đợt theo khoa** — có lịch định kỳ không? (không → trì hoãn Đợt E phần campaign)  
5. **Four-eyes danh mục:** L1 bắt buộc peer khác creator (đã ship) — có siết thêm «L1 không được là cùng ca với reporter» không?  
6. **Được phép sửa code** Đợt A ngay sau chốt, hay chỉ giữ docs?

---

## 7. Phụ lục nguồn

### Delta catalog / qty / BOM (09-09)
- `docs/modules/cssd/_agent-catalog-hybrid-c-dot0-20260909.md`
- `docs/modules/cssd/_agent-catalog-hybrid-c-full-2tier-20260909.md`
- `docs/modules/cssd/_agent-catalog-qty-integrity-audit-20260909.md`
- `docs/modules/cssd/_agent-bom-merge-unique-20260909.md` (+ JSON/txt kèm)

### Roadmap / debt / backlog
- `docs/archive/agent-notes/202609/_agent-full-project-expert-audit-roadmap-20260909.md`
- `docs/reference/architecture/debt-register.md` (§ Perf Batches 1–12)
- `docs/reference/architecture/open-backlog-20260731.md`
- `docs/ssot-map.md`

### Agent notes 09/2026 (lưu trữ)
- Sự cố / quy trình / VST / TB-HC / quan-tri / perf / lookup — thư mục `docs/archive/agent-notes/202609/`

### Code / quy mô (đo 2026-09-09)
- Routes App Router: **55** `page.tsx`
- Module LOC ước: NKBV ~49.5k · QT ~22.4k · cssd-erp ~18.8k · QLCV ~11.5k · cssd-su-co ~10.0k · GSC ~8.7k · dashboard ~5.9k · VST ~4.9k · dao-tao ~4.5k
- Mega ví dụ: `NkbvBaMultiTimelineWorkspace` ~2254 · `SuCoReportForm` ~1103 · `GiamSatNkbvPage` ~1175

### Không phủ đủ
- Mọi migration sau 08 từng dòng · e2e Playwright full · prod APM · Docker golden (OPS-DB-01) · mọi panel NKBV 2k dòng từng hàm.

---

*Pass này: docs only — không commit/push. Cập nhật nhẹ debt-register (pointer) nếu có trong cùng pass.*

---

## Nhật ký delta

- **2026-09-09 chiều (Đợt A+B):** Implant CHO_BI write+gate+release+vitest; CTA dual surface + FSM 3 trục. Báo cáo: [`_agent-opt-dotA-implant-dotB-cta-20260909.md`](./cssd.md#_agent-opt-dotA-implant-dotB-cta-20260909).
- **2026-09-09 tối (Wave 2):** In lại tem Kho/Trace; SuCo defer catalog + cắt remount; dynamic offline GS; NKBV defer cases list. Báo cáo: [`_agent-opt-wave2-debt-fixes-20260909.md`](#_agent-opt-wave2-debt-fixes-20260909).

## _agent-opt-wave2-debt-fixes-20260909

> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`debt-register.md`](../../plans/architecture/debt-register.md). Tra cứu lịch sử được.

# Wave 2 — vá nợ tối ưu (tem in lại · SuCo · shell · NKBV lazy)

> **Ngày:** 2026-09-09 (Asia/Saigon) · **Máy:** Mac `Desktop/ksnk_bv103` · machineId `6bad1c57-…0f88`  
> **Phạm vi:** LOCAL ONLY · không commit/push · UI tiếng Việt thường · Dialog UX · diff nhỏ.  
> **Nền:** `_agent-project-optimization-debt-roadmap-20260909.md` (OPEN còn lại sau Đợt A/B implant+CTA).

---

## Đã ship đợt này

### 1) QT-TEM — In lại tem chu trình (Kho + Trace) · **FIXED**

| Chỗ | Thay đổi |
|-----|----------|
| Nút dùng chung | `src/modules/cssd-erp/components/labels/CssdCycleLabelReprintButton.tsx` — gọi `fetchCssdCycleLabelData` + `printCycleLabel` (mã, mẻ, HSD, người ĐG, ngày) |
| Kho | `KhoDungCuPage` — icon Tag cạnh in phiếu cấp phát; disable khi chưa có `ma_cycle_qr` |
| Trace | `QRHistoryViewer` — nút full-width «In lại tem chu trình» khi có quy trình |

**AC:** Ca trực in lại từ Kho/Trace không cần quét lại trạm Đóng gói.

### 2) SC-FORM — Form sự cố residual lazy · **PARTIAL→improved**

| Việc | Chi tiết |
|------|----------|
| Trì hoãn catalog nặng | Staff load ngay; máy/hóa chất chỉ khi nhóm BATCH/EQUIPMENT/CHEMICAL (`needsHeavyCatalog`) |
| Cắt remount | Bỏ `key={physical\|catalog}` trên `InstrumentSetReconcileTable`; reset state theo `doorMode` trong bảng |
| Không đổi taxonomy | Giữ 3 cửa / checklist / FSM copy Đợt B |

Form vẫn ~1100 dòng orchestration — island field đã dynamic từ trước; residual đã cắt payload mở nhóm PROCESS.

### 3) Shell RBAC / offline residual · **PARTIAL→improved**

| Việc | Chi tiết |
|------|----------|
| Đo nhanh | Batch 8.1 (RBAC TTL/stale) + 8.2 (`offline-sync-scope`) đã có; còn `SupervisionOfflineSyncListener` **static import** trong layout |
| Vá | Dynamic import listener GS (giống `OfflineSyncManager`) — không hydrate chunk offline GS trên mọi trang |

RBAC full matrix cold-path giữ (Sidebar cần gate nav) — không đụng schema.

### 4) NKBV first lazy cut · **PARTIAL** (1 slice đo được)

| Việc | Chi tiết |
|------|----------|
| Hook | `useServerPaginatedTable` thêm `enabled?: boolean` — không fetch khi tab chưa mở |
| Page | `GiamSatNkbvPage`: `enabled: mainTab === "cases"`; tab mặc định vẫn **records** |
| Đo | Mở `/giam-sat-nkbv` mặc định **không** gọi `listGiamSatNkbvCas` đến khi bấm «Danh sách phiếu» |

**Next (không làm wave này):** lazy thêm filter DM bundle theo tab cases; tách file workspace >1.5k; island hội chứng theo loại.

---

## Kiểm thử

| Kiểm | Kết quả |
|-------|---------|
| Vitest | `cssd-cycle-label-html.spec` + `offline-sync-scope.spec` — **7/7 pass** |
| `tsc --noEmit` (touched) | Không lỗi mới trên file wave này; lỗi sẵn có `cssd-cho-bi.ts` / nkbv-ruled-out.spec / nkbv-rules-engine.spec (ngoài phạm vi) |

---

## Roadmap IDs cập nhật

| ID | Trước | Sau |
|----|-------|-----|
| QT-TEM (nút in lại) | OPEN | **FIXED** local |
| SC-FORM | OPEN | **PARTIAL** (lazy catalog + cắt remount; form vẫn dày) |
| Offline GS hydrate shell | OPEN | **PARTIAL→improved** (dynamic listener) |
| NKBV mega-surface | OPEN | **PARTIAL** (1 slice: defer cases list) |
| #7 Top-10 in lại tem | OPEN | **FIXED** |
| #5 Shell RBAC/offline | OPEN | **PARTIAL** |
| #1 / #3 form / NKBV | OPEN | **PARTIAL** |

---

## Không làm

- Commit / push / cloud  
- Rewrite NKBV 49k · redesign taxonomy sự cố · cascade chi tiết bộ inactive (chưa chốt PO)  
- Menu-scoped RBAC snapshot (Sidebar vẫn cần full gate)

---

*Boy Scout: tái dùng helper in tem sẵn có · defer fetch · dynamic offline — không nhân cổng.*

## _agent-cursor-optimize-20260909

# Cursor optimize 2026-09-09 (go-live oriented)

## Findings
- Always-on trước đây: 00+01+04 (~4.7KB). **04 đã tắt alwaysApply** (P0 trước đó).
- `62-destructive-change-gate` glob `src/**/*` khiến gần như mọi edit src nạp gate ~1.7KB → **thu hẹp chỉ migrations**.
- `agent-efficiency` trùng 01 → giữ @mention, note đã gộp.
- Catalog skills ghi sai «04 always on» → sửa.
- Thiếu lệnh chính thức cho prompt Grok → thêm `/grok-handoff`.
- Skills lớn (`react-dev`, `supabase`, `smart-db`) đúng kiểu manual @ — không always-on (tốt).
- Hook `beforeSubmitPrompt` read-minimum: giữ (fail-open).
- MCP Supabase: giữ cho schema thật; cấm đoán.

## Changes this pass
- rules: 00, 62, agent-efficiency note
- commands: grok-handoff, implement note, ship-slice report
- AGENTS.md Grok↔Cursor table
- skills-catalog + review-bv103 checklist

## Not changed (cố ý)
- Không xóa pilot skills / agents (vẫn hữu ích theo module)
- Không tắt plugin Vercel/Slack trong settings (tuỳ PO; Vercel deploy vẫn tắt ở vercel.json)
- Không commit — PO quyết
