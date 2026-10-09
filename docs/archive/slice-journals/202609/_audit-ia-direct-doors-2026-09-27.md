# Audit IA — cửa trực tiếp vs hub generic (An toàn / Biến động) — 2026-09-27

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-27 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip audit | `ed98fcf` (ahead origin; cascade CRUD audit vừa commit) |
| Phạm vi | CSSD sự cố IA + **whole-project** scan hub/tab chồng tầng |
| Không | push / PR / merge / Vercel / Cloud / apply migrate / DROP / rewrite taxonomy lớn |
| Mandat | **Audit + A/B/C proposal** — chờ Nghĩa lock trước khi đổi code IA rộng |

Liên quan: `_audit-qlcv-cssd-me-2026-09-27.md` (F1 doors) · `_audit-cascade-crud-2026-09-27.md` · `docs/ux/_audit-ia-ux-2026-09-25.md` (P2-2) · `docs/core/domain-decisions-cssd-instrument.md` (D1–D4).

---

## 1. Câu trả lời ngắn cho Nghĩa

**Vì sao hôm nay còn «An toàn» / «Biến động dụng cụ»?**

1. **Domain D1 (2026-09-04):** tách ngôn ngữ *sự cố an toàn* ≠ *đổi danh mục* ≠ *chuyển kho/bộ* ≠ *Hỏng/Mất* — tránh gọi mọi biến động dụng cụ là «sự cố».
2. **Domain D2 + UI cũ:** cả **3 cửa dụng cụ** từng nằm trên `/cssd-su-co` dưới nhãn «Biến động dụng cụ» (Hỏng/Mất · Đổi DM · Chuyển).
3. **UX P2-2 (2026-09-25):** cố ý thêm **hai tầng** family `An toàn` vs `Biến động dụng cụ` + chip QT·HC·Máy·Khác — *visual weight*, không đổi taxonomy code.
4. **G-P0-06 (tip):** MOVE → `/cssd-dung-cu?tab=LUAN_CHUYEN`; đề nghị DM → `DE_NGHI`; su-co INSTRUMENT **chỉ còn Hỏng/Mất**. Family «Biến động» giờ **bọc đúng một loại** → thừa so với vận hành.

**Vì sao model cửa trực tiếp của Nghĩa đúng hơn cho ops?**

- Nhân viên báo cáo theo **loại việc thật** (Hỏng/Mất, QC/mẻ, hóa chất, máy) — không qua vỏ «an toàn» rồi mới chọn.
- Bớt chồng tầng → ít nhầm sổ, ít bookmark `?group=` sai, filter/báo cáo khớp `incident_group` / typeId ngay từ lần chạm đầu.
- Domain lock tồn kho (LUAN_CHUYEN / DE_NGHI) **đã** tách sang Dụng cụ — giữ nguyên; chỉ làm phẳng **cửa ghi sự cố**.

---

## 2. Map hiện trạng CSSD sự cố / an toàn / biến động

### 2.1 Routes & nav

| Lớp | Evidence | Nội dung hôm nay |
|-----|----------|------------------|
| Sidebar | `sidebar-nav-groups.ts` · `cssd-ops` | «**Sự cố & biến động**» → `/cssd-su-co` |
| Page | `app/cssd-su-co/page.tsx` | Meta: *Hỏng/Mất và sự cố an toàn… Luân chuyển số lượng nằm ở Dụng cụ* |
| Dụng cụ | `app/cssd-dung-cu/page.tsx` | Tabs BO · LOAI · **DE_NGHI** · **LUAN_CHUYEN** · HISTORY; link quiet → `?group=INSTRUMENT` |
| Deep-link SSOT | `lib/cssd-routes.ts` | `cssdSuCoInstrumentHref`: PHYSICAL → su-co; MOVE legacy → `cssdLuanChuyenHref`; SET_RECONCILE → DE_NGHI |
| Modal title | `IncidentReportModal.tsx` | INSTRUMENT → «Biến động dụng cụ»; else «Sự cố an toàn»; batch-recall → «Thu hồi theo mẻ» |

### 2.2 Taxonomy & hubs (code)

| Khái niệm | Source | Giá trị |
|-----------|--------|---------|
| `IncidentGroup` | `cssd-incident-taxonomy.ts` | `PROCESS` · `INSTRUMENT` · `CHEMICAL` · `EQUIPMENT` · `OTHER` |
| `INCIDENT_GROUP_LABEL` | cùng file | PROCESS «Quy trình (an toàn QT)» · INSTRUMENT «**Biến động dụng cụ**» · CHEMICAL/EQUIPMENT gắn «(an toàn …)» |
| `SAFETY_INCIDENT_GROUPS` | cùng file | PROCESS + CHEMICAL + EQUIPMENT + OTHER |
| `SuCoHub` | `hubOfIncidentGroup` | INSTRUMENT → hub INSTRUMENT; còn lại → **SAFETY** |
| INSTRUMENT presets (tip) | `INCIDENT_TYPE_PRESETS.INSTRUMENT` | **Chỉ** `{ INSTRUMENT_PHYSICAL, «Hỏng/Mất» }` — comment G-P0-06 |
| Cause class | `CAUSE_CLASSES` | SC_QUY_TRINH / SC_CHU_QUAN / SC_HE_THONG — trục *nguyên nhân*, **khác** nhóm nghiệp vụ |

### 2.3 UI picker (chồng 2 tầng)

`IncidentGroupPicker` (`SuCoReportFormFields.tsx`):

1. **Tab family:** `An toàn` | `Biến động dụng cụ`
2. Nếu An toàn → **chip nhóm:** Quy trình · Hóa chất · Máy · Khác (cắt nhãn sau ` (` )
3. Nếu Biến động → copy: *Chỉ Hỏng/Mất* + link Dụng cụ · Luân chuyển
4. Tiếp theo: `TypePicker` (dropdown loại an toàn) **hoặc** `InstrumentDoorTabs` (1 nút Hỏng/Mất)

→ Ops phải: sidebar → family → (chip) → type. Nghĩa muốn: sidebar → **type**.

### 2.4 Domain locks (giữ — không mở lại trong A/B)

| Lock | Nơi sống | Không đặt lại lên su-co |
|------|----------|-------------------------|
| **Hỏng/Mất** | `/cssd-su-co` · group INSTRUMENT · type PHYSICAL → submit bridge SET_RECONCILE | — |
| **LUAN_CHUYEN** | `/cssd-dung-cu?tab=LUAN_CHUYEN` | G-P0-06 / `cssdLuanChuyenHref` |
| **Đề nghị danh mục** | `/cssd-dung-cu?tab=DE_NGHI` | D2/D5 · không cửa sự cố |
| **Thu hồi mẻ** | su-co `?group=PROCESS&entry=batch-recall` | Không mở 3 cửa dụng cụ |

Form vẫn còn `entryMode: "luan-chuyen"` + nhánh MOVE trong `SuCoReportForm` (dùng khi embed từ dung-cu) — **không** phải cửa picker su-co mặc định.

### 2.5 INSTRUMENT vs others (business)

| Nhóm | Bản chất | Ghi sổ / cascade |
|------|----------|------------------|
| PROCESS | An toàn chu trình / QC mẻ / BI+ / thu hồi | incident + optional recall RPC |
| CHEMICAL | An toàn HC | incident + panel liên kết xuất kho HC |
| EQUIPMENT | An toàn máy | incident + CTA bảo trì |
| OTHER | Mô tả tự do | incident |
| INSTRUMENT (PHYSICAL) | **Tổn thất vật lý** Hỏng/Mất | ledger set / tồn thực tế — *không* «an toàn QT» |

---

## 3. Vì sao generic doors tồn tại (lịch sử) vs vì sao flatten tốt hơn

| Góc | Generic An toàn / Biến động | Direct types (Nghĩa) |
|-----|----------------------------|----------------------|
| Mục đích gốc | D1 ngôn ngữ + gom 3 cửa dụng cụ dưới một «biến động»; P2-2 tăng trọng số visual | Một chạm = một nghiệp vụ báo cáo |
| Sau G-P0-06 | «Biến động» = 1 type → **shell rỗng** | Hỏng/Mất ngang hàng QT/HC/Máy |
| Tracking | Filter theo hub mơ hồ; journal/report vẫn theo `incident_group` | Type/group khớp UI ngay |
| Accuracy | NV có thể chọn sai family rồi type | Giảm nhầm «biến động» vs «sự cố HC/máy» |
| Code surface | `SuCoHub` + SAFETY array + split label | Bỏ hub UI; giữ `IncidentGroup` DB |

**Kết luận chẩn đoán:** generic doors **đúng lịch sử**, **lệch tip** sau khi MOVE/DE_NGHI rời su-co. Không phải sai Domain D1 — D1 vẫn đúng ở **ngôn ngữ & chỗ ghi sổ**; sai ở **IA picker 2 tầng** còn sót.

---

## 4. A / B / C — su-co IA

### A — Flatten cửa trực tiếp (khuyến nghị)

**UI trên `/cssd-su-co`:** một hàng type-first:

`Hỏng/Mất` · `Quy trình` · `Hóa chất` · `Máy` · `Khác`

- Drop tab family An toàn / Biến động.
- Drop chip nhóm lồng trong An toàn (trùng type).
- `?group=` deep-link **giữ** (PROCESS/INSTRUMENT/…) — map 1:1 sang type mặc định; không cần `hub`.
- Modal title: theo type («Hỏng/Mất», «Sự cố quy trình», …) — bỏ «Biến động dụng cụ» / «Sự cố an toàn» generic.
- Nav sidebar: đổi nhãn → **«Sự cố»** (bỏ «& biến động» *hoặc* ghi chú nhỏ «gồm Hỏng/Mất»).

**LUAN_CHUYEN / inventory sống ở đâu?**

| Việc | Chỗ (giữ) |
|------|-----------|
| Luân chuyển số lượng kho↔bộ / bộ↔bộ | `/cssd-dung-cu?tab=LUAN_CHUYEN` |
| Đề nghị tạo/sửa danh mục | `/cssd-dung-cu?tab=DE_NGHI` |
| Hỏng/Mất | `/cssd-su-co` type Hỏng/Mất |
| Lịch sử kho | `/cssd-dung-cu?tab=HISTORY` |

**Code ước lượng (sau lock):** chủ yếu `IncidentGroupPicker` + copy modal/nav + tests taxonomy/routes — **không** migrate; `incident_group` generated column giữ.

**Cascade:** PHYSICAL / PROCESS / CHEMICAL / EQUIPMENT submit paths **không đổi**; chỉ đổi cách chọn group trên FE.

### B — Giữ shell mỏng + type-first picker

- Giữ 2 family **chỉ** làm section header mờ (không tab bắt chọn).
- Land thẳng lưới 5 type; family chỉ visual grouping.
- Ít đụng Domain language D1; vẫn thừa 1 lớp nhận thức.

### C — Status quo + copy only

- Đổi nhãn «Biến động dụng cụ» → «Hỏng/Mất»; «An toàn» → «Sự cố».
- Không bỏ tầng — **không** giải «thừa / khó track» của Nghĩa.

### Chọn khuyến nghị: **A**

| Tiêu chí | A | B | C |
|----------|---|---|---|
| Tách business (su-co vs dung-cu) | Giữ G-P0-06 | Giữ | Giữ |
| Không overlap UI | Cao | Trung | Thấp |
| Minimal code | Nhỏ–Vừa (picker + copy) | Nhỏ | Rất nhỏ |
| Cascade correctness | Không đổi write path | Idem | Idem |
| Khớp ops accuracy Nghĩa | **Đúng** | Partial | Không |

---

## 5. Whole-project scan — hub/tab chồng · thừa · mơ hồ

| # | Module | Layer / tab | Problem | Sev | Thin fix (sau lock) |
|---|--------|-------------|---------|-----|---------------------|
| 1 | **CSSD su-co** | Family An toàn \| Biến động + chip nhóm + type | **Chồng 2–3 tầng**; Biến động chỉ còn 1 type | **P0** | **A** flatten 5 cửa trực tiếp |
| 2 | **CSSD nav** | «Sự cố **& biến động**» | Nhãn còn nói biến động trong khi MOVE đã sang dung-cu | P1 | Rename «Sự cố»; quiet link Luân chuyển từ dung-cu |
| 3 | **CSSD dung-cu** | BO · LOAI · DE_NGHI · LUAN_CHUYEN · HISTORY cùng strip | **Trộn tra cứu** (BO/LOAI) **+ việc ghi** (đề nghị/chuyển) + nhật ký | P2 | Nhóm primary: việc (Đề nghị · Luân chuyển); secondary/quiet: Bộ · Loại · Lịch sử *hoặc* giữ + copy «2 cụm» |
| 4 | **CSSD quy trình** | Chu trình · Mẻ · Truy vết | OK 3 cửa việc khác nhau; legacy `?tab=kho` redirect | OK/P3 | Giữ; không thêm hub |
| 5 | **CSSD thiết bị** | Danh sách · Bảo dưỡng; VAN_HANH = «Xem thêm» | VAN_HANH **không** ngang tab — hơi ẩn nhưng tránh chồng | P3 | Giữ pattern; hoặc 3 tab ngang nếu UAT đòi |
| 6 | **CSSD hóa chất** | Page kho + panel sự cố CHEMICAL + move sheet | Sự cố HC **ở su-co** nhưng follow-up xuất ở kho — 2 cửa đúng Domain; copy dễ lẫn | P2 | CTA «Báo sự cố HC» deep-link `?group=CHEMICAL`; panel chỉ follow-up tồn |
| 7 | **CSSD report** | OVERVIEW · INCIDENT rồi **lồng** VOLUME/SETS/… | Tab analytics **nested** dưới «Vận hành»/`isAnalyticsTab` | P2 | Một strip phẳng 6 tab *hoặc* OVERVIEW landing + links |
| 8 | **QLCV** | Điều hành · Nhiệm vụ · Định kỳ · Báo cáo | 4 cửa Domain 19 — **OK**; dư âm «Kế hoạch năm» chỉ redirect | OK | Không flatten thêm; proposal type-vs-priority riêng |
| 9 | **Giám sát hub** | CTA VST·GSC + «Khác» NKBV + quiet lịch sử/thống kê | Hub **đúng mẫu** write-first; không chồng type | OK | Giữ |
| 10 | **NKBV** | records · cases · dashboard · vi-sinh · mau-so | Nhiều tab ngang hàng — một phần **phân tích** lẫn **nhập** | P2 | Default records; gom thống kê/vi-sinh dưới «Phân tích» |
| 11 | **MDM / Quản trị** | Việc hàng ngày · Phân quyền · IT | Hub 3 khu **OK**; trong DANH_MUC còn modal-CRUD farm | P2 | P2-5 UX: route/inline form nặng |
| 12 | **MDM dụng cụ** | Bộ · Rà soát (+ sheet Loại) vs **ops** dung-cu DE_NGHI | **Hai mặt** admin duyệt vs NV đề nghị — đúng D5 nhưng dễ nhầm cửa | P2 | Copy/banner «NV → /cssd-dung-cu Đề nghị; Admin duyệt đây» (đã có một phần) |
| 13 | **Thống kê** | ModeNav + module VST/GSC tabs | Lớp Mode + module — dialect đã ghi; CSSD stats riêng `/thong-ke/cssd`? | P3 | Không thêm hub su-co |
| 14 | **BCTH** | Nhiều section một trang | UX audit P2-4: chưa collapse «more» | P2 | Default collapsed sections (không đổi IA cửa) |
| 15 | **SuCoReportForm** | `entryMode=luan-chuyen` còn trong form su-co module | **Cửa nhúng** từ dung-cu — dễ hiểu nhầm còn MOVE trên su-co | P1 | Doc/comment; optional tách component Move sang cssd-erp only (sau A) |
| 16 | **Incident modal titles** | «Biến động dụng cụ» / «Sự cố an toàn» | Generic — trùng vấn đề #1 | P1 | Đi kèm A |
| 17 | **Cause class vs group** | LOAI_SU_CO cause vs IncidentGroup | Hai trục **đúng** nhưng UI chưa teach ngắn | P3 | Hint 1 dòng dưới type (không thêm tab) |

**Top 10 overlap (ưu tiên nói với Nghĩa):** #1 #2 #3 #6 #7 #10 #12 #15 #16 #14.

---

## 6. Recommended wave order (sau Nghĩa lock)

| Wave | Việc | Migrate? |
|------|------|----------|
| **W0** | Nghĩa lock A/B/C (+ nav rename?) | Không |
| **W1** | Su-co picker flatten (A) + modal titles + sidebar «Sự cố» + tests taxonomy/routes/spec | Không |
| **W2** | Copy dung-cu / hóa chất CTA deep-link; comment `entryMode` luan-chuyen | Không |
| **W3** | Report tab flatten *hoặc* NKBV «Phân tích» group — PO pick 1 | Không |
| **W4** | Dung-cu tab regroup (tra cứu vs việc) — chỉ nếu UAT còn đau | Không |
| — | Schema / `incident_group` / ledger | **Không** trừ khi phát sinh bug riêng |

---

## 7. Cần Nghĩa lock trước khi code

1. **Chọn A / B / C** cho su-co IA (khuyến nghị **A**).
2. **Nav label:** «Sự cố» vs giữ «Sự cố & biến động».
3. **Thứ tự 5 cửa** trên strip (đề xuất: Hỏng/Mất · Quy trình · Hóa chất · Máy · Khác — PHYSICAL trước vì tần suất kho).
4. **Có** gom «Khác» vào cuối ẩn dưới «Thêm» hay luôn hiện.
5. **W3/W4** có làm cùng sprint hay chỉ W1–W2.

---

## 8. Evidence index (đọc nhanh)

- `src/modules/cssd-su-co/domain/cssd-incident-taxonomy.ts` — groups, SAFETY hub, INSTRUMENT = Hỏng/Mất only
- `src/modules/cssd-su-co/components/SuCoReportFormFields.tsx` — `IncidentGroupPicker` An toàn / Biến động
- `src/lib/cssd-routes.ts` — G-P0-06 redirects
- `src/lib/domain/cssd-instrument-incident.ts` — 3 cửa message → dung-cu + su-co
- `src/lib/nav/sidebar-nav-groups.ts` — «Sự cố & biến động»
- `docs/core/domain-decisions-cssd-instrument.md` — D1–D4
- `docs/ux/_audit-ia-ux-2026-09-25.md` — P2-2 shipped two-tier

---

## 9. Non-goals slice này

- Không rewrite taxonomy presets / cause class.
- Không gộp Hỏng/Mất vào PROCESS.
- Không đưa LUAN_CHUYEN trở lại picker su-co.
- Không push / Cloud / migrate.

---

## 10. LOCKED A + applied — 2026-09-27 (Asia/Saigon)

| Trường | Giá trị |
|--------|---------|
| Lock | **A** — flatten 5 cửa trực tiếp; drop An toàn / Biến động shells |
| Nav | Rename sidebar «Sự cố & biến động» → **«Sự cố»** (one-line, Domain-safe; MOVE đã ở dung-cu) |
| Doors | Hỏng/Mất · Sự cố quy trình · Sự cố hóa chất · Sự cố máy · Sự cố khác |
| Giữ | LUAN_CHUYEN + DE_NGHI trên `/cssd-dung-cu` (G-P0-06); không đưa MOVE lại su-co |
| FE | `IncidentGroupPicker` type/group chips; modal titles theo door; strip copy An toàn/Biến động; bookmark MOVE vẫn redirect dung-cu |
| Không | push / PR / merge / migrate / Cloud |

