# Gap register

Một chuỗi. Mục trên cùng là bản cuối. Mốc sớm hơn giữ nguyên nội dung, không phải luật đang dùng.

## 2026-07-09

# Gap register — Rà soát toàn diện (2026-07-09)

> Baseline: [audit-evidence-pack.md#2026-07-09](./audit-evidence-pack.md#2026-07-09) · Báo cáo: [comprehensive-review.md#2026-07-09](./comprehensive-review.md#2026-07-09)  
> Tiếp nối [gap-register.md#2026-07-03](./gap-register.md#2026-07-03) (P0/P1 khi đó = 0 — **mở lại** theo bằng chứng mới).  
> **Nguyên tắc:** 1 gap = 1 chat `/intake-nv` → `/implement` sau khi PO duyệt.

---

## Automated gates (2026-07-09)

| Gate | Kết quả |
|------|---------|
| `verify:engineering` | **PASS** |
| `audit:legacy-rpc` / `audit:views` | **PASS** |
| `verify:cssd` / `test:pilot` | **PASS** (49 / 24) |
| `layout:typography-check` | **PASS** |
| `layout:drift-check` | **PASS** (UI-01 Done) |
| `dead-code:scan` | **WARN** — 0 unused files · unusedExports **5** (G-12 Done; residual dialog + scripts env) |
| `local:golden:verify` / `pilot:go-live:gate:local` | **PASS** (2026-07-09 re-verify) |

**P0 mở: 0 · P1 mở: 0 · P2 Done (G-12) · P3 roadmap · UAT NKBV tay #2–#5**

---

## Remediation 2026-07-09 (implement sau audit)

| ID | Trạng thái | Bằng chứng |
|----|------------|------------|
| DOM-07 | **Done** | `isHaiSuspectByDay3Rule` + skip spawn POA trong `giam-sat-nkbv-import.actions.ts` |
| BE-RPC-01 | **Done** (local applied) | `20260709120000` REVOKE authenticated trên `fn_qlcv_update_checklist` |
| DOM-04 | **Done** | Bỏ auto `bom_kiem_dem_at` trong `cssd-scan.actions.ts` |
| DOM-08 | **Eng Ready / UAT PO** | Status `CHO_XAC_MINH`; checklist #2–#5 có hướng dẫn PO (2026-07-09) |
| BE-RPC-02 | **Done** (local applied) | Wrapper GSC analytics + revoke anon |
| BE-RPC-03 | **Done** (local applied) | Wrap CSSD RPC + `fn_require_cssd_workflow_edit` |
| UI-01 | **Done** | QrCameraModal + IncidentReportModal dùng `bv103PanelChrome as UI` |
| OPS-01 | **Done** | `mdm:migrate:local` up-to-date · `verify:mdm:local` PASS · golden 11/11 · `pilot:go-live:gate:local` PASS (2026-07-09) |

**Verify session:** `verify:engineering` PASS · `verify:cssd` 49 PASS · timeline-math 25 PASS · `layout:drift-check` PASS

---

## P0 — Chí mạng (dữ liệu / bảo mật)

### DOM-07 / FEAT-NKBV-01 — Day-3 không enforce server-side khi import vi sinh — **Done**

| | |
|--|--|
| **Bằng chứng** | UI: `NkbvViSinhImportPortal.tsx` tính `isHaiSuspect` (`diffDays >= 2`) nhưng `handleImportSubmit` gửi **toàn bộ** `records`. Server: `giam-sat-nkbv-import.actions.ts` vòng L198+ tạo `nkbv_fact_su_kien` không lọc Day-3. |
| **Ảnh hưởng** | Ca POA (ngày 1–2) vào giám sát HAI → KPI nhiễm khuẩn sai chuẩn CDC. |
| **Khắc phục** | ~~Trong `importViSinhExcel`: chỉ spawn case khi Day-3~~ **Đã làm** `isHaiSuspectByDay3Rule`. |
| **Verify** | `vitest` nkbv-timeline-math · `verify:engineering` — **PASS** |
| **Effort** | M |
| **Chat** | `/intake-nv` module NKBV — «Import vi sinh chỉ tạo ca từ Day-3» |

### BE-RPC-01 — `fn_qlcv_update_checklist` GRANT authenticated không check quyền — **Done (pending migrate)**

| | |
|--|--|
| **Bằng chứng** | `20260531120000` GRANT `authenticated`; `20260607100000` REPLACE function **không** thêm `fn_sys_has_permission` / revoke authenticated. SECURITY DEFINER cập nhật checklist/% bất kỳ `qlcv_fact_cong_viec`. |
| **Ảnh hưởng** | User đã login có thể gọi PostgREST RPC trực tiếp, bypass scope app. |
| **Khắc phục** | Migration `20260709120000` — REVOKE authenticated, chỉ `service_role`. |
| **Verify** | Sau `mdm:migrate:local` — authenticated không EXECUTE |
| **Effort** | S–M |
| **Chat** | `/intake-nv` module QLCV — «Siết RPC checklist» |

---

## P1 — Cao (nghiệp vụ / bảo mật tầng RPC)

### DOM-04 — CSSD BOM auto-stamp khi quét Đóng gói — **Done**

| | |
|--|--|
| **Bằng chứng** | `cssd-scan.actions.ts` L140–148: `update bom_kiem_dem_at` khi quét, không qua `rpc_cssd_persist_bom_checkpoint`. |
| **Ảnh hưởng** | Hệ thống coi đã kiểm cấu phần chỉ vì quét QR → thiếu dụng cụ có thể vào tiệt khuẩn. |
| **Khắc phục** | ~~Bỏ auto-stamp~~ **Đã làm** — chỉ còn `rpc_cssd_assign_cycle_qr`. |
| **Verify** | `verify:cssd` PASS |
| **Effort** | M |

### DOM-08 / FEAT-NKBV-02 — NKBV UAT + trạng thái auto-case lệch checklist — **Eng Ready / UAT PO**

| | |
|--|--|
| **Bằng chứng** | Checklist: kỳ vọng `CHO_XAC_MINH`; import set `DANG_GHI_NHAN`. UAT #2–#5 `[ ]` chưa ký. |
| **Khắc phục** | Map import → `CHO_XAC_MINH` (fallback DANG_GHI_NHAN). Checklist PO hướng dẫn #2–#5 cập nhật 2026-07-09. |
| **Verify** | Eng: vitest NKBV PASS · PO: ký [`pilot-clinical-checklist-20260603.md`](../module-history/nkbv/pilot-clinical-checklist-20260603.md) |
| **Effort** | M (code S + UAT PO) |

### BE-RPC-02 — GSC analytics RPC chưa harden như VST — **Done** (local applied)

| | |
|--|--|
| **Bằng chứng** | VST: `20260704110000` + `fn_require_gstt_analytics_access`. GSC: `20260630140000` GRANT rộng, chưa wrapper. |
| **Khắc phục** | `20260709120000` mirror VST cho GSC strategic / checklist detail / compare. |
| **Verify** | `smoke:gsc-vst:local` PASS 2026-07-09 |
| **Effort** | M |

### BE-RPC-03 — CSSD workflow RPC GRANT authenticated không `fn_sys_has_permission` — **Done** (local applied)

| | |
|--|--|
| **Bằng chứng** | `rpc_scan_workflow_station`, `rpc_cssd_persist_bom_checkpoint`, `rpc_cssd_assign_cycle_qr` — gate nghiệp vụ trong RPC nhưng thiếu permission module. |
| **Khắc phục** | `fn_require_cssd_workflow_edit` + wrap 3 RPC; service_role bypass cho admin client. |
| **Verify** | Local migrate + `verify:cssd` 49 PASS |
| **Effort** | M |

### OPS-01 — Local golden / go-live gate — **Done** (2026-07-09)

| | |
|--|--|
| **Bằng chứng (trước)** | `permission denied` docker.sock; Supabase CLI EPERM telemetry. |
| **Khắc phục** | Docker Desktop OK · `mdm:migrate:local` (head `20260709140000`) · `verify:mdm:local` PASS · `local:golden:verify` 11/11 PASS · `pilot:go-live:gate:local` PASS (engineering + cssd 49 + pilot 24 + smoke GSC/VST). |
| **Effort** | S (ops) |

---

## P2 — Trung bình

| ID | Slice | Trạng thái |
|----|-------|------------|
| DOM-01 | Spec §2.1 VST | **Done** — domain-spec 1.2 |
| DOM-02 | TGS đọc summary VIEW | **Done** — metric-dictionary ghi ngoại lệ |
| DOM-05 | CAP_PHAT hard vs soft | **Done** — soft-warning SSOT + quyết định W2 [`cap-phat-soft-warning-decision-20260722.md`](../module-history/cssd/cap-phat-soft-warning-decision-20260722.md) |
| DOM-10 | QLCV CHECK legacy mã | **Done** — `20260709140000` backfill + CHECK 7 mã |
| DB-01 | G-11 backlog 0703 | **Done** — gap-register-0703 cập nhật |
| DB-02 | RLS summary | **Done/N/A** — VIEW live; DROP policy legacy; underlying fact RLS |
| DB-02b | `gstt_dm_bang_kiem` USING(true) | **Done (2026-07-22)** — `20260722100000` + `trial:rbac:roles` |
| DB-03 | CSSD bao_tri/kho RLS | **Done** — `20260709130000` |
| DB-04 | = BE-RPC-02 | **Done** (P1) |
| DB-08 | NKBV fact RLS | **Done** — `20260709130000` |
| UI-01 | Layout 2 modal | **Done** |
| BE-AUTH-03/04 | Prefetch / missing env | Prefetch giữ (perf); **BE-AUTH-04 Done** — thiếu env → redirect login |
| G-12 (cũ) | unused-var boy-scout | **Done** (2026-07-09) — unusedExports **75→5**; residual: shadcn `dialog` + script local env (giữ by design) |
| BE-ORPHAN-01 | 5 file Pilot W3 | **Done** — đã xóa |
| DOM-03 | GSC README dual entry | **Done** |
| DOM-14 | spawn RPC tên cũ | **Done** |

---

## P3 — Thấp / roadmap

| ID | Slice | Trạng thái |
|----|-------|------------|
| DOM-03 | README GSC dual entry | **Done** (P2 batch) |
| DOM-09 | CDC baseline DB chưa dùng | MVP OK — giữ |
| DOM-10 | Thu hẹp QLCV CHECK legacy | **Done** (`20260709140000`) |
| DOM-11 | QLCV badge màu qua MDM lookup | Giữ |
| DOM-14 | mapping spawn RPC tên cũ | **Done** |
| DB-05 | Dual naming `fact_*_summary` compat | Giữ (RPC hotpath) |
| DB-06 | mapping lệch bảng đã DROP | Giữ / boy-scout |
| DB-07 | `v_auth_user_permissions` CANDIDATE_REVIEW | Giữ |
| BE-ORPHAN-01 | 5 file Pilot W3 | **Done** |
| BE-CSSD-02 | Whitelist MDM import CSSD | Giữ |
| D-15…D-20 | Roadmap | Giữ |

---

## Hàng đợi implement (PO chọn tuần tự)

| # | Gap | Module | Effort | Trạng thái |
|---|-----|--------|--------|------------|
| 1 | DOM-07 | NKBV | M | **Done** |
| 2 | BE-RPC-01 | QLCV | S–M | **Done** (local applied) |
| 3 | DOM-04 | CSSD | M | **Done** |
| 4 | BE-RPC-02 | Giám sát GSC | M | **Done** (local applied) |
| 5 | BE-RPC-03 | CSSD | M | **Done** (local applied) |
| 6 | DOM-08 | NKBV UAT | M + PO tay | Eng Ready — checklist hướng dẫn #2–#5 cập nhật; chờ ký khoa |
| 7 | OPS-01 | Ops | S | **Done** — migrate head `…140000`; golden 11/11; go-live gate local PASS |
| 8 | UI-01 | UI shell | S | **Done** |
| 9 | DOM-01 + DB-01 | Docs | S | **Done** |
| 10 | BE-ORPHAN-01 | Dashboard/QLCV | S | **Done** |
| 11 | P2 batch | Docs+RLS+proxy | M | **Done** |
| 12 | DOM-10 + G-12 | QLCV + dead-code | M | **Done** (unusedExports 75→5) |
| 13 | Mobile CSSD | CSSD quét QR | S | **Done** — scroll lock + touch targets trạm/BOM/camera |

---

## Backlog giữ từ 2026-07-03

| ID cũ | Trạng thái mới |
|-------|----------------|
| G-12 unused-var | **Done** — residual 5 (dialog + scripts env) by design |
| G-11 / S-RLS-01 | **Done (2026-07-22)** — bang_kiem drop USING(true) `20260722100000`; summary VIEW invoker |
| G-10 NKBV UAT | Vẫn mở → gộp DOM-08 · gói W3 [`w3-nkbv-dashboard-enablement-20260722.md`](../plans/guides/w3-nkbv-dashboard-enablement-20260722.md) |

---

## Deliverables đợt này

1. [audit-evidence-pack.md#2026-07-09](./audit-evidence-pack.md#2026-07-09)
2. [comprehensive-review.md#2026-07-09](./comprehensive-review.md#2026-07-09)
3. Gap register này
4. Cập nhật [debt-register.md](../plans/architecture/debt-register.md) mục Audit 2026-07-09
5. Cập nhật [README.md](./README.md) index SSOT

## 2026-07-03

# Gap register — Cải tổ pilot toàn diện (2026-07-03)

> Baseline trước Wave 0–5 chương trình cải tổ local (7 khối pilot). Tiếp nối [gap-register.md#2026-07-02](../../archive/reports/gap-register.md#2026-07-02).

## Automated gates (local — 2026-07-03)

| Gate | Kết quả |
|------|---------|
| `npm run pilot:go-live:gate:local` | **PASS** |
| `npm run audit:legacy-rpc` | **PASS** (0 RPC không ref) |
| `npm run audit:views` | **PASS** (0 unused · 15 sql-only — **giữ**) |
| `npm run repo:hygiene` | **PASS** (rbac-registry-parity-probe allowlist fixed) |

## DB snapshot

| Metric | Giá trị |
|--------|---------|
| Migration files (repo) | 92 (head `20260704120000`) |
| View audit | 0 unused · 15 sql-only |
| Auth pilot | `mdm_email_no_auth` = 0 (1 user local) |

---

## Chương trình cải tổ — trạng thái wave

| Wave | Mô tả | Trạng thái |
|------|-------|------------|
| W0 | Baseline refresh + gap register | **Done** |
| W1 | Local golden (`local:golden:verify`) + SOP reset | **Done** |
| W2 | Fallow dead-code + CI hygiene | **Done** |
| W3 | Nghiệm thu 7 khối pilot (automated gates) | **Done** — [pilot-module-automated-gates-20260703.md](./pilot-module-automated-gates-20260703.md) |
| W4 | Perf/doc ongoing | **Done** — probe 11 `audit:views`; CI hygiene re-verify (D-12) |
| W5 | Sign-off §B automated | **Done** — checklist tay ☐ PO |

---

## P0/P1 mở: **0**

## Backlog P2/P3 (giữ từ 02/07) — cập nhật 2026-07-09

| ID | P | Slice | Trạng thái 2026-07-09 |
|----|---|-------|------------------------|
| G-12 | P2 | Boy-scout unused-var | **Done** 2026-07-09 — unusedExports 75→5 (dialog + scripts env giữ) |
| G-11 / W2-02 | P3 | S-RLS-01 GSTT RLS fact phiên | **Done** (`20260703100000`); residual summary → `20260709130000` |
| G-10 / W3-07 | P3 | NKBV clinical UAT (PO tay) | Vẫn mở — DOM-08 |

---

## Deliverables wave này

1. `scripts/local-golden-verify.mjs` + `npm run local:golden:verify`
2. `scripts/dead-code-scan.mjs` + `npm run dead-code:scan`
3. `operations-sop.md` §2.1.2 — quy trình db reset local
4. CI: `repo:hygiene`, `layout:typography-check`, `dead-code:scan` (warn)
5. [pilot-module-automated-gates-20260703.md](./pilot-module-automated-gates-20260703.md)

---

## Repo cleanup waves (07/2026)

| Wave | Nội dung | Trạng thái |
|------|----------|------------|
| 1 | Core docs 19→15; README migration/SQL; archive gap register cũ | **Done** |
| 2 | Archive 12 báo cáo audit 06/2026 → `docs/archive/reports/` | **Done** |
| 3 | Archive codemod script; `scripts/README.md`; `audit:views` + `gstt:gap:backfill` npm | **Done** |
| 4 | `audit:views` → probe 11 `local:golden:verify`; CI D-12 re-verify; cập nhật reports index | **Done** |
| 5 | Fallow 20 unused files; sửa `dead-code-scan.mjs`; xóa orphan/deprecated/shadow (2026-07-08) | **Done** — xem mục dưới |

Chi tiết script: [`../../../scripts/README.md`](../../../scripts/README.md).

---

## Repo cleanup wave 5 (2026-07-08)

### Baseline gates

| Gate | Kết quả |
|------|---------|
| `npm run dead-code:scan` | **WARN** — 20 unused (trước cleanup); wrapper parse JSON **đã sửa** |
| `npm run repo:hygiene` | **PASS** |
| `npm run audit:legacy-rpc` | **PASS** (0 RPC không ref) |
| `npm run audit:views` | **PASS** (0 unused · 16 sql-only — **giữ**) |
| `npm run pilot:go-live:gate:local` | **PASS** (Docker + Supabase local; smoke JWT pilot admin) |

### Fallow snapshot (trước cleanup)

- **20** `unused_files`, **138** `unused_exports`
- Whitelist giữ: `cssd.actions.ts` (compat barrel)

### Đã xóa (pilot-safe)

| Nhóm | Files |
|------|-------|
| Orphan UI/lib | `TaiKhoanNhanSuStaffActions`, `DungCuChiTietPage`, `CSSDSubNav`, `BomGapBadge`, `SplitAndPrintSubQrButton`, `gsc-history-loai-filter`, `bang-kiem-dm-tieu-chi-select`, `qlcv-permission-server` |
| Deprecated MDM import | `MasterDataImportExportModal`, `master-import.actions`, `excel-io.helpers`, `danh-muc.actions`, `categories-cache-tags` |
| QLCV legacy | `checklist.actions`, `qlcv-checklist` (module lib — khác `@/lib/domain/qlcv-checklist`) |
| GSC shadow routes | 3× `giam-sat-chung/*/thong-ke/page.tsx` (redirect `next.config.ts` cover) |
| Docs archive | `traceability-matrix-20260603.md` (superseded → `reference/reports/traceability-matrix-20260702.md`) |

### Sau cleanup (2026-07-08)

- **5** `unused_files` còn lại — toàn bộ **Dashboard W3 latent** (có comment `pilot W3`)
- `verify:engineering` **PASS** · `test:pilot` **24/24** · `docs:links:check` **PASS**
- `pilot:go-live:gate:local` **PASS** · `local:golden:verify` **PASS** (11 probes)
- Smoke fix: `gsc-vst-rpc-smoke.sql` set JWT pilot admin (sau migration VST security hardening)

## 2026-07-02

# Gap register — Wave 0–4 cleanup (2026-07-02)

> Rà soát dọn rác 4 wave theo intake PO. Tiếp nối [gap-register.md#2026-07-01](./gap-register.md#2026-07-01).

## Automated gates (local — 2026-07-02)

| Gate | Kết quả |
|------|---------|
| `npm run verify` | **PASS** |
| `npm run pilot:go-live:gate:local` | **PASS** |
| `npm run repo:hygiene` | **PASS** |
| `npm run ssot:db:guard:local` | **PASS** (`legacy_compat_views_ok: true`) |
| `npm run trial:audit:probe:local` | **PASS** (0 audit trigger orphan) |
| `npm run audit:legacy-rpc` | **PASS** (0 RPC không ref) |
| `npm run cssd:db:audit:local` | **PASS** |
| `npm run gstt:db:audit:local` | **PASS** |
| `npm run panel:chrome-check` | **PASS** |
| `npm run layout:drift-check` | **PASS** (0 blocking) |
| `npm run lint:cssd-architecture` | **PASS** (bounded-context import fix) |

## DB snapshot

| Metric | Giá trị |
|--------|---------|
| Migration files (repo) | 87 (head `20260702100000`) |
| View audit (`audit-view-usage`) | 0 unused · 15 sql-only (dashboard/RPC hotpath — **giữ**) |
| Seed RBAC | `config.toml` → `00-rbac.sql` + `01-pilot-nhan-su.sql` |

---

## Wave 0 — Baseline refresh

| ID | Trạng thái | Ghi chú |
|----|------------|---------|
| W0-01 | **Done** | Full gate snapshot trên local |
| W0-02 | **Done** | Gap register này |

---

## Wave 1 — Nav / doc / traceability

| ID | P | Mô tả | Trạng thái | Evidence |
|----|---|-------|------------|----------|
| W1-01 | P2 | Route `/giam-sat-chung/*` sub-tab không trong sidebar | **By design** | `gsc-app-paths.ts` — tab nội bộ GSC |
| W1-02 | P2 | Route compat `/cssd-erp/batch`, `/cssd-erp/report` | **By design** | Redirect + backward compat trong `next.config.ts` |
| W1-03 | P2 | Doc mapping vẫn nhắc tên compat lịch sử | **Accepted** | Changelog DEPRECATED block — guard pass |
| W1-04 | P2 | Traceability matrix lỗi thời (DigitalChecklistPanel, ledger warning) | **Done** | [traceability-matrix-20260702.md](./traceability-matrix-20260702.md) |

**Kết luận Wave 1:** Không route chết blocking; sidebar ↔ gate khớp (G-14/15 done wave trước).

---

## Wave 2 — DB / RPC / seed

| ID | P | Mô tả | Trạng thái | Ghi chú |
|----|---|-------|------------|---------|
| W2-01 | P1 | View sql-only orphan | **Done — không DROP** | 15 view phục vụ RPC/dashboard; catalog trong audit-view-usage |
| W2-02 | P3 | GSTT RLS permissive duplicate policies | **Deferred** | App dùng admin client; cần migration riêng + UAT quyền — slice S-RLS-01 |
| W2-03 | P1 | Seed RBAC local sau `db reset` | **Configured** | `supabase/seeds/00-rbac.sql`; D-04 exit — cần tay `db reset` trước pilot mới |
| W2-04 | P1 | Orphan RPC dashboard/BK | **Done** (prior) | `20260701100000` |

---

## Wave 3 — Code / UI rác theo module

| ID | P | Module | Mô tả | Trạng thái |
|----|---|--------|-------|------------|
| W3-01 | P1 | CSSD | Import vượt bounded-context (`cssd-su-co` → action trực tiếp) | **Done** — `inventory-instrument/entrypoint` |
| W3-02 | P2 | CSSD | Typography drift 9–10px | **Done** — CompositionReconcilePanel, thiet-bi-print-qr |
| W3-03 | P2 | MDM | Dead `saveBoAllocationAction` | **Done** — removed |
| W3-04 | P2 | MDM | Unused `NHOM_GOI_Y`, `listMasterRows` imports | **Done** |
| W3-05 | P2 | MDM | Typography thiet-bi-form-modal | **Done** |
| W3-06 | P2 | All | unused-var lint (~100 warn) | **Ongoing** | Boy-scout per slice (G-12) |
| W3-07 | P3 | NKBV | Clinical UAT sign-off | **Pending PO** | G-10 |
| W3-08 | P1 | CSSD sự cố | Build type errors (orphan `setCauseClassCode`, `data.typeId`) | **Done** | su-co-report + SuCoReportForm |

---

## Wave 4 — Nghiệm thu

| Rubric | Trước (30/06) | Sau (02/07) |
|--------|---------------|-------------|
| Domain/DB avg | 4.1 | **4.1** (giữ) |
| UI coherence | 4.0 | **4.2** (layout drift 0, typography slice) |
| Backend contract | PASS | **PASS** |
| P0/P1 mở | 0 | **0** |

| Hạng mục | Trạng thái |
|----------|------------|
| Automated ship gate | **PASS** |
| PO checklist §B sign-off | **Pending** — cần ký tay từng khối pilot |
| Linked staging parity | Verify khi token Supabase linked OK |

---

## P0/P1 mở: **0**

## Backlog P2/P3 còn lại

| ID | P | Slice đề xuất |
|----|---|---------------|
| G-12 | P2 | Boy-scout unused-var từng module — **ĐÃ XONG 2026-07-03** (cải tổ Đợt 1: 0 cảnh báo unused-vars) |
| G-11 / W2-02 | P3 | S-RLS-01 GSTT RLS hardening — **ĐÃ XONG 2026-07-03** (migration `20260703100000` + `20260703101000`; test 3 vai pass local) |
| G-10 / W3-07 | P3 | S-NKBV-UAT clinical sign-off |

---

## Remediation code (wave này)

1. `inventory-instrument/entrypoint.ts` — export composition reconcile cho cssd-su-co
2. `InstrumentIncidentFields.tsx` — import qua entrypoint (lint:cssd-architecture pass)
3. Xóa dead code: `saveBoAllocationAction`, `NHOM_GOI_Y`, unused imports hoa-chat/thiet-bi actions
4. Typography 11px: CompositionReconcilePanel, thiet-bi-print-qr-button, thiet-bi-form-modal
5. Fix build: `su-co-report.application.ts` typeId; xóa orphan `setCauseClassCode` trong SuCoReportForm

## 2026-07-01

# Gap register — Wave 2 (2026-07-01)

> Tiếp nối [gap-register.md#2026-06-30](./gap-register.md#2026-06-30). Baseline refresh sau remediation wave 2.

## Automated gates (local — 2026-07-01)

| Gate | Kết quả |
|------|---------|
| `npm run verify` | **PASS** |
| `npm run pilot:go-live:gate:local` | **PASS** |
| `npm run ssot:db:guard:local` | **PASS** (`legacy_compat_views_ok: true`) |
| `npm run audit:legacy-rpc` | **PASS** (sau DROP orphan RPC) |
| `npm run layout:drift-check` | **PASS** (0 blocking) |

## Staging parity (G-13)

| Check | Kết quả | Ghi chú |
|-------|---------|---------|
| `mdm:migration:list:linked` | **PASS** | Head `20260701100000` — parity local/prod (2026-07-01) |

## Gap status Wave 2

| ID | P | Mô tả | Trạng thái | Slice |
|----|---|-------|------------|-------|
| G-07 | P1 | Triple strategic RPC fetch | **Done** | S-DASH-02 `strategic-analytics-fetch.ts` |
| G-08 | P2 | GSC intervention copy 4 chỗ | **Done** | S-GSC-02 `gsc-checklist-intervention.ts` |
| G-09 | P2 | 5 panel chưa wire token | **Done** | `panel:wire` + `QlcvOperationsPanel` alias `UI` |
| G-12 | P2 | unused-var lint | **Ongoing** | boy-scout per slice |
| G-13 | P1 | Staging migration parity | **Done** | S-OPS-01 — prod `20260701100000` |
| G-14 | P0 | Nav `/thong-ke` vs `verifyCommandCenterShell` | **Done** | S-PERM-01 |
| G-15 | P1 | Dashboard nav vs shell | **Done** | S-PERM-01 `canSeeCommandCenterNav` |
| G-16 | P1 | `rpc_get_compliance_dashboard_v4` orphan | **Done** | S-RPC-01 migration DROP |
| G-17 | P2 | `rpc_reorder_tieu_chi_bang_kiem` orphan | **Done** | S-RPC-01 (app dùng `reorderTieuChis` TS) |
| G-18 | P2 | Hub giám sát không lọc quyền | **Done** | S-UX-02 |
| G-19 | P2 | Analytics shell `/thong-ke` drift | **Done** | S-UX-01 design tokens |
| G-20 | P2 | Doc ghost rows mapping | **Done** | S-DOC-01 |
| G-10 | P3 | NKBV UAT clinical | **Eng ready** | S-NKBV-UAT — chờ ký khoa KSNK |
| G-11 | P3 | GSTT RLS permissive | **Open P3** | S-RLS-01 deferred |

## P0/P1 mở: 0

## 2026-06-30

# Gap register — 2026-06-30

> Phân loại: **P0** an toàn/dữ liệu · **P1** kiến trúc · **P2** UX/perf · **P3** roadmap

| ID | P | Module | Dimension | Mô tả nghiệp vụ | Bằng chứng | Trạng thái | Slice |
|----|---|--------|-----------|-----------------|------------|------------|-------|
| G-01 | P0 | GSTT | DB | View compat `dm_bang_kiem` tái tạo sau cleanup | `ssot:db:guard` fail trước audit | **Done** | migration `20260701000000` |
| G-02 | P0 | MDM/BK | DB | RPC `rpc_gstt_dm_bang_kiem_max_numeric_suffix` thiếu trên DB | app gọi RPC không tồn tại | **Done** | cùng migration |
| G-03 | P1 | Analytics | FE | ESLint hooks errors chặn `verify` | supervision-charts-khoa, use-analytics-filters | **Done** | inline fix |
| G-04 | P2 | UX | FE | 38 layout drift (text-[10px], panel chrome) | layout:drift-check fail | **Done** | typography + chrome |
| G-05 | P2 | Ops | SQL | Multi-statement SQL scripts fail CLI runner | cssd-tram, audit-probe | **Done** | JSON single-query |
| G-06 | P2 | Ops | Hygiene | 4 SQL files ngoài allowlist | repo:hygiene | **Done** | allowlist update |
| G-07 | P1 | Dashboard | Backend | 3 luồng fetch strategic RPC trùng | backend audit | **Done** | `use-analytics-filter-payload.ts` |
| G-08 | P2 | GSC | Backend | Logic intervention checklist copy 4 chỗ | backend audit | **Done** | `gsc-checklist-intervention.ts` SSOT |
| G-09 | P2 | UX | FE | 5 panel import chrome chưa wire token | adoption-warn | **Done** | `panel:wire` 8 files |
| G-10 | P3 | NKBV | Domain | UAT clinical forms chưa ký KSNK | debt D-14 | **Automated OK** | manual §B còn 4 case tay |
| G-11 | P3 | GSTT | Security | RLS permissive trên một số `gstt_fact_*` | architecture-one-pager | **Open P3** | RLS hardening slice |
| G-12 | P2 | ESLint | Code | 106 unused-var warnings | npm run lint | **Open P2** | boy-scout per slice |
| G-13 | P1 | Staging | Ops | Linked staging chưa verify parity 85 migrations | `mdm:migrate` 401 Unauthorized | **Blocked ops** | Cần refresh `SUPABASE_ACCESS_TOKEN` / DB password |
| G-14 | P2 | CSSD | Script | `add-panel-chrome` ref file deleted | add-panel-chrome-imports.mjs | **Done** | removed stale entry |

---

## P0/P1 mở: 0 code · 1 ops (G-13 token staging)

## Đề xuất slice tiếp theo

| Slice | Scope |
|-------|-------|
| S-OPS-01 | Refresh Supabase token → `npm run mdm:migrate` staging |
| S-NKBV-UAT | PO ký 4 case tay trong pilot-clinical-checklist |
