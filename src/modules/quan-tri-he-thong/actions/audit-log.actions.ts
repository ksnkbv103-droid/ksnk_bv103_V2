"use server";

/**
 * Audit log server actions cho `quan-tri-he-thong/views/AuditTrailView`.
 *
 * Slice 6 (26/05/2026):
 * - Đọc qua view phẳng `v_sys_audit_log_full` (đã join `mdm_nhan_su`) → 1 round-trip.
 * - Dropdown table_name dùng `v_sys_audit_table_choices` (GROUP BY precompute) thay vì quét toàn bảng.
 * - Sort/filter dựa trên 4 index mới: `idx_sys_audit_log_changed_at_desc`,
 *   `idx_sys_audit_log_table_name_changed_at`, `idx_sys_audit_log_action_changed_at`,
 *   `idx_sys_audit_log_changed_by`.
 *
 * Slice 4 follow-up (26/05/2026):
 * - Chuyển sang `createServerSupabaseUserClient()` để RLS `sys_audit_log_select_policy`
 *   thực sự kick in. Policy cho phép: ADMIN role / có PHAN_QUYEN.view / changed_by = auth.uid()
 *   / changed_by IS NULL (system events). verifyPermission("PHAN_QUYEN", "view") đã chặn
 *   user không có quyền từ trước; RLS là defense-in-depth.
 *
 * Migration kèm theo: `supabase/migrations/20260526000002_v_sys_audit_log_full_and_indexes.sql`.
 */

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "./verify-permission";

export interface AuditLogFilters {
  tableName?: string;
  action?: "INSERT" | "UPDATE" | "DELETE";
  changedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogRecord {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
  user_fullname?: string;
  user_email?: string;
  user_ma_nv?: string;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

function clampLimit(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.trunc(value)), MAX_LIMIT);
}

/**
 * Fetch system audit logs with pagination and filters.
 * Yêu cầu quyền PHAN_QUYEN.view; RLS `sys_audit_log_select_policy` đảm bảo
 * Admin / PHAN_QUYEN.view / author / no-actor mới đọc được (defense-in-depth).
 */
export async function getSystemAuditLogs(filters: AuditLogFilters) {
  try {
    await verifyPermission("PHAN_QUYEN", "view");

    const supabase = await createServerSupabaseUserClient();
    const limit = clampLimit(filters.limit);
    const offset = Math.max(0, filters.offset ?? 0);

    let query = supabase
      .from("v_sys_audit_log_full")
      .select("*", { count: "exact" });

    if (filters.tableName) {
      query = query.eq("table_name", filters.tableName);
    }
    if (filters.action) {
      query = query.eq("action", filters.action);
    }
    if (filters.changedBy) {
      query = query.eq("changed_by", filters.changedBy);
    }
    if (filters.dateFrom) {
      query = query.gte("changed_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("changed_at", filters.dateTo);
    }

    query = query
      .order("changed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;
    if (error) throw error;

    const records: AuditLogRecord[] = (logs ?? []).map((log) => ({
      id: log.id,
      table_name: log.table_name,
      record_id: log.record_id,
      action: log.action as "INSERT" | "UPDATE" | "DELETE",
      old_data: log.old_data,
      new_data: log.new_data,
      changed_by: log.changed_by,
      changed_at: log.changed_at,
      user_fullname: log.user_fullname ?? (log.changed_by ? "" : "Hệ thống"),
      user_email: log.user_email ?? "",
      user_ma_nv: log.user_ma_nv ?? "",
    }));

    return {
      success: true as const,
      data: records,
      totalCount: count ?? 0,
    };
  } catch (err: any) {
    console.error("[AuditLog Action] Query Failure:", err?.message);
    return {
      success: false as const,
      error: err?.message || "Không thể tải nhật ký hệ thống.",
    };
  }
}

/**
 * Get distinct table names (với log_count + last_changed_at) cho filter dropdown.
 * Đọc từ view `v_sys_audit_table_choices` đã GROUP BY ở DB.
 */
export async function getDistinctAuditTables() {
  try {
    await verifyPermission("PHAN_QUYEN", "view");
    const supabase = await createServerSupabaseUserClient();

    const { data, error } = await supabase
      .from("v_sys_audit_table_choices")
      .select("table_name, log_count, last_changed_at")
      .order("last_changed_at", { ascending: false });

    if (error) throw error;

    return {
      success: true as const,
      data: (data ?? []).map((row) => row.table_name).filter(Boolean) as string[],
    };
  } catch (err: any) {
    return {
      success: false as const,
      error: err?.message,
    };
  }
}
