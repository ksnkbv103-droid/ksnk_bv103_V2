# Audit full — technical debt + module overlap + IA slim — 2026-09-27

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-27 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip audit | `a068e6e` (IA A flatten 5 su-co doors vừa apply; ahead origin ~37) |
| Phạm vi | Toàn product doors + debt + overlap + perf + phased plan A/B |
| Không | push / PR / merge / Vercel / Cloud / apply migrate / DROP / rewrite lớn |
| Mandat | **Deep AUDIT + plan A/B** — chờ Nghĩa lock trước rewrite; Soft chỉ commit doc |

Liên quan (cùng ngày / tip):

- `_audit-ia-direct-doors-2026-09-27.md` — A **LOCKED + applied** (`a068e6e`)
- `_audit-cascade-crud-2026-09-27.md` — C1–C3 fixed; C6–C8 park
- `_audit-qlcv-cssd-me-2026-09-27.md` — F1–F3 doors/BOM done; F4/F5 park migrate
- `_audit-code-vs-mdm-2026-09-26.md` — Strategy B CODE vs MDM
- `docs/core/domain-decisions-cssd-instrument.md` — D1–D10
- `docs/modules/qlcv/_proposal-qlcv-type-vs-priority-2026-09-26.md` — uncommitted proposal

---

## 0. Executive — vì sao «quá nhiều cửa / chậm / chồng»

| Triệu chứng Nghĩa | Nguyên nhân gốc trên tip `a068e6e` | Đã cắt? |
|-------------------|-------------------------------------|---------|
| Nhiều cửa / không trực tiếp | Lịch sử hub 2 tầng (An toàn/Biến động) + tab strip trộn tra cứu+ghi + analytics lồng | Su-co **đã** flatten A; dung-cu / report / NKBV **còn** |
| Module overlap | CSSD ops ↔ MDM admin; su-co form embed LUAN_CHUYEN; BCTH phụ lục CSSD ↔ `/cssd-erp/report`; lịch sử/thống kê GS tách route nhưng ModeNav dialect | Một phần Domain-đúng (D5) nhưng **IA chưa teach** |
| Chậm load | `.next/dev` ~207M; 2 `next-server`; một số page CSSD **eager** (dung-cu/thiet-bi/hoa-chat); NKBV page 1173 dòng; `v_qlcv_*` vẫn JOIN dm (DUAL DB) | Perf P1 QLCV+OfflineSync **done**; residual P2 |
| Không neo core ops | Menu sidebar đã mỏng; **trong module** còn tab/analytics/legacy export | Cần north-star strip + cut redundancy tuần tự |

**Khuyến nghị chiến lược:** không mega-PR. Waves mỏng tuần tự; mỗi wave 1–2 cửa hoặc 1 hygiene PR; Nghĩa lock IA trước khi Soft đụng strip.

---

## 1. Core idea map — SHOULD (Nghĩa) vs IS (tip)

### 1.1 North-star nghiệp vụ (locked — không reopen)

| Domain | Ý Nghĩa (cửa đúng) | Cascade |
|--------|--------------------|---------|
| **CSSD chu trình** | 6 trạm TN→LS→QC(**Kiểm bộ**)→Đóng gói(**scan-only**)→TK(**via phiếu mẻ**)→Cấp phát | Scan advance / mẻ RPC → status + waiting + report |
| **CSSD sự cố** | **5 cửa trực tiếp:** Hỏng/Mất · QT · HC · Máy · Khác | incident + ledger (PHYSICAL) / recall (batch) |
| **CSSD dụng cụ** | LUAN_CHUYEN + DE_NGHI (+ tra cứu BO/LOAI + HISTORY) — **không** embed form module khác | ledger RPC → tồn / HISTORY |
| **QLCV** | assignee / progress / deadline / priority; close cần result; **không** MDM loai/TT admin | transition RPC → board + gate + nhật ký |
| **CODE vs MDM** | Strategy B; LOAI_NKBV lock+allowlist **giữ FK** | — |
| **Local-first** | OfflineSync CSSD-path + supervision-path; không sync admin | — |

### 1.2 Sidebar IS (tip) — đã gần north-star

Evidence: `src/lib/nav/sidebar-nav-groups.ts` + `sidebar-admin-nav-groups.ts`.

| Group | Items (href) | Khớp core? |
|-------|--------------|------------|
| Điều hành KSNK | Báo cáo chính thức → `/bao-cao-tong-hop` | OK (hub đọc) |
| Giám sát | Giám sát → `/giam-sat` (hub write-first) | OK |
| Vận hành nội bộ | Công việc `/quan-ly-cong-viec` · Thi KSNK `/dao-tao` | OK |
| CSSD · Vận hành | Quy trình `/cssd-quy-trinh` · **Sự cố** `/cssd-su-co` | OK (rename A done) |
| CSSD · Tra cứu | Dụng cụ · Thiết bị · Hóa chất | OK label; dung-cu còn **write tabs** trong «Tra cứu» |
| Sửa danh mục | Quản trị hệ thống `/quan-tri-he-thong` | OK (1 cổng) |

**Kết luận:** sidebar **không** phải nguồn bloating chính. Bloating = **trong-module tabs / dual routes / dead writers / unapplied migrates / analytics nested**.

### 1.3 Product doors inventory — SHOULD vs IS

| Door | SHOULD | IS tip `a068e6e` | Gap |
|------|--------|------------------|-----|
| `/cssd-quy-trinh` | Chu trình · Mẻ · Truy vết | 3 tab + dynamic panels; `?tab=kho` → redirect dung-cu | OK |
| `/cssd-su-co` | 5 chip cửa trực tiếp | `IncidentGroupPicker` `data-testid=incident-direct-doors` · 5 `DIRECT_INCIDENT_DOORS` | **OK (A applied)** |
| `/cssd-dung-cu` | Việc ghi rõ + tra cứu phụ | Strip ngang: **BO · LOAI · DE_NGHI · LUAN_CHUYEN · HISTORY** | P2 trộn lookup+write |
| `/cssd-thiet-bi` | Danh sách · Bảo dưỡng | 2 tab + «Xem thêm» VAN_HANH | OK/P3 |
| `/cssd-hoa-chat` | Kho HC + CTA sự cố HC | Page kho; sự cố CHEMICAL ở su-co | P2 copy/CTA |
| `/cssd-erp/batch` | Không cần cửa riêng | **redirect** → `quy-trinh?tab=batch` | OK thin legacy |
| `/cssd-erp/report` | Báo cáo CSSD phẳng | OVERVIEW · INCIDENT + **nested** analytics 5 tab | P2 |
| `/thong-ke/cssd` | Mirror report | Mirror → report | OK |
| `/quan-ly-cong-viec` | Điều hành · Nhiệm vụ · Định kỳ · Báo cáo | 4 tab + **dynamic** panels (Perf P1) | OK Domain 19 |
| `/giam-sat` | Hub VST·GSC·NKBV write | Hub CTAs + quiet lịch sử/thống kê | OK |
| `/giam-sat-vst` `/giam-sat-chung` | Form only; history/analytics redirect | Redirect `?tab=history|analytics` | OK |
| `/giam-sat-nkbv` | Write-first; analytics gom | 5 tab ngang: records · cases · vi-sinh · mau-so · dashboard | P2 mix |
| `/bao-cao-tong-hop` | Báo cáo chính thức | KPI+VST+GSC default; more collapsed (CSSD appendix) | OK/P2 polish |
| `/quan-tri-he-thong` | MDM admin · duyệt DE_NGHI · RBAC | Hub jobs 4 + tabs DANH_MUC/PHAN_QUYEN/IT | OK; dễ nhầm vs dung-cu DE_NGHI |
| `/dao-tao` | Thi KSNK | Hub + admin dynamic | OK peripheral |
| `/` | Redirect BCTH | redirect | OK |

### 1.4 CSSD stations SSOT (tip)

`cssd-stations.ts`: TN · LS · QC=**Kiểm bộ** · Đóng gói · TK · Cấp phát; `SCAN_STATIONS` excludes TIET_KHUAN; `nextIsMeHandoff` → phiếu mẻ. **Khớp lock.**

---

## 2. Overlap matrix — module × module (business leak)

Ký hiệu: **OK** Domain-tách đúng · **LEAK** cửa/IA lẫn · **DUAL** hai đường viết/đọc · **TEACH** đúng Domain nhưng UI chưa nói rõ.

|  | CSSD su-co | CSSD dung-cu | CSSD quy-trinh/mẻ | CSSD report | QLCV | GSC/VST | NKBV | MDM/QT | BCTH |
|--|------------|--------------|-------------------|-------------|------|---------|------|--------|------|
| **CSSD su-co** | — | **TEACH** LUAN_CHUYEN link; **DUAL-UI** `entryMode=luan-chuyen` reuse form | batch-recall entry PROCESS | INCIDENT tab đọc cùng taxonomy | — | — | — | LOAI_SU_CO lookup | phụ lục CSSD |
| **CSSD dung-cu** | Hỏng/Mất out; DE_NGHI create | — | đóng gói **không** đề nghị BOM (F2 done) | HISTORY vs report volume | — | — | — | **TEACH** admin duyệt DE_NGHI / hard CRUD | — |
| **Quy-trình/mẻ** | recall RPC | composition gate | — | station counts | — | — | QR/trace? | TRAM_CSSD locked HYBRID | — |
| **CSSD report** | filter group | — | overview tồn | — | — | — | — | — | **LEAK nhẹ** phụ lục vs full report |
| **QLCV** | — | — | — | — | — | — | — | **DUAL DB** qlcv_dm JOIN; FE CODE; **no** MDM admin loai/TT | — |
| **GSC/VST** | — | — | — | — | — | hub OK; `/lich-su` `/thong-ke` tách | — | bang-kiem MDM | sections VST/GSC |
| **NKBV** | — | — | — | — | — | hub «Khác» | — | LOAI_NKBV **B lock+FK** | section NKBV |
| **MDM/QT** | — | approve queue | — | — | Wave3 park DROP dm | bang-kiem | LOAI lock | — | — |
| **BCTH** | — | — | — | appendix | — | primary sections | more | — | — |

### 2.1 Top leaks (ưu tiên)

| # | Leak | Sev | Fix hướng |
|---|------|-----|-----------|
| L1 | Dung-cu strip trộn tra cứu (BO/LOAI) + việc (DE_NGHI/LUAN_CHUYEN) + HISTORY | P2 | Regroup primary/secondary (wave) |
| L2 | Su-co form vẫn là write path LUAN_CHUYEN (embed dung-cu) — đúng thin, dễ hiểu nhầm «còn MOVE trên su-co» | P1 copy / P2 optional tách component | Doc + banner; optional extract MoveForm |
| L3 | MDM duyệt DE_NGHI vs ops tạo DE_NGHI — 2 mặt D5 | P2 | Banner 1 dòng hai phía (đã partial) |
| L4 | Report nested analytics dưới «Vận hành» | P2 | Flatten 1 strip hoặc OVERVIEW+links |
| L5 | NKBV 5 tab write+analytics ngang hàng | P2 | Default records; gom Thống kê/vi-sinh phụ |
| L6 | BCTH phụ lục CSSD vs `/cssd-erp/report` full | P3 | Quiet link «Báo cáo CSSD đầy đủ» |
| L7 | QLCV DB JOIN dm vs FE hardcode | P1 park | Nghĩa apply Wave3 draft |
| L8 | `KhoDungCuPage` / `CSSDCatalogChiTietTab` / `CSSDCatalogHoaChatTab` còn export | P2 hygiene | Xóa hoặc unexport sau grep sạch |
| L9 | Dead writers `reportInventoryIssue` / `recordInstrumentTransaction` | P2 | Xóa (C7) |
| L10 | NKBV module size 2.2M / 1173-line page — gravity well | P2–P3 | Split views đã partial dynamic; tiếp tục |

---

## 3. Redundant doors / tabs / dual entry

Build on `_audit-ia-direct-doors` §5 — **verify tip `a068e6e`:**

| # | Item | Tip status | Sev | Thin fix |
|---|------|------------|-----|----------|
| 1 | Su-co family An toàn/Biến động | **GONE** (A applied) | — | done |
| 2 | Nav «Sự cố & biến động» | **→ «Sự cố»** | — | done |
| 3 | Dung-cu 5-tab mixed | **Còn** | P2 | regroup |
| 4 | Quy-trình 3 cửa | OK | — | giữ |
| 5 | Thiết bị VAN_HANH ẩn | OK/P3 | — | giữ |
| 6 | Hóa chất vs su-co CHEMICAL | TEACH | P2 | CTA deep-link `?group=CHEMICAL` |
| 7 | Report nested analytics | **Còn** | P2 | flatten A/B |
| 8 | QLCV 4 cửa | OK | — | giữ; type-vs-priority proposal riêng |
| 9 | Giám sát hub | OK | — | giữ |
| 10 | NKBV 5 tab mix | **Còn** | P2 | group Phân tích |
| 11 | QT hub 3 khu | OK | — | giữ |
| 12 | MDM dung-cu vs ops DE_NGHI | TEACH | P2 | banner |
| 13 | `/cssd-erp/batch` dual URL | redirect OK | P3 | giữ alias hoặc eventual drop bookmark |
| 14 | `InstrumentDoorTabs` khi INSTRUMENT chỉ 1 preset | **Dead branch** (`length > 1` never) | P2 | xóa branch / component nếu không plan multi |
| 15 | `entryMode=luan-chuyen` trong module su-co | intentional reuse | P1 | comment + optional extract |
| 16 | SAFETY_INCIDENT_GROUPS / hubOfIncidentGroup | `@deprecated` còn code | P3 | giữ tới hết bookmark report; rồi xóa |
| 17 | CHI_TIET / HOA_CHAT catalog tab types | legacy type + unused views | P2 | prune |
| 18 | BCTH many sections | more collapsed **đã có** | P3 | polish default |
| 19 | `/lich-su` `/thong-ke` root redirect VST | OK dialect | — | giữ |
| 20 | QlcvDmAdminLinks (proposal) | proposal uncommitted | P1 Domain | Nghĩa lock proposal A |

**Dual write paths (cùng nghiệp vụ):**

| Nghiệp vụ | Path A (SSOT) | Path B (redundant/legacy) |
|-----------|---------------|---------------------------|
| Inventory instrument lines | `createIncidentReport` → ledger RPC | `reportInventoryIssue` / `recordInstrumentTransaction` (**0 callers**) |
| Luân chuyển | dung-cu tab + `entryMode=luan-chuyen` → cùng submit | (không dual RPC — OK) |
| Đề nghị DM | ops create → QT approve | hard CRUD QT (ADMIN) — **đúng D5**, không dual approve |
| Mẻ TK | `/cssd-quy-trinh?tab=batch` | `/cssd-erp/batch` redirect |
| Báo cáo CSSD | `/cssd-erp/report` | `/thong-ke/cssd` mirror + BCTH appendix |

---

## 4. Tech debt inventory

### 4.1 Dead / unused code

| Item | Evidence | Action |
|------|----------|--------|
| `reportInventoryIssue` | `cssd-write.actions.ts:30` · 0 callers | **Delete** (C7) — Soft alone sau lock hygiene |
| `recordInstrumentTransaction` | `:258` · 0 callers | **Delete** |
| `CSSDCatalogChiTietTab` | export entrypoint; page redirects CHI_TIET→BO; no page import | Unexport / delete view |
| `CSSDCatalogHoaChatTab` | view exists; không trên strip dung-cu (HC có route riêng) | Unexport / delete hoặc embed hoa-chat only |
| `InstrumentDoorTabs` live path | only if `options.length > 1`; INSTRUMENT presets = 1 | Remove call site / component |
| `KhoDungCuPage` as embedded | export `CSSDInstrumentInventoryEmbeddedPage`; `?tab=kho` already redirects | Confirm 0 runtime mount → delete |
| SAFETY hub helpers | deprecated after A | Keep short; delete when report filters stop using |

### 4.2 Dual writers / DUAL DB

| Item | State | Gate |
|------|-------|------|
| QLCV FE labels CODE | done (`qlcv-labels.ts`) | — |
| `v_qlcv_cong_viec_full` JOIN `qlcv_dm_*` | **live** (last rewrite pre-draft) | **Nghĩa apply** `20260926053300_…` |
| TRAM_CSSD HYBRID | CODE `STATION_LABEL` + UUID persist; hub locked | keep; optional later CODE-only persist |
| LOAI_NKBV | Strategy B lock+allowlist; FK keep | **không DROP** |

### 4.3 Unapplied migrations (local only — **không apply trong slice**)

| File | Purpose | Owner |
|------|---------|-------|
| `20260925090000` … `20260925150000` | ME-S* batch integrity / QC release / recall / filter / ledger atomic | **Nghĩa** apply + UAT |
| `20260926053300_qlcv_wave3_drop_dm_loai_trang_thai.sql` | CASE view · DROP façade dm · soft-deactivate lookup | **Nghĩa** sau UAT FE |

### 4.4 JOIN still on dm (hot path)

- Live SQL view QLCV vẫn `LEFT JOIN qlcv_dm_loai_cong_viec` / `qlcv_dm_trang_thai_cong_viec` (evidence migrations through `20260802140000` + weekly plan views).
- FE `.from('qlcv_dm_*')` = **0** hot path.
- Draft Wave3 replaces with CASE — parked.

### 4.5 Heavy / large surfaces

| Surface | Size / note |
|---------|-------------|
| `giam-sat-nkbv/` | **2.2M** · 141 files under `lib/` |
| `GiamSatNkbvPage.tsx` | **1173** lines (secondary tabs already `dynamic`) |
| `quan-tri-he-thong/` | 1.2M |
| `cssd-erp/` | 1.2M |
| `QuanLyCongViecPage.tsx` | 643 lines · panels dynamic |
| `.next/dev` | **~207M** (Turbopack cache) |
| `node_modules` | ~829M |
| Processes | `next-server` ksnk từ ~5:01 ICT; thêm next-server project khác — RAM cạnh tranh |

### 4.6 TODOs / @deprecated (mẫu)

- Taxonomy: `@deprecated` SAFETY / SuCoHub (sau A).
- NKBV: nhiều `@deprecated` aliases clinical/timeline — **không** xóa ồ ạt (clinical compat); hygiene theo PR nhỏ khi touch file.
- Dao-tao softDelete deprecated — peripheral.

### 4.7 Dirty WT (không đụng)

`AGENTS.md` modified · `_run_move_*.sh` · CSV · qlcv proposal untracked — **để yên** trừ khi Nghĩa bảo.

---

## 5. Perf hotspots (evidence)

### 5.1 Done (P1) — không reopen

| Item | Evidence |
|------|----------|
| QLCV lazy panels | `QuanLyCongViecPage` `dynamic()` Operations/Nhiệm vụ/Định kỳ/Báo cáo/forms |
| Kanban parallel | `useQlcvKanban` `Promise.all([getCongViecListForBoard(), pendingPromise])` |
| OfflineSync scope | `offline-sync-scope.ts` — CSSD prefixes + supervision paths only; layout conditional mount |
| Quy-trình tab panels | dynamic lifecycle / batch / QR history |
| Dao-tao / BCTH / NKBV route | dynamic page wrappers |
| BCTH sections | dynamic chart sections + `moreSectionsOpen` |

### 5.2 Residual hotspots

| Hotspot | Evidence | Sev | Wave |
|---------|----------|-----|------|
| `/cssd-dung-cu` eager imports all tabs + SetComposition + History | `page.tsx` static imports | P2 | W2/W5 |
| `/cssd-thiet-bi` eager Fleet+Maintenance+VanHanh | `page.tsx` | P2 | W5 |
| `/cssd-hoa-chat` sync import chemical page | `page.tsx` | P3 | W5 |
| VST/GSC form pages | server page + form view (OK for write) | — | — |
| NKBV records fetch on tab + cases table hook | large page; dashboard only when tab | P2 | W3 |
| QLCV list still via view with dm JOIN | DB round-trip extra joins | P1 park | Nghĩa migrate |
| ME RPC UAT blocked | migrate unapplied | P1 park | Nghĩa |
| Dev cache `.next/dev` 207M + long-lived next-server | observable | P3 ops | Soft: `rm -rf .next` khi Nghĩa OK local |
| RPC waterfall risk | CSSD waiting / board counts đã batch RPCs (migrations 0907/0910); watch new sequential awaits in catalog reload | P3 | observe |

### 5.3 Offline sync scope (tip)

```
CSSD: /cssd-quy-trinh|/dung-cu|/su-co|/thiet-bi|/hoa-chat|/cssd-erp*
Supervision: /giam-sat*|/giam-sat-vst|/giam-sat-chung|/giam-sat-nkbv|/qr*
```
**Không** gắn QLCV/QT/login — đúng Perf P1.

---

## 6. Phased plan — Waves W0–Wn (A/B, recommended)

### Principles

1. **Không** «rewrite everything» mega-PR.
2. Mỗi wave: 1 chủ đề · DoD kiểm được · rollback = revert commit.
3. Soft làm hygiene/perf **không** đổi IA strip trừ khi Nghĩa lock.
4. Migrate apply / DROP = **chỉ Nghĩa**.

### W0 — Lock & freeze (Nghĩa) · **no code**

| | |
|--|--|
| **A (rec)** | Lock north-star IA sketch §7 + chọn W1–W3 scope trong sprint |
| **B** | Chỉ lock su-co (đã xong) — trì hoãn dung-cu/NKBV |
| **DoD** | Nghĩa trả lời widget options §8 |
| **Risk** | Thấp |
| **Ai** | Nghĩa |

### W1 — Hygiene thin (Soft alone sau W0 ACK «hygiene OK»)

| | |
|--|--|
| **A (rec)** | (1) Xóa dead writers C7 · (2) bỏ call `InstrumentDoorTabs` dead · (3) unexport/prune CHI_TIET + HoaChat catalog tab nếu grep sạch · (4) comment `entryMode` dual-shell · (5) CTA hóa chất → `?group=CHEMICAL` copy |
| **B** | Chỉ docs + comment, không xóa code |
| **DoD** | tsc + vitest taxonomy/routes/catalog xanh; 0 caller dead writers |
| **Risk** | Thấp (delete unused) |
| **Ai** | Soft |
| **Migrate?** | Không |
| **Safe thin P0** | **Có** — đây là P0 an toàn nhất không cần IA lock lớn |

### W2 — Dung-cu strip regroup · **cần Nghĩa lock**

| | |
|--|--|
| **A (rec)** | Primary strip: **Đề nghị · Luân chuyển**; secondary/quiet: Bộ · Loại · Lịch sử (2 cụm copy) |
| **B** | Giữ 5 tab ngang + divider label «Việc» / «Tra cứu» |
| **DoD** | UAT tạo đề nghị + luân chuyển + xem BO không lệch deep-link `?tab=` |
| **Risk** | Bookmark tab; mobile density |
| **Ai** | Soft sau lock |
| **Migrate?** | Không |

### W3 — CSSD report flatten **hoặc** NKBV Phân tích · **PO pick 1**

| | Report | NKBV |
|--|--------|------|
| **A** | Một strip phẳng 6–7 tab | Default records; group «Phân tích» = dashboard (+ optional vi-sinh) |
| **B** | OVERVIEW landing + link cards (không nested strip) | Giữ 5 tab; chỉ reorder + nhãn |
| **Rec** | Nghĩa chọn **một** trong sprint (tránh 2 IA cùng lúc) | |
| **DoD** | Deep-link `?tab=` cũ vẫn resolve | |
| **Migrate?** | Không | |

### W4 — Migrates (Nghĩa only)

| Order | Migrate | DoD |
|-------|---------|-----|
| 4a | ME-S* (+ ledger atomic) | UAT mẻ complete/recall/remove |
| 4b | QLCV Wave3 draft | list/Kanban/create màu khớp; grep JOIN sạch |

**A:** apply staging → UAT → prod. **B:** park thêm sprint. **Rec A** khi Nghĩa sẵn sàng Cloud — Soft **không** apply.

### W5 — Perf P2 eager CSSD pages (Soft)

| | |
|--|--|
| **A (rec)** | `dynamic()` tab panels dung-cu / thiet-bi giống quy-trình |
| **B** | Chỉ dung-cu (nặng nhất) |
| **DoD** | First paint strip nhanh; tab content skeleton |
| **Risk** | Thấp |
| **Migrate?** | Không |

### W6 — QLCV type-vs-priority (proposal) · **cần Nghĩa lock**

| | |
|--|--|
| **A** | Proposal A: gỡ QlcvDmAdminLinks · priority nổi · không chọn Khẩn như loại |
| **B** | Proposal B nhẹ |
| **Rec** | Sau W4b (Wave3) hoặc song song FE-only nếu không đụng migrate |
| **Migrate?** | Không (FE) |

### W7 — Optional deeper (chỉ nếu UAT còn đau)

- Extract `LuanChuyenForm` khỏi `SuCoReportForm` (hết embed cross-module shell).
- NKBV split `GiamSatNkbvPage` thành route-level tabs.
- Delete `/cssd-erp/batch` alias sau ≥1 sprint.
- TRAM persist code-only (lớn — **park**).

### Wave dependency sketch

```
W0 lock ─┬─► W1 hygiene (Soft) ─► W5 perf CSSD
         ├─► W2 dung-cu (lock) 
         ├─► W3 report XOR NKBV (lock)
         ├─► W4 migrates (Nghĩa)
         └─► W6 QLCV priority (lock)
```

---

## 7. North-star IA sketch — thin menu (core only)

### Sidebar (giữ gần tip)

- **Báo cáo chính thức**
- **Giám sát** (hub)
- **Công việc**
- **Thi KSNK** *(peripheral — giữ nếu viện dùng)*
- **CSSD · Quy trình**
- **CSSD · Sự cố**
- **CSSD · Dụng cụ**
- **CSSD · Thiết bị**
- **CSSD · Hóa chất**
- **Sửa danh mục** → Quản trị

### Trong module (ideal)

| Module | Strip lý tưởng |
|--------|----------------|
| Quy trình | Chu trình · Mẻ · (quiet) Truy vết |
| Sự cố | 5 cửa: Hỏng/Mất · QT · HC · Máy · Khác |
| Dụng cụ | **Việc:** Đề nghị · Luân chuyển · **Tra cứu:** Bộ · Loại · Lịch sử |
| Thiết bị | Danh sách · Bảo dưỡng · (more) Lịch sử mẻ |
| Hóa chất | Kho (+ CTA Báo sự cố HC) |
| QLCV | Điều hành · Nhiệm vụ · Định kỳ · Báo cáo |
| Giám sát hub | VST · GSC · NKBV · quiet Lịch sử/Thống kê |
| NKBV | Hàng đợi BA · Phiếu · (Phân tích: Thống kê · Vi sinh) · Mẫu số |
| Báo cáo CSSD | Phẳng: Vận hành · Sự cố · Sản lượng · Bộ · Máy · NV · Trách nhiệm |
| BCTH | KPI · VST · GSC · (More…) |
| Quản trị | Việc ngày · Phân quyền · IT |

**Không** đưa lại: hub An toàn/Biến động · MOVE trên su-co · BOM đề nghị trên Đóng gói · MDM loai/TT QLCV · scan tay TIET_KHUAN · Command Center «Việc hôm nay» trên `/`.

---

## 8. Widget-ready — hỏi Nghĩa lock tiếp

Trả lời ngắn (A/B) cho Soft:

1. **W1 hygiene** (xóa dead writers + prune catalog dead tabs + InstrumentDoorTabs): **Cho Soft làm ngay?** `A=yes` / `B=đợi`
2. **W2 dung-cu strip:** `A=primary Việc + secondary Tra cứu` / `B=giữ 5 tab + divider` / `C=park`
3. **W3 chọn 1:** `A=flatten CSSD report` / `B=NKBV group Phân tích` / `C=park cả hai`
4. **W4 migrate ưu tiên:** `A=ME-S* trước` / `B=QLCV Wave3 trước` / `C=park`
5. **W6 QLCV priority proposal:** `A=approve proposal A` / `B=proposal B` / `C=park`
6. **Dev `.next` purge** khi máy nặng: `A=cho Soft rm .next local` / `B=Nghĩa tự làm`

---

## 9. Top 15 findings (priority)

| # | Finding | Sev | Owner next |
|---|---------|-----|------------|
| 1 | Su-co 5 direct doors **done** (`a068e6e`) — không reopen | — | — |
| 2 | Dung-cu 5-tab trộn lookup+write | P2 | Nghĩa lock W2 |
| 3 | Report nested analytics | P2 | Nghĩa lock W3 |
| 4 | NKBV 5-tab write+analytics; module 2.2M | P2 | Nghĩa lock W3 |
| 5 | Dead inventory writers (C7) 0 callers | P2 | Soft W1 |
| 6 | Dead/unused catalog ChiTiet + HoaChat tab views | P2 | Soft W1 |
| 7 | `InstrumentDoorTabs` dead branch (1 preset) | P2 | Soft W1 |
| 8 | `entryMode=luan-chuyen` embed su-co shell | P1 teach | Soft W1 comment / W7 extract |
| 9 | QLCV Wave3 migrate unapplied — DUAL DB JOIN dm | P1 | Nghĩa W4 |
| 10 | ME-S* migrates unapplied — UAT mẻ park | P1 | Nghĩa W4 |
| 11 | Eager cssd-dung-cu/thiet-bi pages | P2 | Soft W5 |
| 12 | MDM vs ops DE_NGHI dual door (D5 đúng, IA mơ) | P2 | copy W1/W2 |
| 13 | KhoDungCuPage legacy export sau redirect kho | P2 | Soft W1 verify+prune |
| 14 | `.next/dev` ~207M + long-lived next-server | P3 ops | Soft/Nghĩa |
| 15 | QLCV type-vs-priority proposal chưa lock | P1 Domain | Nghĩa W6 |

---

## 10. Recommended W0–W2 (Soft đề xuất)

| Wave | Chọn | Việc |
|------|------|------|
| **W0** | A | Nghĩa trả lời §8 (đặc biệt Q1–Q3) |
| **W1** | A | Hygiene: dead writers + dead tabs + InstrumentDoorTabs + CTA HC + comments — **safe thin P0** |
| **W2** | A nếu Nghĩa lock | Dung-cu primary Việc / secondary Tra cứu |

Sau đó: W3 (1 IA) → W5 perf → W4 khi Nghĩa apply migrate → W6 QLCV.

---

## 11. Non-goals slice này

- Không push / PR / merge / Vercel / CloudAgent.
- Không apply migrate / DROP.
- Không bắt đầu W2+ rewrite strip trước lock.
- Không gộp Hỏng/Mất vào PROCESS.
- Không đưa LUAN_CHUYEN lại picker su-co.
- Không đụng dirty WT ngoài audit doc.

---

## 12. Evidence index

- Nav: `src/lib/nav/sidebar-nav-groups.ts` · `sidebar-admin-nav-groups.ts`
- Su-co doors: `cssd-incident-taxonomy.ts` `DIRECT_INCIDENT_DOORS` · `SuCoReportFormFields.IncidentGroupPicker`
- Stations: `cssd-stations.ts`
- Routes: `src/lib/cssd-routes.ts`
- Offline: `src/lib/offline-sync-scope.ts` · `ClientLayoutWrapper.tsx`
- Dead writers: `cssd-write.actions.ts`
- Report tabs: `CSSDReportPage.tsx` `ANALYTICS_TABS` / `isAnalyticsTab`
- NKBV tabs: `GiamSatNkbvPage.tsx` `MAIN_TABS`
- Migrates: `supabase/migrations/20260925*.sql` · `20260926053300_*.sql`
- Prior audits: `_audit-ia-direct-doors` · `_audit-cascade-crud` · `_audit-qlcv-cssd-me` · `_audit-code-vs-mdm`

---

*End audit — Soft Delivery Lead · local commit only.*
