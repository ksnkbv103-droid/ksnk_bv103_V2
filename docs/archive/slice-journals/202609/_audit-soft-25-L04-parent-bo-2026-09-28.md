# Soft audit — 25 CSSD-L04 parent_bo_id schema draft — 2026-09-28

| Trường | Giá trị |
|--------|---------|
| Ngày | 2026-09-28 ~06:51 ICT |
| Tip | `7f0fc61` · table **verified** `public.cssd_dm_bo_dung_cu` (+ `is_implant`) |
| Neo | `25-CSSD-L04-PARENT-BO-SCHEMA-AB-20260928.md` Domain A |
| Không | apply migrate · UI tách Đóng gói · L07/L08/18b |

## Done

- Draft `supabase/migrations/20260928065100_cssd_parent_bo_heat_split.sql`
  - `parent_bo_id` uuid NULL FK → `cssd_dm_bo_dung_cu(id)` ON DELETE RESTRICT
  - `vai_tro_tach` CHECK `CHIU_NHIET`\|`KHONG_CHIU_NHIET`
  - self-parent check · index partial
  - view `v_cssd_bo_heat_split_hint` derive `require_split` từ BOM `is_chiu_nhiet` lẫn
- Tip còn `registerSplitSub` trên CompositionReconcilePanel — **không gỡ trong lát schema**; wire/gỡ UI = lát sau khi migrate applied.

## UAT (sau apply)

1. Mẹ BOM lẫn nhiệt → `require_split=true` trên view.
2. Thành phần có `parent_bo_id` + `vai_tro_tach`; mẹ `parent_bo_id` NULL.
3. Đóng gói: chưa bắt buộc 0 UI tách cho đến Soft wire (DoD tick riêng).
