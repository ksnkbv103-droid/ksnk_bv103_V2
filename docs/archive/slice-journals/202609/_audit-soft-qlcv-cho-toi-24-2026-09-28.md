# Soft audit — QLCV «Chờ tôi» actor lens 24=A — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `cursor/me-sync-recall-print` @ `244ef21`+ |
| Neo | Domain `24-QLCV-CHO-TOI-GATE-AB-20260928.md` **A** (Nghĩa approved) · backlog QLCV-L03 |
| Không | invent · commit/push/PR · Vercel · prod migrate · đụng WT khác (NKBV RIT/age-null/Transfer · CSSD used/mẻ/ensure-chi_tiet) · Q-14 · AB-2 duyệt-cuối · đổi 7 TT |

---

## DoD Soft — status

| # | DoD | Soft | Evidence |
|---|-----|------|----------|
| 1 | RPC/`cho_toi` + FE `isQlcvChoToiDuyet` lọc PT ∨ PH ∨ giao | **DONE Soft-local** | FE `qlcv-board-filter.ts`; draft mig `20260928025300_qlcv_cho_toi_actor_lens.sql` |
| 2 | Chip «Chờ tôi» không hiện open global không dính actor | **DONE Soft-local** | GateStats fallback + filter `GATE_CHO_TOI` cần actor; RPC cho_toi=0 khi null actor |
| 3 | Spec: chỉ PH → thấy; ngoài ba vai → 0; không đụng Q-14/AB-2 | **DONE** | `qlcv-board-filter.spec.ts` Domain 24=A cases |
| 4 | Không đổi semantic 7 TT | **OK** | Chỉ gate filter + RPC count predicate |

---

## Behavior

| Trước (global) | Sau (Domain A) |
|----------------|----------------|
| `isQlcvChoToiDuyet` = DE_XUAT ∨ CHO_NGHIEM_THU (mọi phiếu) | **và** actor ∈ `nguoi_phu_trach_id` ∨ `nguoi_phoi_hop_ids` ∨ `nguoi_giao_viec_id` |
| RPC `cho_toi` = count lane DE_XUAT\|CHO_DUYET global | Same lanes **∩** actor ba vai; null actor → 0 |
| Chip count có thể lừa NV (open work unrelated) | Chip chỉ việc liên quan tôi (RACI mỏng 19) |

**Không** đổi: `my_tasks` / in_progress / overdue columns; Q-14 MVP strip; AB-2 cột duyệt cuối; 7 mã TT.

---

## Files (this slice only)

| Path | Change |
|------|--------|
| `docs/modules/qlcv/24-QLCV-CHO-TOI-GATE-AB-20260928.md` | Copied from Domain pack |
| `src/modules/quan-ly-cong-viec/lib/qlcv-board-filter.ts` | `isQlcvChoToiActor` + actor arg on `isQlcvChoToiDuyet` / `matchesQlcvBoardFilter` |
| `src/modules/quan-ly-cong-viec/lib/qlcv-board-filter.spec.ts` | PH-only / PT / giao / outsider / no-actor |
| `src/modules/quan-ly-cong-viec/components/QlcvGateStats.tsx` | Client fallback passes `actorStaffId` |
| `supabase/migrations/20260928025300_qlcv_cho_toi_actor_lens.sql` | Draft recreate `rpc_qlcv_board_counts` cho_toi actor lens — **chưa apply** |
| `docs/modules/_audit/_audit-soft-qlcv-cho-toi-24-2026-09-28.md` | This audit |
| `docs/modules/_audit/_audit-full-debt-overlap-2026-09-27.md` | Soft Soft-queue beat |

---

## UAT (local / after Lead apply RPC)

1. Đăng nhập NV **chỉ** trong `nguoi_phoi_hop_ids` của phiếu CHO_DUYET → chip «Chờ tôi» ≥ 1; lọc GATE_CHO_TOI thấy phiếu đó.
2. NV **không** thuộc PT/PH/giao trên mọi phiếu DE_XUAT/CHO_DUYET → chip = 0.
3. Phiếu DANG_LAM (dù PT = me) **không** vào «Chờ tôi».
4. Sau apply migrate: `rpc_qlcv_board_counts(me)` `gates.cho_toi` khớp FE fallback trên cùng dataset.
5. Regression: 7 TT labels/transitions unchanged; Q-14 MVP strip unchanged; không cột duyệt cuối mới.

---

## Domain ask

| # | Ask | Status |
|---|-----|--------|
| 1 | Gate «Chờ tôi» rename vs actor filter? | **Closed A** — actor lens (PT∨PH∨giao) |
| — | Q-14 kỳ RPC / AB-2 duyệt cuối / NGHIEM_THU SQL DINH_KY | **Still park** — ngoài lát 24 |

---

## Cloud / Lead

| | |
|--|--|
| Soft local | **Done** FE + vitest + draft migrate |
| Cloud needed | **Yes — apply** `20260928025300_qlcv_cho_toi_actor_lens.sql` on prod after Nghĩa confirm (Soft không apply) |
| Prior draft still await | `20260928021700_qlcv_checklist_rpc_post_wave3.sql` |

---

## Soft Soft-queue next (after this)

**NKBV SSI deepest 20d** (Domain A) → then MBI/APRV · Soft-ready GSC/CSSD/QLCV verify.
