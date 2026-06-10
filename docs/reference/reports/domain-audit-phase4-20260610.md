# Phase 4 — Hóa chất / Thiết bị / Layout (2026-06-10)

> Tiếp theo [domain-audit-phase3-20260610.md](./domain-audit-phase3-20260610.md)

## Đã triển khai

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| 4.1 | Pilot checklist `/cssd-hoa-chat` | **Done** | [`pilot-checklist-hoa-chat-202606.md`](../../modules/cssd/pilot-checklist-hoa-chat-202606.md) |
| 4.2 | Pilot checklist `/cssd-thiet-bi` | **Done** | [`pilot-checklist-thiet-bi-202606.md`](../../modules/cssd/pilot-checklist-thiet-bi-202606.md) |
| 4.3 | BRD vật tư phi-hóa-chất (intake) | **Done (chờ workshop)** | [`brd-vat-tu-intake-202606.md`](../../modules/cssd/brd-vat-tu-intake-202606.md) |
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
