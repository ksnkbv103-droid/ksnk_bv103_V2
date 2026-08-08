# QLCV

| Đọc khi | File |
|---------|------|
| Workflow pilot | [`../../wiki/entities.md`](../../wiki/entities.md#qlcv) |
| Mapping | [`../../core/implementation-mapping.md`](../../core/implementation-mapping.md) § QLCV |
| UI thống nhất (B+3 S2) | [`../../reference/architecture/ui-consistency-program-20260802.md`](../../reference/architecture/ui-consistency-program-20260802.md) § S2 |

Rule: `14-cong-viec-spec-context.mdc`

## Pilot gấp

Checklist tay: [`pilot-checklist-202606.md`](pilot-checklist-202606.md) · Go-live: [`../../core/pilot-core-modules-go-live.md`](../../core/pilot-core-modules-go-live.md)

Ma trận UI→Action→RPC: [`continuity-matrix-20260720.md`](continuity-matrix-20260720.md)

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
| `20260604120000_qlcv_text_check_codes.sql` | TEXT+CHECK trang_thai/loai |
| `20260606160000_qlcv_sync_overdue_modernize.sql` | Cron quá hạn → `qlcv_fact_*`; DROP analytics orphan |
| `20260607100000_qlcv_text_only_schema_cleanup.sql` | DROP FK cols + việc con; badge `mau_sac` trên view; IMPORT lô |
| `20260617120000_qlcv_ksnk_only_scope.sql` | KSNK-only: purge giao ngoài KSNK |
| `20260617140000_qlcv_phase2_transition_rls.sql` | `fn_qlcv_transition` + RLS SELECT strict KSNK |
| `20260617160000_qlcv_lean_nhat_ky_drop_khoa.sql` | `nhat_ky` jsonb; DROP `khoa_thuc_hien_id` |
| `20260709120000` / `20260709140000` | Harden checklist RPC; CHECK 7 mã trạng thái |
| `20260729140000_qlcv_dinh_ky_yearly.sql` | Chu kỳ YEARLY + spawn RPC |
| `20260729170000_qlcv_assignment_fields.sql` | Vị trí / phối hợp / theo dõi + view + spawn |
| `20260731120000_qlcv_weekly_assignment_plan.sql` | *(lịch sử)* Bảng phân công tuần — đã gỡ bởi `20260802140000` |
| `20260731140000_qlcv_schedule_location_chuong_trinh.sql` | Giờ + `dia_diem_khoa_id`; *(lịch sử)* `chuong_trinh` — đã gỡ bởi `20260802140000` |
| `20260731160000_qlcv_ke_hoach_nam_nhiem_vu_moc.sql` | *(lịch sử)* Kế hoạch năm + mốc — nhiệm vụ giữ; gỡ container/mốc ở `20260802140000` |
| `20260802140000_qlcv_drop_ke_hoach_nam_tuan_moc.sql` | **A+2:** DROP tuần / chuong_trinh / mốc; `nhiem_vu` độc lập; wipe trial; view + spawn cập nhật |

## Lỗi thường gặp

**«Không tải mẫu định kỳ»** — apply `20260531130000` (view thiếu cột sau `20260530150000`).

**«schema cache / cột checklist / PGRST204»** — thường là **cloud thiếu migration mới** (vd. `20260729170000` vị trí/phối hợp/theo dõi), không phải thiếu checklist. App trỏ `.env` cloud → `npm run mdm:migrate` (không chỉ local). Local: `mdm:migrate:local` + `supabase stop && start`. Ghi checklist qua `fn_qlcv_update_checklist`.
