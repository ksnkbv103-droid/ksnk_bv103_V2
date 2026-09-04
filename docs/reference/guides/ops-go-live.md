# Ops go-live — runbook tay (Phase 3)

> **Cập nhật:** 2026-09-04 · Doc + checklist only (không bật deploy; không apply migration linked/prod).  
> **SSOT:** [`operations-sop.md`](../../core/operations-sop.md) · [`pilot-core-modules-go-live.md`](../../core/pilot-core-modules-go-live.md) · [`pilot-go-live-signoff-202606.md`](../../core/pilot-go-live-signoff-202606.md) · [`auth-pilot-link-sop.md`](auth-pilot-link-sop.md) · quyết định dụng cụ [`domain-decisions-cssd-instrument.md`](../../core/domain-decisions-cssd-instrument.md) (D5–D6 BOM).

---

## 0. Guardrails (NGHIÊM CẤM tự ý)

| Hạng mục | Trạng thái bắt buộc |
|----------|---------------------|
| `vercel.json` → `git.deploymentEnabled` | **`false`** — go-live tay; **không** đổi thành `true` trừ khi PO/IT chốt sau checklist này |
| Git commit / push | Chỉ sau **user approve commit** (xem §1) |
| Migration linked / prod | **Không** apply trong đợt Phase 0–2 CSSD instrument đến khi §1 + §5 pass |
| Vercel auto-deploy từ git | Tắt nhờ `deploymentEnabled: false` |

Xác nhận nhanh:

```bash
cat vercel.json   # phải thấy "deploymentEnabled": false
```

---

## 1. Mở cloud — chỉ sau Phase 0–2 CSSD instrument

**Mở cloud (linked mdm:migrate / staging deploy / prod wave) chỉ khi đủ:**

1. **Phase 0–2 CSSD instrument** xong (quyết định D1–D10 + code/local verify theo [`domain-decisions-cssd-instrument.md`](../../core/domain-decisions-cssd-instrument.md)).
2. **`npm run local:golden:verify`** pass (sau `local:golden:reset` nếu vừa reset DB).
3. **User approve commit** (PO/chủ repo đồng ý đưa lên git — agent **không** tự commit/push).

Trước đó: chỉ local Docker + doc/checklist.

---

## 2. Runbook go-live tay (env · gate · wave)

### 2.1 Env flag theo wave

| Wave | `KSNK_PILOT_CORE_MODULES` | Module mở |
|------|---------------------------|-----------|
| **W1** | `=1` | MDM + GSC/VST + QLCV (CSSD **ẩn** / 404) |
| **W2 — UAT CSSD** | **tắt** (xoá hoặc không set) | + CSSD — bắt buộc trước UAT CSSD (xem §3) |
| **W3** | tắt | + NKBV, Dashboard (sau UAT) |

Chi tiết wave: [`pilot-core-modules-go-live.md`](../../core/pilot-core-modules-go-live.md).

### 2.2 Automated gate

```bash
# Local (Docker)
npm run pilot:go-live:gate:local

# Linked staging (chỉ sau §1)
npm run pilot:go-live:gate
```

Gate gồm `trial:db:precheck` + **`trial:auth:precheck`** + verify engineering/CSSD + smoke. Bảng ký: [`pilot-go-live-signoff-202606.md`](../../core/pilot-go-live-signoff-202606.md) §A–§F.

### 2.3 Deploy tay (nhắc — không thực thi trong Phase 3 doc)

1. Giữ `deploymentEnabled: false` → deploy Vercel **thủ công** khi PO chốt (CLI/UI), không auto từ push.
2. Env trên Vercel khớp wave (§2.1).
3. Schema remote: `mdm:migrate` **chỉ** khi đã §1 + §5 (BOM) + PO duyệt.

---

## 3. Checklist trước UAT CSSD

| # | Hạng mục | Pass khi | ☐ |
|---|----------|----------|---|
| 3.1 | **Tắt** `KSNK_PILOT_CORE_MODULES` (hoặc không set) trên môi trường UAT | Sidebar + route `/cssd-*` **không** bị ẩn/404 | ☐ |
| 3.2 | Xác nhận CSSD không bị ẩn bởi flag pilot-4 / proxy | Vào được quy trình / dụng cụ / sự cố theo quyền | ☐ |
| 3.3 | Checklist tay CSSD P3–P5 | ≥5/6 mỗi file pilot CSSD (xem sign-off §B) | ☐ |

> Nếu để `KSNK_PILOT_CORE_MODULES=1`, UAT CSSD **fail giả** (module bị ẩn) — luôn tắt flag trước UAT.

---

## 4. Blocker — `trial:auth:precheck` / link Auth NV

| # | Hạng mục | Pass khi | ☐ |
|---|----------|----------|---|
| 4.1 | `npm run trial:auth:precheck` (hoặc `:local`) | `mdm_email_no_auth` = **0** cho NV pilot | ☐ |
| 4.2 | Link Auth ↔ `mdm_nhan_su` theo [`auth-pilot-link-sop.md`](auth-pilot-link-sop.md) | User pilot đăng nhập được, đúng role | ☐ |

**Đây là blocker go-live / UAT** — không bỏ qua dù gate khác xanh.

---

## 5. Checklist go-live BOM unique (D6)

Luật: BOM **1 bộ × 1 loại** active — [`domain-decisions-cssd-instrument.md`](../../core/domain-decisions-cssd-instrument.md) **D6**. Migration draft:

`supabase/migrations/20260904120000_cssd_bom_chi_tiet_unique_bo_loai_active.sql`

| # | Bước | Ghi chú | ☐ |
|---|------|---------|---|
| 5.1 | **ADMIN** gộp dòng trùng loại trên từng bộ (UI «Gộp dòng trùng loại» / `mergeDuplicateBomLinesAction`) | Preview SQL trong file migration trả **0** dòng trùng | ☐ |
| 5.2 | Apply migration `20260904120000_…` trên môi trường đích | **Chỉ sau** 5.1; **không** apply linked/prod nếu chưa PO duyệt | ☐ |
| 5.3 | Smoke: thêm dòng BOM / `THEM_DONG` không tạo trùng active | Coalesce qua `findActiveBomLine` | ☐ |

---

## 6. Tóm tắt thứ tự an toàn

```
Phase 0–2 CSSD instrument (local)
  → local:golden:verify
  → user approve commit
  → (tuỳ chọn) commit/push — vẫn deploymentEnabled: false
  → tắt KSNK_PILOT_CORE_MODULES trước UAT CSSD
  → trial:auth:precheck = 0 (blocker)
  → ADMIN gộp BOM trùng → apply 20260904120000… (khi PO duyệt cloud)
  → (tuỳ) apply 20260904140000 RLS write quy_trinh/lo — xem §7 (khi PO duyệt)
  → pilot:go-live:gate (+ ký sign-off)
  → mở cloud / wave W2+
```

Migration head / đếm file: **xem** `ls supabase/migrations/*.sql | wc -l` + ngày — SOP §2.1.1 (không tin số cũ ~87).

---

## 7. Checklist RLS write DRAFT — `quy_trinh` / `lo_tiet_khuan`

ADR: [`adr-cssd-fact-write-rls.md`](../../core/adr-cssd-fact-write-rls.md). Migration DRAFT: `supabase/migrations/20260904140000_cssd_fact_quy_trinh_lo_write_rls.sql`.

Quyết định: **thêm RLS write scoped** (khớp `lifecycle_event` / `su_co` / `bao_tri`); app **giữ** `createAdminSupabaseClient` sau `verifyPermission`.

| # | Bước | Ghi chú | ☐ |
|---|------|---------|---|
| 7.1 | Review ADR + SQL DRAFT (permission matrix) | Không đổi runtime admin path | ☐ |
| 7.2 | Apply **local Docker only** | `supabase db reset` / migrate local — **không** linked/prod | ☐ |
| 7.3 | Smoke: workflow scan + mẻ tiệt khuẩn + recall sự cố | Admin client ghi OK như cũ | ☐ |
| 7.4 | (Tuỳ) User JWT thiếu quyền → ghi bị RLS chặn | Defense-in-depth | ☐ |
| 7.5 | PO duyệt rồi mới apply cloud | Cùng gate §1 (user approve commit + không tự apply prod) | ☐ |
