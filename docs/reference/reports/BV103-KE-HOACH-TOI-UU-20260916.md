> ⚠️ **SUPERSEDED (2026-09-17)** — Không dùng làm plan đang hiệu lực.  
> **Plan hiệu lực:** [`BV103-KE-HOACH-TOAN-HE-20260918.md`](./BV103-KE-HOACH-TOAN-HE-20260918.md) · giám sát [`BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md`](./BV103-GIAM-SAT-CHIEN-LUOC-TONG-THE-20260917.md) (+ rà rối [`BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md`](./BV103-RA-SOAT-DO-ROI-UI-DOCS-20260917.md)).  
> File này giữ lịch sử.

# BV103 — Kế hoạch tối ưu project & module (domain → FE → BE → DB → UI/UX)

**Ngày:** 2026-09-16 · Asia/Saigon  
**Baseline code:** `origin/main` = local `main` = `d4461f3` (working tree sạch)  
**WIP dự trữ:** `stash@{0}` `wip-fix-all-20260916-before-sync-to-origin` (áp lại từng lát ≤~5 file)  
**Vận hành:** Grok local mặc định · Cursor chỉ khi «dùng Cursor» · không Project · không push/Vercel/migrate trừ lệnh PO

---

## 1. Mục tiêu thống nhất xuyên suốt

Một thay đổi nghiệp vụ phải đi **cùng một chuỗi**:

| Lớp | Chuẩn | Kiểm chứng |
|-----|--------|------------|
| **Domain** | CDC → WHO → BYT/Cục Quân y → QT BV103 → SSOT repo (`ssot-map.md`) | Neo Grok ≤5 bullet / lát; Cursor **không** đọc CDC thô |
| **Calc SSOT** | Một engine / module (`nkbv-rules-engine`, CSSD workflow domain, …) | Vitest path đụng; không nhánh UI tự tính lại |
| **BE** | UI → Server Action → DB; mọi write có `verifyPermission` / `verifyAnyPermission` | Không admin-client trước verify; không write trong `unstable_cache` |
| **DB** | Additive migrate; RLS; map file git ↔ prod đã apply | Cấm `db push` full khi drift; cấm apply trùng harden |
| **FE/UI** | Dialog `max-h` + scroll nội bộ; chrome B+5; Ops token | `layout:drift-check` / scorecard |
| **UX** | Ít màn như SXHD; 3 cửa catalog (A chờ ADMIN / B chuyển tab / C sự cố); **không** QT/BM code trên UI | UAT localhost + checklist khoa |

**Cổng đọc khi sửa:** `docs/core/read-minimum.md` + README module — **không** mở `archive/agent-notes` / `_agent-*` khi code.

---

## 2. Ba phương án tốc độ (chọn 1)

### Phương án P1 — An toàn go-live (khuyến nghị)
- Chỉ ship P0 an ninh + domain NKBV từ stash · UAT từng lát · commit khi PO lệnh  
- CSSD CAT-01 / migrate map / dọn worktree = sau  
- **Ưu:** ít rủi ro, khớp RACI · **Nhược:** chậm feature CSSD/Auth hub  

### Phương án P2 — Cân bằng (2 tuần)
- Tuần 1 = P1 · Tuần 2 = UI residual + Auth hub (khớp schema prod đã có) + map migrate lên git (không apply lại)  
- CAT-01 vẫn chờ chốt PO  

### Phương án P3 — Tối ưu sâu (chỉ khi PO có thời gian UAT)
- P2 + CSSD catalog hybrid (CAT-01) + NK gap NK-02/05/06/07/08 + perf advisor  
- **Ưu:** đóng nợ lớn · **Nhược:** dễ tái dirty tree — bắt buộc 1 lát / 1 commit  

**Mặc định đề xuất: P1**, nâng P2 sau khi P0 xanh trên localhost.

---

## 3. Chuỗi xuyên suốt theo module

### 3.1 NKBV (`giam-sat-nkbv`) — ưu tiên #1
| Lớp | Hiện trạng `d4461f3` | Việc tối ưu |
|-----|----------------------|-------------|
| BE | HIS-OCR đã ship; sync BA ngày cần review permission | SEC-NK từ stash |
| DB | CH17/SSI migrate + `fn_major_type` trên git; prod đã apply | Không migrate mới trừ lệnh |
| UI/UX | Workspace tách chrome (#61); UAT chữ ký khoa D-14 còn mở | EENT/SST defs + ruled-out; FE-CH17 mỏng; ký UAT-NKBV |

**Lát đề xuất (từ stash, ≤5 file):**  
1) P0-PED rules-engine (+spec) · 2) SEC offline-sync scope · 3) SEC-NK ba-ngay-sync · 4) EENT/SST+ruled-out · 5) UI-QT/VAE copy nếu còn  

### 3.2 CSSD (`cssd-erp` + `cssd-su-co`)
| Lớp | Hiện trạng | Việc |
|-----|------------|------|
| Domain | domain-overview + D1–D10; soft-warning BOM | Không hard-block cấp phát |
| BE | ACL kho + soft-delete (#56) trên origin | Verify-before-admin giữ |
| DB | DRAFT đã archive; prod có perf/harden (timestamp khác git) | Map file; **không** CAT migrate sớm |
| UI/UX | B+3/B+5; 3 cửa sự cố | CAT-01 / catalog-proposal = **P3 / chốt PO** |

### 3.3 Giám sát VST / GSC
| Lớp | Việc |
|-----|------|
| Domain | README giam-sat + bang-kiem | Ít đụng trừ UAT-REFORM |
| FE/UX | Chrome B+5 đã ship | Giữ parity filter/SearchableSelect |
| BE | Offline sync scope (từ stash) gắn đúng path giám sát | Lát SEC offline |

### 3.4 QLCV
| Lớp | Việc |
|-----|------|
| UI | Dialog đề xuất max-h (stash) | 1 file nếu còn lệch |
| FE | list-query pattern (stash) | Áp khi cần perf bảng |

### 3.5 Quản trị / MDM / Auth
| Lớp | Hiện trạng | Việc |
|-----|------------|------|
| DB prod | `sys_account_access_request` đã apply | Code hub xin cấp TK trong stash — khớp schema, **không** migrate lại |
| BE | SEC-AUTH write ngoài cache (stash) | P0 sau PED |
| UI | Hub tài khoản / PasswordField | P2 |

### 3.6 Dashboard / Đào tạo / Entity-QR
| Module | Việc |
|--------|------|
| Dashboard | Giữ metric-dictionary SSOT; không dual path |
| Đào tạo | domain-overview đã có; UI padding Done |
| Entity-QR | Giữ liên thông LOC→GSC |

---

## 4. Tối ưu nền tảng (mọi module)

### 4.1 Domain
- Một chủ đề → một file đang dùng (`ssot-map.md`)  
- Gap mở: đọc gap-catalog / investigation trees — không mở lại archive SSOT  
- Mọi lát domain: Grok đọc CDC, Cursor chỉ nhận neo  

### 4.2 Front end
- Shared: `dialog.tsx`, `bv103-dialog-stack`, EmptyState, SearchableSelect, page chrome  
- Pattern list: `*-list-query.ts` + `use-server-paginated-table`  
- Cấm QT/BM trên label người dùng  

### 4.3 Back end
- `"use server"` chỉ entry action; helper domain thuần ở `lib/`  
- Permission trước service-role / admin client  
- Offline listener chỉ mount đúng path (`offline-sync-scope`)  

### 4.4 Database
- Nguồn sự thật apply = Supabase prod `list_migrations`  
- Git phải có file tương ứng (đúng version hoặc archive/noop)  
- Additive only; security harden **đã trên prod** — chỉ đồng bộ file, không apply lại  
- Local Docker = OPS-DB-01 khi cần parity  

### 4.5 UI / UX
- Dialect Ops (B+3/B+4 Done) + B+5 chrome  
- Dialog entity: `max-h-[min(90dvh,…)] overflow-y-auto`  
- 3 cửa catalog CSSD; checklist UAT khoa (D-14)  

### 4.6 Git / local / origin (đã đạt baseline)
- `main` luôn ff theo origin trước khi mở lát mới  
- WIP chỉ stash hoặc `wip/*` · 1 lát = 1 commit khi PO nói «commit»  
- Dọn 8 worktree Cursor đã merge khi rảnh  

---

## 5. Lộ trình theo tuần (P1 → P2)

| Tuần | Wave | Việc | Ai | DoD |
|------|------|------|-----|-----|
| W0 | — | Baseline sạch `d4461f3` (**xong**) | Grok | local=origin |
| W1 | P0 | PED → offline-sync → SEC-NK → SEC-AUTH (từ stash) | Grok + UAT Nghĩa | vitest + localhost |
| W1b | Domain UI | EENT/SST + ruled-out | Grok | không mở CAT |
| W2 | UX | Dialog/QT residual; EmptyState | Grok | drift OK |
| W2b | Auth hub | Xin cấp TK khớp prod | Grok | không migrate |
| W3 | DB git | Map migrate stash ↔ prod → commit file / archive | Grok + lệnh PO | không apply trùng |
| W4 | CSSD | Chỉ khi «chốt CAT-01» | Grok/Cursor | 3 cửa + FSM |
| W5 | UAT | UAT-NKBV ký khoa + UAT-REFORM | Nghĩa | checklist Done |
| W∞ | Hygiene | Xóa worktree thừa; Boy Scout ≤5 file | Grok | status sạch |

---

## 6. Ma trận ưu tiên (sau baseline)

| ID | Mức | Module | Nguồn | Phase |
|----|-----|--------|-------|-------|
| SEC-OFFLINE | P0 | shared | stash | W1 |
| SEC-NK | P0 | NKBV | stash | W1 |
| SEC-AUTH | P0 | quan-tri | stash | W1 |
| P0-EENT/SST | P1 | NKBV | stash | W1b |
| UI-DIALOG/QT | P1 | shared/QLCV/CSSD | stash | W2 |
| AUTH-HUB | P1 | quan-tri | stash + prod schema | W2b |
| MIG-MAP | P1 | supabase | stash vs prod | W3 |
| UAT-NKBV | P1 lâm sàng | NKBV | open-backlog D-14 | W5 |
| CAT-01 | P2/PO | CSSD | stash | W4 |
| NK-02…08 | P2 | NKBV | audit cũ | sau W1b |
| OPS-DB-01 | P1 env | local | open-backlog | khi bật Docker |

---

## 7. Cách làm việc khi sửa trên local (chuẩn mực)

1. `git status` sạch hoặc đúng lát đang làm  
2. `git pull --ff-only` nếu origin có commit mới  
3. Lát ≤~5 file · mã LÁT rõ · vitest path đụng  
4. Báo: Ai | LÁT | Trạng thái | File | Việc Nghĩa  
5. Nghĩa UAT localhost → lệnh `commit` / `push` / `migrate` / `deploy Vercel` riêng  
6. Không `stash pop` toàn bộ — bảo Grok *áp lát X từ stash*  

---

## 8. Việc Nghĩa chọn ngay

Trả lời một trong các lệnh:

- **«làm P1»** — bắt đầu W1 từ stash (PED trước)  
- **«làm P2»** — P1 + lịch W2 Auth/UI  
- **«làm P3»** — kèm chốt CAT-01 (xác nhận riêng)  
- **«áp P0-PED»** — chỉ một lát đầu


---

## 9. Tiến độ triển khai local (2026-09-16 ~16:30 Asia/Saigon)

**Phạm vi đã áp từ `stash@{0}` (không pop cả đống; không CAT-01; không apply migrate prod; chưa commit):**

| Wave | Nội dung | DoD đo được | Trạng thái |
|------|----------|-------------|------------|
| W1a | P0-PED + ruled-out + EENT/SST + wire sub-forms | `vitest` rules/ruled-out/ch17/taxonomy/analysis-session — **pass** | **Xong local** |
| W1b | offline-sync-scope + ClientLayoutWrapper | `vitest` offline-sync-scope — **pass** | **Xong local** |
| W1c | SEC-NK ba-ngay-sync + re-export sync | verifyPermission trước write; tsc sạch path này | **Xong local** |
| W1d–W2b | SEC-AUTH / PasswordField / hub xin-cấp / admin reauth | `vitest` account-access + quan-tri-paths; `tsc` 0 lỗi liên quan | **Xong local** |
| W2 UI | dialog max-h + dialog-stack + Qlcv/QuanTri shells + EmptyState | `vitest` dialog-stack — **pass** | **Xong local** |
| W3 MIG-MAP | 8 file migrate vào git (sys_account + harden/perf/cssd/pneu) | **Chỉ map file** — **cấm** `db push` / apply lại (prod đã có) | **File có; chờ PO commit** |
| W4 CAT-01 | CSSD catalog-proposal / cho-bi / quarantine | — | **Giữ stash** |
| W5 UAT | localhost checklist | Nghĩa UAT | **Chờ Nghĩa** |


**Lệnh UAT gợi ý:**
1. `npx vitest run src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.spec.ts src/modules/giam-sat-nkbv/lib/nkbv-ruled-out.spec.ts`
3. Đăng nhập → xin cấp TK / tra cứu; admin hub `/quan-tri-he-thong/tai-khoan`
4. Offline: chỉ mount listener trên path giám sát/CSSD shell
5. **Không** chạy migrate các file W3 trên prod

**Việc Nghĩa:** UAT localhost → «commit» (có thể tách 2–3 commit: NKBV | SEC+Auth | migrate-map) → chưa Vercel trừ lệnh.

## 10. Phạm vi tuổi (2026-09-16)

BV103 chỉ người lớn. Docs/runtime nhi đã xóa hoặc stub; xem Phụ lục C trong SSOT 20260827.
