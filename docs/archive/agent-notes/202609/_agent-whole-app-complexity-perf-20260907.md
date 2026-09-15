> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`open-backlog-20260731.md`](../../../reference/architecture/open-backlog-20260731.md). Tra cứu lịch sử được.

# Audit toàn app — độ rối / hiệu năng / chồng chéo IA

> **Chỉ đọc** trên Mac `Desktop/ksnk_bv103` · machineId `6bad1c57-…0f88` · 2026-09-07 (Asia/Saigon)  
> **Không** sửa code, **không** commit.  
> Phạm vi: mọi domain App Router + `src/modules/*` + shell chung + docs debt/perf sẵn có.

---

## Liên hệ note CSSD trước đó

Note CSSD [`docs/modules/cssd/_agent-perf-complexity-rootcause-20260907.md`](../../modules/cssd/_agent-perf-complexity-rootcause-20260907.md) vẫn đúng cho **một lát cắt** (catalog full-load, dual surface dụng cụ, shell 4 tab quy trình, `select("*")` + limit nghìn).

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

See [`_agent-perf-fix-progress-20260907.md`](./_agent-perf-fix-progress-20260907.md). Landed: paginated `getBoDungCuRowsAction` + `useServerPaginatedTable` on Bo page; `/cssd-dung-cu` search-first (`searchKhoCatalogBo*` / first page 20). Next: Batch 2 (kho narrow + listMasterRows + NKBV 8000).
