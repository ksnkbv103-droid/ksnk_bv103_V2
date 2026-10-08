import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";
import type { GscLoaiGiamSatRoute } from "./gsc-app-paths";

const GSC_HISTORY_DENIED = "Tài khoản khách chỉ được xem Thống kê VST/GSC.";
const EMPTY_SCOPE_ID = "00000000-0000-0000-0000-000000000000";

/** Khách thống kê không được lịch sử, chi tiết phiên, hay Excel. */
export function assertGscHistoryAccess(
  scope: ActorKsnkScope,
): { ok: true } | { ok: false; error: string } {
  if (scope.isGuestStatsOnly) return { ok: false, error: GSC_HISTORY_DENIED };
  return { ok: true };
}

/**
 * Admin và nhân viên KSNK thấy cả viện.
 * Mạng lưới thuần: phiên mình giám sát hoặc phiên tại khoa mình.
 */
export function applyGscHistoryReadScope<
  T extends { eq: (col: string, val: string) => T; or: (filter: string) => T },
>(query: T, scope: ActorKsnkScope): T {
  if (scope.isGuestStatsOnly) return query.eq("id", EMPTY_SCOPE_ID);
  if (scope.isAdmin || scope.isNhanVienKsnk || !scope.isMangLuoiKsnk) return query;

  const ns = scope.actorNhanSuId?.trim() || "";
  const khoa = scope.actorKhoaId?.trim() || "";
  if (ns && khoa) return query.or(`nguoi_giam_sat_id.eq.${ns},khoa_id.eq.${khoa}`);
  if (ns) return query.eq("nguoi_giam_sat_id", ns);
  if (khoa) return query.eq("khoa_id", khoa);
  return query.eq("id", EMPTY_SCOPE_ID);
}

/** Tuân thủ gồm cả dòng cũ `loai_giam_sat` null. */
export function applyGscLoaiFilter<
  T extends { eq: (col: string, val: string) => T; or: (filter: string) => T },
>(query: T, loai?: GscLoaiGiamSatRoute | null): T {
  if (!loai) return query;
  if (loai === "TUAN_THU") return query.or("loai_giam_sat.is.null,loai_giam_sat.eq.TUAN_THU");
  return query.eq("loai_giam_sat", loai);
}

export function gscSessionVisibleToActor(
  scope: ActorKsnkScope,
  session: { khoa_id?: unknown; nguoi_giam_sat_id?: unknown },
): boolean {
  if (scope.isGuestStatsOnly) return false;
  if (scope.isAdmin || scope.isNhanVienKsnk || !scope.isMangLuoiKsnk) return true;
  const myKhoa = scope.actorKhoaId?.trim() || "";
  const myNs = scope.actorNhanSuId?.trim() || "";
  const sessionKhoa = session.khoa_id ? String(session.khoa_id) : "";
  const sessionGs = session.nguoi_giam_sat_id ? String(session.nguoi_giam_sat_id) : "";
  if (myNs && sessionGs === myNs) return true;
  if (myKhoa && sessionKhoa === myKhoa) return true;
  return false;
}
