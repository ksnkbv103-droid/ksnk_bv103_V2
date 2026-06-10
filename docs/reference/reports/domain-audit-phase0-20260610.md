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
