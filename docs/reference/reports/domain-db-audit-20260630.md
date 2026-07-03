# Domain & Database audit — 2026-06-30

> 7 module song song · rubric 1–5 · delta post-June

---

## Rubric tổng hợp

| Module | Domain | DB | Boundary | Traceability | Operability | **Avg** |
|--------|--------|-----|----------|--------------|-------------|---------|
| MDM/Quản trị | 4.5 | 4.5 | 4.0 | 4.0 | 4.0 | **4.2** |
| GSC | 4.5 | 4.5 | 4.5 | 4.0 | 4.0 | **4.3** |
| VST | 4.5 | 4.5 | 4.5 | 4.0 | 4.0 | **4.3** |
| QLCV | 4.5 | 4.5 | 4.5 | 3.5 | 4.0 | **4.2** |
| CSSD | 4.0 | 4.0 | 4.5 | 4.0 | 3.5 | **4.0** |
| NKBV | 4.0 | 4.0 | 4.0 | 4.0 | 3.0 | **3.8** |
| Dashboard | 4.5 | 4.5 | 4.0 | 4.0 | 4.0 | **4.2** |

**Tổng hợp:** 4.1 (mục tiêu plan: 4.0–4.5) — **đạt**

---

## Delta post-June (đã rà)

| Hạng mục | Migration / code | Kết quả |
|----------|------------------|---------|
| CSSD sự cố 3 lớp | `20260630100000`, `cssd-incident-policy` | Domain tests pass; pilot checklist su-co cần tay |
| Hóa chất FEFO + sự cố | `20260627130000`, kho-hoa-chat-* | Ledger domain specs pass |
| Thiết bị PM | `20260627120000`, fleet panel | UI + assert REPAIRING gate |
| Analytics wave 3 | `20260630140000`–`160000` | RPC precheck pass; metric dictionary SSOT |
| QLCV KSNK-only | `20260617120000`, `ksnk-boundary.ts` | Scope server + migration purge |
| Print CSSD | `cssd-print-*`, `BomChecklistModal` | verify:cssd pass |
| BK áp dụng JSONB | `20260612120000`, ap_dung | View sync; compat view cleaned G-01 |

---

## DB anti-rác checklist

| Rule | Status |
|------|--------|
| Không summary table mới | PASS — gstt summary = live views |
| WRITE chỉ physical table | PASS — legacy:guard |
| RPC dashboard contract | PASS — rpc-contract-dashboard.spec |
| CSSD RLS module-scoped | PASS — `20260603160000` |
| Lookup 14 loại → sys_lookup_value | PASS — master-crud-core |
| Compat views dropped | PASS — sau `20260701000000` |

---

## Còn mở (P3)

- NKBV clinical UAT sign-off (5 kịch bản)
- GSTT RLS hardening (permissive trên một số fact)
- Staging linked apply migration mới (ops)
