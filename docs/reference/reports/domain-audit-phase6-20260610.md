# Phase 6 — Go-live closure (2026-06-10)

> Tiếp theo [domain-audit-phase5-20260610.md](./domain-audit-phase5-20260610.md)

## Đã triển khai

| ID | Việc | Trạng thái | Artifact |
|----|------|------------|----------|
| 6.1 | Sign-off tổng hợp | **Done** | [`pilot-go-live-signoff-202606.md`](../../core/pilot-go-live-signoff-202606.md) |
| 6.2 | Auth + flag strategy | **Done** | [`auth-pilot-link-sop.md`](../../core/auth-pilot-link-sop.md), wave §C sign-off |
| 6.3 | BRD vật tư migration | **Deferred** | Intake chưa đóng |
| 6.4 | In nhãn cycle QR sau BOM | **Done** | `BomChecklistModal` + `usePrint`; `persistBomCheckpoint` trả `ma_cycle_qr` |
| 6.5 | HIS/LIS spike | **Done (research)** | [`his-lis-integration-spike-20260610.md`](./his-lis-integration-spike-20260610.md) |

### Automated gate

```bash
npm run pilot:go-live:gate          # linked
npm run pilot:go-live:gate:local    # local docker
```

Chuỗi: `trial:db:precheck` + `trial:auth:precheck` + `verify:engineering` + `verify:cssd` + `test:pilot` + `smoke:gsc-vst` + checklist reminder script.

Production ship (migrate + build): `npm run pilot:ship`

---

## Còn cần người (go-live thật)

1. Ký §B tất checklist trong sign-off doc
2. `mdm_email_no_auth` = 0 ([`auth-pilot-link-sop.md`](../../core/auth-pilot-link-sop.md))
3. Chọn wave W1/W2/W3 và set env production
4. §E chữ ký Trưởng KSNK + IT + BV103

---

## Domain audit — tóm tắt chuỗi Phase 0→6

| Phase | Trọng tâm |
|-------|-----------|
| 0 | Gates, rubric, gap register |
| 1 | Pilot core GSC/VST hardening |
| 2 | Dashboard VST RPC perf |
| 3 | CSSD workflow + ledger Q2 |
| 4 | Hóa chất / thiết bị + layout SubNav |
| 5 | Cycle QR + NKBV coverage audit |
| 6 | Go-live sign-off + gate script |

**Không còn phase code bắt buộc** trước W1 — chỉ manual sign-off và ops.
