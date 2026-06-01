# QLCV

| Đọc khi | File |
|---------|------|
| Workflow pilot | [`../../wiki/entities.md`](../../wiki/entities.md#qlcv) |
| Mapping | [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) § QLCV |

Rule: `14-cong-viec-spec-context.mdc`

## Migration (pilot)

```bash
npm run mdm:migrate:local
npx supabase stop && npx supabase start   # local: reload PostgREST
npm run verify:engineering
```

| File | Việc |
|------|------|
| `20260530150000_qlcv_fix_periodic_scheduler.sql` | Scheduler định kỳ |
| `20260531100000_qlcv_checklist_lean_workflow.sql` | Cột checklist |
| `20260531120000_qlcv_checklist_rpc_reload.sql` | RPC checklist |
| `20260531130000_qlcv_dinh_ky_view_sync.sql` | View mẫu định kỳ |
| `20260531200000_qlcv_drop_monthly_kpi_pilot.sql` | Gỡ KPI tháng (UI lean) |

## Lỗi thường gặp

**«Không tải mẫu định kỳ»** — apply `20260531130000` (view thiếu cột sau `20260530150000`).

**«checklist column … schema cache»** — `mdm:migrate` + restart Supabase; ghi checklist qua `fn_qlcv_update_checklist`.
