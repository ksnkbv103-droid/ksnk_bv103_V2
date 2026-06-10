# Pilot gấp — Quản trị + Giám sát + QLCV

> SSOT vận hành khi triển khai **chỉ 3 khối**; module khác đóng bằng env.

## Bật trên staging/production

```bash
# .env.local hoặc Vercel env
KSNK_PILOT_CORE_MODULES=1
```

- **Sidebar:** ẩn Dashboard, Báo cáo tổng hợp, NKBV, toàn bộ CSSD.
- **Proxy:** trả 404 cho route CSSD, `/giam-sat-nkbv`, `/bao-cao-tong-hop`.
- **QLCV:** vẫn bật (`isModuleEnabled('QLCV')` = true).

**Không** dùng `KSNK_PILOT_FOUR_MODULES=1` cùng lúc nếu cần QLCV — pilot-4 **chặn** `/quan-ly-cong-viec`.

## Phase 0 — Precheck (mỗi môi trường)

| Lệnh | Ý nghĩa |
|------|---------|
| `npm run mdm:migrate` | Linked staging/prod |
| `npm run trial:db:precheck` | MDM + GSC/VST + QLCV + RPC |
| `npm run trial:auth:precheck` | Auth ↔ `mdm_nhan_su` |
| `npm run verify:admin` | Contract quản trị + engineering |
| `npm run trial:audit:probe` | Không còn trigger `*audit*` trên GSC/VST (sau migrate) |

**Lỗi GSC `sys_audit_log does not exist` (42P01):** trigger audit sót trên DB — apply migration `20260605100000_detach_orphan_audit_triggers.sql` (hoặc `mdm:migrate`).

Local: Docker + `npx supabase start` → `mdm:migrate:local` → `*:local` scripts.

## Checklist tay (ký tên trước go-live)

| Module | File |
|--------|------|
| Quản trị | [`../modules/mdm/README.md`](../modules/mdm/README.md) § Pilot checklist |
| Giám sát | [`../modules/giam-sat/pilot-checklist-202606.md`](../modules/giam-sat/pilot-checklist-202606.md) |
| QLCV | [`../modules/qlcv/pilot-checklist-202606.md`](../modules/qlcv/pilot-checklist-202606.md) |
| CSSD quy trình | [`../modules/cssd/pilot-test-checklist.md`](../modules/cssd/pilot-test-checklist.md) |
| CSSD hóa chất / thiết bị | [`../modules/cssd/pilot-checklist-hoa-chat-202606.md`](../modules/cssd/pilot-checklist-hoa-chat-202606.md), [`pilot-checklist-thiet-bi-202606.md`](../modules/cssd/pilot-checklist-thiet-bi-202606.md) |
| CSSD cycle QR | [`../modules/cssd/pilot-checklist-cycle-qr-202606.md`](../modules/cssd/pilot-checklist-cycle-qr-202606.md) |
| NKBV clinical | [`../modules/nkbv/pilot-clinical-checklist-20260603.md`](../modules/nkbv/pilot-clinical-checklist-20260603.md) |

**Go-live tổng (Phase 6):** [`pilot-go-live-signoff-202606.md`](pilot-go-live-signoff-202606.md) · `npm run pilot:go-live:gate`

**Định nghĩa “dùng luôn”:** mỗi module ≥5/6 kịch bản PASS trên staging; `trial:db:precheck` và `trial:auth:precheck` không có blocker (auth: `mdm_email_no_auth` = 0 cho user pilot).

## Mở rộng CSSD sau pilot 3 module (Phase 4.5)

1. Trên **staging CSSD week**: **tắt** `KSNK_PILOT_CORE_MODULES` (hoặc không set) để route `/cssd-*` mở.
2. Chạy checklist hóa chất + thiết bị; quy trình P3 ≥5/6.
3. `npm run trial:auth:precheck` → `mdm_email_no_auth` = 0 (link Auth cho email trong `mdm_nhan_su.extra_data`).
4. Go-live production: bật lại pilot-3 **hoặc** tắt hẳn flag khi CSSD đã ký đủ checklist.

```bash
npm run trial:auth:precheck        # linked
npm run trial:auth:precheck:local  # docker local
```

## Phase 6 — Go-live closure

**Bảng ký tổng:** [`pilot-go-live-signoff-202606.md`](./pilot-go-live-signoff-202606.md)

**Automated gate:**

```bash
npm run pilot:go-live:gate         # linked: DB + auth + verify + smoke
npm run pilot:go-live:gate:local   # docker local
```

**Auth link SOP:** [`auth-pilot-link-sop.md`](./auth-pilot-link-sop.md)

### Wave rollout (tóm tắt)

| Wave | `KSNK_PILOT_CORE_MODULES` | Module |
|------|---------------------------|--------|
| W1 go-live | `1` | MDM + GSC/VST + QLCV |
| W2 CSSD UAT | tắt | + CSSD (checklist P3–P5) |
| W3 mở rộng | tắt | + NKBV, Dashboard (sau UAT) |

## Thứ tự triển khai

1. Tuần 1 — Quản trị (MDM/RBAC/tài khoản/bảng kiểm).  
2. Tuần 2 — GSC + VST.  
3. Tuần 3 — QLCV + go-live `KSNK_PILOT_CORE_MODULES=1`.
