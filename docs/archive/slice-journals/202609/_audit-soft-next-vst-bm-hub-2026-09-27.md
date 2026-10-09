# Soft next — VST / giám sát BM hub thin FE — 2026-09-27

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-27 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip trước | `ff1e0ab` (GSC H2 leftover) · ahead 47 |
| Phạm vi | FE-only · VST + hub `/giam-sat` (BM = biểu mẫu giám sát / cổng nhập) |
| Không | push / PR / Cloud / Vercel / migrate / DROP / dirty WT / W4 / W6 / invent nest IA |

Lock: `docs/modules/giam-sat/README.md` IA P.A · H2 · `docs/ux/principles.md` (ModeNav dialect).

---

## 1. Survey → pick

| Surface | Evidence | Debt? |
|---------|----------|-------|
| Hub `/giam-sat` | Write-first CTA VST·GSC + «Khác» NKBV + quiet Lịch sử/Thống kê/QR | **OK** — không chồng type / không nest |
| Write dest SSOT | Sole-gate → deep-link form; multi → hub; `mode=write` skip | **OK** |
| ModeNav VST | Nhập `/giam-sat-vst` · Lịch sử `/lich-su/vst` · Thống kê `/thong-ke/vst` | **OK** routes |
| Sidebar active | `isGiamSatNavPath` có `/lich-su/vst\|gsc` **không** có `/thong-ke/vst\|gsc` | **P1** — ModeNav peer «Thống kê» làm mất highlight «Giám sát» |
| Analytics H2 | VST analytics: text only, **0** `quan-ly-cong-viec` href | **OK** |
| Dead doors / orphan | Hub → `tuan-thu` (đúng); redirects `?tab=` + next.config legacy OK | **OK** |
| Eager junk | `/thong-ke/vst` dynamic + strategic panel dynamic | **OK** |
| Label drift quiet | Quiet «Lịch sử VST» vs CTA «Vệ sinh tay» | **P3** park — không P0 |
| BM.07.* UAT nội dung | Plan D-UAT — MDM/wording, không Soft FE | **park** Nghĩa/UAT |
| Nest IA | Không invent | — |

| Candidate | Soft-feasible P0/P1 FE? | Verdict |
|-----------|-------------------------|---------|
| **A — ModeNav Thống kê keep sidebar active** | **Y** — thêm `/thong-ke` + `/thong-ke/vst` + `/thong-ke/gsc` vào `isGiamSatNavPath` (loại `/thong-ke/cssd`) | **PICK** |
| B — invent nest / đổi hub IA | N | skip |
| C — audit-only park (no FE) | Would leave real P1 | skip |

**Module chosen:** VST / giám sát hub (A).

---

## 2. A / B

| | A (chọn) | B |
|--|----------|---|
| Scope | Align sidebar active với ModeNav peer Lịch sử **và** Thống kê | Đổi CTA / nest hub / gộp VST-GSC |
| Risk | Thấp — pure path predicate + spec | Churn IA |
| Migrate? | Không | Không |

**Chọn A.**

---

## 3. Before → after

| Surface | Before | After |
|---------|--------|-------|
| Sidebar «Giám sát» on `/thong-ke/vst` · `/thong-ke/gsc` · `/thong-ke` | **inactive** (asymmetry vs `/lich-su/*`) | **active** |
| `/thong-ke/cssd` | inactive (đúng — CSSD) | vẫn inactive |

---

## 4. Files

- `src/lib/nav/giam-sat-write-dest.ts`
- `src/lib/nav/giam-sat-write-dest.spec.ts`
- this audit note
- pointer in `_audit-full-debt-overlap-2026-09-27.md`

---

## 5. Verify / UAT

- `npx tsc --noEmit`
- vitest: `giam-sat-write-dest.spec`
- UAT local: multi-gate user → hub; ModeNav Nhập→Lịch sử→Thống kê VST — sidebar «Giám sát» **giữ active** cả 3; `/thong-ke/cssd` không active Giám sát; sole-VST user sidebar deep-link form vẫn OK

---

## 6. Park / blockers

- Quiet-link abbr VST/GSC vs full VN — P3
- `GIAM_SAT_WRITE_DESTS.label` chưa render UI — P3 dead meta
- BM.* UAT MDM — ngoài Soft
- W4 / W6 — Nghĩa only
