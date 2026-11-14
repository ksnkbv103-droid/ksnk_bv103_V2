import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";
import type { GscLoaiGiamSatRoute } from "./gsc-app-paths";

const GSC_HISTORY_DENIED = "Tài khoản khách chỉ được xem Thống kê VST/GSC.";
const GSC_HOI_DONG_HISTORY_DENIED =
  "Hội đồng KSNK chỉ được xem số liệu Thống kê VST/GSC (ẩn danh), không xem lịch sử phiên có danh tính.";
const EMPTY_SCOPE_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Vai đọc phiên GSC có danh tính trên toàn viện, không bị siết theo khoa hay mạng lưới.
 * CHU_NHIEM_KHOA = chủ nhiệm khoa KSNK (≡ TK_KSNK, M02 «X E» phiên giám sát), cùng luật VST-026.
 */
function hasHospitalWideGscRead(scope: ActorKsnkScope): boolean {
  return scope.isAdmin || scope.isNhanVienKsnk || scope.roles.includes("CHU_NHIEM_KHOA");
}

/** @dac-ta R2.07 — HOI_DONG_KSNK (≈ BGĐ «X (ẩn)») không kiêm vai đọc rộng hơn thì chỉ thấy số liệu ẩn danh (VST-023). */
function isHoiDongOnly(scope: ActorKsnkScope): boolean {
  return (
    !hasHospitalWideGscRead(scope) && !scope.isMangLuoiKsnk && scope.roles.includes("HOI_DONG_KSNK")
  );
}

/** Khách thống kê và Hội đồng KSNK thuần không được lịch sử, chi tiết phiên, hay Excel. */
export function assertGscHistoryAccess(
  scope: ActorKsnkScope,
): { ok: true } | { ok: false; error: string } {
  if (scope.isGuestStatsOnly) return { ok: false, error: GSC_HISTORY_DENIED };
  if (isHoiDongOnly(scope)) return { ok: false, error: GSC_HOI_DONG_HISTORY_DENIED };
  return { ok: true };
}

/**
 * Admin, nhân viên KSNK và chủ nhiệm khoa KSNK (CHU_NHIEM_KHOA) thấy cả viện.
 * Hội đồng KSNK thuần: 0 dòng (ẩn danh).
 * Mạng lưới thuần: phiên mình giám sát hoặc phiên tại khoa mình.
 */
export function applyGscHistoryReadScope<
  T extends { eq: (col: string, val: string) => T; or: (filter: string) => T },
>(query: T, scope: ActorKsnkScope): T {
  if (scope.isGuestStatsOnly || isHoiDongOnly(scope)) return query.eq("id", EMPTY_SCOPE_ID);
  if (hasHospitalWideGscRead(scope) || !scope.isMangLuoiKsnk) return query;

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
  if (scope.isGuestStatsOnly || isHoiDongOnly(scope)) return false;
  if (hasHospitalWideGscRead(scope) || !scope.isMangLuoiKsnk) return true;
  const myKhoa = scope.actorKhoaId?.trim() || "";
  const myNs = scope.actorNhanSuId?.trim() || "";
  const sessionKhoa = session.khoa_id ? String(session.khoa_id) : "";
  const sessionGs = session.nguoi_giam_sat_id ? String(session.nguoi_giam_sat_id) : "";
  if (myNs && sessionGs === myNs) return true;
  if (myKhoa && sessionKhoa === myKhoa) return true;
  return false;
}
