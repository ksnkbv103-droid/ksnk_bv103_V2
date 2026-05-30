-- Migration: View phẳng v_sys_audit_log_full + index hỗ trợ filter / sort cho UI audit trail.
-- Date: 26/05/2026
-- Slice 6 (admin-module hardening plan).
--
-- Bối cảnh:
--   * `audit-log.actions.ts` đang query 2 round-trip:
--       (1) SELECT * FROM sys_audit_log + filter
--       (2) SELECT auth_user_id, ho_ten, email FROM v_mdm_nhan_su_full WHERE auth_user_id IN (...)
--     → N+1 nhẹ; nhưng quan trọng hơn: `getDistinctAuditTables` quét toàn bảng để dedup table_name,
--       với bảng growth ~10K rows/tháng sẽ tốn dần.
--
-- Kết quả mong đợi:
--   * View `v_sys_audit_log_full` join sẵn user → action chỉ còn 1 query.
--   * Index `idx_sys_audit_log_changed_at_desc` cho ORDER BY + range pagination.
--   * Index `idx_sys_audit_log_table_name`, `idx_sys_audit_log_changed_by` cho filter ROW=*.
--   * View `v_sys_audit_table_choices` precompute distinct table_name + count (cache <1ms).

-- ----------------------------------------------------
-- 1. Index phục vụ ORDER BY changed_at DESC + filter range
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sys_audit_log_changed_at_desc
  ON public.sys_audit_log (changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sys_audit_log_table_name_changed_at
  ON public.sys_audit_log (table_name, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sys_audit_log_action_changed_at
  ON public.sys_audit_log (action, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sys_audit_log_changed_by
  ON public.sys_audit_log (changed_by)
  WHERE changed_by IS NOT NULL;

-- ----------------------------------------------------
-- 2. View phẳng: 1 query duy nhất cho UI audit trail
-- ----------------------------------------------------
CREATE OR REPLACE VIEW public.v_sys_audit_log_full WITH (security_invoker='true') AS
SELECT
  al.id,
  al.table_name,
  al.record_id,
  al.action,
  al.old_data,
  al.new_data,
  al.changed_by,
  al.changed_at,
  ns.ho_ten            AS user_fullname,
  ns.extra_data->>'email' AS user_email,
  ns.ma_nv             AS user_ma_nv
FROM public.sys_audit_log al
LEFT JOIN public.mdm_nhan_su ns ON ns.auth_user_id = al.changed_by;

COMMENT ON VIEW public.v_sys_audit_log_full IS
  'View phẳng cho UI audit trail: join sẵn người thao tác (ho_ten, email, ma_nv).';

-- ----------------------------------------------------
-- 3. View distinct table_name cho dropdown filter
-- ----------------------------------------------------
CREATE OR REPLACE VIEW public.v_sys_audit_table_choices WITH (security_invoker='true') AS
SELECT
  table_name,
  count(*)::bigint AS log_count,
  max(changed_at) AS last_changed_at
FROM public.sys_audit_log
GROUP BY table_name;

COMMENT ON VIEW public.v_sys_audit_table_choices IS
  'Distinct table_name + count cho dropdown filter UI; tránh quét toàn bảng client-side.';
