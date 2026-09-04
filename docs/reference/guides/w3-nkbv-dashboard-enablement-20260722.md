# W3 — NKBV UAT + mở Dashboard — 2026-07-22

> Sau khi W1 đã ký §E và (khuyến nghị) W2 CSSD P3–P5 đã Pass.

## 1. NKBV clinical UAT (DOM-08)

Checklist: [`../../modules/nkbv/pilot-clinical-checklist-20260603.md`](../../modules/nkbv/pilot-clinical-checklist-20260603.md)

| # | Ai | Việc |
|---|----|------|
| 2 | Khoa lâm sàng | Ca `CHO_XAC_MINH` → điền form → `CHO_DUYET` |
| 3 | KSNK | Phê duyệt / Loại trừ |
| 4 | KSNK | Import trùng MD5 — không nhân đôi |
| 5 | KSNK | SSI ↔ CSSD `CssdTraceLink` |

**Engineering ready** từ 2026-07-09 — chỉ còn chữ ký khoa.

Env: tắt `KSNK_PILOT_CORE_MODULES` trên staging để `/giam-sat-nkbv` không 404.

## 2. Dashboard / Báo cáo (sau NKBV Pass hoặc song song IT)

| Màn | Path | Checklist |
|-----|------|-----------|
| Báo cáo tổng hợp | `/bao-cao-tong-hop` | [`../../modules/dashboard/README.md`](../../modules/dashboard/README.md) Pilot DoD ≥5/5 ý |
| Thống kê VST/GSC | `/thong-ke/vst`, `/thong-ke/gsc` | Role Mạng lưới / Khách xem được đúng phạm vi |
| Command center | `/` (module dashboard) | KPI load; không đổi công thức CCS không qua Spec change |

Verify:

```bash
npm run verify:engineering
```

## 3. Production mở W3

1. Tick §B NKBV + Dashboard trên [`pilot-go-live-signoff-202606.md`](../../core/pilot-go-live-signoff-202606.md).
2. Tắt (hoặc không set) `KSNK_PILOT_CORE_MODULES` trên prod **hoặc** dùng flag wave riêng nếu IT đã chuẩn bị.
3. Thông báo user: menu hiện thêm NKBV + Báo cáo.

## 4. Không làm trong W3

- HIS/LIS auto — xem [`his-lis-next-steps-20260722.md`](./his-lis-next-steps-20260722.md)
- CDC baseline DB unused — giữ MVP (gap DOM-09)
