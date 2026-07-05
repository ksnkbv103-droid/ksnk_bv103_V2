import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";

export const VST_GUEST_HISTORY_DENIED_VI =
  "Tài khoản khách chỉ được xem Thống kê VST/GSC.";

export function assertVstHistoryAccess(
  scope: ActorKsnkScope,
): { ok: true } | { ok: false; error: string } {
  if (scope.isGuestStatsOnly) {
    return { ok: false, error: VST_GUEST_HISTORY_DENIED_VI };
  }
  return { ok: true };
}

/**
 * Phạm vi đọc lịch sử VST:
 * - Khách thống kê: không đọc lịch sử/chi tiết phiên.
 * - Admin / nhân viên KSNK: toàn viện (đi giám sát nhiều khoa).
 * - Mạng lưới: phiên do mình giám sát HOẶC phiên tại khoa được gán (không ẩn import cũ khi khoa HS = KSNK).
 */
export function applyVstHistoryReadScope<T extends { eq: (col: string, val: string) => T; or: (filter: string) => T }>(
  query: T,
  scope: ActorKsnkScope,
): T {
  if (scope.isGuestStatsOnly) {
    return query.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  if (scope.isAdmin || scope.isNhanVienKsnk) {
    return query;
  }
  if (!scope.isMangLuoiKsnk) {
    return query;
  }

  const parts: string[] = [];
  if (scope.actorNhanSuId) {
    parts.push(`nguoi_giam_sat_id.eq.${scope.actorNhanSuId}`);
  }
  if (scope.actorKhoaId) {
    parts.push(`khoa_id.eq.${scope.actorKhoaId}`);
  }
  if (parts.length === 0) {
    return query.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  return query.or(parts.join(","));
}
