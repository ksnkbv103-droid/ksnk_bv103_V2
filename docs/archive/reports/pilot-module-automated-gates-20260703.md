# Pilot module — automated gates (local 2026-07-03)

> Sau `npm run local:golden:reset` + `cssd:demo:reset:local`. Checklist tay §B: [`pilot-go-live-signoff-202606.md`](../../core/pilot-go-live-signoff-202606.md).

## Tổng hợp

| Khối | Gate tự động | Kết quả | Checklist tay (≥5/6) |
|------|--------------|---------|----------------------|
| 1 MDM / Quản trị | `verify:admin`, `verify:danh-muc-routes`, `admin:rbac:parity:local` | **PASS** | ☐ PO — [`mdm/README.md`](../../modules/mdm/README.md) |
| 2 GSC + VST | `smoke:gsc-vst:local`, `gstt:scoring:audit`, `gstt:db:audit:local` | **PASS** (36/36 scoring) | ☐ PO — [`giam-sat/pilot-checklist-202606.md`](../../modules/giam-sat/pilot-checklist-202606.md) |
| 3 QLCV | `trial:qlcv:precheck:local`, domain specs | **PASS** | ☐ PO — [`qlcv/pilot-checklist-202606.md`](../../modules/qlcv/pilot-checklist-202606.md) |
| 4 CSSD P3 quy trình | `verify:cssd` (49 tests), `cssd:db:audit:local` | **PASS** | ☐ PO — [`cssd/pilot-test-checklist.md`](../../modules/cssd/pilot-test-checklist.md) |
| 5 CSSD P4 hóa chất + thiết bị | `cssd:db:audit:local` | **PASS** | ☐ PO — hóa chất + thiết bị checklists |
| 6 CSSD P5 cycle QR | `verify:cssd` | **PASS** | ☐ PO — [`pilot-checklist-cycle-qr-202606.md`](../../modules/cssd/pilot-checklist-cycle-qr-202606.md) |
| 7 Dashboard | `test:pilot` (25), `pilot:dashboard:explain:local` | **PASS** | ☐ PO — [`dashboard/README.md`](../../modules/dashboard/README.md) |
| 8 NKBV | `nkbv-rules-engine.spec.ts` (18 tests) | **PASS** (engineering) | ☐ **PO clinical UAT** — [`pilot-clinical-checklist-20260603.md`](../../modules/nkbv/pilot-clinical-checklist-20260603.md) |

## Lệnh đã chạy (local)

```bash
npm run local:golden:reset
npm run cssd:demo:reset:local
npm run local:golden:verify          # 9/9 OK
npm run pilot:go-live:gate:local       # PASS
npm run verify:admin                   # PASS
npm run verify:danh-muc-routes         # 8/8 routes
npm run smoke:gsc-vst:local            # PASS
npm run gstt:scoring:audit             # 36/36 OK
npm run verify:cssd                    # 49 tests PASS
npm run test:pilot                     # 25 tests PASS
npm run pilot:dashboard:explain:local  # PASS
npx vitest run src/modules/giam-sat-nkbv/lib/nkbv-rules-engine.spec.ts  # 18 PASS
```

## E2E QLCV

`e2e/qlcv-pilot.spec.ts` — cần `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` (tài khoản sau seed local). Skip khi chưa set env.

## Đăng nhập local pilot

Sau `local:golden:reset`, dùng nhân sự trong `supabase/seeds/01-pilot-nhan-su.sql`. `trial:auth:precheck:local` → `mdm_email_no_auth` = **0**.

## Residual risk

- **G-10 / NKBV:** Chỉ automated rules engine pass — cần PO ký 5 kịch bản lâm sàng.
- **G-12:** ESLint unused-var ~100 warn — boy-scout ongoing.
- **G-11:** GSTT RLS permissive — deferred slice S-RLS-01.
