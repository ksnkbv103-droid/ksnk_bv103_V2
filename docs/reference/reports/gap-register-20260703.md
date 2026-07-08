# Gap register — Cải tổ pilot toàn diện (2026-07-03)

> Baseline trước Wave 0–5 chương trình cải tổ local (7 khối pilot). Tiếp nối [gap-register-20260702.md](../../archive/reports/gap-register-20260702.md).

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

## Backlog P2/P3 (giữ từ 02/07)

| ID | P | Slice |
|----|---|-------|
| G-12 | P2 | Boy-scout unused-var |
| G-11 / W2-02 | P3 | S-RLS-01 GSTT RLS |
| G-10 / W3-07 | P3 | NKBV clinical UAT (PO tay) |

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
