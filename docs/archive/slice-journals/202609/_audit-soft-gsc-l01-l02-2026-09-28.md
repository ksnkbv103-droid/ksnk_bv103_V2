# Soft audit — GSC-L01 + GSC-L02 Soft Soft-queue — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `cursor/me-sync-recall-print` @ `244ef21`+ |
| Neo | Domain backlog `21-BACKLOG-LAT-GSC-CSSD-QLCV-20260928.md` · file **14** Lock A · file **15** SURF · file **11** PO 18:51 · prior Soft `feat/ve-sinh-tay-hub-3metric` / `cursor/ve-sinh-tay-hub-kpi-e04e` |
| Không | invent · commit/push/PR · Vercel · prod migrate · seed BK (GSC-L03 PO) · đụng WT khác (NKBV / CSSD / QLCV) |

---

## DoD Soft — status

### GSC-L01 · Derive hình thức KSNK ≠ TGS

| # | DoD | Soft | Evidence |
|---|-----|------|----------|
| 1 | NV biên chế Khoa KSNK luôn `HT_CHUYEN_TRACH` | **DONE Soft-local** | `deriveHinhThucGiamSat` · `resolveSupervisorPolicy` · `GiamSatHeaderFields` |
| 2 | Không vào mẫu `ty_le_tgs` / `do_lech` đúng lens | **DONE Soft-local FE + draft RPC** | FE persist HT đúng; draft `fn_get_session_stype` Lock A |
| 3 | Override HT = Không | **OK** | Header vẫn sync auto / read-only HT |
| 4 | Fixture unit: KSNK cùng khoa→CT · ML cùng khoa→TGS · A→B→Chéo | **DONE** | `supervision-policy.spec.ts` |
| 5 | RPC/aggregate lens after gate | **Draft Soft-local** | `20260928032000_gsc_l01_fn_session_stype_ksnk_lock_a.sql` — **chưa apply** |

**Trước tip:** KSNK + cùng khoa → TGS (file 14 O1 / §7).  
**Sau Soft:** KSNK → luôn chuyên trách (Lock A).

### GSC-L02 · Hub chuyên đề VST = WHO BM.01 + BK BM.02 + BK BM.03

| # | DoD | Soft | Evidence |
|---|-----|------|----------|
| 1 | Hub `/giam-sat` 3 lối nhập cạnh nhau | **DONE Soft-local** | `VE_SINH_TAY_ENTRIES` · `GiamSatHubPage` |
| 2 | Analytics / BCTH 3 KPI tách · không mix WHO↔BK mẫu số | **DONE Soft-local** | `VeSinhTayKpiTriptych` · `buildVeSinhTayKpiCards` |
| 3 | Filter `chuyen_de=VST` tải WHO+GSC (BM.02/03) | **DONE Soft-local** | `shouldFetchSource("VST","GSC")===true` |
| 4 | BM map + WHO không vào picker GSC | **DONE Soft-local** | `ve-sinh-tay-catalog` · `filterOutWhoBangKiemRows` · `getBangKiemsForGiamSat` |
| 5 | Chuyên đề khác → engine GSC + `chuyen_de` | **OK** | Hub «Nhập giám sát khác» · GSC section BCTH giữ nguyên |

**Port (NO invent):** catalog/KPI/triptych từ Soft prior `cursor/ve-sinh-tay-hub-kpi-e04e` + WHO filter / `shouldFetch` từ `feat/ve-sinh-tay-hub-3metric` (`dd049b3`).

---

## Files (this slice only)

| Path | Change |
|------|--------|
| `src/lib/supervision-policy.ts` | `deriveHinhThucGiamSat` Lock A + wire `resolveSupervisorPolicy` |
| `src/lib/supervision-policy.spec.ts` | **new** — 4 fixtures L01 |
| `src/components/shared/GiamSatHeaderFields.tsx` | derive qua `deriveHinhThucGiamSat` |
| `supabase/migrations/20260928032000_gsc_l01_fn_session_stype_ksnk_lock_a.sql` | Draft recreate `fn_get_session_stype` — **chưa apply** |
| `src/lib/domain/ve-sinh-tay-catalog.ts` (+ `.spec.ts`) | **new** — 3 entries + WHO exclude |
| `src/lib/domain/ve-sinh-tay-kpi.ts` (+ `.spec.ts`) | **new** — 3 KPI cards không gộp % |
| `src/modules/dashboard/components/comprehensive/VeSinhTayKpiTriptych.tsx` | **new** — BCTH bc-vst |
| `src/modules/dashboard/views/bao-cao-tong-hop-page.tsx` | mount triptych |
| `src/modules/dashboard/lib/bao-cao-tong-hop-core.ts` (+ `.spec.ts`) | `shouldFetchSource` VST→GSC |
| `src/modules/giam-sat-hub/views/GiamSatHubPage.tsx` | khối 3 lối Vệ sinh tay |
| `src/modules/quan-tri-he-thong/bang-kiem/actions/bang-kiem-read.actions.ts` | filter WHO khỏi picker |
| `src/modules/giam-sat-chung/views/GscFormView.tsx` | defense-in-depth WHO filter |
| `src/modules/giam-sat-chung/lib/gsc-form-template-sync.ts` | comment SSOT |
| `docs/modules/giam-sat/13-VE-SINH-TAY-hub.md` | neo hub 3 mẫu |
| `docs/modules/_audit/_audit-soft-gsc-l01-l02-2026-09-28.md` | This audit |
| `docs/modules/_audit/_audit-full-debt-overlap-2026-09-27.md` | Soft Soft-queue beat |

---

## Verify

- `npx tsc --noEmit` — pass
- vitest focused: `supervision-policy` · `ve-sinh-tay-catalog` · `ve-sinh-tay-kpi` · `bao-cao-tong-hop-core` · `giam-sat-write-dest` — **36 passed**

---

## UAT (local)

### L01
1. Đăng nhập NV biên chế Khoa KSNK · chọn khoa được GS = khoa KSNK (cùng khoa) → header hình thức = **Giám sát chuyên trách** (không Tự giám sát).
2. Cùng user · khoa khác → chuyên trách.
3. User mạng lưới / NV khoa A · giám sát khoa A → **Tự giám sát**.
4. User khoa A · giám sát khoa B → **Giám sát chéo**.
5. Sau Lead apply RPC: BCTH/`thong-ke` gap `ty_le_tgs` / `ty_le_ksnk` / `do_lech` — phiên KSNK cùng khoa **không** vào mẫu TGS.

### L02
1. `/giam-sat` (quyền VST+GSC) → khối **Vệ sinh tay** 3 CTA: WHO · BM.07.02 · BM.07.03.
2. BM.02/03 mở `/giam-sat-chung/tuan-thu?bk=…` preselect đúng mẫu; picker GSC **không** có BM.07.01/WHO.
3. «Giám sát tuân thủ» (khác) vẫn mở catalog GSC chuyên đề khác.
4. `/bao-cao-tong-hop` section Vệ sinh tay → **3 KPI cạnh nhau** (N/A nếu chưa có phiên); không một % «VST tổng».
5. Filter chuyên đề VST vẫn tải đủ WHO + row BK BM.07.02/03.

---

## Domain ask

| # | Ask | Status |
|---|-----|--------|
| 1 | L01 override HT? | **Closed Lock A** — Không (PO bỏ qua widget 14) |
| 2 | L02 3 chỉ số tách vs 1 % gộp? | **Closed** — 3 tách (PO 18:51) |
| — | GSC-L03 seed BK · residual PO risk_tier / Module B route / ẩn danh NV | **Park** — ngoài lát này |
| — | Historical phiên KSNK gắn sai HT trước Soft | **Risk** file 14 — backfill optional Lead; RPC draft sửa lens aggregate |

---

## Cloud / Lead

| | |
|--|--|
| Soft local | **Done** FE + vitest + draft migrate L01 RPC |
| Cloud needed | **Yes — apply** `20260928032000_gsc_l01_fn_session_stype_ksnk_lock_a.sql` after Nghĩa confirm (Soft không apply) |
| Prior drafts still await | QLCV cho_toi · checklist post-Wave3 · CSSD used_clinically · ledger ensure-chi_tiet |

---

## Soft Soft-queue next (after this)

**CSSD-L01…L05 verify** (scan-only đóng gói · soft-warn off · SC picker whitelist · heat-split · CAP_PHAT hard-block SC TK) → then QLCV-L01/L02 verify.
