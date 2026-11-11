-- AR-7 (2026-11-11, PO chọn «xóa hẳn»): dọn registry/gợi ý MDM trỏ bảng đã DROP.
-- Local trước khi áp: 105 dòng `sys_mdm_registry` (đều is_active=false) + 310 dòng
-- `sys_mdm_suggestion` (DONE/REJECTED) có table_name không còn tồn tại (dm_*, user_roles,
-- role_permissions, su_co, giam_sat_vst…). Không có trigger nào trên các bảng đó để gỡ;
-- trigger `trg_mdm_field_registry_on_change` chỉ chạy INSERT/UPDATE nên DELETE không đụng
-- trigger bảo vệ của 21 dòng đang bật. Idempotent.

DELETE FROM public.sys_mdm_registry
WHERE to_regclass(format('public.%I', table_name)) IS NULL;

DELETE FROM public.sys_mdm_suggestion
WHERE to_regclass(format('public.%I', table_name)) IS NULL
  AND status <> 'OPEN';
