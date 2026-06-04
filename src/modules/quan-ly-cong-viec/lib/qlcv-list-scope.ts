import type { SupabaseClient } from "@supabase/supabase-js";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { hasRBACAdminSupervisionBypass } from "@/lib/server-permission";

/** Phạm vi đọc danh sách / chi tiết QLCV (admin → toàn bộ; còn lại → khoa + assignee + đề xuất của mình). */
export type QlcvListScope = {
  bypassAll: boolean;
  khoaId: string | null;
  actorStaffId: string | null;
};

export type QlcvScopeRow = {
  khoa_thuc_hien_id?: string | null;
  nguoi_phu_trach_id?: string | null;
  nguoi_tao_id?: string | null;
};

type ScopedQuery = {
  or: (filter: string) => ScopedQuery;
  eq: (column: string, value: string) => ScopedQuery;
};

const IMPOSSIBLE_ID = "00000000-0000-0000-0000-000000000000";

/** Chuỗi `.or()` phạm vi (null = không lọc / admin). */
export function buildQlcvScopeOrFilter(scope: QlcvListScope): string | null {
  if (scope.bypassAll) return null;

  if (scope.khoaId) {
    const parts = [`khoa_thuc_hien_id.eq.${scope.khoaId}`];
    if (scope.actorStaffId) {
      parts.push(`nguoi_phu_trach_id.eq.${scope.actorStaffId}`);
      parts.push(`nguoi_tao_id.eq.${scope.actorStaffId}`);
    }
    return parts.join(",");
  }

  if (scope.actorStaffId) {
    return `nguoi_phu_trach_id.eq.${scope.actorStaffId},nguoi_tao_id.eq.${scope.actorStaffId}`;
  }

  return `id.eq.${IMPOSSIBLE_ID}`;
}

/**
 * Gộp phạm vi + tìm kiếm text (AND từng cặp scope×search) — tránh `.or()` thứ hai ghi đè phạm vi.
 */
export function mergeQlcvScopeWithSearchOr(scope: QlcvListScope, searchOr: string | null): string | null {
  const scopeOr = buildQlcvScopeOrFilter(scope);
  if (!searchOr?.trim()) return scopeOr;
  if (!scopeOr) return searchOr;

  const scopeParts = scopeOr.split(",");
  const searchParts = searchOr.split(",");
  const merged: string[] = [];
  for (const s of scopeParts) {
    for (const t of searchParts) {
      merged.push(`and(${s},${t})`);
    }
  }
  return merged.join(",");
}

export async function resolveQlcvListScope(supabase: SupabaseClient): Promise<QlcvListScope> {
  const bypassAll = await hasRBACAdminSupervisionBypass();
  if (bypassAll) {
    return { bypassAll: true, khoaId: null, actorStaffId: null };
  }

  const actorStaffId = await getActorNhanSuId();
  let khoaId: string | null = null;
  if (actorStaffId) {
    const { data: ns } = await supabase
      .from("mdm_nhan_su")
      .select("khoa_id")
      .eq("id", actorStaffId)
      .maybeSingle();
    khoaId = ns?.khoa_id != null ? String(ns.khoa_id) : null;
  }

  return { bypassAll: false, khoaId, actorStaffId };
}

/** PostgREST `.or()` — khoa thực hiện HOẶC phụ trách HOẶC người tạo (đề xuất). */
export function applyQlcvListScope(
  query: ScopedQuery,
  scope: QlcvListScope,
  searchOr?: string | null,
): ScopedQuery {
  const filter = mergeQlcvScopeWithSearchOr(scope, searchOr ?? null);
  if (!filter) return query;
  return query.or(filter);
}

/** Tránh TS “excessively deep” với Supabase builder — cast tại biên. */
export function applyQlcvListScopeToQuery<T>(query: T, scope: QlcvListScope, searchOr?: string | null): T {
  return applyQlcvListScope(query as unknown as ScopedQuery, scope, searchOr) as T;
}

export function qlcvRowMatchesListScope(row: QlcvScopeRow, scope: QlcvListScope): boolean {
  if (scope.bypassAll) return true;
  const khoa = row.khoa_thuc_hien_id != null ? String(row.khoa_thuc_hien_id) : null;
  const assignee = row.nguoi_phu_trach_id != null ? String(row.nguoi_phu_trach_id) : null;
  const creator = row.nguoi_tao_id != null ? String(row.nguoi_tao_id) : null;
  const actor = scope.actorStaffId;

  if (actor && assignee === actor) return true;
  if (actor && creator === actor) return true;
  if (scope.khoaId && khoa === scope.khoaId) return true;
  return false;
}

export function assertQlcvRowInListScope(row: QlcvScopeRow, scope: QlcvListScope): void {
  if (!qlcvRowMatchesListScope(row, scope)) {
    throw new Error("Bạn không có quyền xem công việc này.");
  }
}
