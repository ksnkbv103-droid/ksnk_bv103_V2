# Audit Soft — QLCV-L01 + L02 verify vs Domain backlog — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 ~03:29 ICT (Asia/Saigon) |
| Vai trò | Soft · Delivery Lead |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip `244ef21` · `cursor/me-sync-recall-print` |
| Neo Domain | `21-BACKLOG` § QLCV-L01/L02 · `19d` gói A · Soft deep `_audit-soft-qlcv-logic-deep` · W6 `1ed73c2` · checklist FE `50898ff` |
| Phạm vi | **Verify only** Soft Soft-queue-ready L01+L02 · Soft Soft-queue-safe thin fix nếu gap |
| Không | invent · commit/push/PR · prod migrate · Vercel · QLCV-L03 · Q-14 · AB-2 · NGHIEM_THU DINH_KY · đụng WT Chờ tôi 24 FE + draft migrates khác |

---

## 0. Verdict

| ID | Status | Soft Soft-queue |
|----|--------|-----------------|
| **QLCV-L01** | **PASS** | Closed Soft Soft-queue — tip khớp 19d gói A; residual UAT only |
| **QLCV-L02** | **PASS** (tip FE+RPC Soft Soft-queue) | Closed Soft Soft-queue — FE null-TT + transition tip OK; migrate recreate on tip; **residual Lead** apply `20260928021700` + §7 smoke nếu chưa prod |

**Code change this beat:** none → no tsc / focused tests.

**WT left alone:** `QlcvGateStats` / `qlcv-board-filter` (Chờ tôi 24) · draft `20260928025300_qlcv_cho_toi_*` · CSSD/GSC/NKBV Soft-local · other uncommitted.

---

## 1. QLCV-L01 · 19d gói A (verify + residual)

### DoD checklist (Domain 21 + 19d L-01…L-04 / L-AB1–3A)

| # | Requirement | Tip evidence | Ok? |
|---|-------------|--------------|-----|
| 1 | Ưu tiên nổi CAO/TB/THAP · default TB | `CongViecForm` label «Mức độ ưu tiên» + `<select name="muc_do_uu_tien" defaultValue=TRUNG_BINH>` (tip `5a447e1`+`1ed73c2`) | ✅ |
| 2 | Không chọn Đột xuất/Khẩn trên form tạo | Hidden `loai_cong_viec`; `resolvedLoai` = DINH_KY nếu spawn mẫu · KHAN_CAP chỉ edit legacy · else **DOT_XUAT** | ✅ |
| 3 | Thường = `DOT_XUAT`; `DINH_KY` chỉ từ mẫu | Comment + resolver trên form; `DeXuatForm` hidden DOT_XUAT + ưu tiên nổi | ✅ |
| 4 | Ẩn/gỡ `QlcvDmAdminLinks` | `grep QlcvDmAdminLinks` **0 hits** tip; hub không link LOAI/TT admin (`5a447e1` / wave1) | ✅ |
| 5 | Không CRUD LOAI/TT từ hub | `LOCKED_SYSTEM_LOOKUP_LOAI` includes `LOAI_CONG_VIEC` + `TRANG_THAI_CONG_VIEC`; MDM `generic-dm.actions` / import / hub jobs gate | ✅ |
| 6 | Giữ gói A 19b/19c | Không đụng close-result / assignee-first / 7 TT / stats MVP trong beat này | ✅ |
| 7 | Không migration phá `KHAN_CAP` legacy | W6 filter chỉ «Đột xuất» (bỏ «/ khẩn»); legacy label «Cao · legacy» trên mẫu; KHAN_CAP giữ trên type union | ✅ |

### Commits neo Soft Soft-queue

- `5a447e1` feat(qlcv): 19d A — priority on create, hide DM admin links, no KHAN type pick  
- `1ed73c2` fix(qlcv): Soft W6 — type-vs-priority closed (19d A + thin polish)  
- Wave3 DROP dm views **DONE prod** Soft W4 (`e2848ed` / `20260927171305`)

### Residual Soft Soft-queue (L01)

| Residual | Owner |
|----------|-------|
| UAT form: tạo tay → DOT_XUAT + ưu tiên TB; spawn định kỳ → DINH_KY; không thấy link Quản trị LOAI/TT trên hub | Nghĩa UAT |
| Không Soft Soft-queue-safe code gap | Soft Soft — **PASS / stop** |

**Disposition: PASS** — no thin fix.

---

## 2. QLCV-L02 · Checklist RPC post-Wave3

### DoD checklist

| # | Requirement | Tip evidence | Ok? |
|---|-------------|--------------|-----|
| 1 | FE progress không phụ thuộc `qlcv_dm_*` | `cong-viec-checklist.actions.ts`: `trangThaiMa: null` rồi `updateCongViecTrangThaiByMa` → `fn_qlcv_transition` (`50898ff`) | ✅ |
| 2 | Draft RPC không đọc `qlcv_dm_*`; validate 7 TT canonical | `supabase/migrations/20260928021700_qlcv_checklist_rpc_post_wave3.sql` on tip — ARRAY MOI…DA_HUY; body **no** `FROM qlcv_dm_*` | ✅ tip file |
| 3 | Progress TT qua transition | Soft Soft P0 path + HUY action tip | ✅ |
| 4 | Acceptance smoke Soft deep §7 | Soft Soft **không** apply prod / không live SQL trong beat verify | ⏸ Lead |

### Soft Soft-queue vs Lead residual

| Layer | Status |
|-------|--------|
| Soft Soft FE tip Soft Soft-queue-ready | **PASS** — đã commit `50898ff`; null-TT unblocks progress khi RPC còn tồn tại |
| Tip migrate recreate Soft Soft-queue | **PASS file** — committed tip (không phải uncommitted draft khác) |
| Prod apply `20260928021700` | **Residual Lead / Nghĩa** — Soft deep §4/§6 ghi «chưa apply»; Soft Soft **không** apply (mandate). Wave3 DROP đã prod; recreate checklist RPC = follow-on |
| Live smoke 0→50% / DOT@100 / DINH_KY@100 | **Residual Lead** sau apply |

**Disposition: PASS** Soft Soft-queue tip verify. Không Soft Soft-queue-safe thin fix (FE đã đúng). Không invent apply.

---

## 3. Out of scope (explicit)

- **QLCV-L03** Chờ tôi — Domain 24 DONE Soft-local WT; **leave alone**  
- **Q-14** / **AB-2** / **NGHIEM_THU SQL chặn DINH_KY** — Domain park (L04–L06); Soft Soft không fan-out  
- Quy trình deep — skipped (prefer stop after QLCV verify)

---

## 4. Soft Soft-queue beat

**QLCV-L01/L02 verify → DONE Soft Soft-queue 2026-09-28.** Soft Soft-queue Soft Soft-queue-ready **empty** overnight.

**Overnight Soft Soft-queue status for Lead (idle):**

| Bucket | State |
|--------|-------|
| Soft Soft Soft Soft-queue-ready | **Empty** — L01/L02 PASS verify; prior Soft Soft-local (NKBV 20a–f · GSC L01/L02 · CSSD L01–L05/L06/L07 · cho_toi 24 · ledger deep) await Nghĩa **commit** |
| Await Nghĩa commit / apply | Soft Soft-local uncommitted WT (NKBV/GSC/CSSD/cho_toi FE) · draft migrates: cho_toi · used_clinically · ledger ensure · GSC L01 RPC · **checklist post-Wave3** (tip file; prod apply) |
| Await Domain | CSSD-L04 `parent_bo_id` schema · L08 so_luong/THEM_DONG · Q-14/AB-2/NGHIEM_THU DINH_KY park |
| Soft Soft next | **Idle** until Nghĩa commit/apply or Domain L04 schema — **no** Soft Soft-queue-ready fan-out |

---

## 5. Domain ask

Không Soft Soft invent mới. Lead/Domain:

1. Confirm prod đã/`chưa` apply `20260928021700_qlcv_checklist_rpc_post_wave3.sql` → nếu chưa: authorize W4/Cloud apply + smoke Soft deep §7.  
2. UAT L01 gói A (ưu tiên nổi · không loại Khẩn · không CRUD LOAI/TT).  
3. Giữ park L04–L06 (Q-14 · AB-2 · NGHIEM_THU DINH_KY) đến khi Domain tick.

---

## 6. Files touched this beat

| File | Action |
|------|--------|
| `docs/modules/_audit/_audit-soft-qlcv-l01-l02-verify-2026-09-28.md` | **CREATE** (this) |
| `docs/modules/_audit/_audit-full-debt-overlap-2026-09-27.md` | Soft Soft-queue beat update |

No `src/` / migrate edits.
