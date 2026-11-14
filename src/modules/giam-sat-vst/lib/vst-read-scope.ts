import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";

const VST_GUEST_HISTORY_DENIED_VI =
  "Tài khoản khách chỉ được xem Thống kê VST/GSC.";
const VST_HOI_DONG_HISTORY_DENIED_VI =
  "Hội đồng KSNK chỉ được xem số liệu Thống kê VST/GSC (ẩn danh), không xem lịch sử phiên có danh tính.";
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

/** Vai đọc toàn viện hoặc theo mạng lưới — không bị siết thêm theo vai khoa/hội đồng. */
function hasWiderVstReadRole(scope: ActorKsnkScope): boolean {
  return scope.isAdmin || scope.isNhanVienKsnk || scope.isMangLuoiKsnk;
}

/** @dac-ta R1.34 — HOI_DONG_KSNK (BGĐ) chỉ thấy số liệu ẩn danh, không đọc lịch sử có danh tính. */
function isHoiDongOnly(scope: ActorKsnkScope): boolean {
  return !hasWiderVstReadRole(scope) && scope.roles.includes("HOI_DONG_KSNK") && !scope.roles.includes("CHU_NHIEM_KHOA");
}

/** @dac-ta R1.34 — ĐDT/chủ nhiệm khoa chỉ đọc danh sách có danh tính của khoa mình quản lý. */
export function isVstKhoaOnlyScope(scope: ActorKsnkScope): boolean {
  return !hasWiderVstReadRole(scope) && !scope.isGuestStatsOnly && scope.roles.includes("CHU_NHIEM_KHOA");
}

export function assertVstHistoryAccess(
  scope: ActorKsnkScope,
): { ok: true } | { ok: false; error: string } {
  if (scope.isGuestStatsOnly) {
    return { ok: false, error: VST_GUEST_HISTORY_DENIED_VI };
  }
  if (isHoiDongOnly(scope)) {
    return { ok: false, error: VST_HOI_DONG_HISTORY_DENIED_VI };
  }
  return { ok: true };
}

/**
 * Phạm vi đọc lịch sử VST:
 * - Khách thống kê: không đọc lịch sử/chi tiết phiên.
 * - Admin / nhân viên KSNK: toàn viện (đi giám sát nhiều khoa).
 * - Chủ nhiệm khoa (không kiêm vai rộng hơn): chỉ khoa mình. Hội đồng KSNK: không đọc lịch sử có danh tính (VST-014).
 * - Mạng lưới: phiên do mình giám sát HOẶC phiên tại khoa được gán (không ẩn import cũ khi khoa HS = KSNK).
 */
export function applyVstHistoryReadScope<T extends { eq: (col: string, val: string) => T; or: (filter: string) => T }>(
  query: T,
  scope: ActorKsnkScope,
): T {
  if (scope.isGuestStatsOnly || isHoiDongOnly(scope)) {
    return query.eq("id", ZERO_UUID);
  }
  if (scope.isAdmin || scope.isNhanVienKsnk) {
    return query;
  }
  if (!scope.isMangLuoiKsnk) {
    if (isVstKhoaOnlyScope(scope)) {
      return scope.actorKhoaId ? query.eq("khoa_id", scope.actorKhoaId) : query.eq("id", ZERO_UUID);
    }
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
    return query.eq("id", ZERO_UUID);
  }
  return query.or(parts.join(","));
}
