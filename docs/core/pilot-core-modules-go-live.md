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

**Định nghĩa “dùng luôn”:** mỗi module ≥5/6 kịch bản PASS trên staging; `trial:db:precheck` và `trial:auth:precheck` không có blocker (auth: `mdm_email_no_auth` = 0 cho user pilot).

## Thứ tự triển khai

1. Tuần 1 — Quản trị (MDM/RBAC/tài khoản/bảng kiểm).  
2. Tuần 2 — GSC + VST.  
3. Tuần 3 — QLCV + go-live `KSNK_PILOT_CORE_MODULES=1`.
