# Pilot BV103 — Go-live sign-off (Phase 6)

> **Mục tiêu:** Một bảng duy nhất ký trước production. Automated gate: `npm run pilot:go-live:gate`.

## A. Automated gates (IT)

| Gate | Lệnh | Pass khi | Ngày / người |
|------|------|----------|--------------|
| Engineering | `npm run verify:engineering` | Exit 0 | ☐ |
| CSSD | `npm run verify:cssd` | Exit 0 | ☐ |
| Pilot unit | `npm run test:pilot` | Exit 0 | ☐ |
| Smoke GSC/VST | `npm run smoke:gsc-vst` | Exit 0 | ☐ |
| DB precheck | `npm run trial:db:precheck` | Không blocker | ☐ |
| Auth precheck | `npm run trial:auth:precheck` | `mdm_email_no_auth` = **0** | ☐ |
| Migrate | `npm run mdm:migrate` | Apply đủ migration (gồm cycle QR) | ☐ |

```bash
npm run pilot:go-live:gate          # linked staging/prod
npm run pilot:go-live:gate:local    # docker local
```

## B. Checklist tay (NV KSNK) — ≥5/6 mỗi khối

| Khối | File | Pass | Tester | Ngày |
|------|------|------|--------|------|
| MDM / Quản trị | [`../modules/mdm/README.md`](../modules/mdm/README.md) § Pilot | ☐ /5 | | |
| GSC + VST | [`../modules/giam-sat/pilot-checklist-202606.md`](../modules/giam-sat/pilot-checklist-202606.md) | ☐ | | |
| QLCV | [`../modules/qlcv/pilot-checklist-202606.md`](../modules/qlcv/pilot-checklist-202606.md) | ☐ /6 | | |
| CSSD quy trình P3 | [`../modules/cssd/pilot-test-checklist.md`](../modules/cssd/pilot-test-checklist.md) | ☐ /6 | | |
| CSSD hóa chất P4 | [`../modules/cssd/pilot-checklist-hoa-chat-202606.md`](../modules/cssd/pilot-checklist-hoa-chat-202606.md) | ☐ /6 | | |
| CSSD thiết bị P4 | [`../modules/cssd/pilot-checklist-thiet-bi-202606.md`](../modules/cssd/pilot-checklist-thiet-bi-202606.md) | ☐ /6 | | |
| CSSD cycle QR P5 | [`../modules/cssd/pilot-checklist-cycle-qr-202606.md`](../modules/cssd/pilot-checklist-cycle-qr-202606.md) | ☐ /6 | | |
| NKBV clinical | [`../modules/nkbv/pilot-clinical-checklist-20260603.md`](../modules/nkbv/pilot-clinical-checklist-20260603.md) | ☐ /5 | | |

**NKBV / Dashboard / CSSD** có thể pilot theo **wave** — xem §C.

## C. Chiến lược env `KSNK_PILOT_CORE_MODULES`

| Wave | Env | Flag | Module mở |
|------|-----|------|-----------|
| **W1** (tuần 1–3) | Staging → Prod | `=1` | MDM + GSC/VST + QLCV |
| **W2** (CSSD week) | Staging | **tắt** flag | + CSSD toàn bộ — ký P3/P4/P5 |
| **W3** (mở rộng) | Prod | **tắt** hoặc flag mới | + NKBV, Dashboard (khi checklist pass) |

Chi tiết: [`pilot-core-modules-go-live.md`](./pilot-core-modules-go-live.md), auth: [`auth-pilot-link-sop.md`](./auth-pilot-link-sop.md).

## D. Deferred (không chặn W1)

| Hạng mục | Trạng thái |
|----------|------------|
| BRD vật tư phi-hóa-chất | Chờ workshop [`brd-vat-tu-intake-202606.md`](../modules/cssd/brd-vat-tu-intake-202606.md) |
| HIS/LIS auto | Research [`his-lis-integration-spike-20260610.md`](../reference/reports/his-lis-integration-spike-20260610.md) |

## E. Sign-off cuối

| Vai trò | Họ tên | Ngày | Chữ ký |
|---------|--------|------|--------|
| Trưởng KSNK | | | |
| IT / triển khai | | | |
| Đại diện BV103 | | | |

**Go-live W1** khi: §A pass + MDM + GSC/VST + QLCV §B ≥5/6 + auth = 0.
