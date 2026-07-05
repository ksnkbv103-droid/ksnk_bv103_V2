# Rà soát tổng thể hệ thống KSNK BV103

> **Ngày rà soát:** 2026-06-03  
> **Phạm vi:** Project HEAD (`refactor/dashboard-hybrid-reform`, commit `11eb574…`, working tree dirty)  
> **Phương pháp:** Ground-truth — code + migrations + DB local/staging + automated gates. **Không** copy báo cáo 2026-05-30.  
> **Evidence pack:** [audit-evidence-pack-20260603.md](./audit-evidence-pack-20260603.md)

---

## Mục lục

1. [Executive summary](#1-executive-summary)
2. [Phương pháp & phạm vi](#2-phương-pháp--phạm-vi)
3. [Domain nghiệp vụ](#3-domain-nghiệp-vụ)
4. [Kiến trúc ứng dụng](#4-kiến-trúc-ứng-dụng)
5. [Database](#5-database)
6. [UI / UX shell](#6-ui--ux-shell)
7. [Chất lượng codebase](#7-chất-lượng-codebase)
8. [Liên thông & traceability](#8-liên-thông--traceability)
9. [Verdict: rườm rà, chồng chéo, khoa học](#9-verdict-rườm-rà-chồng-chéo-khoa-học)
10. [Phụ lục lịch sử (so với 30/05)](#10-phụ-lục-lịch-sử-so-với-3005)
11. [Remediation](#11-remediation)

---

## 1. Executive summary

Hệ thống **KSNK BV103** là ERP giám sát nhiễm khuẩn + CSSD trên **Next.js 16 / React 19 / Supabase Postgres**, tổ chức theo **8 bounded context** trong `src/modules/`. Sau đợt reform tháng 5–6/2026, **runtime app đã chuẩn hóa prefix module** (`gstt_`, `cssd_`, `nkbv_`, …) và `legacy:guard` **pass** — đây là tiến bộ khoa học rõ so với báo cáo 30/05.

**Top findings (có bằng chứng):**

| ID | Mức | Finding |
|----|-----|---------|
| F-01 | **P0** | **Drift môi trường DB:** local chỉ 2 migration applied; staging 26/29; repo có tới `20260603140000`. Audit local EXPLAIN/size **không đại diện**. |
| F-02 | **P1** | **Không có `middleware.ts`** — auth redirect chỉ client (`ClientLayoutWrapper` + `onAuthStateChange`). |
| F-03 | **P1** | **Dashboard đa luồng:** RPC strategic V4 + bảng `gstt_fact_*_summary` (trigger) + báo cáo tổng hợp compose client — cần benchmark trước khi dọn summary. |
| F-04 | **P1** | **`quan-tri-he-thong` 137 file** — hub MDM/RBAC/danh mục chiếm ~28% module code; ranh giới CSSD↔MDM dễ lẫn. |
| F-05 | **P2** | **Doc drift:** `implementation-mapping` vẫn nhắc compat view `v_fact_*`; `debt-register` D-05 **obsolete** (guard pass). |
| F-06 | **P2** | **Layout drift:** 22 chỗ radius tùy ý (`rounded-[32px]`/`[40px]`) vs `bv103LayoutChrome`. |
| F-07 | **P2** | **Ledger cấp phát:** `assertLedgerDuChoCapPhat` — thiếu BOM digital → **warning**, không chặn cứng. |
| F-08 | **P3** | **7 views sql-only** (dashboard hotpath) — hợp lệ nhưng cần catalog RPC. |
| F-09 | **Positive** | Digital BOM panel, GSC lock, NKBV↔CSSD trace, `bao-cao-tong-hop` có core spec — pilot maturity tăng. |
| F-10 | **Positive** | `verify:engineering` pass: 165 `verifyPermission`, 0 legacy `.from(fact_*)` trong `src/`. |

**Rubric tổng hợp (1–5):**

| Dimension | Điểm | Ghi chú |
|-----------|------|---------|
| Domain accuracy | **3.5** | Rules engine NKBV/VST/CSSD có test; một số KPI chỉ trong RPC/trigger |
| Structural clarity | **3** | DDD module rõ; dashboard + MDM hub nặng |
| DB discipline | **3** | Prefix SSOT tốt; **env drift** trừ điểm |
| UI coherence | **2.5** | Shell thống nhất; CSSD/NKBV/report lệch primitive |
| Operability | **2** | Local DB không đủ migration; staging thiếu 03/06 |

---

## 2. Phương pháp & phạm vi

### Thứ bậc nguồn sự thật

1. `src/`, `supabase/migrations/`, `scripts/` trên HEAD  
2. Postgres linked **staging** + **local** (introspection)  
3. SSOT docs — chỉ để phát hiện **drift**  
4. Báo cáo 2026-05-30 — **không** dùng làm nguồn kết luận

### Snapshot kỹ thuật

- **29** migration files; **87** Server Action files; **35** routes; **46** spec files trong `src/`
- Gates: `legacy:guard` PASS, `verify:engineering` PASS, `docs:links:check` PASS
- Chi tiết: [audit-evidence-pack-20260603.md](./audit-evidence-pack-20260603.md)

---

## 3. Domain nghiệp vụ

Đánh giá theo thứ tự **code/RPC → DB trigger → đối chiếu spec**.

### 3.1 VST (WHO 5 moments)

| Khía cạnh | Thực tế trên project | Fidelity |
|-----------|----------------------|----------|
| Phiên + quan sát | `gstt_fact_vst_sessions`, `gstt_fact_vst` | 4/5 |
| KPI % tuân thủ | RPC `rpc_dashboard_vst_strategic_analytics` + summary tables qua trigger (`20260530120000`) | 4/5 |
| UI | `VSTPage`, multi-person form, `/giam-sat-vst/lich-su` | 4/5 |

**Doc:** [`domain-specification.md`](../../core/domain-specification.md) đã map prefix `gstt_*`; cột legacy trong bảng chỉ là tham chiếu lịch sử — **chấp nhận được**.

### 3.2 GSC (checklist động)

| Khía cạnh | Thực tế | Fidelity |
|-----------|---------|----------|
| `results_jsonb` | `gstt_fact_chung_sessions` — không EAV | 5/5 |
| Scoring | `gsc-score-display.ts` + migration `20260602000000` backfill `cach_tinh_diem` | 4/5 |
| Module lock | `sys_module_locks` + `GscModuleLockBanner` — **mới**, ít doc module | 3/5 doc |

### 3.3 NKBV (HAI)

| Khía cạnh | Thực tế | Fidelity |
|-----------|---------|----------|
| Day-3 / rules | `nkbv-rules-engine.ts` + spec 400+ dòng | 4/5 |
| Clinical forms | BSI/UTI/VAP/SSI subforms trong `NkbvClinicalChecklistModal` | 3.5/5 — pilot đủ case chính |
| CSSD trace | `CssdTraceLink`, migration `20260602150000` | 4/5 — liên thông mới tốt |

### 3.4 CSSD (6 trạm)

| Khía cạnh | Thực tế | Fidelity |
|-----------|---------|----------|
| State machine | `cssd-state-engine.spec.ts`, `cssd-workflow-application.ts` | 4/5 |
| Digital BOM | `DigitalChecklistPanel.tsx` — load BOM, thiếu/thừa dụng cụ | **4/5** (D-01 **partial done**) |
| Mẻ tiệt khuẩn | `me-tiet-khuan-batch-heat.ts` + banner UI — batch heat pilot | 3.5/5 |
| Ledger | `assertLedgerDuChoCapPhat` — có `KIEM_DEM_BOM`; chưa qua checklist → **warning** | 3/5 (D-02 **softened**) |

### 3.5 QLCV

Lean workflow migrations (`20260531100000`…); đọc `v_qlcv_*`, fact `qlcv_fact_cong_viec`. Spawn cron `20260530082000`. **Fidelity 4/5.** TEXT+CHECK (D-QLCV-01) **Done 2026-06-04**; sync overdue modernized **2026-06-06**.

### 3.6 MDM / RBAC

- MDM gateway trong `quan-tri-he-thong` + `src/lib/master-data/`
- RBAC: migrations `20260602190000`, `20260603120000`, `20260603140000` (repo) — staging chưa có 03/06
- **Ranh giới CSSD vs MDM:** replenish qua `requestReplenishFromReserveAction` — đúng facade; risk khi import trực tiếp `v_cssd_*_summary` từ DM actions

### Domain fidelity tổng: **3.6 / 5**

---

## 4. Kiến trúc ứng dụng

### 4.1 Cấu trúc thư mục (thực tế)

```
src/app/          → 35 route mỏng (re-export views)
src/modules/      → 9 domain folders (DDD)
src/lib/          → RBAC, master-data, validations, analytics cross-cut
src/components/   → Shell shared (Sidebar, ClientLayoutWrapper, …)
```

### 4.2 Luồng chuẩn (verified sample)

`UI → *.actions.ts → verifyPermission → Supabase .from / .rpc`

Engineering scan: **165** `verifyPermission`, **16** `.rpc()`, **0** full-table fact reads flagged.

### 4.3 Module dependency (grep `@/modules`)

- **Dashboard** import type/action từ `giam-sat-vst`, `giam-sat-chung`, `giam-sat-nkbv`, `quan-ly-cong-viec` — **hub đọc chéo** (chấp nhận cho Command Center / báo cáo tổng hợp).
- **cssd-erp** ↔ **cssd-su-co** — incident modal, contracts schema.
- **cssd-erp** → MDM replenish — đúng pattern facade.

[`interaction-matrix.md`](../architecture/interaction-matrix.md) **còn đúng hướng** nhưng thiếu: GSC lock, `bao-cao-tong-hop`, NKBV trace, RBAC 03/06.

### 4.4 Anti-patterns (re-verify debt cũ)

| Debt cũ | Trạng thái 2026-06-03 | Bằng chứng |
|---------|------------------------|------------|
| D-05 view alias `v_fact_*` | **Obsolete** | `legacy:guard` PASS |
| D-09 middleware auth | **Open** | Không có `middleware.ts` |
| D-02 ledger bypass | **Revised** | Warning-only nếu chưa `KIEM_DEM_BOM` — `cssd-asset-ledger.ts:107-111` |
| D-01 Digital BOM | **Partial done** | `DigitalChecklistPanel.tsx` hoạt động |
| D-07 dual dashboard path | **Open** | Summary tables trong baseline + RPC v4 + `bao-cao-tong-hop-core` compose |

### 4.5 Độ phức tạp module

| Module | Files | Nhận xét |
|--------|-------|----------|
| quan-tri-he-thong | 137 | MDM + RBAC + nhiều danh mục — **cao nhất** |
| cssd-erp | 116 | Workflow + kho + batch — phức tạp hợp lý nghiệp vụ |
| dashboard | 30 | Tăng nhanh (bao-cao-tong-hop) — cần giữ pure logic trong `lib/` |

---

## 5. Database

### 5.1 Naming & SSOT

Migration `20260602180000_module_ssot_drop_legacy_compat_views.sql`: DROP compat `dm_*`/`fact_*` ở DB (mục tiêu). App guard cấm gọi lại.

**Views đọc app:** 36 view có reference trong `src/`; **0** orphan unused; **7** sql-only (dashboard/RPC nội bộ) — xem evidence pack.

### 5.2 Drift môi trường (F-01)

| | Count | Latest migration |
|--|-------|------------------|
| Repo files | 29 | `20260603140000` |
| Staging | 26 | `20260602190000` |
| Local | **2** | `20260602190000` |

**Khuyến nghị vận hành:** `npm run mdm:migrate:local` + `trial:prep` trước dev; apply `20260603120000`–`140000` lên staging có runbook.

### 5.3 Summary / pre-aggregation

Baseline chứa `gstt_fact_vst_*_summary`, `gstt_fact_gsc_*_summary` + trigger sync. App dashboard ưu tiên **RPC v4 / strategic** (`rpc_get_compliance_dashboard_v4`, `rpc_dashboard_*`). **Chưa đo** latency để khuyến nghị DROP summary — tuân thủ AGENTS (cần số liệu).

### 5.4 RLS & security

- Engineering gate: permission trên actions tốt.
- RLS CSSD vẫn thường `authenticated`-level trên pilot (debt D-11) — **cần probe** `admin-rbac-probe.sql` trên staging khi có quyền.
- Không chạy EXPLAIN đầy đủ: staging volume + local DB không đủ schema.

---

## 6. UI / UX shell

### 6.1 Shell

- `Sidebar` + `ClientLayoutWrapper` + `KsnkPageShell` phase-1 — **nhất quán** cho giám sát/CSSD chính.
- Nav mới: **Báo cáo tổng hợp KSNK** (`/bao-cao-tong-hop`).

### 6.2 Layout drift (F-06)

`layout:drift-check`: **22** matches — tập trung CSSD report, NKBV import portal, `tai-khoan/page.tsx`.

### 6.3 UI consistency matrix (rút gọn)

| Module | List screen | Form phức tạp | Primitive |
|--------|-------------|---------------|-----------|
| VST | `VSTPage` | Multi-person assessment | Phase-1 shell OK |
| GSC | History + form | `GiamSatChungForm` + lock banner | OK |
| NKBV | Dashboard panel | `NkbvClinicalChecklistModal` | Custom radius |
| CSSD | `CSSDERPPage` | Workflow + QR | Mixed |
| Dashboard | Command center | `bao-cao-tong-hop-page` | Comprehensive components |
| QLCV | Kanban/table | `CongViecForm` | OK |

---

## 7. Chất lượng codebase

| Metric | Value |
|--------|-------|
| `*.actions.ts` | 87 |
| `*.spec.ts` (src) | 46 |
| Legacy table guard | PASS |
| Engineering contract | PASS |

**Test gaps (domain thuần có spec tốt):** NKBV rules, CSSD state engine, `bao-cao-tong-hop-core`, GSC score. **Thiếu:** nhiều actions chỉ integration tay; GSC lock chưa spec.

**Rườm rà (code):** không thấy layer wrapper >5% rõ ràng; phức tạp chủ yếu do **nghiệp vụ y tế** (NKBV forms, CSSD workflow) — chấp nhận pilot nếu doc/runbook đủ.

---

## 8. Liên thông & traceability

Ma trận 25 luồng: [traceability-matrix-20260603.md](./traceability-matrix-20260603.md)

**Gap chính:**

- Doc module chưa cập nhật tính năng 06/2026 (lock, báo cáo tổng hợp, heat batch).
- `implementation-mapping` changelog dài nhưng vẫn reference compat view ở vài dòng — gây hiểu nhầm cho agent/dev mới.

---

## 9. Verdict: rườm rà, chồng chéo, khoa học

### Có quá rườm rà không?

**Ở mức pilot: trung bình–hơi nặng, nhưng có lý do.**

- Nặng nhất: **MDM hub** (137 files) + **CSSD** (116 files) — đúng scope bệnh viện.
- Không nên thêm abstraction mới; nên **tách PR theo vertical slice** và giữ `lib/*-core.ts` thuần.

### Chồng chéo ở đâu?

1. **Dashboard analytics:** RPC v4 + summary tables + compose báo cáo tổng hợp — **chồng nguồn KPI** (F-03).
2. **Doc vs code:** mapping/wiki chậm hơn migration 06/02 (F-05).
3. **Môi trường dev:** local DB ≠ staging ≠ repo migrations (F-01) — chồng “sự thật” vận hành.

### Thiếu khoa học ở đâu?

1. **Ops reproducibility** — local 2/29 migration là thiếu kỷ luật vận hành, không phải thiếu kiến trúc app.
2. **Auth defense-in-depth** — chỉ client gate (F-02).
3. **Ledger/BOM** — cảnh báo mềm thay vì invariant cứng trước cấp phát (F-07) — tradeoff pilot vs an toàn.
4. **Chưa benchmark** trước khi đề xuất bỏ summary DB — đúng kỷ luật AGENTS.

### Điểm mạnh khoa học

- Prefix module + `legacy:guard` + engineering contract.
- Rules engine & state machine có test.
- Traceability matrix end-to-end khả thi.

---

## 10. Phụ lục lịch sử (so với 30/05)

| Hạng mục | 30/05 (báo cáo cũ) | 03/06/2026 (project) |
|----------|-------------------|----------------------|
| View alias `v_fact_*` trong app | ~40 file (D-05) | **0** — guard pass |
| Module SSOT DB | Kế hoạch Phase 1 | **Done** migrations 06/02 |
| Digital BOM | Khung (D-01) | Panel + checkpoint actions |
| Báo cáo tổng hợp | Không | `/bao-cao-tong-hop` + core spec |
| GSC lock | Không | `sys_module_locks` |
| RBAC | rel_* compat | DROP + repair migrations 03/06 |
| Audit log UI | Có | DROP `sys_audit_log` 06/02 |

*Báo cáo 30/05 archived — không supersede findings; chỉ timeline.*

---

## 11. Remediation

Kế hoạch chi tiết đồng bộ: [remediation-plan-2026h2-sync.md](../architecture/remediation-plan-2026h2-sync.md)

Cập nhật debt (re-verify): [debt-register.md](../architecture/debt-register.md#audit-2026-06-03-re-verification)
