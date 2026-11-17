import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";

const VST_GUEST_HISTORY_DENIED_VI =
  "Tài khoản khách chỉ được xem Thống kê VST/GSC.";
const VST_HOI_DONG_HISTORY_DENIED_VI =
  "Hội đồng KSNK chỉ được xem số liệu Thống kê VST/GSC (ẩn danh), không xem lịch sử phiên có danh tính.";
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Vai đọc phiên VST có danh tính trên toàn viện, không bị siết theo khoa hay mạng lưới.
 * CHU_NHIEM_KHOA = chủ nhiệm khoa KSNK (≡ TK_KSNK, đặc tả M01 dòng 22), không phải chủ nhiệm khoa lâm sàng (VST-026).
 * Dùng chung cho danh sách (applyVstHistoryReadScope) và chi tiết phiên (getVSTSessionDetail).
 */
export function hasHospitalWideVstRead(scope: ActorKsnkScope): boolean {
  return scope.isAdmin || scope.isNhanVienKsnk || scope.roles.includes("CHU_NHIEM_KHOA");
}

/** Vai đọc toàn viện hoặc theo mạng lưới — không bị siết thêm theo vai hội đồng. */
function hasWiderVstReadRole(scope: ActorKsnkScope): boolean {
  return hasHospitalWideVstRead(scope) || scope.isMangLuoiKsnk;
}

/** @dac-ta R1.34 — HOI_DONG_KSNK (BGĐ) chỉ thấy số liệu ẩn danh, không đọc lịch sử có danh tính. */
function isHoiDongOnly(scope: ActorKsnkScope): boolean {
  return !hasWiderVstReadRole(scope) && scope.roles.includes("HOI_DONG_KSNK");
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
 * - Admin / nhân viên KSNK / chủ nhiệm khoa KSNK (CHU_NHIEM_KHOA): toàn viện (đi giám sát nhiều khoa, duyệt sửa muộn) (VST-026).
 * - Hội đồng KSNK (không kiêm vai rộng hơn): không đọc lịch sử có danh tính (VST-014).
 * - Mạng lưới: phiên do mình giám sát HOẶC phiên tại khoa được gán (không ẩn import cũ khi khoa HS = KSNK).
 */
export function applyVstHistoryReadScope<T extends { eq: (col: string, val: string) => T; or: (filter: string) => T }>(
  query: T,
  scope: ActorKsnkScope,
): T {
  if (scope.isGuestStatsOnly || isHoiDongOnly(scope)) {
    return query.eq("id", ZERO_UUID);
  }
  // Vai toàn viện, hoặc vai khác không thuộc mạng lưới/hội đồng: không lọc (khớp RLS gstt_fact_vst_sessions).
  if (hasHospitalWideVstRead(scope) || !scope.isMangLuoiKsnk) {
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

/**
 * Phiên đã tải về có nằm trong phạm vi đọc của người dùng không (chi tiết phiên, getVSTSessionDetail).
 * Cùng luật với applyVstHistoryReadScope để danh sách và chi tiết không lệch nhau (VST-026):
 * vai toàn viện thấy hết; mạng lưới thuần chỉ thấy phiên mình giám sát hoặc phiên cùng khoa.
 */
export function vstSessionVisibleToActor(
  scope: ActorKsnkScope,
  session: { khoa_id?: unknown; nguoi_giam_sat_id?: unknown },
): boolean {
  if (scope.isGuestStatsOnly || isHoiDongOnly(scope)) return false;
  if (hasHospitalWideVstRead(scope) || !scope.isMangLuoiKsnk) return true;
  const myKhoa = scope.actorKhoaId ? String(scope.actorKhoaId) : "";
  const myNs = scope.actorNhanSuId ? String(scope.actorNhanSuId) : "";
  const sessionKhoa = session.khoa_id ? String(session.khoa_id) : "";
  const sessionGs = session.nguoi_giam_sat_id ? String(session.nguoi_giam_sat_id) : "";
  return (myKhoa !== "" && sessionKhoa === myKhoa) || (myNs !== "" && sessionGs === myNs);
}
