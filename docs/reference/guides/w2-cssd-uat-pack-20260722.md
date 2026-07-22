# W2 CSSD — Gói UAT staging — 2026-07-22

## Env

```bash
# Staging CSSD week: tắt pilot-3 để mở route /cssd-*
# (không set KSNK_PILOT_CORE_MODULES, hoặc =0)
unset KSNK_PILOT_CORE_MODULES
```

## Thứ tự ký tay

| # | Checklist | Pass |
|---|-----------|------|
| 1 | [`../../modules/cssd/pilot-test-checklist.md`](../../modules/cssd/pilot-test-checklist.md) P3 (≥5/6) + **Training soft-warning** | ☐ |
| 2 | [`../../modules/cssd/pilot-checklist-hoa-chat-202606.md`](../../modules/cssd/pilot-checklist-hoa-chat-202606.md) P4 | ☐ |
| 3 | [`../../modules/cssd/pilot-checklist-thiet-bi-202606.md`](../../modules/cssd/pilot-checklist-thiet-bi-202606.md) P4 | ☐ |
| 4 | [`../../modules/cssd/pilot-checklist-cycle-qr-202606.md`](../../modules/cssd/pilot-checklist-cycle-qr-202606.md) P5 | ☐ |

## Quyết định cấp phát

SSOT: [`../../modules/cssd/cap-phat-soft-warning-decision-20260722.md`](../../modules/cssd/cap-phat-soft-warning-decision-20260722.md) — **giữ soft-warning**.

## Verify máy trước UAT

```bash
npm run verify:cssd
npm run mdm:migrate   # hoặc :local
npm run trial:auth:precheck
```

Ghi Pass/Tester/Ngày vào §B [`../../core/pilot-go-live-signoff-202606.md`](../../core/pilot-go-live-signoff-202606.md).
