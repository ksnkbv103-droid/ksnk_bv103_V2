# Pilot BV103 — Go-live sign-off (Phase 6)

> **Mục tiêu:** Một bảng duy nhất ký trước production. Automated gate: `npm run pilot:go-live:gate`.  
> **Cải tổ local 2026-07-03:** [`pilot-module-automated-gates-20260703.md`](../reference/reports/pilot-module-automated-gates-20260703.md)

## A. Automated gates (IT)

| Gate | Lệnh | Pass khi | Ngày / người |
|------|------|----------|--------------|
| Engineering | `npm run verify:engineering` | Exit 0 | ☑ 2026-07-03 local |
| CSSD | `npm run verify:cssd` | Exit 0 | ☑ 2026-07-03 local |
| Pilot unit | `npm run test:pilot` | Exit 0 | ☑ 2026-07-03 local |
| Smoke GSC/VST | `npm run smoke:gsc-vst:local` | Exit 0 | ☑ 2026-07-03 local |
| DB precheck | `npm run trial:db:precheck:local` | Không blocker | ☑ 2026-07-03 local |
| Auth precheck | `npm run trial:auth:precheck:local` | `mdm_email_no_auth` = **0** | ☑ 2026-07-03 local |
| Local golden | `npm run local:golden:verify` | 10/10 probe OK | ☑ 2026-07-03 local |
| Repo hygiene | `npm run repo:hygiene` | No blocking | ☑ 2026-07-03 |
| Migrate | `npm run mdm:migrate:local` | Head `20260703101000` | ☑ 2026-07-03 local |
| Full gate | `npm run pilot:go-live:gate:local` | Exit 0 | ☑ 2026-07-03 local |
| Full verify | `npm run verify` | lint + layout + build | ☑ 2026-06-30 local |

```bash
npm run local:golden:reset      # db reset + migrate + rbac sync (local)
npm run local:golden:verify     # 10 probe sau reset
npm run pilot:go-live:gate:local
```

## B. Checklist tay (NV KSNK) — ≥5/6 mỗi khối

> Hướng dẫn cho PO: [`po-uat-signoff-202607.md`](./po-uat-signoff-202607.md) · Gói đóng W1: [`../reference/guides/w1-go-live-execution-pack-20260722.md`](../reference/guides/w1-go-live-execution-pack-20260722.md)

### B1 — W1 (bắt buộc để go-live)

| Khối | File | Pass | Tester | Ngày |
|------|------|------|--------|------|
| MDM / Quản trị | [`../modules/mdm/README.md`](../modules/mdm/README.md) § Pilot | ☐ /5 | | |
| GSC + VST | [`../modules/giam-sat/pilot-checklist-202606.md`](../modules/giam-sat/pilot-checklist-202606.md) | ☐ | | |
| QLCV | [`../modules/qlcv/pilot-checklist-202606.md`](../modules/qlcv/pilot-checklist-202606.md) | ☐ /6 | | |

### B2 — W2 CSSD ([gói UAT](../reference/guides/w2-cssd-uat-pack-20260722.md))

| Khối | File | Pass | Tester | Ngày |
|------|------|------|--------|------|
| CSSD quy trình P3 | [`../modules/cssd/pilot-test-checklist.md`](../modules/cssd/pilot-test-checklist.md) | ☐ /6 | | |
| CSSD hóa chất P4 | [`../modules/cssd/pilot-checklist-hoa-chat-202606.md`](../modules/cssd/pilot-checklist-hoa-chat-202606.md) | ☐ /6 | | |
| CSSD thiết bị P4 | [`../modules/cssd/pilot-checklist-thiet-bi-202606.md`](../modules/cssd/pilot-checklist-thiet-bi-202606.md) | ☐ /6 | | |
| CSSD cycle QR P5 | [`../modules/cssd/pilot-checklist-cycle-qr-202606.md`](../modules/cssd/pilot-checklist-cycle-qr-202606.md) | ☐ /6 | | |

### B3 — W3 ([enablement](../reference/guides/w3-nkbv-dashboard-enablement-20260722.md))

| Khối | File | Pass | Tester | Ngày |
|------|------|------|--------|------|
| Dashboard / Báo cáo | [`../modules/dashboard/README.md`](../modules/dashboard/README.md) | ☐ /5 | | |
| NKBV clinical | [`../modules/nkbv/pilot-clinical-checklist-20260603.md`](../modules/nkbv/pilot-clinical-checklist-20260603.md) | ☐ /5 | | |

**NKBV / Dashboard / CSSD** pilot theo **wave** — xem §C. W1 **không** chờ B2/B3.

## C. Chiến lược env `KSNK_PILOT_CORE_MODULES`

| Wave | Env | Flag | Module mở |
|------|-----|------|-----------|
| **W1** (tuần 1–3) | Staging → Prod | `=1` | MDM + GSC/VST + QLCV |
| **W2** (CSSD week) | Staging | **tắt** flag | + CSSD toàn bộ — ký P3/P4/P5 |
| **W3** (mở rộng) | Prod | **tắt** hoặc flag mới | + NKBV, Dashboard (khi checklist pass) |

Chi tiết: [`pilot-core-modules-go-live.md`](./pilot-core-modules-go-live.md), auth: [`auth-pilot-link-sop.md`](../reference/guides/auth-pilot-link-sop.md).

## D. Deferred (không chặn W1)

| Hạng mục | Trạng thái |
|----------|------------|
| BRD vật tư phi-hóa-chất | Chờ workshop [`brd-vat-tu-intake-202606.md`](../modules/cssd/brd-vat-tu-intake-202606.md) (agenda 2026-07-22) |
| HIS/LIS auto | Next steps [`his-lis-next-steps-20260722.md`](../reference/guides/his-lis-next-steps-20260722.md) · spike [`his-lis-integration-spike-20260610.md`](../archive/reports/his-lis-integration-spike-20260610.md) |
| CAP_PHAT soft vs hard | **Chốt soft-warning** [`cap-phat-soft-warning-decision-20260722.md`](../modules/cssd/cap-phat-soft-warning-decision-20260722.md) |
| Sự cố / backup | [`incident-backup-playbook.md`](../reference/guides/incident-backup-playbook.md) |

## E. Sign-off cuối

| Vai trò | Họ tên | Ngày | Chữ ký |
|---------|--------|------|--------|
| Trưởng KSNK | | | |
| IT / triển khai | | | |
| Đại diện BV103 | | | |

**Go-live W1** khi: §A pass + MDM + GSC/VST + QLCV §B ≥5/6 + auth = 0.

## F. Ops checklist bổ sung (2026-09-04) — CSSD UAT / cloud

SSOT chi tiết: [`../reference/guides/ops-go-live.md`](../reference/guides/ops-go-live.md) · quyết định [`domain-decisions-cssd-instrument.md`](domain-decisions-cssd-instrument.md).

| Hạng mục | Pass | ☐ |
|----------|------|---|
| vercel deploymentEnabled = false | Không auto-deploy | ☐ |
| Mở cloud sau Phase 0-2 + golden verify + user approve commit | Không migrate/deploy sớm | ☐ |
| Tắt KSNK_PILOT_CORE_MODULES trước UAT CSSD | Route cssd mở | ☐ |
| trial:auth:precheck auth link NV | mdm_email_no_auth = 0 blocker | ☐ |
| BOM unique ADMIN gộp trùng rồi apply 20260904120000_cssd_bom_chi_tiet_unique_bo_loai_active | D6 khi PO duyệt | ☐ |
| npm run pilot:go-live:gate + wave env | Exit 0 + ký §B | ☐ |
