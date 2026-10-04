# Soft Soft Soft hygiene debt — L8 / L9 / L14 + QC→Kiểm bộ — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` |
| Branch | `cursor/me-sync-recall-print` |
| Tip HEAD | `7f0fc61` + Soft Soft Soft-local uncommitted WT (~51 paths) · **ahead 58** of origin |
| Không | commit / push / PR / Vercel / migrate / DROP / invent Domain / sync-from-remote |

Lock: overlap W1 (`_audit-full-debt-overlap-2026-09-27.md`) · cascade C7 · station SSOT `cssd-stations.ts` (`QC` → «Kiểm bộ»).

---

## 1. DONE Soft Soft Soft-local (this beat = verify; no new delete)

### L8 — `KhoDungCuPage` / `CSSDCatalogChiTietTab` / `CSSDCatalogHoaChatTab`

| Symbol / file | Soft Soft Soft WT `src` | Evidence |
|---------------|-------------------------|----------|
| `KhoDungCuPage` | **0** live export / file | `git grep` 0 in `src` except comment `cssd-kho-import-policy.ts:2` («legacy KhoDungCuPage đã gỡ») · `ls …/KhoDungCuPage.tsx` → No such file |
| `CSSDCatalogChiTietTab` | **0** | `git grep` 0 in `src` · file absent |
| `CSSDCatalogHoaChatTab` | **0** | `git grep` 0 in `src` · file absent |
| Live lookalikes (keep) | OK | `verifyCssdKhoDungCuView` gate · `KhoHoaChatTables` / `KhoHoaChatKsnkPage` · `DungCuChiTiet*` MDM — **not** the dead catalog tabs |

**Deleted this beat:** none (already gone Soft Soft Soft-local).

### L9 — dead writers `reportInventoryIssue` / `recordInstrumentTransaction`

| Symbol | Soft Soft Soft WT `src` | Evidence |
|--------|-------------------------|----------|
| `reportInventoryIssue` | **0** | `git grep` 0 under `src` |
| `recordInstrumentTransaction` | **0** | `git grep` 0 under `src` |
| Docs-only | keep archive | `_audit-cascade-crud` · overlap body (stale rows) · agent-notes |

**Deleted this beat:** none.

### L14 — `InstrumentDoorTabs`

| Symbol | Soft Soft Soft WT `src` | Evidence |
|--------|-------------------------|----------|
| `InstrumentDoorTabs` | **0** | `git grep` 0 under `src` · no file match |
| Live lookalike (keep) | OK | `validateInstrumentDoorLines` in `cssd-set-reconcile` / su-co — domain validator, **not** the dead UI tabs |

**Deleted this beat:** none.

### QC (station) → «Kiểm bộ» user-visible Soft Soft Soft-safe

| Surface | Status | Note |
|---------|--------|------|
| Toast / sai-trạm (`cssd-state-engine`) | **DONE prior Soft Soft Soft-local** | `stationLabel` — wrong-station / invalid status; audit `_audit-soft-quy-trinh-toast-kiem-bo-2026-09-28.md` |
| SSOT map | OK tip | `STATION_LABEL.QC = "Kiểm bộ"` · WaitingList `ACTION_VERBS` builds from `STATION_LABEL` |
| Internal enum / tram codes | **keep `QC`** | `tramLabel: "QC"` in `cssd-read.actions` is **code** for `tram_truoc` key — not VI copy |
| QC **mẻ** UI («Chờ QC», «Nhập QC», «Đạt QC», «QC đạt (mẻ)», HOLD_QC copy) | **PARK / keep** | Intentional ≠ station Kiểm bộ (`CssdStationFlowMap`: «Kiểm bộ … ≠ QC mẻ») — Soft Soft Soft does **not** rename batch QC |

**Changed this beat (QC strings):** none — no clear Soft Soft Soft-safe leftover beyond prior toast.

---

## 2. Stale vs Soft Soft Soft WT (do not sync from remote)

### Overlap audit body still says P2 Xóa

| Row | Header / W1 | Body (stale) | Soft Soft Soft WT truth |
|-----|-------------|--------------|-------------------------|
| L8 | W1 **DONE** | L8 line DONE W1 (OK) | Confirmed gone |
| L9 | W1 DONE (writers) | still **P2 Xóa (C7)** | Writers **0** in Soft Soft Soft WT `src` |
| #14 / L14 | W1 DONE | still **Dead branch / xóa** | `InstrumentDoorTabs` **0** in Soft Soft Soft WT `src` |
| § inventory writers table | — | still lists delete paths on `cssd-write.actions` | Soft Soft Soft WT: gone |

Thin pointer patch on overlap doc (same beat): L9 + #14 rows → Soft Soft Soft-local DONE + link here.

### GitHub / origin tip is STALE

`origin/cursor/me-sync-recall-print` (behind Soft Soft Soft WT) **still has**:

- `reportInventoryIssue` · `recordInstrumentTransaction` in `cssd-write.actions.ts`
- `InstrumentDoorTabs` in `SuCoReportForm` / `SuCoReportFormFields`
- files `KhoDungCuPage.tsx` · `CSSDCatalogChiTietTab.tsx` · `CSSDCatalogHoaChatTab.tsx`

**Do not** pull/reset Soft Soft Soft WT from remote to «restore» them. Local Soft Soft Soft WT is source of truth until Nghĩa commits.

Archive docs under `docs/archive/agent-notes/` still name `KhoDungCuPage` historically — leave alone.

---

## 3. Parked this beat (zero invent)

| Item | Verdict | Why |
|------|---------|-----|
| L10 SSI SP reset | **PARK** | Prior Soft Soft Soft note + tip: single `surgery_date`; **no** `procedure_history[]` / same-incision fields — do not invent UX |
| GSC-L05 (file-15 labels / KPIs) | **PARK** | No Domain-locked Soft Soft Soft-ready map of existing file-15 labels → KPIs without invent; GSC Soft Soft Soft-local already has L01/L02 + L03 seed staged (APPLY await Nghĩa) · FE `lop_giam_sat` filter |
| Soft Soft Soft-queue P0 net-new | **Empty / verify-only** | Prefer thin verify+audit; no Domain-A locked file pack ready for new FE this beat |

---

## 4. Paths touched this beat

| Path | Change |
|------|--------|
| `docs/modules/_audit/_audit-soft-hygiene-debt-2026-09-28.md` | **NEW** — this audit |
| `docs/modules/_audit/_audit-full-debt-overlap-2026-09-27.md` | Thin: L9 + #14 rows → Soft Soft Soft-local DONE + pointer |

No `src/` / migrate / seed APPLY this beat.

---

## 5. Tests

Not run — docs-only; no runtime touch. Prior Soft Soft Soft-local toast/station specs remain on tip WT (`cssd-state-engine.spec`, `cssd-stations.spec`).

---

## 6. Still needs Nghĩa (not Soft Soft Soft)

| Item | Action |
|------|--------|
| Soft Soft Soft WT (~51 paths) + ahead 58 | **commit** when ready (leave non-Soft leftovers unstaged: `AGENTS.md`, `_run_move_*`, manifest CSV, `move_results_*`, qlcv proposal if dirty) |
| Draft migrates (25c NT · L04 parent_bo · M-04 chương trình máy · cho_toi · GSC L01 RPC …) | **apply migrate** (Lead) |
| GSC-L03 bang-kiem seed | **seed APPLY** (staged Soft Soft Soft-local; not prod-applied here) |
| Origin stale writers/tabs | After commit+push Soft Soft Soft WT, remote will drop them — until then GitHub tip misleading |

---

## 7. Grep recipe (re-run)

```bash
git -C /Users/drnghia/Desktop/ksnk_bv103 grep -n -- \
  'reportInventoryIssue\|recordInstrumentTransaction\|InstrumentDoorTabs\|KhoDungCuPage\|CSSDCatalogChiTietTab\|CSSDCatalogHoaChatTab' \
  -- 'src' || echo '(0 Soft Soft Soft WT src)'
```

Expect: only `cssd-kho-import-policy.ts` legacy comment for `KhoDungCuPage`; else 0.
