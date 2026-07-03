# Backend audit — 2026-06-30

---

## Contract app ↔ DB

| Check | Result |
|-------|--------|
| `verify:engineering` | PASS |
| `imports:cssd-mdm` | PASS |
| `imports:master-crud` | PASS |
| Unbounded fact reads | 0 |
| Legacy table names in src | 0 |

---

## Permission model (by design)

| Module | Guard pattern | Ghi chú |
|--------|---------------|---------|
| MDM, GSC write, BK | `verifyPermission` | Chuẩn |
| Dashboard | `verifyCommandCenterShell` / `verifyBaoCaoTongHopShell` | Shell-scoped — hợp lệ |
| QLCV | `ensureQlcvKsnkAccess` + `verifyAnyPermission` | KSNK-only boundary |
| CSSD | `verifyCssd*` gates | Module server gates |
| Auth | không guard | Login/session — đúng |

**Kết luận:** Không thiếu quyền; pattern đa dạng nhưng có contract gate.

---

## Dead code / orphan

| Item | Status |
|------|--------|
| `DigitalChecklistPanel` refs | **Clean** — thay bằng `BomChecklistModal` |
| `gsc-tgs-obligation` | **Clean** — thay `GscBangKiemToiPhaiTgsPanel` |
| `add-panel-chrome` stale path | **Fixed** |
| CSSD `cssd.actions.ts` barrel | Compat re-export — giữ cho import cũ |

---

## Analytics SSOT

| Layer | File | Role |
|-------|------|------|
| Formulas | `supervision-metrics/` | CCS, comparable, delta |
| GSC checklist | `gsc-checklist-analytics.ts` | pickTop, sortByRisk |
| Payload map | `gsc-analytics-data.ts` | resolveChecklistOverview |
| Thresholds | `supervision-thresholds.ts` | Ngưỡng 85/70/80 |

**P1 mở (G-07):** 3 entry fetch strategic (module hooks + command center + bao-cao-tong-hop) — không sai nghiệp vụ, có thể gom cache sau.

---

## Remediation đã làm

- Fix React hooks / compiler lint (analytics)
- RPC BK suffix SSOT trên DB
- SQL probe scripts single-statement
