# Phase 3 — CSSD domain (2026-06-10)

> Tiếp theo [domain-audit-phase2-20260610.md](./domain-audit-phase2-20260610.md)

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

[`docs/modules/cssd/pilot-test-checklist.md`](../../modules/cssd/pilot-test-checklist.md) — ký ≥5/6 mục cốt lõi §1–2 trên staging.

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
