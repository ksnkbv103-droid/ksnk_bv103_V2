# Domain audit 2026-06-10

Bảy pha cùng ngày, mỗi pha một phần. Phase 6 là pha cuối.

## Phase 6

# Phase 6 — Go-live closure (2026-06-10)

> Tiếp theo [domain-audit-20260610.md#phase-5](./domain-audit-20260610.md#phase-5)

## Đã triển khai

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| 6.1 | Sign-off tổng hợp | **Done** | [`pilot-go-live-signoff-202606.md`](../../core/pilot-go-live-signoff-202606.md) |
| 6.2 | Auth + flag strategy | **Done** | [`auth-pilot-link-sop.md`](../../reference/guides/auth-pilot-link-sop.md), wave §C sign-off |
| 6.3 | BRD vật tư migration | **Deferred** | Intake chưa đóng |
| 6.4 | In nhãn cycle QR sau BOM | **Done** | `BomChecklistModal` + `usePrint`; `persistBomCheckpoint` trả `ma_cycle_qr` |
| 6.5 | HIS/LIS spike | **Done (research)** | [`his-lis-integration-spike-20260610.md`](./his-lis-integration-spike-20260610.md) |

### Automated gate

```bash
npm run pilot:go-live:gate          # linked
npm run pilot:go-live:gate:local    # local docker
```

Chuỗi: `trial:db:precheck` + `trial:auth:precheck` + `verify:engineering` + `verify:cssd` + `test:pilot` + `smoke:gsc-vst` + checklist reminder script.

Production ship (migrate + build): `npm run pilot:ship`

---

## Còn cần người (go-live thật)

1. Ký §B tất checklist trong sign-off doc
2. `mdm_email_no_auth` = 0 ([`auth-pilot-link-sop.md`](../../reference/guides/auth-pilot-link-sop.md))
3. Chọn wave W1/W2/W3 và set env production
4. §E chữ ký Trưởng KSNK + IT + BV103

---

## Domain audit — tóm tắt chuỗi Phase 0→6

| Phase | Trọng tâm |
|-------|-----------|
| 0 | Gates, rubric, gap register |
| 1 | Pilot core GSC/VST hardening |
| 2 | Dashboard VST RPC perf |
| 3 | CSSD workflow + ledger Q2 |
| 4 | Hóa chất / thiết bị + layout SubNav |
| 5 | Cycle QR + NKBV coverage audit |
| 6 | Go-live sign-off + gate script |

**Không còn phase code bắt buộc** trước W1 — chỉ manual sign-off và ops.

## Phase 5

# Phase 5 — Cycle QR + NKBV audit (2026-06-10)

> Tiếp theo [domain-audit-20260610.md#phase-4](./domain-audit-20260610.md#phase-4)

## Đã triển khai

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| 5.1 | Cycle QR additive | **Done** | `20260610100000_cssd_cycle_qr_additive.sql`, `cssd-workflow-resolve.ts` |
| 5.2 | NKBV clinical coverage audit | **Done** | [`clinical-forms-coverage-audit-20260610.md`](../module-history/nkbv/clinical-forms-coverage-audit-20260610.md) |
| 5.3 | BRD vật tư → migration | **Deferred** | Intake chưa đóng ([`brd-vat-tu-intake-202606.md`](../module-history/cssd/brd-vat-tu-intake-202606.md)) |
| 5.4 | Batch T3 REPAIRING gate test | **Done** | `cssd-batch-create.spec.ts` |
| 5.5 | HIS/LIS | **Out of scope** | Ghi backlog N-G3 |

### Cycle QR (5.1)

- Cột `ma_cycle_qr`, `ma_qr_bo_vinh_vien` trên `cssd_fact_quy_trinh`.
- `fn_cssd_gen_cycle_qr`, `rpc_cssd_assign_cycle_qr` — gọi sau BOM checkpoint.
- `rpc_scan_workflow_station` + app resolve 3 cột QR (legacy song song).
- View `v_cssd_quy_trinh_full` expose 2 cột mới.
- NKBV trace ưu tiên `ma_cycle_qr`.

### Verify

```bash
npm run mdm:migrate:local   # hoặc mdm:migrate staging
npm run verify:cssd
npm run verify:engineering
npx vitest run src/modules/cssd-erp/shared/application/cssd-workflow-resolve.spec.ts
npx vitest run src/modules/cssd-erp/actions/cssd-batch-create.spec.ts
npx vitest run src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.spec.ts
```

Pilot tay Cycle QR: [`pilot-checklist-cycle-qr-202606.md`](../module-history/cssd/pilot-checklist-cycle-qr-202606.md)

---

## Còn cần người

| # | Việc |
|---|------|
| M1 | Ký C1–C6 cycle QR staging |
| M2 | Ký NKBV clinical UAT ≥4/5 |
| M3 | Workshop BRD vật tư V1–V5 |
| M4 | SOP in nhãn + fallback legacy QR |

---

## Phase 6 đề xuất (go-live closure)

| # | Việc |
|---|------|
| 6.1 | Tổng hợp sign-off tất checklist (MDM/GSC/VST/QLCV/CSSD/NKBV) |
| 6.2 | `trial:auth:precheck` = 0; pilot flag strategy production |
| 6.3 | BRD vật tư → migration (nếu intake đóng) |
| 6.4 | In nhãn cycle QR tích hợp `usePrint` (optional polish) |
| 6.5 | HIS/LIS integration spike (research only) |

---

## Blocker go-live tổng

1. Checklist tay tất module pilot ≥5/6
2. `mdm_email_no_auth` = 0
3. Cycle QR C1–C6 ≥5/6 (sau in nhãn SOP)

## Phase 4

# Phase 4 — Hóa chất / Thiết bị / Layout (2026-06-10)

> Tiếp theo [domain-audit-20260610.md#phase-3](./domain-audit-20260610.md#phase-3)

## Đã triển khai

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| 4.1 | Pilot checklist `/cssd-hoa-chat` | **Done** | [`pilot-checklist-hoa-chat-202606.md`](../module-history/cssd/pilot-checklist-hoa-chat-202606.md) |
| 4.2 | Pilot checklist `/cssd-thiet-bi` | **Done** | [`pilot-checklist-thiet-bi-202606.md`](../module-history/cssd/pilot-checklist-thiet-bi-202606.md) |
| 4.3 | BRD vật tư phi-hóa-chất (intake) | **Done (chờ workshop)** | [`brd-vat-tu-intake-202606.md`](../module-history/cssd/brd-vat-tu-intake-202606.md) |
| 4.4 | Layout unify — SubNav trên mọi `CSSDPageShell` | **Done** | `cssd-page-shell.tsx` → `CSSDSubNav` |
| 4.5 | Auth + mở CSSD dưới pilot flag | **Done (SOP)** | [`pilot-core-modules-go-live.md`](../../core/pilot-core-modules-go-live.md) § Phase 4.5 |

### Code / test

- `CSSDPageShell`: render `CSSDSubNav` (prop `hideSubNav` khi cần).
- `/cssd-thiet-bi`: bỏ link Mẻ trùng SubNav.
- `e2e/cssd-workflow.spec.ts`: shell hóa chất + thiết bị + SubNav.
- `assert-thiet-bi-cho-me-tiet-khuan.spec.ts`: +1 case `BROKEN`.

### Verify

```bash
npm run verify:cssd
npm run verify:engineering
npx vitest run src/modules/cssd-erp/helpers/assert-thiet-bi-cho-me-tiet-khuan.spec.ts
```

E2E (cred + CSSD routes mở):

```bash
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npm run test:e2e -- e2e/cssd-workflow.spec.ts
```

---

## Còn cần người (manual)

| # | Việc |
|---|------|
| M1 | Ký tay H1–H6 trên staging |
| M2 | Ký tay T1–T6 trên staging |
| M3 | Workshop BRD V1–V5 |
| M4 | `mdm_email_no_auth` → 0 |

**Exit Phase 4:** M1 + M2 ≥5/6 PASS; M3 có chữ ký (nếu mở rộng vật tư).

---

## Phase 5 đề xuất

| # | Việc | Priority |
|---|------|----------|
| 5.1 | Cycle QR (`ma_qr_vinh_vien` / `ma_qr_chu_trinh`) | P1 (sau CSSD P3 ≥5/6) |
| 5.2 | NKBV clinical forms coverage audit | P1 |
| 5.3 | BRD vật tư → migration (nếu intake đóng) | P2 |
| 5.4 | E2E end-to-end T3 (REPAIRING → batch fail) với data staging | P2 |
| 5.5 | HIS/LIS | Out of pilot |

---

## Blocker go-live tổng (cập nhật)

1. Pilot MDM/GSC/VST/QLCV (Phase 0–1)
2. Pilot CSSD quy trình P3 + hóa chất/thiết bị P4
3. `mdm_email_no_auth` = 0
4. BRD vật tư — chỉ blocker nếu ship module vật tư mới trong pilot

## Phase 3

# Phase 3 — CSSD domain (2026-06-10)

> Tiếp theo [domain-audit-20260610.md#phase-2](./domain-audit-20260610.md#phase-2)

## Đã triển khai

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| 3.1 | Spaulding/heat engine → BOM + mẻ TK | **Done (prior + verified)** | `cssd-packaging-rules.ts`, `me-tiet-khuan-batch-heat.ts`, `MeTietKhuanHeatBanner`, `BomChecklistModal` |
| 3.2 | Ledger Q2 — thiếu cấu phần = **warning**, không chặn CAP_PHAT | **Done** | `cssd-asset-ledger.ts`, lifecycle `CAP_PHAT_BOM_GAP_WARNING` |
| 3.3 | E2E CSSD shell + GSC lazy clusters | **Done** | `e2e/cssd-workflow.spec.ts`, `use-gsc-analytics-data` |
| 3.4 | GSC lazy-load clusters | **Done** | Nút «Tải theo biểu mẫu» — không fan-out 12 RPC khi vào trang |
| 3.5 | Cycle QR | **Deferred** | Slice riêng sau pilot CSSD ký tay |

### Q2 ledger (cấp phát)

- **Vẫn chặn:** chưa `KIEM_DEM_BOM`, chưa có BOM runtime.
- **Chỉ cảnh báo:** thiếu số lượng cấu phần → `{ ok: true, warning }` + lifecycle event.

### Verify (2026-06-10)

| Gate | Kết quả |
|------|---------|
| `verify:cssd` | PASS (24 tests) |
| `verify:engineering` | PASS |
| `cssd-asset-ledger.spec.ts` | PASS (3/3, gồm Q2 warning) |
| `cssd-packaging-rules` + `me-tiet-khuan-batch-heat` | PASS |

```bash
npm run verify:cssd
npm run verify:engineering
npx vitest run src/modules/cssd-erp/workflow/application/cssd-asset-ledger.spec.ts
npx vitest run src/lib/domain/cssd-packaging-rules.spec.ts src/modules/cssd-erp/lib/me-tiet-khuan-batch-heat.spec.ts
```

E2E (cần cred + CSSD routes không bị pilot-3 chặn):

```bash
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npm run test:e2e -- e2e/cssd-workflow.spec.ts
```

### Pilot checklist tay

[`docs/modules/cssd/pilot-test-checklist.md`](../module-history/cssd/pilot-test-checklist.md) — ký ≥5/6 mục cốt lõi §1–2 trên staging.

---

## Phase 4 đề xuất — Hóa chất / Thiết bị / Vật tư (tuần 9–10)

| # | Việc | Priority | Effort |
|---|------|----------|--------|
| 4.1 | Pilot checklist `/cssd-hoa-chat` — nhập/xuất/alert ngưỡng | P1 | S |
| 4.2 | Pilot checklist `/cssd-thiet-bi` — bảo trì + khóa mẻ TK | P1 | S |
| 4.3 | BRD vật tư phi-hóa-chất (intake trước code module mới) | P1 | M |
| 4.4 | Layout unify CSSD report pages (`layout:drift-check` còn lệch) | P2 | M |
| 4.5 | Link Auth pilot + go-live `KSNK_PILOT_CORE_MODULES` mở rộng CSSD | P2 | Ops |

**Exit Phase 4:** 2 checklist PASS + BRD vật tư duyệt (nếu mở rộng scope).

---

## Phase 5 (roadmap) — Cycle QR + NKBV full

- 3.5 Cycle QR tách `ma_qr_vinh_vien` / `ma_qr_chu_trinh`
- NKBV clinical forms coverage audit
- HIS/LIS — ngoài pilot

---

## Blocker go-live tổng

1. Pilot MDM/GSC/VST/QLCV ký tay (Phase 0–1)
2. Pilot CSSD ký tay (Phase 3)
3. `mdm_email_no_auth` = 0

## Phase 2

# Phase 2 — Dashboard (2026-06-10)

> Tiếp theo [domain-audit-20260610.md#phase-1](./domain-audit-20260610.md#phase-1)

## Đã triển khai

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| 2.1 | VST RPC perf linked **327ms → 91ms** | **Done** | `20260610060000_vst_strategic_rpc_fact_inline.sql` |
| 2.2 | GSC fan-out benchmark script | **Done** | `scripts/sql/pilot-dashboard-explain/05-gsc-fanout-sim.sql` |
| 2.3 | E2E analytics stability + form shell | **Done** | `e2e/gsc-vst-supervision.spec.ts` (+2 tests) |
| 2.4 | Archive STALE pre-aggregation doc | **Done** | → `docs/archive/reports/` + stub pointer |

### RPC latency (linked, 3-month window, post-migrate)

| RPC | Before (06-10 AM) | After |
|-----|-------------------|-------|
| `rpc_dashboard_vst_strategic_analytics` | **327 ms** | **91 ms** ✓ (<250ms) |
| `rpc_dashboard_gsc_strategic_analytics` | 59 ms | **65 ms** |
| `rpc_get_compliance_dashboard_v4` | 8 ms | **8 ms** |

### GSC fan-out (local `05-gsc-fanout-sim.sql`)

| Call | ms |
|------|-----|
| Aggregate | 6.2 |
| Cluster 1–3 (each) | 1.9–2.4 |

> Worst-case UI: 1 aggregate + 12 checklist RPC ≈ **65 + 12×65 ≈ 845ms** linked (upper bound nếu mỗi cluster full scan). Cần lazy-load clusters nếu UX chậm — backlog Phase 3 UX.

> **Linked fan-out probe:** `05-gsc-fanout-sim.sql --linked` fail 2026-06-10 (Supabase CLI SASL auth / circuit breaker). Chạy lại sau khi refresh token hoặc hết cooldown pooler.

### Kỹ thuật migration 2.1

- Scan trực tiếp `gstt_fact_vst_sessions` + `gstt_fact_vst` thay vì live summary views.
- `fn_get_session_stype` **1 lần / phiên** (không / cơ hội).
- Gộp `opp_workload` + `sessions_workload` vào `session_base` / `opp_window`.

### Verify

```bash
npm run mdm:migrate          # linked
npm run pilot:dashboard:explain:linked
npm run smoke:gsc-vst
npm run test:pilot
npm run verify:engineering
```

Tất cả **PASS** (2026-06-10).

---

## Phase 3 đề xuất — CSSD domain (tuần 6–8)

| # | Việc | Priority |
|---|------|----------|
| 3.1 | Spaulding/heat domain engine (`cssd-packaging-rules.ts`) | P1 |
| 3.2 | Remove ledger legacy bypass branch | P1 |
| 3.3 | CSSD E2E workflow T4→T6 + pilot checklist extended | P1 |
| 3.4 | GSC analytics lazy-load clusters (nếu fan-out >500ms UX) | P2 |
| 3.5 | Cycle QR P3 slice | P3 |

**Exit CSSD Phase 3:** pilot checklist CSSD ≥5/6 PASS; Digital BOM regression.

---

## Phase 4 đề xuất — Hóa chất / thiết bị (tuần 9–10)

| # | Việc |
|---|------|
| 4.1 | Pilot checklist `/cssd-hoa-chat`, `/cssd-thiet-bi` |
| 4.2 | BRD vật tư phi-hóa-chất (intake trước code) |
| 4.3 | Layout primitive unify CSSD report pages |

---

## Blocker go-live (không đổi)

1. Pilot checklist tay (MDM/GSC/VST/QLCV)
2. Workshop W1–W8 NV KSNK
3. `mdm_email_no_auth` = 0 cho user pilot

---

## Lệnh tái lập Phase 2 audit

```bash
npm run pilot:dashboard:explain:linked
node scripts/run-supabase-sql.mjs --linked --file scripts/sql/pilot-dashboard-explain/05-gsc-fanout-sim.sql
```

## Phase 1

# Phase 1 — Pilot core hardening (2026-06-10)

> Tiếp theo [domain-audit-20260610.md#phase-0](./domain-audit-20260610.md#phase-0)

## Đã triển khai (code)

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| G-03 | UX dual analytics — banner phạm vi chuyên đề | **Done** | `GscAnalyticsScopeBanner.tsx`, `GscAnalyticsView.tsx` |
| G-08 | Doc module lock GSC/VST | **Done** | [`docs/modules/giam-sat/module-lock.md`](../../modules/giam-sat/module-lock.md) |
| 1.1 | Khu vực filter regression (unit) | **Done** | `filterKhuVucsForKhoa` + `khu-vuc-giam-sat-ui.spec.ts` (4 tests) |
| G-02 | E2E per-loai banner | **Done** | `e2e/gsc-vst-supervision.spec.ts` (+1 test) |
| G-04 | Server auth | **Already done** | `src/proxy.ts` (Next.js 16 — `getUser()` server-side) |

### Verify sau slice

```text
vitest khu-vuc-giam-sat-ui.spec.ts — 4/4 PASS
verify:engineering — PASS
```

## Còn lại (manual / blocker go-live)

| ID | Việc | Owner |
|----|------|-------|
| G-05 | Pilot checklist ký tay MDM + GSC/VST + QLCV | Tester staging |
| 0c | Workshop W1–W8 NV KSNK | Facilitator |
| G-09 | Link Auth 8 nhân sự `mdm_email_no_auth` | Admin |
| G3 | Khóa module GSC — tay theo [`module-lock.md`](../../modules/giam-sat/module-lock.md) | Tester |

## E2E chạy local/CI

```bash
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npm run test:e2e -- e2e/gsc-vst-supervision.spec.ts
```

## Exit criteria Phase 1

- [ ] ≥5/6 pilot checklist mỗi module PASS (manual)
- [x] G-03, G-08, khu vực unit test, E2E spec extended
- [ ] Workshop 8/8 (hoặc ghi nhận exception có lý do)
- [ ] `mdm_email_no_auth` = 0 cho user pilot

---

## Phase 2 đề xuất (Dashboard — tuần 4–5)

| # | Việc | Priority | Effort |
|---|------|----------|--------|
| 2.1 | VST RPC perf: index/EXPLAIN → <250ms p95 linked | P1 | M |
| 2.2 | Đo latency GSC 12-RPC fan-out trên staging | P2 | S |
| 2.3 | E2E golden: form save → reload → KPI dashboard delta | P1 | M |
| 2.4 | Archive STALE `dashboard-pre-aggregation-dictionary.md` | P2 | S |
| 2.5 | Clinical validate CCS formula (workshop W2) | P1 | S (human) |

**Lệnh bắt đầu Phase 2:**

```bash
npm run pilot:dashboard:explain:linked
npm run gstt:db:audit
```

## Phase 3 đề xuất (CSSD — tuần 6–8)

Theo [`docs/modules/cssd/reform-plan.md`](../module-history/cssd/reform-plan.md):

1. Spaulding/heat domain engine (B2)
2. Remove ledger legacy bypass (B6)
3. CSSD E2E T4→T6 + pilot checklist extended

## Phase 4 đề xuất (Hóa chất / thiết bị — tuần 9–10)

1. Pilot checklist `cssd-hoa-chat`, `cssd-thiet-bi`
2. BRD vật tư phi-hóa-chất trước khi code module mới

## Khuyến nghị thứ tự ngay

1. **Admin:** link Auth pilot users (G-09) — 30 phút
2. **Tester:** pilot checklist §2 phase0 doc — 2–3h
3. **Dev (Phase 2):** VST RPC perf khi có volume baseline mới

## Phase 0

# Domain audit — Phase 0 (Phần VIII)

> **Ngày:** 2026-06-10 · **Commit:** `12cff4c` · **Phương pháp:** Gate pipeline → DB introspection → rubric có bằng chứng → gap register.

---

## 1. Gate pipeline (VIII.1)

| Gate | Kết quả | Bằng chứng |
|------|---------|------------|
| `verify:engineering` | **PASS** | 135 action files, 171 `verifyPermission`, 0 full fact reads, contract + legacy guard |
| `verify:mdm` | **PASS** | coverage 100%, FK postcheck OK |
| `trial:db:precheck` | **PASS** | MDM + GSC/VST + QLCV + 6 dashboard RPC — tất cả `true` |
| `test:pilot` | **PASS** | 19/19 (RPC contract, scoring, analytics) |
| `layout:typography-check` | **PASS** | Không drift text-[8px]/[9px] |
| `repo:hygiene` | **PASS** | 59 migrations, no blocking issues |
| `pilot:dashboard:explain:linked` | **WARN perf** | VST 327ms, GSC 59ms, compliance v4 8ms, staff stats 40ms |
| `mdm:migrate:local` | **PASS** (mới) | Local DB apply đủ chain tới `20260609061000` |
| `smoke:gsc-vst` | **PASS** | GSC/VST smoke linked |
| `trial:auth:precheck` | **WARN** | `mdm_email_no_auth` = **8** (pilot yêu cầu 0 cho user pilot) |

### RPC latency (linked, 3-month window)

| RPC | Execution time |
|-----|----------------|
| `rpc_dashboard_vst_strategic_analytics` | **327 ms** |
| `rpc_dashboard_gsc_strategic_analytics` | **59 ms** |
| `rpc_get_compliance_dashboard_v4` | **8 ms** |
| `rpc_get_dashboard_ksnk_staff_supervision_stats` | **40 ms** |

### DB introspection

| Check | Kết quả |
|-------|---------|
| `gstt_fact_*_summary` | 5 objects — **kind = view** |
| `gstt_dm_bang_kiem` active | 36 rows |
| `cach_tinh_diem IS NULL` | **0** |

---

## 2. Pilot checklist — trạng thái (VIII.2)

> Automated = precheck/gate cover logic layer. **Manual** = cần tester ký trên staging UI.

### MDM ([`docs/modules/mdm/README.md`](../../modules/mdm/README.md))

| # | Kịch bản | Auto | Manual |
|---|----------|------|--------|
| 1 | Khoa → nhân sự → GSC header | `khoa_phong_ok`, `bang_kiem_ok` | ☐ Khoa hiện đúng trên `/giam-sat-chung` |
| 2 | Bảng kiểm → tiêu chí GSC | `tieu_chi_bang_kiem_ok` | ☐ Form load đủ tiêu chí |
| 3 | RBAC generic DM | `v_sys_user_permissions_ok` | ☐ User thiếu quyền bị chặn |
| 4 | Tài khoản ↔ Auth | `mdm_nhan_su_ok`; auth precheck **WARN** (8 email chưa link Auth) | ☐ Login staff pilot |
| 5 | Dụng cụ ↔ CSSD replenish | engineering guard | ☐ BOM checkpoint từ chi tiết DC |

### GSC/VST ([`pilot-checklist-202606.md`](../../modules/giam-sat/pilot-checklist-202606.md))

| # | Kịch bản | Auto | Manual |
|---|----------|------|--------|
| G1 | Tạo phiên GSC | `fact_gsc_*_ok`, scoring tests | ☐ |
| G1b | Thống kê 1 phiên | RPC GSC strategic | ☐ |
| G2–G4 | Sửa / khóa / lịch sử GSC | lock trigger exists | ☐ |
| V1–V3 | VST phiên + header + no import | `fact_vst_*_ok`, `smoke:gsc-vst` PASS | ☐ |

### QLCV ([`pilot-checklist-202606.md`](../../modules/qlcv/pilot-checklist-202606.md))

| # | Kịch bản | Auto | Manual |
|---|----------|------|--------|
| Q1–Q3 | Workflow + nghiệm thu | `qlcv_fact_cong_viec_ok` | ☐ |
| Q4 | Spawn idempotent | `qlcv_spawn_rpc_ok` | ☐ Chạy 2 lần UI/RPC |
| Q5 | Checklist JSONB | `qlcv_checklist_rpc_ok` | ☐ |
| Q6 | Scope khoa | `qlcv-list-scope` (unit) | ☐ User khoa A |

**Ghi nhận pilot:** tester ___ | ngày ___ | MDM __/5 | GSC/VST __/7 | QLCV __/6

---

## 3. Rubric có bằng chứng (VIII.3)

Trọng số: Domain 30%, DB 25%, BE 20%, FE 15%, UX 10%, O 10% (Operability).

| Module | D | DB | BE | FE | UX | O | **Tổng** | Bằng chứng chính |
|--------|---|---|----|----|----|---|----------|------------------|
| MDM/RBAC | 4.0 | 4.0 | 4.0 | 3.5 | 3.5 | 3.5 | **3.8** | precheck MDM; verify:admin path |
| VST | 4.0 | 4.0 | 4.0 | 4.0 | 3.5 | 3.5 | **3.9** | 0 NULL scoring; summary=view; 19 pilot tests |
| GSC | 4.0 | 4.0 | 4.0 | 4.0 | 3.0 | 3.5 | **3.8** | compliance v4 8ms; dual analytics entry |
| Dashboard | 3.5 | 4.0 | 4.0 | 3.5 | 3.5 | 3.0 | **3.6** | VST RPC 327ms; compose core spec |
| QLCV | 4.0 | 4.0 | 3.5 | 4.0 | 4.0 | 3.5 | **3.9** | spawn + checklist RPC OK |
| CSSD | 3.5 | 4.0 | 4.0 | 3.5 | 3.0 | 3.0 | **3.5** | reform-plan gaps B2/B6; ledger soft |
| Hóa chất | 3.0 | 3.5 | 3.5 | 3.0 | 2.5 | 2.5 | **3.0** | actions exist; **no pilot checklist** |
| Thiết bị | 3.5 | 3.5 | 3.5 | 3.0 | 2.5 | 2.5 | **3.2** | bảo trì actions; **no pilot checklist** |
| NKBV | 3.5 | 4.0 | 4.0 | 3.5 | 3.0 | 2.5 | **3.5** | rules spec; ngoài pilot-3-module |

**Ngưỡng pilot-ready:** ≥ 4.0 — **VST, QLCV** gần ngưỡng; **Hóa chất** dưới ngưỡng.

---

## 4. Workshop validation sheet — NV KSNK (VIII.4)

> Dùng trong buổi 2h với chuyên môn KSNK. Đánh dấu Đúng / Sai / Cần sửa.

| # | Câu hỏi xác nhận domain | SSOT code/doc | Kết quả | Ghi chú |
|---|-------------------------|---------------|---------|---------|
| W1 | WHO 5 moments T1–T5 — nhãn UI khớp chuẩn BV? | `VSTOpportunityForm`, domain-spec §2.1 | ☐ | |
| W2 | CCS = 50% VST + 50% GSC (NKBV tách riêng)? | `bao-cao-tong-hop-core.ts` | ☐ | |
| W3 | IPAC 4 vùng (Trắng/Xanh/Vàng/Đỏ) — compliance v4 đúng? | `rpc_get_compliance_dashboard_v4` | ☐ | |
| W4 | GSC scoring: N/A không tính vào mẫu? | pilot G1b, GSC RPC | ☐ | |
| W5 | Khóa module GSC/VST — đúng quy trình khóa sổ? | `sys_module_locks` | ☐ | |
| W6 | CSSD cấp phát thiếu BOM — cảnh báo (không chặn) chấp nhận được? | reform-plan Q2 | ☐ | |
| W7 | QLCV 7 trạng thái — khớp quy trình nội bộ KSNK? | domain-spec §2.3 | ☐ | |
| W8 | Khu vực giám sát TR/DO/VA/XA — phân loại đúng khoa? | Jun-08 migrations | ☐ | |

**Facilitator:** ___ | **Ngày:** ___ | **Pass:** __/8

---

## 5. Gap register (VIII.5)

| ID | Sev | Layer | Gap | Evidence | Phase fix |
|----|-----|-------|-----|----------|-----------|
| G-01 | P1 | Perf | VST strategic RPC 327ms linked | EXPLAIN 2026-06-10 | Phase 2.1 |
| G-02 | P1 | Test | Chưa E2E Form→Dashboard CI | health-check §4 | Phase 1.6, 2.3 |
| G-03 | P1 | UX | Dual analytics GSC (`/thong-ke` vs per-loai) | HC-06 | Phase 1.3 |
| G-04 | P1 | Security | Auth chủ yếu client-side | F-02 comprehensive review | Phase 1.5 |
| G-05 | P1 | Manual | Pilot checklist MDM/GSC/QLCV chưa ký tay | §2 above | Phase 0.5 |
| G-06 | P2 | Domain | CSSD Spaulding/heat engine chưa đủ | reform-plan B2 | Phase 3.1 |
| G-07 | P2 | Domain | Ledger legacy bypass branch | reform-plan B6 | Phase 3.2 |
| G-08 | P2 | Doc | GSC module lock thiếu doc module | traceability #6 | Phase 1.2 |
| G-09 | P2 | Auth | 8 nhân sự `mdm_email_no_auth` trên staging | auth precheck 2026-06-10 | Phase 0c — link Auth pilot users |
| G-15 | P2 | Test | `smoke:gsc-vst` PASS | 2026-06-10 | — |
| G-10 | P2 | UX | Layout drift CSSD/NKBV (22 chỗ) | F-06 | Phase 4.4 |
| G-11 | P2 | Module | Hóa chất/thiết bị — không pilot checklist | §3 rubric | Phase 4.1–4.2 |
| G-12 | P3 | Feature | Cycle QR tách (P3 CSSD) | reform-plan B7 | Phase 3.5 |
| G-13 | P3 | Types | `as any` GSC session detail | HC-07 | Backlog |
| G-14 | RESOLVED | Ops | Local DB down | `mdm:migrate:local` PASS 2026-06-10 | — |

### Consolidated from prior audits

| Legacy ID | Status | Note |
|-----------|--------|------|
| HC-01 | **RESOLVED** | Local migrate OK |
| HC-02 | **RESOLVED** | VST RPC **91ms** linked post `20260610060000` (was 327ms) |
| HC-03 | OPEN | STALE pre-aggregation doc |
| HC-04 | **RESOLVED** | repo:hygiene PASS |
| F-07 ledger soft | OPEN → aligns Q2 decision | Warning not block |
| D-07 dual dashboard | **CLOSED** | Summary = views only |

---

## 6. Đề xuất phase tiếp theo

### Ngay (tuần này — hoàn Phase 0)

| # | Việc | Effort | Output |
|---|------|--------|--------|
| 0a | ~~Chạy smoke + auth precheck~~ | **DONE** | §1; fix G-09 (8 email) |
| 0b | Tester ký §2 manual (staging) | 2–3h người | Pilot sign-off |
| 0c | Workshop W1–W8 với NV KSNK | 2h | §4 filled |

### Phase 1 — Pilot core hardening (tuần 2–3)

Ưu tiên theo impact:

1. **G-05 + 0b** — Pilot sign-off 3 module (blocker go-live)
2. **G-03** — UX breadcrumb canonical `/thong-ke` (quick win)
3. **G-02** — E2E Playwright 1 VST + 1 GSC golden path
4. **G-04** — Server auth (`proxy.ts` / middleware)
5. **G-08** — Doc module lock 1 trang trong `docs/modules/giam-sat/`
6. Regression **khu vực Jun-08** trên header VST/GSC (manual V2)

**Exit:** `KSNK_PILOT_CORE_MODULES=1` + ≥5/6 mỗi pilot checklist PASS.

### Phase 2 — Dashboard (tuần 4–5)

1. **G-01** — VST RPC index/EXPLAIN → mục tiêu <250ms p95
2. E2E Form save → KPI delta
3. Archive STALE `dashboard-pre-aggregation-dictionary.md`

### Phase 3 — CSSD (tuần 6–8, sau pilot core)

1. Spaulding domain engine (B2)
2. Remove ledger legacy bypass (B6)
3. CSSD pilot checklist extended

### Phase 4 — Hóa chất / thiết bị (tuần 9–10)

1. Pilot checklist mới (G-11)
2. BRD vật tư phi-hóa-chất trước khi code

---

## 7. Lệnh tái lập audit

```bash
npm run verify:engineering && npm run verify:mdm && npm run trial:db:precheck
npm run test:pilot && npm run layout:typography-check && npm run repo:hygiene
npm run pilot:dashboard:explain:linked
npm run smoke:gsc-vst && npm run trial:auth:precheck   # bổ sung lần sau
node scripts/run-supabase-sql.mjs --linked --file scripts/sql/health-check-gstt-introspect.sql
```

---

*Phase 0 automated slice complete. Manual pilot + workshop = blocker trước Phase 1 exit.*
