# Audit Soft — QLCV **logic** deep dive — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 (Asia/Saigon) |
| Máy | Nghĩa Mac · `6bad1c57-5c17-4e62-b661-16f3bab10f88` |
| Repo | `/Users/drnghia/Desktop/ksnk_bv103` · tip start `d05275b` |
| Branch | `cursor/me-sync-recall-print` |
| Origin | `https://github.com/ksnkbv103-droid/ksnk_bv103_V2` |
| Neo Domain | `19-QLCV-DOMAIN-SSOT.md` · `19b`/`19c`/`19d` · Wave3 W4 DONE · W6 DONE |
| Phạm vi | **Logic lifecycle / counts / RBAC / dual-path** — NOT IA/copy |
| Không | push / PR / Cloud apply / Vercel / apply migrate (draft local OK) |

---

## 0. Why prior Soft QLCV audits felt shallow

Prior `_audit-qlcv-cssd-me` / cascade / W6 covered **doors, priority polish, spawn→refresh**. They asserted Wave3 FE hardcode + gate RPC wired without walking **decision tree tip-vs-19**, without file:line mismatch on **post-Wave3 checklist RPC**, and without golden close/progress paths. **This pass is logic-first** against Domain §3–§6 + 19c TAC-3A.

---

## 1. Lifecycle decision tree (tip runtime)

```
CREATE (chỉ huy)     → insert fact · resolveQlcvTrangThaiMaForTask
                       (active+assignee/to → DANG_LAM else MOI)
ĐỀ XUẤT              → is_active=false + MOI · lane ảo
PHE_DUYET_DEXUAT     → fn_qlcv_transition · is_active=true · TT từ patch
PROGRESS checklist/% → trangThaiCongViecSauBaoCaoTienDo
                       DINH_KY@100 → HOAN_THANH
                       DOT_XUAT/KHAN@100 → CHO_DUYET
                       >0 → DANG_LAM
NGHIEM_THU           → fn_qlcv_transition · validateQlcvCloseRequiresResult
TU_CHOI_NGHIEM_THU   → TU_CHOI (+ giữ %)
HUY                  → DA_HUY
CRON quá hạn         → QUA_HAN (mã) + view is_qua_han (cờ) — cùng ý «đang làm quá hạn»
```

**Lane Kanban:** `getBoardLaneId` — DA_HUY · HOAN_THANH · DE_XUAT · CHO_DUYET (via `isEligibleForNghiemThu`) · else DANG_LAM. Quá hạn = **nhãn**, không cột riêng (khớp 19 §3).

---

## 2. Tip vs Domain locks — mismatch table

| # | Lock (19 / 19c) | Tip actual | Path | Severity | Disposition |
|---|-----------------|------------|------|----------|-------------|
| 1 | Q-08 / progress→TT: checklist RPC không được phụ thuộc dm | `fn_qlcv_update_checklist` (mig `20260607100000`) vẫn `SELECT … FROM qlcv_dm_trang_thai_cong_viec WHERE is_active` — Wave3 **DROP view** + soft-deactivate lookup | `supabase/migrations/20260607100000…:105–110` · Wave3 `20260926053300` | **P0** | **FIXED Soft FE** (status via transition; checklist RPC `trangThaiMa=null`) + **draft migrate** `20260928021700_qlcv_checklist_rpc_post_wave3.sql` (Nghĩa/W4 apply) |
| 2 | Q-08 hủy qua transition typed | `huyKhiChoNghiemThuKhongDat` dùng `SET_TRANG_THAI` → DA_HUY | `cong-viec-write.actions.ts` (pre) | **P1 Soft** | **FIXED Soft** → action `HUY` |
| 3 | TAC-3A đóng cần kết quả / checklist 100% | Nghiệm thu FE+BE OK; DINH_KY auto-close viết nhat_ky HOAN_THANH (đủ extract «Kết quả» trên detail) | `close-requires-result.ts` · `cong-viec-checklist.actions.ts` | OK Soft | Keep |
| 4 | Q-14 báo cáo kỳ người–việc–đúng hạn | Có `bao-cao-ky` + MVP strip từ **board slice**; RPC gates không có tong/% HT | `qlcv-mvp-stats.ts` · `QlcvGateStats.tsx` | **P1 Domain** | Park — mở rộng RPC hoặc kỳ SSOT |
| 5 | Gate «Chờ tôi» = việc chờ actor duyệt? | Domain **24=A** actor lens (PT∨PH∨giao) — Soft DONE Soft-local | `qlcv-board-filter` · draft `20260928025300_qlcv_cho_toi_actor_lens.sql` | **DONE Soft** | See `_audit-soft-qlcv-cho-toi-24-2026-09-28.md` |
| 6 | AB-2 người duyệt từ nhat_ky | Detail extract kết quả OK; **không** cột/list «duyệt cuối» riêng | `CongViecDetail.extractQlcvCloseResultText` · table columns | **P1 Domain** | Park (AB-2A) |
| 7 | Q-01 KSNK-only assignee | `validateAssigneeForQlcv` + `ensureQlcvKsnkAccess` trên create/update/import | `qlcv-ksnk-server` · action-guard | OK Soft | Keep |
| 8 | Assignee không CRUD metadata đã giao | FE+`updateCongViec` chặn; checklist/progress **cho** assignee | `qlcv-access.ts` · checklist.actions | OK Soft | Keep |
| 9 | Admin `updateCongViec` có thể ghi `trang_thai` thẳng fact | Bypass Q-08 khi `hasRBACAdminSupervisionBypass` | `cong-viec.actions.ts:503–505` | **P2 Soft** | Park (admin escape) — không mở rộng |
| 10 | Silent default loai | `normalizeQlcvDmFields` empty loai → `DOT_XUAT` | `qlcv-persist-dm-fields.ts:16` | **P2 Soft** | Park — form đã chọn loai |
| 11 | `fn_qlcv_transition` NGHIEM_THU không chặn DINH_KY | FE `xacNhanHoanThanh` chặn; RPC trần | mig phase2 transition | **P1 Domain** | Park — harden RPC khi W4 |
| 12 | Counts: board list cap vs RPC global | Board fetch ≤500×20; gates RPC global SSOT; MVP từ slice đã tải | `qlcv-query-limits.ts` · GateStats | **P2 Soft** | Documented; OK khi volume thấp |
| 13 | Nhiệm vụ rollup | `rpc_qlcv_nhiem_vu_rollup` live; nhiem-vu.actions tự aggregate view | `nhiem-vu.actions.ts` | **P2 Soft** | Park dual aggregate (cùng view) |
| 14 | Wave3 view CASE labels | Prod applied Soft W4; FE `qlcv-labels` SSOT | Wave3 SQL · labels.ts | OK | Keep |

---

## 3. Dual paths / silent defaults / FE vs actions

| Path | Role | Drift risk |
|------|------|------------|
| `fn_qlcv_transition` | Nghiệm thu / từ chối / đề xuất / HUY / SET | SSOT cổng |
| `fn_qlcv_update_checklist` | Checklist + % (+ optional TT) | **Was** dual TT writer + **broken** dm validate — Soft FE stops TT via this RPC |
| `updateCongViec` fact UPDATE | Metadata; admin may set TT | Soft non-admin blocked |
| MOI→DANG_LAM on assign | Direct fact when active MOI + assignee | Soft park P2 (no transition nhat_ky status) |
| GateStats RPC vs client fallback | Prefer RPC; fallback = loaded slice | OK |
| MVP stats | Client-only from list prop | Not global — Domain Q-14 |

Silent defaults: empty `trang_thai`→`MOI`; empty loai→`DOT_XUAT`; `muc_do_uu_tien` create→`TRUNG_BINH`.

---

## 4. Soft fixes applied (this pass)

| ID | Change | Files |
|----|--------|-------|
| P0 | Progress: checklist/% **không** gửi `p_trang_thai_ma`; status qua `fn_qlcv_transition` SET | `actions/cong-viec-checklist.actions.ts` |
| P1 | Hủy → action `HUY` | `actions/cong-viec-write.actions.ts` |
| Draft | Recreate `fn_qlcv_update_checklist` validate 7 canonical (no dm) | `supabase/migrations/20260928021700_qlcv_checklist_rpc_post_wave3.sql` **local only — chưa apply** |

---

## 5. Domain asks (do NOT Soft fan-out)

1. **Gate «Chờ tôi»:** **CLOSED Domain 24=A** — actor lens PT∨PH∨giao (Soft Soft-local; RPC draft await Lead).
2. **AB-2:** có cần cột/list «Người duyệt cuối» derive nhat_ky trên Điều hành không (P1)?
3. **Q-14:** MVP tong/% từ board slice đủ tạm, hay bắt buộc RPC kỳ (tuần/tháng) trước Soft FE thêm?
4. **NGHIEM_THU RPC:** có chặn `loai=DINH_KY` trong SQL khi W4 harden không?

---

## 6. Cloud next?

| | |
|--|--|
| Soft local | **Done** FE P0/P1 thin (2 action files) |
| Cloud **needed** | **Yes — apply draft migrate + smoke** (Soft không apply). Optional: Domain-locked cho_toi filter / RPC MVP nếu Domain chọn A |
| Whitelist | xem `/tmp/cloud-qlcv-deep-dod.md` + §7 |
| Prefer Soft-first | FE unblocks progress **nếu** RPC còn tồn tại (chỉ fail khi truyền TT). Nếu Wave3 CASCADE **drop** function → **bắt buộc** apply draft trước UAT |

---

## 7. Cloud DoD + whitelist (parent launch)

**Whitelist (exact):**
- `supabase/migrations/20260928021700_qlcv_checklist_rpc_post_wave3.sql` (apply prod `cvzwslpxwgqiugzzhqej` only if Nghĩa confirms)
- Optional follow (Domain lock first): `supabase/migrations/20260909030202_qlcv_perf_batch12_rpcs.sql` recreate cho_toi semantics — **không** tự làm

**DoD bullets:**
1. Apply draft → `\df fn_qlcv_update_checklist` exists; body **không** reference `qlcv_dm_*`
2. Smoke: tick checklist 0→50% → `DANG_LAM`; DOT_XUAT 100% → `CHO_DUYET`; DINH_KY checklist 100% → `HOAN_THANH` + nhat_ky
3. Smoke: nghiệm thu cần ketQua hoặc checklist 100%; DINH_KY không nghiệm thu
4. Smoke: hủy phiếu mở → `DA_HUY` via HUY
5. GateStats RPC chips refetch sau mutate; Kanban lane khớp
6. **No** push/PR/Vercel từ Cloud trừ Nghĩa lệnh

---

## 8. UAT checklist (Nghĩa)

- [ ] Tạo việc DOT_XUAT → Kanban Đang làm + Gate «Của tôi» nếu là phụ trách
- [ ] Tick checklist → % + TT đổi **không** lỗi dm
- [ ] DOT_XUAT 100% → Chờ nghiệm thu → ghi kết quả → HOAN_THANH
- [ ] DINH_KY tick đủ → tự HOAN_THANH; detail hiện kết quả từ nhat_ky
- [ ] Spawn định kỳ → refreshAll (C1 prior) thấy phiếu mới
- [ ] Hủy khi chờ NT → DA_HUY
- [ ] Assignee không sửa metadata; vẫn tick checklist
- [ ] Tab Báo cáo kỳ mở lại sau CRUD khớp (slice)

---

## 9. Soft Soft-queue

**QLCV logic Soft:** P0 FE + P1 HUY **DONE**; draft migrate **park Nghĩa/W4/Cloud apply**; Domain park §5.

*Dirty WT pre-existing (`AGENTS.md`, scripts, qlcv proposal) — để yên.*
