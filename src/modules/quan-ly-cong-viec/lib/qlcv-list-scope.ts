import type { SupabaseClient } from "@supabase/supabase-js";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { hasRBACAdminSupervisionBypass } from "@/lib/server-permission";
import { resolveKsnkKhoaId } from "./qlcv-ksnk-server";

/**
 * Phạm vi QLCV nội bộ KSNK — module boundary tại `ensureQlcvKsnkAccess`.
 * `ksnkKhoaId` giữ lại để validate assignee thuộc khoa KSNK.
 */
export type QlcvListScope = {
  bypassAll: boolean;
  ksnkKhoaId: string;
  actorStaffId: string | null;
};

export type QlcvScopeRow = {
  nguoi_phu_trach_id?: string | null;
  nguoi_tao_id?: string | null;
};

type ScopedQuery = {
  or: (filter: string) => ScopedQuery;
};

export async function resolveQlcvListScope(supabase: SupabaseClient): Promise<QlcvListScope> {
  const ksnkKhoaId = await resolveKsnkKhoaId(supabase);
  const bypassAll = await hasRBACAdminSupervisionBypass();
  const actorStaffId = await getActorNhanSuId();
  return { bypassAll, ksnkKhoaId, actorStaffId };
}

/** Chỉ trả filter tìm kiếm text — không còn lọc cột khoa. */
export function mergeQlcvScopeWithSearchOr(_scope: QlcvListScope, searchOr: string | null): string | null {
  const trimmed = searchOr?.trim();
  return trimmed || null;
}

export function applyQlcvListScopeToQuery<T>(query: T, _scope: QlcvListScope, searchOr?: string | null): T {
  const search = searchOr?.trim();
  if (!search) return query;
  return (query as unknown as ScopedQuery).or(search) as T;
}

export function qlcvRowMatchesListScope(_row: QlcvScopeRow, _scope: QlcvListScope): boolean {
  return true;
}

export function assertQlcvRowInListScope(_row: QlcvScopeRow, _scope: QlcvListScope): void {
  // no-op — ranh giới module tại ensureQlcvKsnkAccess
}
