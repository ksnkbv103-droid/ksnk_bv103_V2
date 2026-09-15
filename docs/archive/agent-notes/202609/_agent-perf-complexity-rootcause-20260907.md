> **LƯU TRỮ** — không dùng khi sửa hệ thống. Bản hiện hành: [`open-backlog-20260731.md`](../../../reference/architecture/open-backlog-20260731.md). Tra cứu lịch sử được.

# BV103 vs Moodle — Căn nguyên chậm / phức tạp / chồng chéo

> Phân tích **chỉ đọc** trên Mac `Desktop/ksnk_bv103` · 2026-09-07 (UTC+7)  
> Phạm vi: stack Next App Router, hot path CSSD dụng cụ / quản trị / giám sát, dual surface, bundle, docs perf sẵn có.  
> Không chỉnh code trong đợt này — chỉ chẩn đoán + lộ trình cắt.

---

## So sánh ngắn Moodle vs BV103

| | **Moodle (cảm giác mượt)** | **KSNK BV103 / CSSD (cảm giác nặng)** |
|---|---|---|
| Mô hình sản phẩm | Học liệu + khóa học: vài luồng tuần tự (xem → làm bài → nộp) | **ERP lâm sàng + danh mục + RBAC + QR + kho + sự cố** cùng lúc |
| Một màn hình | Một nhiệm vụ rõ (đọc trang / làm quiz) | Thường **nhiều tab + dialog + bảng + quyền** trên cùng shell |
| Dữ liệu lúc mở trang | Ít bản ghi theo ngữ cảnh khóa học | Hay **kéo cả danh mục / view full** rồi lọc trên client |
| Kiến trúc FE | Trang server-ish, plugin tách, ít state toàn cục | Next 16 + React 19 nhưng **~1/3 file `src` là `"use client"`**; root bọc RBAC + sidebar mọi route |
| Kỳ vọng user | “Vào học” | “Vào hệ thống bệnh viện” — đúng nghiệp vụ khó hơn Moodle; cảm giác chậm đến từ **IA + payload + client shell**, không chỉ vì “Next chậm” |

**Kết luận so sánh:** Moodle nhẹ vì **sản phẩm hẹp**. BV103 nặng vì đúng là **nhiều domain**; phần có thể cắt là **cửa vào trùng, danh mục full-load, trang client khổng lồ** — không phải viết lại stack.

---

## Bằng chứng nhanh (số đo repo)

- **Stack:** `next@16.3.4`, `react@19.2.8`, App Router (`src/app`), Supabase, Tailwind 4.
- **~55** `page.tsx`; **25 CLIENT / 30 SERVER** ở tầng page; **414** file có `"use client"` / ~1248 file `.ts(x)` dưới `src`.
- Module lớn: `quan-tri-he-thong` ~171 file, `cssd-erp` ~152, `giam-sat-chung` ~77.
- Hot path dụng cụ: `/cssd-dung-cu` (RO) + `/quan-tri-he-thong/danh-muc/dung-cu/*` (CRUD) — đã ghi rõ trong `quan-ly-dung-cu-luong.md`.
- `getKhoCatalogPayloadAction`: **không phân trang** — nạp toàn bộ bộ active + meta + hóa chất + khoa.
- `getBoDungCuRowsAction`: `select("*")` trên `v_cssd_bo_dung_cu_summary` **không limit** (Loại đã có `range` page 20 — Bộ chưa).
- Kho vận hành: `fetchCssdKhoDungCuList` → `select("*")` + `limit(8000)` trên `v_cssd_quy_trinh_full`.
- `/cssd-quy-trinh`: một page client gom **4 tab** (chu trình / mẻ / kho / truy vết), `dynamic(..., { ssr: false })`.
- Root `layout.tsx`: mọi trang qua `PermissionProvider` + `ClientLayoutWrapper` (sidebar/header/RBAC).
- Docs sẵn: `docs/reference/reports/perf-audit-20260703.md` (exceljs đã lazy), `docs/archive/baselines/cssd-perf-baseline-20260526.md`, `docs/reference/architecture/simplification-program-20260726.md`, `debt-register.md`.

---

## Căn nguyên thật (ưu tiên)

### 1. Mô hình sản phẩm “nhiều hệ trong một app” (gốc nhận thức)

Một session user phải nghĩ: giám sát (VST/GSC/NKBV) · công việc · CSSD quy trình · tra cứu dụng cụ · quản trị master · sự cố · hóa chất · thiết bị · báo cáo.  
Sidebar đã giản hóa một phần (hub giám sát, 4 job quản trị) nhưng **CSSD vẫn nhiều cửa** (quy trình tabbed + dung-cu + su-co + thiet-bi + hoa-chat + quan-tri dung-cu).

**Triệu chứng:** “phức tạp, chồng chéo, không biết vào đâu”; so với Moodle thì “mỗi lần vào là một việc”.

### 2. Client-first + shell RBAC toàn cục (gốc cảm giác chậm khi đổi trang)

- 25/55 page là `"use client"`; module CSSD/giám sát gần như toàn hook client lớn (`use-giam-sat-chung-form` ~655 dòng, panel chi tiết bộ ~700 dòng).
- Mọi route trả phí: hydrate PermissionProvider, Sidebar, StaffSessionGate, offline listeners.
- Auth gate chủ yếu client (nợ D-09 trong debt-register) → flash loading / chờ quyền trước khi thấy nội dung.

**Triệu chứng:** mở trang “nặng”, spinner tab, máy yếu/mạng bệnh viện càng lộ.

### 3. Danh mục / view hot path kéo bulk không phân trang (gốc chậm dữ liệu)

| Điểm nóng | Hành vi hiện tại |
|---|---|
| `/cssd-dung-cu` | `getKhoCatalogPayloadAction` — **full** bộ + hóa chất + khoa vào state client; search loại mới limit 20 |
| Quản trị Bộ | `getBoDungCuRowsAction` — `select("*")` **toàn bảng summary**, rồi join loai/khoa |
| Tab Kho trong quy trình | `select("*")` view full, **limit 8000** |
| Master generic | `listMasterRows` — `select("*")` không page |
| Tiếp nhận chờ quét | load **toàn bộ** `cssd_dm_bo_dung_cu` active rồi filter client |

Search có `PAGE = 20` nhưng **lần mở đầu vẫn full** → cảm giác “đang tải danh mục…” và UI giật khi filter.

**Triệu chứng:** màn dụng cụ / quản trị bộ / kho chậm lần đầu; càng nhiều bộ càng tệ (pilot lớn sẽ lộ).

### 4. Dual surface đúng nghiệp vụ nhưng UI vẫn “hai app giống nhau” (gốc chồng chéo)

Đã chốt đúng: **CRUD master = quản trị**, **xem/in/quét = `/cssd-dung-cu`**.  
Nhưng cả hai đều: bảng lớn + Dialog thành phần + tìm/QR + panel dày → user thấy **cùng một danh mục hai lần**, cộng tab Kho trong `/cssd-quy-trinh` và redirect legacy `cssd-erp/*`.

Hub quản trị (4 job) + hub giám sát + mega-shell CSSD 4 tab = nhiều “cổng” cho cùng vật liệu (bộ/loại).

**Triệu chứng:** “overlapping, verbose”; Dialog lồng / mở thành phần trên list (Radix Dialog dày trên mobile).

### 5. Form giám sát / bảng kiểm: state machine client dày (gốc “nặng khi nhập liệu”)

`useGiamSatChungForm` + template sync + sticky admin context + offline queue + nhiều `useEffect` nạp options.  
Không phải Moodle quiz đơn giản: mỗi lần mở form kéo master bảng kiểm / khoa / template.

**Triệu chứng:** form GSC “nặng”, phức tạp hơn Moodle dù chỉ “đánh checklist”.

### 6. Bundle / phụ thuộc nặng — đã xử lý một phần, chưa phải gốc chính cảm giác phức tạp

- `exceljs` ~900KB: **đã** chuyển dynamic import (perf-audit 2026-07-03) — giữ kỷ luật này.
- Còn: `recharts` (thống kê), QR (`html5-qrcode` / `qrcode`), `lucide` rất nhiều import file, `optimizePackageImports` đã bật trong `next.config.ts`.
- Dynamic import dùng khá tốt ở quy trình/đào tạo; **thiếu** ở catalog/quản trị bộ (vẫn eager full list).

**Triệu chứng:** trang thống kê/PDF cảm giác nặng; còn lại cảm giác “phức tạp” chủ yếu từ (1)+(3)+(4).

---

## Hướng giải quyết dứt điểm (pha 0–3)

### Nguyên tắc kiến trúc (north star)

1. **Một việc = một bề mặt chính** (operator vs admin); không nhân đôi bảng CRUD trên màn vận hành.  
2. **Danh sách = server + tìm kiếm + trang**; không `select *` full vào React state trừ khi số dòng nhỏ đã đo.  
3. **Page mặc định Server Component**; client chỉ đảo tương tác (scan, dialog, bảng).  
4. **Shell mỏng theo vai trò** — không hydrate full RBAC matrix nếu chỉ cần vài quyền module.  
5. Cắt theo **vertical slice** (một hot path), không rewrite framework.

### Pha 0 — Chốt nhận thức (1–2 ngày, không đụng schema lớn)

- Khóa câu chuyện cho user: **Vận hành CSSD** = Quy trình (+ Sự cố) · **Tra cứu** = Dụng cụ/Máy/Hóa chất · **Sửa danh mục** = Quản trị → Master CSSD.  
- Ẩn/redirect nhẹ các lối cũ còn gây nhầm (`cssd-erp` đã redirect — giữ; đừng mở lại catalog ERP).  
- Đo baseline 3 màn: `/cssd-dung-cu`, `/quan-tri-he-thong/danh-muc/dung-cu?tab=bo`, `/cssd-quy-trinh?tab=kho` (TTFB + payload JSON size + số row).

### Pha 1 — Data cắt dứt (1–2 tuần) — ưu tiên cao nhất

- `getKhoCatalogPayloadAction` → **không full-load**: mặc định search/limit (đã có `searchKhoCatalog*`); preload chỉ metadata nhẹ hoặc trang đầu.  
- `getBoDungCuRowsAction` → cùng pattern `useServerPaginatedTable` như Loại (`range` + count + cột hẹp, bỏ `select *`).  
- Kho list: cột hẹp thay `select("*")`; giảm `MAX_KHO_ROWS` hoặc lọc theo trạm/ngày.  
- `listMasterRows` / lookup form: limit + search; không đổ cả registry vào modal.  
- Giữ revalidate path CSSD hẹp như hiện tại (`cssd-server-common.ts`) — **không** revalidate “cả app”.

### Pha 2 — FE / IA (song song hoặc sau P1)

- `/cssd-quy-trinh`: tách route thật cho Kho/Truy vết **hoặc** lazy + không mount 4 panel logic cùng lúc (hiện dynamic đã có — siết state shared).  
- Dialog: một lớp chi tiết (drawer/sheet) thay stack Dialog lồng trên list quản trị + catalog.  
- GSC form: tách “nạp template” ra server action có cache tag; giảm số `useEffect` chuỗi.  
- Progressive: page `cssd-dung-cu` / quan-tri dung-cu chuyển dần sang RSC wrapper + client island.

### Pha 3 — Shell & bundle

- Permission snapshot theo module (hoặc cookie/session claim) thay vì hydrate lớn mỗi navigation.  
- Middleware auth (nợ D-09) để bỏ flash client gate.  
- Giữ `optimizePackageImports`; không thêm lib chart/PDF mới; QR chỉ dynamic khi mở camera.

---

## Việc KHÔNG nên làm

- **Rewrite** sang Remix / Nest / Flutter / “ERP mới”.  
- Thêm framework state toàn cục (Redux/React Query “cho chắc”) trước khi cắt payload.  
- Gộp bảng domain VST+GSC+CSSD (đã khóa trong simplification-program).  
- Nhân đôi thêm hub / ModeNav / tab “cho đủ tính năng”.  
- Micro-fix 50 chỗ (đổi class, đổi label) — không đổi cảm giác chậm.  
- Eager import lại `exceljs` / chart trên shell chung.

---

## 5 việc làm tuần này nếu chốt

1. **Đo** payload `getKhoCatalogPayloadAction` + `getBoDungCuRowsAction` trên DB pilot (số row, ms, KB JSON).  
2. **Phân trang Bộ** giống Loại (`getBoDungCuRowsAction` + `BoDungCuPage`).  
3. **Đổi `/cssd-dung-cu`**: bỏ full catalog lúc mount → search-first (tận dụng `searchKhoCatalog*` + QR lookup).  
4. **Hẹp `select` kho** (`fetchCssdKhoDungCuList`) — bỏ `*`, bỏ join thừa trên first paint.  
5. **Copy IA một dòng** trên header Quy trình / Dụng cụ / Quản trị dung-cu: “Sửa danh mục → Quản trị” / “Quét chu trình → Quy trình” — giảm cảm giác chồng trước khi refactor lớn.

---

## Tham chiếu nội bộ

- `docs/modules/cssd/quan-ly-dung-cu-luong.md` — phân vai RO vs CRUD  
- `docs/reference/architecture/simplification-program-20260726.md` — giản hóa cửa vào  
- `docs/reference/reports/perf-audit-20260703.md` — exceljs lazy  
- `docs/archive/baselines/cssd-perf-baseline-20260526.md` — index summary bộ  
- `docs/reference/architecture/debt-register.md` — D-09 auth middleware, D-11 RLS  

---

*Báo cáo agent · read-only · 2026-09-07*
